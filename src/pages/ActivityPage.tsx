import { Suspense, lazy, useEffect, useMemo, useState, type ComponentType } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, ChevronLeft, Info, LayoutGrid, RotateCcw, X } from 'lucide-react'
import { activityGrade, activityTheme, gradeFromId, useGradeActivities } from '../data/activityStore'
import { gradeInfo, outcomeByCode } from '../data/curriculum'
import type { Activity, ActivityType } from '../data/types'
import type { EngineProps } from '../engine/common'
import { ShareButton } from '../components/ShareButton'
import { SoundToggle, usePageTitle } from '../components/Layout'
import { TypeBadge } from '../components/meta'
import { MathText } from '../components/MathText'
import { celebrate, sfx } from '../lib/feedback'
import NotFound from './NotFound'

const engines: Record<ActivityType, ComponentType<EngineProps<any>>> = {
  quiz: lazy(() => import('../engine/Quiz')),
  fill: lazy(() => import('../engine/FillBlank')),
  match: lazy(() => import('../engine/MatchGame')),
  sort: lazy(() => import('../engine/SortOrder')),
  categorize: lazy(() => import('../engine/Categorize')),
  manipulative: lazy(() => import('../engine/ManipulativeTask')),
}

export default function ActivityPage() {
  const { id = '' } = useParams()
  const list = useGradeActivities(gradeFromId(id))
  const a = list?.find((x) => x.id === id)
  usePageTitle(a?.title ?? (list || !gradeFromId(id) ? 'Etkinlik bulunamadı' : undefined))
  if (!a) {
    if (!list && gradeFromId(id)) return <div className="grid h-[60vh] place-items-center"><span className="size-10 animate-spin rounded-full border-4 border-line border-t-brand" aria-label="Yükleniyor" /></div>
    return <NotFound />
  }
  return <ActivityView key={a.id} a={a} list={list!} />
}

