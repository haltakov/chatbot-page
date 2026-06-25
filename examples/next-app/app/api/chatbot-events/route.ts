import {
  createChatbotErrorResponse,
  createRateLimiter,
  createTelegramNotifier,
  getClientIp,
  readChatbotEventRequest,
} from "chatbot-page/server"

const eventRateLimiter = createRateLimiter({
  limit: 60,
  windowMs: 60_000,
  maxKeys: 10_000,
})

export async function POST(request: Request) {
  try {
    eventRateLimiter.check(getClientIp(request))
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
    })

    await notifier.send(event)

    return Response.json({
      ok: true,
    })
  } catch (error) {
    return createChatbotErrorResponse(error)
  }
}
