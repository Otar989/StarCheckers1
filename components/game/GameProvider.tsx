"use client"

import type React from "react"

import { createContext, useContext, useReducer, type ReactNode } from "react"

// Game types
export type PieceType = "regular" | "king"
export type PieceColor = "white" | "black"
export type Position = { row: number; col: number }

export interface Piece {
  id: string
  type: PieceType
  color: PieceColor
  position: Position
}

export interface GameState {
  board: (Piece | null)[][]
  currentPlayer: PieceColor
  selectedPiece: Piece | null
  validMoves: Position[]
  capturedPieces: Piece[]
  gameStatus: "playing" | "white-wins" | "black-wins" | "draw"
  moveHistory: Move[]
}

export interface Move {
  from: Position
  to: Position
  capturedPieces: Piece[]
  timestamp: number
}

type GameAction =
  | { type: "SELECT_PIECE"; piece: Piece | null }
  | { type: "MOVE_PIECE"; from: Position; to: Position }
  | { type: "SET_VALID_MOVES"; moves: Position[] }
  | { type: "RESET_GAME" }
  | { type: "SET_GAME_STATE"; state: Partial<GameState> }

const initialState: GameState = {
  board: Array(8)
    .fill(null)
    .map(() => Array(8).fill(null)),
  currentPlayer: "white",
  selectedPiece: null,
  validMoves: [],
  capturedPieces: [],
  gameStatus: "playing",
  moveHistory: [],
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SELECT_PIECE":
      return {
        ...state,
        selectedPiece: action.piece,
        validMoves: action.piece ? [] : [], // Will be calculated by game logic
      }

    case "SET_VALID_MOVES":
      return {
        ...state,
        validMoves: action.moves,
      }

    case "MOVE_PIECE":
      // This will be implemented with full game logic
      return state

    case "RESET_GAME":
      return {
        ...initialState,
        board: initializeBoard(),
      }

    case "SET_GAME_STATE":
      return {
        ...state,
        ...action.state,
      }

    default:
      return state
  }
}

function initializeBoard(): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null))

  // Place black pieces (top 3 rows)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = {
          id: `black-${row}-${col}`,
          type: "regular",
          color: "black",
          position: { row, col },
        }
      }
    }
  }

  // Place white pieces (bottom 3 rows)
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = {
          id: `white-${row}-${col}`,
          type: "regular",
          color: "white",
          position: { row, col },
        }
      }
    }
  }

  return board
}

const GameContext = createContext<{
  state: GameState
  dispatch: React.Dispatch<GameAction>
} | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, {
    ...initialState,
    board: initializeBoard(),
  })

  return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>
}

export function useGame() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error("useGame must be used within a GameProvider")
  }
  return context
}
