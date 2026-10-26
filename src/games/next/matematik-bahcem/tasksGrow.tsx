import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Droplets, Eye, Send, Shovel, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { ZoomBox } from '../../../interactive/ZoomBox'
import { SolutionList } from '../../kit2'
import { GrowScene } from './GrowScene'
import { growF } from './levels'
import { Actions, BigStepper, Layout, ShareBox, type Api, type NudgeState } from './shared'

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const MIS_DOUBLE = 'Büyüyen örüntüde sabit artış yerine ikiye katladı'
const MIS_PROP = 'Orantısal düşündü (5. adımın iki katını aldı)'

function useWater() {
  const [on, setOn] = useState(false)
  const t = useRef<number>()
  useEffect(() => () => window.clearTimeout(t.current), [])
  return [
    on,
    () => {
      setOn(true)
      window.clearTimeout(t.current)
      t.current = window.setTimeout(() => setOn(false), reduced() ? 200 : 1300)
    },
  ] as const
}

function SceneBox({ children }: { children: ReactNode }) {
  return <ZoomBox className="overflow-hidden rounded-3xl shadow-[0_6px_24px_rgba(22,101,52,.16)] ring-1 ring-green-200">{children}</ZoomBox>
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mt-3 rounded-3xl bg-[linear-gradient(180deg,#f0fdf4,#ecfccb)] p-3 ring-1 ring-green-200 sm:p-4 ${className}`}>{children}</div>
}

/** Adım tablosu (salt okunur satırlar + isteğe bağlı düzenlenebilir hücreler) */
function StepTable({ rows, diff }: { rows: { n: number; v: ReactNode }[]; diff?: number[] }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-green-200">
      <div className="grid grid-cols-[1fr_1.4fr] bg-green-700 text-sm font-black text-white">
        <span className="px-3 py-2">Adım</span>
        <span className="px-3 py-2">Çiçek sayısı</span>
      </div>
      {rows.map((r, i) => (
        <div key={r.n} className="relative grid grid-cols-[1fr_1.4fr] items-center border-t border-green-100">
          <span className="px-3 py-2 text-lg font-black text-green-900">{r.n}. adım</span>
          <span className="px-3 py-1.5 text-2xl font-black tabular-nums text-ink">{r.v}</span>
          {diff && diff[i] !== undefined && (
            <span className="absolute right-2 -bottom-3 z-10 rounded-full bg-orange-500 px-2 py-0.5 text-xs font-black text-white shadow">+{diff[i]}</span>
          )}
        </div>
      ))}
    </div>
  )
}

/* ───────────────────────────── 4. adımı kur ───────────────────────────── */

export function GrowBuildTask({ api }: { api: Api }) {
  const { L } = api
  const g = L.grow!
  const cols = 6
  const [pot, setPot] = useState([false, false, false])
  const [grid, setGrid] = useState<boolean[]>(() => Array(cols * g.d).fill(false))
  const [nudge, setNudge] = useState<NudgeState | null>(null)
  const [water, pour] = useWater()
  const lock = api.finished

  const check = () => {
    const pc = pot.filter(Boolean).length
    const gc = grid.filter(Boolean).length
    pour()
    if (pc === g.c && gc === 4 * g.d) {
      api.ok()
      api.complete(L.note)
      return
    }
    api.miss()
    if (pc !== g.c)
      setNudge({ question: 'Saksıdaki ayçiçeklerine bak: 1, 2 ve 3. adımda kaç tane var? Değişiyor mu?', misconception: pc > g.c ? 'Sabit kalan kısmı da büyüttü' : undefined })
    else if (gc === 3 * g.d) setNudge({ question: '3. adımla aynı oldu! 4. adımda ne eklenmeli?' })
    else if (gc === 6 * g.d) setNudge({ question: `3. adımı ikiye katladın. 2. adımdan 3. adıma kaç lale eklendi?`, misconception: MIS_DOUBLE })
    else setNudge({ question: `${gc} lale diktin. Her adımda kaç lale ekleniyor? 3. adımda kaç lale sırası var?`, tool: 'oruntubloklari' })
  }

  return (
    <Layout
      header={api.header}
      scene={
        <SceneBox>
          <GrowScene
            c={g.c}
            d={g.d}
            steps={[1, 2, 3]}
            watering={water}
            build={{
              n: 4,
              cols,
              pot,
              grid,
              onPot: (i) => { if (!lock) { setPot(pot.map((x, j) => (j === i ? !x : x))); setNudge(null) } },
              onGrid: (i) => { if (!lock) { setGrid(grid.map((x, j) => (j === i ? !x : x))); setNudge(null) } },
            }}
            ariaLabel={`1, 2 ve 3. adımlar gösteriliyor. 4. adımı dik.`}
          />
        </SceneBox>
      }
      tray={
        <Panel className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-bold text-green-900"><Shovel size={18} />Turuncu tarhta bir çukura dokun: lale ya da ayçiçeği dikilir. Yeniden dokunursan sökülür.</p>
          {!lock && (
            <button type="button" onClick={() => { setPot([false, false, false]); setGrid(Array(cols * g.d).fill(false)) }} className="min-h-12 rounded-xl bg-white px-3 text-sm font-extrabold text-ink ring-1 ring-line">Tarhı boşalt</button>
          )}
        </Panel>
      }
      actions={<Actions api={api} primary={{ label: 'Sula ve kontrol et', icon: <Droplets size={20} />, onClick: check }} nudge={nudge} onCloseNudge={() => setNudge(null)} />}
    />
  )
}

/* ───────────────────────────── adım tablosu ───────────────────────────── */

export function GrowTableTask({ api }: { api: Api }) {
  const { L } = api
  const g = L.grow!
  const f = (n: number) => growF(g, n)
  const [v4, setV4] = useState<number | null>(null)
  const [v5, setV5] = useState<number | null>(null)
  const [add, setAdd] = useState<number | null>(null)
  const [nudge, setNudge] = useState<NudgeState | null>(null)
  const [won, setWon] = useState(false)

  const check = () => {
    if (v4 === null || v5 === null || add === null) {
      setNudge({ question: 'Önce bütün boşlukları doldur: 4. adım, 5. adım ve her adımda eklenen sayı.' })
      return
    }
    if (v4 === f(4) && v5 === f(5) && add === g.d) {
      api.ok()
      setWon(true)
      api.complete(L.note)
      return
    }
    api.miss()
    if (v4 !== f(4)) {
      setNudge(
        v4 === 2 * f(3)
          ? { question: `3. adımı ikiye katladın. 2. adımdan 3. adıma kaç çiçek eklendi? 4. adımda da o kadar eklenir mi?`, misconception: MIS_DOUBLE }
          : { question: `${f(2)}’den ${f(3)}’e nasıl gidiyoruz? Aynı şekilde devam et: 4. adımda kaç çiçek olur?` },
      )
    } else if (v5 !== f(5)) setNudge({ question: `4. adım doğru! 4. adımdan 5. adıma kaç çiçek eklenir?`, misconception: v5 === 2 * f(4) ? MIS_DOUBLE : undefined })
    else setNudge({ question: `Tablodaki iki sayı arasındaki farkı bul: ${f(2)} − ${f(1)} kaç?` })
  }

  return (
    <Layout
      header={api.header}
      scene={
        <SceneBox>
          <GrowScene c={g.c} d={g.d} steps={[1, 2, 3]} ariaLabel={`1. adımda ${f(1)}, 2. adımda ${f(2)}, 3. adımda ${f(3)} çiçek var.`} />
        </SceneBox>
      }
      tray={
        <Panel>
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
            <StepTable
              rows={[
                { n: 1, v: f(1) },
                { n: 2, v: f(2) },
                { n: 3, v: f(3) },
                { n: 4, v: won ? f(4) : <BigStepper value={v4} onChange={(x) => { setV4(x); setNudge(null) }} label="4. adım" max={60} /> },
                { n: 5, v: won ? f(5) : <BigStepper value={v5} onChange={(x) => { setV5(x); setNudge(null) }} label="5. adım" max={60} /> },
              ]}
              diff={won ? [g.d, g.d, g.d, g.d] : undefined}
            />
            <div className="rounded-2xl bg-white p-3 ring-1 ring-green-200">
              <p className="mb-2 text-base font-black text-green-900">Her adımda kaç çiçek ekleniyor?</p>
              {won ? <p className="text-3xl font-black text-orange-600">+{g.d}</p> : <BigStepper value={add} onChange={(x) => { setAdd(x); setNudge(null) }} label="Eklenen" max={10} />}
            </div>
          </div>
        </Panel>
      }
      actions={<Actions api={api} primary={{ label: 'Tabloyu kontrol et', icon: <Check size={20} />, onClick: check }} nudge={nudge} onCloseNudge={() => setNudge(null)} />}
    />
  )
}

/* ───────────────────────────── kuralı sözle ───────────────────────────── */

export function GrowRuleTask({ api }: { api: Api }) {
  const { L } = api
  const g = L.grow!
  const f = (n: number) => growF(g, n)
  const rules = L.rules!
  const [tested, setTested] = useState<Record<number, boolean[]>>({})
  const [found, setFound] = useState<{ key: string; label: string }[]>([])
  const [nudge, setNudge] = useState<NudgeState | null>(null)

  const test = (i: number) => {
    if (api.finished && tested[i]) return
    const r = rules[i]
    const res = [1, 2, 3, 4].map((n) => r.f(n) === f(n))
    setTested({ ...tested, [i]: res })
    if (res.every(Boolean)) {
      if (found.some((x) => x.key === String(i))) return
      api.ok()
      api.addSol(`${api.li}:${i}`, r.text)
      api.stats.rules.push(r.text)
      api.strat(i === rules.findIndex((x) => x.ok && x.text.startsWith('Her adımda')) ? 'Kuralı sözle anlatma (her adımda ekle)' : 'Kuralı adım sayısıyla anlatma')
      const next = [...found, { key: String(i), label: r.text }]
      setFound(next)
      if (next.length >= L.goal && !api.finished) {
        api.complete(L.note, 0)
        setNudge({ tone: 'ok', question: next.length < 3 ? 'İstersen üçüncü doğru kuralı da bul!' : 'Üç doğru kuralı da buldun!' })
      } else if (!api.finished) setNudge({ tone: 'ok', question: 'Bu kural her adımda tutuyor! Başka bir doğru kural daha bul.' })
      else api.addSol(`${api.li}:${i}`, r.text)
      return
    }
    if (!api.finished) api.miss()
    const fail = res.findIndex((x) => !x) + 1
    setNudge({ question: `Bu kural ${fail}. adımda tutmuyor: ${r.f(fail)} çiçek derdi ama ${fail}. adımda ${f(fail)} çiçek var.`, misconception: r.mis })
  }

  return (
    <Layout
      header={api.header}
      scene={
        <SceneBox>
          <GrowScene c={g.c} d={g.d} steps={[1, 2, 3]} ariaLabel={`1. adımda ${f(1)}, 2. adımda ${f(2)}, 3. adımda ${f(3)} çiçek var.`} />
        </SceneBox>
      }
      tray={
        <Panel>
          <div className="grid gap-3 md:grid-cols-[180px_1fr]">
            <StepTable rows={[1, 2, 3, 4].map((n) => ({ n, v: f(n) }))} />
            <div className="grid gap-2">
              {rules.map((r, i) => {
                const t = tested[i]
                const good = t?.every(Boolean)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => test(i)}
                    className={`min-h-14 rounded-2xl px-3 py-2 text-left ring-2 transition active:scale-[.98] ${good ? 'bg-emerald-50 ring-emerald-400' : t ? 'bg-amber-50 ring-amber-300' : 'bg-white ring-green-200 hover:bg-green-50'}`}
                  >
                    <span className="block text-base font-extrabold text-ink">{r.text}</span>
                    {t && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {t.map((ok, j) => (
                          <span key={j} className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-black ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {j + 1}. adım {ok ? <Check size={12} /> : <X size={12} />}
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </Panel>
      }
      actions={
        <Actions api={api} nudge={nudge} onCloseNudge={() => setNudge(null)}>
          <p className="mt-2 rounded-2xl bg-white/80 p-3 text-sm font-bold text-ink-soft ring-1 ring-line">Bir kural kartına dokun: kural tablodaki her adımda denenir.</p>
          <SolutionList list={found} goal={L.goal} />
        </Actions>
      }
    />
  )
}

/* ───────────────────────────── 10. adımı tahmin et ───────────────────────────── */

export function GrowPredictTask({ api }: { api: Api }) {
  const { L } = api
  const g = L.grow!
  const N = L.predictN!
  const f = (n: number) => growF(g, n)
  const [v, setV] = useState<number | null>(null)
  const [nudge, setNudge] = useState<NudgeState | null>(null)
  const [reveal, setReveal] = useState(false)
  const [tried, setTried] = useState(false)
  const [water, pour] = useWater()

  const check = () => {
    if (v === null) {
      setNudge({ question: 'Önce tahminini yaz: + ve − düğmelerini kullan.' })
      return
    }
    pour()
    if (v === f(N)) {
      api.ok()
      api.strat(reveal ? 'Modelle sayma' : 'Kuralla tahmin')
      setReveal(true)
      api.complete(`${L.note}`)
      return
    }
    api.miss()
    setTried(true)
    if (v === 2 * f(5)) setNudge({ question: `5. adımın iki katını aldın. 2 × ${f(1)} = ${f(2)} mi? 1. adımın iki katı 2. adım ediyor mu?`, misconception: MIS_PROP })
    else if (v === g.d * N && g.c) setNudge({ question: `${N} lale sırası doğru düşündün! Saksıdaki ayçiçeklerini unuttun mu?` })
    else if (v === f(N - 1) || v === f(N + 1)) setNudge({ question: `Neredeyse! ${N}. adımda kaç lale sırası olur? Bir sıra eksik ya da fazla mı saydın?` })
    else setNudge({ question: `Kuralı hatırla: her adımda ${g.d} çiçek ekleniyor. ${N}. adımda kaç lale sırası var?`, tool: 'yuzluk' })
  }

  return (
    <Layout
      header={api.header}
      scene={
        <SceneBox>
          <GrowScene c={g.c} d={g.d} steps={[1, 2, 3]} big={reveal ? N : undefined} watering={water} ariaLabel={`1. adımda ${f(1)}, 2. adımda ${f(2)}, 3. adımda ${f(3)} çiçek var.${reveal ? ` ${N}. adım gösteriliyor.` : ''}`} />
        </SceneBox>
      }
      tray={
        <Panel>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <p className="text-lg font-black text-green-900">{N}. adımda</p>
            <BigStepper value={v} onChange={(x) => { setV(x); setNudge(null) }} label={`${N}. adımdaki çiçek`} max={99} big />
            <p className="text-lg font-black text-green-900">çiçek olur.</p>
          </div>
        </Panel>
      }
      actions={
        <Actions
          api={api}
          primary={{ label: 'Tahminimi dene', icon: <Droplets size={20} />, onClick: check }}
          secondary={tried && !reveal ? (
            <button type="button" onClick={() => setReveal(true)} className="inline-flex min-h-14 items-center gap-1.5 rounded-2xl bg-white px-4 text-base font-extrabold text-green-900 ring-1 ring-green-200"><Eye size={18} />Bahçede gör</button>
          ) : undefined}
          nudge={nudge}
          onCloseNudge={() => setNudge(null)}
        />
      }
    />
  )
}

/* ───────────────────────────── kendi büyüyen bahçen ───────────────────────────── */

type GPhase = 'build' | 'friend' | 'fix' | 'won'

export function GrowDesignTask({ api }: { api: Api }) {
  const { L, grade } = api
  const [c, setC] = useState(1)
  const [d, setD] = useState(2)
  const [phase, setPhase] = useState<GPhase>('build')
  const [guess, setGuess] = useState(0)
  const [mine, setMine] = useState<number | null>(null)
  const [nudge, setNudge] = useState<NudgeState | null>(null)
  const [found, setFound] = useState<{ key: string; label: string }[]>([])
  const [water, pour] = useWater()
  const N = 6
  const g = { c, d }
  const f = (n: number) => growF(g, n)

  const send = () => {
    const wrong = Math.random() < 0.55
    const w = 2 * f(3) !== f(N) ? 2 * f(3) : f(N) + d
    setGuess(wrong ? w : f(N))
    setPhase('friend')
    setNudge(null)
  }
  const judge = (says: boolean) => {
    const ok = guess === f(N)
    if (says === ok) {
      if (ok) win()
      else {
        setPhase('fix')
        setNudge({ tone: 'ok', question: `Haklısın! ${N}. adımda kaç çiçek olmalı? Sen hesapla.` })
      }
      return
    }
    api.miss()
    setNudge({
      question: ok ? `Kontrol et: ${N}. adımda kaç lale sırası olur, saksıda kaç ayçiçeği var?` : `Vız ${guess} dedi. ${N}. adımda ${N} lale sırası ve ${c} ayçiçeği olur. Bu kaç eder?`,
      misconception: ok ? undefined : guess === 2 * f(3) ? 'Arkadaşının orantısal (ikiye katlama) hatasını fark etmedi' : 'Arkadaşının hatalı tahminini fark etmedi',
    })
  }
  const checkMine = () => {
    if (mine === f(N)) {
      win()
      return
    }
    api.miss()
    setNudge({ question: `${N}. adımda ${N} tane ${d}’li lale sırası var. Saksıdaki ${c} ayçiçeğini de ekle.`, misconception: mine === 2 * f(3) ? MIS_PROP : undefined })
  }
  const win = () => {
    pour()
    api.ok()
    const key = `${c}-${d}`
    const label = `${c ? `${c} ayçiçeği + ` : ''}her adımda ${d} lale`
    if (!found.some((x) => x.key === key)) {
      api.addSol(`${api.li}:${key}`, label)
      api.stats.designs.push(label)
      setFound([...found, { key, label }])
    }
    setPhase('won')
    if (!api.finished) api.complete(L.note)
  }
  const again = () => {
    setPhase('build')
    setMine(null)
    setNudge(null)
  }

  return (
    <Layout
      header={api.header}
      scene={
        <SceneBox>
          <GrowScene c={c} d={d} steps={[1, 2, 3]} watering={water} bee={phase !== 'build'} ariaLabel={`Senin bahçen: 1. adımda ${f(1)}, 2. adımda ${f(2)}, 3. adımda ${f(3)} çiçek.`} />
        </SceneBox>
      }
      tray={
        phase === 'build' ? (
          <Panel>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-green-200">
                <p className="text-sm font-black text-green-900">Saksıda kaç ayçiçeği? (hiç değişmez)</p>
                <BigStepper value={c} onChange={setC} min={0} max={3} label="Ayçiçeği" />
              </div>
              <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-green-200">
                <p className="text-sm font-black text-green-900">Her adımda kaç lale eklensin?</p>
                <BigStepper value={d} onChange={setD} min={1} max={4} label="Eklenen lale" />
              </div>
            </div>
          </Panel>
        ) : (
          <Panel className="flex flex-wrap items-center gap-3">
            <span className="text-3xl" aria-hidden>🐝</span>
            <p className="flex-1 text-base font-extrabold text-amber-900">
              {phase === 'friend' ? `Vız: “${N}. adımda ${guess} çiçek olur!” Doğru mu?` : phase === 'fix' ? `Vız: “Peki ${N}. adımda kaç çiçek olur?”` : `Vız: “${N}. adımda ${f(N)} çiçek. Ne güzel bir bahçe!”`}
            </p>
            {phase === 'fix' && <BigStepper value={mine} onChange={(x) => { setMine(x); setNudge(null) }} label={`${N}. adım`} max={99} big />}
          </Panel>
        )
      }
      actions={
        <Actions
          api={api}
          keep
          primary={phase === 'build' ? { label: 'Vız tahmin etsin', icon: <Send size={20} />, onClick: send } : phase === 'fix' ? { label: 'Kontrol et', icon: <Check size={20} />, onClick: checkMine } : undefined}
          nudge={nudge}
          onCloseNudge={() => setNudge(null)}
        >
          {phase === 'friend' && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => judge(true)} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-3 text-base font-extrabold text-white active:scale-95"><ThumbsUp size={20} />Doğru</button>
              <button type="button" onClick={() => judge(false)} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-3 text-base font-extrabold text-white active:scale-95"><ThumbsDown size={20} />Hata var</button>
            </div>
          )}
          {phase === 'won' && (
            <>
              <ShareBox code={`g${c}-${d}`} grade={grade} text={`Büyüyen bahçemin 4. adımını kurabilir misin?`} />
              <button type="button" onClick={again} className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-extrabold text-green-900 ring-1 ring-green-200">Bir bahçe daha tasarla</button>
            </>
          )}
          <SolutionList list={found} />
        </Actions>
      }
    />
  )
}
