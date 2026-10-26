import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useGesture } from '@use-gesture/react'
import type { Pt } from './ortak'
import { interp, type Line, type Tf } from './geo'

/**
 * Kareli kâğıt / koordinat düzlemi tahtası (SVG, tamsayı ızgara).
 *  - Dokun: onTap(matematik koordinatı) — en yakın ızgara noktasına yuvarlama tüketicidedir.
 *  - Sürükle: onDown(başlangıç noktası) true dönerse onMove/onUp çağrılır (köşe, ayna, hayalet şekil taşıma).
 *  - İki parmakla çevir: onTwist(derece) (döndürme modu).
 * 5–7. sınıfta eksen/sayı yok (Maarif: koordinat sistemi 8. sınıfta), 8. sınıfta eksenler ve sayılar var.
 */

export type View = { xMin: number; xMax: number; yMin: number; yMax: number }
export type BoardApi = { sx: (x: number) => number; sy: (y: number) => number; U: number; view: View; dark: boolean; coords: boolean; clip: string }

const U = 40
const PAD = 22

export const palette = (dark: boolean) => ({
  pre: dark ? '#818cf8' : '#4f46e5',
  img: dark ? '#f472b6' : '#db2777',
  goal: dark ? '#4ade80' : '#16a34a',
  mirror: dark ? '#fbbf24' : '#ea580c',
  text: dark ? '#e2e8f0' : '#1f2340',
  ok: '#22c55e',
  warn: '#f59e0b',
})

export function Board({ view, coords, dark, onTap, onDown, onMove, onUp, onTwist, children, label }: { view: View; coords: boolean; dark: boolean; onTap?: (p: Pt) => void; onDown?: (p: Pt) => boolean; onMove?: (p: Pt) => void; onUp?: () => void; onTwist?: (deg: number) => void; children: (api: BoardApi) => ReactNode; label: string }) {
  const ref = useRef<SVGSVGElement>(null)
  const clip = useId().replace(/:/g, '')
  const W = (view.xMax - view.xMin) * U + PAD * 2
  const H = (view.yMax - view.yMin) * U + PAD * 2
  const sx = (x: number) => PAD + (x - view.xMin) * U
  const sy = (y: number) => PAD + (view.yMax - y) * U
  const toMath = (cx: number, cy: number): Pt => {
    const svg = ref.current
    const m = svg?.getScreenCTM()
    if (!svg || !m) return [0, 0]
    const p = svg.createSVGPoint()
    p.x = cx
    p.y = cy
    const q = p.matrixTransform(m.inverse())
    return [view.xMin + (q.x - PAD) / U, view.yMax - (q.y - PAD) / U]
  }
  const lastA = useRef(0)
  useGesture(
    {
      onDrag: ({ tap, first, last, xy: [x, y], initial: [ix, iy], pinching, memo, event }) => {
        event.preventDefault?.()
        if (tap) {
          onTap?.(toMath(x, y))
          return
        }
        if (pinching) return memo
        if (first) memo = onDown ? onDown(toMath(ix, iy)) : false
        if (memo) {
          onMove?.(toMath(x, y))
          if (last) onUp?.()
        }
        return memo
      },
      onPinch: ({ offset: [, a], first, event }) => {
        event?.preventDefault?.()
        if (!onTwist) return
        if (first) lastA.current = a
        const d = a - lastA.current
        lastA.current = a
        if (Math.abs(d) > 0.1) onTwist(d)
      },
    },
    { target: ref, eventOptions: { passive: false }, drag: { filterTaps: true } },
  )

  const pal = palette(dark)
  const gridC = dark ? '#334155' : '#e2e8f0'
  const xs = Array.from({ length: view.xMax - view.xMin + 1 }, (_, i) => view.xMin + i)
  const ys = Array.from({ length: view.yMax - view.yMin + 1 }, (_, i) => view.yMin + i)
  const api: BoardApi = { sx, sy, U, view, dark, coords, clip: `url(#${clip})` }
  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full select-none lg:max-h-[calc(100dvh-15rem)]" style={{ touchAction: 'none' }} role="img" aria-label={label}>
      <defs>
        <clipPath id={clip}><rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} /></clipPath>
      </defs>
      <rect x={0} y={0} width={W} height={H} rx={18} fill={dark ? '#0f172a' : '#ffffff'} />
      {xs.map((x) => <line key={`x${x}`} x1={sx(x)} x2={sx(x)} y1={PAD} y2={H - PAD} stroke={gridC} strokeWidth={1} />)}
      {ys.map((y) => <line key={`y${y}`} y1={sy(y)} y2={sy(y)} x1={PAD} x2={W - PAD} stroke={gridC} strokeWidth={1} />)}
      {coords && (
        <g pointerEvents="none">
          <line x1={PAD - 6} x2={W - PAD + 8} y1={sy(0)} y2={sy(0)} stroke={pal.text} strokeWidth={1.8} />
          <line y1={H - PAD + 6} y2={PAD - 8} x1={sx(0)} x2={sx(0)} stroke={pal.text} strokeWidth={1.8} />
          <text x={W - PAD + 4} y={sy(0) - 7} fontSize={14} fontWeight={900} fill={pal.text} textAnchor="end">x</text>
          <text x={sx(0) + 7} y={PAD + 4} fontSize={14} fontWeight={900} fill={pal.text}>y</text>
          {xs.filter((x) => x !== 0 && x !== view.xMax).map((x) => <text key={`lx${x}`} x={sx(x)} y={sy(0) + 15} fontSize={11} fontWeight={800} fill={pal.text} opacity={0.75} textAnchor="middle">{String(x).replace('-', '−')}</text>)}
          {ys.filter((y) => y !== 0 && y !== view.yMax).map((y) => <text key={`ly${y}`} x={sx(0) - 5} y={sy(y) + 4} fontSize={11} fontWeight={800} fill={pal.text} opacity={0.75} textAnchor="end">{String(y).replace('-', '−')}</text>)}
          <text x={sx(0) - 5} y={sy(0) + 15} fontSize={11} fontWeight={800} fill={pal.text} opacity={0.75} textAnchor="end">0</text>
        </g>
      )}
      {children(api)}
    </svg>
  )
}

