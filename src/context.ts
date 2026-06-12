import { createContext, useContext } from 'react'

export interface AIContextValue {
  siteName?: string
  siteUrl?: string
  siteDescription?: string
}

/**
 * Site-level config supplied once by <AIHelmet> at the app root. Schema
 * components read it to fill in defaults (e.g. publisher/url) without the
 * developer repeating site metadata on every page.
 */
export const AIContext = createContext<AIContextValue>({
  siteName: undefined,
  siteUrl: undefined,
  siteDescription: undefined,
})

export function useAIContext(): AIContextValue {
  return useContext(AIContext)
}
