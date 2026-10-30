import { useRef, useState, type PointerEvent } from 'react'

/**
 * Eğim Parkuru sahnesi: koyu koordinat ızgarası (x: 0…10, y: −1…10), rampa, eğim üçgeni,
 * sürüklenebilir uç (ve serbest seviyelerde başlangıç) tutamacı, yıldızlar, önceki denemelerin izleri ve kaykaycı.
 * Ramp tutamaçları ızgaraya yapışır; dokun-dokun alternatifi panel Stepper’larıdır.
 */

export const X0 = -1, X1 = 10.5, Y0 = -1.4, Y1 = 10.5
const U = 40
const W = (X1 - X0) * U, H = (Y1 - Y0) * U
export const sx = (x: number) => (x - X0) * U
export const sy = (y: number) => (Y1 - y) * U

export type Ramp = { rise: number; run: number; n: number }
export type Trace = Ramp & { hit: boolean }

const slope = (r: Ramp) => r.rise / r.run
/** Kaykaycının ızgaradan çıktığı x */
export function exitX(r: Ramp) {
  const m = slope(r)
  const out = m > 0 ? (Y1 - 0.3 - r.n) / m : m < 0 ? (Y0 + 0.3 - r.n) / m : Infinity
  return Math.min(10, out)
}
export const fracLabel = (rise: number, run: number) => {
  const g = gcdI(Math.abs(rise), Math.abs(run)) || 1
  const a = rise / g, b = run / g
  const s = a < 0 ? '−' : ''
  return b === 1 ? `${s}${Math.abs(a)}` : `${s}${Math.abs(a)}/${b}`
}
/** Düz metin denklem: y = 2/3x + 1 */
export const eqPlain = (r: Ramp) => {
  if (r.rise === 0) return `y = ${r.n}`
  const m = fracLabel(r.rise, r.run)
  const mx = m === '1' ? 'x' : m === '−1' ? '−x' : `${m}x`
  return `y = ${mx}${r.n ? ` + ${r.n}` : ''}`
}
export const gcdI = (a: number, b: number): number => (b ? gcdI(b, a % b) : a)

