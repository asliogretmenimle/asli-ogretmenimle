/**
 * Lazer Laboratuvarı — ışın izleme motoru (saf fonksiyonlar, React yok).
 * Aynalar iki yüzlü doğru parçalarıdır; yansıma r′ = r − 2(r·n)n ile tam hesaplanır.
 * Oda sınırı ve engeller ışını soğurur; hedefler (kristaller) ışını durdurur, `pass` olanlar geçirir.
 */

export interface Pt {
  x: number
  y: number
}

export interface Mirror {
  id: number
  x: number
  y: number
  /** derece, 0–179 (iki yüzlü olduğu için 180’e göre) */
  a: number
  fixed?: boolean
}

export interface Seg {
  a: Pt
  b: Pt
}

export interface Block {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface Target {
  id: string
  x: number
  y: number
  r?: number
  /** ışını geçiren sensör */
  pass?: boolean
  label?: string
}

export interface Room {
  w: number
  h: number
}

export interface World {
  room: Room
  /** sabit uzun aynalar (ör. paralel duvar aynaları) */
  walls: Seg[]
  blocks: Block[]
  targets: Target[]
}

export interface Bounce {
  p: Pt
  din: Pt
  dout: Pt
  /** aynanın doğrultusu (birim vektör) */
  m: Pt
  key: string
}

export interface Trace {
  pts: Pt[]
  bounces: Bounce[]
  hits: string[]
  end: Pt
  endKind: 'wall' | 'target' | 'block' | 'max'
  /** kullanılan (ışının çarptığı) yerleştirilmiş aynaların kimlikleri, sırayla */
  used: number[]
  length: number
}

export const MIRROR_LEN = 1.3
export const TARGET_R = 0.38
const EPS = 1e-7

export const rad = (d: number) => (d * Math.PI) / 180
export const deg = (r: number) => (r * 180) / Math.PI
export const dirOf = (d: number): Pt => ({ x: Math.cos(rad(d)), y: Math.sin(rad(d)) })
export const norm180 = (a: number) => ((Math.round(a) % 180) + 180) % 180
export const norm360 = (a: number) => ((a % 360) + 360) % 360
export const dot = (p: Pt, q: Pt) => p.x * q.x + p.y * q.y
export const len = (p: Pt) => Math.hypot(p.x, p.y)
export const dist = (p: Pt, q: Pt) => Math.hypot(p.x - q.x, p.y - q.y)

export function mirrorSeg(m: Pick<Mirror, 'x' | 'y' | 'a'>, L = MIRROR_LEN): Seg {
  const d = dirOf(m.a)
  return { a: { x: m.x - (d.x * L) / 2, y: m.y - (d.y * L) / 2 }, b: { x: m.x + (d.x * L) / 2, y: m.y + (d.y * L) / 2 } }
}

/** Işın–doğru parçası kesişimi: t (ışın parametresi) ya da null */
function raySeg(o: Pt, d: Pt, s: Seg): number | null {
  const ex = s.b.x - s.a.x, ey = s.b.y - s.a.y
  const den = d.x * ey - d.y * ex
  if (Math.abs(den) < 1e-12) return null
  const wx = s.a.x - o.x, wy = s.a.y - o.y
  const t = (wx * ey - wy * ex) / den
  const u = (wx * d.y - wy * d.x) / den
  if (t <= EPS || u < -1e-9 || u > 1 + 1e-9) return null
  return t
}

/** Işın–çember: ilk giriş t’si */
function rayCircle(o: Pt, d: Pt, c: Pt, r: number): number | null {
  const fx = o.x - c.x, fy = o.y - c.y
  const b = fx * d.x + fy * d.y
  const cc = fx * fx + fy * fy - r * r
  if (cc <= 0) return null
  const disc = b * b - cc
  if (disc < 0) return null
  const t = -b - Math.sqrt(disc)
  return t > EPS ? t : null
}

function rectSegs(b: Block): Seg[] {
  const p = [
    { x: b.x0, y: b.y0 },
    { x: b.x1, y: b.y0 },
    { x: b.x1, y: b.y1 },
    { x: b.x0, y: b.y1 },
  ]
  return [0, 1, 2, 3].map((i) => ({ a: p[i], b: p[(i + 1) % 4] }))
}

export function reflect(d: Pt, m: Pt): Pt {
  // n ⟂ m
  const n = { x: -m.y, y: m.x }
  const k = 2 * dot(d, n)
  return { x: d.x - k * n.x, y: d.y - k * n.y }
}

export function trace(world: World, mirrors: Mirror[], start: Pt, dir: Pt, maxBounce = 24): Trace {
  const L = len(dir) || 1
  let d = { x: dir.x / L, y: dir.y / L }
  let o = { ...start }
  const pts: Pt[] = [o]
  const bounces: Bounce[] = []
  const hits: string[] = []
  const used: number[] = []
  const room: Block = { x0: 0, y0: 0, x1: world.room.w, y1: world.room.h }
  const absorb: Seg[] = [...rectSegs(room), ...world.blocks.flatMap(rectSegs)]
  const mirrorList: { seg: Seg; key: string; id: number | null }[] = [
    ...world.walls.map((s, i) => ({ seg: s, key: `w${i}`, id: null })),
    ...mirrors.map((m) => ({ seg: mirrorSeg(m), key: `m${m.id}`, id: m.fixed ? null : m.id })),
  ]
  let total = 0
  for (let k = 0; k <= maxBounce; k++) {
    let best = Infinity
    let kind: 'mirror' | 'wall' | 'target' = 'wall'
    let which: { seg: Seg; key: string; id: number | null } | null = null
    let tgt: Target | null = null
    for (const s of absorb) {
      const t = raySeg(o, d, s)
      if (t !== null && t < best) {
        best = t
        kind = 'wall'
      }
    }
    for (const mm of mirrorList) {
      const t = raySeg(o, d, mm.seg)
      // eşitlikte ayna kazanır (duvar üzerindeki aynalar)
      if (t !== null && t - 1e-6 < best) {
        best = t
        kind = 'mirror'
        which = mm
      }
    }
    for (const tg of world.targets) {
      if (tg.pass) continue
      const t = rayCircle(o, d, tg, tg.r ?? TARGET_R)
      if (t !== null && t < best) {
        best = t
        kind = 'target'
        tgt = tg
      }
    }
    if (!isFinite(best)) best = 100
    const p = { x: o.x + d.x * best, y: o.y + d.y * best }
    // geçirgen sensörler
    for (const tg of world.targets) {
      if (!tg.pass || hits.includes(tg.id)) continue
      const t = Math.max(0, Math.min(best, dot({ x: tg.x - o.x, y: tg.y - o.y }, d)))
      const q = { x: o.x + d.x * t, y: o.y + d.y * t }
      if (dist(q, tg) <= (tg.r ?? TARGET_R)) hits.push(tg.id)
    }
    pts.push(p)
    total += best
    if (kind === 'target' && tgt) {
      hits.push(tgt.id)
      return { pts, bounces, hits, end: p, endKind: 'target', used, length: total }
    }
    if (kind === 'wall' || !which) {
      const inBlock = world.blocks.some((b) => p.x >= b.x0 - 1e-6 && p.x <= b.x1 + 1e-6 && p.y >= b.y0 - 1e-6 && p.y <= b.y1 + 1e-6)
      return { pts, bounces, hits, end: p, endKind: inBlock ? 'block' : 'wall', used, length: total }
    }
    const m0 = { x: which.seg.b.x - which.seg.a.x, y: which.seg.b.y - which.seg.a.y }
    const ml = len(m0)
    const m = { x: m0.x / ml, y: m0.y / ml }
    const nd = reflect(d, m)
    bounces.push({ p, din: d, dout: nd, m, key: which.key })
    if (which.id !== null && !used.includes(which.id)) used.push(which.id)
    d = nd
    o = p
  }
  const last = pts[pts.length - 1]
  return { pts, bounces, hits, end: last, endKind: 'max', used, length: total }
}

/** Gelen ışın (geri doğrultu) ile ayna arasındaki dar açı ve diğer açılar */
export function bounceAngles(b: Bounce) {
  const u = { x: -b.din.x, y: -b.din.y }
  const v = b.dout
  const angTo = (p: Pt, q: Pt) => deg(Math.acos(Math.max(-1, Math.min(1, dot(p, q)))))
  const inMirror = Math.min(angTo(u, b.m), angTo(u, { x: -b.m.x, y: -b.m.y }))
  const between = angTo(u, v)
  return { mirror: Math.round(inMirror * 10) / 10, normal: Math.round((90 - inMirror) * 10) / 10, between: Math.round(between * 10) / 10 }
}

/** Kanonik çözüm anahtarı: yalnız ışının kullandığı aynalar, sırayla, konum ve açıyla */
export function solutionKey(mirrors: Mirror[], tr: Trace, aimKey: string) {
  const parts = tr.used.map((id) => {
    const m = mirrors.find((x) => x.id === id)!
    return `${m.x},${m.y},${norm180(m.a)}`
  })
  return `${aimKey}|${parts.join(';')}`
}

/* ───────────── çözücü (seviye tasarımını doğrulamak ve “en az ayna” için) ───────────── */

export interface SolveSpec {
  world: World
  fixed: Mirror[]
  start: Pt
  dirs: Pt[]
  maxMirrors: number
  angleStep: number
  /** yerleştirilemeyen noktalar */
  blocked: Pt[]
  need: string[]
  /** ızgara içinde yerleştirme sınırları */
  area?: { x0: number; y0: number; x1: number; y1: number }
}

export function solve(spec: SolveSpec, limit = 4000) {
  const { world, start, need } = spec
  const area = spec.area ?? { x0: 1, y0: 1, x1: world.room.w - 1, y1: world.room.h - 1 }
  const spots: Pt[] = []
  for (let x = area.x0; x <= area.x1; x++)
    for (let y = area.y0; y <= area.y1; y++) {
      if (spec.blocked.some((b) => b.x === x && b.y === y)) continue
      if (world.blocks.some((b) => x >= b.x0 - 0.2 && x <= b.x1 + 0.2 && y >= b.y0 - 0.2 && y <= b.y1 + 0.2)) continue
      if (world.targets.some((t) => dist(t, { x, y }) < 0.9)) continue
      spots.push({ x, y })
    }
  const angles: number[] = []
  for (let a = 0; a < 180; a += spec.angleStep) angles.push(a)
  const found = new Map<string, number>()
  const ok = (tr: Trace) => need.every((id) => tr.hits.includes(id))
  const rec = (placed: Mirror[], dirIdx: number, depth: number) => {
    if (found.size >= limit) return
    const tr = trace(world, [...spec.fixed, ...placed], start, spec.dirs[dirIdx])
    if (tr.used.length === placed.length && ok(tr)) {
      const key = solutionKey(placed, tr, String(dirIdx))
      if (!found.has(key)) found.set(key, placed.length)
      return
    }
    if (depth >= spec.maxMirrors) return
    for (const s of spots) {
      if (placed.some((p) => p.x === s.x && p.y === s.y)) continue
      for (const a of angles) {
        const m: Mirror = { id: 100 + depth, x: s.x, y: s.y, a }
        // yeni ayna mevcut ışın yolunda olmalı (ışın ona çarpmalı)
        const tr2 = trace(world, [...spec.fixed, ...placed, m], start, spec.dirs[dirIdx])
        if (!tr2.used.includes(m.id)) continue
        if (tr2.used.length !== placed.length + 1) continue
        rec([...placed, m], dirIdx, depth + 1)
      }
    }
  }
  spec.dirs.forEach((_, i) => rec([], i, 0))
  const byCount = new Map<number, number>()
  found.forEach((c) => byCount.set(c, (byCount.get(c) ?? 0) + 1))
  const min = found.size ? Math.min(...found.values()) : -1
  return { total: found.size, min, byCount: Object.fromEntries(byCount), keys: [...found.keys()] }
}

/* ───────────── biçimlendirme ───────────── */

export const fmtN = (v: number, d = 2) => {
  const r = Math.round(v * 10 ** d) / 10 ** d
  return (Object.is(r, -0) ? 0 : r).toLocaleString('tr-TR', { maximumFractionDigits: d }).replace('-', '−')
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))

