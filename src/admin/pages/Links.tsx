/** Dış bağlantılar (Wordwall, GeoGebra, YouTube …): tema sayfalarında "Öğretmenimin önerdiği bağlantılar" */
import { useState } from 'react'
import { ExternalLink, Eye, EyeOff, Pencil, Plus, Trash2, Undo2 } from 'lucide-react'
import { outcomeByCode, themes } from '../../data/curriculum'
import type { ExternalLink as Ext } from '../../data/types'
import { deleteEntry, saveEntry, useEntries } from '../api'
import { linkItems, stateInfo, type AdminItem, type LinkRow } from '../catalog'
import { OutcomePicker } from '../components/pickers'
import { useItemActions } from '../components/ItemList'
import { Badge, Button, Empty, Field, IconButton, Modal, PageHead, Segmented, Select, TextInput, cx, useToast } from '../ui'

const KINDS: { value: NonNullable<Ext['kind']>; label: string }[] = [
  { value: 'oyun', label: 'Oyun' },
  { value: 'video', label: 'Video' },
  { value: 'geogebra', label: 'GeoGebra' },
  { value: 'calisma-kagidi', label: 'Çalışma kâğıdı' },
  { value: 'diger', label: 'Diğer' },
]

const targetLabel = (t: string) => {
  const oc = outcomeByCode.get(t)
  if (oc) return `${t} · ${oc.short}`
  const [g, slug] = t.split('/')
  const th = themes.find((x) => String(x.grade) === g && x.slug === slug)
  return th ? `${g}. sınıf · ${th.title}` : t
}

