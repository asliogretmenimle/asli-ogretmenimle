import { useMemo, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Gem as GemIcon, HelpCircle, Lightbulb, Sparkles } from 'lucide-react'
import { starsFor, type GameProps } from '../../kit'
import { LevelDots, Nudge, Scene, SolutionList, StrategyPicker, useSolutions } from '../../kit2'
import { MathText } from '../../../components/MathText'
import { useTracker } from '../../../lib/trackerContext'
import { sfx } from '../../../lib/feedback'
import type { ManipulativeTool } from '../../../data/types'
import { CSS, GEMS } from './ui'
import type { Ctl } from './mission'
import { G7 } from './g7'
import { G8 } from './g8'

/**
 * Kristal Mağarası (7–8. sınıf)
 * Her oda bir kristal olgusu: tekrarlı çarpmayla büyüme, aynı sayının farklı kuvvet yazımları, işlem önceliği,
 * üs kuralları, yarıya bölünme (sıfır ve negatif üs), kare kristalin kenarı (karekök), bilimsel gösterim, irrasyonel uzunluklar.
 * Öğrenci önce tahmin eder, kristalleri büyütür/birleştirir/böler; sembol hareketten türer. Farklı geçerli yazımlar useSolutions ile sayılır.
 */

const INSIGHT: Record<number, string> = {
  7: 'Kuvvet, aynı sayının tekrar tekrar çarpılmasıdır: 3^{5} = 3 · 3 · 3 · 3 · 3. Bu yüzden kuvvetler toplamaya göre çok hızlı büyür; aynı sayı birden çok kuvvet biçiminde yazılabilir (2^{6} = 4^{3} = 8^{2}) ve işlem önceliği hangi sayının kuvvetinin alındığını belirler.',
  8: 'Üs, kaç tane aynı çarpanın olduğunu sayar: çarpanları birleştirince üsler toplanır, paketleri çoğaltınca üsler çarpılır, her yarıya bölünmede üs 1 azalır (2^{0} = 1, 2^{−1} = [[1/2]]). Karekökler tam kareler arasına yerleşir; √{2} gibi bazı uzunluklar hiçbir kesirle tam yazılamaz.',
}

