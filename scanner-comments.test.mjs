// Guards the comment-stripping fix: component names in comments must not create
// phantom pages, while // or /* inside string literals (URLs etc.) must survive.
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { scanProject } from './scanner.js'

let pass = 0, fail = 0
const ok = (l, c, d = '') => c ? (pass++, console.log(`✓ ${l}`)) : (fail++, console.log(`✗ ${l}${d ? `\n   ${d}` : ''}`))

const root = mkdtempSync(join(tmpdir(), 'rah-cmt-'))
const src = join(root, 'src')
mkdirSync(src)

// 1) Component names ONLY in comments (line + block) — must NOT be detected.
writeFileSync(join(src, 'docs.jsx'), `
// Example usage: <FAQSchema items={[{ question: 'x', answer: 'y' }]} />
/* You can also drop in <AIRegion type="answer">...</AIRegion> here. */
export default function Docs() {
  return <div>Just documentation, no real schema usage.</div>
}
`)

// 2) Real FAQ whose answer contains a URL with // — must survive stripping.
writeFileSync(join(src, 'pricing.jsx'), `
import { FAQSchema } from 'react-ai-helmet'
export default function Pricing() {
  return (
    <FAQSchema items={[
      { question: 'Where are the docs?', answer: 'See https://projectflow.example/docs for details.' },
    ]} />
  )
}
`)

// 3) A commented-out AIRegion plus a real one — only the real one counts.
writeFileSync(join(src, 'home.jsx'), `
import { AIRegion } from 'react-ai-helmet'
export default function Home() {
  return (
    <main>
      {/* <AIRegion type="summary">old copy, commented out</AIRegion> */}
      <AIRegion type="summary">Real summary text.</AIRegion>
    </main>
  )
}
`)

const config = {
  root, srcDirs: ['src'], extensions: ['.jsx', '.tsx', '.js', '.ts'],
  ignore: ['node_modules'], verbose: false,
}
const entries = await scanProject(config)
const byFile = (s) => entries.find((e) => e.filePath.includes(s))

ok('comment-only mentions create no page', !byFile('docs.jsx'),
  `entries: ${entries.map(e => e.filePath).join(', ')}`)

const pricing = byFile('pricing.jsx')
ok('real FAQ page detected', !!pricing)
ok('one FAQ item extracted', pricing?.faqItems.length === 1)
ok('URL with // preserved (not corrupted)',
  pricing?.faqItems[0].answer === 'See https://projectflow.example/docs for details.',
  JSON.stringify(pricing?.faqItems[0]?.answer))

const home = byFile('home.jsx')
ok('page with real AIRegion detected', !!home)
ok('commented-out region ignored, only real one kept', home?.regions.length === 1,
  `regions: ${home?.regions.length}`)
ok('real region content intact', home?.regions[0]?.content === 'Real summary text.',
  JSON.stringify(home?.regions[0]?.content))

rmSync(root, { recursive: true, force: true })
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
