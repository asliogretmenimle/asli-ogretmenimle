import { useState, type ReactNode } from 'react'
import { Bee, Butterfly, Flower, GARDEN_CSS, LetterTile, Stone, WateringCan } from './flowers'

/**
 * Bahçe sahnesi (SVG): gökyüzü, çit, kelebekler, sulama kabı ve bir ya da daha çok tarh (çiçek sırası,
 * taş patikası ya da harf tabelaları). Uzun sıralar alt satıra kayar.
 * Hücreler dokunulabilir ve `data-drop` ile sürükle-bırak hedefidir.
 */

export interface GCell {
  /** çiçek türü / şekil / harf sırası; null = boş çukur */
  kind: number | null
  given?: boolean
  drop?: string
  selected?: boolean
  mark?: 'ok' | 'bad'
  grow?: boolean
  wilt?: boolean
  tag?: string
  /** ilgi çekmek için vurgulu numara */
  hot?: boolean
  onTap?: () => void
  label?: string
}

export interface Bed {
  key: string
  item: 'flower' | 'stone' | 'letter'
  cells: GCell[]
  /** bu hücreden sonra çit */
  fences?: Set<number>
  title?: string
  /** sıra başına en çok hücre */
  cols?: number
}

const W = 1000
const TOP = 92
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function GardenScene({ beds, watering, bee, beeAt, cols = 10, ariaLabel, overlay }: {
  beds: Bed[]
  watering?: boolean
  bee?: boolean
  /** arının uçtuğu hücre (ilk tarhta) */
  beeAt?: number
  cols?: number
  ariaLabel: string
  overlay?: ReactNode
}) {
  const [motion] = useState(() => !reduced())
  // yerleşim
  let y = TOP
  const layout = beds.map((bed) => {
    const c = Math.min(bed.cols ?? cols, cols, Math.max(1, bed.cells.length))
    const P = Math.min(110, (W - 80) / c)
    const fh = bed.item === 'flower' ? Math.min(118, P * 1.2) : P * 0.8
    const lineH = fh + (bed.cells.some((x) => x.tag) ? 58 : 40) + (bed.title ? 26 : 0)
    const lines = Math.ceil(bed.cells.length / c)
    const top = y
    y += lines * lineH + 10
    const x0 = (W - c * P) / 2
    return { bed, c, P, fh, lineH, lines, top, x0 }
  })
  const H = Math.max(y + 18, 300)
  const pos = (L: (typeof layout)[number], i: number) => {
    const line = Math.floor(i / L.c)
    const col = i % L.c
    return { x: L.x0 + L.P * (col + 0.5), y: L.top + (L.bed.title ? 26 : 0) + line * L.lineH + L.fh + 14 }
  }
  const beePos = beeAt !== undefined && layout[0] ? pos(layout[0], Math.min(beeAt, layout[0].bed.cells.length - 1)) : { x: W - 160, y: 70 }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full select-none" role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id="bahce-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bae6fd" />
          <stop offset="1" stopColor="#ecfeff" />
        </linearGradient>
        <linearGradient id="bahce-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#86efac" />
          <stop offset="1" stopColor="#4ade80" />
        </linearGradient>
        <linearGradient id="bahce-soil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a16207" />
          <stop offset="1" stopColor="#78350f" />
        </linearGradient>
      </defs>
      <style>{GARDEN_CSS}</style>

      <rect width={W} height={H} fill="url(#bahce-grass)" />
      <rect width={W} height={TOP + 6} fill="url(#bahce-sky)" />
      <g transform="translate(70 40)">
        <circle r={34} fill="#fde047" opacity={0.35} />
        <circle r={24} fill="#facc15" />
      </g>
      <g fill="#fff" opacity={0.9}>
        <ellipse cx={300} cy={34} rx={42} ry={14} />
        <ellipse cx={330} cy={26} rx={30} ry={14} />
        <ellipse cx={620} cy={44} rx={36} ry={12} />
        <ellipse cx={646} cy={36} rx={24} ry={12} />
      </g>
      {/* çit */}
      <g>
        <rect x={0} y={TOP - 30} width={W} height={7} fill="#d6a26a" />
        <rect x={0} y={TOP - 12} width={W} height={7} fill="#d6a26a" />
        {Array.from({ length: 26 }, (_, i) => (
          <path key={i} d={`M${i * 40 + 6} ${TOP + 6} L${i * 40 + 6} ${TOP - 40} L${i * 40 + 16} ${TOP - 50} L${i * 40 + 26} ${TOP - 40} L${i * 40 + 26} ${TOP + 6} Z`} fill="#fde7c5" stroke="#c08a52" strokeWidth={2} />
        ))}
      </g>
      <rect y={TOP + 2} width={W} height={10} fill="#4ade80" />

      {/* tarhlar */}
      {layout.map((L) => (
        <g key={L.bed.key}>
          {L.bed.title && (
            <g transform={`translate(${L.x0 + 4} ${L.top + 14})`}>
              <rect x={0} y={-14} width={L.bed.title.length * 10.5 + 26} height={28} rx={14} fill="#fff" opacity={0.92} stroke="#16a34a" strokeWidth={2} />
              <text x={13} y={6} fontSize={17} fontWeight={900} fill="#166534">{L.bed.title}</text>
            </g>
          )}
          {Array.from({ length: L.lines }, (_, line) => {
            const n = Math.min(L.c, L.bed.cells.length - line * L.c)
            const yy = L.top + (L.bed.title ? 26 : 0) + line * L.lineH + L.fh + 14
            return L.bed.item === 'flower' ? (
              <g key={line}>
                <rect x={L.x0 - 12} y={yy - 16} width={n * L.P + 24} height={34} rx={17} fill="url(#bahce-soil)" />
                <rect x={L.x0 - 6} y={yy - 14} width={n * L.P + 12} height={6} rx={3} fill="#ca8a04" opacity={0.35} />
              </g>
            ) : L.bed.item === 'stone' ? (
              <rect key={line} x={L.x0 - 12} y={yy - 30} width={n * L.P + 24} height={52} rx={26} fill="#bbf7d0" opacity={0.8} />
            ) : (
              <rect key={line} x={L.x0 - 12} y={yy - 8} width={n * L.P + 24} height={14} rx={7} fill="#d6a26a" />
            )
          })}
          {L.bed.cells.map((c, i) => {
            const p = pos(L, i)
            const tappable = !!c.onTap
            const r = Math.min(34, L.P * 0.36)
            return (
              <g
                key={i}
                transform={`translate(${p.x} ${p.y})`}
                data-drop={c.drop}
                data-handle={tappable ? '' : undefined}
                role={tappable ? 'button' : undefined}
                tabIndex={tappable ? 0 : undefined}
                aria-label={c.label}
                className={tappable ? 'bahce-tap' : ''}
                onClick={c.onTap}
                onKeyDown={(e) => {
                  if (tappable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    c.onTap!()
                  }
                }}
              >
                <rect x={-L.P / 2} y={-L.fh - 6} width={L.P} height={L.fh + 40} fill="transparent" />
                {L.bed.item === 'flower' && <ellipse cx={0} cy={2} rx={r * 0.7} ry={7} fill="#451a03" opacity={0.7} />}
                {c.kind === null ? (
                  <g>
                    <circle className={`bahce-slot ${c.selected ? 'bahce-pulse' : ''}`} cx={0} cy={L.bed.item === 'flower' ? -r - 6 : -4} r={r} fill={c.selected ? 'rgba(14,165,233,.18)' : 'rgba(255,255,255,.55)'} stroke={c.selected ? '#0284c7' : '#166534'} strokeWidth={c.selected ? 4 : 2.5} strokeDasharray="7 6" />
                    <text x={0} y={(L.bed.item === 'flower' ? -r - 6 : -4) + r * 0.36} textAnchor="middle" fontSize={r * 1.05} fontWeight={900} fill={c.selected ? '#0284c7' : '#166534'} opacity={0.7}>?</text>
                  </g>
                ) : L.bed.item === 'flower' ? (
                  <g transform={`scale(${Math.min(1.15, L.fh / 110)})`}>
                    <Flower kind={c.kind} h={100} grow={c.grow && motion} wilt={c.wilt} sway={!c.wilt && motion} />
                  </g>
                ) : L.bed.item === 'stone' ? (
                  <g transform="translate(0 -4)">
                    <Stone shape={c.kind} r={Math.min(32, L.P * 0.38)} />
                  </g>
                ) : (
                  <g transform={`translate(0 ${-L.fh / 2})`}>
                    <rect x={-3} y={0} width={6} height={L.fh / 2 + 4} fill="#92400e" />
                    <LetterTile letter={'ABCD'[c.kind]} size={Math.min(58, L.P * 0.62)} />
                  </g>
                )}
                <rect className="bahce-focus" x={-L.P / 2 + 3} y={-L.fh - 4} width={L.P - 6} height={L.fh + 22} rx={12} fill="none" stroke="transparent" />
                {c.tag && (
                  <g transform="translate(0 32)">
                    <rect x={-17} y={-13} width={34} height={24} rx={12} fill={c.hot ? '#f97316' : '#fff'} stroke={c.hot ? '#c2410c' : '#16a34a'} strokeWidth={2} />
                    <text y={5} textAnchor="middle" fontSize={15} fontWeight={900} fill={c.hot ? '#fff' : '#166534'}>{c.tag}</text>
                  </g>
                )}
                {c.mark && (
                  <g transform={`translate(${L.P * 0.3} ${-L.fh + 4})`}>
                    <circle r={14} fill={c.mark === 'ok' ? '#22c55e' : '#f59e0b'} stroke="#fff" strokeWidth={3} />
                    {c.mark === 'ok' ? (
                      <path d="M-6 0 L-2 5 L7 -5" stroke="#fff" strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <text y={7} textAnchor="middle" fontSize={20} fontWeight={900} fill="#fff">?</text>
                    )}
                  </g>
                )}
                {L.bed.fences?.has(i) && i < L.bed.cells.length - 1 && (i + 1) % L.c !== 0 && (
                  <g transform={`translate(${L.P / 2} 0)`} pointerEvents="none">
                    <rect x={-4} y={-L.fh + 4} width={8} height={L.fh + 14} rx={3} fill="#b45309" />
                    <path d={`M-4 ${-L.fh + 4} L0 ${-L.fh - 6} L4 ${-L.fh + 4} Z`} fill="#b45309" />
                    <rect x={-10} y={-L.fh * 0.6} width={20} height={6} rx={3} fill="#d97706" />
                  </g>
                )}
              </g>
            )
          })}
        </g>
      ))}

      {/* kelebekler */}
      <g className={motion ? 'bahce-fly1' : ''}>
        <g transform="translate(180 64) scale(.9)"><Butterfly c1="#f472b6" c2="#fb7185" /></g>
      </g>
      <g className={motion ? 'bahce-fly2' : ''}>
        <g transform="translate(860 120) scale(.75)"><Butterfly c1="#fbbf24" c2="#fb923c" /></g>
      </g>

      {/* sulama kabı */}
      <g transform={`translate(${W - 92} 52) scale(.78)`}>
        <WateringCan pouring={watering} />
      </g>

      {bee && (
        <g style={{ transform: `translate(${beePos.x + 30}px, ${beePos.y - 150}px)`, transition: motion ? 'transform .6s ease-in-out' : 'none' }}>
          <g transform="scale(1.1)"><Bee talk /></g>
        </g>
      )}
      {overlay}
    </svg>
  )
}
