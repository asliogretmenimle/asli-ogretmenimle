import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AlertTriangle, MessageCircleQuestion, Route, UserRound } from 'lucide-react'
import { usePageTitle } from '../components/Layout'
import { MathText } from '../components/MathText'
import { decodeReport, fmtDuration, type ReportData } from '../lib/report'

const FEEL = ['😄 Kolaydı', '🙂 Biraz düşündüm', '🤔 Zorlandı']

function pct(a: number, b: number) {
  return b ? Math.round((a / b) * 100) : 0
}

/** Tek bir raporun ayrıntılı kartı */
export function ReportCard({ r }: { r: ReportData }) {
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
  const code = hash.replace(/^#/, '')
  const [r, setR] = useState<ReportData | null | undefined>(undefined)
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
    </div>
  )
}
