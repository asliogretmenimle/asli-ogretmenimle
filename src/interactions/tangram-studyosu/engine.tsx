import { useRef, useState } from 'react'
import { tangramPuzzles } from '../../manipulatives/new/tangram'

/**
 * Tangram motoru (Tangram manipülatifiyle aynı dünya ve parçalar; siluetleri paylaşır).
 * Küçük üçgen = 1 birim: büyük üçgen 4, orta üçgen 2, kare 2, paralelkenar 2 → toplam 16.
 *  - Sürükle: taşı (bırakınca köşe köşeye yapışır)
 *  - Tutarken ikinci parmakla çevir: döndür (45°’lik adımlar)
 *  - Seçili parçaya dokun: 45° döndür
 */

export type Pt = [number, number]
export type Kind = 'L' | 'M' | 'S' | 'Q' | 'P'
export type PieceId = 'L1' | 'L2' | 'M' | 'S1' | 'S2' | 'Q' | 'P'
export type Piece = { id: PieceId; x: number; y: number; r: number; f: boolean }

export const WORLD = { w: 12, h: 12.3 }
export const TRAY_Y = 7.35
export const KIND: Record<PieceId, Kind> = { L1: 'L', L2: 'L', M: 'M', S1: 'S', S2: 'S', Q: 'Q', P: 'P' }
export const AREA: Record<Kind, number> = { L: 4, M: 2, S: 1, Q: 2, P: 2 }
export const NAME: Record<Kind, string> = { L: 'büyük üçgen', M: 'orta üçgen', S: 'küçük üçgen', Q: 'kare', P: 'paralelkenar' }
export const COLOR: Record<PieceId, [string, string]> = {
  L1: ['#f43f5e', '#be123c'],
  L2: ['#3b82f6', '#1d4ed8'],
  M: ['#f59e0b', '#b45309'],
  S1: ['#10b981', '#047857'],
  S2: ['#8b5cf6', '#6d28d9'],
  Q: ['#facc15', '#a16207'],
  P: ['#06b6d4', '#0e7490'],
}
export const ALL: PieceId[] = ['L1', 'L2', 'M', 'S1', 'S2', 'Q', 'P']

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

export function worldPoly(p: Piece, angDeg?: number): Pt[] {
  const a = ((angDeg ?? p.r * 45) * Math.PI) / 180
  const c = Math.cos(a), s = Math.sin(a)
  return LOCAL[KIND[p.id]].map(([x0, y]) => {
    const x = p.f ? -x0 : x0
    return [p.x + x * c - y * s, p.y + x * s + y * c]
  })
}

/** Siluetler: manipülatifin bulmacaları + kendi “büyük üçgeni kapla” siluetimiz */
const center = (sol: Pt[][]): Pt[][] => {
  const all = sol.flat()
  const minX = Math.min(...all.map((p) => p[0])), maxX = Math.max(...all.map((p) => p[0]))
  const minY = Math.min(...all.map((p) => p[1])), maxY = Math.max(...all.map((p) => p[1]))
  const dx = WORLD.w / 2 - (minX + maxX) / 2, dy = TRAY_Y / 2 - (minY + maxY) / 2
  return sol.map((poly) => poly.map(([x, y]) => [x + dx, y + dy] as Pt))
}
export const SIL: Record<string, Pt[][]> = {
  ...(tangramPuzzles.SIL as Record<string, Pt[][]>),
  buyukucgen: center([[[0, 0], [4, 0], [2, 2]]]),
}

const TRAY: Record<PieceId, Piece> = {
  L1: { id: 'L1', x: 2.4, y: 8.27, r: 0, f: false },
  L2: { id: 'L2', x: 6.8, y: 8.27, r: 0, f: false },
  Q: { id: 'Q', x: 10.2, y: 8.6, r: 0, f: false },
  M: { id: 'M', x: 1.733, y: 11.333, r: 0, f: false },
  P: { id: 'P', x: 4.3, y: 10.6, r: 0, f: false },
  S1: { id: 'S1', x: 7.2, y: 11, r: 0, f: false },
  S2: { id: 'S2', x: 9, y: 11, r: 0, f: false },
}
/** Az parçalı görevlerde parçalar tepsinin ortasına dizilir (görünüm de yakınlaşır) */
export const trayPieces = (ids: PieceId[]): Piece[] =>
  ids.length <= 3 ? ids.map((id, i) => ({ ...TRAY[id], x: 6 + (i - (ids.length - 1) / 2) * 2.4, y: 9.3 })) : ids.map((id) => ({ ...TRAY[id] }))
/** Az parçalı görevler için yakın görünüm */
export const viewFor = (n: number): [number, number, number, number] => (n <= 3 ? [1.5, 1.4, 9, 9.4] : [0, 0, WORLD.w, WORLD.h])

