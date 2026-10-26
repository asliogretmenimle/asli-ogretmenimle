import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'
import { Box, PackageOpen, RotateCcw, RotateCw, Undo2 } from 'lucide-react'
import { frames, hingeAxis, type Face, type P2, type Prepared, type V3, worlds } from './net'
import { Slider } from '../donusum-studyosu/ortak'

/* ───────────── katlama animasyonu ───────────── */

export function useFold(initial = 0) {
  const [t, setTState] = useState(initial)
  const tRef = useRef(initial)
  tRef.current = t
  const raf = useRef(0)
  const [moving, setMoving] = useState(false)
  const animateTo = useCallback((to: number, done?: () => void, ms = 1500) => {
    cancelAnimationFrame(raf.current)
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const from = tRef.current
    const dur = (reduce ? 350 : ms) * Math.abs(to - from)
    if (dur < 20) {
      setTState(to)
      done?.()
      return
    }
    const start = performance.now()
    setMoving(true)
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / dur)
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
      setTState(from + (to - from) * e)
      if (k < 1) raf.current = requestAnimationFrame(step)
      else {
        setMoving(false)
        done?.()
      }
    }
    raf.current = requestAnimationFrame(step)
  }, [])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const setT = useCallback((v: number) => {
    cancelAnimationFrame(raf.current)
    setMoving(false)
    setTState(v)
  }, [])
  return { t, setT, animateTo, moving }
}

/* ───────────── renk ve ışık ───────────── */

function shade(hex: string, f: number) {
  const c = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.round(Math.max(0, Math.min(255, f >= 1 ? v + (255 - v) * (f - 1) : v * f)))
  return `rgb(${ch(c >> 16)}, ${ch((c >> 8) & 255)}, ${ch(c & 255)})`
}
const LIGHT: V3 = (() => {
  const v: V3 = [-0.35, -0.6, 0.72]
  const l = Math.hypot(...v)
  return v.map((x) => x / l) as V3
})()
function viewRotate([x0, y0, z]: V3, rx: number, ry: number, rz: number): V3 {
  // CSS: rotateX(rx) rotateY(ry) rotateZ(rz) → önce Z, sonra Y, sonra X
  const c = (rz * Math.PI) / 180
  const x = x0 * Math.cos(c) - y0 * Math.sin(c), y = x0 * Math.sin(c) + y0 * Math.cos(c)
  const a = (ry * Math.PI) / 180, b = (rx * Math.PI) / 180
  const x1 = x * Math.cos(a) + z * Math.sin(a), z1 = -x * Math.sin(a) + z * Math.cos(a)
  const y2 = y * Math.cos(b) - z1 * Math.sin(b), z2 = y * Math.sin(b) + z1 * Math.cos(b)
  return [x1, y2, z2]
}

export type Mark = 'star' | 'pick' | 'ok' | 'bad' | 'focus'
const MARK_STROKE: Record<Mark, string> = { star: '#be185d', pick: '#2563eb', ok: '#16a34a', bad: '#dc2626', focus: '#0f172a' }

/* ───────────── 3B sahne ───────────── */

