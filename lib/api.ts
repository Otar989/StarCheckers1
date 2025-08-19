export interface TelegramUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
}

export async function createGame(user: TelegramUser, initData: string) {
  const res = await fetch("/api/create-game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, initData }),
  })
  if (!res.ok) {
    throw new Error("Failed to create game")
  }
  return res.json()
}

export async function joinGame(roomId: string, user: TelegramUser, initData: string) {
  const res = await fetch("/api/join-game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, user, initData }),
  })
  if (!res.ok) {
    let message = "Failed to join game"
    try {
      const data = await res.json()
      if (data?.error) message = data.error
    } catch {
      // ignore JSON parsing errors
    }
    throw new Error(message)
  }
  return res.json()
}
