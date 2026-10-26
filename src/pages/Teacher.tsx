import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, ClipboardPaste, Download, Lightbulb, MessageCircleQuestion, Route, Search, Trash2, UserRound } from 'lucide-react'
import { usePageTitle } from '../components/Layout'
import { MathText } from '../components/MathText'
import { addToPanel, decodeReport, extractCodes, fmtDuration, loadPanel, savePanel, type ReportData, type StoredReport } from '../lib/report'

const FEEL = ['😄 Kolaydı', '🙂 Biraz düşündüm', '🤔 Zorlandı']

function pct(a: number, b: number) {
  return b ? Math.round((a / b) * 100) : 0
}

/** Tek bir raporun ayrıntılı kartı */
export function ReportCard({ r, onDelete }: { r: ReportData; onDelete?: () => void }) {
  const strategies = Object.entries(r.strategies).sort((a, b) => b[1] - a[1])
  const first = pct(r.first, r.total)
  return (
    <article className="card p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-extrabold text-ink-soft">{r.kind === 'oyun' ? 'Oyun' : 'Etkinlik'}{r.grade ? ` · ${r.grade}. sınıf` : ''} · {new Date(r.at).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          <h3 className="text-lg leading-snug font-black">
            {r.kind === 'etkinlik' ? <Link to={`/etkinlik/${r.id}`} className="hover:underline">{r.title}</Link> : <Link to={`/oyun/${r.id}`} className="hover:underline">{r.title}</Link>}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm font-extrabold text-brand"><UserRound size={15} />{r.name}</p>
        </div>
        {onDelete && (
          <button type="button" onClick={onDelete} className="grid size-10 place-items-center rounded-xl text-ink-soft ring-1 ring-line hover:bg-rose-50 hover:text-rose-600" aria-label="Raporu sil"><Trash2 size={17} /></button>
        )}
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { k: 'İlk denemede', v: `${r.first}/${r.total}`, s: `%${first}` },
          { k: 'Yanlış deneme', v: String(r.wrong), s: `${r.tries} deneme` },
          { k: 'İpucu', v: String(r.hints), s: r.hints ? 'kez istedi' : 'istemedi' },
          { k: 'Süre', v: fmtDuration(r.dur), s: r.feeling !== undefined ? FEEL[r.feeling] : '' },
        ].map((m) => (
          <div key={m.k} className="rounded-2xl bg-paper p-3">
            <dt className="text-xs font-extrabold text-ink-soft">{m.k}</dt>
            <dd className="text-xl font-black tabular-nums">{m.v}</dd>
            <dd className="text-xs font-bold text-ink-soft">{m.s}</dd>
          </div>
        ))}
      </dl>

      {r.solutions ? <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">Aynı probleme {r.solutions} farklı çözüm üretti.</p> : null}

      {strategies.length > 0 && (
        <section className="mt-4">
          <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-black"><Route size={15} className="text-sky-600" />Kullandığı stratejiler</h4>
          <div className="flex flex-wrap gap-1.5">
            {strategies.map(([s, n]) => <span key={s} className="chip bg-sky-50 px-3 py-1 text-sm text-sky-800">{s}{n > 1 && <b className="ml-1">×{n}</b>}</span>)}
          </div>
        </section>
      )}

      {r.misconceptions.length > 0 && (
        <section className="mt-4">
          <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-black"><AlertTriangle size={15} className="text-amber-600" />Fark edilen kavram yanılgıları</h4>
          <ul className="space-y-1.5">
            {r.misconceptions.map((m) => <li key={m} className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900"><MathText text={m} /></li>)}
          </ul>
        </section>
      )}

      {r.reflection && (
        <section className="mt-4 rounded-2xl bg-brand-soft p-4">
          <h4 className="mb-1 flex items-center gap-1.5 text-sm font-black text-brand-ink"><MessageCircleQuestion size={15} />Düşün ve Paylaş cevabı</h4>
          {r.reflectQ && <p className="mb-1 text-xs font-bold text-ink-soft"><MathText text={r.reflectQ} /></p>}
          <p className="text-base font-semibold whitespace-pre-wrap text-ink">“{r.reflection}”</p>
        </section>
      )}
    </article>
  )
}

/** /rapor#kod — öğrencinin gönderdiği tek rapor */
export function ReportView() {
  const { hash } = useLocation()
  const navigate = useNavigate()
  const code = hash.replace(/^#/, '')
  const [r, setR] = useState<ReportData | null | undefined>(undefined)
  const [state, setState] = useState<'idle' | 'added' | 'exists' | 'error'>('idle')
  usePageTitle(r ? `${r.name} · ${r.title}` : 'Öğrenci raporu')

  useEffect(() => {
    decodeReport(code).then(setR)
  }, [code])

  if (r === undefined) return <div className="grid h-[50vh] place-items-center"><span className="size-10 animate-spin rounded-full border-4 border-line border-t-brand" /></div>
  if (!r)
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-5xl">🔗</p>
        <h1 className="mt-3 text-2xl font-black">Rapor açılamadı</h1>
        <p className="mt-2 font-semibold text-ink-soft">Link eksik kopyalanmış olabilir. Öğrenciden linki yeniden göndermesini isteyin.</p>
      </div>
    )
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6">
      <p className="chip bg-cream px-3 py-1 text-sm text-amber-800">Öğrenci raporu</p>
      <div className="mt-3"><ReportCard r={r} /></div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" className="btn-primary flex-1" disabled={state === 'added' || state === 'exists'} onClick={() => setState(addToPanel(code, r))}>
          {state === 'added' ? 'Panele eklendi ✓' : state === 'exists' ? 'Zaten panelde' : 'Öğretmen paneline ekle'}
        </button>
        <button type="button" className="btn-ghost flex-1" onClick={() => navigate('/ogretmen')}>Paneli aç</button>
      </div>
      {state === 'error' && <p className="mt-2 text-sm font-bold text-rose-600">Bu cihazda kaydedilemedi (gizli sekme olabilir).</p>}
      <p className="mt-3 text-center text-xs font-semibold text-ink-soft">Panel bu cihazın tarayıcısında saklanır; başka cihazla paylaşılmaz.</p>
    </div>
  )
}

/** /ogretmen — cihazda saklanan raporlar, öğrenci bazında */
export function TeacherPanel() {
  usePageTitle('Öğretmen paneli')
  const [list, setList] = useState<StoredReport[]>(loadPanel)
  const [paste, setPaste] = useState('')
  const [msg, setMsg] = useState('')
  const [q, setQ] = useState('')
  const [student, setStudent] = useState<string | null>(null)

  const importText = async () => {
    const codes = extractCodes(paste)
    let added = 0
    for (const c of codes) {
      const d = await decodeReport(c)
      if (d && addToPanel(c, d) === 'added') added++
    }
    setList(loadPanel())
    setPaste('')
    setMsg(codes.length ? `${added} yeni rapor eklendi${codes.length - added ? `, ${codes.length - added} tanesi zaten vardı` : ''}.` : 'Metinde rapor linki bulunamadı.')
  }

  const remove = (code: string) => {
    const next = list.filter((r) => r.code !== code)
    savePanel(next)
    setList(next)
  }

  const students = useMemo(() => {
    const map = new Map<string, StoredReport[]>()
    for (const r of list) {
      const k = r.data.name.trim().toLocaleLowerCase('tr-TR')
      map.set(k, [...(map.get(k) ?? []), r])
    }
    return [...map.values()]
      .map((rs) => {
        const total = rs.reduce((s, r) => s + r.data.total, 0)
        const first = rs.reduce((s, r) => s + r.data.first, 0)
        const hints = rs.reduce((s, r) => s + r.data.hints, 0)
        const strat = new Map<string, number>()
        rs.forEach((r) => Object.entries(r.data.strategies).forEach(([k, v]) => strat.set(k, (strat.get(k) ?? 0) + v)))
        const misc = [...new Set(rs.flatMap((r) => r.data.misconceptions))]
        return { name: rs[0].data.name, reports: rs.sort((a, b) => b.data.at - a.data.at), total, first, hints, strat: [...strat].sort((a, b) => b[1] - a[1]).slice(0, 4), misc }
      })
      .filter((s) => !q || s.name.toLocaleLowerCase('tr-TR').includes(q.toLocaleLowerCase('tr-TR')))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  }, [list, q])

  const exportCsv = () => {
    const rows = [['Öğrenci', 'Tarih', 'Tür', 'Sınıf', 'Başlık', 'İlk denemede', 'Toplam', 'Yanlış', 'İpucu', 'Süre (sn)', 'Stratejiler', 'Kavram yanılgıları', 'Düşün-Paylaş cevabı']]
    for (const { data: r } of list)
      rows.push([r.name, new Date(r.at).toLocaleString('tr-TR'), r.kind, String(r.grade ?? ''), r.title, String(r.first), String(r.total), String(r.wrong), String(r.hints), String(r.dur), Object.entries(r.strategies).map(([k, v]) => `${k} (${v})`).join('; '), r.misconceptions.join(' | '), r.reflection ?? ''])
    const csv = '﻿' + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `ogrenci-raporlari-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const sel = students.find((s) => s.name === student)

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Öğretmen paneli</h1>
          <p className="mt-1 font-semibold text-ink-soft">Öğrencilerin gönderdiği raporlar burada toplanır: stratejiler, ipucu ihtiyacı, kavram yanılgıları ve gelişim.</p>
        </div>
        {list.length > 0 && <button type="button" onClick={exportCsv} className="btn-ghost min-h-11"><Download size={17} />Excel’e aktar (CSV)</button>}
      </div>

      <section className="mt-6 rounded-3xl bg-white p-5 ring-1 ring-line">
        <h2 className="flex items-center gap-2 font-black"><ClipboardPaste size={18} />Rapor ekle</h2>
        <p className="mt-1 text-sm font-semibold text-ink-soft">Öğrencilerden gelen linkleri buraya yapıştırın. WhatsApp sohbetini toptan kopyalayıp yapıştırabilirsiniz; tüm linkler otomatik bulunur.</p>
        <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={3} placeholder="…/rapor#z…" className="mt-3 w-full rounded-xl p-3 text-sm font-semibold ring-1 ring-line outline-none focus:ring-2 focus:ring-brand" />
        <div className="mt-2 flex items-center gap-3">
          <button type="button" onClick={importText} disabled={!paste.trim()} className="btn-primary min-h-11">Raporları ekle</button>
          {msg && <span className="text-sm font-bold text-ink-soft">{msg}</span>}
        </div>
      </section>

      {list.length === 0 ? (
        <div className="mt-8 card p-8 text-center">
          <p className="text-5xl">📬</p>
          <p className="mt-3 text-lg font-black">Henüz rapor yok</p>
          <p className="mx-auto mt-1 max-w-lg text-sm font-semibold text-ink-soft">Öğrenciler bir etkinliği ya da oyunu bitirince “Öğretmenime gönder” düğmesiyle size link gönderir. Linki açtığınızda “Panele ekle” deyin ya da linkleri yukarıya yapıştırın.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside>
            <label className="relative block">
              <Search size={17} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Öğrenci ara" className="h-12 w-full rounded-xl bg-white pr-3 pl-10 font-semibold ring-1 ring-line outline-none focus:ring-2 focus:ring-brand" />
            </label>
            <ul className="mt-3 space-y-2">
              {students.map((s) => (
                <li key={s.name}>
                  <button type="button" onClick={() => setStudent(s.name)} className={`w-full rounded-2xl p-3 text-left ring-1 transition ${student === s.name ? 'bg-brand-soft ring-brand/40' : 'bg-white ring-line hover:bg-paper'}`}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-black">{s.name}</span>
                      <span className="chip bg-paper text-ink-soft">{s.reports.length} rapor</span>
                    </span>
                    <span className="mt-1 flex gap-3 text-xs font-bold text-ink-soft">
                      <span>İlk denemede %{pct(s.first, s.total)}</span>
                      <span className="flex items-center gap-0.5"><Lightbulb size={12} />{s.hints}</span>
                      {s.misc.length > 0 && <span className="text-amber-700">{s.misc.length} yanılgı</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <div className="min-w-0">
            {!sel ? (
              <div className="card p-8 text-center font-bold text-ink-soft">Ayrıntıları görmek için soldan bir öğrenci seçin.</div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-3xl bg-white p-5 ring-1 ring-line">
                  <h2 className="text-2xl font-black">{sel.name}</h2>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Stat k="Rapor" v={String(sel.reports.length)} />
                    <Stat k="İlk denemede" v={`%${pct(sel.first, sel.total)}`} />
                    <Stat k="İpucu" v={String(sel.hints)} />
                    <Stat k="Yanılgı" v={String(sel.misc.length)} />
                  </div>
                  <Trend reports={sel.reports} />
                  {sel.strat.length > 0 && (
                    <p className="mt-3 text-sm font-semibold text-ink-soft">En çok kullandığı stratejiler: {sel.strat.map(([k, v]) => <span key={k} className="chip mr-1 bg-sky-50 text-sky-800">{k} ×{v}</span>)}</p>
                  )}
                </div>
                {sel.reports.map((r) => <ReportCard key={r.code} r={r.data} onDelete={() => remove(r.code)} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl bg-paper p-3">
      <p className="text-xs font-extrabold text-ink-soft">{k}</p>
      <p className="text-xl font-black tabular-nums">{v}</p>
    </div>
  )
}

/** Zaman içindeki ilk-deneme başarısı (en eski → en yeni) */
function Trend({ reports }: { reports: StoredReport[] }) {
  const pts = [...reports].sort((a, b) => a.data.at - b.data.at).map((r) => pct(r.data.first, r.data.total))
  if (pts.length < 2) return null
  const W = 300, H = 60
  const x = (i: number) => 6 + (i / (pts.length - 1)) * (W - 12)
  const y = (v: number) => H - 6 - (v / 100) * (H - 12)
  return (
    <div className="mt-4">
      <p className="mb-1 text-xs font-extrabold text-ink-soft">Gelişim (ilk denemede doğru %, eskiden yeniye)</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full max-w-md" role="img" aria-label="Gelişim grafiği">
        <polyline points={pts.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke="#d6457a" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={4} fill="#fff" stroke="#d6457a" strokeWidth={2.5} />)}
      </svg>
    </div>
  )
}
