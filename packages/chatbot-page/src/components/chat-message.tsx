"use client"

import { useEffect, useRef, useState } from "react"
import {
  Copy,
  MoreHorizontal,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react"
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
  userLabel,
}: {
  message: Message
  animate?: boolean
  identity: ChatbotIdentity
  onAnimationComplete?: () => void
  userLabel: string
}) {
  const isUser = message.role === "user"
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

  function copyMessage() {
    void navigator.clipboard?.writeText(message.content)
  }

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
            <div className="cp-message-markdown">
              <Markdown>{revealed || "\u200b"}</Markdown>
              {animate && revealed.length < message.content.length && (
                <span className="cp-typing-cursor" />
              )}
            </div>
            {revealed.trim() && (
              <div className="cp-message-actions" aria-label="Message actions">
                <button type="button" onClick={copyMessage} aria-label="Copy answer">
                  <Copy className="cp-icon cp-icon--sm" aria-hidden="true" />
                </button>
                <span className="cp-message-action" aria-hidden="true">
                  <ThumbsUp className="cp-icon cp-icon--sm" aria-hidden="true" />
                </span>
                <span className="cp-message-action" aria-hidden="true">
                  <ThumbsDown className="cp-icon cp-icon--sm" aria-hidden="true" />
                </span>
                <span className="cp-message-action" aria-hidden="true">
                  <RotateCcw className="cp-icon cp-icon--sm" aria-hidden="true" />
                </span>
                <span className="cp-message-action" aria-hidden="true">
                  <MoreHorizontal className="cp-icon cp-icon--sm" aria-hidden="true" />
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
