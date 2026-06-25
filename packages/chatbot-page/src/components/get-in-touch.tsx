"use client"

import { type ComponentType, type FormEvent, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Mail, X, Check, Loader2 } from "lucide-react"
import { BotAvatar } from "./bot-avatar"
import { useFocusTrap } from "../lib/use-focus-trap"
import type { BotAvatarProps, ChatbotContactConfig, ChatbotIdentity } from "../types"

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function GetInTouch({
  Avatar = BotAvatar,
  contact,
  identity,
  onSubmitEmail,
}: {
  Avatar?: ComponentType<BotAvatarProps>
  contact: Required<ChatbotContactConfig>
  identity: ChatbotIdentity
  onSubmitEmail?: (email: string) => Promise<void> | void
}) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useFocusTrap<HTMLDivElement>(open && mounted)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (open && !submitted) {
      // Focus the field once the dialog is shown.
      const t = window.setTimeout(() => inputRef.current?.focus(), 50)
      return () => window.clearTimeout(t)
    }
  }, [open, submitted])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close()
    }
    if (open) window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  function close() {
    setOpen(false)
    // Reset after the close transition so it reopens fresh.
    window.setTimeout(() => {
      setEmail("")
      setError(null)
      setSubmitted(false)
      setSubmitting(false)
    }, 200)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return

    const value = email.trim()
    if (!isValidEmail(value)) {
      setError(contact.invalidEmailMessage)
      return
    }

    setError(null)
    setSubmitting(true)

    try {
      await onSubmitEmail?.(value)
      setSubmitted(true)
    } catch {
      setError(contact.submitErrorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cp-button cp-button--secondary cp-button--full"
      >
        <Mail className="cp-icon cp-icon--sm" aria-hidden="true" />
        {contact.buttonLabel}
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className="cp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="get-in-touch-title"
          >
          <div
            className="cp-modal-backdrop"
            onClick={close}
            aria-hidden="true"
          />

          <div ref={panelRef} tabIndex={-1} className="cp-modal-panel">
            <button
              type="button"
              onClick={close}
              className="cp-icon-button cp-modal-close"
              aria-label="Close"
            >
              <X className="cp-icon cp-icon--sm" aria-hidden="true" />
            </button>

            {submitted ? (
              <div className="cp-contact-success">
                <div className="cp-contact-success-icon">
                  <Check className="cp-icon cp-icon--lg" aria-hidden="true" />
                </div>
                <h2 id="get-in-touch-title" className="cp-modal-title">
                  {contact.successTitle}
                </h2>
                <p className="cp-modal-copy">
                  Got it — {identity.name.split(" ")[0]} will get back to you at{" "}
                  <span className="cp-strong">{email.trim()}</span> soon.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="cp-button cp-button--primary cp-button--full"
                >
                  {contact.doneLabel}
                </button>
              </div>
            ) : (
              <>
                <div className="cp-contact-heading">
                  <Avatar identity={identity} className="cp-avatar cp-avatar--lg" />
                  <div>
                    <h2 id="get-in-touch-title" className="cp-modal-title">
                      {contact.title}
                    </h2>
                    <p className="cp-modal-copy">
                      {contact.description ||
                        `Leave your email and ${identity.name.split(" ")[0]} will reach back out to you.`}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="cp-contact-form" noValidate>
                  <div className="cp-field">
                    <label htmlFor="get-in-touch-email" className="cp-field-label">
                      {contact.emailLabel}
                    </label>
                    <input
                      ref={inputRef}
                      id="get-in-touch-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (error) setError(null)
                      }}
                      disabled={submitting}
                      placeholder={contact.emailPlaceholder}
                      aria-invalid={!!error}
                      aria-describedby={error ? "get-in-touch-error" : undefined}
                      className="cp-input"
                    />
                    {error && (
                      <p id="get-in-touch-error" className="cp-field-error">
                        {error}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="cp-button cp-button--primary cp-button--full"
                  >
                    {submitting ? (
                      <span className="cp-button-content">
                        <Loader2 className="cp-icon cp-icon--sm cp-spin" aria-hidden="true" />
                        {contact.submitLabel}
                      </span>
                    ) : (
                      contact.submitLabel
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
          </div>,
          document.body,
        )}
    </>
  )
}
