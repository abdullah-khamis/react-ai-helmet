/**
 * Generates sitemap.xml (sitemaps.org 0.9) from scanned page entries.
 *
 * Requires config.siteUrl — sitemap <loc> values must be absolute URLs, so
 * without a site URL we can't build a valid sitemap and return null.
 *
 * Per entry: <loc> from siteUrl + path, <lastmod> from the source file's mtime
 * when available, and <priority> mapped from the page's priority.
 */

const PRIORITY = { high: '1.0', medium: '0.5', low: '0.3' }
const ORDER = { high: 0, medium: 1, low: 2 }

export function buildSitemap(entries, config) {
  const siteUrl = (config.siteUrl || '').replace(/\/$/, '')
  if (!siteUrl) return null

  // Concrete pages only: drop dynamic route templates (e.g. /blog/:param) and
  // de-duplicate by URL.
  const seen = new Set()
  const pages = []
  for (const entry of entries) {
    if (entry.url.includes(':')) continue
    if (seen.has(entry.url)) continue
    seen.add(entry.url)
    pages.push(entry)
  }

  pages.sort(
    (a, b) =>
      (ORDER[a.priority] ?? 1) - (ORDER[b.priority] ?? 1) ||
      a.url.localeCompare(b.url)
  )

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ]

  for (const entry of pages) {
    lines.push('  <url>')
    lines.push(`    <loc>${escapeXml(siteUrl + entry.url)}</loc>`)
    if (entry.lastmod) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`)
    lines.push(`    <priority>${PRIORITY[entry.priority] || '0.5'}</priority>`)
    lines.push('  </url>')
  }

  lines.push('</urlset>')
  return lines.join('\n') + '\n'
}

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
