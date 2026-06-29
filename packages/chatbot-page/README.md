# chatbot-page

Reusable React components for configurable chatbot-style pages.

```tsx
import { ChatApp, createCannedAnswerProvider } from "chatbot-page"
import "chatbot-page/styles.css"

const config = {
  identity: {
    name: "Vladimir Haltakov",
    title: "AI builder",
    handle: "haltakov",
  },
  introMessage: "Hi, I'm **Vladimir Haltakov**. Ask me anything.",
  suggestions: [{ id: "contact", question: "How can I get in touch?" }],
  answerProvider: createCannedAnswerProvider({
    answers: {
      contact: "Email me at [hello@example.com](mailto:hello@example.com).",
    },
  }),
}

export function Page() {
  return <ChatApp config={config} />
}
```

Use `createApiAnswerProvider({ endpoint: "/api/chat", stream: true })` to call a backend route for LLM or RAG-backed answers. The API provider supports streamed SSE responses as well as the older JSON `{ answer }` shape.

## Canned Answers

Use one Markdown file per question/answer pair:

```txt
content/chatbot/
  about.md
  projects.md
  contact.md
```

Each file uses frontmatter for metadata and Markdown body for the answer:

```md
---
id: about
question: Who is Vladimir Haltakov?
keywords:
  - about
  - vladimir
  - background
---

Vladimir Haltakov is an AI builder and computer vision engineer based in Munich.
```

Load the folder on the server:

```ts
import { join } from "node:path"
import { loadCannedAnswerDirectory } from "chatbot-page/server"

const cannedAnswers = await loadCannedAnswerDirectory(
  join(process.cwd(), "content", "chatbot"),
)
```

Then create the client provider from the parsed entries:

```tsx
"use client"

import {
  createCannedAnswerCollection,
  createCannedAnswerProvider,
} from "chatbot-page"

const canned = createCannedAnswerCollection(cannedAnswers)
const answerProvider = createCannedAnswerProvider({
  ...canned,
  fallbackProvider,
})
```

By default, canned answers are only used when a visitor clicks a suggested
question. Typed questions fall through to the fallback provider, even if they
match a canned question or keyword. If you want the old behavior for another
site, opt in with `matchInput: true`.

## First Launch Modal

Show a one-time explanation modal with `ui.firstLaunch`. The seen state is stored through the configured key-value store:

```ts
const config = {
  // ...
  storage: {
    firstLaunchKey: "my-site:first-launch:v1",
  },
  ui: {
    firstLaunch: {
      title: "This personal site works like a conversation",
      description:
        "Ask questions instead of browsing a traditional portfolio. Curated answers are shown first, and unknown questions can stream from an AI backend.",
      highlights: [
        "Start with a suggested question.",
        "Type your own question when you want something specific.",
        "Return to previous conversations from the sidebar.",
      ],
      dismissLabel: "Start chatting",
    },
  },
}
```

## Model providers

`chatbot-page/server` exposes `ChatbotModelProvider`. OpenAI Responses is only one implementation:

```ts
import {
  createChatbotErrorResponse,
  createChatbotSseResponse,
  createOpenAIResponsesProvider,
  readChatbotRequest,
} from "chatbot-page/server"

const modelProvider = createOpenAIResponsesProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  instructions: projectSystemPrompt,
  vectorStoreIds: process.env.OPENAI_VECTOR_STORE_ID?.split(",").filter(Boolean),
})

export async function POST(request: Request) {
  try {
    const chatRequest = await readChatbotRequest(request)
    return createChatbotSseResponse(modelProvider.streamAnswer(chatRequest))
  } catch (error) {
    return createChatbotErrorResponse(error)
  }
}
```

To use another model provider, implement `ChatbotModelProvider` and yield `text-delta` chunks:

```ts
const modelProvider = {
  async *streamAnswer(request) {
    yield { type: "text-delta", text: `You asked: ${request.message}` }
  },
}
```

## Input limits and rate limiting

`chatbot-page` validates request shape and input size, but it does not include
rate limiting. `readChatbotRequest` caps message length and history size and
throws `ChatbotRequestError` when a request is invalid. `createChatbotErrorResponse`
turns those errors into the right status, such as `400`:

```ts
import {
  createChatbotErrorResponse,
  createChatbotSseResponse,
  readChatbotRequest,
} from "chatbot-page/server"

export async function POST(request: Request) {
  try {
    const chatRequest = await readChatbotRequest(request, { maxMessageLength: 4000 })
    return createChatbotSseResponse(modelProvider.streamAnswer(chatRequest))
  } catch (error) {
    return createChatbotErrorResponse(error)
  }
}
```

You should add rate limiting at the deployment or application boundary for any
public site, especially for LLM-backed endpoints. Cloudflare, Vercel, a reverse
proxy, or a shared-store limiter such as Redis/Upstash are all reasonable places
to enforce this. Keeping it outside the package avoids shipping a per-instance
limiter that would look production-ready but fail across serverless or
multi-instance deployments.

## Notifications

Notifications are provider-based. The built-in API provider posts events to your route:

```ts
const config = {
  // ...
  notifications: {
    enabled: true,
    endpoint: "/api/chatbot-events",
  },
  storage: {
    visitorIdKey: "my-site:visitor-id:v1",
  },
}
```

You can also pass your own notification provider directly:

```ts
const config = {
  // ...
  notifications: async (event) => {
    await myAnalyticsOrWebhook.send(event)
  },
}
```

The client stores a persistent three-word visitor id, generated by `unique-names-generator`, in the configured key-value store.

Telegram is an optional server-side notifier implementation:

```ts
import {
  createChatbotErrorResponse,
  createTelegramNotifier,
  readChatbotEventRequest,
} from "chatbot-page/server"

export async function POST(request: Request) {
  try {
    const event = await readChatbotEventRequest(request)
    const notifier = createTelegramNotifier({
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID,
      siteName: "My Site",
    })

    await notifier.send(event)
    return Response.json({ ok: true })
  } catch (error) {
    return createChatbotErrorResponse(error)
  }
}
```

## Storage

By default, conversations, theme, and visitor id persistence use browser localStorage. Override either level:

```ts
const config = {
  // ...
  storage: {
    conversationStore: {
      async load() {
        return await loadConversationsSomewhere()
      },
      async save(conversations) {
        await saveConversationsSomewhere(conversations)
      },
    },
    keyValueStore: {
      async getItem(key) {
        return await loadValue(key)
      },
      async setItem(key, value) {
        await saveValue(key, value)
      },
    },
  },
}
```
