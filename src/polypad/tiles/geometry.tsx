import type { Box, Pt, Tile, TileDef } from '../types'
import { boundsOf, centerPts, clamp, deg, dist, fmt, mod, pathOf, rad, rotate, round, shade, toWorld } from '../geom'
import { C, Label, UNIT, action, edge, ptsBox, toggle } from './kit'

// ---------------------------------------------------------------------------
// Ortak yardımcılar
// ---------------------------------------------------------------------------

const PHI = (1 + Math.sqrt(5)) / 2
const SQ3 = Math.sqrt(3)

/** SVG açısıyla (y aşağı) yay noktaları */
function arcPts(cx: number, cy: number, r: number, a0: number, a1: number, n = 16): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = rad(a0 + ((a1 - a0) * i) / n)
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  })
}

const boxOfPts = (pts: Pt[], m = 0): Box => {
  const b = boundsOf(pts)
  return { x: b.x - m, y: b.y - m, w: b.w + 2 * m, h: b.h + 2 * m }
}

/** Düz dolgulu çokgen parça */
function Piece({ pts, color }: { pts: Pt[]; color: string }) {
  return <path d={pathOf(pts)} fill={color} stroke={edge(color)} strokeWidth={1.5} strokeLinejoin="round" />
}

/** Noktaları sabit çokgen olan parça tanımı kurucusu */
function shapeTile(type: string, name: string, shapes: (t: Tile) => { pts: Pt[]; color: string }, extra: Partial<TileDef> = {}): TileDef {
  return {
    type,
    name: () => name,
    create: (p) => ({ color: shapes({ id: '', type, x: 0, y: 0, rot: 0, p } as Tile).color }),
    outline: (t) => shapes(t).pts,
    bounds: (t) => ptsBox(shapes(t).pts),
    render: (t) => <Piece pts={shapes(t).pts} color={t.color ?? shapes(t).color} />,
    colorable: true,
    flippable: true,
    ...extra,
  }
}

// ---------------------------------------------------------------------------
// Poliominolar
// ---------------------------------------------------------------------------

const POLYOMINOES: [number, number][][] = [
  // Pentominolar: F I L N P T U V W X Y Z
  [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]],
  [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
  [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]],
  [[1, 0], [1, 1], [0, 2], [1, 2], [0, 3]],
  [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]],
  [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]],
  [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]],
  [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
  [[1, 0], [0, 1], [1, 1], [1, 2], [1, 3]],
  [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2]],
  // Tetrominolar: I O T S L
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[1, 0], [2, 0], [0, 1], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 2]],
]
const POLY_NAMES = ['F', 'I', 'L', 'N', 'P', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'I', 'O', 'T', 'S', 'L']
const POLY_COLORS = [C.red, C.orange, C.yellow, C.green, C.teal, C.blue, C.purple, C.pink, C.dOrange, C.dBlue, C.dGreen, C.dPink, C.lBlue, C.lOrange, C.lPurple, C.lGreen, C.lRed]

/** Hücrelerin birleşiminin dış sınırı (dışbükey olmayabilir), köşeleri merkezli */
const polyCache = new Map<number, { pts: Pt[]; cells: Pt[] }>()
function polyomino(index: number) {
  const i = clamp(Math.round(index) || 0, 0, POLYOMINOES.length - 1)
  const hit = polyCache.get(i)
  if (hit) return hit
  const cells = POLYOMINOES[i]
  const key = (x: number, y: number) => `${x},${y}`
  const edges = new Map<string, [number, number]>()
  const add = (x1: number, y1: number, x2: number, y2: number) => {
    const rev = `${key(x2, y2)}>${key(x1, y1)}`
    if (edges.has(rev)) edges.delete(rev)
    else edges.set(`${key(x1, y1)}>${key(x2, y2)}`, [x2, y2])
  }
  for (const [x, y] of cells) {
    add(x, y, x + 1, y)
    add(x + 1, y, x + 1, y + 1)
    add(x + 1, y + 1, x, y + 1)
    add(x, y + 1, x, y)
  }
  const next = new Map<string, [number, number]>()
  for (const [k, v] of edges) next.set(k.split('>')[0], v)
  const [startKey] = next.keys()
  const raw: [number, number][] = []
  let cur = startKey
  do {
    const [x, y] = cur.split(',').map(Number)
    raw.push([x, y])
    const n = next.get(cur)!
    cur = key(n[0], n[1])
  } while (cur !== startKey && raw.length < 100)
  // Doğrusal köşeleri at
  const pts = raw.filter((p, j) => {
    const a = raw[(j - 1 + raw.length) % raw.length]
    const b = raw[(j + 1) % raw.length]
    return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) !== 0
  })
  const xs = cells.map((c) => c[0])
  const ys = cells.map((c) => c[1])
  const cx = (Math.min(...xs) + Math.max(...xs) + 1) / 2
  const cy = (Math.min(...ys) + Math.max(...ys) + 1) / 2
  const out = {
    pts: pts.map(([x, y]) => ({ x: (x - cx) * UNIT, y: (y - cy) * UNIT })),
    cells: cells.map(([x, y]) => ({ x: (x - cx) * UNIT, y: (y - cy) * UNIT })),
  }
  polyCache.set(i, out)
  return out
}

const polyominoTile: TileDef = {
  type: 'polyomino',
  name: (t) => `${(t.p.index ?? 0) < 12 ? 'Pentomino' : 'Tetromino'} ${POLY_NAMES[t.p.index ?? 0] ?? ''}`,
  create: (p) => ({ color: POLY_COLORS[(p.index ?? 0) % POLY_COLORS.length] }),
  outline: (t) => polyomino(t.p.index).pts,
  bounds: (t) => ptsBox(polyomino(t.p.index).pts),
  render: (t) => {
    const { pts, cells } = polyomino(t.p.index)
    const color = t.color ?? C.blue
    return (
      <>
        <path d={pathOf(pts)} fill={color} />
        <path d={cells.map((c) => `M${c.x} ${c.y}h${UNIT}v${UNIT}h${-UNIT}z`).join('')} fill="none" stroke="rgba(255,255,255,.4)" strokeWidth={1} />
        <path d={pathOf(pts)} fill="none" stroke={edge(color)} strokeWidth={1.5} strokeLinejoin="round" />
      </>
    )
  },
  colorable: true,
  flippable: true,
  gridSnap: true,
  rotStep: 90,
}

// ---------------------------------------------------------------------------
// Tangram ve sihirli yumurta
// ---------------------------------------------------------------------------

const TG = (6 * UNIT) / 4
const TANGRAM: { pts: Pt[]; color: string }[] = (
  [
    [[[0, 0], [4, 0], [2, 2]], C.red],
    [[[0, 0], [2, 2], [0, 4]], C.blue],
    [[[4, 2], [4, 4], [2, 4]], C.purple],
    [[[2, 2], [3, 1], [3, 3]], C.yellow],
    [[[0, 4], [1, 3], [2, 4]], C.teal],
    [[[2, 2], [3, 3], [2, 4], [1, 3]], C.orange],
    [[[3, 1], [4, 0], [4, 2], [3, 3]], C.green],
  ] as [[number, number][], string][]
).map(([pts, color]) => ({ pts: centerPts(pts.map(([x, y]) => ({ x: x * TG, y: y * TG }))), color }))

const tangramTile = shapeTile('tangram', 'Tangram parçası', (t) => TANGRAM[clamp(t.p.index ?? 0, 0, 6)])

