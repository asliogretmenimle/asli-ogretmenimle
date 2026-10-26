import { useRef, type ReactNode } from 'react'
import { DragPoint, Pinchable, usePlane } from '../../../interactive/Plane'
import { MIRROR_LEN, TARGET_R, bounceAngles, deg, dist, dot, fmtN, mirrorSeg, norm360, slopeFrac, type Bounce, type Mirror, type Pt, type Target, type Trace } from './optics'
import type { Mark, Mission } from './missions'

/**
 * Lazer laboratuvarı sahnesi (<Plane> içinde çizilir).
 * Karanlık oda, ızgara, aynalar (tek parmak: taşı, iki parmak: döndür), yayıcı ve nişangâh,
 * parlayan ışın (SVG filtresi + uzunluğa göre ilerleyen çizim), açı yayları, açıölçer.
 */

export interface EmitterState {
  x: number
  y: number
  dir: Pt
  aim: 'fixed' | 'rotate' | 'lattice'
  label?: string
}

export interface MeasureState {
  b: number
  ray: 'in' | 'out'
  value: number
  locked: boolean
}

export const BEAM_COLORS = ['#ff2d55', '#34d399']

export interface LabProps {
  m: Mission
  mirrors: Mirror[]
  emitters: EmitterState[]
  traces: Trace[] | null
  prog: number
  animDone: boolean
  targets: Target[]
  lit: string[]
  predict: Pt | null
  pick: { p: Pt; label: string } | null
  ghosts: { p: Pt; label: string }[]
  ghostWorld: boolean
  hitCoords: boolean
  selected: string | null
  editable: boolean
  marks: Mark[] | null
  measure: MeasureState | null
  onMeasure: (v: number) => void
  onSelect: (key: string | null) => void
  onMirror: (id: number, patch: Partial<Mirror>) => boolean
  onAim: (idx: number, dir: Pt) => void
}

const ang = (p: Pt) => norm360(deg(Math.atan2(p.y, p.x)))
const neg = (p: Pt): Pt => ({ x: -p.x, y: -p.y })
const snapAngle = (a: number, step: number) => norm360(Math.round(a / step) * step)

