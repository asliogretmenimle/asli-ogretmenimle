import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ConciergeBell } from 'lucide-react'
import type { Grade } from '../data/types'
import { pick, randInt, shuffle } from '../lib/random'
import { sfx } from '../lib/feedback'
import { MathText } from '../components/MathText'
import { Hud, starsFor, useCountdown, type GameProps } from './kit'

interface Topping { name: string; color: string; dot: string }
const TOPPINGS: Topping[] = [
  { name: 'sucuklu', color: '#fecaca', dot: '#b91c1c' },
  { name: 'mantarlı', color: '#ede0cc', dot: '#92400e' },
  { name: 'zeytinli', color: '#e5e7eb', dot: '#1f2937' },
  { name: 'biberli', color: '#bbf7d0', dot: '#15803d' },
  { name: 'mısırlı', color: '#fef08a', dot: '#ca8a04' },
  { name: 'domatesli', color: '#fecdd3', dot: '#e11d48' },
]
const CUSTOMERS = ['👧', '👦', '👩', '👨', '👵', '👴', '🧑', '👱‍♀️', '🧔', '👩‍🦱']

interface Order {
  num: number
  den: number
  pizzas: 1 | 2
  knives: number[]
  /** Konuşma balonundaki sipariş (MathText) */
  text: string
  /** Kesrin gösterimi: "[[3/4]]", "yarım" … */
  label: string
  topping: Topping
  who: string
}

const ORDERS = 6
const PATIENCE: Record<number, number> = { 2: 35, 3: 35, 4: 40, 5: 45 }

/** 2. sınıf: kelimelerle sipariş */
const WORDS: Record<string, { label: string; say: (t: string) => string }> = {
  '1/2': { label: 'yarım', say: (t) => `Pizzanın yarısı ${t} olsun lütfen!` },
  '1/4': { label: 'çeyrek', say: (t) => `Pizzanın çeyreği ${t} olsun lütfen!` },
  '3/4': { label: 'üç çeyrek', say: (t) => `Pizzanın üç çeyreği ${t} olsun lütfen!` },
  '1/1': { label: 'bütün', say: (t) => `Bütün pizza ${t} olsun lütfen!` },
}

function makeOrders(grade: Grade): Order[] {
  const tops = shuffle(TOPPINGS)
  const who = shuffle(CUSTOMERS)
  const base = (i: number) => ({ topping: tops[i % tops.length], who: who[i % who.length] })
  const frac = (n: number, d: number) => `[[${n}/${d}]]`
  if (grade === 2) {
    const keys = shuffle(['1/2', '1/4', '1/1', '1/2', '1/4', '3/4'])
    return keys.map((k, i) => {
      const [num, den] = k.split('/').map(Number)
      const b = base(i)
      return { ...b, num, den, pizzas: 1, knives: [2, 3, 4], text: WORDS[k].say(b.topping.name), label: WORDS[k].label }
    })
  }
  if (grade === 3) {
    const units = shuffle([2, 3, 4, 6, 8]).slice(0, 3).map((d) => [1, d])
    const proper = shuffle([3, 4, 6, 8]).slice(0, 3).map((d) => [randInt(2, d - 1), d])
    return [...units, ...proper].map(([num, den], i) => {
      const b = base(i)
      return { ...b, num, den, pizzas: 1, knives: [2, 3, 4, 6, 8], text: `Pizzanın ${frac(num, den)} kadarı ${b.topping.name} olsun lütfen!`, label: frac(num, den) }
    })
  }
  if (grade === 4) {
    const pool = [2, 3, 4, 5, 6, 8, 10, 12]
    const list = shuffle([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [1, 6], [5, 6]]).slice(0, ORDERS)
    return list.map(([num, den], i) => {
      const b = base(i)
      // Siparişin paydası olan bıçak bilerek yok: denk kesir bulmak gerekiyor
      const good = shuffle(pool.filter((k) => k !== den && k % den === 0)).slice(0, 2)
      const wrong = shuffle(pool.filter((k) => k % den !== 0)).slice(0, 4 - good.length)
      return { ...b, num, den, pizzas: 1, knives: [...good, ...wrong].sort((x, y) => x - y), text: `Pizzanın ${frac(num, den)} kadarı ${b.topping.name} olsun lütfen!`, label: frac(num, den) }
    })
  }
  // 5. sınıf: tam sayılı, bileşik kesir ve birim kesir sayısı olarak, iki pizza
  const forms = shuffle(['mixed', 'mixed', 'improper', 'improper', 'units', 'units'] as const)
  return forms.map((form, i) => {
    const b = base(i)
    const den = pick([2, 3, 4, 6, 8])
    if (form === 'mixed') {
      const a = randInt(1, den - 1)
      return { ...b, num: den + a, den, pizzas: 2, knives: [2, 3, 4, 6, 8, 10, 12], text: `[[1 ${a}/${den}]] pizza ${b.topping.name} olsun lütfen!`, label: `[[1 ${a}/${den}]]` }
    }
    if (form === 'improper') {
      const num = randInt(den + 1, 2 * den - 1)
      return { ...b, num, den, pizzas: 2, knives: [2, 3, 4, 6, 8, 10, 12], text: `${frac(num, den)} pizza ${b.topping.name} olsun lütfen!`, label: frac(num, den) }
    }
    let k = randInt(2, 2 * den - 1)
    if (k === den) k++
    return { ...b, num: k, den, pizzas: 2, knives: [2, 3, 4, 6, 8, 10, 12], text: `Her biri ${frac(1, den)} pizza olan ${k} dilim ${b.topping.name} olsun lütfen!`, label: `${k} tane ${frac(1, den)}` }
  })
}

