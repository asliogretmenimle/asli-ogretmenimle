import { useRef, type ReactNode } from 'react'
import { useGesture } from '@use-gesture/react'

/**
 * Açı sahnesi: köşe (0,0), matematik yönü (saat yönünün tersi +). Işın uçlarını sürükle ya da ışını tutup çevir;
 * iki parmakla çevirerek etkin ışını döndür. Dünya birimi: ışın boyu 1.
 */

export const rad = (d: number) => (d * Math.PI) / 180
export const norm = (d: number) => ((d % 360) + 360) % 360
/** a’dan b’ye saat yönünün tersine açı (0..360) */
export const ccw = (a: number, b: number) => norm(b - a)
const P = (deg: number, r = 1): [number, number] => [Math.cos(rad(deg)) * r, -Math.sin(rad(deg)) * r]

export type Ray = { id: string; deg: number; color: string; draggable?: boolean; label?: string; len?: number; width?: number; dashed?: boolean; line?: boolean }
export type Arc = { from: number; to: number; color: string; r?: number; label?: string; fill?: boolean }

export function arcPath(from: number, to: number, r: number) {
  const sweep = ccw(from, to)
  const [x1, y1] = P(from, r), [x2, y2] = P(from + sweep, r)
  const large = sweep > 180 ? 1 : 0
  return { d: `M0,0 L${x1},${y1} A${r},${r} 0 ${large} 0 ${x2},${y2} Z`, stroke: `M${x1},${y1} A${r},${r} 0 ${large} 0 ${x2},${y2}`, mid: from + sweep / 2 }
}

export function Stage({ rays, arcs = [], onRay, active, onActive, view, snap = 1, protractor, benchmarks, children, dark, under, locked, hideVertex }: { rays: Ray[]; arcs?: Arc[]; onRay: (id: string, deg: number) => void; active?: string; onActive?: (id: string) => void; view: [number, number, number, number]; snap?: number; protractor?: number | null; benchmarks?: boolean; children?: ReactNode; dark?: boolean; under?: ReactNode; locked?: boolean; hideVertex?: boolean }) {
  const svg = useRef<SVGSVGElement>(null)
  const raysRef = useRef(rays)
  raysRef.current = rays
  const drag = useRef<string | null>(null)
  const pinch = useRef<{ id: string; a0: number; base: number } | null>(null)
  const toW = (cx: number, cy: number): [number, number] => {
    const s = svg.current
    if (!s) return [0, 0]
    const r = s.getBoundingClientRect()
    return [view[0] + ((cx - r.left) / r.width) * view[2], view[1] + ((cy - r.top) / r.height) * view[3]]
  }
  const angAt = (x: number, y: number) => norm((Math.atan2(-y, x) * 180) / Math.PI)
  const snapD = (d: number) => norm(Math.round(d / snap) * snap)

  useGesture(
    {
      onDrag: ({ first, last, xy: [cx, cy], pinching, event, tap }) => {
        if (locked || pinching) return
        const e = event as PointerEvent
        if (e && 'isPrimary' in e && e.isPrimary === false) return
        const [x, y] = toW(cx, cy)
        if (first || tap) {
          // en yakın sürüklenebilir ışın (uç ya da gövde)
          let best: string | null = null, bd = 0.3
          for (const r of raysRef.current) {
            if (!r.draggable) continue
            const L = r.len ?? 1
            const dirs = r.line ? [r.deg, r.deg + 180] : [r.deg]
            for (const dd of dirs) {
              const [ux, uy] = P(dd)
              const t = Math.max(0, Math.min(L, x * ux + y * uy))
              const d = Math.hypot(x - ux * t, y - uy * t) - (t > L * 0.6 ? 0.12 : 0)
              if (d < bd && Math.hypot(x, y) > 0.12) { bd = d; best = r.id }
            }
          }
          drag.current = best
          if (best) onActive?.(best)
          if (tap) { drag.current = null; return }
        }
        const id = drag.current
        if (!id) return
        let deg = angAt(x, y)
        const r = raysRef.current.find((q) => q.id === id)
        if (r?.line) {
          // doğru: tutulan yarıya göre
          const d1 = Math.abs(((deg - r.deg + 540) % 360) - 180)
          if (d1 > 90) deg = norm(deg + 180)
        }
        if (Math.hypot(x, y) > 0.08) onRay(id, snapD(deg))
        if (last) drag.current = null
      },
      onPinch: ({ first, offset: [, a], last, event }) => {
        if (locked) return
        event?.preventDefault?.()
        const id = active ?? raysRef.current.find((q) => q.draggable)?.id
        if (!id) return
        const r = raysRef.current.find((q) => q.id === id)
        if (!r) return
        if (first || !pinch.current) pinch.current = { id, a0: a, base: r.deg }
        onRay(id, snapD(pinch.current.base - (a - pinch.current.a0)))
        if (last) pinch.current = null
      },
    },
    { target: svg, eventOptions: { passive: false }, drag: { filterTaps: true } },
  )

  const stroke = dark ? '#e2e8f0' : '#1f2340'
  return (
    <svg ref={svg} viewBox={view.join(' ')} className={`block w-full select-none rounded-2xl ring-1 ${dark ? 'bg-slate-900 ring-slate-600' : 'bg-white ring-line'}`} style={{ touchAction: 'none' }} role="img" aria-label="Açı sahnesi">
      <defs>
        <pattern id="ao-dots" width={0.1} height={0.1} patternUnits="userSpaceOnUse"><circle cx={0.05} cy={0.05} r={0.006} fill={dark ? '#334155' : '#dbe3f0'} /></pattern>
      </defs>
      <rect x={view[0]} y={view[1]} width={view[2]} height={view[3]} fill="url(#ao-dots)" />
      {under}
      {benchmarks && [0, 45, 90, 135, 180].map((d) => { const [x, y] = P(d, 1.12); return <g key={d} pointerEvents="none"><line x1={0} y1={0} x2={x} y2={y} stroke={dark ? '#475569' : '#cbd5e1'} strokeWidth={0.008} strokeDasharray="0.03 0.03" /><text x={x * 1.04} y={y * 1.04 + 0.025} textAnchor="middle" fontSize={0.065} fontWeight={800} fill={dark ? '#94a3b8' : '#94a3b8'}>{d}°</text></g> })}
      {protractor !== undefined && protractor !== null && <Protractor base={protractor} dark={dark} />}
      {arcs.map((a, i) => {
        const r = a.r ?? 0.32
        const g = arcPath(a.from, a.to, r)
        const [lx, ly] = P(g.mid, r + 0.13)
        return (
          <g key={i} pointerEvents="none">
            {a.fill !== false && <path d={g.d} fill={a.color} fillOpacity={0.2} />}
            <path d={g.stroke} fill="none" stroke={a.color} strokeWidth={0.018} />
            {a.label && <text x={lx} y={ly + 0.03} textAnchor="middle" fontSize={0.085} fontWeight={900} fill={a.color} stroke={dark ? '#0f172a' : '#fff'} strokeWidth={0.02} paintOrder="stroke">{a.label}</text>}
          </g>
        )
      })}
      {rays.map((r) => {
        const L = r.len ?? 1
        const [x, y] = P(r.deg, L)
        const [bx, by] = r.line ? P(r.deg + 180, L) : [0, 0]
        const isAct = active === r.id && r.draggable
        return (
          <g key={r.id} data-handle style={{ cursor: r.draggable ? 'grab' : 'default' }}>
            {isAct && <line x1={bx} y1={by} x2={x} y2={y} stroke={r.color} strokeOpacity={0.2} strokeWidth={0.07} strokeLinecap="round" />}
            <line x1={bx} y1={by} x2={x} y2={y} stroke={r.color} strokeWidth={r.width ?? 0.026} strokeLinecap="round" strokeDasharray={r.dashed ? '0.04 0.03' : undefined} />
            {!r.line && <ArrowHead deg={r.deg} L={L} color={r.color} />}
            {r.line && <ArrowHead deg={r.deg + 180} L={L} color={r.color} />}
            {r.line && <ArrowHead deg={r.deg} L={L} color={r.color} />}
            {r.draggable && <circle cx={x} cy={y} r={0.075} fill={r.color} stroke="#fff" strokeWidth={0.018} />}
            {r.draggable && <circle cx={x} cy={y} r={0.15} fill="transparent" />}
            {r.label && (() => { const [lx, ly] = P(r.deg, L + 0.12); return <text x={lx} y={ly + 0.03} textAnchor="middle" fontSize={0.08} fontWeight={900} fill={r.color}>{r.label}</text> })()}
          </g>
        )
      })}
      {!hideVertex && <circle cx={0} cy={0} r={0.03} fill={stroke} />}
      {children}
    </svg>
  )
}