/** Kolomb yumurtası: alt yarım daire 4 dilim, 2 üçgen, 2 kanat ve tepe başlığı */
const EGG: { pts: Pt[]; color: string }[] = (() => {
  const r = 2.2 * UNIT
  const A = { x: -r, y: 0 }
  const B = { x: r, y: 0 }
  const Ct = { x: 0, y: -r }
  const O = { x: 0, y: 0 }
  const rc = 2 * r - Math.SQRT2 * r
  const sector = (a0: number, a1: number) => [O, ...arcPts(0, 0, r, a0, a1, 10)]
  const pieces: [Pt[], string][] = [
    [sector(135, 180), C.orange],
    [sector(0, 45), C.red],
    [[A, O, Ct], C.blue],
    [[O, B, Ct], C.teal],
    [[...arcPts(B.x, B.y, 2 * r, 180, 225, 12), Ct], C.purple],
    [[...arcPts(A.x, A.y, 2 * r, 0, -45, 12), Ct].reverse(), C.pink],
    [[Ct, ...arcPts(Ct.x, Ct.y, rc, -45, -135, 12)], C.green],
    [sector(90, 135), C.yellow],
    [sector(45, 90), C.dOrange],
  ]
  return pieces.map(([pts, color]) => ({ pts: centerPts(pts), color }))
})()

const eggTile = shapeTile('egg', 'Sihirli yumurta parçası', (t) => EGG[clamp(t.p.index ?? 0, 0, 8)])

// ---------------------------------------------------------------------------
// Periyodik olmayan karolar
// ---------------------------------------------------------------------------

const HAT: Pt[] = (() => {
  const s = 15
  const hex = (x: number, y: number) => ({ x: (x + 0.5 * y) * s, y: (SQ3 / 2) * y * s })
  const raw: [number, number][] = [[0, 0], [-1, -1], [0, -2], [2, -2], [2, -1], [4, -2], [5, -1], [4, 0], [3, 0], [2, 2], [0, 3], [0, 2], [-1, 2]]
  return centerPts(raw.map(([x, y]) => hex(x, y)))
})()

const hatTile = shapeTile('aperiodic-hat', 'Einstein şapkası', () => ({ pts: HAT, color: C.lBlue }), { rotStep: 30 })

const PS = 55
const KITE: Pt[] = [
  { x: 0, y: 0 },
  { x: PHI * Math.sin(rad(36)), y: PHI * Math.cos(rad(36)) },
  { x: 0, y: PHI },
  { x: -PHI * Math.sin(rad(36)), y: PHI * Math.cos(rad(36)) },
].map((p) => ({ x: p.x * PS, y: p.y * PS }))
const DART: Pt[] = [
  { x: 0, y: 0 },
  { x: PHI * Math.sin(rad(36)), y: PHI * Math.cos(rad(36)) },
  { x: 0, y: 1 },
  { x: -PHI * Math.sin(rad(36)), y: PHI * Math.cos(rad(36)) },
].map((p) => ({ x: p.x * PS, y: p.y * PS }))

/** Penrose karoları: yerel koordinatı ağırlık merkezine göre kaydırılmış köşeler ve beyaz yay dekorasyonu */
const PENROSE = [KITE, DART].map((raw, i) => {
  const b = boundsOf(raw)
  const off = { x: b.x + b.w / 2, y: b.y + b.h / 2 }
  const pts = raw.map((p) => ({ x: p.x - off.x, y: p.y - off.y }))
  const [A, , Cc] = pts
  const long = PS / PHI
  const short = PS / PHI ** 2
  const angA = 90 // eksen aşağı
  const arcs = [
    arcPts(A.x, A.y, i === 0 ? long : short * PHI, angA - 36, angA + 36, 14),
    i === 0 ? arcPts(Cc.x, Cc.y, short, -90 - 72, -90 + 72, 14) : arcPts(Cc.x, Cc.y, short, 18, -198, 20),
  ]
  return { pts, arcs, color: i === 0 ? C.orange : C.blue }
})

const penroseTile: TileDef = {
  type: 'penrose',
  name: (t) => (t.p.index ? 'Penrose oku' : 'Penrose uçurtması'),
  create: (p) => ({ color: PENROSE[p.index ? 1 : 0].color }),
  outline: (t) => PENROSE[t.p.index ? 1 : 0].pts,
  bounds: (t) => ptsBox(PENROSE[t.p.index ? 1 : 0].pts),
  render: (t) => {
    const s = PENROSE[t.p.index ? 1 : 0]
    return (
      <>
        <Piece pts={s.pts} color={t.color ?? s.color} />
        {s.arcs.map((a, i) => (
          <path key={i} d={pathOf(a, false)} fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" style={{ pointerEvents: 'none' }} />
        ))}
      </>
    )
  },
  colorable: true,
  flippable: true,
  rotStep: 36,
}

// ---------------------------------------------------------------------------
// Doğa karoları (özgün desenler, altıgen tabanda; saplar kenar ortalarında birleşir)
// ---------------------------------------------------------------------------

const HEX_S = 36
const flatHex = (s: number) => Array.from({ length: 6 }, (_, i) => ({ x: s * Math.cos(rad(60 * i)), y: s * Math.sin(rad(60 * i)) }))
const HEX_PTS = flatHex(HEX_S)
/** Düz tepeli altıgende i. kenarın ortası ve içe dönük birim normal */
const hexMid = (s: number, i: number) => {
  const a = rad(30 + 60 * i)
  const r = (s * SQ3) / 2
  return { m: { x: r * Math.cos(a), y: r * Math.sin(a) }, n: { x: -Math.cos(a), y: -Math.sin(a) } }
}
/** Kenar ortaları arasında, kenarlara dik çıkan eğri */
function hexLink(s: number, i: number, j: number) {
  const d = mod(j - i, 6)
  const a = hexMid(s, i)
  const b = hexMid(s, j)
  if (d === 3) return `M${round(a.m.x)} ${round(a.m.y)}L${round(b.m.x)} ${round(b.m.y)}`
  const k = (d === 1 || d === 5 ? 0.3 : 0.62) * s
  return `M${round(a.m.x)} ${round(a.m.y)}C${round(a.m.x + a.n.x * k)} ${round(a.m.y + a.n.y * k)} ${round(b.m.x + b.n.x * k)} ${round(b.m.y + b.n.y * k)} ${round(b.m.x)} ${round(b.m.y)}`
}

type Deco = 'flower' | 'leaf' | 'berry' | 'sun' | 'bud' | 'clover' | 'mushroom' | 'snail'
const GARDEN: { bg: string; links: [number, number][]; deco: Deco; dc: string }[] = [
  { bg: '#d9efc4', links: [[0, 3]], deco: 'flower', dc: C.pink },
  { bg: '#f3eab0', links: [[0, 2], [3, 5]], deco: 'leaf', dc: C.green },
  { bg: '#cfe7f5', links: [[1, 4]], deco: 'berry', dc: C.red },
  { bg: '#fde2c4', links: [[0, 1], [2, 4]], deco: 'sun', dc: C.orange },
  { bg: '#e4dcf3', links: [[1, 3], [4, 0]], deco: 'bud', dc: C.purple },
  { bg: '#d4f0ea', links: [[2, 5]], deco: 'clover', dc: C.dGreen },
  { bg: '#f6d6dd', links: [[5, 1], [2, 3]], deco: 'mushroom', dc: C.red },
  { bg: '#eef0cf', links: [[0, 4], [1, 2]], deco: 'snail', dc: C.dOrange },
]

