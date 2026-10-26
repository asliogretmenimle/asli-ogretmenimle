import { useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { ArrowRight, Flag, HelpCircle, Route, Search } from 'lucide-react'
import type { Grade } from '../data/types'
import { pick, randInt, shuffle } from '../lib/random'
import { fmt } from '../lib/format'
import { ek } from '../lib/generators'
import { sfx } from '../lib/feedback'
import { MathText } from '../components/MathText'
import { useTracker } from '../lib/trackerContext'
import { signed, starsFor, type GameProps } from './kit'
import { LevelDots, Nudge, Scene, SolutionList, StrategyPicker, useAge, useSolutions } from './kit2'

/**
 * Sayı Labirenti (Van de Walle: özellik temelli akıl yürütme, birden çok çözüm, gerekçelendirme)
 *  - Süre ve can yok. Kurala uyan sayılardan geçerek 🚩’ten 🏁’e giden yollar bul; her labirentte birden çok yol var.
 *  - Kurala uymayan kutuya basınca soru soran bir ipucu çıkar (Nudge), adım atılmaz.
 *  - Çıkışa varınca yoldaki bir sayının kurala NEDEN uyduğunu gerekçelendir.
 *  - Son labirentte kural gizli: açık/kapalı örnek kutulardan kuralı keşfet.
 */

type Pt = [number, number]
interface Cell { label: string; v: number; ok: boolean; why: string; p?: number; q?: number; rat?: boolean }
type Data = Omit<Cell, 'ok' | 'why'>
interface Rule {
  text: string
  gen: () => Data
  test: (c: Data) => boolean
  why: (c: Data) => string
  /** Kurala uymayan kutuya basılınca sorulacak soru */
  ask: (c: Data) => string
  /** Yanlış ama akla yatkın gerekçe (kavram yanılgısı) */
  fake: (c: Data) => string
  mis: (c: Data) => string | undefined
}

const MAZES = 3
const DIRS: Pt[] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const key = (x: number, y: number) => `${x},${y}`
const isPrime = (n: number) => {
  if (n < 2) return false
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false
  return true
}
const isSquare = (n: number) => Number.isInteger(Math.sqrt(n))
const digits = (v: number) => String(Math.abs(v)).split('').map(Number)
const gen = (n: number) => ek(n, 'gen')
const dat = (n: number) => ek(n, 'dat')
const num = (lo: number, hi: number) => (): Data => {
  const v = randInt(lo, hi)
  return { label: String(v), v }
}

// ─── Kurallar ──────────────────────────────────────────────────────────────
const parity = (even: boolean): Rule => ({
  text: even ? 'Çift sayılar' : 'Tek sayılar',
  gen: num(10, 98),
  test: (c) => (c.v % 2 === 0) === even,
  why: (c) => `${c.v}: birler basamağı ${c.v % 10}, bu yüzden ${c.v % 2 ? 'tek' : 'çift'}.`,
  ask: (c) => `${c.v} ${even ? 'çift' : 'tek'} mi? Hangi basamağa bakman yeter?`,
  fake: (c) => `Onlar basamağı ${Math.floor(c.v / 10)} olduğu için.`,
  mis: (c) => ((Math.floor(c.v / 10) % 2 === 0) === even ? 'Tek-çift kararını onlar basamağına bakarak verdi.' : undefined),
})

const multiples = (d: number, hi = Math.max(60, d * 20)): Rule => ({
  text: `${gen(d)} katları`,
  gen: num(d, hi),
  test: (c) => c.v % d === 0,
  why: (c) => (c.v % d === 0 ? `${d} × ${c.v / d} = ${c.v}.` : `${d} × ${Math.floor(c.v / d)} = ${d * Math.floor(c.v / d)}, ${d} × ${Math.floor(c.v / d) + 1} = ${d * (Math.floor(c.v / d) + 1)}; ${c.v} arada kalıyor.`),
  ask: (c) => `${d}’er sayarak ${dat(c.v)} ulaşabilir misin? ${d} × ${Math.floor(c.v / d)} kaç eder?`,
  fake: (c) => `İçinde ${d} rakamı ${String(c.v).includes(String(d)) ? 'olduğu' : 'olmadığı'} için.`,
  mis: (c) => (String(c.v).includes(String(d)) ? 'Bir sayının katı olmayı, o rakamın sayıda geçmesiyle karıştırdı.' : undefined),
})

const divisible = (d: 3 | 4 | 6 | 9): Rule => ({
  text: `${dat(d)} tam bölünen sayılar`,
  gen: d === 6 ? num(12, 120) : num(100, 999),
  test: (c) => c.v % d === 0,
  why: (c) => {
    const ds = digits(c.v), s = ds.reduce((a, b) => a + b, 0)
    if (d === 4) return `Son iki basamağı ${String(c.v % 100).padStart(2, '0')}; bu sayı 4’e ${(c.v % 100) % 4 ? 'bölünmüyor' : 'bölünüyor'}.`
    if (d === 6) return `${c.v} ${c.v % 2 ? 'tek' : 'çift'}, rakamları toplamı ${s}: ${c.v % 6 === 0 ? 'hem 2’ye hem 3’e bölünüyor' : 'hem 2’ye hem 3’e bölünmüyor'}.`
    return `Rakamları toplamı ${ds.join(' + ')} = ${s}; ${s} sayısı ${dat(d)} ${s % d ? 'bölünmüyor' : 'bölünüyor'}.`
  },
  ask: (c) => (d === 4 ? `${c.v} sayısının son iki basamağı 4’e bölünüyor mu?` : d === 6 ? `${c.v} hem 2’ye hem 3’e bölünüyor mu?` : `${c.v} sayısının rakamları toplamı kaç? O toplam ${dat(d)} bölünüyor mu?`),
  fake: (c) => (d === 4 || d === 6 ? 'Çift sayı olduğu için.' : `Son rakamı ${c.v % 10} olduğu için.`),
  mis: (c) => ((d === 4 || d === 6) && c.v % 2 === 0 ? `Her çift sayının ${dat(d)} bölündüğünü düşündü.` : d === 9 && c.v % 3 === 0 ? '3’e bölünen her sayının 9’a da bölündüğünü düşündü.' : undefined),
})

const primeRule = (prime: boolean): Rule => ({
  text: prime ? 'Asal sayılar' : 'Bileşik sayılar',
  gen: () => {
    const v = Math.random() < 0.6 ? randInt(2, 49) * 2 - 1 : randInt(2, 60)
    return { label: String(v), v }
  },
  test: (c) => (prime ? isPrime(c.v) : c.v > 1 && !isPrime(c.v)),
  why: (c) => {
    if (c.v === 1) return '1’in yalnızca bir böleni var; asal da bileşik de değil.'
    if (isPrime(c.v)) return `${c.v} yalnızca 1’e ve kendisine bölünür.`
    let p = 2
    while (c.v % p) p++
    return `${c.v} = ${p} × ${c.v / p}; ikiden fazla böleni var.`
  },
  ask: (c) => (prime ? `${c.v} sayısını 1 ve kendisinden başka bir sayıya bölebilir misin? Küçük asalları dene: 2, 3, 5, 7…` : `${c.v} sayısının 1 ve kendisinden başka böleni var mı?`),
  fake: (c) => (c.v % 2 ? 'Tek sayı olduğu için.' : 'Çift sayı olduğu için.'),
  mis: (c) => (c.v === 1 ? '1’i asal sandı.' : prime && c.v % 2 ? 'Her tek sayıyı asal sandı.' : !prime && c.v === 2 ? 'Çift sayıların hepsini bileşik sandı.' : undefined),
})

const fracGen = (): Data => {
  for (;;) {
    const q = randInt(3, 12), p = randInt(1, q - 1)
    return { label: `[[${p}/${q}]]`, v: p / q, p, q }
  }
}
const half = (greater: boolean): Rule => ({
  text: greater ? '[[1/2]]’den büyük kesirler' : '[[1/2]]’den küçük kesirler',
  gen: fracGen,
  test: (c) => (greater ? c.v > 0.5 : c.v < 0.5),
  why: (c) => (c.v === 0.5 ? `${c.label} tam yarım eder.` : `${c.q} parçanın yarısı ${fmt(c.q! / 2)} parça; pay ${c.p} bundan ${c.v > 0.5 ? 'büyük' : 'küçük'}.`),
  ask: (c) => `${c.label}: ${c.q} parçanın yarısı kaç parça? Pay ${c.p} bundan büyük mü, küçük mü?`,
  fake: () => (greater ? 'Paydası büyük olduğu için.' : 'Payı küçük bir sayı olduğu için.'),
  mis: (c) => (c.v === 0.5 ? 'Yarıma eşit kesri yarımdan büyük/küçük sandı.' : 'Kesri yarımla karşılaştırırken payı, paydanın yarısıyla karşılaştırmadı.'),
})
const halfEq: Rule = {
  text: '[[1/2]]’ye denk kesirler',
  gen: () => {
    if (Math.random() < 0.45) {
      const p = randInt(1, 12)
      return { label: `[[${p}/${2 * p}]]`, v: 0.5, p, q: 2 * p }
    }
    return fracGen()
  },
  test: (c) => c.v === 0.5,
  why: (c) => (c.v === 0.5 ? `${c.p} × 2 = ${c.q}; pay paydanın tam yarısı.` : `${c.q} sayısının yarısı ${fmt(c.q! / 2)}, pay ${c.p}; tam yarım değil.`),
  ask: (c) => `${c.label}: pay paydanın tam yarısı mı? ${c.p} × 2 kaç eder?`,
  fake: () => 'Paydası çift olduğu için.',
  mis: (c) => (c.q! % 2 === 0 ? 'Paydası çift olan her kesri yarıma denk sandı.' : undefined),
}

const signRule = (mode: 'neg' | 'pos' | 'lt5'): Rule => ({
  text: mode === 'neg' ? 'Sonucu negatif olan işlemler' : mode === 'pos' ? 'Sonucu pozitif olan işlemler' : 'Sonucu −5’ten küçük olan işlemler',
  gen: () => {
    const nm = (x: number, par: boolean) => (x < 0 ? (par ? `(−${-x})` : `−${-x}`) : String(x))
    const a = randInt(1, 9) * pick([1, -1])
    const op = pick(['+', '−', '·'] as const)
    const b = randInt(1, 9) * pick([1, -1])
    const r = op === '+' ? a + b : op === '−' ? a - b : a * b
    const label = op === '·' ? `${nm(a, true)}·${nm(b, true)}` : `${nm(a, false)} ${op} ${nm(b, true)}`
    return { label, v: r }
  },
  test: (c) => (mode === 'neg' ? c.v < 0 : mode === 'pos' ? c.v > 0 : c.v < -5),
  why: (c) => `${c.label} = ${signed(String(c.v))}.${c.v === 0 ? ' Sıfır ne pozitif ne negatiftir.' : ''}`,
  ask: (c) => `${c.label} işleminin sonucu kaç? Önce işaretini tahmin et, sonra hesapla.`,
  fake: (c) => (c.label.includes('−') ? 'İçinde eksi işareti olduğu için.' : 'İçinde eksi işareti olmadığı için.'),
  mis: (c) => (c.label.includes('−') && c.v >= 0 && mode !== 'pos' ? 'Eksi işareti görünce sonucun negatif olacağını düşündü.' : mode === 'lt5' && c.v > -5 && c.v < 0 ? 'Negatif sayılarda büyüklük-küçüklüğü ters düşündü.' : undefined),
})

const squares: Rule = {
  text: 'Tam kare sayılar',
  gen: () => {
    const v = Math.random() < 0.45 ? randInt(2, 15) ** 2 : randInt(5, 230)
    return { label: String(v), v }
  },
  test: (c) => isSquare(c.v),
  why: (c) => {
    const k = Math.floor(Math.sqrt(c.v))
    return isSquare(c.v) ? `${k} × ${k} = ${c.v}.` : `${k}^{2} = ${k * k}, ${k + 1}^{2} = ${(k + 1) ** 2}; ${c.v} arada kalıyor.`
  },
  ask: (c) => `Kendisiyle çarpınca ${c.v} eden bir tam sayı var mı? ${Math.floor(Math.sqrt(c.v))} × ${Math.floor(Math.sqrt(c.v))} kaç eder?`,
  fake: (c) => (c.v % 2 === 0 ? `${c.v} = ${c.v / 2} × 2 olduğu için.` : 'Tek sayı olduğu için.'),
  mis: (c) => (c.v % 2 === 0 && isSquare(c.v / 2) ? 'Kareyi 2 ile çarpmakla karıştırdı.' : undefined),
}

const rationals: Rule = {
  text: 'Rasyonel sayılar',
  gen: () => {
    const r = Math.random()
    if (r < 0.35) {
      const k = randInt(1, 12)
      return { label: `√{${k * k}}`, v: k, rat: true }
    }
    if (r < 0.5) return pick([{ label: `[[${randInt(1, 4)}/${randInt(5, 9)}]]`, v: 0.3, rat: true }, { label: `−${randInt(2, 9)}`, v: -3, rat: true }, { label: `${randInt(0, 3)},${randInt(1, 9)}`, v: 1.5, rat: true }])
    if (r < 0.55) return { label: 'π', v: Math.PI, rat: false }
    let v = 2
    do v = randInt(2, 99)
    while (isSquare(v))
    return { label: `√{${v}}`, v: Math.sqrt(v), rat: false }
  },
  test: (c) => !!c.rat,
  why: (c) => (c.label === 'π' ? 'π irrasyoneldir: ondalık basamakları devirsiz ve sonsuza dek sürer.' : c.label.startsWith('√') ? (c.rat ? `${c.label} = ${c.v}, bir tam sayı; [[${c.v}/1]] diye yazılabilir.` : `${c.label}: içindeki sayı tam kare değil, sonuç devirsiz sonsuz ondalık.`) : `${c.label} iki tam sayının oranı olarak yazılabilir.`),
  ask: (c) => (c.label === 'π' ? 'π iki tam sayının oranı olarak yazılabilir mi?' : `${c.label.replace(/√\{(\d+)\}/, '$1')} bir tam kare mi? Hangi tam sayının karesi?`),
  fake: (c) => (c.label.startsWith('√') ? 'Karekök içindeki sayı çift olduğu için.' : 'Ondalık gösterimi sonsuz olduğu için.'),
  mis: (c) => (c.label.startsWith('√') && !c.rat ? 'Her kareköklü ifadeyi rasyonel sandı.' : undefined),
}

const between57: Rule = {
  text: 'Karekökü 5 ile 7 arasında olan sayılar',
  gen: () => {
    const v = Math.random() < 0.5 ? randInt(26, 48) : randInt(5, 99)
    return { label: String(v), v }
  },
  test: (c) => c.v > 25 && c.v < 49,
  why: (c) => `5^{2} = 25 ve 7^{2} = 49; ${c.v} ${c.v > 25 && c.v < 49 ? 'bu ikisinin arasında' : 'bu aralığın dışında'}.`,
  ask: (c) => `5 × 5 ve 7 × 7 kaç eder? ${c.v} bu ikisinin arasında mı?`,
  fake: (c) => `${c.v}, 5 ile 7’nin katlarına yakın olduğu için.`,
  mis: (c) => (c.v >= 5 && c.v <= 7 ? 'Sayının kendisini kareköküyle karıştırdı.' : undefined),
}

interface Plan { known: [Rule, Rule]; secret: Rule; decoys: Rule[] }
function planFor(grade: Grade): Plan {
  switch (grade) {
    case 2: {
      const e = Math.random() < 0.5
      return { known: [parity(e), parity(!e)], secret: multiples(5, 60), decoys: [parity(true), parity(false)] }
    }
    case 3: {
      const [a, b] = shuffle([3, 4])
      return { known: [multiples(a), multiples(b)], secret: multiples(5, 60), decoys: [multiples(3, 60), parity(true)] }
    }
    case 4: return { known: [half(true), half(false)], secret: halfEq, decoys: [half(true), half(false)] }
    case 5: return { known: [divisible(3), divisible(9)], secret: divisible(4), decoys: [divisible(3), parity(true)] }
    case 6: return { known: [primeRule(true), primeRule(false)], secret: divisible(6), decoys: [divisible(3), parity(true)] }
    case 7: return { known: [signRule('neg'), signRule('pos')], secret: signRule('lt5'), decoys: [signRule('neg'), signRule('pos')] }
    default: return { known: [squares, rationals], secret: between57, decoys: [squares, parity(true)] }
  }
}

// ─── Labirent üretimi ─────────────────────────────────────────────────────
function makePath(n: number): Pt[] {
  const minLen = 2 * n - 1
  const maxLen = Math.floor(n * n * 0.5)
  for (let tries = 0; tries < 200; tries++) {
    let budget = 3000
    const path: Pt[] = [[0, 0]]
    const seen = new Set([key(0, 0)])
    const touches = (x: number, y: number, px: number, py: number) => DIRS.some(([dx, dy]) => !(x + dx === px && y + dy === py) && seen.has(key(x + dx, y + dy)))
    const dfs = (): boolean => {
      if (--budget < 0) return false
      const [x, y] = path[path.length - 1]
      if (x === n - 1 && y === n - 1) return path.length >= minLen
      if (path.length >= maxLen) return false
      for (const [dx, dy] of shuffle(DIRS)) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= n || ny >= n || seen.has(key(nx, ny)) || touches(nx, ny, x, y)) continue
        path.push([nx, ny])
        seen.add(key(nx, ny))
        if (dfs()) return true
        path.pop()
        seen.delete(key(nx, ny))
      }
      return false
    }
    if (dfs()) return path
  }
  return [...Array.from({ length: n }, (_, i) => [i, 0] as Pt), ...Array.from({ length: n - 1 }, (_, i) => [n - 1, i + 1] as Pt)]
}

