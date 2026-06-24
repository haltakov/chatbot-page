"use client"

export type Role = "user" | "assistant"

export type Message = {
  id: string
  role: Role
  content: string
  createdAt: number
}

export type Conversation = {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export type ChatbotKeyValueStore = {
  getItem(key: string): string | null | Promise<string | null>
  setItem(key: string, value: string): void | Promise<void>
  removeItem?(key: string): void | Promise<void>
}

export type ChatbotConversationStore = {
  load(): Conversation[] | Promise<Conversation[]>
  save(conversations: Conversation[]): void | Promise<void>
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function createBrowserKeyValueStore(): ChatbotKeyValueStore {
  return {
    getItem(key) {
      if (typeof window === "undefined") return null
      return window.localStorage.getItem(key)
    },
    setItem(key, value) {
      if (typeof window === "undefined") return
      window.localStorage.setItem(key, value)
    },
    removeItem(key) {
      if (typeof window === "undefined") return
      window.localStorage.removeItem(key)
    },
  }
}

export function createLocalStorageConversationStore(
  storageKey: string,
  keyValueStore: ChatbotKeyValueStore = createBrowserKeyValueStore(),
): ChatbotConversationStore {
  return {
    async load() {
      try {
        const raw = await keyValueStore.getItem(storageKey)
        if (!raw) return []
        const parsed = JSON.parse(raw) as Conversation[]
        if (!Array.isArray(parsed)) return []
        return parsed.sort((a, b) => b.updatedAt - a.updatedAt)
      } catch {
        return []
      }
    },
    async save(conversations) {
      try {
        await keyValueStore.setItem(storageKey, JSON.stringify(conversations))
      } catch {
        // ignore quota / serialization errors
      }
    },
  }
}

export function deriveTitle(content: string): string {
  const clean = content.replace(/\s+/g, " ").trim()
  if (!clean) return "New chat"
  return clean.length > 40 ? clean.slice(0, 40) + "…" : clean
}

export function createConversation(): Conversation {
  const now = Date.now()
  return {
    id: uid(),
    title: "New chat",
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
}
