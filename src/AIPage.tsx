import type { LlmsPriority } from './types.js'

export interface AIPageProps {
  /** Page title used in llms.txt. Falls back to schema headline/name, then filename. */
  title?: string
  /** Page description used in llms.txt. */
  description?: string
  /** Ordering hint within its llms.txt category (default inferred from path). */
  priority?: LlmsPriority
  /**
   * The URL this page is served at, e.g. "/pricing". Overrides the URL the
   * scanner infers from the file path — set it when your routes don't follow
   * file-based conventions (React Router, custom routing).
   */
  url?: string
}

/**
 * Per-page llms.txt hints. Renders nothing — the CLI scanner reads the props
 * statically:
 *
 *   <AIPage title="Pricing" description="Plans and pricing" url="/pricing" priority="high" />
 *
 * Use <AIHelmet> once at the app root for site-level context, and <AIPage> on
 * each page you want listed in llms.txt. (The llms* props on <AIHelmet> remain
 * supported for backwards compatibility.)
 */
export function AIPage(_props: AIPageProps) {
  return null
}
