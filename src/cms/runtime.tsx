/**
 * Tarayıcıda panel kayıtlarını yükler ve uygular.
 *
 * 1. Önceki ziyaretten kalan kayıtlar (localStorage) hemen uygulanır: sayfa beklemeden doğru içerikle açılır.
 * 2. Güncel kayıtlar Supabase'den alınır; farklıysa yeniden uygulanır ve sayfa yeniden çizilir.
 */
import { useSyncExternalStore, type ComponentType } from 'react'
import { games } from '../games/registry'
import { gameMeta, type GameId } from '../games/meta'
import type { GameProps } from '../games/kit'
import { interactions } from '../interactions/registry'
import { interactionMeta } from '../interactions/meta'
import type { InteractionProps } from '../interactions/types'
import { cmsEnabled } from './config'
import { fetchPublishedEntries } from './fetch'
import { applyOverlay, currentEntries } from './overlay'
import { HtmlFrame } from './HtmlFrame'
import type { CmsEntry, CustomMark } from './types'

const CACHE_KEY = 'ao-cms-v1'

let version = 0
let settled = !cmsEnabled
const listeners = new Set<() => void>()
const emit = () => {
  version++
  listeners.forEach((l) => l())
}

const signature = (list: CmsEntry[]) => list.map((e) => `${e.id}:${e.updated_at}:${e.status}:${e.hidden ? 1 : 0}`).join('|')

// Panelden eklenen oyun ve etkileşimler için bileşenler: sayfaların giriş/bitiş akışı aynen kullanılır
const gameFrames = new Map<string, ComponentType<GameProps>>()
const interactionFrames = new Map<string, ComponentType<InteractionProps>>()

function registerCustom() {
  for (const m of gameMeta as (typeof gameMeta[number] & CustomMark)[]) {
    if (!m.custom || !m.cmsId) continue
    const cmsId = m.cmsId
    let C = gameFrames.get(cmsId)
    if (!C) {
      C = ({ grade, onFinish }: GameProps) => <HtmlFrame kind="game" cmsId={cmsId} grade={grade} onFinish={onFinish} />
      gameFrames.set(cmsId, C)
    }
    games[m.id as GameId] = C
  }
  for (const m of interactionMeta as (typeof interactionMeta[number] & CustomMark)[]) {
    if (!m.custom || !m.cmsId) continue
    const cmsId = m.cmsId
    let C = interactionFrames.get(cmsId)
    if (!C) {
      C = ({ grade, onFinish }: InteractionProps) => <HtmlFrame kind="interaction" cmsId={cmsId} grade={grade} onFinish={onFinish} />
      interactionFrames.set(cmsId, C)
    }
    interactions[m.id] = C
  }
}

function apply(entries: CmsEntry[]) {
  applyOverlay(entries)
  registerCustom()
  emit()
}

let started = false
let readyPromise: Promise<void> = Promise.resolve()

/** Uygulama açılışında bir kez çağrılır (main.tsx) */
export function initCms() {
  if (started || !cmsEnabled) return
  started = true
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
