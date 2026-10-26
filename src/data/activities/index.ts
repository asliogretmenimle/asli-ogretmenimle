import type { Activity, Grade } from '../types'
import { outcomeByCode } from '../curriculum'
import { grade1 } from './grade1'
import { grade2 } from './grade2'
import { grade3 } from './grade3'
import { grade4 } from './grade4'
import { grade5 } from './grade5'
import { grade6 } from './grade6'
import { grade7 } from './grade7'
import { grade8 } from './grade8'

export const activitiesByGrade: Record<Grade, Activity[]> = {
  1: grade1,
  2: grade2,
  3: grade3,
  4: grade4,
  5: grade5,
  6: grade6,
  7: grade7,
  8: grade8,
}

export const allActivities: Activity[] = Object.values(activitiesByGrade).flat()

export const activityById = new Map(allActivities.map((a) => [a.id, a]))

export const activitiesForOutcome = (code: string) => allActivities.filter((a) => a.outcomes.includes(code))

export const activityGrade = (a: Activity): Grade => (outcomeByCode.get(a.outcomes[0])?.theme.grade ?? 1) as Grade

export const activityTheme = (a: Activity) => outcomeByCode.get(a.outcomes[0])?.theme
