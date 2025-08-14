"use client"
import { useState, useEffect } from "react"
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
  const [justCaptured, setJustCaptured] = useState(false)
  const [justMoved, setJustMoved] = useState(false)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null)
  const { theme } = useTheme()
  const isDarkSquare = (row + col) % 2 === 1
  const isDarkTheme = theme === "dark"

  useEffect(() => {
    if (!piece && justCaptured) {
      const timer = setTimeout(() => setJustCaptured(false), 500)
      return () => clearTimeout(timer)
    }
  }, [piece, justCaptured])

  useEffect(() => {
    if (piece && justMoved) {
      const timer = setTimeout(() => setJustMoved(false), 300)
      return () => clearTimeout(timer)
    }
  }, [piece, justMoved])

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPressed(true)
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    })

    // Не блокируем стандартное поведение в Telegram
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPressed(false)

    if (!touchStart) {
      onClick()
      return
    }

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    }

    const distanceX = Math.abs(touchStart.x - touchEnd.x)
    const distanceY = Math.abs(touchStart.y - touchEnd.y)
    const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY)
    const timeDiff = Date.now() - touchStart.time

    // Простая логика: если движение минимальное и быстрое - это клик
    if (totalDistance < 20 && timeDiff < 500) {
      onClick()
    }

    setTouchStart(null)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    // Минимальная обработка для предотвращения случайных кликов при скролле
    if (!touchStart) return

    const currentTouch = e.touches[0]
    const deltaX = Math.abs(currentTouch.clientX - touchStart.x)
    const deltaY = Math.abs(currentTouch.clientY - touchStart.y)

    // Если движение значительное, отменяем клик
    if (deltaX > 30 || deltaY > 30) {
      setTouchStart(null)
    }
  }

  const isAnimatingTo = animatingPiece?.to.row === row && animatingPiece?.to.col === col
  const isAnimatingFrom = animatingPiece?.from.row === row && animatingPiece?.from.col === col

  return (
    <div
      className={`
        aspect-square flex items-center justify-center relative cursor-pointer
        select-none overflow-hidden transition-all duration-300 transform-gpu
        ${
          isDarkSquare
            ? isDarkTheme
              ? "bg-gradient-to-br from-slate-800/60 via-slate-700/40 to-slate-900/80"
              : "bg-gradient-to-br from-blue-100/60 via-indigo-50/40 to-purple-100/80"
            : isDarkTheme
              ? "bg-gradient-to-br from-slate-600/40 via-slate-500/20 to-slate-700/60"
              : "bg-gradient-to-br from-white/80 via-blue-50/60 to-indigo-100/80"
        }
        backdrop-blur-xl border-2
        ${
          isDarkSquare
            ? isDarkTheme
              ? "border-slate-600/30 shadow-inner shadow-slate-900/20"
              : "border-indigo-200/40 shadow-inner shadow-indigo-300/20"
            : isDarkTheme
              ? "border-slate-500/20 shadow-inner shadow-slate-800/10"
              : "border-white/50 shadow-inner shadow-blue-200/20"
        }
        ${isSelected ? "ring-4 ring-cyan-400/60 ring-inset shadow-2xl shadow-cyan-400/30 scale-105" : ""}
        ${isValidMove ? "ring-4 ring-emerald-400/60 ring-inset shadow-2xl shadow-emerald-400/30" : ""}
        ${isDragTarget ? "ring-4 ring-yellow-400/60 ring-inset shadow-2xl shadow-yellow-400/30 scale-105" : ""}
        ${isPressed ? "scale-95 shadow-inner" : "hover:scale-102 active:scale-95"}
        ${justCaptured ? "animate-pulse" : ""}
        perspective-1000 transform-style-preserve-3d
      `}
      data-square="true"
      data-row={row}
      data-col={col}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
      <div className="absolute inset-0 rounded-lg overflow-hidden">
        <div
          className={`
            absolute inset-0 
            ${
              isDarkTheme
                ? "bg-gradient-to-br from-white/5 via-transparent to-black/10"
                : "bg-gradient-to-br from-white/40 via-transparent to-black/5"
            }
          `}
        />
        <div
          className={`
            absolute top-0 left-0 w-full h-1/3 
            ${
              isDarkTheme
                ? "bg-gradient-to-b from-white/10 to-transparent"
                : "bg-gradient-to-b from-white/60 to-transparent"
            }
          `}
        />
      </div>

      {isDarkSquare && (
        <div className="absolute inset-2 opacity-20">
          <div
            className={`w-full h-full ${isDarkTheme ? "bg-slate-400/10" : "bg-indigo-300/20"} transform rotate-45 rounded-sm`}
          />
        </div>
      )}

      {isSelected && (
        <div
          className="absolute inset-0 bg-gradient-radial from-cyan-400/30 via-cyan-300/20 to-transparent backdrop-blur-sm animate-pulse rounded-lg"
          style={{ transform: "translateZ(10px)" }}
        />
      )}

      {isValidMove && (
        <div
          className="absolute inset-0 bg-gradient-radial from-emerald-400/30 via-emerald-300/20 to-transparent backdrop-blur-sm animate-pulse rounded-lg"
          style={{ transform: "translateZ(10px)" }}
        />
      )}

      {isValidMove && !piece && (
        <div className="relative transform-gpu" style={{ transform: "translateZ(20px)" }}>
          <div
            className={`
            w-6 h-6 rounded-full backdrop-blur-xl border-2 shadow-2xl animate-bounce
            ${
              isDarkTheme
                ? "bg-gradient-to-br from-emerald-400/80 to-teal-500/80 border-emerald-300/60 shadow-emerald-400/40"
                : "bg-gradient-to-br from-emerald-300/90 to-teal-400/90 border-emerald-200/80 shadow-emerald-300/50"
            }
          `}
          />
          <div className="absolute inset-0 w-6 h-6 rounded-full bg-emerald-400/30 animate-ping" />
          <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/40 to-transparent" />
        </div>
      )}

      {piece && !isAnimatingFrom && (
        <div
          className={`relative w-4/5 h-4/5 group transform-gpu ${justMoved ? "animate-bounce" : ""}`}
          style={{ transform: `translateZ(30px) ${isSelected ? "scale(1.1)" : "scale(1)"}` }}
        >
          <div
            className={`
              w-full h-full rounded-full relative transition-all duration-500 transform-gpu
              ${
                piece.color === "white"
                  ? isDarkTheme
                    ? "bg-gradient-to-br from-slate-100/95 via-white/90 to-slate-200/95 border-3 border-slate-300/70 shadow-2xl shadow-white/20"
                    : "bg-gradient-to-br from-white/95 via-blue-50/90 to-indigo-100/95 border-3 border-indigo-200/70 shadow-2xl shadow-indigo-200/30"
                  : isDarkTheme
                    ? "bg-gradient-to-br from-slate-700/95 via-slate-800/90 to-slate-900/95 border-3 border-slate-600/70 shadow-2xl shadow-slate-900/40"
                    : "bg-gradient-to-br from-slate-600/95 via-slate-700/90 to-slate-800/95 border-3 border-slate-500/70 shadow-2xl shadow-slate-700/40"
              }
              backdrop-blur-xl hover:scale-105
            `}
            style={{
              boxShadow:
                piece.color === "white"
                  ? isDarkTheme
                    ? "0 12px 40px rgba(255,255,255,0.15), inset 0 4px 12px rgba(255,255,255,0.2)"
                    : "0 12px 40px rgba(99,102,241,0.2), inset 0 4px 12px rgba(255,255,255,0.3)"
                  : isDarkTheme
                    ? "0 12px 40px rgba(0,0,0,0.4), inset 0 4px 12px rgba(255,255,255,0.1)"
                    : "0 12px 40px rgba(0,0,0,0.3), inset 0 4px 12px rgba(255,255,255,0.1)",
            }}
          >
            <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/50 via-white/20 to-transparent" />
            <div className="absolute top-1 left-1 w-1/3 h-1/3 rounded-full bg-white/60 blur-sm" />

            <div className="absolute inset-3 rounded-full opacity-30">
              <div
                className={`w-full h-full rounded-full ${piece.color === "white" ? "bg-gradient-to-br from-blue-200/40 to-purple-200/40" : "bg-gradient-to-br from-slate-400/40 to-slate-600/40"}`}
              />
            </div>

            {piece.type === "king" && (
              <div
                className="absolute inset-0 flex items-center justify-center transform-gpu"
                style={{ transform: "translateZ(10px)" }}
              >
                <div className={`w-8 h-8 drop-shadow-2xl ${isDarkTheme ? "text-yellow-300" : "text-yellow-500"}`}>
                  <div className="absolute inset-0 bg-gradient-radial from-yellow-400/60 to-yellow-600/60 rounded-full backdrop-blur-sm animate-pulse" />
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

      {justCaptured && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-3 h-3 rounded-full backdrop-blur-sm border transform-gpu ${
                isDarkTheme
                  ? "bg-gradient-to-br from-red-400/90 to-orange-500/90 border-red-300/60"
                  : "bg-gradient-to-br from-red-300/90 to-orange-400/90 border-red-200/60"
              }`}
              style={{
                left: `${10 + i * 7}%`,
                top: `${10 + (i % 4) * 20}%`,
                animation: `particle-explosion 1000ms ease-out ${i * 40}ms forwards`,
                transform: `translateZ(${20 + i * 5}px)`,
              }}
            />
          ))}
        </div>
      )}

      {isDragTarget && (
        <div
          className="absolute inset-0 bg-gradient-radial from-yellow-400/30 via-yellow-300/20 to-transparent backdrop-blur-sm animate-pulse rounded-lg pointer-events-none"
          style={{ transform: "translateZ(15px)" }}
        />
      )}
    </div>
  )
}
