import { useRef, type ReactNode } from 'react'
import { useDrag, useGesture } from '@use-gesture/react'
import { clamp, niceStep, ticks } from '../../interactive/axis'
import { fmtN, type Look } from '../veri-toplama/kit'

/**
 * Yanıltıcı Grafikler için SVG grafikler:
 *  - DataChart: sütun ya da çizgi; eksen başlangıcı (y0) tutamacı, eşit olmayan çentikler, pencere (seçilmiş aralık),
 *    yükseklik (en-boy) tutamacı ve iki parmakla dikey esnetme.
 *  - Brush: tüm zaman çizelgesi üzerinde sürüklenebilir pencere (kiraz toplama)
 *  - Pie3D: eğilebilir/döndürülebilir 3B daire grafiği; görünen alan payları
 *  - Headline: gazete manşeti
 */

export interface Datum { label: string; value: number }
export const BAR_COLORS = ['#7c3aed', '#0891b2', '#db2777', '#f59e0b', '#16a34a', '#ea580c', '#64748b', '#0d9488']

const M = { L: 58, R: 18, T: 24, B: 46 }
export const CHART_W = 600

/** değer → piksel (eşit ya da eşit olmayan çentikli eksen) */
export function yMap(v: number, y0: number, yMax: number, plotH: number, uneven?: number[]) {
  if (uneven) {
    const n = uneven.length - 1
    const k = clamp(uneven.findIndex((_, i) => i < n && v <= uneven[i + 1]), 0, n - 1)
    const a = uneven[k], b = uneven[k + 1]
    const f = (k + clamp((v - a) / (b - a), 0, 1)) / n
    return plotH * (1 - f)
  }
  return plotH * (1 - clamp((v - y0) / (yMax - y0), 0, 1.02))
}

