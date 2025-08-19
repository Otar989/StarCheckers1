import { verifyTelegramHash } from "@/lib/telegram-auth"
import { createRoom } from "@/lib/room-store"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""

export async function POST(req: Request) {
  const { user, initData } = await req.json()

  if (BOT_TOKEN && !verifyTelegramHash(initData, BOT_TOKEN)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const color = user.id % 2 === 0 ? "white" : "black"
  const room = createRoom({ id: user.id, color })

  return Response.json({ roomId: room.id, color })
}
