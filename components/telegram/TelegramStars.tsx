"use client"

import { useTelegram } from "./TelegramProvider"
import { Button } from "@/components/ui/button"
import { Star, Crown, Zap } from "lucide-react"

interface TelegramStarsProps {
  onPurchaseComplete?: (productId: string) => void
}

export function TelegramStars({ onPurchaseComplete }: TelegramStarsProps) {
  const { webApp, isTelegramWebApp, showAlert } = useTelegram()

  const products = [
    {
      id: "premium_themes",
      title: "Премиум темы",
      description: "Разблокировать все темы доски и шашек",
      price: 50,
      icon: <Crown className="w-5 h-5" />,
    },
    {
      id: "remove_ads",
      title: "Убрать рекламу",
      description: "Играть без рекламных баннеров",
      price: 100,
      icon: <Zap className="w-5 h-5" />,
    },
    {
      id: "premium_pack",
      title: "Премиум пакет",
      description: "Все премиум функции + эксклюзивные темы",
      price: 200,
      icon: <Star className="w-5 h-5" />,
    },
  ]

  const handlePurchase = async (productId: string, price: number) => {
    if (!isTelegramWebApp || !webApp) {
      showAlert("Покупки доступны только в Telegram Mini App")
      return
    }

    try {
      // This is a placeholder for Telegram Stars integration
      // In a real implementation, you would:
      // 1. Create an invoice URL on your backend
      // 2. Call webApp.openInvoice() with the invoice URL
      // 3. Handle the payment callback

      showAlert("Интеграция с Telegram Stars будет добавлена в следующем обновлении!")

      // Placeholder implementation:
      // const invoiceUrl = await createInvoice(productId, price)
      // webApp.openInvoice(invoiceUrl, (status) => {
      //   if (status === 'paid') {
      //     onPurchaseComplete?.(productId)
      //   }
      // })
    } catch (error) {
      console.error("Purchase error:", error)
      showAlert("Ошибка при покупке. Попробуйте позже.")
    }
  }

  if (!isTelegramWebApp) {
    return (
      <div className="text-center p-6 bg-amber-50 dark:bg-amber-950 rounded-lg">
        <Star className="w-12 h-12 mx-auto mb-4 text-amber-600" />
        <h3 className="text-lg font-semibold mb-2">Премиум функции</h3>
        <p className="text-sm text-muted-foreground">Премиум функции доступны в Telegram Mini App версии игры</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold mb-2 flex items-center justify-center gap-2">
          <Star className="w-6 h-6 text-amber-500" />
          Telegram Stars
        </h3>
        <p className="text-sm text-muted-foreground">Разблокируйте премиум функции</p>
      </div>

      <div className="grid gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg text-amber-600">{product.icon}</div>
              <div>
                <h4 className="font-semibold">{product.title}</h4>
                <p className="text-sm text-muted-foreground">{product.description}</p>
              </div>
            </div>
            <Button
              onClick={() => handlePurchase(product.id, product.price)}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              <Star className="w-4 h-4" />
              {product.price}
            </Button>
          </div>
        ))}
      </div>

      <div className="text-center text-xs text-muted-foreground mt-4">Платежи обрабатываются через Telegram Stars</div>
    </div>
  )
}
