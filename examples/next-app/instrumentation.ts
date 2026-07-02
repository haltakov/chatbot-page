import { registerTelegramWebhookOnStartup } from "@/lib/register-telegram-webhook"

export async function register() {
  await registerTelegramWebhookOnStartup()
}
