// Demonstrates the gap and how the manifest closes it. Runs the same pipeline
// `generate` uses (scan → merge manifest → build), once WITHOUT the manifest
// and once WITH it, and prints the difference. Writes the final llms-full.txt.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { loadConfig } from '../../config.js'
import { scanProject } from '../../scanner.js'
import { loadManifest, mergeManifest } from '../../manifest.js'
import { buildLlmsFullTxt } from '../../llms-generator.js'

const exampleDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const config = await loadConfig({ root: exampleDir })

// 1) Scan only — what you'd get with no collection pass.
const scanned = await scanProject(config)
const scanOnly = buildLlmsFullTxt(scanned, config)

// 2) Scan + merge the runtime manifest.
const merged = await scanProject(config)
const manifest = loadManifest(config)
const stats = mergeManifest(merged, manifest)
const withManifest = buildLlmsFullTxt(merged, config)

const rule = (t) => `\n${'─'.repeat(60)}\n${t}\n${'─'.repeat(60)}`
console.log(rule('llms-full.txt — SCAN ONLY (dynamic FAQ from /pricing is missing)'))
console.log(scanOnly)
console.log(rule('llms-full.txt — SCAN + MANIFEST (dynamic FAQ now present)'))
console.log(withManifest)
console.log(`\nMerge result: ${stats.enriched} page(s) enriched, ${stats.added} added\n`)

const pub = join(exampleDir, 'public')
if (!existsSync(pub)) mkdirSync(pub, { recursive: true })
writeFileSync(join(pub, 'llms-full.txt'), withManifest)
console.log(`✓ Wrote ${join(pub, 'llms-full.txt')}`)
