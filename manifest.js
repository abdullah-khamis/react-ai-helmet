import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * Optional runtime manifest produced by the collection API
 * (`react-ai-helmet/collect`). It captures schema content the static scanner
 * can't read — chiefly dynamic props like <FAQSchema items={faqs}> where the
 * items come from a variable. The CLI merges it into the static scan so that
 * content still reaches llms-full.txt.
 */

const DEFAULT_FILENAME = 'react-ai-helmet.manifest.json'

/**
 * Load the manifest if present. Returns null when missing or malformed — the
 * manifest is purely additive, so a bad file should never break generation.
 */
export function loadManifest(config) {
  const path = config.manifestPath || join(config.root, DEFAULT_FILENAME)
  if (!existsSync(path)) return null
  try {
    const json = JSON.parse(readFileSync(path, 'utf8'))
    return json && Array.isArray(json.pages) ? json : null
  } catch {
    return null
  }
}

/**
 * Merge manifest pages into the scanned entries (mutates and returns `entries`).
 * Matching is by URL. The manifest reflects what actually rendered, so for a
 * page it covers it is authoritative: its faqItems and regions REPLACE the
 * scanned ones (only when non-empty, so an uncollected page never wipes the
 * scan). This avoids partial-vs-full duplicates when a region or item mixes
 * static text with a dynamic expression. Manifest-only pages are appended.
 *
 * @returns {{ entries: Array, added: number, enriched: number }}
 */
export function mergeManifest(entries, manifest) {
  if (!manifest || !Array.isArray(manifest.pages)) {
    return { entries, added: 0, enriched: 0 }
  }

  const byUrl = new Map(entries.map((e) => [normalizeUrl(e.url), e]))
  let added = 0
  let enriched = 0

  for (const page of manifest.pages) {
    if (!page || !page.url) continue
    const faqItems = Array.isArray(page.faqItems) ? page.faqItems : []
    const regions = Array.isArray(page.regions) ? page.regions : []
    const existing = byUrl.get(normalizeUrl(page.url))

    if (existing) {
      let touched = false
      if (faqItems.length) { existing.faqItems = faqItems; touched = true }
      if (regions.length) { existing.regions = regions; touched = true }
      if (!existing.description && page.description) existing.description = page.description
      if (touched) enriched++
    } else {
      const entry = normalizePage(page, faqItems, regions)
      entries.push(entry)
      byUrl.set(normalizeUrl(entry.url), entry)
      added++
    }
  }

  return { entries, added, enriched }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Canonical form for URL matching: the scanner derives urls from file paths
 * ("/pricing") while the manifest carries the app's route strings, which may
 * differ by a trailing slash ("/pricing/") or missing leading slash. Without
 * normalization those would duplicate a page instead of enriching it.
 */
function normalizeUrl(url) {
  let u = String(url).trim()
  if (!u.startsWith('/')) u = '/' + u
  if (u.length > 1) u = u.replace(/\/+$/, '')
  return u
}

function normalizePage(page, faqItems, regions) {
  return {
    filePath: '(manifest)',
    url: page.url,
    title: page.title || page.url,
    description: page.description || '',
    priority: page.priority || 'medium',
    regions,
    schemaType: (page.schemas && page.schemas[0] && page.schemas[0].type) || null,
    faqItems,
    faqUnresolved: false,
  }
}
