import type { ReactNode } from 'react'
import { DragPoint, Plane, usePlane } from '../../../interactive/Plane'
import { clamp } from '../../../interactive/axis'
import type { SimRow } from './sim'
import { fmt } from './util'

/** Plane’i koyu sahnede bir "veri ekranı" çerçevesine koyar */
export function Screen({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[22px] bg-slate-950/80 p-2 text-ink [&_p.text-center]:text-slate-400 ring-1 ring-cyan-400/25 shadow-[0_0_30px_rgb(34_211_238/0.08)]">
      <div className="mb-1.5 flex items-center justify-between gap-2 px-2 pt-1">
        <p className="flex items-center gap-2 text-[11px] font-black tracking-widest text-cyan-300 uppercase"><span className="size-2 rounded-full bg-cyan-400 uk-pulse" />{title}</p>
        {right}
      </div>
      {children}
    </div>
  )
}

// ───────────────────────── Simülasyon grafiği ─────────────────────────

export type Series = 'o2' | 'pop' | 'food' | 'inside'
export const SERIES: Record<Series, { label: string; unit: string; color: string; range: [number, number]; safe?: [number, number] }> = {
  o2: { label: 'Oksijen', unit: '%', color: '#0284c7', range: [16, 26], safe: [19, 23] },
  pop: { label: 'Nüfus', unit: 'kişi', color: '#7c3aed', range: [0, 14] },
  food: { label: 'Yiyecek stoku', unit: 'kg', color: '#16a34a', range: [-10, 40] },
  inside: { label: 'Üs içi sıcaklık', unit: '°C', color: '#ea580c', range: [0, 26], safe: [15, 26] },
}

function SeriesLayer({ rows, s }: { rows: SimRow[]; s: Series }) {
  const P = usePlane()
  const cfg = SERIES[s]
  const pts = rows.map((r) => [r.sol, r[s] ?? 0] as const)
  const sw = P.width
  return (
    <g>
      {cfg.safe && (
        <g>
          <rect x={0} width={sw} y={P.sy(cfg.safe[1])} height={Math.max(0, P.sy(cfg.safe[0]) - P.sy(cfg.safe[1]))} fill="#22c55e" opacity={0.1} />
          <line x1={0} x2={sw} y1={P.sy(cfg.safe[0])} y2={P.sy(cfg.safe[0])} stroke="#16a34a" strokeDasharray="6 5" strokeWidth={1.5} />
          {s === 'o2' && <line x1={0} x2={sw} y1={P.sy(cfg.safe[1])} y2={P.sy(cfg.safe[1])} stroke="#16a34a" strokeDasharray="6 5" strokeWidth={1.5} />}
          <text x={sw - 8} y={P.sy(cfg.safe[0]) - 6} textAnchor="end" fontSize={11} fontWeight={900} fill="#15803d">güvenli bölge</text>
        </g>
      )}
      {s === 'food' && <line x1={0} x2={sw} y1={P.sy(0)} y2={P.sy(0)} stroke="#dc2626" strokeWidth={1.5} strokeDasharray="4 4" />}
      {pts.length > 1 && <polyline points={pts.map(([x, y]) => `${P.sx(x)},${P.sy(y)}`).join(' ')} fill="none" stroke={cfg.color} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" />}
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={P.sx(x)} cy={P.sy(y)} r={i === pts.length - 1 ? 6 : 4} fill={cfg.color} stroke="#fff" strokeWidth={2} />
          {i === pts.length - 1 && (
            <text x={P.sx(x) + (x > 8 ? -8 : 8)} y={P.sy(y) - 10} textAnchor={x > 8 ? 'end' : 'start'} fontSize={13} fontWeight={900} fill={cfg.color} stroke="#fff" strokeWidth={3} paintOrder="stroke">{cfg.unit === '%' ? `%${fmt(y, 1)}` : `${fmt(y, 1)} ${cfg.unit}`}</text>
          )}
        </g>
      ))}
    </g>
  )
}

