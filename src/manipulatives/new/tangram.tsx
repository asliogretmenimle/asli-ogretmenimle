import { useMemo, useRef, useState } from 'react'
import { FlipHorizontal2, RotateCcw, RotateCw, Shuffle, Sparkles } from 'lucide-react'
import { poss } from '../../lib/generators'
import { ToolButton } from '../ui'
import type { ToolDef } from '../types'

/**
 * Tangram — yedi klasik parça (küçük üçgen = 1 birim):
 *   2 büyük üçgen (4’er), orta üçgen (2), kare (2), paralelkenar (2), 2 küçük üçgen (1’er) → toplam 16.
 *  - Parçayı tek parmakla sürükle; bırakınca köşesi yakındaki köşeye yapışır.
 *  - Parçayı tutarken ikinci parmakla çevir (döndür) → 45°’lik adımlara oturur.
 *    Dokunma alternatifi: seçili parçaya tekrar dokun (45° döner) ya da ↺ ↻ düğmeleri.
 *  - Paralelkenarı “Çevir” ile ters yüz et (aynası olan tek parça).
 *  - Siluet bulmacaları (2, 3, 5 ve 7 parçalık) ve serbest mod; alan ilişkileri parçaların üzerinde.
 *
 * Görev hedefi (target): { puzzle: 'kare2' | 'ucgen2' | 'paralel2' | 'ucgen3' | 'ucgen5' | 'kare' | 'ev' | 'kedi' | 'kayik' | 'balik' }
 *   → siluet parçalarla tamamen, taşmadan ve üst üste bindirmeden kaplanmalı (farklı yerleşimler de kabul).
 */

type Pt = [number, number]
type Kind = 'L' | 'M' | 'S' | 'Q' | 'P'
type PieceId = 'L1' | 'L2' | 'M' | 'S1' | 'S2' | 'Q' | 'P'
type Piece = { id: PieceId; x: number; y: number; r: number; f: boolean }
type V = { puzzle: string | null; pieces: Piece[]; areas: boolean; sel: PieceId | null }

const H2 = Math.SQRT2
const WORLD = { w: 12, h: 12.3 }
const TRAY_Y = 7.35

const KIND: Record<PieceId, Kind> = { L1: 'L', L2: 'L', M: 'M', S1: 'S', S2: 'S', Q: 'Q', P: 'P' }
const AREA: Record<Kind, number> = { L: 4, M: 2, S: 1, Q: 2, P: 2 }
const NAME: Record<Kind, string> = { L: 'Büyük üçgen', M: 'Orta üçgen', S: 'Küçük üçgen', Q: 'Kare', P: 'Paralelkenar' }
const COLOR: Record<PieceId, [string, string]> = {
  L1: ['#f43f5e', '#be123c'],
  L2: ['#3b82f6', '#1d4ed8'],
  M: ['#f59e0b', '#b45309'],
  S1: ['#10b981', '#047857'],
  S2: ['#8b5cf6', '#6d28d9'],
  Q: ['#facc15', '#a16207'],
  P: ['#06b6d4', '#0e7490'],
}

/** Kanonik kare (kenar 4) içindeki yerleri */
const CANON: Record<PieceId, Pt[]> = {
  L1: [[0, 0], [4, 0], [2, 2]],
  L2: [[0, 0], [2, 2], [0, 4]],
  M: [[4, 2], [4, 4], [2, 4]],
  S1: [[4, 0], [4, 2], [3, 1]],
  Q: [[3, 1], [4, 2], [3, 3], [2, 2]],
  S2: [[2, 2], [3, 3], [1, 3]],
  P: [[0, 4], [1, 3], [3, 3], [2, 4]],
}
const centroid = (p: Pt[]): Pt => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length]
const LOCAL: Record<Kind, Pt[]> = Object.fromEntries(
  (['L1', 'M', 'S1', 'Q', 'P'] as PieceId[]).map((id) => {
    const c = centroid(CANON[id])
    return [KIND[id], CANON[id].map(([x, y]) => [x - c[0], y - c[1]] as Pt)]
  }),
) as Record<Kind, Pt[]>

