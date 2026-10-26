import { useMemo, useRef, useState } from 'react'
import { ArrowDownUp, Search, Sparkles } from 'lucide-react'
import type { Grade } from '../../data/types'
import type { InteractionProps } from '../types'
import { MathText } from '../../components/MathText'
import { useTracker } from '../../lib/trackerContext'
import { StrategyPicker, useSolutions } from '../../games/kit2'
import { ActivityLayout, DoneNote, useNudge, useSession } from '../hizli-noktalar/kit'
import { useLook, fmtN } from '../islem-zinciri/kit'
import { Opt, Steps, isDark } from '../tahmin-test-acikla/ortak'
import { CellsBench, FracsBench, NumsBench, PtsBench, RectBench, type Ans } from './boards'
import { bank, type Good, type Task } from './tasks'

/**
 * 76. Açık Uçlu Problem Laboratuvarı
 *  Her görev, çok sayıda doğru cevabı olan bir problemdir. Öğrenci tezgâhta (kareli tahta, dikdörtgen,
 *  sayı/kesir ayarlayıcı, nokta grafiği, koordinat düzlemi) bir cevap kurar → “Galeriye ekle”.
 *  Uygulama denetler (yanlışta düşündüren soru), doğru ve farklı cevaplar galeride toplanır
 *  (döndürülmüş dikdörtgen, yer değiştiren toplananlar aynı sayılır). Yeterli cevaptan sonra
 *  “Örüntü avı”: galeri bir ölçüye göre dizilir, öğrenci cevaplar arasındaki örüntüyü yorumlar.
 */

export default function AcikUcluLab({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => bank(grade), [grade])
  const S = useSession(tasks.length)
  const N = useNudge()
  const found = useRef(0)

  const next = () => {
    N.clear()
    if (S.last) {
      onFinish({
        stars: S.stars(),
        summary: `${found.current} farklı cevabı galeriye ekledin ve ${tasks.length} açık problemde örüntü avladın.`,
        insight: `Açık uçlu bir problemin pek çok doğru cevabı olabilir; cevapları düzenleyip karşılaştırınca gizli bir kural ortaya çıkar. Örneğin: ${tasks[0].insight}`,
      })
      return
    }
    S.next()
  }

  return <TaskView key={S.idx} grade={grade} task={tasks[S.idx]} S={S} N={N} total={tasks.length} onNext={next} onFound={() => found.current++} />
}

type Phase = 'build' | 'pattern' | 'done'

