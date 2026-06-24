import { join } from "node:path"
import {
  loadCannedAnswerDirectory,
  loadFirstLaunchMarkdown,
} from "chatbot-page/server"
import { ExampleChatbot } from "./chatbot"

export default async function Page() {
  const [cannedAnswers, firstLaunch] = await Promise.all([
    loadCannedAnswerDirectory(join(process.cwd(), "content", "chatbot")),
    loadFirstLaunchMarkdown(join(process.cwd(), "content", "first-launch.md")),
  ])

  return <ExampleChatbot cannedAnswers={cannedAnswers} firstLaunch={firstLaunch} />
}
