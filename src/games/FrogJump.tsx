import { useReducer, useRef, useState } from 'react'
import { ArrowRight, Lightbulb, RotateCcw, Shuffle, Undo2 } from 'lucide-react'
import type { ManipulativeConfig } from '../data/types'
import { pick, randInt, shuffle } from '../lib/random'
import { sfx } from '../lib/feedback'
import { fmt } from '../lib/format'
import { ek } from '../lib/generators'
import { useTracker } from '../lib/trackerContext'
import { Plane, usePlane, type View } from '../interactive/Plane'
import { starsFor, useFrame, useWidth, type GameProps } from './kit'
import { LevelDots, Nudge, Scene, SolutionList, StrategyPicker, TaskCard, useAge, useSolutions } from './kit2'

/**
 * Kurbağa Zıplatma — açık sayı doğrusu (Van de Walle).
 *  - Kurbağa başlangıçtan hedef yaprağa, çocuğun seçtiği zıplamalarla gider; işlem hareketten doğar (38 + 2 + 20 + 5 = 65).
 *  - Aynı hedefe farklı yollar ayrı çözüm sayılır; strateji (10’a tamamlama, telafi, basamak değeri…) yoldan çıkarılır.
 *  - Görev türleri: yaprağa ulaş (çok yol), iki sayı arası kaç (çıkarmayı ileri sayarak), eksik zıplama (akıl yürütme).
 *  - Süre, can, “en az zıplama” baskısı yok.
 */

type Lv = 1 | 2 | 3 | 4
type Kind = 'reach' | 'distance' | 'missing'

interface Task {
  kind: Kind
  start: number
  target: number
  /** Kaç farklı yol aranıyor */
  goal: number
  text: string
  /** Eksik zıplama görevi: verilen ilk zıplama ve seçenekler */
  first?: number
  options?: number[]
}

interface Cfg {
  max: number
  cards: number[]
  /** “Yuvarlak sayı” birimi: 10, 100, 1000 */
  base: number
  minSpan: number
  unitName: string
  tool: ManipulativeConfig
}

const CFG: Record<Lv, Cfg> = {
  1: { max: 20, cards: [1, 2, 5, 10, -1, -10], base: 10, minSpan: 3, unitName: 'onluk', tool: { min: 0, max: 20, step: 1 } },
  2: { max: 100, cards: [1, 2, 5, 10, 20, -1, -5, -10], base: 10, minSpan: 6, unitName: 'onluk', tool: { min: 0, max: 100, step: 1 } },
  3: { max: 1000, cards: [1, 5, 10, 50, 100, -1, -10, -100], base: 100, minSpan: 15, unitName: 'yüzlük', tool: { min: 0, max: 1000, step: 10 } },
  4: { max: 10000, cards: [10, 50, 100, 500, 1000, -10, -100, -1000], base: 1000, minSpan: 150, unitName: 'binlik', tool: { min: 0, max: 10000, step: 100 } },
}

/** Zıplama: aynı karta art arda dokununca büyür (+10, +10 → +20) */
interface Jump { unit: number; n: number }

const val = (j: Jump) => j.unit * j.n
const term = (v: number) => `${v > 0 ? '+' : '−'} ${fmt(Math.abs(v))}`
const card = (v: number) => `${v > 0 ? '+' : '−'}${fmt(Math.abs(v))}`
const L = (n: number) => ek(n, 'loc')
const A = (n: number) => ek(n, 'abl')
const D = (n: number) => ek(n, 'dat')

const COMPLETE: Record<Lv, string> = { 1: '10’a tamamlama', 2: '10’a tamamlama', 3: 'Yuvarlak sayıya tamamlama', 4: 'Yuvarlak sayıya tamamlama' }
const S = {
  back: 'Telafi (fazla zıpla, geri dön)',
  place: 'Basamak değeriyle zıplama',
  ones: '1’er sayma',
  single: 'Tek büyük zıplama',
  split: 'Parçalara ayırarak zıplama',
  diff: 'İleri sayarak çıkarma',
  missing: 'Eksik parçayı akıl yürüterek bulma',
}
const PRAISE: Record<string, string> = {
  '10’a tamamlama': 'Önce 10’un katına zıplayıp sonra kalanı ekledin.',
  'Yuvarlak sayıya tamamlama': 'Önce yuvarlak bir sayıya zıpladın, sonra kalanı ekledin.',
  [S.back]: 'Fazla zıplayıp geri döndün; buna telafi denir!',
  [S.place]: 'Önce büyük, sonra küçük zıplamalar yaptın.',
  [S.ones]: '1’er 1’er saydın. Daha büyük zıplamalarla da dener misin?',
  [S.single]: 'Tek bir zıplamayla gittin!',
  [S.split]: 'Aradaki farkı parçalara ayırarak zıpladın.',
}

/** Yoldaki hamlelerden stratejiyi çıkarır */
function classify(start: number, target: number, jumps: Jump[], lv: Lv): string {
  const vals = jumps.map(val)
  const dir = Math.sign(target - start)
  const pos: number[] = [start]
  for (const v of vals) pos.push(pos[pos.length - 1] + v)
  const base = CFG[lv].base
  if (vals.some((v) => Math.sign(v) !== dir) && pos.some((p) => (p - target) * dir > 0)) return S.back
  if (jumps.every((j) => Math.abs(j.unit) === 1) && Math.abs(target - start) > 2) return S.ones
  if (vals.length === 1) return S.single
  const round = (p: number) => p % base === 0 || (lv >= 3 && p % (base / 10) === 0)
  if (!round(start) && round(pos[1])) return COMPLETE[lv]
  const abs = vals.map(Math.abs)
  if (abs.every((a, i) => i === 0 || a <= abs[i - 1]) && abs[0] >= base) return S.place
  return S.split
}