function worldPoly(p: Piece, angDeg?: number): Pt[] {
  const a = ((angDeg ?? p.r * 45) * Math.PI) / 180
  const c = Math.cos(a), s = Math.sin(a)
  return LOCAL[KIND[p.id]].map(([x0, y]) => {
    const x = p.f ? -x0 : x0
    return [p.x + x * c - y * s, p.y + x * s + y * c]
  })
}

// ─── Bulmacalar (çözüm parçalarının birleşimi = siluet) ───────────────────
const tf = (poly: Pt[], deg: number, ox: number, oy: number, dx: number, dy: number): Pt[] => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  return poly.map(([x, y]) => [ox + (x - ox) * c - (y - oy) * s + dx, oy + (x - ox) * s + (y - oy) * c + dy])
}
const H = 2 * H2 // büyük üçgenin dik kenarı
const h = H2
const PUZZLES: { id: string; name: string; group: string; pieces: PieceId[]; sol: Pt[][] }[] = [
  { id: 'kare2', name: 'Kare', group: '2 parça', pieces: ['S1', 'S2'], sol: [[[0, 1], [2, 1], [1, 0]], [[0, 1], [2, 1], [1, 2]]] },
  { id: 'ucgen2', name: 'Üçgen', group: '2 parça', pieces: ['S1', 'S2'], sol: [[[0, 0], [2, 0], [1, 1]], [[0, 0], [1, 1], [0, 2]]] },
  { id: 'paralel2', name: 'Paralelkenar', group: '2 parça', pieces: ['S1', 'S2'], sol: [[[0, 1], [1, 0], [2, 1]], [[1, 0], [3, 0], [2, 1]]] },
  { id: 'ucgen3', name: 'Büyük üçgen', group: '3 parça', pieces: ['M', 'S1', 'S2'], sol: [[[0, 0], [2, 0], [2, 2]], [[2, 0], [4, 0], [3, 1]], [[2, 0], [3, 1], [2, 2]]] },
  { id: 'ucgen5', name: 'Dev üçgen', group: '5 parça', pieces: ['M', 'S1', 'S2', 'Q', 'P'], sol: (['M', 'S1', 'Q', 'S2', 'P'] as PieceId[]).map((id) => CANON[id]) },
  { id: 'kare', name: 'Kare', group: '7 parça', pieces: ['L1', 'L2', 'M', 'S1', 'S2', 'Q', 'P'], sol: (Object.keys(CANON) as PieceId[]).map((id) => CANON[id]) },
  {
    id: 'ev',
    name: 'Ev',
    group: '7 parça',
    pieces: ['L1', 'L2', 'M', 'S1', 'S2', 'Q', 'P'],
    sol: [
      ...(['M', 'S1', 'Q', 'S2', 'P'] as PieceId[]).map((id) => tf(CANON[id], 225, 0, 0, 0, 0)),
      [[-h, -H], [h, -H], [h, 0]],
      [[-h, -H], [-h, 0], [h, 0]],
    ],
  },
  {
    id: 'kedi',
    name: 'Kedi',
    group: '7 parça',
    pieces: ['L1', 'L2', 'M', 'S1', 'S2', 'Q', 'P'],
    sol: [
      [[0, 8], [H, 8], [H, 8 - H]],
      [[H, 8], [2 * H, 8], [H, 8 - H]],
      [[H, 8 - H], [H + 1, 7 - H], [H, 6 - H], [H - 1, 7 - H]],
      [[H - 1, 7 - H], [H, 6 - H], [H - 1, 5 - H]],
      [[H + 1, 7 - H], [H, 6 - H], [H + 1, 5 - H]],
      [[0, 8], [2, 6], [0, 6]],
      [[2 * H, 8], [2 * H + 2, 8], [2 * H + 3, 7], [2 * H + 1, 7]],
    ],
  },
  {
    id: 'kayik',
    name: 'Kayık',
    group: '7 parça',
    pieces: ['L1', 'L2', 'M', 'S1', 'S2', 'Q', 'P'],
    sol: [
      [[0, 0], [2, 0], [2, 2]],
      [[2, 0], [6, 0], [4, 2]],
      [[2, 0], [3, 1], [2, 2]],
      [[3, 1], [4, 2], [2, 2]],
      [[3, 0], [3, -H], [3 + H, 0]],
      [[3, 0], [3, -2], [2, -3], [2, -1]],
      [[3, -H - h], [3 + h, -H - h], [3 + h, -H], [3, -H]],
    ],
  },
  {
    id: 'balik',
    name: 'Balık',
    group: '7 parça',
    pieces: ['L1', 'L2', 'M', 'S1', 'S2', 'Q', 'P'],
    sol: [
      [[2, 0], [2, 4], [0, 2]],
      [[2, 0], [4, 2], [2, 4]],
      ...(['M', 'S1', 'Q', 'S2', 'P'] as PieceId[]).map((id) => tf(CANON[id], -45, 4, 4, -4, -2)),
    ],
  },
]

