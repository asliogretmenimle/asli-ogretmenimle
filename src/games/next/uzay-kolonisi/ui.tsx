import { useState, type ReactNode } from 'react'
import { Check, Delete } from 'lucide-react'
import { MathText } from '../../../components/MathText'

/** Koyu uzay paneli */
export const card = 'rounded-2xl bg-slate-900/70 p-3 ring-1 ring-white/10 backdrop-blur-sm'

/**
 * Dokunmatik sayı tuş takımı (tablette klavye açılmaz). Ondalık virgül ve eksi işareti isteğe bağlı.
 * Gönderildikten sonra basılan ilk tuş eski cevabın yerine yeni bir cevap başlatır.
 */
export function NumPad({ unit, onSubmit, decimal, negative, label = 'Kontrol et' }: { unit?: string; onSubmit: (n: number) => void; decimal?: boolean; negative?: boolean; label?: string }) {
  const [v, setV] = useState('')
  const [fresh, setFresh] = useState(false)
  const base = fresh ? '' : v
  const press = (d: string) => {
    let s = base
    if (d === ',') {
      if (s.includes(',')) return
      s = (s === '' || s === '−' ? s + '0' : s) + ','
    } else if (d === '±') {
      s = s.startsWith('−') ? s.slice(1) : '−' + s
    } else {
      const body = (s.startsWith('−') ? s.slice(1) : s) + d
      const clean = body.replace(/^0+(?=\d)/, '')
      if (clean.replace(',', '').length > 6) return
      s = (s.startsWith('−') ? '−' : '') + clean
    }
    setV(s)
    setFresh(false)
  }
  const back = () => {
    setV(fresh ? '' : v.slice(0, -1))
    setFresh(false)
  }
  const parsed = Number(v.replace('−', '-').replace(',', '.'))
  const valid = v !== '' && v !== '−' && !v.endsWith(',') && Number.isFinite(parsed)
  const key = 'grid h-14 place-items-center rounded-2xl bg-slate-700/80 text-2xl font-black text-white shadow-[0_3px_0_#0f172a] ring-1 ring-white/10 transition active:translate-y-[2px] active:shadow-none disabled:opacity-30'
  return (
    <div className="rounded-2xl bg-slate-950/60 p-3 ring-1 ring-white/10">
      <div className="mb-2 flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-900 text-3xl font-black tabular-nums ring-2 ring-cyan-400/40" aria-live="polite">
        <span className={v ? (fresh ? 'text-slate-500' : 'text-white') : 'text-slate-600'}>{v || '?'}</span>
        {unit && <span className="text-lg text-slate-400">{unit}</span>}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {['7', '8', '9'].map((d) => <button key={d} type="button" className={key} onClick={() => press(d)}>{d}</button>)}
        <button type="button" className={key} disabled={!v} onClick={back} aria-label="Sil"><Delete size={22} /></button>
        {['4', '5', '6'].map((d) => <button key={d} type="button" className={key} onClick={() => press(d)}>{d}</button>)}
        <button type="button" className={key} disabled={!decimal} onClick={() => press(',')} aria-label="Virgül">{decimal ? ',' : ''}</button>
        {['1', '2', '3'].map((d) => <button key={d} type="button" className={key} onClick={() => press(d)}>{d}</button>)}
        <button type="button" className={key} disabled={!negative} onClick={() => press('±')} aria-label="Eksi işareti">{negative ? '±' : ''}</button>
        <button type="button" className={`${key} col-span-2`} onClick={() => press('0')}>0</button>
        <button type="button" disabled={!valid} onClick={() => { setFresh(true); onSubmit(parsed) }} className="col-span-2 flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-500 font-black text-white shadow-[0_3px_0_#047857] transition active:translate-y-[2px] active:shadow-none disabled:opacity-40" aria-label={label}>
          <Check size={24} strokeWidth={3} />{label}
        </button>
      </div>
    </div>
  )
}

