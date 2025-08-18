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

export function useGameStats(userId?: number) {
  const storageKey = userId ? `starcheckers-stats-${userId}` : "starcheckers-stats"
  const [stats, setStats] = useState<GameStats>(defaultStats)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const savedStats = localStorage.getItem(storageKey)
    if (savedStats) {
      try {
        const parsedStats = JSON.parse(savedStats)
        setStats(parsedStats)
      } catch {
        setStats(defaultStats)
      }
    }
    setIsLoaded(true)
  }, [storageKey])

  const saveStats = (newStats: GameStats) => {
    setStats(newStats)
    localStorage.setItem(storageKey, JSON.stringify(newStats))
  }

  const sendResultToServer = async (result: "win" | "loss" | "draw") => {
    const res = await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result }),
    })

    if (!res.ok) {
      throw new Error("Failed to send game result")
    }
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

  const recordOnlineWin = async () => {
    recordWin()
    try {
      await sendResultToServer("win")
    } catch (error) {
      console.error("Failed to record win online", error)
    }
  }

  const recordOnlineLoss = async () => {
    recordLoss()
    try {
      await sendResultToServer("loss")
    } catch (error) {
      console.error("Failed to record loss online", error)
    }
  }

  const recordOnlineDraw = async () => {
    recordDraw()
    try {
      await sendResultToServer("draw")
    } catch (error) {
      console.error("Failed to record draw online", error)
    }
  }

  return {
    stats,
    isLoaded,
    recordWin,
    recordLoss,
    recordDraw,
    recordOnlineWin,
    recordOnlineLoss,
    recordOnlineDraw,
    resetStats,
  }
}
