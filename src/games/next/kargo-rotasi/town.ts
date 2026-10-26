/**
 * Kargo Rotası — kasaba haritası (yol ağı) ve rota hesapları.
 * Koordinatlar düzlem birimidir (x 0–12, y 0–8; y yukarı). Uzunluklar metre cinsinden saklanır.
 */

export type NodeId = 'D' | 'M' | 'E' | 'Fa' | 'F' | 'Me' | 'K' | 'I' | 'O' | 'P' | 'H' | 'C'

export type PlaceArt = 'depot' | 'market' | 'pharmacy' | 'factory' | 'bakery' | 'square' | 'library' | 'station' | 'school' | 'park' | 'hospital' | 'farm'

export interface Place {
  id: NodeId
  name: string
  /** Yönelme / belirtme ekli adlar (Türkçe metinler için) */
  dat: string
  acc: string
  x: number
  y: number
  art: PlaceArt
  emoji: string
}

export const PLACES: Place[] = [
  { id: 'D', name: 'Kargo Merkezi', dat: 'Kargo Merkezi’ne', acc: 'Kargo Merkezi’ni', x: 1, y: 1, art: 'depot', emoji: '🚚' },
  { id: 'M', name: 'Market', dat: 'Market’e', acc: 'Market’i', x: 4.5, y: 1, art: 'market', emoji: '🛒' },
  { id: 'E', name: 'Eczane', dat: 'Eczane’ye', acc: 'Eczane’yi', x: 7.5, y: 1, art: 'pharmacy', emoji: '💊' },
  { id: 'Fa', name: 'Fabrika', dat: 'Fabrika’ya', acc: 'Fabrika’yı', x: 11, y: 1, art: 'factory', emoji: '🏭' },
  { id: 'F', name: 'Fırın', dat: 'Fırın’a', acc: 'Fırın’ı', x: 1, y: 4, art: 'bakery', emoji: '🥖' },
  { id: 'Me', name: 'Meydan', dat: 'Meydan’a', acc: 'Meydan’ı', x: 4.5, y: 4, art: 'square', emoji: '⛲' },
  { id: 'K', name: 'Kütüphane', dat: 'Kütüphane’ye', acc: 'Kütüphane’yi', x: 7.5, y: 4, art: 'library', emoji: '📚' },
  { id: 'I', name: 'İstasyon', dat: 'İstasyon’a', acc: 'İstasyon’u', x: 11, y: 4, art: 'station', emoji: '🚉' },
  { id: 'O', name: 'Okul', dat: 'Okul’a', acc: 'Okul’u', x: 1, y: 7, art: 'school', emoji: '🏫' },
  { id: 'P', name: 'Park', dat: 'Park’a', acc: 'Park’ı', x: 4.5, y: 7, art: 'park', emoji: '🌳' },
  { id: 'H', name: 'Hastane', dat: 'Hastane’ye', acc: 'Hastane’yi', x: 7.5, y: 7, art: 'hospital', emoji: '🏥' },
  { id: 'C', name: 'Çiftlik', dat: 'Çiftlik’e', acc: 'Çiftlik’i', x: 11, y: 7, art: 'farm', emoji: '🐄' },
]

export const PLACE: Record<NodeId, Place> = Object.fromEntries(PLACES.map((p) => [p.id, p])) as Record<NodeId, Place>

export interface Road {
  a: NodeId
  b: NodeId
  /** 3. sınıf ölçeğinde uzunluk (m) */
  base: number
  bridge?: boolean
}

/** Yol ağı. Nehir Kütüphane ile İstasyon arasından akar; yalnız iki köprü var. */
export const ROADS: Road[] = [
  { a: 'D', b: 'M', base: 180 },
  { a: 'M', b: 'E', base: 150 },
  { a: 'E', b: 'Fa', base: 170, bridge: true },
  { a: 'F', b: 'Me', base: 170 },
  { a: 'Me', b: 'K', base: 140 },
  { a: 'O', b: 'P', base: 160 },
  { a: 'P', b: 'H', base: 150 },
  { a: 'H', b: 'C', base: 180, bridge: true },
  { a: 'D', b: 'F', base: 150 },
  { a: 'F', b: 'O', base: 140 },
  { a: 'M', b: 'Me', base: 160 },
  { a: 'Me', b: 'P', base: 130 },
  { a: 'E', b: 'K', base: 150 },
  { a: 'K', b: 'H', base: 140 },
  { a: 'Fa', b: 'I', base: 150 },
  { a: 'I', b: 'C', base: 160 },
  { a: 'M', b: 'K', base: 210 },
]

export const roadKey = (a: NodeId, b: NodeId) => (a < b ? `${a}-${b}` : `${b}-${a}`)

export function findRoad(a: NodeId, b: NodeId): Road | undefined {
  return ROADS.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a))
}

/** Sınıfa göre ölçek: 3 → m, 4 → ×6 (km–m), 5–6 → ×10 (ondalık km) */
export const scaleFor = (grade: number) => (grade <= 3 ? 1 : grade === 4 ? 6 : 10)