export function Lab(props: LabProps) {
  const P = usePlane()
  const { m, traces, prog, animDone } = props
  const u = P.unitPx
  const px = (p: Pt) => ({ x: P.sx(p.x), y: P.sy(p.y) })
  const room = m.room
  const r0 = px({ x: 0, y: room.h }), r1 = px({ x: room.w, y: 0 })

  // ızgara
  const grid: ReactNode[] = []
  for (let x = 0; x <= room.w; x++) grid.push(<line key={`gx${x}`} x1={P.sx(x)} x2={P.sx(x)} y1={r0.y} y2={r1.y} stroke="#16243d" strokeWidth={1} />)
  for (let y = 0; y <= room.h; y++) grid.push(<line key={`gy${y}`} y1={P.sy(y)} y2={P.sy(y)} x1={r0.x} x2={r1.x} stroke="#16243d" strokeWidth={1} />)
  const dots: ReactNode[] = []
  if (u > 16 && props.editable)
    for (let x = 1; x < room.w; x++) for (let y = 1; y < room.h; y++) dots.push(<circle key={`d${x}-${y}`} cx={P.sx(x)} cy={P.sy(y)} r={Math.min(3.2, Math.max(1.6, u * 0.045))} fill="#2b4a74" />)

  // ayna dünyası (oda dışındaki yansıma bölgesi)
  const g = m.ghost
  const mirrorLine = m.walls[0]
  const reflectPt = (p: Pt): Pt => {
    if (!mirrorLine) return p
    const a = mirrorLine.a, d = { x: mirrorLine.b.x - a.x, y: mirrorLine.b.y - a.y }
    const L = Math.hypot(d.x, d.y)
    const ux = d.x / L, uy = d.y / L
    const w = { x: p.x - a.x, y: p.y - a.y }
    const t = w.x * ux + w.y * uy
    const f = { x: a.x + ux * t, y: a.y + uy * t }
    return { x: 2 * f.x - p.x, y: 2 * f.y - p.y }
  }

  // ışın: ilerleme oranına göre kısmi çizim
  const maxLen = traces ? Math.max(...traces.map((t) => t.length), 0.001) : 0
  const partial = (t: Trace) => {
    const s = prog * maxLen
    const out: Pt[] = [t.pts[0]]
    let acc = 0
    for (let i = 1; i < t.pts.length; i++) {
      const a = t.pts[i - 1], b = t.pts[i]
      const L = dist(a, b)
      if (acc + L >= s) {
        const f = L ? (s - acc) / L : 0
        out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f })
        return out
      }
      acc += L
      out.push(b)
    }
    return out
  }
  const ptsAttr = (ps: Pt[]) => ps.map((p) => `${P.sx(p.x).toFixed(1)},${P.sy(p.y).toFixed(1)}`).join(' ')

  const R = Math.max(26, Math.min(56, u * 0.85))

  return (
    <g>
      <defs>
        <filter id="ll-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={Math.max(2.5, u * 0.07)} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="ll-soft" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation={Math.max(3, u * 0.12)} />
        </filter>
        <radialGradient id="ll-crys-on" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#fffbeb" />
          <stop offset="0.45" stopColor="#fcd34d" />
          <stop offset="1" stopColor="#d97706" />
        </radialGradient>
        <radialGradient id="ll-crys-off" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#a5b4fc" />
          <stop offset="0.5" stopColor="#6366f1" />
          <stop offset="1" stopColor="#312e81" />
        </radialGradient>
        <linearGradient id="ll-mirror" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="0.5" stopColor="#94a3b8" />
          <stop offset="1" stopColor="#e2e8f0" />
        </linearGradient>
        <pattern id="ll-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#334155" strokeWidth="3" />
        </pattern>
        <style>{CSS}</style>
      </defs>

      {/* zemin */}
      <rect x={0} y={0} width={P.width} height={P.height} fill="#050a14" />
      {g && (
        <g>
          <rect x={P.sx(g.x0)} y={P.sy(g.y1)} width={P.sx(g.x1) - P.sx(g.x0)} height={P.sy(g.y0) - P.sy(g.y1)} fill="#0b1a33" opacity={0.75} />
          {Array.from({ length: g.x1 - g.x0 + 1 }, (_, i) => <line key={`hx${i}`} x1={P.sx(g.x0 + i)} x2={P.sx(g.x0 + i)} y1={P.sy(g.y1)} y2={P.sy(g.y0)} stroke="#15294a" strokeDasharray="3 5" />)}
          {Array.from({ length: g.y1 - g.y0 + 1 }, (_, i) => <line key={`hy${i}`} y1={P.sy(g.y0 + i)} y2={P.sy(g.y0 + i)} x1={P.sx(g.x0)} x2={P.sx(g.x1)} stroke="#15294a" strokeDasharray="3 5" />)}
          <text x={(P.sx(g.x0) + P.sx(g.x1)) / 2} y={(P.sy(g.y0) + P.sy(g.y1)) / 2} textAnchor="middle" fontSize={Math.max(12, u * 0.42)} fontWeight={900} fill="#38bdf8" opacity={0.28} letterSpacing={3}>AYNA DÜNYASI</text>
          {props.ghostWorld && m.blocks.map((b, i) => {
            const a = reflectPt({ x: b.x0, y: b.y0 }), c = reflectPt({ x: b.x1, y: b.y1 })
            const x0 = Math.min(a.x, c.x), x1 = Math.max(a.x, c.x), y0 = Math.min(a.y, c.y), y1 = Math.max(a.y, c.y)
            return <rect key={`gb${i}`} x={P.sx(x0)} y={P.sy(y1)} width={P.sx(x1) - P.sx(x0)} height={P.sy(y0) - P.sy(y1)} fill="#1e293b" opacity={0.45} stroke="#475569" strokeDasharray="4 4" />
          })}
          {props.ghostWorld && traces && animDone && traces.map((t, k) => t.bounces.length > 0 && (
            <polyline key={`gl${k}`} points={ptsAttr([t.bounces[0].p, ...t.pts.slice(2).map(reflectPt)])} fill="none" stroke={BEAM_COLORS[k]} strokeWidth={2} strokeDasharray="6 6" opacity={0.6} />
          ))}
        </g>
      )}
      <rect x={r0.x} y={r0.y} width={r1.x - r0.x} height={r1.y - r0.y} fill="#0b1426" />
      {grid}
      {dots}
      <rect x={r0.x} y={r0.y} width={r1.x - r0.x} height={r1.y - r0.y} fill="none" stroke="#334155" strokeWidth={3} />

      {m.show.axes && <Axes m={m} />}

      {/* engeller */}
      {m.blocks.map((b, i) => (
        <g key={`b${i}`}>
          <rect x={P.sx(b.x0)} y={P.sy(b.y1)} width={P.sx(b.x1) - P.sx(b.x0)} height={P.sy(b.y0) - P.sy(b.y1)} fill="#1e293b" stroke="#64748b" strokeWidth={2} />
          <rect x={P.sx(b.x0)} y={P.sy(b.y1)} width={P.sx(b.x1) - P.sx(b.x0)} height={P.sy(b.y0) - P.sy(b.y1)} fill="url(#ll-hatch)" opacity={0.8} />
        </g>
      ))}

      {/* köşe açıları ve üçgen */}
      {m.tri && traces && animDone && traces[0].bounces.length >= 2 && (
        <polygon points={ptsAttr([traces[0].bounces[0].p, traces[0].bounces[1].p, m.tri])} fill="#fbbf24" opacity={0.16} stroke="#fbbf24" strokeOpacity={0.5} strokeDasharray="4 4" />
      )}
      {m.corners?.map((c, i) => <AngleArc key={`c${i}`} c={c.at} a1={c.a1} a2={c.a2} label={c.label} color="#fbbf24" r={R * 0.75} />)}

      {/* duvar aynaları */}
      {m.walls.map((s, i) => (
        <g key={`w${i}`}>
          <line x1={P.sx(s.a.x)} y1={P.sy(s.a.y)} x2={P.sx(s.b.x)} y2={P.sy(s.b.y)} stroke="#38bdf8" strokeWidth={12} opacity={0.12} strokeLinecap="round" />
          <line x1={P.sx(s.a.x)} y1={P.sy(s.a.y)} x2={P.sx(s.b.x)} y2={P.sy(s.b.y)} stroke="#cbd5e1" strokeWidth={5} strokeLinecap="round" />
          <line x1={P.sx(s.a.x)} y1={P.sy(s.a.y)} x2={P.sx(s.b.x)} y2={P.sy(s.b.y)} stroke="#f8fafc" strokeWidth={1.5} strokeLinecap="round" />
        </g>
      ))}

      {/* hayalet görüntüler (T′) */}
      {props.ghosts.map((gp) => (
        <g key={gp.label}>
          <Crystal p={gp.p} on={false} ghost label={`${gp.label}(${fmtN(gp.p.x)}, ${fmtN(gp.p.y)})`} />
          {props.ghostWorld && m.targets.filter((t) => dist(reflectPt(t), gp.p) < 0.01).map((t) => (
            <line key={t.id} x1={P.sx(t.x)} y1={P.sy(t.y)} x2={P.sx(gp.p.x)} y2={P.sy(gp.p.y)} stroke="#38bdf8" strokeDasharray="5 5" strokeWidth={1.5} opacity={0.7} />
          ))}
        </g>
      ))}

      {/* hedefler */}
      {props.targets.map((t) => <Crystal key={t.id} p={t} on={props.lit.includes(t.id)} label={t.label ? (m.show.coords ? `${t.label}(${fmtN(t.x)}, ${fmtN(t.y)})` : t.label) : undefined} />)}

      {/* ışın */}
      {traces && (
        <g>
          {traces.map((t, k) => {
            const ps = partial(t)
            const head = ps[ps.length - 1]
            const col = BEAM_COLORS[k % BEAM_COLORS.length]
            return (
              <g key={`beam${k}`} pointerEvents="none">
                <polyline points={ptsAttr(ps)} fill="none" stroke={col} strokeWidth={Math.max(6, u * 0.2)} strokeOpacity={0.35} strokeLinejoin="round" strokeLinecap="round" filter="url(#ll-glow)" />
                <polyline points={ptsAttr(ps)} fill="none" stroke={col} strokeWidth={3.2} strokeLinejoin="round" strokeLinecap="round" />
                <polyline points={ptsAttr(ps)} fill="none" stroke="#fff1f2" strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round" />
                {!animDone && <circle cx={P.sx(head.x)} cy={P.sy(head.y)} r={Math.max(5, u * 0.14)} fill="#fff" filter="url(#ll-glow)" />}
                {animDone && t.endKind !== 'target' && <circle cx={P.sx(t.end.x)} cy={P.sy(t.end.y)} r={Math.max(6, u * 0.18)} fill={col} opacity={0.5} filter="url(#ll-soft)" className="ll-flicker" />}
              </g>
            )
          })}
        </g>
      )}

      {/* ışın ayrıntıları: normal, açılar, koordinatlar, eğimler, dik kenarlar */}
      {traces && animDone && traces.map((t, k) => (
        <g key={`info${k}`} pointerEvents="none">
          {m.show.legs && t.pts.slice(0, -1).map((a, i) => {
            const b = i === t.pts.length - 2 && t.endKind === 'target' ? centerOfHit(t, props.targets) : t.pts[i + 1]
            const dx = b.x - a.x, dy = b.y - a.y
            if (Math.abs(dx) < 0.05 || Math.abs(dy) < 0.05) return null
            return (
              <g key={`leg${i}`}>
                <path d={`M${P.sx(a.x)} ${P.sy(a.y)} H${P.sx(b.x)} V${P.sy(b.y)}`} fill="none" stroke="#38bdf8" strokeWidth={1.6} strokeDasharray="5 4" />
                <Pill x={(P.sx(a.x) + P.sx(b.x)) / 2} y={P.sy(a.y) + (dy > 0 ? 14 : -14)} text={fmtN(Math.abs(dx), 1)} color="#38bdf8" />
                <Pill x={P.sx(b.x) + (dx > 0 ? 18 : -18)} y={(P.sy(a.y) + P.sy(b.y)) / 2} text={fmtN(Math.abs(dy), 1)} color="#38bdf8" />
              </g>
            )
          })}
          {m.show.slope && t.pts.slice(0, -1).map((a, i) => {
            const b = t.pts[i + 1]
            if (dist(a, b) < 1) return null
            const s = slopeFrac(b.x - a.x, b.y - a.y)
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
            const nx = -(b.y - a.y) / dist(a, b), ny = (b.x - a.x) / dist(a, b)
            return <Pill key={`sl${i}`} x={P.sx(mid.x) + nx * 18} y={P.sy(mid.y) - ny * 18} text={`m = ${s.svg}`} color="#f472b6" />
          })}
          {(m.show.normal || props.marks?.some((x) => x.k === 'normal' || x.k === 'between')) && t.bounces.map((b, i) => <NormalLine key={`n${i}`} b={b} len={Math.max(1.4, 48 / u)} />)}
          {(props.marks ?? (m.show.angles ? t.bounces.flatMap((_, i): Mark[] => [{ b: i, k: 'in' }, { b: i, k: 'out' }]) : []))
            .filter((mk) => (mk.e ?? 0) === k && t.bounces[mk.b])
            .map((mk, i) => <BounceMark key={`mk${i}`} b={t.bounces[mk.b]} mark={mk} R={R} />)}
          {props.hitCoords && t.bounces.map((b, i) => <Pill key={`c${i}`} x={P.sx(b.p.x)} y={P.sy(b.p.y) + (b.dout.y > 0 || b.din.y < 0 ? 22 : -22)} text={`(${fmtN(b.p.x, 1)}, ${fmtN(b.p.y, 1)})`} color="#e2e8f0" bg="#0f172a" />)}
          {props.hitCoords && t.endKind !== 'target' && <Pill x={clampX(P.sx(t.end.x), P.width)} y={clampY(P.sy(t.end.y) + (t.end.y > room.h - 0.5 ? 20 : -20), P.height)} text={`(${fmtN(t.end.x, 1)}, ${fmtN(t.end.y, 1)})`} color="#fda4af" bg="#0f172a" />}
        </g>
      ))}

      {/* tahmin işareti */}
      {props.predict && (
        <g pointerEvents="none">
          {traces && animDone && (
            <line x1={P.sx(props.predict.x)} y1={P.sy(props.predict.y)} x2={P.sx(traces[0].end.x)} y2={P.sy(traces[0].end.y)} stroke="#fbbf24" strokeDasharray="3 4" strokeWidth={1.5} />
          )}
          <circle cx={P.sx(props.predict.x)} cy={P.sy(props.predict.y)} r={14} fill="none" stroke="#fbbf24" strokeWidth={2.5} className="ll-pulse" />
          <line x1={P.sx(props.predict.x) - 20} x2={P.sx(props.predict.x) + 20} y1={P.sy(props.predict.y)} y2={P.sy(props.predict.y)} stroke="#fbbf24" strokeWidth={2} />
          <line y1={P.sy(props.predict.y) - 20} y2={P.sy(props.predict.y) + 20} x1={P.sx(props.predict.x)} x2={P.sx(props.predict.x)} stroke="#fbbf24" strokeWidth={2} />
          <Pill x={clampX(P.sx(props.predict.x), P.width)} y={clampY(P.sy(props.predict.y) + 28, P.height)} text="Tahmin" color="#fbbf24" bg="#0f172a" />
        </g>
      )}

      {/* nokta seçimi (görüntü / öteleme) */}
      {props.pick && (
        <g pointerEvents="none">
          <circle cx={P.sx(props.pick.p.x)} cy={P.sy(props.pick.p.y)} r={12} fill="#f472b6" opacity={0.25} className="ll-pulse" />
          <circle cx={P.sx(props.pick.p.x)} cy={P.sy(props.pick.p.y)} r={7} fill="#f472b6" stroke="#fff" strokeWidth={2} />
          <Pill x={clampX(P.sx(props.pick.p.x), P.width)} y={clampY(P.sy(props.pick.p.y) - 24, P.height)} text={`${props.pick.label}(${fmtN(props.pick.p.x)}, ${fmtN(props.pick.p.y)})`} color="#f9a8d4" bg="#0f172a" />
        </g>
      )}

      {/* aynalar */}
      {props.mirrors.map((mi) => (
        <MirrorView key={mi.id} mi={mi} sel={props.selected === `m:${mi.id}`} editable={props.editable && !mi.fixed} step={m.angleStep} onSelect={() => props.onSelect(`m:${mi.id}`)} onMirror={props.onMirror} />
      ))}

      {/* yayıcılar */}
      {props.emitters.map((e, i) => (
        <Emitter key={`e${i}`} e={e} idx={i} editable={props.editable && e.aim !== 'fixed'} sel={props.selected === `e:${i}`} step={m.angleStep} onSelect={() => props.onSelect(`e:${i}`)} onAim={(d) => props.onAim(i, d)} color={BEAM_COLORS[i % BEAM_COLORS.length]} view={P.view} />
      ))}

      {/* açıölçer */}
      {props.measure && traces && animDone && traces[0].bounces[props.measure.b] && (
        <Protractor b={traces[0].bounces[props.measure.b]} st={props.measure} onValue={props.onMeasure} />
      )}
    </g>
  )
}

