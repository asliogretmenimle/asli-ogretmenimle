/**
 * Oyun, etkileşim, manipülatif ve konu anlatımı düzenleyicisi.
 * Koddaki öğelerde yalnızca değişen alanlar kaydedilir (yama); panelden eklenenlerde tüm veri + HTML.
 */
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Eye, EyeOff, History, Plus, Save, Send, Sparkles, Trash2, Undo2 } from 'lucide-react'
import { ADMIN_PATH } from '../../cms/config'
import type { CmsEntry, CmsKind } from '../../cms/types'
import { gradesToRange } from '../../cms/overlay'
import type { Grade } from '../../data/types'
import { categoryInfo, type InteractionCategory } from '../../interactions/types'
import { deleteEntry, loadHtml, loadRevisions, restoreRevision, saveEntry, useEntries, type Revision } from '../api'
import { diffPatch, kindInfo, refTaken, stateInfo, type AdminItem } from '../catalog'
import { itemsOf } from '../pages/Library'
import { MultiPicker, OutcomePicker } from '../components/pickers'
import {
  Badge, Button, Callout, Card, Empty, Field, GradePicker, IconButton, JsonEditor, ListEditor, Select, TextArea, TextInput, cx, inputCls, isSlug, slugify, timeAgo, useConfirm, useSaveShortcut, useToast,
} from '../ui'

const HtmlFrame = lazy(() => import('../../cms/HtmlFrame').then((m) => ({ default: m.HtmlFrame })))

type Data = Record<string, unknown>
type FieldDef =
  | { key: string; label: string; type: 'text' | 'textarea' | 'emoji' | 'color'; help?: string; max?: number; placeholder?: string }
  | { key: string; label: string; type: 'grades' | 'gradeRange' | 'skills' | 'outcomes' | 'sections' | 'faq'; help?: string }
  | { key: string; label: string; type: 'list'; help?: string; add?: string; multiline?: boolean }
  | { key: string; label: string; type: 'category'; help?: string }
  | { key: string; label: string; type: 'ids'; source: CmsKind; help?: string }
  | { key: string; label: string; type: 'json'; help?: string }

interface Group {
  title: string
  desc?: string
  fields: FieldDef[]
}

const NAME: Partial<Record<CmsKind, string>> = { game: 'name', interaction: 'name', manipulative: 'name', guide: 'title' }

