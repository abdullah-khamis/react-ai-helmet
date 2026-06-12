// End-to-end: a page whose <FAQSchema items={variable}> the scanner couldn't
// read (faqUnresolved) gets enriched from the runtime manifest, and the dynamic
// Q&A reaches llms-full.txt. Also covers manifest-only pages and loadManifest.
import { mkdtempSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { loadManifest, mergeManifest } from './manifest.js'
import { buildLlmsFullTxt } from './llms-generator.js'

let pass = 0, fail = 0
const ok = (l, c, d = '') => c ? (pass++, console.log(`✓ ${l}`)) : (fail++, console.log(`✗ ${l}${d ? `\n   ${d}` : ''}`))

// Scanned result: /pricing had items={faqs} (unresolved, no items); /docs not scanned.
const entries = [
  {
    filePath: 'src/pricing.jsx', url: '/pricing', title: 'Pricing',
    description: '', priority: 'high',
    // A region whose content the scanner could only partially read (dynamic
    // expression stripped) — the manifest should replace it with the full text.
    regions: [{ type: 'summary', question: '', term: '', content: 'Pro adds' }],
    schemaType: 'FAQPage', faqItems: [], faqUnresolved: true,
  },
]

// Manifest from a collection pass.
const manifest = {
  version: 1,
  pages: [
    {
      url: '/pricing', title: 'Pricing', description: 'Plans and pricing',
      faqItems: [{ question: 'How much (dynamic)?', answer: 'From $9/mo.' }],
      regions: [{ type: 'summary', question: '', term: '', content: 'Pro adds unlimited projects and priority support.' }],
      schemas: [{ type: 'FAQPage', data: {} }],
    },
    {
      url: '/docs', title: 'Docs', priority: 'medium',
      faqItems: [{ question: 'Where are the docs?', answer: 'At /docs.' }],
      schemas: [],
    },
  ],
}

const { added, enriched } = mergeManifest(entries, manifest)
ok('one page enriched', enriched === 1, `enriched=${enriched}`)
ok('one page added', added === 1, `added=${added}`)
ok('pricing faqItems filled from manifest', entries.find(e => e.url === '/pricing').faqItems.length === 1)
ok('manifest backfilled missing description', entries.find(e => e.url === '/pricing').description === 'Plans and pricing')
ok('manifest-only /docs added', !!entries.find(e => e.url === '/docs'))

// Region replacement: the partial scanned region ("Pro adds") is replaced by
// the manifest's full text, not duplicated.
const pricingRegions = entries.find(e => e.url === '/pricing').regions
ok('partial region replaced (not duplicated)', pricingRegions.length === 1, JSON.stringify(pricingRegions))
ok('region content is the full manifest text',
  pricingRegions[0].content === 'Pro adds unlimited projects and priority support.')

const out = buildLlmsFullTxt(entries, {
  siteName: 'Acme', siteUrl: 'https://acme.com', llms: { categories: {} },
})

ok('dynamic FAQ (was unresolved) now in llms-full', out.includes('**Q: How much (dynamic)?**'),
  'gap NOT closed')
ok('manifest-only page content in llms-full', out.includes('**Q: Where are the docs?**'))
ok('dynamic region text in llms-full', out.includes('Pro adds unlimited projects and priority support.'))
ok('partial region text NOT present', !/\*\*Summary:\*\* Pro adds$/m.test(out))

// URL normalization: a manifest url differing only by a trailing slash (or a
// missing leading slash) must enrich the scanned page, not duplicate it.
{
  const scanned = [{
    filePath: 'src/pricing.jsx', url: '/pricing', title: 'Pricing',
    description: '', priority: 'high', regions: [],
    schemaType: 'FAQPage', faqItems: [], faqUnresolved: true,
  }]
  const slashManifest = {
    version: 1,
    pages: [{
      url: '/pricing/',
      faqItems: [{ question: 'Trailing slash?', answer: 'Still matches.' }],
      schemas: [],
    }],
  }
  const r = mergeManifest(scanned, slashManifest)
  ok('trailing-slash url enriches instead of duplicating', r.enriched === 1 && r.added === 0,
    `enriched=${r.enriched} added=${r.added}`)
  ok('no duplicate page appended', scanned.length === 1, `entries=${scanned.length}`)

  const r2 = mergeManifest(scanned, { version: 1, pages: [{ url: 'pricing', description: 'No leading slash' }] })
  ok('missing leading slash still matches', r2.added === 0 && scanned.length === 1)
}

// loadManifest from disk: present, malformed, absent.
const dir = mkdtempSync(join(tmpdir(), 'rah-man-'))
writeFileSync(join(dir, 'react-ai-helmet.manifest.json'), JSON.stringify(manifest))
ok('loadManifest reads a valid file', loadManifest({ root: dir })?.pages.length === 2)

writeFileSync(join(dir, 'bad.json'), '{ not json')
ok('loadManifest tolerates malformed file (null)', loadManifest({ root: dir, manifestPath: join(dir, 'bad.json') }) === null)
ok('loadManifest returns null when absent', loadManifest({ root: join(dir, 'nope') }) === null)
rmSync(dir, { recursive: true, force: true })

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
