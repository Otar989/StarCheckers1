"use client"

import { useState, useEffect } from "react"

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
  const [theme, setThemeState] = useState<string>("classic")

  useEffect(() => {
    const savedTheme = localStorage.getItem("starcheckers-theme")
    if (savedTheme && availableThemes.find((t) => t.id === savedTheme)) {
      setThemeState(savedTheme)
    }
  }, [])

  const setTheme = (themeId: string) => {
    setThemeState(themeId)
    localStorage.setItem("starcheckers-theme", themeId)
  }

  const currentTheme = availableThemes.find((t) => t.id === theme) || availableThemes[0]

  return {
    theme,
    setTheme,
    currentTheme,
    availableThemes,
  }
}
