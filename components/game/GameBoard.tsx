"use client"
import { ArrowLeft, RotateCcw } from "lucide-react"
import type React from "react"

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
  const [swipeState, setSwipeState] = useState<{
    startPos: { x: number; y: number; row: number; col: number } | null
    isDragging: boolean
  }>({
    startPos: null,
    isDragging: false,
  })
  const [isProcessingMove, setIsProcessingMove] = useState(false)

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
    if (isAIThinking || isProcessingMove || (mode === "bot" && state.currentPlayer === "black")) return

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
          setIsProcessingMove(false)
          return
        }

        if (moveResult.newState.gameStatus !== "playing") {
          playSound("win")
          hapticFeedback("heavy")
        }
      }

      setTimeout(() => setIsProcessingMove(false), 100)
    }

    dispatch({ type: "SELECT_PIECE", piece: null })
    dispatch({ type: "SET_VALID_MOVES", moves: [] })
  }

  const handleBoardTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    const rect = e.currentTarget.getBoundingClientRect()
    const boardSize = Math.min(rect.width, rect.height)
    const squareSize = boardSize / 8

    // Определяем клетку по координатам касания
    const relativeX = touch.clientX - rect.left
    const relativeY = touch.clientY - rect.top
    const col = Math.floor(relativeX / squareSize)
    const row = Math.floor(relativeY / squareSize)

    if (row >= 0 && row < 8 && col >= 0 && col < 8) {
      const piece = state.board[row][col]

      // Если касание на шашке текущего игрока, начинаем отслеживание свайпа
      if (piece && piece.color === state.currentPlayer) {
        setSwipeState({
          startPos: { x: touch.clientX, y: touch.clientY, row, col },
          isDragging: true,
        })

        // Автоматически выбираем шашку
        if (!state.selectedPiece || state.selectedPiece.id !== piece.id) {
          dispatch({ type: "SELECT_PIECE", piece })
          const validMoves = GameLogic.getValidMoves(state.board, piece)
          dispatch({ type: "SET_VALID_MOVES", moves: validMoves })
          playSound("select")
          hapticFeedback("light")
        }
      }
    }
  }

  const handleBoardTouchMove = (e: React.TouchEvent) => {
    if (!swipeState.isDragging || !swipeState.startPos) return

    e.preventDefault() // Предотвращаем скролл страницы
  }

  const handleBoardTouchEnd = (e: React.TouchEvent) => {
    if (!swipeState.isDragging || !swipeState.startPos || !state.selectedPiece) {
      setSwipeState({ startPos: null, isDragging: false })
      return
    }

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - swipeState.startPos.x
    const deltaY = touch.clientY - swipeState.startPos.y
    const minSwipeDistance = 40

    // Проверяем, достаточно ли большое расстояние для свайпа
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    if (distance < minSwipeDistance) {
      setSwipeState({ startPos: null, isDragging: false })
      return
    }

    // Определяем направление свайпа (включая диагональные)
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)
    let targetRow = swipeState.startPos.row
    let targetCol = swipeState.startPos.col

    // Определяем целевую клетку на основе угла свайпа
    if (angle >= -22.5 && angle < 22.5) {
      // Вправо
      targetCol += 1
    } else if (angle >= 22.5 && angle < 67.5) {
      // Вправо-вниз (диагональ)
      targetCol += 1
      targetRow += 1
    } else if (angle >= 67.5 && angle < 112.5) {
      // Вниз
      targetRow += 1
    } else if (angle >= 112.5 && angle < 157.5) {
      // Влево-вниз (диагональ)
      targetCol -= 1
      targetRow += 1
    } else if (angle >= 157.5 || angle < -157.5) {
      // Влево
      targetCol -= 1
    } else if (angle >= -157.5 && angle < -112.5) {
      // Влево-вверх (диагональ)
      targetCol -= 1
      targetRow -= 1
    } else if (angle >= -112.5 && angle < -67.5) {
      // Вверх
      targetRow -= 1
    } else if (angle >= -67.5 && angle < -22.5) {
      // Вправо-вверх (диагональ)
      targetCol += 1
      targetRow -= 1
    }

    // Проверяем границы доски
    if (targetRow >= 0 && targetRow < 8 && targetCol >= 0 && targetCol < 8) {
      // Проверяем, является ли целевая клетка валидным ходом
      const isValidMove = state.validMoves.some((move) => move.row === targetRow && move.col === targetCol)

      if (isValidMove) {
        handleSquareClick(targetRow, targetCol)
        hapticFeedback("medium")
      } else {
        // Если ход невалиден, попробуем найти ближайший валидный ход в том же направлении
        const validMove = state.validMoves.find((move) => {
          const moveAngle =
            Math.atan2(move.row - swipeState.startPos!.row, move.col - swipeState.startPos!.col) * (180 / Math.PI)
          return Math.abs(moveAngle - angle) < 45 // В пределах 45 градусов от направления свайпа
        })

        if (validMove) {
          handleSquareClick(validMove.row, validMove.col)
          hapticFeedback("medium")
        } else {
          hapticFeedback("error")
        }
      }
    }

    setSwipeState({ startPos: null, isDragging: false })
  }

  const handleSwipe = (fromRow: number, fromCol: number, direction: "up" | "down" | "left" | "right") => {
    if (
      !state.selectedPiece ||
      state.selectedPiece.position.row !== fromRow ||
      state.selectedPiece.position.col !== fromCol
    ) {
      return
    }

    let newRow = fromRow
    let newCol = fromCol

    switch (direction) {
      case "up":
        newRow = Math.max(0, fromRow - 1)
        break
      case "down":
        newRow = Math.min(7, fromRow + 1)
        break
      case "left":
        newCol = Math.max(0, fromCol - 1)
        break
      case "right":
        newCol = Math.min(7, fromCol + 1)
        break
    }

    if (newRow !== fromRow || newCol !== fromCol) {
      handleSquareClick(newRow, newCol)
    }
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
          ? "bg-gradient-to-br from-gray-900 via-slate-900 to-black"
          : "bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30"
      }`}
      style={{
        paddingTop: "max(env(safe-area-inset-top), 120px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 30px)",
        paddingLeft: "max(env(safe-area-inset-left), 16px)",
        paddingRight: "max(env(safe-area-inset-right), 16px)",
        minHeight: "100vh",
        minHeight: "100dvh",
      }}
    >
      <div
        className={`absolute inset-0 ${
          theme === "dark"
            ? "bg-gradient-to-br from-blue-950/40 via-purple-950/30 to-pink-950/40"
            : "bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30"
        }`}
      />

      <div
        className={`absolute top-10 left-10 w-24 h-24 rounded-full blur-2xl animate-pulse backdrop-blur-3xl ${
          theme === "dark"
            ? "bg-gradient-to-br from-blue-600/40 to-purple-600/40"
            : "bg-gradient-to-br from-blue-400/20 to-purple-400/20"
        }`}
      />
      <div
        className={`absolute bottom-10 right-10 w-32 h-32 rounded-full blur-2xl animate-pulse delay-1000 backdrop-blur-3xl ${
          theme === "dark"
            ? "bg-gradient-to-br from-purple-600/40 to-pink-600/40"
            : "bg-gradient-to-br from-purple-400/20 to-pink-400/20"
        }`}
      />

      <div className="flex items-center justify-between mb-1 sm:mb-2 relative px-1 sm:px-2">
        <button
          onClick={onBackToMenu}
          className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl backdrop-blur-xl border transition-all duration-300 hover:scale-105 shadow-lg text-xs sm:text-sm ${
            theme === "dark"
              ? "bg-white/10 border-white/20 hover:bg-white/20 text-white/90"
              : "bg-black/20 border-black/30 hover:bg-black/30 text-black/80"
          }`}
        >
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="hidden xs:inline font-medium">Меню</span>
        </button>

        <div
          className={`text-center backdrop-blur-xl rounded-xl border px-2 sm:px-3 py-1 sm:py-1.5 shadow-lg ${
            theme === "dark" ? "bg-black/30 border-white/20" : "bg-white/20 border-white/30"
          }`}
        >
          <h2
            className={`font-bold text-xs sm:text-sm bg-gradient-to-r bg-clip-text text-transparent ${
              theme === "dark" ? "from-blue-400 to-purple-400" : "from-blue-600 to-purple-600"
            }`}
          >
            StarCheckers
          </h2>
          <p className={`text-xs ${theme === "dark" ? "text-white/70" : "text-black/70"}`}>
            {mode === "bot" &&
              `ИИ (${difficulty === "easy" ? "Легко" : difficulty === "medium" ? "Средне" : "Сложно"})`}
            {mode === "local" && "Локальная игра"}
            {mode === "online" && "Онлайн"}
          </p>
        </div>

        <button
          onClick={resetGame}
          className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl backdrop-blur-xl border transition-all duration-300 hover:scale-105 shadow-lg ${
            theme === "dark"
              ? "bg-white/10 border-white/20 hover:bg-white/20 text-white/90"
              : "bg-black/20 border-black/30 hover:bg-black/30 text-black/80"
          }`}
        >
          <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-1 sm:px-2">
        <div className="relative w-full max-w-[min(80vw,70vh,400px)] aspect-square">
          <div
            className={`absolute inset-0 rounded-2xl blur-2xl transform translate-y-4 scale-105 ${
              theme === "dark"
                ? "bg-gradient-to-br from-black/60 to-gray-900/80"
                : "bg-gradient-to-br from-black/30 to-black/50"
            }`}
          />
          <div
            className={`absolute inset-0 rounded-xl blur-lg transform translate-y-2 scale-102 ${
              theme === "dark" ? "bg-black/40" : "bg-black/20"
            }`}
          />

          <div
            className={`relative backdrop-blur-2xl rounded-2xl border p-1 sm:p-2 shadow-2xl ${
              theme === "dark" ? "bg-black/40 border-white/20" : "bg-white/20 border-white/30"
            }`}
            onTouchStart={handleBoardTouchStart}
            onTouchMove={handleBoardTouchMove}
            onTouchEnd={handleBoardTouchEnd}
          >
            <div
              className={`backdrop-blur-xl rounded-xl border p-0.5 sm:p-1 ${
                theme === "dark"
                  ? "bg-gradient-to-br from-amber-900/40 to-orange-900/40 border-white/10"
                  : "bg-gradient-to-br from-amber-100/30 to-orange-100/30 border-white/20"
              }`}
            >
              <div className="grid grid-cols-8 gap-0 w-full h-full rounded-lg overflow-hidden shadow-inner">
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
                      onSwipe={(direction) => handleSwipe(rowIndex, colIndex, direction)}
                    />
                  )),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center space-y-1 px-1 sm:px-2 pb-1">
        <div
          className={`inline-flex items-center gap-2 backdrop-blur-xl rounded-full px-3 py-1.5 border shadow-lg ${
            theme === "dark" ? "bg-black/30 border-white/20" : "bg-white/20 border-white/30"
          }`}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              state.currentPlayer === "white"
                ? "bg-gradient-to-br from-gray-100 to-gray-300 border border-gray-400"
                : "bg-gradient-to-br from-gray-700 to-gray-900 border border-gray-600"
            }`}
          />
          <p className={`text-xs font-semibold ${theme === "dark" ? "text-white/90" : "text-black/90"}`}>
            {isAIThinking ? (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                Бот думает...
              </span>
            ) : (
              `Ход: ${state.currentPlayer === "white" ? "Белые" : "Черные"}`
            )}
          </p>
        </div>

        {state.gameStatus !== "playing" && (
          <div
            className={`backdrop-blur-xl border rounded-full px-3 py-1.5 shadow-lg animate-pulse ${
              theme === "dark"
                ? "bg-gradient-to-r from-green-600/40 to-emerald-600/40 border-green-400/40 text-white"
                : "bg-gradient-to-r from-green-400/30 to-emerald-400/30 border-green-400/40 text-black"
            }`}
          >
            <p className="font-bold text-xs">
              {state.gameStatus === "white-wins" && "Белые победили!"}
              {state.gameStatus === "black-wins" && "Черные победили!"}
              {state.gameStatus === "draw" && "Ничья!"}
            </p>
          </div>
        )}

        {state.capturedPieces.length > 0 && (
          <div
            className={`backdrop-blur-xl rounded-xl border p-1.5 max-w-xs mx-auto ${
              theme === "dark" ? "bg-black/20 border-white/10" : "bg-white/5 border-white/10"
            }`}
          >
            <p className={`text-xs mb-1 ${theme === "dark" ? "text-white/70" : "text-black/70"}`}>Взятые:</p>
            <div className="flex justify-center gap-0.5 flex-wrap">
              {state.capturedPieces.map((piece, index) => (
                <div
                  key={`captured-${piece.id}-${index}`}
                  className={`w-3 h-3 rounded-full border backdrop-blur-xl ${
                    piece.color === "white"
                      ? "bg-gradient-to-br from-gray-100/80 to-gray-300/80 border-gray-300"
                      : "bg-gradient-to-br from-gray-700/80 to-gray-900/80 border-gray-600"
                  } ${piece.type === "king" ? "ring-1 ring-yellow-400/50" : ""}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
