import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import type { Move } from '@/types/game-types';
import type { GameState, GameDispatch } from '@/components/game/GameProvider';
import { GameLogic } from '@/lib/game-logic';
import { nanoid } from 'nanoid';
// unused import removed

interface Room {
  id: string;
  status: 'waiting' | 'playing' | 'finished';
  board_state: any;
  host_color: 'white' | 'black';
  turn: 'white' | 'black';
  updated_at: string;
  rematch_white?: boolean;
  rematch_black?: boolean;
  rematch_until?: string | null;
}

interface MovePayload {
  room_id: string;
  move: Move;
}

export function useOnlineGame(dispatch: GameDispatch, state: GameState) {
  const [isLoading, setIsLoading] = useState(false);
  const [rematchDeadline, setRematchDeadline] = useState<number | null>(null);
  const [rematchRequested, setRematchRequested] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // Универсальная утилита ретраев
  const withRetry = useCallback(async <T extends { error?: unknown }>(fn: () => Promise<T>, tries = 3): Promise<T> => {
    let lastErr: unknown;
    for (let i = 0; i < tries; i++) {
      try {
        // экспоненциальная задержка после первой ошибки
        if (i > 0) await new Promise(r => setTimeout(r, i === 1 ? 300 : 800));
        const res = await fn();
        if ((res as any)?.error) throw (res as any).error;
        return res;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr as Error;
  }, []);
  const connectToRoom = useCallback(async (roomId: string) => {
    console.log('Connecting to room:', roomId);
    
    try {
      const { data: room } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
        
      if (room) {
        console.log('Found room:', room);
        if (room.status === 'waiting') {
          await supabase
            .from('rooms')
            .update({ status: 'playing' })
            .eq('id', roomId);
        }
      } else {
        console.log('Creating new room:', roomId);
        await supabase
          .from('rooms')
          .insert([
            {
              id: roomId,
              status: 'waiting',
              board_state: state.board,
              host_color: state.playerColor,
              turn: state.playerColor,
              updated_at: new Date().toISOString()
            }
          ]);
      }
    } catch (error) {
      console.error('Error connecting to room:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Ошибка подключения к игре' });
    }
  }, [dispatch, state.board, state.playerColor]);

  useEffect(() => {
    if (!state.roomId) return;

    console.log('Setting up room subscription:', state.roomId);
  setConnectionStatus('connecting');
  // Subscribe to room changes
  const roomChannel = supabase.channel(`room:${state.roomId}`)
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'rooms',
    filter: `id=eq.${state.roomId}`
      }, (payload: { new: Room }) => {
        console.log('Room update received:', payload);
  const room = payload.new;
        // Если партия уже завершилась по правилам (нет ходов/фигур) — показуем финал всем
        try {
          const statusNow = GameLogic.evaluateStatus(room.board_state as any, room.turn);
          if (statusNow !== 'playing' && state.gameStatus === 'playing') {
            dispatch({ type: 'SET_GAME_STATE', state: { board: room.board_state, currentPlayer: room.turn, gameStatus: statusNow } });
          }
        } catch {}
        
  // Начало игры — переводим состояние и синхронизируем доску/очередь
    if (room.status === 'playing' && state.onlineState === 'waiting') {
          console.log('Starting online game');
          dispatch({ type: 'START_ONLINE_GAME' });
          dispatch({
            type: 'SET_GAME_STATE',
            state: { board: room.board_state, currentPlayer: room.turn }
          });
        }
        
        // Выход противника
    if (room.status === 'finished' && state.gameStatus === 'playing') {
          console.log('Opponent left the game');
          dispatch({ type: 'OPPONENT_LEFT' });
          return;
        }

  // Обновляем состояние доски, и проверяем окончание партии синхронно на клиенте
  if (room.turn === state.playerColor) {
          const status = GameLogic.evaluateStatus(room.board_state as any, room.turn);
          if (status !== 'playing') {
            dispatch({ type: 'SET_GAME_STATE', state: { board: room.board_state, currentPlayer: room.turn, gameStatus: status } });
          } else {
            dispatch({
              type: 'SET_GAME_STATE',
              state: {
                board: room.board_state,
                currentPlayer: room.turn
              }
            });
          }
        }

  // Обновления по рематчу
  const deadline = room.rematch_until ? new Date(room.rematch_until).getTime() : null;
  setRematchDeadline(deadline);
      })
      .subscribe();
  setConnectionStatus('connected');

    // Subscribe to moves
  const movesChannel = supabase.channel(`moves:${state.roomId}`)
      .on('postgres_changes' as any, {
        event: 'INSERT',
        schema: 'public',
        table: 'moves',
    filter: `room_id=eq.${state.roomId}`
      }, (payload: { new: MovePayload }) => {
        // История ходов фиксируется, но состояние берём из обновления комнаты
        console.debug('Move inserted', payload.new);
      })
      .subscribe();

    return () => {
      roomChannel.unsubscribe();
      movesChannel.unsubscribe();
  setConnectionStatus('disconnected');
    };
  }, [state.roomId, state.playerColor, state.currentPlayer, state.gameStatus, state.onlineState, dispatch]);

  // Presence: мгновенно реагируем, если соперник закрыл игру/ушёл
  useEffect(() => {
    if (!state.roomId || state.gameMode !== 'online') return;
    const key = state.playerColor || 'unknown';
    let leftTimer: ReturnType<typeof setTimeout> | null = null;

    const presenceChannel = supabase.channel(`presence:${state.roomId}`, {
      config: { presence: { key } }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        try {
          const presence = (presenceChannel as any).presenceState?.() || {};
          const participants = Object.keys(presence).length;
          // В бою оба должны быть в presence; если остаётся один — соперник ушёл
          if (state.onlineState === 'playing' && participants === 1) {
            if (!leftTimer) {
              leftTimer = setTimeout(() => {
                // Повторная проверка после небольшой задержки
                const again = (presenceChannel as any).presenceState?.() || {};
                const count = Object.keys(again).length;
                if (count === 1 && state.gameStatus === 'playing') {
                  dispatch({ type: 'OPPONENT_LEFT' });
                }
              }, 1500);
            }
          } else {
            if (leftTimer) { clearTimeout(leftTimer); leftTimer = null; }
          }
        } catch {}
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try { await presenceChannel.track({ at: Date.now() }); } catch {}
        }
      });

    return () => {
      if (leftTimer) clearTimeout(leftTimer);
      presenceChannel.unsubscribe();
    };
  }, [state.roomId, state.gameMode, state.playerColor, state.onlineState, state.gameStatus, dispatch]);

  // Запрос на переигровку от текущего игрока
  const requestRematch = useCallback(async () => {
    if (!state.roomId || state.gameMode !== 'online') return;
    const until = new Date(Date.now() + 60_000).toISOString();
    const column = state.playerColor === 'white' ? 'rematch_white' : 'rematch_black';
    try {
      await supabase
        .from('rooms')
        .update({ [column]: true, rematch_until: until })
        .eq('id', state.roomId);
      setRematchRequested(true);
    } catch {}
  }, [state.roomId, state.playerColor, state.gameMode]);

  const cancelRematch = useCallback(async () => {
    if (!state.roomId || state.gameMode !== 'online') return;
    const column = state.playerColor === 'white' ? 'rematch_white' : 'rematch_black';
    try {
      await supabase
        .from('rooms')
        .update({ [column]: false })
        .eq('id', state.roomId);
      setRematchRequested(false);
    } catch {}
  }, [state.roomId, state.playerColor, state.gameMode]);

  // Проверка обоих флажков: если оба true и дедлайн не истёк — перезапускаем партию
  const tryStartRematch = useCallback(async () => {
    if (!state.roomId || state.gameMode !== 'online') return;
    try {
      const { data: room } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', state.roomId)
        .single();
      if (!room) return;
      const bothAgreed = room.rematch_white && room.rematch_black;
      const notExpired = !room.rematch_until || new Date(room.rematch_until).getTime() > Date.now();
      if (bothAgreed && notExpired) {
        const initialBoard = GameLogic.getInitialBoard();
        await supabase
          .from('rooms')
          .update({
            status: 'playing',
            board_state: initialBoard,
            turn: 'white',
            rematch_white: false,
            rematch_black: false,
            rematch_until: null
          })
          .eq('id', state.roomId);
        dispatch({ type: 'SET_ONLINE_STATE', payload: 'playing' });
        dispatch({ type: 'SET_GAME_MODE', payload: 'online' });
        dispatch({ type: 'SET_GAME_STATE', state: { board: initialBoard, currentPlayer: 'white' } });
      }
    } catch {}
  }, [state.roomId, state.gameMode, dispatch]);

  // Fallback-пуллинг: если ждём соперника, периодически проверяем статус комнаты
  useEffect(() => {
    if (!state.roomId || state.onlineState !== 'waiting') return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const { data: room, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', state.roomId as string)
          .single();
        if (!cancelled && room && room.status === 'playing') {
          dispatch({ type: 'START_ONLINE_GAME' });
          // Подтянем состояние
          dispatch({
            type: 'SET_GAME_STATE',
            state: { board: room.board_state, currentPlayer: room.turn }
          });
        }
      } catch (e) {
        // no-op
      }
    }, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [state.roomId, state.onlineState, dispatch]);

  // Фоновый пинг комнаты во время игры: поддерживаем connected/auto-recover
  useEffect(() => {
    if (!state.roomId || state.onlineState !== 'playing') return;
    let cancelled = false;
    let failures = 0;
    const interval = setInterval(async () => {
      try {
        const { data: room } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', state.roomId as string)
          .single();
        if (cancelled) return;
        setConnectionStatus('connected');
        failures = 0;
        if (room) {
          // Если по какой-то причине подписка не донесла обновление, синхронизируемся
          if (room.turn === state.playerColor) {
            const status = GameLogic.evaluateStatus(room.board_state as any, room.turn);
            if (status !== 'playing') {
              dispatch({ type: 'SET_GAME_STATE', state: { board: room.board_state, currentPlayer: room.turn, gameStatus: status } });
            } else {
              dispatch({ type: 'SET_GAME_STATE', state: { board: room.board_state, currentPlayer: room.turn } });
            }
          }
        }
      } catch {
        failures++;
        if (failures >= 2) setConnectionStatus('disconnected');
      }
    }, 4000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [state.roomId, state.onlineState, state.playerColor, dispatch]);

  // Периодическая очистка старых комнат
  useEffect(() => {
    const cleanupInterval = setInterval(async () => {
      try {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        
        await supabase
          .from('rooms')
          .delete()
          .lt('updated_at', tenMinutesAgo)
          .eq('status', 'finished');
          
      } catch (error) {
        console.error('Error cleaning up rooms:', error);
      }
    }, 5 * 60 * 1000); // Каждые 5 минут

    return () => clearInterval(cleanupInterval);
  }, []);

  const searchRandomGame = useCallback(async () => {
    try {
      dispatch({ type: 'SET_ONLINE_STATE', payload: 'searching' });

      // Сначала ищем существующие комнаты в ожидании
      const { data: searchingRooms, error: searchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('status', 'waiting')
        .limit(1);

      if (searchError) throw searchError;

  if (searchingRooms && searchingRooms.length > 0) {
        // Нашли существующую комнату, присоединяемся
        const room = searchingRooms[0];
        const playerColor = room.host_color === 'white' ? 'black' : 'white';

        // Обновляем статус комнаты
        const { error: updateError } = await supabase
          .from('rooms')
          .update({ 
            status: 'playing',
            updated_at: new Date().toISOString()
          })
          .eq('id', room.id);

  if (updateError) throw updateError;

  dispatch({ type: 'SET_GAME_MODE', payload: 'online' });
        dispatch({ type: 'SET_ROOM_ID', payload: room.id });
        dispatch({ type: 'SET_PLAYER_COLOR', payload: playerColor });
        dispatch({ type: 'SET_ONLINE_STATE', payload: 'playing' });
  // Синхронизируем доску и чей ход
  dispatch({ type: 'SET_GAME_STATE', state: { board: room.board_state, currentPlayer: room.turn } });
        
      } else {
        // Не нашли комнату, создаем новую в статусе ожидания
        const roomId = nanoid(6).toUpperCase();
        const playerColor = Math.random() < 0.5 ? 'white' : 'black';
        const initialBoard = GameLogic.getInitialBoard();

        const { error } = await supabase.from('rooms').insert({
          id: roomId,
          status: 'waiting',
          board_state: initialBoard,
          host_color: playerColor,
          turn: 'white',
          updated_at: new Date().toISOString()
        });

  if (error) throw error;

  dispatch({ type: 'SET_GAME_MODE', payload: 'online' });
        dispatch({ type: 'SET_ROOM_ID', payload: roomId });
        dispatch({ type: 'SET_PLAYER_COLOR', payload: playerColor });
        dispatch({ type: 'SET_ONLINE_STATE', payload: 'waiting' });
      }

    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Ошибка при поиске игры' });
      dispatch({ type: 'SET_ONLINE_STATE', payload: 'idle' });
    }
  }, [dispatch]);

  const createRoom = useCallback(async (): Promise<string | null> => {
    setIsLoading(true);
    try {
      const roomId = nanoid(6).toUpperCase();
      const playerColor = Math.random() < 0.5 ? 'white' : 'black';
      const initialBoard = GameLogic.getInitialBoard();

      const { error } = await supabase.from('rooms').insert({
        id: roomId,
        status: 'waiting',
        board_state: initialBoard,
        host_color: playerColor,
        turn: 'white',
        updated_at: new Date().toISOString()
      });

      if (error) throw error;

  dispatch({ type: 'SET_GAME_MODE', payload: 'online' });
  dispatch({ type: 'SET_ROOM_ID', payload: roomId });
  dispatch({ type: 'SET_PLAYER_COLOR', payload: playerColor });
  dispatch({ type: 'SET_LOBBY_STATUS', payload: 'waiting' });
  dispatch({ type: 'SET_ONLINE_STATE', payload: 'waiting' });
  // Инициализируем начальное состояние (белые начинают)
  dispatch({ type: 'SET_GAME_STATE', state: { board: initialBoard, currentPlayer: 'white' } });

      return roomId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось создать комнату';
      dispatch({ type: 'SET_ERROR', payload: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  const joinRoom = useCallback(async (roomId: string): Promise<boolean> => {
    try {
      const { data: room, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error || !room) {
        throw new Error('Комната не найдена');
      }

  if (room.status !== 'waiting') {
        throw new Error('Игра уже началась');
      }

      // Присоединяемся с противоположным цветом
      const playerColor = room.host_color === 'white' ? 'black' : 'white';

      // Обновляем статус комнаты
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ 
          status: 'playing',
          updated_at: new Date().toISOString()
        })
        .eq('id', roomId);

  if (updateError) throw updateError;

  dispatch({ type: 'SET_GAME_MODE', payload: 'online' });
  dispatch({ type: 'SET_ROOM_ID', payload: roomId });
  dispatch({ type: 'SET_PLAYER_COLOR', payload: playerColor });
  dispatch({ type: 'SET_ONLINE_STATE', payload: 'playing' });
  // Подтягиваем состояние из комнаты (кто ходит — из turn)
  dispatch({ type: 'SET_GAME_STATE', state: { board: room.board_state, currentPlayer: room.turn } });
  return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось присоединиться к игре';
      dispatch({ type: 'SET_ERROR', payload: message });
  return false;
    }
  }, [dispatch]);

  const leaveRoom = useCallback(async () => {
    if (!state.roomId) return;

    try {
      await supabase
        .from('rooms')
        .update({ 
          status: 'finished',
          updated_at: new Date().toISOString()
        })
        .eq('id', state.roomId);

      dispatch({ type: 'RESET_GAME' });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Ошибка при выходе из игры' });
    }
  }, [state.roomId, dispatch]);

  const sendMove = useCallback(async (move: Move) => {
    if (!state.roomId) return;
    if (!state.playerColor) {
      dispatch({ type: 'SET_ERROR', payload: 'Ожидание назначения цвета игрока' });
      return;
    }
    if (state.playerColor !== state.currentPlayer) {
      dispatch({ type: 'SET_ERROR', payload: 'Сейчас ход соперника' });
      return;
    }

    try {
      // Проверяем валидность хода
      const moveResult = GameLogic.validateMove(state.board, move.from, move.to);
      if (!moveResult.isValid || !moveResult.newState) {
        throw new Error('Недопустимый ход');
      }

      // Сначала записываем ход (с ретраями)
      const { error: moveError } = await withRetry(async () => {
        return await supabase
          .from('moves')
          .insert({ room_id: state.roomId as string, move });
      }, 3);

      if (moveError) throw moveError;

      // Затем обновляем состояние комнаты (с ретраями)
      const { error: roomError } = await withRetry(async () => {
        return await supabase
          .from('rooms')
          .update({
            board_state: moveResult.newState!.board,
            turn: moveResult.newState!.currentPlayer,
            updated_at: new Date().toISOString()
          })
          .eq('id', state.roomId as string);
      }, 3);

      if (roomError) throw roomError;

  // Применяем ход локально через редьюсер
  dispatch({ type: 'MAKE_LOCAL_MOVE', payload: move });

    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Не удалось выполнить ход' });
      setConnectionStatus('disconnected');
    }
  }, [state.roomId, state.board, state.playerColor, state.currentPlayer, dispatch, withRetry]);

  return {
    createRoom,
    joinRoom,
    leaveRoom,
    sendMove,
  searchRandomGame,
  isLoading,
  // Rematch API
  requestRematch,
  cancelRematch,
  tryStartRematch,
  rematchDeadline,
  rematchRequested,
  connectionStatus
  };
}
