import { Server as NetServer, Socket } from 'net';
import { NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { GameStatus, Board, PieceColor, Position, Move } from './game-types';

export interface ServerToClientEvents {
  error: (message: string) => void;
  gameCreated: (data: { roomId: string; player: PieceColor }) => void;
  gameJoined: (data: { roomId: string; player: PieceColor }) => void;
  gameState: (data: {
    board: Board;
    currentPlayer: PieceColor;
    gameStatus: GameStatus;
    players: Player[];
  }) => void;
  playerLeft: () => void;
  moveUpdate: (data: { move: Move }) => void;
}

export interface ClientToServerEvents {
  createGame: (roomId: string) => void;
  joinGame: (roomId: string) => void;
  makeMove: (data: { from: Position; to: Position }) => void;
  leaveGame: (roomId: string) => void;
}

export interface SocketServer extends NetServer {
  io?: SocketIOServer;
}

export interface SocketWithIO extends Socket {
  server: SocketServer;
}

export interface NextApiResponseServerIO extends NextApiResponse {
  socket: SocketWithIO;
}

export interface Player {
  id: number;
  color: PieceColor;
  socketId?: string;
}

export interface Room {
  id: string;
  board: Board;
  currentPlayer: PieceColor;
  players: Player[];
  gameStatus: GameStatus;
}
