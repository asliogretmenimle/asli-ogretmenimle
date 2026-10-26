import { useEffect, useRef, useState } from 'react'
import type { Grade } from '../data/types'
import { pick, randInt, shuffle } from '../lib/random'
import { sfx } from '../lib/feedback'
import { fmt } from '../lib/format'
import { MathText } from '../components/MathText'
import { Hud, signed, type GameProps } from './kit'

type Pt = [number, number]
interface Val { label: string; why: string }
interface Rule { text: string; make: (ok: boolean) => Val }
interface Cell { label: string; ok: boolean; why: string }

const MAZES = 3
const LIVES = 3
const DIRS: Pt[] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const GEN: Record<number, string> = { 3: '3’ün', 4: '4’ün', 5: '5’in' }
const DAT: Record<number, string> = { 3: '3’e', 4: '4’e', 9: '9’a' }

const key = (x: number, y: number) => `${x},${y}`
const until = (gen: () => number, test: (n: number) => boolean) => {
  for (;;) {
    const v = gen()
    if (test(v)) return v
  }
}
const isPrime = (n: number) => {
  if (n < 2) return false
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false
  return true
}
const isSquare = (n: number) => Number.isInteger(Math.sqrt(n))

// ─── Kurallar ──────────────────────────────────────────────────────────────
const parity = (even: boolean): Rule => ({
  text: even ? 'Çift sayılar' : 'Tek sayılar',
  make: (ok) => {
    let v = randInt(10, 98)
    if ((v % 2 === 0) !== (even === ok)) v++
    return { label: String(v), why: `${v} ${v % 2 ? 'tek' : 'çift'} sayı: birler basamağı ${v % 10}.` }
  },
})

const multiples = (d: number): Rule => ({
  text: `${GEN[d]} katları`,
  make: (ok) => {
    const v = ok ? d * randInt(2, 12) : until(() => randInt(7, 12 * d), (n) => n % d !== 0)
    const q = Math.floor(v / d)
    return { label: String(v), why: `${v}, ${GEN[d]} katı değil: ${d} × ${q} = ${d * q}, ${d} × ${q + 1} = ${d * (q + 1)}.` }
  },
})

const half = (greater: boolean): Rule => ({
  text: greater ? '[[1/2]]’den büyük kesirler' : '[[1/2]]’den küçük kesirler',
  make: (ok) => {
    // Tuzak: tam yarım eden kesirler
    if (!ok && Math.random() < 0.25) {
      const b = pick([4, 6, 8, 10, 12])
      return { label: `[[${b / 2}/${b}]]`, why: `[[${b / 2}/${b}]] tam yarım eder: ${b} parçanın yarısı ${b / 2} parça.` }
    }
    for (;;) {
      const b = randInt(3, 12), a = randInt(1, b - 1)
      if (2 * a === b || (2 * a > b === greater) !== ok) continue
      const why = 2 * a > b
        ? `[[${a}/${b}]] yarımdan büyük: ${b} parçanın yarısı ${fmt(b / 2)}, pay ${a} bundan büyük.`
        : `[[${a}/${b}]] yarımdan küçük: ${b} parçanın yarısı ${fmt(b / 2)}, pay ${a} bundan küçük.`
      return { label: `[[${a}/${b}]]`, why }
    }
  },
})

const divisible = (d: 3 | 4 | 9): Rule => ({
  text: `${DAT[d]} tam bölünen sayılar`,
  make: (ok) => {
    const v = ok
      ? d * randInt(Math.ceil(100 / d), Math.floor(999 / d))
      : d === 9 && Math.random() < 0.5
        ? until(() => 3 * randInt(34, 333), (n) => n % 9 !== 0)
        : until(() => randInt(100, 999), (n) => n % d !== 0)
    const digits = String(v).split('')
    const sum = digits.reduce((s, c) => s + Number(c), 0)
    const why = d === 4
      ? `${v}: son iki basamağı ${String(v % 100).padStart(2, '0')}, bu sayı 4’e bölünmüyor.`
      : `${v}: rakamları toplamı ${digits.join(' + ')} = ${sum}, ${DAT[d]} bölünmüyor.`
    return { label: String(v), why }
  },
})

const primes: Rule = {
  text: 'Asal sayılar',
  make: (ok) => {
    const v = until(() => (ok ? randInt(2, 97) : Math.random() < 0.7 ? randInt(4, 49) * 2 + 1 : randInt(1, 99)), (n) => isPrime(n) === ok)
    if (v === 1) return { label: '1', why: '1 asal değildir: yalnızca bir böleni var.' }
    let p = 2
    while (v % p) p++
    return { label: String(v), why: `${v} = ${p} × ${v / p}, asal değil.` }
  },
}