/** Siluetleri tahtanın üst bölümünde ortala */
const SIL: Record<string, Pt[][]> = Object.fromEntries(
  PUZZLES.map((pz) => {
    const all = pz.sol.flat()
    const minX = Math.min(...all.map((p) => p[0])), maxX = Math.max(...all.map((p) => p[0]))
    const minY = Math.min(...all.map((p) => p[1])), maxY = Math.max(...all.map((p) => p[1]))
    const dx = WORLD.w / 2 - (minX + maxX) / 2, dy = TRAY_Y / 2 - (minY + maxY) / 2
    return [pz.id, pz.sol.map((poly) => poly.map(([x, y]) => [x + dx, y + dy] as Pt))]
  }),
)

const TRAY: Record<PieceId, Piece> = {
  L1: { id: 'L1', x: 2.4, y: 8.27, r: 0, f: false },
  L2: { id: 'L2', x: 6.8, y: 8.27, r: 0, f: false },
  Q: { id: 'Q', x: 10.2, y: 8.6, r: 0, f: false },
  M: { id: 'M', x: 1.733, y: 11.333, r: 0, f: false },
  P: { id: 'P', x: 4.3, y: 10.6, r: 0, f: false },
  S1: { id: 'S1', x: 7.2, y: 11, r: 0, f: false },
  S2: { id: 'S2', x: 9, y: 11, r: 0, f: false },
}
const ALL: PieceId[] = ['L1', 'L2', 'M', 'S1', 'S2', 'Q', 'P']
const squarePieces = (): Piece[] =>
  ALL.map((id) => {
    const c = centroid(CANON[id])
    // L2 = L1’in 270°, S2 = S1’in 90° dönmüş hâli
    return { id, x: c[0] + 4, y: c[1] + 1.65, r: id === 'L2' ? 6 : id === 'S2' ? 2 : 0, f: false }
  })
const trayPieces = (ids: PieceId[]): Piece[] => ids.map((id) => ({ ...TRAY[id] }))

function inPoly([x, y]: Pt, poly: Pt[]) {
  let ins = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins
  }
  return ins
}

