import { useCallback, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useDrag } from '@use-gesture/react'
import { ArrowLeftRight } from 'lucide-react'
import { MathText } from '../../components/MathText'
import type { Zone } from './model'

/**
 * Sürükle-bırak altyapısı: kartlar teraziye (sol kefe, iki kefe, sağ kefe) bırakılır.
 * Dokun-dokun alternatifi: karta dokun (seçilir), sonra bölgeye dokun.
 */

export function useDnd() {
  const refs = useRef<Partial<Record<Zone, HTMLDivElement | null>>>({})
  const [drag, setDrag] = useState<{ label: string; x: number; y: number; color: string } | null>(null)
  const [over, setOver] = useState<Zone | null>(null)
  const hit = useCallback((x: number, y: number): Zone | null => {
    for (const z of ['L', 'both', 'R'] as Zone[]) {
      const el = refs.current[z]
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return z
    }
    return null
  }, [])
  return { refs, drag, setDrag, over, setOver, hit }
}
export type Dnd = ReturnType<typeof useDnd>

export function DragCard({ label, selected, onTap, onDrop, dnd, dark, color = '#7c3aed', disabled, big }: { label: string; selected?: boolean; onTap: () => void; onDrop: (z: Zone) => void; dnd: Dnd; dark?: boolean; color?: string; disabled?: boolean; big?: boolean }) {
  const bind = useDrag(
    ({ tap, last, xy: [x, y], event }) => {
      if (disabled) return
      event?.preventDefault?.()
      if (tap) {
        onTap()
        return
      }
      if (last) {
        const z = dnd.hit(x, y)
        dnd.setDrag(null)
        dnd.setOver(null)
        if (z) onDrop(z)
        return
      }
      dnd.setDrag({ label, x, y, color })
      dnd.setOver(dnd.hit(x, y))
    },
    { filterTaps: true },
  )
  const dragging = dnd.drag?.label === label
  return (
    <button
      type="button"
      {...bind()}
      onClick={(e) => e.detail === 0 && !disabled && onTap()}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`${label} kartı`}
      className={`${big ? 'min-h-14 min-w-16 text-2xl' : 'min-h-12 min-w-14 text-xl'} cursor-grab rounded-2xl px-3 font-black tabular-nums transition select-none active:cursor-grabbing disabled:opacity-40 ${dragging ? 'opacity-40' : ''} ${selected ? '-translate-y-1' : ''}`}
      style={{
        touchAction: 'none',
        background: selected ? color : dark ? '#1e293b' : '#fff',
        color: selected ? '#fff' : dark ? '#f1f5f9' : '#1f2340',
        boxShadow: selected ? `0 4px 0 ${color}aa, 0 0 0 3px ${color}55` : dark ? `inset 0 0 0 2px ${color}88, 0 3px 0 #0f172a` : `inset 0 0 0 2px ${color}55, 0 3px 0 #e2e3ee`,
      }}
    >
      <MathText text={label} />
    </button>
  )
}

/** Sürüklenen kartın gölgesi (portal: transform’lu atalardan etkilenmez) */
export function DragGhost({ dnd }: { dnd: Dnd }) {
  if (!dnd.drag) return null
  return createPortal(
    <div className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-[70%] rounded-2xl px-4 py-2 text-2xl font-black text-white shadow-2xl" style={{ left: dnd.drag.x, top: dnd.drag.y, background: dnd.drag.color }}>
      <MathText text={dnd.drag.label} />
    </div>,
    document.body,
  )
}

const ZLABEL: Record<Zone, string> = { L: 'Sol kefe', both: 'İki kefe', R: 'Sağ kefe' }

/** Terazinin üstüne bırakma bölgeleri */
export function DropStage({ children, dnd, zones, armed, onZone, dark }: { children: ReactNode; dnd: Dnd; zones: Zone[]; armed: boolean; onZone: (z: Zone) => void; dark?: boolean }) {
  const on = armed || !!dnd.drag
  return (
    <div className="relative select-none" style={{ touchAction: 'none' }}>
      {children}
      <div className="absolute inset-0 grid grid-cols-[2fr_1.25fr_2fr] gap-1">
        {(['L', 'both', 'R'] as Zone[]).map((z) => {
          if (!zones.includes(z)) return <div key={z} />
          const over = dnd.over === z
          return (
            <div
              key={z}
              ref={(el) => {
                dnd.refs.current[z] = el
              }}
              role="button"
              tabIndex={on ? 0 : -1}
              aria-label={`${ZLABEL[z]} bölgesi`}
              onClick={() => on && onZone(z)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && on && onZone(z)}
              className={`relative rounded-2xl transition ${on ? 'cursor-pointer' : ''}`}
              style={{
                background: over ? (dark ? 'rgba(167,139,250,.22)' : 'rgba(124,58,237,.12)') : on ? (dark ? 'rgba(167,139,250,.07)' : 'rgba(124,58,237,.04)') : 'transparent',
                outline: on ? `2px dashed ${over ? '#a78bfa' : dark ? '#64748b' : '#c4b5fd'}` : 'none',
                outlineOffset: -2,
              }}
            >
              <span className={`absolute bottom-1 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black whitespace-nowrap uppercase transition sm:text-xs ${on ? 'bg-violet-600 text-white shadow' : dark ? 'bg-slate-700/80 text-slate-300' : 'bg-white/80 text-ink-soft ring-1 ring-line'}`}>
                {z === 'both' && <ArrowLeftRight size={13} />}
                {ZLABEL[z]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Büyük denklem satırı: sol ilişki sağ */
export function EqLine({ left, rel, right, broken, dark, small }: { left: string; rel: string; right: string; broken?: boolean; dark?: boolean; small?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-3 rounded-2xl px-4 py-2 font-black tabular-nums ${small ? 'text-xl' : 'text-2xl sm:text-3xl'} ${dark ? 'bg-slate-900/70 text-white ring-1 ring-slate-600' : 'bg-white/95 text-ink ring-1 ring-line'}`} aria-live="polite">
      <MathText text={left} />
      <span className={`grid min-w-10 place-items-center rounded-xl px-1 ${broken ? 'bg-rose-500 text-white animate-pop' : dark ? 'text-violet-300' : 'text-violet-700'}`}>{rel}</span>
      <MathText text={right} />
    </div>
  )
}