export function DataChart({ look, data, type, y0, yMax, height = 300, uneven, onY0, y0Step = 1, y0Max, onHeight, title, unit, colors = BAR_COLORS, ghostAll, xLabelEvery = 1, breakMark }: {
  look: Look
  data: Datum[]
  type: 'bar' | 'line'
  y0: number
  yMax: number
  height?: number
  uneven?: number[]
  onY0?: (v: number) => void
  y0Step?: number
  y0Max?: number
  onHeight?: (h: number) => void
  title?: string
  unit?: string
  colors?: string[]
  ghostAll?: boolean
  xLabelEvery?: number
  breakMark?: boolean
}) {
  const svg = useRef<SVGSVGElement>(null)
  const knob = useRef<SVGGElement>(null)
  const top = useRef<SVGGElement>(null)
  const W = CHART_W
  const H = height
  const plotW = W - M.L - M.R
  const plotH = H - M.T - M.B
  const ink = look.dark ? '#e2e8f0' : '#1f2340'
  const grid = look.dark ? '#334155' : '#eceef5'
  const scale = () => {
    const r = svg.current?.getBoundingClientRect()
    return r ? W / r.width : 1
  }
  // eksen başlangıcı tutamacı: yukarı sürükle → y0 artar
  const start = useRef(0)
  useDrag(
    ({ first, movement: [, my], event }) => {
      event.stopPropagation()
      if (!onY0) return
      if (first) start.current = y0
      const dv = (-my * scale() / plotH) * (yMax - start.current)
      const nv = Math.round(clamp(start.current + dv, 0, y0Max ?? yMax - y0Step) / y0Step) * y0Step
      if (nv !== y0) onY0(nv)
    },
    { target: knob, eventOptions: { passive: false } },
  )
  const h0 = useRef(0)
  useDrag(
    ({ first, movement: [, my], event }) => {
      event.stopPropagation()
      if (!onHeight) return
      if (first) h0.current = H
      onHeight(Math.round(clamp(h0.current - my * scale(), 140, 620)))
    },
    { target: top, eventOptions: { passive: false } },
  )
  // iki parmakla dikey esnetme (grafiğin kendisi)
  const pin = useRef(H)
  useGesture(
    {
      onPinch: ({ first, offset: [s], memo, event }) => {
        event?.preventDefault?.()
        if (!onHeight) return
        if (first) {
          pin.current = H
          memo = s
        }
        onHeight(Math.round(clamp((pin.current * s) / (memo as number), 140, 620)))
        return memo
      },
    },
    { target: svg, eventOptions: { passive: false }, pinch: { scaleBounds: { min: 0.2, max: 6 } } },
  )

  const tickVals = uneven ?? ticks(y0, yMax, niceStep(yMax - y0, plotH, 38))
  const n = data.length
  const bw = plotW / n
  const ym = (v: number) => M.T + yMap(v, y0, yMax, plotH, uneven)
  const xs = (i: number) => M.L + bw * (i + 0.5)

  return (
    <div style={{ touchAction: 'none' }} className="select-none">
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={title ?? 'Grafik'}>
        {title && <text x={W / 2} y={16} textAnchor="middle" fontSize={15} fontWeight={900} fill={ink}>{title}</text>}
        {tickVals.map((t) => (
          <g key={t}>
            <line x1={M.L} x2={W - M.R} y1={ym(t)} y2={ym(t)} stroke={grid} strokeWidth={1.5} />
            <text x={M.L - 8} y={ym(t) + 5} textAnchor="end" fontSize={14} fontWeight={800} fill={ink}>{fmtN(t, 1)}</text>
          </g>
        ))}
        {type === 'bar' &&
          data.map((d, i) => {
            const y = ym(d.value)
            const base = M.T + plotH
            return (
              <g key={d.label}>
                <rect x={xs(i) - bw * 0.32} y={y} width={bw * 0.64} height={Math.max(0, base - y)} rx={6} fill={colors[i % colors.length]} opacity={ghostAll ? 0.35 : 1} style={{ transition: 'y 0.25s, height 0.25s' }} />
                <text x={xs(i)} y={y - 7} textAnchor="middle" fontSize={14} fontWeight={900} fill={ink}>{fmtN(d.value, 1)}</text>
              </g>
            )
          })}
        {type === 'line' && (
          <g>
            <polyline points={data.map((d, i) => `${xs(i)},${ym(d.value)}`).join(' ')} fill="none" stroke="#7c3aed" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
            {data.map((d, i) => <circle key={i} cx={xs(i)} cy={ym(d.value)} r={5.5} fill="#7c3aed" stroke="#fff" strokeWidth={2} />)}
          </g>
        )}
        {data.map((d, i) => (i % xLabelEvery === 0 || i === n - 1) && <text key={d.label} x={xs(i)} y={H - M.B + 20} textAnchor="middle" fontSize={14} fontWeight={800} fill={ink}>{d.label}</text>)}
        {/* eksenler */}
        <line x1={M.L} x2={M.L} y1={M.T - 6} y2={M.T + plotH} stroke={ink} strokeWidth={2.5} />
        <line x1={M.L} x2={W - M.R} y1={M.T + plotH} y2={M.T + plotH} stroke={ink} strokeWidth={2.5} />
        {breakMark && y0 > 0 && <path d={`M${M.L - 9} ${M.T + plotH - 44} l9 -5 l9 5 M${M.L - 9} ${M.T + plotH - 36} l9 -5 l9 5`} stroke="#f59e0b" strokeWidth={3} fill="none" />}
        {unit && <text x={M.L + 6} y={M.T + 2} fontSize={12} fontWeight={800} fill={look.dark ? '#94a3b8' : '#5b6080'}>{unit}</text>}
        {onY0 && (
          <g ref={knob} data-handle style={{ cursor: 'ns-resize', touchAction: 'none' }}>
            <rect x={M.L - 56} y={M.T + plotH - 30} width={74} height={60} fill="transparent" />
            <rect x={M.L - 50} y={M.T + plotH - 15} width={62} height={30} rx={15} fill="#f59e0b" stroke="#fff" strokeWidth={3} />
            <text x={M.L - 19} y={M.T + plotH + 6} textAnchor="middle" fontSize={15} fontWeight={900} fill="#fff">{fmtN(y0)}</text>
            <path d={`M${M.L - 19} ${M.T + plotH - 24} l-6 7 h12 z`} fill="#f59e0b" />
          </g>
        )}
        {onHeight && (
          <g ref={top} data-handle style={{ cursor: 'ns-resize', touchAction: 'none' }}>
            <rect x={W - M.R - 70} y={0} width={70} height={40} fill="transparent" />
            <rect x={W - M.R - 52} y={3} width={50} height={22} rx={11} fill="#0891b2" />
            <path d={`M${W - M.R - 27} 7 v14 M${W - M.R - 31} 11 l4 -4 l4 4 M${W - M.R - 31} 17 l4 4 l4 -4`} stroke="#fff" strokeWidth={2.2} fill="none" />
          </g>
        )}
      </svg>
    </div>
  )
}

