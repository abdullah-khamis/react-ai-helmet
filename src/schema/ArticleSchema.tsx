import React from 'react'
import { JsonLd } from '../JsonLd.js'
import { useAIContext } from '../context.js'
import type { AuthorInput } from '../types.js'

export interface ArticleSchemaProps {
  headline?: string
  description?: string
  /** A name string or a partial schema.org Person. */
  author?: AuthorInput
  datePublished?: string
  dateModified?: string
  image?: string
  url?: string
  /** Publisher name; defaults to <AIHelmet> siteName. */
  publisher?: string
}

/**
 * schema.org/Article. Drop onto a blog post or doc page.
 *
 *   <ArticleSchema headline="How to Build a REST API" author="Jane Doe"
 *     datePublished="2025-06-07" description="A step-by-step guide..." />
 */
export function ArticleSchema({
  headline,
  description,
  author,
  datePublished,
  dateModified,
  image,
  url,
  publisher,
}: ArticleSchemaProps) {
  const { siteName, siteUrl } = useAIContext()

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    image,
    url,
    datePublished,
    dateModified: dateModified || datePublished,
    author: toPerson(author),
    publisher: toOrg(publisher || siteName, siteUrl),
  }

  return <JsonLd data={data} />
}

function toPerson(author?: AuthorInput) {
  if (!author) return undefined
  if (typeof author === 'string') return { '@type': 'Person', name: author }
  return { '@type': 'Person', ...author }
}

function toOrg(name?: string, url?: string) {
  if (!name) return undefined
  return { '@type': 'Organization', name, url }
}
