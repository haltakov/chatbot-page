import {
  createChatbotErrorResponse,
  createChatbotSseResponse,
  createOpenAIResponsesProvider,
  createRateLimiter,
  getClientIp,
  readChatbotRequest,
  streamText,
} from "chatbot-page/server"
import { introMessage, persona } from "@/lib/chatbot-base-config"

// Per-instance limiter. For multi-instance/serverless, back this with a shared
// store (Redis/Upstash) instead.
const rateLimiter = createRateLimiter({ limit: 20, windowMs: 60_000 })

// Use the real OpenAI Responses provider when an API key is configured;
// otherwise fall back to the streaming placeholder so the example runs as-is.
const modelProvider = process.env.OPENAI_API_KEY
  ? createOpenAIResponsesProvider({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      instructions: `You are answering questions on ${persona.name}'s personal website. ${introMessage}\n\nBe concise, friendly, and only answer from what you know about ${persona.name}.`,
      vectorStoreIds: process.env.OPENAI_VECTOR_STORE_ID?.split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    })
  : null

export async function POST(request: Request) {
  try {
    rateLimiter.check(getClientIp(request))
    const chatRequest = await readChatbotRequest(request, { maxMessageLength: 4000 })

    if (modelProvider) {
      return createChatbotSseResponse(modelProvider.streamAnswer(chatRequest))
    }

    return createChatbotSseResponse(
      streamText(
        `This is a streaming backend placeholder for a real LLM/RAG response.\n\nYou asked: "${chatRequest.message}"\n\nSet OPENAI_API_KEY (see .env.example) to stream real answers through the OpenAI Responses provider. The UI is already calling this endpoint for questions that do not match a predefined answer.`,
        {
          chunkSize: 24,
          delayMs: 20,
        },
      ),
    )
  } catch (error) {
    return createChatbotErrorResponse(error)
  }
}
