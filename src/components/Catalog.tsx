import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { grades, isGrade } from '../data/curriculum'
import type { Grade } from '../data/types'
import { searchKey } from '../lib/format'

/**
 * Oyunlar, Etkileşimler ve Manipülatifler listeleri için ortak parçalar:
 * aynı başlık, aynı süzgeç satırı, aynı kart. Süzgeçler adrese yazılır (?sinif=5&tur=geometri&ara=kesir),
 * böylece öğretmen süzülmüş listeyi de paylaşabilir.
 */
export function useCatalogFilters() {
  const [params, setParams] = useSearchParams()
  const g = Number(params.get('sinif'))
  const grade: Grade | null = isGrade(g) ? g : null
  const category = params.get('tur')
  const q = params.get('ara') ?? ''
  const set = (key: string, v: string | null) => {
    const p = new URLSearchParams(params)
    if (v) p.set(key, v)
    else p.delete(key)
    setParams(p, { replace: true })
  }
  const key = searchKey(q).trim()
  return {
    grade,
    category,
    q,
    setGrade: (v: Grade | null) => set('sinif', v ? String(v) : null),
    setCategory: (v: string | null) => set('tur', v),
    setQ: (v: string) => set('ara', v),
    clear: () => setParams(new URLSearchParams(), { replace: true }),
    /** Arama kutusundaki bütün kelimeler metinde geçiyor mu? */
    matches: (text: string) => !key || key.split(' ').every((w) => searchKey(text).includes(w)),
  }
}

export function PageHeader({ title, desc, children }: { title: string; desc?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
      {desc && <p className="mt-2 max-w-2xl text-base font-semibold text-ink-soft">{desc}</p>}
      {children}
    </header>
  )
}

/** Sayfa içi arama + sınıf seçimi + (varsa) kategori seçimi */
export function FilterBar({
  q,
  onQ,
  placeholder,
  grade,
  onGrade,
  categories,
  category,
  onCategory,
  allLabel = 'Tüm konular',
}: {
  q: string
  onQ: (v: string) => void
  placeholder: string
  grade: Grade | null
  onGrade: (g: Grade | null) => void
  categories?: { id: string; label: string }[]
  category?: string | null
  onCategory?: (c: string | null) => void
  allLabel?: string
}) {
  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative block md:w-80 md:shrink-0">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft" />
          <input
            type="search"
            value={q}
            onChange={(e) => onQ(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="h-11 w-full rounded-xl bg-white pr-10 pl-10 text-[15px] font-semibold ring-1 ring-line outline-none placeholder:text-ink-soft/60 focus:ring-2 focus:ring-brand"
          />
          {q && (
            <button type="button" onClick={() => onQ('')} className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-ink-soft hover:bg-paper" aria-label="Aramayı temizle">
              <X size={16} />
            </button>
          )}
        </label>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] md:mx-0 md:px-0" role="group" aria-label="Sınıf">
          <button type="button" className="pill" aria-pressed={!grade} onClick={() => onGrade(null)}>Tüm sınıflar</button>
          {grades.map((g) => (
            <button key={g} type="button" className="pill min-w-11 justify-center" aria-pressed={grade === g} onClick={() => onGrade(grade === g ? null : g)} aria-label={`${g}. sınıf`}>
              <span>{g}<span className="hidden sm:inline">. sınıf</span></span>
            </button>
          ))}
        </div>
      </div>
      {categories && onCategory && (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Konu">
          <button type="button" className="pill" aria-pressed={!category} onClick={() => onCategory(null)}>{allLabel}</button>
          {categories.map((c) => (
            <button key={c.id} type="button" className="pill" aria-pressed={category === c.id} onClick={() => onCategory(category === c.id ? null : c.id)}>{c.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Tek tip kart: üstte görsel alanı, altında ad, tek satırlık açıklama ve sınıf aralığı */
export function ItemCard({ to, emoji, title, desc, meta, soon }: { to: string; emoji: string; title: string; desc: string; meta: string; soon?: boolean }) {
  const body = (
    <>
      <span className="grid aspect-[5/2] place-items-center bg-[#f2f4f8]" aria-hidden>
        <span className="text-5xl transition duration-300 group-hover:scale-110">{emoji}</span>
      </span>
      <span className="flex flex-1 flex-col p-4">
        <span className="leading-snug font-bold text-ink">{title}</span>
        <span className="mt-1 line-clamp-2 text-sm font-medium text-ink-soft">{desc}</span>
        <span className="mt-auto flex items-center gap-2 pt-3 text-xs font-bold text-ink-soft">
          {meta}
          {soon && <span className="chip bg-amber-50 text-amber-700">Yakında</span>}
        </span>
      </span>
    </>
  )
  const cls = 'group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-line transition'
  if (soon) return <div className={`${cls} opacity-60`}>{body}</div>
  return <Link to={to} className={`${cls} hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]`}>{body}</Link>
}

export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>
}

export function SectionTitle({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-extrabold text-ink sm:text-2xl">{title}</h2>
        {desc && <p className="mt-0.5 text-sm font-semibold text-ink-soft">{desc}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-line">
      <p className="font-bold text-ink">Bu süzgeçlere uyan bir şey bulamadık.</p>
      <button type="button" onClick={onClear} className="mt-3 text-sm font-bold text-brand hover:underline">Süzgeçleri temizle</button>
    </div>
  )
}

export const gradeRange = (g: number[]) => (g.length === 1 ? `${g[0]}. sınıf` : `${g[0]}–${g[g.length - 1]}. sınıf`)
