'use client';

import type React from 'react';
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useGameStats } from '@/hooks/use-game-stats';
import { useTelegram } from '../telegram/TelegramProvider';
import type { GameMode, OnlineGameState } from '@/types/game';
import type { PieceType, PieceColor, Position, Piece, Move, Board } from '@/types/game-types';
import { GameLogic } from '@/lib/game-logic';
import { useOnlineGame } from '@/hooks/use-online-game';
import { RoomCodeToast } from './RoomCodeToast';

export interface GameState {
  board: Board;
  currentPlayer: PieceColor;
  selectedPiece: Piece | null;
  validMoves: Position[];
  capturedPieces: Piece[];
  gameStatus: 'playing' | 'white-wins' | 'black-wins' | 'draw' | 'player-left';
  moveHistory: Move[];
  gameMode: GameMode;
  roomId: string | null;
  playerColor: PieceColor | null;
  opponentColor: PieceColor | null;
  lobbyStatus: 'idle' | 'waiting';
  onlineState: OnlineGameState;
  error: string | null;
}

export type GameDispatch = React.Dispatch<GameAction>;

type GameAction =
  | { type: 'SELECT_PIECE'; piece: Piece | null }
  | { type: 'MOVE_PIECE'; from: Position; to: Position }
  | { type: 'SET_VALID_MOVES'; moves: Position[] }
  | { type: 'RESET_GAME'; gameMode?: GameMode }
  | { type: 'SET_GAME_STATE'; state: Partial<GameState> }
  | { type: 'SET_GAME_MODE'; payload: GameMode }
  | { type: 'SET_ROOM_ID'; payload: string }
  | { type: 'SET_LOBBY_STATUS'; payload: 'idle' | 'waiting' }
  | { type: 'SET_ONLINE_STATE'; payload: OnlineGameState }
  | { type: 'START_ONLINE_GAME' }
  | { type: 'APPLY_REMOTE_MOVE'; payload: Move }
  | { type: 'OPPONENT_LEFT' }
  | { type: 'MAKE_LOCAL_MOVE'; payload: Move }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_PLAYER_COLOR'; payload: PieceColor };

