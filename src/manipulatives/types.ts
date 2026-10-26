import type { FC } from 'react'
import type { ManipulativeConfig, ManipulativeTool } from '../data/types'

export interface ToolProps<V> {
  value: V
  onChange: (v: V) => void
  config: ManipulativeConfig
  /** Görev modunda hedef (yoksa serbest mod) */
  target?: Record<string, unknown>
  /** Kontrol sonrası düzenleme kapalı */
  locked?: boolean
}

export interface ToolDef<V = unknown> {
  id: ManipulativeTool
  defaultConfig: ManipulativeConfig
  initial: (config: ManipulativeConfig, target?: Record<string, unknown>) => V
  check: (value: V, target: Record<string, unknown>, config: ManipulativeConfig) => boolean
  Component: FC<ToolProps<V>>
}

export const n = (t: Record<string, unknown> | undefined, k: string, d = 0) => (typeof t?.[k] === 'number' ? (t[k] as number) : d)