function TaskView({ grade, task, S, N, total, onNext, onFound }: { grade: Grade; task: Task; S: ReturnType<typeof useSession>; N: ReturnType<typeof useNudge>; total: number; onNext: () => void; onFound: () => void }) {
  const track = useTracker()
  const sol = useSolutions()
  const look = useLook(grade)
  const dark = isDark(grade)
  const [entries, setEntries] = useState<Good[]>([])
  const [phase, setPhase] = useState<Phase>('build')
  const [marks, setMarks] = useState<Record<number, 'right' | 'think'>>({})
  const [hintN, setHintN] = useState(0)
  const [bench, setBench] = useState(0)

  const submit = (a: Ans) => {
    const v = task.check(a)
    if (!v.ok) {
      track.attempt(false)
      N.show(v.q, { misc: v.misc })
      return
    }
    if (!sol.add(v.key, v.label)) {
      N.show(task.dupe)
      return
    }
    track.attempt(true)
    onFound()
    const n = entries.length + 1
    setEntries((e) => [...e, v])
    N.show(
      phase !== 'build'
        ? `Galeriye eklendi! Şimdi ${n} cevabın var.`
        : n >= task.goal
          ? `Harika, ${n}. cevap! Örüntü avına geçebilirsin ya da daha fazla cevap arayabilirsin.`
          : `Galeriye eklendi! ${task.goal - n} farklı cevap daha bul.`,
      { tone: 'ok' },
    )
  }

  const pick = (i: number) => {
    if (phase === 'done' || marks[i]) return
    const o = task.pattern.options[i]
    if (o.good) {
      S.attempt(true)
      setMarks((m) => ({ ...m, [i]: 'right' }))
      N.show(o.why, { tone: 'ok' })
      setPhase('done')
      S.complete()
    } else {
      S.attempt(false)
      setMarks((m) => ({ ...m, [i]: 'think' }))
      N.show(o.why, { misc: o.misc })
    }
  }

  const hint = () => {
    S.hint()
    N.show(task.hints[Math.min(hintN, task.hints.length - 1)])
    setHintN((h) => h + 1)
  }

  const step = phase === 'build' ? (entries.length ? 1 : 0) : phase === 'pattern' ? 2 : 3
  const sortedView = phase !== 'build'
  const list = sortedView ? [...entries].sort((a, b) => a.sort - b.sort) : entries
  const ms = entries.map((e) => e.measure).filter((m): m is number => m !== undefined)
  const mMax = ms.length ? Math.max(...ms) : 0
  const mMin = ms.length ? Math.min(...ms) : 0

  const benchView =
    task.box.k === 'cells' ? (
      <CellsBench key={bench} box={task.box} look={look} grade={grade} onSubmit={submit} />
    ) : task.box.k === 'rect' ? (
      <RectBench key={bench} box={task.box} look={look} grade={grade} onSubmit={submit} />
    ) : task.box.k === 'nums' ? (
      <NumsBench key={bench} box={task.box} look={look} grade={grade} onSubmit={submit} />
    ) : task.box.k === 'fracs' ? (
      <FracsBench key={bench} box={task.box} look={look} grade={grade} onSubmit={submit} />
    ) : (
      <PtsBench key={bench} box={task.box} look={look} grade={grade} onSubmit={submit} />
    )

  const gallery = (
    <section className="rounded-2xl bg-white p-3 ring-1 ring-line" aria-label="Galeri">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles size={17} className="text-amber-500" />
        <p className="flex-1 text-sm font-black text-ink">Galeri: {entries.length} cevap{phase === 'build' ? ` · hedef ${task.goal}` : ''}</p>
        {sortedView && task.measure && (
          <span className="chip bg-sky-50 text-sky-800 ring-1 ring-sky-200"><ArrowDownUp size={12} />{task.measure}</span>
        )}
      </div>
      {phase === 'build' && (
        <div className="mb-2 flex gap-1" aria-hidden>
          {Array.from({ length: Math.max(task.goal, entries.length) }, (_, i) => <span key={i} className={`h-2 flex-1 rounded-full ${i < entries.length ? 'bg-emerald-400' : 'bg-line'}`} />)}
        </div>
      )}
      {entries.length === 0 ? (
        <p className="rounded-xl bg-paper px-3 py-3 text-sm font-bold text-ink-soft">Henüz cevap yok. Tezgâhta bir cevap kur ve “Galeriye ekle”ye dokun.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
          {list.map((e) => {
            const top = sortedView && e.measure !== undefined && mMax !== mMin && e.measure === mMax
            const low = sortedView && e.measure !== undefined && mMax !== mMin && e.measure === mMin
            return (
              <div key={e.key} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center animate-pop ${top ? 'bg-amber-50 ring-2 ring-amber-300' : low ? 'bg-sky-50 ring-2 ring-sky-300' : 'bg-paper ring-1 ring-line'}`}>
                {e.mini}
                <span className="text-[15px] leading-tight font-black text-ink"><MathText text={e.label} /></span>
                {sortedView && task.measure && e.measure !== undefined && (
                  <span className="w-full">
                    <span className="block text-xs font-extrabold text-ink-soft">{e.label.startsWith(task.measure) ? '' : `${task.measure}: ${fmtN(e.measure, 2)}`}{top ? (e.label.startsWith(task.measure) ? 'en büyük' : ' · en büyük') : low ? (e.label.startsWith(task.measure) ? 'en küçük' : ' · en küçük') : ''}</span>
                    {mMax > 0 && mMin >= 0 && <span className="mt-1 block h-1.5 rounded-full bg-sky-400" style={{ width: `${Math.max(6, (Math.abs(e.measure) / Math.max(Math.abs(mMax), Math.abs(mMin), 1)) * 100)}%` }} />}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
      {phase === 'build' && entries.length >= task.goal && (
        <button type="button" onClick={() => { setPhase('pattern'); N.clear() }} className="btn-primary mt-3 min-h-14 w-full text-lg animate-pop">
          <Search size={20} />Örüntü avına geç
        </button>
      )}
    </section>
  )

  const pattern = phase !== 'build' && (
    <section className="rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-200 animate-fade-up" aria-label="Örüntü avı">
      <p className="mb-2 flex items-start gap-2 text-[15px] font-black text-sky-950 sm:text-base"><Search size={18} className="mt-0.5 shrink-0" /><MathText text={task.pattern.q} /></p>
      <div className="flex flex-col gap-2">
        {task.pattern.options.map((o, i) => (
          <Opt key={i} grade={grade} onClick={() => pick(i)} state={marks[i] === 'right' ? 'right' : marks[i] === 'think' ? 'think' : phase === 'done' ? 'dim' : 'idle'} disabled={phase === 'done' || !!marks[i]}>
            {o.t}
          </Opt>
        ))}
      </div>
    </section>
  )

  return (
    <ActivityLayout
      grade={grade}
      idx={S.idx}
      total={total}
      title={task.title}
      prompt={<MathText text={task.prompt} />}
      nudge={N.nudge}
      onCloseNudge={N.clear}
      done={phase === 'done'}
      doneBox={
        <DoneNote title="Örüntüyü yakaladın!" note={<MathText text={task.insight} />}>
          {task.strategies && <StrategyPicker question="Yeni cevapları nasıl buldun?" options={task.strategies} onPick={() => undefined} />}
        </DoneNote>
      }
      onNext={onNext}
      onHint={phase === 'done' ? undefined : hint}
      onReset={phase === 'build' ? () => { setBench((b) => b + 1); N.clear() } : undefined}
      panel={
        <>
          {pattern}
          {gallery}
        </>
      }
    >
      <div data-task={task.title}>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-2xl" aria-hidden>{task.emoji}</span>
          <p className={`text-xs font-black tracking-wide uppercase ${look.muted}`}>Deney tezgâhı</p>
        </div>
        <Steps dark={dark} current={step} steps={[{ label: 'Kur', emoji: '🧪' }, { label: 'Galeri', emoji: '🖼️' }, { label: 'Örüntü avı', emoji: '🔍' }]} />
        {benchView}
      </div>
    </ActivityLayout>
  )
}