export function Stat({ label, value, tone = 'slate', wide }: { label: string; value: ReactNode; tone?: 'slate' | 'cyan' | 'green' | 'amber' | 'red' | 'violet'; wide?: boolean }) {
  const c = {
    slate: 'bg-slate-800/80 text-white ring-white/10',
    cyan: 'bg-cyan-500/15 text-cyan-100 ring-cyan-400/30',
    green: 'bg-emerald-500/15 text-emerald-100 ring-emerald-400/30',
    amber: 'bg-amber-500/15 text-amber-100 ring-amber-400/30',
    red: 'bg-rose-500/15 text-rose-100 ring-rose-400/30',
    violet: 'bg-violet-500/15 text-violet-100 ring-violet-400/30',
  }[tone]
  return (
    <div className={`rounded-2xl px-3 py-2 ring-1 ${c} ${wide ? 'col-span-2' : ''}`}>
      <p className="text-[11px] font-black tracking-wide uppercase opacity-70">{label}</p>
      <p className="text-xl leading-tight font-black tabular-nums">{value}</p>
    </div>
  )
}

/** Tek seçimlik soru */
export function ChoiceAsk({ q, options, onPick, picked }: { q: string; options: string[]; onPick: (i: number) => void; picked: number[] }) {
  return (
    <div className={`${card} animate-fade-up`}>
      <p className="mb-2 text-base font-black text-white"><MathText text={q} /></p>
      <div className="flex flex-col gap-2">
        {options.map((o, i) => (
          <button key={o} type="button" onClick={() => onPick(i)} className={`min-h-12 rounded-xl px-3 py-2 text-left font-extrabold ring-1 transition active:scale-[0.98] ${picked.includes(i) ? 'bg-amber-400/20 text-amber-100 ring-amber-300/60' : 'bg-slate-800 text-white ring-white/15 hover:bg-slate-700'}`}>
            <MathText text={o} />
          </button>
        ))}
      </div>
    </div>
  )
}

/** Çok seçimlik soru: doğru olanların hepsi seçilmeli */
export function MultiAsk({ q, options, onCheck }: { q: string; options: string[]; onCheck: (sel: number[]) => void }) {
  const [sel, setSel] = useState<number[]>([])
  const toggle = (i: number) => setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))
  return (
    <div className={`${card} animate-fade-up`}>
      <p className="mb-2 text-base font-black text-white"><MathText text={q} /></p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o, i) => (
          <button key={o} type="button" onClick={() => toggle(i)} aria-pressed={sel.includes(i)} className={`flex min-h-14 items-center justify-center gap-2 rounded-xl px-2 text-lg font-black ring-2 transition active:scale-95 ${sel.includes(i) ? 'bg-cyan-400/25 text-white ring-cyan-300' : 'bg-slate-800 text-slate-100 ring-white/10'}`}>
            {sel.includes(i) && <Check size={18} strokeWidth={3} className="text-cyan-300" />}
            <MathText text={o} />
          </button>
        ))}
      </div>
      <button type="button" disabled={!sel.length} onClick={() => onCheck(sel)} className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 font-black text-white shadow-[0_3px_0_#047857] active:translate-y-[2px] active:shadow-none disabled:opacity-40">
        <Check size={20} strokeWidth={3} />Kontrol et
      </button>
    </div>
  )
}

/** Küçük, dokunmaya uygun ikincil düğme */
export function SoftButton({ children, onClick, disabled, tone = 'slate', className = '' }: { children: ReactNode; onClick: () => void; disabled?: boolean; tone?: 'slate' | 'amber' | 'cyan'; className?: string }) {
  const c = { slate: 'bg-slate-800 text-white ring-white/15', amber: 'bg-amber-400/15 text-amber-100 ring-amber-300/40', cyan: 'bg-cyan-400/15 text-cyan-50 ring-cyan-300/40' }[tone]
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 font-extrabold ring-1 transition active:scale-[0.97] disabled:opacity-40 ${c} ${className}`}>
      {children}
    </button>
  )
}
