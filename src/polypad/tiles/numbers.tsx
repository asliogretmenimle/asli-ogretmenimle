import type { ReactElement } from 'react'
import type { PadApi, Pt, Tile, TileDef } from '../types'
import { UNIT, fmt, pathOf, round, textOn, toLocal, toWorld } from '../geom'
import { BAR_COLORS } from '../colors'
import { makeTile } from '../store'
import { C, FONT, Label, action, askNumber, edge, rectBox, toggle } from './kit'

const rectOutline = (w: number, h: number): Pt[] => [
  { x: -w / 2, y: -h / 2 },
  { x: w / 2, y: -h / 2 },
  { x: w / 2, y: h / 2 },
  { x: -w / 2, y: h / 2 },
]

/** Sol ucu sabit tutarak genişliği değişen yatay parçanın yeni merkezi */
const keepLeft = (t: Tile, oldW: number, newW: number) => toWorld(t, { x: (newW - oldW) / 2, y: 0 })

const gridLines = (w: number, h: number, cols: number, rows: number) => {
  let d = ''
  for (let i = 1; i < cols; i++) d += `M${round(-w / 2 + (i * w) / cols)} ${-h / 2}v${h}`
  for (let j = 1; j < rows; j++) d += `M${-w / 2} ${round(-h / 2 + (j * h) / rows)}h${w}`
  return d
}

// ---------------------------------------------------------------------------
// Onluk taban blokları
// ---------------------------------------------------------------------------

const baseColor = (v: number) => (v >= 1000 ? C.purple : v >= 100 ? C.green : v >= 10 ? C.blue : v === 1 ? C.orange : C.teal)

const tileSize = (t: Tile) => {
  const w = Math.max(1, t.p.width ?? 1)
  const h = Math.max(1, Math.round((t.p.value ?? 1) / w))
  return { cols: w, rows: h, w: w * UNIT, h: h * UNIT }
}

const numberTile: TileDef = {
  type: 'number-tile',
  name: (t) => `${t.p.value} sayı karosu`,
  create: (p) => ({ color: baseColor(p.value ?? 1), p: { width: p.width ?? 1, value: p.value ?? 1 } }),
  bounds: (t) => {
    const s = tileSize(t)
    return rectBox(s.w, s.h)
  },
  outline: (t) => {
    const s = tileSize(t)
    return rectOutline(s.w, s.h)
  },
  render: (t) => {
    const s = tileSize(t)
    const color = t.color ?? baseColor(t.p.value)
    return (
      <>
        <rect x={-s.w / 2} y={-s.h / 2} width={s.w} height={s.h} fill={color} stroke={edge(color)} strokeWidth={1.5} />
        {(s.cols > 1 || s.rows > 1) && <path d={gridLines(s.w, s.h, s.cols, s.rows)} stroke="rgba(255,255,255,.55)" strokeWidth={1} />}
      </>
    )
  },
  colorable: true,
  gridSnap: true,
  actions: (t) =>
    t.p.value > 1
      ? [
          action('break', 'Parçala', 'split', (tile, api) => {
            const s = tileSize(tile)
            const pieces: Tile[] = []
            if (s.rows > 1) {
              // Yüzlük → 10 onluk (satır satır)
              for (let j = 0; j < s.rows; j++) {
                const w = toWorld(tile, { x: 0, y: -s.h / 2 + (j + 0.5) * UNIT + (j - (s.rows - 1) / 2) * 4 })
                pieces.push({ ...makeTile('number-tile', { width: s.cols, value: s.cols }, w.x, w.y), rot: tile.rot })
              }
            } else {
              for (let i = 0; i < s.cols; i++) {
                const w = toWorld(tile, { x: -s.w / 2 + (i + 0.5) * UNIT + (i - (s.cols - 1) / 2) * 4, y: 0 })
                pieces.push({ ...makeTile('number-tile', { width: 1, value: 1 }, w.x, w.y), rot: tile.rot })
              }
            }
            api.remove([tile.id])
            api.add(pieces)
            api.sound('pop')
          }),
        ]
      : [],
}

// İzometrik küpler
const E = UNIT * 0.55
const CX = Math.cos(Math.PI / 6) * E
const SY = 0.5 * E
type V3 = [number, number, number]

function cubeGeom(vx: number, vy: number, vz: number) {
  const raw = (x: number, y: number, z: number): Pt => ({ x: (x - z) * CX, y: (x + z) * SY - y * E })
  const xs = [raw(0, 0, vz).x, raw(vx, 0, 0).x]
  const ys = [raw(0, vy, 0).y, raw(vx, 0, vz).y]
  const ox = (xs[0] + xs[1]) / 2
  const oy = (ys[0] + ys[1]) / 2
  const pr = ([x, y, z]: V3): Pt => {
    const q = raw(x, y, z)
    return { x: q.x - ox, y: q.y - oy }
  }
  return { pr, w: xs[1] - xs[0], h: ys[1] - ys[0] }
}

const cubeDims = (t: Tile): V3 => [t.p.vx ?? 1, t.p.vy ?? 1, t.p.vz ?? 1]

