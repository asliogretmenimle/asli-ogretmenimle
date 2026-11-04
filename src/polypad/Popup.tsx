import { useEffect, useRef, type ReactNode } from 'react'

/** Düğmeye bağlı açılır pencere; dışarı dokununca ya da Esc ile kapanır */
export function Popup({ open, onClose, children, className = '', label, place = 'top' }: { open: boolean; onClose: () => void; children: ReactNode; className?: string; label: string; place?: 'top' | 'bottom' | 'left' }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => {
      const el = ref.current
      if (!el) return
      // Açan düğmeye basmak da kapatsın (düğme kendi onClick'iyle yeniden açmasın diye sarmalayıcıya bakılır)
      if (!el.parentElement?.contains(e.target as Node)) onClose()
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('pointerdown', down, true)
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('pointerdown', down, true)
      window.removeEventListener('keydown', key)
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div ref={ref} className={`pp-popup pp-popup-${place} ${className}`} role="dialog" aria-label={label}>
      {children}
    </div>
  )
}
