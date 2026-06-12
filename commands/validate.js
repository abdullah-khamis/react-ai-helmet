import { existsSync, readFileSync } from 'fs'
import { join, resolve }            from 'path'
import { loadConfig }               from '../config.js'
import { logger }                   from '../logger.js'

export async function validate(flags = {}) {
  const config   = await loadConfig(flags)
  const filePath = join(config.outDir, 'llms.txt')

  logger.blank()
  logger.section('react-ai-helmet — validate')
  logger.blank()

  if (!existsSync(filePath)) {
    logger.error(`No llms.txt found at ${filePath}`)
    logger.info('Run `npx react-ai-helmet generate` to create one.')
    logger.blank()
    process.exit(1)
  }

  const content = readFileSync(filePath, 'utf8')
  const lines   = content.split('\n')
  const issues  = []
  const warnings = []

  logger.info(`Checking ${filePath}`)
  logger.blank()

  // ── Rule 1: Must start with a # title ─────────────────────────────────────
  const firstContentLine = lines.find((l) => l.trim())
  if (!firstContentLine?.startsWith('# ')) {
    issues.push('File must start with a # heading (site name)')
  }

  // ── Rule 2: Should have a > description ───────────────────────────────────
  const hasDescription = lines.some((l) => l.startsWith('> '))
  if (!hasDescription) {
    warnings.push('No site description found. Add a line starting with `> ` below the title.')
  }

  // ── Rule 3: All links must be valid Markdown ───────────────────────────────
  const linkRe     = /- \[([^\]]+)\]\(([^)]+)\)/
  const malformed  = lines.filter(
    (l) => l.trim().startsWith('- ') && !linkRe.test(l)
  )
  for (const line of malformed) {
    issues.push(`Malformed link entry: "${line.trim()}"`)
  }

  // ── Rule 4: URLs should be absolute or relative (not empty) ───────────────
  const linkMatches = lines.flatMap((l) => {
    const m = l.match(linkRe)
    return m ? [{ title: m[1], url: m[2] }] : []
  })

  for (const { title, url } of linkMatches) {
    if (!url || url === '/') {
      warnings.push(`Bare URL for "${title}" — consider using an absolute URL for AI agents`)
    }
    if (url.includes(' ')) {
      issues.push(`URL for "${title}" contains spaces: ${url}`)
    }
  }

  // ── Rule 5: Check for duplicate URLs ──────────────────────────────────────
  const urlSeen = {}
  for (const { title, url } of linkMatches) {
    if (urlSeen[url]) {
      warnings.push(`Duplicate URL: ${url} appears in both "${urlSeen[url]}" and "${title}"`)
    }
    urlSeen[url] = title
  }

  // ── Rule 6: Check file isn't too large (token limit awareness) ─────────────
  const charCount = content.length
  if (charCount > 50_000) {
    warnings.push(
      `File is ${Math.round(charCount / 1000)}KB — consider trimming to keep within AI context limits`
    )
  }

  // ── Rule 7: No markdown code blocks (unnecessary for AI) ──────────────────
  if (content.includes('```')) {
    warnings.push('Avoid code blocks in llms.txt — AI parsers prefer plain text')
  }

  // ── Report ─────────────────────────────────────────────────────────────────
  logger.info(`Found ${linkMatches.length} page link${linkMatches.length !== 1 ? 's' : ''}`)
  logger.info(`File size: ${Math.round(charCount / 1000 * 10) / 10}KB`)
  logger.blank()

  if (issues.length === 0 && warnings.length === 0) {
    logger.success('llms.txt looks good — no issues found!')
    logger.blank()
    return
  }

  if (issues.length > 0) {
    logger.section(`Errors (${issues.length})`)
    for (const issue of issues) logger.error(issue)
    logger.blank()
  }

  if (warnings.length > 0) {
    logger.section(`Warnings (${warnings.length})`)
    for (const warn of warnings) logger.warn(warn)
    logger.blank()
  }

  if (issues.length > 0) {
    process.exit(1)
  }
}
