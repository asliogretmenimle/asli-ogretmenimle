/** Online özel ders başvuruları: sitedeki formdan gelen ön kayıtlar */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Download, Inbox, MessageCircle, Phone, RefreshCw, Save, Search, Trash2, X } from 'lucide-react'
import { sb } from '../supabase'
import { Badge, Button, Empty, IconButton, PageHead, Tabs, TextArea, cx, inputCls, timeAgo, useConfirm, useToast, type Tone } from '../ui'

type Status = 'new' | 'contacted' | 'enrolled' | 'closed'

interface LessonRequest {
  id: string
  created_at: string
  student_name: string
  parent_name: string
  phone: string
  grade: number
  lesson_type: 'birebir' | 'grup' | 'kararsiz' | null
  contact_pref: 'whatsapp' | 'arama' | null
  contact_time: string | null
  expectations: string | null
  questions: string | null
  consent: boolean
  source_path: string | null
  referrer: string | null
  status: Status
  admin_note: string | null
  handled_at: string | null
  handled_by_email: string | null
}

const STATUS: Record<Status, { label: string; tone: Tone }> = {
  new: { label: 'Yeni', tone: 'pink' },
  contacted: { label: 'Arandı', tone: 'blue' },
  enrolled: { label: 'Kayıt oldu', tone: 'green' },
  closed: { label: 'Kapandı', tone: 'gray' },
}
const ORDER: Status[] = ['new', 'contacted', 'enrolled', 'closed']
const LESSON: Record<string, string> = { birebir: 'Birebir ders', grup: 'Küçük grup (3–4 kişi)', kararsiz: 'Henüz karar vermedi' }
const CONTACT: Record<string, string> = { whatsapp: 'WhatsApp', arama: 'Telefon araması' }