export default function KristalMagarasi({ grade, onFinish }: GameProps) {
  const missions = grade >= 8 ? G8 : G7
  const track = useTracker()
  const sol = useSolutions()
  const [mi, setMi] = useState(0)
  const [task, setTask] = useState('')
  const [nudge, setNudge] = useState<{ q: string; mis?: string; tool?: ManipulativeTool; id: number; info?: boolean } | null>(null)
  const [hintN, setHintN] = useState(0)
  const [done, setDone] = useState(false)
  const [stratDone, setStratDone] = useState(false)
  const [notes, setNotes] = useState<{ t: string; m: number }[]>([])
  const errors = useRef(0)
  const doneRef = useRef(false)
  const results = useRef<boolean[]>([])
  const nid = useRef(0)
  const m = missions[mi]
  const solRef = useRef(sol)
  solRef.current = sol

  const ctl = useMemo<Ctl>(
    () => ({
      task: (t) => setTask(t),
      ok: () => {
        track.attempt(true)
        setNudge((n) => (n && !n.info ? null : n))
      },
      miss: (q, mis, tool) => {
        track.attempt(false)
        errors.current++
        nid.current++
        setNudge({ q, mis, tool, id: nid.current })
        sfx.bad()
      },
      info: (q) => {
        nid.current++
        setNudge({ q, id: nid.current, info: true })
      },
      note: (t) => setNotes((cur) => (cur.some((x) => x.t === t) ? cur : [...cur, { t, m: mi }])),
      solve: (key, label) => solRef.current.add(key, label),
      strat: (name) => track.strategy(name),
      misconception: (t) => track.misconception(t),
      complete: () => {
        if (doneRef.current) return
        doneRef.current = true
        track.item(errors.current === 0)
        results.current.push(errors.current === 0)
        setDone(true)
        setNudge(null)
        sfx.win()
      },
    }),
    [track, mi],
  )

  const next = () => {
    if (mi + 1 >= missions.length) {
      const n = missions.length
      const firsts = results.current.filter(Boolean).length
      const extra = sol.list.length
      const ratio = Math.min(1, (firsts + 0.6 * (n - firsts)) / n + Math.min(0.1, extra * 0.015))
      onFinish({
        stars: starsFor(ratio),
        score: firsts * 100 + (n - firsts) * 60 + extra * 20,
        summary: `${n} mağara odası keşfedildi · İlk denemede: ${firsts} · Farklı yazım/yol: ${extra}`,
        insight: INSIGHT[grade >= 8 ? 8 : 7],
      })
      return
    }
    setMi((x) => x + 1)
    setTask('')
    setNudge(null)
    setHintN(0)
    setDone(false)
    setStratDone(false)
    errors.current = 0
    doneRef.current = false
  }

  const askHint = () => {
    track.hint()
    setHintN((h) => Math.min(m.hints.length, h + 1))
  }

  const [, mid, dark] = GEMS[m.gem]
  const roomNotes = notes.filter((x) => x.m === mi)
  const oldNotes = notes.filter((x) => x.m !== mi)

  return (
    <Scene grade={grade} className="!p-2 sm:!p-4">
      <style>{CSS}</style>
      <div aria-hidden className="pointer-events-none absolute inset-0 transition-[background] duration-700" style={{ background: `radial-gradient(ellipse at 20% 0%, ${mid}22, transparent 55%), radial-gradient(ellipse at 100% 100%, ${dark}33, transparent 50%)` }} />
      {/* Üst çubuk */}
      <div className="relative mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-black text-white shadow-[0_0_16px_rgba(168,85,247,0.4)]" style={{ background: `linear-gradient(135deg, ${mid}, ${dark})` }}>
          <GemIcon size={16} />ODA {mi + 1}/{missions.length}
        </span>
        <LevelDots current={mi} total={missions.length} />
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-slate-900/80 px-3 py-1.5 text-sm font-extrabold text-slate-100 ring-1 ring-slate-600">
          <Sparkles size={15} className="text-amber-300" />Farklı yol: {sol.list.length}
        </span>
      </div>

      <div className="relative grid gap-3 lg:grid-cols-[1fr_340px] lg:gap-4">
        <div className="min-w-0">
          <div className="lg:hidden">
            <RoomHead title={m.title} story={m.story} gem={m.gem} n={mi + 1} />
            <TaskLine text={task} />
          </div>
          <m.Comp key={`${grade}-${m.id}`} ctl={ctl} />
          {nudge && !done && <Nudge key={nudge.id} question={nudge.q} misconception={nudge.mis} tool={nudge.tool} onClose={() => setNudge(null)} />}
          {done && (
            <div className="mt-3 rounded-2xl bg-emerald-950/60 p-3 ring-1 ring-emerald-500/50 animate-fade-up" role="status">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_0_16px_rgba(16,185,129,0.6)]"><GemIcon size={20} /></span>
                <p className="min-w-0 flex-1 text-[15px] font-extrabold text-emerald-50">Oda aydınlandı! {errors.current === 0 ? 'İlk denemede buldun.' : 'Denedin, düzelttin ve buldun.'}</p>
                <button type="button" onClick={next} className="btn-primary" autoFocus>{mi + 1 >= missions.length ? 'Mağaradan çık' : 'Sonraki oda'}<ArrowRight size={18} /></button>
              </div>
              {m.strategies && !stratDone && <div className="text-ink"><StrategyPicker options={m.strategies} onPick={() => setStratDone(true)} /></div>}
            </div>
          )}
        </div>

        <aside className="h-fit space-y-3 lg:sticky lg:top-20">
          <div className="hidden lg:block">
            <RoomHead title={m.title} story={m.story} gem={m.gem} n={mi + 1} />
            <TaskLine text={task} />
          </div>
          {!done && (
            <div className="rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600">
              <button type="button" onClick={askHint} disabled={hintN >= m.hints.length} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-slate-700 px-3 text-sm font-extrabold text-slate-50 ring-1 ring-slate-500 disabled:opacity-50">
                <Lightbulb size={17} className="text-amber-300" />{hintN ? 'Bir ipucu daha' : 'Fenerle aydınlat (ipucu)'}
              </button>
              {m.hints.slice(0, hintN).map((h, i) => (
                <p key={i} className="mt-2 flex gap-2 rounded-xl bg-amber-400/10 p-2.5 text-sm font-bold text-amber-100 animate-fade-up"><HelpCircle size={16} className="mt-0.5 shrink-0" /><MathText text={h} /></p>
              ))}
            </div>
          )}
          <div className="rounded-2xl bg-slate-900/70 p-3 ring-1 ring-violet-400/30">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-black tracking-widest text-violet-200 uppercase"><BookOpen size={14} />Keşif defteri</p>
            {notes.length === 0 && <p className="text-sm font-semibold text-slate-400">Bulduğun ilişkiler buraya yazılacak.</p>}
            <ul className="grid gap-1.5">
              {roomNotes.map((x) => <li key={x.t} className="rounded-lg bg-violet-500/15 px-2.5 py-1.5 text-[14px] leading-snug font-bold text-violet-50 animate-fade-up"><MathText text={x.t} /></li>)}
              {oldNotes.slice(-4).map((x) => <li key={x.t} className="rounded-lg px-2.5 py-1 text-[13px] leading-snug font-semibold text-slate-400"><MathText text={x.t} /></li>)}
            </ul>
          </div>
          <SolutionList list={sol.list} />
        </aside>
      </div>
    </Scene>
  )
}

function RoomHead({ title, story, gem, n }: { title: string; story: string; gem: keyof typeof GEMS; n: number }) {
  const [l, mid] = GEMS[gem]
  return (
    <div className="relative mb-3 overflow-hidden rounded-2xl bg-slate-900/80 p-3 ring-1 ring-slate-600">
      <span aria-hidden className="kg-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-[linear-gradient(100deg,transparent,rgba(255,255,255,0.07),transparent)]" />
      <p className="text-[11px] font-black tracking-[0.2em] uppercase" style={{ color: l }}>{n}. oda</p>
      <h2 className="text-xl leading-tight font-black" style={{ color: mid }}>{title}</h2>
      <p className="mt-1 text-sm leading-snug font-semibold text-slate-200"><MathText text={story} /></p>
    </div>
  )
}

function TaskLine({ text }: { text: string }) {
  if (!text) return null
  return (
    <div className="mb-3 flex items-start gap-2.5 rounded-2xl bg-violet-950/70 px-3 py-2.5 text-violet-50 ring-1 ring-violet-500/50">
      <Sparkles size={18} className="mt-0.5 shrink-0 text-amber-300" />
      <p className="min-w-0 text-[15px] leading-snug font-extrabold"><MathText text={text} /></p>
    </div>
  )
}