const numberCube: TileDef = {
  type: 'number-cube',
  name: (t) => `${cubeDims(t).reduce((a, b) => a * b, 1)} küp`,
  create: (p) => ({ color: baseColor((p.vx ?? 1) * (p.vy ?? 1) * (p.vz ?? 1)), p: { vx: p.vx ?? 1, vy: p.vy ?? 1, vz: p.vz ?? 1 } }),
  bounds: (t) => {
    const g = cubeGeom(...cubeDims(t))
    return rectBox(g.w, g.h)
  },
  render: (t) => {
    const [vx, vy, vz] = cubeDims(t)
    const { pr } = cubeGeom(vx, vy, vz)
    const color = t.color ?? baseColor(vx * vy * vz)
    const face = (pts: V3[]) => pathOf(pts.map(pr))
    const seg = (a: V3, b: V3) => {
      const p = pr(a)
      const q = pr(b)
      return `M${round(p.x)} ${round(p.y)}L${round(q.x)} ${round(q.y)}`
    }
    let lines = ''
    for (let i = 1; i < vx; i++) lines += seg([i, vy, 0], [i, vy, vz]) + seg([i, 0, vz], [i, vy, vz])
    for (let k = 1; k < vz; k++) lines += seg([0, vy, k], [vx, vy, k]) + seg([vx, 0, k], [vx, vy, k])
    for (let j = 1; j < vy; j++) lines += seg([vx, j, 0], [vx, j, vz]) + seg([0, j, vz], [vx, j, vz])
    const st = edge(color)
    return (
      <g strokeLinejoin="round">
        <path d={face([[0, vy, 0], [vx, vy, 0], [vx, vy, vz], [0, vy, vz]])} fill={color} stroke={st} strokeWidth={1.2} />
        <path d={face([[vx, 0, 0], [vx, vy, 0], [vx, vy, vz], [vx, 0, vz]])} fill={edge(color)} stroke={st} strokeWidth={1.2} />
        <path d={face([[0, 0, vz], [vx, 0, vz], [vx, vy, vz], [0, vy, vz]])} fill={color} fillOpacity={0.8} stroke={st} strokeWidth={1.2} />
        {lines && <path d={lines} stroke="rgba(0,0,0,.25)" strokeWidth={0.8} fill="none" />}
      </g>
    )
  },
  rotatable: false,
  colorable: true,
  actions: (t) => {
    const [vx, vy, vz] = cubeDims(t)
    if (vx * vy * vz === 1) return []
    return [
      action('break', 'Parçala', 'split', (tile, api) => {
        // Önce katmanlara, sonra çubuklara, en son birim küplere ayır
        const axis = vy > 1 ? 1 : vx > 1 ? 0 : 2
        const n = [vx, vy, vz][axis]
        const dims: V3 = [vx, vy, vz]
        dims[axis] = 1
        const piece = cubeGeom(...dims)
        const gap = 10
        const out: Tile[] = []
        for (let i = 0; i < n; i++) {
          const off = axis === 1 ? { x: 0, y: (n - 1 - i - (n - 1) / 2) * (piece.h + gap) } : { x: (i - (n - 1) / 2) * (piece.w + gap), y: 0 }
          out.push(makeTile('number-cube', { vx: dims[0], vy: dims[1], vz: dims[2] }, tile.x + off.x, tile.y + off.y))
        }
        api.remove([tile.id])
        api.add(out)
        api.sound('pop')
      }),
    ]
  },
}

// Takılan küpler
const cubeColors = (t: Tile): string[] => String(t.p.colors ?? C.orange).split(',').filter(Boolean)
const SNAP_COLORS = [C.orange, C.blue, C.green, C.red, C.yellow, C.purple, C.pink, C.teal, '#eeeeee', '#777777']

const snapCube: TileDef = {
  type: 'snap-cube',
  name: (t) => `${cubeColors(t).length} takılan küp`,
  bounds: (t) => rectBox(cubeColors(t).length * UNIT, UNIT),
  outline: (t) => rectOutline(cubeColors(t).length * UNIT, UNIT),
  render: (t) => {
    const cs = cubeColors(t)
    const n = cs.length
    return (
      <>
        {cs.map((c, i) => {
          const x = (-n / 2 + i) * UNIT
          return (
            <g key={i}>
              <rect x={x} y={-UNIT / 2} width={UNIT} height={UNIT} rx={3} fill={c} stroke={edge(c)} strokeWidth={1.5} />
              <rect x={x + 7} y={-UNIT / 2 + 7} width={UNIT - 14} height={UNIT - 14} rx={2} fill="rgba(255,255,255,.28)" stroke={edge(c)} strokeWidth={1} />
            </g>
          )
        })}
      </>
    )
  },
  // Seçiliyken dokunulan küpün rengi değişir
  onTap: (t, api, info) => {
    const cs = cubeColors(t)
    const i = Math.floor((info.local.x + (cs.length * UNIT) / 2) / UNIT)
    if (i < 0 || i >= cs.length) return
    const next = SNAP_COLORS[(SNAP_COLORS.indexOf(cs[i]) + 1) % SNAP_COLORS.length]
    cs[i] = next
    api.updateP(t.id, { colors: cs.join(',') }, true)
  },
  onDrop: (t, dropped, api) => {
    const cubes = dropped.filter((d) => d.type === 'snap-cube')
    if (!cubes.length) return
    const cs = cubeColors(t)
    const add = cubes.flatMap(cubeColors)
    const c = keepLeft(t, cs.length * UNIT, (cs.length + add.length) * UNIT)
    api.remove(cubes.map((d) => d.id))
    api.update(t.id, { x: c.x, y: c.y, p: { ...t.p, colors: [...cs, ...add].join(',') } }, true)
    api.sound('snap')
  },
  gridSnap: true,
  actions: (t) =>
    cubeColors(t).length > 1
      ? [
          action('split', 'Küplere ayır', 'split', (tile, api) => {
            const cs = cubeColors(tile)
            const n = cs.length
            const out = cs.map((c, i) => {
              const w = toWorld(tile, { x: (-n / 2 + i + 0.5) * UNIT + (i - (n - 1) / 2) * 6, y: 0 })
              return { ...makeTile('snap-cube', { colors: c }, w.x, w.y), rot: tile.rot }
            })
            api.remove([tile.id])
            api.add(out)
            api.sound('pop')
          }),
        ]
      : [],
}

