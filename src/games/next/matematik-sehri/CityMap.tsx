import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { useGesture } from '@use-gesture/react'
import { usePlane } from '../../../interactive/Plane'
import { clamp } from '../../../interactive/axis'
import { ArtFor, Fence, Garden, Houses, Lake, School, Tree, type Box } from './art'
import { GOAL, HOUSES, LAKE, MAP_H, MAP_W, SCHOOL, START, inMap, key, same, type Art, type Built, type Cell, type Rect } from './city'
import type { Show } from './missions'

export interface RoadEdit {
  path: Cell[]
  onChange: (p: Cell[]) => void
  blocked: Set<string>
  numbers: boolean
  locked: boolean
}
export interface PieceSpec {
  r: Rect
  onChange: (r: Rect) => void
  art: Art
  ok: boolean
  show: Show[]
  fence: boolean
  label?: string
}
export interface FenceSpec {
  r: Rect
  art: Art
  sides: boolean[]
  onSide: (i: number) => void
}
export interface FocusSpec {
  r: Rect
  art: Art
  fence: boolean
  show: Show[]
}
export interface CountSpec {
  cells: Cell[]
  reveal: boolean
  counted: Map<string, number>
  onCell: (c: Cell) => void
  onRow: (y: number) => void
  done: boolean
}

/** Doğal olay yayılımını durdurur: düzlemin kaydırma/yakınlaştırması nesneye dokunulunca çalışmaz */
function useStopNative(ref: RefObject<Element>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const stop = (e: Event) => e.stopPropagation()
    el.addEventListener('pointerdown', stop)
    el.addEventListener('dblclick', stop)
    return () => {
      el.removeEventListener('pointerdown', stop)
      el.removeEventListener('dblclick', stop)
    }
  }, [ref])
}

function useXY() {
  const P = usePlane()
  const u = P.unitPx
  const X = P.sx, Y = P.sy
  const box = (r: Rect): Box => ({ x: X(r.x), y: Y(r.y + r.h), w: r.w * u, h: r.h * u })
  return { P, u, X, Y, box }
}

function Pill({ x, y, text, anchor = 'middle', tone = 'ink' }: { x: number; y: number; text: string; anchor?: 'start' | 'middle' | 'end'; tone?: 'ink' | 'blue' | 'amber' }) {
  const w = text.length * 7.4 + 14
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x
  const bg = tone === 'blue' ? '#1d4ed8' : tone === 'amber' ? '#b45309' : '#1f2340'
  return (
    <g pointerEvents="none">
      <rect x={x0} y={y - 11} width={w} height={22} rx={11} fill={bg} opacity={0.92} />
      <text x={x0 + w / 2} y={y + 4.5} textAnchor="middle" fontSize={13} fontWeight={900} fill="#fff">{text}</text>
    </g>
  )
}

/** İçinde birim kareler */
function GridIn({ b, u, color = '#ffffff', opacity = 0.8 }: { b: Box; u: number; color?: string; opacity?: number }) {
  const w = Math.round(b.w / u), h = Math.round(b.h / u)
  return (
    <g pointerEvents="none" stroke={color} strokeOpacity={opacity} strokeWidth={1.6}>
      {Array.from({ length: w - 1 }, (_, i) => <line key={`v${i}`} x1={b.x + (i + 1) * u} x2={b.x + (i + 1) * u} y1={b.y} y2={b.y + b.h} />)}
      {Array.from({ length: h - 1 }, (_, i) => <line key={`h${i}`} y1={b.y + (i + 1) * u} y2={b.y + (i + 1) * u} x1={b.x} x2={b.x + b.w} />)}
    </g>
  )
}

function SideLabels({ r, b, tone = 'ink' }: { r: Rect; b: Box; tone?: 'ink' | 'blue' }) {
  const leftSide = r.x >= 2
  return (
    <>
      <Pill x={b.x + b.w / 2} y={b.y + b.h + 15} text={`${r.w} m`} tone={tone} />
      <Pill x={leftSide ? b.x - 6 : b.x + b.w + 6} y={b.y + b.h / 2} text={`${r.h} m`} anchor={leftSide ? 'end' : 'start'} tone={tone} />
    </>
  )
}

