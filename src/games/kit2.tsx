import { useCallback, useRef, useState, type ReactNode } from 'react'
import { Blocks, Check, Lightbulb, Sparkles, X } from 'lucide-react'
import type { Grade, ManipulativeConfig, ManipulativeTool } from '../data/types'
import { MathText } from '../components/MathText'
import { useTracker } from '../lib/trackerContext'
import { sfx } from '../lib/feedback'
import { ToolSheet } from './ToolSheet'

/**
 * Yeni nesil oyun kiti (Van de Walle):
 *  - Yaşa uygun tema (useAge, Scene)
 *  - Akıllı geri bildirim (Nudge): soru sorar, gerekirse manipülatif açar
 *  - Strateji yakalama (StrategyPicker) ve farklı çözüm sayacı (useSolutions) → öğretmen raporu
 */

export type AgeTier = 'mini' | 'kesif' | 'atolye'

export function useAge(grade: Grade) {
  const tier: AgeTier = grade <= 3 ? 'mini' : grade <= 6 ? 'kesif' : 'atolye'
  return {
    tier,
    /** Dokunma hedefi ve yazı ölçeği */
    big: tier === 'mini',
    /** Sahne arka planı */
    sceneClass:
      tier === 'mini'
        ? 'bg-[radial-gradient(circle_at_20%_10%,#fff7d6_0,transparent_40%),radial-gradient(circle_at_90%_80%,#e0f2fe_0,transparent_45%),linear-gradient(180deg,#fffdf6,#f2fbff)]'
        : tier === 'kesif'
          ? 'bg-[linear-gradient(180deg,#f7fbff,#eef6f1)] [background-image:radial-gradient(#dbe7f3_1px,transparent_1px)] [background-size:22px_22px]'
          : 'bg-[linear-gradient(180deg,#0f172a,#1e293b)] text-slate-100',
    panelClass: tier === 'atolye' ? 'bg-slate-800/80 ring-1 ring-slate-600 text-slate-100' : 'bg-white/90 ring-1 ring-line',
  }
}

/** Oyun sahnesi: yaşa uygun arka planlı, tablet için geniş alan */
export function Scene({ grade, children, className = '' }: { grade: Grade; children: ReactNode; className?: string }) {
  const a = useAge(grade)
  return <div className={`relative overflow-hidden rounded-3xl p-3 shadow-[var(--shadow-card)] ring-1 ring-line sm:p-5 ${a.sceneClass} ${className}`}>{children}</div>
}

/** Görev / problem kartı */
export function TaskCard({ children, step, total, tone = 'brand' }: { children: ReactNode; step?: number; total?: number; tone?: 'brand' | 'dark' }) {
  return (
    <div className={`mb-4 flex items-start gap-3 rounded-2xl px-4 py-3 ${tone === 'dark' ? 'bg-slate-800 text-white ring-1 ring-slate-600' : 'bg-white/95 text-ink ring-1 ring-line'}`}>
      {step !== undefined && (
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-sm font-black text-white">{step}{total ? <span className="text-[10px] opacity-80">/{total}</span> : null}</span>
      )}
      <div className="min-w-0 flex-1 text-base leading-snug font-extrabold sm:text-lg">{typeof children === 'string' ? <MathText text={children} /> : children}</div>
    </div>
  )
}

