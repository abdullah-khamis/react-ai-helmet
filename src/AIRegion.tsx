import React from 'react'
import type { AIRegionType } from './types.js'

export interface AIRegionProps extends React.HTMLAttributes<HTMLElement> {
  /** Extraction intent for AI crawlers and the llms-full.txt generator. */
  type?: AIRegionType
  /** Pairs with type="answer". */
  question?: string
  /** Pairs with type="definition" — the term being defined. */
  term?: string
  /** Wrapper element to render (default 'div'). */
  as?: 'div' | 'section' | 'article' | 'aside' | 'main' | 'span' | 'p'
  children?: React.ReactNode
}

/**
 * Marks a region of the page with explicit AI-extraction intent. Renders a real
 * DOM element carrying data-ai-* attributes that AI crawlers supporting region
 * hints can use for precise extraction:
 *
 *   <AIRegion type="answer" question="What does it cost?">
 *     <p>Plans start at $9/month.</p>
 *   </AIRegion>
 *
 * The same markup is read statically by the CLI to embed answers/summaries into
 * llms-full.txt, so the content stays in sync with the page.
 */
export function AIRegion({
  type = 'general',
  question,
  term,
  as = 'div',
  children,
  ...rest
}: AIRegionProps) {
  const Tag = as as React.ElementType
  return (
    <Tag
      data-ai-type={type}
      data-ai-question={question || undefined}
      data-ai-term={term || undefined}
      {...rest}
    >
      {children}
    </Tag>
  )
}
