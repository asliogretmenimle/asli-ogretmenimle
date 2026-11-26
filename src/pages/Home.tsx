import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Blocks, BookOpen, Gamepad2, Search, Telescope, X } from 'lucide-react'
import { gradeInfo, grades, isGrade } from '../data/curriculum'
import type { Grade } from '../data/types'
import { usePageTitle } from '../components/Layout'
import { CardGrid, ItemCard, SectionTitle, categoryTint, gradeRange } from '../components/Catalog'
import { stageMeta } from '../components/meta'
import { STAGE_ORDER } from '../data/activityStore'
import { gradePlan } from '../data/gradePlan'
import { toolMeta, toolMetaById, type ToolMeta } from '../manipulatives/meta'
import { gameMeta, gameMetaById, type GameId, type GameMeta } from '../games/meta'
import { interactionById, interactionMeta } from '../interactions/meta'
import type { InteractionMeta } from '../interactions/types'
import { guides } from '../data/guides'
import { GUIDES_PATH, ONLINE_LESSON_PATH } from '../lib/seo'
import { useSiteSearch } from '../lib/siteSearch'
import { usePageContent } from '../cms/pageContent'
import { HOME_SECTIONS, HOME_VARIANTS, homePage, type HomeContent, type HomeSectionId, type HomeVariant } from '../cms/pages/home'
import type { SectionToggle } from '../cms/pages/types'
import { GRADE_KEY } from './Grade'

// ---------------------------------------------------------------------------
// Panel verisini güvenli hâle getirme (eksik dizi, bilinmeyen kimlik, bozuk değer)
// ---------------------------------------------------------------------------
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : [])
const objs = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as T[]) : [])
const txt = (v: unknown, d = '') => (typeof v === 'string' ? v : d)
const num = (v: unknown, d: number) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.min(12, Math.round(n)) : d
}

function useHomeContent() {
  const c = usePageContent(homePage) as HomeContent
  const variant: HomeVariant = (HOME_VARIANTS as readonly string[]).includes(c.variant) ? (c.variant as HomeVariant) : 'klasik'
  // Bilinmeyenleri at, tanımda olup kayıtta olmayanları varsayılan görünürlükle sona ekle
  const saved = objs<SectionToggle>(c.sections).filter((s) => (HOME_SECTIONS as readonly string[]).includes(s.id))
  const sections = [
    ...saved,
    ...homePage.defaults.sections.filter((d) => !saved.some((s) => s.id === d.id)),
  ]
    .filter((s) => s.visible !== false)
    .map((s) => s.id as HomeSectionId)
  return { c, variant, sections }
}

const isPath = (p: string) => p.startsWith('/') || /^https?:\/\//.test(p)

export default function Home() {
  const [params, setParams] = useSearchParams()
  const q = params.get('ara') ?? ''
  const navigate = useNavigate()
  const { c, variant, sections } = useHomeContent()
  usePageTitle()

  // Eski ?sinif=3 linkleri kalıcı adrese: /sinif/3
  const legacy = Number(params.get('sinif'))
  useEffect(() => {
    if (isGrade(legacy) && !q && !params.has('onizleme')) navigate(`/sinif/${legacy}`, { replace: true })
  }, [legacy, q, navigate, params])

  const setQuery = (v: string) => {
    const p = new URLSearchParams(params)
    if (v) p.set('ara', v)
    else p.delete('ara')
    setParams(p, { replace: true })
  }

  const heroProps = { c, q, setQuery }
  return (
    <div>
      {variant === 'odak' ? <HeroFocus {...heroProps} /> : variant === 'vitrin' ? <HeroShowcase {...heroProps} /> : variant === 'ogretmen' ? <HeroTeacher {...heroProps} /> : <HeroClassic {...heroProps} />}
      {q ? <SearchResults q={q} /> : <Landing c={c} sections={sections} variant={variant} />}
    </div>
  )
}

interface HeroProps {
  c: HomeContent
  q: string
  setQuery: (v: string) => void
}

