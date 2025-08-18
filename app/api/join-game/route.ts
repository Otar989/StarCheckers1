import { verifyTelegramHash } from "@/lib/telegram-auth"
import { joinRoom } from "@/lib/room-store"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""

export async function POST(req: Request) {
  const { user, initData, roomId } = await req.json()

  if (!verifyTelegramHash(initData, BOT_TOKEN)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  let color = user.id % 2 === 0 ? "white" : "black"
  const room = joinRoom(roomId, { id: user.id, color })
  if (!room) {
    return new Response(JSON.stringify({ error: "Room not found or full" }), { status: 400 })
  }

  const takenColors = room.players.filter(p => p.color === color)
  if (takenColors.length > 1) {
    color = color === "white" ? "black" : "white"
    room.players[room.players.length - 1].color = color
  }

  return Response.json({ roomId: room.id, color })
}
