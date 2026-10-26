import { useState } from 'react'
import { Bee, Bloom, Butterfly, GARDEN_CSS, WateringCan } from './flowers'

/**
 * Büyüyen örüntü sahnesi (3. sınıf): her adım bir tarh. Ortada sabit ayçiçekleri (saksı),
 * yanında adım sayısı kadar d’li lale sırası. İsteğe bağlı olarak öğrencinin dikeceği boş bir tarh.
 */

export interface BuildPlot {
  n: number
  cols: number
  /** saksı çukurları (ayçiçeği) */
  pot: boolean[]
  /** ızgara çukurları, sütun sütun (col * d + row) */
  grid: boolean[]
  onPot: (i: number) => void
  onGrid: (i: number) => void
  marks?: boolean
}

const W = 1000
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function Plot({ x, y, cell, n, c, d, label, potSlots, build, hot }: {
  x: number
  y: number
  cell: number
  n: number
  c: number
  d: number
  label: string
  potSlots: number
  build?: BuildPlot
  hot?: boolean
}) {
  const cols = build ? build.cols : n
  const potW = potSlots ? cell * 1.15 : 0
  const w = potW + cols * cell + cell * 0.5
  const h = Math.max(d, potSlots, 1) * cell + cell * 0.5
  const potTop = y + (h - potSlots * cell) / 2
  const gridTop = y + (h - d * cell) / 2
  const fs = cell * 0.85
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={cell * 0.35} fill={hot ? '#a16207' : '#92400e'} stroke={hot ? '#f97316' : '#78350f'} strokeWidth={hot ? 5 : 3} />
      <rect x={x + 4} y={y + 4} width={w - 8} height={8} rx={4} fill="#ca8a04" opacity={0.35} />
      <g transform={`translate(${x + w / 2} ${y - 20})`}>
        <rect x={-label.length * 6 - 14} y={-15} width={label.length * 12 + 28} height={30} rx={15} fill={hot ? '#f97316' : '#fff'} stroke={hot ? '#c2410c' : '#16a34a'} strokeWidth={2} />
        <text y={6} textAnchor="middle" fontSize={17} fontWeight={900} fill={hot ? '#fff' : '#166534'}>{label}</text>
      </g>
      {potSlots > 0 && (
        <rect x={x + cell * 0.2} y={potTop - cell * 0.05} width={cell * 1.0} height={potSlots * cell + cell * 0.1} rx={cell * 0.45} fill="#c2410c" stroke="#7c2d12" strokeWidth={2} />
      )}
      {Array.from({ length: potSlots }, (_, i) => {
        const cx = x + cell * 0.7
        const cy = potTop + cell * (i + 0.5)
        const on = build ? build.pot[i] : i < c
        return (
          <g
            key={`p${i}`}
            transform={`translate(${cx} ${cy})`}
            data-handle={build ? '' : undefined}
            role={build ? 'button' : undefined}
            tabIndex={build ? 0 : undefined}
            aria-label={build ? `Saksı ${i + 1}: ${on ? 'ayçiçeği, sökmek için dokun' : 'boş, dikmek için dokun'}` : undefined}
            className={build ? 'bahce-tap' : ''}
            onClick={build ? () => build.onPot(i) : undefined}
            onKeyDown={(e) => {
              if (build && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                build.onPot(i)
              }
            }}
          >
            <rect x={-cell / 2} y={-cell / 2} width={cell} height={cell} fill="transparent" />
            {on ? (
              <g transform={`scale(${fs / 70})`} className={build ? 'bahce-grow' : ''}><Bloom kind={2} /></g>
            ) : (
              <circle r={cell * 0.3} fill="rgba(255,255,255,.25)" stroke="#fde68a" strokeWidth={2} strokeDasharray="5 4" />
            )}
          </g>
        )
      })}
      {Array.from({ length: cols * d }, (_, i) => {
        const col = Math.floor(i / d)
        const row = i % d
        const cx = x + potW + cell * (col + 0.5) + cell * 0.25
        const cy = gridTop + cell * (row + 0.5)
        const on = build ? build.grid[i] : col < n
        return (
          <g
            key={`g${i}`}
            transform={`translate(${cx} ${cy})`}
            data-handle={build ? '' : undefined}
            role={build ? 'button' : undefined}
            tabIndex={build ? 0 : undefined}
            aria-label={build ? `${col + 1}. sütun ${row + 1}. sıra: ${on ? 'lale, sökmek için dokun' : 'boş'}` : undefined}
            className={build ? 'bahce-tap' : ''}
            onClick={build ? () => build.onGrid(i) : undefined}
            onKeyDown={(e) => {
              if (build && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                build.onGrid(i)
              }
            }}
          >
            <rect x={-cell / 2} y={-cell / 2} width={cell} height={cell} fill="transparent" />
            {on ? (
              <g transform={`scale(${fs / 64})`} className={build ? 'bahce-grow' : ''}><Bloom kind={0} /></g>
            ) : (
              <circle r={cell * 0.26} fill="#451a03" opacity={0.55} stroke={build ? '#fde68a' : 'none'} strokeWidth={1.5} strokeDasharray="4 4" />
            )}
          </g>
        )
      })}
    </g>
  )
}

