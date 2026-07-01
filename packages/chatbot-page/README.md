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

In your `/api/chat` route, stream answers from the OpenAI Responses provider. Pass `vectorStoreIds` to enable RAG (file search over your documents):

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

Put the editable prompt in `content/system-prompt.md`:

```md
You are answering questions on my personal website.

- Be concise, friendly, and concrete.
- Answer from the provided context when available.
- If you do not know, say so plainly.
```

You can also pass `instructions` directly, or pass an async `instructions` function if your prompt comes from a CMS or database. Use either `systemPromptPath` or `instructions`, not both.

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

You can also pass any async function as `notifications` to send events to your own webhook or analytics.

### Other options

The `config` also supports a first-launch intro modal (`ui.firstLaunch`), a contact form (`ui.contact`), and pluggable storage (`storage`) — by default conversations, theme, and visitor id persist in `localStorage`. See the [example app](../../examples/next-app) for all of these wired together.

Suggested questions are randomly chosen from `config.suggestions`. The UI shows `4` suggestions by default; set `ui.suggestionCount` to change the maximum number shown.

## License

MIT
