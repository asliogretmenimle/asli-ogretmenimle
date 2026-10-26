import { DragPoint, Plane, usePlane } from '../../interactive/Plane'

/**
 * Grafik Hikâyeleri (61) ve Grafik Çiz ve Anlat (62) için ortak grafik altyapısı:
 *  - Parçalı doğrusal zaman grafikleri (nokta dizisi), parça/evre çözümlemesi
 *  - Nitel özelliklere göre denetim (yükselen/düz/inen sırası, görece diklik, başlangıç/bitiş, sayısal kontrol noktaları)
 *  - Plane üzerinde çizim/düzenleme (bağımsız y ölçeği) ve küçük önizleme grafikleri
 */

export type Pt = { x: number; y: number }
export type Kind = 'up' | 'flat' | 'down'

export interface Axes {
  xMax: number
  yMax: number
  /** Yapışma adımları */
  xStep: number
  yStep: number
  /** x ızgara aralığı (çizgiler) */
  xGrid?: number
  xLabel: string
  yLabel: string
  /** Sayılar gösterilsin mi (7–8) */
  numbers: boolean
}

export const ARROW: Record<Kind, string> = { up: '↗', flat: '→', down: '↘' }

const r6 = (v: number) => Math.round(v * 1e6) / 1e6
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export function snapPt(p: Pt, a: Axes): Pt {
  return { x: r6(clamp(Math.round(p.x / a.xStep) * a.xStep, 0, a.xMax)), y: r6(clamp(Math.round(p.y / a.yStep) * a.yStep, 0, a.yMax)) }
}

export interface Seg { i: number; a: Pt; b: Pt; kind: Kind; slope: number }

export function segs(pts: Pt[], a?: Axes): Seg[] {
  const tol = a ? a.yStep * 0.25 : 1e-6
  const out: Seg[] = []
  for (let i = 0; i + 1 < pts.length; i++) {
    const p = pts[i], q = pts[i + 1]
    const dy = q.y - p.y
    const dx = q.x - p.x || 1e-9
    out.push({ i, a: p, b: q, kind: Math.abs(dy) <= tol ? 'flat' : dy > 0 ? 'up' : 'down', slope: dy / dx })
  }
  return out
}

/** Ardışık aynı türden parçaları birleştiren evreler */
export interface Group { kind: Kind; from: number; to: number; slope: number; segs: Seg[] }

export function groups(pts: Pt[], a?: Axes): Group[] {
  const out: Group[] = []
  for (const s of segs(pts, a)) {
    const last = out[out.length - 1]
    if (last && last.kind === s.kind) {
      last.to = s.i
      last.segs.push(s)
    } else out.push({ kind: s.kind, from: s.i, to: s.i, slope: 0, segs: [s] })
  }
  for (const g of out) {
    const p = g.segs[0].a, q = g.segs[g.segs.length - 1].b
    g.slope = (q.y - p.y) / (q.x - p.x || 1e-9)
  }
  return out
}

/** Grafiğin x’teki değeri (doğrusal ara değer) */
export function evalAt(pts: Pt[], x: number): number | null {
  for (let i = 0; i + 1 < pts.length; i++) {
    const p = pts[i], q = pts[i + 1]
    if (x >= p.x - 1e-9 && x <= q.x + 1e-9) return q.x === p.x ? q.y : p.y + ((x - p.x) / (q.x - p.x)) * (q.y - p.y)
  }
  return null
}

/** Aynı yöndeki parçalar arasında belirgin hız farkı varsa yavaş/hızlı etiketi */
export function speedOf(all: Seg[], s: Seg): 'slow' | 'fast' | null {
  if (s.kind === 'flat') return null
  const same = all.filter((t) => t.kind === s.kind).map((t) => Math.abs(t.slope))
  const mx = Math.max(...same), mn = Math.min(...same)
  if (same.length < 2 || mx / mn < 1.8) return null
  return Math.abs(s.slope) >= Math.sqrt(mx * mn) ? 'fast' : 'slow'
}

