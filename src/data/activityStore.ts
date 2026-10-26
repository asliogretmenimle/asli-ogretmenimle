import { useEffect, useState } from 'react'
import type { Activity, Grade } from './types'
import { grades, isGrade, outcomeByCode } from './curriculum'

/**
 * Etkinlik verisi sınıf başına ayrı parçalar hâlinde, ihtiyaç anında yüklenir.
 * (Doğrulama scripti senkron sürüm olan ./activities/index.ts dosyasını kullanır.)
 */
const loaders: Record<Grade, () => Promise<Activity[]>> = {
  1: () => import('./activities/grade1').then((m) => m.grade1),
  2: () => import('./activities/grade2').then((m) => m.grade2),
  3: () => import('./activities/grade3').then((m) => m.grade3),
  4: () => import('./activities/grade4').then((m) => m.grade4),
  5: () => import('./activities/grade5').then((m) => m.grade5),
  6: () => import('./activities/grade6').then((m) => m.grade6),
  7: () => import('./activities/grade7').then((m) => m.grade7),
  8: () => import('./activities/grade8').then((m) => m.grade8),
}

const cache = new Map<Grade, Activity[]>()
const pending = new Map<Grade, Promise<Activity[]>>()

export function loadGrade(g: Grade): Promise<Activity[]> {
  const hit = cache.get(g)
  if (hit) return Promise.resolve(hit)
  let p = pending.get(g)
  if (!p) {
    p = loaders[g]().then((list) => {
      cache.set(g, list)
      pending.delete(g)
      return list
    })
    pending.set(g, p)
  }
  return p
}

export const loadAll = () => Promise.all(grades.map(loadGrade)).then((l) => l.flat())

/** Seçili sınıfın etkinlikleri (yüklenene kadar null) */
export function useGradeActivities(g: Grade | null): Activity[] | null {
  const [list, setList] = useState<Activity[] | null>(() => (g ? cache.get(g) ?? null : null))
  useEffect(() => {
    if (!g) return setList(null)
    let alive = true
    setList(cache.get(g) ?? null)
    loadGrade(g).then((l) => alive && setList(l))
    return () => {
      alive = false
    }
  }, [g])
  return list
}

/** Tüm etkinlikler; enabled false iken yüklemez */
export function useAllActivities(enabled = true): Activity[] | null {
  const ready = () => (grades.every((g) => cache.has(g)) ? grades.flatMap((g) => cache.get(g)!) : null)
  const [list, setList] = useState<Activity[] | null>(ready)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    loadAll().then((l) => alive && setList(l))
    return () => {
      alive = false
    }
  }, [enabled])
  return list
}

export const gradeFromId = (id: string): Grade | null => {
  const g = Number(/^g(\d)-/.exec(id)?.[1])
  return isGrade(g) ? g : null
}

export const activityGrade = (a: Activity): Grade => gradeFromId(a.id) ?? ((outcomeByCode.get(a.outcomes[0])?.theme.grade ?? 1) as Grade)

export const activityTheme = (a: Activity) => outcomeByCode.get(a.outcomes[0])?.theme

/** Aynı temanın etkinliklerini, bir çıktıya bağlı olanları döndürür */
export const forOutcome = (list: Activity[], code: string) => list.filter((a) => a.outcomes.includes(code))
