"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import type { ChatbotKeyValueStore } from "../lib/chat-store"

type Theme = "light" | "dark"

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(theme)
}

export function ThemeToggle({
  storage,
  storageKey,
}: {
  storage: ChatbotKeyValueStore
  storageKey: string
}) {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const stored = ((await storage.getItem(storageKey)) as Theme | null) ?? null
      const initial: Theme =
        stored ??
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      if (cancelled) return
      applyTheme(initial)
      setTheme(initial)
    })()

    return () => {
      cancelled = true
    }
  }, [storage, storageKey])

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark"
    applyTheme(next)
    void storage.setItem(storageKey, next)
    setTheme(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="cp-icon-button"
      aria-label="Toggle color theme"
    >
      {theme === "dark" ? (
        <Sun className="cp-icon" aria-hidden="true" />
      ) : (
        <Moon className="cp-icon" aria-hidden="true" />
      )}
    </button>
  )
}
