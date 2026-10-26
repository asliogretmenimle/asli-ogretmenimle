import { useEffect, useMemo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Check, Lightbulb, RotateCcw, X } from 'lucide-react'
import type { Activity, GeneratorSpec } from '../data/types'
import { runGenerator } from '../lib/generators'

export interface EngineProps<A extends Activity> {
  activity: A
  onProgress: (done: number, total: number) => void
  onFinish: (correct: number, total: number) => void
}

/** Statik veriyi ya da üreteç çıktısını bir kez hesaplar */
export function useItems<T>(staticItems: T[] | undefined, gen: GeneratorSpec | undefined, defaultCount = 8): T[] {
  return useMemo(() => {
    if (gen) return runGenerator(gen.id, gen.params, gen.count ?? defaultCount) as T[]
    return staticItems ?? []
  }, [])
}

export type Status = 'idle' | 'correct' | 'wrong' | 'revealed'

/** Alt kısımdaki kontrol / geri bildirim çubuğu */
export function CheckBar({
  status,
  canCheck,
  onCheck,
  onNext,
  onRetry,
  hint,
  showHint,
  onHint,
  correctText = 'Harika!',
  wrongText = 'Tekrar dene!',
  revealedText = 'Doğru cevap gösterildi',
  checkLabel = 'Kontrol Et',
  nextLabel = 'Devam',
  onSkip,
}: {
  status: Status
  canCheck: boolean
  onCheck?: () => void
  onNext: () => void
  onRetry?: () => void
  hint?: string
  showHint?: boolean
  onHint?: () => void
  correctText?: string
  wrongText?: string
  revealedText?: string
  checkLabel?: string
  nextLabel?: string
  /** Verilirse yanlış cevaptan sonra "Geç" düğmesi görünür */
  onSkip?: () => void
}) {
  // Enter ile ilerleme
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat) return
      if (status === 'correct' || status === 'revealed') onNext()
      else if (status === 'wrong' && onRetry) onRetry()
      else if (status === 'idle' && canCheck && onCheck) onCheck()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [status, canCheck, onCheck, onNext, onRetry])

  const tone =
    status === 'correct' ? 'bg-ok-soft text-ok border-green-200' : status === 'wrong' ? 'bg-bad-soft text-bad border-rose-200' : status === 'revealed' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white/95 border-line backdrop-blur'

  return (
    <>
    <div className="h-32" aria-hidden />
    {createPortal(
    <div className={`fixed inset-x-0 bottom-0 z-20 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(31_35_64/0.06)] transition-colors ${tone}`} aria-live="polite">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 font-extrabold">
          {status === 'correct' && (<><span className="grid size-9 shrink-0 place-items-center rounded-full bg-ok text-white animate-pop"><Check size={20} strokeWidth={3} /></span><span className="text-lg">{correctText}</span></>)}
          {status === 'wrong' && (<><span className="grid size-9 shrink-0 place-items-center rounded-full bg-bad text-white animate-pop"><X size={20} strokeWidth={3} /></span><span className="text-lg">{wrongText}</span></>)}
          {status === 'revealed' && <span className="text-base">{revealedText}</span>}
          {status === 'idle' && hint && onHint && (
            showHint ? (
              <span className="flex items-start gap-2 text-sm font-bold text-amber-700"><Lightbulb size={18} className="mt-0.5 shrink-0" />{hint}</span>
            ) : (
              <button type="button" onClick={onHint} className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-sm font-bold text-amber-600 hover:bg-amber-50"><Lightbulb size={18} />İpucu</button>
            )
          )}
        </div>
        {status === 'idle' && onCheck && (
          <button type="button" className="btn-primary min-w-36" disabled={!canCheck} onClick={onCheck}>{checkLabel}</button>
        )}
        {status === 'wrong' && onSkip && (
          <button type="button" className="btn min-h-12 px-3 text-sm text-rose-700 hover:bg-white/60" onClick={onSkip}>Geç</button>
        )}
        {status === 'wrong' && onRetry && (
          <button type="button" className="btn-primary min-w-36 bg-bad shadow-[0_4px_0_#9f1239]" onClick={onRetry}><RotateCcw size={18} />Tekrar</button>
        )}
        {(status === 'correct' || status === 'revealed') && (
          <button type="button" className="btn-primary min-w-36 animate-pop" onClick={onNext} autoFocus>{nextLabel}<ArrowRight size={20} /></button>
        )}
      </div>
    </div>,
    document.body,
    )}
    </>
  )
}

export function Prompt({ children }: { children: ReactNode }) {
  return <div className="mb-4 text-center text-xl font-extrabold leading-snug text-ink sm:text-2xl">{children}</div>
}
