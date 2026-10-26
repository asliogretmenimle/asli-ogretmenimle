import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'
import { cross, dirDeg, len, polar, type P } from './geo'
import { fmt } from '../donusum-studyosu/ortak'

/**
 * Üçgen Oluşturucu çizim tahtası: santimetre ızgaralı SVG (matematik koordinatı, y yukarı).
 *  - <Handle>: sürüklenebilir köşe (ızgaraya yapışır). Dokun-dokun alternatifi: köşeye dokun (seçilir),
 *    sonra tahtada gitmesini istediğin yere dokun.
 *  - <AngleArc>, <Seg>, <Lbl>: açı yayı, kenar, etiket.
 */

export const COL = { A: '#db2777', B: '#0284c7', C: '#7c3aed' } as const
export const theme = (dark?: boolean) =>
  dark
    ? { bg: '#0b1220', grid: '#172133', grid5: '#22304a', ink: '#e2e8f0', soft: '#94a3b8', fill: 'rgba(244,114,182,0.16)', stroke: '#f472b6', halo: '#0b1220' }
    : { bg: '#ffffff', grid: '#eef0f6', grid5: '#dfe3ee', ink: '#1f2340', soft: '#5b6080', fill: 'rgba(219,39,119,0.10)', stroke: '#db2777', halo: '#ffffff' }

type Ctx = {
  X: (x: number) => number
  Y: (y: number) => number
  U: number
  dark: boolean
  toUnit: (cx: number, cy: number) => P
  sel: string | null
  setSel: (id: string | null) => void
  register: (id: string, fn: ((p: P) => void) | null) => void
}
const BoardCtx = createContext<Ctx | null>(null)
export const useBoard = () => {
  const c = useContext(BoardCtx)
  if (!c) throw new Error('useBoard yalnızca <Board> içinde')
  return c
}

