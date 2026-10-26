import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink as ExtIcon } from 'lucide-react'
import type { Activity, ExternalLink, Grade, Theme } from '../data/types'
import { gradeInfo } from '../data/curriculum'
import { outcomeByCode } from '../data/curriculum'
import { StageBadge, TypeBadge, linkMeta, stageMeta, themeIcon } from './meta'

export function ActivityCard({ a, grade, showTheme, step }: { a: Activity; grade: Grade; showTheme?: boolean; step?: number }) {
  const g = gradeInfo[grade]
  const oc = outcomeByCode.get(a.outcomes[0])
  return (
    <Link
      to={`/etkinlik/${a.id}`}
      className="group card relative flex min-h-28 flex-col gap-2 overflow-hidden p-4 pl-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] focus-visible:-translate-y-0.5"
    >
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: g.color }} aria-hidden />
      {step !== undefined && (
        <span className="absolute top-3 right-3 grid size-6 place-items-center rounded-full text-[11px] font-black text-white" style={{ background: (a.stage && stageMeta[a.stage].color) || g.color }} aria-label={`${step}. adım`}>{step}</span>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-1">
          {a.stage && <StageBadge stage={a.stage} compact />}
          <TypeBadge type={a.type} />
        </span>
        {a.level && step === undefined && (
          <span className="flex gap-0.5" aria-label={`Zorluk ${a.level}/3`} title={['', 'Kolay', 'Orta', 'Zor'][a.level]}>
            {[1, 2, 3].map((l) => <span key={l} className="size-1.5 rounded-full" style={{ background: l <= a.level! ? g.color : '#e5e7eb' }} />)}
          </span>
        )}
      </div>
      <h3 className="text-[17px] leading-snug font-extrabold text-ink">{a.title}</h3>
      <div className="mt-auto flex items-end justify-between gap-2">
        <p className="line-clamp-1 text-xs font-bold text-ink-soft">
          {showTheme && oc ? `${g.label} · ` : ''}{oc?.short}
        </p>
        <span className="grid size-8 shrink-0 place-items-center rounded-full text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" style={{ background: g.color }} aria-hidden>
          <ArrowRight size={16} />
        </span>
      </div>
    </Link>
  )
}

export function ThemeHeader({ theme, count, linkTo }: { theme: Theme; count: number; linkTo?: string }) {
  const g = gradeInfo[theme.grade]
  const Icon = themeIcon[theme.icon]
  const inner = (
    <div className="flex items-center gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl" style={{ background: g.soft, color: g.ink }}>
        <Icon size={22} strokeWidth={2.4} />
      </span>
      <div className="min-w-0">
        <h2 className="text-lg leading-tight font-black text-ink sm:text-xl">{theme.title}</h2>
        <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-ink-soft">{theme.topics.join(' · ')}</p>
      </div>
      <span className="ml-auto hidden shrink-0 text-sm font-bold text-ink-soft sm:block">{count} etkinlik</span>
    </div>
  )
  return linkTo ? (
    <Link to={linkTo} className="group block rounded-2xl transition hover:bg-white/70 sm:-mx-2 sm:p-2">{inner}</Link>
  ) : inner
}

export function LinkCard({ l }: { l: ExternalLink }) {
  const m = linkMeta[l.kind ?? 'diger']
  const Icon = m.icon
  return (
    <a href={l.url} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-3 p-3.5 transition hover:shadow-[var(--shadow-lift)]">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><Icon size={20} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-extrabold">{l.title}</span>
        <span className="block truncate text-xs font-semibold text-ink-soft">{l.note ?? m.label}</span>
      </span>
      <ExtIcon size={16} className="shrink-0 text-ink-soft" />
    </a>
  )
}
