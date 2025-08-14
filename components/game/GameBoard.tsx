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
  const [isProcessingMove, setIsProcessingMove] = useState(false)

  useEffect(() => {
    if (
      mode === "bot" &&
      state.currentPlayer === "black" &&
      state.gameStatus === "playing" &&
      !isAIThinking &&
      !isProcessingMove
    ) {
      setTimeout(() => {
        setIsAIThinking(true)

        const thinkingTime = difficulty === "easy" ? 200 : difficulty === "medium" ? 400 : 600

        setTimeout(() => {
          const aiMove = AIEngine.getBestMove(state.board, difficulty)

          if (aiMove) {
            setIsProcessingMove(true)
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
            setIsProcessingMove(false)
          }

          setIsAIThinking(false)
        }, thinkingTime)
      }, 400)
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
    isProcessingMove,
  ])

  const handleSquareClick = (row: number, col: number) => {
    if (isAIThinking || isProcessingMove || (mode === "bot" && state.currentPlayer === "black")) {
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
      setIsProcessingMove(true)

      const moveResult = GameLogic.makeMove(state.board, state.selectedPiece.position, position)

      if (moveResult.success && moveResult.newState) {
        if (moveResult.hasMoreCaptures) {
          dispatch({ type: "SET_GAME_STATE", state: moveResult.newState })
        } else {
          dispatch({ type: "SELECT_PIECE", piece: null })
          dispatch({ type: "SET_VALID_MOVES", moves: [] })
          dispatch({ type: "SET_GAME_STATE", state: moveResult.newState })
        }

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

      setIsProcessingMove(false)
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
    setIsProcessingMove(false)
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
      className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 60px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
        paddingLeft: "max(env(safe-area-inset-left), 12px)",
        paddingRight: "max(env(safe-area-inset-right), 12px)",
        minHeight: "100vh",
        minHeight: "100dvh",
      }}
    >
      <div className="absolute inset-0">
        {/* Floating orbs with different animation speeds */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
        <div
          className="absolute bottom-20 right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-pink-500/10 rounded-full blur-xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />

        {/* Moving gradient overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: "linear-gradient(45deg, transparent 30%, rgba(59, 130, 246, 0.1) 50%, transparent 70%)",
            animation: "moveGradient 8s ease-in-out infinite alternate",
          }}
        />

        {/* Floating particles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full blur-sm"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between mb-2 md:mb-4 relative z-10">
        <button
          onClick={onBackToMenu}
          className="liquid-glass-button flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-2xl transition-all duration-300 hover:scale-105 text-white/90 shadow-black/20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium text-sm">Меню</span>
        </button>

        <div className="liquid-glass text-center rounded-2xl px-3 py-2 md:px-4 md:py-2.5">
          <h2 className="font-bold text-sm bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            StarCheckers
          </h2>
          <p className="text-xs text-white/60">
            {mode === "bot" &&
              `ИИ (${difficulty === "easy" ? "Легко" : difficulty === "medium" ? "Средне" : "Сложно"})`}
            {mode === "local" && "Локальная игра"}
            {mode === "online" && "Онлайн"}
          </p>
        </div>

        <button
          onClick={resetGame}
          className="liquid-glass-button flex items-center justify-center p-2 md:p-2.5 rounded-2xl transition-all duration-300 hover:scale-105 text-white/90"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-1 md:px-2">
        <div
          className="relative w-full 
          max-w-[min(90vw,80vh,400px)] 
          sm:max-w-[min(85vw,75vh,450px)]
          md:max-w-[min(80vw,70vh,550px)]
          lg:max-w-[min(75vw,65vh,600px)]
          aspect-square"
        >
          {/* Multiple shadow layers for depth */}
          <div
            className={`absolute inset-0 rounded-3xl blur-3xl transform translate-y-12 scale-115 ${
              theme === "dark"
                ? "bg-gradient-to-br from-black/90 to-gray-900/95"
                : theme === "system"
                  ? "bg-gradient-to-br from-purple-900/90 to-indigo-900/95"
                  : "bg-gradient-to-br from-black/30 to-gray-600/40"
            }`}
          />
          <div
            className={`absolute inset-0 rounded-2xl blur-2xl transform translate-y-6 scale-110 ${
              theme === "dark" ? "bg-black/70" : theme === "system" ? "bg-purple-900/70" : "bg-black/20"
            }`}
          />
          <div
            className={`absolute inset-0 rounded-xl blur-xl transform translate-y-3 scale-105 ${
              theme === "dark" ? "bg-black/50" : theme === "system" ? "bg-purple-900/50" : "bg-black/15"
            }`}
          />

          <div
            className="liquid-glass-3d relative rounded-3xl p-2 md:p-3 transform-gpu"
            style={{
              transform: "perspective(1200px) rotateX(8deg) rotateY(-2deg)",
              transformStyle: "preserve-3d",
            }}
          >
            <div
              className={`liquid-glass-3d rounded-2xl p-1.5 md:p-2 ${
                theme === "dark"
                  ? "bg-gradient-to-br from-amber-900/40 via-orange-900/30 to-red-900/40"
                  : theme === "system"
                    ? "bg-gradient-to-br from-purple-800/40 via-indigo-800/30 to-slate-800/40"
                    : "bg-gradient-to-br from-amber-200/70 via-orange-200/60 to-red-200/70"
              }`}
              style={{
                transform: "translateZ(15px)",
              }}
            >
              <div
                className="grid grid-cols-8 gap-0.5 w-full h-full rounded-xl overflow-hidden shadow-inner"
                style={{
                  transform: "translateZ(10px)",
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

      <div className="text-center space-y-2 md:space-y-3 px-1 md:px-2 pb-1 md:pb-2 relative z-10">
        <div className="liquid-glass inline-flex items-center gap-2 md:gap-3 rounded-full px-3 py-2 md:px-4 md:py-3 min-h-[40px] md:min-h-[48px] min-w-[140px] md:min-w-[160px] justify-center">
          <div
            className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full flex-shrink-0 shadow-lg ${
              state.currentPlayer === "white"
                ? "bg-gradient-to-br from-gray-100 to-gray-300 border border-gray-400"
                : "bg-gradient-to-br from-gray-700 to-gray-900 border border-gray-600"
            }`}
          />
          <p className="text-xs md:text-sm font-semibold whitespace-nowrap text-white/90">
            {isAIThinking ? (
              <span className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                Бот думает...
              </span>
            ) : (
              `Ход: ${state.currentPlayer === "white" ? "Белые" : "Черные"}`
            )}
          </p>
        </div>

        {state.gameStatus !== "playing" && (
          <div className="liquid-glass border rounded-full px-3 py-2 md:px-4 md:py-3 animate-pulse min-h-[40px] md:min-h-[48px] flex items-center justify-center">
            <p className="font-bold text-xs md:text-sm whitespace-nowrap text-emerald-400">
              {state.gameStatus === "white-wins" && "Белые победили!"}
              {state.gameStatus === "black-wins" && "Черные победили!"}
              {state.gameStatus === "draw" && "Ничья!"}
            </p>
          </div>
        )}

        <div className="liquid-glass rounded-2xl p-2 md:p-3 max-w-xs md:max-w-sm mx-auto min-h-[50px] md:min-h-[60px]">
          <p className="text-xs mb-1 md:mb-2 text-white/60">Взятые:</p>
          <div className="flex justify-center gap-1 flex-wrap min-h-[16px] md:min-h-[20px] items-center">
            {state.capturedPieces.length > 0 ? (
              state.capturedPieces.map((piece, index) => (
                <div
                  key={`captured-${piece.id}-${index}`}
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 rounded-full border backdrop-blur-xl shadow-lg transition-all duration-200 ease-out animate-in fade-in zoom-in ${
                    piece.color === "white"
                      ? "bg-gradient-to-br from-gray-100/90 to-gray-300/90 border-gray-300"
                      : "bg-gradient-to-br from-gray-700/90 to-gray-900/90 border-gray-600"
                  } ${piece.type === "king" ? "ring-1 md:ring-2 ring-yellow-400/60" : ""}`}
                  style={{ borderRadius: "50%" }}
                />
              ))
            ) : (
              <p className="text-xs italic text-white/40">Пока нет взятых фигур</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
