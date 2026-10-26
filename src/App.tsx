import { Suspense, lazy } from 'react'
import { Route, Routes, useParams } from 'react-router-dom'
import { isGrade } from './data/curriculum'
import Layout from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import Home from './pages/Home'
import NotFound from './pages/NotFound'

const ThemePage = lazy(() => import('./pages/ThemePage'))
const ActivityPage = lazy(() => import('./pages/ActivityPage'))
const ManipulativesIndex = lazy(() => import('./pages/Manipulatives').then((m) => ({ default: m.ManipulativesIndex })))
const Approach = lazy(() => import('./pages/Approach'))
const ManipulativePage = lazy(() => import('./pages/Manipulatives').then((m) => ({ default: m.ManipulativePage })))
const InteractionsIndex = lazy(() => import('./pages/Interactions').then((m) => ({ default: m.InteractionsIndex })))
const InteractionPage = lazy(() => import('./pages/Interactions').then((m) => ({ default: m.InteractionPage })))
const ReportView = lazy(() => import('./pages/Teacher').then((m) => ({ default: m.ReportView })))
const TeacherPanel = lazy(() => import('./pages/Teacher').then((m) => ({ default: m.TeacherPanel })))
const GamesIndex = lazy(() => import('./pages/Games').then((m) => ({ default: m.GamesIndex })))
const GamePage = lazy(() => import('./pages/Games').then((m) => ({ default: m.GamePage })))

const OnlineLesson = lazy(() => import('./pages/OnlineLesson'))

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
          <Route path="ogretmen" element={<TeacherPanel />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
    </ErrorBoundary>
  )
}
