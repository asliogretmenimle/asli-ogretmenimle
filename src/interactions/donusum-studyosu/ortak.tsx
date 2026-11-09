import { useRef, useState, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'
import { ArrowRight, Check, Delete, Flag, Minus, Plus } from 'lucide-react'
import { LevelDots, Nudge as KitNudge } from '../../games/kit2'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'

/**
 * Keşif Atölyesi 52–57 (geometri: dönüşüm, üçgen, katlama, açınım, hacim, Pisagor) için ortak parçalar.
 * Koyu sahne (7–8. sınıf) için `dark` destekli başlık/panel, iki sütunlu tablet yerleşimi, sayı tuş takımı,
 * kaydırıcı, deneme sayacı (öğretmen raporu) ve küçük geometri yardımcıları.
 * Bu dosya yalnızca okunur kabul edilir; etkinliğe özel yardımcılar kendi klasöründe durur.
 */

/* ───────────── sayı yardımcıları ───────────── */

export const fmt = (v: number, d = 2) => (Math.abs(v) < 1e-9 ? 0 : v).toLocaleString('tr-TR', { maximumFractionDigits: d }).replace('-', '−')
export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
export const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps

/** Tekrarlanabilir rastgele sayı üreteci */
export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export const pick = <T,>(a: readonly T[], r: () => number = Math.random): T => a[Math.floor(r() * a.length)]
export function shuffle<T>(a: readonly T[], r: () => number = Math.random): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

/* ───────────── geometri yardımcıları ───────────── */

export type Pt = [number, number]
export const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])
/** b köşesindeki açı (derece) */
export function angleAt(a: Pt, b: Pt, c: Pt) {
  const u = [a[0] - b[0], a[1] - b[1]], v = [c[0] - b[0], c[1] - b[1]]
  const d = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]) || 1)
  return (Math.acos(Math.max(-1, Math.min(1, d))) * 180) / Math.PI
}
export const polyArea = (ps: Pt[]) => Math.abs(ps.reduce((s, p, i) => { const q = ps[(i + 1) % ps.length]; return s + p[0] * q[1] - q[0] * p[1] }, 0)) / 2
export const toPoints = (ps: Pt[]) => ps.map((p) => p.join(',')).join(' ')
export const deg = (r: number) => (r * 180) / Math.PI
export const rad = (d: number) => (d * Math.PI) / 180

/* ───────────── rapor: deneme sayacı ───────────── */

/**
 * Bir görev için denemeleri sayar. pass() ilk kez çağrıldığında item(ilkDenemede) rapora yazılır.
 * Görev bileşeni her görevde yeniden bağlandığından (key) sayaç da sıfırlanır.
 */
export function useChecks() {
  const track = useTracker()
  const fails = useRef(0)
  const done = useRef(false)
  const [tries, setTries] = useState(0)
  return {
    tries,
    fail() {
      track.attempt(false)
      fails.current++
      setTries((t) => t + 1)
      sfx.bad()
    },
    /** true: ilk denemede çözüldü */
    pass() {
      track.attempt(true)
      setTries((t) => t + 1)
      if (!done.current) {
        done.current = true
        track.item(fails.current === 0)
        sfx.ok()
      }
      return fails.current === 0
    },
    hint: () => track.hint(),
    get fails() {
      return fails.current
    },
    get done() {
      return done.current
    },
  }
}

/* ───────────── yerleşim ───────────── */

export const PINK = '#db2777'

export function Header({ emoji, kicker = 'Görev', title, idx, total, right, dark }: { emoji: string; kicker?: string; title: ReactNode; idx: number; total: number; right?: ReactNode; dark?: boolean }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`grid size-11 shrink-0 place-items-center rounded-2xl text-2xl shadow-sm ${dark ? 'bg-slate-700 ring-1 ring-slate-600' : 'bg-white ring-1 ring-line'}`} aria-hidden>{emoji}</span>
        <div className="min-w-0">
          <p className={`text-[11px] font-black tracking-wide uppercase ${dark ? 'text-pink-300' : 'text-pink-700'}`}>{kicker} {idx + 1} / {total}</p>
          <p className={`text-lg leading-tight font-black ${dark ? 'text-white' : 'text-ink'}`}>{title}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {right}
        <LevelDots current={idx} total={total} />
      </div>
    </div>
  )
}

/** Yatay tablette çalışma alanı solda, panel sağda; dikeyde alt alta */
export function Split({ work, panel, panelFirst }: { work: ReactNode; panel: ReactNode; /** dikeyde panel üstte */ panelFirst?: boolean }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className={`min-w-0 ${panelFirst ? 'order-2 lg:order-1' : ''}`}>{work}</div>
      <div className={`flex min-w-0 flex-col gap-3 ${panelFirst ? 'order-1 lg:order-2' : ''}`}>{panel}</div>
    </div>
  )
}

