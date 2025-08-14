"use client"
import { useEffect, useState } from "react"
import { Trophy, Star, Sparkles } from "lucide-react"

interface VictoryAnimationProps {
  winner: "white" | "black" | "draw"
  onComplete: () => void
}

export function VictoryAnimation({ winner, onComplete }: VictoryAnimationProps) {
  const [showFireworks, setShowFireworks] = useState(false)

  useEffect(() => {
    const timer1 = setTimeout(() => setShowFireworks(true), 500)
    const timer2 = setTimeout(onComplete, 3000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [onComplete])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-50 animate-in fade-in duration-500">
      {/* Liquid glass fireworks particles */}
      {showFireworks && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2000}ms`,
                animationDuration: `${1000 + Math.random() * 1000}ms`,
              }}
            >
              <div className="w-6 h-6 bg-gradient-to-br from-yellow-400/60 to-orange-400/60 backdrop-blur-xl rounded-full border border-yellow-300/40 animate-ping flex items-center justify-center">
                <Star className="w-3 h-3 text-yellow-200" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Victory content with liquid glass effect */}
      <div className="relative bg-white/10 dark:bg-black/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 rounded-3xl blur-sm" />

        <div className="relative text-center space-y-6 animate-in zoom-in duration-700">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-400/40 to-orange-400/40 backdrop-blur-xl rounded-full border border-yellow-300/40 mx-auto flex items-center justify-center animate-bounce">
              <Trophy className="w-12 h-12 text-yellow-300" />
            </div>
            <div className="absolute inset-0 w-24 h-24 bg-yellow-400/20 rounded-full blur-xl animate-ping mx-auto" />
          </div>

          <div className="space-y-3">
            <h2 className="text-4xl font-bold text-white animate-pulse">
              {winner === "white" && "Белые победили!"}
              {winner === "black" && "Черные победили!"}
              {winner === "draw" && "Ничья!"}
            </h2>

            <div className="flex items-center justify-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-yellow-400/40 to-orange-400/40 backdrop-blur-xl rounded-full border border-yellow-300/40 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-yellow-300 animate-spin" />
              </div>
              <span className="text-lg text-yellow-200 bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                Поздравляем!
              </span>
              <div className="w-6 h-6 bg-gradient-to-br from-yellow-400/40 to-orange-400/40 backdrop-blur-xl rounded-full border border-yellow-300/40 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-yellow-300 animate-spin" />
              </div>
            </div>
          </div>

          {/* Animated liquid glass stars */}
          <div className="flex justify-center gap-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-8 h-8 bg-gradient-to-br from-yellow-400/40 to-orange-400/40 backdrop-blur-xl rounded-full border border-yellow-300/40 flex items-center justify-center animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              >
                <Star className="w-4 h-4 text-yellow-300" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
