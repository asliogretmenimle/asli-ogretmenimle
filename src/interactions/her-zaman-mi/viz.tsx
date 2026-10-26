import { useRef } from 'react'
import { useDrag } from '@use-gesture/react'

/**
 * Deney sandığı görselleri. Dikdörtgen kurucu: sağ alt köşedeki tutamacı sürükle ya da bir kareye dokun.
 * touch-action: none sarmalayıcıda (Chrome SVG alt öğelerinde dikkate almaz).
 */

const INK = '#1f2340'

function toSvg(svg: SVGSVGElement | null, x: number, y: number) {
  if (!svg) return { x: 0, y: 0 }
  const m = svg.getScreenCTM()
  if (!m) return { x: 0, y: 0 }
  const pt = svg.createSVGPoint()
  pt.x = x
  pt.y = y
  const r = pt.matrixTransform(m.inverse())
  return { x: r.x, y: r.y }
}

export function RectBuilder({ w, h, maxW, maxH, onChange, color = '#f97316', u = 26, dark, label }: { w: number; h: number; maxW: number; maxH: number; onChange: (w: number, h: number) => void; color?: string; u?: number; dark?: boolean; label?: string }) {
  const ref = useRef<SVGSVGElement>(null)
  const pad = 24
  const W = maxW * u + pad * 2, H = maxH * u + pad * 2
  const set = (cx: number, cy: number) => {
    const p = toSvg(ref.current, cx, cy)
    const nw = Math.max(1, Math.min(maxW, Math.round((p.x - pad) / u)))
    const nh = Math.max(1, Math.min(maxH, Math.round((p.y - pad) / u)))
    if (nw !== w || nh !== h) onChange(nw, nh)
  }
  const bind = useDrag(({ xy: [x, y], event }) => {
    event?.preventDefault?.()
    set(x, y)
  }, { pointer: { capture: true }, eventOptions: { passive: false } })
  const grid = dark ? '#475569' : '#d9dbea'
  return (
    <div className="w-full" style={{ touchAction: 'none' }}>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto block h-auto w-full"
        style={{ maxWidth: W * 1.35, touchAction: 'none' }}
        role="img"
        aria-label={`${w} × ${h} dikdörtgen`}
        onClick={(e) => {
          const p = toSvg(ref.current, e.clientX, e.clientY)
          const nw = Math.max(1, Math.min(maxW, Math.ceil((p.x - pad) / u)))
          const nh = Math.max(1, Math.min(maxH, Math.ceil((p.y - pad) / u)))
          onChange(nw, nh)
        }}
      >
        {Array.from({ length: maxW * maxH }, (_, i) => {
          const x = i % maxW, y = Math.floor(i / maxW)
          return <rect key={i} x={pad + x * u} y={pad + y * u} width={u} height={u} fill="transparent" stroke={grid} strokeWidth={1} />
        })}
        <rect x={pad} y={pad} width={w * u} height={h * u} fill={color} fillOpacity={0.35} stroke={color} strokeWidth={3} />
        {Array.from({ length: w - 1 }, (_, i) => <line key={`v${i}`} x1={pad + (i + 1) * u} x2={pad + (i + 1) * u} y1={pad} y2={pad + h * u} stroke={color} strokeOpacity={0.5} />)}
        {Array.from({ length: h - 1 }, (_, i) => <line key={`h${i}`} y1={pad + (i + 1) * u} y2={pad + (i + 1) * u} x1={pad} x2={pad + w * u} stroke={color} strokeOpacity={0.5} />)}
        <text x={pad + (w * u) / 2} y={pad - 7} textAnchor="middle" fontSize={15} fontWeight={900} fill={dark ? '#e2e8f0' : INK}>{w}</text>
        <text x={pad - 8} y={pad + (h * u) / 2 + 5} textAnchor="end" fontSize={15} fontWeight={900} fill={dark ? '#e2e8f0' : INK}>{h}</text>
        {label && <text x={W - pad} y={H - 6} textAnchor="end" fontSize={13} fontWeight={900} fill={color}>{label}</text>}
        <g {...bind()} data-handle style={{ cursor: 'grab', touchAction: 'none' }} onClick={(e) => e.stopPropagation()}>
          <circle cx={pad + w * u} cy={pad + h * u} r={22} fill="transparent" />
          <circle cx={pad + w * u} cy={pad + h * u} r={11} fill={color} stroke="#fff" strokeWidth={3} />
        </g>
      </svg>
    </div>
  )
}

