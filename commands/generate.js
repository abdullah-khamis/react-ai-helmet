import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { loadConfig }        from '../config.js'
import { scanProject }       from '../scanner.js'
import { loadManifest, mergeManifest } from '../manifest.js'
import { buildLlmsTxt, buildLlmsFullTxt } from '../llms-generator.js'
import { buildRobotsTxt }    from '../robots-generator.js'
import { buildSitemap }      from '../sitemap-generator.js'
import { logger }            from '../logger.js'

export async function generate(flags = {}) {
  const config = await loadConfig(flags)

  logger.blank()
  logger.section('react-ai-helmet — generate')
  logger.blank()

  // 1. Scan project ─────────────────────────────────────────────────────────
  logger.info(`Scanning project at ${config.root}`)
  if (config.verbose) logger.dim(`Extensions: ${config.extensions.join(', ')}`)
  if (config.verbose) logger.dim(`Source dirs: ${config.srcDirs.join(', ')}`)

  const entries = await scanProject(config)

  // Merge optional runtime manifest (captures dynamic schema the static scan
  // can't read — e.g. <FAQSchema items={variable}>).
  const manifest = loadManifest(config)
  if (manifest) {
    const { added, enriched } = mergeManifest(entries, manifest)
    logger.info(
      `Merged runtime manifest: ${enriched} page${enriched !== 1 ? 's' : ''} enriched, ` +
      `${added} added`
    )
  }

  if (entries.length === 0) {
    logger.warn('No pages found with AIHelmet or AIRegion components.')
    logger.warn('Add <AIHelmet llmsTitle="..." llmsDescription="..." /> to your pages.')
    logger.blank()
    logger.info('Tip: run `npx react-ai-helmet init` to create a config file.')
    logger.blank()
    return
  }

  logger.success(`Found ${entries.length} page${entries.length !== 1 ? 's' : ''} with AI metadata`)

  if (config.verbose) {
    for (const entry of entries) {
      logger.dim(`${entry.priority.padEnd(6)} ${entry.url.padEnd(30)} ${entry.title}`)
    }
  }

  logger.blank()

  // 2. Build output files ───────────────────────────────────────────────────
  logger.info('Building output files...')

  const llmsTxt     = buildLlmsTxt(entries, config)
  const llmsFullTxt = config.llms.generateFull
    ? buildLlmsFullTxt(entries, config)
    : null
  const robotsTxt   = config.robots.generate
    ? buildRobotsTxt(config, config.outDir)
    : null
  const sitemapXml  = config.sitemap.generate
    ? buildSitemap(entries, config)
    : null

  if (config.sitemap.generate && !sitemapXml) {
    logger.warn('sitemap.xml skipped — set siteUrl in your config to generate it.')
  }

  // 3. Preview or write ─────────────────────────────────────────────────────
  if (config.dryRun) {
    logger.section('Dry run — preview only (no files written)')
    logger.blank()
    printPreview('llms.txt', llmsTxt)
    if (llmsFullTxt) printPreview('llms-full.txt', llmsFullTxt)
    if (robotsTxt)   printPreview('robots.txt', robotsTxt)
    if (sitemapXml)  printPreview('sitemap.xml', sitemapXml)
    return
  }

  // Ensure output dir exists
  if (!existsSync(config.outDir)) {
    mkdirSync(config.outDir, { recursive: true })
  }

  writeOutput(join(config.outDir, 'llms.txt'), llmsTxt)

  if (llmsFullTxt) {
    writeOutput(join(config.outDir, 'llms-full.txt'), llmsFullTxt)
  }

  if (robotsTxt) {
    writeOutput(join(config.outDir, 'robots.txt'), robotsTxt)
  }

  if (sitemapXml) {
    writeOutput(join(config.outDir, 'sitemap.xml'), sitemapXml)
  }

  logger.blank()
  logger.success('Done! Files written to ' + config.outDir)
  logger.blank()

  // Summary table
  const highCount   = entries.filter((e) => e.priority === 'high').length
  const medCount    = entries.filter((e) => e.priority === 'medium').length
  const lowCount    = entries.filter((e) => e.priority === 'low').length
  const regionCount = entries.reduce((sum, e) => sum + e.regions.length, 0)

  logger.dim(`Pages indexed:   ${entries.length} (${highCount} high · ${medCount} medium · ${lowCount} low priority)`)
  logger.dim(`AIRegions found: ${regionCount}`)
  if (config.llms.generateFull) logger.dim(`llms-full.txt:   ✓ generated`)
  if (config.robots.generate)   logger.dim(`robots.txt:      ✓ updated`)
  logger.blank()
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function writeOutput(filePath, content) {
  writeFileSync(filePath, content, 'utf8')
  logger.success(`Wrote ${filePath}`)
}

function printPreview(filename, content) {
  const C = { cyan: '\x1b[36m', reset: '\x1b[0m', dim: '\x1b[2m' }
  console.log(`  ${C.cyan}── ${filename} ${'─'.repeat(Math.max(0, 50 - filename.length))}${C.reset}`)
  const lines = content.split('\n').slice(0, 30)
  for (const line of lines) {
    console.log(`  ${C.dim}${line}${C.reset}`)
  }
  if (content.split('\n').length > 30) {
    console.log(`  ${C.dim}  ... (${content.split('\n').length - 30} more lines)${C.reset}`)
  }
  console.log('')
}
