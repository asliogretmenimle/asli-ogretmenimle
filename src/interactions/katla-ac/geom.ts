import type { Pt } from '../donusum-studyosu/ortak'

/**
 * Katla ve Aç — kâğıt katlama geometrisi.
 * Doğru: p noktası + birim yön d. side(l, q) > 0 olan taraf “kanat” (katlanınca hareket eden parça) olur.
 * Kâğıt koordinatları SVG’dedir (y aşağı). Açılar ekranda saat yönünün tersine ölçülür.
 */

export type Line = { p: Pt; d: Pt }

export const lineAt = (p: Pt, deg: number): Line => {
  const r = (deg * Math.PI) / 180
  return { p, d: [Math.cos(r), -Math.sin(r)] }
}
export const lineThrough = (a: Pt, b: Pt): Line => {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  return { p: a, d: [(b[0] - a[0]) / L, (b[1] - a[1]) / L] }
}
/** n·(q − p), n = (−d₁, d₀) */
export const side = (l: Line, q: Pt) => l.d[0] * (q[1] - l.p[1]) - l.d[1] * (q[0] - l.p[0])
export const flip = (l: Line): Line => ({ p: l.p, d: [-l.d[0], -l.d[1]] })
/** q noktası hareket eden (+) tarafta kalacak biçimde yönlendir */
export const orient = (l: Line, q: Pt) => (side(l, q) >= 0 ? l : flip(l))
/** Doğrunun ekrandaki açısı (0–180) */
export const angleOf = (l: Line) => (((Math.atan2(-l.d[1], l.d[0]) * 180) / Math.PI) % 180 + 180) % 180

export function reflect(l: Line, q: Pt): Pt {
  const vx = q[0] - l.p[0], vy = q[1] - l.p[1]
  const t = vx * l.d[0] + vy * l.d[1]
  const fx = l.p[0] + t * l.d[0], fy = l.p[1] + t * l.d[1]
  return [2 * fx - q[0], 2 * fy - q[1]]
}
export const reflectPoly = (l: Line, ps: Pt[]) => ps.map((q) => reflect(l, q)).reverse()
export const reflectLine = (m: Line, l: Line): Line => {
  const p = reflect(m, l.p)
  const q = reflect(m, [l.p[0] + l.d[0], l.p[1] + l.d[1]])
  return { p, d: [q[0] - p[0], q[1] - p[1]] }
}
export const foot = (l: Line, q: Pt): Pt => {
  const t = (q[0] - l.p[0]) * l.d[0] + (q[1] - l.p[1]) * l.d[1]
  return [l.p[0] + t * l.d[0], l.p[1] + t * l.d[1]]
}

const inter = (a: Pt, b: Pt, sa: number, sb: number): Pt => {
  const t = sa / (sa - sb)
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

/** Gereksiz (çakışık ya da doğrusal) köşeleri at */
export function clean(poly: Pt[]): Pt[] {
  let ps = poly.filter((p, i) => {
    const q = poly[(i + poly.length - 1) % poly.length]
    return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6
  })
  let changed = true
  while (changed && ps.length > 3) {
    changed = false
    for (let i = 0; i < ps.length; i++) {
      const a = ps[(i + ps.length - 1) % ps.length], b = ps[i], c = ps[(i + 1) % ps.length]
      const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
      if (Math.abs(cr) < 1e-6 * Math.hypot(b[0] - a[0], b[1] - a[1]) * Math.hypot(c[0] - b[0], c[1] - b[1]) + 1e-9) {
        ps = ps.filter((_, j) => j !== i)
        changed = true
        break
      }
    }
  }
  return ps
}

/** Doğrunun bir yanını tut (keep = +1: kanat, −1: sabit taraf) — Sutherland–Hodgman */
export function clipHalf(poly: Pt[], l: Line, keep: 1 | -1): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[(i + poly.length - 1) % poly.length], b = poly[i]
    const sa = keep * side(l, a), sb = keep * side(l, b)
    const inA = sa >= -1e-9, inB = sb >= -1e-9
    if (inB) {
      if (!inA) out.push(inter(a, b, sa, sb))
      out.push(b)
    } else if (inA) out.push(inter(a, b, sa, sb))
  }
  return out.length >= 3 ? clean(out) : []
}

export function signedArea(ps: Pt[]) {
  let s = 0
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i], q = ps[(i + 1) % ps.length]
    s += p[0] * q[1] - q[0] * p[1]
  }
  return s / 2
}
export const area = (ps: Pt[]) => Math.abs(signedArea(ps))

