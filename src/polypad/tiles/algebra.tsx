import type { ReactNode } from 'react'
import type { ActionSpec, PadApi, Props, Pt, Tile, TileDef } from '../types'
import { UNIT, boundsOf, clamp, fmt, pathOf, rad, rotate, round, toLocal, toWorld } from '../geom'
import { C, FONT, Label, edge, rectBox } from './kit'
import { compile, rhs, type Vars } from './expr'
import { getDef } from './index'

// ---------------------------------------------------------------------------
// Ortak yardımcılar
// ---------------------------------------------------------------------------

/** Başka bir türden yeni parça (store.makeTile ile aynı mantık; döngüsel içe aktarmayı önlemek için burada) */
function mk(type: string, props: Props, x: number, y: number, rot = 0): Omit<Tile, 'id'> {
  const extra = getDef(type)?.create?.(props) ?? {}
  return { type, x, y, rot, ...extra, p: { ...props, ...(extra.p ?? {}) } }
}

/** Alt alta kesir: pay, çizgi, payda */
function Frac({ n, d, x = 0, y = 0, size = 13, color = '#fff' }: { n: ReactNode; d: ReactNode; x?: number; y?: number; size?: number; color?: string }) {
  const w = size * (String(d).length > 1 || String(n).length > 1 ? 1.25 : 0.8)
  return (
    <g transform={`translate(${x} ${y})`} style={{ pointerEvents: 'none' }}>
      <Label y={-size * 0.62} size={size} color={color}>{n}</Label>
      <path d={`M${-w / 2} 0H${w / 2}`} stroke={color} strokeWidth={Math.max(1, size / 10)} />
      <Label y={size * 0.62} size={size} color={color}>{d}</Label>
    </g>
  )
}

/** Etiket türü; Polypad anahtarları (percentage, hidden, degree) ve eski adlar (percent, none) kabul edilir */
type LabelKind = 'fraction' | 'decimal' | 'percent' | 'degree' | 'none'
const labelKind = (k: unknown): LabelKind =>
  k === 'percentage' || k === 'percent' ? 'percent' : k === 'hidden' || k === 'none' ? 'none' : k === 'decimal' ? 'decimal' : k === 'degree' ? 'degree' : 'fraction'

/** Kesir parçası etiketi (n/d; birim kesirlerde n = 1) */
function PieceLabel({ n = 1, d, kind, x, y, size, color, unit }: { n?: number; d: number; kind: LabelKind; x: number; y: number; size: number; color: string; unit?: boolean }) {
  if (kind === 'none') return null
  if ((d === 1 && n === 1) || unit) return <Label x={x} y={y} size={size * 1.15} color={color}>1</Label>
  if (kind === 'fraction') return d === 1 ? <Label x={x} y={y} size={size * 1.15} color={color}>{n}</Label> : <Frac n={n} d={d} x={x} y={y} size={size} color={color} />
  const text = kind === 'decimal' ? fmt(n / d, 3) : kind === 'degree' ? `${fmt((360 * n) / d, 1)}°` : `%${fmt((100 * n) / d, 1)}`
  return <Label x={x} y={y} size={size * (text.length > 4 ? 0.82 : 1)} color={color}>{text}</Label>
}

/** Payda başına renk */
const FR_COLORS = ['#cd0e66', '#eb4726', '#fd8c00', '#bfc212', '#22ab24', '#009ea6', '#0f82f2', '#6d3bbf', '#900a47', '#b16200', '#006f74', '#4c2986']
const frColor = (t: Tile) => t.color ?? FR_COLORS[(t.p.denominator - 1) % FR_COLORS.length]

/** "3/4", "1 1/2", "0,75" gibi metinleri sayıya çevirir */
export function parseNum(v: unknown): number {
  if (typeof v === 'number') return v
  const s = String(v ?? '').trim().replace(',', '.')
  const mixed = /^(-?)(\d+)\s+(\d+)\/(\d+)$/.exec(s)
  if (mixed) return (mixed[1] ? -1 : 1) * (Number(mixed[2]) + Number(mixed[3]) / Number(mixed[4]))
  const frac = /^(-?[\d.]+)\/(-?[\d.]+)$/.exec(s)
  if (frac) return Number(frac[1]) / Number(frac[2])
  return s === '' ? NaN : Number(s)
}

/** Ondalık sayıyı kesre yaklaştırır (sürekli kesir) */
function toFraction(x: number, maxDen = 1000): [number, number] {
  let h1 = 1
  let h0 = 0
  let k1 = 0
  let k0 = 1
  let b = x
  for (let i = 0; i < 30; i++) {
    const a = Math.floor(b)
    ;[h1, h0] = [a * h1 + h0, h1]
    ;[k1, k0] = [a * k1 + k0, k1]
    if (k1 > maxDen || Math.abs(x - h1 / k1) < 1e-9) break
    b = 1 / (b - a)
  }
  return [h1, k1]
}

/** Sayıyı ondalık, kesir ya da tam sayılı kesir olarak yazar */
function formatAs(v: number, kind: string): string {
  if (kind === 'fraction' || kind === 'mixed') {
    const [n, d] = toFraction(v)
    if (d === 1) return String(n)
    if (kind === 'mixed' && Math.abs(n) > d) {
      const w = Math.trunc(n / d)
      return `${w} ${Math.abs(n - w * d)}/${d}`
    }
    return `${n}/${d}`
  }
  return fmt(v, 4)
}

// ---------------------------------------------------------------------------
// Kesir şeritleri
// ---------------------------------------------------------------------------

const BAR_H = UNIT * 1.25

/** Bütün şeridin genişliği (Ölçek, birim cinsinden) */
const barWhole = (t: Tile) => (t.p.size ?? 12) * UNIT
const barSize = (t: Tile) => {
  const pw = barWhole(t) / t.p.denominator
  return { pw, w: pw * t.p.count }
}

const fractionBar: TileDef = {
  type: 'fraction-bar',
  name: (t) => (t.p.denominator === 1 ? 'Bütün' : `${t.p.count}/${t.p.denominator} kesir şeridi`),
  create: (p) => ({ p: { count: p.count ?? p.denominator ?? 1, denominator: p.denominator ?? 1, labels: p.labels ?? 'fraction' } }),
  bounds: (t) => rectBox(barSize(t).w, BAR_H),
  outline: (t) => {
    const w = barSize(t).w / 2
    return [{ x: -w, y: -BAR_H / 2 }, { x: w, y: -BAR_H / 2 }, { x: w, y: BAR_H / 2 }, { x: -w, y: BAR_H / 2 }]
  },
  render: (t) => {
    const { pw, w } = barSize(t)
    const color = frColor(t)
    const kind = labelKind(t.p.labels)
    const size = clamp(pw / 3.2, 8, 14)
    const combine = !!t.p.combine && t.p.count > 1
    return (
      <>
        <rect x={-w / 2} y={-BAR_H / 2} width={w} height={BAR_H} fill={color} stroke={edge(color)} strokeWidth={1.5} rx={2} />
        {t.p.count > 1 && !combine && (
          <path d={Array.from({ length: t.p.count - 1 }, (_, i) => `M${-w / 2 + (i + 1) * pw} ${-BAR_H / 2}v${BAR_H}`).join('')} stroke={edge(color)} strokeWidth={1.5} />
        )}
        {combine ? (
          <PieceLabel n={t.p.count} d={t.p.denominator} kind={kind} x={0} y={0} size={clamp(w / 6, 9, 15)} color="#fff" />
        ) : (
          Array.from({ length: t.p.count }, (_, i) => <PieceLabel key={i} d={t.p.denominator} kind={kind} x={-w / 2 + (i + 0.5) * pw} y={0} size={size} color="#fff" />)
        )}
      </>
    )
  },
  colorable: true,
  edgeSnap: true,
}

function splitBar(tile: Tile): Omit<Tile, 'id'>[] {
  const { pw, w } = barSize(tile)
  return Array.from({ length: tile.p.count }, (_, i) => {
    const c = toWorld(tile, { x: -w / 2 + (i + 0.5) * pw, y: 0 })
    return { ...mk('fraction-bar', { ...tile.p, count: 1, combine: undefined }, c.x, c.y, tile.rot), color: tile.color, flip: tile.flip }
  })
}

// ---------------------------------------------------------------------------
// Kesir daireleri: parçanın kökeni her zaman dairenin merkezidir; böylece dilimler
// merkez etrafında döner ve ayrılan dilimler bütündeki yerlerinde kalır.
// ---------------------------------------------------------------------------

/** Daire yarıçapı (Yarıçap, birim cinsinden) */
const radiusOf = (t: Tile) => (t.p.size ?? 2.5) * UNIT

function sectorPts(a0: number, a1: number, r: number): Pt[] {
  const steps = Math.max(2, Math.ceil(((a1 - a0) / 360) * 48))
  const arc = Array.from({ length: steps + 1 }, (_, i) => {
    const a = rad(a0 + ((a1 - a0) * i) / steps)
    return { x: r * Math.cos(a), y: r * Math.sin(a) }
  })
  return a1 - a0 >= 360 ? arc.slice(0, -1) : [{ x: 0, y: 0 }, ...arc]
}

const circleSpan = (t: Tile) => {
  const a = 360 / t.p.denominator
  return { a, total: Math.min(360, a * t.p.count) }
}

function sectorPath(a0: number, a1: number, r: number) {
  if (a1 - a0 >= 360) return `M${r} 0A${r} ${r} 0 1 1 ${-r} 0A${r} ${r} 0 1 1 ${r} 0Z`
  const p0 = { x: r * Math.cos(rad(a0)), y: r * Math.sin(rad(a0)) }
  const p1 = { x: r * Math.cos(rad(a1)), y: r * Math.sin(rad(a1)) }
  return `M0 0L${round(p0.x)} ${round(p0.y)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${round(p1.x)} ${round(p1.y)}Z`
}

