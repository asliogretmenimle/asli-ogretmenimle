/**
 * Yönetim paneli (/yonetim). Site ziyaretçileri bu parçayı indirmez.
 * Giriş: Supabase Auth (e-posta + şifre). Yetki: public.cms_admins tablosu.
 */
import { Suspense, lazy, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, NavLink, Route, Routes, matchPath, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import {
  BookOpen, ExternalLink, Gamepad2, GraduationCap, History, KeyRound, LayoutDashboard, Link2, LogOut, Menu, Puzzle, Search, Settings, ShieldCheck, Sparkles, X,
} from 'lucide-react'
import { ADMIN_PATH, cmsEnabled, SUPABASE_URL } from '../cms/config'
import { gradeInfo, grades } from '../data/curriculum'
import { sb } from './supabase'
import { loadEntries } from './api'
import { Button, Callout, Field, TextInput, UiProvider, cx } from './ui'
import { Dashboard } from './pages/Dashboard'
import { GradeView } from './pages/GradeView'
import { Library } from './pages/Library'
import { MetaEditorPage } from './editors/MetaEditor'
import { LinksPage } from './pages/Links'
import { SeoPage } from './pages/Seo'
import { HistoryPage } from './pages/History'
import { SettingsPage } from './pages/Settings'

const StudioHome = lazy(() => import('./studio/StudioHome').then((m) => ({ default: m.StudioHome })))
const StudioWorkspace = lazy(() => import('./studio/StudioWorkspace').then((m) => ({ default: m.StudioWorkspace })))
const ActivityEditorPage = lazy(() => import('./editors/ActivityEditor').then((m) => ({ default: m.ActivityEditorPage })))

const ADMIN = ADMIN_PATH

function useAdminHead() {
  useEffect(() => {
    const prev = document.title
    document.title = 'Yönetim Paneli · Aslı Öğretmenimle'
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    const old = robots?.content
    if (!robots) {
      robots = document.createElement('meta')
      robots.name = 'robots'
      document.head.appendChild(robots)
    }
    robots.content = 'noindex, nofollow'
    return () => {
      document.title = prev
      if (robots && old) robots.content = old
    }
  }, [])
}

export default function AdminApp() {
  useAdminHead()
  return (
    <UiProvider>
      <Gate />
    </UiProvider>
  )
}

type AuthState = { phase: 'loading' } | { phase: 'out' } | { phase: 'checking'; session: Session } | { phase: 'denied'; session: Session; canClaim: boolean } | { phase: 'in'; session: Session }

function Gate() {
  const [state, setState] = useState<AuthState>({ phase: 'loading' })

  useEffect(() => {
    if (!cmsEnabled) return
    const check = async (session: Session | null) => {
      if (!session) return setState({ phase: 'out' })
      setState({ phase: 'checking', session })
      const { data: ok } = await sb.rpc('is_cms_admin')
      if (ok) {
        setState({ phase: 'in', session })
        loadEntries(true).catch(() => {})
        return
      }
      const { data: has } = await sb.rpc('cms_has_admins')
      setState({ phase: 'denied', session, canClaim: has === false })
    }
    sb.auth.getSession().then(({ data }) => check(data.session))
    const { data: sub } = sb.auth.onAuthStateChange((ev, session) => {
      if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') check(session)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!cmsEnabled) return <SetupScreen />
  if (state.phase === 'loading' || state.phase === 'checking') return <FullSpinner />
  if (state.phase === 'out') return <LoginScreen />
  if (state.phase === 'denied') return <DeniedScreen session={state.session} canClaim={state.canClaim} onClaimed={() => setState({ phase: 'in', session: state.session })} />
  return <Shell email={state.session.user.email ?? ''} />
}

const FullSpinner = () => (
  <div className="grid h-dvh place-items-center bg-paper">
    <span className="size-10 animate-spin rounded-full border-4 border-line border-t-brand" aria-label="Yükleniyor" />
  </div>
)

function AuthFrame({ children, title, desc }: { children: ReactNode; title: string; desc?: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-[radial-gradient(ellipse_at_top,#fdeef3,transparent_60%)] bg-paper px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-black text-ink">
          <img src="/logo-96.png" alt="" width={40} height={40} className="size-10" />
          Aslı Öğretmenimle
        </Link>
        <div className="rounded-3xl bg-white p-6 shadow-[var(--shadow-lift)] ring-1 ring-line sm:p-8">
          <h1 className="text-xl font-black">{title}</h1>
          {desc && <p className="mt-1 text-sm font-semibold text-ink-soft">{desc}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}

function LoginScreen() {
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>('in')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'red' | 'green'; text: string } | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      if (mode === 'in') {
        const { error } = await sb.auth.signInWithPassword({ email, password: pw })
        if (error) throw error
      } else if (mode === 'up') {
        const { data, error } = await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: `${location.origin}${ADMIN}` } })
        if (error) throw error
        if (!data.session) setMsg({ tone: 'green', text: 'Hesap oluşturuldu. E-postanıza gelen bağlantıyla hesabı doğrulayıp giriş yapın.' })
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${ADMIN}` })
        if (error) throw error
        setMsg({ tone: 'green', text: 'Şifre sıfırlama bağlantısı e-postanıza gönderildi.' })
      }
    } catch (x) {
      const m = (x as Error).message
      setMsg({ tone: 'red', text: /Invalid login/i.test(m) ? 'E-posta ya da şifre hatalı.' : /Email not confirmed/i.test(m) ? 'E-posta adresi henüz doğrulanmadı.' : /least 6/i.test(m) ? 'Şifre en az 6 karakter olmalı.' : m })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame title={mode === 'in' ? 'Yönetim paneline giriş' : mode === 'up' ? 'Hesap oluştur' : 'Şifremi unuttum'} desc={mode === 'up' ? 'Hesabınız oluşturulduktan sonra panel sahibi sizi yönetici olarak eklemeli.' : 'Sitenin içeriklerini düzenlemek ve Stüdyo’yu kullanmak için giriş yapın.'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="E-posta">
          <TextInput type="email" autoComplete="email" required value={email} onChange={setEmail} placeholder="ornek@eposta.com" />
        </Field>
        {mode !== 'reset' && (
          <Field label="Şifre" action={mode === 'in' && <button type="button" onClick={() => setMode('reset')} className="text-xs font-bold text-brand hover:underline">Şifremi unuttum</button>}>
            <TextInput type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} required minLength={6} value={pw} onChange={setPw} placeholder="••••••••" />
          </Field>
        )}
        {msg && <Callout tone={msg.tone}>{msg.text}</Callout>}
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy} icon={<KeyRound size={18} />}>
          {mode === 'in' ? 'Giriş yap' : mode === 'up' ? 'Hesap oluştur' : 'Bağlantı gönder'}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm font-semibold text-ink-soft">
        {mode === 'in' ? (
          <>Hesabınız yok mu? <button type="button" onClick={() => setMode('up')} className="font-extrabold text-brand hover:underline">Hesap oluşturun</button></>
        ) : (
          <button type="button" onClick={() => setMode('in')} className="font-extrabold text-brand hover:underline">← Girişe dön</button>
        )}
      </p>
    </AuthFrame>
  )
}

function DeniedScreen({ session, canClaim, onClaimed }: { session: Session; canClaim: boolean; onClaimed: () => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const claim = async () => {
    setBusy(true)
    setErr(null)
    const { data, error } = await sb.rpc('claim_first_admin')
    setBusy(false)
    if (error) return setErr(/function .* does not exist|schema cache/i.test(error.message) ? 'Veritabanı tabloları henüz kurulmamış. supabase/migrations klasöründeki SQL dosyasını Supabase SQL Editor’de çalıştırın.' : error.message)
    if (data) {
      loadEntries(true).catch(() => {})
      onClaimed()
    } else setErr('Bu arada başka bir yönetici kurulumu tamamlamış. Sayfayı yenileyin.')
  }
  return (
    <AuthFrame title={canClaim ? 'Kurulumu tamamlayın' : 'Yetkiniz yok'} desc={session.user.email}>
      {canClaim ? (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-ink-soft">Panelde henüz hiç yönetici yok. Bu hesabı <strong className="text-ink">panel sahibi</strong> yapın; diğer öğretmenleri daha sonra Ayarlar’dan ekleyebilirsiniz.</p>
          {err && <Callout tone="red">{err}</Callout>}
          <Button variant="primary" size="lg" className="w-full" loading={busy} icon={<ShieldCheck size={18} />} onClick={claim}>
            Panel sahibi ol
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Callout tone="amber">Bu hesap yönetici değil. Panel sahibinden sizi <strong>Ayarlar → Yöneticiler</strong> bölümünden eklemesini isteyin, sonra sayfayı yenileyin.</Callout>
        </div>
      )}
      <Button variant="ghost" className="mt-4 w-full" icon={<LogOut size={16} />} onClick={() => sb.auth.signOut()}>
        Çıkış yap
      </Button>
    </AuthFrame>
  )
}

function SetupScreen() {
  return (
    <AuthFrame title="Panel kurulumu" desc="Supabase bağlantı anahtarı tanımlı değil.">
      <ol className="list-decimal space-y-3 pl-5 text-sm font-semibold text-ink-soft">
        <li>
          Supabase’de <strong className="text-ink">SQL Editor</strong>’ü açın ve <code className="rounded bg-paper px-1">supabase/migrations/…_cms.sql</code> dosyasını çalıştırın.
        </li>
        <li>
          <strong className="text-ink">Project Settings → API</strong> bölümünden <em>anon / publishable</em> anahtarını kopyalayın.
        </li>
        <li>
          Proje kökünde <code className="rounded bg-paper px-1">.env.local</code> dosyasına ve Vercel’de <em>Environment Variables</em>’a ekleyin:
          <pre className="mt-2 overflow-x-auto rounded-xl bg-ink p-3 text-xs text-white">{`VITE_SUPABASE_URL=${SUPABASE_URL}\nVITE_SUPABASE_ANON_KEY=…`}</pre>
        </li>
        <li>Siteyi yeniden başlatın / yayınlayın. Ayrıntılar: docs/yonetim-paneli.md</li>
      </ol>
    </AuthFrame>
  )
}

// ---------------------------------------------------------------------------
// Ana iskelet
// ---------------------------------------------------------------------------
interface NavItem {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
}

const NAV: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { to: ADMIN, label: 'Genel bakış', icon: <LayoutDashboard size={18} />, end: true },
      { to: `${ADMIN}/studyo`, label: 'Stüdyo', icon: <Sparkles size={18} /> },
    ],
  },
  {
    title: 'Kütüphane',
    items: [
      { to: `${ADMIN}/oyunlar`, label: 'Oyunlar', icon: <Gamepad2 size={18} /> },
      { to: `${ADMIN}/etkilesimler`, label: 'Etkileşimler', icon: <Sparkles size={18} className="opacity-70" /> },
      { to: `${ADMIN}/manipulatifler`, label: 'Manipülatifler', icon: <Puzzle size={18} /> },
      { to: `${ADMIN}/rehberler`, label: 'Konu anlatımları', icon: <BookOpen size={18} /> },
      { to: `${ADMIN}/baglantilar`, label: 'Dış bağlantılar', icon: <Link2 size={18} /> },
    ],
  },
  {
    title: 'Site',
    items: [
      { to: `${ADMIN}/seo`, label: 'Sayfa başlıkları (SEO)', icon: <Search size={18} /> },
      { to: `${ADMIN}/gecmis`, label: 'Değişiklik geçmişi', icon: <History size={18} /> },
      { to: `${ADMIN}/ayarlar`, label: 'Ayarlar', icon: <Settings size={18} /> },
    ],
  },
]

const navCls = ({ isActive }: { isActive: boolean }) =>
  cx('flex h-9 items-center gap-2.5 rounded-xl px-3 text-[14px] font-bold transition', isActive ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:bg-paper hover:text-ink')

function Sidebar({ email, onNavigate }: { email: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Link to={ADMIN} onClick={onNavigate} className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <img src="/logo-96.png" alt="" width={36} height={36} className="size-9" />
        <span className="leading-tight">
          <span className="block text-[15px] font-black">Aslı Öğretmenimle</span>
          <span className="block text-[11px] font-extrabold tracking-wide text-brand uppercase">Yönetim paneli</span>
        </span>
      </Link>
      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV.slice(0, 1).map((g, i) => (
          <div key={i} className="space-y-0.5">
            {g.items.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.end} className={navCls} onClick={onNavigate}>
                {it.icon}
                {it.label}
                {it.label === 'Stüdyo' && <span className="ml-auto rounded-full bg-brand px-1.5 py-px text-[10px] font-black text-white">AI</span>}
              </NavLink>
            ))}
          </div>
        ))}
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 px-3 text-[11px] font-black tracking-wider text-ink-soft/80 uppercase">
            <GraduationCap size={13} />
            Sınıflar
          </p>
          <div className="grid grid-cols-4 gap-1 px-1">
            {grades.map((g) => (
              <NavLink
                key={g}
                to={`${ADMIN}/sinif/${g}`}
                onClick={onNavigate}
                title={gradeInfo[g].label}
                className={({ isActive }) => cx('grid h-9 place-items-center rounded-xl text-sm font-black ring-1 transition', isActive ? 'text-white ring-transparent' : 'bg-white text-ink-soft ring-line hover:text-ink')}
                style={({ isActive }) => (isActive ? { background: gradeInfo[g].color } : undefined)}
              >
                {g}
              </NavLink>
            ))}
          </div>
        </div>
        {NAV.slice(1).map((g) => (
          <div key={g.title} className="space-y-0.5">
            <p className="mb-1.5 px-3 text-[11px] font-black tracking-wider text-ink-soft/80 uppercase">{g.title}</p>
            {g.items.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.end} className={navCls} onClick={onNavigate}>
                {it.icon}
                {it.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-line p-3">
        <a href="/" target="_blank" rel="noreferrer" className="flex h-9 items-center gap-2.5 rounded-xl px-3 text-sm font-bold text-ink-soft hover:bg-paper hover:text-ink">
          <ExternalLink size={16} />
          Siteyi görüntüle
        </a>
        <div className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-black text-brand-ink uppercase">{email.slice(0, 1)}</span>
          <span className="min-w-0 flex-1 truncate text-xs font-bold text-ink-soft" title={email}>
            {email}
          </span>
          <button type="button" onClick={() => sb.auth.signOut()} className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-paper hover:text-bad" aria-label="Çıkış yap" title="Çıkış yap">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

const Loading = () => (
  <div className="grid h-[50vh] place-items-center">
    <span className="size-9 animate-spin rounded-full border-4 border-line border-t-brand" aria-label="Yükleniyor" />
  </div>
)

function Shell({ email }: { email: string }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  // Stüdyo çalışma alanı tam ekran kullanır
  const bleed = !!matchPath(`${ADMIN}/studyo/:id`, pathname)
  useEffect(() => setOpen(false), [pathname])

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-line bg-white lg:block">
        <Sidebar email={email} />
      </aside>

      {/* Mobil üst çubuk */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-xl ring-1 ring-line" aria-label="Menüyü aç">
          <Menu size={20} />
        </button>
        <span className="font-black">Yönetim paneli</span>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[284px] bg-white shadow-2xl animate-fade-up">
            <button type="button" onClick={() => setOpen(false)} className="absolute top-4 right-3 grid size-9 place-items-center rounded-xl text-ink-soft hover:bg-paper" aria-label="Menüyü kapat">
              <X size={18} />
            </button>
            <Sidebar email={email} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <main className="lg:pl-[264px]">
        <div className={bleed ? '' : 'mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8'}>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="studyo" element={<StudioHome />} />
              <Route path="studyo/:id" element={<StudioWorkspace />} />
              <Route path="sinif/:grade" element={<GradeView />} />
              <Route path="oyunlar" element={<Library kind="game" />} />
              <Route path="etkilesimler" element={<Library kind="interaction" />} />
              <Route path="manipulatifler" element={<Library kind="manipulative" />} />
              <Route path="rehberler" element={<Library kind="guide" />} />
              <Route path="baglantilar" element={<LinksPage />} />
              <Route path="seo" element={<SeoPage />} />
              <Route path="gecmis" element={<HistoryPage />} />
              <Route path="ayarlar" element={<SettingsPage email={email} />} />
              <Route path="duzenle/activity/:ref" element={<ActivityEditorPage />} />
              <Route path="yeni/activity" element={<ActivityEditorPage />} />
              <Route path="duzenle/:kind/:ref" element={<MetaEditorPage />} />
              <Route path="yeni/:kind" element={<MetaEditorPage />} />
              <Route path="*" element={<NotFoundAdmin />} />
            </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  )
}

function NotFoundAdmin() {
  return (
    <div className="grid h-[50vh] place-items-center text-center">
      <div>
        <p className="text-lg font-black">Sayfa bulunamadı</p>
        <Link to={ADMIN} className="mt-2 inline-block font-bold text-brand hover:underline">
          Genel bakışa dön
        </Link>
      </div>
    </div>
  )
}