function RowNumbers({ r, b, u }: { r: Rect; b: Box; u: number }) {
  const fs = Math.max(10, Math.min(13, u * 0.38))
  return (
    <g pointerEvents="none" fontSize={fs} fontWeight={900} textAnchor="middle">
      {Array.from({ length: r.w }, (_, i) => <text key={`c${i}`} x={b.x + (i + 0.5) * u} y={b.y - 16} fill="#1d4ed8" stroke="#fff" strokeWidth={3} paintOrder="stroke">{i + 1}</text>)}
      {Array.from({ length: r.h }, (_, j) => <text key={`r${j}`} x={b.x - 18} y={b.y + (j + 0.5) * u + fs * 0.35} fill="#b45309" stroke="#fff" strokeWidth={3} paintOrder="stroke">{j + 1}</text>)}
    </g>
  )
}

// ── Yol ───────────────────────────────────────────────────────────

function RoadPath({ path, numbers }: { path: Cell[]; numbers?: boolean }) {
  const { u, X, Y } = useXY()
  if (!path.length) return null
  const pts = path.map((c) => `${X(c[0] + 0.5)},${Y(c[1] + 0.5)}`).join(' ')
  const fs = Math.max(9, Math.min(13, u * 0.36))
  return (
    <g pointerEvents="none">
      {path.length === 1 ? (
        <rect x={X(path[0][0]) + u * 0.06} y={Y(path[0][1] + 1) + u * 0.06} width={u * 0.88} height={u * 0.88} rx={u * 0.12} fill="#5b6475" />
      ) : (
        <>
          <polyline points={pts} fill="none" stroke="#3f4655" strokeWidth={u * 0.9} strokeLinejoin="round" strokeLinecap="square" />
          <polyline points={pts} fill="none" stroke="#6b7385" strokeWidth={u * 0.76} strokeLinejoin="round" strokeLinecap="square" />
          <polyline points={pts} fill="none" stroke="#fde68a" strokeWidth={Math.max(1.4, u * 0.06)} strokeDasharray={`${u * 0.22} ${u * 0.2}`} strokeLinejoin="round" />
        </>
      )}
      {numbers &&
        path.slice(1).map((c, i) => (
          <g key={key(c)}>
            <circle cx={X(c[0] + 0.5)} cy={Y(c[1] + 0.5)} r={Math.max(8, u * 0.26)} fill="#fff" stroke="#3f4655" strokeWidth={1.2} />
            <text x={X(c[0] + 0.5)} y={Y(c[1] + 0.5) + fs * 0.36} textAnchor="middle" fontSize={fs} fontWeight={900} fill="#1f2340">{i + 1}</text>
          </g>
        ))}
    </g>
  )
}

