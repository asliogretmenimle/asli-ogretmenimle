import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, X } from 'lucide-react'
import type { Grade } from '../data/types'
import { randInt, shuffle } from '../lib/random'
import { sfx } from '../lib/feedback'
import { fmt, normalizeAnswer } from '../lib/format'
import { Stepper, ToolButton } from '../manipulatives/ui'
import { Hud, Toast, signed, starsFor, type GameProps } from './kit'

/** f(x) = d ? x ÷ d : a·x + b */
interface Rule { a: number; b: number; d?: number }
interface Machine { rule: Rule; min: number; max: number; ok: (x: number) => boolean; reject: string; chips: number[]; color: string }
interface Row { x: number; y: number; src: 'test' | 'challenge' }
interface Msg { text: string; tone: 'ok' | 'bad' | 'info'; key: number }
type Phase = 'explore' | 'predict' | 'checked' | 'choose' | 'solved'

const MACHINES = 4
const PER_MACHINE = 70
const COLORS = ['#db2777', '#7c3aed', '#0891b2', '#ea580c']
const NEGATIVE_OUT = 'Makine bu sayıyı geri tükürdü! Çıkan sayı 0’dan küçük olurdu.'

const apply = (r: Rule, x: number) => (r.d ? x / r.d : r.a * x + r.b)
const show = (v: number) => signed(fmt(v))
const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)

function ruleText(r: Rule, g: Grade): string {
  const bs = r.b > 0 ? ` + ${r.b}` : r.b < 0 ? ` − ${-r.b}` : ''
  if (g <= 5) {
    if (r.d) return `□ ÷ ${r.d}`
    if (r.a === 1) return r.b >= 0 ? `□ + ${r.b}` : `□ − ${-r.b}`
    return `□ × ${r.a}${bs}`
  }
  const v = g === 8 ? 'x' : 'n'
  const ax = r.a === 1 ? v : r.a === -1 ? `−${v}` : `${signed(String(r.a))}${v}`
  return `${g === 8 ? 'y = ' : ''}${ax}${bs}`
}
const inputName = (g: Grade) => (g === 8 ? 'x = ' : g >= 6 ? 'n = ' : '')

function makeMachine(g: Grade, color: string): Machine {
  let rule: Rule
  let min = 0, max = 20
  let ok = (_x: number) => true
  let reject = NEGATIVE_OUT
  if (g <= 3) {
    const n = randInt(3, 25)
    rule = { a: 1, b: Math.random() < 0.5 ? n : -n }
    max = 99
    ok = (x) => x + rule.b >= 0
  } else if (g === 4) {
    if (Math.random() < 0.5) rule = { a: randInt(2, 9), b: 0 }
    else {
      const d = randInt(2, 9)
      rule = { a: 1, b: 0, d }
      max = 100
      ok = (x) => x % d === 0
      reject = 'Makine bu sayıyı geri verdi: bu sayıyla tam bir sonuç çıkmıyor!'
    }
  } else if (g === 5 || g === 6) {
    const a = randInt(2, g === 5 ? 5 : 6)
    let b = 0
    while (b === 0) b = Math.random() < 0.7 ? randInt(1, 12) : -randInt(1, a - 1)
    rule = { a, b }
    ok = (x) => a * x + b >= 0
  } else {
    let a = 0, b = 0
    while (a === 0 || (a === 1 && b === 0)) {
      a = g === 7 ? (Math.random() < 0.7 ? -randInt(1, 5) : randInt(2, 5)) : randInt(-5, 5)
      b = randInt(g === 7 ? -9 : -10, g === 7 ? 9 : 10)
    }
    rule = { a, b }
    min = -10
    max = 10
  }
  const valid = range(min, max).filter(ok)
  const chips = shuffle(valid).slice(0, 6)
  const friendly = valid.find((x) => x === 1) ?? valid.find((x) => x === 0)
  if (friendly !== undefined && !chips.includes(friendly)) chips[0] = friendly
  return { rule, min, max, ok, reject, chips: chips.sort((p, q) => p - q), color }
}

