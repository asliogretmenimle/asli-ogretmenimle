import { useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, Minimize2, RotateCcw } from 'lucide-react'
import { sfx } from '../lib/feedback'
import { buildSrcDoc, isFrameMessage, type FrameKind, type FrameMessage } from './bridge'
import { fetchEntryHtml } from './fetch'

export interface HtmlFrameProps {
  kind: FrameKind
  grade: number
  /** Yayındaki öğe: HTML Supabase'den yüklenir */
  cmsId?: string
  /** Önizleme: HTML doğrudan verilir */
  html?: string
  onFinish?: (r: { stars: 1 | 2 | 3; summary: string; score: number; insight?: string }) => void
  onError?: (message: string) => void
  /** CSS yüksekliği (varsayılan: ekranın büyük kısmı) */
  height?: string
  className?: string
  /** Üstteki küçük araç çubuğu (yeniden başlat / tam ekran) */
  toolbar?: boolean
}

/** Stüdyo'da üretilmiş oyun / etkileşim / manipülatifi güvenli bir çerçevede çalıştırır */
export function HtmlFrame({ kind, grade, cmsId, html, onFinish, onError, height = 'min(82dvh, 880px)', className = '', toolbar = true }: HtmlFrameProps) {
  const [loaded, setLoaded] = useState<string | null>(html ?? null)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const [run, setRun] = useState(0)
  const [full, setFull] = useState(false)
  const ref = useRef<HTMLIFrameElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const cb = useRef({ onFinish, onError })
  cb.current = { onFinish, onError }

  useEffect(() => {
    if (html !== undefined) return setLoaded(html)
    if (!cmsId) return
    let alive = true
    setFailed(false)
    fetchEntryHtml(cmsId).then(
      (h) => alive && setLoaded(h),
      () => alive && setFailed(true),
    )
    return () => {
      alive = false
    }
  }, [cmsId, html, retry])

  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow || !isFrameMessage(e.data)) return
      const m = e.data as FrameMessage
      if (m.type === 'finish' && m.result) {
        const r = m.result
        cb.current.onFinish?.({ stars: Math.max(1, Math.min(3, Math.round(r.stars ?? 2))) as 1 | 2 | 3, summary: r.summary ?? '', score: r.score ?? 0, insight: r.insight })
      } else if (m.type === 'error' && m.message) cb.current.onError?.(m.message)
      else if (m.type === 'sound') {
        const fn = (sfx as Record<string, (() => unknown) | undefined>)[m.name ?? '']
        fn?.()
      }
    }
    window.addEventListener('message', on)
    return () => window.removeEventListener('message', on)
  }, [])

  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === box.current)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])

  const srcDoc = useMemo(() => (loaded ? buildSrcDoc(loaded, { grade, kind }) : ''), [loaded, grade, kind])

  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else box.current?.requestFullscreen?.().catch(() => {})
  }

  if (failed)
    return (
      <div className="grid place-items-center rounded-3xl bg-white p-10 text-center ring-1 ring-line">
        <p className="font-extrabold">Bu içerik şu an yüklenemedi.</p>
        <button type="button" className="btn-ghost mt-3" onClick={() => setRetry((x) => x + 1)}>Tekrar dene</button>
      </div>
    )

  return (
    <div ref={box} className={`relative overflow-hidden rounded-3xl bg-white ring-1 ring-line ${full ? 'rounded-none' : ''} ${className}`}>
      {toolbar && (
        <div className="absolute top-2 right-2 z-10 flex gap-1.5 opacity-60 transition hover:opacity-100">
          <button type="button" onClick={() => setRun((x) => x + 1)} className="grid size-9 place-items-center rounded-xl bg-white/90 text-ink-soft shadow ring-1 ring-line hover:text-ink" aria-label="Baştan başlat" title="Baştan başlat">
            <RotateCcw size={16} />
          </button>
          <button type="button" onClick={toggleFull} className="grid size-9 place-items-center rounded-xl bg-white/90 text-ink-soft shadow ring-1 ring-line hover:text-ink" aria-label={full ? 'Tam ekrandan çık' : 'Tam ekran'} title={full ? 'Tam ekrandan çık' : 'Tam ekran'}>
            {full ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      )}
      {loaded === null ? (
        <div className="grid place-items-center" style={{ height }}>
          <span className="size-10 animate-spin rounded-full border-4 border-line border-t-brand" aria-label="Yükleniyor" />
        </div>
      ) : (
        <iframe
          key={run}
          ref={ref}
          title="Etkinlik"
          srcDoc={srcDoc}
          sandbox="allow-scripts allow-pointer-lock"
          allow="fullscreen; autoplay"
          className="block w-full border-0 bg-white"
          style={{ height: full ? '100dvh' : height }}
        />
      )}
    </div>
  )
}