const SCHEMA: Partial<Record<CmsKind, Group[]>> = {
  game: [
    {
      title: 'Temel bilgiler',
      fields: [
        { key: 'name', label: 'Oyunun adı', type: 'text', max: 40 },
        { key: 'description', label: 'Kısa açıklama', type: 'textarea', help: 'Oyun kartında ve giriş ekranında görünür.', max: 200 },
        { key: 'emoji', label: 'Simge', type: 'emoji' },
        { key: 'color', label: 'Renk', type: 'color' },
        { key: 'grades', label: 'Sınıflar', type: 'grades', help: 'Oyun bu sınıfların listelerinde görünür; öğrenci giriş ekranında sınıfını seçer.' },
      ],
    },
    { title: 'Sınıflara göre içerik', desc: 'Giriş ekranında seçilen sınıfta ne çalışıldığı', fields: [{ key: 'skills', label: 'Her sınıfta ne çalışılıyor?', type: 'skills' }] },
    {
      title: 'Tanıtım ve pedagoji',
      fields: [
        { key: 'launch', label: 'Başlarken', type: 'textarea', help: 'Oyunu açan kısa hikâye ya da problem.' },
        { key: 'howTo', label: 'Nasıl oynanır?', type: 'list', add: 'Adım ekle' },
        { key: 'reflect', label: 'Düşün ve Paylaş', type: 'textarea', help: 'Oyun sonunda sorulan tek, açık uçlu soru.' },
        { key: 'bigIdea', label: 'Büyük fikir (öğretmen için)', type: 'textarea' },
      ],
    },
    {
      title: 'Bağlantılar',
      fields: [
        { key: 'outcomes', label: 'Öğrenme çıktıları', type: 'outcomes' },
        { key: 'strategies', label: 'Yakalanan stratejiler (öğretmen raporu)', type: 'list', add: 'Strateji ekle' },
      ],
    },
  ],
  interaction: [
    {
      title: 'Temel bilgiler',
      fields: [
        { key: 'name', label: 'Etkileşimin adı', type: 'text', max: 40 },
        { key: 'description', label: 'Öğrenci ne yapacak?', type: 'textarea', max: 200 },
        { key: 'emoji', label: 'Simge', type: 'emoji' },
        { key: 'color', label: 'Renk', type: 'color' },
        { key: 'category', label: 'Konu alanı', type: 'category' },
        { key: 'grades', label: 'Sınıflar', type: 'grades' },
      ],
    },
    { title: 'Sınıflara göre içerik', fields: [{ key: 'skills', label: 'Her sınıfta ne çalışılıyor?', type: 'skills' }] },
    {
      title: 'Tanıtım ve pedagoji',
      fields: [
        { key: 'launch', label: 'Başlarken', type: 'textarea' },
        { key: 'reflect', label: 'Düşün ve Paylaş', type: 'textarea' },
        { key: 'bigIdea', label: 'Büyük fikir (öğretmen için)', type: 'textarea' },
      ],
    },
    {
      title: 'Bağlantılar',
      fields: [
        { key: 'outcomes', label: 'Öğrenme çıktıları', type: 'outcomes' },
        { key: 'showUnder', label: 'Tema sayfasında şu çıktıların altında kart olarak göster', type: 'outcomes', help: 'Boş bırakılırsa yalnızca Etkileşimler sayfasında görünür.' },
        { key: 'cardLabel', label: 'Kart etiketi', type: 'text', placeholder: 'Mini konu anlatımı · simülasyon' },
      ],
    },
  ],
  manipulative: [
    {
      title: 'Temel bilgiler',
      fields: [
        { key: 'name', label: 'Manipülatifin adı', type: 'text', max: 40 },
        { key: 'description', label: 'Açıklama', type: 'textarea', max: 200 },
        { key: 'emoji', label: 'Simge', type: 'emoji' },
        { key: 'category', label: 'Konu alanı', type: 'category' },
        { key: 'grades', label: 'Önerilen sınıf aralığı', type: 'gradeRange' },
      ],
    },
  ],
  guide: [
    {
      title: 'Başlık ve arama motoru',
      fields: [
        { key: 'title', label: 'Sayfa başlığı (H1)', type: 'text', help: 'Arandığı biçimde, çoğunlukla soru olarak yazın.' },
        { key: 'seoTitle', label: 'Google başlığı', type: 'text', max: 60 },
        { key: 'description', label: 'Google açıklaması', type: 'textarea', max: 160 },
        { key: 'grades', label: 'Sınıflar', type: 'grades' },
        { key: 'outcomes', label: 'Öğrenme çıktıları', type: 'outcomes', help: 'Bu çıktıların etkinlikleri rehberde listelenir; rehber de o etkinliklerde görünür.' },
      ],
    },
    {
      title: 'İçerik',
      fields: [
        { key: 'intro', label: 'Kısa cevap (ilk paragraf)', type: 'textarea' },
        { key: 'sections', label: 'Bölümler', type: 'sections' },
        { key: 'faq', label: 'Sık sorulan sorular', type: 'faq' },
      ],
    },
    {
      title: 'Önerilen içerikler',
      fields: [
        { key: 'tools', label: 'Manipülatifler', type: 'ids', source: 'manipulative' },
        { key: 'games', label: 'Oyunlar', type: 'ids', source: 'game' },
        { key: 'interactions', label: 'Etkileşimler', type: 'ids', source: 'interaction' },
        { key: 'cta', label: 'Öne çıkan bağlantı (isteğe bağlı)', type: 'json', help: '{ "to": "/carpim-tablosu", "label": "…", "desc": "…" }' },
      ],
    },
  ],
}

const HTML_KINDS: CmsKind[] = ['game', 'interaction', 'manipulative']
const STRIP = ['id', 'slug', 'custom', 'cmsId']

const blank = (kind: CmsKind): Data =>
  kind === 'guide'
    ? { title: '', seoTitle: '', description: '', grades: [5], outcomes: [], intro: '', sections: [{ h: '', p: [''] }], faq: [] }
    : kind === 'manipulative'
      ? { name: '', description: '', emoji: '🧩', grades: '1–4', category: 'sayilar' }
      : { name: '', description: '', emoji: kind === 'game' ? '🎲' : '✨', color: '#d6457a', grades: [3], skills: {}, howTo: [], launch: '', reflect: '', bigIdea: '', outcomes: [], ...(kind === 'interaction' ? { category: 'sayilar' } : {}) }

