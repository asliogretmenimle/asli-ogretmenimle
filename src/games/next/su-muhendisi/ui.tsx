import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Delete } from 'lucide-react'
import { MathText } from '../../../components/MathText'
import type { Anim } from './art'
import type { VesselDef } from './water'

/* ───────────── Su benzetimi ───────────── */

const DUR = { pour: 1.9, fill: 1.0, drain: 0.9 }

/** Kapların mantıksal durumu + dökme/doldurma/boşaltma animasyonları */
export function useWater(initial: VesselDef[]) {
  const [vs, setVs] = useState(initial)
  const [anim, setAnimState] = useState<Anim | null>(null)
  const [run, setRun] = useState(0)
  const done = useRef<(() => void) | null>(null)
  const animRef = useRef<Anim | null>(null)
  const vsRef = useRef(vs)
  vsRef.current = vs
  const setAnim = (a: Anim | null) => {
    animRef.current = a
    setAnimState(a)
  }
  const start = (a: Anim) => {
    setAnim(a)
    setRun((r) => r + 1)
  }

  useEffect(() => {
    if (!animRef.current) return
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000))
      last = now
      const a = animRef.current
      if (!a) return
      const nt = a.t + dt / DUR[a.kind]
      if (nt >= 1) {
        setAnim(null)
        const cb = done.current
        done.current = null
        cb?.()
        return
      }
      setAnim({ ...a, t: nt })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [run]) // eslint-disable-line react-hooks/exhaustive-deps

  const amounts: Record<string, number> = {}
  for (const v of vs) amounts[v.id] = v.amt
  // görüntülenen miktarlar: animasyon sırasında ara değer
  if (anim) {
    const p = anim.kind === 'pour' ? Math.max(0, Math.min(1, (anim.t - 0.42) / 0.36)) : Math.max(0, Math.min(1, anim.t / 0.9))
    for (const id of Object.keys(anim.a1)) amounts[id] = anim.a0[id] + (anim.a1[id] - anim.a0[id]) * p
  }

  const get = (id: string) => vsRef.current.find((v) => v.id === id)!

  /** A'dan B'ye dök: A boşalana ya da B dolana kadar. Aktarılan miktarı döner. */
  const pour = useCallback(
    (from: string, to: string, cb?: (q: number) => void) => {
      if (animRef.current) return 0
      const a = vsRef.current.find((v) => v.id === from)!, b = vsRef.current.find((v) => v.id === to)!
      const q = Math.min(a.amt, b.cap - b.amt)
      if (q <= 0) return 0
      start({ kind: 'pour', from, to, t: 0, a0: { [from]: a.amt, [to]: b.amt }, a1: { [from]: a.amt - q, [to]: b.amt + q } })
      vsRef.current = vsRef.current.map((v) => (v.id === from ? { ...v, amt: v.amt - q } : v.id === to ? { ...v, amt: v.amt + q } : v))
      setVs(vsRef.current)
      done.current = () => cb?.(q)
      return q
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const fill = useCallback(
    (id: string, cb?: () => void, to?: number) => {
      if (animRef.current) return false
      const a = vsRef.current.find((v) => v.id === id)!
      const target = to ?? a.cap
      if (a.amt === target) return false
      start({ kind: 'fill', id, t: 0, a0: { [id]: a.amt }, a1: { [id]: target } })
      vsRef.current = vsRef.current.map((v) => (v.id === id ? { ...v, amt: target } : v))
      setVs(vsRef.current)
      done.current = () => cb?.()
      return true
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const drain = useCallback(
    (id: string, cb?: () => void) => {
      if (animRef.current) return false
      const a = vsRef.current.find((v) => v.id === id)!
      if (a.amt <= 0) return false
      start({ kind: 'drain', id, t: 0, a0: { [id]: a.amt }, a1: { [id]: 0 } })
      vsRef.current = vsRef.current.map((v) => (v.id === id ? { ...v, amt: 0 } : v))
      setVs(vsRef.current)
      done.current = () => cb?.()
      return true
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const setAmt = useCallback((id: string, amt: number) => {
    vsRef.current = vsRef.current.map((v) => (v.id === id ? { ...v, amt } : v))
    setVs(vsRef.current)
  }, [])
  const reset = useCallback((list: VesselDef[]) => {
    setAnim(null)
    done.current = null
    vsRef.current = list
    setVs(list)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { vs, amounts, anim, busy: !!anim, get, pour, fill, drain, setAmt, reset }
}

/** Basılı tutulan bir düğme için tekrarlayan rAF döngüsü (vana) */
export function useHold(onTick: (dt: number) => void) {
  const [on, setOn] = useState(false)
  const cb = useRef(onTick)
  cb.current = onTick
  useEffect(() => {
    if (!on) return
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000))
      last = now
      cb.current(dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [on])
  return [on, setOn] as const
}

/* ───────────── Tuş takımları (tablette klavye açılmaz) ───────────── */

const KEY = 'grid h-14 place-items-center rounded-2xl bg-white text-2xl font-black text-ink shadow-[0_3px_0_#d9dbe8] ring-1 ring-line transition active:translate-y-[2px] active:shadow-none disabled:opacity-40'
const OK = 'grid h-14 place-items-center rounded-2xl bg-emerald-500 text-white shadow-[0_3px_0_#047857] transition active:translate-y-[2px] active:shadow-none disabled:opacity-40'

/** Sayı tuş takımı; decimal ise virgül tuşu, unit ise birim; prefix (%) başa yazılır */
export function NumPad({ unit, prefix, decimal, onSubmit, label = 'Kontrol et' }: { unit?: string; prefix?: string; decimal?: boolean; onSubmit: (n: number) => void; label?: string }) {
  const [v, setV] = useState('')
  const [fresh, setFresh] = useState(false)
  const press = (d: string) => {
    setV((c0) => {
      const c = fresh ? '' : c0
      if (d === ',' && (c.includes(',') || !c)) return c || '0,'
      const n = (c + d).replace(/^0+(?=\d)/, '')
      return n.length > 6 ? c : n
    })
    setFresh(false)
  }
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-line">
      <div className="mb-2 flex h-14 items-center justify-center gap-1.5 rounded-2xl bg-white text-3xl font-black tabular-nums ring-2 ring-sky-200" aria-live="polite">
        {prefix && <span className="text-2xl text-ink-soft">{prefix}</span>}
        <span className={v ? (fresh ? 'text-ink-soft' : 'text-ink') : 'text-slate-300'}>{v || '?'}</span>
        {unit && <span className="text-lg text-ink-soft">{unit}</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" className={KEY} onClick={() => press(d)}>{d}</button>
        ))}
        {decimal ? (
          <button type="button" className={KEY} onClick={() => press(',')} aria-label="Virgül">,</button>
        ) : (
          <button type="button" className={KEY} disabled={!v} onClick={() => { setV((c) => (fresh ? '' : c.slice(0, -1))); setFresh(false) }} aria-label="Sil"><Delete size={22} /></button>
        )}
        <button type="button" className={KEY} onClick={() => press('0')}>0</button>
        <button type="button" disabled={!v || v.endsWith(',')} onClick={() => { setFresh(true); onSubmit(Number(v.replace(',', '.'))) }} className={OK} aria-label={label}>
          <Check size={26} strokeWidth={3} />
        </button>
        {decimal && (
          <button type="button" className={`${KEY} col-span-3 h-11 text-base`} disabled={!v} onClick={() => { setV((c) => (fresh ? '' : c.slice(0, -1))); setFresh(false) }} aria-label="Sil"><Delete size={20} /></button>
        )}
      </div>
    </div>
  )
}

/** Kesir tuş takımı: pay ve payda kutuları */
export function FracPad({ onSubmit }: { onSubmit: (n: number, d: number) => void }) {
  const [num, setNum] = useState('')
  const [den, setDen] = useState('')
  const [focus, setFocus] = useState<'n' | 'd'>('n')
  const press = (k: string) => {
    if (focus === 'n') {
      setNum((c) => (c + k).replace(/^0+(?=\d)/, '').slice(0, 3))
    } else setDen((c) => (c + k).replace(/^0+(?=\d)/, '').slice(0, 3))
  }
  const del = () => (focus === 'n' ? setNum((c) => c.slice(0, -1)) : setDen((c) => c.slice(0, -1)))
  const box = (f: 'n' | 'd', val: string) => (
    <button type="button" onClick={() => setFocus(f)} className={`grid h-12 w-20 place-items-center rounded-xl text-3xl font-black tabular-nums ring-2 transition ${focus === f ? 'bg-sky-50 ring-sky-500' : 'bg-white ring-line'}`} aria-label={f === 'n' ? 'Pay' : 'Payda'}>
      <span className={val ? 'text-ink' : 'text-slate-300'}>{val || '?'}</span>
    </button>
  )
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-line">
      <div className="mb-2 flex items-center justify-center gap-4 rounded-2xl bg-white py-2 ring-2 ring-sky-200">
        <div className="flex flex-col items-center gap-1">
          {box('n', num)}
          <span className="h-1 w-24 rounded-full bg-ink" />
          {box('d', den)}
        </div>
        <p className="max-w-[7rem] text-xs font-bold text-ink-soft">Kutuya dokun, sonra rakama bas.</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" className={KEY} onClick={() => { press(d); if (focus === 'n') setFocus('d') }}>{d}</button>
        ))}
        <button type="button" className={KEY} onClick={del} aria-label="Sil"><Delete size={22} /></button>
        <button type="button" className={KEY} onClick={() => press('0')}>0</button>
        <button type="button" className={OK} disabled={!num || !den || Number(den) === 0} onClick={() => { onSubmit(Number(num), Number(den)); setFocus('n') }} aria-label="Kontrol et">
          <Check size={26} strokeWidth={3} />
        </button>
      </div>
    </div>
  )
}

