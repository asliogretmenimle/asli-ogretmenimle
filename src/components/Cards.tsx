import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink as ExtIcon } from 'lucide-react'
import type { Activity, ExternalLink, Grade, Theme } from '../data/types'
import { gradeInfo } from '../data/curriculum'
import { outcomeByCode } from '../data/curriculum'
import { linkMeta, stageMeta, typeMeta } from './meta'

/** Sade küçük kart: üstte tür etiketi, ortada başlık, altta tek satırlık bilgi */
export function MiniCard({ to, label, dot, title, sub, emoji, step }: { to: string; label: string; dot?: string; title: string; sub?: string; emoji?: string; step?: number }) {
  return (
    <Link to={to} className="group flex min-h-24 flex-col rounded-xl bg-white p-4 ring-1 ring-line transition hover:shadow-[var(--shadow-lift)] hover:ring-ink-soft/25 focus-visible:shadow-[var(--shadow-lift)]">
      <span className="flex items-center gap-1.5 text-xs font-bold text-ink-soft">
        {dot && <span className="size-2 shrink-0 rounded-full" style={{ background: dot }} aria-hidden />}
        {step !== undefined && <span aria-label={`${step}. adım`}>{step}.</span>}
        {label}
        {emoji && <span className="ml-auto text-lg" aria-hidden>{emoji}</span>}
      </span>
      <h3 className="mt-1.5 leading-snug font-bold text-ink">{title}</h3>
      {sub && <p className="mt-auto line-clamp-1 pt-2 text-xs font-semibold text-ink-soft">{sub}</p>}
    </Link>
  )
}

export function ActivityCard({ a, grade, showTheme, step }: { a: Activity; grade: Grade; showTheme?: boolean; step?: number }) {
  const oc = outcomeByCode.get(a.outcomes[0])
  const stage = a.stage ? stageMeta[a.stage] : undefined
  return (
    <MiniCard
      to={`/etkinlik/${a.id}`}
      label={stage ? stage.label : typeMeta[a.type].label}
      dot={stage?.color}
      step={step}
      title={a.title}
      sub={[showTheme && gradeInfo[grade].label, typeMeta[a.type].label, oc?.short].filter(Boolean).join(' · ')}
    />
  )
}

export function ThemeHeader({ theme, count, linkTo }: { theme: Theme; count: number; linkTo?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-line pb-3">
      <div className="min-w-0">
        <h2 className="text-xl leading-tight font-extrabold text-ink">{theme.title}</h2>
        <p className="mt-1 text-sm font-semibold text-ink-soft">{theme.topics.join(' · ')}</p>
      </div>
      <span className="flex shrink-0 items-center gap-3 text-sm font-semibold text-ink-soft">
        {count} etkinlik
        {linkTo && <Link to={linkTo} className="inline-flex items-center gap-1 font-bold text-brand hover:underline">Tema sayfası <ArrowRight size={15} /></Link>}
      </span>
    </div>
  )
}

export function LinkCard({ l }: { l: ExternalLink }) {
  const m = linkMeta[l.kind ?? 'diger']
  const Icon = m.icon
  return (
    <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl bg-white p-3.5 ring-1 ring-line transition hover:shadow-[var(--shadow-lift)]">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><Icon size={20} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{l.title}</span>
        <span className="block truncate text-xs font-semibold text-ink-soft">{l.note ?? m.label}</span>
      </span>
      <ExtIcon size={16} className="shrink-0 text-ink-soft" />
    </a>
  )
}
