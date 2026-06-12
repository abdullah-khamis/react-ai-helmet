import React from 'react'
import { JsonLd } from '../JsonLd.js'

export interface EventSchemaProps {
  name?: string
  description?: string
  startDate?: string
  endDate?: string
  /** A URL / "online" → VirtualLocation, otherwise a physical Place. */
  location?: string | Record<string, unknown>
  url?: string
  image?: string
}

/**
 * schema.org/Event.
 *
 *   <EventSchema name="Launch Webinar" startDate="2025-07-01T17:00:00Z"
 *     location="Online" url="https://acme.com/webinar" />
 */
export function EventSchema({
  name,
  description,
  startDate,
  endDate,
  location,
  url,
  image,
}: EventSchemaProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name,
    description,
    startDate,
    endDate,
    url,
    image,
    location: toLocation(location),
  }

  return <JsonLd data={data} />
}

function toLocation(location?: string | Record<string, unknown>) {
  if (!location) return undefined
  if (typeof location !== 'string') return location
  const isVirtual = /^https?:\/\//i.test(location) || /online/i.test(location)
  return isVirtual
    ? {
        '@type': 'VirtualLocation',
        url: /^https?:/i.test(location) ? location : undefined,
        name: location,
      }
    : { '@type': 'Place', name: location }
}
