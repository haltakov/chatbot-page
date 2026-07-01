# Chatbot Page — Next.js example

A complete, working deployment of [`chatbot-page`](../../packages/chatbot-page). It serves canned Markdown answers first and streams from a real LLM (with optional RAG) for everything else. Use it as a starting point for your own site.

## Run it

From the repo root (this builds the package, then starts the package watcher and this app):

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000.

It runs as-is with no API keys: unknown questions stream a placeholder response. To enable the real backend, copy `.env.example` to `.env.local` and fill in the keys below.

## Configuration

Copy `.env.example` to `.env.local`:

- `OPENAI_API_KEY` — enables real LLM answers via the OpenAI Responses provider.
- `OPENAI_MODEL` — optional, defaults to `gpt-5.4-mini`.
- `OPENAI_VECTOR_STORE_ID` — optional, comma-separated vector store IDs to enable RAG.
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` — optional, to receive chat and contact notifications.

## Main components

```txt
content/chatbot/*.md          Canned answers, one Markdown file per question
content/intro.md              First assistant message shown in every new chat
content/first-launch.md       Intro modal shown on first visit
content/system-prompt.md      LLM instructions used by the OpenAI backend
lib/chatbot-base-config.ts    Persona (name, title, handle)
app/page.tsx                  Server component: loads Markdown, renders the chatbot
app/chatbot.tsx               Client component: builds the ChatApp config
app/api/chat/route.ts         LLM/RAG endpoint — OpenAI Responses, or a placeholder
app/api/chatbot-events/route.ts   Notification endpoint — Telegram
```

The flow: `page.tsx` loads the intro message, canned answers, and first-launch content on the server and passes them to `chatbot.tsx`, which assembles the `ChatApp` config. Canned answers are tried first; anything unmatched is sent to `/api/chat`, which streams from OpenAI when a key is set and from a placeholder otherwise.

To make it yours, edit the Markdown in `content/`, the persona in `lib/chatbot-base-config.ts`, and the LLM prompt in `content/system-prompt.md`.

## System prompt

The OpenAI route uses the library's editable-prompt convention:

```ts
createOpenAIResponsesProvider({
  // ...
  systemPromptPath: "content/system-prompt.md",
});
```

Change `content/system-prompt.md` to control how the LLM answers fallback questions. Keep canned answers in `content/chatbot/*.md`; canned answers are only used when a visitor clicks a suggested question.
