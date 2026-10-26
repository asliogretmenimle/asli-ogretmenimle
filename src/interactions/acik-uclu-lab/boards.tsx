import { useRef, useState, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'
import { Eraser, Minus, Plus } from 'lucide-react'
import type { Grade } from '../../data/types'
import { MathText } from '../../components/MathText'
import { ek } from '../../lib/generators'
import { Stepper, fmtN, fmtQ, q, qAdd, qSub, qDiv, qMul, type Look } from '../islem-zinciri/kit'

/**
 * 76. Açık Uçlu Problem Laboratuvarı — deney tezgâhları (sandbox).
 * Her tezgâh kendi durumunu tutar ve “Galeriye ekle” ile bir Ans gönderir.
 */

export type Ans =
  | { k: 'cells'; pts: [number, number][] }
  | { k: 'rect'; w: number; h: number }
  | { k: 'nums'; v: number[] }
  | { k: 'fracs'; f: [number, number][] }
  | { k: 'pts'; a: [number, number]; b: [number, number] }

export type NumView =
  | { t: 'tape'; target: number }
  | { t: 'line'; min: number; max: number; target: number }
  | { t: 'dots'; min: number; max: number; median?: boolean }
  | { t: 'bag' }
  | { t: 'prism' }
  | { t: 'tri' }
  | { t: 'root' }
  | { t: 'area' }
  | { t: 'lcm'; upto: number }
  | { t: 'gcd' }
  | { t: 'expr' }

export type Sandbox =
  | { k: 'cells'; cols: number; rows: number }
  | { k: 'rect'; maxW: number; maxH: number; beads?: boolean; init: [number, number] }
  | { k: 'nums'; init: number[]; min: number; max: number; labels: string[]; view: NumView }
  | { k: 'fracs'; init: [number, number][]; maxDen: number; fixedDen?: number; view: 'sum' | 'half' }
  | { k: 'pts'; range: number; fixedA?: [number, number] }

// ───────────────────────── yardımcılar ─────────────────────────

export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))
export const lcm = (a: number, b: number) => (a * b) / gcd(a, b)
/** negatifse parantezli yazım */
export const sg = (n: number) => (n < 0 ? `(${fmtN(n)})` : fmtN(n))

const key = (s: string) => s