function GardenDeco({ deco, c }: { deco: Deco; c: string }) {
  switch (deco) {
    case 'flower':
      return (
        <g>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={0} cy={-7} rx={4.5} ry={7} fill={c} transform={`rotate(${a})`} />
          ))}
          <circle r={4} fill="#fec680" />
        </g>
      )
    case 'leaf':
      return (
        <g>
          <path d="M-10 6C-10 -6 2 -12 12 -12C12 0 4 10 -10 6Z" fill={c} />
          <path d="M-10 6L8 -9" stroke="#187819" strokeWidth={1.2} />
        </g>
      )
    case 'berry':
      return (
        <g>
          {[[-5, 2], [5, 2], [0, -6]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r={5} fill={c} stroke="#a5321b" strokeWidth={1} />
          ))}
        </g>
      )
    case 'sun':
      return (
        <g>
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d="M0 -9L0 -14" stroke={c} strokeWidth={2.5} strokeLinecap="round" transform={`rotate(${i * 45})`} />
          ))}
          <circle r={7} fill={c} />
        </g>
      )
    case 'bud':
      return <path d="M0 10C-8 2 -7 -8 0 -12C7 -8 8 2 0 10Z" fill={c} stroke="#4c2986" strokeWidth={1} />
    case 'clover':
      return (
        <g>
          {[0, 120, 240].map((a) => (
            <circle key={a} cx={0} cy={-5.5} r={5.5} fill={c} transform={`rotate(${a})`} />
          ))}
        </g>
      )
    case 'mushroom':
      return (
        <g>
          <rect x={-3} y={-1} width={6} height={10} rx={2} fill="#f7eecb" />
          <path d="M-11 0C-11 -9 11 -9 11 0Z" fill={c} />
          <circle cx={-4} cy={-4} r={1.5} fill="#fff" />
          <circle cx={4} cy={-5} r={1.5} fill="#fff" />
        </g>
      )
    case 'snail':
      return (
        <g>
          <path d="M-12 7H10C12 7 12 3 10 3" fill="none" stroke="#b16200" strokeWidth={2} strokeLinecap="round" />
          <circle cx={-2} cy={-1} r={7} fill={c} />
          <path d="M-2 -1m-3.5 0a3.5 3.5 0 1 0 3.5 -3.5" fill="none" stroke="#f7eecb" strokeWidth={1.5} />
        </g>
      )
  }
}

const gardenTile: TileDef = {
  type: 'garden',
  name: () => 'Doğa karosu',
  outline: () => HEX_PTS,
  bounds: () => ptsBox(HEX_PTS),
  render: (t) => {
    const g = GARDEN[clamp(t.p.index ?? 0, 0, 7)]
    return (
      <>
        <path d={pathOf(HEX_PTS)} fill={g.bg} stroke={edge(g.bg)} strokeWidth={1.5} strokeLinejoin="round" />
        <path d={g.links.map(([i, j]) => hexLink(HEX_S, i, j)).join('')} fill="none" stroke={C.dGreen} strokeWidth={4} strokeLinecap="butt" />
        <GardenDeco deco={g.deco} c={g.dc} />
      </>
    )
  },
  rotStep: 60,
}

// ---------------------------------------------------------------------------
// Tantrix karoları: 6 kenar ortası 3 çift olarak bağlanır (merkezden geçen üçlü düz hariç 14 eşleme)
// ---------------------------------------------------------------------------

const TANTRIX_COLORS = ['#eb4726', '#f5d000', '#0f82f2', '#22ab24']
const MATCHINGS: [number, number][][] = (() => {
  const out: [number, number][][] = []
  const rec = (rest: number[], acc: [number, number][]) => {
    if (!rest.length) return out.push(acc)
    const [a, ...others] = rest
    others.forEach((b) => rec(others.filter((x) => x !== b), [...acc, [a, b]]))
  }
  rec([0, 1, 2, 3, 4, 5], [])
  // Üç düz çizginin merkezde kesiştiği eşleme Tantrix'te yoktur
  return out.filter((m) => !m.every(([a, b]) => b - a === 3))
})()

const TX_S = 34
const TX_PTS = flatHex(TX_S)
const tantrixTile: TileDef = {
  type: 'tantrix',
  name: () => 'Tantrix karosu',
  outline: () => TX_PTS,
  bounds: () => ptsBox(TX_PTS),
  render: (t) => {
    const i = clamp(t.p.index ?? 0, 0, MATCHINGS.length - 1)
    const skip = i % 4
    const cols = [0, 1, 2, 3].filter((c) => c !== skip)
    const rot = Math.floor(i / 4) % 3
    return (
      <>
        <path d={pathOf(TX_PTS)} fill="#1b1b24" stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
        {MATCHINGS[i].map(([a, b], k) => (
          <path key={k} d={hexLink(TX_S, a, b)} fill="none" stroke={TANTRIX_COLORS[cols[(k + rot) % 3]]} strokeWidth={6.5} />
        ))}
      </>
    )
  },
  rotStep: 60,
}

// ---------------------------------------------------------------------------
// Kolam karoları: kare zemin, ortada nokta, kenar ortalarından dik çıkan beyaz çizgiler
// ---------------------------------------------------------------------------

const KH = UNIT
const KOLAM: string[] = [
  `M14 0A14 14 0 1 1 -14 0A14 14 0 1 1 14 0Z`,
  `M0 ${-KH}C0 -16 20 -20 20 0C20 20 0 16 0 ${KH}`,
  `M0 ${-KH}C0 -18 -20 -18 -18 0C-16 18 18 22 18 10C18 0 22 0 ${KH} 0`,
  `M0 ${-KH}Q0 0 ${KH} 0M0 ${KH}Q0 0 ${-KH} 0`,
  `M0 ${-KH}Q2 -2 ${KH} 0M${KH} 0Q2 2 0 ${KH}M0 ${KH}Q-2 2 ${-KH} 0M${-KH} 0Q-2 -2 0 ${-KH}`,
  `M0 ${-KH}C-22 -12 -22 12 0 ${KH}M${KH} 0C12 22 -12 22 ${-KH} 0`,
]
const KOLAM_PTS: Pt[] = [{ x: -KH, y: -KH }, { x: KH, y: -KH }, { x: KH, y: KH }, { x: -KH, y: KH }]

const kolamTile: TileDef = {
  type: 'kolam',
  name: () => 'Kolam karosu',
  create: () => ({ color: '#3a3645' }),
  outline: () => KOLAM_PTS,
  bounds: () => ptsBox(KOLAM_PTS),
  render: (t) => {
    const bg = t.color ?? '#3a3645'
    return (
      <>
        <rect x={-KH} y={-KH} width={KH * 2} height={KH * 2} fill={bg} stroke={edge(bg)} strokeWidth={1.5} />
        <path d={KOLAM[clamp(t.p.index ?? 0, 0, 5)]} fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" />
        <circle r={3.5} fill="#fff" />
      </>
    )
  },
  colorable: true,
  gridSnap: true,
  rotStep: 90,
}

// ---------------------------------------------------------------------------
// 3B cisimler
// ---------------------------------------------------------------------------

type V3 = [number, number, number]
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm3 = (a: V3): V3 => {
  const l = Math.hypot(...a) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}

/** Dışbükey zarf yüzleri (köşe sayısı az olduğu için kaba kuvvet yeterli) */
function hull(vs: V3[]): number[][] {
  const eps = 1e-6
  const faces: number[][] = []
  const seen = new Set<string>()
  const n = vs.length
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++) {
        let nm = cross(sub(vs[j], vs[i]), sub(vs[k], vs[i]))
        if (Math.hypot(...nm) < eps) continue
        nm = norm3(nm)
        let d = dot3(nm, vs[i])
        let pos = false
        let neg = false
        for (const v of vs) {
          const s = dot3(nm, v) - d
          if (s > eps) pos = true
          else if (s < -eps) neg = true
        }
        if (pos && neg) continue
        if (pos) {
          nm = [-nm[0], -nm[1], -nm[2]]
          d = -d
        }
        const idx = vs.map((v, q) => (Math.abs(dot3(nm, v) - d) < eps ? q : -1)).filter((q) => q >= 0)
        const key = idx.join(',')
        if (seen.has(key)) continue
        seen.add(key)
        const c: V3 = [0, 1, 2].map((a) => idx.reduce((s, q) => s + vs[q][a], 0) / idx.length) as V3
        const u = norm3(sub(vs[idx[0]], c))
        const w = cross(nm, u)
        idx.sort((a, b) => {
          const da = sub(vs[a], c)
          const db = sub(vs[b], c)
          return Math.atan2(dot3(w, da), dot3(u, da)) - Math.atan2(dot3(w, db), dot3(u, db))
        })
        faces.push(idx)
      }
  return faces
}

