// Telegram webhook handler: replies with a welcome message on /start
// This endpoint should be configured as the bot webhook URL in BotFather or via the provided set-webhook route.

type TelegramUser = {
  id: number
  is_bot?: boolean
  first_name?: string
  last_name?: string
  username?: string
}

type TelegramChat = {
  id: number
  type: string
}

type TelegramMessage = {
  message_id: number
  from?: TelegramUser
  chat: TelegramChat
  text?: string
}

type TelegramUpdate = {
  update_id: number
  message?: TelegramMessage
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""
const SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET || ""
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || ""

async function callTelegram(method: string, payload: unknown) {
  if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not configured")
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return res.json()
}

function buildAppUrl(origin: string): string {
  // Prefer explicit env; otherwise fall back to current site origin
  const url = APP_URL || origin
  // Ensure HTTPS for Telegram if a bare host is provided
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  return `https://${url}`
}

export async function POST(request: Request) {
  try {
    if (!BOT_TOKEN) {
      return new Response("Bot token missing", { status: 500 })
    }

    // Optional Telegram secret validation
    if (SECRET_TOKEN) {
      const header = request.headers.get("x-telegram-bot-api-secret-token")
      if (header !== SECRET_TOKEN) {
        return new Response("Forbidden", { status: 403 })
      }
    }

    const update = (await request.json()) as TelegramUpdate

    const msg = update.message
    if (!msg) return Response.json({ ok: true })

    const text = (msg.text || "").trim()
    if (text.startsWith("/start")) {
      // Extract start payload if present: "/start payload"
      const [, payload = ""] = text.split(/\s+/, 2)
      const name = msg.from?.first_name || msg.from?.username || "Игрок"

      // @ts-ignore - in Next.js runtime this may be NextRequest with nextUrl
      const origin = (request as any).nextUrl?.origin || ""
      const appUrl = buildAppUrl(origin)

      let welcome = `Привет, ${name}!\n\nДобро пожаловать в StarCheckers — премиальные русские шашки для Telegram.`
      if (payload) {
        welcome += `\n\nПараметр запуска: ${payload}`
      }
      welcome += "\n\nНажмите кнопку ниже, чтобы открыть игру. Удачи!"

      const replyMarkup: any = {
        inline_keyboard: [
          [
            {
              text: "Открыть игру",
              web_app: { url: appUrl },
            },
          ],
        ],
      }

      await callTelegram("sendMessage", {
        chat_id: msg.chat.id,
        text: welcome,
        parse_mode: "HTML",
        reply_markup: replyMarkup,
      })
    }

    // Always respond quickly to Telegram
    return Response.json({ ok: true })
  } catch (e) {
    console.error("telegram webhook error", e)
    // Still return 200 to avoid long retry loops — better to observe logs
    return new Response("Internal error", { status: 200 })
  }
}
