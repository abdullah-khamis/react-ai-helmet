import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { scanProject } from './scanner.js'
import { buildLlmsFullTxt } from './llms-generator.js'

let pass = 0, fail = 0
const ok = (l, c, d = '') => c ? (pass++, console.log(`✓ ${l}`)) : (fail++, console.log(`✗ ${l}${d ? `\n   ${d}` : ''}`))

// ── Build a throwaway fixture project ────────────────────────────────────────
const root = mkdtempSync(join(tmpdir(), 'rah-faq-'))
const src = join(root, 'src')
mkdirSync(src)

// Inline literal: mixed quotes, an escaped apostrophe, an em dash, a $ sign.
// Plus an AIRegion answer that DUPLICATES one FAQ item (must dedupe).
writeFileSync(join(src, 'pricing.jsx'), `
import { FAQSchema, AIRegion } from 'react-ai-helmet'
export default function Pricing() {
  return (
    <>
      <FAQSchema items={[
        { question: "How much does it cost?", answer: "Plans start at $9/month." },
        { question: 'Is there a free tier?', answer: 'Yes — up to 3 users.' },
        { question: 'Can I cancel?', answer: 'Yes, it\\'s cancel-anytime.' },
      ]} />
      <AIRegion type="answer" question="How much does it cost?">
        <p>Plans start at $9/month.</p>
      </AIRegion>
    </>
  )
}
`)

// Variable reference: must be flagged unresolved (and emit a warning).
writeFileSync(join(src, 'help.jsx'), `
import { FAQSchema } from 'react-ai-helmet'
const faqs = [{ question: 'Q', answer: 'A' }]
export default () => <FAQSchema items={faqs} />
`)

const config = {
  root,
  srcDirs: ['src'],
  extensions: ['.jsx', '.tsx', '.js', '.ts'],
  ignore: ['node_modules'],
  verbose: false,
}

const entries = await scanProject(config)
const pricing = entries.find((e) => e.filePath.includes('pricing'))
const help = entries.find((e) => e.filePath.includes('help'))

// ── Scanner assertions ───────────────────────────────────────────────────────
ok('pricing page scanned', !!pricing)
ok('extracted 3 FAQ items from inline literal', pricing?.faqItems.length === 3,
  JSON.stringify(pricing?.faqItems))
ok('double-quoted Q parsed', pricing?.faqItems[0].question === 'How much does it cost?')
ok('value with $ preserved', pricing?.faqItems[0].answer === 'Plans start at $9/month.')
ok('single-quoted + em dash parsed', pricing?.faqItems[1].answer === 'Yes — up to 3 users.')
ok('escaped apostrophe unescaped', pricing?.faqItems[2].answer === "Yes, it's cancel-anytime.",
  JSON.stringify(pricing?.faqItems[2]?.answer))
ok('variable-ref items flagged unresolved', help?.faqUnresolved === true)
ok('unresolved page has no items', help?.faqItems.length === 0)

// ── Generator merge/dedupe assertions ────────────────────────────────────────
const out = buildLlmsFullTxt(entries, {
  siteName: 'Acme', siteUrl: 'https://acme.com',
  llms: { categories: {} },
})

// The duplicated "How much does it cost?" appears once despite being in both
// the FAQSchema items AND an AIRegion answer.
const costCount = out.split('**Q: How much does it cost?**').length - 1
ok('overlapping Q (FAQSchema + AIRegion) deduped to one', costCount === 1, `count=${costCount}`)
ok('FAQSchema-only question reaches llms-full', out.includes('**Q: Is there a free tier?**'))
ok('FAQSchema answer reaches llms-full', out.includes('Yes — up to 3 users.'))

console.log('\n----- FULL CONTENT (pricing excerpt) -----')
console.log(out.slice(out.indexOf('## Pricing')))
console.log('------------------------------------------')

rmSync(root, { recursive: true, force: true })
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