/** 2B açınım yardımcıları (model birimiyle) */
function ngonOnEdge(p: Pt, q: Pt, n: number): Pt[] {
  const pts = [p, q]
  let a = Math.atan2(q.y - p.y, q.x - p.x)
  const len = dist(p, q)
  for (let i = 2; i < n; i++) {
    a -= (2 * Math.PI) / n
    const last = pts[pts.length - 1]
    pts.push({ x: last.x + len * Math.cos(a), y: last.y + len * Math.sin(a) })
  }
  return pts
}
const across = (poly: Pt[], i: number, n: number) => ngonOnEdge(poly[(i + 1) % poly.length], poly[i], n)

function netTetra(e: number) {
  const t0 = ngonOnEdge({ x: 0, y: 0 }, { x: e, y: 0 }, 3)
  return [t0, across(t0, 0, 3), across(t0, 1, 3), across(t0, 2, 3)]
}
function netCube(e: number) {
  const s0 = ngonOnEdge({ x: 0, y: 0 }, { x: e, y: 0 }, 4)
  const n = [0, 1, 2, 3].map((i) => across(s0, i, 4))
  return [s0, ...n, across(n[0], 2, 4)]
}
function netOcta(e: number) {
  const N = { x: 0, y: 0 }
  const P = [0, 1, 2, 3, 4].map((i) => ({ x: e * Math.cos(rad(60 * i)), y: e * Math.sin(rad(60 * i)) }))
  const out: Pt[][] = []
  for (let i = 0; i < 4; i++) {
    out.push([N, P[i], P[i + 1]])
    out.push([P[i], { x: P[i].x + P[i + 1].x - N.x, y: P[i].y + P[i + 1].y - N.y }, P[i + 1]])
  }
  return out
}
function netIcosa(e: number) {
  const L = (i: number, j: number) => ({ x: i * e + (j * e) / 2, y: (-j * e * SQ3) / 2 })
  const out: Pt[][] = []
  for (let k = 0; k < 5; k++) {
    out.push([L(k, 1), L(k + 1, 1), L(k, 2)], [L(k + 1, 1), L(k + 1, 2), L(k, 2)], [L(k, 2), L(k + 1, 2), L(k, 3)], [L(k + 1, 0), L(k + 1, 1), L(k, 1)])
  }
  return out
}
function netDodeca(e: number) {
  const c0 = ngonOnEdge({ x: 0, y: 0 }, { x: e, y: 0 }, 5)
  const flower = [c0, ...[0, 1, 2, 3, 4].map((i) => across(c0, i, 5))]
  const petal = flower[1]
  const m = { x: (petal[2].x + petal[3].x) / 2, y: (petal[2].y + petal[3].y) / 2 }
  const flip = (p: Pt) => ({ x: 2 * m.x - p.x, y: 2 * m.y - p.y })
  return [...flower, ...flower.map((poly) => poly.map(flip))]
}
function netPrism(a: number, h: number) {
  const rects = [0, 1, 2].map((i) => [
    { x: i * a, y: 0 },
    { x: (i + 1) * a, y: 0 },
    { x: (i + 1) * a, y: h },
    { x: i * a, y: h },
  ])
  const m = rects[1]
  return [...rects, [m[0], { x: m[0].x + a / 2, y: (-a * SQ3) / 2 }, m[1]], [m[3], m[2], { x: m[3].x + a / 2, y: h + (a * SQ3) / 2 }]]
}
function netPyramid(b: number, slant: number) {
  const sq = [
    { x: 0, y: 0 },
    { x: b, y: 0 },
    { x: b, y: b },
    { x: 0, y: b },
  ]
  const tris = [0, 1, 2, 3].map((i) => {
    const p = sq[i]
    const q = sq[(i + 1) % 4]
    const mx = (p.x + q.x) / 2 - b / 2
    const my = (p.y + q.y) / 2 - b / 2
    const l = Math.hypot(mx, my)
    return [p, { x: (p.x + q.x) / 2 + (mx / l) * slant, y: (p.y + q.y) / 2 + (my / l) * slant }, q]
  })
  return [sq, ...tris]
}

const SOLID_R = 64
const SOLIDS: Record<string, { name: string; color: string; verts: () => V3[]; net: (e: number, v: V3[]) => Pt[][] }> = {
  Tetrahedron: { name: 'Düzgün dörtyüzlü', color: C.orange, verts: () => [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]], net: (e) => netTetra(e) },
  Cube: { name: 'Küp', color: C.blue, verts: () => [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [x, y, z] as V3))), net: (e) => netCube(e) },
  Octahedron: { name: 'Düzgün sekizyüzlü', color: C.green, verts: () => [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], net: (e) => netOcta(e) },
  Dodecahedron: {
    name: 'Düzgün onikiyüzlü',
    color: C.purple,
    verts: () => {
      const v: V3[] = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [x, y, z] as V3)))
      for (const a of [-1, 1])
        for (const b of [-1, 1]) {
          v.push([0, a / PHI, b * PHI], [a / PHI, b * PHI, 0], [a * PHI, 0, b / PHI])
        }
      return v
    },
    net: (e) => netDodeca(e),
  },
  Icosahedron: {
    name: 'Düzgün yirmiyüzlü',
    color: C.pink,
    verts: () => {
      const v: V3[] = []
      for (const a of [-1, 1])
        for (const b of [-1, 1]) {
          v.push([0, a, b * PHI], [a, b * PHI, 0], [a * PHI, 0, b])
        }
      return v
    },
    net: (e) => netIcosa(e),
  },
  Prism: {
    name: 'Üçgen prizma',
    color: C.teal,
    verts: () => [0, 1, 2].flatMap((i) => [-0.85, 0.85].map((y) => [Math.cos(rad(90 + 120 * i)), y, Math.sin(rad(90 + 120 * i))] as V3)),
    net: (e) => netPrism(e, e * (1.7 / SQ3)),
  },
  Pyramid: {
    name: 'Kare piramit',
    color: C.yellow,
    verts: () => [[0, 1, 0], [1, -0.6, 1], [1, -0.6, -1], [-1, -0.6, 1], [-1, -0.6, -1]],
    net: (e) => netPyramid(e, (e / 2) * Math.sqrt(1 + 1.6 ** 2)),
  },
}

const solidCache = new Map<string, { verts: V3[]; faces: number[][]; net: Pt[][]; netBox: Box }>()
function solid(name: string) {
  const key = SOLIDS[name] ? name : 'Cube'
  const hit = solidCache.get(key)
  if (hit) return hit
  const s = SOLIDS[key]
  const raw = s.verts()
  const k = SOLID_R / Math.max(...raw.map((v) => Math.hypot(...v)))
  const verts = raw.map((v) => v.map((c) => c * k) as V3)
  const faces = hull(verts)
  // Model kenar uzunluğu: en yakın iki köşe arası
  let e = Infinity
  for (let i = 0; i < verts.length; i++) for (let j = i + 1; j < verts.length; j++) e = Math.min(e, Math.hypot(...sub(verts[i], verts[j])))
  if (key === 'Pyramid') e = 2 * k
  if (key === 'Prism') e = SQ3 * k
  const netRaw = s.net(e, verts)
  const nb = boundsOf(netRaw.flat())
  const net = netRaw.map((poly) => poly.map((p) => ({ x: p.x - nb.x - nb.w / 2, y: p.y - nb.y - nb.h / 2 })))
  const out = { verts, faces, net, netBox: boxOfPts(net.flat(), 2) }
  solidCache.set(key, out)
  return out
}

