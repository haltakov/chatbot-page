import type { ChatbotConfig, ResolvedChatbotConfig } from "./types"
import {
  createBrowserKeyValueStore,
  createLocalStorageConversationStore,
} from "./lib/chat-store"
import { createApiNotificationProvider } from "./lib/notifications"

const defaultUi = {
  askAgainLabel: "Ask me something else",
  composerPlaceholder: "Ask me anything...",
  disclaimer: "Answers are pre-written. Real AI chat is coming soon.",
  emptyConversationsLabel: "No conversations yet. Start a new chat.",
  newChatLabel: "New chat",
  responseDelayMs: 280,
  suggestionCount: 4,
  userLabel: "You",
}

const defaultContact = {
  buttonLabel: "Get in touch",
  title: "Get in touch",
  description: "",
  emailLabel: "Email",
  emailPlaceholder: "you@example.com",
  invalidEmailMessage: "Please enter a valid email address.",
  submitErrorMessage: "Could not send that yet. Please try again.",
  submitLabel: "Submit",
  successTitle: "Thanks for reaching out",
  doneLabel: "Done",
}

const defaultFirstLaunch = {
  title: "A personal website you can chat with",
  body: "",
  description:
    "Instead of browsing a static page, ask questions and get focused answers from curated content. Some sites can also connect this UI to an AI backend.",
  highlights: [
    "Start with one of the suggested questions.",
    "Type your own question when you want something specific.",
    "Use the sidebar to return to previous conversations.",
  ],
  dismissLabel: "Start chatting",
}

const defaultNotifications = {
  enabled: true,
  endpoint: "/api/chatbot-events",
}

const defaultLiveReplies = {
  enabled: true,
  endpoint: "/api/chatbot-live",
}

export function resolveConfig(config: ChatbotConfig): ResolvedChatbotConfig {
  const keyValueStore = config.storage?.keyValueStore ?? createBrowserKeyValueStore()
  const conversationsKey =
    config.storage?.conversationsKey ?? "chatbot-page:conversations:v1"
  const contact =
    config.ui?.contact === false
      ? false
      : {
          ...defaultContact,
          ...config.ui?.contact,
        }
  const firstLaunch =
    config.ui?.firstLaunch === false || config.ui?.firstLaunch === undefined
      ? false
      : {
          ...defaultFirstLaunch,
          ...config.ui.firstLaunch,
        }
  const notificationConfig = config.notifications
  const notifications =
    notificationConfig === undefined ||
    notificationConfig === false ||
    (typeof notificationConfig !== "function" && notificationConfig.enabled === false)
      ? false
      : {
          enabled: true as const,
          provider:
            typeof notificationConfig === "function"
              ? notificationConfig
              : notificationConfig.provider ??
                createApiNotificationProvider({
                  endpoint: notificationConfig.endpoint ?? defaultNotifications.endpoint,
                }),
        }
  const liveRepliesConfig = config.liveReplies
  const liveReplies =
    liveRepliesConfig === undefined ||
    liveRepliesConfig === false ||
    liveRepliesConfig.enabled === false
      ? false
      : {
          enabled: true as const,
          endpoint: liveRepliesConfig.endpoint ?? defaultLiveReplies.endpoint,
        }

  return {
    ...config,
    components: config.components ?? {},
    liveReplies,
    notifications,
    storage: {
      conversationsKey,
      conversationStore:
        config.storage?.conversationStore ??
        createLocalStorageConversationStore(conversationsKey, keyValueStore),
      firstLaunchKey: "chatbot-page:first-launch:v1",
      keyValueStore,
      themeKey: "chatbot-page:theme",
      visitorIdKey: "chatbot-page:visitor-id:v1",
      ...config.storage,
    },
    suggestions: config.suggestions ?? [],
    ui: {
      ...defaultUi,
      ...config.ui,
      contact,
      firstLaunch,
    },
  }
}
