import { useMemo, useRef, useState } from 'react'
import { useDrag } from '@use-gesture/react'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import type { Grade } from '../../data/types'
import { CubesSvg, SpinnerSvg, DiceSvg } from '../../components/Visual'
import { MathText } from '../../components/MathText'
import { ek } from '../../lib/generators'
import { sfx } from '../../lib/feedback'
import { tr, useTileDrag } from '../hizli-noktalar/kit'

/**
 * “Test et” aşamasının modelleri. Her model:
 *  - phase = 'predict': yalnız durumu gösterir (dokunulmaz)
 *  - phase = 'test': öğrenci deneyi yapar; bittiğinde onDone(sonuç)
 *  - phase = 'after': sonuç donmuş hâlde görünür
 */

export type SimPhase = 'predict' | 'test' | 'after'
export interface SimOut {
  /** Kısa sonuç (karşılaştırma kartında) */
  label: string
  /** Sayısal sonuç (sayı tahminlerinde) */
  value?: number
  /** Seçenek tahminlerinde deneyin gösterdiği seçenek */
  choice?: number
}
export interface SimBase {
  phase: SimPhase
  grade: Grade
  onDone: (r: SimOut) => void
  nudge: (q: string, misc?: string) => void
}

const dark = (g: Grade) => g >= 7
const btn = (g: Grade, extra = '') =>
  `inline-flex ${g <= 3 ? 'min-h-14 text-lg' : 'min-h-12 text-base'} items-center justify-center gap-1.5 rounded-2xl px-4 font-extrabold transition active:scale-95 disabled:opacity-40 ${
    dark(g) ? 'bg-slate-700 text-white ring-1 ring-slate-500 hover:bg-slate-600' : 'bg-white text-ink ring-1 ring-line shadow-[0_3px_0_var(--color-line)] hover:bg-paper'
  } ${extra}`
const mainBtn = (g: Grade, extra = '') => `btn-primary ${g <= 3 ? 'min-h-14 text-lg' : 'min-h-12'} ${extra}`
const note = (g: Grade) => `rounded-2xl px-3 py-2 text-center font-black ${dark(g) ? 'bg-slate-800 text-cyan-100 ring-1 ring-slate-600' : 'bg-white/90 text-ink ring-1 ring-line'}`

function seeded(seed: number) {
  let x = seed % 2147483647
  if (x <= 0) x += 2147483646
  return () => (x = (x * 16807) % 2147483647) / 2147483647
}

// ───────────────────────── 1. Kavanoz (tahmin + onluk gruplama) ─────────────────────────

export interface JarP {
  n: number
  /** tap: tek tek al (1. sınıf); scoop: onluk avuçla al */
  mode: 'tap' | 'scoop'
  emoji?: string
  /** Referans kavanoz: içindeki sayı biliniyor */
  ref?: number
  seed: number
}

function beans(n: number, seed: number, w: number, h: number, top: number) {
  const r = seeded(seed)
  return Array.from({ length: n }, () => ({ x: 34 + r() * (w - 68), y: top + 12 + r() * (h - top - 34), a: r() * 180, c: r() }))
}

function JarSvg({ n, taken = 0, seed, w = 200, h = 240, label, small }: { n: number; taken?: number; seed: number; w?: number; h?: number; label?: string; small?: boolean }) {
  const pts = useMemo(() => beans(n, seed, w, h, 40), [n, seed, w, h])
  return (
    <svg viewBox={`0 0 ${w} ${h + (label ? 28 : 0)}`} className={small ? 'w-24 sm:w-28' : 'w-full max-w-[260px]'} role="img" aria-label={label ?? `Kavanoz, ${n - taken} fasulye`}>
      <rect x={w / 2 - 44} y={4} width={88} height={22} rx={6} fill="#b45309" />
      <path d={`M24 34 Q24 26 34 26 L${w - 34} 26 Q${w - 24} 26 ${w - 24} 34 L${w - 16} ${h - 24} Q${w - 16} ${h - 4} ${w - 36} ${h - 4} L36 ${h - 4} Q16 ${h - 4} 16 ${h - 24} Z`} fill="#e0f2fe" fillOpacity={0.55} stroke="#7dd3fc" strokeWidth={4} />
      {pts.slice(taken).map((p, i) => (
        <ellipse key={i} cx={p.x} cy={p.y} rx={7.5} ry={5} transform={`rotate(${p.a} ${p.x} ${p.y})`} fill={p.c < 0.5 ? '#92400e' : '#b45309'} stroke="#78350f" strokeWidth={1} />
      ))}
      <path d={`M34 40 L34 ${h - 30}`} stroke="#fff" strokeOpacity={0.7} strokeWidth={6} strokeLinecap="round" />
      {label && <text x={w / 2} y={h + 22} textAnchor="middle" fontSize={20} fontWeight={900} fill="#1f2340">{label}</text>}
    </svg>
  )
}

function TenFrames({ count, total }: { count: number; total: number }) {
  const frames = Math.max(1, Math.ceil(total / 10))
  return (
    <div className="flex flex-wrap justify-center gap-1.5" aria-label={`${count} fasulye çerçevelerde`}>
      {Array.from({ length: frames }, (_, f) => (
        <svg key={f} viewBox="0 0 102 44" className="w-[88px] sm:w-[102px]">
          <rect x={1} y={1} width={100} height={42} rx={6} fill="#fff" stroke={count >= (f + 1) * 10 ? '#16a34a' : '#cbd5e1'} strokeWidth={2} />
          {Array.from({ length: 10 }, (_, k) => {
            const on = f * 10 + k < count
            const x = 11 + (k % 5) * 20
            const y = 12 + Math.floor(k / 5) * 20
            return on ? <ellipse key={k} cx={x} cy={y} rx={7} ry={5} fill="#92400e" /> : <circle key={k} cx={x} cy={y} r={2} fill="#cbd5e1" />
          })}
        </svg>
      ))}
    </div>
  )
}

