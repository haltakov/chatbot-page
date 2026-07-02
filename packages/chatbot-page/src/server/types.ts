import type { ChatbotAnswerChunk, ChatbotAnswerStream } from "../shared"

export type ChatbotServerMessage = {
  id?: string
  role: "user" | "assistant"
  content: string
  createdAt?: number
}

export type ChatbotServerRequest = {
  message: string
  messages: ChatbotServerMessage[]
  conversationId?: string
  previousResponseId?: string
}

// The client and server speak the same answer-chunk protocol; these aliases
// keep the server-facing names while sharing a single definition.
export type ChatbotServerAnswerChunk = ChatbotAnswerChunk

export type ChatbotServerAnswerStream = ChatbotAnswerStream

export type ChatbotModelProvider = {
  streamAnswer(request: ChatbotServerRequest): ChatbotServerAnswerStream | Promise<ChatbotServerAnswerStream>
}

export type ChatbotModelConnector = ChatbotModelProvider

export type ChatbotSseResponseOptions = ResponseInit & {
  headers?: HeadersInit
}
