import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Blocks, Gamepad2, GraduationCap, Volume2, VolumeX } from 'lucide-react'
import { setSound, soundOn } from '../lib/feedback'

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

export default function Layout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  const focusMode = pathname.startsWith('/etkinlik/') || pathname.startsWith('/oyun/')

  return (
    <div className="flex min-h-dvh flex-col">
      {!focusMode && (
        <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-4">
            <Logo />
            <nav className="flex items-center gap-1 sm:gap-2">
              <NavLink
                to="/yaklasim"
                className={({ isActive }) => `inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-extrabold transition sm:px-3 ${isActive ? 'bg-brand text-white' : 'text-ink hover:bg-white'}`}
                aria-label="Yaklaşımımız"
              >
                <GraduationCap size={18} />
                <span className="hidden md:inline">Yaklaşımımız</span>
              </NavLink>
              <NavLink
                to="/oyunlar"
                aria-label="Oyunlar"
                className={({ isActive }) => `inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-extrabold transition sm:px-3 ${isActive ? 'bg-brand text-white' : 'text-ink hover:bg-white'}`}
              >
                <Gamepad2 size={18} />
                <span className="hidden md:inline">Oyunlar</span>
              </NavLink>
              <NavLink
                to="/manipulatifler"
                aria-label="Manipülatifler"
                className={({ isActive }) => `inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-extrabold transition sm:px-3 ${isActive ? 'bg-brand text-white' : 'text-ink hover:bg-white'}`}
              >
                <Blocks size={18} />
                <span className="hidden md:inline">Manipülatifler</span>
              </NavLink>
              <SoundToggle />
            </nav>
          </div>
        </header>
      )}
      <main className="flex-1">
        <Outlet />
      </main>
      {!focusMode && (
        <footer className="mt-12 border-t border-line bg-white/60">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-center text-sm text-ink-soft sm:flex-row sm:text-left">
            <p><span className="font-extrabold text-ink">Aslı Öğretmenimle</span> · 1–8. sınıf matematik etkinlikleri</p>
            <p>Maarif Modeli öğretim programlarına uygun, Van de Walle’ün gelişimsel yaklaşımıyla hazırlanmıştır. <Link to="/yaklasim" className="font-extrabold text-brand hover:underline">Yaklaşımımız</Link></p>
          </div>
        </footer>
      )}
    </div>
  )
}

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Aslı Öğretmenimle` : 'Aslı Öğretmenimle — Matematik Oyunları ve Etkinlikleri'
  }, [title])
}
