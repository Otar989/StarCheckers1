import type { Board, PieceColor } from './game-types';

export type GameMode = 'bot' | 'online' | 'matchmaking';

export interface GameConfig {
  mode: GameMode;
  roomId?: string;
  playerColor?: PieceColor;
}

export type OnlineGameState = 'idle' | 'searching' | 'waiting' | 'playing' | 'finished';

export interface RoomData {
  id: string;
  status: 'waiting' | 'playing' | 'finished';
  board: Board;
  current_player: PieceColor;
  last_move: any;
}

export interface CreateGameResponse {
  roomId: string;
  color: PieceColor;
  error?: string;
}

export interface JoinGameResponse {
  roomId: string;
  color: PieceColor;
  error?: string;
}
