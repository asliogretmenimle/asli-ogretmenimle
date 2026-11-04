import type { ReactNode } from 'react'
import type { Activity, Grade } from '../data/types'
import type { Topic } from '../data/topics'
import { interactionById } from '../interactions/meta'
import { toolMetaById } from '../manipulatives/meta'
import { gameMetaById } from '../games/meta'
import { ActivityCard, MiniCard } from './Cards'

/**
 * Sınıf sayfasında bir konu başlığı: altında Etkinlikler (etkileşimler + etkinlikler),
 * Materyaller (sanal manipülatifler) ve Oyunlar ayrı gruplar hâlinde.
 * onlyActivities: tür/aşama süzgeci açıkken yalnızca süzülen etkinlikler gösterilir.
 */
export function TopicSection({ topic, grade, activities, onlyActivities }: { topic: Topic; grade: Grade; activities: Activity[]; onlyActivities?: boolean }) {
  const discover = onlyActivities ? [] : topic.interactions.map((id) => interactionById[id]).filter((m) => m?.ready)
  const tools = onlyActivities ? [] : topic.tools.map((id) => toolMetaById[id]).filter(Boolean)
  const games = onlyActivities ? [] : topic.games.map((id) => gameMetaById[id]).filter(Boolean)
  const etkinlik = discover.length + activities.length
  const counts = [etkinlik && `${etkinlik} etkinlik`, tools.length && `${tools.length} materyal`, games.length && `${games.length} oyun`].filter(Boolean).join(' · ')

  return (
    <section id={`konu-${topic.slug}`} className="scroll-mt-24" aria-labelledby={`konu-${topic.slug}-baslik`}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-line pb-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-ink-soft">{topic.unit}. Ünite</p>
          <h2 id={`konu-${topic.slug}-baslik`} className="text-xl leading-tight font-extrabold text-ink">{topic.title}</h2>
          <p className="mt-1 text-sm font-semibold text-ink-soft">{topic.summary}</p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-ink-soft">{counts}</span>
      </div>

      <div className="mt-4 space-y-6">
        {etkinlik > 0 && (
          <Group title="Etkinlikler">
            {discover.map((m) => (
              <MiniCard key={m.id} to={`/etkilesim/${m.id}?sinif=${grade}`} label="Etkileşim" emoji={m.emoji} title={m.name} sub={m.skills?.[grade] ?? m.description} />
            ))}
            {activities.map((a) => <ActivityCard key={a.id} a={a} grade={grade} />)}
          </Group>
        )}
        {tools.length > 0 && (
          <Group title="Materyaller">
            {tools.map((t) => <MiniCard key={t.id} to={`/manipulatif/${t.id}`} label="Manipülatif" emoji={t.emoji} title={t.name} sub={t.description} />)}
          </Group>
        )}
        {games.length > 0 && (
          <Group title="Oyunlar">
            {games.map((m) => <MiniCard key={m.id} to={`/oyun/${m.id}?sinif=${grade}`} label="Oyun" emoji={m.emoji} title={m.name} sub={m.skills[grade] ?? m.description} />)}
          </Group>
        )}
      </div>
    </section>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2.5 text-sm font-bold text-ink-soft">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  )
}
