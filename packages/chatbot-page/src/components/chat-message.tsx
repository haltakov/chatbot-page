"use client"

import { useEffect, useRef, useState } from "react"
import { Markdown } from "./markdown"
import type { Message } from "../lib/chat-store"
import type { ChatbotIdentity } from "../types"

// Characters revealed per animation frame. Higher = faster typing.
const CHARS_PER_TICK = 6
const TICK_MS = 12

export function ChatMessage({
  message,
  animate,
  identity,
  onAnimationComplete,
  operatorActive = false,
  userLabel,
}: {
  message: Message
  animate?: boolean
  identity: ChatbotIdentity
  onAnimationComplete?: () => void
  operatorActive?: boolean
  userLabel: string
}) {
  const isUser = message.role === "user"
  const isOperator = message.source === "operator"
  const [revealed, setRevealed] = useState(animate ? "" : message.content)
  const doneRef = useRef(false)

  useEffect(() => {
    if (!animate) {
      setRevealed(message.content)
      return
    }
    doneRef.current = false
    setRevealed("")
    let i = 0
    const full = message.content
    const interval = setInterval(() => {
      i = Math.min(i + CHARS_PER_TICK, full.length)
      setRevealed(full.slice(0, i))
      if (i >= full.length) {
        clearInterval(interval)
        if (!doneRef.current) {
          doneRef.current = true
          onAnimationComplete?.()
        }
      }
    }, TICK_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, message.content])

  return (
    <div className={`cp-message ${isUser ? "cp-message--user" : "cp-message--assistant"}`}>
      <div className="cp-message-body">
        <div className="cp-message-author cp-sr-only">
          {isUser ? userLabel : identity.name}
        </div>
        {isUser ? (
          <p className="cp-message-text">{message.content}</p>
        ) : (
          <>
            {isOperator && (
              <div
                className={`cp-message-author-badge ${
                  operatorActive
                    ? "cp-message-author-badge--active"
                    : "cp-message-author-badge--inactive"
                }`}
              >
                {message.authorName ?? identity.name}
              </div>
            )}
            <div className="cp-message-markdown">
              <Markdown>{revealed || "\u200b"}</Markdown>
              {animate && revealed.length < message.content.length && (
                <span className="cp-typing-cursor" />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
