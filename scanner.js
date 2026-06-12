import { readdirSync, readFileSync, statSync, lstatSync, realpathSync } from 'fs'
import { join, extname, relative, isAbsolute } from 'path'

/**
 * PageEntry — metadata extracted from a single source file
 * @typedef {{ filePath: string, url: string, title: string, description: string, priority: 'high'|'medium'|'low', lastmod?: string, regions: Array<{type:string, question:string, term:string, content:string}>, faqItems: Array<{question:string, answer:string}>, faqUnresolved: boolean }} PageEntry
 */

/**
 * Walk the source tree and extract AI metadata from files that use
 * <AIHelmet>, <AIRegion>, or schema components.
 */
export async function scanProject(config) {
  const entries = []
  const { root, srcDirs, extensions, ignore, verbose } = config

  // Resolve the project root once; symlinks are confined to within it.
  let rootReal
  try {
    rootReal = realpathSync(root)
  } catch {
    rootReal = root
  }
  const visited = new Set() // real dir paths already walked → cycle protection

  for (const dir of srcDirs) {
    const fullDir = join(root, dir)
    try {
      statSync(fullDir)
    } catch {
      continue // dir doesn't exist, skip silently
    }
    walkDir(fullDir, extensions, ignore, rootReal, visited, verbose, (filePath) => {
      // Strip comments first so a component name mentioned in a comment (e.g.
      // an example in a docblock) doesn't register as a phantom page. The strip
      // is string-aware, so URLs and other // or /* inside strings survive.
      const source = stripComments(readFileSync(filePath, 'utf8'))

      // Only process files that use our components
      if (!hasAIHelmetUsage(source)) return

      const entry = extractMetadata(source, filePath, root)
      if (entry) {
        if (verbose) console.log(`     found: ${relative(root, filePath)}`)
        if (entry.faqUnresolved) {
          console.warn(
            `  ⚠ ${relative(root, filePath)}: <FAQSchema items={...}> references a ` +
            `variable, so its Q&A can't be read statically. Inline the array, or add ` +
            `the questions via <AIRegion type="answer"> to include them in llms-full.txt.`
          )
        }
        entries.push(entry)
      }
    })
  }

  return entries
}

// ─── Filesystem walker ──────────────────────────────────────────────────────

function walkDir(dir, extensions, ignore, rootReal, visited, verbose, callback) {
  // Cycle protection: skip a directory whose real path we've already walked
  // (covers symlink loops like src/self -> src).
  let dirReal
  try {
    dirReal = realpathSync(dir)
  } catch {
    return
  }
  if (visited.has(dirReal)) return
  visited.add(dirReal)

  let items
  try {
    items = readdirSync(dir)
  } catch {
    return
  }

  for (const item of items) {
    // Dotfiles/dirs are always skipped, independent of the configured ignore list.
    if (item.startsWith('.')) continue
    if (ignore.includes(item)) continue
    const fullPath = join(dir, item)

    // lstat does NOT follow symlinks, so we can detect them.
    let info
    try {
      info = lstatSync(fullPath)
    } catch {
      continue
    }

    // A symlink is only followed if it resolves to somewhere inside the project
    // root — this blocks links that escape to e.g. /etc or ~/.ssh.
    if (info.isSymbolicLink()) {
      let target
      try {
        target = realpathSync(fullPath)
      } catch {
        continue // broken link
      }
      if (!isInside(rootReal, target)) {
        if (verbose) console.warn(`     skipped symlink escaping project root: ${fullPath}`)
        continue
      }
      try {
        info = statSync(fullPath) // resolve type of the (in-root) target
      } catch {
        continue
      }
    }

    if (info.isDirectory()) {
      walkDir(fullPath, extensions, ignore, rootReal, visited, verbose, callback)
    } else if (info.isFile() && extensions.includes(extname(item))) {
      callback(fullPath)
    }
  }
}

