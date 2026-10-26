import type { ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'

export function Stepper({ label, value, onDec, onInc, disabled, color = '#6366f1' }: { label: ReactNode; value: ReactNode; onDec: () => void; onInc: () => void; disabled?: boolean; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">{label}</span>
      <div className="flex items-center gap-1 rounded-2xl bg-white p-1 ring-1 ring-line">
        <button type="button" disabled={disabled} onClick={onDec} className="grid size-11 place-items-center rounded-xl hover:bg-paper disabled:opacity-30" aria-label="Azalt"><Minus size={20} /></button>
        <span className="min-w-10 text-center text-xl font-black tabular-nums" style={{ color }}>{value}</span>
        <button type="button" disabled={disabled} onClick={onInc} className="grid size-11 place-items-center rounded-xl hover:bg-paper disabled:opacity-30" aria-label="Artır"><Plus size={20} /></button>
      </div>
    </div>
  )
}

export function Readout({ children }: { children: ReactNode }) {
  return <div className="mx-auto mt-3 w-fit rounded-2xl bg-ink px-4 py-2 text-center text-lg font-extrabold text-white tabular-nums">{children}</div>
}

export function ToolButton({ children, onClick, disabled, active }: { children: ReactNode; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3.5 text-sm font-extrabold ring-1 transition active:scale-95 disabled:opacity-40 ${active ? 'bg-brand text-white ring-brand' : 'bg-white text-ink ring-line hover:bg-paper'}`}
    >
      {children}
    </button>
  )
}
