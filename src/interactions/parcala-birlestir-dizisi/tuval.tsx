import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { ChevronsLeftRight, ChevronsUpDown, Scissors } from 'lucide-react'
import { Stepper } from '../donusum-studyosu/ortak'
import type { ToolInfo } from '../sayilari-karsilastir/parts'

/* ───────────── çarpma yardımcıları ───────────── */

/** “Kolay gerçekler”: bu çarpanlardan biri varsa çarpmayı biliyoruz */
export const EASY = [1, 2, 5, 10]
export const isEasy = (a: number, b: number) => EASY.includes(a) || EASY.includes(b)
/** k, n’yi gerçekten ikiye bölüyor mu? (0 ya da n: bölünmemiş) */
export const isCut = (k: number, n: number) => k > 0 && k < n

/** Parça renkleri: sol üst, sağ üst, sol alt, sağ alt */
export const PART = [
  { color: '#3b82f6', ink: '#1d4ed8', soft: '#dbeafe' },
  { color: '#22c55e', ink: '#15803d', soft: '#dcfce7' },
  { color: '#f97316', ink: '#c2410c', soft: '#ffedd5' },
  { color: '#a855f7', ink: '#7e22ce', soft: '#f3e8ff' },
]
/** Kesilmemiş dizi */
export const WHOLE = { color: '#fbbf24', ink: '#b45309', soft: '#fef3c7' }
/** Türetmede çıkarılan (gölgelenen) satırlar */
export const GONE = { color: '#cbd5e1', ink: '#475569', soft: '#f1f5f9' }

export interface Part { i: number; a: number; b: number; r0: number; c0: number }

/** Dizinin parçaları (a satır × b sütun). Hiç kesik yoksa tek parça. */
export function partsOf(r: number, c: number, cutR: number, cutC: number): Part[] {
  const rs = isCut(cutR, r) ? [[0, cutR], [cutR, r - cutR]] : [[0, r]]
  const cs = isCut(cutC, c) ? [[0, cutC], [cutC, c - cutC]] : [[0, c]]
  const out: Part[] = []
  rs.forEach(([r0, a], ri) => cs.forEach(([c0, b], ci) => out.push({ i: ri * 2 + ci, a, b, r0, c0 })))
  return out
}

export interface Term { a: number; b: number; color: string; ink: string }
/** Bir parçalanmanın denklemi: lhs = terimler (op ile) = değerler = toplam */
export interface Eq { lhs: [number, number]; terms: Term[]; op: '+' | '−'; total: number }

/**
 * minus: türetme kipi. r × c bilinen büyük dizi, üstteki cutR satır istenen çarpma,
 * alttaki satırlar gölgelenip çıkarılır: cutR × c = (r × c) − ((r − cutR) × c).
 */
export function eqOf(r: number, c: number, cutR: number, cutC: number, minus = false): Eq | null {
  if (minus) {
    if (!isCut(cutR, r)) return null
    return { lhs: [cutR, c], op: '−', total: cutR * c, terms: [{ a: r, b: c, ...pickColor(WHOLE) }, { a: r - cutR, b: c, ...pickColor(GONE) }] }
  }
  const ps = partsOf(r, c, cutR, cutC)
  if (ps.length === 1) return null
  return { lhs: [r, c], op: '+', total: r * c, terms: ps.map((p) => ({ a: p.a, b: p.b, ...pickColor(PART[p.i]) })) }
}
const pickColor = (x: { color: string; ink: string }) => ({ color: x.color, ink: x.ink })
export const valOf = (t: Term) => t.a * t.b
/** Satır sonunda “5 ×” ile “8” ayrılmasın */
export const nb = (s: string) => s.replace(/ × /g, '\u00a0×\u00a0')
/** “7 × 8 = (5 × 8) + (2 × 8) = 40 + 16 = 56” */
export function eqText(e: Eq) {
  return nb(`${e.lhs[0]} × ${e.lhs[1]} = ${e.terms.map((t) => `(${t.a} × ${t.b})`).join(` ${e.op} `)} = ${e.terms.map(valOf).join(` ${e.op} `)} = ${e.total}`)
}
/** Aynı parçaları veren kesişler (5 + 2 ile 2 + 5) aynı sayılır */
export const eqKey = (e: Eq) => e.terms.map((t) => `${t.a}x${t.b}`).sort().join('+')

/* ───────────── denklem ───────────── */

/**
 * Canlı denklem. Kesik yoksa “7 × 8 = ?”. slot verilirse değerlerin yerine kart yuvaları konur
 * (p0, p1… parça değerleri, t toplam).
 */
