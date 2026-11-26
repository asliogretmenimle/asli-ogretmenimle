import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, ChevronLeft, LayoutDashboard, RotateCcw } from 'lucide-react'
import { tools } from '../manipulatives/registry'
import { toolGrades, toolMeta as toolList, toolMetaById, type ToolMeta } from '../manipulatives/meta'
import { categoryInfo } from '../interactions/types'
import { activityGrade, useAllActivities } from '../data/activityStore'
import { ActivityCard } from '../components/Cards'
import { ShareButton } from '../components/ShareButton'
import { usePageTitle } from '../components/Layout'
import { BOARD_PATH } from '../lib/seo'
import type { ManipulativeTool } from '../data/types'
import { CardGrid, FilterBar, ItemCard, PageHeader, categoryTint, useCatalogFilters } from '../components/Catalog'
import NotFound from './NotFound'
import { HtmlFrame } from '../cms/HtmlFrame'
import { PageSpinner } from '../cms/PageSpinner'
import { useCmsSettled } from '../cms/runtime'
import type { CustomMark } from '../cms/types'
import { usePageContent } from '../cms/pageContent'
import { toolsPage } from '../cms/pages/manipulatifler'

/** Panelden gelen metin: boşsa varsayılan, {n} → sayı */
const fill = (t: unknown, fallback: string, vars: Record<string, string | number> = {}) =>
  Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), typeof t === 'string' && t.trim() ? t : fallback)

const CATEGORIES = (['sayilar', 'kesirler', 'geometri', 'cebir-veri'] as const).map((id) => ({ id, label: categoryInfo[id].label }))

export function ManipulativesIndex() {
  usePageTitle('Sanal Manipülatifler')
  const c = usePageContent(toolsPage)
  const d = toolsPage.defaults
  const f = useCatalogFilters()
  const list = toolList.filter(
    (t) => (!f.grade || toolGrades(t).includes(f.grade)) && (!f.category || t.category === f.category) && f.matches(`${t.name} ${t.description}`),
  )
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:pt-10">
      <PageHeader title={fill(c.title, d.title)} desc={fill(c.desc, d.desc, { n: toolList.length })} />
      <Link to={BOARD_PATH} className="group mb-6 flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-line transition hover:shadow-[var(--shadow-lift)]">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#fff5e8] text-[#b8660b]"><LayoutDashboard size={22} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-ink">{fill(c.boardTitle, d.boardTitle)}</span>
          <span className="block text-sm font-semibold text-ink-soft">{fill(c.boardDesc, d.boardDesc)}</span>
        </span>
        <ArrowRight size={18} className="shrink-0 text-ink-soft transition group-hover:translate-x-0.5" />
      </Link>
      <FilterBar
        q={f.q}
        onQ={f.setQ}
        placeholder={fill(c.searchPlaceholder, d.searchPlaceholder)}
        grade={f.grade}
        onGrade={f.setGrade}
        categories={CATEGORIES}
        category={f.category}
        onCategory={f.setCategory}
        allLabel={fill(c.allLabel, d.allLabel)}
      />
      <p className="mb-3 text-sm font-semibold text-ink-soft">{fill(c.countLabel, d.countLabel, { n: list.length })}</p>
      {list.length ? (
        <CardGrid>
          {list.map((t) => <ItemCard key={t.id} to={`/manipulatif/${t.id}`} emoji={t.emoji} title={t.name} desc={t.description} meta={`${t.grades}. sınıf`} tint={categoryTint[t.category]} />)}
        </CardGrid>
      ) : (
        <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-line">
          <p className="font-bold text-ink">{fill(c.emptyText, d.emptyText)}</p>
          <button type="button" onClick={f.clear} className="mt-3 text-sm font-bold text-brand hover:underline">{fill(c.emptyClear, d.emptyClear)}</button>
        </div>
      )}
    </div>
  )
}

export function ManipulativePage() {
  const { tool = '' } = useParams()
  const meta = toolMetaById[tool as ManipulativeTool] as (ToolMeta & CustomMark) | undefined
  const def = meta && tools[tool as ManipulativeTool]
  const settled = useCmsSettled()
  usePageTitle(meta ? meta.name : settled ? 'Bulunamadı' : undefined)
  if (meta?.custom && meta.cmsId) return <CustomTool key={tool} meta={meta} cmsId={meta.cmsId} />
  if (!def) return settled ? <NotFound /> : <PageSpinner />
  return <FreeTool key={tool} id={tool as ManipulativeTool} />
}

/** Panelin Stüdyo'sunda üretilmiş manipülatif */
function CustomTool({ meta, cmsId }: { meta: ToolMeta; cmsId: string }) {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-6">
      <nav className="mb-4 flex items-center justify-between gap-2">
        <Link to="/manipulatifler" className="inline-flex min-h-10 items-center gap-1 rounded-xl pr-3 text-sm font-extrabold text-ink-soft hover:text-ink">
          <ChevronLeft size={18} /> Manipülatifler
        </Link>
        <ShareButton title={meta.name} />
      </nav>
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold sm:text-3xl"><span aria-hidden>{meta.emoji}</span> {meta.name}</h1>
        <p className="mt-1 text-[15px] font-semibold text-ink-soft">{meta.description} · {meta.grades}. sınıf</p>
      </header>
      <HtmlFrame kind="manipulative" cmsId={cmsId} grade={toolGrades(meta)[0] ?? 1} />
    </div>
  )
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