/** Normalleştirilmiş uzaklıkla dokunulan noktaya en yakın parça */
export function nearestSeg(pts: Pt[], p: Pt, a: Axes, aspect = 0.62): { i: number; d: number } | null {
  let best: { i: number; d: number } | null = null
  const nx = (x: number) => x / a.xMax, ny = (y: number) => (y / a.yMax) * aspect
  for (let i = 0; i + 1 < pts.length; i++) {
    const ax = nx(pts[i].x), ay = ny(pts[i].y), bx = nx(pts[i + 1].x), by = ny(pts[i + 1].y)
    const px = nx(p.x), py = ny(p.y)
    const vx = bx - ax, vy = by - ay
    const t = clamp(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy || 1e-9), 0, 1)
    const d = Math.hypot(px - (ax + t * vx), py - (ay + t * vy))
    if (!best || d < best.d) best = { i, d }
  }
  return best
}

/* ───────────────────────── denetim ───────────────────────── */

export interface PhaseSpec {
  kind: Kind
  /** decel: başta dik sonra yatık (soğuma); accel: tersi */
  shape?: 'decel' | 'accel'
  /** Evre eksik/yanlışsa sorulacak soru */
  q: string
  shapeQ?: string
  shapeMis?: string
}

export interface Spec {
  phases: PhaseSpec[]
  /** Sonda ek olarak izin verilen evre (ör. dolduktan sonra düz) */
  optionalEnd?: Kind
  start?: { y?: number; tol?: number; min?: number; q: string; mis?: string }
  end?: { y?: number; tol?: number; min?: number; q: string; mis?: string }
  /** a evresi b evresinden daha dik (mutlak eğim) */
  faster?: { a: number; b: number; q: string; mis?: string }[]
  /** Sayısal kontrol noktaları (7–8) */
  checkpoints?: { x: number; y: number; tol?: number; q: string; mis?: string }[]
  /** Hiçbir nokta bunun altına inmez */
  floor?: { y: number; q: string; mis?: string }
  /** Son nokta en az bu x’e ulaşmalı */
  minX?: { x: number; q: string }
}

export interface Verdict { ok: boolean; q?: string; mis?: string; groups: Group[]; offset: number }

