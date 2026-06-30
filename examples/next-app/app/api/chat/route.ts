import { join } from "node:path";
import {
  createChatbotErrorResponse,
  createChatbotSseResponse,
  createOpenAIResponsesProvider,
  loadMarkdownBody,
  readChatbotRequest,
  streamText,
} from "chatbot-page/server";
import { persona } from "@/lib/chatbot-base-config";

export async function POST(request: Request) {
  try {
    const chatRequest = await readChatbotRequest(request, {
      maxMessageLength: 4000,
      maxMessages: 24,
    });

    const modelProvider = await createModelProvider();

    if (modelProvider) {
      return createChatbotSseResponse(modelProvider.streamAnswer(chatRequest));
    }

    return createChatbotSseResponse(
      streamText(
        `This is a streaming backend placeholder for a real LLM/RAG response.\n\nYou asked: "${chatRequest.message}"\n\nSet OPENAI_API_KEY (see .env.example) to stream real answers through the OpenAI Responses provider. The UI is already calling this endpoint for questions that do not match a predefined answer.`,
        {
          chunkSize: 24,
          delayMs: 20,
        }
      )
    );
  } catch (error) {
    return createChatbotErrorResponse(error);
  }
}

async function createModelProvider() {
  if (!process.env.OPENAI_API_KEY) return null;

  const introMessage = await loadMarkdownBody(join(process.cwd(), "content", "intro.md"));

  return createOpenAIResponsesProvider({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION_ID,
    project: process.env.OPENAI_PROJECT_ID,
    model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
    instructions: `You are answering questions on ${persona.name}'s personal website. ${introMessage}\n\nBe concise, friendly, and only answer from what you know about ${persona.name}.`,
    vectorStoreIds: parseCsv(process.env.OPENAI_VECTOR_STORE_ID),
  });
}

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
