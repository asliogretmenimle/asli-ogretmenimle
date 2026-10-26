import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, Delete, HelpCircle, Pin } from 'lucide-react'
import type { Grade, ManipulativeConfig, ManipulativeTool } from '../../../data/types'
import { ek } from '../../../lib/generators'
import { MathText } from '../../../components/MathText'

/* ───────────── Renk paleti (açık: 5–6. sınıf, koyu gösterge paneli: 7. sınıf) ───────────── */

export interface Ink {
  dark: boolean
  text: string
  soft: string
  grid: string
  axis: string
  surface: string
  panel: string
  accent: string
}
export const inkFor = (dark: boolean): Ink =>
  dark
    ? { dark, text: '#e2e8f0', soft: '#94a3b8', grid: '#273449', axis: '#cbd5e1', surface: '#0b1324', panel: '#111c33', accent: '#22d3ee' }
    : { dark, text: '#1f2340', soft: '#5b6080', grid: '#e3e8f0', axis: '#1f2340', surface: '#ffffff', panel: '#f8fafc', accent: '#0891b2' }

export const MEAN = '#db2777'
export const MEDIAN = '#0d9488'

/* ───────────── Sayı ve ek yazımı ───────────── */

/** Türkçe sayı: ondalık virgül, gerçek eksi işareti (−) */
export const f = (v: number, d = 2) => {
  const r = Math.round(v * 10 ** d) / 10 ** d
  return (Object.is(r, -0) ? 0 : r).toLocaleString('tr-TR', { maximumFractionDigits: d }).replace('-', '−')
}
/** −3 °C */
export const deg = (v: number) => `${f(v)}\u00a0°C`
/** Değişim: +8, −5 */
export const chg = (v: number) => (v > 0 ? `+${f(v)}` : f(v))

type Kind = 'acc' | 'dat' | 'abl' | 'loc' | 'gen' | 'poss' | 'dist'
/** Negatif ve ondalık sayılar için ekli yazım: −3’ten, 5’e, 4,5’e */
export function ekS(n: number, kind: Kind): string {
  if (Number.isInteger(n)) return f(n) + ek(Math.abs(n), kind, false)
  const frac = f(Math.abs(n)).split(',')[1] ?? '0'
  return f(n) + ek(Number(frac), kind, false)
}

export const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)]
export const rint = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
export function shuffle<T>(a: readonly T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}
export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
export const meanOf = (a: number[]) => sum(a) / a.length
export const medianOf = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/* ───────────── Görev API’si ───────────── */

export interface NudgeOpts {
  misc?: string
  tool?: ManipulativeTool
  toolConfig?: ManipulativeConfig
  toolTitle?: string
  tone?: 'ok' | 'think'
}
export interface Api {
  grade: Grade
  ink: Ink
  dark: boolean
  /** Her kontrol: rapora deneme olarak yazılır */
  check: (ok: boolean) => void
  /** Düşündüren soru (yanlışta) ya da kısa onay */
  nudge: (q: string, o?: NudgeOpts) => void
  clear: () => void
  /** Yeni bir geçerli çözüm/yol: yeni ise true */
  found: (key: string, label: string) => boolean
  strategy: (s: string) => void
  /** İstasyon ekranındaki mesaj */
  say: (t: string) => void
  /** Görevin zorunlu kısmı bitti */
  complete: () => void
}

