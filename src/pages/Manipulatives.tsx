import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, RotateCcw } from 'lucide-react'
import { tools } from '../manipulatives/registry'
import { toolGrades, toolMeta as toolList, toolMetaById } from '../manipulatives/meta'
import { categoryInfo } from '../interactions/types'
import { activityGrade, useAllActivities } from '../data/activityStore'
import { ActivityCard } from '../components/Cards'
import { ShareButton } from '../components/ShareButton'
import { usePageTitle } from '../components/Layout'
import type { ManipulativeTool } from '../data/types'
import { CardGrid, EmptyState, FilterBar, ItemCard, PageHeader, useCatalogFilters } from '../components/Catalog'
import NotFound from './NotFound'

const CATEGORIES = (['sayilar', 'kesirler', 'geometri', 'cebir-veri'] as const).map((id) => ({ id, label: categoryInfo[id].label }))

export function ManipulativesIndex() {
  usePageTitle('Sanal Manipülatifler')
  const f = useCatalogFilters()
  const list = toolList.filter(
    (t) => (!f.grade || toolGrades(t).includes(f.grade)) && (!f.category || t.category === f.category) && f.matches(`${t.name} ${t.description}`),
  )
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:pt-10">
      <PageHeader title="Sanal Manipülatifler" desc={`${toolList.length} dijital materyal. Akıllı tahtada ya da tablette serbestçe kullanılır; kurulum ve üyelik gerekmez.`} />
      <FilterBar
        q={f.q}
        onQ={f.setQ}
        placeholder="Materyal ara: kesir, blok, saat…"
        grade={f.grade}
        onGrade={f.setGrade}
        categories={CATEGORIES}
        category={f.category}
        onCategory={f.setCategory}
      />
      <p className="mb-3 text-sm font-semibold text-ink-soft">{list.length} manipülatif</p>
      {list.length ? (
        <CardGrid>
          {list.map((t) => <ItemCard key={t.id} to={`/manipulatif/${t.id}`} emoji={t.emoji} title={t.name} desc={t.description} meta={`${t.grades}. sınıf`} />)}
        </CardGrid>
      ) : (
        <EmptyState onClear={f.clear} />
      )}
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
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{def.name}</h1>
        <p className="mt-1 text-[15px] font-semibold text-ink-soft">{def.description} · {def.grades}. sınıf</p>
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
