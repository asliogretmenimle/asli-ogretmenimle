import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowRight, Check, Eraser, Layers, RotateCcw, Scale } from 'lucide-react'
import type { Grade } from '../data/types'
import { gcd, shuffle } from '../lib/random'
import { sfx } from '../lib/feedback'
import { MathText } from '../components/MathText'
import { ZoomBox } from '../interactive/ZoomBox'
import { useTracker } from '../lib/trackerContext'
import { starsFor, type GameProps } from './kit'
import { LevelDots, Nudge, Scene, SolutionList, StrategyPicker, TaskCard, useSolutions } from './kit2'

/**
 * Kesir Pizzacısı (Van de Walle): adil paylaşım, eş parçalar ve denklik.
 *  - Adil paylaştır: pizzaları kes, dilimleri tabaklara dağıt; farklı kesimler = farklı çözümler
 *  - Aynı mı? Kanıtla: önce tahmin, sonra dilimleri bölerek ortak dilim büyüklüğü bul (ya da üst üste koy)
 *  - Eş parçalar mı?: eş olmayan parçalara “[[1/4]]” denmiş; yanılgıyı fark et ve doğrusunu yap
 *  - Siparişi hazırla: aynı miktarı farklı kesimlerle oluştur
 * Süre, sabır çubuğu, ceza yok.
 */

// ───────────────────────────── Kesir yardımcıları ─────────────────────────────

interface Frac { n: number; d: number }
const F = (n: number, d: number): Frac => ({ n, d })
const simp = (f: Frac): Frac => {
  const g = gcd(f.n, f.d) || 1
  return { n: f.n / g, d: f.d / g }
}
const add = (a: Frac, b: Frac) => simp({ n: a.n * b.d + b.n * a.d, d: a.d * b.d })
const sub = (a: Frac, b: Frac) => simp({ n: a.n * b.d - b.n * a.d, d: a.d * b.d })
const same = (a: Frac, b: Frac) => a.n * b.d === b.n * a.d
const less = (a: Frac, b: Frac) => a.n * b.d < b.n * a.d
const ZERO = F(0, 1)

const NUM_W = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz', 'on', 'on bir', 'on iki']

/** Sadeleşmemiş kesir yazımı (MathText) */
const raw = (n: number, d: number) => (d === 1 ? `${n}` : `[[${n}/${d}]]`)

/** Kesri (sadeleştirerek) yazar; 2. sınıfta yarım/çeyrek/bütün sözcükleriyle */
function show(f: Frac, words = false): string {
  const s = simp(f)
  if (s.n === 0) return '0'
  if (words) {
    if (s.d === 1) return s.n === 1 ? 'bir bütün' : `${NUM_W[s.n]} bütün`
    if (s.d === 2) return s.n === 1 ? 'yarım' : `${NUM_W[s.n]} yarım`
    if (s.d === 4) return `${NUM_W[s.n]} çeyrek`
  }
  return raw(s.n, s.d)
}
/** 1’den büyükse tam sayılı gösterimi de ekler: [[5/4]] = [[1 1/4]] */
function showFull(f: Frac, words = false): string {
  const s = simp(f)
  if (words || s.d === 1 || s.n < s.d) return show(s, words)
  return `${raw(s.n, s.d)} = [[${Math.floor(s.n / s.d)} ${s.n % s.d}/${s.d}]]`
}
/** Birim kesir grubu: 3 × [[1/4]] ya da "üç çeyrek" */
function unitTerm(d: number, count: number, words: boolean): string {
  if (words) {
    if (d === 1) return count === 1 ? 'bir bütün' : `${NUM_W[count]} bütün`
    if (d === 2) return count === 1 ? 'yarım' : `${NUM_W[count]} yarım`
    if (d === 4) return `${NUM_W[count]} çeyrek`
  }
  if (d === 1) return count === 1 ? '1 bütün' : `${count} bütün`
  if (count <= 3) return Array<string>(count).fill(`[[1/${d}]]`).join(' + ')
  return `${count} × [[1/${d}]]`
}
/** Bir tabaktaki dilimlerin toplam ifadesi: [[1/2]] + [[1/4]] */
function plateExpr(dens: number[], words: boolean): string {
  const groups = new Map<number, number>()
  for (const d of [...dens].sort((a, b) => a - b)) groups.set(d, (groups.get(d) ?? 0) + 1)
  return [...groups].map(([d, c]) => unitTerm(d, c, words)).join(' + ')
}
/** c tane [[1/d]]: 2. sınıfta sözcükle (iki çeyrek), bütün pizza için "bütün" */
function pieceText(c: number, d: number, words: boolean): string {
  if (c === d) return words ? 'bir bütün' : '1 bütün'
  if (words && d === 2) return c === 1 ? 'yarım' : `${NUM_W[c]} yarım`
  if (words && d === 4) return `${NUM_W[c]} çeyrek`
  return raw(c, d)
}
const sumUnits = (dens: number[]) => dens.reduce((acc, d) => add(acc, F(1, d)), ZERO)

// ───────────────────────────── Veri ─────────────────────────────

interface Topping { name: string; color: string; dot: string }
const TOPPINGS: Topping[] = [
  { name: 'sucuklu', color: '#fecaca', dot: '#b91c1c' },
  { name: 'mantarlı', color: '#ede0cc', dot: '#92400e' },
  { name: 'zeytinli', color: '#e5e7eb', dot: '#1f2937' },
  { name: 'biberli', color: '#bbf7d0', dot: '#15803d' },
  { name: 'mısırlı', color: '#fef08a', dot: '#ca8a04' },
  { name: 'domatesli', color: '#fecdd3', dot: '#e11d48' },
]

interface Kid { name: string; gen: string; emoji: string; color: string }
const KIDS: Kid[] = [
  { name: 'Ali', gen: 'Ali’nin', emoji: '👦', color: '#2563eb' },
  { name: 'Ece', gen: 'Ece’nin', emoji: '👧', color: '#db2777' },
  { name: 'Can', gen: 'Can’ın', emoji: '🧒', color: '#16a34a' },
  { name: 'Zeynep', gen: 'Zeynep’in', emoji: '👩‍🦱', color: '#9333ea' },
  { name: 'Mert', gen: 'Mert’in', emoji: '🧑', color: '#ea580c' },
]

/** Bir pizzanın başlangıç hâli: d eş dilim, ilk t tanesi malzemeli */
interface Piece { d: number; t: number }
interface Side { kid: Kid; label: string; pizzas: Piece[] }

type TaskBody =
  | { kind: 'share'; pizzas: number; kids: number; knives: number[]; goal: number }
  | { kind: 'proof'; a: Side; b: Side; opts: number[] }
  | { kind: 'unequal'; claim: Frac; claimText: string; spans: number[]; top: number; knives: number[] }
  | { kind: 'build'; target: Frac; label: string; pizzas: number; knives: number[]; goal: number }
type Task = TaskBody & { topping: Topping; story: string }

const KIND_LABEL: Record<TaskBody['kind'], string> = {
  share: '🤝 Adil paylaştır',
  proof: '⚖️ Aynı mı? Kanıtla',
  unequal: '🔍 Eş parçalar mı?',
  build: '🍕 Siparişi hazırla',
}

