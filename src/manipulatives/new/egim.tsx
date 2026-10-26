import { DragPoint, Pinchable, Plane, usePlane } from '../../interactive/Plane'
import { MathText } from '../../components/MathText'
import { Readout, ToolButton } from '../ui'
import { n, type ToolDef } from '../types'

/**
 * Eğim ve Doğru Aracı
 *  - İki noktayı sürükle: doğru, eğim ve denklem canlı değişir.
 *  - Doğru parçasının üzerinde iki parmak: parçayı büyüt/küçült (pinch) ve döndür.
 *  - Doğruyu tek parmakla sürükle: kaydır (eğim aynı, kesim noktası değişir).
 *  - Boş alanda pinch: düzlemi yakınlaştır.
 */
type V = { a: { x: number; y: number }; b: { x: number; y: number } }

const r2 = (v: number) => Math.round(v * 100) / 100
const fmt = (v: number) => {
  const r = r2(v)
  return (Object.is(r, -0) ? 0 : r).toLocaleString('tr-TR', { maximumFractionDigits: 2 }).replace('-', '−')
}

function slopeText(v: V) {
  const dx = v.b.x - v.a.x, dy = v.b.y - v.a.y
  if (Math.abs(dx) < 1e-9) return { m: null as number | null, eq: `x = ${fmt(v.a.x)}`, frac: 'tanımsız (dikey doğru)' }
  const m = dy / dx
  const b = v.a.y - m * v.a.x
  const mTxt = Math.abs(m - 1) < 1e-9 ? '' : Math.abs(m + 1) < 1e-9 ? '−' : fmt(m)
  const eq = Math.abs(m) < 1e-9 ? `y = ${fmt(b)}` : `y = ${mTxt}x${Math.abs(b) < 1e-9 ? '' : b > 0 ? ` + ${fmt(b)}` : ` − ${fmt(-b)}`}`
  const isInt = (x: number) => Math.abs(x - Math.round(x)) < 1e-9
  const frac = isInt(dx) && isInt(dy) ? `[[${fmt(dy)}/${fmt(dx)}]]` : fmt(m)
  return { m, eq, frac }
}

