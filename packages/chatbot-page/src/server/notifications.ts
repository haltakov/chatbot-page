import { ChatbotRequestError } from "./errors"

export type ChatbotServerNotificationEvent =
  | {
      type: "prompt"
      visitorId: string
      prompt: string
      source: "composer" | "suggestion"
      suggestionId?: string
      conversationId?: string
      url?: string
      createdAt: string
    }
  | {
      type: "contact"
      visitorId: string
      email: string
      url?: string
      createdAt: string
    }

export type ChatbotServerNotifier = {
  send(event: ChatbotServerNotificationEvent): Promise<void>
}

export type ChatbotEventRequest = ChatbotServerNotificationEvent

export async function readChatbotEventRequest(request: Request): Promise<ChatbotServerNotificationEvent> {
  let payload: Record<string, unknown>

  try {
    payload = (await request.json()) as Record<string, unknown>
  } catch {
    throw new ChatbotRequestError("Invalid JSON body.")
  }

  const type = payload.type
  const visitorId = readRequiredString(payload.visitorId, "visitorId")
  const createdAt = readOptionalString(payload.createdAt) ?? new Date().toISOString()
  const url = readOptionalString(payload.url)

  if (type === "prompt") {
    return {
      type,
      visitorId,
      prompt: readRequiredString(payload.prompt, "prompt"),
      source: payload.source === "suggestion" ? "suggestion" : "composer",
      suggestionId: readOptionalString(payload.suggestionId),
      conversationId: readOptionalString(payload.conversationId),
      url,
      createdAt,
    }
  }

  if (type === "contact") {
    const email = readRequiredString(payload.email, "email")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ChatbotRequestError("Invalid email.")
    }

    return {
      type,
      visitorId,
      email,
      url,
      createdAt,
    }
  }

  throw new ChatbotRequestError("Unsupported notification event type.")
}

function readRequiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ChatbotRequestError(`Missing ${name}.`)
  }

  return value.trim()
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}
