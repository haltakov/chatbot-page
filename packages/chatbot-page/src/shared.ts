// Types shared between the client entry (`.`) and the server entry (`./server`).
// This module is pure types only — it has no runtime and no client/server
// coupling, so both bundles can import it without pulling code across the
// boundary.

export type ChatbotAnswerChunk =
  | string
  | {
      type: "text-delta"
      text: string
    }
  | {
      type: "metadata"
      [key: string]: unknown
    }
  | {
      type: "done"
    }
  | {
      type: "error"
      error: string
    }

export type ChatbotAnswerStream = AsyncIterable<ChatbotAnswerChunk>

export type ChatbotPromptSource = "composer" | "suggestion"

export type ChatbotLiveMode = "ai" | "operator"

export type ChatbotLiveEvent =
  | {
      type: "operator-message"
      conversationId: string
      text: string
      authorName: string
      createdAt: string
      source: "telegram"
      telegramMessageId?: string
      visitorId?: string
    }
  | {
      type: "mode"
      conversationId: string
      mode: ChatbotLiveMode
      createdAt: string
    }

export type ChatbotNotificationEvent =
  | {
      type: "prompt"
      visitorId: string
      prompt: string
      source: ChatbotPromptSource
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