const clean = (v: Data) => {
  const out = { ...v }
  for (const k of STRIP) delete out[k]
  return out
}

export function MetaEditorPage() {
  const { kind: kp = '', ref } = useParams()
  const kind = kp as CmsKind
  const { entries, loaded } = useEntries()
  if (!SCHEMA[kind]) return <Empty title="Bu tür bu ekrandan düzenlenemez" />
  if (!loaded) return <div className="h-80 animate-pulse rounded-2xl bg-white ring-1 ring-line" />
  const item = ref ? itemsOf(kind, entries).find((it) => it.ref === ref) : undefined
  if (ref && !item) return <Empty title="Öğe bulunamadı" desc="Silinmiş ya da adresi değişmiş olabilir." action={<Link to={`${ADMIN_PATH}`} className="font-bold text-brand">Genel bakışa dön</Link>} />
  return <Editor key={`${kind}:${ref ?? 'new'}:${item?.entry?.id ?? ''}`} kind={kind} item={item} />
}

function Editor({ kind, item }: { kind: CmsKind; item?: AdminItem }) {
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const { entries } = useEntries()
  const isNew = !item
  const isCustom = isNew || item?.entry?.origin === 'custom'
  const info = kindInfo[kind]
  const initial = useMemo(() => clean((item?.value as Data) ?? blank(kind)), [item, kind])
  const [form, setForm] = useState<Data>(initial)
  const [slug, setSlug] = useState(item?.ref ?? '')
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [html, setHtml] = useState<string | null>(isNew ? '' : null)
  const [htmlDirty, setHtmlDirty] = useState(false)
  const [busy, setBusy] = useState<'publish' | 'draft' | null>(null)
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }))
  const nameKey = NAME[kind] ?? 'name'
  const title = String(form[nameKey] ?? '') || (isNew ? `Yeni ${info.label.toLocaleLowerCase('tr')}` : item!.title)

  // Panelden eklenen HTML'li öğe: HTML'i ayrıca yükle
  useEffect(() => {
    if (!isNew && isCustom && HTML_KINDS.includes(kind) && item?.entry) loadHtml(item.entry.id).then(setHtml, () => setHtml(''))
  }, [isNew, isCustom, kind, item])

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(String(form[nameKey] ?? '')))
  }, [form, nameKey, slugTouched])

  const dirty = JSON.stringify(form) !== JSON.stringify(initial) || htmlDirty || (isCustom && slug !== (item?.ref ?? ''))
  const slugErr = isCustom ? (!slug ? 'Adres gerekli' : !isSlug(slug) ? 'Yalnızca küçük harf, rakam ve tire' : refTaken(kind, slug, entries, item?.entry?.id) ? 'Bu adres kullanılıyor' : null) : null
  const nameErr = !String(form[nameKey] ?? '').trim() ? 'Ad gerekli' : null

  const save = async (status: 'published' | 'draft') => {
    if (nameErr || slugErr) return toast(nameErr ?? slugErr, 'error')
    if (isCustom && HTML_KINDS.includes(kind) && !html?.trim()) return toast('HTML içeriği boş. Stüdyo ile üretin ya da HTML yapıştırın.', 'error')
    setBusy(status === 'published' ? 'publish' : 'draft')
    try {
      if (isCustom) {
        const saved = await saveEntry({
          id: item?.entry?.id,
          kind,
          ref: slug,
          origin: 'custom',
          status,
          hidden: item?.entry?.hidden ?? false,
          data: form,
          ...(HTML_KINDS.includes(kind) && (isNew || htmlDirty) ? { html } : {}),
        })
        setHtmlDirty(false)
        toast(status === 'published' ? 'Yayınlandı' : 'Taslak kaydedildi')
        if (isNew || saved.ref !== item?.ref) navigate(`${ADMIN_PATH}/duzenle/${kind}/${saved.ref}`, { replace: true })
      } else {
        const patch = diffPatch(item!.original as Data, { ...(item!.original as Data), ...form })
        if (!Object.keys(patch).length && !item!.entry?.hidden) {
          if (item!.entry) await deleteEntry(item!.entry.id)
          toast('Değişiklik yok: öğe orijinal hâlinde')
        } else {
          await saveEntry({ id: item!.entry?.id, kind, ref: item!.ref, origin: 'builtin', status, hidden: item!.entry?.hidden ?? false, data: patch })
          toast(status === 'published' ? 'Değişiklikler yayında' : 'Taslak kaydedildi (sitede henüz görünmez)')
        }
      }
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(null)
    }
  }
  useSaveShortcut(() => save('published'), dirty)

  const back = async () => {
    if (dirty && !(await confirm({ title: 'Kaydedilmemiş değişiklikler var', desc: 'Çıkarsanız değişiklikler kaybolur.', confirm: 'Çık', danger: true }))) return
    navigate(-1)
  }

  const toggleHidden = async () => {
    const hidden = !(item?.entry?.hidden ?? false)
    try {
      if (item?.entry) await saveEntry({ ...item.entry, hidden })
      else await saveEntry({ kind, ref: item!.ref, origin: 'builtin', hidden, data: {} })
      toast(hidden ? 'Sitede gizlendi' : 'Yeniden yayında')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }
  const revert = async () => {
    if (!item?.entry || !(await confirm({ title: 'Orijinale dönülsün mü?', desc: 'Bu öğe için yapılan tüm değişiklikler kaldırılır.', confirm: 'Orijinale dön' }))) return
    await deleteEntry(item.entry.id)
    toast('Orijinal hâline döndü')
  }
  const remove = async () => {
    if (!item?.entry || !(await confirm({ title: 'Kalıcı olarak silinsin mi?', desc: `“${title}” siteden kaldırılır ve bağlantısı çalışmaz.`, confirm: 'Sil', danger: true }))) return
    await deleteEntry(item.entry.id)
    toast('Silindi')
    navigate(kind === 'guide' ? `${ADMIN_PATH}/rehberler` : `${ADMIN_PATH}/${kind === 'game' ? 'oyunlar' : kind === 'interaction' ? 'etkilesimler' : 'manipulatifler'}`)
  }

  const st = item ? stateInfo[item.state] : null
  const publicHref = `${info.prefix}${item?.ref ?? slug}`
  const live = item && item.state !== 'draft' && item.state !== 'hidden'

  return (
    <div>
      {/* Üst çubuk */}
      <div className="sticky top-16 z-20 -mx-4 mb-6 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center gap-3">
          <IconButton label="Geri" onClick={back} className="size-10 ring-1 ring-line">
            <ArrowLeft size={18} />
          </IconButton>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-ink-soft">
              {info.label} {item && !isCustom && <span>· koddaki içerik</span>}
            </p>
            <h1 className="flex flex-wrap items-center gap-2 text-lg font-black sm:text-xl">
              <span className="truncate">{title}</span>
              {st && item!.state !== 'original' && <Badge tone={st.tone}>{st.label}</Badge>}
              {isNew && <Badge tone="violet">Yeni</Badge>}
              {dirty && <span className="size-2 rounded-full bg-amber-500" title="Kaydedilmemiş değişiklik" />}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {live && (
              <a href={publicHref} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-ink-soft hover:bg-white hover:text-ink">
                <ExternalLink size={16} />
                <span className="hidden sm:inline">Sitede aç</span>
              </a>
            )}
            <Button onClick={() => save('draft')} loading={busy === 'draft'} disabled={!dirty && item?.state !== 'draft' ? true : false} icon={<Save size={16} />}>
              Taslak
            </Button>
            <Button variant="primary" onClick={() => save('published')} loading={busy === 'publish'} disabled={!dirty && item?.state !== 'draft'} icon={<Send size={16} />}>
              Yayınla
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          {item?.state === 'draft' && <Callout tone="amber" title="Taslak">Bu değişiklikler henüz sitede görünmüyor. Hazır olduğunuzda “Yayınla”ya basın.</Callout>}
          {item?.state === 'hidden' && <Callout tone="red" title="Gizli">Bu içerik sitede görünmüyor ve bağlantısı açılmıyor.</Callout>}

          {isCustom && (
            <Card title="Adres" desc="Sitedeki bağlantı">
              <Field label="URL kısa adı" error={slugErr} help={item && slug !== item.ref ? 'Adres değişirse eski bağlantı çalışmaz.' : undefined}>
                <div className="flex items-stretch overflow-hidden rounded-xl ring-1 ring-line focus-within:ring-brand">
                  <span className="hidden items-center bg-paper px-3 text-sm font-bold text-ink-soft sm:flex">asliogretmenimle.com{info.prefix}</span>
                  <input
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true)
                      setSlug(slugify(e.target.value) + (e.target.value.endsWith('-') ? '-' : ''))
                    }}
                    className="min-w-0 flex-1 bg-white px-3 py-2 font-bold outline-none"
                  />
                </div>
              </Field>
            </Card>
          )}

          {SCHEMA[kind]!.map((g) => (
            <Card key={g.title} title={g.title} desc={g.desc}>
              <div className="grid gap-5 sm:grid-cols-2">
                {g.fields.map((f) => (
                  <div key={f.key} className={cx(f.type === 'emoji' || f.type === 'color' || f.type === 'category' ? '' : 'sm:col-span-2')}>
                    <FieldInput f={f} value={form[f.key]} onChange={(v) => set(f.key, v)} grades={(form.grades as Grade[]) ?? []} originalHint={!isCustom ? (item?.original as Data)?.[f.key] : undefined} />
                  </div>
                ))}
              </div>
            </Card>
          ))}

          {isCustom && HTML_KINDS.includes(kind) && (
            <Card
              title="İçerik (HTML)"
              desc="Stüdyo’da üretilen tek dosyalık sayfa. Site bunu güvenli bir çerçevede çalıştırır."
              action={
                item?.entry ? (
                  <Link to={`${ADMIN_PATH}/studyo?kayit=${item.entry.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-soft px-2.5 text-[13px] font-bold text-brand-ink hover:bg-brand/15">
                    <Sparkles size={14} />
                    Stüdyo’da düzenle
                  </Link>
                ) : undefined
              }
            >
              {html === null ? (
                <div className="h-40 animate-pulse rounded-xl bg-paper" />
              ) : (
                <TextArea
                  value={html}
                  onChange={(v) => {
                    setHtml(v)
                    setHtmlDirty(true)
                  }}
                  minRows={10}
                  spellCheck={false}
                  placeholder="<!doctype html> … (Stüdyo ile üretmek daha kolay)"
                  className="font-mono text-[12.5px]"
                />
              )}
              <p className="mt-2 text-xs font-semibold text-ink-soft">
                Köprü: <code>AO.grade</code> seçili sınıf, <code>AO.finish({'{'} stars, summary, insight {'}'})</code> bitiş ekranı, <code>AO.sound('ok')</code> ses.
              </p>
            </Card>
          )}
        </div>

        {/* Sağ sütun */}
        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <PreviewCard kind={kind} form={form} />
          {isCustom && HTML_KINDS.includes(kind) && html && <LivePreview kind={kind} html={html} grades={(form.grades as Grade[]) ?? []} />}
          {item && (
            <Card title="Durum" pad>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="font-bold text-ink-soft">Kaynak</dt>
                  <dd className="font-extrabold">{isCustom ? 'Panelden eklendi' : 'Koddaki içerik'}</dd>
                </div>
                {item.entry && (
                  <div className="flex justify-between gap-2">
                    <dt className="font-bold text-ink-soft">Son değişiklik</dt>
                    <dd className="text-right font-extrabold">
                      {timeAgo(item.entry.updated_at)}
                      {item.entry.updated_by_email && <span className="block text-xs font-semibold text-ink-soft">{item.entry.updated_by_email}</span>}
                    </dd>
                  </div>
                )}
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" icon={item.entry?.hidden ? <Eye size={14} /> : <EyeOff size={14} />} onClick={toggleHidden}>
                  {item.entry?.hidden ? 'Geri getir' : 'Sitede gizle'}
                </Button>
                {!isCustom && item.entry && (
                  <Button size="sm" icon={<Undo2 size={14} />} onClick={revert}>
                    Orijinale dön
                  </Button>
                )}
                {isCustom && (
                  <Button size="sm" variant="danger" icon={<Trash2 size={14} />} onClick={remove}>
                    Sil
                  </Button>
                )}
              </div>
            </Card>
          )}
          {item?.entry && <RevisionsCard entry={item.entry} />}
        </aside>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Alan çizimi
// ---------------------------------------------------------------------------
function FieldInput({ f, value, onChange, grades, originalHint }: { f: FieldDef; value: unknown; onChange: (v: unknown) => void; grades: Grade[]; originalHint?: unknown }) {
  const s = typeof value === 'string' ? value : ''
  const changed = originalHint !== undefined && JSON.stringify(originalHint) !== JSON.stringify(value)
  const label = (
    <span className="flex items-center gap-1.5">
      {f.label}
      {changed && <Badge tone="blue">değişti</Badge>}
    </span>
  )
  switch (f.type) {
    case 'text':
      return (
        <Field label={label} help={f.help} counter={f.max ? { n: s.length, max: f.max } : undefined}>
          <TextInput value={s} onChange={onChange} placeholder={f.placeholder} />
        </Field>
      )
    case 'textarea':
      return (
        <Field label={label} help={f.help} counter={f.max ? { n: s.length, max: f.max } : undefined}>
          <TextArea value={s} onChange={onChange} />
        </Field>
      )
    case 'emoji':
      return (
        <Field label={label} help="Bir emoji yapıştırın">
          <TextInput value={s} onChange={onChange} className="text-center text-2xl" maxLength={8} />
        </Field>
      )
    case 'color':
      return (
        <Field label={label}>
          <div className="flex items-center gap-2">
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(s) ? s : '#d6457a'} onChange={(e) => onChange(e.target.value)} className="h-10 w-14 cursor-pointer rounded-xl border border-line bg-white p-1" />
            <TextInput value={s} onChange={onChange} className="font-mono" />
          </div>
        </Field>
      )
    case 'grades':
      return (
        <Field label={label} help={f.help}>
          <GradePicker value={Array.isArray(value) ? (value as Grade[]) : []} onChange={onChange} />
        </Field>
      )
    case 'gradeRange': {
      const [a, b = a] = (s || '1–8').split('–').map(Number)
      return (
        <Field label={label} help="Manipülatifler ardışık bir sınıf aralığı için önerilir.">
          <div className="flex items-center gap-2">
            <Select value={String(a) as `${Grade}`} onChange={(v) => onChange(gradesToRange(range(Number(v), Math.max(Number(v), b))))} options={GRADE_OPTS} className="w-32" />
            <span className="font-bold text-ink-soft">–</span>
            <Select value={String(b) as `${Grade}`} onChange={(v) => onChange(gradesToRange(range(Math.min(a, Number(v)), Number(v))))} options={GRADE_OPTS} className="w-32" />
          </div>
        </Field>
      )
    }
    case 'category':
      return (
        <Field label={label}>
          <Select value={(s || 'sayilar') as InteractionCategory} onChange={onChange} options={(Object.keys(categoryInfo) as InteractionCategory[]).map((c) => ({ value: c, label: categoryInfo[c].label }))} />
        </Field>
      )
    case 'list':
      return (
        <Field label={label} help={f.help}>
          <ListEditor value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} addLabel={f.add} multiline={f.multiline} />
        </Field>
      )
    case 'outcomes':
      return (
        <Field label={label} help={f.help}>
          <OutcomePicker value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} grades={grades} />
        </Field>
      )
    case 'skills': {
      const rec = (value && typeof value === 'object' ? value : {}) as Record<string, string>
      return (
        <Field label={label} help={!grades.length ? 'Önce sınıf seçin.' : undefined}>
          <div className="space-y-2">
            {grades.map((g) => (
              <div key={g} className="flex items-start gap-2">
                <span className="mt-1.5 grid size-8 shrink-0 place-items-center rounded-lg bg-paper text-sm font-black ring-1 ring-line">{g}</span>
                <TextInput value={rec[g] ?? ''} onChange={(v) => onChange({ ...rec, [g]: v })} placeholder={`${g}. sınıfta ne çalışılıyor?`} />
              </div>
            ))}
          </div>
        </Field>
      )
    }
    case 'ids':
      return <IdsField f={f} value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} label={label} />
    case 'sections':
      return <SectionsField value={Array.isArray(value) ? (value as Section[]) : []} onChange={onChange} label={label} />
    case 'faq':
      return <FaqField value={Array.isArray(value) ? (value as Faq[]) : []} onChange={onChange} label={label} />
    case 'json':
      return (
        <div>
          <JsonEditor label={f.label} value={value ?? null} onChange={(v) => onChange(v === null ? undefined : v)} rows={4} />
          {f.help && <p className="mt-1 text-xs font-semibold text-ink-soft">{f.help}</p>}
        </div>
      )
  }
}

const GRADE_OPTS = ([1, 2, 3, 4, 5, 6, 7, 8] as const).map((g) => ({ value: `${g}` as `${Grade}`, label: `${g}. sınıf` }))
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => (a + i) as Grade)

function IdsField({ f, value, onChange, label }: { f: Extract<FieldDef, { type: 'ids' }>; value: string[]; onChange: (v: unknown) => void; label: ReactNode }) {
  const { entries } = useEntries()
  const options = useMemo(() => itemsOf(f.source, entries).map((it) => ({ value: it.ref, label: it.title, hint: it.desc })), [entries, f.source])
  return (
    <Field label={label} help={f.help}>
      <MultiPicker value={value} onChange={onChange} options={options} placeholder="Ara ve ekle…" />
    </Field>
  )
}

interface Section {
  h: string
  p: string[]
  list?: string[]
}
interface Faq {
  q: string
  a: string
}

function SectionsField({ value, onChange, label }: { value: Section[]; onChange: (v: unknown) => void; label: ReactNode }) {
  const set = (i: number, s: Section) => onChange(value.map((x, j) => (j === i ? s : x)))
  return (
    <Field label={label}>
      <div className="space-y-3">
        {value.map((s, i) => (
          <div key={i} className="rounded-2xl bg-paper/70 p-4 ring-1 ring-line">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-black text-ink-soft">Bölüm {i + 1}</span>
              <span className="flex-1" />
              <IconButton label="Bölümü sil" onClick={() => onChange(value.filter((_, j) => j !== i))} className="hover:text-bad">
                <Trash2 size={15} />
              </IconButton>
            </div>
            <div className="space-y-3">
              <Field label="Ara başlık (H2)">
                <TextInput value={s.h} onChange={(h) => set(i, { ...s, h })} />
              </Field>
              <Field label="Paragraflar">
                <ListEditor value={s.p ?? []} onChange={(p) => set(i, { ...s, p })} multiline addLabel="Paragraf ekle" />
              </Field>
              <Field label="Madde listesi (isteğe bağlı)">
                <ListEditor value={s.list ?? []} onChange={(list) => set(i, list.length ? { ...s, list } : { h: s.h, p: s.p })} addLabel="Madde ekle" />
              </Field>
            </div>
          </div>
        ))}
        <Button size="sm" icon={<Plus size={15} />} onClick={() => onChange([...value, { h: '', p: [''] }])}>
          Bölüm ekle
        </Button>
      </div>
    </Field>
  )
}

function FaqField({ value, onChange, label }: { value: Faq[]; onChange: (v: unknown) => void; label: ReactNode }) {
  const set = (i: number, s: Faq) => onChange(value.map((x, j) => (j === i ? s : x)))
  return (
    <Field label={label}>
      <div className="space-y-3">
        {value.map((s, i) => (
          <div key={i} className="flex gap-2 rounded-2xl bg-paper/70 p-3 ring-1 ring-line">
            <div className="min-w-0 flex-1 space-y-2">
              <TextInput value={s.q} onChange={(q) => set(i, { ...s, q })} placeholder="Soru" className="font-extrabold" />
              <TextArea value={s.a} onChange={(a) => set(i, { ...s, a })} placeholder="Cevap" minRows={2} />
            </div>
            <IconButton label="Soruyu sil" onClick={() => onChange(value.filter((_, j) => j !== i))} className="hover:text-bad">
              <Trash2 size={15} />
            </IconButton>
          </div>
        ))}
        <Button size="sm" icon={<Plus size={15} />} onClick={() => onChange([...value, { q: '', a: '' }])}>
          Soru ekle
        </Button>
      </div>
    </Field>
  )
}

// ---------------------------------------------------------------------------
// Sağ sütun
// ---------------------------------------------------------------------------
function PreviewCard({ kind, form }: { kind: CmsKind; form: Data }) {
  const name = String(form.name ?? form.title ?? '') || 'Adsız'
  const grades = Array.isArray(form.grades) ? (form.grades as number[]) : []
  const gr = typeof form.grades === 'string' ? `${form.grades}. sınıf` : grades.length ? (grades.length === 1 ? `${grades[0]}. sınıf` : `${grades[0]}–${grades[grades.length - 1]}. sınıf`) : ''
  if (kind === 'guide')
    return (
      <Card title="Google önizlemesi">
        <p className="truncate text-xs text-green-800">asliogretmenimle.com › rehber</p>
        <p className="mt-0.5 line-clamp-2 text-[17px] leading-snug text-[#1a0dab]">{String(form.seoTitle || form.title || 'Başlık')} | Aslı Öğretmenimle</p>
        <p className="mt-1 line-clamp-3 text-[13px] text-ink-soft">{String(form.description || 'Açıklama…')}</p>
      </Card>
    )
  return (
    <Card title="Sitedeki kart">
      <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: `${String(form.color || '#d6457a')}18` }}>
            {String(form.emoji || '✨')}
          </span>
          <div className="min-w-0">
            <p className="font-black">{name}</p>
            <p className="mt-0.5 line-clamp-3 text-sm font-semibold text-ink-soft">{String(form.description || '')}</p>
            {gr && <p className="mt-2 text-xs font-extrabold text-ink-soft">{gr}</p>}
          </div>
        </div>
      </div>
      {typeof form.launch === 'string' && form.launch && (
        <div className="mt-3 rounded-2xl bg-cream p-3">
          <p className="mb-1 text-[11px] font-black tracking-wide text-amber-800 uppercase">🌱 Başlarken</p>
          <p className="text-sm font-extrabold">{form.launch}</p>
        </div>
      )}
    </Card>
  )
}

function LivePreview({ kind, html, grades }: { kind: CmsKind; html: string; grades: Grade[] }) {
  const [open, setOpen] = useState(false)
  const [g, setG] = useState<number>(grades[0] ?? 3)
  return (
    <Card title="Canlı önizleme" action={<Button size="sm" variant={open ? 'secondary' : 'soft'} onClick={() => setOpen((o) => !o)}>{open ? 'Kapat' : 'Çalıştır'}</Button>}>
      {open ? (
        <div className="space-y-2">
          <select value={g} onChange={(e) => setG(Number(e.target.value))} className={cx(inputCls, 'h-9 py-1 text-sm')}>
            {([1, 2, 3, 4, 5, 6, 7, 8] as const).map((x) => (
              <option key={x} value={x}>
                {x}. sınıf olarak dene
              </option>
            ))}
          </select>
          <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-paper" />}>
            <HtmlFrame kind={kind as 'game'} grade={g} html={html} height="480px" />
          </Suspense>
        </div>
      ) : (
        <p className="text-sm font-semibold text-ink-soft">İçeriği burada deneyin. Tam boyut için yayınlayıp sitede açın ya da Stüdyo’yu kullanın.</p>
      )}
    </Card>
  )
}

function RevisionsCard({ entry }: { entry: CmsEntry }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [revs, setRevs] = useState<Revision[] | null>(null)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (open) loadRevisions({ entryId: entry.id, limit: 30 }).then(setRevs, () => setRevs([]))
  }, [open, entry.id, entry.updated_at])
  return (
    <Card title={<span className="flex items-center gap-2"><History size={16} />Geçmiş</span>} action={<Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>{open ? 'Gizle' : 'Göster'}</Button>}>
      {!open ? (
        <p className="text-sm font-semibold text-ink-soft">Bu öğedeki her kayıt saklanır; istediğiniz sürüme dönebilirsiniz.</p>
      ) : !revs ? (
        <div className="h-24 animate-pulse rounded-xl bg-paper" />
      ) : (
        <ul className="space-y-1.5">
          {revs.map((r, i) => (
            <li key={r.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-paper">
              <Badge tone={r.action === 'hide' || r.action === 'delete' ? 'red' : r.action === 'create' ? 'violet' : r.action === 'draft' ? 'amber' : 'blue'}>{ACTION[r.action] ?? r.action}</Badge>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink-soft">
                {timeAgo(r.created_at)} · {r.created_by_email ?? '—'}
              </span>
              {i > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (!(await confirm({ title: 'Bu sürüme dönülsün mü?', desc: 'Mevcut hâl de geçmişte saklanır.', confirm: 'Geri yükle' }))) return
                    try {
                      await restoreRevision(r)
                      toast('Geri yüklendi')
                    } catch (e) {
                      toast((e as Error).message, 'error')
                    }
                  }}
                >
                  Geri yükle
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export const ACTION: Record<string, string> = { create: 'Oluşturuldu', update: 'Güncellendi', hide: 'Gizlendi', restore: 'Geri getirildi', delete: 'Silindi', draft: 'Taslak', published: 'Yayınlandı' }