/** Tüm zaman çizelgesi + sürüklenebilir pencere; dokunuşla da kenar taşınır */
export function Brush({ look, data, i0, i1, onChange, minLen = 3 }: { look: Look; data: Datum[]; i0: number; i1: number; onChange: (a: number, b: number) => void; minLen?: number }) {
  const svg = useRef<SVGSVGElement>(null)
  const hA = useRef<SVGGElement>(null)
  const hB = useRef<SVGGElement>(null)
  const mid = useRef<SVGRectElement>(null)
  const W = CHART_W, H = 110, L = 20, R = 20
  const n = data.length
  const xs = (i: number) => L + ((W - L - R) * i) / (n - 1)
  const mn = Math.min(...data.map((d) => d.value)), mx = Math.max(...data.map((d) => d.value))
  const ys = (v: number) => 14 + (1 - (v - mn) / (mx - mn || 1)) * 56
  const idxAt = (cx: number) => {
    const r = svg.current!.getBoundingClientRect()
    const px = ((cx - r.left) / r.width) * W
    return clamp(Math.round(((px - L) / (W - L - R)) * (n - 1)), 0, n - 1)
  }
  useDrag(({ xy: [cx], event }) => { event.stopPropagation(); const k = idxAt(cx); onChange(Math.min(k, i1 - (minLen - 1)), i1) }, { target: hA, eventOptions: { passive: false } })
  useDrag(({ xy: [cx], event }) => { event.stopPropagation(); const k = idxAt(cx); onChange(i0, Math.max(k, i0 + (minLen - 1))) }, { target: hB, eventOptions: { passive: false } })
  const st = useRef(0)
  useDrag(({ first, movement: [mx2], event }) => {
    event.stopPropagation()
    if (first) st.current = i0
    const r = svg.current!.getBoundingClientRect()
    const d = Math.round(((mx2 / r.width) * W) / ((W - L - R) / (n - 1)))
    const len = i1 - i0
    const a = clamp(st.current + d, 0, n - 1 - len)
    if (a !== i0) onChange(a, a + len)
  }, { target: mid, eventOptions: { passive: false } })
  const ink = look.dark ? '#e2e8f0' : '#1f2340'
  return (
    <div style={{ touchAction: 'none' }} className="select-none">
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Tüm veriler ve seçilen aralık">
        <rect ref={mid} x={xs(i0)} y={4} width={xs(i1) - xs(i0)} height={76} rx={10} fill="#f59e0b" opacity={0.18} style={{ cursor: 'grab' }} data-handle />
        <polyline points={data.map((d, i) => `${xs(i)},${ys(d.value)}`).join(' ')} fill="none" stroke={look.dark ? '#94a3b8' : '#94a3b8'} strokeWidth={2.5} />
        <polyline points={data.slice(i0, i1 + 1).map((d, i) => `${xs(i + i0)},${ys(d.value)}`).join(' ')} fill="none" stroke="#7c3aed" strokeWidth={3.5} />
        {data.map((d, i) => <text key={i} x={xs(i)} y={H - 10} textAnchor="middle" fontSize={12} fontWeight={800} fill={i >= i0 && i <= i1 ? ink : '#94a3b8'}>{d.label}</text>)}
        {[[hA, i0], [hB, i1]].map(([ref, i], k) => (
          <g key={k} ref={ref as React.RefObject<SVGGElement>} data-handle style={{ cursor: 'ew-resize', touchAction: 'none' }}>
            <rect x={xs(i as number) - 24} y={0} width={48} height={90} fill="transparent" />
            <rect x={xs(i as number) - 7} y={10} width={14} height={64} rx={7} fill="#f59e0b" stroke="#fff" strokeWidth={2} />
            <path d={`M${xs(i as number) - 2} 34 v16 M${xs(i as number) + 2} 34 v16`} stroke="#fff" strokeWidth={1.5} />
          </g>
        ))}
      </svg>
    </div>
  )
}

/** Gazete manşeti */
export function Headline({ text, tone = 'plain' }: { text: string; tone?: 'plain' | 'hot' | 'calm' }) {
  return (
    <div className="rounded-2xl bg-[#fbf8f1] px-4 py-3 text-[#1c1917] shadow-inner ring-1 ring-stone-300" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <p className="border-b border-stone-400 pb-1 text-[11px] font-bold tracking-[0.25em] uppercase">Günlük Veri Gazetesi</p>
      <p className={`mt-1 text-xl leading-tight font-black sm:text-2xl ${tone === 'hot' ? 'text-red-700' : tone === 'calm' ? 'text-stone-700' : ''}`}>{text}</p>
    </div>
  )
}

// ───────────────────────── 3B daire grafiği ─────────────────────────

export interface Slice { label: string; share: number; color: string }

