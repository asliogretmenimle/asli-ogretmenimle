/**
 * Stüdyo çalışma alanı: solda sohbet, sağda canlı önizleme.
 * Her yapay zekâ cevabı yeni bir sürüm oluşturur; öğretmen sürümler arasında gezinir, kodu elle düzenleyebilir
 * ve hazır olunca yayınlar.
 */
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleStop,
  Code,
  Copy,
  Download,
  ExternalLink,
  Eye,
  LoaderCircle,
  MessageSquare,
  Monitor,
  RotateCcw,
  Rocket,
  Smartphone,
  Sparkles,
  Tablet,
  TriangleAlert,
  WandSparkles,
} from 'lucide-react'
import { HtmlFrame } from '../../cms/HtmlFrame'
import { SessionTracker } from '../../lib/report'
import { TrackerProvider } from '../../lib/trackerContext'
import { studioCall } from '../api'
import { LiveBuild } from './LiveBuild'
import { emptyLive, liveFromText, responseText, streamCall, type LiveState, type StreamEvent } from './stream'
import { kindInfo } from '../catalog'
import { sb } from '../supabase'
import { Badge, Button, Empty, IconButton, Segmented, Select, cx, inputCls, useToast } from '../ui'
import {
  applyEdits,
  buildQuizActivity,
  emptyMeta,
  kindMeta,
  nowIso,
  suggestionChips,
  type StudioMessage,
  type StudioResult,
  type StudioSession,
  type StudioVersion,
} from './model'
import { Dots, useImageAttach } from './parts'
import { PublishDialog } from './PublishDialog'

const Quiz = lazy(() => import('../../engine/Quiz'))

type Device = 'phone' | 'tablet' | 'wide'
const deviceWidth: Record<Device, string> = { phone: '390px', tablet: '820px', wide: '100%' }

const PHRASES = ['İsteğini inceliyor…', 'Etkinliği tasarlıyor…', 'Kodu yazıyor…', 'Ayrıntıları işliyor…', 'Son kontrolleri yapıyor…']
const POLL_MS = 2500

