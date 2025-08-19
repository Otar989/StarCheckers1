import { GameState, Move } from "@/components/game/GameProvider";

export type GameStatus = 'waiting' | 'playing' | 'finished';
export type PieceColor = 'white' | 'black';

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string
          status: GameStatus
          host_color: PieceColor
          board_state: GameState['board']
          turn: PieceColor
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          status?: GameStatus
          host_color?: PieceColor
          board_state: GameState['board']
          turn?: PieceColor
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          status?: GameStatus
          host_color?: PieceColor
          board_state?: GameState['board']
          turn?: PieceColor
          created_at?: string
          updated_at?: string
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
          id?: string
          room_id: string
          move: Move
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          move?: Move
          created_at?: string
        }
      }
    }
  }
}