/** Her dilimin görünen alan payı: üst yüzey (izdüşüm oranları korur) + görünen yan duvar */
export function apparentShares(sl: Slice[], tilt: number, rot: number) {
  const r = 1
  const t = (tilt * Math.PI) / 180
  const d = 0.32 * Math.sin(t)
  const topA = Math.PI * r * r * Math.cos(t)
  let acc = (rot * Math.PI) / 180
  const areas = sl.map((s) => {
    const a0 = acc, a1 = acc + s.share * 2 * Math.PI
    acc = a1
    let wall = 0
    // görünen yan duvar: ekranda alt yarı (sin θ > 0), x = r cos θ → |dx| = r sin θ dθ
    for (let k = -1; k <= 1; k++) {
      const lo = Math.max(a0, k * 2 * Math.PI), hi = Math.min(a1, k * 2 * Math.PI + Math.PI)
      if (hi > lo) wall += d * r * (Math.cos(lo) - Math.cos(hi))
    }
    return s.share * topA + wall
  })
  const tot = areas.reduce((x, y) => x + y, 0)
  return areas.map((a) => a / tot)
}

export function Pie3D({ slices, tilt, rot, onTilt, onRot, size = 360, look }: { slices: Slice[]; tilt: number; rot: number; onTilt?: (v: number) => void; onRot?: (v: number) => void; size?: number; look: Look }) {
  const ref = useRef<SVGSVGElement>(null)
  const W = 400, H = 300, cx = 200, cy = 140, r = 150
  const t = (tilt * Math.PI) / 180
  const ry = r * Math.cos(t)
  const dep = 0.32 * r * Math.sin(t)
  const st = useRef({ tilt: 0, rot: 0 })
  useGesture(
    {
      onDrag: ({ first, movement: [mx, my], event }) => {
        event.stopPropagation()
        if (first) st.current = { tilt, rot }
        const s = ref.current ? W / ref.current.getBoundingClientRect().width : 1
        onRot?.(Math.round(((st.current.rot + mx * s * 0.8) % 360 + 360) % 360))
        onTilt?.(Math.round(clamp(st.current.tilt + my * s * 0.4, 0, 70)))
      },
    },
    { target: ref, eventOptions: { passive: false } },
  )
  const P = (a: number, z = 0) => [cx + r * Math.cos(a), cy + ry * Math.sin(a) + z] as const
  let acc = (rot * Math.PI) / 180
  const parts = slices.map((s) => {
    const a0 = acc, a1 = acc + s.share * 2 * Math.PI
    acc = a1
    return { s, a0, a1 }
  })
  const shade = (hex: string) => {
    const n = parseInt(hex.slice(1), 16)
    const f = (c: number) => Math.round(c * 0.72)
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`
  }
  const walls: ReactNode[] = []
  parts.forEach(({ s, a0, a1 }, i) => {
    for (let k = -1; k <= 1; k++) {
      const lo = Math.max(a0, k * 2 * Math.PI), hi = Math.min(a1, k * 2 * Math.PI + Math.PI)
      if (hi <= lo || dep < 0.5) continue
      const steps = 24
      const top: string[] = [], bot: string[] = []
      for (let j = 0; j <= steps; j++) {
        const a = lo + ((hi - lo) * j) / steps
        const [x, y] = P(a)
        top.push(`${x},${y}`)
        bot.unshift(`${x},${y + dep}`)
      }
      walls.push(<polygon key={`${i}-${k}`} points={[...top, ...bot].join(' ')} fill={shade(s.color)} stroke="#fff" strokeWidth={1} />)
    }
  })
  return (
    <div style={{ touchAction: 'none' }} className="select-none">
      <svg ref={ref} viewBox={`0 0 ${W} ${H + 20}`} width="100%" style={{ maxWidth: size, cursor: 'grab' }} className="mx-auto block" role="img" aria-label="3B daire grafiği">
        {walls}
        {parts.map(({ s, a0, a1 }) => {
          const [x0, y0] = P(a0), [x1, y1] = P(a1)
          const large = a1 - a0 > Math.PI ? 1 : 0
          const mid = (a0 + a1) / 2
          const [tx, ty] = [cx + r * 0.6 * Math.cos(mid), cy + ry * 0.6 * Math.sin(mid)]
          return (
            <g key={s.label}>
              <path d={`M${cx} ${cy} L${x0} ${y0} A${r} ${ry} 0 ${large} 1 ${x1} ${y1} Z`} fill={s.color} stroke="#fff" strokeWidth={2} />
              <text x={tx} y={ty + 5} textAnchor="middle" fontSize={16} fontWeight={900} fill="#fff" style={{ paintOrder: 'stroke', stroke: '#0005', strokeWidth: 3 }}>{s.label}</text>
            </g>
          )
        })}
        <text x={cx} y={H + 14} textAnchor="middle" fontSize={13} fontWeight={800} fill={look.dark ? '#94a3b8' : '#5b6080'}>sürükle: sağa-sola döndür, aşağı-yukarı eğ</text>
      </svg>
    </div>
  )
}
