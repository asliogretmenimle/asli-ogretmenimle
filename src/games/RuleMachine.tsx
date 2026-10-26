import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Delete, Lightbulb, Plus, Sparkles, Trash2, Wand2 } from 'lucide-react'
import type { Grade } from '../data/types'
import { randInt, shuffle } from '../lib/random'
import { fmt, normalizeAnswer } from '../lib/format'
import { ek } from '../lib/generators'
import { sfx } from '../lib/feedback'
import { useTracker } from '../lib/trackerContext'
import { Stepper, ToolButton } from '../manipulatives/ui'
import { signed, starsFor, type GameProps } from './kit'
import { LevelDots, Nudge, Scene, SolutionList, StrategyPicker, useAge, useSolutions } from './kit2'

/**
 * Sihirli Makine → Örüntüden Kurala (Van de Walle: fonksiyon makinesi, genelleme)
 *  1. Keşfet: kendi seçtiğin sayıları makineye at, giriş-çıkış tablosu oluşsun.
 *  2. Uzak terim: tabloda olmayan büyük bir sayı için çıktıyı tahmin et.
 *  3. Kuralı yaz: 3–5. sınıf adım adım (sözel + □ ile), 6–8. sınıf cebirsel ifadeyle.
 *  4. Aynı kuralı başka biçimde yaz: 2(n + 1) ile 2n + 2 farklı ama denk çözümlerdir.
 */

/** f(x) = d ? x ÷ d : a·x + b */
interface Rule { a: number; b: number; d?: number }
interface Machine { rule: Rule; min: number; max: number; ok: (x: number) => boolean; chips: number[]; color: string; far: number }
interface Row { x: number; y: number; far?: boolean }
type Op = '+' | '-' | '*' | '/'
interface Step { op: Op; k: number }
type Phase = 'explore' | 'far' | 'write' | 'more'

const MACHINES = 4
const COLORS = ['#db2777', '#7c3aed', '#0891b2', '#ea580c']
const apply = (r: Rule, x: number) => (r.d ? x / r.d : r.a * x + r.b)
const show = (v: number) => signed(fmt(v))
const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
const near = (p: number, q: number) => Math.abs(p - q) < 1e-9

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

function makeMachine(g: Grade, color: string): Machine {
  let rule: Rule
  let min = 0, max = 20, far = 50
  let ok = (_x: number) => true
  if (g <= 3) {
    const n = randInt(3, 25)
    rule = { a: 1, b: Math.random() < 0.55 ? n : -n }
    max = 99
    far = 100
    ok = (x) => x + rule.b >= 0
  } else if (g === 4) {
    if (Math.random() < 0.5) {
      rule = { a: randInt(2, 9), b: 0 }
      far = 100
    } else {
      const d = randInt(2, 9)
      rule = { a: 1, b: 0, d }
      max = 100
      far = d * randInt(30, 60)
      ok = (x) => x % d === 0
    }
  } else if (g === 5 || g === 6) {
    const a = randInt(2, g === 5 ? 5 : 6)
    let b = 0
    while (b === 0) b = Math.random() < 0.75 ? randInt(1, 12) : -randInt(1, a - 1)
    rule = { a, b }
    ok = (x) => a * x + b >= 0
    far = 100
  } else {
    let a = 0, b = 0
    while (a === 0 || (a === 1 && b === 0)) {
      a = g === 7 ? (Math.random() < 0.7 ? -randInt(1, 5) : randInt(2, 5)) : randInt(-5, 5)
      b = randInt(g === 7 ? -9 : -10, g === 7 ? 9 : 10)
    }
    rule = { a, b }
    min = -10
    max = 10
    far = Math.random() < 0.5 ? 50 : -20
  }
  const valid = range(min, max).filter(ok)
  const chips = shuffle(valid).slice(0, 5)
  return { rule, min, max, ok, chips: chips.sort((p, q) => p - q), color, far }
}

