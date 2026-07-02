import {
  createInMemoryChatbotLiveReplyStore,
  type ChatbotLiveReplyStore,
} from "chatbot-page/server"

declare global {
  // Keep live reply mappings through Next.js dev hot reloads.
  // eslint-disable-next-line no-var
  var __chatbotLiveReplyStore: ChatbotLiveReplyStore | undefined
}

export const chatbotLiveReplyStore =
  globalThis.__chatbotLiveReplyStore ?? createInMemoryChatbotLiveReplyStore()

globalThis.__chatbotLiveReplyStore = chatbotLiveReplyStore
