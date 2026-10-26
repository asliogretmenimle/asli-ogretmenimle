/** Matematik Şehri — harita sabitleri ve geometri yardımcıları (ızgara birimi: 1 kare = 1 m) */

export const MAP_W = 24
export const MAP_H = 15

export type Cell = [number, number]
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
export type Art = 'park' | 'oyun' | 'bina' | 'bahce' | 'havuz'

export interface Built {
  id: string
  art: Art
  r: Rect
  fence?: boolean
  /** Dikdörtgen olmayan şekiller için hücre maskesi */
  cells?: Cell[]
  label?: string
}

export const HOUSES: Rect = { x: 0, y: 11, w: 4, h: 4 }
export const SCHOOL: Rect = { x: 10, y: 3, w: 4, h: 4 }
export const LAKE: Rect = { x: 5, y: 6, w: 3, h: 3 }
/** Yolun başladığı kapı önü ve okulun kapısı */
export const START: Cell = [4, 11]
export const GOAL: Cell = [9, 5]

export const key = (c: Cell) => `${c[0]},${c[1]}`
export const same = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1]
export const adj = (a: Cell, b: Cell) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1

export const area = (r: Rect) => r.w * r.h
export const perim = (r: Rect) => 2 * (r.w + r.h)
export const dims = (r: Rect) => `${Math.min(r.w, r.h)}x${Math.max(r.w, r.h)}`

export function rectCells(r: Rect): Cell[] {
  const out: Cell[] = []
  for (let x = r.x; x < r.x + r.w; x++) for (let y = r.y; y < r.y + r.h; y++) out.push([x, y])
  return out
}

export const inMap = (c: Cell) => c[0] >= 0 && c[1] >= 0 && c[0] < MAP_W && c[1] < MAP_H

/** Dolu hücreler: sabit yapılar + yol + inşa edilenler */
export function occupied(road: Cell[], built: Built[], extra: Rect[] = []): Set<string> {
  const s = new Set<string>()
  for (const r of [HOUSES, SCHOOL, LAKE, ...extra]) rectCells(r).forEach((c) => s.add(key(c)))
  road.forEach((c) => s.add(key(c)))
  for (const b of built) (b.cells ?? rectCells(b.r)).forEach((c) => s.add(key(c)))
  return s
}

export const fits = (r: Rect, occ: Set<string>) => r.w >= 1 && r.h >= 1 && rectCells(r).every((c) => inMap(c) && !occ.has(key(c)))

/** prefer noktasına en yakın boş yer */
export function findSpot(w: number, h: number, occ: Set<string>, prefer: Cell): Rect | null {
  let best: Rect | null = null
  let bd = Infinity
  for (let x = 0; x + w <= MAP_W; x++)
    for (let y = 0; y + h <= MAP_H; y++) {
      const r = { x, y, w, h }
      const d = Math.hypot(x + w / 2 - prefer[0], y + h / 2 - prefer[1])
      if (d < bd && fits(r, occ)) {
        bd = d
        best = r
      }
    }
  return best
}

/** Engelleri dolaşan en kısa yol uzunluğu (karo sayısı) */
export function shortest(from: Cell, to: Cell, blocked: Set<string>): number {
  const q: [Cell, number][] = [[from, 0]]
  const seen = new Set([key(from)])
  while (q.length) {
    const [c, d] = q.shift()!
    if (same(c, to)) return d
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n: Cell = [c[0] + dx, c[1] + dy]
      const k = key(n)
      if (!inMap(n) || seen.has(k) || (blocked.has(k) && !same(n, to))) continue
      seen.add(k)
      q.push([n, d + 1])
    }
  }
  return Infinity
}

/** Yoldaki dönüş sayısı */
export function turns(path: Cell[]) {
  let t = 0
  for (let i = 2; i < path.length; i++) {
    const d1 = [path[i - 1][0] - path[i - 2][0], path[i - 1][1] - path[i - 2][1]]
    const d2 = [path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]]
    if (d1[0] !== d2[0] || d1[1] !== d2[1]) t++
  }
  return t
}

export const tl = (n: number) => `${n.toLocaleString('tr-TR')} TL`
