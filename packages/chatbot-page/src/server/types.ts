export type ChatbotServerMessage = {
  id?: string
  role: "user" | "assistant"
  content: string
  createdAt?: number
}

export type ChatbotServerRequest = {
  message: string
  messages: ChatbotServerMessage[]
  previousResponseId?: string
}

export type ChatbotServerAnswerChunk =
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

export type ChatbotServerAnswerStream = AsyncIterable<ChatbotServerAnswerChunk>

export type ChatbotModelProvider = {
  streamAnswer(request: ChatbotServerRequest): ChatbotServerAnswerStream | Promise<ChatbotServerAnswerStream>
}

export type ChatbotModelConnector = ChatbotModelProvider

export type ChatbotSseResponseOptions = ResponseInit & {
  headers?: HeadersInit
}
