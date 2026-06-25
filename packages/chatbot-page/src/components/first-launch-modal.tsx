"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { MessageCircle, X } from "lucide-react"
import { Markdown } from "./markdown"
import { useFocusTrap } from "../lib/use-focus-trap"
import type { ChatbotKeyValueStore } from "../lib/chat-store"
import type { ChatbotFirstLaunchConfig, ChatbotIdentity } from "../types"

function getFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase()
}

export function FirstLaunchModal({
  config,
  identity,
  storage,
  storageKey,
}: {
  config: Required<ChatbotFirstLaunchConfig>
  identity: ChatbotIdentity
  storage: ChatbotKeyValueStore
  storageKey: string
}) {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const panelRef = useFocusTrap<HTMLDivElement>(open)

  useEffect(() => {
    let cancelled = false
    setMounted(true)

    void (async () => {
      const value = await storage.getItem(storageKey)
      if (!cancelled && value !== "seen") setOpen(true)
    })()

    return () => {
      cancelled = true
    }
  }, [storage, storageKey])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close()
    }

    if (open) window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  function close() {
    setOpen(false)
    void storage.setItem(storageKey, "seen")
  }

  if (!mounted || !open) return null

  const firstName = getFirstName(identity.name)

  return createPortal(
    <div
      className="cp-modal cp-first-launch"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cp-first-launch-title"
    >
      <div className="cp-modal-backdrop cp-first-launch-backdrop" onClick={close} aria-hidden="true" />
      <div ref={panelRef} tabIndex={-1} className="cp-first-launch-panel">
        <button
          type="button"
          onClick={close}
          className="cp-icon-button cp-modal-close"
          aria-label="Close"
        >
          <X className="cp-icon cp-icon--sm" aria-hidden="true" />
        </button>

        <div className="cp-first-launch-hero" aria-hidden="true">
          <div className="cp-first-launch-preview">
            <div className="cp-first-launch-preview-mark">
              {getInitials(identity.name)}
            </div>
            <div className="cp-first-launch-preview-lines">
              <span />
              <span />
              <span />
            </div>
            <MessageCircle className="cp-first-launch-preview-icon" />
          </div>
        </div>

        <div className="cp-first-launch-content">
          <p className="cp-first-launch-eyebrow">
            <MessageCircle className="cp-icon cp-icon--sm" aria-hidden="true" />
            Chat with {firstName}
          </p>
          <h2 id="cp-first-launch-title" className="cp-first-launch-title">
            {config.title}
          </h2>

          {config.body ? (
            <div className="cp-first-launch-markdown">
              <Markdown>{config.body}</Markdown>
            </div>
          ) : (
            <>
              <p className="cp-first-launch-description">{config.description}</p>

              {config.highlights.length > 0 && (
                <ul className="cp-first-launch-list">
                  {config.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              )}
            </>
          )}

          <button
            type="button"
            onClick={close}
            className="cp-button cp-button--primary cp-button--full cp-first-launch-action"
          >
            {config.dismissLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