// ---------------------------------------------------------------------------
// Ortak karşılama parçaları
// ---------------------------------------------------------------------------
function Title({ c, className }: { c: HomeContent; className: string }) {
  const before = txt(c.titleBefore)
  const hi = txt(c.titleHighlight)
  const after = txt(c.titleAfter)
  return (
    <h1 className={className}>
      {before}
      {before && hi ? ' ' : ''}
      {hi && <span className="bg-[linear-gradient(transparent_60%,#f9d6e3_60%)] px-0.5">{hi}</span>}
      {after ? ` ${after}` : ''}
    </h1>
  )
}

function SearchBox({ c, q, setQuery, className = '' }: HeroProps & { className?: string }) {
  return (
    <label className={`relative block ${className}`}>
      <Search className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-soft" size={20} />
      <input
        type="search"
        value={q}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={txt(c.searchPlaceholder, 'Ne arıyorsunuz?')}
        className="h-14 w-full rounded-2xl bg-white pr-12 pl-12 text-base font-semibold shadow-[var(--shadow-lift)] ring-1 ring-line outline-none placeholder:text-ink-soft/60 focus:ring-2 focus:ring-brand"
        aria-label="Sitede ara"
      />
      {q && (
        <button type="button" onClick={() => setQuery('')} className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink-soft hover:bg-paper" aria-label="Aramayı temizle">
          <X size={18} />
        </button>
      )}
    </label>
  )
}

function PopularSearches({ c, setQuery, center }: { c: HomeContent; setQuery: (v: string) => void; center?: boolean }) {
  const words = strs(c.popularSearches)
  if (!words.length) return null
  return (
    <p className={`mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-soft ${center ? 'justify-center' : ''}`}>
      Sık arananlar:
      {words.map((w) => (
        <button key={w} type="button" onClick={() => setQuery(w)} className="rounded-full bg-white/80 px-3 py-1 font-bold text-ink ring-1 ring-line transition hover:ring-ink-soft/40">{w}</button>
      ))}
    </p>
  )
}

function Badge({ c, center, photo = true }: { c: HomeContent; center?: boolean; photo?: boolean }) {
  const badge = txt(c.badge)
  if (!badge) return null
  return (
    <p className={`inline-flex items-center gap-2 rounded-full bg-white/80 py-1 pr-3 pl-1 text-sm font-bold text-ink-soft ring-1 ring-line backdrop-blur ${center ? 'mx-auto' : ''}`}>
      {photo && <img src="/asli-220.webp" alt="" width={28} height={28} className="size-7 rounded-full lg:hidden" />}
      <span className={`size-2 rounded-full bg-ok ${photo ? 'hidden lg:ml-2 lg:block' : 'ml-2'}`} aria-hidden />
      {badge}
    </p>
  )
}

