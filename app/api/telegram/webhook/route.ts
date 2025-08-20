// Telegram webhook handler: replies with a welcome message on /start
// This endpoint should be configured as the bot webhook URL in BotFather or via the provided set-webhook route.
import fs from "node:fs/promises"
import path from "node:path"
export const runtime = "nodejs"

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
const WELCOME_MEDIA = process.env.TELEGRAM_WELCOME_MEDIA // e.g. "/20250820_1340_Vibrant Checkers Animation_simple_compose_01k33h172wez8t29dg17ht1j00.mp4" or full URL
const WELCOME_MEDIA_TYPE = (process.env.TELEGRAM_WELCOME_MEDIA_TYPE || "animation").toLowerCase() as
  | "animation"
  | "photo"
  | "video"

async function callTelegram(method: string, payload: unknown) {
  if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not configured")
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return res.json()
}

async function callTelegramMultipart(method: string, formData: FormData) {
  if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not configured")
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    body: formData,
  })
  return res.json()
}

async function trySendLocalVideo(
  chatId: number,
  relativePath: string,
  caption: string,
  replyMarkup: any,
  field: "video" | "animation" = "video",
  mime: string = "video/mp4"
): Promise<boolean> {
  try {
    // works only for files under public/
    if (!relativePath.startsWith("/")) return false
    const fileAbs = path.join(process.cwd(), "public", relativePath.slice(1))
    const buf = await fs.readFile(fileAbs)
    const fileName = path.basename(fileAbs) || (field === "video" ? "welcome.mp4" : "welcome.gif")
    const form = new FormData()
    form.append("chat_id", String(chatId))
    form.append("caption", caption)
    form.append("parse_mode", "HTML")
    form.append("reply_markup", JSON.stringify(replyMarkup))
  const blob = new Blob([new Uint8Array(buf)], { type: mime })
    form.append(field, blob, fileName)
    const method = field === "video" ? "sendVideo" : "sendAnimation"
    const resp = (await callTelegramMultipart(method, form)) as any
    return !!resp?.ok
  } catch {
    return false
  }
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
  const defaultPath = "/20250820_1340_Vibrant Checkers Animation_simple_compose_01k33h172wez8t29dg17ht1j00.mp4"
      const rawPath = WELCOME_MEDIA || defaultPath
      const mediaUrlRaw = rawPath.startsWith("http://") || rawPath.startsWith("https://")
        ? rawPath
        : `${appUrl}${rawPath.startsWith("/") ? "" : "/"}${rawPath}`
      // Encode to safely handle spaces/unicode in filenames
      const mediaUrl = encodeURI(mediaUrlRaw)
      const lowerRaw = rawPath.toLowerCase()
      const isMp4 = lowerRaw.endsWith(".mp4") || lowerRaw.endsWith(".m4v") || lowerRaw.endsWith(".mov")
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
      } else if (WELCOME_MEDIA_TYPE === "animation") {
        // Предпочитаем отправку как анимацию, даже если это mp4
        // 1) Локальная загрузка в Telegram
        ok = await trySendLocalVideo(
          msg.chat.id,
          rawPath,
          welcome,
          replyMarkup,
          "animation",
          isMp4 ? "video/mp4" : "image/gif"
        )

        // 2) URL как анимация
        if (!ok) {
          const retryAnim = (await callTelegram("sendAnimation", {
            chat_id: msg.chat.id,
            animation: mediaUrl,
            caption: welcome,
            parse_mode: "HTML",
            reply_markup: replyMarkup,
          })) as any
          ok = !!retryAnim?.ok
        }

        // 3) Попытка как видео (иногда Telegram лучше принимает mp4 как video)
        if (!ok && isMp4) {
          const asVideo = (await callTelegram("sendVideo", {
            chat_id: msg.chat.id,
            video: mediaUrl,
            caption: welcome,
            parse_mode: "HTML",
            reply_markup: replyMarkup,
          })) as any
          ok = !!asVideo?.ok
        }
      } else if (WELCOME_MEDIA_TYPE === "video" || (!WELCOME_MEDIA_TYPE && isMp4)) {
        // 1) Сначала пробуем загрузить локально из public напрямую в Telegram (надежнее, не зависит от внешнего URL)
        ok = await trySendLocalVideo(msg.chat.id, rawPath, welcome, replyMarkup, "video", "video/mp4")

        // 2) Если не получилось — пробуем по URL как видео
        if (!ok) {
          const resp = (await callTelegram("sendVideo", {
            chat_id: msg.chat.id,
            video: mediaUrl,
            caption: welcome,
            parse_mode: "HTML",
            reply_markup: replyMarkup,
          })) as any
          ok = !!resp?.ok
        }

        // 3) Если видео не прошло — пробуем как анимацию
        if (!ok) {
          // Сначала локальная загрузка, затем URL
          ok = await trySendLocalVideo(msg.chat.id, rawPath, welcome, replyMarkup, "animation", isMp4 ? "video/mp4" : "image/gif")
          if (!ok) {
            const retryAnim = (await callTelegram("sendAnimation", {
              chat_id: msg.chat.id,
              animation: mediaUrl,
              caption: welcome,
              parse_mode: "HTML",
              reply_markup: replyMarkup,
            })) as any
            ok = !!retryAnim?.ok
          }
        }

        // 4) Если всё ещё не ок — пробуем запасной GIF из public
        if (!ok) {
          const fallbackAnim = encodeURI(`${appUrl}/welcome.gif`)
          const retryGif = (await callTelegram("sendAnimation", {
            chat_id: msg.chat.id,
            animation: fallbackAnim,
            caption: welcome,
            parse_mode: "HTML",
            reply_markup: replyMarkup,
          })) as any
          ok = !!retryGif?.ok
        }
  } else {
        // По умолчанию пробуем отправить как анимацию (GIF/MP4 без звука)
        const resp = (await callTelegram("sendAnimation", {
          chat_id: msg.chat.id,
          animation: mediaUrl,
          caption: welcome,
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        })) as any
        ok = !!resp?.ok

        if (!ok) {
          const fallbackAnim = encodeURI(`${appUrl}/welcome.gif`)
          const retry = (await callTelegram("sendAnimation", {
            chat_id: msg.chat.id,
            animation: fallbackAnim,
            caption: welcome,
            parse_mode: "HTML",
            reply_markup: replyMarkup,
          })) as any
          ok = !!retry?.ok
        }
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