function ActivityView({ a, list }: { a: Activity; list: Activity[] }) {
  const grade = activityGrade(a)
  const theme = activityTheme(a)
  const info = gradeInfo[grade]
  const navigate = useNavigate()
  const [run, setRun] = useState(0)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const Engine = engines[a.type]

  const next = useMemo(() => list[list.findIndex((x) => x.id === a.id) + 1], [a.id, list])

  const backTo = theme ? `/sinif/${grade}/${theme.slug}` : `/?sinif=${grade}`

  useEffect(() => {
    if (!result) return
    sfx.win()
    if (result.correct / Math.max(1, result.total) >= 0.6) celebrate(true)
  }, [result])

  const restart = () => {
    setResult(null)
    setProgress(0)
    setRun((r) => r + 1)
  }

  return (
    <div className="flex min-h-dvh flex-col" style={{ ['--grade' as string]: info.color }}>
      {/* Üst çubuk */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-2 px-3 sm:h-16 sm:px-4">
          <Link to={backTo} className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-soft ring-1 ring-line hover:bg-white" aria-label="Geri dön">
            <ChevronLeft size={22} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-extrabold sm:text-xs" style={{ color: info.ink }}>{info.label}{theme ? ` · ${theme.title}` : ''}</p>
            <h1 className="truncate text-base leading-tight font-black sm:text-lg">{a.title}</h1>
          </div>
          <ShareButton title={a.title} className="max-sm:[&>span]:hidden" />
          <SoundToggle />
        </div>
        <div className="h-1.5 bg-line/60" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <div className="h-full rounded-r-full transition-[width] duration-500" style={{ width: `${(result ? 1 : progress) * 100}%`, background: info.color }} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pt-5 pb-4">
        {result ? (
          <Finish result={result} onRestart={restart} next={next} backTo={backTo} gradeColor={info.color} />
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-center gap-2 text-center">
              <TypeBadge type={a.type} />
              <p className="text-base font-bold text-ink-soft"><MathText text={a.instructions} /></p>
            </div>
            <div className="flex-1">
              <Suspense fallback={<div className="grid h-60 place-items-center"><span className="size-10 animate-spin rounded-full border-4 border-line border-t-brand" /></div>}>
                <Engine
                  key={run}
                  activity={a}
                  onProgress={(d: number, t: number) => setProgress(d / Math.max(1, t))}
                  onFinish={(correct: number, total: number) => setResult({ correct, total })}
                />
              </Suspense>
            </div>
          </>
        )}

        <div className="mt-8 text-center">
          <button type="button" onClick={() => setShowInfo((s) => !s)} className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-soft hover:text-ink">
            <Info size={14} /> Öğretmen ve veliler için
          </button>
          {showInfo && (
            <div className="mx-auto mt-3 max-w-2xl rounded-2xl bg-white p-4 text-left text-sm ring-1 ring-line animate-fade-up">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-extrabold">Öğrenme çıktıları</span>
                <button type="button" onClick={() => setShowInfo(false)} aria-label="Kapat" className="text-ink-soft"><X size={16} /></button>
              </div>
              <ul className="space-y-1.5">
                {a.outcomes.map((c) => (
                  <li key={c}><span className="font-mono text-xs font-bold text-brand">{c}</span> <span className="font-semibold text-ink-soft">{outcomeByCode.get(c)?.title}</span></li>
                ))}
              </ul>
              <button type="button" onClick={() => navigate(backTo)} className="mt-3 text-xs font-extrabold text-brand hover:underline">Bu temanın tüm etkinlikleri →</button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function Finish({ result, onRestart, next, backTo, gradeColor }: { result: { correct: number; total: number }; onRestart: () => void; next?: Activity; backTo: string; gradeColor: string }) {
  const ratio = result.correct / Math.max(1, result.total)
  const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1
  const msg = stars === 3 ? 'Muhteşem!' : stars === 2 ? 'Çok iyi!' : 'Güzel deneme!'
  const sub = stars === 3 ? 'Hepsini harika yaptın.' : stars === 2 ? 'Biraz daha pratikle tam puan senin!' : 'Tekrar oynayarak daha çok yıldız kazanabilirsin.'
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-8 text-center animate-fade-up">
      <div className="flex items-end gap-2" aria-label={`${stars} yıldız`}>
        {[1, 2, 3].map((s) => (
          <svg key={s} viewBox="0 0 24 24" className={`${s === 2 ? 'size-24 sm:size-28' : 'size-16 sm:size-20'} animate-pop drop-shadow`} style={{ animationDelay: `${s * 120}ms` }}>
            <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill={s <= stars ? '#facc15' : '#e5e7eb'} stroke={s <= stars ? '#eab308' : '#d1d5db'} strokeWidth={1} strokeLinejoin="round" />
          </svg>
        ))}
      </div>
      <h2 className="mt-5 text-4xl font-black">{msg}</h2>
      <p className="mt-1 text-lg font-bold text-ink-soft">{sub}</p>
      <p className="mt-5 rounded-2xl bg-white px-5 py-3 text-xl font-black ring-1 ring-line">
        <span style={{ color: gradeColor }}>{result.correct}</span> / {result.total} ilk denemede doğru
      </p>
      <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
        <button type="button" onClick={onRestart} className="btn-ghost flex-1"><RotateCcw size={18} />Tekrar oyna</button>
        {next ? (
          <Link to={`/etkinlik/${next.id}`} className="btn-primary flex-1">Sonraki etkinlik<ArrowRight size={18} /></Link>
        ) : (
          <Link to={backTo} className="btn-primary flex-1"><LayoutGrid size={18} />Tüm etkinlikler</Link>
        )}
      </div>
      {next && <Link to={backTo} className="mt-4 text-sm font-extrabold text-ink-soft hover:text-ink">Tema sayfasına dön</Link>}
    </div>
  )
}
