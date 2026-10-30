import { useEffect, useMemo, useRef, useState } from 'react'
import { useDrag } from '@use-gesture/react'
import { CheckCheck, MessageCircleQuestion, Sparkles, Trophy } from 'lucide-react'
import type { GameProps } from '../../kit'
import { starsFor } from '../../kit'
import { Scene, StrategyPicker } from '../../kit2'
import { Card, Choices, Header, NextButton, Nudge, rng } from '../../../interactions/donusum-studyosu/ortak'
import { useTracker } from '../../../lib/trackerContext'
import { sfx } from '../../../lib/feedback'
import { ek } from '../../../lib/generators'
import { commonDivisors, factorString, factorize, gcd, isPrime } from '../../../lib/numberTheory'
import { makeGates, makePool, type Gate, type Token } from './pool'
import { FactorCircle, GateArt, Guard, sceneCss, type GateState, type Mood } from './scene'
import { meta } from './meta'

/**
 * Asal Bekçi — aralarında asal sayılar (8. sınıf, Çarpanlar ve Katlar)
 *  - Kapının tabelasında hedef sayı T var. Havuzdaki bir sayı kapıya sürüklenir (ya da sayıya, sonra kapıya dokunulur).
 *  - EBOB(T, n) > 1 → kapı kırmızı yanar ve kapanır; çarpan çemberinde ortak çarpanlar parlar, bekçi nedenini söyler.
 *  - EBOB(T, n) = 1 → kapı yeşil ışıkla açılır, sayı kaleye girer.
 *  - 6 kapı: ilk üçünde keşif, son üçünde önce “hangileri geçer?” tahmini; 3. ve 6. kapıdan sonra keşif soruları
 *    (iki bileşik sayı aralarında asal olabilir mi? ardışık sayılar hep aralarında asal mı?).
 *  - Puan: geçen sayı 20 (bir önceki deneme geri döndüyse 10), hatasız kapı +30, doğru tahmin başına +5, ilk denemede doğru keşif cevabı +25.
 */

type Attempt = { n: number; ok: boolean; key: number }
type Phase = 'predict' | 'play' | 'cleared'

const QUESTION = {
  'iki-bilesik': {
    options: [
      { id: 'evet', label: 'Evet: ortak çarpanları yalnızca 1 olabilir' },
      { id: 'hayir', label: 'Hayır: ikisinin de asal olması gerekir' },
      { id: 'biri', label: 'Yalnızca biri asalsa olur' },
    ],
    answer: 'evet',
    nudge: '8 = 2 · 2 · 2 ve 15 = 3 · 5. İkisi de asal değil. Ortak bir asal çarpanları var mı? Çarpan çemberinde ortada ne kalırdı?',
    misconception: 'Aralarında asal olmak için sayıların kendilerinin asal olması gerektiğini düşündü',
    explain: 'Doğru! Aralarında asal olmak sayıların değil, ortak çarpanların özelliğidir. 8 ile 15 bileşiktir ama 1’den başka ortak çarpanları yoktur: EBOB(8, 15) = 1.',
  },
  ardisik: {
    options: [
      { id: 'her', label: 'Her zaman aralarında asaldır' },
      { id: 'bazen', label: 'Bazen aralarında asaldır' },
      { id: 'hic', label: 'Hiçbir zaman aralarında asal değildir' },
    ],
    answer: 'her',
    nudge: 'Bir sayı hem n’yi hem n + 1’i bölüyorsa ikisinin farkını, yani 1’i de bölmek zorunda. 1’i bölen hangi sayılar var?',
    misconception: 'Ardışık sayıların her zaman aralarında asal olduğunu fark etmedi',
    explain: 'Doğru! İki sayıyı bölen her sayı farklarını da böler. Ardışık sayıların farkı 1 olduğundan tek ortak bölenleri 1’dir: ardışık sayılar her zaman aralarında asaldır.',
  },
} as const

