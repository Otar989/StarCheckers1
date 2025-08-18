import crypto from "crypto"

export function verifyTelegramHash(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData)
  const hash = params.get("hash")
  if (!hash) return false
  params.delete("hash")

  const dataCheckString = Array.from(params.entries())
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n")

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest()

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex")

  return computedHash === hash
}
