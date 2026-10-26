import { useEffect, useState } from 'react'
import { Check, Copy, Send, Share2 } from 'lucide-react'
import { encodeReport, getStudentName, reportUrl, setStudentName, type ReportData, type SessionTracker } from '../lib/report'
import { MathText } from './MathText'

/**
 * "Öğretmenime gönder" kartı: öğrenci adını ve (varsa) Düşün-Paylaş cevabını yazar,
 * rapor linki WhatsApp / paylaşım menüsü / kopyalama ile gönderilir.
 */
export function SendReport({ tracker, reflectQ, feeling, compact }: { tracker: SessionTracker; reflectQ?: string; feeling?: number | null; compact?: boolean }) {
  const [name, setName] = useState(getStudentName)
  const [answer, setAnswer] = useState('')
  const [url, setUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(!compact)

  useEffect(() => setUrl(null), [name, answer, feeling])

  const build = async () => {
    const n = name.trim()
    if (!n) return null
    setStudentName(n)
    const data: ReportData = { ...tracker.snapshot(), name: n, reflection: answer.trim() || undefined, reflectQ, feeling: feeling ?? undefined }
    const u = reportUrl(await encodeReport(data))
    setUrl(u)
    return u
  }

  const text = (u: string) => `${name.trim()} — ${tracker.snapshot().title} raporu: ${u}`

  const whatsapp = async () => {
    const u = url ?? (await build())
    if (u) window.open(`https://wa.me/?text=${encodeURIComponent(text(u))}`, '_blank', 'noopener')
  }
  const share = async () => {
    const u = url ?? (await build())
    if (!u) return
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Öğrenci raporu', text: text(u) })
        return
      } catch {
        /* vazgeçti */
      }
    }
    await copy()
  }
  const copy = async () => {
    const u = url ?? (await build())
    if (!u) return
    try {
      await navigator.clipboard.writeText(text(u))
    } catch {
      /* izin yok */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost w-full max-w-md">
        <Send size={18} />Öğretmenime gönder
      </button>
    )
  }

  return (
    <div className="w-full max-w-2xl rounded-3xl bg-white p-5 text-left ring-1 ring-line">
      <p className="mb-3 flex items-center gap-2 text-sm font-black tracking-wide text-ink uppercase"><Send size={16} className="text-brand" />Öğretmenime gönder</p>
      <label className="block text-sm font-bold text-ink-soft">
        Adın
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ör. Elif K." maxLength={40} className="mt-1 h-12 w-full rounded-xl px-3 text-base font-bold text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand" />
      </label>
      {reflectQ && (
        <label className="mt-3 block text-sm font-bold text-ink-soft">
          <span className="text-ink"><MathText text={reflectQ} /></span>
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={3} maxLength={500} placeholder="Nasıl düşündüğünü kendi cümlelerinle yaz…" className="mt-1 w-full rounded-xl p-3 text-base font-semibold text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand" />
        </label>
      )}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button type="button" disabled={!name.trim()} onClick={whatsapp} className="btn min-h-12 bg-[#25d366] text-white shadow-[0_3px_0_#128c4a] disabled:opacity-40">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.5 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8a11.6 11.6 0 0 1-4.5-4c-.4-.6-.9-1.5-.9-2.4 0-1 .5-1.5.7-1.7.2-.2.4-.3.6-.3h.4c.1 0 .3 0 .5.4l.7 1.6c.1.2.1.3 0 .5l-.3.4-.3.4c-.1.1-.2.3 0 .5.2.3.8 1.2 1.6 2 1.1.9 2 1.2 2.3 1.3.2.1.4.1.5-.1l.7-.9c.2-.2.3-.2.5-.1l1.6.8c.2.1.4.2.4.3.1.1.1.6-.1 1.1Z" /></svg>
          WhatsApp
        </button>
        <button type="button" disabled={!name.trim()} onClick={share} className="btn-ghost min-h-12"><Share2 size={18} />Paylaş</button>
        <button type="button" disabled={!name.trim()} onClick={copy} className="btn-ghost min-h-12">{copied ? <Check size={18} className="text-ok" /> : <Copy size={18} />}{copied ? 'Kopyalandı' : 'Linki kopyala'}</button>
      </div>
      <p className="mt-3 text-xs font-semibold text-ink-soft">Rapor; denemelerini, kullandığın ipuçlarını ve stratejilerini içerir. Hiçbir yere kaydedilmez, yalnızca gönderdiğin kişi görür.</p>
    </div>
  )
}