/** Etiketli çokgen */
export function Poly({ api, pts, color, dashed, fill = 0.22, labels, prime, width = 3, glow }: { api: BoardApi; pts: Pt[]; color: string; dashed?: boolean; fill?: number; labels?: boolean; prime?: boolean; width?: number; glow?: boolean }) {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
  const P = pts.map((p) => `${api.sx(p[0])},${api.sy(p[1])}`).join(' ')
  return (
    <g pointerEvents="none">
      {glow && <polygon points={P} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={width + 8} strokeLinejoin="round" />}
      <polygon points={P} fill={color} fillOpacity={fill} stroke={color} strokeWidth={width} strokeLinejoin="round" strokeDasharray={dashed ? '9 7' : undefined} />
      {labels && pts.map((p, i) => {
        const dx = p[0] - cx, dy = p[1] - cy
        const n = Math.hypot(dx, dy) || 1
        return (
          <text key={i} x={api.sx(p[0] + (dx / n) * 0.45)} y={api.sy(p[1] + (dy / n) * 0.45) + 5} fontSize={15} fontWeight={900} fill={color} textAnchor="middle" stroke={api.dark ? '#0f172a' : '#fff'} strokeWidth={3} paintOrder="stroke">
            {'ABCDEFGH'[i]}{prime ? '′' : ''}
          </text>
        )
      })}
    </g>
  )
}

/** Ayna doğrusu (kırpılmış) */
export function MirrorLine({ api, line, color, dashed, width = 4 }: { api: BoardApi; line: Line; color: string; dashed?: boolean; width?: number }) {
  const { view: v } = api
  const far = 40
  const [a, b]: [Pt, Pt] =
    line.k === 'v' ? [[line.c, v.yMin - far], [line.c, v.yMax + far]]
      : line.k === 'h' ? [[v.xMin - far, line.c], [v.xMax + far, line.c]]
        : line.k === 'd' ? [[v.xMin - far, v.xMin - far + line.c], [v.xMax + far, v.xMax + far + line.c]]
          : [[v.xMin - far, -(v.xMin - far) + line.c], [v.xMax + far, -(v.xMax + far) + line.c]]
  return (
    <g clipPath={api.clip} pointerEvents="none">
      <line x1={api.sx(a[0])} y1={api.sy(a[1])} x2={api.sx(b[0])} y2={api.sy(b[1])} stroke={color} strokeOpacity={0.25} strokeWidth={width + 10} strokeLinecap="round" />
      <line x1={api.sx(a[0])} y1={api.sy(a[1])} x2={api.sx(b[0])} y2={api.sy(b[1])} stroke={color} strokeWidth={width} strokeDasharray={dashed ? '12 8' : undefined} strokeLinecap="round" />
    </g>
  )
}

/** Noktaya göre uzaklık (ayna doğrusuna) */
export function distToLine(l: Line, [x, y]: Pt) {
  if (l.k === 'v') return Math.abs(x - l.c)
  if (l.k === 'h') return Math.abs(y - l.c)
  if (l.k === 'd') return Math.abs(y - x - l.c) / Math.SQRT2
  return Math.abs(y + x - l.c) / Math.SQRT2
}

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Dönüşümü canlandırır: ön görüntünün kopyası görüntüye kayar / katlanır / döner. run değişince yeniden oynar. */
export function useTfAnim(run: number, ms = 1100) {
  const [t, setT] = useState(1)
  useEffect(() => {
    if (!run) return
    if (reduced()) {
      setT(1)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms)
      setT(k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    setT(0)
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [run, ms])
  return t
}

export function MovingCopy({ api, tf, pts, t, color }: { api: BoardApi; tf: Tf; pts: Pt[]; t: number; color: string }) {
  if (t >= 1) return null
  return <Poly api={api} pts={pts.map((p) => interp(tf, p, t))} color={color} fill={0.3} width={2.5} />
}

/** Döndürme merkezinden köşelere ince yaylar/ışınlar (yalnızca görsel ipucu) */
export function Dot({ api, p, color, r = 7, ring }: { api: BoardApi; p: Pt; color: string; r?: number; ring?: string }) {
  return (
    <g pointerEvents="none">
      {ring && <circle cx={api.sx(p[0])} cy={api.sy(p[1])} r={r + 6} fill="none" stroke={ring} strokeWidth={3} />}
      <circle cx={api.sx(p[0])} cy={api.sy(p[1])} r={r} fill={color} stroke={api.dark ? '#0f172a' : '#fff'} strokeWidth={2.5} />
    </g>
  )
}