// ---------------------------------------------------------------------------
// Sayı çubukları
// ---------------------------------------------------------------------------

const barColor = (t: Tile) => t.color ?? (t.p.adjustable ? C.teal : (BAR_COLORS[(t.p.value - 1) % 10] ?? C.teal))

const numberBar: TileDef = {
  type: 'number-bar',
  name: (t) => `${t.p.value} sayı çubuğu`,
  create: (p) => ({ p: { value: p.value ?? 1, label: true, adjustable: !!p.adjustable } }),
  bounds: (t) => rectBox(t.p.value * UNIT, UNIT),
  outline: (t) => rectOutline(t.p.value * UNIT, UNIT),
  render: (t) => {
    const w = t.p.value * UNIT
    const color = barColor(t)
    return (
      <>
        <rect x={-w / 2} y={-UNIT / 2} width={w} height={UNIT} rx={2} fill={color} stroke={edge(color)} strokeWidth={1.5} />
        {t.p.units && t.p.value > 1 && <path d={gridLines(w, UNIT, t.p.value, 1)} stroke={edge(color)} strokeOpacity={0.6} strokeWidth={1} />}
        {t.p.label && <Label size={16} color={textOn(color)}>{fmt(t.p.value)}</Label>}
      </>
    )
  },
  handles: (t) => (t.p.adjustable ? [{ id: 'len', x: (t.p.value * UNIT) / 2, y: 0 }] : []),
  onHandle: (t, _id, l) => {
    const oldW = t.p.value * UNIT
    const value = Math.max(1, Math.min(100, Math.round((l.x + oldW / 2) / UNIT)))
    const c = keepLeft(t, oldW, value * UNIT)
    return { x: c.x, y: c.y, p: { ...t.p, value } }
  },
  colorable: true,
  gridSnap: true,
  actions: (t) => [toggle(t, 'label', 'Değeri göster', 'label'), toggle(t, 'units', 'Birimleri göster', 'grid')],
}

// ---------------------------------------------------------------------------
// Onluk çerçeve, sayı çerçeveleri ve sayma pulları
// ---------------------------------------------------------------------------

const CELL = UNIT * 1.25
const COUNTER_R = CELL * 0.4

function frameLayout(n: number) {
  const cols = n <= 5 ? n : Math.ceil(n / 2)
  const rows = n <= 5 ? 1 : 2
  const w = cols * CELL
  const h = rows * CELL
  const cells: Pt[] = []
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols)
    const c = i % cols
    cells.push({ x: -w / 2 + (c + 0.5) * CELL, y: -h / 2 + (r + 0.5) * CELL })
  }
  return { w, h, cells }
}

const frameN = (t: Tile) => (t.type === 'ten-frame' ? 10 : Math.max(1, t.p.value ?? 10))

/** Çerçevenin hücrelerindeki pulların toplamı */
function counted(t: Tile, tiles: Tile[] | undefined) {
  if (!tiles) return 0
  const { cells } = frameLayout(frameN(t))
  let sum = 0
  for (const o of tiles) {
    if (o.type !== 'ten-frame-counter') continue
    const l = toLocal(t, o)
    if (cells.some((c) => Math.abs(c.x - l.x) < CELL / 2 && Math.abs(c.y - l.y) < CELL / 2)) sum += o.p.value ?? 1
  }
  return sum
}

