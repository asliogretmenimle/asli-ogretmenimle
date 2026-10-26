import { useEffect, useRef, useState } from 'react'
import { Flag, RotateCcw, Undo2 } from 'lucide-react'
import type { Grade } from '../data/types'
import { distinctInts, pick, randInt, shuffle } from '../lib/random'
import { sfx } from '../lib/feedback'
import { fmt } from '../lib/format'
import { MathText } from '../components/MathText'
import { Hud, Toast, signed, starsFor, useCountdown, type GameProps } from './kit'

type Op = '+' | '−' | '×' | '÷'
type Unary = 'sq' | 'sqrt'

/** Ekranda gösterilen ifade; p: öncelik (1: + −, 2: × ÷, 3: tek sayı / kare) */
interface Expr { s: string; p: number }
interface Card { id: number; v: number; e: Expr }

interface Cfg {
  cards: () => number[]
  ops: Op[]
  unary: boolean
  /** Hedef üretilirken kullanılacak kart sayısı */
  k: [number, number]
  range: [number, number]
  /** Negatif sonuç yasak mı (3–6. sınıf) */
  noNeg: boolean
  seconds: number
}

const ALL_OPS: Op[] = ['+', '−', '×', '÷']

function configFor(grade: Grade): Cfg {
  switch (grade) {
    case 3:
      return { cards: () => [...distinctInts(3, 1, 9), ...shuffle([10, 20, 30, 40, 50]).slice(0, 2)], ops: ['+', '−'], unary: false, k: [3, 4], range: [15, 150], noNeg: true, seconds: 120 }
    case 4:
      return { cards: () => [...distinctInts(4, 1, 9), pick([10, 20, 25])], ops: ALL_OPS, unary: false, k: [3, 4], range: [20, 250], noNeg: true, seconds: 110 }
    case 5:
      return { cards: () => [...distinctInts(4, 1, 9), pick([10, 25, 50])], ops: ALL_OPS, unary: false, k: [3, 4], range: [30, 500], noNeg: true, seconds: 100 }
    case 6:
      return { cards: () => [...distinctInts(5, 1, 10), pick([25, 50, 75, 100])], ops: ALL_OPS, unary: false, k: [3, 5], range: [100, 999], noNeg: true, seconds: 100 }
    case 7:
      return {
        cards: () => {
          const s = distinctInts(4, 1, 9)
          return [-s[0], -s[1], s[2], s[3], pick([10, 12, 15, 20])]
        },
        ops: ALL_OPS, unary: false, k: [3, 4], range: [-150, 200], noNeg: false, seconds: 100,
      }
    default:
      return { cards: () => [...distinctInts(4, 2, 9), pick([16, 25, 36, 49])], ops: ALL_OPS, unary: true, k: [3, 4], range: [20, 500], noNeg: false, seconds: 100 }
  }
}

const ROUNDS = 5

const num = (v: number) => signed(fmt(v))
/** Sağdaki negatif sayı parantezle yazılır: 5 × (−3) */
const numR = (v: number) => (v < 0 ? `(${num(v)})` : num(v))

const atom = (v: number): Expr => ({ s: num(v), p: v < 0 ? 0 : 3 })
const PREC: Record<Op, number> = { '+': 1, '−': 1, '×': 2, '÷': 2 }
const wrap = (e: Expr) => `(${e.s})`

function joinExpr(a: Expr, op: Op, b: Expr): Expr {
  const p = PREC[op]
  const l = a.p < p ? wrap(a) : a.s
  const r = b.p < p || (b.p === p && (op === '−' || op === '÷')) ? wrap(b) : b.s
  return { s: `${l} ${op} ${r}`, p }
}
const squareExpr = (a: Expr): Expr => ({ s: `${a.p < 3 ? wrap(a) : a.s}^{2}`, p: 3 })
const sqrtExpr = (a: Expr): Expr => ({ s: a.s.includes('{') ? `√(${a.s})` : `√{${a.s}}`, p: 3 })

