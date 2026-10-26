import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useDrag, useGesture } from '@use-gesture/react'
import { ArrowLeftRight, Minus, Plus } from 'lucide-react'
import { MathText } from '../../components/MathText'
import { clamp } from '../../interactive/axis'
import type { BarStyle, Whole } from './tasks'
import { fLabel } from './tasks'

/* ───────────────────────── yardımcılar ───────────────────────── */

const snapTo = (v: number, w: Whole) => {
  const step = w.step ?? 1
  return clamp(Math.round(v / step) * step, w.min ?? step, w.max ?? 20)
}

/** Kişi etiketi */
export function Who({ w, children, className = 'text-sm' }: { w: Whole; children?: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-black ${className}`} style={{ color: w.color }}>
      <span className="grid size-7 place-items-center rounded-full text-base" style={{ background: `${w.color}1f` }} aria-hidden>{w.emoji}</span>
      {children}
    </span>
  )
}

/** ± düğmeleri (dokun alternatifi) */
export function Stepper({ w, onChange, label }: { w: Whole; onChange: (n: number) => void; label: string }) {
  const step = w.step ?? 1
  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label={label}>
      <button type="button" data-testid={`${label}-minus`} onClick={() => onChange(snapTo(w.n - step, w))} disabled={w.n <= (w.min ?? step)} className="grid size-12 place-items-center rounded-xl bg-white ring-1 ring-line active:scale-95 disabled:opacity-40" aria-label={`${label} küçült`}><Minus size={20} /></button>
      <button type="button" data-testid={`${label}-plus`} onClick={() => onChange(snapTo(w.n + step, w))} disabled={w.n >= (w.max ?? 20)} className="grid size-12 place-items-center rounded-xl bg-white ring-1 ring-line active:scale-95 disabled:opacity-40" aria-label={`${label} büyüt`}><Plus size={20} /></button>
    </div>
  )
}

/** Genişliği ölçen sahne: birim başına piksel hesaplar */
export function BarStage({ maxUnits, children, guide, guideColor }: { maxUnits: number; children: (ppu: number) => ReactNode; guide?: number | null; guideColor?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(600)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  // sağda tutamaç için pay
  const ppu = Math.max(8, (w - 30) / maxUnits)
  return (
    <div ref={ref} className="relative">
      {children(ppu)}
      {guide != null && guide > 0 && (
        <div className="pointer-events-none absolute top-0 bottom-0 z-[1] border-l-[3px] border-dashed transition-[left] duration-150" style={{ left: guide * ppu - 1.5, borderColor: guideColor ?? '#f59e0b' }} aria-hidden />
      )}
    </div>
  )
}

const STYLE: Record<BarStyle, (c: string) => { rest: string; part: string; grid: string; text: string }> = {
  choco: () => ({ rest: '#ead6c3', part: '#7b4a2a', grid: 'rgba(255,255,255,.28)', text: '#fff' }),
  ribbon: (c) => ({ rest: `${c}2e`, part: c, grid: 'rgba(255,255,255,.35)', text: '#fff' }),
  tape: (c) => ({ rest: `${c}24`, part: c, grid: 'rgba(255,255,255,.4)', text: '#fff' }),
}

/**
 * Tek bir bütün (şerit/çikolata). Kesir kadarı koyu, kalanı açık; eş parça çizgileri.
 * resizable ise sağ uçtaki tutamaçla sürüklenir, üzerinde iki parmakla büyütülür.
 */
export function BarTrack({
  w, ppu, maxUnits, style, showParts = true, resizable, onChange, height = 56, label, readout, testid, splitHint, ghostUnit, fullPart,
}: {
  w: Whole
  ppu: number
  maxUnits: number
  style: BarStyle
  showParts?: boolean
  resizable?: boolean
  onChange?: (n: number) => void
  height?: number
  label: ReactNode
  readout?: ReactNode
  testid: string
  /** parça gösterimi: tümü boyalı, num eş parçaya bölünmüş (ipucu) */
  splitHint?: boolean
  /** birim kesir uzunluğunda soluk işaretler (yineleme ipucu) */
  ghostUnit?: number
  /** tamamı boyalı (verilen parça) */
  fullPart?: boolean
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const s = STYLE[style](w.color)
  const width = w.n * ppu
  const frac = fullPart ? 1 : showParts ? w.num / w.den : 0
  const parts = fullPart ? (splitHint ? w.num : 1) : showParts ? w.den : 1

  const dragHandle = useDrag(
    ({ xy: [x], event }) => {
      event.stopPropagation()
      if (!onChange || !trackRef.current) return
      const r = trackRef.current.getBoundingClientRect()
      onChange(snapTo((x - r.left) / ppu, w))
    },
    { pointer: { capture: true } },
  )
  const pinch = useGesture(
    {
      onPinch: ({ offset: [sc], first, memo, event }) => {
        event?.preventDefault?.()
        if (!onChange) return memo
        const m = first || !memo ? { n0: w.n, s0: sc } : memo
        onChange(snapTo((m.n0 * sc) / m.s0, w))
        return m
      },
    },
    { eventOptions: { passive: false }, pinch: { scaleBounds: { min: 0.1, max: 10 } } },
  )

  return (
    <div className="relative">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="relative z-[2] rounded-full bg-white/90 pr-2">{label}</span>
        {readout && <span className="relative z-[2] rounded-full bg-white/90 px-2 text-sm font-extrabold text-ink">{readout}</span>}
      </div>
      <div
        ref={trackRef}
        {...(resizable ? pinch() : {})}
        data-testid={testid}
        className="relative"
        style={{ height, touchAction: resizable ? 'none' : undefined, width: '100%' }}
      >
        {/* cetvel: her birim için soluk kutu */}
        <div className="absolute inset-y-1 left-0 rounded-md" style={{ width: maxUnits * ppu, backgroundImage: `repeating-linear-gradient(to right, #cbd5e1 0 1px, transparent 1px ${ppu}px)`, opacity: 0.6 }} aria-hidden />
        {/* bütün */}
        <div
          className="absolute inset-y-0 left-0 overflow-hidden rounded-lg shadow-[0_3px_0_rgba(0,0,0,.12)] ring-2 transition-[width] duration-150"
          style={{ width, background: s.rest, ['--tw-ring-color' as string]: style === 'choco' ? '#5b3520' : w.color }}
        >
          <div className="absolute inset-y-0 left-0 transition-[width] duration-200" style={{ width: width * frac, background: s.part }} />
          {/* birim kareler */}
          <div className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(to right, transparent 0 ${ppu - 1}px, ${style === 'choco' ? 'rgba(91,53,32,.35)' : s.grid} ${ppu - 1}px ${ppu}px)` }} aria-hidden />
          {style === 'choco' && <div className="absolute inset-x-0 top-1/2 h-px bg-[rgba(91,53,32,.25)]" aria-hidden />}
          {/* eş parça çizgileri */}
          {Array.from({ length: Math.max(0, parts - 1) }, (_, k) => (
            <div key={k} className="absolute inset-y-0 w-[3px] -translate-x-1/2 bg-white" style={{ left: ((k + 1) * width) / parts, boxShadow: '0 0 0 1px rgba(0,0,0,.18)' }} />
          ))}
          {frac > 0 && width * frac > 34 && (
            <div className="absolute inset-y-0 left-0 grid place-items-center text-lg font-black" style={{ width: width * frac, color: s.text, textShadow: '0 1px 2px rgba(0,0,0,.35)' }}>
              {splitHint && fullPart ? null : <MathText text={fLabel(w)} />}
            </div>
          )}
          {splitHint && fullPart && Array.from({ length: w.num }, (_, k) => (
            <div key={k} className="absolute inset-y-0 grid place-items-center text-sm font-black text-white" style={{ left: (k * width) / w.num, width: width / w.num, textShadow: '0 1px 2px rgba(0,0,0,.35)' }}>
              <MathText text={`[[1/${w.den}]]`} />
            </div>
          ))}
        </div>
        {/* birim kesir yineleme ipucu */}
        {ghostUnit && ghostUnit > 0 && Array.from({ length: Math.floor(maxUnits / ghostUnit) }, (_, k) => (
          <div key={k} className="pointer-events-none absolute -bottom-2 h-2 rounded-b border-x-2 border-b-2 border-dashed border-amber-500" style={{ left: k * ghostUnit * ppu, width: ghostUnit * ppu }} aria-hidden />
        ))}
        {resizable && (
          <button
            type="button"
            {...dragHandle()}
            data-handle
            data-testid={`${testid}-handle`}
            className="absolute top-1/2 z-[2] grid size-12 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full bg-white shadow-lg ring-[3px] transition-[left] duration-150 active:scale-110"
            style={{ left: width, touchAction: 'none', ['--tw-ring-color' as string]: w.color, color: w.color }}
            aria-label={`${w.gen} ${w.its}: uzunluğu değiştir`}
          >
            <ArrowLeftRight size={22} strokeWidth={3} />
          </button>
        )}
      </div>
    </div>
  )
}

/* ───────────────────────── pizza ───────────────────────── */

const TOPPINGS: [number, number][] = [[0.55, 0.3], [0.6, 1.4], [0.35, 2.3], [0.7, 2.9], [0.5, 3.8], [0.72, 4.6], [0.3, 5.3], [0.68, 5.9], [0.2, 0.9]]

function sector(cx: number, cy: number, r: number, from: number, to: number) {
  if (to - from >= 0.9999) return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`
  const a0 = -Math.PI / 2 + from * 2 * Math.PI, a1 = -Math.PI / 2 + to * 2 * Math.PI
  const large = to - from > 0.5 ? 1 : 0
  return `M ${cx} ${cy} L ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`
}

function Pizza({ cx, cy, w }: { cx: number; cy: number; w: Whole }) {
  const r = w.n
  const f = w.num / w.den
  return (
    <g>
      <circle cx={cx} cy={cy + 4} r={r + 2} fill="rgba(0,0,0,.12)" />
      {/* yenmeyen kısım soluk */}
      <g opacity={0.38}>
        <circle cx={cx} cy={cy} r={r} fill="#e9a94b" />
        <circle cx={cx} cy={cy} r={r * 0.86} fill="#f7d774" />
      </g>
      {/* kesir kadarı */}
      <clipPath id={`clip-${w.who}`}><path d={sector(cx, cy, r + 1, 0, f)} /></clipPath>
      <g clipPath={`url(#clip-${w.who})`}>
        <circle cx={cx} cy={cy} r={r} fill="#e9a94b" />
        <circle cx={cx} cy={cy} r={r * 0.86} fill="#f7d774" />
        <circle cx={cx} cy={cy} r={r * 0.82} fill="#f4c542" opacity={0.6} />
      </g>
      {TOPPINGS.map(([d, a], i) => {
        const ang = a
        const inPart = ((ang / (2 * Math.PI) + 0.25) % 1) < f
        return <circle key={i} cx={cx + Math.cos(ang) * d * r * 0.8} cy={cy + Math.sin(ang) * d * r * 0.8} r={r * 0.1} fill="#c2410c" opacity={inPart ? 1 : 0.35} />
      })}
      {Array.from({ length: w.den }, (_, k) => {
        const a = -Math.PI / 2 + (k / w.den) * 2 * Math.PI
        return <line key={k} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="#fff" strokeWidth={3} />
      })}
      <path d={sector(cx, cy, r, 0, f)} fill="none" stroke={w.color} strokeWidth={4} strokeLinejoin="round" />
    </g>
  )
}

/**
 * İki pizza yan yana: A sabit, B tutamaç / iki parmak / ± ile büyür.
 * overlay: A’nın kesir dilimini B’nin üzerine kesik çizgiyle koyar (karşılaştırma).
 */
export function PizzaPair({ A, B, onChange, overlay }: { A: Whole; B: Whole; onChange: (n: number) => void; overlay: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const ax = 108, bx = 400, cy = 148
  const toSvg = (x: number, y: number) => {
    const svg = svgRef.current
    const m = svg?.getScreenCTM()
    if (!svg || !m) return { x: 0, y: 0 }
    const p = new DOMPoint(x, y).matrixTransform(m.inverse())
    return { x: p.x, y: p.y }
  }
  const handleAng = Math.PI / 4
  const hx = bx + B.n * Math.cos(handleAng), hy = cy + B.n * Math.sin(handleAng)
  const drag = useDrag(
    ({ xy: [x, y], event }) => {
      event.stopPropagation()
      const p = toSvg(x, y)
      onChange(snapTo(Math.hypot(p.x - bx, p.y - cy), B))
    },
    { pointer: { capture: true } },
  )
  const pinch = useGesture(
    {
      onPinch: ({ offset: [sc], first, memo, event }) => {
        event?.preventDefault?.()
        const m = first || !memo ? { n0: B.n, s0: sc } : memo
        onChange(snapTo((m.n0 * sc) / m.s0, B))
        return m
      },
    },
    { eventOptions: { passive: false }, pinch: { scaleBounds: { min: 0.1, max: 10 } } },
  )
  const f = A.num / A.den
  return (
    <div className="relative">
      <div className="grid grid-cols-[38%_62%] text-center">
        <span><Who w={A} className="text-xs sm:text-sm">{A.gen} pizzası</Who></span>
        <span><Who w={B} className="text-xs sm:text-sm">{B.gen} pizzası</Who></span>
      </div>
      <svg ref={svgRef} viewBox="0 0 560 296" className="block w-full select-none" role="img" aria-label="İki pizza">
        <Pizza cx={ax} cy={cy} w={A} />
        <g {...pinch()} style={{ touchAction: 'none' }} data-testid="pizza-b">
          <circle cx={bx} cy={cy} r={B.n + 6} fill="transparent" />
          <Pizza cx={bx} cy={cy} w={B} />
        </g>
        {overlay && <path d={sector(bx, cy, A.n, 0, f)} fill={`${A.color}26`} stroke={A.color} strokeWidth={4} strokeDasharray="10 6" className="pointer-events-none" />}
        <g {...drag()} data-handle data-testid="pizza-b-handle" style={{ cursor: 'grab', touchAction: 'none' }} role="slider" aria-label={`${B.gen} pizzasının büyüklüğü`} aria-valuenow={B.n} aria-valuemin={B.min} aria-valuemax={B.max}>
          <circle cx={hx} cy={hy} r={44} fill="transparent" />
          <circle cx={hx} cy={hy} r={24} fill="#fff" stroke={B.color} strokeWidth={4} />
          <path d={`M ${hx - 8} ${hy - 8} L ${hx + 8} ${hy + 8} M ${hx + 8} ${hy + 8} l -7 0 M ${hx + 8} ${hy + 8} l 0 -7 M ${hx - 8} ${hy - 8} l 7 0 M ${hx - 8} ${hy - 8} l 0 7`} stroke={B.color} strokeWidth={3} strokeLinecap="round" fill="none" />
        </g>
      </svg>
    </div>
  )
}

/* ───────────────────────── bilyeler / kurabiyeler ───────────────────────── */

function Marble({ color, item, size }: { color: string; item?: string; size: number }) {
  if (item) return <span className="grid place-items-center leading-none animate-pop" style={{ width: size, height: size, fontSize: size * 0.9 }} aria-hidden>{item}</span>
  return <span className="block rounded-full animate-pop" style={{ width: size, height: size, background: `radial-gradient(circle at 32% 30%, #fff 0 12%, ${color} 45%, ${color}cc 100%)`, boxShadow: '0 1px 2px rgba(0,0,0,.25)' }} aria-hidden />
}

/**
 * Bir çokluk: n nesne, den eş tabağa (birer birer) dağıtılır; ilk num tabak vurgulanır.
 * dealt < n iken kalanlar torbada bekler.
 */
export function Plates({ w, dealt, item, highlight, size = 20, testid }: { w: Whole; dealt: number; item?: string; highlight: boolean; size?: number; testid?: string }) {
  const counts = Array.from({ length: w.den }, (_, i) => Math.floor(dealt / w.den) + (i < dealt % w.den ? 1 : 0))
  const pile = w.n - dealt
  const perPlate = Math.ceil(w.n / w.den)
  const cols = perPlate <= 4 ? 2 : perPlate <= 9 ? 3 : 4
  return (
    <div className="flex flex-wrap items-stretch gap-2" data-testid={testid}>
      {pile > 0 && (
        <div className="flex min-h-20 flex-col items-center justify-center rounded-[40%_40%_30%_30%] bg-amber-100 px-3 py-2 ring-2 ring-amber-300" aria-label={`Torbada ${pile} tane`}>
          <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${Math.min(6, Math.max(2, Math.ceil(Math.sqrt(pile))))}, ${size * 0.8}px)` }}>
            {Array.from({ length: pile }, (_, i) => <Marble key={i} color={w.color} item={item} size={size * 0.8} />)}
          </div>
          <span className="mt-1 text-[11px] font-black text-amber-800">torba</span>
        </div>
      )}
      {counts.map((c, i) => {
        const on = highlight && i < w.num
        return (
          <div key={i} className="flex min-w-16 flex-col items-center rounded-2xl px-2 pt-2 pb-1 transition" style={{ background: on ? `${w.color}1f` : '#fff', boxShadow: on ? `inset 0 0 0 3px ${w.color}` : 'inset 0 0 0 2px #e2e8f0' }}>
            <div className="grid min-h-8 content-center gap-1" style={{ gridTemplateColumns: `repeat(${cols}, ${size}px)` }}>
              {Array.from({ length: c }, (_, k) => <Marble key={k} color={w.color} item={item} size={size} />)}
            </div>
            <span className="mt-1 text-xs font-black" style={{ color: on ? w.color : '#94a3b8' }}>{c}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Çokluğu değiştiren sürgü: kanal üzerinde sürükle; ± düğmeleri ayrıca */
export function CountSlider({ w, onChange, testid }: { w: Whole; onChange: (n: number) => void; testid: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const min = w.min ?? 1, max = w.max ?? 40
  const bind = useDrag(
    ({ xy: [x], event }) => {
      event.stopPropagation()
      const r = ref.current?.getBoundingClientRect()
      if (!r) return
      onChange(snapTo(min + ((x - r.left - 24) / Math.max(1, r.width - 48)) * (max - min), w))
    },
    { pointer: { capture: true } },
  )
  const pct = (w.n - min) / (max - min)
  return (
    <div className="flex items-center gap-2">
      <div ref={ref} {...bind()} data-testid={testid} data-handle className="relative h-14 flex-1 cursor-pointer" style={{ touchAction: 'none' }} role="slider" aria-label={`${w.gen} ${w.its}: büyüklük`} aria-valuenow={w.n} aria-valuemin={min} aria-valuemax={max}>
        <div className="absolute inset-x-6 top-1/2 h-3 -translate-y-1/2 rounded-full bg-slate-200">
          <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: w.color }} />
        </div>
        <div className="absolute top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-base font-black shadow-lg ring-[3px]" style={{ left: `calc(24px + ${pct} * (100% - 48px))`, ['--tw-ring-color' as string]: w.color, color: w.color }}>
          {w.n}
        </div>
      </div>
      <Stepper w={w} onChange={onChange} label={testid} />
    </div>
  )
}
