/** Sayfalar: ana sayfa düzeni ve bölüm sayfalarının metinleri, canlı önizlemeyle */
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, Eye, EyeOff, Pencil, Plus, Send, Trash2, Undo2 } from 'lucide-react'
import { ADMIN_PATH } from '../../cms/config'
import { mergePatch } from '../../cms/overlay'
import { pageDefById, pageDefs } from '../../cms/pages'
import type { PageDef, PageField, SectionToggle, SubField } from '../../cms/pages/types'
import { deleteEntry, saveEntry, useEntries } from '../api'
import { diffPatch } from '../catalog'
import { itemsOf } from './Library'
import { MultiPicker } from '../components/pickers'
import { SitePreview, draftEntry } from '../components/SitePreview'
import { Badge, Button, Card, Empty, Field, IconButton, JsonEditor, ListEditor, PageHead, Select, TextArea, TextInput, Toggle, cx, timeAgo, useConfirm, useSaveShortcut, useToast } from '../ui'

type Data = Record<string, unknown>

export function PagesList() {
  const { entries } = useEntries()
  return (
    <div>
      <PageHead title="Sayfalar" desc="Ana sayfanın düzenini ve bölüm sayfalarının metinlerini değiştirin. Her değişikliği kaydetmeden önce telefon, tablet ve bilgisayar görünümünde önizleyebilirsiniz." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {pageDefs.map((d) => {
          const e = entries.find((x) => x.kind === 'page' && x.ref === d.id)
          return (
            <Link key={d.id} to={`${ADMIN_PATH}/sayfalar/${d.id}`} className="group flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-line transition hover:shadow-[var(--shadow-lift)]">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-paper text-2xl ring-1 ring-line" aria-hidden>
                {d.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-black group-hover:text-brand-ink">{d.label}</span>
                  {e && <Badge tone={e.status === 'draft' ? 'amber' : 'blue'}>{e.status === 'draft' ? 'Taslak' : 'Düzenlendi'}</Badge>}
                </span>
                <span className="mt-0.5 block text-xs font-bold text-ink-soft">{d.path}</span>
                <span className="mt-1 block text-sm font-semibold text-ink-soft">{d.desc}</span>
                {e && <span className="mt-1 block text-xs font-semibold text-ink-soft">{timeAgo(e.updated_at)}</span>}
              </span>
              <Pencil size={16} className="mt-1 shrink-0 text-ink-soft" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function PageEditorRoute() {
  const { id = '' } = useParams()
  const { entries, loaded } = useEntries()
  const def = pageDefById[id]
  if (!def) return <Empty title="Sayfa bulunamadı" />
  if (!loaded) return <div className="h-80 animate-pulse rounded-2xl bg-white ring-1 ring-line" />
  const entry = entries.find((e) => e.kind === 'page' && e.ref === id)
  return <PageEditor key={`${id}:${entry?.updated_at ?? ''}`} def={def} entry={entry} />
}

function PageEditor({ def, entry }: { def: PageDef; entry?: ReturnType<typeof useEntries>['entries'][number] }) {
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const initial = useMemo(() => mergePatch(def.defaults, entry?.data), [def, entry])
  const [form, setForm] = useState<Data>(initial)
  const [busy, setBusy] = useState<'publish' | 'draft' | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)
  const patch = useMemo(() => diffPatch(def.defaults as Data, form), [def, form])
  const drafts = useMemo(() => [draftEntry({ id: entry?.id, kind: 'page', ref: def.id, origin: 'builtin', data: patch })], [entry?.id, def.id, patch])

  const save = async (status: 'published' | 'draft') => {
    setBusy(status === 'published' ? 'publish' : 'draft')
    try {
      if (!Object.keys(patch).length) {
        if (entry) await deleteEntry(entry.id)
        toast('Sayfa varsayılan metinlerine döndü')
      } else {
        await saveEntry({ id: entry?.id, kind: 'page', ref: def.id, origin: 'builtin', status, data: patch })
        toast(status === 'published' ? 'Sayfa güncellendi' : 'Taslak kaydedildi (sitede henüz görünmez)')
      }
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(null)
    }
  }
  useSaveShortcut(() => save('published'), dirty)

  const reset = async () => {
    if (!(await confirm({ title: 'Varsayılana dönülsün mü?', desc: 'Bu sayfadaki tüm değişiklikler kaldırılır. Değişiklik geçmişinden geri getirilebilir.', confirm: 'Varsayılana dön' }))) return
    if (entry) await deleteEntry(entry.id)
    setForm(def.defaults as Data)
    toast('Varsayılan metinlere dönüldü')
  }
  const back = async () => {
    if (dirty && !(await confirm({ title: 'Kaydedilmemiş değişiklikler var', desc: 'Çıkarsanız değişiklikler kaybolur.', confirm: 'Çık', danger: true }))) return
    navigate(`${ADMIN_PATH}/sayfalar`)
  }

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 mb-6 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center gap-3">
          <IconButton label="Geri" onClick={back} className="size-10 ring-1 ring-line">
            <ArrowLeft size={18} />
          </IconButton>
          <div className="min-w-0 flex-1 max-sm:basis-[calc(100%-3.5rem)]">
            <p className="text-xs font-bold text-ink-soft">Sayfa · {def.path}</p>
            <h1 className="flex flex-wrap items-center gap-2 text-lg font-black sm:text-xl">
              <span aria-hidden>{def.emoji}</span>
              {def.label}
              {entry?.status === 'draft' && <Badge tone="amber">Taslak</Badge>}
              {entry && entry.status !== 'draft' && <Badge tone="blue">Düzenlendi</Badge>}
              {dirty && <span className="size-2 rounded-full bg-amber-500" title="Kaydedilmemiş değişiklik" />}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button className="xl:hidden" icon={<Eye size={16} />} onClick={() => setShowPreview((s) => !s)}>
              {showPreview ? 'Formu göster' : 'Önizle'}
            </Button>
            {entry && (
              <Button variant="ghost" icon={<Undo2 size={16} />} onClick={reset}>
                <span className="hidden sm:inline">Varsayılana dön</span>
              </Button>
            )}
            <Button onClick={() => save('draft')} loading={busy === 'draft'} disabled={!dirty}>
              Taslak
            </Button>
            <Button variant="primary" onClick={() => save('published')} loading={busy === 'publish'} disabled={!dirty && entry?.status !== 'draft'} icon={<Send size={16} />}>
              Yayınla
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className={cx('min-w-0 space-y-6', showPreview && 'max-xl:hidden')}>
          {!def.groups.length && <Empty title="Bu sayfanın düzenlenebilir alanları henüz tanımlanmadı" />}
          {def.groups.map((g) => (
            <Card key={g.title} title={g.title} desc={g.desc}>
              <div className="space-y-5">
                {g.fields.map((f) => (
                  <PageFieldInput key={f.key} f={f} value={form[f.key]} def={(def.defaults as Data)[f.key]} onChange={(v) => setForm((x) => ({ ...x, [f.key]: v }))} />
                ))}
              </div>
            </Card>
          ))}
        </div>
        <div className={cx('min-w-0 xl:sticky xl:top-24 xl:self-start', !showPreview && 'max-xl:hidden')}>
          <Card title="Önizleme" desc="Kaydetmeden önce sitede nasıl görüneceği" pad>
            <SitePreview targets={[{ label: def.label, path: def.path }]} entries={drafts} defaultDevice="tablet" />
          </Card>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Alan çizimi
// ---------------------------------------------------------------------------
function PageFieldInput({ f, value, def, onChange }: { f: PageField; value: unknown; def: unknown; onChange: (v: unknown) => void }) {
  const changed = JSON.stringify(value) !== JSON.stringify(def)
  const label: ReactNode = (
    <span className="flex items-center gap-1.5">
      {f.label}
      {changed && <Badge tone="blue">değişti</Badge>}
    </span>
  )
  const resetBtn = changed ? (
    <button type="button" onClick={() => onChange(def)} className="text-xs font-bold text-ink-soft hover:text-brand" title="Bu alanı varsayılana döndür">
      Varsayılan
    </button>
  ) : undefined
  const s = typeof value === 'string' ? value : ''
  switch (f.type) {
    case 'text':
      return (
        <Field label={label} help={f.help} counter={f.max ? { n: s.length, max: f.max } : undefined} action={resetBtn}>
          <TextInput value={s} onChange={onChange} placeholder={f.placeholder} />
        </Field>
      )
    case 'textarea':
      return (
        <Field label={label} help={f.help} counter={f.max ? { n: s.length, max: f.max } : undefined} action={resetBtn}>
          <TextArea value={s} onChange={onChange} placeholder={f.placeholder} />
        </Field>
      )
    case 'list':
      return (
        <Field label={label} help={f.help} action={resetBtn}>
          <ListEditor value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} addLabel={f.add} multiline={f.multiline} />
        </Field>
      )
    case 'select':
      return (
        <Field label={label} help={f.help} action={resetBtn}>
          <Select value={s} onChange={onChange} options={f.options} />
        </Field>
      )
    case 'toggle':
      return <Toggle checked={!!value} onChange={onChange} label={f.label} help={f.help} />
    case 'json':
      return (
        <div>
          <JsonEditor label={f.label} value={value} onChange={onChange} rows={8} />
          {f.help && <p className="mt-1 text-xs font-semibold text-ink-soft">{f.help}</p>}
        </div>
      )
    case 'objlist':
      return (
        <Field label={label} help={f.help} action={resetBtn}>
          <ObjList fields={f.fields} value={Array.isArray(value) ? (value as Data[]) : []} onChange={onChange} add={f.add} itemLabel={f.itemLabel} />
        </Field>
      )
    case 'variant':
      return (
        <Field label={label} help={f.help} action={resetBtn}>
          <div className="grid gap-3 sm:grid-cols-2">
            {f.options.map((o) => {
              const on = value === o.value
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange(o.value)}
                  className={cx('flex flex-col rounded-2xl p-3 text-left ring-2 transition', on ? 'bg-brand-soft/60 ring-brand' : 'bg-white ring-line hover:ring-ink-soft/30')}
                >
                  {o.sketch && (
                    <span className="mb-3 flex flex-col gap-1 rounded-xl bg-white p-2 ring-1 ring-line" aria-hidden>
                      {o.sketch.map((row, i) => (
                        <span key={i} className="flex gap-1">
                          {row.split('|').map((cell, j) => (
                            <span key={j} className={cx('h-3 flex-1 rounded', cell.trim() === 'H' ? 'h-6 bg-brand/30' : cell.trim() === 'I' ? 'h-6 bg-ink/15' : cell.trim() === '.' ? 'bg-transparent' : 'bg-paper ring-1 ring-line')} />
                          ))}
                        </span>
                      ))}
                    </span>
                  )}
                  <span className="flex items-center gap-2 font-black">
                    <span className={cx('grid size-4 place-items-center rounded-full ring-2', on ? 'ring-brand' : 'ring-line')}>{on && <span className="size-2 rounded-full bg-brand" />}</span>
                    {o.label}
                  </span>
                  <span className="mt-1 text-xs font-semibold text-ink-soft">{o.desc}</span>
                </button>
              )
            })}
          </div>
        </Field>
      )
    case 'ids':
      return (
        <Field label={label} help={f.help} action={resetBtn}>
          <IdsPicker source={f.source} value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} />
        </Field>
      )
    case 'sections':
      return <SectionsOrder f={f} value={Array.isArray(value) ? (value as SectionToggle[]) : []} onChange={onChange} label={label} action={resetBtn} />
  }
}

function ObjList({ fields, value, onChange, add = 'Ekle', itemLabel = 'Öğe' }: { fields: SubField[]; value: Data[]; onChange: (v: unknown) => void; add?: string; itemLabel?: string }) {
  const set = (i: number, k: string, v: unknown) => onChange(value.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= value.length) return
    const next = value.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  return (
    <div className="space-y-3">
      {value.map((item, i) => (
        <div key={i} className="rounded-2xl bg-paper/70 p-3 ring-1 ring-line">
          <div className="mb-2 flex items-center gap-1">
            <span className="text-xs font-black text-ink-soft">
              {itemLabel} {i + 1}
            </span>
            <span className="flex-1" />
            <IconButton label="Yukarı" onClick={() => move(i, -1)} disabled={i === 0}>
              <ArrowUp size={14} />
            </IconButton>
            <IconButton label="Aşağı" onClick={() => move(i, 1)} disabled={i === value.length - 1}>
              <ArrowDown size={14} />
            </IconButton>
            <IconButton label="Sil" className="hover:text-bad" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <Trash2 size={14} />
            </IconButton>
          </div>
          <div className="space-y-2">
            {fields.map((sf) => {
              const v = item[sf.key]
              return (
                <Field key={sf.key} label={<span className="text-xs">{sf.label}</span>}>
                  {sf.type === 'list' ? (
                    <ListEditor value={Array.isArray(v) ? (v as string[]) : []} onChange={(x) => set(i, sf.key, x)} />
                  ) : sf.type === 'textarea' ? (
                    <TextArea value={typeof v === 'string' ? v : ''} onChange={(x) => set(i, sf.key, x)} placeholder={sf.placeholder} minRows={2} />
                  ) : (
                    <TextInput value={typeof v === 'string' ? v : ''} onChange={(x) => set(i, sf.key, x)} placeholder={sf.placeholder} />
                  )}
                </Field>
              )
            })}
          </div>
        </div>
      ))}
      <Button size="sm" icon={<Plus size={15} />} onClick={() => onChange([...value, Object.fromEntries(fields.map((f) => [f.key, f.type === 'list' ? [] : '']))])}>
        {add}
      </Button>
    </div>
  )
}

function SectionsOrder({ f, value, onChange, label, action }: { f: Extract<PageField, { type: 'sections' }>; value: SectionToggle[]; onChange: (v: unknown) => void; label: ReactNode; action?: ReactNode }) {
  // Tanımda olup değerde olmayan bölümler sona, görünür olarak eklenir
  const list: SectionToggle[] = [...value.filter((v) => f.options.some((o) => o.id === v.id)), ...f.options.filter((o) => !value.some((v) => v.id === o.id)).map((o) => ({ id: o.id, visible: true }))]
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= list.length) return
    const next = list.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  return (
    <Field label={label} help={f.help} action={action}>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-white ring-1 ring-line">
        {list.map((s, i) => {
          const o = f.options.find((x) => x.id === s.id)!
          return (
            <li key={s.id} className={cx('flex items-center gap-2 px-3 py-2', !s.visible && 'bg-paper/60')}>
              <span className="grid size-6 place-items-center rounded-full bg-paper text-[11px] font-black text-ink-soft ring-1 ring-line">{i + 1}</span>
              <span className={cx('min-w-0 flex-1', !s.visible && 'opacity-50')}>
                <span className="block text-sm font-extrabold">{o.label}</span>
                {o.desc && <span className="block truncate text-xs font-semibold text-ink-soft">{o.desc}</span>}
              </span>
              <IconButton label="Yukarı taşı" onClick={() => move(i, -1)} disabled={i === 0}>
                <ArrowUp size={15} />
              </IconButton>
              <IconButton label="Aşağı taşı" onClick={() => move(i, 1)} disabled={i === list.length - 1}>
                <ArrowDown size={15} />
              </IconButton>
              <IconButton label={s.visible ? 'Gizle' : 'Göster'} onClick={() => onChange(list.map((x, j) => (j === i ? { ...x, visible: !x.visible } : x)))}>
                {s.visible ? <Eye size={15} /> : <EyeOff size={15} />}
              </IconButton>
            </li>
          )
        })}
      </ul>
    </Field>
  )
}

function IdsPicker({ source, value, onChange }: { source: 'game' | 'interaction' | 'manipulative' | 'guide'; value: string[]; onChange: (v: unknown) => void }) {
  const { entries } = useEntries()
  const options = useMemo(() => itemsOf(source, entries).filter((it) => it.state !== 'hidden').map((it) => ({ value: it.ref, label: `${it.emoji} ${it.title}`, hint: it.desc })), [source, entries])
  return <MultiPicker value={value} onChange={onChange} options={options} placeholder="Ad yazarak arayın ve ekleyin…" />
}
