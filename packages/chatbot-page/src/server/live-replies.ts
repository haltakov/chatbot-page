import { ChatbotRequestError } from "./errors"
import type { ChatbotLiveEvent, ChatbotLiveMode } from "../shared"

export type ChatbotTelegramConversationLink = {
  chatId: string
  messageId: string
  conversationId: string
  visitorId?: string
}

export type RecordTelegramPromptMessageInput = {
  chatId: string | number
  messageId: string | number
  conversationId: string
  visitorId?: string
}

export type PublishOperatorReplyInput = {
  conversationId: string
  text: string
  authorName?: string
  createdAt?: string
  source?: "telegram"
  telegramMessageId?: string | number
  visitorId?: string
}

export type SetLiveModeInput = {
  conversationId: string
  mode: ChatbotLiveMode
  createdAt?: string
}

export type SubscribeToLiveRepliesOptions = {
  visitorId?: string
}

export type ChatbotLiveReplyStore = {
  recordTelegramPromptMessage(input: RecordTelegramPromptMessageInput): void
  findConversationByTelegramReply(input: {
    chatId: string | number
    replyToMessageId: string | number
  }): ChatbotTelegramConversationLink | null
  publishOperatorReply(input: PublishOperatorReplyInput): ChatbotLiveEvent
  setMode(input: SetLiveModeInput): ChatbotLiveEvent
  getMode(conversationId: string): ChatbotLiveMode
  isOperatorMode(conversationId: string | undefined): boolean
  subscribe(
    conversationId: string,
    listener: (event: ChatbotLiveEvent) => void,
    options?: SubscribeToLiveRepliesOptions,
  ): () => void
}

export type CreateInMemoryChatbotLiveReplyStoreOptions = {
  maxConversations?: number
  maxTelegramLinks?: number
}

type ConversationState = {
  mode: ChatbotLiveMode
  visitorId?: string
  listeners: Set<(event: ChatbotLiveEvent) => void>
  updatedAt: number
}

const DEFAULT_MAX_CONVERSATIONS = 500
const DEFAULT_MAX_TELEGRAM_LINKS = 1000

export function createInMemoryChatbotLiveReplyStore(
  options: CreateInMemoryChatbotLiveReplyStoreOptions = {},
): ChatbotLiveReplyStore {
  return new InMemoryChatbotLiveReplyStore(options)
}

class InMemoryChatbotLiveReplyStore implements ChatbotLiveReplyStore {
  private conversations = new Map<string, ConversationState>()
  private telegramLinks = new Map<string, ChatbotTelegramConversationLink>()
  private maxConversations: number
  private maxTelegramLinks: number

  constructor({
    maxConversations = DEFAULT_MAX_CONVERSATIONS,
    maxTelegramLinks = DEFAULT_MAX_TELEGRAM_LINKS,
  }: CreateInMemoryChatbotLiveReplyStoreOptions = {}) {
    this.maxConversations = maxConversations
    this.maxTelegramLinks = maxTelegramLinks
  }

  recordTelegramPromptMessage({
    chatId,
    messageId,
    conversationId,
    visitorId,
  }: RecordTelegramPromptMessageInput): void {
    const normalizedConversationId = normalizeId(conversationId)
    if (!normalizedConversationId) return

    const state = this.getOrCreateConversation(normalizedConversationId)
    if (visitorId) state.visitorId = visitorId
    state.updatedAt = Date.now()

    this.telegramLinks.set(createTelegramLinkKey(chatId, messageId), {
      chatId: String(chatId),
      messageId: String(messageId),
      conversationId: normalizedConversationId,
      visitorId,
    })
    this.prune()
  }

  findConversationByTelegramReply({
    chatId,
    replyToMessageId,
  }: {
    chatId: string | number
    replyToMessageId: string | number
  }): ChatbotTelegramConversationLink | null {
    return this.telegramLinks.get(createTelegramLinkKey(chatId, replyToMessageId)) ?? null
  }

  publishOperatorReply({
    conversationId,
    text,
    authorName = "Real Vlad",
    createdAt = new Date().toISOString(),
    source = "telegram",
    telegramMessageId,
    visitorId,
  }: PublishOperatorReplyInput): ChatbotLiveEvent {
    const normalizedConversationId = normalizeRequiredId(conversationId, "conversationId")
    const trimmedText = text.trim()
    if (!trimmedText) throw new ChatbotRequestError("Missing operator reply text.")

    const state = this.getOrCreateConversation(normalizedConversationId)
    state.mode = "operator"
    if (visitorId) state.visitorId = visitorId
    state.updatedAt = Date.now()

    const event: ChatbotLiveEvent = {
      type: "operator-message",
      conversationId: normalizedConversationId,
      text: trimmedText,
      authorName,
      createdAt,
      source,
      telegramMessageId: telegramMessageId === undefined ? undefined : String(telegramMessageId),
      visitorId: visitorId ?? state.visitorId,
    }
    this.publish(event)
    this.prune()
    return event
  }

