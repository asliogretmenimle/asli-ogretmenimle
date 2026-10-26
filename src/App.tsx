import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import Layout from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import Home from './pages/Home'
import NotFound from './pages/NotFound'

const ThemePage = lazy(() => import('./pages/ThemePage'))
const ActivityPage = lazy(() => import('./pages/ActivityPage'))
const ManipulativesIndex = lazy(() => import('./pages/Manipulatives').then((m) => ({ default: m.ManipulativesIndex })))
const ManipulativePage = lazy(() => import('./pages/Manipulatives').then((m) => ({ default: m.ManipulativePage })))

function GradeRedirect() {
  const { grade } = useParams()
  return <Navigate to={`/?sinif=${grade}`} replace />
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
          <Route path="sinif/:grade" element={<GradeRedirect />} />
          <Route path="sinif/:grade/:slug" element={<ThemePage />} />
          <Route path="etkinlik/:id" element={<ActivityPage />} />
          <Route path="manipulatifler" element={<ManipulativesIndex />} />
          <Route path="manipulatif/:tool" element={<ManipulativePage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
    </ErrorBoundary>
  )
}
