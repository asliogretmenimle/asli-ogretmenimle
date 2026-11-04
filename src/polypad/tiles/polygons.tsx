import type { Pt, Tile, TileDef } from '../types'
import { SIDE, UNIT, centerPts, deg, dist, fmt, pathOf, regularPolygon, round, turtle } from '../geom'
import { C, Label, action, edge, recenter, toggle } from './kit'
import { PENTAGONS } from './pentagons'

const S = SIDE
const scaled = (pts: [number, number][], k: number) => centerPts(pts.map(([x, y]) => ({ x: x * k, y: y * k })))

/** Hazır çokgenler: köşeler (merkezli) ve varsayılan renk */
export const SHAPES: Record<string, { pts: Pt[]; color: string }> = {
  'equ-triangle': { pts: centerPts(regularPolygon(3)), color: C.orange },
  square: { pts: regularPolygon(4), color: C.blue },
  'reg-pentagon': { pts: regularPolygon(5), color: C.green },
  'reg-hexagon': { pts: regularPolygon(6), color: C.pink },
  'reg-heptagon': { pts: regularPolygon(7), color: C.teal },
  'reg-octagon': { pts: regularPolygon(8), color: C.purple },
  trapezium: { pts: centerPts(turtle([[2 * S, -120], [S, -60], [S, -60], [S, 0]])), color: C.red },
  rhombus: { pts: centerPts(turtle([[S, -60], [S, -120], [S, -60], [S, 0]])), color: C.blue },
  'rhombus-2': { pts: centerPts(turtle([[S, -150], [S, -30], [S, -150], [S, 0]])), color: C.yellow },
  rectangle: { pts: centerPts(turtle([[2 * S, -90], [S, -90], [2 * S, -90], [S, 0]])), color: C.blue },
  'right-triangle': { pts: centerPts([{ x: 0, y: 0 }, { x: S, y: 0 }, { x: 0, y: S }]), color: C.green },
  'right-triangle-2': { pts: centerPts([{ x: 0, y: 0 }, { x: 0, y: S }, { x: S * Math.sqrt(3), y: 0 }]), color: C.orange },
  chevron: { pts: scaled([[15.3, 68.53], [48.23, 68.53], [64.7, 40], [48.23, 11.47], [15.3, 11.47], [31.77, 40]], S / 32.94), color: C.red },
  kite: { pts: scaled([[40, 11.2], [64.94, 25.6], [40, 68.8], [15.06, 25.6]], S / 28.8), color: C.purple },
  dart: { pts: scaled([[71.18, 67], [40, 13], [8.82, 67], [40, 49]], S / 62.35), color: C.teal },
}

const shapeOf = (name: string) => SHAPES[name] ?? PENTAGONS[name] ?? SHAPES.square

/** Köşelerdeki iç açılar (derece) */
function interiorAngles(pts: Pt[]) {
  const n = pts.length
  // Saat yönü ya da tersi olabilir: işaretli alana göre düzelt
  let area = 0
  for (let i = 0; i < n; i++) area += pts[i].x * pts[(i + 1) % n].y - pts[(i + 1) % n].x * pts[i].y
  const sgn = Math.sign(area) || 1
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n]
    const b = pts[(i + 1) % n]
    const a1 = Math.atan2(a.y - p.y, a.x - p.x)
    const a2 = Math.atan2(b.y - p.y, b.x - p.x)
    let d = deg(a2 - a1) * sgn
    d = ((d % 360) + 360) % 360
    return { p, a: 360 - d, dir: (a1 + a2) / 2 }
  })
}

/** Çokgenin açı ve kenar etiketleri */
function Measures({ pts, angles, sides, color }: { pts: Pt[]; angles?: boolean; sides?: boolean; color: string }) {
  const c = pts.reduce((s, p) => ({ x: s.x + p.x / pts.length, y: s.y + p.y / pts.length }), { x: 0, y: 0 })
  return (
    <g style={{ pointerEvents: 'none' }}>
      {angles &&
        interiorAngles(pts).map(({ p, a }, i) => {
          const dx = c.x - p.x
          const dy = c.y - p.y
          const l = Math.hypot(dx, dy) || 1
          const k = Math.min(22, l * 0.45)
          return (
            <Label key={`a${i}`} x={p.x + (dx / l) * k} y={p.y + (dy / l) * k} size={10} color={color}>
              {fmt(a, 1)}°
            </Label>
          )
        })}
      {sides &&
        pts.map((p, i) => {
          const q = pts[(i + 1) % pts.length]
          const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
          const dx = m.x - c.x
          const dy = m.y - c.y
          const l = Math.hypot(dx, dy) || 1
          return (
            <Label key={`s${i}`} x={m.x + (dx / l) * 11} y={m.y + (dy / l) * 11} size={10} color="#242436">
              {fmt(dist(p, q) / UNIT, 2)}
            </Label>
          )
        })}
    </g>
  )
}

