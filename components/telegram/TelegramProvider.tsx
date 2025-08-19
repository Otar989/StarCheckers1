"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
}

interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    user?: TelegramUser
    chat_type?: string
  // присылается при открытии через deep-link ?startapp=...
  start_param?: string
    auth_date: number
    hash: string
  }
  version: string
  platform: string
  colorScheme: "light" | "dark"
  themeParams: {
    bg_color?: string
    text_color?: string
    hint_color?: string
    link_color?: string
    button_color?: string
    button_text_color?: string
  }
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  headerColor: string
  backgroundColor: string
  isClosingConfirmationEnabled: boolean
  ready: () => void
  expand: () => void
  close: () => void
  enableClosingConfirmation: () => void
  disableClosingConfirmation: () => void
  showPopup: (
    params: { title?: string; message: string; buttons?: Array<{ id?: string; type?: string; text: string }> },
    callback?: (buttonId: string) => void,
  ) => void
  showAlert: (message: string, callback?: () => void) => void
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void
  sendData: (data: string) => void
  switchInlineQuery: (query: string, choose_chat_types?: string[]) => void
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void
  openTelegramLink: (url: string) => void
  openInvoice: (url: string, callback?: (status: string) => void) => void
  setHeaderColor: (color: string) => void
  setBackgroundColor: (color: string) => void
  onEvent: (eventType: string, eventHandler: () => void) => void
  offEvent: (eventType: string, eventHandler: () => void) => void
}

interface TelegramContextType {
  webApp: TelegramWebApp | null
  user: TelegramUser | null
  initData: string | null
  isTelegramWebApp: boolean
  isReady: boolean
  colorScheme: "light" | "dark"
  startParam?: string | null
  showAlert: (message: string) => void
  showConfirm: (message: string) => Promise<boolean>
  hapticFeedback: (type: "light" | "medium" | "heavy" | "rigid" | "soft") => void
  shareInvite: (roomId: string) => void
}

