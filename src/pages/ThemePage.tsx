import { Link, Navigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { findTheme, gradeInfo, isGrade, themesByGrade } from '../data/curriculum'
import { STAGE_ORDER, forOutcome, themeNotes, useGradeActivities } from '../data/activityStore'
import { linksFor } from '../data/links'
import { ActivityCard, LinkCard } from '../components/Cards'
import { stageMeta, themeIcon } from '../components/meta'
import { usePageTitle } from '../components/Layout'
import { ShareButton } from '../components/ShareButton'
import NotFound from './NotFound'

export default function ThemePage() {
  const { grade: gStr = '', slug = '' } = useParams()
  const g = Number(gStr)
  const theme = isGrade(g) ? findTheme(g, slug) : undefined
  const all = useGradeActivities(isGrade(g) ? g : null)
  usePageTitle(theme ? `${theme.title} (${g}. Sınıf)` : 'Sayfa bulunamadı')
  if (isGrade(g) && !slug) return <Navigate to={`/?sinif=${g}`} replace />
  if (!theme || !isGrade(g)) return <NotFound />

  const info = gradeInfo[g]
  const Icon = themeIcon[theme.icon]
  const siblings = themesByGrade(g)
  const idx = siblings.findIndex((t) => t.slug === theme.slug)
  const seen = new Set<string>()
  const links = linksFor(theme.outcomes.map((o) => o.code), `${g}/${theme.slug}`)

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <nav className="mb-5 flex items-center justify-between gap-2">
        <Link to={`/?sinif=${g}`} className="inline-flex min-h-10 items-center gap-1 rounded-xl pr-3 text-sm font-extrabold text-ink-soft hover:text-ink">
          <ChevronLeft size={18} /> {info.label}
        </Link>
        <ShareButton title={theme.title} />
      </nav>

      <header className="relative mb-8 overflow-hidden rounded-3xl p-5 sm:p-8" style={{ background: info.soft }}>
        <div className="flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white shadow-sm" style={{ color: info.color }}>
            <Icon size={28} strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-sm font-extrabold" style={{ color: info.ink }}>{info.label} · {idx + 1}. tema</p>
            <h1 className="text-2xl leading-tight font-black text-ink sm:text-4xl">{theme.title}</h1>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {theme.topics.map((tp) => <span key={tp} className="chip bg-white/80 text-ink">{tp}</span>)}
            </div>
          </div>
        </div>
      </header>

      {all && themeNotes(g, theme.slug) && (
        <section className="mb-8 rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black"><Sparkles size={20} className="text-amber-500" />Büyük Fikirler</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {themeNotes(g, theme.slug)!.bigIdeas.map((b) => (
              <li key={b} className="flex items-start gap-2 rounded-2xl bg-paper p-3 text-sm font-semibold text-ink">
                <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: info.color }} />{b}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-1.5 text-xs font-extrabold text-ink-soft">
        <span className="mr-1">Öğrenme yolu:</span>
        {STAGE_ORDER.map((st, i) => (
          <span key={st} className="flex items-center gap-1.5">
            <span className="chip" style={{ color: stageMeta[st].color, background: stageMeta[st].bg }}>{i + 1}. {stageMeta[st].label}</span>
            {i < STAGE_ORDER.length - 1 && <ChevronRight size={14} />}
          </span>
        ))}
      </div>

      <div className="space-y-9">
        {theme.outcomes.map((o) => {
          const list = forOutcome(all ?? [], o.code)
            .filter((a) => !seen.has(a.id))
            .sort((x, y) => STAGE_ORDER.indexOf(x.stage!) - STAGE_ORDER.indexOf(y.stage!))
          list.forEach((a) => seen.add(a.id))
          return (
            <section key={o.code}>
              <div className="mb-3">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <h2 className="text-lg font-black sm:text-xl">{o.short}</h2>
                  <span className="font-mono text-xs font-bold text-ink-soft">{o.code}</span>
                </div>
                <p className="mt-0.5 text-sm font-semibold text-ink-soft">{o.title}</p>
              </div>
              {!all ? (
                <div className="h-28 animate-pulse rounded-2xl bg-white/70 ring-1 ring-line" />
              ) : list.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {list.map((a, i) => <ActivityCard key={a.id} a={a} grade={g} step={i + 1} />)}
                </div>
              ) : (
                <p className="text-sm font-bold text-ink-soft">Bu çıktının etkinlikleri yukarıdaki kartlarda yer alıyor.</p>
              )}
            </section>
          )
        })}
      </div>

      {links.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-3 text-lg font-black">Öğretmenimin önerdiği bağlantılar</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {links.map((l, i) => <LinkCard key={i} l={l} />)}
          </div>
        </section>
      )}

      <nav className="mt-12 grid gap-3 sm:grid-cols-2">
        {idx > 0 && (
          <Link to={`/sinif/${g}/${siblings[idx - 1].slug}`} className="card p-4 transition hover:shadow-[var(--shadow-lift)]">
            <span className="text-xs font-extrabold text-ink-soft">← Önceki tema</span>
            <span className="block font-extrabold">{siblings[idx - 1].title}</span>
          </Link>
        )}
        {idx < siblings.length - 1 && (
          <Link to={`/sinif/${g}/${siblings[idx + 1].slug}`} className="card p-4 text-right transition hover:shadow-[var(--shadow-lift)] sm:col-start-2">
            <span className="text-xs font-extrabold text-ink-soft">Sonraki tema →</span>
            <span className="block font-extrabold">{siblings[idx + 1].title}</span>
          </Link>
        )}
      </nav>
    </div>
  )
}
