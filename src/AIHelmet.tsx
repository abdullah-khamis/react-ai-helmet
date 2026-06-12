import React from 'react'
import { AIContext } from './context.js'
import { MetaTag } from './MetaTag.js'
import type { BotName } from './types.js'

export interface AIHelmetProps {
  siteName?: string
  siteUrl?: string
  siteDescription?: string
  /** When false, emits a recognized AI training opt-out meta tag. */
  allowTraining?: boolean
  /** Read statically by the CLI to build robots.txt. No runtime effect. */
  allowBots?: BotName[]
  /** Read statically by the CLI to build robots.txt. No runtime effect. */
  denyBots?: BotName[]
  /** Page-level llms.txt hint, consumed by the CLI scanner. No runtime effect. */
  llmsTitle?: string
  /** Page-level llms.txt hint, consumed by the CLI scanner. No runtime effect. */
  llmsDescription?: string
  /** Page-level llms.txt hint, consumed by the CLI scanner. No runtime effect. */
  llmsPriority?: 'high' | 'medium' | 'low'
  children?: React.ReactNode
}

/**
 * App-root provider. Wrap your application once:
 *
 *   <AIHelmet siteName="Acme" siteUrl="https://acme.com" allowTraining={false}>
 *     <App />
 *   </AIHelmet>
 *
 * Responsibilities:
 *   1. Expose site-level metadata to schema components via context.
 *   2. Emit document-level AI/crawler meta tags (training opt-out, etc).
 *
 * Per-bot allow/deny lists and the llms* props are declarative hints read
 * statically by the `react-ai-helmet generate` CLI; they render nothing.
 */
export function AIHelmet({
  siteName,
  siteUrl,
  siteDescription,
  allowTraining = true,
  children,
}: AIHelmetProps) {
  const ctx = { siteName, siteUrl, siteDescription }

  return (
    <AIContext.Provider value={ctx}>
      {allowTraining === false && (
        // Recognized AI training opt-out signal (Cloudflare, Tollbit, et al).
        // Hoisted to <head> on React 19; injected via effect on React 18.
        <MetaTag name="robots" content="noai, noimageai" />
      )}
      {children}
    </AIContext.Provider>
  )
}
