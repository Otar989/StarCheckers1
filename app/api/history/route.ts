type GameResult = "win" | "loss" | "draw"

interface HistoryEntry {
  result: GameResult
  timestamp: number
}

const history: HistoryEntry[] = []

export async function POST(req: Request) {
  try {
    const { result } = (await req.json()) as { result?: GameResult }

    if (result !== "win" && result !== "loss" && result !== "draw") {
      return new Response(JSON.stringify({ error: "Invalid result" }), { status: 400 })
    }

    history.push({ result, timestamp: Date.now() })

    return Response.json({ success: true })
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 })
  }
}

// Simple helper to inspect saved history during development/tests
export function getHistory() {
  return history
}

