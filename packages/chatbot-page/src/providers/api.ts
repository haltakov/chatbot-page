import type { ChatbotAnswerChunk, ChatbotAnswerProvider, ChatbotAnswerStream } from "../types"

export type ApiAnswerProviderOptions = {
  endpoint?: string
  fetcher?: typeof fetch
  headers?: HeadersInit
  stream?: boolean
}

export function createApiAnswerProvider({
  endpoint = "/api/chat",
  fetcher = fetch,
  headers,
  stream = true,
}: ApiAnswerProviderOptions = {}): ChatbotAnswerProvider {
  return async (input, context) => {
    const requestHeaders = new Headers(headers)
    requestHeaders.set("content-type", "application/json")

    const response = await fetcher(endpoint, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify({
        message: input,
        messages: context.messages,
        conversationId: context.conversation.id,
      }),
      signal: context.signal,
    })

    if (!response.ok) {
      throw new Error(`Chat API request failed with ${response.status}`)
    }

    const contentType = response.headers.get("content-type") ?? ""

    if (contentType.includes("application/json")) {
      return readJsonAnswer(response)
    }

    if (stream && response.body) {
      return {
        stream: contentType.includes("text/event-stream")
          ? readSseStream(response.body)
          : readTextStream(response.body),
      }
    }

    const answer = await response.text()
    if (!answer) throw new Error("Chat API response did not include an answer.")
    return answer
  }
}

async function readJsonAnswer(response: Response): Promise<string> {
  const payload = (await response.json()) as {
    answer?: unknown
    content?: unknown
    error?: unknown
  }

  if (typeof payload.error === "string") {
    throw new Error(payload.error)
  }

  const answer = typeof payload.answer === "string" ? payload.answer : payload.content

  if (typeof answer !== "string" || !answer) {
    throw new Error("Chat API response did not include an answer.")
  }

  return answer
}

async function* readTextStream(body: ReadableStream<Uint8Array>): ChatbotAnswerStream {
  const reader = body.getReader()
  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value, { stream: true })
      if (text) yield text
    }

    const remaining = decoder.decode()
    if (remaining) yield remaining
  } finally {
    reader.releaseLock()
  }
}

async function* readSseStream(body: ReadableStream<Uint8Array>): ChatbotAnswerStream {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      buffer = buffer.replace(/\r\n/g, "\n")

      let boundary = buffer.indexOf("\n\n")
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        yield* parseSseBlock(block)
        boundary = buffer.indexOf("\n\n")
      }
    }

    buffer += decoder.decode()
    if (buffer.trim()) yield* parseSseBlock(buffer)
  } finally {
    reader.releaseLock()
  }
}

function* parseSseBlock(block: string): Generator<ChatbotAnswerChunk> {
  const dataLines: string[] = []
  let eventName = "message"

  for (const line of block.split("\n")) {
    if (!line || line.startsWith(":")) continue

    const separator = line.indexOf(":")
    const field = separator === -1 ? line : line.slice(0, separator)
    const value = separator === -1 ? "" : line.slice(separator + 1).replace(/^ /, "")

    if (field === "event") eventName = value
    if (field === "data") dataLines.push(value)
  }

  const data = dataLines.join("\n")
  if (!data || data === "[DONE]") return

  let payload: unknown
  try {
    payload = JSON.parse(data)
  } catch {
    if (eventName === "text-delta" || eventName === "message") yield data
    return
  }

  yield* normalizePayload(payload, eventName)
}

function* normalizePayload(payload: unknown, eventName: string): Generator<ChatbotAnswerChunk> {
  if (!payload || typeof payload !== "object") return

  const value = payload as Record<string, unknown>
  const type = typeof value.type === "string" ? value.type : eventName

  if (type === "error") {
    const error = typeof value.error === "string" ? value.error : "The chat stream returned an error."
    throw new Error(error)
  }

  if (type === "done" || type === "response.completed") {
    yield { type: "done" }
    return
  }

  if (type === "metadata") {
    yield { ...value, type: "metadata" }
    return
  }

  if (type === "text-delta" && typeof value.text === "string") {
    yield { type: "text-delta", text: value.text }
    return
  }

  if (type === "response.output_text.delta" && typeof value.delta === "string") {
    yield { type: "text-delta", text: value.delta }
    return
  }

  if (typeof value.delta === "string") {
    yield { type: "text-delta", text: value.delta }
    return
  }

  if (typeof value.text === "string") {
    yield { type: "text-delta", text: value.text }
    return
  }

  if (typeof value.content === "string") {
    yield { type: "text-delta", text: value.content }
  }
}