function inPoly([x, y]: Pt, poly: Pt[]) {
  let ins = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins
  }
  return ins
}

/** Kaplama oranı ve taşma/üst üste binme */
export function coverage(sil: Pt[][], pieces: Piece[]) {
  const polys = pieces.map((p) => worldPoly(p))
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
  const ratio = inside ? good / inside : 0
  return { ratio, bad, inside, solved: ratio > 0.985 && bad <= inside * 0.015 }
}

/** Siluetin içinde (merkezi siluette) olan parçalar */
export const piecesIn = (sil: Pt[][], pieces: Piece[]) => pieces.filter((p) => sil.some((q) => inPoly([p.x, p.y], q)))

/** Tasarım alanındaki (tepsinin üstündeki) parçalar */
export const placed = (pieces: Piece[]) => pieces.filter((p) => p.y < TRAY_Y - 0.1)

function PieceShape({ p, ang, selected, areas, dim }: { p: Piece; ang?: number; selected: boolean; areas: boolean; dim?: boolean }) {
  const poly = worldPoly(p, ang)
  const [fill, stroke] = COLOR[p.id]
  const pts = poly.map((q) => q.join(',')).join(' ')
  const kind = KIND[p.id]
  return (
    <g data-piece={p.id} style={{ cursor: 'grab' }} opacity={dim ? 0.9 : 1}>
      {selected && <polygon points={pts} fill="none" stroke="#1f2340" strokeWidth={0.2} strokeLinejoin="round" opacity={0.25} />}
      <polygon points={pts} fill={fill} stroke={selected ? '#fff' : stroke} strokeWidth={selected ? 0.08 : 0.045} strokeLinejoin="round" />
      <polygon points={pts} fill="url(#ts-shine)" pointerEvents="none" />
      {areas && (
        <text x={p.x} y={p.y + 0.2} textAnchor="middle" fontSize={kind === 'S' ? 0.5 : 0.62} fontWeight={900} fill="#fff" stroke={stroke} strokeWidth={0.06} paintOrder="stroke" pointerEvents="none">
          {AREA[kind]}
        </text>
      )}
    </g>
  )
}

export interface BoardState {
  pieces: Piece[]
  sel: PieceId | null
}

export function Board({ value, onChange, sil, areas, locked, solvedGlow, trayLabel = 'PARÇALAR', designLabel, view = [0, 0, WORLD.w, WORLD.h] }: { value: BoardState; onChange: (v: BoardState) => void; sil?: Pt[][] | null; areas: boolean; locked?: boolean; solvedGlow?: boolean; trayLabel?: string; designLabel?: string; view?: [number, number, number, number] }) {
  const svg = useRef<SVGSVGElement>(null)
  const [live, setLive] = useState<{ id: PieceId; ang: number } | null>(null)
  const ptrs = useRef(new Map<number, Pt>())
  const st = useRef<{ id: PieceId | null; off: Pt; moved: boolean; rot?: { a0: number; base: number }; wasSel: boolean; start: Pt }>({ id: null, off: [0, 0], moved: false, wasSel: false, start: [0, 0] })

  const toW = (cx: number, cy: number): Pt => {
    const s = svg.current
    if (!s) return [0, 0]
    const r = s.getBoundingClientRect()
    return [view[0] + ((cx - r.left) / r.width) * view[2], view[1] + ((cy - r.top) / r.height) * view[3]]
  }
  const setPiece = (id: PieceId, patch: Partial<Piece>, sel?: PieceId | null) =>
    onChange({ sel: sel === undefined ? value.sel : sel, pieces: value.pieces.map((p) => (p.id === id ? { ...p, ...patch } : p)) })

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
    x = Math.min(view[0] + view[2] - 0.3, Math.max(view[0] + 0.3, x))
    y = Math.min(view[1] + view[3] - 0.3, Math.max(view[1] + 0.3, y))
    return { ...p, x: Math.round(x * 1e4) / 1e4, y: Math.round(y * 1e4) / 1e4 }
  }
  const angle = () => {
    const [a, b] = [...ptrs.current.values()]
    return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI
  }
  const reset = () => (st.current = { id: null, off: [0, 0], moved: false, wasSel: false, start: [0, 0] })

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
      reset()
      if (value.sel) onChange({ ...value, sel: null })
      return
    }
    const id = el.getAttribute('data-piece') as PieceId
    const p = value.pieces.find((q) => q.id === id)!
    const w = toW(e.clientX, e.clientY)
    st.current = { id, off: [p.x - w[0], p.y - w[1]], moved: false, wasSel: value.sel === id, start: [e.clientX, e.clientY] }
    onChange({ sel: id, pieces: [...value.pieces.filter((q) => q.id !== id), p] })
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
    const w = toW(e.clientX, e.clientY)
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
      if (ptrs.current.size > 0) return
      const ang = live?.ang ?? p.r * 45
      const r = ((Math.round(ang / 45) % 8) + 8) % 8
      setLive(null)
      setPiece(p.id, settle({ ...p, r }))
      reset()
      return
    }
    if (!S.moved) {
      if (S.wasSel) setPiece(p.id, settle({ ...p, r: (p.r + 1) % 8 }))
    } else setPiece(p.id, settle(p))
    reset()
  }

  return (
    <svg
      ref={svg}
      viewBox={view.join(' ')}
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
        <pattern id="ts-dots" width={0.5} height={0.5} patternUnits="userSpaceOnUse">
          <circle cx={0.25} cy={0.25} r={0.025} fill="#d9dbe8" />
        </pattern>
        <linearGradient id="ts-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.3} />
          <stop offset="0.6" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect x={view[0]} y={view[1]} width={view[2]} height={view[3]} fill="url(#ts-dots)" />
      <rect x={view[0] + 0.15} y={TRAY_Y} width={view[2] - 0.3} height={view[1] + view[3] - TRAY_Y - 0.15} rx={0.35} fill="#fff" stroke="#e7e8f2" strokeWidth={0.03} />
      <text x={view[0] + 0.4} y={TRAY_Y + 0.45} fontSize={0.32} fontWeight={800} fill="#8a8fb0">{trayLabel}</text>
      {designLabel && <text x={0.4} y={0.55} fontSize={0.32} fontWeight={800} fill="#8a8fb0">{designLabel}</text>}
      {sil && (
        <g>
          {sil.map((poly, i) => (
            <polygon key={i} points={poly.map((q) => q.join(',')).join(' ')} fill={solvedGlow ? '#16a34a' : '#3d4270'} stroke={solvedGlow ? '#16a34a' : '#3d4270'} strokeWidth={solvedGlow ? 0.25 : 0.03} strokeLinejoin="round" />
          ))}
        </g>
      )}
      {value.pieces.map((p) => (
        <PieceShape key={p.id} p={p} ang={live?.id === p.id ? live.ang : undefined} selected={value.sel === p.id} areas={areas} />
      ))}
    </svg>
  )
}

