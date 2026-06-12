# react-ai-helmet

AI readability toolkit for React. Think `react-helmet`, but for the AI/AEO layer:
structured data, AI region hints, and a CLI that keeps your `llms.txt`,
`llms-full.txt` and `robots.txt` in sync with your codebase.

> Works on **React 18 and 19**, zero runtime dependencies.
>
> | Output | React 19 | React 18 |
> |--------|----------|----------|
> | JSON-LD schema | hoisted into `<head>` | rendered inline in `<body>` — [valid & crawled](https://developers.google.com/search/docs/appearance/structured-data) |
> | `noai` training opt-out `<meta>` | hoisted into `<head>` (SSR + client) | injected into `document.head` on the client |
> | `robots.txt` crawler control (CLI) | authoritative on both | authoritative on both |
>
> On React 18, the opt-out `<meta>` is added after hydration (not during SSR);
> `robots.txt` carries the authoritative signal in the meantime.

## Install

```bash
npm install react-ai-helmet
```

## Runtime components

### `<AIHelmet>` — app-root provider

Wrap your app once to supply site-level context and document-level AI signals.

```jsx
import { AIHelmet } from 'react-ai-helmet'

<AIHelmet
  siteName="Acme"
  siteUrl="https://acme.com"
  siteDescription="Project management for remote teams"
  allowTraining={false}          // emits a recognized AI training opt-out tag
  allowBots={['ClaudeBot', 'GPTBot', 'Google-Extended']}  // read by the CLI → robots.txt
>
  <App />
</AIHelmet>
```

`allowBots` / `denyBots` are declarative hints the CLI reads to build
`robots.txt`; they have no runtime meta equivalent and render nothing.

### Schema components

Each emits a pruned JSON-LD block (empty/undefined fields are dropped).

```jsx
import { ArticleSchema, ProductSchema, FAQSchema, OrgSchema, EventSchema } from 'react-ai-helmet'

<ArticleSchema headline="How to Build a REST API" author="Jane Doe"
  datePublished="2025-06-07" description="A step-by-step guide..." />

<ProductSchema name="Pro Plan" price={99} currency="USD" availability="InStock" />

<FAQSchema items={[{ question: 'What does it cost?', answer: 'From $9/month.' }]} />

<OrgSchema email="hello@acme.com" sameAs={['https://twitter.com/acme']} />

<EventSchema name="Launch Webinar" startDate="2025-07-01T17:00:00Z" location="Online" />
```

`ArticleSchema` and `OrgSchema` inherit `siteName`/`siteUrl` from `<AIHelmet>`
when those props are omitted.

### `<AIRegion>` — extraction hints

Marks a region with `data-ai-*` attributes and feeds `llms-full.txt`.

```jsx
import { AIRegion } from 'react-ai-helmet'

<AIRegion type="answer" question="What does your product cost?">
  <p>Plans start at $9/month.</p>
</AIRegion>
```

## CLI

```bash
npx react-ai-helmet init       # scaffold react-ai-helmet.config.js
npx react-ai-helmet generate   # scan src/, write llms.txt + llms-full.txt + robots.txt
npx react-ai-helmet generate --dry-run
npx react-ai-helmet validate   # lint an existing llms.txt
```

The CLI statically scans for the component names above, so the generated files
stay in sync with the pages that actually render them.

## Dynamic content: the collection pass

The CLI scans source statically, so it reads **inline** literals like
`<FAQSchema items={[{ question: '…', answer: '…' }]} />` and static `<AIRegion>`
text. It cannot read values that come from a variable or import
(`<FAQSchema items={faqs} />`, `<AIRegion>{post.summary}</AIRegion>`) — resolving
those would require executing your modules, which a dependency-free static
scanner won't do. When it sees an unreadable `FAQSchema`, it warns rather than
silently dropping it.

To capture that content, run a **collection pass** during your existing
SSR/SSG build: render each route to HTML and hand it to `createManifest`. It
parses the rendered output for JSON-LD schema and `data-ai-*` regions, writes
`react-ai-helmet.manifest.json`, and `generate` merges it into the scan. Because
it reads *rendered output*, it captures dynamic props, variables, nested markup,
and even text produced by child components — anything that ends up in the HTML.
No parser, no extra dependencies (your app's own `react-dom/server` renders).

For a page the manifest covers, the captured `faqItems` and `regions` are
authoritative — they replace the statically-scanned ones (so a region mixing
static text with a dynamic expression doesn't appear twice, partial and full).

```js
// scripts/collect.mjs — run as part of your build, before `react-ai-helmet generate`
import { renderToStaticMarkup } from 'react-dom/server'
import { writeFileSync } from 'node:fs'
import { createManifest } from 'react-ai-helmet/collect'

const renders = routes.map((route) => ({
  url: route.path,
  title: route.title,
  html: renderToStaticMarkup(<App url={route.path} />),
}))
writeFileSync('react-ai-helmet.manifest.json', JSON.stringify(createManifest(renders), null, 2))
```

The collector has no render-time side effects — it only parses HTML — so it adds
nothing to production renders. The manifest is purely additive: if it's missing
or malformed, `generate` ignores it and falls back to the static scan.

The one thing it can't see is **client-only** content (text set in a `useEffect`,
behind a `typeof window` branch, or in a client-resolved `lazy`/Suspense
boundary) — it isn't in the server HTML. But a non-JS crawler wouldn't see it
either, so excluding it matches what AI actually reads.

### Runnable example

[`example/`](example/) is a tiny app that demonstrates the gap end to end. Its
`/pricing` page uses `<FAQSchema items={pricingFaqs}>` where `pricingFaqs` is a
variable the scanner can't read.

```bash
npm run example
```

This builds the package, compiles the example, runs the collection pass, then
prints `llms-full.txt` **scan-only** (pricing FAQ missing) vs **scan + manifest**
(pricing FAQ present) — and writes the final file to `example/public/`. The
pipeline in `example/scripts/demo.mjs` mirrors exactly what `react-ai-helmet
generate` does internally.

## Development

```bash
npm run build      # tsup → dist/ (ESM + .d.ts)
npm test           # builds, then runs every *.test.mjs (native runner, no deps)
npm run typecheck  # tsc --noEmit
```
