import { ChatbotRequestError } from "./errors"
import type { ChatbotServerMessage, ChatbotServerRequest } from "./types"

export async function readChatbotRequest(request: Request): Promise<ChatbotServerRequest> {
  let payload: Record<string, unknown>

  try {
    payload = (await request.json()) as Record<string, unknown>
  } catch {
    throw new ChatbotRequestError("Invalid JSON body.")
  }

  const message =
    typeof payload.message === "string"
      ? payload.message.trim()
      : typeof payload.input === "string"
        ? payload.input.trim()
        : ""

  if (!message) throw new ChatbotRequestError("Missing message.")

  return {
    message,
    messages: readMessages(payload.messages),
    previousResponseId:
      typeof payload.previousResponseId === "string"
        ? payload.previousResponseId
        : typeof payload.previous_response_id === "string"
          ? payload.previous_response_id
          : undefined,
  }
}

function readMessages(value: unknown): ChatbotServerMessage[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((message): ChatbotServerMessage[] => {
    if (!message || typeof message !== "object") return []
    const data = message as Record<string, unknown>
    const role = data.role === "assistant" ? "assistant" : data.role === "user" ? "user" : null
    const content = typeof data.content === "string" ? data.content : ""

    if (!role || !content) return []

    return [
      {
        id: typeof data.id === "string" ? data.id : undefined,
        role,
        content,
        createdAt: typeof data.createdAt === "number" ? data.createdAt : undefined,
      },
    ]
  })
}