export function JarSim({ p, phase, grade, onDone }: SimBase & { p: JarP }) {
  const [taken, setTaken] = useState(0)
  const done = useRef(false)
  const take = (k: number) => {
    const t = Math.min(p.n, taken + k)
    setTaken(t)
    sfx.ok()
    if (t === p.n && !done.current) {
      done.current = true
      const tens = Math.floor(p.n / 10)
      const ones = p.n % 10
      onDone({ value: p.n, label: `${p.n} fasulye${tens && grade >= 2 ? ` (${tens} onluk, ${ones} birlik)` : ''}` })
    }
  }
  const tens = Math.floor(taken / 10)
  const ones = taken % 10
  const left = p.n - taken
  const counting = phase !== 'predict'
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-end justify-center gap-4">
        {p.ref !== undefined && <JarSvg n={p.ref} seed={p.seed + 7} w={110} h={130} label={`${p.ref} fasulye`} small />}
        <JarSvg n={p.n} taken={taken} seed={p.seed} />
      </div>
      {counting && (
        <>
          <TenFrames count={taken} total={p.n} />
          <p className={note(grade)} aria-live="polite">
            {grade <= 1 ? `Çerçevede ${taken} fasulye` : `${tens} onluk + ${ones} birlik = ${taken}`}
          </p>
          {phase === 'test' && left > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {p.mode === 'scoop' && <button type="button" className={mainBtn(grade)} disabled={left < 10} onClick={() => take(10)}>🫘 10 tane al</button>}
              <button type="button" className={p.mode === 'tap' ? mainBtn(grade) : btn(grade)} onClick={() => take(1)}>🫘 1 tane al</button>
            </div>
          )}
          {phase === 'test' && left > 0 && p.mode === 'scoop' && left < 10 && <p className="text-sm font-bold text-ink-soft">10’dan az kaldı: teker teker al.</p>}
        </>
      )}
    </div>
  )
}

// ───────────────────────── 2. Ölçme (birim yineleme) ─────────────────────────

export interface MeasureP {
  /** Nesne uzunluğu (ataş biriminde) */
  len: number
  unit: 'ataş' | 'silgi' | 'kalem'
  /** Birimin uzunluğu (ataş biriminde) */
  unitLen: number
  obj: string
  objEmoji: string
  /** Daha önce ataşla ölçülen sonuç (göster) */
  prev?: string
}
const UNIT_EMOJI: Record<MeasureP['unit'], string> = { ataş: '📎', silgi: '🧽', kalem: '✏️' }
const UNIT_COLOR: Record<MeasureP['unit'], string> = { ataş: '#64748b', silgi: '#f472b6', kalem: '#f59e0b' }

export function MeasureSim({ p, phase, grade, onDone, nudge }: SimBase & { p: MeasureP }) {
  const [count, setCount] = useState(0)
  const zone = useRef<HTMLDivElement>(null)
  const U = 44
  const W = p.len * U
  const place = () => {
    if (phase !== 'test') return
    if ((count + 1) * p.unitLen > p.len + p.unitLen) return
    setCount((c) => c + 1)
    sfx.ok()
  }
  const drag = useTileDrag<number>({
    onDrop: (_, x, y) => {
      const r = zone.current?.getBoundingClientRect()
      if (r && x >= r.left - 20 && x <= r.right + 20 && y >= r.top - 30 && y <= r.bottom + 30) place()
    },
    onTap: () => place(),
    ghost: () => <span className="text-4xl">{UNIT_EMOJI[p.unit]}</span>,
  })
  const finish = () => {
    const cover = count * p.unitLen
    if (cover < p.len) return nudge(`${p.obj.charAt(0).toUpperCase() + p.obj.slice(1)} ucuna kadar ${p.unit}la kaplandı mı? Sağ uçta boşluk kaldı mı?`)
    if (cover > p.len) return nudge(`Son ${p.unit} ${p.obj} ucundan taşıyor mu? Taşan birimi sayar mıyız?`)
    onDone({ value: count, label: `${count} ${p.unit}` })
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-full overflow-x-auto pb-1">
        <div ref={zone} className="relative mx-auto rounded-2xl bg-white/70 p-3 ring-1 ring-line" style={{ width: W + 24, touchAction: 'none' }}>
          <div className="relative h-16 rounded-full" style={{ width: W, background: 'linear-gradient(90deg,#fde68a,#f59e0b 92%,#78350f 92%)' }} role="img" aria-label={`${p.obj}`}>
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-3xl" aria-hidden>{p.objEmoji}</span>
          </div>
          <div className="relative mt-1.5 h-12" style={{ width: W }}>
            {Array.from({ length: count }, (_, i) => (
              <span key={i} className="absolute top-0 grid h-12 place-items-center rounded-lg border-2 border-white text-xl font-black text-white animate-pop" style={{ left: i * p.unitLen * U, width: p.unitLen * U, background: UNIT_COLOR[p.unit] }}>
                {i + 1}
              </span>
            ))}
          </div>
          <div className="absolute top-2 bottom-2 border-l-2 border-dashed border-rose-400" style={{ left: 12 + W }} aria-hidden />
        </div>
      </div>
      {p.prev && <p className="text-sm font-extrabold text-ink-soft">Ataşla ölçüm: {p.prev}</p>}
      {phase === 'test' && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" {...drag.bind(1)} data-handle style={{ touchAction: 'none' }} className={mainBtn(grade, 'min-w-40')} aria-label={`${p.unit} koy (sürükle ya da dokun)`}>
            <span className="text-2xl">{UNIT_EMOJI[p.unit]}</span> {p.unit.charAt(0).toUpperCase() + p.unit.slice(1)} koy
          </button>
          <button type="button" className={btn(grade)} disabled={!count} onClick={() => setCount((c) => c - 1)} aria-label="Son birimi kaldır"><RotateCcw size={18} />Geri al</button>
          <button type="button" className={btn(grade)} disabled={!count} onClick={finish}>✔ Ölçtüm</button>
        </div>
      )}
      {drag.ghost}
      {phase !== 'predict' && <p className={note(grade)} aria-live="polite">{count} {p.unit}</p>}
    </div>
  )
}

// ───────────────────────── 3. Paylaştırma ve tek-çift ─────────────────────────

export interface ShareP {
  n: number
  emoji: string
}