/** Doğru kural + tablodaki bazı satırlara uyan ama hepsine uymayan 3 çeldirici */
function makeOptions(rule: Rule, rows: Row[], g: Grade): Rule[] {
  const fits = (r: Rule) => rows.filter((row) => Math.abs(apply(r, row.x) - row.y) < 1e-9).length
  const pool: Rule[] = []
  const { a, b, d } = rule
  if (g <= 3) {
    for (const k of [1, 2, 10, -1, -2, -10]) pool.push({ a: 1, b: b + k })
    pool.push({ a: 1, b: -b }, { a: 2, b: 0 }, { a: 3, b: 0 })
    for (const row of rows) if (row.x > 0 && row.y % row.x === 0 && row.y / row.x >= 2 && row.y / row.x <= 9) pool.push({ a: row.y / row.x, b: 0 })
  } else if (g === 4) {
    if (d) {
      pool.push({ a: 1, b: 0, d: d + 1 }, { a: 1, b: 0, d: d > 2 ? d - 1 : d + 2 }, { a: 1, b: 0, d: 2 * d })
      for (const row of rows) if (row.x > row.y) pool.push({ a: 1, b: row.y - row.x })
    } else {
      pool.push({ a: a + 1, b: 0 }, { a: a > 2 ? a - 1 : a + 2, b: 0 })
      for (const row of rows) if (row.y > row.x) pool.push({ a: 1, b: row.y - row.x })
    }
  } else {
    for (const row of rows) for (const k of [-2, -1, 1, 2]) pool.push({ a: a + k, b: row.y - (a + k) * row.x })
    pool.push({ a, b: b + 1 }, { a, b: b - 1 }, { a: b, b: a }, { a: -a, b })
  }
  const key = ruleText(rule, g)
  const seen = new Set([key])
  const good: Rule[] = []
  const rest: Rule[] = []
  for (const r of shuffle(pool)) {
    if (r.d === undefined && (r.a === 0 || (r.a === 1 && r.b === 0) || Math.abs(r.b) > 40)) continue
    if (r.d === undefined && g <= 6 && r.a < 1) continue
    const k = ruleText(r, g)
    if (seen.has(k)) continue
    const f = fits(r)
    if (f >= rows.length) continue
    seen.add(k)
    ;(f > 0 ? good : rest).push(r)
  }
  const picked = [...good, ...rest].slice(0, 3)
  for (let k = 3; picked.length < 3; k++) {
    const r = { a: d ? 1 : a, b: b + k * 5 }
    if (!seen.has(ruleText(r, g))) picked.push(r)
  }
  return shuffle([rule, ...picked])
}

const HINT: Partial<Record<Grade, string>> = {
  3: 'İpucu: giren ve çıkan sayı arasındaki farka bak. Hep aynı mı?',
  4: 'İpucu: çıkan sayı, girenin kaç katı ya da kaçta biri?',
}
const DEFAULT_HINT = 'İpucu: tabloda giren sayı 1 artınca çıkan ne kadar değişiyor? Sonra 0’ı atmayı dene!'

const INSIGHT: Record<Grade, string> = {
  1: '', 2: '',
  3: 'Giren ve çıkan sayılar arasındaki fark hep aynıysa kural bir toplama ya da çıkarmadır. Farkı bulmak için kaç sayı denemek yeterliydi?',
  4: 'Çıkan sayı girenin hep aynı katıysa kural çarpmadır, hep aynı parçasıysa bölmedir. Bunu toplama kuralından nasıl ayırt ettin?',
  5: 'İki adımlı kurallarda, giren 1 artınca çıkanın ne kadar arttığı çarpanı; 0 atınca çıkan sayı da eklenen sayıyı verir.',
  6: '2n + 1 gibi bir ifade, makinenin kuralını kısaca yazmanın yoludur: n yerine hangi sayıyı koyarsan koy, sonucu hesaplayabilirsin.',
  7: 'Katsayı negatifse giren sayı büyüdükçe çıkan sayı küçülür. Bunu tabloda fark ettin mi?',
  8: 'y = ax + b doğrusal bir fonksiyondur: x 1 artınca y hep a kadar değişir; x = 0 iken y = b olur.',
}

function Ball({ v, fill }: { v: number; fill: string }) {
  const t = show(v)
  return (
    <g>
      <circle r={19} fill={fill} stroke="#fff" strokeWidth={3} />
      <text y={t.length > 3 ? 4.5 : 6} textAnchor="middle" fontSize={t.length > 4 ? 11 : t.length > 3 ? 13 : 17} fontWeight={900} fill="#fff">{t}</text>
    </g>
  )
}

