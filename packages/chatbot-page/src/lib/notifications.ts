"use client"

import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "unique-names-generator"
import type { ChatbotKeyValueStore } from "./chat-store"
import type {
  ChatbotNotificationEvent,
  ChatbotNotificationInput,
  ChatbotNotificationProvider,
  ResolvedChatbotConfig,
} from "../types"

export type ApiNotificationProviderOptions = {
  endpoint?: string
  fetcher?: typeof fetch
}

export function createApiNotificationProvider({
  endpoint = "/api/chatbot-events",
  fetcher = fetch,
}: ApiNotificationProviderOptions = {}): ChatbotNotificationProvider {
  return async (event) => {
    const response = await fetcher(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(event),
      keepalive: true,
    })

    if (!response.ok) {
      throw new Error(`Notification request failed with ${response.status}`)
    }
  }
}

export async function getOrCreateVisitorId(
  storageKey: string,
  storage: ChatbotKeyValueStore,
): Promise<string> {
  try {
    const stored = await storage.getItem(storageKey)
    if (stored && isThreeWordId(stored)) return stored

    const visitorId = createThreeWordId()
    await storage.setItem(storageKey, visitorId)
    return visitorId
  } catch {
    return createThreeWordId()
  }
}

export async function sendChatbotNotification(
  config: ResolvedChatbotConfig,
  event: ChatbotNotificationInput,
): Promise<void> {
  if (!config.notifications) return

  const visitorId = await getOrCreateVisitorId(
    config.storage.visitorIdKey,
    config.storage.keyValueStore,
  )
  const payload: ChatbotNotificationEvent = {
    ...event,
    visitorId,
    url: typeof window === "undefined" ? undefined : window.location.href,
    createdAt: new Date().toISOString(),
  }

  await config.notifications.provider(payload)
}

function createThreeWordId(): string {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    length: 3,
    separator: "-",
    style: "lowerCase",
  })
}

function isThreeWordId(value: string): boolean {
  return /^[a-z]+-[a-z]+-[a-z]+$/.test(value)
}
