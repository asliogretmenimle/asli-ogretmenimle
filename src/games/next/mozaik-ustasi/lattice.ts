/**
 * Mozaik Ustası — kafes geometrisi.
 *  - 'tri': üçgen kafes (örüntü blokları: altıgen, yamuk, eşkenar dörtgen, üçgen), 60° dönme
 *  - 'sq' : kare kafes (kare, ikizkenar dik üçgen, dikdörtgen), 90° dönme
 * Boşluk/örtüşme denetimi için yüzey "birim parçalara" ayrılır: üçgen kafeste birim eşkenar üçgenler,
 * kare kafeste her karenin köşegenleriyle oluşan dört küçük üçgen. Bir parça, ağırlık merkezi
 * kendi içinde kalan birimleri kaplar.
 */

export type Kind = 'tri' | 'sq'
export type V2 = [number, number]
export interface P2 {
  x: number
  y: number
}

export const H = Math.sqrt(3) / 2

export type TypeId = 'hex' | 'trap' | 'rhom' | 'tri' | 'sq' | 'rt' | 'rect'

export interface PieceDef {
  id: TypeId
  kind: Kind
  name: string
  /** çoğul/sayılı ad: "2 yamuk" */
  verts: V2[]
  /** Renk: taban, açık, koyu */
  base: string
  light: string
  dark: string
}

export const PIECES: Record<TypeId, PieceDef> = {
  hex: { id: 'hex', kind: 'tri', name: 'altıgen', verts: [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]], base: '#e9a800', light: '#ffd84d', dark: '#9a6a00' },
  trap: { id: 'trap', kind: 'tri', name: 'yamuk', verts: [[0, 0], [2, 0], [1, 1], [0, 1]], base: '#d92b4b', light: '#ff7088', dark: '#8f1029' },
  rhom: { id: 'rhom', kind: 'tri', name: 'eşkenar dörtgen', verts: [[0, 0], [1, 0], [1, 1], [0, 1]], base: '#2856c8', light: '#6b98ff', dark: '#163684' },
  tri: { id: 'tri', kind: 'tri', name: 'üçgen', verts: [[0, 0], [1, 0], [0, 1]], base: '#0f9d63', light: '#45dd9f', dark: '#08643e' },
  sq: { id: 'sq', kind: 'sq', name: 'kare', verts: [[0, 0], [1, 0], [1, 1], [0, 1]], base: '#ee7a16', light: '#ffb25e', dark: '#9c4a06' },
  rt: { id: 'rt', kind: 'sq', name: 'üçgen', verts: [[0, 0], [1, 0], [0, 1]], base: '#0aa2b5', light: '#4fe0ee', dark: '#05666f' },
  rect: { id: 'rect', kind: 'sq', name: 'dikdörtgen', verts: [[0, 0], [2, 0], [2, 1], [0, 1]], base: '#8a43d4', light: '#bd8af5', dark: '#552090' },
}

export const steps = (k: Kind) => (k === 'tri' ? 6 : 4)
export const stepDeg = (k: Kind) => (k === 'tri' ? 60 : 90)
export const mod = (a: number, n: number) => ((a % n) + n) % n

export const toXY = (k: Kind, [q, r]: V2): P2 => (k === 'tri' ? { x: q + r * 0.5, y: -r * H } : { x: q, y: -r })

/** Kafes noktasını bir adım (60° / 90°) döndür (ekranda saat yönünün tersine) */
export function rot1(k: Kind, [q, r]: V2): V2 {
  return k === 'tri' ? [-r, q + r] : [-r, q]
}
export function rotN(k: Kind, v: V2, n: number): V2 {
  let p = v
  for (let i = 0; i < mod(n, steps(k)); i++) p = rot1(k, p)
  return p
}

/** Ekran noktasını (y aşağı) θ derece döndür (CSS rotate yönü: saat yönü pozitif) */
export function rotXY(p: P2, deg: number): P2 {
  const t = (deg * Math.PI) / 180
  return { x: p.x * Math.cos(t) - p.y * Math.sin(t), y: p.x * Math.sin(t) + p.y * Math.cos(t) }
}

