import {
  createChatbotErrorResponse,
  createChatbotSseResponse,
  createOpenAIResponsesProvider,
  readChatbotRequest,
  streamText,
} from "chatbot-page/server";
import { chatbotLiveReplyStore } from "@/lib/chatbot-live-replies";

export async function POST(request: Request) {
  try {
    const chatRequest = await readChatbotRequest(request, {
      maxMessageLength: 4000,
      maxMessages: 24,
    });

    if (chatbotLiveReplyStore.isOperatorMode(chatRequest.conversationId)) {
      return createChatbotSseResponse(streamOperatorModeMetadata());
    }

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

async function* streamOperatorModeMetadata() {
  yield {
    type: "metadata" as const,
    liveMode: "operator",
  };
}

async function createModelProvider() {
  if (!process.env.OPENAI_API_KEY) return null;

  return createOpenAIResponsesProvider({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION_ID,
    project: process.env.OPENAI_PROJECT_ID,
    model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
    systemPromptPath: "content/system-prompt.md",
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