const clampX = (x: number, w: number) => Math.max(44, Math.min(w - 44, x))
const clampY = (y: number, h: number) => Math.max(14, Math.min(h - 14, y))

function centerOfHit(t: Trace, targets: Target[]): Pt {
  const end = t.end
  let best: Target | null = null
  for (const tg of targets) if (!best || dist(tg, end) < dist(best, end)) best = tg
  return best && dist(best, end) <= (best.r ?? TARGET_R) + 0.05 ? best : end
}

function Axes({ m }: { m: Mission }) {
  const P = usePlane()
  const step = P.unitPx < 26 ? 2 : 1
  const v = P.view
  const xs: number[] = [], ys: number[] = []
  for (let x = Math.ceil(v.xMin); x <= Math.floor(v.xMax); x++) if (x % step === 0) xs.push(x)
  for (let y = Math.ceil(v.yMin); y <= Math.floor(v.yMax); y++) if (y % step === 0) ys.push(y)
  const y0 = P.sy(0), x0 = P.sx(0)
  return (
    <g pointerEvents="none">
      <line x1={0} x2={P.width} y1={y0} y2={y0} stroke="#64748b" strokeWidth={1.5} />
      <line y1={0} y2={P.height} x1={x0} x2={x0} stroke="#64748b" strokeWidth={1.5} />
      {xs.map((x) => x !== 0 && <text key={`ax${x}`} x={P.sx(x)} y={Math.min(P.height - 3, y0 + 14)} textAnchor="middle" fontSize={10.5} fontWeight={800} fill="#7dd3fc">{String(x).replace('-', '−')}</text>)}
      {ys.map((y) => y !== 0 && <text key={`ay${y}`} x={Math.max(10, x0 - 5)} y={P.sy(y) + 4} textAnchor="end" fontSize={10.5} fontWeight={800} fill="#7dd3fc">{String(y).replace('-', '−')}</text>)}
      <text x={x0 - 5} y={y0 + 14} textAnchor="end" fontSize={10.5} fontWeight={800} fill="#7dd3fc">0</text>
      <text x={P.width - 6} y={y0 - 6} textAnchor="end" fontSize={12} fontWeight={900} fill="#7dd3fc">x</text>
      <text x={x0 + 8} y={14} fontSize={12} fontWeight={900} fill="#7dd3fc">y</text>
      {m.ghost && null}
    </g>
  )
}

