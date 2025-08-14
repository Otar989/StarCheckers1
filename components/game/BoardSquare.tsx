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
        ? "bg-gradient-to-br from-indigo-400/60 via-purple-300/40 to-violet-400/70 border border-indigo-300/30"
        : "bg-gradient-to-br from-indigo-100/80 via-purple-50/60 to-violet-100/90 border border-indigo-200/40"
    }
    return isDarkSquare
      ? isDarkTheme
        ? "bg-gradient-to-br from-slate-600/70 via-slate-500/50 to-slate-700/80 border border-slate-400/20"
        : "bg-gradient-to-br from-amber-400/80 via-orange-300/70 to-red-400/90 border border-amber-300/50"
      : isDarkTheme
        ? "bg-gradient-to-br from-slate-400/50 via-slate-300/30 to-slate-500/70 border border-slate-300/15"
        : "bg-gradient-to-br from-amber-50/90 via-yellow-50/80 to-orange-50/95 border border-amber-200/60"
  }

  const getPiecePattern = (pieceColor: "white" | "black") => {
    const baseClasses = "backdrop-blur-2xl border-2 shadow-2xl"

    if (isSystemTheme) {
      return pieceColor === "white"
        ? `${baseClasses} bg-gradient-to-br from-white/95 via-indigo-50/90 to-purple-100/95 border-indigo-200/70 shadow-indigo-200/40`
        : `${baseClasses} bg-gradient-to-br from-indigo-700/95 via-purple-800/90 to-violet-900/95 border-indigo-600/70 shadow-indigo-900/60`
    } else if (isDarkTheme) {
      return pieceColor === "white"
        ? `${baseClasses} bg-gradient-to-br from-white/95 via-slate-50/90 to-gray-100/95 border-slate-200/70 shadow-white/30`
        : `${baseClasses} bg-gradient-to-br from-slate-700/95 via-slate-800/90 to-slate-900/95 border-slate-600/70 shadow-slate-900/60`
    } else {
      return pieceColor === "white"
        ? `${baseClasses} bg-gradient-to-br from-white/95 via-blue-50/90 to-indigo-100/95 border-blue-200/70 shadow-blue-200/40`
        : `${baseClasses} bg-gradient-to-br from-slate-700/95 via-slate-800/90 to-slate-900/95 border-slate-600/70 shadow-slate-900/60`
    }
  }

  return (
    <div
      className={`
        aspect-square flex items-center justify-center relative cursor-pointer
        select-none overflow-hidden transition-all duration-300 ease-out transform-gpu
        backdrop-blur-xl
        ${getSquareColors()}
        ${isSelected ? "ring-4 ring-cyan-400/90 ring-inset shadow-2xl shadow-cyan-400/50 scale-110 z-20" : ""}
        ${isValidMove ? "ring-4 ring-emerald-400/90 ring-inset shadow-2xl shadow-emerald-400/50 scale-105" : ""}
        ${isDragTarget ? "ring-4 ring-yellow-400/90 ring-inset shadow-2xl shadow-yellow-400/50 scale-110" : ""}
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
      }}
    >
      <div className="absolute inset-0 rounded-sm overflow-hidden">
        {/* Primary glass surface */}
        <div
          className={`
            absolute inset-0 transition-all duration-300 ease-out
            ${
              isSystemTheme
                ? "bg-gradient-to-br from-white/50 via-transparent to-purple/15"
                : isDarkTheme
                  ? "bg-gradient-to-br from-white/12 via-transparent to-black/20"
                  : "bg-gradient-to-br from-white/90 via-transparent to-black/20"
            }
          `}
          style={{ transform: "translateZ(3px)" }}
        />

        {/* Top highlight */}
        <div
          className={`
            absolute top-0 left-0 w-full h-1/3 transition-all duration-300 ease-out
            ${
              isSystemTheme
                ? "bg-gradient-to-b from-white/70 to-transparent"
                : isDarkTheme
                  ? "bg-gradient-to-b from-white/20 to-transparent"
                  : "bg-gradient-to-b from-white/95 to-transparent"
            }
          `}
          style={{ transform: "translateZ(2px)" }}
        />

        {/* Side reflection */}
        <div
          className={`
            absolute top-0 left-0 w-1/3 h-full transition-all duration-300 ease-out
            ${
              isSystemTheme
                ? "bg-gradient-to-r from-white/40 to-transparent"
                : isDarkTheme
                  ? "bg-gradient-to-r from-white/15 to-transparent"
                  : "bg-gradient-to-r from-white/80 to-transparent"
            }
          `}
          style={{ transform: "translateZ(1px)" }}
        />
      </div>

      {isValidMove && !piece && (
        <div className="relative transform-gpu" style={{ transform: "translateZ(25px)" }}>
          <div
            className={`
            w-6 h-6 rounded-full backdrop-blur-3xl border-2 shadow-2xl animate-bounce
            transition-all duration-300 ease-out relative overflow-hidden
            ${
              isSystemTheme
                ? "bg-gradient-to-br from-emerald-300/95 to-teal-400/95 border-emerald-200/90 shadow-emerald-300/80"
                : isDarkTheme
                  ? "bg-gradient-to-br from-emerald-400/90 to-teal-500/90 border-emerald-300/80 shadow-emerald-400/70"
                  : "bg-gradient-to-br from-emerald-400/95 to-teal-500/95 border-emerald-300/90 shadow-emerald-400/80"
            }
          `}
          >
            {/* Inner glow */}
            <div className="absolute inset-0 rounded-full bg-emerald-400/50 animate-ping" />
            <div
              className="absolute inset-1 rounded-full bg-gradient-to-br from-white/70 to-transparent"
              style={{ borderRadius: "50%" }}
            />
            {/* Glass highlight */}
            <div
              className="absolute top-1 left-1 w-2 h-2 rounded-full bg-white/80 blur-sm"
              style={{ borderRadius: "50%" }}
            />
          </div>
        </div>
      )}

      {piece && (
        <div
          className={`relative group transform-gpu ${piece.color === "white" ? "w-3/4 h-3/4" : "w-4/5 h-4/5"}`}
          style={{
            transform: `translateZ(30px) ${isSelected ? "scale(1.2)" : "scale(1)"}`,
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div
            className={`
              w-full h-full rounded-full relative transition-all duration-300 ease-out transform-gpu
              ${getPiecePattern(piece.color)}
              hover:scale-110 group-hover:shadow-3xl
            `}
            style={{
              borderRadius: "50%",
              aspectRatio: "1",
            }}
          >
            {/* Primary highlight */}
            <div
              className={`absolute inset-1 rounded-full transition-all duration-300 ease-out ${
                piece.color === "white"
                  ? "bg-gradient-to-br from-white/60 via-white/30 to-transparent"
                  : "bg-gradient-to-br from-white/80 via-white/40 to-transparent"
              }`}
              style={{ borderRadius: "50%" }}
            />

            {/* Top shine */}
            <div
              className={`absolute top-1 left-1 rounded-full blur-sm transition-all duration-300 ease-out ${
                piece.color === "white" ? "w-1/3 h-1/3 bg-white/70" : "w-2/5 h-2/5 bg-white/90"
              }`}
              style={{ borderRadius: "50%" }}
            />

            {/* Side reflection */}
            <div
              className={`absolute top-2 right-1 rounded-full blur-sm transition-all duration-300 ease-out ${
                piece.color === "white" ? "w-1/4 h-1/4 bg-white/50" : "w-1/3 h-1/3 bg-white/70"
              }`}
              style={{ borderRadius: "50%" }}
            />

            {/* Inner pattern with glass effect */}
            <div
              className="absolute inset-3 rounded-full opacity-70 transition-all duration-300 ease-out backdrop-blur-sm"
              style={{ borderRadius: "50%" }}
            >
              <div
                className={`w-full h-full rounded-full transition-all duration-300 ease-out border ${
                  isSystemTheme
                    ? piece.color === "white"
                      ? "bg-gradient-to-br from-purple-200/70 to-indigo-300/70 border-purple-300/50"
                      : "bg-gradient-to-br from-indigo-400/70 to-purple-500/70 border-indigo-500/50"
                    : isDarkTheme
                      ? piece.color === "white"
                        ? "bg-gradient-to-br from-blue-200/60 to-purple-200/60 border-blue-300/40"
                        : "bg-gradient-to-br from-slate-300/60 to-slate-500/60 border-slate-400/40"
                      : piece.color === "white"
                        ? "bg-gradient-to-br from-blue-300/70 to-purple-300/70 border-blue-400/50"
                        : "bg-gradient-to-br from-amber-400/70 to-orange-500/70 border-amber-500/50"
                }`}
                style={{ borderRadius: "50%" }}
              />

              {/* Concentric rings for system theme */}
              {isSystemTheme && (
                <>
                  <div className="absolute inset-1 rounded-full border border-white/40" style={{ borderRadius: "50%" }}>
                    <div
                      className="absolute inset-1 rounded-full border border-white/25"
                      style={{ borderRadius: "50%" }}
                    />
                  </div>
                </>
              )}
            </div>

            {piece.type === "king" && (
              <div
                className="absolute inset-0 flex items-center justify-center transform-gpu transition-all duration-300 ease-out"
                style={{ transform: "translateZ(20px)" }}
              >
                <div
                  className={`w-7 h-7 drop-shadow-2xl transition-all duration-300 ease-out relative ${
                    isSystemTheme ? "text-purple-400" : isDarkTheme ? "text-yellow-300" : "text-yellow-500"
                  }`}
                >
                  {/* Crown glow */}
                  <div className="absolute inset-0 bg-gradient-radial from-yellow-400/90 to-yellow-600/90 rounded-full backdrop-blur-sm animate-pulse" />

                  {/* Crown icon */}
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-full h-full relative z-10 filter drop-shadow-lg transition-all duration-300 ease-out"
                  >
                    <path d="M12 6L13.13 8.09L15.5 7.5L14.5 9.96L17 11L14.5 12.04L15.5 14.5L13.13 13.91L12 16L10.87 13.91L8.5 14.5L9.5 12.04L8.5 7.5L10.87 8.09L12 6Z" />
                  </svg>

                  {/* Crown highlight */}
                  <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-white/80 blur-sm" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isSelected && (
        <div
          className="absolute inset-0 bg-gradient-radial from-cyan-400/50 via-cyan-300/30 to-transparent backdrop-blur-sm animate-pulse rounded-sm pointer-events-none transition-all duration-300 ease-out"
          style={{ transform: "translateZ(15px)" }}
        />
      )}

      {isValidMove && (
        <div
          className="absolute inset-0 bg-gradient-radial from-emerald-400/50 via-emerald-300/30 to-transparent backdrop-blur-sm animate-pulse rounded-sm pointer-events-none transition-all duration-300 ease-out"
          style={{ transform: "translateZ(15px)" }}
        />
      )}
    </div>
  )
}