export function centroid(ps: Pt[]): Pt {
  const A = signedArea(ps)
  if (Math.abs(A) < 1e-9) return [ps.reduce((s, p) => s + p[0], 0) / ps.length, ps.reduce((s, p) => s + p[1], 0) / ps.length]
  let cx = 0, cy = 0
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i], q = ps[(i + 1) % ps.length]
    const k = p[0] * q[1] - q[0] * p[1]
    cx += (p[0] + q[0]) * k
    cy += (p[1] + q[1]) * k
  }
  return [cx / (6 * A), cy / (6 * A)]
}

/** subject ∩ dışbükey clip */
export function clipConvex(subject: Pt[], clip: Pt[]): Pt[] {
  const c = centroid(clip)
  let out = subject
  for (let i = 0; i < clip.length && out.length; i++) {
    const l = lineThrough(clip[i], clip[(i + 1) % clip.length])
    out = clipHalf(out, l, side(l, c) >= 0 ? 1 : -1)
  }
  return out
}

/** İki köşe kümesi aynı mı (sıra önemsiz) */
export function samePoly(a: Pt[], b: Pt[], eps = 0.6) {
  const has = (ps: Pt[], q: Pt) => ps.some((p) => Math.abs(p[0] - q[0]) < eps && Math.abs(p[1] - q[1]) < eps)
  return a.every((q) => has(b, q)) && b.every((q) => has(a, q))
}
export const isSymmetry = (poly: Pt[], l: Line) => samePoly(poly, poly.map((q) => reflect(l, q)))

/** Ağırlık merkezinden geçen simetri doğrularının açıları */
export function symmetryAngles(poly: Pt[]): number[] {
  const c = centroid(poly)
  const out: number[] = []
  for (let a = 0; a < 180; a += 0.5) if (isSymmetry(poly, lineAt(c, a)) && !out.some((b) => Math.abs(b - a) < 2 || Math.abs(b - a) > 178)) out.push(a)
  return out
}

/** Doğrunun çokgen içindeki parçası (en uç iki kesişim) */
export function lineInPoly(l: Line, poly: Pt[]): [Pt, Pt] | null {
  const ts: number[] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    const sa = side(l, a), sb = side(l, b)
    if ((sa <= 1e-9 && sb >= -1e-9) || (sa >= -1e-9 && sb <= 1e-9)) {
      const q = Math.abs(sa - sb) < 1e-12 ? a : inter(a, b, sa, sb)
      ts.push((q[0] - l.p[0]) * l.d[0] + (q[1] - l.p[1]) * l.d[1])
    }
  }
  if (ts.length < 2) return null
  const t0 = Math.min(...ts), t1 = Math.max(...ts)
  if (t1 - t0 < 1e-6) return null
  return [[l.p[0] + t0 * l.d[0], l.p[1] + t0 * l.d[1]], [l.p[0] + t1 * l.d[0], l.p[1] + t1 * l.d[1]]]
}

/** Katlanma animasyonu: kanadı doğruya dik yönde c katına “bastır” (c = 1 açık, c = −1 katlı) */
export function foldMatrix(l: Line, c: number) {
  const n0 = -l.d[1], n1 = l.d[0]
  const k = c - 1
  const a = 1 + k * n0 * n0, b = k * n0 * n1, d = 1 + k * n1 * n1
  const e = l.p[0] - (a * l.p[0] + b * l.p[1])
  const f = l.p[1] - (b * l.p[0] + d * l.p[1])
  return `matrix(${a} ${b} ${b} ${d} ${e} ${f})`
}

/** Her katlamadan sonraki kâğıt biçimi */
export function shapesOf(paper: Pt[], folds: Line[]) {
  const out = [paper]
  for (const l of folds) out.push(clipHalf(out[out.length - 1], l, -1))
  return out
}

/** Katlı kâğıtta kesilen parçaların, `from` numaralı katlamaya kadar açılınca oluşan tüm görüntüleri */
export function unfoldImages(pieces: Pt[][], folds: Line[], from = 0) {
  let S = pieces
  for (let i = folds.length - 1; i >= from; i--) S = [...S, ...S.map((h) => reflectPoly(folds[i], h))]
  return S
}

