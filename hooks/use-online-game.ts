import { useEffect } from 'react';
import { socket } from '../lib/socket';
import { GameDispatch, Move } from '../components/game/GameProvider';

export const useOnlineGame = (dispatch: GameDispatch) => {
  useEffect(() => {
    const onBothReady = () => {
      dispatch({ type: 'START_ONLINE_GAME' });
    };

    const onOpponentMove = (move: Move) => {
      dispatch({ type: 'APPLY_REMOTE_MOVE', payload: move });
    };

    const onOpponentLeft = () => {
      dispatch({ type: 'OPPONENT_LEFT' });
    };

    socket.on('both_ready', onBothReady);
    socket.on('opponent_move', onOpponentMove);
    socket.on('opponent_left', onOpponentLeft);

    return () => {
      socket.off('both_ready', onBothReady);
      socket.off('opponent_move', onOpponentMove);
      socket.off('opponent_left', onOpponentLeft);
    };
  }, [dispatch]);

  const createOnlineRoom = () => {
    socket.emit('create_room', null, ({ code }: { code: string }) => {
      dispatch({ type: 'SET_GAME_MODE', payload: 'online' });
      dispatch({ type: 'SET_ROOM_ID', payload: code });
      dispatch({ type: 'SET_LOBBY_STATUS', payload: 'waiting' });
    });
  };

  const joinOnlineRoom = (code: string) => {
    socket.emit('join_room', code, (res: { ok: boolean }) => {
      if (res?.ok) {
        dispatch({ type: 'SET_GAME_MODE', payload: 'online' });
        dispatch({ type: 'SET_ROOM_ID', payload: code });
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'Invalid room code' });
      }
    });
  };

  const sendMove = (code: string, move: Move) => {
    socket.emit('make_move', { code, move });
  };

  return {
    createOnlineRoom,
    joinOnlineRoom,
    sendMove,
  };
};
