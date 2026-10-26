import { useRef, useState, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'
import { ArrowRight, Check, Delete, Minus, Plus } from 'lucide-react'
import type { Grade } from '../../data/types'
import { MathText } from '../../components/MathText'
import { LevelDots } from '../../games/kit2'

/**
 * Keşif Atölyesi (30–35) ortak küçük kiti:
 *  - Q: kesirli (rasyonel) aritmetik — ondalık/kesir hatası olmadan hesap
 *  - useLook: yaşa göre renk/boyut sınıfları (7–8 koyu "atölye")
 *  - Panel, Choice, Stepper, Pad (dokunmatik tuş takımı), TopBar
 *  - useDragDrop: dokunmatik sürükle-bırak (data-drop hedefleri), dokunuş alternatifiyle
 */

// ───────────────────────── Rasyonel sayılar ─────────────────────────

export interface Q { n: number; d: number }
const g = (a: number, b: number): number => (b === 0 ? Math.abs(a) : g(b, a % b))
export const q = (n: number, d = 1): Q => {
  if (d === 0) return { n: NaN, d: 1 }
  const s = d < 0 ? -1 : 1
  const k = g(Math.abs(n), Math.abs(d)) || 1
  return { n: (s * n) / k, d: (s * d) / k }
}
export const qAdd = (a: Q, b: Q) => q(a.n * b.d + b.n * a.d, a.d * b.d)
export const qSub = (a: Q, b: Q) => q(a.n * b.d - b.n * a.d, a.d * b.d)
export const qMul = (a: Q, b: Q) => q(a.n * b.n, a.d * b.d)
export const qDiv = (a: Q, b: Q) => (b.n === 0 ? q(NaN) : q(a.n * b.d, a.d * b.n))
export const qPow = (a: Q, e: number): Q => (e >= 0 ? q(a.n ** e, a.d ** e) : qDiv(q(1), qPow(a, -e)))
export const qEq = (a: Q, b: Q) => a.n === b.n && a.d === b.d
export const qNum = (a: Q) => a.n / a.d
export const qOk = (a: Q) => Number.isFinite(a.n) && Number.isFinite(a.d) && Math.abs(a.n) < 1e12
export const isInt = (a: Q) => a.d === 1
/** Payda yalnız 2 ve 5 çarpanlarından mı oluşuyor (sonlu ondalık) */
export const finiteDec = (a: Q) => {
  let d = a.d
  while (d % 2 === 0) d /= 2
  while (d % 5 === 0) d /= 5
  return d === 1
}

const tr = (n: number, max = 4) => n.toLocaleString('tr-TR', { maximumFractionDigits: max }).replace('-', '−')
/** Sayı yazımı (eksi işareti “−”, ondalık virgül) */
export const fmtN = (n: number, max = 4) => tr(Math.abs(n) < 1e-12 ? 0 : n, max)

/** Rasyoneli MathText biçiminde yazar: tam sayı, sonlu ondalık (dec) ya da [[a/b]] */
export function fmtQ(a: Q, mode: 'dec' | 'frac' = 'dec'): string {
  if (!qOk(a)) return '?'
  if (a.d === 1) return fmtN(a.n)
  if (mode === 'dec' && finiteDec(a)) return fmtN(qNum(a), 6)
  return `${a.n < 0 ? '−' : ''}[[${Math.abs(a.n)}/${a.d}]]`
}
/** Sağda kullanılacak negatif sayıyı parantezle yazar */
export const fmtQR = (a: Q, mode: 'dec' | 'frac' = 'dec') => (a.n < 0 ? `(${fmtQ(a, mode)})` : fmtQ(a, mode))

/** "3/4", "−2", "0,75", "-1,5" → Q */
export function parseQ(s: string): Q | null {
  const t = s.trim().replace(/−/g, '-').replace(/\s+/g, '')
  if (!t || t === '-') return null
  if (t.includes('/')) {
    const [a, b] = t.split('/')
    const x = parseQ(a), y = parseQ(b)
    if (!x || !y || y.n === 0) return null
    return qDiv(x, y)
  }
  if (!/^-?\d+(,\d+)?$/.test(t.replace('.', ','))) return null
  const [ip, fp = ''] = t.replace('.', ',').split(',')
  const neg = ip.startsWith('-')
  const whole = Math.abs(Number(ip))
  const val = q(whole * 10 ** fp.length + (fp ? Number(fp) : 0), 10 ** fp.length)
  return neg ? q(-val.n, val.d) : val
}

// ───────────────────────── Görünüm ─────────────────────────

export function useLook(grade: Grade) {
  const dark = grade >= 7
  const big = grade <= 3
  return {
    dark,
    big,
    /** dokunma hedefi yüksekliği */
    h: big ? 'min-h-14' : 'min-h-12',
    card: dark ? 'bg-slate-800/90 ring-1 ring-slate-600 text-slate-100' : 'bg-white/95 ring-1 ring-line text-ink shadow-[var(--shadow-card)]',
    soft: dark ? 'bg-slate-900/60 ring-1 ring-slate-700' : 'bg-amber-50/70 ring-1 ring-amber-200/70',
    muted: dark ? 'text-slate-400' : 'text-ink-soft',
    strong: dark ? 'text-white' : 'text-ink',
    chip: dark ? 'bg-slate-700 text-slate-100 ring-1 ring-slate-500 hover:bg-slate-600' : 'bg-white text-ink ring-2 ring-line hover:bg-paper',
    chipOn: dark ? 'bg-cyan-400 text-slate-900 ring-2 ring-cyan-200' : 'bg-brand text-white ring-2 ring-brand',
    key: dark ? 'bg-slate-700 text-white ring-1 ring-slate-500 active:bg-slate-600' : 'bg-white text-ink ring-1 ring-line active:bg-amber-50 shadow-[0_2px_0_#e7e8f2]',
    accent: dark ? '#22d3ee' : '#d6457a',
  }
}
export type Look = ReturnType<typeof useLook>

export function Panel({ look, title, icon, children, className = '' }: { look: Look; title?: ReactNode; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl p-4 ${look.card} ${className}`}>
      {title && (
        <h3 className="mb-2 flex items-start gap-2 text-lg leading-snug font-black">
          {icon}
          <span className="min-w-0 flex-1">{typeof title === 'string' ? <MathText text={title} /> : title}</span>
        </h3>
      )}
      {children}
    </section>
  )
}

/** Görev başlığı + ilerleme */
export function TopBar({ look, step, total, title, emoji }: { look: Look; step: number; total: number; title: string; emoji?: string }) {
  return (
    <div className={`mb-3 flex items-center gap-3 rounded-2xl px-4 py-2.5 ${look.card}`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-black text-white" style={{ background: look.accent }}>
        {step + 1}<span className="text-[10px] opacity-80">/{total}</span>
      </span>
      <p className="min-w-0 flex-1 text-base leading-snug font-extrabold sm:text-lg">
        {emoji && <span aria-hidden className="mr-1">{emoji}</span>}
        <MathText text={title} />
      </p>
      <div className="hidden sm:block"><LevelDots current={step} total={total} /></div>
    </div>
  )
}

export function Choice({ look, text, state = 'idle', onClick, disabled, children }: { look: Look; text?: string; state?: 'idle' | 'wrong' | 'right' | 'on'; onClick: () => void; disabled?: boolean; children?: ReactNode }) {
  const cls =
    state === 'right'
      ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
      : state === 'wrong'
        ? look.dark
          ? 'bg-slate-800 text-slate-500 ring-1 ring-slate-700 line-through decoration-2'
          : 'bg-paper text-ink-soft/70 ring-1 ring-line line-through decoration-2'
        : state === 'on'
          ? look.chipOn
          : look.chip
  return (
    <button type="button" onClick={onClick} disabled={disabled || state === 'wrong'} className={`${look.h} w-full rounded-2xl px-4 py-2 text-left text-[15px] leading-snug font-extrabold transition active:scale-[0.98] sm:text-base ${cls}`}>
      {children ?? <MathText text={text ?? ''} />}
    </button>
  )
}

export function Stepper({ look, value, onChange, min = -999, max = 999, step = 1, label, show }: { look: Look; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label?: string; show?: string }) {
  const sz = look.big ? 'size-14' : 'size-12'
  const r = (v: number) => Math.round(v * 1e6) / 1e6
  return (
    <div className="flex flex-col items-center gap-1">
      {label && <span className={`text-xs font-black tracking-wide uppercase ${look.muted}`}>{label}</span>}
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label={`${label ?? ''} azalt`} disabled={value - step < min - 1e-9} onClick={() => onChange(r(value - step))} className={`grid ${sz} place-items-center rounded-2xl transition active:scale-95 disabled:opacity-30 ${look.key}`}><Minus size={22} strokeWidth={3} /></button>
        <span className={`grid min-w-16 place-items-center px-2 text-2xl font-black tabular-nums ${look.strong}`} aria-live="polite"><MathText text={show ?? fmtN(value)} /></span>
        <button type="button" aria-label={`${label ?? ''} artır`} disabled={value + step > max + 1e-9} onClick={() => onChange(r(value + step))} className={`grid ${sz} place-items-center rounded-2xl transition active:scale-95 disabled:opacity-30 ${look.key}`}><Plus size={22} strokeWidth={3} /></button>
      </div>
    </div>
  )
}

/** Dokunmatik tuş takımı. allow: neg (−), dec (,), frac (/) */
export function Pad({ look, value, onChange, onSubmit, allow = {}, submitLabel = 'Kontrol et', disabled }: { look: Look; value: string; onChange: (v: string) => void; onSubmit?: () => void; allow?: { neg?: boolean; dec?: boolean; frac?: boolean }; submitLabel?: string; disabled?: boolean }) {
  const push = (k: string) => {
    if (disabled) return
    if (k === '⌫') return onChange(value.slice(0, -1))
    if (k === '−') return onChange(value.startsWith('−') ? value.slice(1) : '−' + value)
    if (k === ',' && (!/\d$/.test(value) || /,\d*$/.test(value))) return
    if (k === '/' && (!/\d$/.test(value) || value.includes('/'))) return
    if (value.replace(/[−,/]/g, '').length >= 8) return
    onChange(value + k)
  }
  const extra = [allow.neg && '−', allow.dec && ',', allow.frac && '/'].filter(Boolean) as string[]
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', extra[0] ?? '', '0', '⌫', ...extra.slice(1)]
  const hk = look.big ? 'h-14' : 'h-12'
  const label = (k: string) => (k === '⌫' ? 'Sil' : k === '−' ? 'Eksi' : k === ',' ? 'Virgül' : k === '/' ? 'Kesir çizgisi' : k)
  return (
    <div className="grid w-full grid-cols-3 gap-1.5">
      {keys.map((k, i) =>
        k ? (
          <button key={i} type="button" onClick={() => push(k)} disabled={disabled} className={`${hk} rounded-xl text-xl font-black transition active:scale-95 ${look.key}`} aria-label={label(k)}>
            {k === '⌫' ? <Delete className="mx-auto" size={22} /> : k}
          </button>
        ) : (
          <span key={i} />
        ),
      )}
      {onSubmit && (
        <button type="button" onClick={onSubmit} disabled={disabled || !value || value === '−'} className={`btn-primary ${hk} col-span-3 text-base`}>
          <Check size={20} strokeWidth={3} />{submitLabel}
        </button>
      )}
    </div>
  )
}

/** Görev tamamlandı kartı */
export function NextButton({ onClick, last, label }: { onClick: () => void; last?: boolean; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="btn-primary mt-3 min-h-14 w-full text-lg animate-pop">
      {label ?? (last ? 'Keşfi bitir' : 'Sonraki görev')}<ArrowRight size={20} />
    </button>
  )
}

// ───────────────────────── Sürükle-bırak ─────────────────────────

/** İmlecin altındaki ilk data-drop hedefinin değeri */
export function dropAt(x: number, y: number): string | null {
  const els = document.elementsFromPoint(x, y)
  for (const e of els) {
    const v = (e as HTMLElement).dataset?.drop
    if (v) return v
  }
  return null
}

/**
 * Bir öğeyi sürüklenebilir yapar. Bırakınca onDrop(hedef) çağrılır; kısa dokunuşta onTap.
 * Sürüklenirken öğe parmağı izler (transform). onOver ile üzerinde gezilen hedef bildirilir.
 */
export function useDragDrop({ onDrop, onTap, onOver, disabled }: { onDrop: (target: string | null) => void; onTap?: () => void; onOver?: (target: string | null) => void; disabled?: boolean }) {
  const [off, setOff] = useState<[number, number] | null>(null)
  const lastOver = useRef<string | null>(null)
  const draggedAt = useRef(0)
  const bind = useDrag(
    ({ movement: [mx, my], last, tap, xy: [x, y], event }) => {
      if (disabled || tap) return
      event?.stopPropagation?.()
      if (last) {
        draggedAt.current = Date.now()
        setOff(null)
        lastOver.current = null
        onOver?.(null)
        onDrop(dropAt(x, y))
        return
      }
      setOff([mx, my])
      const o = dropAt(x, y)
      if (o !== lastOver.current) {
        lastOver.current = o
        onOver?.(o)
      }
    },
    { filterTaps: true },
  )
  /** Dokunuş/klavye: sürüklemenin hemen ardından gelen click yok sayılır */
  const onClick = () => {
    if (disabled || Date.now() - draggedAt.current < 350) return
    onTap?.()
  }
  const style = off
    ? { transform: `translate(${off[0]}px, ${off[1]}px) scale(1.06)`, zIndex: 50, position: 'relative' as const, touchAction: 'none' as const, transition: 'none' }
    : { touchAction: 'none' as const }
  return { bind, style, onClick, dragging: !!off }
}
