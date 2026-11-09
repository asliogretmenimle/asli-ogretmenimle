import { useRef, useState, type ReactNode } from 'react'
import { RotateCw } from 'lucide-react'
import { Drag, Drop, type Dnd, type ToolInfo } from '../sayilari-karsilastir/parts'

/* ───────────── dizi (satır ve sütunlar) ───────────── */

/** Hücre boyu: sütun sayısı arttıkça küçülür, telefonda da taşmasın */
export const cellOf = (n: number) => (n <= 6 ? 44 : n <= 8 ? 36 : 28)

function Cells({ n, emoji, size, empty }: { n: number; emoji?: string; size: number; empty?: boolean }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className={`grid shrink-0 place-items-center rounded-lg leading-none ${empty ? 'border-2 border-dashed border-sky-300 bg-white/70' : 'bg-white shadow-sm ring-1 ring-rose-100'}`}
          style={{ width: size, height: size, fontSize: size * 0.62 }}
        >
          {empty ? '' : emoji}
        </span>
      ))}
    </>
  )
}

/** Bir sıranın tutulduğunda parmağı izleyen kopyası */
export function RowGhost({ n, emoji, size }: { n: number; emoji: string; size: number }) {
  return <span className="flex gap-1 rounded-xl bg-rose-50 p-1 ring-2 ring-rose-300"><Cells n={n} emoji={emoji} size={size} /></span>
}

/**
 * Dizi tahtası (board). building: ilk sıra kuruluyor; row0 hedefine nesne bırakılır, ilk sıradaki nesneler
 * tutulup sepete geri sürüklenebilir (rowitem). removable: son sıra tepsiye geri sürüklenebilir (lastrow).
 */
export function ArrayBoard({ dnd, rows, cols, emoji, slots = 0, building, removable, wrong }: { dnd: Dnd; rows: number; cols: number; emoji: string; slots?: number; building?: boolean; removable?: boolean; wrong?: boolean }) {
  const width = Math.max(cols, building ? slots : 0, 1)
  const size = cellOf(width)
  return (
    <Drop dnd={dnd} id="board" className={`grid min-h-40 place-items-center rounded-3xl bg-rose-50/70 bg-[radial-gradient(#fecdd3_1.5px,transparent_1.5px)] bg-[length:18px_18px] p-3 ring-1 ring-rose-200 ${wrong ? 'animate-shake ring-4! ring-amber-400!' : ''}`}>
      <div className="flex flex-col gap-1">
        {Array.from({ length: rows }, (_, r) => {
          if (r === 0 && building)
            return (
              <Drop key={r} dnd={dnd} id="row0" className="flex gap-1 rounded-xl p-0.5">
                {cols > 0 && (
                  <Drag dnd={dnd} item="rowitem" label="İlk sıradan 1 nesne al" ghost={<span className="text-4xl leading-none">{emoji}</span>} className="flex gap-1 rounded-lg">
                    <Cells n={cols} emoji={emoji} size={size} />
                  </Drag>
                )}
                <Cells n={Math.max(0, slots - cols)} size={size} empty />
              </Drop>
            )
          if (r === rows - 1 && r > 0 && removable)
            return (
              <Drag key={r} dnd={dnd} item="lastrow" label="Son sırayı tepsiye geri sürükle" ghost={<RowGhost n={cols} emoji={emoji} size={size} />} className="flex gap-1 rounded-xl p-0.5 animate-pop">
                <Cells n={cols} emoji={emoji} size={size} />
              </Drag>
            )
          return (
            <div key={r} className={`flex gap-1 p-0.5 ${r > 0 ? 'animate-pop' : ''}`}>
              <Cells n={cols} emoji={emoji} size={size} />
            </div>
          )
        })}
      </div>
    </Drop>
  )
}

/** Sıra kartı: ilk sıranın kopyası; tahtaya sürükleyince bir sıra daha eklenir. Tepsi aynı zamanda geri bırakma hedefidir. */
export function RowTray({ dnd, cols, emoji, disabled, note }: { dnd: Dnd; cols: number; emoji: string; disabled?: boolean; note?: ReactNode }) {
  const size = cellOf(cols)
  return (
    <Drop dnd={dnd} id="rowtray" className="rounded-2xl bg-white p-2 ring-1 ring-line">
      <p className="mb-1.5 text-[11px] font-black tracking-wide text-rose-700 uppercase sm:text-xs">Sıra kartı · bir sıra = bir grup {note}</p>
      <Drag dnd={dnd} item="rowcard" disabled={disabled || cols === 0} label={`Sıra kartı: ${cols} tane`} ghost={<RowGhost n={cols} emoji={emoji} size={size} />} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-rose-50 p-1.5 ring-2 ring-rose-300 disabled:opacity-40">
        <span className="flex gap-0.5 text-lg leading-none" aria-hidden>{Array.from({ length: cols }, (_, i) => <span key={i}>{emoji}</span>)}</span>
        <span className="text-xs font-black text-rose-800">{cols} tane</span>
      </Drag>
    </Drop>
  )
}

/**
 * Diziyi 90° döndürme: düğmeyle ya da çarkı parmakla çevirerek. Çark bırakıldığında 35°’yi geçtiyse
 * dönüş tamamlanır, geçmediyse geri döner. Dönüş bitince onTurn çağrılır (satır ve sütunlar yer değiştirir).
 */
