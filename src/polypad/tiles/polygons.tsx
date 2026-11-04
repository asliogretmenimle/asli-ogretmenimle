import type { ActionSpec, Pt, Tile, TileDef } from '../types'
import { SIDE, UNIT, centerPts, deg, dist, fmt, pathOf, regularPolygon, round, turtle } from '../geom'
import { C, FONT, Label, edge, recenter } from './kit'
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

// ---------------------------------------------------------------------------
// Ortak çizim: ölçek, köşe yuvarlama, delikler, etiket
// ---------------------------------------------------------------------------

const sc = (t: Tile) => (typeof t.p.scale === 'number' && t.p.scale > 0 ? t.p.scale : 1)
const mul = (pts: Pt[], k: number) => (k === 1 ? pts : pts.map((p) => ({ x: p.x * k, y: p.y * k })))
const boxOf = (pts: Pt[]) => {
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
}

/** Köşeleri r yarıçapıyla yuvarlatılmış kapalı yol */
function roundedPath(pts: Pt[], r: number) {
  if (r <= 0) return pathOf(pts)
  const n = pts.length
  let d = ''
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n]
    const p = pts[i]
    const b = pts[(i + 1) % n]
    const la = dist(a, p)
    const lb = dist(p, b)
    const k = Math.min(r, la / 2, lb / 2)
    const p1 = { x: p.x + ((a.x - p.x) / la) * k, y: p.y + ((a.y - p.y) / la) * k }
    const p2 = { x: p.x + ((b.x - p.x) / lb) * k, y: p.y + ((b.y - p.y) / lb) * k }
    d += `${i ? 'L' : 'M'}${round(p1.x)} ${round(p1.y)}Q${round(p.x)} ${round(p.y)} ${round(p2.x)} ${round(p2.y)}`
  }
  return d + 'Z'
}

/** Parçanın üzerindeki yazı etiketi (yazar seçeneği); döndürülmüyorsa hep dik durur */
function TextLabel({ t, color }: { t: Tile; color: string }) {
  if (!t.p.textLabel) return null
  const size = 18 + 2 * (t.p.textLabelFontSize ?? 0)
  const upright = !t.p.textLabelRotate
  return (
    <g transform={upright ? `${t.flip ? 'scale(-1 1) ' : ''}rotate(${-t.rot})` : undefined} style={{ pointerEvents: 'none' }}>
      <text textAnchor="middle" dominantBaseline="central" fontSize={size} fontWeight={700} fontFamily={FONT} fill={color}>
        {t.p.textLabel}
      </text>
    </g>
  )
}

function Poly({ t, pts, holes }: { t: Tile; pts: Pt[]; holes?: Pt[][] }) {
  const color = t.color ?? '#0f82f2'
  const r = (t.p.cornerRadius ?? 0) * UNIT
  const d = roundedPath(pts, r) + (holes ?? []).map((h) => pathOf(h)).join('')
  return (
    <>
      <path d={d} fill={color} fillRule="evenodd" stroke={edge(color)} strokeWidth={1.5} strokeLinejoin="round" />
      {(t.p.angles || t.p.sides) && <Measures pts={pts} angles={t.p.angles} sides={t.p.sides} color="#fff" />}
      <TextLabel t={t} color={textColor(color)} />
    </>
  )
}

const textColor = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return '#fff'
  const n = parseInt(m[1], 16)
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 160 ? '#242436' : '#fff'
}

const polyPts = (t: Tile) => mul(shapeOf(t.p.shape).pts, sc(t))

const polygon: TileDef = {
  type: 'polygon',
  name: () => 'Çokgen',
  create: (p) => ({ color: shapeOf(p.shape).color }),
  outline: polyPts,
  bounds: (t) => boxOf(polyPts(t)),
  render: (t) => <Poly t={t} pts={polyPts(t)} />,
  colorable: true,
  flippable: true,
  gridSnap: true,
}

// ---------------------------------------------------------------------------
// Boyutu değiştirilebilen şekiller
// ---------------------------------------------------------------------------

const snapHalf = (v: number) => Math.max(0.5, Math.round(v * 2) / 2)

