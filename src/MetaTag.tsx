import React, { useEffect } from 'react'

/**
 * True on React 19+, where <meta>/<title>/<link>/<script> rendered anywhere in
 * the tree are hoisted into <head> natively (server and client). Module-level
 * constant so the branch in MetaTag is stable across renders.
 */
const SUPPORTS_HOISTING =
  typeof React.version === 'string' && parseInt(React.version, 10) >= 19

export interface MetaTagProps {
  name: string
  content: string
}

/**
 * Renders a <meta> tag into the document head across React versions.
 *
 *  - React 19+: rendered inline; React hoists it into <head> (SSR + client).
 *  - React 18:  injected into document.head via effect on the client. During
 *    SSR it renders nothing — but crawler control still ships in the generated
 *    robots.txt, which is the authoritative signal regardless of React version.
 *
 * MetaTag itself calls no hooks; the React 18 path lives in a child component so
 * hook order stays stable.
 */
export function MetaTag(props: MetaTagProps) {
  if (SUPPORTS_HOISTING) {
    return <meta name={props.name} content={props.content} />
  }
  return <MetaTagEffect {...props} />
}

function MetaTagEffect({ name, content }: MetaTagProps) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const el = document.createElement('meta')
    el.setAttribute('name', name)
    el.setAttribute('content', content)
    el.setAttribute('data-react-ai-helmet', '') // mark as ours for cleanup
    document.head.appendChild(el)
    return () => {
      el.remove()
    }
  }, [name, content])
  return null
}
