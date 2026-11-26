/**
 * Etkinlik / test düzenleyicisi
 *   /yonetim/duzenle/activity/:ref          → mevcut etkinlik (koddaki ya da panelden eklenen)
 *   /yonetim/yeni/activity?sinif=3&cikti=MAT.3.1.4&tip=quiz → yeni etkinlik
 *
 * Etkinlik kayıtları yama değil TAM nesnedir (bkz. cms/overlay.ts → overlayActivities).
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Braces, ChevronDown, ExternalLink, Eye, EyeOff, History, Save, Send, Star, Trash2, Undo2 } from 'lucide-react'
import type { Activity, ActivityType, Grade, Stage } from '../../data/types'
import { loadGradeRaw } from '../../data/activityStore'
import { gradeInfo, isGrade, outcomeByCode, themesByGrade } from '../../data/curriculum'
import { gradeOfActivityId } from '../../cms/overlay'
import type { CmsEntry } from '../../cms/types'
import { deleteEntry, loadRevisions, restoreRevision, saveEntry, useEntries, type Revision } from '../api'
import { activityTypeLabel, refTaken, stateInfo, type ItemState } from '../catalog'
import { Badge, Button, Callout, Card, Empty, Field, GradePicker, JsonEditor, Segmented, Tabs, TextArea, TextInput, cx, isSlug, slugify, timeAgo, useConfirm, useSaveShortcut, useToast } from '../ui'
import { NEW_TYPES, NOTATION_HINT, TypeEditor, templateFor, validate } from './activityFields'
import { ActivityPreview } from './activityPreview'

const STAGES: { value: Stage; label: string }[] = [
  { value: 'somut', label: 'Somut (yaparak)' },
  { value: 'model', label: 'Model (resimle)' },
  { value: 'sembol', label: 'Sembol' },
  { value: 'problem', label: 'Problem' },
]
type NewType = (typeof NEW_TYPES)[number]['value']
const isNewType = (t: string | null): t is NewType => NEW_TYPES.some((x) => x.value === t)

const backTo = (g: Grade | null) => (g ? `/yonetim/sinif/${g}?sekme=etkinlikler` : '/yonetim')

// ---------------------------------------------------------------------------
// Sayfa: parametreleri çözer, verileri yükler
// ---------------------------------------------------------------------------
export function ActivityEditorPage() {
  const { ref: paramRef } = useParams()
  const [sp] = useSearchParams()
  const isNew = !paramRef
  const qGrade = Number(sp.get('sinif'))
  const grade: Grade | null = isNew ? (isGrade(qGrade) ? qGrade : null) : gradeOfActivityId(paramRef ?? '')
  const outcome = sp.get('cikti') ?? ''
  const tip = sp.get('tip')
  const type: NewType = isNewType(tip) ? tip : 'quiz'

  const { entries, loaded } = useEntries()
  const [rawList, setRawList] = useState<Activity[] | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  useEffect(() => {
    setRawList(null)
    if (!grade) return
    let alive = true
    loadGradeRaw(grade).then(
      (l) => alive && setRawList(l),
      (e) => alive && setLoadErr((e as Error).message),
    )
    return () => {
      alive = false
    }
  }, [grade])

  useEffect(() => {
    document.title = isNew ? 'Yeni etkinlik · Yönetim' : `${paramRef} · Yönetim`
  }, [isNew, paramRef])

  if (isNew && (!grade || !outcome || !outcomeByCode.has(outcome) || outcomeByCode.get(outcome)!.theme.grade !== grade)) return <NewSetup grade={grade} outcome={outcome} type={type} />
  if (!grade) return <Empty title="Geçersiz etkinlik adresi" desc="Etkinlik kimlikleri “g3-…” biçiminde sınıf numarasıyla başlar." action={<Link to="/yonetim" className="font-extrabold text-brand">Panele dön</Link>} />
  if (loadErr) return <Callout tone="red" title="Etkinlikler yüklenemedi">{loadErr}</Callout>
  if (!rawList || !loaded) return <div className="grid h-72 place-items-center"><span className="size-10 animate-spin rounded-full border-4 border-line border-t-brand" aria-label="Yükleniyor" /></div>

  if (isNew) return <Editor key={`new-${grade}-${outcome}-${type}`} grade={grade} rawList={rawList} entries={entries} initial={templateFor(type, '', outcome)} isNew />

  const ref = paramRef!
  const raw = rawList.find((a) => a.id === ref)
  const entry = entries.find((e) => e.kind === 'activity' && e.ref === ref)
  if (!raw && !entry) return <Empty title="Etkinlik bulunamadı" desc={`“${ref}” adında bir etkinlik yok. Silinmiş olabilir.`} action={<Link to={backTo(grade)} className="font-extrabold text-brand">Sınıfa dön</Link>} />
  const initial = entry ? ({ ...(entry.data as Activity), id: ref } as Activity) : raw!
  return <Editor key={ref} grade={grade} rawList={rawList} entries={entries} initial={initial} raw={raw} entry={entry} />
}

// ---------------------------------------------------------------------------
// Yeni etkinlik: sınıf, tür ve öğrenme çıktısı seçimi
// ---------------------------------------------------------------------------
function NewSetup({ grade, outcome, type }: { grade: Grade | null; outcome: string; type: NewType }) {
  const navigate = useNavigate()
  const [g, setG] = useState<Grade | null>(grade)
  const [t, setT] = useState<NewType>(type)
  const [o, setO] = useState(outcome && outcomeByCode.get(outcome)?.theme.grade === grade ? outcome : '')
  const go = () => g && o && navigate(`/yonetim/yeni/activity?sinif=${g}&cikti=${encodeURIComponent(o)}&tip=${t}`, { replace: true })
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to={backTo(grade)} className="inline-flex items-center gap-1.5 text-sm font-extrabold text-ink-soft hover:text-ink">
        <ArrowLeft size={16} /> Geri
      </Link>
      <div>
        <h1 className="text-2xl font-black">Yeni etkinlik</h1>
        <p className="mt-1 text-sm font-semibold text-ink-soft">Türünü ve bağlı olduğu öğrenme çıktısını seçin; ardından soruları yazın. Önizleme sağda canlı görünür.</p>
      </div>
      <Card title="1. Tür">
        <div className="grid gap-2 sm:grid-cols-3">
          {NEW_TYPES.map((x) => (
            <button
              key={x.value}
              type="button"
              onClick={() => setT(x.value)}
              aria-pressed={t === x.value}
              className={cx('flex items-start gap-3 rounded-2xl p-3 text-left ring-1 transition', t === x.value ? 'bg-brand-soft ring-brand/40' : 'bg-white ring-line hover:bg-paper')}
            >
              <span className="text-2xl">{x.emoji}</span>
              <span>
                <span className="block font-black">{x.label}</span>
                <span className="block text-xs font-semibold text-ink-soft">{x.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </Card>
      <Card title="2. Sınıf">
        <GradePicker value={g ? [g] : []} onChange={(v) => { setG(v[0] ?? null); setO('') }} single />
      </Card>
      {g && (
        <Card title="3. Öğrenme çıktısı" desc="Etkinlik bu çıktının sayfasında, öğrenme yolunda görünür.">
          <OutcomePicker grade={g} value={o ? [o] : []} onChange={(v) => setO(v[v.length - 1] ?? '')} single />
        </Card>
      )}
      <div className="flex justify-end">
        <Button variant="primary" size="lg" disabled={!g || !o} onClick={go}>
          Devam et
        </Button>
      </div>
    </div>
  )
}

/** Sınıfın öğrenme çıktıları, temalara göre */
function OutcomePicker({ grade, value, onChange, single }: { grade: Grade; value: string[]; onChange: (v: string[]) => void; single?: boolean }) {
  const [q, setQ] = useState('')
  const themes = themesByGrade(grade)
  const key = (s: string) => s.toLocaleLowerCase('tr')
  return (
    <div className="space-y-2">
      <TextInput value={q} onChange={setQ} placeholder="Çıktı ara: kesir, alan, MAT.5.1…" />
      <div className="max-h-80 space-y-3 overflow-y-auto rounded-xl bg-paper/60 p-2 ring-1 ring-line">
        {themes.map((th) => {
          const list = th.outcomes.filter((oc) => !q || key(`${oc.code} ${oc.short} ${oc.title}`).includes(key(q)))
          if (!list.length) return null
          return (
            <div key={th.slug}>
              <p className="px-1 pb-1 text-[11px] font-black tracking-wide text-ink-soft uppercase">{th.title}</p>
              <div className="space-y-1">
                {list.map((oc) => {
                  const i = value.indexOf(oc.code)
                  const on = i >= 0
                  return (
                    <button
                      key={oc.code}
                      type="button"
                      title={oc.title}
                      aria-pressed={on}
                      onClick={() => onChange(single ? [oc.code] : on ? value.filter((c) => c !== oc.code) : [...value, oc.code])}
                      className={cx('flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition', on ? 'bg-white ring-1 ring-brand/40' : 'hover:bg-white')}
                    >
                      <span className={cx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-md text-[10px] font-black ring-1', on ? 'bg-brand text-white ring-brand' : 'bg-white ring-line')}>{on ? (single ? '✓' : i + 1) : ''}</span>
                      <span className="min-w-0">
                        <span className="font-mono text-xs font-bold text-ink-soft">{oc.code}</span> <span className="font-bold">{oc.short}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Düzenleyici
// ---------------------------------------------------------------------------
/** Kaydedilecek temiz nesne: boş alanlar ve boş geri bildirimler atılır */
function clean(a: Activity, id: string): Activity {
  const out = JSON.parse(JSON.stringify({ ...a, id })) as Activity
  if (out.type === 'quiz')
    out.questions?.forEach((q) => {
      if (q.feedback) {
        q.feedback = q.feedback.map((f) => (f && f.trim() ? f : null))
        if (!q.feedback.some(Boolean)) delete q.feedback
      }
      if (q.reasons && !q.reasons.some((r) => r.trim())) delete q.reasons
      if (!q.explain?.trim()) delete q.explain
    })
  if (!out.launch) out.launch = { text: '' }
  return out
}

function Editor({ grade, rawList, entries, initial, raw, entry, isNew }: { grade: Grade; rawList: Activity[]; entries: CmsEntry[]; initial: Activity; raw?: Activity; entry?: CmsEntry; isNew?: boolean }) {
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const [draft, setDraft] = useState<Activity>(initial)
  const [baseline, setBaseline] = useState(() => (isNew ? '' : JSON.stringify(clean(initial, initial.id))))
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [tab, setTab] = useState<'form' | 'json'>('form')
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit')
  const [busy, setBusy] = useState<string | null>(null)
  const [showIssues, setShowIssues] = useState(false)

  const autoSlug = slugify(draft.title || '')
  const effSlug = slugTouched ? slug : autoSlug
  const ref = isNew ? `g${grade}-${effSlug}` : initial.id
  const cleaned = useMemo(() => clean(draft, ref), [draft, ref])
  const dirty = JSON.stringify(cleaned) !== baseline
  const issues = useMemo(() => validate(cleaned), [cleaned])

  const slugError = !isNew
    ? null
    : !effSlug
      ? 'Bir adres yazın.'
      : !isSlug(effSlug)
        ? 'Yalnızca küçük harf, rakam ve tire kullanın.'
        : rawList.some((a) => a.id === ref) || refTaken('activity', ref, entries)
          ? 'Bu adres zaten kullanılıyor.'
          : null

  const state: ItemState = isNew ? 'custom' : !entry ? 'original' : entry.hidden ? 'hidden' : entry.status === 'draft' ? 'draft' : entry.origin === 'custom' ? 'custom' : 'edited'
  const set = (a: Activity) => setDraft(a)
  const patch = (p: Partial<Activity>) => setDraft((a) => ({ ...a, ...p }) as Activity)

  // Kaydedilmemiş değişiklikle sayfayı kapatma uyarısı
  useEffect(() => {
    if (!dirty) return
    const on = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', on)
    return () => window.removeEventListener('beforeunload', on)
  }, [dirty])

  async function save(status: 'published' | 'draft') {
    if (isNew && slugError) {
      toast(slugError, 'error')
      return
    }
    if (status === 'published' && issues.length) {
      setShowIssues(true)
      toast(`Yayınlamadan önce ${issues.length} sorunu düzeltin.`, 'error')
      return
    }
    setBusy(status)
    try {
      const saved = await saveEntry({
        id: entry?.id,
        kind: 'activity',
        ref,
        origin: raw ? 'builtin' : 'custom',
        status,
        hidden: entry?.hidden ?? false,
        data: cleaned as unknown as Record<string, unknown>,
        grade,
      })
      setBaseline(JSON.stringify(cleaned))
      toast(status === 'published' ? 'Yayınlandı. Sitede hemen görünür.' : 'Taslak kaydedildi (sitede görünmez).')
      if (isNew) navigate(`/yonetim/duzenle/activity/${saved.ref}`, { replace: true })
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(null)
    }
  }
  useSaveShortcut(() => save(entry?.status === 'draft' || isNew ? 'draft' : 'published'))

  async function toggleHidden() {
    const hide = !entry?.hidden
    if (hide && !(await confirm({ title: 'Etkinlik gizlensin mi?', desc: 'Etkinlik sitede listelerden ve testlerden kalkar, adresi açılmaz. İstediğiniz zaman geri getirebilirsiniz.', confirm: 'Gizle', danger: true }))) return
    setBusy('hide')
    try {
      if (entry) await saveEntry({ ...entry, hidden: hide })
      else await saveEntry({ kind: 'activity', ref, origin: 'builtin', status: 'published', hidden: true, data: (raw ?? cleaned) as unknown as Record<string, unknown>, grade })
      toast(hide ? 'Etkinlik gizlendi.' : 'Etkinlik yeniden yayında.')
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(null)
    }
  }

  async function revert() {
    if (!entry || !raw) return
    if (!(await confirm({ title: 'Orijinale dönülsün mü?', desc: 'Bu etkinlikte panelden yaptığınız tüm değişiklikler silinir ve koddaki hâline döner. (Geçmişten yine geri yükleyebilirsiniz.)', confirm: 'Orijinale dön', danger: true }))) return
    setBusy('revert')
    try {
      await deleteEntry(entry.id)
      setDraft(raw)
      setBaseline(JSON.stringify(clean(raw, raw.id)))
      toast('Orijinal hâline döndü.')
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    if (!entry) return
    if (!(await confirm({ title: 'Etkinlik silinsin mi?', desc: 'Panelden eklenen bu etkinlik kalıcı olarak silinir. Geçmişten geri yüklenebilir.', confirm: 'Sil', danger: true }))) return
    setBusy('delete')
    try {
      await deleteEntry(entry.id)
      toast('Etkinlik silindi.')
      navigate(backTo(grade), { replace: true })
    } catch (e) {
      toast((e as Error).message, 'error')
      setBusy(null)
    }
  }

  async function goBack() {
    if (dirty && !(await confirm({ title: 'Kaydedilmemiş değişiklikler var', desc: 'Çıkarsanız değişiklikler kaybolur.', confirm: 'Kaydetmeden çık', danger: true }))) return
    navigate(backTo(grade))
  }

  const live = !isNew && !!entry ? !entry.hidden && entry.status === 'published' : !isNew
  const theme = outcomeByCode.get(draft.outcomes?.[0] ?? '')?.theme

  return (
    <div className="space-y-5">
      {/* Üst çubuk */}
      <div className="sticky top-[4.5rem] z-20 flex flex-wrap lg:top-2 items-center gap-2 rounded-2xl bg-white/95 px-3 py-2.5 shadow-sm ring-1 ring-line backdrop-blur sm:px-4">
        <button type="button" onClick={goBack} className="grid size-9 shrink-0 place-items-center rounded-xl text-ink-soft ring-1 ring-line hover:bg-paper hover:text-ink" aria-label="Geri">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold text-ink-soft">
            {gradeInfo[grade].label}
            {theme ? ` · ${theme.title}` : ''} · {activityTypeLabel[draft.type]}
          </p>
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-base font-black sm:text-lg">{draft.title || 'Adsız etkinlik'}</h1>
            <Badge tone={stateInfo[state].tone}>{isNew ? 'Yeni (kaydedilmedi)' : stateInfo[state].label}</Badge>
            {dirty && <span className="size-2 shrink-0 rounded-full bg-amber-400" title="Kaydedilmemiş değişiklik" />}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {live ? (
            <a href={`/etkinlik/${ref}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-ink-soft hover:bg-paper hover:text-ink">
              <ExternalLink size={16} />
              <span className="hidden md:inline">Sitede aç</span>
            </a>
          ) : (
            <span className="inline-flex h-10 cursor-not-allowed items-center gap-1.5 px-3 text-sm font-bold text-ink-soft/50" title="Yayında değil">
              <ExternalLink size={16} />
              <span className="hidden md:inline">Sitede aç</span>
            </span>
          )}
          {!isNew && raw && entry && (
            <Button variant="ghost" icon={<Undo2 size={16} />} onClick={revert} loading={busy === 'revert'} title="Koddaki hâline dön">
              <span className="hidden lg:inline">Orijinale dön</span>
            </Button>
          )}
          {!isNew && (raw || entry) && (
            <Button variant="ghost" icon={entry?.hidden ? <Eye size={16} /> : <EyeOff size={16} />} onClick={toggleHidden} loading={busy === 'hide'}>
              <span className="hidden lg:inline">{entry?.hidden ? 'Geri getir' : 'Gizle'}</span>
            </Button>
          )}
          {!isNew && !raw && entry && (
            <Button variant="ghost" className="hover:text-bad" icon={<Trash2 size={16} />} onClick={remove} loading={busy === 'delete'}>
              <span className="hidden lg:inline">Sil</span>
            </Button>
          )}
          <Button icon={<Save size={16} />} onClick={() => save('draft')} loading={busy === 'draft'} disabled={!dirty && !isNew && entry?.status === 'draft'}>
            <span className="hidden sm:inline">Taslak kaydet</span>
          </Button>
          <Button variant="primary" icon={<Send size={16} />} onClick={() => save('published')} loading={busy === 'published'} disabled={!dirty && !isNew && entry?.status === 'published'}>
            Yayınla
          </Button>
        </div>
      </div>

      {entry?.hidden && <Callout tone="amber" title="Bu etkinlik gizli">Sitede görünmüyor. “Geri getir” ile yeniden yayına alabilirsiniz.</Callout>}
      {entry?.status === 'draft' && !entry.hidden && <Callout tone="amber" title="Taslak">{raw ? 'Sitede hâlâ orijinal hâli görünüyor.' : 'Sitede görünmüyor.'} Hazır olunca “Yayınla”ya basın.</Callout>}

      {/* Mobil: düzenle / önizle */}
      <div className="xl:hidden">
        <Segmented
          value={mobileView}
          onChange={setMobileView}
          options={[
            { value: 'edit', label: 'Düzenle' },
            { value: 'preview', label: 'Önizleme' },
          ]}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(380px,480px)]">
        <div className={cx('min-w-0 space-y-5', mobileView === 'preview' && 'max-xl:hidden')}>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'form', label: 'Form' },
              { value: 'json', label: <><Braces size={14} /> Gelişmiş: JSON</> },
            ]}
          />

          {(showIssues || issues.length > 0) && issues.length > 0 && (
            <Callout tone={showIssues ? 'red' : 'amber'} title={`${issues.length} eksik var`}>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {issues.slice(0, 8).map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
                {issues.length > 8 && <li>… ve {issues.length - 8} tane daha</li>}
              </ul>
            </Callout>
          )}

          {tab === 'json' ? (
            <Card title="Etkinliğin tamamı (JSON)" desc="Deneyimli kullanıcılar için. Geçerli JSON yazdığınızda form ve önizleme hemen güncellenir.">
              <JsonEditor
                value={cleaned}
                rows={28}
                onChange={(v) => {
                  if (v && typeof v === 'object' && 'type' in (v as object)) setDraft({ ...(v as Activity), id: draft.id })
                }}
              />
            </Card>
          ) : (
            <>
              <Card title="Temel bilgiler">
                <div className="space-y-4">
                  <Field label="Başlık" counter={{ n: draft.title.length, max: 60 }}>
                    <TextInput value={draft.title} onChange={(title) => patch({ title })} placeholder="Ör. Kesirleri karşılaştıralım" />
                  </Field>
                  {isNew && (
                    <Field
                      label="Adres (URL)"
                      error={slugError}
                      help={
                        <>
                          asliogretmenimle.com/etkinlik/<b>{ref}</b>
                        </>
                      }
                    >
                      <div className="flex items-center">
                        <span className="flex h-[42px] items-center rounded-l-xl border border-r-0 border-line bg-paper px-3 font-mono text-sm font-bold text-ink-soft">g{grade}-</span>
                        <TextInput
                          value={effSlug}
                          onChange={(v) => {
                            setSlugTouched(true)
                            setSlug(slugify(v.replace(/-$/, '')) + (v.endsWith('-') ? '-' : ''))
                          }}
                          className="rounded-l-none font-mono"
                          placeholder="kesirleri-karsilastir"
                        />
                      </div>
                    </Field>
                  )}
                  <Field label="Yönerge" help={`Etkinliğin üstünde gösterilen kısa talimat. ${NOTATION_HINT}`}>
                    <TextInput value={draft.instructions} onChange={(instructions) => patch({ instructions })} placeholder="Ör. Doğru cevabı seç." />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Aşama" help="Van de Walle: somuttan soyuta">
                      <div className="flex flex-wrap gap-1.5">
                        {STAGES.map((s) => (
                          <button
                            key={s.value}
                            type="button"
                            aria-pressed={draft.stage === s.value}
                            onClick={() => patch({ stage: s.value })}
                            className={cx('rounded-xl px-2.5 py-1.5 text-xs font-extrabold ring-1 transition', draft.stage === s.value ? 'bg-ink text-white ring-ink' : 'bg-white text-ink-soft ring-line hover:text-ink')}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Zorluk">
                      <Segmented
                        value={String(draft.level ?? 1) as '1' | '2' | '3'}
                        onChange={(v) => patch({ level: Number(v) as 1 | 2 | 3 })}
                        options={[
                          { value: '1', label: 'Kolay' },
                          { value: '2', label: 'Orta' },
                          { value: '3', label: 'Zor' },
                        ]}
                      />
                    </Field>
                  </div>
                  <Field label="Tür">
                    <Badge tone="pink" className="text-xs">
                      {activityTypeLabel[draft.type as ActivityType]}
                    </Badge>
                  </Field>
                  <OutcomesField grade={grade} value={draft.outcomes ?? []} onChange={(outcomes) => patch({ outcomes })} />
                </div>
              </Card>

              <Card title="Başlarken ve Düşün-Paylaş" desc="Etkinliğin öncesindeki kısa problem ve sonrasındaki açık uçlu soru.">
                <div className="space-y-4">
                  <Field label="🌱 Başlarken" help="Boş bırakılırsa etkinlik doğrudan başlar.">
                    <TextArea value={draft.launch?.text ?? ''} onChange={(text) => patch({ launch: { ...draft.launch, text } })} placeholder="Ör. Ali pizzanın 3/4’ünü, Ayşe 2/3’ünü yedi. Kim daha çok yedi?" />
                  </Field>
                  {draft.launch?.visual && (
                    <details className="rounded-xl bg-paper px-3 py-2 text-xs">
                      <summary className="cursor-pointer font-extrabold text-ink-soft">🖼️ Başlarken görseli var ({draft.launch.visual.kind}) — düzenle</summary>
                      <div className="pt-2">
                        <JsonEditor value={draft.launch.visual} rows={6} onChange={(v) => patch({ launch: { text: draft.launch.text, ...(v ? { visual: v as never } : {}) } })} />
                      </div>
                    </details>
                  )}
                  <Field label="💬 Düşün ve Paylaş" help="Tek, açık uçlu soru.">
                    <TextArea value={draft.reflect ?? ''} onChange={(reflect) => patch({ reflect })} placeholder="Ör. Paydalar farklıyken kesirleri nasıl karşılaştırırsın? Bir arkadaşına anlat." />
                  </Field>
                </div>
              </Card>

              <Card title={draft.type === 'quiz' ? 'Sorular' : draft.type === 'categorize' ? 'Gruplar ve kartlar' : draft.type === 'manipulative' ? 'Görevler' : 'İçerik'}>
                <TypeEditor a={draft} set={set} />
              </Card>

              {entry && <HistoryCard entry={entry} onRestored={(e) => { const a = { ...(e.data as Activity), id: ref } as Activity; setDraft(a); setBaseline(JSON.stringify(clean(a, ref))) }} />}
            </>
          )}
        </div>

        <aside className={cx('min-w-0', mobileView === 'edit' && 'max-xl:hidden')}>
          <div className="xl:sticky xl:top-24">
            <Card title="Önizleme" desc="Öğrencinin göreceği hâli: deneyebilirsiniz." pad={false}>
              <div className="p-3 sm:p-4">
                <ActivityPreview activity={cleaned} />
              </div>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  )
}

function OutcomesField({ grade, value, onChange }: { grade: Grade; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Field label="Öğrenme çıktısı" help="İlk çıktı ana çıktıdır: etkinlik o çıktının öğrenme yolunda görünür. ⭐ ile ana yapabilirsiniz.">
      <div className="space-y-2">
        {value.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {value.map((c, i) => {
              const oc = outcomeByCode.get(c)
              return (
                <span key={c} className={cx('inline-flex max-w-full items-center gap-1 rounded-xl py-1 pr-1 pl-2 text-xs font-bold ring-1', i === 0 ? 'bg-brand-soft text-brand-ink ring-brand/30' : 'bg-white ring-line')}>
                  {i === 0 ? <Star size={12} className="shrink-0 fill-current" /> : (
                    <button type="button" title="Ana çıktı yap" aria-label="Ana çıktı yap" onClick={() => onChange([c, ...value.filter((x) => x !== c)])} className="text-ink-soft hover:text-brand">
                      <Star size={12} />
                    </button>
                  )}
                  <span className="font-mono">{c}</span>
                  <span className="truncate">{oc?.short ?? '(bu sınıfta yok)'}</span>
                  <button type="button" aria-label="Kaldır" onClick={() => onChange(value.filter((x) => x !== c))} className="grid size-5 place-items-center rounded-md hover:bg-black/5">
                    ×
                  </button>
                </span>
              )
            })}
          </div>
        ) : (
          <p className="text-xs font-bold text-bad">Henüz çıktı seçilmedi.</p>
        )}
        <Button size="sm" variant="ghost" icon={<ChevronDown size={14} className={cx('transition', open && 'rotate-180')} />} onClick={() => setOpen((o) => !o)}>
          {open ? 'Listeyi kapat' : 'Çıktı ekle / değiştir'}
        </Button>
        {open && <OutcomePicker grade={grade} value={value} onChange={onChange} />}
      </div>
    </Field>
  )
}

const actionLabel: Record<string, string> = { create: 'Oluşturuldu', update: 'Güncellendi', hide: 'Gizlendi', restore: 'Geri getirildi', published: 'Yayınlandı', draft: 'Taslağa alındı', delete: 'Silindi' }

function HistoryCard({ entry, onRestored }: { entry: CmsEntry; onRestored: (e: CmsEntry) => void }) {
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<Revision[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const toast = useToast()
  const confirm = useConfirm()
  useEffect(() => {
    if (!open) return
    let alive = true
    setList(null)
    loadRevisions({ entryId: entry.id, limit: 30 }).then(
      (l) => alive && setList(l),
      (e) => alive && setErr((e as Error).message),
    )
    return () => {
      alive = false
    }
  }, [open, entry.id, entry.updated_at])

  async function restore(r: Revision) {
    if (!(await confirm({ title: 'Bu sürüme dönülsün mü?', desc: `${new Date(r.created_at).toLocaleString('tr-TR')} tarihindeki hâli geri yüklenir ve yayın durumu o andaki gibi olur.`, confirm: 'Geri yükle' }))) return
    setBusy(r.id)
    try {
      const saved = await restoreRevision(r)
      onRestored(saved)
      toast('Sürüm geri yüklendi.')
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card
      title={
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-2">
          <History size={16} /> Geçmiş
          <ChevronDown size={16} className={cx('text-ink-soft transition', open && 'rotate-180')} />
        </button>
      }
      desc={`Son değişiklik ${timeAgo(entry.updated_at)}${entry.updated_by_email ? ` · ${entry.updated_by_email}` : ''}`}
      pad={open}
    >
      {open &&
        (err ? (
          <p className="text-sm font-bold text-bad">{err}</p>
        ) : !list ? (
          <p className="text-sm font-semibold text-ink-soft">Yükleniyor…</p>
        ) : !list.length ? (
          <p className="text-sm font-semibold text-ink-soft">Kayıt yok.</p>
        ) : (
          <ul className="divide-y divide-line">
            {list.map((r, i) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-extrabold">
                    {actionLabel[r.action] ?? r.action}
                    {i === 0 && <Badge tone="green" className="ml-2">Şu anki</Badge>}
                  </p>
                  <p className="truncate text-xs font-semibold text-ink-soft">
                    {new Date(r.created_at).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}
                    {r.created_by_email ? ` · ${r.created_by_email}` : ''}
                    {r.snapshot?.data?.title ? ` · “${String(r.snapshot.data.title)}”` : ''}
                  </p>
                </div>
                {i > 0 && r.snapshot && (
                  <Button size="sm" onClick={() => restore(r)} loading={busy === r.id}>
                    Bu sürüme dön
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ))}
    </Card>
  )
}
