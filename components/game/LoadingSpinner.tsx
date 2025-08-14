"use client"
import { Star } from "lucide-react"

interface LoadingSpinnerProps {
  message?: string
}

export function LoadingSpinner({ message = "Загрузка..." }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      <div className="relative">
        {/* Liquid glass spinner */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500/30 to-purple-500/30 backdrop-blur-xl border border-white/20 animate-spin">
          <div className="absolute inset-2 rounded-full bg-gradient-to-r from-purple-500/30 to-pink-500/30 backdrop-blur-xl" />
        </div>

        {/* Inner star with glass effect */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400/40 to-purple-400/40 backdrop-blur-xl rounded-full border border-white/20 flex items-center justify-center">
            <Star className="w-4 h-4 text-blue-300 animate-pulse" />
          </div>
        </div>

        {/* Outer glow */}
        <div className="absolute inset-0 w-16 h-16 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-xl animate-pulse" />
      </div>

      <div className="bg-white/10 dark:bg-black/10 backdrop-blur-xl rounded-2xl border border-white/20 px-4 py-2">
        <p className="text-white/80 text-sm animate-pulse">{message}</p>
      </div>
    </div>
  )
}
