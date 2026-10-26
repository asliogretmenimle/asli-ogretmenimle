import { createContext, useContext, useEffect, useId, useRef, type CSSProperties, type ReactNode, type Ref } from 'react'
import { Delete, Minus, Plus } from 'lucide-react'
import { MathText } from '../../../components/MathText'
import { fmt } from '../../../lib/format'

/* ───────────── Sayı yazımı ───────────── */

/** Türkçe sayı: binlik nokta, ondalık virgül, tipografik eksi */
export const nf = (n: number, d = 4) => fmt(Math.abs(n) < 1e-12 ? 0 : n, d).replace('-', '−')
/** İşaretli sayıyı parantezle: −3 → (−3) */
export const par = (n: number) => (n < 0 ? `(${nf(n)})` : nf(n))

/* ───────────── Kristal sanatı ───────────── */

export type GemName = 'amethyst' | 'emerald' | 'sapphire' | 'ruby' | 'topaz' | 'aqua'
/** açık, orta, koyu tonlar */
export const GEMS: Record<GemName, [string, string, string]> = {
  amethyst: ['#f5d0fe', '#c084fc', '#6b21a8'],
  emerald: ['#bbf7d0', '#34d399', '#047857'],
  sapphire: ['#bfdbfe', '#60a5fa', '#1e40af'],
  ruby: ['#fecdd3', '#fb7185', '#9f1239'],
  topaz: ['#fef3c7', '#fbbf24', '#b45309'],
  aqua: ['#cffafe', '#22d3ee', '#0e7490'],
}

const PrefixCtx = createContext('kg')
export const useGemPrefix = () => useContext(PrefixCtx)

