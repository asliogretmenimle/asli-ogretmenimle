import type { Activity, Grade, ThemeNotes } from '../types'
import * as g1 from './grade1'
import * as g2 from './grade2'
import * as g3 from './grade3'
import * as g4 from './grade4'
import * as g5 from './grade5'
import * as g6 from './grade6'
import * as g7 from './grade7'
import * as g8 from './grade8'

/** Senkron erişim (doğrulama scripti için). Uygulama ../activityStore.ts ile parça parça yükler. */
type Mod = Record<string, unknown>
const mods: Record<Grade, Mod> = { 1: g1, 2: g2, 3: g3, 4: g4, 5: g5, 6: g6, 7: g7, 8: g8 }

export const activitiesByGrade = Object.fromEntries(
  Object.entries(mods).map(([g, m]) => [g, (m[`grade${g}`] as Activity[]) ?? []]),
) as Record<Grade, Activity[]>

export const notesByGrade = Object.fromEntries(
  Object.entries(mods).map(([g, m]) => [g, (m[`grade${g}Notes`] as ThemeNotes) ?? {}]),
) as Record<Grade, ThemeNotes>