/** Kabın genişliği — ilk boyamadan önce ölçülür */
export function useW<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(340)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth || 340)
    const ro = new ResizeObserver(() => el.clientWidth && setW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/** Koşul ilk kez doğru olunca bir kez çağırır */
export function useOnce(cond: boolean, cb: () => void) {
  const fired = useRef(false)
  const cbRef = useRef(cb)
  cbRef.current = cb
  useEffect(() => {
    if (cond && !fired.current) {
      fired.current = true
      cbRef.current()
    }
  }, [cond])
}

/* ───────────── Küçük parçalar ───────────── */

export function Chip({ ink, tone = 'plain', children }: { ink: Ink; tone?: 'plain' | 'warn' | 'ok' | 'mean' | 'median' | 'info'; children: ReactNode }) {
  const c = {
    plain: ink.dark ? 'bg-slate-700/80 text-slate-100' : 'bg-slate-100 text-ink',
    warn: ink.dark ? 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/40' : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200',
    ok: ink.dark ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/40' : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200',
    mean: ink.dark ? 'bg-pink-500/15 text-pink-200 ring-1 ring-pink-400/40' : 'bg-pink-50 text-pink-800 ring-1 ring-pink-200',
    median: ink.dark ? 'bg-teal-500/15 text-teal-200 ring-1 ring-teal-400/40' : 'bg-teal-50 text-teal-800 ring-1 ring-teal-200',
    info: ink.dark ? 'bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-400/40' : 'bg-cyan-50 text-cyan-900 ring-1 ring-cyan-200',
  }[tone]
  return <span className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-1 text-sm font-extrabold ${c}`}>{children}</span>
}

export function ToolBtn({ ink, onClick, children, active, disabled, label, className = '' }: { ink: Ink; onClick: () => void; children: ReactNode; active?: boolean; disabled?: boolean; label?: string; className?: string }) {
  const cls = active
    ? ink.dark ? 'bg-cyan-500 text-slate-950 ring-cyan-400' : 'bg-cyan-600 text-white ring-cyan-600'
    : ink.dark
      ? 'bg-slate-800 text-slate-100 ring-slate-600 hover:bg-slate-700'
      : 'bg-white text-ink ring-line hover:bg-sky-50'
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} aria-pressed={active} className={`inline-flex min-h-12 min-w-12 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-extrabold ring-1 transition active:scale-95 disabled:opacity-40 ${cls} ${className}`}>
      {children}
    </button>
  )
}

/** Görev içi kart (grafik, tablo, soru) */
export function Panel({ ink, title, children, className = '', right }: { ink: Ink; title?: ReactNode; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <div className={`rounded-2xl p-2.5 sm:p-3 ${className}`} style={{ background: ink.surface, boxShadow: ink.dark ? 'inset 0 0 0 1px #24324a, 0 0 0 1px #0006' : 'inset 0 0 0 1px #e3e8f0, 0 1px 2px #0f172a0d' }}>
      {(title || right) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1.5">
          {title && <p className="text-sm font-black" style={{ color: ink.text }}>{title}</p>}
          {right}
        </div>
      )}
      {children}
    </div>
  )
}

export function PrimaryBtn({ onClick, children, disabled, className = '' }: { onClick: () => void; children: ReactNode; disabled?: boolean; className?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`btn-primary min-h-12 ${className}`}>
      {children}
    </button>
  )
}

/** Basit veri tablosu */
export function DataTable({ ink, head, rows, hl }: { ink: Ink; head: ReactNode[]; rows: ReactNode[][]; hl?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-0 text-[14px] font-extrabold tabular-nums" style={{ color: ink.text }}>
        <thead>
          <tr>{head.map((h, i) => <th key={i} className={`px-2 pb-1 text-xs font-black tracking-wide uppercase opacity-70 ${i ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={hl === i ? (ink.dark ? 'bg-cyan-500/15' : 'bg-cyan-50') : i % 2 ? '' : ink.dark ? 'bg-white/[0.04]' : 'bg-slate-50'}>
              {r.map((c, k) => <td key={k} className={`px-2 py-1.5 ${k ? 'text-right' : 'text-left'}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Görev içindeki adım çizgisi: 1 Çiz → 2 Hesapla → 3 Karar ver */
export function StepBar({ ink, steps, at }: { ink: Ink; steps: string[]; at: number }) {
  return (
    <ol className="mb-2 flex flex-wrap items-center gap-1.5" aria-label="Adımlar">
      {steps.map((s, i) => {
        const state = i < at ? 'done' : i === at ? 'now' : 'next'
        const cls =
          state === 'done'
            ? ink.dark ? 'bg-emerald-500/15 text-emerald-200' : 'bg-emerald-50 text-emerald-800'
            : state === 'now'
              ? ink.dark ? 'bg-cyan-500 text-slate-950' : 'bg-cyan-600 text-white'
              : ink.dark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-400 ring-1 ring-line'
        return (
          <li key={s} className={`inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-xs font-black ${cls}`}>
            {state === 'done' ? <Check size={13} strokeWidth={3} /> : <span>{i + 1}</span>}
            {s}
          </li>
        )
      })}
    </ol>
  )
}

/* ───────────── Sayı tuş takımı (eksi işareti ve ondalık virgül destekli) ───────────── */

export function NumPad({ onSubmit, neg, dec, unit, ink, disabled, label = 'Kontrol' }: { onSubmit: (n: number) => void; neg?: boolean; dec?: boolean; unit?: string; ink: Ink; disabled?: boolean; label?: string }) {
  const [st, setSt] = useState({ s: '', minus: false, fresh: false })
  const press = (d: string) =>
    setSt((c) => {
      let base = c.fresh ? '' : c.s
      if (d === ',') {
        if (base.includes(',')) return c
        if (!base) base = '0'
      }
      let nx = (base + d).replace(/^0+(?=\d)/, '')
      if (nx.includes(',') && nx.split(',')[1].length > 2) return c
      nx = nx.slice(0, 6)
      return { s: nx, minus: c.fresh ? false : c.minus, fresh: false }
    })
  const toggleMinus = () => setSt((c) => (c.fresh ? { s: '', minus: true, fresh: false } : { ...c, minus: !c.minus }))
  const back = () => setSt((c) => (c.fresh ? { s: '', minus: false, fresh: false } : c.s ? { ...c, s: c.s.slice(0, -1) } : { ...c, minus: false }))
  const ready = !!st.s && st.s !== '0,' && !st.s.endsWith(',')
  const submit = () => {
    if (!ready) return
    const v = (st.minus ? -1 : 1) * Number(st.s.replace(',', '.'))
    setSt((c) => ({ ...c, fresh: true }))
    onSubmit(v)
  }
  const dark = ink.dark
  const key = `grid h-12 place-items-center rounded-xl text-2xl font-black transition active:translate-y-[2px] active:shadow-none disabled:opacity-40 sm:h-[52px] ${dark ? 'bg-slate-700 text-slate-50 shadow-[0_3px_0_#0f172a] ring-1 ring-slate-600' : 'bg-white text-ink shadow-[0_3px_0_#d9dbe8] ring-1 ring-line'}`
  const shown = (st.minus ? '−' : '') + (st.s || '')
  return (
    <div data-numpad className={`w-[272px] max-w-full rounded-2xl p-2.5 ${dark ? 'bg-slate-900 ring-1 ring-slate-700' : 'bg-slate-50 ring-1 ring-line'}`}>
      <div className={`mb-2 flex h-14 items-center justify-center gap-2 rounded-xl text-3xl font-black tabular-nums ${dark ? 'bg-[#06101f] ring-2 ring-cyan-500/50' : 'bg-white ring-2 ring-sky-200'}`} aria-live="polite" style={dark ? { fontFamily: 'ui-monospace, Menlo, monospace', color: '#67e8f9', textShadow: '0 0 10px #22d3ee66' } : undefined}>
        <span className={shown ? (st.fresh ? 'opacity-50' : '') : dark ? 'text-slate-600' : 'text-slate-300'}>{shown || '?'}</span>
        {unit && <span className={`text-lg ${dark ? 'text-slate-400' : 'text-ink-soft'}`}>{unit}</span>}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {['1', '2', '3'].map((d) => <button key={d} type="button" className={key} disabled={disabled} onClick={() => press(d)}>{d}</button>)}
        <button type="button" className={key} disabled={disabled || (!st.s && !st.minus)} onClick={back} aria-label="Sil"><Delete size={22} /></button>
        {['4', '5', '6'].map((d) => <button key={d} type="button" className={key} disabled={disabled} onClick={() => press(d)}>{d}</button>)}
        {neg ? <button type="button" className={`${key} ${st.minus && !st.fresh ? (dark ? '!bg-cyan-600' : '!bg-sky-100') : ''}`} disabled={disabled} onClick={toggleMinus} aria-label="Eksi işareti">−</button> : <span />}
        {['7', '8', '9'].map((d) => <button key={d} type="button" className={key} disabled={disabled} onClick={() => press(d)}>{d}</button>)}
        {dec ? <button type="button" className={key} disabled={disabled} onClick={() => press(',')} aria-label="Virgül">,</button> : <span />}
        <button type="button" className={`${key} col-span-2`} disabled={disabled} onClick={() => press('0')}>0</button>
        <button type="button" disabled={disabled || !ready} onClick={submit} className="col-span-2 grid h-12 place-items-center rounded-xl bg-emerald-500 text-white shadow-[0_3px_0_#047857] transition active:translate-y-[2px] active:shadow-none disabled:opacity-40 sm:h-[52px]" aria-label={label}>
          <span className="inline-flex items-center gap-1 text-[15px] font-black"><Check size={20} strokeWidth={3} />{label}</span>
        </button>
      </div>
    </div>
  )
}

export type Judge = (v: number) => true | ({ q: string } & Omit<NudgeOpts, 'tone'>)

/** Soru + tuş takımı. Doğruda onOk, yanlışta düşündüren soru. */
export function Ask({ api, q, judge, onOk, neg, dec, unit, side }: { api: Api; q: ReactNode; judge: Judge; onOk: (v: number) => void; neg?: boolean; dec?: boolean; unit?: string; side?: ReactNode }) {
  const [solved, setSolved] = useState<number | null>(null)
  const submit = (v: number) => {
    if (solved !== null) return
    const r = judge(v)
    if (r === true) {
      api.check(true)
      api.clear()
      setSolved(v)
      onOk(v)
    } else {
      api.check(false)
      api.nudge(r.q, r)
    }
  }
  return (
    <div className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <p className="text-base leading-snug font-black sm:text-lg" style={{ color: api.ink.text }}>{typeof q === 'string' ? <MathText text={q} /> : q}</p>
        {solved !== null && (
          <p className={`mt-2 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-black animate-pop ${api.dark ? 'bg-emerald-500/15 text-emerald-200' : 'bg-emerald-50 text-emerald-800'}`}><Check size={16} strokeWidth={3} />{f(solved)}{unit ? ` ${unit}` : ''}</p>
        )}
        {side}
      </div>
      <div className="mx-auto sm:mx-0">
        <NumPad ink={api.ink} neg={neg} dec={dec} unit={unit} onSubmit={submit} disabled={solved !== null} />
      </div>
    </div>
  )
}

/* ───────────── Kanıt panosu: sonuç seç, kanıt kartlarıyla gerekçelendir ───────────── */

export interface Opt {
  t: string
  ok: boolean
  /** Çözüm rozetindeki kısa ad */
  s?: string
  fb?: string
  misc?: string
}

export function EvidenceBoard({ api, keyPrefix, question, conclusions, cardsTitle = 'Kanıt kartları: sonucunu destekleyenlere dokun', cards, goal, onDone }: { api: Api; keyPrefix: string; question?: string; conclusions?: Opt[]; cardsTitle?: string; cards: Opt[]; goal: number; onDone: () => void }) {
  const [concl, setConcl] = useState<number | null>(conclusions ? null : -1)
  const [tried, setTried] = useState<number[]>([])
  const [okCards, setOkCards] = useState<number[]>([])
  const [badCards, setBadCards] = useState<number[]>([])
  useOnce(okCards.length >= goal, onDone)
  const ink = api.ink
  const dark = ink.dark
  const pickConcl = (i: number) => {
    if (concl !== null && concl >= 0) return
    const c = conclusions![i]
    if (c.ok) {
      api.check(true)
      api.clear()
      setConcl(i)
      api.say('Güçlü bir sonuç! Şimdi kanıtla.')
    } else {
      api.check(false)
      setTried((t) => [...t, i])
      api.nudge(c.fb ?? 'Bu sonuç verilerle destekleniyor mu? Grafiğe yeniden bak.', { misc: c.misc })
    }
  }
  const pickCard = (i: number) => {
    if (okCards.includes(i) || badCards.includes(i)) return
    const c = cards[i]
    if (c.ok) {
      api.check(true)
      api.clear()
      setOkCards((o) => [...o, i])
      api.found(`${keyPrefix}:${i}`, c.s ?? c.t)
    } else {
      api.check(false)
      setBadCards((b) => [...b, i])
      api.nudge(c.fb ?? 'Bu kart sonucu gerçekten destekliyor mu?', { misc: c.misc })
    }
  }
  const base = dark ? 'bg-slate-800/90 text-slate-100 ring-1 ring-slate-600 hover:ring-cyan-400' : 'bg-white text-ink ring-1 ring-line hover:ring-cyan-400'
  return (
    <div className="grid gap-3">
      {conclusions && (
        <div>
          {question && <p className="mb-2 text-base font-black sm:text-lg" style={{ color: ink.text }}><MathText text={question} /></p>}
          <div className="grid gap-2" role="radiogroup" aria-label="Sonuçlar">
            {conclusions.map((c, i) => {
              const chosen = concl === i
              const isTried = tried.includes(i)
              const locked = concl !== null && concl >= 0
              return (
                <button key={i} type="button" role="radio" aria-checked={chosen} disabled={locked || isTried} onClick={() => pickConcl(i)} className={`flex min-h-13 items-center gap-3 rounded-xl px-3 py-2 text-left text-[15px] font-extrabold transition active:scale-[0.99] ${chosen ? (dark ? 'bg-emerald-500/15 text-emerald-100 ring-2 ring-emerald-400' : 'bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500') : isTried ? (dark ? 'bg-slate-900 text-slate-500 ring-1 ring-slate-700' : 'bg-slate-50 text-slate-400 ring-1 ring-slate-200') : base} ${locked && !chosen ? 'opacity-50' : ''}`}>
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full ring-2 ${chosen ? 'bg-emerald-500 ring-emerald-500 text-white' : 'ring-slate-400'}`}>{chosen && <Check size={14} strokeWidth={3} />}</span>
                  <span className="min-w-0 flex-1"><MathText text={c.t} /></span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      {concl !== null && (
        <div className="animate-fade-up">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-black" style={{ color: ink.text }}><Pin size={15} className="text-rose-500" />{cardsTitle} <span className="font-bold opacity-70">({okCards.length}/{goal}{okCards.length >= goal ? ' ✓' : ''})</span></p>
          <div className="grid gap-2 sm:grid-cols-2">
            {cards.map((c, i) => {
              const ok = okCards.includes(i)
              const bad = badCards.includes(i)
              return (
                <button key={i} type="button" aria-pressed={ok} disabled={ok || bad} onClick={() => pickCard(i)} className={`relative flex min-h-14 items-start gap-2 rounded-xl px-3 py-2.5 text-left text-[14.5px] leading-snug font-extrabold transition active:scale-[0.99] ${ok ? (dark ? 'bg-emerald-500/15 text-emerald-100 ring-2 ring-emerald-400' : 'bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500') : bad ? (dark ? 'bg-slate-900 text-slate-500 ring-1 ring-amber-500/40' : 'bg-amber-50/60 text-slate-500 ring-1 ring-amber-200') : base}`} style={{ transform: `rotate(${i % 2 ? 0.4 : -0.4}deg)` }}>
                  <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md ring-2 ${ok ? 'bg-emerald-500 text-white ring-emerald-500' : bad ? 'ring-amber-400 text-amber-500' : 'ring-slate-400'}`}>{ok ? <Check size={13} strokeWidth={3} /> : bad ? <HelpCircle size={13} /> : null}</span>
                  <span className="min-w-0 flex-1"><MathText text={c.t} /></span>
                </button>
              )
            })}
          </div>
          {okCards.length >= goal && okCards.length < cards.filter((c) => c.ok).length && (
            <p className={`mt-2 text-sm font-extrabold animate-fade-up ${dark ? 'text-cyan-300' : 'text-cyan-700'}`}>Gerekçen hazır! İstersen başka bir kanıt da bul.</p>
          )}
        </div>
      )}
    </div>
  )
}

/* ───────────── Sürükle-bırak (dokun-dokun alternatifli) ───────────── */

export function useDragDrop<T>(opts: { onDrop: (item: T, x: number, y: number) => void; onTap?: (item: T) => void; ghost: (item: T) => ReactNode }) {
  const [drag, setDrag] = useState<{ item: T; x: number; y: number } | null>(null)
  const ref = useRef(opts)
  ref.current = opts
  const start = useCallback((e: React.PointerEvent, item: T) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const sx = e.clientX, sy = e.clientY, id = e.pointerId
    let moved = false
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) moved = true
      if (moved) setDrag({ item, x: ev.clientX, y: ev.clientY })
    }
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      setDrag(null)
      if (ev.type === 'pointercancel') return
      if (moved) ref.current.onDrop(item, ev.clientX, ev.clientY)
      else ref.current.onTap?.(item)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }, [])
  const ghost = drag
    ? createPortal(
        <div style={{ position: 'fixed', left: drag.x, top: drag.y, transform: 'translate(-50%, -70%) rotate(-2deg)', pointerEvents: 'none', zIndex: 70, filter: 'drop-shadow(0 10px 14px rgb(0 0 0 / .25))' }}>{opts.ghost(drag.item)}</div>,
        document.body,
      )
    : null
  return { start, dragging: drag?.item ?? null, ghost }
}

/* ───────────── Yorum ayıklama: ifadeleri kutulara yerleştir ───────────── */

export interface SortItem {
  t: string
  bin: number
  fb: string
  misc?: string
}

export function Sorter({ api, items, bins, onDone }: { api: Api; items: SortItem[]; bins: { label: string; icon: string; tone: 'ok' | 'no' | 'q' }[]; onDone: () => void }) {
  const [placed, setPlaced] = useState<Record<number, number>>({})
  const [sel, setSel] = useState<number | null>(null)
  const [shake, setShake] = useState<number | null>(null)
  const zones = useRef<(HTMLDivElement | null)[]>([])
  const ink = api.ink
  const dark = ink.dark
  useOnce(Object.keys(placed).length === items.length, onDone)
  const place = (i: number, b: number) => {
    if (placed[i] !== undefined) return
    const it = items[i]
    if (it.bin === b) {
      api.check(true)
      api.clear()
      setPlaced((p) => ({ ...p, [i]: b }))
      setSel(null)
    } else {
      api.check(false)
      setShake(i)
      setTimeout(() => setShake(null), 450)
      api.nudge(it.fb, { misc: it.misc })
      setSel(null)
    }
  }
  const dd = useDragDrop<number>({
    onTap: (i) => setSel((s) => (s === i ? null : i)),
    onDrop: (i, x, y) => {
      const b = zones.current.findIndex((el) => {
        if (!el) return false
        const r = el.getBoundingClientRect()
        return x >= r.left - 10 && x <= r.right + 10 && y >= r.top - 10 && y <= r.bottom + 10
      })
      if (b >= 0) place(i, b)
    },
    ghost: (i) => <div className={`max-w-[260px] rounded-xl px-3 py-2 text-sm font-extrabold ring-2 ring-cyan-500 ${dark ? 'bg-slate-800 text-white' : 'bg-white text-ink'}`}>{items[i].t}</div>,
  })
  const toneCls = (t: 'ok' | 'no' | 'q') =>
    t === 'ok'
      ? dark ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-100' : 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
      : t === 'no'
        ? dark ? 'bg-rose-500/10 border-rose-500/40 text-rose-100' : 'bg-rose-50/70 border-rose-300 text-rose-900'
        : dark ? 'bg-indigo-500/10 border-indigo-400/40 text-indigo-100' : 'bg-indigo-50/70 border-indigo-300 text-indigo-900'
  const waiting = items.map((_, i) => i).filter((i) => placed[i] === undefined)
  return (
    <div className="grid gap-3">
      {dd.ghost}
      <div className="grid gap-2 sm:grid-cols-2">
        {waiting.map((i) => (
          <button key={i} type="button" onPointerDown={(e) => dd.start(e, i)} data-handle style={{ touchAction: 'none' }} aria-pressed={sel === i} className={`min-h-14 rounded-xl px-3 py-2 text-left text-[15px] leading-snug font-extrabold ring-1 transition select-none ${sel === i ? 'ring-2 ring-cyan-500 ' + (dark ? 'bg-cyan-500/15 text-white' : 'bg-cyan-50 text-ink') : dark ? 'bg-slate-800 text-slate-100 ring-slate-600' : 'bg-white text-ink ring-line'} ${shake === i ? 'animate-shake' : ''} ${dd.dragging === i ? 'opacity-40' : ''}`}>
            “{items[i].t}”
          </button>
        ))}
      </div>
      {waiting.length > 0 && <p className="text-center text-xs font-bold" style={{ color: ink.soft }}>{sel === null ? 'Bir yorumu sürükle ya da önce yoruma, sonra kutuya dokun.' : 'Şimdi bir kutuya dokun.'}</p>}
      <div className="grid gap-2 md:grid-cols-3">
        {bins.map((b, k) => (
          <div key={k} ref={(el) => { zones.current[k] = el }} role="button" tabIndex={0} onClick={() => sel !== null && place(sel, k)} onKeyDown={(e) => e.key === 'Enter' && sel !== null && place(sel, k)} className={`min-h-24 rounded-2xl border-2 border-dashed p-2.5 transition ${toneCls(b.tone)} ${sel !== null ? 'cursor-pointer border-solid hover:brightness-105' : ''}`}>
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-black"><span className="grid size-7 place-items-center rounded-lg bg-white/80 text-base shadow-sm">{b.icon}</span>{b.label}</p>
            <div className="grid gap-1.5">
              {items.map((it, i) => placed[i] === k && <p key={i} className={`rounded-lg px-2 py-1.5 text-[13px] leading-snug font-bold animate-pop ${dark ? 'bg-black/30' : 'bg-white/90'}`}>“{it.t}”</p>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ───────────── Görev tanımı ───────────── */

export interface Mission {
  key: string
  title: string
  /** Görev kartındaki problem */
  prompt: string
  /** Kademeli ipuçları: soru sorar, cevabı söylemez */
  hints: string[]
  /** Bulunması beklenen farklı yol/çözüm sayısı (rozet listesi için) */
  goal?: number
  picker?: { q: string; options: string[] }
  /** Görev bitince istasyon notu */
  note: string
  /** “Modelle dene” düğmesinin açacağı manipülatif (düşündüren sorularda) */
  tool?: { id: ManipulativeTool; config?: ManipulativeConfig; title?: string }
  render: (api: Api) => ReactNode
}