/** Seviye ilerlemesi */
export function LevelDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Seviye ${current + 1}/${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-2.5 rounded-full transition-all ${i < current ? 'w-2.5 bg-ok' : i === current ? 'w-7 bg-brand' : 'w-2.5 bg-line'}`} />
      ))}
    </div>
  )
}

/**
 * Akıllı geri bildirim: kırmızı "yanlış" yerine düşündüren bir soru ve isteğe bağlı model.
 * misconception verilirse öğretmen raporuna yazılır.
 */
export function Nudge({ question, tool, toolConfig, toolTitle, misconception, onClose, tone = 'think' }: { question: string; tool?: ManipulativeTool; toolConfig?: ManipulativeConfig; toolTitle?: string; misconception?: string; onClose?: () => void; tone?: 'think' | 'ok' }) {
  const [open, setOpen] = useState(false)
  const track = useTracker()
  const logged = useRef(false)
  if (misconception && !logged.current) {
    logged.current = true
    track.misconception(misconception)
  }
  return (
    <div className={`mt-3 flex flex-wrap items-start gap-3 rounded-2xl p-3 text-left animate-fade-up ${tone === 'ok' ? 'bg-ok-soft text-green-900' : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'}`} role="status" aria-live="polite">
      <span className={`grid size-9 shrink-0 place-items-center rounded-full ${tone === 'ok' ? 'bg-ok text-white' : 'bg-amber-400 text-white'}`}>{tone === 'ok' ? <Check size={18} strokeWidth={3} /> : <Lightbulb size={18} />}</span>
      <p className="min-w-[12rem] flex-1 basis-56 self-center text-[15px] font-bold sm:text-base"><MathText text={question} /></p>
      <div className="ml-auto flex shrink-0 gap-2">
        {tool && (
          <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-extrabold text-ink ring-1 ring-line hover:bg-paper">
            <Blocks size={17} />Modelle dene
          </button>
        )}
        {onClose && (
          <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-xl bg-white/70 ring-1 ring-line" aria-label="Kapat"><X size={17} /></button>
        )}
      </div>
      {open && tool && <ToolSheet tool={tool} config={toolConfig} title={toolTitle} onClose={() => setOpen(false)} />}
    </div>
  )
}

/** "Nasıl buldun?" — strateji seçimi öğretmen raporuna yazılır */
export function StrategyPicker({ options, onPick, question = 'Nasıl düşündün?' }: { options: string[]; onPick: (s: string) => void; question?: string }) {
  const track = useTracker()
  const [picked, setPicked] = useState<string | null>(null)
  return (
    <div className="mt-3 rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-200 animate-fade-up">
      <p className="mb-2 text-sm font-black text-sky-900">{question}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            disabled={!!picked}
            onClick={() => {
              setPicked(o)
              track.strategy(o)
              onPick(o)
            }}
            className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ring-1 transition ${picked === o ? 'bg-sky-600 text-white ring-sky-600' : 'bg-white text-sky-900 ring-sky-200 hover:bg-sky-100'} disabled:cursor-default`}
          >
            <MathText text={o} />
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Birden çok çözüm üretilen görevler için: her yeni çözüm bir anahtarla kaydedilir.
 * add() yeni çözümse true döner ve rapora yazılır.
 */
export function useSolutions() {
  const [list, setList] = useState<{ key: string; label: string }[]>([])
  const ref = useRef<{ key: string; label: string }[]>([])
  const track = useTracker()
  const add = useCallback(
    (key: string, label: string) => {
      if (ref.current.some((c) => c.key === key)) return false
      ref.current = [...ref.current, { key, label }]
      setList(ref.current)
      track.solutions(ref.current.length)
      sfx.ok()
      return true
    },
    [track],
  )
  const reset = useCallback(() => {
    ref.current = []
    setList([])
  }, [])
  return { list, add, reset }
}

/** Bulunan farklı çözümlerin rozet listesi */
export function SolutionList({ list, goal }: { list: { key: string; label: string }[]; goal?: number }) {
  if (!list.length) return null
  return (
    <div className="mt-3 rounded-2xl bg-white/90 p-3 text-ink ring-1 ring-line">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-black"><Sparkles size={16} className="text-amber-500" />Bulduğun farklı yollar: {list.length}{goal ? ` / ${goal}` : ''}</p>
      <div className="flex flex-wrap gap-1.5">
        {list.map((s) => <span key={s.key} className="chip bg-emerald-50 px-3 py-1 text-sm text-emerald-800 animate-pop"><MathText text={s.label} /></span>)}
      </div>
    </div>
  )
}

/** Büyük, dokunmaya uygun eylem düğmesi */
export function BigButton({ children, onClick, disabled, variant = 'primary', className = '' }: { children: ReactNode; onClick: () => void; disabled?: boolean; variant?: 'primary' | 'ghost'; className?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${variant === 'primary' ? 'btn-primary' : 'btn-ghost'} min-h-14 px-6 text-lg ${className}`}>
      {children}
    </button>
  )
}
