import { useRef, useState } from 'react'
import { ArrowRight, Eraser, HandCoins, HelpCircle, RefreshCw } from 'lucide-react'
import type { Grade, ManipulativeConfig, ManipulativeTool } from '../data/types'
import { gcd, pick, randInt, shuffle } from '../lib/random'
import { fmt } from '../lib/format'
import { Money } from '../components/Visual'
import { Plane, usePlane } from '../interactive/Plane'
import { useTracker } from '../lib/trackerContext'
import { starsFor, type GameProps } from './kit'
import { LevelDots, Nudge, Scene, SolutionList, StrategyPicker, TaskCard, useSolutions } from './kit2'

/**
 * Bakkal Kasası (Van de Walle):
 *  1) Önce tahmin: fişin toplamı gizli; öğrenci yuvarlayarak/karşılaştırarak tahmin eder.
 *  2) Sonra oluştur: 1. sınıf tutarı, 2–4. sınıf para üstünü hazırlar. Her para, açık sayı
 *     doğrusunda fişten ödenen paraya doğru bir "ileri sayma" zıplaması olarak görünür.
 *  3) Farklı para birleşimleri ayrı çözüm sayılır; bir müşteri "en az parayla" meydan okumasıdır.
 * Tüm tutarlar kuruş cinsinden tam sayıdır.
 */

interface Item { emoji: string; name: string; price: number }
type EstKind = 'compare' | 'round' | 'change'
interface Estimate { kind: EstKind; text: string; choices: string[]; answer: number; ref: number }
interface Customer {
  who: string
  items: Item[]
  total: number
  paid: number[]
  paidSum: number
  /** Sayı doğrusunda başlangıç ve bitiş (1. sınıf: 0 → toplam, diğerleri: toplam → ödenen) */
  start: number
  end: number
  target: number
  est: Estimate
}
interface Msg { q: string; tone: 'think' | 'ok'; mis?: string; tool?: ManipulativeTool; cfg?: ManipulativeConfig; k: number }

const CHEAP: [string, string][] = [
  ['🍎', 'Elma'], ['🍌', 'Muz'], ['🥛', 'Süt'], ['🍞', 'Ekmek'], ['🥚', 'Yumurta'], ['🧃', 'Meyve suyu'], ['🍫', 'Çikolata'],
  ['🍬', 'Şeker'], ['✏️', 'Kalem'], ['📒', 'Defter'], ['🧀', 'Peynir'], ['🍪', 'Kurabiye'], ['🧁', 'Kek'], ['🍉', 'Karpuz'],
]
const BIG: [string, string][] = [
  ['👟', 'Ayakkabı'], ['🎒', 'Okul çantası'], ['⚽', 'Futbol topu'], ['🧸', 'Oyuncak ayı'], ['📚', 'Kitap seti'],
  ['🎧', 'Kulaklık'], ['🧥', 'Mont'], ['🎲', 'Kutu oyunu'], ['🛹', 'Kaykay'], ['🪁', 'Uçurtma'],
]
const PEOPLE = ['👧', '👦', '👩', '👨', '👵', '👴', '🧑', '👱‍♀️', '🧔', '👩‍🦱']

const DENOMS: Record<number, number[]> = {
  1: [100, 500, 1000, 2000],
  2: [100, 500, 1000, 2000, 5000],
  3: [5, 10, 25, 50, 100, 500, 1000],
  4: [100, 500, 1000, 2000, 5000, 10000],
}

const CUSTOMERS = 6
const TRAY_MAX = 20
const GOAL = 2

/** 1250 → "12,50 TL", 1300 → "13 TL", 35 → "35 kr" */
const tl = (k: number) => (k < 100 && k % 100 !== 0 ? `${k} kr` : k % 100 === 0 ? `${fmt(k / 100)} TL` : `${fmt(Math.floor(k / 100))},${String(k % 100).padStart(2, '0')} TL`)
const short = (k: number) => (k % 100 === 0 ? fmt(k / 100) : `${fmt(Math.floor(k / 100))},${String(k % 100).padStart(2, '0')}`)
const roundTo = (v: number, u: number) => Math.round(v / u) * u
const sumOf = (a: number[]) => a.reduce((s, x) => s + x, 0)
const keyOf = (a: number[]) => [...a].sort((x, y) => y - x).join(',')
const labelOf = (a: number[]) => `${[...a].sort((x, y) => y - x).map(tl).join(' + ')} (${a.length} para)`

