import {
  createChatbotErrorResponse,
  createChatbotLiveReplySseResponse,
} from "chatbot-page/server"
import { chatbotLiveReplyStore } from "@/lib/chatbot-live-replies"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    return createChatbotLiveReplySseResponse(request, chatbotLiveReplyStore)
  } catch (error) {
    return createChatbotErrorResponse(error)
  }
}