const fractionCircle: TileDef = {
  type: 'fraction-circle',
  name: (t) => (t.p.denominator === 1 ? 'Bütün daire' : `${t.p.count}/${t.p.denominator} daire`),
  create: (p) => ({ p: { denominator: p.denominator ?? 1, count: p.count ?? p.denominator ?? 1, labels: p.labels ?? 'fraction', showUnitLabel: p.showUnitLabel ?? true } }),
  outline: (t) => sectorPts(-90, -90 + circleSpan(t).total, radiusOf(t)),
  bounds: (t) => {
    const { total } = circleSpan(t)
    const R = radiusOf(t)
    if (total >= 360) return rectBox(R * 2, R * 2)
    return boundsOf(sectorPts(-90, -90 + total, R))
  },
  render: (t) => {
    const { a, total } = circleSpan(t)
    const R = radiusOf(t)
    const color = frColor(t)
    const kind = labelKind(t.p.labels)
    const d = t.p.denominator
    const size = clamp((28 - d * 1.4) * (R / (2.5 * UNIT)), 9, 18)
    const whole = d === 1 || total >= 360
    const combine = !!t.p.combine && t.p.count > 1
    const parts = combine ? 1 : t.p.count
    const span = combine ? total : a
    return (
      <>
        {d === 1 ? (
          <path d={sectorPath(-90, 270, R)} fill={color} stroke={edge(color)} strokeWidth={1.5} />
        ) : (
          Array.from({ length: parts }, (_, i) => (
            <path key={i} d={sectorPath(-90 + i * span, -90 + Math.min(360, (i + 1) * span), R)} fill={color} stroke={edge(color)} strokeWidth={1.5} strokeLinejoin="round" />
          ))
        )}
        {d === 1
          ? t.p.showUnitLabel !== false && kind !== 'none' && <Label size={22 * (R / (2.5 * UNIT))} color="#fff">{kind === 'degree' ? '360°' : kind === 'percent' ? '%100' : '1'}</Label>
          : Array.from({ length: parts }, (_, i) => {
              const m = rad(-90 + (i + 0.5) * span)
              const rr = (combine ? whole : d === 2) ? R * 0.45 : R * 0.62
              return <PieceLabel key={i} n={combine ? t.p.count : 1} d={d} kind={kind} x={rr * Math.cos(m)} y={rr * Math.sin(m)} size={size} color="#fff" />
            })}
        {total < 360 && <circle r={2.5} fill={edge(color)} />}
      </>
    )
  },
  colorable: true,
  rotStep: 15,
}

function splitCircle(tile: Tile): Omit<Tile, 'id'>[] {
  const { a } = circleSpan(tile)
  return Array.from({ length: tile.p.count }, (_, i) => ({
    ...mk('fraction-circle', { ...tile.p, count: 1, combine: undefined }, tile.x, tile.y, (tile.rot + (tile.flip ? -1 : 1) * i * a) % 360),
    color: tile.color,
  }))
}

/** Paydayı değiştirerek kesri yeniden adlandırır (1/2 → 2/4); değeri korunur */
function renamePatch(t: Tile, dir: 1 | -1): Partial<Tile> | null {
  const { count, denominator: den } = t.p
  for (let o = den + dir; dir > 0 ? o <= 64 : o >= 1; o += dir) {
    const c = (count / den) * o
    if (Math.abs(c - Math.round(c)) > 1e-9) continue
    return { color: undefined, p: { ...t.p, denominator: o, count: Math.round(c) } }
  }
  return null
}

// ---------------------------------------------------------------------------
// Cebir karoları
// ---------------------------------------------------------------------------

const AX = 3.5 * UNIT
const AY = 2.5 * UNIT

const ALG: Record<string, { w: number; h: number; color: string; label: string }> = {
  '1': { w: UNIT, h: UNIT, color: '#fd8c00', label: '1' },
  x: { w: UNIT, h: AX, color: '#22ab24', label: 'x' },
  y: { w: UNIT, h: AY, color: '#6d3bbf', label: 'y' },
  xy: { w: AX, h: AY, color: '#009ea6', label: 'xy' },
  x2: { w: AX, h: AX, color: '#0f82f2', label: 'x²' },
  y2: { w: AY, h: AY, color: '#cd0e66', label: 'y²' },
}
const NEG = '#eb4726'

const algParts = (expr: string) => {
  const neg = expr.startsWith('-')
  const base = neg ? expr.slice(1) : expr
  return { neg, base: ALG[base] ? base : '1' }
}

/** Bölünmüş karonun boyutu: genişlik splitV'ye (dikey kesimler), yükseklik splitH'ye (yatay kesimler) bölünür */
const algDen = (t: Tile) => (t.p.splitH ?? 1) * (t.p.splitV ?? 1)
const algSize = (t: Tile) => {
  const s = ALG[algParts(String(t.p.expr)).base]
  return { w: s.w / (t.p.splitV ?? 1), h: s.h / (t.p.splitH ?? 1) }
}

/** Cebir karosunun değeri (x, y değişken değerleriyle) */
export function algebraValue(expr: string, vars: Vars = { x: 3, y: 2 }) {
  const { neg, base } = algParts(expr)
  const x = vars.x ?? 3
  const y = vars.y ?? 2
  const v = { '1': 1, x, y, xy: x * y, x2: x * x, y2: y * y }[base] ?? 1
  return neg ? -v : v
}

const algLabelHidden = (t: Tile) => t.p.labels === 'hidden' || !!t.p.hideLabel

const algebra: TileDef = {
  type: 'algebra',
  name: (t) => {
    const { neg, base } = algParts(t.p.expr)
    return `${neg ? '−' : ''}${ALG[base].label} karosu`
  },
  create: (p) => ({ p: { expr: String(p.expr ?? '1') } }),
  bounds: (t) => {
    const s = algSize(t)
    return rectBox(s.w, s.h)
  },
  outline: (t) => {
    const s = algSize(t)
    return [{ x: -s.w / 2, y: -s.h / 2 }, { x: s.w / 2, y: -s.h / 2 }, { x: s.w / 2, y: s.h / 2 }, { x: -s.w / 2, y: s.h / 2 }]
  },
  render: (t) => {
    const { neg, base } = algParts(t.p.expr)
    const s = ALG[base]
    const { w, h } = algSize(t)
    const color = neg ? NEG : s.color
    const d = algDen(t)
    const text = `${neg ? '−' : ''}${s.label}${d > 1 ? `/${d}` : ''}`
    const size = Math.min(base === '1' ? 15 : 18, (Math.min(w, h) * 0.8 + 4) / Math.max(1, text.length * 0.42))
    return (
      <>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={color} stroke={edge(color)} strokeWidth={1.5} rx={2} />
        {!algLabelHidden(t) && w >= 12 && h >= 12 && (
          // Uzun karolarda etiket karo ile birlikte döner; dik karoda da okunur kalsın diye döndürmeyi geri al
          <g transform={`rotate(${-t.rot})`}>
            <Label size={size} color="#fff">{text}</Label>
          </g>
        )}
      </>
    )
  },
  gridSnap: true,
  rotStep: 90,
}

const isQuarterTurned = (t: Tile) => Math.round(((t.rot % 180) + 180) % 180) === 90

/** Karoyu ikiye böler: 'v' dikey kesim (genişlik yarıya), 'h' yatay kesim (yükseklik yarıya) — ekrana göre */
function splitAlgebra(t: Tile, dir: 'v' | 'h'): Omit<Tile, 'id'>[] {
  // Karo çeyrek dönmüşse ekrandaki dikey kesim karonun kendi yatay kesimidir
  const local = isQuarterTurned(t) ? (dir === 'v' ? 'h' : 'v') : dir
  const { w, h } = algSize(t)
  const gap = 2
  return [-1, 1].map((sgn) => {
    const off = local === 'v' ? { x: sgn * (w / 4 + gap), y: 0 } : { x: 0, y: sgn * (h / 4 + gap) }
    const c = toWorld(t, off)
    const p = local === 'v' ? { splitV: (t.p.splitV ?? 1) * 2 } : { splitH: (t.p.splitH ?? 1) * 2 }
    return { type: 'algebra', x: c.x, y: c.y, rot: t.rot, flip: t.flip, color: t.color, p: { ...t.p, ...p } }
  })
}

// ---------------------------------------------------------------------------
// Pullar
// ---------------------------------------------------------------------------

const TK = UNIT * 1.2
const TOKEN_COLORS: Record<string, string> = { circle: C.pink, square: C.blue, cross: C.green, weight: C.grey, star: C.orange, heart: C.red }

function starPath(r: number) {
  return pathOf(
    Array.from({ length: 10 }, (_, i) => {
      const a = rad(-90 + i * 36)
      const rr = i % 2 ? r * 0.45 : r
      return { x: rr * Math.cos(a), y: rr * Math.sin(a) + r * 0.08 }
    }),
  )
}

