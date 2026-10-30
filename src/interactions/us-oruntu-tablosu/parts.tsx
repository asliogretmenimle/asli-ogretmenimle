import { useEffect, useRef, type ReactNode } from 'react'
import { Check, Delete } from 'lucide-react'
import { MathText } from '../../components/MathText'
import { useWidth } from '../../games/kit'
import { baseStr, expr, fmtVal, inputMath, key, power, type RowSpec } from './model'

/**
 * Kuvvetler tablosu ve değer tuş takımı.
 * Hücreler arasında “× taban” (sağa) ve “÷ taban” (sola) okları öğrenci keşfettikçe belirir.
 */

export type CellState = 'given' | 'blank' | 'ok'

export function PowerTable({ rows, state, selected, onSelect, arrows, wrong, small }: {
  rows: RowSpec[]
  state: (b: number, e: number) => CellState
  selected?: string | null
  onSelect?: (b: number, e: number) => void
  arrows: { right: boolean; left: boolean }
  /** Son yanlış denemenin yapıldığı hücre */
  wrong?: string | null
  small?: boolean
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const n = Math.max(...rows.map((r) => r.exps.length))
  const label = small ? 48 : 56
  // Hücre ve ok genişliği tabloya sığacak biçimde ayarlanır; telefonda yatay kaydırma kalır
  const fit = (cw: number) => Math.floor((width - label - 8 - 16 - (n - 1) * cw) / n)
  const cw = fit(34) >= 66 ? 34 : 24
  const cell = Math.max(small ? 46 : 52, Math.min(small ? 64 : 80, fit(cw)))
  return (
    <div ref={ref} className="-mx-2 overflow-x-auto px-2 py-2 [scrollbar-width:thin]">
      <div className="flex w-max flex-col gap-3">
        {rows.map((r) => (
          <div key={r.base} className="flex items-stretch">
            <div className="mr-2 flex shrink-0 flex-col items-center justify-center rounded-xl bg-slate-700/70 px-1 text-slate-200 ring-1 ring-slate-600" style={{ width: label }}>
              <span className="text-[10px] font-black tracking-wide uppercase opacity-70">Taban</span>
              <span className="text-lg font-black">{baseStr(r.base)}</span>
            </div>
            {r.exps.map((e, i) => {
              const k = key(r.base, e)
              const st = state(r.base, e)
              const v = power(r.base, e)
              return (
                <div key={e} className="flex items-stretch">
                  {i > 0 && <Connector base={r.base} right={arrows.right} left={arrows.left} width={cw} />}
                  <Cell b={r.base} e={e} st={st} sel={selected === k} wrong={wrong === k} width={cell} small={small} onSelect={onSelect} value={fmtVal(v, !!r.decimal)} />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function Cell({ b, e, st, sel, wrong, width, small, onSelect, value }: { b: number; e: number; st: CellState; sel: boolean; wrong: boolean; width: number; small?: boolean; onSelect?: (b: number, e: number) => void; value: string }) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (sel) ref.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [sel])
  return (
    <button
      ref={ref}
      type="button"
      disabled={st !== 'blank' || !onSelect}
      onClick={() => onSelect?.(b, e)}
      aria-label={`${expr(b, e)}${st === 'blank' ? ': boş kutu' : ''}`}
      aria-pressed={sel}
      className={`flex shrink-0 flex-col items-center justify-center rounded-2xl transition ${small ? 'h-16' : 'h-[84px]'} ${
        st === 'given'
          ? 'bg-slate-100 text-ink ring-1 ring-slate-300'
          : st === 'ok'
            ? 'bg-emerald-50 text-emerald-900 ring-2 ring-emerald-400 animate-pop'
            : sel
              ? 'bg-pink-50 text-ink ring-4 ring-pink-500 shadow-[0_0_0_6px_#db277740]'
              : wrong
                ? 'bg-amber-50 text-ink ring-2 ring-amber-400'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
      }`}
      style={{ width, ...(st === 'blank' && !sel && !wrong ? { outline: '2px dashed #94a3b8', outlineOffset: -6 } : {}) }}
    >
      <span className={`font-black ${small ? 'text-xs' : 'text-sm'} ${st === 'blank' && !sel ? 'text-slate-300' : 'text-slate-500'}`}>{expr(b, e)}</span>
      <span className={`leading-tight font-black ${small || width < 64 ? 'text-base' : 'text-lg sm:text-xl'}`}>
        {st === 'blank' ? <span className={sel ? 'text-pink-500' : 'text-slate-400'}>?</span> : <MathText text={value} />}
      </span>
    </button>
  )
}

function Connector({ base, right, left, width }: { base: number; right: boolean; left: boolean; width: number }) {
  const b = base < 0 ? `(−${-base})` : String(base)
  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-1 text-[10px] font-black" style={{ width }} aria-hidden>
      <span className={`whitespace-nowrap text-sky-300 transition ${right ? 'opacity-100' : 'opacity-0'}`}>×{b}<br />→</span>
      <span className={`whitespace-nowrap text-amber-300 transition ${left ? 'opacity-100' : 'opacity-0'}`}>←<br />÷{b}</span>
    </div>
  )
}

/** Tam sayı, ondalık ve kesir yazılabilen tuş takımı */
export function ValuePad({ value, onChange, onSubmit, label, frac = true, comma = true, sign = true, prefix }: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  label?: string
  frac?: boolean
  comma?: boolean
  sign?: boolean
  /** Göstergenin solundaki metin (MathText), ör. "3,4 · 10^{" */
  prefix?: ReactNode
}) {
  const press = (k: string) => {
    if (k === '⌫') return onChange(value.slice(0, -1))
    if (k === '±') return onChange(value.startsWith('−') ? value.slice(1) : '−' + value)
    if (k === '/') {
      if (!frac || value.includes('/') || value.includes(',') || !/\d$/.test(value)) return
      return onChange(value + '/')
    }
    if (k === ',') {
      if (!comma || value.includes(',') || value.includes('/')) return
      return onChange((/\d$/.test(value) ? value : value + '0') + ',')
    }
    if (value.replace(/[^\d]/g, '').length >= 8) return
    onChange(value === '0' ? k : value === '−0' ? '−' + k : value + k)
  }
  const keys = ['1', '2', '3', '⌫', '4', '5', '6', frac ? '/' : '', '7', '8', '9', comma ? ',' : '', sign ? '±' : '', '0']
  const shown = inputMath(value)
  return (
    <div className="rounded-2xl bg-slate-50 p-2 ring-1 ring-line">
      <div className="mb-2 flex min-h-16 items-center gap-2 rounded-xl bg-white px-3 ring-2 ring-pink-500/60">
        {label && <span data-pad-label={label} className="shrink-0 text-sm font-extrabold text-ink-soft"><MathText text={label} /></span>}
        <span className="ml-auto flex items-center gap-1 text-2xl font-black text-ink tabular-nums sm:text-3xl">
          {prefix}
          {value ? <MathText text={shown} /> : <span className="text-slate-300">?</span>}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {keys.map((k, i) =>
          k ? (
            <button key={i} type="button" onClick={() => press(k)} className={`grid h-12 place-items-center rounded-xl text-xl font-black ring-1 ring-line active:scale-95 ${k === '⌫' ? 'bg-slate-200 text-ink' : k === '/' ? 'bg-sky-50 text-sky-800' : 'bg-white text-ink hover:bg-pink-50'}`} aria-label={k === '⌫' ? 'Sil' : k === '±' ? 'İşaret değiştir' : k === '/' ? 'Kesir çizgisi' : k}>
              {k === '⌫' ? <Delete size={20} /> : k === '/' ? <span className="text-base leading-none">a/b</span> : k}
            </button>
          ) : (
            <span key={i} />
          ),
        )}
        <button type="button" onClick={onSubmit} disabled={!value || /[/,−]$/.test(value)} className="col-span-2 grid h-12 place-items-center rounded-xl bg-pink-600 text-lg font-black text-white shadow-[0_3px_0_#9d174d] active:scale-95 disabled:opacity-40" aria-label="Yaz">
          <span className="flex items-center gap-1"><Check size={20} strokeWidth={3} />Yaz</span>
        </button>
      </div>
    </div>
  )
}