/** 🚩’ten 🏁’e, kurala uyan kutulardan geçen kendini kesmeyen yol sayısı (en çok cap) */
function countPaths(okSet: Set<string>, n: number, cap = 60): number {
  let count = 0
  const seen = new Set<string>([key(0, 0)])
  const dfs = (x: number, y: number) => {
    if (count >= cap) return
    if (x === n - 1 && y === n - 1) {
      count++
      return
    }
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny)
      if (!okSet.has(k) || seen.has(k)) continue
      seen.add(k)
      dfs(nx, ny)
      seen.delete(k)
    }
  }
  dfs(0, 0)
  return count
}

function makeMaze(rule: Rule, n: number): { grid: Cell[][]; total: number } {
  for (let t = 0; t < 40; t++) {
    const a = makePath(n), b = makePath(n)
    const okSet = new Set([...a, ...b].map(([x, y]) => key(x, y)))
    const side = shuffle(Array.from({ length: n * n }, (_, i) => [i % n, Math.floor(i / n)] as Pt).filter(([x, y]) => !okSet.has(key(x, y)) && DIRS.some(([dx, dy]) => okSet.has(key(x + dx, y + dy)))))
    side.slice(0, randInt(2, 3)).forEach(([x, y]) => okSet.add(key(x, y)))
    const total = countPaths(okSet, n)
    if (total < 2 || total > 24) continue
    const used = new Set<string>()
    const grid = Array.from({ length: n }, (_, y) =>
      Array.from({ length: n }, (_, x) => {
        const ok = okSet.has(key(x, y))
        let d = rule.gen()
        for (let i = 0; i < 400 && (rule.test(d) !== ok || (used.has(d.label) && i < 300)); i++) d = rule.gen()
        used.add(d.label)
        return { ...d, ok, why: rule.why(d) }
      }),
    )
    return { grid, total }
  }
  // Yedek: üretilen ilk labirent
  const okSet = new Set(makePath(n).map(([x, y]) => key(x, y)))
  const grid = Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => {
    const ok = okSet.has(key(x, y))
    let d = rule.gen()
    for (let i = 0; i < 400 && rule.test(d) !== ok; i++) d = rule.gen()
    return { ...d, ok, why: rule.why(d) }
  }))
  return { grid, total: countPaths(okSet, n) }
}

