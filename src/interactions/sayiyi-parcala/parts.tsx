import { useRef } from 'react'
import { useDrag } from '@use-gesture/react'
import { Minus, Plus, Scissors, Shuffle, Combine } from 'lucide-react'
import { BlocksSvg } from '../../components/Visual'
import { tr } from '../hizli-noktalar/kit'

export const SEG = ['#fb7185', '#60a5fa', '#34d399']
export const SEG_SOFT = ['#ffe4e6', '#dbeafe', '#d1fae5']

/** Sayı bağı: bütün üstte, parçalar altta */
export function NumberBond({ whole, parts, active, onPart, big }: { whole: number; parts: (number | null)[]; active?: number; onPart?: (i: number) => void; big?: boolean }) {
  const n = parts.length
  const W = 300, H = 150
  const xs = parts.map((_, i) => (n === 2 ? [80, 220][i] : [55, 150, 245][i]))
  const r = big ? 34 : 30
  return (
    <div className="relative mx-auto w-full max-w-[19rem]">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden>
        {xs.map((x, i) => <line key={i} x1={150} y1={40} x2={x} y2={H - 38} stroke="#94a3b8" strokeWidth={4} />)}
      </svg>
      <div className="absolute grid place-items-center rounded-full bg-ink text-white shadow-md" style={{ left: '50%', top: `${(40 / H) * 100}%`, width: r * 2.3, height: r * 2.3, transform: 'translate(-50%,-50%)' }}>
        <span className="text-xl font-black sm:text-2xl">{tr(whole)}</span>
      </div>
      {parts.map((p, i) => {
        const cls = 'absolute grid place-items-center rounded-full border-4 font-black shadow-sm transition'
        const style = { left: `${(xs[i] / W) * 100}%`, top: `${((H - 38) / H) * 100}%`, width: r * 2.2, height: r * 2.2, transform: 'translate(-50%,-50%)', borderColor: SEG[i], background: active === i ? SEG_SOFT[i] : '#fff' }
        const body = <span className={`text-xl sm:text-2xl ${p === null ? 'text-ink-soft' : ''}`}>{p === null ? '?' : tr(p)}</span>
        return onPart ? (
          <button key={i} type="button" onClick={() => onPart(i)} className={`${cls} ${active === i ? 'scale-110 ring-4 ring-ink/20' : ''}`} style={style} aria-label={`${i + 1}. parça`}>
            {body}
          </button>
        ) : (
          <div key={i} className={cls} style={style}>{body}</div>
        )
      })}
    </div>
  )
}

/** İki yüzlü sayaçlar (kırmızı/sarı) onluk çerçeve düzeninde: dokununca döner */
export function Counters({ sides, onFlip, onShake }: { sides: boolean[]; onFlip: (i: number) => void; onShake: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="grid grid-cols-5 gap-2 rounded-2xl bg-white p-2 ring-[3px] ring-ink sm:gap-3 sm:p-3">
        {sides.map((red, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onFlip(i)}
            aria-label={`${i + 1}. sayaç ${red ? 'kırmızı' : 'sarı'}`}
            className="grid size-14 place-items-center rounded-full transition active:scale-90 sm:size-16"
          >
            <span key={String(red)} className="size-full rounded-full shadow-[inset_0_-5px_0_rgb(0_0_0/0.15)] animate-pop" style={{ background: red ? '#ef4444' : '#facc15' }} />
          </button>
        ))}
      </div>
      <button type="button" onClick={onShake} className="btn-ghost min-h-14 px-5 text-lg"><Shuffle size={20} />Salla ve dök!</button>
    </div>
  )
}

/**
 * Şerit: bütünün uzunluğu N. Şeride dokun → kesik ekle (ya da en yakın kesiği oraya taşı);
 * kesiği sürükle → taşı; kesiğe dokun → kaldır. Kesikler `step` katına yapışır.
 */
