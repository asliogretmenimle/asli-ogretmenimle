import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { Check, Delete } from 'lucide-react'
import { MathText } from '../../../components/MathText'

/** Yaşa göre görünüm: 1–6 sıcak “sınıf çemberi”, 7–8 koyu “stüdyo” */
export interface Theme {
  dark: boolean
  card: string
  soft: string
  muted: string
  strong: string
  chip: string
  chipOn: string
  key: string
  accent: string
}

export const themeFor = (dark: boolean): Theme =>
  dark
    ? {
        dark,
        card: 'bg-slate-800/85 ring-1 ring-slate-600/80 text-slate-100 shadow-[0_8px_30px_rgba(0,0,0,.35)]',
        soft: 'bg-slate-900/70 ring-1 ring-slate-700',
        muted: 'text-slate-400',
        strong: 'text-white',
        chip: 'bg-slate-700 text-slate-100 ring-1 ring-slate-500 hover:bg-slate-600',
        chipOn: 'bg-cyan-400 text-slate-900 ring-2 ring-cyan-200',
        key: 'bg-slate-700 text-white ring-1 ring-slate-500 active:bg-slate-600',
        accent: '#22d3ee',
      }
    : {
        dark,
        card: 'bg-white/95 ring-1 ring-line text-ink shadow-[var(--shadow-card)]',
        soft: 'bg-amber-50/80 ring-1 ring-amber-200/80',
        muted: 'text-ink-soft',
        strong: 'text-ink',
        chip: 'bg-white text-ink ring-2 ring-amber-200 hover:bg-amber-50',
        chipOn: 'bg-rose-500 text-white ring-2 ring-rose-300',
        key: 'bg-white text-ink ring-1 ring-line active:bg-amber-50 shadow-[0_2px_0_#e7e8f2]',
        accent: '#e11d48',
      }

export const ThemeCtx = createContext<Theme>(themeFor(false))
export const useTheme = () => useContext(ThemeCtx)

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  const t = useTheme()
  return <div className={`rounded-3xl p-3 sm:p-4 ${t.card} ${className}`}>{children}</div>
}

/** İşlem satırları (sembol, hareketten türeyerek belirir) */
export function Trail({ lines, className = '' }: { lines: string[]; className?: string }) {
  const t = useTheme()
  if (!lines.length) return null
  return (
    <ol className={`space-y-1 rounded-2xl p-3 font-extrabold tabular-nums ${t.soft} ${className}`} aria-label="Adımların">
      {lines.map((l, i) => (
        <li key={i} className="flex items-baseline gap-2 text-lg animate-fade-up sm:text-xl">
          <span className={`text-xs font-black ${t.muted}`}>{i + 1}.</span>
          <MathText text={l} />
        </li>
      ))}
    </ol>
  )
}

/** Dokunmatik sayı tuş takımı (klavye de çalışır) */
export function Keypad({ value, onChange, onSubmit, decimal, negative, prompt, disabled }: { value: string; onChange: (v: string) => void; onSubmit: () => void; decimal?: boolean; negative?: boolean; prompt: ReactNode; disabled?: boolean }) {
  const t = useTheme()
  const push = (k: string) => {
    if (disabled) return
    if (k === '⌫') return onChange(value.slice(0, -1))
    if (k === '−') return onChange(value.startsWith('−') ? value.slice(1) : '−' + value)
    if (k === ',' && (value.includes(',') || !value.replace('−', ''))) return
    if (value.replace(/[−,.]/g, '').length >= 7) return
    onChange(value + k)
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (disabled) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (/^[0-9]$/.test(e.key)) push(e.key)
      else if ((e.key === ',' || e.key === '.') && decimal) push(',')
      else if (e.key === '-' && negative) push('−')
      else if (e.key === 'Backspace') push('⌫')
      else if (e.key === 'Enter' && value) onSubmit()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', negative ? '−' : decimal ? ',' : '', '0', '⌫']
  const extra = negative && decimal
  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-2xl font-black sm:text-3xl">
        <span className={t.strong}>{prompt}</span>
        <span className={`grid min-h-14 min-w-28 place-items-center rounded-2xl px-3 tabular-nums ring-[3px] ${value ? (t.dark ? 'bg-slate-900 text-cyan-300 ring-cyan-400' : 'bg-white text-ink ring-rose-300') : t.dark ? 'bg-slate-900/60 text-slate-500 ring-slate-600' : 'bg-rose-50 text-rose-300 ring-rose-200'}`} aria-live="polite" aria-label="Cevabın">{value || '?'}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k, i) =>
          k ? (
            <button key={i} type="button" onClick={() => push(k)} disabled={disabled} className={`h-14 rounded-2xl text-2xl font-black transition active:scale-95 ${t.key}`} aria-label={k === '⌫' ? 'Sil' : k === '−' ? 'Eksi işareti' : k === ',' ? 'Virgül' : k}>
              {k === '⌫' ? <Delete className="mx-auto" size={24} /> : k}
            </button>
          ) : (
            <span key={i} />
          ),
        )}
        {extra && (
          <button type="button" onClick={() => push(',')} disabled={disabled} className={`h-14 rounded-2xl text-2xl font-black ${t.key}`} aria-label="Virgül">,</button>
        )}
        <button type="button" onClick={onSubmit} disabled={!value || value === '−' || disabled} className={`${extra ? 'col-span-2' : 'col-span-3'} btn-primary h-14 text-lg`}>
          <Check size={22} strokeWidth={3} />Kontrol et
        </button>
      </div>
    </div>
  )
}

export const parseNum = (s: string) => Number(s.replace('−', '-').replace(',', '.'))
