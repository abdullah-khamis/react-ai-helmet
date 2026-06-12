// Proves the HTML-extraction collector captures what actually renders — schema
// (incl. dynamic props), FAQ from a variable, AIRegion text, nested markup, and
// crucially text produced by a *child component* (which a tree-walk can't read).
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AIHelmet, FAQSchema, ProductSchema, AIRegion } from './dist/index.js'
import { createManifest } from './dist/collect.js'

const h = React.createElement
let pass = 0, fail = 0
const ok = (l, c, d = '') => c ? (pass++, console.log(`✓ ${l}`)) : (fail++, console.log(`✗ ${l}${d ? `\n   ${d}` : ''}`))

// Values from variables / dynamic props — what the static scanner can't read.
const faqs = [
  { question: 'Dynamic Q1?', answer: 'Dynamic A1.' },
  { question: 'Dynamic Q2?', answer: 'Dynamic A2 with <brackets> & "quotes".' },
]
const price = 99
const blurb = 'Pro adds unlimited projects and priority support.'

// Text produced by a child component — only exists after it renders.
function Blurb({ text }) {
  return h('span', null, text)
}

const html = renderToStaticMarkup(
  h(AIHelmet, { siteName: 'Acme' },
    h(FAQSchema, { items: faqs }),
    h(ProductSchema, { name: 'Pro', price }),
    h(AIRegion, { type: 'summary' }, h(Blurb, { text: blurb })),                 // child component
    h(AIRegion, { type: 'answer', question: 'What ships?' },
      h('p', null, 'Para ', h('strong', null, 'bold'), ' end')),                  // nested markup
  ),
)

const manifest = createManifest([{ url: '/pricing', title: 'Pricing', priority: 'high', html }])

ok('manifest version 1', manifest.version === 1)
ok('one page', manifest.pages.length === 1)
const page = manifest.pages[0]

// Schema
ok('FAQPage schema extracted from HTML', page.schemas.some(s => s.type === 'FAQPage'))
ok('Product schema extracted', page.schemas.some(s => s.type === 'Product'))
ok('dynamic price resolved in schema',
  page.schemas.find(s => s.type === 'Product')?.data.offers?.price === '99')

// FAQ (from a variable) — with entities decoded back to real characters
ok('2 FAQ items captured', page.faqItems.length === 2, JSON.stringify(page.faqItems))
ok('FAQ question captured', page.faqItems[0].question === 'Dynamic Q1?')
ok('FAQ answer entities decoded', page.faqItems[1].answer === 'Dynamic A2 with <brackets> & "quotes".',
  JSON.stringify(page.faqItems[1].answer))

// Regions
ok('2 regions captured', page.regions.length === 2, JSON.stringify(page.regions))
const summary = page.regions.find(r => r.type === 'summary')
ok('CHILD-COMPONENT text captured (limitation closed)', summary?.content === blurb,
  JSON.stringify(summary))
const answer = page.regions.find(r => r.type === 'answer')
ok('nested markup flattened to text', answer?.content === 'Para bold end', JSON.stringify(answer))
ok('region question captured', answer?.question === 'What ships?')

// Robustness: malformed input doesn't throw
const empty = createManifest([{ url: '/x', html: '<div>no markers here</div>' }])
ok('page with no markers → empty schemas/faq/regions',
  empty.pages[0].schemas.length === 0 && empty.pages[0].faqItems.length === 0 && empty.pages[0].regions.length === 0)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