/** Kaplama oranı (0–1) ve hatalı örnek sayısı */
function coverage(sil: Pt[][], polys: Pt[][]) {
  const all = sil.flat()
  const minX = Math.min(...all.map((p) => p[0])) - 0.3, maxX = Math.max(...all.map((p) => p[0])) + 0.3
  const minY = Math.min(...all.map((p) => p[1])) - 0.3, maxY = Math.max(...all.map((p) => p[1])) + 0.3
  const st = 0.11
  let inside = 0, good = 0, bad = 0
  for (let x = minX + 0.0371; x < maxX; x += st)
    for (let y = minY + 0.0517; y < maxY; y += st) {
      const p: Pt = [x, y]
      const s = sil.some((q) => inPoly(p, q))
      let c = 0
      for (const q of polys) if (inPoly(p, q)) c++
      if (s) {
        inside++
        if (c === 1) good++
        else if (c > 1) bad++
      } else if (c > 0) bad++
    }
  return { ratio: inside ? good / inside : 0, bad, inside }
}
const solved = (sil: Pt[][], polys: Pt[][]) => {
  const c = coverage(sil, polys)
  return c.ratio > 0.985 && c.bad <= c.inside * 0.015
}

function PieceShape({ p, ang, selected, areas }: { p: Piece; ang?: number; selected: boolean; areas: boolean }) {
  const poly = worldPoly(p, ang)
  const [fill, stroke] = COLOR[p.id]
  const pts = poly.map((q) => q.join(',')).join(' ')
  const kind = KIND[p.id]
  return (
    <g data-piece={p.id} style={{ cursor: 'grab' }}>
      {selected && <polygon points={pts} fill="none" stroke="#1f2340" strokeWidth={0.16} strokeLinejoin="round" opacity={0.25} />}
      <polygon points={pts} fill={fill} stroke={selected ? '#fff' : stroke} strokeWidth={selected ? 0.07 : 0.045} strokeLinejoin="round" />
      <polygon points={pts} fill="url(#tg-shine)" pointerEvents="none" />
      {areas && (
        <text x={p.x} y={p.y + 0.2} textAnchor="middle" fontSize={kind === 'S' ? 0.5 : 0.62} fontWeight={900} fill="#fff" stroke={stroke} strokeWidth={0.06} paintOrder="stroke" pointerEvents="none">
          {AREA[kind]}
        </text>
      )}
    </g>
  )
}

