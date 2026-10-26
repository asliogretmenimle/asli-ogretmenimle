import type { Pt } from './ortak'

/** Ayna doğrusu — v: x = c, h: y = c, d: y = x + c, a: y = −x + c */
export type LineKind = 'v' | 'h' | 'd' | 'a'
export type Line = { k: LineKind; c: number }
export type Tf =
  | { k: 'T'; dx: number; dy: number }
  | { k: 'R'; line: Line }
  /** Döndürme: saatin tersi yönünde deg derece */
  | { k: 'O'; cx: number; cy: number; deg: number }
export type TfKind = Tf['k']

const r6 = (v: number) => {
  const x = Math.round(v * 1e6) / 1e6
  return Object.is(x, -0) ? 0 : x
}

export function reflect(l: Line, [x, y]: Pt): Pt {
  if (l.k === 'v') return [r6(2 * l.c - x), y]
  if (l.k === 'h') return [x, r6(2 * l.c - y)]
  if (l.k === 'd') return [r6(y - l.c), r6(x + l.c)]
  return [r6(l.c - y), r6(l.c - x)]
}

export function rotate(cx: number, cy: number, deg: number, [x, y]: Pt): Pt {
  const t = (deg * Math.PI) / 180
  const dx = x - cx, dy = y - cy
  return [r6(cx + dx * Math.cos(t) - dy * Math.sin(t)), r6(cy + dx * Math.sin(t) + dy * Math.cos(t))]
}

export function apply(tf: Tf, p: Pt): Pt {
  if (tf.k === 'T') return [r6(p[0] + tf.dx), r6(p[1] + tf.dy)]
  if (tf.k === 'R') return reflect(tf.line, p)
  return rotate(tf.cx, tf.cy, tf.deg, p)
}
export const applyAll = (tf: Tf, ps: Pt[]) => ps.map((p) => apply(tf, p))

/** Animasyon için ara konum (t: 0 → 1). Yansıma: nokta aynaya dik doğrultuda karşıya geçer (şekil “katlanır”). */
export function interp(tf: Tf, p: Pt, t: number): Pt {
  if (tf.k === 'T') return [p[0] + tf.dx * t, p[1] + tf.dy * t]
  if (tf.k === 'O') return rotate(tf.cx, tf.cy, tf.deg * t, p)
  const q = reflect(tf.line, p)
  return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]
}

const eq = (a: Pt, b: Pt) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6
export const samePt = eq
/** Köşe eşlemesi dahil aynı mı? */
export const sameLabeled = (a: Pt[], b: Pt[]) => a.length === b.length && a.every((p, i) => eq(p, b[i]))
/** Köşe kümesi olarak aynı mı (etiket önemsiz)? */
export const sameSet = (a: Pt[], b: Pt[]) => a.length === b.length && a.every((p) => b.some((q) => eq(p, q))) && b.every((q) => a.some((p) => eq(p, q)))

/** Tüm köşeler aynı vektörle mi kaymış? (şekil yönü korunmuş öteleme) */
export function asTranslation(from: Pt[], to: Pt[]): [number, number] | null {
  const d: [number, number] = [r6(to[0][0] - from[0][0]), r6(to[0][1] - from[0][1])]
  return from.every((p, i) => eq([p[0] + d[0], p[1] + d[1]], to[i])) ? d : null
}

/** Ön görüntüyü küme olarak hedefe taşıyan bir öteleme var mı? */
export function translationToSet(from: Pt[], target: Pt[]): [number, number] | null {
  for (const q of target) {
    const d: [number, number] = [q[0] - from[0][0], q[1] - from[0][1]]
    if (sameSet(from.map(([x, y]) => [x + d[0], y + d[1]]), target)) return d
  }
  return null
}

export const tfKey = (tf: Tf) => (tf.k === 'T' ? `T:${tf.dx},${tf.dy}` : tf.k === 'R' ? `R:${tf.line.k}:${tf.line.c}` : `O:${tf.cx},${tf.cy},${((tf.deg % 360) + 360) % 360}`)

/* ───────────── sözel ve sembolik betimleme ───────────── */

export const num = (v: number) => (Object.is(r6(v), -0) ? 0 : r6(v)).toLocaleString('tr-TR', { maximumFractionDigits: 2 }).replace('-', '−')

