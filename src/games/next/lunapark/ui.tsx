import { useEffect, useState, type ReactNode } from 'react'
import { Check, Delete, Minus, Plus } from 'lucide-react'

/** Dokunmatik sayı tuş takımı (tablette klavye açılmaz) */
export function NumPad({ unit, onSubmit, disabled, big }: { unit?: string; onSubmit: (n: number) => void; disabled?: boolean; big?: boolean }) {
  const [v, setV] = useState('')
  const [fresh, setFresh] = useState(false)
  const press = (d: string) => {
    setV((c) => ((fresh ? '' : c) + d).replace(/^0+(?=\d)/, '').slice(0, 7))
    setFresh(false)
  }
  const h = big ? 'h-14' : 'h-12'
  const key = `grid ${h} place-items-center rounded-2xl bg-white text-2xl font-black text-ink shadow-[0_3px_0_#d9dbe8] ring-1 ring-line transition active:translate-y-[2px] active:shadow-none disabled:opacity-40`
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-line">
      <div className="mb-2 flex h-14 items-center justify-center gap-2 rounded-2xl bg-white text-3xl font-black tabular-nums ring-2 ring-fuchsia-200" aria-live="polite">
        <span className={v ? (fresh ? 'text-ink-soft' : 'text-ink') : 'text-slate-300'}>{v ? Number(v).toLocaleString('tr-TR') : '?'}</span>
        {unit && <span className="text-lg text-ink-soft">{unit}</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" className={key} disabled={disabled} onClick={() => press(d)}>{d}</button>
        ))}
        <button type="button" className={key} disabled={disabled || !v} onClick={() => { setV((c) => (fresh ? '' : c.slice(0, -1))); setFresh(false) }} aria-label="Sil"><Delete size={22} /></button>
        <button type="button" className={key} disabled={disabled} onClick={() => press('0')}>0</button>
        <button type="button" disabled={disabled || !v} onClick={() => { setFresh(true); onSubmit(Number(v)) }} className={`grid ${h} place-items-center rounded-2xl bg-emerald-500 text-white shadow-[0_3px_0_#047857] transition active:translate-y-[2px] active:shadow-none disabled:opacity-40`} aria-label="Kontrol et">
          <Check size={26} strokeWidth={3} />
        </button>
      </div>
    </div>
  )
}

export function Stat({ label, value, tone = 'slate', wide }: { label: string; value: ReactNode; tone?: 'slate' | 'blue' | 'green' | 'amber' | 'red' | 'pink'; wide?: boolean }) {
  const c = {
    slate: 'bg-white text-ink ring-line',
    blue: 'bg-sky-50 text-sky-900 ring-sky-200',
    green: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-900 ring-amber-200',
    red: 'bg-rose-50 text-rose-900 ring-rose-200',
    pink: 'bg-fuchsia-50 text-fuchsia-900 ring-fuchsia-200',
  }[tone]
  return (
    <div className={`rounded-2xl px-3 py-2 ring-1 ${c} ${wide ? 'col-span-2' : ''}`}>
      <p className="text-[11px] font-black tracking-wide uppercase opacity-70">{label}</p>
      <div className="text-xl leading-tight font-black tabular-nums">{value}</div>
    </div>
  )
}

/** − değer + düğmeleri */
export function Stepper({ label, value, min, max, onChange, big, suffix }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; big?: boolean; suffix?: string }) {
  const s = big ? 'size-14' : 'size-12'
  const btn = `grid ${s} shrink-0 place-items-center rounded-2xl bg-white text-ink shadow-[0_3px_0_#d9dbe8] ring-1 ring-line transition active:translate-y-[2px] active:shadow-none disabled:opacity-35`
  return (
    <div className="rounded-2xl bg-white/90 p-2 ring-1 ring-line">
      <p className="mb-1 px-1 text-xs font-black tracking-wide text-ink-soft uppercase">{label}</p>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`${label} azalt`}><Minus size={22} strokeWidth={3} /></button>
        <span className="min-w-0 flex-1 text-center text-3xl font-black tabular-nums">{value}{suffix && <span className="ml-1 text-sm text-ink-soft">{suffix}</span>}</span>
        <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`${label} artır`}><Plus size={22} strokeWidth={3} /></button>
      </div>
    </div>
  )
}

/** Seçenek çipleri (koltuk sayısı gibi) */
export function Chips<T extends string | number>({ label, options, value, onChange, big, render }: { label: string; options: T[]; value: T; onChange: (v: T) => void; big?: boolean; render?: (v: T) => ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/90 p-2 ring-1 ring-line">
      <p className="mb-1 px-1 text-xs font-black tracking-wide text-ink-soft uppercase">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={String(o)}
            type="button"
            onClick={() => onChange(o)}
            className={`${big ? 'min-h-14 min-w-14' : 'min-h-12 min-w-12'} flex-1 rounded-2xl px-2 text-xl font-black ring-1 transition active:scale-95 ${o === value ? 'bg-fuchsia-600 text-white ring-fuchsia-600 shadow-[0_3px_0_#86198f]' : 'bg-white text-ink ring-line shadow-[0_3px_0_#d9dbe8]'}`}
            aria-pressed={o === value}
          >
            {render ? render(o) : o}
          </button>
        ))}
      </div>
    </div>
  )
}

/** lg (≥ 1024 px) yerleşimi mi? */
export function useWide() {
  const q = '(min-width: 1024px)'
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const f = () => setWide(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return wide
}

/** Sahne üstündeki tabela */
export function Sign({ children, tone = 'pink', className = '' }: { children: ReactNode; tone?: 'pink' | 'dark' | 'green' | 'amber'; className?: string }) {
  const c = { pink: 'bg-white/95 text-fuchsia-900 ring-fuchsia-200', dark: 'bg-slate-900/85 text-white ring-slate-700', green: 'bg-emerald-50/95 text-emerald-900 ring-emerald-300', amber: 'bg-amber-50/95 text-amber-900 ring-amber-300' }[tone]
  return <div className={`pointer-events-none rounded-xl px-2 py-0.5 text-center font-black whitespace-nowrap shadow-md ring-2 tabular-nums sm:rounded-2xl sm:px-3 sm:py-1.5 ${c} ${className}`}>{children}</div>
}
