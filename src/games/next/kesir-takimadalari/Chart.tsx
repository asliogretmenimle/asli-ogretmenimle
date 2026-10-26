import { useEffect, useId, useRef, type MutableRefObject } from 'react'
import { useGesture } from '@use-gesture/react'
import { Plane, usePlane } from '../../../interactive/Plane'
import { MathText } from '../../../components/MathText'
import { clamp } from '../../../interactive/axis'
import { tickLabel, visibleDen } from './frac'

/**
 * Deniz haritası: <Plane mode="x"> üzerine çizilmiş bir takımada.
 * Rota = sayı doğrusu. Gökyüzü ve şerit modeli SVG taşmasıyla (overflow) çizilir,
 * böylece adalar ve deniz yakınlaştırmayla birlikte hareket eder.
 */

const SKY = 150
const BOX = 150
const BELOW = 50
const Y0 = 87 // Plane mode="x" rota yüksekliği (150 × 0,58)
const HORIZON = 34

export type IslandKind = 'palm' | 'hill' | 'house' | 'rock' | 'mini'
export interface Island {
  id: string
  x: number
  label: string
  kind?: IslandKind
  /** Yeni ortaya çıkan ada animasyonla yükselir */
  fresh?: boolean
  tone?: 'normal' | 'gold' | 'ghost'
}

export interface ChartProps {
  view: [number, number]
  /** Teknenin gidebileceği ve şeridin çizileceği aralık */
  range: [number, number]
  den: number
  decimal?: boolean
  boat: number | null
  /** Tahmin aşaması: çentiğe yapışmadan serbest */
  free?: boolean
  onBoat?: (x: number, final: boolean) => void
  onDen?: (D: number) => void
  islands?: Island[]
  anchor?: number | null
  harbor?: { x: number; label: string } | null
  gap?: [number, number] | null
  bridge?: [number, number] | null
  /** ½ referans şamandırası */
  half?: boolean
  minSpan?: number
  locked?: boolean
  /** Şeritte (alan modeli) teknenin konumuna kadar boya */
  stripFill?: boolean
  cameraRef?: MutableRefObject<((x: number, factor: number) => void) | null>
}

export function Chart(props: ChartProps) {
  const { view, minSpan = 0.05, locked } = props
  const dRef = useRef(0)
  const onTap = (p: { x: number }) => {
    if (locked || props.boat === null || !props.onBoat) return
    props.onBoat(snapX(p.x, props, dRef.current), true)
  }
  return (
    <div className="relative overflow-hidden rounded-[28px] shadow-[0_10px_30px_rgb(3_105_161/0.25)] ring-1 ring-sky-900/15" style={{ height: SKY + BOX + BELOW }}>
      <style>{CSS}</style>
      <div className="absolute inset-x-0" style={{ top: SKY }}>
        <Plane
          mode="x"
          axes={false}
          grid={false}
          initial={{ xMin: view[0], xMax: view[1], yMin: -1, yMax: 1 }}
          minSpan={minSpan}
          maxSpan={12}
          onTap={onTap}
          locked={false}
          label="Kesir rotası: iki parmakla yakınlaştır"
          className="[&>div:first-child]:overflow-visible [&>div:first-child]:rounded-none [&>div:first-child]:bg-transparent [&>div:first-child]:ring-0 [&>p]:hidden [&_svg]:overflow-visible"
        >
          <World {...props} dRef={dRef} />
        </Plane>
      </div>
    </div>
  )
}

function snapX(x: number, p: ChartProps, D: number) {
  const v = clamp(x, p.range[0], p.range[1])
  if (!p.free && D) return clamp(Math.round(v * D) / D, p.range[0], p.range[1])
  return Math.round(v * 400) / 400
}