const r = TK / 2
const TOKEN_PATHS: Record<string, string> = {
  circle: `M${r} 0A${r} ${r} 0 1 1 ${-r} 0A${r} ${r} 0 1 1 ${r} 0Z`,
  square: pathOf([{ x: -r, y: -r }, { x: r, y: -r }, { x: r, y: r }, { x: -r, y: r }]),
  cross: pathOf(
    [
      [-0.35, -1],
      [0.35, -1],
      [0.35, -0.35],
      [1, -0.35],
      [1, 0.35],
      [0.35, 0.35],
      [0.35, 1],
      [-0.35, 1],
      [-0.35, 0.35],
      [-1, 0.35],
      [-1, -0.35],
      [-0.35, -0.35],
    ].map(([x, y]) => ({ x: x * r, y: y * r })),
  ),
  weight: `M${-r * 0.6} ${-r * 0.55}H${r * 0.6}L${r} ${r}H${-r}Z`,
  star: starPath(r * 1.1),
  heart: `M0 ${r * 0.95}C${-r * 1.4} ${r * 0.05} ${-r * 1.05} ${-r * 1.15} 0 ${-r * 0.45}C${r * 1.05} ${-r * 1.15} ${r * 1.4} ${r * 0.05} 0 ${r * 0.95}Z`,
}

const token: TileDef = {
  type: 'token',
  name: () => 'Pul',
  create: (p) => ({ color: TOKEN_COLORS[p.shape] ?? C.pink, p: { shape: p.shape ?? 'circle', value: p.value ?? 1 } }),
  bounds: (t) => (t.p.shape === 'weight' ? { x: -r, y: -r * 1.05, w: TK, h: r * 2.05 } : rectBox(TK * 1.1, TK * 1.1)),
  render: (t) => {
    const color = t.color ?? C.pink
    const showValue = t.p.shape === 'weight' || t.p.showValue
    return (
      <>
        {t.p.shape === 'weight' && <circle cy={-r * 0.72} r={r * 0.3} fill="none" stroke={edge(color)} strokeWidth={3} />}
        <path d={TOKEN_PATHS[t.p.shape] ?? TOKEN_PATHS.circle} fill={color} stroke={edge(color)} strokeWidth={1.5} strokeLinejoin="round" />
        {showValue && (
          <Label y={t.p.shape === 'weight' ? r * 0.25 : 0} size={String(t.p.value).length > 2 ? 10 : 13} color="#fff">
            {fmt(t.p.value)}
          </Label>
        )}
      </>
    )
  },
  colorable: true,
  edgeSnap: false,
}

// ---------------------------------------------------------------------------
// Terazi
// ---------------------------------------------------------------------------

const B_L = 140 // kefe ile pivot arası yatay uzaklık
const PIVOT_Y = -40
const PAN_DROP = 80 // kiriş ucundan kefeye
const PAN_W = 170
const TILT = 8

const numOf = (v: unknown) => {
  const n = parseNum(v)
  return Number.isFinite(n) ? n : 0
}

/** Bir parçanın sayısal değeri (terazi ve benzerleri için) */
export function tileValue(t: Tile, vars: Vars): number | null {
  switch (t.type) {
    case 'token':
      return numOf(t.p.value ?? 1)
    case 'algebra':
      return algebraValue(String(t.p.expr), vars) / algDen(t)
    case 'number-card':
      return t.p.valueStr != null ? numOf(t.p.valueStr) : numOf(t.p.value)
    case 'number-tile':
    case 'number-bar':
    case 'prime-disk':
    case 'number-frame':
    case 'number-dot':
    case 'hand-tile':
    case 'dice':
    case 'currency':
      return numOf(t.p.value)
    case 'number-cube':
      return numOf(t.p.vx ?? 1) * numOf(t.p.vy ?? 1) * numOf(t.p.vz ?? 1)
    default:
      return null
  }
}

function panSums(t: Tile, tiles: Tile[]) {
  const vars: Vars = { x: 3, y: 2, ...(t.p.vars ?? {}) }
  let left = 0
  let right = 0
  let nl = 0
  let nr = 0
  const panY = PIVOT_Y + PAN_DROP
  for (const o of tiles) {
    if (o.id === t.id) continue
    const v = tileValue(o, vars)
    if (v == null) continue
    const l = toLocal(t, o)
    if (l.y > panY + 6 || l.y < panY - 320) continue
    if (Math.abs(l.x + B_L) <= PAN_W / 2) {
      left += v
      nl++
    } else if (Math.abs(l.x - B_L) <= PAN_W / 2) {
      right += v
      nr++
    }
  }
  return { left: round(left, 6), right: round(right, 6), nl, nr }
}

const balanceLabels = (t: Tile) => t.p.sums !== false && t.p.labels !== 'hidden'

const balance: TileDef = {
  type: 'balance',
  name: () => 'Terazi',
  create: () => ({ p: { vars: { x: 3, y: 2 }, sums: true } }),
  bounds: () => ({ x: -B_L - PAN_W / 2 - 4, y: PIVOT_Y - 24, w: (B_L + PAN_W / 2 + 4) * 2, h: 200 }),
  render: (t, ctx) => {
    const { left, right, nl, nr } = ctx.thumb ? { left: 0, right: 0, nl: 0, nr: 0 } : panSums(t, ctx.tiles ?? [])
    const diff = left - right
    const tilt = diff > 0 ? -TILT : diff < 0 ? TILT : 0
    const s = Math.sin(rad(tilt)) * B_L
    const c = Math.cos(rad(tilt)) * B_L
    const sign = diff > 0 ? '>' : diff < 0 ? '<' : '='
    const tr = 'transform .7s cubic-bezier(.3,1.4,.5,1)'
    const pan = (side: -1 | 1, sum: number, n: number) => {
      const ex = side * c
      const ey = PIVOT_Y + side * s
      return (
        <g style={{ transform: `translate(${ex}px, ${ey}px)`, transition: tr }}>
          <path d={`M0 0L${-PAN_W / 2 + 10} ${PAN_DROP}M0 0L${PAN_W / 2 - 10} ${PAN_DROP}`} stroke="#8a8a99" strokeWidth={1.5} />
          <path d={`M${-PAN_W / 2} ${PAN_DROP}H${PAN_W / 2}l-12 12H${-PAN_W / 2 + 12}Z`} fill="#c9c9d6" stroke="#77778a" strokeWidth={1.5} strokeLinejoin="round" />
          {balanceLabels(t) && n > 0 && (
            <Label y={PAN_DROP + 26} size={14} color="#242436">{fmt(sum)}</Label>
          )}
        </g>
      )
    }
    return (
      <>
        <path d={`M-60 112H60L40 86H-40Z`} fill="#615e6a" />
        <rect x={-7} y={PIVOT_Y} width={14} height={130} fill="#77778a" rx={3} />
        <g transform={`translate(0 ${PIVOT_Y})`}>
          <g style={{ transform: `rotate(${tilt}deg)`, transition: tr }}>
            <rect x={-B_L - 6} y={-6} width={B_L * 2 + 12} height={12} rx={6} fill="#3a3645" />
            <path d="M-10 -14L10 -14L0 0Z" fill="#fd8c00" />
          </g>
          <circle r={9} fill="#3a3645" stroke="#fff" strokeWidth={2} />
        </g>
        {pan(-1, left, nl)}
        {pan(1, right, nr)}
        {balanceLabels(t) && !ctx.thumb && (nl > 0 || nr > 0) && (
          <g transform="translate(0 98)">
            <rect x={-54} y={-13} width={108} height={26} rx={13} fill={sign === '=' ? C.green : '#fff'} stroke={sign === '=' ? 'none' : '#ccc'} />
            <Label size={14} color={sign === '=' ? '#fff' : '#242436'}>{`${fmt(left)} ${sign} ${fmt(right)}`}</Label>
          </g>
        )}
      </>
    )
  },
  watch: true,
  rotatable: false,
  edgeSnap: false,
}

// ---------------------------------------------------------------------------
// Fonksiyon makinesi
// ---------------------------------------------------------------------------

const FM_W = 170
const SLOT_X = FM_W / 2 + 52
const fmH = (t: Tile) => (t.p.inputs === 2 ? 170 : 120)
const slotPos = (t: Tile, i: number): Pt => ({ x: -SLOT_X, y: t.p.inputs === 2 ? (i ? 40 : -40) : 0 })
const OUT: Pt = { x: SLOT_X, y: 0 }

function cardValue(t: Tile): number | null {
  if (t.type !== 'number-card') return null
  const n = t.p.valueStr != null ? parseNum(t.p.valueStr) : Number(t.p.value)
  return Number.isFinite(n) ? n : null
}

/** Kural doğrusal mı (f(x) = m·x + c)? Öyleyse m ve c */
function linearOf(rule: string): { m: number; c: number } | null {
  const f = compile(rhs(rule))
  if (!f) return null
  const at = (x: number) => f({ x, a: x, n: x })
  const c = at(0)
  const m = at(1) - c
  if (![c, m].every(Number.isFinite) || Math.abs(m) < 1e-12) return null
  for (const x of [2, -3, 7.5]) if (Math.abs(at(x) - (m * x + c)) > 1e-6 * (1 + Math.abs(at(x)))) return null
  return { m, c }
}

/** Doğrusal kuralın tersi: x = (y − c) / m */
function inverseRule({ m, c }: { m: number; c: number }) {
  const num = Math.abs(c) < 1e-12 ? 'x' : `x ${c > 0 ? '−' : '+'} ${fmt(Math.abs(c), 4)}`
  if (Math.abs(m - 1) < 1e-12) return num
  const body = Math.abs(c) < 1e-12 ? num : `(${num})`
  if (Math.abs(m + 1) < 1e-12) return `−${body}`
  return `${body} / ${m < 0 ? `(−${fmt(-m, 4)})` : fmt(m, 4)}`
}

