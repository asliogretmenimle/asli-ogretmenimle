import { useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Check, FileSearch, FolderOpen, HelpCircle, Lightbulb, Pin, Search, Stamp } from 'lucide-react'
import { starsFor, type GameProps } from '../../kit'
import { LevelDots, Nudge, Scene, StrategyPicker, useAge, useSolutions } from '../../kit2'
import { MathText } from '../../../components/MathText'
import { useTracker } from '../../../lib/trackerContext'
import { sfx } from '../../../lib/feedback'
import { BANK, INSIGHT, STRATEGY_OPTIONS, type Case, type Choice, type Step, type Thumb } from './cases'
import { AxisChart, BalanceDots, BuildBars, CompareDots, Histogram, Level, PercentBars, Pictograph, RangeDots, Spread, Survey, Tally, ThumbIcon, WholeGrid, WindowChart, inkFor, type Ink } from './charts'

/**
 * Veri Dedektifleri (5–8. sınıf)
 * Her dosya bir iddia ile açılır. Öğrenci grafiği/veriyi inceler (eksen sürükleme, kule dengeleme, örneklem seçme…),
 * her inceleme bir ipucu açar. Dosya, verilerle desteklenen sonuç + en az bir geçerli kanıtla kapanır.
 * Birden çok geçerli kanıt yolu vardır; her yeni yol useSolutions ile sayılır.
 */

const SESSION = 5
const TYPE = "'Courier New', 'American Typewriter', ui-monospace, monospace"

