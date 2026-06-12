// react-ai-helmet — AI readability toolkit for React
// Runtime component layer. The CLI (react-ai-helmet generate) statically scans
// for these same component names to produce llms.txt / llms-full.txt / robots.txt.

export { AIHelmet } from './AIHelmet.js'
export type { AIHelmetProps } from './AIHelmet.js'

export { AIPage } from './AIPage.js'
export type { AIPageProps } from './AIPage.js'

export { AIRegion } from './AIRegion.js'
export type { AIRegionProps } from './AIRegion.js'

// Escape hatch: emit any schema.org type as JSON-LD. The static scanner doesn't
// read arbitrary data, but the collection pass (react-ai-helmet/collect) captures
// every JSON-LD block from rendered HTML, so custom schemas flow into the
// manifest and llms generation automatically.
export { JsonLd } from './JsonLd.js'
export type { JsonLdProps } from './JsonLd.js'

export { useAIContext, AIContext } from './context.js'
export type { AIContextValue } from './context.js'

export { ArticleSchema } from './schema/ArticleSchema.js'
export type { ArticleSchemaProps } from './schema/ArticleSchema.js'

export { ProductSchema } from './schema/ProductSchema.js'
export type { ProductSchemaProps } from './schema/ProductSchema.js'

export { FAQSchema } from './schema/FAQSchema.js'
export type { FAQSchemaProps } from './schema/FAQSchema.js'

export { OrgSchema } from './schema/OrgSchema.js'
export type { OrgSchemaProps } from './schema/OrgSchema.js'

export { EventSchema } from './schema/EventSchema.js'
export type { EventSchemaProps } from './schema/EventSchema.js'

export type {
  Availability,
  AuthorInput,
  FAQItem,
  RatingInput,
  AIRegionType,
  LlmsPriority,
  BotName,
} from './types.js'
