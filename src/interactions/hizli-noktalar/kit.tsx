import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useDrag } from '@use-gesture/react'
import { ArrowRight, Delete, Lightbulb, RotateCcw } from 'lucide-react'
import type { Grade, ManipulativeConfig, ManipulativeTool } from '../../data/types'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { BigButton, LevelDots, Nudge, Scene, TaskCard, useAge } from '../../games/kit2'

/**
 * Keşif Atölyesi (22–29, sayılar) için ortak kabuk:
 *  - useSession: görev sırası, ilk deneme / ipucu sayımı, öğretmen raporu (attempt, item, hint)
 *  - ActivityLayout: yatay tablette solda sahne + sağda görev paneli, dikeyde alt alta
 *  - NumPad: büyük sayı tuşları (1–3. sınıfta ≥ 56 px)
 *  - useTileDrag: @use-gesture ile sürükle-bırak + dokun-dokun alternatifi
 */

export const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)]
export const randInt = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
/** Türkçe binlik ayırıcılı yazım: 2350 → "2.350" (4 basamakta da ayır) */
export const tr = (n: number, d = 3) => n.toLocaleString('tr-TR', { maximumFractionDigits: d, useGrouping: true }).replace('-', '−')

/** lg (≥ 1024 px) yerleşimi */
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

export type NudgeState = { q: string; tool?: ManipulativeTool; toolConfig?: ManipulativeConfig; toolTitle?: string; misc?: string; tone: 'ok' | 'think'; id: number } | null

export function useNudge() {
  const [nudge, setNudge] = useState<NudgeState>(null)
  const id = useRef(0)
  const show = useCallback((q: string, o?: { tool?: ManipulativeTool; toolConfig?: ManipulativeConfig; toolTitle?: string; misc?: string; tone?: 'ok' | 'think' }) => {
    setNudge({ q, ...o, tone: o?.tone ?? 'think', id: ++id.current })
  }, [])
  const clear = useCallback(() => setNudge(null), [])
  return { nudge, show, clear }
}

/**
 * Oturum: görev sırası ve öğretmen raporu.
 *  - attempt(ok): her kontrol
 *  - hint(): ipucu ya da "bir daha bak"
 *  - complete(): görev bitti (tek sefer item kaydı)
 *  - next(): sonraki göreve geç; sonuncudaysa finish() ile onFinish çağrılır
 */
export function useSession(total: number) {
  const track = useTracker()
  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState(false)
  const stat = useRef({ fails: 0, hints: 0, itemDone: false })
  const totals = useRef({ first: 0, done: 0, fails: 0, hints: 0 })
  const attempt = useCallback(
    (ok: boolean) => {
      track.attempt(ok)
      if (!ok) {
        stat.current.fails++
        totals.current.fails++
        sfx.bad()
      }
    },
    [track],
  )
  const hint = useCallback(() => {
    track.hint()
    stat.current.hints++
    totals.current.hints++
  }, [track])
  const complete = useCallback(() => {
    if (stat.current.itemDone) return
    stat.current.itemDone = true
    const first = stat.current.fails === 0 && stat.current.hints === 0
    track.item(first)
    if (first) totals.current.first++
    totals.current.done++
    setDone(true)
    sfx.ok()
  }, [track])
  const next = useCallback(() => {
    stat.current = { fails: 0, hints: 0, itemDone: false }
    setDone(false)
    setIdx((i) => i + 1)
  }, [])
  /** 1–3 yıldız: ilk denemede biten görev oranı (ipucu/hata yarım sayılır) */
  const stars = (): 1 | 2 | 3 => {
    const r = (totals.current.first + 0.5 * (total - totals.current.first)) / total
    return r >= 0.85 ? 3 : r >= 0.55 ? 2 : 1
  }
  return { idx, done, last: idx >= total - 1, attempt, hint, complete, next, stars, totals: totals.current, taskFails: () => stat.current.fails }
}

/**
 * Sahne solda, görev paneli sağda (lg). Telefonda / dikey tablette alt alta.
 */