function GemDefs({ p }: { p: string }) {
  return (
    <defs>
      {(Object.keys(GEMS) as GemName[]).map((k) => {
        const [l, m, d] = GEMS[k]
        return (
          <linearGradient key={k} id={`${p}-${k}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={l} />
            <stop offset="0.45" stopColor={m} />
            <stop offset="1" stopColor={d} />
          </linearGradient>
        )
      })}
      {(Object.keys(GEMS) as GemName[]).map((k) => (
        <radialGradient key={`h${k}`} id={`${p}-halo-${k}`}>
          <stop offset="0" stopColor={GEMS[k][1]} stopOpacity="0.55" />
          <stop offset="1" stopColor={GEMS[k][1]} stopOpacity="0" />
        </radialGradient>
      ))}
      <filter id={`${p}-glow`} x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="3.2" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id={`${p}-soft`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="1.4" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  )
}

/** Kristal çizimleri için SVG: degradeler ve parıltı filtresi hazır; dokunma kaydırması kapalı */
export function GemCanvas({ w, h, children, label, className = '', style, svgRef }: { w: number; h: number; children: ReactNode; label: string; className?: string; style?: CSSProperties; svgRef?: Ref<SVGSVGElement> }) {
  const raw = useId()
  const p = 'k' + raw.replace(/[^a-zA-Z0-9]/g, '')
  return (
    <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} width="100%" className={`block select-none ${className}`} style={{ touchAction: 'none', ...style }} role="img" aria-label={label}>
      <GemDefs p={p} />
      <PrefixCtx.Provider value={p}>{children}</PrefixCtx.Provider>
    </svg>
  )
}

/** Altıgen prizma kristal (yaklaşık 20 × 34 birim, merkez 0,0) */
export function Gem({ x, y, s = 1, gem, glow, rot = 0, anim, delay = 0, opacity = 1, halo }: { x: number; y: number; s?: number; gem: GemName; glow?: boolean; rot?: number; anim?: 'grow' | 'pop' | 'twinkle'; delay?: number; opacity?: number; halo?: boolean }) {
  const p = useGemPrefix()
  const [l] = GEMS[gem]
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={opacity}>
      {halo && <circle r={30} fill={`url(#${p}-halo-${gem})`} className="kg-breathe" />}
      <g className={anim ? `kg-${anim}` : undefined} style={anim ? { animationDelay: `${delay}ms` } : undefined} filter={glow ? `url(#${p}-glow)` : undefined}>
        <polygon points="0,-17 10,-8 10,9 0,17 -10,9 -10,-8" fill={`url(#${p}-${gem})`} stroke={l} strokeWidth={0.9} strokeOpacity={0.8} />
        <polygon points="0,-17 -10,-8 -10,9 0,17" fill="#000" opacity={0.2} />
        <polygon points="0,-17 10,-8 0,-3 -10,-8" fill="#fff" opacity={0.38} />
        <line x1={0} y1={-3} x2={0} y2={17} stroke="#fff" strokeOpacity={0.3} strokeWidth={0.8} />
        <polygon points="-6,-9 -3,-12 -2,-6" fill="#fff" opacity={0.7} />
      </g>
    </g>
  )
}

/** Küçük elmas taneciği (çok sayıda kristal için hafif çizim) */
export function Chip({ x, y, r = 5, gem, style, className }: { x: number; y: number; r?: number; gem: GemName; style?: CSSProperties; className?: string }) {
  const p = useGemPrefix()
  return (
    <g style={{ transform: `translate(${x}px, ${y}px)`, ...style }} className={className}>
      <path d={`M0 ${-r} L${r * 0.75} 0 L0 ${r} L${-r * 0.75} 0Z`} fill={`url(#${p}-${gem})`} />
      <path d={`M0 ${-r} L${r * 0.75} 0 L0 ${-r * 0.15} L${-r * 0.75} 0Z`} fill="#fff" opacity={0.35} />
    </g>
  )
}

/** Mağara zemini: sarkıtlar ve parıldayan tozlar */
export function CaveBox({ children, className = '', tone = '#312e81' }: { children: ReactNode; className?: string; tone?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl ring-1 ring-indigo-300/20 ${className}`} style={{ background: `radial-gradient(ellipse at 50% -10%, ${tone} 0, #1a1740 38%, #0a0d1c 85%)` }}>
      <svg aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-10 w-full" viewBox="0 0 400 40" preserveAspectRatio="none">
        <path d="M0 0 H400 V6 L388 9 L380 26 L372 8 L350 12 L344 30 L336 10 L310 7 L300 20 L292 6 L260 10 L250 34 L240 9 L210 6 L200 18 L192 7 L160 10 L152 28 L144 8 L120 6 L110 22 L102 7 L70 11 L62 32 L54 9 L30 6 L22 19 L14 7 L0 9Z" fill="#05060f" opacity={0.75} />
      </svg>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {SPARKS.map(([l, t, d], i) => (
          <span key={i} className="kg-spark absolute size-1 rounded-full bg-white" style={{ left: `${l}%`, top: `${t}%`, animationDelay: `${d}s` }} />
        ))}
      </div>
      <div className="relative">{children}</div>
    </div>
  )
}
const SPARKS: [number, number, number][] = [[8, 22, 0], [21, 70, 1.3], [37, 14, 2.1], [52, 82, 0.6], [66, 30, 1.8], [79, 64, 0.2], [91, 18, 2.6], [45, 48, 3.1], [14, 88, 1.1], [86, 90, 2.3]]

/* ───────────── Denetimler ───────────── */

export const darkBtn = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-extrabold bg-slate-700 text-slate-50 ring-1 ring-slate-500 transition hover:bg-slate-600 active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100'
export const gemBtn = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-extrabold text-white transition active:scale-[0.97] disabled:opacity-40 bg-[linear-gradient(135deg,#a855f7,#6366f1)] shadow-[0_0_18px_rgba(168,85,247,0.45)] hover:brightness-110'

/** Basılı tutunca tekrarlayan düğme */
function RepeatButton({ onStep, disabled, label, children }: { onStep: () => void; disabled?: boolean; label: string; children: ReactNode }) {
  const timer = useRef<number | null>(null)
  const fn = useRef(onStep)
  fn.current = onStep
  const stop = () => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = null
  }
  useEffect(() => stop, [])
  const start = () => {
    stop()
    const loop = (d: number) => {
      timer.current = window.setTimeout(() => {
        fn.current()
        loop(Math.max(45, d * 0.8))
      }, d)
    }
    loop(380)
  }
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={() => fn.current()} onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} className="grid size-12 shrink-0 place-items-center rounded-xl bg-slate-700 text-white ring-1 ring-slate-500 transition active:scale-95 disabled:opacity-35">
      {children}
    </button>
  )
}

export function Stepper({ label, value, display, onChange, min, max, accent = '#c084fc' }: { label: string; value: number; display?: string; onChange: (v: number) => void; min: number; max: number; accent?: string }) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)))
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-slate-900/70 p-1.5 ring-1 ring-slate-600">
      <span className="min-w-14 pl-2 text-xs font-black tracking-wide text-slate-300 uppercase">{label}</span>
      <RepeatButton label={`${label} azalt`} disabled={value <= min} onStep={() => set(value - 1)}><Minus size={20} /></RepeatButton>
      <span className="min-w-12 text-center text-2xl font-black tabular-nums" style={{ color: accent }}><MathText text={display ?? nf(value)} /></span>
      <RepeatButton label={`${label} artır`} disabled={value >= max} onStep={() => set(value + 1)}><Plus size={20} /></RepeatButton>
    </div>
  )
}

/** Dokunmatik sayı tuş takımı */
export function NumPad({ value, onChange, neg, comma, maxLen = 7 }: { value: string; onChange: (v: string) => void; neg?: boolean; comma?: boolean; maxLen?: number }) {
  const press = (k: string) => {
    if (k === 'del') return onChange(value.slice(0, -1))
    if (k === '±') return onChange(value.startsWith('−') ? value.slice(1) : '−' + value)
    if (k === ',' && (value.includes(',') || !comma)) return
    if (value.replace('−', '').length >= maxLen) return
    onChange(value + k)
  }
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', neg ? '±' : comma ? ',' : '', '0', 'del']
  return (
    <div className="w-full max-w-[16rem]">
      <div className="mb-2 flex min-h-14 items-center justify-end rounded-2xl bg-slate-950/70 px-4 text-3xl font-black tabular-nums text-amber-200 ring-1 ring-slate-600" aria-live="polite">
        {value || <span className="text-slate-500">?</span>}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {keys.map((k, i) =>
          k === '' ? <span key={i} /> : (
            <button key={i} type="button" onClick={() => press(k)} aria-label={k === 'del' ? 'Sil' : k} className="grid min-h-12 place-items-center rounded-xl bg-slate-700 text-xl font-black text-white ring-1 ring-slate-500 active:scale-95 active:bg-slate-600">
              {k === 'del' ? <Delete size={20} /> : k}
            </button>
          ),
        )}
      </div>
    </div>
  )
}

/** Tuş takımındaki metni sayıya çevirir */
export const padNum = (s: string) => {
  const t = s.replace('−', '-').replace(',', '.')
  if (t === '' || t === '-' || t === '.') return NaN
  return Number(t)
}

/** Koyu kart içinde okuma satırı */
export function Readout({ children, tone = 'violet' }: { children: ReactNode; tone?: 'violet' | 'amber' | 'emerald' | 'sky' }) {
  const c = { violet: 'bg-violet-950/60 text-violet-100 ring-violet-500/40', amber: 'bg-amber-950/50 text-amber-100 ring-amber-500/40', emerald: 'bg-emerald-950/60 text-emerald-100 ring-emerald-500/40', sky: 'bg-sky-950/60 text-sky-100 ring-sky-500/40' }[tone]
  return <div className={`rounded-2xl px-4 py-2.5 text-center text-lg font-black ring-1 ${c}`}>{children}</div>
}

/** Seçenek düğmesi (tahmin / görüş) */
export function Pick({ on, onClick, children, disabled }: { on?: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" aria-pressed={on} disabled={disabled} onClick={onClick} className={`min-h-12 rounded-2xl px-4 py-2 text-[15px] font-extrabold ring-1 transition active:scale-[0.97] ${on ? 'bg-violet-500/30 text-white ring-violet-300' : 'bg-slate-800 text-slate-100 ring-slate-600 hover:ring-violet-400'} disabled:cursor-default disabled:opacity-60`}>
      {typeof children === 'string' ? <MathText text={children} /> : children}
    </button>
  )
}

/** Küçük başlık */
export const Label = ({ children }: { children: ReactNode }) => <p className="mb-1.5 text-xs font-black tracking-widest text-violet-200/80 uppercase">{children}</p>

export const CSS = `
@keyframes kg-grow { 0% { transform: scale(0) translateY(10px); opacity: 0 } 70% { transform: scale(1.15); opacity: 1 } 100% { transform: scale(1) } }
.kg-grow { transform-box: fill-box; transform-origin: center bottom; animation: kg-grow .6s cubic-bezier(.34,1.56,.64,1) both; }
@keyframes kg-pop { 0% { transform: scale(.2); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
.kg-pop { transform-box: fill-box; transform-origin: center; animation: kg-pop .45s cubic-bezier(.34,1.56,.64,1) both; }
@keyframes kg-twinkle { 0%,100% { opacity: 1 } 50% { opacity: .55 } }
.kg-twinkle { animation: kg-twinkle 2.4s ease-in-out infinite; }
@keyframes kg-breathe { 0%,100% { opacity: .55; transform: scale(.9) } 50% { opacity: 1; transform: scale(1.1) } }
.kg-breathe { transform-box: fill-box; transform-origin: center; animation: kg-breathe 3s ease-in-out infinite; }
@keyframes kg-spark { 0%,100% { opacity: 0; transform: scale(.5) } 50% { opacity: .9; transform: scale(1.4) } }
.kg-spark { animation: kg-spark 3.6s ease-in-out infinite; box-shadow: 0 0 6px 2px rgba(196,181,253,.7); }
@keyframes kg-draw { from { stroke-dashoffset: 400 } to { stroke-dashoffset: 0 } }
.kg-draw { stroke-dasharray: 400; animation: kg-draw .8s ease-out both; }
.kg-move { transition: transform .8s cubic-bezier(.4,1.3,.5,1), opacity .5s; }
@keyframes kg-fade { from { opacity: 0 } to { opacity: 1 } }
.kg-fade { animation: kg-fade .6s ease-out both; }
@keyframes kg-shine { 0% { transform: translateX(-120%) } 100% { transform: translateX(220%) } }
.kg-shine { animation: kg-shine 2.8s ease-in-out infinite; }
`
