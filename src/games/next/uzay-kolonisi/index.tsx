import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Lightbulb, Rocket, Sparkles, Users } from 'lucide-react'
import type { GameProps } from '../../kit'
import { starsFor } from '../../kit'
import { BigButton, LevelDots, Nudge as KitNudge, Scene, StrategyPicker, TaskCard, useSolutions } from '../../kit2'
import { useTracker } from '../../../lib/trackerContext'
import { MathText } from '../../../components/MathText'
import { celebrate, sfx } from '../../../lib/feedback'
import type { Grade } from '../../../data/types'
import { CSS, Starfield } from './art'
import { insightFor, missionsFor, type Ask, type Mission } from './missions'
import { ChoiceAsk, MultiAsk, NumPad } from './ui'
import { near } from './util'
import { AllocView, ChartView, CompareView, GridView, MeanView, PropView, ShareView, SimView, ThermoView, type Core } from './views'

/**
 * Uzay Kolonisi (5–7. sınıf)
 * Mars’ta bir üs kurulur: sınırlı enerji, su ve parselleri kesir / yüzde / oranla paylaştırırız.
 * Her görev önce bir İNŞA aşaması (modül yerleştir, kaynak paylaştır, grafik çiz, dengele, simüle et),
 * sonra modelden türeyen sorular ve strateji seçimi içerir. Açık uçlu görevlerde (kurallı paylaşım,
 * simülasyon) farklı geçerli planlar useSolutions ile toplanır.
 */

type Msg = { text: string; tone: 'ok' | 'think'; mis?: string; tool?: boolean; id: number }
type Result = { first: boolean; modules?: number; pop?: number }

/** Dar panelde soru metni tam satır kaplasın, düğmeler alta insin */
function Nudge(p: Parameters<typeof KitNudge>[0]) {
  return (
    <div className="[&>div]:mt-0 [&>div>div]:ml-12 [&>div>p]:basis-[calc(100%-3rem)]">
      <KitNudge {...p} />
    </div>
  )
}

export default function UzayKolonisi({ grade, onFinish }: GameProps) {
  const missions = useMemo(() => missionsFor(grade), [grade])
  const dark = grade >= 7
  const [idx, setIdx] = useState(0)
  const [colony, setColony] = useState({ modules: 0, pop: 8 })
  const results = useRef<Result[]>([])
  const sol = useSolutions()

  const done = (r: Result) => {
    results.current.push(r)
    if (r.modules || r.pop) setColony((c) => ({ modules: c.modules + (r.modules ?? 0), pop: r.pop ?? c.pop }))
    if (idx + 1 < missions.length) {
      setIdx(idx + 1)
      return
    }
    const n = missions.length
    const firsts = results.current.filter((x) => x.first).length
    const plans = sol.list.length
    const ratio = Math.min(1, firsts / n + (plans >= 5 ? 0.1 : 0))
    onFinish({
      stars: starsFor(ratio),
      score: firsts * 100 + (n - firsts) * 60 + plans * 30,
      summary: `${n} görevi tamamladın, ${plans} farklı koloni planı buldun.`,
      insight: insightFor(grade),
    })
  }

  const m = missions[idx]
  const bg = dark
    ? 'bg-[radial-gradient(ellipse_at_80%_110%,rgb(194_65_12/0.35),transparent_55%),linear-gradient(180deg,#020617,#0b1222_60%,#111827)]'
    : 'bg-[radial-gradient(ellipse_at_85%_115%,rgb(234_88_12/0.45),transparent_55%),radial-gradient(circle_at_10%_0%,rgb(129_140_248/0.35),transparent_45%),linear-gradient(180deg,#1e1b4b,#2e1065_55%,#3b0764)]'

  return (
    <Scene grade={grade} className="p-0!">
      <style>{CSS}</style>
      <div className={`relative overflow-hidden p-3 text-white sm:p-5 ${bg}`}>
        <Starfield dense={dark ? 90 : 70} />
        <div className="relative">
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className={`grid size-11 place-items-center rounded-2xl shadow-lg ${dark ? 'bg-cyan-400 text-slate-950' : 'bg-orange-500 text-white'}`}><Rocket size={22} /></span>
              <div>
                <p className={`text-[11px] font-black tracking-widest uppercase ${dark ? 'text-cyan-300' : 'text-orange-300'}`}>Görev {idx + 1} / {missions.length}</p>
                <p className="text-lg leading-tight font-black">{m.title}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip bg-white/10 px-3 py-1 text-sm text-white ring-1 ring-white/15"><Users size={14} />{colony.pop} kâşif</span>
              {colony.modules > 0 && <span className="chip bg-white/10 px-3 py-1 text-sm text-white ring-1 ring-white/15">🏗️ {colony.modules} modül</span>}
              {sol.list.length > 0 && <span className="chip bg-amber-400/20 px-3 py-1 text-sm text-amber-100 ring-1 ring-amber-300/40"><Sparkles size={14} />{sol.list.length} plan</span>}
              <LevelDots current={idx} total={missions.length} />
            </div>
          </header>
          <MissionRunner key={idx} m={m} idx={idx} grade={grade} dark={dark} step={idx + 1} total={missions.length} sol={sol} onDone={done} />
        </div>
      </div>
    </Scene>
  )
}

