import { Fragment, type ReactNode } from 'react'

/* ───────────── Bloklar ───────────── */

export type Kind = 'unit' | 'rod' | 'num' | 'group' | 'box'
export type Side = 'L' | 'R'

export interface Block {
  id: string
  kind: Kind
  /** num: değer · group: her çuvaldaki sayı */
  v: number
  /** group: çuval sayısı */
  n?: number
  locked?: boolean
  /** başlangıçta mı vardı, sonradan mı eklendi (sembolik yazım için) */
  init?: boolean
}
export type Src = { kind: Kind; v: number; n?: number }
export type Pans = { L: Block[]; R: Block[] }

export const weight = (b: Pick<Block, 'kind' | 'v' | 'n'>, x = 0) => (b.kind === 'unit' ? 1 : b.kind === 'rod' ? 10 : b.kind === 'num' ? b.v : b.kind === 'group' ? (b.n ?? 1) * b.v : x)
export const sideW = (bs: Block[], x = 0) => bs.reduce((a, b) => a + weight(b, x), 0)

const NUM_COL = ['#f8fafc', '#ef4444', '#a3e635', '#c084fc', '#facc15', '#16a34a', '#64748b', '#1e293b', '#92400e', '#2563eb', '#f97316']
const numFill = (v: number) => (v <= 10 ? NUM_COL[v] : ['#0ea5e9', '#f43f5e', '#8b5cf6', '#10b981', '#f59e0b'][Math.floor(v / 10) % 5])
const numInk = (v: number) => ([1, 2, 4].includes(v) ? '#1f2340' : v === 3 ? '#1f2340' : '#fff')

export function blockSize(b: Pick<Block, 'kind' | 'v' | 'n'>, u: number): [number, number] {
  switch (b.kind) {
    case 'unit':
      return [u, u]
    case 'rod': {
      const s = Math.min(u, 21)
      return [10 * s, s]
    }
    case 'num':
      return b.v <= 10 ? [Math.round(Math.max(36, Math.min(100, 24 + b.v * 7.6))), 36] : [52 + String(b.v).length * 8, 38]
    case 'group': {
      const n = b.n ?? 1
      const sw = Math.min(30, 206 / n)
      return [Math.round(n * sw + 8), 46]
    }
    case 'box':
      return [44, 44]
  }
}

/** Bloğun SVG çizimi (sol üst köşe 0,0) */
export function BlockArt({ b, u, x, reveal }: { b: Pick<Block, 'kind' | 'v' | 'n' | 'locked'>; u: number; x?: number; reveal?: boolean }) {
  const [w, h] = blockSize(b, u)
  switch (b.kind) {
    case 'unit':
      return (
        <g>
          <rect width={w} height={h} rx={4} fill="#fbbf24" stroke="#b45309" strokeWidth={1.5} />
          <rect x={3} y={3} width={w - 10} height={h * 0.28} rx={2} fill="#fff" opacity={0.45} />
        </g>
      )
    case 'rod': {
      const s = h
      return (
        <g>
          <rect width={w} height={h} rx={3} fill="#38bdf8" stroke="#0369a1" strokeWidth={1.5} />
          {Array.from({ length: 9 }, (_, i) => <line key={i} x1={(i + 1) * s} x2={(i + 1) * s} y1={2} y2={h - 2} stroke="#0369a1" strokeWidth={1} opacity={0.6} />)}
          <rect x={3} y={2.5} width={w - 6} height={h * 0.25} rx={2} fill="#fff" opacity={0.4} />
        </g>
      )
    }
    case 'num':
      return (
        <g>
          <rect width={w} height={h} rx={8} fill={numFill(b.v)} stroke="rgb(0 0 0 / .35)" strokeWidth={1.5} />
          <rect x={4} y={3} width={w - 8} height={8} rx={4} fill="#fff" opacity={0.35} />
          <text x={w / 2} y={h / 2 + 7} textAnchor="middle" fontSize={b.v > 99 ? 17 : 20} fontWeight={900} fill={numInk(b.v)}>{b.v}</text>
        </g>
      )
    case 'group': {
      const n = b.n ?? 1
      const sw = (w - 8) / n
      return (
        <g>
          <rect width={w} height={h} rx={10} fill="#ede9fe" stroke="#7c3aed" strokeWidth={1.5} strokeDasharray="4 3" />
          {Array.from({ length: n }, (_, i) => (
            <g key={i} transform={`translate(${4 + i * sw} 4)`}>
              <path d={`M${sw * 0.18} 8 Q${sw * 0.5} 2 ${sw * 0.82} 8 L${sw - 2} ${h - 12} Q${sw / 2} ${h - 6} 2 ${h - 12} Z`} fill="#c4b5fd" stroke="#6d28d9" strokeWidth={1.2} />
              <rect x={sw * 0.3} y={5} width={sw * 0.4} height={4} rx={2} fill="#6d28d9" />
              <text x={sw / 2} y={h * 0.62} textAnchor="middle" fontSize={Math.min(15, sw * 0.6)} fontWeight={900} fill="#3b0764">{b.v}</text>
            </g>
          ))}
        </g>
      )
    }
    case 'box':
      return (
        <g>
          <rect width={w} height={h} rx={6} fill={reveal ? '#a78bfa' : '#7c3aed'} stroke="#4c1d95" strokeWidth={2} />
          <rect x={w / 2 - 4} width={8} height={h} fill="#facc15" opacity={0.9} />
          <rect y={h / 2 - 4} width={w} height={8} fill="#facc15" opacity={0.9} />
          <circle cx={w / 2} cy={h / 2} r={11} fill="#fff" stroke="#4c1d95" strokeWidth={1.5} />
          <text x={w / 2} y={h / 2 + 6} textAnchor="middle" fontSize={reveal ? 15 : 17} fontWeight={900} fill="#4c1d95">{reveal && x !== undefined ? x : '?'}</text>
        </g>
      )
  }
}