function snapCounters(t: Tile, dropped: Tile[], api: PadApi) {
  const counters = dropped.filter((d) => d.type === 'ten-frame-counter')
  if (!counters.length) return
  const { cells } = frameLayout(frameN(t))
  const ids = new Set(counters.map((c) => c.id))
  const used = new Set<number>()
  for (const o of api.all()) {
    if (o.type !== 'ten-frame-counter' || ids.has(o.id)) continue
    const l = toLocal(t, o)
    cells.forEach((c, i) => {
      if (Math.abs(c.x - l.x) < CELL / 2 && Math.abs(c.y - l.y) < CELL / 2) used.add(i)
    })
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

function frameDef(type: string, name: (t: Tile) => string): TileDef {
  return {
    type,
    name,
    create: (p) => ({ p: type === 'ten-frame' ? { count: false } : { value: p.value ?? 5, count: false } }),
    bounds: (t) => {
      const { w, h } = frameLayout(frameN(t))
      return { x: -w / 2 - 4, y: -h / 2 - (t.p.count ? 30 : 4), w: w + 8, h: h + (t.p.count ? 34 : 8) }
    },
    outline: (t) => {
      const { w, h } = frameLayout(frameN(t))
      return rectOutline(w, h)
    },
    render: (t, ctx) => {
      const { w, h, cells } = frameLayout(frameN(t))
      const color = t.color ?? '#ffffff'
      return (
        <>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={color} stroke="#242436" strokeWidth={2.5} rx={3} />
          {cells.map((c, i) => (
            <rect key={i} x={c.x - CELL / 2} y={c.y - CELL / 2} width={CELL} height={CELL} fill="none" stroke="#242436" strokeWidth={1.5} />
          ))}
          {t.p.count && !ctx.thumb && <Label y={-h / 2 - 16} size={18}>{fmt(counted(t, ctx.tiles))}</Label>}
        </>
      )
    },
    colorable: true,
    gridSnap: true,
    watch: true,
    onDrop: snapCounters,
    actions: (t) => [
      toggle(t, 'count', 'Sayıyı göster', 'hash'),
      ...(type === 'number-frame'
        ? [
            action('fewer', 'Hücre azalt', 'minus', (tile, api) => api.updateP(tile.id, (p) => ({ value: Math.max(1, (p.value ?? 5) - 1) }), true)),
            action('more', 'Hücre ekle', 'plus', (tile, api) => api.updateP(tile.id, (p) => ({ value: Math.min(20, (p.value ?? 5) + 1) }), true)),
          ]
        : []),
      action('fill', 'Pullarla doldur', 'check', (tile, api) => {
        const { cells } = frameLayout(frameN(tile))
        const ctrs = api.all().filter((o) => o.type === 'ten-frame-counter').map((o) => toLocal(tile, o))
        const free = cells.filter((c) => !ctrs.some((l) => Math.hypot(l.x - c.x, l.y - c.y) < CELL / 2))
        if (!free.length) return
        api.add(free.map((c) => {
          const w = toWorld(tile, c)
          return makeTile('ten-frame-counter', {}, w.x, w.y)
        }), false)
      }),
    ],
  }
}

const COUNTER_NEG = '#f6c90e'

const counter: TileDef = {
  type: 'ten-frame-counter',
  name: (t) => (t.p.value === -1 ? 'Negatif sayma pulu' : 'Sayma pulu'),
  create: (p) => ({ p: { value: p.value === -1 ? -1 : 1 } }),
  bounds: () => rectBox(COUNTER_R * 2, COUNTER_R * 2),
  render: (t) => {
    const c = t.p.value === -1 ? COUNTER_NEG : C.red
    return <circle r={COUNTER_R} fill={c} stroke={edge(c)} strokeWidth={1.5} />
  },
  rotatable: false,
  edgeSnap: false,
  onTap: (t, api) => api.updateP(t.id, { value: t.p.value === -1 ? 1 : -1 }, true),
  actions: () => [action('flip', 'Pulu çevir', 'flipH', (tile, api) => api.updateP(tile.id, { value: tile.p.value === -1 ? 1 : -1 }, true))],
}

// ---------------------------------------------------------------------------
// Sayı kartları
// ---------------------------------------------------------------------------

const cardText = (t: Tile) => (t.p.valueStr != null ? String(t.p.valueStr) : fmt(Number(t.p.value ?? 0), 4))
const cardSize = (t: Tile) => {
  const s = cardText(t)
  return { w: Math.max(UNIT * 1.4, s.length * 13 + 22), h: UNIT * 1.6 }
}

async function editCard(t: Tile, api: PadApi) {
  const s = await api.prompt('Kartın değeri', cardText(t))
  if (s == null) return
  const v = s.trim()
  if (!v) return
  const n = Number(v.replace(/\./g, '').replace(',', '.'))
  // Sayıysa değer olarak, değilse (x, 2a…) yazı olarak sakla
  if (Number.isFinite(n) && /^-?[\d.,]+$/.test(v)) api.update(t.id, { p: { ...t.p, value: n, valueStr: undefined } }, true)
  else api.update(t.id, { p: { ...t.p, valueStr: v.slice(0, 12) } }, true)
}

const numberCard: TileDef = {
  type: 'number-card',
  name: (t) => `Sayı kartı ${cardText(t)}`,
  create: (p) => ({ p: p.valueStr != null ? { valueStr: String(p.valueStr) } : { value: p.value ?? 1 } }),
  bounds: (t) => {
    const s = cardSize(t)
    return rectBox(s.w, s.h)
  },
  outline: (t) => {
    const s = cardSize(t)
    return rectOutline(s.w, s.h)
  },
  render: (t) => {
    const s = cardSize(t)
    const color = t.color ?? '#ffffff'
    return (
      <>
        <rect x={-s.w / 2} y={-s.h / 2} width={s.w} height={s.h} rx={6} fill={color} stroke="#b9bccb" strokeWidth={1.5} />
        <Label size={22} color={textOn(color === '#ffffff' ? '#ffffff' : color)}>{cardText(t)}</Label>
      </>
    )
  },
  colorable: true,
  onTap: (t, api) => void editCard(t, api),
  actions: () => [action('edit', 'Değeri düzenle', 'edit', (tile, api) => void editCard(tile, api))],
}

// ---------------------------------------------------------------------------
// Sayı doğrusu ve atlamalar
// ---------------------------------------------------------------------------

const STEP = UNIT * 2

function lineInfo(t: Tile) {
  const min = Number(t.p.min ?? 0)
  const max = Number(t.p.max ?? 10)
  const step = Number(t.p.step ?? 1) || 1
  const count = Math.max(1, Math.min(400, Math.round((max - min) / step)))
  const len = Math.max(UNIT * 4, Number(t.p.len ?? count * STEP))
  return { min, max, step, count, len, sp: len / count }
}

const numberLine: TileDef = {
  type: 'number-line',
  name: () => 'Sayı doğrusu',
  create: () => ({ p: { min: 0, max: 10, step: 1, len: 10 * STEP, labels: true } }),
  bounds: (t) => {
    const { len } = lineInfo(t)
    return { x: -len / 2 - 18, y: -16, w: len + 36, h: 48 }
  },
  render: (t) => {
    const { min, step, count, len, sp } = lineInfo(t)
    const color = t.color ?? '#242436'
    const every = Math.max(1, Math.ceil(28 / sp))
    let ticks = ''
    for (let i = 0; i <= count; i++) ticks += `M${round(-len / 2 + i * sp)} ${i % every ? -5 : -9}v${i % every ? 10 : 18}`
    return (
      <>
        <rect x={-len / 2 - 18} y={-16} width={len + 36} height={48} fill="transparent" />
        <path d={`M${-len / 2 - 14} 0H${len / 2 + 14}`} stroke={color} strokeWidth={2.5} />
        <path d={`M${-len / 2 - 16} 0l8 -6v12zM${len / 2 + 16} 0l-8 -6v12z`} fill={color} />
        <path d={ticks} stroke={color} strokeWidth={2} />
        {t.p.labels &&
          Array.from({ length: Math.floor(count / every) + 1 }, (_, k) => (
            <Label key={k} x={-len / 2 + k * every * sp} y={22} size={13} color={color}>
              {fmt(min + k * every * step, 3)}
            </Label>
          ))}
      </>
    )
  },
  handles: (t) => [{ id: 'len', x: lineInfo(t).len / 2, y: 0 }],
  onHandle: (t, _id, l) => {
    const { len } = lineInfo(t)
    const nl = Math.max(UNIT * 4, Math.round((l.x + len / 2) / UNIT) * UNIT)
    const c = keepLeft(t, len, nl)
    return { x: c.x, y: c.y, p: { ...t.p, len: nl } }
  },
  colorable: true,
  actions: (t) => [
    action('min', 'Başlangıç değeri', 'arrowL', async (tile, api) => {
      const v = await askNumber(api, 'Başlangıç değeri', lineInfo(tile).min)
      if (v != null && v < lineInfo(tile).max) api.updateP(tile.id, { min: v }, true)
    }),
    action('max', 'Bitiş değeri', 'arrowR', async (tile, api) => {
      const v = await askNumber(api, 'Bitiş değeri', lineInfo(tile).max)
      if (v != null && v > lineInfo(tile).min) api.updateP(tile.id, { max: v }, true)
    }),
    action('step', 'Aralık', 'ruler', async (tile, api) => {
      const v = await askNumber(api, 'Çentikler arası', lineInfo(tile).step, 0.001)
      if (v != null && v > 0) api.updateP(tile.id, { step: v }, true)
    }),
    toggle(t, 'labels', 'Sayıları göster', 'label'),
  ],
}

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
  create: (p) => ({ color: p.color ?? C.blue, p: { single: !!p.single, isFlipped: !!p.isFlipped, n: p.single ? 1 : 3, size: p.single ? 3 : 2 } }),
  bounds: (t) => {
    const { W, h } = jumpInfo(t)
    return { x: -W / 2 - 4, y: -h - 26, w: W + 8, h: h + 32 }
  },
  render: (t) => {
    const { n, size, w, W, h } = jumpInfo(t)
    const color = t.color ?? C.blue
    const flip = !!t.p.isFlipped
    return (
      <g fill="none">
        {Array.from({ length: n }, (_, i) => {
          const x0 = -W / 2 + i * w
          const x1 = x0 + w
          const mid = (x0 + x1) / 2
          // Ok ucu, eğrinin uç teğeti boyunca
          const [tx, ex] = flip ? [x0, x0 - mid] : [x1, x1 - mid]
          const ang = Math.atan2(2 * h, ex)
          const a1 = ang + 0.45
          const a2 = ang - 0.45
          return (
            <g key={i}>
              <path d={`M${round(x0)} 0Q${round(mid)} ${round(-2 * h)} ${round(x1)} 0`} stroke="transparent" strokeWidth={16} />
              <path d={`M${round(x0)} 0Q${round(mid)} ${round(-2 * h)} ${round(x1)} 0`} stroke={color} strokeWidth={3} strokeLinecap="round" />
              <path d={`M${round(tx - 11 * Math.cos(a1))} ${round(-11 * Math.sin(a1))}L${round(tx)} 0L${round(tx - 11 * Math.cos(a2))} ${round(-11 * Math.sin(a2))}`} stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              <Label x={mid} y={-h - 14} size={14} color={color}>
                {flip ? '−' : '+'}
                {fmt(size)}
              </Label>
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
  colorable: true,
  actions: (t) => [
    ...(!t.p.single
      ? [
          action('fewer', 'Atlama azalt', 'minus', (tile, api) => api.updateP(tile.id, (p) => ({ n: Math.max(1, (p.n ?? 3) - 1) }), true)),
          action('more', 'Atlama ekle', 'plus', (tile, api) => api.updateP(tile.id, (p) => ({ n: Math.min(20, (p.n ?? 3) + 1) }), true)),
        ]
      : []),
    toggle(t, 'isFlipped', 'Yönü değiştir', 'flipH'),
    action('size', 'Atlama büyüklüğü', 'edit', async (tile, api) => {
      const v = await askNumber(api, 'Atlama büyüklüğü', jumpInfo(tile).size, 0.5, 50)
      if (v != null) api.updateP(tile.id, { size: v }, true)
    }),
  ],
}

// ---------------------------------------------------------------------------
// Asal çarpan daireleri
// ---------------------------------------------------------------------------

const PRIME_COLORS: Record<number, string> = { 2: C.orange, 3: C.blue, 5: C.green, 7: C.purple, 11: C.pink, 13: C.teal, 17: C.yellow, 19: C.red, 23: C.dBlue }
const primeColor = (p: number) => PRIME_COLORS[p] ?? C.grey

function factor(n: number): number[] {
  const out: number[] = []
  let m = Math.max(1, Math.floor(n))
  for (let p = 2; p * p <= m; p++)
    while (m % p === 0) {
      out.push(p)
      m /= p
    }
  if (m > 1) out.push(m)
  return out
}

const DISK_R = 36

function primeDots(n: number) {
  const fs = factor(n).sort((a, b) => b - a)
  const out: ReactElement[] = []
  const rec = (rest: number[], cx: number, cy: number, r: number, color: string) => {
    if (!rest.length) {
      out.push(<circle key={out.length} cx={round(cx)} cy={round(cy)} r={round(Math.max(0.6, r * 0.86))} fill={color} />)
      return
    }
    const p = rest[0]
    const s = Math.sin(Math.PI / p)
    const sr = (r * s) / (1 + s)
    const d = r - sr
    if (rest.length > 1 && sr > 3) out.push(<circle key={out.length} cx={round(cx)} cy={round(cy)} r={round(r * 0.97)} fill={primeColor(p)} fillOpacity={0.12} />)
    for (let k = 0; k < p; k++) {
      const a = -Math.PI / 2 + (2 * Math.PI * k) / p + (p === 2 ? Math.PI / 2 : 0)
      rec(rest.slice(1), cx + d * Math.cos(a), cy + d * Math.sin(a), sr, color)
    }
  }
  rec(fs, 0, 0, DISK_R - 3, fs.length ? primeColor(fs[fs.length - 1]) : C.dark)
  return out
}

const primeDisk: TileDef = {
  type: 'prime-disk',
  name: (t) => `${t.p.value} asal çarpan dairesi`,
  create: (p) => ({ p: { value: p.value ?? 6, label: true } }),
  bounds: (t) => ({ x: -DISK_R, y: -DISK_R, w: DISK_R * 2, h: DISK_R * 2 + (t.p.label ? 22 : 0) }),
  render: (t) => (
    <>
      <circle r={DISK_R} fill={t.color ?? '#ffffff'} stroke="#b9bccb" strokeWidth={1.5} />
      {primeDots(t.p.value)}
      {t.p.label && <Label y={DISK_R + 11} size={14}>{fmt(t.p.value)}</Label>}
    </>
  ),
  rotatable: false,
  onDrop: (t, dropped, api) => {
    const disks = dropped.filter((d) => d.type === 'prime-disk')
    if (!disks.length) return
    const v = disks.reduce((a, d) => a * d.p.value, t.p.value)
    if (v > 10000) return api.sound('error')
    api.remove(disks.map((d) => d.id))
    api.updateP(t.id, { value: v }, true)
    api.sound('snap')
  },
  actions: (t) => [
    action('edit', 'Sayıyı değiştir', 'edit', async (tile, api) => {
      const v = await askNumber(api, 'Sayı (1–10000)', tile.p.value, 1, 10000)
      if (v != null) api.updateP(tile.id, { value: Math.round(v) }, true)
    }),
    ...(factor(t.p.value).length > 1
      ? [
          action('split', 'Asal çarpanlarına ayır', 'split', (tile, api) => {
            const fs = factor(tile.p.value)
            const out = fs.map((p, i) => makeTile('prime-disk', { value: p }, tile.x + (i - (fs.length - 1) / 2) * (DISK_R * 2 + 10), tile.y))
            api.remove([tile.id])
            api.add(out)
            api.sound('pop')
          }),
        ]
      : []),
    toggle(t, 'label', 'Sayıyı göster', 'label'),
  ],
}

// ---------------------------------------------------------------------------
// Nokta dizilimleri
// ---------------------------------------------------------------------------

const DICE: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
}
const DOT_SP = 16

function dotLayout(n: number): Pt[] {
  if (n <= 6) return (DICE[Math.max(1, n)] ?? []).map(([x, y]) => ({ x: (x - 1) * DOT_SP, y: (y - 1) * DOT_SP }))
  // Beşli sıralar; her iki sırada bir küçük boşluk (onluk blokları)
  const rows = Math.ceil(n / 5)
  const pts: Pt[] = []
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / 5)
    const c = i % 5
    pts.push({ x: (c - 2) * DOT_SP, y: r * DOT_SP + Math.floor(r / 2) * 8 })
  }
  const h = (rows - 1) * DOT_SP + Math.floor((rows - 1) / 2) * 8
  return pts.map((p) => ({ x: p.x, y: p.y - h / 2 }))
}

const dotBox = (n: number) => {
  const pts = dotLayout(n)
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const w = Math.max(...xs) - Math.min(...xs) + 28
  const h = Math.max(...ys) - Math.min(...ys) + 28
  return rectBox(Math.max(w, 44), Math.max(h, 44))
}

const numberDot: TileDef = {
  type: 'number-dot',
  name: (t) => `${t.p.value} nokta`,
  create: (p) => ({ color: C.blue, p: { value: p.value ?? 5 } }),
  bounds: (t) => dotBox(t.p.value),
  render: (t) => {
    const b = dotBox(t.p.value)
    const color = t.color ?? C.blue
    return (
      <>
        <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={8} fill="#ffffff" stroke="#b9bccb" strokeWidth={1.5} />
        {dotLayout(t.p.value).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={6} fill={color} />
        ))}
      </>
    )
  },
  colorable: true,
  actions: () => [
    action('fewer', 'Bir eksilt', 'minus', (tile, api) => api.updateP(tile.id, (p) => ({ value: Math.max(1, p.value - 1) }), true)),
    action('more', 'Bir ekle', 'plus', (tile, api) => api.updateP(tile.id, (p) => ({ value: Math.min(50, p.value + 1) }), true)),
  ],
}

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

function cellText(t: Tile, r: number, c: number, table: boolean): { text: string; head: boolean } {
  if (!table) return { text: fmt((t.p.start ?? 1) + r * (t.p.cols ?? 10) + c), head: false }
  const op = t.p.kind === 'addition' ? '+' : '×'
  if (r === 0 && c === 0) return { text: op, head: true }
  if (r === 0) return { text: String(c), head: true }
  if (c === 0) return { text: String(r), head: true }
  return { text: String(op === '+' ? r + c : r * c), head: false }
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
        const y = -h / 2 + r * GC
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
  actions: (t) => {
    const table = gridInfo(t).table
    const size = (key: 'rows' | 'cols', d: number, label: string, icon: 'plus' | 'minus') =>
      action(`${key}${d}`, label, icon, (tile, api) => api.updateP(tile.id, (p) => ({ [key]: Math.min(20, Math.max(1, (p[key] ?? 10) + d)), marks: {}, rev: [] }), true))
    return [
      size('rows', -1, 'Satır azalt', 'minus'),
      size('rows', 1, 'Satır ekle', 'plus'),
      ...(table ? [size('cols', -1, 'Sütun azalt', 'minus'), size('cols', 1, 'Sütun ekle', 'plus')] : []),
      ...(!table
        ? [
            action('start', 'Başlangıç sayısı', 'edit', async (tile, api) => {
              const v = await askNumber(api, 'İlk sayı', tile.p.start ?? 1)
              if (v != null) api.updateP(tile.id, { start: Math.round(v) }, true)
            }),
          ]
        : []),
      action('hide', t.p.hide ? 'Sayıları göster' : 'Sayıları gizle', t.p.hide ? 'eye' : 'eyeOff', (tile, api) => api.updateP(tile.id, (p) => ({ hide: !p.hide, rev: [] }), true), !!t.p.hide),
      action('clear', 'Renkleri temizle', 'reset', (tile, api) => api.updateP(tile.id, { marks: {}, rev: [] }, true)),
    ]
  },
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
  actions: (t) => [
    toggle(t, 'label', 'Değeri göster', 'label'),
    action('clear', 'Temizle', 'reset', (tile, api) => api.updateP(tile.id, { cells: [] }, true)),
  ],
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

const handTile: TileDef = {
  type: 'hand-tile',
  name: (t) => `${t.p.value} parmak`,
  create: (p) => ({ p: { value: p.value ?? 5 } }),
  bounds: () => ({ x: -52, y: -54, w: 92, h: 100 }),
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
        {/* Başparmak */}
        {v === 5 && <rect x={-46} y={-6} width={30} height={12} rx={6} transform="rotate(-35 -20 6)" />}
        <rect x={-24} y={0} width={54} height={44} rx={15} />
        {/* Kıvrık parmak eklemleri */}
        {FINGERS.map((f, i) => (i < v ? null : <path key={i} d={`M${f.x - 4} 4h8`} fill="none" strokeWidth={1.3} />))}
        {v !== 5 && <rect x={-28} y={8} width={26} height={11} rx={5.5} transform="rotate(-10 -15 13)" />}
      </g>
    )
  },
  colorable: true,
  flippable: true,
  actions: () => [
    action('fewer', 'Parmak indir', 'minus', (tile, api) => api.updateP(tile.id, (p) => ({ value: Math.max(0, p.value - 1) }), true)),
    action('more', 'Parmak kaldır', 'plus', (tile, api) => api.updateP(tile.id, (p) => ({ value: Math.min(5, p.value + 1) }), true)),
  ],
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
    // Sağdaki bir boncuk: kendisi ve solundakiler sola; soldaki bir boncuk: kendisi ve sağındakiler sağa
    counts[r] = i >= c ? i + 1 : i
    api.updateP(t.id, { counts }, true)
    api.sound('click')
  },
  colorable: true,
  actions: (t) => [
    toggle(t, 'values', 'Sayıları göster', 'hash'),
    action('fewer', 'Sıra azalt', 'minus', (tile, api) => api.updateP(tile.id, (p) => ({ rows: Math.max(1, (p.rows ?? 10) - 1) }), true)),
    action('more', 'Sıra ekle', 'plus', (tile, api) => api.updateP(tile.id, (p) => ({ rows: Math.min(10, (p.rows ?? 10) + 1) }), true)),
    action('reset', 'Sıfırla', 'reset', (tile, api) => api.updateP(tile.id, { counts: Array(10).fill(0) }, true)),
  ],
}

