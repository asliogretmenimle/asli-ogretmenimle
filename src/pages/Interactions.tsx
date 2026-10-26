import { Suspense, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, LayoutGrid, Lightbulb, MessageCircleQuestion, Play, RotateCcw } from 'lucide-react'
import { gradeInfo, grades, isGrade } from '../data/curriculum'
import type { Grade } from '../data/types'
import { interactionById, interactionMeta } from '../interactions/meta'
import { interactions } from '../interactions/registry'
import { categoryInfo, type InteractionCategory, type InteractionMeta } from '../interactions/types'
import { ShareButton } from '../components/ShareButton'
import { MathText } from '../components/MathText'
import { SoundToggle, usePageTitle } from '../components/Layout'
import { SendReport } from '../components/SendReport'
import { SessionTracker } from '../lib/report'
import { TrackerProvider } from '../lib/trackerContext'
import { celebrate, sfx } from '../lib/feedback'
import NotFound from './NotFound'

const GRADE_KEY = 'ao-grade'
const storedGrade = () => {
  try {
    return Number(localStorage.getItem(GRADE_KEY))
  } catch {
    return 0
  }
}

const range = (g: Grade[]) => (g.length === 1 ? `${g[0]}` : `${g[0]}–${g[g.length - 1]}`)

export function InteractionCard({ m, grade }: { m: InteractionMeta; grade?: Grade }) {
  const to = `/etkilesim/${m.id}${grade ? `?sinif=${grade}` : ''}`
  const body = (
    <>
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl transition group-hover:scale-110" style={{ background: `${m.color}18` }} aria-hidden>{m.emoji}</span>
      <span className="min-w-0">
        <span className="block leading-tight font-black">{m.name}</span>
        <span className="mt-1 block text-sm font-semibold text-ink-soft">{grade && m.skills?.[grade] ? m.skills[grade] : m.description}</span>
        <span className="mt-2 flex flex-wrap gap-1">
          <span className="chip bg-paper text-ink-soft">{range(m.grades)}. sınıf</span>
          {!m.ready && <span className="chip bg-amber-50 text-amber-700">Yakında</span>}
        </span>
      </span>
    </>
  )
  if (!m.ready) return <div className="card flex items-start gap-3 p-4 opacity-60">{body}</div>
  return (
    <Link to={to} className="card group flex items-start gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
      {body}
    </Link>
  )
}

export function InteractionsIndex() {
  usePageTitle('Keşif Atölyesi')
  const [params, setParams] = useSearchParams()
  const fromUrl = Number(params.get('sinif'))
  const [stored] = useState(storedGrade)
  const grade: Grade | null = isGrade(fromUrl) ? fromUrl : params.has('sinif') ? null : isGrade(stored) ? stored : null
  const list = grade ? interactionMeta.filter((m) => m.grades.includes(grade)) : interactionMeta
  const choose = (g: Grade | null) => {
    const p = new URLSearchParams(params)
    p.set('sinif', g ? String(g) : 'hepsi')
    setParams(p, { replace: true })
  }
  const cats = Object.keys(categoryInfo) as InteractionCategory[]

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <h1 className="text-3xl font-black sm:text-4xl">Keşif Atölyesi <span aria-hidden>🔬</span></h1>
      <p className="mt-2 max-w-2xl font-semibold text-ink-soft">Kısa, tekrar kullanılabilir ve tek bir matematiksel fikri keşfetmeye odaklanan etkinlikler. Her birinin kendi linki var; öğretmen doğrudan öğrencilere gönderebilir.</p>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <button type="button" onClick={() => choose(null)} className={`chip shrink-0 px-3 py-1.5 text-sm ${!grade ? 'bg-ink text-white' : 'bg-white text-ink ring-1 ring-line'}`}>Tüm sınıflar</button>
        {grades.map((g) => (
          <button key={g} type="button" onClick={() => choose(g)} aria-pressed={grade === g} className="chip shrink-0 border px-3 py-1.5 text-sm transition" style={{ background: grade === g ? gradeInfo[g].color : '#fff', color: grade === g ? '#fff' : gradeInfo[g].ink, borderColor: `${gradeInfo[g].color}55` }}>
            {gradeInfo[g].emoji} {gradeInfo[g].label}
          </button>
        ))}
      </div>
      <div className="mt-6 space-y-10">
        {cats.map((c) => {
          const items = list.filter((m) => m.category === c).sort((a, b) => Number(b.ready) - Number(a.ready) || a.no - b.no)
          if (!items.length) return null
          return (
            <section key={c}>
              <h2 className="mb-3 flex items-center gap-2 text-xl font-black"><span className="size-3 rounded-full" style={{ background: categoryInfo[c].color }} />{categoryInfo[c].label}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((m) => <InteractionCard key={m.id} m={m} grade={grade ?? undefined} />)}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

export function InteractionPage() {
  const { id = '' } = useParams()
  const m = interactionById[id]
  usePageTitle(m ? m.name : 'Bulunamadı')
  if (!m || !m.ready) return <NotFound />
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
          <Link to={`/etkilesimler?sinif=${grade}`} className="grid size-11 shrink-0 place-items-center rounded-xl text-ink-soft ring-1 ring-line hover:bg-white" aria-label="Keşif Atölyesine dön">
            <ChevronLeft size={22} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-extrabold sm:text-xs" style={{ color: categoryInfo[m.category].color }}>Keşif Atölyesi · {categoryInfo[m.category].label}</p>
            <h1 className="truncate text-base leading-tight font-black sm:text-lg"><span aria-hidden>{m.emoji}</span> {m.name}</h1>
          </div>
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
                      <button key={g} type="button" onClick={() => setGrade(g)} aria-pressed={g === grade} className="grid size-12 place-items-center rounded-xl border-2 text-lg font-black transition" style={{ background: g === grade ? gradeInfo[g].color : '#fff', color: g === grade ? '#fff' : gradeInfo[g].ink, borderColor: g === grade ? gradeInfo[g].color : `${gradeInfo[g].color}55` }}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {m.skills?.[grade] && <p className="mt-4 inline-block rounded-2xl px-4 py-2 text-sm font-extrabold" style={{ background: info.soft, color: info.ink }}>{info.label}: {m.skills[grade]}</p>}
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
              <Link to={`/etkilesimler?sinif=${grade}`} className="btn-ghost flex-1"><LayoutGrid size={18} />Tüm keşifler</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
