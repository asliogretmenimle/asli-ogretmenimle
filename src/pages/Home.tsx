import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Blocks, BookOpen, Gamepad2, Search, Telescope, X } from 'lucide-react'
import { gradeInfo, grades, isGrade } from '../data/curriculum'
import type { Grade, ManipulativeTool } from '../data/types'
import { usePageTitle } from '../components/Layout'
import { CardGrid, ItemCard, SectionTitle, categoryTint, gradeRange } from '../components/Catalog'
import { stageMeta } from '../components/meta'
import { STAGE_ORDER } from '../data/activityStore'
import { gradePlan } from '../data/gradePlan'
import { toolMeta, toolMetaById } from '../manipulatives/meta'
import { gameMeta } from '../games/meta'
import { interactionMeta } from '../interactions/meta'
import { guides } from '../data/guides'
import { GUIDES_PATH, ONLINE_LESSON_PATH } from '../lib/seo'
import { useSiteSearch } from '../lib/siteSearch'
import { GRADE_KEY } from './Grade'

/** Ana sayfada öne çıkan, derste en çok açılan materyaller */
const POPULAR_TOOLS: ManipulativeTool[] = ['base10', 'fractions', 'numberline', 'geoboard', 'kesirdaireleri', 'clock', 'algebra', 'tangram']