export function SimChart({ rows, series, sols, fail }: { rows: SimRow[]; series: Series; sols: number; fail?: number }) {
  const cfg = SERIES[series]
  const vals = rows.map((r) => r[series] ?? 0)
  const lo = Math.min(cfg.range[0], ...vals.map((v) => Math.floor(v - 1)))
  const hi = Math.max(cfg.range[1], ...vals.map((v) => Math.ceil(v + 1)))
  return (
    <Plane key={`${series}-${lo}-${hi}`} initial={{ xMin: -0.7, xMax: sols + 0.7, yMin: lo, yMax: hi }} aspect={0.44} equalUnits={false} controls={false} minSpan={2} maxSpan={30} fixedStep={1} xLabel="sol" yLabel={`${cfg.label} (${cfg.unit})`} label={`${cfg.label} grafiği`}>
      {fail !== undefined && <FailBand sol={fail} />}
      <SeriesLayer rows={rows} s={series} />
    </Plane>
  )
}

function FailBand({ sol }: { sol: number }) {
  const P = usePlane()
  return <rect x={P.sx(sol - 0.5)} width={P.unitPx} y={0} height={P.height} fill="#f43f5e" opacity={0.12} />
}

// ───────────────────────── Sütun grafiği kurma ─────────────────────────

export function BarBuilder({ values, onChange, max, unit, locked, names, marked }: { values: number[]; onChange: (v: number[]) => void; max: number; unit: string; locked?: boolean; names: string[]; marked?: number[] }) {
  const n = values.length
  const set = (i: number, v: number) => {
    if (locked) return
    const next = [...values]
    next[i] = clamp(Math.round(v), 0, max)
    if (next[i] !== values[i]) onChange(next)
  }
  return (
    <Plane initial={{ xMin: 0.3, xMax: n + 0.7, yMin: -1.6, yMax: max + 1 }} aspect={0.62} equalUnits={false} controls={false} locked={locked} minSpan={2} maxSpan={12} fixedStep={1} yLabel={unit} label="Sütun grafiği" onTap={(p) => {
      const i = Math.round(p.x) - 1
      if (i >= 0 && i < n && Math.abs(p.x - (i + 1)) < 0.45) set(i, p.y)
    }}>
      <Bars values={values} names={names} marked={marked} />
      {!locked && values.map((v, i) => (
        <DragPoint key={i} x={i + 1} y={v} r={13} color="#f59e0b" onChange={(p) => set(i, p.y)} constrain={(p) => ({ x: i + 1, y: p.y })} />
      ))}
    </Plane>
  )
}

function Bars({ values, names, marked }: { values: number[]; names: string[]; marked?: number[] }) {
  const P = usePlane()
  const bw = Math.min(P.unitPx * 0.56, 90)
  return (
    <g>
      {values.map((v, i) => {
        const x = P.sx(i + 1) - bw / 2
        const y0 = P.sy(0), y1 = P.sy(v)
        const on = marked?.includes(i)
        return (
          <g key={i}>
            <rect x={x} y={Math.min(y0, y1)} width={bw} height={Math.abs(y0 - y1)} rx={6} fill={on ? '#16a34a' : '#22c55e'} stroke={on ? '#fde047' : '#15803d'} strokeWidth={on ? 3 : 1.5} />
            {v > 0 && <text x={P.sx(i + 1)} y={y1 - 20} textAnchor="middle" fontSize={13} fontWeight={900} fill="#166534">{v}</text>}
            <text x={P.sx(i + 1)} y={y0 + 34} textAnchor="middle" fontSize={12} fontWeight={900} fill="#1f2340">{names[i]}</text>
          </g>
        )
      })}
    </g>
  )
}

// ───────────────────────── Ortalama: dengeleme çizgisi ─────────────────────────

