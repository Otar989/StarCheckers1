import { verifyTelegramHash } from "@/lib/telegram-auth"
import { createRoom, findMatch } from "@/lib/room-store"
import type { GameMode } from "@/types/game-config"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""

export async function POST(req: Request) {
  try {
    const { user, mode } = await req.json() as { user: any, mode: GameMode }
    
    if (BOT_TOKEN && user?.initData && !verifyTelegramHash(user.initData, BOT_TOKEN)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    let roomId: string;
    let color: "white" | "black";

    if (mode === 'matchmaking') {
      // Для случайного матчинга
      const matchResult = findMatch(user?.id || Date.now());
      if (!matchResult) {
        console.error('No match found for user:', user?.id);
        return new Response(JSON.stringify({ error: "No match found" }), { status: 404 });
      }
      roomId = matchResult;
      color = (Date.now() % 2 === 0) ? "white" : "black";
    } else {
      // Для создания новой игры
      const userId = user?.id || Date.now();
      const room = createRoom({ 
        id: userId,
        color: (userId % 2 === 0) ? "white" : "black"
      });
      if (!room) {
        console.error('Failed to create room for user:', userId);
        return new Response(JSON.stringify({ error: "Failed to create room" }), { status: 500 });
      }
      roomId = room.id;
      color = (userId % 2 === 0) ? "white" : "black";
    }

    return Response.json({ roomId, color })
  } catch (error) {
    console.error('Error creating game:', error)
    return Response.json({ error: "Failed to create game" }, { status: 500 })
  }
}