export function ShareSim({ p, phase, grade, onDone }: SimBase & { p: ShareP }) {
  const [dealt, setDealt] = useState(0)
  const deal = () => {
    if (phase !== 'test' || dealt >= p.n) return
    const d = dealt + 1
    setDealt(d)
    sfx.ok()
    if (d === p.n) {
      const each = Math.floor(p.n / 2)
      onDone({ choice: p.n % 2 === 0 ? 0 : 1, label: p.n % 2 === 0 ? `İkisi de ${each} aldı, artan yok` : `İkisi de ${each} aldı, 1 tane arttı` })
    }
  }
  // Son tek şeker kimseye verilmez: ortada kalır
  const a = Math.ceil(Math.min(dealt, p.n - (p.n % 2)) / 2)
  const b = Math.floor(Math.min(dealt, p.n - (p.n % 2)) / 2)
  const extra = p.n % 2 === 1 && dealt === p.n
  const pile = p.n - dealt
  const kid = (name: string, e: string, k: number) => (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl bg-white/80 p-2 ring-1 ring-line">
      <span className="text-4xl" aria-hidden>{e}</span>
      <span className="font-black">{name}: {k}</span>
      <div className="flex min-h-10 flex-wrap justify-center gap-0.5 text-2xl">{Array.from({ length: k }, (_, i) => <span key={i} className="animate-pop">{p.emoji}</span>)}</div>
    </div>
  )
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full max-w-md gap-2">
        {kid('Ela', '👧', a)}
        {kid('Can', '👦', b)}
      </div>
      <button type="button" onClick={deal} disabled={phase !== 'test' || !pile} className="flex min-h-20 w-full max-w-md flex-wrap content-center justify-center gap-1 rounded-2xl bg-amber-50 p-2 text-4xl ring-2 ring-amber-200 transition active:scale-[0.99] disabled:cursor-default" aria-label={phase === 'test' ? 'Bir şeker dağıt' : 'Şeker yığını'}>
        {Array.from({ length: pile }, (_, i) => <span key={i}>{p.emoji}</span>)}
        {extra && <span className="animate-pop">{p.emoji}❓</span>}
        {!pile && !extra && <span className="text-base font-black text-amber-800">Hepsi dağıtıldı</span>}
      </button>
      {phase === 'test' && pile > 0 && <p className="text-center font-extrabold text-ink-soft">Yığına dokun: şekerler sırayla Ela’ya, sonra Can’a gider.</p>}
      {extra && <p className={note(grade)}>Son şeker ortada kaldı!</p>}
    </div>
  )
}

export interface ParityP {
  /** Toplananların türü: 'o' tek, 'e' çift */
  terms: ('o' | 'e')[]
  need: number
}

function PairDots({ n, color, x0 = 0 }: { n: number; color: string; x0?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const col = Math.floor(i / 2)
        const row = i % 2
        return <circle key={i} cx={x0 + 12 + col * 22} cy={14 + row * 22} r={8.5} fill={color} stroke="#fff" strokeWidth={1.5} />
      })}
    </>
  )
}

const TERM_COLORS = ['#f97316', '#3b82f6', '#a855f7']