/** Çalışma alanı çerçevesi (koyu sahnede “laboratuvar” görünümü) */
export function Stage({ children, dark, className = '' }: { children: ReactNode; dark?: boolean; className?: string }) {
  return <div className={`relative overflow-clip rounded-3xl p-2 ${dark ? 'bg-slate-900/70 ring-1 ring-slate-600' : 'bg-white/90 ring-1 ring-line shadow-sm'} ${className}`}>{children}</div>
}

export function Card({ children, className = '', dark }: { children: ReactNode; className?: string; dark?: boolean }) {
  return <div className={`rounded-2xl p-3 ring-1 ${dark ? 'bg-slate-800/90 text-slate-100 ring-slate-600' : 'bg-white/95 text-ink ring-line'} ${className}`}>{children}</div>
}

/** Görev metni kartı (koyu sahnede de okunur) */
export function Prompt({ step, children }: { step?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 text-ink shadow-sm ring-1 ring-line">
      {step && <p className="mb-0.5 text-[11px] font-black tracking-wide text-pink-700 uppercase">{step}</p>}
      <div className="text-[17px] leading-snug font-extrabold sm:text-lg">{children}</div>
    </div>
  )
}

/** Dar panelde soru metni tam satır kaplasın, düğmeler alta insin */
export function Nudge(p: Parameters<typeof KitNudge>[0]) {
  return (
    <div className="[&>div]:mt-0 [&>div>div]:ml-12 [&>div>p]:basis-[calc(100%-3rem)]">
      <KitNudge {...p} />
    </div>
  )
}

export function CheckButton({ onClick, disabled, children = 'Kontrol et' }: { onClick: () => void; disabled?: boolean; children?: ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="btn-primary min-h-14 w-full text-lg">
      <Check size={20} strokeWidth={3} />
      {children}
    </button>
  )
}

export function NextButton({ last, onClick }: { last: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="btn-primary min-h-14 w-full text-lg animate-fade-up">
      {last ? <>Bitir <Flag size={20} /></> : <>Sonraki görev <ArrowRight size={20} /></>}
    </button>
  )
}

/** Koyu sahnede de okunur ikincil düğme */
export function GhostButton({ children, onClick, disabled, active, dark, className = '' }: { children: ReactNode; onClick: () => void; disabled?: boolean; active?: boolean; dark?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-extrabold ring-1 transition active:scale-95 disabled:opacity-40 ${active ? 'bg-pink-600 text-white ring-pink-700' : dark ? 'bg-slate-700 text-slate-100 ring-slate-500 hover:bg-slate-600' : 'bg-white text-ink ring-line hover:bg-pink-50'} ${className}`}
    >
      {children}
    </button>
  )
}

/** Büyük seçim düğmeleri */
export function Choices<T extends string | number>({ options, value, onPick, disabled, cols = 2 }: { options: { id: T; label: ReactNode; sub?: ReactNode }[]; value: T | null; onPick: (id: T) => void; disabled?: boolean; cols?: 1 | 2 | 3 }) {
  return (
    <div className={`grid gap-2 ${cols === 1 ? 'grid-cols-1' : cols === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          disabled={disabled}
          onClick={() => onPick(o.id)}
          aria-pressed={value === o.id}
          className={`min-h-14 rounded-2xl px-3 py-2 text-base font-black ring-2 transition active:scale-[0.97] ${value === o.id ? 'bg-pink-600 text-white shadow-[0_3px_0_#9d174d] ring-pink-700' : 'bg-white text-ink ring-line hover:bg-pink-50'} disabled:cursor-default`}
        >
          {o.label}
          {o.sub && <span className={`block text-xs font-bold ${value === o.id ? 'text-pink-50' : 'text-ink-soft'}`}>{o.sub}</span>}
        </button>
      ))}
    </div>
  )
}

/* ───────────── sayı tuş takımı ───────────── */