const apply = (a: number, op: Op, b: number) => (op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b)
const stepText = (a: number, op: Op, b: number, r: number) => `${num(a)} ${op} ${numR(b)} = ${num(r)}`
const sqrtOf = (v: number) => {
  if (v < 0) return null
  const r = Math.round(Math.sqrt(v))
  return r * r === v ? r : null
}

/** Hedef üretirken "güzel" işlemler: ×1, ÷1, sıfır sonuç yok */
function genOk(a: number, op: Op, b: number, cfg: Cfg) {
  switch (op) {
    case '+': return a + b !== 0
    case '−': return cfg.noNeg ? a > b : a !== b
    case '×': return Math.abs(a) > 1 && Math.abs(b) > 1 && Math.abs(a * b) <= 2000
    case '÷': return Math.abs(b) > 1 && a !== 0 && a % b === 0 && a !== b
  }
}

interface Puzzle { cards: number[]; target: number; steps: string[]; expr: string }

function makePuzzle(cfg: Cfg, grade: Grade): Puzzle {
  for (let t = 0; t < 4000; t++) {
    const cards = shuffle(cfg.cards())
    let pool = shuffle(cards).slice(0, randInt(cfg.k[0], cfg.k[1])).map((v) => ({ v, e: atom(v) }))
    if (grade === 7 && !pool.some((x) => x.v < 0)) continue
    const steps: string[] = []
    let unaryUsed = false
    let ok = true
    while (pool.length > 1) {
      const [x, y, ...rest] = shuffle(pool)
      let a = x
      if (cfg.unary && !unaryUsed && Math.random() < 0.5) {
        const root = sqrtOf(a.v)
        if (root !== null && a.v >= 4 && Math.random() < 0.6) {
          steps.push(`√{${num(a.v)}} = ${num(root)}`)
          a = { v: root, e: sqrtExpr(a.e) }
          unaryUsed = true
        } else if (Math.abs(a.v) >= 2 && Math.abs(a.v) <= 12) {
          steps.push(`${numR(a.v)}^{2} = ${num(a.v * a.v)}`)
          a = { v: a.v * a.v, e: squareExpr(a.e) }
          unaryUsed = true
        }
      }
      const op = shuffle(cfg.ops).find((o) => genOk(a.v, o, y.v, cfg))
      if (!op) {
        ok = false
        break
      }
      const r = apply(a.v, op, y.v)
      steps.push(stepText(a.v, op, y.v, r))
      pool = [...rest, { v: r, e: joinExpr(a.e, op, y.e) }]
    }
    if (!ok || (cfg.unary && !unaryUsed)) continue
    const target = pool[0].v
    if (target < cfg.range[0] || target > cfg.range[1] || Math.abs(target) < 5 || cards.includes(target)) continue
    return { cards, target, steps, expr: pool[0].e.s }
  }
  return { cards: [4, 6, 9, 25], target: 44, steps: ['4 + 6 = 10', '10 + 9 = 19', '19 + 25 = 44'], expr: '4 + 6 + 9 + 25' }
}

/** Oyuncunun işlemi kurallara uygun mu? Uygun değilse nedenini döndürür */
function checkOp(a: number, op: Op, b: number, noNeg: boolean): string | null {
  if (op === '−' && noNeg && a - b < 0) return `${num(a)} − ${num(b)}: küçük sayıdan büyük sayıyı çıkaramayız. Büyükten küçüğü çıkarmayı dene.`
  if (op === '÷') {
    if (b === 0) return 'Sıfıra bölme yapılamaz!'
    if (a % b !== 0) return a > 0 && b > 0 ? `${num(a)} ÷ ${num(b)} tam bölünmüyor, kalan ${num(a % b)}. Burada yalnızca tam bölme var.` : `${num(a)} ÷ ${numR(b)} tam bölünmüyor. Burada yalnızca tam bölme var.`
  }
  if (Math.abs(apply(a, op, b)) > 1_000_000) return 'Bu çok büyük bir sayı oldu! Daha küçük adımlarla dene.'
  return null
}

