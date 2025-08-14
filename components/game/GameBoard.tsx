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
      className={`min-h-screen flex flex-col relative overflow-hidden ${
        theme === "dark"
          ? "bg-gradient-to-br from-slate-950 via-gray-900 to-black"
          : theme === "system"
            ? "bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900"
            : "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
      }`}
      style={{
        paddingTop: "max(env(safe-area-inset-top), 60px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
        paddingLeft: "max(env(safe-area-inset-left), 12px)",
        paddingRight: "max(env(safe-area-inset-right), 12px)",
        minHeight: "100vh",
        minHeight: "100dvh",
      }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-30 animate-pulse ${
            theme === "dark"
              ? "bg-gradient-to-br from-blue-600/20 to-purple-600/20"
              : theme === "system"
                ? "bg-gradient-to-br from-purple-600/20 to-indigo-600/20"
                : "bg-gradient-to-br from-blue-300/30 to-purple-300/30"
          }`}
        />
        <div
          className={`absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-20 animate-pulse delay-1000 ${
            theme === "dark"
              ? "bg-gradient-to-br from-purple-600/20 to-pink-600/20"
              : theme === "system"
                ? "bg-gradient-to-br from-indigo-600/20 to-pink-600/20"
                : "bg-gradient-to-br from-purple-300/30 to-pink-300/30"
          }`}
        />

        <div
          className={`absolute inset-0 opacity-20 ${theme === "dark" ? "opacity-30" : "opacity-20"}`}
          style={{
            background:
              theme === "dark"
                ? "linear-gradient(120deg, transparent 20%, rgba(59, 130, 246, 0.1) 40%, rgba(147, 51, 234, 0.1) 60%, transparent 80%)"
                : theme === "system"
                  ? "linear-gradient(120deg, transparent 20%, rgba(147, 51, 234, 0.2) 40%, rgba(59, 130, 246, 0.2) 60%, transparent 80%)"
                  : "linear-gradient(120deg, transparent 20%, rgba(59, 130, 246, 0.2) 40%, rgba(147, 51, 234, 0.2) 60%, transparent 80%)",
            animation: "moveWave 10s ease-in-out infinite alternate",
          }}
        />

        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={`absolute w-1.5 h-1.5 rounded-full blur-sm ${theme === "dark" ? "bg-white/10" : theme === "system" ? "bg-purple-100/10" : "bg-black/10"}`}
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${20 + Math.random() * 60}%`,
              animation: `gentleFloat ${4 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}

        <div
          className={`absolute top-0 left-1/2 w-px h-full transform -translate-x-1/2 opacity-10 ${
            theme === "dark"
              ? "bg-gradient-to-b from-blue-400/20 via-transparent to-purple-400/20"
              : theme === "system"
                ? "bg-gradient-to-b from-indigo-400/20 via-transparent to-purple-400/20"
                : "bg-gradient-to-b from-blue-600/20 via-transparent to-purple-600/20"
          }`}
          style={{
            animation: "shimmer 6s ease-in-out infinite alternate",
          }}
        />
      </div>

      <div className="flex items-center justify-between mb-2 md:mb-4 relative z-10">
        <button
          onClick={onBackToMenu}
          className={`flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-2xl backdrop-blur-2xl border transition-all duration-300 hover:scale-105 shadow-xl ${
            theme === "dark"
              ? "bg-white/5 border-white/10 hover:bg-white/10 text-white/90 shadow-black/20"
              : theme === "system"
                ? "bg-white/10 border-purple-300/20 hover:bg-white/15 text-white/90 shadow-black/20"
                : "bg-white/20 border-white/30 hover:bg-white/30 text-black/80 shadow-black/10"
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium text-sm">Меню</span>
        </button>

        <div
          className={`text-center backdrop-blur-2xl rounded-2xl border px-3 py-2 md:px-4 md:py-2.5 shadow-xl ${
            theme === "dark"
              ? "bg-black/20 border-white/10"
              : theme === "system"
                ? "bg-purple-900/30 border-purple-300/20"
                : "bg-white/20 border-white/30"
          }`}
        >
          <h2
            className={`font-bold text-sm bg-gradient-to-r bg-clip-text text-transparent ${
              theme === "dark"
                ? "from-blue-400 to-purple-400"
                : theme === "system"
                  ? "from-purple-300 to-indigo-300"
                  : "from-blue-600 to-purple-600"
            }`}
          >
            StarCheckers
          </h2>
          <p
            className={`text-xs ${
              theme === "dark" ? "text-white/60" : theme === "system" ? "text-purple-200/70" : "text-black/60"
            }`}
          >
            {mode === "bot" &&
              `ИИ (${difficulty === "easy" ? "Легко" : difficulty === "medium" ? "Средне" : "Сложно"})`}
            {mode === "local" && "Локальная игра"}
            {mode === "online" && "Онлайн"}
          </p>
        </div>

        <button
          onClick={resetGame}
          className={`flex items-center justify-center p-2 md:p-2.5 rounded-2xl backdrop-blur-2xl border transition-all duration-300 hover:scale-105 shadow-xl ${
            theme === "dark"
              ? "bg-white/5 border-white/10 hover:bg-white/10 text-white/90"
              : theme === "system"
                ? "bg-white/10 border-purple-300/20 hover:bg-white/15 text-white/90"
                : "bg-white/20 border-white/30 hover:bg-white/30 text-black/80"
          }`}
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
          <div
            className={`absolute inset-0 rounded-3xl blur-3xl transform translate-y-8 scale-110 ${
              theme === "dark"
                ? "bg-gradient-to-br from-black/80 to-gray-900/90"
                : theme === "system"
                  ? "bg-gradient-to-br from-purple-900/80 to-indigo-900/90"
                  : "bg-gradient-to-br from-black/20 to-gray-600/30"
            }`}
          />
          <div
            className={`absolute inset-0 rounded-2xl blur-xl transform translate-y-4 scale-105 ${
              theme === "dark" ? "bg-black/60" : theme === "system" ? "bg-purple-900/60" : "bg-black/15"
            }`}
          />

          <div
            className={`relative backdrop-blur-3xl rounded-3xl border-2 p-2 md:p-3 shadow-2xl transform-gpu ${
              theme === "dark"
                ? "bg-gradient-to-br from-slate-800/40 via-slate-700/30 to-slate-900/50 border-white/10"
                : theme === "system"
                  ? "bg-gradient-to-br from-purple-800/40 via-indigo-800/30 to-slate-900/50 border-purple-300/20"
                  : "bg-gradient-to-br from-white/40 via-blue-50/30 to-indigo-100/40 border-white/40"
            }`}
            style={{
              transform: "perspective(1000px) rotateX(5deg)",
              transformStyle: "preserve-3d",
            }}
          >
            <div
              className={`backdrop-blur-2xl rounded-2xl border p-1.5 md:p-2 ${
                theme === "dark"
                  ? "bg-gradient-to-br from-amber-900/30 via-orange-900/20 to-red-900/30 border border-white/5"
                  : theme === "system"
                    ? "bg-gradient-to-br from-purple-800/30 via-indigo-800/20 to-slate-800/30 border border-purple-300/10"
                    : "bg-gradient-to-br from-amber-100/40 via-orange-100/30 to-red-100/40 border border-white/30"
              }`}
              style={{
                transform: "translateZ(10px)",
              }}
            >
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

      <div className="text-center space-y-2 md:space-y-3 px-1 md:px-2 pb-1 md:pb-2 relative z-10">
        <div
          className={`inline-flex items-center gap-2 md:gap-3 backdrop-blur-2xl rounded-full px-3 py-2 md:px-4 md:py-3 border shadow-xl min-h-[40px] md:min-h-[48px] min-w-[140px] md:min-w-[160px] justify-center ${
            theme === "dark"
              ? "bg-black/30 border-white/10"
              : theme === "system"
                ? "bg-purple-900/30 border-purple-300/20"
                : "bg-white/30 border-white/40"
          }`}
        >
          <div
            className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full flex-shrink-0 shadow-lg ${
              state.currentPlayer === "white"
                ? "bg-gradient-to-br from-gray-100 to-gray-300 border border-gray-400"
                : "bg-gradient-to-br from-gray-700 to-gray-900 border border-gray-600"
            }`}
          />
          <p
            className={`text-xs md:text-sm font-semibold whitespace-nowrap ${
              theme === "dark" ? "text-white/90" : theme === "system" ? "text-purple-100/90" : "text-black/90"
            }`}
          >
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
          <div
            className={`backdrop-blur-2xl border rounded-full px-3 py-2 md:px-4 md:py-3 shadow-xl animate-pulse min-h-[40px] md:min-h-[48px] flex items-center justify-center ${
              theme === "dark"
                ? "bg-gradient-to-r from-green-600/30 to-emerald-600/30 border-green-400/30 text-white"
                : theme === "system"
                  ? "bg-gradient-to-r from-green-500/30 to-emerald-500/30 border-green-300/30 text-white"
                  : "bg-gradient-to-r from-green-400/40 to-emerald-400/40 border-green-400/50 text-black"
            }`}
          >
            <p className="font-bold text-xs md:text-sm whitespace-nowrap">
              {state.gameStatus === "white-wins" && "Белые победили!"}
              {state.gameStatus === "black-wins" && "Черные победили!"}
              {state.gameStatus === "draw" && "Ничья!"}
            </p>
          </div>
        )}

        <div
          className={`backdrop-blur-2xl rounded-2xl border p-2 md:p-3 max-w-xs md:max-w-sm mx-auto min-h-[50px] md:min-h-[60px] ${
            theme === "dark"
              ? "bg-black/20 border-white/10"
              : theme === "system"
                ? "bg-purple-900/20 border-purple-300/20"
                : "bg-white/20 border-white/30"
          }`}
        >
          <p
            className={`text-xs mb-1 md:mb-2 ${
              theme === "dark" ? "text-white/60" : theme === "system" ? "text-purple-200/50" : "text-black/40"
            }`}
          >
            Взятые:
          </p>
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
              <p
                className={`text-xs italic ${
                  theme === "dark" ? "text-white/40" : theme === "system" ? "text-purple-200/50" : "text-black/40"
                }`}
              >
                Пока нет взятых фигур
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
