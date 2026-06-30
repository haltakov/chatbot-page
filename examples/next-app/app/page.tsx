import { join } from "node:path"
import {
  loadCannedAnswerDirectory,
  loadFirstLaunchMarkdown,
  loadMarkdownBody,
} from "chatbot-page/server"
import { ExampleChatbot } from "./chatbot"

export default async function Page() {
  const [cannedAnswers, firstLaunch, introMessage] = await Promise.all([
    loadCannedAnswerDirectory(join(process.cwd(), "content", "chatbot")),
    loadFirstLaunchMarkdown(join(process.cwd(), "content", "first-launch.md")),
    loadMarkdownBody(join(process.cwd(), "content", "intro.md")),
  ])

  return (
    <ExampleChatbot
      cannedAnswers={cannedAnswers}
      firstLaunch={firstLaunch}
      introMessage={introMessage}
    />
  )
}
