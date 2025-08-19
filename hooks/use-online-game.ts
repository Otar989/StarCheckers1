import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import type { Move } from '@/types/game-types';
import type { GameState, GameDispatch } from '@/components/game/GameProvider';
import { GameLogic } from '@/lib/game-logic';
import { nanoid } from 'nanoid';

export function useOnlineGame(dispatch: GameDispatch, state: GameState) {
  // Subscribe to room and move updates
  useEffect(() => {
    if (!state.roomId) return;

    // Subscribe to room changes
    const roomChannel = supabase.channel(`room:${state.roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${state.roomId}`
      }, (payload) => {
        const room = payload.new as any;
        
        // Начало игры
        if (room.status === 'playing' && state.lobbyStatus === 'waiting') {
          dispatch({ type: 'START_ONLINE_GAME' });
        }
        
        // Выход противника
        if (room.status === 'finished' && state.gameStatus === 'playing') {
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
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'moves',
        filter: `room_id=eq.${state.roomId}`
      }, (payload) => {
        const move = payload.new.move as Move;
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
  }, [state.roomId, state.playerColor, state.currentPlayer, state.gameStatus, state.lobbyStatus, dispatch]);

  const createRoom = useCallback(async () => {
    try {
      const roomId = nanoid(6).toUpperCase();
      const playerColor = Math.random() < 0.5 ? 'white' : 'black';
      const initialBoard = GameLogic.getInitialBoard();
      
      const { error } = await supabase.from('rooms').insert({
        id: roomId,
        status: 'waiting',
        board_state: initialBoard,
        host_color: playerColor,
        turn: 'white' // Белые всегда ходят первыми
      });

      if (error) throw error;

      dispatch({ type: 'SET_GAME_MODE', payload: 'online' });
      dispatch({ type: 'SET_ROOM_ID', payload: roomId });
      dispatch({ type: 'SET_PLAYER_COLOR', payload: playerColor });
      dispatch({ type: 'SET_LOBBY_STATUS', payload: 'waiting' });
      
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

      if (room.status !== 'waiting') {
        throw new Error('Игра уже началась');
      }

      // Присоединяемся с противоположным цветом
      const playerColor = room.host_color === 'white' ? 'black' : 'white';

      // Обновляем статус комнаты
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ status: 'playing' })
        .eq('id', roomId);

      if (updateError) throw updateError;

      dispatch({ type: 'SET_GAME_MODE', payload: 'online' });
      dispatch({ type: 'SET_ROOM_ID', payload: roomId });
      dispatch({ type: 'SET_PLAYER_COLOR', payload: playerColor });
      
      // Устанавливаем начальное состояние
      dispatch({ 
        type: 'SET_GAME_STATE', 
        state: {
          board: room.board_state,
          currentPlayer: room.turn
        }
      });

      dispatch({ type: 'START_ONLINE_GAME' });

    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Не удалось присоединиться к игре' });
    }
  }, [dispatch]);

  const leaveRoom = useCallback(async () => {
    if (!state.roomId) return;

    try {
      await supabase
        .from('rooms')
        .update({ status: 'finished' })
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
          turn: moveResult.newState.currentPlayer
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
    sendMove
  };
}