export function EqView({ r, c, eq, slot, known }: { r: number; c: number; eq: Eq | null; slot?: (k: string) => ReactNode | undefined; /** bölünmemişken sonucu göster (bilinen gerçek) */ known?: boolean }) {
  const seg = 'inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 whitespace-nowrap'
  const big = 'text-xl font-black sm:text-2xl'
  if (!eq)
    return (
      <div className={`flex flex-wrap items-center justify-center gap-x-2 ${big} text-ink`} data-eq>
        <span>{r} × {c}</span><span>=</span>
        {known ? <span style={{ color: WHOLE.ink }}>{r * c}</span> : <span className="grid h-10 min-w-10 place-items-center rounded-xl bg-amber-100 px-2 text-amber-700 ring-2 ring-amber-300">?</span>}
      </div>
    )
  const val = (k: string, v: number, color: string) => slot?.(k) ?? <span style={{ color }}>{v}</span>
  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 ${big} text-ink tabular-nums`} data-eq aria-label={eqText(eq)}>
      <span className={seg}>{eq.lhs[0]} × {eq.lhs[1]}</span>
      <span className={seg}>
        =
        {eq.terms.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            {i > 0 && <span>{eq.op}</span>}
            <span style={{ color: t.ink }}>({t.a} × {t.b})</span>
          </span>
        ))}
      </span>
      <span className={seg}>
        =
        {eq.terms.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            {i > 0 && <span>{eq.op}</span>}
            {val(`p${i}`, valOf(t), t.ink)}
          </span>
        ))}
      </span>
      <span className={seg}>= {val('t', eq.total, '#0f172a')}</span>
    </div>
  )
}

/* ───────────── kesilebilen dizi ───────────── */

export type Axis = 'r' | 'c'
/** Sol ve üst kenar boşluğu (tutamaçların yolu) ve sağ/alt pay */
const G = 58
const P = 28

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/**
 * r satır × c sütunluk dizi. Soldaki makas satırları (yatay çizgi), üstteki makas sütunları (dikey çizgi) keser.
 * Tutamaç ya da çizginin kendisi parmakla sürüklenir; çizgi hep bir ızgara çizgisine yapışır. Kenar yolunda
 * bir yere dokunmak da çizgiyi oraya taşır. 0 ya da uçta: bölünmemiş.
 * minus: türetme kipi; kesiğin altındaki satırlar gölgelenir (çıkarılır).
 */
export function SliceGrid({ r, c, cutR, cutC, onCut, onCommit, axes = ['r', 'c'], view = 'sq', minus = false, maxH = 470, nudgeKnobs }: {
  r: number
  c: number
  cutR: number
  cutC: number
  onCut?: (axis: Axis, k: number) => void
  /** Parmak kalkınca (kesik yerleşti) */
  onCommit?: (axis: Axis, k: number) => void
  axes?: Axis[]
  view?: 'sq' | 'dot'
  minus?: boolean
  maxH?: number
  /** Kesik yokken tutamaçlar zıplasın (ilk görev) */
  nudgeKnobs?: boolean
}) {
  const [box, W] = useWidth()
  const grid = useRef<HTMLDivElement>(null)
  const drag = useRef<{ axis: Axis; id: number } | null>(null)
  const [active, setActive] = useState<Axis | null>(null)
  const can = (a: Axis) => !!onCut && axes.includes(a) && !(minus && a === 'c')
  /** Tutamacı olmayan kenarda boşluk bırakma */
  const GL = can('r') ? G : 10
  const GT = can('c') ? G : 10
  const PR = can('c') ? P : 10
  const PB = can('r') ? P : 10
  const avail = Math.max(160, Math.min(maxH, typeof window === 'undefined' ? maxH : window.innerHeight * 0.62))
  const s = Math.max(18, Math.min(52, Math.floor(Math.min((Math.max(W, 200) - GL - PR) / c, (avail - GT - PB) / r))))
  const gw = c * s
  const gh = r * s

  const kAt = (axis: Axis, x: number, y: number) => {
    const rect = grid.current?.getBoundingClientRect()
    if (!rect) return axis === 'r' ? cutR : cutC
    const v = axis === 'r' ? (y - rect.top) / s : (x - rect.left) / s
    return Math.max(0, Math.min(axis === 'r' ? r : c, Math.round(v)))
  }
  const set = (axis: Axis, k: number) => {
    if (k === (axis === 'r' ? cutR : cutC)) return
    onCut?.(axis, k)
    navigator.vibrate?.(4)
  }
  const handlers = (axis: Axis) =>
    can(axis)
      ? {
          onPointerDown(ev: ReactPointerEvent) {
            if (ev.button > 0) return
            ev.preventDefault()
            ev.currentTarget.setPointerCapture(ev.pointerId)
            drag.current = { axis, id: ev.pointerId }
            setActive(axis)
            set(axis, kAt(axis, ev.clientX, ev.clientY))
          },
          onPointerMove(ev: ReactPointerEvent) {
            const d = drag.current
            if (!d || d.id !== ev.pointerId) return
            set(axis, kAt(axis, ev.clientX, ev.clientY))
          },
          onPointerUp(ev: ReactPointerEvent) {
            const d = drag.current
            if (!d || d.id !== ev.pointerId) return
            drag.current = null
            setActive(null)
            const k = kAt(axis, ev.clientX, ev.clientY)
            set(axis, k)
            onCommit?.(axis, k)
          },
          onPointerCancel() {
            drag.current = null
            setActive(null)
          },
        }
      : {}
  const key = (axis: Axis) => (ev: KeyboardEvent) => {
    const n = axis === 'r' ? r : c
    const cur = axis === 'r' ? cutR : cutC
    const d = ev.key === 'ArrowDown' || ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowUp' || ev.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    ev.preventDefault()
    const k = Math.max(0, Math.min(n, cur + d))
    set(axis, k)
    onCommit?.(axis, k)
  }

  const ps = partsOf(r, c, minus ? cutR : cutR, minus ? c : cutC)
  const whole = ps.length === 1
  const splitR = isCut(cutR, r)
  const colorAt = (i: number, j: number) => {
    if (minus) return splitR && i >= cutR ? GONE : WHOLE
    if (whole) return WHOLE
    const p = ps.find((q) => i >= q.r0 && i < q.r0 + q.a && j >= q.c0 && j < q.c0 + q.b)!
    return PART[p.i]
  }
  const dot = view === 'dot'
  const gap = Math.max(2, Math.round(s * 0.09))

  const knob = (axis: Axis) => {
    const isR = axis === 'r'
    const k = isR ? cutR : cutC
    const n = isR ? r : c
    const cut = isCut(k, n)
    const Arrows = isR ? ChevronsUpDown : ChevronsLeftRight
    return (
      <button
        type="button"
        role="slider"
        aria-label={isR ? 'Satır makası: yukarı aşağı sürükle' : 'Sütun makası: sağa sola sürükle'}
        aria-valuemin={0}
        aria-valuemax={n}
        aria-valuenow={k}
        onKeyDown={key(axis)}
        className={`pointer-events-none absolute grid size-12 place-items-center rounded-full bg-white text-slate-900 shadow-[0_4px_10px_-2px_rgb(15_23_42/0.45)] ring-4 transition-[transform,box-shadow,top,left] duration-100 ${active === axis ? 'scale-115 ring-sky-500' : cut ? 'ring-slate-900' : 'ring-pink-500'} ${nudgeKnobs && !cut && active !== axis ? (isR ? 'animate-[pbNudgeY_1.6s_ease-in-out_infinite]' : 'animate-[pbNudgeX_1.6s_ease-in-out_infinite]') : ''}`}
        style={isR ? { left: (GL - 48) / 2 - 2, top: GT + k * s - 24 } : { top: (GT - 48) / 2 - 2, left: GL + k * s - 24 }}
        data-knob={axis}
      >
        <Scissors size={20} strokeWidth={2.6} className={isR ? '' : 'rotate-90'} />
        <Arrows size={13} strokeWidth={3} className={`absolute text-pink-600 ${isR ? '-bottom-0.5' : '-right-0.5'}`} />
      </button>
    )
  }

  return (
    <div ref={box} className="w-full">
      <style>{'@keyframes pbNudgeY{0%,100%{translate:0 0}50%{translate:0 -7px}}@keyframes pbNudgeX{0%,100%{translate:0 0}50%{translate:-7px 0}}'}</style>
      <div className="relative mx-auto select-none" style={{ width: GL + gw + PR, height: GT + gh + PB }}>
        {/* hücreler */}
        <div ref={grid} className="absolute" style={{ left: GL, top: GT, width: gw, height: gh }} data-grid aria-label={`${r} satır, ${c} sütun`}>
          {Array.from({ length: r * c }, (_, x) => {
            const i = Math.floor(x / c)
            const j = x % c
            const col = colorAt(i, j)
            const gone = col === GONE
            return (
              <span
                key={x}
                className="absolute"
                style={{ left: j * s + gap / 2, top: i * s + gap / 2, width: s - gap, height: s - gap, padding: dot ? (s - gap) * 0.12 : 0 }}
              >
                <span
                  className={`block size-full transition-[background-color,box-shadow] duration-300 ${dot ? 'rounded-full' : 'rounded-[22%]'}`}
                  style={{
                    background: gone ? `repeating-linear-gradient(45deg, ${GONE.color} 0 3px, ${GONE.soft} 3px 6px)` : col.color,
                    boxShadow: gone ? 'none' : `inset 0 -${Math.max(2, s * 0.08)}px 0 rgb(0 0 0 / 0.16)`,
                    opacity: gone ? 0.75 : 1,
                  }}
                />
              </span>
            )
          })}
        </div>

        {/* parça etiketleri */}
        {ps.map((p) => {
          const g = minus && splitR && p.r0 >= cutR
          const col = minus ? (g ? GONE : WHOLE) : whole ? WHOLE : PART[p.i]
          const small = Math.min(p.a, p.b) * s < 46 || p.b * s < 70
          const tiny = p.b * s < 50 || p.a * s < 26
          return (
            <div key={`${p.r0}-${p.c0}`} className="pointer-events-none absolute grid place-items-center" style={{ left: GL + p.c0 * s, top: GT + p.r0 * s, width: p.b * s, height: p.a * s }}>
              <span
                className={`rounded-full bg-white/95 font-black whitespace-nowrap tabular-nums animate-pop ${tiny ? 'px-1 text-[11px]' : small ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-0.5 text-base sm:text-lg'}`}
                style={{ color: col.ink, boxShadow: `0 0 0 2px ${col.color}, 0 2px 4px rgb(15 23 42 / 0.2)` }}
                data-part
              >
                {g ? '− ' : ''}{p.a} × {p.b}
              </span>
            </div>
          )
        })}

        {/* satır makası: sol kenar yolu, çizgi ve tutamaç */}
        {can('r') && (
          <>
            <div className="absolute touch-none" style={{ left: 0, top: GT - 24, width: GL - 2, height: gh + 48, cursor: 'ns-resize' }} {...handlers('r')} data-rail="r">
              <span className="absolute top-6 bottom-6 left-1/2 w-1 -translate-x-1/2 rounded-full bg-[repeating-linear-gradient(#f9a8d4_0_6px,transparent_6px_11px)]" />
            </div>
            <div className="absolute touch-none" style={{ left: GL, top: GT + cutR * s - 16, width: gw, height: 32, cursor: 'ns-resize' }} {...handlers('r')} />
          </>
        )}
        {(can('r') || isCut(cutR, r)) && (
          <span className={`pointer-events-none absolute rounded-full transition-[top] duration-100 ${isCut(cutR, r) ? 'bg-slate-900 shadow-[0_0_0_2px_#fff]' : 'bg-pink-500/40'}`} style={{ left: GL - 8, top: GT + cutR * s - 2.5, width: gw + 16, height: 5 }} />
        )}
        {can('r') && knob('r')}

        {/* sütun makası: üst kenar yolu, çizgi ve tutamaç */}
        {can('c') && (
          <>
            <div className="absolute touch-none" style={{ top: 0, left: GL - 24, height: GT - 2, width: gw + 48, cursor: 'ew-resize' }} {...handlers('c')} data-rail="c">
              <span className="absolute top-1/2 right-6 left-6 h-1 -translate-y-1/2 rounded-full bg-[repeating-linear-gradient(90deg,#f9a8d4_0_6px,transparent_6px_11px)]" />
            </div>
            <div className="absolute touch-none" style={{ top: GT, left: GL + cutC * s - 16, height: gh, width: 32, cursor: 'ew-resize' }} {...handlers('c')} />
          </>
        )}
        {(can('c') || (!minus && isCut(cutC, c))) && (
          <span className={`pointer-events-none absolute rounded-full transition-[left] duration-100 ${isCut(cutC, c) ? 'bg-slate-900 shadow-[0_0_0_2px_#fff]' : 'bg-pink-500/40'}`} style={{ top: GT - 8, left: GL + cutC * s - 2.5, height: gh + 16, width: 5 }} />
        )}
        {can('c') && knob('c')}
      </div>
    </div>
  )
}

