import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  AIHelmet,
  AIPage,
  ArticleSchema,
  ProductSchema,
  FAQSchema,
  OrgSchema,
  EventSchema,
  AIRegion,
  JsonLd,
} from './dist/index.js'

const h = React.createElement
let pass = 0
let fail = 0

function check(label, markup, ...mustContain) {
  const missing = mustContain.filter((s) => !markup.includes(s))
  if (missing.length) {
    fail++
    console.log(`✗ ${label}\n   missing: ${JSON.stringify(missing)}\n   got: ${markup}\n`)
  } else {
    pass++
    console.log(`✓ ${label}`)
  }
}

// Article — inherits publisher from AIHelmet context; prunes empty fields.
check(
  'ArticleSchema (with context publisher)',
  renderToStaticMarkup(
    h(
      AIHelmet,
      { siteName: 'Acme', siteUrl: 'https://acme.com' },
      h(ArticleSchema, {
        headline: 'How to Build a REST API',
        author: 'Jane Doe',
        datePublished: '2025-06-07',
        description: 'A guide',
      }),
    ),
  ),
  'application/ld+json',
  '"@type":"Article"',
  '"headline":"How to Build a REST API"',
  '"author":{"@type":"Person","name":"Jane Doe"}',
  '"publisher":{"@type":"Organization","name":"Acme","url":"https://acme.com"}',
)

// Product — Offer expansion + availability URL.
check(
  'ProductSchema (offer + availability)',
  renderToStaticMarkup(
    h(ProductSchema, { name: 'Pro Plan', price: 99, currency: 'USD', availability: 'InStock' }),
  ),
  '"@type":"Product"',
  '"offers":{"@type":"Offer","price":"99","priceCurrency":"USD"',
  '"availability":"https://schema.org/InStock"',
)

// FAQ — Question/Answer nesting.
check(
  'FAQSchema',
  renderToStaticMarkup(
    h(FAQSchema, { items: [{ question: 'Cost?', answer: 'From $9/mo.' }] }),
  ),
  '"@type":"FAQPage"',
  '"@type":"Question","name":"Cost?"',
  '"acceptedAnswer":{"@type":"Answer","text":"From $9/mo."}',
)

// Org — fallback to context when props omitted.
check(
  'OrgSchema (context fallback + contactPoint)',
  renderToStaticMarkup(
    h(
      AIHelmet,
      { siteName: 'Acme', siteUrl: 'https://acme.com', siteDescription: 'PM tool' },
      h(OrgSchema, { email: 'hello@acme.com' }),
    ),
  ),
  '"name":"Acme"',
  '"description":"PM tool"',
  '"contactPoint":{"@type":"ContactPoint","email":"hello@acme.com"',
)

// Event — virtual location detection.
check(
  'EventSchema (virtual location)',
  renderToStaticMarkup(
    h(EventSchema, { name: 'Webinar', startDate: '2025-07-01T17:00:00Z', location: 'Online' }),
  ),
  '"@type":"Event"',
  '"location":{"@type":"VirtualLocation","name":"Online"}',
)

// AIRegion — data attributes + content preserved.
check(
  'AIRegion (data-ai attrs)',
  renderToStaticMarkup(
    h(AIRegion, { type: 'answer', question: 'What does it cost?' }, h('p', null, 'From $9/mo.')),
  ),
  'data-ai-type="answer"',
  'data-ai-question="What does it cost?"',
  '<p>From $9/mo.</p>',
)

// AIHelmet — training opt-out tag.
check(
  'AIHelmet (training opt-out)',
  renderToStaticMarkup(h(AIHelmet, { allowTraining: false }, h('div', null, 'x'))),
  'content="noai, noimageai"',
)

// Pruning — undefined optional fields must not appear.
check(
  'Pruning drops empty fields',
  renderToStaticMarkup(h(ProductSchema, { name: 'Bare' })),
  '"name":"Bare"',
)
const bare = renderToStaticMarkup(h(ProductSchema, { name: 'Bare' }))
if (bare.includes('offers') || bare.includes('aggregateRating') || bare.includes('undefined')) {
  fail++
  console.log(`✗ Pruning leaked: ${bare}`)
} else {
  pass++
  console.log('✓ Pruning leaves no offers/rating/undefined for bare product')
}

// AIPage — pure scanner hint, must render nothing.
const aiPage = renderToStaticMarkup(
  h(AIPage, { title: 'Pricing', description: 'Plans', priority: 'high', url: '/pricing' }),
)
if (aiPage === '') {
  pass++
  console.log('✓ AIPage renders nothing')
} else {
  fail++
  console.log(`✗ AIPage rendered output: ${aiPage}`)
}

// JsonLd — public escape hatch for arbitrary schema types, with pruning and
// </script> breakout protection.
check(
  'JsonLd (arbitrary schema type)',
  renderToStaticMarkup(
    h(JsonLd, {
      data: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', empty: '' }],
      },
    }),
  ),
  'application/ld+json',
  '"@type":"BreadcrumbList"',
  '"position":1',
)
const breakout = renderToStaticMarkup(h(JsonLd, { data: { '@type': 'Thing', name: '</script><b>' } }))
if (breakout.includes('</script><b>')) {
  fail++
  console.log(`✗ JsonLd script breakout not escaped: ${breakout}`)
} else {
  pass++
  console.log('✓ JsonLd escapes </script> breakout')
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
