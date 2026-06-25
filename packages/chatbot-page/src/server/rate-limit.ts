import { ChatbotRequestError } from "./errors"

export type RateLimiterOptions = {
  /** Max requests allowed per key within the window (default 20). */
  limit?: number
  /** Sliding window length in milliseconds (default 60000). */
  windowMs?: number
  /** Max distinct keys retained in memory (default 10000). */
  maxKeys?: number
  /** Override the clock (useful in tests). */
  now?: () => number
}

export type RateLimiter = {
  /** Throws a 429 ChatbotRequestError when `key` exceeds the limit. */
  check(key: string): void
}

/**
 * A minimal in-memory sliding-window rate limiter.
 *
 * Note: state lives in the process, so it only protects a single instance. On
 * serverless/multi-instance deployments, back this with a shared store (Redis,
 * Upstash, etc.) instead.
 */
export function createRateLimiter({
  limit = 20,
  windowMs = 60_000,
  maxKeys = 10_000,
  now = Date.now,
}: RateLimiterOptions = {}): RateLimiter {
  const safeLimit = normalizePositiveInteger(limit, 20)
  const safeWindowMs = normalizePositiveInteger(windowMs, 60_000)
  const safeMaxKeys = normalizePositiveInteger(maxKeys, 10_000)
  const hits = new Map<string, number[]>()
  let lastCleanup = 0

  return {
    check(key) {
      const current = now()
      const windowStart = current - safeWindowMs

      if (current - lastCleanup >= safeWindowMs || hits.size > safeMaxKeys) {
        pruneExpiredKeys(hits, windowStart)
        lastCleanup = current
      }

      const recent = (hits.get(key) ?? []).filter((timestamp) => timestamp > windowStart)

      if (recent.length >= safeLimit) {
        throw new ChatbotRequestError("Too many requests. Please slow down.", 429)
      }

      recent.push(current)
      hits.set(key, recent)

      if (hits.size > safeMaxKeys) {
        evictOldestKeys(hits, safeMaxKeys)
      }
    },
  }
}

/**
 * Best-effort client identifier from common proxy headers, for use as a rate
 * limit key. Falls back to "unknown" when no header is present.
 *
 * Only use this helper when these headers are set by your deployment platform
 * or another trusted proxy.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]!.trim()
  return request.headers.get("x-real-ip")?.trim() || "unknown"
}

function pruneExpiredKeys(hits: Map<string, number[]>, windowStart: number): void {
  for (const [key, timestamps] of hits) {
    const recent = timestamps.filter((timestamp) => timestamp > windowStart)
    if (recent.length === 0) {
      hits.delete(key)
    } else {
      hits.set(key, recent)
    }
  }
}

function evictOldestKeys(hits: Map<string, number[]>, maxKeys: number): void {
  while (hits.size > maxKeys) {
    let oldestKey: string | null = null
    let oldestTimestamp = Infinity

    for (const [key, timestamps] of hits) {
      const timestamp = timestamps[0] ?? Infinity
      if (timestamp < oldestTimestamp) {
        oldestTimestamp = timestamp
        oldestKey = key
      }
    }

    if (!oldestKey) return
    hits.delete(oldestKey)
  }
}

function normalizePositiveInteger(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}
