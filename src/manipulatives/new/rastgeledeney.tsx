import { useEffect, useRef, useState, type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import { Plane, usePlane } from '../../interactive/Plane'
import { MathText } from '../../components/MathText'
import { ToolButton } from '../ui'
import type { ToolDef } from '../types'

/**
 * Rastgele Deney Tasarımcısı
 *  - Torba: renkli top ekle/çıkar. Çark: dilim sınırlarını parmakla sürükle (15°’lik adımlar), dilim ekle/çıkar.
 *    Zar: 1 ya da 2 zar (2 zarda toplam).
 *  - 1 / 10 / 100 / 1000 deneme (animasyonlu). Göreli sıklık sütunları kuramsal olasılık çizgisiyle karşılaştırılır;
 *    seçili sonucun göreli sıklığı deneme sayısı arttıkça kuramsal olasılığa yaklaşır (Plane üzerinde çizgi).
 *  - Tahmin: “100 denemede kaç kez?” → tahmin, deney ve kuramsal beklenti yan yana.
 *  - “Adil mi?” modu: sonuçları Ali’ye / Ayşe’ye ver; kazanma olasılıkları ve deney sonuçları karşılaştırılır.
 *
 * Görev hedefi (target):
 *   1) { question: string, choices: string[], answer: string, ...deney }
 *      Seçeneklerden birini seç (value.choice === answer). Deney tasarımı kilitlidir; deneme yapılabilir.
 *   2) { prob: { [etiket]: number | 'a/b' }, kind?: 'torba' | 'cark' }
 *      Bu olasılıkları veren bir deney tasarla. Etiketler renk adlarıdır (Kırmızı, Mavi, Yeşil, Sarı, Mor, Turuncu);
 *      deneyde olasılığı 0’dan büyük her sonuç listede olmalı ve olasılıklar eşleşmeli.
 *   Deney alanları (isteğe bağlı): kind: 'torba' | 'cark' | 'zar', bag: { Kırmızı: 3, Mavi: 1 },
 *   spinner: { Kırmızı: 180, Mavi: 90, Yeşil: 90 } (derece), dice: 1 | 2
 *   Görev modunda kuramsal olasılıklar gizlenir.
 */

type Kind = 'torba' | 'cark' | 'zar'
type V = {
  kind: Kind
  bag: number[]
  /** çark dilimleri: [renk indeksi, derece] */
  spin: [number, number][]
  dice: 1 | 2
  seq: number[]
  focus: number
  predict: number | null
  game: boolean
  owner: number[]
  choice: string | null
}
type Out = { label: string; color: string; w: number }

const COLORS = [
  { name: 'Kırmızı', c: '#ef4444' },
  { name: 'Mavi', c: '#3b82f6' },
  { name: 'Yeşil', c: '#22c55e' },
  { name: 'Sarı', c: '#eab308' },
  { name: 'Mor', c: '#a855f7' },
  { name: 'Turuncu', c: '#f97316' },
]
const DICE_COL = '#6366f1'
const MAX_SEQ = 20000
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
const frac = (w: number, t: number) => {
  if (!t || w <= 0) return '0'
  const x = w / t
  if (Math.abs(x - 1) < 1e-9) return '1'
  for (let d = 2; d <= 720; d++) {
    const k = Math.round(x * d)
    if (Math.abs(x * d - k) < 1e-6) { const g = gcd(k, d) || 1; return `[[${k / g}/${d / g}]]` }
  }
  return fmt(x, 3)
}
const fracPlain = (w: number, t: number) => frac(w, t).replace(/\[\[|\]\]/g, '')
const fmt = (v: number, d = 2) => (Math.round(v * 10 ** d) / 10 ** d + 0).toLocaleString('tr-TR', { maximumFractionDigits: d })

function outcomesOf(v: V): Out[] {
  if (v.kind === 'torba') return v.bag.map((k, i) => ({ label: COLORS[i].name, color: COLORS[i].c, w: k })).filter((o) => o.w > 0)
  if (v.kind === 'cark') return v.spin.map(([ci, d]) => ({ label: COLORS[ci].name, color: COLORS[ci].c, w: d }))
  if (v.dice === 1) return [1, 2, 3, 4, 5, 6].map((k) => ({ label: String(k), color: DICE_COL, w: 1 }))
  return Array.from({ length: 11 }, (_, i) => ({ label: String(i + 2), color: DICE_COL, w: 6 - Math.abs(i + 2 - 7) }))
}
/** aynı etiketli sonuçları birleştir (ör. çarkta iki kırmızı dilim) */
function probsByLabel(outs: Out[]) {
  const t = outs.reduce((s, o) => s + o.w, 0)
  const m = new Map<string, number>()
  outs.forEach((o) => m.set(o.label, (m.get(o.label) ?? 0) + o.w))
  return { m, t }
}
function pick(outs: Out[]) {
  const t = outs.reduce((s, o) => s + o.w, 0)
  let r = Math.random() * t
  for (let i = 0; i < outs.length; i++) {
    r -= outs[i].w
    if (r < 0) return i
  }
  return outs.length - 1
}
const parseProb = (x: unknown) => {
  if (typeof x === 'number') return x
  const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(String(x))
  return m ? +m[1] / +m[2] : Number(x)
}

/* ───────────────────────────── Cihazlar ───────────────────────────── */
function Bag({ bag, drawn }: { bag: number[]; drawn: { key: number; color: number } | null }) {
  const balls = bag.flatMap((k, i) => Array.from({ length: k }, () => i))
  const cols = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(balls.length * 1.4))))
  const r = balls.length > 30 ? 10 : 13
  return (
    <svg viewBox="0 0 240 230" className="mx-auto block w-full max-w-[260px]" role="img" aria-label="Torba">
      <path d="M60 70 Q40 75 34 130 Q28 205 120 212 Q212 205 206 130 Q200 75 180 70 Z" fill="#fde7c7" stroke="#d97706" strokeWidth={4} />
      <path d="M72 70 Q120 54 168 70" fill="none" stroke="#b45309" strokeWidth={6} strokeLinecap="round" />
      {balls.map((ci, k) => {
        const row = Math.floor(k / cols), col = k % cols
        const rowCount = Math.min(cols, balls.length - row * cols)
        const x = 120 + (col - (rowCount - 1) / 2) * (r * 2 + 3)
        const y = 192 - row * (r * 2 + 1)
        return <circle key={k} cx={x} cy={y} r={r} fill={COLORS[ci].c} stroke="#fff" strokeWidth={2} />
      })}
      {drawn && (
        <g key={drawn.key}>
          <circle cx={120} cy={34} r={17} fill={COLORS[drawn.color].c} stroke="#fff" strokeWidth={3}>
            <animateTransform attributeName="transform" type="translate" from="0 70" to="0 0" dur="0.45s" fill="freeze" />
          </circle>
        </g>
      )}
    </svg>
  )
}