export function Pill({ x, y, text, color, bg = '#0f172a' }: { x: number; y: number; text: string; color: string; bg?: string }) {
  const w = text.length * 6.9 + 12
  return (
    <g pointerEvents="none">
      <rect x={x - w / 2} y={y - 10} width={w} height={20} rx={10} fill={bg} fillOpacity={0.88} stroke={color} strokeWidth={1.2} />
      <text x={x} y={y + 4.2} textAnchor="middle" fontSize={12} fontWeight={900} fill={color}>{text}</text>
    </g>
  )
}

function Crystal({ p, on, label, ghost }: { p: Pt; on: boolean; label?: string; ghost?: boolean }) {
  const P = usePlane()
  const r = Math.max(12, P.unitPx * TARGET_R)
  const cx = P.sx(p.x), cy = P.sy(p.y)
  const hex = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
  const inner = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6
    return `${(cx + r * 0.5 * Math.cos(a)).toFixed(1)},${(cy + r * 0.5 * Math.sin(a)).toFixed(1)}`
  }).join(' ')
  return (
    <g pointerEvents="none" opacity={ghost ? 0.55 : 1}>
      {on && <circle cx={cx} cy={cy} r={r * 2.1} fill="#fbbf24" opacity={0.35} filter="url(#ll-soft)" />}
      {on && <circle cx={cx} cy={cy} r={r * 1.3} fill="none" stroke="#fde68a" strokeWidth={2} className="ll-ring" />}
      <polygon points={hex} fill={on ? 'url(#ll-crys-on)' : 'url(#ll-crys-off)'} stroke={on ? '#fef3c7' : '#a5b4fc'} strokeWidth={2} strokeDasharray={ghost ? '4 3' : undefined} />
      <polygon points={inner} fill="#fff" opacity={on ? 0.55 : 0.18} />
      {label && <Pill x={cx} y={cy - r - 14} text={label} color={on ? '#fde68a' : '#c7d2fe'} />}
    </g>
  )
}

