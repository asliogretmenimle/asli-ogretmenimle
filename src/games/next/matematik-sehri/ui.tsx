import { useState, type ReactNode } from 'react'
import { Check, Delete } from 'lucide-react'
import { area, perim, type Rect } from './city'

/** Dokunmatik sayı tuş takımı (tablette klavye açılmaz) */
export function NumPad({ unit, onSubmit, disabled, label = 'Kontrol et' }: { unit?: string; onSubmit: (n: number) => void; disabled?: boolean; label?: string }) {
  const [v, setV] = useState('')
  // Gönderildikten sonra yazılan ilk rakam eski cevabın yerine geçer
  const [fresh, setFresh] = useState(false)
  const press = (d: string) => {
    setV((c) => ((fresh ? '' : c) + d).replace(/^0+(?=\d)/, '').slice(0, 5))
    setFresh(false)
  }
  const key = 'grid h-14 place-items-center rounded-2xl bg-white text-2xl font-black text-ink shadow-[0_3px_0_#d9dbe8] ring-1 ring-line transition active:translate-y-[2px] active:shadow-none disabled:opacity-40'
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-line">
      <div className="mb-2 flex h-14 items-center justify-center gap-2 rounded-2xl bg-white text-3xl font-black tabular-nums ring-2 ring-sky-200" aria-live="polite">
        <span className={v ? (fresh ? 'text-ink-soft' : 'text-ink') : 'text-slate-300'}>{v || '?'}</span>
        {unit && <span className="text-lg text-ink-soft">{unit}</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" className={key} disabled={disabled} onClick={() => press(d)}>{d}</button>
        ))}
        <button type="button" className={key} disabled={disabled || !v} onClick={() => { setV((c) => (fresh ? '' : c.slice(0, -1))); setFresh(false) }} aria-label="Sil"><Delete size={22} /></button>
        <button type="button" className={key} disabled={disabled} onClick={() => press('0')}>0</button>
        <button type="button" disabled={disabled || !v} onClick={() => { setFresh(true); onSubmit(Number(v)) }} className="grid h-14 place-items-center rounded-2xl bg-emerald-500 text-white shadow-[0_3px_0_#047857] transition active:translate-y-[2px] active:shadow-none disabled:opacity-40" aria-label={label}>
          <Check size={26} strokeWidth={3} />
        </button>
      </div>
    </div>
  )
}

export function Stat({ label, value, tone = 'slate', wide }: { label: string; value: ReactNode; tone?: 'slate' | 'blue' | 'green' | 'amber' | 'red'; wide?: boolean }) {
  const c = {
    slate: 'bg-white text-ink ring-line',
    blue: 'bg-blue-50 text-blue-900 ring-blue-200',
    green: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-900 ring-amber-200',
    red: 'bg-rose-50 text-rose-900 ring-rose-200',
  }[tone]
  return (
    <div className={`rounded-2xl px-3 py-2 ring-1 ${c} ${wide ? 'col-span-2' : ''}`}>
      <p className="text-[11px] font-black tracking-wide uppercase opacity-70">{label}</p>
      <p className="text-xl leading-tight font-black tabular-nums">{value}</p>
    </div>
  )
}

/** Bulunan bir tasarımın küçük çizimi */
export function MiniRect({ r, size = 54, color = '#7fcb62' }: { r: Rect; size?: number; color?: string }) {
  const s = Math.min((size - 6) / r.w, (size - 6) / r.h, 9)
  const w = r.w * s, h = r.h * s
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0">
      <g transform={`translate(${(size - w) / 2} ${(size - h) / 2})`}>
        <rect width={w} height={h} rx={2} fill={color} stroke="#3f7d2f" strokeWidth={1.5} />
        {Array.from({ length: r.w - 1 }, (_, i) => <line key={`v${i}`} x1={(i + 1) * s} x2={(i + 1) * s} y1={0} y2={h} stroke="#fff" strokeOpacity={0.6} />)}
        {Array.from({ length: r.h - 1 }, (_, i) => <line key={`h${i}`} y1={(i + 1) * s} y2={(i + 1) * s} x1={0} x2={w} stroke="#fff" strokeOpacity={0.6} />)}
      </g>
    </svg>
  )
}

export function DesignCard({ r, unitA, extra, onClick, state = 'idle', showArea = true, showPerim = true }: { r: Rect; unitA: string; extra?: string; onClick?: () => void; state?: 'idle' | 'best' | 'picked' | 'wrong'; showArea?: boolean; showPerim?: boolean }) {
  const ring = state === 'best' ? 'ring-2 ring-emerald-500 bg-emerald-50' : state === 'picked' ? 'ring-2 ring-sky-500 bg-sky-50' : state === 'wrong' ? 'ring-2 ring-amber-400 bg-amber-50 animate-shake' : 'ring-1 ring-line bg-white'
  const body = (
    <>
      <MiniRect r={r} />
      <span className="min-w-0 text-left">
        <span className="block text-base leading-tight font-black">{r.w} × {r.h}</span>
        <span className="block text-xs font-bold text-ink-soft">{[showPerim && `Ç ${perim(r)} m`, showArea && `A ${area(r)} ${unitA}`].filter(Boolean).join(' · ') || 'Hangisi?'}</span>
        {extra && <span className="block text-xs font-bold text-ink-soft">{extra}</span>}
      </span>
    </>
  )
  return onClick ? (
    <button type="button" onClick={onClick} className={`flex min-h-16 items-center gap-2 rounded-2xl p-2 transition active:scale-[0.97] ${ring}`}>{body}</button>
  ) : (
    <div className={`flex items-center gap-2 rounded-2xl p-2 animate-pop ${ring}`}>{body}</div>
  )
}
