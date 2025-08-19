import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import type { Move } from '@/types/game-types';
import type { GameState, GameDispatch } from '@/components/game/GameProvider';
import { GameLogic } from '@/lib/game-logic';
import { nanoid } from 'nanoid';
// unused import removed

interface Room {
  id: string;
  status: 'waiting' | 'playing' | 'finished' | 'searching';
  board_state: any;
  host_color: 'white' | 'black';
  turn: 'white' | 'black';
  updated_at: string;
}

interface MovePayload {
  room_id: string;
  move: Move;
}

export function useOnlineGame(dispatch: GameDispatch, state: GameState) {
  const [isLoading, setIsLoading] = useState(false);
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
        
        // Начало игры
        if (room.status === 'playing' && state.onlineState === 'waiting') {
          console.log('Starting online game');
          dispatch({ type: 'START_ONLINE_GAME' });
        }
        
        // Выход противника
        if (room.status === 'finished' && state.gameStatus === 'playing') {
          console.log('Opponent left the game');
          dispatch({ type: 'OPPONENT_LEFT' });
          return;
        }

        // Обновление состояния доски только если это ход противника
        if (room.turn !== state.playerColor) {
          dispatch({
            type: 'SET_GAME_STATE',
            state: {
              board: room.board_state,
              currentPlayer: room.turn
            }
          });
        }
      })
      .subscribe();

    // Subscribe to moves
    const movesChannel = supabase.channel(`moves:${state.roomId}`)
      .on('postgres_changes' as any, {
        event: 'INSERT',
        schema: 'public',
        table: 'moves',
        filter: `room_id=eq.${state.roomId}`
      }, (payload: { new: MovePayload }) => {
        const move = payload.new.move;
        // Применяем ход только если это ход противника
        if (move && state.playerColor !== state.currentPlayer) {
          dispatch({ type: 'APPLY_REMOTE_MOVE', payload: move });
        }
      })
      .subscribe();

    return () => {
      roomChannel.unsubscribe();
      movesChannel.unsubscribe();
    };
  }, [state.roomId, state.playerColor, state.currentPlayer, state.gameStatus, state.onlineState, dispatch]);

  // Периодическая очистка старых комнат
  useEffect(() => {
    const cleanupInterval = setInterval(async () => {
      try {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        
        await supabase
          .from('rooms')
          .delete()
          .lt('updated_at', tenMinutesAgo)
          .or('status.eq.finished,status.eq.searching');
          
      } catch (error) {
        console.error('Error cleaning up rooms:', error);
      }
    }, 5 * 60 * 1000); // Каждые 5 минут

    return () => clearInterval(cleanupInterval);
  }, []);

  const searchRandomGame = useCallback(async () => {
    try {
      dispatch({ type: 'SET_ONLINE_STATE', payload: 'searching' });

      // Сначала ищем существующие комнаты в поиске
      const { data: searchingRooms, error: searchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('status', 'searching')
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
        
      } else {
        // Не нашли комнату, создаем новую
        const roomId = nanoid(6).toUpperCase();
        const playerColor = Math.random() < 0.5 ? 'white' : 'black';
        const initialBoard = GameLogic.getInitialBoard();

        const { error } = await supabase.from('rooms').insert({
          id: roomId,
          status: 'searching',
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

  const createRoom = useCallback(async () => {
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
      
      // Инициализируем начальное состояние
      dispatch({ 
        type: 'SET_GAME_STATE', 
        state: {
          board: initialBoard,
          currentPlayer: 'white'
        }
      });

    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Не удалось создать комнату' });
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  const joinRoom = useCallback(async (roomId: string) => {
    try {
      const { data: room, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error || !room) {
        throw new Error('Комната не найдена');
      }

      if (room.status !== 'waiting' && room.status !== 'searching') {
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
      
      // Устанавливаем начальное состояние
      dispatch({ 
        type: 'SET_GAME_STATE', 
        state: {
          board: room.board_state,
          currentPlayer: room.turn
        }
      });

    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Не удалось присоединиться к игре' });
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
    if (!state.roomId || !state.playerColor || state.playerColor !== state.currentPlayer) return;

    try {
      // Проверяем валидность хода
      const moveResult = GameLogic.validateMove(state.board, move.from, move.to);
      if (!moveResult.isValid || !moveResult.newState) {
        throw new Error('Недопустимый ход');
      }

      // Сначала записываем ход
      const { error: moveError } = await supabase
        .from('moves')
        .insert({
          room_id: state.roomId,
          move
        });

      if (moveError) throw moveError;

      // Затем обновляем состояние комнаты
      const { error: roomError } = await supabase
        .from('rooms')
        .update({
          board_state: moveResult.newState.board,
          turn: moveResult.newState.currentPlayer,
          updated_at: new Date().toISOString()
        })
        .eq('id', state.roomId);

      if (roomError) throw roomError;

      // Применяем ход локально
      dispatch({ type: 'MAKE_LOCAL_MOVE', payload: move });

    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Не удалось выполнить ход' });
    }
  }, [state.roomId, state.board, state.playerColor, state.currentPlayer, dispatch]);

  return {
    createRoom,
    joinRoom,
    leaveRoom,
    sendMove,
  searchRandomGame,
  isLoading
  };
}