// ─────────────────────────── Görevler ───────────────────────────

function gen<T>(make: () => T | null): T {
  for (let i = 0; i < 300; i++) {
    const r = make()
    if (r) return r
  }
  return make() as T
}

function reach(start: number, target: number, goal: number, text: string): Task {
  return { kind: 'reach', start, target, goal, text }
}
function distance(start: number, target: number): Task {
  return { kind: 'distance', start, target, goal: 1, text: `${fmt(start)} ile ${fmt(target)} arası kaç? Kurbağayı ${A(start)} ${D(target)} zıplat, sonra zıplamalarına bak.` }
}
function missing(start: number, first: number, target: number, lv: Lv): Task {
  const k = target - start - first
  const cfg = CFG[lv]
  const unit = cfg.base / 10
  const cands = [target - start, k + cfg.base, k + unit, k - unit, k + 2 * unit, k - 2 * unit, k + 3 * unit]
  const opts = [k]
  for (const c of cands) if (opts.length < 4 && c > 0 && !opts.includes(c) && start + first + c <= cfg.max) opts.push(c)
  return {
    kind: 'missing', start, target, first, goal: 1, options: shuffle(opts),
    text: `Kurbağa ${A(start)} ${D(target)} iki zıplamada gitti. İlk zıplaması +${fmt(first)} idi. İkinci zıplama kaçtı?`,
  }
}

function makeTasks(lv: Lv): Task[] {
  const two = (s: number, t: number) => `Kurbağa ${L(s)}. ${L(t)}ki yaprağa giden 2 farklı yol bulabilir misin?`
  const back = (s: number, t: number) => `Yaprak geride kaldı! Kurbağa ${L(s)}, yaprak ${L(t)}. Geri zıplayarak 2 farklı yol bul.`
  const comp = (s: number, t: number) => `Kurbağa ${L(s)}, yaprak ${L(t)}. 2 farklı yol bul; fazla zıplayıp geri dönmek de serbest!`
  if (lv === 1) {
    const [s1, t1] = [randInt(6, 9), randInt(11, 14)]
    const s2 = randInt(5, 8)
    const [s3, t3] = gen(() => { const s = randInt(5, 8), t = s + randInt(6, 9); return t > 10 && t <= 17 ? [s, t] : null })
    const [s4, t4] = gen(() => { const s = randInt(1, 4), t = s + randInt(10, 14); return t <= 18 ? [s, t] : null })
    const [s5, t5] = [randInt(14, 18), randInt(5, 9)]
    const s6 = randInt(3, 8)
    return [
      reach(s1, t1, 2, two(s1, t1)),
      missing(s2, 10 - s2, 10 + randInt(3, 6), lv),
      distance(s3, t3),
      reach(s4, t4, 2, two(s4, t4)),
      reach(s5, t5, 2, back(s5, t5)),
      reach(s6, s6 + 9, 2, comp(s6, s6 + 9)),
    ]
  }
  if (lv === 2) {
    const [s1, t1] = gen(() => { const s = randInt(2, 5) * 10 + randInt(5, 8), t = s + randInt(22, 37); return t % 10 !== 0 && t % 10 < s % 10 && t < 100 ? [s, t] : null })
    const [s2, t2] = gen(() => { const s = randInt(41, 49), t = randInt(81, 88); return s % 10 !== 0 && t % 10 < s % 10 ? [s, t] : null })
    const s3 = gen(() => { const s = randInt(21, 39); return s % 10 ? s : null })
    const f3 = pick([20, 30])
    const [s4, t4] = gen(() => { const s = randInt(71, 89), t = s - randInt(23, 38); return s % 10 && t % 10 ? [s, t] : null })
    const [s5, t5] = gen(() => { const s = randInt(21, 49), t = s + pick([19, 29, 39]); return s % 10 && t < 100 ? [s, t] : null })
    const [s6, t6] = gen(() => { const s = randInt(12, 19), t = s + randInt(45, 68); return t <= 95 && t % 10 ? [s, t] : null })
    return [
      reach(s1, t1, 3, `Kurbağa ${L(s1)}. ${L(t1)}ki yaprağa giden 3 farklı yol bulabilir misin?`),
      distance(s2, t2),
      missing(s3, f3, s3 + f3 + randInt(4, 9), lv),
      reach(s4, t4, 2, back(s4, t4)),
      reach(s5, t5, 2, comp(s5, t5)),
      reach(s6, t6, 2, two(s6, t6)),
    ]
  }
  if (lv === 3) {
    const s1 = randInt(2, 4) * 100 + pick([60, 70, 80, 90])
    const t1 = s1 + randInt(2, 3) * 100 + randInt(2, 5) * 10
    const s2 = randInt(6, 8) * 100 + randInt(1, 9)
    const t2 = s2 - randInt(210, 290)
    const s3 = randInt(1, 3) * 100 + randInt(1, 9) * 10
    const s4 = randInt(3, 4) * 100 + randInt(91, 98)
    const t4 = s4 + randInt(150, 260)
    const s5 = randInt(1, 4) * 100 + randInt(11, 49)
    const t5 = s5 + pick([199, 299, 190, 290])
    const s6 = randInt(120, 180)
    const t6 = s6 + randInt(310, 480)
    return [
      reach(s1, t1, 2, two(s1, t1)),
      reach(s2, t2, 2, back(s2, t2)),
      missing(s3, 200, s3 + 200 + randInt(3, 9) * 10 + pick([0, 5]), lv),
      distance(s4, t4),
      reach(s5, t5, 2, comp(s5, t5)),
      reach(s6, t6, 2, two(s6, t6)),
    ]
  }
  const s1 = randInt(2, 4) * 1000 + pick([900, 950, 800])
  const t1 = s1 + randInt(2, 3) * 1000 + randInt(1, 4) * 100 + pick([0, 50])
  const s2 = randInt(6, 8) * 1000 + randInt(1, 3) * 10
  const t2 = s2 - randInt(15, 28) * 100 - pick([30, 60, 80])
  const s3 = randInt(1, 3) * 1000 + randInt(1, 9) * 100
  const s4 = randInt(3, 5) * 1000 - pick([10, 20, 50])
  const t4 = s4 + randInt(18, 36) * 100 + pick([0, 40, 70])
  const s5 = randInt(11, 40) * 100 + pick([20, 40])
  const t5 = s5 + pick([1990, 2990, 1900, 2900])
  const s6 = randInt(5, 15) * 100
  const t6 = s6 + randInt(30, 60) * 100 + pick([10, 50, 80])
  return [
    reach(s1, t1, 2, two(s1, t1)),
    reach(s2, t2, 2, back(s2, t2)),
    missing(s3, 2000, s3 + 2000 + randInt(3, 9) * 100 + pick([0, 50]), lv),
    distance(s4, t4),
    reach(s5, t5, 2, comp(s5, t5)),
    reach(s6, t6, 2, two(s6, t6)),
  ]
}