/** En yakın kafes noktaları (adaylar) */
export function nearLattice(k: Kind, p: P2, radius = 1.2): V2[] {
  const out: V2[] = []
  if (k === 'sq') {
    for (let q = Math.floor(p.x - radius); q <= Math.ceil(p.x + radius); q++)
      for (let r = Math.floor(-p.y - radius); r <= Math.ceil(-p.y + radius); r++) {
        const s = toXY(k, [q, r])
        if (Math.hypot(s.x - p.x, s.y - p.y) <= radius) out.push([q, r])
      }
  } else {
    const r0 = -p.y / H
    for (let r = Math.floor(r0 - radius / H); r <= Math.ceil(r0 + radius / H); r++) {
      const q0 = p.x - r * 0.5
      for (let q = Math.floor(q0 - radius); q <= Math.ceil(q0 + radius); q++) {
        const s = toXY(k, [q, r])
        if (Math.hypot(s.x - p.x, s.y - p.y) <= radius) out.push([q, r])
      }
    }
  }
  return out
}

export const avg = (ps: P2[]): P2 => ({ x: ps.reduce((s, p) => s + p.x, 0) / ps.length, y: ps.reduce((s, p) => s + p.y, 0) / ps.length })

/** Parçanın (döndürülmemiş) köşelerinin ortalaması: çizim merkezi */
export const baseCenter = (t: TypeId) => avg(PIECES[t].verts.map((v) => toXY(PIECES[t].kind, v)))
/** Merkeze göre çizim çokgeni */
export const localPoly = (t: TypeId) => {
  const c = baseCenter(t)
  return PIECES[t].verts.map((v) => {
    const p = toXY(PIECES[t].kind, v)
    return { x: p.x - c.x, y: p.y - c.y }
  })
}

export const angleOf = (t: TypeId, turns: number) => -stepDeg(PIECES[t].kind) * turns

/** Yerleşmiş parçanın ekran çokgeni */
export function placedPoly(t: TypeId, turns: number, anchor: V2): P2[] {
  const k = PIECES[t].kind
  return PIECES[t].verts.map((v) => {
    const [q, r] = rotN(k, v, turns)
    return toXY(k, [q + anchor[0], r + anchor[1]])
  })
}
export function placedVerts(t: TypeId, turns: number, anchor: V2): V2[] {
  const k = PIECES[t].kind
  return PIECES[t].verts.map((v) => {
    const [q, r] = rotN(k, v, turns)
    return [q + anchor[0], r + anchor[1]] as V2
  })
}
/** Bir çapaya oturan parçanın çizim merkezi */
export const centerFor = (t: TypeId, turns: number, anchor: V2): P2 => avg(placedPoly(t, turns, anchor))

export function inPoly(p: P2, poly: P2[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

// ── birim parçalar ───────────────────────────────────────────────

export interface Unit {
  id: string
  c: P2
  poly: P2[]
  /** Kafes köşeleri (q,r) anahtarları */
  verts: string[]
}

const vk = (v: V2) => `${v[0]},${v[1]}`

export function makeUnits(k: Kind, range: number): Unit[] {
  const out: Unit[] = []
  if (k === 'tri') {
    for (let q = -range; q <= range; q++)
      for (let r = -range; r <= range; r++) {
        const up: V2[] = [[q, r], [q + 1, r], [q, r + 1]]
        const dn: V2[] = [[q + 1, r], [q + 1, r + 1], [q, r + 1]]
        for (const [t, vs] of [[0, up], [1, dn]] as const) {
          const poly = vs.map((v) => toXY(k, v))
          out.push({ id: `t${q},${r},${t}`, c: avg(poly), poly, verts: vs.map(vk) })
        }
      }
  } else {
    for (let x = -range; x <= range; x++)
      for (let y = -range; y <= range; y++) {
        const c = toXY(k, [x + 0.5, y + 0.5] as V2)
        const corners: V2[] = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]]
        for (let i = 0; i < 4; i++) {
          const a = corners[i], b = corners[(i + 1) % 4]
          const poly = [toXY(k, a), toXY(k, b), c]
          out.push({ id: `s${x},${y},${i}`, c: avg(poly), poly, verts: [vk(a), vk(b)] })
        }
      }
  }
  return out
}

