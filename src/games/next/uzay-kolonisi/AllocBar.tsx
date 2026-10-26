import { useRef, useState } from 'react'
import { GripVertical, Minus, Plus } from 'lucide-react'
import { MathText } from '../../../components/MathText'
import { MODS, type Mod } from './art'

/**
 * Sürükle-paylaştır çubuğu: kaynak `units` eş bloğa bölünmüştür.
 * Bölmeler arasındaki tutamaçlar sürüklenir (bloklara yapışır); her modülün −/+ düğmeleri dokunma alternatifidir.
 * Paylaştırılmayan bloklar sağdaki “Boşta” bölümünde durur.
 */
export function AllocBar({ segs, value, units, label, onChange, locked, onNoPool }: { segs: Mod[]; value: number[]; units: number; label: (k: number) => string; onChange: (v: number[]) => void; locked?: boolean; onNoPool?: () => void }) {
  const barRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ tied: number[]; idx: number | null; x0: number } | null>(null)
  const [active, setActive] = useState<number | null>(null)
  const used = value.reduce((a, b) => a + b, 0)
  const pool = units - used
  // sınırlar: b[i] = ilk i+1 segmentin toplamı
  const bounds = value.map((_, i) => value.slice(0, i + 1).reduce((a, b) => a + b, 0))

  const unitAt = (cx: number) => {
    const r = barRef.current!.getBoundingClientRect()
    return Math.round(((cx - r.left) / r.width) * units)
  }
  const setBound = (i: number, b: number) => {
    const lo = i === 0 ? 0 : bounds[i - 1]
    const hi = i + 1 < bounds.length ? bounds[i + 1] : units
    const nb = Math.max(lo, Math.min(hi, b))
    if (nb === bounds[i]) return
    const next = [...value]
    next[i] = nb - lo
    if (i + 1 < value.length) next[i + 1] = bounds[i + 1] - nb
    onChange(next)
  }

  const onDown = (i: number) => (e: React.PointerEvent) => {
    if (locked) return
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    const tied = bounds.map((b, j) => (b === bounds[i] ? j : -1)).filter((j) => j >= 0)
    drag.current = { tied, idx: tied.length === 1 ? i : null, x0: e.clientX }
    setActive(i)
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    if (d.idx === null) {
      if (Math.abs(e.clientX - d.x0) < 4) return
      d.idx = e.clientX < d.x0 ? Math.min(...d.tied) : Math.max(...d.tied)
      setActive(d.idx)
    }
    setBound(d.idx, unitAt(e.clientX))
  }
  const onUp = () => {
    drag.current = null
    setActive(null)
  }

  const step = (i: number, dir: 1 | -1) => {
    if (locked) return
    if (dir === 1 && pool <= 0) return onNoPool?.()
    if (dir === -1 && value[i] <= 0) return
    const next = [...value]
    next[i] += dir
    onChange(next)
  }

  return (
    <div className="select-none">
      <div ref={barRef} className="relative h-24 w-full overflow-visible rounded-2xl bg-slate-950/70 ring-1 ring-white/15 sm:h-28" style={{ touchAction: 'none' }} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div className="absolute inset-0 flex overflow-hidden rounded-2xl">
          {segs.map((m, i) => {
            const w = (value[i] / units) * 100
            return (
              <div key={m} className="relative flex h-full flex-col items-center justify-center overflow-hidden text-center transition-[width] duration-100" style={{ width: `${w}%`, background: `linear-gradient(180deg, ${MODS[m].color}, ${MODS[m].color}bb)` }}>
                {w >= 7 && <span className="text-xl leading-none drop-shadow" aria-hidden>{MODS[m].emoji}</span>}
                {w >= 9 && <span className="mt-0.5 text-[11px] font-black text-slate-950/80 uppercase">{MODS[m].short}</span>}
                {w >= 7 && <span className="text-sm font-black text-slate-950 sm:text-base"><MathText text={label(value[i])} /></span>}
              </div>
            )
          })}
          {pool > 0 && (
            <div className="flex h-full flex-1 flex-col items-center justify-center bg-[repeating-linear-gradient(135deg,#1e293b_0_8px,#0f172a_8px_16px)] text-center text-xs font-black text-slate-400">
              Boşta
              <span className="text-sm text-slate-300"><MathText text={label(pool)} /></span>
            </div>
          )}
        </div>
        {/* blok çizgileri */}
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: units - 1 }, (_, i) => (
            <span key={i} className="absolute inset-y-0 w-px bg-slate-950/35" style={{ left: `${((i + 1) / units) * 100}%` }} />
          ))}
        </div>
        {/* tutamaçlar */}
        {!locked &&
          bounds.map((b, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${MODS[segs[i]].name} sınırını sürükle`}
              onPointerDown={onDown(i)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') setBound(i, b - 1)
                if (e.key === 'ArrowRight') setBound(i, b + 1)
              }}
              data-handle
              className="absolute -top-2 -bottom-2 z-10 flex w-12 -translate-x-1/2 cursor-ew-resize items-center justify-center"
              style={{ left: `${(b / units) * 100}%`, touchAction: 'none' }}
            >
              <span className={`flex h-full w-3 items-center justify-center rounded-full ring-2 transition ${active === i ? 'bg-white ring-cyan-300' : 'bg-slate-100 ring-slate-900/50'}`}>
                <GripVertical size={12} className="text-slate-500" />
              </span>
            </button>
          ))}
      </div>
      <div className="mt-1 flex justify-between px-0.5 text-[11px] font-black text-slate-400">
        <span>0</span>
        <span>{units} blok</span>
      </div>
      <div className={`mt-2 grid gap-2 ${segs.length > 3 ? 'grid-cols-1 min-[440px]:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {segs.map((m, i) => (
          <div key={m} className="flex items-center gap-1 rounded-2xl bg-slate-900/70 p-1 ring-1 ring-white/10">
            <button type="button" disabled={locked || value[i] <= 0} onClick={() => step(i, -1)} className="grid size-12 shrink-0 place-items-center rounded-xl bg-slate-800 text-white active:scale-95 disabled:opacity-30" aria-label={`${MODS[m].name} azalt`}><Minus size={18} /></button>
            <div className="min-w-0 flex-1 text-center leading-tight">
              <p className="truncate text-[11px] font-black uppercase" style={{ color: MODS[m].color }}>{MODS[m].emoji} {MODS[m].short}</p>
              <p className="text-base font-black text-white"><MathText text={label(value[i])} /></p>
            </div>
            <button type="button" disabled={locked} onClick={() => step(i, 1)} className="grid size-12 shrink-0 place-items-center rounded-xl bg-slate-800 text-white active:scale-95 disabled:opacity-30" aria-label={`${MODS[m].name} artır`}><Plus size={18} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