function MachineSvg({ color, feed, last }: { color: string; feed: { x: number; stage: string } | null; last: { x: number; y: number } | null }) {
  const inBall = useRef<SVGGElement>(null)
  const working = feed !== null && feed.stage !== 'out'
  useEffect(() => {
    if (feed?.stage === 'in') {
      inBall.current?.animate(
        [{ transform: 'translateY(0px) scale(1)', opacity: 1 }, { transform: 'translateY(56px) scale(0.45)', opacity: 0 }],
        { duration: 380, easing: 'ease-in', fill: 'forwards' },
      )
    }
  }, [feed])
  const spin = { transformBox: 'fill-box', transformOrigin: 'center' } as const
  return (
    <svg viewBox="0 0 320 190" className="mx-auto block w-full max-w-sm" role="img" aria-label={last ? `Makine: ${show(last.x)} girdi, ${show(last.y)} çıktı` : 'Sihirli makine'}>
      <rect x={78} y={154} width={14} height={22} rx={3} fill="#475569" />
      <rect x={228} y={154} width={14} height={22} rx={3} fill="#475569" />
      <path d="M128 30 L192 30 L178 56 L142 56 Z" fill="#fbcfe8" stroke={color} strokeWidth={3} strokeLinejoin="round" />
      <rect x={60} y={54} width={200} height={104} rx={20} fill={color} />
      <rect x={60} y={54} width={200} height={14} rx={7} fill="#ffffff33" />
      <rect x={80} y={72} width={100} height={52} rx={12} fill="#ffffffd9" />
      <g style={spin} className={working ? 'animate-spin' : ''}>
        <circle cx={112} cy={98} r={15} fill="none" stroke="#475569" strokeWidth={7} strokeDasharray="5 3.5" />
        <circle cx={112} cy={98} r={9} fill="#94a3b8" />
      </g>
      <g style={{ ...spin, animationDirection: 'reverse' }} className={working ? 'animate-spin' : ''}>
        <circle cx={148} cy={102} r={11} fill="none" stroke="#64748b" strokeWidth={6} strokeDasharray="4 3" />
        <circle cx={148} cy={102} r={6} fill="#cbd5e1" />
      </g>
      <rect x={190} y={72} width={54} height={52} rx={12} fill="#1f2340" />
      <text x={217} y={108} textAnchor="middle" fontSize={30} fontWeight={900} fill="#facc15">?</text>
      {[96, 116, 136].map((cx, i) => (
        <circle key={cx} cx={cx} cy={140} r={5} fill={working ? ['#facc15', '#4ade80', '#60a5fa'][i] : '#ffffff66'} className={working ? 'animate-pulse' : ''} />
      ))}
      <rect x={244} y={126} width={42} height={18} rx={5} fill="#334155" />
      <path d="M270 135 h10 m-4 -4 l4 4 l-4 4" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" />
      {feed && feed.stage === 'in' && (
        <g transform="translate(160 16)">
          <g ref={inBall} style={spin}><Ball v={feed.x} fill="#f97316" /></g>
        </g>
      )}
      {last && !working && (
        <>
          <g transform="translate(36 34)" opacity={0.85}><Ball v={last.x} fill="#f97316" /></g>
          <path d="M60 34 h56" stroke="#f97316" strokeWidth={2} strokeDasharray="4 4" />
          <g key={`${last.x}`} transform="translate(292 168)">
            <g style={spin} className="animate-pop"><Ball v={last.y} fill="#16a34a" /></g>
          </g>
        </>
      )}
    </svg>
  )
}

