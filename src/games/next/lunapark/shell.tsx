import { createContext, useContext, type ReactNode } from 'react'
import type { Grade } from '../../../data/types'
import { ZoomBox } from '../../../interactive/ZoomBox'

export interface Api {
  grade: Grade
  /** 3. sınıf: büyük dokunma alanları */
  big: boolean
  done: boolean
  /** Bu görevde bulunan farklı çözüm sayısı */
  found: number
  report: (ok: boolean) => void
  has: (key: string) => boolean
  /** Yeni çözümse true */
  add: (key: string, label: string) => boolean
  nudge: (q: string | null, o?: { tone?: 'ok' | 'think'; mis?: string; tool?: boolean }) => void
  strategy: (s: string) => void
  complete: (text?: string) => void
}

export const LevelCtx = createContext<{ api: Api; header: ReactNode; top: ReactNode; footer: ReactNode } | null>(null)

export function useApi() {
  const c = useContext(LevelCtx)
  if (!c) throw new Error('LevelCtx yok')
  return c.api
}

/**
 * Görev yerleşimi: yatay tablette sahne solda, panel sağda; dikeyde alt alta.
 * Sahne iki parmakla yakınlaşır (ZoomBox).
 */
export function Shell({ scene, controls, overlay }: { scene: ReactNode; controls: ReactNode; overlay?: ReactNode }) {
  const c = useContext(LevelCtx)!
  return (
    <div>
      {c.header}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-4">
        <div className="min-w-0">
          <ZoomBox className="overflow-hidden rounded-2xl shadow-[var(--shadow-card)] ring-1 ring-fuchsia-200">
            <div className="relative" style={{ touchAction: 'none' }}>
              {scene}
              {overlay}
            </div>
          </ZoomBox>
        </div>
        <aside className="flex min-w-0 flex-col gap-3">
          {c.top}
          {controls}
          {c.footer}
        </aside>
      </div>
    </div>
  )
}