export function moveWords(dx: number, dy: number) {
  const h = dx ? `${Math.abs(dx)} birim ${dx > 0 ? 'sağa' : 'sola'}` : ''
  const v = dy ? `${Math.abs(dy)} birim ${dy > 0 ? 'yukarı' : 'aşağı'}` : ''
  return [h, v].filter(Boolean).join(', ') || 'yerinde'
}

export function lineName(l: Line, coords: boolean) {
  if (!coords) return l.k === 'v' ? 'dikey ayna' : l.k === 'h' ? 'yatay ayna' : 'çapraz ayna'
  if (l.k === 'v') return l.c === 0 ? 'y ekseni' : `x = ${num(l.c)} doğrusu`
  if (l.k === 'h') return l.c === 0 ? 'x ekseni' : `y = ${num(l.c)} doğrusu`
  if (l.k === 'd') return l.c === 0 ? 'y = x doğrusu' : `y = x ${l.c > 0 ? '+' : '−'} ${num(Math.abs(l.c))} doğrusu`
  return l.c === 0 ? 'y = −x doğrusu' : `y = −x ${l.c > 0 ? '+' : '−'} ${num(Math.abs(l.c))} doğrusu`
}

/** “x ekseni” → “x eksenine göre”, “y = 3 doğrusu” → “y = 3 doğrusuna göre”, “dikey ayna” → “dikey aynaya göre” */
export function lineGore(l: Line, coords: boolean) {
  const n = lineName(l, coords)
  if (n.endsWith('ekseni')) return n.replace(/ekseni$/, 'eksenine göre')
  if (n.endsWith('doğrusu')) return n.replace(/doğrusu$/, 'doğrusuna göre')
  return n.replace(/ayna$/, 'aynaya göre')
}

export function describe(tf: Tf, coords: boolean) {
  if (tf.k === 'T') return `Öteleme: ${moveWords(tf.dx, tf.dy)}`
  if (tf.k === 'R') return `Yansıma: ${lineGore(tf.line, coords)}`
  const d = ((tf.deg % 360) + 360) % 360
  const c = tf.cx === 0 && tf.cy === 0 ? 'orijin' : `(${num(tf.cx)}, ${num(tf.cy)}) noktası`
  return `Döndürme: ${c} etrafında ${d === 270 ? '90° saat yönünde' : d === 180 ? '180°' : `${d}° saatin tersi yönünde`}`
}

/** ±x + c biçiminde ifade */
export function lin(sign: 1 | -1, name: 'x' | 'y', c: number) {
  if (sign === 1) return c === 0 ? name : c > 0 ? `${name} + ${num(c)}` : `${name} − ${num(-c)}`
  return c === 0 ? `−${name}` : c > 0 ? `${num(c)} − ${name}` : `−${name} − ${num(-c)}`
}

/** Koordinat kuralı (8. sınıf). Yalnızca öteleme ve eksenlere paralel/çapraz yansıma, 90°’nin katlarıyla döndürme. */
export function ruleOf(tf: Tf): [string, string] {
  if (tf.k === 'T') return [lin(1, 'x', tf.dx), lin(1, 'y', tf.dy)]
  if (tf.k === 'R') {
    const { k, c } = tf.line
    if (k === 'v') return [lin(-1, 'x', 2 * c), 'y']
    if (k === 'h') return ['x', lin(-1, 'y', 2 * c)]
    if (k === 'd') return [lin(1, 'y', -c), lin(1, 'x', c)]
    return [lin(-1, 'y', c), lin(-1, 'x', c)]
  }
  const d = ((tf.deg % 360) + 360) % 360
  const { cx: a, cy: b } = tf
  if (d === 90) return [lin(-1, 'y', a + b), lin(1, 'x', b - a)]
  if (d === 180) return [lin(-1, 'x', 2 * a), lin(-1, 'y', 2 * b)]
  if (d === 270) return [lin(1, 'y', a - b), lin(-1, 'x', a + b)]
  return ['x', 'y']
}

export const LETTERS = 'ABCDEFGH'
export const fmtPt = (p: Pt) => `(${num(p[0])}, ${num(p[1])})`
