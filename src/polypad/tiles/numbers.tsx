import type { ReactElement } from 'react'
import type { ActionSpec, PadApi, Pt, Tile, TileDef } from '../types'
import { UNIT, boundsOf, fmt, pathOf, rotate, round, textOn, toLocal, toWorld } from '../geom'
import { bringToFront, getState, makeTile, sendToBack } from '../store'
import { C, FONT, Label, edge, rectBox } from './kit'

/*
 * Sayı parçaları. Boyutlar, renkler ve eylemler Polypad'deki karşılıklarıyla aynı oranlardadır:
 * Polypad'in 25 px'lik birimi burada UNIT'e (32 px) karşılık gelir; K bu ölçek çarpanıdır.
 */
const K = UNIT / 25

const rectOutline = (w: number, h: number): Pt[] => [
  { x: -w / 2, y: -h / 2 },
  { x: w / 2, y: -h / 2 },
  { x: w / 2, y: h / 2 },
  { x: -w / 2, y: h / 2 },
]

/** Sol ucu sabit tutarak genişliği değişen yatay parçanın yeni merkezi */
const keepLeft = (t: Tile, oldW: number, newW: number) => toWorld(t, { x: (newW - oldW) / 2, y: 0 })

/** Rengi başka bir renge doğru karıştırır: amt = rengin kendi payı (Polypad mix(c, x, .7)) */
function mix(hex: string, other: string, amt: number) {
  const p = (h: string) => {
    const m = /^#?([0-9a-f]{6})/i.exec(h)
    const n = m ? parseInt(m[1], 16) : 0
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const a = p(hex)
  const b = p(other)
  return `rgb(${a.map((v, i) => Math.round(v * amt + b[i] * (1 - amt))).join(',')})`
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/** Seçili parçaların dünya koordinatındaki dış sınırı (çokgen sınırından) */
function worldBounds(ts: Tile[], outline: (t: Tile) => Pt[]) {
  return boundsOf(ts.flatMap((t) => outline(t).map((p) => toWorld(t, p))))
}

/** Seçimin ortası (Polypad selection.center) */
const centerOf = (ts: Tile[]) => {
  const xs = ts.map((t) => t.x)
  const ys = ts.map((t) => t.y)
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
}

const allTiles = () => getState().tiles

/** Üst üste bırakınca birleştirme açık mı (Ayarlar › Parça birleştirme) */
const merging = () => getState().settings.merge

// Polypad renkleri (S.yellow Polypad'de turuncudur)
const P = {
  yellow: '#fd8c00',
  red: '#cd0e66',
  orange: '#eb4726',
  lime: '#bfc212',
  green: '#22ab24',
  teal: '#009ea6',
  blue: '#0f82f2',
  purple: '#6d3bbf',
  grey: '#cccccc',
  mediumGrey: '#777777',
  dark: '#242436',
}

/** Onluk taban renkleri (Polypad hi) */
const HI: Record<number, string> = { 1: P.yellow, 10: P.blue, 100: P.green, 1000: P.purple }

/** Sayı kartı rengi değere göre (Polypad Fp) */
const valueColor = (v: number) =>
  v === 0 ? P.grey : v < 0 ? P.red : Number.isInteger(v) ? (v < 10 ? HI[1] : v < 100 ? HI[10] : v < 1000 ? HI[100] : HI[1000]) : P.teal

/** Sayı çubukları 1–10 renkleri (Polypad ru) */
const BAR = [P.yellow, '#f15e19', '#e1343b', P.red, '#8d2ca1', '#4e53d0', P.blue, P.teal, P.green, P.lime]
const barDefault = (v: number) => BAR[(((Math.round(v) - 1) % 10) + 10) % 10]

// ---------------------------------------------------------------------------
// Sayı karoları (1, 10, 100…): genişlik × satır, son satır eksik olabilir
// ---------------------------------------------------------------------------

const LABEL_H = 20 * K

function tileGeom(t: Tile) {
  const v = Math.max(1, Math.round(Math.abs(t.p.value ?? 1)))
  const w = Math.max(1, Math.min(v, Math.round(t.p.width ?? 1)))
  const rows = Math.ceil(v / w)
  const W = w * UNIT
  const H = rows * UNIT
  return { v, w, rows, W, H, full: Math.floor(v / w), rem: v % w }
}

const tileLabelShown = (t: Tile) => Math.abs(t.p.value ?? 1) >= 5 && t.p.labels !== 'hidden'

function tileOutline(t: Tile): Pt[] {
  const { w, full, rem, W, H } = tileGeom(t)
  const u = (x: number, y: number) => ({ x: x * UNIT - W / 2, y: y * UNIT - H / 2 })
  if (!rem) return [u(0, 0), u(w, 0), u(w, full), u(0, full)]
  return [u(0, 0), u(w, 0), u(w, full), u(rem, full), u(rem, full + 1), u(0, full + 1)]
}

/** Hücre i'nin yerel merkezi */
const tileCell = (t: Tile, i: number) => {
  const { w, W, H } = tileGeom(t)
  return { x: -W / 2 + ((i % w) + 0.5) * UNIT, y: -H / 2 + (Math.floor(i / w) + 0.5) * UNIT }
}

/** Karonun işaretli değeri */
const tileVal = (t: Tile) => Math.round(t.p.value ?? 1)

/** Karo rengi: negatifler kırmızı (Polypad Fp), pozitifler önceki rengini ya da basamak rengini alır */
function tileColorFor(v: number, prev?: string) {
  if (v < 0) return P.red
  if (prev && prev !== P.red) return prev
  const a = Math.abs(v)
  return a >= 100 ? HI[100] : a >= 10 ? HI[10] : HI[1]
}

/** Değeri değişen karo: sol üst köşesi yerinde kalır; tek sıra karolar 10'a kadar yatay uzar */
function retileValue(t: Tile, v: number): Partial<Tile> {
  const g = tileGeom(t)
  const a = Math.abs(v)
  const w = Math.max(1, Math.min(a, g.w === 1 ? 10 : g.w))
  const corner = toWorld(t, { x: -g.W / 2, y: -g.H / 2 })
  const c = rotate({ x: (w * UNIT) / 2, y: (Math.ceil(a / w) * UNIT) / 2 }, t.rot)
  return { x: corner.x + c.x, y: corner.y + c.y, color: tileColorFor(v, t.color), p: { ...t.p, value: v, width: w } }
}

const numberTile: TileDef = {
  type: 'number-tile',
  name: (t) => `${tileVal(t)} sayı karosu`,
  create: (p) => ({ color: HI[p.value ?? 1] ?? HI[1], p: { width: p.width ?? 1, value: p.value ?? 1 } }),
  bounds: (t) => {
    const { W, H } = tileGeom(t)
    return { x: -W / 2, y: -H / 2, w: W, h: H + (tileLabelShown(t) ? LABEL_H + 4 : 0) }
  },
  outline: tileOutline,
  render: (t) => {
    const { v, w, rows, W, H, full, rem } = tileGeom(t)
    const neg = (t.p.value ?? 1) < 0
    const color = t.color ?? (neg ? P.red : HI[1])
    let grid = ''
    for (let i = 1; i < w; i++) grid += `M${round(-W / 2 + i * UNIT)} ${-H / 2}v${(rem && i > rem ? full : rows) * UNIT}`
    for (let j = 1; j < rows; j++) grid += `M${-W / 2} ${round(-H / 2 + j * UNIT)}h${W}`
    const s = Math.floor(v / w)
    const label = `${neg ? '−' : ''}${w} × ${s}`
    const lw = (label.length + (rem ? String(rem).length + 3 : 0)) * 8 * K + 12
    return (
      <>
        <path d={pathOf(tileOutline(t))} fill={color} stroke="rgba(255,255,255,.85)" strokeWidth={1} strokeLinejoin="round" />
        {grid && <path d={grid} stroke="rgba(255,255,255,.85)" strokeWidth={1} />}
        {tileLabelShown(t) && (
          <g transform={`translate(${-W / 2} ${H / 2 + 4})`} style={{ pointerEvents: 'none' }}>
            <rect width={lw} height={LABEL_H} rx={5} fill="#ffffff" stroke="#b9bccb" />
            <text x={6} y={LABEL_H / 2} fontSize={13 * K} fontWeight={700} fontFamily={FONT} fill="#242436" dominantBaseline="central">
              {label}
              {rem ? <tspan fillOpacity={0.6}>{` + ${rem}`}</tspan> : null}
            </text>
          </g>
        )}
      </>
    )
  },
  // Genişlik tutamağı: sol üst köşe sabit kalır
  handles: (t) => {
    if (Math.abs(t.p.value ?? 1) <= 1) return []
    const { W, H } = tileGeom(t)
    return [{ id: 'w', x: W / 2, y: -H / 2 }]
  },
  onHandle: (t, _id, l) => {
    const g = tileGeom(t)
    const w = Math.max(1, Math.min(g.v, Math.round((l.x + g.W / 2) / UNIT)))
    if (w === g.w) return
    const corner = toWorld(t, { x: -g.W / 2, y: -g.H / 2 })
    const W = w * UNIT
    const H = Math.ceil(g.v / w) * UNIT
    const c = rotate({ x: W / 2, y: H / 2 }, t.rot)
    return { x: corner.x + c.x, y: corner.y + c.y, p: { ...t.p, width: w } }
  },
  colorable: true,
  gridSnap: true,
  // Üst üste bırakılan karolar toplanır; zıt işaretliler birbirini götürür
  dropHint: (t, dropped) => {
    const ds = dropped.filter((d) => d.type === 'number-tile')
    if (!ds.length || !merging()) return null
    const total = tileVal(t) + sum(ds.map(tileVal))
    if (total === 0) return '0'
    return ds.some((d) => Math.sign(tileVal(d)) !== Math.sign(tileVal(t))) ? '−' : '+'
  },
  onDrop: (t, dropped, api) => {
    const ds = dropped.filter((d) => d.type === 'number-tile')
    if (!ds.length || !merging()) return
    const total = tileVal(t) + sum(ds.map(tileVal))
    api.remove(ds.map((d) => d.id))
    if (total === 0) {
      api.remove([t.id])
      api.sound('pop')
      return
    }
    api.update(t.id, retileValue(t, total), true)
    api.select([t.id])
    api.sound('snap')
  },
}

function splitNumberTile(t: Tile): Omit<Tile, 'id'>[] {
  const { v, w, rows, W, H, rem } = tileGeom(t)
  if (v === 1) return [t]
  const out: Omit<Tile, 'id'>[] = []
  if (rows === 1) {
    for (let i = 0; i < v; i++) {
      const c = toWorld(t, tileCell(t, i))
      out.push({ type: 'number-tile', x: c.x, y: c.y, rot: t.rot, color: t.color, p: { ...t.p, value: Math.sign(tileVal(t)) || 1, width: 1 } })
    }
  } else {
    for (let r = 0; r < rows; r++) {
      const a = r < rows - 1 ? w : rem || w
      const c = toWorld(t, { x: -W / 2 + (a * UNIT) / 2, y: -H / 2 + (r + 0.5) * UNIT })
      out.push({ type: 'number-tile', x: c.x, y: c.y, rot: t.rot, color: t.color, p: { ...t.p, value: (Math.sign(tileVal(t)) || 1) * a, width: a } })
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Sayı küpleri (izometrik onluk taban blokları)
// ---------------------------------------------------------------------------

const CU = UNIT
const CS = (CU * Math.sqrt(3)) / 2
type V3 = [number, number, number]
const cubeDims = (t: Tile): V3 => [t.p.vx ?? 1, t.p.vy ?? 1, t.p.vz ?? 1]
const cubeValue = (t: Tile) => cubeDims(t).reduce((a, b) => a * b, 1)
const cubeColor = (v: number) => HI[v] ?? P.teal

/**
 * vx sağa-yukarı, vy sola-yukarı, vz aşağı uzanır. Ham koordinatta başlangıç noktası ön dikey kenarın üst ucudur;
 * parçanın yerel merkezi sınır kutusunun ortasıdır (o).
 */
const cubeCache = new Map<string, ReturnType<typeof buildCube>>()
function buildCube(vx: number, vy: number, vz: number) {
  const n = CU
  const s = CS
  const L = { x: -s * vy, y: (-n * vy) / 2 }
  const R = { x: s * vx, y: (-n * vx) / 2 }
  const T = { x: R.x + L.x, y: R.y + L.y }
  const Hh = { x: 0, y: vz * n }
  const o = { x: (L.x + R.x) / 2, y: (T.y + Hh.y) / 2 }
  const sh = (p: Pt) => ({ x: round(p.x - o.x), y: round(p.y - o.y) })
  const O = sh({ x: 0, y: 0 })
  const LB = sh({ x: L.x, y: L.y + vz * n })
  const RB = sh({ x: R.x, y: R.y + vz * n })
  const left = [O, sh(Hh), LB, sh(L)]
  const right = [O, sh(Hh), RB, sh(R)]
  const top = [O, sh(R), sh(T), sh(L)]
  const outline = [sh(T), sh(R), RB, sh(Hh), LB, sh(L)]
  let grid = ''
  const seg = (a: Pt, b: Pt) => {
    const p = sh(a)
    const q = sh(b)
    grid += `M${p.x} ${p.y}L${q.x} ${q.y}`
  }
  for (const [w, v, g] of [
    [1, vx, vy],
    [-1, vy, vx],
  ] as const) {
    for (let k = 1; k < vz; k++) seg({ x: 0, y: (vz - k) * n }, { x: w * s * v, y: n * (vz - v / 2 - k) })
    for (let k = 1; k < v; k++) {
      seg({ x: w * s * k, y: n * (vz - k / 2) }, { x: w * s * k, y: (-n * k) / 2 })
      seg({ x: w * s * k, y: (-n * k) / 2 }, { x: w * s * (k - g), y: (-n / 2) * (k + g) })
    }
  }
  const b = boundsOf(outline)
  return { left, right, top, outline, grid, o, w: b.w, h: b.h }
}
function cubeShape(d: V3) {
  const key = d.join('x')
  let c = cubeCache.get(key)
  if (!c) {
    c = buildCube(...d)
    cubeCache.set(key, c)
  }
  return c
}

const numberCube: TileDef = {
  type: 'number-cube',
  name: (t) => {
    const d = cubeDims(t)
    return d.every((x) => x === 1) ? '1 sayı küpü' : `${d.join('×')} sayı küpü`
  },
  create: (p) => {
    const d: V3 = [p.vx ?? 1, p.vy ?? 1, p.vz ?? 1]
    return { color: cubeColor(d[0] * d[1] * d[2]), p: { vx: d[0], vy: d[1], vz: d[2] } }
  },
  bounds: (t) => {
    const c = cubeShape(cubeDims(t))
    return rectBox(c.w, c.h)
  },
  outline: (t) => cubeShape(cubeDims(t)).outline,
  render: (t) => {
    const c = cubeShape(cubeDims(t))
    const color = t.color ?? cubeColor(cubeValue(t))
    // Polypad: yüzler arasında ve birim küpler arasında beyaz ince çizgi, koyu dış kenar yok
    const line = 'rgba(255,255,255,.85)'
    return (
      <g strokeLinejoin="round">
        <path d={pathOf(c.left)} fill={mix(color, '#000000', 0.7)} stroke={line} strokeWidth={1} style={{ transition: 'fill .3s' }} />
        <path d={pathOf(c.right)} fill={color} stroke={line} strokeWidth={1} style={{ transition: 'fill .3s' }} />
        <path d={pathOf(c.top)} fill={mix(color, '#ffffff', 0.7)} stroke={line} strokeWidth={1} style={{ transition: 'fill .3s' }} />
        {c.grid && <path d={c.grid} stroke={line} strokeWidth={1} fill="none" />}
      </g>
    )
  },
  rotatable: false,
  colorable: true,
  // Üst üste bırakılan küpler toplanır: en büyük basamaklara yeniden gruplanır
  dropHint: (_t, dropped) => (merging() && dropped.some((d) => d.type === 'number-cube') ? '+' : null),
  onDrop: (t, dropped, api) => {
    const cs = dropped.filter((d) => d.type === 'number-cube')
    if (!cs.length || !merging()) return
    const all = [t, ...cs]
    const dims = regroupCubes(all) ?? all.map(cubeDims)
    const pos = organizeCubes(dims, { x: t.x, y: t.y })
    replace(
      api,
      all,
      dims.map((d, i) => ({ type: 'number-cube', x: pos[i].x, y: pos[i].y, rot: 0, color: cubeColor(d[0] * d[1] * d[2]), p: { vx: d[0], vy: d[1], vz: d[2] } })),
      'snap',
    )
  },
}

/** Bölme yönü (Polypad): vx>1 ve vy=1 → vx; vy=1 → vz; yoksa vy */
const splitAxis = (d: V3): 0 | 1 | 2 => (d[0] > 1 && d[1] === 1 ? 0 : d[1] === 1 ? 2 : 1)

/** gap=2: Polypad'deki son yerleşim (1 birim boşluk); gap=1: parçalar küpün içindeki yerlerinde */
function splitCube(t: Tile, gap = 2): Omit<Tile, 'id'>[] {
  const d = cubeDims(t)
  const axis = splitAxis(d)
  const k = d[axis]
  if (k <= 1) return [t]
  const pd: V3 = [...d] as V3
  pd[axis] = 1
  const big = cubeShape(d)
  const piece = cubeShape(pd)
  const color = cubeColor(pd[0] * pd[1] * pd[2])
  // Ham başlangıç noktasının (ön üst köşe) dünya konumu
  const O = { x: t.x - big.o.x, y: t.y - big.o.y }
  const out: Omit<Tile, 'id'>[] = []
  for (let a = 0; a < k; a++) {
    let org: Pt
    if (axis === 2) org = { x: O.x, y: O.y + (d[2] - 1) * CU - gap * CU * a }
    else if (axis === 0) {
      // Arkadakiler önce oluşturulsun ki öndekiler üstte çizilsin
      const aa = k - 1 - a
      org = { x: O.x + gap * CS * aa, y: O.y - (gap / 2) * CU * aa }
    } else org = { x: O.x + CS * (1 - d[1]) + gap * CS * a, y: O.y + (CU * (1 - d[1])) / 2 + (gap / 2) * CU * a }
    out.push({ type: 'number-cube', x: round(org.x + piece.o.x), y: round(org.y + piece.o.y), rot: 0, color, p: { vx: pd[0], vy: pd[1], vz: pd[2] } })
  }
  return out
}

const CUBE_UNITS: [number, V3][] = [
  [1000, [10, 10, 10]],
  [100, [10, 1, 10]],
  [10, [1, 1, 10]],
  [1, [1, 1, 1]],
]

/** Küpleri en büyük basamaklara yeniden gruplar; gruplama değişmiyorsa null (Polypad H_) */
function regroupCubes(ts: Tile[]): V3[] | null {
  const vals = ts.map(cubeValue).sort((a, b) => b - a)
  let total = sum(vals)
  const out: number[] = []
  for (const [u] of CUBE_UNITS)
    while (total >= u) {
      total -= u
      out.push(u)
    }
  if (out.join(',') === vals.join(',')) return null
  return out.map((u) => CUBE_UNITS.find(([v]) => v === u)![1])
}

/** Küpleri türlerine göre gruplayıp yan yana dizer; dönen konumlar merkezlenir */
function organizeCubes(dims: V3[], center: Pt): Pt[] {
  const groups = new Map<string, number[]>()
  dims.forEach((d, i) => {
    const k = d.join('x')
    groups.set(k, [...(groups.get(k) ?? []), i])
  })
  const order = [...groups.entries()].sort((a, b) => {
    const va = dims[a[1][0]].reduce((x, y) => x * y, 1)
    const vb = dims[b[1][0]].reduce((x, y) => x * y, 1)
    return vb - va
  })
  const pos: Pt[] = Array(dims.length)
  let x = 0
  let maxH = 0
  const gap = CU * 0.6
  for (const [, idx] of order) {
    const sh = cubeShape(dims[idx[0]])
    const per = idx.length > 25 ? 10 : 5
    const cols = Math.ceil(idx.length / per)
    idx.forEach((i, k) => {
      const col = Math.floor(k / per)
      const row = k % per
      pos[i] = { x: x + col * (sh.w + gap) + sh.w / 2, y: row * (sh.h + gap) + sh.h / 2 }
    })
    x += cols * (sh.w + gap) + gap
    maxH = Math.max(maxH, Math.min(idx.length, per) * (sh.h + gap))
  }
  const w = x - 2 * gap
  return pos.map((p) => ({ x: round(center.x + p.x - w / 2), y: round(center.y + p.y - maxH / 2) }))
}

// ---------------------------------------------------------------------------
// Takılan küpler (Polypad görünümü: ön yüz, üst yüz, düğmeler)
// ---------------------------------------------------------------------------

const SI = 50 * K // küp ön yüzü
const SU = 25 * K // derinlik
const SD = SI + SU

function cubeColors(t: Tile): string[] {
  const cs = String(t.p.colors ?? P.green).split(',').filter(Boolean)
  const n = Math.max(1, t.p.value ?? cs.length)
  const arr = Array.from({ length: n }, (_, i) => cs[i] ?? cs[0])
  return t.color ? arr.map(() => t.color!) : arr
}
const snapW = (n: number) => n * SI + SU

function snapOutline(n: number): Pt[] {
  const W = snapW(n)
  const pts = [
    [SU, 0],
    [SD + SI * (n - 1), 0],
    [SD + SI * (n - 1), SI],
    [SI * n, SD],
    [0, SD],
    [0, SU],
  ]
  return pts.map(([x, y]) => ({ x: x - W / 2, y: y - SD / 2 }))
}

const snapCube: TileDef = {
  type: 'snap-cube',
  name: (t) => `${cubeColors(t).length} takılan küp`,
  create: (p) => {
    const cs = String(p.colors ?? P.green).split(',')
    const n = Math.max(1, p.value ?? cs.length)
    return { p: { value: n, colors: Array.from({ length: n }, (_, i) => cs[i] ?? cs[0]).join(',') } }
  },
  bounds: (t) => rectBox(snapW(cubeColors(t).length), SD),
  outline: (t) => snapOutline(cubeColors(t).length),
  render: (t) => {
    const cs = cubeColors(t)
    const n = cs.length
    const ox = -snapW(n) / 2
    const oy = -SD / 2
    const last = cs[n - 1]
    return (
      <g transform={`translate(${round(ox)} ${round(oy)})`} strokeLinejoin="round">
        {cs.map((c, i) => {
          const x = i * SI
          const st = edge(c)
          return (
            <g key={i}>
              <path d={`M${x} ${SU}h${SI}l${SU} ${-SU}h${-SI}Z`} fill={mix(c, '#ffffff', 0.7)} stroke={st} strokeWidth={1.2} />
              <rect x={x} y={SU} width={SI} height={SI} fill={c} stroke={st} strokeWidth={1.2} />
              <circle cx={x + SI / 2} cy={SU + SI / 2} r={11 * K} fill={mix(c, '#000000', 0.7)} />
              <ellipse cx={x + SI * 0.75} cy={SU / 2} rx={10 * K} ry={5 * K} fill={mix(c, '#000000', 0.7)} transform={`rotate(-14 ${x + SI * 0.75} ${SU / 2})`} />
            </g>
          )
        })}
        <path d={`M${n * SI} ${SU}v${SI}l${SU} ${-SU}v${-SI}Z`} fill={last} stroke={edge(last)} strokeWidth={1.2} />
        <ellipse cx={n * SI + SU / 2} cy={SU + SI / 2 - SU / 2} rx={5 * K} ry={10 * K} fill={mix(last, '#000000', 0.7)} transform={`rotate(14 ${n * SI + SU / 2} ${SI / 2})`} />
      </g>
    )
  },
  // Seçiliyken dokunulan küpün rengi değişir
  onTap: (t, api, info) => {
    const cs = cubeColors(t)
    const i = Math.floor((info.local.x + snapW(cs.length) / 2) / SI)
    if (i < 0 || i >= cs.length) return
    const SNAP_COLORS = [P.yellow, P.blue, P.green, P.orange, P.lime, P.purple, P.red, P.teal, '#eeeeee', P.mediumGrey]
    cs[i] = SNAP_COLORS[(SNAP_COLORS.indexOf(cs[i]) + 1) % SNAP_COLORS.length]
    api.update(t.id, { color: undefined, p: { ...t.p, colors: cs.join(','), value: cs.length } }, true)
  },
  dropHint: (_t, dropped) => (merging() && dropped.some((d) => d.type === 'snap-cube') ? '+' : null),
  // Üzerine bırakılan küpler, bırakıldığı yana eklenir
  onDrop: (t, dropped, api) => {
    const cubes = dropped.filter((d) => d.type === 'snap-cube')
    if (!cubes.length || !getState().settings.merge) return
    let cs = cubeColors(t)
    const n0 = cs.length
    let before = 0
    for (const d of cubes) {
      const add = cubeColors(d)
      if (toLocal(t, d).x < 0) {
        cs = [...add, ...cs]
        before += add.length
      } else cs = [...cs, ...add]
    }
    // Hedefin küpleri yerinde kalsın
    const W0 = snapW(n0)
    const W = snapW(cs.length)
    const c = toWorld(t, { x: W / 2 - W0 / 2 - before * SI, y: 0 })
    api.remove(cubes.map((d) => d.id))
    api.update(t.id, { x: c.x, y: c.y, color: undefined, p: { ...t.p, colors: cs.join(','), value: cs.length } }, true)
    api.select([t.id])
    api.sound('snap')
  },
}

const snapTile = (cs: string[], x: number, y: number, rot: number): Omit<Tile, 'id'> => ({ type: 'snap-cube', x: round(x), y: round(y), rot, p: { value: cs.length, colors: cs.join(',') } })

// ---------------------------------------------------------------------------
// Sayı çubukları
// ---------------------------------------------------------------------------

const factorsOf = (v: number) => {
  const n = Math.max(1, Math.round(v))
  const out: number[] = []
  for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i)
  return out
}
/** Çubuğun kaç parçaya bölündüğü */
const barParts = (t: Tile) => {
  const f = factorsOf(t.p.value ?? 1)
  return f[Math.min(f.length - 1, Math.max(0, t.p.denominator ?? 0))]
}

const numberBar: TileDef = {
  type: 'number-bar',
  name: (t) => `${t.p.value} sayı çubuğu`,
  create: (p) => ({ color: p.adjustable ? P.teal : barDefault(p.value ?? 1), p: { value: p.value ?? 1, denominator: 0, adjustable: !!p.adjustable } }),
  bounds: (t) => rectBox(t.p.value * UNIT, UNIT),
  outline: (t) => rectOutline(t.p.value * UNIT, UNIT),
  render: (t) => {
    const v = t.p.value
    const w = v * UNIT
    const color = t.color ?? barDefault(v)
    const k = barParts(t)
    const size = v / k
    let div = ''
    for (let i = 1; i < k; i++) div += `M${round(-w / 2 + i * size * UNIT)} ${-UNIT / 2}v${UNIT}`
    return (
      <>
        <rect x={-w / 2} y={-UNIT / 2} width={w} height={UNIT} fill={color} stroke={edge(color)} strokeWidth={1.5} />
        {div && <path d={div} stroke={edge(color)} strokeOpacity={0.6} strokeWidth={1.5} />}
        {t.p.labels !== 'hidden' &&
          Array.from({ length: k }, (_, i) => (
            <Label key={i} x={-w / 2 + (i + 0.5) * size * UNIT} size={15} color={textOn(color)} transform={t.rot ? `rotate(${-t.rot} ${-w / 2 + (i + 0.5) * size * UNIT} 0)` : undefined}>
              {fmt(size)}
            </Label>
          ))}
      </>
    )
  },
  handles: (t) => (t.p.adjustable ? [{ id: 'len', x: (t.p.value * UNIT) / 2, y: 0 }] : []),
  onHandle: (t, _id, l) => {
    const oldW = t.p.value * UNIT
    const value = Math.max(1, Math.min(100, Math.round((l.x + oldW / 2) / UNIT)))
    const c = keepLeft(t, oldW, value * UNIT)
    return { x: c.x, y: c.y, p: { ...t.p, value, denominator: 0 } }
  },
  colorable: true,
  gridSnap: true,
  // Üst üste bırakılan çubuklar uç uca eklenir (toplam uzunlukta tek çubuk)
  dropHint: (t, dropped) => {
    const bs = dropped.filter((d) => d.type === 'number-bar')
    if (!bs.length || !merging()) return null
    return t.p.value + sum(bs.map((b) => b.p.value)) <= 100 ? '+' : null
  },
  onDrop: (t, dropped, api) => {
    const bs = dropped.filter((d) => d.type === 'number-bar')
    if (!bs.length || !merging()) return
    const total = t.p.value + sum(bs.map((b) => b.p.value))
    if (total > 100) return
    const adjustable = total > 10 || [t, ...bs].some((b) => b.p.adjustable)
    const c = keepLeft(t, t.p.value * UNIT, total * UNIT)
    api.remove(bs.map((b) => b.id))
    api.update(t.id, { x: c.x, y: c.y, color: adjustable ? P.teal : barDefault(total), p: { ...t.p, value: total, denominator: 0, adjustable } }, true)
    api.select([t.id])
    api.sound('snap')
  },
}

// ---------------------------------------------------------------------------
// Onluk çerçeve (satır × sütun) ve sayma pulları
// ---------------------------------------------------------------------------

const CELL = 50 * K
const COUNTER_R = 20 * K
const COUNTER_POS = P.yellow
const COUNTER_NEG = P.red

function frameLayout(t: Tile) {
  const rows = Math.max(1, Math.min(25, t.p.rows ?? 2))
  const cols = Math.max(1, Math.min(25, t.p.cols ?? 5))
  const w = cols * CELL
  const h = rows * CELL
  const cells: Pt[] = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ x: -w / 2 + (c + 0.5) * CELL, y: -h / 2 + (r + 0.5) * CELL })
  return { rows, cols, w, h, cells }
}

const inCell = (c: Pt, l: Pt) => Math.abs(c.x - l.x) < CELL / 2 && Math.abs(c.y - l.y) < CELL / 2

/** Çerçevenin hücrelerindeki pulların toplamı */
function counted(t: Tile, tiles: Tile[] | undefined) {
  if (!tiles) return 0
  const { cells } = frameLayout(t)
  let total = 0
  for (const o of tiles) {
    if (o.type !== 'ten-frame-counter') continue
    const l = toLocal(t, o)
    if (cells.some((c) => inCell(c, l))) total += o.p.value ?? 1
  }
  return total
}

function snapCounters(t: Tile, dropped: Tile[], api: PadApi) {
  const counters = dropped.filter((d) => d.type === 'ten-frame-counter')
  if (!counters.length) return
  const { cells } = frameLayout(t)
  const ids = new Set(counters.map((c) => c.id))
  const used = new Set<number>()
  for (const o of api.all()) {
    if (o.type !== 'ten-frame-counter' || ids.has(o.id)) continue
    const l = toLocal(t, o)
    cells.forEach((c, i) => inCell(c, l) && used.add(i))
  }
  let moved = false
  for (const ctr of counters) {
    const l = toLocal(t, ctr)
    let best = -1
    let bd = Infinity
    cells.forEach((c, i) => {
      if (used.has(i)) return
      const d = Math.hypot(c.x - l.x, c.y - l.y)
      if (d < bd) {
        bd = d
        best = i
      }
    })
    if (best < 0) break
    used.add(best)
    const w = toWorld(t, cells[best])
    api.update(ctr.id, { x: w.x, y: w.y })
    moved = true
  }
  if (moved) {
    api.commit()
    api.sound('snap')
  }
}

/** Boş hücrelere pul koyar (Polypad "Doldur") */
function fillFrame(t: Tile): Omit<Tile, 'id'>[] {
  const { cells } = frameLayout(t)
  const ctrs = allTiles()
    .filter((o) => o.type === 'ten-frame-counter')
    .map((o) => toLocal(t, o))
  return cells
    .filter((c) => !ctrs.some((l) => Math.hypot(l.x - c.x, l.y - c.y) < 10))
    .map((c) => {
      const w = toWorld(t, c)
      return makeTile('ten-frame-counter', {}, w.x, w.y)
    })
}

const tenFrame: TileDef = {
  type: 'ten-frame',
  name: () => 'Onluk çerçeve',
  create: () => ({ color: P.dark, p: { rows: 2, cols: 5, count: false } }),
  bounds: (t) => {
    const { w, h } = frameLayout(t)
    return { x: -w / 2 - 4, y: -h / 2 - (t.p.count ? 30 : 4), w: w + 8, h: h + (t.p.count ? 34 : 8) }
  },
  outline: (t) => {
    const { w, h } = frameLayout(t)
    return rectOutline(w, h)
  },
  render: (t, ctx) => {
    const { rows, cols, w, h } = frameLayout(t)
    const color = t.color ?? P.dark
    let minor = ''
    let major = ''
    for (let r = 1; r < rows; r++) (r % 2 ? (major += `M${-w / 2} ${round(-h / 2 + r * CELL)}h${w}`) : (minor += `M${-w / 2} ${round(-h / 2 + r * CELL)}h${w}`))
    for (let c = 1; c < cols; c++) (c % 5 ? (minor += `M${round(-w / 2 + c * CELL)} ${-h / 2}v${h}`) : (major += `M${round(-w / 2 + c * CELL)} ${-h / 2}v${h}`))
    return (
      <>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={t.p.fill ?? 'rgba(255,255,255,.01)'} stroke={color} strokeWidth={2.5} />
        {minor && <path d={minor} stroke={color} strokeWidth={1.5} />}
        {major && <path d={major} stroke={color} strokeWidth={2} />}
        {t.p.count && !ctx.thumb && <Label y={-h / 2 - 16} size={18}>{fmt(counted(t, ctx.tiles))}</Label>}
      </>
    )
  },
  handles: (t) => {
    const { w, h } = frameLayout(t)
    return [
      { id: 'cols', x: w / 2, y: 0 },
      { id: 'rows', x: 0, y: h / 2 },
    ]
  },
  onHandle: (t, id, l) => {
    const g = frameLayout(t)
    const corner = toWorld(t, { x: -g.w / 2, y: -g.h / 2 })
    const cols = id === 'cols' ? Math.max(1, Math.min(25, Math.round((l.x + g.w / 2) / CELL))) : g.cols
    const rows = id === 'rows' ? Math.max(1, Math.min(25, Math.round((l.y + g.h / 2) / CELL))) : g.rows
    if (cols === g.cols && rows === g.rows) return
    const c = rotate({ x: (cols * CELL) / 2, y: (rows * CELL) / 2 }, t.rot)
    return { x: corner.x + c.x, y: corner.y + c.y, p: { ...t.p, cols, rows } }
  },
  colorable: true,
  gridSnap: true,
  rotatable: false,
  watch: true,
  dropHint: (_t, dropped) => (dropped.some((d) => d.type === 'ten-frame-counter') ? '⟶' : null),
  onDrop: snapCounters,
}

const counter: TileDef = {
  type: 'ten-frame-counter',
  name: (t) => (t.p.value === -1 ? 'Negatif sayma pulu' : 'Sayma pulu'),
  create: (p) => ({ p: { value: p.value === -1 ? -1 : 1 } }),
  bounds: () => rectBox(COUNTER_R * 2, COUNTER_R * 2),
  render: (t) => {
    const c = t.color ?? (t.p.value === -1 ? COUNTER_NEG : COUNTER_POS)
    return <circle r={COUNTER_R} fill={c} stroke={edge(c)} strokeWidth={1.5} />
  },
  rotatable: false,
  edgeSnap: false,
  colorable: true,
  onDoubleTap: (t, api) => api.update(t.id, flipCounter(t), true),
  // Zıt işaretli pul üstüne bırakılınca ikisi birbirini götürür (sıfır çifti)
  dropHint: (t, dropped) => (opposite(t, dropped) ? '0' : null),
  onDrop: (t, dropped, api) => {
    const o = opposite(t, dropped)
    if (!o) return
    api.remove([t.id, o.id])
    api.sound('pop')
  },
}

/** Bırakılanlar arasında hedefle aynı türde ve zıt işaretli ilk parça */
const opposite = (t: Tile, dropped: Tile[]) => dropped.find((d) => d.type === t.type && (d.p.value === -1) !== (t.p.value === -1))

const flipCounter = (t: Tile): Partial<Tile> => ({ color: undefined, p: { ...t.p, value: t.p.value === -1 ? 1 : -1 } })

// ---------------------------------------------------------------------------
// Sayı çerçeveleri (Polypad: renkli iki sıralı çubuk, her hücrede beyaz nokta)
// ---------------------------------------------------------------------------

const ER = UNIT

function nframeGeom(v: number) {
  const n = Math.max(1, Math.round(v))
  const w = Math.ceil(n / 2)
  const rows = n > w ? 2 : 1
  return { n, w, rows, W: w * ER, H: rows * ER, rem: n - w }
}

function nframeOutline(v: number): Pt[] {
  const { w, rows, W, H, rem } = nframeGeom(v)
  const u = (x: number, y: number) => ({ x: x * ER - W / 2, y: y * ER - H / 2 })
  if (rows === 1 || rem === w) return [u(0, 0), u(w, 0), u(w, rows), u(0, rows)]
  return [u(0, 0), u(w, 0), u(w, 1), u(rem, 1), u(rem, 2), u(0, 2)]
}

const nframeCell = (v: number, i: number) => {
  const { w, W, H } = nframeGeom(v)
  return { x: -W / 2 + ((i % w) + 0.5) * ER, y: -H / 2 + (Math.floor(i / w) + 0.5) * ER }
}

const numberFrame: TileDef = {
  type: 'number-frame',
  name: (t) => `${t.p.value} sayı çerçevesi`,
  create: (p) => ({ color: barDefault(p.value ?? 5), p: { value: p.value ?? 5 } }),
  bounds: (t) => {
    const g = nframeGeom(t.p.value)
    return rectBox(g.W, g.H)
  },
  outline: (t) => nframeOutline(t.p.value),
  render: (t) => {
    const color = t.color ?? barDefault(t.p.value)
    return (
      <>
        <path d={pathOf(nframeOutline(t.p.value))} fill={color} stroke={edge(color)} strokeWidth={1.5} strokeLinejoin="round" />
        {Array.from({ length: nframeGeom(t.p.value).n }, (_, i) => {
          const c = nframeCell(t.p.value, i)
          return <circle key={i} cx={round(c.x)} cy={round(c.y)} r={ER * 0.2} fill="#ffffff" />
        })}
      </>
    )
  },
  colorable: true,
  gridSnap: true,
}

/** Polypad "Düzenle": çiftler önce, tekler sonra; tekler bir önceki parçanın boşluğuna ters dönerek oturur */
function organizeFrames(ts: Tile[], center: Pt) {
  const ordered = [...ts.filter((t) => t.p.value % 2 === 0), ...ts.filter((t) => t.p.value % 2 === 1)]
  const vals = ordered.map((t) => Math.round(t.p.value))
  const cum: number[] = []
  vals.reduce((a, v) => (cum.push(a + v), a + v), 0)
  const total = cum[cum.length - 1]
  const a = { x: center.x - (ER * Math.ceil(total / 2)) / 2, y: center.y - ER }
  const out = ordered.map((t, i) => {
    let org: Pt
    let rot = 0
    if (i === 0) org = a
    else {
      const prev = cum[i - 1]
      const v = vals[i]
      const even = prev % 2 === 0
      org = {
        x: a.x + (ER * prev) / 2 + (even ? 0 : v === 1 ? -ER / 2 : (ER * v) / 2),
        y: a.y + (even ? 0 : v === 1 ? ER : 2 * ER),
      }
      rot = even || v === 1 ? 0 : 180
    }
    const g = nframeGeom(vals[i])
    // Başlangıç noktası (sol üst) → merkez
    const c = rotate({ x: g.W / 2, y: g.H / 2 }, rot)
    return { id: t.id, x: round(org.x + c.x), y: round(org.y + c.y), rot }
  })
  return { a, out, total }
}

// ---------------------------------------------------------------------------
// Sayı kartları (kesirli değerler: "3/4", "-1 1/2" gibi)
// ---------------------------------------------------------------------------

type Q = { n: number; d: number }
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
const qNorm = (q: Q): Q => {
  const g = gcd(q.n, q.d) || 1
  const s = q.d < 0 ? -1 : 1
  return { n: (s * q.n) / g, d: (s * q.d) / g }
}
const qVal = (q: Q) => q.n / q.d
const qAdd = (a: Q, b: Q): Q => ({ n: a.n * b.d + b.n * a.d, d: a.d * b.d })

/** "3/4", "1 1/2", "-2", "0,75" → kesir; tanınmazsa null */
function parseQ(s: string | number | undefined): Q | null {
  if (typeof s === 'number') return Number.isFinite(s) ? decQ(s) : null
  if (s == null) return null
  const str = String(s).trim().replace('−', '-').replace(/\s+/g, ' ')
  let m = /^(-?)(\d+) (\d+)\/(\d+)$/.exec(str)
  if (m) {
    const sign = m[1] ? -1 : 1
    const d = +m[4]
    return d ? qNorm({ n: sign * (+m[2] * d + +m[3]), d }) : null
  }
  m = /^(-?\d+)\/(-?\d+)$/.exec(str)
  if (m) return +m[2] ? qNorm({ n: +m[1], d: +m[2] }) : null
  const v = Number(str.replace(',', '.'))
  return Number.isFinite(v) && /^-?[\d.,]+$/.test(str) ? decQ(v) : null
}
function decQ(v: number): Q {
  let d = 1
  while (Math.abs(v * d - Math.round(v * d)) > 1e-9 && d < 1e9) d *= 10
  return qNorm({ n: Math.round(v * d), d })
}

const cardQ = (t: Tile): Q | null => parseQ(t.p.valueStr ?? t.p.value ?? 0)
const cardNum = (t: Tile) => {
  const q = cardQ(t)
  return q ? qVal(q) : NaN
}
const isFractional = (t: Tile) => String(t.p.valueStr ?? '').includes('/')

/** Kart metni: kesir/karışık/ondalık gösterim */
function cardParts(t: Tile): { whole?: string; num?: string; den?: string; text?: string } {
  const q = cardQ(t)
  if (!q) return { text: String(t.p.valueStr ?? t.p.value ?? '') }
  if (q.d === 1) return { text: fmt(q.n, 0).replace('-', '−') }
  const mode = t.p.labels ?? (isFractional(t) ? 'fraction' : 'decimal')
  if (mode === 'decimal') return { text: fmt(qVal(q), 4).replace('-', '−') }
  const sign = q.n < 0 ? '−' : ''
  const an = Math.abs(q.n)
  if (mode === 'mixed' && an > q.d) return { whole: sign + Math.floor(an / q.d), num: String(an % q.d), den: String(q.d) }
  return { whole: sign || undefined, num: String(an), den: String(q.d) }
}

const CARD = 50 * K
const cardColor = (t: Tile) => t.color ?? valueColor(Number.isFinite(cardNum(t)) ? cardNum(t) : 1)

/** Sonucu kart özelliklerine çevirir */
function qProps(q: Q, frac: boolean) {
  const r = qNorm(q)
  return r.d === 1 ? { value: r.n, valueStr: undefined, labels: undefined } : { value: qVal(r), valueStr: frac ? `${r.n}/${r.d}` : String(round(qVal(r), 6)), labels: frac ? 'fraction' : 'decimal' }
}

/** İşlem sonucu kartın özellikleri: kesirliyse hedefin gösterim biçimi korunur */
function cardResult(q: Q, src: Tile[], base: Record<string, unknown> = {}) {
  const frac = src.some(isFractional)
  const r = qProps(q, frac)
  const keep = r.labels && base.labels && frac ? { labels: base.labels } : {}
  return { ...base, ...r, ...keep }
}

const qNeg = (q: Q): Q => ({ n: -q.n, d: q.d })

async function editCard(t: Tile, api: PadApi) {
  const cur = cardParts(t)
  const s = await api.prompt('Kartın değeri (ör. 12, 3/4, 0,5 ya da x)', cur.text ?? `${cur.whole ? `${cur.whole} ` : ''}${cur.num}/${cur.den}`)
  if (s == null || !s.trim()) return
  const v = s.trim()
  const q = parseQ(v)
  if (q) api.update(t.id, { p: { ...t.p, ...qProps(q, v.includes('/')) } }, true)
  else api.update(t.id, { p: { ...t.p, value: 0, valueStr: v.slice(0, 8), labels: undefined } }, true)
}

const numberCard: TileDef = {
  type: 'number-card',
  name: (t) => `Sayı kartı ${cardParts(t).text ?? `${cardParts(t).num}/${cardParts(t).den}`}`,
  create: (p) => {
    if (p.valueStr != null) {
      const q = parseQ(String(p.valueStr))
      return { p: q ? qProps(q, String(p.valueStr).includes('/')) : { value: 0, valueStr: String(p.valueStr) } }
    }
    return { p: { value: p.value ?? 1 } }
  },
  bounds: () => rectBox(CARD, CARD),
  outline: () => rectOutline(CARD, CARD),
  render: (t) => {
    const color = cardColor(t)
    const fg = textOn(color)
    const parts = cardParts(t)
    let body: ReactElement
    if (parts.text != null) {
      const len = parts.text.length
      body = (
        <Label size={Math.min(26, (CARD * 0.82) / Math.max(1, len * 0.58))} color={fg}>
          {parts.text}
        </Label>
      )
    } else {
      const fs = parts.den!.length > 2 ? 15 : 19
      const fx = parts.whole ? CARD * 0.14 : 0
      body = (
        <>
          {parts.whole && (
            <Label x={-CARD * 0.2} size={22} color={fg}>
              {parts.whole}
            </Label>
          )}
          <Label x={fx} y={-11} size={fs} color={fg}>
            {parts.num}
          </Label>
          <path d={`M${fx - 12} 0h24`} stroke={fg} strokeWidth={2} />
          <Label x={fx} y={12} size={fs} color={fg}>
            {parts.den}
          </Label>
        </>
      )
    }
    return (
      <>
        <rect x={-CARD / 2} y={-CARD / 2} width={CARD} height={CARD} rx={6 * K} fill={color} stroke={edge(color)} strokeWidth={1.5} style={{ transition: 'fill .3s' }} />
        {body}
      </>
    )
  },
  colorable: true,
  onTap: (t, api) => void editCard(t, api),
  // Bir kartı diğerinin üstüne bırakmak onları toplar; negatif kart bırakmak çıkarır (Polypad birleştirme)
  dropHint: (t, dropped) => {
    const cards = dropped.filter((d) => d.type === 'number-card' && cardQ(d))
    const q0 = cardQ(t)
    if (!cards.length || !q0 || !merging()) return null
    const added = cards.reduce((acc, d) => qAdd(acc, cardQ(d)!), { n: 0, d: 1 } as Q)
    if (qNorm(qAdd(q0, added)).n === 0) return '0'
    return qVal(added) < 0 ? '−' : '+'
  },
  onDrop: (t, dropped, api) => {
    const cards = dropped.filter((d) => d.type === 'number-card' && cardQ(d))
    const q0 = cardQ(t)
    if (!cards.length || !q0 || !merging()) return
    const q = qNorm(cards.reduce((acc, d) => qAdd(acc, cardQ(d)!), q0))
    api.remove(cards.map((d) => d.id))
    if (q.n === 0) {
      api.remove([t.id])
      api.sound('pop')
      return
    }
    api.update(t.id, { color: undefined, p: cardResult(q, [t, ...cards], t.p) }, true)
    api.select([t.id])
    api.sound('click')
  },
}

/** Basamaklarına ayırma (Polypad): 243 → 200, 40, 3; 300 → 100+100+100; 100 → on tane 10 */
function splitCardValues(v: number): number[] {
  const sign = Math.sign(v)
  const digits = String(Math.abs(v)).split('').reverse().map(Number)
  const nonzero = digits.filter((d) => d).length
  const out: number[] = []
  digits.forEach((d, place) => {
    if (!d) return
    if (nonzero > 1) out.push(sign * d * 10 ** place)
    else if (d === 1) for (let i = 0; i < 10; i++) out.push(sign * 10 ** (place - 1))
    else for (let i = 0; i < d; i++) out.push(sign * 10 ** place)
  })
  return out
}

/** Kartları değerlerine göre sütunlar hâlinde dizer (Polypad __) */
function organizeCardPositions(values: number[], center: Pt): Pt[] {
  const groups = new Map<number, number[]>()
  values.forEach((v, i) => groups.set(v, [...(groups.get(v) ?? []), i]))
  const keys = [...groups.keys()].sort((a, b) => b - a)
  const pos: Pt[] = Array(values.length)
  let x = 0
  let h = 0
  for (const k of keys) {
    const idx = groups.get(k)!
    const per = idx.length <= 25 ? 5 : 10
    idx.forEach((i, q) => (pos[i] = { x: x + Math.floor(q / per) * CARD, y: (q % per) * CARD }))
    x += CARD * Math.ceil(idx.length / per)
    h = Math.max(h, CARD * Math.min(idx.length, per))
  }
  return pos.map((p) => ({ x: round(center.x - x / 2 + p.x + CARD / 2), y: round(center.y - h / 2 + p.y + CARD / 2) }))
}

// ---------------------------------------------------------------------------
// Sayı doğrusu ve atlamalar
// ---------------------------------------------------------------------------

function lineInfo(t: Tile) {
  // Eski kayıtlar: min/max/len
  const start = t.p.start ?? String(t.p.min ?? 0)
  const step = t.p.step != null ? String(t.p.step) : '1'
  const sq = parseQ(start) ?? { n: 0, d: 1 }
  const tq = parseQ(step) ?? { n: 1, d: 1 }
  const width = Math.max(1, Math.min(100, Math.round(t.p.width ?? (t.p.max != null ? (Number(t.p.max) - Number(t.p.min ?? 0)) / (Number(t.p.step) || 1) : 10))))
  const size = Math.max(0.25, Number(t.p.size ?? 2))
  const minor = Math.max(1, Math.min(25, Math.round(t.p.minor ?? 1)))
  const sp = size * UNIT
  const len = width * sp
  const decimal = /[.,]/.test(start) || /[.,]/.test(step)
  return { start, step, sq, tq, width, size, minor, sp, len, decimal }
}

function lineLabel(t: Tile, b: number) {
  const { sq, tq, minor, decimal } = lineInfo(t)
  // start + step·b/minor, sadeleştirmeden
  const raw: Q = { n: sq.n * tq.d * minor + tq.n * sq.d * b, d: sq.d * tq.d * minor }
  if (decimal) return fmt(qVal(raw), 4).replace('-', '−')
  const s = t.p.simplify ?? 'all'
  const r = s === 'all' || (s === 'integers' && qNorm(raw).d === 1) ? qNorm(raw) : raw
  return (r.d === 1 ? String(r.n) : `${r.n}/${r.d}`).replace('-', '−')
}

const numberLine: TileDef = {
  type: 'number-line',
  name: () => 'Sayı doğrusu',
  create: () => ({ color: P.dark, p: { start: '0', step: '1', width: 10, size: 2, minor: 1, arrows: 'none', labels: 'below', simplify: 'all' } }),
  bounds: (t) => {
    const { len } = lineInfo(t)
    const ar = (t.p.arrows ?? 'none') !== 'none' ? 26 : 0
    const left = t.p.arrows === 'both' ? 26 : 0
    return { x: -len / 2 - 8 - left, y: t.p.labels === 'above' ? -40 : -14, w: len + 16 + ar + left, h: 56 }
  },
  render: (t) => {
    const { width, minor, sp, len } = lineInfo(t)
    const color = t.color ?? P.dark
    const arrows = t.p.arrows ?? 'none'
    let d = `M${-len / 2} 0H${len / 2}`
    if (arrows !== 'none') d += `M${len / 2} 0h15`
    if (arrows === 'both') d += `M${-len / 2} 0h-15`
    let ticks = ''
    for (let b = 0; b <= width * minor; b++) {
      const x = round(-len / 2 + (b * sp) / minor)
      const major = !(b % minor)
      ticks += `M${x} ${major ? -8 : -4}v${major ? 16 : 8}`
    }
    const pos = t.p.labels === 'above' ? -24 : 26
    return (
      <>
        <rect x={-len / 2 - 8} y={-14} width={len + 16} height={34} fill="transparent" />
        <path d={d + ticks} stroke={color} strokeWidth={2.5} fill="none" />
        {arrows !== 'none' && <path d={`M${len / 2 + 25} 0l-8 5v-10Z`} fill={color} stroke={color} strokeWidth={1.5} strokeLinejoin="round" />}
        {arrows === 'both' && <path d={`M${-len / 2 - 25} 0l8 5v-10Z`} fill={color} stroke={color} strokeWidth={1.5} strokeLinejoin="round" />}
        {t.p.labels !== 'hidden' &&
          Array.from({ length: width + 1 }, (_, k) => (
            <Label key={k} x={-len / 2 + k * sp} y={pos} size={14} color={color} transform={t.rot ? `rotate(${-t.rot} ${-len / 2 + k * sp} ${pos})` : undefined}>
              {lineLabel(t, k * minor)}
            </Label>
          ))}
      </>
    )
  },
  handles: (t) => [{ id: 'len', x: lineInfo(t).len / 2, y: 0 }],
  onHandle: (t, _id, l) => {
    const { len, sp, width } = lineInfo(t)
    const w = Math.max(1, Math.min(100, Math.round((l.x + len / 2) / sp)))
    if (w === width) return
    const c = keepLeft(t, len, w * sp)
    return { x: c.x, y: c.y, p: { ...t.p, ...lineProps(t), width: w } }
  },
  colorable: true,
}

/** Eski biçimli sayı doğrusunu yeni özelliklere taşır */
const lineProps = (t: Tile) => {
  const i = lineInfo(t)
  return { start: i.start, step: i.step, width: i.width, size: i.size, minor: i.minor, min: undefined, max: undefined, len: undefined }
}

const JUMP_POS = P.yellow
const JUMP_NEG = P.red
const STEP = UNIT * 2

function jumpInfo(t: Tile) {
  const n = t.p.single ? 1 : Math.max(1, t.p.n ?? 3)
  const size = Number(t.p.size ?? (t.p.single ? 3 : 2))
  const w = size * STEP
  const W = n * w
  const h = Math.min(w * 0.45, 60)
  return { n, size, w, W, h }
}

const multiJump: TileDef = {
  type: 'multi-jump',
  name: () => 'Atlama',
  create: (p) => ({ color: p.color ?? (p.isFlipped ? JUMP_NEG : JUMP_POS), p: { single: !!p.single, isFlipped: !!p.isFlipped, n: p.single ? 1 : 3, size: p.single ? 3 : 2 } }),
  bounds: (t) => {
    const { W, h } = jumpInfo(t)
    return { x: -W / 2 - 4, y: -h - 26, w: W + 8, h: h + 32 }
  },
  render: (t) => {
    const { n, size, w, W, h } = jumpInfo(t)
    const color = t.color ?? JUMP_POS
    const flip = !!t.p.isFlipped
    return (
      <g fill="none">
        {Array.from({ length: n }, (_, i) => {
          const x0 = -W / 2 + i * w
          const x1 = x0 + w
          const mid = (x0 + x1) / 2
          const [tx, ex] = flip ? [x0, x0 - mid] : [x1, x1 - mid]
          const ang = Math.atan2(2 * h, ex)
          const a1 = ang + 0.45
          const a2 = ang - 0.45
          return (
            <g key={i}>
              <path d={`M${round(x0)} 0Q${round(mid)} ${round(-2 * h)} ${round(x1)} 0`} stroke="transparent" strokeWidth={16} />
              <path d={`M${round(x0)} 0Q${round(mid)} ${round(-2 * h)} ${round(x1)} 0`} stroke={color} strokeWidth={3} strokeLinecap="round" />
              <path d={`M${round(tx - 11 * Math.cos(a1))} ${round(-11 * Math.sin(a1))}L${round(tx)} 0L${round(tx - 11 * Math.cos(a2))} ${round(-11 * Math.sin(a2))}`} stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={round(flip ? x1 : x0)} cy={0} r={3} fill={color} />
              {!t.p.hideLabels && (
                <Label x={mid} y={-h - 14} size={14} color={color}>
                  {flip ? '−' : '+'}
                  {fmt(size)}
                </Label>
              )}
            </g>
          )
        })}
      </g>
    )
  },
  handles: (t) => [{ id: 'size', x: jumpInfo(t).W / 2, y: 0 }],
  onHandle: (t, _id, l) => {
    const { n, W } = jumpInfo(t)
    const size = Math.max(0.5, Math.round(((l.x + W / 2) / (n * STEP)) * 2) / 2)
    const c = keepLeft(t, W, size * n * STEP)
    return { x: c.x, y: c.y, p: { ...t.p, size } }
  },
  rotatable: false,
  colorable: true,
}

// ---------------------------------------------------------------------------
// Asal çarpan daireleri (Polypad: her asal çarpan bir halka dilimi, ortada çarpım)
// ---------------------------------------------------------------------------

/** Polypad asal renkleri; listede olmayan asallar kırmızı */
const PRIME: Record<number, string> = { [-1]: P.mediumGrey, 1: P.grey, 2: P.yellow, 3: P.green, 5: P.blue, 7: P.purple }
const primeColor = (p: number) => PRIME[p] ?? P.red

function primeFactors(n: number): number[] {
  const out: number[] = []
  let m = Math.max(1, Math.floor(Math.abs(n)))
  for (let p = 2; p * p <= m; p++)
    while (m % p === 0) {
      out.push(p)
      m /= p
    }
  if (m > 1) out.push(m)
  return out
}

const DISK_R = 50 * K

/** Dilimler: büyükten küçüğe asallar (Polypad ket) */
const diskFactors = (v: number) => (Math.abs(v) <= 1 ? [v < 0 ? -1 : 1] : [...(v < 0 ? [-1] : []), ...primeFactors(v).reverse()])

function sector(i: number, n: number, R: number) {
  const r = R * 0.4
  if (n === 1) return `M0 ${-R}A${R} ${R} 0 1 1 0 ${R}A${R} ${R} 0 1 1 0 ${-R}ZM0 ${-r}A${r} ${r} 0 1 0 0 ${r}A${r} ${r} 0 1 0 0 ${-r}Z`
  const step = (2 * Math.PI) / n
  const a0 = -Math.PI / 2 - step / 2 + step * i
  const a1 = a0 + step
  const P0 = (a: number, rr: number) => `${round(rr * Math.cos(a))} ${round(rr * Math.sin(a))}`
  const large = step > Math.PI ? 1 : 0
  return `M${P0(a0, R)}A${R} ${R} 0 ${large} 1 ${P0(a1, R)}L${P0(a1, r)}A${r} ${r} 0 ${large} 0 ${P0(a0, r)}Z`
}

const primeDisk: TileDef = {
  type: 'prime-disk',
  name: (t) => `${t.p.value} asal çarpan dairesi`,
  create: (p) => ({ p: { value: p.value ?? 12, labels: 'number' } }),
  bounds: () => rectBox(DISK_R * 2, DISK_R * 2),
  render: (t) => {
    const fs = diskFactors(t.p.value)
    const labels = t.p.labels ?? 'number'
    const n = fs.length
    const neg = t.p.value < 0
    return (
      <>
        <circle r={DISK_R} fill="#ffffff" />
        {fs.map((f, i) => (
          <path key={i} d={sector(i, n, DISK_R)} fill={t.color ?? primeColor(f)} stroke={edge(t.color ?? primeColor(f))} strokeWidth={1.2} fillRule="evenodd" />
        ))}
        {(labels === 'all' || labels === 'sectors-only') &&
          n > 1 &&
          fs.map((f, i) => {
            const a = ((2 * Math.PI) / n) * i - Math.PI / 2
            return (
              <Label key={`l${i}`} x={DISK_R * 0.7 * Math.cos(a)} y={DISK_R * 0.7 * Math.sin(a)} size={14} color="#ffffff">
                {f === -1 ? '−1' : Math.abs(f)}
              </Label>
            )
          })}
        {neg && <circle r={20 * K * 0.8} fill={P.dark} />}
        {labels !== 'hidden' && labels !== 'sectors-only' && (
          <Label size={String(Math.abs(t.p.value)).length > 3 ? 13 : 17} color={neg ? '#ffffff' : P.dark}>
            {neg ? `−${Math.abs(t.p.value)}` : t.p.value}
          </Label>
        )}
      </>
    )
  },
  rotatable: false,
  dropHint: (t, dropped) => {
    const disks = dropped.filter((d) => d.type === 'prime-disk')
    if (!disks.length) return null
    return Math.abs(disks.reduce((a, d) => a * d.p.value, t.p.value)) <= 9999999 ? '×' : null
  },
  // Bir daireyi diğerinin üstüne bırakmak çarpar
  onDrop: (t, dropped, api) => {
    const disks = dropped.filter((d) => d.type === 'prime-disk')
    if (!disks.length) return
    const v = disks.reduce((a, d) => a * d.p.value, t.p.value)
    if (Math.abs(v) > 9999999) return api.sound('error')
    api.remove(disks.map((d) => d.id))
    api.updateP(t.id, { value: v }, true)
    api.select([t.id])
    api.sound('snap')
  },
}

// ---------------------------------------------------------------------------
// Nokta dizilimleri (Polypad: asal çarpanlara göre iç içe gruplanmış noktalar)
// ---------------------------------------------------------------------------

const DW = 4 * K // en içteki beyaz nokta
const DQ = 6 // bir halkadaki en çok grup
const DO = 6 * K // gruplar arası boşluk

const dotFactors = (t: Tile): number[] => {
  if (t.p.factors) return String(t.p.factors).split('-').map(Number).filter((n) => n > 0)
  const v = Math.max(1, Math.round(t.p.value ?? 1))
  return v === 1 ? [1] : primeFactors(v)
}

/** f grup, her biri r yarıçaplı: kapsayan yarıçap */
function groupRadius(f: number, r: number) {
  if (f === 2) return 2 * r + 1.5 * DO
  const step = 2 * r + DO
  let s = 2 * r + DO
  if (f === 3) s /= Math.sqrt(3)
  if (f === 4) s /= Math.sqrt(2)
  let e = f
  if (e > 3 && e % 2) e -= 1
  const rings = Math.ceil((Math.sqrt((e * 8) / DQ + 1) - 1) / 2)
  return s + (rings - 1) * step + r + DO
}

/** f grubun merkezleri */
function groupCenters(f: number, r: number): Pt[] {
  if (f === 1) return [{ x: 0, y: 0 }]
  if (f === 2) return [{ x: -r - DO / 2, y: 0 }, { x: r + DO / 2, y: 0 }]
  const out: Pt[] = []
  const step = 2 * r + DO
  let s = step
  if (f === 3) s /= Math.sqrt(3)
  if (f === 4) s /= Math.sqrt(2)
  let e = f
  if (e > 3 && e % 2) {
    out.push({ x: 0, y: 0 })
    e -= 1
  }
  let ring = 1
  while (e > 0) {
    const o = Math.min(DQ * ring, e)
    const a = (2 * Math.PI) / o
    const st = Math.PI / 2 - a / 2
    for (let k = 0; k < o; k++) out.push({ x: s * Math.cos(st + a * k), y: s * Math.sin(st + a * k) })
    e -= o
    s += step
    ring++
  }
  return out
}

const dotRadius = (fs: number[]) => fs.reduceRight((acc, f) => groupRadius(f, acc), DW)

function dotNodes(fs: number[], out: ReactElement[], c: Pt) {
  const R = dotRadius(fs)
  out.push(<circle key={out.length} cx={round(c.x)} cy={round(c.y)} r={round(R)} fill={primeColor(fs[0])} stroke={edge(primeColor(fs[0]))} strokeWidth={1} />)
  const rest = fs.slice(1)
  const inner = dotRadius(rest)
  const centers = fs[0] === 1 ? [] : groupCenters(fs[0], inner)
  for (const p of centers) {
    const q = { x: c.x + p.x, y: c.y + p.y }
    if (rest.length) dotNodes(rest, out, q)
    else out.push(<circle key={out.length} cx={round(q.x)} cy={round(q.y)} r={DW} fill="#ffffff" />)
  }
}

const dotCache = new Map<string, ReactElement[]>()
function dotArt(fs: number[]) {
  const key = fs.join('-')
  let hit = dotCache.get(key)
  if (!hit) {
    hit = []
    dotNodes(fs, hit, { x: 0, y: 0 })
    if (dotCache.size > 200) dotCache.clear()
    dotCache.set(key, hit)
  }
  return hit
}

const isPrime = (n: number) => n > 1 && primeFactors(n).length === 1

const numberDot: TileDef = {
  type: 'number-dot',
  name: (t) => `${dotFactors(t).reduce((a, b) => a * b, 1)} nokta`,
  create: (p) => {
    const v = Math.max(1, Math.round(p.value ?? 6))
    return { p: { factors: (v === 1 ? [1] : primeFactors(v)).join('-') } }
  },
  bounds: (t) => {
    const R = dotRadius(dotFactors(t))
    return rectBox(R * 2, R * 2)
  },
  render: (t) => <>{dotArt(dotFactors(t))}</>,
  // Üst üste bırakılan dizilimler toplanır; toplam yeniden asal çarpanlarına göre dizilir
  dropHint: (t, dropped) => {
    const ds = dropped.filter((d) => d.type === 'number-dot')
    if (!ds.length || !merging()) return null
    return dotValue(t) + sum(ds.map(dotValue)) <= 144 ? '+' : null
  },
  onDrop: (t, dropped, api) => {
    const ds = dropped.filter((d) => d.type === 'number-dot')
    if (!ds.length || !merging()) return
    const total = dotValue(t) + sum(ds.map(dotValue))
    if (total > 144) return
    api.remove(ds.map((d) => d.id))
    api.updateP(t.id, { factors: (total === 1 ? [1] : primeFactors(total)).join('-'), value: undefined }, true)
    api.select([t.id])
    api.sound('snap')
  },
}

const dotValue = (t: Tile) => dotFactors(t).reduce((a, b) => a * b, 1)

const setDots = (fs: number[]) => ({ p: { factors: fs.join('-'), value: undefined } })

// ---------------------------------------------------------------------------
// Sayı tabloları
// ---------------------------------------------------------------------------

const GC = UNIT * 1.15
const MARKS = [C.lOrange, C.lBlue, C.lGreen, C.lPink, C.lPurple]

function gridInfo(t: Tile) {
  const table = t.p.kind === 'addition' || t.p.kind === 'multiplication'
  const rows = Math.max(1, t.p.rows ?? 10) + (table ? 1 : 0)
  const cols = Math.max(1, t.p.cols ?? 10) + (table ? 1 : 0)
  return { table, rows, cols, w: cols * GC, h: rows * GC }
}

function cellValue(t: Tile, r: number, c: number, table: boolean): number {
  if (!table) return (t.p.start ?? 1) + r * (t.p.cols ?? 10) + c
  return t.p.kind === 'addition' ? r + c : r * c
}

function cellText(t: Tile, r: number, c: number, table: boolean): { text: string; head: boolean } {
  if (!table) return { text: fmt(cellValue(t, r, c, table)), head: false }
  const op = t.p.kind === 'addition' ? '+' : '×'
  if (r === 0 && c === 0) return { text: op, head: true }
  if (r === 0) return { text: String(c), head: true }
  if (c === 0) return { text: String(r), head: true }
  return { text: String(cellValue(t, r, c, table)), head: false }
}

const numberGrid: TileDef = {
  type: 'number-grid',
  name: (t) => (t.p.kind === 'addition' ? 'Toplama tablosu' : t.p.kind === 'multiplication' ? 'Çarpım tablosu' : 'Yüzlük tablo'),
  create: (p) => ({ p: { kind: p.kind ?? 'hundred', rows: p.rows ?? 10, cols: p.cols ?? 10, start: 1, marks: {}, rev: [] } }),
  bounds: (t) => {
    const g = gridInfo(t)
    return rectBox(g.w, g.h)
  },
  render: (t) => {
    const { table, rows, cols, w, h } = gridInfo(t)
    const marks: Record<string, number> = t.p.marks ?? {}
    const rev: number[] = t.p.rev ?? []
    const fs = GC * 0.38
    const cells = []
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c
        const { text, head } = cellText(t, r, c, table)
        const m = marks[i]
        const hidden = t.p.hide && !head && !rev.includes(i)
        const x = -w / 2 + c * GC
        const y = -h / 2 + (t.p.isFlipped ? rows - 1 - r : r) * GC
        cells.push(
          <g key={i} data-act={head ? undefined : 'cell'} data-v={i}>
            <rect x={x} y={y} width={GC} height={GC} fill={m ? MARKS[(m - 1) % MARKS.length] : head ? '#eceef6' : '#ffffff'} stroke="#b9bccb" strokeWidth={1} />
            {!hidden && (
              <text x={x + GC / 2} y={y + GC / 2} fontSize={text.length > 3 ? fs * 0.8 : fs} fontWeight={head ? 800 : 600} fill="#242436" textAnchor="middle" dominantBaseline="central" fontFamily={FONT} style={{ pointerEvents: 'none' }}>
                {text}
              </text>
            )}
          </g>,
        )
      }
    return (
      <>
        {cells}
        <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="none" stroke="#777" strokeWidth={1.5} />
      </>
    )
  },
  onTap: (t, api, info) => {
    if (info.act !== 'cell') return
    const i = Number(info.v)
    if (t.p.hide && !(t.p.rev ?? []).includes(i)) return api.updateP(t.id, { rev: [...(t.p.rev ?? []), i] }, true)
    const marks = { ...(t.p.marks ?? {}) }
    const next = ((marks[i] ?? 0) + 1) % (MARKS.length + 1)
    if (next) marks[i] = next
    else delete marks[i]
    api.updateP(t.id, { marks }, true)
  },
  rotatable: false,
}

/** İşaretli hücrelerin değerlerinin ebobunun katlarını işaretler (Polypad "Tüm katları seç") */
function markMultiples(t: Tile): Record<string, number> | null {
  const { table, rows, cols } = gridInfo(t)
  const marks: Record<string, number> = t.p.marks ?? {}
  const keys = Object.keys(marks).map(Number)
  if (!keys.length) return null
  const val = (i: number) => cellValue(t, Math.floor(i / cols), i % cols, table)
  const g = keys.map(val).reduce((a, b) => gcd(a, b), 0)
  if (!g) return null
  const color = marks[keys[0]]
  const out: Record<string, number> = { ...marks }
  for (let r = table ? 1 : 0; r < rows; r++)
    for (let c = table ? 1 : 0; c < cols; c++) {
      const i = r * cols + c
      if (val(i) % g === 0) out[i] = color
    }
  return out
}

const DG = UNIT
const decimalGrid: TileDef = {
  type: 'decimal-grid',
  name: () => 'Ondalık tablo',
  create: () => ({ color: C.blue, p: { cells: [] as number[], label: true } }),
  bounds: (t) => ({ x: -DG * 5, y: -DG * 5, w: DG * 10, h: DG * 10 + (t.p.label ? 30 : 0) }),
  render: (t) => {
    const set = new Set<number>(t.p.cells ?? [])
    const color = t.color ?? C.blue
    const n = set.size
    return (
      <>
        {Array.from({ length: 100 }, (_, i) => (
          <rect key={i} data-act="cell" data-v={i} x={-DG * 5 + (i % 10) * DG} y={-DG * 5 + Math.floor(i / 10) * DG} width={DG} height={DG} fill={set.has(i) ? color : '#ffffff'} stroke="#b9bccb" strokeWidth={1} />
        ))}
        <rect x={-DG * 5} y={-DG * 5} width={DG * 10} height={DG * 10} fill="none" stroke="#777" strokeWidth={1.5} />
        {t.p.label && (
          <Label y={DG * 5 + 16} size={15}>
            {fmt(n / 100)} = %{n} = {n}/100
          </Label>
        )}
      </>
    )
  },
  onTap: (t, api, info) => {
    if (info.act !== 'cell') return
    const i = Number(info.v)
    const cells: number[] = t.p.cells ?? []
    api.updateP(t.id, { cells: cells.includes(i) ? cells.filter((c) => c !== i) : [...cells, i] }, true)
  },
  colorable: true,
}

// ---------------------------------------------------------------------------
// El karoları
// ---------------------------------------------------------------------------

const SKIN = '#f2c39b'
const SKIN_EDGE = '#b77b4f'
// Parmaklar sırayla kalkar: işaret, orta, yüzük, serçe, başparmak
const FINGERS = [
  { x: -14, len: 40 },
  { x: -1, len: 44 },
  { x: 12, len: 40 },
  { x: 24, len: 31 },
]
const HAND_W = 92

const handTile: TileDef = {
  type: 'hand-tile',
  name: (t) => `${t.p.value} parmak`,
  create: (p) => ({ p: { value: p.value ?? 5 } }),
  bounds: () => ({ x: -52, y: -54, w: HAND_W, h: 100 }),
  render: (t) => {
    const v = Math.max(0, Math.min(5, t.p.value ?? 0))
    const color = t.color ?? SKIN
    const st = t.color ? edge(t.color) : SKIN_EDGE
    return (
      <g stroke={st} strokeWidth={1.8} fill={color} strokeLinejoin="round">
        {FINGERS.map((f, i) => {
          const up = i < v
          const h = up ? f.len + 8 : 12
          return <rect key={i} x={f.x - 6} y={-h + 2} width={12} height={h + 6} rx={6} />
        })}
        {v === 5 && <rect x={-46} y={-6} width={30} height={12} rx={6} transform="rotate(-35 -20 6)" />}
        <rect x={-24} y={0} width={54} height={44} rx={15} />
        {FINGERS.map((f, i) => (i < v ? null : <path key={i} d={`M${f.x - 4} 4h8`} fill="none" strokeWidth={1.3} />))}
        {v !== 5 && <rect x={-28} y={8} width={26} height={11} rx={5.5} transform="rotate(-10 -15 13)" />}
      </g>
    )
  },
  colorable: true,
  flippable: true,
  // Üst üste bırakılan eller toplanır: bir elde en çok 5 parmak, artanı yanındaki ele geçer
  dropHint: (_t, dropped) => (merging() && dropped.some((d) => d.type === 'hand-tile') ? '+' : null),
  onDrop: (t, dropped, api) => {
    const hs = dropped.filter((d) => d.type === 'hand-tile')
    if (!hs.length || !merging()) return
    let total = (t.p.value ?? 0) + sum(hs.map((h) => h.p.value ?? 0))
    const first = Math.min(5, total)
    total -= first
    api.updateP(t.id, { value: first })
    const keep: string[] = [t.id]
    const extra = toWorld(t, { x: t.flip ? -HAND_W : HAND_W, y: 0 })
    hs.forEach((h, i) => {
      if (total <= 0) {
        api.remove([h.id])
        return
      }
      const v = Math.min(5, total)
      total -= v
      // Artan parmaklar, hedefin yanına dizilen ellere geçer
      api.update(h.id, { x: extra.x + (t.flip ? -1 : 1) * i * HAND_W, y: extra.y, rot: t.rot, flip: !t.flip, p: { ...h.p, value: v } })
      keep.push(h.id)
    })
    api.commit()
    api.select(keep)
    api.sound('snap')
  },
}

// ---------------------------------------------------------------------------
// Abaküs / rekenrek
// ---------------------------------------------------------------------------

const BD = 22
const ROW = 27
const ROD = BD * 16

function abacusInfo(t: Tile) {
  const rows = Math.max(1, Math.min(10, t.p.rows ?? 10))
  const extra = t.p.values ? 40 : 0
  const w = ROD + 28
  const h = rows * ROW + 20
  return { rows, w, h, extra }
}

const beadX = (i: number, left: boolean) => (left ? -ROD / 2 + BD / 2 + i * BD : ROD / 2 - BD / 2 - (9 - i) * BD)

const abacus: TileDef = {
  type: 'abacus',
  name: () => 'Abaküs',
  create: () => ({ p: { rows: 10, counts: Array(10).fill(0), values: false } }),
  bounds: (t) => {
    const { w, h, extra } = abacusInfo(t)
    return { x: -w / 2, y: -h / 2, w: w + extra, h }
  },
  render: (t, ctx) => {
    const { rows, w, h } = abacusInfo(t)
    const counts: number[] = t.p.counts ?? []
    const frame = t.color ?? C.dOrange
    const out = []
    for (let r = 0; r < rows; r++) {
      const y = -h / 2 + 10 + (r + 0.5) * ROW
      const c = counts[r] ?? 0
      out.push(<path key={`rod${r}`} d={`M${-w / 2 + 8} ${y}H${w / 2 - 8}`} stroke="#9a9aa8" strokeWidth={3} />)
      for (let i = 0; i < 10; i++) {
        const x = beadX(i, i < c)
        const fill = i < 5 ? C.red : '#f4f4f4'
        out.push(
          <g key={`${r}-${i}`} style={{ transform: `translate(${x}px, ${y}px)`, transition: ctx.thumb ? undefined : 'transform .22s ease-out' }}>
            <ellipse data-act="bead" data-v={`${r},${i}`} rx={BD / 2 - 0.5} ry={ROW / 2 - 2} fill={fill} stroke={edge(fill)} strokeWidth={1.3} />
          </g>,
        )
      }
      if (t.p.values) out.push(<Label key={`v${r}`} x={w / 2 + 20} y={y} size={14}>{c}</Label>)
    }
    return (
      <>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={8} fill="#fff8ef" stroke={frame} strokeWidth={2} />
        <rect x={-w / 2} y={-h / 2} width={10} height={h} rx={4} fill={frame} />
        <rect x={w / 2 - 10} y={-h / 2} width={10} height={h} rx={4} fill={frame} />
        {out}
      </>
    )
  },
  onTap: (t, api, info) => {
    if (info.act !== 'bead' || !info.v) return
    const [r, i] = info.v.split(',').map(Number)
    const counts: number[] = [...(t.p.counts ?? Array(10).fill(0))]
    const c = counts[r] ?? 0
    counts[r] = i >= c ? i + 1 : i
    api.updateP(t.id, { counts }, true)
    api.sound('click')
  },
  colorable: true,
}

// ---------------------------------------------------------------------------
// Patlayan noktalar
// ---------------------------------------------------------------------------

const DOT_R = 12.5 * K
const DOT_POS = P.blue
const DOT_NEG = P.red

const dot: TileDef = {
  type: 'dot',
  name: (t) => (t.p.value === -1 ? 'Karşı nokta' : 'Nokta'),
  create: (p) => ({ p: { value: p.value === -1 ? -1 : 1 } }),
  bounds: () => rectBox(DOT_R * 2 + 4, DOT_R * 2 + 4),
  render: (t) => {
    const c = t.color ?? (t.p.value === -1 ? DOT_NEG : DOT_POS)
    return <circle r={DOT_R} fill={c} stroke={edge(c)} strokeWidth={1.2} />
  },
  rotatable: false,
  edgeSnap: false,
  colorable: true,
  // Nokta ile karşı nokta birbirini götürür
  dropHint: (t, dropped) => (opposite(t, dropped) ? '0' : null),
  onDrop: (t, dropped, api) => {
    const o = opposite(t, dropped)
    if (!o) return
    api.remove([t.id, o.id])
    api.sound('pop')
  },
}

const BOX = 130 * K * 0.8

function machineInfo(t: Tile) {
  const n = Math.max(1, Math.min(10, t.p.boxes ?? 3))
  const base = Math.max(2, Math.min(25, t.p.base ?? 10))
  const w = n * BOX
  const h = BOX + 64
  return { n, base, w, h, top: -h / 2 + 30 }
}

/** Kutu i'nin yerel dikdörtgeni (soldan sağa; en sağdaki birlikler) */
const boxRect = (t: Tile, i: number) => {
  const { w, top } = machineInfo(t)
  return { x: -w / 2 + i * BOX, y: top, w: BOX, h: BOX }
}

/** Her kutudaki noktalar (pozitif ve negatif) */
function dotsInBoxes(t: Tile, tiles: Tile[]) {
  const { n } = machineInfo(t)
  const boxes = Array.from({ length: n }, () => ({ pos: [] as Tile[], neg: [] as Tile[] }))
  for (const o of tiles) {
    if (o.type !== 'dot') continue
    const l = toLocal(t, o)
    for (let i = 0; i < n; i++) {
      const b = boxRect(t, i)
      if (l.x >= b.x && l.x <= b.x + b.w && l.y >= b.y && l.y <= b.y + b.h) {
        ;(o.p.value === -1 ? boxes[i].neg : boxes[i].pos).push(o)
        break
      }
    }
  }
  return boxes
}

const randomIn = (t: Tile, i: number) => {
  const b = boxRect(t, i)
  const m = DOT_R + 6
  return toWorld(t, { x: b.x + m + Math.random() * (b.w - 2 * m), y: b.y + m + Math.random() * (b.h - 2 * m) })
}

const dotMachine: TileDef = {
  type: 'dot-machine',
  name: () => 'Patlayan noktalar makinesi',
  create: () => ({ color: P.purple, p: { boxes: 3, base: 10, speed: 'fast' } }),
  bounds: (t) => {
    const { w, h } = machineInfo(t)
    return rectBox(w + 8, h)
  },
  render: (t, ctx) => {
    const { n, base, w, h } = machineInfo(t)
    const color = t.color ?? P.purple
    const boxes = ctx.tiles ? dotsInBoxes(t, ctx.tiles) : null
    const total = boxes ? boxes.reduce((s, b, i) => s + (b.pos.length - b.neg.length) * base ** (n - 1 - i), 0) : 0
    const labels = t.p.labels !== 'hidden'
    return (
      <>
        <rect x={-w / 2 - 4} y={-h / 2} width={w + 8} height={h} rx={12} fill="#f4f2fa" stroke="#b9bccb" strokeWidth={1.5} />
        <Label y={-h / 2 + 15} size={14}>
          1 ← {base}
          {boxes && labels && !ctx.thumb ? `   ·   Değer: ${fmt(total)}` : ''}
        </Label>
        {Array.from({ length: n }, (_, i) => {
          const b = boxRect(t, i)
          const cnt = boxes?.[i]
          return (
            <g key={i}>
              <rect x={b.x + 4} y={b.y} width={b.w - 8} height={b.h} rx={6} fill="#ffffff" stroke={color} strokeWidth={5} />
              {labels && (
                <Label x={b.x + b.w / 2} y={b.y + b.h + 16} size={13} color="#5b6080">
                  {cnt && !ctx.thumb ? (cnt.neg.length ? `${cnt.pos.length} | −${cnt.neg.length}` : String(cnt.pos.length)) : fmt(base ** (n - 1 - i))}
                </Label>
              )}
            </g>
          )
        })}
      </>
    )
  },
  watch: true,
  rotatable: false,
  colorable: true,
  // Noktalar bırakıldıkları kutuda sayılır
  dropHint: (_t, dropped) => (dropped.some((d) => d.type === 'dot') ? '⟶' : null),
  onDrop: (_t, dropped, api) => {
    if (dropped.some((d) => d.type === 'dot')) api.sound('snap')
  },
}

/** Patlat: her kutuda tabana ulaşan noktalar birleşip soldaki kutuya geçer */
function explodeMachine(t: Tile, api: PadApi) {
  const { n, base } = machineInfo(t)
  const boxes = dotsInBoxes(t, api.all())
  const remove: string[] = []
  const add: Tile[] = []
  for (let i = n - 1; i > 0; i--) {
    for (const kind of ['pos', 'neg'] as const) {
      const list = boxes[i][kind]
      while (list.length >= base) {
        const group = list.splice(0, base)
        remove.push(...group.map((d) => d.id))
        const w = randomIn(t, i - 1)
        const nd = makeTile('dot', { value: kind === 'neg' ? -1 : 1 }, w.x, w.y)
        add.push(nd)
        boxes[i - 1][kind].push(nd)
      }
    }
  }
  if (!remove.length && !add.length) return api.sound('error')
  const addIds = new Set(add.map((d) => d.id))
  // Aynı turda oluşan ve yine patlayan noktalar hiç eklenmesin
  const removedNew = new Set(remove.filter((id) => addIds.has(id)))
  api.remove(remove.filter((id) => !removedNew.has(id)))
  api.add(
    add.filter((d) => !removedNew.has(d.id)),
    false,
  )
  api.sound('pop')
}

function annihilateMachine(t: Tile, api: PadApi) {
  const remove: string[] = []
  for (const b of dotsInBoxes(t, api.all())) {
    const k = Math.min(b.pos.length, b.neg.length)
    remove.push(...b.pos.slice(0, k).map((d) => d.id), ...b.neg.slice(0, k).map((d) => d.id))
  }
  if (remove.length) {
    api.remove(remove)
    api.sound('pop')
  }
}

const machineHasDots = (ts: Tile[]) => ts.some((t) => dotsInBoxes(t, allTiles()).some((b) => b.pos.length || b.neg.length))

// ---------------------------------------------------------------------------
// Sıfır kovası (Polypad: içine konan +1 ve −1 karoların toplamını gösterir)
// ---------------------------------------------------------------------------

const BUCKET_W = 250
const BUCKET_H = 210
const BTOP = -BUCKET_H / 2 + 28

const inBucket = (t: Tile, o: Tile) => {
  const l = toLocal(t, o)
  return l.x > -BUCKET_W / 2 + 8 && l.x < BUCKET_W / 2 - 8 && l.y > BTOP - 10 && l.y < BUCKET_H / 2
}
const unitAlgebra = (o: Tile) => o.type === 'algebra' && (o.p.expr === '1' || o.p.expr === '-1')

/** Kovadaki sıfır çifti yerleşimi: solda 10 artı, sağda 10 eksi (2 sütun × 5 satır) */
const bucketSlot = (i: number) => {
  const neg = i >= 10
  const k = i % 10
  const s = UNIT + 3
  return { x: (neg ? 1 : -1) * (12 + s / 2 + (k % 2) * s), y: BTOP + 22 + Math.floor(k / 2) * s }
}

const bucket: TileDef = {
  type: 'bucket',
  name: () => 'Sıfır kovası',
  create: () => ({ color: '#cccccc' }),
  bounds: () => rectBox(BUCKET_W, BUCKET_H),
  render: (t, ctx) => {
    const color = t.color ?? '#cccccc'
    const net = ctx.tiles ? sum(ctx.tiles.filter((o) => unitAlgebra(o) && inBucket(t, o)).map((o) => (o.p.expr === '1' ? 1 : -1))) : 0
    const w = BUCKET_W / 2
    return (
      <g strokeLinejoin="round">
        <path d={`M${-w + 6} ${BTOP}L${-w + 34} ${BUCKET_H / 2 - 4}H${w - 34}L${w - 6} ${BTOP}Z`} fill={color} stroke={edge(color)} strokeWidth={2} />
        <ellipse cy={BTOP} rx={w - 6} ry={22} fill={mix(color, '#000000', 0.7)} stroke={edge(color)} strokeWidth={2} />
        <Label y={BUCKET_H / 2 - 34} size={30} weight={900} color="#ffffff">
          {fmt(net).replace('-', '−')}
        </Label>
      </g>
    )
  },
  watch: true,
  rotatable: false,
  colorable: true,
  // +1/−1 karoları kovanın içinde sayılır
  dropHint: (_t, dropped) => (dropped.some(unitAlgebra) ? '⟶' : null),
  onDrop: (_t, dropped, api) => {
    if (dropped.some(unitAlgebra)) api.sound('snap')
  },
}

// ---------------------------------------------------------------------------

export const numbersTiles: TileDef[] = [
  numberTile,
  numberCube,
  snapCube,
  numberBar,
  tenFrame,
  numberFrame,
  counter,
  numberCard,
  numberLine,
  multiJump,
  primeDisk,
  numberDot,
  numberGrid,
  decimalGrid,
  handTile,
  abacus,
  dot,
  dotMachine,
  bucket,
]

// ---------------------------------------------------------------------------
// Eylem çubuğu (Polypad eylemleri)
// ---------------------------------------------------------------------------

const p = (patch: Record<string, unknown>) => ({ p: patch })
type New = Omit<Tile, 'id'>

/** Parçaları kaldırıp yenilerini ekler ve onları seçer */
function replace(api: PadApi, remove: Tile[], add: New[], sound: 'pop' | 'click' | 'snap' = 'pop') {
  api.remove(remove.map((t) => t.id))
  if (add.length) api.add(add, true)
  api.sound(sound)
}

const bySize = (ts: Tile[], v: (t: Tile) => number) => ts.reduce((a, b) => (v(b) > v(a) ? b : a))

export const numbersActions: ActionSpec[] = [
  // --- Sayı kartları ---------------------------------------------------------
  {
    id: 'card-add',
    type: 'button',
    tileTypes: ['number-card'],
    label: 'Topla',
    icon: 'add',
    show: (ts) => ts.length > 1 && ts.every((t) => cardQ(t)),
    click: (ts, api) => {
      const q = qNorm(ts.reduce((acc, t) => qAdd(acc, cardQ(t)!), { n: 0, d: 1 } as Q))
      const c = centerOf(ts)
      replace(api, ts, [{ type: 'number-card', x: c.x, y: c.y, rot: 0, p: cardResult(q, ts) }], 'click')
    },
  },
  {
    id: 'card-subtract',
    type: 'button',
    tileTypes: ['number-card'],
    label: 'Çıkar',
    icon: 'minus',
    show: (ts) => ts.length > 1 && ts.every((t) => cardQ(t)),
    click: (ts, api) => {
      // En soldaki (eşitse en üstteki) karttan diğerleri çıkarılır
      const order = [...ts].sort((a, b) => (Math.abs(a.x - b.x) > 1 ? a.x - b.x : a.y - b.y))
      const q = qNorm(order.slice(1).reduce((acc, t) => qAdd(acc, qNeg(cardQ(t)!)), cardQ(order[0])!))
      const c = centerOf(ts)
      replace(api, ts, [{ type: 'number-card', x: c.x, y: c.y, rot: 0, p: cardResult(q, ts) }], 'click')
    },
  },
  {
    id: 'card-merge',
    type: 'button',
    tileTypes: ['number-card'],
    label: 'Birleştir',
    icon: 'merge',
    text: true,
    show: (ts) => ts.length > 1 && ts.every((t) => cardQ(t)),
    click: (ts, api) => {
      const q = ts.reduce((acc, t) => qAdd(acc, cardQ(t)!), { n: 0, d: 1 } as Q)
      const c = centerOf(ts)
      replace(api, ts, [{ type: 'number-card', x: c.x, y: c.y, rot: 0, p: qProps(q, ts.some(isFractional)) }], 'click')
    },
  },
  {
    id: 'card-split',
    type: 'button',
    tileTypes: ['number-card'],
    label: 'Böl',
    icon: 'split',
    text: true,
    show: (ts) => ts.some((t) => Math.abs(cardNum(t)) > 1) && ts.every((t) => Number.isInteger(cardNum(t))),
    click: (ts, api) => {
      const vals = ts.flatMap((t) => (Math.abs(cardNum(t)) >= 2 ? splitCardValues(cardNum(t)) : [cardNum(t)]))
      const pos = organizeCardPositions(vals, centerOf(ts))
      replace(api, ts, vals.map((v, i) => ({ type: 'number-card', x: pos[i].x, y: pos[i].y, rot: 0, p: { value: v } })))
    },
  },
  {
    id: 'card-organize',
    type: 'button',
    tileTypes: ['number-card'],
    label: 'Düzenle',
    icon: 'organize',
    show: (ts) => ts.length > 1,
    click: (ts, api) => {
      const pos = organizeCardPositions(ts.map(cardNum), centerOf(ts))
      ts.forEach((t, i) => api.update(t.id, { x: pos[i].x, y: pos[i].y, rot: 0 }))
      api.commit()
      api.sound('click')
    },
  },
  {
    id: 'card-labels',
    type: 'select',
    tileTypes: ['number-card'],
    label: 'Sayı türü:',
    location: 'more',
    show: (ts) => ts.every(isFractional),
    options: [
      { key: 'decimal', label: 'Ondalık' },
      { key: 'fraction', label: 'Kesir' },
      { key: 'mixed', label: 'Tam sayılı kesir' },
    ],
    get: (t) => t.p.labels ?? 'fraction',
    set: (v: string) => p({ labels: v }),
  },
  {
    id: 'negate',
    type: 'button',
    tileTypes: ['dot', 'number-card', 'number-tile'],
    label: 'Ters işaret',
    icon: 'turn',
    text: true,
    click: (ts, api) => {
      for (const t of ts) {
        if (t.type === 'dot') api.update(t.id, { color: undefined, p: { ...t.p, value: t.p.value === -1 ? 1 : -1 } })
        else if (t.type === 'number-tile') api.update(t.id, { color: tileColorFor(-tileVal(t), t.color), p: { ...t.p, value: -tileVal(t) } })
        else {
          const q = cardQ(t)
          if (q) api.update(t.id, { color: t.color && t.color !== valueColor(cardNum(t)) ? t.color : undefined, p: { ...t.p, ...qProps({ n: -q.n, d: q.d }, isFractional(t)), labels: t.p.labels } })
        }
      }
      api.commit()
    },
  },

  // --- Sayı karoları ---------------------------------------------------------
  {
    id: 'tile-merge',
    type: 'button',
    tileTypes: ['number-tile'],
    label: 'Birleştir',
    icon: 'merge',
    text: true,
    show: (ts) => ts.length > 1,
    click: (ts, api) => {
      // İşaretli toplam: zıt karolar birbirini götürür
      const total = sum(ts.map(tileVal))
      if (total === 0) return replace(api, ts, [])
      const b = worldBounds(ts, tileOutline)
      const width = Math.max(1, Math.min(Math.abs(total), Math.round(b.w / UNIT)))
      const same = ts.filter((t) => Math.sign(tileVal(t)) === Math.sign(total))
      const src = bySize(same.length ? same : ts, (t) => Math.abs(tileVal(t)))
      const H = Math.ceil(Math.abs(total) / width) * UNIT
      replace(api, ts, [{ type: 'number-tile', x: b.x + (width * UNIT) / 2, y: b.y + H / 2, rot: 0, color: tileColorFor(total, src.color), p: { ...src.p, value: total, width } }], 'click')
    },
  },
  {
    id: 'tile-split',
    type: 'button',
    tileTypes: ['number-tile'],
    label: 'Böl',
    icon: 'split',
    text: true,
    show: (ts) => ts.some((t) => Math.abs(t.p.value ?? 1) > 1),
    click: (ts, api) => replace(api, ts, ts.flatMap(splitNumberTile)),
  },

  // --- Sayı küpleri ----------------------------------------------------------
  {
    id: 'cube-merge',
    type: 'button',
    tileTypes: ['number-cube'],
    label: 'Birleştir',
    icon: 'merge',
    text: true,
    show: (ts) => ts.length > 1 && !!regroupCubes(ts),
    click: (ts, api) => {
      const dims = regroupCubes(ts)
      if (!dims) return
      const pos = organizeCubes(dims, centerOf(ts))
      replace(
        api,
        ts,
        dims.map((d, i) => ({ type: 'number-cube', x: pos[i].x, y: pos[i].y, rot: 0, color: cubeColor(d[0] * d[1] * d[2]), p: { vx: d[0], vy: d[1], vz: d[2] } })),
        'click',
      )
    },
  },
  {
    id: 'cube-organize',
    type: 'button',
    tileTypes: ['number-cube'],
    label: 'Düzenle',
    icon: 'organize',
    show: (ts) => ts.length > 1,
    click: (ts, api) => {
      const pos = organizeCubes(ts.map(cubeDims), centerOf(ts))
      ts.forEach((t, i) => api.update(t.id, { x: pos[i].x, y: pos[i].y }))
      api.commit()
    },
  },
  {
    id: 'cube-split',
    type: 'button',
    tileTypes: ['number-cube'],
    label: 'Böl',
    icon: 'split',
    text: true,
    show: (ts) => ts.some((t) => cubeDims(t)[splitAxis(cubeDims(t))] > 1) && sum(ts.map((t) => cubeDims(t)[splitAxis(cubeDims(t))] - 1)) <= 1000,
    click: (ts, api) => {
      // Polypad gibi: parçalar küpün içinde doğar, sonra aralanarak ayrılır
      const packed = ts.flatMap((t) => splitCube(t, 1))
      const spread = ts.flatMap((t) => splitCube(t, 2))
      api.remove(ts.map((t) => t.id))
      const ids = api.add(packed, true)
      api.animate(ids.map((id, i) => ({ id, x: spread[i].x, y: spread[i].y })))
      api.sound('pop')
    },
  },
  {
    id: 'send-to-back',
    type: 'button',
    tileTypes: ['number-cube'],
    label: 'Arkaya gönder',
    icon: 'layer-back',
    click: (ts) => sendToBack(ts.map((t) => t.id)),
  },
  {
    id: 'send-to-front',
    type: 'button',
    tileTypes: ['number-cube'],
    label: 'Öne getir',
    icon: 'layer-front',
    click: (ts) => bringToFront(ts.map((t) => t.id)),
  },

  // --- Takılan küpler --------------------------------------------------------
  {
    id: 'split-snap-cubes',
    type: 'button',
    tileTypes: ['snap-cube'],
    label: 'Böl',
    icon: 'split',
    text: true,
    show: (ts) => ts.some((t) => cubeColors(t).length > 1),
    click: (ts, api) => {
      const gap = 10 * K
      const out = ts.flatMap((t) => {
        const cs = cubeColors(t)
        if (cs.length === 1) return [snapTile(cs, t.x, t.y, t.rot)]
        const W = snapW(cs.length)
        return cs.map((c, j) => {
          const w = toWorld(t, { x: -W / 2 + snapW(1) / 2 + j * (SI + gap), y: 0 })
          return snapTile([c], w.x, w.y, t.rot)
        })
      })
      replace(api, ts, out)
    },
  },
  {
    id: 'merge-snap-cubes',
    type: 'button',
    tileTypes: ['snap-cube'],
    label: 'Birleştir',
    icon: 'merge',
    text: true,
    show: (ts) => ts.length > 1,
    click: (ts, api) => {
      const first = ts[0]
      const cs = ts.flatMap(cubeColors)
      const W0 = snapW(cubeColors(first).length)
      const corner = toWorld(first, { x: -W0 / 2, y: -SD / 2 })
      const c = rotate({ x: snapW(cs.length) / 2, y: SD / 2 }, first.rot)
      replace(api, ts, [snapTile(cs, corner.x + c.x, corner.y + c.y, first.rot)], 'click')
    },
  },
  {
    id: 'organize-snap-cubes',
    type: 'button',
    tileTypes: ['snap-cube'],
    label: 'Düzenle',
    icon: 'organize',
    text: true,
    show: (ts) => sum(ts.map((t) => cubeColors(t).length)) > 10,
    click: (ts, api) => {
      const cs = ts.flatMap(cubeColors)
      const tens = Math.floor(cs.length / 10)
      const rest = cs.length % 10
      const rows = tens + (rest ? 1 : 0)
      const ctr = centerOf(ts)
      const left = ctr.x - snapW(tens ? 10 : rest) / 2
      const top = ctr.y - (rows * SI) / 2
      const out: New[] = []
      for (let r = 0; r < tens; r++) out.push(snapTile(cs.slice(r * 10, r * 10 + 10), left + snapW(10) / 2, top + r * SI + SD / 2, 0))
      if (rest) out.push(snapTile(cs.slice(-rest), left + snapW(rest) / 2, top + tens * SI + SD / 2, 0))
      replace(api, ts, out, 'click')
    },
  },
  {
    id: 'turn-snap-cubes',
    type: 'button',
    tileTypes: ['snap-cube'],
    label: 'Çevir',
    icon: 'turn',
    click: (ts, api) => {
      for (const t of ts) {
        const n = cubeColors(t).length
        // Ön yüzlerin ortası etrafında 90° döndür
        const pivot = toWorld(t, { x: -snapW(n) / 2 + (n * SI) / 2, y: -SD / 2 + SU + SI / 2 })
        const rel = rotate({ x: t.x - pivot.x, y: t.y - pivot.y }, -90)
        api.update(t.id, { x: round(pivot.x + rel.x), y: round(pivot.y + rel.y), rot: (((t.rot - 90) % 360) + 360) % 360 })
      }
      api.commit()
    },
  },
  {
    id: 'add-snap-cubes',
    type: 'button',
    tileTypes: ['snap-cube'],
    label: 'Ekle',
    icon: 'add',
    click: (ts, api) => {
      for (const t of ts) {
        const cs = cubeColors(t)
        const next = [...cs, cs[cs.length - 1]]
        const c = keepLeft(t, snapW(cs.length), snapW(next.length))
        api.update(t.id, { x: c.x, y: c.y, color: undefined, p: { ...t.p, value: next.length, colors: next.join(',') } })
      }
      api.commit()
    },
  },
  {
    id: 'subtract-snap-cubes',
    type: 'button',
    tileTypes: ['snap-cube'],
    label: 'Çıkar',
    icon: 'minus',
    show: (ts) => ts.every((t) => cubeColors(t).length > 1),
    click: (ts, api) => {
      for (const t of ts) {
        const cs = cubeColors(t).slice(0, -1)
        const c = keepLeft(t, snapW(cs.length + 1), snapW(cs.length))
        api.update(t.id, { x: c.x, y: c.y, color: undefined, p: { ...t.p, value: cs.length, colors: cs.join(',') } })
      }
      api.commit()
    },
  },

  // --- Sayı çubukları --------------------------------------------------------
  {
    id: 'divisions',
    type: 'slider',
    tileTypes: ['number-bar'],
    label: 'Bölmeler',
    get: (t) => {
      const n = factorsOf(t.p.value).length - 1
      return n ? (t.p.denominator ?? 0) / n : 0
    },
    set: (v: number, t) => p({ denominator: Math.round(v * (factorsOf(t.p.value).length - 1)) }),
  },
  {
    id: 'bar-split',
    type: 'button',
    tileTypes: ['number-bar'],
    label: 'Böl',
    icon: 'split',
    text: true,
    show: (ts) => ts.some((t) => barParts(t) > 1),
    click: (ts, api) => {
      const out = ts.flatMap((t): New[] => {
        const k = barParts(t)
        if (k <= 1) return [t]
        const size = t.p.value / k
        const w = t.p.value * UNIT
        return Array.from({ length: k }, (_, i) => {
          const c = toWorld(t, { x: -w / 2 + (i + 0.5) * size * UNIT, y: 0 })
          return { type: 'number-bar', x: c.x, y: c.y, rot: t.rot, color: t.color, p: { ...t.p, value: size, denominator: 0 } }
        })
      })
      replace(api, ts, out)
    },
  },
  {
    id: 'bar-merge',
    type: 'button',
    tileTypes: ['number-bar'],
    label: 'Birleştir',
    icon: 'merge',
    text: true,
    show: (ts) => ts.length > 1,
    click: (ts, api) => {
      const total = sum(ts.map((t) => t.p.value))
      const b = worldBounds(ts, (t) => rectOutline(t.p.value * UNIT, UNIT))
      const rot = sum(ts.map((t) => t.rot)) / ts.length
      replace(api, ts, [{ type: 'number-bar', x: b.x + b.w / 2, y: b.y + b.h / 2, rot, color: ts[0].color, p: { ...ts[0].p, value: total, denominator: 0 } }], 'click')
    },
  },
  {
    id: 'show-labels',
    type: 'checkbox',
    tileTypes: ['number-bar', 'number-tile', 'number-grid', 'dot-machine'],
    label: 'Etiketleri göster:',
    icon: 'numbers',
    location: 'more',
    get: (t) => (t.type === 'number-grid' ? !t.p.hide : t.p.labels !== 'hidden'),
    set: (v: boolean, t) => (t.type === 'number-grid' ? p({ hide: !v, rev: [] }) : p({ labels: v ? undefined : 'hidden' })),
  },

  // --- Sayı çerçeveleri ------------------------------------------------------
  {
    id: 'frame-merge',
    type: 'button',
    tileTypes: ['number-frame'],
    label: 'Birleştir',
    icon: 'merge',
    text: true,
    show: (ts) => ts.length > 1,
    click: (ts, api) => {
      const { a, total } = organizeFrames(ts, centerOf(ts))
      const g = nframeGeom(total)
      replace(api, ts, [{ type: 'number-frame', x: round(a.x + g.W / 2), y: round(a.y + g.H / 2), rot: 0, p: { value: total } }], 'click')
    },
  },
  {
    id: 'frame-organize',
    type: 'button',
    tileTypes: ['number-frame'],
    label: 'Düzenle',
    icon: 'organize',
    show: (ts) => ts.length > 1,
    click: (ts, api) => {
      const { out } = organizeFrames(ts, centerOf(ts))
      for (const o of out) api.update(o.id, { x: o.x, y: o.y, rot: o.rot, flip: false })
      api.commit()
      api.sound('click')
    },
  },
  {
    id: 'frame-split',
    type: 'button',
    tileTypes: ['number-frame'],
    label: 'Böl',
    icon: 'split',
    text: true,
    show: (ts) => ts.some((t) => t.p.value > 1),
    click: (ts, api) =>
      replace(
        api,
        ts,
        ts.flatMap((t): New[] =>
          t.p.value <= 1
            ? [t]
            : Array.from({ length: nframeGeom(t.p.value).n }, (_, i) => {
                const c = toWorld(t, nframeCell(t.p.value, i))
                return { type: 'number-frame', x: c.x, y: c.y, rot: t.rot, p: { value: 1 } }
              }),
        ),
      ),
  },

  // --- Onluk çerçeve ve pullar ----------------------------------------------
  {
    id: 'fill',
    type: 'button',
    tileTypes: ['ten-frame'],
    label: 'Doldur',
    icon: 'fill',
    text: true,
    click: (ts, api) => {
      const add = ts.flatMap(fillFrame)
      if (add.length) api.add(add, false)
    },
  },
  {
    id: 'frame-count',
    type: 'checkbox',
    tileTypes: ['ten-frame'],
    label: 'Sayıyı göster:',
    icon: 'numbers',
    location: 'more',
    get: (t) => !!t.p.count,
    set: (v: boolean) => p({ count: v }),
  },
  {
    id: 'counter-flip',
    type: 'button',
    tileTypes: ['ten-frame-counter'],
    label: 'Çevir',
    icon: 'turn',
    text: true,
    click: (ts, api) => {
      for (const t of ts) api.update(t.id, flipCounter(t))
      api.commit()
    },
  },

  // --- Asal çarpan daireleri -------------------------------------------------
  {
    id: 'prime-labels',
    type: 'select',
    tileTypes: ['prime-disk'],
    label: 'Etiketler:',
    icon: 'numbers',
    location: 'more',
    options: [
      { key: 'all', label: 'Dilimler ve çarpım' },
      { key: 'sectors-only', label: 'Yalnızca dilimler' },
      { key: 'number', label: 'Çarpım' },
      { key: 'hidden', label: 'Hiçbiri' },
    ],
    get: (t) => t.p.labels ?? 'all',
    set: (v: string) => p({ labels: v }),
  },
  {
    id: 'prime-split',
    type: 'button',
    tileTypes: ['prime-disk'],
    label: 'Asal çarpanlarına ayır',
    icon: 'split-dots',
    location: 'more',
    show: (ts) => ts.some((t) => diskFactors(t.p.value).length > 1),
    click: (ts, api) =>
      replace(
        api,
        ts,
        ts.flatMap((t): New[] => {
          const fs = diskFactors(t.p.value)
          if (fs.length < 2) return [t]
          return fs.map((f, i) => ({ type: 'prime-disk', x: round(t.x + (i - (fs.length - 1) / 2) * (DISK_R * 2 + 12)), y: t.y, rot: 0, p: { value: f, labels: t.p.labels } }))
        }),
      ),
  },

  // --- Nokta dizilimleri -----------------------------------------------------
  {
    id: 'combine-factors',
    type: 'button',
    tileTypes: ['number-dot'],
    label: 'Çarpanları birleştir',
    icon: 'combine-dots',
    show: (ts) => ts.some((t) => dotFactors(t).length > 1),
    click: (ts, api) => {
      for (const t of ts) {
        const fs = dotFactors(t)
        if (fs.length <= 1) continue
        const b = fs.pop()!
        const a = fs.pop()!
        api.update(t.id, setDots([...fs, a * b]))
      }
      api.commit()
    },
  },
  {
    id: 'split-factors',
    type: 'button',
    tileTypes: ['number-dot'],
    label: 'Çarpanlara ayır',
    icon: 'split-dots',
    click: (ts, api) => {
      for (const t of ts) {
        const fs = dotFactors(t)
        // Sondan başlayarak asal olmayan ilk çarpanı en küçük asalına ayır
        let i = fs.length - 1
        while (i >= 0 && (isPrime(fs[i]) || fs[i] === 1)) i--
        if (i < 0) continue
        const q = primeFactors(fs[i])[0]
        fs.splice(i, 1, q, Math.round(fs[i] / q))
        api.update(t.id, setDots(fs))
      }
      api.commit()
    },
  },
  {
    id: 'reorder',
    type: 'button',
    tileTypes: ['number-dot'],
    label: 'Yeniden sırala',
    icon: 'swap',
    show: (ts) => ts.some((t) => dotFactors(t).length > 1),
    click: (ts, api) => {
      for (const t of ts) {
        const fs = dotFactors(t)
        if (fs.length > 1) api.update(t.id, setDots([...fs.slice(1), fs[0]]))
      }
      api.commit()
    },
  },
  {
    id: 'dot-count',
    type: 'input',
    tileTypes: ['number-dot'],
    label: 'Sayı:',
    location: 'more',
    value: 'number',
    range: [1, 999],
    get: (t) => dotFactors(t).reduce((a, b) => a * b, 1),
    set: (v: number) => {
      const n = Math.max(1, Math.min(999, Math.round(v)))
      return setDots(n === 1 ? [1] : primeFactors(n))
    },
  },

  // --- Sayı tabloları --------------------------------------------------------
  {
    id: 'switch-direction',
    type: 'button',
    tileTypes: ['number-grid'],
    label: 'Yönü değiştir',
    icon: 'flip-v',
    click: (ts, api) => {
      for (const t of ts) api.updateP(t.id, { isFlipped: !t.p.isFlipped })
      api.commit()
    },
  },
  {
    id: 'select-all-multiples',
    type: 'button',
    tileTypes: ['number-grid'],
    label: 'Tüm katları seç',
    icon: 'grid',
    show: (ts) => ts.length === 1 && Object.keys(ts[0].p.marks ?? {}).length > 0,
    click: (ts, api) => {
      const marks = markMultiples(ts[0])
      if (marks) api.updateP(ts[0].id, { marks }, true)
    },
  },
  {
    id: 'grid-start',
    type: 'input',
    tileTypes: ['number-grid'],
    label: 'Başlangıç değeri:',
    location: 'more',
    value: 'number',
    range: [-500, 500],
    show: (ts) => ts.every((t) => !gridInfo(t).table),
    get: (t) => t.p.start ?? 1,
    set: (v: number) => p({ start: Math.round(v), marks: {}, rev: [] }),
  },
  {
    id: 'grid-rows',
    type: 'input',
    tileTypes: ['number-grid'],
    label: 'Satır:',
    location: 'more',
    value: 'number',
    range: [1, 20],
    get: (t) => t.p.rows ?? 10,
    set: (v: number) => p({ rows: Math.round(v), marks: {}, rev: [] }),
  },
  {
    id: 'grid-cols',
    type: 'input',
    tileTypes: ['number-grid'],
    label: 'Sütun:',
    location: 'more',
    value: 'number',
    range: [1, 20],
    get: (t) => t.p.cols ?? 10,
    set: (v: number) => p({ cols: Math.round(v), marks: {}, rev: [] }),
  },
  {
    id: 'grid-clear',
    type: 'button',
    tileTypes: ['number-grid', 'decimal-grid'],
    label: 'Renkleri temizle',
    icon: 'reset',
    location: 'more',
    click: (ts, api) => {
      for (const t of ts) api.updateP(t.id, t.type === 'decimal-grid' ? { cells: [] } : { marks: {}, rev: [] })
      api.commit()
    },
  },
  {
    id: 'decimal-label',
    type: 'checkbox',
    tileTypes: ['decimal-grid'],
    label: 'Değeri göster:',
    icon: 'numbers',
    location: 'more',
    get: (t) => !!t.p.label,
    set: (v: boolean) => p({ label: v }),
  },

  // --- Atlamalar ve sayı doğrusu --------------------------------------------
  {
    id: 'jump-flip',
    type: 'button',
    tileTypes: ['multi-jump'],
    label: 'Çevir',
    icon: 'flip',
    text: true,
    click: (ts, api) => {
      for (const t of ts) {
        const flipped = !t.p.isFlipped
        // Varsayılan renk yönle birlikte değişir; kullanıcının seçtiği renk korunur
        const color = !t.color || t.color === JUMP_POS || t.color === JUMP_NEG ? (flipped ? JUMP_NEG : JUMP_POS) : t.color
        api.update(t.id, { color, p: { ...t.p, isFlipped: flipped } })
      }
      api.commit()
    },
  },
  {
    id: 'jump-count',
    type: 'input',
    tileTypes: ['multi-jump'],
    label: 'Atlama sayısı:',
    location: 'more',
    value: 'number',
    range: [1, 20],
    show: (ts) => ts.every((t) => !t.p.single),
    get: (t) => t.p.n ?? 3,
    set: (v: number) => p({ n: Math.round(v) }),
  },
  {
    id: 'jump-size',
    type: 'input',
    tileTypes: ['multi-jump'],
    label: 'Atlama büyüklüğü:',
    location: 'more',
    value: 'number',
    range: [0.5, 50],
    step: 0.5,
    get: (t) => jumpInfo(t).size,
    set: (v: number) => p({ size: v }),
  },
  {
    id: 'start',
    type: 'input',
    tileTypes: ['number-line'],
    label: 'Başlangıç:',
    value: 'text',
    get: (t) => lineInfo(t).start,
    set: (v: string, t) => p({ ...lineProps(t), start: parseQ(v) ? String(v).trim() : lineInfo(t).start }),
  },
  {
    id: 'step',
    type: 'input',
    tileTypes: ['number-line'],
    label: 'Adım:',
    value: 'text',
    get: (t) => lineInfo(t).step,
    set: (v: string, t) => {
      const q = parseQ(v)
      return p({ ...lineProps(t), step: q && q.n ? String(v).trim() : lineInfo(t).step })
    },
  },
  {
    id: 'width',
    type: 'input',
    tileTypes: ['number-line'],
    label: 'Genişlik:',
    location: 'more',
    value: 'number',
    range: [1, 25],
    get: (t) => lineInfo(t).size,
    set: (v: number, t) => {
      const i = lineInfo(t)
      const size = round(v, 2)
      const c = keepLeft(t, i.len, i.width * size * UNIT)
      return { x: c.x, y: c.y, p: { ...lineProps(t), size } }
    },
  },
  {
    id: 'line-divisions',
    type: 'input',
    tileTypes: ['number-line'],
    label: 'Ara bölmeler:',
    location: 'more',
    value: 'number',
    range: [1, 25],
    get: (t) => lineInfo(t).minor,
    set: (v: number, t) => p({ ...lineProps(t), minor: Math.round(v) }),
  },
  {
    id: 'line-labels',
    type: 'select',
    tileTypes: ['number-line'],
    label: 'Etiketler:',
    location: 'more',
    options: [
      { key: 'below', label: 'Altta' },
      { key: 'above', label: 'Üstte' },
      { key: 'hidden', label: 'Yok' },
    ],
    get: (t) => (t.p.labels === true || t.p.labels == null ? 'below' : t.p.labels === false ? 'hidden' : t.p.labels),
    set: (v: string) => p({ labels: v }),
  },
  {
    id: 'simplify',
    type: 'select',
    tileTypes: ['number-line'],
    label: 'Kesirleri sadeleştir:',
    location: 'more',
    options: [
      { key: 'all', label: 'Tümü' },
      { key: 'integers', label: 'Tam sayılar' },
      { key: 'none', label: 'Hiçbiri' },
    ],
    get: (t) => t.p.simplify ?? 'all',
    set: (v: string) => p({ simplify: v }),
  },
  {
    id: 'line-arrows',
    type: 'select',
    tileTypes: ['number-line'],
    label: 'Oklar:',
    location: 'more',
    options: [
      { key: 'both', label: 'İki yönde' },
      { key: 'positive', label: 'Pozitif yönde' },
      { key: 'none', label: 'Yok' },
    ],
    get: (t) => t.p.arrows ?? 'none',
    set: (v: string) => p({ arrows: v }),
  },

  // --- El karoları -----------------------------------------------------------
  {
    id: 'hand-subtract',
    type: 'button',
    tileTypes: ['hand-tile'],
    label: 'Çıkar',
    icon: 'minus',
    click: (ts, api) => {
      for (const t of ts) if ((t.p.value ?? 0) > 0) api.updateP(t.id, { value: t.p.value - 1 })
      api.commit()
    },
  },
  {
    id: 'hand-add',
    type: 'button',
    tileTypes: ['hand-tile'],
    label: 'Ekle',
    icon: 'add',
    click: (ts, api) => {
      // Tek bir 5'lik el seçiliyse yanına yeni bir el (1) eklenir
      if (ts.length === 1 && ts[0].p.value === 5) {
        const t = ts[0]
        const c = toWorld(t, { x: t.flip ? -HAND_W : HAND_W, y: 0 })
        api.add([{ type: 'hand-tile', x: c.x, y: c.y, rot: t.rot, flip: !t.flip, color: t.color, p: { ...t.p, value: 1 } }], true)
        return
      }
      for (const t of ts) if ((t.p.value ?? 0) < 5) api.updateP(t.id, { value: t.p.value + 1 })
      api.commit()
    },
  },
  {
    id: 'hand-flip',
    type: 'button',
    tileTypes: ['hand-tile'],
    label: 'Yansıt',
    icon: 'flip-h',
    click: (ts, api) => {
      for (const t of ts) api.update(t.id, { flip: !t.flip })
      api.commit()
    },
  },

  // --- Abaküs ----------------------------------------------------------------
  {
    id: 'abacus-values',
    type: 'checkbox',
    tileTypes: ['abacus'],
    label: 'Sayıları göster:',
    icon: 'numbers',
    location: 'more',
    get: (t) => !!t.p.values,
    set: (v: boolean) => p({ values: v }),
  },
  {
    id: 'abacus-rows',
    type: 'input',
    tileTypes: ['abacus'],
    label: 'Sıra:',
    location: 'more',
    value: 'number',
    range: [1, 10],
    get: (t) => t.p.rows ?? 10,
    set: (v: number) => p({ rows: Math.round(v) }),
  },
  {
    id: 'abacus-reset',
    type: 'button',
    tileTypes: ['abacus'],
    label: 'Sıfırla',
    icon: 'reset',
    location: 'more',
    click: (ts, api) => {
      for (const t of ts) api.updateP(t.id, { counts: Array(10).fill(0) })
      api.commit()
    },
  },

  // --- Patlayan noktalar -----------------------------------------------------
  {
    id: 'base',
    type: 'input',
    tileTypes: ['dot-machine'],
    label: 'Taban:',
    value: 'number',
    range: [2, 25],
    get: (t) => machineInfo(t).base,
    set: (v: number) => p({ base: Math.round(v) }),
  },
  {
    id: 'boxes',
    type: 'input',
    tileTypes: ['dot-machine'],
    label: 'Kutu:',
    value: 'number',
    range: [1, 10],
    get: (t) => machineInfo(t).n,
    set: (v: number) => p({ boxes: Math.round(v) }),
  },
  {
    id: 'explode',
    type: 'button',
    tileTypes: ['dot-machine'],
    label: 'Patlat',
    text: true,
    show: machineHasDots,
    click: (ts, api) => ts.forEach((t) => explodeMachine(t, api)),
  },
  {
    id: 'annihilate',
    type: 'button',
    tileTypes: ['dot-machine'],
    label: 'Yok et',
    text: true,
    show: machineHasDots,
    click: (ts, api) => ts.forEach((t) => annihilateMachine(t, api)),
  },
  {
    id: 'explode-speed',
    type: 'select',
    tileTypes: ['dot-machine'],
    label: 'Hız:',
    location: 'more',
    options: [
      { key: 'slow', label: 'Yavaş' },
      { key: 'medium', label: 'Orta' },
      { key: 'fast', label: 'Hızlı' },
    ],
    get: (t) => t.p.speed ?? 'fast',
    set: (v: string) => p({ speed: v }),
  },
  {
    id: 'unexplode',
    type: 'button',
    tileTypes: ['dot-machine'],
    label: 'Geri patlat',
    icon: 'split-dots',
    location: 'more',
    show: machineHasDots,
    click: (ts, api) => {
      for (const t of ts) {
        const { n, base } = machineInfo(t)
        const boxes = dotsInBoxes(t, api.all())
        for (let i = 0; i < n - 1; i++) {
          const d = boxes[i].pos[0] ?? boxes[i].neg[0]
          if (!d) continue
          api.remove([d.id])
          api.add(
            Array.from({ length: base }, () => {
              const w = randomIn(t, i + 1)
              return makeTile('dot', { value: d.p.value }, w.x, w.y)
            }),
            false,
          )
          api.sound('pop')
          break
        }
      }
    },
  },

  // --- Sıfır kovası ----------------------------------------------------------
  {
    id: 'bucket-fill',
    type: 'button',
    tileTypes: ['bucket'],
    label: 'Doldur',
    icon: 'fill',
    text: true,
    click: (ts, api) => {
      const add: New[] = []
      for (const t of ts) {
        const inside = allTiles().filter((o) => unitAlgebra(o) && inBucket(t, o))
        const taken = new Set<number>()
        // Var olan karolar ilk boş yuvalara sayılır
        let pos = inside.filter((o) => o.p.expr === '1').length
        let neg = inside.filter((o) => o.p.expr === '-1').length
        for (let i = 0; i < 10 && pos; i++, pos--) taken.add(i)
        for (let i = 10; i < 20 && neg; i++, neg--) taken.add(i)
        for (let i = 0; i < 20; i++) {
          if (taken.has(i)) continue
          const c = toWorld(t, bucketSlot(i))
          add.push(makeTile('algebra', { expr: i < 10 ? '1' : '-1' }, c.x, c.y))
        }
      }
      if (add.length) {
        api.add(add, false)
        api.sound('pop')
      }
    },
  },
]