function Spinner({ v, onChange, arrow, animate, editable, showFrac }: { v: V; onChange: (s: [number, number][]) => void; arrow: number; animate: boolean; editable: boolean; showFrac: boolean }) {
  const ref = useRef<SVGSVGElement>(null)
  const drag = useRef<number | null>(null)
  const R = 112, C = 130
  const cum: number[] = []
  v.spin.reduce((s, [, d]) => (cum.push(s + d), s + d), 0)
  const pt = (deg: number, r = R) => [C + r * Math.sin((deg * Math.PI) / 180), C - r * Math.cos((deg * Math.PI) / 180)] as const
  const angleAt = (cx: number, cy: number) => {
    const m = ref.current?.getScreenCTM()
    if (!m) return 0
    const p = new DOMPoint(cx, cy).matrixTransform(m.inverse())
    return ((Math.atan2(p.x - C, -(p.y - C)) * 180) / Math.PI + 360) % 360
  }
  const move = (cx: number, cy: number) => {
    const j = drag.current
    if (j === null) return
    const lo = j === 0 ? 0 : cum[j - 1], hi = cum[j + 1]
    let a = Math.round(angleAt(cx, cy) / 15) * 15
    a = Math.max(lo + 15, Math.min(hi - 15, a))
    if (a === cum[j]) return
    const nc = cum.slice()
    nc[j] = a
    onChange(v.spin.map(([ci], i) => [ci, nc[i] - (i ? nc[i - 1] : 0)]))
  }
  let a0 = 0
  return (
    <svg
      ref={ref}
      viewBox="0 0 260 260"
      className="mx-auto block w-full max-w-[300px] select-none"
      style={{ touchAction: 'none' }}
      role="img"
      aria-label="Çark"
      onPointerMove={(e) => drag.current !== null && move(e.clientX, e.clientY)}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      <circle cx={C} cy={C} r={R + 8} fill="#1f2340" />
      {v.spin.map(([ci, d], i) => {
        const s = a0, e = a0 + d
        a0 = e
        const [x0, y0] = pt(s), [x1, y1] = pt(e)
        const mid = (s + e) / 2
        const [tx, ty] = pt(mid, R * 0.62)
        const path = d >= 360 ? `M${C - R} ${C}a${R} ${R} 0 1 1 ${2 * R} 0a${R} ${R} 0 1 1 ${-2 * R} 0` : `M${C} ${C}L${x0} ${y0}A${R} ${R} 0 ${d > 180 ? 1 : 0} 1 ${x1} ${y1}Z`
        return (
          <g key={i}>
            <path d={path} fill={COLORS[ci].c} stroke="#fff" strokeWidth={2.5} />
            {d >= 30 && (
              <text x={tx} y={ty + 5} textAnchor="middle" fontSize={d >= 60 ? 15 : 12} fontWeight={900} fill="#fff" paintOrder="stroke" stroke="rgb(0 0 0 / .25)" strokeWidth={3}>
                {showFrac ? fracPlain(d, 360) : `${fmt(d, 1)}°`}
              </text>
            )}
          </g>
        )
      })}
      <g style={{ transform: `rotate(${arrow}deg)`, transformOrigin: `${C}px ${C}px`, transition: animate ? 'transform 1.3s cubic-bezier(.15,.7,.2,1)' : 'none' }}>
        <path d={`M${C - 7} ${C}L${C} ${C - R + 14}L${C + 7} ${C}Z`} fill="#1f2340" stroke="#fff" strokeWidth={2.5} strokeLinejoin="round" />
      </g>
      <circle cx={C} cy={C} r={11} fill="#fff" stroke="#1f2340" strokeWidth={3} />
      {editable && cum.slice(0, -1).map((c, j) => {
        const [x, y] = pt(c, R + 2)
        return (
          <g key={j} data-handle style={{ cursor: 'grab', touchAction: 'none' }} onPointerDown={(e) => { e.stopPropagation(); ref.current?.setPointerCapture(e.pointerId); drag.current = j }}>
            <circle cx={x} cy={y} r={24} fill="transparent" />
            <circle cx={x} cy={y} r={11} fill="#fff" stroke="#1f2340" strokeWidth={3} />
            <circle cx={x} cy={y} r={3.5} fill="#1f2340" />
          </g>
        )
      })}
      {editable && (() => { const [x, y] = pt(0, R + 2); return <circle cx={x} cy={y} r={6} fill="#1f2340" stroke="#fff" strokeWidth={2} /> })()}
    </svg>
  )
}

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[28, 28], [50, 50], [72, 72]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]], 6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]],
}
function Dice({ faces, rollKey }: { faces: number[]; rollKey: number }) {
  return (
    <svg viewBox={`0 0 ${faces.length * 120} 130`} className="mx-auto block w-full" style={{ maxWidth: faces.length * 130 }} role="img" aria-label={`Zar: ${faces.join(' ve ')}`}>
      {faces.map((f, i) => (
        <g key={`${rollKey}-${i}`} transform={`translate(${i * 120 + 10} 15)`}>
          <g>
            {rollKey > 0 && <animateTransform attributeName="transform" type="rotate" values={`${i ? -200 : 200} 50 50; ${i ? 15 : -15} 50 50; 0 50 50`} keyTimes="0;0.8;1" dur="0.6s" fill="freeze" />}
            <rect x={0} y={0} width={100} height={100} rx={20} fill="#fff" stroke="#1f2340" strokeWidth={4} />
            {(PIPS[f] ?? []).map(([x, y], k) => <circle key={k} cx={x} cy={y} r={9} fill={f === 1 ? '#ef4444' : '#1f2340'} />)}
          </g>
        </g>
      ))}
    </svg>
  )
}