/** True when `child` is `parent` or nested within it (no prefix-collision bug). */
function isInside(parent, child) {
  if (child === parent) return true
  const rel = relative(parent, child)
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

// ─── Detection ──────────────────────────────────────────────────────────────

function hasAIHelmetUsage(source) {
  return (
    source.includes('AIHelmet') ||
    source.includes('AIRegion') ||
    source.includes('ArticleSchema') ||
    source.includes('ProductSchema') ||
    source.includes('FAQSchema') ||
    source.includes('OrgSchema') ||
    source.includes('EventSchema')
  )
}

// ─── Metadata extraction ─────────────────────────────────────────────────────

/**
 * Extract AI-relevant metadata from a source file.
 * We use regex-based extraction — no AST needed for these simple prop patterns.
 */
function extractMetadata(source, filePath, root) {
  const relPath = relative(root, filePath)

  // --- AIHelmet props ---
  const helmetBlock = extractJSXProps(source, 'AIHelmet')

  // --- Schema components ---
  const articleProps  = extractJSXProps(source, 'ArticleSchema')
  const productProps  = extractJSXProps(source, 'ProductSchema')
  const faqProps      = extractJSXProps(source, 'FAQSchema')
  const orgProps      = extractJSXProps(source, 'OrgSchema')
  const eventProps    = extractJSXProps(source, 'EventSchema')

  // Merge: schema props can supply title/description if AIHelmet doesn't
  const schemaProps = articleProps || productProps || faqProps || orgProps || eventProps || {}

  // Title: from llmsTitle, headline, name, or filename
  const title =
    helmetBlock?.llmsTitle ||
    schemaProps?.headline ||
    schemaProps?.name ||
    filePathToTitle(relPath)

  // Description: from llmsDescription or schema description
  const description =
    helmetBlock?.llmsDescription ||
    schemaProps?.description ||
    ''

  // Priority: explicit or inferred from path
  const priority =
    helmetBlock?.llmsPriority ||
    inferPriority(relPath)

  // Infer URL from file path
  const url = filePathToUrl(relPath)

  // --- AIRegion extraction ---
  const regions = extractRegions(source)

  // --- Schema type detection ---
  const schemaType = detectSchemaType(source)

  // --- FAQSchema items (inline array literals only) ---
  const faq = extractFAQItems(source)

  // --- Last-modified date from the source file's mtime (for sitemap.xml) ---
  let lastmod
  try {
    lastmod = statSync(filePath).mtime.toISOString().slice(0, 10)
  } catch {
    lastmod = undefined
  }

  return {
    filePath: relPath,
    url,
    title,
    description,
    priority,
    lastmod,
    regions,
    schemaType,
    faqItems: faq.items,
    faqUnresolved: faq.unresolved,
  }
}

// ─── JSX prop extraction ─────────────────────────────────────────────────────

/**
 * Extract string props from a JSX component usage.
 * Handles: prop="value"  prop={'value'}  prop={`value`}
 * Returns null if component not found.
 *
 * Known limits of the regex approach (each fails soft — props are skipped, not
 * misread): only the FIRST usage of a component per file is read (these are
 * page-level components, so one per file is the expected shape), and the open
 * tag is delimited by `[^>]*`, so a prop whose value contains `>` (e.g. an
 * inline arrow function) truncates the prop list at that point.
 */
function extractJSXProps(source, componentName) {
  // Match <ComponentName ... > or <ComponentName ... />
  const openTagRe = new RegExp(
    `<${componentName}\\b([^>]*?)(?:/>|>)`,
    'gs'
  )
  const match = openTagRe.exec(source)
  if (!match) return null

  const propsStr = match[1]
  const result = {}

  // prop="value"
  const doubleQuote = /(\w+)="([^"]*)"/g
  let m
  while ((m = doubleQuote.exec(propsStr)) !== null) {
    result[m[1]] = m[2]
  }

  // prop={'value'} or prop={`value`}
  const jsExpr = /(\w+)=\{['`]([^'`]*)['`]\}/g
  while ((m = jsExpr.exec(propsStr)) !== null) {
    result[m[1]] = m[2]
  }

  // prop={number}
  const numExpr = /(\w+)=\{(\d+(?:\.\d+)?)\}/g
  while ((m = numExpr.exec(propsStr)) !== null) {
    result[m[1]] = m[2]
  }

  return result
}

// ─── AIRegion extraction ─────────────────────────────────────────────────────