const LIGHT = norm3([-0.45, 0.6, 0.75])
function projectSolid(name: string, rx: number, ry: number) {
  const { verts, faces } = solid(name)
  const cy = Math.cos(rad(ry))
  const sy = Math.sin(rad(ry))
  const cx = Math.cos(rad(rx))
  const sx = Math.sin(rad(rx))
  const rv = verts.map(([x, y, z]) => {
    const x1 = x * cy + z * sy
    const z1 = -x * sy + z * cy
    const y2 = y * cx - z1 * sx
    const z2 = y * sx + z1 * cx
    return [x1, y2, z2] as V3
  })
  const out: { pts: Pt[]; light: number; z: number }[] = []
  for (const f of faces) {
    const a = rv[f[0]]
    const nm = norm3(cross(sub(rv[f[1]], a), sub(rv[f[2]], a)))
    if (nm[2] <= 1e-4) continue
    out.push({ pts: f.map((i) => ({ x: rv[i][0], y: -rv[i][1] })), light: Math.max(0, dot3(nm, LIGHT)), z: f.reduce((s, i) => s + rv[i][2], 0) / f.length })
  }
  return out.sort((p, q) => p.z - q.z)
}

const spinStart = new Map<string, { l: Pt; rx: number; ry: number }>()

const polyhedronTile: TileDef = {
  type: 'polyhedron',
  name: (t) => SOLIDS[t.p.net]?.name ?? 'Çokyüzlü',
  create: (p) => ({ color: SOLIDS[p.net]?.color ?? C.blue, p: { rx: -20, ry: 30 } }),
  bounds: (t) => (t.p.unfold ? solid(t.p.net).netBox : { x: -SOLID_R - 2, y: -SOLID_R - 2, w: SOLID_R * 2 + 4, h: SOLID_R * 2 + 4 }),
  render: (t) => {
    const color = t.color ?? C.blue
    if (t.p.unfold)
      return (
        <g>
          {solid(t.p.net).net.map((poly, i) => (
            <path key={i} d={pathOf(poly)} fill={shade(color, i % 2 ? 0.12 : 0)} stroke={edge(color)} strokeWidth={1.5} strokeLinejoin="round" />
          ))}
        </g>
      )
    return (
      <g>
        <circle r={SOLID_R} fill="transparent" />
        {projectSolid(t.p.net, t.p.rx ?? -20, t.p.ry ?? 30).map((f, i) => (
          <path key={i} d={pathOf(f.pts)} fill={shade(color, (f.light - 0.55) * 0.7)} stroke={edge(color)} strokeWidth={1.2} strokeLinejoin="round" />
        ))}
      </g>
    )
  },
  handles: (t) => (t.p.unfold ? [] : [{ id: 'spin', x: SOLID_R + 14, y: SOLID_R - 6 }]),
  onHandle: (t, _id, l, _api, phase) => {
    if (phase === 'start') {
      spinStart.set(t.id, { l, rx: t.p.rx ?? -20, ry: t.p.ry ?? 30 })
      return
    }
    const s = spinStart.get(t.id)
    if (!s) return
    if (phase === 'end') spinStart.delete(t.id)
    return { p: { ...t.p, ry: round(s.ry + (l.x - s.l.x) * 0.9, 1), rx: round(clamp(s.rx - (l.y - s.l.y) * 0.9, -90, 90), 1) } }
  },
  onTap: (t, api, info) => {
    if (!t.p.unfold && !info.act) api.updateP(t.id, (p) => ({ ry: (p.ry ?? 30) + 30 }), true)
  },
  actions: (t) => [
    action('spin-l', 'Sola döndür', 'arrowL', (tile, api) => api.updateP(tile.id, (p) => ({ ry: (p.ry ?? 30) - 30 }), true)),
    action('spin-r', 'Sağa döndür', 'arrowR', (tile, api) => api.updateP(tile.id, (p) => ({ ry: (p.ry ?? 30) + 30 }), true)),
    action('tilt', 'Öne eğ', 'rotate', (tile, api) => api.updateP(tile.id, (p) => ({ rx: (((p.rx ?? -20) + 30 + 90) % 180) - 90 }), true)),
    toggle(t, 'unfold', 'Açınımı göster', 'net'),
  ],
  colorable: true,
  edgeSnap: false,
}

// ---------------------------------------------------------------------------
// Bağlantı çubukları
// ---------------------------------------------------------------------------

const LK = UNIT / 2
const LINK_COLORS: Record<string, string> = { '5': C.orange, '7.07': C.red, '8.66': C.pink, '10': C.purple, '12.24': C.blue, '14.14': C.green }
const linkLen = (t: Tile) => (Number(t.p.length) || 5) * LK

const linkageTile: TileDef = {
  type: 'linkage',
  name: (t) => `Bağlantı çubuğu (${fmt(t.p.length ?? 5)})`,
  create: (p) => ({ color: LINK_COLORS[String(p.length)] ?? C.blue }),
  outline: (t) => {
    const h = linkLen(t) / 2
    return [
      { x: -h, y: 0 },
      { x: -h + 8, y: -9 },
      { x: h - 8, y: -9 },
      { x: h, y: 0 },
      { x: h - 8, y: 9 },
      { x: -h + 8, y: 9 },
    ]
  },
  bounds: (t) => ({ x: -linkLen(t) / 2 - 10, y: -10, w: linkLen(t) + 20, h: 20 }),
  render: (t) => {
    const L = linkLen(t)
    const color = t.color ?? C.blue
    return (
      <>
        <rect x={-L / 2 - 10} y={-10} width={L + 20} height={20} rx={10} fill={color} stroke={edge(color)} strokeWidth={1.5} />
        <circle cx={-L / 2} r={4} fill="var(--pp-canvas-bg, #fff)" stroke={edge(color)} />
        <circle cx={L / 2} r={4} fill="var(--pp-canvas-bg, #fff)" stroke={edge(color)} />
        <Label size={10} color="#fff">{fmt(t.p.length ?? 5)}</Label>
      </>
    )
  },
  handles: (t) => [{ id: 'end', x: linkLen(t) / 2, y: 0 }],
  onHandle: (t, _id, l) => {
    const L = linkLen(t)
    const W = toWorld(t, { x: -L / 2, y: 0 })
    const a = t.rot + deg(Math.atan2(l.y, l.x + L / 2)) * (t.flip ? -1 : 1)
    const r = round(a, 1)
    const c = rotate({ x: L / 2, y: 0 }, r)
    return { rot: r, x: W.x + c.x, y: W.y + c.y }
  },
  colorable: true,
}

// ---------------------------------------------------------------------------
// Ölçme araçları
// ---------------------------------------------------------------------------

const MM = UNIT / 10
function rulerTicks(len: number, x0: number, y0: number, dir = 1) {
  let d = ''
  for (let i = 0; i <= len * 10; i++) {
    const h = i % 10 === 0 ? 14 : i % 5 === 0 ? 10 : 6
    d += `M${round(x0 + i * MM)} ${y0}v${h * dir}`
  }
  return d
}

const rulerLen = (t: Tile) => clamp(Math.round(t.p.len ?? 15), 3, 40)
const rulerTile: TileDef = {
  type: 'ruler',
  name: () => 'Cetvel',
  create: () => ({ p: { len: 15 } }),
  bounds: (t) => {
    const L = rulerLen(t) * UNIT
    return { x: -L / 2 - 14, y: -26, w: L + 28, h: 52 }
  },
  render: (t) => {
    const n = rulerLen(t)
    const L = n * UNIT
    return (
      <>
        <rect x={-L / 2 - 14} y={-26} width={L + 28} height={52} rx={4} fill="rgba(254,198,128,.78)" stroke="#b16200" strokeWidth={1.2} />
        <path d={rulerTicks(n, -L / 2, -26)} stroke="#4a3200" strokeWidth={1} />
        {Array.from({ length: n + 1 }, (_, i) => (
          <Label key={i} x={-L / 2 + i * UNIT} y={0} size={10} color="#4a3200">
            {i}
          </Label>
        ))}
        <Label x={L / 2 + 2} y={14} size={9} color="#4a3200" anchor="end">
          cm
        </Label>
      </>
    )
  },
  handles: (t) => [{ id: 'len', x: (rulerLen(t) * UNIT) / 2 + 14, y: 0 }],
  onHandle: (t, _id, l) => {
    const n = rulerLen(t)
    const L = n * UNIT
    const m = clamp(Math.round((l.x - 14 + L / 2) / UNIT), 3, 40)
    if (m === n) return
    const c = toWorld(t, { x: ((m - n) * UNIT) / 2, y: 0 })
    return { x: c.x, y: c.y, p: { ...t.p, len: m } }
  },
  edgeSnap: false,
  rotStep: 5,
}

