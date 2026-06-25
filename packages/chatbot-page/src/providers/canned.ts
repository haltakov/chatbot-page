import type {
  ChatbotAnswerContext,
  ChatbotAnswerProvider,
  ChatbotSuggestion,
} from "../types"

export type KeywordMatch = {
  id: string
  words: string[]
}

export type CannedAnswerEntry = {
  id: string
  question: string
  answer: string
  keywords?: string[]
}

export type CannedAnswerCollection = {
  answers: Record<string, string>
  keywordMap: KeywordMatch[]
  suggestions: ChatbotSuggestion[]
}

export type CannedAnswerProviderOptions = {
  answers: Record<string, string>
  fallbackAnswer?: string
  fallbackProvider?: ChatbotAnswerProvider
  keywordMap?: KeywordMatch[]
  suggestions?: ChatbotSuggestion[]
}

export function createCannedAnswerCollection(
  entries: CannedAnswerEntry[],
): CannedAnswerCollection {
  return entries.reduce<CannedAnswerCollection>(
    (collection, entry) => {
      collection.answers[entry.id] = entry.answer
      collection.suggestions.push({
        id: entry.id,
        question: entry.question,
      })

      if (entry.keywords && entry.keywords.length > 0) {
        collection.keywordMap.push({
          id: entry.id,
          words: entry.keywords,
        })
      }

      return collection
    },
    {
      answers: {},
      keywordMap: [],
      suggestions: [],
    },
  )
}

export function createCannedAnswerProvider({
  answers,
  fallbackAnswer = "I do not have a pre-written answer for that yet.",
  fallbackProvider,
  keywordMap = [],
  suggestions = [],
}: CannedAnswerProviderOptions): ChatbotAnswerProvider {
  // Precompile a boundary-aware matcher per keyword so short keywords like "ai"
  // don't accidentally match substrings, while still supporting non-ASCII text.
  const compiledKeywordMap = keywordMap.map(({ id, words }) => ({
    id,
    patterns: words
      .map((word) => word.trim().toLowerCase())
      .filter(Boolean)
      .map(buildKeywordMatcher),
  }))

  return async (input: string, context: ChatbotAnswerContext) => {
    const text = input.trim().toLowerCase()
    const suggestionList = suggestions.length > 0 ? suggestions : context.suggestions

    const byQuestion = suggestionList.find((s) => s.question.toLowerCase() === text)
    if (byQuestion && answers[byQuestion.id]) return answers[byQuestion.id]

    for (const { id, patterns } of compiledKeywordMap) {
      if (patterns.some((pattern) => pattern.test(text)) && answers[id]) {
        return answers[id]
      }
    }

    return fallbackProvider ? fallbackProvider(input, context) : fallbackAnswer
  }
}

const KEYWORD_BOUNDARY = "[^\\p{L}\\p{N}_]"

function buildKeywordMatcher(word: string): RegExp {
  return new RegExp(
    `(^|${KEYWORD_BOUNDARY})${escapeRegExp(word)}(?=$|${KEYWORD_BOUNDARY})`,
    "iu",
  )
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