/** Açı yayı: a1’den a2’ye (saat yönünün tersine), merkez matematik koordinatı */
function AngleArc({ c, a1, a2, label, color, r, dashed }: { c: Pt; a1: number; a2: number; label?: string; color: string; r: number; dashed?: boolean }) {
  const P = usePlane()
  const cx = P.sx(c.x), cy = P.sy(c.y)
  const sweep = norm360(a2 - a1)
  const t1 = (a1 * Math.PI) / 180, t2 = ((a1 + sweep) * Math.PI) / 180
  const p1 = { x: cx + r * Math.cos(t1), y: cy - r * Math.sin(t1) }
  const p2 = { x: cx + r * Math.cos(t2), y: cy - r * Math.sin(t2) }
  const mid = ((a1 + sweep / 2) * Math.PI) / 180
  const lr = r + 17
  return (
    <g pointerEvents="none">
      <path d={`M${cx} ${cy} L${p1.x} ${p1.y} A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 0 ${p2.x} ${p2.y} Z`} fill={color} fillOpacity={0.16} stroke="none" />
      <path d={`M${p1.x} ${p1.y} A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 0 ${p2.x} ${p2.y}`} fill="none" stroke={color} strokeWidth={2.2} strokeDasharray={dashed ? '4 3' : undefined} />
      {label && <Pill x={cx + lr * Math.cos(mid)} y={cy - lr * Math.sin(mid)} text={label} color={color} />}
    </g>
  )
}

