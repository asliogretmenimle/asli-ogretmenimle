import { Suspense, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, LayoutGrid, Lightbulb, MessageCircleQuestion, Play, RotateCcw } from 'lucide-react'
import { gradeInfo, isGrade } from '../data/curriculum'
import type { Grade } from '../data/types'
import { interactionById, interactionMeta } from '../interactions/meta'
import { interactions } from '../interactions/registry'
import { categoryInfo, type InteractionCategory, type InteractionMeta } from '../interactions/types'
import { ShareButton } from '../components/ShareButton'
import { MathText } from '../components/MathText'
import { SoundToggle, usePageTitle } from '../components/Layout'
import { interactionKw } from '../lib/seo'
import { SendReport } from '../components/SendReport'
import { SessionTracker } from '../lib/report'
import { TrackerProvider } from '../lib/trackerContext'
import { celebrate, sfx } from '../lib/feedback'
import { CardGrid, EmptyState, FilterBar, ItemCard, PageHeader, categoryTint, gradeRange, useCatalogFilters } from '../components/Catalog'
import NotFound from './NotFound'
import { PageSpinner } from '../cms/PageSpinner'
import { useCmsSettled } from '../cms/runtime'

const GRADE_KEY = 'ao-grade'
const storedGrade = () => {
  try {
    return Number(localStorage.getItem(GRADE_KEY))
  } catch {
    return 0
  }
}

const CATEGORIES = (Object.keys(categoryInfo) as InteractionCategory[]).map((id) => ({ id, label: categoryInfo[id].label }))

export function InteractionsIndex() {
  usePageTitle('Keşif Atölyesi')
  const f = useCatalogFilters()
  const ready = interactionMeta.filter((m) => m.ready)
  const list = ready
    .filter(
      (m) =>
        (!f.grade || m.grades.includes(f.grade)) &&
        (!f.category || m.category === f.category) &&
        f.matches(`${m.name} ${m.description} ${Object.values(m.skills ?? {}).join(' ')} ${categoryInfo[m.category].label}`),
    )
    .sort((a, b) => a.no - b.no)

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:pt-10">
      <PageHeader title="Etkileşimler" desc={`${ready.length} kısa keşif etkinliği. Her biri tek bir matematiksel fikre odaklanır; linkini doğrudan öğrencilere gönderebilirsiniz.`} />
      <FilterBar
        q={f.q}
        onQ={f.setQ}
        placeholder="Etkileşim ara: alan, oran, olasılık…"
        grade={f.grade}
        onGrade={f.setGrade}
        categories={CATEGORIES}
        category={f.category}
        onCategory={f.setCategory}
      />
      <p className="mb-3 text-sm font-semibold text-ink-soft">{list.length} etkileşim</p>
      {list.length ? (
        <CardGrid>
          {list.map((m) => (
            <ItemCard
              key={m.id}
              to={`/etkilesim/${m.id}${f.grade ? `?sinif=${f.grade}` : ''}`}
              emoji={m.emoji}
              title={m.name}
              desc={(f.grade && m.skills?.[f.grade]) || m.description}
              meta={`${gradeRange(m.grades)} · ${categoryInfo[m.category].label}`}
              tint={categoryTint[m.category]}
            />
          ))}
        </CardGrid>
      ) : (
        <EmptyState onClear={f.clear} />
      )}
    </div>
  )
}

export function InteractionPage() {
  const { id = '' } = useParams()
  const m = interactionById[id]
  const settled = useCmsSettled()
  usePageTitle(m ? m.name : settled ? 'Bulunamadı' : undefined)
  if (!m || !m.ready) return settled || m ? <NotFound /> : <PageSpinner />
  return <InteractionView key={m.id} m={m} />
}