const functionMachine: TileDef = {
  type: 'function-machine',
  name: () => 'Fonksiyon makinesi',
  create: (p) => ({ color: C.purple, p: { inputs: p.inputs === 2 ? 2 : 1, rule: p.rule ?? (p.inputs === 2 ? 'a · b' : 'x + 3'), slots: [], out: null } }),
  bounds: (t) => rectBox((SLOT_X + 40) * 2, Math.max(fmH(t), 150)),
  render: (t) => {
    const h = fmH(t)
    const color = t.color ?? C.purple
    const two = t.p.inputs === 2
    const valid = !!compile(rhs(String(t.p.rule)))
    return (
      <>
        {/* giriş ve çıkış oluğu */}
        {Array.from({ length: two ? 2 : 1 }, (_, i) => {
          const s = slotPos(t, i)
          return (
            <g key={i}>
              <rect x={s.x - 30} y={s.y - 34} width={60} height={68} rx={8} fill="none" stroke="#b3b3c2" strokeWidth={2} strokeDasharray="6 5" />
              <path d={`M${s.x + 32} ${s.y}H${-FM_W / 2}`} stroke="#b3b3c2" strokeWidth={2} />
              <Label x={s.x} y={s.y + 48} size={11} color="#77778a">{two ? (i ? 'b' : 'a') : 'girdi'}</Label>
            </g>
          )
        })}
        <rect x={OUT.x - 30} y={OUT.y - 34} width={60} height={68} rx={8} fill="none" stroke="#b3b3c2" strokeWidth={2} strokeDasharray="6 5" />
        <path d={`M${FM_W / 2} 0H${OUT.x - 32}`} stroke="#b3b3c2" strokeWidth={2} markerEnd="" />
        <path d={`M${OUT.x - 40} -6L${OUT.x - 32} 0L${OUT.x - 40} 6`} fill="none" stroke="#b3b3c2" strokeWidth={2} />
        <Label x={OUT.x} y={OUT.y + 48} size={11} color="#77778a">çıktı</Label>
        {/* gövde */}
        <rect x={-FM_W / 2} y={-h / 2} width={FM_W} height={h} rx={14} fill={color} stroke={edge(color)} strokeWidth={2} />
        <rect x={-FM_W / 2 + 12} y={-22} width={FM_W - 24} height={44} rx={8} fill="#fff" data-act="rule" />
        <Label size={String(t.p.rule).length > 12 ? 13 : 17} color={valid ? '#242436' : C.red}>
          {t.p.hidden ? '?' : `${t.p.invert ? 'x = ' : ''}${String(t.p.rule)}`}
        </Label>
        <circle cx={-FM_W / 2 + 18} cy={-h / 2 + 16} r={4} fill="#fff" opacity={0.7} />
        <circle cx={-FM_W / 2 + 32} cy={-h / 2 + 16} r={4} fill="#fff" opacity={0.7} />
      </>
    )
  },
  colorable: true,
  edgeSnap: false,
  onTap: async (t, api, info) => {
    if (info.act !== 'rule' || t.p.hidden) return
    const s = await api.prompt(t.p.inputs === 2 ? 'Kural (a ve b kullanın)' : 'Kural (x kullanın)', String(t.p.rule))
    if (s != null && s.trim()) api.updateP(t.id, { rule: s.trim() }, true)
  },
  onDrop: (t, dropped, api) => {
    const cards = dropped.filter((d) => d.type === 'number-card')
    if (!cards.length) return
    const n = t.p.inputs === 2 ? 2 : 1
    const slots: (string | null)[] = Array.from({ length: n }, (_, i) => t.p.slots?.[i] ?? null)
    // Yerinden çıkarılmış kartları boşalt
    slots.forEach((id, i) => {
      const c = id ? api.get(id) : undefined
      const l = c ? toLocal(t, c) : null
      const s = slotPos(t, i)
      if (!l || Math.hypot(l.x - s.x, l.y - s.y) > 40) slots[i] = null
    })
    let placed = false
    for (const card of cards) {
      const l = toLocal(t, card)
      if (l.x > -FM_W / 4) continue // çıktı tarafına bırakılanlar
      let i = n === 2 ? (l.y > 0 ? 1 : 0) : 0
      if (n === 2 && slots[i] && slots[i] !== card.id && !slots[1 - i]) i = 1 - i
      const prev = slots[i]
      if (prev && prev !== card.id) {
        // Eski kartı yana it
        const pw = toWorld(t, { x: slotPos(t, i).x - 80, y: slotPos(t, i).y })
        api.update(prev, { x: pw.x, y: pw.y })
      }
      slots[i] = card.id
      const w = toWorld(t, slotPos(t, i))
      api.update(card.id, { x: w.x, y: w.y, rot: t.rot })
      placed = true
    }
    if (!placed) return
    const vals = slots.map((id) => (id ? cardValue(api.get(id) ?? ({} as Tile)) : null))
    let out: string | null = t.p.out ?? null
    if (vals.every((v) => v != null)) {
      const f = compile(rhs(String(t.p.rule)))
      const vars: Vars = n === 2 ? { a: vals[0]!, b: vals[1]!, x: vals[0]!, y: vals[1]! } : { x: vals[0]!, a: vals[0]!, n: vals[0]! }
      const res = f ? f(vars) : NaN
      if (out && api.get(out)) api.remove([out])
      out = null
      if (Number.isFinite(res)) {
        const w = toWorld(t, OUT)
        const value = round(res, 6)
        const kind = String(t.p.labels ?? 'decimal')
        const card = mk('number-card', Number.isInteger(value) ? { value } : { value, valueStr: formatAs(value, kind) }, w.x, w.y, t.rot)
        out = api.add([card], false)[0] ?? null
        api.sound('pop')
      } else api.sound('error')
    }
    api.updateP(t.id, { slots, out }, true)
  },
}

// ---------------------------------------------------------------------------
// Koordinat düzlemi
// ---------------------------------------------------------------------------

const FN_COLORS = [C.blue, C.pink, C.green, C.orange, C.purple, C.teal]

function niceStep(range: number, px: number) {
  const target = range / Math.max(2, px / 40)
  const p = 10 ** Math.floor(Math.log10(target))
  for (const m of [1, 2, 5, 10]) if (m * p >= target) return m * p
  return 10 * p
}

const sliderVars = (tiles: Tile[] | undefined): Vars => {
  const v: Vars = {}
  for (const o of tiles ?? []) if (o.type === 'slider' && o.p.variable) v[o.p.variable] = Number(o.p.value) || 0
  return v
}

function plot(src: string, vars: Vars, X: (x: number) => number, Y: (y: number) => number, x0: number, x1: number, w: number, y0: number, y1: number) {
  const f = compile(rhs(src))
  if (!f) return ''
  const n = Math.max(60, Math.round(w / 2))
  let d = ''
  let pen = false
  let prevY = 0
  const span = y1 - y0
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n
    const y = f({ ...vars, x })
    if (!Number.isFinite(y) || y > y1 + span * 4 || y < y0 - span * 4 || (pen && Math.abs(y - prevY) > span * 2)) {
      pen = false
      continue
    }
    d += `${pen ? 'L' : 'M'}${round(X(x), 1)} ${round(Y(y), 1)}`
    pen = true
    prevY = y
  }
  return d
}

