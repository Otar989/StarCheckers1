import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { TelegramProvider } from "@/components/telegram/TelegramProvider"
import "./globals.css"

export const metadata: Metadata = {
  title: "StarCheckers - Премиум русские шашки",
  description: "Красивая игра в русские шашки с ИИ, локальным и онлайн режимами",
  generator: "v0.app",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
  themeColor: "#d97706",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "StarCheckers",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru">
      <head>
        <meta name="telegram-web-app" content="1" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Telegram WebApp initialization
              if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.ready();
                window.Telegram.WebApp.expand();
                window.Telegram.WebApp.enableClosingConfirmation();
              }
            `,
          }}
        />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}

/* Telegram Mini App safe areas */
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* Prevent overscroll on iOS */
body {
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;
}

/* Telegram WebApp specific styles */
.telegram-webapp {
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}
        `}</style>
      </head>
      <body className="antialiased">
        <TelegramProvider>
          <div className="telegram-webapp">{children}</div>
        </TelegramProvider>
      </body>
    </html>
  )
}
