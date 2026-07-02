import {
  createChatbotErrorResponse,
  handleTelegramOperatorWebhook,
} from "chatbot-page/server"
import { chatbotLiveReplyStore } from "@/lib/chatbot-live-replies"

export async function POST(request: Request) {
  try {
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!chatId) {
      return Response.json({
        ok: true,
        skipped: "telegram-not-configured",
      })
    }

    const result = await handleTelegramOperatorWebhook(request, {
      store: chatbotLiveReplyStore,
      chatId,
      adminUserId: process.env.TELEGRAM_ADMIN_USER_ID,
      secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
      authorName: "Real Vlad",
    })

    return Response.json(result)
  } catch (error) {
    return createChatbotErrorResponse(error)
  }
}
