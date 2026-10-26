import { useEffect, useState, type ReactNode } from 'react'
import { Check, Pin } from 'lucide-react'
import type { Grade } from '../../data/types'
import { MathText } from '../../components/MathText'

/**
 * Muhakeme etkinlikleri (73–77) için ortak küçük parçalar:
 *  - ChipSentence: boşluklu cümle kurucu (dokun → seçenek çipleri → boşluk dolar)
 *  - Steps: döngü/aşama göstergesi (Tahmin → Test → Karşılaştır → Açıkla …)
 *  - PinNote: “kilitlenmiş” tahmin / iddia notu (görünür taahhüt)
 *  - Speaker: konuşan karakter + konuşma balonu
 *  - Opt: büyük seçenek düğmesi (durumlu)
 * Yerleşim, oturum ve ipucu için `../hizli-noktalar/kit` (ActivityLayout, useSession, useNudge) kullanılır.
 */

export const isDark = (g: Grade) => g >= 7
export const tapH = (g: Grade) => (g <= 3 ? 'min-h-14' : 'min-h-12')

// ───────────────────────── Cümle kurucu ─────────────────────────

export interface Slot {
  id: string
  options: string[]
  /** Boşken görünen yazı */
  placeholder?: string
}
export type SentencePart = string | Slot

/**
 * Cümle kurucu. Boşluğa dokun → altında seçenek çipleri açılır → seç; sıradaki boş boşluk açılır.
 * `marks` ile boşluklar yeşil (ok) / sarı (think) işaretlenebilir.
 */