const PR = 120
const protractorTile: TileDef = {
  type: 'protractor',
  name: () => 'İletki',
  create: () => ({ p: { a: 60 } }),
  bounds: () => ({ x: -PR - 26, y: -PR - 28, w: 2 * PR + 52, h: PR + 46 }),
  render: (t) => {
    const a = clamp(t.p.a ?? 60, 0, 180)
    let ticks = ''
    for (let d = 0; d <= 180; d++) {
      const l = d % 10 === 0 ? 14 : d % 5 === 0 ? 10 : 6
      const c = Math.cos(rad(d))
      const s = -Math.sin(rad(d))
      ticks += `M${round(c * PR)} ${round(s * PR)}L${round(c * (PR - l))} ${round(s * (PR - l))}`
    }
    const tip = { x: Math.cos(rad(a)) * (PR + 22), y: -Math.sin(rad(a)) * (PR + 22) }
    return (
      <>
        <path d={`M${-PR} 14V0A${PR} ${PR} 0 0 1 ${PR} 0V14Z`} fill="rgba(135,193,249,.42)" stroke="#0b5ba9" strokeWidth={1.2} />
        <path d={`M${-PR + 46} 0A${PR - 46} ${PR - 46} 0 0 1 ${PR - 46} 0`} fill="none" stroke="#0b5ba9" strokeWidth={0.8} />
        <path d={ticks} stroke="#0b5ba9" strokeWidth={1} />
        {Array.from({ length: 19 }, (_, i) => {
          const d = i * 10
          const c = Math.cos(rad(d))
          const s = -Math.sin(rad(d))
          return (
            <g key={d}>
              <Label x={c * (PR - 24)} y={s * (PR - 24)} size={9} color="#0b5ba9">
                {d}
              </Label>
              <Label x={c * (PR - 37)} y={s * (PR - 37)} size={7.5} color="#4c2986">
                {180 - d}
              </Label>
            </g>
          )
        })}
        <path d={`M${-PR} 0H${PR}M0 0V-10`} stroke="#0b5ba9" strokeWidth={1} />
        <circle r={3} fill="#0b5ba9" />
        <path d={`M0 0L${tip.x} ${tip.y}`} stroke="#cd0e66" strokeWidth={2} />
        <path d={`M28 0A28 28 0 0 0 ${round(Math.cos(rad(a)) * 28)} ${round(-Math.sin(rad(a)) * 28)}`} fill="none" stroke="#cd0e66" strokeWidth={1.5} />
        <rect x={-22} y={18} width={44} height={20} rx={10} fill="#cd0e66" />
        <Label y={28} size={12} color="#fff">
          {Math.round(a)}°
        </Label>
      </>
    )
  },
  handles: (t) => {
    const a = clamp(t.p.a ?? 60, 0, 180)
    return [{ id: 'arm', x: Math.cos(rad(a)) * (PR + 22), y: -Math.sin(rad(a)) * (PR + 22) }]
  },
  onHandle: (t, _id, l) => {
    let a = deg(Math.atan2(-l.y, l.x))
    if (a < -90) a = 180
    return { p: { ...t.p, a: clamp(Math.round(a), 0, 180) } }
  },
  edgeSnap: false,
  rotStep: 5,
}

const ST = 6 * UNIT
const SET_PTS = centerPts([
  { x: 0, y: 0 },
  { x: ST, y: 0 },
  { x: 0, y: -ST },
])
const setTriangleTile: TileDef = {
  type: 'set-triangle',
  name: () => 'Gönye',
  outline: () => SET_PTS,
  bounds: () => ptsBox(SET_PTS),
  render: () => {
    const [O, X, Y] = SET_PTS
    const inner = [
      { x: O.x + 34, y: O.y - 34 },
      { x: O.x + 34 + (ST - 34 * 2 - 34 * Math.SQRT2) , y: O.y - 34 },
      { x: O.x + 34, y: O.y - 34 - (ST - 34 * 2 - 34 * Math.SQRT2) },
    ]
    let ticks = ''
    for (let i = 0; i <= Math.floor(ST / MM) - 4; i++) {
      const h = i % 10 === 0 ? 12 : i % 5 === 0 ? 8 : 5
      ticks += `M${round(O.x + i * MM)} ${O.y}v${-h}M${O.x} ${round(O.y - i * MM)}h${h}`
    }
    const n = Math.floor(ST / UNIT) - 1
    return (
      <>
        <path d={`${pathOf([O, X, Y])}${pathOf(inner)}`} fillRule="evenodd" fill="rgba(145,213,146,.55)" stroke="#187819" strokeWidth={1.2} strokeLinejoin="round" />
        <path d={ticks} stroke="#0d4a0e" strokeWidth={0.9} />
        {Array.from({ length: n }, (_, i) => (
          <g key={i}>
            <Label x={O.x + (i + 1) * UNIT} y={O.y - 20} size={8.5} color="#0d4a0e">
              {i + 1}
            </Label>
            <Label x={O.x + 20} y={O.y - (i + 1) * UNIT} size={8.5} color="#0d4a0e">
              {i + 1}
            </Label>
          </g>
        ))}
        <path d={`M${X.x} ${X.y}L${Y.x} ${Y.y}`} stroke="#187819" strokeWidth={1.5} />
      </>
    )
  },
  flippable: true,
  edgeSnap: false,
  rotStep: 5,
}

/** Pergel: yerel x ekseninde iğne (-r/2, 0), kalem ucu (r/2, 0); menteşe yukarıda */
const compassLeg = (r: number) => Math.max(130, r / 2 + 12)
const compassH = (r: number) => Math.sqrt(compassLeg(r) ** 2 - (r / 2) ** 2)
const drawState = new Map<string, { a0: number; last: number; off: number }>()

function compassArcPts(r: number, a0: number, a1: number) {
  const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / 3))
  const flat: number[] = []
  for (let i = 0; i <= n; i++) {
    const a = rad(a0 + ((a1 - a0) * i) / n)
    flat.push(round(r * Math.cos(a), 1), round(r * Math.sin(a), 1))
  }
  return flat
}