function makeTasks(grade: Grade): Task[] {
  const tops = shuffle(TOPPINGS)
  const kids = shuffle(KIDS)
  let ti = 0
  const top = () => tops[ti++ % tops.length]
  const side = (k: number, label: string, pizzas: Piece[]): Side => ({ kid: kids[k % kids.length], label, pizzas })

  const share = (pizzas: number, n: number, knives: number[], goal = 2): Task => ({
    kind: 'share', pizzas, kids: n, knives, goal, topping: top(),
    story: `${pizzas === 1 ? 'Bir pizzayı' : `${pizzas} pizzayı`} ${n} arkadaş eşit paylaşacak. Pizzaları kes, dilimleri tabaklara dağıt. Her biri ne kadar pizza alır?`,
  })
  const proof = (a: Side, b: Side, opts: number[]): Task => ({
    kind: 'proof', a, b, opts, topping: top(),
    story: `${a.kid.emoji} ${a.kid.name} ${a.label} pizza, ${b.kid.emoji} ${b.kid.name} ${b.label} pizza istedi. Pizzalar aynı büyüklükte. İkisi aynı miktarda mı pizza yiyecek? Önce tahmin et, sonra kanıtla!`,
  })
  const unequal = (claim: Frac, claimText: string, spans: number[], topIdx: number, knives: number[]): Task => ({
    kind: 'unequal', claim, claimText, spans, top: topIdx, knives, topping: top(),
    story: `🧑‍🍳 Çırak pizzayı ${NUM_W[spans.length]} parçaya böldü ve “Malzemeli dilim pizzanın ${claimText}!” dedi. Haklı mı?`,
  })
  const build = (target: Frac, label: string, pizzas: number, knives: number[], goal = 2): Task => ({
    kind: 'build', target, label, pizzas, knives, goal, topping: top(),
    story: `Müşteri ${pizzas > 1 ? 'iki pizzadan ' : ''}${label} pizza istiyor: malzemeyi yalnızca o kadarına koy. Pizzayı nasıl keseceğine sen karar ver. Kaç farklı şekilde hazırlayabilirsin?`,
  })

  if (grade <= 2)
    return [
      share(1, 2, [2, 4]),
      unequal(F(1, 4), 'çeyreği', [72, 128, 84, 76], 0, [2, 3, 4]),
      share(2, 4, [2, 4]),
      proof(side(0, 'yarım', [{ d: 2, t: 1 }]), side(1, 'iki çeyrek', [{ d: 4, t: 2 }]), [2, 4]),
      build(F(1, 2), 'yarım', 1, [2, 3, 4]),
    ]
  if (grade === 3)
    return [
      unequal(F(1, 3), '[[1/3]]’i', [150, 120, 90], 2, [2, 3, 4, 6]),
      share(1, 3, [2, 3, 4, 6]),
      build(F(3, 4), '[[3/4]]', 1, [2, 3, 4, 8]),
      proof(side(0, '[[1/3]]', [{ d: 3, t: 1 }]), side(1, '[[1/4]]', [{ d: 4, t: 1 }]), [3, 4, 6, 12]),
      share(2, 3, [2, 3, 4, 6]),
      proof(side(2, '[[2/6]]', [{ d: 6, t: 2 }]), side(3, '[[1/3]]', [{ d: 3, t: 1 }]), [3, 6, 12]),
    ]
  if (grade === 4)
    return [
      proof(side(0, '[[2/3]]', [{ d: 3, t: 2 }]), side(1, '[[4/6]]', [{ d: 6, t: 4 }]), [3, 6, 12]),
      share(3, 4, [2, 3, 4, 6, 8]),
      unequal(F(1, 4), '[[1/4]]’i', [72, 128, 84, 76], 0, [2, 3, 4, 6, 8]),
      build(F(3, 4), '[[3/4]]', 1, [2, 3, 4, 6, 8, 12], 3),
      proof(side(2, '[[2/3]]', [{ d: 3, t: 2 }]), side(3, '[[3/4]]', [{ d: 4, t: 3 }]), [3, 4, 6, 8, 12]),
      build(F(2, 3), '[[2/3]]', 1, [2, 3, 4, 6, 12]),
    ]
  return [
    build(F(5, 4), '[[1 1/4]]', 2, [1, 2, 4, 8]),
    proof(side(0, '[[5/4]]', [{ d: 4, t: 4 }, { d: 4, t: 1 }]), side(1, '[[1 1/4]]', [{ d: 1, t: 1 }, { d: 4, t: 1 }]), [1, 2, 4, 8]),
    share(5, 4, [1, 2, 4, 8]),
    proof(side(2, '[[7/4]]', [{ d: 4, t: 4 }, { d: 4, t: 3 }]), side(3, '[[1 1/2]]', [{ d: 1, t: 1 }, { d: 2, t: 1 }]), [1, 2, 4, 8]),
    build(F(3, 2), '[[3/2]]', 2, [1, 2, 3, 4, 6]),
  ]
}

const STRATS = {
  share: ['Her pizzayı kişi sayısı kadar böldüm', 'Önce bütün pizzaları dağıttım, sonra kalanı böldüm', 'Önce yarımları dağıttım, sonra kalanı böldüm', 'Deneyerek eşitledim'],
  proof: ['Dilimleri ikiye bölerek kanıtladım', 'Ortak parça büyüklüğü buldum', 'Üst üste koyup karşılaştırdım', 'Yarımla karşılaştırdım'],
  build: ['Her dilimi ikiye böldüm, dilim sayısını ikiye katladım', 'Pay ve paydayı aynı sayıyla çarptım', 'Bütünü ve kalan parçayı ayrı düşündüm', 'Deneyerek buldum'],
  unequal: ['Parçaların büyüklüğüne baktım', 'Parçaları kafamda üst üste koydum', 'Eş parçaları hayal edip karşılaştırdım'],
}

function inferShare(cuts: number[], kids: number): string {
  if (cuts.every((c) => c === kids)) return STRATS.share[0]
  if (cuts.includes(1)) return STRATS.share[1]
  if (cuts.includes(2) && cuts.some((c) => c !== 2)) return STRATS.share[2]
  return 'Daha küçük eş dilimlerle paylaştırdım'
}

// ───────────────────────────── Çizim ─────────────────────────────

const rad = (deg: number) => ((deg - 90) * Math.PI) / 180
const xy = (r: number, deg: number): [number, number] => [r * Math.cos(rad(deg)), r * Math.sin(rad(deg))]
const pt = (r: number, deg: number) => xy(r, deg).map((v) => v.toFixed(2)).join(' ')
function sector(a0: number, span: number, R: number) {
  if (span >= 359.99) return `M 0 ${-R} A ${R} ${R} 0 1 1 0 ${R} A ${R} ${R} 0 1 1 0 ${-R} Z`
  // Yayları ≤ 90°’lik parçalara böl (tam 180°’lik tek yay, isabet testinde sorun çıkarıyor)
  const n = Math.ceil(span / 90)
  // Tepe noktasını dilimin içine çok az kaydır: merkezden geçen yatay satırda isabet testi kaçmasın
  let d = `M ${pt(0.8, a0 + span / 2)} L ${pt(R, a0)}`
  for (let i = 1; i <= n; i++) d += ` A ${R} ${R} 0 0 1 ${pt(R, a0 + (span * i) / n)}`
  return `${d} Z`
}
const equalSpans = (n: number) => Array<number>(n).fill(360 / n)