export function ActivityLayout({
  grade,
  idx,
  total,
  title,
  prompt,
  children,
  panel,
  nudge,
  onCloseNudge,
  done,
  doneBox,
  onNext,
  nextLabel,
  onHint,
  onReset,
  hintLabel = 'İpucu',
  footer,
}: {
  grade: Grade
  idx: number
  total: number
  title: string
  prompt: ReactNode
  children: ReactNode
  panel?: ReactNode
  nudge: NudgeState
  onCloseNudge: () => void
  done: boolean
  doneBox?: ReactNode
  onNext: () => void
  nextLabel?: string
  onHint?: () => void
  onReset?: () => void
  hintLabel?: string
  /** Panelin altında her zaman görünen ek içerik */
  footer?: ReactNode
}) {
  const wide = useWide()
  const age = useAge(grade)
  const dark = age.tier === 'atolye'
  const nudgeView = nudge && (
    <div className="[&_p]:min-w-[11rem]">
      <Nudge key={nudge.id} question={nudge.q} tool={nudge.tool} toolConfig={nudge.toolConfig} toolTitle={nudge.toolTitle} misconception={nudge.misc} tone={nudge.tone} onClose={onCloseNudge} />
    </div>
  )
  const last = idx >= total - 1
  return (
    <div className="grid gap-3 select-none lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-4">
      <div className="lg:col-start-2 lg:row-start-1">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <span className={`truncate text-sm font-black ${dark ? 'text-slate-600' : 'text-ink-soft'}`}>Görev {idx + 1}/{total} · {title}</span>
          <LevelDots current={idx} total={total} />
        </div>
        <TaskCard step={idx + 1} total={total}>{prompt}</TaskCard>
      </div>

      <Scene grade={grade} className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
        {children}
        {!wide && nudgeView}
      </Scene>

      <aside className="flex flex-col gap-3 lg:col-start-2 lg:row-start-2">
        {wide && nudgeView}
        {panel}
        {done ? (
          <div className="rounded-2xl bg-ok-soft p-4 ring-1 ring-green-200 animate-fade-up">
            {doneBox}
            <BigButton onClick={onNext} className="mt-3 w-full">
              {nextLabel ?? (last ? 'Bitir' : 'Sonraki görev')}
              <ArrowRight size={20} />
            </BigButton>
          </div>
        ) : (
          (onHint || onReset) && (
            <div className="flex gap-2">
              {onHint && (
                <button type="button" onClick={onHint} className="btn-ghost min-h-14 flex-1">
                  <Lightbulb size={18} className="text-amber-500" />
                  {hintLabel}
                </button>
              )}
              {onReset && (
                <button type="button" onClick={onReset} className="btn-ghost min-h-14 px-4" aria-label="Görevi baştan başlat">
                  <RotateCcw size={18} />
                  Baştan
                </button>
              )}
            </div>
          )
        )}
        {footer}
      </aside>
    </div>
  )
}

