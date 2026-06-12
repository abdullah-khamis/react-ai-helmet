import React from 'react'
import { JsonLd } from '../JsonLd.js'
import { useAIContext } from '../context.js'

export interface OrgSchemaProps {
  name?: string
  url?: string
  description?: string
  logo?: string
  email?: string
  telephone?: string
  /** Profile URLs (social, Crunchbase, Wikipedia) that corroborate identity. */
  sameAs?: string[]
}

/**
 * schema.org/Organization — identity for your brand. Place once, typically on
 * the home or about page. Falls back to <AIHelmet> site context for name/url.
 *
 *   <OrgSchema name="Acme" url="https://acme.com" email="hello@acme.com"
 *     description="Project management for remote teams"
 *     sameAs={['https://twitter.com/acme']} />
 */
export function OrgSchema({
  name,
  url,
  description,
  logo,
  email,
  telephone,
  sameAs,
}: OrgSchemaProps) {
  const ctx = useAIContext()

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: name || ctx.siteName,
    url: url || ctx.siteUrl,
    description: description || ctx.siteDescription,
    logo,
    sameAs,
    contactPoint:
      email || telephone
        ? { '@type': 'ContactPoint', email, telephone, contactType: 'customer support' }
        : undefined,
  }

  return <JsonLd data={data} />
}