/* ───────────────────────────── Grafikler ───────────────────────────── */
function FreqBars({ outs, counts, total, showTheory }: { outs: Out[]; counts: number[]; total: number; showTheory: boolean }) {
  const W = 420, H = 190, L = 34, Bm = 30, T = 14
  const PH = H - T - Bm
  const tw = outs.reduce((s, o) => s + o.w, 0)
  const band = (W - L - 6) / Math.max(outs.length, 1)
  const y = (p: number) => T + PH * (1 - p)
  const top = Math.min(1, Math.max(0.5, ...outs.map((o, i) => Math.max(o.w / tw, total ? counts[i] / total : 0))) * 1.1)
  const yy = (p: number) => y(p / top)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Göreli sıklık grafiği">
      {[0, 0.25, 0.5, 0.75, 1].filter((p) => p <= top + 1e-9).map((p) => (
        <g key={p}>
          <line x1={L} x2={W - 4} y1={yy(p)} y2={yy(p)} stroke="#eef0f6" />
          <text x={L - 5} y={yy(p) + 4} textAnchor="end" fontSize={10} fontWeight={800} fill="#5b6080">{fmt(p)}</text>
        </g>
      ))}
      <line x1={L} x2={W - 4} y1={yy(0)} y2={yy(0)} stroke="#1f2340" strokeWidth={1.5} />
      {outs.map((o, i) => {
        const x = L + band * i
        const rf = total ? counts[i] / total : 0
        const th = o.w / tw
        const bw = Math.min(46, band * 0.62)
        return (
          <g key={i}>
            <rect x={x + (band - bw) / 2} y={yy(rf)} width={bw} height={yy(0) - yy(rf)} rx={4} fill={o.color} opacity={0.9} />
            {showTheory && <line x1={x + (band - bw) / 2 - 5} x2={x + (band + bw) / 2 + 5} y1={yy(th)} y2={yy(th)} stroke="#1f2340" strokeWidth={3} strokeDasharray="5 3" />}
            {total > 0 && band > 26 && <text x={x + band / 2} y={yy(rf) - 5} textAnchor="middle" fontSize={band > 40 ? 11 : 9} fontWeight={900} fill="#1f2340">{fmt(rf)}</text>}
            <text x={x + band / 2} y={H - 12} textAnchor="middle" fontSize={band > 50 ? 12 : 11} fontWeight={800} fill="#1f2340">{band > 50 ? o.label : o.label.slice(0, 3)}</text>
          </g>
        )
      })}
    </svg>
  )
}

