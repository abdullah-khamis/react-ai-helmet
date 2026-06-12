// Verifies symlink hardening: links escaping the project root are not read,
// symlink cycles don't hang, and legitimate in-root symlinks still resolve.
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { scanProject } from './scanner.js'

let pass = 0, fail = 0
const ok = (l, c, d = '') => c ? (pass++, console.log(`✓ ${l}`)) : (fail++, console.log(`✗ ${l}${d ? `\n   ${d}` : ''}`))

const base = mkdtempSync(join(tmpdir(), 'rah-sym-'))
const root = join(base, 'project')
const outside = join(base, 'secrets')
mkdirSync(join(root, 'src'), { recursive: true })
mkdirSync(outside, { recursive: true })

// A real in-project page.
writeFileSync(join(root, 'src', 'home.jsx'), `
import { AIRegion } from 'react-ai-helmet'
export default () => <AIRegion type="summary">Public home content.</AIRegion>
`)

// A sensitive file OUTSIDE the project that happens to look like a component.
writeFileSync(join(outside, 'secret.jsx'), `
import { AIRegion } from 'react-ai-helmet'
export default () => <AIRegion type="summary">TOP SECRET leaked content.</AIRegion>
`)

// 1. Symlink escaping the root → must be skipped (content never read).
symlinkSync(join(outside, 'secret.jsx'), join(root, 'src', 'leak.jsx'))

// 2. In-root dir + a symlink pointing to it → must still be followed.
mkdirSync(join(root, 'src', 'shared'))
writeFileSync(join(root, 'src', 'shared', 'feature.jsx'), `
import { AIRegion } from 'react-ai-helmet'
export default () => <AIRegion type="summary">Shared feature content.</AIRegion>
`)
symlinkSync(join(root, 'src', 'shared'), join(root, 'src', 'linked-shared'))

// 3. Symlink cycle → must not hang.
symlinkSync(join(root, 'src'), join(root, 'src', 'self'))

const config = {
  root, srcDirs: ['src'], extensions: ['.jsx', '.tsx', '.js', '.ts'],
  ignore: ['node_modules'], verbose: false,
}

// Guard against an infinite loop regression: bail the process if it hangs.
const watchdog = setTimeout(() => { console.error('✗ scan hung — cycle guard failed'); process.exit(1) }, 5000)
const entries = await scanProject(config)
clearTimeout(watchdog)

const urls = entries.map((e) => e.url)
const allText = JSON.stringify(entries)

ok('real in-project page scanned', urls.some((u) => u.includes('home')), urls.join(','))
ok('escaping symlink NOT scanned', !urls.some((u) => u.includes('leak')), urls.join(','))
ok('leaked secret content absent from output', !allText.includes('TOP SECRET'))
ok('in-root symlinked dir still followed', allText.includes('Shared feature content.'))
ok('completed without hanging (cycle guard works)', true)

rmSync(base, { recursive: true, force: true })
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