/** Üç kenardan üçgen; kenarlar birleşmiyorsa açık uçlar gösterilir. legs: dik üçgen (a, b dik kenar) */
export function TriangleView({ a, b, c, right, dark }: { a: number; b: number; c?: number; right?: boolean; dark?: boolean }) {
  const ink = dark ? '#e2e8f0' : INK
  let base: number, sA: number, sB: number
  if (right) {
    base = a
    sA = b
    sB = Math.sqrt(a * a + b * b)
  } else {
    ;[sA, sB, base] = [a, b, c ?? 1]
  }
  const W = 300, H = 190
  const maxLen = Math.max(base, sA, sB, 1)
  const k = Math.min(240 / Math.max(base, 1), 150 / maxLen, 22)
  const ox = (W - base * k) / 2, oy = H - 24
  const A = { x: ox, y: oy }, B = { x: ox + base * k, y: oy }
  // sol köşeden b (sA), sağ köşeden a (sB) uzunluğunda kenarlar
  let P: { x: number; y: number } | null = null
  if (right) P = { x: A.x, y: oy - sA * k }
  else {
    const x = (sA * sA - sB * sB + base * base) / (2 * base)
    const yy = sA * sA - x * x
    if (sA + sB > base && sA + base > sB && sB + base > sA && yy > 0) P = { x: ox + x * k, y: oy - Math.sqrt(yy) * k }
  }
  const lab = (p: { x: number; y: number }, q: { x: number; y: number }, t: string, dy = 0) => (
    <text x={(p.x + q.x) / 2} y={(p.y + q.y) / 2 + dy} textAnchor="middle" fontSize={14} fontWeight={900} fill={ink} paintOrder="stroke" stroke={dark ? '#1e293b' : '#fff'} strokeWidth={4}>{t}</text>
  )
  const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : `≈ ${(Math.round(n * 10) / 10).toString().replace('.', ',')}`)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full max-w-[360px]" role="img" aria-label={P ? 'Üçgen oluştu' : 'Kenarlar birleşmiyor'}>
      <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#3b82f6" strokeWidth={5} strokeLinecap="round" />
      {lab(A, B, right ? `${a}` : `${base}`, 20)}
      {P ? (
        <>
          <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${P.x},${P.y}`} fill="#22c55e" fillOpacity={0.18} />
          <line x1={A.x} y1={A.y} x2={P.x} y2={P.y} stroke="#f97316" strokeWidth={5} strokeLinecap="round" />
          <line x1={B.x} y1={B.y} x2={P.x} y2={P.y} stroke="#a855f7" strokeWidth={5} strokeLinecap="round" />
          {lab(A, P, `${sA}`, 0)}
          {lab(B, P, fmt(sB), 0)}
          {right && <path d={`M${A.x + 14} ${A.y} L${A.x + 14} ${A.y - 14} L${A.x} ${A.y - 14}`} fill="none" stroke={ink} strokeWidth={2} />}
        </>
      ) : (
        (() => {
          const ang = (40 * Math.PI) / 180
          const L1 = { x: A.x + Math.cos(ang) * sA * k, y: A.y - Math.sin(ang) * sA * k }
          const L2 = { x: B.x - Math.cos(ang) * sB * k, y: B.y - Math.sin(ang) * sB * k }
          return (
            <>
              <line x1={A.x} y1={A.y} x2={L1.x} y2={L1.y} stroke="#f97316" strokeWidth={5} strokeLinecap="round" />
              <line x1={B.x} y1={B.y} x2={L2.x} y2={L2.y} stroke="#a855f7" strokeWidth={5} strokeLinecap="round" />
              {lab(A, L1, `${sA}`, -10)}
              {lab(B, L2, `${sB}`, -10)}
              <text x={W / 2} y={22} textAnchor="middle" fontSize={15} fontWeight={900} fill="#ef4444">Kenarlar birleşmiyor!</text>
            </>
          )
        })()
      )}
    </svg>
  )
}

/** İki komşu açı ve toplamı; 90° kesik çizgiyle */
export function AnglesView({ a, b, dark }: { a: number; b: number; dark?: boolean }) {
  const ink = dark ? '#e2e8f0' : INK
  const O = { x: 150, y: 170 }, R = 140
  const pt = (deg: number, r = R) => ({ x: O.x + r * Math.cos((-deg * Math.PI) / 180), y: O.y + r * Math.sin((-deg * Math.PI) / 180) })
  const arc = (d1: number, d2: number, r: number) => {
    const p1 = pt(d1, r), p2 = pt(d2, r)
    return `M${O.x} ${O.y} L${p1.x} ${p1.y} A${r} ${r} 0 ${d2 - d1 > 180 ? 1 : 0} 0 ${p2.x} ${p2.y} Z`
  }
  const s = a + b
  const P1 = pt(0), P2 = pt(a), P3 = pt(s), P90 = pt(90)
  const m1 = pt(a / 2, 70), m2 = pt(a + b / 2, 70)
  return (
    <svg viewBox="0 0 300 190" className="mx-auto block h-auto w-full max-w-[360px]" role="img" aria-label={`${a}° ve ${b}°, toplam ${s}°`}>
      <line x1={O.x} y1={O.y} x2={P90.x} y2={P90.y} stroke={dark ? '#94a3b8' : '#8a8fb0'} strokeWidth={2} strokeDasharray="6 5" />
      <text x={P90.x + 6} y={P90.y + 14} fontSize={12} fontWeight={800} fill={dark ? '#94a3b8' : '#8a8fb0'}>90°</text>
      <path d={arc(0, a, 54)} fill="#f97316" fillOpacity={0.35} />
      <path d={arc(a, s, 54)} fill="#3b82f6" fillOpacity={0.35} />
      {[P1, P2, P3].map((p, i) => <line key={i} x1={O.x} y1={O.y} x2={p.x} y2={p.y} stroke={ink} strokeWidth={4} strokeLinecap="round" />)}
      <text x={m1.x} y={m1.y + 5} textAnchor="middle" fontSize={14} fontWeight={900} fill="#c2410c">{a}°</text>
      <text x={m2.x} y={m2.y + 5} textAnchor="middle" fontSize={14} fontWeight={900} fill="#1d4ed8">{b}°</text>
      <circle cx={O.x} cy={O.y} r={5} fill={ink} />
    </svg>
  )
}

/** Kesir şeritleri: her biri aynı bütün uzunluğunda; bileşik kesirler birden çok bütüne taşar */
export function FracBars({ fracs, dark }: { fracs: [number, number][]; dark?: boolean }) {
  const maxWholes = Math.max(1, ...fracs.map(([n, d]) => Math.ceil(n / d)))
  const W = 320
  const whole = Math.min(250, (W - 64) / maxWholes)
  const rowH = 34, gap = 16
  const H = fracs.length * (rowH + gap) + 6
  const cols = ['#f97316', '#3b82f6', '#22c55e']
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full max-w-[420px]" role="img" aria-label="Kesir şeritleri">
      {fracs.map(([n, d], r) => {
        const y = 4 + r * (rowH + gap)
        const part = whole / d
        const wholes = Math.max(1, Math.ceil(n / d))
        return (
          <g key={r}>
            {Array.from({ length: wholes * d }, (_, i) => (
              <rect key={i} x={10 + i * part} y={y} width={part} height={rowH} fill={i < n ? cols[r % 3] : dark ? '#334155' : '#fff'} fillOpacity={i < n ? 0.8 : 1} stroke={dark ? '#94a3b8' : INK} strokeWidth={i % d === 0 ? 2.5 : 1.2} />
            ))}
            <text x={10 + wholes * whole + 6} y={y + rowH / 2 + 5} fontSize={13} fontWeight={900} fill={dark ? '#e2e8f0' : INK}>{n}/{d}</text>
          </g>
        )
      })}
    </svg>
  )
}
