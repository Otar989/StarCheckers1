"use client"
import { ArrowLeft, RotateCcw } from "lucide-react"
import type React from "react"

import { useGame } from "./GameProvider"
import { useAudio } from "./AudioProvider"
import { useTelegram } from "../telegram/TelegramProvider"
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
  const { playSound } = useAudio()
  const { hapticFeedback } = useTelegram()
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (mode === "bot" && state.currentPlayer === "black" && state.gameStatus === "playing" && !isAIThinking) {
      setIsAIThinking(true)

      const thinkingTime = difficulty === "easy" ? 500 : difficulty === "medium" ? 1000 : 1500

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
    if (isAIThinking || (mode === "bot" && state.currentPlayer === "black")) return

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

        if (moveResult.hasMoreCaptures) {
          return
        }

        if (moveResult.newState.gameStatus !== "playing") {
          playSound("win")
          hapticFeedback("heavy")
        }
      }
    }

    dispatch({ type: "SELECT_PIECE", piece: null })
    dispatch({ type: "SET_VALID_MOVES", moves: [] })
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

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    })
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const isLeftSwipe = distanceX > 50
    const isRightSwipe = distanceX < -50
    const isUpSwipe = distanceY > 50
    const isDownSwipe = distanceY < -50

    // Обработка свайпов для перемещения выбранной шашки
    if (state.selectedPiece && (isLeftSwipe || isRightSwipe || isUpSwipe || isDownSwipe)) {
      const currentPos = state.selectedPiece.position
      let newRow = currentPos.row
      let newCol = currentPos.col

      if (isUpSwipe) newRow = Math.max(0, newRow - 1)
      if (isDownSwipe) newRow = Math.min(7, newRow + 1)
      if (isLeftSwipe) newCol = Math.max(0, newCol - 1)
      if (isRightSwipe) newCol = Math.min(7, newCol + 1)

      if (newRow !== currentPos.row || newCol !== currentPos.col) {
        handleSquareClick(newRow, newCol)
      }
    }
  }

  return (
    <div className="min-h-screen p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-blue-950/30 dark:via-purple-950/20 dark:to-pink-950/30" />

      {/* Glass orbs */}
      <div className="absolute top-10 left-10 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-2xl animate-pulse backdrop-blur-3xl" />
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-2xl animate-pulse delay-1000 backdrop-blur-3xl" />

      <div className="flex items-center justify-between mb-6 relative">
        <button
          onClick={onBackToMenu}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 dark:bg-black/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105"
        >
          <ArrowLeft className="w-4 h-4 text-white/80" />
          <span className="hidden xs:inline text-white/80 font-medium">Главное меню</span>
        </button>

        <div className="text-center bg-white/10 dark:bg-black/10 backdrop-blur-xl rounded-2xl border border-white/20 px-4 py-2">
          <h2 className="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            StarCheckers
          </h2>
          <p className="text-xs text-white/70">
            {mode === "bot" &&
              `ИИ (${difficulty === "easy" ? "Легко" : difficulty === "medium" ? "Средне" : "Сложно"})`}
            {mode === "local" && "Локальная игра"}
            {mode === "online" && "Онлайн"}
          </p>
        </div>

        <button
          onClick={resetGame}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 dark:bg-black/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105"
        >
          <RotateCcw className="w-4 h-4 text-white/80" />
        </button>
      </div>

      <div className="flex items-center justify-center mb-6">
        <div className="relative w-full max-w-md aspect-square">
          {/* Multiple shadow layers for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/30 to-black/50 rounded-3xl blur-3xl transform translate-y-8 scale-110" />
          <div className="absolute inset-0 bg-black/20 rounded-2xl blur-xl transform translate-y-4 scale-105" />

          {/* Glass board container */}
          <div
            className="relative bg-white/10 dark:bg-black/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-4 sm:p-6 shadow-2xl"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="bg-gradient-to-br from-amber-100/20 to-orange-100/20 dark:from-amber-900/20 dark:to-orange-900/20 backdrop-blur-xl rounded-2xl border border-white/10 p-2 sm:p-4">
              <div className="grid grid-cols-8 gap-0 w-full h-full rounded-xl overflow-hidden shadow-inner">
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
                    />
                  )),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-3 bg-white/10 dark:bg-black/10 backdrop-blur-xl rounded-full px-6 py-3 border border-white/20 shadow-lg">
          <div
            className={`w-4 h-4 rounded-full ${
              state.currentPlayer === "white"
                ? "bg-gradient-to-br from-gray-100 to-gray-300 border-2 border-gray-400"
                : "bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-gray-600"
            }`}
          />
          <p className="text-lg font-semibold text-white/90">
            {isAIThinking ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Бот думает...
              </span>
            ) : (
              `Ход: ${state.currentPlayer === "white" ? "Белые" : "Черные"}`
            )}
          </p>
        </div>

        {state.gameStatus !== "playing" && (
          <div className="bg-gradient-to-r from-green-400/20 to-emerald-400/20 backdrop-blur-xl border border-green-400/30 text-white rounded-full px-6 py-3 shadow-lg animate-pulse">
            <p className="font-bold text-base">
              {state.gameStatus === "white-wins" && "Белые победили!"}
              {state.gameStatus === "black-wins" && "Черные победили!"}
              {state.gameStatus === "draw" && "Ничья!"}
            </p>
          </div>
        )}
      </div>

      {state.capturedPieces.length > 0 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-white/70 mb-2">Взятые шашки:</p>
          <div className="bg-white/5 dark:bg-black/5 backdrop-blur-xl rounded-2xl border border-white/10 p-3 max-w-xs mx-auto">
            <div className="flex justify-center gap-1 flex-wrap">
              {state.capturedPieces.map((piece, index) => (
                <div
                  key={`captured-${piece.id}-${index}`}
                  className={`w-6 h-6 rounded-full border backdrop-blur-xl ${
                    piece.color === "white"
                      ? "bg-gradient-to-br from-gray-100/80 to-gray-300/80 border-gray-300"
                      : "bg-gradient-to-br from-gray-700/80 to-gray-900/80 border-gray-600"
                  } ${piece.type === "king" ? "ring-1 ring-yellow-400/50" : ""}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