/** Panelde yazılan düğme bağlantısı: site içi ise Link */
function CtaLink({ to, children, className }: { to: string; children: ReactNode; className: string }) {
  if (/^https?:\/\//.test(to)) return <a href={to} className={className} target="_blank" rel="noopener">{children}</a>
  return <Link to={to} className={className}>{children}</Link>
}

const GridTexture = () => (
  <>
    {/* Kareli defter dokusu ve iki yumuşak renk lekesi */}
    <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#eef0f5_1px,transparent_1px),linear-gradient(to_bottom,#eef0f5_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_75%_45%,black_10%,transparent_70%)]" />
    <div aria-hidden className="pointer-events-none absolute -top-40 -right-32 size-[520px] rounded-full bg-brand-soft opacity-80 blur-3xl" />
    <div aria-hidden className="pointer-events-none absolute -bottom-48 -left-40 size-[440px] rounded-full bg-[#eaf1ff] opacity-80 blur-3xl" />
  </>
)

// ---------------------------------------------------------------------------
// 1) Klasik: solda başlık ve arama, sağda Aslı Öğretmen
// ---------------------------------------------------------------------------
function HeroClassic(p: HeroProps) {
  const { c, q } = p
  return (
    <section className="relative overflow-hidden border-b border-line bg-white">
      <GridTexture />
      <div className={`relative mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-[1.1fr_1fr] ${q ? 'py-8 sm:py-10' : 'py-10 sm:py-16'}`}>
        <div>
          <Badge c={c} />
          <Title c={c} className="mt-5 text-[32px] leading-[1.15] font-extrabold tracking-tight text-ink sm:text-5xl" />
          {txt(c.subtitle) && <p className="mt-4 max-w-xl text-base font-semibold text-ink-soft sm:text-lg">{txt(c.subtitle)}</p>}
          <SearchBox {...p} className="mt-7 max-w-xl" />
          {!q && <PopularSearches c={c} setQuery={p.setQuery} />}
        </div>
        {!q && <HeroArt />}
      </div>
    </section>
  )
}

/** Sağ taraf: Aslı Öğretmen ve çevresinde birkaç materyal kartı (yalnızca geniş ekranda) */
function HeroArt() {
  const chips = [
    { id: 'fractions' as const, cls: 'top-6 left-2', delay: '0s' },
    { id: 'angle' as const, cls: 'top-2 right-4', delay: '-2.5s' },
    { id: 'base10' as const, cls: 'bottom-24 -right-2', delay: '-4s' },
  ]
  return (
    <div className="relative mx-auto hidden h-[400px] w-full max-w-[460px] lg:block" aria-hidden>
      <svg viewBox="0 0 400 400" className="absolute inset-0 m-auto size-[360px] text-brand/40">
        <circle cx="200" cy="200" r="176" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 10" strokeLinecap="round" />
      </svg>
      <img src="/asli-400.webp" alt="" width={300} height={300} className="absolute inset-0 m-auto size-[300px] rounded-full shadow-[var(--shadow-lift)]" />
      {chips.map((ch) => {
        const t = toolMetaById[ch.id]
        if (!t) return null
        return (
          <Link key={ch.id} to={`/manipulatif/${ch.id}`} tabIndex={-1} className={`absolute flex items-center gap-2 rounded-2xl bg-white py-2 pr-4 pl-2 text-sm font-bold text-ink shadow-[var(--shadow-lift)] ring-1 ring-line animate-float ${ch.cls}`} style={{ animationDelay: ch.delay }}>
            <span className="grid size-8 place-items-center rounded-xl bg-paper text-lg">{t.emoji}</span>{t.name}
          </Link>
        )
      })}
      <div className="absolute bottom-4 left-0 rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow-lift)] ring-1 ring-line animate-float" style={{ animationDelay: '-1.2s' }}>
        <p className="text-xs font-bold text-ink-soft">Merhaba, ben Aslı Öğretmen</p>
        <p className="mt-0.5 text-sm font-extrabold text-ink">{gameMeta.length} oyun · {toolMeta.length} materyal</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 2) Odak: ortada sade arama, altında hızlı sınıf seçimi
// ---------------------------------------------------------------------------
function HeroFocus(p: HeroProps) {
  const { c, q } = p
  return (
    <section className="relative overflow-hidden border-b border-line bg-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e3e6ee_1px,transparent_1px)] bg-[size:22px_22px] [mask-image:radial-gradient(ellipse_at_50%_40%,black_20%,transparent_72%)]" />
      <div aria-hidden className="pointer-events-none absolute -top-56 left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-brand-soft opacity-70 blur-3xl" />
      <div className={`relative mx-auto max-w-3xl px-4 text-center ${q ? 'py-8 sm:py-10' : 'py-12 sm:py-20'}`}>
        <div className="flex justify-center">
          <Badge c={c} center photo={false} />
        </div>
        <Title c={c} className="mt-5 text-[30px] leading-[1.15] font-extrabold tracking-tight text-ink sm:text-[44px]" />
        {txt(c.subtitle) && !q && <p className="mx-auto mt-4 max-w-2xl text-base font-semibold text-ink-soft sm:text-lg">{txt(c.subtitle)}</p>}
        <SearchBox {...p} className="mx-auto mt-7 max-w-2xl text-left" />
        {!q && <PopularSearches c={c} setQuery={p.setQuery} center />}
        {!q && (
          <nav aria-label="Sınıflar" className="mt-8">
            <p className="mb-3 text-xs font-extrabold tracking-wider text-ink-soft uppercase">Hızlı sınıf seçimi</p>
            <ul className="mx-auto grid max-w-xl grid-cols-4 gap-2 sm:grid-cols-8">
              {grades.map((g) => (
                <li key={g}>
                  <Link
                    to={`/sinif/${g}`}
                    aria-label={`${gradeInfo[g].label} matematik`}
                    className="grid h-14 place-items-center rounded-2xl text-xl font-extrabold sm:h-auto sm:aspect-square ring-1 ring-black/[0.04] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
                    style={{ background: gradeInfo[g].soft, color: gradeInfo[g].ink }}
                  >
                    {g}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// 3) Vitrin: başlık + arama solda, sağda öne çıkan içerik mozaiği
// ---------------------------------------------------------------------------
function HeroShowcase(p: HeroProps) {
  const { c, q } = p
  const g = featuredGames(c)[0]
  const i = featuredInteractions(c)[0]
  const t = featuredTools(c)[0]
  const cta = txt(c.heroCtaLabel)
  const ctaPath = txt(c.heroCtaPath)
  return (
    <section className="relative overflow-hidden border-b border-line bg-[linear-gradient(160deg,#fdeef3_0%,#ffffff_45%,#eef3fd_100%)]">
      <div className={`relative mx-auto grid max-w-6xl items-center gap-8 px-4 lg:grid-cols-[1fr_1.05fr] ${q ? 'py-8 sm:py-10' : 'py-10 sm:py-14'}`}>
        <div>
          <Badge c={c} />
          <Title c={c} className="mt-5 text-[30px] leading-[1.15] font-extrabold tracking-tight text-ink sm:text-[44px]" />
          {txt(c.subtitle) && <p className="mt-4 max-w-xl text-base font-semibold text-ink-soft sm:text-lg">{txt(c.subtitle)}</p>}
          <SearchBox {...p} className="mt-7 max-w-xl" />
          {!q && <PopularSearches c={c} setQuery={p.setQuery} />}
          {!q && cta && isPath(ctaPath) && (
            <CtaLink to={ctaPath} className="mt-6 inline-flex items-center gap-1.5 text-sm font-extrabold text-brand-ink hover:underline">
              {cta} <ArrowRight size={15} />
            </CtaLink>
          )}
        </div>
        {!q && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {g && (
              <ShowcaseTile to={`/oyun/${g.id}`} emoji={g.emoji} label="Oyun" title={g.name} desc={g.description} tint={`${g.color}1f`} className="col-span-2 sm:min-h-44" big />
            )}
            {i && <ShowcaseTile to={`/etkilesim/${i.id}`} emoji={i.emoji} label="Etkileşim" title={i.name} desc={i.description} tint={categoryTint[i.category]} />}
            {t && <ShowcaseTile to={`/manipulatif/${t.id}`} emoji={t.emoji} label="Manipülatif" title={t.name} desc={t.description} tint={categoryTint[t.category]} />}
          </div>
        )}
      </div>
    </section>
  )
}

function ShowcaseTile({ to, emoji, label, title, desc, tint, className = '', big }: { to: string; emoji: string; label: string; title: string; desc: string; tint?: string; className?: string; big?: boolean }) {
  return (
    <Link to={to} className={`group relative flex overflow-hidden rounded-3xl bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] sm:p-5 ${big ? 'flex-row items-center gap-4' : 'flex-col'} ${className}`}>
      <span className={`grid shrink-0 place-items-center rounded-2xl transition duration-300 group-hover:scale-105 ${big ? 'size-20 text-5xl sm:size-24 sm:text-6xl' : 'size-14 text-4xl'}`} style={{ background: tint ?? '#f2f4f8' }} aria-hidden>
        {emoji}
      </span>
      <span className={`min-w-0 ${big ? '' : 'mt-3'}`}>
        <span className="text-[11px] font-black tracking-wider text-brand uppercase">{label}</span>
        <span className={`block leading-snug font-extrabold text-ink ${big ? 'text-lg sm:text-xl' : 'text-[15px]'}`}>{title}</span>
        <span className={`mt-1 text-xs font-semibold text-ink-soft sm:text-sm ${big ? 'line-clamp-2' : 'line-clamp-2 max-sm:hidden'}`}>{desc}</span>
      </span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// 4) Öğretmen: büyük fotoğraf, sıcak karşılama, özel ders çağrısı
// ---------------------------------------------------------------------------
function HeroTeacher(p: HeroProps) {
  const { c, q } = p
  const cta = txt(c.heroCtaLabel)
  const ctaPath = txt(c.heroCtaPath)
  return (
    <section className="relative overflow-hidden border-b border-line bg-cream">
      <div aria-hidden className="pointer-events-none absolute -top-32 -left-24 size-[420px] rounded-full bg-brand-soft opacity-90 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-40 size-[380px] rounded-full bg-[#fff0d9] opacity-90 blur-3xl" />
      <div className={`relative mx-auto grid max-w-6xl items-center gap-8 px-4 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12 ${q ? 'py-8 sm:py-10' : 'py-10 sm:py-16'}`}>
        {!q && (
          <div className="relative mx-auto w-full max-w-[220px] sm:max-w-[320px] lg:max-w-[400px]">
            <svg viewBox="0 0 400 400" aria-hidden className="absolute -inset-[8%] text-brand/40">
              <circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 10" strokeLinecap="round" />
            </svg>
            <img src="/asli-400.webp" alt="Aslı Öğretmen" width={400} height={400} className="relative aspect-square w-full rounded-full object-cover shadow-[var(--shadow-lift)] ring-8 ring-white" />
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-2xl bg-white px-3 py-2 text-center whitespace-nowrap shadow-[var(--shadow-lift)] ring-1 ring-line sm:px-4 sm:py-2.5">
              <p className="text-xs font-extrabold text-ink sm:text-sm">{gameMeta.length} oyun · {toolMeta.length} materyal<span className="hidden sm:inline"> · {interactionMeta.filter((m) => m.ready).length} etkileşim</span></p>
            </div>
          </div>
        )}
        <div className={q ? 'lg:col-span-2' : ''}>
          {!q && txt(c.teacherGreeting) && <p className="mt-4 text-lg lg:mt-0 font-extrabold text-brand-ink sm:text-xl">{txt(c.teacherGreeting)} 👋</p>}
          <Title c={c} className="mt-2 text-[28px] leading-[1.2] font-extrabold tracking-tight text-ink sm:text-[40px]" />
          {!q && txt(c.teacherIntro) && <p className="mt-4 max-w-xl text-base font-semibold text-ink-soft sm:text-lg">{txt(c.teacherIntro)}</p>}
          <SearchBox {...p} className="mt-6 max-w-xl" />
          {!q && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {cta && isPath(ctaPath) && (
                <CtaLink to={ctaPath} className="btn-primary shadow-[0_4px_0_var(--color-brand-dark)]">
                  {cta} <ArrowRight size={17} />
                </CtaLink>
              )}
              <a href="#siniflar" className="btn-ghost bg-white">Sınıfını seç</a>
            </div>
          )}
          {!q && txt(c.badge) && <p className="mt-5 text-sm font-bold text-ink-soft">✓ {txt(c.badge)}</p>}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Öne çıkan içerik seçimi
// ---------------------------------------------------------------------------
function featuredGames(c: HomeContent): GameMeta[] {
  const ids = strs(c.gameIds)
  const n = num(c.gamesCount, 4)
  const list = ids.length ? ids.map((id) => gameMetaById[id as GameId]).filter(Boolean) : gameMeta
  return list.slice(0, n)
}
function featuredInteractions(c: HomeContent): InteractionMeta[] {
  const ids = strs(c.interactionIds)
  const n = num(c.interactionsCount, 4)
  const list = ids.length ? ids.map((id) => interactionById[id]).filter((m) => m?.ready) : interactionMeta.filter((m) => m.ready)
  return list.slice(0, n)
}
function featuredTools(c: HomeContent): ToolMeta[] {
  return strs(c.toolIds)
    .map((id) => toolMetaById[id as keyof typeof toolMetaById])
    .filter(Boolean)
}

// ---------------------------------------------------------------------------
// Karşılamanın altındaki bölümler
// ---------------------------------------------------------------------------
const sectionCls = 'mx-auto mt-14 max-w-6xl px-4 sm:mt-16'
const MAIN_LINKS = [
  { to: '/oyunlar', icon: Gamepad2, tint: '#eef3fd', ink: '#2f5bd3', count: () => `${gameMeta.length} oyun` },
  { to: '/etkilesimler', icon: Telescope, tint: '#eaf6f2', ink: '#1f8a5b', count: () => `${interactionMeta.filter((m) => m.ready).length} etkileşim` },
  { to: '/manipulatifler', icon: Blocks, tint: '#fdf3e9', ink: '#b8660b', count: () => `${toolMeta.length} materyal` },
  { to: GUIDES_PATH, icon: BookOpen, tint: '#fcf0f3', ink: '#b43868', count: () => `${guides.length} konu` },
]

function Landing({ c, sections, variant }: { c: HomeContent; sections: HomeSectionId[]; variant: HomeVariant }) {
  const [last] = useState(() => {
    try {
      const g = Number(localStorage.getItem(GRADE_KEY))
      return isGrade(g) ? g : null
    } catch {
      return null
    }
  })
  const big = variant === 'vitrin'

  const blocks: Record<HomeSectionId, () => ReactNode> = {
    grades: () => (
      <section key="grades" id="siniflar" className={`${sectionCls} scroll-mt-20`}>
        <SectionTitle title={txt(c.gradesTitle, 'Sınıfınızı seçin')} desc={txt(c.gradesDesc) || undefined} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {grades.map((g) => <GradeTile key={g} g={g} last={last === g} />)}
        </div>
      </section>
    ),
    mainSections: () => {
      const cards = objs<{ title?: string; desc?: string }>(c.mainCards)
      return (
        <section key="mainSections" className={sectionCls}>
          <SectionTitle title={txt(c.mainTitle, 'Ne arıyorsunuz?')} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MAIN_LINKS.map((s, i) => {
              const card = cards[i] ?? homePage.defaults.mainCards[i]
              return (
                <Link key={s.to} to={s.to} className="group relative flex flex-col overflow-hidden rounded-2xl p-5 ring-1 ring-black/[0.04] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]" style={{ background: s.tint }}>
                  <s.icon aria-hidden size={120} strokeWidth={1.25} className="pointer-events-none absolute -right-6 -bottom-6 opacity-[0.07] transition group-hover:scale-105" style={{ color: s.ink }} />
                  <span className="grid size-11 place-items-center rounded-xl bg-white shadow-sm" style={{ color: s.ink }}><s.icon size={22} /></span>
                  <span className="mt-4 text-lg font-bold text-ink">{txt(card?.title, homePage.defaults.mainCards[i].title)}</span>
                  <span className="mt-1 text-sm font-semibold text-ink-soft">{txt(card?.desc)}</span>
                  <span className="mt-auto flex items-center gap-1.5 pt-5 text-sm font-bold" style={{ color: s.ink }}>
                    {s.count()}
                    <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      )
    },
    howTo: () => {
      const steps = objs<{ t?: string; d?: string }>(c.steps).filter((s) => txt(s.t))
      if (!steps.length) return null
      return (
        <section key="howTo" className={sectionCls}>
          <div className="rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
            <h2 className="text-xl font-extrabold text-ink sm:text-2xl">{txt(c.howToTitle, 'Derste üç adımda')}</h2>
            <ol className={`mt-6 grid gap-6 ${steps.length === 2 ? 'sm:grid-cols-2' : steps.length >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
              {steps.map((st, i) => (
                <li key={i} className="relative">
                  {i < steps.length - 1 && steps.length <= 3 && <span aria-hidden className="absolute top-5 left-14 hidden h-px w-[calc(100%-4rem)] border-t-2 border-dashed border-line sm:block" />}
                  <span className="grid size-10 place-items-center rounded-full bg-brand-soft text-base font-extrabold text-brand-ink">{i + 1}</span>
                  <p className="mt-3 font-bold text-ink">{txt(st.t)}</p>
                  {txt(st.d) && <p className="mt-1 text-sm font-semibold text-ink-soft">{txt(st.d)}</p>}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )
    },
    popularTools: () => {
      const tools = featuredTools(c)
      if (!tools.length) return null
      return (
        <section key="popularTools" className={sectionCls}>
          <SectionTitle title={txt(c.toolsTitle, 'Sık kullanılan manipülatifler')} desc={txt(c.toolsDesc) || undefined} action={<AllLink to="/manipulatifler" />} />
          {big ? (
            <BigGrid n={tools.length}>
              {tools.map((t) => <ShowcaseTile key={t.id} to={`/manipulatif/${t.id}`} emoji={t.emoji} label={`${t.grades}. sınıf`} title={t.name} desc={t.description} tint={categoryTint[t.category]} />)}
            </BigGrid>
          ) : (
            <CardGrid>
              {tools.map((t) => <ItemCard key={t.id} to={`/manipulatif/${t.id}`} emoji={t.emoji} title={t.name} desc={t.description} meta={`${t.grades}. sınıf`} tint={categoryTint[t.category]} />)}
            </CardGrid>
          )}
        </section>
      )
    },
    featuredGames: () => {
      const list = featuredGames(c)
      if (!list.length) return null
      return (
        <section key="featuredGames" className={sectionCls}>
          <SectionTitle title={txt(c.gamesTitle, 'Öne çıkan oyunlar')} desc={txt(c.gamesDesc) || undefined} action={<AllLink to="/oyunlar" />} />
          {big ? (
            <BigGrid n={list.length}>
              {list.map((m) => <ShowcaseTile key={m.id} to={`/oyun/${m.id}`} emoji={m.emoji} label={`${gradeRange(m.grades)}`} title={m.name} desc={m.description} tint={`${m.color}1f`} />)}
            </BigGrid>
          ) : (
            <CardGrid>
              {list.map((m) => <ItemCard key={m.id} to={`/oyun/${m.id}`} emoji={m.emoji} title={m.name} desc={m.description} meta={gradeRange(m.grades)} tint={`${m.color}12`} />)}
            </CardGrid>
          )}
        </section>
      )
    },
    featuredInteractions: () => {
      const list = featuredInteractions(c)
      if (!list.length) return null
      return (
        <section key="featuredInteractions" className={sectionCls}>
          <SectionTitle title={txt(c.interactionsTitle, 'Öne çıkan etkileşimler')} desc={txt(c.interactionsDesc) || undefined} action={<AllLink to="/etkilesimler" />} />
          {big ? (
            <BigGrid n={list.length}>
              {list.map((m) => <ShowcaseTile key={m.id} to={`/etkilesim/${m.id}`} emoji={m.emoji} label={gradeRange(m.grades)} title={m.name} desc={m.description} tint={categoryTint[m.category]} />)}
            </BigGrid>
          ) : (
            <CardGrid>
              {list.map((m) => <ItemCard key={m.id} to={`/etkilesim/${m.id}`} emoji={m.emoji} title={m.name} desc={m.description} meta={gradeRange(m.grades)} tint={categoryTint[m.category]} />)}
            </CardGrid>
          )}
        </section>
      )
    },
    approachLesson: () => (
      <section key="approachLesson" className={`${sectionCls} grid gap-3 lg:grid-cols-[1.6fr_1fr]`}>
        <div className="rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
          <h2 className="text-xl font-extrabold text-ink sm:text-2xl">{txt(c.approachTitle)}</h2>
          {txt(c.approachDesc) && <p className="mt-2 max-w-xl text-sm font-semibold text-ink-soft sm:text-base">{txt(c.approachDesc)}</p>}
          <ol className="mt-5 flex flex-wrap items-center gap-2">
            {STAGE_ORDER.map((st, i) => (
              <li key={st} className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold" style={{ background: stageMeta[st].bg, color: stageMeta[st].color }}>
                  {i + 1}. {stageMeta[st].label}
                </span>
                {i < STAGE_ORDER.length - 1 && <ArrowRight size={15} className="text-ink-soft/50" aria-hidden />}
              </li>
            ))}
          </ol>
          <Link to="/yaklasim" className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline">Yaklaşımımızı okuyun <ArrowRight size={15} /></Link>
        </div>
        <Link to={ONLINE_LESSON_PATH} className="group flex flex-col rounded-3xl bg-brand-soft p-6 ring-1 ring-brand/10 transition hover:shadow-[var(--shadow-lift)] sm:p-8">
          <img src="/asli-220.webp" alt="" width={56} height={56} className="size-14 rounded-full ring-4 ring-white" />
          <h2 className="mt-4 text-xl font-extrabold text-ink">{txt(c.lessonTitle)}</h2>
          {txt(c.lessonDesc) && <p className="mt-1 text-sm font-semibold text-ink-soft">{txt(c.lessonDesc)}</p>}
          <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-bold text-brand-ink">Ayrıntılar <ArrowRight size={15} className="transition group-hover:translate-x-1" /></span>
        </Link>
      </section>
    ),
  }

  return <>{sections.map((id) => blocks[id]?.())}</>
}

/** Büyük kartlar: öğe sayısına göre 3 ya da 4 sütun (son satırda tek kart kalmasın) */
const BigGrid = ({ children, n }: { children: ReactNode; n: number }) => (
  <div className={`grid gap-3 sm:grid-cols-2 sm:gap-4 ${n % 4 === 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>{children}</div>
)

function GradeTile({ g, last }: { g: Grade; last: boolean }) {
  const info = gradeInfo[g]
  return (
    <Link
      to={`/sinif/${g}`}
      aria-label={`${info.label} matematik`}
      className="group flex flex-col rounded-2xl bg-white p-4 ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] sm:p-5"
    >
      <span className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl text-2xl font-extrabold transition group-hover:scale-105" style={{ background: info.soft, color: info.ink }}>{g}</span>
        <span className="min-w-0">
          <span className="block font-bold text-ink">{info.label}</span>
          <span className="block text-xs font-semibold text-ink-soft">{last ? 'Son açtığınız' : info.level === 'ilkokul' ? 'İlkokul' : 'Ortaokul'}</span>
        </span>
        <ArrowRight size={17} className="ml-auto hidden shrink-0 text-ink-soft opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100 sm:block" />
      </span>
      <span className="mt-3 hidden text-sm font-semibold text-ink-soft sm:block">
        <span className="line-clamp-2">{gradePlan[g].focus}</span>
      </span>
    </Link>
  )
}

const AllLink = ({ to }: { to: string }) => (
  <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-brand hover:underline">Tümünü gör <ArrowRight size={15} /></Link>
)

function SearchResults({ q }: { q: string }) {
  const { groups, loading } = useSiteSearch(q, 60)
  const total = groups.reduce((n, g) => n + g.total, 0)
  return (
    <section className="mx-auto mt-8 max-w-6xl px-4">
      <p className="mb-6 text-sm font-semibold text-ink-soft">“{q}” için {loading && !total ? 'aranıyor…' : `${total} sonuç`}</p>
      {!loading && total === 0 && (
        <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-line">
          <p className="font-bold">Bir şey bulamadık.</p>
          <p className="mt-1 text-sm font-semibold text-ink-soft">Farklı bir kelime deneyin: “toplama”, “kesir”, “simetri”…</p>
        </div>
      )}
      <div className="space-y-10">
        {groups.map((g) => (
          <div key={g.label}>
            <h2 className="mb-3 text-lg font-bold">{g.label} <span className="font-semibold text-ink-soft">({g.total})</span></h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.hits.map((h) => (
                <Link key={h.key} to={h.to} className="flex items-center gap-3 rounded-xl bg-white p-3.5 ring-1 ring-line transition hover:shadow-[var(--shadow-lift)]">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-paper text-xl font-bold text-ink-soft" aria-hidden>{h.emoji ?? h.badge}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-ink">{h.title}</span>
                    <span className="block truncate text-xs font-semibold text-ink-soft">{h.sub}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

