// Helper endpoint to set Telegram webhook to this deployment
// Call this route once after deploying (protect behind environment check)

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""
const SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET || ""
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || ""

function appOrigin(request: Request): string {
  // @ts-ignore - NextRequest exposes nextUrl
  const origin = (request as any).nextUrl?.origin || ""
  const base = APP_URL || origin
  if (base.startsWith("http://") || base.startsWith("https://")) return base
  return `https://${base}`
}

export async function POST(request: Request) {
  if (!BOT_TOKEN) return new Response("Bot token missing", { status: 500 })

  // Optionally restrict usage in production only
  if (process.env.NODE_ENV !== "production" && !process.env.ALLOW_SET_WEBHOOK_IN_DEV) {
    return new Response("Disabled in dev", { status: 403 })
  }

  const origin = appOrigin(request)
  const url = `${origin}/api/telegram/webhook`

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, secret_token: SECRET_TOKEN || undefined }),
  })

  const data = await res.json()
  return Response.json({ requested_url: url, result: data })
}

export async function GET(request: Request) {
  // Convenience GET to quickly set webhook
  return POST(request)
}
