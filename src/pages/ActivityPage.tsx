import { Suspense, lazy, useEffect, useMemo, useState, type ComponentType } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronLeft, Info, LayoutGrid, MessageCircleQuestion, Play, RotateCcw, X } from 'lucide-react'
import { activityGrade, activityTheme, gradeFromId, useGradeActivities } from '../data/activityStore'
import { gradeInfo, outcomeByCode } from '../data/curriculum'
import type { Activity, ActivityType } from '../data/types'
import type { EngineProps } from '../engine/common'
import { ShareButton } from '../components/ShareButton'
import { SoundToggle, usePageTitle } from '../components/Layout'
import { StageBadge, TypeBadge } from '../components/meta'
import { VisualView } from '../components/Visual'
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
  const [started, setStarted] = useState(!a.launch?.text)
  const [showInfo, setShowInfo] = useState(false)
  const Engine = engines[a.type]

  const i = list.findIndex((x) => x.id === a.id)
  const next = useMemo(() => list[i + 1], [i, list])
  // Aynı öğrenme çıktısındaki önceki/sonraki adım (öğrenme yolu)
  const prevStep = useMemo(() => {
    const p = list[i - 1]
    return p && p.outcomes[0] === a.outcomes[0] ? p : undefined
  }, [i, list, a.outcomes])
  const nextStep = next && next.outcomes[0] === a.outcomes[0] ? next : undefined

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
        {!started ? (
          <LaunchScreen a={a} onStart={() => setStarted(true)} />
        ) : result ? (
          <Finish a={a} result={result} onRestart={restart} next={next} nextStep={nextStep} prevStep={prevStep} backTo={backTo} gradeColor={info.color} />
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-center gap-2 text-center">
              {a.stage && <StageBadge stage={a.stage} />}
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

function LaunchScreen({ a, onStart }: { a: Activity; onStart: () => void }) {
  if (!a.launch) return null
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-6 animate-fade-up">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 text-center shadow-[var(--shadow-card)] ring-1 ring-line sm:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
          <span className="chip bg-cream px-3 py-1 text-sm text-amber-800">🌱 Başlarken</span>
          {a.stage && <StageBadge stage={a.stage} />}
        </div>
        <p className="text-xl leading-relaxed font-extrabold text-ink sm:text-2xl"><MathText text={a.launch.text} /></p>
        {a.launch.visual && (
          <div className="mt-5">
            <VisualView v={a.launch.visual} size="lg" />
          </div>
        )}
        <p className="mt-5 text-base font-bold text-ink-soft"><MathText text={a.instructions} /></p>
        <button type="button" onClick={onStart} className="btn-primary mt-6 min-w-56 text-lg" autoFocus>
          <Play size={20} fill="currentColor" />Hadi başlayalım!
        </button>
      </div>
    </div>
  )
}

const FEELINGS = [
  { e: '😄', t: 'Kolaydı' },
  { e: '🙂', t: 'Biraz düşündüm' },
  { e: '🤔', t: 'Zorlandım' },
] as const

function Finish({ a, result, onRestart, next, nextStep, prevStep, backTo, gradeColor }: { a: Activity; result: { correct: number; total: number }; onRestart: () => void; next?: Activity; nextStep?: Activity; prevStep?: Activity; backTo: string; gradeColor: string }) {
  const ratio = result.correct / Math.max(1, result.total)
  const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1
  const msg = stars === 3 ? 'Muhteşem!' : stars === 2 ? 'Çok iyi!' : 'Güzel çaba!'
  const [feeling, setFeeling] = useState<number | null>(null)
  const suggestion = feeling === null ? null : feeling === 2 ? (prevStep ? { a: prevStep, text: 'Bir önceki adımla pekiştirmek ister misin?', back: true } : { a: undefined, text: 'Tekrar oynamak ya da ipuçlarını kullanmak yardımcı olur. Zorlanmak öğrenmenin parçası!', back: true }) : nextStep ? { a: nextStep, text: feeling === 0 ? 'Harika! Öğrenme yolunda bir sonraki adıma hazırsın.' : 'Bir sonraki adımda aynı fikri farklı bir yolla göreceksin.', back: false } : null
  return (
    <div className="flex flex-1 flex-col items-center py-6 text-center animate-fade-up">
      <div className="flex items-end gap-1.5" aria-label={`${stars} yıldız`}>
        {[1, 2, 3].map((s) => (
          <svg key={s} viewBox="0 0 24 24" className={`${s === 2 ? 'size-16 sm:size-20' : 'size-12 sm:size-14'} animate-pop drop-shadow`} style={{ animationDelay: `${s * 120}ms` }}>
            <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill={s <= stars ? '#facc15' : '#e5e7eb'} stroke={s <= stars ? '#eab308' : '#d1d5db'} strokeWidth={1} strokeLinejoin="round" />
          </svg>
        ))}
      </div>
      <h2 className="mt-3 text-3xl font-black">{msg}</h2>
      <p className="mt-1 font-bold text-ink-soft">
        <span style={{ color: gradeColor }}>{result.correct}</span> / {result.total} soruyu ilk denemede çözdün.
      </p>

      {a.reflect && (
        <div className="mt-6 w-full max-w-2xl rounded-3xl bg-brand-soft p-5 text-left ring-1 ring-brand/20 sm:p-6">
          <p className="mb-2 flex items-center gap-2 text-sm font-black tracking-wide text-brand-ink uppercase"><MessageCircleQuestion size={18} />Düşün ve Paylaş</p>
          <p className="text-lg leading-relaxed font-extrabold text-ink sm:text-xl"><MathText text={a.reflect} /></p>
          <p className="mt-2 text-sm font-semibold text-ink-soft">Cevabını bir arkadaşına, ailene ya da öğretmenine anlat. Açıklamak, öğrenmeyi güçlendirir.</p>
        </div>
      )}

      <div className="mt-6 w-full max-w-2xl">
        <p className="mb-2 text-sm font-extrabold text-ink-soft">Bu etkinlik senin için nasıldı?</p>
        <div className="flex justify-center gap-2">
          {FEELINGS.map((f, k) => (
            <button key={f.t} type="button" onClick={() => setFeeling(k)} aria-pressed={feeling === k} className={`flex min-w-24 flex-col items-center gap-0.5 rounded-2xl border-2 px-3 py-2 text-sm font-extrabold transition ${feeling === k ? 'border-brand bg-white' : 'border-transparent bg-white/70 hover:bg-white'}`}>
              <span className="text-2xl" aria-hidden>{f.e}</span>{f.t}
            </button>
          ))}
        </div>
        {suggestion && (
          <div className="mt-3 flex flex-col items-center gap-2 rounded-2xl bg-white p-3 text-sm font-bold ring-1 ring-line animate-fade-up sm:flex-row sm:justify-between sm:text-left">
            <span>{suggestion.text}</span>
            {suggestion.a && (
              <Link to={`/etkinlik/${suggestion.a.id}`} className="btn-ghost min-h-10 shrink-0 px-3 text-sm">
                {suggestion.back && <ArrowLeft size={16} />}{suggestion.a.title}{!suggestion.back && <ArrowRight size={16} />}
              </Link>
            )}
          </div>
        )}
      </div>

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