function RoadEditor({ e }: { e: RoadEdit }) {
  const { P, u, X, Y } = useXY()
  const ref = useRef<SVGGElement>(null)
  useStopNative(ref)
  const pathRef = useRef(e.path)
  pathRef.current = e.path
  const head = e.path[e.path.length - 1]
  const atGoal = same(head, GOAL)
  const canEnter = (n: Cell, cur: Cell[]) => inMap(n) && !e.blocked.has(key(n)) && !cur.some((c) => same(c, n))

  useGesture(
    {
      onDrag: ({ xy: [cx, cy], tap, event }) => {
        event.stopPropagation()
        if (tap || e.locked) return
        const p = P.fromClient(cx, cy)
        const target: Cell = [Math.floor(p.x), Math.floor(p.y)]
        let cur = pathRef.current.slice()
        const idx = cur.findIndex((c) => same(c, target))
        if (idx >= 0) cur = cur.slice(0, idx + 1)
        else
          for (let i = 0; i < 40; i++) {
            const h = cur[cur.length - 1]
            if (same(h, target) || same(h, GOAL)) break
            const dx = Math.sign(target[0] - h[0]), dy = Math.sign(target[1] - h[1])
            const xs: Cell = [h[0] + dx, h[1]], ys: Cell = [h[0], h[1] + dy]
            const opts = Math.abs(target[0] - h[0]) >= Math.abs(target[1] - h[1]) ? [xs, ys] : [ys, xs]
            const n = opts.find((o) => !same(o, h) && canEnter(o, cur))
            if (!n) break
            cur.push(n)
          }
        if (cur.length !== pathRef.current.length || !same(cur[cur.length - 1], pathRef.current[pathRef.current.length - 1])) e.onChange(cur)
      },
    },
    { target: ref, eventOptions: { passive: false }, drag: { filterTaps: true } },
  )

  const next = atGoal || e.locked ? [] : ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).map(([dx, dy]) => [head[0] + dx, head[1] + dy] as Cell).filter((n) => canEnter(n, e.path))
  return (
    <g>
      <RoadPath path={e.path} numbers={e.numbers} />
      {/* okul kapısı */}
      {!atGoal && (
        <g pointerEvents="none">
          <rect x={X(GOAL[0]) + 3} y={Y(GOAL[1] + 1) + 3} width={u - 6} height={u - 6} rx={u * 0.15} fill="rgba(255,255,255,.55)" stroke="#16a34a" strokeWidth={2.5} strokeDasharray="5 4" />
          <text x={X(GOAL[0] + 0.5)} y={Y(GOAL[1] + 0.5) + u * 0.17} textAnchor="middle" fontSize={u * 0.48}>🏁</text>
        </g>
      )}
      {next.map((n) => (
        <circle key={key(n)} cx={X(n[0] + 0.5)} cy={Y(n[1] + 0.5)} r={u * 0.16} fill="#fff" opacity={0.85} pointerEvents="none" className="ms-pulse" />
      ))}
      <g ref={ref} data-handle style={{ touchAction: 'none', cursor: e.locked ? 'default' : 'grab' }}>
        <rect x={X(head[0]) - u * 0.4} y={Y(head[1] + 1) - u * 0.4} width={u * 1.8} height={u * 1.8} fill="transparent" />
        <rect x={X(head[0]) + u * 0.04} y={Y(head[1] + 1) + u * 0.04} width={u * 0.92} height={u * 0.92} rx={u * 0.2} fill={atGoal ? '#16a34a' : '#f97316'} stroke="#fff" strokeWidth={3} />
        <text x={X(head[0] + 0.5)} y={Y(head[1] + 0.5) + u * 0.16} textAnchor="middle" fontSize={u * 0.46} pointerEvents="none">{atGoal ? '✓' : '🚜'}</text>
      </g>
    </g>
  )
}

// ── Tasarım parçası ───────────────────────────────────────────────

function Corner({ r, i, onChange }: { r: Rect; i: number; onChange: (r: Rect) => void }) {
  const { P, X, Y } = useXY()
  const ref = useRef<SVGGElement>(null)
  useStopNative(ref)
  const cur = useRef(r)
  cur.current = r
  const right = i === 1 || i === 2, top = i >= 2
  useGesture(
    {
      onDrag: ({ xy: [cx, cy], first, memo, event }) => {
        event.stopPropagation()
        const s: Rect = first || !memo ? cur.current : memo
        const ox = right ? s.x : s.x + s.w
        const oy = top ? s.y : s.y + s.h
        const p = P.fromClient(cx, cy)
        let gx = clamp(Math.round(p.x), 0, MAP_W), gy = clamp(Math.round(p.y), 0, MAP_H)
        if (gx === ox) gx = ox + (right ? 1 : -1)
        if (gy === oy) gy = oy + (top ? 1 : -1)
        let x0 = Math.min(gx, ox), x1 = Math.max(gx, ox), y0 = Math.min(gy, oy), y1 = Math.max(gy, oy)
        if (x0 < 0) { x0 = 0; x1 = Math.max(x1, 1) }
        if (x1 > MAP_W) { x1 = MAP_W; x0 = Math.min(x0, MAP_W - 1) }
        if (y0 < 0) { y0 = 0; y1 = Math.max(y1, 1) }
        if (y1 > MAP_H) { y1 = MAP_H; y0 = Math.min(y0, MAP_H - 1) }
        const n = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
        const c = cur.current
        if (n.x !== c.x || n.y !== c.y || n.w !== c.w || n.h !== c.h) onChange(n)
        return s
      },
    },
    { target: ref, eventOptions: { passive: false } },
  )
  // Tutamaçlar köşeden biraz dışarıda: küçük parçaların ortası sürüklenebilir kalsın
  const px = X(right ? r.x + r.w : r.x) + (right ? 5 : -5), py = Y(top ? r.y + r.h : r.y) + (top ? -5 : 5)
  return (
    <g ref={ref} data-handle style={{ touchAction: 'none', cursor: right === top ? 'nesw-resize' : 'nwse-resize' }}>
      <circle cx={px + (right ? 6 : -6)} cy={py + (top ? -6 : 6)} r={22} fill="transparent" />
      <circle cx={px} cy={py} r={12} fill="#fff" stroke="#2563eb" strokeWidth={3.5} style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.25))' }} />
      <circle cx={px} cy={py} r={4} fill="#2563eb" />
    </g>
  )
}