/** Gizli kural için örnek kutular: her yanlış aday en az bir örnekle çürütülsün */
function pickExamples(grid: Cell[][], candidates: Rule[], secret: Rule): Set<string> | null {
  const cells = grid.flatMap((row, y) => row.map((c, x) => ({ c, k: key(x, y) }))).filter(({ k }) => k !== key(0, 0) && k !== key(grid.length - 1, grid.length - 1))
  for (let t = 0; t < 60; t++) {
    const ok = shuffle(cells.filter((e) => e.c.ok)).slice(0, 4)
    const no = shuffle(cells.filter((e) => !e.c.ok)).slice(0, 4)
    const ex = [...ok, ...no]
    if (candidates.every((r) => r === secret || ex.some((e) => r.test(e.c) !== e.c.ok))) return new Set(ex.map((e) => e.k))
  }
  return null
}

const plain = (s: string) => s.replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/√\{([^}]*)\}/g, 'karekök $1')

const INSIGHT: Record<number, string> = {
  2: 'Bir sayının tek mi çift mi olduğunu anlamak için yalnızca birler basamağına bakmak yeter. Sence neden?',
  3: 'Ritmik sayarak katları buldun. Hem 3’ün hem 4’ün katı olan bir sayı söyleyebilir misin?',
  4: 'Bir kesir yarımdan büyükse pay, paydanın yarısından büyüktür. 5/10 ile 6/12 neden aynı noktadadır?',
  5: 'Bölünebilme kuralları bölme yapmadan karar vermeni sağlar. 9’a bölünen her sayı 3’e de bölünür mü? Ya tersi?',
  6: 'Asal sayıların yalnızca iki böleni vardır. 6’ya bölünen bir sayı hem 2’ye hem 3’e bölünür; neden?',
  7: 'Sonucun işaretini işlemi yapmadan tahmin edebilir misin? İki negatif sayının çarpımı neden pozitiftir?',
  8: 'Tam kare sayıların karekökü tam sayıdır, bu yüzden rasyoneldir. √40 hangi iki tam sayı arasındadır?',
}