/** Büyük sayı tuş takımı. `big`: 1–3. sınıf (≥ 56 px) */
export function NumPad({
  value,
  onChange,
  onSubmit,
  maxLen = 4,
  big,
  decimal,
  negative,
  submitLabel = 'Tamam',
  disabled,
  dark,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  maxLen?: number
  big?: boolean
  decimal?: boolean
  negative?: boolean
  submitLabel?: string
  disabled?: boolean
  dark?: boolean
}) {
  const h = big ? 'min-h-14 text-2xl' : 'min-h-12 text-xl'
  const key = `${h} rounded-2xl font-black transition active:scale-95 disabled:opacity-40 ${dark ? 'bg-slate-700 text-white ring-1 ring-slate-500' : 'bg-white text-ink ring-1 ring-line shadow-[0_3px_0_var(--color-line)]'}`
  const press = (d: string) => {
    if (disabled) return
    if (d === ',' && (value.includes(',') || !decimal)) return
    if (value.replace(/[−,]/g, '').length >= maxLen && d !== ',') return
    onChange(value === '0' && d !== ',' ? d : value + d)
  }
  const extra = negative ? '−' : decimal ? ',' : null
  return (
    <div className="grid grid-cols-4 gap-2" aria-label="Sayı tuşları">
      {['7', '8', '9'].map((d) => <button key={d} type="button" className={key} onClick={() => press(d)} disabled={disabled}>{d}</button>)}
      <button type="button" className={`${key} grid place-items-center`} onClick={() => onChange(value.slice(0, -1))} disabled={disabled || !value} aria-label="Sil"><Delete size={big ? 26 : 22} /></button>
      {['4', '5', '6'].map((d) => <button key={d} type="button" className={key} onClick={() => press(d)} disabled={disabled}>{d}</button>)}
      <button type="button" className={`${h} row-span-2 rounded-2xl bg-brand px-1 text-base font-black text-white shadow-[0_4px_0_var(--color-brand-dark)] transition active:translate-y-[2px] disabled:opacity-40`} onClick={onSubmit} disabled={disabled || !value || value === '−'}>{submitLabel}</button>
      {['1', '2', '3'].map((d) => <button key={d} type="button" className={key} onClick={() => press(d)} disabled={disabled}>{d}</button>)}
      {extra ? (
        <>
          <button type="button" className={key} onClick={() => (extra === '−' ? onChange(value.startsWith('−') ? value.slice(1) : '−' + value) : press(','))} disabled={disabled}>{extra}</button>
          <button type="button" className={`${key} col-span-2`} onClick={() => press('0')} disabled={disabled}>0</button>
        </>
      ) : (
        <button type="button" className={`${key} col-span-3`} onClick={() => press('0')} disabled={disabled}>0</button>
      )}
    </div>
  )
}

/** "1.234" / "−3,5" → sayı */
export const parseNum = (s: string) => Number(s.replace(/\./g, '').replace(',', '.').replace('−', '-'))

/**
 * @use-gesture tabanlı sürükle-bırak. 6 px’ten az hareket → onTap; fazlası → onDrop(item, x, y).
 * Sürüklenen öğenin hayaleti parmağı izler. Kullanım: `<button {...bind(item)} data-handle style={{touchAction:'none'}}>`
 */
export function useTileDrag<T>(opts: { onDrop: (item: T, x: number, y: number) => void; onTap?: (item: T) => void; ghost: (item: T) => ReactNode }) {
  const [drag, setDrag] = useState<{ item: T; x: number; y: number } | null>(null)
  const ref = useRef(opts)
  ref.current = opts
  const bind = useDrag(
    ({ args: [item], xy: [x, y], last, tap, movement: [mx, my], event }) => {
      event?.preventDefault?.()
      if (tap) {
        setDrag(null)
        ref.current.onTap?.(item as T)
        return
      }
      if (last) {
        setDrag(null)
        if (Math.hypot(mx, my) > 6) ref.current.onDrop(item as T, x, y)
        return
      }
      if (Math.hypot(mx, my) > 6) setDrag({ item: item as T, x, y })
    },
    { filterTaps: true, threshold: 0, eventOptions: { passive: false } },
  )
  const ghost = drag
    ? createPortal(
        <div style={{ position: 'fixed', left: drag.x, top: drag.y, transform: 'translate(-50%, -60%) scale(1.12)', pointerEvents: 'none', zIndex: 70, filter: 'drop-shadow(0 8px 10px rgb(0 0 0 / .25))' }}>{opts.ghost(drag.item)}</div>,
        document.body,
      )
    : null
  return { bind, dragging: drag?.item ?? null, ghost }
}

/** Noktayı (pad payıyla) içeren ilk bölgenin anahtarı */
export function hitZone<K>(zones: Map<K, Element | null>, x: number, y: number, pad = 16): K | null {
  for (const [k, el] of zones) {
    if (!el) continue
    const r = el.getBoundingClientRect()
    if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) return k
  }
  return null
}

/** Başarı kutusu içeriği: başlık + not */
export function DoneNote({ title, note, children }: { title: string; note?: ReactNode; children?: ReactNode }) {
  return (
    <>
      <p className="text-lg font-black text-green-900">🎉 {title}</p>
      {note && <div className="mt-1 font-bold text-green-900">{note}</div>}
      {children}
    </>
  )
}