const initialState: GameState = {
  board: Array(8).fill(null).map(() => Array(8).fill(null)),
  currentPlayer: 'white',
  selectedPiece: null,
  validMoves: [],
  capturedPieces: [],
  gameStatus: 'playing',
  moveHistory: [],
  gameMode: 'bot',
  roomId: null,
  playerColor: null,
  opponentColor: null,
  lobbyStatus: 'idle',
  onlineState: 'idle',
  error: null,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SELECT_PIECE':
      return {
        ...state,
        selectedPiece: action.piece,
        validMoves: action.piece ? [] : [],
      };

    case 'SET_VALID_MOVES':
      return {
        ...state,
        validMoves: action.moves,
      };

    case 'MOVE_PIECE': {
      const moveResult = GameLogic.makeMove(state.board, action.from, action.to);
      if (moveResult.success && moveResult.newState) {
        return {
          ...state,
          ...moveResult.newState,
          selectedPiece: null,
          validMoves: [],
        };
      }
      return state;
    }

    case 'RESET_GAME':
      return {
        ...initialState,
        board: GameLogic.getInitialBoard(),
        gameMode: action.gameMode || state.gameMode,
      };

    case 'SET_GAME_STATE':
      return { ...state, ...action.state };

    case 'SET_GAME_MODE':
      return { ...state, gameMode: action.payload };

    case 'SET_ROOM_ID':
      return { ...state, roomId: action.payload };

    case 'SET_LOBBY_STATUS':
      return { ...state, lobbyStatus: action.payload };

    case 'SET_ONLINE_STATE':
      return { ...state, onlineState: action.payload };

    case 'START_ONLINE_GAME':
      return { 
        ...state,
        playerColor: state.playerColor || 'white',
        opponentColor: state.opponentColor || 'black',
        lobbyStatus: 'idle',
        onlineState: 'playing'
      };

    case 'APPLY_REMOTE_MOVE': {
      const move = action.payload;
      const moveResult = GameLogic.makeMove(state.board, move.from, move.to);
      if (moveResult.success && moveResult.newState) {
        return {
          ...state,
          ...moveResult.newState,
          moveHistory: [...state.moveHistory, move],
        };
      }
      return state;
    }

    case 'OPPONENT_LEFT':
      return {
        ...state,
        gameStatus: 'player-left',
        onlineState: 'finished'
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'SET_PLAYER_COLOR':
      return {
        ...state,
        playerColor: action.payload,
        opponentColor: action.payload === 'white' ? 'black' : 'white',
      };

    case 'MAKE_LOCAL_MOVE': {
      if (state.gameMode === 'online-random' || state.gameMode === 'online-room') {
        const move = action.payload;
        const moveResult = GameLogic.makeMove(state.board, move.from, move.to);
        if (moveResult.success && moveResult.newState) {
          return {
            ...state,
            ...moveResult.newState,
            moveHistory: [...state.moveHistory, move],
          };
        }
      }
      return state;
    }

    default:
      return state;
  }
}

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  setGameMode: (mode: GameMode) => void;
  createRoom: () => Promise<void>;
  joinRoom: (code: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  sendMove: (move: Move) => Promise<void>;
  searchRandomGame: () => Promise<void>;
} | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, {
    ...initialState,
    board: GameLogic.getInitialBoard(),
  });

  const { user } = useTelegram();
  const {
    recordWin,
    recordLoss,
    recordDraw,
    recordOnlineWin,
    recordOnlineLoss,
    recordOnlineDraw,
  } = useGameStats(user?.id);

  const {
    createRoom,
    joinRoom,
    leaveRoom,
    sendMove,
    searchRandomGame
  } = useOnlineGame(dispatch, state);

  const statsRecordedRef = useRef(false);
  const playerColorRef = useRef<PieceColor | null>(null);
  const [showRoomCode, setShowRoomCode] = useState(false);

  // Показываем код комнаты, когда она создана
  useEffect(() => {
    if (state.roomId && state.lobbyStatus === 'waiting') {
      setShowRoomCode(true);
    } else {
      setShowRoomCode(false);
    }
  }, [state.roomId, state.lobbyStatus]);

  // Handle online game move sending
  useEffect(() => {
    if ((state.gameMode === 'online-random' || state.gameMode === 'online-room') && 
        state.moveHistory.length > 0) {
      const lastMove = state.moveHistory[state.moveHistory.length - 1];
      if (state.roomId) {
        sendMove(lastMove);
      }
    }
  }, [state.moveHistory, state.gameMode, state.roomId, sendMove]);

  useEffect(() => {
    playerColorRef.current = state.playerColor;
  }, [state.playerColor]);

  useEffect(() => {
    if (state.gameStatus === 'playing') {
      statsRecordedRef.current = false;
    }
  }, [state.gameStatus]);

  // Запись статистики
  useEffect(() => {
    if (
      state.gameStatus !== 'playing' &&
      state.gameStatus !== 'player-left' &&
      !statsRecordedRef.current
    ) {
      if (state.gameMode === 'bot') {
        if (state.gameStatus === 'white-wins') {
          recordWin();
          statsRecordedRef.current = true;
        } else if (state.gameStatus === 'black-wins') {
          recordLoss();
          statsRecordedRef.current = true;
        } else if (state.gameStatus === 'draw') {
          recordDraw();
          statsRecordedRef.current = true;
        }
      } else if (state.gameMode === 'online-random' || state.gameMode === 'online-room') {
        const isWinner = (state.gameStatus === 'white-wins' && state.playerColor === 'white') ||
                        (state.gameStatus === 'black-wins' && state.playerColor === 'black');
        
        if (isWinner) {
          recordOnlineWin();
          statsRecordedRef.current = true;
        } else if (state.gameStatus === 'draw') {
          recordOnlineDraw();
          statsRecordedRef.current = true;
        } else {
          recordOnlineLoss();
          statsRecordedRef.current = true;
        }
      }
    }
  }, [
    state.gameStatus,
    state.gameMode,
    state.playerColor,
    recordWin,
    recordLoss,
    recordDraw,
    recordOnlineWin,
    recordOnlineLoss,
    recordOnlineDraw,
  ]);

  const setGameMode = (mode: GameMode) => {
    dispatch({ type: 'SET_GAME_MODE', payload: mode });
  };

  return (
    <GameContext.Provider
      value={{
        state,
        dispatch,
        setGameMode,
        createRoom,
        joinRoom,
        leaveRoom,
        sendMove,
        searchRandomGame
      }}
    >
      {showRoomCode && state.roomId && (
        <RoomCodeToast
          roomId={state.roomId}
          onClose={() => setShowRoomCode(false)}
        />
      )}
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
