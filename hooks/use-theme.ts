"use client"

import { useState, useEffect } from "react"

export type ThemeMode = "light" | "dark" | "system"

export interface ThemeOption {
  id: string
  name: string
  preview: string
  colors: {
    lightSquare: string
    darkSquare: string
    boardBorder: string
  }
}

const availableThemes: ThemeOption[] = [
  {
    id: "classic",
    name: "Классика",
    preview: "bg-gradient-to-br from-amber-100 to-amber-800",
    colors: {
      lightSquare: "from-amber-50 to-amber-100",
      darkSquare: "from-amber-700 to-amber-800",
      boardBorder: "border-amber-300",
    },
  },
  {
    id: "wood",
    name: "Дерево",
    preview: "bg-gradient-to-br from-yellow-100 to-amber-900",
    colors: {
      lightSquare: "from-yellow-50 to-yellow-100",
      darkSquare: "from-amber-800 to-amber-900",
      boardBorder: "border-amber-400",
    },
  },
  {
    id: "marble",
    name: "Мрамор",
    preview: "bg-gradient-to-br from-gray-100 to-gray-800",
    colors: {
      lightSquare: "from-gray-50 to-gray-100",
      darkSquare: "from-gray-700 to-gray-800",
      boardBorder: "border-gray-300",
    },
  },
  {
    id: "emerald",
    name: "Изумруд",
    preview: "bg-gradient-to-br from-emerald-100 to-emerald-800",
    colors: {
      lightSquare: "from-emerald-50 to-emerald-100",
      darkSquare: "from-emerald-700 to-emerald-800",
      boardBorder: "border-emerald-300",
    },
  },
]

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>("system")
  const [boardTheme, setBoardThemeState] = useState<string>("classic")
  const [isDark, setIsDark] = useState(false)

  // Определяем системную тему
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const updateSystemTheme = () => {
      if (theme === "system") {
        setIsDark(mediaQuery.matches)
        document.documentElement.classList.toggle("dark", mediaQuery.matches)
      }
    }

    updateSystemTheme()
    mediaQuery.addEventListener("change", updateSystemTheme)

    return () => mediaQuery.removeEventListener("change", updateSystemTheme)
  }, [theme])

  // Загружаем сохраненные настройки
  useEffect(() => {
    const savedTheme = localStorage.getItem("starcheckers-color-theme") as ThemeMode
    const savedBoardTheme = localStorage.getItem("starcheckers-board-theme")

    if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
      setThemeState(savedTheme)
    }

    if (savedBoardTheme && availableThemes.find((t) => t.id === savedBoardTheme)) {
      setBoardThemeState(savedBoardTheme)
    }
  }, [])

  // Применяем тему
  useEffect(() => {
    if (theme === "light") {
      setIsDark(false)
      document.documentElement.classList.remove("dark")
    } else if (theme === "dark") {
      setIsDark(true)
      document.documentElement.classList.add("dark")
    }
    // Для 'system' обработка в первом useEffect
  }, [theme])

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme)
    localStorage.setItem("starcheckers-color-theme", newTheme)
  }

  const setBoardTheme = (themeId: string) => {
    setBoardThemeState(themeId)
    localStorage.setItem("starcheckers-board-theme", themeId)
  }

  const currentBoardTheme = availableThemes.find((t) => t.id === boardTheme) || availableThemes[0]

  return {
    theme,
    setTheme,
    boardTheme,
    setBoardTheme,
    currentBoardTheme,
    availableThemes,
    isDark,
  }
}