export function LevelChart({ values, line, onLine, step, unit, locked, yRange }: { values: number[]; line: number; onLine: (v: number) => void; step: number; unit: string; locked?: boolean; yRange: [number, number] }) {
  const n = values.length
  const snapV = (v: number) => clamp(Math.round(v / step) * step, yRange[0], yRange[1])
  return (
    <Plane initial={{ xMin: 0.2, xMax: n + 1.3, yMin: yRange[0], yMax: yRange[1] }} aspect={0.62} equalUnits={false} controls={false} minSpan={2} maxSpan={20} fixedStep={1} xLabel="sol" yLabel={unit} label="Ortalama grafiği" onTap={(p) => !locked && onLine(snapV(p.y))}>
      <LevelLayer values={values} line={line} />
      {!locked && <DragPoint x={n + 0.75} y={line} r={14} color="#f97316" onChange={(p) => onLine(snapV(p.y))} constrain={(p) => ({ x: n + 0.75, y: p.y })} />}
    </Plane>
  )
}

function LevelLayer({ values, line }: { values: number[]; line: number }) {
  const P = usePlane()
  const bw = Math.min(P.unitPx * 0.6, 80)
  const neg = values.every((v) => v <= 0)
  return (
    <g>
      {values.map((v, i) => {
        const x = P.sx(i + 1) - bw / 2
        const top = Math.min(P.sy(0), P.sy(v)), h = Math.abs(P.sy(0) - P.sy(v))
        const over = neg ? v < line : v > line
        const a = P.sy(Math.max(v, line)), b = P.sy(Math.min(v, line))
        return (
          <g key={i}>
            <rect x={x} y={top} width={bw} height={h} rx={5} fill={neg ? '#60a5fa' : '#22d3ee'} opacity={0.85} />
            {Math.abs(v - line) > 1e-9 && (
              <rect x={x} y={a} width={bw} height={b - a} fill={over ? '#22c55e' : '#f59e0b'} opacity={over ? 0.85 : 0.35} stroke={over ? '#15803d' : '#b45309'} strokeDasharray={over ? undefined : '4 3'} strokeWidth={1.5} />
            )}
            <text x={P.sx(i + 1)} y={neg ? P.sy(v) + 16 : P.sy(v) - 6} textAnchor="middle" fontSize={12} fontWeight={900} fill="#1f2340">{fmt(v)}</text>
            {neg && <text x={P.sx(i + 1)} y={P.sy(0) - 7} textAnchor="middle" fontSize={11} fontWeight={900} fill="#64748b">{i + 1}. sol</text>}
          </g>
        )
      })}
      <line x1={P.sx(0.4)} x2={P.sx(values.length + 0.75)} y1={P.sy(line)} y2={P.sy(line)} stroke="#f97316" strokeWidth={3} />
      <text x={P.sx(0.45)} y={P.sy(line) - 6} fontSize={12} fontWeight={900} fill="#c2410c" stroke="#fff" strokeWidth={3} paintOrder="stroke">{fmt(line)}</text>
    </g>
  )
}

// ───────────────────────── Orantı grafiği ─────────────────────────

export interface PlotSet {
  name: string
  color: string
  pts: [number, number][]
}

export function PropPlot({ sets, plotted, onTap, done }: { sets: PlotSet[]; plotted: string[]; onTap: (p: { x: number; y: number }) => void; done: boolean }) {
  return (
    <Plane initial={{ xMin: -0.6, xMax: 9.6, yMin: -12, yMax: 150 }} aspect={0.62} equalUnits={false} controls={false} minSpan={2} maxSpan={30} xLabel="alan (m²)" yLabel="oksijen (L)" label="Sera verisi grafiği" onTap={onTap}>
      <PropLayer sets={sets} plotted={plotted} done={done} />
    </Plane>
  )
}

