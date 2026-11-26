import { useEffect, useState } from 'react'
import type { Activity, Grade, ThemeNotes } from './types'
import { grades, isGrade, outcomeByCode } from './curriculum'
import { isChunkError, reloadOnce } from '../lib/chunkReload'
import { overlayActivities } from '../cms/overlay'
import { subscribeCms, useCmsVersion } from '../cms/runtime'

/**
 * Etkinlik verisi sınıf başına ayrı parçalar hâlinde, ihtiyaç anında yüklenir.
 * (Doğrulama scripti senkron sürüm olan ./activities/index.ts dosyasını kullanır.)
 */
type Mod = Record<string, unknown>
const modules: Record<Grade, () => Promise<Mod>> = {
  1: () => import('./activities/grade1'),
  2: () => import('./activities/grade2'),
  3: () => import('./activities/grade3'),
  4: () => import('./activities/grade4'),
  5: () => import('./activities/grade5'),
  6: () => import('./activities/grade6'),
  7: () => import('./activities/grade7'),
  8: () => import('./activities/grade8'),
}
const notesCache = new Map<Grade, ThemeNotes>()
const loaders = Object.fromEntries(
  Object.entries(modules).map(([g, load]) => [
    g,
    () =>
      load().then((m) => {
        notesCache.set(Number(g) as Grade, (m[`grade${g}Notes`] as ThemeNotes) ?? {})
        return (m[`grade${g}`] as Activity[]) ?? []
      }),
  ]),
) as Record<Grade, () => Promise<Activity[]>>

const cache = new Map<Grade, Activity[]>()
/** Koddaki hâli: panel kayıtları değişince overlay bundan yeniden uygulanır */
const raw = new Map<Grade, Activity[]>()
const pending = new Map<Grade, Promise<Activity[]>>()

subscribeCms(() => {
  for (const [g, list] of raw) cache.set(g, overlayActivities(g, list))
})

export function loadGrade(g: Grade): Promise<Activity[]> {
  const hit = cache.get(g)
  if (hit) return Promise.resolve(hit)
  let p = pending.get(g)
  if (!p) {
    p = loaders[g]().then(
      (list) => {
        raw.set(g, list)
        const out = overlayActivities(g, list)
        cache.set(g, out)
        pending.delete(g)
        return out
      },
      (e) => {
        // Bir sonraki denemede yeniden indirilsin; yeni sürüm yayınlandıysa sayfa yenilenir
        pending.delete(g)
        if (isChunkError(e)) reloadOnce()
        throw e
      },
    )
    pending.set(g, p)
  }
  return p
}

/** Koddaki (panel değişiklikleri uygulanmamış) hâli: yönetim paneli için */
export const loadGradeRaw = (g: Grade): Promise<Activity[]> => loadGrade(g).then(() => raw.get(g) ?? [])

export const loadAll = () => Promise.all(grades.map(loadGrade)).then((l) => l.flat())

/** Seçili sınıfın etkinlikleri (yüklenene kadar null) */
export function useGradeActivities(g: Grade | null): Activity[] | null {
  const [list, setList] = useState<Activity[] | null>(() => (g ? cache.get(g) ?? null : null))
  const [error, setError] = useState<unknown>(null)
  const v = useCmsVersion()
  // Yüklenemezse sonsuz "yükleniyor" yerine sayfanın hata ekranı (ErrorBoundary) görünsün
  if (error) throw error
  useEffect(() => {
    if (!g) return setList(null)
    let alive = true
    setList(cache.get(g) ?? null)
    loadGrade(g).then((l) => alive && setList(l), (e) => alive && setError(e))
    return () => {
      alive = false
    }
  }, [g, v])
  return list
}

/** Tüm etkinlikler; enabled false iken yüklemez */
export function useAllActivities(enabled = true): Activity[] | null {
  const ready = () => (grades.every((g) => cache.has(g)) ? grades.flatMap((g) => cache.get(g)!) : null)
  const [list, setList] = useState<Activity[] | null>(ready)
  const [error, setError] = useState<unknown>(null)
  const v = useCmsVersion()
  if (error) throw error
  useEffect(() => {
    if (!enabled) return
    let alive = true
    loadAll().then((l) => alive && setList(l), (e) => alive && setError(e))
    return () => {
      alive = false
    }
  }, [enabled, v])
  return list
}

export const gradeFromId = (id: string): Grade | null => {
  const g = Number(/^g(\d)-/.exec(id)?.[1])
  return isGrade(g) ? g : null
}

/** Sınıfı yüklenmişse etkinliği senkron döndürür */
export const cachedActivity = (id: string): Activity | undefined => {
  const g = gradeFromId(id)
  return g ? cache.get(g)?.find((a) => a.id === id) : undefined
}

export const activityGrade = (a: Activity): Grade => gradeFromId(a.id) ?? ((outcomeByCode.get(a.outcomes[0])?.theme.grade ?? 1) as Grade)

export const activityTheme = (a: Activity) => outcomeByCode.get(a.outcomes[0])?.theme

/** Aynı temanın etkinliklerini, bir çıktıya bağlı olanları döndürür */
export const forOutcome = (list: Activity[], code: string) => list.filter((a) => a.outcomes.includes(code))

/** Temanın büyük fikirleri (sınıf verisi yüklendiyse) */
export const themeNotes = (g: Grade, slug: string) => notesCache.get(g)?.[slug]

/** Aşamaların sırası ve etiketleri */
export const STAGE_ORDER = ['somut', 'model', 'sembol', 'problem'] as const