// ─── Kural yazımı: adımlı (3–5) ────────────────────────────────────────────
const OPS: { op: Op; sym: string }[] = [{ op: '+', sym: '+' }, { op: '-', sym: '−' }, { op: '*', sym: '×' }, { op: '/', sym: '÷' }]
const sym = (op: Op) => OPS.find((o) => o.op === op)!.sym
const runSteps = (steps: Step[], x: number) => steps.reduce((v, s) => (s.op === '+' ? v + s.k : s.op === '-' ? v - s.k : s.op === '*' ? v * s.k : v / s.k), x)
function stepsExpr(steps: Step[]): string {
  let e = '□'
  steps.forEach((s, i) => {
    const mul = s.op === '*' || s.op === '/'
    const prevAdd = i > 0 && (steps[i - 1].op === '+' || steps[i - 1].op === '-')
    e = `${mul && prevAdd ? `(${e})` : e} ${sym(s.op)} ${s.k}`
  })
  return e
}
function stepsWords(steps: Step[]): string {
  const w = (s: Step) => (s.op === '+' ? `${s.k} ekle` : s.op === '-' ? `${s.k} çıkar` : s.op === '*' ? `${s.k} ile çarp` : `${ek(s.k, 'dat')} böl`)
  return `Sayıya ${steps.map(w).join(', sonra ')}.`
}

// ─── Kural yazımı: cebirsel ifade (6–8) ─────────────────────────────────────
type Fn = (x: number) => number
/** n/x değişkenli basit ifade ayrıştırıcı: 2n + 3, 2(n + 1), −3x + 4, n·2 − 1 … */
function parseExpr(src: string): Fn | null {
  const s = src.replace(/\s+/g, '').replace(/[×·*]/g, '*').replace(/[÷:/]/g, '/').replace(/[−–]/g, '-').replace(/[xX]/g, 'n')
  let i = 0
  const peek = () => s[i]
  const num = (): Fn | null => {
    let t = ''
    while (i < s.length && /[0-9,.]/.test(s[i])) t += s[i++]
    if (!t) return null
    const v = Number(t.replace(',', '.'))
    return Number.isNaN(v) ? null : () => v
  }
  const primary = (): Fn | null => {
    const c = peek()
    if (c === 'n') {
      i++
      return (x) => x
    }
    if (c === '(') {
      i++
      const e = expr()
      if (!e || peek() !== ')') return null
      i++
      return e
    }
    return num()
  }
  const unary = (): Fn | null => {
    if (peek() === '-') {
      i++
      const u = unary()
      return u ? (x) => -u(x) : null
    }
    if (peek() === '+') {
      i++
      return unary()
    }
    return primary()
  }
  const term = (): Fn | null => {
    let left: Fn | null = unary()
    if (!left) return null
    for (;;) {
      const c = peek()
      if (c === '*' || c === '/') {
        i++
        const r = unary()
        if (!r) return null
        const l: Fn = left
        left = c === '*' ? (x) => l(x) * r(x) : (x) => l(x) / r(x)
      } else if (c === 'n' || c === '(' || (c !== undefined && /[0-9]/.test(c) && /[n)]/.test(s[i - 1]))) {
        const r = primary()
        if (!r) return null
        const l: Fn = left
        left = (x) => l(x) * r(x)
      } else return left
    }
  }
  function expr(): Fn | null {
    let left: Fn | null = term()
    if (!left) return null
    while (peek() === '+' || peek() === '-') {
      const c = s[i++]
      const r = term()
      if (!r) return null
      const l: Fn = left
      left = c === '+' ? (x) => l(x) + r(x) : (x) => l(x) - r(x)
    }
    return left
  }
  if (!s.includes('n')) return null
  const f = expr()
  return f && i === s.length ? f : null
}
/** Denk yazılışları ayırt etmek için anahtar: üst düzey toplananlar sıralanır (2n+2 ile 2+2n aynı, 2(n+1) farklı) */
function exprKey(src: string): string {
  const s = src.replace(/\s+/g, '').replace(/[×·*]/g, '*').replace(/[−–]/g, '-').replace(/[xX]/g, 'n').replace(/(\d)\*n/g, '$1n')
  const parts: string[] = []
  let depth = 0, cur = ''
  for (const c of s) {
    if ((c === '+' || c === '-') && depth === 0 && cur) {
      parts.push(cur)
      cur = c === '-' ? '-' : ''
      continue
    }
    if (c === '(') depth++
    if (c === ')') depth--
    cur += c
  }
  if (cur) parts.push(cur)
  return parts.map((p) => p.replace(/^\+/, '')).sort().join('+')
}
const pretty = (src: string) => src.replace(/\*/g, '·').replace(/-/g, '−').replace(/\//g, '÷').replace(/([+−÷·])/g, ' $1 ').replace(/\( /g, '(').replace(/ \)/g, ')').replace(/^ − /, '−').replace(/\( ?− /g, '(−').replace(/\s+/g, ' ').trim()

/** Doğrusal mı? Öyleyse eğim ve sabit */
function linear(f: Fn): { a: number; b: number } | null {
  const b = f(0), a = f(1) - b
  return [2, 3, -2, 7].every((x) => Math.abs(f(x) - (a * x + b)) < 1e-6) ? { a, b } : null
}

const INSIGHT: Record<Grade, string> = {
  1: '', 2: '',
  3: 'Giren ve çıkan arasındaki fark hep aynıysa kural bir toplama ya da çıkarmadır. Aynı makineyi iki adımla (ör. +10 −3) da yapabildin mi?',
  4: 'Çıkan sayı girenin hep aynı katıysa kural çarpmadır, hep aynı parçasıysa bölmedir. × 4 yerine × 2 × 2 yazmak neden aynı makineyi verir?',
  5: 'İki adımlı kurallarda giren 1 artınca çıkanın ne kadar arttığı çarpanı, 0 atınca çıkan sayı da eklenen sayıyı verir. (□ + 1) × 2 ile □ × 2 + 2 neden aynı makinedir?',
  6: '2(n + 1) ile 2n + 2 farklı görünür ama her n için aynı sonucu verir: denk ifadelerdir. Dağılma özelliği bunu açıklar.',
  7: 'Katsayı negatifse giren büyüdükçe çıkan küçülür. −2n + 6 ile 6 − 2n ve −2(n − 3) aynı kuralı söyler.',
  8: 'y = ax + b doğrusal bir fonksiyondur: x 1 artınca y hep a kadar değişir; x = 0 iken y = b olur. Aynı fonksiyonu farklı biçimlerde yazabilirsin.',
}

const STRATS = ['Giren–çıkan farkına baktım', 'Çıkan girenin kaç katı diye baktım', 'Ardışık sayılar atıp değişime baktım', '0’ı atıp başlangıca baktım', 'Tahmin edip test ettim']

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
            <g style={spin} className="animate-pop"><Ball v={last.y} fill="#db2777" /></g>
          </g>
        </>
      )}
    </svg>
  )
}