const axes: TileDef = {
  type: 'axes',
  name: () => 'Koordinat düzlemi',
  create: () => ({ p: { w: 320, h: 320, xmin: -5, xmax: 5, ymin: -5, ymax: 5, xstep: 1, ystep: 1, grid: true, fns: [], pts: [] } }),
  bounds: (t) => rectBox(t.p.w, t.p.h),
  render: (t, ctx) => {
    const { w, h, xmin, xmax, ymin, ymax } = t.p as { w: number; h: number; xmin: number; xmax: number; ymin: number; ymax: number }
    const X = (x: number) => -w / 2 + ((x - xmin) / (xmax - xmin)) * w
    const Y = (y: number) => h / 2 - ((y - ymin) / (ymax - ymin)) * h
    // Adım verilmişse onu kullan (çok sık çizgi olmasın diye katlarına çık)
    const fit = (st: number | undefined, range: number, px: number) => {
      if (!(st && st > 0)) return niceStep(range, px)
      let k = st
      while (range / k > px / 14) k *= 2
      return k
    }
    const sx = fit(t.p.xstep, xmax - xmin, w)
    const sy = fit(t.p.ystep, ymax - ymin, h)
    const arrows = t.p.arrows ?? 'none'
    const xs: number[] = []
    for (let v = Math.ceil(xmin / sx) * sx; v <= xmax + 1e-9; v += sx) xs.push(round(v, 6))
    const ys: number[] = []
    for (let v = Math.ceil(ymin / sy) * sy; v <= ymax + 1e-9; v += sy) ys.push(round(v, 6))
    const ax = clamp(X(0), -w / 2, w / 2)
    const ay = clamp(Y(0), -h / 2, h / 2)
    const vars = ctx.thumb ? {} : sliderVars(ctx.tiles)
    const clip = `axes-clip-${t.id}`
    const fns: string[] = t.p.fns ?? []
    const pts: Pt[] = t.p.pts ?? []
    return (
      <>
        <defs>
          <clipPath id={clip}>
            <rect x={-w / 2} y={-h / 2} width={w} height={h} />
          </clipPath>
        </defs>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#fff" stroke="#ccc" strokeWidth={1} />
        {t.p.grid && (
          <path d={xs.map((x) => `M${round(X(x), 1)} ${-h / 2}v${h}`).join('') + ys.map((y) => `M${-w / 2} ${round(Y(y), 1)}h${w}`).join('')} stroke="#e3e3ea" strokeWidth={1} />
        )}
        <path d={`M${-w / 2} ${ay}H${w / 2}M${ax} ${-h / 2}V${h / 2}`} stroke="#3a3645" strokeWidth={1.5} />
        {arrows !== 'none' && (
          <path
            d={
              `M${w / 2 - 7} ${ay - 4}L${w / 2} ${ay}L${w / 2 - 7} ${ay + 4}M${ax - 4} ${-h / 2 + 7}L${ax} ${-h / 2}L${ax + 4} ${-h / 2 + 7}` +
              (arrows === 'both' ? `M${-w / 2 + 7} ${ay - 4}L${-w / 2} ${ay}L${-w / 2 + 7} ${ay + 4}M${ax - 4} ${h / 2 - 7}L${ax} ${h / 2}L${ax + 4} ${h / 2 - 7}` : '')
            }
            fill="none"
            stroke="#3a3645"
            strokeWidth={1.5}
          />
        )}
        {!ctx.thumb && (
          <g fontSize={10} fontFamily={FONT} fill="#615e6a" style={{ pointerEvents: 'none', userSelect: 'none' }}>
            {xs.filter((x) => x !== 0 && X(x) < w / 2 - 10).map((x) => (
              <text key={`x${x}`} x={X(x)} y={clamp(ay + 13, -h / 2 + 10, h / 2 - 4)} textAnchor="middle">{fmt(x, 3)}</text>
            ))}
            {ys.filter((y) => y !== 0 && Y(y) > -h / 2 + 10).map((y) => (
              <text key={`y${y}`} x={clamp(ax - 5, -w / 2 + 16, w / 2)} y={Y(y) + 3.5} textAnchor="end">{fmt(y, 3)}</text>
            ))}
            <text x={w / 2 - 4} y={ay - 7} textAnchor="end" fontStyle="italic" fontSize={12}>x</text>
            <text x={ax + 7} y={-h / 2 + 12} fontStyle="italic" fontSize={12}>y</text>
          </g>
        )}
        <g clipPath={`url(#${clip})`} fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          {fns.map((f, i) => (
            <path key={i} d={plot(f, vars, X, Y, xmin, xmax, w, ymin, ymax)} stroke={FN_COLORS[i % FN_COLORS.length]} />
          ))}
          {pts.map((p, i) => (
            <circle key={`p${i}`} cx={X(p.x)} cy={Y(p.y)} r={4.5} fill={C.red} stroke="#fff" strokeWidth={1.5} />
          ))}
        </g>
        {!ctx.thumb &&
          pts.map((p, i) => (
            <Label key={`pl${i}`} x={X(p.x) + 7} y={Y(p.y) - 10} size={11} anchor="start" color={C.dRed}>
              ({fmt(p.x)}; {fmt(p.y)})
            </Label>
          ))}
        {fns.length > 0 && (
          <g transform={`translate(${-w / 2 + 6} ${-h / 2 + 6})`}>
            <rect width={Math.min(w - 12, 12 + Math.max(...fns.map((f) => f.length)) * 7.2)} height={fns.length * 18 + 6} rx={5} fill="#fff" opacity={0.9} />
            {fns.map((f, i) => (
              <Label key={i} x={8} y={12 + i * 18} size={12} anchor="start" color={compile(rhs(f)) ? FN_COLORS[i % FN_COLORS.length] : C.red} data-act="fn" data-v={String(i)} style={{ userSelect: 'none' }}>
                {f}
              </Label>
            ))}
          </g>
        )}
      </>
    )
  },
  handles: (t) => [{ id: 'size', x: t.p.w / 2, y: t.p.h / 2 }],
  onHandle: (t, _id, l) => ({ p: { ...t.p, w: Math.max(140, Math.round(l.x * 2)), h: Math.max(140, Math.round(l.y * 2)) } }),
  watch: true,
  edgeSnap: false,
  rotatable: false,
  onTap: async (t, api, info) => {
    if (info.act !== 'fn') return
    const i = Number(info.v)
    const fns: string[] = [...(t.p.fns ?? [])]
    const s = await api.prompt('Fonksiyonu düzenle (silmek için boş bırakın)', fns[i] ?? '')
    if (s == null) return
    if (s.trim()) fns[i] = s.trim()
    else fns.splice(i, 1)
    api.updateP(t.id, { fns }, true)
  },
}

// ---------------------------------------------------------------------------
// Tablo
// ---------------------------------------------------------------------------

const CW = 84
const CH = 34

const tableSize = (t: Tile) => {
  const rows: string[][] = t.p.rows
  return { r: rows.length, c: rows[0]?.length ?? 1 }
}

const table: TileDef = {
  type: 'table',
  name: () => 'Tablo',
  create: () => ({ p: { rows: [['x', 'y'], ['', ''], ['', ''], ['', ''], ['', '']] } }),
  bounds: (t) => {
    const { r, c } = tableSize(t)
    return rectBox(c * CW, r * CH)
  },
  render: (t) => {
    const rows: string[][] = t.p.rows
    const { r, c } = tableSize(t)
    const w = c * CW
    const h = r * CH
    const x0 = -w / 2
    const y0 = -h / 2
    const color = t.color ?? C.teal
    return (
      <>
        <rect x={x0} y={y0} width={w} height={h} fill="#fff" stroke="#9a9aab" strokeWidth={1.5} rx={4} />
        <rect x={x0} y={y0} width={w} height={CH} fill={color} rx={4} />
        <rect x={x0} y={y0 + CH - 4} width={w} height={4} fill={color} />
        {rows.map((row, i) =>
          row.map((cell, j) => (
            <g key={`${i}-${j}`}>
              <rect x={x0 + j * CW} y={y0 + i * CH} width={CW} height={CH} fill="transparent" data-act="cell" data-v={`${i},${j}`} />
              <Label x={x0 + (j + 0.5) * CW} y={y0 + (i + 0.5) * CH} size={cell.length > 8 ? 11 : 14} color={i === 0 ? '#fff' : '#242436'}>
                {cell}
              </Label>
            </g>
          )),
        )}
        <path
          d={Array.from({ length: c - 1 }, (_, j) => `M${x0 + (j + 1) * CW} ${y0}v${h}`).join('') + Array.from({ length: r - 1 }, (_, i) => `M${x0} ${y0 + (i + 1) * CH}h${w}`).join('')}
          stroke="#c9c9d6"
          strokeWidth={1}
          style={{ pointerEvents: 'none' }}
        />
      </>
    )
  },
  colorable: true,
  edgeSnap: false,
  onTap: async (t, api, info) => {
    if (info.act !== 'cell' || !info.v) return
    const [i, j] = info.v.split(',').map(Number)
    const rows: string[][] = t.p.rows
    const s = await api.prompt(i === 0 ? 'Sütun başlığı' : `Hücre (${i}. satır, ${j + 1}. sütun)`, rows[i]?.[j] ?? '')
    if (s == null) return
    api.updateP(t.id, { rows: rows.map((row, a) => (a === i ? row.map((cell, b) => (b === j ? s : cell)) : row)) }, true)
  },
}

// ---------------------------------------------------------------------------
// Değişken kaydırıcısı
// ---------------------------------------------------------------------------

const SL = 6 * UNIT

const knobX = (t: Tile) => {
  const { min, max, value } = t.p
  return -SL / 2 + (clamp((value - min) / (max - min || 1), 0, 1) * SL)
}

const slider: TileDef = {
  type: 'slider',
  name: (t) => `${t.p.variable} değişkeni`,
  create: (p) => ({ color: p.color ?? C.pink, p: { variable: p.variable ?? 'a', value: p.value ?? 1, min: p.min ?? -5, max: p.max ?? 5, step: p.step ?? 1 } }),
  bounds: () => ({ x: -SL / 2 - 16, y: -38, w: SL + 32, h: 62 }),
  render: (t) => {
    const color = t.color ?? C.pink
    const k = knobX(t)
    return (
      <>
        <rect x={-SL / 2 - 16} y={-38} width={SL + 32} height={62} rx={12} fill="#fff" stroke="#d7d7e0" strokeWidth={1.5} />
        <g data-act="value">
          <rect x={-SL / 2 - 4} y={-33} width={SL / 2} height={22} fill="transparent" />
          <text x={-SL / 2} y={-21} fontFamily={FONT} fontSize={15} fontWeight={800} fill="#242436" dominantBaseline="central" style={{ userSelect: 'none' }}>
            <tspan fontStyle="italic" fill={color}>{t.p.variable}</tspan> = {fmt(t.p.value, 3)}
          </text>
        </g>
        <Label x={SL / 2} y={-21} size={10} anchor="end" color="#99a">{`${fmt(t.p.min)} … ${fmt(t.p.max)}`}</Label>
        <rect x={-SL / 2} y={4} width={SL} height={6} rx={3} fill="#e3e3ea" />
        <rect x={-SL / 2} y={4} width={k + SL / 2} height={6} rx={3} fill={color} />
        <circle cx={k} cy={7} r={10} fill="#fff" stroke={color} strokeWidth={3} />
      </>
    )
  },
  handles: (t) => [{ id: 'knob', x: knobX(t), y: 7, show: 'always', hidden: true }],
  onHandle: (t, _id, l) => {
    const { min, max, step } = t.p
    const raw = min + ((clamp(l.x, -SL / 2, SL / 2) + SL / 2) / SL) * (max - min)
    const v = step > 0 ? Math.round((raw - min) / step) * step + min : raw
    return { p: { ...t.p, value: round(clamp(v, min, max), 6) } }
  },
  onTap: async (t, api, info) => {
    if (info.act !== 'value') return
    const s = await api.prompt(`${t.p.variable} değeri`, fmt(t.p.value, 6))
    const n = s == null ? NaN : Number(s.replace(',', '.'))
    if (Number.isFinite(n)) api.updateP(t.id, (p) => ({ value: clamp(n, Math.min(p.min, n), Math.max(p.max, n)), min: Math.min(p.min, n), max: Math.max(p.max, n) }), true)
  },
  colorable: true,
  rotatable: false,
  edgeSnap: false,
}

export const algebraTiles: TileDef[] = [fractionBar, fractionCircle, algebra, token, balance, functionMachine, axes, table, slider]

