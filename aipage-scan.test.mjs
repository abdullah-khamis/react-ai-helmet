// Scanner support for <AIPage> hints, the llmsUrl override on <AIHelmet>, and
// the allowBots/denyBots array props that feed robots.txt.
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { scanProject } from './scanner.js'

let pass = 0, fail = 0
const ok = (l, c, d = '') => c ? (pass++, console.log(`✓ ${l}`)) : (fail++, console.log(`✗ ${l}${d ? `\n   ${d}` : ''}`))

// ── Fixture project ──────────────────────────────────────────────────────────
const root = mkdtempSync(join(tmpdir(), 'rah-aipage-'))
const src = join(root, 'src')
mkdirSync(src)

// AIPage hints win over schema-derived metadata, and `url` overrides the
// file-path inference (this file would otherwise become /components/PricingView).
mkdirSync(join(src, 'components'))
writeFileSync(join(src, 'components', 'PricingView.jsx'), `
import { AIPage, ProductSchema } from 'react-ai-helmet'
export default function PricingView() {
  return (
    <>
      <AIPage title="Pricing" description="Plans and pricing" priority="high" url="/pricing/" />
      <ProductSchema name="Pro Plan" price={9} />
    </>
  )
}
`)

// App root: llmsUrl override + bot lists as array literals. The decoy component
// below carries its own allowBots prop that must NOT leak into the AIHelmet read.
writeFileSync(join(src, 'app.jsx'), `
import { AIHelmet } from 'react-ai-helmet'
import { Widget } from './widget.jsx'
export default function App({ children }) {
  return (
    <AIHelmet
      siteName="Acme"
      llmsTitle="Home"
      llmsUrl="home"
      allowBots={['ClaudeBot', 'GPTBot']}
      denyBots={['CCBot', 'SomeNewBot']}
    >
      {children}
      <Widget allowBots={['EvilBot']} />
    </AIHelmet>
  )
}
`)

const config = {
  root,
  srcDirs: ['src'],
  extensions: ['.jsx', '.tsx', '.js', '.ts'],
  ignore: ['node_modules'],
  verbose: false,
}

const entries = await scanProject(config)
const pricing = entries.find((e) => e.filePath.includes('PricingView'))
const app = entries.find((e) => e.filePath.includes('app'))

// ── AIPage hints ─────────────────────────────────────────────────────────────
ok('AIPage title wins over schema name', pricing?.title === 'Pricing', pricing?.title)
ok('AIPage description used', pricing?.description === 'Plans and pricing')
ok('AIPage priority used', pricing?.priority === 'high')
ok('AIPage url overrides file-path inference (trailing slash normalized)',
  pricing?.url === '/pricing', pricing?.url)

// ── llmsUrl on AIHelmet ──────────────────────────────────────────────────────
ok('llmsUrl override applied with leading slash added', app?.url === '/home', app?.url)

// ── Bot list extraction ──────────────────────────────────────────────────────
ok('allowBots array extracted', JSON.stringify(app?.allowBots) === JSON.stringify(['ClaudeBot', 'GPTBot']),
  JSON.stringify(app?.allowBots))
ok('denyBots array extracted', JSON.stringify(app?.denyBots) === JSON.stringify(['CCBot', 'SomeNewBot']),
  JSON.stringify(app?.denyBots))
ok("decoy component's allowBots not picked up", !app?.allowBots?.includes('EvilBot'))
ok('page without bot props has none', pricing?.allowBots === undefined && pricing?.denyBots === undefined)

rmSync(root, { recursive: true, force: true })
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
