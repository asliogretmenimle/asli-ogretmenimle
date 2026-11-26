/**
 * Sitenin gerçek sayfasını panelde, kaydedilmemiş değişikliklerle gösterir.
 * Site bir iframe'de ?onizleme=1 ile açılır; taslak kayıtlar postMessage ile gönderilir (bkz. cms/runtime.ts).
 * Cihaz genişliği gerçekten değiştiği için sitenin mobil/tablet düzeni birebir görünür.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Monitor, RotateCcw, Smartphone, Tablet } from 'lucide-react'
import type { CmsEntry } from '../../cms/types'
import { cx } from '../ui'

type Device = 'phone' | 'tablet' | 'desktop'
const SIZES: Record<Device, { w: number; h: number; label: string }> = {
  phone: { w: 390, h: 844, label: 'Telefon' },
  tablet: { w: 820, h: 1180, label: 'Tablet' },
  desktop: { w: 1366, h: 900, label: 'Bilgisayar' },
}

export interface PreviewTarget {
  label: string
  path: string
}

export interface SitePreviewProps {
  /** Açılacak sayfa(lar); birden çoksa üstte seçilir */
  targets: PreviewTarget[]
  /** Kaydedilmemiş kayıtlar (taslak) */
  entries?: CmsEntry[]
  /** Kayıt kimliği → HTML (Stüdyo içerikleri) */
  html?: Record<string, string>
  /** Önizleme sınıfı: yollara ?sinif= eklenir */
  grade?: number
  className?: string
  /** Yükseklik sınırı (CSS) */
  maxHeight?: string
  defaultDevice?: Device
}

const withParams = (path: string, grade?: number) => {
  const u = new URL(path, location.origin)
  u.searchParams.set('onizleme', '1')
  if (grade) u.searchParams.set('sinif', String(grade))
  return `${u.pathname}${u.search}${u.hash}`
}

export function SitePreview({ targets, entries = [], html, grade, className, maxHeight = 'calc(100dvh - 9rem)', defaultDevice }: SitePreviewProps) {
  const [device, setDevice] = useState<Device>(defaultDevice ?? 'phone')
  const [ti, setTi] = useState(0)
  const [run, setRun] = useState(0)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const wrap = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const target = targets[Math.min(ti, targets.length - 1)]
  const src = useMemo(() => withParams(target?.path ?? '/', grade), [target, grade])

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Taslağı gönder: iframe hazır olunca ve taslak değiştikçe
  const payload = useMemo(() => JSON.stringify({ entries, html: html ?? {} }), [entries, html])
  const latest = useRef(payload)
  latest.current = payload
  const send = () => {
    const w = frame.current?.contentWindow
    if (!w) return
    const p = JSON.parse(latest.current) as { entries: CmsEntry[]; html: Record<string, string> }
    w.postMessage({ __aoPreview: 1, entries: p.entries, html: p.html }, location.origin)
  }
  useEffect(() => {
    const on = (ev: MessageEvent) => {
      if (ev.origin === location.origin && ev.source === frame.current?.contentWindow && (ev.data as { __aoPreviewReady?: number })?.__aoPreviewReady) send()
    }
    window.addEventListener('message', on)
    return () => window.removeEventListener('message', on)
  }, [])
  useEffect(() => {
    const t = setTimeout(send, 250)
    return () => clearTimeout(t)
  }, [payload])

  const avail = Math.max(0, box.w - 2)
  const base = SIZES[device]
  const scale = avail ? Math.min(1, avail / base.w) : 1
  // Küçültülmüş görünümde cihazı ekranın boş yüksekliğini dolduracak kadar uzat (kısa kalmasın)
  const room = Math.max(480, (typeof window !== 'undefined' ? window.innerHeight : 900) - 230)
  const size = { ...base, h: Math.max(base.h, Math.round(room / scale)) }
  const h = Math.round(size.h * scale) // ölçekli yükseklik
  return (
    <div className={cx('flex min-w-0 flex-col', className)}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl bg-paper p-1 ring-1 ring-line">
          {(Object.keys(SIZES) as Device[]).map((d) => {
            const Icon = d === 'phone' ? Smartphone : d === 'tablet' ? Tablet : Monitor
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDevice(d)}
                aria-pressed={device === d}
                title={`${SIZES[d].label} (${SIZES[d].w}px)`}
                className={cx('inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-extrabold transition', device === d ? 'bg-white text-ink shadow-sm ring-1 ring-line' : 'text-ink-soft hover:text-ink')}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{SIZES[d].label}</span>
              </button>
            )
          })}
        </div>
        {targets.length > 1 && (
          <select value={ti} onChange={(e) => setTi(Number(e.target.value))} className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-white px-2 text-sm font-bold sm:flex-none">
            {targets.map((t, i) => (
              <option key={t.path} value={i}>
                {t.label}
              </option>
            ))}
          </select>
        )}
        <span className="flex-1" />
        <button type="button" onClick={() => setRun((x) => x + 1)} className="grid size-9 place-items-center rounded-xl text-ink-soft ring-1 ring-line hover:bg-paper hover:text-ink" title="Yenile" aria-label="Önizlemeyi yenile">
          <RotateCcw size={15} />
        </button>
        <a href={target?.path} target="_blank" rel="noreferrer" className="grid size-9 place-items-center rounded-xl text-ink-soft ring-1 ring-line hover:bg-paper hover:text-ink" title="Yayındaki hâlini yeni sekmede aç" aria-label="Yayındaki hâlini aç">
          <ExternalLink size={15} />
        </a>
      </div>
      <div ref={wrap} className="relative min-h-0 w-full overflow-auto rounded-2xl bg-[radial-gradient(#e6e8ee_1px,transparent_1px)] bg-[size:14px_14px] p-px" style={{ maxHeight }}>
        <div className="mx-auto overflow-hidden" style={{ width: size.w * scale, height: h }}>
          <div
            className={cx('origin-top-left overflow-hidden bg-white shadow-[var(--shadow-lift)] ring-1 ring-line', device === 'phone' ? 'rounded-[28px]' : 'rounded-xl')}
            style={{ width: size.w, height: size.h, transform: `scale(${scale})` }}
          >
            <iframe key={`${src}-${run}`} ref={frame} src={src} title="Önizleme" className="block size-full border-0" />
          </div>
        </div>
      </div>
      <p className="mt-1.5 text-center text-[11px] font-semibold text-ink-soft">
        {base.label} · {base.w}px{scale < 1 ? ` · %${Math.round(scale * 100)}` : ''} · kaydedilmemiş değişikliklerle
      </p>
    </div>
  )
}

/** Panel düzenleyicileri için taslak kayıt */
export function draftEntry(e: Partial<CmsEntry> & Pick<CmsEntry, 'kind' | 'ref' | 'origin' | 'data'>): CmsEntry {
  return {
    id: e.id ?? `taslak-${e.kind}-${e.ref}`,
    kind: e.kind,
    ref: e.ref,
    origin: e.origin,
    status: 'published',
    hidden: false,
    data: e.data,
    grade: e.grade ?? null,
    updated_at: new Date().toISOString(),
  }
}
