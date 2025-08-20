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
const WELCOME_MEDIA = process.env.TELEGRAM_WELCOME_MEDIA // e.g. "/welcome.gif" or full URL
const WELCOME_MEDIA_TYPE = (process.env.TELEGRAM_WELCOME_MEDIA_TYPE || "animation").toLowerCase() as
  | "animation"
  | "photo"

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
      // Extract start payload if present: "/start payload" (не выводим теперь в тексте)
      const name = msg.from?.first_name || msg.from?.username || "Игрок"

      // @ts-ignore - in Next.js runtime this may be NextRequest with nextUrl
      const origin = (request as any).nextUrl?.origin || ""
      const appUrl = buildAppUrl(origin)

      const welcome = [
        `👋 Добро пожаловать в StarCheckers – премиум игру в шашки прямо в Telegram, ${name}!`,
        "",
        "✨ Здесь тебя ждёт:",
        "• 🤖 Игра с умным ИИ – от лёгкого до сложного уровня.",
        "• 👫 Локальная партия – играйте вдвоём на одном устройстве.",
        "• 🌍 Онлайн-режим – брось вызов друзьям или новым соперникам.",
        "• ⭐ Современный дизайн и плавный геймплей – максимум удовольствия от каждой партии.",
        "",
        "🎮 Начни игру уже сейчас и докажи, кто настоящий мастер шашек!",
        "",
        "👉 Нажми «Играть» и выбери режим.",
      ].join("\n")

      const replyMarkup: any = {
        inline_keyboard: [
          [
            {
              text: "Играть",
              web_app: { url: appUrl },
            },
          ],
        ],
      }

      // Формируем URL медиа. Если задан относительный путь (начинается с / или без схемы), подставляем домен приложения.
      const defaultPath = "/welcome.gif"
      const rawPath = WELCOME_MEDIA || defaultPath
      const mediaUrlRaw = rawPath.startsWith("http://") || rawPath.startsWith("https://")
        ? rawPath
        : `${appUrl}${rawPath.startsWith("/") ? "" : "/"}${rawPath}`
      // Encode to safely handle spaces/unicode in filenames
      const mediaUrl = encodeURI(mediaUrlRaw)
      const photoFallbackUrl = `${appUrl}/placeholder.jpg`

      let ok = false
      if (WELCOME_MEDIA_TYPE === "photo") {
        const resp = (await callTelegram("sendPhoto", {
          chat_id: msg.chat.id,
          photo: mediaUrl,
          caption: welcome,
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        })) as any
        ok = !!resp?.ok
      } else {
        // По умолчанию пробуем отправить как анимацию (GIF/MP4). Если ошибка — фолбэк на фото.
        const resp = (await callTelegram("sendAnimation", {
          chat_id: msg.chat.id,
          animation: mediaUrl,
          caption: welcome,
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        })) as any
        ok = !!resp?.ok
      }

      if (!ok) {
        await callTelegram("sendPhoto", {
          chat_id: msg.chat.id,
          photo: photoFallbackUrl,
          caption: welcome,
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        })
      }
    }

    // Always respond quickly to Telegram
    return Response.json({ ok: true })
  } catch (e) {
    console.error("telegram webhook error", e)
    // Still return 200 to avoid long retry loops — better to observe logs
    return new Response("Internal error", { status: 200 })
  }
}