export function unitsIn(units: Unit[], poly: P2[]): string[] {
  const xs = poly.map((p) => p.x), ys = poly.map((p) => p.y)
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
  return units.filter((u) => u.c.x > x0 && u.c.x < x1 && u.c.y > y0 && u.c.y < y1 && inPoly(u.c, poly)).map((u) => u.id)
}

/** Birim parça sayısı: üçgen kafeste 1 üçgen = 1; kare kafeste 1 kare = 4 */
export const unitCount = (t: TypeId) => ({ hex: 6, trap: 3, rhom: 2, tri: 1, sq: 4, rt: 2, rect: 8 })[t]

/** Bir kümenin sınır kenarları (çerçeve çizimi için) */
export function boundary(units: Unit[], ids: Set<string>): [P2, P2][] {
  const key = (p: P2) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`
  const count = new Map<string, { n: number; a: P2; b: P2 }>()
  for (const u of units) {
    if (!ids.has(u.id)) continue
    for (let i = 0; i < u.poly.length; i++) {
      const a = u.poly[i], b = u.poly[(i + 1) % u.poly.length]
      const k = [key(a), key(b)].sort().join('|')
      const e = count.get(k)
      if (e) e.n++
      else count.set(k, { n: 1, a, b })
    }
  }
  return [...count.values()].filter((e) => e.n === 1).map((e) => [e.a, e.b])
}

/** Kenar listesinden (sıralı olmasa da) SVG yol verisi */
export const edgesPath = (edges: [P2, P2][]) => edges.map(([a, b]) => `M${a.x.toFixed(4)} ${a.y.toFixed(4)}L${b.x.toFixed(4)} ${b.y.toFixed(4)}`).join('')

// ── simetri ──────────────────────────────────────────────────────

const ck = (p: P2) => `${Math.round(p.x * 24)},${Math.round(p.y * 24)}`

/** Desenin simetri doğruları (açı, derece) ve dönme simetrisi mertebesi */
export function symmetryOf(k: Kind, cells: { c: P2; type: TypeId }[]): { center: P2; lines: number[]; rotation: number } {
  if (cells.length === 0) return { center: { x: 0, y: 0 }, lines: [], rotation: 1 }
  const center = avg(cells.map((c) => c.c))
  const map = new Map<string, TypeId>()
  for (const c of cells) map.set(ck(c.c), c.type)
  const has = (p: P2, t: TypeId) => {
    const [x, y] = ck(p).split(',').map(Number)
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (map.get(`${x + dx},${y + dy}`) === t) return true
    return false
  }
  const angles = k === 'tri' ? [0, 30, 60, 90, 120, 150] : [0, 45, 90, 135]
  const lines = angles.filter((a) => {
    const t = (a * Math.PI) / 180
    const cos2 = Math.cos(2 * t), sin2 = Math.sin(2 * t)
    return cells.every(({ c, type }) => {
      const dx = c.x - center.x, dy = c.y - center.y
      return has({ x: center.x + dx * cos2 + dy * sin2, y: center.y + dx * sin2 - dy * cos2 }, type)
    })
  })
  let rotation = 1
  for (const n of k === 'tri' ? [6, 3, 2] : [4, 2]) {
    const ok = cells.every(({ c, type }) => {
      const r = rotXY({ x: c.x - center.x, y: c.y - center.y }, 360 / n)
      return has({ x: center.x + r.x, y: center.y + r.y }, type)
    })
    if (ok) {
      rotation = n
      break
    }
  }
  return { center, lines, rotation }
}

/** Ayna: dikey (x = a) ya da yatay (y = a) eksene göre birimin eşi */
export function mirrorUnit(units: Map<string, Unit>, byC: Map<string, string>, id: string, axis: { dir: 'v' | 'h'; at: number }): string | undefined {
  const u = units.get(id)
  if (!u) return undefined
  const p = axis.dir === 'v' ? { x: 2 * axis.at - u.c.x, y: u.c.y } : { x: u.c.x, y: 2 * axis.at - u.c.y }
  return byC.get(ck(p))
}
export const centroidKey = ck
