export type MarkdownFrontmatter = Record<string, string | string[] | undefined>

export function splitMarkdownFrontmatter(
  source: string,
  label = "Markdown",
): {
  frontmatter: MarkdownFrontmatter
  body: string
} {
  const normalized = source.replace(/\r\n/g, "\n")
  if (!normalized.startsWith("---\n")) {
    return {
      frontmatter: {},
      body: normalized,
    }
  }

  const end = normalized.indexOf("\n---\n", 4)
  if (end === -1) {
    throw new Error(`${label} frontmatter is missing a closing --- marker.`)
  }

  return {
    frontmatter: parseFrontmatterBlock(normalized.slice(4, end)),
    body: normalized.slice(end + 5),
  }
}

export function getFrontmatterString(
  frontmatter: MarkdownFrontmatter,
  key: string,
): string | undefined {
  const value = frontmatter[key]
  return typeof value === "string" ? value.trim() : undefined
}

export function getFrontmatterStringList(
  frontmatter: MarkdownFrontmatter,
  key: string,
): string[] | undefined {
  const value = frontmatter[key]
  if (typeof value === "string") {
    const item = value.trim()
    return item ? [item] : undefined
  }

  if (!Array.isArray(value)) return undefined

  const items = value.map((item) => item.trim()).filter(Boolean)
  return items.length > 0 ? items : undefined
}

function parseFrontmatterBlock(block: string): MarkdownFrontmatter {
  const result: MarkdownFrontmatter = {}
  const lines = block.split("\n")

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.trim() || line.trimStart().startsWith("#")) continue

    const separator = line.indexOf(":")
    if (separator === -1) continue

    const key = line.slice(0, separator).trim()
    const rawValue = line.slice(separator + 1).trim()

    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      result[key] = parseInlineList(rawValue)
      continue
    }

    const list: string[] = []
    while (index + 1 < lines.length && /^\s+-\s+/.test(lines[index + 1])) {
      index += 1
      list.push(unquote(lines[index].replace(/^\s+-\s+/, "").trim()))
    }

    result[key] =
      list.length > 0
        ? [unquote(rawValue), ...list].filter(Boolean)
        : unquote(rawValue)
  }

  return result
}

function parseInlineList(value: string): string[] {
  return value
    .slice(1, -1)
    .split(",")
    .map((item) => unquote(item.trim()))
    .filter(Boolean)
}

function unquote(value: string): string {
  return value.replace(/^['"]|['"]$/g, "")
}
