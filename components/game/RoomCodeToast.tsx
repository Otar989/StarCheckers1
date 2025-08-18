"use client"
import { useState } from "react"

interface RoomCodeToastProps {
  roomId: string
  position?: "top" | "bottom"
  onClose?: () => void
}

export function RoomCodeToast({ roomId, position = "top", onClose }: RoomCodeToastProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error(err)
    }
  }

  const posClass = position === "bottom" ? "bottom-4" : "top-4"

  return (
    <div className={`fixed ${posClass} left-1/2 -translate-x-1/2 z-50`}>
      <div className="liquid-glass flex items-center gap-2 px-4 py-2 rounded-xl">
        <span className="font-mono text-sm text-white">{roomId}</span>
        <button
          onClick={handleCopy}
          className="bg-white/10 hover:bg-white/20 text-white text-xs px-2 py-1 rounded-lg transition-colors"
        >
          {copied ? "Скопировано" : "Копировать"}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-xs px-1"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