export default function AsalBekci({ grade, onFinish }: GameProps) {
  const track = useTracker()
  const r = useMemo(() => rng(Date.now() % 100000), [])
  const gates = useMemo(() => makeGates(r), [r])
  const [gi, setGi] = useState(0)
  const gate = gates[gi]
  const last = gi === gates.length - 1
  const [orig, setOrig] = useState<Token[]>(() => makePool(gates[0], r, 0))
  const [pool, setPool] = useState<Token[]>(orig)
  const [passed, setPassed] = useState<number[]>([])
  const [phase, setPhase] = useState<Phase>(gate.predict ? 'predict' : 'play')
  const [predicted, setPredicted] = useState<Set<number>>(new Set())
  const [selected, setSelected] = useState<number | null>(null)
  const [drag, setDrag] = useState<{ id: number; x: number; y: number } | null>(null)
  const [over, setOver] = useState(false)
  const [state, setState] = useState<GateState>('idle')
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [speech, setSpeech] = useState(() => welcome(gates[0]))
  const [mood, setMood] = useState<Mood>('neutral')
  const [nudge, setNudge] = useState<{ q: string; m?: string } | null>(null)
  const [score, setScore] = useState(0)
  const [gateNote, setGateNote] = useState('')
  const [qPick, setQPick] = useState<string | null>(null)
  const [qDone, setQDone] = useState(false)
  const [strategy, setStrategy] = useState(false)
  const fails = useRef(0)
  const lastFailed = useRef(false)
  const qWrong = useRef(false)
  const stats = useRef({ firstGates: 0, firstQ: 0, total: 0 })
  const passedRef = useRef<{ T: number; n: number }[]>([])
  const timers = useRef<number[]>([])
  const zone = useRef<HTMLDivElement>(null)
  const keyRef = useRef(0)

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, ms))
  const busy = state === 'approach' || state === 'open'

  const inZone = (x: number, y: number) => {
    const b = zone.current?.getBoundingClientRect()
    return !!b && x >= b.left && x <= b.right && y >= b.top && y <= b.bottom
  }

  const bind = useDrag(
    ({ args: [id], movement: [mx, my], xy: [x, y], first, last: end, tap }) => {
      if (phase === 'cleared') return
      if (tap) {
        if (phase === 'predict') return togglePredict(id as number)
        setSelected((s) => (s === id ? null : (id as number)))
        return
      }
      if (phase !== 'play' || busy) return
      if (first) setSelected(null)
      if (end) {
        setDrag(null)
        setOver(false)
        if (inZone(x, y)) drop(id as number)
        return
      }
      setDrag({ id: id as number, x: mx, y: my })
      setOver(inZone(x, y))
    },
    { filterTaps: true, pointer: { capture: true } },
  )

  function togglePredict(id: number) {
    setPredicted((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function drop(id: number) {
    if (phase !== 'play' || busy) return
    const t = pool.find((p) => p.id === id)
    if (!t) return
    const T = gate.T
    timers.current.forEach(clearTimeout)
    timers.current = []
    setSelected(null)
    setNudge(null)
    keyRef.current++
    setAttempt({ n: t.n, ok: t.pass, key: keyRef.current })
    setState('approach')
    setMood('think')
    setSpeech(`Bakalım… ${T} ile ${t.n}. Ortak çarpanlarınıza bakıyorum!`)
    const guess = gate.predict ? (predicted.has(id) === t.pass ? ' Tahminin doğruydu!' : ' Tahmininde yanılmıştın.') : ''
    later(550, () => {
      track.attempt(t.pass)
      if (t.pass) {
        sfx.ok()
        setState('open')
        setMood('happy')
        const pts = lastFailed.current ? 10 : 20
        lastFailed.current = false
        setScore((s) => s + pts)
        setSpeech((t.n === 1 ? `Tebrikler 1! Senin tek bölenin zaten 1. ` : `Tebrikler ${t.n}! `) + `1’den başka ortak böleniniz yok, aralarında asalsınız.` + guess)
        const now = [...passed, t.n]
        passedRef.current.push({ T, n: t.n })
        later(1100, () => {
          setPool((p) => p.filter((x) => x.id !== id))
          setPassed(now)
          setState('idle')
          if (now.length >= gate.need) clearGate(now)
        })
      } else {
        sfx.bad()
        fails.current++
        lastFailed.current = true
        setState('closed')
        setMood('stern')
        const cd = commonDivisors(T, t.n).filter((d) => d > 1)
        setSpeech(`Dur! 1 dışında ortak bir çarpanınız var: ${cd.join(', ')}. Geçemezsin!` + guess)
        setPool((p) => p.map((x) => (x.id === id ? { ...x, tried: true } : x)))
        setNudge(nudgeFor(T, t))
        later(1300, () => setState('idle'))
      }
    })
  }

  function clearGate(now: number[]) {
    const first = fails.current === 0
    track.item(first)
    if (first) stats.current.firstGates++
    stats.current.total += now.length
    let bonus = first ? 30 : 0
    let note = first ? 'Hiç geri dönen sayı olmadan geçtin: +30 bonus!' : ''
    if (gate.predict) {
      const right = orig.filter((t) => predicted.has(t.id) === t.pass).length
      bonus += right * 5
      note += `${note ? ' ' : ''}Tahmin isabetin: ${right}/${orig.length} (+${right * 5}).`
    }
    setScore((s) => s + bonus)
    setGateNote(note)
    setPhase('cleared')
    setMood('happy')
    setSpeech(`Kapı ${gate.T} tamam! ${now.length} sayı kaleye girdi.`)
    setNudge(null)
  }

  const nextGate = () => {
    if (last) {
      const s = stats.current
      onFinish({
        stars: starsFor((s.firstGates + s.firstQ) / (gates.length + 2)),
        score,
        summary: `${gates.length} kapıdan ${s.total} sayıyı geçirdin ve ${score} puan topladın.`,
        insight: 'İki sayının 1’den başka ortak böleni yoksa (EBOB = 1) bu sayılar aralarında asaldır. Sayıların kendilerinin asal olması gerekmez (8 ile 15), asal bir sayı da hedefi bölüyorsa geçemez; ardışık sayılar ve 1 ise her kapıdan geçer.',
      })
      return
    }
    const g = gates[gi + 1]
    const p = makePool(g, r, (gi + 1) * 100)
    setGi(gi + 1)
    setOrig(p)
    setPool(p)
    setPassed([])
    setPhase(g.predict ? 'predict' : 'play')
    setPredicted(new Set())
    setAttempt(null)
    setState('idle')
    setMood('neutral')
    setSpeech(welcome(g))
    setNudge(null)
    setGateNote('')
    setQPick(null)
    setQDone(false)
    fails.current = 0
    lastFailed.current = false
    qWrong.current = false
  }

  const answer = (id: string) => {
    if (!gate.question || qDone) return
    const q = QUESTION[gate.question]
    setQPick(id)
    const ok = id === q.answer
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      setQDone(true)
      track.item(!qWrong.current)
      if (!qWrong.current) {
        stats.current.firstQ++
        setScore((s) => s + 25)
      }
    } else {
      sfx.bad()
      qWrong.current = true
    }
  }

  const askGuard = () => {
    track.hint()
    const ps = factorize(gate.T).map(([p]) => p)
    setNudge({ q: `${gate.T} = ${factorString(gate.T)}. Bir sayının ${gate.T} ile 1’den başka ortak çarpanı varsa ${ps.map((p) => ek(p, 'dat')).join(' ya da ')} bölünür. Havuzdaki sayıları bu gözle tara!` })
  }

  const qReady = !gate.question || qDone
  const remainingPass = pool.filter((t) => t.pass).map((t) => t.n)

  return (
    <Scene grade={grade}>
      <style>{sceneCss}</style>
      <Header emoji="💂" kicker="Kapı" title={`Hedef sayı: ${gate.T}`} idx={gi} total={gates.length} dark right={<span className="chip bg-amber-400/15 px-3 py-1.5 text-sm text-amber-300 ring-1 ring-amber-400/40"><Trophy size={15} />{score}</span>} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Sahne */}
        <div className="min-w-0 rounded-3xl bg-slate-900/70 p-2 ring-1 ring-slate-600 sm:p-3">
          <div className="relative mb-1 ml-2 w-fit max-w-[calc(100%-1rem)] rounded-2xl bg-white px-3.5 py-2 text-[15px] leading-snug font-extrabold text-ink shadow-md sm:text-base" aria-live="polite">
            {speech}
            <span className="absolute -bottom-2 left-10 size-4 rotate-45 bg-white" aria-hidden />
          </div>
          <div
            ref={zone}
            onClick={() => selected !== null && drop(selected)}
            className={`rounded-2xl transition ${over || selected !== null ? 'bg-amber-300/10 ring-2 ring-amber-300 ring-dashed' : ''} ${selected !== null ? 'cursor-pointer' : ''}`}
            role={selected !== null ? 'button' : undefined}
            aria-label={selected !== null ? 'Seçili sayıyı kapıya götür' : undefined}
          >
            <svg viewBox="0 0 420 246" className="block w-full" role="img" aria-label={`Hedef sayısı ${gate.T} olan kapı`}>
              <Guard mood={mood} />
              <GateArt T={gate.T} state={state} n={attempt && state !== 'idle' ? attempt.n : null} enterKey={attempt?.key ?? 0} />
            </svg>
          </div>
          {attempt && state !== 'approach' && <div className="lg:hidden"><FactorCircle key={attempt.key} T={gate.T} n={attempt.n} /></div>}
          {/* Sayı havuzu */}
          <div className="mt-2 rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600">
            <p className="mb-2 text-xs font-black tracking-wide text-slate-300 uppercase">
              {phase === 'predict' ? 'Tahmin: geçeceğini düşündüğün sayılara dokun' : phase === 'cleared' ? 'Sayı havuzu' : 'Sayı havuzu · kapıya sürükle ya da dokun, sonra kapıya dokun'}
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {pool.map((t) => {
                const d = drag?.id === t.id ? drag : null
                const pr = predicted.has(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    data-handle
                    {...bind(t.id)}
                    aria-pressed={phase === 'predict' ? pr : selected === t.id}
                    aria-label={`${t.n}${t.tried ? ', denendi' : ''}`}
                    className={`relative grid size-14 touch-none place-items-center rounded-full text-xl font-black select-none ${d ? 'z-50 scale-110 shadow-2xl' : 'transition'} ${selected === t.id ? 'bg-amber-300 text-ink ring-4 ring-amber-200' : t.tried ? 'bg-slate-600 text-slate-200 ring-2 ring-rose-400/70' : 'bg-gradient-to-b from-indigo-300 to-indigo-500 text-white ring-2 ring-indigo-200/60'} ${phase === 'cleared' ? 'opacity-50' : 'cursor-grab'}`}
                    style={d ? { transform: `translate(${d.x}px, ${d.y}px) scale(1.1)` } : undefined}
                  >
                    {t.n}
                    {pr && <span className="absolute -top-1.5 -right-1.5 grid size-6 place-items-center rounded-full bg-emerald-400 text-xs text-white ring-2 ring-slate-900">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Panel */}
        <div className="flex min-w-0 flex-col gap-3">
          <Card dark>
            <p className="text-xs font-black tracking-wide text-pink-300 uppercase">Görev</p>
            <p className="mt-1 text-lg leading-snug font-extrabold text-white">
              {phase === 'predict' ? `Önce tahmin et: ${gate.T} ile aralarında asal olan sayılar hangileri?` : `${gate.T} ile aralarında asal olan ${gate.need} sayıyı kapıdan geçir.`}
            </p>
            <div className="mt-2 flex items-center gap-2">
              {Array.from({ length: gate.need }, (_, i) => (
                <span key={i} className={`grid h-10 min-w-10 place-items-center rounded-xl px-2 text-lg font-black ${passed[i] !== undefined ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400 ring-1 ring-slate-500'}`}>{passed[i] ?? '?'}</span>
              ))}
            </div>
          </Card>

          {phase === 'predict' && (
            <Card dark>
              <p className="text-sm font-bold text-slate-200">Hesap yapmadan önce düşün: hangi sayıların {gate.T} ile 1’den başka ortak çarpanı yok? Seçtiklerin ✓ ile işaretlenir.</p>
              <button type="button" onClick={() => setPhase('play')} className="btn-primary mt-3 min-h-14 w-full text-lg"><CheckCheck size={20} />Tahminimi kaydet ({predicted.size})</button>
            </Card>
          )}

          {phase === 'play' && (
            <button type="button" onClick={askGuard} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-700 px-3 text-sm font-extrabold text-slate-100 ring-1 ring-slate-500 hover:bg-slate-600">
              <MessageCircleQuestion size={18} />Bekçiye sor: {gate.T} hangi asallardan oluşuyor?
            </button>
          )}

          {attempt && state !== 'approach' && <div className="hidden rounded-2xl bg-slate-900/70 p-2 ring-1 ring-slate-600 lg:block"><FactorCircle key={attempt.key} T={gate.T} n={attempt.n} /></div>}

          {nudge && <Nudge question={nudge.q} misconception={nudge.m} onClose={() => setNudge(null)} />}

          {phase === 'cleared' && (
            <Card dark className="animate-fade-up">
              <p className="flex items-center gap-2 text-lg font-black text-emerald-300"><Sparkles size={20} />Kapı açıldı!</p>
              <p className="mt-1 text-sm font-bold text-slate-200">Kaleye girenler: {passed.join(', ')}.{remainingPass.length > 0 && ` Havuzda geçebilecek başka sayılar da vardı: ${remainingPass.join(', ')}.`}</p>
              {gateNote && <p className="mt-2 text-sm font-extrabold text-amber-300">{gateNote}</p>}
            </Card>
          )}

          {phase === 'cleared' && gate.question && (
            <QuestionCard kind={gate.question} pick={qPick} done={qDone} onPick={answer} history={passedRef.current} gates={gates} />
          )}

          {phase === 'cleared' && qReady && last && !strategy && (
            <StrategyPicker options={meta.strategies ?? []} onPick={() => setStrategy(true)} question="Sayıların kapıdan geçip geçmeyeceğine nasıl karar verdin?" />
          )}

          {phase === 'cleared' && qReady && (!last || strategy) && <NextButton last={last} onClick={nextGate} />}
        </div>
      </div>
    </Scene>
  )
}

function welcome(g: Gate) {
  return `Ben Asal Bekçi! Kapımda ${g.T} yazıyor. Yalnızca ${g.T} ile 1’den başka ortak çarpanı olmayan sayılar geçebilir. Bir sayıyı kapıya getir!`
}

function nudgeFor(T: number, t: Token): { q: string; m?: string } {
  const cd = commonDivisors(T, t.n).filter((d) => d > 1)
  if (t.kind === 'primeFactor')
    return { q: `${t.n} asal bir sayı ama ${T} sayısını bölüyor (${T} = ${t.n} × ${T / t.n}). Bir sayının asal olması, kapıdaki sayıyla aralarında asal olması için yeter mi?`, m: 'Asal olan her sayının her sayıyla aralarında asal olduğunu düşündü' }
  if (t.n % T === 0)
    return { q: `${t.n} = ${T} × ${t.n / T}. ${ek(T, 'gen')} bütün çarpanları ${ek(t.n, 'gen')} da çarpanı olmaz mı? Öyleyse EBOB kaç olur?`, m: 'Bir sayının katıyla aralarında asal olabileceğini düşündü' }
  return { q: `Çarpan çemberinde parlayan sayılara bak: ${cd.join(', ')}. ${T} ile ${t.n} hangi sayıya birlikte bölünüyor? EBOB(${T}, ${t.n}) = ${gcd(T, t.n)}.` }
}

function QuestionCard({ kind, pick, done, onPick, history, gates }: { kind: 'iki-bilesik' | 'ardisik'; pick: string | null; done: boolean; onPick: (id: string) => void; history: { T: number; n: number }[]; gates: Gate[] }) {
  const q = QUESTION[kind]
  let prompt: string
  if (kind === 'iki-bilesik') {
    const ex = [...history].reverse().find((h) => h.n > 3 && !isPrime(h.n) && !isPrime(h.T))
    prompt = `${ex ? `${ex.T} ile ${ex.n} ikisi de asal değil ama ${ex.n} kapıdan geçti.` : 'Kapıdan asal olmayan sayılar da geçti.'} İki sayının ikisi de asal olmadan aralarında asal olabilir mi?`
  } else {
    prompt = `Her kapıda tabeladaki sayının bir fazlası da havuzdaydı: ${gates.map((g) => `${g.T} ile ${g.T + 1}`).join(', ')}. Ardışık iki sayı için ne söylersin?`
  }
  const wrong = pick !== null && pick !== q.answer
  return (
    <Card dark className="animate-fade-up">
      <p className="mb-2 text-xs font-black tracking-wide text-pink-300 uppercase">Keşif sorusu</p>
      <p className="mb-3 text-base leading-snug font-extrabold text-white">{prompt}</p>
      <Choices options={q.options.map((o) => ({ id: o.id, label: o.label }))} value={pick} onPick={onPick} disabled={done} cols={1} />
      {wrong && <div className="mt-3"><Nudge key={pick} question={q.nudge} misconception={q.misconception} /></div>}
      {done && <div className="mt-3"><Nudge question={q.explain} tone="ok" /></div>}
    </Card>
  )
}
