"use client"

import { useState } from "react"
import { GameProvider } from "@/components/game/GameProvider"
import { MainMenu } from "@/components/game/MainMenu"
import { GameBoard } from "@/components/game/GameBoard"
import { SettingsMenu } from "@/components/game/SettingsMenu"
import { AudioProvider } from "@/components/game/AudioProvider"

export type GameScreen = "menu" | "game" | "settings"
export type GameMode = "bot" | "local" | "online"
export type Difficulty = "easy" | "medium" | "hard"

export default function StarCheckersApp() {
  const [currentScreen, setCurrentScreen] = useState<GameScreen>("menu")
  const [gameMode, setGameMode] = useState<GameMode>("bot")
  const [difficulty, setDifficulty] = useState<Difficulty>("medium")
  const [roomCode, setRoomCode] = useState<string | null>(null)

  const startGame = (mode: GameMode, diff?: Difficulty, code?: string) => {
    setGameMode(mode)
    if (diff) setDifficulty(diff)
    setRoomCode(code ?? null)
    setCurrentScreen("game")
  }

  const goToMenu = () => setCurrentScreen("menu")
  const goToSettings = () => setCurrentScreen("settings")

  return (
    <AudioProvider>
      <GameProvider>
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-950">
          {currentScreen === "menu" && <MainMenu onStartGame={startGame} onOpenSettings={goToSettings} />}

          {currentScreen === "game" && (
            <GameBoard mode={gameMode} difficulty={difficulty} roomCode={roomCode ?? undefined} onBackToMenu={goToMenu} />
          )}

          {currentScreen === "settings" && <SettingsMenu onBack={goToMenu} />}
        </div>
      </GameProvider>
    </AudioProvider>
  )
}
