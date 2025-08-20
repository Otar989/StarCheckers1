import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { TelegramProvider } from "@/components/telegram/TelegramProvider"
import "./globals.css"

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
}

export const themeColor = "#000000"

export const metadata: Metadata = {
  title: "StarCheckers - Премиум шашки",
  description: "Красивая игра в шашки с ИИ, локальным и онлайн режимами",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <meta name="telegram-web-app" content="1" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Theme initialization before hydration
              (function() {
                const savedTheme = localStorage.getItem('starcheckers-color-theme');
                const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                
                if (savedTheme === 'dark' || (savedTheme === 'system' && systemDark) || (!savedTheme && systemDark)) {
                  document.documentElement.classList.add('dark');
                }
              })();

              // Telegram WebApp initialization
              if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.ready();
                window.Telegram.WebApp.expand();
                window.Telegram.WebApp.enableClosingConfirmation();
              }

              // Robust viewport height handling for iOS/Telegram WebView
              (function() {
                const setVh = () => {
                  const vh = window.innerHeight;
                  document.documentElement.style.setProperty('--app-vh', vh + 'px');
                };
                setVh();
                window.addEventListener('resize', setVh);
                if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.onEvent) {
                  window.Telegram.WebApp.onEvent('viewportChanged', setVh);
                }
              })();
            `,
          }}
        />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}

/* Safe-area и overscroll настраиваются в globals.css */

/* Telegram WebApp specific styles */
.telegram-webapp {
  /* Высота равна видимой области; safe-area уже учтены паддингами body */
  height: var(--app-vh, 100svh);
  overflow: hidden;
  -webkit-overflow-scrolling: touch;
}

/* Theme transition */
* {
  transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
}
        `}</style>
      </head>
      <body className="antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <TelegramProvider>
          <div className="telegram-webapp">{children}</div>
        </TelegramProvider>
      </body>
    </html>
  )
}
