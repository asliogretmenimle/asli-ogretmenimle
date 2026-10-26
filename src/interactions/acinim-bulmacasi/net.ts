/**
 * Açınım geometrisi (CSS 3B katlama ile birebir aynı matematik).
 *
 * Bir açınım, düzlemde çokgen yüzlerden oluşan bir ağaçtır: her yüz (kök hariç) ebeveynine bir menteşe
 * doğru parçasıyla (p → q) bağlıdır ve katlanınca bu doğru etrafında `angle` derece döner.
 * Bütün yüzler aynı “açınım koordinatlarında” tanımlıdır; iç içe CSS dönüşümleri
 * translate(p) · rotate3d(k, a) · translate(−p) ile katlanır. Aynı çarpımlar burada 4×4 matrislerle
 * hesaplanır: yüz merkezleri ve normalleri → çakışan yüzler, karşılıklı yüzler.
 * Koordinatlar CSS gibidir: x sağa, y aşağı, z izleyiciye doğru. Katlama izleyiciden uzağa doğrudur;
 * böylece kâğıdın ön yüzü cismin dışında kalır.
 */

export type P2 = [number, number]
export type V3 = [number, number, number]

export interface Face {
  pts: P2[]
  /** Ebeveyn yüzün sırası (kök için −1). Ebeveyn her zaman çocuktan önce gelir. */
  parent: number
  hinge?: [P2, P2]
  /** Tam katlanınca dönme açısı (derece, işaretsiz) */
  angle: number
  color: string
  label?: string
  /** Izgaradan gelen yüzlerde hücre */
  cell?: P2
  /** Yüzün içinde birim ızgara çizgileri (eksenlere paralel dikdörtgenler için) */
  grid?: boolean
  /** Dikiş çizgisi göstermeden boya (silindir/koni şeritleri) */
  seamless?: boolean
}

export interface Prepared {
  faces: Face[]
  signed: number[]
  children: number[][]
  centroid: P2[]
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

/* ───────────── 4×4 matris ───────────── */

export type M4 = number[]
const I4: M4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
function mul(a: M4, b: M4): M4 {
  const c = new Array<number>(16).fill(0)
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    let s = 0
    for (let k = 0; k < 4; k++) s += a[i * 4 + k] * b[k * 4 + j]
    c[i * 4 + j] = s
  }
  return c
}
const T = (x: number, y: number, z = 0): M4 => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1]
/** CSS rotate3d ile aynı (sağ el kuralı, birim eksen) */
function R(kx: number, ky: number, kz: number, deg: number): M4 {
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a), s = Math.sin(a), C = 1 - c
  return [
    kx * kx * C + c, kx * ky * C - kz * s, kx * kz * C + ky * s, 0,
    ky * kx * C + kz * s, ky * ky * C + c, ky * kz * C - kx * s, 0,
    kz * kx * C - ky * s, kz * ky * C + kx * s, kz * kz * C + c, 0,
    0, 0, 0, 1,
  ]
}
export const apply = (m: M4, [x, y, z]: V3): V3 => [m[0] * x + m[1] * y + m[2] * z + m[3], m[4] * x + m[5] * y + m[6] * z + m[7], m[8] * x + m[9] * y + m[10] * z + m[11]]
export const applyDir = (m: M4, [x, y, z]: V3): V3 => [m[0] * x + m[1] * y + m[2] * z, m[4] * x + m[5] * y + m[6] * z, m[8] * x + m[9] * y + m[10] * z]

function centroidOf(pts: P2[]): P2 {
  // alan merkezi (dışbükey olmayanlarda da doğru)
  let a = 0, cx = 0, cy = 0
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length]
    const cr = p[0] * q[1] - q[0] * p[1]
    a += cr
    cx += (p[0] + q[0]) * cr
    cy += (p[1] + q[1]) * cr
  })
  if (Math.abs(a) < 1e-9) return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]
  return [cx / (3 * a), cy / (3 * a)]
}

