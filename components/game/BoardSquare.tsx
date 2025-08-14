"use client"
import { useState } from "react"
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

  const handleClick = () => {
    onClick()
  }

  return (
    <div
      className={`
        aspect-square flex items-center justify-center relative cursor-pointer
        select-none overflow-hidden transition-all duration-300 transform-gpu
        ${
          isDarkSquare
            ? isDarkTheme
              ? "bg-gradient-to-br from-slate-700/80 via-slate-600/60 to-slate-800/90"
              : "bg-gradient-to-br from-amber-200/80 via-orange-100/60 to-red-200/90"
            : isDarkTheme
              ? "bg-gradient-to-br from-slate-500/60 via-slate-400/40 to-slate-600/80"
              : "bg-gradient-to-br from-amber-50/90 via-yellow-50/70 to-orange-50/90"
        }
        backdrop-blur-xl border
        ${
          isDarkSquare
            ? isDarkTheme
              ? "border-slate-600/40 shadow-inner shadow-slate-900/30"
              : "border-orange-300/50 shadow-inner shadow-orange-400/20"
            : isDarkTheme
              ? "border-slate-500/30 shadow-inner shadow-slate-800/20"
              : "border-yellow-200/60 shadow-inner shadow-yellow-300/20"
        }
        ${isSelected ? "ring-4 ring-cyan-400/80 ring-inset shadow-2xl shadow-cyan-400/40 scale-105 z-10" : ""}
        ${isValidMove ? "ring-4 ring-emerald-400/80 ring-inset shadow-2xl shadow-emerald-400/40" : ""}
        ${isDragTarget ? "ring-4 ring-yellow-400/80 ring-inset shadow-2xl shadow-yellow-400/40 scale-105" : ""}
        ${isPressed ? "scale-95 shadow-inner" : "hover:scale-102 active:scale-95"}
      `}
      onClick={handleClick}
      onTouchEnd={(e) => {
        e.currentTarget.click()
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      style={{
        minHeight: "40px",
        minWidth: "40px",
        touchAction: "manipulation",
        transform: "perspective(800px) rotateX(2deg)",
        transformStyle: "preserve-3d",
      }}
    >
      {/* Square 3D effects */}
      <div className="absolute inset-0 rounded-sm overflow-hidden">
        <div
          className={`
            absolute inset-0 
            ${
              isDarkTheme
                ? "bg-gradient-to-br from-white/8 via-transparent to-black/15"
                : "bg-gradient-to-br from-white/60 via-transparent to-black/8"
            }
          `}
          style={{ transform: "translateZ(2px)" }}
        />
        <div
          className={`
            absolute top-0 left-0 w-full h-1/2 
            ${
              isDarkTheme
                ? "bg-gradient-to-b from-white/15 to-transparent"
                : "bg-gradient-to-b from-white/80 to-transparent"
            }
          `}
          style={{ transform: "translateZ(1px)" }}
        />
      </div>

      {/* Valid move indicator */}
      {isValidMove && !piece && (
        <div className="relative transform-gpu" style={{ transform: "translateZ(20px)" }}>
          <div
            className={`
            w-5 h-5 rounded-full backdrop-blur-2xl border-2 shadow-2xl animate-bounce
            ${
              isDarkTheme
                ? "bg-gradient-to-br from-emerald-400/90 to-teal-500/90 border-emerald-300/80 shadow-emerald-400/60"
                : "bg-gradient-to-br from-emerald-300/95 to-teal-400/95 border-emerald-200/90 shadow-emerald-300/70"
            }
          `}
          />
          <div className="absolute inset-0 w-5 h-5 rounded-full bg-emerald-400/40 animate-ping" />
          <div
            className="absolute inset-1 rounded-full bg-gradient-to-br from-white/60 to-transparent"
            style={{ borderRadius: "50%" }}
          />
        </div>
      )}

      {/* Game piece */}
      {piece && (
        <div
          className={`relative w-4/5 h-4/5 group transform-gpu`}
          style={{
            transform: `translateZ(25px) ${isSelected ? "scale(1.15)" : "scale(1)"}`,
            transition: "all 0.3s ease",
          }}
        >
          <div
            className={`
              w-full h-full rounded-full relative transition-all duration-300 transform-gpu
              ${
                piece.color === "white"
                  ? isDarkTheme
                    ? "bg-gradient-to-br from-slate-50/98 via-white/95 to-slate-100/98 shadow-2xl shadow-white/30"
                    : "bg-gradient-to-br from-white/98 via-blue-50/95 to-indigo-50/98 shadow-2xl shadow-indigo-200/40"
                  : isDarkTheme
                    ? "bg-gradient-to-br from-slate-600/98 via-slate-700/95 to-slate-800/98 shadow-2xl shadow-slate-900/60"
                    : "bg-gradient-to-br from-slate-500/98 via-slate-600/95 to-slate-700/98 shadow-2xl shadow-slate-700/50"
              }
              backdrop-blur-2xl hover:scale-110 border-2
              ${
                piece.color === "white"
                  ? isDarkTheme
                    ? "border-slate-200/60"
                    : "border-indigo-200/80"
                  : isDarkTheme
                    ? "border-slate-500/60"
                    : "border-slate-400/80"
              }
            `}
            style={{
              borderRadius: "50%",
              aspectRatio: "1",
              boxShadow:
                piece.color === "white"
                  ? isDarkTheme
                    ? "0 15px 50px rgba(255,255,255,0.2), inset 0 5px 15px rgba(255,255,255,0.3)"
                    : "0 15px 50px rgba(99,102,241,0.25), inset 0 5px 15px rgba(255,255,255,0.4)"
                  : isDarkTheme
                    ? "0 15px 50px rgba(0,0,0,0.5), inset 0 5px 15px rgba(255,255,255,0.15)"
                    : "0 15px 50px rgba(0,0,0,0.35), inset 0 5px 15px rgba(255,255,255,0.2)",
            }}
          >
            {/* Piece highlight */}
            <div
              className="absolute inset-1 rounded-full bg-gradient-to-br from-white/70 via-white/30 to-transparent"
              style={{ borderRadius: "50%" }}
            />
            <div
              className="absolute top-1 left-1 w-1/3 h-1/3 rounded-full bg-white/80 blur-sm"
              style={{ borderRadius: "50%" }}
            />

            {/* Piece inner pattern */}
            <div className="absolute inset-2 rounded-full opacity-40" style={{ borderRadius: "50%" }}>
              <div
                className={`w-full h-full rounded-full ${
                  piece.color === "white"
                    ? "bg-gradient-to-br from-blue-200/50 to-purple-200/50"
                    : "bg-gradient-to-br from-slate-300/50 to-slate-500/50"
                }`}
                style={{ borderRadius: "50%" }}
              />
            </div>

            {/* King crown */}
            {piece.type === "king" && (
              <div
                className="absolute inset-0 flex items-center justify-center transform-gpu"
                style={{ transform: "translateZ(15px)" }}
              >
                <div className={`w-6 h-6 drop-shadow-2xl ${isDarkTheme ? "text-yellow-300" : "text-yellow-500"}`}>
                  <div className="absolute inset-0 bg-gradient-radial from-yellow-400/80 to-yellow-600/80 rounded-full backdrop-blur-sm animate-pulse" />
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-full h-full relative z-10 filter drop-shadow-lg"
                  >
                    <path d="M12 6L13.13 8.09L15.5 7.5L14.5 9.96L17 11L14.5 12.04L15.5 14.5L13.13 13.91L12 16L10.87 13.91L8.5 14.5L9.5 12.04L8.5 7.5L10.87 8.09L12 6Z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selection glow */}
      {isSelected && (
        <div
          className="absolute inset-0 bg-gradient-radial from-cyan-400/40 via-cyan-300/25 to-transparent backdrop-blur-sm animate-pulse rounded-sm pointer-events-none"
          style={{ transform: "translateZ(10px)" }}
        />
      )}

      {/* Valid move glow */}
      {isValidMove && (
        <div
          className="absolute inset-0 bg-gradient-radial from-emerald-400/40 via-emerald-300/25 to-transparent backdrop-blur-sm animate-pulse rounded-sm pointer-events-none"
          style={{ transform: "translateZ(10px)" }}
        />
      )}
    </div>
  )
}