function axisMax(total: number) {
  for (const m of [10, 20, 50, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000, 15000, 20000]) if (total <= m) return m
  return 20000
}
function ConvergenceScene({ seq, focus, p, color, showTheory, ys: YS }: { seq: number[]; focus: number; p: number; color: string; showTheory: boolean; ys: number }) {
  const P = usePlane()
  const N = axisMax(seq.length)
  const unit = N / 10
  const pts: string[] = []
  let c = 0
  const stepEvery = Math.max(1, Math.ceil(seq.length / 500))
  for (let i = 0; i < seq.length; i++) {
    if (seq[i] === focus) c++
    if (i < 30 || i % stepEvery === 0 || i === seq.length - 1) pts.push(`${P.sx((i + 1) / unit)},${P.sy((c / (i + 1)) * YS)}`)
  }
  const xs: number[] = [], ys: number[] = []
  for (let k = Math.max(0, Math.ceil(P.view.xMin)); k <= Math.min(10, Math.floor(P.view.xMax)); k++) if (YS === 5 || k % 2 === 0) xs.push(k)
  for (let k = Math.max(0, Math.ceil(P.view.yMin)); k <= Math.min(YS, Math.floor(P.view.yMax)); k++) if (YS === 5 || k % 2 === 0) ys.push(k)
  const x0 = Math.max(4, Math.min(P.width - 4, P.sx(0))), y0 = Math.max(4, Math.min(P.height - 4, P.sy(0)))
  const last = seq.length ? c / seq.length : null
  return (
    <g pointerEvents="none">
      {xs.map((k) => k > 0 && <text key={`x${k}`} x={P.sx(k)} y={Math.min(P.height - 6, y0 + 16)} textAnchor="middle" fontSize={11} fontWeight={800} fill="#5b6080">{(k * unit).toLocaleString('tr-TR')}</text>)}
      {ys.map((k) => <text key={`y${k}`} x={Math.max(26, x0 - 6)} y={P.sy(k) + 4} textAnchor="end" fontSize={11} fontWeight={800} fill="#5b6080">{fmt(k / YS, 1)}</text>)}
      {showTheory && (
        <g>
          <line x1={0} x2={P.width} y1={P.sy(p * YS)} y2={P.sy(p * YS)} stroke="#1f2340" strokeWidth={2.5} strokeDasharray="9 6" />
          <text x={P.width - 8} y={P.sy(p * YS) - 7} textAnchor="end" fontSize={12} fontWeight={900} fill="#1f2340" paintOrder="stroke" stroke="#fff" strokeWidth={4}>kuramsal {fmt(p, 3)}</text>
        </g>
      )}
      {pts.length > 1 && <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />}
      {last !== null && <circle cx={P.sx(seq.length / unit)} cy={P.sy(last * YS)} r={6} fill={color} stroke="#fff" strokeWidth={2.5} />}
      <text x={P.width - 8} y={16} textAnchor="end" fontSize={11} fontWeight={900} fill="#5b6080">deneme sayısı →</text>
    </g>
  )
}

