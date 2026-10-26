import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Lightbulb, RotateCcw } from 'lucide-react'
import type { ManipulativeTool } from '../../../data/types'
import { useTracker } from '../../../lib/trackerContext'
import { celebrate, sfx } from '../../../lib/feedback'
import { starsFor, type GameProps } from '../../kit'
import { BigButton, LevelDots, Nudge, Scene, SolutionList, StrategyPicker, TaskCard, useSolutions } from '../../kit2'
import { insightFor, makeLevels } from './levels'
import { LevelCtx, type Api } from './shell'
import { LoadTask, WheelTask } from './wheelTasks'
import { SpendTask, TicketTask } from './shop'
import { BarsTask, PeakTask } from './charts'
import { LayoutTask } from './layout'

/**
 * Lunapark Tasarımcısı (3–5. sınıf) — Van de Walle: eşit gruplar → çarpma/bölme, kalanı bağlamda yorumlama,
 * veriyle karar, çok adımlı bütçe ve alan. Açık uçlu görevlerde (dolap tasarımı, bilet planı, kart harcama,
 * park yerleşimi) her farklı tasarım useSolutions ile toplanır; tasarımlar “Günü başlat” simülasyonuyla karşılaştırılır.
 *  3. sınıf: kabin × koltuk, kabinlere bindirerek bölme, kartı tam harcama, bilet paketi, çeteleden sütun grafiği, tur planı.
 *  4. sınıf: saatlik kapasite (6 tur), kalanlı bölmenin iki yorumu, iki gruplu grafikte kapasite çizgisi, paket karşılaştırma.
 *  5. sınıf: maliyetli dolap ihalesi, veriyle kabin ekleme, bütçeli grup bileti, kabin kiralama, alan + bütçe ile park kurma ve simülasyon.
 */

type NudgeState = { q: string; tone: 'ok' | 'think'; mis?: string; tool?: boolean; id: number } | null

const TOOL_TITLE: Record<string, string> = { dizilim: 'Dizilim tahtasında dene', bargraph: 'Sütun grafiğinde dene', grafiklab: 'Grafik laboratuvarında dene', money: 'Paralarla dene' }