function extractRegions(source) {
  const regions = []
  const regionRe = /<AIRegion\b([^>]*?)>([\s\S]*?)<\/AIRegion>/g
  let m

  while ((m = regionRe.exec(source)) !== null) {
    const props  = extractPropsFromString(m[1])
    const inner  = m[2]
    const content = stripJSX(inner).trim()
    if (content) {
      regions.push({
        type:     props.type || 'general',
        question: props.question || '',
        term:     props.term || '',
        content,
      })
    }
  }

  return regions
}

function extractPropsFromString(propsStr) {
  const result = {}
  const re = /(\w+)=(?:"([^"]*)"|'([^']*)'|\{['`]([^'`]*)['`]\})/g
  let m
  while ((m = re.exec(propsStr)) !== null) {
    result[m[1]] = m[2] || m[3] || m[4] || ''
  }
  return result
}

/** Naively strip JSX tags and JS expressions to get human-readable text */
function stripJSX(html) {
  return html
    .replace(/<[^>]+>/g, ' ')     // remove tags
    .replace(/\{[^}]*\}/g, '')    // remove JS expressions
    .replace(/\s+/g, ' ')         // collapse whitespace
    .trim()
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert a source file path to a likely URL path.
 * Handles Next.js app/ and pages/ routing conventions.
 */
