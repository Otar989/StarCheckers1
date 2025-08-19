import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import type { GameState, Move, GameDispatch } from '@/components/game/GameProvider';
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
        
        if (room.status === 'playing' && state.lobbyStatus === 'waiting') {
          dispatch({ type: 'START_ONLINE_GAME' });
        }
        
        if (room.status === 'finished') {
          dispatch({ type: 'OPPONENT_LEFT' });
        }

        dispatch({
          type: 'SET_GAME_STATE',
          state: {
            board: room.board_state,
            currentPlayer: room.turn
          }
        });
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
        dispatch({ type: 'APPLY_REMOTE_MOVE', payload: move });
      })
      .subscribe();

    return () => {
      roomChannel.unsubscribe();
      movesChannel.unsubscribe();
    };
  }, [state.roomId, dispatch]);

  const createRoom = useCallback(async () => {
    const roomId = nanoid(6).toUpperCase();
    const initialBoard = GameLogic.getInitialBoard();
    
    const { error } = await supabase.from('rooms').insert({
      id: roomId,
      board_state: initialBoard,
      host_color: Math.random() < 0.5 ? 'white' : 'black'
    });

    if (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Не удалось создать комнату' });
      return;
    }

    dispatch({ type: 'SET_GAME_MODE', payload: 'online' });
    dispatch({ type: 'SET_ROOM_ID', payload: roomId });
    dispatch({ type: 'SET_LOBBY_STATUS', payload: 'waiting' });
  }, [dispatch]);

  const joinRoom = useCallback(async (roomId: string) => {
    const { data: room, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error || !room) {
      dispatch({ type: 'SET_ERROR', payload: 'Неверный код комнаты' });
      return;
    }

    if (room.status !== 'waiting') {
      dispatch({ type: 'SET_ERROR', payload: 'Игра уже началась' });
      return;
    }

    await supabase.from('rooms')
      .update({ status: 'playing' })
      .eq('id', roomId);

    dispatch({ type: 'SET_GAME_MODE', payload: 'online' });
    dispatch({ type: 'SET_ROOM_ID', payload: roomId });
    dispatch({ 
      type: 'SET_PLAYER_COLOR', 
      payload: room.host_color === 'white' ? 'black' : 'white' 
    });
  }, [dispatch]);

  const leaveRoom = useCallback(async () => {
    if (!state.roomId) return;

    await supabase.from('rooms')
      .update({ status: 'finished' })
      .eq('id', state.roomId);

    dispatch({ type: 'RESET_GAME' });
  }, [state.roomId, dispatch]);

  const sendMove = useCallback(async (move: Move) => {
    if (!state.roomId) return;

    const moveResult = GameLogic.validateMove(state.board, move.from, move.to);
    if (!moveResult.isValid) return;

    const { error: moveError } = await supabase.from('moves')
      .insert({
        room_id: state.roomId,
        move
      });

    if (moveError) {
      dispatch({ type: 'SET_ERROR', payload: 'Не удалось отправить ход' });
      return;
    }

    const { error: roomError } = await supabase.from('rooms')
      .update({
        board_state: moveResult.newState?.board,
        turn: moveResult.newState?.currentPlayer
      })
      .eq('id', state.roomId);

    if (roomError) {
      dispatch({ type: 'SET_ERROR', payload: 'Не удалось обновить состояние игры' });
      return;
    }
  }, [state.roomId, state.board, dispatch]);

  return {
    createRoom,
    joinRoom,
    leaveRoom,
    sendMove
  };
}
