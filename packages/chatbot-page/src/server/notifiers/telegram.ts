import type { ChatbotServerNotificationEvent, ChatbotServerNotifier } from "../notifications"

export type TelegramNotifierOptions = {
  botToken?: string
  chatId?: string
  siteName?: string
  apiBaseUrl?: string
  fetcher?: typeof fetch
}

export type TelegramNotifier = ChatbotServerNotifier

export function createTelegramNotifier({
  botToken,
  chatId,
  siteName = "chatbot-page",
  apiBaseUrl = "https://api.telegram.org",
  fetcher = fetch,
}: TelegramNotifierOptions): TelegramNotifier {
  return {
    async send(event) {
      if (!botToken || !chatId) {
        throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be configured.")
      }

      const response = await fetcher(`${apiBaseUrl.replace(/\/$/, "")}/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: formatTelegramMessage(event, siteName),
          disable_web_page_preview: true,
        }),
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Telegram sendMessage failed with ${response.status}: ${body}`)
      }
    },
  }
}

function formatTelegramMessage(event: ChatbotServerNotificationEvent, siteName: string): string {
  const date = new Date(event.createdAt)
  const createdAt = Number.isNaN(date.getTime()) ? event.createdAt : date.toISOString()

  if (event.type === "contact") {
    return trimTelegramMessage([
      `New chatbot contact - ${siteName}`,
      `Visitor: ${event.visitorId}`,
      `Email: ${event.email}`,
      `Time: ${createdAt}`,
      event.url ? `Page: ${event.url}` : null,
    ])
  }

  return trimTelegramMessage([
    `New chatbot prompt - ${siteName}`,
    `Visitor: ${event.visitorId}`,
    `Source: ${event.source}${event.suggestionId ? ` (${event.suggestionId})` : ""}`,
    event.conversationId ? `Conversation: ${event.conversationId}` : null,
    `Time: ${createdAt}`,
    event.url ? `Page: ${event.url}` : null,
    "",
    "Prompt:",
    event.prompt,
  ])
}

function trimTelegramMessage(lines: Array<string | null>): string {
  const text = lines.filter((line): line is string => line !== null).join("\n")
  return text.length > 3900 ? `${text.slice(0, 3897)}...` : text
}