export function prepare(faces: Face[]): Prepared {
  const centroid = faces.map((f) => centroidOf(f.pts))
  const children = faces.map(() => [] as number[])
  const signed = faces.map((f, i) => {
    if (f.parent < 0 || !f.hinge) return 0
    children[f.parent].push(i)
    const [p, q] = f.hinge
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1
    const kx = (q[0] - p[0]) / L, ky = (q[1] - p[1]) / L
    const wx = centroid[i][0] - p[0], wy = centroid[i][1] - p[1]
    // (k × w)_z · sin a  > 0 ise yüz izleyiciye gelir; uzağa katlamak için işareti çevir
    return kx * wy - ky * wx > 0 ? -f.angle : f.angle
  })
  const xs = faces.flatMap((f) => f.pts.map((p) => p[0])), ys = faces.flatMap((f) => f.pts.map((p) => p[1]))
  return { faces, signed, children, centroid, bbox: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) } }
}

/** Yüzün ebeveynine göre yerel dönüşümü (t: 0 açık → 1 kapalı) */
export function localMatrix(P: Prepared, i: number, t: number): M4 {
  const f = P.faces[i]
  if (f.parent < 0 || !f.hinge) return I4
  const [p, q] = f.hinge
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1
  return mul(mul(T(p[0], p[1]), R((q[0] - p[0]) / L, (q[1] - p[1]) / L, 0, P.signed[i] * t)), T(-p[0], -p[1]))
}
export function hingeAxis(P: Prepared, i: number) {
  const f = P.faces[i]
  if (!f.hinge) return null
  const [p, q] = f.hinge
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1
  return { p, k: [(q[0] - p[0]) / L, (q[1] - p[1]) / L] as P2 }
}

export function worlds(P: Prepared, t: number): M4[] {
  const W: M4[] = []
  P.faces.forEach((f, i) => {
    W[i] = f.parent < 0 ? I4 : mul(W[f.parent], localMatrix(P, i, t))
  })
  return W
}

export function frames(P: Prepared, t: number) {
  const W = worlds(P, t)
  return P.faces.map((_, i) => ({ c: apply(W[i], [P.centroid[i][0], P.centroid[i][1], 0]), n: applyDir(W[i], [0, 0, 1]) }))
}

/** Tam katlanınca aynı yere gelen yüz çiftleri */
export function collisions(P: Prepared, tol = 0.08): [number, number][] {
  const F = frames(P, 1)
  const out: [number, number][] = []
  for (let i = 0; i < F.length; i++)
    for (let j = i + 1; j < F.length; j++) {
      const d = Math.hypot(F[i].c[0] - F[j].c[0], F[i].c[1] - F[j].c[1], F[i].c[2] - F[j].c[2])
      const dot = F[i].n[0] * F[j].n[0] + F[i].n[1] * F[j].n[1] + F[i].n[2] * F[j].n[2]
      if (d < tol && Math.abs(dot) > 0.95) out.push([i, j])
    }
  return out
}

/** Küpte her yüzün karşısındaki yüz (normaller ters) */
export function opposites(P: Prepared): number[] {
  const F = frames(P, 1)
  return F.map((a, i) => F.findIndex((b, j) => j !== i && a.n[0] * b.n[0] + a.n[1] * b.n[1] + a.n[2] * b.n[2] < -0.9))
}

/* ───────────── kare ızgaradan (küp) açınımları ───────────── */

export const FACE_COLORS = ['#f472b6', '#60a5fa', '#fbbf24', '#34d399', '#a78bfa', '#fb923c']
export const COLOR_NAMES = ['Pembe', 'Mavi', 'Sarı', 'Yeşil', 'Mor', 'Turuncu']

const key = (p: P2) => `${p[0]},${p[1]}`
const N4: P2[] = [[1, 0], [-1, 0], [0, 1], [0, -1]]

