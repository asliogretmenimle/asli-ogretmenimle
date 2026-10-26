import { Fragment, type ReactNode } from 'react'

/**
 * Basit matematik gösterimi:
 *   [[3/4]]  [[1 2/3]]  x^{2}  √{16}
 */
const TOKEN = /\[\[\s*(?:(-?\d+)\s+)?([^\]/]+)\/([^\]]+)\]\]|\^\{([^}]*)\}|√\{([^}]*)\}/g

export function MathText({ text, className }: { text: string; className?: string }) {
  return <span className={className}>{renderMath(text)}</span>
}

export function renderMath(text: string): ReactNode {
  const out: ReactNode[] = []
  let last = 0
  let i = 0
  for (const m of text.matchAll(TOKEN)) {
    const idx = m.index ?? 0
    if (idx > last) out.push(<Fragment key={i++}>{text.slice(last, idx)}</Fragment>)
    if (m[2] !== undefined) {
      out.push(
        <span key={i++} className="inline-flex items-center" aria-label={`${m[1] ? m[1] + ' tam ' : ''}${m[3]}'te ${m[2]}`}>
          {m[1] && <span className="mr-0.5">{m[1]}</span>}
          <span className="frac" aria-hidden>
            <span className="frac-num">{m[2]}</span>
            <span className="frac-den">{m[3]}</span>
          </span>
        </span>,
      )
    } else if (m[4] !== undefined) {
      out.push(<sup key={i++} className="text-[0.7em]">{m[4]}</sup>)
    } else if (m[5] !== undefined) {
      out.push(
        <span key={i++} className="sqrt">
          <span aria-hidden>√</span>
          <span className="sqrt-body">{renderMath(m[5])}</span>
        </span>,
      )
    }
    last = idx + m[0].length
  }
  if (last < text.length) out.push(<Fragment key={i++}>{text.slice(last)}</Fragment>)
  return out
}