export function NumPad({ value, onChange, comma = false, minus = false, max = 6, unit, label, disabled }: { value: string; onChange: (v: string) => void; comma?: boolean; minus?: boolean; max?: number; unit?: string; label?: string; disabled?: boolean }) {
  const press = (k: string) => {
    if (disabled) return
    if (k === '⌫') return onChange(value.slice(0, -1))
    if (k === '±') return onChange(value.startsWith('−') ? value.slice(1) : '−' + value)
    if (k === ',') {
      if (!comma || value.includes(',')) return
      return onChange((value.replace('−', '') ? value : value + '0') + ',')
    }
    if (value.replace(/[,−]/g, '').length >= max) return
    onChange(value === '0' ? k : value === '−0' ? '−' + k : value + k)
  }
  const keys = ['1', '2', '3', '⌫', '4', '5', '6', '0', '7', '8', '9', comma ? ',' : minus ? '±' : '']
  if (comma && minus) keys.push('', '', '', '±')
  return (
    <div className="rounded-2xl bg-slate-50 p-2 ring-1 ring-line">
      <div className="mb-2 flex min-h-14 items-center justify-between gap-2 rounded-xl bg-white px-3 ring-2 ring-pink-500/60">
        {label && <span className="text-sm font-extrabold text-ink-soft">{label}</span>}
        <span className="ml-auto text-3xl font-black text-ink tabular-nums">{value || <span className="text-slate-300">?</span>}</span>
        {unit && <span className="text-lg font-black text-ink-soft">{unit}</span>}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {keys.map((k, i) =>
          k ? (
            <button key={i} type="button" disabled={disabled} onClick={() => press(k)} className={`grid h-12 place-items-center rounded-xl text-xl font-black ring-1 ring-line active:scale-95 ${k === '⌫' ? 'bg-slate-200 text-ink' : 'bg-white text-ink hover:bg-pink-50'}`} aria-label={k === '⌫' ? 'Sil' : k === '±' ? 'İşaret değiştir' : k}>
              {k === '⌫' ? <Delete size={20} /> : k}
            </button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
    </div>
  )
}
export const parseNum = (s: string) => (s === '' || s === '−' ? NaN : Number(s.replace('−', '-').replace(',', '.')))

/* ───────────── kaydırıcı ───────────── */

export function Slider({ value, onChange, min = 0, max = 100, step = 1, marks = [], format = (v: number) => fmt(v), color = PINK, disabled, label, dark }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; marks?: number[]; format?: (v: number) => string; color?: string; disabled?: boolean; label: string; dark?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const set = (cx: number) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const t = Math.min(1, Math.max(0, (cx - r.left - 24) / (r.width - 48)))
    const v = Math.round((min + t * (max - min)) / step) * step
    const c = Math.min(max, Math.max(min, Number(v.toFixed(6))))
    if (c !== value) onChange(c)
  }
  const bind = useDrag(({ xy: [x], event }) => {
    if (disabled) return
    event.preventDefault()
    set(x)
  }, { filterTaps: false })
  const pct = ((value - min) / (max - min)) * 100
  const bump = (d: number) => !disabled && onChange(Math.min(max, Math.max(min, Number((Math.round((value + d) / step) * step).toFixed(6)))))
  const btn = `grid size-12 shrink-0 place-items-center rounded-xl ring-1 active:scale-95 ${dark ? 'bg-slate-700 text-white ring-slate-500' : 'bg-white ring-line'}`
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" disabled={disabled} onClick={() => bump(-step)} className={btn} aria-label={`${label}: azalt`}><Minus size={20} /></button>
      <div ref={ref} {...bind()} className="relative h-16 flex-1 touch-none select-none" role="slider" aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') bump(step)
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') bump(-step)
        }}
      >
        <div className={`absolute inset-x-6 top-1/2 h-3 -translate-y-1/2 rounded-full ${dark ? 'bg-slate-600' : 'bg-slate-200'}`}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
          {marks.map((m) => (
            <span key={m} className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2 bg-slate-400" style={{ left: `${((m - min) / (max - min)) * 100}%` }}>
              <span className={`absolute top-5 left-1/2 -translate-x-1/2 text-[11px] font-black whitespace-nowrap ${dark ? 'text-slate-300' : 'text-slate-500'}`}>{format(m)}</span>
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute top-1/2 grid h-12 min-w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl px-1.5 text-sm font-black whitespace-nowrap text-white shadow-md ring-4 ring-white" style={{ left: `calc(24px + (100% - 48px) * ${pct / 100})`, background: color }}>
          {format(value)}
        </div>
      </div>
      <button type="button" disabled={disabled} onClick={() => bump(step)} className={btn} aria-label={`${label}: artır`}><Plus size={20} /></button>
    </div>
  )
}

/** Küçük tamsayı ayarlayıcı: − değer + (≥ 48 px) */
export function Stepper({ value, onChange, min = 0, max = 99, label, unit, dark }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string; unit?: string; dark?: boolean }) {
  const btn = `grid size-12 place-items-center rounded-xl ring-1 active:scale-95 disabled:opacity-40 ${dark ? 'bg-slate-700 text-white ring-slate-500' : 'bg-white text-ink ring-line'}`
  return (
    <div className="flex items-center gap-2">
      <span className={`min-w-0 flex-1 text-sm font-extrabold ${dark ? 'text-slate-200' : 'text-ink-soft'}`}>{label}</span>
      <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} aria-label={`${label}: azalt`}><Minus size={18} /></button>
      <span className={`min-w-14 text-center text-2xl font-black tabular-nums ${dark ? 'text-white' : 'text-ink'}`}>{value}{unit && <span className="ml-0.5 text-sm">{unit}</span>}</span>
      <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} aria-label={`${label}: artır`}><Plus size={18} /></button>
    </div>
  )
}