// ---------------------------------------------------------------------------
// Patlayan noktalar
// ---------------------------------------------------------------------------

const DOT_R = 10

const dot: TileDef = {
  type: 'dot',
  name: (t) => (t.p.value === -1 ? 'Karşı nokta' : 'Nokta'),
  create: (p) => ({ p: { value: p.value === -1 ? -1 : 1 } }),
  bounds: () => rectBox(DOT_R * 2 + 4, DOT_R * 2 + 4),
  render: (t) => (t.p.value === -1 ? <circle r={DOT_R} fill="#ffffff" stroke="#242436" strokeWidth={2.5} /> : <circle r={DOT_R} fill="#242436" stroke="#242436" strokeWidth={1} />),
  rotatable: false,
  edgeSnap: false,
}

const BOX = 104

function machineInfo(t: Tile) {
  const n = Math.max(1, Math.min(8, t.p.boxes ?? 5))
  const base = Math.max(2, t.p.base ?? 10)
  const w = n * BOX
  const h = BOX + 64
  return { n, base, w, h, top: -h / 2 + 30 }
}

/** Kutu i'nin yerel dikdörtgeni */
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
  create: () => ({ p: { boxes: 5, base: 10 } }),
  bounds: (t) => {
    const { w, h } = machineInfo(t)
    return rectBox(w + 8, h)
  },
  render: (t, ctx) => {
    const { n, base, w, h } = machineInfo(t)
    const boxes = ctx.tiles ? dotsInBoxes(t, ctx.tiles) : null
    const total = boxes ? boxes.reduce((s, b, i) => s + (b.pos.length - b.neg.length) * base ** (n - 1 - i), 0) : 0
    return (
      <>
        <rect x={-w / 2 - 4} y={-h / 2} width={w + 8} height={h} rx={10} fill="#eef0f7" stroke="#b9bccb" strokeWidth={1.5} />
        <Label y={-h / 2 + 15} size={14}>
          1 ← {base}
          {boxes && !ctx.thumb ? `   ·   Değer: ${fmt(total)}` : ''}
        </Label>
        {Array.from({ length: n }, (_, i) => {
          const b = boxRect(t, i)
          const cnt = boxes?.[i]
          return (
            <g key={i}>
              <rect x={b.x + 3} y={b.y} width={b.w - 6} height={b.h} rx={6} fill="#ffffff" stroke="#777" strokeWidth={1.5} />
              <Label x={b.x + b.w / 2} y={b.y + b.h + 16} size={13} color="#5b6080">
                {cnt && !ctx.thumb ? (cnt.neg.length ? `${cnt.pos.length} | −${cnt.neg.length}` : String(cnt.pos.length)) : fmt(base ** (n - 1 - i))}
              </Label>
            </g>
          )
        })}
      </>
    )
  },
  watch: true,
  rotatable: false,
  actions: () => [
    action('explode', 'Patlat', 'split', (tile, api) => {
      const { n, base } = machineInfo(tile)
      const boxes = dotsInBoxes(tile, api.all())
      const remove: string[] = []
      const add: Tile[] = []
      for (let i = n - 1; i > 0; i--) {
        for (const kind of ['pos', 'neg'] as const) {
          const list = boxes[i][kind]
          while (list.length >= base) {
            const group = list.splice(0, base)
            remove.push(...group.map((d) => d.id))
            const w = randomIn(tile, i - 1)
            const nd = makeTile('dot', { value: kind === 'neg' ? -1 : 1 }, w.x, w.y)
            add.push(nd)
            boxes[i - 1][kind].push(nd)
          }
        }
      }
      if (!remove.length) return api.sound('error')
      api.remove(remove)
      api.add(add, false)
      api.sound('pop')
    }),
    action('unexplode', 'Geri patlat', 'merge', (tile, api) => {
      // En soldaki dolu kutudan bir noktayı sağdaki kutuya taban kadar noktaya çevir
      const { n, base } = machineInfo(tile)
      const boxes = dotsInBoxes(tile, api.all())
      for (let i = 0; i < n - 1; i++) {
        const d = boxes[i].pos[0] ?? boxes[i].neg[0]
        if (!d) continue
        api.remove([d.id])
        api.add(Array.from({ length: base }, () => {
          const w = randomIn(tile, i + 1)
          return makeTile('dot', { value: d.p.value }, w.x, w.y)
        }), false)
        api.sound('pop')
        return
      }
    }),
    action('annihilate', 'Nokta–karşı nokta çiftlerini yok et', 'check', (tile, api) => {
      const remove: string[] = []
      for (const b of dotsInBoxes(tile, api.all())) {
        const k = Math.min(b.pos.length, b.neg.length)
        remove.push(...b.pos.slice(0, k).map((d) => d.id), ...b.neg.slice(0, k).map((d) => d.id))
      }
      if (remove.length) {
        api.remove(remove)
        api.sound('pop')
      }
    }),
    action('base', 'Taban', 'edit', async (tile, api) => {
      const v = await askNumber(api, 'Taban (2–20)', machineInfo(tile).base, 2, 20)
      if (v != null) api.updateP(tile.id, { base: Math.round(v) }, true)
    }),
    action('fewer', 'Kutu azalt', 'minus', (tile, api) => api.updateP(tile.id, (p) => ({ boxes: Math.max(1, (p.boxes ?? 5) - 1) }), true)),
    action('more', 'Kutu ekle', 'plus', (tile, api) => api.updateP(tile.id, (p) => ({ boxes: Math.min(8, (p.boxes ?? 5) + 1) }), true)),
  ],
}

