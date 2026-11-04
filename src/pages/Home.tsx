import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Blocks, BookOpen, Gamepad2, Search, Telescope, X } from 'lucide-react'
import { gradeInfo, grades, isGrade } from '../data/curriculum'
import type { Grade, ManipulativeTool } from '../data/types'
import { usePageTitle } from '../components/Layout'
import { CardGrid, ItemCard, SectionTitle, gradeRange } from '../components/Catalog'
import { toolMeta, toolMetaById } from '../manipulatives/meta'
import { gameMeta } from '../games/meta'
import { interactionMeta } from '../interactions/meta'
import { guides } from '../data/guides'
import { GUIDES_PATH } from '../lib/seo'
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
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <h1 className="max-w-3xl text-3xl leading-tight font-extrabold tracking-tight text-ink sm:text-[44px]">
            1–8. sınıf matematik için oyunlar, etkileşimler ve sanal manipülatifler
          </h1>
          <p className="mt-3 max-w-2xl text-base font-semibold text-ink-soft sm:text-lg">
            Maarif Modeli’ne uygun, ücretsiz ve üyeliksiz. Derste akıllı tahtada açın ya da linkini öğrencilerinize gönderin.
          </p>
          <label className="relative mt-7 block max-w-2xl">
            <Search className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-soft" size={20} />
            <input
              type="search"
              value={q}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ne arıyorsunuz? Kesirler, saat, açılar, onluk taban blokları…"
              className="h-14 w-full rounded-2xl bg-paper pr-12 pl-12 text-base font-semibold ring-1 ring-line outline-none placeholder:text-ink-soft/60 focus:bg-white focus:ring-2 focus:ring-brand"
              aria-label="Sitede ara"
            />
            {q && (
              <button type="button" onClick={() => setQuery('')} className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink-soft hover:bg-paper" aria-label="Aramayı temizle">
                <X size={18} />
              </button>
            )}
          </label>
        </div>
      </section>

      {q ? <SearchResults q={q} /> : <Landing />}
    </div>
  )
}

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
    { to: '/oyunlar', icon: Gamepad2, title: 'Oyunlar', desc: 'Sınıfa göre zorlaşan matematik oyunları', count: `${gameMeta.length} oyun`, tint: '#eef4ff', ink: '#2f5bd3' },
    { to: '/etkilesimler', icon: Telescope, title: 'Etkileşimler', desc: 'Tek bir fikri keşfettiren kısa etkinlikler', count: `${interactionMeta.filter((m) => m.ready).length} etkileşim`, tint: '#ecf8f3', ink: '#1f8a5b' },
    { to: '/manipulatifler', icon: Blocks, title: 'Manipülatifler', desc: 'Tahtada kullanılacak dijital materyaller', count: `${toolMeta.length} materyal`, tint: '#fff5e8', ink: '#b8660b' },
    { to: GUIDES_PATH, icon: BookOpen, title: 'Konu Anlatımı', desc: 'Örnekli kısa konu anlatımları', count: `${guides.length} konu`, tint: '#fdeef3', ink: '#b43868' },
  ]

  return (
    <>
      {/* Sınıf seçimi */}
      <section className="mx-auto mt-10 max-w-6xl px-4">
        <SectionTitle title="Sınıf seçin" desc="Her sınıfın konuları, öğretim programındaki sırasıyla." />
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3 md:grid-cols-8">
          {grades.map((g) => <GradeTile key={g} g={g} last={last === g} />)}
        </div>
      </section>

      {/* Ana bölümler */}
      <section className="mx-auto mt-12 max-w-6xl px-4">
        <SectionTitle title="Ne arıyorsunuz?" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sectionsList.map((s) => (
            <Link key={s.to} to={s.to} className="group flex flex-col rounded-2xl bg-white p-5 ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
              <span className="grid size-11 place-items-center rounded-xl" style={{ background: s.tint, color: s.ink }}><s.icon size={22} /></span>
              <span className="mt-4 text-lg font-bold text-ink">{s.title}</span>
              <span className="mt-1 text-sm font-semibold text-ink-soft">{s.desc}</span>
              <span className="mt-auto flex items-center justify-between pt-4 text-sm font-bold text-ink-soft">
                {s.count}
                <ArrowRight size={17} className="transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-6xl px-4">
        <SectionTitle title="Sık kullanılan manipülatifler" action={<AllLink to="/manipulatifler" />} />
        <CardGrid>
          {POPULAR_TOOLS.map((id) => toolMetaById[id]).map((t) => (
            <ItemCard key={t.id} to={`/manipulatif/${t.id}`} emoji={t.emoji} title={t.name} desc={t.description} meta={`${t.grades}. sınıf`} />
          ))}
        </CardGrid>
      </section>

      <section className="mx-auto mt-14 max-w-6xl px-4">
        <SectionTitle title="Öne çıkan oyunlar" action={<AllLink to="/oyunlar" />} />
        <CardGrid>
          {gameMeta.slice(0, 8).map((m) => (
            <ItemCard key={m.id} to={`/oyun/${m.id}`} emoji={m.emoji} title={m.name} desc={m.description} meta={gradeRange(m.grades)} />
          ))}
        </CardGrid>
      </section>

      <p className="mx-auto mt-12 max-w-6xl px-4 text-sm font-semibold text-ink-soft">
        Etkinlikler Van de Walle’ün somuttan soyuta ilerleyen yaklaşımıyla hazırlanır.{' '}
        <Link to="/yaklasim" className="font-bold text-ink hover:text-brand">Yaklaşımımızı okuyun →</Link>
      </p>
    </>
  )
}

function GradeTile({ g, last }: { g: Grade; last: boolean }) {
  const info = gradeInfo[g]
  return (
    <Link
      to={`/sinif/${g}`}
      aria-label={`${info.label} matematik`}
      className="group relative flex aspect-square flex-col items-center justify-center rounded-2xl bg-white ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] hover:ring-ink-soft/30 sm:aspect-[1/1.05]"
    >
      <span className="h-1 w-6 rounded-full" style={{ background: info.color }} aria-hidden />
      <span className="mt-2 text-3xl leading-none font-extrabold text-ink sm:text-4xl">{g}</span>
      <span className="mt-1 text-xs font-bold text-ink-soft">Sınıf</span>
      {last && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-brand" title="Son açtığınız sınıf" />}
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
