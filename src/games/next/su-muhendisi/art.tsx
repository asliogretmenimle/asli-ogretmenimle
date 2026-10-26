import { useRef, useState, type ReactNode } from 'react'
import { markLabel, type VesselDef } from './water'

/**
 * Su Mühendisi sahnesi (SVG 800 × 500): duvar, ana boru, musluklar, gider, kaplar.
 * Kaplar düz duvarlıdır: doluluk oranı = su yüksekliği oranı (matematiksel olarak doğru model).
 * Etkileşim: kabı başka bir kabın üstüne sürükle (dök) ya da gidere sürükle (boşalt); dokun-dokun alternatifi üst bileşende.
 */

export const VW = 800
export const VH = 500
const FLOOR = 432
const H_MAX = 250
const W_MAX = 150

export interface Place {
  id: string
  x: number
  /** iç tabanın y'si */
  y: number
  w: number
  h: number
  /** etiketler için solda bırakılan pay */
  padL: number
}

export type Anim =
  | { kind: 'pour'; from: string; to: string; t: number; a0: Record<string, number>; a1: Record<string, number> }
  | { kind: 'fill' | 'drain'; id: string; t: number; a0: Record<string, number>; a1: Record<string, number> }

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

/** Kapların boyutu: iç alan kapasiteyle orantılı (sınırlar içinde), hepsi aynı zemine oturur */
export function layout(vs: VesselDef[], drain: boolean): Place[] {
  const maxCap = Math.max(...vs.map((v) => v.cap * (v.scale ?? 1)))
  const dims = vs.map((v) => {
    const r = (v.cap * (v.scale ?? 1)) / maxCap
    const area = W_MAX * H_MAX * r
    let h = clamp(H_MAX * Math.sqrt(r), 92, H_MAX)
    if (v.kind === 'bottle') h = clamp(h * 1.18, 92, H_MAX)
    const w = clamp(area / h, 58, 176)
    const padL = v.marks && v.marks.labels !== 'none' ? 38 : 14
    return { w, h, padL }
  })
  const right = drain ? 690 : 780
  const left = 24
  const need = dims.reduce((s, d) => s + d.padL + d.w + 18, 0)
  const free = Math.max(0, right - left - need)
  const gap = free / (vs.length + 1)
  let x = left + gap
  return vs.map((v, i) => {
    const d = dims[i]
    x += d.padL
    const p: Place = { id: v.id, x, y: FLOOR - 14, w: d.w, h: d.h, padL: d.padL }
    x += d.w + 18 + gap
    return p
  })
}

/* ───────────── Arka plan ───────────── */