function PropLayer({ sets, plotted, done }: { sets: PlotSet[]; plotted: string[]; done: boolean }) {
  const P = usePlane()
  return (
    <g>
      {sets.map((s, si) => {
        const all = s.pts.every((p) => plotted.includes(`${si}:${p[0]}`))
        const [a, b] = [s.pts[0], s.pts[s.pts.length - 1]]
        const m = (b[1] - a[1]) / (b[0] - a[0])
        const c = a[1] - m * a[0]
        return (
          <g key={si}>
            {all && <line x1={P.sx(0)} y1={P.sy(c)} x2={P.sx(9)} y2={P.sy(c + m * 9)} stroke={s.color} strokeWidth={2.5} strokeDasharray={done ? undefined : '7 5'} opacity={0.85} />}
            {all && <circle cx={P.sx(0)} cy={P.sy(c)} r={6} fill="#fff" stroke={s.color} strokeWidth={3} />}
            {s.pts.map(([x, y]) =>
              plotted.includes(`${si}:${x}`) ? (
                <g key={x} className="animate-pop">
                  <circle cx={P.sx(x)} cy={P.sy(y)} r={8} fill={s.color} stroke="#fff" strokeWidth={2.5} />
                  <text x={P.sx(x) + 10} y={P.sy(y) + (si === 0 ? -8 : 18)} fontSize={12} fontWeight={900} fill={s.color} stroke="#fff" strokeWidth={3} paintOrder="stroke">({x}, {y})</text>
                </g>
              ) : null,
            )}
          </g>
        )
      })}
    </g>
  )
}

// ───────────────────────── Sıcaklık doğrusu ─────────────────────────

export function ThermoLine({ marks, onTap, onDrag, show }: { marks: { id: string; v: number | null; color: string; label: string }[]; onTap: (x: number) => void; onDrag: (id: string, x: number) => void; show: boolean }) {
  return (
    <Plane mode="x" initial={{ xMin: -95, xMax: 35, yMin: -1, yMax: 1 }} minSpan={10} maxSpan={300} label="Sıcaklık sayı doğrusu (°C)" onTap={(p) => onTap(Math.round(p.x))}>
      <ThermoLayer marks={marks} show={show} />
      {marks.map((m) => m.v !== null && <DragPoint key={m.id} x={m.v} y={0} r={12} color={m.color} label={m.label} onChange={(p) => onDrag(m.id, Math.round(p.x))} />)}
    </Plane>
  )
}

function ThermoLayer({ marks, show }: { marks: { v: number | null; color: string }[]; show: boolean }) {
  const P = usePlane()
  const y = P.sy(0)
  const zero = P.sx(0)
  const [a, b] = marks.map((m) => m.v)
  return (
    <g>
      <rect x={0} y={y - 4} width={Math.max(0, zero)} height={8} fill="#60a5fa" opacity={0.35} />
      <rect x={zero} y={y - 4} width={Math.max(0, P.width - zero)} height={8} fill="#fb923c" opacity={0.35} />
      {show && a !== null && b !== null && a !== undefined && b !== undefined && (
        <g>
          <path d={`M${P.sx(a)} ${y - 18} Q ${(P.sx(a) + P.sx(b)) / 2} ${y - 70} ${P.sx(b)} ${y - 18}`} fill="none" stroke="#7c3aed" strokeWidth={3} strokeDasharray="6 4" />
          <path d={`M${P.sx(a)} ${y - 18} Q ${(P.sx(a) + zero) / 2} ${y - 45} ${zero} ${y - 18}`} fill="none" stroke="#2563eb" strokeWidth={2} opacity={0.7} />
          <path d={`M${zero} ${y - 18} Q ${(P.sx(b) + zero) / 2} ${y - 45} ${P.sx(b)} ${y - 18}`} fill="none" stroke="#ea580c" strokeWidth={2} opacity={0.7} />
          <text x={(P.sx(a) + P.sx(b)) / 2} y={y - 50} textAnchor="middle" fontSize={14} fontWeight={900} fill="#7c3aed" stroke="#fff" strokeWidth={3} paintOrder="stroke">? °C</text>
        </g>
      )}
    </g>
  )
}