/** Açılmış kâğıttaki kat izleri (doğru parçaları) */
export function creaseSegments(paper: Pt[], folds: Line[]) {
  const shapes = shapesOf(paper, folds)
  const segs: [Pt, Pt][] = []
  folds.forEach((l, j) => {
    const s = lineInPoly(l, shapes[j])
    if (!s) return
    let S: [Pt, Pt][] = [s]
    for (let i = j - 1; i >= 0; i--) S = [...S, ...S.map(([a, b]) => [reflect(folds[i], a), reflect(folds[i], b)] as [Pt, Pt])]
    segs.push(...S)
  })
  return segs
}

/** Kat izlerinin oluşturduğu desenin anahtarı (doğrular kümesi) ve sözel adı */
export function creasePattern(paper: Pt[], folds: Line[]) {
  const keys = new Set<string>()
  let v = 0, h = 0, d = 0
  for (const [a, b] of creaseSegments(paper, folds)) {
    const l = lineThrough(a, b)
    const ang = Math.round(angleOf(l)) % 180
    const n = lineAt([0, 0], ang)
    const off = Math.round(side(n, a))
    const k = `${ang}:${off}`
    if (keys.has(k)) continue
    keys.add(k)
    if (ang === 90) v++
    else if (ang === 0) h++
    else d++
  }
  const parts = [v && `${v} dikey`, h && `${h} yatay`, d && `${d} çapraz`].filter(Boolean)
  return { key: [...keys].sort().join('|'), label: `${parts.join(' + ')} kat izi` }
}

/** Kat yerleri: katlı biçimin, bir katlama doğrusu üzerindeki kenarları */
export function foldEdges(shape: Pt[], folds: Line[]): [Pt, Pt][] {
  const out: [Pt, Pt][] = []
  for (let i = 0; i < shape.length; i++) {
    const a = shape[i], b = shape[(i + 1) % shape.length]
    const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    if (folds.some((l) => Math.abs(side(l, m)) < 0.3 && Math.abs(side(l, a)) < 0.3)) out.push([a, b])
  }
  return out
}

export const translatePoly = (ps: Pt[], v: Pt) => ps.map((q) => [q[0] + v[0], q[1] + v[1]] as Pt)

/* ───────────── şekiller ───────────── */

export const SQUARE: Pt[] = [[0, 0], [100, 0], [100, 100], [0, 100]]

export function regular(n: number, c: Pt, R: number, startDeg = -90): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = ((startDeg + (360 * i) / n) * Math.PI) / 180
    return [c[0] + R * Math.cos(a), c[1] + R * Math.sin(a)] as Pt
  })
}
export function circle(c: Pt, r: number, n = 28): Pt[] {
  return Array.from({ length: n }, (_, i) => [c[0] + r * Math.cos((2 * Math.PI * i) / n), c[1] + r * Math.sin((2 * Math.PI * i) / n)] as Pt)
}
function heart(): Pt[] {
  const N = 64
  const raw = Array.from({ length: N }, (_, i) => {
    const t = (2 * Math.PI * i) / N
    return [16 * Math.sin(t) ** 3, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))] as Pt
  })
  return raw.map(([x, y]) => [50 + x * 2.8, 46 + y * 2.8] as Pt)
}

export type ShapeId = 'kare' | 'dikdortgen' | 'kalp' | 'ucgen' | 'altigen' | 'besgen' | 'sekizgen' | 'paralelkenar' | 'eskenar' | 'yamuk'
export const SHAPES: Record<ShapeId, { name: string; acc: string; poly: Pt[]; snap: number }> = {
  kare: { name: 'Kare', acc: 'kareyi', poly: [[12, 12], [88, 12], [88, 88], [12, 88]], snap: 15 },
  dikdortgen: { name: 'Dikdörtgen', acc: 'dikdörtgeni', poly: [[2, 22], [98, 22], [98, 78], [2, 78]], snap: 15 },
  kalp: { name: 'Kalp', acc: 'kalbi', poly: heart(), snap: 15 },
  ucgen: { name: 'Eşkenar üçgen', acc: 'eşkenar üçgeni', poly: regular(3, [50, 60], 50), snap: 15 },
  altigen: { name: 'Düzgün altıgen', acc: 'düzgün altıgeni', poly: regular(6, [50, 50], 46, 0), snap: 15 },
  besgen: { name: 'Düzgün beşgen', acc: 'düzgün beşgeni', poly: regular(5, [50, 54], 46), snap: 9 },
  sekizgen: { name: 'Düzgün sekizgen', acc: 'düzgün sekizgeni', poly: regular(8, [50, 50], 47, 22.5), snap: 7.5 },
  paralelkenar: { name: 'Paralelkenar', acc: 'paralelkenarı', poly: [[8, 25], [70, 25], [92, 75], [30, 75]], snap: 15 },
  eskenar: { name: 'Eşkenar dörtgen', acc: 'eşkenar dörtgeni', poly: [[50, 6], [80, 50], [50, 94], [20, 50]], snap: 15 },
  yamuk: { name: 'İkizkenar yamuk', acc: 'ikizkenar yamuğu', poly: [[30, 25], [70, 25], [94, 75], [6, 75]], snap: 15 },
}