/** En az kaç parayla oluşturulur (dinamik programlama) */
function minPieces(amount: number, denoms: number[]): number {
  const g = denoms.reduce((a, b) => gcd(a, b))
  const n = amount / g
  const ds = denoms.map((d) => d / g)
  const dp = new Array<number>(n + 1).fill(Infinity)
  dp[0] = 0
  for (let i = 1; i <= n; i++) for (const d of ds) if (d <= i && dp[i - d] + 1 < dp[i]) dp[i] = dp[i - d] + 1
  return dp[n]
}

/** Tepside, tek bir büyük parayla değiştirilebilecek birkaç küçük para bulur */
function mergeHint(tray: number[], denoms: number[]): { parts: number[]; into: number } | null {
  const sorted = [...tray].sort((a, b) => b - a)
  for (const D of [...denoms].sort((a, b) => b - a)) {
    const small = sorted.filter((v) => v < D)
    const pickSet: number[] = []
    const dfs = (i: number, rest: number): boolean => {
      if (rest === 0) return pickSet.length >= 2
      for (let j = i; j < small.length; j++) {
        if (small[j] > rest || (j > i && small[j] === small[j - 1])) continue
        pickSet.push(small[j])
        if (dfs(j + 1, rest - small[j])) return true
        pickSet.pop()
      }
      return false
    }
    if (dfs(0, D)) return { parts: [...pickSet], into: D }
  }
  return null
}

/** Tutarı birime göre fiyatlara bölüştürür */
function split(total: number, n: number, unit: number): number[] {
  const parts: number[] = []
  let rest = total
  for (let i = n; i > 1; i--) {
    const max = rest - (i - 1) * unit
    const p = Math.round(randInt(unit, Math.max(unit, Math.floor(max / unit) * unit)) / unit) * unit
    parts.push(p)
    rest -= p
  }
  parts.push(rest)
  return parts
}

function roundChoices(r: number, u: number): { choices: string[]; answer: number } {
  const vals = r - u > 0 ? [r - u, r, r + u] : [r, r + u, r + 2 * u]
  return { choices: vals.map(tl), answer: vals.indexOf(r) }
}

function makeEstimate(grade: Grade, i: number, total: number, paidSum: number): Estimate | null {
  if (grade === 1) {
    if (total === 1000) return null
    return { kind: 'compare', text: 'Önce tahmin et: Toplam 10 TL’den az mı, çok mu?', choices: ['10 TL’den az', '10 TL’den çok'], answer: total > 1000 ? 1 : 0, ref: 1000 }
  }
  const u = grade === 3 ? 100 : 1000
  const kind: EstKind = grade === 4 ? (i % 2 ? 'change' : 'round') : i % 2 ? 'round' : 'compare'
  if (kind === 'compare') {
    let R = roundTo(total, u)
    if (R === total) R += u
    const word = tl(R)
    return { kind, text: `Önce tahmin et: Toplam ${word}’den az mı, çok mu?`, choices: [`${word}’den az`, `${word}’den çok`], answer: total > R ? 1 : 0, ref: R }
  }
  if (kind === 'round') {
    if (total % u === u / 2 || total % u === 0) return null
    const r = roundTo(total, u)
    return { kind, text: `Önce tahmin et: Toplam yaklaşık kaç TL? ${grade === 3 ? 'En yakın tam lirayı' : 'En yakın onluğu'} seç.`, ...roundChoices(r, u), ref: r }
  }
  const change = paidSum - total
  if (change % u === u / 2 || change % u === 0 || change < 2 * u) return null
  const r = roundTo(change, u)
  return { kind, text: `Önce tahmin et: Müşteri ${tl(paidSum)} verecek. Para üstü yaklaşık kaç TL olur?`, ...roundChoices(r, u), ref: r }
}