/** Küçük bağımsız SVG (tepsi düğmeleri için) */
export function BlockIcon({ b, u, x, scale = 1 }: { b: Pick<Block, 'kind' | 'v' | 'n'>; u: number; x?: number; scale?: number }) {
  const [w, h] = blockSize(b, u)
  return (
    <svg width={w * scale + 4} height={h * scale + 4} viewBox={`-2 -2 ${w + 4} ${h + 4}`} aria-hidden>
      <BlockArt b={b} u={u} x={x} />
    </svg>
  )
}

/** Kefedeki blokları alttan yukarı, ortalanmış satırlara yerleştirir */
const ORDER: Record<Kind, number> = { box: 0, group: 1, rod: 2, num: 3, unit: 4 }

function layout(blocks: Block[], u: number, width = 214) {
  const bs = blocks.map((b, i) => [b, i] as const).sort((a, b) => ORDER[a[0].kind] - ORDER[b[0].kind] || a[1] - b[1]).map(([b]) => b)
  const rows: { items: { b: Block; w: number; h: number }[]; w: number; h: number }[] = []
  let cur: (typeof rows)[number] = { items: [], w: 0, h: 0 }
  for (const b of bs) {
    const [w, h] = blockSize(b, u)
    if (cur.items.length && cur.w + 4 + w > width) {
      rows.push(cur)
      cur = { items: [], w: 0, h: 0 }
    }
    cur.items.push({ b, w, h })
    cur.w += (cur.items.length > 1 ? 4 : 0) + w
    cur.h = Math.max(cur.h, h)
  }
  if (cur.items.length) rows.push(cur)
  const out: { b: Block; x: number; y: number; w: number; h: number }[] = []
  let base = 0
  for (const r of rows) {
    let x = -r.w / 2
    for (const it of r.items) {
      out.push({ b: it.b, x, y: -(base + it.h), w: it.w, h: it.h })
      x += it.w + 4
    }
    base += r.h + 3
  }
  return out
}

/* ───────────── Terazi kulesi ───────────── */

export const PIVOT = { x: 400, y: 104 }
const ARM = 252
const HANG = 150

export interface SceneProps {
  pans: Pans
  angle: number
  u: number
  x?: number
  reveal?: boolean
  balanced: boolean
  pinned?: boolean
  hot: Side | null
  armed: boolean
  zoneRef: (s: Side, el: Element | null) => void
  onBlockDown: (e: React.PointerEvent, side: Side, id: string) => void
  onPanTap: (s: Side) => void
  dragId: string | null
  overlay?: ReactNode
}

