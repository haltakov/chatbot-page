import { readFile } from "node:fs/promises"
import { splitMarkdownFrontmatter } from "./markdown"

export async function loadMarkdownBody(filePath: string): Promise<string> {
  const source = await readFile(filePath, "utf8")
  return parseMarkdownBody(source)
}

export function parseMarkdownBody(source: string): string {
  return splitMarkdownFrontmatter(source).body.trim()
}