const TelegramContext = createContext<TelegramContextType | null>(null)

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null)
  const [user, setUser] = useState<TelegramUser | null>(null)
  const [initData, setInitData] = useState<string | null>(null)
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [colorScheme, setColorScheme] = useState<"light" | "dark">("light")
  const [startParam, setStartParam] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tgWebApp = window.Telegram.WebApp
      setWebApp(tgWebApp)
      setIsTelegramWebApp(true)
      setUser(tgWebApp.initDataUnsafe.user || null)
      setInitData(tgWebApp.initData)
      // Пытаемся вытащить start_param из нескольких источников для надёжности
      let sp: string | null = (tgWebApp.initDataUnsafe as any)?.start_param || null
      if (!sp && typeof window !== 'undefined') {
        const qs = new URLSearchParams(window.location.search)
        sp = qs.get('tgWebAppStartParam') || qs.get('startapp') || null
        // Поддержим прямой проброс ?room=XXXX как start_param
        if (!sp && qs.get('room')) sp = `room_${qs.get('room')}`
      }
      setStartParam(sp)
      setColorScheme(tgWebApp.colorScheme)

      // Initialize Telegram WebApp
      tgWebApp.ready()
      tgWebApp.expand()
      tgWebApp.enableClosingConfirmation()

      // Set theme colors
      tgWebApp.setHeaderColor("#d97706")
      tgWebApp.setBackgroundColor("#fef3c7")

      setIsReady(true)

      // Listen for theme changes
      const handleThemeChanged = () => {
        setColorScheme(tgWebApp.colorScheme)
      }

      tgWebApp.onEvent("themeChanged", handleThemeChanged)

      return () => {
        tgWebApp.offEvent("themeChanged", handleThemeChanged)
      }
    } else {
      // Not in Telegram WebApp environment — читаем start_param из URL для дев-режима/браузера
      if (typeof window !== 'undefined') {
        const qs = new URLSearchParams(window.location.search)
        const sp = qs.get('tgWebAppStartParam') || qs.get('startapp') || (qs.get('room') ? `room_${qs.get('room')}` : null)
        setStartParam(sp)
      }
      setIsReady(true)
    }
  }, [])

  const showAlert = (message: string) => {
    if (webApp) {
      webApp.showAlert(message)
    } else {
      alert(message)
    }
  }

  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (webApp) {
        webApp.showConfirm(message, (confirmed) => {
          resolve(confirmed)
        })
      } else {
        resolve(confirm(message))
      }
    })
  }

  const hapticFeedback = (type: "light" | "medium" | "heavy" | "rigid" | "soft") => {
    if (webApp && "HapticFeedback" in webApp) {
      // @ts-ignore - HapticFeedback is available in newer versions
      webApp.HapticFeedback.impactOccurred(type)
    }
  }

  const shareInvite = (roomId: string) => {
    const code = roomId.toUpperCase()
  // Нормализуем username бота: удаляем ведущие '@', если они ошибочно указаны
  const botUsername = (process.env.NEXT_PUBLIC_TG_BOT_USERNAME || "").replace(/^@+/, "")
  // Прямая ссылка на Mini App по требованиям BotFather: t.me/<bot>/play
  const appLink = botUsername ? `https://t.me/${botUsername}/play` : ""
    // В startapp разрешены только A-Z, a-z, 0-9, _ и -, поэтому используем room_XXXX (без двоеточия)
    const deepLink = botUsername
      ? `https://t.me/${botUsername}/play?startapp=${encodeURIComponent(`room_${code}`)}`
      : ""
    const fallbackUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/?room=${code}`
      : ""

    // Формируем текст сообщения для Telegram «Переслать»:
    // 1) Кликабельный код (ссылка ведёт на deep-link в мини-приложение)
    // 2) Отдельная ссылка на приложение (t.me/бот)
    const lines: string[] = []
    if (deepLink) {
      lines.push(`КОД ДЛЯ ВХОДА: ${code}\nВойти по коду: ${deepLink}`)
      if (appLink) lines.push(`Открыть приложение: ${appLink}`)
    } else {
      // Фолбэк, если username бота неизвестен — отдаём веб-ссылку + код
      lines.push(`КОД ДЛЯ ВХОДА: ${code}\nВойти по коду: ${fallbackUrl}`)
    }
    const text = encodeURIComponent(lines.join("\n\n"))

    // Внутри Telegram открываем системный экран «Переслать»
    // В превью ставим ссылку на мини-апп (если есть), иначе — на веб-URL
    const previewUrl = encodeURIComponent(deepLink || appLink || fallbackUrl)
    const shareUrl = `https://t.me/share/url?url=${previewUrl}&text=${text}`
    try {
      if (webApp) {
        webApp.openTelegramLink(shareUrl)
      } else if ((navigator as any)?.share) {
        const payload = deepLink || fallbackUrl || `StarCheckers — код комнаты: ${code}`
        ;(navigator as any).share({ title: "StarCheckers", text: payload, url: deepLink || fallbackUrl || undefined }).catch(() => {})
      } else {
        const toCopy = deepLink || fallbackUrl || `StarCheckers — код комнаты: ${code}`
        navigator.clipboard.writeText(toCopy).then(() => {
          showAlert("Текст приглашения скопирован")
        })
      }
    } catch {
      // ignore
    }
  }

  return (
    <TelegramContext.Provider
      value={{
        webApp,
        user,
        initData,
        isTelegramWebApp,
        isReady,
        colorScheme,
  startParam,
        showAlert,
        showConfirm,
        hapticFeedback,
        shareInvite,
      }}
    >
      {children}
    </TelegramContext.Provider>
  )
}

export function useTelegram() {
  const context = useContext(TelegramContext)
  if (!context) {
    throw new Error("useTelegram must be used within a TelegramProvider")
  }
  return context
}
