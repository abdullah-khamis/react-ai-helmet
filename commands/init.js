import { existsSync, writeFileSync } from 'fs'
import { join, resolve }             from 'path'
import { loadConfig }                from '../config.js'
import { logger }                    from '../logger.js'

const CONFIG_TEMPLATE = `// react-ai-helmet.config.js
// Documentation: https://github.com/your-org/react-ai-helmet

/** @type {import('react-ai-helmet').Config} */
export default {
  // ── Site metadata ──────────────────────────────────────────────────────────
  // Used in the header of llms.txt so AI knows what your site is about.
  siteName: 'My Website',
  siteDescription: 'A short sentence describing what your site does.',
  siteUrl: 'https://mysite.com', // used for absolute URLs in llms.txt

  // ── What to scan ───────────────────────────────────────────────────────────
  // Directories to search for React components.
  srcDirs: ['src', 'app', 'pages'],

  // File extensions to scan.
  extensions: ['.jsx', '.tsx', '.js', '.ts'],

  // Directories to skip entirely.
  ignore: ['node_modules', '.next', 'dist', 'build', '.git'],

  // ── Output ─────────────────────────────────────────────────────────────────
  // Where to write the generated files (relative to project root).
  outDir: 'public',

  // ── llms.txt options ───────────────────────────────────────────────────────
  llms: {
    // Whether to also generate llms-full.txt (with embedded page content).
    // Useful for sites with lots of FAQ/answer content.
    generateFull: true,

    // How to group your pages in llms.txt.
    // Keys = section headings, values = URL prefixes that belong in that section.
    categories: {
      Docs:    ['/docs', '/documentation', '/guides'],
      Blog:    ['/blog', '/posts', '/articles'],
      About:   ['/about', '/team', '/company', '/mission'],
      Product: ['/pricing', '/features', '/product', '/solutions'],
    },
  },

  // ── robots.txt options ─────────────────────────────────────────────────────
  robots: {
    // Whether to generate/update robots.txt with AI bot rules.
    generate: true,

    // AI bots that ARE allowed to crawl your site.
    // All other known AI bots will be blocked.
    allowBots: [
      'GPTBot',          // OpenAI ChatGPT
      'ClaudeBot',       // Anthropic Claude
      'Google-Extended', // Google Gemini
      'PerplexityBot',   // Perplexity
    ],

    // Paths to block from all AI crawlers (even allowed ones).
    disallowPaths: ['/admin', '/api', '/private', '/dashboard'],
  },
}
`

export async function init(flags = {}) {
  const config   = await loadConfig(flags)
  const outPath  = join(config.root, 'react-ai-helmet.config.js')

  logger.blank()
  logger.section('react-ai-helmet — init')
  logger.blank()

  if (existsSync(outPath)) {
    logger.warn(`Config file already exists at ${outPath}`)
    logger.info('Delete it first if you want to regenerate it.')
    logger.blank()
    process.exit(0)
  }

  writeFileSync(outPath, CONFIG_TEMPLATE, 'utf8')

  logger.success(`Created ${outPath}`)
  logger.blank()
  logger.info('Next steps:')
  logger.dim('1. Edit react-ai-helmet.config.js with your site details')
  logger.dim('2. Add <AIHelmet llmsTitle="..." llmsDescription="..." /> to your pages')
  logger.dim('3. Run `npx react-ai-helmet generate` to build your llms.txt')
  logger.blank()
}
