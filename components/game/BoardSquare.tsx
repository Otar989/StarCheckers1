"use client"
import { useState } from "react"
import type React from "react"

import { useTheme } from "@/hooks/use-theme"

import type { Piece } from "./GameProvider"

interface BoardSquareProps {
  row: number
  col: number
  piece: Piece | null
  isSelected: boolean
  isValidMove: boolean
  onClick: () => void
  onSwipe?: (direction: "up" | "down" | "left" | "right") => void
  onDragStart?: (row: number, col: number) => void
  onDragOver?: (row: number, col: number) => void
  onDrop?: (row: number, col: number) => void
  isDragTarget?: boolean
  animatingPiece?: {
    from: { row: number; col: number }
    to: { row: number; col: number }
    piece: Piece
  } | null
}

export function BoardSquare({
  row,
  col,
  piece,
  isSelected,
  isValidMove,
  onClick,
  onSwipe,
  onDragStart,
  onDragOver,
  onDrop,
  isDragTarget,
  animatingPiece,
}: BoardSquareProps) {
  const [isPressed, setIsPressed] = useState(false)
  const { theme } = useTheme()
  const isDarkSquare = (row + col) % 2 === 1
  const isDarkTheme = theme === "dark"
  const isSystemTheme = theme === "system"

  const handleTouch = (e: React.TouchEvent) => {
    e.preventDefault()
    onClick()
  }

  const getSquareColors = () => {
    if (isSystemTheme) {
      return isDarkSquare
        ? "bg-gradient-to-br from-indigo-500/80 via-purple-400/60 to-violet-500/90 border-2 border-indigo-400/50 shadow-xl shadow-indigo-500/30"
        : "bg-gradient-to-br from-indigo-200/95 via-purple-100/80 to-violet-200/95 border-2 border-indigo-300/60 shadow-xl shadow-indigo-300/40"
    }
    return isDarkSquare
      ? isDarkTheme
        ? "bg-gradient-to-br from-slate-700/90 via-slate-600/70 to-slate-800/95 border-2 border-slate-500/40 shadow-xl shadow-slate-600/40"
        : "bg-gradient-to-br from-amber-500/95 via-orange-400/80 to-red-500/95 border-2 border-amber-400/70 shadow-xl shadow-amber-500/50"
      : isDarkTheme
        ? "bg-gradient-to-br from-slate-500/70 via-slate-400/50 to-slate-600/85 border-2 border-slate-400/30 shadow-xl shadow-slate-400/30"
        : "bg-gradient-to-br from-amber-100/95 via-yellow-100/90 to-orange-100/95 border-2 border-amber-300/80 shadow-xl shadow-amber-300/60"
  }

  const getPiecePattern = (pieceColor: "white" | "black") => {
    const baseClasses = "border-4 shadow-2xl"
    const backdropFallback = "bg-opacity-95" // Fallback for devices without backdrop-filter support

    if (isSystemTheme) {
      return pieceColor === "white"
        ? `${baseClasses} ${backdropFallback} bg-gradient-to-br from-white/98 via-indigo-100/95 to-purple-200/98 border-indigo-300/90 shadow-indigo-300/60`
        : `${baseClasses} ${backdropFallback} bg-gradient-to-br from-indigo-800/98 via-purple-900/95 to-violet-950/98 border-indigo-700/90 shadow-indigo-900/80`
    } else if (isDarkTheme) {
      return pieceColor === "white"
        ? `${baseClasses} ${backdropFallback} bg-gradient-to-br from-white/98 via-slate-100/95 to-gray-200/98 border-slate-300/90 shadow-white/50`
        : `${baseClasses} ${backdropFallback} bg-gradient-to-br from-slate-800/98 via-slate-900/95 to-slate-950/98 border-slate-700/90 shadow-slate-900/80`
    } else {
      return pieceColor === "white"
        ? `${baseClasses} ${backdropFallback} bg-gradient-to-br from-white/98 via-blue-100/95 to-indigo-200/98 border-blue-300/90 shadow-blue-300/60`
        : `${baseClasses} ${backdropFallback} bg-gradient-to-br from-slate-800/98 via-slate-900/95 to-slate-950/98 border-slate-700/90 shadow-slate-900/80`
    }
  }

  return (
    <div
      className={`
        aspect-square flex items-center justify-center relative cursor-pointer
        select-none overflow-hidden transition-all duration-300 ease-out transform-gpu
        ${getSquareColors()}
        ${isSelected ? "ring-4 ring-cyan-400/95 ring-inset shadow-2xl shadow-cyan-400/70 scale-110 z-20" : ""}
        ${isValidMove ? "ring-4 ring-emerald-400/95 ring-inset shadow-2xl shadow-emerald-400/70 scale-105" : ""}
        ${isDragTarget ? "ring-4 ring-yellow-400/95 ring-inset shadow-2xl shadow-yellow-400/70 scale-110" : ""}
        ${isPressed ? "scale-95 shadow-inner" : "hover:scale-105 active:scale-95"}
      `}
      onClick={onClick}
      onTouchEnd={handleTouch}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      style={{
        minHeight: "40px",
        minWidth: "40px",
        touchAction: "manipulation",
        transform: "perspective(1000px) rotateX(3deg)",
        transformStyle: "preserve-3d",
        WebkitTransform: "perspective(1000px) rotateX(3deg)",
        WebkitTransformStyle: "preserve-3d",
      }}
    >
      <div className="absolute inset-0 rounded-sm overflow-hidden">
        <div
          className={`
            absolute inset-0 transition-all duration-300 ease-out
            ${
              isSystemTheme
                ? "bg-gradient-to-br from-white/70 via-purple-100/30 to-purple-200/25 shadow-inner"
                : isDarkTheme
                  ? "bg-gradient-to-br from-white/25 via-slate-200/10 to-black/30 shadow-inner"
                  : "bg-gradient-to-br from-white/95 via-amber-50/20 to-black/25 shadow-inner"
            }
          `}
          style={{
            transform: "translateZ(3px)",
            WebkitTransform: "translateZ(3px)",
          }}
        />

        <div
          className={`
            absolute top-0 left-0 w-full h-1/3 transition-all duration-300 ease-out
            ${
              isSystemTheme
                ? "bg-gradient-to-b from-white/85 to-transparent"
                : isDarkTheme
                  ? "bg-gradient-to-b from-white/35 to-transparent"
                  : "bg-gradient-to-b from-white/98 to-transparent"
            }
          `}
          style={{
            transform: "translateZ(2px)",
            WebkitTransform: "translateZ(2px)",
          }}
        />

        <div
          className={`
            absolute top-0 left-0 w-1/3 h-full transition-all duration-300 ease-out
            ${
              isSystemTheme
                ? "bg-gradient-to-r from-white/60 to-transparent"
                : isDarkTheme
                  ? "bg-gradient-to-r from-white/25 to-transparent"
                  : "bg-gradient-to-r from-white/90 to-transparent"
            }
          `}
          style={{
            transform: "translateZ(1px)",
            WebkitTransform: "translateZ(1px)",
          }}
        />
      </div>

      {isValidMove && !piece && (
        <div
          className="relative transform-gpu"
          style={{
            transform: "translateZ(25px)",
            WebkitTransform: "translateZ(25px)",
          }}
        >
          <div
            className={`
            w-6 h-6 rounded-full border-4 shadow-2xl animate-bounce
            transition-all duration-300 ease-out relative overflow-hidden
            ${
              isSystemTheme
                ? "bg-gradient-to-br from-emerald-400/98 to-teal-500/98 border-emerald-300/95 shadow-emerald-400/90"
                : isDarkTheme
                  ? "bg-gradient-to-br from-emerald-500/95 to-teal-600/95 border-emerald-400/90 shadow-emerald-500/80"
                  : "bg-gradient-to-br from-emerald-500/98 to-teal-600/98 border-emerald-400/95 shadow-emerald-500/90"
            }
          `}
          >
            <div className="absolute inset-0 rounded-full bg-emerald-400/70 animate-ping" />
            <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/80 to-transparent" />
            <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-white/90 blur-sm" />
          </div>
        </div>
      )}

      {piece && (
        <div
          className={`relative group transform-gpu ${piece.color === "white" ? "w-3/4 h-3/4" : "w-4/5 h-4/5"}`}
          style={{
            transform: `translateZ(30px) ${isSelected ? "scale(1.2)" : "scale(1)"}`,
            WebkitTransform: `translateZ(30px) ${isSelected ? "scale(1.2)" : "scale(1)"}`,
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div
            className={`
              w-full h-full rounded-full relative transition-all duration-300 ease-out transform-gpu
              ${getPiecePattern(piece.color)}
              hover:scale-110 group-hover:shadow-3xl
            `}
          >
            <div
              className={`absolute inset-1 rounded-full transition-all duration-300 ease-out ${
                piece.color === "white"
                  ? "bg-gradient-to-br from-white/80 via-white/50 to-transparent shadow-inner"
                  : "bg-gradient-to-br from-white/90 via-white/60 to-transparent shadow-inner"
              }`}
            />

            <div
              className={`absolute top-1 left-1 rounded-full blur-sm transition-all duration-300 ease-out ${
                piece.color === "white" ? "w-1/3 h-1/3 bg-white/85" : "w-2/5 h-2/5 bg-white/95"
              }`}
            />

            <div
              className={`absolute top-2 right-1 rounded-full blur-sm transition-all duration-300 ease-out ${
                piece.color === "white" ? "w-1/4 h-1/4 bg-white/70" : "w-1/3 h-1/3 bg-white/85"
              }`}
            />

            <div className="absolute inset-3 rounded-full opacity-80 transition-all duration-300 ease-out">
              <div
                className={`w-full h-full rounded-full transition-all duration-300 ease-out border-2 shadow-inner ${
                  isSystemTheme
                    ? piece.color === "white"
                      ? "bg-gradient-to-br from-purple-300/85 to-indigo-400/85 border-purple-400/70"
                      : "bg-gradient-to-br from-indigo-500/85 to-purple-600/85 border-indigo-600/70"
                    : isDarkTheme
                      ? piece.color === "white"
                        ? "bg-gradient-to-br from-blue-300/80 to-purple-300/80 border-blue-400/60"
                        : "bg-gradient-to-br from-slate-400/80 to-slate-600/80 border-slate-500/60"
                      : piece.color === "white"
                        ? "bg-gradient-to-br from-blue-400/85 to-purple-400/85 border-blue-500/70"
                        : "bg-gradient-to-br from-amber-500/85 to-orange-600/85 border-amber-600/70"
                }`}
              />

              {isSystemTheme && (
                <>
                  <div className="absolute inset-1 rounded-full border-2 border-white/60">
                    <div className="absolute inset-1 rounded-full border border-white/40" />
                  </div>
                </>
              )}
            </div>

            {piece.type === "king" && (
              <div
                className="absolute inset-0 flex items-center justify-center transform-gpu transition-all duration-300 ease-out"
                style={{
                  transform: "translateZ(20px)",
                  WebkitTransform: "translateZ(20px)",
                }}
              >
                <div
                  className={`w-7 h-7 drop-shadow-2xl transition-all duration-300 ease-out relative ${
                    isSystemTheme ? "text-purple-500" : isDarkTheme ? "text-yellow-400" : "text-yellow-600"
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-radial from-yellow-500/95 to-yellow-700/95 rounded-full animate-pulse shadow-xl" />
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-full h-full relative z-10 filter drop-shadow-xl transition-all duration-300 ease-out"
                  >
                    <path d="M12 6L13.13 8.09L15.5 7.5L14.5 9.96L17 11L14.5 12.04L15.5 14.5L13.13 13.91L12 16L10.87 13.91L8.5 14.5L9.5 12.04L8.5 7.5L10.87 8.09L12 6Z" />
                  </svg>
                  <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-white/95 blur-sm" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isSelected && (
        <div
          className="absolute inset-0 bg-gradient-radial from-cyan-500/70 via-cyan-400/50 to-transparent animate-pulse rounded-sm pointer-events-none transition-all duration-300 ease-out shadow-xl"
          style={{
            transform: "translateZ(15px)",
            WebkitTransform: "translateZ(15px)",
          }}
        />
      )}

      {isValidMove && (
        <div
          className="absolute inset-0 bg-gradient-radial from-emerald-500/70 via-emerald-400/50 to-transparent animate-pulse rounded-sm pointer-events-none transition-all duration-300 ease-out shadow-xl"
          style={{
            transform: "translateZ(15px)",
            WebkitTransform: "translateZ(15px)",
          }}
        />
      )}
    </div>
  )
}
