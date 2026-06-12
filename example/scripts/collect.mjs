// Collection pass: render every route for real and capture what the schema
// components actually emit (including content from variables/dynamic props the
// static scanner can't read). Writes react-ai-helmet.manifest.json.
//
// In a real project you'd run this as part of your SSG/prerender build, before
// `react-ai-helmet generate`.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createManifest } from 'react-ai-helmet/collect'
import { routes } from '../build/routes.js'

const exampleDir = join(dirname(fileURLToPath(import.meta.url)), '..')

const renders = routes.map((route) => ({
  url: route.path,
  title: route.title,
  priority: route.priority,
  html: renderToStaticMarkup(createElement(route.Component)),
}))
const manifest = createManifest(renders)

const outPath = join(exampleDir, 'react-ai-helmet.manifest.json')
writeFileSync(outPath, JSON.stringify(manifest, null, 2))

const faqCount = manifest.pages.reduce((n, p) => n + p.faqItems.length, 0)
const schemaCount = manifest.pages.reduce((n, p) => n + p.schemas.length, 0)
console.log(`✓ Wrote ${outPath}`)
console.log(`  ${manifest.pages.length} pages · ${faqCount} FAQ items · ${schemaCount} schema blocks captured`)