const shuffle = <T,>(a: T[]): T[] => {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

function buildSession(grade: number): Case[] {
  const bank = BANK[grade as keyof typeof BANK] ?? BANK[5]!
  return shuffle(bank)
    .slice(0, SESSION)
    .map((c) => ({
      ...c,
      steps: c.steps.map((s) => (s.kind === 'ask' || s.kind === 'pick' ? ({ ...s, choices: shuffle(s.choices as Choice[]) } as Step) : s)),
      verdict: { conclusions: shuffle(c.verdict.conclusions), evidence: shuffle(c.verdict.evidence) },
    }))
}

/** İddia zaten tırnak içeriyorsa (“Kişi: “…””) yeniden sarma */
const quoted = (t: string) => (t.includes('“') ? t : `“${t}”`)

const isQuestion = (s: Step) => s.kind === 'ask' || s.kind === 'pick'

export default function VeriDedektifleri({ grade, onFinish }: GameProps) {
  const age = useAge(grade)
  const dark = age.tier === 'atolye'
  const ink = inkFor(dark)
  const track = useTracker()
  const sol = useSolutions()
  const foundKeys = useRef(new Set<string>())
  const [cases] = useState(() => buildSession(grade))
  const [ci, setCi] = useState(0)
  const [opened, setOpened] = useState(false)
  const [si, setSi] = useState(0)
  const [stepDone, setStepDone] = useState(false)
  const [clues, setClues] = useState<string[]>([])
  const [freshClue, setFreshClue] = useState<string | null>(null)
  const [errors, setErrors] = useState(0)
  const [nudge, setNudge] = useState<{ q: string; mis?: string; id: number } | null>(null)
  const [hintN, setHintN] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [casePaths, setCasePaths] = useState(0)
  const [closed, setClosed] = useState(false)
  const nudgeId = useRef(0)

  const c = cases[ci]
  const step: Step | undefined = c.steps[si]
  const atVerdict = si >= c.steps.length
  // tahtada gösterilen etkileşimli adım: şu anki ya da son etkileşimli adım
  const boardIdx = useMemo(() => {
    for (let k = Math.min(si, c.steps.length - 1); k >= 0; k--) if (!isQuestion(c.steps[k])) return k
    return -1
  }, [si, c.steps])

  const addClue = (t?: string) => {
    if (!t) return
    setClues((cur) => (cur.includes(t) ? cur : [...cur, t]))
    setFreshClue(t)
  }
  const miss = (q: string, mis?: string) => {
    track.attempt(false)
    setErrors((e) => e + 1)
    nudgeId.current++
    setNudge({ q, mis, id: nudgeId.current })
    sfx.bad()
  }
  const completeStep = () => {
    if (!step) return
    track.attempt(true)
    if (step.strategy) track.strategy(step.strategy)
    addClue(step.clue)
    setNudge(null)
    setStepDone(true)
    sfx.ok()
  }
  const next = () => {
    setSi((x) => x + 1)
    setStepDone(false)
    setNudge(null)
    setHintN(0)
    setFreshClue(null)
  }
  const nextCase = () => {
    if (ci + 1 >= cases.length) {
      const firsts = results.filter(Boolean).length
      const extra = Math.max(0, sol.list.length - cases.length)
      const ratio = Math.min(1, (firsts + 0.55 * (cases.length - firsts)) / cases.length + Math.min(0.15, extra * 0.05))
      onFinish({
        stars: starsFor(ratio),
        score: firsts * 100 + (cases.length - firsts) * 60 + extra * 25,
        summary: `${cases.length} dosya çözüldü · İlk denemede: ${firsts} · Kanıt yolu: ${sol.list.length}`,
        insight: INSIGHT[grade] ?? INSIGHT[5],
      })
      return
    }
    setCi((x) => x + 1)
    setOpened(false)
    setSi(0)
    setStepDone(false)
    setClues([])
    setFreshClue(null)
    setErrors(0)
    setNudge(null)
    setHintN(0)
    setCasePaths(0)
    setClosed(false)
  }

  const hints = step?.hint ?? (atVerdict ? ['Dosyadaki ipuçlarını yeniden oku: hangi sonuç sayılarla destekleniyor?', 'Kanıt kartı bir görüş mü, yoksa veriden çıkan bir sonuç mu?'] : ['Dosyadaki ipuçlarını yeniden oku.', 'Her seçeneği veriyle karşılaştır: hangisi sayılarla destekleniyor?'])
  const askHint = () => {
    track.hint()
    setHintN((h) => Math.min(hints.length, h + 1))
  }

  const paper = dark ? 'bg-slate-800/90 text-slate-100 ring-1 ring-slate-600' : 'bg-[#fbf3df] text-ink ring-1 ring-[#e8d6aa]'

  const taskText = atVerdict ? 'Son karar: verilerle desteklenen sonucu seç ve kanıtını ekle.' : (step?.task ?? (step && isQuestion(step) ? 'Soruyu yanıtla; dosyadaki ipuçlarından yararlan.' : ''))

  return (
    <Scene grade={grade} className="!p-2 sm:!p-4">
      <style>{CSS}</style>
      {dark && <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(250,204,21,0.10),transparent_55%)]" />}
      {/* Üst çubuk */}
      <div className="relative mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-black ${dark ? 'bg-amber-400 text-slate-900' : 'bg-[#7c2d12] text-amber-50'}`} style={{ fontFamily: TYPE }}>
          <FileSearch size={16} />DOSYA {ci + 1}/{cases.length}
        </span>
        <LevelDots current={ci} total={cases.length} />
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-extrabold" style={{ background: dark ? '#0f172a' : '#fff', color: ink.text, boxShadow: `inset 0 0 0 1px ${ink.grid}` }}>
          <Search size={15} className="text-teal-500" />Kanıt yolu: {sol.list.length}
        </span>
      </div>

      {!opened ? (
        <CaseIntro c={c} n={ci + 1} dark={dark} onOpen={() => setOpened(true)} />
      ) : (
        <div className="relative grid gap-3 lg:grid-cols-[1fr_340px] lg:gap-4">
          {/* SOL: iddia + inceleme tahtası + soru/karar */}
          <div className="min-w-0">
            <Claim c={c} dark={dark} />
            <div className="lg:hidden">
              <TaskLine text={taskText} dark={dark} step={atVerdict ? c.steps.length + 1 : si + 1} total={c.steps.length + 1} />
            </div>
            <div className="relative">
              {boardIdx >= 0 && (
                <div className="mb-3">
                  <Board key={`${c.id}-${boardIdx}`} s={c.steps[boardIdx]} ink={ink} onDone={boardIdx === si ? completeStep : () => undefined} onMiss={miss} onClue={addClue} />
                </div>
              )}
              {closed && <StampMark dark={dark} />}
            </div>
            {step && isQuestion(step) && !atVerdict && (
              <Ask key={`${c.id}-${si}`} s={step} ink={ink} dark={dark} caseId={c.id} si={si} onOk={(choice, extra) => {
                if (extra) {
                  const key = `${c.id}:${si}:${choice.t}`
                  if (!foundKeys.current.has(key)) {
                    foundKeys.current.add(key)
                    sol.add(key, `${c.emoji} ${choice.t}`)
                  }
                  return
                }
                if (step.kind === 'pick') {
                  const key = `${c.id}:${si}:${choice.t}`
                  foundKeys.current.add(key)
                  sol.add(key, `${c.emoji} ${choice.t}`)
                }
                completeStep()
              }} onMiss={(ch) => miss(ch.fb ?? 'Bu seçenek verilerle destekleniyor mu? Dosyadaki ipuçlarına yeniden bak.', ch.mis)} />
            )}
            {atVerdict && (
              <Verdict key={c.id} c={c} ink={ink} dark={dark} clues={clues} onMiss={miss} onSolved={(evKey, label, first) => {
                const key = `${c.id}#${evKey}`
                const fresh = !foundKeys.current.has(key)
                if (fresh) {
                  foundKeys.current.add(key)
                  sol.add(key, label)
                  setCasePaths((p) => p + 1)
                }
                setNudge(null)
                if (first) {
                  track.attempt(true)
                  track.item(errors === 0)
                  setResults((r) => [...r, errors === 0])
                  setClosed(true)
                  sfx.win()
                }
                return fresh
              }} paths={casePaths} strategyOptions={ci % 2 === 1 ? STRATEGY_OPTIONS[grade] ?? STRATEGY_OPTIONS[5] : undefined} onNext={nextCase} last={ci + 1 >= cases.length} />
            )}
            {nudge && !stepDone && <Nudge key={nudge.id} question={nudge.q} misconception={nudge.mis} onClose={() => setNudge(null)} />}
            {stepDone && !atVerdict && (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-emerald-50 p-3 text-emerald-900 ring-1 ring-emerald-200 animate-fade-up" role="status">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-600 text-white"><Pin size={18} /></span>
                <p className="min-w-0 flex-1 text-[15px] font-extrabold">{step?.clue ? <>İpucu dosyaya eklendi: <MathText text={step.clue} /></> : 'Güzel! Bu adım tamam.'}</p>
                <button type="button" onClick={next} className="btn-primary" autoFocus>{si + 1 >= c.steps.length ? 'Karar zamanı' : 'Devam et'}<ArrowRight size={18} /></button>
              </div>
            )}
          </div>

          {/* SAĞ: dosya paneli */}
          <aside className={`h-fit rounded-3xl p-4 ${paper} lg:sticky lg:top-20`}>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-3xl" aria-hidden>{c.emoji}</span>
              <div className="min-w-0">
                <p className="text-[11px] font-black tracking-widest uppercase opacity-70" style={{ fontFamily: TYPE }}>Dosya #{ci + 1}</p>
                <h2 className="truncate text-lg leading-tight font-black" style={{ fontFamily: TYPE }}>{c.title}</h2>
              </div>
            </div>
            <p className="text-sm font-semibold opacity-90"><MathText text={c.story} /></p>
            <div className="mt-3 hidden lg:block">
              <TaskLine text={taskText} dark={dark} step={atVerdict ? c.steps.length + 1 : si + 1} total={c.steps.length + 1} />
            </div>
            {!closed && (
              <div className="mt-3">
                <button type="button" onClick={askHint} disabled={hintN >= hints.length} className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-extrabold ring-1 disabled:opacity-50 ${dark ? 'bg-slate-700 ring-slate-500' : 'bg-white ring-[#e8d6aa]'}`}>
                  <Lightbulb size={16} className="text-amber-500" />{hintN ? 'Bir ipucu daha' : 'Büyüteçle bak (ipucu)'}
                </button>
                {hints.slice(0, hintN).map((h, i) => (
                  <p key={i} className={`mt-2 flex gap-2 rounded-xl p-2.5 text-sm font-bold animate-fade-up ${dark ? 'bg-amber-400/10 text-amber-100' : 'bg-amber-50 text-amber-900'}`}><HelpCircle size={16} className="mt-0.5 shrink-0" /><MathText text={h} /></p>
                ))}
              </div>
            )}
            <div className="mt-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-black tracking-widest uppercase opacity-70" style={{ fontFamily: TYPE }}><Pin size={13} />Toplanan ipuçları ({clues.length})</p>
              {clues.length === 0 && <p className="text-sm font-semibold opacity-60">Henüz ipucu yok. İncelemeye başla!</p>}
              <ul className="grid gap-2">
                {clues.map((t, i) => (
                  <li key={t} className={`vd-note relative rounded-lg px-3 pt-3 pb-2 text-[13.5px] leading-snug font-bold shadow-sm ${dark ? 'bg-amber-200/10 text-amber-50 ring-1 ring-amber-200/20' : 'bg-[#fff7c2] text-[#3f3a12]'} ${t === freshClue ? 'vd-drop' : ''}`} style={{ transform: `rotate(${i % 2 ? 0.6 : -0.6}deg)` }}>
                    <span className="absolute -top-1.5 left-1/2 size-3.5 -translate-x-1/2 rounded-full bg-rose-500 shadow ring-2 ring-white/80" aria-hidden />
                    <MathText text={t} />
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      )}
    </Scene>
  )
}

/* ───────────── Parçalar ───────────── */

function CaseIntro({ c, n, dark, onOpen }: { c: Case; n: number; dark: boolean; onOpen: () => void }) {
  return (
    <div className="relative mx-auto max-w-2xl py-2 animate-fade-up">
      <div className={`relative mt-5 rounded-3xl p-5 pt-7 shadow-xl sm:p-7 sm:pt-8 ${dark ? 'bg-[#2a2418] text-amber-50 ring-1 ring-amber-900/60' : 'bg-[#f3dfa8] text-[#3b2a10] ring-1 ring-[#dcc07a]'}`}>
        <span className={`absolute -top-5 left-6 rounded-t-2xl px-5 pt-2 pb-3 text-sm font-black tracking-widest ${dark ? 'bg-[#2a2418] text-amber-300' : 'bg-[#f3dfa8] text-[#7c2d12]'}`} style={{ fontFamily: TYPE }}>DOSYA #{n}</span>
        <span className="absolute top-4 right-5 rotate-6 rounded-md border-2 border-rose-600/70 px-2 py-0.5 text-xs font-black tracking-widest text-rose-600/80" style={{ fontFamily: TYPE }}>GİZLİ</span>
        <div className="flex items-start gap-4">
          <span className={`grid size-16 shrink-0 place-items-center rounded-2xl text-4xl shadow-inner sm:size-20 sm:text-5xl ${dark ? 'bg-black/30' : 'bg-white/60'}`} aria-hidden>{c.emoji}</span>
          <div className="min-w-0">
            <h2 className="text-2xl leading-tight font-black sm:text-3xl" style={{ fontFamily: TYPE }}>{c.title}</h2>
            <p className="mt-1 text-sm font-extrabold opacity-75">Dosyayı getiren: {c.client}</p>
          </div>
        </div>
        <p className="mt-4 text-base leading-relaxed font-semibold sm:text-lg"><MathText text={c.story} /></p>
        <div className={`mt-4 rounded-2xl p-4 ${dark ? 'bg-black/30' : 'bg-white/70'}`}>
          <p className="text-xs font-black tracking-widest text-rose-600 uppercase" style={{ fontFamily: TYPE }}>İddia</p>
          <p className="mt-1 text-lg leading-snug font-black sm:text-xl"><MathText text={quoted(c.claim)} /></p>
        </div>
        <p className="mt-4 text-sm font-bold opacity-80">Görevin: iddiayı veriyle sına. İpuçlarını topla, sonra kanıtlarınla karar ver.</p>
        <button type="button" onClick={onOpen} className="btn-primary mt-4 w-full text-lg sm:w-auto" autoFocus><FolderOpen size={20} />Dosyayı aç</button>
      </div>
    </div>
  )
}

function Claim({ c, dark }: { c: Case; dark: boolean }) {
  return (
    <div className={`relative mb-3 flex items-center gap-3 overflow-hidden rounded-2xl py-2.5 pr-3 pl-2 ${dark ? 'bg-slate-900/80 ring-1 ring-slate-600' : 'bg-white ring-1 ring-line shadow-sm'}`}>
      <span className="shrink-0 -rotate-6 rounded-md bg-rose-600 px-2 py-1 text-[11px] font-black tracking-widest text-white" style={{ fontFamily: TYPE }}>İDDİA</span>
      <p className={`min-w-0 text-[15px] leading-snug font-extrabold sm:text-base ${dark ? 'text-slate-100' : 'text-ink'}`}><MathText text={quoted(c.claim)} /></p>
    </div>
  )
}

function TaskLine({ text, dark, step, total }: { text: string; dark: boolean; step: number; total: number }) {
  if (!text) return null
  return (
    <div className={`mb-3 flex items-start gap-3 rounded-2xl px-3 py-2.5 ${dark ? 'bg-teal-900/40 text-teal-50 ring-1 ring-teal-700/60' : 'bg-teal-50 text-teal-950 ring-1 ring-teal-200'}`}>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-teal-600 text-xs font-black text-white">{step}<span className="text-[9px] opacity-80">/{total}</span></span>
      <p className="min-w-0 self-center text-[15px] leading-snug font-extrabold"><MathText text={text} /></p>
    </div>
  )
}

function Board({ s, ink, onDone, onMiss, onClue }: { s: Step; ink: Ink; onDone: () => void; onMiss: (q: string, mis?: string) => void; onClue: (t: string) => void }) {
  switch (s.kind) {
    case 'axis': return <AxisChart s={s} ink={ink} onDone={onDone} />
    case 'picto': return <Pictograph s={s} ink={ink} onDone={onDone} />
    case 'survey': return <Survey s={s} ink={ink} onDone={onDone} onClue={onClue} />
    case 'build': return <BuildBars s={s} ink={ink} onDone={onDone} />
    case 'tally': return <Tally s={s} ink={ink} onDone={onDone} />
    case 'level': return <Level s={s} ink={ink} onDone={onDone} onMiss={onMiss} />
    case 'range': return <RangeDots s={s} ink={ink} onDone={onDone} />
    case 'compare': return <CompareDots s={s} ink={ink} onDone={onDone} onClue={onClue} />
    case 'balance': return <BalanceDots s={s} ink={ink} onDone={onDone} />
    case 'spread': return <Spread s={s} ink={ink} onDone={onDone} onMiss={onMiss} />
    case 'window': return <WindowChart s={s} ink={ink} onDone={onDone} />
    case 'percent': return <PercentBars s={s} ink={ink} onDone={onDone} onMiss={onMiss} />
    case 'grid': return <WholeGrid s={s} ink={ink} onDone={onDone} />
    case 'hist': return <Histogram s={s} ink={ink} onDone={onDone} />
    default: return null
  }
}

function Ask({ s, ink, dark, onOk, onMiss }: { s: Extract<Step, { kind: 'ask' | 'pick' }>; ink: Ink; dark: boolean; caseId: string; si: number; onOk: (c: Choice, extra: boolean) => void; onMiss: (c: Choice) => void }) {
  const [tried, setTried] = useState<number[]>([])
  const [right, setRight] = useState<number[]>([])
  const okCount = s.choices.filter((c) => c.ok).length
  const pick = s.kind === 'pick'
  const choose = (i: number) => {
    const ch = s.choices[i]
    if (right.includes(i) || tried.includes(i)) return
    if (ch.ok) {
      const extra = right.length > 0
      setRight((r) => [...r, i])
      onOk(ch, extra)
    } else {
      setTried((t) => [...t, i])
      onMiss(ch)
    }
  }
  const done = right.length > 0
  return (
    <div className={`rounded-2xl p-3 sm:p-4 ${dark ? 'bg-slate-900/70 ring-1 ring-slate-600' : 'bg-white ring-1 ring-line shadow-sm'}`}>
      <p className="mb-3 text-base leading-snug font-black sm:text-lg" style={{ color: ink.text }}><MathText text={s.prompt} /></p>
      {s.kind === 'ask' && s.table && (
        <table className="mb-3 text-sm font-extrabold" style={{ color: ink.text }}>
          <thead><tr>{s.table.headers.map((h) => <th key={h} className="px-3 py-1 text-left">{h}</th>)}</tr></thead>
          <tbody>{s.table.rows.map((r, i) => <tr key={i}>{r.map((x, k) => <td key={k} className="px-3 py-1">{x}</td>)}</tr>)}</tbody>
        </table>
      )}
      <div className={pick ? 'grid grid-cols-2 gap-2 sm:grid-cols-4' : 'grid gap-2 sm:grid-cols-2'} role="group" aria-label="Seçenekler">
        {s.choices.map((ch, i) => {
          const isRight = right.includes(i), isTried = tried.includes(i)
          const cls = isRight
            ? 'bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500'
            : isTried
              ? dark ? 'bg-slate-800 text-slate-400 ring-1 ring-slate-700' : 'bg-slate-50 text-slate-400 ring-1 ring-slate-200'
              : dark ? 'bg-slate-800 text-slate-100 ring-1 ring-slate-500 hover:ring-teal-400' : 'bg-white text-ink ring-1 ring-line hover:ring-teal-400'
          return (
            <button key={i} type="button" onClick={() => choose(i)} disabled={isTried || (done && !pick)} className={`relative flex min-h-14 items-center gap-2 rounded-xl px-3 py-2 text-left text-[15px] font-extrabold transition active:scale-[0.98] ${pick ? 'flex-col justify-center text-center' : ''} ${cls} ${done && !pick && !isRight ? 'opacity-60' : ''}`}>
              {'g' in ch && <ThumbIcon g={(ch as Choice & { g: Thumb }).g} ink={isRight ? inkFor(false) : ink} />}
              <span className="min-w-0 flex-1"><MathText text={ch.t} /></span>
              {isRight && <Check size={18} className="shrink-0 text-emerald-600" strokeWidth={3} />}
            </button>
          )
        })}
      </div>
      {pick && done && right.length < okCount && <p className="mt-2 text-sm font-extrabold text-teal-600 animate-fade-up">Uygun başka bir gösterim daha var. Bulabilir misin? (İstersen devam et.)</p>}
      {pick && right.length === okCount && okCount > 1 && <p className="mt-2 text-sm font-extrabold text-emerald-600 animate-fade-up">Bütün uygun gösterimleri buldun!</p>}
    </div>
  )
}

function Verdict({ c, ink, dark, clues, onMiss, onSolved, paths, strategyOptions, onNext, last }: { c: Case; ink: Ink; dark: boolean; clues: string[]; onMiss: (q: string, mis?: string) => void; onSolved: (key: string, label: string, first: boolean) => boolean; paths: number; strategyOptions?: string[]; onNext: () => void; last: boolean }) {
  const [concl, setConcl] = useState<number | null>(null)
  const [ev, setEv] = useState<number[]>([])
  const [solved, setSolved] = useState(false)
  const [again, setAgain] = useState(false)
  const [usedCards, setUsedCards] = useState<number[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [stratDone, setStratDone] = useState(!strategyOptions)
  const validIdx = c.verdict.evidence.map((e, i) => (e.ok ? i : -1)).filter((i) => i >= 0)
  const unused = validIdx.filter((i) => !usedCards.includes(i))
  const locked = solved && !again

  const submit = () => {
    setMsg(null)
    if (concl === null) return setMsg('Önce bir sonuç seç.')
    if (!ev.length) return setMsg('Raporuna en az bir kanıt kartı ekle.')
    const cc = c.verdict.conclusions[concl]
    if (!cc.ok) return onMiss(cc.fb ?? 'Bu sonuç verilerle destekleniyor mu?', cc.mis)
    const bad = ev.find((i) => !c.verdict.evidence[i].ok)
    if (bad !== undefined) {
      const e = c.verdict.evidence[bad]
      return onMiss(e.fb ?? 'Bu kart sonucu destekliyor mu?', e.mis)
    }
    if (again && ev.every((i) => usedCards.includes(i))) return setMsg('Bu kanıtları zaten kullandın. Henüz kullanmadığın bir kanıt kartı seç.')
    const key = [...ev].sort().join('+')
    const label = `${c.emoji} ${ev.map((i) => c.verdict.evidence[i].t.split(/[;:.]/)[0]).join(' + ')}`
    onSolved(key, label, !solved)
    setUsedCards((u) => [...new Set([...u, ...ev])])
    setSolved(true)
    setAgain(false)
  }

  const card = (active: boolean) =>
    active
      ? 'ring-2 ring-teal-500 ' + (dark ? 'bg-teal-900/40 text-teal-50' : 'bg-teal-50 text-teal-950')
      : dark ? 'bg-slate-800 text-slate-100 ring-1 ring-slate-600 hover:ring-teal-400' : 'bg-white text-ink ring-1 ring-line hover:ring-teal-400'

  return (
    <div className={`rounded-2xl p-3 sm:p-4 ${dark ? 'bg-slate-900/70 ring-1 ring-slate-600' : 'bg-white/95 ring-1 ring-line shadow-sm'}`} style={{ color: ink.text }}>
      <p className="mb-2 flex items-center gap-2 text-sm font-black tracking-widest uppercase" style={{ fontFamily: TYPE }}><Stamp size={16} className="text-rose-500" />Dedektif raporu</p>
      <p className="mb-2 text-base font-black">1. Hangi sonuç verilerle destekleniyor?</p>
      <div className="grid gap-2" role="radiogroup" aria-label="Sonuçlar">
        {c.verdict.conclusions.map((x, i) => (
          <button key={i} type="button" role="radio" aria-checked={concl === i} disabled={locked} onClick={() => setConcl(i)} className={`flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 text-left text-[15px] font-extrabold transition ${card(concl === i)} disabled:cursor-default`}>
            <span className={`grid size-6 shrink-0 place-items-center rounded-full ring-2 ${concl === i ? 'bg-teal-500 ring-teal-500' : 'ring-slate-400'}`}>{concl === i && <span className="size-2.5 rounded-full bg-white" />}</span>
            <span className="min-w-0 flex-1"><MathText text={x.t} /></span>
          </button>
        ))}
      </div>
      <p className="mt-4 mb-2 text-base font-black">2. Kanıt kartlarını ekle <span className="text-sm font-bold opacity-70">(bir ya da daha fazla)</span></p>
      <div className="grid gap-2 sm:grid-cols-2">
        {c.verdict.evidence.map((x, i) => {
          const on = ev.includes(i)
          const used = usedCards.includes(i)
          const fromClue = clues.some((k) => sharesNumbers(k, x.t))
          return (
            <button key={i} type="button" aria-pressed={on} disabled={locked} onClick={() => setEv((cur) => (cur.includes(i) ? cur.filter((k) => k !== i) : [...cur, i]))} className={`relative flex min-h-14 items-start gap-2 rounded-xl px-3 py-2.5 text-left text-[14.5px] leading-snug font-extrabold transition ${card(on)} disabled:cursor-default`}>
              <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md ring-2 ${on ? 'bg-teal-500 ring-teal-500 text-white' : 'ring-slate-400'}`}>{on && <Check size={14} strokeWidth={3} />}</span>
              <span className="min-w-0 flex-1"><MathText text={x.t} /></span>
              {fromClue && <Pin size={14} className="mt-0.5 shrink-0 text-rose-500" aria-label="Dosyadaki bir ipucuyla bağlantılı" />}
              {used && solved && <span className="absolute -top-2 right-2 rounded-full bg-emerald-600 px-2 text-[10px] font-black text-white">kullanıldı</span>}
            </button>
          )
        })}
      </div>
      {msg && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-extrabold text-amber-900 ring-1 ring-amber-200">{msg}</p>}
      {!locked && (
        <button type="button" onClick={submit} className="btn-primary mt-4 w-full sm:w-auto"><Stamp size={18} />{again ? 'Yeni kanıtla teslim et' : 'Raporu teslim et'}</button>
      )}
      {solved && !again && (
        <div className="mt-4 animate-fade-up">
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-900 ring-1 ring-emerald-200">
            <p className="font-black">Dosya çözüldü! {paths > 1 ? `Bu dosyada ${paths} farklı kanıt yolu buldun.` : ''}</p>
            <p className="mt-1 text-sm font-bold">Sonucunu yalnızca bir iddia olarak değil, verilerle gerekçelendirdin.</p>
          </div>
          {!stratDone && strategyOptions && <StrategyPicker question="Bu dosyayı çözmene en çok ne yardım etti?" options={strategyOptions} onPick={() => setStratDone(true)} />}
          <div className="mt-3 flex flex-wrap gap-2">
            {unused.length > 0 && (
              <button type="button" onClick={() => { setAgain(true); setEv([]); setMsg(null) }} className={`btn inline-flex ring-1 ${dark ? 'bg-slate-700 text-slate-100 ring-slate-500' : 'bg-white text-ink ring-line'}`}>
                <Search size={18} className="text-teal-500" />Başka bir kanıtla da göster
              </button>
            )}
            <button type="button" onClick={onNext} className="btn-primary" autoFocus>{last ? 'Dosyaları kapat' : 'Sonraki dosya'}<ArrowRight size={18} /></button>
          </div>
          {unused.length > 0 && <p className="mt-2 text-xs font-bold opacity-70">Henüz kullanmadığın geçerli bir kanıt daha var.</p>}
        </div>
      )}
    </div>
  )
}