/* ───────────── çentikler ───────────── */

export type NotchId = 'daire' | 'ucgen' | 'kare'
export const NOTCHES: { id: NotchId; name: string; make: (c: Pt) => Pt[] }[] = [
  { id: 'daire', name: 'Daire', make: (c) => circle(c, 8, 28) },
  { id: 'ucgen', name: 'Üçgen', make: ([x, y]) => [[x - 7, y - 9], [x + 9, y - 9], [x - 7, y + 9]] },
  { id: 'kare', name: 'Kare', make: ([x, y]) => [[x - 7, y - 7], [x + 7, y - 7], [x + 7, y + 7], [x - 7, y + 7]] },
]

/** Kat adayı doğrular: ağırlık merkezinden 0°, 45°, 90°, 135° (simetrik olanlar geçerli, olmayanlar çeldirici) */
export function candidateLines(shape: Pt[], opts: { axisOnly?: boolean; offCenter?: boolean } = {}) {
  const c = centroid(shape)
  const angs = opts.axisOnly ? [90, 0] : [90, 0, 45, 135]
  const out: { id: string; line: Line; ok: boolean; kind: 'dikey' | 'yatay' | 'capraz' | 'kayik' }[] = []
  for (const a of angs) {
    const l = lineAt(c, a)
    const seg = lineInPoly(l, shape)
    if (!seg || Math.hypot(seg[0][0] - seg[1][0], seg[0][1] - seg[1][1]) < 4) continue
    out.push({ id: `a${a}`, line: l, ok: isSymmetry(shape, l), kind: a === 90 ? 'dikey' : a === 0 ? 'yatay' : 'capraz' })
  }
  if (opts.offCenter) {
    const xs = shape.map((p) => p[0])
    const x = Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) * 0.34
    out.push({ id: 'off', line: lineAt([x, c[1]], 90), ok: false, kind: 'kayik' })
  }
  return out
}

/* ───────────── tahmin seçenekleri ───────────── */

export type OptKind = 'dogru' | 'tek' | 'kaydir' | 'sonKat' | 'ilkKat' | 'eksik'
const roundKey = (holes: Pt[][]) => holes.map((h) => h.map((p) => `${Math.round(p[0])},${Math.round(p[1])}`).sort().join(';')).sort().join('|')

export function predictOptions(folds: Line[], piece: Pt[], n: number, r: () => number) {
  const cands: { kind: OptKind; holes: Pt[][] }[] = [{ kind: 'dogru', holes: unfoldImages([piece], folds) }]
  const translateAll = () => {
    let S = [piece]
    for (let i = folds.length - 1; i >= 0; i--) {
      S = [...S, ...S.map((h) => {
        const c = centroid(h), rc = reflect(folds[i], c)
        return translatePoly(h, [rc[0] - c[0], rc[1] - c[1]])
      })]
    }
    return S
  }
  cands.push({ kind: 'kaydir', holes: translateAll() })
  cands.push({ kind: 'tek', holes: [piece] })
  if (folds.length >= 2) {
    cands.push({ kind: 'sonKat', holes: [piece, reflectPoly(folds[folds.length - 1], piece)] })
    cands.push({ kind: 'ilkKat', holes: unfoldImages([piece], folds.slice(1)) })
  }
  const all = cands[0].holes
  if (all.length >= 3) cands.push({ kind: 'eksik', holes: all.slice(0, all.length - 1) })
  const seen = new Set<string>()
  const uniq = cands.filter((c) => {
    const k = roundKey(c.holes)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  const [first, ...rest] = uniq
  // çeldiricileri karıştır ama ilk ikisini (kaydırma/tek) öncelikle tut
  const pickRest = rest.slice(0, 2).concat(rest.slice(2).sort(() => r() - 0.5)).slice(0, n - 1)
  return [first, ...pickRest].sort(() => r() - 0.5)
}

export const bbox = (ps: Pt[]) => {
  const xs = ps.map((p) => p[0]), ys = ps.map((p) => p[1])
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}
