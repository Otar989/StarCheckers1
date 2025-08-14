"use client"
import { useState, useEffect } from "react"
import type { Piece } from "./GameProvider"

interface BoardSquareProps {
  row: number
  col: number
  piece: Piece | null
  isSelected: boolean
  isValidMove: boolean
  onClick: () => void
  animatingPiece?: {
    from: { row: number; col: number }
    to: { row: number; col: number }
    piece: Piece
  } | null
}

export function BoardSquare({ row, col, piece, isSelected, isValidMove, onClick, animatingPiece }: BoardSquareProps) {
  const [isPressed, setIsPressed] = useState(false)
  const [justCaptured, setJustCaptured] = useState(false)
  const [justMoved, setJustMoved] = useState(false)
  const isDarkSquare = (row + col) % 2 === 1

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

  const handleTouchStart = () => setIsPressed(true)
  const handleTouchEnd = () => setIsPressed(false)

  const isAnimatingTo = animatingPiece?.to.row === row && animatingPiece?.to.col === col
  const isAnimatingFrom = animatingPiece?.from.row === row && animatingPiece?.from.col === col

  return (
    <div
      className={`
        aspect-square flex items-center justify-center relative cursor-pointer
        select-none overflow-hidden transition-all duration-300
        ${
          isDarkSquare
            ? "bg-gradient-to-br from-amber-800/40 to-orange-900/40 dark:from-amber-900/60 dark:to-orange-950/60"
            : "bg-gradient-to-br from-amber-100/40 to-orange-200/40 dark:from-amber-200/20 dark:to-orange-300/20"
        }
        ${isDarkSquare ? "backdrop-blur-sm border border-amber-700/20" : "backdrop-blur-sm border border-amber-300/20"}
        ${isSelected ? "ring-2 ring-blue-400/60 ring-inset shadow-lg shadow-blue-400/20" : ""}
        ${isValidMove ? "ring-2 ring-green-400/60 ring-inset shadow-lg shadow-green-400/20" : ""}
        ${isPressed ? "scale-95" : ""}
        ${justCaptured ? "animate-bounce" : ""}
      `}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
      {/* Glass highlight effects */}
      {isSelected && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 backdrop-blur-sm animate-pulse" />
      )}

      {isValidMove && (
        <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-emerald-400/20 backdrop-blur-sm animate-pulse" />
      )}

      {/* Valid move indicator with liquid glass styling */}
      {isValidMove && !piece && (
        <div className="relative">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-green-400/60 to-emerald-400/60 backdrop-blur-xl border border-green-300/40 shadow-lg animate-pulse" />
          <div className="absolute inset-0 w-4 h-4 rounded-full bg-green-400/20 animate-ping" />
        </div>
      )}

      {piece && !isAnimatingFrom && (
        <div className={`relative w-3/4 h-3/4 group ${justMoved ? "animate-bounce" : ""}`}>
          {/* Liquid glass piece with enhanced 3D effect */}
          <div
            className={`
              w-full h-full rounded-full relative transition-all duration-300
              ${
                piece.color === "white"
                  ? "bg-gradient-to-br from-gray-100/90 to-gray-300/90 border-2 border-gray-400/60 shadow-lg shadow-gray-400/30"
                  : "bg-gradient-to-br from-gray-700/90 to-gray-900/90 border-2 border-gray-600/60 shadow-lg shadow-gray-800/40"
              }
              backdrop-blur-xl
              ${isSelected ? "scale-110 shadow-xl" : ""}
            `}
          >
            {/* Inner glass reflection */}
            <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/30 to-transparent" />

            {/* King crown with liquid glass styling */}
            {piece.type === "king" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 text-yellow-400 drop-shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/40 to-yellow-500/40 rounded-full backdrop-blur-sm animate-pulse" />
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full relative z-10">
                    <path d="M12 6L13.13 8.09L15.5 7.5L14.5 9.96L17 11L14.5 12.04L15.5 14.5L13.13 13.91L12 16L10.87 13.91L8.5 14.5L9.5 12.04L7 11L9.5 9.96L8.5 7.5L10.87 8.09L12 6Z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isAnimatingTo && animatingPiece && (
        <div className="absolute inset-0 flex items-center justify-center animate-bounce">
          <div className="w-3/4 h-3/4 relative">
            <div
              className={`
                w-full h-full rounded-full backdrop-blur-xl
                ${
                  animatingPiece.piece.color === "white"
                    ? "bg-gradient-to-br from-gray-100/90 to-gray-300/90 border-2 border-gray-400/60"
                    : "bg-gradient-to-br from-gray-700/90 to-gray-900/90 border-2 border-gray-600/60"
                }
              `}
            >
              {animatingPiece.piece.type === "king" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 text-yellow-400">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                      <path d="M12 6L13.13 8.09L15.5 7.5L14.5 9.96L17 11L14.5 12.04L15.5 14.5L13.13 13.91L12 16L10.87 13.91L8.5 14.5L9.5 12.04L7 11L9.5 9.96L8.5 7.5L10.87 8.09L12 6Z" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced liquid glass capture effect */}
      {justCaptured && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-gradient-to-br from-red-400/80 to-orange-500/80 rounded-full backdrop-blur-sm border border-red-300/40"
              style={{
                left: `${15 + i * 8}%`,
                top: `${15 + (i % 3) * 25}%`,
                animation: `particle-explosion 800ms ease-out ${i * 50}ms forwards`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