const signRule = (negative: boolean): Rule => ({
  text: negative ? 'Sonucu negatif olan işlemler' : 'Sonucu pozitif olan işlemler',
  make: (ok) => {
    const num = (x: number, par: boolean) => (x < 0 ? (par ? `(−${-x})` : `−${-x}`) : String(x))
    for (;;) {
      const a = randInt(1, 9) * pick([1, -1])
      // Tuzak: sonucu sıfır olan işlemler
      const zero = !ok && Math.random() < 0.2
      const op = zero ? pick(['+', '−'] as const) : pick(['+', '−', '·'] as const)
      const b = zero ? (op === '+' ? -a : a) : randInt(1, 9) * pick([1, -1])
      const r = op === '+' ? a + b : op === '−' ? a - b : a * b
      if ((negative ? r < 0 : r > 0) !== ok) continue
      const label = op === '·' ? `${num(a, true)}·${num(b, true)}` : `${num(a, false)} ${op} ${num(b, true)}`
      const tail = r === 0 ? 'Sıfır ne pozitif ne negatiftir.' : r > 0 ? 'Sonuç pozitif.' : 'Sonuç negatif.'
      return { label, why: `${label} = ${signed(String(r))}. ${tail}` }
    }
  },
})

const squares: Rule = {
  text: 'Tam kare sayılar',
  make: (ok) => {
    if (ok) {
      const k = randInt(2, 12)
      return { label: String(k * k), why: '' }
    }
    const v = until(() => randInt(2, 11) ** 2 + pick([-2, -1, 1, 2, 3]), (n) => n > 1 && !isSquare(n))
    const k = Math.floor(Math.sqrt(v))
    return { label: String(v), why: `${v} tam kare değil: ${k}^{2} = ${k * k}, ${k + 1}^{2} = ${(k + 1) ** 2}.` }
  },
}

const rationals: Rule = {
  text: 'Rasyonel sayılar',
  make: (ok) => {
    if (ok) {
      if (Math.random() < 0.7) return { label: `√{${randInt(1, 12) ** 2}}`, why: '' }
      return { label: pick([`[[${randInt(1, 4)}/${randInt(5, 9)}]]`, `−${randInt(2, 9)}`, `${randInt(0, 3)},${randInt(1, 9)}`]), why: '' }
    }
    if (Math.random() < 0.1) return { label: 'π', why: 'π irrasyoneldir: ondalık basamakları devirsiz ve sonsuza dek sürer.' }
    const v = until(() => randInt(2, 120), (n) => !isSquare(n))
    const k = Math.floor(Math.sqrt(v))
    return { label: `√{${v}}`, why: `√{${v}} irrasyonel: ${v} tam kare değil (${k * k} < ${v} < ${(k + 1) ** 2}).` }
  },
}

function rulesFor(grade: Grade): Rule[] {
  const e = Math.random() < 0.5
  switch (grade) {
    case 2: return [parity(e), parity(!e), parity(e)]
    case 3: return shuffle([3, 4, 5]).map(multiples)
    case 4: return [half(true), half(false), half(true)]
    case 5: return shuffle([3, 4, 9] as const).map(divisible)
    case 6: return [primes, primes, primes]
    case 7: return [signRule(true), signRule(false), signRule(true)]
    default: return [squares, rationals, rationals]
  }
}

// ─── Labirent ──────────────────────────────────────────────────────────────
/** Sol üstten sağ alta, kendine değmeyen rastgele yol */
function makePath(n: number): Pt[] {
  const minLen = 2 * n + 1
  const maxLen = Math.floor(n * n * 0.52)
  for (let tries = 0; tries < 200; tries++) {
    let budget = 4000
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
  // Yedek: L biçimli yol
  return [...Array.from({ length: n }, (_, i) => [i, 0] as Pt), ...Array.from({ length: n - 1 }, (_, i) => [n - 1, i + 1] as Pt)]
}

function makeMaze(rule: Rule, n: number): Cell[][] {
  const path = makePath(n)
  const onPath = new Set(path.map(([x, y]) => key(x, y)))
  // Yanıltıcı kollar: yola komşu, kurala uyan birkaç kutu
  const side = shuffle(
    Array.from({ length: n * n }, (_, i) => [i % n, Math.floor(i / n)] as Pt).filter(([x, y]) => !onPath.has(key(x, y)) && DIRS.some(([dx, dy]) => onPath.has(key(x + dx, y + dy)))),
  )
  const extra = new Set(side.slice(0, randInt(2, 4)).map(([x, y]) => key(x, y)))
  const used = new Set<string>()
  return Array.from({ length: n }, (_, y) =>
    Array.from({ length: n }, (_, x) => {
      const ok = onPath.has(key(x, y)) || extra.has(key(x, y))
      let v = rule.make(ok)
      for (let i = 0; i < 12 && used.has(v.label); i++) v = rule.make(ok)
      used.add(v.label)
      return { label: v.label, ok, why: v.why }
    }),
  )
}

const plain = (s: string) => s.replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/√\{([^}]*)\}/g, 'karekök $1')

