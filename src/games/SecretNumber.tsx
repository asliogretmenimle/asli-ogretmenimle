import { useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, ChevronDown, ChevronRight, Eye, Minus, Plus, Search } from 'lucide-react'
import type { Grade, ManipulativeConfig, ManipulativeTool } from '../data/types'
import { pick, shuffle } from '../lib/random'
import { sfx } from '../lib/feedback'
import { fmt } from '../lib/format'
import { useTracker } from '../lib/trackerContext'
import { ZoomBox } from '../interactive/ZoomBox'
import { signed, starsFor, type GameProps } from './kit'
import { LevelDots, Nudge, Scene, StrategyPicker, TaskCard, useAge } from './kit2'

/**
 * Gizli Sayı Dedektifi (Van de Walle):
 *  - Çocuk yalnızca "büyük mü / küçük mü" değil, sayının özelliklerini sorar (çift mi, 5’in katı mı, onlar basamağı…).
 *  - Her cevaptan sonra olamayacak sayıları KENDİSİ eler (onluk tablo); yanlış elemede düşündüren soru gelir.
 *  - Her sorunun ne kadar aday elediği gösterilir: "Evet deseydi … / Hayır deseydi …" → yarıya bölen soru fikri.
 *  - Son dosyada üç sorudan hangisinin yarıyı eleyeceğini seçer.
 */

const ROUNDS = 4

type Kind = 'size' | 'digit' | 'prop' | 'guess'
interface QDef {
  id: string
  kind: Kind
  chip: string
  text: (p: number) => string
  test: (u: number, p: number) => boolean
  param?: { min: number; max: number; step: number; init: number; show: (p: number) => string }
}
interface Cfg {
  vals: number[]
  scale: 1 | 10
  cols: number
  handles: boolean
  qs: QDef[]
  tool: ManipulativeTool
  toolConfig?: ManipulativeConfig
}

type Mood = 'think' | 'up' | 'down' | 'happy' | 'oops'
interface Say { mood: Mood; title: string; text: string; key: number }
interface Ans { qid: string; p: number; text: string; kind: Kind; ans: boolean; before: number; after: number; yes: number }
type Phase = 'choose' | 'ask' | 'elim' | 'found'
interface Sel { qid: string; p: number }
interface NudgeMsg { q: string; mis?: string; tone?: 'ok' | 'think'; tool?: boolean; key: number }
interface Opt { qid: string; p: number; text: string; yes: number; kind: Kind }

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

// Soru eki (mı/mi/mu/mü): sayının okunuşundaki son ünlüye göre
const ONES_V = ['ı', 'i', 'i', 'ü', 'ö', 'e', 'ı', 'i', 'i', 'u']
const TENS_V = ['', 'o', 'i', 'u', 'ı', 'i', 'ı', 'i', 'e', 'a']
function lastVowel(n: number): string {
  const a = Math.abs(n)
  const t = Math.round(a * 10) % 10
  if (t) return ONES_V[t]
  const i = Math.round(a)
  if (i === 0) return 'ı'
  if (i % 10) return ONES_V[i % 10]
  if (i % 100) return TENS_V[(i % 100) / 10]
  if (i % 1000) return 'ü'
  return 'i'
}
const mi = (n: number) => ({ a: 'mı', ı: 'mı', e: 'mi', i: 'mi', o: 'mu', u: 'mu', ö: 'mü', ü: 'mü' } as Record<string, string>)[lastVowel(n)]

/** Ortadan bölerek: 100 → 50 → 25 → … → 1 */
function halving(n: number): number[] {
  const out = [n]
  while (out[out.length - 1] > 1) out.push(Math.floor(out[out.length - 1] / 2))
  return out
}

const seq = (a: number, b: number, step = 1) => Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => a + i * step)
const num = (u: number) => signed(fmt(u))