const STRATS = ['Her sayıyı kurala göre tek tek kontrol ettim', 'Bir kısa yol (kural) kullandım', 'İleriye bakıp çıkmazlardan kaçındım', 'Deneme-yanılma ile ilerledim']

export default function NumberMaze({ grade, onFinish }: GameProps) {
  const g: Grade = grade < 2 ? 2 : grade
  const age = useAge(grade)
  const dark = age.tier === 'atolye'
  const track = useTracker()
  const sols = useSolutions()
  const [plan] = useState(() => planFor(g))
  const n = g <= 4 ? 5 : 6
  const rules = [plan.known[0], plan.known[1], plan.secret]
  const candidates = useRef(shuffle([plan.secret, ...plan.decoys])).current
  const [mi, setMi] = useState(0)
  const [maze, setMaze] = useState(() => makeMaze(rules[0], n))
  const [examples, setExamples] = useState<Set<string> | null>(null)
  const [ruleKnown, setRuleKnown] = useState(true)
  const [wrongPick, setWrongPick] = useState<Set<number>>(() => new Set())
  const [path, setPath] = useState<Pt[]>([[0, 0]])
  const [checked, setChecked] = useState<Set<string>>(() => new Set())
  const [nudge, setNudge] = useState<{ q: string; mis?: string; k: number } | null>(null)
  const [mode, setMode] = useState<'walk' | 'justify' | 'done'>('walk')
  const [justify, setJustify] = useState<{ cell: Cell; opts: { t: string; ok: boolean; mis?: string }[]; wrong: number[] } | null>(null)
  const [found, setFound] = useState<{ key: string; label: string }[]>([])
  const [picked, setPicked] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const tracing = useRef(false)
  const pathRef = useRef(path)
  pathRef.current = path
  const stats = useRef({ paths: 0, missteps: 0, justFirst: 0, justTotal: 0, ruleFirst: false, over: false, mazeMiss: 0 })
  const grid = maze.grid
  const rule = rules[mi]
  const [hx, hy] = path[path.length - 1]
  const inPath = new Set(path.map(([x, y]) => key(x, y)))

  const startMaze = (i: number) => {
    const mz = makeMaze(rules[i], n)
    let ex: Set<string> | null = null
    if (i === 2) {
      ex = pickExamples(mz.grid, candidates, plan.secret)
      for (let t = 0; !ex && t < 10; t++) {
        const m2 = makeMaze(rules[i], n)
        ex = pickExamples(m2.grid, candidates, plan.secret)
        if (ex) Object.assign(mz, m2)
      }
    }
    setMaze(mz)
    setExamples(ex)
    setRuleKnown(i !== 2 || !ex)
    setWrongPick(new Set())
    setPath([[0, 0]])
    setChecked(new Set())
    setNudge(null)
    setMode('walk')
    setJustify(null)
    setFound([])
    setInfo(null)
    stats.current.mazeMiss = 0
  }

  const step = (x: number, y: number) => {
    if (mode !== 'walk' || !ruleKnown) return false
    const k = key(x, y)
    const path = pathRef.current
    const [hx, hy] = path[path.length - 1]
    const pi = path.findIndex(([px, py]) => px === x && py === y)
    if (pi >= 0) {
      if (pi < path.length - 1) {
        pathRef.current = path.slice(0, pi + 1)
        setPath(pathRef.current)
        setInfo('Geri döndün. Buradan başka bir yöne gidebilirsin.')
      }
      return false
    }
    if (Math.abs(x - hx) + Math.abs(y - hy) !== 1) {
      setInfo('Yalnızca bulunduğun kutunun sağına, soluna, üstüne ya da altına geçebilirsin.')
      return false
    }
    const c = grid[y][x]
    if (!c.ok) {
      stats.current.missteps++
      stats.current.mazeMiss++
      track.attempt(false)
      setChecked(new Set(checked).add(k))
      setNudge({ q: rule.ask(c), mis: rule.mis(c), k: Date.now() })
      setInfo(null)
      return false
    }
    track.attempt(true)
    setNudge(null)
    setInfo(null)
    const np: Pt[] = [...path, [x, y]]
    pathRef.current = np
    setPath(np)
    if (x === n - 1 && y === n - 1) arrive(np)
    return true
  }

  const arrive = (np: Pt[]) => {
    const pk = np.map(([x, y]) => key(x, y)).join('|')
    if (found.some((f) => f.key === pk)) {
      setInfo('Bu yolu zaten bulmuştun! Başka bir kutudan dönmeyi dene.')
      setPath([[0, 0]])
      return
    }
    sfx.ok()
    const label = `${found.length + 1}. yol · ${np.length} kutu`
    setFound([...found, { key: pk, label }])
    sols.add(`${mi}:${pk}`, label)
    stats.current.paths++
    // Gerekçelendirme: yoldaki rastgele bir kutu
    const mid = np.slice(1, -1)
    const [cx, cy] = pick(mid.length ? mid : np)
    const cell = grid[cy][cx]
    const opts = shuffle([
      { t: cell.why, ok: true },
      { t: rule.fake(cell), ok: false, mis: rule.mis(cell) ?? 'Kurala uyma gerekçesini yanlış bir özelliğe dayandırdı.' },
      { t: 'Çıkışa giden yolun üstünde olduğu için.', ok: false, mis: 'Matematiksel olmayan bir gerekçe seçti.' },
    ])
    setJustify({ cell, opts, wrong: [] })
    setMode('justify')
  }

  const answerJustify = (i: number) => {
    if (!justify) return
    const o = justify.opts[i]
    if (o.ok) {
      stats.current.justTotal++
      if (justify.wrong.length === 0) stats.current.justFirst++
      track.item(justify.wrong.length === 0 && stats.current.mazeMiss === 0)
      sfx.ok()
      setMode('done')
      setNudge(null)
      return
    }
    setJustify({ ...justify, wrong: [...justify.wrong, i] })
    setNudge({ q: `Bu gerekçe kuralla ilgili mi? “${plain(rule.text)}” kuralı ${justify.cell.label} için neye bakmamızı istiyor?`, mis: o.mis, k: Date.now() })
  }

  const anotherPath = () => {
    setPath([[0, 0]])
    setMode('walk')
    setJustify(null)
    setNudge(null)
    setInfo('Başka bir yol: en az bir kutusu farklı olsun.')
  }

  const pickRule = (i: number) => {
    const r = candidates[i]
    if (r === plan.secret) {
      if (wrongPick.size === 0) stats.current.ruleFirst = true
      track.attempt(true)
      sfx.ok()
      setRuleKnown(true)
      setNudge(null)
      setInfo('Kuralı keşfettin! Şimdi bu kurala uyan kutulardan yol bul.')
      return
    }
    track.attempt(false)
    setWrongPick(new Set(wrongPick).add(i))
    const ex = [...(examples ?? [])].map((k) => {
      const [x, y] = k.split(',').map(Number)
      return grid[y][x]
    })
    const c = ex.find((e) => r.test(e) !== e.ok)
    setNudge({ q: c ? `“${plain(r.text)}” kuralına göre ${plain(c.label)} ${c.ok ? 'kapalı olmalıydı' : 'açık olmalıydı'}. Ama örnekte ${c.ok ? 'açık' : 'kapalı'}. Örneklere tekrar bak!` : 'Örneklere tekrar bak.', k: Date.now() })
  }

  const nextMaze = () => {
    if (mi + 1 >= MAZES) {
      const s = stats.current
      if (s.over) return
      s.over = true
      onFinish({
        stars: starsFor((Math.min(s.paths, 6) / 6) * 0.5 + (s.justFirst / Math.max(1, s.justTotal)) * 0.35 + (s.ruleFirst ? 0.15 : 0) - Math.min(0.2, s.missteps * 0.02)),
        score: s.paths * 20 + s.justFirst * 15 + (s.ruleFirst ? 20 : 0),
        summary: `${MAZES} labirentte ${s.paths} farklı yol buldun ve ${s.justTotal} yolu gerekçelendirdin${s.ruleFirst ? '; gizli kuralı ilk denemede keşfettin' : ''}.`,
        insight: INSIGHT[g],
      })
      return
    }
    setMi(mi + 1)
    startMaze(mi + 1)
  }

  // Parmağı sürükleyerek yol çizme
  const cellAt = (cx: number, cy: number): Pt | null => {
    const el = document.elementFromPoint(cx, cy)?.closest('[data-cell]') as HTMLElement | null
    if (!el) return null
    const [x, y] = (el.dataset.cell ?? '').split(',').map(Number)
    return [x, y]
  }
  const down = (e: RPointerEvent) => {
    const c = cellAt(e.clientX, e.clientY)
    if (!c) return
    tracing.current = true
    step(c[0], c[1])
  }
  const moveP = (e: RPointerEvent) => {
    if (!tracing.current || mode !== 'walk') return
    const c = cellAt(e.clientX, e.clientY)
    const cur = pathRef.current
    const [px, py] = cur[cur.length - 1]
    if (!c || cur.some(([a, b]) => a === c[0] && b === c[1]) || Math.abs(c[0] - px) + Math.abs(c[1] - py) !== 1) return
    if (!step(c[0], c[1])) tracing.current = false
  }

  const panel = dark ? 'bg-slate-800/90 ring-1 ring-slate-600 text-slate-100' : 'bg-white/95 ring-1 ring-line text-ink'
  const soft = dark ? 'text-slate-300' : 'text-ink-soft'
  const goal = Math.min(2, maze.total)

  return (
    <Scene grade={grade} className="animate-fade-up">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <LevelDots current={mi} total={MAZES} />
        <span className={`chip px-3 py-1 text-sm ${dark ? 'bg-slate-700 text-slate-100' : 'bg-white text-ink ring-1 ring-line'}`}><Route size={15} />Bu labirentte {maze.total >= 60 ? '60’tan fazla' : maze.total} farklı yol var</span>
      </div>

      <div className="mb-3 rounded-2xl bg-violet-700 px-4 py-3 text-center text-white">
        <span className="text-xs font-extrabold tracking-wide text-white/75 uppercase">{ruleKnown ? 'Yalnızca bu kutulardan geç' : 'Gizli kural! Örneklere bak'}</span>
        <p className="text-xl font-black sm:text-2xl">{ruleKnown ? <MathText text={rule.text} /> : '❓ Hangi kural?'}</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
        <div
          className="mx-auto grid w-full max-w-[520px] gap-1.5 select-none"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, touchAction: 'none' }}
          onPointerDown={down}
          onPointerMove={moveP}
          onPointerUp={() => (tracing.current = false)}
          onPointerCancel={() => (tracing.current = false)}
          onPointerLeave={() => (tracing.current = false)}
        >
          {grid.map((row, y) =>
            row.map((c, x) => {
              const k = key(x, y)
              const on = inPath.has(k)
              const head = x === hx && y === hy
              const bad = checked.has(k)
              const exOpen = !ruleKnown && examples?.has(k) && c.ok
              const exShut = examples?.has(k) && !c.ok
              const nearHead = ruleKnown && mode === 'walk' && !on && Math.abs(x - hx) + Math.abs(y - hy) === 1
              const exit = x === n - 1 && y === n - 1
              const len = plain(c.label).length
              const fs = c.label.includes('[[') ? 'text-base sm:text-lg' : len <= 2 ? 'text-xl sm:text-2xl' : len <= 4 ? 'text-lg sm:text-xl' : len <= 6 ? 'text-sm sm:text-base' : 'text-[11px] sm:text-sm tracking-tight'
              const look = on
                ? `bg-violet-500 text-white ring-violet-600 ${head ? 'ring-4 ring-amber-300' : ''}`
                : bad
                  ? 'bg-amber-50 text-amber-800 ring-2 ring-amber-300 ring-dashed'
                  : exOpen
                    ? 'bg-emerald-100 text-emerald-900 ring-2 ring-emerald-400'
                    : exShut && !ruleKnown
                      ? 'bg-slate-200 text-slate-500 ring-slate-300'
                      : nearHead
                        ? 'bg-violet-50 text-ink ring-2 ring-violet-400'
                        : 'bg-white text-ink ring-line'
              return (
                <button
                  key={k}
                  type="button"
                  data-cell={k}
                  onClick={(e) => e.detail === 0 && step(x, y)}
                  aria-label={`${plain(c.label)}${on ? ', yolda' : ''}${exit ? ', çıkış' : ''}`}
                  className={`relative grid aspect-square min-h-12 place-items-center rounded-xl px-0.5 leading-none font-black ring-1 transition ${fs} ${look} ${on && head && path.length > 1 ? 'animate-pop' : ''}`}
                >
                  <MathText text={c.label} />
                  {x === 0 && y === 0 && <span className="absolute -top-1.5 -left-1.5 text-base" aria-hidden>🚩</span>}
                  {exit && <span className="absolute -top-1.5 -right-1.5 text-base" aria-hidden>🏁</span>}
                  {exOpen && <span className="absolute right-0.5 bottom-0 text-[11px]" aria-hidden>✓</span>}
                  {exShut && !ruleKnown && <span className="absolute right-0.5 bottom-0 text-[11px]" aria-hidden>🔒</span>}
                  {bad && !on && <span className="absolute right-0.5 bottom-0 text-[11px]" aria-hidden>🤔</span>}
                </button>
              )
            }),
          )}
        </div>

        <div className="space-y-3">
          {!ruleKnown && (
            <div className={`rounded-2xl p-3 ${panel}`}>
              <p className="mb-1 flex items-center gap-1.5 text-sm font-black"><Search size={16} className="text-violet-500" />Yeşil ✓ kutular açık, 🔒 kutular kapalı. Hangi kural bunu açıklar?</p>
              <div className="mt-2 grid gap-2">
                {candidates.map((r, i) => (
                  <button key={i} type="button" onClick={() => pickRule(i)} disabled={wrongPick.has(i)} className={`min-h-12 rounded-xl px-3 text-left text-base font-extrabold ring-1 transition active:scale-[0.98] ${wrongPick.has(i) ? 'bg-slate-100 text-slate-400 ring-slate-200' : 'bg-white text-ink ring-line hover:bg-violet-50'}`}>
                    <MathText text={r.text} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {ruleKnown && mode === 'walk' && (
            <div className={`rounded-2xl p-3 text-sm font-bold ${panel}`}>
              <p className="flex items-center gap-1.5 font-black"><Flag size={16} className="text-violet-500" />🚩’ten 🏁’e bir yol çiz</p>
              <p className={`mt-1 ${soft}`}>Kutulara tek tek dokun ya da parmağını sürükle. Mor bir kutuya dokunursan oraya geri dönersin.</p>
              {found.length > 0 && <p className="mt-1 font-black text-violet-600">Hedef: en az {goal} farklı yol ({found.length}/{goal})</p>}
            </div>
          )}

          {mode === 'justify' && justify && (
            <div className={`rounded-2xl p-3 animate-pop ${panel}`}>
              <p className="flex items-center gap-1.5 font-black text-emerald-600"><Flag size={16} />Çıkışa ulaştın! 🎉</p>
              <p className="mt-1 flex items-start gap-1.5 text-sm font-black"><HelpCircle size={16} className="mt-0.5 shrink-0 text-violet-500" /><span>Yolundaki <span className="inline-flex items-center rounded-md bg-violet-500 px-1.5 py-0.5 align-middle text-white"><MathText text={justify.cell.label} /></span> kurala neden uyuyor?</span></p>
              <div className="mt-2 grid gap-2">
                {justify.opts.map((o, i) => (
                  <button key={i} type="button" onClick={() => answerJustify(i)} disabled={justify.wrong.includes(i)} className={`min-h-12 rounded-xl px-3 py-2 text-left text-sm font-extrabold ring-1 transition active:scale-[0.98] ${justify.wrong.includes(i) ? 'bg-slate-100 text-slate-400 ring-slate-200' : 'bg-white text-ink ring-line hover:bg-violet-50'}`}>
                    <MathText text={o.t} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'done' && (
            <div className={`rounded-2xl p-3 animate-fade-up ${panel}`}>
              <p className="font-black text-emerald-600">Gerekçen doğru! ✔</p>
              <p className={`text-sm font-bold ${soft}`}>{found.length < goal ? 'Bu labirentte başka yollar da var. Bir tane daha bulabilir misin?' : found.length < maze.total ? 'Harika! Hâlâ bulunmamış yollar var; istersen devam et.' : 'Tüm yolları buldun!'}</p>
              <div className="mt-2 flex flex-col gap-2">
                {found.length < maze.total && <button type="button" onClick={anotherPath} className={found.length < goal ? 'btn-primary' : 'btn-ghost'}><Route size={18} />Başka bir yol bul</button>}
                <button type="button" onClick={nextMaze} className={found.length < goal ? 'btn-ghost' : 'btn-primary'}>{mi + 1 >= MAZES ? 'Bitir' : 'Sonraki labirent'}<ArrowRight size={18} /></button>
              </div>
              {mi === 0 && found.length === 1 && !picked && <StrategyPicker question="Yolunu nasıl seçtin?" options={STRATS} onPick={() => setPicked(true)} />}
            </div>
          )}

          {found.length > 0 && <div className="text-ink"><SolutionList list={found} goal={goal} /></div>}
        </div>
      </div>

      {nudge && <Nudge key={nudge.k} question={nudge.q} misconception={nudge.mis} onClose={() => setNudge(null)} />}
      {info && !nudge && <p className={`mx-auto mt-3 w-fit max-w-full rounded-2xl px-4 py-2 text-center text-sm font-extrabold ${dark ? 'bg-slate-700 text-slate-100' : 'bg-white text-ink ring-1 ring-line'}`} aria-live="polite">{info}</p>}
    </Scene>
  )
}