const pt = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`

function Pizza({ n, topped, topping, onSlice, label }: { n: number; topped: boolean[]; topping: Topping; onSlice: (i: number) => void; label: string }) {
  const R = 86
  const th = (2 * Math.PI) / n
  const key = (i: number) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSlice(i)
    }
  }
  return (
    <svg viewBox="-100 -100 200 200" className="w-full touch-manipulation select-none drop-shadow-md animate-pop" role="group" aria-label={label}>
      <circle r={97} fill="#e2a54f" stroke="#b7791f" strokeWidth={3} />
      {Array.from({ length: n }, (_, i) => {
        const a0 = -Math.PI / 2 + i * th
        const d = n === 1 ? `M 0 ${-R} A ${R} ${R} 0 1 1 0 ${R} A ${R} ${R} 0 1 1 0 ${-R} Z` : `M 0 0 L ${pt(R, a0)} A ${R} ${R} 0 ${th > Math.PI ? 1 : 0} 1 ${pt(R, a0 + th)} Z`
        const dots: [number, number][] = []
        if (topped[i]) {
          for (const rr of [26, 50, 72]) {
            const cnt = Math.min(n === 1 ? 6 + rr / 10 : 99, Math.floor((rr * th) / 24))
            for (let j = 0; j < cnt; j++) {
              const a = a0 + ((j + 0.5) * th) / cnt
              dots.push([rr * Math.cos(a), rr * Math.sin(a)])
            }
          }
          if (n === 1) dots.push([0, 0])
        }
        return (
          <g key={i}>
            <path
              d={d}
              fill={topped[i] ? topping.color : '#fde68a'}
              stroke="#c2410c"
              strokeWidth={n === 1 ? 0 : 2.5}
              strokeLinejoin="round"
              role="button"
              tabIndex={0}
              aria-pressed={topped[i]}
              aria-label={`${i + 1}. dilim`}
              onClick={() => onSlice(i)}
              onKeyDown={key(i)}
              className="cursor-pointer outline-none"
            />
            {dots.map(([x, y], j) => <circle key={j} cx={x} cy={y} r={6} fill={topping.dot} stroke="#fff" strokeOpacity={0.5} pointerEvents="none" />)}
          </g>
        )
      })}
    </svg>
  )
}

const insightFor = (grade: Grade) =>
  grade === 2
    ? 'Yarım, bir bütünün 2 eş parçasından biridir; çeyrek ise 4 eş parçasından biri. Peki iki çeyrek kaç yarım eder?'
    : grade === 3
      ? 'Payda pizzanın kaç eş parçaya bölündüğünü, pay ise kaç parçaya malzeme koyduğunu söyler. Payda büyüdükçe bir dilim neden küçülüyor?'
      : grade === 4
        ? '2/3 ile 4/6 aynı miktarda pizzadır: her dilimi ikiye bölünce hem pay hem payda iki katına çıkar. Denk kesirleri böyle bulabilirsin!'
        : '1 tam 1/4, 5/4 ve “her biri 1/4 olan 5 dilim” aynı miktarı gösterir. Bir miktarı kaç farklı şekilde yazabilirsin?'

export default function PizzaShop({ grade, onFinish }: GameProps) {
  const [orders] = useState(() => makeOrders(grade))
  const patience = PATIENCE[grade] ?? 40
  const [idx, setIdx] = useState(0)
  const [n, setN] = useState(1)
  const [top, setTop] = useState<boolean[]>(() => Array(orders[0].pizzas).fill(false))
  const [phase, setPhase] = useState<'order' | 'happy' | 'gone'>('order')
  const [miss, setMiss] = useState(0)
  const [served, setServed] = useState(0)
  const [totalMiss, setTotalMiss] = useState(0)
  const [score, setScore] = useState(0)
  const [msg, setMsg] = useState<{ text: string; tone: 'ok' | 'bad' | 'info'; k: number } | null>(null)
  const [shake, setShake] = useState(false)
  const finished = useRef(false)
  const o = orders[idx]

  const { left, reset } = useCountdown(patience, phase === 'order', () => {
    sfx.bad()
    const k = o.knives.find((x) => (o.num * x) % o.den === 0) ?? o.den
    setMsg({ text: `Müşteri beklemekten sıkıldı ve gitti. Pizzayı ${k} eş dilime kesip ${(o.num * k) / o.den} dilime malzeme koyabilirdin.`, tone: 'bad', k: Date.now() })
    setTotalMiss((m) => m + 1)
    setPhase('gone')
  })

  const say = (text: string, tone: 'ok' | 'bad' | 'info') => setMsg({ text, tone, k: Date.now() })

  const cut = (k: number) => {
    if (phase !== 'order' || k === n) return
    setN(k)
    setTop(Array(k * o.pizzas).fill(false))
    setMsg(null)
  }

  const toggle = (i: number) => {
    if (phase !== 'order') return
    setTop(top.map((t, j) => (j === i ? !t : t)))
  }

  const serve = () => {
    if (phase !== 'order') return
    const t = top.filter(Boolean).length
    if (t === 0) return say('Önce dilimlere dokunarak malzeme koy!', 'info')
    const need = (o.num * n) / o.den
    const w = grade === 2
    if (t === need) {
      sfx.ok()
      const tip = Math.ceil((5 * left) / patience)
      setScore(score + Math.max(4, 10 - 3 * miss) + tip)
      setServed(served + 1)
      const same = n !== o.den || (grade === 5 && o.label !== `[[${o.num}/${o.den}]]`)
      say(w ? `Afiyet olsun! ${n === 1 ? 'Bütün pizza hazır.' : `${n} dilimden ${t} tanesi = ${o.label} pizza.`} Bahşiş: +${tip}` : `Afiyet olsun!${same ? ` [[${t}/${n}]] = ${o.label}` : ''} · Bahşiş: +${tip}`, 'ok')
      setPhase('happy')
      return
    }
    sfx.bad()
    setShake(true)
    setTimeout(() => setShake(false), 450)
    setMiss(miss + 1)
    setTotalMiss(totalMiss + 1)
    const made = w ? `${n} dilimden ${t} tanesine` : `[[${t}/${n}]]`
    if (!Number.isInteger(need)) {
      if (n === 1) return say('Önce bıçakla pizzayı eş dilimlere kes!', 'bad')
      if (w) return say(`${n} eş dilimle tam ${o.label} yapılamaz. ${o.label === 'yarım' ? 'Yarım için pizza 2 eş parçaya bölünür.' : 'Çeyrek için pizza 4 eş parçaya bölünür.'}`, 'bad')
      if (grade === 3) return say(`${n} eş dilimle ${o.label} tam olarak yapılamaz. Paydaya bak: pizza kaç eş parçaya bölünmeli?`, 'bad')
      return say(`${n} eş dilimle ${o.label} tam olarak yapılamaz. Paydası ${o.den} olan bir kesir için dilim sayısı ${o.den} ile tam bölünmeli.`, 'bad')
    }
    const more = t > need
    if (miss === 0) return say(`${w ? `${made} malzeme koydun; bu ${o.label} pizzadan ${more ? 'fazla' : 'az'}.` : `Sen ${made} pizza hazırladın; bu siparişten ${more ? 'fazla' : 'az'}.`} Bir daha dene!`, 'bad')
    if (w) return say(`${more ? 'Fazla' : 'Eksik'} oldu. ${o.label[0].toLocaleUpperCase('tr-TR') + o.label.slice(1)} pizza için ${n} dilimden ${need} tanesine malzeme koymalısın.`, 'bad')
    return say(`${more ? 'Fazla' : 'Eksik'} oldu. Her dilim [[1/${n}]] pizza; ${o.label} pizza için ${need} dilime malzeme koymalısın.`, 'bad')
  }

  const nextOrder = () => {
    if (idx + 1 >= ORDERS) {
      if (finished.current) return
      finished.current = true
      onFinish({
        stars: starsFor((served - totalMiss * 0.2) / ORDERS),
        score,
        summary: `${ORDERS} siparişin ${served} tanesini doğru hazırladın.`,
        insight: insightFor(grade),
      })
      return
    }
    setIdx(idx + 1)
    setN(1)
    setTop(Array(orders[idx + 1].pizzas).fill(false))
    setMiss(0)
    setMsg(null)
    reset()
    setPhase('order')
  }

  useEffect(() => {
    if (phase !== 'happy') return
    const t = setTimeout(nextOrder, 1900)
    return () => clearTimeout(t)
  }, [phase])

  const ratio = left / patience
  const mood = phase === 'happy' ? '😋' : phase === 'gone' ? '😠' : ratio < 0.3 ? '😟' : ratio < 0.6 ? '🙂' : '😊'
  const toned = (tone: 'ok' | 'bad' | 'info') => (tone === 'ok' ? 'bg-ok-soft text-green-800 ring-green-200' : tone === 'bad' ? 'bg-orange-50 text-orange-800 ring-orange-200' : 'bg-white text-ink ring-line')
  const tCount = top.filter(Boolean).length

  return (
    <div className="animate-fade-up">
      <Hud round={idx + 1} rounds={ORDERS} score={score} extra={<span className="chip bg-white px-3 py-1.5 text-sm ring-1 ring-line">🍕 {served}</span>} />

      <div className="card mb-3 p-3">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0 text-center">
            <span className={`block text-5xl ${phase === 'gone' ? 'opacity-40' : ''}`} aria-hidden>{o.who}</span>
            <span className="absolute -right-2 -bottom-1 text-2xl" aria-hidden>{mood}</span>
          </div>
          <div className="relative min-w-0 flex-1 rounded-2xl bg-paper px-3 py-2 text-lg leading-snug font-extrabold ring-1 ring-line">
            <MathText text={o.text} />
          </div>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Müşterinin sabrı" aria-valuenow={left} aria-valuemin={0} aria-valuemax={patience}>
          <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${ratio < 0.3 ? 'bg-rose-500' : ratio < 0.6 ? 'bg-amber-400' : 'bg-ok'}`} style={{ width: `${phase === 'order' ? ratio * 100 : phase === 'gone' ? 0 : ratio * 100}%` }} />
        </div>
      </div>

      <div className={`mx-auto grid gap-3 ${o.pizzas === 2 ? 'max-w-md grid-cols-2' : 'max-w-[260px]'} ${shake ? 'animate-shake' : ''}`}>
        {Array.from({ length: o.pizzas }, (_, p) => (
          <Pizza
            key={`${idx}-${p}-${n}`}
            n={n}
            topped={top.slice(p * n, (p + 1) * n)}
            topping={o.topping}
            onSlice={(i) => toggle(p * n + i)}
            label={o.pizzas === 2 ? `${p + 1}. pizza` : 'Pizza'}
          />
        ))}
      </div>
      <p className="mt-2 text-center text-sm font-bold text-ink-soft">
        {n === 1 ? 'Pizza henüz kesilmedi.' : `${o.pizzas === 2 ? 'Her pizza' : 'Pizza'} ${n} eş dilim`} · Malzemeli dilim: <span className="font-black text-ink">{tCount}</span>
      </p>

      <div className="mt-3">
        <p className="mb-1.5 text-center text-xs font-extrabold tracking-wide text-ink-soft uppercase">🔪 Kaç eş dilime keseyim?</p>
        <div className="flex flex-wrap justify-center gap-2">
          {o.knives.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => cut(k)}
              disabled={phase !== 'order'}
              aria-pressed={n === k}
              aria-label={`${k} eş dilime kes`}
              className={`grid size-12 place-items-center rounded-2xl text-lg font-black ring-2 transition active:scale-95 ${n === k ? 'bg-orange-500 text-white ring-orange-500' : 'bg-white text-ink ring-line'}`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div key={msg.k} className={`mx-auto mt-3 w-fit max-w-full rounded-2xl px-4 py-2 text-center text-base font-extrabold ring-1 animate-pop ${toned(msg.tone)}`} aria-live="polite">
          <MathText text={msg.text} />
        </div>
      )}

      <div className="mt-4 flex justify-center">
        {phase === 'gone' ? (
          <button type="button" onClick={nextOrder} className="btn-primary min-w-56" autoFocus>{idx + 1 >= ORDERS ? 'Sonuçları gör' : 'Sonraki müşteri'}</button>
        ) : (
          <button type="button" onClick={serve} disabled={phase !== 'order'} className="btn-primary min-w-56 bg-orange-500 shadow-[0_4px_0_#c2410c]"><ConciergeBell size={20} />Servis et</button>
        )}
      </div>
    </div>
  )
}
