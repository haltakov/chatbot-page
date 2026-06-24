import type {
  ChatbotServerAnswerChunk,
  ChatbotServerAnswerStream,
  ChatbotSseResponseOptions,
} from "./types"

export async function createChatbotSseResponse(
  chunks: ChatbotServerAnswerStream | Promise<ChatbotServerAnswerStream>,
  init: ChatbotSseResponseOptions = {},
): Promise<Response> {
  const headers = createSseHeaders(init.headers)
  const encoder = new TextEncoder()

  return new Response(
    new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of await chunks) {
            controller.enqueue(encoder.encode(formatSseChunk(chunk)))
          }
          controller.enqueue(encoder.encode(formatSseChunk({ type: "done" })))
        } catch (error) {
          const message = error instanceof Error ? error.message : "Chat stream failed."
          controller.enqueue(encoder.encode(formatSseChunk({ type: "error", error: message })))
        } finally {
          controller.close()
        }
      },
    }),
    {
      ...init,
      headers,
    },
  )
}

export async function* streamText(
  text: string,
  options: {
    chunkSize?: number
    delayMs?: number
  } = {},
): ChatbotServerAnswerStream {
  const chunkSize = options.chunkSize ?? 48
  const delayMs = options.delayMs ?? 0

  for (let index = 0; index < text.length; index += chunkSize) {
    if (delayMs > 0 && index > 0) await sleep(delayMs)
    yield {
      type: "text-delta",
      text: text.slice(index, index + chunkSize),
    }
  }
}

function createSseHeaders(initHeaders: HeadersInit | undefined): Headers {
  const headers = new Headers(initHeaders)
  headers.set("content-type", "text/event-stream; charset=utf-8")
  headers.set("cache-control", "no-cache, no-transform")
  headers.set("x-accel-buffering", "no")
  return headers
}

function formatSseChunk(chunk: ChatbotServerAnswerChunk): string {
  const normalized =
    typeof chunk === "string"
      ? {
          type: "text-delta",
          text: chunk,
        }
      : chunk

  return `event: ${normalized.type}\ndata: ${JSON.stringify(normalized)}\n\n`
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, delayMs))
}