// ---------------------------------------------------------------------------
// Sıfır kovası
// ---------------------------------------------------------------------------

function releasePair(t: Tile, api: PadApi) {
  const a = toWorld(t, { x: 70, y: -20 })
  const b = toWorld(t, { x: 70, y: 22 })
  api.add([makeTile('algebra', { expr: '1' }, a.x, a.y), makeTile('algebra', { expr: '-1' }, b.x, b.y)], false)
  api.sound('pop')
}

const bucket: TileDef = {
  type: 'bucket',
  name: () => 'Sıfır kovası',
  bounds: () => ({ x: -46, y: -56, w: 92, h: 96 }),
  render: (t) => {
    const color = t.color ?? C.lBlue
    return (
      <g strokeLinejoin="round">
        <path d="M-34 -24A34 28 0 0 1 34 -24" fill="none" stroke="#5b6080" strokeWidth={3} />
        <path d="M-40 -24L-30 38H30L40 -24Z" fill={color} stroke={edge(color)} strokeWidth={2} />
        <ellipse cy={-24} rx={40} ry={8} fill={edge(color)} stroke={edge(color)} strokeWidth={2} />
        <ellipse cy={-24} rx={36} ry={6} fill="#3a3645" fillOpacity={0.35} />
        <Label y={10} size={30} weight={900} color="#ffffff">0</Label>
      </g>
    )
  },
  colorable: true,
  onTap: (t, api) => releasePair(t, api),
  onDrop: (_t, dropped, api) => {
    // Aynı terimin artı ve eksisi birbirini götürür
    const pool = new Map<string, Tile[]>()
    for (const d of dropped) if (d.type === 'algebra') pool.set(String(d.p.expr), [...(pool.get(String(d.p.expr)) ?? []), d])
    const remove: string[] = []
    for (const [expr, list] of pool) {
      if (expr.startsWith('-')) continue
      const neg = pool.get(`-${expr}`) ?? []
      const k = Math.min(list.length, neg.length)
      remove.push(...list.slice(0, k).map((d) => d.id), ...neg.slice(0, k).map((d) => d.id))
    }
    if (remove.length) {
      api.remove(remove)
      api.sound('pop')
    }
  },
  actions: () => [action('release', 'Sıfır çifti çıkar', 'plus', (tile, api) => releasePair(tile, api))],
}

export const numbersTiles: TileDef[] = [
  numberTile,
  numberCube,
  snapCube,
  numberBar,
  frameDef('ten-frame', () => 'Onluk çerçeve'),
  frameDef('number-frame', (t) => `${t.p.value} sayı çerçevesi`),
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