// ---------------------------------------------------------------------------
// Eylem çubuğu (Polypad eylemleri)
// ---------------------------------------------------------------------------

const isNum = (v: unknown) => Number.isFinite(parseNum(v))
const SERIES = [C.pink, C.blue, C.green, C.orange, C.purple, C.teal]

/** Tablonun başlık satırı ve boş olmayan veri satırları */
function tableData(t: Tile) {
  const rows: string[][] = t.p.rows ?? []
  return { head: rows[0] ?? [], body: rows.slice(1).filter((r) => r.some((c) => String(c).trim() !== '')) }
}
const hasChartData = (t: Tile) => {
  const { head, body } = tableData(t)
  return head.length >= 2 && body.some((r) => r.slice(1).some(isNum))
}
const hasXYData = (t: Tile) => tableData(t).body.some((r) => isNum(r[0]) && isNum(r[1]))

/** Yeni parçayı seçimin sağına yerleştirir */
function placeRight(tiles: Tile[], api: PadApi, tile: Omit<Tile, 'id'>) {
  const boxes = tiles.map((t) => api.box(t))
  const right = Math.max(...boxes.map((b) => b.x + b.w))
  const top = Math.min(...boxes.map((b) => b.y))
  const b = getDef(tile.type)?.bounds({ ...tile, id: '' } as Tile) ?? { x: 0, y: 0, w: 0, h: 0 }
  return { ...tile, x: right + 100 + b.w / 2, y: top + b.h / 2 }
}

function chartFromTables(tables: Tile[], api: PadApi, kind?: string) {
  const first = tableData(tables[0])
  const labels = first.body.map((r, i) => String(r[0] || i + 1))
  const series = tables.flatMap((t) => {
    const { head, body } = tableData(t)
    return head.slice(1).map((name, j) => ({ name: String(name || String.fromCharCode(65 + j)), values: body.map((r) => (isNum(r[j + 1]) ? parseNum(r[j + 1]) : 0)) }))
  })
  const chart = mk('chart', kind ? { kind } : {}, 0, 0)
  chart.p = { ...chart.p, labels, series: series.map((s, i) => ({ ...s, color: SERIES[i % SERIES.length] })) }
  api.add([placeRight(tables, api, chart)])
}

function pieFromTable(t: Tile, api: PadApi) {
  const { body } = tableData(t)
  const pie = mk('pie-chart', {}, 0, 0)
  pie.p = { ...pie.p, data: body.filter((r) => isNum(r[1])).map((r, i) => ({ label: String(r[0] || i + 1), v: parseNum(r[1]) })) }
  api.add([placeRight([t], api, pie)])
}

function scatterFromTables(tables: Tile[], api: PadApi) {
  const pts = tables.flatMap((t) => tableData(t).body.filter((r) => isNum(r[0]) && isNum(r[1])).map((r) => ({ x: parseNum(r[0]), y: parseNum(r[1]) })))
  const lim = (vs: number[]) => {
    const lo = Math.min(0, Math.floor(Math.min(...vs)))
    const hi = Math.max(1, Math.ceil(Math.max(...vs)))
    const pad = Math.max(1, Math.round((hi - lo) * 0.1))
    return [lo < 0 ? lo - pad : 0, hi + pad]
  }
  const [xmin, xmax] = lim(pts.map((p) => p.x))
  const [ymin, ymax] = lim(pts.map((p) => p.y))
  const ax = mk('axes', {}, 0, 0)
  ax.p = { ...ax.p, xmin, xmax, ymin, ymax, xstep: niceStep(xmax - xmin, 320), ystep: niceStep(ymax - ymin, 320), pts }
  api.add([placeRight(tables, api, ax)])
}

/** Kaydırıcı canlandırması: kaydırıcı kimliği → requestAnimationFrame numarası */
const sliderAnim = new Map<string, number>()

function stopSlider(id: string, api: PadApi) {
  const raf = sliderAnim.get(id)
  if (raf != null) cancelAnimationFrame(raf)
  sliderAnim.delete(id)
  api.commit()
}

function playSlider(t: Tile, api: PadApi) {
  const id = t.id
  const { min, max } = t.p
  if (!(max > min)) return
  const dur = Math.max(0.1, Number(t.p.duration ?? 4)) * 1000
  const motion = t.p.motion ?? 'bounce'
  const offset = clamp((t.p.value - min) / (max - min), 0, 1)
  const t0 = performance.now()
  const tick = (now: number) => {
    if (!api.get(id)) return void sliderAnim.delete(id)
    const phase = (motion === 'once' && offset >= 1 ? 0 : offset) + (now - t0) / dur
    let f: number
    if (motion === 'once') f = Math.min(1, phase)
    else if (motion === 'loop') f = phase % 1
    else {
      const q = phase % 2
      f = q <= 1 ? q : 2 - q
    }
    api.updateP(id, { value: round(min + (max - min) * f, 3) })
    if (motion === 'once' && phase >= 1) return stopSlider(id, api)
    sliderAnim.set(id, requestAnimationFrame(tick))
  }
  sliderAnim.set(id, requestAnimationFrame(tick))
}

/** Denklem karosu grafiği çizilebilir mi (y = … ya da yalnızca sağ taraf) */
const graphFn = (t: Tile): string | null => {
  const src = String(t.p.src ?? '').trim()
  if (!src) return null
  if (src.includes('=') && !/^\s*y\s*=/.test(src)) return null
  if (!compile(rhs(src))) return null
  return src.includes('=') ? src : `y = ${src}`
}

const fractionTypes = ['fraction-bar', 'fraction-circle']
const LABEL_OPTS = [
  { key: 'fraction', label: 'Kesir' },
  { key: 'percentage', label: 'Yüzde' },
  { key: 'decimal', label: 'Ondalık' },
]