const CSS = `
@keyframes kt-bob { 0%,100% { transform: translateY(0) rotate(-1.5deg) } 50% { transform: translateY(-3px) rotate(1.5deg) } }
@keyframes kt-rise { from { transform: translateY(46px); opacity: 0 } 60% { opacity: 1 } to { transform: translateY(0); opacity: 1 } }
@keyframes kt-beam { 0%,100% { opacity: .15 } 50% { opacity: .55 } }
@keyframes kt-drift { from { transform: translateX(0) } to { transform: translateX(-120px) } }
@keyframes kt-glow { 0%,100% { opacity: .35 } 50% { opacity: .7 } }
.kt-bob { animation: kt-bob 3.2s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100% }
.kt-rise { animation: kt-rise .8s cubic-bezier(.2,.9,.3,1.2) both }
.kt-beam { animation: kt-beam 3s ease-in-out infinite }
.kt-drift { animation: kt-drift 9s linear infinite }
.kt-glow { animation: kt-glow 1.6s ease-in-out infinite }
`

function World(props: ChartProps & { dRef: MutableRefObject<number> }) {
  const P = usePlane()
  const uid = useId().replace(/:/g, '')
  const { den, decimal = false, range, boat, onDen, dRef, cameraRef } = props
  const W = P.width
  const zoom = P.unitPx / (W / (props.view[1] - props.view[0]))
  const D = visibleDen(den, P.unitPx, decimal, zoom)
  dRef.current = D

  useEffect(() => {
    onDen?.(D)
  }, [D, onDen])

  // Yumuşak kamera: Plane'e tekerlek olayları göndererek bir nokta etrafında yakınlaştırır
  useEffect(() => {
    if (!cameraRef) return
    cameraRef.current = (x: number, factor: number) => {
      const svg = P.svg
      if (!svg) return
      const r = svg.getBoundingClientRect()
      const cx = r.left + (P.sx(x) / P.width) * r.width
      const cy = r.top + Y0
      const frames = 22
      const dy = -Math.log(factor) / frames / 0.0025
      let i = 0
      const tick = () => {
        svg.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, clientX: cx, clientY: cy, bubbles: true, cancelable: true }))
        if (++i < frames) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
  }, [cameraRef, P])

  const shift = -P.sx(0) // dünya kayması (paralaks için)
  const small = W < 520
  const top = -SKY
  const bottom = BOX + BELOW

  return (
    <g>
      <defs>
        <linearGradient id={`sky${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7cc8f4" />
          <stop offset="0.7" stopColor="#c9ecff" />
          <stop offset="1" stopColor="#fdf2d8" />
        </linearGradient>
        <linearGradient id={`sea${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5cc6e8" />
          <stop offset="0.35" stopColor="#1ea2d6" />
          <stop offset="1" stopColor="#075f93" />
        </linearGradient>
        <linearGradient id={`fill${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fb923c" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
        <radialGradient id={`sun${uid}`}>
          <stop offset="0" stopColor="#fff7c2" />
          <stop offset="0.5" stopColor="#ffe27a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffe27a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Gökyüzü */}
      <rect x={-2} y={top} width={W + 4} height={HORIZON - top + 2} fill={`url(#sky${uid})`} />
      <circle cx={W * 0.84 + shift * 0.03} cy={-92} r={56} fill={`url(#sun${uid})`} />
      <circle cx={W * 0.84 + shift * 0.03} cy={-92} r={20} fill="#fff4b0" />
      <Clouds W={W} shift={shift} />
      <FarIslands W={W} shift={shift} />

      {/* Deniz */}
      <rect x={-2} y={HORIZON} width={W + 4} height={bottom - HORIZON} fill={`url(#sea${uid})`} />
      <Waves W={W} shift={shift} />

      {/* Rota şeridi */}
      <rect x={-2} y={Y0 - 11} width={W + 4} height={22} fill="#ffffff" opacity={0.14} />
      <line x1={Math.max(0, P.sx(range[0]))} x2={Math.min(W, P.sx(range[1]))} y1={Y0} y2={Y0} stroke="#f0fbff" strokeWidth={3} strokeDasharray="10 7" strokeLinecap="round" />
      {props.gap && (
        <g>
          <rect className="kt-glow" x={P.sx(props.gap[0])} y={Y0 - 13} width={Math.max(2, P.sx(props.gap[1]) - P.sx(props.gap[0]))} height={26} rx={7} fill="#fff3b0" />
          <rect x={P.sx(props.gap[0])} y={Y0 - 13} width={Math.max(2, P.sx(props.gap[1]) - P.sx(props.gap[0]))} height={26} rx={7} fill="none" stroke="#fbbf24" strokeWidth={2} strokeDasharray="6 4" />
        </g>
      )}

      <Strip D={D} den={den} range={range} boat={props.stripFill === false ? null : boat} fillId={`fill${uid}`} />
      <Ticks D={D} den={den} decimal={decimal} range={range} />
      <Wholes range={range} />
      {props.half && <HalfBuoy />}
      <Lighthouse />
      {props.harbor && <Harbor x={props.harbor.x} label={props.harbor.label} />}
      {stagger(props.islands ?? [], P.sx).map(([is, lift]) => <IslandArt key={is.id} is={is} lift={lift} small={small} />)}
      {props.bridge && <Bridge a={props.bridge[0]} b={props.bridge[1]} />}
      {props.anchor != null && <Anchor x={props.anchor} />}
      {boat !== null && <Boat x={boat} {...props} D={D} />}
    </g>
  )
}

/** Yakın adaların tabelaları üst üste binmesin: ekranda yakın olanları kademeli yükselt */
function stagger(list: Island[], sx: (x: number) => number): [Island, number][] {
  const sorted = [...list].sort((a, b) => a.x - b.x)
  const out: [Island, number][] = []
  let prevX = -1e9, prevLift = 0
  for (const is of sorted) {
    const px = sx(is.x)
    const lift = px - prevX < 74 ? (prevLift + 36) % 108 : 0
    out.push([is, lift])
    prevX = px
    prevLift = lift
  }
  return out
}

function Clouds({ W, shift }: { W: number; shift: number }) {
  const span = W + 260
  const base = [
    { x: 40, y: -118, s: 1 },
    { x: 260, y: -84, s: 0.7 },
    { x: 520, y: -126, s: 0.9 },
    { x: 760, y: -78, s: 0.6 },
    { x: 980, y: -110, s: 0.8 },
  ]
  return (
    <g opacity={0.95}>
      {base.map((c, i) => {
        const x = ((((c.x + shift * 0.12) % span) + span) % span) - 130
        return (
          <g key={i} transform={`translate(${x} ${c.y}) scale(${c.s})`}>
            <ellipse cx={0} cy={0} rx={46} ry={14} fill="#fff" />
            <ellipse cx={-16} cy={-10} rx={22} ry={16} fill="#fff" />
            <ellipse cx={14} cy={-14} rx={26} ry={20} fill="#fff" />
          </g>
        )
      })}
    </g>
  )
}

function FarIslands({ W, shift }: { W: number; shift: number }) {
  const span = 340
  const off = (((shift * 0.3) % span) + span) % span
  const items = []
  for (let x = -span + off; x < W + span; x += span) {
    items.push(
      <g key={x} transform={`translate(${x} ${HORIZON})`}>
        <path d="M0 0 Q40 -34 80 -12 Q110 -30 150 0 Z" fill="#7fb7c9" opacity={0.75} />
        <path d="M190 0 Q220 -18 250 -6 Q270 -14 290 0 Z" fill="#94c5d4" opacity={0.7} />
      </g>,
    )
  }
  return <g>{items}</g>
}

function Waves({ W, shift }: { W: number; shift: number }) {
  const rows = [
    { y: 52, a: 3, k: 0.5, o: 0.35 },
    { y: 128, a: 4, k: 0.8, o: 0.22 },
    { y: 176, a: 5, k: 1, o: 0.2 },
  ]
  return (
    <g>
      {rows.map((r, i) => {
        const off = (((shift * r.k) % 120) + 120) % 120
        let d = `M${-240 + off} ${r.y}`
        for (let x = -240 + off; x < W + 240; x += 60) d += ` q15 ${-r.a} 30 0 t30 0`
        return (
          <g key={i} className="kt-drift" style={{ animationDuration: `${8 + i * 3}s` }}>
            <path d={d} fill="none" stroke="#fff" strokeWidth={2} opacity={r.o} strokeLinecap="round" />
          </g>
        )
      })}
    </g>
  )
}

/** Alan modeli: her bütünün altında bir kesir şeridi; teknenin konumuna kadar boyanır */
function Strip({ D, den, range, boat, fillId }: { D: number; den: number; range: [number, number]; boat: number | null; fillId: string }) {
  const P = usePlane()
  const y = Y0 + 49
  const h = 24
  const out = []
  const lines = D || (den && P.unitPx / den >= 5 ? den : 0)
  for (let w = Math.floor(range[0]); w < Math.ceil(range[1] - 1e-9); w++) {
    const x0 = P.sx(w), x1 = P.sx(w + 1)
    if (x1 < -10 || x0 > P.width + 10) continue
    const fillTo = boat === null ? x0 : clamp(P.sx(boat), x0, x1)
    out.push(
      <g key={w}>
        <rect x={x0 + 1.5} y={y} width={x1 - x0 - 3} height={h} rx={5} fill="#fff8ec" stroke="#0b3954" strokeWidth={1.5} />
        {fillTo > x0 + 1.5 && <rect x={x0 + 1.5} y={y} width={fillTo - x0 - 1.5} height={h} rx={5} fill={`url(#${fillId})`} />}
        {lines > 1 &&
          Array.from({ length: Math.min(lines, 1200) - 1 }, (_, i) => {
            const px = P.sx(w + (i + 1) / lines)
            if (px < -2 || px > P.width + 2) return null
            const major = D && den && ((i + 1) * den) % lines === 0
            return <line key={i} x1={px} x2={px} y1={y + (major ? 0 : 5)} y2={y + h - (major ? 0 : 5)} stroke="#0b3954" strokeWidth={major ? 1.5 : 1} opacity={major ? 0.9 : 0.55} />
          })}
        {x1 - x0 > 130 && (
          <text x={(x0 + x1) / 2} y={y + h + 14} textAnchor="middle" fontSize={11} fontWeight={800} fill="#e0f2fe" opacity={0.9}>1 bütün</text>
        )}
      </g>,
    )
  }
  return <g>{out}</g>
}

function Ticks({ D, den, decimal, range }: { D: number; den: number; decimal: boolean; range: [number, number] }) {
  const P = usePlane()
  if (!D) return null
  const lo = Math.max(range[0], P.view.xMin)
  const hi = Math.min(range[1], P.view.xMax)
  const k0 = Math.ceil(lo * D - 1e-9)
  const k1 = Math.floor(hi * D + 1e-9)
  const gap = P.unitPx / D
  const needLabel = decimal ? 46 : 34
  const out = []
  for (let k = k0; k <= k1 && out.length < 1500; k++) {
    if (k % D === 0) continue
    const x = P.sx(k / D)
    const major = (k * den) % D === 0
    const mult = decimal ? 10 : 2
    const mid = D / mult >= den && k % (D / mult) === 0
    const showLabel = gap >= needLabel || (mid && gap * mult >= needLabel) || (major && P.unitPx / den >= needLabel && D !== den)
    out.push(
      <g key={k}>
        <line x1={x} x2={x} y1={Y0 - (major ? 11 : mid ? 9 : 7)} y2={Y0 + (major ? 11 : mid ? 9 : 7)} stroke="#fff" strokeWidth={major ? 2.5 : mid ? 2 : 1.4} strokeLinecap="round" />
        {showLabel && (
          <foreignObject x={x - 26} y={Y0 + 10} width={52} height={38}>
            <div className="flex h-full items-center justify-center text-[15px] leading-none font-black text-white [text-shadow:0_1px_2px_rgb(7_60_100/0.9),0_0_6px_rgb(7_60_100/0.6)]">
              <MathText text={tickLabel(k, D, decimal)} />
            </div>
          </foreignObject>
        )}
      </g>,
    )
  }
  return <g>{out}</g>
}

function Wholes({ range }: { range: [number, number] }) {
  const P = usePlane()
  const out = []
  for (let w = Math.ceil(range[0]); w <= Math.floor(range[1]); w++) {
    const x = P.sx(w)
    if (x < -30 || x > P.width + 30) continue
    out.push(
      <g key={w}>
        <line x1={x} x2={x} y1={Y0 - 14} y2={Y0 + 14} stroke="#fff" strokeWidth={3.5} strokeLinecap="round" />
        <rect x={x - 15} y={Y0 + 15} width={30} height={24} rx={12} fill="#0b3954" stroke="#fff" strokeWidth={2} />
        <text x={x} y={Y0 + 32} textAnchor="middle" fontSize={15} fontWeight={900} fill="#fff">{w}</text>
      </g>,
    )
  }
  return <g>{out}</g>
}

function HalfBuoy() {
  const P = usePlane()
  const x = P.sx(0.5)
  return (
    <g transform={`translate(${x} ${Y0})`} pointerEvents="none">
      <path d="M-7 -4 Q0 -18 7 -4 Z" fill="#facc15" stroke="#854d0e" strokeWidth={1.5} />
      <line x1={0} y1={-16} x2={0} y2={-30} stroke="#854d0e" strokeWidth={2} />
      <path d="M0 -30 L14 -26 L0 -22 Z" fill="#facc15" stroke="#854d0e" strokeWidth={1} />
      <foreignObject x={-20} y={-60} width={40} height={30}>
        <div className="flex h-full items-center justify-center text-[13px] font-black text-amber-900"><span className="rounded-md bg-amber-200/90 px-1"><MathText text="[[1/2]]" /></span></div>
      </foreignObject>
    </g>
  )
}

function Lighthouse() {
  const P = usePlane()
  const x = P.sx(0)
  if (x < -20 || x > P.width + 90) return null
  return (
    <g transform={`translate(${x - 34} ${Y0 - 6})`} pointerEvents="none">
      <path d="M-30 4 Q-18 -14 0 -12 Q18 -14 30 4 Z" fill="#8a7a63" />
      <path d="M-24 2 Q-10 -9 2 -8 Q16 -10 24 2 Z" fill="#a8977c" />
      <polygon points="-10,-10 10,-10 7,-84 -7,-84" fill="#fff" stroke="#334155" strokeWidth={1.5} />
      <polygon points="-9.2,-30 9.2,-30 8.4,-46 -8.4,-46" fill="#e11d48" />
      <polygon points="-7.9,-62 7.9,-62 7.3,-76 -7.3,-76" fill="#e11d48" />
      <rect x={-10} y={-98} width={20} height={14} rx={3} fill="#fde68a" stroke="#334155" strokeWidth={1.5} />
      <path d="M-12 -98 L0 -110 L12 -98 Z" fill="#334155" />
      <polygon className="kt-beam" points="10,-92 120,-120 120,-64" fill="#fff8b5" />
      <polygon className="kt-beam" points="-10,-92 -120,-120 -120,-64" fill="#fff8b5" style={{ animationDelay: '1.5s' }} />
    </g>
  )
}

function Harbor({ x: v, label }: { x: number; label: string }) {
  const P = usePlane()
  const x = P.sx(v)
  return (
    <g transform={`translate(${x} ${Y0})`} pointerEvents="none">
      <ellipse cx={0} cy={-3} rx={46} ry={8} fill="#f7d79c" />
      <rect x={-40} y={-12} width={80} height={8} rx={2} fill="#8b5e34" />
      {[-34, -14, 6, 26].map((p) => <rect key={p} x={p} y={-12} width={4} height={18} fill="#6b4423" />)}
      <rect x={-2} y={-100} width={4} height={90} fill="#6b4423" />
      <path d="M2 -100 L40 -92 L2 -82 Z" fill="#facc15" stroke="#854d0e" strokeWidth={1.2} />
      <rect x={-1.5} y={-12} width={3} height={24} fill="#facc15" />
      <foreignObject x={-44} y={-150} width={88} height={44}>
        <div className="flex h-full items-center justify-center">
          <span className="rounded-xl bg-amber-300 px-2.5 py-0.5 text-[17px] font-black text-amber-950 shadow ring-2 ring-white"><MathText text={label} /></span>
        </div>
      </foreignObject>
    </g>
  )
}

function IslandArt({ is, lift, small }: { is: Island; lift: number; small: boolean }) {
  const P = usePlane()
  const x = P.sx(is.x)
  if (x < -90 || x > P.width + 90) return null
  const kind = is.kind ?? 'palm'
  const s = kind === 'mini' ? 0.6 : small ? 0.8 : 1
  const ghost = is.tone === 'ghost'
  const gold = is.tone === 'gold'
  return (
    <g transform={`translate(${x} ${Y0 - 4})`} pointerEvents="none" opacity={ghost ? 0.55 : 1}>
      <g className={is.fresh ? 'kt-rise' : undefined}>
        <line x1={0} y1={-4} x2={0} y2={6} stroke="#fde68a" strokeWidth={3} />
        <g transform={`scale(${s})`}>
          <ellipse cx={0} cy={0} rx={40} ry={9} fill="#fff" opacity={0.35} />
          <path d="M-36 0 Q-24 -20 0 -20 Q24 -20 36 0 Z" fill="#f2cf8d" />
          {kind === 'palm' && (
            <>
              <path d="M-26 -8 Q-8 -36 18 -22 Q26 -14 28 -6 Z" fill="#34a853" />
              <path d="M6 -22 Q2 -46 -4 -64" stroke="#8a5a2b" strokeWidth={5} fill="none" strokeLinecap="round" />
              <path d="M-4 -64 q-22 -4 -32 10 M-4 -64 q22 -8 34 6 M-4 -64 q-8 -16 -26 -18 M-4 -64 q12 -16 30 -14" stroke="#15803d" strokeWidth={6} fill="none" strokeLinecap="round" />
            </>
          )}
          {kind === 'hill' && (
            <>
              <path d="M-30 -8 Q-12 -58 8 -46 Q24 -36 32 -6 Z" fill="#2f9e5b" />
              <path d="M-12 -40 Q-2 -54 8 -46" stroke="#86efac" strokeWidth={3} fill="none" />
              <circle cx={18} cy={-22} r={7} fill="#15803d" />
            </>
          )}
          {kind === 'house' && (
            <>
              <path d="M-28 -8 Q-10 -30 20 -22 Q28 -16 30 -6 Z" fill="#3fae64" />
              <rect x={-12} y={-42} width={24} height={22} fill="#fef3c7" stroke="#7c2d12" strokeWidth={1.5} />
              <path d="M-16 -42 L0 -56 L16 -42 Z" fill="#dc2626" />
              <rect x={-3} y={-32} width={7} height={12} fill="#7c2d12" />
            </>
          )}
          {kind === 'rock' && (
            <>
              <path d="M-22 -6 L-14 -34 L0 -44 L14 -30 L24 -6 Z" fill="#7c8a99" />
              <path d="M-14 -34 L0 -44 L4 -22 Z" fill="#a3b1bf" />
            </>
          )}
          {kind === 'mini' && <path d="M-20 -8 Q0 -34 20 -8 Z" fill="#3fae64" />}
        </g>
        <g transform={`translate(0 ${-(kind === 'mini' ? 52 : 92) - lift})`}>
          <line x1={0} y1={18} x2={0} y2={(kind === 'mini' ? 30 : 34) + lift} stroke="#6b4423" strokeWidth={2} />
          <foreignObject x={-38} y={-22} width={76} height={42}>
            <div className="flex h-full items-center justify-center">
              <span className={`rounded-xl px-2 py-0.5 text-[16px] font-black shadow ring-2 ${gold ? 'bg-amber-300 text-amber-950 ring-white' : 'bg-white text-sky-950 ring-sky-200'}`}><MathText text={is.label} /></span>
            </div>
          </foreignObject>
        </g>
      </g>
    </g>
  )
}

function Bridge({ a, b }: { a: number; b: number }) {
  const P = usePlane()
  const x0 = P.sx(Math.min(a, b)), x1 = P.sx(Math.max(a, b))
  const mid = (x0 + x1) / 2
  const sag = Y0 - 18
  const planks = Math.max(3, Math.floor((x1 - x0) / 12))
  return (
    <g pointerEvents="none" className="kt-rise">
      <path d={`M${x0} ${Y0 - 22} Q${mid} ${sag + 16} ${x1} ${Y0 - 22}`} stroke="#6b4423" strokeWidth={3} fill="none" />
      {Array.from({ length: planks }, (_, i) => {
        const t = (i + 0.5) / planks
        const x = x0 + (x1 - x0) * t
        const y = (1 - t) * (1 - t) * (Y0 - 22) + 2 * (1 - t) * t * (sag + 16) + t * t * (Y0 - 22)
        return <rect key={i} x={x - 4} y={y - 1} width={8} height={5} rx={1} fill="#b45309" />
      })}
      <path d={`M${x0} ${Y0 - 34} Q${mid} ${sag + 4} ${x1} ${Y0 - 34}`} stroke="#92400e" strokeWidth={1.5} fill="none" />
    </g>
  )
}

function Anchor({ x: v }: { x: number }) {
  const P = usePlane()
  const x = P.sx(v)
  return (
    <g transform={`translate(${x} ${Y0})`} pointerEvents="none">
      <line x1={0} y1={-26} x2={0} y2={12} stroke="#f97316" strokeWidth={2} strokeDasharray="3 3" />
      <circle r={7} fill="#f97316" stroke="#fff" strokeWidth={2.5} />
      <rect x={-27} y={-44} width={54} height={18} rx={9} fill="#f97316" />
      <text y={-31} textAnchor="middle" fontSize={11} fontWeight={900} fill="#fff">tahminin</text>
    </g>
  )
}

function Boat({ x: v, onBoat, locked, D, range, free, den }: ChartProps & { x: number; D: number }) {
  const P = usePlane()
  const ref = useRef<SVGGElement>(null)
  useGesture(
    {
      onDrag: ({ xy: [cx, cy], last, event }) => {
        event.stopPropagation()
        if (locked || !onBoat) return
        const p = P.fromClient(cx, cy)
        onBoat(snapX(p.x, { range, free, den } as ChartProps, D), last)
      },
    },
    { target: ref, eventOptions: { passive: false } },
  )
  const x = P.sx(v)
  return (
    <g ref={ref} data-handle style={{ cursor: locked ? 'default' : 'grab', touchAction: 'none' }} transform={`translate(${x} ${Y0})`}>
      <rect x={-34} y={-78} width={68} height={100} fill="transparent" />
      <circle r={13} fill="#fff" opacity={0.25} className="kt-glow" />
      <line x1={0} y1={-6} x2={0} y2={8} stroke="#be185d" strokeWidth={2} />
      <circle r={5} fill="#d6457a" stroke="#fff" strokeWidth={2} />
      <g className="kt-bob">
        <path d="M-28 -12 L28 -12 L19 -2 L-19 -2 Z" fill="#7c2d12" />
        <path d="M-28 -12 L28 -12 L26 -9 L-26 -9 Z" fill="#fbbf24" />
        <rect x={-1.5} y={-70} width={3} height={58} fill="#4b2e14" />
        <path d="M2 -68 Q30 -40 24 -15 L2 -15 Z" fill="#fff" stroke="#cbd5e1" strokeWidth={1} />
        <path d="M2 -42 Q24 -34 25 -24 L2 -24 Z" fill="#d6457a" opacity={0.9} />
        <path d="M-2 -60 Q-22 -38 -20 -16 L-2 -16 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth={1} />
        <path d="M0 -70 L14 -66 L0 -62 Z" fill="#d6457a" />
      </g>
    </g>
  )
}