export function checkSketch(pts: Pt[], spec: Spec, a: Axes): Verdict {
  const fail = (q: string, mis?: string): Verdict => ({ ok: false, q, mis, groups: [], offset: 0 })
  if (pts.length < 2) return fail('Grafiği çizmek için düzleme dokunarak en az iki nokta koy.')
  const first = pts[0]
  if (first.x > a.xStep * 0.5) return fail('Hikâye zamanın en başında başlıyor. Grafiğin ilk noktası y ekseninin üzerinde (zaman = 0) mı?')
  if (spec.start) {
    const s = spec.start
    if (s.y !== undefined && Math.abs(first.y - s.y) > (s.tol ?? a.yStep * 0.5)) return fail(s.q, s.mis)
    if (s.min !== undefined && first.y < s.min) return fail(s.q, s.mis)
  }
  if (spec.floor && pts.some((p) => p.y < spec.floor!.y - 1e-9)) return fail(spec.floor.q, spec.floor.mis)
  let g = groups(pts, a)
  if (spec.optionalEnd && g.length === spec.phases.length + 1 && g[g.length - 1].kind === spec.optionalEnd) g = g.slice(0, -1)
  const want = spec.phases
  for (let i = 0; i < want.length; i++) {
    if (!g[i] || g[i].kind !== want[i].kind) return fail(want[i].q)
  }
  if (g.length > want.length) {
    const extra = g[want.length]
    return fail(
      extra.kind === 'flat'
        ? 'Hikâyede olmayan bir düz parça var gibi. Hikâyeyi parça parça oku: grafiğin her parçası hikâyede neye karşılık geliyor?'
        : extra.kind === 'up'
          ? 'Grafiğin sonunda bir yükselme daha var. Hikâyenin sonunda gerçekten artış var mı?'
          : 'Grafiğin sonunda bir iniş daha var. Hikâyenin sonunda gerçekten azalma var mı?',
    )
  }
  for (let i = 0; i < want.length; i++) {
    const w = want[i]
    if (!w.shape) continue
    const ss = g[i].segs
    const s0 = Math.abs(ss[0].slope), s1 = Math.abs(ss[ss.length - 1].slope)
    const ok = ss.length >= 2 && (w.shape === 'decel' ? s0 > s1 * 1.3 : s1 > s0 * 1.3)
    if (!ok) return fail(w.shapeQ ?? w.q, w.shapeMis)
  }
  for (const f of spec.faster ?? []) if (Math.abs(g[f.a].slope) <= Math.abs(g[f.b].slope) * 1.15) return fail(f.q, f.mis)
  if (spec.end) {
    const e = spec.end, last = pts[pts.length - 1]
    if (e.y !== undefined && Math.abs(last.y - e.y) > (e.tol ?? a.yStep * 0.5)) return fail(e.q, e.mis)
    if (e.min !== undefined && last.y < e.min) return fail(e.q, e.mis)
  }
  if (spec.minX && pts[pts.length - 1].x < spec.minX.x - 1e-9) return fail(spec.minX.q)
  for (const c of spec.checkpoints ?? []) {
    const v = evalAt(pts, c.x)
    if (v === null || Math.abs(v - c.y) > (c.tol ?? a.yStep * 0.5)) return fail(c.q, c.mis)
  }
  return { ok: true, groups: g, offset: 0 }
}

/* ───────────────────────── Plane üzerinde grafik ───────────────────────── */

export const LINE = '#7c3aed'
export const HI = '#f59e0b'

export interface Ghost { pts: Pt[]; color: string; label?: string; dashed?: boolean }

export interface GraphPlaneProps {
  axes: Axes
  pts: Pt[]
  onChange?: (pts: Pt[]) => void
  /** sketch: dokununca nokta ekle; edit: yalnız sürükle; view: salt okunur; pick: dokunulan yeri bildir */
  mode: 'sketch' | 'edit' | 'view' | 'pick'
  sel?: number | null
  onSel?: (i: number | null) => void
  onPick?: (p: Pt) => void
  /** Vurgulanan parça aralığı (parça indisleri, dahil) */
  highlight?: [number, number] | null
  /** Parça numaraları */
  segLabels?: boolean
  ghosts?: Ghost[]
  pins?: { p: Pt; label: string }[]
  lockX?: boolean
  color?: string
  /** Yükseklik/genişlik */
  aspect?: number
  label?: string
  marks?: { i: number; tone: 'ok' | 'bad' }[]
}

export function GraphPlane(props: GraphPlaneProps) {
  const { axes: a, aspect = 0.62, mode, label } = props
  const initial = { xMin: -a.xMax * 0.075, xMax: a.xMax * 1.05, yMin: -a.yMax * 0.24, yMax: a.yMax * 1.1 }
  const add = (raw: Pt) => {
    if (mode === 'pick') return props.onPick?.(raw)
    if (mode !== 'sketch' || !props.onChange) return
    if (raw.x < -a.xMax * 0.03 || raw.y < -a.yMax * 0.04 || raw.x > a.xMax * 1.02 || raw.y > a.yMax * 1.03) return
    const p = snapPt(raw, a)
    const pts = props.pts.slice()
    const at = pts.findIndex((q) => Math.abs(q.x - p.x) < 1e-9)
    if (at >= 0) {
      pts[at] = p
      props.onChange(pts)
      props.onSel?.(at)
      return
    }
    pts.push(p)
    pts.sort((u, v) => u.x - v.x)
    props.onChange(pts)
    props.onSel?.(pts.indexOf(p))
  }
  return (
    <div data-testid="graph">
      <Plane
        initial={initial}
        aspect={aspect}
        equalUnits={false}
        labels={a.numbers}
        xLabel={a.xLabel}
        yLabel={a.yLabel}
        fixedStep={a.xGrid ?? a.xStep}
        minSpan={a.xMax * 0.15}
        maxSpan={a.xMax * 3}
        onTap={mode === 'sketch' || mode === 'pick' ? add : undefined}
        label={label ?? 'Zaman grafiği'}
      >
        <Layer {...props} />
      </Plane>
    </div>
  )
}

