import { useRef, useState, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'
import { ArrowRight, Check, Delete, Flag, Minus, Plus } from 'lucide-react'
import { LevelDots, Nudge as KitNudge } from '../../games/kit2'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'

/**
 * Keşif Atölyesi 41–45 (yüzde, oran, tarif, indirim, kesir yanılgıları) için ortak parçalar:
 * başlık, iki sütunlu tablet yerleşimi, dokunmatik sayı tuş takımı, kaydırıcı, boyama ızgarası,
 * deneme sayacı (öğretmen raporu) ve sayı biçimleri.
 */

/* ───────────── sayı yardımcıları ───────────── */

export const fmt = (v: number, d = 2) => (Math.abs(v) < 1e-9 ? 0 : v).toLocaleString('tr-TR', { maximumFractionDigits: d })
export const tl = (v: number) => `${fmt(v)} TL`
export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
export const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps

/** Basit tekrarlanabilir rastgele sayı üreteci */
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

/** 0,75 → "[[3/4]]", 2,25 → "[[2 1/4]]", 3 → "3" (paydası ≤ 12 olan kesirler için) */
export function mixed(v: number, maxDen = 12): string {
  const w = Math.floor(v + 1e-9)
  const f = v - w
  if (f < 1e-9) return fmt(w)
  for (let d = 2; d <= maxDen; d++) {
    const nu = Math.round(f * d)
    if (near(nu / d, f, 1e-7)) {
      const g = gcd(nu, d)
      return w ? `[[${w} ${nu / g}/${d / g}]]` : `[[${nu / g}/${d / g}]]`
    }
  }
  return fmt(v)
}

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
  }
}

/* ───────────── yerleşim ───────────── */

