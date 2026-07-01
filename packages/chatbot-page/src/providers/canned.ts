import type {
  ChatbotAnswerContext,
  ChatbotAnswerProvider,
  ChatbotSuggestion,
} from "../types"

export type CannedAnswerEntry = {
  id: string
  question: string
  answer: string
}

export type CannedAnswerCollection = {
  answers: Record<string, string>
  suggestions: ChatbotSuggestion[]
}

export type CannedAnswerProviderOptions = {
  answers: Record<string, string>
  fallbackAnswer?: string
  fallbackProvider?: ChatbotAnswerProvider
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

      return collection
    },
    {
      answers: {},
      suggestions: [],
    },
  )
}

export function createCannedAnswerProvider({
  answers,
  fallbackAnswer = "I do not have a pre-written answer for that yet.",
  fallbackProvider,
}: CannedAnswerProviderOptions): ChatbotAnswerProvider {
  return async (input: string, context: ChatbotAnswerContext) => {
    if (
      context.source === "suggestion" &&
      context.suggestionId &&
      answers[context.suggestionId]
    ) {
      return answers[context.suggestionId]
    }

    return fallbackProvider ? fallbackProvider(input, context) : fallbackAnswer
  }
}