export function Track({ ramp, stars, got, traces, ghost, skater, editable, nFree, onChange }: {
  ramp: Ramp
  stars: [number, number][]
  got: boolean[]
  traces: Trace[]
  ghost?: Ramp
  skater: { x: number; y: number } | null
  editable: boolean
  nFree?: boolean
  onChange: (r: Ramp) => void
}) {
  const svg = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<'end' | 'start' | null>(null)
  const S = { x: 0, y: ramp.n }
  const E = { x: ramp.run, y: ramp.n + ramp.rise }

  const toWorld = (e: PointerEvent) => {
    const el = svg.current
    const ctm = el?.getScreenCTM()
    if (!el || !ctm) return null
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return { x: p.x / U + X0, y: Y1 - p.y / U }
  }
  const down = (which: 'end' | 'start') => (e: PointerEvent) => {
    if (!editable) return
    e.stopPropagation()
    svg.current?.setPointerCapture(e.pointerId)
    setDrag(which)
  }
  const move = (e: PointerEvent) => {
    if (!drag) return
    const p = toWorld(e)
    if (!p) return
    if (drag === 'end') {
      const run = Math.max(0, Math.min(8, Math.round(p.x)))
      const top = Math.max(-1, Math.min(10, Math.round(p.y)))
      if (run !== ramp.run || top - ramp.n !== ramp.rise) onChange({ ...ramp, run, rise: top - ramp.n })
    } else {
      const n = Math.max(0, Math.min(10, Math.round(p.y)))
      const top = Math.max(-1, Math.min(10, n + ramp.rise))
      if (n !== ramp.n) onChange({ ...ramp, n, rise: top - n })
    }
  }
  const up = () => setDrag(null)

  const line = (r: Ramp, from = 0) => {
    const xe = r.run === 0 ? 0 : exitX(r)
    const m = r.run === 0 ? 0 : slope(r)
    return { x1: sx(from), y1: sy(r.n + m * from), x2: sx(xe), y2: sy(r.n + m * xe) }
  }

  const xs = Array.from({ length: 11 }, (_, i) => i)
  const ys = Array.from({ length: 11 }, (_, i) => i)
  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto block w-full max-w-[560px] select-none"
      style={{ touchAction: 'none' }}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      role="img"
      aria-label={`Koordinat düzleminde rampa: başlangıç (0, ${ramp.n}), uç (${E.x}, ${E.y})`}
    >
      <rect width={W} height={H} rx={18} fill="#0b1220" />
      {xs.map((i) => <line key={`gx${i}`} x1={sx(i)} y1={sy(Y0)} x2={sx(i)} y2={sy(Y1)} stroke="#1e293b" strokeWidth={1.5} />)}
      {[-1, ...ys].map((i) => <line key={`gy${i}`} x1={sx(X0)} y1={sy(i)} x2={sx(X1)} y2={sy(i)} stroke="#1e293b" strokeWidth={1.5} />)}
      <line x1={sx(X0)} y1={sy(0)} x2={sx(X1)} y2={sy(0)} stroke="#64748b" strokeWidth={2.5} />
      <line x1={sx(0)} y1={sy(Y0)} x2={sx(0)} y2={sy(Y1)} stroke="#64748b" strokeWidth={2.5} />
      {xs.filter((i) => i > 0).map((i) => <text key={`lx${i}`} x={sx(i)} y={sy(0) + 17} textAnchor="middle" fontSize={13} fontWeight={800} fill="#94a3b8">{i}</text>)}
      {ys.filter((i) => i > 0).map((i) => <text key={`ly${i}`} x={sx(0) - 9} y={sy(i) + 4.5} textAnchor="end" fontSize={13} fontWeight={800} fill="#94a3b8">{i}</text>)}
      <text x={sx(0) - 9} y={sy(0) + 17} textAnchor="end" fontSize={13} fontWeight={800} fill="#94a3b8">0</text>
      <text x={sx(X1) - 6} y={sy(0) - 8} textAnchor="end" fontSize={15} fontWeight={900} fill="#cbd5e1">x</text>
      <text x={sx(0) + 8} y={sy(Y1) + 16} fontSize={15} fontWeight={900} fill="#cbd5e1">y</text>

      {/* hazır (karşılaştırma) rampa */}
      {ghost && (
        <g>
          <line {...line(ghost)} stroke="#38bdf8" strokeWidth={5} strokeLinecap="round" opacity={0.85} />
          <text x={sx(7.6)} y={sy(ghost.n + slope(ghost) * 7.6) + 26} fontSize={14} fontWeight={900} fill="#7dd3fc">{eqPlain(ghost)}</text>
        </g>
      )}

      {/* önceki denemelerin izleri */}
      {traces.map((t, i) => {
        const L = line(t)
        const last = i === traces.length - 1
        return (
          <g key={i} opacity={last ? 0.95 : 0.45}>
            <line {...L} stroke={t.hit ? '#4ade80' : '#f59e0b'} strokeWidth={3} strokeDasharray={t.hit ? undefined : '7 6'} strokeLinecap="round" />
            <text x={Math.min(L.x2, sx(9.2))} y={Math.max(16, Math.min(L.y2 - 8, sy(Y0) - 6))} textAnchor="end" fontSize={13} fontWeight={900} fill={t.hit ? '#86efac' : '#fcd34d'}>
              {eqPlain(t)}
            </text>
          </g>
        )
      })}

      {/* yıldızlar */}
      {stars.map(([x, y], i) => (
        <g key={`s${i}`} transform={`translate(${sx(x)} ${sy(y)})`}>
          <circle r={18} fill={got[i] ? '#facc1533' : '#facc1514'} stroke={got[i] ? '#facc15' : '#facc1588'} strokeWidth={2} strokeDasharray={got[i] ? undefined : '4 4'} />
          <text textAnchor="middle" y={8} fontSize={22}>{got[i] ? '🌟' : '⭐'}</text>
          <text textAnchor="middle" y={-24} fontSize={12} fontWeight={900} fill="#fde68a">({x}, {y})</text>
        </g>
      ))}

      {/* rampa + eğim üçgeni */}
      <g>
        {ramp.run > 0 && (
          <>
            <path d={`M${sx(S.x)} ${sy(S.y)} H${sx(E.x)} V${sy(E.y)}`} fill="none" stroke="#38bdf8" strokeWidth={2.5} strokeDasharray="6 5" />
            <text x={(sx(S.x) + sx(E.x)) / 2} y={sy(S.y) + (ramp.rise >= 0 ? (ramp.n === 0 ? 38 : 18) : -9)} textAnchor="middle" fontSize={14} fontWeight={900} fill="#7dd3fc">ileri {ramp.run}</text>
            {ramp.rise !== 0 && <text x={sx(E.x) + 9} y={(sy(S.y) + sy(E.y)) / 2 + 5} fontSize={14} fontWeight={900} fill="#7dd3fc">{ramp.rise > 0 ? `yukarı ${ramp.rise}` : `aşağı ${-ramp.rise}`}</text>}
          </>
        )}
        <line x1={sx(S.x)} y1={sy(S.y)} x2={sx(E.x)} y2={sy(E.y)} stroke="#f472b6" strokeWidth={9} strokeLinecap="round" />
        {!nFree && <circle cx={sx(S.x)} cy={sy(S.y)} r={7} fill="#f472b6" stroke="#0b1220" strokeWidth={2} />}
        {nFree && (
          <g onPointerDown={down('start')} style={{ cursor: editable ? 'ns-resize' : 'default' }}>
            <circle cx={sx(S.x)} cy={sy(S.y)} r={24} fill="transparent" />
            <circle cx={sx(S.x)} cy={sy(S.y)} r={11} fill="#0b1220" stroke="#f472b6" strokeWidth={4} />
            <text x={sx(S.x) + 16} y={sy(S.y) - 12} fontSize={13} fontWeight={900} fill="#f9a8d4">n = {ramp.n}</text>
          </g>
        )}
        <g onPointerDown={down('end')} style={{ cursor: editable ? 'grab' : 'default' }}>
          <circle cx={sx(E.x)} cy={sy(E.y)} r={26} fill="transparent" />
          <circle cx={sx(E.x)} cy={sy(E.y)} r={13} fill="#f472b6" stroke="#fff" strokeWidth={3} opacity={editable ? 1 : 0.6} />
          {editable && <circle cx={sx(E.x)} cy={sy(E.y)} r={19} fill="none" stroke="#f472b6" strokeWidth={2} opacity={0.5} className="animate-pulse" />}
        </g>
      </g>

      {/* kaykaycı */}
      {skater && (
        <g transform={`translate(${sx(skater.x)} ${sy(skater.y)})`}>
          <circle r={15} fill="#f472b6" opacity={0.25} />
          <text textAnchor="middle" y={-6} fontSize={26}>🛹</text>
        </g>
      )}
    </svg>
  )
}