  setMode({
    conversationId,
    mode,
    createdAt = new Date().toISOString(),
  }: SetLiveModeInput): ChatbotLiveEvent {
    const normalizedConversationId = normalizeRequiredId(conversationId, "conversationId")
    const state = this.getOrCreateConversation(normalizedConversationId)
    state.mode = mode
    state.updatedAt = Date.now()

    const event: ChatbotLiveEvent = {
      type: "mode",
      conversationId: normalizedConversationId,
      mode,
      createdAt,
    }
    this.publish(event)
    this.prune()
    return event
  }

  getMode(conversationId: string): ChatbotLiveMode {
    return this.conversations.get(conversationId)?.mode ?? "ai"
  }

  isOperatorMode(conversationId: string | undefined): boolean {
    return !!conversationId && this.getMode(conversationId) === "operator"
  }

  subscribe(
    conversationId: string,
    listener: (event: ChatbotLiveEvent) => void,
    options: SubscribeToLiveRepliesOptions = {},
  ): () => void {
    const normalizedConversationId = normalizeRequiredId(conversationId, "conversationId")
    const state = this.getOrCreateConversation(normalizedConversationId)
    if (options.visitorId) state.visitorId = options.visitorId
    state.updatedAt = Date.now()
    state.listeners.add(listener)

    return () => {
      state.listeners.delete(listener)
      state.updatedAt = Date.now()
    }
  }

  private getOrCreateConversation(conversationId: string): ConversationState {
    let state = this.conversations.get(conversationId)
    if (!state) {
      state = {
        mode: "ai",
        listeners: new Set(),
        updatedAt: Date.now(),
      }
      this.conversations.set(conversationId, state)
    }
    return state
  }

  private publish(event: ChatbotLiveEvent): void {
    const state = this.conversations.get(event.conversationId)
    if (!state) return
    for (const listener of state.listeners) {
      try {
        listener(event)
      } catch {
        // A client can disconnect between publish and enqueue.
      }
    }
  }

  private prune(): void {
    pruneOldest(this.telegramLinks, this.maxTelegramLinks)

    if (this.conversations.size <= this.maxConversations) return
    const stale = [...this.conversations.entries()]
      .filter(([, state]) => state.listeners.size === 0)
      .sort((a, b) => a[1].updatedAt - b[1].updatedAt)

    while (this.conversations.size > this.maxConversations && stale.length > 0) {
      const [conversationId] = stale.shift()!
      this.conversations.delete(conversationId)
      for (const [key, link] of this.telegramLinks) {
        if (link.conversationId === conversationId) this.telegramLinks.delete(key)
      }
    }
  }
}

export type CreateChatbotLiveReplySseResponseOptions = {
  keepAliveMs?: number
  headers?: HeadersInit
}

export function createChatbotLiveReplySseResponse(
  request: Request,
  store: ChatbotLiveReplyStore,
  options: CreateChatbotLiveReplySseResponseOptions = {},
): Response {
  const url = new URL(request.url)
  const conversationId = normalizeRequiredId(
    url.searchParams.get("conversationId"),
    "conversationId",
  )
  const visitorId = normalizeId(url.searchParams.get("visitorId"))
  const keepAliveMs = options.keepAliveMs ?? 25_000
  const encoder = new TextEncoder()
  let unsubscribe: (() => void) | null = null
  let keepAlive: ReturnType<typeof globalThis.setInterval> | null = null
  let closed = false

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: ChatbotLiveEvent) => {
        if (closed) return
        controller.enqueue(encoder.encode(formatLiveReplySseEvent(event)))
      }
      const close = () => {
        if (closed) return
        closed = true
        if (keepAlive) globalThis.clearInterval(keepAlive)
        unsubscribe?.()
        try {
          controller.close()
        } catch {
          // The client may already have closed the stream.
        }
      }

      unsubscribe = store.subscribe(conversationId, send, { visitorId })
      send({
        type: "mode",
        conversationId,
        mode: store.getMode(conversationId),
        createdAt: new Date().toISOString(),
      })

      keepAlive = globalThis.setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": keep-alive\n\n"))
      }, keepAliveMs)

      request.signal.addEventListener("abort", close, { once: true })
    },
    cancel() {
      closed = true
      if (keepAlive) globalThis.clearInterval(keepAlive)
      unsubscribe?.()
    },
  })

  const headers = new Headers(options.headers)
  headers.set("content-type", "text/event-stream; charset=utf-8")
  headers.set("cache-control", "no-cache, no-transform")
  headers.set("x-accel-buffering", "no")

  return new Response(stream, { headers })
}

