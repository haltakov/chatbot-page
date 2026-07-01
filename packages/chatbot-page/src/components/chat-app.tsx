"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PanelLeft } from "lucide-react"
import { ChatSidebar } from "./chat-sidebar"
import { ChatMessage } from "./chat-message"
import { Composer } from "./composer"
import { FirstLaunchModal } from "./first-launch-modal"
import {
  type Conversation,
  type Message,
  createConversation,
  deriveTitle,
  uid,
} from "../lib/chat-store"
import { sendChatbotNotification } from "../lib/notifications"
import { resolveConfig } from "../defaults"
import type {
  ChatbotAnswerChunk,
  ChatbotAnswerResult,
  ChatbotConfig,
  ChatbotPromptSource,
} from "../types"

// Conversations change on every streamed token; debounce persistence so a long
// answer is written once it settles instead of once per token.
const SAVE_DEBOUNCE_MS = 400

function makeMessage(role: Message["role"], content: string): Message {
  return { id: uid(), role, content, createdAt: Date.now() }
}

function newChatWithIntro(introMessage: string): Conversation {
  const convo = createConversation()
  convo.messages = [makeMessage("assistant", introMessage)]
  return convo
}

function isStreamingAnswer(answer: ChatbotAnswerResult): answer is { stream: AsyncIterable<ChatbotAnswerChunk> } {
  return typeof answer === "object" && answer !== null && "stream" in answer
}

function answerToContent(answer: Exclude<ChatbotAnswerResult, { stream: AsyncIterable<ChatbotAnswerChunk> }>): string {
  return typeof answer === "string" ? answer : answer.content
}

function chunkToText(chunk: ChatbotAnswerChunk): string {
  if (typeof chunk === "string") return chunk
  if (chunk.type === "text-delta") return chunk.text
  if (chunk.type === "error") throw new Error(chunk.error)
  return ""
}

function appendToMessage(messages: Message[], messageId: string, text: string): Message[] {
  return messages.map((message) =>
    message.id === messageId
      ? {
          ...message,
          content: message.content + text,
        }
      : message,
  )
}

function normalizeSuggestionCount(count: number): number {
  if (!Number.isFinite(count)) return 0
  return Math.max(0, Math.floor(count))
}

function pickRandomSuggestions<T>(items: T[], count: number): T[] {
  const normalizedCount = normalizeSuggestionCount(count)
  if (normalizedCount <= 0) return []
  if (normalizedCount >= items.length) return items

  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled.slice(0, normalizedCount)
}