interface SliceView { topped: boolean; owner?: number | null }

function PizzaSvg({ spans, view, topping, onSlice, label, guide, sliceName = 'dilim' }: { spans: number[]; view: SliceView[]; topping: Topping; onSlice?: (i: number) => void; label: string; guide?: number; sliceName?: string }) {
  const R = 86
  let acc = 0
  const starts = spans.map((s) => {
    const a = acc
    acc += s
    return a
  })
  const key = (i: number) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSlice?.(i)
    }
  }
  return (
    <svg viewBox="-100 -100 200 200" className="block w-full touch-manipulation select-none drop-shadow-md" role="group" aria-label={label}>
      <circle r={97} fill="#e2a54f" stroke="#b7791f" strokeWidth={3} />
      <circle r={91} fill="none" stroke="#f3c47a" strokeWidth={3} strokeDasharray="3 7" opacity={0.7} />
      {/* Küçük kaydırma: Chrome, yay köşesinden geçen tam piksel satırında isabet testini kaçırıyor */}
      <g transform="translate(0.17 0.37)">
      {spans.map((span, i) => {
        const a0 = starts[i]
        const v = view[i] ?? { topped: false }
        const whole = span >= 359.99
        const dots: [number, number][] = []
        if (v.topped) {
          for (const rr of [24, 48, 70]) {
            const cnt = whole ? Math.round(rr / 8) : Math.floor((rr * span * Math.PI) / 180 / 22)
            for (let j = 0; j < cnt; j++) {
              const a = a0 + ((j + 0.5) * span) / cnt
              dots.push([rr * Math.cos(rad(a)), rr * Math.sin(rad(a))])
            }
          }
          if (whole) dots.push([0, 0])
        }
        const mid = a0 + span / 2
        const cr = whole ? 0 : span < 50 ? 62 : 50
        const owner = v.owner ?? null
        return (
          <g key={i}>
            <path
              d={sector(a0, span, R)}
              fill={v.topped ? topping.color : '#fde68a'}
              stroke="#c2410c"
              strokeWidth={spans.length === 1 ? 0 : 2.5}
              strokeLinejoin="round"
              role={onSlice ? 'button' : undefined}
              tabIndex={onSlice ? 0 : undefined}
              aria-pressed={onSlice ? v.topped || owner !== null : undefined}
              aria-label={`${i + 1}. ${sliceName}${v.topped ? ', malzemeli' : ''}${owner !== null ? `, ${KIDS[owner].name} aldı` : ''}`}
              onClick={onSlice ? () => onSlice(i) : undefined}
              onKeyDown={onSlice ? key(i) : undefined}
              className={onSlice ? 'cursor-pointer outline-none hover:brightness-95 focus-visible:brightness-90' : ''}
            />
            {dots.map(([x, y], j) => <circle key={j} cx={x} cy={y} r={5.5} fill={topping.dot} stroke="#fff" strokeOpacity={0.5} pointerEvents="none" />)}
            {owner !== null && (
              <g pointerEvents="none">
                <path d={sector(a0, span, R)} fill={KIDS[owner].color} fillOpacity={0.3} stroke={KIDS[owner].color} strokeWidth={3} />
                <circle cx={xy(cr, mid)[0]} cy={xy(cr, mid)[1]} r={14} fill={KIDS[owner].color} stroke="#fff" strokeWidth={2.5} />
                <text x={xy(cr, mid)[0]} y={xy(cr, mid)[1] + 5} textAnchor="middle" fontSize={14} fontWeight={900} fill="#fff">{KIDS[owner].name[0]}</text>
              </g>
            )}
          </g>
        )
      })}
      </g>
      {guide && Array.from({ length: guide }, (_, i) => (
        <line key={i} x1={0} y1={0} x2={xy(R, (i * 360) / guide)[0]} y2={xy(R, (i * 360) / guide)[1]} stroke="#1f2340" strokeWidth={2.5} strokeDasharray="6 5" pointerEvents="none" />
      ))}
    </svg>
  )
}

/** İki miktarı aynı pizza üzerinde üst üste gösterir */
function OverlaySvg({ a, b, ta, tb, la, lb }: { a: Frac; b: Frac; ta: Topping; tb: Topping; la: string; lb: string }) {
  const R = 86
  const sa = Math.min(1, a.n / a.d) * 360
  const sb = Math.min(1, b.n / b.d) * 360
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <svg viewBox="-100 -100 200 200" className="w-44 drop-shadow-md sm:w-52" role="img" aria-label="Üst üste konmuş iki sipariş">
        <circle r={97} fill="#e2a54f" stroke="#b7791f" strokeWidth={3} />
        <circle r={R} fill="#fde68a" />
        <path d={sector(0, sa, R)} fill={ta.color} stroke={ta.dot} strokeWidth={3} />
        <path d={sector(0, sb, R)} fill={tb.dot} fillOpacity={0.12} stroke={tb.dot} strokeWidth={5} strokeDasharray="9 6" strokeLinejoin="round" />
      </svg>
      <div className="space-y-2 text-sm font-extrabold">
        <p className="flex items-center gap-2"><span className="size-5 rounded" style={{ background: ta.color, outline: `3px solid ${ta.dot}` }} /><MathText text={la} /></p>
        <p className="flex items-center gap-2"><span className="size-5 rounded border-[3px] border-dashed" style={{ borderColor: tb.dot }} /><MathText text={lb} /></p>
      </div>
    </div>
  )
}

function PizzaRow({ n, children }: { n: number; children: ReactNode }) {
  return (
    <ZoomBox className="rounded-3xl bg-gradient-to-b from-amber-50/80 to-orange-50/60 ring-1 ring-orange-100">
      <div className={`flex flex-wrap items-start justify-center gap-3 p-3 pb-12 sm:p-4 sm:pb-12 ${n >= 3 ? '[&>*]:w-[30%] [&>*]:max-w-[190px]' : n === 2 ? '[&>*]:w-[46%] [&>*]:max-w-[250px]' : '[&>*]:w-full [&>*]:max-w-[290px]'}`}>{children}</div>
    </ZoomBox>
  )
}