export function connected(cells: P2[]) {
  if (!cells.length) return false
  const set = new Set(cells.map(key))
  const seen = new Set([key(cells[0])])
  const st = [cells[0]]
  while (st.length) {
    const [x, y] = st.pop()!
    for (const [dx, dy] of N4) {
      const k = key([x + dx, y + dy])
      if (set.has(k) && !seen.has(k)) { seen.add(k); st.push([x + dx, y + dy]) }
    }
  }
  return seen.size === cells.length
}

/** Hücrelerden yüz ağacı: kök en çok komşusu olan hücre, genişlik öncelikli */
export function cellFaces(cells: P2[], color: (cellIndex: number) => string = () => FACE_COLORS[0], label?: (cellIndex: number) => string | undefined): { faces: Face[]; faceOfCell: number[] } {
  const idx = new Map(cells.map((c, i) => [key(c), i]))
  const deg = cells.map(([x, y]) => N4.filter(([dx, dy]) => idx.has(key([x + dx, y + dy]))).length)
  const root = deg.indexOf(Math.max(...deg))
  const faceOfCell = cells.map(() => -1)
  const faces: Face[] = []
  const q = [root]
  const sq = ([x, y]: P2): P2[] => [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]]
  faceOfCell[root] = 0
  faces.push({ pts: sq(cells[root]), parent: -1, angle: 0, color: color(root), label: label?.(root), cell: cells[root] })
  while (q.length) {
    const ci = q.shift()!
    const [x, y] = cells[ci]
    for (const [dx, dy] of N4) {
      const nj = idx.get(key([x + dx, y + dy]))
      if (nj === undefined || faceOfCell[nj] >= 0) continue
      const hinge: [P2, P2] = dx === 1 ? [[x + 1, y], [x + 1, y + 1]] : dx === -1 ? [[x, y], [x, y + 1]] : dy === 1 ? [[x, y + 1], [x + 1, y + 1]] : [[x, y], [x + 1, y]]
      faceOfCell[nj] = faces.length
      faces.push({ pts: sq(cells[nj]), parent: faceOfCell[ci], hinge, angle: 90, color: color(nj), label: label?.(nj), cell: cells[nj] })
      q.push(nj)
    }
  }
  return { faces, faceOfCell }
}

export function isCubeNet(cells: P2[]) {
  if (cells.length !== 6 || !connected(cells)) return false
  return collisions(prepare(cellFaces(cells).faces)).length === 0
}

/** Döndürme ve ters çevirme altında değişmeyen anahtar */
export function canonical(cells: P2[]): string {
  const T8: ((p: P2) => P2)[] = [
    ([x, y]) => [x, y], ([x, y]) => [-y, x], ([x, y]) => [-x, -y], ([x, y]) => [y, -x],
    ([x, y]) => [-x, y], ([x, y]) => [y, x], ([x, y]) => [x, -y], ([x, y]) => [-y, -x],
  ]
  let best = ''
  for (const tf of T8) {
    const ps = cells.map(tf)
    const mx = Math.min(...ps.map((p) => p[0])), my = Math.min(...ps.map((p) => p[1]))
    const s = ps.map(([x, y]) => [x - mx, y - my] as P2).sort((a, b) => a[1] - b[1] || a[0] - b[0]).map(key).join(';')
    if (!best || s < best) best = s
  }
  return best
}
export const parseCells = (s: string): P2[] => s.split(';').map((k) => k.split(',').map(Number) as P2)

/** Tüm altılılar (35 tane) */
function hexominoes(): string[] {
  let cur = new Set([canonical([[0, 0]])])
  for (let n = 1; n < 6; n++) {
    const nx = new Set<string>()
    cur.forEach((s) => {
      const cs = parseCells(s)
      const has = new Set(cs.map(key))
      cs.forEach(([x, y]) => N4.forEach(([dx, dy]) => {
        const p: P2 = [x + dx, y + dy]
        if (!has.has(key(p))) nx.add(canonical([...cs, p]))
      }))
    })
    cur = nx
  }
  return [...cur].sort()
}

