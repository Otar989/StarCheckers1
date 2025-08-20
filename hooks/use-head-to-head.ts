"use client"

import { useEffect, useMemo, useState } from "react"

export type HeadToHeadScore = { you: number; opp: number; draws: number }

const defaultScore: HeadToHeadScore = { you: 0, opp: 0, draws: 0 }

export function useHeadToHead(roomId: string | null) {
  const storageKey = useMemo(() => (roomId ? `starcheckers-h2h-${roomId}` : null), [roomId])
  const [score, setScore] = useState<HeadToHeadScore>(defaultScore)

  useEffect(() => {
    if (!storageKey) {
      setScore(defaultScore)
      return
    }
    try {
      const raw = localStorage.getItem(storageKey)
      setScore(raw ? JSON.parse(raw) : defaultScore)
    } catch {
      setScore(defaultScore)
    }
  }, [storageKey])

  const persist = (next: HeadToHeadScore) => {
    setScore(next)
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next))
  }

  const recordYouWin = () => persist({ ...score, you: score.you + 1 })
  const recordOppWin = () => persist({ ...score, opp: score.opp + 1 })
  const recordDraw = () => persist({ ...score, draws: score.draws + 1 })
  const reset = () => persist(defaultScore)

  return { score, recordYouWin, recordOppWin, recordDraw, reset }
}
