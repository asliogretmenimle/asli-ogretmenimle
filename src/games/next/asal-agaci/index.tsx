import { useRef, useState } from 'react'
import { Leaf, Sparkles, Trophy, TreeDeciduous } from 'lucide-react'
import type { GameProps } from '../../kit'
import { starsFor, useWidth } from '../../kit'
import { Scene, StrategyPicker } from '../../kit2'
import { MathText } from '../../../components/MathText'
import { useTracker } from '../../../lib/trackerContext'
import { sfx } from '../../../lib/feedback'
import { factorPairs, factorize, isPrime } from '../../../lib/numberTheory'
import { ek, gen } from '../../../lib/generators'
import { Card, CheckButton, Choices, GhostButton, Header, NextButton, Nudge, Prompt, Split, Stage, Stepper, shuffle } from '../../../interactions/donusum-studyosu/ortak'

/**
 * Asal Çarpan Ağacı (8. sınıf — Çarpanlar ve Katlar), puanlı oyun
 *  - Bileşik bir yaprağa dokun → seçeneklerden bir çarpan çiftiyle iki dala ayır (1 × n ve yakın ama yanlış çiftler tuzaktır).
 *  - Asal yaprağı “Asal!” diyerek altına çevir. Ardışık doğru hamleler kombo çarpanı getirir.
 *  - Ağaç bitince asal çarpanları üslü yaz (üs seçiciler) → bonus.
 *  - Aynı sayıyı farklı bir ilk dalla yeniden ayır: yapraklar aynı çıkarsa büyük bonus (aritmetiğin temel teoremi).
 */

const LEVELS = [24, 36, 60, 84, 120, 210, 360]
const STRATEGIES = ['Önce 2’ye böldüm', 'Bildiğim bir çarpımla ayırdım (36 × 10)', 'Bölünebilme kurallarını kullandım', 'Farklı bir ilk dal denedim']

type T = { n: number; k?: [T, T]; gold?: boolean }
type Gain = { pts: number; label: string; id: number }
type Mode = 'build' | 'exp' | 'offer' | 'build2' | 'compare'

const leaves = (t: T): T[] => (t.k ? [...leaves(t.k[0]), ...leaves(t.k[1])] : [t])
const at = (t: T, p: string): T => (p === '' ? t : at(t.k![Number(p[0])], p.slice(1)))
const update = (t: T, p: string, f: (x: T) => T): T => {
  if (p === '') return f(t)
  const k = t.k!.slice() as [T, T]
  k[Number(p[0])] = update(k[Number(p[0])], p.slice(1), f)
  return { ...t, k }
}
/** Soldan sağa altın olmayan ilk yaprağın yolu */
const firstOpen = (t: T, p = ''): string | null => {
  if (!t.k) return t.gold ? null : p
  return firstOpen(t.k[0], p + '0') ?? firstOpen(t.k[1], p + '1')
}
const leafValues = (t: T) => leaves(t).map((l) => l.n).sort((a, b) => a - b)
const pairKey = ([a, b]: [number, number]) => `${Math.min(a, b)}×${Math.max(a, b)}`

/** Bir yaprak için 4 seçenek: 1 × m tuzağı, en çok 2 doğru çift, yakın ama yanlış çiftler */
function optionsFor(m: number, forbid?: string): [number, number][] {
  const valid = shuffle(factorPairs(m).filter(([a]) => a > 1).filter((p) => pairKey(p) !== forbid)).slice(0, 2)
  const opts: [number, number][] = [[1, m], ...valid]
  for (const d of shuffle([2, 3, 4, 5, 6, 7, 8, 9])) {
    if (opts.length >= 4) break
    const q = Math.max(1, Math.round(m / d))
    if (m % d === 0 || d * q === m || opts.some((o) => pairKey(o) === pairKey([d, q]))) continue
    opts.push([d, q])
  }
  return shuffle(opts)
}

