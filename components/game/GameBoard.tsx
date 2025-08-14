"use client"
import { ArrowLeft, RotateCcw } from "lucide-react"

import { useGame } from "./GameProvider"
import { useAudio } from "./AudioProvider"
import { useTelegram } from "../telegram/TelegramProvider"
import { useTheme } from "@/hooks/use-theme"
import { BoardSquare } from "./BoardSquare"
import { GameLogic } from "@/lib/game-logic"
import { AIEngine } from "@/lib/ai-engine"
import type { GameMode, Difficulty } from "@/app/page"
import type { Position } from "./GameProvider"
import { useEffect, useState } from "react"

interface GameBoardProps {
  mode: GameMode
  difficulty: Difficulty
  onBackToMenu: () => void
}

export function GameBoard({ mode, difficulty, onBackToMenu }: GameBoardProps) {
  const { state, dispatch } = useGame()
  const { playSound, initializeAudio } = useAudio()
  const { hapticFeedback } = useTelegram()
  const { theme } = useTheme()
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [dragOver, setDragOver] = useState<{ row: number; col: number } | null>(null)

  useEffect(() => {
    if (mode === "bot" && state.currentPlayer === "black" && state.gameStatus === "playing" && !isAIThinking) {
      setIsAIThinking(true)

      const thinkingTime = difficulty === "easy" ? 200 : difficulty === "medium" ? 400 : 600

      setTimeout(() => {
        const aiMove = AIEngine.getBestMove(state.board, difficulty)

        if (aiMove) {
          const moveResult = GameLogic.makeMove(state.board, aiMove.from, aiMove.to)

          if (moveResult.success && moveResult.newState) {
            dispatch({ type: "SET_GAME_STATE", state: moveResult.newState })
            playSound(moveResult.capturedPieces.length > 0 ? "capture" : "move")
            hapticFeedback(moveResult.capturedPieces.length > 0 ? "medium" : "light")

            if (moveResult.newState.gameStatus !== "playing") {
              playSound("win")
              hapticFeedback("heavy")
            }
          }
        }

        setIsAIThinking(false)
      }, thinkingTime)
    }
  }, [
    state.currentPlayer,
    state.gameStatus,
    mode,
    difficulty,
    state.board,
    dispatch,
    playSound,
    hapticFeedback,
    isAIThinking,
  ])

  const handleSquareClick = (row: number, col: number) => {
    if (isAIThinking || (mode === "bot" && state.currentPlayer === "black")) {
      return
    }

    initializeAudio()

    const position: Position = { row, col }
    const piece = state.board[row][col]

    hapticFeedback("light")

    if (!state.selectedPiece) {
      if (piece && piece.color === state.currentPlayer) {
        dispatch({ type: "SELECT_PIECE", piece })
        const validMoves = GameLogic.getValidMoves(state.board, piece)
        dispatch({ type: "SET_VALID_MOVES", moves: validMoves })
        playSound("select")
      }
      return
    }

    if (state.selectedPiece && piece?.id === state.selectedPiece.id) {
      dispatch({ type: "SELECT_PIECE", piece: null })
      dispatch({ type: "SET_VALID_MOVES", moves: [] })
      return
    }

    if (piece && piece.color === state.currentPlayer) {
      dispatch({ type: "SELECT_PIECE", piece })
      const validMoves = GameLogic.getValidMoves(state.board, piece)
      dispatch({ type: "SET_VALID_MOVES", moves: validMoves })
      playSound("select")
      return
    }

    const isValidMove = state.validMoves.some((move) => move.row === row && move.col === col)

    if (isValidMove && state.selectedPiece) {
      const moveResult = GameLogic.makeMove(state.board, state.selectedPiece.position, position)

      if (moveResult.success && moveResult.newState) {
        dispatch({ type: "SELECT_PIECE", piece: null })
        dispatch({ type: "SET_VALID_MOVES", moves: [] })

        dispatch({ type: "SET_GAME_STATE", state: moveResult.newState })
        playSound(moveResult.capturedPieces.length > 0 ? "capture" : "move")
        hapticFeedback(moveResult.capturedPieces.length > 0 ? "medium" : "light")

        if (
          moveResult.newState.board[position.row][position.col]?.type === "king" &&
          state.selectedPiece.type === "regular"
        ) {
          playSound("promote")
          hapticFeedback("heavy")
        }

        if (moveResult.newState.gameStatus !== "playing") {
          playSound("win")
          hapticFeedback("heavy")
        }
      }
    } else {
      dispatch({ type: "SELECT_PIECE", piece: null })
      dispatch({ type: "SET_VALID_MOVES", moves: [] })
    }
  }

  const handleDragStart = (row: number, col: number) => {
    handleSquareClick(row, col)
  }

  const handleDragOver = (row: number, col: number) => {
    if (row >= 0 && col >= 0) {
      setDragOver({ row, col })
    } else {
      setDragOver(null)
    }
  }

  const handleDrop = (row: number, col: number) => {
    handleSquareClick(row, col)
    setDragOver(null)
  }

  const resetGame = () => {
    dispatch({ type: "RESET_GAME" })
    setIsAIThinking(false)
    hapticFeedback("medium")
  }

  const isValidMoveSquare = (row: number, col: number) => {
    return state.validMoves.some((move) => move.row === row && move.col === col)
  }

  const isSelectedSquare = (row: number, col: number) => {
    return state.selectedPiece?.position.row === row && state.selectedPiece?.position.col === col
  }

  return (
    <div
      className={`min-h-screen flex flex-col relative overflow-hidden ${
        theme === "dark"
          ? "bg-gradient-to-br from-slate-950 via-gray-900 to-black"
          : "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
      }`}
      style={{
        paddingTop: "max(env(safe-area-inset-top), 100px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 20px)",
        paddingLeft: "max(env(safe-area-inset-left), 12px)",
        paddingRight: "max(env(safe-area-inset-right), 12px)",
        minHeight: "100vh",
        minHeight: "100dvh",
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-30 animate-pulse ${
            theme === "dark"
              ? "bg-gradient-to-br from-blue-600/20 to-purple-600/20"
              : "bg-gradient-to-br from-blue-300/30 to-purple-300/30"
          }`}
        />
        <div
          className={`absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-20 animate-pulse delay-1000 ${
            theme === "dark"
              ? "bg-gradient-to-br from-purple-600/20 to-pink-600/20"
              : "bg-gradient-to-br from-purple-300/30 to-pink-300/30"
          }`}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <button
          onClick={onBackToMenu}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl backdrop-blur-2xl border transition-all duration-300 hover:scale-105 shadow-xl ${
            theme === "dark"
              ? "bg-white/5 border-white/10 hover:bg-white/10 text-white/90 shadow-black/20"
              : "bg-white/20 border-white/30 hover:bg-white/30 text-black/80 shadow-black/10"
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium text-sm">Меню</span>
        </button>

        <div
          className={`text-center backdrop-blur-2xl rounded-2xl border px-4 py-2.5 shadow-xl ${
            theme === "dark" ? "bg-black/20 border-white/10" : "bg-white/30 border-white/40"
          }`}
        >
          <h2
            className={`font-bold text-sm bg-gradient-to-r bg-clip-text text-transparent ${
              theme === "dark" ? "from-blue-400 to-purple-400" : "from-blue-600 to-purple-600"
            }`}
          >
            StarCheckers
          </h2>
          <p className={`text-xs ${theme === "dark" ? "text-white/60" : "text-black/60"}`}>
            {mode === "bot" &&
              `ИИ (${difficulty === "easy" ? "Легко" : difficulty === "medium" ? "Средне" : "Сложно"})`}
            {mode === "local" && "Локальная игра"}
            {mode === "online" && "Онлайн"}
          </p>
        </div>

        <button
          onClick={resetGame}
          className={`flex items-center justify-center p-2.5 rounded-2xl backdrop-blur-2xl border transition-all duration-300 hover:scale-105 shadow-xl ${
            theme === "dark"
              ? "bg-white/5 border-white/10 hover:bg-white/10 text-white/90"
              : "bg-white/20 border-white/30 hover:bg-white/30 text-black/80"
          }`}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Game Board */}
      <div className="flex-1 flex items-center justify-center px-2">
        <div className="relative w-full max-w-[min(85vw,75vh,450px)] aspect-square">
          {/* Board shadow layers */}
          <div
            className={`absolute inset-0 rounded-3xl blur-3xl transform translate-y-8 scale-110 ${
              theme === "dark"
                ? "bg-gradient-to-br from-black/80 to-gray-900/90"
                : "bg-gradient-to-br from-black/20 to-gray-600/30"
            }`}
          />
          <div
            className={`absolute inset-0 rounded-2xl blur-xl transform translate-y-4 scale-105 ${
              theme === "dark" ? "bg-black/60" : "bg-black/15"
            }`}
          />

          {/* Main board container */}
          <div
            className={`relative backdrop-blur-3xl rounded-3xl border-2 p-3 shadow-2xl transform-gpu ${
              theme === "dark"
                ? "bg-gradient-to-br from-slate-800/40 via-slate-700/30 to-slate-900/50 border-white/10"
                : "bg-gradient-to-br from-white/40 via-blue-50/30 to-indigo-100/40 border-white/40"
            }`}
            style={{
              transform: "perspective(1000px) rotateX(5deg)",
              transformStyle: "preserve-3d",
            }}
          >
            {/* Inner board frame */}
            <div
              className={`backdrop-blur-2xl rounded-2xl border p-2 ${
                theme === "dark"
                  ? "bg-gradient-to-br from-amber-900/30 via-orange-900/20 to-red-900/30 border-white/5"
                  : "bg-gradient-to-br from-amber-100/40 via-orange-100/30 to-red-100/40 border-white/30"
              }`}
              style={{
                transform: "translateZ(10px)",
              }}
            >
              {/* Board grid */}
              <div
                className="grid grid-cols-8 gap-0.5 w-full h-full rounded-xl overflow-hidden shadow-inner"
                style={{
                  transform: "translateZ(5px)",
                }}
              >
                {state.board.map((row, rowIndex) =>
                  row.map((piece, colIndex) => (
                    <BoardSquare
                      key={`${rowIndex}-${colIndex}`}
                      row={rowIndex}
                      col={colIndex}
                      piece={piece}
                      isSelected={isSelectedSquare(rowIndex, colIndex)}
                      isValidMove={isValidMoveSquare(rowIndex, colIndex)}
                      onClick={() => handleSquareClick(rowIndex, colIndex)}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      isDragTarget={dragOver?.row === rowIndex && dragOver?.col === colIndex}
                    />
                  )),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status and info */}
      <div className="text-center space-y-3 px-2 pb-2 relative z-10">
        {/* Current turn indicator */}
        <div
          className={`inline-flex items-center gap-3 backdrop-blur-2xl rounded-full px-4 py-3 border shadow-xl min-h-[48px] min-w-[160px] justify-center ${
            theme === "dark" ? "bg-black/30 border-white/10" : "bg-white/30 border-white/40"
          }`}
        >
          <div
            className={`w-3 h-3 rounded-full flex-shrink-0 shadow-lg ${
              state.currentPlayer === "white"
                ? "bg-gradient-to-br from-gray-100 to-gray-300 border border-gray-400"
                : "bg-gradient-to-br from-gray-700 to-gray-900 border border-gray-600"
            }`}
          />
          <p
            className={`text-sm font-semibold whitespace-nowrap ${theme === "dark" ? "text-white/90" : "text-black/90"}`}
          >
            {isAIThinking ? (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                Бот думает...
              </span>
            ) : (
              `Ход: ${state.currentPlayer === "white" ? "Белые" : "Черные"}`
            )}
          </p>
        </div>

        {/* Game status */}
        {state.gameStatus !== "playing" && (
          <div
            className={`backdrop-blur-2xl border rounded-full px-4 py-3 shadow-xl animate-pulse min-h-[48px] flex items-center justify-center ${
              theme === "dark"
                ? "bg-gradient-to-r from-green-600/30 to-emerald-600/30 border-green-400/30 text-white"
                : "bg-gradient-to-r from-green-400/40 to-emerald-400/40 border-green-400/50 text-black"
            }`}
          >
            <p className="font-bold text-sm whitespace-nowrap">
              {state.gameStatus === "white-wins" && "Белые победили!"}
              {state.gameStatus === "black-wins" && "Черные победили!"}
              {state.gameStatus === "draw" && "Ничья!"}
            </p>
          </div>
        )}

        {/* Captured pieces */}
        <div
          className={`backdrop-blur-2xl rounded-2xl border p-3 max-w-sm mx-auto min-h-[60px] ${
            theme === "dark" ? "bg-black/20 border-white/10" : "bg-white/20 border-white/30"
          }`}
        >
          <p className={`text-xs mb-2 ${theme === "dark" ? "text-white/60" : "text-black/60"}`}>Взятые:</p>
          <div className="flex justify-center gap-1 flex-wrap min-h-[20px] items-center">
            {state.capturedPieces.length > 0 ? (
              state.capturedPieces.map((piece, index) => (
                <div
                  key={`captured-${piece.id}-${index}`}
                  className={`w-4 h-4 rounded-full border backdrop-blur-xl shadow-lg transition-all duration-200 ease-out animate-in fade-in zoom-in ${
                    piece.color === "white"
                      ? "bg-gradient-to-br from-gray-100/90 to-gray-300/90 border-gray-300"
                      : "bg-gradient-to-br from-gray-700/90 to-gray-900/90 border-gray-600"
                  } ${piece.type === "king" ? "ring-2 ring-yellow-400/60" : ""}`}
                  style={{ borderRadius: "50%" }}
                />
              ))
            ) : (
              <p className={`text-xs italic ${theme === "dark" ? "text-white/40" : "text-black/40"}`}>
                Пока нет взятых фигур
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
