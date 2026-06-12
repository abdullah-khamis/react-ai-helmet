import React from 'react'
import { JsonLd } from '../JsonLd.js'
import type { Availability, RatingInput } from '../types.js'

export interface ProductSchemaProps {
  name?: string
  description?: string
  image?: string
  brand?: string
  sku?: string
  price?: number | string
  /** ISO 4217 currency code. Defaults to 'USD'. */
  currency?: string
  availability?: Availability
  url?: string
  rating?: RatingInput
}

/**
 * schema.org/Product with a nested Offer. Critical for AI shopping tools.
 *
 *   <ProductSchema name="Pro Plan" price={99} currency="USD"
 *     availability="InStock" description="..." />
 */
export function ProductSchema({
  name,
  description,
  image,
  brand,
  sku,
  price,
  currency = 'USD',
  availability = 'InStock',
  url,
  rating,
}: ProductSchemaProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image,
    sku,
    brand: brand ? { '@type': 'Brand', name: brand } : undefined,
    offers:
      price != null
        ? {
            '@type': 'Offer',
            price: String(price),
            priceCurrency: currency,
            availability: `https://schema.org/${availability}`,
            url,
          }
        : undefined,
    aggregateRating: rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: String(rating.value),
          reviewCount: String(rating.count),
        }
      : undefined,
  }

  return <JsonLd data={data} />
}
