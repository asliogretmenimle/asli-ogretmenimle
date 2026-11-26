/**
 * Ziyaret sayacı: her sayfa geçişinde public.page_views tablosuna bir satır yazar.
 * Çerez kullanmaz, IP saklamaz; ziyaretçi kimliği tarayıcıda üretilen rastgele bir dizedir.
 * Panelin Analiz sayfası bu veriyi cms_analytics() ile özetler.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { SUPABASE_ANON_KEY, SUPABASE_URL, cmsEnabled } from './config'
import { isPreviewMode } from './runtime'

export const NO_TRACK_KEY = 'ao-no-track'
const VISITOR_KEY = 'ao-visitor'
const SESSION_KEY = 'ao-session'
const SESSION_TTL = 30 * 60 * 1000

const rid = () => {
  try {
    return crypto.randomUUID().replace(/-/g, '')
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
  }
}

let memVisitor = ''
function visitorId() {
  try {
    let v = localStorage.getItem(VISITOR_KEY)
    if (!v) localStorage.setItem(VISITOR_KEY, (v = rid()))
    return v
  } catch {
    return (memVisitor ||= rid())
  }
}

let memSession: { id: string; at: number } | null = null
/** Oturum: 30 dakika hareketsizlikten sonra yenilenir. isNew: oturumun ilk görüntülemesi */
function session(): { id: string; isNew: boolean } {
  const now = Date.now()
  let cur = memSession
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) cur = JSON.parse(raw)
  } catch {
    /* bellekteki kullanılır */
  }
  const isNew = !cur || now - cur.at > SESSION_TTL
  const next = { id: isNew ? rid() : cur!.id, at: now }
  memSession = next
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next))
  } catch {
    /* geç */
  }
  return { id: next.id, isNew }
}

function device(): 'mobile' | 'tablet' | 'desktop' {
  const ua = navigator.userAgent
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tablet'
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return 'mobile'
  // iPadOS masaüstü UA'sı ile gelir
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return 'tablet'
  const w = Math.min(window.screen?.width || window.innerWidth, window.innerWidth)
  return w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop'
}

function externalReferrer() {
  try {
    if (!document.referrer) return ''
    const u = new URL(document.referrer)
    return u.hostname === location.hostname ? '' : u.hostname.replace(/^www\./, '').slice(0, 300)
  } catch {
    return ''
  }
}

function blocked(path: string) {
  if (!cmsEnabled || path.startsWith('/yonetim')) return true
  try {
    if (isPreviewMode() || localStorage.getItem(NO_TRACK_KEY) === '1') return true
    // ?analiz=1: geliştirirken (localhost, otomatik tarayıcı) saymayı zorla; oturum boyunca geçerli
    if (new URLSearchParams(location.search).has('analiz')) sessionStorage.setItem('ao-analiz', '1')
    if (sessionStorage.getItem('ao-analiz') === '1') return false
    if (navigator.webdriver) return true
    if (/bot|crawl|spider|slurp|lighthouse|headless|preview|facebookexternalhit|bingpreview/i.test(navigator.userAgent)) return true
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return true
  } catch {
    /* depolama kapalı: saymaya devam */
  }
  return false
}

let last = { path: '', at: 0 }

function send(path: string) {
  try {
    const now = Date.now()
    // StrictMode çift çalıştırması ve aynı sayfaya art arda geçişler
    if (last.path === path && now - last.at < 1000) return
    last = { path, at: now }
    if (blocked(path)) return
    const s = session()
    const params = new URLSearchParams(location.search)
    const body = {
      path: path.slice(0, 300),
      referrer: s.isNew ? externalReferrer() : '',
      visitor: visitorId(),
      session: s.id,
      device: device(),
      utm_source: (params.get('utm_source') ?? '').slice(0, 100) || null,
    }
    fetch(`${SUPABASE_URL}/rest/v1/page_views`, {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(body),
    }).catch(() => {})
  } catch {
    /* sayaç hiçbir zaman sayfayı bozmaz */
  }
}

/** App içinde bir kez çağrılır: her yol değişiminde bir görüntüleme */
export function useTrackPageViews() {
  const { pathname } = useLocation()
  useEffect(() => {
    let path = pathname
    try {
      path = decodeURIComponent(pathname)
    } catch {
      /* bozuk kodlama: olduğu gibi */
    }
    path = path.replace(/\/+$/, '') || '/'
    const run = () => send(path)
    const idle = typeof window.requestIdleCallback === 'function'
    const id = idle ? window.requestIdleCallback(run, { timeout: 3000 }) : window.setTimeout(run, 800)
    // Hızlı geçişte önceki sayfa yine de sayılsın diye iptal edilmez (dedupe yeterli)
    return () => void id
  }, [pathname])
}

/** Analiz sayfasındaki "ziyaretlerimi sayma" ayarı */
export function getNoTrack() {
  try {
    return localStorage.getItem(NO_TRACK_KEY) === '1'
  } catch {
    return false
  }
}
export function setNoTrack(v: boolean) {
  try {
    if (v) localStorage.setItem(NO_TRACK_KEY, '1')
    else localStorage.removeItem(NO_TRACK_KEY)
  } catch {
    /* geç */
  }
}