function makeCustomer(grade: Grade, who: string, i: number): Customer {
  for (let t = 0; t < 800; t++) {
    let prices: number[]
    let paid: number[] = []
    if (grade === 1) {
      const total = randInt(6, 20) * 100
      prices = split(total, total >= 600 && Math.random() < 0.55 ? 2 : 1, 100)
    } else if (grade === 2) {
      prices = Array.from({ length: randInt(1, 3) }, () => randInt(2, 35) * 100)
      const total = sumOf(prices)
      const notes = [2000, 5000, 10000].filter((v) => v > total)
      if (!notes.length || notes[0] - total < 300) continue
      paid = [Math.random() < 0.75 ? notes[0] : pick(notes)]
    } else if (grade === 3) {
      prices = Array.from({ length: randInt(1, 2) }, () => randInt(1, 9) * 100 + pick([0, 25, 50, 75, 10, 40, 60, 90, 35, 65]))
      const total = sumOf(prices)
      if (total % 100 === 0) continue
      const notes = [1000, 2000].filter((v) => v > total)
      if (!notes.length || notes[0] - total < 150) continue
      paid = [notes[0]]
    } else {
      prices = Array.from({ length: randInt(2, 3) }, () => randInt(8, 190) * 100)
      const total = sumOf(prices)
      if (total < 10000 || total > 45000 || total % 10000 === 0) continue
      let sum = Math.ceil(total / 10000) * 10000
      if (sum - total < 1500) sum += 10000
      paid = [...Array(Math.floor(sum / 20000)).fill(20000), ...(sum % 20000 ? [10000] : [])]
    }
    const total = sumOf(prices)
    const paidSum = sumOf(paid)
    const est = makeEstimate(grade, i, total, paidSum)
    if (!est) continue
    const pool = shuffle(grade === 4 ? BIG : CHEAP)
    const items = prices.map((price, j) => ({ emoji: pool[j][0], name: pool[j][1], price }))
    return grade === 1
      ? { who, items, total, paid, paidSum, start: 0, end: total, target: total, est }
      : { who, items, total, paid, paidSum, start: total, end: paidSum, target: paidSum - total, est }
  }
  const est: Estimate = { kind: 'compare', text: 'Önce tahmin et: Toplam 10 TL’den az mı, çok mu?', choices: ['10 TL’den az', '10 TL’den çok'], answer: 0, ref: 1000 }
  return grade === 1
    ? { who, items: [{ emoji: '🍎', name: 'Elma', price: 700 }], total: 700, paid: [], paidSum: 0, start: 0, end: 700, target: 700, est }
    : { who, items: [{ emoji: '🍎', name: 'Elma', price: 700 }], total: 700, paid: [2000], paidSum: 2000, start: 700, end: 2000, target: 1300, est }
}

/** Sayı doğrusundaki ileri sayma zıplamaları (tepsideki paralar, konma sırasıyla) */
function Jumps({ start, end, pieces, g1 }: { start: number; end: number; pieces: number[]; g1: boolean }) {
  const P = usePlane()
  const y0 = P.height * 0.58
  const X = (k: number) => P.sx(k / 100)
  let cur = start
  const arcs = pieces.map((p) => {
    const a = cur
    cur += p
    return { a, b: cur, p, over: cur > end }
  })
  const pill = (x0: number, text: string, fill: string) => {
    const w = 12 + text.length * 7.2
    const x = Math.min(P.width - w / 2 - 2, Math.max(w / 2 + 2, x0))
    return (
      <g>
        <rect x={x - w / 2} y={P.height - 22} width={w} height={20} rx={10} fill={fill} />
        <text x={x} y={P.height - 8} textAnchor="middle" fontSize={12} fontWeight={900} fill="#fff">{text}</text>
      </g>
    )
  }
  return (
    <g>
      <line x1={X(start)} x2={X(start)} y1={y0 - 16} y2={y0 + 12} stroke="#0e7490" strokeWidth={4} strokeLinecap="round" />
      <line x1={X(end)} x2={X(end)} y1={y0 - 16} y2={y0 + 12} stroke="#db2777" strokeWidth={4} strokeLinecap="round" />
      {pill(X(start), g1 ? '0' : `Fiş ${short(start)}`, '#0e7490')}
      {pill(X(end), g1 ? `Hedef ${short(end)}` : `Ödenen ${short(end)}`, '#db2777')}
      {arcs.map(({ a, b, p, over }, i) => {
        const x1 = X(a), x2 = X(b)
        const w = Math.abs(x2 - x1)
        const h = Math.min(28, Math.max(10, w * 0.3))
        const col = over ? '#ea580c' : '#0891b2'
        return (
          <g key={i}>
            <path d={`M${x1} ${y0 - 3} Q${(x1 + x2) / 2} ${y0 - 3 - 2 * h} ${x2} ${y0 - 3}`} fill="none" stroke={col} strokeWidth={2.5} />
            <path d={`M${x2} ${y0 - 3} l-6 -5 M${x2} ${y0 - 3} l1 -8`} stroke={col} strokeWidth={2.5} strokeLinecap="round" />
            {w >= 22 && (
              <text x={(x1 + x2) / 2} y={y0 - h - 8} textAnchor="middle" fontSize={12} fontWeight={900} fill={col} stroke="#fff" strokeWidth={3} paintOrder="stroke">+{short(p)}</text>
            )}
          </g>
        )
      })}
      {pieces.length > 0 && <circle cx={X(cur)} cy={y0} r={7} fill={cur > end ? '#ea580c' : cur === end ? '#16a34a' : '#0891b2'} stroke="#fff" strokeWidth={2.5} />}
    </g>
  )
}