/* ───────────── çarpan seçici ───────────── */

/** Satır ve sütun sayısı (1–10) ile kare / nokta görünümü */
export function Controls({ r, c, onR, onC, view, onView, locked }: { r: number; c: number; onR: (v: number) => void; onC: (v: number) => void; view: 'sq' | 'dot'; onView: (v: 'sq' | 'dot') => void; locked?: boolean }) {
  const btn = (v: 'sq' | 'dot', label: ReactNode) => (
    <button type="button" onClick={() => onView(v)} aria-pressed={view === v} className={`inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-black ring-1 transition active:scale-95 ${view === v ? 'bg-sky-600 text-white ring-sky-700' : 'bg-white text-ink ring-line hover:bg-sky-50'}`}>
      {label}
    </button>
  )
  return (
    <div className="grid gap-2 rounded-2xl bg-slate-50 p-2 ring-1 ring-line sm:grid-cols-[1fr_1fr_auto]">
      <div className={`rounded-xl bg-white px-2 py-1 ring-1 ring-line ${locked ? 'pointer-events-none opacity-50' : ''}`}>
        <Stepper label="Satır" value={r} min={1} max={10} onChange={onR} />
      </div>
      <div className={`rounded-xl bg-white px-2 py-1 ring-1 ring-line ${locked ? 'pointer-events-none opacity-50' : ''}`}>
        <Stepper label="Sütun" value={c} min={1} max={10} onChange={onC} />
      </div>
      <div className="flex gap-1.5">
        {btn('sq', <><span className="size-3.5 rounded-[3px] bg-current" />Kare</>)}
        {btn('dot', <><span className="size-3.5 rounded-full bg-current" />Nokta</>)}
      </div>
    </div>
  )
}

