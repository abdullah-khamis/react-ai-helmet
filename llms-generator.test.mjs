import { buildLlmsFullTxt } from './llms-generator.js'

let pass = 0
let fail = 0
function assert(label, cond, detail = '') {
  if (cond) { pass++; console.log(`✓ ${label}`) }
  else { fail++; console.log(`✗ ${label}${detail ? `\n   ${detail}` : ''}`) }
}

const config = {
  siteName: 'Acme',
  siteDescription: 'Project tools',
  siteUrl: 'https://acme.com',
  llms: { categories: { Product: ['/pricing'], Blog: ['/blog'] } },
}

const entries = [
  {
    url: '/blog/post',
    title: 'A Blog Post',
    description: 'A low-priority post',
    priority: 'low',
    schemaType: 'Article',
    regions: [
      { type: 'general', question: '', term: '', content: 'Body text.' },
      // duplicate of the above — must be deduped
      { type: 'general', question: '', term: '', content: 'Body text.' },
    ],
  },
  {
    url: '/pricing',
    title: 'Pricing',
    description: 'Plans and pricing',
    priority: 'high',
    schemaType: 'Product',
    regions: [
      { type: 'answer', question: 'How much?', term: '', content: 'From $9/mo.' },
      { type: 'summary', term: '', question: '', content: 'Three plans available.' },
      { type: 'definition', term: 'Seat', question: '', content: 'One billable user.' },
    ],
  },
]

const out = buildLlmsFullTxt(entries, config)
console.log('\n----- OUTPUT -----\n' + out + '\n------------------\n')

// 1. High-priority page appears before low-priority page in the Full content section.
const full = out.slice(out.indexOf('# Full content'))
assert(
  'inline pages ordered by priority (Pricing before Blog Post)',
  full.indexOf('## Pricing') < full.indexOf('## A Blog Post'),
  `pricing@${full.indexOf('## Pricing')} blog@${full.indexOf('## A Blog Post')}`,
)

// 2. Within Pricing, prose order is summary -> definition, then FAQ for answers.
const summaryAt = full.indexOf('**Summary:** Three plans available.')
const defAt = full.indexOf('**Seat:** One billable user.')
const faqAt = full.indexOf('### FAQ')
assert('summary rendered', summaryAt !== -1)
assert('definition uses term as label', defAt !== -1)
assert('summary before definition', summaryAt < defAt, `s@${summaryAt} d@${defAt}`)
assert('prose before FAQ block', defAt < faqAt, `d@${defAt} faq@${faqAt}`)
assert('answer rendered under FAQ', full.indexOf('**Q: How much?**') > faqAt)

// 3. Dedupe: "Body text." appears exactly once.
const occurrences = out.split('Body text.').length - 1
assert('duplicate region deduped to one', occurrences === 1, `found ${occurrences}`)

// 4. Page description is inlined as a lead line.
assert('page description inlined', full.includes('Plans and pricing'))

// 5. Source URL is absolute.
assert('absolute source url', full.includes('_Source: https://acme.com/pricing_'))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