export function GrowScene({ c, d, steps, build, big, watering, bee, ariaLabel }: {
  c: number
  d: number
  /** küçük gösterilecek adımlar */
  steps: number[]
  build?: BuildPlot
  /** büyük gösterilecek tek adım (ör. 10) */
  big?: number
  watering?: boolean
  bee?: boolean
  ariaLabel: string
}) {
  const [motion] = useState(() => !reduced())
  const potSlots = build ? 3 : c
  // üst sıra: küçük adımlar
  const maxSmall = Math.max(1, ...steps)
  const smallCell = Math.min(48, (W - 60 - steps.length * 40) / Math.max(1, steps.reduce((a, n) => a + n + (c ? 1.15 : 0) + 0.5, 0)), 300 / (Math.max(d, c) + 0.5))
  const smallH = Math.max(d, c, 1) * smallCell + smallCell * 0.5
  const TOP = 120
  // küçük tarhların x konumları
  let x = 0
  const xs = steps.map((n) => {
    const w = (c ? smallCell * 1.15 : 0) + n * smallCell + smallCell * 0.5
    const at = x
    x += w + 36
    return { n, at, w }
  })
  const rowW = x - 36
  const off = (W - rowW) / 2
  let y2 = steps.length ? TOP + smallH + 70 : TOP
  const bigCols = build ? build.cols : big ?? 0
  const bigCell = bigCols ? Math.min(build ? 76 : 70, (W - 80) / (bigCols + (potSlots ? 1.15 : 0) + 0.5), 280 / (Math.max(d, potSlots) + 0.5)) : 0
  const bigW = bigCols ? (potSlots ? bigCell * 1.15 : 0) + bigCols * bigCell + bigCell * 0.5 : 0
  const bigH = bigCols ? Math.max(d, potSlots, 1) * bigCell + bigCell * 0.5 : 0
  const H = Math.max(300, (bigCols ? y2 + bigH : y2) + 30)
  if (!bigCols) y2 = TOP
  void maxSmall

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full select-none" role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id="buyu-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bae6fd" />
          <stop offset="1" stopColor="#ecfeff" />
        </linearGradient>
        <linearGradient id="buyu-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#86efac" />
          <stop offset="1" stopColor="#4ade80" />
        </linearGradient>
      </defs>
      <style>{GARDEN_CSS}</style>
      <rect width={W} height={H} fill="url(#buyu-grass)" />
      <rect width={W} height={72} fill="url(#buyu-sky)" />
      <g transform="translate(70 36)">
        <circle r={30} fill="#fde047" opacity={0.35} />
        <circle r={21} fill="#facc15" />
      </g>
      <g>
        <rect x={0} y={44} width={W} height={6} fill="#d6a26a" />
        <rect x={0} y={60} width={W} height={6} fill="#d6a26a" />
        {Array.from({ length: 26 }, (_, i) => (
          <path key={i} d={`M${i * 40 + 6} 76 L${i * 40 + 6} 36 L${i * 40 + 16} 27 L${i * 40 + 26} 36 L${i * 40 + 26} 76 Z`} fill="#fde7c5" stroke="#c08a52" strokeWidth={2} />
        ))}
      </g>
      {xs.map((p) => (
        <Plot key={p.n} x={off + p.at} y={TOP} cell={smallCell} n={p.n} c={c} d={d} potSlots={c} label={`${p.n}. adım`} />
      ))}
      {steps.length > 1 &&
        xs.slice(1).map((p, i) => (
          <path key={i} d={`M${off + p.at - 26} ${TOP + smallH / 2} h14 m-6 -7 l7 7 l-7 7`} stroke="#166534" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      {bigCols > 0 && (
        <Plot
          x={(W - bigW) / 2}
          y={y2}
          cell={bigCell}
          n={build ? build.n : big!}
          c={c}
          d={d}
          potSlots={potSlots}
          label={`${build ? build.n : big}. adım`}
          build={build}
          hot
        />
      )}
      <g className={motion ? 'bahce-fly1' : ''}>
        <g transform="translate(200 96) scale(.8)"><Butterfly c1="#f472b6" c2="#fb7185" /></g>
      </g>
      <g transform={`translate(${W - 90} 46) scale(.7)`}>
        <WateringCan pouring={watering} />
      </g>
      {bee && (
        <g transform={`translate(${W - 230} 70)`}>
          <Bee talk />
        </g>
      )}
    </svg>
  )
}