export default function RuleMachine({ grade, onFinish }: GameProps) {
  const g: Grade = grade < 3 ? 3 : grade
  const [machines] = useState(() => {
    const out: Machine[] = []
    for (let i = 0; out.length < MACHINES && i < 200; i++) {
      const m = makeMachine(g, COLORS[out.length])
      if (!out.some((o) => ruleText(o.rule, g) === ruleText(m.rule, g))) out.push(m)
    }
    while (out.length < MACHINES) out.push(makeMachine(g, COLORS[out.length]))
    return out
  })
  const startVal = (m: Machine) => (m.ok(5) && m.min <= 5 ? 5 : m.chips[0])
  const [mi, setMi] = useState(0)
  const m = machines[mi]
  const [rows, setRows] = useState<Row[]>([])
  const [phase, setPhase] = useState<Phase>('explore')
  const [val, setVal] = useState(() => startVal(machines[0]))
  const [feed, setFeed] = useState<{ x: number; stage: 'in' | 'work' | 'out' } | null>(null)
  const [last, setLast] = useState<{ x: number; y: number } | null>(null)
  const [challenge, setChallenge] = useState<number[]>([])
  const [answers, setAnswers] = useState(['', '', ''])
  const [results, setResults] = useState<boolean[] | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [options, setOptions] = useState<Rule[]>([])
  const [wrong, setWrong] = useState<number[]>([])
  const [msg, setMsg] = useState<Msg | null>(null)
  const [score, setScore] = useState(0)
  const [gain, setGain] = useState(0)
  const [solved, setSolved] = useState(0)
  const [testsBefore, setTestsBefore] = useState(0)
  const finished = useRef(false)
  const neg = m.min < 0
  const tests = rows.filter((r) => r.src === 'test').length
  const say = (text: string, tone: Msg['tone']) => setMsg({ text, tone, key: Date.now() })

  // Makine çalışma adımları: içeri → dişliler → çıkış
  useEffect(() => {
    if (!feed) return
    const t = setTimeout(() => {
      if (feed.stage === 'in') setFeed({ ...feed, stage: 'work' })
      else if (feed.stage === 'work') {
        const y = apply(m.rule, feed.x)
        setRows((r) => [...r, { x: feed.x, y, src: 'test' }])
        setLast({ x: feed.x, y })
        setFeed({ ...feed, stage: 'out' })
        sfx.ok()
      } else setFeed(null)
    }, feed.stage === 'in' ? 380 : feed.stage === 'work' ? 650 : 250)
    return () => clearTimeout(t)
  }, [feed, m])

  const feedIn = (x: number) => {
    if (feed || phase !== 'explore') return
    if (!m.ok(x)) {
      sfx.bad()
      return say(m.reject, 'bad')
    }
    const old = rows.find((r) => r.x === x)
    if (old) return say(`${show(x)} sayısını zaten denedin: ${show(x)} → ${show(old.y)}. Tabloya bak!`, 'info')
    setMsg(null)
    setFeed({ x, stage: 'in' })
  }

  const startChallenge = () => {
    const tested = rows.map((r) => r.x)
    const span = m.max - m.min
    let pool = range(m.min, m.max).filter((x) => m.ok(x) && !tested.includes(x))
    if (pool.length < 3) pool = range(m.min - (neg ? span : 0), m.max + span).filter((x) => m.ok(x) && !tested.includes(x))
    setChallenge(shuffle(pool).slice(0, 3).sort((p, q) => p - q))
    setAnswers(['', '', ''])
    setResults(null)
    setMsg(null)
    setPhase('predict')
  }

  const check = () => {
    if (phase !== 'predict') return
    const vals = answers.map(normalizeAnswer)
    if (vals.some((v) => v === '')) return say('Önce üç kutunun hepsini doldur.', 'info')
    const res = challenge.map((x, i) => Number(vals[i]) === apply(m.rule, x))
    const right = res.filter(Boolean).length
    const pts = right * (attempt === 0 ? 10 : 3)
    const all = [...rows, ...challenge.map((x) => ({ x, y: apply(m.rule, x), src: 'challenge' as const }))]
    setResults(res)
    setRows(all)
    setScore(score + pts)
    setGain(gain + pts)
    if (right === 3) {
      sfx.ok()
      setOptions(makeOptions(m.rule, all, g))
      setWrong([])
      setPhase('choose')
      say(`Üç tahmin de doğru! +${pts} Şimdi makinenin kuralını seç.`, 'ok')
    } else {
      sfx.bad()
      setAttempt(attempt + 1)
      setPhase('checked')
      say(`${right} tahmin doğru. Makinenin verdiği sayılara bak.`, 'bad')
    }
  }

  const choose = (i: number) => {
    if (phase !== 'choose' || wrong.includes(i)) return
    const r = options[i]
    if (r === m.rule) {
      sfx.ok()
      const bonus = tests <= 3 ? 20 : tests <= 5 ? 10 : 0
      const pts = (wrong.length === 0 ? 20 : wrong.length === 1 ? 10 : 0) + bonus
      setScore(score + pts)
      setGain(gain + pts)
      setSolved(solved + 1)
      setPhase('solved')
      say(`Doğru kural! +${pts}${bonus ? ` (${tests} denemede çözdüğün için +${bonus} bonus dahil)` : ''}`, 'ok')
    } else {
      sfx.bad()
      setWrong([...wrong, i])
      const bad = rows.find((row) => Math.abs(apply(r, row.x) - row.y) > 1e-9)!
      say(`${ruleText(r, g)} kuralı ${inputName(g)}${show(bad.x)} için ${show(apply(r, bad.x))} verir, ama makine ${show(bad.y)} verdi.`, 'bad')
    }
  }

  const nextMachine = () => {
    const allTests = testsBefore + tests
    if (mi + 1 >= MACHINES) {
      if (finished.current) return
      finished.current = true
      onFinish({
        stars: starsFor(score / (MACHINES * PER_MACHINE)),
        score,
        summary: `${MACHINES} makinenin ${solved} tanesinin kuralını çözdün; toplam ${allTests} deneme yaptın.`,
        insight: INSIGHT[g],
      })
      return
    }
    const nm = machines[mi + 1]
    setTestsBefore(allTests)
    setMi(mi + 1)
    setRows([])
    setPhase('explore')
    setVal(startVal(nm))
    setFeed(null)
    setLast(null)
    setAttempt(0)
    setResults(null)
    setGain(0)
    setMsg(null)
  }

  const step = (dv: number) => setVal(Math.min(m.max, Math.max(m.min, val + dv)))
  const sorted = [...rows].sort((p, q) => p.x - q.x)
  const failed = phase === 'checked' && attempt >= 2
  const revealRule = phase === 'solved' || failed

  return (
    <div className="animate-fade-up">
      <Hud round={mi + 1} rounds={MACHINES} score={score} extra={<span className="chip bg-pink-50 px-3 py-1.5 text-sm text-pink-800 ring-1 ring-pink-200">🎰 {tests} deneme</span>} />

      <div className="card relative px-2 pt-2 pb-1">
        <p className="absolute top-3 left-4 text-xs font-extrabold tracking-wide text-ink-soft uppercase">Makine {mi + 1}</p>
        <MachineSvg key={mi} color={m.color} feed={feed} last={last} />
        {revealRule && (
          <p className="mx-auto mb-2 w-fit rounded-2xl bg-ink px-4 py-1.5 text-center text-lg font-black text-white animate-pop">Kural: {ruleText(m.rule, g)}</p>
        )}
      </div>

      {/* Giriş-çıkış tablosu */}
      <div className="card mt-3 overflow-x-auto p-2">
        {rows.length === 0 ? (
          <p className="py-2 text-center text-sm font-bold text-ink-soft">Henüz bir sayı atmadın. Aşağıdan bir sayı seç!</p>
        ) : (
          <table className="mx-auto border-separate border-spacing-1 text-center tabular-nums">
            <tbody>
              {(['x', 'y'] as const).map((k) => (
                <tr key={k}>
                  <th className="sticky left-0 bg-white px-2 text-left text-xs font-extrabold text-ink-soft uppercase">{g === 8 ? k : k === 'x' ? 'Giren' : 'Çıkan'}</th>
                  {sorted.map((r) => (
                    <td key={r.x} className={`min-w-11 rounded-lg px-2 py-1 text-lg font-black ${k === 'x' ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'} ${r.src === 'challenge' ? 'ring-2 ring-pink-300' : ''}`}>
                      {show(r[k])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {msg && <Toast key={msg.key} text={msg.text} tone={msg.tone} />}

      {phase === 'explore' && (
        <div className="mt-4">
          <div className="flex flex-wrap justify-center gap-2">
            {m.chips.map((x) => (
              <button key={x} type="button" onClick={() => feedIn(x)} disabled={!!feed} aria-label={`${show(x)} sayısını makineye at`} className="grid min-h-12 min-w-12 place-items-center rounded-full bg-orange-500 px-3 text-lg font-black text-white shadow-[0_3px_0_#c2410c] transition active:translate-y-[2px] active:shadow-none disabled:opacity-50">
                {show(x)}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-end justify-center gap-2">
            <ToolButton onClick={() => step(-10)} disabled={!!feed || val - 10 < m.min}>−10</ToolButton>
            <Stepper label="Başka sayı" value={show(val)} onDec={() => step(-1)} onInc={() => step(1)} disabled={!!feed} color="#ea580c" />
            <ToolButton onClick={() => step(10)} disabled={!!feed || val + 10 > m.max}>+10</ToolButton>
            <button type="button" onClick={() => feedIn(val)} disabled={!!feed} className="btn-primary min-h-13">At!</button>
          </div>
          <div className="mt-4 text-center">
            <button type="button" onClick={startChallenge} disabled={tests < 2 || !!feed} className="btn-primary w-full max-w-sm bg-pink-600 shadow-[0_4px_0_#9d174d]">
              Kuralı buldum, tahmin et!
            </button>
            <p className="mt-1.5 text-xs font-bold text-ink-soft">{tests < 2 ? 'Önce en az 2 sayı dene.' : 'Az denemeyle çözersen bonus puan!'}</p>
          </div>
        </div>
      )}

      {(phase === 'predict' || phase === 'checked') && (
        <div className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-line">
          <p className="mb-3 text-center font-black">Makine bu sayılar için ne verir?</p>
          <div className="space-y-2">
            {challenge.map((x, i) => (
              <div key={x} className="flex items-center justify-center gap-2">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-orange-500 text-lg font-black text-white">{show(x)}</span>
                <ArrowRight size={20} className="shrink-0 text-ink-soft" />
                {neg && phase === 'predict' && (
                  <button type="button" onClick={() => setAnswers(answers.map((a, j) => (j === i ? (a.startsWith('-') ? a.slice(1) : `-${a}`) : a)))} className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-base font-black ring-1 ring-line" aria-label="Eksi işaretini değiştir">+/−</button>
                )}
                <input
                  value={answers[i]}
                  onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value.replace(/[^0-9\-−]/g, '').slice(0, 6) : a)))}
                  onKeyDown={(e) => e.key === 'Enter' && check()}
                  disabled={phase !== 'predict'}
                  inputMode="numeric"
                  aria-label={`${show(x)} için çıkan sayı`}
                  className={`h-12 w-24 rounded-xl border-2 bg-white text-center text-xl font-black tabular-nums outline-none focus:border-brand ${results ? (results[i] ? 'border-green-400 bg-green-50' : 'border-orange-400 bg-orange-50') : 'border-line'}`}
                />
                {results && (results[i]
                  ? <Check size={24} className="shrink-0 text-ok" aria-label="Doğru" />
                  : <span className="flex shrink-0 items-center gap-1 text-sm font-black text-orange-700"><X size={20} aria-label="Yanlış" />{show(apply(m.rule, x))}</span>)}
              </div>
            ))}
          </div>
          {phase === 'predict' ? (
            <button type="button" onClick={check} className="btn-primary mt-4 w-full">Kontrol et</button>
          ) : failed ? (
            <div className="mt-4 text-center">
              <p className="font-bold text-ink-soft">Bu makine zorluydu! Kuralı yukarıda görebilirsin; tabloda kontrol et.</p>
              <button type="button" onClick={nextMachine} className="btn-primary mt-3 w-full" autoFocus>{mi + 1 >= MACHINES ? 'Bitir' : 'Sonraki makine'}<ArrowRight size={18} /></button>
            </div>
          ) : (
            <div className="mt-4 text-center">
              <p className="text-sm font-bold text-ink-soft">{HINT[g] ?? DEFAULT_HINT}</p>
              <button type="button" onClick={() => { setPhase('explore'); setMsg(null) }} className="btn-primary mt-3 w-full" autoFocus>Makineyi biraz daha dene</button>
            </div>
          )}
        </div>
      )}

      {phase === 'choose' && (
        <div className="mt-4">
          <p className="mb-2 text-center font-black">Makinenin kuralı hangisi?</p>
          <div className="grid grid-cols-2 gap-2">
            {options.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => choose(i)}
                disabled={wrong.includes(i)}
                className={`min-h-14 rounded-2xl px-2 text-lg font-black ring-2 transition active:scale-95 sm:text-xl ${wrong.includes(i) ? 'bg-orange-50 text-orange-300 line-through ring-orange-200 animate-shake' : 'bg-white text-ink ring-pink-200 hover:bg-pink-50'}`}
              >
                {ruleText(r, g)}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'solved' && (
        <div className="mt-4 rounded-3xl bg-ok-soft p-4 text-center ring-1 ring-green-200 animate-pop">
          <p className="text-xl font-black text-green-800">Makineyi çözdün! Bu makineden {gain} puan.</p>
          <button type="button" onClick={nextMachine} className="btn-primary mt-3 w-full max-w-xs" autoFocus>{mi + 1 >= MACHINES ? 'Bitir' : 'Sonraki makine'}<ArrowRight size={18} /></button>
        </div>
      )}
    </div>
  )
}

