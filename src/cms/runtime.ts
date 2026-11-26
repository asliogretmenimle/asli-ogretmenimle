/**
 * Tarayıcıda panel kayıtlarını yükler ve uygular.
 *
 * 1. Önceki ziyaretten kalan kayıtlar (localStorage) hemen uygulanır: sayfa beklemeden doğru içerikle açılır.
 * 2. Güncel kayıtlar Supabase'den alınır; farklıysa yeniden uygulanır ve sayfa yeniden çizilir.
 */
import { useSyncExternalStore } from 'react'
import { cmsEnabled } from './config'
import { fetchPublishedEntries, previewHtml } from './fetch'
import { applyOverlay, currentEntries } from './overlay'
import type { CmsEntry } from './types'

const CACHE_KEY = 'ao-cms-v1'

let version = 0
let settled = !cmsEnabled
const listeners = new Set<() => void>()
const emit = () => {
  version++
  listeners.forEach((l) => l())
}

const signature = (list: CmsEntry[]) => list.map((e) => `${e.id}:${e.updated_at}:${e.status}:${e.hidden ? 1 : 0}`).join('|')

function apply(entries: CmsEntry[]) {
  applyOverlay(entries)
  emit()
}

let started = false
let readyPromise: Promise<void> = Promise.resolve()

// ---------------------------------------------------------------------------
// Panel önizlemesi: site, panelin içindeki bir iframe'de ?onizleme=1 ile açılır ve
// kaydedilmemiş değişiklikleri (taslak kayıtlar + HTML) postMessage ile alır.
// ---------------------------------------------------------------------------
export interface PreviewMessage {
  __aoPreview: 1
  entries: CmsEntry[]
  html?: Record<string, string>
}

export const isPreviewMode = () => {
  try {
    return window.parent !== window && new URLSearchParams(location.search).has('onizleme')
  } catch {
    return false
  }
}

let published: CmsEntry[] = []
let drafts: CmsEntry[] = []
const merged = () => [
  ...published.filter((e) => !drafts.some((d) => d.id === e.id || (d.kind === e.kind && d.ref === e.ref))),
  ...drafts,
]

function listenPreview() {
  window.addEventListener('message', (ev: MessageEvent) => {
    if (ev.origin !== location.origin || ev.source !== window.parent) return
    const m = ev.data as PreviewMessage
    if (!m || m.__aoPreview !== 1) return
    drafts = Array.isArray(m.entries) ? m.entries : []
    previewHtml.clear()
    for (const [id, html] of Object.entries(m.html ?? {})) previewHtml.set(id, html)
    apply(merged())
  })
  // Panele hazır olduğunu bildir: taslak gönderilsin
  window.parent.postMessage({ __aoPreviewReady: 1 }, location.origin)
}

/** Uygulama açılışında bir kez çağrılır (main.tsx) */
export function initCms() {
  if (started || !cmsEnabled) return
  started = true
  if (isPreviewMode()) {
    listenPreview()
    readyPromise = fetchPublishedEntries()
      .then((entries) => {
        published = entries
        apply(merged())
      })
      .catch((e) => console.warn('[cms] kayıtlar alınamadı', e))
      .finally(() => {
        settled = true
        emit()
        window.parent.postMessage({ __aoPreviewReady: 1 }, location.origin)
      })
    return
  }
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) apply(JSON.parse(raw) as CmsEntry[])
  } catch {
    /* önbellek okunamadı: sorun değil */
  }
  readyPromise = fetchPublishedEntries()
    .then((entries) => {
      if (signature(entries) !== signature(currentEntries())) apply(entries)
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(entries))
      } catch {
        /* kota dolu / gizli pencere */
      }
    })
    .catch((e) => console.warn('[cms] kayıtlar alınamadı', e))
    .finally(() => {
      settled = true
      emit()
    })
}

/** Panelde kayıt yapılınca sitenin bu sekmedeki kopyasını hemen güncelle */
export async function refreshCms() {
  if (!cmsEnabled) return
  const entries = await fetchPublishedEntries()
  apply(entries)
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entries))
  } catch {
    /* geç */
  }
}

/** Etkinlik verisi gibi sonradan yüklenen parçalar güncel kayıtları beklemek isterse */
export const cmsReady = () => readyPromise

export const subscribeCms = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Kayıtlar değişince yeniden çizilmek için */
export function useCmsVersion() {
  return useSyncExternalStore(subscribeCms, () => version, () => version)
}

/** Güncel kayıtlar geldi mi? (Gelmeden "bulunamadı" göstermemek için) */
export function useCmsSettled() {
  return useSyncExternalStore(subscribeCms, () => settled, () => settled)
}
