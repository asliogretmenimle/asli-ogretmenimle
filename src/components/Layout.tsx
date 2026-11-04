import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ChevronDown, Menu, Search, Volume2, VolumeX, X } from 'lucide-react'
import { setSound, soundOn } from '../lib/feedback'
import { GUIDES_PATH, ONLINE_LESSON_PATH, notFoundSeo, privateSeo, seoForPath } from '../lib/seo'
import { applySeo } from '../lib/seoHead'
import { seoArticleFor } from '../lib/seoArticle'
import { cachedActivity } from '../data/activityStore'
import { gradeInfo, grades } from '../data/curriculum'
import { ErrorBoundary } from './ErrorBoundary'
import { SearchDialog, useSearchShortcut } from './SearchDialog'

export const PageLoading = () => (
  <div className="grid h-[50vh] place-items-center">
    <span className="size-10 animate-spin rounded-full border-4 border-line border-t-brand" aria-label="Yükleniyor" />
  </div>
)

export function Logo({ small }: { small?: boolean }) {
  return (
    <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2.5" aria-label="Aslı Öğretmenimle ana sayfa">
      <img
        src="/logo-96.png"
        srcSet="/logo-96.png 1x, /logo-192.png 2x"
        alt=""
        width={small ? 32 : 38}
        height={small ? 32 : 38}
        className={`shrink-0 ${small ? 'size-8' : 'size-9 sm:size-[38px]'}`}
      />
      <span className="leading-none">
        <span className={`block font-extrabold tracking-tight whitespace-nowrap text-ink ${small ? 'text-base' : 'text-base sm:text-lg'}`}>Aslı Öğretmenimle</span>
        {!small && <span className="mt-0.5 hidden text-xs font-semibold text-ink-soft sm:block">1–8. sınıf matematik</span>}
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

/** Ana bölümler: menüde, mobil menüde ve alt bilgide aynı sırayla */
const NAV = [
  { to: '/oyunlar', label: 'Oyunlar' },
  { to: '/etkilesimler', label: 'Etkileşimler' },
  { to: '/manipulatifler', label: 'Manipülatifler' },
  { to: GUIDES_PATH, label: 'Konu Anlatımı' },
]
const MORE = [
  { to: '/yaklasim', label: 'Yaklaşımımız' },
  { to: ONLINE_LESSON_PATH, label: 'Online Özel Ders' },
]

const navClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-10 items-center rounded-lg px-3 text-[15px] font-bold transition ${isActive ? 'bg-paper text-ink' : 'text-ink-soft hover:bg-paper hover:text-ink'}`

/** Sınıf bağlantıları: ilkokul ve ortaokul iki satır */
function GradeLinks({ onPick }: { onPick?: () => void }) {
  return (
    <div className="grid gap-3">
      {(['ilkokul', 'ortaokul'] as const).map((level) => (
        <div key={level}>
          <p className="mb-1.5 text-xs font-bold text-ink-soft">{level === 'ilkokul' ? 'İlkokul' : 'Ortaokul'}</p>
          <div className="grid grid-cols-4 gap-1.5">
            {grades.filter((g) => gradeInfo[g].level === level).map((g) => (
              <NavLink key={g} to={`/sinif/${g}`} onClick={onPick} className={({ isActive }) => `grid h-11 place-items-center rounded-lg text-sm font-bold ring-1 transition ${isActive ? 'bg-ink text-white ring-ink' : 'text-ink ring-line hover:bg-paper'}`}>
                {g}. Sınıf
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function GradesMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={navClass({ isActive: open || pathname.startsWith('/sinif/') })}>
        Sınıflar <ChevronDown size={16} className={`ml-1 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-[calc(100%+8px)] left-0 z-40 w-80 rounded-2xl bg-white p-4 shadow-[var(--shadow-lift)] ring-1 ring-line animate-fade-up">
          <GradeLinks onPick={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}

function MobileMenu({ onSearch }: { onSearch: () => void }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  return (
    <div className="flex items-center gap-1.5 lg:hidden">
      <button type="button" onClick={onSearch} aria-label="Ara" className="grid size-11 place-items-center rounded-xl text-ink ring-1 ring-line">
        <Search size={20} />
      </button>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menü" className="grid size-11 place-items-center rounded-xl text-ink ring-1 ring-line">
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      {open && (
        <div className="absolute inset-x-3 top-[calc(100%+6px)] z-40 max-h-[80vh] overflow-y-auto rounded-2xl bg-white p-4 shadow-[var(--shadow-lift)] ring-1 ring-line animate-fade-up">
          <GradeLinks />
          <div className="mt-4 grid gap-1 border-t border-line pt-3">
            {[...NAV, ...MORE].map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `flex min-h-11 items-center rounded-lg px-3 text-base font-bold ${isActive ? 'bg-paper text-ink' : 'text-ink-soft'}`}>
                {n.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Önceden üretilmiş sayfa bilgisini (örnek sorular, bağlantılar) React içeriğinin altına geri koyar (bkz. lib/seoArticle.ts) */
function SeoArticleSlot() {
  const ref = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  useEffect(() => {
    const n = seoArticleFor(pathname)
    if (!n || !ref.current) return
    ref.current.appendChild(n)
    return () => n.remove()
  }, [pathname])
  return <div ref={ref} />
}

export default function Layout() {
  const { pathname } = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)
  const openSearch = useCallback(() => setSearchOpen(true), [])
  useSearchShortcut(openSearch)
  useEffect(() => {
    window.scrollTo({ top: 0 })
    setSearchOpen(false)
  }, [pathname])
  const focusMode = pathname.startsWith('/etkinlik/') || pathname.startsWith('/oyun/') || pathname.startsWith('/etkilesim/')

  return (
    <div className="flex min-h-dvh flex-col">
      {!focusMode && (
        <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
          <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
            <Logo />
            <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Ana menü">
              <GradesMenu />
              {NAV.map((n) => <NavLink key={n.to} to={n.to} className={navClass}>{n.label}</NavLink>)}
            </nav>
            <div className="ml-auto hidden items-center gap-2 lg:flex">
              <button type="button" onClick={openSearch} className="flex h-10 w-56 items-center gap-2 rounded-xl bg-paper px-3 text-sm font-semibold text-ink-soft ring-1 ring-line transition hover:ring-ink-soft/40 xl:w-64">
                <Search size={17} />Ara…
                <kbd className="ml-auto rounded-md bg-white px-1.5 py-0.5 font-sans text-[11px] font-bold ring-1 ring-line">Ctrl K</kbd>
              </button>
            </div>
            <div className="ml-auto lg:hidden" />
            <MobileMenu onSearch={openSearch} />
          </div>
        </header>
      )}
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <main className="flex-1">
        {/* Menü her zaman kalsın: sayfa yüklenirken ya da hata verirse yalnızca içerik alanı değişir */}
        <ErrorBoundary resetKey={pathname}>
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <SeoArticleSlot />
      {!focusMode && (
        <footer className="mt-16 border-t border-line bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-ink-soft sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <Logo small />
              <p className="mt-3 max-w-sm">1–8. sınıf matematik oyunları, etkileşimleri ve sanal manipülatifleri. Maarif Modeli öğretim programlarına uygun, Van de Walle’ün gelişimsel yaklaşımıyla hazırlanmıştır.</p>
              <p className="mt-2">
                <Link to={ONLINE_LESSON_PATH} className="font-bold text-ink hover:text-brand">Online birebir matematik özel ders</Link> · Hatay, Antakya, Samandağ
              </p>
            </div>
            <nav aria-label="Sınıflar">
              <p className="font-bold text-ink">Sınıflar</p>
              <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {grades.map((g) => (
                  <li key={g}><Link to={`/sinif/${g}`} className="hover:text-ink">{gradeInfo[g].label} Matematik</Link></li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Site">
              <p className="font-bold text-ink">Bölümler</p>
              <ul className="mt-2 space-y-1.5">
                {[...NAV, ...MORE].map((n) => (
                  <li key={n.to}><Link to={n.to} className="hover:text-ink">{n.label}</Link></li>
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
    // Etkinlik verisi henüz yüklenmedi: önceden üretilmiş <head>'i bırak (yoksa tarayıcı/Googlebot bir an noindex görür)
    if (!s && title === undefined) return
    if (!s) applySeo(title ? privateSeo(title, pathname) : notFoundSeo(pathname))
    else applySeo(s.noindex && title ? { ...s, title: privateSeo(title, pathname).title } : s)
  }, [pathname, title])
}