interface RouteState {
  initialPrompt?: string
  images?: string[]
  outcome?: string | null
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function StudioWorkspace() {
  const { id = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()

  const [session, setSession] = useState<StudioSession | null>(null)
  const sref = useRef<StudioSession | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [gen, setGen] = useState<{ jobId: string; startedAt: number } | null>(null)
  // Canlı inşa: model yazdıkça önizlemede oluşan tasarım
  const [live, setLive] = useState<LiveState | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const alive = useRef(true)
  const stopRef = useRef<string | null>(null)

  const [draft, setDraft] = useState('')
  const att = useImageAttach()
  const [view, setView] = useState(-1)
  const [tab, setTab] = useState<'preview' | 'code'>('preview')
  const [device, setDevice] = useState<Device>('wide')
  const [previewGrade, setPreviewGrade] = useState(3)
  const [restart, setRestart] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [publishOpen, setPublishOpen] = useState(false)
  const [pane, setPane] = useState<'chat' | 'preview'>('chat')
  const outcomeRef = useRef<string | null>((location.state as RouteState | null)?.outcome ?? null)
  const chatEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // ------------------------------------------------------------------ kayıt
  const persist = useCallback(
    async (next: StudioSession) => {
      sref.current = next
      setSession(next)
      const { error } = await sb
        .from('studio_sessions')
        .update({ title: next.title, kind: next.kind, grade: next.grade, messages: next.messages, versions: next.versions, current: next.current, entry_id: next.entry_id })
        .eq('id', next.id)
      if (error) toast(`Çalışma kaydedilemedi: ${error.message}`, 'error')
    },
    [toast],
  )

  const patch = (fn: (s: StudioSession) => StudioSession) => {
    const s = sref.current
    if (!s) return Promise.resolve()
    return persist(fn(s))
  }

  // ------------------------------------------------------------------ üretim
  const finishWithError = async (jobId: string | null, text: string, prompt?: string) => {
    await patch((s) => ({ ...s, messages: [...s.messages.filter((m) => !(jobId && m.pending === jobId)), { role: 'error', text, at: nowIso(), prompt }] }))
    setGen(null)
    setLive(null)
    if (prompt) setDraft((d) => d || prompt)
  }

  const handleResult = async (r: StudioResult, jobId: string, prompt: string, wasRetry: boolean) => {
    const s = sref.current
    if (!s) return
    const prev = s.versions[s.current] as StudioVersion | undefined
    const baseMeta = prev?.meta ?? emptyMeta(s.grade, outcomeRef.current)
    const meta = { ...baseMeta, ...(r.meta ?? {}) }
    if (s.entry_id && prev) {
      meta.title = prev.meta.title || meta.title
      meta.slug = prev.meta.slug || meta.slug
    }
    if (!meta.outcomes?.length && outcomeRef.current) meta.outcomes = [outcomeRef.current]
    if (!meta.grades?.length && s.grade) meta.grades = [s.grade]

    let version: StudioVersion | null = null
    let note = ''
    if (s.kind !== 'test' && r.html?.trim()) {
      version = { html: r.html, meta, at: nowIso(), prompt }
    } else if (s.kind !== 'test' && r.edits?.length && prev?.html) {
      const { html, failed } = applyEdits(prev.html, r.edits)
      if (failed.length && !wasRetry) {
        // Düzenleme yerini bulamadı: bir kez tam belge iste
        await patch((x) => ({ ...x, messages: x.messages.filter((m) => m.pending !== jobId) }))
        await generate(`Önceki düzenlemeler uygulanamadı (metin bulunamadı). Lütfen tüm HTML belgesini 'html' alanında eksiksiz döndür. Asıl istek: ${prompt}`, [], { hideUser: true, retry: true, originalPrompt: prompt })
        return
      }
      if (failed.length) note = ` (${failed.length} düzenleme uygulanamadı)`
      version = { html, meta, at: nowIso(), prompt }
    } else if (s.kind === 'test' && r.quiz?.questions?.length) {
      version = { quiz: r.quiz, meta, at: nowIso(), prompt }
    }

    const versions = version ? [...s.versions, version] : s.versions
    const idx = version ? versions.length - 1 : s.current
    // Meta değiştiyse (sürüm oluşmasa da) mevcut sürüme yaz
    if (!version && prev) versions[s.current] = { ...prev, meta }
    const firstVersion = !!version && s.versions.length === 0
    const msg: StudioMessage = { role: 'assistant', text: (r.reply || (version ? 'Hazır.' : '')) + note, at: nowIso(), ...(version ? { version: idx } : {}) }
    await persist({
      ...s,
      title: firstVersion && meta.title ? meta.title : s.title,
      versions,
      current: idx,
      messages: [...s.messages.filter((m) => m.pending !== jobId), msg],
    })
    setGen(null)
    setLive(null)
    if (version) {
      setView(idx)
      setErrors([])
      setRestart((x) => x + 1)
      setPane('preview')
    }
  }

  const pollJob = async (jobId: string, prompt: string, wasRetry: boolean) => {
    let fails = 0
    while (alive.current) {
      await sleep(POLL_MS)
      if (!alive.current || stopRef.current === jobId) return
      try {
        const r = await studioCall<{ status: string; result?: StudioResult; error?: string }>({ action: 'poll', id: jobId })
        fails = 0
        if (r.status === 'completed' && r.result) return handleResult(r.result, jobId, prompt, wasRetry)
        if (r.status === 'failed') return finishWithError(jobId, r.error ?? 'Üretim başarısız oldu.', prompt)
      } catch (e) {
        if (++fails >= 5) return finishWithError(jobId, `Bağlantı sorunu: ${(e as Error).message}`, prompt)
      }
    }
  }

  /**
   * Canlı akış: model yazdıkça önizleme oluşur. Bağlantı koparsa kaldığı yerden sürdürür;
   * hiç akış alınamazsa (eski sunucu sürümü vb.) sorgulamaya (poll) düşer.
   */
  const runStream = async (opts: { startBody?: Record<string, unknown>; resumeId?: string; shown: string; wasRetry: boolean; withUser?: StudioSession }) => {
    let jobId = opts.resumeId ?? ''
    let seq = 0
    let text = ''
    const thoughts: string[] = []
    let completed: StreamEvent['response'] | null = null
    let failed: string | null = null
    let state = emptyLive()
    setLive(state)
    let timer: ReturnType<typeof setTimeout> | null = null
    const flush = () => {
      timer = null
      state = { ...liveFromText(text, state), thoughts: thoughts.filter((t) => t.trim()) }
      if (state.phase === 'connecting' && (thoughts.length || jobId)) state.phase = 'thinking'
      if (alive.current) setLive(state)
    }
    const schedule = () => {
      if (!timer) timer = setTimeout(flush, 120)
    }
    const onEvent = (e: StreamEvent) => {
      if (typeof e.sequence_number === 'number') seq = Math.max(seq, e.sequence_number)
      switch (e.type) {
        case 'response.created':
        case 'response.queued':
        case 'response.in_progress':
          if (e.response?.id && !jobId) {
            jobId = e.response.id
            setGen((g) => (g ? { ...g, jobId } : { jobId, startedAt: Date.now() }))
            const base = opts.withUser ?? sref.current
            if (base) persist({ ...base, messages: [...base.messages, { role: 'assistant', text: '', at: nowIso(), pending: jobId, prompt: opts.shown }] })
          }
          break
        case 'response.reasoning_summary_part.added':
          thoughts.push('')
          break
        case 'response.reasoning_summary_text.delta':
          if (!thoughts.length) thoughts.push('')
          thoughts[thoughts.length - 1] += e.delta ?? ''
          break
        case 'response.output_text.delta':
          text += e.delta ?? ''
          break
        case 'response.completed':
          completed = e.response ?? {}
          break
        case 'response.incomplete':
          failed = e.response?.incomplete_details?.reason === 'max_output_tokens' ? 'Çıktı çok uzun olduğu için yarıda kesildi. İsteği daha küçük parçalara bölün.' : 'Üretim tamamlanamadı.'
          break
        case 'response.failed':
          failed = e.response?.error?.message ?? 'Üretim başarısız oldu.'
          break
        case 'error':
          failed = e.message ?? 'Üretim sırasında hata oluştu.'
          break
      }
      schedule()
    }

    let fallbackToPoll = false
    for (let attempt = 0; attempt < 4 && alive.current && !completed && !failed; attempt++) {
      if (jobId && stopRef.current === jobId) return
      const ctrl = new AbortController()
      abortRef.current = ctrl
      try {
        const body = attempt === 0 && opts.startBody ? { ...opts.startBody, stream: true } : { action: 'stream', id: jobId, after: jobId === opts.resumeId && attempt === 0 ? 0 : seq }
        if (attempt > 0 || !opts.startBody) {
          // Sürdürme: baştan alınıyorsa metni sıfırla
          if ((body as { after: number }).after === 0) {
            text = ''
            thoughts.length = 0
          }
        }
        const r = await streamCall(body, onEvent, ctrl.signal)
        if (r.json) {
          // Sunucu akış desteklemiyor: iş kimliğiyle sorgulamaya geç
          if (typeof r.json.id === 'string') {
            jobId = r.json.id
            setGen((g) => (g ? { ...g, jobId } : { jobId, startedAt: Date.now() }))
            const base = opts.withUser ?? sref.current
            if (base) await persist({ ...base, messages: [...base.messages, { role: 'assistant', text: '', at: nowIso(), pending: jobId, prompt: opts.shown }] })
          }
          fallbackToPoll = true
          break
        }
      } catch (e) {
        if (ctrl.signal.aborted) return
        if (!jobId) {
          if (timer) clearTimeout(timer)
          setLive(null)
          if (opts.withUser) await persist(opts.withUser)
          return finishWithError(null, (e as Error).message, opts.shown)
        }
      }
      if (!jobId) break
    }
    if (timer) clearTimeout(timer)
    abortRef.current = null
    if (!alive.current || (jobId && stopRef.current === jobId)) return

    if (failed) return finishWithError(jobId || null, failed, opts.shown)
    if (completed) {
      const finalText = responseText(completed) || text
      let result: StudioResult | null = null
      try {
        result = JSON.parse(finalText) as StudioResult
      } catch {
        result = null
      }
      if (!result) return jobId ? pollJob(jobId, opts.shown, opts.wasRetry) : finishWithError(null, 'Modelin cevabı okunamadı. Tekrar deneyin.', opts.shown)
      state = { ...liveFromText(finalText, state), thoughts: thoughts.filter((t) => t.trim()), phase: 'done' }
      setLive(state)
      await sleep(900)
      if (!alive.current) return
      return handleResult(result, jobId, opts.shown, opts.wasRetry)
    }
    if (jobId) {
      if (!fallbackToPoll) setLive((l) => (l ? { ...l, phase: l.phase === 'connecting' ? 'thinking' : l.phase } : l))
      return pollJob(jobId, opts.shown, opts.wasRetry)
    }
    return finishWithError(null, 'Stüdyo sunucusundan cevap alınamadı.', opts.shown)
  }

  const generate = async (prompt: string, images: string[], opts: { hideUser?: boolean; retry?: boolean; originalPrompt?: string } = {}) => {
    const s = sref.current
    if (!s || !prompt.trim()) return
    const userMsg: StudioMessage | null = opts.hideUser ? null : { role: 'user', text: prompt, at: nowIso(), ...(images.length ? { images: images.length } : {}) }
    const history = s.messages.filter((m) => (m.role === 'user' || m.role === 'assistant') && !m.pending && m.text.trim()).map((m) => ({ role: m.role, text: m.text }))
    const cur = s.versions[s.current]
    const withUser = userMsg ? { ...s, messages: [...s.messages, userMsg] } : s
    sref.current = withUser
    setSession(withUser)
    setGen({ jobId: '', startedAt: Date.now() })
    const shown = opts.originalPrompt ?? prompt
    setPane('preview')
    await runStream({
      startBody: {
        action: 'start',
        kind: s.kind,
        grade: s.grade,
        outcome: outcomeRef.current ?? cur?.meta.outcomes?.[0] ?? null,
        prompt,
        history,
        current: cur ? { meta: cur.meta, html: cur.html ?? null, quiz: cur.quiz ?? null } : null,
        images,
      },
      shown,
      wasRetry: !!opts.retry,
      withUser,
    })
  }

  const send = (text?: string) => {
    const t = (text ?? draft).trim()
    if (!t || gen) return
    const imgs = att.images
    setDraft('')
    att.setImages([])
    generate(t, imgs)
  }

  const stop = async () => {
    const g = gen
    if (!g?.jobId) return
    stopRef.current = g.jobId
    abortRef.current?.abort()
    studioCall({ action: 'cancel', id: g.jobId }).catch(() => {})
    const pending = sref.current?.messages.find((m) => m.pending === g.jobId)
    await finishWithError(g.jobId, 'Üretim durduruldu.', pending?.prompt)
  }

  // ------------------------------------------------------------------ yükleme
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await sb.from('studio_sessions').select('*').eq('id', id).single()
      if (cancelled) return
      if (error || !data) return setLoadError(error?.message ?? 'Çalışma bulunamadı')
      const s = { ...(data as StudioSession), messages: (data.messages ?? []) as StudioMessage[], versions: (data.versions ?? []) as StudioVersion[] }
      sref.current = s
      setSession(s)
      setView(s.current)
      setPreviewGrade(s.grade ?? s.versions[s.current]?.meta.grades?.[0] ?? 3)
      if (s.current >= 0) setPane('preview')

      const st = location.state as RouteState | null
      const last = s.messages[s.messages.length - 1]
      if (last?.pending) {
        // Sayfa yeniden açıldı: devam eden üretimi izlemeyi sürdür
        setGen({ jobId: last.pending, startedAt: new Date(last.at).getTime() })
        setPane('preview')
        runStream({ resumeId: last.pending, shown: last.prompt ?? '', wasRetry: false })
      } else if (st?.initialPrompt && s.messages.length === 0) {
        navigate(location.pathname, { replace: true, state: null })
        setPane('chat')
        generate(st.initialPrompt, st.images ?? [])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!gen) return
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - gen.startedAt) / 1000)), 500)
    return () => clearInterval(t)
  }, [gen])

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [session?.messages.length, gen])

  // ------------------------------------------------------------------ çizim
  if (loadError)
    return (
      <div className="mx-auto max-w-xl py-10">
        <Empty title="Çalışma açılamadı" desc={loadError} action={<Link to="/yonetim/studyo" className="font-extrabold text-brand">Stüdyo’ya dön</Link>} />
      </div>
    )
  if (!session)
    return (
      <div className="grid h-[60vh] place-items-center">
        <LoaderCircle className="animate-spin text-brand" size={32} />
      </div>
    )

  const km = kindMeta[session.kind] ?? kindMeta.game
  const version = session.versions[view] as StudioVersion | undefined
  const hasVersion = session.versions.length > 0
  const pendingMsg = gen ? session.messages.find((m) => m.pending) : undefined
  const visibleMessages = session.messages.filter((m) => !m.pending)

  const fixErrors = () => {
    if (!errors.length) return
    send(`Önizlemede şu hatalar oluştu, düzelt:\n${errors.map((e) => `- ${e}`).join('\n')}`)
    setErrors([])
  }

  const publicUrl = (() => {
    const cur = session.versions[session.current]
    if (!session.entry_id || !cur) return null
    if (session.kind === 'test') return `/etkinlik/g${session.grade ?? cur.meta.grades[0] ?? 1}-${cur.meta.slug}`
    return `${kindInfo[session.kind as 'game'].prefix}${cur.meta.slug}`
  })()

  return (
    <div className="flex h-[calc(100dvh-64px)] flex-col bg-paper lg:h-dvh">
      {/* Başlık çubuğu */}
      <header className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-3 py-2.5 sm:px-4">
        <Link to="/yonetim/studyo" className="grid size-9 shrink-0 place-items-center rounded-xl text-ink-soft ring-1 ring-line hover:bg-paper hover:text-ink" aria-label="Stüdyo’ya dön">
          <ChevronLeft size={18} />
        </Link>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-paper text-xl" aria-hidden>
          {version?.meta.emoji || km.emoji}
        </span>
        <TitleInput value={session.title} onSave={(t) => patch((s) => ({ ...s, title: t }))} />
        <div className="flex items-center gap-1.5 max-sm:hidden">
          <Badge tone={km.tone}>{km.label}</Badge>
          {session.entry_id && (
            <Badge tone="green">
              <Check size={11} /> Yayında
            </Badge>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-[112px]">
            <Select
              value={String(session.grade ?? '')}
              onChange={(v) => {
                const g = Number(v) || null
                patch((s) => ({ ...s, grade: g }))
                if (g) setPreviewGrade(g)
              }}
              options={[{ value: '', label: 'Sınıf' }, ...[1, 2, 3, 4, 5, 6, 7, 8].map((g) => ({ value: String(g), label: `${g}. sınıf` }))]}
            />
          </div>
          {publicUrl && (
            <a href={publicUrl} target="_blank" rel="noreferrer" className="hidden h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-ink-soft ring-1 ring-line hover:bg-paper hover:text-ink md:inline-flex">
              <ExternalLink size={15} /> Sitede aç
            </a>
          )}
          <Button variant="primary" icon={<Rocket size={16} />} disabled={!hasVersion || !!gen} onClick={() => setPublishOpen(true)}>
            {session.entry_id ? 'Güncelle' : 'Yayınla'}
          </Button>
        </div>
      </header>

      {/* Mobil: sekmeler */}
      <div className="flex border-b border-line bg-white lg:hidden">
        {(
          [
            ['chat', 'Sohbet', <MessageSquare key="c" size={15} />],
            ['preview', 'Önizleme', <Eye key="p" size={15} />],
          ] as const
        ).map(([k, label, icon]) => (
          <button key={k} type="button" onClick={() => setPane(k)} className={cx('flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-sm font-extrabold', pane === k ? 'border-brand text-ink' : 'border-transparent text-ink-soft')}>
            {icon}
            {label}
            {k === 'chat' && gen && <Dots />}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Sohbet */}
        <aside className={cx('min-h-0 w-full flex-col border-r border-line bg-white lg:flex lg:w-[400px] xl:w-[420px]', pane === 'chat' ? 'flex' : 'hidden')}>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {visibleMessages.length === 0 && !gen && (
              <div className="rounded-2xl bg-paper p-4 text-sm font-semibold text-ink-soft">
                <p className="font-black text-ink">
                  {km.emoji} Yeni {km.label.toLocaleLowerCase('tr')}
                </p>
                <p className="mt-1">Ne istediğinizi yazın: konu, sınıf, nasıl oynanacağı, görünüş… Ne kadar ayrıntı, o kadar iyi sonuç.</p>
              </div>
            )}
            {visibleMessages.map((m, i) => (
              <ChatBubble
                key={i}
                m={m}
                active={m.version === view}
                onVersion={(v) => {
                  setView(v)
                  setTab('preview')
                  setErrors([])
                  setPane('preview')
                }}
                onRetry={m.role === 'error' && m.prompt && !gen ? () => generate(m.prompt!, [], { hideUser: true }) : undefined}
              />
            ))}
            {gen && (
              <div className="rounded-2xl bg-brand-soft/60 p-3.5 ring-1 ring-brand/15">
                <div className="flex items-center gap-2.5">
                  <WandSparkles size={18} className="shrink-0 animate-pulse text-brand" />
                  <p className="min-w-0 flex-1 text-sm font-extrabold text-brand-ink">
                    {live?.phase === 'writing' ? (session.kind === 'test' ? 'Soruları yazıyor…' : live.edits?.length ? 'Değişiklikleri uyguluyor…' : 'Tasarımı kodluyor…') : live?.phase === 'done' ? 'Hazır!' : PHRASES[Math.min(PHRASES.length - 1, Math.floor(elapsed / 12))]}
                  </p>
                  <span className="text-xs font-bold text-brand-ink/70 tabular-nums">
                    {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
                  </span>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/70">
                  <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${Math.min(95, 8 + elapsed * 0.9)}%` }} />
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-brand-ink/80">Tam bir oyun 1–4 dakika sürebilir. Sayfadan ayrılabilirsiniz; döndüğünüzde kaldığı yerden sürer.</p>
                  <Button size="sm" variant="secondary" icon={<CircleStop size={14} />} onClick={stop} disabled={!gen.jobId}>
                    Durdur
                  </Button>
                </div>
                {(live?.reply || live?.thoughts.length) ? (
                  <p className="mt-2.5 line-clamp-4 rounded-xl bg-white/80 px-3 py-2 text-[13px] font-semibold text-ink">
                    {live.reply || live.thoughts[live.thoughts.length - 1]}
                    <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-brand" />
                  </p>
                ) : null}
                {pendingMsg?.prompt && <p className="sr-only">İstek: {pendingMsg.prompt}</p>}
              </div>
            )}
            <div ref={chatEnd} />
          </div>

          {/* Yazma alanı */}
          <div className="border-t border-line bg-white p-3">
            {hasVersion && !gen && (
              <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
                {(session.kind === 'test' ? ['Sorulardan ikisini daha zor yap', '2 soru daha ekle', 'Açıklamaları sadeleştir', 'Günlük hayattan örnekler kullan'] : suggestionChips).map((c) => (
                  <button key={c} type="button" onClick={() => send(c)} className="shrink-0 rounded-full bg-paper px-3 py-1.5 text-xs font-bold text-ink-soft ring-1 ring-line transition hover:bg-white hover:text-ink">
                    {c}
                  </button>
                ))}
              </div>
            )}
            {att.thumbs && <div className="mb-2">{att.thumbs}</div>}
            <div className="flex items-end gap-1.5 rounded-2xl bg-paper p-1.5 ring-1 ring-line focus-within:bg-white focus-within:ring-2 focus-within:ring-brand/40">
              {att.button()}
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onPaste={att.onPaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    send()
                  }
                }}
                rows={1}
                placeholder={hasVersion ? 'Değişiklik isteyin…' : 'Ne üretelim?'}
                className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-[15px] font-semibold outline-none [field-sizing:content] placeholder:font-medium placeholder:text-ink-soft/60"
              />
              <button
                type="button"
                onClick={() => send()}
                disabled={!draft.trim() || !!gen}
                aria-label="Gönder"
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink text-white transition hover:bg-ink/90 disabled:opacity-30"
              >
                <ArrowUp size={18} />
              </button>
            </div>
            {att.picker}
            <p className="mt-1.5 px-1 text-[11px] font-semibold text-ink-soft">Enter: gönder · Shift+Enter: yeni satır</p>
          </div>
        </aside>

        {/* Önizleme */}
        <section className={cx('min-h-0 min-w-0 flex-1 flex-col', pane === 'preview' ? 'flex' : 'hidden lg:flex')}>
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-3 py-2">
            <Segmented
              size="sm"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'preview', label: <><Eye size={14} /> Önizleme</> },
                { value: 'code', label: <><Code size={14} /> {session.kind === 'test' ? 'Sorular' : 'Kod'}</> },
              ]}
            />
            {hasVersion && (
              <div className="flex items-center gap-0.5 rounded-xl ring-1 ring-line">
                <IconButton label="Önceki sürüm" disabled={view <= 0} onClick={() => (setView(view - 1), setErrors([]))}>
                  <ChevronLeft size={16} />
                </IconButton>
                <select
                  value={view}
                  onChange={(e) => (setView(Number(e.target.value)), setErrors([]))}
                  className="h-8 cursor-pointer bg-transparent px-1 text-xs font-extrabold outline-none"
                  aria-label="Sürüm"
                >
                  {session.versions.map((v, i) => (
                    <option key={i} value={i}>
                      v{i + 1} / {session.versions.length}
                      {v.note ? ` · ${v.note}` : ''}
                      {i === session.current ? ' (güncel)' : ''}
                    </option>
                  ))}
                </select>
                <IconButton label="Sonraki sürüm" disabled={view >= session.versions.length - 1} onClick={() => (setView(view + 1), setErrors([]))}>
                  <ChevronRight size={16} />
                </IconButton>
              </div>
            )}
            {hasVersion && view !== session.current && (
              <Button size="sm" variant="soft" onClick={() => patch((s) => ({ ...s, current: view }))} title="Yayınlama ve sonraki istekler bu sürümden devam etsin">
                Bu sürüme dön
              </Button>
            )}
            <div className="ml-auto flex items-center gap-2">
              {tab === 'preview' && session.kind !== 'test' && (
                <Segmented
                  size="sm"
                  value={device}
                  onChange={setDevice}
                  options={[
                    { value: 'phone', label: <Smartphone size={14} />, title: 'Telefon' },
                    { value: 'tablet', label: <Tablet size={14} />, title: 'Tablet' },
                    { value: 'wide', label: <Monitor size={14} />, title: 'Geniş ekran / akıllı tahta' },
                  ]}
                />
              )}
              {tab === 'preview' && (
                <select
                  value={previewGrade}
                  onChange={(e) => setPreviewGrade(Number(e.target.value))}
                  className="h-8 rounded-lg bg-white px-2 text-xs font-extrabold ring-1 ring-line outline-none"
                  aria-label="Önizleme sınıfı"
                  title="Önizlemede seçili sınıf (AO.grade)"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
                    <option key={g} value={g}>
                      {g}. sınıf
                    </option>
                  ))}
                </select>
              )}
              {tab === 'preview' && hasVersion && (
                <IconButton label="Yeniden başlat" onClick={() => (setRestart((x) => x + 1), setErrors([]))}>
                  <RotateCcw size={16} />
                </IconButton>
              )}
            </div>
          </div>

          {errors.length > 0 && tab === 'preview' && (
            <div className="flex flex-wrap items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
              <TriangleAlert size={18} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-black">Önizlemede hata var</p>
                <ul className="mt-0.5 space-y-0.5 font-mono text-xs">
                  {errors.map((e, i) => (
                    <li key={i} className="truncate">
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
              <Button size="sm" variant="primary" icon={<Sparkles size={14} />} onClick={fixErrors} disabled={!!gen}>
                AI’ya düzelttir
              </Button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-auto">
            {gen && live && tab === 'preview' ? (
              <LiveBuild key={gen.startedAt} kind={session.kind} live={live} baseHtml={session.versions[session.current]?.html ?? null} elapsed={elapsed} device={device} className="h-full w-full" />
            ) : !version ? (
              <div className="grid h-full place-items-center p-6">
                {gen ? (
                  <div className="text-center">
                    <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-brand-soft">
                      <WandSparkles size={28} className="animate-pulse text-brand" />
                    </div>
                    <p className="mt-4 font-black">{km.label} hazırlanıyor</p>
                    <p className="mt-1 text-sm font-semibold text-ink-soft">İlk sürüm hazır olunca burada görünecek.</p>
                  </div>
                ) : (
                  <Empty icon={<Eye size={22} />} title="Henüz önizleme yok" desc="Soldan isteğinizi yazın; ilk sürüm burada canlı olarak açılır." />
                )}
              </div>
            ) : tab === 'code' ? (
              session.kind === 'test' ? (
                <QuestionList version={version} />
              ) : (
                <CodeView
                  key={view}
                  html={version.html ?? ''}
                  disabled={!!gen}
                  onSave={(html) => {
                    patch((s) => {
                      const versions = [...s.versions, { ...version, html, at: nowIso(), note: 'Elle düzenlendi', prompt: undefined }]
                      return { ...s, versions, current: versions.length - 1 }
                    }).then(() => {
                      setView((sref.current?.versions.length ?? 1) - 1)
                      setTab('preview')
                      toast('Yeni sürüm kaydedildi')
                    })
                  }}
                />
              )
            ) : session.kind === 'test' ? (
              <QuizPreview key={`${view}-${restart}`} version={version} grade={session.grade ?? previewGrade} onRestart={() => setRestart((x) => x + 1)} />
            ) : (
              <div className="flex h-full min-h-[520px] justify-center p-3 sm:p-5">
                <div className="h-full max-w-full transition-[width] duration-300" style={{ width: deviceWidth[device] }}>
                  <HtmlFrame
                    key={`${view}-${restart}-${previewGrade}`}
                    kind={session.kind as 'game' | 'interaction' | 'manipulative'}
                    grade={previewGrade}
                    html={version.html ?? ''}
                    toolbar={false}
                    height="100%"
                    className={cx('h-full shadow-[var(--shadow-lift)]', device === 'phone' && 'rounded-[28px] ring-4 ring-ink/80')}
                    onError={(m) => setErrors((x) => (x.includes(m) || x.length >= 5 ? x : [...x, m]))}
                    onFinish={(r) => toast(`${session.kind === 'game' ? 'Oyun' : 'Etkinlik'} bitti: ${'⭐'.repeat(r.stars)}${r.summary ? ` — ${r.summary}` : ''}`, 'info')}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {publishOpen && session.versions[session.current] && (
        <PublishDialog
          session={session}
          version={session.versions[session.current]}
          onClose={() => setPublishOpen(false)}
          onPublished={async (entryId, meta) => {
            await patch((s) => {
              const versions = s.versions.slice()
              versions[s.current] = { ...versions[s.current], meta }
              return { ...s, entry_id: entryId, versions, title: meta.title || s.title }
            })
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function TitleInput({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  const commit = () => {
    const t = v.trim()
    if (t && t !== value) onSave(t)
    else setV(value)
  }
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') {
          setV(value)
          ;(e.target as HTMLInputElement).blur()
        }
      }}
      aria-label="Çalışma adı"
      className="min-w-0 flex-1 truncate rounded-lg bg-transparent px-1.5 py-1 text-base font-black outline-none hover:bg-paper focus:bg-paper focus:ring-2 focus:ring-brand/30 sm:max-w-md"
    />
  )
}

function ChatBubble({ m, active, onVersion, onRetry }: { m: StudioMessage; active: boolean; onVersion: (v: number) => void; onRetry?: () => void }) {
  if (m.role === 'user')
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2.5 text-[14px] leading-relaxed font-semibold whitespace-pre-wrap text-white">
          {m.text}
          {!!m.images && <p className="mt-1 text-xs font-bold text-white/70">📎 {m.images} görsel</p>}
        </div>
      </div>
    )
  if (m.role === 'error')
    return (
      <div className="rounded-2xl bg-bad-soft px-3.5 py-2.5 text-sm font-semibold text-red-900 ring-1 ring-red-200">
        <p className="flex items-start gap-2">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <span className="min-w-0">{m.text}</span>
        </p>
        {onRetry && (
          <Button size="sm" variant="secondary" className="mt-2" icon={<RotateCcw size={14} />} onClick={onRetry}>
            Tekrar dene
          </Button>
        )}
      </div>
    )
  return (
    <div className="flex gap-2">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
        <Sparkles size={14} />
      </span>
      <div className="min-w-0 max-w-[90%] rounded-2xl rounded-tl-md bg-paper px-3.5 py-2.5 text-[14px] leading-relaxed font-semibold whitespace-pre-wrap ring-1 ring-line">
        {m.text}
        {m.version !== undefined && (
          <button
            type="button"
            onClick={() => onVersion(m.version!)}
            className={cx('mt-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ring-1 transition', active ? 'bg-ink text-white ring-ink' : 'bg-white text-ink ring-line hover:bg-brand-soft')}
          >
            <Eye size={12} /> v{m.version + 1} {active ? 'görüntüleniyor' : 'oluşturuldu'}
          </button>
        )}
      </div>
    </div>
  )
}

function CodeView({ html, onSave, disabled }: { html: string; onSave: (html: string) => void; disabled?: boolean }) {
  const [code, setCode] = useState(html)
  const toast = useToast()
  const dirty = code !== html
  const download = () => {
    const url = URL.createObjectURL(new Blob([code], { type: 'text/html' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'studyo.html'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <div className="flex h-full min-h-[480px] flex-col p-3 sm:p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="mr-auto text-xs font-semibold text-ink-soft">
          {code.length.toLocaleString('tr-TR')} karakter · {code.split('\n').length.toLocaleString('tr-TR')} satır
        </p>
        <Button
          size="sm"
          icon={<Copy size={14} />}
          onClick={() =>
            navigator.clipboard.writeText(code).then(
              () => toast('Kod kopyalandı'),
              () => toast('Kopyalanamadı', 'error'),
            )
          }
        >
          Kopyala
        </Button>
        <Button size="sm" icon={<Download size={14} />} onClick={download}>
          HTML indir
        </Button>
        {dirty && (
          <>
            <Button size="sm" variant="ghost" onClick={() => setCode(html)}>
              Geri al
            </Button>
            <Button size="sm" variant="primary" icon={<Check size={14} />} onClick={() => onSave(code)} disabled={disabled}>
              Değişiklikleri sürüm olarak kaydet
            </Button>
          </>
        )}
      </div>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        className={cx(inputCls, 'min-h-0 flex-1 resize-none bg-[#0f1420] font-mono text-[12.5px] leading-relaxed text-[#e6e8ee] focus:border-ink')}
      />
    </div>
  )
}

function QuestionList({ version }: { version: StudioVersion }) {
  const q = version.quiz
  if (!q) return <Empty title="Soru yok" />
  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <p className="mb-4 text-sm font-semibold text-ink-soft">
        {q.questions.length} soru · Yönerge: <span className="text-ink">{q.instructions}</span>
      </p>
      <ol className="space-y-3">
        {q.questions.map((x, i) => (
          <li key={i} className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <p className="font-extrabold">
              {i + 1}. {x.prompt}
            </p>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {x.choices.map((c, j) => (
                <li key={j} className={cx('flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold ring-1', j === x.answer ? 'bg-ok-soft text-green-900 ring-green-200' : 'bg-paper ring-line')}>
                  <span className="font-black">{String.fromCharCode(65 + j)})</span> {c}
                  {j === x.answer && <Check size={14} className="ml-auto text-ok" />}
                </li>
              ))}
            </ul>
            {x.explain && <p className="mt-2 text-sm font-semibold text-ink-soft">💡 {x.explain}</p>}
          </li>
        ))}
      </ol>
      <details className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-line">
        <summary className="cursor-pointer text-sm font-extrabold">Ham veri (JSON)</summary>
        <pre className="mt-3 overflow-auto text-xs">{JSON.stringify(q, null, 2)}</pre>
      </details>
    </div>
  )
}

function QuizPreview({ version, grade, onRestart }: { version: StudioVersion; grade: number; onRestart: () => void }) {
  const [done, setDone] = useState<{ correct: number; total: number } | null>(null)
  const [progress, setProgress] = useState(0)
  const activity = useMemo(() => (version.quiz ? buildQuizActivity(version.quiz, version.meta, `g${grade}-onizleme`) : null), [version, grade])
  const tracker = useMemo(() => new SessionTracker(`g${grade}-onizleme`, version.meta.title || 'Önizleme', 'etkinlik', grade), [version, grade])
  if (!activity) return <Empty title="Bu sürümde soru yok" />
  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-line">
        <p className="text-lg font-black">
          {version.meta.emoji} {version.meta.title || 'Test'}
        </p>
        {version.meta.launch && <p className="mt-1 rounded-xl bg-cream p-3 text-sm font-bold">🌱 {version.meta.launch}</p>}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </div>
      {done ? (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-line">
          <p className="text-4xl">🎉</p>
          <p className="mt-2 text-xl font-black">
            {done.correct} / {done.total} doğru
          </p>
          {version.meta.reflect && <p className="mx-auto mt-3 max-w-lg text-sm font-bold text-ink-soft">Düşün ve Paylaş: {version.meta.reflect}</p>}
          <Button className="mt-5" icon={<RotateCcw size={15} />} onClick={onRestart}>
            Baştan çöz
          </Button>
        </div>
      ) : (
        <Suspense fallback={<div className="grid h-60 place-items-center"><LoaderCircle className="animate-spin text-brand" /></div>}>
          <TrackerProvider tracker={tracker}>
            <Quiz activity={activity} onProgress={(d, t) => setProgress(d / Math.max(1, t))} onFinish={(correct, total) => setDone({ correct, total })} />
          </TrackerProvider>
        </Suspense>
      )}
    </div>
  )
}