/** 05321234567 → 0532 123 45 67 */
const prettyPhone = (p: string) => {
  const d = p.replace(/\D/g, '')
  return d.length === 11 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}` : p
}
const waNumber = (p: string) => `90${p.replace(/\D/g, '').replace(/^0/, '')}`
const waMessage = (r: LessonRequest) =>
  `Merhaba ${r.parent_name}, ben Aslı Öğretmen. ${r.student_name} için bıraktığınız online matematik dersi ön kaydı bana ulaştı, teşekkür ederim. Ders ihtiyacını konuşmak için size uygun bir zaman var mı?`
const fullDate = (iso: string) => new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export function RequestsPage() {
  const toast = useToast()
  const [rows, setRows] = useState<LessonRequest[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | Status>('new')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await sb.from('lesson_requests').select('*').order('created_at', { ascending: false }).limit(1000)
    setLoading(false)
    if (error) {
      setError(/does not exist|schema cache/i.test(error.message) ? 'Başvuru tablosu bulunamadı. supabase/migrations/20261126140000_cms_v2.sql dosyasını Supabase SQL Editor’de çalıştırın.' : error.message)
      setRows([])
      return
    }
    setError(null)
    setRows((data ?? []) as LessonRequest[])
  }, [])

  useEffect(() => {
    load()
    // Yeni başvurular için arada bir yenile
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 60_000)
    return () => clearInterval(t)
  }, [load])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows?.length ?? 0 }
    for (const r of rows ?? []) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }, [rows])

  const key = (s: string) => s.toLocaleLowerCase('tr')
  const list = (rows ?? []).filter(
    (r) => (filter === 'all' || r.status === filter) && (!q || key(`${r.student_name} ${r.parent_name} ${r.phone} ${r.expectations ?? ''} ${r.questions ?? ''}`).includes(key(q.replace(/\s/g, '').match(/^\d+$/) ? q.replace(/\s/g, '') : q))),
  )
  const open = rows?.find((r) => r.id === openId) ?? null

  const update = async (id: string, patch: Partial<LessonRequest>) => {
    const { data, error } = await sb.from('lesson_requests').update(patch).eq('id', id).select('*').single()
    if (error) {
      toast(error.message, 'error')
      return false
    }
    setRows((rs) => (rs ?? []).map((r) => (r.id === id ? (data as LessonRequest) : r)))
    return true
  }
  const remove = async (id: string) => {
    const { error } = await sb.from('lesson_requests').delete().eq('id', id)
    if (error) return toast(error.message, 'error')
    setRows((rs) => (rs ?? []).filter((r) => r.id !== id))
    setOpenId(null)
    toast('Başvuru silindi')
  }

  const exportCsv = () => {
    const cols: [string, (r: LessonRequest) => string | number | null][] = [
      ['Tarih', (r) => fullDate(r.created_at)],
      ['Durum', (r) => STATUS[r.status].label],
      ['Öğrenci', (r) => r.student_name],
      ['Sınıf', (r) => r.grade],
      ['Veli', (r) => r.parent_name],
      ['Telefon', (r) => prettyPhone(r.phone)],
      ['Ders tercihi', (r) => (r.lesson_type ? LESSON[r.lesson_type] : '')],
      ['İletişim', (r) => (r.contact_pref ? CONTACT[r.contact_pref] : '')],
      ['Uygun saat', (r) => r.contact_time],
      ['Beklentiler', (r) => r.expectations],
      ['Sorular', (r) => r.questions],
      ['Not', (r) => r.admin_note],
    ]
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const csv = [cols.map(([h]) => esc(h)).join(';'), ...list.map((r) => cols.map(([, f]) => esc(f(r))).join(';'))].join('\r\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `ders-basvurulari-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHead
        title="Ders başvuruları"
        desc="Online Özel Ders sayfasındaki formdan gelen ön kayıtlar. Veliyi arayın ya da WhatsApp’tan yazın, durumunu güncelleyin ve not alın."
        actions={
          <>
            <Button icon={<Download size={16} />} onClick={exportCsv} disabled={!list.length}>
              CSV indir
            </Button>
            <Button icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />} onClick={load}>
              Yenile
            </Button>
          </>
        }
      />

      <Tabs
        className="mb-4"
        value={filter}
        onChange={setFilter}
        tabs={[...ORDER.map((s) => ({ value: s, label: STATUS[s].label, count: counts[s] ?? 0 })), { value: 'all' as const, label: 'Tümü', count: counts.all }]}
      />
      <div className="relative mb-4 max-w-md">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="İsim, telefon ya da metin ara…" className={cx(inputCls, 'pl-9')} />
      </div>

      {error && <div className="mb-4 rounded-2xl bg-bad-soft p-4 text-sm font-bold text-red-900">{error}</div>}

      <div className={cx('grid gap-5', open && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]')}>
        <div className={cx(open && 'max-lg:hidden')}>
          {!rows ? (
            <div className="h-60 animate-pulse rounded-2xl bg-white ring-1 ring-line" />
          ) : !list.length ? (
            <Empty
              icon={<Inbox size={22} />}
              title={rows.length ? 'Bu filtrede başvuru yok' : 'Henüz başvuru yok'}
              desc={rows.length ? 'Başka bir sekme seçin ya da aramayı temizleyin.' : 'Veliler sitedeki Online Özel Ders sayfasından formu doldurdukça başvurular burada listelenir.'}
            />
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-white ring-1 ring-line">
              {list.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(r.id)}
                    className={cx('flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-paper/60', openId === r.id && 'bg-brand-soft/40')}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-paper text-sm font-black text-ink ring-1 ring-line">{r.grade}.</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className={cx('truncate font-extrabold', r.status === 'new' && 'text-ink')}>{r.student_name}</span>
                        <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] font-semibold text-ink-soft">
                        Veli: {r.parent_name} · {prettyPhone(r.phone)}
                      </span>
                      {r.expectations && <span className="mt-0.5 block truncate text-xs font-semibold text-ink-soft/80">{r.expectations}</span>}
                    </span>
                    <span className="shrink-0 text-xs font-bold text-ink-soft">{timeAgo(r.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {open && (
          <Detail
            key={open.id}
            r={open}
            onClose={() => setOpenId(null)}
            onUpdate={(p) => update(open.id, p)}
            onDelete={() => remove(open.id)}
          />
        )}
      </div>
    </div>
  )
}

function Detail({ r, onClose, onUpdate, onDelete }: { r: LessonRequest; onClose: () => void; onUpdate: (p: Partial<LessonRequest>) => Promise<boolean>; onDelete: () => void }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [note, setNote] = useState(r.admin_note ?? '')
  const [saving, setSaving] = useState(false)

  // Mobilde tam ekran: arka plan kaymasın
  useEffect(() => {
    if (window.innerWidth >= 1024) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const setStatus = async (s: Status) => {
    if (s === r.status) return
    if (await onUpdate({ status: s })) toast(`Durum: ${STATUS[s].label}`)
  }
  const saveNote = async () => {
    setSaving(true)
    if (await onUpdate({ admin_note: note.trim() || null })) toast('Not kaydedildi')
    setSaving(false)
  }
  const del = async () => {
    if (await confirm({ title: 'Başvuru silinsin mi?', desc: `${r.student_name} için yapılan başvuru kalıcı olarak silinir.`, confirm: 'Sil', danger: true })) onDelete()
  }

  const rowsInfo: [string, string | null][] = [
    ['Sınıf', `${r.grade}. sınıf`],
    ['Ders tercihi', r.lesson_type ? LESSON[r.lesson_type] : null],
    ['İletişim tercihi', r.contact_pref ? CONTACT[r.contact_pref] : null],
    ['Uygun saatler', r.contact_time],
    ['Başvuru tarihi', fullDate(r.created_at)],
  ]

  return (
    <aside className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white lg:z-auto lg:max-h-[calc(100dvh-4rem)] lg:rounded-2xl lg:ring-1 lg:ring-line lg:shadow-[var(--shadow-card)] lg:sticky lg:top-8">
      <header className="flex items-start gap-2 border-b border-line px-4 py-3 sm:px-5">
        <IconButton label="Listeye dön" onClick={onClose} className="size-10 lg:hidden">
          <ArrowLeft size={18} />
        </IconButton>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-ink-soft">{timeAgo(r.created_at)}</p>
          <h2 className="truncate text-lg font-black">{r.student_name}</h2>
          <p className="truncate text-sm font-semibold text-ink-soft">Veli: {r.parent_name}</p>
        </div>
        <IconButton label="Kapat" onClick={onClose} className="hidden lg:grid">
          <X size={18} />
        </IconButton>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5">
        <div className="grid grid-cols-2 gap-2">
          <a href={`tel:${r.phone}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ink px-3 font-extrabold text-white hover:bg-ink/90">
            <Phone size={18} />
            Ara
          </a>
          <a href={`https://wa.me/${waNumber(r.phone)}?text=${encodeURIComponent(waMessage(r))}`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#25d366] px-3 font-extrabold text-white hover:brightness-95">
            <MessageCircle size={18} />
            WhatsApp
          </a>
        </div>
        <p className="-mt-3 text-center text-sm font-bold tabular-nums text-ink-soft">{prettyPhone(r.phone)}</p>

        <div>
          <p className="mb-2 text-xs font-black tracking-wide text-ink-soft uppercase">Durum</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {ORDER.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={r.status === s}
                onClick={() => setStatus(s)}
                className={cx('h-10 rounded-xl text-sm font-extrabold ring-1 transition', r.status === s ? 'bg-ink text-white ring-ink' : 'bg-white text-ink-soft ring-line hover:text-ink')}
              >
                {STATUS[s].label}
              </button>
            ))}
          </div>
          {r.handled_at && (
            <p className="mt-1.5 text-xs font-semibold text-ink-soft">
              Son işlem {timeAgo(r.handled_at)}
              {r.handled_by_email ? ` · ${r.handled_by_email}` : ''}
            </p>
          )}
        </div>

        <dl className="divide-y divide-line rounded-2xl ring-1 ring-line">
          {rowsInfo.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 px-4 py-2.5 text-sm">
              <dt className="font-bold text-ink-soft">{k}</dt>
              <dd className="text-right font-extrabold">{v || '—'}</dd>
            </div>
          ))}
        </dl>

        <Answer title="Beklentiler" text={r.expectations} />
        <Answer title="Öğretmene soruları" text={r.questions} />

        <div>
          <p className="mb-2 text-xs font-black tracking-wide text-ink-soft uppercase">Not (yalnızca panelde görünür)</p>
          <TextArea value={note} onChange={setNote} placeholder="Örn. Perşembe 18.00’de deneme dersi planlandı." minRows={3} />
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant="primary" icon={<Save size={14} />} loading={saving} disabled={(r.admin_note ?? '') === note.trim()} onClick={saveNote}>
              Notu kaydet
            </Button>
          </div>
        </div>
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-line px-4 py-3 sm:px-5">
        <span className="truncate text-xs font-semibold text-ink-soft">{r.source_path ? `Kaynak: ${r.source_path}` : ''}</span>
        <Button size="sm" variant="danger" icon={<Trash2 size={14} />} onClick={del}>
          Sil
        </Button>
      </footer>
    </aside>
  )
}

function Answer({ title, text }: { title: string; text: string | null }) {
  return (
    <div>
      <p className="mb-2 text-xs font-black tracking-wide text-ink-soft uppercase">{title}</p>
      <p className={cx('rounded-2xl bg-paper p-4 text-sm leading-relaxed font-semibold whitespace-pre-wrap ring-1 ring-line', !text && 'text-ink-soft')}>{text || 'Yazılmamış'}</p>
    </div>
  )
}
