/**
 * Özdeşlik Bulmacası — karo türleri ve dikdörtgen geometrisi.
 * Uzunluklar iki sembolün tam katsayılı birleşimidir: [x katsayısı, 1 katsayısı] ya da [a, b].
 * x’in sayısal değeri 1’in tam katı değildir (3,35); böylece x ve birim karolar birbirine karışmaz.
 */

export type Sym = { label: string; value: number }
export type Syms = [Sym, Sym]
export type Len = [number, number]

export const XS: Syms = [{ label: 'x', value: 3.35 }, { label: '1', value: 1 }]
export const AB: Syms = [{ label: 'a', value: 4.1 }, { label: 'b', value: 1.55 }]

export const lenVal = (l: Len, s: Syms) => l[0] * s[0].value + l[1] * s[1].value

/** [1, 2] → "x + 2", [1, −1] → "a − b", [0, 3] → "3" */
export function lenStr(l: Len, s: Syms) {
  const unit = s[1].label === '1'
  const parts: string[] = []
  if (l[0]) parts.push(`${l[0] === 1 ? '' : l[0]}${s[0].label}`)
  if (l[1]) {
    const c = Math.abs(l[1])
    const t = unit ? String(c) : `${c === 1 ? '' : c}${s[1].label}`
    parts.push(parts.length ? `${l[1] < 0 ? '−' : '+'} ${t}` : `${l[1] < 0 ? '−' : ''}${t}`)
  }
  return parts.join(' ') || '0'
}
/** Çarpanda parantezli yazım */
export const paren = (l: Len, s: Syms) => (l[0] && l[1] ? `(${lenStr(l, s)})` : lenStr(l, s))

export interface TileKind {
  id: string
  w: Len
  h: Len
  /** Karonun üstündeki yazı (MathText değil, düz) */
  label: string
  /** Sayımda kullanılan terim: x2, x, 1 / a2, ab, b2 */
  term: string
  color: string
  /** 90° döndürülmüş hâli */
  rot?: string
}

const BLUE = '#3b82f6', GREEN = '#10b981', AMBER = '#f59e0b'

export const X_KINDS: TileKind[] = [
  { id: 'x2', w: [1, 0], h: [1, 0], label: 'x²', term: 'x2', color: BLUE },
  { id: 'xv', w: [0, 1], h: [1, 0], label: 'x', term: 'x', color: GREEN, rot: 'xh' },
  { id: 'xh', w: [1, 0], h: [0, 1], label: 'x', term: 'x', color: GREEN, rot: 'xv' },
  { id: 'u', w: [0, 1], h: [0, 1], label: '1', term: '1', color: AMBER },
]
export const AB_KINDS: TileKind[] = [
  { id: 'a2', w: [1, 0], h: [1, 0], label: 'a²', term: 'a2', color: BLUE },
  { id: 'abv', w: [0, 1], h: [1, 0], label: 'ab', term: 'ab', color: GREEN, rot: 'abh' },
  { id: 'abh', w: [1, 0], h: [0, 1], label: 'ab', term: 'ab', color: GREEN, rot: 'abv' },
  { id: 'b2', w: [0, 1], h: [0, 1], label: 'b²', term: 'b2', color: AMBER },
]

export interface Placed {
  id: number
  kind: string
  x: number
  y: number
}

export type Rect = { x: number; y: number; w: number; h: number }
export const EPS = 1e-6

export const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS
export const inside = (a: Rect, r: Rect) => a.x >= r.x - EPS && a.y >= r.y - EPS && a.x + a.w <= r.x + r.w + EPS && a.y + a.h <= r.y + r.h + EPS
export const area = (r: Rect) => r.w * r.h

export function bbox(rs: Rect[]): Rect {
  const x = Math.min(...rs.map((r) => r.x)), y = Math.min(...rs.map((r) => r.y))
  return { x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y }
}

/** Örtüşmeyen dikdörtgenler birleşince tam bir dikdörtgen oluyor mu? */
export function isRectangle(rs: Rect[]) {
  if (!rs.length) return false
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) if (overlap(rs[i], rs[j])) return false
  const b = bbox(rs)
  return Math.abs(area(b) - rs.reduce((s, r) => s + area(r), 0)) < 1e-4
}

/** Alanın karolarla kaplanmamış hücreleri (kenar çizgilerine göre bölünmüş) */
export function gaps(region: Rect, rs: Rect[]): Rect[] {
  const uniq = (v: number[]) => [...v].sort((p, q) => p - q).filter((t, i, a) => i === 0 || t - a[i - 1] > 1e-4)
  const xs = uniq([region.x, region.x + region.w, ...rs.flatMap((r) => [r.x, r.x + r.w])]).filter((t) => t >= region.x - EPS && t <= region.x + region.w + EPS)
  const ys = uniq([region.y, region.y + region.h, ...rs.flatMap((r) => [r.y, r.y + r.h])]).filter((t) => t >= region.y - EPS && t <= region.y + region.h + EPS)
  const out: Rect[] = []
  for (let i = 0; i + 1 < xs.length; i++)
    for (let j = 0; j + 1 < ys.length; j++) {
      const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2
      if (!rs.some((r) => cx > r.x && cx < r.x + r.w && cy > r.y && cy < r.y + r.h)) out.push({ x: xs[i], y: ys[j], w: xs[i + 1] - xs[i], h: ys[j + 1] - ys[j] })
    }
  return out
}

/** Yapışma noktaları: i·s0 + j·s1 (i ≤ 2, j ≤ 12) */
export function snapValues(s: Syms, max: number) {
  const out: number[] = []
  for (let i = 0; i <= 2; i++) for (let j = 0; j <= 12; j++) {
    const v = i * s[0].value + j * s[1].value
    if (v <= max + EPS) out.push(v)
  }
  return out.sort((p, q) => p - q).filter((t, i, a) => i === 0 || t - a[i - 1] > 1e-4)
}

/** Sayısal uzunluğu sembolik uzunluğa çevir (bulunamazsa null) */
export function toLen(v: number, s: Syms): Len | null {
  for (let i = 0; i <= 3; i++) for (let j = -12; j <= 12; j++) if (Math.abs(i * s[0].value + j * s[1].value - v) < 1e-4) return [i, j]
  return null
}

const SUPS: Record<string, string> = { x2: 'x²', a2: 'a²', b2: 'b²', x: 'x', ab: 'ab', '1': '1' }
/** Terim sayımlarından ifade: { x2: 1, x: 2, 1: 1 } → "x² + 2x + 1" */
export function exprFrom(counts: Record<string, number>, order: string[]) {
  const parts = order.filter((t) => counts[t]).map((t) => {
    const c = counts[t]
    if (t === '1') return String(c)
    return `${c === 1 ? '' : c}${SUPS[t]}`
  })
  return parts.join(' + ') || '0'
}