export default function AsalAgaci({ grade, onFinish }: GameProps) {
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [gain, setGain] = useState<Gain | null>(null)
  const totals = useRef({ mistakes: 0, second: 0 })
  const last = idx === LEVELS.length - 1

  const add = (pts: number, label: string) => {
    setScore((s) => s + pts)
    const now = Date.now()
    // Aynı anda gelen bonuslar tek etikette toplanır
    setGain((g) => (g && now - g.id < 300 ? { pts: g.pts + pts, label: `${g.label} · ${label}`, id: g.id } : { pts, label, id: now }))
  }
  const next = (r: { mistakes: number; second: boolean }) => {
    totals.current.mistakes += r.mistakes
    if (r.second) totals.current.second++
    if (!last) {
      setIdx(idx + 1)
      setGain(null)
      return
    }
    const { mistakes, second } = totals.current
    onFinish({
      stars: starsFor(LEVELS.length / (LEVELS.length + mistakes * 0.4)),
      score,
      summary: `${LEVELS.length} sayıyı asal çarpanlarına ayırdın${second ? `; ${second} sayı için ikinci bir ağaç kurup aynı yapraklara ulaştın` : ''}.`,
      insight: 'Her bileşik sayı asal sayıların çarpımıdır ve bu çarpım (sıra dışında) tektir: hangi dalla başlarsan başla aynı asal yapraklara ulaşırsın. Tekrar eden asal çarpanlar üslü yazılır: 360 = 2³ · 3² · 5.',
    })
  }

  return (
    <Scene grade={grade}>
      <Header
        emoji="🌳"
        kicker="Ağaç"
        title={<>{LEVELS[idx]} ağacı</>}
        idx={idx}
        total={LEVELS.length}
        dark
        right={<span className="chip bg-amber-400/15 px-3 py-1.5 text-sm text-amber-200 ring-1 ring-amber-300/40"><Trophy size={15} />{score}</span>}
      />
      <Level key={idx} n={LEVELS[idx]} last={last} askStrategy={idx === 1 || last} add={add} gain={gain} onNext={next} />
    </Scene>
  )
}