function Backdrop({ gauge, label }: { gauge: number; label?: string }) {
  const ang = -120 + 240 * clamp(gauge, 0, 1)
  return (
    <g>
      <defs>
        <pattern id="sm-tiles" width="44" height="30" patternUnits="userSpaceOnUse">
          <rect width="44" height="30" fill="#e6f1f8" />
          <path d="M0 0H44M0 15H44M22 0V15M0 15V30M44 15V30" stroke="#d3e4ef" strokeWidth="1.4" />
        </pattern>
        <linearGradient id="sm-pipe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cbd5e1" /><stop offset=".35" stopColor="#f8fafc" /><stop offset=".7" stopColor="#94a3b8" /><stop offset="1" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="sm-pipeV" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#94a3b8" /><stop offset=".4" stopColor="#f1f5f9" /><stop offset="1" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="sm-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfd8e3" /><stop offset="1" stopColor="#aab6c5" />
        </linearGradient>
        <linearGradient id="sm-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5cc8f5" /><stop offset=".55" stopColor="#1ea0e0" /><stop offset="1" stopColor="#0b6fb0" />
        </linearGradient>
        <linearGradient id="sm-glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".55" /><stop offset=".18" stopColor="#e0f2fe" stopOpacity=".25" /><stop offset=".8" stopColor="#e0f2fe" stopOpacity=".15" /><stop offset="1" stopColor="#bae6fd" stopOpacity=".45" />
        </linearGradient>
        <linearGradient id="sm-steel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2e8f0" /><stop offset=".5" stopColor="#94a3b8" /><stop offset="1" stopColor="#475569" />
        </linearGradient>
        <pattern id="sm-stream" width="10" height="24" patternUnits="userSpaceOnUse">
          <rect width="10" height="24" fill="#38bdf8" />
          <rect x="2" width="2" height="14" fill="#e0f2fe" opacity=".7" />
          <animateTransform attributeName="patternTransform" type="translate" from="0 0" to="0 24" dur=".35s" repeatCount="indefinite" />
        </pattern>
      </defs>
      <rect width={VW} height={VH} fill="url(#sm-tiles)" />
      {/* zemin */}
      <rect y={FLOOR} width={VW} height={VH - FLOOR} fill="url(#sm-floor)" />
      <path d={`M0 ${FLOOR}H${VW}`} stroke="#8a99ab" strokeWidth="3" />
      {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${i * 100 + 40} ${FLOOR + 2}l-30 ${VH - FLOOR}`} stroke="#b9c4d1" strokeWidth="2" />)}
      {/* ana boru */}
      <rect x="0" y="40" width={VW} height="22" fill="url(#sm-pipe)" />
      {Array.from({ length: 8 }, (_, i) => (
        <g key={i} transform={`translate(${i * 108 + 40} 36)`}>
          <rect width="12" height="30" rx="2" fill="url(#sm-pipeV)" stroke="#64748b" />
          <circle cx="6" cy="5" r="1.6" fill="#475569" /><circle cx="6" cy="25" r="1.6" fill="#475569" />
        </g>
      ))}
      {/* su kulesinden gelen boru ve manometre */}
      <g transform="translate(18 72)">
        <circle cx="34" cy="34" r="33" fill="#f8fafc" stroke="#475569" strokeWidth="4" />
        <circle cx="34" cy="34" r="27" fill="#fff" stroke="#cbd5e1" />
        {Array.from({ length: 9 }, (_, i) => {
          const a = ((-120 + i * 30) * Math.PI) / 180
          return <line key={i} x1={34 + Math.sin(a) * 20} y1={34 - Math.cos(a) * 20} x2={34 + Math.sin(a) * 25} y2={34 - Math.cos(a) * 25} stroke={i > 6 ? '#ef4444' : '#334155'} strokeWidth={i % 2 ? 1.5 : 2.5} />
        })}
        <g style={{ transition: 'transform .6s cubic-bezier(.3,1.6,.5,1)' }} transform={`rotate(${ang} 34 34)`}>
          <path d="M32.5 34 L34 13 L35.5 34 Z" fill="#dc2626" />
        </g>
        <circle cx="34" cy="34" r="4" fill="#334155" />
        <text x="34" y="54" textAnchor="middle" fontSize="8" fontWeight="900" fill="#64748b">BAR</text>
        <rect x="30" y="-12" width="8" height="14" fill="url(#sm-pipeV)" />
      </g>
      {label && (
        <g transform="translate(96 76)">
          <rect width={Math.max(84, label.length * 8.4 + 20)} height="28" rx="8" fill="#0f3a5a" />
          <text x="10" y="19" fontSize="14" fontWeight="900" fill="#e0f2fe">{label}</text>
        </g>
      )}
    </g>
  )
}

/** Musluk: ana borudan inen boru, vana çarkı ve ağız */
function Faucet({ x, top, open, onPress, onHold, big }: { x: number; top: number; open: boolean; onPress?: () => void; onHold?: (on: boolean) => void; big: boolean }) {
  const spoutY = top - 26
  const valveY = Math.min(104, spoutY - 30)
  const interactive = !!(onPress || onHold)
  const hit = big ? 66 : 58
  return (
    <g>
      <rect x={x - 7} y={60} width={14} height={spoutY - 60} fill="url(#sm-pipeV)" stroke="#64748b" strokeWidth="1" />
      <path d={`M${x - 11} ${spoutY - 6}h22v8l-5 6h-12l-5 -6z`} fill="url(#sm-steel)" stroke="#475569" />
      <g transform={`translate(${x} ${valveY})`} style={{ transition: 'transform .3s' }}>
        <g transform={`rotate(${open ? 90 : 0})`} style={{ transition: 'transform .35s' }}>
          <circle r="15" fill="none" stroke={open ? '#16a34a' : '#dc2626'} strokeWidth="5" />
          <path d="M-15 0H15M0 -15V15" stroke={open ? '#16a34a' : '#dc2626'} strokeWidth="4" />
        </g>
        <circle r="4.5" fill="#1e293b" />
      </g>
      {interactive && (
        <rect
          data-handle
          x={x - hit / 2}
          y={valveY - hit / 2}
          width={hit}
          height={hit}
          rx={14}
          fill="transparent"
          style={{ cursor: 'pointer' }}
          onPointerDown={(e) => {
            e.stopPropagation()
            if (onHold) {
              ;(e.target as Element).setPointerCapture?.(e.pointerId)
              onHold(true)
            }
          }}
          onPointerUp={(e) => {
            e.stopPropagation()
            if (onHold) onHold(false)
            else onPress?.()
          }}
          onPointerCancel={() => onHold?.(false)}
          onPointerLeave={() => onHold?.(false)}
          aria-label="Musluk"
        />
      )}
    </g>
  )
}

function Drain({ active, hot }: { active: boolean; hot: boolean }) {
  return (
    <g transform={`translate(744 ${FLOOR + 22})`}>
      <ellipse rx="44" ry="15" fill={hot ? '#bae6fd' : '#64748b'} opacity={hot ? 1 : 0.9} stroke={hot ? '#0284c7' : '#334155'} strokeWidth={hot ? 3 : 2} />
      {[-24, -12, 0, 12, 24].map((d) => <line key={d} x1={d} y1={-11 + Math.abs(d) / 4} x2={d} y2={11 - Math.abs(d) / 4} stroke="#1e293b" strokeWidth="3" />)}
      {active && <ellipse rx="30" ry="9" fill="#38bdf8" opacity=".6"><animate attributeName="rx" values="10;34;10" dur=".9s" repeatCount="indefinite" /></ellipse>}
      <text y="-24" textAnchor="middle" fontSize="13" fontWeight="900" fill="#334155">GİDER</text>
    </g>
  )
}

/* ───────────── Kap ───────────── */

function VesselArt({ v, p, amt, selected, tilt, pivotRight, prediction, badge, hideMarks, readout, dim, big }: { v: VesselDef; p: Place; amt: number; selected: boolean; tilt: number; pivotRight: boolean; prediction?: number; badge?: string; hideMarks?: boolean; readout?: string | null; dim?: boolean; big: boolean }) {
  const { w, h } = p
  const f = clamp(amt / v.cap, 0, 1)
  const wy = -h * f
  const clip = `sm-clip-${v.id}`
  const color = v.color ?? '#0369a1'
  const marks = v.marks
  const px = pivotRight ? w : 0
  const steel = v.kind === 'tank'
  return (
    <g opacity={dim ? 0.55 : 1}>
      <g transform={`rotate(${tilt} ${px} ${-h})`}>
        {/* gövde arkası ve gölge */}
        <ellipse cx={w / 2} cy={14} rx={w / 2 + 10} ry={7} fill="rgb(15 23 42 / .18)" />
        {v.kind === 'bucket' && <path d={`M${-2} ${-h - 4} Q${w / 2} ${-h - 58} ${w + 2} ${-h - 4}`} fill="none" stroke="#475569" strokeWidth="4" />}
        {v.kind === 'bottle' && (
          <g>
            <rect x={w / 2 - Math.min(18, w * 0.22)} y={-h - 30} width={Math.min(36, w * 0.44)} height={30} rx={6} fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="2.5" />
            <rect x={w / 2 - Math.min(20, w * 0.25)} y={-h - 38} width={Math.min(40, w * 0.5)} height={10} rx={3} fill={color} />
          </g>
        )}
        {(v.kind === 'jug' || v.kind === 'cup') && (
          <path d={`M${w + 3} ${-h + h * 0.14} q${v.kind === 'cup' ? 20 : 30} 6 ${v.kind === 'cup' ? 20 : 30} ${h * 0.3} t-${v.kind === 'cup' ? 20 : 30} ${h * 0.3}`} fill="none" stroke={color} strokeWidth={v.kind === 'cup' ? 6 : 8} strokeLinecap="round" />
        )}
        <rect x={-5} y={-h - 5} width={w + 10} height={h + 11} rx={10} fill="#f0f9ff" fillOpacity=".55" stroke={selected ? '#f59e0b' : '#7cc3e8'} strokeWidth={selected ? 5 : 3} />
        <clipPath id={clip}><rect x={0} y={-h} width={w} height={h + 2} rx={6} /></clipPath>
        <g clipPath={`url(#${clip})`}>
          {f > 0 && (
            <g transform={`rotate(${-tilt} ${w / 2} ${wy})`}>
              <rect x={-w} y={wy + 3} width={w * 3} height={h * 2 + 40} fill="url(#sm-water)" />
              <g transform={`translate(0 ${wy})`}>
                <path d={`M${-w * 1.5} 4 ${Array.from({ length: Math.ceil((w * 4) / 40) + 2 }, () => 'q10 -5 20 0 t20 0').join(' ')} V12 H${-w * 1.5} Z`} fill="#7dd3fc">
                  <animateTransform attributeName="transform" type="translate" from="0 0" to="40 0" dur="1.6s" repeatCount="indefinite" />
                </path>
              </g>
              {/* kabarcıklar */}
              {f > 0.08 && [0.22, 0.55, 0.8].map((xx, i) => (
                <circle key={i} cx={w * xx} cy={-4} r={2 + i} fill="#e0f2fe" opacity=".55">
                  <animate attributeName="cy" values={`${-4};${wy + 8}`} dur={`${2.2 + i * 0.7}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" values=".6;.6;0" dur={`${2.2 + i * 0.7}s`} repeatCount="indefinite" />
                </circle>
              ))}
            </g>
          )}
        </g>
        {/* cam parlaması */}
        <rect x={0} y={-h} width={w} height={h} rx={6} fill="url(#sm-glass)" pointerEvents="none" />
        <rect x={w * 0.08} y={-h + 8} width={Math.max(4, w * 0.06)} height={h - 16} rx={3} fill="#fff" opacity=".45" />
        {/* çizgiler */}
        {marks && !hideMarks && Array.from({ length: marks.div - 1 }, (_, i) => {
          const k = i + 1
          const y = (-h * k) / marks.div
          const showLbl = marks.labels === 'all' || (Array.isArray(marks.labels) && marks.labels.includes(k))
          const major = showLbl || marks.div <= 4
          return (
            <g key={k}>
              <line x1={0} x2={major ? Math.min(30, w * 0.4) : Math.min(18, w * 0.25)} y1={y} y2={y} stroke="#0c4a6e" strokeWidth={major ? 2.6 : 1.8} />
              {tilt === 0 && showLbl && <text x={-8} y={y + 4.5} textAnchor="end" fontSize={big ? 14 : 13} fontWeight="900" fill="#0c4a6e">{markLabel(k, marks.div, v.cap, marks.fmt)}</text>}
            </g>
          )
        })}
        {marks && !hideMarks && tilt === 0 && (marks.labels === 'all' || marks.labels === 'last' || Array.isArray(marks.labels)) && (
          <text x={-8} y={-h + 5} textAnchor="end" fontSize={big ? 14 : 13} fontWeight="900" fill="#0c4a6e">{markLabel(marks.div, marks.div, v.cap, marks.fmt)}</text>
        )}
        {marks && !hideMarks && tilt === 0 && marks.labels !== 'none' && marks.labels !== undefined && (
          <text x={-8} y={4} textAnchor="end" fontSize={big ? 14 : 13} fontWeight="900" fill="#0c4a6e">0</text>
        )}
        {/* çelik bantlar */}
        {steel && (
          <g pointerEvents="none">
            <rect x={-8} y={-h - 12} width={w + 16} height={11} rx={4} fill="url(#sm-steel)" />
            <rect x={-8} y={2} width={w + 16} height={11} rx={4} fill="url(#sm-steel)" />
            {Array.from({ length: Math.max(2, Math.floor(w / 26)) }, (_, i, a) => (
              <g key={i}>
                <circle cx={-2 + ((w + 4) * (i + 0.5)) / a.length} cy={-h - 6.5} r={1.8} fill="#334155" />
                <circle cx={-2 + ((w + 4) * (i + 0.5)) / a.length} cy={7.5} r={1.8} fill="#334155" />
              </g>
            ))}
          </g>
        )}
        {!steel && <rect x={-6} y={-h - 9} width={w + 12} height={7} rx={3.5} fill={color} opacity=".9" pointerEvents="none" />}
      </g>
      {/* tahmin çizgisi */}
      {prediction !== undefined && tilt === 0 && (
        <g pointerEvents="none">
          <line x1={-8} x2={w + 8} y1={-h * prediction} y2={-h * prediction} stroke="#e11d48" strokeWidth="3" strokeDasharray="8 5" />
          <path d={`M${w + 8} ${-h * prediction} l12 -8 v16 z`} fill="#e11d48" />
          <text x={w + 22} y={-h * prediction + 4} fontSize="12" fontWeight="900" fill="#be123c">tahmin</text>
        </g>
      )}
      {/* plaka */}
      {tilt === 0 && (
        <g transform={`translate(${w / 2} 24)`} pointerEvents="none">
          <rect x={-Math.max(w / 2 + 6, 44)} y={0} width={Math.max(w + 12, 88)} height={v.note ? 40 : 24} rx={8} fill={color} />
          <text y={17} textAnchor="middle" fontSize={big ? 15 : 14} fontWeight="900" fill="#fff">{v.plate ?? v.name}</text>
          {v.note && <text y={34} textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#e0f2fe">{v.note}</text>}
        </g>
      )}
      {readout && tilt === 0 && (
        <g transform={`translate(${w / 2} ${-h - 34})`} pointerEvents="none">
          <rect x={-40} y={-15} width={80} height={26} rx={8} fill="#0f172a" />
          <text y={4} textAnchor="middle" fontSize="14" fontWeight="900" fill="#7dd3fc" fontFamily="ui-monospace, monospace">{readout}</text>
        </g>
      )}
      {badge && (
        <g transform={`translate(${w / 2} ${-h - (v.kind === 'bottle' ? 64 : 36)})`} pointerEvents="none">
          <circle r="17" fill="#f59e0b" stroke="#fff" strokeWidth="3" />
          <text y="6" textAnchor="middle" fontSize="17" fontWeight="900" fill="#fff">{badge}</text>
        </g>
      )}
    </g>
  )
}

/* ───────────── Sahne ───────────── */

export interface WorksProps {
  vessels: VesselDef[]
  amounts: Record<string, number>
  anim: Anim | null
  /** Musluğu açık olan kaplar (akış çizgisi) */
  flowing?: string[]
  selected?: string | null
  drain?: boolean
  canDrag?: (id: string) => boolean
  predictions?: Record<string, number>
  badges?: Record<string, string>
  hideMarks?: Record<string, boolean>
  readout?: (id: string) => string | null
  dim?: (id: string) => boolean
  gauge?: number
  label?: string
  big?: boolean
  onVessel?: (id: string, frac: number) => void
  onDrop?: (from: string, to: string | 'drain') => void
  onFaucet?: (id: string) => void
  onFaucetHold?: (id: string, on: boolean) => void
  onBackground?: () => void
  /** Musluğu olmayan kaplara musluk çizme */
  extra?: ReactNode
}

export function Works(props: WorksProps) {
  const { vessels, amounts, anim, flowing = [], selected, drain = false, canDrag, predictions, badges, hideMarks, readout, dim, gauge = 0, label, big = false } = props
  const svgRef = useRef<SVGSVGElement>(null)
  const places = layout(vessels, drain)
  const P = (id: string) => places.find((p) => p.id === id)!
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number; over: string | null } | null>(null)

  const toSvg = (cx: number, cy: number) => {
    const r = svgRef.current!.getBoundingClientRect()
    const s = r.width / VW
    return { x: (cx - r.left) / s, y: (cy - r.top) / s, s }
  }
  const hitAt = (x: number, y: number, except: string): string | null => {
    if (drain && Math.abs(x - 744) < 70 && y > FLOOR - 50) return 'drain'
    for (const p of places) {
      if (p.id === except) continue
      const v = vessels.find((q) => q.id === p.id)!
      const top = p.y - p.h - (v.kind === 'bottle' ? 40 : 30)
      if (x >= p.x - 22 && x <= p.x + p.w + 22 && y >= top - 40 && y <= p.y + 46) return p.id
    }
    return null
  }

  const down = (e: React.PointerEvent, id: string) => {
    if (anim) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.stopPropagation()
    const start = toSvg(e.clientX, e.clientY)
    const draggable = canDrag?.(id) ?? false
    const pid = e.pointerId
    let moved = false
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return
      const c = toSvg(ev.clientX, ev.clientY)
      if (!moved && Math.hypot(c.x - start.x, c.y - start.y) * c.s > 9) moved = true
      if (moved && draggable) setDrag({ id, dx: c.x - start.x, dy: c.y - start.y, over: hitAt(c.x, c.y, id) })
    }
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      setDrag(null)
      if (ev.type === 'pointercancel') return
      const c = toSvg(ev.clientX, ev.clientY)
      if (moved && draggable) {
        const t = hitAt(c.x, c.y, id)
        if (t) props.onDrop?.(id, t)
      } else if (!moved) {
        const p = P(id)
        props.onVessel?.(id, clamp((p.y - c.y) / p.h, 0, 1))
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  // dökme animasyonu: kaynak kap hedefin üstüne gider ve eğilir
  const pourPose = (id: string) => {
    if (!anim || anim.kind !== 'pour' || anim.from !== id) return null
    const a = P(anim.from), b = P(anim.to)
    const right = b.x + b.w / 2 >= a.x + a.w / 2
    // dönme noktası: kabın hedefe bakan üst köşesi
    const cornerX = right ? a.x + a.w : a.x
    const cornerY = a.y - a.h
    const tx = (right ? b.x + b.w * 0.42 : b.x + b.w * 0.58) - cornerX
    const ty = Math.min(b.y - b.h - 46, 150) - cornerY
    const t = anim.t
    const m = t < 0.3 ? ease(t / 0.3) : t > 0.82 ? ease(1 - (t - 0.82) / 0.18) : 1
    const tilt = t < 0.3 ? 0 : t < 0.42 ? ((t - 0.3) / 0.12) * 72 : t < 0.78 ? 72 : t < 0.86 ? 72 * (1 - (t - 0.78) / 0.08) : 0
    return { dx: tx * m, dy: ty * m, tilt: right ? tilt : -tilt, right, spout: { x: cornerX + tx, y: cornerY + ty } }
  }

  const amtOf = (id: string) => amounts[id] ?? 0
  const ordered = [...vessels].sort((a, b) => Number(a.id === drag?.id || (anim?.kind === 'pour' && anim.from === a.id)) - Number(b.id === drag?.id || (anim?.kind === 'pour' && anim.from === b.id)))

  // akış çizgileri
  const streams: ReactNode[] = []
  for (const id of flowing) {
    const p = P(id)
    const top = p.y - p.h - 26 + 8
    const surf = p.y - p.h * clamp(amtOf(id) / vessels.find((v) => v.id === id)!.cap, 0, 1)
    streams.push(<rect key={`s${id}`} x={p.x + p.w / 2 - 5} y={top} width={10} height={Math.max(0, surf - top)} rx={4} fill="url(#sm-stream)" opacity=".9" />)
  }
  if (anim?.kind === 'fill') {
    const p = P(anim.id)
    const top = p.y - p.h - 18
    const v = vessels.find((q) => q.id === anim.id)!
    const surf = p.y - p.h * clamp(amtOf(anim.id) / v.cap, 0, 1)
    if (anim.t < 0.92) streams.push(<rect key="sf" x={p.x + p.w / 2 - 5} y={top} width={10} height={Math.max(0, surf - top)} rx={4} fill="url(#sm-stream)" opacity=".9" />)
  }
  if (anim?.kind === 'drain') {
    const p = P(anim.id)
    if (anim.t < 0.9) streams.push(<path key="sd" d={`M${p.x + p.w / 2} ${p.y + 10} Q${(p.x + p.w / 2 + 744) / 2} ${p.y + 10} 744 ${FLOOR + 18}`} stroke="#38bdf8" strokeWidth="8" fill="none" strokeLinecap="round" opacity=".85" strokeDasharray="14 8"><animate attributeName="stroke-dashoffset" from="44" to="0" dur=".4s" repeatCount="indefinite" /></path>)
  }
  const pose = anim?.kind === 'pour' ? pourPose(anim.from) : null
  if (pose && anim?.kind === 'pour' && anim.t > 0.4 && anim.t < 0.8) {
    const b = P(anim.to)
    const vb = vessels.find((q) => q.id === anim.to)!
    const surf = b.y - b.h * clamp(amtOf(anim.to) / vb.cap, 0, 1)
    const sx = pose.spout.x + (pose.right ? 4 : -4)
    streams.push(<path key="sp" d={`M${sx} ${pose.spout.y + 2} Q${sx + (pose.right ? 6 : -6)} ${pose.spout.y + 20} ${sx + (pose.right ? 6 : -6)} ${surf}`} stroke="url(#sm-stream)" strokeWidth="11" fill="none" strokeLinecap="round" />)
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VW} ${VH}`}
      className="block h-auto w-full select-none"
      style={{ touchAction: 'none' }}
      onPointerUp={(e) => {
        if (e.target === e.currentTarget || (e.target as Element).getAttribute('data-bg')) props.onBackground?.()
      }}
      role="img"
      aria-label="Su tesisi"
    >
      <Backdrop gauge={gauge} label={label} />
      <rect data-bg="1" x={0} y={66} width={VW} height={VH - 66} fill="transparent" />
      {vessels.map((v) => {
        if (!v.tap) return null
        const p = P(v.id)
        const top = p.y - p.h - (v.kind === 'bottle' ? 38 : v.kind === 'bucket' ? 52 : 10)
        return (
          <Faucet
            key={`f${v.id}`}
            x={p.x + p.w / 2}
            top={top}
            big={big}
            open={flowing.includes(v.id) || (anim?.kind === 'fill' && anim.id === v.id)}
            onPress={props.onFaucet && !props.onFaucetHold ? () => props.onFaucet!(v.id) : undefined}
            onHold={props.onFaucetHold ? (on) => props.onFaucetHold!(v.id, on) : undefined}
          />
        )
      })}
      {drain && <Drain active={anim?.kind === 'drain'} hot={drag?.over === 'drain'} />}
      {streams}
      {ordered.map((v) => {
        const p = P(v.id)
        const ps = pourPose(v.id)
        const dg = drag?.id === v.id ? drag : null
        const dx = ps ? ps.dx : dg ? dg.dx : 0
        const dy = ps ? ps.dy : dg ? dg.dy : 0
        const isTarget = drag?.over === v.id
        const hitTop = p.y - p.h - (v.kind === 'bottle' ? 44 : v.kind === 'bucket' ? 40 : 18)
        return (
          <g key={v.id} transform={`translate(${p.x + dx} ${p.y + dy})`} style={{ transition: dg || ps ? undefined : 'transform .25s ease-out' }}>
            {isTarget && <rect x={-16} y={-p.h - 20} width={p.w + 32} height={p.h + 44} rx={16} fill="#fde68a" opacity=".55" />}
            <VesselArt
              v={v}
              p={p}
              amt={amtOf(v.id)}
              selected={selected === v.id || !!dg}
              tilt={ps?.tilt ?? 0}
              pivotRight={ps?.right ?? true}
              prediction={predictions?.[v.id]}
              badge={badges?.[v.id]}
              hideMarks={hideMarks?.[v.id]}
              readout={readout?.(v.id)}
              dim={dim?.(v.id)}
              big={big}
            />
            <rect
              data-handle
              x={-14}
              y={hitTop - p.y}
              width={p.w + 28}
              height={p.y - hitTop + 52}
              fill="transparent"
              style={{ cursor: canDrag?.(v.id) ? 'grab' : 'pointer', touchAction: 'none' }}
              onPointerDown={(e) => down(e, v.id)}
              aria-label={v.name}
            />
          </g>
        )
      })}
      {props.extra}
    </svg>
  )
}