export interface MapRules {
  /** Tek yön: anahtar roadKey, değer izin verilen başlangıç düğümü */
  oneWay?: Partial<Record<string, NodeId>>
  /** Kapalı yollar (yol çalışması) */
  closed?: string[]
}

export type Lengths = Record<string, number>

export function lengthsFor(grade: number, override?: Partial<Record<string, number>>): Lengths {
  const s = scaleFor(grade)
  const out: Lengths = {}
  for (const r of ROADS) out[roadKey(r.a, r.b)] = r.base * s
  if (override) for (const [k, v] of Object.entries(override)) if (v !== undefined) out[k] = v
  return out
}

/** a’dan b’ye kurallara uygun doğrudan geçiş var mı? */
export function canMove(a: NodeId, b: NodeId, rules: MapRules): 'ok' | 'noroad' | 'closed' | 'oneway' {
  const r = findRoad(a, b)
  if (!r) return 'noroad'
  const k = roadKey(a, b)
  if (rules.closed?.includes(k)) return 'closed'
  const from = rules.oneWay?.[k]
  if (from && from !== a) return 'oneway'
  return 'ok'
}

export function neighbors(a: NodeId, rules: MapRules): NodeId[] {
  const out: NodeId[] = []
  for (const r of ROADS) {
    const other = r.a === a ? r.b : r.b === a ? r.a : null
    if (other && canMove(a, other, rules) === 'ok') out.push(other)
  }
  return out
}

export function routeLength(route: NodeId[], L: Lengths): number {
  let s = 0
  for (let i = 1; i < route.length; i++) s += L[roadKey(route[i - 1], route[i])] ?? 0
  return s
}

export function segments(route: NodeId[], L: Lengths): number[] {
  const out: number[] = []
  for (let i = 1; i < route.length; i++) out.push(L[roadKey(route[i - 1], route[i])] ?? 0)
  return out
}

/** Dijkstra: en kısa mesafe ve yol */
export function shortestPath(from: NodeId, to: NodeId, L: Lengths, rules: MapRules): { d: number; path: NodeId[] } {
  const dist = new Map<NodeId, number>([[from, 0]])
  const prev = new Map<NodeId, NodeId>()
  const done = new Set<NodeId>()
  while (true) {
    let u: NodeId | null = null
    let best = Infinity
    for (const [n, d] of dist) if (!done.has(n) && d < best) { best = d; u = n }
    if (!u) break
    if (u === to) break
    done.add(u)
    for (const v of neighbors(u, rules)) {
      const nd = best + (L[roadKey(u, v)] ?? Infinity)
      if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); prev.set(v, u) }
    }
  }
  const d = dist.get(to) ?? Infinity
  const path: NodeId[] = []
  if (d < Infinity) {
    let c: NodeId | undefined = to
    while (c) { path.unshift(c); c = c === from ? undefined : prev.get(c) }
  }
  return { d, path }
}

function perms<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs]
  return xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]))
}

export interface TourSpec {
  start: NodeId
  stops: NodeId[]
  home: boolean
  /** ilk teslim edilmesi gereken durak */
  first?: NodeId
}

/** Tüm durakları dolaşan en kısa tur (sıra serbest, kurallara uygun) */
export function bestTour(spec: TourSpec, L: Lengths, rules: MapRules): { d: number; route: NodeId[] } {
  let best = { d: Infinity, route: [] as NodeId[] }
  for (const order of perms(spec.stops)) {
    if (spec.first && order[0] !== spec.first) continue
    const seq = [spec.start, ...order, ...(spec.home ? [spec.start] : [])]
    let d = 0
    const route: NodeId[] = [spec.start]
    let ok = true
    for (let i = 1; i < seq.length; i++) {
      const sp = shortestPath(seq[i - 1], seq[i], L, rules)
      if (sp.d === Infinity) { ok = false; break }
      // "first" kuralı: ilk durağa giderken başka bir durağa uğramamalı
      if (spec.first && i === 1 && sp.path.slice(1, -1).some((n) => spec.stops.includes(n))) { ok = false; break }
      d += sp.d
      route.push(...sp.path.slice(1))
    }
    if (ok && d < best.d) best = { d, route }
  }
  return best
}

/** Rotanın sokak kümesi (yönsüz) — ters yönde aynı sokaklar aynı rota sayılır */
export function routeKey(route: NodeId[]): string {
  const ks: string[] = []
  for (let i = 1; i < route.length; i++) ks.push(roadKey(route[i - 1], route[i]))
  return ks.sort().join('|')
}

/** Rotada durakların ilk ziyaret sırası */
export function visitOrder(route: NodeId[], stops: NodeId[]): NodeId[] {
  const out: NodeId[] = []
  for (const n of route.slice(1)) if (stops.includes(n) && !out.includes(n)) out.push(n)
  return out
}
