/** Stüdyo'daki sürümü sitede yayınlama penceresi */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy, ExternalLink, Pencil, Rocket, TriangleAlert } from 'lucide-react'
import type { Grade } from '../../data/types'
import type { CmsKind } from '../../cms/types'
import { categoryInfo } from '../../interactions/types'
import { loadSetting, saveEntry, triggerDeploy, useEntries, type StudioSettings } from '../api'
import { kindInfo, refTaken } from '../catalog'
import { Button, Callout, Field, GradePicker, ListEditor, Modal, Select, TextArea, TextInput, cx, isSlug, slugify, useToast } from '../ui'
import { buildQuizActivity, kindMeta, outcomeOptions, type Category, type StudioKind, type StudioMeta, type StudioSession, type StudioVersion } from './model'

const DOMAIN = 'asliogretmenimle.com'
const CATS = Object.entries(categoryInfo).map(([value, c]) => ({ value: value as Category, label: c.label }))

export function PublishDialog({
  session,
  version,
  onClose,
  onPublished,
}: {
  session: StudioSession
  version: StudioVersion
  onClose: () => void
  onPublished: (entryId: string, meta: StudioMeta) => void | Promise<void>
}) {
  const toast = useToast()
  const { entries } = useEntries()
  const isTest = session.kind === 'test'
  const [kind, setKind] = useState<StudioKind>(session.kind)
  const m0 = version.meta
  const [meta, setMeta] = useState<StudioMeta>(() => ({
    ...m0,
    slug: m0.slug && isSlug(m0.slug) ? m0.slug : slugify(m0.slug || m0.title || session.title),
    title: m0.title || session.title,
    grades: m0.grades?.length ? m0.grades : session.grade ? [session.grade] : [],
    emoji: m0.emoji || kindMeta[session.kind].emoji,
    color: /^#[0-9a-f]{6}$/i.test(m0.color) ? m0.color : '#d6457a',
  }))
  const [testGrade, setTestGrade] = useState<number>(session.grade ?? m0.grades?.[0] ?? 3)
  const [outcome, setOutcome] = useState<string>(m0.outcomes?.[0] ?? '')
  const [status, setStatus] = useState<'published' | 'draft'>('published')
  const [advanced, setAdvanced] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState<{ url: string; kind: CmsKind; ref: string; status: 'published' | 'draft' } | null>(null)

  const set = <K extends keyof StudioMeta>(k: K, v: StudioMeta[K]) => setMeta((x) => ({ ...x, [k]: v }))

  const cmsKind: CmsKind = isTest ? 'activity' : (kind as CmsKind)
  const ref = isTest ? `g${testGrade}-${meta.slug}` : meta.slug
  const path = `${kindInfo[cmsKind].prefix}${ref}`
  const existing = session.entry_id ? entries.find((e) => e.id === session.entry_id) : undefined
  const slugChanged = !!existing && existing.ref !== ref

  const outcomes = useMemo(() => outcomeOptions(testGrade), [testGrade])

  const errors: Record<string, string> = {}
  if (!meta.title.trim()) errors.title = 'Başlık gerekli'
  if (!meta.slug) errors.slug = 'Kısa ad gerekli'
  else if (!isSlug(meta.slug)) errors.slug = 'Yalnızca küçük harf, rakam ve tire kullanın (ör. kesir-avcisi)'
  else if (refTaken(cmsKind, ref, entries, session.entry_id ?? undefined)) errors.slug = 'Bu adres zaten kullanılıyor; başka bir kısa ad seçin'
  if (isTest && !outcome) errors.outcome = 'Testin görüneceği öğrenme çıktısını seçin'
  if (!isTest && !meta.grades.length) errors.grades = 'En az bir sınıf seçin'
  if (!meta.description.trim()) errors.description = 'Kısa bir açıklama yazın (listelerde ve Google’da görünür)'
  const valid = Object.keys(errors).length === 0

  const skillsRecord = () => Object.fromEntries(meta.skills.filter((s) => s.text.trim() && meta.grades.includes(s.grade)).map((s) => [s.grade, s.text.trim()]))

  const save = async () => {
    if (!valid) return
    setSaving(true)
    try {
      const outcomesList = meta.outcomes.map((o) => o.trim()).filter(Boolean)
      let data: Record<string, unknown>
      if (isTest) {
        if (!version.quiz) throw new Error('Bu sürümde soru yok')
        data = { ...buildQuizActivity(version.quiz, meta, ref, outcome) }
      } else if (kind === 'game') {
        data = { name: meta.title.trim(), description: meta.description.trim(), emoji: meta.emoji, color: meta.color, grades: meta.grades, skills: skillsRecord(), howTo: meta.howTo.filter((s) => s.trim()), launch: meta.launch.trim(), reflect: meta.reflect.trim(), bigIdea: meta.bigIdea.trim(), outcomes: outcomesList }
      } else if (kind === 'interaction') {
        data = { name: meta.title.trim(), description: meta.description.trim(), emoji: meta.emoji, color: meta.color, category: meta.category, grades: meta.grades, skills: skillsRecord(), launch: meta.launch.trim(), reflect: meta.reflect.trim(), bigIdea: meta.bigIdea.trim(), outcomes: outcomesList }
      } else {
        data = { name: meta.title.trim(), description: meta.description.trim(), emoji: meta.emoji, grades: meta.grades, category: meta.category }
      }
      const saved = await saveEntry({
        id: session.entry_id ?? undefined,
        kind: cmsKind,
        ref,
        origin: 'custom',
        status,
        hidden: false,
        data,
        html: isTest ? null : (version.html ?? ''),
        grade: isTest ? testGrade : null,
        note: session.entry_id ? 'Stüdyo’dan güncellendi' : 'Stüdyo’dan eklendi',
      })
      const finalMeta: StudioMeta = { ...meta, outcomes: isTest ? [outcome] : outcomesList, grades: isTest ? [testGrade] : meta.grades }
      await onPublished(saved.id, finalMeta)
      setDone({ url: `${window.location.origin}${path}`, kind: cmsKind, ref, status })
      if (status === 'published') {
        loadSetting<StudioSettings>('studio')
          .then((s) => (s?.autoDeploy ? triggerDeploy() : null))
          .then((r) => r?.ok && toast('Site arka planda yeniden derleniyor (arama motoru sayfaları güncellenecek).', 'info'))
          .catch(() => {})
      }
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (done)
    return (
      <Modal open onClose={onClose} title={done.status === 'published' ? 'Yayında!' : 'Taslak kaydedildi'} size="md" footer={<Button variant="primary" onClick={onClose}>Tamam</Button>}>
        <div className="py-4 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-ok-soft text-ok">
            <Check size={34} strokeWidth={3} />
          </div>
          <p className="mt-4 text-lg font-black">{meta.title}</p>
          {done.status === 'published' ? (
            <p className="mt-1 text-sm font-semibold text-ink-soft">Sitede hemen görünür. Bağlantıyı öğrencilerinizle paylaşabilirsiniz.</p>
          ) : (
            <p className="mt-1 text-sm font-semibold text-ink-soft">Taslaklar sitede görünmez. Hazır olunca panelden yayınlayabilirsiniz.</p>
          )}
          <div className="mx-auto mt-4 flex max-w-md items-center gap-2 rounded-xl bg-paper p-2 pl-3 ring-1 ring-line">
            <span className="min-w-0 flex-1 truncate text-left text-sm font-bold">{done.url}</span>
            <Button
              size="sm"
              icon={<Copy size={14} />}
              onClick={() =>
                navigator.clipboard.writeText(done.url).then(
                  () => toast('Bağlantı kopyalandı'),
                  () => toast('Kopyalanamadı', 'error'),
                )
              }
            >
              Kopyala
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {done.status === 'published' && (
              <a href={done.url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-ink px-3.5 text-sm font-bold text-white hover:bg-ink/90">
                <ExternalLink size={15} /> Sitede aç
              </a>
            )}
            <Link to={`/yonetim/duzenle/${done.kind}/${done.ref}`} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3.5 text-sm font-bold ring-1 ring-line hover:bg-paper">
              <Pencil size={15} /> Panelde düzenle
            </Link>
          </div>
        </div>
      </Modal>
    )

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={session.entry_id ? 'Yayındaki içeriği güncelle' : 'Sitede yayınla'}
      desc="Bilgileri kontrol edin; yapay zekânın önerdiği alanları dilediğiniz gibi değiştirebilirsiniz."
      footer={
        <>
          <Button onClick={onClose}>Vazgeç</Button>
          <Button variant="primary" icon={<Rocket size={16} />} loading={saving} disabled={!valid} onClick={save}>
            {status === 'draft' ? 'Taslak olarak kaydet' : session.entry_id ? 'Güncelle' : 'Yayınla'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tür" help={isTest ? 'Testler etkinlik olarak ilgili konunun sayfasında ve Test Çöz bölümünde görünür.' : undefined}>
            <Select
              value={kind}
              onChange={(v) => setKind(v)}
              options={(isTest ? (['test'] as StudioKind[]) : (['game', 'interaction', 'manipulative'] as StudioKind[])).map((k) => ({ value: k, label: `${kindMeta[k].emoji} ${kindMeta[k].label}` }))}
            />
          </Field>
          <Field label="Başlık" error={errors.title} counter={{ n: meta.title.length, max: 60 }}>
            <TextInput
              value={meta.title}
              onChange={(v) => {
                setMeta((x) => ({ ...x, title: v, slug: !session.entry_id && (x.slug === slugify(x.title) || !x.slug) ? slugify(v) : x.slug }))
              }}
            />
          </Field>
        </div>

        <Field label="Adres (URL)" error={errors.slug} help="Küçük harf, rakam ve tire. Paylaşılan bağlantı bu olur.">
          <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-white focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
            <span className="flex items-center border-r border-line bg-paper px-3 text-sm font-bold whitespace-nowrap text-ink-soft max-sm:hidden">
              {DOMAIN}
              {kindInfo[cmsKind].prefix}
              {isTest ? `g${testGrade}-` : ''}
            </span>
            <input value={meta.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} onBlur={() => set('slug', slugify(meta.slug))} className="min-w-0 flex-1 px-3 py-2 text-[15px] font-semibold outline-none" />
          </div>
          <p className="mt-1 truncate text-xs font-bold text-ink-soft sm:hidden">
            {DOMAIN}
            {path}
          </p>
        </Field>
        {slugChanged && (
          <Callout tone="amber" title="Adres değişiyor">
            Eski bağlantı (<span className="font-mono">{kindInfo[existing!.kind].prefix}{existing!.ref}</span>) artık çalışmayacak. Daha önce paylaştıysanız eski adı koruyun.
          </Callout>
        )}

        <Field label="Açıklama" error={errors.description} counter={{ n: meta.description.length, max: 160 }} help="Kartlarda ve arama sonuçlarında görünen tek cümle.">
          <TextArea value={meta.description} onChange={(v) => set('description', v)} minRows={2} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-[110px_1fr]">
          <Field label="Emoji">
            <TextInput value={meta.emoji} onChange={(v) => set('emoji', v.slice(0, 8))} className="text-center text-2xl" />
          </Field>
          {kind !== 'manipulative' && !isTest ? (
            <Field label="Renk">
              <div className="flex items-center gap-2">
                <input type="color" value={meta.color} onChange={(e) => set('color', e.target.value)} className="h-10 w-14 cursor-pointer rounded-xl border border-line bg-white p-1" aria-label="Renk seç" />
                <TextInput value={meta.color} onChange={(v) => set('color', v)} className="max-w-32 font-mono" />
                <span className="grid size-10 place-items-center rounded-xl text-xl" style={{ background: `${meta.color}22` }} aria-hidden>
                  {meta.emoji}
                </span>
              </div>
            </Field>
          ) : (
            <div />
          )}
        </div>

        {isTest ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sınıf">
              <GradePicker value={[testGrade as Grade]} onChange={(g) => g[0] && (setTestGrade(g[0]), setOutcome(''))} single />
            </Field>
            <Field label="Öğrenme çıktısı" error={errors.outcome} help="Test, bu çıktının bulunduğu tema sayfasında görünür.">
              <Select value={outcome} onChange={setOutcome} options={[{ value: '', label: 'Seçin…' }, ...outcomes.map((o) => ({ value: o.value, label: o.label }))]} />
            </Field>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sınıflar" error={errors.grades} help={kind === 'manipulative' ? 'Ardışık bir aralık olarak gösterilir (ör. 3–5).' : 'Oyun sınıf seçimine göre zorlaşır.'}>
              <GradePicker value={meta.grades as Grade[]} onChange={(g) => set('grades', g)} />
            </Field>
            {kind !== 'game' && (
              <Field label="Kategori">
                <Select value={meta.category} onChange={(v) => set('category', v)} options={CATS} />
              </Field>
            )}
          </div>
        )}

        {kind !== 'manipulative' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="🌱 Başlarken" help="Etkinliği açan kısa durum/problem.">
              <TextArea value={meta.launch} onChange={(v) => set('launch', v)} minRows={3} />
            </Field>
            <Field label="💬 Düşün ve Paylaş" help="Sonda sorulan tek, açık uçlu soru.">
              <TextArea value={meta.reflect} onChange={(v) => set('reflect', v)} minRows={3} />
            </Field>
          </div>
        )}

        {kind === 'game' && !isTest && (
          <Field label="Nasıl oynanır?" help="Oyun başlamadan önce gösterilen 3–4 kısa adım.">
            <ListEditor value={meta.howTo} onChange={(v) => set('howTo', v)} placeholder="Bir adım yazın" addLabel="Adım ekle" />
          </Field>
        )}

        <div className="rounded-2xl ring-1 ring-line">
          <button type="button" onClick={() => setAdvanced((x) => !x)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-extrabold">
            Gelişmiş: büyük fikir, öğrenme çıktıları, sınıflara göre beceriler
            <span className={cx('transition', advanced && 'rotate-180')}>▾</span>
          </button>
          {advanced && (
            <div className="space-y-4 border-t border-line p-4">
              {kind !== 'manipulative' && (
                <Field label="Öğretmen için büyük fikir">
                  <TextArea value={meta.bigIdea} onChange={(v) => set('bigIdea', v)} minRows={2} />
                </Field>
              )}
              {!isTest && kind !== 'manipulative' && (
                <Field label="Öğrenme çıktıları" help="Virgülle ayırın: MAT.5.1.4, MAT.6.1.2">
                  <TextInput value={meta.outcomes.join(', ')} onChange={(v) => set('outcomes', v.split(',').map((s) => s.trim()))} placeholder="MAT.5.1.4" />
                </Field>
              )}
              {!isTest && kind !== 'manipulative' && meta.grades.length > 0 && (
                <Field label="Her sınıfta ne çalışılır?" help="Sınıf seçiminde öğrenciye gösterilir.">
                  <div className="space-y-2">
                    {meta.grades.map((g) => (
                      <div key={g} className="flex items-center gap-2">
                        <span className="w-16 shrink-0 text-sm font-black">{g}. sınıf</span>
                        <TextInput
                          value={meta.skills.find((s) => s.grade === g)?.text ?? ''}
                          onChange={(v) => set('skills', [...meta.skills.filter((s) => s.grade !== g), { grade: g, text: v }])}
                          placeholder="ör. 10’a kadar toplama"
                        />
                      </div>
                    ))}
                  </div>
                </Field>
              )}
            </div>
          )}
        </div>

        <fieldset>
          <legend className="mb-2 text-[13px] font-extrabold">Durum</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ['published', 'Hemen yayınla', 'Sitede herkes görür.'],
                ['draft', 'Taslak olarak kaydet', 'Sitede görünmez, panelde saklanır.'],
              ] as const
            ).map(([v, label, desc]) => (
              <label key={v} className={cx('flex cursor-pointer items-start gap-3 rounded-2xl p-3 ring-1 transition', status === v ? 'bg-brand-soft/50 ring-2 ring-brand' : 'ring-line hover:bg-paper')}>
                <input type="radio" name="status" checked={status === v} onChange={() => setStatus(v)} className="mt-1 accent-[var(--color-brand)]" />
                <span>
                  <span className="block text-sm font-extrabold">{label}</span>
                  <span className="block text-xs font-semibold text-ink-soft">{desc}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {!valid && (
          <p className="flex items-center gap-1.5 text-xs font-bold text-bad">
            <TriangleAlert size={14} /> Yayınlamadan önce işaretli alanları düzeltin.
          </p>
        )}
      </div>
    </Modal>
  )
}