/** Küçük önizleme: tasarım galerisi için */
export function Thumb({ pieces, size = 72 }: { pieces: Piece[]; size?: number }) {
  if (!pieces.length) return null
  const polys = pieces.map((p) => worldPoly(p))
  const all = polys.flat()
  const x0 = Math.min(...all.map((p) => p[0])), x1 = Math.max(...all.map((p) => p[0]))
  const y0 = Math.min(...all.map((p) => p[1])), y1 = Math.max(...all.map((p) => p[1]))
  const m = Math.max(x1 - x0, y1 - y0)
  return (
    <svg viewBox={`${(x0 + x1) / 2 - m / 2 - 0.2} ${(y0 + y1) / 2 - m / 2 - 0.2} ${m + 0.4} ${m + 0.4}`} width={size} height={size} aria-hidden>
      {polys.map((poly, i) => <polygon key={i} points={poly.map((q) => q.join(',')).join(' ')} fill={COLOR[pieces[i].id][0]} stroke={COLOR[pieces[i].id][1]} strokeWidth={m * 0.012} strokeLinejoin="round" />)}
    </svg>
  )
}

export function MiniPiece({ id, h = 28 }: { id: PieceId; h?: number }) {
  const poly = LOCAL[KIND[id]]
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1])
  const minX = Math.min(...xs), minY = Math.min(...ys), w = Math.max(...xs) - minX, hh = Math.max(...ys) - minY
  return (
    <svg viewBox={`${minX - 0.1} ${minY - 0.1} ${w + 0.2} ${hh + 0.2}`} style={{ height: h, width: 'auto' }} aria-hidden>
      <polygon points={poly.map((q) => q.join(',')).join(' ')} fill={COLOR[id][0]} stroke={COLOR[id][1]} strokeWidth={0.06} strokeLinejoin="round" />
    </svg>
  )
}

/** Üst üste binen alan (küçük üçgen biriminde, yaklaşık) */
export function overlap(pieces: Piece[]) {
  if (pieces.length < 2) return 0
  const polys = pieces.map((p) => worldPoly(p))
  const all = polys.flat()
  const minX = Math.min(...all.map((p) => p[0])), maxX = Math.max(...all.map((p) => p[0]))
  const minY = Math.min(...all.map((p) => p[1])), maxY = Math.max(...all.map((p) => p[1]))
  const st = 0.1
  let n = 0
  for (let x = minX + 0.031; x < maxX; x += st)
    for (let y = minY + 0.047; y < maxY; y += st) {
      let c = 0
      for (const q of polys) if (inPoly([x, y], q)) c++
      if (c > 1) n++
    }
  return n * st * st
}
