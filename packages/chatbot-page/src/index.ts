"use client"

export { ChatApp } from "./components/chat-app"
export { BotAvatar } from "./components/bot-avatar"
export { createApiAnswerProvider } from "./providers/api"
export { createCannedAnswerCollection, createCannedAnswerProvider } from "./providers/canned"
export {
  createApiNotificationProvider,
  getOrCreateVisitorId,
  sendChatbotNotification,
} from "./lib/notifications"
export {
  createBrowserKeyValueStore,
  createLocalStorageConversationStore,
} from "./lib/chat-store"
export type {
  ApiNotificationProviderOptions,
} from "./lib/notifications"
export type {
  ApiAnswerProviderOptions,
} from "./providers/api"
export type {
  CannedAnswerCollection,
  CannedAnswerEntry,
  CannedAnswerProviderOptions,
  KeywordMatch,
} from "./providers/canned"
export type {
  BotAvatarProps,
  ChatbotAnswerChunk,
  ChatbotAnswerContext,
  ChatbotAnswerProvider,
  ChatbotAnswerResult,
  ChatbotAnswerStream,
  ChatbotComponentSlots,
  ChatbotConfig,
  ChatbotContactConfig,
  ChatbotFirstLaunchConfig,
  ChatbotIdentity,
  ChatbotNotificationConfig,
  ChatbotNotificationEvent,
  ChatbotNotificationInput,
  ChatbotNotificationProvider,
  ChatbotPromptSource,
  ChatbotStorageConfig,
  ChatbotSuggestion,
  ChatbotUiConfig,
} from "./types"
export type {
  ChatbotConversationStore,
  ChatbotKeyValueStore,
  Conversation,
  Message,
  Role,
} from "./lib/chat-store"