/** Çokominonun dönme/yansımaya göre değişmeyen anahtarı */
export function canon(pts: [number, number][]): string {
  const tf: ((x: number, y: number) => [number, number])[] = [
    (x, y) => [x, y], (x, y) => [-x, y], (x, y) => [x, -y], (x, y) => [-x, -y],
    (x, y) => [y, x], (x, y) => [-y, x], (x, y) => [y, -x], (x, y) => [-y, -x],
  ]
  let best = ''
  for (const f of tf) {
    const p = pts.map(([x, y]) => f(x, y))
    const mx = Math.min(...p.map((c) => c[0]))
    const my = Math.min(...p.map((c) => c[1]))
    const s = p.map(([x, y]) => `${x - mx},${y - my}`).sort().join(';')
    if (!best || s < best) best = s
  }
  return key(best)
}
export function connected(pts: [number, number][]) {
  if (!pts.length) return false
  const set = new Set(pts.map(([x, y]) => `${x},${y}`))
  const seen = new Set<string>([`${pts[0][0]},${pts[0][1]}`])
  const stack = [pts[0]]
  while (stack.length) {
    const [x, y] = stack.pop()!
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${y + dy}`
      if (set.has(k) && !seen.has(k)) {
        seen.add(k)
        stack.push([x + dx, y + dy])
      }
    }
  }
  return seen.size === pts.length
}
export function perimeter(pts: [number, number][]) {
  const set = new Set(pts.map(([x, y]) => `${x},${y}`))
  let p = 0
  for (const [x, y] of pts) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!set.has(`${x + dx},${y + dy}`)) p++
  return p
}

/** Galeri için küçük çokomino çizimi */
export function MiniCells({ pts, color = '#d6457a' }: { pts: [number, number][]; color?: string }) {
  const mx = Math.min(...pts.map((p) => p[0])), my = Math.min(...pts.map((p) => p[1]))
  const W = Math.max(...pts.map((p) => p[0])) - mx + 1, H = Math.max(...pts.map((p) => p[1])) - my + 1
  const s = 10
  return (
    <svg viewBox={`-1 -1 ${W * s + 2} ${H * s + 2}`} className="h-12 w-auto max-w-full" aria-hidden>
      {pts.map(([x, y], i) => <rect key={i} x={(x - mx) * s} y={(y - my) * s} width={s} height={s} fill={color} stroke="#fff" strokeWidth={1} />)}
    </svg>
  )
}
export function MiniRect({ w, h, beads }: { w: number; h: number; beads?: boolean }) {
  const s = Math.min(10, 120 / Math.max(w, h))
  return (
    <svg viewBox={`-1 -1 ${w * s + 2} ${h * s + 2}`} className="h-12 w-auto max-w-full" aria-hidden>
      {beads
        ? Array.from({ length: w * h }, (_, i) => <circle key={i} cx={(i % w) * s + s / 2} cy={Math.floor(i / w) * s + s / 2} r={s * 0.38} fill="#f97316" />)
        : <rect x={0} y={0} width={w * s} height={h * s} fill="#d6457a" opacity={0.85} rx={1} />}
    </svg>
  )
}

const palette = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#eab308', '#ec4899']

function colors(dark: boolean) {
  return {
    accent: dark ? '#22d3ee' : '#d6457a',
    accentSoft: dark ? '#164e63' : '#fde3ec',
    grid: dark ? '#475569' : '#d9dbea',
    cell: dark ? '#1e293b' : '#ffffff',
    ink: dark ? '#e2e8f0' : '#1f2340',
    soft: dark ? '#94a3b8' : '#8a8fb0',
    good: '#22c55e',
    warn: '#f59e0b',
  }
}

/** Tezgâh alt çubuğu: canlı ölçüm + Galeriye ekle + temizle */
function Bench({ look, readout, onAdd, onClear, children, big }: { look: Look; readout?: ReactNode; onAdd: () => void; onClear?: () => void; children: ReactNode; big?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {children}
      {readout && <div className={`rounded-2xl px-4 py-2 text-center text-base font-black sm:text-lg ${look.soft} ${look.strong}`} aria-live="polite">{readout}</div>}
      <div className="flex gap-2">
        <button type="button" onClick={onAdd} className={`btn-primary flex-1 ${big ? 'min-h-14 text-lg' : 'min-h-12'}`}>
          <Plus size={20} strokeWidth={3} />Galeriye ekle
        </button>
        {onClear && (
          <button type="button" onClick={onClear} className={`btn-ghost ${big ? 'min-h-14' : 'min-h-12'} px-4`} aria-label="Tezgâhı temizle">
            <Eraser size={18} />
            <span className="max-sm:hidden">Temizle</span>
          </button>
        )}
      </div>
    </div>
  )
}

// ───────────────────────── Kareli tezgâh (çokomino) ─────────────────────────

export function CellsBench({ box, look, grade, onSubmit }: { box: Extract<Sandbox, { k: 'cells' }>; look: Look; grade: Grade; onSubmit: (a: Ans) => void }) {
  const { cols, rows } = box
  const C = colors(look.dark)
  const [on, setOn] = useState<boolean[]>(() => Array(cols * rows).fill(false))
  const onRef = useRef(on)
  onRef.current = on
  const ref = useRef<HTMLDivElement>(null)
  const at = (x: number, y: number) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return -1
    const cx = Math.floor(((x - r.left) / r.width) * cols)
    const cy = Math.floor(((y - r.top) / r.height) * rows)
    return cx < 0 || cy < 0 || cx >= cols || cy >= rows ? -1 : cy * cols + cx
  }
  const bind = useDrag(
    ({ xy: [x, y], memo, event }) => {
      event?.preventDefault?.()
      const i = at(x, y)
      const m: { mode: boolean; seen: Set<number> } = memo ?? { mode: i >= 0 ? !onRef.current[i] : true, seen: new Set<number>() }
      if (i >= 0 && !m.seen.has(i)) {
        m.seen.add(i)
        setOn((o) => {
          if (o[i] === m.mode) return o
          const c = o.slice()
          c[i] = m.mode
          return c
        })
      }
      return m
    },
    { eventOptions: { passive: false } },
  )
  const pts = on.flatMap((v, i) => (v ? [[i % cols, Math.floor(i / cols)] as [number, number]] : []))
  const S = 40
  return (
    <Bench
      look={look}
      big={grade <= 3}
      readout={pts.length ? <>Alan: {pts.length} birimkare · Çevre: {perimeter(pts)} birim</> : <span className={look.muted}>Kareleri boyamak için dokun ya da parmağını sürükle.</span>}
      onAdd={() => onSubmit({ k: 'cells', pts })}
      onClear={() => setOn(Array(cols * rows).fill(false))}
    >
      <div ref={ref} {...bind()} className="mx-auto w-full max-w-[560px] cursor-pointer" style={{ touchAction: 'none' }} data-board="cells">
        <svg viewBox={`0 0 ${cols * S} ${rows * S}`} className="block h-auto w-full" style={{ touchAction: 'none' }} role="img" aria-label={`Kareli tezgâh, ${pts.length} kare boyalı`}>
          {on.map((v, i) => (
            <rect key={i} x={(i % cols) * S + 1.5} y={Math.floor(i / cols) * S + 1.5} width={S - 3} height={S - 3} rx={5} fill={v ? C.accent : C.cell} stroke={v ? C.accent : C.grid} strokeWidth={1.5} />
          ))}
        </svg>
      </div>
    </Bench>
  )
}

// ───────────────────────── Dikdörtgen / dizilim tezgâhı ─────────────────────────

export function RectBench({ box, look, grade, onSubmit }: { box: Extract<Sandbox, { k: 'rect' }>; look: Look; grade: Grade; onSubmit: (a: Ans) => void }) {
  const { maxW, maxH, beads } = box
  const C = colors(look.dark)
  const [w, setW] = useState(box.init[0])
  const [h, setH] = useState(box.init[1])
  const ref = useRef<HTMLDivElement>(null)
  const bind = useDrag(
    ({ xy: [x, y], event }) => {
      event?.preventDefault?.()
      const r = ref.current?.getBoundingClientRect()
      if (!r) return
      const cx = Math.floor(((x - r.left) / r.width) * maxW)
      const cy = Math.floor(((y - r.top) / r.height) * maxH)
      setW(Math.min(maxW, Math.max(1, cx + 1)))
      setH(Math.min(maxH, Math.max(1, cy + 1)))
    },
    { eventOptions: { passive: false } },
  )
  const S = 30
  return (
    <Bench
      look={look}
      big={grade <= 3}
      readout={beads ? <>{h} sıra × {w} boncuk = {w * h} boncuk</> : <>{w} × {h} · Alan: {w * h} birimkare · Çevre: {2 * (w + h)} birim</>}
      onAdd={() => onSubmit({ k: 'rect', w, h })}
    >
      <div ref={ref} {...bind()} className="mx-auto w-full max-w-[600px] cursor-crosshair" style={{ touchAction: 'none' }} data-board="rect">
        <svg viewBox={`0 0 ${maxW * S} ${maxH * S}`} className="block h-auto w-full" style={{ touchAction: 'none' }} role="img" aria-label={beads ? `${h} sıra, her sırada ${w} boncuk` : `${w} × ${h} dikdörtgen`}>
          {Array.from({ length: maxW * maxH }, (_, i) => {
            const x = i % maxW, y = Math.floor(i / maxW)
            const inR = x < w && y < h
            return beads ? (
              <circle key={i} cx={x * S + S / 2} cy={y * S + S / 2} r={inR ? S * 0.36 : S * 0.1} fill={inR ? '#f97316' : C.grid} />
            ) : (
              <rect key={i} x={x * S + 1} y={y * S + 1} width={S - 2} height={S - 2} rx={3} fill={inR ? C.accent : C.cell} stroke={inR ? C.accent : C.grid} />
            )
          })}
          {!beads && <rect x={1} y={1} width={w * S - 2} height={h * S - 2} fill="none" stroke={C.ink} strokeWidth={3} rx={3} />}
          <circle cx={w * S} cy={h * S} r={11} fill="#fff" stroke={C.ink} strokeWidth={3} />
        </svg>
      </div>
      <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-2">
        <Stepper look={look} value={w} onChange={setW} min={1} max={maxW} label={beads ? 'Bir sıradaki boncuk' : 'Genişlik'} />
        <Stepper look={look} value={h} onChange={setH} min={1} max={maxH} label={beads ? 'Sıra sayısı' : 'Yükseklik'} />
      </div>
    </Bench>
  )
}

// ───────────────────────── Sayı tezgâhı ─────────────────────────

function VStep({ look, value, onChange, min, max, label, color }: { look: Look; value: number; onChange: (v: number) => void; min: number; max: number; label?: string; color?: string }) {
  const sz = look.big ? 'h-14 w-14' : 'h-12 w-12'
  return (
    <div className="flex flex-col items-center gap-1">
      {label && <span className={`max-w-20 truncate text-[11px] font-black uppercase ${look.muted}`}>{label}</span>}
      <button type="button" aria-label={`${label ?? ''} artır`} disabled={value >= max} onClick={() => onChange(value + 1)} className={`grid ${sz} place-items-center rounded-2xl transition active:scale-95 disabled:opacity-30 ${look.key}`}><Plus size={20} strokeWidth={3} /></button>
      <span className="grid min-w-12 place-items-center rounded-xl px-1 py-0.5 text-2xl font-black tabular-nums" style={{ color }} aria-live="polite">{fmtN(value)}</span>
      <button type="button" aria-label={`${label ?? ''} azalt`} disabled={value <= min} onClick={() => onChange(value - 1)} className={`grid ${sz} place-items-center rounded-2xl transition active:scale-95 disabled:opacity-30 ${look.key}`}><Minus size={20} strokeWidth={3} /></button>
    </div>
  )
}

export function NumsBench({ box, look, grade, onSubmit }: { box: Extract<Sandbox, { k: 'nums' }>; look: Look; grade: Grade; onSubmit: (a: Ans) => void }) {
  const [v, setV] = useState<number[]>(box.init)
  const set = (i: number, x: number) => setV((o) => o.map((y, j) => (j === i ? Math.max(box.min, Math.min(box.max, x)) : y)))
  const view = box.view
  const C = colors(look.dark)
  const steppers =
    v.length >= 4 ? (
      <div className="flex flex-wrap justify-center gap-2">
        {v.map((x, i) => <VStep key={i} look={look} value={x} onChange={(y) => set(i, y)} min={box.min} max={box.max} label={box.labels[i]} color={palette[i % palette.length]} />)}
      </div>
    ) : (
      <div className="flex flex-wrap items-start justify-center gap-x-5 gap-y-3">
        {v.map((x, i) => <Stepper key={i} look={look} value={x} onChange={(y) => set(i, y)} min={box.min} max={box.max} label={box.labels[i]} />)}
      </div>
    )
  return (
    <Bench look={look} big={grade <= 3} readout={<MathText text={numReadout(view, v)} />} onAdd={() => onSubmit({ k: 'nums', v })}>
      <div className="mx-auto w-full max-w-[560px]">{renderNumView(view, v, C, set)}</div>
      {steppers}
    </Bench>
  )
}

function numReadout(view: NumView, v: number[]): string {
  const [a, b, c] = v
  const sum = v.reduce((s, x) => s + x, 0)
  switch (view.t) {
    case 'tape':
      return `${v.map(fmtN).join(' + ')} = ${fmtN(sum)}`
    case 'line':
      return `${fmtN(a)} + ${sg(b)} = ${fmtN(a + b)}`
    case 'dots': {
      const s = [...v].sort((x, y) => x - y)
      return `Toplam: ${fmtN(sum)} · Ortalama: ${fmtN(sum)} ÷ ${v.length} = ${fmtN(Math.round((sum / v.length) * 100) / 100)}${view.median ? ` · Ortanca: ${fmtN(s[Math.floor(s.length / 2)])}` : ''}`
    }
    case 'bag':
      return a + b === 0 ? 'Torba boş' : `Kırmızı çekme olasılığı: [[${a}/${a + b}]]${gcd(a, a + b) > 1 && a > 0 ? ` = ${fmtQ(q(a, a + b), 'frac')}` : ''}`
    case 'prism':
      return `Hacim: ${a} × ${b} × ${c} = ${fmtN(a * b * c)} · Yüzey alanı: ${fmtN(2 * (a * b + b * c + a * c))}`
    case 'tri':
      return `a^{2} + b^{2} = ${fmtN(a * a)} + ${fmtN(b * b)} = ${fmtN(a * a + b * b)} · c^{2} = ${fmtN(c * c)}`
    case 'root':
      return `√{${a}} ≈ ${fmtN(Math.round(Math.sqrt(a) * 100) / 100, 2)}`
    case 'area':
      return `${a} × ${b} = ${fmtN(a * b)}`
    case 'lcm':
      return `EKOK(${a}, ${b}) = ${lcm(a, b)}`
    case 'gcd':
      return `EBOB(${a}, ${b}) = ${gcd(a, b)}`
    case 'expr':
      return `${a} + ${b} × ${c} = ${a} + ${b * c} = ${a + b * c}`
  }
}

type Col = ReturnType<typeof colors>

function renderNumView(view: NumView, v: number[], C: Col, set: (i: number, x: number) => void): ReactNode {
  const [a, b, c] = v
  switch (view.t) {
    case 'tape':
      return <TapeView v={v} target={view.target} C={C} />
    case 'line':
      return <LineView a={a} b={b} min={view.min} max={view.max} target={view.target} C={C} />
    case 'dots':
      return <DotPlot v={v} min={view.min} max={view.max} median={view.median} C={C} onSet={set} />
    case 'bag':
      return <BagView r={a} b={b} C={C} />
    case 'prism':
      return <PrismView a={a} b={b} c={c} C={C} />
    case 'tri':
      return <TriView a={a} b={b} c={c} C={C} />
    case 'root':
      return <RootView n={a} C={C} />
    case 'area':
      return <AreaView a={a} b={b} C={C} />
    case 'lcm':
      return <ListView rows={[mults(a, view.upto), mults(b, view.upto)]} names={[`${ek(a, 'gen')} katları`, `${ek(b, 'gen')} katları`]} a={a} b={b} pick="lcm" C={C} />
    case 'gcd':
      return <ListView rows={[divs(a), divs(b)]} names={['', '']} a={a} b={b} pick="gcd" C={C} />
    case 'expr':
      return <ExprView a={a} b={b} c={c} C={C} />
  }
}

const mults = (n: number, upto: number) => Array.from({ length: Math.floor(upto / n) }, (_, i) => (i + 1) * n)
const divs = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0)

function TapeView({ v, target, C }: { v: number[]; target: number; C: Col }) {
  const sum = v.reduce((s, x) => s + x, 0)
  const span = Math.max(target, sum, 1)
  const W = 400, x0 = 10
  const u = W / span
  let acc = 0
  return (
    <svg viewBox="0 0 420 90" className="block h-auto w-full" role="img" aria-label={`Şerit: toplam ${sum}, hedef ${target}`}>
      {v.map((x, i) => {
        const r = <g key={i}><rect x={x0 + acc * u} y={22} width={Math.max(0, x * u)} height={40} fill={palette[i % palette.length]} stroke="#fff" strokeWidth={2} rx={4} />{x * u > 22 && <text x={x0 + (acc + x / 2) * u} y={48} textAnchor="middle" fontSize={17} fontWeight={900} fill="#fff">{x}</text>}</g>
        acc += x
        return r
      })}
      <line x1={x0 + target * u} x2={x0 + target * u} y1={10} y2={74} stroke={C.ink} strokeWidth={3} strokeDasharray="5 4" />
      <text x={Math.min(x0 + target * u, 395)} y={88} textAnchor="middle" fontSize={14} fontWeight={900} fill={C.ink}>{target}</text>
    </svg>
  )
}

function LineView({ a, b, min, max, target, C }: { a: number; b: number; min: number; max: number; target: number; C: Col }) {
  const W = 420, x0 = 15, u = (W - 2 * x0) / (max - min)
  const X = (n: number) => x0 + (Math.max(min, Math.min(max, n)) - min) * u
  const arc = (from: number, to: number, y: number, col: string) => (
    <g>
      <path d={`M${X(from)} 70 Q${(X(from) + X(to)) / 2} ${y} ${X(to)} 70`} fill="none" stroke={col} strokeWidth={3.5} />
      <circle cx={X(to)} cy={70} r={5} fill={col} />
    </g>
  )
  return (
    <svg viewBox="0 0 420 100" className="block h-auto w-full" role="img" aria-label={`Sayı doğrusu: ${a} + ${b}`}>
      <line x1={x0} x2={W - x0} y1={70} y2={70} stroke={C.ink} strokeWidth={2} />
      {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
        <g key={n}>
          <line x1={X(n)} x2={X(n)} y1={64} y2={76} stroke={n === 0 ? C.ink : C.soft} strokeWidth={n === 0 ? 2.5 : 1.2} />
          {(n % 2 === 0 || n === target) && <text x={X(n)} y={93} textAnchor="middle" fontSize={12} fontWeight={800} fill={n === target ? C.accent : C.soft}>{fmtN(n)}</text>}
        </g>
      ))}
      <path d={`M${X(target)} 12 L${X(target)} 64`} stroke={C.accent} strokeWidth={2} strokeDasharray="4 3" />
      <path d={`M${X(target)} 12 l14 6 l-14 6 z`} fill={C.accent} />
      {arc(0, a, 30, palette[0])}
      {arc(a, a + b, 10, palette[1])}
    </svg>
  )
}

function DotPlot({ v, min, max, median, C, onSet }: { v: number[]; min: number; max: number; median?: boolean; C: Col; onSet: (i: number, x: number) => void }) {
  const W = 440, x0 = 22, u = (W - 2 * x0) / (max - min), base = 128
  const ref = useRef<SVGSVGElement>(null)
  const bind = useDrag(
    ({ args: [i], xy: [x], event }) => {
      event?.preventDefault?.()
      const r = ref.current?.getBoundingClientRect()
      if (!r) return
      const ux = ((x - r.left) / r.width) * W
      onSet(i as number, Math.round(min + (ux - x0) / u))
    },
    { eventOptions: { passive: false } },
  )
  const seen: Record<number, number> = {}
  const stack = v.map((x) => (seen[x] = (seen[x] ?? -1) + 1))
  const mean = v.reduce((s, x) => s + x, 0) / v.length
  const s = [...v].sort((p, q2) => p - q2)
  const med = s[Math.floor(s.length / 2)]
  const X = (n: number) => x0 + (n - min) * u
  return (
    <svg ref={ref} viewBox={`0 0 ${W} 170`} className="block h-auto w-full" style={{ touchAction: 'none' }} role="img" aria-label={`Nokta grafiği: ${v.join(', ')}`}>
      <line x1={x0} x2={W - x0} y1={base + 12} y2={base + 12} stroke={C.ink} strokeWidth={2} />
      {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
        <g key={n}>
          <line x1={X(n)} x2={X(n)} y1={base + 7} y2={base + 17} stroke={C.soft} />
          <text x={X(n)} y={base + 32} textAnchor="middle" fontSize={12} fontWeight={800} fill={C.soft}>{n}</text>
        </g>
      ))}
      {median && <text x={X(med)} y={14} textAnchor="middle" fontSize={11} fontWeight={900} fill={C.good}>ortanca</text>}
      {median && <line x1={X(med)} x2={X(med)} y1={18} y2={base + 12} stroke={C.good} strokeWidth={2} strokeDasharray="3 3" />}
      <path d={`M${X(mean)} ${base + 13} l-9 14 h18 z`} fill={C.accent} />
      {v.map((x, i) => (
        <g key={i} {...bind(i)} data-handle style={{ cursor: 'grab', touchAction: 'none' }}>
          <circle cx={X(x)} cy={base - 4 - stack[i] * 25} r={20} fill="transparent" />
          <circle cx={X(x)} cy={base - 4 - stack[i] * 25} r={11} fill={palette[i % palette.length]} stroke="#fff" strokeWidth={2} />
        </g>
      ))}
    </svg>
  )
}

function BagView({ r, b, C }: { r: number; b: number; C: Col }) {
  const balls = [...Array(r).fill('#ef4444'), ...Array(b).fill('#3b82f6')] as string[]
  const per = 8
  return (
    <svg viewBox="0 0 300 180" className="mx-auto block h-auto w-full max-w-[340px]" role="img" aria-label={`Torbada ${r} kırmızı, ${b} mavi top`}>
      <path d="M60 30 Q40 30 36 60 L26 150 Q24 172 50 172 L250 172 Q276 172 274 150 L264 60 Q260 30 240 30 Z" fill={C.accentSoft} stroke={C.soft} strokeWidth={2} />
      <path d="M70 30 Q150 6 230 30" fill="none" stroke={C.soft} strokeWidth={3} />
      {balls.map((col, i) => (
        <circle key={i} cx={58 + (i % per) * 26} cy={156 - Math.floor(i / per) * 24} r={10} fill={col} stroke="#fff" strokeWidth={1.5} />
      ))}
    </svg>
  )
}

function PrismView({ a, b, c, C }: { a: number; b: number; c: number; C: Col }) {
  const k = 0.5
  const u = Math.min(240 / (a + b * k * 0.87), 130 / (c + b * k * 0.5))
  const dx = b * k * 0.87 * u, dy = b * k * 0.5 * u
  const W = a * u, H = c * u
  const ox = (300 - W - dx) / 2, oy = 160 - (160 - H - dy) / 2
  const fx = ox, fy = oy - H
  return (
    <svg viewBox="0 0 300 175" className="mx-auto block h-auto w-full max-w-[380px]" role="img" aria-label={`${a} × ${b} × ${c} prizma`}>
      <path d={`M${fx} ${fy} l${dx} ${-dy} h${W} l${-dx} ${dy} z`} fill={C.accentSoft} stroke={C.ink} strokeWidth={2} />
      <path d={`M${fx + W} ${fy} l${dx} ${-dy} v${H} l${-dx} ${dy} z`} fill={C.grid} stroke={C.ink} strokeWidth={2} />
      <rect x={fx} y={fy} width={W} height={H} fill={C.accent} opacity={0.85} stroke={C.ink} strokeWidth={2} />
      {u >= 8 && Array.from({ length: a - 1 }, (_, i) => <line key={`a${i}`} x1={fx + (i + 1) * u} x2={fx + (i + 1) * u} y1={fy} y2={fy + H} stroke="#fff" strokeOpacity={0.5} />)}
      {u >= 8 && Array.from({ length: c - 1 }, (_, i) => <line key={`c${i}`} x1={fx} x2={fx + W} y1={fy + (i + 1) * u} y2={fy + (i + 1) * u} stroke="#fff" strokeOpacity={0.5} />)}
      <text x={fx + W / 2} y={Math.min(fy + H + 15, 174)} textAnchor="middle" fontSize={13} fontWeight={900} fill={C.ink}>{a}</text>
      <text x={fx - 8} y={fy + H / 2 + 4} textAnchor="end" fontSize={13} fontWeight={900} fill={C.ink}>{c}</text>
      <text x={fx + W + dx / 2 + 8} y={fy + H - dy / 2 + 4} fontSize={13} fontWeight={900} fill={C.ink}>{b}</text>
    </svg>
  )
}

function TriView({ a, b, c, C }: { a: number; b: number; c: number; C: Col }) {
  const u = Math.min(250 / Math.max(a, 1), 140 / Math.max(b, 1))
  const x0 = 30, y0 = 160
  const ok = a * a + b * b === c * c
  const hyp = Math.sqrt(a * a + b * b)
  return (
    <svg viewBox="0 0 320 180" className="mx-auto block h-auto w-full max-w-[400px]" role="img" aria-label={`Dik kenarlar ${a} ve ${b}, üçüncü kenar ${c}`}>
      <path d={`M${x0} ${y0} h${a * u} L${x0} ${y0 - b * u} z`} fill={C.accentSoft} stroke={C.ink} strokeWidth={2.5} />
      <path d={`M${x0} ${y0 - 14} h14 v14`} fill="none" stroke={C.ink} strokeWidth={1.5} />
      <text x={x0 + (a * u) / 2} y={y0 + 16} textAnchor="middle" fontSize={14} fontWeight={900} fill={C.ink}>a = {a}</text>
      <text x={x0 - 6} y={y0 - (b * u) / 2} textAnchor="end" fontSize={14} fontWeight={900} fill={C.ink}>b</text>
      <text x={x0 - 6} y={y0 - (b * u) / 2 + 16} textAnchor="end" fontSize={14} fontWeight={900} fill={C.ink}>{b}</text>
      <text x={x0 + (a * u) / 2 + 12} y={y0 - (b * u) / 2 - 6} fontSize={14} fontWeight={900} fill={ok ? C.good : C.warn}>
        {ok ? `c = ${c} ✓` : `c = ${c}? (≈ ${fmtN(Math.round(hyp * 100) / 100, 2)})`}
      </text>
    </svg>
  )
}

function RootView({ n, C }: { n: number; C: Col }) {
  const min = 0, max = 7, x0 = 15, u = 390 / (max - min)
  const X = (t: number) => x0 + (t - min) * u
  const r = Math.sqrt(n)
  const inside = r > 4 && r < 5
  return (
    <svg viewBox="0 0 420 90" className="block h-auto w-full" role="img" aria-label={`Karekök ${n} yaklaşık ${r.toFixed(2)}`}>
      <rect x={X(4)} y={40} width={u} height={20} fill={C.accentSoft} />
      <line x1={x0} x2={X(max)} y1={50} y2={50} stroke={C.ink} strokeWidth={2} />
      {Array.from({ length: max + 1 }, (_, i) => (
        <g key={i}>
          <line x1={X(i)} x2={X(i)} y1={42} y2={58} stroke={i === 4 || i === 5 ? C.accent : C.soft} strokeWidth={i === 4 || i === 5 ? 3 : 1.5} />
          <text x={X(i)} y={78} textAnchor="middle" fontSize={14} fontWeight={900} fill={i === 4 || i === 5 ? C.accent : C.soft}>{i}</text>
        </g>
      ))}
      <circle cx={X(Math.min(r, max))} cy={50} r={8} fill={inside ? C.good : C.warn} stroke="#fff" strokeWidth={2} />
      <text x={X(Math.min(r, max))} y={28} textAnchor="middle" fontSize={14} fontWeight={900} fill={C.ink}>√{n}</text>
    </svg>
  )
}

function AreaView({ a, b, C }: { a: number; b: number; C: Col }) {
  const u = Math.min(380 / a, 150 / b)
  const grid = a * b <= 400 && u >= 6
  return (
    <svg viewBox="0 0 400 170" className="block h-auto w-full" role="img" aria-label={`${a} × ${b} dikdörtgen`}>
      <rect x={10} y={10} width={a * u} height={b * u} fill={C.accent} opacity={0.85} rx={2} />
      {grid && Array.from({ length: a - 1 }, (_, i) => <line key={`x${i}`} x1={10 + (i + 1) * u} x2={10 + (i + 1) * u} y1={10} y2={10 + b * u} stroke="#fff" strokeOpacity={0.6} />)}
      {grid && Array.from({ length: b - 1 }, (_, i) => <line key={`y${i}`} x1={10} x2={10 + a * u} y1={10 + (i + 1) * u} y2={10 + (i + 1) * u} stroke="#fff" strokeOpacity={0.6} />)}
    </svg>
  )
}

function ListView({ rows, names, a, b, pick, C }: { rows: number[][]; names: string[]; a: number; b: number; pick: 'lcm' | 'gcd'; C: Col }) {
  const common = rows[0].filter((x) => rows[1].includes(x))
  const star = pick === 'lcm' ? common[0] : common[common.length - 1]
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r, i) => (
        <div key={i}>
          <p className="mb-1 text-xs font-black opacity-70">{names[i] || `${ek(i ? b : a, 'gen')} bölenleri`}</p>
          <div className="flex flex-wrap gap-1">
            {r.map((x) => (
              <span key={x} className="grid h-8 min-w-8 place-items-center rounded-lg px-1.5 text-sm font-black tabular-nums" style={{ background: x === star ? C.good : common.includes(x) ? C.accentSoft : 'transparent', color: x === star ? '#fff' : C.ink, boxShadow: `inset 0 0 0 1px ${C.grid}` }}>{x}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ExprView({ a, b, c, C }: { a: number; b: number; c: number; C: Col }) {
  return (
    <div className="flex flex-col items-center gap-1 py-2 text-3xl font-black tabular-nums sm:text-4xl" style={{ color: C.ink }}>
      <p>
        <span style={{ color: palette[0] }}>{a}</span> + <span className="rounded-xl px-1.5" style={{ background: C.accentSoft }}><span style={{ color: palette[1] }}>{b}</span> × <span style={{ color: palette[2] }}>{c}</span></span>
      </p>
      <p className="text-xl opacity-80 sm:text-2xl">= {a} + {b * c} = {a + b * c}</p>
    </div>
  )
}

// ───────────────────────── Kesir tezgâhı ─────────────────────────

function FracEdit({ look, n, d, onN, onD, maxDen, fixedDen, color }: { look: Look; n: number; d: number; onN: (x: number) => void; onD: (x: number) => void; maxDen: number; fixedDen?: number; color: string }) {
  const sz = look.big ? 'size-14' : 'size-12'
  const btn = `grid ${sz} place-items-center rounded-2xl transition active:scale-95 disabled:opacity-30 ${look.key}`
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl p-1.5" style={{ boxShadow: `inset 0 0 0 2px ${color}55` }}>
      <div className="flex items-center gap-1">
        <button type="button" className={btn} onClick={() => onN(n - 1)} disabled={n <= 1} aria-label="Payı azalt"><Minus size={18} strokeWidth={3} /></button>
        <span className="w-9 text-center text-2xl font-black tabular-nums">{n}</span>
        <button type="button" className={btn} onClick={() => onN(n + 1)} disabled={n >= (fixedDen ?? d) * 2} aria-label="Payı artır"><Plus size={18} strokeWidth={3} /></button>
      </div>
      <span className="h-1 w-24 rounded-full" style={{ background: color }} />
      {fixedDen ? (
        <span className="text-2xl font-black tabular-nums">{fixedDen}</span>
      ) : (
        <div className="flex items-center gap-1">
          <button type="button" className={btn} onClick={() => onD(d - 1)} disabled={d <= 2} aria-label="Paydayı azalt"><Minus size={18} strokeWidth={3} /></button>
          <span className="w-9 text-center text-2xl font-black tabular-nums">{d}</span>
          <button type="button" className={btn} onClick={() => onD(d + 1)} disabled={d >= maxDen} aria-label="Paydayı artır"><Plus size={18} strokeWidth={3} /></button>
        </div>
      )}
    </div>
  )
}

export function FracsBench({ box, look, grade, onSubmit }: { box: Extract<Sandbox, { k: 'fracs' }>; look: Look; grade: Grade; onSubmit: (a: Ans) => void }) {
  const [f, setF] = useState<[number, number][]>(box.init)
  const C = colors(look.dark)
  const upd = (i: number, n: number, d: number) => setF((o) => o.map((x, j) => (j === i ? [Math.max(1, n), Math.max(2, Math.min(box.maxDen, d))] : x)))
  const sum = f.reduce((s, [n, d]) => qAdd(s, q(n, d)), q(0))
  const readout = box.view === 'half' ? `[[${f[0][0]}/${f[0][1]}]] ${f[0][0] * 2 === f[0][1] ? '=' : f[0][0] * 2 < f[0][1] ? '<' : '>'} [[1/2]]` : `${f.map(([n, d]) => `[[${n}/${d}]]`).join(' + ')} = ${fmtQ(sum, 'frac')}`
  return (
    <Bench look={look} big={grade <= 3} readout={<MathText text={readout} />} onAdd={() => onSubmit({ k: 'fracs', f })}>
      <div className="mx-auto w-full max-w-[560px]">{box.view === 'half' ? <HalfBar n={f[0][0]} d={f[0][1]} C={C} /> : <SumBar f={f} C={C} fixedDen={box.fixedDen} />}</div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {f.map(([n, d], i) => (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-2xl font-black">+</span>}
            <FracEdit look={look} n={n} d={box.fixedDen ?? d} onN={(x) => upd(i, x, box.fixedDen ?? d)} onD={(x) => upd(i, n, x)} maxDen={box.maxDen} fixedDen={box.fixedDen} color={palette[i % palette.length]} />
          </div>
        ))}
      </div>
    </Bench>
  )
}

function SumBar({ f, C, fixedDen }: { f: [number, number][]; C: Col; fixedDen?: number }) {
  const total = f.reduce((s, [n, d]) => s + n / d, 0)
  const span = Math.max(1, total)
  const W = 400, x0 = 10, u = W / span
  let acc = 0
  return (
    <svg viewBox="0 0 420 92" className="block h-auto w-full" role="img" aria-label="Kesir şeridi">
      <rect x={x0} y={20} width={u} height={44} fill="none" stroke={C.ink} strokeWidth={2.5} rx={4} />
      {fixedDen && Array.from({ length: fixedDen - 1 }, (_, i) => <line key={i} x1={x0 + ((i + 1) / fixedDen) * u} x2={x0 + ((i + 1) / fixedDen) * u} y1={20} y2={64} stroke={C.grid} />)}
      {f.map(([n, d], i) => {
        const w = (n / d) * u
        const r = <g key={i}><rect x={x0 + acc * u} y={22} width={w} height={40} fill={palette[i % palette.length]} opacity={0.9} stroke="#fff" strokeWidth={2} />{w > 40 && <text x={x0 + acc * u + w / 2} y={47} textAnchor="middle" fontSize={14} fontWeight={900} fill="#fff">{n}/{d}</text>}</g>
        acc += n / d
        return r
      })}
      <line x1={x0 + u} x2={x0 + u} y1={10} y2={74} stroke={C.ink} strokeWidth={3} />
      <text x={Math.min(x0 + u, 405)} y={89} textAnchor="middle" fontSize={14} fontWeight={900} fill={C.ink}>1</text>
      <text x={x0} y={89} textAnchor="middle" fontSize={14} fontWeight={900} fill={C.ink}>0</text>
    </svg>
  )
}

function HalfBar({ n, d, C }: { n: number; d: number; C: Col }) {
  const W = 400, x0 = 10, u = W / d
  return (
    <svg viewBox="0 0 420 92" className="block h-auto w-full" role="img" aria-label={`${d} eş parçadan ${n} tanesi boyalı`}>
      {Array.from({ length: d }, (_, i) => <rect key={i} x={x0 + i * u} y={22} width={u} height={40} fill={i < n ? C.accent : C.cell} stroke={C.ink} strokeWidth={1.5} />)}
      <line x1={x0 + W / 2} x2={x0 + W / 2} y1={8} y2={76} stroke={C.good} strokeWidth={3} strokeDasharray="6 4" />
      <text x={x0 + W / 2} y={90} textAnchor="middle" fontSize={14} fontWeight={900} fill={C.good}>yarım</text>
    </svg>
  )
}

// ───────────────────────── Koordinat tezgâhı ─────────────────────────

export function lineEq(a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  if (dx === 0) return null
  const m = q(dy, dx)
  const n = qSub(q(a[1]), qMul(m, q(a[0])))
  return { m, n }
}
export function eqText(m: ReturnType<typeof q>, n: ReturnType<typeof q>) {
  const mt = m.n === 0 ? '' : m.d === 1 && Math.abs(m.n) === 1 ? `${m.n < 0 ? '−' : ''}x` : `${fmtQ(m, 'frac')}x`
  const nt = n.n === 0 ? (mt ? '' : '0') : mt ? ` ${n.n < 0 ? '−' : '+'} ${fmtQ(q(Math.abs(n.n), n.d), 'frac')}` : fmtQ(n, 'frac')
  return `y = ${mt}${nt}`
}

export function PtsBench({ box, look, grade, onSubmit }: { box: Extract<Sandbox, { k: 'pts' }>; look: Look; grade: Grade; onSubmit: (a: Ans) => void }) {
  const R = box.range
  const C = colors(look.dark)
  const [A, setA] = useState<[number, number] | null>(box.fixedA ?? null)
  const [B, setB] = useState<[number, number] | null>(null)
  const [active, setActive] = useState<'A' | 'B'>(box.fixedA ? 'B' : 'A')
  const ref = useRef<HTMLDivElement>(null)
  const U = 30, size = (2 * R + 1.4) * U, half = size / 2
  const bind = useDrag(
    ({ xy: [x, y], last, event }) => {
      event?.preventDefault?.()
      const r = ref.current?.getBoundingClientRect()
      if (!r) return
      const gx = Math.max(-R, Math.min(R, Math.round((((x - r.left) / r.width) * size - half) / U)))
      const gy = Math.max(-R, Math.min(R, -Math.round((((y - r.top) / r.height) * size - half) / U)))
      if (active === 'A') setA([gx, gy])
      else setB([gx, gy])
      if (last && active === 'A') setActive('B')
    },
    { eventOptions: { passive: false } },
  )
  const P = (p: [number, number]) => [half + p[0] * U, half - p[1] * U] as const
  const eq = A && B ? lineEq(A, B) : null
  let seg: ReactNode = null
  if (A && B && (A[0] !== B[0] || A[1] !== B[1])) {
    if (!eq) seg = <line x1={P(A)[0]} x2={P(A)[0]} y1={0} y2={size} stroke={C.accent} strokeWidth={3} />
    else {
      const m = eq.m.n / eq.m.d, n = eq.n.n / eq.n.d
      const xa = -R - 1, xb = R + 1
      seg = <line x1={half + xa * U} y1={half - (m * xa + n) * U} x2={half + xb * U} y2={half - (m * xb + n) * U} stroke={C.accent} strokeWidth={3} />
    }
  }
  const slope = A && B && A[0] !== B[0] ? fmtQ(qDiv(q(B[1] - A[1]), q(B[0] - A[0])), 'frac') : null
  const readout = !A ? 'A noktasını yerleştir.' : !B ? 'Şimdi B noktasını yerleştir.' : A[0] === B[0] && A[1] === B[1] ? 'A ile B aynı nokta; B’yi başka yere taşı.' : eq ? `Eğim = [[${B[1] - A[1]}/${B[0] - A[0]}]]${slope && !slope.includes('[[') ? ` = ${slope}` : ''} · ${eqText(eq.m, eq.n)}` : 'Dikey doğru: eğim tanımsız'
  const ptBtn = (k: 'A' | 'B', p: [number, number] | null, fixed?: boolean) => (
    <button type="button" disabled={fixed} onClick={() => setActive(k)} aria-pressed={active === k} className={`min-h-12 rounded-2xl px-4 font-black transition ${active === k ? look.chipOn : look.chip} disabled:opacity-70`}>
      {k}{p ? ` (${fmtN(p[0])}, ${fmtN(p[1])})` : ''}{fixed ? ' 📌' : ''}
    </button>
  )
  return (
    <Bench
      look={look}
      big={grade <= 3}
      readout={<MathText text={readout} />}
      onAdd={() => A && B && onSubmit({ k: 'pts', a: A, b: B })}
      onClear={() => {
        setA(box.fixedA ?? null)
        setB(null)
        setActive(box.fixedA ? 'B' : 'A')
      }}
    >
      <div className="flex flex-wrap justify-center gap-2">
        {ptBtn('A', A, !!box.fixedA)}
        {ptBtn('B', B)}
        <span className={`self-center text-sm font-bold ${look.muted}`}>Seçili noktayı yerleştirmek için ızgaraya dokun ya da sürükle.</span>
      </div>
      <div ref={ref} {...bind()} className="mx-auto w-full max-w-[440px] cursor-crosshair" style={{ touchAction: 'none' }} data-board="pts">
        <svg viewBox={`0 0 ${size} ${size}`} className="block h-auto w-full" style={{ touchAction: 'none' }} role="img" aria-label="Koordinat düzlemi">
          <defs>
            <clipPath id="aul-clip"><rect x={0} y={0} width={size} height={size} /></clipPath>
          </defs>
          {Array.from({ length: 2 * R + 1 }, (_, i) => i - R).map((k) => (
            <g key={k}>
              <line x1={half + k * U} x2={half + k * U} y1={0} y2={size} stroke={k === 0 ? C.ink : C.grid} strokeWidth={k === 0 ? 2 : 1} />
              <line y1={half - k * U} y2={half - k * U} x1={0} x2={size} stroke={k === 0 ? C.ink : C.grid} strokeWidth={k === 0 ? 2 : 1} />
              {k !== 0 && <text x={half + k * U} y={half + 14} textAnchor="middle" fontSize={10} fontWeight={800} fill={C.soft}>{fmtN(k)}</text>}
              {k !== 0 && <text x={half - 5} y={half - k * U + 4} textAnchor="end" fontSize={10} fontWeight={800} fill={C.soft}>{fmtN(k)}</text>}
            </g>
          ))}
          <g clipPath="url(#aul-clip)">{seg}</g>
          {A && B && eq && A[0] !== B[0] && (
            <path d={`M${P(A)[0]} ${P(A)[1]} H${P(B)[0]} V${P(B)[1]}`} fill="none" stroke={C.warn} strokeWidth={2} strokeDasharray="5 4" />
          )}
          {([['A', A], ['B', B]] as const).map(([k, p]) =>
            p ? (
              <g key={k}>
                <circle cx={P(p)[0]} cy={P(p)[1]} r={9} fill={k === 'A' ? '#f97316' : '#3b82f6'} stroke="#fff" strokeWidth={2.5} />
                <text x={P(p)[0] + 11} y={P(p)[1] - 9} fontSize={14} fontWeight={900} fill={C.ink}>{k}</text>
              </g>
            ) : null,
          )}
        </svg>
      </div>
    </Bench>
  )
}
