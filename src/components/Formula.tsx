import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useMemo } from 'react'

/** Renders a LaTeX string with KaTeX. `block` centres it on its own line. */
export function Formula({ tex, block = false, className = '' }: { tex: string; block?: boolean; className?: string }) {
  const html = useMemo(
    () => katex.renderToString(tex, { throwOnError: false, displayMode: block, strict: 'ignore', output: 'html' }),
    [tex, block],
  )
  if (block) {
    return <div className={`overflow-x-auto py-2 text-center text-xl text-ink ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
  }
  return <span className={`text-ink ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
}
