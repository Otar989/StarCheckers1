export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string
          status: 'waiting' | 'playing' | 'finished'
          host_color: 'white' | 'black'
          board_state: any
          turn: 'white' | 'black'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          status?: 'waiting' | 'playing' | 'finished'
          host_color?: 'white' | 'black'
          board_state: any
          turn?: 'white' | 'black'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          status?: 'waiting' | 'playing' | 'finished'
          host_color?: 'white' | 'black'
          board_state?: any
          turn?: 'white' | 'black'
          created_at?: string
          updated_at?: string
        }
      }
      moves: {
        Row: {
          id: string
          room_id: string
          move: any
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          move: any
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          move?: any
          created_at?: string
        }
      }
    }
  }
}