const ALL6 = hexominoes()
/** 11 küp açınımı (kanonik) */
export const CUBE_NETS: string[] = ALL6.filter((s) => isCubeNet(parseCells(s)))
const has2x2 = (cs: P2[]) => {
  const s = new Set(cs.map(key))
  return cs.some(([x, y]) => s.has(key([x + 1, y])) && s.has(key([x, y + 1])) && s.has(key([x + 1, y + 1])))
}
const span = (cs: P2[]) => Math.max(Math.max(...cs.map((p) => p[0])) - Math.min(...cs.map((p) => p[0])), Math.max(...cs.map((p) => p[1])) - Math.min(...cs.map((p) => p[1]))) + 1
/** Küp olmayan ama “küp olur gibi duran” altılılar: 2×2 blok yok, en uzun kenar ≤ 4 */
export const TRICKY_NON_NETS: string[] = ALL6.filter((s) => {
  const cs = parseCells(s)
  return !CUBE_NETS.includes(s) && !has2x2(cs) && span(cs) <= 4
})
/** 2×3 dikdörtgen gibi bariz olmayanlar dahil tüm olmayanlar */
export const NON_NETS: string[] = ALL6.filter((s) => !CUBE_NETS.includes(s))

/** Hücreleri yatay yerleştir (genişlik ≥ yükseklik) */
export function landscape(cs: P2[]): P2[] {
  const w = Math.max(...cs.map((p) => p[0])) - Math.min(...cs.map((p) => p[0]))
  const h = Math.max(...cs.map((p) => p[1])) - Math.min(...cs.map((p) => p[1]))
  return h > w ? cs.map(([x, y]) => [y, x] as P2) : cs
}

/* ───────────── prizma, piramit, silindir, koni ───────────── */

const rect = (x0: number, y0: number, x1: number, y1: number): P2[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]

export const PAIR_COLORS = ['#60a5fa', '#f472b6', '#fbbf24']

/**
 * a × b × c kutu (a: en, b: boy, c: yükseklik). Alt yüz a×b köktür.
 * layout: 'cross' (yan yüzler alta bağlı), 'sidesTop' (yan yüzler üste bağlı),
 *         'sameSide' (iki yan yüz de solda → çakışır), 'wrongTop' (üst yüz a×c → boşluk/taşma)
 */
export function boxFaces(a: number, b: number, c: number, opt: { layout?: 'cross' | 'sidesTop' | 'sameSide' | 'wrongTop'; pairs?: boolean; labels?: boolean; grid?: boolean; color?: string } = {}): Face[] {
  const { layout = 'cross', pairs = false, labels = false, grid = false, color = '#93c5fd' } = opt
  const col = (k: number) => (pairs ? PAIR_COLORS[k] : color)
  const lb = (u: number, v: number) => (labels ? `${u}×${v}` : undefined)
  const topH = layout === 'wrongTop' ? c : b
  const faces: Face[] = [
    { pts: rect(0, 0, a, b), parent: -1, angle: 0, color: col(0), label: lb(a, b), grid },
    { pts: rect(0, -c, a, 0), parent: 0, hinge: [[0, 0], [a, 0]], angle: 90, color: col(1), label: lb(a, c), grid },
    { pts: rect(0, -c - topH, a, -c), parent: 1, hinge: [[0, -c], [a, -c]], angle: 90, color: col(0), label: lb(a, topH), grid },
    { pts: rect(0, b, a, b + c), parent: 0, hinge: [[0, b], [a, b]], angle: 90, color: col(1), label: lb(a, c), grid },
  ]
  if (layout === 'sidesTop') {
    faces.push({ pts: rect(-c, -c - b, 0, -c), parent: 2, hinge: [[0, -c - b], [0, -c]], angle: 90, color: col(2), label: lb(c, b), grid })
    faces.push({ pts: rect(a, -c - b, a + c, -c), parent: 2, hinge: [[a, -c - b], [a, -c]], angle: 90, color: col(2), label: lb(c, b), grid })
  } else if (layout === 'sameSide') {
    faces.push({ pts: rect(-c, 0, 0, b), parent: 0, hinge: [[0, 0], [0, b]], angle: 90, color: col(2), label: lb(c, b), grid })
    faces.push({ pts: rect(-c, -c - b, 0, -c), parent: 2, hinge: [[0, -c - b], [0, -c]], angle: 90, color: col(2), label: lb(c, b), grid })
  } else {
    faces.push({ pts: rect(-c, 0, 0, b), parent: 0, hinge: [[0, 0], [0, b]], angle: 90, color: col(2), label: lb(c, b), grid })
    faces.push({ pts: rect(a, 0, a + c, b), parent: 0, hinge: [[a, 0], [a, b]], angle: 90, color: col(2), label: lb(c, b), grid })
  }
  return faces
}

