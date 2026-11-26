import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, CheckCircle2, CircleAlert, Gamepad2, Puzzle, Sparkles, Wand2 } from 'lucide-react'
import { ADMIN_PATH } from '../../cms/config'
import { builtin } from '../../cms/overlay'
import { gradeInfo, grades } from '../../data/curriculum'
import { loadRevisions, studioCall, useEntries, type Revision } from '../api'
import { sb } from '../supabase'
import { kindInfo } from '../catalog'
import { ACTION } from '../editors/MetaEditor'
import { Badge, Card, cx, timeAgo } from '../ui'

interface SessionRow {
  id: string
  title: string
  kind: string
  updated_at: string
  entry_id: string | null
}

export function Dashboard() {
  const { entries } = useEntries()
  const [revs, setRevs] = useState<Revision[] | null>(null)
  const [sessions, setSessions] = useState<SessionRow[] | null>(null)
  const [studio, setStudio] = useState<{ ok: boolean; hasKey?: boolean; model?: string; error?: string } | null>(null)

  useEffect(() => {
    loadRevisions({ limit: 8 }).then(setRevs, () => setRevs([]))
    sb.from('studio_sessions').select('id,title,kind,updated_at,entry_id').order('updated_at', { ascending: false }).limit(5).then(({ data }) => setSessions((data ?? []) as SessionRow[]))
    studioCall<{ ok: boolean; hasKey: boolean; model: string }>({ action: 'status' }).then(setStudio, (e) => setStudio({ ok: false, error: (e as Error).message }))
  }, [])

  const custom = entries.filter((e) => e.origin === 'custom' && !e.hidden)
  const edited = entries.filter((e) => e.origin === 'builtin' && !e.hidden && Object.keys(e.data ?? {}).length)
  const hidden = entries.filter((e) => e.hidden)
  const drafts = entries.filter((e) => e.status === 'draft')
  const count = (k: string) => custom.filter((e) => e.kind === k).length

  const stats = [
    { label: 'Oyun', n: builtin.games().length + count('game'), extra: count('game'), icon: <Gamepad2 size={18} />, to: `${ADMIN_PATH}/oyunlar` },
    { label: 'Etkileşim', n: builtin.interactions().filter((m) => m.ready).length + count('interaction'), extra: count('interaction'), icon: <Sparkles size={18} />, to: `${ADMIN_PATH}/etkilesimler` },
    { label: 'Manipülatif', n: builtin.tools().length + count('manipulative'), extra: count('manipulative'), icon: <Puzzle size={18} />, to: `${ADMIN_PATH}/manipulatifler` },
    { label: 'Konu anlatımı', n: builtin.guides().length + count('guide'), extra: count('guide'), icon: <BookOpen size={18} />, to: `${ADMIN_PATH}/rehberler` },
  ]

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-3xl bg-ink p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs font-black tracking-widest text-brand uppercase">Stüdyo</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">Aklınızdaki etkinliği anlatın, yapay zekâ hazırlasın.</h1>
            <p className="mt-2 text-sm font-semibold text-white/70">Oyun, etkileşim, manipülatif ya da test: yazın, önizlemede deneyin, sohbetle düzelttirin ve tek tıkla sitede yayınlayın.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['game', 'interaction', 'manipulative', 'test'] as const).map((k) => (
              <Link key={k} to={`${ADMIN_PATH}/studyo?tur=${k}`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-extrabold ring-1 ring-white/15 transition hover:bg-white/20">
                <span aria-hidden>{k === 'test' ? '✅' : kindInfo[k].emoji}</span>
                {k === 'test' ? 'Test' : kindInfo[k].label}
              </Link>
            ))}
            <Link to={`${ADMIN_PATH}/studyo`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-extrabold text-white shadow transition hover:bg-brand-dark">
              <Wand2 size={16} />
              Stüdyo’yu aç
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="group rounded-2xl bg-white p-4 ring-1 ring-line transition hover:shadow-[var(--shadow-lift)]">
            <div className="flex items-center justify-between text-ink-soft">
              {s.icon}
              <ArrowRight size={16} className="opacity-0 transition group-hover:opacity-100" />
            </div>
            <p className="mt-3 text-3xl font-black tabular-nums">{s.n}</p>
            <p className="text-sm font-bold text-ink-soft">
              {s.label}
              {s.extra > 0 && <span className="ml-1 text-violet-700">· {s.extra} yeni</span>}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card title="Sınıflar" desc="Her sınıfın etkinlik, test, oyun, etkileşim ve manipülatiflerini yönetin" pad>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {grades.map((g) => (
                <Link key={g} to={`${ADMIN_PATH}/sinif/${g}`} className="flex items-center gap-3 rounded-2xl p-3 ring-1 ring-line transition hover:shadow-[var(--shadow-lift)]" style={{ background: gradeInfo[g].soft }}>
                  <span className="grid size-10 place-items-center rounded-xl text-lg font-black text-white" style={{ background: gradeInfo[g].color }}>
                    {g}
                  </span>
                  <span className="text-sm font-black" style={{ color: gradeInfo[g].ink }}>
                    {gradeInfo[g].label}
                  </span>
                </Link>
              ))}
            </div>
          </Card>

          <Card title="Son değişiklikler" action={<Link to={`${ADMIN_PATH}/gecmis`} className="text-sm font-bold text-brand hover:underline">Tümü</Link>} pad={false}>
            {!revs ? (
              <div className="m-5 h-32 animate-pulse rounded-xl bg-paper" />
            ) : !revs.length ? (
              <p className="p-5 text-sm font-semibold text-ink-soft">Henüz değişiklik yok. Bir sınıf seçip içerikleri düzenlemeye başlayın.</p>
            ) : (
              <ul className="divide-y divide-line">
                {revs.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-lg" aria-hidden>
                      {kindInfo[r.kind]?.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold">{String(r.snapshot?.data?.name ?? r.snapshot?.data?.title ?? r.ref)}</span>
                      <span className="block truncate text-xs font-semibold text-ink-soft">
                        {kindInfo[r.kind]?.label} · {r.created_by_email ?? '—'} · {timeAgo(r.created_at)}
                      </span>
                    </span>
                    <Badge tone={r.action === 'hide' || r.action === 'delete' ? 'red' : r.action === 'create' ? 'violet' : 'blue'}>{ACTION[r.action] ?? r.action}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Özet">
            <ul className="space-y-2 text-sm font-bold">
              <Stat label="Panelden eklenen içerik" n={custom.length} tone="violet" />
              <Stat label="Düzenlenen içerik" n={edited.length} tone="blue" />
              <Stat label="Taslak" n={drafts.length} tone="amber" />
              <Stat label="Gizlenen içerik" n={hidden.length} tone="red" />
            </ul>
          </Card>

          <Card title="Son Stüdyo çalışmaları" action={<Link to={`${ADMIN_PATH}/studyo`} className="text-sm font-bold text-brand hover:underline">Tümü</Link>} pad={false}>
            {!sessions ? (
              <div className="m-5 h-24 animate-pulse rounded-xl bg-paper" />
            ) : !sessions.length ? (
              <p className="p-5 text-sm font-semibold text-ink-soft">Henüz çalışma yok.</p>
            ) : (
              <ul className="divide-y divide-line">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <Link to={`${ADMIN_PATH}/studyo/${s.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-paper/60">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold">{s.title}</span>
                        <span className="block text-xs font-semibold text-ink-soft">{timeAgo(s.updated_at)}</span>
                      </span>
                      {s.entry_id && <Badge tone="green">Yayında</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Kurulum durumu">
            <ul className="space-y-2.5 text-sm font-bold">
              <Check ok label="Veritabanı bağlantısı" />
              <Check ok={!!studio?.ok} pending={!studio} label="Stüdyo sunucusu (Edge Function)" hint={studio?.error} />
              <Check ok={!!studio?.hasKey} pending={!studio} label="OpenAI anahtarı" hint={studio?.ok && !studio.hasKey ? 'supabase secrets set OPENAI_API_KEY=…' : undefined} />
            </ul>
            {studio?.model && <p className="mt-3 text-xs font-semibold text-ink-soft">Model: {studio.model}</p>}
          </Card>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, n, tone }: { label: string; n: number; tone: 'violet' | 'blue' | 'amber' | 'red' }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-ink-soft">{label}</span>
      <Badge tone={tone}>{n}</Badge>
    </li>
  )
}

function Check({ ok, pending, label, hint }: { ok: boolean; pending?: boolean; label: string; hint?: string }) {
  return (
    <li className="flex items-start gap-2">
      {pending ? <span className="mt-0.5 size-4 animate-spin rounded-full border-2 border-line border-t-brand" /> : ok ? <CheckCircle2 size={18} className="shrink-0 text-ok" /> : <CircleAlert size={18} className="shrink-0 text-amber-600" />}
      <span className="min-w-0">
        <span className={cx(!ok && !pending && 'text-amber-800')}>{label}</span>
        {hint && !ok && <span className="block text-xs font-semibold break-words text-ink-soft">{hint}</span>}
      </span>
    </li>
  )
}

