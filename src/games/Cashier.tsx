import { useEffect, useRef, useState } from 'react'
import { Eraser, HandCoins } from 'lucide-react'
import type { Grade } from '../data/types'
import { gcd, pick, randInt, shuffle } from '../lib/random'
import { sfx } from '../lib/feedback'
import { fmt } from '../lib/format'
import { Money } from '../components/Visual'
import { Hud, starsFor, useCountdown, type GameProps } from './kit'

/** Tüm tutarlar kuruş cinsinden tam sayıdır */
interface Item { emoji: string; name: string; price: number }
interface Customer { who: string; items: Item[]; total: number; paid: number[]; change: number }

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
  3: [5, 10, 25, 50, 100, 500, 1000, 2000],
  4: [100, 500, 1000, 2000, 5000, 10000, 20000],
}

const CUSTOMERS = 6
const BONUS_SECONDS = 30
const MAX_TRIES = 3
const TRAY_MAX = 20

/** 1250 → "12,50 TL", 1300 → "13 TL", 35 → "35 kr" */
const tl = (k: number) => (k < 100 && k % 100 !== 0 ? `${k} kr` : k % 100 === 0 ? `${fmt(k / 100)} TL` : `${fmt(Math.floor(k / 100))},${String(k % 100).padStart(2, '0')} TL`)
const short = (k: number) => (k % 100 === 0 ? fmt(k / 100) : `${fmt(Math.floor(k / 100))},${String(k % 100).padStart(2, '0')}`)

/** Tutarı TL olarak toplam fiyata bölüştürür */
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

function makeCustomer(grade: Grade, who: string): Customer {
  for (let t = 0; t < 500; t++) {
    let prices: number[]
    let paid: number[] = []
    if (grade === 1) {
      const total = randInt(4, 20) * 100
      prices = split(total, total >= 600 && Math.random() < 0.5 ? 2 : 1, 100)
    } else if (grade === 2) {
      prices = Array.from({ length: randInt(1, 3) }, () => randInt(2, 40) * 100)
      const total = prices.reduce((a, b) => a + b, 0)
      const notes = [2000, 5000, 10000].filter((v) => v > total)
      if (!notes.length) continue
      paid = [Math.random() < 0.75 ? notes[0] : pick(notes)]
    } else if (grade === 3) {
      prices = Array.from({ length: randInt(1, 3) }, () => randInt(0, 12) * 100 + pick([0, 5, 10, 25, 35, 40, 50, 60, 75, 90, 95]))
      if (prices.some((p) => p < 50)) continue
      const total = prices.reduce((a, b) => a + b, 0)
      if (total % 100 === 0) continue
      const notes = [1000, 2000, 5000].filter((v) => v > total)
      if (!notes.length) continue
      paid = [notes[0]]
    } else {
      prices = Array.from({ length: randInt(1, 3) }, () => randInt(15, 380) * 100)
      const total = prices.reduce((a, b) => a + b, 0)
      if (total < 10000 || total > 95000 || total % 10000 === 0) continue
      let sum = Math.ceil(total / 10000) * 10000 + (Math.random() < 0.3 ? 10000 : 0)
      if (sum > 100000) sum = Math.ceil(total / 10000) * 10000
      paid = [...Array(Math.floor(sum / 20000)).fill(20000), ...(sum % 20000 ? [10000] : [])]
    }
    const pool = shuffle(grade === 4 ? BIG : CHEAP)
    const items = prices.map((price, i) => ({ emoji: pool[i][0], name: pool[i][1], price }))
    const total = prices.reduce((a, b) => a + b, 0)
    const paidSum = paid.reduce((a, b) => a + b, 0)
    return { who, items, total, paid, change: grade === 1 ? total : paidSum - total }
  }
  return { who, items: [{ emoji: '🍎', name: 'Elma', price: 700 }], total: 700, paid: grade === 1 ? [] : [1000], change: grade === 1 ? 700 : 300 }
}

/** En az kaç parayla ödenebilir (dinamik programlama) */
function minPieces(amount: number, denoms: number[]): number {
  const g = denoms.reduce((a, b) => gcd(a, b))
  const n = amount / g
  const ds = denoms.map((d) => d / g)
  const dp = new Array<number>(n + 1).fill(Infinity)
  dp[0] = 0
  for (let i = 1; i <= n; i++) for (const d of ds) if (d <= i && dp[i - d] + 1 < dp[i]) dp[i] = dp[i - d] + 1
  return dp[n]
}

/** Büyükten küçüğe açgözlü ayrıştırma (bu para birimlerinde en azı verir) */
const greedy = (amount: number, denoms: number[]) => {
  const out: number[] = []
  let rest = amount
  for (const d of [...denoms].sort((a, b) => b - a)) while (rest >= d) { out.push(d); rest -= d }
  return out
}