/** Eşkenar üçgen tabanlı dik prizma: kenar e, yükseklik h */
export function triPrismFaces(e = 2, h = 3): Face[] {
  const t = e * Math.sqrt(3) / 2
  const side = '#5eead4', base = '#fbbf24'
  return [
    { pts: rect(e, 0, 2 * e, h), parent: -1, angle: 0, color: side },
    { pts: rect(0, 0, e, h), parent: 0, hinge: [[e, 0], [e, h]], angle: 120, color: side },
    { pts: rect(2 * e, 0, 3 * e, h), parent: 0, hinge: [[2 * e, 0], [2 * e, h]], angle: 120, color: side },
    { pts: [[e, 0], [2 * e, 0], [1.5 * e, -t]], parent: 0, hinge: [[e, 0], [2 * e, 0]], angle: 90, color: base },
    { pts: [[e, h], [2 * e, h], [1.5 * e, h + t]], parent: 0, hinge: [[e, h], [2 * e, h]], angle: 90, color: base },
  ]
}

/** Kare dik piramit: taban kenarı a, yan yüz yüksekliği s */
export function pyramidFaces(a = 2, s = 2): Face[] {
  const ang = 180 - (Math.acos(a / 2 / s) * 180) / Math.PI
  const lat = '#f9a8d4', base = '#a78bfa'
  return [
    { pts: rect(0, 0, a, a), parent: -1, angle: 0, color: base },
    { pts: [[0, 0], [a, 0], [a / 2, -s]], parent: 0, hinge: [[0, 0], [a, 0]], angle: ang, color: lat },
    { pts: [[a, 0], [a, a], [a + s, a / 2]], parent: 0, hinge: [[a, 0], [a, a]], angle: ang, color: lat },
    { pts: [[0, a], [a, a], [a / 2, a + s]], parent: 0, hinge: [[0, a], [a, a]], angle: ang, color: lat },
    { pts: [[0, 0], [0, a], [-s, a / 2]], parent: 0, hinge: [[0, 0], [0, a]], angle: ang, color: lat },
  ]
}

const circlePts = (cx: number, cy: number, r: number, n = 40): P2[] => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)] as P2)

/**
 * Silindir: yan yüz w × h dikdörtgeni N şeride bölünür; her menteşe 360/N · w/(2πr) kadar döner
 * (π ≈ 3 alınır: w = 6r iken tam kapanır). Kapaklar orta şeride teğet daireler.
 */
export const PI3 = 3
export function cylinderFaces(r: number, h: number, w: number, N = 21): Face[] {
  const dw = w / N
  const per = (360 / N) * (w / (2 * PI3 * r))
  const k0 = Math.floor(N / 2)
  const side = '#7dd3fc', lid = '#fda4af'
  const faces: Face[] = [{ pts: rect(k0 * dw, 0, (k0 + 1) * dw, h), parent: -1, angle: 0, color: side, seamless: true }]
  let prev = 0
  for (let k = k0 + 1; k < N; k++) {
    faces.push({ pts: rect(k * dw, 0, (k + 1) * dw, h), parent: prev, hinge: [[k * dw, 0], [k * dw, h]], angle: per, color: side, seamless: true })
    prev = faces.length - 1
  }
  prev = 0
  for (let k = k0 - 1; k >= 0; k--) {
    faces.push({ pts: rect(k * dw, 0, (k + 1) * dw, h), parent: prev, hinge: [[(k + 1) * dw, 0], [(k + 1) * dw, h]], angle: per, color: side, seamless: true })
    prev = faces.length - 1
  }
  // kapak yarıçapı = kapanan çokgenin iç teğet yarıçapı (π ≈ 3 ile kapanan tüpe tam oturur)
  const R0 = (6 * r) / N / (2 * Math.sin(Math.PI / N))
  const rl = R0 * Math.cos(Math.PI / N)
  const xm = (k0 + 0.5) * dw
  faces.push({ pts: circlePts(xm, -rl, rl), parent: 0, hinge: [[k0 * dw, 0], [(k0 + 1) * dw, 0]], angle: 90, color: lid })
  faces.push({ pts: circlePts(xm, h + rl, rl), parent: 0, hinge: [[k0 * dw, h], [(k0 + 1) * dw, h]], angle: 90, color: lid })
  return faces
}

