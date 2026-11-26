/** Etkinliğin canlı önizlemesi: sitedeki motorun aynısı */
import { Component, Suspense, lazy, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { MessageCircleQuestion, RotateCcw } from 'lucide-react'
import type { Activity, ActivityType } from '../../data/types'
import type { EngineProps } from '../../engine/common'
import { SessionTracker } from '../../lib/report'
import { TrackerProvider } from '../../lib/trackerContext'
import { StageBadge, TypeBadge } from '../../components/meta'
import { MathText } from '../../components/MathText'
import { Button } from '../ui'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const engines: Record<ActivityType, ComponentType<EngineProps<any>>> = {
  quiz: lazy(() => import('../../engine/Quiz')),
  fill: lazy(() => import('../../engine/FillBlank')),
  match: lazy(() => import('../../engine/MatchGame')),
  sort: lazy(() => import('../../engine/SortOrder')),
  categorize: lazy(() => import('../../engine/Categorize')),
  manipulative: lazy(() => import('../../engine/ManipulativeTask')),
}

class Boundary extends Component<{ children: ReactNode; onReset?: () => void }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error)
      return (
        <div className="rounded-2xl bg-bad-soft p-4 text-sm font-bold text-red-900 ring-1 ring-red-200">
          <p className="font-black">Önizleme çizilemedi</p>
          <p className="mt-1 font-semibold">Verilerde eksik ya da hatalı bir alan olabilir (ör. boş seçenek, yanlış hedef biçimi). Düzelttiğinizde önizleme kendiliğinden yenilenir.</p>
          <p className="mt-2 font-mono text-xs opacity-70">{this.state.error.message}</p>
        </div>
      )
    return this.props.children
  }
}

const hash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

export function ActivityPreview({ activity }: { activity: Activity }) {
  const json = useMemo(() => JSON.stringify(activity), [activity])
  const [shown, setShown] = useState(activity)
  const [shownJson, setShownJson] = useState(json)
  useEffect(() => {
    if (json === shownJson) return
    const t = setTimeout(() => {
      setShown(JSON.parse(json) as Activity)
      setShownJson(json)
    }, 600)
    return () => clearTimeout(t)
  }, [json, shownJson])

  const [run, setRun] = useState(0)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null)
  const key = `${hash(shownJson)}-${run}`
  useEffect(() => {
    setResult(null)
    setProgress(0)
  }, [key])
  const tracker = useMemo(() => new SessionTracker(shown.id || 'onizleme', shown.title, 'etkinlik'), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const Engine = engines[shown.type]
  const pending = json !== shownJson

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-extrabold text-ink-soft">
          <span className={`size-2 rounded-full ${pending ? 'animate-pulse bg-amber-400' : 'bg-ok'}`} />
          {pending ? 'Güncelleniyor…' : 'Canlı önizleme'}
        </div>
        <Button size="sm" variant="ghost" icon={<RotateCcw size={14} />} onClick={() => setRun((x) => x + 1)}>
          Baştan başlat
        </Button>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-paper">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <div className="rounded-2xl bg-paper p-3 sm:p-4">
        {shown.launch?.text?.trim() && (
          <div className="mb-3 rounded-2xl bg-cream p-3">
            <p className="mb-0.5 text-[11px] font-black tracking-wide text-amber-800 uppercase">🌱 Başlarken</p>
            <p className="text-sm font-extrabold text-ink">
              <MathText text={shown.launch.text} />
            </p>
          </div>
        )}
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2 text-center">
          {shown.stage && <StageBadge stage={shown.stage} />}
          <TypeBadge type={shown.type} />
          <p className="text-sm font-bold text-ink-soft">
            <MathText text={shown.instructions || ''} />
          </p>
        </div>
        {result ? (
          <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-line animate-fade-up">
            <p className="text-3xl">🎉</p>
            <p className="mt-1 text-lg font-black">
              Bitti: {result.correct}/{result.total} doğru
            </p>
            {shown.reflect?.trim() && (
              <div className="mx-auto mt-4 max-w-md rounded-2xl bg-brand-soft p-3 text-left">
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-black tracking-wide text-brand-ink uppercase">
                  <MessageCircleQuestion size={14} />
                  Düşün ve Paylaş
                </p>
                <p className="text-sm font-extrabold">
                  <MathText text={shown.reflect} />
                </p>
              </div>
            )}
            <Button className="mt-4" variant="primary" icon={<RotateCcw size={15} />} onClick={() => setRun((x) => x + 1)}>
              Tekrar dene
            </Button>
          </div>
        ) : (
          <Boundary key={key}>
            <Suspense fallback={<div className="grid h-48 place-items-center"><span className="size-8 animate-spin rounded-full border-4 border-line border-t-brand" /></div>}>
              <TrackerProvider tracker={tracker}>
                <Engine
                  key={key}
                  activity={shown}
                  onProgress={(d: number, t: number) => setProgress(d / Math.max(1, t))}
                  onFinish={(correct: number, total: number) => setResult({ correct, total })}
                />
              </TrackerProvider>
            </Suspense>
          </Boundary>
        )}
      </div>
    </div>
  )
}
