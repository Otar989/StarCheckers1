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
  isTelegramWebApp: boolean
  isReady: boolean
  colorScheme: "light" | "dark"
  showAlert: (message: string) => void
  showConfirm: (message: string) => Promise<boolean>
  hapticFeedback: (type: "light" | "medium" | "heavy" | "rigid" | "soft") => void
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
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [colorScheme, setColorScheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tgWebApp = window.Telegram.WebApp
      setWebApp(tgWebApp)
      setIsTelegramWebApp(true)
      setUser(tgWebApp.initDataUnsafe.user || null)
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
      // Not in Telegram WebApp environment
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

  return (
    <TelegramContext.Provider
      value={{
        webApp,
        user,
        isTelegramWebApp,
        isReady,
        colorScheme,
        showAlert,
        showConfirm,
        hapticFeedback,
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