function Piece({ s }: { s: PieceSpec }) {
  const { P, u, box } = useXY()
  const ref = useRef<SVGGElement>(null)
  useStopNative(ref)
  const cur = useRef(s.r)
  cur.current = s.r
  type PM = { r: Rect; d0: number; a: number }
  useGesture(
    {
      onDrag: ({ movement: [mx, my], first, memo, pinching, event }) => {
        event.stopPropagation()
        if (pinching) return memo
        const st: Rect = first || !memo ? cur.current : memo
        const nx = clamp(st.x + Math.round(mx / P.unitPx), 0, MAP_W - st.w)
        const ny = clamp(st.y + Math.round(-my / P.unitPx), 0, MAP_H - st.h)
        if (nx !== cur.current.x || ny !== cur.current.y) s.onChange({ ...cur.current, x: nx, y: ny })
        return st
      },
      onPinch: ({ da: [d, a], first, memo, event }) => {
        event?.preventDefault?.()
        event?.stopPropagation?.()
        const m: PM = first || !memo ? { r: cur.current, d0: Math.max(1, d), a } : memo
        const f = d / m.d0
        const c2 = Math.cos((m.a * Math.PI) / 180) ** 2
        const fw = 1 + (f - 1) * Math.min(1, 2 * c2)
        const fh = 1 + (f - 1) * Math.min(1, 2 * (1 - c2))
        const w = clamp(Math.round(m.r.w * fw), 1, MAP_W), h = clamp(Math.round(m.r.h * fh), 1, MAP_H)
        const x = clamp(Math.round(m.r.x + m.r.w / 2 - w / 2), 0, MAP_W - w)
        const y = clamp(Math.round(m.r.y + m.r.h / 2 - h / 2), 0, MAP_H - h)
        const c = cur.current
        if (w !== c.w || h !== c.h || x !== c.x || y !== c.y) s.onChange({ x, y, w, h })
        return m
      },
    },
    { target: ref, eventOptions: { passive: false }, drag: { filterTaps: true } },
  )
  const r = s.r
  const b = box(r)
  const rows = s.show.includes('rows')
  const grid = rows || s.show.includes('grid') || s.show.includes('area')
  return (
    <g>
      <g ref={ref} data-handle style={{ touchAction: 'none', cursor: 'move' }} opacity={s.ok ? 1 : 0.92}>
        <ArtFor art={s.art} b={b} u={u} label={s.label} />
        {grid && <GridIn b={b} u={u} color={s.art === 'bina' ? '#475569' : '#ffffff'} opacity={s.art === 'bina' ? 0.45 : 0.8} />}
        {(s.fence || s.show.includes('posts')) && <Fence b={b} u={u} />}
        <rect x={b.x - 3} y={b.y - 3} width={b.w + 6} height={b.h + 6} rx={u * 0.25} fill={s.ok ? 'transparent' : 'rgba(239,68,68,.28)'} stroke={s.ok ? '#2563eb' : '#dc2626'} strokeWidth={3} strokeDasharray="8 5" className="ms-march" />
        {!s.ok && b.w > 40 && <text x={b.x + b.w / 2} y={b.y + b.h / 2 + 6} textAnchor="middle" fontSize={Math.min(18, u * 0.6)} fontWeight={900} fill="#b91c1c" pointerEvents="none">Buraya sığmıyor</text>}
      </g>
      {rows ? <RowNumbers r={r} b={b} u={u} /> : <SideLabels r={r} b={b} tone="blue" />}
      {[0, 1, 2, 3].map((i) => <Corner key={i} r={r} i={i} onChange={s.onChange} />)}
    </g>
  )
}

// ── Çit kurma ─────────────────────────────────────────────────────