function Level({ n, last, askStrategy, add, gain, onNext }: { n: number; last: boolean; askStrategy: boolean; add: (p: number, l: string) => void; gain: Gain | null; onNext: (r: { mistakes: number; second: boolean }) => void }) {
  const track = useTracker()
  const [tree, setTree] = useState<T>({ n })
  const [sel, setSel] = useState<string | null>('')
  const [opts, setOpts] = useState<[number, number][]>(() => optionsFor(n))
  const [mode, setMode] = useState<Mode>('build')
  const [nudge, setNudge] = useState<{ q: string; mis?: string; ok?: boolean } | null>(null)
  const [firstTree, setFirstTree] = useState<T | null>(null)
  const [firstSplit, setFirstSplit] = useState<string | undefined>()
  const [exps, setExps] = useState<Record<number, number>>({})
  const [expDone, setExpDone] = useState(false)
  const [prediction, setPrediction] = useState<'ayni' | 'farkli' | null>(null)
  const [done, setDone] = useState(false)
  const streak = useRef(0)
  const mistakes = useRef(0)
  const expFails = useRef(0)
  const primes = factorize(n)
  const canSecond = factorPairs(n).filter(([a]) => a > 1).length >= 2

  const miss = (q: string, mis?: string) => {
    mistakes.current++
    streak.current = 0
    track.attempt(false)
    sfx.bad()
    setNudge({ q, mis })
  }
  const hit = (base: number, label: string) => {
    streak.current++
    const combo = Math.min(streak.current, 4)
    track.attempt(true)
    sfx.ok()
    add(base * combo, combo > 1 ? `${label} · kombo ×${combo}` : label)
  }

  const select = (t: T, p: string | null) => {
    setSel(p)
    setNudge(null)
    if (p !== null) setOpts(optionsFor(at(t, p).n, p === '' && mode === 'build2' ? firstSplit : undefined))
  }

  const afterChange = (t: T) => {
    setTree(t)
    const open = firstOpen(t)
    if (open !== null) return select(t, open)
    setSel(null)
    if (mode === 'build') {
      track.item(mistakes.current === 0)
      setFirstTree(t)
      setExps(Object.fromEntries(primes.map(([p]) => [p, 1])))
      setMode('exp')
    } else {
      const same = leafValues(t).join() === leafValues(firstTree!).join()
      if (same) add(50, 'Aynı yapraklar!')
      setMode('compare')
    }
  }

  const split = ([a, b]: [number, number]) => {
    if (sel === null) return
    const m = at(tree, sel).n
    if (a * b !== m) return miss(`${a} × ${b} = ${a * b}, ${m} değil. ${gen(m)} hangi iki sayının çarpımı olduğunu düşün.`)
    if (a === 1 || b === 1) {
      if (isPrime(m)) {
        streak.current = 0
        return setNudge({ q: `1 × ${m} = ${m} doğru, ama dal yine ${m} olur. ${m} sayısını 1 ve kendisinden başka bölen yok. Buna ne denir?`, ok: true })
      }
      return miss(`1 × ${m} = ${m} doğru ama ağaç büyümedi: dal yine ${m}. 1 dışında bir çarpanla ayırmayı dene.`, 'Çarpanlara ayırırken 1 × n yazdı')
    }
    if (sel === '' && mode === 'build') setFirstSplit(pairKey([a, b]))
    hit(10, `${m} = ${a} × ${b}`)
    afterChange(update(tree, sel, (x) => ({ ...x, k: [{ n: Math.min(a, b) }, { n: Math.max(a, b) }] })))
  }

  const markPrime = () => {
    if (sel === null) return
    const m = at(tree, sel).n
    if (!isPrime(m)) return miss(`${m} gerçekten asal mı? 2, 3, 5, 7… ile bölünebilmeyi dene: ${gen(m)} 1 ve kendisinden başka böleni var mı?`, 'Bileşik bir sayıyı asal sandı')
    hit(5, `${m} asal`)
    afterChange(update(tree, sel, (x) => ({ ...x, gold: true })))
  }

  const checkExp = () => {
    const ok = primes.every(([p, e]) => exps[p] === e)
    if (!ok) {
      expFails.current++
      track.attempt(false)
      sfx.bad()
      const wrong = primes.find(([p, e]) => exps[p] !== e)!
      return setNudge({ q: `Ağaçta kaç tane ${wrong[0]} yaprağı var? Hepsini say: üs, o asal çarpanın kaç kez çarpıldığını gösterir.`, mis: expFails.current === 1 ? 'Üslü yazımda üssü yanlış saydı' : undefined })
    }
    track.attempt(true)
    sfx.ok()
    add(expFails.current === 0 ? 30 : 15, 'Üslü yazım')
    setNudge(null)
    setExpDone(true)
    if (canSecond) setMode('offer')
    else setDone(true)
  }

  const startSecond = (p: 'ayni' | 'farkli') => {
    setPrediction(p)
    const t: T = { n }
    setTree(t)
    setMode('build2')
    setSel('')
    setNudge(null)
    setOpts(optionsFor(n, firstSplit))
  }

  const factorTex = primes.map(([p, e]) => (e > 1 ? `${p}^{${e}}` : `${p}`)).join(' · ')
  const selN = sel !== null ? at(tree, sel).n : null
  const building = mode === 'build' || mode === 'build2'

  return (
    <Split
      work={
        <Stage dark>
          <TreeView tree={tree} sel={sel} onSelect={(p) => building && select(tree, p)} />
          <p className="px-2 pb-1 text-center text-sm font-bold text-slate-300">
            Yapraklar: {leaves(tree).map((l, i) => <span key={i} className={l.gold ? 'font-black text-amber-300' : 'text-slate-400'}>{i ? ' · ' : ''}{l.gold ? l.n : `${l.n}?`}</span>)}
          </p>
          {mode !== 'build' && firstTree && mode !== 'exp' && mode !== 'offer' && (
            <p className="px-2 pb-1 text-center text-xs font-bold text-slate-400">1. ağacın yaprakları: {leafValues(firstTree).join(' · ')}</p>
          )}
        </Stage>
      }
      panel={
        <>
          {building && selN !== null && (
            <>
              <Prompt step={mode === 'build2' ? 'İkinci ağaç' : 'Dala ayır'}>
                {mode === 'build2' && sel === '' ? <>{n} sayısını bu kez <b>farklı</b> bir ilk dalla ayır.</> : <>Seçili yaprak: <span className="text-pink-700">{selN}</span>. Hangi iki çarpana ayrılır? Asalsa altın yaprak yap.</>}
              </Prompt>
              <div className="grid grid-cols-2 gap-2">
                {opts.map(([a, b]) => (
                  <button key={`${a}x${b}`} type="button" onClick={() => split([a, b])} className="min-h-14 rounded-2xl bg-slate-100 text-xl font-black text-ink ring-2 ring-white transition hover:bg-white active:scale-95">
                    {a} × {b}
                  </button>
                ))}
              </div>
              <GhostButton dark onClick={markPrime} className="w-full"><Leaf size={18} className="text-amber-300" />{selN} asal! Altın yaprak yap</GhostButton>
            </>
          )}
          {mode === 'exp' && (
            <>
              <Prompt step="Ağaç tamam!">Asal çarpanları üslü yaz: her asal sayının üssü kaç olmalı?</Prompt>
              <Card dark>
                {primes.map(([p]) => (
                  <div key={p} className="py-1">
                    <Stepper dark label={`${p} tabanının üssü`} value={exps[p] ?? 1} min={1} max={6} onChange={(v) => setExps((e) => ({ ...e, [p]: v }))} />
                  </div>
                ))}
                <p className="mt-2 text-center text-2xl font-black text-white">
                  {n} = <MathText text={primes.map(([p]) => ((exps[p] ?? 1) > 1 ? `${p}^{${exps[p]}}` : `${p}`)).join(' · ')} />
                </p>
              </Card>
              <CheckButton onClick={checkExp} />
            </>
          )}
          {expDone && (
            <Card dark className="animate-fade-up">
              <p className="flex items-center gap-2 font-black text-emerald-300"><Sparkles size={18} />{n} = <MathText text={factorTex} /></p>
            </Card>
          )}
          {mode === 'offer' && !done && (
            <Card dark className="animate-fade-up">
              <p className="mb-1 flex items-center gap-2 font-black text-white"><TreeDeciduous size={18} />Farklı bir ağaç kur (+50 bonus)</p>
              <p className="mb-3 text-sm font-bold text-slate-300">
                İlk dalın {firstSplit?.replace('×', ' × ')} idi. {ek(n, 'acc')} başka bir çiftle ayırırsan yapraklar sence ne olur?
              </p>
              <Choices options={[{ id: 'farkli' as const, label: 'Farklı olur' }, { id: 'ayni' as const, label: 'Aynı kalır' }]} value={prediction} onPick={startSecond} />
              <button type="button" onClick={() => setDone(true)} className="mt-3 min-h-12 w-full rounded-xl text-sm font-extrabold text-slate-300 underline-offset-4 hover:underline">Bu sefer geç</button>
            </Card>
          )}
          {mode === 'compare' && firstTree && (
            <Card dark className="animate-fade-up">
              <p className="font-black text-emerald-300">İki ağacın yaprakları:</p>
              <p className="mt-1 font-bold text-slate-200">1. ağaç: {leafValues(firstTree).join(' · ')}</p>
              <p className="font-bold text-slate-200">2. ağaç: {leafValues(tree).join(' · ')}</p>
              <p className="mt-2 text-sm font-bold text-slate-300">
                {prediction === 'ayni' ? 'Tahminin doğru çıktı! ' : 'Tahminin “farklı olur” idi ama yapraklar aynı! '}
                Hangi dalla başlarsan başla aynı asal yapraklara ulaşırsın: bir sayının asal çarpanlarına ayrılışı tektir.
              </p>
            </Card>
          )}
          {(done || mode === 'compare') && (
            <>
              {askStrategy && <StrategyPicker options={STRATEGIES} onPick={() => undefined} question="Ağacı kurarken nasıl düşündün?" />}
              <NextButton last={last} onClick={() => onNext({ mistakes: mistakes.current, second: mode === 'compare' })} />
            </>
          )}
          {nudge && <Nudge question={nudge.q} misconception={nudge.mis} tone={nudge.ok ? 'ok' : 'think'} onClose={() => setNudge(null)} />}
          {gain && (
            <p key={gain.id} className="self-start rounded-xl bg-amber-400/15 px-3 py-1.5 text-sm font-black text-amber-200 ring-1 ring-amber-300/40 animate-pop">
              +{gain.pts} · {gain.label}
            </p>
          )}
        </>
      }
    />
  )
}