export function TowerScene({ pans, angle, u, x, reveal, balanced, pinned, hot, armed, zoneRef, onBlockDown, onPanTap, dragId, overlay }: SceneProps) {
  const rad = (angle * Math.PI) / 180
  const ends: Record<Side, { x: number; y: number }> = {
    L: { x: PIVOT.x - ARM * Math.cos(rad), y: PIVOT.y - ARM * Math.sin(rad) },
    R: { x: PIVOT.x + ARM * Math.cos(rad), y: PIVOT.y + ARM * Math.sin(rad) },
  }
  const towerCols = ['#f472b6', '#60a5fa', '#facc15', '#34d399', '#a78bfa', '#fb923c', '#f87171']
  return (
    <svg viewBox="16 18 768 412" className="block w-full select-none" role="img" aria-label={`Terazi: sol ${pans.L.length} blok, sağ ${pans.R.length} blok. ${balanced ? 'Dengede.' : angle > 0 ? 'Sağ kefe ağır basıyor.' : 'Sol kefe ağır basıyor.'}`}>
      <defs>
        <linearGradient id="dk-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bae6fd" /><stop offset="1" stopColor="#f0f9ff" /></linearGradient>
        <linearGradient id="dk-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d6a26b" /><stop offset="1" stopColor="#9a6532" /></linearGradient>
        <linearGradient id="dk-pan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f1f5f9" /><stop offset="1" stopColor="#94a3b8" /></linearGradient>
        <radialGradient id="dk-glow"><stop offset="0" stopColor="#fde047" stopOpacity=".55" /><stop offset="1" stopColor="#fde047" stopOpacity="0" /></radialGradient>
      </defs>
      {/* gökyüzü ve tepeler */}
      <rect width="800" height="430" fill="url(#dk-sky)" />
      <circle cx="712" cy="70" r="34" fill="#fde68a" />
      <circle cx="712" cy="70" r="48" fill="#fde68a" opacity=".35" />
      <g fill="#fff" opacity=".9">
        <ellipse cx="140" cy="60" rx="46" ry="16" /><ellipse cx="170" cy="50" rx="30" ry="16" />
        <ellipse cx="590" cy="150" rx="40" ry="13" /><ellipse cx="615" cy="142" rx="24" ry="13" />
      </g>
      <path d="M0 350 Q150 290 320 340 T640 330 T800 320 V430 H0Z" fill="#bbf7d0" />
      <path d="M0 380 Q200 350 420 378 T800 366 V430 H0Z" fill="#86efac" />
      <rect y="404" width="800" height="26" fill="#4ade80" />
      {/* kule */}
      <path d="M340 406 h120 l-10 -16 h-100z" fill="#64748b" />
      {Array.from({ length: 6 }, (_, i) => {
        const y = 390 - (i + 1) * 44
        return (
          <g key={i}>
            <rect x={372} y={y} width={56} height={42} rx={6} fill={towerCols[i % towerCols.length]} stroke="rgb(0 0 0 / .2)" strokeWidth={1.5} />
            <rect x={377} y={y + 4} width={46} height={8} rx={4} fill="#fff" opacity={0.35} />
          </g>
        )
      })}
      <path d={`M${PIVOT.x} ${PIVOT.y - 6} L${PIVOT.x - 24} ${PIVOT.y + 30} H${PIVOT.x + 24} Z`} fill="#475569" />
      {balanced && <circle cx={PIVOT.x} cy={PIVOT.y} r={70} fill="url(#dk-glow)" pointerEvents="none" />}
      {/* kefeler */}
      {(['L', 'R'] as Side[]).map((s) => {
        const e = ends[s]
        const fy = e.y + HANG
        const items = layout(pans[s], u)
        return (
          <g key={s}>
            <line x1={e.x} y1={e.y} x2={e.x - 108} y2={fy} stroke="#475569" strokeWidth={2} />
            <line x1={e.x} y1={e.y} x2={e.x + 108} y2={fy} stroke="#475569" strokeWidth={2} />
            <g onClick={(ev) => !(ev.target as Element).closest('[data-block]') && onPanTap(s)} style={{ cursor: armed ? 'pointer' : 'default' }}>
              <rect data-pan={s} ref={(el) => zoneRef(s, el)} x={e.x - 128} y={fy - 170} width={256} height={206} rx={20} fill={hot === s ? 'rgb(253 224 71 / .28)' : armed ? 'rgb(255 255 255 / .22)' : 'transparent'} stroke={hot === s || armed ? '#f59e0b' : 'none'} strokeWidth={2.5} strokeDasharray={armed && hot !== s ? '8 6' : undefined}>
                {armed && hot !== s && <animate attributeName="stroke-dashoffset" values="0;-28" dur="1s" repeatCount="indefinite" />}
              </rect>
              <path d={`M${e.x - 116} ${fy} Q${e.x} ${fy + 46} ${e.x + 116} ${fy}`} fill="url(#dk-pan)" stroke="#64748b" strokeWidth={2} />
              <rect x={e.x - 120} y={fy - 5} width={240} height={9} rx={4.5} fill="#cbd5e1" stroke="#64748b" strokeWidth={1.5} />
              {items.map((it) => (
                <g
                  key={it.b.id}
                  data-block
                  data-handle
                  data-side={s}
                  data-kind={it.b.kind}
                  transform={`translate(${e.x + it.x} ${fy - 4 + it.y})`}
                  onPointerDown={(ev) => onBlockDown(ev, s, it.b.id)}
                  style={{ cursor: it.b.locked ? 'not-allowed' : 'grab', touchAction: 'none', opacity: dragId === it.b.id ? 0.35 : 1 }}
                >
                  <rect x={-4} y={-4} width={it.w + 8} height={it.h + 8} fill="transparent" />
                  <BlockArt b={it.b} u={u} x={x} reveal={reveal} />
                  {it.b.locked && it.b.kind !== 'unit' && it.b.kind !== 'rod' && (
                    <g transform={`translate(${it.w - 7} -5)`}>
                      <circle r={7} fill="#fff" stroke="#94a3b8" />
                      <path d="M-3 0 h6 v4 h-6z M-2 0 v-2 a2 2 0 0 1 4 0 v2" fill="none" stroke="#475569" strokeWidth={1.3} />
                    </g>
                  )}
                </g>
              ))}
            </g>
          </g>
        )
      })}
      {/* kiriş */}
      <g transform={`rotate(${angle} ${PIVOT.x} ${PIVOT.y})`} pointerEvents="none">
        <rect x={PIVOT.x - ARM - 14} y={PIVOT.y - 9} width={ARM * 2 + 28} height={18} rx={9} fill="url(#dk-wood)" stroke="#7c4a1e" strokeWidth={2} />
        {Array.from({ length: 9 }, (_, i) => <line key={i} x1={PIVOT.x - 200 + i * 50} x2={PIVOT.x - 200 + i * 50} y1={PIVOT.y - 4} y2={PIVOT.y + 4} stroke="#7c4a1e" strokeWidth={1.5} opacity={0.5} />)}
        <circle cx={PIVOT.x - ARM} cy={PIVOT.y} r={7} fill="#334155" />
        <circle cx={PIVOT.x + ARM} cy={PIVOT.y} r={7} fill="#334155" />
        {/* denge göstergesi */}
        <path d={`M${PIVOT.x} ${PIVOT.y - 10} v-34`} stroke={balanced ? '#16a34a' : '#f97316'} strokeWidth={4} strokeLinecap="round" />
      </g>
      <circle cx={PIVOT.x} cy={PIVOT.y} r={10} fill="#1e293b" stroke="#fff" strokeWidth={3} />
      <path d={`M${PIVOT.x - 16} ${PIVOT.y - 52} A 26 26 0 0 1 ${PIVOT.x + 16} ${PIVOT.y - 52}`} fill="none" stroke="#94a3b8" strokeWidth={2} />
      {pinned && (
        <g>
          <rect x={PIVOT.x - 44} y={PIVOT.y + 34} width={88} height={26} rx={13} fill="#1e293b" />
          <text x={PIVOT.x} y={PIVOT.y + 52} textAnchor="middle" fontSize={13} fontWeight={900} fill="#fff">🔒 kilitli</text>
        </g>
      )}
      {overlay}
    </svg>
  )
}