const INSIGHT: Record<number, string> = {
  2: 'Bir sayının tek mi çift mi olduğunu anlamak için yalnızca birler basamağına bakmak yeter. Sence neden?',
  3: 'Ritmik sayarak katları buldun. Hem 3’ün hem 4’ün katı olan bir sayı söyleyebilir misin?',
  4: 'Bir kesir yarımdan büyükse pay, paydanın yarısından büyüktür. 5/10 neden tam yarım eder?',
  5: 'Bölünebilme kuralları bölme yapmadan karar vermeni sağlar. 9’a bölünen her sayı 3’e de bölünür mü? Ya tersi?',
  6: 'Asal sayıların yalnızca iki böleni vardır: 1 ve kendisi. 2 neden çift olan tek asal sayıdır?',
  7: 'Sonucun işaretini işlemi yapmadan tahmin edebilir misin? İki negatif sayının çarpımı neden pozitiftir?',
  8: 'Tam kare sayıların karekökü tam sayıdır, bu yüzden rasyoneldir. √20 hangi iki tam sayı arasındadır?',
}

export default function NumberMaze({ grade, onFinish }: GameProps) {
  const [rules] = useState(() => rulesFor(grade))
  const size = (i: number) => (grade === 7 || i < 2 ? 5 : 6)
  const [mi, setMi] = useState(0)
  const [grid, setGrid] = useState(() => makeMaze(rules[0], size(0)))
  const [path, setPath] = useState<Pt[]>([[0, 0]])
  const [wrong, setWrong] = useState<Set<string>>(() => new Set())
  const [shake, setShake] = useState({ k: '', n: 0 })
  const [lives, setLives] = useState(LIVES)
  const [score, setScore] = useState(0)
  const [cleared, setCleared] = useState(false)
  const [msg, setMsg] = useState<{ text: string; tone: 'ok' | 'bad' | 'info' } | null>(null)
  const visited = useRef(new Set<string>())
  const stats = useRef({ done: 0, mazeWrong: 0, over: false })
  const n = grid.length
  const [hx, hy] = path[path.length - 1]

  const finish = () => {
    const s = stats.current
    if (s.over) return
    s.over = true
    const wrongs = LIVES - lives
    onFinish({
      stars: s.done === MAZES && wrongs <= 1 ? 3 : s.done >= 2 ? 2 : 1,
      score,
      summary: `${s.done}/${MAZES} labirentten çıktın${wrongs ? `, ${wrongs} yanlış kutuya bastın` : ', hiç yanlış yapmadan'}.`,
      insight: INSIGHT[grade],
    })
  }

  // Labirent bitince ya da canlar tükenince kısa bir bekleme
  useEffect(() => {
    if (!cleared && lives > 0) return
    const t = setTimeout(() => {
      if (lives <= 0 || mi + 1 >= MAZES) return finish()
      setMi(mi + 1)
      setGrid(makeMaze(rules[mi + 1], size(mi + 1)))
      setPath([[0, 0]])
      setWrong(new Set())
      setCleared(false)
      setMsg(null)
      visited.current = new Set()
      stats.current.mazeWrong = 0
    }, lives <= 0 ? 2200 : 1500)
    return () => clearTimeout(t)
  }, [cleared, lives])

  const tap = (x: number, y: number) => {
    if (cleared || lives <= 0) return
    const k = key(x, y)
    const pi = path.findIndex(([px, py]) => px === x && py === y)
    if (pi >= 0) {
      if (pi < path.length - 1) {
        setPath(path.slice(0, pi + 1))
        setMsg({ text: 'Geri döndün. Başka bir yol dene!', tone: 'info' })
      }
      return
    }
    if (wrong.has(k)) return
    if (Math.abs(x - hx) + Math.abs(y - hy) !== 1) {
      setMsg({ text: 'Yalnızca bulunduğun kutunun sağına, soluna, üstüne ya da altına basabilirsin.', tone: 'info' })
      return
    }
    const c = grid[y][x]
    if (!c.ok) {
      sfx.bad()
      setWrong(new Set(wrong).add(k))
      setShake({ k, n: shake.n + 1 })
      setLives(lives - 1)
      stats.current.mazeWrong++
      setMsg({ text: c.why + (lives - 1 <= 0 ? ' Canın kalmadı!' : ''), tone: 'bad' })
      return
    }
    sfx.ok()
    let gain = 0
    if (!visited.current.has(k)) {
      visited.current.add(k)
      gain += 5
    }
    setPath([...path, [x, y]])
    if (x === n - 1 && y === n - 1) {
      const clean = stats.current.mazeWrong === 0
      gain += 20 + (clean ? 10 : 0)
      stats.current.done++
      setCleared(true)
      setMsg({ text: clean ? 'Çıkışı buldun, hem de hatasız! 🎉' : 'Çıkışı buldun! 🎉', tone: 'ok' })
    } else {
      setMsg(null)
    }
    setScore(score + gain)
  }

  const inPath = new Set(path.map(([x, y]) => key(x, y)))
  const rule = rules[mi]

  return (
    <div className="animate-fade-up">
      <Hud round={mi + 1} rounds={MAZES} score={score} lives={lives} maxLives={LIVES} />
      <div className="mb-3 rounded-2xl bg-ink px-4 py-3 text-center text-white">
        <span className="text-xs font-extrabold tracking-wide text-white/70 uppercase">Yalnızca bunlara bas</span>
        <p className="text-xl font-black sm:text-2xl"><MathText text={rule.text} /></p>
      </div>

      <div className="mx-auto grid w-full max-w-[420px] touch-manipulation gap-1 select-none" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {grid.map((row, y) =>
          row.map((c, x) => {
            const k = key(x, y)
            const on = inPath.has(k)
            const head = x === hx && y === hy
            const bad = wrong.has(k)
            const near = !on && !bad && !cleared && Math.abs(x - hx) + Math.abs(y - hy) === 1
            const exit = x === n - 1 && y === n - 1
            const len = plain(c.label).length
            const fs = c.label.includes('[[') ? 'text-base' : len <= 2 ? 'text-xl' : len <= 4 ? 'text-lg' : len <= 6 ? 'text-sm' : 'text-[11px] tracking-tight'
            const look = on
              ? `bg-violet-500 text-white ring-violet-600 ${head ? 'ring-4 ring-amber-300' : ''}`
              : bad
                ? 'bg-rose-100 text-rose-400 ring-rose-200 line-through'
                : near
                  ? 'bg-white text-ink ring-2 ring-violet-300'
                  : 'bg-white/70 text-ink ring-line'
            return (
              <button
                key={shake.k === k ? `${k}-${shake.n}` : k}
                type="button"
                onClick={() => tap(x, y)}
                aria-label={`${plain(c.label)}${on ? ', yolda' : ''}${exit ? ', çıkış' : ''}`}
                className={`relative grid aspect-square place-items-center rounded-xl px-0.5 leading-none font-black ring-1 transition ${fs} ${look} ${shake.k === k ? 'animate-shake' : ''} ${on && path.length > 1 && head ? 'animate-pop' : ''}`}
              >
                <MathText text={c.label} />
                {x === 0 && y === 0 && <span className="absolute -top-1 -left-1 text-sm" aria-hidden>🚩</span>}
                {exit && <span className="absolute -top-1 -right-1 text-sm" aria-hidden>🏁</span>}
              </button>
            )
          }),
        )}
      </div>

      {msg ? (
        <div className={`mx-auto mt-3 w-fit max-w-full rounded-2xl px-4 py-2 text-center text-base font-extrabold ring-1 animate-pop ${msg.tone === 'ok' ? 'bg-ok-soft text-green-800 ring-green-200' : msg.tone === 'bad' ? 'bg-orange-50 text-orange-800 ring-orange-200' : 'bg-white text-ink ring-line'}`} aria-live="polite">
          <MathText text={msg.text} />
        </div>
      ) : (
        <p className="mt-3 text-center text-sm font-bold text-ink-soft">🚩’ten 🏁’e git. Çıkmaza girersen mor bir kutuya dokunup geri dönebilirsin.</p>
      )}
    </div>
  )
}
