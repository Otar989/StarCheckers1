"use client"
import { ArrowLeft, Volume2, VolumeX, Music, RotateCcw, Trophy, Info, Sun, Moon, Monitor } from "lucide-react"
import { useAudio } from "./AudioProvider"
import { useGameStats } from "@/hooks/use-game-stats"
import { useTheme } from "@/hooks/use-theme"
import { useState } from "react"

interface SettingsMenuProps {
  onBack: () => void
}

export function SettingsMenu({ onBack }: SettingsMenuProps) {
  const { isSoundsEnabled, toggleSounds } = useAudio()
  const { stats, resetStats } = useGameStats()
  const { theme, setTheme } = useTheme()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const handleResetStats = () => {
    if (showResetConfirm) {
      resetStats()
      setShowResetConfirm(false)
    } else {
      setShowResetConfirm(true)
      setTimeout(() => setShowResetConfirm(false), 3000)
    }
  }

  const themeOptions = [
    { value: "light", label: "Светлая", icon: Sun },
    { value: "dark", label: "Темная", icon: Moon },
    { value: "system", label: "Системная", icon: Monitor },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-slate-950 dark:via-purple-950 dark:to-slate-950">
      {/* Animated background elements matching MainMenu */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
        <div
          className="absolute bottom-20 right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-pink-500/10 rounded-full blur-xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Glass morphism container */}
        <div className="bg-white/10 border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
          <div className="max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={onBack}
                  className="p-2 rounded-2xl bg-white/10 dark:bg-black/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 transition-all duration-300"
                >
                  <ArrowLeft className="w-4 h-4 text-white/80" />
                </button>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Настройки
                </h2>
              </div>

              <div className="space-y-6">
                {/* Theme Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-white/90">
                    <Sun className="w-5 h-5" />
                    Тема
                  </h3>

                  <div className="space-y-3 pl-7">
                    {themeOptions.map((option) => {
                      const IconComponent = option.icon
                      return (
                        <button
                          key={option.value}
                          onClick={() => setTheme(option.value as "light" | "dark" | "system")}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all duration-300 ${
                            theme === option.value
                              ? "bg-gradient-to-r from-blue-500/30 to-purple-500/30 backdrop-blur-xl border border-blue-400/40"
                              : "bg-white/10 dark:bg-black/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 dark:hover:bg-black/20"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <IconComponent className="w-4 h-4 text-white/70" />
                            <span className="text-sm text-white/80">{option.label}</span>
                          </div>
                          {theme === option.value && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Audio Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-white/90">
                    <Music className="w-5 h-5" />
                    Звук
                  </h3>

                  <div className="space-y-4 pl-7">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-white/10 dark:bg-black/10 backdrop-blur-xl border border-white/20">
                      <div className="flex items-center gap-3">
                        {isSoundsEnabled ? (
                          <Volume2 className="w-4 h-4 text-white/70" />
                        ) : (
                          <VolumeX className="w-4 h-4 text-white/70" />
                        )}
                        <span className="text-sm text-white/80">Звуковые эффекты</span>
                      </div>
                      <button
                        onClick={toggleSounds}
                        className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                          isSoundsEnabled
                            ? "bg-gradient-to-r from-blue-500/60 to-purple-500/60 backdrop-blur-xl"
                            : "bg-white/20 backdrop-blur-xl"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg transition-all duration-300 ${
                            isSoundsEnabled ? "left-7" : "left-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-white/90">
                    <Trophy className="w-5 h-5" />
                    Статистика
                  </h3>

                  <div className="space-y-3 pl-7">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white/10 dark:bg-black/10 backdrop-blur-xl rounded-2xl border border-white/20 p-3 text-center">
                        <div className="text-2xl font-bold text-green-400">{stats.wins}</div>
                        <div className="text-white/70">Побед</div>
                      </div>
                      <div className="bg-white/10 dark:bg-black/10 backdrop-blur-xl rounded-2xl border border-white/20 p-3 text-center">
                        <div className="text-2xl font-bold text-red-400">{stats.losses}</div>
                        <div className="text-white/70">Поражений</div>
                      </div>
                      <div className="bg-white/10 dark:bg-black/10 backdrop-blur-xl rounded-2xl border border-white/20 p-3 text-center">
                        <div className="text-2xl font-bold text-blue-400">{stats.gamesPlayed}</div>
                        <div className="text-white/70">Всего игр</div>
                      </div>
                      <div className="bg-white/10 dark:bg-black/10 backdrop-blur-xl rounded-2xl border border-white/20 p-3 text-center">
                        <div className="text-2xl font-bold text-amber-400">
                          {stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0}%
                        </div>
                        <div className="text-white/70">Винрейт</div>
                      </div>
                    </div>

                    <button
                      onClick={handleResetStats}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl transition-all duration-300 ${
                        showResetConfirm
                          ? "bg-gradient-to-r from-red-500/60 to-pink-500/60 backdrop-blur-xl border border-red-400/40"
                          : "bg-white/10 dark:bg-black/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 dark:hover:bg-black/20"
                      }`}
                    >
                      <RotateCcw className="w-4 h-4 text-white/80" />
                      <span className="text-white/80">
                        {showResetConfirm ? "Подтвердить сброс" : "Сбросить статистику"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* About */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-white/90">
                    <Info className="w-5 h-5" />О игре
                  </h3>

                  <div className="pl-7 space-y-3">
                    <div className="bg-white/10 dark:bg-black/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4">
                      <p className="text-sm text-white/90 font-semibold mb-2">StarCheckers v1.0</p>
                      <p className="text-sm text-white/70 mb-3">Премиум русские шашки для Telegram Mini Apps</p>
                      <p className="text-xs text-white/60">
                        Создано с использованием современных веб-технологий для максимального удобства и красоты.
                      </p>

                      <div className="mt-4 p-3 bg-white/10 dark:bg-black/10 backdrop-blur-xl rounded-xl border border-white/20">
                        <p className="text-xs text-white/70">
                          <strong className="text-white/90">Особенности:</strong>
                          <br />• ИИ с 3 уровнями сложности
                          <br />• Локальная игра на одном устройстве
                          <br />• Красивые анимации и звуки
                          <br />• Полная адаптивность
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