export function Board({ w = 600, h = 400, U = 40, origin, dark = false, grid = true, label, children, className = '' }: { w?: number; h?: number; U?: number; origin: [number, number]; dark?: boolean; grid?: boolean; label: string; children: ReactNode; className?: string }) {
  const ref = useRef<SVGSVGElement>(null)
  const [ox, oy] = origin
  const [sel, setSel] = useState<string | null>(null)
  const handlers = useRef(new Map<string, (p: P) => void>())
  const t = theme(dark)
  const X = (x: number) => ox + x * U
  const Y = (y: number) => oy - y * U
  const toUnit = (cx: number, cy: number): P => {
    const svg = ref.current
    const m = svg?.getScreenCTM()
    if (!svg || !m) return { x: 0, y: 0 }
    const q = new DOMPoint(cx, cy).matrixTransform(m.inverse())
    return { x: (q.x - ox) / U, y: (oy - q.y) / U }
  }
  const ctx: Ctx = {
    X, Y, U, dark, toUnit, sel, setSel,
    register: (id, fn) => {
      if (fn) handlers.current.set(id, fn)
      else handlers.current.delete(id)
    },
  }
  const xs: number[] = [], ys: number[] = []
  for (let i = Math.ceil(-ox / U); i <= Math.floor((w - ox) / U); i++) xs.push(i)
  for (let j = Math.ceil((oy - h) / U); j <= Math.floor(oy / U); j++) ys.push(j)
  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${w} ${h}`}
      className={`block h-auto w-full touch-none select-none ${className}`}
      role="img"
      aria-label={label}
      onClick={(e) => {
        if ((e.target as Element).closest('[data-handle]')) return
        if (sel) {
          handlers.current.get(sel)?.(toUnit(e.clientX, e.clientY))
          setSel(null)
        }
      }}
    >
      <rect width={w} height={h} fill={t.bg} />
      {grid && (
        <g pointerEvents="none">
          {xs.map((i) => <line key={`x${i}`} x1={X(i)} x2={X(i)} y1={0} y2={h} stroke={i % 5 === 0 ? t.grid5 : t.grid} strokeWidth={1} />)}
          {ys.map((j) => <line key={`y${j}`} y1={Y(j)} y2={Y(j)} x1={0} x2={w} stroke={j % 5 === 0 ? t.grid5 : t.grid} strokeWidth={1} />)}
        </g>
      )}
      <BoardCtx.Provider value={ctx}>{children}</BoardCtx.Provider>
      {sel && (
        <text x={w / 2} y={22} textAnchor="middle" fontSize={14} fontWeight={900} fill={t.stroke} pointerEvents="none">Şimdi köşenin gideceği yere dokun</text>
      )}
    </svg>
  )
}

/** Sürüklenebilir köşe */
export function Handle({ id, p, onMove, color, label, away, snap = 0.5, clampTo, disabled }: { id: string; p: P; onMove: (p: P) => void; color: string; label?: string; away?: P; snap?: number; clampTo?: (p: P) => P; disabled?: boolean }) {
  const B = useBoard()
  const t = theme(B.dark)
  const fix = (q: P) => {
    let r = snap ? { x: Math.round(q.x / snap) * snap, y: Math.round(q.y / snap) * snap } : q
    if (clampTo) r = clampTo(r)
    return r
  }
  const fixRef = useRef(fix)
  fixRef.current = fix
  const moveRef = useRef(onMove)
  moveRef.current = onMove
  useEffect(() => {
    if (disabled) return
    B.register(id, (q) => moveRef.current(fixRef.current(q)))
    return () => B.register(id, null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, disabled])
  const bind = useDrag(
    ({ xy: [cx, cy], tap, event }) => {
      event.stopPropagation()
      if (disabled) return
      if (tap) {
        B.setSel(B.sel === id ? null : id)
        return
      }
      if (B.sel) B.setSel(null)
      const q = fix(B.toUnit(cx, cy))
      if (Math.abs(q.x - p.x) > 1e-9 || Math.abs(q.y - p.y) > 1e-9) onMove(q)
    },
    { filterTaps: true },
  )
  const x = B.X(p.x), y = B.Y(p.y)
  let lx = x, ly = y - 22
  if (away) {
    const d = len(p, away) || 1
    lx = x + ((p.x - away.x) / d) * 26
    ly = y - ((p.y - away.y) / d) * 26
  }
  const selected = B.sel === id
  return (
    <g {...bind()} data-handle style={{ cursor: disabled ? 'default' : 'grab', touchAction: 'none' }} aria-label={label ? `${label} köşesi` : 'köşe'}>
      <circle cx={x} cy={y} r={30} fill="transparent" />
      {selected && <circle cx={x} cy={y} r={20} fill="none" stroke={color} strokeWidth={3} strokeDasharray="5 4" />}
      <circle cx={x} cy={y} r={disabled ? 6 : 12} fill={color} stroke={t.halo} strokeWidth={3} />
      {label && <text x={lx} y={ly + 6} textAnchor="middle" fontSize={18} fontWeight={900} fill={color} stroke={t.halo} strokeWidth={4} paintOrder="stroke" pointerEvents="none">{label}</text>}
    </g>
  )
}

/** Sabit köşe noktası (etiketli) */
export function Dot({ p, color, label, away }: { p: P; color: string; label?: string; away?: P }) {
  const B = useBoard()
  const t = theme(B.dark)
  const x = B.X(p.x), y = B.Y(p.y)
  let lx = x, ly = y - 20
  if (away) {
    const d = len(p, away) || 1
    lx = x + ((p.x - away.x) / d) * 22
    ly = y - ((p.y - away.y) / d) * 22
  }
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={6} fill={color} stroke={t.halo} strokeWidth={2} />
      {label && <text x={lx} y={ly + 6} textAnchor="middle" fontSize={17} fontWeight={900} fill={color} stroke={t.halo} strokeWidth={4} paintOrder="stroke">{label}</text>}
    </g>
  )
}

/** Kenar (isteğe bağlı uzunluk etiketi, `away` noktasından uzağa yazılır) */
export function Seg({ p, q, color, width = 3, dash, label, away, labelColor }: { p: P; q: P; color: string; width?: number; dash?: string; label?: string; away?: P; labelColor?: string }) {
  const B = useBoard()
  const t = theme(B.dark)
  const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
  let nx = -(q.y - p.y), ny = q.x - p.x
  const nl = Math.hypot(nx, ny) || 1
  nx /= nl
  ny /= nl
  if (away && (m.x - away.x) * nx + (m.y - away.y) * ny < 0) {
    nx = -nx
    ny = -ny
  }
  const lx = B.X(m.x) + nx * 18, ly = B.Y(m.y) - ny * 18
  return (
    <g pointerEvents="none">
      <line x1={B.X(p.x)} y1={B.Y(p.y)} x2={B.X(q.x)} y2={B.Y(q.y)} stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" />
      {label && <text x={lx} y={ly + 5} textAnchor="middle" fontSize={15} fontWeight={900} fill={labelColor ?? t.ink} stroke={t.halo} strokeWidth={4} paintOrder="stroke">{label}</text>}
    </g>
  )
}

/** Serbest etiket */
export function Lbl({ p, children, color, size = 15, dy = 0, anchor = 'middle' }: { p: P; children: ReactNode; color?: string; size?: number; dy?: number; anchor?: 'start' | 'middle' | 'end' }) {
  const B = useBoard()
  const t = theme(B.dark)
  return <text x={B.X(p.x)} y={B.Y(p.y) + dy} textAnchor={anchor} fontSize={size} fontWeight={900} fill={color ?? t.ink} stroke={t.halo} strokeWidth={4} paintOrder="stroke" pointerEvents="none">{children}</text>
}

/** at köşesinde p ile q arasındaki iç açının yayı (r piksel). Dik açıda kare çizer. */
export function AngleArc({ at, p, q, r = 30, color, label, fillOpacity = 0.22, showRight = true }: { at: P; p: P; q: P; r?: number; color: string; label?: string; fillOpacity?: number; showRight?: boolean }) {
  const B = useBoard()
  const t = theme(B.dark)
  const d1 = dirDeg(at, p), d2 = dirDeg(at, q)
  const angle = (() => { let d = Math.abs(d2 - d1) % 360; if (d > 180) d = 360 - d; return d })()
  if (angle < 0.5) return null
  const rr = r / B.U
  const s = polar(at, rr, d1), e = polar(at, rr, d2)
  const ccw = cross(at, p, q) > 0
  const sweep = ccw ? 0 : 1 // y ekseni ters: saat yönünün tersi (matematik) = ekranda saat yönünün tersi
  const x = B.X(at.x), y = B.Y(at.y)
  const bis = (() => { let m = d1 + (ccw ? 1 : -1) * angle / 2; m = ((m % 360) + 360) % 360; return m })()
  const lp = polar(at, (r + 16) / B.U, bis)
  const right = showRight && Math.abs(angle - 90) < 0.6
  return (
    <g pointerEvents="none">
      {right ? (
        (() => {
          const k = Math.min(r * 0.6, 18) / B.U
          const a1 = polar(at, k, d1), a2 = polar(at, k, d2)
          const c = { x: a1.x + a2.x - at.x, y: a1.y + a2.y - at.y }
          return <path d={`M${B.X(a1.x)},${B.Y(a1.y)} L${B.X(c.x)},${B.Y(c.y)} L${B.X(a2.x)},${B.Y(a2.y)} L${x},${y} Z`} fill={color} fillOpacity={fillOpacity} stroke={color} strokeWidth={2} />
        })()
      ) : (
        <path d={`M${x},${y} L${B.X(s.x)},${B.Y(s.y)} A${r},${r} 0 0 ${sweep} ${B.X(e.x)},${B.Y(e.y)} Z`} fill={color} fillOpacity={fillOpacity} stroke={color} strokeWidth={2} />
      )}
      {label && <text x={B.X(lp.x)} y={B.Y(lp.y) + 5} textAnchor="middle" fontSize={14} fontWeight={900} fill={color} stroke={t.halo} strokeWidth={4} paintOrder="stroke">{label}</text>}
    </g>
  )
}

/** Animasyonlu değer: hedef değişince yumuşakça geçer (azalırken `instantDown` ise hemen) */
export function useTween(target: number, ms = 900, instantDown = false) {
  const [v, setV] = useState(target)
  const cur = useRef(target)
  useEffect(() => {
    const from = cur.current
    if (from === target) return
    if (instantDown && target < from) {
      cur.current = target
      setV(target)
      return
    }
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const t0 = performance.now()
    let raf = 0
    const step = (now: number) => {
      const k = reduce ? 1 : Math.min(1, (now - t0) / ms)
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
      const val = from + (target - from) * e
      cur.current = val
      setV(val)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms, instantDown])
  return v
}

export const cm = (v: number, d = 1) => `${fmt(v, d)} cm`
export const dg = (v: number) => `${fmt(v, 0)}°`
