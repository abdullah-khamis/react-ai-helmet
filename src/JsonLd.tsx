import React from 'react'

export interface JsonLdProps {
  data: unknown
}

// Characters escaped to their \uXXXX JSON form before the JSON goes into the
// <script>. `<` is the one that matters for breakout (it's the only way to form
// </script>); `>` and `&` are escaped too as defense-in-depth. All three are
// valid JSON escapes, so a consumer's JSON.parse restores the original text.
const SCRIPT_ESCAPES: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
}

/**
 * Renders a JSON-LD <script> block. Any falsy/undefined fields are stripped so
 * the emitted schema stays clean and validator-friendly.
 *
 * On React 19+ a <script> rendered anywhere in the tree is hoisted into <head>
 * automatically, so schema components can be placed right next to the content
 * they describe — no provider or head manager required.
 */
export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(prune(data)).replace(/[<>&]/g, (c) => SCRIPT_ESCAPES[c] ?? c)
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}

/** Recursively drop undefined / null / '' so optional props don't pollute output. */
function prune(value: unknown): unknown {
  if (Array.isArray(value)) {
    const arr = value.map(prune).filter((v) => v !== undefined)
    return arr.length ? arr : undefined
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const pruned = prune(v)
      if (pruned !== undefined) out[k] = pruned
    }
    return Object.keys(out).length ? out : undefined
  }
  if (value === '' || value === null) return undefined
  return value
}