/* ───────────── Sembolik yazım ───────────── */

export const BOX = '□'

/** Bir kefenin ifadesi: kutular, çuvallar, sayı blokları, onluk/birlik (başlangıç ve eklenen ayrı terim) */
export function sideExpr(bs: Block[]): string {
  const terms: string[] = []
  const boxes = bs.filter((b) => b.kind === 'box').length
  if (boxes) terms.push(boxes === 1 ? BOX : `${boxes} × ${BOX}`)
  for (const b of bs) if (b.kind === 'group') terms.push(`${b.n ?? 1} × ${b.v}`)
  const initBT = bs.filter((b) => b.init && (b.kind === 'unit' || b.kind === 'rod')).reduce((a, b) => a + weight(b), 0)
  if (initBT) terms.push(String(initBT))
  for (const b of bs) if (b.kind === 'num') terms.push(String(b.v))
  const addBT = bs.filter((b) => !b.init && (b.kind === 'unit' || b.kind === 'rod')).reduce((a, b) => a + weight(b), 0)
  if (addBT) terms.push(String(addBT))
  return terms.length ? terms.join(' + ') : '0'
}

/** □ işaretini mor kutu simgesiyle gösterir */
export function Expr({ text, className = '' }: { text: string; className?: string }) {
  const parts = text.split(BOX)
  return (
    <span className={className}>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p}
          {i < parts.length - 1 && <span className="mx-0.5 inline-grid size-[1.05em] translate-y-[0.12em] place-items-center rounded-[0.2em] bg-violet-600 ring-1 ring-white/80 text-[0.62em] leading-none font-black text-white" aria-label="kutu">?</span>}
        </Fragment>
      ))}
    </span>
  )
}
