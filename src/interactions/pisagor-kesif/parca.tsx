import type { ComponentProps, ReactNode } from 'react'
import { usePlane } from '../../interactive/Plane'
import type { useSolutions } from '../../games/kit2'
import type { Pt } from '../donusum-studyosu/ortak'

/** Pisagor Keşif Alanı — görevlerin ortak tipleri ve düzlem içi küçük çizim parçaları */

export type Common = {
  footer: ReactNode
  onSolved: (first: boolean) => void
  sol: ReturnType<typeof useSolutions>
}

export const COL = { a: '#6366f1', b: '#0d9488', c: '#db2777', tri: '#f59e0b' }

/** Matematik koordinatlarındaki çokgen (Plane içinde) */
export function Poly({ pts, ...rest }: { pts: Pt[] } & Omit<ComponentProps<'polygon'>, 'points'>) {
  const P = usePlane()
  return <polygon points={pts.map(([x, y]) => `${P.sx(x)},${P.sy(y)}`).join(' ')} {...rest} />
}

/** Matematik koordinatlarında okunaklı (beyaz kenarlı) etiket */
export function Tag({ at, children, color = '#1f2340', size = 15, anchor = 'middle' }: { at: Pt; children: ReactNode; color?: string; size?: number; anchor?: 'start' | 'middle' | 'end' }) {
  const P = usePlane()
  return (
    <text x={P.sx(at[0])} y={P.sy(at[1]) + size * 0.35} textAnchor={anchor} fontSize={size} fontWeight={900} fill={color} stroke="#fff" strokeWidth={4} paintOrder="stroke" pointerEvents="none">
      {children}
    </text>
  )
}

/** Dik açı işareti: köşe q, kollar p ve r yönünde */
export function RightMark({ p, q, r, size = 0.45, color = '#1f2340' }: { p: Pt; q: Pt; r: Pt; size?: number; color?: string }) {
  const P = usePlane()
  const u = norm([p[0] - q[0], p[1] - q[1]]), v = norm([r[0] - q[0], r[1] - q[1]])
  const a: Pt = [q[0] + u[0] * size, q[1] + u[1] * size]
  const b: Pt = [a[0] + v[0] * size, a[1] + v[1] * size]
  const c: Pt = [q[0] + v[0] * size, q[1] + v[1] * size]
  return <polyline points={[a, b, c].map(([x, y]) => `${P.sx(x)},${P.sy(y)}`).join(' ')} fill="none" stroke={color} strokeWidth={2} pointerEvents="none" />
}

const norm = (v: Pt): Pt => {
  const l = Math.hypot(v[0], v[1]) || 1
  return [v[0] / l, v[1] / l]
}

/** √n gösterimi: tam kareyse sayı, değilse √n ≈ … */
export function rootText(n: number) {
  const r = Math.sqrt(n)
  if (Number.isInteger(r)) return `${r}`
  return `√{${n}} ≈ ${r.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`
}

export const isSquare = (n: number) => n > 0 && Number.isInteger(Math.sqrt(n))
