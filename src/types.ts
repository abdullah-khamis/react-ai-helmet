// Shared public types for react-ai-helmet's runtime layer.

/** schema.org ItemAvailability enum tail (expanded to a full URL internally). */
export type Availability =
  | 'InStock'
  | 'OutOfStock'
  | 'PreOrder'
  | 'BackOrder'
  | 'Discontinued'
  | 'SoldOut'

/** A person reference: a bare name, or a partial schema.org Person. */
export type AuthorInput = string | { name: string; url?: string; [key: string]: unknown }

/** One FAQ entry for <FAQSchema>. */
export interface FAQItem {
  question: string
  answer: string
}

/** Aggregate rating for <ProductSchema>. */
export interface RatingInput {
  value: number | string
  count: number | string
}

/** Region intent understood by AI crawlers and the llms-full.txt generator. */
export type AIRegionType = 'answer' | 'summary' | 'definition' | 'general'

/** Known AI/crawler user-agents the CLI can allow or deny in robots.txt. */
export type BotName =
  | 'GPTBot'
  | 'ClaudeBot'
  | 'Claude-Web'
  | 'Google-Extended'
  | 'PerplexityBot'
  | 'CCBot'
  | 'cohere-ai'
  | 'Bytespider'
  | (string & {}) // allow arbitrary bots while keeping autocomplete on known ones
