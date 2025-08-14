"use client"

import { useState, useEffect } from "react"

interface GameStats {
  gamesPlayed: number
  wins: number
  losses: number
  draws: number
  bestStreak: number
  currentStreak: number
}

const defaultStats: GameStats = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  bestStreak: 0,
  currentStreak: 0,
}

export function useGameStats() {
  const [stats, setStats] = useState<GameStats>(defaultStats)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const savedStats = localStorage.getItem("starcheckers-stats")
    if (savedStats) {
      try {
        const parsedStats = JSON.parse(savedStats)
        setStats(parsedStats)
      } catch {
        setStats(defaultStats)
      }
    }
    setIsLoaded(true)
  }, [])

  const saveStats = (newStats: GameStats) => {
    setStats(newStats)
    localStorage.setItem("starcheckers-stats", JSON.stringify(newStats))
  }

  const recordWin = () => {
    const newStats = {
      ...stats,
      gamesPlayed: stats.gamesPlayed + 1,
      wins: stats.wins + 1,
      currentStreak: stats.currentStreak + 1,
      bestStreak: Math.max(stats.bestStreak, stats.currentStreak + 1),
    }
    saveStats(newStats)
  }

  const recordLoss = () => {
    const newStats = {
      ...stats,
      gamesPlayed: stats.gamesPlayed + 1,
      losses: stats.losses + 1,
      currentStreak: 0,
    }
    saveStats(newStats)
  }

  const recordDraw = () => {
    const newStats = {
      ...stats,
      gamesPlayed: stats.gamesPlayed + 1,
      draws: stats.draws + 1,
      currentStreak: 0,
    }
    saveStats(newStats)
  }

  const resetStats = () => {
    saveStats(defaultStats)
  }

  return {
    stats,
    isLoaded,
    recordWin,
    recordLoss,
    recordDraw,
    resetStats,
  }
}