export function Tape({ total, step, cuts, maxCuts, onChange }: { total: number; step: number; cuts: number[]; maxCuts: number; onChange: (c: number[]) => void }) {
  const bar = useRef<HTMLDivElement>(null)
  const cells = total / step <= 20 ? total / step : 0
  const toVal = (clientX: number) => {
    const r = bar.current!.getBoundingClientRect()
    const v = Math.round((((clientX - r.left) / r.width) * total) / step) * step
    return Math.max(step, Math.min(total - step, v))
  }
  const sorted = [...cuts].sort((a, b) => a - b)
  const bounds = [0, ...sorted, total]
  const place = (v: number) => {
    if (cuts.includes(v)) return
    if (cuts.length < maxCuts) onChange([...cuts, v])
    else {
      let k = 0
      cuts.forEach((c, i) => Math.abs(c - v) < Math.abs(cuts[k] - v) && (k = i))
      onChange(cuts.map((c, i) => (i === k ? v : c)))
    }
  }
  const bindBar = useDrag(({ tap, xy: [x], event }) => {
    if (!tap || (event.target as Element).closest('[data-cut]')) return
    place(toVal(x))
  }, { filterTaps: true })
  const bindCut = useDrag(
    ({ args: [i], tap, xy: [x], event }) => {
      event?.preventDefault?.()
      if (tap) {
        onChange(cuts.filter((_, k) => k !== i))
        return
      }
      const v = toVal(x)
      if (cuts.some((c, k) => k !== i && c === v)) return
      onChange(cuts.map((c, k) => (k === i ? v : c)))
    },
    { filterTaps: true, eventOptions: { passive: false } },
  )
  return (
    <div className="px-3 pt-8 pb-10">
      <div className="relative">
        <div className="absolute -top-7 right-0 left-0 flex items-end">
          <div className="h-3 flex-1 rounded-t-md border-x-2 border-t-2 border-ink" />
        </div>
        <p className="absolute -top-9 left-1/2 -translate-x-1/2 rounded-lg bg-paper px-2 text-lg font-black">{tr(total)}</p>
        <div ref={bar} {...bindBar()} className="relative flex h-20 cursor-pointer overflow-hidden rounded-xl ring-[3px] ring-ink" style={{ touchAction: 'none' }} role="group" aria-label={`${tr(total)} uzunluğunda şerit, kesmek için dokun`}>
          {bounds.slice(1).map((b, i) => {
            const a = bounds[i]
            return (
              <div key={i} className="relative grid place-items-center transition-[width] duration-100" style={{ width: `${((b - a) / total) * 100}%`, background: SEG_SOFT[i % 3] }}>
                {cells > 0 && (
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: (b - a) / step }, (_, k) => <span key={k} className="flex-1 border-r border-ink/25 last:border-r-0" />)}
                  </div>
                )}
                <span className="relative rounded-lg px-1.5 text-xl font-black sm:text-2xl" style={{ color: '#1f2340', background: 'rgb(255 255 255 / .75)' }}>{tr(b - a)}</span>
              </div>
            )
          })}
        </div>
        {cuts.map((c, i) => (
          <button
            key={i}
            type="button"
            data-cut
            data-handle
            {...bindCut(i)}
            className="absolute top-[-10px] z-10 flex h-[calc(100%+20px)] w-12 -translate-x-1/2 cursor-ew-resize justify-center"
            style={{ left: `${(c / total) * 100}%`, touchAction: 'none' }}
            aria-label={`${tr(c)} noktasındaki kesik (kaldırmak için dokun)`}
          >
            <span className="h-full w-1.5 rounded-full bg-ink" />
            <span className="absolute -bottom-9 grid size-9 place-items-center rounded-full bg-ink text-white shadow"><Scissors size={16} /></span>
          </button>
        ))}
      </div>
    </div>
  )
}