export function LinksPage() {
  const { entries, loaded } = useEntries()
  const items = linkItems(entries) as unknown as AdminItem<LinkRow>[]
  const [edit, setEdit] = useState<AdminItem<LinkRow> | 'new' | null>(null)
  const a = useItemActions()

  return (
    <div>
      <PageHead
        title="Dış bağlantılar"
        desc="Wordwall, GeoGebra, YouTube gibi sitelerden önerdiğiniz bağlantılar. Bağlandıkları tema ya da öğrenme çıktısının sayfasında “Öğretmenimin önerdiği bağlantılar” bölümünde görünür."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setEdit('new')}>
            Bağlantı ekle
          </Button>
        }
      />
      {!loaded ? (
        <div className="h-40 animate-pulse rounded-2xl bg-white ring-1 ring-line" />
      ) : !items.length ? (
        <Empty title="Henüz bağlantı yok" action={<Button variant="primary" icon={<Plus size={16} />} onClick={() => setEdit('new')}>Bağlantı ekle</Button>} />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-white ring-1 ring-line">
          {items.map((it) => {
            const l = it.value
            const hidden = it.state === 'hidden'
            return (
              <li key={it.ref} className={cx('flex items-center gap-3 px-4 py-3', hidden && 'opacity-60')}>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-paper text-lg ring-1 ring-line">🔗</span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-extrabold">{l.title}</span>
                    {it.state !== 'original' && <Badge tone={stateInfo[it.state].tone}>{stateInfo[it.state].label}</Badge>}
                    {l.kind && <Badge>{KINDS.find((k) => k.value === l.kind)?.label ?? l.kind}</Badge>}
                  </p>
                  <p className="truncate text-xs font-semibold text-ink-soft">
                    {targetLabel(l.target)} · {l.url}
                  </p>
                </div>
                <a href={l.url} target="_blank" rel="noreferrer" className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-paper hover:text-ink" aria-label="Bağlantıyı aç">
                  <ExternalLink size={16} />
                </a>
                <IconButton label="Düzenle" onClick={() => setEdit(it)}>
                  <Pencil size={16} />
                </IconButton>
                <IconButton label={hidden ? 'Geri getir' : 'Gizle'} onClick={() => a.hide(it as unknown as AdminItem, !hidden)}>
                  {hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                </IconButton>
                {it.entry?.origin === 'builtin' && (
                  <IconButton label="Orijinale dön" onClick={() => a.revert(it as unknown as AdminItem)}>
                    <Undo2 size={16} />
                  </IconButton>
                )}
                {it.entry?.origin === 'custom' && (
                  <IconButton label="Sil" className="hover:text-bad" onClick={() => a.remove(it as unknown as AdminItem)}>
                    <Trash2 size={16} />
                  </IconButton>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {edit && <LinkModal item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

function LinkModal({ item, onClose }: { item: AdminItem<LinkRow> | null; onClose: () => void }) {
  const toast = useToast()
  const v = item?.value
  const [title, setTitle] = useState(v?.title ?? '')
  const [url, setUrl] = useState(v?.url ?? '')
  const [kind, setKind] = useState<NonNullable<Ext['kind']>>(v?.kind ?? 'diger')
  const [note, setNote] = useState(v?.note ?? '')
  const [target, setTarget] = useState(v?.target ?? '')
  const [mode, setMode] = useState<'outcome' | 'theme'>(v?.target && !outcomeByCode.get(v.target) ? 'theme' : 'outcome')
  const [busy, setBusy] = useState(false)
  const urlOk = /^https?:\/\/\S+\.\S+/.test(url)

  const save = async () => {
    if (!title.trim() || !urlOk || !target) return toast('Başlık, geçerli bir adres ve bağlı olduğu konu gerekli', 'error')
    setBusy(true)
    const data: Ext = { title: title.trim(), url: url.trim(), target, kind, ...(note.trim() ? { note: note.trim() } : {}) }
    try {
      if (!item) await saveEntry({ kind: 'link', ref: `l-${Date.now().toString(36)}`, origin: 'custom', data })
      else if (item.entry?.origin === 'custom') await saveEntry({ ...item.entry, data })
      else {
        // Koddaki bağlantı: tam veriyi yama olarak sakla
        const orig = item.original as LinkRow
        const same = orig.title === data.title && orig.url === data.url && orig.target === data.target && orig.kind === data.kind && (orig.note ?? '') === (data.note ?? '')
        if (same && item.entry && !item.entry.hidden) await deleteEntry(item.entry.id)
        else if (!same) await saveEntry({ id: item.entry?.id, kind: 'link', ref: item.ref, origin: 'builtin', hidden: item.entry?.hidden ?? false, data: { ...data, note: data.note ?? null } })
      }
      toast('Bağlantı kaydedildi')
      onClose()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const themeOpts = themes.map((t) => ({ value: `${t.grade}/${t.slug}`, label: `${t.grade}. sınıf · ${t.title}` }))
  return (
    <Modal
      open
      onClose={onClose}
      title={item ? 'Bağlantıyı düzenle' : 'Yeni bağlantı'}
      footer={
        <>
          <Button onClick={onClose}>Vazgeç</Button>
          <Button variant="primary" loading={busy} onClick={save}>
            Kaydet
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Başlık">
          <TextInput value={title} onChange={setTitle} placeholder="Kesir Duvarı" autoFocus />
        </Field>
        <Field label="Adres (URL)" error={url && !urlOk ? 'https:// ile başlayan geçerli bir adres girin' : null}>
          <TextInput value={url} onChange={setUrl} placeholder="https://www.geogebra.org/m/…" type="url" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tür">
            <Select value={kind} onChange={setKind} options={KINDS} />
          </Field>
          <Field label="Kısa not">
            <TextInput value={note} onChange={setNote} placeholder="Denk kesirleri keşfet" />
          </Field>
        </div>
        <Field label="Nerede görünsün?">
          <div className="mb-2">
            <Segmented
              size="sm"
              value={mode}
              onChange={(m) => {
                setMode(m)
                setTarget(m === 'theme' ? themeOpts[0].value : '')
              }}
              options={[
                { value: 'outcome', label: 'Öğrenme çıktısı' },
                { value: 'theme', label: 'Tema' },
              ]}
            />
          </div>
          {mode === 'outcome' ? (
            <OutcomePicker value={target ? [target] : []} onChange={(v) => setTarget(v[0] ?? '')} max={1} />
          ) : (
            <Select value={target} onChange={setTarget} options={themeOpts} />
          )}
        </Field>
      </div>
    </Modal>
  )
}
