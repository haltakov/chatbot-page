"use client"

import {
  ChatApp,
  createApiAnswerProvider,
  createCannedAnswerCollection,
  createCannedAnswerProvider,
  type CannedAnswerEntry,
  type ChatbotConfig,
  type ChatbotFirstLaunchConfig,
} from "chatbot-page"
import { introMessage, persona } from "@/lib/chatbot-base-config"

const llmPlaceholderProvider = createApiAnswerProvider({
  endpoint: "/api/chat",
  stream: true,
})

export function ExampleChatbot({
  cannedAnswers,
  firstLaunch,
}: {
  cannedAnswers: CannedAnswerEntry[]
  firstLaunch: ChatbotFirstLaunchConfig
}) {
  const canned = createCannedAnswerCollection(cannedAnswers)

  const chatbotConfig: ChatbotConfig = {
    identity: {
      name: persona.name,
      title: persona.title,
      handle: persona.handle,
    },
    introMessage,
    suggestions: canned.suggestions,
    notifications: {
      enabled: true,
      endpoint: "/api/chatbot-events",
    },
    answerProvider: createCannedAnswerProvider({
      ...canned,
      fallbackProvider: llmPlaceholderProvider,
    }),
    storage: {
      conversationsKey: "chatbot-page:example:conversations:v3",
      firstLaunchKey: "chatbot-page:example:first-launch:v3",
      themeKey: "chatbot-page:example:theme",
      visitorIdKey: "chatbot-page:example:visitor-id:v1",
    },
    ui: {
      contact: {
        buttonLabel: "Connect",
        title: "Connect with Vladimir",
        description: "Leave an email address and the example notification route will receive it.",
        emailLabel: "Email",
        emailPlaceholder: "you@example.com",
        submitLabel: "Send",
        successTitle: "Thanks, I got it",
      },
      disclaimer:
        "Markdown answers are used first. Unknown questions stream from the LLM/RAG API route. Prompts can be sent to the optional notification endpoint.",
      firstLaunch,
    },
  }

  return <ChatApp config={chatbotConfig} />
}