export default function Home() {
  const [params, setParams] = useSearchParams()
  const q = params.get('ara') ?? ''
  const navigate = useNavigate()
  usePageTitle()

  // Eski ?sinif=3 linkleri kalıcı adrese: /sinif/3
  const legacy = Number(params.get('sinif'))
  useEffect(() => {
    if (isGrade(legacy) && !q) navigate(`/sinif/${legacy}`, { replace: true })
  }, [legacy, q, navigate])

  const setQuery = (v: string) => {
    const p = new URLSearchParams(params)
    if (v) p.set('ara', v)
    else p.delete('ara')
    setParams(p, { replace: true })
  }

  return (
    <div>
      <section className="relative overflow-hidden border-b border-line bg-white">
        {/* Kareli defter dokusu ve iki yumuşak renk lekesi */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#eef0f5_1px,transparent_1px),linear-gradient(to_bottom,#eef0f5_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_75%_45%,black_10%,transparent_70%)]" />
        <div aria-hidden className="pointer-events-none absolute -top-40 -right-32 size-[520px] rounded-full bg-brand-soft opacity-80 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-48 -left-40 size-[440px] rounded-full bg-[#eaf1ff] opacity-80 blur-3xl" />

        <div className={`relative mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-[1.1fr_1fr] ${q ? 'py-8 sm:py-10' : 'py-10 sm:py-16'}`}>
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/80 py-1 pr-3 pl-1 text-sm font-bold text-ink-soft ring-1 ring-line backdrop-blur">
              <img src="/asli-220.webp" alt="" width={28} height={28} className="size-7 rounded-full lg:hidden" />
              <span className="hidden size-2 rounded-full bg-ok lg:ml-2 lg:block" aria-hidden />
              Maarif Modeli’ne uygun · Ücretsiz · Üyeliksiz
            </p>
            <h1 className="mt-5 text-[32px] leading-[1.15] font-extrabold tracking-tight text-ink sm:text-5xl">
              1–8. sınıf matematik için{' '}
              <span className="bg-[linear-gradient(transparent_60%,#f9d6e3_60%)] px-0.5">oyunlar, etkileşimler</span> ve sanal manipülatifler
            </h1>
            <p className="mt-4 max-w-xl text-base font-semibold text-ink-soft sm:text-lg">
              Derste akıllı tahtada açın ya da linkini öğrencilerinize gönderin. Her etkinlik somuttan soyuta, adım adım ilerler.
            </p>
            <label className="relative mt-7 block max-w-xl">
              <Search className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-soft" size={20} />
              <input
                type="search"
                value={q}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ne arıyorsunuz? Kesirler, saat, açılar…"
                className="h-14 w-full rounded-2xl bg-white pr-12 pl-12 text-base font-semibold shadow-[var(--shadow-lift)] ring-1 ring-line outline-none placeholder:text-ink-soft/60 focus:ring-2 focus:ring-brand"
                aria-label="Sitede ara"
              />
              {q && (
                <button type="button" onClick={() => setQuery('')} className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink-soft hover:bg-paper" aria-label="Aramayı temizle">
                  <X size={18} />
                </button>
              )}
            </label>
            {!q && (
              <p className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-soft">
                Sık arananlar:
                {POPULAR_SEARCHES.map((w) => (
                  <button key={w} type="button" onClick={() => setQuery(w)} className="rounded-full bg-white/80 px-3 py-1 font-bold text-ink ring-1 ring-line transition hover:ring-ink-soft/40">{w}</button>
                ))}
              </p>
            )}
          </div>
          {!q && <HeroArt />}
        </div>
      </section>

      {q ? <SearchResults q={q} /> : <Landing />}
    </div>
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
      {chips.map((c) => {
        const t = toolMetaById[c.id]
        if (!t) return null
        return (
          <Link key={c.id} to={`/manipulatif/${c.id}`} tabIndex={-1} className={`absolute flex items-center gap-2 rounded-2xl bg-white py-2 pr-4 pl-2 text-sm font-bold text-ink shadow-[var(--shadow-lift)] ring-1 ring-line animate-float ${c.cls}`} style={{ animationDelay: c.delay }}>
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

const POPULAR_SEARCHES = ['Kesirler', 'Çarpma', 'Saat', 'Açılar', 'Olasılık']

function Landing() {
  const [last] = useState(() => {
    try {
      const g = Number(localStorage.getItem(GRADE_KEY))
      return isGrade(g) ? g : null
    } catch {
      return null
    }
  })
  const sectionsList = [
    { to: '/oyunlar', icon: Gamepad2, title: 'Oyunlar', desc: 'Sınıfa göre zorlaşan, düşündüren matematik oyunları', count: `${gameMeta.length} oyun`, tint: '#eef3fd', ink: '#2f5bd3' },
    { to: '/etkilesimler', icon: Telescope, title: 'Etkileşimler', desc: 'Tek bir fikri keşfettiren kısa etkinlikler', count: `${interactionMeta.filter((m) => m.ready).length} etkileşim`, tint: '#eaf6f2', ink: '#1f8a5b' },
    { to: '/manipulatifler', icon: Blocks, title: 'Manipülatifler', desc: 'Tahtada kullanılacak dijital materyaller', count: `${toolMeta.length} materyal`, tint: '#fdf3e9', ink: '#b8660b' },
    { to: GUIDES_PATH, icon: BookOpen, title: 'Konu Anlatımı', desc: 'Örnekli, kısa ve net konu anlatımları', count: `${guides.length} konu`, tint: '#fcf0f3', ink: '#b43868' },
  ]
  const steps = [
    { t: 'Sınıfı ve konuyu seçin', d: 'Konular öğretim programındaki sırasıyla listelenir.' },
    { t: 'Tahtada açın ya da linki gönderin', d: 'Her etkinliğin kendi linki var; kurulum ve üyelik gerekmez.' },
    { t: 'Öğrenci raporunu toplayın', d: 'Öğrenci bitirince sonucunu ve düşüncesini WhatsApp’tan size gönderir.' },
  ]

  return (
    <>
      {/* Sınıf seçimi */}
      <section className="mx-auto mt-12 max-w-6xl px-4 sm:mt-16">
        <SectionTitle title="Sınıfınızı seçin" desc="Her sınıfın konuları, etkinlikleri, oyunları ve materyalleri tek sayfada." />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {grades.map((g) => <GradeTile key={g} g={g} last={last === g} />)}
        </div>
      </section>

      {/* Ana bölümler */}
      <section className="mx-auto mt-14 max-w-6xl px-4 sm:mt-16">
        <SectionTitle title="Ne arıyorsunuz?" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sectionsList.map((s) => (
            <Link key={s.to} to={s.to} className="group relative flex flex-col overflow-hidden rounded-2xl p-5 ring-1 ring-black/[0.04] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]" style={{ background: s.tint }}>
              <s.icon aria-hidden size={120} strokeWidth={1.25} className="pointer-events-none absolute -right-6 -bottom-6 opacity-[0.07] transition group-hover:scale-105" style={{ color: s.ink }} />
              <span className="grid size-11 place-items-center rounded-xl bg-white shadow-sm" style={{ color: s.ink }}><s.icon size={22} /></span>
              <span className="mt-4 text-lg font-bold text-ink">{s.title}</span>
              <span className="mt-1 text-sm font-semibold text-ink-soft">{s.desc}</span>
              <span className="mt-auto flex items-center gap-1.5 pt-5 text-sm font-bold" style={{ color: s.ink }}>
                {s.count}
                <ArrowRight size={16} className="transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Nasıl kullanılır */}
      <section className="mx-auto mt-14 max-w-6xl px-4 sm:mt-16">
        <div className="rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
          <h2 className="text-xl font-extrabold text-ink sm:text-2xl">Derste üç adımda</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3">
            {steps.map((st, i) => (
              <li key={st.t} className="relative">
                {i < steps.length - 1 && <span aria-hidden className="absolute top-5 left-14 hidden h-px w-[calc(100%-4rem)] border-t-2 border-dashed border-line sm:block" />}
                <span className="grid size-10 place-items-center rounded-full bg-brand-soft text-base font-extrabold text-brand-ink">{i + 1}</span>
                <p className="mt-3 font-bold text-ink">{st.t}</p>
                <p className="mt-1 text-sm font-semibold text-ink-soft">{st.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-6xl px-4 sm:mt-16">
        <SectionTitle title="Sık kullanılan manipülatifler" desc="Akıllı tahtada serbestçe kullanılan dijital materyaller." action={<AllLink to="/manipulatifler" />} />
        <CardGrid>
          {POPULAR_TOOLS.map((id) => toolMetaById[id]).filter(Boolean).map((t) => (
            <ItemCard key={t.id} to={`/manipulatif/${t.id}`} emoji={t.emoji} title={t.name} desc={t.description} meta={`${t.grades}. sınıf`} tint={categoryTint[t.category]} />
          ))}
        </CardGrid>
      </section>

      <section className="mx-auto mt-14 max-w-6xl px-4 sm:mt-16">
        <SectionTitle title="Öne çıkan oyunlar" desc="Kur, dene, farklı yollar bul: tek doğru cevaba tıklamak yok." action={<AllLink to="/oyunlar" />} />
        <CardGrid>
          {gameMeta.slice(0, 4).map((m) => (
            <ItemCard key={m.id} to={`/oyun/${m.id}`} emoji={m.emoji} title={m.name} desc={m.description} meta={gradeRange(m.grades)} tint={`${m.color}12`} />
          ))}
        </CardGrid>
      </section>

      {/* Yaklaşım ve özel ders */}
      <section className="mx-auto mt-14 grid max-w-6xl gap-3 px-4 sm:mt-16 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
          <h2 className="text-xl font-extrabold text-ink sm:text-2xl">Somuttan soyuta, adım adım</h2>
          <p className="mt-2 max-w-xl text-sm font-semibold text-ink-soft sm:text-base">Her konu Van de Walle’ün gelişimsel yaklaşımıyla dört aşamada ilerler: öğrenci önce yaparak keşfeder, sonunda nedenini açıklar.</p>
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
          <h2 className="mt-4 text-xl font-extrabold text-ink">Birebir online özel ders</h2>
          <p className="mt-1 text-sm font-semibold text-ink-soft">Aslı Öğretmen’le birebir ya da 3–4 kişilik grup: 1–8. sınıf matematik, LGS hazırlık ve konu tekrarı.</p>
          <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-bold text-brand-ink">Ayrıntılar <ArrowRight size={15} className="transition group-hover:translate-x-1" /></span>
        </Link>
      </section>
    </>
  )
}

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
