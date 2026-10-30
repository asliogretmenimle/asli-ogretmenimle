import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Blocks, ClipboardList, Gamepad2, Telescope } from 'lucide-react'
import type { Activity, Grade } from '../data/types'
import { gradeInfo } from '../data/curriculum'
import type { Topic } from '../data/topics'
import { interactionById } from '../interactions/meta'
import { toolMetaById } from '../manipulatives/meta'
import { gameMetaById } from '../games/meta'
import { ActivityCard } from './Cards'
import { themeIcon } from './meta'

/**
 * Sınıf sayfasında bir konu başlığı: altında Etkinlikler (Keşif Atölyesi + etkinlikler),
 * Materyaller (sanal manipülatifler) ve Oyunlar ayrı gruplar hâlinde.
 * onlyActivities: tür/aşama süzgeci açıkken yalnızca süzülen etkinlikler gösterilir.
 */
export function TopicSection({ topic, grade, activities, onlyActivities }: { topic: Topic; grade: Grade; activities: Activity[]; onlyActivities?: boolean }) {
  const g = gradeInfo[grade]
  const Icon = themeIcon[topic.icon]
  const discover = onlyActivities ? [] : topic.interactions.map((id) => interactionById[id]).filter((m) => m?.ready)
  const tools = onlyActivities ? [] : topic.tools.map((id) => toolMetaById[id]).filter(Boolean)
  const games = onlyActivities ? [] : topic.games.map((id) => gameMetaById[id]).filter(Boolean)
  const etkinlik = discover.length + activities.length
  const counts = [etkinlik && `${etkinlik} etkinlik`, tools.length && `${tools.length} materyal`, games.length && `${games.length} oyun`].filter(Boolean).join(' · ')

  return (
    <section id={`konu-${topic.slug}`} className="scroll-mt-36" aria-labelledby={`konu-${topic.slug}-baslik`}>
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl" style={{ background: g.soft, color: g.ink }}>
          <Icon size={22} strokeWidth={2.4} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black tracking-wide uppercase" style={{ color: g.ink }}>{topic.unit}. Ünite</p>
          <h2 id={`konu-${topic.slug}-baslik`} className="text-lg leading-tight font-black text-ink sm:text-xl">{topic.title}</h2>
          <p className="mt-0.5 text-sm font-semibold text-ink-soft">{topic.summary}</p>
        </div>
        <span className="ml-auto hidden shrink-0 text-sm font-bold text-ink-soft md:block">{counts}</span>
      </div>

      <div className="mt-4 space-y-5 border-l-2 pl-3 sm:pl-5" style={{ borderColor: `${g.color}40` }}>
        {etkinlik > 0 && (
          <Group icon={<ClipboardList size={17} />} title="Etkinlikler" count={etkinlik} color={g.ink}>
            {discover.map((m) => (
              <Link key={m.id} to={`/etkilesim/${m.id}?sinif=${grade}`} className="group card relative flex min-h-28 flex-col gap-2 overflow-hidden p-4 pl-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
                <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: g.color }} aria-hidden />
                <span className="flex items-center gap-1.5">
                  <span className="chip shrink-0 bg-sky-50 text-sky-700"><Telescope size={13} strokeWidth={2.6} />Keşif</span>
                  <span className="text-xl" aria-hidden>{m.emoji}</span>
                </span>
                <h3 className="text-[17px] leading-snug font-extrabold text-ink">{m.name}</h3>
                <p className="mt-auto line-clamp-2 text-xs font-bold text-ink-soft">{m.skills?.[grade] ?? m.description}</p>
              </Link>
            ))}
            {activities.map((a) => <ActivityCard key={a.id} a={a} grade={grade} />)}
          </Group>
        )}
        {tools.length > 0 && (
          <Group icon={<Blocks size={17} />} title="Materyaller" count={tools.length} color={g.ink}>
            {tools.map((t) => (
              <Link key={t.id} to={`/manipulatif/${t.id}`} className="group card flex items-start gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-paper text-2xl" aria-hidden>{t.emoji}</span>
                <span className="min-w-0">
                  <span className="block leading-tight font-extrabold text-ink">{t.name}</span>
                  <span className="mt-1 line-clamp-2 text-xs font-bold text-ink-soft">{t.description}</span>
                </span>
              </Link>
            ))}
          </Group>
        )}
        {games.length > 0 && (
          <Group icon={<Gamepad2 size={17} />} title="Oyunlar" count={games.length} color={g.ink}>
            {games.map((m) => (
              <Link key={m.id} to={`/oyun/${m.id}?sinif=${grade}`} className="group card flex items-start gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl text-2xl transition group-hover:scale-110" style={{ background: `${m.color}18` }} aria-hidden>{m.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block leading-tight font-extrabold text-ink">{m.name}</span>
                  <span className="mt-1 line-clamp-2 text-xs font-bold text-ink-soft">{m.skills[grade] ?? m.description}</span>
                </span>
                <ArrowRight size={16} className="mt-1 shrink-0 text-ink-soft opacity-0 transition group-hover:opacity-100" aria-hidden />
              </Link>
            ))}
          </Group>
        )}
      </div>
    </section>
  )
}

function Group({ icon, title, count, color, children }: { icon: ReactNode; title: string; count: number; color: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-black tracking-wide uppercase" style={{ color }}>
        {icon}{title}<span className="font-bold text-ink-soft normal-case">({count})</span>
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>
    </div>
  )
}
