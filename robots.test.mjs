// Tests the robots.txt Sitemap directive and that bot allow/deny rules work.
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { buildRobotsTxt } from './robots-generator.js'

let pass = 0, fail = 0
const ok = (l, c, d = '') => c ? (pass++, console.log(`✓ ${l}`)) : (fail++, console.log(`✗ ${l}${d ? `\n   ${d}` : ''}`))

const outDir = mkdtempSync(join(tmpdir(), 'rah-robots-')) // empty → no existing robots.txt

const baseConfig = {
  siteUrl: 'https://acme.com',
  sitemap: { generate: true },
  robots: {
    generate: true,
    allowBots: ['GPTBot', 'ClaudeBot'],
    disallowPaths: ['/admin', '/api'],
  },
}

const txt = buildRobotsTxt(baseConfig, outDir)
console.log('\n' + txt + '\n')

ok('allowed bot present', txt.includes('User-agent: GPTBot'))
ok('allowed bot disallow path applied', txt.includes('Disallow: /admin'))
ok('a non-allowed known AI bot is denied', /User-agent: CCBot\nDisallow: \//.test(txt))
ok('Sitemap directive present and absolute', txt.includes('Sitemap: https://acme.com/sitemap.xml'))
ok('no stray Content-Signal line', !txt.includes('Content-Signal'))

// Explicit denyBots: deny wins over allow, and an unknown bot still gets a block.
const withDeny = buildRobotsTxt({
  ...baseConfig,
  robots: {
    ...baseConfig.robots,
    allowBots: ['GPTBot', 'ClaudeBot'],
    denyBots: ['ClaudeBot', 'SomeNewBot'],
  },
}, outDir)
ok('explicit deny wins over allow', !/User-agent: ClaudeBot\nDisallow: \/admin/.test(withDeny) &&
  /User-agent: ClaudeBot\nDisallow: \/$/m.test(withDeny))
ok('unknown denied bot gets a Disallow block', /User-agent: SomeNewBot\nDisallow: \//.test(withDeny))
ok('still-allowed bot unaffected by deny list', withDeny.includes('User-agent: GPTBot\nDisallow: /admin'))

// sitemap.generate false → no Sitemap directive.
const noSitemap = buildRobotsTxt({ ...baseConfig, sitemap: { generate: false } }, outDir)
ok('sitemap.generate:false omits Sitemap directive', !noSitemap.includes('Sitemap:'))

// No siteUrl → no Sitemap directive even if generate is true.
const noUrl = buildRobotsTxt({ ...baseConfig, siteUrl: '' }, outDir)
ok('no siteUrl → no Sitemap directive', !noUrl.includes('Sitemap:'))

rmSync(outDir, { recursive: true, force: true })
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