export function Rotator({ children, onTurn, disabled }: { children: ReactNode; onTurn: () => void; disabled?: boolean }) {
  const [spin, setSpin] = useState(0)
  const [anim, setAnim] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<{ cx: number; cy: number; a0: number; id: number } | null>(null)
  const busy = useRef(false)
  const angle = (x: number, y: number, d: { cx: number; cy: number }) => (Math.atan2(y - d.cy, x - d.cx) * 180) / Math.PI
  const turn = () => {
    if (busy.current || disabled) return
    busy.current = true
    setAnim(true)
    setSpin(90)
    window.setTimeout(() => {
      setAnim(false)
      setSpin(0)
      busy.current = false
      onTurn()
    }, 460)
  }
  return (
    <div>
      <div ref={box} style={{ transform: `rotate(${spin}deg)`, transition: anim ? 'transform 450ms cubic-bezier(0.34, 1.3, 0.64, 1)' : 'none' }}>{children}</div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={turn} disabled={disabled} className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-white px-4 text-base font-black text-rose-700 shadow-[0_3px_0_#fecdd3] ring-2 ring-rose-300 hover:bg-rose-50 disabled:opacity-40">
          <RotateCw size={20} strokeWidth={3} /> 90° döndür
        </button>
        <span className="text-sm font-black text-ink-soft">ya da</span>
        <span
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Çevirme çarkı: tut ve saat yönünde çevir"
          aria-disabled={disabled}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && turn()}
          onPointerDown={(e) => {
            if (disabled || busy.current) return
            const r = box.current!.getBoundingClientRect()
            const d = { cx: r.left + r.width / 2, cy: r.top + r.height / 2, a0: 0, id: e.pointerId }
            d.a0 = angle(e.clientX, e.clientY, d)
            drag.current = d
            e.currentTarget.setPointerCapture(e.pointerId)
            setAnim(false)
          }}
          onPointerMove={(e) => {
            const d = drag.current
            if (!d || d.id !== e.pointerId) return
            let a = angle(e.clientX, e.clientY, d) - d.a0
            if (a < -180) a += 360
            if (a > 180) a -= 360
            setSpin(Math.max(0, Math.min(90, a)))
          }}
          onPointerUp={() => {
            if (!drag.current) return
            drag.current = null
            if (spin > 35) turn()
            else {
              setAnim(true)
              setSpin(0)
            }
          }}
          onPointerCancel={() => {
            drag.current = null
            setSpin(0)
          }}
          className={`grid size-16 touch-none place-items-center rounded-full bg-rose-500 text-white shadow-[0_4px_0_#9f1239] ring-4 ring-white select-none ${disabled ? 'opacity-40' : 'cursor-grab active:cursor-grabbing'}`}
          style={{ transform: `rotate(${spin}deg)` }}
        >
          <RotateCw size={30} strokeWidth={3} />
        </span>
      </div>
    </div>
  )
}

/* ───────────── küçük modeller (eşleştirme kartları) ───────────── */

export function MiniArray({ r, c }: { r: number; c: number }) {
  return (
    <span className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${c}, 9px)` }} aria-hidden>
      {Array.from({ length: r * c }, (_, i) => <span key={i} className="size-[9px] rounded-full bg-rose-500" />)}
    </span>
  )
}

export function MiniGroups({ g, s }: { g: number; s: number }) {
  return (
    <span className="flex flex-wrap items-center justify-center gap-1.5" aria-hidden>
      {Array.from({ length: g }, (_, i) => (
        <span key={i} className="grid place-content-center gap-[2px] rounded-full bg-amber-100 p-1.5 ring-2 ring-amber-300" style={{ gridTemplateColumns: `repeat(${Math.min(s, s > 4 ? Math.ceil(s / 2) : s)}, 7px)` }}>
          {Array.from({ length: s }, (_, k) => <span key={k} className="size-[7px] rounded-full bg-sky-600" />)}
        </span>
      ))}
    </span>
  )
}

/* ───────────── “Nasıl kullanılır?” araçları ───────────── */

export const ATOOL: Record<'board' | 'row' | 'turn' | 'first', ToolInfo> = {
  first: { icon: <span className="grid size-5 place-items-center rounded-md border-2 border-dashed border-sky-300 bg-white" />, name: 'İlk sıra', text: 'Sepetten nesneleri tek tek kesikli kutulara sürükle. Fazlasını ilk sıradan tutup sepete geri sürükle.' },
  row: { icon: <span className="h-4 w-7 rounded-md bg-rose-100 ring-2 ring-rose-300" />, name: 'Sıra kartı', text: 'İlk sıranın kopyası. Tutup tahtaya sürükle: bir sıra daha eklenir. Son sırayı tutup karta geri sürüklersen kalkar.' },
  turn: { icon: <RotateCw size={16} strokeWidth={3} className="text-rose-600" />, name: 'Döndür', text: '“90° döndür” düğmesine bas ya da pembe çarkı tutup saat yönünde çevir. Sıralar sütun, sütunlar sıra olur.' },
  board: { icon: <span className="size-4 rounded bg-rose-100 ring-1 ring-rose-300" />, name: 'Dizi tahtası', text: 'Sıra kartlarını bırakacağın yer. Her sıra bir grup.' },
}
