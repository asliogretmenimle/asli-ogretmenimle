import { VisualView } from '../../components/Visual'
import { MathText } from '../../components/MathText'
import type { Pic, Show } from './sets'

/** Kartın içeriği: sayı/ifade, görsel, şekil grubu, kesir modeli, tablo */
export function ShowView({ show, big }: { show: Show; big?: boolean }) {
  switch (show.t) {
    case 'text': {
      const len = show.s.replace(/\[\[|\]\]|\^\{|\}|√\{/g, '').length
      const size = len <= 4 ? (big ? 'text-5xl sm:text-6xl' : 'text-4xl sm:text-5xl') : len <= 9 ? 'text-3xl sm:text-4xl' : len <= 18 ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'
      return (
        <div className="flex flex-col items-center justify-center gap-1 px-1 text-center">
          {show.sub && /\p{Extended_Pictographic}/u.test(show.sub) && <span className="text-3xl" aria-hidden>{show.sub}</span>}
          <span className={`${size} leading-tight font-black text-ink`}><MathText text={show.s} /></span>
          {show.sub && !/\p{Extended_Pictographic}/u.test(show.sub) && <span className="text-sm font-extrabold text-ink-soft">{show.sub}</span>}
        </div>
      )
    }
    case 'vis':
      return (
        <div className="flex w-full flex-col items-center gap-1">
          <div className="pointer-events-none w-full max-w-[210px] [&_svg]:max-h-[130px]">
            <VisualView v={show.v} size="md" zoom={false} />
          </div>
          {show.cap && <span className="text-base font-black text-ink sm:text-lg"><MathText text={show.cap} /></span>}
        </div>
      )
    case 'svg':
      return (
        <div className="flex w-full flex-col items-center gap-1">
          <div className="pointer-events-none w-full max-w-[190px] [&_svg]:h-auto [&_svg]:max-h-[130px] [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: show.svg }} />
          {show.cap && <span className="text-base font-black text-ink">{show.cap}</span>}
        </div>
      )
    case 'pics':
      return <Pics items={show.items} />
    case 'frac':
      return <FracModel {...show} />
    case 'table':
      return (
        <table className="border-collapse text-center text-lg font-black text-ink sm:text-xl">
          <thead>
            <tr>{show.head.map((h) => <th key={h} className="border-2 border-slate-300 bg-sky-50 px-4 py-0.5 italic">{h}</th>)}</tr>
          </thead>
          <tbody>
            {show.rows.map((r, i) => (
              <tr key={i}>{r.map((c, j) => <td key={j} className="border-2 border-slate-300 bg-white px-4 py-0.5 tabular-nums">{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      )
  }
}

function PicIcon({ p }: { p: Pic }) {
  const s = p.small ? 26 : 38
  const fill = p.hollow ? 'none' : p.c
  const common = { fill, stroke: p.hollow ? p.c : '#1f2340', strokeWidth: p.hollow ? 5 : 2, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 40 40" width={s} height={s} aria-hidden>
      {p.s === 'circle' && <circle cx={20} cy={20} r={p.hollow ? 15 : 16} {...common} />}
      {p.s === 'square' && <rect x={5} y={5} width={30} height={30} rx={2} {...common} />}
      {p.s === 'triangle' && <polygon points="20,4 37,35 3,35" {...common} />}
      {p.s === 'star' && <polygon points={Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 7 : 17; const a = -Math.PI / 2 + (i * Math.PI) / 5; return `${20 + r * Math.cos(a)},${21 + r * Math.sin(a)}` }).join(' ')} {...common} />}
    </svg>
  )
}

function Pics({ items }: { items: Pic[] }) {
  return (
    <div className="flex max-w-[220px] flex-wrap items-center justify-center gap-1.5" role="img" aria-label={`${items.length} şekil`}>
      {items.map((p, i) => <PicIcon key={i} p={p} />)}
    </div>
  )
}

/** Eş ya da eş olmayan parçalara bölünmüş dikdörtgen / daire */
function FracModel({ shape, parts, filled, unequal }: { shape: 'rect' | 'circle'; parts: number; filled: number; unequal?: boolean }) {
  const ink = '#1f2340', fill = '#d6457a', empty = '#fff'
  if (shape === 'circle') {
    const r = 46, cx = 50, cy = 50
    const pt = (k: number) => {
      const a = -Math.PI / 2 + (k / parts) * 2 * Math.PI
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
    }
    return (
      <svg viewBox="0 0 100 100" className="h-auto w-full max-w-[120px]" role="img" aria-label={`${parts} parçadan ${filled} parçası boyalı daire`}>
        {Array.from({ length: parts }, (_, k) => (
          <path key={k} d={`M${cx},${cy} L${pt(k)} A${r},${r} 0 0 1 ${pt(k + 1)} Z`} fill={k < filled ? fill : empty} stroke={ink} strokeWidth={2.5} strokeLinejoin="round" />
        ))}
      </svg>
    )
  }
  const W = 160, H = 70
  const ws = unequal ? [0.16, 0.22, 0.26, 0.36].slice(0, parts) : Array.from({ length: parts }, () => 1 / parts)
  const sum = ws.reduce((a, b) => a + b, 0)
  let x = 0
  return (
    <svg viewBox={`0 0 ${W + 6} ${H + 6}`} className="h-auto w-full max-w-[180px]" role="img" aria-label={`${parts} ${unequal ? 'eş olmayan' : 'eş'} parçadan ${filled} parçası boyalı dikdörtgen`}>
      {ws.map((w, k) => {
        const pw = (w / sum) * W
        const el = <rect key={k} x={3 + x} y={3} width={pw} height={H} fill={k < filled ? fill : empty} stroke={ink} strokeWidth={2.5} />
        x += pw
        return el
      })}
    </svg>
  )
}
