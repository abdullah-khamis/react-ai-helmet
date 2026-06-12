// Tests buildSitemap: absolute locs, lastmod, priority mapping, dynamic-route
// and duplicate handling, and the no-siteUrl guard.
import { buildSitemap } from './sitemap-generator.js'

let pass = 0, fail = 0
const ok = (l, c, d = '') => c ? (pass++, console.log(`✓ ${l}`)) : (fail++, console.log(`✗ ${l}${d ? `\n   ${d}` : ''}`))

const entries = [
  { url: '/', title: 'Home', priority: 'high', lastmod: '2026-06-01' },
  { url: '/pricing', title: 'Pricing', priority: 'medium' }, // no lastmod
  { url: '/blog/:param', title: 'Blog', priority: 'low' },   // dynamic template — skip
  { url: '/pricing', title: 'Dup', priority: 'medium' },     // duplicate URL — skip
  { url: '/about', title: 'About', priority: 'low', lastmod: '2026-05-20' },
]

const xml = buildSitemap(entries, { siteUrl: 'https://acme.com/' })
console.log('\n' + xml)

ok('xml declaration present', xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'))
ok('urlset namespace present', xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'))
ok('absolute loc, trailing slash on siteUrl normalized', xml.includes('<loc>https://acme.com/</loc>'))
ok('pricing loc absolute', xml.includes('<loc>https://acme.com/pricing</loc>'))
ok('lastmod included when present', xml.includes('<lastmod>2026-06-01</lastmod>'))
ok('high priority → 1.0', /https:\/\/acme\.com\/<\/loc>\s*<lastmod>2026-06-01<\/lastmod>\s*<priority>1\.0<\/priority>/.test(xml))
ok('medium priority → 0.5', xml.includes('<priority>0.5</priority>'))

const locCount = (xml.match(/<loc>/g) || []).length
ok('dynamic route skipped + duplicate deduped (3 urls)', locCount === 3, `got ${locCount}`)
ok('dynamic :param not present', !xml.includes(':param'))

ok('returns null without siteUrl', buildSitemap(entries, {}) === null)
ok('returns null with empty siteUrl', buildSitemap(entries, { siteUrl: '' }) === null)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