function MissionRunner({ m, idx, grade, dark, step, total, sol, onDone }: { m: Mission; idx: number; grade: Grade; dark: boolean; step: number; total: number; sol: ReturnType<typeof useSolutions>; onDone: (r: Result) => void }) {
  const track = useTracker()
  const [phase, setPhase] = useState<'build' | 'ask' | 'done'>('build')
  const [asks, setAsks] = useState<Ask[]>([])
  const [askIdx, setAskIdx] = useState(0)
  const [picked, setPicked] = useState<number[]>([])
  const [msg, setMsg] = useState<Msg | null>(null)
  const [hintN, setHintN] = useState(0)
  const [stratDone, setStratDone] = useState(false)
  const wrong = useRef(0)
  const extra = useRef<{ modules?: number; pop?: number }>({})
  const prefix = `${idx}:`
  const mine = sol.list.filter((s) => s.key.startsWith(prefix)).map((s) => ({ ...s, key: s.key.slice(prefix.length) }))

  const say = useCallback((text: string, tone: 'ok' | 'think' = 'think', mis?: string, tool?: boolean) => setMsg({ text, tone, mis, tool, id: Math.random() }), [])
  const fail = (text: string, mis?: string) => {
    wrong.current++
    track.attempt(false)
    sfx.bad()
    say(text, 'think', mis, true)
  }
  const complete = (text: string) => {
    track.item(wrong.current === 0 && hintN === 0)
    setPhase('done')
    sfx.ok()
    celebrate(false)
    say(text, 'ok')
  }
  const advance = (okText: string, list = asks, i = askIdx) => {
    if (i + 1 < list.length) {
      setAskIdx(i + 1)
      setPicked([])
      say(okText, 'ok')
    } else complete(okText)
  }
  const built = (text: string, list: Ask[], ex?: { modules?: number; pop?: number }) => {
    track.attempt(true)
    extra.current = ex ?? {}
    if (!list.length) return complete(text)
    setAsks(list)
    setAskIdx(0)
    setPhase('ask')
    sfx.ok()
    say(text, 'ok')
  }
  const addSolution = (key: string, label: string) => {
    const ok = sol.add(prefix + key, label)
    if (ok) track.attempt(true)
    return ok
  }
  const hint = () => {
    track.hint()
    setHintN((h) => h + 1)
    say(m.hints[Math.min(hintN, m.hints.length - 1)], 'think', undefined, true)
  }

  // ── sorular ──
  const ask = phase === 'ask' ? asks[askIdx] : null
  const onNum = (n: number) => {
    if (!ask || ask.kind !== 'num') return
    if (near(n, ask.answer)) {
      track.attempt(true)
      return advance(ask.ok)
    }
    const d = ask.diagnose?.(n)
    fail(d?.msg ?? 'Henüz değil. Ekrandaki modele bir daha bak; istersen “İpucu”na dokun.', d?.mis)
  }
  const onMulti = (sel: number[]) => {
    if (!ask || ask.kind !== 'multi') return
    const wrongPick = sel.map((i) => ask.options[i]).find((o) => !o.ok)
    if (wrongPick) return fail(wrongPick.why ?? 'Seçtiklerinden biri uymuyor. Hangisi?', wrongPick.mis)
    const missing = ask.options.some((o, i) => o.ok && !sel.includes(i))
    if (missing) return fail('Seçtiklerin doğru ama eksik var. Aynı miktarı gösteren başka bir seçenek var mı?', 'Denk kesirlerin hepsini tanımadı')
    track.attempt(true)
    advance(ask.ok)
  }
  const onChoice = (i: number) => {
    if (!ask || ask.kind !== 'choice') return
    const o = ask.options[i]
    setPicked((p) => (p.includes(i) ? p : [...p, i]))
    if (o.ok) {
      track.attempt(true)
      return advance(o.why)
    }
    fail(o.why, o.mis)
  }

  const core: Core = {
    grade,
    dark,
    locked: phase !== 'build',
    say: (t, tone) => say(t, tone),
    fail,
    built,
    addSolution,
    solutions: mine,
    render: (stage, controls) => <Layout task={<TaskCard step={step} total={total} tone="dark">{m.prompt}</TaskCard>} stage={stage} controls={controls} shared={shared} />,
  }

  const shared: ReactNode = (
    <>
      {msg && (
        <Nudge key={msg.id} question={msg.text} tone={msg.tone} misconception={msg.mis} tool={msg.tool && phase !== 'done' ? m.tool : undefined} toolConfig={m.toolConfig} toolTitle={m.toolTitle} />
      )}
      {ask?.kind === 'num' && (
        <div key={`a${askIdx}`} className="animate-fade-up">
          <p className="mb-2 text-base font-black text-white">{renderQ(ask.q)}</p>
          <NumPad unit={ask.unit} onSubmit={onNum} decimal={ask.decimal} negative={ask.negative} />
        </div>
      )}
      {ask?.kind === 'multi' && <MultiAsk key={`a${askIdx}`} q={ask.q} options={ask.options.map((o) => o.label)} onCheck={onMulti} />}
      {ask?.kind === 'choice' && <ChoiceAsk key={`a${askIdx}`} q={ask.q} options={ask.options.map((o) => o.label)} onPick={onChoice} picked={picked} />}
      {phase === 'done' && m.picker && !stratDone && <StrategyPicker question={m.pickerQ ?? 'Nasıl düşündün?'} options={m.picker} onPick={() => setStratDone(true)} />}
      <div className="mt-auto flex gap-2 pt-1">
        {phase !== 'done' && (
          <button type="button" onClick={hint} className="inline-flex min-h-12 items-center gap-1.5 rounded-2xl bg-amber-400/15 px-4 font-extrabold text-amber-100 ring-1 ring-amber-300/40 active:scale-95">
            <Lightbulb size={18} />İpucu
          </button>
        )}
        {phase === 'done' && (
          <BigButton onClick={() => onDone({ first: wrong.current === 0 && hintN === 0, ...extra.current })} className="flex-1">
            {step < total ? <>Sonraki görev<ArrowRight size={20} /></> : <>Koloniyi tamamla <Rocket size={20} /></>}
          </BigButton>
        )}
      </div>
    </>
  )

  switch (m.kind) {
    case 'grid':
      return <GridView m={m} core={core} />
    case 'alloc':
      return <AllocView m={m} core={core} />
    case 'sim':
      return <SimView m={m} core={core} />
    case 'compare':
      return <CompareView m={m} core={core} />
    case 'chart':
      return <ChartView m={m} core={core} />
    case 'mean':
      return <MeanView m={m} core={core} />
    case 'share':
      return <ShareView m={m} core={core} />
    case 'thermo':
      return <ThermoView m={m} core={core} />
    case 'prop':
      return <PropView m={m} core={core} />
  }
}

const renderQ = (q: string) => <MathText text={q} />

function Layout({ task, stage, controls, shared }: { task: ReactNode; stage: ReactNode; controls: ReactNode; shared: ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="lg:hidden [&>div]:mb-0">{task}</div>
        {stage}
      </div>
      <aside className="flex min-w-0 flex-col gap-3">
        <div className="hidden lg:block [&>div]:mb-0">{task}</div>
        {controls}
        {shared}
      </aside>
    </div>
  )
}
