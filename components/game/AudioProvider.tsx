"use client"

import { createContext, useContext, useState, useRef, type ReactNode, useEffect, useCallback } from "react"

interface AudioContextType {
  playSound: (soundType: "move" | "capture" | "win" | "select" | "promote" | "turn") => void
  toggleMusic: () => void
  toggleSounds: () => void
  isMusicEnabled: boolean
  isSoundsEnabled: boolean
  musicVolume: number
  setMusicVolume: (volume: number) => void
  isAudioInitialized: boolean
  initializeAudio: () => void
}

const AudioContext = createContext<AudioContextType | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  const [isSoundsEnabled, setIsSoundsEnabled] = useState(true)
  const [isAudioInitialized, setIsAudioInitialized] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const soundGainNodeRef = useRef<GainNode | null>(null)

  useEffect(() => {
    // Load settings from localStorage
    const savedSoundsEnabled = localStorage.getItem("starcheckers-sounds-enabled")
    if (savedSoundsEnabled !== null) setIsSoundsEnabled(JSON.parse(savedSoundsEnabled))
  }, [])

  const generateTone = useCallback(
    (frequency: number, duration: number, type: OscillatorType = "sine") => {
      if (!audioContextRef.current || !soundGainNodeRef.current || !isSoundsEnabled) return

      const oscillator = audioContextRef.current.createOscillator()
      const gainNode = audioContextRef.current.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(soundGainNodeRef.current)

      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime)
      oscillator.type = type

      gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.1, audioContextRef.current.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration)

      oscillator.start(audioContextRef.current.currentTime)
      oscillator.stop(audioContextRef.current.currentTime + duration)
    },
    [isSoundsEnabled],
  )

  const initializeAudio = useCallback(() => {
    if (isAudioInitialized || typeof window === "undefined") return

    try {
      // @ts-ignore - AudioContext constructor
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()

      // Create gain node for sound effects only
      soundGainNodeRef.current = audioContextRef.current.createGain()
      soundGainNodeRef.current.connect(audioContextRef.current.destination)
      soundGainNodeRef.current.gain.setValueAtTime(0.5, audioContextRef.current.currentTime)

      setIsAudioInitialized(true)
    } catch (error) {
      console.warn("Failed to initialize audio:", error)
    }
  }, [isAudioInitialized])

  const playSound = useCallback(
    (soundType: "move" | "capture" | "win" | "select" | "promote" | "turn") => {
      // Automatically initialize audio on first call
      if (!isAudioInitialized) {
        initializeAudio()
        // Retry playing after initialization
        setTimeout(() => playSound(soundType), 100)
        return
      }

      switch (soundType) {
        case "move":
          generateTone(440, 0.1, "sine") // A4
          break
        case "capture":
          generateTone(330, 0.15, "square") // E4
          setTimeout(() => generateTone(220, 0.1, "square"), 100) // A3
          break
        case "select":
          generateTone(523, 0.05, "sine") // C5
          break
        case "turn":
          // Лёгкий сигнал, что теперь ваш ход
          generateTone(880, 0.06, "triangle") // A5
          setTimeout(() => generateTone(988, 0.06, "triangle"), 70) // B5
          break
        case "promote":
          // Ascending melody for promotion
          generateTone(440, 0.1, "sine") // A4
          setTimeout(() => generateTone(554, 0.1, "sine"), 100) // C#5
          setTimeout(() => generateTone(659, 0.15, "sine"), 200) // E5
          break
        case "win":
          // Victory fanfare
          generateTone(523, 0.2, "triangle") // C5
          setTimeout(() => generateTone(659, 0.2, "triangle"), 200) // E5
          setTimeout(() => generateTone(784, 0.3, "triangle"), 400) // G5
          break
      }
    },
    [generateTone, isAudioInitialized, initializeAudio],
  )

  const toggleSounds = useCallback(() => {
    const newState = !isSoundsEnabled
    setIsSoundsEnabled(newState)
    localStorage.setItem("starcheckers-sounds-enabled", JSON.stringify(newState))
  }, [isSoundsEnabled])

  return (
    <AudioContext.Provider
      value={{
        playSound,
        toggleSounds,
        isSoundsEnabled,
        isAudioInitialized,
        initializeAudio,
        // Removed all music-related properties and functions
        toggleMusic: () => {},
        isMusicEnabled: false,
        musicVolume: 0,
        setMusicVolume: () => {},
      }}
    >
      {children}
    </AudioContext.Provider>
  )
}

export function useAudio() {
  const context = useContext(AudioContext)
  if (!context) {
    throw new Error("useAudio must be used within an AudioProvider")
  }
  return context
}
