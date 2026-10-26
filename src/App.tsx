import { Suspense, lazy, useEffect } from 'react'
import { Route, Routes, useParams } from 'react-router-dom'
import { isGrade } from './data/curriculum'
import Layout from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import Home from './pages/Home'
import NotFound from './pages/NotFound'

const load = {
  theme: () => import('./pages/ThemePage'),
  activity: () => import('./pages/ActivityPage'),
  manipulatives: () => import('./pages/Manipulatives'),
  approach: () => import('./pages/Approach'),
  interactions: () => import('./pages/Interactions'),
  report: () => import('./pages/Report'),
  games: () => import('./pages/Games'),
  onlineLesson: () => import('./pages/OnlineLesson'),
}

const ThemePage = lazy(load.theme)
const ActivityPage = lazy(load.activity)
const ManipulativesIndex = lazy(() => load.manipulatives().then((m) => ({ default: m.ManipulativesIndex })))
const Approach = lazy(load.approach)
const ManipulativePage = lazy(() => load.manipulatives().then((m) => ({ default: m.ManipulativePage })))
const InteractionsIndex = lazy(() => load.interactions().then((m) => ({ default: m.InteractionsIndex })))
const InteractionPage = lazy(() => load.interactions().then((m) => ({ default: m.InteractionPage })))
const ReportView = lazy(() => load.report().then((m) => ({ default: m.ReportView })))
const GamesIndex = lazy(() => load.games().then((m) => ({ default: m.GamesIndex })))
const GamePage = lazy(() => load.games().then((m) => ({ default: m.GamePage })))
const OnlineLesson = lazy(load.onlineLesson)

/** Sayfa açıldıktan sonra, tarayıcı boştayken diğer sayfaların kodunu indir: menü geçişleri beklemeden açılır */
function usePrefetchPages() {
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    if (conn?.saveData || /2g/.test(conn?.effectiveType ?? '')) return
    const run = () => Object.values(load).forEach((l) => l().catch(() => {}))
    // Safari'de requestIdleCallback yok
    const idle = typeof window.requestIdleCallback === 'function'
    const id = idle ? window.requestIdleCallback(run, { timeout: 4000 }) : window.setTimeout(run, 2500)
    return () => (idle ? window.cancelIdleCallback(id) : window.clearTimeout(id))
  }, [])
}

/** /sinif/3 → o sınıfın etkinlikleriyle ana sayfa */
function GradePage() {
  const { grade } = useParams()
  return isGrade(Number(grade)) ? <Home /> : <NotFound />
}

const Loading = () => (
  <div className="grid h-[50vh] place-items-center">
    <span className="size-10 animate-spin rounded-full border-4 border-line border-t-brand" aria-label="Yükleniyor" />
  </div>
)

export default function App() {
  usePrefetchPages()
  return (
    <ErrorBoundary>
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="sinif/:grade" element={<GradePage />} />
          <Route path="sinif/:grade/:slug" element={<ThemePage />} />
          <Route path="etkinlik/:id" element={<ActivityPage />} />
          <Route path="manipulatifler" element={<ManipulativesIndex />} />
          <Route path="manipulatif/:tool" element={<ManipulativePage />} />
          <Route path="oyunlar" element={<GamesIndex />} />
          <Route path="oyun/:id" element={<GamePage />} />
          <Route path="yaklasim" element={<Approach />} />
          <Route path="online-ozel-ders" element={<OnlineLesson />} />
          <Route path="etkilesimler" element={<InteractionsIndex />} />
          <Route path="etkilesim/:id" element={<InteractionPage />} />
          <Route path="rapor" element={<ReportView />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
    </ErrorBoundary>
  )
}
