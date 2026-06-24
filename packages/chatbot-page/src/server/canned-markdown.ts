import { readdir, readFile } from "node:fs/promises"
import { basename, extname, join } from "node:path"
import type { CannedAnswerEntry } from "../providers/canned"
import {
  getFrontmatterString,
  getFrontmatterStringList,
  splitMarkdownFrontmatter,
  type MarkdownFrontmatter,
} from "./markdown"

export type MarkdownCannedAnswerFrontmatter = MarkdownFrontmatter

export type LoadCannedAnswerDirectoryOptions = {
  sort?: (a: CannedAnswerEntry, b: CannedAnswerEntry) => number
}

export async function loadCannedAnswerDirectory(
  directory: string,
  options: LoadCannedAnswerDirectoryOptions = {},
): Promise<CannedAnswerEntry[]> {
  const filenames = (await readdir(directory))
    .filter((filename) => extname(filename).toLowerCase() === ".md")
    .sort((a, b) => a.localeCompare(b))

  const entries = await Promise.all(
    filenames.map(async (filename) => {
      const source = await readFile(join(directory, filename), "utf8")
      return parseCannedAnswerMarkdown(source, basename(filename, ".md"))
    }),
  )

  return options.sort ? entries.sort(options.sort) : entries
}

export function parseCannedAnswerMarkdown(
  source: string,
  fallbackId = "answer",
): CannedAnswerEntry {
  const { frontmatter, body } = splitMarkdownFrontmatter(source, "Canned answer")
  const id = normalizeId(getFrontmatterString(frontmatter, "id") ?? fallbackId)
  const question = getFrontmatterString(frontmatter, "question")

  if (!question) {
    throw new Error(`Canned answer "${id}" is missing a question in frontmatter.`)
  }

  return {
    id,
    question,
    answer: body.trim(),
    keywords: getFrontmatterStringList(frontmatter, "keywords"),
  }
}

function normalizeId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