export const algebraActions: ActionSpec[] = [
  // Kesir şeritleri ve daireleri
  {
    id: 'rename-up',
    type: 'button',
    tileTypes: fractionTypes,
    label: 'Yeniden adlandır (paydayı büyüt)',
    icon: 'fraction-up',
    order: 1,
    click: (ts, api) => ts.forEach((t) => {
      const patch = renamePatch(t, 1)
      if (patch) api.update(t.id, patch)
    }),
  },
  {
    id: 'rename-down',
    type: 'button',
    tileTypes: fractionTypes,
    label: 'Yeniden adlandır (paydayı küçült)',
    icon: 'fraction-down',
    order: 2,
    click: (ts, api) => ts.forEach((t) => {
      const patch = renamePatch(t, -1)
      if (patch) api.update(t.id, patch)
    }),
  },
  {
    id: 'merge-fraction-bar',
    type: 'button',
    tileTypes: ['fraction-bar'],
    label: 'Birleştir',
    icon: 'merge',
    text: true,
    order: 3,
    show: (ts) => ts.length > 1 && ts.every((t) => t.p.denominator === ts[0].p.denominator),
    click: (ts, api) => {
      // En soldaki ucun yerinde, ilk şeridin yönünde tek şerit
      const ends = ts.map((t) => toWorld(t, { x: -barSize(t).w / 2, y: 0 }))
      const i = ends.reduce((b, e, k) => (e.x < ends[b].x ? k : b), 0)
      const first = ts[i]
      const count = ts.reduce((n, t) => n + t.p.count, 0)
      const w = (barWhole(first) / first.p.denominator) * count
      const c = rotate({ x: w / 2, y: 0 }, first.rot)
      const tile = { ...mk('fraction-bar', { ...first.p, count }, ends[i].x + c.x, ends[i].y + c.y, first.rot), color: first.color }
      api.remove(ts.map((t) => t.id))
      api.add([tile])
      api.sound('snap')
    },
  },
  {
    id: 'merge-fraction-circle',
    type: 'button',
    tileTypes: ['fraction-circle'],
    label: 'Birleştir',
    icon: 'merge',
    text: true,
    order: 3,
    show: (ts) => ts.length > 1 && ts[0].p.denominator > 1 && ts.every((t) => t.p.denominator === ts[0].p.denominator),
    click: (ts, api) => {
      const d = ts[0].p.denominator
      let left = ts.reduce((n, t) => n + t.p.count, 0)
      const groups: number[] = []
      while (left > 0) {
        groups.push(Math.min(d, left))
        left -= d
      }
      const cx = ts.reduce((n, t) => n + t.x, 0) / ts.length
      const cy = ts.reduce((n, t) => n + t.y, 0) / ts.length
      const step = radiusOf(ts[0]) * 2 + 24
      const out = groups.map((count, g) => ({ ...mk('fraction-circle', { ...ts[0].p, count, combine: undefined }, cx + (g - (groups.length - 1) / 2) * step, cy, 0), color: ts[0].color }))
      api.remove(ts.map((t) => t.id))
      api.add(out)
      api.sound('snap')
    },
  },
  {
    id: 'split-fraction',
    type: 'button',
    tileTypes: fractionTypes,
    label: 'Ayır',
    icon: 'split',
    text: true,
    order: 4,
    show: (ts) => ts.some((t) => t.p.count > 1) && ts.every((t) => !t.p.combine),
    click: (ts, api) => {
      const many = ts.filter((t) => t.p.count > 1)
      const pieces = many.flatMap((t) => (t.type === 'fraction-bar' ? splitBar(t) : splitCircle(t)))
      api.remove(many.map((t) => t.id))
      api.add(pieces)
      api.sound('pop')
    },
  },
  {
    id: 'fraction-labels',
    type: 'select',
    tileTypes: fractionTypes,
    label: 'Etiketler:',
    location: 'more',
    options: [...LABEL_OPTS, { key: 'hidden', label: 'Yok' }],
    show: (ts) => ts.some((t) => t.type === 'fraction-bar'),
    get: (t) => (labelKind(t.p.labels) === 'percent' ? 'percentage' : labelKind(t.p.labels) === 'none' ? 'hidden' : labelKind(t.p.labels)),
    set: (v: string) => ({ p: { labels: v } }),
  },
  {
    id: 'fraction-circle-labels',
    type: 'select',
    tileTypes: ['fraction-circle'],
    label: 'Etiketler:',
    location: 'more',
    options: [...LABEL_OPTS, { key: 'degree', label: 'Derece' }, { key: 'hidden', label: 'Yok' }],
    get: (t) => (labelKind(t.p.labels) === 'percent' ? 'percentage' : labelKind(t.p.labels) === 'none' ? 'hidden' : labelKind(t.p.labels)),
    set: (v: string) => ({ p: { labels: v } }),
  },
  {
    id: 'fraction-bar-scale',
    type: 'input',
    tileTypes: ['fraction-bar'],
    label: 'Ölçek:',
    location: 'more',
    value: 'number',
    range: [1, 20],
    get: (t) => t.p.size ?? 12,
    set: (v: number) => ({ p: { size: clamp(Math.round(v), 1, 20) } }),
  },
  {
    id: 'fraction-circle-radius',
    type: 'input',
    tileTypes: ['fraction-circle'],
    label: 'Yarıçap:',
    location: 'more',
    value: 'number',
    range: [1, 10],
    step: 0.5,
    get: (t) => t.p.size ?? 2.5,
    set: (v: number) => ({ p: { size: clamp(Math.round(v * 2) / 2, 1, 10) } }),
  },
  {
    id: 'fraction-unit',
    type: 'checkbox',
    tileTypes: fractionTypes,
    label: 'Birim kesirler:',
    icon: 'merge',
    location: 'more',
    show: (ts) => ts.some((t) => t.p.count > 1),
    get: (t) => !t.p.combine,
    set: (v: boolean) => ({ p: { combine: !v } }),
  },

  // Cebir karoları
  {
    id: 'negate',
    type: 'button',
    tileTypes: ['algebra'],
    label: 'Ters işaretlisi',
    icon: 'turn',
    text: true,
    click: (ts, api) => ts.forEach((t) => api.updateP(t.id, { expr: String(t.p.expr).startsWith('-') ? String(t.p.expr).slice(1) : `-${t.p.expr}` })),
  },
  {
    id: 'merge-algebra',
    type: 'button',
    tileTypes: ['algebra'],
    label: 'Birleştir',
    icon: 'merge',
    text: true,
    show: (ts) => ts.length > 1 && ts.every((t) => t.p.expr === ts[0].p.expr) && Math.abs(ts.reduce((n, t) => n + 1 / algDen(t), 0) - 1) < 1e-9,
    click: (ts, api) => {
      const x = ts.reduce((n, t) => n + t.x, 0) / ts.length
      const y = ts.reduce((n, t) => n + t.y, 0) / ts.length
      const t0 = ts[0]
      api.remove(ts.map((t) => t.id))
      api.add([{ type: 'algebra', x, y, rot: t0.rot, flip: t0.flip, color: t0.color, p: { ...t0.p, splitH: 1, splitV: 1 } }])
      api.sound('snap')
    },
  },
  {
    id: 'splitV',
    type: 'button',
    tileTypes: ['algebra'],
    label: 'Dikey böl',
    icon: 'split-v',
    show: (ts) => ts.every((t) => (isQuarterTurned(t) ? (t.p.splitH ?? 1) : (t.p.splitV ?? 1)) < 8),
    click: (ts, api) => {
      api.remove(ts.map((t) => t.id))
      api.add(ts.flatMap((t) => splitAlgebra(t, 'v')))
    },
  },
  {
    id: 'splitH',
    type: 'button',
    tileTypes: ['algebra'],
    label: 'Yatay böl',
    icon: 'split-h',
    show: (ts) => ts.every((t) => (isQuarterTurned(t) ? (t.p.splitV ?? 1) : (t.p.splitH ?? 1)) < 8),
    click: (ts, api) => {
      api.remove(ts.map((t) => t.id))
      api.add(ts.flatMap((t) => splitAlgebra(t, 'h')))
    },
  },
  {
    id: 'algebra-denominator',
    type: 'input',
    tileTypes: ['algebra'],
    label: 'Payda (yatay; dikey):',
    icon: 'split-h',
    location: 'more',
    value: 'text',
    get: (t) => `${t.p.splitH ?? 1}; ${t.p.splitV ?? 1}`,
    set: (v: string) => {
      const [h, w] = String(v).split(/[;x×\s]+/).filter(Boolean).map(Number)
      if (![h, w].every(Number.isFinite)) return
      return { p: { splitH: clamp(Math.round(h), 1, 8), splitV: clamp(Math.round(w), 1, 8) } }
    },
  },
  {
    id: 'algebra-show-labels',
    type: 'checkbox',
    tileTypes: ['algebra', 'balance'],
    label: 'Etiketleri göster:',
    icon: 'numbers',
    location: 'more',
    get: (t) => (t.type === 'balance' ? balanceLabels(t) : !algLabelHidden(t)),
    set: (v: boolean) => ({ p: { labels: v ? undefined : 'hidden', hideLabel: undefined, sums: v } }),
  },

  // Terazi (değişken değerleri: Polypad'de cebir karolarındaki yazar ayarı)
  ...(['x', 'y'] as const).map(
    (k): ActionSpec => ({
      id: `balance-${k}`,
      type: 'input',
      tileTypes: ['balance'],
      label: `${k} değeri:`,
      value: 'number',
      author: true,
      get: (t) => (t.p.vars ?? {})[k] ?? (k === 'x' ? 3 : 2),
      set: (v: number, t) => ({ p: { vars: { x: 3, y: 2, ...(t.p.vars ?? {}), [k]: v } } }),
    }),
  ),

  // Pul (Polypad: Parça ağırlığı, yazar ayarı)
  { id: 'token-weight', type: 'input', tileTypes: ['token'], label: 'Parça ağırlığı:', value: 'number', author: true, location: 'more', get: (t) => t.p.value ?? 1, set: (v: number) => ({ p: { value: v } }) },

  // Fonksiyon makinesi
  {
    id: 'tabulate',
    type: 'button',
    tileTypes: ['function-machine'],
    label: 'Tablo oluştur',
    icon: 'grid',
    text: true,
    show: (ts) => ts.length === 1,
    click: ([t], api) => {
      const f = compile(rhs(String(t.p.rule)))
      const two = t.p.inputs === 2
      const inputs = two ? [1, 2, 3, 4, 5].map((a) => [a, 2]) : [0, 1, 2, 3, 4, 5].map((x) => [x])
      const out = (v: number[]) => {
        const r = f ? f(two ? { a: v[0], b: v[1], x: v[0], y: v[1] } : { x: v[0], a: v[0], n: v[0] }) : NaN
        return Number.isFinite(r) ? formatAs(round(r, 6), String(t.p.labels ?? 'decimal')) : '?'
      }
      const rows = [two ? ['a', 'b', 'Çıktı'] : ['x', 'Çıktı'], ...inputs.map((v) => [...v.map(String), out(v)])]
      const b = api.box(t)
      const tb = mk('table', {}, t.x, 0)
      tb.p = { ...tb.p, rows }
      api.add([{ ...tb, y: b.y + b.h + 40 + (rows.length * CH) / 2 }])
    },
  },
  {
    id: 'toggleExpression',
    type: 'checkbox',
    tileTypes: ['function-machine'],
    label: 'Kuralı göster:',
    location: 'more',
    get: (t) => !t.p.hidden,
    set: (v: boolean) => ({ p: { hidden: !v } }),
  },
  {
    id: 'toggleInverse',
    type: 'checkbox',
    tileTypes: ['function-machine'],
    label: 'Ters çevir:',
    location: 'more',
    show: (ts) => ts.every((t) => t.p.inputs !== 2 && !!linearOf(String(t.p.rule))),
    get: (t) => !!t.p.invert,
    set: (v: boolean, t) => {
      if (v && !t.p.invert) {
        const lin = linearOf(String(t.p.rule))
        return lin ? { p: { invert: true, ruleOrig: t.p.rule, rule: inverseRule(lin) } } : undefined
      }
      if (!v && t.p.invert) return { p: { invert: false, rule: t.p.ruleOrig ?? t.p.rule, ruleOrig: undefined } }
    },
  },
  {
    id: 'fm-labels',
    type: 'select',
    tileTypes: ['function-machine'],
    label: 'Çıktı:',
    location: 'more',
    options: [
      { key: 'decimal', label: 'Ondalık' },
      { key: 'fraction', label: 'Kesir' },
      { key: 'mixed', label: 'Tam sayılı kesir' },
    ],
    get: (t) => t.p.labels ?? 'decimal',
    set: (v: string) => ({ p: { labels: v } }),
  },
  {
    id: 'fm-inputs',
    type: 'select',
    tileTypes: ['function-machine'],
    label: 'Girdiler:',
    location: 'more',
    options: [
      { key: '1', label: 'Bir' },
      { key: '2', label: 'İki' },
    ],
    get: (t) => String(t.p.inputs === 2 ? 2 : 1),
    set: (v: string, t) => {
      const n = v === '2' ? 2 : 1
      if (n === (t.p.inputs === 2 ? 2 : 1)) return
      const rule = String(t.p.rule)
      const fits = n === 2 ? /[ab]/.test(rule) : /[xn]/.test(rule)
      return { p: { inputs: n, slots: [], invert: false, ruleOrig: undefined, rule: fits ? rule : n === 2 ? 'a · b' : 'x + 3' } }
    },
  },

  // Koordinat düzlemi
  ...(['x', 'y'] as const).map(
    (k): ActionSpec => ({
      id: `${k}-axis`,
      type: 'input',
      tileTypes: ['axes'],
      label: `${k.toUpperCase()} ekseni:`,
      value: 'number',
      range: [0.01, 1e6],
      get: (t) => t.p[`${k}step`] ?? 1,
      set: (v: number, t) => {
        const old = t.p[`${k}step`] ?? 1
        if (!(v > 0) || v === old) return
        const r = v / old
        return { p: { [`${k}step`]: v, [`${k}min`]: round(t.p[`${k}min`] * r, 6), [`${k}max`]: round(t.p[`${k}max`] * r, 6) } }
      },
    }),
  ),
  {
    id: 'graph-equation',
    type: 'button',
    tileTypes: ['equation', 'axes'],
    label: 'Grafiğini çiz',
    icon: 'axes',
    order: 2,
    show: (ts) => ts.some((t) => t.type === 'equation') && ts.every((t) => t.type !== 'equation' || !!graphFn(t)),
    click: (ts, api) => {
      const eqs = ts.filter((t) => t.type === 'equation')
      const cx = eqs.reduce((n, t) => n + t.x, 0) / eqs.length
      const cy = eqs.reduce((n, t) => n + t.y, 0) / eqs.length
      const near = (list: Tile[]) => list.filter((t) => t.type === 'axes').sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0]
      const target = near(ts) ?? near(api.all())
      const fns = eqs.map(graphFn).filter((f): f is string => !!f)
      if (target) {
        api.updateP(target.id, (p) => ({ fns: [...(p.fns ?? []), ...fns.filter((f) => !(p.fns ?? []).includes(f))] }))
        return
      }
      const ax = mk('axes', {}, 0, 0)
      ax.p = { ...ax.p, fns }
      api.add([placeRight(eqs, api, ax)], false)
    },
  },
  {
    id: 'axes-arrows',
    type: 'select',
    tileTypes: ['axes'],
    label: 'Oklar:',
    location: 'more',
    options: [
      { key: 'both', label: 'İki yönde' },
      { key: 'positive', label: 'Pozitif yönde' },
      { key: 'none', label: 'Yok' },
    ],
    get: (t) => t.p.arrows ?? 'none',
    set: (v: string) => ({ p: { arrows: v } }),
  },
  { id: 'axes-grid', type: 'checkbox', tileTypes: ['axes'], label: 'Izgara:', icon: 'grid', location: 'more', get: (t) => !!t.p.grid, set: (v: boolean) => ({ p: { grid: v } }) },
  {
    id: 'axes-add-fn',
    type: 'button',
    tileTypes: ['axes'],
    label: 'Fonksiyon ekle',
    icon: 'graph',
    location: 'more',
    show: (ts) => ts.length === 1,
    click: async ([t], api) => {
      const s = await api.prompt('Fonksiyon (ör. y = 2x + 1, y = a·x² + b)', 'y = ')
      if (s == null || !rhs(s).trim()) return
      if (!compile(rhs(s))) return api.sound('error')
      api.updateP(t.id, (p) => ({ fns: [...(p.fns ?? []), s.trim()] }), true)
    },
  },
  {
    id: 'axes-add-point',
    type: 'button',
    tileTypes: ['axes'],
    label: 'Nokta ekle',
    icon: 'scatter',
    location: 'more',
    show: (ts) => ts.length === 1,
    click: async ([t], api) => {
      const s = await api.prompt('Nokta (x; y)', '2; 3')
      const m = s && /^\s*\(?\s*(-?[\d.,]+)\s*;\s*(-?[\d.,]+)\s*\)?\s*$/.exec(s)
      if (!m) return
      api.updateP(t.id, (p) => ({ pts: [...(p.pts ?? []), { x: parseNum(m[1]), y: parseNum(m[2]) }] }), true)
    },
  },
  {
    id: 'axes-clear',
    type: 'button',
    tileTypes: ['axes'],
    label: 'Grafikleri temizle',
    icon: 'delete',
    location: 'more',
    show: (ts) => ts.some((t) => t.p.fns?.length || t.p.pts?.length),
    click: (ts, api) => ts.forEach((t) => api.updateP(t.id, { fns: [], pts: [] })),
  },

  // Tablo
  { id: 'scatter-plot', type: 'button', tileTypes: ['table'], label: 'Serpme grafiği', icon: 'scatter', show: (ts) => ts.some(hasXYData), click: (ts, api) => scatterFromTables(ts, api) },
  { id: 'column-chart', type: 'button', tileTypes: ['table'], label: 'Sütun grafiği', icon: 'column-chart', show: (ts) => ts.some(hasChartData), click: (ts, api) => chartFromTables(ts, api) },
  { id: 'area-chart', type: 'button', tileTypes: ['table'], label: 'Alan grafiği', icon: 'area-chart', show: (ts) => ts.some(hasChartData), click: (ts, api) => chartFromTables(ts, api, 'area') },
  { id: 'pie-chart', type: 'button', tileTypes: ['table'], label: 'Daire grafiği', icon: 'pie-chart', show: (ts) => ts.length === 1 && hasChartData(ts[0]), click: ([t], api) => pieFromTable(t, api) },
  {
    id: 'transpose',
    type: 'button',
    tileTypes: ['table'],
    label: 'Satır ve sütunları değiştir',
    icon: 'swap',
    click: (ts, api) =>
      ts.forEach((t) => {
        const rows: string[][] = t.p.rows
        api.updateP(t.id, { rows: rows[0].map((_, j) => rows.map((r) => r[j] ?? '')) })
      }),
  },
  { id: 'table-add-row', type: 'button', tileTypes: ['table'], label: 'Satır ekle', icon: 'add', location: 'more', click: (ts, api) => ts.forEach((t) => api.updateP(t.id, (p) => ({ rows: [...p.rows, p.rows[0].map(() => '')] }))) },
  {
    id: 'table-del-row',
    type: 'button',
    tileTypes: ['table'],
    label: 'Satır sil',
    icon: 'minus',
    location: 'more',
    show: (ts) => ts.every((t) => t.p.rows.length > 2),
    click: (ts, api) => ts.forEach((t) => api.updateP(t.id, (p) => ({ rows: p.rows.slice(0, -1) }))),
  },
  {
    id: 'table-add-col',
    type: 'button',
    tileTypes: ['table'],
    label: 'Sütun ekle',
    icon: 'add',
    location: 'more',
    click: (ts, api) => ts.forEach((t) => api.updateP(t.id, (p) => ({ rows: p.rows.map((row: string[], i: number) => [...row, i === 0 ? String.fromCharCode(65 + row.length) : '']) }))),
  },
  {
    id: 'table-del-col',
    type: 'button',
    tileTypes: ['table'],
    label: 'Sütun sil',
    icon: 'minus',
    location: 'more',
    show: (ts) => ts.every((t) => t.p.rows[0].length > 1),
    click: (ts, api) => ts.forEach((t) => api.updateP(t.id, (p) => ({ rows: p.rows.map((row: string[]) => row.slice(0, -1)) }))),
  },

  // Değişken kaydırıcısı
  {
    id: 'slider-name',
    type: 'input',
    tileTypes: ['slider'],
    label: 'Ad:',
    value: 'text',
    get: (t) => t.p.variable,
    set: (v: string) => {
      const m = /[A-Za-z]/.exec(String(v))
      return m ? { p: { variable: m[0] } } : undefined
    },
  },
  {
    id: 'slider-range',
    type: 'input',
    tileTypes: ['slider'],
    label: 'Aralık:',
    value: 'text',
    get: (t) => `${fmt(t.p.min, 4)}; ${fmt(t.p.max, 4)}`,
    set: (v: string, t) => {
      const [a, b] = String(v).split(';').map(parseNum)
      if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) return
      return { p: { min: a, max: b, value: clamp(t.p.value, a, b) } }
    },
  },
  {
    id: 'slider-play',
    type: 'button',
    tileTypes: ['slider'],
    label: 'Oynat',
    icon: 'play',
    show: (ts) => ts.some((t) => !sliderAnim.has(t.id)),
    click: (ts, api) => ts.forEach((t) => !sliderAnim.has(t.id) && playSlider(t, api)),
  },
  {
    id: 'slider-pause',
    type: 'button',
    tileTypes: ['slider'],
    label: 'Durdur',
    icon: 'pause',
    show: (ts) => ts.some((t) => sliderAnim.has(t.id)),
    click: (ts, api) => ts.forEach((t) => sliderAnim.has(t.id) && stopSlider(t.id, api)),
  },
  {
    id: 'slider-increment',
    type: 'input',
    tileTypes: ['slider'],
    label: 'Artış:',
    location: 'more',
    value: 'number',
    range: [0.001, 1e6],
    step: 0.05,
    get: (t) => t.p.step,
    set: (v: number) => ({ p: { step: v } }),
  },
  {
    id: 'slider-duration',
    type: 'input',
    tileTypes: ['slider'],
    label: 'Süre (sn):',
    location: 'more',
    value: 'number',
    range: [0.1, 10],
    step: 0.5,
    get: (t) => t.p.duration ?? 4,
    set: (v: number) => ({ p: { duration: v } }),
  },
  {
    id: 'slider-motion',
    type: 'select',
    tileTypes: ['slider'],
    label: 'Hareket:',
    location: 'more',
    options: [
      { key: 'bounce', label: 'Gidip gel' },
      { key: 'loop', label: 'Döngü' },
      { key: 'once', label: 'Bir kez' },
    ],
    get: (t) => t.p.motion ?? 'bounce',
    set: (v: string) => ({ p: { motion: v } }),
  },
]