const OP_LABEL: Record<Op | Unary, string> = { '+': 'Topla', '−': 'Çıkar', '×': 'Çarp', '÷': 'Böl', sq: 'Karesini al', sqrt: 'Karekökünü al' }

const insightFor = (grade: Grade) =>
  grade === 3
    ? 'Hedefe yaklaşmak için önce büyük kartları toplayıp sonra küçüklerle ince ayar yaptın mı? Bir sonraki oyunda bu stratejiyi dene!'
    : grade <= 6
      ? 'Adımlarını tek bir işlem olarak yazınca parantez gerekti mi? İşlem önceliği, hangi işlemin önce yapılacağını gösterir: (25 − 7) × 4 ile 25 − 7 × 4 aynı değil!'
      : grade === 7
        ? 'Negatif bir sayıyla çarpınca ya da böldüğünde sonucun işareti ne oldu? İki negatifin çarpımı neden pozitif çıkıyor, düşün!'
        : 'Bir sayının karesi onu hızla büyütür, karekök ise küçültür. Hedefe ulaşmak için hangi kareyi ya da kökü kullandın?'

export default function TargetNumber({ grade, onFinish }: GameProps) {
  const cfg = useRef(configFor(grade)).current
  const [puz, setPuz] = useState(() => makePuzzle(cfg, grade))
  const initCards = (p: Puzzle): Card[] => p.cards.map((v, i) => ({ id: i, v, e: atom(v) }))
  const [cards, setCards] = useState<Card[]>(() => initCards(puz))
  const [log, setLog] = useState<string[]>([])
  const [hist, setHist] = useState<{ cards: Card[]; log: string[] }[]>([])
  const [sel, setSel] = useState<number | null>(null)
  const [op, setOp] = useState<Op | null>(null)
  const [phase, setPhase] = useState<'play' | 'review'>('play')
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [base, setBase] = useState(0)
  const [exact, setExact] = useState(0)
  const [res, setRes] = useState<{ card: Card; diff: number; pts: number; bonus: number } | null>(null)
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'bad' | 'info'; k: number } | null>(null)
  const [shake, setShake] = useState<number | null>(null)
  const nextId = useRef(100)
  const finished = useRef(false)

  const { left, reset } = useCountdown(cfg.seconds, phase === 'play', () => endRound())

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const say = (text: string, tone: 'ok' | 'bad' | 'info') => setToast({ text, tone, k: Date.now() })

  const best = cards.reduce((b, c) => (Math.abs(c.v - puz.target) < Math.abs(b.v - puz.target) ? c : b), cards[0])

  function endRound(card: Card = best) {
    if (phase !== 'play') return
    const diff = Math.abs(card.v - puz.target)
    const pts = diff === 0 ? 10 : diff <= 2 ? 7 : diff <= 5 ? 5 : diff <= 10 ? 2 : 0
    const bonus = diff === 0 ? Math.round((5 * left) / cfg.seconds) : 0
    if (pts > 0) sfx.ok()
    else sfx.bad()
    setScore((s) => s + pts + bonus)
    setBase((b) => b + pts)
    if (diff === 0) setExact((x) => x + 1)
    setRes({ card, diff, pts, bonus })
    setSel(null)
    setOp(null)
    setToast(null)
    setPhase('review')
  }

  const commit = (removeId: number | null, replaceId: number, card: Card, step: string) => {
    setHist([...hist, { cards, log }])
    setCards(cards.filter((c) => c.id !== removeId).map((c) => (c.id === replaceId ? card : c)))
    setLog([...log, step])
    setSel(card.id)
    setOp(null)
    if (card.v === puz.target) endRound(card)
  }

  const bad = (id: number, text: string) => {
    sfx.bad()
    say(text, 'bad')
    setShake(id)
    setTimeout(() => setShake(null), 450)
  }

  const tapCard = (c: Card) => {
    if (phase !== 'play') return
    if (sel === null || op === null) {
      setSel(sel === c.id ? null : c.id)
      return
    }
    if (sel === c.id) {
      say('Başka bir kart seç: bir kart kendisiyle birleşemez.', 'info')
      return
    }
    const a = cards.find((x) => x.id === sel)
    if (!a) return
    const err = checkOp(a.v, op, c.v, cfg.noNeg)
    if (err) {
      setOp(null)
      return bad(c.id, err)
    }
    const r = apply(a.v, op, c.v)
    commit(a.id, c.id, { id: nextId.current++, v: r, e: joinExpr(a.e, op, c.e) }, stepText(a.v, op, c.v, r))
  }

  const tapOp = (o: Op | Unary) => {
    if (phase !== 'play') return
    const a = cards.find((x) => x.id === sel)
    if (!a) {
      say('Önce bir sayı kartı seç.', 'info')
      return
    }
    if (o === 'sq') {
      if (Math.abs(a.v) > 1000) return bad(a.id, 'Bu sayının karesi çok büyük olur!')
      return commit(null, a.id, { id: nextId.current++, v: a.v * a.v, e: squareExpr(a.e) }, `${numR(a.v)}^{2} = ${num(a.v * a.v)}`)
    }
    if (o === 'sqrt') {
      const r = sqrtOf(a.v)
      if (r === null) return bad(a.id, a.v < 0 ? 'Negatif bir sayının karekökü gerçek sayı değildir.' : `${num(a.v)} bir tam kare değil, karekökü tam sayı çıkmaz. Tam kareler: 1, 4, 9, 16, 25…`)
      return commit(null, a.id, { id: nextId.current++, v: r, e: sqrtExpr(a.e) }, `√{${num(a.v)}} = ${num(r)}`)
    }
    setOp(op === o ? null : o)
  }

  const undo = () => {
    const last = hist[hist.length - 1]
    if (!last || phase !== 'play') return
    setCards(last.cards)
    setLog(last.log)
    setHist(hist.slice(0, -1))
    setSel(null)
    setOp(null)
  }

  const restart = () => {
    if (!hist.length || phase !== 'play') return
    setCards(hist[0].cards)
    setLog([])
    setHist([])
    setSel(null)
    setOp(null)
  }

  const next = () => {
    if (round + 1 >= ROUNDS) {
      if (finished.current) return
      finished.current = true
      onFinish({
        stars: starsFor(base / (ROUNDS * 10)),
        score,
        summary: `${ROUNDS} turun ${exact} tanesinde hedefi tam buldun.`,
        insight: insightFor(grade),
      })
      return
    }
    const p = makePuzzle(cfg, grade)
    setPuz(p)
    setCards(initCards(p))
    setLog([])
    setHist([])
    setRes(null)
    setRound(round + 1)
    reset()
    setPhase('play')
  }

  const selCard = cards.find((c) => c.id === sel)
  const ops: (Op | Unary)[] = [...cfg.ops, ...(cfg.unary ? (['sq', 'sqrt'] as Unary[]) : [])]
  const bestDiff = Math.abs(best.v - puz.target)

  return (
    <div className="animate-fade-up">
      <Hud round={round + 1} rounds={ROUNDS} score={score} seconds={left} />

      <div className="mb-3 rounded-2xl bg-ink px-4 py-3 text-center text-white">
        <span className="text-xs font-extrabold tracking-wide text-white/70 uppercase">Hedef sayı</span>
        <p className="text-4xl font-black tabular-nums sm:text-5xl">{num(puz.target)}</p>
        {phase === 'play' && log.length > 0 && (
          <p className="mt-1 text-sm font-bold text-white/80">En yakın kartın: {num(best.v)} {bestDiff ? `(${num(bestDiff)} uzak)` : ''}</p>
        )}
      </div>

      {phase === 'play' ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            {cards.map((c) => {
              const label = num(c.v)
              const on = c.id === sel
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => tapCard(c)}
                  aria-pressed={on}
                  className={`h-16 rounded-2xl font-black tabular-nums shadow-[0_3px_0_#e7e8f2] ring-2 transition animate-pop ${label.length > 7 ? 'text-base' : label.length > 4 ? 'text-xl' : 'text-3xl'} ${on ? '-translate-y-1 bg-amber-100 text-amber-900 ring-amber-400' : 'bg-white ring-line hover:ring-amber-300'} ${shake === c.id ? 'animate-shake' : ''}`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {ops.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => tapOp(o)}
                aria-label={OP_LABEL[o]}
                aria-pressed={op === o}
                className={`grid size-14 place-items-center rounded-2xl text-2xl font-black ring-2 transition active:scale-95 ${op === o ? 'bg-brand text-white ring-brand' : 'bg-white text-ink ring-line'} ${!selCard ? 'opacity-60' : ''}`}
              >
                {o === 'sq' ? <span>x<sup className="text-sm">2</sup></span> : o === 'sqrt' ? '√' : o}
              </button>
            ))}
          </div>

          <p className="mt-3 min-h-6 text-center text-sm font-bold text-ink-soft" aria-live="polite">
            {!selCard ? 'Bir sayı kartı seç.' : op ? `${num(selCard.v)} ${op} ? — şimdi ikinci kartı seç.` : `${num(selCard.v)} seçili — bir işlem seç.`}
            {cards.length === 1 && cards[0].v !== puz.target && ' Tek kart kaldı: geri al ya da Bitir’e bas.'}
          </p>

          {toast && <Toast key={toast.k} text={toast.text} tone={toast.tone} />}

          {log.length > 0 && (
            <ol className="mx-auto mt-3 max-w-sm space-y-1 rounded-2xl bg-white p-3 text-center text-lg font-extrabold ring-1 ring-line">
              {log.map((s, i) => <li key={i} className="tabular-nums"><MathText text={s} /></li>)}
            </ol>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button type="button" onClick={undo} disabled={!hist.length} className="btn-ghost min-h-12 px-2 text-sm"><Undo2 size={18} />Geri al</button>
            <button type="button" onClick={restart} disabled={!hist.length} className="btn-ghost min-h-12 px-2 text-sm"><RotateCcw size={18} />Baştan</button>
            <button type="button" onClick={() => endRound()} className="btn-primary min-h-12 px-2 text-sm"><Flag size={18} />Bitir</button>
          </div>
        </>
      ) : (
        res && (
          <div className="card mx-auto max-w-lg p-5 text-center animate-pop">
            {res.diff === 0 ? (
              <>
                <p className="text-3xl" aria-hidden>🎯</p>
                <p className="text-2xl font-black text-ok">Tam isabet!</p>
                <p className="font-extrabold text-amber-700">+{res.pts}{res.bonus ? ` · hız bonusu +${res.bonus}` : ''}</p>
              </>
            ) : (
              <>
                <p className="text-xl font-black">En yakın kartın: {num(res.card.v)}</p>
                <p className="font-bold text-ink-soft">Hedefe {num(res.diff)} uzak · {res.pts ? <span className="font-extrabold text-amber-700">+{res.pts}</span> : 'puan yok'}</p>
              </>
            )}
            {res.card.id >= 100 && (
              <p className="mt-3 text-lg font-extrabold">
                Senin işlemin: <MathText text={`${res.card.e.s} = ${num(res.card.v)}`} />
              </p>
            )}
            {res.diff !== 0 && (
              <div className="mt-4 rounded-2xl bg-brand-soft p-3">
                <p className="text-sm font-extrabold text-brand-ink">Bir çözüm:</p>
                <p className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-lg font-extrabold">
                  {puz.steps.map((s, i) => (
                    <span key={i} className="whitespace-nowrap">{i > 0 && <span className="mr-2 text-ink-soft" aria-hidden>→</span>}<MathText text={s} /></span>
                  ))}
                </p>
                {grade >= 5 && puz.steps.length > 1 && (
                  <p className="mt-2 text-base font-bold text-ink-soft">Tek satırda: <MathText text={`${puz.expr} = ${num(puz.target)}`} /></p>
                )}
              </div>
            )}
            <button type="button" onClick={next} className="btn-primary mt-5 min-w-48" autoFocus>
              {round + 1 >= ROUNDS ? 'Sonuçları gör' : 'Sonraki tur'}
            </button>
          </div>
        )
      )}
    </div>
  )
}