export function ChatApp({ config: rawConfig }: { config: ChatbotConfig }) {
  const config = useMemo(() => resolveConfig(rawConfig), [rawConfig])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [animatingId, setAnimatingId] = useState<string | null>(null)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [thinking, setThinking] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const root = document.documentElement
    const body = document.body

    function updateViewportHeight() {
      const height = window.visualViewport?.height ?? window.innerHeight
      root.style.setProperty("--cp-viewport-height", `${height}px`)
    }

    root.classList.add("cp-chatbot-page")
    body.classList.add("cp-chatbot-page")
    updateViewportHeight()

    window.addEventListener("resize", updateViewportHeight)
    window.visualViewport?.addEventListener("resize", updateViewportHeight)

    return () => {
      window.removeEventListener("resize", updateViewportHeight)
      window.visualViewport?.removeEventListener("resize", updateViewportHeight)
      root.classList.remove("cp-chatbot-page")
      body.classList.remove("cp-chatbot-page")
      root.style.removeProperty("--cp-viewport-height")
    }
  }, [])

  // Load from storage (or seed a fresh intro chat) on mount.
  useEffect(() => {
    let cancelled = false

    void (async () => {
      const stored = await config.storage.conversationStore.load()
      if (cancelled) return

      if (stored.length > 0) {
        setConversations(stored)
        setActiveId(stored[0].id)
      } else {
        const convo = newChatWithIntro(config.introMessage)
        setConversations([convo])
        setActiveId(convo.id)
        setAnimatingId(convo.messages[0].id)
      }
      setHydrated(true)
    })()

    return () => {
      cancelled = true
    }
  }, [config.introMessage, config.storage.conversationStore])

  // Persist conversations, debounced so a streamed answer is written once it
  // settles rather than once per token. `pendingSaveRef` holds the latest
  // unsaved value so we can flush it on unmount.
  const pendingSaveRef = useRef<Conversation[] | null>(null)
  const storeRef = useRef(config.storage.conversationStore)
  storeRef.current = config.storage.conversationStore

  useEffect(() => {
    if (!hydrated) return
    pendingSaveRef.current = conversations
    const store = config.storage.conversationStore
    const handle = window.setTimeout(() => {
      pendingSaveRef.current = null
      void store.save(conversations)
    }, SAVE_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [config.storage.conversationStore, conversations, hydrated])

  // On unmount, flush any pending save and cancel any in-flight answer.
  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        void storeRef.current.save(pendingSaveRef.current)
      }
      abortRef.current?.abort()
    }
  }, [])

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  )
  const latestMessageContent = active?.messages[active.messages.length - 1]?.content

  // Auto-scroll to bottom on new content.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [active?.messages.length, latestMessageContent, thinking, animatingId, streamingId])

  const updateConversation = useCallback(
    (id: string, updater: (c: Conversation) => Conversation) => {
      setConversations((prev) =>
        prev
          .map((c) => (c.id === id ? updater(c) : c))
          .sort((a, b) => b.updatedAt - a.updatedAt),
      )
    },
    [],
  )

  // Abort an in-flight answer (e.g. when the user moves to another chat).
  const cancelActiveAnswer = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const handleNewChat = useCallback(() => {
    cancelActiveAnswer()
    const convo = newChatWithIntro(config.introMessage)
    setConversations((prev) => [convo, ...prev])
    setActiveId(convo.id)
    setAnimatingId(convo.messages[0].id)
    setStreamingId(null)
    setThinking(false)
    setSidebarOpen(false)
  }, [cancelActiveAnswer, config.introMessage])

  const handleSelect = useCallback(
    (id: string) => {
      cancelActiveAnswer()
      setActiveId(id)
      setAnimatingId(null)
      setStreamingId(null)
      setThinking(false)
      setSidebarOpen(false)
    },
    [cancelActiveAnswer],
  )

  const handleDelete = useCallback(
    (id: string) => {
      if (id === activeId) cancelActiveAnswer()
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id)
        if (id === activeId) {
          if (next.length > 0) {
            setActiveId(next[0].id)
          } else {
            const convo = newChatWithIntro(config.introMessage)
            setActiveId(convo.id)
            setAnimatingId(convo.messages[0].id)
            setStreamingId(null)
            return [convo]
          }
        }
        return next
      })
    },
    [activeId, cancelActiveAnswer, config.introMessage],
  )

  const sendMessage = useCallback(
    (
      text: string,
      options: {
        source?: ChatbotPromptSource
        suggestionId?: string
      } = {},
    ) => {
      if (!active || thinking || animatingId || streamingId) return
      const userMsg = makeMessage("user", text)
      const convoId = active.id
      const isFirstUserMessage = !active.messages.some((m) => m.role === "user")
      const controller = new AbortController()
      abortRef.current = controller

      void sendChatbotNotification(config, {
        type: "prompt",
        prompt: text,
        source: options.source ?? "composer",
        suggestionId: options.suggestionId,
        conversationId: convoId,
      }).catch(() => {
        // Prompt notifications should never block the chat experience.
      })

      updateConversation(convoId, (c) => ({
        ...c,
        title: isFirstUserMessage ? deriveTitle(text) : c.title,
        messages: [...c.messages, userMsg],
        updatedAt: Date.now(),
      }))

      setThinking(true)
      // Simulate an instant-but-perceptible response while still supporting async providers.
      window.setTimeout(() => {
        void (async () => {
          if (controller.signal.aborted) return
          let streamingMessageId: string | null = null
          const conversationForProvider = {
            ...active,
            title: isFirstUserMessage ? deriveTitle(text) : active.title,
            messages: [...active.messages, userMsg],
            updatedAt: Date.now(),
          }

          try {
            const answer = await config.answerProvider(text, {
              conversation: conversationForProvider,
              messages: conversationForProvider.messages,
              suggestions: config.suggestions,
              source: options.source ?? "composer",
              suggestionId: options.suggestionId,
              signal: controller.signal,
            })

            if (controller.signal.aborted) return

            if (isStreamingAnswer(answer)) {
              const botMsg = makeMessage("assistant", "")
              streamingMessageId = botMsg.id
              if (controller.signal.aborted) return
              updateConversation(convoId, (c) => ({
                ...c,
                messages: [...c.messages, botMsg],
                updatedAt: Date.now(),
              }))
              if (controller.signal.aborted) return
              setThinking(false)
              setStreamingId(botMsg.id)

              let receivedText = false
              for await (const chunk of answer.stream) {
                if (controller.signal.aborted) return
                const delta = chunkToText(chunk)
                if (!delta) continue
                receivedText = true
                if (controller.signal.aborted) return
                updateConversation(convoId, (c) => ({
                  ...c,
                  messages: appendToMessage(c.messages, botMsg.id, delta),
                  updatedAt: Date.now(),
                }))
              }

              if (controller.signal.aborted) return

              if (!receivedText) {
                updateConversation(convoId, (c) => ({
                  ...c,
                  messages: appendToMessage(
                    c.messages,
                    botMsg.id,
                    "I couldn't find an answer for that yet.",
                  ),
                  updatedAt: Date.now(),
                }))
              }

              return
            }

            if (controller.signal.aborted) return
            const botMsg = makeMessage("assistant", answerToContent(answer))
            updateConversation(convoId, (c) => ({
              ...c,
              messages: [...c.messages, botMsg],
              updatedAt: Date.now(),
            }))
            setAnimatingId(botMsg.id)
          } catch (error) {
            // The user navigated away from this answer; leave it as-is.
            if (controller.signal.aborted) return
            const message =
              error instanceof Error
                ? `I couldn't answer that yet: ${error.message}`
                : "I couldn't answer that yet."
            if (streamingMessageId) {
              const messageId = streamingMessageId
              updateConversation(convoId, (c) => ({
                ...c,
                messages: appendToMessage(
                  c.messages,
                  messageId,
                  c.messages.find((m) => m.id === messageId)?.content
                    ? `\n\n${message}`
                    : message,
                ),
                updatedAt: Date.now(),
              }))
            } else {
              const botMsg = makeMessage("assistant", message)
              updateConversation(convoId, (c) => ({
                ...c,
                messages: [...c.messages, botMsg],
                updatedAt: Date.now(),
              }))
              setAnimatingId(botMsg.id)
            }
          } finally {
            if (abortRef.current === controller) abortRef.current = null
            // If aborted, whatever handler triggered it already reset UI state.
            if (!controller.signal.aborted) {
              setThinking(false)
              setStreamingId(null)
            }
          }
        })()
      }, config.ui.responseDelayMs)
    },
    [active, thinking, animatingId, streamingId, updateConversation, config],
  )

  // Keep showing suggestion chips, hiding any whose question has already been asked.
  const askedQuestions = useMemo(() => {
    const set = new Set<string>()
    active?.messages.forEach((m) => {
      if (m.role === "user") set.add(m.content.trim().toLowerCase())
    })
    return set
  }, [active])

  const remainingSuggestions = useMemo(
    () =>
      config.suggestions.filter((s) => !askedQuestions.has(s.question.trim().toLowerCase())),
    [askedQuestions, config.suggestions],
  )
  const visibleSuggestions = useMemo(
    () => pickRandomSuggestions(remainingSuggestions, config.ui.suggestionCount),
    [remainingSuggestions, config.ui.suggestionCount],
  )

  const isIntroState = !!active && !active.messages.some((m) => m.role === "user")
  const showSuggestions =
    !!active && !thinking && !animatingId && !streamingId && visibleSuggestions.length > 0

  return (
    <div className="cp-root">
      {config.ui.firstLaunch && (
        <FirstLaunchModal
          config={config.ui.firstLaunch}
          identity={config.identity}
          storage={config.storage.keyValueStore}
          storageKey={config.storage.firstLaunchKey}
        />
      )}

      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        config={config}
        onNewChat={handleNewChat}
        onSelect={handleSelect}
        onDelete={handleDelete}
        onContactSubmit={(email) =>
          sendChatbotNotification(config, {
            type: "contact",
            email,
          })
        }
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="cp-main">
        <header className="cp-header">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="cp-icon-button cp-sidebar-open"
            aria-label="Open sidebar"
          >
            <PanelLeft className="cp-icon" aria-hidden="true" />
          </button>
          <div className="cp-header-title">
            <span className="cp-header-name">{config.identity.name}</span>
            {config.identity.title && (
              <span className="cp-header-subtitle">
                · {config.identity.title}
              </span>
            )}
          </div>
        </header>

        <div ref={scrollRef} className="cp-scroll">
          <div className="cp-chat-container">
            {active?.messages.map((m) => (
              <ChatMessage
                key={m.id}
                identity={config.identity}
                message={m}
                animate={m.id === animatingId}
                onAnimationComplete={() => setAnimatingId(null)}
                userLabel={config.ui.userLabel}
              />
            ))}

            {thinking && !streamingId && (
              <div className="cp-thinking-row">
                <div className="cp-thinking-dots">
                  <span className="cp-thinking-dot cp-thinking-dot--first" />
                  <span className="cp-thinking-dot cp-thinking-dot--second" />
                  <span className="cp-thinking-dot" />
                </div>
              </div>
            )}

            {showSuggestions && (
              <div className="cp-suggestions">
                {!isIntroState && (
                  <p className="cp-suggestions-label">
                    {config.ui.askAgainLabel}
                  </p>
                )}
                <div className="cp-suggestions-list">
                  {visibleSuggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        sendMessage(s.question, {
                          source: "suggestion",
                          suggestionId: s.id,
                        })
                      }
                      className="cp-suggestion-button"
                    >
                      {s.question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <Composer
          disclaimer={config.ui.disclaimer}
          onSend={sendMessage}
          disabled={thinking || !!animatingId || !!streamingId}
          placeholder={config.ui.composerPlaceholder}
        />
      </div>
    </div>
  )
}
