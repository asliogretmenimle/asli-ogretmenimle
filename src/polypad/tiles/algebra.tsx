import type { ReactNode } from 'react'
import type { PadApi, Props, Pt, Tile, TileDef } from '../types'
import { UNIT, boundsOf, clamp, fmt, pathOf, rad, round, toLocal, toWorld } from '../geom'
import { C, FONT, Label, action, edge, rectBox, toggle } from './kit'
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

type LabelKind = 'fraction' | 'decimal' | 'percent' | 'none'
const LABEL_CYCLE: LabelKind[] = ['fraction', 'decimal', 'percent', 'none']
const nextLabel = (k: LabelKind) => LABEL_CYCLE[(LABEL_CYCLE.indexOf(k) + 1) % LABEL_CYCLE.length]
const labelName: Record<LabelKind, string> = { fraction: 'Kesir', decimal: 'Ondalık', percent: 'Yüzde', none: 'Etiket yok' }

/** Kesir parçası etiketi (1/d) */
function PieceLabel({ d, kind, x, y, size, color, unit }: { d: number; kind: LabelKind; x: number; y: number; size: number; color: string; unit?: boolean }) {
  if (kind === 'none') return null
  if (d === 1 || unit) return <Label x={x} y={y} size={size * 1.15} color={color}>1</Label>
  if (kind === 'fraction') return <Frac n={1} d={d} x={x} y={y} size={size} color={color} />
  const text = kind === 'decimal' ? fmt(1 / d, 3) : `%${fmt(100 / d, 1)}`
  return <Label x={x} y={y} size={size * (text.length > 4 ? 0.82 : 1)} color={color}>{text}</Label>
}

/** Payda başına renk */
const FR_COLORS = ['#cd0e66', '#eb4726', '#fd8c00', '#bfc212', '#22ab24', '#009ea6', '#0f82f2', '#6d3bbf', '#900a47', '#b16200', '#006f74', '#4c2986']
const frColor = (t: Tile) => t.color ?? FR_COLORS[(t.p.denominator - 1) % FR_COLORS.length]

const labelActions = (t: Tile) =>
  action('labels', `Etiket: ${labelName[(t.p.labels ?? 'fraction') as LabelKind]}`, 'label', (tile, api) => api.updateP(tile.id, (p) => ({ labels: nextLabel(p.labels ?? 'fraction') }), true))

async function askInt(api: PadApi, label: string, value: number, min: number, max: number) {
  const s = await api.prompt(label, String(value))
  if (s == null) return null
  const n = Math.round(Number(s.replace(',', '.')))
  return Number.isFinite(n) ? clamp(n, min, max) : null
}

// ---------------------------------------------------------------------------
// Kesir şeritleri
// ---------------------------------------------------------------------------

const BAR_W = 12 * UNIT
const BAR_H = UNIT * 1.25