/** Para üstünü ileri sayarak bulma: 37 → 40 → 50 */
function countUp(from: number, to: number) {
  const marks = [from]
  let cur = from
  for (const unit of [100, 1000, 10000]) {
    const nx = Math.ceil(cur / unit) * unit
    if (nx > cur && nx < to) {
      marks.push(nx)
      cur = nx
    }
  }
  marks.push(to)
  const parts = marks.slice(1).map((m, i) => m - marks[i])
  return `${marks.map(short).join(' → ')}: ${parts.length > 1 ? `${parts.map(tl).join(' + ')} = ` : ''}${tl(to - from)}`
}

const insightFor = (grade: Grade) =>
  grade === 1
    ? 'Aynı tutarı farklı paralarla oluşturabilirsin: 15 TL = 10 + 5 = 5 + 5 + 5. Hangisi daha az para kullanır?'
    : 'Para üstünü bulurken tutardan ödenen paraya doğru ileri saymak (37 → 40 → 50) çıkarma yapmanın akıllı bir yoludur. Sen hangi yolu kullandın?'

export default function Cashier({ grade, onFinish }: GameProps) {
  const denoms = DENOMS[grade] ?? DENOMS[2]
  const [queue] = useState(() => shuffle(PEOPLE).slice(0, CUSTOMERS).map((w) => makeCustomer(grade, w)))
  const [idx, setIdx] = useState(0)
  const [tray, setTray] = useState<number[]>([])
  const [phase, setPhase] = useState<'serve' | 'happy' | 'reveal'>('serve')
  const [miss, setMiss] = useState(0)
  const [totalMiss, setTotalMiss] = useState(0)
  const [good, setGood] = useState(0)
  const [score, setScore] = useState(0)
  const [msg, setMsg] = useState<{ text: string; sub?: string; tone: 'ok' | 'bad' | 'info'; k: number } | null>(null)
  const [shake, setShake] = useState(false)
  const finished = useRef(false)
  const { left, reset } = useCountdown(BONUS_SECONDS, phase === 'serve', () => {})
  const c = queue[idx]
  const sum = tray.reduce((a, b) => a + b, 0)

  const add = (v: number) => {
    if (phase !== 'serve') return
    if (tray.length >= TRAY_MAX) return setMsg({ text: 'Tepsi doldu! Daha büyük paralar kullanmayı dene.', tone: 'info', k: Date.now() })
    setTray([...tray, v].sort((a, b) => b - a))
  }
  const remove = (i: number) => {
    if (phase !== 'serve') return
    setTray(tray.filter((_, j) => j !== i))
  }

  const give = () => {
    if (phase !== 'serve') return
    if (!tray.length) return setMsg({ text: 'Önce kasadaki paralara dokunarak tepsiye para koy.', tone: 'info', k: Date.now() })
    if (sum === c.change) {
      sfx.ok()
      const fewest = tray.length === minPieces(c.change, denoms)
      const bonus = Math.ceil(left / 6)
      setScore(score + Math.max(4, 10 - 3 * miss) + bonus + (fewest ? 2 : 0))
      setGood(good + 1)
      setMsg({
        text: `Doğru! ${grade === 1 ? `${tray.map(short).join(' + ')} = ${tl(sum)}` : `Para üstü ${tl(c.change)}.`}${bonus ? ` Hız bonusu +${bonus}` : ''}`,
        sub: grade === 1 ? (fewest ? 'En az parayla hazırladın! +2' : undefined) : `${countUp(c.total, c.total + c.change)}${fewest ? ' · En az parayla verdin! +2' : ''}`,
        tone: 'ok',
        k: Date.now(),
      })
      setPhase('happy')
      return
    }
    sfx.bad()
    setShake(true)
    setTimeout(() => setShake(false), 450)
    setTotalMiss(totalMiss + 1)
    const diff = Math.abs(sum - c.change)
    const what = grade === 1 ? 'tutar' : 'para üstü'
    if (miss + 1 >= MAX_TRIES) {
      setMsg({
        text: `Doğru ${what} ${tl(c.change)} olmalıydı. Sen ${tl(sum)} hazırladın.`,
        sub: grade === 1 ? `Örneğin: ${greedy(c.change, denoms).map(short).join(' + ')} = ${tl(c.change)}` : countUp(c.total, c.total + c.change),
        tone: 'bad',
        k: Date.now(),
      })
      setPhase('reveal')
      return
    }
    setMiss(miss + 1)
    setMsg({
      text: `Sen ${tl(sum)} hazırladın: ${sum < c.change ? `${tl(diff)} eksik.` : `${tl(diff)} fazla.`}`,
      sub: grade === 1 ? `Toplam ${tl(c.total)} olmalı.` : `Para üstü = ${tl(c.total + c.change)} − ${tl(c.total)}. Tutardan ödenen paraya doğru ileri saymayı dene!`,
      tone: 'bad',
      k: Date.now(),
    })
  }

  const next = () => {
    if (idx + 1 >= CUSTOMERS) {
      if (finished.current) return
      finished.current = true
      onFinish({
        stars: starsFor((good - totalMiss * 0.2) / CUSTOMERS),
        score,
        summary: grade === 1 ? `${CUSTOMERS} müşterinin ${good} tanesine tam tutarı hazırladın.` : `${CUSTOMERS} müşterinin ${good} tanesine doğru para üstü verdin.`,
        insight: insightFor(grade),
      })
      return
    }
    setIdx(idx + 1)
    setTray([])
    setMiss(0)
    setMsg(null)
    reset()
    setPhase('serve')
  }

  useEffect(() => {
    if (phase !== 'happy') return
    const t = setTimeout(next, 2200)
    return () => clearTimeout(t)
  }, [phase])

  const tone = (t: 'ok' | 'bad' | 'info') => (t === 'ok' ? 'bg-ok-soft text-green-800 ring-green-200' : t === 'bad' ? 'bg-orange-50 text-orange-800 ring-orange-200' : 'bg-white text-ink ring-line')
  const waiting = queue.slice(idx + 1).map((q) => q.who)

  return (
    <div className="animate-fade-up">
      <Hud
        round={idx + 1}
        rounds={CUSTOMERS}
        score={score}
        seconds={phase === 'serve' ? left : undefined}
        extra={waiting.length > 0 && <span className="chip bg-white px-3 py-1.5 text-sm ring-1 ring-line" aria-label={`Sırada ${waiting.length} müşteri var`}>Sırada: <span aria-hidden>{waiting.join('')}</span></span>}
      />

      <div className="card mb-3 p-3">
        <div className="flex items-start gap-3">
          <span className="shrink-0 text-5xl" aria-hidden>{phase === 'happy' ? '😃' : c.who}</span>
          <div className="min-w-0 flex-1 rounded-2xl bg-cream p-3 font-mono ring-1 ring-amber-200">
            <p className="text-center text-xs font-extrabold tracking-widest text-amber-800 uppercase">Fiş</p>
            <ul className="mt-1 space-y-0.5 text-sm font-bold">
              {c.items.map((it, i) => (
                <li key={i} className="flex items-baseline gap-1">
                  <span aria-hidden>{it.emoji}</span>
                  <span className="truncate font-sans">{it.name}</span>
                  <span className="flex-1 border-b border-dotted border-amber-300" />
                  <span className="shrink-0 tabular-nums">{tl(it.price)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 flex justify-between border-t-2 border-dashed border-amber-300 pt-1 font-sans text-base font-black">
              <span>Toplam</span><span className="tabular-nums">{tl(c.total)}</span>
            </p>
          </div>
        </div>
        {c.paid.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm font-extrabold text-ink-soft">Müşterinin verdiği:</span>
            {c.paid.map((v, i) => <Money key={i} value={v / 100} small />)}
          </div>
        )}
      </div>

      <p className="mb-2 text-center text-base font-extrabold">
        {grade === 1 ? <>Cüzdandan tam <span className="text-brand">{tl(c.total)}</span> hazırla!</> : 'Para üstünü hazırla!'}
      </p>

      <div className={`min-h-24 rounded-3xl border-2 border-dashed border-line bg-white/70 p-2 ${shake ? 'animate-shake' : ''}`} aria-label="Tepsi">
        {tray.length ? (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {tray.map((v, i) => (
              <button key={`${i}-${v}`} type="button" onClick={() => remove(i)} disabled={phase !== 'serve'} className="rounded-full animate-pop" aria-label={`${tl(v)} geri al`}>
                <Money value={v / 100} small />
              </button>
            ))}
          </div>
        ) : (
          <p className="grid h-20 place-items-center text-center text-sm font-bold text-ink-soft">Tepsi boş. Aşağıdaki paralara dokun; geri almak için tepsidekine dokun.</p>
        )}
      </div>

      {msg && (
        <div key={msg.k} className={`mx-auto mt-3 w-fit max-w-full rounded-2xl px-4 py-2 text-center ring-1 animate-pop ${tone(msg.tone)}`} aria-live="polite">
          <p className="text-base font-extrabold">{msg.text}</p>
          {msg.sub && <p className="text-sm font-bold opacity-90">{msg.sub}</p>}
        </div>
      )}

      <div className="mt-3 rounded-3xl bg-slate-100 p-3 ring-1 ring-line">
        <p className="mb-2 text-center text-xs font-extrabold tracking-wide text-ink-soft uppercase">{grade === 1 ? 'Cüzdan' : 'Kasa'}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {denoms.map((v) => <Money key={v} value={v / 100} small onClick={() => add(v)} />)}
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {phase === 'reveal' ? (
          <button type="button" onClick={next} className="btn-primary min-w-56" autoFocus>{idx + 1 >= CUSTOMERS ? 'Sonuçları gör' : 'Sonraki müşteri'}</button>
        ) : (
          <>
            <button type="button" onClick={() => setTray([])} disabled={phase !== 'serve' || !tray.length} className="btn-ghost"><Eraser size={18} />Temizle</button>
            <button type="button" onClick={give} disabled={phase !== 'serve'} className="btn-primary min-w-36"><HandCoins size={20} />Ver</button>
          </>
        )}
      </div>
    </div>
  )
}