/** Ağaç çizimi: yapraklar eşit aralıklı, iç düğüm çocuklarının ortasında */
function TreeView({ tree, sel, onSelect }: { tree: T; sel: string | null; onSelect: (p: string) => void }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const ls = leaves(tree)
  const depth = (t: T): number => (t.k ? 1 + Math.max(depth(t.k[0]), depth(t.k[1])) : 0)
  const D = depth(tree)
  const W = Math.max(280, w)
  const step = Math.min(110, (W - 16) / ls.length)
  const left = (W - step * ls.length) / 2
  const r = Math.max(19, Math.min(27, step * 0.4))
  const rowH = Math.max(64, r * 2 + 22)
  const H = 24 + r + D * rowH + r + 14
  type Pos = { t: T; p: string; x: number; y: number }
  const nodes: Pos[] = []
  const edges: [Pos, Pos][] = []
  let li = 0
  const place = (t: T, p: string, d: number): Pos => {
    let x: number
    const y = 24 + r + d * rowH
    if (t.k) {
      const a = place(t.k[0], p + '0', d + 1)
      const b = place(t.k[1], p + '1', d + 1)
      x = (a.x + b.x) / 2
      const me = { t, p, x, y }
      edges.push([me, a], [me, b])
      nodes.push(me)
      return me
    }
    x = left + step * (li++ + 0.5)
    const me = { t, p, x, y }
    nodes.push(me)
    return me
  }
  place(tree, '', 0)
  const font = (v: number) => (String(v).length >= 3 ? r * 0.62 : r * 0.78)

  return (
    <div ref={ref} className="w-full touch-manipulation">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`${tree.n} sayısının çarpan ağacı`}>
        {edges.map(([a, b]) => (
          <line key={`${a.p}-${b.p}`} x1={a.x} y1={a.y + r * 0.7} x2={b.x} y2={b.y - r * 0.8} stroke="#86efac" strokeWidth={4} strokeLinecap="round" className="animate-fade-up" />
        ))}
        {nodes.map(({ t, p, x, y }) => {
          const leaf = !t.k
          const open = leaf && !t.gold
          const selected = p === sel
          return (
            <g
              key={p || 'root'}
              onClick={() => open && onSelect(p)}
              className={open ? 'cursor-pointer' : ''}
              role={open ? 'button' : undefined}
              aria-label={open ? `${t.n} yaprağını seç` : undefined}
            >
              {selected && <circle cx={x} cy={y} r={r + 7} fill="none" stroke="#f472b6" strokeWidth={4} className="animate-pulse" />}
              <g className="animate-pop" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={t.gold ? '#fbbf24' : leaf ? '#f8fafc' : '#334155'}
                  stroke={t.gold ? '#f59e0b' : leaf ? '#cbd5e1' : '#64748b'}
                  strokeWidth={3}
                  strokeDasharray={open ? '6 4' : undefined}
                />
                <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central" fontSize={font(t.n)} fontWeight={900} fill={leaf ? '#1f2340' : '#f8fafc'}>{t.n}</text>
                {t.gold && <text x={x + r * 0.75} y={y - r * 0.75} fontSize={r * 0.6} textAnchor="middle" dominantBaseline="central">🍂</text>}
              </g>
              {open && <circle cx={x} cy={y} r={Math.max(r + 6, 26)} fill="transparent" />}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
