import { readFile } from "node:fs/promises"
import type { ChatbotFirstLaunchConfig } from "../types"
import {
  getFrontmatterString,
  splitMarkdownFrontmatter,
  type MarkdownFrontmatter,
} from "./markdown"

export type MarkdownFirstLaunchFrontmatter = MarkdownFrontmatter

export async function loadFirstLaunchMarkdown(
  filePath: string,
): Promise<ChatbotFirstLaunchConfig> {
  const source = await readFile(filePath, "utf8")
  return parseFirstLaunchMarkdown(source)
}

export function parseFirstLaunchMarkdown(
  source: string,
): ChatbotFirstLaunchConfig {
  const { frontmatter, body } = splitMarkdownFrontmatter(
    source,
    "First launch modal",
  )

  return {
    title: getFrontmatterString(frontmatter, "title"),
    body: body.trim(),
    dismissLabel: getFrontmatterString(frontmatter, "dismissLabel"),
  }
}