function Board({ value, onChange, locked }: { value: V; onChange: (v: V) => void; locked?: boolean }) {
  const svg = useRef<SVGSVGElement>(null)
  const [live, setLive] = useState<{ id: PieceId; ang: number } | null>(null)
  const ptrs = useRef(new Map<number, Pt>())
  const st = useRef<{ id: PieceId | null; off: Pt; moved: boolean; rot?: { a0: number; base: number }; wasSel: boolean; start: Pt }>({ id: null, off: [0, 0], moved: false, wasSel: false, start: [0, 0] })
  const sil = value.puzzle ? SIL[value.puzzle] : null

  const toWorld = (cx: number, cy: number): Pt => {
    const s = svg.current!
    const m = s.getScreenCTM()
    if (!m) return [0, 0]
    const pt = new DOMPoint(cx, cy).matrixTransform(m.inverse())
    return [pt.x, pt.y]
  }
  const setPiece = (id: PieceId, patch: Partial<Piece>, extra?: Partial<V>) =>
    onChange({ ...value, ...extra, pieces: value.pieces.map((p) => (p.id === id ? { ...p, ...patch } : p)) })

  /** Bırakınca: köşeyi en yakın köşeye yapıştır, tahtada tut */
  const settle = (p: Piece): Piece => {
    const mine = worldPoly(p)
    const targets: Pt[] = [...value.pieces.filter((q) => q.id !== p.id).flatMap((q) => worldPoly(q)), ...(sil ? sil.flat() : [])]
    let best: Pt | null = null, bd = 0.42
    for (const a of mine)
      for (const b of targets) {
        const d = Math.hypot(a[0] - b[0], a[1] - b[1])
        if (d < bd) { bd = d; best = [b[0] - a[0], b[1] - a[1]] }
      }
    let { x, y } = p
    if (best) { x += best[0]; y += best[1] }
    x = Math.min(WORLD.w - 0.3, Math.max(0.3, x))
    y = Math.min(WORLD.h - 0.3, Math.max(0.3, y))
    return { ...p, x: Math.round(x * 1e4) / 1e4, y: Math.round(y * 1e4) / 1e4 }
  }

  const angle = () => {
    const [a, b] = [...ptrs.current.values()]
    return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI
  }

  const onDown = (e: React.PointerEvent) => {
    if (locked) return
    svg.current!.setPointerCapture(e.pointerId)
    ptrs.current.set(e.pointerId, [e.clientX, e.clientY])
    const S = st.current
    if (ptrs.current.size === 2 && S.id) {
      const p = value.pieces.find((q) => q.id === S.id)!
      S.rot = { a0: angle(), base: p.r * 45 }
      S.moved = true
      setLive({ id: p.id, ang: p.r * 45 })
      return
    }
    if (ptrs.current.size > 1) return
    const el = (e.target as Element).closest('[data-piece]')
    if (!el) {
      st.current = { id: null, off: [0, 0], moved: false, wasSel: false, start: [e.clientX, e.clientY] }
      if (value.sel) onChange({ ...value, sel: null })
      return
    }
    const id = el.getAttribute('data-piece') as PieceId
    const p = value.pieces.find((q) => q.id === id)!
    const w = toWorld(e.clientX, e.clientY)
    st.current = { id, off: [p.x - w[0], p.y - w[1]], moved: false, wasSel: value.sel === id, start: [e.clientX, e.clientY] }
    // öne getir + seç
    onChange({ ...value, sel: id, pieces: [...value.pieces.filter((q) => q.id !== id), p] })
  }
  const onMove = (e: React.PointerEvent) => {
    if (!ptrs.current.has(e.pointerId)) return
    ptrs.current.set(e.pointerId, [e.clientX, e.clientY])
    const S = st.current
    if (!S.id) return
    if (S.rot && ptrs.current.size >= 2) {
      let d = angle() - S.rot.a0
      if (d > 180) d -= 360
      if (d < -180) d += 360
      setLive({ id: S.id, ang: S.rot.base + d })
      return
    }
    if (!S.moved && Math.hypot(e.clientX - S.start[0], e.clientY - S.start[1]) < 6) return
    S.moved = true
    const w = toWorld(e.clientX, e.clientY)
    setPiece(S.id, { x: w[0] + S.off[0], y: w[1] + S.off[1] })
  }
  const onUp = (e: React.PointerEvent) => {
    if (!ptrs.current.has(e.pointerId)) return
    ptrs.current.delete(e.pointerId)
    const S = st.current
    if (!S.id) return
    const p = value.pieces.find((q) => q.id === S.id)
    if (!p) return
    if (S.rot) {
      if (ptrs.current.size > 0) return // diğer parmak kalkınca bitir
      const ang = live?.ang ?? p.r * 45
      const r = (((Math.round(ang / 45) % 8) + 8) % 8)
      setLive(null)
      setPiece(p.id, settle({ ...p, r }))
      st.current = { id: null, off: [0, 0], moved: false, wasSel: false, start: [0, 0] }
      return
    }
    if (!S.moved) {
      // seçili parçaya dokunuş → 45° döndür
      if (S.wasSel) setPiece(p.id, settle({ ...p, r: (p.r + 1) % 8 }))
    } else setPiece(p.id, settle(p))
    st.current = { id: null, off: [0, 0], moved: false, wasSel: false, start: [0, 0] }
  }

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
      className="block w-full select-none rounded-2xl bg-[#fbf7f6] ring-1 ring-line"
      style={{ touchAction: 'none' }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      role="img"
      aria-label="Tangram tahtası"
    >
      <defs>
        <pattern id="tg-dots" width={0.5} height={0.5} patternUnits="userSpaceOnUse">
          <circle cx={0.25} cy={0.25} r={0.025} fill="#d9dbe8" />
        </pattern>
        <linearGradient id="tg-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.28} />
          <stop offset="0.6" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={WORLD.w} height={WORLD.h} fill="url(#tg-dots)" />
      {value.puzzle && (
        <g>
          <rect x={0.15} y={TRAY_Y} width={WORLD.w - 0.3} height={WORLD.h - TRAY_Y - 0.15} rx={0.35} fill="#fff" stroke="#e7e8f2" strokeWidth={0.03} />
          <text x={0.4} y={TRAY_Y + 0.45} fontSize={0.32} fontWeight={800} fill="#8a8fb0">PARÇALAR</text>
        </g>
      )}
      {sil && (
        <g>
          {sil.map((poly, i) => (
            <polygon key={i} points={poly.map((q) => q.join(',')).join(' ')} fill="#3d4270" stroke="#3d4270" strokeWidth={0.03} strokeLinejoin="round" />
          ))}
        </g>
      )}
      {value.pieces.map((p) => (
        <PieceShape key={p.id} p={p} ang={live?.id === p.id ? live.ang : undefined} selected={value.sel === p.id} areas={value.areas} />
      ))}
    </svg>
  )
}