/** iki yön arasındaki küçük açının yayı */
function arcBetween(d1: Pt, d2: Pt) {
  const a = ang(d1), b = ang(d2)
  const s = norm360(b - a)
  return s <= 180 ? { a1: a, a2: b } : { a1: b, a2: a }
}

function NormalLine({ b, len }: { b: Bounce; len: number }) {
  const P = usePlane()
  const n = { x: -b.m.y, y: b.m.x }
  const p1 = { x: b.p.x + n.x * len, y: b.p.y + n.y * len }, p2 = { x: b.p.x - n.x * len, y: b.p.y - n.y * len }
  return <line x1={P.sx(p1.x)} y1={P.sy(p1.y)} x2={P.sx(p2.x)} y2={P.sy(p2.y)} stroke="#a5f3fc" strokeWidth={1.6} strokeDasharray="6 5" opacity={0.85} />
}

function BounceMark({ b, mark, R }: { b: Bounce; mark: Mark; R: number }) {
  const P = usePlane()
  const A = bounceAngles(b)
  const u = neg(b.din)
  const v = b.dout
  const mm = b.m, mn = neg(b.m)
  const near = (d: Pt) => (dot(d, mm) >= dot(d, mn) ? mm : mn)
  const far = (d: Pt) => (dot(d, mm) >= dot(d, mn) ? mn : mm)
  const fmtA = (x: number) => `${Math.round(x)}°`
  let spec: { d1: Pt; d2: Pt; val: number; color: string; r: number }
  switch (mark.k) {
    case 'in':
      spec = { d1: u, d2: near(u), val: A.mirror, color: '#fbbf24', r: R }
      break
    case 'out':
      spec = { d1: v, d2: near(v), val: A.mirror, color: '#34d399', r: R }
      break
    case 'outWide':
      spec = { d1: v, d2: far(v), val: 180 - A.mirror, color: '#f472b6', r: R * 0.62 }
      break
    case 'between':
      spec = { d1: u, d2: v, val: A.between, color: '#c084fc', r: R * 0.7 }
      break
    case 'normal': {
      const n0 = { x: -b.m.y, y: b.m.x }
      const n = dot(n0, u) >= 0 ? n0 : neg(n0)
      spec = { d1: u, d2: n, val: A.normal, color: '#22d3ee', r: R * 1.25 }
      break
    }
    case 'dev':
      spec = { d1: b.din, d2: v, val: 180 - A.between, color: '#f472b6', r: R * 1.35 }
      break
  }
  const { a1, a2 } = arcBetween(spec.d1, spec.d2)
  const L = Math.max(1.6, 60 / P.unitPx)
  return (
    <g>
      {mark.k === 'dev' && <line x1={P.sx(b.p.x)} y1={P.sy(b.p.y)} x2={P.sx(b.p.x + b.din.x * L)} y2={P.sy(b.p.y + b.din.y * L)} stroke="#fda4af" strokeWidth={2} strokeDasharray="6 5" />}
      <AngleArc c={b.p} a1={a1} a2={a2} r={spec.r} color={spec.color} label={mark.hide ? '?' : fmtA(spec.val)} />
    </g>
  )
}