function Scene({ value, onChange, locked, snap }: { value: V; onChange: (v: V) => void; locked?: boolean; snap: boolean }) {
  const P = usePlane()
  const { a, b } = value
  const dx = b.x - a.x, dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  // doğrunun görünür alan boyunca uzatılmış hâli
  const far = (P.view.xMax - P.view.xMin) * 3
  const ux = dx / len, uy = dy / len
  const L1 = { x: a.x - ux * far, y: a.y - uy * far }, L2 = { x: a.x + ux * far, y: a.y + uy * far }
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const sn = (p: { x: number; y: number }) => (snap ? { x: Math.round(p.x), y: Math.round(p.y) } : { x: r2(p.x), y: r2(p.y) })

  const scale = (f: number) => {
    if (locked) return
    const h = { x: (dx / 2) * f, y: (dy / 2) * f }
    if (Math.hypot(h.x, h.y) < 0.3) return
    onChange({ a: { x: r2(mid.x - h.x), y: r2(mid.y - h.y) }, b: { x: r2(mid.x + h.x), y: r2(mid.y + h.y) } })
  }
  const rotate = (deg: number) => {
    if (locked) return
    const t = (-deg * Math.PI) / 180
    const rot = (p: { x: number; y: number }) => ({ x: r2(mid.x + (p.x - mid.x) * Math.cos(t) - (p.y - mid.y) * Math.sin(t)), y: r2(mid.y + (p.x - mid.x) * Math.sin(t) + (p.y - mid.y) * Math.cos(t)) })
    onChange({ a: rot(a), b: rot(b) })
  }
  const move = (mx: number, my: number) => !locked && onChange({ a: { x: r2(a.x + mx), y: r2(a.y + my) }, b: { x: r2(b.x + mx), y: r2(b.y + my) } })

  return (
    <g>
      <line x1={P.sx(L1.x)} y1={P.sy(L1.y)} x2={P.sx(L2.x)} y2={P.sy(L2.y)} stroke="#d6457a" strokeWidth={2} strokeDasharray="6 5" opacity={0.55} />
      {/* yükselme / yatay ilerleme üçgeni */}
      <path d={`M${P.sx(a.x)} ${P.sy(a.y)} H${P.sx(b.x)} V${P.sy(b.y)}`} fill="none" stroke="#0ea5e9" strokeWidth={2.5} strokeDasharray="5 4" />
      <text x={(P.sx(a.x) + P.sx(b.x)) / 2} y={P.sy(a.y) + (dy >= 0 ? 18 : -8)} textAnchor="middle" fontSize={13} fontWeight={900} fill="#0369a1">{fmt(dx)}</text>
      <text x={P.sx(b.x) + 8} y={(P.sy(a.y) + P.sy(b.y)) / 2} fontSize={13} fontWeight={900} fill="#0369a1">{fmt(dy)}</text>
      <Pinchable onScale={scale} onRotate={rotate} onMove={move}>
        <line x1={P.sx(a.x)} y1={P.sy(a.y)} x2={P.sx(b.x)} y2={P.sy(b.y)} stroke="transparent" strokeWidth={44} strokeLinecap="round" />
        <line x1={P.sx(a.x)} y1={P.sy(a.y)} x2={P.sx(b.x)} y2={P.sy(b.y)} stroke="#d6457a" strokeWidth={6} strokeLinecap="round" />
      </Pinchable>
      <DragPoint x={a.x} y={a.y} label="A" color="#be185d" disabled={locked} onChange={(p) => onChange({ ...value, a: sn(p) })} />
      <DragPoint x={b.x} y={b.y} label="B" color="#be185d" disabled={locked} onChange={(p) => onChange({ ...value, b: sn(p) })} />
    </g>
  )
}

export const egim: ToolDef<V & { snap?: boolean }> = {
  id: 'egim',
  defaultConfig: { size: 6 },
  initial: () => ({ a: { x: -2, y: -1 }, b: { x: 2, y: 1 }, snap: true }),
  /** hedef: { m } eğim, isteğe bağlı { b } kesim */
  check: (v, t) => {
    const s = slopeText(v)
    if (s.m === null) return false
    if (typeof t.m === 'number' && Math.abs(s.m - n(t, 'm')) > 0.01) return false
    if (typeof t.b === 'number') {
      const b = v.a.y - s.m * v.a.x
      if (Math.abs(b - n(t, 'b')) > 0.01) return false
    }
    return true
  },
  Component: ({ value, onChange, config, target, locked }) => {
    const size = config.size ?? 6
    const s = slopeText(value)
    const snap = value.snap !== false
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="w-full max-w-2xl">
          <Plane initial={{ xMin: -size, xMax: size, yMin: -size, yMax: size }} xLabel="x" yLabel="y" label="Eğim düzlemi">
            <Scene value={value} onChange={(v) => onChange({ ...v, snap: value.snap })} locked={locked} snap={snap} />
          </Plane>
        </div>
        <p className="text-center text-sm font-bold text-ink-soft">A ve B noktalarını sürükle. Doğrunun üzerinde iki parmakla büyüt, küçült ya da döndür.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <ToolButton active={snap} onClick={() => onChange({ ...value, snap: !snap })}>{snap ? 'Izgaraya yapış: açık' : 'Izgaraya yapış: kapalı'}</ToolButton>
        </div>
        {(!target || locked) && (
          <Readout>
            <span className="mr-3">eğim = <span className="inline-block align-middle text-xl"><MathText text={s.m === null ? s.frac : `${s.frac}${s.frac.startsWith('[[') && Math.abs((s.m ?? 0) - Math.round(s.m ?? 0)) > 1e-9 ? ` ≈ ${fmt(s.m!)}` : ''}`} /></span></span>
            <span className="text-white/80">{s.eq}</span>
          </Readout>
        )}
      </div>
    )
  },
}