function cfgFor(grade: Grade): Cfg {
  const g = grade <= 1 ? 1 : grade === 2 ? 2 : grade === 3 ? 3 : grade <= 5 ? 4 : grade === 6 ? 6 : 7
  const digit = (id: string, chip: string, place: string, f: (u: number) => number, max = 9): QDef => ({
    id, kind: 'digit', chip, text: (p) => `${place} ${p} ${mi(p)}?`, test: (u, p) => f(u) === p, param: { min: 0, max, step: 1, init: Math.min(5, max), show: String },
  })
  const bigger = (min: number, max: number, step: number, init: number, show: (p: number) => string, val: (p: number) => number): QDef => ({
    id: 'big', kind: 'size', chip: '▲ Şundan büyük mü?', text: (p) => `${show(p)}${abl(val(p))} büyük mü?`, test: (u, p) => u > p, param: { min, max, step, init, show },
  })
  const prop = (id: string, chip: string, text: string, test: (u: number) => boolean, kind: Kind = 'prop'): QDef => ({ id, kind, chip, text: () => text, test: (u) => test(u) })
  switch (g) {
    case 1:
      return {
        vals: seq(1, 20), scale: 1, cols: 10, handles: false, tool: 'numberline', toolConfig: { min: 0, max: 20, step: 1 },
        qs: [
          bigger(1, 19, 1, 10, num, (p) => p),
          prop('even', 'Çift mi?', 'Çift mi?', (u) => u % 2 === 0),
          prop('m5', '5’er sayarken?', '5’er sayarken söylenir mi?', (u) => u % 5 === 0),
          prop('two', 'İki basamaklı mı?', 'İki basamaklı mı?', (u) => u >= 10, 'digit'),
        ],
      }
    case 2:
      return {
        vals: seq(1, 100), scale: 1, cols: 10, handles: true, tool: 'yuzluk',
        qs: [
          bigger(1, 99, 1, 50, num, (p) => p),
          prop('even', 'Çift mi?', 'Çift mi?', (u) => u % 2 === 0),
          prop('m5', '5’er sayarken?', '5’er sayarken söylenir mi?', (u) => u % 5 === 0),
          prop('m10', '10’ar sayarken?', '10’ar sayarken söylenir mi?', (u) => u % 10 === 0),
          digit('tens', 'Onlar basamağı?', 'Onlar basamağı', (u) => Math.floor(u / 10) % 10),
          digit('ones', 'Birler basamağı?', 'Birler basamağı', (u) => u % 10),
          prop('onesBig', 'Birler 5’ten büyük mü?', 'Birler basamağı 5’ten büyük mü?', (u) => u % 10 > 5, 'digit'),
        ],
      }
    case 3:
      return {
        vals: seq(10, 1000, 10), scale: 1, cols: 10, handles: true, tool: 'numberline', toolConfig: { min: 0, max: 1000, step: 100 },
        qs: [
          bigger(10, 990, 10, 500, num, (p) => p),
          digit('hund', 'Yüzler basamağı?', 'Yüzler basamağı', (u) => Math.floor(u / 100) % 10),
          digit('tens', 'Onlar basamağı?', 'Onlar basamağı', (u) => Math.floor(u / 10) % 10),
          prop('m100', '100’ün katı mı?', '100’ün katı mı?', (u) => u % 100 === 0),
          prop('m50', '50’nin katı mı?', '50’nin katı mı?', (u) => u % 50 === 0),
          prop('tensBig', 'Onlar 5’ten büyük mü?', 'Onlar basamağı 5’ten büyük mü?', (u) => Math.floor(u / 10) % 10 > 5, 'digit'),
        ],
      }
    case 4:
      return {
        vals: seq(100, 10000, 100), scale: 1, cols: 10, handles: true, tool: 'numberline', toolConfig: { min: 0, max: 10000, step: 1000 },
        qs: [
          bigger(100, 9900, 100, 5000, num, (p) => p),
          digit('thou', 'Binler basamağı?', 'Binler basamağı', (u) => Math.floor(u / 1000) % 10),
          digit('hund', 'Yüzler basamağı?', 'Yüzler basamağı', (u) => Math.floor(u / 100) % 10),
          prop('m1000', '1000’in katı mı?', '1000’in katı mı?', (u) => u % 1000 === 0),
          prop('m500', '500’ün katı mı?', '500’ün katı mı?', (u) => u % 500 === 0),
          prop('hundBig', 'Yüzler 5’ten büyük mü?', 'Yüzler basamağı 5’ten büyük mü?', (u) => Math.floor(u / 100) % 10 > 5, 'digit'),
        ],
      }
    case 6: {
      const show = (p: number) => fmt(p / 10, 1)
      return {
        vals: seq(1, 100), scale: 10, cols: 10, handles: true, tool: 'numberline', toolConfig: { min: 0, max: 10, step: 0.5 },
        qs: [
          bigger(5, 95, 5, 50, show, (p) => p / 10),
          digit('whole', 'Tam kısmı?', 'Tam kısmı', (u) => Math.floor(u / 10), 10),
          digit('tenth', 'Onda birler?', 'Onda birler basamağı', (u) => u % 10),
          prop('tenthBig', 'Onda birler 5’ten büyük mü?', 'Onda birler basamağı 5’ten büyük mü?', (u) => u % 10 > 5, 'digit'),
          { id: 'round', kind: 'digit', chip: 'Yuvarlayınca?', text: (p) => `En yakın tam sayıya yuvarlayınca ${p} ${mi(p)}?`, test: (u, p) => Math.floor((u + 5) / 10) === p, param: { min: 0, max: 10, step: 1, init: 5, show: String } },
          prop('int', 'Tam sayı mı?', 'Tam sayı mı?', (u) => u % 10 === 0),
        ],
      }
    }
    default:
      return {
        vals: seq(-50, 49), scale: 1, cols: 10, handles: true, tool: 'numberline', toolConfig: { min: -50, max: 50, step: 10 },
        qs: [
          prop('neg', 'Negatif mi?', 'Negatif mi?', (u) => u < 0, 'size'),
          bigger(-49, 48, 1, 0, num, (p) => p),
          { id: 'abs', kind: 'size', chip: 'Sıfıra uzaklığı?', text: (p) => `Sıfıra uzaklığı ${p}${abl(p)} büyük mü?`, test: (u, p) => Math.abs(u) > p, param: { min: 0, max: 45, step: 5, init: 25, show: String } },
          prop('even', 'Çift mi?', 'Çift mi?', (u) => Math.abs(u) % 2 === 0),
          prop('m5', '5’in katı mı?', '5’in katı mı?', (u) => u % 5 === 0),
        ],
      }
  }
}

/** Bir sorunun adayları ne kadar dengeli böldüğü: 1 = tam yarı, 0 = hiç bölmüyor */
const quality = (a: { yes: number; before: number }) => (a.before <= 1 ? 1 : 1 - Math.abs(a.yes / a.before - 0.5) * 2)