/* ───────────────────────────── Araç ───────────────────────────── */
function Card({ title, children, className = '' }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white p-3 ring-1 ring-line ${className}`}>
      {title && <p className="mb-2 text-xs font-extrabold tracking-wide text-ink-soft uppercase">{title}</p>}
      {children}
    </div>
  )
}

const BASE: V = {
  kind: 'torba',
  bag: [3, 1, 2, 0, 0, 0],
  spin: [[0, 180], [1, 90], [2, 90]],
  dice: 1,
  seq: [],
  focus: 0,
  predict: null,
  game: false,
  owner: [],
  choice: null,
}
function fromTarget(t?: Record<string, unknown>): V {
  if (!t) return BASE
  const v: V = { ...BASE, kind: (t.kind as Kind) ?? (t.spinner ? 'cark' : t.dice ? 'zar' : 'torba') }
  const idx = (name: string) => COLORS.findIndex((c) => c.name.toLocaleLowerCase('tr-TR') === name.toLocaleLowerCase('tr-TR'))
  if (t.bag && typeof t.bag === 'object') {
    const b = [0, 0, 0, 0, 0, 0]
    Object.entries(t.bag as Record<string, number>).forEach(([k, c]) => { const i = idx(k); if (i >= 0) b[i] = c })
    v.bag = b
  }
  if (t.spinner && typeof t.spinner === 'object') v.spin = Object.entries(t.spinner as Record<string, number>).map(([k, d]) => [Math.max(0, idx(k)), d] as [number, number])
  if (t.dice === 2) v.dice = 2
  if (t.prob) { v.bag = [1, 1, 0, 0, 0, 0]; v.spin = [[0, 180], [1, 180]] }
  return v
}

export const rastgeledeney: ToolDef<V> = {
  id: 'rastgeledeney',
  defaultConfig: {},
  initial: (_c, t) => fromTarget(t),
  check: (v, t) => {
    if (t.prob && typeof t.prob === 'object') {
      if (t.kind && v.kind !== t.kind) return false
      const { m, t: tot } = probsByLabel(outcomesOf(v))
      if (!tot) return false
      const want = Object.entries(t.prob as Record<string, unknown>).map(([k, p]) => [k.toLocaleLowerCase('tr-TR'), parseProb(p)] as const)
      const have = new Map([...m.entries()].filter(([, w]) => w > 0).map(([k, w]) => [k.toLocaleLowerCase('tr-TR'), w / tot]))
      if (want.filter(([, p]) => p > 0).length !== have.size) return false
      return want.every(([k, p]) => Math.abs((have.get(k) ?? 0) - p) < 1e-6)
    }
    return v.choice !== null && v.choice === t.answer
  },
  Component: ({ value, onChange, target, locked }) => {
    const task = !!target
    const designTask = !!target?.prob
    const designLocked = locked || (task && !designTask)
    const outs = outcomesOf(value)
    const tw = outs.reduce((s, o) => s + o.w, 0)
    const counts = outs.map((_, i) => 0 + value.seq.reduce((s, x) => s + (x === i ? 1 : 0), 0))
    const total = value.seq.length
    const focus = Math.min(value.focus, Math.max(0, outs.length - 1))
    const showTheory = !task || !!locked
    const latest = useRef(value)
    latest.current = value
    const [YS, setYS] = useState(5)
    useEffect(() => {
      const mq = window.matchMedia('(max-width: 640px)')
      const f = () => setYS(mq.matches ? 10 : 5)
      f()
      mq.addEventListener('change', f)
      return () => mq.removeEventListener('change', f)
    }, [])

    // animasyon durumu
    const [running, setRunning] = useState(false)
    const [arrow, setArrow] = useState(0)
    const [animArrow, setAnimArrow] = useState(false)
    const [drawn, setDrawn] = useState<{ key: number; color: number } | null>(null)
    const [faces, setFaces] = useState<number[]>([6, 6])
    const [rollKey, setRollKey] = useState(0)
    const timers = useRef<number[]>([])
    useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
    const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))

    // deney değişince sonuçları sıfırla
    const design = (p: Partial<V>) => !designLocked && onChange({ ...value, ...p, seq: [], predict: value.predict, owner: [], choice: value.choice })

    const showOutcome = (i: number, anim: boolean, d?: number[]) => {
      if (value.kind === 'cark') {
        let s = 0
        for (let k = 0; k < i; k++) s += outs[k].w
        const target = s + (0.15 + Math.random() * 0.7) * outs[i].w
        setAnimArrow(anim)
        setArrow((prev) => (anim ? prev + 1080 + ((target - (prev % 360)) % 360 + 360) % 360 : target))
      } else if (value.kind === 'torba') {
        setDrawn({ key: Date.now() + Math.random(), color: COLORS.findIndex((c) => c.name === outs[i].label) })
      } else if (d) {
        setFaces(d)
        if (anim) setRollKey((k) => k + 1)
      }
    }
    const one = () => {
      if (value.kind !== 'zar') return { i: pick(outs) }
      const d = Array.from({ length: value.dice }, () => 1 + Math.floor(Math.random() * 6))
      return { i: value.dice === 1 ? d[0] - 1 : d[0] + d[1] - 2, d }
    }
    const run = (N: number) => {
      if (running || locked || !outs.length || tw <= 0) return
      const room = Math.max(0, MAX_SEQ - value.seq.length)
      N = Math.min(N, room)
      if (!N) return
      const res = Array.from({ length: N }, one)
      const base = value.seq
      if (N === 1) {
        setRunning(true)
        showOutcome(res[0].i, true, res[0].d)
        later(() => { onChange({ ...latest.current, seq: [...base, res[0].i] }); setRunning(false) }, value.kind === 'cark' ? 1350 : 620)
        return
      }
      setRunning(true)
      const frames = N <= 10 ? N : N <= 100 ? 25 : 40
      for (let f = 1; f <= frames; f++) {
        later(() => {
          const upto = Math.ceil((N * f) / frames)
          const r = res[upto - 1]
          showOutcome(r.i, false, r.d)
          onChange({ ...latest.current, seq: base.concat(res.slice(0, upto).map((x) => x.i)) })
          if (f === frames) setRunning(false)
        }, f * (N <= 10 ? 160 : 55))
      }
    }

    // çark düzenleme
    const addSector = () => {
      if (value.spin.length >= 6) return
      const used = new Set(value.spin.map(([c]) => c))
      const ci = COLORS.findIndex((_, i) => !used.has(i))
      let big = 0
      value.spin.forEach(([, d], i) => { if (d > value.spin[big][1]) big = i })
      const d = value.spin[big][1]
      const half = Math.max(15, Math.round(d / 2 / 15) * 15)
      if (d - half < 15) return
      const s = value.spin.slice()
      s.splice(big, 1, [s[big][0], d - half], [ci < 0 ? 0 : ci, half])
      design({ spin: s })
    }
    const removeSector = () => {
      if (value.spin.length <= 2) return
      const s = value.spin.slice(0, -1)
      s[s.length - 1] = [s[s.length - 1][0], s[s.length - 1][1] + value.spin[value.spin.length - 1][1]]
      design({ spin: s })
    }
    const equalize = () => design({ spin: value.spin.map(([c]) => [c, 360 / value.spin.length] as [number, number]) })
    const recolor = (i: number) => {
      const s = value.spin.slice()
      s[i] = [(s[i][0] + 1) % COLORS.length, s[i][1]]
      design({ spin: s })
    }

    // tahmin
    const p = outs[focus] ? outs[focus].w / tw : 0
    const first100 = value.seq.slice(0, 100).filter((x) => x === focus).length

    // adil oyun
    const owner = outs.map((_, i) => value.owner[i] ?? (i % 2 ? 2 : 1))
    const pw = [1, 2].map((who) => outs.reduce((s, o, i) => s + (owner[i] === who ? o.w : 0), 0))
    const wins = [1, 2].map((who) => value.seq.filter((x) => owner[x] === who).length)
    const cycle = (i: number) => !locked && onChange({ ...value, owner: owner.map((o, j) => (j === i ? (o + 1) % 3 : o)) })

    const kindBtn = (k: Kind, label: string) => <ToolButton key={k} active={value.kind === k} disabled={designLocked} onClick={() => design({ kind: k, focus: 0 })}>{label}</ToolButton>

    return (
      <div className="flex min-w-0 flex-col gap-4">
        {!(task && !designTask) && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {(!designTask || !target?.kind || target.kind === 'torba') && kindBtn('torba', '👜 Torba')}
            {(!designTask || !target?.kind || target.kind === 'cark') && kindBtn('cark', '🎡 Çark')}
            {!designTask && kindBtn('zar', '🎲 Zar')}
          </div>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* deney */}
          <div className="flex flex-col gap-3 rounded-2xl bg-paper p-3">
            <div className="grid min-h-[240px] place-items-center">
              {value.kind === 'torba' && <Bag bag={value.bag} drawn={drawn} />}
              {value.kind === 'cark' && <Spinner v={value} onChange={(s) => design({ spin: s })} arrow={arrow} animate={animArrow} editable={!designLocked && !running} showFrac={showTheory} />}
              {value.kind === 'zar' && <Dice faces={faces.slice(0, value.dice)} rollKey={rollKey} />}
            </div>
            {value.kind === 'torba' && drawn && total > 0 && <p className="-mt-2 text-center text-sm font-bold text-ink-soft">Çekilen: <b style={{ color: COLORS[drawn.color]?.c }}>{COLORS[drawn.color]?.name}</b> (torbaya geri konur)</p>}
            {value.kind === 'zar' && total > 0 && <p className="-mt-2 text-center text-sm font-bold text-ink-soft">{value.dice === 2 ? `${faces[0]} + ${faces[1]} = ${faces[0] + faces[1]}` : `Gelen: ${faces[0]}`}</p>}

            {/* tasarım düzenleyici */}
            {!designLocked && value.kind === 'torba' && (
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {COLORS.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between gap-1 rounded-xl bg-white p-1 ring-1 ring-line">
                    <button type="button" onClick={() => design({ bag: value.bag.map((k, j) => (j === i ? Math.max(0, k - 1) : k)) })} disabled={!value.bag[i]} className="grid size-10 place-items-center rounded-lg text-xl font-black disabled:opacity-25" aria-label={`${c.name} top çıkar`}>−</button>
                    <span className="flex items-center gap-1 font-black tabular-nums"><span className="size-4 rounded-full" style={{ background: c.c }} />{value.bag[i]}</span>
                    <button type="button" onClick={() => design({ bag: value.bag.map((k, j) => (j === i ? Math.min(10, k + 1) : k)) })} className="grid size-10 place-items-center rounded-lg text-xl font-black" aria-label={`${c.name} top ekle`}>+</button>
                  </div>
                ))}
              </div>
            )}
            {!designLocked && value.kind === 'cark' && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-center text-xs font-bold text-ink-soft">Kenardaki beyaz tutamaçları sürükle. Rengini değiştirmek için aşağıdaki dilime dokun.</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {value.spin.map(([ci, d], i) => (
                    <button key={i} type="button" onClick={() => recolor(i)} className="min-h-11 rounded-xl px-3 text-sm font-black text-white shadow-sm active:scale-95" style={{ background: COLORS[ci].c }}>{COLORS[ci].name} · {fmt(d, 1)}°</button>
                  ))}
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  <ToolButton onClick={addSector} disabled={value.spin.length >= 6}>+ Dilim</ToolButton>
                  <ToolButton onClick={removeSector} disabled={value.spin.length <= 2}>− Dilim</ToolButton>
                  <ToolButton onClick={equalize}>Eşit böl</ToolButton>
                </div>
              </div>
            )}
            {!designLocked && value.kind === 'zar' && (
              <div className="flex justify-center gap-1.5">
                <ToolButton active={value.dice === 1} onClick={() => design({ dice: 1 })}>1 zar</ToolButton>
                <ToolButton active={value.dice === 2} onClick={() => design({ dice: 2 })}>2 zar (toplam)</ToolButton>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <button type="button" className="btn-primary" disabled={running || locked || tw <= 0} onClick={() => run(1)}>1 kez</button>
              {[10, 100, 1000].map((k) => <ToolButton key={k} disabled={running || locked || tw <= 0} onClick={() => run(k)}>{k.toLocaleString('tr-TR')} kez</ToolButton>)}
              <ToolButton disabled={running || !total || locked} onClick={() => onChange({ ...value, seq: [] })}><RotateCcw size={16} /><span className="sr-only">Sonuçları sil</span></ToolButton>
            </div>
          </div>

          {/* sonuçlar */}
          <div className="flex flex-col gap-3">
            <Card title={<>Göreli sıklık · {total.toLocaleString('tr-TR')} deneme{showTheory && <span className="ml-2 normal-case">(kesikli çizgi: kuramsal olasılık)</span>}</>}>
              <FreqBars outs={outs} counts={counts} total={total} showTheory={showTheory} />
              <div className="mt-1 overflow-x-auto">
                <table className="w-full text-center text-sm tabular-nums">
                  <tbody>
                    <tr className="text-xs text-ink-soft"><td className="text-left font-extrabold">Sonuç</td>{outs.map((o, i) => <td key={i} className="px-1 font-black" style={{ color: o.color === DICE_COL ? '#1f2340' : o.color }}>{value.kind === 'zar' || outs.length <= 4 ? o.label : o.label.slice(0, 3)}</td>)}</tr>
                    <tr><td className="text-left text-xs font-extrabold text-ink-soft">Sayı</td>{counts.map((c, i) => <td key={i} className="px-1 font-black">{c}</td>)}</tr>
                    {showTheory && <tr><td className="text-left text-xs font-extrabold text-ink-soft">Kuramsal</td>{outs.map((o, i) => <td key={i} className="px-1 font-bold"><MathText text={frac(o.w, tw)} /></td>)}</tr>}
                  </tbody>
                </table>
              </div>
            </Card>
            {!task && (
              <Card title="Tahmin et">
                <p className="text-sm font-bold">100 denemede <b style={{ color: outs[focus]?.color === DICE_COL ? undefined : outs[focus]?.color }}>{outs[focus]?.label}</b> kaç kez gelir?</p>
                <div className="mt-2 flex items-center justify-center gap-1">
                  {[-5, -1].map((d) => <ToolButton key={d} onClick={() => onChange({ ...value, predict: Math.max(0, (value.predict ?? 0) + d) })}>{d}</ToolButton>)}
                  <span className="min-w-14 text-center text-3xl font-black text-brand tabular-nums">{value.predict ?? '?'}</span>
                  {[1, 5].map((d) => <ToolButton key={d} onClick={() => onChange({ ...value, predict: Math.min(100, (value.predict ?? 0) + d) })}>+{d}</ToolButton>)}
                </div>
                {value.predict !== null && (
                  <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                    <div className="rounded-xl bg-brand-soft p-2"><p className="text-[11px] font-extrabold text-brand-ink uppercase">Tahminin</p><p className="text-xl font-black tabular-nums">{value.predict}</p></div>
                    <div className="rounded-xl bg-paper p-2"><p className="text-[11px] font-extrabold text-ink-soft uppercase">İlk 100 deneme</p><p className="text-xl font-black tabular-nums">{total >= 100 ? first100 : '…'}</p></div>
                    <div className="rounded-xl bg-paper p-2"><p className="text-[11px] font-extrabold text-ink-soft uppercase">Kuramsal</p><p className="text-xl font-black tabular-nums">{fmt(100 * p, 1)}</p></div>
                  </div>
                )}
                {value.predict !== null && total < 100 && <p className="mt-1 text-xs font-bold text-ink-soft">Karşılaştırmak için en az 100 deneme yap.</p>}
              </Card>
            )}
          </div>
        </div>

        <Card title="Deneme sayısı arttıkça göreli sıklık">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-bold text-ink-soft">İzlenen sonuç:</span>
            {outs.map((o, i) => (
              <button key={i} type="button" onClick={() => onChange({ ...value, focus: i })} className={`min-h-10 min-w-10 rounded-xl px-2.5 text-sm font-black ring-2 transition active:scale-95 ${focus === i ? 'text-white' : 'bg-white'}`} style={focus === i ? { background: o.color, boxShadow: `0 0 0 2px ${o.color}` } : { color: o.color, boxShadow: `0 0 0 2px ${o.color}55` }}>
                {o.label}
              </button>
            ))}
          </div>
          <Plane key={YS} initial={{ xMin: -1.4, xMax: 10.6, yMin: -0.6, yMax: YS + 0.6 }} aspect={(YS + 1.2) / 12} labels={false} fixedStep={1} label="Göreli sıklık çizgisi">
            <ConvergenceScene seq={value.seq} focus={focus} p={p} color={outs[focus]?.color ?? '#d6457a'} showTheory={showTheory} ys={YS} />
          </Plane>
          {total >= 50 && showTheory && (
            <p className="mt-2 text-sm font-bold text-ink-soft">
              {outs[focus]?.label} için göreli sıklık şimdi <b className="text-ink">{fmt(counts[focus] / total, 3)}</b>, kuramsal olasılık <b className="text-ink">{fmt(p, 3)}</b>. Deneme sayısı arttıkça çizgi kesikli çizgiye yaklaşır; az denemede ise çok dalgalanır.
            </p>
          )}
        </Card>

        <div className="grid gap-3">
          {!task && (
            <Card title={<span className="flex items-center justify-between">Adil mi? <button type="button" onClick={() => onChange({ ...value, game: !value.game })} className={`min-h-9 rounded-full px-3 text-xs font-black normal-case ring-1 ${value.game ? 'bg-brand text-white ring-brand' : 'bg-white text-ink ring-line'}`}>{value.game ? 'Oyun açık' : 'Oyunu başlat'}</button></span>}>
              {!value.game ? (
                <p className="text-sm font-bold text-ink-soft">Ali ile Ayşe bu deneyle oyun oynasın. Her sonucu birine ver: oyun ikisi için de adil mi?</p>
              ) : (
                <>
                  <p className="text-xs font-bold text-ink-soft">Sonuca dokun: Ali → Ayşe → kimse.</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {outs.map((o, i) => (
                      <button key={i} type="button" onClick={() => cycle(i)} className={`flex min-h-11 flex-col items-center justify-center rounded-xl px-2.5 text-xs font-black ring-2 active:scale-95 ${owner[i] === 1 ? 'bg-sky-100 ring-sky-400' : owner[i] === 2 ? 'bg-amber-100 ring-amber-400' : 'bg-white ring-line'}`}>
                        <span style={{ color: o.color === DICE_COL ? '#1f2340' : o.color }}>{o.label}</span>
                        <span className="text-[10px] text-ink-soft">{owner[i] === 1 ? 'Ali' : owner[i] === 2 ? 'Ayşe' : '—'}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-center">
                    {(['Ali', 'Ayşe'] as const).map((who, k) => (
                      <div key={who} className={`rounded-xl p-2 ${k ? 'bg-amber-50' : 'bg-sky-50'}`}>
                        <p className="text-sm font-black">{who}</p>
                        <p className="text-lg font-black"><MathText text={frac(pw[k], tw)} /></p>
                        <p className="text-xs font-bold text-ink-soft tabular-nums">{wins[k]} kez kazandı</p>
                      </div>
                    ))}
                  </div>
                  <p className={`mt-2 rounded-xl p-2 text-center text-sm font-black ${Math.abs(pw[0] - pw[1]) < 1e-9 ? 'bg-ok-soft text-green-800' : 'bg-bad-soft text-rose-800'}`}>
                    {Math.abs(pw[0] - pw[1]) < 1e-9 ? 'Adil: ikisinin kazanma olasılığı eşit.' : `Adil değil: ${pw[0] > pw[1] ? 'Ali' : 'Ayşe'} daha avantajlı.`}
                  </p>
                </>
              )}
            </Card>
          )}
          {task && !designTask && (
            <div className="rounded-2xl bg-brand-soft p-4 md:col-span-2">
              <p className="mb-3 text-center font-extrabold"><MathText text={String(target?.question ?? '')} /></p>
              <div className="flex flex-wrap justify-center gap-2">
                {((target?.choices as string[]) ?? []).map((ch) => (
                  <button key={ch} type="button" disabled={locked} onClick={() => onChange({ ...value, choice: ch })} className={`min-h-12 rounded-2xl border-2 px-4 font-extrabold ${value.choice === ch ? 'border-brand bg-white text-brand' : 'border-transparent bg-white'}`}><MathText text={ch} /></button>
                ))}
              </div>
            </div>
          )}
          {designTask && (
            <div className="rounded-2xl bg-brand-soft p-4 text-center md:col-span-2">
              <p className="text-sm font-extrabold text-brand-ink">Bu olasılıkları veren bir deney tasarla:</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {Object.entries(target?.prob as Record<string, unknown>).map(([k, pr]) => {
                  const ci = COLORS.findIndex((c) => c.name.toLocaleLowerCase('tr-TR') === k.toLocaleLowerCase('tr-TR'))
                  const pv = parseProb(pr)
                  return <span key={k} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 font-black"><span className="size-3.5 rounded-full" style={{ background: COLORS[ci]?.c ?? '#1f2340' }} />P({k}) = <MathText text={frac(pv, 1)} /></span>
                })}
              </div>
              <p className="mt-2 text-xs font-bold text-ink-soft">Tasarımını denemelerle sına: göreli sıklıklar bu değerlere yaklaşıyor mu?</p>
            </div>
          )}
        </div>
      </div>
    )
  },
}