/** Kolay gerçekler şeridi */
export function EasyStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 text-sm font-black">
      <span className="text-ink-soft">Kolay gerçekler:</span>
      {EASY.map((e) => <span key={e} className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800 ring-1 ring-emerald-300">× {e}</span>)}
    </div>
  )
}

/* ───────────── “Nasıl kullanılır?” araçları ───────────── */

const knobIcon = (rot = false) => (
  <span className="grid size-6 place-items-center rounded-full bg-white ring-2 ring-slate-900"><Scissors size={13} strokeWidth={2.6} className={rot ? 'rotate-90' : ''} /></span>
)

export const TOOL: Record<'size' | 'rowCut' | 'colCut' | 'view' | 'card' | 'known' | 'shade' | 'judge', ToolInfo> = {
  size: { icon: <span className="grid h-5 min-w-6 place-items-center rounded-md bg-white px-0.5 text-xs font-black ring-1 ring-line">±</span>, name: 'Satır ve sütun', text: '− ve + düğmeleriyle dizinin satır ve sütun sayısını 1 ile 10 arasında seç.' },
  rowCut: { icon: knobIcon(), name: 'Satır makası (solda)', text: 'Makası tutup yukarı aşağı sürükle ya da sol kenarda bir yere dokun. Yatay çizgi satırları ikiye keser; parçalar renklenir.' },
  colCut: { icon: knobIcon(true), name: 'Sütun makası (üstte)', text: 'Makası tutup sağa sola sürükle. Dikey çizgi sütunları keser. İki makası birlikte kullanırsan dört parça olur.' },
  view: { icon: <span className="size-4 rounded-full bg-amber-400 ring-2 ring-amber-600" />, name: 'Kare / Nokta', text: 'Diziyi karelerle ya da noktalarla göster.' },
  card: { icon: <span className="grid h-5 min-w-6 place-items-center rounded-md bg-white px-0.5 text-[10px] font-black ring-1 ring-line">35</span>, name: 'Sayı kartı', text: 'Kartı tutup denklemdeki “?” kutusuna sürükle. Uymazsa geri döner ve ipucu çıkar.' },
  known: { icon: <span className="text-base leading-none">💡</span>, name: 'Bildiğim gerçek', text: 'Zaten bildiğin bir çarpma. Yeni çarpmayı bundan türet.' },
  shade: { icon: <span className="h-4 w-6 rounded-[3px] bg-[repeating-linear-gradient(45deg,#cbd5e1_0_3px,#f1f5f9_3px_6px)] ring-1 ring-slate-400" />, name: 'Gölgeli satır', text: 'Makasın altında kalan satırlar gölgelenir: büyük diziden çıkarılır.' },
  judge: { icon: <span className="text-base leading-none">🧺</span>, name: 'Doğru / Hatalı sepetleri', text: 'Arkadaşının kesişini kontrol et; doğruysa “Doğru”, yanlışsa “Hatalı” sepetine sürükle. Diziyle deneyebilirsin.' },
}
