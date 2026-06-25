import type { ChatbotModelProvider, ChatbotServerAnswerChunk, ChatbotServerAnswerStream, ChatbotServerMessage } from "../types"

export type OpenAIResponsesConnectorOptions = {
  apiKey?: string
  organization?: string
  project?: string
  baseUrl?: string
  model: string
  instructions: string
  vectorStoreIds?: string[]
  tools?: unknown[]
  temperature?: number
  maxOutputTokens?: number
  maxHistoryMessages?: number
  includeConversationHistory?: boolean
  fetcher?: typeof fetch
  extraBody?: Record<string, unknown>
}

export type OpenAIResponsesProviderOptions = OpenAIResponsesConnectorOptions

export function createOpenAIResponsesProvider({
  apiKey,
  organization,
  project,
  baseUrl = "https://api.openai.com/v1",
  model,
  instructions,
  vectorStoreIds = [],
  tools,
  temperature,
  maxOutputTokens,
  maxHistoryMessages = 12,
  includeConversationHistory = true,
  fetcher = fetch,
  extraBody,
}: OpenAIResponsesProviderOptions): ChatbotModelProvider {
  return {
    async streamAnswer(request) {
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not configured.")
      }

      const requestTools =
        tools ??
        (vectorStoreIds.length > 0
          ? [
              {
                type: "file_search",
                vector_store_ids: vectorStoreIds,
              },
            ]
          : undefined)

      const response = await fetcher(`${baseUrl.replace(/\/$/, "")}/responses`, {
        method: "POST",
        headers: createOpenAIHeaders({
          apiKey,
          organization,
          project,
        }),
        body: JSON.stringify(
          compactObject({
            model,
            instructions,
            input: includeConversationHistory
              ? toOpenAIInput(request.messages, request.message, {
                  maxHistoryMessages,
                  previousResponseId: request.previousResponseId,
                })
              : request.message,
            previous_response_id: request.previousResponseId,
            stream: true,
            temperature,
            max_output_tokens: maxOutputTokens,
            tools: requestTools,
            ...extraBody,
          }),
        ),
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`OpenAI Responses request failed with ${response.status}: ${body}`)
      }

      if (!response.body) {
        throw new Error("OpenAI Responses request did not include a stream.")
      }

      return readOpenAISseStream(response.body)
    },
  }
}

export const createOpenAIResponsesConnector = createOpenAIResponsesProvider

function createOpenAIHeaders({
  apiKey,
  organization,
  project,
}: {
  apiKey: string
  organization?: string
  project?: string
}): Headers {
  const headers = new Headers()
  headers.set("authorization", `Bearer ${apiKey}`)
  headers.set("content-type", "application/json")
  if (organization) headers.set("openai-organization", organization)
  if (project) headers.set("openai-project", project)
  return headers
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null),
  ) as T
}

type OpenAIInputMessage = {
  role: "user" | "assistant"
  content: string
}

function toOpenAIInput(
  messages: ChatbotServerMessage[],
  fallbackMessage: string,
  options: {
    maxHistoryMessages: number
    previousResponseId?: string
  },
): string | OpenAIInputMessage[] {
  // When a server-side thread is referenced via previous_response_id, OpenAI
  // already has the prior turns — re-sending them duplicates context and cost,
  // so we send only the new user turn.
  if (options.previousResponseId) {
    const latestUser = [...messages].reverse().find((message) => message.role === "user")
    return latestUser?.content ?? fallbackMessage
  }

  const history = messages.length > 0 ? messages : [{ role: "user" as const, content: fallbackMessage }]

  // Preserve roles as structured input instead of flattening to a single string.
  return history.slice(-options.maxHistoryMessages).map((message) => ({
    role: message.role,
    content: message.content,
  }))
}

async function* readOpenAISseStream(body: ReadableStream<Uint8Array>): ChatbotServerAnswerStream {
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
        yield* parseOpenAISseBlock(block)
        boundary = buffer.indexOf("\n\n")
      }
    }

    buffer += decoder.decode()
    if (buffer.trim()) yield* parseOpenAISseBlock(buffer)
  } finally {
    reader.releaseLock()
  }
}

function* parseOpenAISseBlock(block: string): Generator<ChatbotServerAnswerChunk> {
  const dataLines: string[] = []

  for (const line of block.split("\n")) {
    if (!line || line.startsWith(":")) continue
    const separator = line.indexOf(":")
    const field = separator === -1 ? line : line.slice(0, separator)
    const value = separator === -1 ? "" : line.slice(separator + 1).replace(/^ /, "")
    if (field === "data") dataLines.push(value)
  }

  const data = dataLines.join("\n")
  if (!data || data === "[DONE]") return

  const payload = JSON.parse(data) as {
    type?: string
    delta?: string
    error?: string | { message?: string }
    response?: {
      id?: string
    }
  }

  if (payload.type === "response.created" && payload.response?.id) {
    yield {
      type: "metadata",
      provider: "openai-responses",
      responseId: payload.response.id,
    }
    return
  }

  if (payload.type === "response.output_text.delta" && typeof payload.delta === "string") {
    yield {
      type: "text-delta",
      text: payload.delta,
    }
    return
  }

  if (payload.type === "error") {
    const message =
      typeof payload.error === "string"
        ? payload.error
        : payload.error?.message ?? "OpenAI returned a streaming error."
    throw new Error(message)
  }
}