function Detective({ mood }: { mood: Mood }) {
  const brow = mood === 'oops' ? 'M36 42 l9 3 M64 42 l-9 3' : mood === 'happy' ? 'M36 43 q5 -4 10 0 M54 43 q5 -4 10 0' : mood === 'think' ? 'M36 43 l10 -2 M54 41 l10 2' : 'M36 41 l10 0 M54 41 l10 0'
  const mouth = mood === 'happy' ? 'M42 60 q8 8 16 0' : mood === 'oops' ? 'M43 63 q7 -5 14 0' : mood === 'think' ? 'M44 62 h11' : 'M47 61 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0'
  return (
    <svg viewBox="0 0 100 112" className={`w-20 shrink-0 sm:w-24 ${mood === 'happy' ? 'animate-pop' : ''}`} aria-hidden>
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

function badgeFor(a: Ans): { t: string; c: string } | null {
  if (a.before <= 1) return null
  const elim = (a.before - a.after) / a.before
  const q = quality(a)
  if (q >= 0.8) return { t: '⚖️ Yarıya yakın böldü', c: 'bg-emerald-100 text-emerald-800' }
  if (elim < 0.2) return { t: '🐢 Az eledi', c: 'bg-amber-100 text-amber-800' }
  if (q < 0.5) return { t: '🍀 Şanslı soru', c: 'bg-sky-100 text-sky-800' }
  return { t: '👍 İyi soru', c: 'bg-violet-100 text-violet-800' }
}

/** Bir sorunun kaç adayı elediğini gösteren kart */
function EffCard({ a }: { a: Ans }) {
  const elim = a.before - a.after
  const b = badgeFor(a)
  const no = a.before - a.yes
  return (
    <div className="mb-3 rounded-2xl bg-paper p-3 ring-1 ring-line animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <p className="text-sm font-black">“{a.text}” → {a.ans ? 'Evet' : 'Hayır'}</p>
        {b && <span className={`chip px-2.5 py-0.5 text-xs ${b.c}`}>{b.t}</span>}
      </div>
      <div className="mt-2 flex h-4 overflow-hidden rounded-full bg-slate-200 ring-1 ring-line" aria-hidden>
        <div className="h-full bg-violet-500 transition-all duration-500" style={{ width: `${(a.after / a.before) * 100}%` }} />
        <div className="h-full flex-1 bg-[repeating-linear-gradient(135deg,#cbd5e1_0_5px,#e2e8f0_5px_10px)]" />
      </div>
      <p className="mt-1.5 text-sm font-bold text-ink-soft">
        {a.before} adaydan <b className="text-ink">{elim}</b> tanesi elendi, <b className="text-violet-700">{a.after}</b> kaldı.
      </p>
      {a.before > 1 && (
        <p className="mt-0.5 text-xs font-bold text-ink-soft">Evet deseydi {a.yes}, hayır deseydi {no} aday kalırdı.</p>
      )}
    </div>
  )
}

const STRATS = ['Yarıya bölme', 'Basamak değerine göre sorma', 'Özelliklere göre sorma', 'Tek tek tahmin']

export default function SecretNumber({ grade, onFinish }: GameProps) {
  const cfg = useMemo(() => cfgFor(grade), [grade])
  const age = useAge(grade)
  const big = age.big
  const track = useTracker()
  const { vals, scale } = cfg
  const N = vals.length
  const show = (u: number) => (scale === 10 ? fmt(u / 10, 1) : num(u))
  const label = (u: number) => (scale === 10 ? (u / 10).toFixed(1).replace('.', ',') : num(u))
  const guessText = (u: number) => `Gizli sayı ${show(u)} ${mi(u / scale)}?`
  const rangeText = `${show(vals[0])} ile ${show(vals[N - 1])} arasında${scale === 10 ? ', virgülden sonra tek basamaklı' : vals[1] - vals[0] > 1 ? `, ${vals[1] - vals[0]}’${vals[1] - vals[0] === 10 ? 'un' : 'ün'} katı` : ''}`
  const qdef = (id: string) => cfg.qs.find((q) => q.id === id)!
  const testAns = (u: number, a: { qid: string; p: number; kind: Kind }) => (a.kind === 'guess' ? u === a.p : qdef(a.qid).test(u, a.p))

  const [secrets] = useState(() => {
    const out: number[] = []
    let guard = 0
    while (out.length < ROUNDS && guard++ < 1000) {
      const u = pick(vals)
      if (scale === 10 && u % 10 === 0 && Math.random() < 0.85) continue
      if (!out.includes(u)) out.push(u)
    }
    return out
  })
  const [round, setRound] = useState(0)
  const [answers, setAnswers] = useState<Ans[]>([])
  const [crossed, setCrossed] = useState<boolean[]>(() => Array(N).fill(false))
  const [fresh, setFresh] = useState<boolean[]>(() => Array(N).fill(false))
  const [phase, setPhase] = useState<Phase>('ask')
  const [sel, setSel] = useState<Sel | null>(null)
  const [params, setParams] = useState<Record<string, number>>(() => Object.fromEntries(cfg.qs.filter((q) => q.param).map((q) => [q.id, q.param!.init])))
  const [nudge, setNudge] = useState<NudgeMsg | null>(null)
  const [needHint, setNeedHint] = useState(false)
  const [eff, setEff] = useState<Ans | null>(null)
  const [flash, setFlash] = useState<number[]>([])
  const [choose, setChoose] = useState<{ opts: Opt[]; best: number; picked: number | null; ok: boolean; seen: number[] } | null>(null)
  const [roundPts, setRoundPts] = useState<number | null>(null)
  const [say, setSay] = useState<Say>({ mood: 'think', title: 'Bir sayı tuttum!', text: `Gizli sayı ${rangeText}. Bana soru sor, olamayacak sayıları ele, sonra tahmin et.`, key: 0 })
  const nk = useRef(1)
  const r = useRef({ errs: 0, hints: 0, chooseMiss: 0 })
  const stats = useRef({ total: 0, questions: 0, half: 0, errs: 0, over: false })

  const secret = secrets[round]
  const cand = useMemo(() => vals.map((u) => answers.every((a) => testAns(u, a) === a.ans)), [answers, vals])
  const candIdx = vals.map((_, i) => i).filter((i) => cand[i])
  const candCount = candIdx.length
  const last = answers[answers.length - 1]

  const talk = (mood: Mood, title: string, text: string) => setSay({ mood, title, text, key: Date.now() })
  const nudgeIt = (m: Omit<NudgeMsg, 'key'>) => setNudge({ ...m, key: nk.current++ })

  // ── Soru sor ─────────────────────────────────────────────
  const ask = (s: Sel) => {
    const before = candCount
    let a: Ans
    if (s.qid === 'guess') {
      const ans = s.p === secret
      a = { qid: 'guess', p: s.p, text: guessText(s.p), kind: 'guess', ans, before, yes: 1, after: ans ? 1 : before - 1 }
    } else {
      const q = qdef(s.qid)
      const ans = q.test(secret, s.p)
      const yes = candIdx.filter((i) => q.test(vals[i], s.p)).length
      a = { qid: q.id, p: s.p, text: q.text(s.p), kind: q.kind, ans, before, yes, after: ans ? yes : before - yes }
    }
    const next = [...answers, a]
    setAnswers(next)
    setSel(null)
    setNudge(null)
    setEff(null)
    setNeedHint(false)
    setFlash([])
    if (a.kind === 'guess') {
      if (a.ans) return found(next)
      const i = vals.indexOf(s.p)
      setCrossed((c) => c.map((x, j) => (j === i ? true : x)))
      setEff(a)
      talk('down', 'Hayır!', `Gizli sayı ${show(s.p)} değil. ${a.after} aday kaldı; sıradaki sorun ne?`)
      return
    }
    setFresh(Array(N).fill(false))
    setPhase('elim')
    talk(a.ans ? 'up' : 'down', a.ans ? 'Evet! ✔' : 'Hayır! ✖', `“${a.text}” sorusunun cevabı: ${a.ans ? 'EVET' : 'HAYIR'}. Şimdi gizli sayı olamayacak sayıları ele.`)
  }

  // ── Tahtaya dokunma ──────────────────────────────────────
  const tapCell = (i: number) => {
    const u = vals[i]
    if (phase === 'ask') {
      if (crossed[i]) return nudgeIt({ q: `${label(u)} sayısını daha önce eledin. Hangi ipucu onu eledi, hatırlıyor musun?` })
      setSel({ qid: 'guess', p: u })
      setNudge(null)
      return
    }
    if (phase !== 'elim' || !last) return
    if (crossed[i]) {
      if (fresh[i]) {
        setCrossed((c) => c.map((x, j) => (j === i ? false : x)))
        setFresh((c) => c.map((x, j) => (j === i ? false : x)))
      }
      return
    }
    if (cand[i]) {
      r.current.errs++
      stats.current.errs++
      track.attempt(false)
      setFlash([i])
      nudgeIt({
        q: `“${last.text}” sorusunu ${label(u)} için sor: cevap ne olurdu? Dedektif “${last.ans ? 'Evet' : 'Hayır'}” dedi. ${label(u)} bu cevaba uyuyor mu? O hâlde elenmeli mi?`,
        mis: `Elemede yanılgı: “${last.text}” → ${last.ans ? 'Evet' : 'Hayır'} cevabına uyan ${label(u)} sayısını eledi`,
        tool: true,
      })
      return
    }
    setCrossed((c) => c.map((x, j) => (j === i ? true : x)))
    setFresh((c) => c.map((x, j) => (j === i ? true : x)))
    setFlash([])
  }

  /** Satır/sütun okları: bir sırayı birden eler (olabilir olanları bırakır) */
  const tapGroup = (idxs: number[]) => {
    if (phase !== 'elim') return
    const open = idxs.filter((i) => !crossed[i])
    if (!open.length) {
      setCrossed((c) => c.map((x, j) => (idxs.includes(j) && fresh[j] ? false : x)))
      setFresh((c) => c.map((x, j) => (idxs.includes(j) ? false : x)))
      return
    }
    const keep = open.filter((i) => cand[i])
    const cut = open.filter((i) => !cand[i])
    setCrossed((c) => c.map((x, j) => (cut.includes(j) ? true : x)))
    setFresh((c) => c.map((x, j) => (cut.includes(j) ? true : x)))
    if (keep.length) {
      setFlash(keep)
      nudgeIt({ q: `Bu sırada hâlâ olabilecek sayılar var: ${keep.slice(0, 4).map(label).join(', ')}${keep.length > 4 ? '…' : ''}. Onlara dokunmadım. Sence neden hâlâ gizli sayı olabilirler?` })
    } else {
      setFlash([])
    }
  }

  const doneElim = () => {
    if (!last) return
    const missing = vals.map((_, i) => i).filter((i) => !cand[i] && !crossed[i])
    if (missing.length) {
      track.attempt(false)
      setNeedHint(true)
      nudgeIt({ q: `Henüz değil: dedektifin cevabına uymayan ${missing.length} sayı daha var. “${last.text}” sorusunu tahtadaki sayılara tek tek sor: cevabı “${last.ans ? 'Hayır' : 'Evet'}” olanlar elenmeli.` })
      return
    }
    track.attempt(true)
    setPhase('ask')
    setFresh(Array(N).fill(false))
    setEff(last)
    setNudge(null)
    setNeedHint(false)
    setFlash([])
    talk('think', 'Güzel eleme!', candCount === 1 ? 'Tek aday kaldı! Ona dokunup sor.' : `${candCount} aday kaldı. Hangi soru bunların yarısını eler?`)
  }

  const showHint = () => {
    const missing = vals.map((_, i) => i).filter((i) => !cand[i] && !crossed[i])
    track.hint()
    r.current.hints++
    setCrossed((c) => c.map((x, j) => (missing.includes(j) ? true : x)))
    setFresh((c) => c.map((x, j) => (missing.includes(j) ? true : x)))
    setFlash(missing)
    setNeedHint(false)
    if (last) nudgeIt({ q: `Turuncu çarpılı ${missing.length} sayıya bak: “${last.text}” sorusuna bu sayılar ne cevap verirdi? Hazırsan “Eledim” de.` })
  }

  // ── Tur sonu ─────────────────────────────────────────────
  const found = (list: Ans[]) => {
    sfx.ok()
    setPhase('found')
    const counted = list.filter((a) => a.before > 1)
    const qs = counted.map(quality)
    const avgQ = qs.length ? qs.reduce((x, y) => x + y, 0) / qs.length : 1
    const half = qs.filter((q) => q >= 0.7).length
    const clean = r.current.errs === 0 && r.current.hints === 0 && r.current.chooseMiss === 0
    const pts = Math.round(40 + 40 * avgQ + (clean ? 20 : r.current.errs + r.current.hints + r.current.chooseMiss <= 2 ? 10 : 0))
    stats.current.total += pts
    stats.current.questions += list.length
    stats.current.half += half
    setRoundPts(pts)
    track.item(clean)
    // Sorulardan strateji çıkar
    const n = list.length
    if (counted.length >= 2 && avgQ >= 0.6) track.strategy(STRATS[0])
    if (list.filter((a) => a.kind === 'digit').length >= n / 2) track.strategy(STRATS[1])
    if (list.filter((a) => a.kind === 'prop').length >= n / 2) track.strategy(STRATS[2])
    if (n >= 3 && list.filter((a) => a.kind === 'guess').length >= n / 2) track.strategy(STRATS[3])
    talk('happy', 'Buldun! 🎉', `Gizli sayı ${show(secret)}. ${n} soruda buldun${half ? `; sorularından ${half} tanesi adayları yarıya yakın böldü` : ''}.`)
    setNudge({
      tone: 'ok',
      key: nk.current++,
      q: avgQ >= 0.6 ? 'Sorularının çoğu, cevap ne olursa olsun adayların yaklaşık yarısını eledi. Dedektiflerin sırrı bu!' : 'Buldun! Peki hangi sorun en çok adayı eledi? Bir dahakine, cevap “evet” de olsa “hayır” da olsa yarıyı eleyecek bir soru dene.',
    })
  }

  const makeChoose = () => {
    const all: Opt[] = []
    for (const q of cfg.qs) {
      const ps = q.param ? seq(q.param.min, q.param.max, q.param.step) : [0]
      for (const p of ps) {
        const yes = vals.filter((u) => q.test(u, p)).length
        if (yes === 0 || yes === N) continue
        all.push({ qid: q.id, p, text: q.text(p), yes, kind: q.kind })
      }
    }
    const off = (o: Opt) => Math.abs(o.yes / N - 0.5)
    const sorted = [...all].sort((a, b) => off(a) - off(b))
    const best = pick(sorted.filter((o) => off(o) <= off(sorted[0]) + 0.02))
    const weakPool = all.filter((o) => o.qid !== best.qid && off(o) >= 0.25 && o.yes / N > 0.04 && o.yes / N < 0.96)
    const weak = weakPool.length ? pick(weakPool) : sorted[sorted.length - 1]
    const g = pick(vals)
    const guess: Opt = { qid: 'guess', p: g, text: guessText(g), yes: 1, kind: 'guess' }
    const opts = shuffle([best, weak, guess])
    return { opts, best: opts.indexOf(best), picked: null, ok: false, seen: [] as number[] }
  }

  const pickChoice = (i: number) => {
    if (!choose || choose.ok) return
    const ok = i === choose.best
    track.attempt(ok)
    setChoose({ ...choose, picked: i, ok, seen: [...choose.seen, i] })
    if (ok) {
      sfx.ok()
      nudgeIt({ tone: 'ok', q: `Evet! “${choose.opts[i].text}” sorusuna dedektif ne derse desin adayların yaklaşık yarısı elenir. Hadi soralım!` })
    } else {
      r.current.chooseMiss++
      const o = choose.opts[i]
      nudgeIt({
        q: `“${o.text}” sorusuna “evet” denirse ${o.yes} aday kalır; ya “hayır” denirse? ${N - o.yes} aday! Her iki cevapta da yarıya yakın eleyen soru hangisi?`,
        mis: o.kind === 'guess' ? 'Soru seçiminde yanılgı: tek bir sayıyı tahmin etmeyi en verimli soru sandı' : undefined,
      })
    }
  }

  const finish = () => {
    const s = stats.current
    if (s.over) return
    s.over = true
    const optimal = Math.ceil(Math.log2(N))
    onFinish({
      stars: starsFor(s.total / (ROUNDS * 100)),
      score: s.total,
      summary: `${ROUNDS} gizli sayıyı toplam ${s.questions} soruda buldun; sorularından ${s.half} tanesi adayları yarıya yakın böldü.`,
      insight: `İyi bir soru, cevabı “evet” de olsa “hayır” da olsa adayların yarısını eler: ${halving(N).map((x) => fmt(x)).join(' → ')}. Böylece ${N} aday arasından bile en fazla ${optimal} soruda bulabilirsin!`,
    })
  }

  const next = () => {
    if (round + 1 >= ROUNDS) return finish()
    const nr = round + 1
    setRound(nr)
    setAnswers([])
    setCrossed(Array(N).fill(false))
    setFresh(Array(N).fill(false))
    setSel(null)
    setNudge(null)
    setEff(null)
    setFlash([])
    setNeedHint(false)
    setRoundPts(null)
    r.current = { errs: 0, hints: 0, chooseMiss: 0 }
    if (nr === ROUNDS - 1) {
      setChoose(makeChoose())
      setPhase('choose')
      talk('think', 'Son dosya: soruyu birlikte seçelim!', `Yeni bir sayı tuttum (${rangeText}). Önce en akıllıca ilk soruyu düşünelim.`)
    } else {
      setChoose(null)
      setPhase('ask')
      talk('think', 'Yeni bir sayı tuttum!', `Yine ${rangeText}. Bu kez hangi soruyla başlayacaksın?`)
    }
  }

  // ── Görünüm ──────────────────────────────────────────────
  const selQ = sel && sel.qid !== 'guess' ? qdef(sel.qid) : null
  const selText = sel ? (sel.qid === 'guess' ? guessText(sel.p) : qdef(sel.qid).text(sel.p)) : ''
  const setParam = (d: number) => {
    if (!selQ?.param || !sel) return
    const { min, max, step } = selQ.param
    const p = Math.min(max, Math.max(min, sel.p + d * step))
    setParams({ ...params, [selQ.id]: p })
    setSel({ ...sel, p })
  }
  const bigStep = !!selQ?.param && (selQ.param.max - selQ.param.min) / selQ.param.step > 30
  const freshCount = fresh.filter(Boolean).length
  const btnH = big ? 'min-h-14' : 'min-h-12'
  const task =
    phase === 'choose' ? 'Hangi soru adayların yaklaşık yarısını eler? Seç ve nedenini düşün.'
      : phase === 'elim' ? `Dedektif “${last?.ans ? 'Evet' : 'Hayır'}” dedi. Artık gizli sayı olamayacak sayılara dokunup ele!`
        : phase === 'found' ? 'Gizli sayıyı buldun! Nasıl düşündün?'
          : 'Dedektife bir soru sor ya da tahtadaki bir sayıya dokunup tahmin et.'

  const longest = Math.max(...vals.map((u) => label(u).length))
  const cellText = grade <= 1 ? 'text-xl sm:text-2xl' : longest >= 5 ? 'text-[9px] sm:text-xs' : longest === 4 ? 'text-[10px] sm:text-sm' : longest === 3 ? 'text-xs sm:text-base' : 'text-sm sm:text-lg'
  const rows = Math.ceil(N / cfg.cols)

  const cell = (i: number) => {
    const u = vals[i]
    const hit = phase === 'found' && u === secret
    const isSel = sel?.qid === 'guess' && sel.p === u
    const x = crossed[i]
    const fr = fresh[i]
    const st = hit ? 'bg-green-500 text-white ring-2 ring-green-600'
      : isSel ? 'bg-amber-200 text-amber-950 ring-2 ring-amber-500'
        : x ? (fr ? 'bg-orange-50 text-orange-900/60 ring-1 ring-orange-200' : 'bg-slate-100 text-slate-500/70 ring-1 ring-slate-200')
          : phase === 'found' ? 'bg-white text-ink/40 ring-1 ring-line'
            : 'bg-white text-ink ring-1 ring-violet-200 hover:bg-violet-50'
    const fl = flash.includes(i)
    return (
      <button
        key={u}
        type="button"
        onClick={() => tapCell(i)}
        aria-label={x ? `${label(u)}, elendi` : phase === 'elim' ? `${label(u)} ele` : `${label(u)} tahmin et`}
        className={`relative grid min-w-0 place-items-center rounded-md font-black tabular-nums transition active:scale-95 sm:rounded-lg ${grade <= 1 ? 'min-h-14' : 'aspect-square'} ${cellText} ${fl ? 'z-10 bg-amber-50 text-ink outline-4 outline-amber-400 animate-pulse' : st}`}
      >
        <span className="leading-none">{label(u)}</span>
        {x && !hit && (
          <svg viewBox="0 0 10 10" className="pointer-events-none absolute inset-0 m-auto size-[72%]" aria-hidden>
            <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke={fr ? '#fb923c' : '#cbd5e1'} strokeWidth={0.9} strokeLinecap="round" />
          </svg>
        )}
      </button>
    )
  }

  const board = (
    <div className="mx-auto w-full max-w-[620px] rounded-3xl bg-white p-2 text-ink ring-1 ring-line sm:p-3 lg:max-w-none">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-1 px-1 text-xs font-extrabold text-ink-soft">
        <span>Olası sayılar: <b className="text-violet-700">{candCount}</b> / {N}</span>
        <span className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1"><span className="size-3 rounded bg-white ring-1 ring-violet-300" />aday</span>
          <span className="inline-flex items-center gap-1"><span className="size-3 rounded bg-slate-200" />elendi</span>
        </span>
      </div>
      <ZoomBox>
        <div className="pb-11">
          {cfg.handles ? (
            <div className="grid gap-1" style={{ gridTemplateColumns: `1.75rem repeat(${cfg.cols}, minmax(0, 1fr))` }}>
              <span />
              {Array.from({ length: cfg.cols }, (_, c) => (
                <button key={`c${c}`} type="button" onClick={() => tapGroup(seq(0, rows - 1).map((rr) => rr * cfg.cols + c).filter((i) => i < N))} disabled={phase !== 'elim'} aria-label={`${c + 1}. sütunu ele`} className="grid h-7 place-items-center rounded-md bg-violet-100 text-violet-700 transition active:scale-95 disabled:opacity-25">
                  <ChevronDown size={15} strokeWidth={3} />
                </button>
              ))}
              {Array.from({ length: rows }, (_, rr) => [
                <button key={`r${rr}`} type="button" onClick={() => tapGroup(seq(0, cfg.cols - 1).map((c) => rr * cfg.cols + c).filter((i) => i < N))} disabled={phase !== 'elim'} aria-label={`${rr + 1}. satırı ele`} className="grid w-7 place-items-center rounded-md bg-violet-100 text-violet-700 transition active:scale-95 disabled:opacity-25">
                  <ChevronRight size={15} strokeWidth={3} />
                </button>,
                ...seq(0, cfg.cols - 1).map((c) => rr * cfg.cols + c).filter((i) => i < N).map(cell),
              ])}
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">{vals.map((_, i) => cell(i))}</div>
          )}
        </div>
      </ZoomBox>
      {answers.length > 0 && (
        <div className="mt-2 border-t border-line pt-2">
          <p className="mb-1 px-1 text-xs font-extrabold tracking-wide text-ink-soft uppercase">Dedektif dosyası</p>
          <ol className="flex flex-wrap gap-1.5">
            {answers.map((a, i) => {
              const b = badgeFor(a)
              return (
                <li key={i} className="chip bg-paper px-2.5 py-1 text-xs text-ink ring-1 ring-line">
                  <span className="opacity-60">{i + 1}.</span> {a.text} <b className={a.ans ? 'text-green-700' : 'text-orange-700'}>{a.ans ? 'Evet' : 'Hayır'}</b>
                  {b && <span className="ml-0.5" title={b.t}>{b.t.slice(0, 2)}</span>}
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )

  const panel = (
    <div className="rounded-3xl bg-white p-3 text-ink ring-1 ring-line">
      {phase === 'ask' && (
        <>
          {eff && <EffCard a={eff} />}
          <p className="mb-2 text-xs font-black tracking-wide text-ink-soft uppercase">Soru bankası</p>
          <div className="grid grid-cols-2 gap-2">
            {cfg.qs.map((q) => {
              const on = sel?.qid === q.id
              return (
                <button key={q.id} type="button" onClick={() => { setSel({ qid: q.id, p: params[q.id] ?? 0 }); setNudge(null) }} aria-pressed={on} className={`${btnH} rounded-2xl px-2 text-sm leading-tight font-extrabold ring-2 transition active:scale-95 ${on ? 'bg-violet-600 text-white ring-violet-600' : 'bg-violet-50 text-violet-900 ring-violet-100 hover:bg-violet-100'}`}>
                  {q.chip}
                </button>
              )
            })}
          </div>
          {sel && (
            <div className="mt-3 rounded-2xl bg-paper p-3 ring-1 ring-line animate-fade-up">
              {selQ?.param && (
                <div className="mb-2 flex items-center justify-center gap-1.5">
                  {bigStep && <button type="button" onClick={() => setParam(-10)} className="h-12 rounded-xl bg-white px-2 text-sm font-black ring-1 ring-line active:scale-95" aria-label={`${selQ.param.show(selQ.param.step * 10)} azalt`}>−{selQ.param.show(selQ.param.step * 10)}</button>}
                  <button type="button" onClick={() => setParam(-1)} className="grid size-12 place-items-center rounded-xl bg-white ring-1 ring-line active:scale-95" aria-label="Azalt"><Minus size={20} /></button>
                  <span className="min-w-18 rounded-xl bg-ink px-3 py-2 text-center text-xl font-black text-white tabular-nums">{selQ.param.show(sel.p)}</span>
                  <button type="button" onClick={() => setParam(1)} className="grid size-12 place-items-center rounded-xl bg-white ring-1 ring-line active:scale-95" aria-label="Artır"><Plus size={20} /></button>
                  {bigStep && <button type="button" onClick={() => setParam(10)} className="h-12 rounded-xl bg-white px-2 text-sm font-black ring-1 ring-line active:scale-95" aria-label={`${selQ.param.show(selQ.param.step * 10)} artır`}>+{selQ.param.show(selQ.param.step * 10)}</button>}
                </div>
              )}
              <p className="text-center text-lg font-black">“{selText}”</p>
              {sel.qid === 'guess' && <p className="text-center text-xs font-bold text-ink-soft">Tahmin de bir sorudur!</p>}
            </div>
          )}
          <button type="button" onClick={() => sel && ask(sel)} disabled={!sel} className="btn-primary mt-3 w-full bg-violet-600 shadow-[0_4px_0_#5b21b6]">
            <Search size={19} />{sel?.qid === 'guess' ? 'Tahminimi sor' : 'Soruyu sor'}
          </button>
          <p className="mt-2 text-center text-xs font-bold text-ink-soft">Tahmin etmek için tahtadaki bir sayıya dokun.</p>
        </>
      )}

      {phase === 'elim' && last && (
        <>
          <p className="text-center text-lg font-black">“{last.text}” → <span className={last.ans ? 'text-green-700' : 'text-orange-700'}>{last.ans ? 'Evet' : 'Hayır'}</span></p>
          <p className="mt-1 text-center text-sm font-bold text-ink-soft">
            Olamayacak sayılara dokunup çarpı koy.{cfg.handles ? ' Oklar bir satırı ya da sütunu birden eler.' : ''} Yanlışlıkla çarpı koyduğuna tekrar dokunursan geri alırsın.
          </p>
          <p className="mt-2 text-center text-sm font-extrabold">Bu adımda elediğin: <span className="text-orange-700">{freshCount}</span></p>
          <button type="button" onClick={doneElim} className="btn-primary mt-3 w-full"><Check size={19} strokeWidth={3} />Eledim, bitti</button>
          {needHint && (
            <button type="button" onClick={showHint} className="btn-ghost mt-2 w-full"><Eye size={18} />Kalanları göster</button>
          )}
        </>
      )}

      {phase === 'choose' && choose && (
        <>
          <p className="mb-2 text-sm font-bold text-ink-soft">Tahtada {N} aday var. Dedektife yalnızca bir soru sorabilseydin hangisini seçerdin?</p>
          <div className="flex flex-col gap-2">
            {choose.opts.map((o, i) => {
              const picked = choose.picked === i
              const reveal = choose.seen.includes(i) || choose.ok
              return (
                <button key={i} type="button" onClick={() => pickChoice(i)} disabled={choose.ok} className={`${btnH} rounded-2xl px-3 py-2 text-left font-extrabold ring-2 transition active:scale-[0.98] ${choose.ok && i === choose.best ? 'bg-emerald-50 ring-emerald-400' : picked ? 'bg-amber-50 ring-amber-300' : 'bg-violet-50 ring-violet-100 hover:bg-violet-100'}`}>
                  <span className="block text-base">“{o.text}”</span>
                  {reveal && <span className="mt-0.5 block text-xs font-bold text-ink-soft">Evet → {o.yes} aday · Hayır → {N - o.yes} aday</span>}
                </button>
              )
            })}
          </div>
          {choose.ok && (
            <button type="button" onClick={() => { const o = choose.opts[choose.best]; setChoose(null); setPhase('ask'); ask({ qid: o.qid, p: o.p }) }} className="btn-primary mt-3 w-full bg-violet-600 shadow-[0_4px_0_#5b21b6]">
              <Search size={19} />Bu soruyu sor
            </button>
          )}
        </>
      )}

      {phase === 'found' && (
        <>
          <p className="text-center text-2xl font-black text-green-700">Gizli sayı: {show(secret)} 🎉</p>
          <p className="mt-1 text-center text-sm font-bold text-ink-soft">{answers.length} soru sordun{roundPts !== null ? ` · +${roundPts} puan` : ''}</p>
          <StrategyPicker key={round} question="Nasıl ilerledin?" options={STRATS} onPick={() => {}} />
          <button type="button" onClick={next} className="btn-primary mt-3 w-full">
            {round + 1 >= ROUNDS ? 'Sonuçları gör' : 'Sonraki dosya'}<ArrowRight size={18} />
          </button>
        </>
      )}
    </div>
  )

  return (
    <Scene grade={grade}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <LevelDots current={round} total={ROUNDS} />
        <div className="flex gap-1.5 text-sm">
          <span className="chip bg-white px-3 py-1 text-ink ring-1 ring-line">🔍 {answers.length} soru</span>
          <span className="chip bg-violet-50 px-3 py-1 text-violet-800 ring-1 ring-violet-200">🧩 {candCount} aday</span>
        </div>
      </div>
      <TaskCard step={round + 1} total={ROUNDS} tone={age.tier === 'atolye' ? 'dark' : 'brand'}>{task}</TaskCard>

      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-4">
        <div className="flex flex-col gap-3 lg:col-start-2 lg:row-start-1">
          <div className="flex items-end gap-2">
            <Detective mood={say.mood} />
            <div key={say.key} className={`relative mb-3 min-w-0 flex-1 rounded-3xl rounded-bl-md bg-white p-3 text-ink ring-1 animate-pop ${say.mood === 'happy' ? 'ring-green-300' : 'ring-line'}`} aria-live="polite">
              <p className={`text-lg leading-tight font-black sm:text-xl ${say.mood === 'happy' ? 'text-green-700' : say.mood === 'up' ? 'text-green-700' : say.mood === 'down' ? 'text-orange-700' : ''}`}>{say.title}</p>
              <p className="mt-1 text-sm font-bold text-ink-soft">{say.text}</p>
            </div>
          </div>
          {panel}
          {nudge && (
            <Nudge
              key={nudge.key}
              question={nudge.q}
              tone={nudge.tone}
              misconception={nudge.mis}
              tool={nudge.tool ? cfg.tool : undefined}
              toolConfig={nudge.tool ? cfg.toolConfig : undefined}
              toolTitle="Sayıları modelde incele"
              onClose={() => setNudge(null)}
            />
          )}
        </div>
        <div className="lg:col-start-1 lg:row-start-1">{board}</div>
      </div>
    </Scene>
  )
}