function Layer({ axes: a, pts, onChange, mode, sel, onSel, highlight, segLabels, ghosts, pins, lockX, color = LINE, marks }: GraphPlaneProps) {
  const P = usePlane()
  const path = (ps: Pt[]) => ps.map((p, i) => `${i ? 'L' : 'M'}${P.sx(p.x).toFixed(1)} ${P.sy(p.y).toFixed(1)}`).join(' ')
  const editable = (mode === 'sketch' || mode === 'edit') && !!onChange
  const move = (i: number, raw: Pt) => {
    if (!onChange) return
    const s = snapPt(raw, a)
    const prev = pts[i - 1], next = pts[i + 1]
    let x = lockX ? pts[i].x : s.x
    if (prev) x = Math.max(x, r6(prev.x + a.xStep))
    if (next) x = Math.min(x, r6(next.x - a.xStep))
    if (x === pts[i].x && s.y === pts[i].y) return
    const out = pts.slice()
    out[i] = { x, y: s.y }
    onChange(out)
    onSel?.(i)
  }
  return (
    <g>
      {/* eksen okları */}
      <path d={`M${P.sx(0) - 5} ${P.sy(a.yMax * 1.08) + 9} L${P.sx(0)} ${P.sy(a.yMax * 1.08)} L${P.sx(0) + 5} ${P.sy(a.yMax * 1.08) + 9}`} fill="none" stroke="#1f2340" strokeWidth={1.8} />
      {ghosts?.map((g, k) => (
        <g key={k}>
          <path d={path(g.pts)} fill="none" stroke={g.color} strokeWidth={3.5} strokeDasharray={g.dashed === false ? undefined : '8 6'} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
          {g.label && g.pts.length > 0 && <text x={P.sx(g.pts[g.pts.length - 1].x) + 6} y={P.sy(g.pts[g.pts.length - 1].y) - 6} fontSize={12} fontWeight={900} fill={g.color}>{g.label}</text>}
        </g>
      ))}
      {pins?.map((pin, k) => (
        <g key={k}>
          <circle cx={P.sx(pin.p.x)} cy={P.sy(pin.p.y)} r={13} fill="none" stroke="#0ea5e9" strokeWidth={3} strokeDasharray="4 3" />
          <text x={P.sx(pin.p.x) + (pin.p.x > a.xMax * 0.7 ? -16 : 16)} y={P.sy(pin.p.y) - 14} textAnchor={pin.p.x > a.xMax * 0.7 ? 'end' : 'start'} fontSize={12} fontWeight={900} fill="#0369a1">{pin.label}</text>
        </g>
      ))}
      {pts.length > 1 && <path d={path(pts)} fill="none" stroke={color} strokeWidth={4.5} strokeLinejoin="round" strokeLinecap="round" />}
      {marks?.map((m) => pts[m.i + 1] && (
        <path key={`m${m.i}`} d={path([pts[m.i], pts[m.i + 1]])} fill="none" stroke={m.tone === 'ok' ? '#16a34a' : '#e11d48'} strokeWidth={7} strokeLinecap="round" opacity={0.75} />
      ))}
      {highlight && pts.length > 1 && (
        <path d={path(pts.slice(highlight[0], highlight[1] + 2))} fill="none" stroke={HI} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
      )}
      {segLabels && pts.slice(1).map((q, i) => {
        const p = pts[i]
        const mx = (P.sx(p.x) + P.sx(q.x)) / 2, my = (P.sy(p.y) + P.sy(q.y)) / 2
        const on = highlight && i >= highlight[0] && i <= highlight[1]
        return (
          <g key={`l${i}`}>
            <circle cx={mx} cy={my - 18} r={11} fill={on ? HI : '#fff'} stroke={on ? HI : color} strokeWidth={2} />
            <text x={mx} y={my - 14} textAnchor="middle" fontSize={12} fontWeight={900} fill={on ? '#fff' : color}>{i + 1}</text>
          </g>
        )
      })}
      {pts.map((p, i) =>
        editable ? (
          <DragPoint key={i} x={p.x} y={p.y} r={sel === i ? 12 : 10} color={sel === i ? '#db2777' : color} onChange={(q) => move(i, q)} />
        ) : (
          <circle key={i} cx={P.sx(p.x)} cy={P.sy(p.y)} r={5} fill={color} stroke="#fff" strokeWidth={2} />
        ),
      )}
    </g>
  )
}

