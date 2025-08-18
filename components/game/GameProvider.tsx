"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode } from "react"
import { useGameStats } from "@/hooks/use-game-stats"
import type { GameMode } from "@/app/page"
import { GameLogic } from "@/lib/game-logic"

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
  gameMode: GameMode
  roomId: string | null
  playerColor: PieceColor | null
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
  | { type: "RESET_GAME"; gameMode?: GameMode }
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
  gameMode: "bot",
  roomId: null,
  playerColor: null,
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SELECT_PIECE":
      return {
        ...state,
        selectedPiece: action.piece,
        validMoves: action.piece ? [] : [],
      }

    case "SET_VALID_MOVES":
      return {
        ...state,
        validMoves: action.moves,
      }

    case "MOVE_PIECE":
      const moveResult = GameLogic.makeMove(state.board, action.from, action.to)
      if (moveResult.success && moveResult.newState) {
        return {
          ...state,
          ...moveResult.newState,
          selectedPiece: null,
          validMoves: [],
        }
      }
      return state

    case "RESET_GAME":
      return {
        ...initialState,
        board: initializeBoard(),
        gameMode: action.gameMode || state.gameMode,
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
  setGameMode: (mode: GameMode) => void
  socket: React.MutableRefObject<WebSocket | null>
} | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, {
    ...initialState,
    board: initializeBoard(),
  })

  const socketRef = useRef<WebSocket | null>(null)
  const { 
    recordWin, 
    recordLoss, 
    recordDraw, 
    recordOnlineWin, 
    recordOnlineLoss, 
    recordOnlineDraw 
  } = useGameStats()
  const statsRecordedRef = useRef(false)

  useEffect(() => {
    if (state.gameMode !== "online") {
      socketRef.current?.close()
      socketRef.current = null
      return
    }

    const socket = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001")
    socketRef.current = socket

    socket.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "init") {
          dispatch({
            type: "SET_GAME_STATE",
            state: { roomId: data.roomId, playerColor: data.player },
          })
        } else if (data.type === "move" || data.type === "opponentMove") {
          dispatch({ type: "MOVE_PIECE", from: data.from, to: data.to })
        }
      } catch {
        // ignore malformed messages
      }
    })

    return () => {
      socket.close()
      socketRef.current = null
    }
  }, [state.gameMode, dispatch])

  useEffect(() => {
    if (state.gameStatus === "playing") {
      statsRecordedRef.current = false
    }
  }, [state.gameStatus])

  useEffect(() => {
    if (state.gameStatus !== "playing" && !statsRecordedRef.current) {
      if (state.gameMode === "bot") {
        if (state.gameStatus === "white-wins") {
          recordWin()
          statsRecordedRef.current = true
        } else if (state.gameStatus === "black-wins") {
          recordLoss()
          statsRecordedRef.current = true
        } else if (state.gameStatus === "draw") {
          recordDraw()
          statsRecordedRef.current = true
        }
      } else if (state.gameMode === "online") {
        if (state.gameStatus === "white-wins") {
          recordOnlineWin()
          statsRecordedRef.current = true
        } else if (state.gameStatus === "black-wins") {
          recordOnlineLoss()
          statsRecordedRef.current = true
        } else if (state.gameStatus === "draw") {
          recordOnlineDraw()
          statsRecordedRef.current = true
        }
      }
      // В локальном режиме статистика не ведется (играют два человека)
    }
  }, [
    state.gameStatus,
    state.gameMode,
    recordWin,
    recordLoss,
    recordDraw,
    recordOnlineWin,
    recordOnlineLoss,
    recordOnlineDraw,
  ])

  const setGameMode = (mode: GameMode) => {
    dispatch({ type: "SET_GAME_STATE", state: { gameMode: mode } })
  }

  return (
    <GameContext.Provider value={{ state, dispatch, setGameMode, socket: socketRef }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error("useGame must be used within a GameProvider")
  }
  return context
}
