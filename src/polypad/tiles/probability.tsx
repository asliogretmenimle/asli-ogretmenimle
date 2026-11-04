import { useEffect, useRef, type ReactNode } from 'react'
import type { PadApi, Pt, Tile, TileDef } from '../types'
import { fmt, mod, pathOf, regularPolygon, shade, textOn, toWorld } from '../geom'
import { C, FONT, Label, UNIT, action, askNumber, edge, randInt, rectBox, toggle } from './kit'

// ---------------------------------------------------------------------------
// Ortak yardımcılar
// ---------------------------------------------------------------------------

/** k değişince çocuklarına bir kez Web Animations ile animasyon uygular (ilk çizimde oynamaz) */
function Anim({ k, frames, duration, children }: { k: number; frames: Keyframe[]; duration: number; children: ReactNode }) {
  const ref = useRef<SVGGElement>(null)
  const last = useRef(k)
  useEffect(() => {
    if (last.current === k) return
    last.current = k
    ref.current?.animate?.(frames, { duration, easing: 'ease-out' })
  }, [k, frames, duration])
  return <g ref={ref}>{children}</g>
}

const TUMBLE: Keyframe[] = [
  { transform: 'rotate(0deg) scale(1)' },
  { transform: 'rotate(160deg) scale(0.75)' },
  { transform: 'rotate(300deg) scale(0.9)' },
  { transform: 'rotate(360deg) scale(1)' },
]
const FLIP: Keyframe[] = [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }]
const FLIP1: Keyframe[] = [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }]
const POP: Keyframe[] = [{ transform: 'scale(0.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }]
const REVEAL: Keyframe[] = [{ opacity: 0 }, { opacity: 0, offset: 0.92 }, { opacity: 1 }]

const SPIN_MS = 2600
const SERIES_COLORS = [C.pink, C.blue, C.green, C.orange, C.purple, C.teal, C.yellow, C.red]
const SLICE_COLORS = [C.blue, C.green, C.pink, C.orange, C.purple, C.teal, C.yellow, C.red, C.lBlue, C.lGreen, C.lPink, C.lOrange]

/** Türkçe ondalık virgüllü sayı ayrıştırma */
const parseNum = (s: string) => {
  const n = Number(s.trim().replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
/** Boşluk ya da noktalı virgülle ayrılmış sayılar */
const parseNums = (s: string) =>
  s
    .split(/[\s;]+/)
    .filter(Boolean)
    .map(parseNum)
    .filter((n): n is number => n !== null)

function niceStep(range: number, count = 5) {
  const raw = range / count || 1
  const p = 10 ** Math.floor(Math.log10(raw))
  const m = raw / p
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p
}

/** Tepeden saat yönünde ölçülen açıyla çember noktası */
const polar = (r: number, a: number): Pt => ({ x: r * Math.sin((a * Math.PI) / 180), y: -r * Math.cos((a * Math.PI) / 180) })

function sectorPath(r: number, a0: number, a1: number, r0 = 0) {
  if (a1 - a0 >= 359.999) {
    const outer = `M${-r} 0A${r} ${r} 0 1 1 ${r} 0A${r} ${r} 0 1 1 ${-r} 0Z`
    return r0 ? `${outer}M${-r0} 0A${r0} ${r0} 0 1 0 ${r0} 0A${r0} ${r0} 0 1 0 ${-r0} 0Z` : outer
  }
  const p0 = polar(r, a0)
  const p1 = polar(r, a1)
  const large = a1 - a0 > 180 ? 1 : 0
  if (!r0) return `M0 0L${p0.x} ${p0.y}A${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y}Z`
  const q0 = polar(r0, a0)
  const q1 = polar(r0, a1)
  return `M${q0.x} ${q0.y}L${p0.x} ${p0.y}A${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y}L${q1.x} ${q1.y}A${r0} ${r0} 0 ${large} 0 ${q0.x} ${q0.y}Z`
}

const roller = (go: (t: Tile, api: PadApi) => void) => ({
  onTap: (t: Tile, api: PadApi) => go(t, api),
  actions: (_t: Tile, _api: PadApi) => [action('roll', 'Zar at', 'dice', go)],
})

// ---------------------------------------------------------------------------
// Zar
// ---------------------------------------------------------------------------

const DIE = UNIT * 1.8
const PIPS: [number, number][][] = [
  [[0, 0]],
  [[-1, -1], [1, 1]],
  [[-1, -1], [0, 0], [1, 1]],
  [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
]

const dieFaces = (t: Tile): number[] | null => {
  if (!t.p.faces) return null
  const f = String(t.p.faces)
    .split(',')
    .map((x) => Number(x.trim()))
    .filter(Number.isFinite)
  return f.length ? f : null
}

function DieFace({ t }: { t: Tile }) {
  const color = t.color ?? '#ffffff'
  const ink = textOn(color)
  const faces = dieFaces(t)
  const i = mod(t.p.i ?? 5, faces?.length ?? 6)
  const s = DIE
  const d = s * 0.27
  return (
    <>
      <rect x={-s / 2} y={-s / 2} width={s} height={s} rx={s * 0.18} fill={color} stroke={edge(color)} strokeWidth={1.5} />
      {faces ? (
        <Label size={faces[i] > 9 ? 22 : 28} color={ink} weight={800}>
          {faces[i]}
        </Label>
      ) : (
        PIPS[i].map(([x, y], k) => <circle key={k} cx={x * d} cy={y * d} r={s * 0.085} fill={ink} />)
      )}
    </>
  )
}

function rollDie(t: Tile, api: PadApi) {
  const n = dieFaces(t)?.length ?? 6
  api.updateP(t.id, (p) => ({ i: randInt(0, n - 1), roll: (p.roll ?? 0) + 1 }), true)
  api.sound('roll')
}

const dice: TileDef = {
  type: 'dice',
  name: (t) => (t.p.faces ? 'Özel zar' : 'Zar'),
  create: (p) => ({ color: p.color ?? '#ffffff', p: { color: undefined, i: 5, roll: 0 } }),
  bounds: () => rectBox(DIE, DIE),
  outline: () => [
    { x: -DIE / 2, y: -DIE / 2 },
    { x: DIE / 2, y: -DIE / 2 },
    { x: DIE / 2, y: DIE / 2 },
    { x: -DIE / 2, y: DIE / 2 },
  ],
  render: (t) => (
    <Anim k={t.p.roll ?? 0} frames={TUMBLE} duration={600}>
      <DieFace t={t} />
    </Anim>
  ),
  colorable: true,
  ...roller(rollDie),
}

// ---------------------------------------------------------------------------
// Madeni para
// ---------------------------------------------------------------------------

const COIN_R = UNIT * 1.15

function CoinFace({ heads }: { heads: boolean }) {
  const r = COIN_R
  const fill = heads ? '#f2c94c' : '#e0b43a'
  const ink = '#8a6512'
  return (
    <>
      <circle r={r} fill={fill} stroke={ink} strokeWidth={1.5} />
      <circle r={r * 0.82} fill="none" stroke={ink} strokeWidth={1} strokeDasharray="2 3" />
      {heads ? (
        <>
          <Label y={-4} size={22} color={ink} weight={900}>
            1
          </Label>
          <Label y={14} size={9} color={ink} weight={800}>
            YAZI
          </Label>
        </>
      ) : (
        <>
          <path d={pathOf(regularPolygon(5, r * 0.5).map((_, k, a) => a[(k * 2) % 5]))} fill={ink} transform="translate(0 -5)" />
          <Label y={16} size={9} color={ink} weight={800}>
            TURA
          </Label>
        </>
      )}
    </>
  )
}

function flipCoin(t: Tile, api: PadApi) {
  api.updateP(t.id, (p) => ({ side: Math.random() < 0.5 ? 'H' : 'T', roll: (p.roll ?? 0) + 1 }), true)
  api.sound('pop')
}

const coin: TileDef = {
  type: 'coin',
  name: (t) => `Madeni para (${t.p.side === 'T' ? 'tura' : 'yazı'})`,
  create: () => ({ p: { side: 'H', roll: 0 } }),
  bounds: () => rectBox(COIN_R * 2, COIN_R * 2),
  render: (t) => (
    <Anim k={t.p.roll ?? 0} frames={FLIP} duration={600}>
      <CoinFace heads={t.p.side !== 'T'} />
    </Anim>
  ),
  rotatable: false,
  onTap: flipCoin,
  actions: () => [action('flip', 'Parayı at', 'rotate', flipCoin)],
}

// ---------------------------------------------------------------------------
// Rastgele sayı üreteci
// ---------------------------------------------------------------------------

const RW = UNIT * 3.8
const RH = UNIT * 2.8

function generate(t: Tile, api: PadApi) {
  const lo = Math.min(t.p.min, t.p.max)
  const hi = Math.max(t.p.min, t.p.max)
  api.updateP(t.id, (p) => ({ value: randInt(lo, hi), n: (p.n ?? 0) + 1 }), true)
  api.sound('click')
}

async function editRange(t: Tile, api: PadApi, key: 'min' | 'max') {
  const v = await askNumber(api, key === 'min' ? 'En küçük sayı' : 'En büyük sayı', t.p[key], -1e6, 1e6)
  if (v != null) api.updateP(t.id, { [key]: Math.round(v) }, true)
}

const random: TileDef = {
  type: 'random',
  name: () => 'Rastgele sayı üreteci',
  create: () => ({ color: C.teal, p: { min: 1, max: 10, value: null, n: 0 } }),
  bounds: () => rectBox(RW, RH),
  render: (t) => {
    const color = t.color ?? C.teal
    const ink = textOn(color)
    const v = t.p.value
    return (
      <>
        <rect x={-RW / 2} y={-RH / 2} width={RW} height={RH} rx={10} fill={color} stroke={edge(color)} strokeWidth={1.5} />
        <rect x={-RW / 2 + 8} y={-RH / 2 + 8} width={RW - 16} height={RH * 0.56} rx={6} fill="#fff" />
        <Anim k={t.p.n ?? 0} frames={POP} duration={300}>
          <Label y={-RH / 2 + 8 + RH * 0.28} size={String(v ?? '?').length > 4 ? 20 : 30} weight={800}>
            {v == null ? '?' : fmt(v, 0)}
          </Label>
        </Anim>
        <rect data-act="min" x={-RW / 2 + 6} y={RH / 2 - 26} width={RW / 2 - 12} height={22} rx={5} fill="rgba(255,255,255,.18)" />
        <rect data-act="max" x={6} y={RH / 2 - 26} width={RW / 2 - 12} height={22} rx={5} fill="rgba(255,255,255,.18)" />
        <Label x={-RW / 4} y={RH / 2 - 15} size={13} color={ink}>
          {fmt(t.p.min, 0)}
        </Label>
        <Label y={RH / 2 - 15} size={13} color={ink}>
          –
        </Label>
        <Label x={RW / 4} y={RH / 2 - 15} size={13} color={ink}>
          {fmt(t.p.max, 0)}
        </Label>
      </>
    )
  },
  colorable: true,
  onTap: (t, api, info) => {
    if (info.act === 'min' || info.act === 'max') void editRange(t, api, info.act)
    else generate(t, api)
  },
  actions: () => [
    action('gen', 'Sayı üret', 'dice', generate),
    action('min', 'En küçük sayı', 'minus', (t, api) => void editRange(t, api, 'min')),
    action('max', 'En büyük sayı', 'plus', (t, api) => void editRange(t, api, 'max')),
  ],
}

// ---------------------------------------------------------------------------
// Çarklar
// ---------------------------------------------------------------------------

const SPIN_R = UNIT * 2.2

type Sector = { label: string; w: number }

const sectorsOf = (t: Tile): Sector[] =>
  t.type === 'spinner' ? Array.from({ length: t.p.n ?? 4 }, (_, i) => ({ label: String(i + 1), w: 1 })) : ((t.p.sectors as Sector[]) ?? [])

/** Her dilimin başlangıç ve bitiş açısı (tepeden saat yönünde) */
function sectorAngles(secs: Sector[]) {
  const total = secs.reduce((s, x) => s + Math.max(0, x.w), 0) || 1
  let a = 0
  return secs.map((s) => {
    const a0 = a
    a += (Math.max(0, s.w) / total) * 360
    return { a0, a1: a }
  })
}

function resultIndex(secs: Sector[], angle: number) {
  const a = mod(angle, 360)
  const ang = sectorAngles(secs)
  const i = ang.findIndex((x) => a >= x.a0 && a < x.a1)
  return i < 0 ? secs.length - 1 : i
}

function SpinnerView({ t, thumb }: { t: Tile; thumb?: boolean }) {
  const secs = sectorsOf(t)
  const ang = sectorAngles(secs)
  const r = SPIN_R
  const angle = t.p.angle ?? 0
  const spins = t.p.spins ?? 0
  const res = spins ? secs[resultIndex(secs, angle)] : null
  return (
    <>
      <circle r={r + 4} fill="#fff" stroke="#242436" strokeWidth={1.5} />
      {secs.map((s, i) => {
        const { a0, a1 } = ang[i]
        if (a1 - a0 <= 0) return null
        const m = polar(r * 0.66, (a0 + a1) / 2)
        const fill = SLICE_COLORS[i % SLICE_COLORS.length]
        return (
          <g key={i}>
            <path d={sectorPath(r, a0, a1)} fill={fill} stroke="#fff" strokeWidth={1.5} />
            {a1 - a0 > 12 && (
              <Label x={m.x} y={m.y} size={s.label.length > 3 ? 10 : 14} color={textOn(fill)} weight={800}>
                {s.label}
              </Label>
            )}
          </g>
        )
      })}
      <g style={{ transform: `rotate(${angle}deg)`, transition: thumb ? 'none' : `transform ${SPIN_MS}ms cubic-bezier(.12,.6,.15,1)` }}>
        <path d={`M0 ${-r * 0.86}L${r * 0.09} ${-r * 0.1}L${r * 0.05} ${r * 0.18}L${-r * 0.05} ${r * 0.18}L${-r * 0.09} ${-r * 0.1}Z`} fill="#242436" stroke="#fff" strokeWidth={1.5} strokeLinejoin="round" />
      </g>
      <circle r={r * 0.08} fill="#fff" stroke="#242436" strokeWidth={2} />
      {res && !thumb && (
        <Anim k={spins} frames={REVEAL} duration={SPIN_MS + 200}>
          <rect x={-34} y={r + 10} width={68} height={22} rx={11} fill="#242436" />
          <Label y={r + 21} size={12} color="#fff">
            {res.label}
          </Label>
        </Anim>
      )}
    </>
  )
}

function spin(t: Tile, api: PadApi) {
  const extra = 720 + Math.random() * 720
  api.updateP(t.id, (p) => ({ angle: (p.angle ?? 0) + extra, spins: (p.spins ?? 0) + 1 }), true)
  api.sound('click')
  window.setTimeout(() => api.sound('pop'), SPIN_MS)
}

const spinnerBounds = (t: Tile) => {
  const r = SPIN_R + 4
  const extra = (t.p.spins ?? 0) ? 30 : 0
  return { x: -r, y: -r, w: 2 * r, h: 2 * r + extra }
}

const spinner: TileDef = {
  type: 'spinner',
  name: (t) => `${t.p.n} eşit dilimli çark`,
  create: () => ({ p: { n: 4, angle: 0, spins: 0 } }),
  bounds: spinnerBounds,
  render: (t, ctx) => <SpinnerView t={t} thumb={ctx.thumb} />,
  onTap: spin,
  actions: () => [
    action('spin', 'Çevir', 'rotate', spin),
    action('fewer', 'Dilim sayısını azalt', 'minus', (t, api) => api.updateP(t.id, (p) => ({ n: Math.max(2, p.n - 1) }), true)),
    action('more', 'Dilim sayısını artır', 'plus', (t, api) => api.updateP(t.id, (p) => ({ n: Math.min(24, p.n + 1) }), true)),
  ],
}

async function editSectors(t: Tile, api: PadApi) {
  const secs = sectorsOf(t)
  const s = await api.prompt('Dilimler (etiket:ağırlık, virgülle ayırın)', secs.map((x) => `${x.label}:${fmt(x.w)}`).join(', '))
  if (s == null) return
  const next = s
    .split(',')
    .map((part) => {
      const [label, w] = part.split(':')
      const n = w == null ? 1 : parseNum(w)
      return { label: label.trim(), w: n == null ? 1 : Math.max(0, n) }
    })
    .filter((x) => x.label)
    .slice(0, 24)
  if (next.length) api.updateP(t.id, { sectors: next }, true)
}

const customSpinner: TileDef = {
  type: 'custom-spinner',
  name: () => 'Özel çark',
  create: () => ({
    p: {
      sectors: [
        { label: 'A', w: 1 },
        { label: 'B', w: 2 },
        { label: 'C', w: 3 },
      ],
      angle: 0,
      spins: 0,
    },
  }),
  bounds: spinnerBounds,
  render: (t, ctx) => <SpinnerView t={t} thumb={ctx.thumb} />,
  onTap: spin,
  actions: () => [
    action('spin', 'Çevir', 'rotate', spin),
    action('edit', 'Dilimleri düzenle', 'edit', (t, api) => void editSectors(t, api)),
    action('add', 'Dilim ekle', 'plus', (t, api) =>
      api.updateP(t.id, (p) => {
        const s = p.sectors as Sector[]
        return s.length >= 24 ? {} : { sectors: [...s, { label: String.fromCharCode(65 + (s.length % 26)), w: 1 }] }
      }, true),
    ),
    action('remove', 'Dilim sil', 'minus', (t, api) => api.updateP(t.id, (p) => ((p.sectors as Sector[]).length > 1 ? { sectors: (p.sectors as Sector[]).slice(0, -1) } : {}), true)),
  ],
}

// ---------------------------------------------------------------------------
// Grafikler
// ---------------------------------------------------------------------------

type Series = { name: string; color: string; values: number[] }
const KINDS = ['column', 'row', 'line', 'area'] as const
const KIND_NAME: Record<string, string> = { column: 'Sütun grafiği', row: 'Çubuk grafiği', line: 'Çizgi grafiği', area: 'Alan grafiği' }

function defaultSeries(kind: string): Series[] {
  if (kind === 'line')
    return [
      { name: 'A', color: C.pink, values: [3, 5, 6] },
      { name: 'B', color: C.blue, values: [6, 3, 8] },
    ]
  if (kind === 'area')
    return [
      { name: 'A', color: C.pink, values: [2, 3, 4] },
      { name: 'B', color: C.blue, values: [5, 3, 6] },
    ]
  return [
    { name: 'A', color: C.pink, values: [2, 4, 5] },
    { name: 'B', color: C.blue, values: [5, 3, 7] },
  ]
}

function ChartView({ t }: { t: Tile }) {
  const { w, h } = t.p as { w: number; h: number }
  const kind: string = t.p.kind ?? 'column'
  const stacked = t.p.layout === 'stacked'
  const series = (t.p.series as Series[]) ?? []
  const labels = (t.p.labels as string[]) ?? []
  const n = Math.max(1, ...series.map((s) => s.values.length), labels.length)
  const ml = 34
  const mr = 10
  const mt = 24
  const mb = 22
  const x0 = -w / 2 + ml
  const x1 = w / 2 - mr
  const y0 = -h / 2 + mt
  const y1 = h / 2 - mb
  const pw = x1 - x0
  const ph = y1 - y0
  const val = (s: Series, i: number) => Math.max(0, s.values[i] ?? 0)
  const sums = Array.from({ length: n }, (_, i) => series.reduce((a, s) => a + val(s, i), 0))
  const max = Math.max(1, ...(stacked ? sums : series.flatMap((s) => s.values.map((v) => Math.max(0, v)))))
  const step = niceStep(max, 5)
  const top = Math.ceil(max / step) * step
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)
  const horiz = kind === 'row'
  // Değer ekseni: dikeyde y, yatayda x
  const vy = (v: number) => y1 - (v / top) * ph
  const vx = (v: number) => x0 + (v / top) * pw
  const band = (horiz ? ph : pw) / n
  const out: ReactNode[] = []

  if (kind === 'column' || kind === 'row') {
    const k = stacked ? 1 : series.length || 1
    const bw = (band * 0.75) / k
    series.forEach((s, si) => {
      s.values.forEach((_, i) => {
        const v = val(s, i)
        const below = stacked ? series.slice(0, si).reduce((a, q) => a + val(q, i), 0) : 0
        const off = band * 0.125 + (stacked ? 0 : si * bw)
        if (horiz) {
          const y = y0 + i * band + off
          out.push(<rect key={`${si}-${i}`} x={vx(below)} y={y} width={vx(below + v) - vx(below)} height={bw} fill={s.color} />)
        } else {
          const x = x0 + i * band + off
          out.push(<rect key={`${si}-${i}`} x={x} y={vy(below + v)} width={bw} height={vy(below) - vy(below + v)} fill={s.color} />)
        }
      })
    })
  } else {
    const px = (i: number) => (kind === 'line' ? x0 + (i + 0.5) * band : x0 + (n > 1 ? (i / (n - 1)) * pw : pw / 2))
    const cum = Array(n).fill(0) as number[]
    series.forEach((s, si) => {
      const pts = Array.from({ length: n }, (_, i) => {
        const base = stacked ? cum[i] : 0
        return { x: px(i), y: vy(base + val(s, i)), b: vy(base) }
      })
      if (kind === 'area') {
        const d = `M${pts.map((p) => `${p.x} ${p.y}`).join('L')}L${pts
          .slice()
          .reverse()
          .map((p) => `${p.x} ${p.b}`)
          .join('L')}Z`
        out.push(<path key={si} d={d} fill={s.color} opacity={stacked ? 1 : 0.65} />)
        if (stacked) for (let i = 0; i < n; i++) cum[i] += val(s, i)
      } else {
        out.push(<path key={`l${si}`} d={`M${pts.map((p) => `${p.x} ${p.y}`).join('L')}`} fill="none" stroke={s.color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />)
        pts.forEach((p, i) => out.push(<circle key={`c${si}-${i}`} cx={p.x} cy={p.y} r={3.5} fill={s.color} />))
      }
    })
  }

  return (
    <>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={6} fill="#fff" stroke="#d5d6e0" />
      {ticks.map((v) =>
        horiz ? (
          <g key={v}>
            <path d={`M${vx(v)} ${y0}V${y1}`} stroke="#ececf2" />
            <Label x={vx(v)} y={y1 + 10} size={9} color="#5b6080">
              {fmt(v)}
            </Label>
          </g>
        ) : (
          <g key={v}>
            <path d={`M${x0} ${vy(v)}H${x1}`} stroke="#ececf2" />
            <Label x={x0 - 5} y={vy(v)} size={9} color="#5b6080" anchor="end">
              {fmt(v)}
            </Label>
          </g>
        ),
      )}
      {out}
      <path d={`M${x0} ${y0}V${y1}H${x1}`} fill="none" stroke="#242436" strokeWidth={1.5} />
      {Array.from({ length: n }, (_, i) => {
        const lab = labels[i] ?? String(i + 1)
        const c = (kind === 'area' ? (n > 1 ? (i / (n - 1)) * pw : pw / 2) : (i + 0.5) * band)
        return horiz ? (
          <Label key={`lab${i}`} x={x0 - 5} y={y0 + c} size={9} color="#242436" anchor="end">
            {lab}
          </Label>
        ) : (
          <Label key={`lab${i}`} x={x0 + c} y={y1 + 10} size={9} color="#242436">
            {lab}
          </Label>
        )
      })}
      <g>
        {series.map((s, i) => (
          <g key={i} transform={`translate(${x0 + i * 52} ${-h / 2 + 12})`}>
            <rect x={0} y={-5} width={10} height={10} rx={2} fill={s.color} />
            <Label x={14} size={10} anchor="start" color="#242436">
              {s.name}
            </Label>
          </g>
        ))}
      </g>
    </>
  )
}

async function editSeries(t: Tile, api: PadApi) {
  const series = (t.p.series as Series[]) ?? []
  const cur = series.map((s) => `${s.name}: ${s.values.map((v) => fmt(v)).join(' ')}`).join(' | ')
  const s = await api.prompt('Seriler (Ad: değerler boşlukla ayrılır; seriler | ile ayrılır)', cur)
  if (s == null) return
  const next: Series[] = s
    .split('|')
    .map((part, i) => {
      const [name, vals] = part.includes(':') ? part.split(':') : [`${String.fromCharCode(65 + i)}`, part]
      return { name: name.trim() || String.fromCharCode(65 + i), color: series[i]?.color ?? SERIES_COLORS[i % SERIES_COLORS.length], values: parseNums(vals ?? '') }
    })
    .filter((x) => x.values.length)
    .slice(0, 8)
  if (next.length) api.updateP(t.id, { series: next }, true)
}

async function editLabels(t: Tile, api: PadApi) {
  const s = await api.prompt('Kategori etiketleri (virgülle ayırın)', ((t.p.labels as string[]) ?? []).join(', '))
  if (s == null) return
  api.updateP(
    t.id,
    {
      labels: s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    },
    true,
  )
}

const chart: TileDef = {
  type: 'chart',
  name: (t) => KIND_NAME[t.p.kind ?? 'column'] ?? 'Grafik',
  create: (p) => {
    const kind = p.kind ?? 'column'
    return { p: { kind, layout: p.layout, w: UNIT * 8, h: UNIT * 6, series: defaultSeries(kind), labels: ['A', 'B', 'C'].map((_, i) => `${i + 1}`) } }
  },
  bounds: (t) => rectBox(t.p.w, t.p.h),
  render: (t) => <ChartView t={t} />,
  handles: (t) => [{ id: 'size', x: t.p.w / 2, y: t.p.h / 2 }],
  onHandle: (t, _id, l) => ({ p: { ...t.p, w: Math.max(150, Math.round(l.x * 2)), h: Math.max(110, Math.round(l.y * 2)) } }),
  rotatable: false,
  actions: (t) => [
    action('data', 'Veriyi düzenle', 'edit', (tile, api) => void editSeries(tile, api)),
    action('labels', 'Etiketleri düzenle', 'label', (tile, api) => void editLabels(tile, api)),
    action('kind', 'Grafik türünü değiştir', 'chart', (tile, api) =>
      api.updateP(tile.id, (p) => ({ kind: KINDS[(KINDS.indexOf(p.kind ?? 'column') + 1) % KINDS.length] }), true),
    ),
    action('stack', 'Yığılmış', 'table', (tile, api) => api.updateP(tile.id, (p) => ({ layout: p.layout === 'stacked' ? undefined : 'stacked' }), true), t.p.layout === 'stacked'),
    action('add', 'Seri ekle', 'plus', (tile, api) =>
      api.updateP(tile.id, (p) => {
        const s = p.series as Series[]
        if (s.length >= 8) return {}
        const len = Math.max(1, ...s.map((x) => x.values.length))
        return { series: [...s, { name: String.fromCharCode(65 + s.length), color: SERIES_COLORS[s.length % SERIES_COLORS.length], values: Array.from({ length: len }, () => randInt(1, 8)) }] }
      }, true),
    ),
  ],
}

// ---------------------------------------------------------------------------
// Daire grafiği
// ---------------------------------------------------------------------------

type Slice = { label: string; v: number }
const PIE_R = UNIT * 2
const LEGEND_W = 86

function pieSize(t: Tile) {
  const rows = ((t.p.data as Slice[]) ?? []).length
  return { w: PIE_R * 2 + 16 + LEGEND_W, h: Math.max(PIE_R * 2 + 8, rows * 18 + 8) }
}

function PieView({ t }: { t: Tile }) {
  const data = (t.p.data as Slice[]) ?? []
  const { w } = pieSize(t)
  const cx = -w / 2 + PIE_R + 4
  const total = data.reduce((s, d) => s + Math.max(0, d.v), 0) || 1
  const r0 = t.p.kind === 'donut' ? PIE_R * 0.5 : 0
  let a = 0
  return (
    <>
      <g transform={`translate(${cx} 0)`}>
        {data.map((d, i) => {
          const a0 = a
          a += (Math.max(0, d.v) / total) * 360
          const fill = SLICE_COLORS[i % SLICE_COLORS.length]
          const m = polar(r0 ? (PIE_R + r0) / 2 : PIE_R * 0.62, (a0 + a) / 2)
          const pct = (Math.max(0, d.v) / total) * 100
          return (
            <g key={i}>
              <path d={sectorPath(PIE_R, a0, a, r0)} fill={fill} stroke="#fff" strokeWidth={1.5} fillRule="evenodd" />
              {pct >= 6 && (
                <Label x={m.x} y={m.y} size={10} color={textOn(fill)} weight={800}>
                  %{fmt(pct, 0)}
                </Label>
              )}
            </g>
          )
        })}
      </g>
      {data.map((d, i) => {
        const y = (i - (data.length - 1) / 2) * 18
        const x = cx + PIE_R + 14
        return (
          <g key={`l${i}`}>
            <rect x={x} y={y - 5} width={10} height={10} rx={2} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
            <Label x={x + 14} y={y} size={10} anchor="start" color="#242436">
              {`${d.label} (${fmt(d.v)})`}
            </Label>
          </g>
        )
      })}
    </>
  )
}

async function editSlices(t: Tile, api: PadApi) {
  const data = (t.p.data as Slice[]) ?? []
  const s = await api.prompt('Dilimler (etiket: değer, | ile ayırın)', data.map((d) => `${d.label}: ${fmt(d.v)}`).join(' | '))
  if (s == null) return
  const next = s
    .split('|')
    .map((part, i) => {
      const [label, v] = part.includes(':') ? part.split(':') : [String.fromCharCode(65 + i), part]
      const n = parseNum(v ?? '')
      return { label: label.trim() || String.fromCharCode(65 + i), v: n == null ? 0 : Math.max(0, n) }
    })
    .filter((d) => d.v > 0 || d.label)
    .slice(0, 12)
  if (next.length) api.updateP(t.id, { data: next }, true)
}

const pieChart: TileDef = {
  type: 'pie-chart',
  name: (t) => (t.p.kind === 'donut' ? 'Halka grafiği' : 'Daire grafiği'),
  create: (p) => ({
    p: {
      kind: p.kind ?? 'pie',
      data: [
        { label: 'A', v: 5 },
        { label: 'B', v: 3 },
        { label: 'C', v: 2 },
      ],
    },
  }),
  bounds: (t) => {
    const s = pieSize(t)
    return rectBox(s.w, s.h)
  },
  render: (t) => <PieView t={t} />,
  rotatable: false,
  actions: () => [
    action('data', 'Veriyi düzenle', 'edit', (t, api) => void editSlices(t, api)),
    action('add', 'Dilim ekle', 'plus', (t, api) =>
      api.updateP(t.id, (p) => {
        const d = p.data as Slice[]
        return d.length >= 12 ? {} : { data: [...d, { label: String.fromCharCode(65 + d.length), v: randInt(1, 6) }] }
      }, true),
    ),
    action('remove', 'Dilim sil', 'minus', (t, api) => api.updateP(t.id, (p) => ((p.data as Slice[]).length > 1 ? { data: (p.data as Slice[]).slice(0, -1) } : {}), true)),
    action('kind', 'Daire / halka', 'chart', (t, api) => api.updateP(t.id, (p) => ({ kind: p.kind === 'donut' ? 'pie' : 'donut' }), true)),
  ],
}

// ---------------------------------------------------------------------------
// Kutu grafiği
// ---------------------------------------------------------------------------

const BW = UNIT * 8.5
const BH = UNIT * 3.6

const median = (s: number[]) => (s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0)

function fiveNumbers(data: number[]) {
  const s = data.slice().sort((a, b) => a - b)
  const half = Math.floor(s.length / 2)
  const lower = s.slice(0, half)
  const upper = s.slice(Math.ceil(s.length / 2))
  return { min: s[0] ?? 0, q1: median(lower.length ? lower : s), med: median(s), q3: median(upper.length ? upper : s), max: s[s.length - 1] ?? 0 }
}

function BoxView({ t }: { t: Tile }) {
  const data = ((t.p.data as number[]) ?? []).filter(Number.isFinite)
  const f = fiveNumbers(data)
  let lo = f.min
  let hi = f.max
  if (hi - lo < 1e-9) {
    lo -= 1
    hi += 1
  }
  const step = niceStep(hi - lo, 6)
  lo = Math.floor(lo / step) * step
  hi = Math.ceil(hi / step) * step
  const x0 = -BW / 2 + 16
  const x1 = BW / 2 - 16
  const X = (v: number) => x0 + ((v - lo) / (hi - lo)) * (x1 - x0)
  const ticks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step)
  const ay = BH / 2 - 26
  const by = -6
  const bh = 30
  const color = t.color ?? C.teal
  const counts = new Map<number, number>()
  return (
    <>
      <rect x={-BW / 2} y={-BH / 2} width={BW} height={BH} rx={6} fill="#fff" stroke="#d5d6e0" />
      {data.length > 0 && (
        <>
          <path d={`M${X(f.min)} ${by}H${X(f.q1)}M${X(f.q3)} ${by}H${X(f.max)}M${X(f.min)} ${by - 9}V${by + 9}M${X(f.max)} ${by - 9}V${by + 9}`} stroke="#242436" strokeWidth={2} />
          <rect x={X(f.q1)} y={by - bh / 2} width={Math.max(1, X(f.q3) - X(f.q1))} height={bh} fill={color} fillOpacity={0.35} stroke={edge(color)} strokeWidth={2} />
          <path d={`M${X(f.med)} ${by - bh / 2}V${by + bh / 2}`} stroke={edge(color)} strokeWidth={3} />
          {(
            [
              ['min', f.min],
              ['Q1', f.q1],
              ['ortanca', f.med],
              ['Q3', f.q3],
              ['max', f.max],
            ] as const
          ).map(([k, v], i) => (
            <Label key={k} x={X(v)} y={by - bh / 2 - (i % 2 ? 18 : 8)} size={9} color="#242436">
              {fmt(v)}
            </Label>
          ))}
        </>
      )}
      {t.p.dots &&
        data.map((v, i) => {
          const c = counts.get(v) ?? 0
          counts.set(v, c + 1)
          return <circle key={i} cx={X(v)} cy={ay - 5 - c * 6} r={2.5} fill="#242436" />
        })}
      <path d={`M${x0} ${ay}H${x1}`} stroke="#242436" strokeWidth={1.5} />
      {ticks.map((v) => (
        <g key={v}>
          <path d={`M${X(v)} ${ay}v5`} stroke="#242436" />
          <Label x={X(v)} y={ay + 13} size={9} color="#5b6080">
            {fmt(v)}
          </Label>
        </g>
      ))}
    </>
  )
}

async function editData(t: Tile, api: PadApi) {
  const s = await api.prompt('Veriler (boşlukla ayırın)', ((t.p.data as number[]) ?? []).map((v) => fmt(v)).join(' '))
  if (s == null) return
  const next = parseNums(s).slice(0, 500)
  if (next.length) api.updateP(t.id, { data: next }, true)
}

const boxWhisker: TileDef = {
  type: 'box-whisker',
  name: () => 'Kutu grafiği',
  create: () => ({ color: C.teal, p: { data: [2, 4, 5, 5, 7, 8, 9, 12, 13, 15], dots: false } }),
  bounds: () => rectBox(BW, BH),
  render: (t) => <BoxView t={t} />,
  colorable: true,
  rotatable: false,
  actions: (t) => [action('data', 'Veriyi düzenle', 'edit', (tile, api) => void editData(tile, api)), toggle(t, 'dots', 'Veri noktalarını göster', 'more')],
}

// ---------------------------------------------------------------------------
// Oyun kâğıtları
// ---------------------------------------------------------------------------

const CW = UNIT * 2.2
const CH = UNIT * 3.2
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'J', 'Q', 'K']
const SUITS = ['C', 'D', 'H', 'S']
const SUIT_SYM: Record<string, string> = { C: '♣', D: '♦', H: '♥', S: '♠' }
const SUIT_NAME: Record<string, string> = { C: 'Sinek', D: 'Karo', H: 'Kupa', S: 'Maça' }
const RANK_NAME: Record<string, string> = { A: 'As', J: 'Vale', Q: 'Kız', K: 'Papaz', '0': '10' }
const rankText = (r: string) => (r === '0' ? '10' : r === 'Q' ? 'K' : r === 'K' ? 'P' : r === 'J' ? 'V' : r)
const isRed = (s: string) => s === 'D' || s === 'H'

const PIP_LAYOUT: Record<string, [number, number][]> = {
  '2': [[0, -1], [0, 1]],
  '3': [[0, -1], [0, 0], [0, 1]],
  '4': [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  '5': [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  '6': [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  '7': [[-1, -1], [1, -1], [0, -0.5], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  '8': [[-1, -1], [1, -1], [0, -0.5], [-1, 0], [1, 0], [0, 0.5], [-1, 1], [1, 1]],
  '9': [[-1, -1], [1, -1], [-1, -1 / 3], [1, -1 / 3], [0, 0], [-1, 1 / 3], [1, 1 / 3], [-1, 1], [1, 1]],
  '0': [[-1, -1], [1, -1], [0, -2 / 3], [-1, -1 / 3], [1, -1 / 3], [-1, 1 / 3], [1, 1 / 3], [0, 2 / 3], [-1, 1], [1, 1]],
}

const fullDeck = () => SUITS.flatMap((s) => RANKS.map((r) => `${r}${s}`))
function shuffled<T>(a: T[]) {
  const b = a.slice()
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

function CardBack({ x = 0, y = 0 }: { x?: number; y?: number }) {
  const ix = -CW / 2 + 6
  const iy = -CH / 2 + 6
  const iw = CW - 12
  const ih = CH - 12
  const cols = 4
  const rows = 6
  const dw = iw / cols
  const dh = ih / rows
  let d = ''
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const cx = ix + (c + 0.5) * dw
      const cy = iy + (r + 0.5) * dh
      d += `M${cx} ${cy - dh * 0.4}L${cx + dw * 0.4} ${cy}L${cx} ${cy + dh * 0.4}L${cx - dw * 0.4} ${cy}Z`
    }
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-CW / 2} y={-CH / 2} width={CW} height={CH} rx={7} fill="#fff" stroke="#9a9cad" strokeWidth={1} />
      <rect x={ix} y={iy} width={iw} height={ih} rx={4} fill={C.dBlue} />
      <path d={d} fill={C.blue} />
    </g>
  )
}

function CardFace({ code }: { code: string }) {
  const outer = <rect x={-CW / 2} y={-CH / 2} width={CW} height={CH} rx={7} fill="#fff" stroke="#9a9cad" strokeWidth={1} />
  if (code === 'JJ')
    return (
      <>
        {outer}
        <Label y={-6} size={38} color={C.purple}>
          ★
        </Label>
        <Label y={26} size={11} color={C.purple} weight={900}>
          JOKER
        </Label>
        <Label x={-CW / 2 + 9} y={-CH / 2 + 12} size={10} color={C.purple}>
          ★
        </Label>
        <Label x={CW / 2 - 9} y={CH / 2 - 12} size={10} color={C.purple}>
          ★
        </Label>
      </>
    )
  const r = code[0]
  const s = code[1]
  const ink = isRed(s) ? '#d22d2d' : '#242436'
  const sym = SUIT_SYM[s] ?? '♣'
  const corner = (flip: boolean) => (
    <g transform={flip ? 'rotate(180)' : undefined}>
      <Label x={-CW / 2 + 9} y={-CH / 2 + 11} size={r === '0' ? 11 : 13} color={ink} weight={800}>
        {rankText(r)}
      </Label>
      <Label x={-CW / 2 + 9} y={-CH / 2 + 25} size={11} color={ink}>
        {sym}
      </Label>
    </g>
  )
  let center: ReactNode
  if (PIP_LAYOUT[r])
    center = PIP_LAYOUT[r].map(([x, y], i) => (
      <Label key={i} x={x * CW * 0.2} y={y * CH * 0.3} size={15} color={ink}>
        {sym}
      </Label>
    ))
  else if (r === 'A')
    center = (
      <Label size={44} color={ink}>
        {sym}
      </Label>
    )
  else
    center = (
      <>
        <rect x={-CW / 2 + 17} y={-CH / 2 + 17} width={CW - 34} height={CH - 34} rx={4} fill="none" stroke={ink} strokeOpacity={0.4} />
        <Label y={-8} size={30} color={ink} weight={900}>
          {rankText(r)}
        </Label>
        <Label y={20} size={18} color={ink}>
          {sym}
        </Label>
      </>
    )
  return (
    <>
      {outer}
      {corner(false)}
      {corner(true)}
      {center}
    </>
  )
}

function drawCard(t: Tile, api: PadApi) {
  const order = (t.p.order as string[]) ?? []
  if (!order.length) {
    api.sound('error')
    return
  }
  const [top, ...rest] = order
  const drawn = 52 - rest.length
  const pos = toWorld(t, { x: CW + 18 + ((drawn - 1) % 6) * 10, y: ((drawn - 1) % 6) * 6 })
  api.updateP(t.id, { order: rest })
  api.add([{ type: 'card', x: pos.x, y: pos.y, rot: t.rot, p: { cards: top, n: 0 } }], false)
  api.sound('click')
}

function flipCard(t: Tile, api: PadApi) {
  api.updateP(t.id, (p) => ({ down: !p.down, n: (p.n ?? 0) + 1 }), true)
  api.sound('click')
}

function cycleCard(t: Tile, api: PadApi, what: 'suit' | 'rank', dir: number) {
  const code: string = t.p.cards
  if (code.length !== 2 || code === 'JJ') return
  const r = RANKS.indexOf(code[0])
  const s = SUITS.indexOf(code[1])
  const next = what === 'rank' ? `${RANKS[mod(r + dir, 13)]}${code[1]}` : `${code[0]}${SUITS[mod(s + dir, 4)]}`
  api.updateP(t.id, { cards: next }, true)
}

const card: TileDef = {
  type: 'card',
  name: (t) => {
    const c: string = t.p.cards
    if (c === 'deck') return `Deste (${(t.p.order ?? []).length} kart)`
    if (c === 'JJ') return 'Joker'
    return `${SUIT_NAME[c[1]] ?? ''} ${RANK_NAME[c[0]] ?? c[0]}`
  },
  create: (p) => (p.cards === 'deck' ? { p: { cards: 'deck', order: shuffled(fullDeck()) } } : { p: { cards: p.cards ?? 'AS', n: 0 } }),
  bounds: (t) => (t.p.cards === 'deck' ? { x: -CW / 2 - 6, y: -CH / 2 - 6, w: CW + 6, h: CH + 6 } : rectBox(CW, CH)),
  outline: () => [
    { x: -CW / 2, y: -CH / 2 },
    { x: CW / 2, y: -CH / 2 },
    { x: CW / 2, y: CH / 2 },
    { x: -CW / 2, y: CH / 2 },
  ],
  edgeSnap: false,
  render: (t) => {
    if (t.p.cards === 'deck') {
      const left = ((t.p.order as string[]) ?? []).length
      if (!left)
        return (
          <>
            <rect x={-CW / 2} y={-CH / 2} width={CW} height={CH} rx={7} fill="rgba(0,0,0,.03)" stroke="#9a9cad" strokeDasharray="5 4" />
            <Label size={12} color="#5b6080">
              Boş
            </Label>
          </>
        )
      return (
        <>
          {left > 2 && <CardBack x={-6} y={-6} />}
          {left > 1 && <CardBack x={-3} y={-3} />}
          <CardBack />
          <circle cx={CW / 2 - 4} cy={CH / 2 - 4} r={12} fill="#242436" />
          <Label x={CW / 2 - 4} y={CH / 2 - 4} size={10} color="#fff">
            {left}
          </Label>
        </>
      )
    }
    return <Anim k={t.p.n ?? 0} frames={FLIP1} duration={300}>{t.p.down ? <CardBack /> : <CardFace code={t.p.cards} />}</Anim>
  },
  onTap: (t, api) => (t.p.cards === 'deck' ? drawCard(t, api) : flipCard(t, api)),
  actions: (t) => {
    if (t.p.cards === 'deck')
      return [
        action('draw', 'Kart çek', 'arrowR', drawCard),
        action('shuffle', 'Karıştır (desteyi tamamla)', 'shuffle', (tile, api) => {
          api.updateP(tile.id, { order: shuffled(fullDeck()) }, true)
          api.sound('roll')
        }),
      ]
    const out = [action('flip', 'Kartı çevir', 'flipH', flipCard, !!t.p.down)]
    if (t.p.cards !== 'JJ')
      out.push(
        action('suit', 'Takımı değiştir', 'shuffle', (tile, api) => cycleCard(tile, api, 'suit', 1)),
        action('down', 'Değeri azalt', 'minus', (tile, api) => cycleCard(tile, api, 'rank', -1)),
        action('up', 'Değeri artır', 'plus', (tile, api) => cycleCard(tile, api, 'rank', 1)),
      )
    return out
  },
}

// ---------------------------------------------------------------------------
// Çokyüzlü zarlar
// ---------------------------------------------------------------------------

const PD_COLORS: Record<number, string> = { 4: C.red, 6: C.orange, 8: C.yellow, 10: C.green, 12: C.blue, 20: C.purple }

const poly = (n: number, r: number, rot = 0): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = ((rot + (360 * i) / n) * Math.PI) / 180
    return { x: r * Math.sin(a), y: -r * Math.cos(a) }
  })

/** Dış görünüm ve ön yüz çokgenleri */
function pdShape(n: number): { outer: Pt[]; face: Pt[] } {
  switch (n) {
    case 4: {
      const o = poly(3, 42)
      return { outer: o, face: o }
    }
    case 6:
      return { outer: poly(4, 40, 45), face: poly(4, 27, 45) }
    case 8:
      return { outer: poly(6, 40, 30), face: poly(3, 31) }
    case 10:
      return {
        outer: [
          { x: 0, y: -42 },
          { x: 37, y: -4 },
          { x: 31, y: 16 },
          { x: 0, y: 40 },
          { x: -31, y: 16 },
          { x: -37, y: -4 },
        ],
        face: [
          { x: 0, y: -30 },
          { x: 21, y: -1 },
          { x: 0, y: 22 },
          { x: -21, y: -1 },
        ],
      }
    case 12:
      return { outer: poly(10, 40), face: poly(5, 24) }
    default:
      return { outer: poly(6, 41, 30), face: poly(3, 27) }
  }
}

const nearest = (p: Pt, pts: Pt[]) => pts.reduce((b, q) => (Math.hypot(q.x - p.x, q.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y) ? q : b))

function PolyDie({ t }: { t: Tile }) {
  const n: number = t.p.faceCount ?? 4
  const color = t.color ?? PD_COLORS[n] ?? C.red
  const { outer, face } = pdShape(n)
  const ink = textOn(color)
  const value: number = t.p.value ?? n
  const dark = shade(color, -0.22)
  const light = shade(color, 0.12)
  let lines = ''
  if (n === 4) lines = outer.map((p) => `M0 0L${p.x} ${p.y}`).join('')
  else lines = outer.map((p) => { const q = nearest(p, face); return `M${p.x} ${p.y}L${q.x} ${q.y}` }).join('')
  const txt = String(value)
  return (
    <>
      <path d={pathOf(outer)} fill={dark} stroke={edge(color)} strokeWidth={1.5} strokeLinejoin="round" />
      {n !== 4 && <path d={pathOf(face)} fill={light} stroke={edge(color)} strokeWidth={1} strokeLinejoin="round" />}
      {n === 4 && <path d={`M0 0L${outer[1].x} ${outer[1].y}L${outer[2].x} ${outer[2].y}Z`} fill={light} />}
      <path d={lines} stroke={edge(color)} strokeWidth={1} fill="none" />
      <text
        x={0}
        y={n === 4 ? 14 : n === 8 || n === 20 ? 4 : 0}
        fontSize={txt.length > 1 ? 15 : 18}
        fontWeight={800}
        fill={ink}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={FONT}
        textDecoration={value === 6 || value === 9 ? 'underline' : undefined}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {txt}
      </text>
    </>
  )
}

function rollPoly(t: Tile, api: PadApi) {
  const n: number = t.p.faceCount ?? 4
  api.updateP(t.id, (p) => ({ value: randInt(1, n), roll: (p.roll ?? 0) + 1 }), true)
  api.sound('roll')
}

const polyhedralDice: TileDef = {
  type: 'polyhedral-dice',
  name: (t) => `${t.p.faceCount ?? 4} yüzlü zar`,
  create: (p) => {
    const n = [4, 6, 8, 10, 12, 20].includes(p.faceCount) ? p.faceCount : 4
    return { color: PD_COLORS[n], p: { faceCount: n, value: n, roll: 0 } }
  },
  bounds: (t) => {
    const o = pdShape(t.p.faceCount ?? 4).outer
    const xs = o.map((p) => p.x)
    const ys = o.map((p) => p.y)
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
  },
  outline: (t) => pdShape(t.p.faceCount ?? 4).outer,
  edgeSnap: false,
  render: (t) => (
    <Anim k={t.p.roll ?? 0} frames={TUMBLE} duration={650}>
      <PolyDie t={t} />
    </Anim>
  ),
  colorable: true,
  ...roller(rollPoly),
}

export const probabilityTiles: TileDef[] = [dice, coin, random, spinner, customSpinner, chart, pieChart, boxWhisker, card, polyhedralDice]
