import type { Box, Pt, Tile } from './types'

/** Izgara birimi (dünya px). Düzgün çokgen kenarı 2 birimdir. */
export const UNIT = 32
export const SIDE = UNIT * 2

export const rad = (d: number) => (d * Math.PI) / 180
export const deg = (r: number) => (r * 180) / Math.PI
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)
export const mod = (a: number, n: number) => ((a % n) + n) % n
export const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d

/** Türkçe ondalık gösterimi */
export const fmt = (v: number, d = 2) => {
  const r = round(v, d)
  return (Object.is(r, -0) ? 0 : r).toLocaleString('tr-TR', { maximumFractionDigits: d })
}

export function rotate(p: Pt, a: number): Pt {
  const c = Math.cos(rad(a))
  const s = Math.sin(rad(a))
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c }
}

/** Parçanın yerel noktasını dünya koordinatına çevirir */
export function toWorld(t: Pick<Tile, 'x' | 'y' | 'rot' | 'flip'>, p: Pt): Pt {
  const q = rotate({ x: t.flip ? -p.x : p.x, y: p.y }, t.rot)
  return { x: q.x + t.x, y: q.y + t.y }
}

/** Dünya noktasını parçanın yerel koordinatına çevirir */
export function toLocal(t: Pick<Tile, 'x' | 'y' | 'rot' | 'flip'>, p: Pt): Pt {
  const q = rotate({ x: p.x - t.x, y: p.y - t.y }, -t.rot)
  return { x: t.flip ? -q.x : q.x, y: q.y }
}

export const boxCorners = (b: Box): Pt[] => [
  { x: b.x, y: b.y },
  { x: b.x + b.w, y: b.y },
  { x: b.x + b.w, y: b.y + b.h },
  { x: b.x, y: b.y + b.h },
]

export function boundsOf(pts: Pt[]): Box {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const p of pts) {
    if (p.x < x0) x0 = p.x
    if (p.y < y0) y0 = p.y
    if (p.x > x1) x1 = p.x
    if (p.y > y1) y1 = p.y
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

export const centered = (w: number, h: number): Box => ({ x: -w / 2, y: -h / 2, w, h })

export const pad = (b: Box, m: number): Box => ({ x: b.x - m, y: b.y - m, w: b.w + 2 * m, h: b.h + 2 * m })

export const boxesIntersect = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/** Noktaları ağırlık merkezi 0,0 olacak şekilde kaydırır */
export function centerPts(pts: Pt[]): Pt[] {
  const b = boundsOf(pts)
  const cx = b.x + b.w / 2
  const cy = b.y + b.h / 2
  return pts.map((p) => ({ x: p.x - cx, y: p.y - cy }))
}

export const pathOf = (pts: Pt[], close = true) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${round(p.x)} ${round(p.y)}`).join('') + (close ? 'Z' : '')

/** Kaplumbağa gibi: kenar uzunlukları ve dış açılarla çokgen köşeleri üretir */
export function turtle(steps: [len: number, turn: number][], start = 0): Pt[] {
  const pts: Pt[] = [{ x: 0, y: 0 }]
  let a = start
  let x = 0
  let y = 0
  for (const [len, turn] of steps) {
    x += len * Math.cos(rad(a))
    y += len * Math.sin(rad(a))
    pts.push({ x, y })
    a += turn
  }
  pts.pop()
  return pts
}

export function regularPolygon(n: number, side = SIDE): Pt[] {
  const r = side / (2 * Math.sin(Math.PI / n))
  // Alt kenar yatay olsun
  const off = Math.PI / 2 + Math.PI / n
  return Array.from({ length: n }, (_, i) => ({
    x: r * Math.cos(off + (2 * Math.PI * i) / n),
    y: r * Math.sin(off + (2 * Math.PI * i) / n),
  }))
}

export function pointInPolygon(p: Pt, poly: Pt[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

export function distToSegment(p: Pt, a: Pt, b: Pt) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const l = dx * dx + dy * dy
  const t = l ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / l, 0, 1) : 0
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** Rengi koyulaştırır/açar (amt -1..1) */
export function shade(hex: string, amt: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const f = (c: number) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)
  const r = f((n >> 16) & 255)
  const g = f((n >> 8) & 255)
  const b = f(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

/** Renk üzerinde okunaklı yazı rengi */
export function textOn(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return '#111'
  const n = parseInt(m[1], 16)
  const l = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)
  return l > 160 ? '#242436' : '#fff'
}

let seq = 0
export const uid = () => `${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`