function FenceBuild({ f }: { f: FenceSpec }) {
  const { u, box } = useXY()
  const b = box(f.r)
  const sides: [number, number, number, number][] = [
    [b.x, b.y + b.h, b.x + b.w, b.y + b.h],
    [b.x + b.w, b.y + b.h, b.x + b.w, b.y],
    [b.x + b.w, b.y, b.x, b.y],
    [b.x, b.y, b.x, b.y + b.h],
  ]
  const len = [f.r.w, f.r.h, f.r.w, f.r.h]
  return (
    <g>
      <ArtFor art={f.art} b={b} u={u} />
      <GridIn b={b} u={u} opacity={0.35} />
      <Fence b={b} u={u} sides={f.sides} />
      {sides.map(([x1, y1, x2, y2], i) => {
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
        const off = [[0, 16], [10, 0], [0, -16], [-10, 0]][i]
        return f.sides[i] ? (
          <Pill key={i} x={mx + off[0]} y={my + off[1]} text={`${len[i]} m`} anchor={i === 1 ? 'start' : i === 3 ? 'end' : 'middle'} tone="amber" />
        ) : (
          <g key={i} data-handle onClick={() => f.onSide(i)} style={{ cursor: 'pointer' }}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={34} />
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f59e0b" strokeWidth={5} strokeDasharray="6 6" strokeLinecap="round" className="ms-march" />
            <circle cx={mx} cy={my} r={13} fill="#f59e0b" stroke="#fff" strokeWidth={2.5} className="ms-pulse" />
            <text x={mx} y={my + 5} textAnchor="middle" fontSize={14} fontWeight={900} fill="#fff" pointerEvents="none">+</text>
          </g>
        )
      })}
    </g>
  )
}

function FocusItem({ f }: { f: FocusSpec }) {
  const { u, box } = useXY()
  const b = box(f.r)
  return (
    <g pointerEvents="none">
      <rect x={b.x - 6} y={b.y - 6} width={b.w + 12} height={b.h + 12} rx={u * 0.3} fill="none" stroke="#f59e0b" strokeWidth={3} strokeDasharray="8 6" className="ms-march" />
      <ArtFor art={f.art} b={b} u={u} />
      {f.show.includes('grid') && <GridIn b={b} u={u} />}
      {f.fence && <Fence b={b} u={u} />}
      <SideLabels r={f.r} b={b} />
    </g>
  )
}

// ── Alan sayma ────────────────────────────────────────────────────

function CountGarden({ c }: { c: CountSpec }) {
  const { u, X, Y } = useXY()
  const ys = [...new Set(c.cells.map((p) => p[1]))].sort((a, b) => b - a)
  const fs = Math.max(10, Math.min(15, u * 0.42))
  return (
    <g>
      <Garden cells={c.cells} u={u} X={X} Y={Y} grid={c.reveal} />
      {c.reveal &&
        c.cells.map((p) => {
          const k = key(p)
          const n = c.counted.get(k)
          return (
            <g key={k} data-handle onClick={() => !c.done && c.onCell(p)} style={{ cursor: 'pointer' }}>
              <rect x={X(p[0])} y={Y(p[1] + 1)} width={u} height={u} fill={n ? 'rgba(255,255,255,.55)' : 'transparent'} />
              {n !== undefined && (
                <text x={X(p[0] + 0.5)} y={Y(p[1] + 0.5) + fs * 0.36} textAnchor="middle" fontSize={fs} fontWeight={900} fill="#7c2d12" className="animate-pop" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>{n}</text>
              )}
            </g>
          )
        })}
      {c.reveal &&
        !c.done &&
        ys.map((y) => {
          const row = c.cells.filter((p) => p[1] === y)
          const minX = Math.min(...row.map((p) => p[0]))
          if (row.every((p) => c.counted.has(key(p))))
            return (
              <g key={y} pointerEvents="none">
                <rect x={X(minX - 1) + u * 0.1} y={Y(y + 1) + u * 0.1} width={u * 0.8} height={u * 0.8} rx={u * 0.22} fill="#b45309" />
                <text x={X(minX - 0.5)} y={Y(y + 0.5) + u * 0.15} textAnchor="middle" fontSize={u * 0.42} fontWeight={900} fill="#fff">{row.length}</text>
              </g>
            )
          return (
            <g key={y} data-handle onClick={() => c.onRow(y)} style={{ cursor: 'pointer' }}>
              <rect x={X(minX - 1) + u * 0.1} y={Y(y + 1) + u * 0.1} width={u * 0.8} height={u * 0.8} rx={u * 0.22} fill="#fff" stroke="#b45309" strokeWidth={2} />
              <text x={X(minX - 0.5)} y={Y(y + 0.5) + u * 0.15} textAnchor="middle" fontSize={u * 0.42} fontWeight={900} fill="#b45309" pointerEvents="none">→</text>
            </g>
          )
        })}
    </g>
  )
}

