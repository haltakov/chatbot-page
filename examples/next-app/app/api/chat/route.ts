import {
  ChatbotRequestError,
  createChatbotErrorResponse,
  createChatbotSseResponse,
  readChatbotRequest,
  streamText,
} from "chatbot-page/server"

export async function POST(request: Request) {
  try {
    const { message } = await readChatbotRequest(request)

    return createChatbotSseResponse(
      streamText(
        `This is a streaming backend placeholder for a real LLM/RAG response.\n\nYou asked: "${message}"\n\nWire this route to your model provider and retrieval pipeline when you are ready. The UI is already calling this endpoint for questions that do not match a predefined answer.`,
        {
          chunkSize: 24,
          delayMs: 20,
        },
      ),
    )
  } catch (error) {
    return createChatbotErrorResponse(
      error instanceof ChatbotRequestError ? error : new Error("Chat request failed."),
    )
  }
}
