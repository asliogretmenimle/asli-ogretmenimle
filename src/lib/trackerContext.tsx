import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { SessionTracker } from './report'

const Ctx = createContext<SessionTracker | null>(null)

export function TrackerProvider({ tracker, children }: { tracker: SessionTracker; children: ReactNode }) {
  return <Ctx.Provider value={tracker}>{children}</Ctx.Provider>
}

/** Etkinlik/oyun içindeki olayları öğretmen raporuna yazar. Sağlayıcı yoksa sessizce hiçbir şey yapmaz. */
export function useTracker() {
  const t = useContext(Ctx)
  return useMemo(
    () => ({
      attempt: (ok: boolean) => t?.attempt(ok),
      item: (first: boolean) => t?.item(first),
      hint: () => t?.hint(),
      strategy: (name: string) => t?.strategy(name),
      misconception: (text: string | null | undefined) => text && t?.misconception(text),
      solutions: (n: number) => t?.solutions(n),
    }),
    [t],
  )
}
