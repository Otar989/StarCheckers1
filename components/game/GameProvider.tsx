"use client"

import type React from "react"
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  type ReactNode,
} from "react"
import { useGameStats } from "@/hooks/use-game-stats"
import { useTelegram } from "../telegram/TelegramProvider"
import type { GameMode } from "@/app/page"
import { GameLogic } from "@/lib/game-logic"
import { useOnlineGame } from "@/hooks/use-online-game"

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
  gameStatus: "playing" | "white-wins" | "black-wins" | "draw" | "player-left"
  moveHistory: Move[]
  gameMode: GameMode
  roomId: string | null
  playerColor: PieceColor | null
  opponentColor: PieceColor | null
  lobbyStatus: "idle" | "waiting"
  error: string | null
}

export interface Move {
  from: Position
  to: Position
  capturedPieces: Piece[]
  timestamp: number
}

export type GameDispatch = React.Dispatch<GameAction>

type GameAction =
  | { type: "SELECT_PIECE"; piece: Piece | null }
  | { type: "MOVE_PIECE"; from: Position; to: Position }
  | { type: "SET_VALID_MOVES"; moves: Position[] }
  | { type: "RESET_GAME"; gameMode?: GameMode }
  | { type: "SET_GAME_STATE"; state: Partial<GameState> }
  | { type: "SET_GAME_MODE"; payload: GameMode }
  | { type: "SET_ROOM_ID"; payload: string }
  | { type: "SET_LOBBY_STATUS"; payload: "idle" | "waiting" }
  | { type: "START_ONLINE_GAME" }
  | { type: "APPLY_REMOTE_MOVE"; payload: Move }
  | { type: "OPPONENT_LEFT" }
  | { type: "MAKE_LOCAL_MOVE"; payload: Move }
  | { type: "SET_ERROR"; payload: string }

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
  opponentColor: null,
  lobbyStatus: "idle",
  error: null
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

    case "MOVE_PIECE": {
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
    }

    case "RESET_GAME":
      return {
        ...initialState,
        board: initializeBoard(),
        gameMode: action.gameMode || state.gameMode,
      }

    case "SET_GAME_STATE":
      return { ...state, ...action.state }

    case "SET_GAME_MODE":
      return { ...state, gameMode: action.payload }

    case "SET_ROOM_ID":
      return { ...state, roomId: action.payload }

    case "SET_LOBBY_STATUS":
      return { ...state, lobbyStatus: action.payload }

    case "START_ONLINE_GAME":
      return { 
        ...state,
        playerColor: state.playerColor || "white",
        opponentColor: state.opponentColor || "black",
        lobbyStatus: "idle"
      }

    case "APPLY_REMOTE_MOVE": {
      const move = action.payload
      const moveResult = GameLogic.makeMove(state.board, move.from, move.to)
      if (moveResult.success && moveResult.newState) {
        return {
          ...state,
          ...moveResult.newState,
          moveHistory: [...state.moveHistory, move]
        }
      }
      return state
    }

    case "OPPONENT_LEFT":
      return {
        ...state,
        gameStatus: "player-left"
      }

    case "SET_ERROR":
      return {
        ...state,
        error: action.payload
      }

    case "MAKE_LOCAL_MOVE": {
      if (state.gameMode === "online") {
        // For online game, just apply the move locally and let the server broadcast it
        const move = action.payload
        const moveResult = GameLogic.makeMove(state.board, move.from, move.to)
        if (moveResult.success && moveResult.newState) {
          // Send move through socket will be handled in the component
          return {
            ...state,
            ...moveResult.newState,
            moveHistory: [...state.moveHistory, move]
          }
        }
      }
      return state
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
  createRoom: () => Promise<void>
  joinRoom: (code: string) => Promise<void>
  leaveRoom: () => Promise<void>
  sendMove: (move: Move) => Promise<void>
} | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, {
    ...initialState,
    board: initializeBoard(),
  })

  const { user } = useTelegram()
  const {
    recordWin,
    recordLoss,
    recordDraw,
    recordOnlineWin,
    recordOnlineLoss,
    recordOnlineDraw,
  } = useGameStats(user?.id)

  const statsRecordedRef = useRef(false)
  const playerColorRef = useRef<PieceColor | null>(null)

  const {
    createRoom,
    joinRoom,
    leaveRoom,
    sendMove
  } = useOnlineGame(dispatch, state)

  // Handle online game with Socket.IO
  const { createOnlineRoom, joinOnlineRoom, sendMove } = useOnlineGame(dispatch)

  useEffect(() => {
    // If a move is made in online mode, send it through socket
    if (state.gameMode === 'online' && state.moveHistory.length > 0) {
      const lastMove = state.moveHistory[state.moveHistory.length - 1]
      state.roomId && sendMove(state.roomId, lastMove)
    }
  }, [state.moveHistory])

  useEffect(() => {
        dispatch({
          type: "SET_GAME_STATE",
          state: { roomId: data.roomId, playerColor: data.player },
        })
      })

      activeSocket.on("playerJoined", (data: { player: PieceColor }) => {
        const opponentColor =
          data.player === playerColorRef.current
            ? data.player === "white" ? "black" : "white"
            : data.player
        dispatch({
          type: "SET_GAME_STATE",
          state: { opponentColor, gameStatus: "playing" },
        })
      })

      activeSocket.on("playerLeft", () => {
        dispatch({
          type: "SET_GAME_STATE",
          state: { gameStatus: "player-left" },
        })
      })

      activeSocket.on(
        "move",
        (
          data: {
            from: Position
            to: Position
            board: (Piece | null)[][]
            currentPlayer: PieceColor
            gameStatus: GameState["gameStatus"]
          },
        ) => {
          dispatch({
            type: "SET_GAME_STATE",
            state: {
              board: data.board,
              currentPlayer: data.currentPlayer,
              gameStatus: data.gameStatus,
            },
          })
        },
      )

      activeSocket.on("gameOver", (data: { winner: PieceColor | "draw" }) => {
        let gameStatus: GameState["gameStatus"] = "draw"
        if (data.winner === "white") gameStatus = "white-wins"
        else if (data.winner === "black") gameStatus = "black-wins"
        dispatch({ type: "SET_GAME_STATE", state: { gameStatus } })
      })
    }

    initSocket()

    return () => {
      activeSocket?.off("gameCreated")
      activeSocket?.off("playerJoined")
      activeSocket?.off("playerLeft")
      activeSocket?.off("move")
      activeSocket?.off("gameOver")
      activeSocket?.disconnect()
      setSocket(null)
    }
  }, [state.gameMode, dispatch])

  useEffect(() => {
    playerColorRef.current = state.playerColor
  }, [state.playerColor])

  useEffect(() => {
    if (state.gameStatus === "playing") {
      statsRecordedRef.current = false
    }
  }, [state.gameStatus])

  useEffect(() => {
    if (
      state.gameStatus !== "playing" &&
      state.gameStatus !== "player-left" &&
      !statsRecordedRef.current
    ) {
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
      // в локальном режиме статистика не ведётся
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
    <GameContext.Provider value={{ state, dispatch, setGameMode, socket }}>
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