export default function Lunapark({ grade, onFinish }: GameProps) {
  const levels = useMemo(() => makeLevels(grade), [grade])
  const track = useTracker()
  const sol = useSolutions()
  const [idx, setIdx] = useState(0)
  const [completed, setCompleted] = useState<string | null>(null)
  const [nudge, setNudge] = useState<NudgeState>(null)
  const [hintI, setHintI] = useState(0)
  const [taskKey, setTaskKey] = useState(0)
  const stat = useRef({ fails: 0, hints: 0, itemDone: false })
  const totals = useRef({ first: 0, designs: 0 })
  const keys = useRef(new Set<string>())
  const nid = useRef(0)
  const L = levels[idx]
  const done = completed !== null

  const api: Api = {
    grade,
    big: grade <= 3,
    done,
    found: sol.list.length,
    report: (ok) => {
      track.attempt(ok)
      if (!ok) {
        stat.current.fails++
        sfx.bad()
      }
    },
    has: (k) => keys.current.has(k),
    add: (key, label) => {
      if (keys.current.has(key)) return false
      keys.current.add(key)
      sol.add(key, label)
      totals.current.designs++
      return true
    },
    nudge: (q, o) => setNudge(q ? { q, tone: o?.tone ?? 'think', mis: o?.mis, tool: o?.tool, id: ++nid.current } : null),
    strategy: (s) => track.strategy(s),
    complete: (text) => {
      setCompleted(text ?? '')
    },
  }

  useEffect(() => {
    if (done && !stat.current.itemDone) {
      stat.current.itemDone = true
      const first = stat.current.fails === 0 && stat.current.hints === 0
      track.item(first)
      if (first) totals.current.first++
      sfx.win()
      celebrate()
    }
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  const hint = () => {
    const h = L.hints[Math.min(hintI, L.hints.length - 1)]
    setHintI((i) => i + 1)
    stat.current.hints++
    track.hint()
    setNudge({ q: h, tone: 'think', tool: hintI >= 1, id: ++nid.current })
  }

  const next = useCallback(() => {
    if (idx + 1 >= levels.length) {
      const n = levels.length
      const t = totals.current
      const ratio = Math.min(1, (t.first + 0.5 * (n - t.first)) / n + (t.designs >= n + 4 ? 0.1 : 0))
      celebrate(true)
      onFinish({
        stars: starsFor(ratio),
        summary: `${n} lunapark görevini tamamladın, ${t.designs} farklı tasarım ve plan buldun.`,
        score: t.first * 100 + (n - t.first) * 60 + t.designs * 15,
        insight: insightFor(grade),
      })
      return
    }
    setIdx((i) => i + 1)
    keys.current = new Set()
    sol.reset()
    setCompleted(null)
    setNudge(null)
    setHintI(0)
    stat.current = { fails: 0, hints: 0, itemDone: false }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [idx, levels.length, onFinish, grade, sol])

  const restart = () => {
    setNudge(null)
    setTaskKey((k) => k + 1)
  }

  const t = L.task
  const multi = t.kind === 'wheel' || t.kind === 'tickets' || t.kind === 'spend' || t.kind === 'layout'
  const goal = 'goal' in t ? t.goal : 1

  const header = (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <span className="text-sm font-black text-fuchsia-900">🎡 Görev {idx + 1}/{levels.length} · {L.title}</span>
        <LevelDots current={idx} total={levels.length} />
      </div>
      <TaskCard step={idx + 1} total={levels.length}>{L.prompt}</TaskCard>
    </div>
  )

  const nudgeView = nudge && (
    <div className="[&>div]:mt-0">
      <Nudge key={nudge.id} question={nudge.q} tone={nudge.tone} misconception={nudge.mis} tool={nudge.tool && L.tool ? (L.tool as ManipulativeTool) : undefined} toolTitle={L.tool ? TOOL_TITLE[L.tool] : undefined} onClose={() => setNudge(null)} />
    </div>
  )

  const doneBox = done && (
    <div className="rounded-2xl bg-ok-soft p-4 ring-1 ring-green-200 animate-fade-up">
      <p className="text-lg font-black text-green-900">🎉 {multi && goal > 1 ? `${sol.list.length} farklı tasarım buldun!` : 'Görev tamam!'}</p>
      {completed && <p className="mt-1 font-bold text-green-900">{completed}</p>}
      {L.note && <p className="mt-1 text-[15px] font-bold text-green-800">{L.note}</p>}
      {L.picker && <StrategyPicker question={L.picker.q} options={L.picker.options} onPick={() => undefined} />}
      <BigButton onClick={next} className="mt-3 w-full">{idx + 1 >= levels.length ? 'Lunaparkı aç 🎉' : <>Sonraki görev<ArrowRight size={20} /></>}</BigButton>
      {multi && <p className="mt-2 text-center text-sm font-bold text-green-800">İstersen başka tasarımlar bulmaya devam edebilirsin.</p>}
    </div>
  )

  const footer = (
    <>
      {multi && <div className="[&>div]:mt-0"><SolutionList list={sol.list} goal={goal > 1 ? goal : undefined} /></div>}
      {!done && (
        <div className="flex gap-2">
          <button type="button" onClick={hint} className="btn-ghost min-h-12 flex-1"><Lightbulb size={18} className="text-amber-500" />İpucu</button>
          <button type="button" onClick={restart} className="btn-ghost min-h-12 px-4" aria-label="Görevi baştan başlat"><RotateCcw size={18} />Baştan</button>
        </div>
      )}
    </>
  )

  const task =
    t.kind === 'wheel' ? <WheelTask level={t} /> :
    t.kind === 'load' ? <LoadTask level={t} /> :
    t.kind === 'tickets' ? <TicketTask level={t} /> :
    t.kind === 'spend' ? <SpendTask level={t} /> :
    t.kind === 'bars' ? <BarsTask level={t} /> :
    t.kind === 'peak' ? <PeakTask level={t} /> :
    <LayoutTask level={t} />

  return (
    <Scene grade={grade} className="select-none">
      <LevelCtx.Provider value={{ api, header, top: <>{nudgeView}{doneBox}</>, footer }}>
        <div key={`${idx}-${taskKey}`}>{task}</div>
      </LevelCtx.Provider>
    </Scene>
  )
}