export function FoldStage({ prep, t, dark, marks = {}, labels = {}, onFaceTap, height, pose = [-26, -34, 0], children }: { prep: Prepared; t: number; dark?: boolean; marks?: Record<number, Mark>; labels?: Record<number, string>; onFaceTap?: (i: number) => void; height?: number; /** tam katlanınca görünüm: [rotateX, rotateY, rotateZ] derece */ pose?: [number, number, number]; children?: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(600)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const H = height ?? Math.round(Math.max(270, Math.min(440, W * 0.72)))
  const [view, setView] = useState({ rx: 0, ry: 0 })
  const startTarget = useRef<EventTarget | null>(null)
  const bind = useDrag(
    ({ delta: [dx, dy], tap }) => {
      if (tap) {
        const el = (startTarget.current as Element | null)?.closest?.('[data-face]')
        if (el && onFaceTap) onFaceTap(Number(el.getAttribute('data-face')))
        return
      }
      setView((v) => ({ rx: Math.max(-85, Math.min(85, v.rx - dy * 0.5)), ry: v.ry + dx * 0.5 }))
    },
    { filterTaps: true },
  )

  const { bbox } = prep
  const bw = bbox.x1 - bbox.x0, bh = bbox.y1 - bbox.y0
  const s = Math.min((W * 0.84) / bw, (H * 0.84) / bh, 140)
  const F = useMemo(() => frames(prep, t), [prep, t])
  const avg = F.reduce((a, f) => [a[0] + f.c[0] / F.length, a[1] + f.c[1] / F.length, a[2] + f.c[2] / F.length], [0, 0, 0])
  const bc: V3 = [(bbox.x0 + bbox.x1) / 2, (bbox.y0 + bbox.y1) / 2, 0]
  const center = bc.map((v, i) => v + (avg[i] - v) * t) as V3
  const rx = view.rx + pose[0] * t
  const ry = view.ry + pose[1] * t
  const rz = pose[2] * t

  const W3 = useMemo(() => worlds(prep, t), [prep, t])
  const tone = (i: number) => {
    const n3 = W3[i]
    const n = viewRotate([n3[2], n3[6], n3[10]], rx, ry, rz)
    const back = n[2] < 0
    const m = back ? (n.map((x) => -x) as V3) : n
    const d = Math.max(0, m[0] * LIGHT[0] + m[1] * LIGHT[1] + m[2] * LIGHT[2])
    return { f: (back ? 0.6 : 0.7) + 0.5 * d, back }
  }

  const renderFace = (i: number): ReactNode => {
    const f = prep.faces[i]
    let transform = 'none'
    const ax = hingeAxis(prep, i)
    if (ax && f.parent >= 0) {
      const [px, py] = [ax.p[0] * s, ax.p[1] * s]
      transform = `translate3d(${px}px, ${py}px, 0) rotate3d(${ax.k[0]}, ${ax.k[1]}, 0, ${prep.signed[i] * t}deg) translate3d(${-px}px, ${-py}px, 0)`
    }
    return (
      <div key={i} style={{ position: 'absolute', left: 0, top: 0, transformStyle: 'preserve-3d', transformOrigin: '0 0', transform }}>
        <FaceSkin face={f} i={i} s={s} tone={tone(i)} mark={marks[i]} label={labels[i] ?? f.label} tappable={!!onFaceTap} />
        {prep.children[i].map(renderFace)}
      </div>
    )
  }

  const hasMarks = Object.keys(marks).length > 0
  return (
    <div
      ref={wrap}
      {...bind()}
      onPointerDownCapture={(e) => (startTarget.current = e.target)}
      className={`relative w-full touch-none overflow-hidden rounded-2xl select-none ${dark ? 'bg-[radial-gradient(circle_at_50%_35%,#334155,#0f172a_75%)]' : 'bg-[radial-gradient(circle_at_50%_35%,#ffffff,#eef2f7_80%)]'} ${onFaceTap ? 'cursor-pointer' : 'cursor-grab'}`}
      style={{ height: H, perspective: 1300 }}
      aria-label="Açınım: sürükleyerek çevir"
      role="img"
    >
      {/* zemin gölgesi */}
      <div className="pointer-events-none absolute inset-x-[15%] bottom-3 h-6 rounded-[50%] bg-black/10 blur-md" style={{ opacity: 0.2 + 0.6 * t }} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformStyle: 'preserve-3d',
          transformOrigin: '0 0',
          transform: `translate3d(${W / 2}px, ${H / 2}px, 0) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) translate3d(${-center[0] * s}px, ${-center[1] * s}px, ${-center[2] * s}px)`,
        }}
      >
        {renderFace(0)}
      </div>
      <div className="absolute top-2 right-2 flex gap-1" onPointerDown={(e) => e.stopPropagation()}>
        <IconBtn label="Sola çevir" onClick={() => setView((v) => ({ ...v, ry: v.ry - 45 }))} dark={dark}><RotateCcw size={18} /></IconBtn>
        <IconBtn label="Sağa çevir" onClick={() => setView((v) => ({ ...v, ry: v.ry + 45 }))} dark={dark}><RotateCw size={18} /></IconBtn>
        {(view.rx !== 0 || view.ry !== 0) && <IconBtn label="Görünümü sıfırla" onClick={() => setView({ rx: 0, ry: 0 })} dark={dark}><Undo2 size={18} /></IconBtn>}
      </div>
      <p className={`pointer-events-none absolute bottom-1.5 left-3 text-[11px] font-bold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{onFaceTap && !hasMarks ? 'Bir yüze dokun · sürükleyerek çevir' : 'Sürükleyerek çevir'}</p>
      {children}
    </div>
  )
}

function IconBtn({ children, label, onClick, dark }: { children: ReactNode; label: string; onClick: () => void; dark?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={`grid size-12 place-items-center rounded-xl shadow-sm ring-1 active:scale-95 ${dark ? 'bg-slate-700/90 text-white ring-slate-500' : 'bg-white/90 text-ink ring-line'}`}>
      {children}
    </button>
  )
}

function FaceSkin({ face, i, s, tone, mark, label, tappable }: { face: Face; i: number; s: number; tone: { f: number; back: boolean }; mark?: Mark; label?: string; tappable: boolean }) {
  const xs = face.pts.map((p) => p[0]), ys = face.pts.map((p) => p[1])
  const x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys)
  const pad = 6
  const w = (x1 - x0) * s + 2 * pad, h = (y1 - y0) * s + 2 * pad
  const pt = (p: P2) => `${(p[0] - x0) * s + pad},${(p[1] - y0) * s + pad}`
  const fill = shade(face.color, tone.f)
  const cx = face.pts.reduce((a, p) => a + p[0], 0) / face.pts.length, cy = face.pts.reduce((a, p) => a + p[1], 0) / face.pts.length
  const stroke = mark ? MARK_STROKE[mark] : face.seamless ? fill : '#1e293b'
  const sw = mark ? 5 : face.seamless ? 1.6 : 2
  const big = s * Math.min(x1 - x0, y1 - y0)
  const fs = Math.max(12, Math.min(big * 0.42, 44))
  const lines: ReactNode[] = []
  if (face.grid) {
    for (let x = Math.ceil(x0 + 1e-6); x < x1 - 1e-6; x++) lines.push(<line key={`x${x}`} x1={(x - x0) * s + pad} x2={(x - x0) * s + pad} y1={pad} y2={h - pad} stroke="#1e293b" strokeOpacity={0.3} strokeDasharray="4 4" />)
    for (let y = Math.ceil(y0 + 1e-6); y < y1 - 1e-6; y++) lines.push(<line key={`y${y}`} y1={(y - y0) * s + pad} y2={(y - y0) * s + pad} x1={pad} x2={w - pad} stroke="#1e293b" strokeOpacity={0.3} strokeDasharray="4 4" />)
  }
  return (
    <svg
      width={w}
      height={h}
      style={{ position: 'absolute', left: x0 * s - pad, top: y0 * s - pad, overflow: 'visible', pointerEvents: 'none', filter: mark === 'bad' ? 'drop-shadow(0 0 10px rgba(239,68,68,.95))' : mark === 'ok' ? 'drop-shadow(0 0 8px rgba(34,197,94,.8))' : undefined }}
    >
      <polygon data-face={i} points={face.pts.map(pt).join(' ')} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" style={{ pointerEvents: 'auto', cursor: tappable ? 'pointer' : undefined }} />
      {lines}
      {mark === 'star' && !label && <text x={(cx - x0) * s + pad} y={(cy - y0) * s + pad + fs * 0.36} textAnchor="middle" fontSize={fs * 1.1} fill="#be185d" pointerEvents="none">★</text>}
      {label && (
        <text x={(cx - x0) * s + pad} y={(cy - y0) * s + pad + fs * 0.35} textAnchor="middle" fontSize={label.length > 3 ? fs * 0.55 : fs} fontWeight={900} fill={mark === 'star' ? '#9d174d' : '#0f172a'} pointerEvents="none">
          {label}
        </text>
      )}
    </svg>
  )
}

/* ───────────── katlama denetimleri ───────────── */

export function FoldControls({ t, setT, animateTo, dark, disabled, onFolded, foldLabel = 'Katla' }: { t: number; setT: (v: number) => void; animateTo: (to: number, done?: () => void) => void; dark?: boolean; disabled?: boolean; onFolded?: () => void; foldLabel?: string }) {
  const closed = t > 0.99
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => (closed ? animateTo(0) : animateTo(1, onFolded))}
        className="btn-primary min-h-14 min-w-36 text-lg"
      >
        {closed ? <><PackageOpen size={20} />Aç</> : <><Box size={20} />{foldLabel}</>}
      </button>
      <div className="min-w-48 flex-1">
        <Slider value={Math.round(t * 100)} onChange={(v) => { setT(v / 100); if (v === 100) onFolded?.() }} min={0} max={100} step={5} format={(v) => `%${v}`} label="Katlama" disabled={disabled} dark={dark} />
      </div>
    </div>
  )
}

/* ───────────── düz açınım küçük resmi ───────────── */

export function NetThumb({ faces, size = 96, marks = {}, dark, labels }: { faces: Face[]; size?: number; marks?: Record<number, Mark>; dark?: boolean; labels?: Record<number, string> }) {
  const xs = faces.flatMap((f) => f.pts.map((p) => p[0])), ys = faces.flatMap((f) => f.pts.map((p) => p[1]))
  const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, h = Math.max(...ys) - y0
  const k = (size - 8) / Math.max(w, h)
  return (
    <svg viewBox={`-4 -4 ${w * k + 8} ${h * k + 8}`} width="100%" style={{ maxWidth: size, maxHeight: size }} aria-hidden>
      {faces.map((f, i) => (
        <g key={i}>
          <polygon points={f.pts.map((p) => `${(p[0] - x0) * k},${(p[1] - y0) * k}`).join(' ')} fill={marks[i] === 'star' ? '#f9a8d4' : f.color} stroke={marks[i] ? MARK_STROKE[marks[i]] : f.seamless ? f.color : dark ? '#0f172a' : '#1e293b'} strokeWidth={marks[i] ? 3 : f.seamless ? 1 : 1.6} strokeLinejoin="round" />
          {labels?.[i] && (() => {
            const cx = f.pts.reduce((a, p) => a + p[0], 0) / f.pts.length, cy = f.pts.reduce((a, p) => a + p[1], 0) / f.pts.length
            return <text x={(cx - x0) * k} y={(cy - y0) * k + k * 0.18} textAnchor="middle" fontSize={k * 0.5} fontWeight={900} fill="#0f172a">{labels[i]}</text>
          })()}
        </g>
      ))}
    </svg>
  )
}

/* ───────────── kare ızgarada açınım çizme ───────────── */

export function GridBuilder({ cells, onToggle, cols = 5, rows = 4, dark, locked }: { cells: P2[]; onToggle: (p: P2) => void; cols?: number; rows?: number; dark?: boolean; locked?: boolean }) {
  const on = new Set(cells.map((c) => `${c[0]},${c[1]}`))
  return (
    <div className={`mx-auto grid w-full max-w-[26rem] gap-1 rounded-2xl p-2 ${dark ? 'bg-slate-900/60' : 'bg-slate-100'}`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {Array.from({ length: rows * cols }, (_, n) => {
        const x = n % cols, y = Math.floor(n / cols)
        const sel = on.has(`${x},${y}`)
        return (
          <button
            key={n}
            type="button"
            disabled={locked || (!sel && cells.length >= 6)}
            onClick={() => onToggle([x, y])}
            aria-pressed={sel}
            aria-label={`Satır ${y + 1}, sütun ${x + 1}`}
            className={`aspect-square min-h-12 rounded-lg transition active:scale-95 ${sel ? 'bg-pink-400 shadow-[inset_0_-4px_0_rgba(0,0,0,.18)] ring-2 ring-pink-700' : dark ? 'bg-slate-700/70 ring-1 ring-slate-500 hover:bg-slate-600 disabled:opacity-50' : 'bg-white ring-1 ring-slate-300 hover:bg-pink-50 disabled:opacity-60'}`}
          />
        )
      })}
    </div>
  )
}
