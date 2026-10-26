import { Link } from 'react-router-dom'
import { usePageTitle } from '../components/Layout'

export default function NotFound() {
  usePageTitle('Sayfa bulunamadı')
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <p className="text-7xl" aria-hidden>🧭</p>
      <h1 className="mt-4 text-3xl font-black">Bu sayfa kaybolmuş!</h1>
      <p className="mt-2 font-semibold text-ink-soft">Aradığın etkinlik taşınmış ya da link hatalı olabilir.</p>
      <Link to="/" className="btn-primary mt-6">Ana sayfaya dön</Link>
    </div>
  )
}