/** Seçenek düğmeleri (3. sınıf: bütün / yarım / çeyrek) */
export function ChoicePad({ options, onPick, big }: { options: string[]; onPick: (i: number) => void; big?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o, i) => (
        <button key={o} type="button" onClick={() => onPick(i)} className={`${big ? 'min-h-14 text-lg' : 'min-h-12 text-base'} rounded-2xl bg-white px-3 font-black text-sky-950 shadow-[0_3px_0_#bae6fd] ring-1 ring-sky-200 transition active:translate-y-[2px] active:shadow-none`}>
          <MathText text={o} />
        </button>
      ))}
    </div>
  )
}

export function Stat({ label, value, tone = 'slate', wide }: { label: string; value: ReactNode; tone?: 'slate' | 'blue' | 'green' | 'amber'; wide?: boolean }) {
  const c = { slate: 'bg-white text-ink ring-line', blue: 'bg-sky-50 text-sky-950 ring-sky-200', green: 'bg-emerald-50 text-emerald-900 ring-emerald-200', amber: 'bg-amber-50 text-amber-900 ring-amber-200' }[tone]
  return (
    <div className={`rounded-2xl px-3 py-2 ring-1 ${c} ${wide ? 'col-span-2' : ''}`}>
      <p className="text-[11px] font-black tracking-wide uppercase opacity-70">{label}</p>
      <div className="text-xl leading-tight font-black tabular-nums">{typeof value === 'string' ? <MathText text={value} /> : value}</div>
    </div>
  )
}

/** Panel düğmesi (≥ 48 px) */
export function PanelButton({ children, onClick, disabled, tone = 'white', className = '', big, onPointerDown, onPointerUp }: { children: ReactNode; onClick?: () => void; disabled?: boolean; tone?: 'white' | 'sky' | 'amber' | 'rose' | 'green'; className?: string; big?: boolean; onPointerDown?: () => void; onPointerUp?: () => void }) {
  const c = { white: 'bg-white text-ink ring-line', sky: 'bg-sky-600 text-white ring-sky-700 shadow-[0_3px_0_#075985]', amber: 'bg-amber-50 text-amber-900 ring-amber-200', rose: 'bg-rose-50 text-rose-900 ring-rose-200', green: 'bg-emerald-50 text-emerald-900 ring-emerald-200' }[tone]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(e) => onPointerDown && e.preventDefault()}
      style={onPointerDown ? { touchAction: 'none' } : undefined}
      className={`inline-flex ${big ? 'min-h-14 text-lg' : 'min-h-12'} items-center justify-center gap-1.5 rounded-2xl px-3 font-extrabold ring-1 transition select-none active:scale-[0.97] disabled:opacity-40 ${c} ${className}`}
    >
      {children}
    </button>
  )
}