const compassTile: TileDef = {
  type: 'compass',
  name: () => 'Pergel',
  create: () => ({ p: { r: 4 * UNIT, showR: true } }),
  bounds: (t) => {
    const r = t.p.r ?? 128
    const h = compassH(r)
    return { x: -r / 2 - 12, y: -h - 34, w: r + 24, h: h + 44 }
  },
  render: (t) => {
    const r = t.p.r ?? 128
    const h = compassH(r)
    const tr = t.p.trace as { a0: number; a1: number } | null | undefined
    return (
      <>
        {tr && Math.abs(tr.a1 - tr.a0) > 0.5 && (
          <path
            d={pathOf(arcPts(-r / 2, 0, r, tr.a0 - tr.a1, 0, 40), false)}
            fill="none"
            stroke="#242436"
            strokeWidth={3}
            strokeLinecap="round"
          />
        )}
        <path d={`M0 ${-h}L${-r / 2} 0`} stroke="#777" strokeWidth={7} strokeLinecap="round" />
        <path d={`M${-r / 2} -8L${-r / 2} 4`} stroke="#333" strokeWidth={2} />
        <path d={`M0 ${-h}L${r / 2} -16`} stroke="#0f82f2" strokeWidth={7} strokeLinecap="round" />
        <path d={`M${r / 2 - 4} -18L${r / 2 + 4} -14L${r / 2} 0Z`} fill="#f7eecb" stroke="#b16200" strokeWidth={1} />
        <rect x={-5} y={-h - 30} width={10} height={24} rx={4} fill="#3a3645" />
        <circle cy={-h} r={7} fill="#3a3645" />
        {t.p.showR && (
          <>
            <path d={`M${-r / 2} 0H${r / 2}`} stroke="#cd0e66" strokeWidth={1.2} strokeDasharray="4 4" />
            <Label y={12} size={11} color="#cd0e66">
              r = {fmt(r / UNIT, 1)}
            </Label>
          </>
        )}
      </>
    )
  },
  handles: (t) => {
    const r = t.p.r ?? 128
    return [
      { id: 'pencil', x: r / 2, y: 0 },
      { id: 'draw', x: 0, y: -compassH(r) - 30, color: '#cd0e66' },
    ]
  },
  onHandle: (t, id, l, api, phase) => {
    const r = t.p.r ?? 128
    const W = toWorld(t, { x: -r / 2, y: 0 })
    const P = toWorld(t, l)
    if (id === 'pencil') {
      const nr = clamp(Math.hypot(P.x - W.x, P.y - W.y), 20, 1200)
      const rot = deg(Math.atan2(P.y - W.y, P.x - W.x))
      return { x: W.x + (nr / 2) * Math.cos(rad(rot)), y: W.y + (nr / 2) * Math.sin(rad(rot)), rot: round(rot, 2), p: { ...t.p, r: round(nr, 1) } }
    }
    // Tutamaktan sürükleyince pergel iğne etrafında döner ve kalem yay çizer
    const ang = deg(Math.atan2(P.y - W.y, P.x - W.x))
    if (phase === 'start') {
      const off = deg(Math.atan2(-compassH(r) - 30, r / 2))
      drawState.set(t.id, { a0: t.rot, last: t.rot, off })
      return { p: { ...t.p, trace: { a0: t.rot, a1: t.rot } } }
    }
    const s = drawState.get(t.id)
    if (!s) return
    const target = ang - s.off
    s.last += ((target - s.last + 540) % 360) - 180
    const rot = s.last
    const patch = { rot, x: W.x + (r / 2) * Math.cos(rad(rot)), y: W.y + (r / 2) * Math.sin(rad(rot)) }
    if (phase === 'end') {
      drawState.delete(t.id)
      if (Math.abs(rot - s.a0) > 2) {
        const sweep = clamp(rot - s.a0, -360, 360)
        api.add([{ type: 'stroke', x: W.x, y: W.y, rot: 0, color: api.color(), p: { pts: compassArcPts(r, s.a0, s.a0 + sweep), w: 3, kind: 'pen' } }], false)
      }
      return { ...patch, p: { ...t.p, trace: null } }
    }
    return { ...patch, p: { ...t.p, trace: { a0: s.a0, a1: rot } } }
  },
  actions: (t) => [toggle(t, 'showR', 'Yarıçapı göster', 'ruler')],
  rotatable: true,
  edgeSnap: false,
}

const angleTile: TileDef = {
  type: 'angle',
  name: () => 'Açı',
  create: () => ({ color: C.blue, p: { a1: 0, a2: 60, l1: 120, l2: 120 } }),
  bounds: (t) => {
    const e1 = { x: Math.cos(rad(t.p.a1)) * t.p.l1, y: -Math.sin(rad(t.p.a1)) * t.p.l1 }
    const e2 = { x: Math.cos(rad(t.p.a2)) * t.p.l2, y: -Math.sin(rad(t.p.a2)) * t.p.l2 }
    return boxOfPts([{ x: 0, y: 0 }, e1, e2], 16)
  },
  render: (t) => {
    const color = t.color ?? C.blue
    const { a1, a2, l1, l2 } = t.p
    const m = mod(a2 - a1, 360)
    const e1 = { x: Math.cos(rad(a1)) * l1, y: -Math.sin(rad(a1)) * l1 }
    const e2 = { x: Math.cos(rad(a2)) * l2, y: -Math.sin(rad(a2)) * l2 }
    const R = 30
    const p1 = { x: Math.cos(rad(a1)) * R, y: -Math.sin(rad(a1)) * R }
    const p2 = { x: Math.cos(rad(a2)) * R, y: -Math.sin(rad(a2)) * R }
    const mid = rad(a1 + m / 2)
    const right = Math.round(m) === 90
    return (
      <>
        {right ? (
          <path
            d={`M${p1.x * 0.6} ${p1.y * 0.6}L${p1.x * 0.6 + p2.x * 0.6} ${p1.y * 0.6 + p2.y * 0.6}L${p2.x * 0.6} ${p2.y * 0.6}`}
            fill={color}
            fillOpacity={0.25}
            stroke={color}
            strokeWidth={1.5}
          />
        ) : (
          <path d={`M0 0L${p1.x} ${p1.y}A${R} ${R} 0 ${m > 180 ? 1 : 0} 0 ${p2.x} ${p2.y}Z`} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={1.2} />
        )}
        <path d={`M${e1.x} ${e1.y}L0 0L${e2.x} ${e2.y}`} fill="none" stroke="transparent" strokeWidth={18} />
        <path d={`M${e1.x} ${e1.y}L0 0L${e2.x} ${e2.y}`} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <circle r={4} fill={color} />
        <Label x={Math.cos(mid) * 52} y={-Math.sin(mid) * 52} size={13} color={color}>
          {fmt(m, 0)}°
        </Label>
      </>
    )
  },
  handles: (t) => [
    { id: '1', x: Math.cos(rad(t.p.a1)) * t.p.l1, y: -Math.sin(rad(t.p.a1)) * t.p.l1 },
    { id: '2', x: Math.cos(rad(t.p.a2)) * t.p.l2, y: -Math.sin(rad(t.p.a2)) * t.p.l2 },
  ],
  onHandle: (t, id, l) => {
    const a = Math.round(deg(Math.atan2(-l.y, l.x)))
    const len = Math.max(50, Math.round(Math.hypot(l.x, l.y)))
    return { p: { ...t.p, [`a${id}`]: mod(a, 360), [`l${id}`]: len } }
  },
  colorable: true,
  edgeSnap: false,
}

// ---------------------------------------------------------------------------
// Fraktallar
// ---------------------------------------------------------------------------

const FRACTALS = [
  { name: 'Sierpinski üçgeni', max: 7, def: 4, color: C.orange },
  { name: 'Sierpinski halısı', max: 4, def: 3, color: C.blue },
  { name: 'Koch kar tanesi', max: 6, def: 3, color: C.teal },
  { name: 'Fraktal ağaç', max: 10, def: 7, color: C.green },
  { name: 'Ejderha eğrisi', max: 13, def: 10, color: C.purple },
]

type Frac = { d: string; box: Box; stroke?: boolean; widths?: string[] }
const fracCache = new Map<string, Frac>()

