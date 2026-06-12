import { existsSync } from 'fs'
import { resolve, join } from 'path'
import { pathToFileURL } from 'url'

/**
 * Default configuration.
 * Every key can be overridden in react-ai-helmet.config.js
 */
const DEFAULTS = {
  // Site metadata
  siteName: '',
  siteDescription: '',
  siteUrl: '',

  // What to scan
  srcDirs: ['src', 'app', 'pages', 'components'],
  extensions: ['.jsx', '.tsx', '.js', '.ts'],

  // What to ignore
  ignore: ['node_modules', '.next', 'dist', 'build', '.git', 'coverage'],

  // Output
  outDir: 'public',

  // llms.txt options
  llms: {
    // Include a full-text companion file (llms-full.txt)
    generateFull: true,
    // Group pages by category. Keys = category name, values = URL path prefixes
    categories: {
      Docs:    ['/docs', '/documentation'],
      Blog:    ['/blog', '/posts', '/articles'],
      About:   ['/about', '/team', '/company'],
      Product: ['/pricing', '/features', '/product'],
    },
  },

  // sitemap.xml options
  sitemap: {
    // Whether to generate sitemap.xml (requires siteUrl)
    generate: true,
  },

  // robots.txt options
  robots: {
    // Whether to update/create robots.txt
    generate: true,
    // AI bots to allow by default (all others will not be explicitly listed)
    allowBots: ['GPTBot', 'ClaudeBot', 'Google-Extended', 'PerplexityBot', 'cohere-ai'],
    // Paths to block from all AI crawlers
    disallowPaths: ['/admin', '/api', '/private'],
  },
}

/**
 * Load config from disk, merging with defaults.
 * Config file is optional — defaults work out of the box.
 */
export async function loadConfig(flags = {}) {
  const root = resolve(flags.root || process.cwd())
  const configPath = flags.config
    ? resolve(flags.config)
    : join(root, 'react-ai-helmet.config.js')

  let userConfig = {}

  if (existsSync(configPath)) {
    try {
      const mod = await import(pathToFileURL(configPath).href)
      userConfig = mod.default || mod
    } catch (err) {
      throw new Error(`Failed to load config from ${configPath}: ${err.message}`)
    }
  }

  // Deep merge user config over defaults
  const config = deepMerge(DEFAULTS, userConfig)

  // Apply CLI flag overrides
  config.root   = root
  config.outDir = flags.out ? resolve(flags.out) : resolve(root, config.outDir)
  config.dryRun = flags['dry-run'] ?? false
  config.verbose = flags.verbose ?? false

  return config
}

function deepMerge(base, override) {
  const result = { ...base }
  for (const key of Object.keys(override)) {
    if (
      override[key] !== null &&
      typeof override[key] === 'object' &&
      !Array.isArray(override[key]) &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      result[key] = deepMerge(base[key], override[key])
    } else {
      result[key] = override[key]
    }
  }
  return result
}
