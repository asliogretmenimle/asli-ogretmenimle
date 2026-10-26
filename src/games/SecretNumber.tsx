import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { ArrowRight, Delete } from 'lucide-react'
import type { Grade } from '../data/types'
import { randInt } from '../lib/random'
import { sfx } from '../lib/feedback'
import { fmt, fmtPlain } from '../lib/format'
import { Hud, signed, starsFor, type GameProps } from './kit'

interface Cfg {
  /** Sınırlar "birim" cinsinden (6. sınıfta onda birler) */
  min: number
  max: number
  scale: 1 | 10
  mode: 'tiles' | 'pad'
}

const CFG: Partial<Record<Grade, Cfg>> = {
  1: { min: 1, max: 20, scale: 1, mode: 'tiles' },
  2: { min: 1, max: 100, scale: 1, mode: 'pad' },
  3: { min: 1, max: 1000, scale: 1, mode: 'pad' },
  4: { min: 1, max: 10000, scale: 1, mode: 'pad' },
  6: { min: 0, max: 100, scale: 10, mode: 'pad' },
  7: { min: -50, max: 50, scale: 1, mode: 'pad' },
}

const ROUNDS = 4

type Mood = 'think' | 'up' | 'down' | 'happy' | 'oops'
interface Guess { u: number; dir: 'up' | 'down' | 'hit' }
interface Say { mood: Mood; title: string; text: string; key: number }

