declare global {
  // Avoid repeated setWebhook calls during dev hot reloads.
  // eslint-disable-next-line no-var
  var __chatbotTelegramWebhookStartup: Promise<void> | undefined
}

type TelegramWebhookRegistrationResult =
  | {
      registered: true
      webhookUrl: string
    }
  | {
      registered: false
      skipped: "missing-bot-token" | "missing-webhook-url"
    }

export function registerTelegramWebhookOnStartup(): Promise<void> {
  if (globalThis.__chatbotTelegramWebhookStartup) {
    return globalThis.__chatbotTelegramWebhookStartup
  }

  globalThis.__chatbotTelegramWebhookStartup = registerTelegramWebhook({
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
    secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
    allowedUpdates: ["message"],
  })
    .then((result) => {
      if (result.registered) {
        console.info(`[chatbot-page] Registered Telegram webhook: ${result.webhookUrl}`)
        return
      }

      if (process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_WEBHOOK_URL) {
        console.info(`[chatbot-page] Skipped Telegram webhook registration: ${result.skipped}`)
      }
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[chatbot-page] Telegram webhook registration failed: ${message}`)
    })

  return globalThis.__chatbotTelegramWebhookStartup
}

async function registerTelegramWebhook({
  botToken,
  webhookUrl,
  secretToken,
  allowedUpdates,
}: {
  botToken?: string
  webhookUrl?: string
  secretToken?: string
  allowedUpdates: string[]
}): Promise<TelegramWebhookRegistrationResult> {
  if (!botToken) return { registered: false, skipped: "missing-bot-token" }

  const normalizedWebhookUrl = webhookUrl?.trim()
  if (!normalizedWebhookUrl) {
    return { registered: false, skipped: "missing-webhook-url" }
  }

  const payload: Record<string, unknown> = {
    url: normalizedWebhookUrl,
    allowed_updates: allowedUpdates,
  }
  if (secretToken) payload.secret_token = secretToken

  const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const body = await response.text()
  if (!response.ok) {
    throw new Error(`Telegram setWebhook failed with ${response.status}: ${body}`)
  }

  if (!readTelegramOkResponse(body)) {
    throw new Error(`Telegram setWebhook returned an unexpected response: ${body}`)
  }

  return {
    registered: true,
    webhookUrl: normalizedWebhookUrl,
  }
}

function readTelegramOkResponse(body: string): boolean {
  try {
    const payload = JSON.parse(body) as {
      ok?: unknown
    }
    return payload.ok === true
  } catch {
    return false
  }
}
