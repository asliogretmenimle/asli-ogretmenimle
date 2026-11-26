/** Stüdyo ana sayfası: yeni çalışma başlat + önceki çalışmalar */
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowUp, Clock, LoaderCircle, Sparkles, Trash2 } from 'lucide-react'
import type { Grade } from '../../data/types'
import { sb } from '../supabase'
import { Badge, Button, Card, Empty, GradePicker, IconButton, PageHead, Select, cx, timeAgo, useConfirm, useToast } from '../ui'
import { examplePrompts, kindMeta, metaFromEntry, nowIso, outcomeOptions, quizFromEntry, type StudioKind, type StudioSession, type StudioVersion } from './model'
import { useImageAttach } from './parts'

const KINDS: StudioKind[] = ['game', 'interaction', 'manipulative', 'test']
const isKind = (v: string | null): v is StudioKind => !!v && (KINDS as string[]).includes(v)

type SessionRow = Pick<StudioSession, 'id' | 'title' | 'kind' | 'grade' | 'updated_at' | 'entry_id' | 'current'>

export function StudioHome() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()

  const [kind, setKind] = useState<StudioKind>(isKind(params.get('tur')) ? (params.get('tur') as StudioKind) : 'game')
  const g0 = Number(params.get('sinif'))
  const [grade, setGrade] = useState<number>(g0 >= 1 && g0 <= 8 ? g0 : 3)
  const [outcome, setOutcome] = useState<string>(params.get('cikti') ?? '')
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const att = useImageAttach()
  const area = useRef<HTMLTextAreaElement>(null)

  const [sessions, setSessions] = useState<SessionRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)

  const loadSessions = async () => {
    const { data, error } = await sb.from('studio_sessions').select('id,title,kind,grade,updated_at,entry_id,current').order('updated_at', { ascending: false }).limit(200)
    if (error) setLoadError(error.message)
    else setSessions((data ?? []) as SessionRow[])
  }
  useEffect(() => {
    loadSessions()
  }, [])

  // Yayındaki bir kaydı Stüdyo'da açmak: ?kayit=<id>
  const seedId = params.get('kayit')
  const seeded = useRef(false)
  useEffect(() => {
    if (!seedId || seeded.current) return
    seeded.current = true
    setSeeding(true)
    ;(async () => {
      try {
        const { data: e, error } = await sb.from('cms_entries').select('*').eq('id', seedId).single()
        if (error || !e) throw new Error(error?.message ?? 'Kayıt bulunamadı')
        const isTest = e.kind === 'activity'
        if (!isTest && !['game', 'interaction', 'manipulative'].includes(e.kind)) throw new Error('Bu kayıt Stüdyo’da açılamaz')
        const k: StudioKind = isTest ? 'test' : (e.kind as StudioKind)
        const meta = metaFromEntry(e)
        const v: StudioVersion = { meta, at: nowIso(), note: 'Yayındaki sürüm', html: isTest ? null : (e.html ?? ''), quiz: isTest ? quizFromEntry(e) : null }
        const { data: s, error: e2 } = await sb
          .from('studio_sessions')
          .insert({
            title: meta.title || 'Yayındaki çalışma',
            kind: k,
            grade: e.grade ?? meta.grades[0] ?? null,
            messages: [{ role: 'assistant', text: 'Yayındaki sürüm yüklendi. Ne değiştirmek istersiniz?', at: nowIso(), version: 0 }],
            versions: [v],
            current: 0,
            entry_id: e.id,
          })
          .select('id')
          .single()
        if (e2 || !s) throw new Error(e2?.message ?? 'Çalışma oluşturulamadı')
        navigate(`/yonetim/studyo/${s.id}`, { replace: true })
      } catch (x) {
        toast((x as Error).message, 'error')
        setSeeding(false)
      }
    })()
  }, [seedId, navigate, toast])

  const outcomes = outcomeOptions(grade)
  useEffect(() => {
    if (outcome && !outcomes.some((o) => o.value === outcome)) setOutcome('')
  }, [grade]) // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    const text = prompt.trim()
    if (!text) {
      area.current?.focus()
      return
    }
    setBusy(true)
    const title = text.length > 50 ? `${text.slice(0, 48).trim()}…` : text
    const { data, error } = await sb.from('studio_sessions').insert({ title, kind, grade, messages: [], versions: [], current: -1 }).select('id').single()
    if (error || !data) {
      setBusy(false)
      toast(`Çalışma oluşturulamadı: ${error?.message ?? ''}`, 'error')
      return
    }
    navigate(`/yonetim/studyo/${data.id}`, { state: { initialPrompt: text, images: att.images, outcome: outcome || null } })
  }

  const remove = async (s: SessionRow) => {
    const ok = await confirm({
      title: 'Çalışma silinsin mi?',
      desc: s.entry_id ? 'Sohbet ve sürümler silinir. Sitede yayınlanmış içerik etkilenmez; yayında kalır.' : 'Sohbet ve tüm sürümler kalıcı olarak silinir.',
      confirm: 'Sil',
      danger: true,
    })
    if (!ok) return
    const { error } = await sb.from('studio_sessions').delete().eq('id', s.id)
    if (error) toast(error.message, 'error')
    else {
      setSessions((x) => x?.filter((y) => y.id !== s.id) ?? null)
      toast('Çalışma silindi')
    }
  }

  if (seeding)
    return (
      <div className="grid h-[60vh] place-items-center text-center">
        <div>
          <LoaderCircle size={32} className="mx-auto animate-spin text-brand" />
          <p className="mt-3 font-extrabold">Yayındaki sürüm Stüdyo’ya aktarılıyor…</p>
        </div>
      </div>
    )

  return (
    <div className="mx-auto max-w-5xl">
      <PageHead
        title={
          <span className="inline-flex items-center gap-2">
            <Sparkles className="text-brand" size={26} /> Stüdyo
          </span>
        }
        desc="Ne istediğinizi yazın; yapay zekâ oyunu, etkileşimi, manipülatifi ya da testi üretsin. Sonra sohbetle düzelttirip tek tıkla sitede yayınlayın."
      />

      <Card className="overflow-hidden" pad={false}>
        <div className="border-b border-line bg-gradient-to-br from-brand-soft via-white to-cream p-5 sm:p-6">
          <p className="mb-3 text-[13px] font-extrabold text-ink">1. Ne üretelim?</p>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {KINDS.map((k) => {
              const m = kindMeta[k]
              const on = k === kind
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setKind(k)}
                  className={cx(
                    'rounded-2xl p-3.5 text-left ring-1 transition sm:p-4',
                    on ? 'bg-white shadow-[var(--shadow-lift)] ring-2 ring-brand' : 'bg-white/70 ring-line hover:bg-white',
                  )}
                >
                  <span className="text-2xl sm:text-3xl" aria-hidden>
                    {m.emoji}
                  </span>
                  <span className="mt-1 block font-black">{m.label}</span>
                  <span className="mt-0.5 block text-xs leading-snug font-semibold text-ink-soft">{m.desc}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0">
            <p className="mb-2 text-[13px] font-extrabold text-ink">2. Öğretmen olarak tarif edin</p>
            <div className="rounded-2xl bg-white ring-1 ring-line focus-within:ring-2 focus-within:ring-brand/40">
              <textarea
                ref={area}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onPaste={att.onPaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) start()
                }}
                rows={5}
                placeholder={`Örn. ${examplePrompts[kind][0]}`}
                className="block w-full resize-y rounded-2xl bg-transparent px-4 pt-3.5 pb-2 text-[15px] leading-relaxed font-semibold outline-none placeholder:font-medium placeholder:text-ink-soft/60"
              />
              <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  {att.button()}
                  {att.thumbs}
                </div>
                <Button variant="primary" onClick={start} loading={busy} icon={<ArrowUp size={17} />} disabled={!prompt.trim()}>
                  Üret
                </Button>
              </div>
              {att.picker}
            </div>
            <p className="mt-2 text-xs font-semibold text-ink-soft">İpucu: Çalışma kâğıdı ya da beğendiğiniz bir etkinliğin ekran görüntüsünü ekleyebilir veya yapıştırabilirsiniz (Ctrl+V). Göndermek için Ctrl+Enter.</p>
            <div className="mt-4">
              <p className="mb-2 text-xs font-extrabold tracking-wide text-ink-soft uppercase">Örnek istekler</p>
              <div className="flex flex-col gap-2">
                {examplePrompts[kind].map((p) => (
                  <button key={p} type="button" onClick={() => setPrompt(p)} className="rounded-xl bg-paper px-3 py-2 text-left text-sm font-semibold text-ink-soft ring-1 ring-line transition hover:bg-white hover:text-ink">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[13px] font-extrabold text-ink">Sınıf</p>
              <GradePicker value={[grade as Grade]} onChange={(g) => g[0] && setGrade(g[0])} single />
            </div>
            <div>
              <p className="mb-2 text-[13px] font-extrabold text-ink">
                Öğrenme çıktısı <span className="font-semibold text-ink-soft">({kind === 'test' ? 'önerilir' : 'isteğe bağlı'})</span>
              </p>
              <Select value={outcome} onChange={setOutcome} options={[{ value: '', label: 'Seçilmedi' }, ...outcomes.map((o) => ({ value: o.value, label: o.label }))]} />
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-10 mb-3 flex items-end justify-between">
        <h2 className="text-lg font-black">Önceki çalışmalar</h2>
        {sessions && <span className="text-sm font-semibold text-ink-soft">{sessions.length} çalışma</span>}
      </div>
      {loadError ? (
        <Empty title="Çalışmalar yüklenemedi" desc={loadError} action={<Button onClick={loadSessions}>Tekrar dene</Button>} />
      ) : !sessions ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white ring-1 ring-line" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <Empty icon={<Sparkles size={22} />} title="Henüz çalışma yok" desc="Yukarıdan ilk isteğinizi yazın. Her çalışma burada saklanır; istediğiniz zaman kaldığınız yerden devam edebilirsiniz." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => {
            const m = kindMeta[s.kind] ?? kindMeta.game
            return (
              <div key={s.id} className="group relative rounded-2xl bg-white p-4 ring-1 ring-line transition hover:shadow-[var(--shadow-lift)]">
                <Link to={`/yonetim/studyo/${s.id}`} className="absolute inset-0 rounded-2xl" aria-label={`${s.title} çalışmasını aç`} />
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-paper text-2xl" aria-hidden>
                    {m.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-extrabold leading-snug">{s.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge tone={m.tone}>{m.label}</Badge>
                      {s.grade && <Badge>{s.grade}. sınıf</Badge>}
                      {s.entry_id && <Badge tone="green">Yayında</Badge>}
                      {s.current >= 0 && <Badge>v{s.current + 1}</Badge>}
                    </div>
                  </div>
                  <IconButton label="Sil" onClick={() => remove(s)} className="relative z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-bad max-sm:opacity-100">
                    <Trash2 size={16} />
                  </IconButton>
                </div>
                <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-ink-soft">
                  <Clock size={12} /> {timeAgo(s.updated_at)}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