export type HandleTelegramOperatorWebhookOptions = {
  store: ChatbotLiveReplyStore
  chatId: string | number
  adminUserId?: string | number
  secretToken?: string
  authorName?: string
  stopCommand?: string
}

export type TelegramOperatorWebhookResult =
  | {
      ok: true
      action: "ignored"
      reason: string
    }
  | {
      ok: true
      action: "operator-message" | "mode-ai"
      conversationId: string
    }

type TelegramWebhookUpdate = {
  message?: TelegramWebhookMessage
}

type TelegramWebhookMessage = {
  message_id?: number
  chat?: {
    id?: number | string
  }
  from?: {
    id?: number | string
  }
  text?: string
  reply_to_message?: {
    message_id?: number
  }
}

export async function handleTelegramOperatorWebhook(
  request: Request,
  {
    store,
    chatId,
    adminUserId,
    secretToken,
    authorName = "Real Vlad",
    stopCommand = "STOP",
  }: HandleTelegramOperatorWebhookOptions,
): Promise<TelegramOperatorWebhookResult> {
  if (secretToken) {
    const actual = request.headers.get("x-telegram-bot-api-secret-token")
    if (actual !== secretToken) {
      throw new ChatbotRequestError("Invalid Telegram webhook secret.", 401)
    }
  }

  const update = await readTelegramWebhookUpdate(request)
  const message = update.message
  if (!message) return ignored("no-message")

  const actualChatId = message.chat?.id
  if (actualChatId === undefined || String(actualChatId) !== String(chatId)) {
    return ignored("unexpected-chat")
  }

  if (adminUserId !== undefined) {
    const actualUserId = message.from?.id
    if (actualUserId === undefined || String(actualUserId) !== String(adminUserId)) {
      return ignored("unexpected-user")
    }
  }

  const replyToMessageId = message.reply_to_message?.message_id
  if (replyToMessageId === undefined) return ignored("not-a-reply")

  const link = store.findConversationByTelegramReply({
    chatId: actualChatId,
    replyToMessageId,
  })
  if (!link) return ignored("unknown-reply-target")

  const text = message.text?.trim()
  if (!text) return ignored("empty-text")

  if (text.toUpperCase() === stopCommand.trim().toUpperCase()) {
    store.setMode({
      conversationId: link.conversationId,
      mode: "ai",
    })
    return {
      ok: true,
      action: "mode-ai",
      conversationId: link.conversationId,
    }
  }

  store.publishOperatorReply({
    conversationId: link.conversationId,
    text,
    authorName,
    telegramMessageId: message.message_id,
    visitorId: link.visitorId,
  })

  return {
    ok: true,
    action: "operator-message",
    conversationId: link.conversationId,
  }
}

async function readTelegramWebhookUpdate(request: Request): Promise<TelegramWebhookUpdate> {
  try {
    const payload = (await request.json()) as unknown
    if (!payload || typeof payload !== "object") {
      throw new ChatbotRequestError("Invalid Telegram webhook body.")
    }
    return payload as TelegramWebhookUpdate
  } catch (error) {
    if (error instanceof ChatbotRequestError) throw error
    throw new ChatbotRequestError("Invalid Telegram webhook JSON.")
  }
}

function ignored(reason: string): TelegramOperatorWebhookResult {
  return {
    ok: true,
    action: "ignored",
    reason,
  }
}

function formatLiveReplySseEvent(event: ChatbotLiveEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
}

function createTelegramLinkKey(chatId: string | number, messageId: string | number): string {
  return `${String(chatId)}:${String(messageId)}`
}

function normalizeRequiredId(value: string | null | undefined, name: string): string {
  const normalized = normalizeId(value)
  if (!normalized) throw new ChatbotRequestError(`Missing ${name}.`)
  return normalized
}

function normalizeId(value: string | null | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function pruneOldest<K, V>(map: Map<K, V>, maxSize: number): void {
  while (map.size > maxSize) {
    const oldest = map.keys().next()
    if (oldest.done) return
    map.delete(oldest.value)
  }
}