export type Place = 'th' | 'h' | 't' | 'o'
export const PLACE: Record<Place, { name: string; v: number; color: string }> = {
  th: { name: 'binlik', v: 1000, color: '#6366f1' },
  h: { name: 'yüzlük', v: 100, color: '#f97316' },
  t: { name: 'onluk', v: 10, color: '#16a34a' },
  o: { name: 'birlik', v: 1, color: '#ca8a04' },
}

/** Taban blokları: her basamak için ± ve “kır / birleştir” (yeniden gruplama) */
export function BlockBuilder({ places, counts, onChange, big }: { places: Place[]; counts: Record<Place, number>; onChange: (c: Record<Place, number>) => void; big?: boolean }) {
  const set = (p: Place, d: number) => onChange({ ...counts, [p]: Math.max(0, Math.min(60, counts[p] + d)) })
  const lower = (p: Place): Place | null => places[places.indexOf(p) + 1] ?? null
  const breakOne = (p: Place) => {
    const l = lower(p)
    if (!l || counts[p] < 1) return
    onChange({ ...counts, [p]: counts[p] - 1, [l]: counts[l] + 10 })
  }
  const join = (p: Place) => {
    const l = lower(p)
    if (!l || counts[l] < 10) return
    onChange({ ...counts, [p]: counts[p] + 1, [l]: counts[l] - 10 })
  }
  const btn = `${big ? 'size-14' : 'size-12'} grid place-items-center rounded-2xl bg-white ring-1 ring-line shadow-[0_3px_0_var(--color-line)] active:translate-y-0.5 disabled:opacity-40`
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-2xl bg-white p-2 ring-1 ring-line [&_svg]:h-[120px] [&_svg]:w-auto [&_svg]:max-w-none">
        {places.every((p) => counts[p] === 0) ? (
          <p className="grid h-[120px] place-items-center text-center font-bold text-ink-soft">Blok eklemek için + düğmelerini kullan.</p>
        ) : (
          <BlocksSvg thousands={counts.th} hundreds={counts.h} tens={counts.t} ones={counts.o} />
        )}
      </div>
      <div className={`grid gap-2 ${places.length === 4 ? 'sm:grid-cols-2' : places.length === 3 ? 'sm:grid-cols-3' : 'grid-cols-2'}`}>
        {places.map((p) => {
          const l = lower(p)
          return (
            <div key={p} className="rounded-2xl bg-white/90 p-2 ring-1 ring-line">
              <p className="text-center text-sm font-black" style={{ color: PLACE[p].color }}>{PLACE[p].name}</p>
              <div className="mt-1 flex items-center justify-center gap-2">
                <button type="button" className={btn} onClick={() => set(p, -1)} disabled={counts[p] === 0} aria-label={`Bir ${PLACE[p].name} çıkar`}><Minus size={20} /></button>
                <span className="min-w-10 text-center text-3xl font-black tabular-nums">{counts[p]}</span>
                <button type="button" className={btn} onClick={() => set(p, 1)} aria-label={`Bir ${PLACE[p].name} ekle`}><Plus size={20} /></button>
              </div>
              {l && (
                <div className="mt-2 flex gap-1.5">
                  <button type="button" onClick={() => breakOne(p)} disabled={counts[p] < 1} className="flex min-h-12 flex-1 items-center justify-center gap-1 rounded-xl bg-amber-50 px-1 text-xs font-extrabold text-amber-900 ring-1 ring-amber-200 disabled:opacity-40 sm:text-sm">
                    <Scissors size={15} />1 {PLACE[p].name} → 10 {PLACE[l].name}
                  </button>
                  <button type="button" onClick={() => join(p)} disabled={counts[l] < 10} className="grid min-h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200 disabled:opacity-40" aria-label={`10 ${PLACE[l].name} → 1 ${PLACE[p].name}`} title={`10 ${PLACE[l].name} → 1 ${PLACE[p].name}`}>
                    <Combine size={18} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