const rectPts = (t: Tile) => {
  const w = (t.p.w * UNIT * sc(t)) / 2
  const h = (t.p.h * UNIT * sc(t)) / 2
  return [{ x: -w, y: -h }, { x: w, y: -h }, { x: w, y: h }, { x: -w, y: h }]
}

const rectangle: TileDef = {
  type: 'rectangle',
  name: () => 'Dikdörtgen',
  create: () => ({ color: C.blue, p: { w: 4, h: 3, sides: true } }),
  outline: rectPts,
  bounds: (t) => boxOf(rectPts(t)),
  render: (t, ctx) => {
    const k = sc(t)
    const w = t.p.w * UNIT * k
    const h = t.p.h * UNIT * k
    const color = t.color ?? C.blue
    const u = UNIT * k
    return (
      <>
        <path d={roundedPath(rectPts(t), (t.p.cornerRadius ?? 0) * UNIT)} fill={color} stroke={edge(color)} strokeWidth={1.5} filter={t.p.shadow ? 'url(#pp-shadow)' : undefined} />
        {t.p.grid && (
          <path
            d={[...Array(Math.max(0, Math.ceil(t.p.w) - 1))].map((_, i) => `M${-w / 2 + (i + 1) * u} ${-h / 2}v${h}`).join('') + [...Array(Math.max(0, Math.ceil(t.p.h) - 1))].map((_, i) => `M${-w / 2} ${-h / 2 + (i + 1) * u}h${w}`).join('')}
            stroke="rgba(255,255,255,.55)"
            strokeWidth={1}
          />
        )}
        {t.p.sides && !ctx.thumb && (
          <>
            <Label y={-h / 2 - 11} size={12}>{fmt(t.p.w * k)}</Label>
            <Label x={w / 2 + 6} anchor="start" size={12}>{fmt(t.p.h * k)}</Label>
          </>
        )}
        {t.p.area && <Label size={14} color="#fff">Alan = {fmt(t.p.w * t.p.h * k * k)}</Label>}
        <TextLabel t={t} color={textColor(color)} />
      </>
    )
  },
  handles: (t) => [{ id: 'size', x: (t.p.w * UNIT * sc(t)) / 2, y: (t.p.h * UNIT * sc(t)) / 2 }],
  onHandle: (t, _id, l) => ({ p: { ...t.p, w: snapHalf((l.x * 2) / UNIT / sc(t)), h: snapHalf((l.y * 2) / UNIT / sc(t)) } }),
  colorable: true,
  gridSnap: true,
}

const regPts = (t: Tile) => regularPolygon(t.p.n, t.p.side * UNIT * sc(t))

const regPolygon: TileDef = {
  type: 'reg-polygon',
  name: (t) => `Düzgün ${t.p.n}-gen`,
  create: () => ({ color: C.pink, p: { n: 6, side: 2 } }),
  outline: regPts,
  bounds: (t) => boxOf(regPts(t)),
  render: (t) => <Poly t={t} pts={regPts(t)} />,
  handles: (t) => {
    const p = regPts(t)[0]
    return [{ id: 'size', x: p.x, y: p.y }]
  },
  onHandle: (t, _id, l) => {
    const r = Math.hypot(l.x, l.y) / sc(t)
    const side = 2 * r * Math.sin(Math.PI / t.p.n)
    return { p: { ...t.p, side: snapHalf(side / UNIT) } }
  },
  colorable: true,
}

const customPts = (t: Tile) => mul(t.p.pts as Pt[], sc(t))

const customPolygon: TileDef = {
  type: 'custom-polygon',
  name: () => 'Serbest çokgen',
  create: (p) => ({
    color: C.green,
    p: { pts: p.pts ?? centerPts([{ x: 0, y: -40 }, { x: 60, y: -80 }, { x: 30, y: 30 }, { x: -30, y: 30 }, { x: -60, y: -40 }].map((q) => ({ x: q.x * 1.1, y: q.y * 1.1 }))) },
  }),
  outline: customPts,
  bounds: (t) => boxOf(customPts(t)),
  render: (t) => <Poly t={t} pts={customPts(t)} holes={((t.p.holes ?? []) as Pt[][]).map((h) => mul(h, sc(t)))} />,
  handles: (t) => (t.p.fixVertices ? [] : customPts(t).map((p, i) => ({ id: String(i), x: p.x, y: p.y }))),
  onHandle: (t, id, l, _api, phase) => {
    const k = sc(t)
    const pts = (t.p.pts as Pt[]).slice()
    pts[Number(id)] = { x: round(l.x / k), y: round(l.y / k) }
    if (phase !== 'end' || t.p.holes?.length) return { p: { ...t.p, pts } }
    const r = recenter({ ...t }, pts)
    return { x: r.x, y: r.y, p: { ...t.p, pts: r.pts } }
  },
  colorable: true,
  flippable: true,
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
        <TextLabel t={t} color={textColor(color)} />
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
}