function fractal(i: number, level: number): Frac {
  const key = `${i}:${level}`
  const hit = fracCache.get(key)
  if (hit) return hit
  let out: Frac
  if (i === 0) {
    const s = 180
    const h = (s * SQ3) / 2
    const parts: string[] = []
    const rec = (a: Pt, b: Pt, c: Pt, n: number) => {
      if (n === 0) return void parts.push(pathOf([a, b, c]))
      const ab = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const bc = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 }
      const ca = { x: (c.x + a.x) / 2, y: (c.y + a.y) / 2 }
      rec(a, ab, ca, n - 1)
      rec(ab, b, bc, n - 1)
      rec(ca, bc, c, n - 1)
    }
    rec({ x: -s / 2, y: h / 2 }, { x: s / 2, y: h / 2 }, { x: 0, y: -h / 2 }, level)
    out = { d: parts.join(''), box: { x: -s / 2, y: -h / 2, w: s, h } }
  } else if (i === 1) {
    const s = 162
    const parts = [pathOf([{ x: -s / 2, y: -s / 2 }, { x: s / 2, y: -s / 2 }, { x: s / 2, y: s / 2 }, { x: -s / 2, y: s / 2 }])]
    const rec = (x: number, y: number, w: number, n: number) => {
      if (n === 0) return
      const k = w / 3
      parts.push(`M${round(x + k)} ${round(y + k)}h${round(k)}v${round(k)}h${round(-k)}z`)
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (a !== 1 || b !== 1) rec(x + a * k, y + b * k, k, n - 1)
    }
    rec(-s / 2, -s / 2, s, level)
    out = { d: parts.join(''), box: { x: -s / 2, y: -s / 2, w: s, h: s } }
  } else if (i === 2) {
    const s = 150
    const r = s / SQ3
    let pts: Pt[] = [0, 1, 2].map((k) => ({ x: r * Math.cos(rad(-90 + 120 * k)), y: r * Math.sin(rad(-90 + 120 * k)) }))
    for (let n = 0; n < level; n++) {
      const next: Pt[] = []
      pts.forEach((a, k) => {
        const b = pts[(k + 1) % pts.length]
        const d = { x: (b.x - a.x) / 3, y: (b.y - a.y) / 3 }
        const p1 = { x: a.x + d.x, y: a.y + d.y }
        const p2 = { x: a.x + 2 * d.x, y: a.y + 2 * d.y }
        const peak = { x: p1.x + d.x / 2 + (d.y * SQ3) / 2, y: p1.y + d.y / 2 - (d.x * SQ3) / 2 }
        next.push(a, p1, peak, p2)
      })
      pts = next
    }
    out = { d: pathOf(pts), box: boxOfPts(pts, 1) }
  } else if (i === 3) {
    const byDepth: string[] = Array.from({ length: level + 1 }, () => '')
    const all: Pt[] = []
    const rec = (p: Pt, a: number, len: number, n: number) => {
      const q = { x: p.x + Math.cos(rad(a)) * len, y: p.y + Math.sin(rad(a)) * len }
      byDepth[level - n] += `M${round(p.x)} ${round(p.y)}L${round(q.x)} ${round(q.y)}`
      all.push(q)
      if (n > 0) {
        rec(q, a - 25, len * 0.74, n - 1)
        rec(q, a + 25, len * 0.74, n - 1)
      }
    }
    rec({ x: 0, y: 0 }, -90, 48, level)
    all.push({ x: 0, y: 0 })
    const b = boxOfPts(all, 4)
    const cx = b.x + b.w / 2
    const cy = b.y + b.h / 2
    const shift = (d: string) => d.replace(/([ML])(-?[\d.]+) (-?[\d.]+)/g, (_m, c, x, y) => `${c}${round(Number(x) - cx)} ${round(Number(y) - cy)}`)
    out = { d: '', widths: byDepth.map(shift), box: { x: b.x - cx, y: b.y - cy, w: b.w, h: b.h }, stroke: true }
  } else {
    let turns: number[] = []
    for (let n = 0; n < level; n++) turns = [...turns, 1, ...turns.slice().reverse().map((x) => -x)]
    let a = 0
    let p = { x: 0, y: 0 }
    const pts: Pt[] = [p]
    for (const tr of [...turns, 0]) {
      p = { x: p.x + Math.cos(rad(a)), y: p.y + Math.sin(rad(a)) }
      pts.push(p)
      a += tr * 90
    }
    const b = boundsOf(pts)
    const k = 170 / Math.max(b.w, b.h, 1)
    const scaled = pts.map((q) => ({ x: (q.x - b.x - b.w / 2) * k, y: (q.y - b.y - b.h / 2) * k }))
    out = { d: pathOf(scaled, false), box: boxOfPts(scaled, 3), stroke: true }
  }
  fracCache.set(key, out)
  return out
}

const fracIndex = (t: Tile) => clamp(t.p.index ?? 0, 0, 4)
const fracLevel = (t: Tile) => clamp(t.p.level ?? FRACTALS[fracIndex(t)].def, 0, FRACTALS[fracIndex(t)].max)

const fractalTile: TileDef = {
  type: 'fractal',
  name: (t) => FRACTALS[fracIndex(t)].name,
  create: (p) => ({ color: FRACTALS[clamp(p.index ?? 0, 0, 4)].color }),
  bounds: (t) => fractal(fracIndex(t), fracLevel(t)).box,
  render: (t) => {
    const i = fracIndex(t)
    const f = fractal(i, fracLevel(t))
    const color = t.color ?? FRACTALS[i].color
    if (f.widths)
      return (
        <g strokeLinecap="round">
          <rect {...f.box} fill="transparent" />
          {f.widths.map((d, k) => (
            <path key={k} d={d} stroke={k === f.widths!.length - 1 ? shade(color, 0.2) : shade('#8b5a2b', k * 0.05)} strokeWidth={Math.max(1, 7 - k * 0.7)} fill="none" />
          ))}
        </g>
      )
    if (f.stroke)
      return (
        <>
          <rect {...f.box} fill="transparent" />
          <path d={f.d} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
        </>
      )
    return <path d={f.d} fill={color} fillRule="evenodd" stroke={i === 1 ? edge(color) : 'none'} strokeWidth={1} />
  },
  actions: () => [
    action('lvl-down', 'Adımı azalt', 'minus', (tile, api) => api.updateP(tile.id, { level: Math.max(0, fracLevel(tile) - 1) }, true)),
    action('lvl-up', 'Adımı artır', 'plus', (tile, api) => api.updateP(tile.id, { level: Math.min(FRACTALS[fracIndex(tile)].max, fracLevel(tile) + 1) }, true)),
  ],
  colorable: true,
  edgeSnap: false,
}

// ---------------------------------------------------------------------------
// Ok
// ---------------------------------------------------------------------------

const arrowLen = (t: Tile) => clamp(t.p.len ?? 150, 60, 800)
const arrowPts = (L: number): Pt[] => [
  { x: -L / 2, y: -12 },
  { x: L / 2 - 40, y: -12 },
  { x: L / 2 - 40, y: -28 },
  { x: L / 2, y: 0 },
  { x: L / 2 - 40, y: 28 },
  { x: L / 2 - 40, y: 12 },
  { x: -L / 2, y: 12 },
]
const arrowTile: TileDef = {
  type: 'arrow',
  name: () => 'Ok',
  create: () => ({ color: C.red, p: { len: 150 } }),
  outline: (t) => arrowPts(arrowLen(t)),
  bounds: (t) => ptsBox(arrowPts(arrowLen(t))),
  render: (t) => <Piece pts={arrowPts(arrowLen(t))} color={t.color ?? C.red} />,
  handles: (t) => [{ id: 'tip', x: arrowLen(t) / 2, y: 0 }],
  onHandle: (t, _id, l) => {
    const L = arrowLen(t)
    const n = clamp(Math.round(l.x + L / 2), 60, 800)
    const c = toWorld(t, { x: (n - L) / 2, y: 0 })
    return { x: c.x, y: c.y, p: { ...t.p, len: n } }
  },
  colorable: true,
  flippable: true,
}

export const geometryTiles: TileDef[] = [
  polyominoTile,
  tangramTile,
  eggTile,
  hatTile,
  penroseTile,
  gardenTile,
  polyhedronTile,
  linkageTile,
  rulerTile,
  protractorTile,
  setTriangleTile,
  compassTile,
  angleTile,
  tantrixTile,
  fractalTile,
  kolamTile,
  arrowTile,
]
