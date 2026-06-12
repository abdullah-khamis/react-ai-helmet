import React from 'react'
import { JsonLd } from '../JsonLd.js'
import type { FAQItem } from '../types.js'

export interface FAQSchemaProps {
  items?: FAQItem[]
}

/**
 * schema.org/FAQPage — the highest-leverage schema for AI answer surfacing.
 *
 *   <FAQSchema items={[
 *     { question: 'What does it cost?', answer: 'Plans start at $9/month.' },
 *     { question: 'Is there a free tier?', answer: 'Yes, up to 3 users.' },
 *   ]} />
 */
export function FAQSchema({ items = [] }: FAQSchemaProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: { '@type': 'Answer', text: it.answer },
    })),
  }

  return <JsonLd data={data} />
}
