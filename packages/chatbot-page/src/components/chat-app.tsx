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

  // Persist whenever conversations change.
  useEffect(() => {
    if (hydrated) {
      void config.storage.conversationStore.save(conversations)
    }
  }, [config.storage.conversationStore, conversations, hydrated])

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

  const handleNewChat = useCallback(() => {
    const convo = newChatWithIntro(config.introMessage)
    setConversations((prev) => [convo, ...prev])
    setActiveId(convo.id)
    setAnimatingId(convo.messages[0].id)
    setStreamingId(null)
    setThinking(false)
    setSidebarOpen(false)
  }, [config.introMessage])

  const handleSelect = useCallback((id: string) => {
    setActiveId(id)
    setAnimatingId(null)
    setStreamingId(null)
    setThinking(false)
    setSidebarOpen(false)
  }, [])

  const handleDelete = useCallback(
    (id: string) => {
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
    [activeId, config.introMessage],
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
            })

            if (isStreamingAnswer(answer)) {
              const botMsg = makeMessage("assistant", "")
              streamingMessageId = botMsg.id
              updateConversation(convoId, (c) => ({
                ...c,
                messages: [...c.messages, botMsg],
                updatedAt: Date.now(),
              }))
              setThinking(false)
              setStreamingId(botMsg.id)

              let receivedText = false
              for await (const chunk of answer.stream) {
                const delta = chunkToText(chunk)
                if (!delta) continue
                receivedText = true
                updateConversation(convoId, (c) => ({
                  ...c,
                  messages: appendToMessage(c.messages, botMsg.id, delta),
                  updatedAt: Date.now(),
                }))
              }

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

            const botMsg = makeMessage("assistant", answerToContent(answer))
            updateConversation(convoId, (c) => ({
              ...c,
              messages: [...c.messages, botMsg],
              updatedAt: Date.now(),
            }))
            setAnimatingId(botMsg.id)
          } catch (error) {
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
            setThinking(false)
            setStreamingId(null)
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

  const isIntroState = !!active && !active.messages.some((m) => m.role === "user")
  const showSuggestions =
    !!active && !thinking && !animatingId && !streamingId && remainingSuggestions.length > 0

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
                  {remainingSuggestions.map((s) => (
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
