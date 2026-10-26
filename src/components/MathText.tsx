import { Fragment, type ReactNode } from 'react'

/**
 * Basit matematik gösterimi (iç içe kullanılabilir):
 *   [[3/4]]  [[1 2/3]]  x^{2}  √{16}  √{[[9/16]]}  √{80^{2} + 60^{2}}
 */
export function MathText({ text, className }: { text: string; className?: string }) {
  return <span className={className}>{renderMath(text)}</span>
}

/** `open` konumundaki "{" ile eşleşen "}" konumunu bulur */
function matchBrace(s: string, open: number): number {
  let depth = 0
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') depth++
    else if (s[i] === '}' && --depth === 0) return i
  }
  return -1
}

const FRAC = /^\[\[\s*(?:(-?\d+)\s+)?([^\]/]+)\/([^\]]+)\]\]/

export function renderMath(text: string): ReactNode {
  const out: ReactNode[] = []
  let buf = ''
  let k = 0
  const flush = () => {
    if (buf) out.push(<Fragment key={k++}>{buf}</Fragment>)
    buf = ''
  }
  for (let i = 0; i < text.length; ) {
    const rest = text.slice(i)
    const fr = rest.startsWith('[[') ? FRAC.exec(rest) : null
    if (fr) {
      flush()
      out.push(
        <span key={k++} className="inline-flex items-center" aria-label={`${fr[1] ? fr[1] + ' tam ' : ''}${fr[3]}'te ${fr[2]}`}>
          {fr[1] && <span className="mr-0.5">{fr[1]}</span>}
          <span className="frac" aria-hidden>
            <span className="frac-num">{renderMath(fr[2])}</span>
            <span className="frac-den">{renderMath(fr[3])}</span>
          </span>
        </span>,
      )
      i += fr[0].length
      continue
    }
    if ((rest.startsWith('^{') || rest.startsWith('√{')) && matchBrace(text, i + 1) > 0) {
      const end = matchBrace(text, i + 1)
      const inner = text.slice(i + 2, end)
      flush()
      out.push(
        rest[0] === '^' ? (
          <sup key={k++} className="text-[0.7em]">{renderMath(inner)}</sup>
        ) : (
          <span key={k++} className="sqrt">
            <span aria-hidden>√</span>
            <span className="sqrt-body">{renderMath(inner)}</span>
          </span>
        ),
      )
      i = end + 1
      continue
    }
    buf += text[i]
    i++
  }
  flush()
  return out
}