const measureActions = (t: Tile) => [toggle(t, 'angles', 'Açıları göster', 'angle'), toggle(t, 'sides', 'Kenar uzunluklarını göster', 'ruler')]

function Poly({ t, pts }: { t: Tile; pts: Pt[] }) {
  const color = t.color ?? '#0f82f2'
  return (
    <>
      <path d={pathOf(pts)} fill={color} stroke={edge(color)} strokeWidth={1.5} strokeLinejoin="round" />
      {(t.p.angles || t.p.sides) && <Measures pts={pts} angles={t.p.angles} sides={t.p.sides} color="#fff" />}
    </>
  )
}

const polygon: TileDef = {
  type: 'polygon',
  name: () => 'Çokgen',
  create: (p) => ({ color: shapeOf(p.shape).color }),
  outline: (t) => shapeOf(t.p.shape).pts,
  bounds: (t) => {
    const pts = shapeOf(t.p.shape).pts
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
  },
  render: (t) => <Poly t={t} pts={shapeOf(t.p.shape).pts} />,
  colorable: true,
  flippable: true,
  gridSnap: true,
  actions: measureActions,
}

// ---------------------------------------------------------------------------
// Boyutu değiştirilebilen şekiller
// ---------------------------------------------------------------------------

const snapHalf = (v: number) => Math.max(0.5, Math.round(v * 2) / 2)

const rectangle: TileDef = {
  type: 'rectangle',
  name: () => 'Dikdörtgen',
  create: () => ({ color: C.blue, p: { w: 4, h: 3, sides: true } }),
  outline: (t) => {
    const w = (t.p.w * UNIT) / 2
    const h = (t.p.h * UNIT) / 2
    return [{ x: -w, y: -h }, { x: w, y: -h }, { x: w, y: h }, { x: -w, y: h }]
  },
  bounds: (t) => ({ x: (-t.p.w * UNIT) / 2, y: (-t.p.h * UNIT) / 2, w: t.p.w * UNIT, h: t.p.h * UNIT }),
  render: (t, ctx) => {
    const w = t.p.w * UNIT
    const h = t.p.h * UNIT
    const color = t.color ?? C.blue
    return (
      <>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={color} stroke={edge(color)} strokeWidth={1.5} />
        {t.p.grid && (
          <path
            d={[...Array(Math.ceil(t.p.w) - 1)].map((_, i) => `M${-w / 2 + (i + 1) * UNIT} ${-h / 2}v${h}`).join('') + [...Array(Math.ceil(t.p.h) - 1)].map((_, i) => `M${-w / 2} ${-h / 2 + (i + 1) * UNIT}h${w}`).join('')}
            stroke="rgba(255,255,255,.55)"
            strokeWidth={1}
          />
        )}
        {t.p.sides && !ctx.thumb && (
          <>
            <Label y={-h / 2 - 11} size={12}>{fmt(t.p.w)}</Label>
            <Label x={w / 2 + 6} anchor="start" size={12}>{fmt(t.p.h)}</Label>
          </>
        )}
        {t.p.area && <Label size={14} color="#fff">Alan = {fmt(t.p.w * t.p.h)}</Label>}
      </>
    )
  },
  handles: (t) => [{ id: 'size', x: (t.p.w * UNIT) / 2, y: (t.p.h * UNIT) / 2 }],
  onHandle: (t, _id, l) => ({ p: { ...t.p, w: snapHalf((l.x * 2) / UNIT), h: snapHalf((l.y * 2) / UNIT) } }),
  colorable: true,
  gridSnap: true,
  actions: (t) => [toggle(t, 'sides', 'Kenar uzunlukları', 'ruler'), toggle(t, 'area', 'Alanı göster', 'label'), toggle(t, 'grid', 'Birim kareler', 'grid')],
}

const regPolygon: TileDef = {
  type: 'reg-polygon',
  name: (t) => `Düzgün ${t.p.n}-gen`,
  create: () => ({ color: C.pink, p: { n: 6, side: 2 } }),
  outline: (t) => regularPolygon(t.p.n, t.p.side * UNIT),
  bounds: (t) => {
    const r = (t.p.side * UNIT) / (2 * Math.sin(Math.PI / t.p.n))
    return { x: -r, y: -r, w: 2 * r, h: 2 * r }
  },
  render: (t) => <Poly t={t} pts={regularPolygon(t.p.n, t.p.side * UNIT)} />,
  handles: (t) => {
    const p = regularPolygon(t.p.n, t.p.side * UNIT)[0]
    return [{ id: 'size', x: p.x, y: p.y }]
  },
  onHandle: (t, _id, l) => {
    const r = Math.hypot(l.x, l.y)
    const side = 2 * r * Math.sin(Math.PI / t.p.n)
    return { p: { ...t.p, side: snapHalf(side / UNIT) } }
  },
  colorable: true,
  actions: (t) => [
    action('fewer', 'Kenar sayısını azalt', 'minus', (tile, api) => api.updateP(tile.id, (p) => ({ n: Math.max(3, p.n - 1) }), true)),
    action('more', 'Kenar sayısını artır', 'plus', (tile, api) => api.updateP(tile.id, (p) => ({ n: Math.min(20, p.n + 1) }), true)),
    ...measureActions(t),
  ],
}