const MiniPiece = ({ id }: { id: PieceId }) => {
  const poly = LOCAL[KIND[id]]
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1])
  const minX = Math.min(...xs), minY = Math.min(...ys), w = Math.max(...xs) - minX, hh = Math.max(...ys) - minY
  return (
    <svg viewBox={`${minX - 0.1} ${minY - 0.1} ${w + 0.2} ${hh + 0.2}`} className="h-7 w-auto" aria-hidden>
      <polygon points={poly.map((q) => q.join(',')).join(' ')} fill={COLOR[id][0]} stroke={COLOR[id][1]} strokeWidth={0.06} strokeLinejoin="round" />
    </svg>
  )
}

export const tangram: ToolDef<V> = {
  id: 'tangram',
  defaultConfig: {},
  initial: (_c, t) => {
    const pz = PUZZLES.find((q) => q.id === t?.puzzle)
    if (pz) return { puzzle: pz.id, pieces: trayPieces(pz.pieces), areas: false, sel: null }
    return { puzzle: null, pieces: squarePieces(), areas: true, sel: null }
  },
  check: (v, t) => {
    const id = typeof t.puzzle === 'string' ? t.puzzle : v.puzzle
    if (!id || !SIL[id]) return false
    return solved(SIL[id], v.pieces.map((p) => worldPoly(p)))
  },
  Component: ({ value, onChange, target, locked }) => {
    const task = !!target
    const sel = value.pieces.find((p) => p.id === value.sel)
    const pz = PUZZLES.find((q) => q.id === value.puzzle)
    const cov = useMemo(() => (value.puzzle ? coverage(SIL[value.puzzle], value.pieces.map((p) => worldPoly(p))) : null), [value.puzzle, value.pieces])
    const done = !!value.puzzle && solved(SIL[value.puzzle], value.pieces.map((p) => worldPoly(p)))
    const totalArea = value.pieces.reduce((s, p) => s + AREA[KIND[p.id]], 0)
    const turn = (d: number) => sel && onChange({ ...value, pieces: value.pieces.map((p) => (p.id === sel.id ? { ...p, r: (p.r + d + 8) % 8 } : p)) })
    const load = (id: string | null) => {
      const q = PUZZLES.find((x) => x.id === id)
      onChange(q ? { ...value, puzzle: q.id, pieces: trayPieces(q.pieces), sel: null } : { ...value, puzzle: null, pieces: squarePieces(), sel: null })
    }
    const groups = [...new Set(PUZZLES.map((p) => p.group))]
    return (
      <div className="flex flex-col items-center gap-3">
        {!task && (
          <div className="flex w-full max-w-3xl flex-col gap-1.5">
            <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:justify-center">
              <ToolButton active={!value.puzzle} onClick={() => load(null)}><Sparkles size={15} /> Serbest</ToolButton>
              {groups.map((g) => (
                <div key={g} className="flex shrink-0 items-center gap-1 rounded-2xl bg-paper p-1 ring-1 ring-line">
                  <span className="px-1.5 text-[11px] font-black whitespace-nowrap text-ink-soft uppercase">{g}</span>
                  {PUZZLES.filter((p) => p.group === g).map((p) => <ToolButton key={p.id} active={value.puzzle === p.id} onClick={() => load(p.id)}>{p.name}</ToolButton>)}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="w-full max-w-[640px]">
          <Board value={value} onChange={onChange} locked={locked} />
        </div>
        {!locked && (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <ToolButton disabled={!sel} onClick={() => turn(-1)}><RotateCcw size={16} /> 45°</ToolButton>
            <ToolButton disabled={!sel} onClick={() => turn(1)}><RotateCw size={16} /> 45°</ToolButton>
            <ToolButton disabled={sel?.id !== 'P'} onClick={() => sel && onChange({ ...value, pieces: value.pieces.map((p) => (p.id === 'P' ? { ...p, f: !p.f } : p)) })}><FlipHorizontal2 size={16} /> Paralelkenarı çevir</ToolButton>
            <ToolButton active={value.areas} onClick={() => onChange({ ...value, areas: !value.areas })}>Alanlar</ToolButton>
            {!task && !value.puzzle && <ToolButton onClick={() => onChange({ ...value, pieces: trayPieces(ALL).map((p) => ({ ...p, y: p.y - 1.2 })), sel: null })}><Shuffle size={16} /> Dağıt</ToolButton>}
          </div>
        )}
        {!locked && <p className="max-w-xl text-center text-sm font-bold text-ink-soft">Parçayı sürükle. Tutarken ikinci parmakla çevirerek döndür ya da seçili parçaya bir kez daha dokun (45°).</p>}
        {(!task || locked) && (
          <div className="w-full max-w-3xl space-y-2">
            {value.puzzle && cov && !task && (
              <div className={`rounded-2xl px-4 py-2.5 text-center font-extrabold ${done ? 'bg-ok-soft text-ok' : 'bg-paper text-ink'} ring-1 ring-line`}>
                {done ? (
                  <span>Tamamlandı! Bu {pz?.name.toLocaleLowerCase('tr-TR')} {totalArea} küçük üçgen alanında. {totalArea === 16 && 'Kare de, kedi de, kayık da 16 birim: şekil değişti, alan değişmedi.'}</span>
                ) : (
                  <span>Siluetin <b>%{Math.round(cov.ratio * 100)}</b>{poss(Math.round(cov.ratio * 100))} kaplandı · siluetin alanı = {pz?.pieces.reduce((s, id) => s + AREA[KIND[id]], 0)} küçük üçgen</span>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl bg-ink px-4 py-3 text-white">
              <span className="text-xs font-extrabold tracking-wide text-white/60 uppercase">Küçük üçgen = 1 birim</span>
              {(['S1', 'Q', 'P', 'M', 'L1'] as PieceId[]).map((id) => (
                <span key={id} className={`flex items-center gap-1.5 rounded-xl px-1.5 py-0.5 font-black ${sel && KIND[sel.id] === KIND[id] ? 'bg-white/15' : ''}`}>
                  <MiniPiece id={id} /> {NAME[KIND[id]]} = {AREA[KIND[id]]}
                </span>
              ))}
              {sel && (
                <span className="w-full text-center text-sm font-bold text-white/80">
                  Seçili: {NAME[KIND[sel.id]]} → {AREA[KIND[sel.id]]} küçük üçgen kaplar
                  {KIND[sel.id] === 'L' ? ' (= 2 orta üçgen = kare + 2 küçük üçgen)' : KIND[sel.id] === 'Q' || KIND[sel.id] === 'P' || KIND[sel.id] === 'M' ? ' (= 2 küçük üçgen)' : ''}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    )
  },
}

/** Test/rapor için siluet verisi */
export const tangramPuzzles = { PUZZLES, SIL }
