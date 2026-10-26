import { useCallback, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/* ───────────── Sürükle-bırak (fare + dokunma, dokun-dokun alternatifli) ───────────── */

/**
 * Basit işaretçi tabanlı sürükle-bırak: 8 px’ten az hareket → onTap, fazlası → onDrop(x, y).
 * Sürüklenen öğenin "hayaleti" parmağı izler. Öğelerde `data-handle` ve `touch-action: none` olmalı.
 */
export function useDragDrop<T>(opts: { onDrop: (item: T, x: number, y: number) => void; onTap?: (item: T) => void; ghost: (item: T) => ReactNode; onMove?: (item: T, x: number, y: number) => void }) {
  const [drag, setDrag] = useState<{ item: T; x: number; y: number } | null>(null)
  const ref = useRef(opts)
  ref.current = opts
  const start = useCallback((e: React.PointerEvent, item: T) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    const sx = e.clientX, sy = e.clientY, id = e.pointerId
    let moved = false
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) moved = true
      if (moved) {
        setDrag({ item, x: ev.clientX, y: ev.clientY })
        ref.current.onMove?.(item, ev.clientX, ev.clientY)
      }
    }
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      setDrag(null)
      if (ev.type === 'pointercancel') return
      if (moved) ref.current.onDrop(item, ev.clientX, ev.clientY)
      else ref.current.onTap?.(item)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }, [])
  const ghost = drag
    ? createPortal(
        <div style={{ position: 'fixed', left: drag.x, top: drag.y, transform: 'translate(-50%, -65%) scale(1.15)', pointerEvents: 'none', zIndex: 70, filter: 'drop-shadow(0 8px 10px rgb(0 0 0 / .25))' }}>{opts.ghost(drag.item)}</div>,
        document.body,
      )
    : null
  return { start, dragging: drag?.item ?? null, ghost }
}

/** Bırakma bölgesi bul: verilen öğelerden noktayı (pad payıyla) içeren ilk anahtar */
export function hitZone<K extends string | number>(zones: Map<K, Element | null>, x: number, y: number, pad = 18): K | null {
  for (const [k, el] of zones) {
    if (!el) continue
    const r = el.getBoundingClientRect()
    if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) return k
  }
  return null
}
