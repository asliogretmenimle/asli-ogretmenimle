import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Hafif sürükle-bırak: işaretçi olaylarıyla (dokunma, fare, kalem) çalışır.
 *  - Kaynak öğe sürüklenince parmağı izleyen bir “hayalet” görünür.
 *  - Bırakıldığı yerdeki en yakın `[data-drop]` öğesinin değeri onDrop’a iletilir.
 *  - 8 px’ten az hareket bir dokunuş sayılır → onTap (her sürüklemenin dokun alternatifi).
 * `data-handle` taşır: ZoomBox/Plane kaydırmayı tetiklemez.
 */
export function DragSource({ children, ghost, onTap, onDrop, label, className = '', style, disabled, value }: {
  children: ReactNode
  ghost?: ReactNode
  onTap?: () => void
  onDrop?: (zone: string) => void
  label: string
  className?: string
  style?: CSSProperties
  disabled?: boolean
  /** test/otomasyon için değer (data-v) */
  value?: number
}) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [over, setOver] = useState<string | null>(null)

  const zoneAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null
    return el?.closest<HTMLElement>('[data-drop]')?.dataset.drop ?? null
  }

  return (
    <>
      <button
        type="button"
        data-handle
        data-v={value}
        aria-label={label}
        disabled={disabled}
        className={className}
        style={{ touchAction: 'none', ...style }}
        onPointerDown={(e) => {
          if (disabled) return
          start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          const s = start.current
          if (!s || s.id !== e.pointerId) return
          if (!pos && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 8) return
          setPos({ x: e.clientX, y: e.clientY })
          const z = zoneAt(e.clientX, e.clientY)
          if (z !== over) setOver(z)
          document.querySelectorAll('[data-drop]').forEach((el) => el.toggleAttribute('data-over', (el as HTMLElement).dataset.drop === z))
        }}
        onPointerUp={(e) => {
          const s = start.current
          start.current = null
          document.querySelectorAll('[data-over]').forEach((el) => el.removeAttribute('data-over'))
          if (!s) return
          if (!pos) {
            onTap?.()
          } else {
            const z = zoneAt(e.clientX, e.clientY)
            if (z) onDrop?.(z)
          }
          setPos(null)
          setOver(null)
        }}
        onPointerCancel={() => {
          start.current = null
          setPos(null)
          setOver(null)
          document.querySelectorAll('[data-over]').forEach((el) => el.removeAttribute('data-over'))
        }}
        onClick={(e) => {
          // klavye (Enter/Boşluk) ile etkinleştirme
          if (e.detail === 0) onTap?.()
        }}
      >
        {children}
      </button>
      {pos &&
        createPortal(
          <div className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-1/2 scale-110 drop-shadow-xl" style={{ left: pos.x, top: pos.y }} aria-hidden>
            {ghost ?? children}
          </div>,
          document.body,
        )}
    </>
  )
}
