/** Kütüphane ve sınıf ekranlarının ortak listesi: ara, süz, düzenle, gizle, sil */
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, ExternalLink, MoreHorizontal, Pencil, Search, Trash2, Undo2 } from 'lucide-react'
import { ADMIN_PATH } from '../../cms/config'
import type { Grade } from '../../data/types'
import { deleteEntry, saveEntry } from '../api'
import { diffPatch, kindInfo, stateInfo, type AdminItem, type ItemState } from '../catalog'
import { Badge, Empty, IconButton, cx, inputCls, timeAgo, useConfirm, useToast } from '../ui'

export const editHref = (it: Pick<AdminItem, 'kind' | 'ref'>) => `${ADMIN_PATH}/duzenle/${it.kind}/${encodeURIComponent(it.ref)}`

/** Gizle / geri getir / orijinale dön / sil */
export function useItemActions() {
  const toast = useToast()
  const confirm = useConfirm()

  const hide = async (it: AdminItem, hidden: boolean) => {
    try {
      if (it.entry) {
        // Geri getirirken başka değişiklik yoksa kaydı tamamen sil (öğe koddaki hâline döner)
        const emptyPatch = it.entry.origin === 'builtin' && it.kind !== 'activity' && !Object.keys(it.entry.data ?? {}).length
        if (!hidden && emptyPatch) await deleteEntry(it.entry.id)
        else await saveEntry({ ...it.entry, hidden })
      } else {
        // Etkinliklerde kayıt tam değiştirme olduğu için koddaki hâli de saklanır
        await saveEntry({ kind: it.kind, ref: it.ref, origin: 'builtin', hidden, data: it.kind === 'activity' ? (it.original as Record<string, unknown>) : {}, grade: it.kind === 'activity' ? it.grades[0] : null })
      }
      toast(hidden ? `“${it.title}” sitede gizlendi` : `“${it.title}” yeniden yayında`)
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const revert = async (it: AdminItem) => {
    if (!it.entry) return
    const ok = await confirm({ title: 'Orijinale dönülsün mü?', desc: `“${it.title}” için yaptığınız tüm değişiklikler kaldırılır ve koddaki hâline döner. Geçmişten geri yükleyebilirsiniz.`, confirm: 'Orijinale dön' })
    if (!ok) return
    try {
      await deleteEntry(it.entry.id)
      toast('Orijinal hâline döndü')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const remove = async (it: AdminItem) => {
    if (!it.entry) return
    const ok = await confirm({ title: 'Kalıcı olarak silinsin mi?', desc: `“${it.title}” siteden ve panelden kaldırılır. Bağlantısı çalışmaz. (Değişiklik geçmişinden geri getirilebilir.)`, confirm: 'Sil', danger: true })
    if (!ok) return
    try {
      await deleteEntry(it.entry.id)
      toast('Silindi')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  /** Oyun/etkileşimi bir sınıfa ekle ya da sınıftan çıkar */
  const setGrades = async (it: AdminItem, grades: Grade[]) => {
    try {
      const next = { ...(it.value as Record<string, unknown>), grades }
      if (it.entry?.origin === 'custom') await saveEntry({ ...it.entry, data: { ...it.entry.data, grades } })
      else await saveEntry({ id: it.entry?.id, kind: it.kind, ref: it.ref, origin: 'builtin', hidden: it.entry?.hidden ?? false, status: it.entry?.status, data: diffPatch(it.original as Record<string, unknown>, next) })
      toast('Sınıflar güncellendi')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  return { hide, revert, remove, setGrades }
}

const FILTERS: { value: 'all' | ItemState; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'custom', label: 'Yeni' },
  { value: 'edited', label: 'Düzenlenen' },
  { value: 'draft', label: 'Taslak' },
  { value: 'hidden', label: 'Gizli' },
]

export function ItemList({
  items,
  emptyText,
  extraActions,
  showGrades = true,
  toolbar,
  group,
}: {
  items: AdminItem[]
  emptyText?: ReactNode
  /** Satır menüsüne ek eylemler */
  extraActions?: (it: AdminItem) => { label: string; icon?: ReactNode; onClick: () => void }[]
  showGrades?: boolean
  toolbar?: ReactNode
  /** Satırları gruplamak için başlık (ör. tema adı) */
  group?: (it: AdminItem) => string
}) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | ItemState>('all')
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length }
    for (const it of items) c[it.state] = (c[it.state] ?? 0) + 1
    return c
  }, [items])
  const key = (s: string) => s.toLocaleLowerCase('tr')
  const list = items.filter((it) => (filter === 'all' || it.state === filter) && (!q || key(`${it.title} ${it.desc} ${it.ref} ${it.meta ?? ''}`).includes(key(q))))

  const groups = useMemo(() => {
    if (!group) return [{ title: '', items: list }]
    const m = new Map<string, AdminItem[]>()
    for (const it of list) {
      const g = group(it)
      m.set(g, [...(m.get(g) ?? []), it])
    }
    return [...m.entries()].map(([title, items]) => ({ title, items }))
  }, [list, group])

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara…" className={cx(inputCls, 'pl-9')} />
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.filter((f) => f.value === 'all' || counts[f.value]).map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cx('h-9 rounded-xl px-3 text-[13px] font-extrabold ring-1 transition', filter === f.value ? 'bg-ink text-white ring-ink' : 'bg-white text-ink-soft ring-line hover:text-ink')}
            >
              {f.label} <span className="opacity-60">{counts[f.value] ?? 0}</span>
            </button>
          ))}
        </div>
        {toolbar}
      </div>

      {!list.length ? (
        <Empty title="Sonuç yok" desc={emptyText ?? 'Aramanızı ya da filtreyi değiştirin.'} />
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.title}>
              {g.title && <h3 className="mb-2 px-1 text-[13px] font-black text-ink-soft">{g.title}</h3>}
              <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-white ring-1 ring-line">
                {g.items.map((it) => (
                  <Row key={`${it.kind}:${it.ref}`} it={it} showGrades={showGrades} extra={extraActions?.(it)} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Row({ it, showGrades, extra }: { it: AdminItem; showGrades: boolean; extra?: { label: string; icon?: ReactNode; onClick: () => void }[] }) {
  const [menu, setMenu] = useState(false)
  const a = useItemActions()
  const st = stateInfo[it.state]
  const hidden = it.state === 'hidden'
  const canOpen = it.state !== 'draft' && !hidden

  return (
    <li className={cx('group relative flex items-center gap-3 px-3 py-2.5 transition hover:bg-paper/60 sm:px-4', hidden && 'opacity-60')}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-paper text-xl ring-1 ring-line" aria-hidden>
        {it.emoji}
      </span>
      <Link to={editHref(it)} className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-[15px] font-extrabold text-ink group-hover:text-brand-ink">{it.title}</span>
          {it.state !== 'original' && <Badge tone={st.tone}>{st.label}</Badge>}
          {it.meta && <span className="text-xs font-bold text-ink-soft">· {it.meta}</span>}
        </span>
        <span className="mt-0.5 block truncate text-[13px] font-semibold text-ink-soft">{it.desc || it.ref}</span>
      </Link>
      {showGrades && it.grades.length > 0 && (
        <span className="hidden shrink-0 text-xs font-extrabold text-ink-soft md:block">{it.grades.length === 1 ? `${it.grades[0]}. sınıf` : `${it.grades[0]}–${it.grades[it.grades.length - 1]}. sınıf`}</span>
      )}
      {it.entry && <span className="hidden w-24 shrink-0 text-right text-xs font-semibold text-ink-soft xl:block">{timeAgo(it.entry.updated_at)}</span>}
      <div className="flex shrink-0 items-center">
        <Link to={editHref(it)} className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-paper hover:text-ink" aria-label="Düzenle" title="Düzenle">
          <Pencil size={16} />
        </Link>
        <IconButton label={hidden ? 'Geri getir' : 'Sitede gizle'} onClick={() => a.hide(it, !hidden)} className="hidden sm:grid">
          {hidden ? <Eye size={16} /> : <EyeOff size={16} />}
        </IconButton>
        <div className="relative">
          <IconButton label="Diğer" onClick={() => setMenu((m) => !m)}>
            <MoreHorizontal size={16} />
          </IconButton>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute top-9 right-0 z-20 w-56 overflow-hidden rounded-2xl bg-white p-1 shadow-xl ring-1 ring-line animate-fade-up" onClick={() => setMenu(false)}>
                {canOpen && it.href && (
                  <a href={it.href} target="_blank" rel="noreferrer" className={menuItem}>
                    <ExternalLink size={15} />
                    Sitede aç
                  </a>
                )}
                <button type="button" className={menuItem} onClick={() => a.hide(it, !hidden)}>
                  {hidden ? <Eye size={15} /> : <EyeOff size={15} />}
                  {hidden ? 'Geri getir' : 'Sitede gizle'}
                </button>
                {extra?.map((x) => (
                  <button key={x.label} type="button" className={menuItem} onClick={x.onClick}>
                    {x.icon}
                    {x.label}
                  </button>
                ))}
                {it.entry?.origin === 'builtin' && (
                  <button type="button" className={menuItem} onClick={() => a.revert(it)}>
                    <Undo2 size={15} />
                    Orijinale dön
                  </button>
                )}
                {it.entry?.origin === 'custom' && (
                  <button type="button" className={cx(menuItem, 'text-bad hover:bg-bad-soft')} onClick={() => a.remove(it)}>
                    <Trash2 size={15} />
                    Kalıcı olarak sil
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </li>
  )
}

const menuItem = 'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-ink hover:bg-paper'

export const kindLabel = (k: AdminItem['kind']) => kindInfo[k].label