const barSize = (t: Tile) => ({ pw: BAR_W / t.p.denominator, w: (BAR_W / t.p.denominator) * t.p.count })

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
    const kind = (t.p.labels ?? 'fraction') as LabelKind
    const size = clamp(pw / 3.2, 8, 14)
    return (
      <>
        <rect x={-w / 2} y={-BAR_H / 2} width={w} height={BAR_H} fill={color} stroke={edge(color)} strokeWidth={1.5} rx={2} />
        {t.p.count > 1 && (
          <path d={Array.from({ length: t.p.count - 1 }, (_, i) => `M${-w / 2 + (i + 1) * pw} ${-BAR_H / 2}v${BAR_H}`).join('')} stroke={edge(color)} strokeWidth={1.5} />
        )}
        {Array.from({ length: t.p.count }, (_, i) => (
          <PieceLabel key={i} d={t.p.denominator} kind={kind} x={-w / 2 + (i + 0.5) * pw} y={0} size={size} color="#fff" />
        ))}
      </>
    )
  },
  colorable: true,
  edgeSnap: true,
  actions: (t) => [
    labelActions(t),
    ...(t.p.count > 1
      ? [
          action('split', 'Parçalara ayır', 'split', (tile, api) => {
            const { pw, w } = barSize(tile)
            const pieces = Array.from({ length: tile.p.count }, (_, i) => {
              const c = toWorld(tile, { x: -w / 2 + (i + 0.5) * pw, y: 0 })
              return { ...mk('fraction-bar', { ...tile.p, count: 1 }, c.x, c.y, tile.rot), color: tile.color, flip: tile.flip }
            })
            api.remove([tile.id])
            api.add(pieces)
          }),
        ]
      : []),
    action('count', 'Parça sayısı', 'hash', async (tile, api) => {
      const n = await askInt(api, `Parça sayısı (1–${tile.p.denominator * 3})`, tile.p.count, 1, tile.p.denominator * 3)
      if (n != null) api.updateP(tile.id, { count: n }, true)
    }),
    action('denominator', 'Payda', 'fraction', async (tile, api) => {
      const n = await askInt(api, 'Payda (1–24)', tile.p.denominator, 1, 24)
      if (n != null) api.updateP(tile.id, (p) => ({ denominator: n, count: Math.min(p.count, n * 3) }), true)
    }),
  ],
}

// ---------------------------------------------------------------------------
// Kesir daireleri: parçanın kökeni her zaman dairenin merkezidir; böylece dilimler
// merkez etrafında döner ve ayrılan dilimler bütündeki yerlerinde kalır.
// ---------------------------------------------------------------------------

const CR = 2.5 * UNIT