/** Ondalık eğimi küçük paydalı kesre çevir (yaklaşık), metin olarak */
export function slopeFrac(dx: number, dy: number): { text: string; svg: string; m: number | null } {
  if (Math.abs(dx) < 1e-9) return { text: 'tanımsız', svg: '∞', m: null }
  const m = dy / dx
  for (let q = 1; q <= 12; q++) {
    const p = Math.round(m * q)
    if (Math.abs(p / q - m) < 1e-6) {
      const g = gcd(p, q) || 1
      const P = p / g, Q = q / g
      const sign = P < 0 ? '−' : ''
      if (Q === 1) return { text: `${sign}${Math.abs(P)}`, svg: `${sign}${Math.abs(P)}`, m }
      return { text: `${sign}[[${Math.abs(P)}/${Q}]]`, svg: `${sign}${Math.abs(P)}/${Q}`, m }
    }
  }
  return { text: fmtN(m), svg: fmtN(m), m }
}

/** y = mx + b yazımı (segment doğrultusu ve üzerindeki bir noktadan) */
export function lineEq(p: Pt, d: Pt, html = false): string {
  const s = slopeFrac(d.x, d.y)
  if (s.m === null) return `x = ${fmtN(p.x)}`
  const b = p.y - s.m * p.x
  const mTxt = Math.abs(s.m) < 1e-9 ? '' : Math.abs(s.m - 1) < 1e-9 ? 'x' : Math.abs(s.m + 1) < 1e-9 ? '−x' : `${html ? s.text : s.svg}x`
  const bTxt = Math.abs(b) < 1e-9 ? '' : b > 0 ? ` + ${fmtN(b)}` : ` − ${fmtN(-b)}`
  if (!mTxt) return `y = ${fmtN(b)}`
  return `y = ${mTxt}${bTxt}`
}
