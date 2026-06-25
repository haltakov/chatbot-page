import { ChatbotRequestError } from "./errors"
import type { ChatbotServerMessage, ChatbotServerRequest } from "./types"

export type ReadChatbotRequestOptions = {
  /** Reject messages longer than this many characters (default 4000). */
  maxMessageLength?: number
  /** Keep at most this many history messages (default 50). */
  maxMessages?: number
}

const DEFAULT_MAX_MESSAGE_LENGTH = 4000
const DEFAULT_MAX_MESSAGES = 50

export async function readChatbotRequest(
  request: Request,
  options: ReadChatbotRequestOptions = {},
): Promise<ChatbotServerRequest> {
  const maxMessageLength = options.maxMessageLength ?? DEFAULT_MAX_MESSAGE_LENGTH
  const maxMessages = options.maxMessages ?? DEFAULT_MAX_MESSAGES

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
  if (message.length > maxMessageLength) {
    throw new ChatbotRequestError(`Message exceeds the ${maxMessageLength}-character limit.`)
  }

  return {
    message,
    messages: readMessages(payload.messages, maxMessages, maxMessageLength),
    previousResponseId:
      typeof payload.previousResponseId === "string"
        ? payload.previousResponseId
        : typeof payload.previous_response_id === "string"
          ? payload.previous_response_id
          : undefined,
  }
}

function readMessages(
  value: unknown,
  maxMessages: number,
  maxMessageLength: number,
): ChatbotServerMessage[] {
  if (!Array.isArray(value)) return []

  // Keep only the most recent messages so a client can't send unbounded history.
  return value.slice(-maxMessages).flatMap((message): ChatbotServerMessage[] => {
    if (!message || typeof message !== "object") return []
    const data = message as Record<string, unknown>
    const role = data.role === "assistant" ? "assistant" : data.role === "user" ? "user" : null
    const content = typeof data.content === "string" ? data.content.slice(0, maxMessageLength) : ""

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
