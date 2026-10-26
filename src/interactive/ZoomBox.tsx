import { useRef, useState, type ReactNode } from 'react'
import { useGesture } from '@use-gesture/react'
import { Maximize2, Minus, Plus } from 'lucide-react'
import { clamp } from './axis'

/**
 * Herhangi bir içeriği (resim, SVG, oyun sahnesi) iki parmakla yakınlaştırılabilir/kaydırılabilir yapar.
 *  - Pinch: yakınlaştır (1×–maxScale), yakınlaşmışken tek parmakla boş alanda kaydır.
 *  - Çift dokunuş: 2× ↔ 1×.
 *  - `data-handle` taşıyan öğeler (sürüklenebilir parçalar) kaydırmayı tetiklemez.
 * Not: Yakınlaştırma görsel bir büyütmedir; matematiksel eksenler için <Plane> kullanın.
 */
export function ZoomBox({ children, maxScale = 4, className = '', controls = true, minHeight }: { children: ReactNode; maxScale?: number; className?: string; controls?: boolean; minHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [t, setT] = useState({ s: 1, x: 0, y: 0 })
  const base = useRef(1)

  const clampPos = (s: number, x: number, y: number) => {
    const el = ref.current
    if (!el) return { s, x, y }
    const w = el.clientWidth, h = el.clientHeight
    const mx = (w * (s - 1)) / 2, my = (h * (s - 1)) / 2
    return { s, x: clamp(x, -mx, mx), y: clamp(y, -my, my) }
  }

  useGesture(
    {
      onPinch: ({ offset: [s], first, origin: [ox, oy], memo, event }) => {
        event?.preventDefault?.()
        if (first && (event?.target as Element | null)?.closest?.('[data-handle]')) return 'skip'
        if (memo === 'skip') return memo
        if (first) {
          const r = ref.current!.getBoundingClientRect()
          memo = { s0: t.s, x0: t.x, y0: t.y, cx: ox - r.left - r.width / 2, cy: oy - r.top - r.height / 2, p0: s }
        }
        const ns = clamp((memo.s0 * s) / memo.p0, 1, maxScale)
        const k = ns / memo.s0
        setT(clampPos(ns, memo.cx - (memo.cx - memo.x0) * k, memo.cy - (memo.cy - memo.y0) * k))
        return memo
      },
      onDrag: ({ delta: [dx, dy], pinching, first, event, memo }) => {
        if (first && (event.target as Element).closest('[data-handle], button, input, [role="button"]')) return 'skip'
        if (memo === 'skip' || pinching || t.s <= 1.01) return memo
        setT((c) => clampPos(c.s, c.x + dx, c.y + dy))
        return memo
      },
      onDoubleClick: ({ event }) => {
        if ((event.target as Element).closest('[data-handle], button')) return
        setT((c) => (c.s > 1.2 ? { s: 1, x: 0, y: 0 } : { s: 2, x: 0, y: 0 }))
      },
    },
    { target: ref, eventOptions: { passive: false }, pinch: { scaleBounds: { min: 0.2, max: 10 }, from: () => [base.current, 0] } },
  )

  const zoom = (f: number) => setT((c) => clampPos(clamp(c.s * f, 1, maxScale), c.x * f, c.y * f))

  return (
    <div className={`relative ${className}`}>
      <div ref={ref} className="relative overflow-hidden rounded-2xl" style={{ touchAction: 'none', minHeight }}>
        <div style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})`, transformOrigin: 'center center', transition: 'transform 60ms linear' }}>{children}</div>
      </div>
      {controls && (
        <div className="absolute right-2 bottom-2 z-10 flex gap-1 opacity-80 hover:opacity-100">
          <button type="button" onClick={() => zoom(1.4)} className="grid size-9 place-items-center rounded-xl bg-white/90 shadow ring-1 ring-line active:scale-95" aria-label="Yakınlaştır"><Plus size={17} /></button>
          {t.s > 1.01 && (
            <>
              <button type="button" onClick={() => zoom(1 / 1.4)} className="grid size-9 place-items-center rounded-xl bg-white/90 shadow ring-1 ring-line active:scale-95" aria-label="Uzaklaştır"><Minus size={17} /></button>
              <button type="button" onClick={() => setT({ s: 1, x: 0, y: 0 })} className="grid size-9 place-items-center rounded-xl bg-white/90 shadow ring-1 ring-line active:scale-95" aria-label="Sığdır"><Maximize2 size={15} /></button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