/** Başlangıç ve hedef görünecek şekilde ilk görünüm; sağda yakınlaştırma düğmelerine yer bırakılır */
function viewFor(a: number, b: number, minSpan: number): View {
  let lo = Math.min(a, b)
  let hi = Math.max(a, b)
  const span = Math.max(hi - lo, minSpan)
  const c = (lo + hi) / 2
  lo = c - span * 0.6
  hi = c + span * 0.78
  if (lo < -span * 0.04) {
    hi += -span * 0.04 - lo
    lo = -span * 0.04
  }
  return { xMin: lo, xMax: hi, yMin: 0, yMax: 1 }
}

// ─────────────────────────── Çizim ───────────────────────────

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
const arcH = (dx: number, y0: number) => Math.min(y0 - 42, Math.max(12, 10 + Math.abs(dx) * 0.3))

function Frog({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(0.85)`}>
      <ellipse cx={-13} cy={-3} rx={7} ry={3.5} fill="#16a34a" />
      <ellipse cx={13} cy={-3} rx={7} ry={3.5} fill="#16a34a" />
      <ellipse cx={0} cy={-12} rx={15} ry={11} fill="#22c55e" stroke="#15803d" strokeWidth={1.5} />
      <ellipse cx={0} cy={-8} rx={8} ry={5} fill="#bbf7d0" />
      <circle cx={-7} cy={-23} r={5.5} fill="#fff" stroke="#15803d" strokeWidth={1.5} />
      <circle cx={7} cy={-23} r={5.5} fill="#fff" stroke="#15803d" strokeWidth={1.5} />
      <circle cx={-6} cy={-23} r={2.4} fill="#1f2340" />
      <circle cx={8} cy={-23} r={2.4} fill="#1f2340" />
      <path d="M-6 -13 Q0 -8 6 -13" stroke="#14532d" strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </g>
  )
}

function Pad({ x, y, r, fill = '#4ade80', stroke = '#15803d' }: { x: number; y: number; r: number; fill?: string; stroke?: string }) {
  const k = 0.36
  const a = (14 * Math.PI) / 180
  const p = (s: number) => `${r * Math.cos(s * a)} ${k * r * Math.sin(s * a)}`
  return (
    <g transform={`translate(${x} ${y + 1})`}>
      <path d={`M0 0 L${p(1)} A${r} ${k * r} 0 1 1 ${p(-1)} Z`} fill={fill} stroke={stroke} strokeWidth={1.3} strokeLinejoin="round" />
    </g>
  )
}

interface Arc { a: number; b: number; tone: 'go' | 'back' | 'given' | 'try' }

function Pill({ x, text, color, y = 4 }: { x: number; text: string; color: string; y?: number }) {
  const w = 16 + text.length * 8.4
  return (
    <g>
      <rect x={x - w / 2} y={y} width={w} height={23} rx={11.5} fill={color} />
      <text x={x} y={y + 16.5} textAnchor="middle" fontSize={14} fontWeight={900} fill="#fff">{text}</text>
    </g>
  )
}

function River({ start, target, arcs, pads, frog, hop, unit }: { unit: number; start: number; target: number; arcs: Arc[]; pads: number[]; frog: number; hop: { from: number; to: number; t: number } | null }) {
  const P = usePlane()
  const y0 = P.sy(0)
  const W = P.width
  const tx = P.sx(target)
  const s0 = P.sx(start)
  const lift = hop && hop.t < 1 ? Math.sin(Math.PI * hop.t) * arcH(P.sx(hop.to) - P.sx(hop.from), y0) : 0
  const color = { go: '#15803d', back: '#ea580c', given: '#64748b', try: '#7c3aed' }
  // Başlangıç ve hedef etiketleri çizginin altında; çok yakınsa iki yana açılır
  const gap = Math.abs(tx - s0) < 64 ? (64 - Math.abs(tx - s0)) / 2 : 0
  const side = tx >= s0 ? 1 : -1
  return (
    <g>
      <rect x={0} y={0} width={W} height={y0 - 13} fill="#e0f2fe" />
      {[20, 46].map((y, i) => (
        <path key={y} d={`M${-10 + i * 40} ${y} q15 -5 30 0 t30 0 M${W * 0.5 + i * 30} ${y + 8} q15 -5 30 0 t30 0`} stroke="#fff" strokeOpacity={0.9} strokeWidth={2} fill="none" />
      ))}
      {P.unitPx * unit >= 9 && P.step > unit &&
        Array.from({ length: Math.min(400, Math.floor((P.view.xMax - P.view.xMin) / unit) + 2) }, (_, i) => (Math.ceil(P.view.xMin / unit) + i) * unit)
          .filter((v) => Math.abs(v / P.step - Math.round(v / P.step)) > 1e-9)
          .map((v) => <line key={v} x1={P.sx(v)} x2={P.sx(v)} y1={y0 - 5} y2={y0 + 5} stroke="#8a8fb0" strokeWidth={1.2} />)}
      <Pad x={s0} y={y0} r={14} fill="#bfdbfe" stroke="#2563eb" />
      <Pad x={tx} y={y0} r={20} fill="#86efac" />
      <g transform={`translate(${tx + 8} ${y0 - 1})`}>
        {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={0} cy={-4} rx={3} ry={5} fill="#f472b6" transform={`rotate(${a}) translate(0 -1)`} />)}
        <circle r={2.6} fill="#facc15" />
      </g>
      {pads.filter((v) => v !== target && v !== start).map((v) => <Pad key={v} x={P.sx(v)} y={y0} r={11} />)}
      {arcs.map(({ a, b, tone }, i) => {
        const x1 = P.sx(a), x2 = P.sx(b)
        // Sağ üstteki yakınlaştırma düğmelerinin altında kalan yaylar alçak çizilir
        const h = (x1 + x2) / 2 > W - 150 ? Math.min(arcH(x2 - x1, y0), 20) : arcH(x2 - x1, y0)
        const y = y0 - 5
        const c = color[tone]
        return (
          <g key={i}>
            <path d={`M${x1} ${y} Q${(x1 + x2) / 2} ${y - 2 * h} ${x2} ${y}`} fill="none" stroke={c} strokeWidth={2.4} strokeDasharray={tone === 'given' ? '2 4' : '6 4'} strokeLinecap="round" />
            {Math.abs(x2 - x1) >= 22 && <text x={(x1 + x2) / 2} y={y - h - 5} textAnchor="middle" fontSize={13} fontWeight={900} fill={c} stroke="#fff" strokeWidth={3.5} paintOrder="stroke">{card(b - a)}</text>}
          </g>
        )
      })}
      <Pill x={s0 - side * gap} y={y0 + 36} text={fmt(start)} color="#2563eb" />
      <Pill x={tx + side * gap} y={y0 + 36} text={`🌸 ${fmt(target)}`} color="#db2777" />
      <Frog x={P.sx(frog)} y={y0 - 4 - lift} />
    </g>
  )
}

// ─────────────────────────── Oyun ───────────────────────────

type Phase = 'build' | 'reached' | 'answer' | 'done'
interface NudgeState { key: number; q: string; tone?: 'ok' | 'think'; mis?: string; tool?: boolean; sticky?: boolean }

const INSIGHT: Record<Lv, string> = {
  1: 'Sayı doğrusunda 10 bir “dinlenme yaprağı”dır: 8’den 13’e giderken önce +2 ile 10’a, sonra +3 ile 13’e zıplamak saymayı kolaylaştırır. Aynı yere farklı yollardan gidebilirsin!',
  2: 'Aynı hedefe birçok yoldan gidilir: 38 + 2 + 20 + 5 ya da 38 + 30 − 3. İki sayı arasındaki farkı bulmak için küçük sayıdan büyüğe zıplayıp zıplamaları toplayabilirsin; çıkarma, ileri saymak da olabilir.',
  3: 'Yüzlüklere tamamlamak ve fazla zıplayıp geri dönmek büyük sayılarla zihinden işlemi kolaylaştırır: 245 + 299 = 245 + 300 − 1.',
  4: 'Binliklere ve yüzlüklere tamamlayınca büyük sayılarla da zihinden işlem yapılır: 2.950 → 3.000 → 6.000 → 6.200. +1.990 yerine +2.000 − 10 yapmak da aynı yere götürür.',
}

export default function FrogJump({ grade, onFinish }: GameProps) {
  const lv = Math.min(4, Math.max(1, grade)) as Lv
  const cfg = CFG[lv]
  const { big } = useAge(grade)
  const [riverRef, riverW] = useWidth<HTMLDivElement>()
  // Çentikler hiçbir zaman ondalık olmasın: en küçük birim (1 ya da 10) en az ~ yarım çentik aralığı
  const minSpan = Math.max(cfg.minSpan, ((riverW - 16) / 100) * (lv === 4 ? 10 : 1))
  const track = useTracker()
  const sol = useSolutions()
  const [tasks] = useState(() => makeTasks(lv))
  const [ti, setTi] = useState(0)
  const task = tasks[ti]
  const origin = task.kind === 'missing' ? task.start + task.first! : task.start

  const [jumps, setJumps] = useState<Jump[]>([])
  const [tryOpt, setTryOpt] = useState<number | null>(null)
  const [tried, setTried] = useState<number[]>([])
  const [phase, setPhase] = useState<Phase>('build')
  const [answered, setAnswered] = useState(false)
  const [ansOpts, setAnsOpts] = useState<number[]>([])
  const [wrongAns, setWrongAns] = useState<number[]>([])
  const [nudge, setNudgeState] = useState<NudgeState | null>(null)
  const [totalPaths, setTotalPaths] = useState(0)
  const nk = useRef(0)
  const firstTry = useRef(true)
  const longNudged = useRef(false)
  const stats = useRef({ score: 0, max: 0, first: 0, over: false })

  // Zıplama animasyonu
  const anim = useRef({ q: [] as number[], from: origin, to: origin, t: 1, pos: origin })
  const [animating, setAnimating] = useState(false)
  const [, rerender] = useReducer((x: number) => x + 1, 0)
  const hop = (...to: number[]) => {
    anim.current.q.push(...to)
    setAnimating(true)
  }
  const place = (v: number) => {
    anim.current = { q: [], from: v, to: v, t: 1, pos: v }
    setAnimating(false)
  }
  useFrame((dt) => {
    const a = anim.current
    if (a.t >= 1) {
      if (!a.q.length) {
        setAnimating(false)
        return
      }
      a.from = a.pos
      a.to = a.q.shift()!
      a.t = 0
    }
    a.t = Math.min(1, a.t + dt / (a.q.length ? 0.24 : 0.4))
    a.pos = a.t >= 1 ? a.to : a.from + (a.to - a.from) * ease(a.t)
    rerender()
  }, animating)

  const say = (n: Omit<NudgeState, 'key'>) => setNudgeState({ ...n, key: ++nk.current })

  const vals = jumps.map(val)
  const cur = task.kind === 'missing' ? origin + (tryOpt ?? 0) : origin + vals.reduce((a, b) => a + b, 0)
  const taps = jumps.reduce((a, j) => a + j.n, 0)
  const dist = Math.abs(task.target - task.start)

  const hintText = (): string => {
    const t = task.target
    if (task.kind === 'missing') return `İlk zıplamadan sonra kurbağa ${L(origin)}. ${A(origin)} ${D(t)} gitmek için ne kadar zıplamalı? Önce yuvarlak bir sayıdan geçmeyi düşün.`
    if (phase === 'answer') return 'Yayların üstündeki sayılara bak. Önce büyükleri topla, sonra küçükleri ekle.'
    if (cur === t) return 'Kurbağa yaprakta! Farklı bir yol için “Başka yol dene”ye dokun.'
    const base = cfg.base
    if (t > cur) {
      const r = Math.ceil(cur / base) * base
      if (cur % base !== 0 && r < t) return `${A(cur)} sonraki yuvarlak sayı ${fmt(r)}. Önce ${D(r)} zıplasan, oradan ${D(t)} kaç kalır?`
      return `${D(t)} ${fmt(t - cur)} kaldı. Bunu hangi zıplamalara ayırabilirsin? Önce büyükleri dene.`
    }
    const r = Math.floor(cur / base) * base
    if (cur % base !== 0 && r > t) return `Önce ${D(r)} geri zıplasan? Oradan ${D(t)} ne kadar geri gitmen gerekir?`
    return `${fmt(cur - t)} geri gitmen gerekiyor. Bunu parçalara ayırabilir misin?`
  }

  const reached = (js: Jump[]) => {
    const vs = js.map(val)
    const key = vs.join(',')
    const label = `${fmt(task.start)} ${vs.map(term).join(' ')} = ${fmt(task.target)}`
    const isNew = !sol.list.some((s) => s.key === key)
    track.attempt(true)
    let count = sol.list.length
    if (isNew) {
      sol.add(key, label)
      sfx.ok()
      count++
      setTotalPaths((p) => p + 1)
      const st = classify(task.start, task.target, js, lv)
      track.strategy(st)
      if (task.kind === 'distance' && !answered) {
        const n = js.length
        const d = dist
        const opts = [d]
        for (const c of [n, d + cfg.base, d - cfg.base / 10, d + cfg.base / 10, d + 2 * cfg.base]) if (opts.length < 4 && c > 0 && !opts.includes(c)) opts.push(c)
        setAnsOpts(shuffle(opts))
        setWrongAns([])
        setPhase('answer')
        say({ tone: 'ok', q: `Kurbağa yaprakta! ${PRAISE[st]} Şimdi düşün: ${fmt(task.start)} ile ${fmt(task.target)} arası kaç?` })
        return
      }
      say({ tone: 'ok', q: `${PRAISE[st]} ${count >= task.goal ? (task.goal > 1 ? `Süper, ${task.goal} farklı yol buldun!` : 'Harika!') : 'Başka bir yolla da ulaşabilir misin?'}` })
    } else {
      say({ q: 'Bu yolu zaten bulmuştun! Farklı zıplamalarla dener misin? Belki önce başka bir sayıya uğrayabilirsin.' })
    }
    setPhase('reached')
  }

  const tapCard = (c: number) => {
    if (phase !== 'build' || task.kind === 'missing') return
    const n = cur + c
    if (n < 0 || n > cfg.max) {
      say({ q: n < 0 ? `Nehir 0’da başlıyor; kurbağa daha geriye gidemez. Daha küçük bir geri zıplama ya da ileri zıplama işe yarar mı?` : `Nehir ${L(cfg.max)} bitiyor. Yaprak ${L(task.target)}; daha küçük bir zıplama seçebilir misin?` })
      return
    }
    if (taps >= 40) {
      say({ q: 'Kurbağa çok yoruldu! Geri al ya da baştan başla; daha büyük zıplamalar işe yarar mı?' })
      return
    }
    const last = jumps[jumps.length - 1]
    const nj = last && last.unit === c ? [...jumps.slice(0, -1), { unit: c, n: last.n + 1 }] : [...jumps, { unit: c, n: 1 }]
    setJumps(nj)
    hop(n)
    if (!nudge?.sticky) setNudgeState(null)
    if (n === task.target) return reached(nj)
    if (!longNudged.current && (nj.length > 6 || taps + 1 > 16)) {
      longNudged.current = true
      track.hint()
      say({
        q: lv === 1 ? `Çok zıpladın! Yaprağa ${fmt(Math.abs(task.target - n))} kaldı. Daha büyük bir zıplama işine yarar mı?` : `Çok zıpladın! Daha büyük bir zıplama işine yarar mı? Yaprakla aradaki fark kaç ${cfg.unitName}?`,
        tool: true,
        sticky: true,
      })
    }
  }

  const undo = () => {
    if (!jumps.length || phase === 'answer' || phase === 'done') return
    const last = jumps[jumps.length - 1]
    const nj = last.n > 1 ? [...jumps.slice(0, -1), { ...last, n: last.n - 1 }] : jumps.slice(0, -1)
    setJumps(nj)
    hop(origin + nj.reduce((a, j) => a + val(j), 0))
    setPhase('build')
    setNudgeState(null)
  }

  const again = () => {
    setJumps([])
    place(origin)
    setPhase('build')
    setNudgeState(null)
    longNudged.current = false
  }

  const answer = (o: number) => {
    if (phase !== 'answer' || wrongAns.includes(o)) return
    if (o === dist) {
      track.attempt(true)
      track.strategy(S.diff)
      sfx.ok()
      setAnswered(true)
      setPhase('reached')
      const parts = vals.map((v, i) => (i === 0 ? fmt(Math.abs(v)) : term(v))).join(' ')
      say({ tone: 'ok', q: `Evet! ${parts} = ${fmt(dist)}. Yani ${fmt(task.target)} − ${fmt(task.start)} = ${fmt(dist)}. Çıkarmayı ileri sayarak buldun!` })
      return
    }
    track.attempt(false)
    firstTry.current = false
    setWrongAns([...wrongAns, o])
    if (o === jumps.length && o !== dist) {
      say({ q: `${jumps.length} kez zıpladın, ama zıplamaların boyu farklı. Yayların üstündeki sayıları toplarsan ne bulursun?`, mis: 'Zıplama sayısını iki sayı arasındaki fark sandı' })
    } else {
      say({ q: `Yayların üstündeki sayılara yeniden bak: ${vals.map(card).join(', ')}. Hepsini topladığında ${o > dist ? 'bu kadar çok' : 'bu kadar az'} mı çıkıyor? ${lv === 1 ? 'Parmaklarınla da sayabilirsin.' : `Önce ${({ 1: '', 2: 'onlukları', 3: 'yüzlükleri', 4: 'binlikleri' } as Record<Lv, string>)[lv]} topla.`}`, tool: true })
    }
  }

  const tryMissing = (o: number) => {
    if (phase === 'done' || tried.includes(o) || animating) return
    const land = origin + o
    if (tryOpt !== null) hop(origin, land)
    else hop(land)
    setTryOpt(o)
    if (land === task.target) {
      track.attempt(true)
      track.strategy(S.missing)
      sfx.ok()
      setPhase('done')
      say({ tone: 'ok', q: `Evet! ${fmt(task.start)} + ${fmt(task.first!)} = ${fmt(origin)}, ${fmt(origin)} + ${fmt(o)} = ${fmt(task.target)}. İki zıplama birlikte ${fmt(dist)} eder.` })
      return
    }
    track.attempt(false)
    firstTry.current = false
    setTried([...tried, o])
    if (o === dist) {
      say({ q: `+${fmt(o)} zıplama, kurbağa ${A(task.start)} başlasaydı yaprağa götürürdü. Ama ilk zıplamadan sonra kurbağa nerede?`, mis: 'Eksik zıplamada ilk zıplamayı hesaba katmadı' })
    } else {
      say({ q: `Kurbağa ${D(land)} kondu, yaprak ${L(task.target)}. ${land > task.target ? 'Ne kadar fazla zıpladı?' : 'Daha ne kadar gitmesi gerekirdi?'}`, tool: true })
    }
  }

  const askHint = () => {
    track.hint()
    say({ q: hintText() })
  }

  const finished = task.kind === 'missing' ? phase === 'done' : task.kind === 'distance' ? answered : sol.list.length > 0
  const found = sol.list.length

  const next = () => {
    const s = stats.current
    const goalPts = 10 + 3 + 5 * (task.goal - 1)
    const extra = task.kind === 'missing' ? 0 : Math.min(task.goal, found) - 1
    s.score += 10 + (firstTry.current ? 3 : 0) + 5 * Math.max(0, extra)
    s.max += goalPts
    if (firstTry.current) s.first++
    track.item(firstTry.current)
    if (ti + 1 >= tasks.length) {
      if (s.over) return
      s.over = true
      onFinish({
        stars: starsFor(s.score / s.max),
        score: s.score,
        summary: `${tasks.length} yaprağın hepsine ulaştın ve toplam ${totalPaths} farklı yol buldun.`,
        insight: INSIGHT[lv],
      })
      return
    }
    const nt = tasks[ti + 1]
    setTi(ti + 1)
    setJumps([])
    setTryOpt(null)
    setTried([])
    setPhase('build')
    setAnswered(false)
    setAnsOpts([])
    setWrongAns([])
    setNudgeState(null)
    sol.reset()
    firstTry.current = true
    longNudged.current = false
    place(nt.kind === 'missing' ? nt.start + nt.first! : nt.start)
  }

  // Yaylar ve yapraklar
  const arcs: Arc[] = []
  const pads: number[] = []
  if (task.kind === 'missing') {
    arcs.push({ a: task.start, b: origin, tone: 'given' })
    pads.push(origin)
    if (tryOpt !== null && !animating) {
      arcs.push({ a: origin, b: origin + tryOpt, tone: 'try' })
      pads.push(origin + tryOpt)
    }
  } else {
    let p = origin
    for (const v of vals) {
      arcs.push({ a: p, b: p + v, tone: v * Math.sign(task.target - task.start || 1) > 0 ? 'go' : 'back' })
      p += v
      pads.push(p)
    }
  }
  const a = anim.current
  const hopInfo = animating ? { from: a.from, to: a.to, t: a.t } : null
  const positives = cfg.cards.filter((c) => c > 0)
  const negatives = cfg.cards.filter((c) => c < 0)
  const btnH = big ? 'min-h-14' : 'min-h-12'
  const strategyOpts = [COMPLETE[lv], S.place, S.back, S.ones]

  const equation =
    task.kind === 'missing' ? (
      <>
        {fmt(task.start)} + {fmt(task.first!)} + <span className={tryOpt === null ? 'rounded-lg bg-violet-100 px-2 text-violet-700' : 'text-violet-700'}>{tryOpt === null ? '?' : fmt(tryOpt)}</span> = <span className={cur === task.target && tryOpt !== null ? 'text-ok' : ''}>{tryOpt === null ? fmt(task.target) : fmt(cur)}</span>
        {phase === 'done' && ' ✓'}
      </>
    ) : (
      <>
        {fmt(task.start)} {vals.map(term).join(' ')}
        {vals.length > 0 && <> = <span className={cur === task.target ? 'text-ok' : ''}>{fmt(cur)}</span></>}
        {cur === task.target && vals.length > 0 && ' ✓'}
      </>
    )

  return (
    <Scene grade={grade}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <LevelDots current={ti} total={tasks.length} />
        <span className="chip bg-white/90 px-3 py-1.5 text-sm text-green-800 ring-1 ring-green-200">🐸 Bulunan yol: {totalPaths}</span>
      </div>
      <TaskCard step={ti + 1} total={tasks.length}>{task.text}</TaskCard>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_290px] lg:items-start lg:gap-4">
        <div className="min-w-0">
          <div ref={riverRef} className="rounded-3xl bg-gradient-to-b from-sky-200 to-sky-300 p-2 ring-1 ring-sky-300">
            <Plane key={`${ti}-${Math.round(riverW / 120)}`} mode="x" grid={false} initial={viewFor(task.start, task.target, minSpan)} minSpan={minSpan} maxSpan={cfg.max * 1.3} label={`Sayı doğrusu: kurbağa ${fmt(Math.round(cur))} üzerinde, yaprak ${fmt(task.target)}`}>
              <River unit={lv === 4 ? 10 : 1} start={task.start} target={task.target} arcs={arcs} pads={pads} frog={a.pos} hop={hopInfo} />
            </Plane>
          </div>

          <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-center ring-1 ring-line" aria-live="polite">
            <p className="text-xl font-black tabular-nums wrap-break-word sm:text-2xl">{equation}</p>
            {task.kind !== 'missing' && vals.length === 0 && <p className="text-sm font-bold text-ink-soft">Kurbağa {L(task.start)}. Bir zıplama kartı seç!</p>}
          </div>

          {nudge && (
            <Nudge
              key={nudge.key}
              question={nudge.q}
              tone={nudge.tone}
              misconception={nudge.mis}
              tool={nudge.tool ? 'numberline' : undefined}
              toolConfig={nudge.tool ? cfg.tool : undefined}
              toolTitle="Sayı doğrusunda dene"
              onClose={nudge.tone === 'ok' ? undefined : () => setNudgeState(null)}
            />
          )}

          {task.kind !== 'missing' && <SolutionList list={sol.list} goal={task.goal > 1 ? task.goal : undefined} />}
        </div>

        <div className="mt-3 lg:mt-0">
          {task.kind === 'missing' ? (
            <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
              <p className="mb-2 text-sm font-black text-ink">İkinci zıplama hangisi? Dene ve kurbağanın nereye konduğuna bak.</p>
              <div className="grid grid-cols-2 gap-2">
                {task.options!.map((o) => {
                  const bad = tried.includes(o)
                  const ok = phase === 'done' && tryOpt === o
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => tryMissing(o)}
                      disabled={bad || phase === 'done'}
                      className={`${btnH} rounded-2xl text-2xl font-black tabular-nums ring-2 transition active:scale-95 ${ok ? 'bg-ok text-white ring-ok' : bad ? 'bg-slate-100 text-slate-400 ring-slate-200 line-through' : 'bg-violet-50 text-violet-800 ring-violet-200 hover:bg-violet-100'}`}
                    >
                      +{fmt(o)}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : phase === 'answer' ? (
            <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line animate-fade-up">
              <p className="mb-2 text-base font-black text-ink">{fmt(task.start)} ile {fmt(task.target)} arası kaç?</p>
              <div className="grid grid-cols-2 gap-2">
                {ansOpts.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => answer(o)}
                    disabled={wrongAns.includes(o)}
                    className={`${btnH} rounded-2xl text-2xl font-black tabular-nums ring-2 transition active:scale-95 ${wrongAns.includes(o) ? 'bg-slate-100 text-slate-400 ring-slate-200 line-through' : 'bg-amber-50 text-amber-900 ring-amber-200 hover:bg-amber-100'}`}
                  >
                    {fmt(o)}
                  </button>
                ))}
              </div>
            </div>
          ) : phase === 'build' ? (
            <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
              <p className="mb-2 text-xs font-extrabold tracking-wide text-ink-soft uppercase">Zıplama kartları</p>
              <div className="grid grid-cols-4 gap-2">
                {positives.map((c) => (
                  <button key={c} type="button" onClick={() => tapCard(c)} aria-label={`${fmt(c)} ileri zıpla`} className={`${btnH} flex flex-col items-center justify-center rounded-2xl bg-green-600 text-white shadow-[0_4px_0_#166534] transition active:translate-y-0.5 active:shadow-none`}>
                    <span className={`${lv === 4 ? 'text-base' : 'text-xl'} font-black tabular-nums`}>{card(c)}</span>
                    <span className="text-[10px] font-extrabold opacity-85">ileri</span>
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {negatives.map((c) => (
                  <button key={c} type="button" onClick={() => tapCard(c)} aria-label={`${fmt(-c)} geri zıpla`} className={`${btnH} flex flex-col items-center justify-center rounded-2xl bg-orange-500 text-white shadow-[0_4px_0_#c2410c] transition active:translate-y-0.5 active:shadow-none`}>
                    <span className={`${lv === 4 ? 'text-base' : 'text-xl'} font-black tabular-nums`}>{card(c)}</span>
                    <span className="text-[10px] font-extrabold opacity-85">geri</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs font-bold text-ink-soft">Aynı karta art arda dokununca zıplama büyür: {card(positives[positives.length - 2])}, {card(positives[positives.length - 2])} → {card(2 * positives[positives.length - 2])}</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button type="button" onClick={undo} disabled={!jumps.length} className="btn-ghost min-h-12 px-2 text-sm"><Undo2 size={18} />Geri al</button>
                <button type="button" onClick={again} disabled={!jumps.length} className="btn-ghost min-h-12 px-2 text-sm"><RotateCcw size={18} />Baştan</button>
                <button type="button" onClick={askHint} className="btn-ghost min-h-12 px-2 text-sm"><Lightbulb size={18} />İpucu</button>
              </div>
            </div>
          ) : null}

          {task.kind === 'missing' && phase !== 'done' && (
            <button type="button" onClick={askHint} className="btn-ghost mt-2 min-h-12 w-full text-sm"><Lightbulb size={18} />İpucu</button>
          )}

          {(phase === 'reached' || phase === 'done') && (
            <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line animate-fade-up">
              {task.kind === 'reach' && found >= task.goal && (
                <StrategyPicker key={ti} question="Hangi yol sana en kolay geldi?" options={strategyOpts} onPick={() => {}} />
              )}
              <div className={`flex flex-col gap-2 ${task.kind === 'reach' && found >= task.goal ? 'mt-3' : ''}`}>
                {task.kind !== 'missing' && (
                  <button type="button" onClick={again} className={`btn-ghost ${btnH} w-full`}><Shuffle size={18} />Başka yol dene{task.goal > 1 && found < task.goal ? ` (${found}/${task.goal})` : ''}</button>
                )}
                {finished && (
                  <button type="button" onClick={next} className={`btn-primary ${btnH} w-full`}>
                    {ti + 1 >= tasks.length ? 'Bitir' : 'Sonraki yaprak'}<ArrowRight size={18} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Scene>
  )
}