const KEYS = ['7', '8', '9', '(', ')', '4', '5', '6', '×', '÷', '1', '2', '3', '+', '−', '0', 'n']

export default function RuleMachine({ grade, onFinish }: GameProps) {
  const g: Grade = grade < 3 ? 3 : grade
  const algebra = g >= 6
  const v = g === 8 ? 'x' : 'n'
  const age = useAge(grade)
  const dark = age.tier === 'atolye'
  const track = useTracker()
  const sols = useSolutions()
  const [machines] = useState(() => {
    const out: Machine[] = []
    for (let i = 0; out.length < MACHINES && i < 200; i++) {
      const m = makeMachine(g, COLORS[out.length])
      if (!out.some((o) => ruleText(o.rule, g) === ruleText(m.rule, g))) out.push(m)
    }
    while (out.length < MACHINES) out.push(makeMachine(g, COLORS[out.length]))
    return out
  })
  const [mi, setMi] = useState(0)
  const m = machines[mi]
  const [rows, setRows] = useState<Row[]>([])
  const [phase, setPhase] = useState<Phase>('explore')
  const [val, setVal] = useState(() => (machines[0].ok(5) ? 5 : machines[0].chips[0]))
  const [feed, setFeed] = useState<{ x: number; stage: 'in' | 'work' | 'out' } | null>(null)
  const [last, setLast] = useState<{ x: number; y: number } | null>(null)
  const [farAns, setFarAns] = useState('')
  const [farRes, setFarRes] = useState<boolean | null>(null)
  const [steps, setSteps] = useState<Step[]>([{ op: '+', k: 1 }])
  const [expr, setExpr] = useState('')
  const [wrongs, setWrongs] = useState(0)
  const [nudge, setNudge] = useState<{ q: string; mis?: string; row?: number; key: number } | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [found, setFound] = useState<{ key: string; label: string; words?: string }[]>([])
  const [revealed, setRevealed] = useState(false)
  const [picked, setPicked] = useState(false)
  const stats = useRef({ solved: 0, firstTry: 0, forms: 0, farOk: 0, triedZero: false, triedConsec: false, over: false })
  const tests = rows.filter((r) => !r.far).length

  // Makine çalışma adımları: içeri → dişliler → çıkış
  useEffect(() => {
    if (!feed) return
    const t = setTimeout(() => {
      if (feed.stage === 'in') setFeed({ ...feed, stage: 'work' })
      else if (feed.stage === 'work') {
        const y = apply(m.rule, feed.x)
        setRows((r) => [...r.filter((q) => q.x !== feed.x), { x: feed.x, y, far: phase === 'far' }])
        setLast({ x: feed.x, y })
        setFeed({ ...feed, stage: 'out' })
        sfx.ok()
      } else setFeed(null)
    }, feed.stage === 'in' ? 380 : feed.stage === 'work' ? 650 : 250)
    return () => clearTimeout(t)
  }, [feed, m, phase])

  const feedIn = (x: number) => {
    if (feed || phase !== 'explore') return
    if (!m.ok(x)) {
      return setInfo(m.rule.d ? `Makine ${show(x)} sayısını geri verdi: bu sayı ${m.rule.d} eş parçaya tam bölünmüyor. Hangi sayıları kabul ediyor olabilir?` : `Makine ${show(x)} sayısını geri verdi: çıkan sayı 0’dan küçük olurdu. Daha büyük bir sayı dene.`)
    }
    if (rows.some((r) => r.x === x)) return setInfo(`${show(x)} sayısını zaten denedin; tabloya bak. Bilgi verecek yeni bir sayı seç.`)
    setInfo(null)
    const s = stats.current
    if (x === 0 && !s.triedZero) {
      s.triedZero = true
      track.strategy('0’ı atıp başlangıca baktı')
    }
    if (!s.triedConsec && rows.some((r) => Math.abs(r.x - x) === 1)) {
      s.triedConsec = true
      track.strategy('Ardışık sayılarla değişime baktı')
    }
    setFeed({ x, stage: 'in' })
  }

  const checkFar = () => {
    const raw = normalizeAnswer(farAns)
    if (raw === '' || Number.isNaN(Number(raw))) return setInfo('Önce bir sayı yaz.')
    const want = apply(m.rule, m.far)
    const ok = near(Number(raw), want)
    setFarRes(ok)
    track.attempt(ok)
    if (ok) {
      stats.current.farOk++
      sfx.ok()
    }
    setInfo(null)
    setFeed({ x: m.far, stage: 'in' })
    if (!ok) {
      const lin = !m.rule.d
      setNudge({
        key: Date.now(),
        q: lin
          ? `Makine ${show(m.far)} için ${show(want)} verdi. Tabloda giren 1 artınca çıkan hep kaç değişiyor? Bu, ${show(m.far)} gibi uzak bir sayıda da sürer mi?`
          : `Makine ${show(m.far)} için ${show(want)} verdi. Tablodaki her satırda çıkan, girenin kaçta biri?`,
        mis: m.rule.a !== 1 && !m.rule.d && near(Number(raw) - m.far, rows[0] ? rows[0].y - rows[0].x : NaN) ? 'Çarpımsal kuralı toplamsal sandı (yalnızca bir satırdaki farka baktı).' : undefined,
      })
    }
  }

  const candidate = (): { f: Fn; key: string; label: string; words?: string } | null => {
    if (!algebra) {
      if (steps.some((s) => (s.op === '+' || s.op === '-' ? s.k === 0 : s.k === 1) || (s.op === '/' && s.k === 0))) {
        setInfo('Bu adım sayıyı hiç değiştirmiyor. Makinenin gerçekten yaptığı bir adım seç.')
        return null
      }
      return { f: (x) => runSteps(steps, x), key: steps.map((s) => `${s.op}${s.k}`).join('|'), label: stepsExpr(steps), words: stepsWords(steps) }
    }
    const f = parseExpr(expr)
    if (!f) {
      setInfo(`Bu ifadeyi okuyamadım. ${v} harfini ve işlemleri kullan; ör. 3${v} + 1 ya da 2(${v} − 4).`)
      return null
    }
    return { f, key: exprKey(expr), label: `${g === 8 ? 'y = ' : ''}${pretty(expr.replace(/[xX]/g, v).replace(/n/g, v))}` }
  }

  const checkRule = () => {
    const c = candidate()
    if (!c) return
    setInfo(null)
    const xs = [...new Set([...rows.map((r) => r.x), ...range(m.min, m.max).filter(m.ok)])]
    const bad = xs.find((x) => !near(c.f(x), apply(m.rule, x)))
    track.attempt(bad === undefined)
    if (bad === undefined) {
      const isNew = !found.some((f) => f.key === c.key)
      if (!isNew) return setInfo('Bu yazılışı zaten buldun. Aynı kuralı başka bir biçimde yazabilir misin?')
      const first = found.length === 0
      setFound([...found, { key: c.key, label: c.label, words: c.words }])
      sols.add(`${mi}:${c.key}`, c.label)
      stats.current.forms++
      setNudge(null)
      if (first) {
        stats.current.solved++
        if (wrongs === 0 && !revealed) stats.current.firstTry++
        track.item(wrongs === 0 && !revealed)
        setPhase('more')
      } else sfx.ok()
      return
    }
    setWrongs(wrongs + 1)
    const want = apply(m.rule, bad)
    const got = c.f(bad)
    const inTable = rows.some((r) => r.x === bad)
    const lc = linear(c.f)
    let q = `Kuralın ${v === 'n' && algebra ? 'n = ' : v === 'x' ? 'x = ' : ''}${show(bad)} için ${show(Math.round(got * 100) / 100)} veriyor, makine ise ${show(want)} veriyor. ${inTable ? 'Tablodaki bu satıra bak.' : 'Bu sayıyı makineye atmayı dene!'}`
    let mis: string | undefined
    if (lc && !m.rule.d) {
      if (near(lc.a, m.rule.a) && !near(lc.b, m.rule.b)) {
        q = `Değişim doğru! Giren 1 artınca çıkan ${show(m.rule.a)} değişiyor. Peki makineye 0 atınca ne çıkar? Senin kuralın 0 için ne veriyor?`
        mis = 'Değişim miktarını buldu ama sabit terimi (başlangıç değerini) yanlış buldu.'
      } else if (near(lc.a, -m.rule.a)) {
        q = `Tabloya bak: giren büyüdükçe çıkan ${m.rule.a < 0 ? 'küçülüyor' : 'büyüyor'} mu? Senin kuralında ${v} büyüyünce sonuç ne yapıyor?`
        mis = 'Katsayının işaretini (artan/azalan ilişkiyi) gözden kaçırdı.'
      } else if (near(lc.a, 1) && m.rule.a !== 1) {
        q = `Kuralın bir satırda tutuyor olabilir, ama ${show(bad)} satırında tutmuyor. Giren 1 artınca çıkan kaç artıyor? Bu bir toplama mı, çarpma mı?`
        mis = 'Çarpımsal kuralı toplamsal sandı (yalnızca bir satırdaki farka baktı).'
      } else if (near(lc.a, m.rule.b) && near(lc.b, m.rule.a) && m.rule.a !== m.rule.b) {
        q = 'Sayılar doğru ama yerleri karışmış olabilir: hangisi her adımda eklenen değişim, hangisi baştaki sabit?'
        mis = 'Katsayı ile sabit terimi karıştırdı.'
      }
    }
    setNudge({ q, mis, row: bad, key: Date.now() })
  }

  const showHint = () => {
    track.hint()
    const r = m.rule
    const text = r.d
      ? `İpucu: Tablodaki her satırda girenle çıkanı karşılaştır. Giren, çıkanın kaç katı?`
      : r.a === 1
        ? `İpucu: Her satırda çıkan − giren farkını hesapla. Hep aynı mı?`
        : `İpucu: Giren 1 artınca çıkan ${show(r.a)} değişiyor. 0 atınca çıkan ${show(r.b)} olur. Bu iki bilgiyi kurala nasıl koyarsın?`
    setNudge({ q: text, key: Date.now() })
    if (wrongs >= 3) setRevealed(true)
  }

  const nextMachine = () => {
    if (mi + 1 >= MACHINES) {
      const s = stats.current
      if (s.over) return
      s.over = true
      onFinish({
        stars: starsFor((s.firstTry + s.farOk * 0.5 + Math.min(s.forms - s.solved, MACHINES) * 0.5) / (MACHINES * 1.5)),
        score: s.solved * 20 + s.firstTry * 10 + s.farOk * 10 + (s.forms - s.solved) * 15,
        summary: `${MACHINES} makinenin ${s.solved} tanesinin kuralını yazdın; toplam ${s.forms} farklı yazılış buldun.`,
        insight: INSIGHT[g],
      })
      return
    }
    const nm = machines[mi + 1]
    setMi(mi + 1)
    setRows([])
    setPhase('explore')
    setVal(nm.ok(5) && nm.min <= 5 ? 5 : nm.chips[0])
    setFeed(null)
    setLast(null)
    setFarAns('')
    setFarRes(null)
    setSteps([{ op: '+', k: 1 }])
    setExpr('')
    setWrongs(0)
    setNudge(null)
    setInfo(null)
    setFound([])
    setRevealed(false)
    setPicked(false)
  }

  const stepVal = (dv: number) => setVal(Math.min(m.max, Math.max(m.min, val + dv)))
  const sorted = [...rows].sort((p, q) => p.x - q.x)
  const panel = dark ? 'bg-slate-800/90 ring-1 ring-slate-600 text-slate-100' : 'bg-white/95 ring-1 ring-line text-ink'
  const soft = dark ? 'text-slate-300' : 'text-ink-soft'
  const kmax = g <= 4 ? 30 : 20
  const setStep = (i: number, s: Partial<Step>) => setSteps(steps.map((p, j) => (j === i ? { ...p, ...s } : p)))
  const press = (k: string) => setExpr((e) => (e + (k === 'n' ? v : k)).slice(0, 24))
  const phaseTitle = phase === 'explore' ? 'Keşfet: makineye sayı at' : phase === 'far' ? 'Uzak bir sayı için tahmin et' : phase === 'write' ? 'Kuralı yaz' : 'Başka bir yazılış bul'

  return (
    <Scene grade={grade} className="animate-fade-up">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <LevelDots current={mi} total={MACHINES} />
        <span className={`chip px-3 py-1 text-sm ${dark ? 'bg-slate-700 text-slate-100' : 'bg-white text-ink ring-1 ring-line'}`}>Makine {mi + 1} · {phaseTitle}</span>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
        <div className={`rounded-2xl px-2 pt-2 pb-1 ${dark ? 'bg-slate-800/70 ring-1 ring-slate-600' : 'bg-white/90 ring-1 ring-line'}`}>
          <MachineSvg key={mi} color={m.color} feed={feed} last={last} />
          {revealed && <p className="mx-auto mb-2 w-fit rounded-2xl bg-ink px-4 py-1.5 text-center text-lg font-black text-white animate-pop">Kural: {ruleText(m.rule, g)}</p>}
        </div>

        {/* Giriş-çıkış tablosu (dikey: çok satır sığar) */}
        <div className={`rounded-2xl p-2 ${panel}`}>
          <p className={`mb-1 px-1 text-xs font-extrabold tracking-wide uppercase ${soft}`}>Giriş–çıkış tablosu</p>
          {rows.length === 0 ? (
            <p className={`py-6 text-center text-sm font-bold ${soft}`}>Henüz bir sayı atmadın. Hangi sayı sana en çok bilgi verir?</p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full border-separate border-spacing-y-1 text-center tabular-nums">
                <thead>
                  <tr className={`text-xs font-extrabold uppercase ${soft}`}>
                    <th>{g === 8 ? 'x' : g >= 6 ? 'n' : 'Giren'}</th>
                    <th />
                    <th>{g === 8 ? 'y' : 'Çıkan'}</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => {
                    const hot = nudge?.row === r.x
                    return (
                      <tr key={r.x} className={hot ? 'animate-pop' : ''}>
                        <td className={`rounded-l-lg py-1 text-lg font-black ${hot ? 'bg-amber-200 text-amber-900' : 'bg-orange-50 text-orange-700'}`}>{show(r.x)}</td>
                        <td className={`w-8 ${hot ? 'bg-amber-200' : dark ? 'bg-slate-700' : 'bg-slate-50'}`}><ArrowRight size={16} className={`mx-auto ${soft}`} /></td>
                        <td className={`rounded-r-lg py-1 text-lg font-black ${hot ? 'bg-amber-200 text-amber-900' : 'bg-pink-50 text-pink-700'} ${r.far ? 'ring-2 ring-pink-400' : ''}`}>{show(r.y)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {info && <p className={`mx-auto mt-3 w-fit max-w-full rounded-2xl px-4 py-2 text-center text-sm font-extrabold animate-pop ${dark ? 'bg-slate-700 text-slate-100' : 'bg-white text-ink ring-1 ring-line'}`} aria-live="polite">{info}</p>}

      {phase === 'explore' && (
        <div className={`mt-3 rounded-2xl p-3 ${panel}`}>
          <p className="mb-2 text-sm font-black">Makineye hangi sayıyı atmak istersin? Kuralı ele verecek sayıları sen seç.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {m.chips.map((x) => (
              <button key={x} type="button" onClick={() => feedIn(x)} disabled={!!feed} aria-label={`${show(x)} sayısını makineye at`} className="grid min-h-12 min-w-12 place-items-center rounded-full bg-orange-500 px-3 text-lg font-black text-white shadow-[0_3px_0_#c2410c] transition active:translate-y-0.5 active:shadow-none disabled:opacity-50">
                {show(x)}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-end justify-center gap-2 text-ink">
            <ToolButton onClick={() => stepVal(-10)} disabled={!!feed || val - 10 < m.min}>−10</ToolButton>
            <Stepper label={<span className={soft}>Kendi sayın</span>} value={show(val)} onDec={() => stepVal(-1)} onInc={() => stepVal(1)} disabled={!!feed} color="#ea580c" />
            <ToolButton onClick={() => stepVal(10)} disabled={!!feed || val + 10 > m.max}>+10</ToolButton>
            <button type="button" onClick={() => feedIn(val)} disabled={!!feed} className="btn-primary min-h-13">At!</button>
          </div>
          <div className="mt-3 text-center">
            <button type="button" onClick={() => { setInfo(null); setPhase('far') }} disabled={tests < 3 || !!feed} className="btn-primary w-full max-w-sm bg-pink-600 shadow-[0_4px_0_#9d174d]">
              Örüntüyü gördüm, devam
            </button>
            <p className={`mt-1.5 text-xs font-bold ${soft}`}>{tests < 3 ? `Önce en az 3 sayı dene (${tests}/3).` : 'İstersen birkaç sayı daha deneyebilirsin.'}</p>
          </div>
        </div>
      )}

      {phase === 'far' && (
        <div className={`mt-3 rounded-2xl p-4 ${panel}`}>
          <p className="text-center text-lg font-black">Makineye <span className="text-orange-500">{show(m.far)}</span> atarsan ne çıkar?</p>
          <p className={`text-center text-sm font-bold ${soft}`}>Tabloda yok; denemeden, örüntüden yararlanarak karar ver.</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-orange-500 text-lg font-black text-white">{show(m.far)}</span>
            <ArrowRight size={20} className={soft} />
            {m.min < 0 && farRes === null && (
              <button type="button" onClick={() => setFarAns((a) => (a.startsWith('-') ? a.slice(1) : `-${a}`))} className="grid size-12 shrink-0 place-items-center rounded-xl bg-white text-base font-black text-ink ring-1 ring-line" aria-label="Eksi işaretini değiştir">+/−</button>
            )}
            <input
              value={farAns}
              onChange={(e) => setFarAns(e.target.value.replace(/[^0-9\-−,]/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && farRes === null && checkFar()}
              disabled={farRes !== null}
              inputMode="numeric"
              aria-label={`${show(m.far)} için çıkan sayı`}
              className={`h-12 w-28 rounded-xl border-2 bg-white text-center text-xl font-black text-ink tabular-nums outline-none focus:border-brand ${farRes === true ? 'border-green-400 bg-green-50' : farRes === false ? 'border-amber-400 bg-amber-50' : 'border-line'}`}
            />
          </div>
          {farRes === null ? (
            <button type="button" onClick={checkFar} className="btn-primary mt-3 w-full">Makineyle kontrol et</button>
          ) : (
            <>
              {farRes && <p className="mt-3 text-center font-black text-emerald-600">Örüntü uzak sayılarda da sürüyor! 🎉</p>}
              <button type="button" onClick={() => { setPhase('write'); setInfo(null); setNudge(null) }} disabled={!!feed} className="btn-primary mt-3 w-full">Şimdi kuralı yaz<ArrowRight size={18} /></button>
            </>
          )}
        </div>
      )}

      {nudge && (phase === 'far' || phase === 'write') && <Nudge key={nudge.key} question={nudge.q} misconception={nudge.mis} onClose={() => setNudge(null)} />}

      {(phase === 'write' || phase === 'more') && (
        <div className={`mt-3 rounded-2xl p-4 ${panel}`}>
          {phase === 'more' && (
            <div className="mb-3 rounded-2xl bg-emerald-50 p-3 text-emerald-900 ring-1 ring-emerald-200 animate-pop">
              <p className="flex items-center gap-1.5 font-black"><Sparkles size={18} className="text-amber-500" />Kural tablodaki her satıra uyuyor!</p>
              <p className="text-sm font-bold">Aynı makineyi başka bir yazılışla da anlatabilir misin? {algebra ? `Ör. parantezli ya da terimleri farklı sıralı bir ifade.` : 'Ör. iki adımla aynı sonuca ulaşan bir yol.'}</p>
            </div>
          )}
          <p className="mb-2 flex items-center gap-1.5 text-sm font-black"><Wand2 size={16} className="text-pink-500" />{algebra ? `Kuralı ${v} ile bir ifade olarak yaz` : 'Makine sayıya ne yapıyor? Adımları kur'}</p>

          {!algebra ? (
            <div className="space-y-2">
              {steps.map((s, i) => (
                <div key={i} className={`flex flex-wrap items-center gap-2 rounded-xl p-2 ${dark ? 'bg-slate-700/60' : 'bg-pink-50/60'}`}>
                  <span className={`text-xs font-black uppercase ${soft}`}>{i === 0 ? '1. adım' : 'sonra'}</span>
                  <div className="flex gap-1">
                    {OPS.map((o) => (
                      <button key={o.op} type="button" onClick={() => setStep(i, { op: o.op })} aria-pressed={s.op === o.op} aria-label={`İşlem ${o.sym}`} className={`grid size-12 place-items-center rounded-xl text-2xl font-black ring-1 transition active:scale-95 ${s.op === o.op ? 'bg-pink-600 text-white ring-pink-600' : 'bg-white text-ink ring-line'}`}>{o.sym}</button>
                    ))}
                  </div>
                  <div className="text-ink">
                    <Stepper label="" value={s.k} onDec={() => setStep(i, { k: Math.max(0, s.k - 1) })} onInc={() => setStep(i, { k: Math.min(kmax, s.k + 1) })} color="#db2777" />
                  </div>
                  {steps.length > 1 && (
                    <button type="button" onClick={() => setSteps(steps.filter((_, j) => j !== i))} className="grid size-11 place-items-center rounded-xl bg-white text-ink ring-1 ring-line" aria-label="Adımı sil"><Trash2 size={17} /></button>
                  )}
                </div>
              ))}
              {steps.length < 2 && (
                <button type="button" onClick={() => setSteps([...steps, { op: '+', k: 1 }])} className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-extrabold ring-1 ${dark ? 'bg-slate-700 text-slate-100 ring-slate-500' : 'bg-white text-ink ring-line'}`}><Plus size={16} />İkinci adım ekle</button>
              )}
              <div className="rounded-xl bg-ink px-4 py-2 text-center text-white">
                <p className="text-2xl font-black tabular-nums">{stepsExpr(steps)}</p>
                <p className="text-sm font-bold text-white/75">{stepsWords(steps)}</p>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-2 flex min-h-14 items-center justify-center rounded-xl bg-ink px-4 text-2xl font-black text-white tabular-nums" aria-live="polite">
                {g === 8 && <span className="mr-2 text-white/70">y =</span>}
                {expr ? pretty(expr) : <span className="text-base text-white/50">ör. 3{v} + 1</span>}
              </div>
              <div className="mx-auto grid max-w-md grid-cols-5 gap-1.5">
                {KEYS.map((k) => (
                  <button key={k} type="button" onClick={() => press(k)} className={`min-h-12 rounded-xl text-xl font-black ring-1 transition active:scale-95 ${k === 'n' ? 'bg-pink-600 text-white ring-pink-600' : /[0-9]/.test(k) ? 'bg-white text-ink ring-line' : 'bg-pink-50 text-pink-800 ring-pink-200'}`}>
                    {k === 'n' ? v : k}
                  </button>
                ))}
                <button type="button" onClick={() => setExpr((e) => e.slice(0, -1))} className="col-span-2 grid min-h-12 place-items-center rounded-xl bg-white text-ink ring-1 ring-line" aria-label="Sil"><Delete size={20} /></button>
                <button type="button" onClick={() => setExpr('')} className="min-h-12 rounded-xl bg-white text-sm font-extrabold text-ink ring-1 ring-line">Temizle</button>
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={checkRule} className="btn-primary flex-1">Kuralı makineyle test et</button>
            {phase === 'write' && wrongs >= 2 && (
              <button type="button" onClick={showHint} className="btn-ghost"><Lightbulb size={18} />İpucu</button>
            )}
          </div>

          {found.length > 0 && (
            <div className="text-ink">
              <SolutionList list={found.map((f) => ({ key: f.key, label: f.label }))} />
              {found[0].words && <p className={`mt-1 text-sm font-bold ${soft}`}>Sözle: {found[0].words}</p>}
            </div>
          )}
          {phase === 'more' && !picked && <StrategyPicker question="Kuralı nasıl buldun?" options={STRATS} onPick={() => setPicked(true)} />}
          {phase === 'more' && (
            <button type="button" onClick={nextMachine} className="btn-ghost mt-3 w-full">{mi + 1 >= MACHINES ? 'Bitir' : 'Sonraki makine'}<ArrowRight size={18} /></button>
          )}
        </div>
      )}
    </Scene>
  )
}
