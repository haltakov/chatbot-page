"use client"

import { useEffect, useRef } from "react"

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",")

/**
 * Keep keyboard focus inside a dialog while it is open, and restore focus to
 * the previously focused element when it closes. Attach the returned ref to the
 * dialog container (give it `tabIndex={-1}` so it can hold focus as a fallback).
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const containerRef = useRef<T>(null)

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      )

    // Move focus into the dialog.
    ;(getFocusable()[0] ?? container).focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return
      const focusable = getFocusable()
      const first = focusable[0] ?? container
      const last = focusable[focusable.length - 1] ?? container
      const current = document.activeElement

      if (event.shiftKey) {
        if (current === first || !container!.contains(current)) {
          event.preventDefault()
          last.focus()
        }
      } else if (current === last || !container!.contains(current)) {
        event.preventDefault()
        first.focus()
      }
    }

    container.addEventListener("keydown", onKeyDown)
    return () => {
      container.removeEventListener("keydown", onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [active])

  return containerRef
}
