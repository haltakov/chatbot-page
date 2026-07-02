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
- `TELEGRAM_WEBHOOK_URL` — optional, full public URL for this app's `/api/telegram-webhook`; when present, the app registers it with Telegram on startup.
- `TELEGRAM_WEBHOOK_SECRET` — optional but recommended, sent to Telegram as the webhook `secret_token`.
- `TELEGRAM_ADMIN_USER_ID` — optional, locks Telegram operator replies to your Telegram user id.

Telegram live replies are enabled in this example. Prompt notifications show the conversation id, then the visitor id in bold with their message; reply to that Telegram message to answer the visitor as `Real Vlad`. That conversation switches to human mode, so the next visitor messages notify Telegram but skip the AI route, and suggested questions are hidden. Reply `STOP` in Telegram to hand the conversation back to AI; the `Real Vlad` status dot turns gray after handoff.

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
app/api/chatbot-live/route.ts     Browser SSE endpoint — live Telegram replies
app/api/telegram-webhook/route.ts Telegram webhook endpoint — operator replies
lib/chatbot-live-replies.ts       In-memory live reply store
instrumentation.ts                Startup hook — registers the Telegram webhook
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