function MirrorView({ mi, sel, editable, step, onSelect, onMirror }: { mi: Mirror; sel: boolean; editable: boolean; step: number; onSelect: () => void; onMirror: (id: number, patch: Partial<Mirror>) => boolean }) {
  const P = usePlane()
  const s = mirrorSeg(mi, MIRROR_LEN)
  const a = { x: P.sx(s.a.x), y: P.sy(s.a.y) }, b = { x: P.sx(s.b.x), y: P.sy(s.b.y) }
  const raw = useRef<{ x: number; y: number; a: number } | null>(null)
  const start = () => {
    if (!raw.current) raw.current = { x: mi.x, y: mi.y, a: mi.a }
    return raw.current
  }
  const body = (
    <g>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={Math.max(48, P.unitPx * 0.9)} strokeLinecap="round" />
      {sel && <circle cx={P.sx(mi.x)} cy={P.sy(mi.y)} r={P.unitPx * MIRROR_LEN * 0.55 + 6} fill="none" stroke="#22d3ee" strokeWidth={1.5} strokeDasharray="4 5" className="ll-spin" />}
      {sel && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#22d3ee" strokeWidth={14} strokeOpacity={0.35} strokeLinecap="round" />}
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#64748b" strokeWidth={7} strokeLinecap="round" />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#e2e8f0" strokeWidth={4.5} strokeLinecap="round" />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ffffff" strokeWidth={1.4} strokeLinecap="round" />
      <circle cx={P.sx(mi.x)} cy={P.sy(mi.y)} r={3.5} fill={mi.fixed ? '#94a3b8' : '#22d3ee'} />
      {sel && <Pill x={P.sx(mi.x)} y={P.sy(mi.y) + Math.max(28, P.unitPx * 0.8)} text={`${Math.round(mi.a)}°`} color="#67e8f9" />}
    </g>
  )
  if (!editable) return <g pointerEvents="none">{body}</g>
  return (
    <g onPointerDown={onSelect}>
      <Pinchable
        onMove={(dx, dy) => {
          const r = start()
          r.x += dx
          r.y += dy
          const nx = Math.round(r.x), ny = Math.round(r.y)
          if (nx !== mi.x || ny !== mi.y) onMirror(mi.id, { x: nx, y: ny })
        }}
        onRotate={(d) => {
          const r = start()
          r.a -= d
          const na = snapAngle(r.a, step) % 180
          if (na !== mi.a) onMirror(mi.id, { a: na })
        }}
        onEnd={() => {
          raw.current = null
        }}
      >
        {body}
      </Pinchable>
    </g>
  )
}

function Emitter({ e, idx, editable, sel, step, onSelect, onAim, color, view }: { e: EmitterState; idx: number; editable: boolean; sel: boolean; step: number; onSelect: () => void; onAim: (d: Pt) => void; color: string; view: { xMin: number; xMax: number; yMin: number; yMax: number } }) {
  const P = usePlane()
  const s = Math.max(16, P.unitPx * 0.42)
  const a = ang(e.dir)
  const cx = P.sx(e.x), cy = P.sy(e.y)
  const raw = useRef<number | null>(null)
  const L = Math.hypot(e.dir.x, e.dir.y)
  const unit = { x: e.dir.x / L, y: e.dir.y / L }
  const handle = e.aim === 'lattice' ? { x: e.x + e.dir.x, y: e.y + e.dir.y } : { x: e.x + unit.x * Math.max(1.8, 70 / P.unitPx), y: e.y + unit.y * Math.max(1.8, 70 / P.unitPx) }
  const body = (
    <g transform={`translate(${cx} ${cy}) rotate(${-a})`}>
      <circle r={s * 1.6} fill="transparent" />
      {sel && <circle r={s * 1.45} fill="none" stroke="#22d3ee" strokeWidth={1.5} strokeDasharray="4 5" className="ll-spin" />}
      <rect x={-s * 1.05} y={-s * 0.62} width={s * 1.7} height={s * 1.24} rx={s * 0.3} fill="#1e293b" stroke="#94a3b8" strokeWidth={2} />
      <rect x={-s * 0.8} y={-s * 0.38} width={s * 0.8} height={s * 0.76} rx={s * 0.15} fill="#0f172a" />
      <circle cx={-s * 0.4} cy={0} r={s * 0.17} fill={color} className="ll-flicker" />
      <rect x={s * 0.62} y={-s * 0.32} width={s * 0.42} height={s * 0.64} rx={s * 0.1} fill="#475569" />
      <circle cx={s * 1.04} cy={0} r={s * 0.2} fill={color} filter="url(#ll-glow)" />
    </g>
  )
  return (
    <g>
      {editable && (
        <line x1={cx} y1={cy} x2={P.sx(handle.x)} y2={P.sy(handle.y)} stroke={color} strokeWidth={1.5} strokeDasharray="2 6" opacity={0.75} pointerEvents="none" />
      )}
      {editable && e.aim === 'rotate' ? (
        <g onPointerDown={onSelect}>
          <Pinchable
            onRotate={(d) => {
              if (raw.current === null) raw.current = a
              raw.current -= d
              const na = snapAngle(raw.current, step)
              if (Math.abs(norm360(na - a)) > 0.01) onAim({ x: Math.cos((na * Math.PI) / 180), y: Math.sin((na * Math.PI) / 180) })
            }}
            onEnd={() => {
              raw.current = null
            }}
          >
            {body}
          </Pinchable>
        </g>
      ) : (
        <g pointerEvents={editable ? undefined : 'none'} onPointerDown={editable ? onSelect : undefined}>{body}</g>
      )}
      {e.label && <Pill x={cx} y={cy + s + 16} text={e.label} color={color} />}
      {editable && (
        <DragPoint
          x={handle.x}
          y={handle.y}
          r={10}
          color="#f8fafc"
          onChange={(p) => {
            onSelect()
            if (e.aim === 'lattice') {
              const x = Math.max(Math.ceil(view.xMin), Math.min(Math.floor(view.xMax), Math.round(p.x)))
              const y = Math.max(Math.ceil(view.yMin), Math.min(Math.floor(view.yMax), Math.round(p.y)))
              const d = { x: x - e.x, y: y - e.y }
              if ((d.x || d.y) && (d.x !== e.dir.x || d.y !== e.dir.y)) onAim(d)
            } else {
              const na = snapAngle(deg(Math.atan2(p.y - e.y, p.x - e.x)), step)
              if (Math.abs(norm360(na - a)) > 0.01) onAim({ x: Math.cos((na * Math.PI) / 180), y: Math.sin((na * Math.PI) / 180) })
            }
          }}
        />
      )}
      {editable && <circle cx={P.sx(handle.x)} cy={P.sy(handle.y)} r={16} fill="none" stroke="#f8fafc" strokeWidth={1.5} opacity={0.6} pointerEvents="none" className="ll-pulse" />}
      {editable && idx >= 0 && null}
    </g>
  )
}

function Protractor({ b, st, onValue }: { b: Bounce; st: MeasureState; onValue: (v: number) => void }) {
  const P = usePlane()
  const u = neg(b.din)
  const ray = st.ray === 'in' ? u : b.dout
  const base = dot(ray, b.m) >= 0 ? b.m : neg(b.m)
  const side = base.x * ray.y - base.y * ray.x >= 0 ? 1 : -1
  const a0 = ang(base)
  const Rm = Math.max(2.3, 92 / P.unitPx)
  const Rpx = Rm * P.unitPx
  const cx = P.sx(b.p.x), cy = P.sy(b.p.y)
  const at = (deg0: number, r: number) => {
    const t = ((a0 + side * deg0) * Math.PI) / 180
    return { x: cx + r * Math.cos(t), y: cy - r * Math.sin(t) }
  }
  const ticks: ReactNode[] = []
  for (let d = 0; d <= 180; d += 5) {
    const long = d % 30 === 0, mid = d % 10 === 0
    const p1 = at(d, Rpx), p2 = at(d, Rpx - (long ? 13 : mid ? 8 : 4))
    ticks.push(<line key={d} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#0e7490" strokeWidth={long ? 2 : 1} />)
    if (long) {
      const t = at(d, Rpx - 24)
      ticks.push(<text key={`t${d}`} x={t.x} y={t.y + 4} textAnchor="middle" fontSize={10} fontWeight={900} fill="#155e75">{d}</text>)
    }
  }
  const e0 = at(0, Rpx), e180 = at(180, Rpx)
  const sweepFlag = side > 0 ? 0 : 1
  const arm = { x: b.p.x + Rm * Math.cos(((a0 + side * st.value) * Math.PI) / 180), y: b.p.y + Rm * Math.sin(((a0 + side * st.value) * Math.PI) / 180) }
  const armPx = at(st.value, Rpx + 10)
  return (
    <g>
      <path d={`M${e0.x} ${e0.y} A${Rpx} ${Rpx} 0 0 ${sweepFlag} ${e180.x} ${e180.y} Z`} fill="#cffafe" fillOpacity={0.82} stroke="#0891b2" strokeWidth={2} pointerEvents="none" />
      <g pointerEvents="none">{ticks}</g>
      <circle cx={cx} cy={cy} r={4} fill="#0e7490" pointerEvents="none" />
      <line x1={cx} y1={cy} x2={armPx.x} y2={armPx.y} stroke={st.locked ? '#16a34a' : '#f59e0b'} strokeWidth={3.5} strokeLinecap="round" pointerEvents="none" />
      {!st.locked && (
        <DragPoint
          x={arm.x}
          y={arm.y}
          r={12}
          color="#f59e0b"
          onChange={(p) => {
            const raw = deg(Math.atan2(p.y - b.p.y, p.x - b.p.x))
            let rel = norm360(side * (raw - a0))
            if (rel > 270) rel = 0
            else if (rel > 180) rel = 180
            onValue(Math.round(rel))
          }}
        />
      )}
      <Pill x={at(st.value, Rpx + 34).x} y={at(st.value, Rpx + 34).y} text={`${st.value}°`} color={st.locked ? '#4ade80' : '#fbbf24'} />
    </g>
  )
}

const CSS = `
.ll-pulse{animation:llPulse 1.4s ease-in-out infinite}
@keyframes llPulse{50%{opacity:.35}}
.ll-flicker{animation:llFlicker 2.2s ease-in-out infinite}
@keyframes llFlicker{0%,100%{opacity:1}45%{opacity:.75}55%{opacity:.95}}
.ll-ring{animation:llRing 1.3s ease-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes llRing{from{transform:scale(.7);opacity:1}to{transform:scale(1.9);opacity:0}}
.ll-spin{animation:llSpin 6s linear infinite;transform-box:fill-box;transform-origin:center}
@keyframes llSpin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.ll-pulse,.ll-flicker,.ll-ring,.ll-spin{animation:none}}
`