/** Kanıt kartı ile ipucu aynı sayıları paylaşıyor mu? (iğne simgesi için) */
function sharesNumbers(a: string, b: string) {
  const nums = (s: string) => new Set((s.match(/\d+(?:,\d+)?/g) ?? []).filter((x) => x.length > 0))
  const A = nums(a), B = nums(b)
  let n = 0
  B.forEach((x) => A.has(x) && n++)
  return n >= 2 || (B.size === 1 && n === 1)
}

function StampMark({ dark }: { dark: boolean }): ReactNode {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
      <span className="vd-stamp rounded-xl border-[5px] border-rose-600 px-5 py-2 text-3xl font-black tracking-[0.2em] text-rose-600 sm:text-5xl" style={{ fontFamily: TYPE, background: dark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.65)' }}>
        ÇÖZÜLDÜ
      </span>
    </div>
  )
}

const CSS = `
@keyframes vd-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(4px) } }
.vd-bob { animation: vd-bob 1.1s ease-in-out infinite; }
@keyframes vd-pulse { 0%,100% { opacity: 1 } 50% { opacity: .55 } }
.vd-pulse { animation: vd-pulse 1.4s ease-in-out infinite; }
@keyframes vd-stamp { 0% { transform: scale(2.6) rotate(-4deg); opacity: 0 } 60% { transform: scale(.92) rotate(-10deg); opacity: 1 } 100% { transform: scale(1) rotate(-9deg); opacity: .92 } }
.vd-stamp { animation: vd-stamp .55s cubic-bezier(.2,.9,.3,1.2) both; }
@keyframes vd-drop { 0% { transform: translateY(-18px) rotate(-6deg) scale(1.05); opacity: 0 } 100% { opacity: 1 } }
.vd-drop { animation: vd-drop .45s cubic-bezier(.34,1.56,.64,1) both; }
`
