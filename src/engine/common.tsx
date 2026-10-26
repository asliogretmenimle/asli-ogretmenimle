import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Check, Lightbulb, RotateCcw, Sprout } from 'lucide-react'
import { MathText } from '../components/MathText'
import { useTracker } from '../lib/trackerContext'
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
  hints,
  correctText = 'Harika!',
  wrongText = 'Henüz değil! Bir daha düşün.',
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
  /** Kademeli ipuçları: her dokunuşta bir sonraki açılır */
  hints?: string[]
  correctText?: string
  wrongText?: string
  revealedText?: string
  checkLabel?: string
  nextLabel?: string
  /** Verilirse yanlış cevaptan sonra "Geç" düğmesi görünür */
  onSkip?: () => void
}) {
  const [hintLevel, setHintLevel] = useState(0)
  const track = useTracker()
  const hintList = (hints ?? []).filter(Boolean)
  const canHint = (status === 'idle' || status === 'wrong') && hintList.length > 0
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
    status === 'correct' ? 'bg-ok-soft text-ok border-green-200' : status === 'wrong' ? 'bg-orange-50 text-orange-700 border-orange-200' : status === 'revealed' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white/95 border-line backdrop-blur'

  return (
    <>
    <div className={hintLevel > 0 && canHint ? 'h-48' : 'h-32'} aria-hidden />
    {createPortal(
    <div className={`fixed inset-x-0 bottom-0 z-20 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(31_35_64/0.06)] transition-colors ${tone}`} aria-live="polite">
      {canHint && hintLevel > 0 && (
        <div className="mx-auto mb-3 flex max-w-3xl items-start gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800 ring-1 ring-amber-200 animate-fade-up">
          <Lightbulb size={18} className="mt-0.5 shrink-0" />
          <span><MathText text={hintList[Math.min(hintLevel, hintList.length) - 1]} /></span>
        </div>
      )}
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 font-extrabold">
          {status === 'correct' && (<><span className="grid size-9 shrink-0 place-items-center rounded-full bg-ok text-white animate-pop"><Check size={20} strokeWidth={3} /></span><span className="text-lg">{correctText}</span></>)}
          {status === 'wrong' && (<><span className="grid size-9 shrink-0 place-items-center rounded-full bg-orange-500 text-white animate-pop"><Sprout size={20} strokeWidth={2.6} /></span><span className="text-base sm:text-lg">{wrongText}</span></>)}
          {status === 'revealed' && <span className="text-base">{revealedText}</span>}
          {canHint && hintLevel < hintList.length && (
            <button type="button" onClick={() => { track.hint(); setHintLevel((h) => h + 1) }} className="flex shrink-0 items-center gap-1.5 rounded-xl px-2 py-1 text-sm font-bold text-amber-600 hover:bg-amber-100/60">
              <Lightbulb size={18} />{hintLevel === 0 ? 'İpucu' : 'Bir ipucu daha'}{hintList.length > 1 && <span className="text-xs opacity-70">({hintLevel + 1}/{hintList.length})</span>}
            </button>
          )}
        </div>
        {status === 'idle' && onCheck && (
          <button type="button" className="btn-primary min-w-36" disabled={!canCheck} onClick={onCheck}>{checkLabel}</button>
        )}
        {status === 'wrong' && onSkip && (
          <button type="button" className="btn min-h-12 px-3 text-sm text-orange-700 hover:bg-white/60" onClick={onSkip}>Geç</button>
        )}
        {status === 'wrong' && onRetry && (
          <button type="button" className="btn-primary min-w-36 bg-orange-500 shadow-[0_4px_0_#c2410c]" onClick={onRetry}><RotateCcw size={18} />Tekrar dene</button>
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

/** "Neden?" açıklama kutusu */
export function Explain({ children, tone = 'amber' }: { children: ReactNode; tone?: 'amber' | 'green' }) {
  return (
    <div className={`mx-auto mt-4 flex max-w-2xl items-start gap-2 rounded-2xl p-3 text-left text-[15px] font-bold animate-fade-up ${tone === 'green' ? 'bg-ok-soft text-green-900' : 'bg-amber-50 text-amber-900'}`}>
      <Lightbulb size={18} className="mt-0.5 shrink-0" />
      <div>{typeof children === 'string' ? <MathText text={children} /> : children}</div>
    </div>
  )
}

/** Hızlı bakış: içeriği ms kadar gösterip gizler, "Tekrar bak" ile en fazla 2 kez yeniden gösterir */
export function useFlash(ms: number | undefined, resetKey: unknown) {
  const [visible, setVisible] = useState(true)
  const [peeks, setPeeks] = useState(0)
  useEffect(() => {
    setVisible(true)
    setPeeks(0)
  }, [resetKey])
  useEffect(() => {
    if (!ms || !visible) return
    const t = setTimeout(() => setVisible(false), ms)
    return () => clearTimeout(t)
  }, [ms, visible, resetKey])
  return {
    active: !!ms,
    visible: !ms || visible,
    canPeek: !!ms && !visible && peeks < 2,
    peek: () => {
      setPeeks((p) => p + 1)
      setVisible(true)
    },
    reveal: () => setVisible(true),
  }
}

/** Gizlenen görselin yerine geçen kutu */
export function FlashCover({ canPeek, onPeek }: { canPeek: boolean; onPeek: () => void }) {
  return (
    <div className="mx-auto flex h-40 w-full max-w-xs flex-col items-center justify-center gap-2 rounded-3xl border-[3px] border-dashed border-brand/40 bg-brand-soft text-brand-ink">
      <span className="text-3xl" aria-hidden>👀</span>
      <span className="text-sm font-extrabold">Ne gördün? Aklında canlandır.</span>
      {canPeek && (
        <button type="button" onClick={onPeek} className="rounded-xl bg-white px-3 py-1.5 text-sm font-extrabold ring-1 ring-line hover:bg-paper">Bir kez daha bak</button>
      )}
    </div>
  )
}
