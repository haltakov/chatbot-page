import { readFile } from "node:fs/promises"
import type { ChatbotFirstLaunchConfig } from "../types"
import {
  getFrontmatterString,
  getFrontmatterStringList,
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

  // Only emit keys that are actually present — an explicit `undefined` would
  // override the resolved defaults when the config is merged.
  const config: ChatbotFirstLaunchConfig = {}

  const title = getFrontmatterString(frontmatter, "title")
  if (title) config.title = title

  const description = getFrontmatterString(frontmatter, "description")
  if (description) config.description = description

  const highlights = getFrontmatterStringList(frontmatter, "highlights")
  if (highlights) config.highlights = highlights

  const dismissLabel = getFrontmatterString(frontmatter, "dismissLabel")
  if (dismissLabel) config.dismissLabel = dismissLabel

  const trimmedBody = body.trim()
  if (trimmedBody) config.body = trimmedBody

  return config
}