/** Dokunmaya uygun para düğmesi */
function MoneyBtn({ v, onClick, label, disabled, big }: { v: number; onClick: () => void; label: string; disabled?: boolean; big: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className={`grid place-items-center rounded-2xl p-1 transition hover:bg-white/80 active:scale-95 disabled:opacity-40 ${big ? 'min-h-14 min-w-14' : 'min-h-12 min-w-12'}`}>
      <Money value={v / 100} small />
    </button>
  )
}

const EST_OPTS = ['Onluğa yuvarladım', 'Önce büyük fiyatları topladım', 'Tam hesapladım']
const EST_OPTS_G1 = ['10’a tamamlamayı düşündüm', 'Önce büyük fiyata baktım', 'Tek tek saydım']
const EST_OPTS_G3 = ['Tam liraya yuvarladım', 'Önce liraları, sonra kuruşları topladım', 'Tam hesapladım']
const CH_OPTS = ['Fişten ileri saydım', 'Çıkarma yaptım', 'Önce yuvarlak sayıya tamamladım', 'Paraları deneyerek ekledim']
const G1_OPTS = ['Önce en büyük parayı koydum', '5’er ya da 10’ar saydım', 'Deneyerek ekledim']

const insightFor = (grade: Grade) =>
  grade === 1
    ? 'Aynı tutarı farklı paralarla oluşturabilirsin: 15 TL = 10 + 5 = 5 + 5 + 5. Büyük paralar kullanınca daha az para gerekir.'
    : 'Para üstünü bulmak için fişten müşterinin verdiği paraya doğru ileri saydın: önce yuvarlak bir sayıya tamamla, sonra büyük adımlarla ilerle (37 → 40 → 50). Önce tahmin etmek, sonucun mantıklı olup olmadığını kontrol etmeni sağladı.'

