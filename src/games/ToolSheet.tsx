import { Suspense, lazy, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { ManipulativeConfig, ManipulativeTool } from '../data/types'

const Inner = lazy(() => import('./ToolSheetInner'))

/**
 * Alttan açılan manipülatif paneli: "Modelle dene" düğmesiyle açılır.
 * Akıllı geri bildirimde öğrenciye somut modeli göstermek için kullanılır.
 */
export function ToolSheet({ tool, config, title, onClose }: { tool: ManipulativeTool; config?: ManipulativeConfig; title?: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', h)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-[2px] sm:items-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={title ?? 'Model'}>
      <div className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-paper p-4 shadow-2xl animate-fade-up sm:rounded-3xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-lg font-black">{title ?? 'Modelle dene'}</p>
          <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-xl bg-white ring-1 ring-line" aria-label="Kapat"><X size={20} /></button>
        </div>
        <Suspense fallback={<div className="grid h-40 place-items-center"><span className="size-9 animate-spin rounded-full border-4 border-line border-t-brand" /></div>}>
          <Inner tool={tool} config={config} />
        </Suspense>
      </div>
    </div>,
    document.body,
  )
}
