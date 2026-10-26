import type { ReactNode } from 'react'
import type { Grade } from '../../data/types'
import type { useSolutions } from '../../games/kit2'

export type Common = {
  grade: Grade
  dark: boolean
  footer: ReactNode
  onSolved: (first: boolean) => void
  sol: ReturnType<typeof useSolutions>
}

export type SelectItem = { label: string; ok: boolean; why: string; mis?: string }

export type Task =
  | { kind: 'sticks'; rounds: [number, number, number][] }
  | { kind: 'build'; longest: number; goal: number }
  | { kind: 'circles'; base: number; mode: 'eskenar' | 'ikizkenar'; goal: number }
  | { kind: 'select'; title: string; prompt: string; okLabel: string; items: SelectItem[] }
  | { kind: 'tear' }
  | { kind: 'twoAngles'; base: number; goal: number }
  | { kind: 'third'; angles: [number, number, number]; labels: [string, string, string]; story: string; question: string; answer: number; unit?: string; traps?: { v: number; q: string; mis?: string }[] }
  | { kind: 'lines' }
  | { kind: 'coincide' }
  | { kind: 'outside' }
  | { kind: 'range'; a: number; b: number }
  | { kind: 'sideAngle' }
  | { kind: 'congruence' }
  | { kind: 'similar'; k: number }