export function ParitySim({ p, phase, grade, onDone }: SimBase & { p: ParityP }) {
  const init = p.terms.map((t, i) => (t === 'o' ? [5, 7, 3][i] : [4, 6, 2][i]))
  const [vals, setVals] = useState(init)
  const [log, setLog] = useState<number[][]>([])
  const sum = vals.reduce((s, v) => s + v, 0)
  const key = vals.slice().sort((a, b) => a - b).join('+')
  const already = log.some((l) => l.slice().sort((a, b) => a - b).join('+') === key)
  const save = () => {
    if (already) return
    const nl = [...log, vals]
    setLog(nl)
    sfx.ok()
    if (nl.length >= p.need) {
      const s = nl.map((l) => l.reduce((x, y) => x + y, 0) % 2)
      const allEven = s.every((x) => x === 0)
      const allOdd = s.every((x) => x === 1)
      onDone({ choice: allEven ? 1 : allOdd ? 0 : 2, label: allEven ? `${nl.length} denemenin hepsi çift` : allOdd ? `${nl.length} denemenin hepsi tek` : 'Bazen tek, bazen çift' })
    }
  }
  const W = Math.max(...vals.map((v) => Math.ceil(v / 2))) * 22 + 20
  const sumCols = Math.ceil(sum / 2)
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-3">
        {vals.map((v, i) => (
          <div key={i} className={`flex flex-col items-center rounded-2xl p-2 ${dark(grade) ? 'bg-slate-800' : 'bg-white/80 ring-1 ring-line'}`}>
            <span className="text-xs font-black text-ink-soft">{p.terms[i] === 'o' ? 'tek sayı' : 'çift sayı'}</span>
            <div className="flex items-center gap-1">
              <button type="button" className={btn(grade, 'size-12 px-0')} disabled={phase !== 'test' || v <= (p.terms[i] === 'o' ? 1 : 2)} onClick={() => setVals((a) => a.map((x, j) => (j === i ? x - 2 : x)))} aria-label="2 azalt"><Minus size={20} /></button>
              <span className="min-w-12 text-center text-3xl font-black tabular-nums" style={{ color: TERM_COLORS[i] }}>{v}</span>
              <button type="button" className={btn(grade, 'size-12 px-0')} disabled={phase !== 'test' || v >= 19} onClick={() => setVals((a) => a.map((x, j) => (j === i ? x + 2 : x)))} aria-label="2 artır"><Plus size={20} /></button>
            </div>
            <svg viewBox={`0 0 ${W} 40`} className="mt-1 h-10" style={{ width: W }}><PairDots n={v} color={TERM_COLORS[i]} /></svg>
          </div>
        ))}
      </div>
      <div className={`w-full max-w-lg rounded-2xl p-2 ${dark(grade) ? 'bg-slate-800' : 'bg-white/90 ring-1 ring-line'}`}>
        <p className="text-center text-sm font-black text-ink-soft">Hepsini ikişerli eşleştir: {vals.join(' + ')} = {sum}</p>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${sumCols * 22 + 24} 44`} className="mx-auto h-11" style={{ width: sumCols * 22 + 24 }} role="img" aria-label={`${sum} nokta ikişerli`}>
            {(() => {
              let k = 0
              return vals.flatMap((v, i) =>
                Array.from({ length: v }, () => {
                  const idx = k++
                  const col = Math.floor(idx / 2)
                  const row = idx % 2
                  return <circle key={idx} cx={12 + col * 22} cy={12 + row * 22} r={8.5} fill={TERM_COLORS[i]} stroke="#fff" strokeWidth={1.5} />
                }),
              )
            })()}
            {sum % 2 === 1 && <circle cx={12 + (sumCols - 1) * 22} cy={34} r={10} fill="none" stroke="#e11d48" strokeWidth={2} strokeDasharray="3 3" />}
          </svg>
        </div>
        <p className="text-center font-black">{sum} → {sum % 2 === 0 ? 'eşi olmayan nokta yok: çift' : 'bir nokta eşsiz kaldı: tek'}</p>
      </div>
      {phase === 'test' && (
        <button type="button" className={mainBtn(grade)} disabled={already} onClick={save}>{already ? 'Bu denemeyi kaydettin' : `Denemeyi kaydet (${log.length}/${p.need})`}</button>
      )}
      {log.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {log.map((l, i) => {
            const s = l.reduce((x, y) => x + y, 0)
            return <span key={i} className="chip bg-white px-3 py-1 text-sm text-ink ring-1 ring-line">{l.join(' + ')} = {s} ({s % 2 ? 'tek' : 'çift'})</span>
          })}
        </div>
      )}
    </div>
  )
}

// ───────────────────────── 4. Ölçekleme (alan, çevre, hacim) ─────────────────────────

export interface ScaleP {
  shape: 'rect' | 'cube' | 'cylinder'
  measure: 'area' | 'perimeter' | 'volume' | 'surface'
  base: number[]
  target: number[]
  /** Izgara boyutu (rect) */
  grid?: [number, number]
}

const measureOf = (p: ScaleP, d: number[]) => {
  if (p.shape === 'rect') return p.measure === 'area' ? d[0] * d[1] : 2 * (d[0] + d[1])
  if (p.shape === 'cube') return p.measure === 'volume' ? d[0] ** 3 : 6 * d[0] ** 2
  return d[0] * d[0] * d[1] // silindir: π çarpanı ayrı yazılır
}
const unitOf = (p: ScaleP) => (p.measure === 'area' || p.measure === 'surface' ? 'birimkare' : p.measure === 'perimeter' ? 'birim' : 'birimküp')
const measureName = (p: ScaleP) => ({ area: 'Alan', perimeter: 'Çevre', volume: 'Hacim', surface: 'Yüzey alanı' })[p.measure]
const fmtM = (p: ScaleP, v: number) => (p.shape === 'cylinder' ? `${v}π` : `${v} ${unitOf(p)}`)

export function ScaleSim({ p, phase, grade, onDone, nudge }: SimBase & { p: ScaleP }) {
  const [d, setD] = useState(p.base.slice())
  const svg = useRef<SVGSVGElement>(null)
  const [GW, GH] = p.grid ?? [12, 8]
  const C = 32
  const m0 = measureOf(p, p.base)
  const m1 = measureOf(p, d)
  const hit = d.every((v, i) => v === p.target[i])
  const live = phase !== 'predict'
  const bind = useDrag(
    ({ xy: [x, y], event }) => {
      event?.preventDefault?.()
      if (phase !== 'test' || !svg.current) return
      const r = svg.current.getBoundingClientRect()
      const k = r.width / (GW * C + 16)
      const cx = Math.round((x - r.left - 8 * k) / (C * k))
      const cy = Math.round((r.bottom - 8 * k - y) / (C * k))
      setD([Math.max(1, Math.min(GW, cx)), Math.max(1, Math.min(GH, cy))])
    },
    { eventOptions: { passive: false } },
  )
  const check = () => {
    if (!hit) {
      const lbl = p.shape === 'rect' ? 'Kenar uzunluklarını' : p.shape === 'cube' ? 'Ayrıt uzunluğunu' : 'Yarıçap ve yüksekliği'
      return nudge(`${lbl} görevdeki gibi değiştirdin mi? Eski ölçülerle karşılaştır: ${p.base.join(' ve ')} → ${p.target.map(() => '?').join(' ve ')}`)
    }
    const k = m1 / m0
    onDone({ value: k, label: `${measureName(p)} ${fmtM(p, m0)} → ${fmtM(p, m1)}: ${k} katı` })
  }
  const steppers = (labels: string[], max: number[]) => (
    <div className="flex flex-wrap justify-center gap-3">
      {labels.map((l, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className={`text-sm font-black ${dark(grade) ? 'text-slate-300' : 'text-ink-soft'}`}>{l}</span>
          <button type="button" className={btn(grade, 'size-12 px-0')} disabled={phase !== 'test' || d[i] <= 1} onClick={() => setD((a) => a.map((v, j) => (j === i ? v - 1 : v)))} aria-label={`${l} azalt`}><Minus size={20} /></button>
          <span className="min-w-10 text-center text-2xl font-black tabular-nums">{d[i]}</span>
          <button type="button" className={btn(grade, 'size-12 px-0')} disabled={phase !== 'test' || d[i] >= max[i]} onClick={() => setD((a) => a.map((v, j) => (j === i ? v + 1 : v)))} aria-label={`${l} artır`}><Plus size={20} /></button>
        </div>
      ))}
    </div>
  )

  let model
  if (p.shape === 'rect') {
    const [w, h] = d
    const [bw, bh] = p.base
    const VW = GW * C + 16
    const VH = GH * C + 16
    const X = (c: number) => 8 + c * C
    const Y = (r: number) => VH - 8 - r * C
    const tile = hit && w % bw === 0 && h % bh === 0
    model = (
      <svg ref={svg} viewBox={`0 0 ${VW} ${VH}`} className="w-full max-w-[520px]" style={{ touchAction: 'none' }} role="img" aria-label={`${w} × ${h} dikdörtgen`}>
        {Array.from({ length: GW + 1 }, (_, i) => <line key={`v${i}`} x1={X(i)} x2={X(i)} y1={Y(0)} y2={Y(GH)} stroke={dark(grade) ? '#334155' : '#dbe3ef'} />)}
        {Array.from({ length: GH + 1 }, (_, i) => <line key={`h${i}`} y1={Y(i)} y2={Y(i)} x1={X(0)} x2={X(GW)} stroke={dark(grade) ? '#334155' : '#dbe3ef'} />)}
        <rect x={X(0)} y={Y(h)} width={w * C} height={h * C} fill={p.measure === 'area' ? '#fbcfe8' : 'none'} fillOpacity={dark(grade) ? 0.35 : 0.9} stroke="#d6457a" strokeWidth={p.measure === 'perimeter' ? 5 : 3} />
        {tile &&
          Array.from({ length: (w / bw) * (h / bh) }, (_, k) => {
            const cx = (k % (w / bw)) * bw
            const cy = Math.floor(k / (w / bw)) * bh
            return <rect key={k} x={X(cx) + 3} y={Y(cy + bh) + 3} width={bw * C - 6} height={bh * C - 6} rx={5} fill="none" stroke="#0ea5e9" strokeWidth={3} className="animate-pop" />
          })}
        <rect x={X(0)} y={Y(bh)} width={bw * C} height={bh * C} fill="#facc15" fillOpacity={0.55} stroke="#a16207" strokeWidth={2} strokeDasharray="6 4" />
        {live && phase === 'test' && (
          <g {...bind()} data-handle style={{ cursor: 'nwse-resize' }}>
            <circle cx={X(w)} cy={Y(h)} r={26} fill="transparent" />
            <circle cx={X(w)} cy={Y(h)} r={13} fill="#d6457a" stroke="#fff" strokeWidth={4} />
          </g>
        )}
        <text x={X(w / 2)} y={Y(h) - 6} textAnchor="middle" fontSize={16} fontWeight={900} fill={dark(grade) ? '#e2e8f0' : '#1f2340'}>{w}</text>
        <text x={X(w) + 8} y={Y(h / 2) + 5} fontSize={16} fontWeight={900} fill={dark(grade) ? '#e2e8f0' : '#1f2340'}>{h}</text>
      </svg>
    )
  } else if (p.shape === 'cube') {
    const n = d[0]
    model = (
      <div className="flex flex-wrap items-end justify-center gap-4">
        <div className="w-24 text-center"><CubesSvg heights={Array.from({ length: p.base[0] }, () => Array(p.base[0]).fill(p.base[0]))} /><p className="text-xs font-black opacity-80">eski küp</p></div>
        <div className="w-56 max-w-full rounded-2xl bg-white/90 p-2"><CubesSvg heights={Array.from({ length: n }, () => Array(n).fill(n))} /></div>
      </div>
    )
  } else {
    const [r, h] = d
    const S = 16
    model = (
      <svg viewBox="0 0 260 220" className="w-full max-w-[300px]" role="img" aria-label={`Silindir: yarıçap ${r}, yükseklik ${h}`}>
        {(() => {
          const rx = r * S + 6
          const ry = rx * 0.32
          const top = 200 - h * 24 - ry
          return (
            <g>
              <path d={`M${130 - rx} ${top} L${130 - rx} ${200 - ry} A${rx} ${ry} 0 0 0 ${130 + rx} ${200 - ry} L${130 + rx} ${top}`} fill="#99f6e4" stroke="#0f766e" strokeWidth={3} />
              <ellipse cx={130} cy={top} rx={rx} ry={ry} fill="#ccfbf1" stroke="#0f766e" strokeWidth={3} />
              <line x1={130} y1={top} x2={130 + rx} y2={top} stroke="#be185d" strokeWidth={3} />
              <text x={130 + rx / 2} y={top - 6} textAnchor="middle" fontSize={15} fontWeight={900} fill="#be185d">r = {r}</text>
              <text x={130 + rx + 8} y={(top + 200 - ry) / 2} fontSize={15} fontWeight={900} fill={dark(grade) ? '#e2e8f0' : '#1f2340'}>h = {h}</text>
            </g>
          )
        })()}
      </svg>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {model}
      {live && (
        <>
          {phase === 'test' && (p.shape === 'rect' ? steppers(['Taban', 'Yükseklik'], [GW, GH]) : p.shape === 'cube' ? steppers(['Ayrıt'], [5]) : steppers(['Yarıçap', 'Yükseklik'], [4, 6]))}
          <div className="grid w-full max-w-lg grid-cols-2 gap-2">
            <p className={note(grade)}><span className="block text-xs opacity-70">Eski {measureName(p).toLowerCase()}</span><MathText text={p.shape === 'cylinder' ? `π × ${p.base[0]}^{2} × ${p.base[1]} = ${m0}π` : fmtM(p, m0)} /></p>
            <p className={note(grade)}><span className="block text-xs opacity-70">Yeni {measureName(p).toLowerCase()}</span><MathText text={p.shape === 'cylinder' ? `π × ${d[0]}^{2} × ${d[1]} = ${m1}π` : fmtM(p, m1)} /></p>
          </div>
          {phase === 'test' && <button type="button" className={mainBtn(grade)} onClick={check}>📏 Ölç ve karşılaştır</button>}
          {phase === 'after' && <p className={note(grade)}>{fmtM(p, m1)} ÷ {fmtM(p, m0)} = {tr(m1 / m0)}</p>}
        </>
      )}
    </div>
  )
}

// ───────────────────────── 5. Şans deneyi (çark, zar) ─────────────────────────

export interface Sector {
  label: string
  color: string
  w?: number
}
export interface ChanceP {
  /** Çarklar (A, B …) ya da iki zar */
  spinners?: { name: string; sectors: Sector[] }[]
  dice2?: boolean
  /** Sayılan sonuç (ör. 'K') */
  focus?: string
  minTrials: number
  /** Üst sınır (ör. tam 40 deneme) */
  maxTrials?: number
  batches: number[]
  /** Deney bitince sonuç etiketi (deneyin gösterdiği seçenek / sayı) */
  outcome: (counts: Record<string, number>[], trials: number[]) => SimOut
}

function pickW(sectors: Sector[]) {
  const tot = sectors.reduce((s, x) => s + (x.w ?? 1), 0)
  let r = Math.random() * tot
  for (let i = 0; i < sectors.length; i++) {
    r -= sectors[i].w ?? 1
    if (r < 0) return i
  }
  return sectors.length - 1
}

export function ChanceSim({ p, phase, grade, onDone, nudge }: SimBase & { p: ChanceP }) {
  const srcN = p.dice2 ? 1 : p.spinners!.length
  const [counts, setCounts] = useState<Record<string, number>[]>(() => Array.from({ length: srcN }, () => ({})))
  const [trials, setTrials] = useState<number[]>(() => Array(srcN).fill(0))
  const [rot, setRot] = useState<number[]>(() => Array(srcN).fill(0))
  const [dice, setDice] = useState<[number, number]>([3, 4])
  const done = useRef(false)
  const run = (s: number, kk: number) => {
    if (phase !== 'test') return
    const k = p.maxTrials ? Math.min(kk, p.maxTrials - trials[s]) : kk
    if (k <= 0) return
    const c = { ...counts[s] }
    let last = 0
    let lastD: [number, number] = dice
    for (let t = 0; t < k; t++) {
      if (p.dice2) {
        lastD = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]
        const key = String(lastD[0] + lastD[1])
        c[key] = (c[key] ?? 0) + 1
      } else {
        last = pickW(p.spinners![s].sectors)
        const key = p.spinners![s].sectors[last].label
        c[key] = (c[key] ?? 0) + 1
      }
    }
    const nc = counts.map((x, i) => (i === s ? c : x))
    const nt = trials.map((x, i) => (i === s ? x + k : x))
    setCounts(nc)
    setTrials(nt)
    if (p.dice2) setDice(lastD)
    else {
      const sec = p.spinners![s].sectors
      const tot = sec.reduce((a, x) => a + (x.w ?? 1), 0)
      let acc = 0
      for (let i = 0; i < last; i++) acc += sec[i].w ?? 1
      const mid = ((acc + (sec[last].w ?? 1) / 2) / tot) * 360
      setRot((r) => r.map((x, i) => (i === s ? x + 720 + ((((-mid - x) % 360) + 360) % 360) : x)))
    }
    sfx.ok()
    if (!done.current && nt.every((x) => x >= p.minTrials)) {
      done.current = true
      onDone(p.outcome(nc, nt))
    }
  }
  const reset = () => {
    setCounts(Array.from({ length: srcN }, () => ({})))
    setTrials(Array(srcN).fill(0))
  }
  void nudge
  const bars = (s: number) => {
    const keys = p.dice2 ? Array.from({ length: 11 }, (_, i) => String(i + 2)) : Array.from(new Set(p.spinners![s].sectors.map((x) => x.label)))
    const max = Math.max(1, ...keys.map((k) => counts[s][k] ?? 0))
    const colorOf = (k: string) => (p.dice2 ? '#6366f1' : p.spinners![s].sectors.find((x) => x.label === k)!.color)
    return (
      <div className="flex h-36 items-end justify-center gap-1 px-1" role="img" aria-label="Sonuç grafiği">
        {keys.map((k) => {
          const v = counts[s][k] ?? 0
          return (
            <div key={k} className="flex min-w-0 flex-1 flex-col items-center justify-end" style={{ maxWidth: p.dice2 ? 30 : 56 }}>
              <span className="text-xs font-black tabular-nums">{v}</span>
              <div className="w-full rounded-t-md transition-all" style={{ height: `${(v / max) * 96}px`, background: colorOf(k), outline: p.focus === k ? '3px solid #facc15' : undefined }} />
              <span className="mt-0.5 text-xs font-black">{k}</span>
            </div>
          )
        })}
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`grid w-full gap-3 ${srcN > 1 ? 'sm:grid-cols-2' : ''}`}>
        {Array.from({ length: srcN }, (_, s) => (
          <div key={s} className={`flex flex-col items-center gap-2 rounded-2xl p-3 ${dark(grade) ? 'bg-slate-800/80 ring-1 ring-slate-600' : 'bg-white/85 ring-1 ring-line'}`}>
            {!p.dice2 && <p className="font-black">{p.spinners![s].name}</p>}
            <div className="w-40 sm:w-44">
              {p.dice2 ? (
                <div className="flex justify-center gap-3"><DiceSvg value={dice[0]} size={64} /><DiceSvg value={dice[1]} size={64} /></div>
              ) : (
                <SpinnerSvg sectors={p.spinners![s].sectors.map((x) => ({ label: x.label, color: x.color, weight: x.w }))} rotation={rot[s]} />
              )}
            </div>
            {phase !== 'predict' && (
              <>
                <p className="text-sm font-black">{trials[s]} deneme{p.dice2 && trials[s] ? ` · son toplam ${dice[0] + dice[1]}` : ''}</p>
                {bars(s)}
                {phase === 'test' && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {p.batches.map((b) => (
                      <button key={b} type="button" disabled={!!p.maxTrials && trials[s] >= p.maxTrials} className={b === p.batches[0] ? mainBtn(grade) : btn(grade)} onClick={() => run(s, b)}>
                        {p.dice2 ? '🎲' : '🌀'} {b === 1 ? (p.dice2 ? '1 kez at' : '1 kez çevir') : `${b} kez`}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      {phase === 'test' && (
        <p className="text-center text-sm font-extrabold opacity-80">
          {p.maxTrials ? `Tam ${p.maxTrials} deneme yap` : `En az ${p.minTrials} deneme yap`}{srcN > 1 ? ' (her çarkta)' : ''}. Ne kadar çok deneme, o kadar güvenilir sonuç.
          {trials.some((x) => x > 0) && (
            <button type="button" onClick={reset} className="ml-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 underline">Sıfırla</button>
          )}
        </p>
      )}
    </div>
  )
}

// ───────────────────────── 6. Kibrit örüntüsü ─────────────────────────

export interface PatternP {
  kind: 'squares' | 'triangles' | 'houses'
  n: number
  graph?: boolean
}
export const sticks = (kind: PatternP['kind'], k: number) => (kind === 'squares' ? 3 * k + 1 : kind === 'triangles' ? 2 * k + 1 : 5 * k + 1)

function Figure({ kind, k }: { kind: PatternP['kind']; k: number }) {
  const S = 34
  const segs: [number, number, number, number][] = []
  if (kind === 'squares') {
    segs.push([0, 0, 0, S])
    for (let i = 0; i < k; i++) segs.push([i * S, 0, (i + 1) * S, 0], [i * S, S, (i + 1) * S, S], [(i + 1) * S, 0, (i + 1) * S, S])
  } else if (kind === 'triangles') {
    // üçgenler sırayla yukarı/aşağı
    const h = S * 0.87
    segs.push([0, h, S / 2, 0])
    for (let i = 0; i < k; i++) {
      const x = (i * S) / 2
      if (i % 2 === 0) segs.push([x + S / 2, 0, x + S, h], [x, h, x + S, h])
      else segs.push([x, 0, x + S, 0], [x + S, 0, x + S / 2, h])
    }
  } else {
    segs.push([0, 22, 0, 22 + S])
    for (let i = 0; i < k; i++) {
      const x = i * S
      segs.push([x, 22 + S, x + S, 22 + S], [x + S, 22, x + S, 22 + S], [x, 22, x + S / 2, 0], [x + S / 2, 0, x + S, 22], [x, 22, x + S, 22])
    }
  }
  const W = (kind === 'triangles' ? ((k + 1) * S) / 2 : k * S) + 8
  const H = kind === 'houses' ? 22 + S + 8 : S + 8
  return (
    <svg viewBox={`-4 -4 ${W} ${H}`} className="h-auto max-h-28" style={{ width: Math.min(560, W * 1.4) }} role="img" aria-label={`${k}. adım: ${segs.length} kibrit`}>
      {segs.map(([a, b, c, d], i) => (
        <g key={i}>
          <line x1={a} y1={b} x2={c} y2={d} stroke="#b45309" strokeWidth={4} strokeLinecap="round" />
          <circle cx={c} cy={d} r={2.6} fill="#dc2626" />
        </g>
      ))}
    </svg>
  )
}

export function PatternSim({ p, phase, grade, onDone }: SimBase & { p: PatternP }) {
  const [k, setK] = useState(phase === 'predict' ? 3 : 1)
  const [seen, setSeen] = useState<number[]>([1, 2, 3])
  const go = (nk: number) => {
    const v = Math.min(p.n, nk)
    setK(v)
    setSeen((s) => (s.includes(v) ? s : [...s, v].sort((a, b) => a - b)))
    sfx.ok()
    if (v === p.n) onDone({ value: sticks(p.kind, p.n), label: `${p.n}. adımda ${sticks(p.kind, p.n)} kibrit` })
  }
  const shown = phase === 'predict' ? [1, 2, 3] : [k]
  const rows = (phase === 'predict' ? [1, 2, 3] : seen).slice(-8)
  const G = 160
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full flex-col items-center gap-2 overflow-x-auto rounded-2xl bg-white/85 p-3 ring-1 ring-line">
        {shown.map((s) => (
          <div key={s} className="flex items-center gap-3">
            <span className="shrink-0 rounded-lg bg-amber-100 px-2 py-1 text-sm font-black text-amber-900">{s}. adım</span>
            <Figure kind={p.kind} k={s} />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-start justify-center gap-3">
        <table className={`overflow-hidden rounded-xl text-center text-sm font-black ${dark(grade) ? 'bg-slate-800 ring-1 ring-slate-600' : 'bg-white ring-1 ring-line'}`}>
          <thead><tr><th className="px-3 py-1.5">Adım</th><th className="px-3 py-1.5">Kibrit</th></tr></thead>
          <tbody>
            {rows.map((s) => <tr key={s} className={s === k && phase !== 'predict' ? 'bg-amber-100 text-amber-950' : ''}><td className="px-3 py-1 tabular-nums">{s}</td><td className="px-3 py-1 tabular-nums">{sticks(p.kind, s)}</td></tr>)}
            {phase === 'predict' && <tr><td className="px-3 py-1">{p.n}</td><td className="px-3 py-1">?</td></tr>}
          </tbody>
        </table>
        {p.graph && phase !== 'predict' && (
          <svg viewBox={`0 0 ${G} ${G}`} className="w-40 rounded-xl bg-slate-900 ring-1 ring-slate-600" role="img" aria-label="Adım–kibrit grafiği">
            {(() => {
              const maxX = p.n
              const maxY = sticks(p.kind, p.n)
              const X = (x: number) => 16 + (x / maxX) * (G - 28)
              const Y = (y: number) => G - 16 - (y / maxY) * (G - 28)
              return (
                <>
                  <line x1={16} y1={G - 16} x2={G - 8} y2={G - 16} stroke="#64748b" />
                  <line x1={16} y1={8} x2={16} y2={G - 16} stroke="#64748b" />
                  {seen.length >= 2 && <line x1={X(0)} y1={Y(sticks(p.kind, 0))} x2={X(k)} y2={Y(sticks(p.kind, k))} stroke="#22d3ee" strokeDasharray="4 3" />}
                  {seen.map((s) => <circle key={s} cx={X(s)} cy={Y(sticks(p.kind, s))} r={3.5} fill="#facc15" />)}
                  <text x={G - 10} y={G - 4} fontSize={10} fill="#94a3b8" textAnchor="end">adım</text>
                </>
              )
            })()}
          </svg>
        )}
      </div>
      {phase === 'test' && k < p.n && (
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className={mainBtn(grade)} onClick={() => go(k + 1)}>🔥 Sonraki adımı kur ({k + 1}.)</button>
          {k >= 4 && p.n - k > 2 && <button type="button" className={btn(grade)} onClick={() => go(k + 5)}>+5 adım</button>}
        </div>
      )}
    </div>
  )
}

// ───────────────────────── 7. Veri: yeni değer ekle ─────────────────────────

export interface MeanP {
  values: number[]
  add: number
  min: number
  max: number
  unit: string
  what: string
  median?: boolean
}

const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
const median = (a: number[]) => {
  const s = a.slice().sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function MeanSim({ p, phase, grade, onDone, nudge }: SimBase & { p: MeanP }) {
  const [v, setV] = useState<number | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const W = 520
  const X = (x: number) => 24 + ((x - p.min) / (p.max - p.min)) * (W - 48)
  const all = v === null ? p.values : [...p.values, v]
  const stack = (arr: number[]) => {
    const seen: Record<number, number> = {}
    return arr.map((x) => ({ x, k: (seen[x] = (seen[x] ?? 0) + 1) - 1 }))
  }
  const dots = stack(p.values)
  const step = p.max - p.min > 40 ? 5 : 1
  const bind = useDrag(
    ({ xy: [x], event }) => {
      event?.preventDefault?.()
      if (phase !== 'test' || !svg.current) return
      const r = svg.current.getBoundingClientRect()
      const val = p.min + ((x - r.left) / r.width * W - 24) / (W - 48) * (p.max - p.min)
      setV(Math.max(p.min, Math.min(p.max, Math.round(val / step) * step)))
    },
    { eventOptions: { passive: false } },
  )
  const m0 = mean(p.values)
  const m1 = mean(all)
  const d0 = median(p.values)
  const d1 = median(all)
  const f = (x: number) => tr(Math.round(x * 10) / 10, 1)
  const finish = () => {
    if (v !== p.add) return nudge(`Yeni değer ${p.add} ${p.unit} olmalı. Noktayı sayı doğrusunda tam ${ek(p.add, 'dat')} getirdin mi?`)
    onDone({ label: `Ortalama ${f(m0)} → ${f(m1)}${p.median ? `, ortanca ${f(d0)} → ${f(d1)}` : ''}`, value: m1 - m0 })
  }
  const H = 190
  const ticks = []
  for (let t = p.min; t <= p.max; t += step * (p.max - p.min > 40 ? 2 : 1)) ticks.push(t)
  const ink = dark(grade) ? '#e2e8f0' : '#1f2340'
  return (
    <div className="flex flex-col items-center gap-3">
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[560px]" style={{ touchAction: 'none' }} role="img" aria-label={`Nokta grafiği, ${p.what}`}>
        <line x1={16} x2={W - 16} y1={H - 40} y2={H - 40} stroke={ink} strokeWidth={2} />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={X(t)} x2={X(t)} y1={H - 44} y2={H - 36} stroke={ink} />
            <text x={X(t)} y={H - 20} fontSize={13} fontWeight={800} textAnchor="middle" fill={ink}>{t}</text>
          </g>
        ))}
        {dots.map((d, i) => <circle key={i} cx={X(d.x)} cy={H - 54 - d.k * 18} r={8} fill="#3b82f6" stroke="#fff" strokeWidth={1.5} />)}
        {phase !== 'predict' && (
          <>
            <text x={X(m1)} y={16} fontSize={12} fontWeight={900} fill="#d6457a" textAnchor="middle">ortalama</text>
            {p.median && <line x1={X(d1)} x2={X(d1)} y1={22} y2={H - 40} stroke="#16a34a" strokeWidth={3} strokeDasharray="6 4" />}
            {p.median && <text x={X(d1)} y={H - 4} fontSize={12} fontWeight={900} fill="#16a34a" textAnchor="middle">ortanca</text>}
            <line x1={X(m1)} x2={X(m1)} y1={22} y2={H - 40} stroke="#d6457a" strokeWidth={3} />
          </>
        )}
        {phase === 'test' && (
          <g {...bind()} data-handle style={{ cursor: 'ew-resize' }}>
            <rect x={v === null ? W - 70 : X(v) - 26} y={8} width={52} height={H - 52} fill="transparent" />
            <circle cx={v === null ? W - 44 : X(v)} cy={v === null ? 26 : H - 54 - (dots.filter((d) => d.x === v).length) * 18} r={11} fill="#f97316" stroke="#fff" strokeWidth={3} />
            {v === null && <text x={W - 44} y={52} fontSize={12} fontWeight={900} textAnchor="middle" fill="#f97316">yeni</text>}
          </g>
        )}
        {phase === 'after' && v !== null && <circle cx={X(v)} cy={H - 54 - dots.filter((d) => d.x === v).length * 18} r={9} fill="#f97316" stroke="#fff" strokeWidth={2} />}
      </svg>
      {phase !== 'predict' && (
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          <span className="chip bg-rose-100 px-3 py-1.5 text-sm text-rose-900">│ Ortalama: {f(m0)} → {f(m1)}</span>
          {p.median && <span className="chip bg-emerald-100 px-3 py-1.5 text-sm text-emerald-900">┆ Ortanca: {f(d0)} → {f(d1)}</span>}
        </div>
      )}
      {phase === 'test' && (
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className={btn(grade, 'size-12 px-0')} onClick={() => setV((x) => Math.max(p.min, (x ?? p.max) - step))} aria-label="Yeni değeri azalt"><Minus size={20} /></button>
          <span className="grid min-w-24 place-items-center text-xl font-black">{v ?? '—'} {v !== null ? p.unit : ''}</span>
          <button type="button" className={btn(grade, 'size-12 px-0')} onClick={() => setV((x) => Math.min(p.max, (x ?? p.min) + step))} aria-label="Yeni değeri artır"><Plus size={20} /></button>
          <button type="button" className={mainBtn(grade)} disabled={v === null} onClick={finish}>✔ Ekledim</button>
        </div>
      )}
    </div>
  )
}

// ───────────────────────── 8. Çember yuvarla ─────────────────────────

export interface CircleP {
  need: number
}

export function CircleSim({ p, phase, grade, onDone }: SimBase & { p: CircleP }) {
  const [d, setD] = useState(2)
  const [roll, setRoll] = useState<number | null>(null)
  const [log, setLog] = useState<{ d: number; c: number }[]>([])
  const U = 14
  const C = Math.PI * d
  const W = 520
  const rolling = roll !== null
  const fired = useRef(false)
  const go = () => {
    if (phase !== 'test' || rolling) return
    setRoll(0)
    requestAnimationFrame(() => requestAnimationFrame(() => setRoll(1)))
    window.setTimeout(() => {
      setRoll(null)
      sfx.ok()
      if (log.some((x) => x.d === d)) return
      const nl = [...log, { d, c: Math.round(C * 10) / 10 }].sort((a, b) => a.d - b.d)
      setLog(nl)
      if (nl.length >= p.need && !fired.current) {
        fired.current = true
        onDone({ label: `${nl.length} çemberde de çevre ÷ çap ≈ 3,1`, choice: 1 })
      }
    }, 1300)
  }
  const r = (d * U) / 2
  const x = 20 + r + (roll === 1 ? C * U : 0)
  const ink = dark(grade) ? '#e2e8f0' : '#1f2340'
  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${W} 160`} className="w-full max-w-[560px]" role="img" aria-label={`Çapı ${d} birim olan çember`}>
        <line x1={20} x2={W - 10} y1={140} y2={140} stroke={ink} strokeWidth={2} />
        {Array.from({ length: Math.floor((W - 30) / U) + 1 }, (_, i) => <line key={i} x1={20 + i * U} x2={20 + i * U} y1={140} y2={i % 5 === 0 ? 150 : 145} stroke={ink} />)}
        {Array.from({ length: Math.floor((W - 30) / (U * 5)) + 1 }, (_, i) => <text key={i} x={20 + i * 5 * U} y={159} fontSize={9} textAnchor="middle" fill={ink}>{i * 5}</text>)}
        {log.map((l) => <line key={l.d} x1={20 + l.c * U} x2={20 + l.c * U} y1={124} y2={140} stroke="#22c55e" strokeWidth={3} />)}
        <g style={{ transform: `translate(${x}px, ${140 - r}px) rotate(${roll === 1 ? 360 : 0}deg)`, transition: roll === 1 ? 'transform 1.2s linear' : 'none' }}>
          <circle r={r} fill="#fde68a" stroke="#b45309" strokeWidth={3} />
          <line x1={-r} x2={r} y1={0} y2={0} stroke="#be185d" strokeWidth={2.5} />
          <circle cx={0} cy={r} r={4} fill="#e11d48" />
        </g>
      </svg>
      {phase === 'test' && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm font-black">Çap</span>
          <button type="button" className={btn(grade, 'size-12 px-0')} disabled={d <= 1 || rolling} onClick={() => setD(d - 1)} aria-label="Çapı azalt"><Minus size={20} /></button>
          <span className="min-w-10 text-center text-2xl font-black">{d}</span>
          <button type="button" className={btn(grade, 'size-12 px-0')} disabled={d >= 9 || rolling} onClick={() => setD(d + 1)} aria-label="Çapı artır"><Plus size={20} /></button>
          <button type="button" className={mainBtn(grade)} disabled={rolling} onClick={go}>⭕ Bir tur yuvarla</button>
        </div>
      )}
      {log.length > 0 && (
        <table className={`rounded-xl text-center text-sm font-black ${dark(grade) ? 'bg-slate-800' : 'bg-white ring-1 ring-line'}`}>
          <thead><tr><th className="px-3 py-1">Çap</th><th className="px-3 py-1">Çevre (bir tur)</th><th className="px-3 py-1">Çevre ÷ çap</th></tr></thead>
          <tbody>{log.map((l) => <tr key={l.d}><td className="px-3 py-1">{l.d}</td><td className="px-3 py-1">≈ {tr(l.c, 1)}</td><td className="px-3 py-1">≈ {tr(Math.round((l.c / l.d) * 100) / 100, 2)}</td></tr>)}</tbody>
        </table>
      )}
      {phase === 'test' && <p className="text-sm font-extrabold opacity-80">Farklı çaplı en az {p.need} çember yuvarla ({log.length}/{p.need}).</p>}
    </div>
  )
}