export function ChipSentence({
  parts,
  value,
  onChange,
  grade,
  disabled,
  marks,
  label,
}: {
  parts: SentencePart[]
  value: Record<string, number | undefined>
  onChange: (id: string, index: number) => void
  grade: Grade
  disabled?: boolean
  marks?: Record<string, 'ok' | 'think' | undefined>
  label?: string
}) {
  const slots = parts.filter((p): p is Slot => typeof p !== 'string')
  const firstEmpty = slots.find((s) => value[s.id] === undefined)?.id ?? null
  const [open, setOpen] = useState<string | null>(firstEmpty)
  const big = grade <= 3
  useEffect(() => {
    if (disabled) setOpen(null)
  }, [disabled])
  const active = slots.find((s) => s.id === open)
  return (
    <div className="rounded-2xl bg-white p-3 text-ink ring-1 ring-line">
      {label && <p className="mb-1.5 text-xs font-black tracking-wide text-ink-soft uppercase">{label}</p>}
      <p className={`leading-[2.6] font-extrabold ${big ? 'text-lg' : 'text-base'}`}>
        {parts.map((p, i) => {
          if (typeof p === 'string') return <MathText key={i} text={p} />
          const v = value[p.id]
          const m = marks?.[p.id]
          const isOpen = open === p.id
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => setOpen(isOpen ? null : p.id)}
              aria-expanded={isOpen}
              className={`mx-0.5 inline-flex ${big ? 'min-h-12' : 'min-h-11'} items-center rounded-xl px-3 align-middle leading-tight transition active:scale-95 ${
                v === undefined
                  ? `border-2 border-dashed ${isOpen ? 'border-brand bg-brand-soft text-brand-ink' : 'border-ink-soft/40 bg-paper text-ink-soft'}`
                  : m === 'ok'
                    ? 'bg-emerald-100 text-emerald-900 ring-2 ring-emerald-400'
                    : m === 'think'
                      ? 'bg-amber-50 text-amber-900 ring-2 ring-amber-400'
                      : isOpen
                        ? 'bg-brand text-white ring-2 ring-brand'
                        : 'bg-sky-100 text-sky-900 ring-2 ring-sky-300'
              }`}
            >
              {v === undefined ? (p.placeholder ?? '…') : <MathText text={p.options[v]} />}
            </button>
          )
        })}
      </p>
      {active && !disabled && (
        <div className="mt-2 flex flex-wrap gap-2 rounded-xl bg-paper p-2 animate-fade-up" role="listbox">
          {active.options.map((o, k) => (
            <button
              key={k}
              type="button"
              role="option"
              aria-selected={value[active.id] === k}
              onClick={() => {
                onChange(active.id, k)
                const after = slots.find((s) => s.id !== active.id && value[s.id] === undefined)
                setOpen(after ? after.id : null)
              }}
              className={`${big ? 'min-h-14 text-lg' : 'min-h-12 text-[15px]'} rounded-xl px-3 py-1.5 text-left leading-snug font-extrabold ring-1 transition active:scale-95 ${value[active.id] === k ? 'bg-brand text-white ring-brand' : 'bg-white text-ink ring-line hover:bg-brand-soft'}`}
            >
              <MathText text={o} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Tüm boşluklar dolu mu? */
export const sentenceDone = (parts: SentencePart[], value: Record<string, number | undefined>) =>
  parts.every((p) => typeof p === 'string' || value[p.id] !== undefined)

/** Seçilmiş cümleyi düz metne çevirir (rapor/özet için) */
export const sentenceText = (parts: SentencePart[], value: Record<string, number | undefined>) =>
  parts.map((p) => (typeof p === 'string' ? p : value[p.id] !== undefined ? p.options[value[p.id]!] : '…')).join('')

// ───────────────────────── Aşamalar ─────────────────────────

export function Steps({ steps, current, dark }: { steps: { label: string; emoji?: string }[]; current: number; dark?: boolean }) {
  return (
    <ol className="mb-3 flex flex-wrap items-center gap-1.5" aria-label="Aşamalar">
      {steps.map((s, i) => {
        const st = i < current ? 'done' : i === current ? 'now' : 'next'
        return (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className={`h-0.5 w-3 rounded ${i <= current ? (dark ? 'bg-cyan-400' : 'bg-brand') : dark ? 'bg-slate-600' : 'bg-line'}`} aria-hidden />}
            <span
              aria-current={st === 'now' ? 'step' : undefined}
              className={`inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-xs font-black transition sm:text-sm ${
                st === 'now'
                  ? dark
                    ? 'bg-cyan-400 text-slate-900'
                    : 'bg-brand text-white'
                  : st === 'done'
                    ? dark
                      ? 'bg-slate-700 text-cyan-200'
                      : 'bg-ok-soft text-green-800'
                    : dark
                      ? 'bg-slate-800 text-slate-400 ring-1 ring-slate-600'
                      : 'bg-white/80 text-ink-soft ring-1 ring-line'
              }`}
            >
              {st === 'done' ? <Check size={13} strokeWidth={3} /> : s.emoji ? <span aria-hidden>{s.emoji}</span> : null}
              {s.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

// ───────────────────────── Not, karakter, seçenek ─────────────────────────

/** Kilitlenmiş tahmin notu (görünür taahhüt) */
export function PinNote({ title = 'Tahminim', children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`relative inline-flex max-w-full -rotate-1 flex-col rounded-xl bg-amber-200 px-4 pt-3 pb-2 text-amber-950 shadow-[0_6px_14px_-6px_rgb(120_80_0/.5)] animate-pop ${className}`}>
      <Pin size={18} className="absolute -top-2 left-1/2 -translate-x-1/2 rotate-12 fill-rose-500 text-rose-700" aria-hidden />
      <span className="text-[11px] font-black tracking-wide uppercase opacity-70">{title}</span>
      <span className="text-lg leading-snug font-black">{children}</span>
    </div>
  )
}

export interface Persona {
  name: string
  emoji: string
  color: string
}

/** Konuşan karakter */
export function Speaker({ who, children, side = 'left', dark, className = '' }: { who: Persona; children: ReactNode; side?: 'left' | 'right'; dark?: boolean; className?: string }) {
  return (
    <div className={`flex items-end gap-2 ${side === 'right' ? 'flex-row-reverse' : ''} ${className}`}>
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: `${who.color}22`, boxShadow: `0 0 0 2px ${who.color}88` }} aria-hidden>
        {who.emoji}
      </span>
      <div className={`relative min-w-0 rounded-2xl px-3.5 py-2.5 ${dark ? 'bg-slate-700 text-slate-50 ring-1 ring-slate-500' : 'bg-white text-ink ring-1 ring-line shadow-sm'} ${side === 'right' ? 'rounded-br-md' : 'rounded-bl-md'}`}>
        <p className="text-xs font-black" style={{ color: dark ? undefined : who.color }}>{who.name}</p>
        <div className="text-[15px] leading-snug font-bold sm:text-base">{typeof children === 'string' ? <MathText text={children} /> : children}</div>
      </div>
    </div>
  )
}

/** Büyük seçenek düğmesi */
export function Opt({ children, onClick, state = 'idle', disabled, grade, className = '' }: { children: ReactNode; onClick: () => void; state?: 'idle' | 'on' | 'right' | 'think' | 'dim'; disabled?: boolean; grade: Grade; className?: string }) {
  const cls =
    state === 'on'
      ? 'bg-brand text-white ring-2 ring-brand'
      : state === 'right'
        ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
        : state === 'think'
          ? 'bg-amber-50 text-amber-900 ring-2 ring-amber-300'
          : state === 'dim'
            ? 'bg-paper text-ink-soft/70 ring-1 ring-line'
            : 'bg-white text-ink ring-1 ring-line hover:bg-brand-soft'
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${tapH(grade)} w-full rounded-2xl px-4 py-2 text-left text-[15px] leading-snug font-extrabold transition active:scale-[0.98] sm:text-base ${cls} ${className}`}>
      {typeof children === 'string' ? <MathText text={children} /> : children}
    </button>
  )
}

/** Panelde küçük başlıklı kutu */
export function Box({ title, children, tone = 'plain', className = '' }: { title?: ReactNode; children: ReactNode; tone?: 'plain' | 'sky' | 'amber' | 'ok'; className?: string }) {
  const t = tone === 'sky' ? 'bg-sky-50 ring-sky-200 text-sky-950' : tone === 'amber' ? 'bg-amber-50 ring-amber-200 text-amber-950' : tone === 'ok' ? 'bg-ok-soft ring-green-200 text-green-950' : 'bg-white ring-line text-ink'
  return (
    <div className={`rounded-2xl p-3 ring-1 ${t} ${className}`}>
      {title && <p className="mb-2 text-sm font-black">{title}</p>}
      {children}
    </div>
  )
}

/** Diziyi karıştır (yeni dizi) */
export function shuffled<T>(a: readonly T[]): T[] {
  const r = a.slice()
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}
