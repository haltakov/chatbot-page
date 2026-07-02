import type { ChatbotServerNotificationEvent, ChatbotServerNotifier } from "../notifications"
import type { ChatbotLiveReplyStore } from "../live-replies"

export type TelegramNotifierOptions = {
  botToken?: string
  chatId?: string
  siteName?: string
  apiBaseUrl?: string
  fetcher?: typeof fetch
  liveReplies?: {
    store: ChatbotLiveReplyStore
    authorName?: string
    stopCommand?: string
  }
}

export type TelegramNotifier = ChatbotServerNotifier

export type TelegramWebhookRegistrationOptions = {
  botToken?: string
  webhookUrl?: string
  secretToken?: string
  apiBaseUrl?: string
  allowedUpdates?: string[]
  dropPendingUpdates?: boolean
  fetcher?: typeof fetch
  maxConnections?: number
}

export type TelegramWebhookRegistrationResult =
  | {
      ok: true
      registered: true
      webhookUrl: string
    }
  | {
      ok: true
      registered: false
      skipped: "missing-bot-token" | "missing-webhook-url"
    }

export function createTelegramNotifier({
  botToken,
  chatId,
  siteName = "chatbot-page",
  apiBaseUrl = "https://api.telegram.org",
  fetcher = fetch,
  liveReplies,
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
          parse_mode: event.type === "prompt" ? "HTML" : undefined,
          disable_web_page_preview: true,
        }),
      })

      const body = await response.text()
      if (!response.ok) {
        throw new Error(`Telegram sendMessage failed with ${response.status}: ${body}`)
      }

      if (event.type === "prompt" && event.conversationId && liveReplies) {
        const message = readTelegramSendMessageResponse(body)
        if (message?.messageId !== undefined) {
          liveReplies.store.recordTelegramPromptMessage({
            chatId: message.chatId ?? chatId,
            messageId: message.messageId,
            conversationId: event.conversationId,
            visitorId: event.visitorId,
          })
        }
      }
    },
  }
}

export async function registerTelegramWebhook({
  botToken,
  webhookUrl,
  secretToken,
  apiBaseUrl = "https://api.telegram.org",
  allowedUpdates = ["message"],
  dropPendingUpdates,
  fetcher = fetch,
  maxConnections,
}: TelegramWebhookRegistrationOptions): Promise<TelegramWebhookRegistrationResult> {
  if (!botToken) {
    return {
      ok: true,
      registered: false,
      skipped: "missing-bot-token",
    }
  }

  const normalizedWebhookUrl = webhookUrl?.trim()
  if (!normalizedWebhookUrl) {
    return {
      ok: true,
      registered: false,
      skipped: "missing-webhook-url",
    }
  }

  const payload: Record<string, unknown> = {
    url: normalizedWebhookUrl,
    allowed_updates: allowedUpdates,
  }

  if (secretToken) payload.secret_token = secretToken
  if (dropPendingUpdates !== undefined) payload.drop_pending_updates = dropPendingUpdates
  if (maxConnections !== undefined) payload.max_connections = maxConnections

  const response = await fetcher(`${apiBaseUrl.replace(/\/$/, "")}/bot${botToken}/setWebhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const body = await response.text()
  if (!response.ok) {
    throw new Error(`Telegram setWebhook failed with ${response.status}: ${body}`)
  }

  if (!readTelegramOkResponse(body)) {
    throw new Error(`Telegram setWebhook returned an unexpected response: ${body}`)
  }

  return {
    ok: true,
    registered: true,
    webhookUrl: normalizedWebhookUrl,
  }
}

function formatTelegramMessage(
  event: ChatbotServerNotificationEvent,
  siteName: string,
): string {
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

  return formatTelegramPromptMessage(event)
}

function trimTelegramMessage(lines: Array<string | null>): string {
  const text = lines.filter((line): line is string => line !== null).join("\n")
  return text.length > 3900 ? `${text.slice(0, 3897)}...` : text
}

function formatTelegramPromptMessage(
  event: Extract<ChatbotServerNotificationEvent, { type: "prompt" }>,
): string {
  const prefix = `<b>${escapeTelegramHtml(event.visitorId)}</b>: `
  const header = event.conversationId
    ? `${escapeTelegramHtml(event.conversationId)}\n\n${prefix}`
    : prefix
  const promptBudget = Math.max(0, 3900 - header.length)

  return `${header}${escapeTelegramHtml(event.prompt, promptBudget)}`
}

function escapeTelegramHtml(value: string, maxLength = Number.POSITIVE_INFINITY): string {
  let escaped = ""

  for (const char of value) {
    const next =
      char === "&"
        ? "&amp;"
        : char === "<"
          ? "&lt;"
          : char === ">"
            ? "&gt;"
            : char

    if (escaped.length + next.length > maxLength) {
      return maxLength >= 3 ? `${escaped.slice(0, maxLength - 3)}...` : escaped
    }

    escaped += next
  }

  return escaped
}

function readTelegramSendMessageResponse(
  body: string,
): { messageId?: number; chatId?: string | number } | null {
  try {
    const payload = JSON.parse(body) as {
      result?: {
        message_id?: unknown
        chat?: {
          id?: unknown
        }
      }
    }
    const messageId = payload.result?.message_id
    if (typeof messageId !== "number") return null
    const chatId = payload.result?.chat?.id
    return {
      messageId,
      chatId:
        typeof chatId === "number" || typeof chatId === "string"
          ? chatId
          : undefined,
    }
  } catch {
    return null
  }
}

function readTelegramOkResponse(body: string): boolean {
  try {
    const payload = JSON.parse(body) as {
      ok?: unknown
    }
    return payload.ok === true
  } catch {
    return false
  }
}
