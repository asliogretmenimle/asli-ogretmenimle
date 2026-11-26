/** Sayfa başlıkları ve açıklamaları: Google'da görünen metinleri sayfa sayfa değiştir */
import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { cachedActivity } from '../../data/activityStore'
import { gradeInfo, grades } from '../../data/curriculum'
import { baseSeoForPath, SITE_URL } from '../../lib/seo'
import type { SeoOverride } from '../../cms/seoOverrides'
import { deleteEntry, saveEntry, useEntries } from '../api'
import type { CmsEntry } from '../../cms/types'
import { Badge, Button, Callout, Field, IconButton, Modal, PageHead, TextArea, TextInput, Toggle, cx, inputCls, useConfirm, useToast } from '../ui'

const KEY_PAGES: { path: string; label: string }[] = [
  { path: '/', label: 'Ana sayfa' },
  { path: '/oyunlar', label: 'Oyunlar' },
  { path: '/etkilesimler', label: 'Etkileşimler' },
  { path: '/manipulatifler', label: 'Manipülatifler' },
  { path: '/rehber', label: 'Konu anlatımları' },
  { path: '/test', label: 'Test çöz' },
  { path: '/carpim-tablosu', label: 'Çarpım tablosu' },
  { path: '/yaklasim', label: 'Yaklaşımımız' },
  { path: '/online-ozel-ders', label: 'Online özel ders' },
  ...grades.map((g) => ({ path: `/sinif/${g}`, label: `${gradeInfo[g].label} matematik` })),
  ...grades.map((g) => ({ path: `/test/${g}`, label: `${gradeInfo[g].label} testi` })),
]

const normalize = (input: string) => {
  let p = input.trim()
  try {
    if (/^https?:\/\//.test(p)) p = new URL(p).pathname
  } catch {
    /* yol olarak kullan */
  }
  p = `/${p.replace(/^\/+/, '')}`.replace(/\/+$/, '')
  return p || '/'
}

export function SeoPage() {
  const { entries } = useEntries()
  const overrides = useMemo(() => new Map(entries.filter((e) => e.kind === 'seo').map((e) => [e.ref, e])), [entries])
  const [edit, setEdit] = useState<string | null>(null)
  const [custom, setCustom] = useState('')
  const extra = [...overrides.keys()].filter((p) => !KEY_PAGES.some((k) => k.path === p))
  const rows = [...extra.map((path) => ({ path, label: path })), ...KEY_PAGES]

  return (
    <div>
      <PageHead title="Sayfa başlıkları (SEO)" desc="Google’da görünen başlık ve açıklamayı sayfa sayfa değiştirin. Boş bıraktığınız alanlar için site otomatik metni kullanır." />
      <div className="mb-4">
        <Callout tone="blue">
          Değişiklikler sitede hemen uygulanır. Google’ın görmesi için arka planda yeniden derleme gerekir (Ayarlar → “Siteyi yeniden derle”); Google sayfayı birkaç gün içinde yeniden tarar.
        </Callout>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Başka bir sayfa: /oyun/balon ya da tam adres" className={cx(inputCls, 'max-w-md flex-1')} />
        <Button icon={<Plus size={16} />} disabled={!custom.trim()} onClick={() => setEdit(normalize(custom))}>
          Düzenle
        </Button>
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-white ring-1 ring-line">
        {rows.map(({ path, label }) => {
          const e = overrides.get(path)
          const base = baseSeoForPath(path, cachedActivity)
          const o = e?.data as SeoOverride | undefined
          return (
            <li key={path} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5">
                  <span className="font-extrabold">{label}</span>
                  <span className="text-xs font-bold text-ink-soft">{path}</span>
                  {e && <Badge tone="blue">Özel</Badge>}
                  {o?.noindex && <Badge tone="red">noindex</Badge>}
                </p>
                <p className="truncate text-[13px] font-semibold text-[#1a0dab]">{o?.title || base?.title || '—'}</p>
              </div>
              <IconButton label="Düzenle" onClick={() => setEdit(path)}>
                <Pencil size={16} />
              </IconButton>
            </li>
          )
        })}
      </ul>
      {edit && <SeoModal path={edit} entry={overrides.get(edit)} onClose={() => setEdit(null)} />}
    </div>
  )
}

function SeoModal({ path, entry, onClose }: { path: string; entry?: CmsEntry; onClose: () => void }) {
  const toast = useToast()
  const confirm = useConfirm()
  const base = baseSeoForPath(path, cachedActivity)
  const o = (entry?.data ?? {}) as SeoOverride
  const [title, setTitle] = useState(o.title ?? '')
  const [desc, setDesc] = useState(o.description ?? '')
  const [noindex, setNoindex] = useState(!!o.noindex)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      const data: SeoOverride = { ...(title.trim() ? { title: title.trim() } : {}), ...(desc.trim() ? { description: desc.trim() } : {}), ...(noindex ? { noindex: true } : {}) }
      if (!Object.keys(data).length) {
        if (entry) await deleteEntry(entry.id)
      } else await saveEntry({ id: entry?.id, kind: 'seo', ref: path, origin: 'custom', data })
      toast('Kaydedildi')
      onClose()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const shownTitle = title || base?.title || 'Başlık'
  const shownDesc = desc || base?.description || ''
  return (
    <Modal
      open
      onClose={onClose}
      title="Sayfa başlığı ve açıklaması"
      desc={path}
      size="lg"
      footer={
        <>
          {entry && (
            <Button
              variant="danger"
              icon={<Trash2 size={15} />}
              onClick={async () => {
                if (!(await confirm({ title: 'Otomatik metne dönülsün mü?', confirm: 'Dön' }))) return
                await deleteEntry(entry.id)
                onClose()
              }}
            >
              Otomatiğe dön
            </Button>
          )}
          <span className="flex-1" />
          <Button onClick={onClose}>Vazgeç</Button>
          <Button variant="primary" loading={busy} onClick={save}>
            Kaydet
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!base && <Callout tone="amber">Bu adres için otomatik bir başlık bulunamadı. Adresin doğru olduğundan emin olun.</Callout>}
        <Field label="Başlık" counter={{ n: title.length, max: 60 }} help={`Otomatik: ${base?.title ?? '—'}`}>
          <TextInput value={title} onChange={setTitle} placeholder={base?.title} />
        </Field>
        <Field label="Açıklama" counter={{ n: desc.length, max: 160 }} help="Google sonuçlarında başlığın altında görünen 1–2 cümle.">
          <TextArea value={desc} onChange={setDesc} placeholder={base?.description} />
        </Field>
        <Toggle checked={noindex} onChange={setNoindex} label="Google’da gösterme (noindex)" help="Sayfa sitede açılır ama arama sonuçlarında listelenmez." />
        <div className="rounded-2xl bg-paper p-4 ring-1 ring-line">
          <p className="mb-2 text-[11px] font-black tracking-wide text-ink-soft uppercase">Google önizlemesi</p>
          <p className="truncate text-xs text-green-800">{`${SITE_URL.replace('https://', '')}${path === '/' ? '' : path.replace(/\//g, ' › ')}`}</p>
          <p className="mt-0.5 line-clamp-1 text-[18px] leading-snug text-[#1a0dab]">{shownTitle}</p>
          <p className="mt-1 line-clamp-2 text-[13px] text-ink-soft">{shownDesc}</p>
        </div>
      </div>
    </Modal>
  )
}
