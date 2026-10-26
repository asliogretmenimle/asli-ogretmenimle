import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'

export function ShareButton({ title, path, className = '' }: { title: string; path?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const share = async () => {
    const url = path ? new URL(path, window.location.origin).toString() : window.location.href
    if (navigator.share && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)) {
      try {
        await navigator.share({ title: `${title} · Aslı Öğretmenimle`, url })
        return
      } catch {
        /* kullanıcı vazgeçti; panoya kopyalamaya geç */
      }
    }
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <button type="button" onClick={share} className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-extrabold transition active:scale-95 ${copied ? 'bg-ok-soft text-ok' : 'bg-white text-ink ring-1 ring-line hover:bg-paper'} ${className}`} aria-live="polite">
      {copied ? <Check size={16} strokeWidth={3} /> : <Share2 size={16} />}
      <span>{copied ? 'Link kopyalandı' : 'Paylaş'}</span>
    </button>
  )
}
