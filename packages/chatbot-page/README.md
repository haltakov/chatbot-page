# chatbot-page

Reusable React components for building a [chatbot-style homepage](https://github.com/haltakov/chatbot-page). Drop in `ChatApp`, give it a config, and choose where answers come from: canned Markdown, a real LLM, or a RAG vector store.

## Install

```bash
npm install chatbot-page
```

`react` and `react-dom` (18.3+ or 19) are peer dependencies.

## Basic concepts

- **`ChatApp`** — the full chat UI. It takes a single `config` object.
- **Answer providers** — where answers come from. Compose them: canned answers first, with an LLM as the fallback.
  - `createCannedAnswerProvider` — serves predefined answers.
  - `createApiAnswerProvider` — calls a backend route (`/api/chat`) for LLM/RAG answers, streaming over SSE.
- **Server helpers** — `chatbot-page/server` provides the pieces for that route: request parsing, an OpenAI Responses model provider, RAG via vector stores, and notifiers.

```tsx
import { ChatApp, createCannedAnswerProvider } from "chatbot-page";
import "chatbot-page/styles.css";

const config = {
  identity: { name: "Vladimir Haltakov", title: "AI builder", handle: "haltakov" },
  introMessage: "Hi, I'm **Vladimir Haltakov**. Ask me anything.",
  suggestions: [{ id: "contact", question: "How can I get in touch?" }],
  answerProvider: createCannedAnswerProvider({
    answers: { contact: "Email me at [hello@example.com](mailto:hello@example.com)." },
  }),
};

export function Page() {
  return <ChatApp config={config} />;
}
```

## Configuration

### Canned answers (Markdown)

Write one Markdown file per question, with frontmatter for metadata:

```md
---
id: about
question: Who is Vladimir Haltakov?
---

Vladimir Haltakov is an AI builder and computer vision engineer based in Munich.
```

Load the folder on the server and turn it into a provider:

```ts
import { loadCannedAnswerDirectory } from "chatbot-page/server";
const cannedAnswers = await loadCannedAnswerDirectory("content/chatbot");
```

```tsx
import { createCannedAnswerCollection, createCannedAnswerProvider } from "chatbot-page";

const canned = createCannedAnswerCollection(cannedAnswers);
const answerProvider = createCannedAnswerProvider({ ...canned, fallbackProvider });
```

Canned answers are only used when a visitor clicks a suggested question; typed questions fall through to the fallback.

### LLM + RAG (OpenAI)

In your `/api/chat` route, stream answers from the OpenAI Responses provider. Put the system prompt in an editable Markdown file and point the provider at it with `systemPromptPath`. Pass `vectorStoreIds` to enable RAG (file search over your documents):

```ts
import {
  createChatbotSseResponse,
  createChatbotErrorResponse,
  createOpenAIResponsesProvider,
  readChatbotRequest,
} from "chatbot-page/server";

const modelProvider = createOpenAIResponsesProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
  systemPromptPath: "content/system-prompt.md",
  vectorStoreIds: process.env.OPENAI_VECTOR_STORE_ID?.split(",").filter(Boolean),
});

export async function POST(request: Request) {
  try {
    const chatRequest = await readChatbotRequest(request, { maxMessageLength: 4000 });
    return createChatbotSseResponse(modelProvider.streamAnswer(chatRequest));
  } catch (error) {
    return createChatbotErrorResponse(error);
  }
}
```

#### System Prompt

The recommended setup is to keep the prompt outside your route code:

```md
<!-- content/system-prompt.md -->

You are answering questions on my personal website.

- Be concise, friendly, and concrete.
- Answer from the provided context when available.
- If you do not know, say so plainly.
```

Then configure the OpenAI provider with a path relative to your app root:

```ts
const modelProvider = createOpenAIResponsesProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
  systemPromptPath: "content/system-prompt.md",
});
```

`systemPromptPath` can also be an absolute path. If you prefer to keep the prompt somewhere else, pass `instructions` directly as a string, or pass an async `instructions(request)` function if your prompt comes from a CMS, database, or another runtime source. Use either `systemPromptPath` or `instructions`, not both.

To use a different model, implement `ChatbotModelProvider` and yield `text-delta` chunks. `readChatbotRequest` validates shape and input size — add rate limiting at your deployment boundary for public LLM-backed routes.

### Telegram notifications

Get notified when someone chats or leaves a contact email. Enable notifications in the config and handle the events in an `/api/chatbot-events` route:

```ts
const config = {
  // ...
  notifications: { enabled: true, endpoint: "/api/chatbot-events" },
};
```

```ts
import { createTelegramNotifier, readChatbotEventRequest } from "chatbot-page/server";

const notifier = createTelegramNotifier({
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID,
  siteName: "My Site",
});
await notifier.send(await readChatbotEventRequest(request));
```

To let a real person reply from Telegram, keep the in-memory live reply store in a shared server module, enable `liveReplies` in the client config, and wire a Telegram webhook:

```tsx
const config = {
  // ...
  notifications: { enabled: true, endpoint: "/api/chatbot-events" },
  liveReplies: { enabled: true, endpoint: "/api/chatbot-live" },
};
```

```ts
// lib/chatbot-live-replies.ts
import { createInMemoryChatbotLiveReplyStore } from "chatbot-page/server";

export const chatbotLiveReplyStore = createInMemoryChatbotLiveReplyStore();
```

```ts
// app/api/chatbot-events/route.ts
const notifier = createTelegramNotifier({
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID,
  liveReplies: {
    store: chatbotLiveReplyStore,
    authorName: "Real Vlad",
  },
});
await notifier.send(await readChatbotEventRequest(request));
```

```ts
// app/api/chatbot-live/route.ts
import { createChatbotLiveReplySseResponse } from "chatbot-page/server";

export async function GET(request: Request) {
  return createChatbotLiveReplySseResponse(request, chatbotLiveReplyStore);
}
```

```ts
// app/api/telegram-webhook/route.ts
import { handleTelegramOperatorWebhook } from "chatbot-page/server";

export async function POST(request: Request) {
  const result = await handleTelegramOperatorWebhook(request, {
    store: chatbotLiveReplyStore,
    chatId: process.env.TELEGRAM_CHAT_ID!,
    adminUserId: process.env.TELEGRAM_ADMIN_USER_ID,
    secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
    authorName: "Real Vlad",
  });

  return Response.json(result);
}
```

If your framework has a Node.js startup hook, you can register the Telegram webhook there instead of running `setWebhook` manually:

```ts
import { registerTelegramWebhook } from "chatbot-page/server";

await registerTelegramWebhook({
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
  secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
  allowedUpdates: ["message"],
});
```

Some startup hooks, including Next.js instrumentation, may also run in an Edge bundle. In that case, avoid importing the full `chatbot-page/server` entry from the startup file; use a tiny `fetch` helper like the Next example app does.

Prompt notifications use a compact reply-friendly format: the conversation id, a blank line, then the visitor id in bold followed by the prompt. Reply to that Telegram notification to publish a human message into the active browser chat over SSE. That conversation switches to operator mode, so subsequent visitor messages notify Telegram but do not call the AI provider; suggested questions are hidden while the operator is active. Reply `STOP` in Telegram to hand the conversation back to AI mode. Operator messages are labeled in the chat UI, with a green status dot while operator mode is active and a gray dot after handing back to AI. The default store is intentionally in-memory; use a durable store if you need multi-instance deployments or guaranteed delivery after restarts.

You can also pass any async function as `notifications` to send events to your own webhook or analytics.

### Other options

The `config` also supports a first-launch intro modal (`ui.firstLaunch`), a contact form (`ui.contact`), and pluggable storage (`storage`) — by default conversations, theme, and visitor id persist in `localStorage`. See the [example app](../../examples/next-app) for all of these wired together.

Suggested questions are randomly chosen from `config.suggestions`. The UI shows `4` suggestions by default; set `ui.suggestionCount` to change the maximum number shown.

## License

MIT
