"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUp } from "lucide-react"

export function Composer({
  onSend,
  disabled,
  disclaimer,
  placeholder,
}: {
  onSend: (text: string) => void
  disabled?: boolean
  disclaimer: string
  placeholder: string
}) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 200) + "px"
  }, [value])

  function submit() {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue("")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="cp-composer-wrap">
      <div className="cp-composer">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={placeholder}
          className="cp-composer-input"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="cp-send-button"
          aria-label="Send message"
        >
          <ArrowUp className="cp-icon" aria-hidden="true" />
        </button>
      </div>
      <p className="cp-disclaimer">
        {disclaimer}
      </p>
    </div>
  )
}