const customPolygon: TileDef = {
  type: 'custom-polygon',
  name: () => 'Serbest çokgen',
  create: () => ({
    color: C.green,
    p: { pts: centerPts([{ x: 0, y: -40 }, { x: 60, y: -80 }, { x: 30, y: 30 }, { x: -30, y: 30 }, { x: -60, y: -40 }].map((p) => ({ x: p.x * 1.1, y: p.y * 1.1 }))) },
  }),
  outline: (t) => t.p.pts,
  bounds: (t) => {
    const pts: Pt[] = t.p.pts
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
  },
  render: (t) => <Poly t={t} pts={t.p.pts} />,
  handles: (t) => (t.p.pts as Pt[]).map((p, i) => ({ id: String(i), x: p.x, y: p.y })),
  onHandle: (t, id, l, _api, phase) => {
    const pts = (t.p.pts as Pt[]).slice()
    pts[Number(id)] = { x: round(l.x), y: round(l.y) }
    if (phase !== 'end') return { p: { ...t.p, pts } }
    const r = recenter(t, pts)
    return { x: r.x, y: r.y, p: { ...t.p, pts: r.pts } }
  },
  colorable: true,
  actions: (t) => [
    action('add', 'Köşe ekle', 'plus', (tile, api) => {
      const pts = tile.p.pts as Pt[]
      // En uzun kenarın ortasına köşe ekle
      let best = 0
      pts.forEach((p, i) => {
        if (dist(p, pts[(i + 1) % pts.length]) > dist(pts[best], pts[(best + 1) % pts.length])) best = i
      })
      const a = pts[best]
      const b = pts[(best + 1) % pts.length]
      const next = [...pts.slice(0, best + 1), { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, ...pts.slice(best + 1)]
      api.updateP(tile.id, { pts: next }, true)
    }),
    action('remove', 'Köşe sil', 'minus', (tile, api) => {
      const pts = tile.p.pts as Pt[]
      if (pts.length > 3) api.updateP(tile.id, { pts: pts.slice(0, -1) }, true)
    }),
    ...measureActions(t),
  ],
}

const circle: TileDef = {
  type: 'circle',
  name: (t) => (t.p.isEllipse ? 'Elips' : 'Daire'),
  create: (p) => ({ color: C.orange, p: p.isEllipse ? { isEllipse: true, r: 90, ry: 50 } : { r: 60 } }),
  bounds: (t) => {
    const ry = t.p.isEllipse ? t.p.ry : t.p.r
    return { x: -t.p.r, y: -ry, w: t.p.r * 2, h: ry * 2 }
  },
  render: (t) => {
    const color = t.color ?? C.orange
    const ry = t.p.isEllipse ? t.p.ry : t.p.r
    return (
      <>
        <ellipse rx={t.p.r} ry={ry} fill={color} stroke={edge(color)} strokeWidth={1.5} />
        {t.p.radius && !t.p.isEllipse && (
          <>
            <path d={`M0 0H${t.p.r}`} stroke="#fff" strokeWidth={2} strokeDasharray="4 4" />
            <circle r={3} fill="#fff" />
            <Label x={t.p.r / 2} y={-10} size={12} color="#fff">r = {fmt(t.p.r / UNIT)}</Label>
          </>
        )}
      </>
    )
  },
  handles: (t) => (t.p.isEllipse ? [{ id: 'rx', x: t.p.r, y: 0 }, { id: 'ry', x: 0, y: t.p.ry }] : [{ id: 'r', x: t.p.r, y: 0 }]),
  onHandle: (t, id, l) => {
    if (id === 'ry') return { p: { ...t.p, ry: Math.max(8, Math.round(Math.abs(l.y))) } }
    const r = id === 'rx' ? Math.abs(l.x) : Math.hypot(l.x, l.y)
    return { p: { ...t.p, r: Math.max(8, Math.round(r)) } }
  },
  rotatable: true,
  colorable: true,
  actions: (t) => (t.p.isEllipse ? [] : [toggle(t, 'radius', 'Yarıçapı göster', 'ruler')]),
}

export const polygonTiles: TileDef[] = [polygon, rectangle, regPolygon, customPolygon, circle]