// Sayıdan sonra gelen "-den / -dan / -ten / -tan" eki
const UNIT_SUF = ['dan', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan']
const TEN_SUF = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan']
function abl(n: number): string {
  const a = Math.abs(n)
  const tenths = Math.round(a * 10) % 10
  if (tenths) return `’${UNIT_SUF[tenths]}`
  const i = Math.round(a)
  if (i === 0) return '’dan'
  if (i % 10) return `’${UNIT_SUF[i % 10]}`
  if (i % 100) return `’${TEN_SUF[(i % 100) / 10]}`
  return '’den'
}

/** Ortadan bölerek: 100 → 50 → 25 → … → 1 */
function halving(n: number): number[] {
  const out = [n]
  while (out[out.length - 1] > 1) out.push(Math.floor(out[out.length - 1] / 2))
  return out
}

function Detective({ mood }: { mood: Mood }) {
  const brow = mood === 'oops' ? 'M36 42 l9 3 M64 42 l-9 3' : mood === 'happy' ? 'M36 43 q5 -4 10 0 M54 43 q5 -4 10 0' : mood === 'think' ? 'M36 43 l10 -2 M54 41 l10 2' : 'M36 41 l10 0 M54 41 l10 0'
  const mouth = mood === 'happy' ? 'M42 60 q8 8 16 0' : mood === 'oops' ? 'M43 63 q7 -5 14 0' : mood === 'think' ? 'M44 62 h11' : 'M47 61 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0'
  return (
    <svg viewBox="0 0 100 112" className={`w-24 shrink-0 sm:w-28 ${mood === 'happy' ? 'animate-pop' : ''}`} aria-hidden>
      <ellipse cx={50} cy={108} rx={30} ry={4} fill="#0000001a" />
      <path d="M20 108 C20 82 33 74 50 74 C67 74 80 82 80 108 Z" fill="#a16207" />
      <path d="M50 74 L42 90 L50 108 L58 90 Z" fill="#fef3c7" />
      <circle cx={50} cy={50} r={22} fill="#fde3c4" stroke="#e8b98d" strokeWidth={1.5} />
      <path d="M26 38 Q50 6 74 38 Z" fill="#7c3aed" />
      <rect x={22} y={34} width={56} height={8} rx={4} fill="#5b21b6" />
      <circle cx={41} cy={50} r={3} fill="#1f2340" />
      <circle cx={59} cy={50} r={3} fill="#1f2340" />
      <path d={brow} stroke="#5b3a1a" strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <path d={mouth} stroke="#7c2d12" strokeWidth={2.2} strokeLinecap="round" fill={mood === 'up' || mood === 'down' ? '#7c2d12' : 'none'} />
      <line x1={74} y1={86} x2={65} y2={98} stroke="#334155" strokeWidth={5} strokeLinecap="round" />
      <circle cx={80} cy={78} r={11} fill="#e0f2fe" fillOpacity={0.8} stroke="#334155" strokeWidth={4} />
      <path d="M75 74 q3 -3 7 -2" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" />
    </svg>
  )
}

export default function SecretNumber({ grade, onFinish }: GameProps) {
  const cfg = CFG[grade] ?? (grade >= 7 ? CFG[7]! : CFG[4]!)
  const N = cfg.max - cfg.min + 1
  const optimal = Math.ceil(Math.log2(N + 1))
  const show = (u: number) => signed(fmt(u / cfg.scale, 1))
  const showAbl = (u: number) => show(u) + abl(u / cfg.scale)

  const [secrets] = useState(() => {
    const out: number[] = []
    while (out.length < ROUNDS) {
      const u = randInt(cfg.min, cfg.max)
      // 6. sınıfta çoğunlukla gerçekten ondalıklı sayılar
      if (cfg.scale === 10 && u % 10 === 0 && Math.random() < 0.8) continue
      if (!out.includes(u)) out.push(u)
    }
    return out
  })
  const [round, setRound] = useState(0)
  const [lo, setLo] = useState(cfg.min)
  const [hi, setHi] = useState(cfg.max)
  const [guesses, setGuesses] = useState<Guess[]>([])
  const [input, setInput] = useState('')
  const [tipShown, setTipShown] = useState(false)
  const [shake, setShake] = useState(0)
  const [score, setScore] = useState(0)
  const [counts, setCounts] = useState<number[]>([])
  const [say, setSay] = useState<Say>({
    mood: 'think',
    title: 'Bir sayı tuttum!',
    text: `Gizli sayı ${show(cfg.min)} ile ${show(cfg.max)} arasında${cfg.scale === 10 ? ' ve virgülden sonra tek basamaklı' : ''}. Tahminin ne?`,
    key: 0,
  })
  const finished = useRef(false)
  const secret = secrets[round]
  const found = guesses[guesses.length - 1]?.dir === 'hit'

  const talk = (mood: Mood, title: string, text: string) => setSay({ mood, title, text, key: Date.now() })
  const oops = (text: string) => {
    sfx.bad()
    setShake((k) => k + 1)
    talk('oops', 'Hmm, dikkat!', text)
  }

  const guess = (u: number) => {
    if (found) return
    if (u < cfg.min || u > cfg.max) return oops(`Gizli sayı ${show(cfg.min)} ile ${show(cfg.max)} arasında. Bu aralıktan bir sayı seç.`)
    if (u < lo || u > hi) {
      return oops(`${show(u)} olamaz! İpuçlarına göre gizli sayı ${show(lo)} ile ${show(hi)} arasında. Bu tahmini saymadım.`)
    }
    const n = guesses.length + 1
    setInput('')
    if (u === secret) {
      sfx.ok()
      setGuesses([...guesses, { u, dir: 'hit' }])
      setLo(u)
      setHi(u)
      const pts = n <= optimal ? 100 : Math.max(20, 100 - (n - optimal) * 15)
      setScore(score + pts)
      setCounts([...counts, n])
      talk('happy', 'Buldun! 🎉', n <= optimal
        ? `Gizli sayı ${show(u)}. ${n} tahminde buldun, harika dedektiflik! +${pts}`
        : `Gizli sayı ${show(u)}. ${n} tahminde buldun. Her seferinde ortayı seçseydin en fazla ${optimal} tahmin yeterdi. +${pts}`)
      return
    }
    const up = u < secret
    const nlo = up ? u + 1 : lo
    const nhi = up ? hi : u - 1
    const left = nhi - nlo + 1
    const before = hi - lo + 1
    setGuesses([...guesses, { u, dir: up ? 'up' : 'down' }])
    setLo(nlo)
    setHi(nhi)
    // Kötü bölme: aralığın çeyreğinden azı elendiyse bir kez ipucu ver
    const weak = (before - left) / before < 0.25 && left > 3
    const tip = weak && !tipShown ? ' İpucu: kalan aralığın ortasına yakın bir sayı seçersen, cevap ne olursa olsun yarısı elenir!' : ''
    if (tip) setTipShown(true)
    talk(up ? 'up' : 'down', up ? 'Daha büyük! ⬆️' : 'Daha küçük! ⬇️',
      `Gizli sayı ${showAbl(u)} ${up ? 'büyük' : 'küçük'}. Kalan: ${show(nlo)} – ${show(nhi)} (${fmt(left)} sayı).${tip}`)
  }

  const parse = (raw: string): number | null => {
    if (!raw || raw === '-' || raw.endsWith(',')) return null
    const v = Number(raw.replace(',', '.'))
    return Number.isFinite(v) ? Math.round(v * cfg.scale) : null
  }

  const submit = () => {
    const u = parse(input)
    if (u === null) return oops(cfg.scale === 10 ? 'Önce bir sayı yaz, ör. 3,7' : 'Önce bir sayı yaz.')
    guess(u)
  }

  const maxDigits = String(Math.max(Math.abs(cfg.min), cfg.max) / cfg.scale).length
  const type = (k: string) => {
    if (found) return
    setInput((p) => {
      if (k === '⌫') return p.slice(0, -1)
      if (k === '±') return p.startsWith('-') ? p.slice(1) : `-${p}`
      if (k === ',') return cfg.scale === 10 && !p.includes(',') ? `${p || '0'},` : p
      const [int, dec] = p.replace('-', '').split(',')
      if (dec !== undefined) return dec.length >= 1 ? p : p + k
      if (int === '0') return p.replace(/0$/, k)
      return int.length >= maxDigits ? p : p + k
    })
  }

  // Klavyeden de oynanabilsin
  const keys = useRef({ type, submit })
  keys.current = { type, submit }
  useEffect(() => {
    if (cfg.mode !== 'pad') return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (/^[0-9]$/.test(e.key)) keys.current.type(e.key)
      else if (e.key === 'Backspace') keys.current.type('⌫')
      else if ((e.key === ',' || e.key === '.') && cfg.scale === 10) keys.current.type(',')
      else if (e.key === '-' && cfg.min < 0) keys.current.type('±')
      else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) keys.current.submit()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cfg])

  const next = () => {
    if (round + 1 >= ROUNDS) {
      if (finished.current) return
      finished.current = true
      const total = counts.reduce((a, b) => a + b, 0)
      const chain = halving(N).map((x) => fmt(x)).join(' → ')
      onFinish({
        stars: starsFor(score / (ROUNDS * 100)),
        score,
        summary: `${ROUNDS} gizli sayıyı toplam ${total} tahminde buldun.`,
        insight: `Her seferinde kalan aralığın ortasını seçersen aralık yarıya iner: ${chain}. Bu yüzden ${fmt(N)} sayı arasından bile en fazla ${optimal} tahminde bulabilirsin!`,
      })
      return
    }
    setRound(round + 1)
    setLo(cfg.min)
    setHi(cfg.max)
    setGuesses([])
    setInput('')
    setTipShown(false)
    talk('think', 'Yeni bir sayı tuttum!', `Yine ${show(cfg.min)} ile ${show(cfg.max)} arasında. Bakalım bu kez kaç tahminde bulacaksın?`)
  }

  // Aralık çubuğu: her birim bir hücre
  const pct = (u: number) => ((u - cfg.min) / N) * 100
  const tapBar = (e: PointerEvent<HTMLDivElement>) => {
    if (found || cfg.mode !== 'pad') return
    const rect = e.currentTarget.getBoundingClientRect()
    const f = Math.min(0.9999, Math.max(0, (e.clientX - rect.left) / rect.width))
    const u = cfg.min + Math.floor(f * N)
    setInput(cfg.scale === 10 ? fmtPlain(u / 10, 1) : String(u))
  }
  const preview = parse(input)
  const display = input ? (cfg.scale === 1 && /^-?\d+$/.test(input) ? signed(fmt(Number(input))) : signed(input)) : '?'
  const padKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', cfg.scale === 10 ? ',' : cfg.min < 0 ? '±' : '', '0', '⌫']

  return (
    <div className="animate-fade-up">
      <Hud round={round + 1} rounds={ROUNDS} score={score} extra={<span className="chip bg-violet-50 px-3 py-1.5 text-sm text-violet-800 ring-1 ring-violet-200">🔍 {guesses.length} tahmin</span>} />

      <div className="flex items-end gap-2">
        <Detective mood={say.mood} />
        <div key={say.key} className={`relative mb-4 min-w-0 flex-1 rounded-3xl rounded-bl-md bg-white p-3 ring-1 ring-line animate-pop ${say.mood === 'oops' ? 'ring-orange-300' : say.mood === 'happy' ? 'ring-green-300' : ''}`} aria-live="polite">
          <p className={`text-xl leading-tight font-black sm:text-2xl ${say.mood === 'happy' ? 'text-green-700' : say.mood === 'oops' ? 'text-orange-700' : say.mood === 'think' ? '' : 'text-violet-700'}`}>{say.title}</p>
          <p className="mt-1 text-sm font-bold text-ink-soft sm:text-base">{say.text}</p>
        </div>
      </div>

      {/* Kalan aralık */}
      <div className="card mt-1 px-4 pt-3 pb-2">
        <p className="mb-1 text-center text-xs font-extrabold tracking-wide text-ink-soft uppercase">Gizli sayının olabileceği yer</p>
        <div
          className={`relative h-12 overflow-hidden rounded-xl bg-[repeating-linear-gradient(135deg,#e5e7eb_0_6px,#f3f4f6_6px_12px)] ring-1 ring-line ${cfg.mode === 'pad' && !found ? 'cursor-pointer touch-manipulation' : ''}`}
          onPointerDown={tapBar}
          aria-hidden
        >
          <div className={`absolute inset-y-0 rounded-lg transition-all duration-500 ${found ? 'bg-green-400' : 'bg-violet-400/80'}`} style={{ left: `${pct(lo)}%`, width: `max(4px, ${((hi - lo + 1) / N) * 100}%)` }} />
          {guesses.map((g, i) => (
            <div key={i} className={`absolute inset-y-0 w-0.5 ${g.dir === 'hit' ? 'bg-green-800' : 'bg-ink/70'}`} style={{ left: `${pct(g.u) + 50 / N}%` }} />
          ))}
          {preview !== null && !found && preview >= cfg.min && preview <= cfg.max && (
            <div className="absolute inset-y-0 w-1 -translate-x-1/2 bg-orange-500" style={{ left: `${pct(preview) + 50 / N}%` }} />
          )}
        </div>
        <div className="mt-1 flex justify-between text-xs font-extrabold text-ink-soft tabular-nums">
          <span>{show(cfg.min)}</span>
          <span className="text-violet-700">{found ? show(lo) : `${show(lo)} – ${show(hi)}`}</span>
          <span>{show(cfg.max)}</span>
        </div>
      </div>

      {guesses.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {guesses.map((g, i) => (
            <span key={i} className={`chip px-2.5 py-1 text-sm ring-1 ${g.dir === 'hit' ? 'bg-ok-soft text-green-800 ring-green-200' : 'bg-white text-ink ring-line'}`}>
              {show(g.u)} {g.dir === 'up' ? '⬆️' : g.dir === 'down' ? '⬇️' : '✅'}
            </span>
          ))}
        </div>
      )}

      {found ? (
        <div className="mt-4 text-center">
          <button type="button" onClick={next} className="btn-primary w-full max-w-xs" autoFocus>
            {round + 1 >= ROUNDS ? 'Bitir' : 'Sonraki dosya'}<ArrowRight size={18} />
          </button>
        </div>
      ) : cfg.mode === 'tiles' ? (
        <div key={shake} className={`mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10 ${shake ? 'animate-shake' : ''}`}>
          {Array.from({ length: N }, (_, i) => {
            const u = cfg.min + i
            const out = u < lo || u > hi
            const g = guesses.find((x) => x.u === u)
            return (
              <button
                key={u}
                type="button"
                onClick={() => guess(u)}
                aria-label={out ? `${u}, elendi` : `${u} tahmin et`}
                className={`grid min-h-12 place-items-center rounded-xl text-lg font-black ring-1 transition active:scale-95 ${out ? 'bg-slate-100 text-slate-300 ring-slate-200' : 'bg-white text-ink ring-violet-200 hover:bg-violet-50'}`}
              >
                {g ? <span className="text-sm">{u}{g.dir === 'up' ? '⬆' : '⬇'}</span> : u}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="mx-auto mt-4 max-w-xs">
          <div key={shake} className={`mb-3 rounded-2xl bg-ink px-4 py-2 text-center text-3xl font-black text-white tabular-nums ${shake ? 'animate-shake' : ''}`} aria-live="polite">
            {display}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {padKeys.map((k, i) =>
              k ? (
                <button key={i} type="button" onClick={() => type(k)} aria-label={k === '⌫' ? 'Sil' : k === '±' ? 'Eksi işareti' : k === ',' ? 'Virgül' : k} className="grid min-h-13 place-items-center rounded-2xl bg-white text-2xl font-black ring-1 ring-line transition hover:bg-paper active:scale-95">
                  {k === '⌫' ? <Delete size={24} /> : k === '±' ? '+/−' : k}
                </button>
              ) : <span key={i} />,
            )}
          </div>
          <button type="button" onClick={submit} className="btn-primary mt-3 w-full text-lg">Tahmin et</button>
          <p className="mt-2 text-center text-xs font-bold text-ink-soft">İpucu: çubuğa dokunarak da sayı seçebilirsin.</p>
        </div>
      )}
    </div>
  )
}
