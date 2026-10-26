/** Üçgen Oluşturucu — küçük geometri yardımcıları (matematik koordinatları: y yukarı) */

export type P = { x: number; y: number }
export const pt = (x: number, y: number): P => ({ x, y })
export const len = (p: P, q: P) => Math.hypot(p.x - q.x, p.y - q.y)
export const mid = (p: P, q: P): P => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 })
export const toRad = (d: number) => (d * Math.PI) / 180
export const toDeg = (r: number) => (r * 180) / Math.PI
/** p’den q’ya yönün açısı (derece, saat yönünün tersi) */
export const dirDeg = (p: P, q: P) => toDeg(Math.atan2(q.y - p.y, q.x - p.x))
export const polar = (c: P, r: number, d: number): P => ({ x: c.x + r * Math.cos(toRad(d)), y: c.y + r * Math.sin(toRad(d)) })
export const cross = (a: P, b: P, c: P) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)

/** at köşesindeki iç açı (derece) */
export function ang(at: P, p: P, q: P) {
  const u = { x: p.x - at.x, y: p.y - at.y }, w = { x: q.x - at.x, y: q.y - at.y }
  const l = Math.hypot(u.x, u.y) * Math.hypot(w.x, w.y)
  if (l < 1e-9) return 0
  return toDeg(Math.acos(Math.max(-1, Math.min(1, (u.x * w.x + u.y * w.y) / l))))
}

/** Açıları tam sayıya yuvarlar; toplam her zaman 180 görünür (en büyük kalan yöntemi) */
export function intAngles(A: P, B: P, C: P): [number, number, number] {
  const raw = [ang(A, B, C), ang(B, C, A), ang(C, A, B)]
  const fl = raw.map(Math.floor)
  let rest = 180 - fl.reduce((s, x) => s + x, 0)
  const order = raw.map((x, i) => [x - Math.floor(x), i] as const).sort((p, q) => q[0] - p[0])
  const out = fl.slice()
  for (const [, i] of order) if (rest-- > 0) out[i]++
  return [out[0], out[1], out[2]]
}

/** İki çemberin kesişim noktaları (0, 1 ya da 2 nokta; üstteki önce) */
export function circleInter(c0: P, r0: number, c1: P, r1: number): P[] {
  const d = len(c0, c1)
  if (d < 1e-9 || d > r0 + r1 + 1e-9 || d < Math.abs(r0 - r1) - 1e-9) return []
  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, r0 * r0 - a * a))
  const m = { x: c0.x + (a * (c1.x - c0.x)) / d, y: c0.y + (a * (c1.y - c0.y)) / d }
  const ox = (-(c1.y - c0.y) * h) / d, oy = ((c1.x - c0.x) * h) / d
  const p1 = { x: m.x + ox, y: m.y + oy }, p2 = { x: m.x - ox, y: m.y - oy }
  if (h < 1e-9) return [p1]
  return p1.y >= p2.y ? [p1, p2] : [p2, p1]
}

/** p noktasının AB doğrusu üzerindeki dik izdüşümü; t: A=0, B=1 */
export function project(p: P, a: P, b: P) {
  const dx = b.x - a.x, dy = b.y - a.y
  const l2 = dx * dx + dy * dy || 1
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2
  return { p: { x: a.x + t * dx, y: a.y + t * dy }, t }
}

/** A’dan çizilen açıortayın BC üzerindeki ayağı */
export function bisectorFoot(A: P, B: P, C: P): P {
  const c = len(A, B), b = len(A, C)
  return { x: (B.x * b + C.x * c) / (b + c), y: (B.y * b + C.y * c) / (b + c) }
}

/** Üç uzunluk üçgen oluşturur mu? (eşitlik durumu düz çizgidir) */
export function closes(a: number, b: number, c: number) {
  const [x, y, z] = [a, b, c].sort((p, q) => p - q)
  return x + y > z + 1e-9
}

/** Taban AB (uzunluk c, x ekseninde) ve A, B açılarıyla (AKA) C tepe noktası */
export function apexFromAngles(c: number, A: number, B: number): P | null {
  if (A + B >= 180 - 1e-9) return null
  const tA = Math.tan(toRad(A)), tB = Math.tan(toRad(B))
  if (Math.abs(A - 90) < 1e-9) return { x: 0, y: c * tB }
  if (Math.abs(B - 90) < 1e-9) return { x: c, y: c * tA }
  const x = (c * tB) / (tA + tB)
  return { x, y: x * tA }
}

export const round1 = (v: number) => Math.round(v * 10) / 10
export const snapTo = (v: number, s: number) => Math.round(v / s) * s