export const polygonTiles: TileDef[] = [polygon, rectangle, regPolygon, customPolygon, circle]

// ---------------------------------------------------------------------------
// Eylem çubuğu (Polypad: scale, circle radius, custom-polygon vertices, yazar etiketleri)
// ---------------------------------------------------------------------------

const SCALABLE = ['polygon', 'reg-polygon', 'rectangle', 'custom-polygon']
const LABELLED = ['polygon', 'reg-polygon', 'rectangle', 'custom-polygon', 'circle']
const pp = (patch: Record<string, unknown>) => ({ p: patch })

export const polygonActions: ActionSpec[] = [
  {
    id: 'scale',
    type: 'input',
    tileTypes: SCALABLE,
    label: 'Ölçek:',
    icon: 'geo-scale',
    location: 'more',
    value: 'number',
    range: [0.1, 10],
    step: 0.1,
    get: (t) => sc(t),
    // Parça merkezi 0,0 olduğundan ölçeklenirken yerinde kalır
    set: (v: number) => pp({ scale: v }),
  },
  // Polypad'de olmayan ama öğretmenlerin kullandığı ölçüler: ⋯ menüsünde
  { id: 'show-angles', type: 'checkbox', tileTypes: ['polygon', 'reg-polygon', 'custom-polygon'], label: 'Açıları göster:', icon: 'geo-angle', location: 'more', get: (t) => !!t.p.angles, set: (v: boolean) => pp({ angles: v }) },
  { id: 'show-sides', type: 'checkbox', tileTypes: ['polygon', 'reg-polygon', 'custom-polygon', 'rectangle'], label: 'Kenar uzunlukları:', icon: 'resize', location: 'more', get: (t) => !!t.p.sides, set: (v: boolean) => pp({ sides: v }) },
  { id: 'show-area', type: 'checkbox', tileTypes: ['rectangle'], label: 'Alanı göster:', location: 'more', get: (t) => !!t.p.area, set: (v: boolean) => pp({ area: v }) },
  { id: 'show-units', type: 'checkbox', tileTypes: ['rectangle'], label: 'Birim kareler:', icon: 'grid', location: 'more', get: (t) => !!t.p.grid, set: (v: boolean) => pp({ grid: v }) },
  { id: 'sides-count', type: 'input', tileTypes: ['reg-polygon'], label: 'Kenar sayısı:', location: 'more', value: 'number', range: [3, 20], get: (t) => t.p.n, set: (v: number) => pp({ n: Math.round(v) }) },
  {
    id: 'fix-vertices',
    type: 'button',
    tileTypes: ['custom-polygon'],
    label: 'Köşeleri kilitle',
    location: 'more',
    show: (ts) => ts.every((t) => !t.p.fixVertices),
    click: (ts, api) => ts.forEach((t) => api.updateP(t.id, { fixVertices: true })),
  },
  {
    id: 'unfix-vertices',
    type: 'button',
    tileTypes: ['custom-polygon'],
    label: 'Köşelerin kilidini aç',
    location: 'more',
    show: (ts) => ts.some((t) => t.p.fixVertices),
    click: (ts, api) => ts.forEach((t) => api.updateP(t.id, { fixVertices: false })),
  },
  { id: 'fix-vertices-count', type: 'checkbox', tileTypes: ['custom-polygon'], label: 'Köşe ekle ya da sil:', location: 'more', get: (t) => !!t.p.editCount, set: (v: boolean) => pp({ editCount: v }) },
  {
    id: 'add-vertex',
    type: 'button',
    tileTypes: ['custom-polygon'],
    label: 'Köşe ekle',
    icon: 'add',
    show: (ts) => ts.length === 1 && !!ts[0].p.editCount && !ts[0].p.fixVertices,
    click: ([t], api) => {
      const pts = t.p.pts as Pt[]
      let best = 0
      pts.forEach((p, i) => {
        if (dist(p, pts[(i + 1) % pts.length]) > dist(pts[best], pts[(best + 1) % pts.length])) best = i
      })
      const a = pts[best]
      const b = pts[(best + 1) % pts.length]
      api.updateP(t.id, { pts: [...pts.slice(0, best + 1), { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, ...pts.slice(best + 1)] })
    },
  },
  {
    id: 'remove-vertex',
    type: 'button',
    tileTypes: ['custom-polygon'],
    label: 'Köşe sil',
    icon: 'minus',
    show: (ts) => ts.length === 1 && !!ts[0].p.editCount && !ts[0].p.fixVertices && (ts[0].p.pts as Pt[]).length > 3,
    click: ([t], api) => api.updateP(t.id, { pts: (t.p.pts as Pt[]).slice(0, -1) }),
  },
  { id: 'radius', type: 'input', tileTypes: ['circle'], label: 'Yarıçap:', location: 'more', value: 'number', range: [0.25, 50], step: 0.5, get: (t) => round(t.p.r / UNIT, 2), set: (v: number) => pp({ r: v * UNIT }) },
  { id: 'radius-y', type: 'input', tileTypes: ['circle'], label: 'Dikey yarıçap:', location: 'more', value: 'number', range: [0.25, 50], step: 0.5, show: (ts) => ts.every((t) => t.p.isEllipse), get: (t) => round(t.p.ry / UNIT, 2), set: (v: number) => pp({ ry: v * UNIT }) },
  { id: 'toggle-ellipse-control', type: 'checkbox', tileTypes: ['circle'], label: 'Elips:', location: 'more', get: (t) => !!t.p.isEllipse, set: (v: boolean, t) => pp({ isEllipse: v, ry: (t as Tile).p.ry ?? (t as Tile).p.r }) },
  { id: 'show-radius', type: 'checkbox', tileTypes: ['circle'], label: 'Yarıçapı göster:', location: 'more', show: (ts) => ts.every((t) => !t.p.isEllipse), get: (t) => !!t.p.radius, set: (v: boolean) => pp({ radius: v }) },

  // Yazar seçenekleri
  { id: 'label', type: 'input', tileTypes: LABELLED, label: 'Etiket:', icon: 'text', author: true, value: 'text', get: (t) => t.p.textLabel ?? '', set: (v: string) => pp({ textLabel: v || undefined }) },
  { id: 'labelFontSize', type: 'input', tileTypes: LABELLED, label: 'Yazı boyutu:', author: true, value: 'number', range: [1, 15], show: (ts) => ts.some((t) => t.p.textLabel), get: (t) => 5 + (t.p.textLabelFontSize ?? 0), set: (v: number) => pp({ textLabelFontSize: v - 5 }) },
  { id: 'textLabelRotate', type: 'checkbox', tileTypes: LABELLED, label: 'Etiket dönsün:', author: true, location: 'more', show: (ts) => ts.some((t) => t.p.textLabel), get: (t) => !!t.p.textLabelRotate, set: (v: boolean) => pp({ textLabelRotate: v }) },
  { id: 'tileWeight', type: 'input', tileTypes: LABELLED, label: 'Parça ağırlığı:', author: true, location: 'more', value: 'text', get: (t) => t.p.weight ?? '', set: (v: string) => pp({ weight: v === '' ? undefined : Number(String(v).replace(',', '.')) }) },
  { id: 'cornerRadius', type: 'input', tileTypes: SCALABLE, label: 'Köşe yuvarlaklığı:', icon: 'rounded-corner', author: true, location: 'more', value: 'number', range: [0, 10], step: 0.1, get: (t) => t.p.cornerRadius ?? 0, set: (v: number) => pp({ cornerRadius: v }) },
  { id: 'drop-shadow', type: 'checkbox', tileTypes: ['rectangle'], label: 'Gölge:', author: true, location: 'more', get: (t) => !!t.p.shadow, set: (v: boolean) => pp({ shadow: v }) },
]
