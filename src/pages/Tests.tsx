import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, BookOpen, ChevronLeft, ClipboardCheck, LayoutGrid, Play, RotateCcw } from 'lucide-react'
import { findTheme, gradeInfo, grades, isGrade } from '../data/curriculum'
import { useGradeActivities } from '../data/activityStore'
import { TEST_PATH, TEST_SIZES, drawTest, testItems, testPath, testThemes } from '../data/tests'
import type { Grade, QuizActivity, Theme } from '../data/types'
import { guides } from '../data/guides'
import { usePageTitle } from '../components/Layout'
import { PageHeader } from '../components/Catalog'
import { ShareButton } from '../components/ShareButton'
import { SendReport } from '../components/SendReport'
import { GUIDES_PATH, themeKw, themeTestHeading } from '../lib/seo'
import { SessionTracker } from '../lib/report'
import { TrackerProvider } from '../lib/trackerContext'
import { celebrate, sfx } from '../lib/feedback'
import NotFound from './NotFound'

const Quiz = lazy(() => import('../engine/Quiz'))

const Spinner = () => (
  <div className="grid h-40 place-items-center">
    <span className="size-9 animate-spin rounded-full border-4 border-line border-t-brand" aria-label="Yükleniyor" />
  </div>
)

/** /test: sınıf seçimi */
export function TestsIndex() {
  usePageTitle()
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:pt-8">
      <PageHeader
        title="Matematik Test Çöz"
        desc="1–8. sınıf her konu için cevaplı, açıklamalı online testler. Sorular her açılışta karışık seçilir; yanlış cevapta neden yanlış olduğunu görürsün."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {grades.map((g) => (
          <Link key={g} to={testPath(g)} className="group flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-line transition hover:shadow-[var(--shadow-lift)]">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: gradeInfo[g].soft }} aria-hidden>{gradeInfo[g].emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold text-ink">{gradeInfo[g].label} Matematik Testi</span>
              <span className="block text-sm font-semibold text-ink-soft">Konu konu ya da karışık</span>
            </span>
            <ArrowRight size={18} className="shrink-0 text-ink-soft transition group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </div>
  )
}

/** /test/7 ve /test/7/<tema> */
export function TestPage() {
  const { grade: gStr = '', slug } = useParams()
  const g = Number(gStr)
  const theme = isGrade(g) && slug ? findTheme(g, slug) : undefined
  usePageTitle(isGrade(g) && (!slug || theme) ? undefined : 'Sayfa bulunamadı')
  if (!isGrade(g) || (slug && !theme)) return <NotFound />
  return <TestView key={`${g}/${slug ?? ''}`} grade={g} theme={theme} />
}

function TestView({ grade, theme }: { grade: Grade; theme?: Theme }) {
  const info = gradeInfo[grade]
  const all = useGradeActivities(grade)
  const items = useMemo(() => (all ? testItems(all, grade, theme?.slug) : null), [all, grade, theme])
  const themesWithTests = useMemo(() => (all ? testThemes(all, grade) : []), [all, grade])
  const [size, setSize] = useState<number>(TEST_SIZES[0])
  const [run, setRun] = useState(0)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null)
  const title = theme ? themeTestHeading(theme) : `${info.label} Matematik Testleri`

  const activity = useMemo<QuizActivity | null>(() => {
    if (!items || run === 0) return null
    return {
      id: `test-${grade}${theme ? `-${theme.slug}` : ''}`,
      type: 'quiz',
      outcomes: theme ? theme.outcomes.map((o) => o.code) : [],
      title,
      instructions: 'Doğru cevabı seç.',
      stage: 'sembol',
      launch: { text: '' },
      reflect: '',
      fixedOrder: true,
      questions: drawTest(items, size),
    }
  }, [items, run, size, grade, theme, title])
  const tracker = useMemo(() => new SessionTracker(activity?.id ?? 'test', title, 'etkinlik', grade), [activity, title, grade])

  useEffect(() => {
    if (!result) return
    sfx.win()
    if (result.correct / Math.max(1, result.total) >= 0.6) celebrate(true)
  }, [result])

  const start = () => {
    setResult(null)
    setProgress(0)
    setRun((r) => r + 1)
  }

  const relatedGuides = theme ? guides.filter((x) => x.outcomes.some((c) => theme.outcomes.some((o) => o.code === c))) : []
  const back = theme ? { to: testPath(grade), label: `${info.label} testleri` } : { to: TEST_PATH, label: 'Tüm testler' }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6" style={{ ['--grade' as string]: info.color }}>
      <nav className="mb-5 flex items-center justify-between gap-2">
        <Link to={back.to} className="inline-flex min-h-10 items-center gap-1 rounded-xl pr-3 text-sm font-extrabold text-ink-soft hover:text-ink">
          <ChevronLeft size={18} /> {back.label}
        </Link>
        <ShareButton title={title} />
      </nav>

      <header className="mb-6 rounded-3xl p-5 sm:p-7" style={{ background: info.soft }}>
        <p className="text-sm font-extrabold" style={{ color: info.ink }}>{info.label} · Online test · Cevaplı</p>
        <h1 className="mt-1 text-2xl leading-tight font-black text-ink sm:text-4xl">{title}</h1>
        <p className="mt-2 font-semibold text-ink-soft">
          {items ? `${items.length} soruluk havuzdan` : 'Soru havuzundan'} her seferinde karışık sorular. Yanlış cevapta kısa bir açıklama, ikinci yanlıştan sonra doğru cevap gösterilir.
        </p>
      </header>

      {!items ? (
        <Spinner />
      ) : activity && !result ? (
        <section aria-label="Test">
          <div className="mb-5 h-2 overflow-hidden rounded-full bg-line/60" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${progress * 100}%`, background: info.color }} />
          </div>
          <Suspense fallback={<Spinner />}>
            <TrackerProvider tracker={tracker}>
              <Quiz
                key={run}
                activity={activity}
                onProgress={(d, t) => setProgress(d / Math.max(1, t))}
                onFinish={(correct, total) => {
                  tracker.setTotals(total, correct)
                  setResult({ correct, total })
                }}
              />
            </TrackerProvider>
          </Suspense>
        </section>
      ) : result ? (
        <Finish result={result} color={info.color} tracker={tracker} onRestart={start} grade={grade} theme={theme} />
      ) : (
        <section className="rounded-3xl bg-white p-5 ring-1 ring-line sm:p-7">
          <p className="text-sm font-extrabold text-ink-soft">Kaç soru çözmek istersin?</p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Soru sayısı">
            {TEST_SIZES.filter((n, i) => i === 0 || n <= items.length).map((n) => (
              <button key={n} type="button" className="pill" aria-pressed={size === n} onClick={() => setSize(n)}>{Math.min(n, items.length)} soru</button>
            ))}
          </div>
          <button type="button" onClick={start} className="btn-primary mt-5 min-w-56 text-lg" disabled={!items.length}>
            <Play size={20} fill="currentColor" />Teste başla
          </button>
        </section>
      )}

      {!activity || result ? (
        <div className="mt-10 space-y-10">
          {!theme && themesWithTests.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-black">Konuya göre {info.label.toLocaleLowerCase('tr')} matematik testleri</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {themesWithTests.map(({ theme: t, count }) => (
                  <Link key={t.slug} to={testPath(grade, t.slug)} className="group flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-line transition hover:shadow-[var(--shadow-lift)]">
                    <ClipboardCheck size={22} className="shrink-0" style={{ color: info.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-extrabold text-ink">{themeKw(t)} testi</span>
                      <span className="block text-sm font-semibold text-ink-soft">{count} soru</span>
                    </span>
                    <ArrowRight size={18} className="shrink-0 text-ink-soft transition group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            </section>
          )}
          {theme && (
            <section>
              <h2 className="mb-3 text-lg font-black">Konuyu çalış</h2>
              <div className="flex flex-wrap gap-2">
                <Link to={`/sinif/${grade}/${theme.slug}`} className="btn-ghost min-h-10 px-3 text-sm"><LayoutGrid size={16} />{themeKw(theme)} etkinlikleri</Link>
                {relatedGuides.slice(0, 4).map((x) => (
                  <Link key={x.slug} to={`${GUIDES_PATH}/${x.slug}`} className="btn-ghost min-h-10 px-3 text-sm"><BookOpen size={16} />{x.title}</Link>
                ))}
              </div>
            </section>
          )}
          <nav aria-label="Diğer sınıflar" className="flex flex-wrap gap-1.5">
            {grades.map((x) => (
              <Link key={x} to={testPath(x)} aria-current={x === grade && !theme ? 'page' : undefined} className={`pill ${x === grade ? 'bg-ink text-white ring-ink hover:text-white' : ''}`}>{x}. sınıf testi</Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  )
}

function Finish({ result, color, tracker, onRestart, grade, theme }: { result: { correct: number; total: number }; color: string; tracker: SessionTracker; onRestart: () => void; grade: Grade; theme?: Theme }) {
  const ratio = result.correct / Math.max(1, result.total)
  const msg = ratio >= 0.9 ? 'Muhteşem!' : ratio >= 0.6 ? 'Çok iyi!' : 'Güzel çaba!'
  return (
    <section className="flex flex-col items-center rounded-3xl bg-white p-6 text-center ring-1 ring-line animate-fade-up sm:p-8">
      <p className="text-5xl font-black" style={{ color }}>{Math.round(ratio * 100)}<span className="text-2xl">/100</span></p>
      <h2 className="mt-2 text-3xl font-black">{msg}</h2>
      <p className="mt-1 font-bold text-ink-soft"><span style={{ color }}>{result.correct}</span> / {result.total} soruyu ilk denemede çözdün.</p>
      {ratio < 0.6 && (
        <p className="mt-3 max-w-lg text-sm font-semibold text-ink-soft">
          Zorlandığın sorular için {theme ? <Link to={`/sinif/${grade}/${theme.slug}`} className="font-extrabold text-brand hover:underline">konunun etkinliklerine</Link> : <Link to={`/sinif/${grade}`} className="font-extrabold text-brand hover:underline">{grade}. sınıf etkinliklerine</Link>} göz at; somut modellerle çalışmak testten daha hızlı öğretir.
        </p>
      )}
      <div className="mt-6 flex w-full justify-center">
        <SendReport tracker={tracker} compact />
      </div>
      <button type="button" onClick={onRestart} className="btn-primary mt-6 min-w-56"><RotateCcw size={18} />Yeni test (farklı sorular)</button>
    </section>
  )
}