// ── Katman ────────────────────────────────────────────────────────

export function CityLayer({ road, built, roadEdit, piece, fence, focus, count, children }: { road: Cell[]; built: Built[]; roadEdit?: RoadEdit; piece?: PieceSpec; fence?: FenceSpec; focus?: FocusSpec; count?: CountSpec; children?: ReactNode }) {
  const { P, u, X, Y, box } = useXY()
  const ground = box({ x: 0, y: 0, w: MAP_W, h: MAP_H })
  const checker: Cell[] = []
  for (let x = 0; x < MAP_W; x++) for (let y = 0; y < MAP_H; y++) if ((x + y) % 2 === 0) checker.push([x, y])
  const hedge: [number, number][] = []
  for (let t = -0.5; t <= MAP_W + 0.5; t += 1.25) hedge.push([t, MAP_H + 0.62], [t, -0.62])
  for (let t = 0.6; t <= MAP_H - 0.6; t += 1.25) hedge.push([-0.62, t], [MAP_W + 0.62, t])
  return (
    <g>
      <defs>
        <linearGradient id="ms-lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
        <style>{`.ms-pulse{animation:msPulse 1.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes msPulse{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.08)}}.ms-march{animation:msMarch 1s linear infinite}@keyframes msMarch{to{stroke-dashoffset:-26}}@media (prefers-reduced-motion:reduce){.ms-pulse,.ms-march{animation:none}}`}</style>
      </defs>
      <rect x={0} y={0} width={P.width} height={P.height} fill="#86bf72" />
      {hedge.map(([hx, hy], i) => <Tree key={i} cx={X(hx)} cy={Y(hy)} u={u} s={0.9} tone={i} />)}
      <rect x={ground.x - 4} y={ground.y - 4} width={ground.w + 8} height={ground.h + 8} rx={10} fill="#d9c58f" />
      <rect x={ground.x} y={ground.y} width={ground.w} height={ground.h} rx={6} fill="#a6d889" />
      {checker.map(([x, y]) => <rect key={`${x},${y}`} x={X(x)} y={Y(y + 1)} width={u} height={u} fill="#b0dd94" />)}
      <g stroke="#ffffff" strokeOpacity={0.4} strokeWidth={1}>
        {Array.from({ length: MAP_W - 1 }, (_, i) => <line key={`v${i}`} x1={X(i + 1)} x2={X(i + 1)} y1={ground.y} y2={ground.y + ground.h} />)}
        {Array.from({ length: MAP_H - 1 }, (_, i) => <line key={`h${i}`} y1={Y(i + 1)} y2={Y(i + 1)} x1={ground.x} x2={ground.x + ground.w} />)}
      </g>
      <Lake b={box(LAKE)} u={u} />
      <Houses b={box(HOUSES)} u={u} />
      <School b={box(SCHOOL)} u={u} />
      <RoadPath path={road} />
      {road.length === 0 && !roadEdit && (
        <rect x={X(START[0]) + u * 0.06} y={Y(START[1] + 1) + u * 0.06} width={u * 0.88} height={u * 0.88} rx={u * 0.12} fill="#5b6475" />
      )}
      {built.map((bt) =>
        bt.cells ? (
          <Garden key={bt.id} cells={bt.cells} u={u} X={X} Y={Y} grid={false} />
        ) : (
          <g key={bt.id}>
            <ArtFor art={bt.art} b={box(bt.r)} u={u} label={bt.label} />
            {bt.fence && <Fence b={box(bt.r)} u={u} />}
          </g>
        ),
      )}
      {count && <CountGarden c={count} />}
      {focus && <FocusItem f={focus} />}
      {fence && <FenceBuild f={fence} />}
      {roadEdit && <RoadEditor e={roadEdit} />}
      {piece && <Piece s={piece} />}
      {children}
    </g>
  )
}

export const cellAt = (p: { x: number; y: number }): Cell => [Math.floor(p.x), Math.floor(p.y)]
export const inStart = (c: Cell) => same(c, START)
