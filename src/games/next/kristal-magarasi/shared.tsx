import { useEffect } from 'react'
import type { Ctl } from './mission'

export function useTask(ctl: Ctl, text: string) {
  useEffect(() => {
    ctl.task(text)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])
}

export const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

/** a · a · a … (b kez) */
export const expand = (a: string | number, b: number) => Array.from({ length: b }, () => String(a)).join(' · ')

/** Ayçiçeği (altın açı) yerleşimi: dağınık bir yığın */
export function pile(n: number, cx: number, cy: number, radius: number) {
  const k = radius / Math.sqrt(Math.max(1, n))
  return Array.from({ length: n }, (_, i) => {
    const r = k * Math.sqrt(i + 0.5)
    const t = i * 2.39996
    return { x: cx + Math.cos(t) * r * 1.35, y: cy + Math.sin(t) * r }
  })
}