/** Koni: ana doğru L, taban yarıçapı r. Daire dilimi N üçgene bölünür; taban N-gen (çembere çok yakın). */
export function coneFaces(r = 2, L = 4, N = 15): Face[] {
  const phi = (2 * Math.PI * r) / L // dilim açısı (radyan)
  const b0 = Math.PI / 2 - phi / 2
  const P = (k: number): P2 => [L * Math.cos(b0 + (phi * k) / N), L * Math.sin(b0 + (phi * k) / N)]
  // katlanmış düzgün N-piramidin komşu yüzleri arasındaki açı
  const c = 2 * L * Math.sin(phi / (2 * N))
  const Rb = c / (2 * Math.sin(Math.PI / N))
  const H = Math.sqrt(Math.max(1e-6, L * L - Rb * Rb))
  const A: V3 = [0, 0, H]
  const B = (k: number): V3 => [Rb * Math.cos((2 * Math.PI * k) / N), Rb * Math.sin((2 * Math.PI * k) / N), 0]
  const nrm = (k: number): V3 => {
    const u = B(k).map((v, i) => v - A[i]) as V3, v = B(k + 1).map((w, i) => w - A[i]) as V3
    const n: V3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
    const l = Math.hypot(...n)
    return n.map((x) => x / l) as V3
  }
  const n0 = nrm(0), n1 = nrm(1)
  const per = (Math.acos(Math.min(1, n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2])) * 180) / Math.PI
  const ap = Rb * Math.cos(Math.PI / N)
  const baseAng = 180 - (Math.atan2(H, ap) * 180) / Math.PI
  const k0 = Math.floor(N / 2)
  const lat = '#fcd34d', base = '#93c5fd'
  const O: P2 = [0, 0]
  const faces: Face[] = [{ pts: [O, P(k0), P(k0 + 1)], parent: -1, angle: 0, color: lat, seamless: true }]
  let prev = 0
  for (let k = k0 + 1; k < N; k++) {
    faces.push({ pts: [O, P(k), P(k + 1)], parent: prev, hinge: [O, P(k)], angle: per, color: lat, seamless: true })
    prev = faces.length - 1
  }
  prev = 0
  for (let k = k0 - 1; k >= 0; k--) {
    faces.push({ pts: [O, P(k), P(k + 1)], parent: prev, hinge: [O, P(k + 1)], angle: per, color: lat, seamless: true })
    prev = faces.length - 1
  }
  // taban: kök dilimin kirişine oturan N-gen
  const p = P(k0), q = P(k0 + 1)
  const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2
  const ml = Math.hypot(mx, my)
  const cx = mx + (mx / ml) * ap, cy = my + (my / ml) * ap
  const start = Math.atan2(p[1] - cy, p[0] - cx)
  const poly: P2[] = Array.from({ length: N }, (_, i) => [cx + Rb * Math.cos(start + (2 * Math.PI * i) / N), cy + Rb * Math.sin(start + (2 * Math.PI * i) / N)] as P2)
  faces.push({ pts: poly, parent: 0, hinge: [p, q], angle: baseAng, color: base })
  return faces
}
