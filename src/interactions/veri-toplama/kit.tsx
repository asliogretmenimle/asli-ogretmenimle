import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Minus, Plus } from 'lucide-react'
import type { Grade } from '../../data/types'
import { MathText } from '../../components/MathText'
import { LevelDots, Nudge } from '../../games/kit2'
import type { ManipulativeTool } from '../../data/types'

/**
 * Veri ve olasılık etkinlikleri (63–67) için ortak küçük kit:
 *  - useLook: yaşa göre renk/boyut (1–3 sıcak ve büyük, 4–6 keşif, 7–8 koyu laboratuvar)
 *  - Panel, TopBar, Choice, Stepper, NextButton, Work (çalışma alanı solda, panel sağda)
 *  - useSay: akıllı geri bildirim (Nudge) durumu
 *  - Sayı yazımı (tr), rastgelelik yardımcıları
 */

// ───────────────────────── Sayılar ─────────────────────────

export const fmtN = (n: number, max = 2) => (Math.abs(n) < 1e-12 ? 0 : n).toLocaleString('tr-TR', { maximumFractionDigits: max }).replace('-', '−')
export const pct = (x: number, d = 0) => `%${fmtN(x * 100, d)}`
export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
/** a/b → MathText kesri (sadeleştirilmiş) */
export const fracT = (a: number, b: number, simplify = true) => {
  if (b === 0) return '?'
  if (a === 0) return '0'
  if (a === b) return '1'
  const k = simplify ? gcd(a, b) : 1
  return `[[${a / k}/${b / k}]]`
}
export const rint = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
export const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)]
export function shuffle<T>(a: readonly T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}
/** Ağırlıklı rastgele seçim: indeks döner */
export function drawIndex(weights: readonly number[]) {
  const t = weights.reduce((s, w) => s + w, 0)
  let r = Math.random() * t
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r < 0) return i
  }
  return weights.length - 1
}

// ───────────────────────── Görünüm ─────────────────────────

export function useLook(grade: Grade) {
  const dark = grade >= 7
  const big = grade <= 3
  return {
    grade,
    dark,
    big,
    h: big ? 'min-h-14' : 'min-h-12',
    card: dark ? 'bg-slate-800/90 ring-1 ring-slate-600 text-slate-100' : 'bg-white/95 ring-1 ring-line text-ink shadow-[var(--shadow-card)]',
    soft: dark ? 'bg-slate-900/60 ring-1 ring-slate-700' : 'bg-white/80 ring-1 ring-line',
    muted: dark ? 'text-slate-400' : 'text-ink-soft',
    strong: dark ? 'text-white' : 'text-ink',
    chip: dark ? 'bg-slate-700 text-slate-100 ring-1 ring-slate-500 hover:bg-slate-600' : 'bg-white text-ink ring-2 ring-line hover:bg-paper',
    chipOn: dark ? 'bg-cyan-400 text-slate-900 ring-2 ring-cyan-200' : 'bg-violet-600 text-white ring-2 ring-violet-600',
    key: dark ? 'bg-slate-700 text-white ring-1 ring-slate-500 active:bg-slate-600' : 'bg-white text-ink ring-1 ring-line active:bg-violet-50 shadow-[0_2px_0_#e7e8f2]',
    accent: dark ? '#22d3ee' : '#7c3aed',
    ghost: dark ? '!bg-slate-700 !text-white !ring-slate-500' : '',
  }
}
export type Look = ReturnType<typeof useLook>

export function Panel({ look, title, icon, children, className = '' }: { look: Look; title?: ReactNode; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl p-4 ${look.card} ${className}`}>
      {title && (
        <h3 className="mb-2 flex items-start gap-2 text-lg leading-snug font-black">
          {icon && <span aria-hidden className="shrink-0">{icon}</span>}
          <span className="min-w-0 flex-1">{typeof title === 'string' ? <MathText text={title} /> : title}</span>
        </h3>
      )}
      {children}
    </section>
  )
}

export function TopBar({ look, step, total, title, emoji, kicker }: { look: Look; step: number; total: number; title: string; emoji?: string; kicker?: string }) {
  return (
    <div className={`mb-3 flex items-center gap-3 rounded-2xl px-4 py-2.5 ${look.card}`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-black text-white" style={{ background: look.dark ? '#0891b2' : look.accent }}>
        {step + 1}<span className="text-[10px] opacity-80">/{total}</span>
      </span>
      <div className="min-w-0 flex-1">
        {kicker && <p className={`text-[11px] font-black tracking-wide uppercase ${look.muted}`}>{kicker}</p>}
        <p className="text-base leading-snug font-extrabold sm:text-lg">
          {emoji && <span aria-hidden className="mr-1">{emoji}</span>}
          <MathText text={title} />
        </p>
      </div>
      <div className="hidden sm:block"><LevelDots current={step} total={total} /></div>
    </div>
  )
}

/** Çalışma alanı solda, panel sağda (yatay tablet); dikeyde alt alta */
export function Work({ scene, panel }: { scene: ReactNode; panel: ReactNode }) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">{scene}</div>
      <div className="min-w-0 space-y-3 lg:sticky lg:top-20">{panel}</div>
    </div>
  )
}

export type ChoiceState = 'idle' | 'wrong' | 'right' | 'on' | 'dim'
export function Choice({ look, text, state = 'idle', onClick, disabled, children, className = '' }: { look: Look; text?: string; state?: ChoiceState; onClick: () => void; disabled?: boolean; children?: ReactNode; className?: string }) {
  const cls =
    state === 'right'
      ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
      : state === 'wrong'
        ? look.dark
          ? 'bg-slate-800 text-slate-500 ring-1 ring-slate-700'
          : 'bg-paper text-ink-soft/70 ring-1 ring-line'
        : state === 'on'
          ? look.chipOn
          : state === 'dim'
            ? `${look.chip} opacity-60`
            : look.chip
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${look.h} w-full rounded-2xl px-4 py-2 text-left text-[15px] leading-snug font-extrabold transition active:scale-[0.98] sm:text-base ${cls} ${className}`}>
      {children ?? <MathText text={text ?? ''} />}
    </button>
  )
}

