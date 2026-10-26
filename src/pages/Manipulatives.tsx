import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, RotateCcw } from 'lucide-react'
import { tools } from '../manipulatives/registry'
import { toolMeta as toolList, toolMetaById } from '../manipulatives/meta'
import { activityGrade, useAllActivities } from '../data/activityStore'
import { ActivityCard } from '../components/Cards'
import { ShareButton } from '../components/ShareButton'
import { usePageTitle } from '../components/Layout'
import type { ManipulativeTool } from '../data/types'
import NotFound from './NotFound'

export function ManipulativesIndex() {
  usePageTitle('Sanal Manipülatifler')
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <h1 className="text-3xl font-black sm:text-4xl">Sanal Manipülatifler</h1>
      <p className="mt-2 max-w-2xl font-semibold text-ink-soft">Somut materyallerin dijital hâlleri. Serbestçe keşfet; öğretmenin de derste tahtada kullanabilir.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {toolList.map((t) => (
          <Link key={t.id} to={`/manipulatif/${t.id}`} className="card group flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-paper text-3xl transition group-hover:scale-110" aria-hidden>{t.emoji}</span>
            <span>
              <span className="block text-lg font-black">{t.name}</span>
              <span className="mt-0.5 block text-sm font-semibold text-ink-soft">{t.description}</span>
              <span className="chip mt-2 bg-indigo-50 text-brand">{t.grades}. sınıf</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function ManipulativePage() {
  const { tool = '' } = useParams()
  const def = tools[tool as ManipulativeTool]
  usePageTitle(def ? toolMetaById[tool as ManipulativeTool].name : 'Bulunamadı')
  if (!def) return <NotFound />
  return <FreeTool key={tool} id={tool as ManipulativeTool} />
}

function FreeTool({ id }: { id: ManipulativeTool }) {
  const def = { ...tools[id], ...toolMetaById[id] }
  const [value, setValue] = useState(() => def.initial(def.defaultConfig))
  const Comp = def.Component
  const related = (useAllActivities() ?? []).filter((a) => a.type === 'manipulative' && a.tool === id)

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6">
      <nav className="mb-4 flex items-center justify-between gap-2">
        <Link to="/manipulatifler" className="inline-flex min-h-10 items-center gap-1 rounded-xl pr-3 text-sm font-extrabold text-ink-soft hover:text-ink">
          <ChevronLeft size={18} /> Manipülatifler
        </Link>
        <div className="flex gap-2">
          <button type="button" onClick={() => setValue(def.initial(def.defaultConfig))} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-extrabold ring-1 ring-line hover:bg-paper">
            <RotateCcw size={16} /><span className="hidden sm:inline">Sıfırla</span>
          </button>
          <ShareButton title={def.name} />
        </div>
      </nav>
      <header className="mb-6 flex items-center gap-3">
        <span className="text-4xl" aria-hidden>{def.emoji}</span>
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">{def.name}</h1>
          <p className="text-sm font-semibold text-ink-soft">{def.description}</p>
        </div>
      </header>
      <div className="card p-4 sm:p-6">
        <Comp value={value} onChange={setValue} config={def.defaultConfig} />
      </div>
      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-black">Bu manipülatifle görevler</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((a) => <ActivityCard key={a.id} a={a} grade={activityGrade(a)} showTheme />)}
          </div>
        </section>
      )}
    </div>
  )
}
