# Chatbot Page

An open source tool for building a personal or company homepage that works like a chatbot.

Instead of a traditional portfolio that visitors scroll through, they ask questions and get answers. You can see a live exampe on my personal page [haltakov.com](https://haltakov.com).

## What it does

Answers can come from three sources, mixed however you like:

- **Canned answers** — curated questions and answers written as Markdown files. Fast, free, and fully under your control.
- **A real LLM** — unknown questions stream through an actual model (OpenAI Responses out of the box, or your own provider).
- **A RAG vector store** — ground the model in your own documents so it answers from your real content instead of guessing.

It also ships with optional visitor notifications, live Telegram replies for human takeover, a contact form, conversation history, and a first-launch intro modal.

## Why it's useful

- A homepage that feels like a conversation is more engaging than yet another static portfolio.
- Start with canned answers only — no API keys, no cost — and add an LLM later when you want open-ended Q&A.
- Connect a vector store and visitors can ask anything about you, your company, or your product, answered from your own material.

Good for personal sites, company landing pages, product FAQs, and documentation front-ends.

## Repository

```txt
packages/chatbot-page   The reusable React package — see its README
examples/next-app       A working Next.js deployment — see its README
```

Read the [package README](packages/chatbot-page/README.md) to install and configure it in your own app, or the [example README](examples/next-app/README.md) to run a complete deployment locally.

## License

MIT
