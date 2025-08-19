import type { PieceColor, Board, Move } from "@/types/game-types";

export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string
          status: GameStatus
          host_color: PieceColor
          board_state: Board
          turn: PieceColor
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          status?: GameStatus
          host_color: PieceColor
          board_state: Board
          turn?: PieceColor
        }
        Update: {
          status?: GameStatus
          board_state?: Board
          turn?: PieceColor
        }
      }
      moves: {
        Row: {
          id: string
          room_id: string
          move: Move
          created_at: string
        }
        Insert: {
          room_id: string
          move: Move
        }
        Update: {
          move?: Move
        }
      }
    }
  }
}
