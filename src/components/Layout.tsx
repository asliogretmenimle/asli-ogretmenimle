import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Blocks, ClipboardList, FlaskConical, Gamepad2, GraduationCap, Laptop, Menu, Volume2, VolumeX, X } from 'lucide-react'
import { setSound, soundOn } from '../lib/feedback'
import { ONLINE_LESSON_PATH, notFoundSeo, privateSeo, seoForPath } from '../lib/seo'
import { applySeo } from '../lib/seoHead'
import { cachedActivity } from '../data/activityStore'
import { gradeInfo, grades } from '../data/curriculum'
import { ErrorBoundary } from './ErrorBoundary'

export const PageLoading = () => (
  <div className="grid h-[50vh] place-items-center">
    <span className="size-10 animate-spin rounded-full border-4 border-line border-t-brand" aria-label="Yükleniyor" />
  </div>
)

export function Logo({ small }: { small?: boolean }) {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5" aria-label="Aslı Öğretmenimle ana sayfa">
      <img
        src="/logo-96.png"
        srcSet="/logo-96.png 1x, /logo-192.png 2x"
        alt=""
        width={small ? 36 : 44}
        height={small ? 36 : 44}
        className={`shrink-0 drop-shadow-sm ${small ? 'size-9' : 'size-10 sm:size-11'}`}
      />
      <span className="leading-none">
        <span className={`block font-black tracking-tight whitespace-nowrap text-ink ${small ? 'text-base' : 'text-base sm:text-xl'}`}>Aslı Öğretmenimle</span>
        {!small && <span className="mt-0.5 hidden text-xs font-bold text-ink-soft sm:block">Matematik oyunla öğrenilir</span>}
      </span>
    </Link>
  )
}

export function SoundToggle() {
  const [on, setOn] = useState(soundOn)
  return (
    <button
      type="button"
      onClick={() => { setSound(!on); setOn(!on) }}
      className="grid size-10 place-items-center rounded-xl text-ink-soft ring-1 ring-line transition hover:bg-white"
      aria-label={on ? 'Sesi kapat' : 'Sesi aç'}
      title={on ? 'Sesi kapat' : 'Sesi aç'}
    >
      {on ? <Volume2 size={19} /> : <VolumeX size={19} />}
    </button>
  )
}

function MobileMenu() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  return (
    <div className="flex items-center gap-1.5 md:hidden">
      <SoundToggle />
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menü" className="grid size-11 place-items-center rounded-xl bg-white text-ink ring-1 ring-line">
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      {open && (
        <div className="absolute inset-x-3 top-[calc(100%+6px)] z-40 rounded-2xl bg-white p-2 shadow-[var(--shadow-lift)] ring-1 ring-line animate-fade-up">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-extrabold ${isActive ? 'bg-brand-soft text-brand-ink' : 'text-ink hover:bg-paper'}`}>
              <n.icon size={20} />{n.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

const NAV = [
  { to: '/oyunlar', label: 'Oyunlar', icon: Gamepad2 },
  { to: '/etkilesimler', label: 'Keşif Atölyesi', icon: FlaskConical },
  { to: '/manipulatifler', label: 'Manipülatifler', icon: Blocks },
  { to: '/yaklasim', label: 'Yaklaşımımız', icon: GraduationCap },
  { to: ONLINE_LESSON_PATH, label: 'Online Ders', icon: Laptop },
  { to: '/ogretmen', label: 'Öğretmen', icon: ClipboardList },
]

export default function Layout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  const focusMode = pathname.startsWith('/etkinlik/') || pathname.startsWith('/oyun/') || pathname.startsWith('/etkilesim/')

  return (
    <div className="flex min-h-dvh flex-col">
      {!focusMode && (
        <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur-md">
          <div className="relative">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-4">
            <Logo />
            <nav className="hidden items-center gap-1 md:flex lg:gap-2" aria-label="Ana menü">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  aria-label={n.label}
                  title={n.label}
                  className={({ isActive }) => `inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 text-sm font-extrabold transition xl:px-3 ${isActive ? 'bg-brand text-white' : 'text-ink hover:bg-white'}`}
                >
                  <n.icon size={19} />
                  <span className="hidden xl:inline">{n.label}</span>
                </NavLink>
              ))}
              <SoundToggle />
            </nav>
            <MobileMenu />
          </div>
          </div>
        </header>
      )}
      <main className="flex-1">
        {/* Menü her zaman kalsın: sayfa yüklenirken ya da hata verirse yalnızca içerik alanı değişir */}
        <ErrorBoundary resetKey={pathname}>
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      {!focusMode && (
        <footer className="mt-12 border-t border-line bg-white/60">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-ink-soft sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <p className="font-extrabold text-ink">Aslı Öğretmenimle</p>
              <p className="mt-1">Aslı Öğretmen’in 1–8. sınıf matematik oyunları, etkinlikleri ve sanal manipülatifleri. Maarif Modeli öğretim programlarına uygun, Van de Walle’ün gelişimsel yaklaşımıyla hazırlanmıştır.</p>
              <p className="mt-2">
                <Link to={ONLINE_LESSON_PATH} className="font-extrabold text-brand hover:underline">Online birebir matematik özel ders</Link> · Hatay, Antakya, Samandağ
              </p>
            </div>
            <nav aria-label="Sınıflar">
              <p className="font-extrabold text-ink">Sınıflar</p>
              <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
                {grades.map((g) => (
                  <li key={g}><Link to={`/sinif/${g}`} className="inline-block py-0.5 font-bold hover:text-brand">{gradeInfo[g].label} Matematik</Link></li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Site">
              <p className="font-extrabold text-ink">Keşfet</p>
              <ul className="mt-1 space-y-1">
                {NAV.map((n) => (
                  <li key={n.to}><Link to={n.to} className="inline-block py-0.5 font-bold hover:text-brand">{n.label}</Link></li>
                ))}
              </ul>
            </nav>
          </div>
        </footer>
      )}
    </div>
  )
}

/** Başlık, açıklama, canonical ve yapılandırılmış veriyi yola göre günceller (bkz. lib/seo.ts) */
export function usePageTitle(title?: string) {
  const { pathname } = useLocation()
  useEffect(() => {
    const s = seoForPath(pathname, cachedActivity)
    if (!s) applySeo(title ? privateSeo(title, pathname) : notFoundSeo(pathname))
    else applySeo(s.noindex && title ? { ...s, title: privateSeo(title, pathname).title } : s)
  }, [pathname, title])
}
