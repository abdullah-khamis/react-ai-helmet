// Security probes: attempt XSS/injection through every untrusted-data path and
// assert the output is safe. Run against the built dist + the CLI modules.
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProductSchema, FAQSchema, ArticleSchema, AIRegion, AIHelmet } from './dist/index.js'
import { createManifest } from './dist/collect.js'
import { buildSitemap } from './sitemap-generator.js'

const h = React.createElement
let pass = 0, fail = 0
const ok = (l, c, d = '') => c ? (pass++, console.log(`✓ ${l}`)) : (fail++, console.log(`✗ ${l}${d ? `\n   ${d}` : ''}`))

const BREAKOUT = '</script><script>window.__pwned=1</script>'
const IMG = '"><img src=x onerror=alert(1)>'

// ── 1. JsonLd <script> breakout via schema props ────────────────────────────
// A single schema renders exactly one ld+json <script>. If escaping fails, the
// payload's </script> closes it early and </script> appears more than once.
{
  const html = renderToStaticMarkup(h(ProductSchema, { name: BREAKOUT, description: BREAKOUT }))
  const closes = (html.match(/<\/script>/g) || []).length
  ok('ProductSchema: exactly one </script> (no breakout)', closes === 1, `count=${closes}\n   ${html}`)
  ok('ProductSchema: no literal </script><script> in output', !html.includes('</script><script>'))
  ok('ProductSchema: payload < was escaped to \\u003c', html.includes('\\u003c/script'))
}
{
  const html = renderToStaticMarkup(h(FAQSchema, { items: [{ question: BREAKOUT, answer: BREAKOUT }] }))
  ok('FAQSchema: exactly one </script>', (html.match(/<\/script>/g) || []).length === 1, html)
}
{
  const html = renderToStaticMarkup(h(ArticleSchema, { headline: BREAKOUT, author: BREAKOUT }))
  ok('ArticleSchema: exactly one </script>', (html.match(/<\/script>/g) || []).length === 1, html)
}

// Round-trip: a consumer JSON.parsing the block recovers the real characters.
{
  const html = renderToStaticMarkup(h(ProductSchema, { name: BREAKOUT }))
  const body = html.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')
  const data = JSON.parse(body)
  ok('JSON-LD still parses and recovers original text', data.name === BREAKOUT, JSON.stringify(data.name))
}

// ── 2. AIRegion attribute injection ─────────────────────────────────────────
{
  const html = renderToStaticMarkup(h(AIRegion, { type: IMG, question: IMG, term: IMG }, 'safe'))
  ok('AIRegion: no raw <img injected via attributes', !html.includes('<img'), html)
  ok('AIRegion: quote/bracket escaped in attribute', html.includes('&quot;') && html.includes('&gt;'))
}

// ── 3. AIHelmet training meta is fixed, not user-injected ───────────────────
{
  const html = renderToStaticMarkup(h(AIHelmet, { allowTraining: false }, h('div', null, 'x')))
  ok('AIHelmet: meta content is the fixed value', html.includes('content="noai, noimageai"'))
}

// ── 4. collect.createManifest: malicious rendered HTML ──────────────────────
{
  // Prototype-pollution attempt via JSON-LD, plus an unterminated region tag.
  const evil = `
    <script type="application/ld+json">{"@type":"Thing","__proto__":{"polluted":"yes"}}</script>
    <div data-ai-type="summary">text &amp; <b>more</b></div>
    <div data-ai-type="answer" data-ai-question="&quot;onerror&quot;">unterminated`
  const manifest = createManifest([{ url: '/x', html: evil }])
  ok('createManifest: does not throw on hostile HTML', !!manifest)
  ok('createManifest: no prototype pollution', ({}).polluted === undefined)
  const region = manifest.pages[0].regions.find(r => r.type === 'summary')
  ok('createManifest: region text decoded & tags stripped', region?.content === 'text & more', JSON.stringify(region))
  ok('createManifest: unterminated region dropped (no match)',
    !manifest.pages[0].regions.some(r => r.type === 'answer'))
}

// ── 5. loadManifest prototype pollution via manifest file ───────────────────
{
  const { mergeManifest } = await import('./manifest.js')
  const entries = []
  mergeManifest(entries, JSON.parse('{"version":1,"pages":[{"url":"/a","faqItems":[],"regions":[]},{"url":"__proto__","faqItems":[]}]}'))
  ok('mergeManifest: no prototype pollution from page urls', ({}).a === undefined && Object.prototype.url === undefined)
}

// ── 6. sitemap XML injection ────────────────────────────────────────────────
{
  const xml = buildSitemap([{ url: '/p?x=1&y=2"><script>', priority: 'high' }], { siteUrl: 'https://acme.com' })
  ok('sitemap: special chars in URL are XML-escaped', !xml.includes('<script>') && xml.includes('&amp;') && xml.includes('&lt;'), xml)
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
