import type { ComponentType } from "react"
import type {
  ChatbotConversationStore,
  ChatbotKeyValueStore,
  Conversation,
  Message,
} from "./lib/chat-store"
import type {
  ChatbotAnswerChunk,
  ChatbotAnswerStream,
  ChatbotNotificationEvent,
  ChatbotPromptSource,
} from "./shared"

// Re-export the shared protocol types so the public API surface is unchanged.
export type {
  ChatbotAnswerChunk,
  ChatbotAnswerStream,
  ChatbotNotificationEvent,
  ChatbotPromptSource,
}

export type ChatbotIdentity = {
  name: string
  title?: string
  handle?: string
}

export type ChatbotSuggestion = {
  id: string
  question: string
}

export type ChatbotAnswerContext = {
  conversation: Conversation
  messages: Message[]
  suggestions: ChatbotSuggestion[]
  source: ChatbotPromptSource
  suggestionId?: string
  /** Aborted when the user navigates away from the in-flight answer. */
  signal?: AbortSignal
}

export type ChatbotAnswerResult =
  | string
  | {
      content: string
    }
  | {
      stream: ChatbotAnswerStream
    }

export type ChatbotAnswerProvider = (
  input: string,
  context: ChatbotAnswerContext,
) => ChatbotAnswerResult | Promise<ChatbotAnswerResult>

export type BotAvatarProps = {
  identity: ChatbotIdentity
  className?: string
}

export type ChatbotComponentSlots = {
  BotAvatar?: ComponentType<BotAvatarProps>
}

export type ChatbotContactConfig = {
  buttonLabel?: string
  title?: string
  description?: string
  emailLabel?: string
  emailPlaceholder?: string
  invalidEmailMessage?: string
  submitErrorMessage?: string
  submitLabel?: string
  successTitle?: string
  doneLabel?: string
}

export type ChatbotFirstLaunchConfig = {
  body?: string
  title?: string
  description?: string
  highlights?: string[]
  dismissLabel?: string
}

export type ChatbotNotificationInput =
  | {
      type: "prompt"
      prompt: string
      source: ChatbotPromptSource
      suggestionId?: string
      conversationId?: string
    }
  | {
      type: "contact"
      email: string
    }

export type ChatbotNotificationProvider = (
  event: ChatbotNotificationEvent,
) => void | Promise<void>

export type ChatbotNotificationConfig =
  | false
  | ChatbotNotificationProvider
  | {
      enabled?: boolean
      endpoint?: string
      provider?: ChatbotNotificationProvider
    }

export type ChatbotUiConfig = {
  askAgainLabel?: string
  composerPlaceholder?: string
  contact?: false | ChatbotContactConfig
  disclaimer?: string
  emptyConversationsLabel?: string
  firstLaunch?: false | ChatbotFirstLaunchConfig
  newChatLabel?: string
  responseDelayMs?: number
  suggestionCount?: number
  userLabel?: string
}

export type ChatbotStorageConfig = {
  conversationsKey?: string
  conversationStore?: ChatbotConversationStore
  firstLaunchKey?: string
  keyValueStore?: ChatbotKeyValueStore
  themeKey?: string
  visitorIdKey?: string
}

export type ChatbotConfig = {
  identity: ChatbotIdentity
  introMessage: string
  suggestions?: ChatbotSuggestion[]
  answerProvider: ChatbotAnswerProvider
  components?: ChatbotComponentSlots
  notifications?: ChatbotNotificationConfig
  storage?: ChatbotStorageConfig
  ui?: ChatbotUiConfig
}

export type ResolvedChatbotConfig = Omit<
  ChatbotConfig,
  "components" | "notifications" | "storage" | "suggestions" | "ui"
> & {
  components: ChatbotComponentSlots
  notifications: false | {
    enabled: true
    provider: ChatbotNotificationProvider
  }
  storage: Required<ChatbotStorageConfig>
  suggestions: ChatbotSuggestion[]
  ui: Required<Omit<ChatbotUiConfig, "contact" | "firstLaunch">> & {
    contact: false | Required<ChatbotContactConfig>
    firstLaunch: false | Required<ChatbotFirstLaunchConfig>
  }
}