function filePathToUrl(relPath) {
  let url = relPath.replace(/\\/g, '/')

  // Strip leading src/ if present, then app/ or pages/ (Next.js conventions)
  url = url
    .replace(/^src\//, '')
    .replace(/^(app|pages)\//, '/')

  // Ensure leading slash
  if (!url.startsWith('/')) url = '/' + url

  url = url
    .replace(/\/(page|index)\.(jsx?|tsx?)$/, '') // Next.js page.tsx / index.jsx → dir
    .replace(/\.(jsx?|tsx?)$/, '')               // remaining extensions
    .replace(/\/\(.*?\)\//g, '/')                // Next.js route groups (marketing)/
    .replace(/\[.*?\]/g, ':param')               // dynamic segments [id] → :param
    .replace(/\/+/g, '/')                        // collapse double slashes

  return url || '/'
}

function filePathToTitle(relPath) {
  const parts = relPath.replace(/\\/g, '/').split('/')
  const file  = parts[parts.length - 1]
    .replace(/\.(jsx?|tsx?)$/, '')
    .replace(/[-_]/g, ' ')
  // Capitalise first letter
  return file.charAt(0).toUpperCase() + file.slice(1)
}

function inferPriority(relPath) {
  // Match whole path segments / file names, so e.g. components/IndexCard.tsx
  // doesn't rank as the index page.
  const segments = relPath
    .toLowerCase()
    .replace(/\\/g, '/')
    .replace(/\.(jsx?|tsx?)$/, '')
    .split('/')
  if (segments[0] === 'src') segments.shift()
  const has = (...names) => names.some((name) => segments.includes(name))
  // app/page.tsx is the root route; nested app-router pages rank by their own segment.
  if (has('index', 'home') || segments.join('/') === 'app/page') return 'high'
  if (has('pricing', 'docs', 'documentation', 'about')) return 'high'
  if (has('blog', 'posts', 'features', 'feature')) return 'medium'
  return 'low'
}

function detectSchemaType(source) {
  if (source.includes('ArticleSchema')) return 'Article'
  if (source.includes('ProductSchema')) return 'Product'
  if (source.includes('FAQSchema'))     return 'FAQPage'
  if (source.includes('OrgSchema'))     return 'Organization'
  if (source.includes('EventSchema'))   return 'Event'
  return null
}

// ─── Comment stripping ────────────────────────────────────────────────────────

/**
 * Remove // line and /* block *\/ comments, tracking string/template state so
 * that // or /* inside a string literal (e.g. "https://…") is left untouched.
 * Comments are replaced with a space to avoid joining adjacent tokens.
 *
 * Not a full JS parser: regex literals containing comment-like sequences
 * (rare in component files) aren't special-cased, and comments inside template
 * `${…}` interpolations are conservatively preserved.
 */
function stripComments(source) {
  let out = ''
  let quote = null
  const n = source.length

  for (let i = 0; i < n; i++) {
    const c = source[i]

    if (quote) {
      if (c === '\\' && i + 1 < n) {
        out += c + source[i + 1] // keep escaped char verbatim
        i++
      } else {
        out += c
        if (c === quote) quote = null
      }
      continue
    }

    if (c === '"' || c === "'" || c === '`') {
      quote = c
      out += c
      continue
    }

    // Line comment: skip to (but keep) the newline.
    if (c === '/' && source[i + 1] === '/') {
      i += 2
      while (i < n && source[i] !== '\n') i++
      if (i < n) out += '\n' // re-add the terminating newline
      continue
    }

    // Block comment: skip through the closing */, leaving a space separator.
    if (c === '/' && source[i + 1] === '*') {
      i += 2
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) i++
      i++ // skip past the closing '/' (loop's i++ handles the rest)
      out += ' '
      continue
    }

    out += c
  }

  return out
}

// ─── FAQSchema items extraction ───────────────────────────────────────────────

/**
 * Extract { question, answer } pairs from a <FAQSchema items={[...]} /> usage.
 *
 * Only inline array literals are read — the common case. When `items` is a
 * variable reference (items={faqs}) we can't resolve it without executing the
 * module, which a dependency-free static scanner won't do; we flag it as
 * unresolved so the caller can warn instead of silently dropping content.
 *
 * @returns {{ items: Array<{question:string, answer:string}>, unresolved: boolean }}
 */
function extractFAQItems(source) {
  const tagIdx = source.indexOf('<FAQSchema')
  if (tagIdx === -1) return { items: [], unresolved: false }

  const expr = extractBracedProp(source, tagIdx, 'items')
  if (expr == null) return { items: [], unresolved: false }

  const trimmed = expr.trim()
  if (!trimmed.startsWith('[')) {
    // e.g. items={faqs} — a reference we can't read statically.
    return { items: [], unresolved: true }
  }

  const items = []
  for (const obj of splitTopLevelObjects(trimmed)) {
    const question = extractStringValue(obj, 'question')
    const answer   = extractStringValue(obj, 'answer')
    if (question && answer) items.push({ question, answer })
  }
  return { items, unresolved: false }
}

/**
 * Find `propName={ ... }` at/after `fromIdx` and return the text inside the
 * outer braces (string-aware brace matching). Returns null if not found.
 */
function extractBracedProp(source, fromIdx, propName) {
  const re = new RegExp(`${propName}\\s*=\\s*\\{`, 'g')
  re.lastIndex = fromIdx
  const m = re.exec(source)
  if (!m) return null
  const openBrace = m.index + m[0].length - 1 // index of the '{'
  return matchBraces(source, openBrace)
}

/**
 * Given an index pointing at '{', return the substring between it and its
 * matching '}', ignoring braces that appear inside string literals.
 */
function matchBraces(source, openIndex) {
  let depth = 0
  let quote = null
  const start = openIndex + 1
  for (let i = openIndex; i < source.length; i++) {
    const c = source[i]
    if (quote) {
      if (c === '\\') { i++; continue }    // skip escaped char
      if (c === quote) quote = null
      continue
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return source.slice(start, i)
    }
  }
  return null // unbalanced
}

/** Split an array literal's text into its top-level `{...}` object substrings. */
function splitTopLevelObjects(arrayText) {
  const objs = []
  let quote = null
  for (let i = 0; i < arrayText.length; i++) {
    const c = arrayText[i]
    if (quote) {
      if (c === '\\') { i++; continue }
      if (c === quote) quote = null
      continue
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue }
    if (c === '{') {
      const inner = matchBraces(arrayText, i)
      if (inner == null) break
      objs.push(inner)
      i += inner.length + 1 // jump past the closing brace
    }
  }
  return objs
}

/**
 * Extract a string-valued property from an object-literal text.
 * Handles ' " ` quotes and escaped quote characters.
 */
function extractStringValue(objText, key) {
  const re = new RegExp(`\\b${key}\\s*:\\s*(['"\`])((?:\\\\.|(?!\\1).)*)\\1`)
  const m = re.exec(objText)
  if (!m) return ''
  return unescapeString(m[2])
}

function unescapeString(s) {
  return s.replace(/\\(['"`\\nt])/g, (_, ch) =>
    ch === 'n' ? '\n' : ch === 't' ? '\t' : ch
  )
}
