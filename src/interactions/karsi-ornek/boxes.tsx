import { useRef } from 'react'
import { useDrag } from '@use-gesture/react'
import { Minus, Plus } from 'lucide-react'
import type { Grade } from '../../data/types'
import { MathText } from '../../components/MathText'
import { fmtTick, niceStep, ticks as axisTicks } from '../../interactive/axis'
import type { Box } from './claims'

/** Deney tezgâhları: değerler `a` (sayı dizisi) olarak tutulur. */

const dk = (g: Grade) => g >= 7
const key = (g: Grade, extra = '') =>
  `grid size-12 place-items-center rounded-2xl text-lg font-black transition active:scale-95 disabled:opacity-30 ${dk(g) ? 'bg-slate-700 text-white ring-1 ring-slate-500' : 'bg-white text-ink ring-1 ring-line shadow-[0_3px_0_var(--color-line)]'} ${extra}`
const panel = (g: Grade) => (dk(g) ? 'bg-slate-800/80 ring-1 ring-slate-600' : 'bg-white/85 ring-1 ring-line')
const muted = (g: Grade) => (dk(g) ? 'text-slate-400' : 'text-ink-soft')

function Step({ g, label, value, set, min, max, step = 1, color }: { g: Grade; label: string; value: number; set: (v: number) => void; min: number; max: number; step?: number; color?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`min-w-10 text-right text-xs font-black uppercase ${muted(g)}`}>{label}</span>
      <button type="button" className={key(g)} disabled={value - step < min} onClick={() => set(value - step)} aria-label={`${label} azalt`}><Minus size={20} /></button>
      <span className="min-w-10 text-center text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
      <button type="button" className={key(g)} disabled={value + step > max} onClick={() => set(value + step)} aria-label={`${label} artır`}><Plus size={20} /></button>
    </div>
  )
}

// ───────────────────────── Sayı kartları ─────────────────────────