/* ───────────────────────── küçük önizleme ───────────────────────── */

export function MiniGraph({ pts, xMax, yMax, xLabel = 'zaman', yLabel, xTicks, yTicks, color = LINE, height = 110 }: { pts: Pt[]; xMax: number; yMax: number; xLabel?: string; yLabel?: string; xTicks?: number[]; yTicks?: number[]; color?: string; height?: number }) {
  const W = 200, H = 120
  const L = yTicks ? 34 : 14, B = xTicks ? 24 : 16, T = 14, R = 10
  const sx = (x: number) => L + (x / xMax) * (W - L - R)
  const sy = (y: number) => H - B - (y / yMax) * (H - B - T)
  const fmt = (v: number) => v.toLocaleString('tr-TR')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block h-auto w-full" style={{ maxHeight: height }} aria-hidden>
      {yTicks?.map((t) => <line key={`gy${t}`} x1={L} x2={W - R} y1={sy(t)} y2={sy(t)} stroke="#eef0f6" />)}
      {xTicks?.map((t) => <line key={`gx${t}`} y1={T} y2={H - B} x1={sx(t)} x2={sx(t)} stroke="#eef0f6" />)}
      <line x1={L} y1={H - B} x2={W - R + 4} y2={H - B} stroke="#1f2340" strokeWidth={1.6} />
      <line x1={L} y1={H - B} x2={L} y2={T - 6} stroke="#1f2340" strokeWidth={1.6} />
      <path d={`M${W - R} ${H - B - 4} L${W - R + 5} ${H - B} L${W - R} ${H - B + 4}`} fill="none" stroke="#1f2340" strokeWidth={1.4} />
      <path d={`M${L - 4} ${T - 1} L${L} ${T - 7} L${L + 4} ${T - 1}`} fill="none" stroke="#1f2340" strokeWidth={1.4} />
      {xTicks?.map((t) => <text key={`tx${t}`} x={sx(t)} y={H - B + 13} textAnchor="middle" fontSize={10} fontWeight={800} fill="#5b6080">{fmt(t)}</text>)}
      {yTicks?.map((t) => <text key={`ty${t}`} x={L - 4} y={sy(t) + 3.5} textAnchor="end" fontSize={10} fontWeight={800} fill="#5b6080">{fmt(t)}</text>)}
      {!xTicks && <text x={W - R} y={H - 3} textAnchor="end" fontSize={10} fontWeight={800} fill="#5b6080">{xLabel}</text>}
      {yLabel && <text x={L + 5} y={T - 2} fontSize={10} fontWeight={800} fill="#5b6080">{yLabel}</text>}
      <path d={pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ')} fill="none" stroke={color} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
