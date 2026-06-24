export class ChatbotRequestError extends Error {
  readonly status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "ChatbotRequestError"
    this.status = status
  }
}

export function createChatbotErrorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Chat request failed."
  const status = error instanceof ChatbotRequestError ? error.status : 500

  return Response.json(
    {
      error: message,
    },
    {
      status,
    },
  )
}