export function Stepper({ look, value, onChange, min = -9999, max = 9999, step = 1, label, show, compact }: { look: Look; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label?: string; show?: string; compact?: boolean }) {
  const sz = look.big ? 'size-14' : 'size-12'
  const r = (v: number) => Math.round(v * 1e6) / 1e6
  return (
    <div className="flex flex-col items-center gap-1">
      {label && <span className={`text-xs font-black tracking-wide uppercase ${look.muted}`}><MathText text={label} /></span>}
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label={`${label ?? ''} azalt`} disabled={value - step < min - 1e-9} onClick={() => onChange(r(value - step))} className={`grid ${sz} place-items-center rounded-2xl transition active:scale-95 disabled:opacity-30 ${look.key}`}><Minus size={22} strokeWidth={3} /></button>
        <span className={`grid ${compact ? 'min-w-12' : 'min-w-16'} place-items-center px-1 text-2xl font-black tabular-nums ${look.strong}`} aria-live="polite"><MathText text={show ?? fmtN(value)} /></span>
        <button type="button" aria-label={`${label ?? ''} artır`} disabled={value + step > max + 1e-9} onClick={() => onChange(r(value + step))} className={`grid ${sz} place-items-center rounded-2xl transition active:scale-95 disabled:opacity-30 ${look.key}`}><Plus size={22} strokeWidth={3} /></button>
      </div>
    </div>
  )
}

/** Son görevde NextButton “Keşfi bitir” yazar */
export const LastTask = createContext(false)

export function NextButton({ onClick, last: lastProp, label, disabled }: { onClick: () => void; last?: boolean; label?: string; disabled?: boolean }) {
  const ctx = useContext(LastTask)
  const last = lastProp ?? ctx
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="btn-primary mt-3 min-h-14 w-full text-lg animate-pop">
      {label ?? (last ? 'Keşfi bitir' : 'Sonraki görev')}<ArrowRight size={20} />
    </button>
  )
}

// ───────────────────────── Geri bildirim ─────────────────────────

export type Say = { q: string; tone?: 'ok'; mis?: string; tool?: ManipulativeTool; k: number } | null

/** Nudge durumu: say(q) her çağrıldığında yeni anahtar → yeni Nudge (kavram yanılgısı bir kez yazılır) */
export function useSay() {
  const [s, setS] = useState<Say>(null)
  const say = useCallback((q: string, opt: { tone?: 'ok'; mis?: string; tool?: ManipulativeTool } = {}) => setS((p) => ({ q, ...opt, k: (p?.k ?? 0) + 1 })), [])
  const clear = useCallback(() => setS(null), [])
  const node = s ? <Nudge key={s.k} question={s.q} tone={s.tone} misconception={s.mis} tool={s.tool} /> : null
  return { s, say, clear, node }
}

/** Bir sonraki çizim karesinde çalışan döngü (animasyonlu çok sayıda deneme için) */
export function useRaf() {
  const id = useRef<number | null>(null)
  useEffect(() => () => { if (id.current) cancelAnimationFrame(id.current) }, [])
  return useCallback((step: (frame: number) => boolean) => {
    if (id.current) cancelAnimationFrame(id.current)
    let f = 0
    const loop = () => {
      const more = step(f++)
      id.current = more ? requestAnimationFrame(loop) : null
    }
    id.current = requestAnimationFrame(loop)
  }, [])
}

/** Kabın genişliğini izler (SVG viewBox’ını dar ekranlarda daraltıp yazıları okunur tutmak için) */
export function useBoxW(fallback = 600) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth || fallback))
    ro.observe(el)
    setW(el.clientWidth || fallback)
    return () => ro.disconnect()
  }, [fallback])
  return [ref, w] as const
}

/** Küçük bilgi rozeti */
export function Pill({ look, children, tone = 'plain' }: { look: Look; children: ReactNode; tone?: 'plain' | 'good' | 'warn' | 'info' }) {
  const c =
    tone === 'good'
      ? look.dark ? 'bg-emerald-500/20 text-emerald-200 ring-emerald-500/50' : 'bg-emerald-50 text-emerald-800 ring-emerald-200'
      : tone === 'warn'
        ? look.dark ? 'bg-amber-500/20 text-amber-200 ring-amber-500/50' : 'bg-amber-50 text-amber-800 ring-amber-200'
        : tone === 'info'
          ? look.dark ? 'bg-cyan-500/15 text-cyan-200 ring-cyan-500/40' : 'bg-sky-50 text-sky-800 ring-sky-200'
          : look.dark ? 'bg-slate-700 text-slate-100 ring-slate-500' : 'bg-white text-ink ring-line'
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-extrabold ring-1 ${c}`}>{children}</span>
}

/** Yıldız: ilk denemede çözülen görev oranına göre */
export const starsBy = (firsts: number, total: number): 1 | 2 | 3 => (firsts >= total - 1 ? 3 : firsts >= Math.ceil(total / 2) ? 2 : 1)