function ArrowHead({ deg, L, color }: { deg: number; L: number; color: string }) {
  const [x, y] = P(deg, L)
  const [ax, ay] = P(deg + 155, 0.07), [bx, by] = P(deg - 155, 0.07)
  return <path d={`M${x + ax},${y + ay} L${x},${y} L${x + bx},${y + by}`} fill="none" stroke={color} strokeWidth={0.022} strokeLinecap="round" strokeLinejoin="round" />
}

/** Yarım açıölçer: 0° çizgisi base yönünde */
export function Protractor({ base, dark }: { base: number; dark?: boolean }) {
  const R = 0.98
  const col = dark ? '#7dd3fc' : '#0369a1'
  const ticks = []
  for (let d = 0; d <= 180; d++) {
    const len = d % 10 === 0 ? 0.07 : d % 5 === 0 ? 0.045 : 0.025
    const [x1, y1] = P(base + d, R), [x2, y2] = P(base + d, R - len)
    ticks.push(<line key={d} x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={d % 10 === 0 ? 0.008 : 0.005} />)
    if (d % 30 === 0) {
      const [tx, ty] = P(base + d, R - 0.13)
      ticks.push(<text key={`t${d}`} x={tx} y={ty + 0.022} textAnchor="middle" fontSize={0.06} fontWeight={800} fill={col}>{d}</text>)
    }
  }
  const [sx, sy] = P(base, R), [ex, ey] = P(base + 180, R)
  return (
    <g pointerEvents="none">
      <path d={`M${sx},${sy} A${R},${R} 0 0 0 ${ex},${ey} Z`} fill={dark ? '#0c4a6e' : '#e0f2fe'} fillOpacity={0.55} stroke={col} strokeWidth={0.008} />
      {ticks}
    </g>
  )
}

export const kindOf = (d: number) => (d < 89.5 ? 'dar' : d <= 90.5 ? 'dik' : d < 179.5 ? 'geniş' : d <= 180.5 ? 'doğru' : 'geniş')
export const KIND_LABEL: Record<string, string> = { dar: 'dar açı', dik: 'dik açı', geniş: 'geniş açı', doğru: 'doğru açı' }