export function Header({ emoji, kicker, title, idx, total, right, dark }: { emoji: string; kicker: string; title: ReactNode; idx: number; total: number; right?: ReactNode; dark?: boolean }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`grid size-11 shrink-0 place-items-center rounded-2xl text-2xl shadow-sm ${dark ? 'bg-slate-700' : 'bg-white ring-1 ring-line'}`} aria-hidden>{emoji}</span>
        <div className="min-w-0">
          <p className={`text-[11px] font-black tracking-wide uppercase ${dark ? 'text-teal-300' : 'text-teal-700'}`}>{kicker} {idx + 1} / {total}</p>
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
export function Split({ work, panel }: { work: ReactNode; panel: ReactNode }) {
  return (
    <div className="grid gap-4 text-ink lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">{work}</div>
      <div className="flex min-w-0 flex-col gap-3">{panel}</div>
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white/95 p-3 text-ink ring-1 ring-line ${className}`}>{children}</div>
}

/** Görev metni kartı (koyu sahnede de okunur) */
export function Prompt({ step, children }: { step?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 text-ink shadow-sm ring-1 ring-line">
      {step && <p className="mb-0.5 text-[11px] font-black tracking-wide text-teal-700 uppercase">{step}</p>}
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
          className={`min-h-14 rounded-2xl px-3 py-2 text-base font-black ring-2 transition active:scale-[0.97] ${value === o.id ? 'bg-teal-600 text-white ring-teal-700 shadow-[0_3px_0_#115e59]' : 'bg-white text-ink ring-line hover:bg-teal-50'} disabled:cursor-default`}
        >
          {o.label}
          {o.sub && <span className={`block text-xs font-bold ${value === o.id ? 'text-teal-50' : 'text-ink-soft'}`}>{o.sub}</span>}
        </button>
      ))}
    </div>
  )
}

/* ───────────── sayı tuş takımı ───────────── */

export function NumPad({ value, onChange, comma = false, max = 6, unit, label, disabled }: { value: string; onChange: (v: string) => void; comma?: boolean; max?: number; unit?: string; label?: string; disabled?: boolean }) {
  const press = (k: string) => {
    if (disabled) return
    if (k === '⌫') return onChange(value.slice(0, -1))
    if (k === ',') {
      if (!comma || value.includes(',')) return
      return onChange((value || '0') + ',')
    }
    if (value.replace(',', '').length >= max) return
    onChange(value === '0' ? k : value + k)
  }
  const keys = ['1', '2', '3', '⌫', '4', '5', '6', '0', '7', '8', '9', comma ? ',' : '']
  return (
    <div className="rounded-2xl bg-slate-50 p-2 ring-1 ring-line">
      <div className="mb-2 flex min-h-14 items-center justify-between gap-2 rounded-xl bg-white px-3 ring-2 ring-teal-500/60">
        {label && <span className="text-sm font-extrabold text-ink-soft">{label}</span>}
        <span className="ml-auto text-3xl font-black text-ink tabular-nums">{value || <span className="text-slate-300">?</span>}</span>
        {unit && <span className="text-lg font-black text-ink-soft">{unit}</span>}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {keys.map((k, i) =>
          k ? (
            <button key={i} type="button" disabled={disabled} onClick={() => press(k)} className={`grid h-12 place-items-center rounded-xl text-xl font-black ring-1 ring-line active:scale-95 ${k === '⌫' ? 'bg-slate-200 text-ink' : 'bg-white text-ink hover:bg-teal-50'}`} aria-label={k === '⌫' ? 'Sil' : k}>
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
export const parseNum = (s: string) => (s === '' ? NaN : Number(s.replace(',', '.')))

/* ───────────── kaydırıcı ───────────── */

export function Slider({ value, onChange, min = 0, max = 100, step = 1, marks = [], format = (v: number) => fmt(v), color = '#0d9488', disabled, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; marks?: number[]; format?: (v: number) => string; color?: string; disabled?: boolean; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const set = (cx: number) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const t = Math.min(1, Math.max(0, (cx - r.left - 24) / (r.width - 48)))
    const v = Math.round((min + t * (max - min)) / step) * step
    if (v !== value) onChange(Math.min(max, Math.max(min, v)))
  }
  const bind = useDrag(({ xy: [x], event }) => {
    if (disabled) return
    event.preventDefault()
    set(x)
  }, { filterTaps: false })
  const pct = ((value - min) / (max - min)) * 100
  const bump = (d: number) => !disabled && onChange(Math.min(max, Math.max(min, Math.round((value + d) / step) * step)))
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" disabled={disabled} onClick={() => bump(-step)} className="grid size-12 shrink-0 place-items-center rounded-xl bg-white ring-1 ring-line active:scale-95" aria-label="Azalt"><Minus size={20} /></button>
      <div ref={ref} {...bind()} className="relative h-16 flex-1 touch-none select-none" role="slider" aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') bump(step)
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') bump(-step)
        }}
      >
        <div className="absolute inset-x-6 top-1/2 h-3 -translate-y-1/2 rounded-full bg-slate-200">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
          {marks.map((m) => (
            <span key={m} className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2 bg-slate-400" style={{ left: `${((m - min) / (max - min)) * 100}%` }}>
              <span className="absolute top-5 left-1/2 -translate-x-1/2 text-[11px] font-black whitespace-nowrap text-slate-500">{format(m)}</span>
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute top-1/2 grid h-12 min-w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl px-1.5 text-sm font-black whitespace-nowrap text-white shadow-md ring-4 ring-white" style={{ left: `calc(24px + (100% - 48px) * ${pct / 100})`, background: color }}>
          {format(value)}
        </div>
      </div>
      <button type="button" disabled={disabled} onClick={() => bump(step)} className="grid size-12 shrink-0 place-items-center rounded-xl bg-white ring-1 ring-line active:scale-95" aria-label="Artır"><Plus size={20} /></button>
    </div>
  )
}

/* ───────────── 10×10 boyama ızgarası ───────────── */

export const S = 30
/** Sütun sütun doldurma sırası (onluklar görünür) */
export const ORDER = Array.from({ length: 100 }, (_, i) => (i % 10) * 10 + Math.floor(i / 10))
export const countOn = (c: boolean[]) => c.reduce((s, x) => s + (x ? 1 : 0), 0)
export const emptyCells = () => Array<boolean>(100).fill(false)

/** +n / −n: sütun sırasına göre boş kareleri boya ya da son boyananları sil (kilitli kareler atlanır) */
export function bumpCells(cells: boolean[], d: number, blocked?: boolean[]) {
  const c = [...cells]
  if (d > 0) {
    for (const i of ORDER) {
      if (d <= 0) break
      if (!c[i] && !blocked?.[i]) {
        c[i] = true
        d--
      }
    }
  } else {
    for (let j = ORDER.length - 1; j >= 0 && d < 0; j--) {
      const i = ORDER[j]
      if (c[i]) {
        c[i] = false
        d++
      }
    }
  }
  return c
}

/**
 * Parmakla boyanan 10×10 ızgara. Boş kareden başlayan sürükleme boyar, dolu kareden başlayan siler.
 * `blocked`: boyanamayan (başka renkle gösterilen) kareler. `children`: 0–300 koordinatlarında SVG katmanı.
 */
export function PaintGrid({ cells, onChange, color = '#0d9488', locked, blocked, blockedColor = '#cbd5e1', blockedPattern, lines = true, label, children, under, className = '' }: { cells: boolean[]; onChange: (c: boolean[]) => void; color?: string; locked?: boolean; blocked?: boolean[]; blockedColor?: string; blockedPattern?: boolean; lines?: boolean; label: string; children?: ReactNode; under?: ReactNode; className?: string }) {
  const ref = useRef<SVGSVGElement>(null)
  const work = useRef<{ mode: boolean; last: number; cells: boolean[] } | null>(null)
  const at = (cx: number, cy: number) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return -1
    const c = Math.floor(((cx - r.left) / r.width) * 10), rw = Math.floor(((cy - r.top) / r.height) * 10)
    if (c < 0 || c > 9 || rw < 0 || rw > 9) return -1
    return rw * 10 + c
  }
  const paintLine = (cs: boolean[], from: number, to: number, mode: boolean) => {
    const [c0, r0, c1, r1] = [from % 10, Math.floor(from / 10), to % 10, Math.floor(to / 10)]
    const steps = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0), 1)
    for (let s = 0; s <= steps; s++) {
      const i = Math.round(r0 + ((r1 - r0) * s) / steps) * 10 + Math.round(c0 + ((c1 - c0) * s) / steps)
      if (!blocked?.[i]) cs[i] = mode
    }
  }
  const bind = useDrag(
    ({ xy: [x, y], first, last, event }) => {
      if (locked) return
      event.preventDefault()
      const i = at(x, y)
      if (first) {
        if (i < 0 || blocked?.[i]) {
          work.current = null
          return
        }
        const cs = [...cells]
        const mode = !cs[i]
        cs[i] = mode
        work.current = { mode, last: i, cells: cs }
        onChange([...cs])
      } else if (work.current && i >= 0 && i !== work.current.last) {
        paintLine(work.current.cells, work.current.last, i, work.current.mode)
        work.current.last = i
        onChange([...work.current.cells])
      }
      if (last) work.current = null
    },
    { filterTaps: false, pointer: { capture: true } },
  )
  return (
    <svg ref={ref} {...bind()} viewBox={`-3 -3 ${S * 10 + 6} ${S * 10 + 6}`} className={`block w-full touch-none select-none ${className}`} style={{ cursor: locked ? 'default' : 'crosshair' }} role="img" aria-label={label}>
      <defs>
        <pattern id="pg-stripe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill={blockedColor} />
          <line x1="0" y1="0" x2="0" y2="8" stroke="#fff" strokeWidth="3" />
        </pattern>
      </defs>
      <rect x={0} y={0} width={S * 10} height={S * 10} rx={6} fill="#fff" />
      {under}
      {cells.map((on, i) => {
        const x = (i % 10) * S, y = Math.floor(i / 10) * S
        const b = blocked?.[i]
        if (!on && !b) return null
        return <rect key={i} x={x + 1.5} y={y + 1.5} width={S - 3} height={S - 3} rx={4} fill={b ? (blockedPattern ? 'url(#pg-stripe)' : blockedColor) : color} style={{ transition: 'fill 120ms' }} />
      })}
      {lines &&
        Array.from({ length: 11 }).map((_, i) => (
          <g key={i} stroke={i === 5 ? '#b8bdd3' : '#e3e5ef'} strokeWidth={i === 5 ? 1.6 : 1}>
            <line x1={i * S} x2={i * S} y1={0} y2={S * 10} />
            <line y1={i * S} y2={i * S} x1={0} x2={S * 10} />
          </g>
        ))}
      {children}
      <rect x={0} y={0} width={S * 10} height={S * 10} rx={6} fill="none" stroke="#1f2340" strokeWidth={2.5} />
    </svg>
  )
}

/** Izgaranın altındaki hızlı düğmeler (sürüklemenin dokun alternatifi) */
export function GridButtons({ cells, onChange, blocked, disabled, compact }: { cells: boolean[]; onChange: (c: boolean[]) => void; blocked?: boolean[]; disabled?: boolean; compact?: boolean }) {
  const b = (label: string, d: number) => (
    <button key={label} type="button" disabled={disabled} onClick={() => onChange(bumpCells(cells, d, blocked))} className={`min-h-12 rounded-xl bg-white font-black text-ink ring-1 ring-line active:scale-95 disabled:opacity-40 ${compact ? 'min-w-11 px-1.5 text-sm' : 'min-w-14 px-3 text-base'}`}>
      {label}
    </button>
  )
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {b('−10', -10)}
      {b('−1', -1)}
      {b('+1', 1)}
      {b('+10', 10)}
      <button type="button" disabled={disabled} onClick={() => onChange(cells.map(() => false))} className={`min-h-12 rounded-xl bg-white font-black text-ink-soft ring-1 ring-line active:scale-95 disabled:opacity-40 ${compact ? 'px-2 text-sm' : 'px-3 text-sm'}`}>
        Temizle
      </button>
    </div>
  )
}