function sectorPts(a0: number, a1: number, r = CR): Pt[] {
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

function sectorPath(a0: number, a1: number) {
  if (a1 - a0 >= 360) return `M${CR} 0A${CR} ${CR} 0 1 1 ${-CR} 0A${CR} ${CR} 0 1 1 ${CR} 0Z`
  const p0 = { x: CR * Math.cos(rad(a0)), y: CR * Math.sin(rad(a0)) }
  const p1 = { x: CR * Math.cos(rad(a1)), y: CR * Math.sin(rad(a1)) }
  return `M0 0L${round(p0.x)} ${round(p0.y)}A${CR} ${CR} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${round(p1.x)} ${round(p1.y)}Z`
}

const fractionCircle: TileDef = {
  type: 'fraction-circle',
  name: (t) => (t.p.denominator === 1 ? 'Bütün daire' : `${t.p.count}/${t.p.denominator} daire`),
  create: (p) => ({ p: { denominator: p.denominator ?? 1, count: p.count ?? p.denominator ?? 1, labels: p.labels ?? 'fraction', showUnitLabel: p.showUnitLabel ?? true } }),
  outline: (t) => sectorPts(-90, -90 + circleSpan(t).total),
  bounds: (t) => {
    const { total } = circleSpan(t)
    if (total >= 360) return rectBox(CR * 2, CR * 2)
    return boundsOf(sectorPts(-90, -90 + total))
  },
  render: (t) => {
    const { a, total } = circleSpan(t)
    const color = frColor(t)
    const kind = (t.p.labels ?? 'fraction') as LabelKind
    const d = t.p.denominator
    const size = clamp(28 - d * 1.4, 10, 16)
    const whole = d === 1
    return (
      <>
        {whole ? (
          <path d={sectorPath(-90, 270)} fill={color} stroke={edge(color)} strokeWidth={1.5} />
        ) : (
          Array.from({ length: t.p.count }, (_, i) => (
            <path key={i} d={sectorPath(-90 + i * a, -90 + Math.min(360, (i + 1) * a))} fill={color} stroke={edge(color)} strokeWidth={1.5} strokeLinejoin="round" />
          ))
        )}
        {whole
          ? t.p.showUnitLabel !== false && kind !== 'none' && <Label size={22} color="#fff">1</Label>
          : Array.from({ length: t.p.count }, (_, i) => {
              const m = rad(-90 + (i + 0.5) * a)
              const r = d === 2 ? CR * 0.45 : CR * 0.62
              return <PieceLabel key={i} d={d} kind={kind} x={r * Math.cos(m)} y={r * Math.sin(m)} size={size} color="#fff" />
            })}
        {total < 360 && <circle r={2.5} fill={edge(color)} />}
      </>
    )
  },
  colorable: true,
  rotStep: 15,
  actions: (t) => [
    labelActions(t),
    ...(t.p.count > 1
      ? [
          action('split', 'Dilimlere ayır', 'split', (tile, api) => {
            const { a } = circleSpan(tile)
            const pieces = Array.from({ length: tile.p.count }, (_, i) => ({
              ...mk('fraction-circle', { ...tile.p, count: 1 }, tile.x, tile.y, (tile.rot + (tile.flip ? -1 : 1) * i * a) % 360),
              color: tile.color,
            }))
            api.remove([tile.id])
            api.add(pieces)
          }),
        ]
      : []),
    action('count', 'Dilim sayısı', 'hash', async (tile, api) => {
      const n = await askInt(api, `Dilim sayısı (1–${tile.p.denominator})`, tile.p.count, 1, tile.p.denominator)
      if (n != null) api.updateP(tile.id, { count: n }, true)
    }),
  ],
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

/** Cebir karosunun değeri (x, y değişken değerleriyle) */
export function algebraValue(expr: string, vars: Vars = { x: 3, y: 2 }) {
  const { neg, base } = algParts(expr)
  const x = vars.x ?? 3
  const y = vars.y ?? 2
  const v = { '1': 1, x, y, xy: x * y, x2: x * x, y2: y * y }[base] ?? 1
  return neg ? -v : v
}

const algebra: TileDef = {
  type: 'algebra',
  name: (t) => {
    const { neg, base } = algParts(t.p.expr)
    return `${neg ? '−' : ''}${ALG[base].label} karosu`
  },
  create: (p) => ({ p: { expr: String(p.expr ?? '1') } }),
  bounds: (t) => {
    const s = ALG[algParts(t.p.expr).base]
    return rectBox(s.w, s.h)
  },
  outline: (t) => {
    const s = ALG[algParts(t.p.expr).base]
    return [{ x: -s.w / 2, y: -s.h / 2 }, { x: s.w / 2, y: -s.h / 2 }, { x: s.w / 2, y: s.h / 2 }, { x: -s.w / 2, y: s.h / 2 }]
  },
  render: (t) => {
    const { neg, base } = algParts(t.p.expr)
    const s = ALG[base]
    const color = neg ? NEG : s.color
    const size = base === '1' ? 15 : 18
    return (
      <>
        <rect x={-s.w / 2} y={-s.h / 2} width={s.w} height={s.h} fill={color} stroke={edge(color)} strokeWidth={1.5} rx={2} />
        {!t.p.hideLabel && (
          // Uzun karolarda etiket karo ile birlikte döner; dik karoda da okunur kalsın diye döndürmeyi geri al
          <g transform={`rotate(${-t.rot})`}>
            <Label size={size} color="#fff">{`${neg ? '−' : ''}${s.label}`}</Label>
          </g>
        )}
      </>
    )
  },
  gridSnap: true,
  rotStep: 90,
  actions: (t) => [
    action('flip-sign', 'İşaretini değiştir', 'reset', (tile, api) =>
      api.updateP(tile.id, (p) => ({ expr: String(p.expr).startsWith('-') ? String(p.expr).slice(1) : `-${p.expr}` }), true),
    ),
    toggle(t, 'hideLabel', 'Etiketi gizle', 'eyeOff'),
  ],
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
  actions: (t) => [
    action('value', 'Değeri değiştir', 'edit', async (tile, api) => {
      const s = await api.prompt('Pulun değeri', fmt(tile.p.value ?? 1, 4))
      const n = s == null ? NaN : Number(s.replace(',', '.'))
      if (Number.isFinite(n)) api.updateP(tile.id, { value: n }, true)
    }),
    ...(t.p.shape === 'weight' ? [] : [toggle(t, 'showValue', 'Değeri göster', 'label')]),
  ],
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
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Bir parçanın sayısal değeri (terazi ve benzerleri için) */
export function tileValue(t: Tile, vars: Vars): number | null {
  switch (t.type) {
    case 'token':
      return numOf(t.p.value ?? 1)
    case 'algebra':
      return algebraValue(String(t.p.expr), vars)
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
          {t.p.sums && n > 0 && (
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
        {t.p.sums && !ctx.thumb && (nl > 0 || nr > 0) && (
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
  actions: (t) => [
    toggle(t, 'sums', 'Toplamları göster', 'label'),
    action('vars', 'Değişken değerleri', 'edit', async (tile, api) => {
      const v = { x: 3, y: 2, ...(tile.p.vars ?? {}) }
      const s = await api.prompt('Değişken değerleri (ör. x = 3; y = 2)', `x = ${fmt(v.x, 4)}; y = ${fmt(v.y, 4)}`)
      if (s == null) return
      const next = { ...v }
      for (const part of s.split(';')) {
        const m = /^\s*([a-zA-Z])\s*=\s*(-?[\d.,]+)\s*$/.exec(part)
        if (m) next[m[1] as 'x'] = Number(m[2].replace(',', '.'))
      }
      api.updateP(tile.id, { vars: next }, true)
    }),
  ],
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
  const n = t.p.valueStr != null ? Number(String(t.p.valueStr).replace(',', '.')) : Number(t.p.value)
  return Number.isFinite(n) ? n : null
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
          {t.p.hidden ? '?' : String(t.p.rule)}
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
        const value = round(res, 4)
        const card = mk('number-card', Number.isInteger(value) ? { value } : { value, valueStr: fmt(value, 4) }, w.x, w.y, t.rot)
        out = api.add([card], false)[0] ?? null
        api.sound('pop')
      } else api.sound('error')
    }
    api.updateP(t.id, { slots, out }, true)
  },
  actions: (t) => [
    action('rule', 'Kuralı düzenle', 'edit', async (tile, api) => {
      const s = await api.prompt(tile.p.inputs === 2 ? 'Kural (a ve b kullanın)' : 'Kural (x kullanın)', String(tile.p.rule))
      if (s != null && s.trim()) api.updateP(tile.id, { rule: s.trim() }, true)
    }),
    toggle(t, 'hidden', 'Gizemli kural (gizle)', 'eyeOff'),
  ],
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
  create: () => ({ p: { w: 320, h: 320, xmin: -5, xmax: 5, ymin: -5, ymax: 5, grid: true, fns: [], pts: [] } }),
  bounds: (t) => rectBox(t.p.w, t.p.h),
  render: (t, ctx) => {
    const { w, h, xmin, xmax, ymin, ymax } = t.p as { w: number; h: number; xmin: number; xmax: number; ymin: number; ymax: number }
    const X = (x: number) => -w / 2 + ((x - xmin) / (xmax - xmin)) * w
    const Y = (y: number) => h / 2 - ((y - ymin) / (ymax - ymin)) * h
    const sx = niceStep(xmax - xmin, w)
    const sy = niceStep(ymax - ymin, h)
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
        <path d={`M${w / 2 - 7} ${ay - 4}L${w / 2} ${ay}L${w / 2 - 7} ${ay + 4}M${ax - 4} ${-h / 2 + 7}L${ax} ${-h / 2}L${ax + 4} ${-h / 2 + 7}`} fill="none" stroke="#3a3645" strokeWidth={1.5} />
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
  actions: (t) => [
    action('add-fn', 'Fonksiyon ekle', 'plus', async (tile, api) => {
      const s = await api.prompt('Fonksiyon (ör. y = 2x + 1, y = a·x² + b)', 'y = ')
      if (s == null || !rhs(s).trim()) return
      if (!compile(rhs(s))) {
        api.sound('error')
        return
      }
      api.updateP(tile.id, (p) => ({ fns: [...(p.fns ?? []), s.trim()] }), true)
    }),
    action('add-pt', 'Nokta ekle', 'chart', async (tile, api) => {
      const s = await api.prompt('Nokta (x; y)', '2; 3')
      const m = s && /^\s*\(?\s*(-?[\d.,]+)\s*;\s*(-?[\d.,]+)\s*\)?\s*$/.exec(s)
      if (!m) return
      api.updateP(tile.id, (p) => ({ pts: [...(p.pts ?? []), { x: Number(m[1].replace(',', '.')), y: Number(m[2].replace(',', '.')) }] }), true)
    }),
    toggle(t, 'grid', 'Izgara', 'grid'),
    action('range', 'Eksen aralığı', 'ruler', async (tile, api) => {
      const { xmin, xmax, ymin, ymax } = tile.p
      const s = await api.prompt('Aralık: xmin; xmax; ymin; ymax', [xmin, xmax, ymin, ymax].map((v: number) => fmt(v, 4)).join('; '))
      if (!s) return
      const v = s.split(';').map((x) => Number(x.trim().replace(',', '.')))
      if (v.length !== 4 || !v.every(Number.isFinite) || v[0] >= v[1] || v[2] >= v[3]) return
      api.updateP(tile.id, { xmin: v[0], xmax: v[1], ymin: v[2], ymax: v[3] }, true)
    }),
    ...(t.p.fns?.length || t.p.pts?.length ? [action('clear', 'Grafikleri temizle', 'trash', (tile, api) => api.updateP(tile.id, { fns: [], pts: [] }, true))] : []),
  ],
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
  actions: (t) => {
    const { r, c } = tableSize(t)
    return [
      action('add-row', 'Satır ekle', 'plus', (tile, api) => api.updateP(tile.id, (p) => ({ rows: [...p.rows, p.rows[0].map(() => '')] }), true)),
      ...(r > 2 ? [action('del-row', 'Satır sil', 'minus', (tile: Tile, api: PadApi) => api.updateP(tile.id, (p) => ({ rows: p.rows.slice(0, -1) }), true))] : []),
      action('add-col', 'Sütun ekle', 'table', (tile, api) =>
        api.updateP(tile.id, (p) => ({ rows: p.rows.map((row: string[], i: number) => [...row, i === 0 ? String.fromCharCode(65 + row.length) : '']) }), true),
      ),
      ...(c > 1 ? [action('del-col', 'Sütun sil', 'split', (tile: Tile, api: PadApi) => api.updateP(tile.id, (p) => ({ rows: p.rows.map((row: string[]) => row.slice(0, -1)) }), true))] : []),
    ]
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
  actions: () => [
    action('range', 'En küçük; en büyük; adım', 'ruler', async (tile, api) => {
      const s = await api.prompt('En küçük; en büyük; adım', [tile.p.min, tile.p.max, tile.p.step].map((v: number) => fmt(v, 4)).join('; '))
      if (!s) return
      const v = s.split(';').map((x) => Number(x.trim().replace(',', '.')))
      if (v.length !== 3 || !v.every(Number.isFinite) || v[0] >= v[1] || v[2] < 0) return
      api.updateP(tile.id, (p) => ({ min: v[0], max: v[1], step: v[2], value: clamp(p.value, v[0], v[1]) }), true)
    }),
    action('name', 'Değişken adı', 'edit', async (tile, api) => {
      const s = await api.prompt('Değişken adı (tek harf)', tile.p.variable)
      const m = s && /^\s*([a-zA-Z])\s*$/.exec(s)
      if (m) api.updateP(tile.id, { variable: m[1] }, true)
    }),
  ],
}

export const algebraTiles: TileDef[] = [fractionBar, fractionCircle, algebra, token, balance, functionMachine, axes, table, slider]

