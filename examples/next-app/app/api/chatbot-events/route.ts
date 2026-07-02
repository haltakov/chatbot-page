import {
  createChatbotErrorResponse,
  createTelegramNotifier,
  readChatbotEventRequest,
} from "chatbot-page/server"
import { chatbotLiveReplyStore } from "@/lib/chatbot-live-replies"

export async function POST(request: Request) {
  try {
    const event = await readChatbotEventRequest(request)
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!botToken || !chatId) {
      return Response.json({
        ok: true,
        skipped: "telegram-not-configured",
      })
    }

    const notifier = createTelegramNotifier({
      botToken,
      chatId,
      siteName: "chatbot-page example",
      liveReplies: {
        store: chatbotLiveReplyStore,
        authorName: "Real Vlad",
      },
    })

    await notifier.send(event)

    return Response.json({
      ok: true,
    })
  } catch (error) {
    return createChatbotErrorResponse(error)
  }
}
