// Build-time collection API. Captures the schema and AIRegion content a page
// actually renders by parsing its HTML — the output your SSR/SSG build already
// produces. Because it reads rendered output (not the element tree), it captures
// text from nested custom components, dynamic props, and variables alike.
//
// No react-dom import here: the host app renders to a string; we just parse it.
// Relies only on the markers the components already emit for their primary
// purpose: <script type="application/ld+json"> and data-ai-* attributes.

import type { FAQItem } from './types.js'

export interface PageMeta {
  url: string
  title?: string
  description?: string
  priority?: 'high' | 'medium' | 'low'
}

export interface SchemaRecord {
  type: string
  data: Record<string, unknown>
}

export interface RegionRecord {
  type: string
  question: string
  term: string
  content: string
}

export interface PageManifest extends PageMeta {
  schemas: SchemaRecord[]
  faqItems: FAQItem[]
  regions: RegionRecord[]
}

export interface Manifest {
  version: 1
  pages: PageManifest[]
}

/** A rendered page: its metadata plus the HTML string from renderToStaticMarkup. */
export interface PageRender extends PageMeta {
  html: string
}

/**
 * Build a manifest from rendered pages.
 *
 *   const renders = routes.map((r) => ({
 *     url: r.path, title: r.title,
 *     html: renderToStaticMarkup(<App url={r.path} />),
 *   }))
 *   writeFileSync('react-ai-helmet.manifest.json', JSON.stringify(createManifest(renders)))
 */
export function createManifest(renders: PageRender[]): Manifest {
  return { version: 1, pages: renders.map(extractPage) }
}

function extractPage(render: PageRender): PageManifest {
  const { html, ...meta } = render
  const schemas = extractSchemas(html)

  const faqItems: FAQItem[] = []
  for (const s of schemas) {
    if (s.type !== 'FAQPage' || !Array.isArray(s.data.mainEntity)) continue
    for (const q of s.data.mainEntity as Array<Record<string, unknown>>) {
      const question = q?.name
      const answer = (q?.acceptedAnswer as Record<string, unknown> | undefined)?.text
      if (typeof question === 'string' && typeof answer === 'string') {
        faqItems.push({ question, answer })
      }
    }
  }

  return { ...meta, schemas, faqItems, regions: extractRegions(html) }
}

// ─── JSON-LD extraction ───────────────────────────────────────────────────────

const SCRIPT_RE = /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g

/**
 * Pull every JSON-LD block. JsonLd escapes `<` as < (a valid JSON escape),
 * so the only literal </script> is the real closing tag and JSON.parse restores
 * the original characters. Malformed blocks are skipped, not fatal.
 */
function extractSchemas(html: string): SchemaRecord[] {
  const out: SchemaRecord[] = []
  let m: RegExpExecArray | null
  SCRIPT_RE.lastIndex = 0
  while ((m = SCRIPT_RE.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1] ?? '')
      if (data && typeof data === 'object') {
        const type = typeof data['@type'] === 'string' ? data['@type'] : 'Unknown'
        out.push({ type, data })
      }
    } catch {
      // ignore an unparseable block
    }
  }
  return out
}

// ─── AIRegion extraction ──────────────────────────────────────────────────────

const REGION_OPEN_RE = /<([a-zA-Z][\w-]*)\b([^>]*\bdata-ai-type=[^>]*)>/g

/**
 * Find every element carrying data-ai-type and extract its text. The element's
 * inner HTML is isolated by depth-matching its own tag name (so nested same-name
 * tags don't end it early), then tags are stripped and entities decoded. A
 * nested AIRegion is folded into its ancestor's text rather than double-counted.
 */
function extractRegions(html: string): RegionRecord[] {
  const regions: RegionRecord[] = []
  let m: RegExpExecArray | null
  REGION_OPEN_RE.lastIndex = 0

  while ((m = REGION_OPEN_RE.exec(html)) !== null) {
    const tag = m[1] ?? ''
    const attrs = m[2] ?? ''
    const innerStart = REGION_OPEN_RE.lastIndex
    const innerEnd = findCloseTag(html, tag, innerStart)
    if (innerEnd === -1) continue

    const content = htmlToText(html.slice(innerStart, innerEnd))
    if (content) {
      regions.push({
        type: attrValue(attrs, 'data-ai-type') || 'general',
        question: attrValue(attrs, 'data-ai-question'),
        term: attrValue(attrs, 'data-ai-term'),
        content,
      })
    }
    REGION_OPEN_RE.lastIndex = innerEnd // skip the inner; fold nested regions in
  }
  return regions
}

/** Index of the matching closing `</tag>`, honouring nested same-name tags. */
function findCloseTag(html: string, tag: string, from: number): number {
  const re = new RegExp(`<(/?)${tag}\\b([^>]*)>`, 'gi')
  re.lastIndex = from
  let depth = 1
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    if (m[1] === '/') {
      if (--depth === 0) return m.index
    } else if (!(m[2] ?? '').endsWith('/')) {
      depth++ // an opening tag that isn't self-closing
    }
  }
  return -1
}

/** Read a double-quoted attribute value and decode HTML entities. */
function attrValue(attrs: string, name: string): string {
  const m = new RegExp(`${name}="([^"]*)"`).exec(attrs)
  return m ? decodeEntities(m[1] ?? '') : ''
}

/** Strip tags, decode entities, collapse whitespace. */
function htmlToText(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&') // last, so &amp;lt; -> &lt; not <
}

function safeCodePoint(n: number): string {
  try {
    return String.fromCodePoint(n)
  } catch {
    return ''
  }
}