/** Bıçak paneli: hangi pizza(lar), kaç eş parça */
function KnifeBar({ knives, cuts, sel, setSel, onCut, big, disabled }: { knives: number[]; cuts: number[]; sel: 'all' | number; setSel: (s: 'all' | number) => void; onCut: (k: number) => void; big: boolean; disabled?: boolean }) {
  const pressed = (k: number) => (sel === 'all' ? cuts.every((c) => c === k) : cuts[sel] === k)
  return (
    <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
      <p className="mb-2 text-xs font-black tracking-wide text-ink-soft uppercase">🔪 Kaç eş parçaya keseyim?</p>
      {cuts.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kesilecek pizza">
          {(['all', ...cuts.map((_, i) => i)] as ('all' | number)[]).map((s) => (
            <button key={String(s)} type="button" role="radio" aria-checked={sel === s} disabled={disabled} onClick={() => setSel(s)} className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ring-1 transition ${sel === s ? 'bg-ink text-white ring-ink' : 'bg-paper text-ink ring-line'}`}>
              {s === 'all' ? 'Hepsi' : `${s + 1}. pizza`}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {knives.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onCut(k)}
            disabled={disabled}
            aria-pressed={pressed(k)}
            aria-label={k === 1 ? 'Kesme, bütün bırak' : `${k} eş parçaya kes`}
            className={`flex flex-col items-center justify-center rounded-2xl ring-2 transition active:scale-95 ${big ? 'size-14' : 'size-12'} ${pressed(k) ? 'bg-orange-500 text-white ring-orange-500' : 'bg-white text-ink ring-line hover:ring-orange-300'}`}
          >
            <span className="text-lg leading-none font-black">{k}</span>
            <span className="text-[10px] leading-tight font-bold opacity-80">{k === 1 ? 'bütün' : 'parça'}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

interface Msg { q: string; ok?: boolean; mis?: string; tool?: boolean; k: number }
function MsgBox({ m, onClose }: { m: Msg | null; onClose: () => void }) {
  if (!m) return null
  // Dar sütunda (tablet yatay panel, telefon) düğmeler metni sıkıştırmasın: alt satıra insin
  return (
    <div className={m.tool ? '@container @max-md:[&>div>p]:basis-[calc(100%-3rem)] @max-md:[&>div>div]:ml-12' : undefined}>
      <Nudge key={m.k} question={m.q} tone={m.ok ? 'ok' : 'think'} misconception={m.mis} tool={m.tool ? 'kesirdaireleri' : undefined} toolTitle="Kesir daireleri ile dene" onClose={onClose} />
    </div>
  )
}

function NextButton({ last, onClick, disabled }: { last: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="btn-primary min-h-14 w-full text-lg">
      {last ? 'Bitir' : 'Sonraki sipariş'}<ArrowRight size={20} />
    </button>
  )
}

const TwoCol = ({ board, panel, sticky = true }: { board: ReactNode; panel: ReactNode; sticky?: boolean }) => (
  <div className="lg:grid lg:grid-cols-[1fr_300px] lg:items-start lg:gap-4">
    <div className={`min-w-0 ${sticky ? 'lg:sticky lg:top-20' : ''}`}>{board}</div>
    <div className="mt-3 space-y-3 lg:mt-0">{panel}</div>
  </div>
)

interface Done { first: boolean; sols: number; goal: number }
interface TaskProps<K extends TaskBody['kind']> { t: Extract<Task, { kind: K }>; words: boolean; big: boolean; last: boolean; onNext: (d: Done) => void }

// ───────────────────────────── 1) Adil paylaştır ─────────────────────────────

function ShareTask({ t, words, big, last, onNext }: TaskProps<'share'>) {
  const track = useTracker()
  const sol = useSolutions()
  const blank = () => ({ cuts: Array<number>(t.pizzas).fill(1), own: Array.from({ length: t.pizzas }, () => [null] as (number | null)[]) })
  const [st, setSt] = useState(blank)
  const [active, setActive] = useState(0)
  const [sel, setSel] = useState<'all' | number>('all')
  const [msg, setMsg] = useState<Msg | null>(null)
  const [fails, setFails] = useState(0)
  const [first, setFirst] = useState<boolean | null>(null)
  const kids = KIDS.slice(0, t.kids)
  const say = (m: Omit<Msg, 'k'>) => setMsg({ ...m, k: Date.now() })

  const cut = (k: number) => {
    const idx = sel === 'all' ? st.cuts.map((_, i) => i) : [sel]
    setSt({ cuts: st.cuts.map((c, i) => (idx.includes(i) ? k : c)), own: st.own.map((o, i) => (idx.includes(i) ? Array<number | null>(k).fill(null) : o)) })
    setMsg(null)
  }
  const tap = (p: number, s: number) => {
    setSt({ ...st, own: st.own.map((o, i) => (i !== p ? o : o.map((x, j) => (j !== s ? x : x === active ? null : active)))) })
    setMsg(null)
  }
  const plates = kids.map((_, ki) => st.own.flatMap((o, p) => o.flatMap((x) => (x === ki ? [st.cuts[p]] : []))))
  const vals = plates.map(sumUnits)

  const check = () => {
    const all = st.own.flat()
    const left = all.filter((x) => x === null).length
    if (left === all.length) return say({ q: 'Önce bir tabak seç, sonra o kişiye vereceğin dilimlere dokun. Pizza çok büyükse önce bıçakla eş parçalara kes!' })
    if (left > 0) return say({ q: `Ortada hâlâ ${left} dilim duruyor. Adil paylaşımda pizza artar mı? Kalan dilimleri de paylaştır; gerekirse daha küçük eş parçalara kes.` })
    let hi = 0
    let lo = 0
    vals.forEach((v, i) => {
      if (less(vals[hi], v)) hi = i
      if (less(v, vals[lo])) lo = i
    })
    if (!same(vals[hi], vals[lo])) {
      track.attempt(false)
      setFails((f) => f + 1)
      const countsEqual = plates.every((p) => p.length === plates[0].length)
      return say({
        q: countsEqual
          ? `${kids[hi].name} da ${kids[lo].name} da ${plates[hi].length} dilim aldı. Ama ${kids[hi].gen} payı ${show(vals[hi], words)}, ${kids[lo].gen} payı ${show(vals[lo], words)}. Dilimler aynı büyüklükte mi?`
          : `${kids[hi].gen} tabağında ${show(vals[hi], words)}, ${kids[lo].gen} tabağında ${show(vals[lo], words)} var. Herkes eşit almalı. Hangi dilimi kimden kime verirsin?`,
        mis: countsEqual ? 'Dilim sayısı eşit olunca payları eşit sandı (dilim büyüklüğüne bakmadı)' : undefined,
        tool: true,
      })
    }
    sfx.ok()
    track.attempt(true)
    if (first === null) {
      track.item(fails === 0)
      setFirst(fails === 0)
    }
    const key = plates.map((p) => [...p].sort((a, b) => a - b).join(',')).sort().join('|')
    if (sol.list.some((s) => s.key === key)) return say({ ok: true, q: 'Bu paylaşımı zaten bulmuştun! Pizzaları başka türlü keserek farklı bir yol dener misin?' })
    const label = [...new Set(plates.map((p) => plateExpr(p, words)))].join('  ·  ')
    sol.add(key, label)
    track.strategy(inferShare(st.cuts, t.kids))
    const n = sol.list.length + 1
    say({ ok: true, q: `Adil paylaşım! Herkes ${showFull(vals[0], words)} pizza aldı.${n < t.goal ? ' Pizzaları başka türlü keserek başka bir yol bulabilir misin?' : ''}` })
  }

  const again = () => {
    setSt(blank())
    setSel('all')
    setMsg(null)
  }

  const board = (
    <PizzaRow n={t.pizzas}>
      {st.cuts.map((c, p) => (
        <div key={p} className="text-center">
          <PizzaSvg spans={equalSpans(c)} view={st.own[p].map((o) => ({ topped: true, owner: o }))} topping={t.topping} onSlice={(s) => tap(p, s)} label={`${p + 1}. pizza, ${c} eş dilim`} />
          <p className="mt-1 text-xs font-extrabold text-ink-soft">{t.pizzas > 1 ? `${p + 1}. pizza · ` : ''}{c === 1 ? 'kesilmedi' : `${c} eş dilim`}</p>
        </div>
      ))}
    </PizzaRow>
  )

  const panel = (
    <>
      <KnifeBar knives={t.knives} cuts={st.cuts} sel={sel} setSel={setSel} onCut={cut} big={big} />
      <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
        <p className="mb-2 text-xs font-black tracking-wide text-ink-soft uppercase">🍽️ Tabak seç, sonra dilimlere dokun</p>
        <div className={`grid grid-cols-2 gap-2 lg:grid-cols-2 ${t.kids === 3 ? 'sm:grid-cols-3' : t.kids >= 4 ? 'sm:grid-cols-4' : ''}`} role="radiogroup" aria-label="Tabaklar">
          {kids.map((k, ki) => (
            <button
              key={k.name}
              type="button"
              role="radio"
              aria-checked={active === ki}
              onClick={() => setActive(ki)}
              className={`flex ${big ? 'min-h-24' : 'min-h-20'} flex-col items-center justify-start rounded-2xl border-[3px] p-2 text-center transition`}
              style={{ background: active === ki ? `${k.color}17` : '#fff', borderColor: active === ki ? k.color : '#e7e8f2' }}
            >
              <span className="flex items-center gap-1 text-sm font-black" style={{ color: k.color }}><span className="text-xl" aria-hidden>{k.emoji}</span>{k.name}</span>
              {plates[ki].length ? (
                <>
                  <span className="mt-0.5 text-sm font-bold text-ink"><MathText text={plateExpr(plates[ki], words)} /></span>
                  {plates[ki].length > 1 && <span className="text-sm font-black text-ink">= <MathText text={showFull(vals[ki], words)} /></span>}
                </>
              ) : (
                <span className="mt-1 text-xs font-bold text-ink-soft">boş tabak</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <button type="button" onClick={() => setSt({ ...st, own: st.own.map((o) => o.map(() => null)) })} className="btn-ghost min-h-14 px-4" aria-label="Dağıtımı temizle"><Eraser size={20} /></button>
        <button type="button" onClick={check} className="btn-primary min-h-14 text-lg"><Scale size={20} />Adil mi? Kontrol et</button>
      </div>
      <MsgBox m={msg} onClose={() => setMsg(null)} />
      <SolutionList list={sol.list} goal={t.goal} />
      {first !== null && <StrategyPicker options={STRATS.share} onPick={() => {}} question="Nasıl paylaştırdın?" />}
      {first !== null && (
        <div className="grid gap-2">
          <button type="button" onClick={again} className="btn-ghost min-h-12"><RotateCcw size={18} />Başka bir şekilde paylaştır</button>
          <NextButton last={last} onClick={() => onNext({ first, sols: sol.list.length, goal: t.goal })} />
        </div>
      )}
    </>
  )
  return <TwoCol board={board} panel={panel} />
}

// ───────────────────────────── 2) Aynı mı? Kanıtla ─────────────────────────────

const sideValue = (s: Side) => s.pizzas.reduce((acc, p) => add(acc, F(p.t, p.d)), ZERO)

function ProofTask({ t, words, big, last, onNext }: TaskProps<'proof'>) {
  const track = useTracker()
  const sol = useSolutions()
  const [cur, setCur] = useState({ a: t.a.pizzas.map((p) => p.d), b: t.b.pizzas.map((p) => p.d) })
  const [pred, setPred] = useState<'same' | 'diff' | null>(null)
  const [overlay, setOverlay] = useState(false)
  const [msg, setMsg] = useState<Msg | null>(null)
  const [first, setFirst] = useState<boolean | null>(null)
  const say = (m: Omit<Msg, 'k'>) => setMsg({ ...m, k: Date.now() })
  const va = sideValue(t.a)
  const vb = sideValue(t.b)
  const equal = same(va, vb)
  const single = t.a.pizzas.length === 1 && t.b.pizzas.length === 1
  const toppingB = t.topping.name === TOPPINGS[3].name ? TOPPINGS[0] : TOPPINGS[3]

  const countOf = (s: Side, dens: number[]) => s.pizzas.reduce((acc, p, i) => acc + (p.t * dens[i]) / p.d, 0)
  const commonD = (c: { a: number[]; b: number[] }) => {
    const all = [...c.a, ...c.b]
    return all.every((x) => x === all[0]) ? all[0] : null
  }

  const register = (key: string, label: string, how: string, na?: number, nb?: number, D?: number) => {
    if (sol.list.some((s) => s.key === key)) return say({ ok: true, q: 'Bu kanıtı zaten bulmuştun. Dilimleri başka bir sayıda parçaya bölerek yeni bir kanıt dener misin?' })
    sfx.ok()
    sol.add(key, label)
    track.strategy(how)
    const verdict = equal
      ? 'Aynı miktar!'
      : `${less(va, vb) ? t.b.kid.name : t.a.kid.name} ${show(less(va, vb) ? sub(vb, va) : sub(va, vb), words)} pizza daha fazla yiyecek.`
    if (first === null) {
      const correct = (pred === 'same') === equal
      track.attempt(correct)
      track.item(correct)
      setFirst(correct)
      if (!correct) {
        const counted = D ? `Şimdi ikisinde de [[1/${D}]]’lik dilimler var: ${na} dilim ve ${nb} dilim.` : 'Üst üste koyunca kenarlara bak.'
        return say(
          equal
            ? { q: `Tahminin “farklı” idi. ${counted} Sayılar farklı görünse de pizza miktarı değişti mi?`, mis: 'Denk kesirleri farklı miktar sandı (pay ve paydanın büyüklüğüne baktı)', tool: true }
            : {
                q: `Tahminin “aynı” idi. ${counted} Hangisi daha çok?`,
                mis: t.a.pizzas[0].d - t.a.pizzas[0].t === t.b.pizzas[0].d - t.b.pizzas[0].t && single ? 'Pay ile payda arasındaki fark aynı diye kesirleri eşit sandı' : 'Denk olmayan kesirleri aynı miktar sandı',
                tool: true,
              },
        )
      }
      return say({ ok: true, q: `Tahminin doğruydu ve kanıtladın: ${verdict} Başka bir yolla da kanıtlayabilir misin?` })
    }
    say({ ok: true, q: `Yeni bir kanıt! ${verdict}` })
  }

  const recut = (s: 'a' | 'b', i: number, k: number) => {
    if (!pred) return say({ q: 'Önce tahmin et: sence ikisi aynı miktarda mı?' })
    const side = s === 'a' ? t.a : t.b
    const next = { ...cur, [s]: cur[s].map((x, j) => (j === i ? k : x)) }
    setCur(next)
    setMsg(null)
    const D = commonD(next)
    if (D) {
      const na = countOf(t.a, next.a)
      const nb = countOf(t.b, next.b)
      const doubled = next.a.some((x, j) => x === 2 * t.a.pizzas[j].d) || next.b.some((x, j) => x === 2 * t.b.pizzas[j].d)
      const ratio = k / side.pizzas[i].d
      register(`D${D}`, `${D} eş dilim: ${pieceText(na, D, words)} ${equal ? '=' : '≠'} ${pieceText(nb, D, words)}`, ratio === 2 || doubled ? STRATS.proof[0] : STRATS.proof[1], na, nb, D)
    }
  }

  const showOverlay = () => {
    if (!pred) return say({ q: 'Önce tahmin et: sence ikisi aynı miktarda mı?' })
    setOverlay(true)
    register('overlay', 'Üst üste koyarak', STRATS.proof[2])
  }

  const D = commonD(cur)
  const SideCard = ({ s, which, topping }: { s: Side; which: 'a' | 'b'; topping: Topping }) => {
    const dens = cur[which]
    const n = countOf(s, dens)
    const allSame = dens.every((x) => x === dens[0])
    return (
      <div className="rounded-3xl bg-white/95 p-3 ring-1 ring-line">
        <p className="mb-2 flex items-center justify-center gap-2 text-center text-base font-black">
          <span className="text-2xl" aria-hidden>{s.kid.emoji}</span>{s.kid.name}: <MathText text={`${s.label} pizza`} />
        </p>
        <div className={`mx-auto flex justify-center gap-2 ${s.pizzas.length > 1 ? '[&>*]:w-1/2 [&>*]:max-w-[170px]' : '[&>*]:w-full [&>*]:max-w-[220px]'}`}>
          {s.pizzas.map((p, i) => (
            <PizzaSvg key={i} spans={equalSpans(dens[i])} view={Array.from({ length: dens[i] }, (_, j) => ({ topped: j < (p.t * dens[i]) / p.d }))} topping={topping} label={`${s.kid.name}: ${dens[i]} eş dilimin ${(p.t * dens[i]) / p.d} tanesi malzemeli`} />
          ))}
        </div>
        <p className="mt-2 text-center text-lg font-black">
          <MathText text={s.pizzas.length > 1 ? `${s.pizzas.map((p, i) => (words ? pieceText((p.t * dens[i]) / p.d, dens[i], words) : raw((p.t * dens[i]) / p.d, dens[i]))).join(' + ')}${allSame ? ` = ${raw(n, dens[0])}` : ''}` : words ? pieceText(n, dens[0], words) : raw(n, dens[0])} />
        </p>
        <div className="mt-2 space-y-1.5">
          {s.pizzas.map((p, i) => {
            const opts = t.opts.filter((x) => x % p.d === 0)
            return (
              <div key={i} className="flex flex-wrap items-center justify-center gap-1.5">
                <span className={`text-xs font-extrabold text-ink-soft ${s.pizzas.length > 1 ? 'w-full text-center' : ''}`}>🔪 {s.pizzas.length > 1 ? `${i + 1}. pizzayı kaç eş dilime bölelim?` : 'Dilim sayısı'}{s.pizzas.length > 1 ? '' : ':'}</span>
                {opts.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => recut(which, i, k)}
                    aria-pressed={dens[i] === k}
                    aria-label={`${s.kid.name}${s.pizzas.length > 1 ? `, ${i + 1}. pizza` : ''}: ${k} eş dilime böl`}
                    className={`grid place-items-center rounded-xl text-base font-black ring-2 transition active:scale-95 ${big ? 'size-14' : 'size-12'} ${dens[i] === k ? 'bg-orange-500 text-white ring-orange-500' : pred ? 'bg-white text-ink ring-line' : 'bg-white text-ink/40 ring-line'}`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const board = (
    <div>
      <div className={`mb-3 rounded-2xl p-3 ring-1 transition ${pred ? 'bg-white/95 ring-line' : 'bg-sky-50 ring-sky-300'}`}>
        <p className="mb-2 text-sm font-black">1. Önce tahmin et: ikisi aynı miktarda mı?</p>
        <div className="grid grid-cols-2 gap-2">
          {(['same', 'diff'] as const).map((p) => (
            <button key={p} type="button" disabled={!!pred} onClick={() => { setPred(p); setMsg(null) }} aria-pressed={pred === p} className={`min-h-14 rounded-2xl px-2 text-base font-black ring-2 transition ${pred === p ? 'bg-sky-600 text-white ring-sky-600' : 'bg-white text-ink ring-line'} ${pred && pred !== p ? 'opacity-50' : ''} disabled:cursor-default`}>
              {p === 'same' ? '🟰 Aynı miktar' : '↕️ Farklı miktar'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {SideCard({ s: t.a, which: 'a', topping: t.topping })}
        {SideCard({ s: t.b, which: 'b', topping: toppingB })}
      </div>
      {overlay && single && (
        <div className="mt-3 rounded-3xl bg-white/95 p-3 ring-1 ring-line animate-fade-up">
          <p className="mb-2 text-center text-sm font-black text-ink-soft">Üst üste koyunca:</p>
          <OverlaySvg a={va} b={vb} ta={t.topping} tb={toppingB} la={`${t.a.kid.name}: ${t.a.label}`} lb={`${t.b.kid.name}: ${t.b.label}`} />
        </div>
      )}
    </div>
  )

  const panel = (
    <>
      <div className={`rounded-2xl bg-white/95 p-3 ring-1 ring-line transition ${pred ? '' : 'opacity-60'}`}>
        <p className="text-sm font-black">2. Kanıtla{pred ? '' : ' (önce tahmin et)'}</p>
        <p className="mt-1 text-sm font-bold text-ink-soft">
          Dilimleri daha küçük eş parçalara böl. Her pizzadaki dilimler aynı büyüklükte olunca saymak yeter!
        </p>
        {D ? (
          <p className="mt-2 rounded-xl bg-emerald-50 p-2 text-sm font-extrabold text-emerald-800"><MathText text={`Hepsi [[1/${D}]]’lik dilim: ${pieceText(countOf(t.a, cur.a), D, words)} ve ${pieceText(countOf(t.b, cur.b), D, words)}`} /></p>
        ) : (
          pred && <p className="mt-2 rounded-xl bg-paper p-2 text-sm font-bold text-ink-soft">Dilimler henüz aynı büyüklükte değil: {[...new Set([...cur.a, ...cur.b])].sort((x, y) => x - y).join(', ')} eş parçalı pizzalar var.</p>
        )}
        {single && (
          <button type="button" onClick={showOverlay} className="btn-ghost mt-2 min-h-12 w-full"><Layers size={18} />Üst üste koy</button>
        )}
      </div>
      <MsgBox m={msg} onClose={() => setMsg(null)} />
      <SolutionList list={sol.list} goal={2} />
      {first !== null && <StrategyPicker options={STRATS.proof} onPick={() => {}} question="Nasıl kanıtladın?" />}
      {first !== null && <NextButton last={last} onClick={() => onNext({ first, sols: sol.list.length, goal: 2 })} />}
    </>
  )
  return <TwoCol board={board} panel={panel} sticky={false} />
}

// ───────────────────────────── Sipariş hazırlama alanı (ortak) ─────────────────────────────

function BuildArea({ target, label, pizzas, knives, words, big, topping, known, onSuccess, onFail, extra, intro, sticky = true }: {
  target: Frac; label: string; pizzas: number; knives: number[]; words: boolean; big: boolean; topping: Topping
  known: string[]; onSuccess: (key: string, label: string, cuts: number[]) => void; onFail: () => void; extra?: ReactNode; intro?: ReactNode; sticky?: boolean
}) {
  const [cuts, setCuts] = useState<number[]>(() => Array<number>(pizzas).fill(1))
  const [tops, setTops] = useState<boolean[][]>(() => Array.from({ length: pizzas }, () => [false]))
  const [sel, setSel] = useState<'all' | number>('all')
  const [msg, setMsg] = useState<Msg | null>(null)
  const [done, setDone] = useState(false)
  const say = (m: Omit<Msg, 'k'>) => setMsg({ ...m, k: Date.now() })

  const cut = (k: number) => {
    const idx = sel === 'all' ? cuts.map((_, i) => i) : [sel]
    setCuts(cuts.map((c, i) => (idx.includes(i) ? k : c)))
    setTops(tops.map((o, i) => (idx.includes(i) ? Array<boolean>(k).fill(false) : o)))
    setMsg(null)
  }
  const toggle = (p: number, s: number) => {
    setTops(tops.map((o, i) => (i !== p ? o : o.map((x, j) => (j === s ? !x : x)))))
    setMsg(null)
  }
  const counts = tops.map((o) => o.filter(Boolean).length)
  const total = counts.reduce((acc, c, i) => add(acc, F(c, cuts[i])), ZERO)
  const terms = counts.flatMap((c, i) => (c === 0 ? [] : [pieceText(c, cuts[i], words)]))

  const check = () => {
    if (counts.every((c) => c === 0)) return say({ q: 'Önce bıçakla pizzayı eş parçalara kes, sonra dilimlere dokunarak malzeme koy.' })
    if (same(total, target)) {
      const key = counts.map((c, i) => `${c}/${cuts[i]}`).filter((x) => !x.startsWith('0/')).sort().join('+')
      if (known.includes(key)) return say({ ok: true, q: 'Bu yolu zaten bulmuştun! Pizzayı başka sayıda eş parçaya keserek dener misin?' })
      const lab = terms.join(' + ')
      setDone(true)
      onSuccess(key, lab, cuts)
      return say({ ok: true, q: `Afiyet olsun! ${lab}${terms.length > 1 || lab !== show(target, words) ? ` = ${showFull(target, words)}` : ''} pizza.` })
    }
    onFail()
    const one = pizzas === 1
    if (one && counts[0] === target.n && cuts[0] !== target.d && target.n < target.d)
      return say({ q: `${raw(counts[0], cuts[0])} ile ${label} aynı mı? [[1/${cuts[0]}]]’lik bir dilim, [[1/${target.d}]]’lik dilimden büyük mü küçük mü?`, mis: 'Payı aynı tutup paydayı değiştirdi (dilim sayısına baktı, dilim büyüklüğüne bakmadı)', tool: true })
    if (one && (target.n * cuts[0]) % target.d !== 0)
      return say({
        q: words
          ? `Pizzayı ${cuts[0]} parçaya kestin. Bu dilimlerle tam ${label} yapılabilir mi? ${label === 'yarım' ? 'Yarım için' : 'Bunun için'} pizza kaç eş parçaya kesilmeli?`
          : `${cuts[0]} eş dilimle tam ${label} oluşturabilir misin? Paydaya bak: pizza kaç eş parçaya (ya da bunun katlarına) kesilmeli?`,
        tool: true,
      })
    const lessThan = less(total, target)
    say({ q: `Hazırladığın ${showFull(total, words)}, sipariş ${label}. Sence ${lessThan ? 'az mı' : 'çok mu'} oldu? Kaç dilim ${lessThan ? 'eklemelisin' : 'çıkarmalısın'}?`, tool: true })
  }

  const board = (
    <>
      {intro}
      <PizzaRow n={pizzas}>
        {cuts.map((c, p) => (
          <div key={p} className="text-center">
            <PizzaSvg spans={equalSpans(c)} view={tops[p].map((x) => ({ topped: x }))} topping={topping} onSlice={done ? undefined : (s) => toggle(p, s)} label={`${pizzas > 1 ? `${p + 1}. pizza, ` : ''}${c} eş dilim`} />
            <p className="mt-1 text-xs font-extrabold text-ink-soft">{pizzas > 1 ? `${p + 1}. pizza · ` : ''}{c === 1 ? 'kesilmedi' : `${c} eş dilim`} · {counts[p]} malzemeli</p>
          </div>
        ))}
      </PizzaRow>
      <p className="mt-2 text-center text-lg font-black" aria-live="polite">
        Hazırlanan: {counts.some((c) => c > 0) ? <MathText text={`${terms.join(' + ')}${terms.length > 1 ? ` = ${showFull(total, words)}` : ''}`} /> : <span className="text-ink-soft">henüz yok</span>}
      </p>
    </>
  )
  const panel = (
    <>
      <KnifeBar knives={knives} cuts={cuts} sel={sel} setSel={setSel} onCut={cut} big={big} disabled={done} />
      <p className="px-1 text-sm font-bold text-ink-soft">Malzeme koymak (ya da kaldırmak) için dilimlere dokun.</p>
      <button type="button" onClick={check} disabled={done} className="btn-primary min-h-14 w-full bg-orange-500 text-lg shadow-[0_4px_0_#c2410c]"><Check size={20} strokeWidth={3} />Servis et</button>
      <MsgBox m={msg} onClose={() => setMsg(null)} />
      {extra}
    </>
  )
  return <TwoCol board={board} panel={panel} sticky={sticky} />
}

// ───────────────────────────── 3) Siparişi hazırla ─────────────────────────────

function BuildTask({ t, words, big, last, onNext }: TaskProps<'build'>) {
  const track = useTracker()
  const sol = useSolutions()
  const [round, setRound] = useState(0)
  const [fails, setFails] = useState(0)
  const [first, setFirst] = useState<boolean | null>(null)
  const [solvedNow, setSolvedNow] = useState(false)

  const success = (key: string, label: string, cuts: number[]) => {
    sfx.ok()
    track.attempt(true)
    if (first === null) {
      track.item(fails === 0)
      setFirst(fails === 0)
    }
    sol.add(key, label)
    if (cuts.includes(1) && t.pizzas > 1) track.strategy(STRATS.build[2])
    else if (cuts.some((c) => c > t.target.d)) track.strategy(cuts.some((c) => c === 2 * t.target.d) ? STRATS.build[0] : STRATS.build[1])
    setSolvedNow(true)
  }
  const fail = () => {
    track.attempt(false)
    setFails((f) => f + 1)
  }

  return (
    <BuildArea
      key={round}
      target={t.target}
      label={t.label}
      pizzas={t.pizzas}
      knives={t.knives}
      words={words}
      big={big}
      topping={t.topping}
      known={sol.list.map((s) => s.key)}
      onSuccess={success}
      onFail={fail}
      extra={
        <>
          <SolutionList list={sol.list} goal={t.goal} />
          {first !== null && <StrategyPicker key="s" options={STRATS.build} onPick={() => {}} question="Nasıl düşündün?" />}
          {first !== null && (
            <div className="grid gap-2">
              {solvedNow && (
                <button type="button" onClick={() => { setRound(round + 1); setSolvedNow(false) }} className="btn-ghost min-h-12">
                  <RotateCcw size={18} />{sol.list.length < t.goal ? 'Başka bir yolla hazırla' : 'Bir yol daha dene'}
                </button>
              )}
              <NextButton last={last} onClick={() => onNext({ first, sols: sol.list.length, goal: t.goal })} />
            </div>
          )}
        </>
      }
    />
  )
}

// ───────────────────────────── 4) Eş parçalar mı? ─────────────────────────────

function UnequalTask({ t, words, big, last, onNext }: TaskProps<'unequal'>) {
  const track = useTracker()
  const [phase, setPhase] = useState<'ask' | 'fix' | 'done'>('ask')
  const [wrong, setWrong] = useState(false)
  const [msg, setMsg] = useState<Msg | null>(null)
  const say = (m: Omit<Msg, 'k'>) => setMsg({ ...m, k: Date.now() })
  const claimShort = words ? 'çeyrek' : show(t.claim)

  const answer = (yes: boolean) => {
    if (yes) {
      track.attempt(false)
      setWrong(true)
      return say({ q: `Parçalar eş mi? ${NUM_W[t.spans.length][0].toLocaleUpperCase('tr-TR') + NUM_W[t.spans.length].slice(1)} parçanın hepsi aynı büyüklükte mi? En büyük parçayla malzemeli parçayı karşılaştır.`, mis: 'Eş olmayan parçaları kesir saydı (parça sayısına baktı)', tool: true })
    }
    track.attempt(true)
    track.item(!wrong)
    sfx.ok()
    setPhase('fix')
    say({ ok: true, q: `Evet! Parçalar eş değil, bu yüzden malzemeli dilime ${claimShort} diyemeyiz. Kesikli çizgiler eş parçaları gösteriyor: malzemeli dilim gerçek bir ${words ? 'çeyrekten' : `${claimShort}’den`} ${t.spans[t.top] < 360 * (t.claim.n / t.claim.d) ? 'küçük' : 'büyük'}.` })
  }

  const intro = (
    <div className="mb-3 rounded-3xl bg-white/95 p-3 ring-1 ring-line">
      <div className="mx-auto max-w-[260px]">
        <PizzaSvg spans={t.spans} view={t.spans.map((_, i) => ({ topped: i === t.top }))} topping={t.topping} label={`${t.spans.length} parçaya bölünmüş pizza; parçalar eş değil`} guide={phase === 'ask' ? undefined : t.claim.d} sliceName="parça" />
      </div>
      {phase !== 'ask' && <p className="mt-1 text-center text-xs font-extrabold text-ink-soft">Kesikli çizgiler: {NUM_W[t.claim.d]} eş parça</p>}
    </div>
  )

  if (phase === 'ask')
    return (
      <TwoCol
        board={intro}
        panel={
          <>
            <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
              <p className="mb-2 text-sm font-black">Çırak haklı mı?</p>
              <div className="grid gap-2">
                <button type="button" onClick={() => answer(true)} className="min-h-14 rounded-2xl bg-white px-3 text-left text-base font-black ring-2 ring-line transition active:scale-[0.98]">
                  👍 Evet, {NUM_W[t.spans.length]} parçadan biri
                </button>
                <button type="button" onClick={() => answer(false)} className="min-h-14 rounded-2xl bg-white px-3 text-left text-base font-black ring-2 ring-line transition active:scale-[0.98]">
                  🤔 Hayır, parçalar eş değil
                </button>
              </div>
            </div>
            <MsgBox m={msg} onClose={() => setMsg(null)} />
          </>
        }
      />
    )

  return (
    <div>
      <MsgBox m={msg} onClose={() => setMsg(null)} />
      <StrategyPicker options={STRATS.unequal} onPick={() => {}} question="Nasıl anladın?" />
      <div className="mt-3 rounded-2xl bg-orange-50 p-3 text-center text-base font-black text-orange-900 ring-1 ring-orange-200">
        Şimdi sen yap: pizzayı eş parçalara kes ve <MathText text={words ? 'pizzanın tam çeyreğine' : `pizzanın tam ${claimShort}’ine`} /> malzeme koy.
      </div>
      <div className="mt-3">
        <BuildArea
          target={t.claim}
          label={claimShort}
          pizzas={1}
          knives={t.knives}
          words={words}
          big={big}
          topping={t.topping}
          known={[]}
          intro={intro}
          sticky={false}
          onSuccess={() => {
            sfx.ok()
            setPhase('done')
          }}
          onFail={() => track.attempt(false)}
          extra={phase === 'done' && <NextButton last={last} onClick={() => onNext({ first: !wrong, sols: 1, goal: 1 })} />}
        />
      </div>
    </div>
  )
}

// ───────────────────────────── Oyun ─────────────────────────────

const insightFor = (grade: Grade) =>
  grade <= 2
    ? 'Yarım, bütünün 2 eş parçasından biri; çeyrek ise 4 eş parçasından biri. İki çeyrek bir yarımı tam kaplar: farklı dilimler, aynı miktar!'
    : grade === 3
      ? 'Payda, bütünün kaç EŞ parçaya bölündüğünü söyler; parçalar eş değilse o kesir yoktur. Payda büyüdükçe her dilim küçülür: [[1/4]] < [[1/3]].'
      : grade === 4
        ? 'Her dilimi aynı sayıda parçaya bölünce pay da payda da aynı sayıyla çarpılır ama pizza değişmez: [[2/3]] = [[4/6]] = [[8/12]]. Kanıt için ortak dilim büyüklüğü bulmak yeter!'
        : '[[5/4]], [[1 1/4]] ve 5 tane [[1/4]] aynı miktar: bütün pizzayı çeyreklere bölünce 4 çeyrek olur, bir çeyrek daha eklenince 5 çeyrek.'

export default function PizzaShop({ grade, onFinish }: GameProps) {
  const [tasks] = useState(() => makeTasks(grade))
  const [i, setI] = useState(0)
  const [acc, setAcc] = useState({ pts: 0, max: 0, sols: 0, firsts: 0 })
  const words = grade <= 2
  const big = grade <= 3
  const t = tasks[i]
  const last = i + 1 >= tasks.length

  const next = (d: Done) => {
    const pts = (d.first ? 2 : 1) + (d.goal > 1 ? (d.sols >= d.goal ? 1 : 0) : 1)
    const a = { pts: acc.pts + pts, max: acc.max + 3, sols: acc.sols + d.sols, firsts: acc.firsts + (d.first ? 1 : 0) }
    setAcc(a)
    if (last) {
      onFinish({
        stars: starsFor(a.pts / a.max),
        score: a.pts * 10 + a.sols * 5,
        summary: `${tasks.length} siparişin ${a.firsts} tanesini ilk denemede çözdün; toplam ${a.sols} farklı yol ve kanıt buldun.`,
        insight: insightFor(grade),
      })
      return
    }
    setI(i + 1)
  }

  const props = { words, big, last, onNext: next }

  return (
    <Scene grade={grade} className="animate-fade-up">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <LevelDots current={i} total={tasks.length} />
        <span className="chip bg-white px-3 py-1.5 text-sm text-orange-800 ring-1 ring-orange-200">{KIND_LABEL[t.kind]}</span>
      </div>
      <TaskCard step={i + 1} total={tasks.length}>{t.story}</TaskCard>
      <div key={i}>
        {t.kind === 'share' && <ShareTask t={t} {...props} />}
        {t.kind === 'proof' && <ProofTask t={t} {...props} />}
        {t.kind === 'build' && <BuildTask t={t} {...props} />}
        {t.kind === 'unequal' && <UnequalTask t={t} {...props} />}
      </div>
    </Scene>
  )
}