function NumBox({ box, a, set, g }: { box: Extract<Box, { k: 'num' }>; a: number[]; set: (a: number[]) => void; g: Grade }) {
  return (
    <div className="flex w-full flex-col gap-2">
      {box.rows.map((r, ri) => (
        <div key={ri} className={`rounded-2xl p-2 ${panel(g)}`}>
          <p className={`mb-1 px-1 text-xs font-black tracking-wide uppercase ${muted(g)}`}>{r.name}</p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={r.name}>
            {r.vals.map((v, i) => {
              const on = a[ri] === i
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set(a.map((x, j) => (j === ri ? i : x)))}
                  className={`min-h-12 min-w-12 rounded-xl px-3 text-lg font-black transition active:scale-95 ${on ? (dk(g) ? 'bg-cyan-400 text-slate-900 ring-2 ring-cyan-200' : 'bg-brand text-white ring-2 ring-brand') : dk(g) ? 'bg-slate-700 text-slate-100 ring-1 ring-slate-500' : 'bg-white text-ink ring-1 ring-line'}`}
                >
                  <MathText text={v.l} />
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ───────────────────────── Tam sayı + dizilimler ─────────────────────────

function IntBox({ box, a, set, g, vis }: { box: Extract<Box, { k: 'int' }>; a: number[]; set: (a: number[]) => void; g: Grade; vis: 'arrays' | 'groups' }) {
  const n = a[0]
  const st = box.step ?? 1
  const v = (x: number) => set([Math.max(box.min, Math.min(box.max, x))])
  const pairs = Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0 && d <= n / d)
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        {st === 1 && <button type="button" className={key(g, 'w-14')} disabled={n - 10 < box.min} onClick={() => v(n - 10)}>−10</button>}
        <button type="button" className={key(g)} disabled={n - st < box.min} onClick={() => v(n - st)} aria-label="Azalt"><Minus size={20} /></button>
        <span className={`min-w-20 text-center text-5xl font-black tabular-nums ${dk(g) ? 'text-cyan-300' : 'text-brand'}`} aria-live="polite">{n}</span>
        <button type="button" className={key(g)} disabled={n + st > box.max} onClick={() => v(n + st)} aria-label="Artır"><Plus size={20} /></button>
        {st === 1 && <button type="button" className={key(g, 'w-14')} disabled={n + 10 > box.max} onClick={() => v(n + 10)}>+10</button>}
      </div>
      {vis === 'arrays' ? (
        <div className={`w-full rounded-2xl p-2 ${panel(g)}`}>
          <p className={`mb-1 text-center text-xs font-black uppercase ${muted(g)}`}>{n} noktayı eşit sıralara dizmenin yolları</p>
          <div className="flex flex-wrap items-end justify-center gap-3">
            {pairs.map((r) => {
              const c = n / r
              const cs = Math.max(4, Math.min(10, Math.floor(180 / Math.max(c, 1))))
              return (
                <div key={r} className="flex flex-col items-center">
                  <svg width={c * cs + 2} height={r * cs + 2} role="img" aria-label={`${r} × ${c}`}>
                    {Array.from({ length: r * c }, (_, k) => <circle key={k} cx={1 + (k % c) * cs + cs / 2} cy={1 + Math.floor(k / c) * cs + cs / 2} r={cs * 0.36} fill={pairs.length === 1 ? '#f59e0b' : '#3b82f6'} />)}
                  </svg>
                  <span className="text-xs font-black">{r} × {c}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className={`w-full rounded-2xl p-2 ${panel(g)}`}>
          <p className={`mb-1 text-center text-xs font-black uppercase ${muted(g)}`}>{n} nokta, 8’li sıralar</p>
          <div className="flex flex-col items-center gap-1">
            {Array.from({ length: Math.ceil(n / 8) }, (_, r) => {
              const cnt = Math.min(8, n - r * 8)
              return (
                <div key={r} className="flex gap-1">
                  {Array.from({ length: 8 }, (_, k) => (
                    <span key={k} className={`size-3.5 rounded-full ${k < cnt ? (cnt < 8 ? 'bg-amber-500' : k < 4 ? 'bg-sky-500' : 'bg-indigo-500') : dk(g) ? 'bg-slate-700' : 'bg-line'}`} />
                  ))}
                </div>
              )
            })}
          </div>
          <p className="mt-1 text-center text-xs font-bold opacity-80">Her sıra iki tane 4’lü grup. Yarım sıra kalırsa 8’e bölünmez.</p>
        </div>
      )}
    </div>
  )
}

// ───────────────────────── İki dikdörtgen ─────────────────────────

function RectGrid({ w, h, set, g, label, color }: { w: number; h: number; set: (w: number, h: number) => void; g: Grade; label: string; color: string }) {
  const svg = useRef<SVGSVGElement>(null)
  const N = 12
  const C = 18
  const at = (x: number, y: number) => {
    const r = svg.current!.getBoundingClientRect()
    const k = r.width / (N * C + 4)
    const cx = Math.ceil((x - r.left - 2 * k) / (C * k))
    const cy = Math.ceil((y - r.top - 2 * k) / (C * k))
    set(Math.max(1, Math.min(N, cx)), Math.max(1, Math.min(N, cy)))
  }
  const bind = useDrag(({ xy: [x, y], event }) => {
    event?.preventDefault?.()
    at(x, y)
  }, { filterTaps: false, eventOptions: { passive: false } })
  return (
    <div className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl p-2 ${panel(g)}`}>
      <p className="font-black" style={{ color }}>{label}: {w} × {h}</p>
      <svg ref={svg} {...bind()} viewBox={`0 0 ${N * C + 4} ${N * C + 4}`} className="w-full max-w-[230px] cursor-crosshair" style={{ touchAction: 'none' }} role="img" aria-label={`${label} dikdörtgeni ${w} × ${h}. Köşeyi ayarlamak için dokun ya da sürükle.`}>
        {Array.from({ length: N * N }, (_, k) => {
          const x = k % N, y = Math.floor(k / N)
          const inR = x < w && y < h
          return <rect key={k} x={2 + x * C} y={2 + y * C} width={C} height={C} fill={inR ? color : 'transparent'} fillOpacity={inR ? 0.75 : 0} stroke={dk(g) ? '#334155' : '#dbe3ef'} />
        })}
        <rect x={2} y={2} width={w * C} height={h * C} fill="none" stroke={color} strokeWidth={3} />
        <circle cx={2 + w * C} cy={2 + h * C} r={7} fill="#fff" stroke={color} strokeWidth={3} />
      </svg>
      <div className="flex flex-col gap-1">
        <Step g={g} label="en" value={w} set={(v) => set(v, h)} min={1} max={N} />
        <Step g={g} label="boy" value={h} set={(v) => set(w, v)} min={1} max={N} />
      </div>
      <p className="text-sm font-black tabular-nums">Alan {w * h} · Çevre {2 * (w + h)}</p>
    </div>
  )
}

// ───────────────────────── Üçgen ─────────────────────────

function TriBox({ a, set, g }: { a: number[]; set: (a: number[]) => void; g: Grade }) {
  const cols = ['#ef4444', '#22c55e', '#3b82f6']
  const names = ['a', 'b', 'c']
  const idx = [0, 1, 2].sort((i, j) => a[i] - a[j])
  const [i1, i2, i3] = idx
  const [x, y, z] = [a[i1], a[i2], a[i3]]
  const U = 22
  const ok = x + y > z
  const W = Math.max(12, z) * U + 40
  let tri
  if (ok) {
    // en uzun kenar tabanda: A(0,0) B(z,0); C: AC = y, BC = x
    const cx = (y * y - x * x + z * z) / (2 * z)
    const cy = Math.sqrt(Math.max(0, y * y - cx * cx))
    const P = (px: number, py: number) => `${20 + px * U},${200 - py * U}`
    const ang = (o: number, p: number, r: number) => Math.round((Math.acos((p * p + r * r - o * o) / (2 * p * r)) * 180) / Math.PI)
    tri = (
      <>
        <line x1={20} y1={200} x2={20 + z * U} y2={200} stroke={cols[i3]} strokeWidth={6} strokeLinecap="round" />
        <polyline points={`${P(0, 0)} ${P(cx, cy)}`} stroke={cols[i2]} strokeWidth={6} strokeLinecap="round" fill="none" />
        <polyline points={`${P(z, 0)} ${P(cx, cy)}`} stroke={cols[i1]} strokeWidth={6} strokeLinecap="round" fill="none" />
        <text x={20 + cx * U} y={200 - cy * U - 10} textAnchor="middle" fontSize={15} fontWeight={900} fill={dk(g) ? '#fde68a' : '#92400e'}>{ang(z, x, y)}°</text>
        <text x={34} y={192} fontSize={13} fontWeight={900} fill={dk(g) ? '#fde68a' : '#92400e'}>{ang(x, y, z)}°</text>
        <text x={6 + z * U} y={192} textAnchor="end" fontSize={13} fontWeight={900} fill={dk(g) ? '#fde68a' : '#92400e'}>{ang(y, x, z)}°</text>
      </>
    )
  } else {
    tri = (
      <>
        <line x1={20} y1={200} x2={20 + z * U} y2={200} stroke={cols[i3]} strokeWidth={6} strokeLinecap="round" />
        <line x1={20} y1={200} x2={20 + y * U * 0.97} y2={200 - y * U * 0.24} stroke={cols[i2]} strokeWidth={6} strokeLinecap="round" />
        <line x1={20 + z * U} y1={200} x2={20 + z * U - x * U * 0.97} y2={200 - x * U * 0.24} stroke={cols[i1]} strokeWidth={6} strokeLinecap="round" />
        <text x={20 + (z * U) / 2} y={120} textAnchor="middle" fontSize={16} fontWeight={900} fill="#e11d48">Uçlar buluşmuyor!</text>
      </>
    )
  }
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <svg viewBox={`0 0 ${W} 215`} className="w-full max-w-[520px]" role="img" aria-label={ok ? 'Üçgen oluştu' : 'Üçgen oluşmadı'}>{tri}</svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
        {[0, 1, 2].map((i) => <Step key={i} g={g} label={names[i]} value={a[i]} set={(v) => set(a.map((t, j) => (j === i ? v : t)))} min={1} max={14} color={cols[i]} />)}
      </div>
    </div>
  )
}

// ───────────────────────── İki kesir ─────────────────────────

function FracBar({ n, d, color, g }: { n: number; d: number; color: string; g: Grade }) {
  return (
    <svg viewBox="0 0 302 34" className="w-full" role="img" aria-label={`${d}’de ${n}`}>
      {Array.from({ length: d }, (_, i) => <rect key={i} x={1 + (i * 300) / d} y={1} width={300 / d} height={32} fill={i < n ? color : dk(g) ? '#1e293b' : '#fff'} stroke={dk(g) ? '#64748b' : '#1f2340'} strokeWidth={1.5} />)}
    </svg>
  )
}

function Frac2Box({ a, set, g }: { a: number[]; set: (a: number[]) => void; g: Grade }) {
  const cols = ['#3b82f6', '#d6457a']
  return (
    <div className="flex w-full flex-col gap-2">
      {[0, 1].map((k) => (
        <div key={k} className={`flex flex-col gap-2 rounded-2xl p-2 ${panel(g)}`}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="text-3xl font-black" style={{ color: cols[k] }}><MathText text={`[[${a[2 * k]}/${a[2 * k + 1]}]]`} /></span>
            <Step g={g} label="pay" value={a[2 * k]} set={(v) => set(a.map((t, j) => (j === 2 * k ? v : t)))} min={1} max={a[2 * k + 1]} color={cols[k]} />
            <Step g={g} label="payda" value={a[2 * k + 1]} set={(v) => set(a.map((t, j) => (j === 2 * k + 1 ? v : j === 2 * k ? Math.min(t, v) : t)))} min={2} max={12} color={cols[k]} />
          </div>
          <FracBar n={a[2 * k]} d={a[2 * k + 1]} color={cols[k]} g={g} />
        </div>
      ))}
    </div>
  )
}

// ───────────────────────── Dağıtıcı ─────────────────────────

export function BoxView({ box, a, set, g }: { box: Box; a: number[]; set: (a: number[]) => void; g: Grade }) {
  switch (box.k) {
    case 'num':
      return <NumBox box={box} a={a} set={set} g={g} />
    case 'int':
      return <IntBox box={box} a={a} set={set} g={g} vis={box.vis ?? 'arrays'} />
    case 'rect2':
      return (
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <RectGrid g={g} label="A" color="#3b82f6" w={a[0]} h={a[1]} set={(w, h) => set([w, h, a[2], a[3]])} />
          <RectGrid g={g} label="B" color="#d6457a" w={a[2]} h={a[3]} set={(w, h) => set([a[0], a[1], w, h])} />
        </div>
      )
    case 'tri':
      return <TriBox a={a} set={set} g={g} />
    case 'frac2':
      return <Frac2Box a={a} set={set} g={g} />
  }
}

// ───────────────────────── Sayı doğrusu ─────────────────────────

export function MiniLine({ pts, g }: { pts: { l: string; v: number; c?: string }[]; g: Grade }) {
  const vs = pts.map((p) => p.v)
  let lo = Math.min(0, ...vs)
  let hi = Math.max(1, ...vs)
  const pad = (hi - lo) * 0.12 || 1
  lo -= pad
  hi += pad
  const W = 520
  const step = niceStep(hi - lo, W - 40, 60)
  const X = (v: number) => 20 + ((v - lo) / (hi - lo)) * (W - 40)
  const ticks = axisTicks(lo, hi, step)
  const ink = dk(g) ? '#cbd5e1' : '#1f2340'
  return (
    <svg viewBox={`0 0 ${W} 72`} className="w-full" role="img" aria-label={pts.map((p) => `${p.l} = ${p.v}`).join(', ')}>
      <line x1={10} x2={W - 10} y1={40} y2={40} stroke={ink} strokeWidth={2} />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={X(t)} x2={X(t)} y1={35} y2={45} stroke={ink} strokeWidth={t === 0 ? 2.5 : 1} />
          <text x={X(t)} y={62} fontSize={12} fontWeight={800} textAnchor="middle" fill={ink}>{fmtTick(t, step)}</text>
        </g>
      ))}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={X(p.v)} cy={40} r={8} fill={p.c ?? '#d6457a'} stroke="#fff" strokeWidth={2} />
          <text x={X(p.v)} y={i > 0 && Math.abs(X(p.v) - X(pts[0].v)) < 44 ? 10 : 24} fontSize={12} fontWeight={900} textAnchor="middle" fill={p.c ?? '#d6457a'}>{p.l}</text>
        </g>
      ))}
    </svg>
  )
}
