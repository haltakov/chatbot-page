# Chatbot Page

Configurable chatbot-style pages for personal sites, company pages, and future LLM/RAG-backed Q&A.

## Workspace

```txt
packages/chatbot-page   Reusable React package
examples/next-app       Next.js example app
```

## Development

```bash
pnpm install
pnpm build
pnpm dev
```

The example keeps the original canned-answer behavior for known questions. Unknown questions call `examples/next-app/app/api/chat/route.ts`, which now streams through the same API contract a real model and retrieval pipeline would use.

## Publishing

The package is published from `packages/chatbot-page` as `chatbot-page`.

Publishing is handled by GitHub Actions with npm trusted publishing. The
release workflow runs only for version tags:

```bash
corepack pnpm@10.0.0 install
corepack pnpm@10.0.0 run ci

# Update packages/chatbot-page/package.json first, then:
git tag v1.0.0
git push origin v1.0.0
```

Before using the workflow, configure npm trusted publishing for the package:

- package: `chatbot-page`
- repository: `haltakov/chatbot-page`
- workflow: `publish.yml`
- allowed action: `npm publish`

For the first release of a brand-new package name, npm may require an initial
manual publish or package setup before trusted publishing can be attached.
After that, pushing `vX.Y.Z` tags is the normal release path.

## Markdown Content

Canned answers live as one Markdown file per question in `content/chatbot`.

The first-launch modal can also be authored in Markdown:

```md
---
title: This personal site works like a conversation
dismissLabel: Start chatting
---

Instead of scrolling through a traditional portfolio, ask questions about the person, company, or product.

- Suggested questions are curated entry points.
- Answers can be written as simple Markdown files.
- The same UI can later connect to an LLM and RAG backend.
```

Load it on the server and pass it into `ui.firstLaunch`:

```ts
import { loadFirstLaunchMarkdown } from "chatbot-page/server"

const firstLaunch = await loadFirstLaunchMarkdown("content/first-launch.md")
```
