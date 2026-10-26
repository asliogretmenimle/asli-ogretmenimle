import type { ReactNode } from 'react'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { DragSource } from './drag'

/** İki parça rengi: mercan ve deniz */
export const CORAL = { fill: '#fb7158', dark: '#c2410c', soft: '#fff1ec', ink: '#9a3412', name: 'Mercan' }
export const TEAL = { fill: '#14b8a6', dark: '#0f766e', soft: '#e6fbf7', ink: '#115e59', name: 'Deniz' }
export type Side = 'r' | 'b'
const col = (s: Side) => (s === 'r' ? CORAL : TEAL)

/* ───────────────────────────── Küp ve çubuk görselleri ───────────────────────────── */

export function Cube({ side, size = 44 }: { side: Side; size?: number }) {
  const c = col(side)
  return (
    <span
      className="block rounded-[28%]"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(145deg, ${c.fill} 0%, ${c.fill} 55%, ${c.dark} 100%)`,
        boxShadow: `inset 0 3px 0 rgba(255,255,255,.45), inset 0 -4px 0 ${c.dark}, 0 2px 0 rgba(0,0,0,.12)`,
      }}
    />
  )
}

export function Rod({ side, length = 150, thick = 24, vertical = false }: { side: Side; length?: number; thick?: number; vertical?: boolean }) {
  const c = col(side)
  return (
    <span
      className="grid overflow-hidden rounded-md"
      style={{
        width: vertical ? thick : length,
        height: vertical ? length : thick,
        gridTemplateColumns: vertical ? '1fr' : 'repeat(10, 1fr)',
        gridTemplateRows: vertical ? 'repeat(10, 1fr)' : '1fr',
        gap: 1.5,
        padding: 1.5,
        background: c.dark,
        boxShadow: '0 2px 0 rgba(0,0,0,.15)',
      }}
    >
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className="rounded-[3px]" style={{ background: `linear-gradient(145deg, ${c.fill}, ${c.fill} 60%, ${c.dark})`, boxShadow: 'inset 0 2px 0 rgba(255,255,255,.35)' }} />
      ))}
    </span>
  )
}

const RAFT =
  'relative rounded-[28px] p-3 sm:p-4 ring-4 ring-amber-900/25 transition data-[over]:ring-sky-400 data-[over]:scale-[1.01] bg-[repeating-linear-gradient(90deg,#e0b07a_0,#e0b07a_44px,#c9935a_44px,#c9935a_47px)] shadow-[inset_0_-6px_0_rgba(120,53,15,.25),0_8px_20px_rgba(12,74,110,.18)]'

/* ───────────────────────────── 1. sınıf: onluk çerçeveli sal ───────────────────────────── */

export function FrameRaft({ red, blue, cap, rods, onChange, onFull }: { red: number; blue: number; cap: 10 | 20; rods?: boolean; onChange: (r: number, b: number) => void; onFull: () => void }) {
  const total = red + blue
  const add = (s: Side, k: number) => {
    if (total + k > cap) return onFull()
    if (s === 'r') onChange(red + k, blue)
    else onChange(red, blue + k)
  }
  const frames = cap / 10
  return (
    <div>
      <div data-drop="raft" className={RAFT}>
        <span className="absolute -top-3 left-6 rounded-full bg-amber-900 px-3 py-0.5 text-xs font-black text-amber-50 shadow">Sal</span>
        <div className="flex flex-wrap justify-center gap-3">
          {Array.from({ length: frames }, (_, f) => (
            <div key={f} className="grid grid-cols-5 gap-1 rounded-2xl bg-white p-1.5 shadow-inner ring-[3px] ring-slate-700">
              {Array.from({ length: 10 }, (_, i) => {
                const idx = f * 10 + i
                const s: Side | null = idx < red ? 'r' : idx < total ? 'b' : null
                const sz = 'size-[clamp(30px,6.4vw,50px)]'
                return s ? (
                  <button
                    key={i}
                    type="button"
                    data-handle
                    onClick={() => (s === 'r' ? onChange(red - 1, blue) : onChange(red, blue - 1))}
                    aria-label={`${col(s).name} küpü çıkar`}
                    className={`${sz} grid place-items-center rounded-lg animate-pop`}
                  >
                    <span className="size-[86%]"><CubeFill side={s} /></span>
                  </button>
                ) : (
                  <span key={i} className={`${sz} rounded-lg border-2 border-dashed border-slate-200`} />
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <Tray rods={rods} onAdd={add} />
    </div>
  )
}

function CubeFill({ side }: { side: Side }) {
  const c = col(side)
  return <span className="block size-full rounded-[28%]" style={{ background: `linear-gradient(145deg, ${c.fill} 0%, ${c.fill} 55%, ${c.dark} 100%)`, boxShadow: `inset 0 3px 0 rgba(255,255,255,.45), inset 0 -4px 0 ${c.dark}` }} />
}

function Tray({ rods, onAdd, unitLabel = 'küp', rodLabel = '10’luk çubuk' }: { rods?: boolean; onAdd: (s: Side, k: number) => void; unitLabel?: string; rodLabel?: string }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
      {(['r', 'b'] as Side[]).map((s) => {
        const c = col(s)
        return (
          <div key={s} className="flex flex-wrap items-center justify-center gap-2 rounded-2xl p-2 ring-2 sm:gap-3 sm:p-3" style={{ background: c.soft, ['--tw-ring-color' as string]: `${c.fill}55` }}>
            <DragSource
              label={`${c.name} ${unitLabel} ekle`}
              onTap={() => onAdd(s, 1)}
              onDrop={(z) => z === 'raft' && onAdd(s, 1)}
              ghost={<Cube side={s} size={48} />}
              className="grid min-h-16 min-w-16 cursor-grab place-items-center rounded-2xl bg-white/80 p-2 shadow-sm ring-1 ring-black/5 transition active:scale-95"
            >
              <Cube side={s} size={42} />
              <span className="mt-1 text-[11px] font-black" style={{ color: c.ink }}>{unitLabel}</span>
            </DragSource>
            {rods && (
              <DragSource
                label={`${c.name} ${rodLabel} ekle`}
                onTap={() => onAdd(s, 10)}
                onDrop={(z) => z === 'raft' && onAdd(s, 10)}
                ghost={<Rod side={s} length={150} thick={22} />}
                className="grid min-h-16 cursor-grab place-items-center rounded-2xl bg-white/80 px-2 py-2 shadow-sm ring-1 ring-black/5 transition active:scale-95"
              >
                <Rod side={s} length={96} thick={18} />
                <span className="mt-1 text-[11px] font-black" style={{ color: c.ink }}>{rodLabel}</span>
              </DragSource>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ───────────────────────────── 2. sınıf: onluk-birlik sal ───────────────────────────── */

export interface B10 {
  rt: number
  ru: number
  bt: number
  bu: number
}
export const b10Parts = (v: B10) => [v.rt * 10 + v.ru, v.bt * 10 + v.bu]

export function Base10Raft({ v, onChange, onFull }: { v: B10; onChange: (v: B10) => void; onFull: () => void }) {
  const [a, b] = b10Parts(v)
  const add = (s: Side, k: number) => {
    if (a + b + k > 100) return onFull()
    if (s === 'r') onChange(k === 10 ? { ...v, rt: v.rt + 1 } : { ...v, ru: v.ru + 1 })
    else onChange(k === 10 ? { ...v, bt: v.bt + 1 } : { ...v, bu: v.bu + 1 })
  }
  const half = (s: Side) => {
    const t = s === 'r' ? v.rt : v.bt
    const u = s === 'r' ? v.ru : v.bu
    const c = col(s)
    const set = (nt: number, nu: number) => onChange(s === 'r' ? { ...v, rt: nt, ru: nu } : { ...v, bt: nt, bu: nu })
    return (
      <div className="flex min-h-[188px] min-w-[120px] flex-1 flex-col items-center rounded-2xl bg-white/85 p-2 shadow-inner ring-[3px]" style={{ ['--tw-ring-color' as string]: c.fill }}>
        <span className="mb-1 rounded-full px-3 text-xl font-black text-white tabular-nums" style={{ background: c.fill }}>{t * 10 + u}</span>
        <div className="flex flex-1 items-end gap-1.5">
          {Array.from({ length: t }, (_, i) => (
            <button key={`t${i}`} type="button" data-handle onClick={() => set(t - 1, u)} aria-label={`${c.name} onluğu çıkar`} className="animate-pop">
              <Rod side={s} vertical length={140} thick={20} />
            </button>
          ))}
          {u > 0 && (
            <div className="grid grid-flow-col grid-rows-5 gap-1" style={{ direction: 'ltr' }}>
              {Array.from({ length: u }, (_, i) => (
                <button key={`u${i}`} type="button" data-handle onClick={() => set(t, u - 1)} aria-label={`${c.name} birliği çıkar`} className="animate-pop">
                  <Cube side={s} size={22} />
                </button>
              ))}
            </div>
          )}
          {t === 0 && u === 0 && <span className="self-center text-sm font-bold text-slate-400">boş</span>}
        </div>
        {u >= 10 && (
          <button type="button" onClick={() => set(t + 1, u - 10)} className="mt-2 min-h-11 rounded-xl px-3 text-xs font-black text-white shadow" style={{ background: c.dark }}>
            10 birlik → 1 onluk
          </button>
        )}
      </div>
    )
  }
  return (
    <div>
      <div data-drop="raft" className={RAFT}>
        <span className="absolute -top-3 left-6 rounded-full bg-amber-900 px-3 py-0.5 text-xs font-black text-amber-50 shadow">Sal</span>
        <div className="flex flex-wrap items-stretch justify-center gap-2 sm:gap-3">
          {half('r')}
          <span className="self-center text-4xl font-black text-amber-950/70">+</span>
          {half('b')}
        </div>
      </div>
      <Tray rods onAdd={add} unitLabel="birlik" rodLabel="onluk" />
    </div>
  )
}

/* ───────────────────────────── Sayı tahtaları ───────────────────────────── */

export function DotPattern({ n }: { n: number }) {
  return (
    <span className="grid grid-cols-5 gap-[3px] rounded-md bg-white/70 p-[3px]" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={`size-[7px] rounded-full ${i < n ? 'bg-amber-900' : 'bg-amber-900/15'}`} />
      ))}
    </span>
  )
}

const WOOD = 'bg-[linear-gradient(180deg,#fde3bd,#e0b07a)] text-amber-950 ring-2 ring-amber-800/60 shadow-[0_3px_0_#92400e]'

export function Plank({ value, dots, small }: { value: number; dots?: boolean; small?: boolean }) {
  return (
    <span className={`flex flex-col items-center justify-center gap-1 rounded-xl ${WOOD} ${small ? 'min-h-14 min-w-14 px-2' : 'min-h-16 min-w-16 px-3'}`}>
      <span className={`${small ? 'text-2xl' : 'text-3xl'} leading-none font-black tabular-nums`}>{value}</span>
      {dots && <DotPattern n={value} />}
    </span>
  )
}

/** Denklem satırı: metin parçaları ve tahta yuvaları */
export type Token = string | { slot: number }

export function EquationRow({ tokens, slots, dots, onClear, renderSlot }: { tokens: Token[]; slots: (number | null)[]; dots?: boolean; onClear?: (i: number) => void; renderSlot?: (i: number) => ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 text-3xl font-black text-slate-800 sm:text-4xl" role="group" aria-label={`Denklem: ${tokens.map((t) => (typeof t === 'string' ? t : '?')).join(' ')}`}>
      {tokens.map((t, k) =>
        typeof t === 'string' ? (
          <span key={k} className="tabular-nums">{t}</span>
        ) : renderSlot ? (
          <span key={k}>{renderSlot(t.slot)}</span>
        ) : (
          <span key={k} data-drop={`slot-${t.slot}`} className="rounded-2xl transition data-[over]:scale-110 data-[over]:ring-4 data-[over]:ring-sky-400">
            {slots[t.slot] !== null && slots[t.slot] !== undefined ? (
              <button type="button" onClick={() => onClear?.(t.slot)} aria-label={`${slots[t.slot]} tahtasını kaldır`} className="animate-pop">
                <Plank value={slots[t.slot]!} dots={dots} />
              </button>
            ) : (
              <span className="grid min-h-16 min-w-16 place-items-center rounded-xl border-[3px] border-dashed border-sky-400 bg-sky-50 px-3 text-2xl text-sky-400">?</span>
            )}
          </span>
        ),
      )}
    </div>
  )
}

export function PlankBank({ bank, dots, onPick, onDropTo }: { bank: number[]; dots?: boolean; onPick: (v: number) => void; onDropTo: (slot: number, v: number) => void }) {
  return (
    <div className="mt-4 rounded-3xl bg-[linear-gradient(180deg,#fef3c7,#fde68a)] p-3 ring-1 ring-amber-300">
      <p className="mb-2 text-center text-xs font-black tracking-wide text-amber-900 uppercase">Tahta yığını — sürükle ya da dokun</p>
      <div className="flex flex-wrap justify-center gap-2">
        {bank.map((v) => (
          <DragSource
            key={v}
            label={`${v} tahtası`}
            onTap={() => onPick(v)}
            onDrop={(z) => z.startsWith('slot-') && onDropTo(Number(z.slice(5)), v)}
            ghost={<Plank value={v} dots={dots} />}
            className="cursor-grab rounded-xl transition active:scale-95"
          >
            <Plank value={v} dots={dots} small={!dots} />
          </DragSource>
        ))}
      </div>
    </div>
  )
}

/** 2. sınıf: onluk ve birlik düğmeleriyle ayarlanan tahta */
export function StepperPlank({ value, onChange, max = 100, label }: { value: number; onChange: (v: number) => void; max?: number; label: string }) {
  const btn = 'grid h-12 min-w-12 place-items-center rounded-xl px-2 text-base font-black ring-1 transition active:scale-95 disabled:opacity-30'
  const set = (v: number) => onChange(Math.max(0, Math.min(max, v)))
  return (
    <span className="inline-flex flex-col items-center gap-1.5 align-middle" role="group" aria-label={label}>
      <span className="flex gap-1.5">
        <button type="button" onClick={() => set(value + 10)} disabled={value + 10 > max} className={`${btn} bg-emerald-50 text-emerald-800 ring-emerald-200`} aria-label={`${label}: 10 artır`}><Plus size={14} strokeWidth={3} />10</button>
        <button type="button" onClick={() => set(value + 1)} disabled={value + 1 > max} className={`${btn} bg-emerald-50 text-emerald-800 ring-emerald-200`} aria-label={`${label}: 1 artır`}><Plus size={14} strokeWidth={3} />1</button>
      </span>
      <span className={`grid min-h-16 min-w-24 place-items-center rounded-xl text-4xl font-black tabular-nums ${value ? WOOD : 'border-[3px] border-dashed border-sky-400 bg-sky-50 text-sky-400'}`} aria-live="polite">{value || '?'}</span>
      <span className="flex gap-1.5">
        <button type="button" onClick={() => set(value - 10)} disabled={value < 10} className={`${btn} bg-rose-50 text-rose-800 ring-rose-200`} aria-label={`${label}: 10 azalt`}><Minus size={14} strokeWidth={3} />10</button>
        <button type="button" onClick={() => set(value - 1)} disabled={value < 1} className={`${btn} bg-rose-50 text-rose-800 ring-rose-200`} aria-label={`${label}: 1 azalt`}><Minus size={14} strokeWidth={3} />1</button>
      </span>
    </span>
  )
}

export function ClearButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-12 items-center gap-1.5 rounded-2xl bg-white px-4 text-sm font-extrabold text-ink ring-1 ring-line hover:bg-paper">
      <RotateCcw size={16} />Temizle
    </button>
  )
}
