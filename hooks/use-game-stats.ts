"use client"

import { useState, useEffect } from "react"

interface GameStats {
  gamesPlayed: number
  wins: number
  losses: number
  draws: number
  bestStreak: number
  currentStreak: number
  rating: number
}

const defaultStats: GameStats = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  bestStreak: 0,
  currentStreak: 0,
  rating: 1000 // Начальный рейтинг
}

export function useGameStats(userId?: number) {
  const storageKey = userId ? `starcheckers-stats-${userId}` : "starcheckers-stats"
  const [stats, setStats] = useState<GameStats>(defaultStats)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const savedStats = localStorage.getItem(storageKey)
    if (savedStats) {
      setStats(JSON.parse(savedStats))
    }
    setIsLoaded(true)
  }, [storageKey])

  const updateStats = (newStats: Partial<GameStats>) => {
    setStats(prevStats => {
      const updatedStats = { ...prevStats, ...newStats }
      localStorage.setItem(storageKey, JSON.stringify(updatedStats))
      return updatedStats
    })
  }

  // Сброс статистики к значениям по умолчанию
  const resetStats = () => {
    localStorage.setItem(storageKey, JSON.stringify(defaultStats))
    setStats(defaultStats)
  }

  // Функция обновления рейтинга
  const updateRating = (won: boolean, isDraw: boolean) => {
    const K = 32 // Коэффициент изменения рейтинга
    let change = 0;
    
    if (isDraw) {
      change = 0;
    } else if (won) {
      change = K;
    } else {
      change = -K;
    }

    updateStats({ rating: Math.max(0, stats.rating + change) });
  }

  const recordWin = () => {
    updateStats({
      wins: stats.wins + 1,
      gamesPlayed: stats.gamesPlayed + 1,
      currentStreak: stats.currentStreak + 1,
      bestStreak: Math.max(stats.bestStreak, stats.currentStreak + 1)
    })
    updateRating(true, false)
  }

  const recordLoss = () => {
    updateStats({
      losses: stats.losses + 1,
      gamesPlayed: stats.gamesPlayed + 1,
      currentStreak: 0
    })
    updateRating(false, false)
  }

  const recordDraw = () => {
    updateStats({
      draws: stats.draws + 1,
      gamesPlayed: stats.gamesPlayed + 1,
    })
    updateRating(false, true)
  }

  // Онлайн статистика с увеличенным влиянием на рейтинг
  const recordOnlineWin = () => {
    const K = 48 // Повышенный коэффициент для онлайн игр
    updateStats({
      wins: stats.wins + 1,
      gamesPlayed: stats.gamesPlayed + 1,
      currentStreak: stats.currentStreak + 1,
      bestStreak: Math.max(stats.bestStreak, stats.currentStreak + 1),
      rating: Math.max(0, stats.rating + K)
    })
  }

  const recordOnlineLoss = () => {
    const K = 48 // Повышенный коэффициент для онлайн игр
    updateStats({
      losses: stats.losses + 1,
      gamesPlayed: stats.gamesPlayed + 1,
      currentStreak: 0,
      rating: Math.max(0, stats.rating - K)
    })
  }

  const recordOnlineDraw = () => {
    updateStats({
      draws: stats.draws + 1,
      gamesPlayed: stats.gamesPlayed + 1,
    })
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
  resetStats
  }
}