export default function Cashier({ grade, onFinish }: GameProps) {
  const g1 = grade === 1
  const big = grade <= 3
  const denoms = DENOMS[grade] ?? DENOMS[2]
  const roundUnit = grade === 3 ? 100 : 1000
  const track = useTracker()
  const sol = useSolutions()
  const [queue] = useState(() => shuffle(PEOPLE).slice(0, CUSTOMERS).map((w, i) => makeCustomer(grade, w, i)))
  const [challengeAt] = useState(() => randInt(2, 4))
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<'estimate' | 'build'>('estimate')
  const [estWrong, setEstWrong] = useState<number[]>([])
  const [estDone, setEstDone] = useState(false)
  const [tray, setTray] = useState<number[]>([])
  const [locked, setLocked] = useState(false)
  const [solved, setSolved] = useState(false)
  const [chalDone, setChalDone] = useState(false)
  const [msg, setMsg] = useState<Msg | null>(null)
  const st = useRef({ misses: 0, inferred: false, score: 0, firstTries: 0, estFirst: 0, solutions: 0, over: false })
  const nk = useRef(0)

  const c = queue[idx]
  const challenge = idx === challengeAt
  const minP = minPieces(c.target, denoms)
  const sum = sumOf(tray)
  const pos = c.start + sum
  const R = g1 ? 1000 : roundUnit

  const say = (q: string, tone: Msg['tone'] = 'think', extra: Partial<Msg> = {}) => setMsg({ q, tone, k: ++nk.current, ...extra })

  // ── 1) Tahmin ──
  const chooseEst = (i: number) => {
    if (estDone || estWrong.includes(i)) return
    const e = c.est
    const ok = i === e.answer
    track.attempt(ok)
    if (!ok) {
      setEstWrong([...estWrong, i])
      const p0 = c.items[0].price
      if (e.kind === 'compare' && g1) {
        const q = c.items.length === 2
          ? `${tl(c.items[0].price)}’ye kaç TL eklersen 10 TL olur? Diğer fiyat (${tl(c.items[1].price)}) bundan büyük mü, küçük mü?`
          : `${tl(p0)}, sayı doğrusunda 10’dan önce mi geliyor, sonra mı?`
        return say(q, 'think', { tool: 'numberline', cfg: { min: 0, max: 20, step: 1 } })
      }
      if (e.kind === 'compare') {
        return say(grade === 3
          ? `Önce liraları topla, sonra kuruşları. Kuruşlar birleşince 1 lirayı geçiyor mu? Toplam ${tl(e.ref)}’ye göre nerede kalıyor?`
          : `Her fiyatı en yakın onluğa yuvarlayıp topla. Yuvarlarken yukarı mı, aşağı mı gittin? Toplam ${tl(e.ref)}’ye göre nerede kalıyor?`)
      }
      if (e.kind === 'round') {
        return say(`Her fiyatı ${grade === 3 ? 'en yakın tam liraya' : 'en yakın onluğa'} yuvarla (ör. ${tl(p0)} → ${tl(roundTo(p0, roundUnit))}). Yuvarlak sayıları topla: hangi seçenek buna en yakın?`)
      }
      return say(`Önce toplamı yaklaşık bul: fiyatları onluğa yuvarlayıp topla. Sonra o sayıdan ${tl(c.paidSum)}’ye kadar ileri say. Hangi seçenek en yakın?`)
    }
    if (!estWrong.length) {
      st.current.estFirst++
      st.current.score += 3
    }
    setEstDone(true)
    const e2 = c.est
    const text =
      e2.kind === 'compare'
        ? `Doğru tahmin! Gerçek toplam ${tl(c.total)}; gerçekten de ${tl(e2.ref)}’den ${c.total < e2.ref ? 'az' : 'çok'}.`
        : e2.kind === 'round'
          ? `Güzel tahmin! Gerçek toplam ${tl(c.total)}; tahminin ${tl(e2.ref)} buna çok yakın (${tl(Math.abs(c.total - e2.ref))} fark).`
          : `Güzel tahmin! Gerçek toplam ${tl(c.total)}. Şimdi para üstünü tam bul: sonuç ${tl(e2.ref)} civarında çıkmalı.`
    say(text, 'ok')
  }

  const toBuild = () => {
    setPhase('build')
    setMsg(null)
  }

  // ── 2) Para hazırla ──
  const add = (v: number) => {
    if (locked) return
    if (tray.length >= TRAY_MAX) return say('Tepside yer kalmadı! Daha büyük paralar kullanmayı düşün.')
    setTray([...tray, v])
    if (msg?.tone === 'think') setMsg(null)
  }
  const remove = (i: number) => {
    if (locked) return
    setTray(tray.filter((_, j) => j !== i))
  }

  const inferStrategy = () => {
    if (st.current.inferred) return
    st.current.inferred = true
    const desc = tray.every((v, i) => i === 0 || v <= tray[i - 1])
    if (!g1 && c.start % R !== 0 && (c.start + tray[0]) % R === 0 && tray.length > 1) track.strategy('İleri sayma (tamamlama)')
    else if (desc) track.strategy('Büyük paralarla başlama')
    else track.strategy('Paraları deneyerek ekleme')
  }

  const give = () => {
    if (locked) return
    if (!tray.length) return say('Önce kasadaki paralara dokunarak tepsiye para koy.')
    const what = g1 ? 'tutar' : 'para üstü'
    if (sum === c.target) {
      const key = keyOf(tray)
      if (sol.list.some((s) => s.key === key)) {
        return say(`Bu yolu zaten buldun! Aynı ${what}ı başka paralarla oluşturabilir misin? Örneğin bir büyük parayı küçüklere bölebilirsin.`)
      }
      track.attempt(true)
      if (st.current.misses === 0 && !solved) st.current.score += 3
      inferStrategy()
      sol.add(key, labelOf(tray))
      st.current.solutions++
      if (!solved) st.current.score += 10
      else if (sol.list.length < GOAL + 1) st.current.score += 4
      setSolved(true)
      if (challenge && !chalDone && tray.length > minP) {
        const h = mergeHint(tray, denoms)
        return say(
          `Tutar doğru, ${tray.length} para kullandın. Ama bu müşteri en az parayla istiyor! ${h ? `${h.parts.map(tl).join(' + ')} yerine tek bir ${tl(h.into)} kullanabilir misin?` : `En az ${minP} parayla olabilir. Daha büyük paralar dene.`}`,
        )
      }
      if (challenge && !chalDone) {
        setChalDone(true)
        st.current.score += 5
        track.strategy('En az parayla verme')
      }
      setLocked(true)
      const marks = [c.start]
      for (const v of tray) marks.push(marks[marks.length - 1] + v)
      const chain = marks.map(short).join(' → ')
      return say(
        g1
          ? `Tam ${tl(c.target)}! ${chain}. ${tray.length} para kullandın.${challenge ? ' En az parayla hazırladın! 🏅' : ''}`
          : `Para üstü ${tl(c.target)}. İleri sayınca: ${chain}.${challenge ? ' En az parayla verdin! 🏅' : c.est.kind === 'change' ? ` Tahminin ${tl(c.est.ref)} idi, sonuç mantıklı!` : ''}`,
        'ok',
      )
    }
    track.attempt(false)
    st.current.misses++
    if (g1) {
      return sum < c.target
        ? say(`${tl(sum)} hazırladın. ${tl(c.target)}’ye ulaşmak için daha ne kadar gerek? Sayı doğrusunda noktanın hedefe uzaklığına bak.`, 'think', { tool: 'money', cfg: { coins: [1, 5, 10, 20] } })
        : say(`${tl(sum)} hazırladın; bu ${tl(c.target)}’den fazla. Hangi parayı çıkarır ya da daha küçüğüyle değiştirirsin?`, 'think', { tool: 'money', cfg: { coins: [1, 5, 10, 20] } })
    }
    if (sum === c.paidSum) {
      return say(`Müşterinin verdiği parayı geri mi veriyoruz? Fiş ${tl(c.total)}, müşteri ${tl(c.paidSum)} verdi. Fazlası ne kadar?`, 'think', { mis: 'Ödenen parayı para üstü sandı' })
    }
    if (sum === c.total) {
      return say(`Bu, fişin tutarı! Para üstü, müşterinin verdiği paranın fişten fazlası. ${tl(c.total)}’den ${tl(c.paidSum)}’ye kadar ileri sayarsan kaç TL eder?`, 'think', { mis: 'Fiyatı para üstü sandı' })
    }
    if (sum < c.target) {
      return say(`Zıplamaların ${tl(pos)}’de kaldı; müşteri ${tl(c.paidSum)} verdi. Aradaki boşluğu hangi paralarla doldurabilirsin?`, 'think', st.current.misses >= 2 ? { tool: 'numberline', cfg: { min: Math.floor(c.start / 100), max: Math.ceil(c.end / 100), step: grade === 3 ? 0.25 : 1 } } : {})
    }
    return say(`Zıplamalar ${tl(c.paidSum)}’yi geçti ve ${tl(pos)}’ye vardı. Hangi parayı çıkarır ya da değiştirirsen tam ${tl(c.paidSum)}’de durursun?`)
  }

  const hint = () => {
    track.hint()
    if (g1) {
      const left = c.target - sum
      if (left <= 0) return say(`Şu an ${tl(sum)} var. Hedef ${tl(c.target)}. Fazla olan parayı bul.`)
      const bigFit = [...denoms].sort((a, b) => b - a).find((d) => d <= left)!
      return say(`${tl(left)} daha gerek. ${tl(left)}’yi geçmeyen en büyük para hangisi? ${bigFit !== left ? 'Onu koyup kalanına bak.' : ''}`)
    }
    if (pos >= c.end) return say(`Şu an ${tl(pos)}’desin, ${tl(c.end)}’yi geçtin ya da ulaştın. Tepsiyi kontrol et.`)
    const nr = Math.ceil((pos + 1) / R) * R
    if (nr < c.end) return say(`Şu an ${tl(pos)}’desin. ${tl(nr)}’ye kaç TL var? O kadar para koy, sonra ${tl(c.end)}’ye doğru büyük adımlarla ilerle.`)
    return say(`Şu an ${tl(pos)}’desin. ${tl(c.end)}’ye kaç TL var? Hangi paralarla bu kadar edersin?`)
  }

  const another = () => {
    setTray([])
    setLocked(false)
    setMsg(null)
  }

  const next = () => {
    const s = st.current
    const first = !estWrong.length && s.misses === 0
    track.item(first)
    if (first) s.firstTries++
    if (idx + 1 >= CUSTOMERS) {
      if (s.over) return
      s.over = true
      onFinish({
        stars: starsFor(s.score / (CUSTOMERS * 20)),
        score: s.score,
        summary: `${CUSTOMERS} müşteriye hizmet ettin: ${s.solutions} farklı ödeme yolu buldun, ${s.estFirst} tahminin ilk denemede yerindeydi.`,
        insight: insightFor(grade),
      })
      return
    }
    setIdx(idx + 1)
    setPhase('estimate')
    setEstWrong([])
    setEstDone(false)
    setTray([])
    setLocked(false)
    setSolved(false)
    setChalDone(false)
    setMsg(null)
    sol.reset()
    s.misses = 0
    s.inferred = false
  }

  const waiting = queue.slice(idx + 1).map((q) => q.who)
  const showTotal = estDone || phase === 'build'
  const estOpts = g1 ? EST_OPTS_G1 : grade === 3 ? EST_OPTS_G3 : EST_OPTS
  const span = Math.max(1, (c.end - c.start) / 100)
  const view = { xMin: c.start / 100 - span * 0.1, xMax: c.end / 100 + span * 0.22, yMin: -1, yMax: 1 }

  const task =
    phase === 'estimate'
      ? c.est.text
      : challenge && !chalDone
        ? g1 ? `🏅 Meydan okuma: ${tl(c.target)}’yi EN AZ sayıda parayla hazırla.` : '🏅 Meydan okuma: Para üstünü EN AZ sayıda parayla ver.'
        : !solved
          ? g1 ? `Kasaya tam ${tl(c.target)} koy.` : `Müşteri ${tl(c.paidSum)} verdi, fiş ${tl(c.total)}. Para üstünü hazırla.`
          : g1 ? `Harika! ${tl(c.target)}’yi başka paralarla da hazırlayabilir misin?` : 'Aynı para üstünü başka paralarla verebilir misin?'

  const btnH = big ? 'min-h-14' : 'min-h-12'

  return (
    <Scene grade={grade} className="animate-fade-up">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <LevelDots current={idx} total={CUSTOMERS} />
        <div className="flex flex-wrap gap-1.5">
          {waiting.length > 0 && (
            <span className="chip bg-white px-3 py-1.5 text-sm ring-1 ring-line" aria-label={`Sırada ${waiting.length} müşteri var`}>Sırada: <span aria-hidden>{waiting.join('')}</span></span>
          )}
          <span className="chip bg-amber-50 px-3 py-1.5 text-sm text-amber-800 ring-1 ring-amber-200">⭐ {st.current.score}</span>
        </div>
      </div>

      <TaskCard step={idx + 1} total={CUSTOMERS}>{task}</TaskCard>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-3">
          {/* Müşteri ve fiş */}
          <div className="rounded-3xl bg-white/95 p-3 ring-1 ring-line">
            <div className="flex items-start gap-3">
              <div className="shrink-0 text-center">
                <span className="block text-5xl sm:text-6xl" aria-hidden>{locked ? '😃' : c.who}</span>
                {challenge && <span className="mt-1 block text-xs font-black text-amber-700">🏅 en az para</span>}
              </div>
              <div className="min-w-0 flex-1 rounded-2xl bg-cream p-3 ring-1 ring-amber-200">
                <p className="text-center text-xs font-extrabold tracking-widest text-amber-800 uppercase">🧾 Fiş</p>
                <ul className="mt-1 space-y-1 text-base font-bold">
                  {c.items.map((it, i) => (
                    <li key={i} className="flex items-baseline gap-1.5">
                      <span aria-hidden>{it.emoji}</span>
                      <span className="truncate">{it.name}</span>
                      <span className="flex-1 border-b border-dotted border-amber-300" />
                      <span className="shrink-0 font-extrabold tabular-nums">{tl(it.price)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 flex items-center justify-between border-t-2 border-dashed border-amber-300 pt-1.5 text-lg font-black">
                  <span>Toplam</span>
                  {showTotal ? (
                    <span className="tabular-nums animate-pop">{tl(c.total)}</span>
                  ) : (
                    <span className="grid h-8 min-w-16 place-items-center rounded-lg bg-amber-200/70 px-2 text-amber-900" aria-label="Toplam gizli">?</span>
                  )}
                </p>
              </div>
            </div>
            {c.paid.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-emerald-50 p-2 ring-1 ring-emerald-200">
                <span className="text-sm font-extrabold text-emerald-900">Müşterinin verdiği:</span>
                {c.paid.map((v, i) => <Money key={i} value={v / 100} small />)}
                <span className="text-sm font-black text-emerald-900">= {tl(c.paidSum)}</span>
              </div>
            )}
          </div>

          {phase === 'build' && (
            <>
              <div>
                <p className="mb-1.5 text-center text-xs font-extrabold tracking-wide text-ink-soft uppercase">{g1 ? 'Sayı doğrusunda biriktir' : 'Fişten ödenen paraya ileri say'}</p>
                <Plane key={idx} initial={view} mode="x" minSpan={0.5} maxSpan={2000} label="Para üstü sayı doğrusu">
                  <Jumps start={c.start} end={c.end} pieces={tray} g1={g1} />
                </Plane>
              </div>

              <div className="rounded-3xl border-2 border-dashed border-cyan-300 bg-white/80 p-2" aria-label="Tepsi">
                <div className="mb-1 flex items-center justify-between px-1 text-xs font-extrabold text-ink-soft">
                  <span className="tracking-wide uppercase">Tepsi</span>
                  <span className="text-sm text-ink">{tray.length ? `${tray.length} para · ${tl(sum)}` : ''}</span>
                </div>
                {tray.length ? (
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    {tray.map((v, i) => (
                      <span key={`${i}-${v}`} className="animate-pop">
                        <MoneyBtn v={v} big={big} onClick={() => remove(i)} disabled={locked} label={`${tl(v)} geri al`} />
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="grid min-h-16 place-items-center text-center text-sm font-bold text-ink-soft">Kasadaki paralara dokun. Geri almak için tepsidekine dokun.</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="min-w-0 space-y-3">
          {phase === 'estimate' ? (
            <div className="rounded-3xl bg-white/95 p-3 ring-1 ring-line">
              <p className="mb-2 text-center text-xs font-extrabold tracking-wide text-ink-soft uppercase">🤔 Hesaplamadan tahmin et</p>
              <div className={`grid gap-2 ${c.est.choices.length === 3 ? 'grid-cols-3 lg:grid-cols-1' : 'grid-cols-2 lg:grid-cols-1'}`}>
                {c.est.choices.map((ch, i) => {
                  const ok = estDone && i === c.est.answer
                  const off = estWrong.includes(i)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => chooseEst(i)}
                      disabled={estDone || off}
                      className={`${btnH} rounded-2xl px-3 text-lg font-black ring-2 transition active:scale-95 ${ok ? 'bg-ok text-white ring-ok' : off ? 'bg-slate-100 text-slate-400 ring-slate-200' : 'bg-white text-ink ring-cyan-200 hover:bg-cyan-50'}`}
                    >
                      {ch}
                    </button>
                  )
                })}
              </div>
              {msg && <Nudge key={msg.k} question={msg.q} tone={msg.tone} misconception={msg.mis} tool={msg.tool} toolConfig={msg.cfg} />}
              {estDone && (idx === 0 || idx === 3) && <StrategyPicker key={`e${idx}`} question="Tahmin ederken nasıl düşündün?" options={estOpts} onPick={() => {}} />}
              {estDone && (
                <button type="button" onClick={toBuild} className={`btn-primary mt-3 w-full ${btnH}`} autoFocus>
                  {g1 ? 'Parayı hazırla' : 'Para üstünü hazırla'}<ArrowRight size={18} />
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-3xl bg-slate-100 p-2 ring-1 ring-line">
                <p className="mb-1 text-center text-xs font-extrabold tracking-wide text-ink-soft uppercase">{g1 ? '👛 Cüzdan' : '🗄️ Kasa'}</p>
                <div className="flex flex-wrap items-center justify-center gap-1">
                  {denoms.map((v) => <MoneyBtn key={v} v={v} big={big} onClick={() => add(v)} disabled={locked} label={`${tl(v)} ekle`} />)}
                </div>
              </div>

              {!locked && (
                <div className="grid grid-cols-[auto_auto_1fr] gap-2">
                  <button type="button" onClick={hint} className={`btn-ghost ${btnH} px-3`} aria-label="İpucu"><HelpCircle size={20} /></button>
                  <button type="button" onClick={() => setTray([])} disabled={!tray.length} className={`btn-ghost ${btnH} px-3`} aria-label="Tepsiyi temizle"><Eraser size={20} /></button>
                  <button type="button" onClick={give} className={`btn-primary ${btnH}`}><HandCoins size={20} />Ver</button>
                </div>
              )}

              {msg && <Nudge key={msg.k} question={msg.q} tone={msg.tone} misconception={msg.mis} tool={msg.tool} toolConfig={msg.cfg} />}

              {locked && (idx === 1 || idx === 4) && sol.list.length === 1 && (
                <StrategyPicker key={`c${idx}`} question={g1 ? 'Tutarı nasıl oluşturdun?' : 'Para üstünü nasıl buldun?'} options={g1 ? G1_OPTS : CH_OPTS} onPick={() => {}} />
              )}

              <SolutionList list={sol.list} goal={challenge ? undefined : GOAL} />
              {sol.list.length >= 2 && (
                <p className="rounded-2xl bg-white/90 px-3 py-2 text-sm font-extrabold text-ink ring-1 ring-line">🤔 Hangi yolda daha az para kullandın? Büyük paralar neden sayıyı azaltıyor?</p>
              )}

              {solved && (
                <div className="flex flex-wrap gap-2">
                  {locked && !challenge && (
                    <button type="button" onClick={another} className={`btn-ghost ${btnH} min-w-56 flex-1`}><RefreshCw size={18} />Başka bir şekilde ver</button>
                  )}
                  <button type="button" onClick={next} className={`btn-primary ${btnH} min-w-56 flex-1`}>
                    {idx + 1 >= CUSTOMERS ? 'Kasayı kapat' : 'Sonraki müşteri'}<ArrowRight size={18} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Scene>
  )
}
