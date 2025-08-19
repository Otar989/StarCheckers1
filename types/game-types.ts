export type PieceType = "regular" | "king";
export type PieceColor = "white" | "black";
export type Position = { row: number; col: number };

export interface Piece {
  id: string;
  type: PieceType;
  color: PieceColor;
  position: Position;
}

export interface Move {
  from: Position;
  to: Position;
  capturedPieces: Piece[];
  timestamp: number;
}

export type GameStatus = 'waiting' | 'playing' | 'finished';
export type Board = (Piece | null)[][];