function InteractionView({ m }: { m: InteractionMeta }) {
  const [params, setParams] = useSearchParams()
  const fromUrl = Number(params.get('sinif'))
  const [stored] = useState(storedGrade)
  const grade: Grade = isGrade(fromUrl) && m.grades.includes(fromUrl) ? fromUrl : isGrade(stored) && m.grades.includes(stored) ? stored : m.grades[0]
  const info = gradeInfo[grade]
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro')
  const [run, setRun] = useState(0)
  const [result, setResult] = useState<{ summary: string; insight?: string; stars?: 1 | 2 | 3 } | null>(null)
  const Comp = interactions[m.id]
  const tracker = useMemo(() => new SessionTracker(m.id, m.name, 'etkinlik', grade), [m.id, m.name, grade, run])

  const setGrade = (g: Grade) => {
    const p = new URLSearchParams(params)
    p.set('sinif', String(g))
    setParams(p, { replace: true })
    setPhase('intro')
  }
  const start = () => {
    setResult(null)
    setRun((x) => x + 1)
    setPhase('play')
  }
  const finish = (r: { summary: string; insight?: string; stars?: 1 | 2 | 3 }) => {
    setResult(r)
    setPhase('done')
    sfx.win()
    celebrate(true)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:h-16 sm:px-4">
          <Link to={`/etkilesimler?sinif=${grade}`} className="grid size-11 shrink-0 place-items-center rounded-xl text-ink-soft ring-1 ring-line hover:bg-white" aria-label="Etkileşimlere dön">
            <ChevronLeft size={22} />
          </Link>
          <h1 className="min-w-0 flex-1">
            <span className="block truncate text-[11px] font-bold text-ink-soft sm:text-xs">{interactionKw(m)} · {categoryInfo[m.category].label}</span>
            <span className="sr-only">: </span>
            <span className="block truncate text-base leading-tight font-black sm:text-lg"><span aria-hidden>{m.emoji}</span> {m.name}</span>
          </h1>
          <ShareButton title={m.name} className="max-sm:[&>span]:hidden" />
          <SoundToggle />
        </div>
      </header>

      <main className={`mx-auto flex w-full flex-1 flex-col px-3 pt-4 pb-8 sm:px-4 ${phase === 'play' ? 'max-w-6xl' : 'max-w-3xl'}`}>
        {phase === 'intro' && (
          <div className="flex flex-1 flex-col items-center justify-center py-4 animate-fade-up">
            <div className="w-full rounded-3xl bg-white p-6 text-center shadow-[var(--shadow-card)] ring-1 ring-line sm:p-8">
              <span className="mx-auto grid size-20 place-items-center rounded-3xl text-5xl" style={{ background: `${m.color}18` }} aria-hidden>{m.emoji}</span>
              <h2 className="mt-3 text-2xl font-black sm:text-3xl">{m.name}</h2>
              <p className="mt-1 font-semibold text-ink-soft">{m.description}</p>
              {m.launch && (
                <div className="mx-auto mt-4 max-w-xl rounded-2xl bg-cream p-4 text-left">
                  <p className="mb-1 text-xs font-black tracking-wide text-amber-800 uppercase">🌱 Başlarken</p>
                  <p className="text-lg leading-relaxed font-extrabold text-ink"><MathText text={m.launch} /></p>
                </div>
              )}
              {m.grades.length > 1 && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-extrabold tracking-wide text-ink-soft uppercase">Sınıfını seç</p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {m.grades.map((g) => (
                      <button key={g} type="button" onClick={() => setGrade(g)} aria-pressed={g === grade} className="pill size-12 justify-center px-0 text-base" aria-label={`${g}. sınıf`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {m.skills?.[grade] && <p className="mt-4 inline-block rounded-xl bg-paper px-4 py-2 text-sm font-bold text-ink-soft">{info.label}: {m.skills[grade]}</p>}
              <div>
                <button type="button" onClick={start} className="btn-primary mt-6 min-w-56 text-lg" autoFocus><Play size={20} fill="currentColor" />Keşfetmeye başla</button>
              </div>
            </div>
          </div>
        )}

        {phase === 'play' && (
          <Suspense fallback={<div className="grid h-60 place-items-center"><span className="size-10 animate-spin rounded-full border-4 border-line border-t-brand" /></div>}>
            <TrackerProvider tracker={tracker}>
              <Comp key={`${run}-${grade}`} grade={grade} onFinish={finish} />
            </TrackerProvider>
          </Suspense>
        )}

        {phase === 'done' && result && (
          <div className="flex flex-1 flex-col items-center py-6 text-center animate-fade-up">
            <p className="text-6xl" aria-hidden>🌟</p>
            <h2 className="mt-2 text-3xl font-black">Harika keşif!</h2>
            <p className="mt-1 text-lg font-bold text-ink-soft"><MathText text={result.summary} /></p>
            {result.insight && (
              <div className="mt-5 flex w-full items-start gap-2 rounded-3xl bg-brand-soft p-5 text-left ring-1 ring-brand/20">
                <Lightbulb size={20} className="mt-0.5 shrink-0 text-brand-ink" />
                <p className="font-extrabold text-ink"><MathText text={result.insight} /></p>
              </div>
            )}
            {m.reflect && (
              <div className="mt-4 w-full rounded-3xl bg-white p-5 text-left ring-1 ring-line">
                <p className="mb-1 flex items-center gap-2 text-sm font-black tracking-wide text-brand-ink uppercase"><MessageCircleQuestion size={18} />Düşün ve Paylaş</p>
                <p className="text-lg font-extrabold text-ink"><MathText text={m.reflect} /></p>
              </div>
            )}
            <div className="mt-5 flex w-full justify-center"><SendReport tracker={tracker} reflectQ={m.reflect} compact /></div>
            <div className="mt-6 flex w-full max-w-md flex-col gap-3 sm:flex-row">
              <button type="button" onClick={start} className="btn-primary flex-1"><RotateCcw size={18} />Yeniden keşfet</button>
              <Link to={`/etkilesimler?sinif=${grade}`} className="btn-ghost flex-1"><LayoutGrid size={18} />Tüm etkileşimler</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
