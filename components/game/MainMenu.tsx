"use client"
import { Settings, Bot, Users, Wifi, Trophy, Star } from "lucide-react"
import type { GameMode, Difficulty } from "@/app/page"
import { useGameStats } from "@/hooks/use-game-stats"
import { useState } from "react"
import { useAudio } from "./AudioProvider"
import { LoadingSpinner } from "./LoadingSpinner"

interface MainMenuProps {
  onStartGame: (mode: GameMode, difficulty?: Difficulty, roomCode?: string) => void
  onOpenSettings: () => void
}

export function MainMenu({ onStartGame, onOpenSettings }: MainMenuProps) {
  const { stats } = useGameStats()
  const { initializeAudio } = useAudio()
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)
  const [onlineStep, setOnlineStep] = useState<"none" | "options" | "waiting" | "join">("none")
  const [roomCode, setRoomCode] = useState("")

  const handleStartGame = (mode: GameMode, difficulty?: Difficulty, roomCode?: string) => {
    initializeAudio()
    onStartGame(mode, difficulty, roomCode)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background elements */}
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

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/10 border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
          <div className="max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            <div className="p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Star className="w-8 h-8 text-white animate-pulse" />
                  </div>
                </div>

                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  StarCheckers
                </h1>
                <p className="text-white/70 text-sm">Премиум игра в шашки</p>

                {/* Stats */}
                {stats.gamesPlayed > 0 && (
                  <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-3">
                    <div className="flex justify-center gap-4 text-xs text-white/70">
                      <div className="flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-yellow-400" />
                        <span>Побед: {stats.wins}</span>
                      </div>
                      <div>Игр: {stats.gamesPlayed}</div>
                      <div>Рейтинг: {Math.round((stats.wins / stats.gamesPlayed) * 100)}%</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {/* AI Game Mode */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    Играть с ИИ
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { difficulty: "easy" as const, label: "Легко", color: "from-green-500 to-emerald-500" },
                      { difficulty: "medium" as const, label: "Средне", color: "from-yellow-500 to-orange-500" },
                      { difficulty: "hard" as const, label: "Сложно", color: "from-red-500 to-pink-500" },
                    ].map(({ difficulty, label, color }) => (
                      <button
                        key={difficulty}
                        onClick={() => handleStartGame("bot", difficulty)}
                        onMouseEnter={() => setHoveredButton(difficulty)}
                        onMouseLeave={() => setHoveredButton(null)}
                        className={`
                          relative flex flex-col items-center gap-1 py-3 px-2 rounded-2xl
                          bg-white/5 border border-white/10 transition-all duration-300
                          hover:scale-105 hover:bg-white/10 hover:shadow-lg
                          ${hoveredButton === difficulty ? `bg-gradient-to-r ${color} text-white` : "text-white/80"}
                        `}
                      >
                        <Bot className="w-4 h-4" />
                        <span className="text-xs">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Local Game Mode */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Локальная игра
                  </h3>
                  <button
                    onClick={() => handleStartGame("local")}
                    onMouseEnter={() => setHoveredButton("local")}
                    onMouseLeave={() => setHoveredButton(null)}
                    className="w-full flex items-center gap-3 h-12 px-4 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-white/20 transition-all duration-300 hover:scale-105 hover:from-blue-500/30 hover:to-purple-500/30 text-white hover:shadow-lg"
                  >
                    <Users className="w-5 h-5" />
                    <span className="font-medium">Игра на одном устройстве</span>
                  </button>
                </div>

                {/* Online Game Mode */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                    <Wifi className="w-4 h-4" />
                    Онлайн режим
                  </h3>
                  {onlineStep === "none" && (
                    <button
                      onClick={() => setOnlineStep("options")}
                      onMouseEnter={() => setHoveredButton("online")}
                      onMouseLeave={() => setHoveredButton(null)}
                      className="w-full flex items-center gap-3 h-12 px-4 rounded-2xl bg-white/5 border border-white/10 transition-all duration-300 hover:bg-white/10 hover:scale-105 text-white/80 hover:text-white"
                    >
                      <Wifi className="w-5 h-5" />
                      <span>Играть онлайн</span>
                    </button>
                  )}

                  {onlineStep === "options" && (
                    <div className="space-y-2">
                      <button
                        onClick={() => setOnlineStep("waiting")}
                        className="w-full flex items-center justify-center gap-3 h-12 px-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-white/20 transition-all duration-300 hover:scale-105 hover:from-emerald-500/30 hover:to-green-500/30 text-white hover:shadow-lg"
                      >
                        Создать игру
                      </button>
                      <button
                        onClick={() => setOnlineStep("join")}
                        className="w-full flex items-center justify-center gap-3 h-12 px-4 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-white/20 transition-all duration-300 hover:scale-105 hover:from-blue-500/30 hover:to-purple-500/30 text-white hover:shadow-lg"
                      >
                        Ввести код
                      </button>
                      <button
                        onClick={() => setOnlineStep("none")}
                        className="w-full flex items-center justify-center gap-3 h-10 px-4 rounded-2xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-all"
                      >
                        Назад
                      </button>
                    </div>
                  )}

                  {onlineStep === "waiting" && (
                    <div className="space-y-4">
                      <LoadingSpinner message="Ожидание второго игрока..." />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStartGame("online")}
                          className="flex-1 h-10 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-white/20 text-white hover:scale-105 transition-all"
                        >
                          Начать
                        </button>
                        <button
                          onClick={() => setOnlineStep("none")}
                          className="h-10 px-4 rounded-2xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-all"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}

                  {onlineStep === "join" && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value)}
                        placeholder="Код комнаты"
                        className="w-full h-10 px-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/50 focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStartGame("online", undefined, roomCode)}
                          className="flex-1 h-10 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-white/20 text-white hover:scale-105 transition-all"
                        >
                          Присоединиться
                        </button>
                        <button
                          onClick={() => setOnlineStep("none")}
                          className="h-10 px-4 rounded-2xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-all"
                        >
                          Назад
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Settings button */}
                <button
                  onClick={onOpenSettings}
                  onMouseEnter={() => setHoveredButton("settings")}
                  onMouseLeave={() => setHoveredButton(null)}
                  className="w-full flex items-center gap-3 h-12 px-4 rounded-2xl bg-white/5 border border-white/10 transition-all duration-300 hover:bg-white/10 hover:scale-105 text-white/80 hover:text-white"
                >
                  <Settings className="w-5 h-5" />
                  <span>Настройки</span>
                </button>
              </div>

              {/* Version info */}
              <div className="mt-6 pt-4 border-t border-white/10 text-center">
                <p className="text-xs text-white/50">StarCheckers v1.0 • Создано для Telegram Mini Apps</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
