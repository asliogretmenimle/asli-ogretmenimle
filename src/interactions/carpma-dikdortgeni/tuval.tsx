import { useRef, type CSSProperties, type ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'
import { useWidth } from '../../games/kit'
import { n, type ToolInfo } from '../sayilari-karsilastir/parts'

/**
 * Çarpma dikdörtgeni: birim karelerden oluşan uzunluk × genişlik dikdörtgeni. Uzunluk 10’u geçince 10’luk parça
 * ve kalan parça iki renge ayrılır (20’yi geçince 10 + 10 + kalan). Boyut, parmak dostu iki kaydırıcıyla ya da
 * dikdörtgenin köşesindeki tutamaçla değiştirilir; istenirse bölme çizgisi de tutamaçla kaydırılır.
 * Bütün özel jestler Pointer Events ile yazıldı (touch-action: none, setPointerCapture).
 */

export const MAXW = 10
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/* ───────────── parçalar ───────────── */

export type Tone = 'ten' | 'ten2' | 'rest' | 'whole' | 'a' | 'b'
export const TONE: Record<Tone, { fill: string; strong: string; text: string }> = {
  ten: { fill: '#bfdbfe', strong: '#3b82f6', text: '#1d4ed8' },
  ten2: { fill: '#c7d2fe', strong: '#6366f1', text: '#4338ca' },
  rest: { fill: '#fed7aa', strong: '#f97316', text: '#c2410c' },
  whole: { fill: '#bbf7d0', strong: '#22c55e', text: '#15803d' },
  a: { fill: '#e9d5ff', strong: '#a855f7', text: '#7e22ce' },
  b: { fill: '#fed7aa', strong: '#f97316', text: '#c2410c' },
}

/** 14 → [10, 4]; 24 → [10, 10, 4]; 7 → [7] */
export function tens(L: number) {
  const out: number[] = []
  let r = L
  while (r > 10) {
    out.push(10)
    r -= 10
  }
  out.push(r)
  return out
}
/** Parça uzunluklarına göre renkler: 10’luklar mavi tonlarında, kalan turuncu; hiç bölünmemişse yeşil */
export function tonesFor(lens: number[], custom?: boolean): Tone[] {
  if (custom) return lens.map((_, i) => (i === 0 ? 'a' : 'b'))
  if (lens.length === 1) return [lens[0] === 10 ? 'ten' : 'whole']
  let k = 0
  return lens.map((len) => (len === 10 ? (k++ % 2 === 0 ? 'ten' : 'ten2') : 'rest'))
}

export interface Part {
  len: number
  tone: Tone
  /** parçanın üstündeki etiket (varsayılan “10 × 5 = 50”) */
  label?: ReactNode
  /** perdeyle kapalı */
  hidden?: boolean
  /** yalnızca sol üstteki [sütun, satır] kadar kare boyalı, kalanı “sayılmadı” */
  paint?: [number, number] | null
  /** bu parça bir bırakma hedefi */
  drop?: string
}

export const partLabel = (len: number, W: number) => `${len} × ${W} = ${n(len * W)}`

/* ───────────── kaydırıcı ───────────── */

/** Kalın, parmak dostu kaydırıcı: büyük tutamaç, iki yanda − / + düğmeleri, istenirse işaretli değerler */
export function BigSlider({ label, value, min, max, onChange, onRelease, color, marks = [], disabled }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; onRelease?: () => void; color: string; marks?: number[]; disabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const pid = useRef<number | null>(null)
  const at = (cx: number) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const t = clamp((cx - r.left - 28) / (r.width - 56), 0, 1)
    const v = Math.round(min + t * (max - min))
    if (v !== value) onChange(v)
  }
  const bump = (d: number) => {
    if (disabled) return
    const v = clamp(value + d, min, max)
    if (v !== value) onChange(v)
    onRelease?.()
  }
  const pct = (value - min) / (max - min)
  const btn = 'grid size-12 shrink-0 place-items-center rounded-xl bg-white ring-1 ring-line active:scale-95 disabled:opacity-40'
  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <p className="mb-0.5 text-xs font-black tracking-wide uppercase" style={{ color }}>{label}</p>
      <div className="flex items-center gap-1.5">
        <button type="button" className={btn} disabled={disabled || value <= min} onClick={() => bump(-1)} aria-label={`${label}: azalt`}><Minus size={20} /></button>
        <div
          ref={ref}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          className="relative h-16 flex-1 cursor-pointer touch-none select-none"
          onPointerDown={(ev) => {
            if (disabled || ev.button > 0) return
            pid.current = ev.pointerId
            ev.currentTarget.setPointerCapture(ev.pointerId)
            at(ev.clientX)
          }}
          onPointerMove={(ev) => pid.current === ev.pointerId && at(ev.clientX)}
          onPointerUp={(ev) => {
            if (pid.current !== ev.pointerId) return
            pid.current = null
            onRelease?.()
          }}
          onPointerCancel={() => (pid.current = null)}
          onKeyDown={(ev) => {
            if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') bump(1)
            if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') bump(-1)
          }}
        >
          <div className="absolute inset-x-7 top-1/2 h-4 -translate-y-1/2 rounded-full bg-slate-200">
            <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: color }} />
            {marks.map((m) => (
              <span key={m} className="absolute top-1/2 h-7 w-1 -translate-x-1/2 -translate-y-1/2 rounded bg-slate-500" style={{ left: `${((m - min) / (max - min)) * 100}%` }}>
                <span className="absolute top-7 left-1/2 -translate-x-1/2 text-[11px] font-black text-slate-500">{m}</span>
              </span>
            ))}
          </div>
          <div className="pointer-events-none absolute top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-xl font-black text-white shadow-lg ring-4 ring-white" style={{ left: `calc(28px + (100% - 56px) * ${pct})`, background: color }}>
            {value}
          </div>
        </div>
        <button type="button" className={btn} disabled={disabled || value >= max} onClick={() => bump(1)} aria-label={`${label}: artır`}><Plus size={20} /></button>
      </div>
    </div>
  )
}

/* ───────────── tahta ───────────── */

const gridBg = (cell: number, line: string): CSSProperties => ({
  backgroundImage: `linear-gradient(to right, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${line} 1px, transparent 1px)`,
  backgroundSize: `${cell}px ${cell}px`,
})

/**
 * Uzunluk soldan sağa (sütun sayısı), genişlik yukarıdan aşağıya (satır sayısı). Dikdörtgen sol üst köşeye
 * yaslanır; arkadaki soluk ızgara en büyük boyutu gösterir, böylece boyut değişince sayfa zıplamaz.
 * onResize: köşe tutamacı; split: parçalar arasındaki bölme çizgisi tutamacı; renderDrop: parça üstü bırakma hedefi.
 */
export function Board({ maxL, W, parts, onResize, onRelease, split, renderDrop, showLabels = true, hideL }: {
  maxL: number
  W: number
  parts: Part[]
  onResize?: (L: number, W: number) => void
  onRelease?: () => void
  split?: { at: number; onChange: (at: number) => void; onRelease?: () => void }
  renderDrop?: (id: string, body: ReactNode, style: CSSProperties) => ReactNode
  showLabels?: boolean
  /** uzunluk cetvelde vurgulanmasın (gizli parça görevinde) */
  hideL?: boolean
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const L = parts.reduce((s, p) => s + p.len, 0)
  const markL = hideL ? -1 : L
  const padL = 30
  const padR = 30
  const cell = clamp(Math.floor((width - padL - padR) / maxL), 8, 40)
  const gw = maxL * cell
  const gh = MAXW * cell
  const top = 54
  const grid = useRef<HTMLDivElement>(null)
  const pid = useRef<number | null>(null)
  const sid = useRef<number | null>(null)

  const fromPoint = (cx: number, cy: number) => {
    const r = grid.current!.getBoundingClientRect()
    return { c: Math.round((cx - r.left) / cell), r: Math.round((cy - r.top) / cell) }
  }

  let x = 0
  const placed = parts.map((p) => {
    const at = x
    x += p.len
    return { ...p, at }
  })

  return (
    <div ref={ref} className="w-full">
      <div className="relative mx-auto touch-none select-none" style={{ width: gw + padL + padR, height: top + gh + 70 }}>
        {/* uzunluk cetveli */}
        <div className="absolute" style={{ left: padL, top: top + gh + 6, width: gw }}>
          {Array.from({ length: maxL + 1 }, (_, i) => (
            <span key={i} className="absolute top-0 -translate-x-1/2" style={{ left: i * cell }}>
              <span className={`mx-auto block w-0.5 ${i % 10 === 0 ? 'h-3 bg-slate-600' : i % 5 === 0 ? 'h-2 bg-slate-400' : 'h-1.5 bg-slate-300'}`} />
              {(i % 5 === 0 || i === markL) && (cell >= 14 || i % 10 === 0 || i === markL) && (
                <span className={`block text-center text-[11px] leading-tight font-black tabular-nums ${i === markL ? 'rounded bg-ink px-1 text-white' : i % 10 === 0 ? 'text-slate-700' : 'text-slate-400'}`}>{i}</span>
              )}
            </span>
          ))}
        </div>
        {/* genişlik etiketi */}
        <div className="absolute flex items-center justify-center" style={{ left: 0, top, width: padL - 6, height: W * cell, transition: 'height 150ms' }}>
          <span className="absolute inset-y-0 right-0 w-1.5 rounded-l border-y-2 border-l-2 border-slate-500" />
          <span className="mr-2 text-base font-black text-slate-700 tabular-nums">{W}</span>
        </div>

        <div ref={grid} className="absolute rounded-md" style={{ left: padL, top, width: gw, height: gh, ...gridBg(cell, '#e2e8f0') }}>
          {placed.map((p, i) => {
            const t = TONE[p.tone]
            const style: CSSProperties = { left: p.at * cell, top: 0, width: p.len * cell, height: W * cell }
            const body = (
              <>
                {!p.hidden && p.paint && (
                  <>
                    <span className="absolute inset-0" style={{ backgroundColor: '#fff', backgroundImage: 'repeating-linear-gradient(45deg, #fecaca 0 4px, transparent 4px 10px)' }} />
                    <span className="absolute top-0 left-0" style={{ width: p.paint[0] * cell, height: p.paint[1] * cell, backgroundColor: t.strong, ...gridBg(cell, 'rgb(255 255 255 / 0.7)') }} />
                  </>
                )}
                {p.hidden && (
                  <span className="absolute inset-0 grid place-items-center bg-slate-700 text-3xl font-black text-white" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #475569 0 8px, #334155 8px 16px)' }}>?</span>
                )}
              </>
            )
            const shell = (
              <div
                key={i}
                className="absolute overflow-hidden"
                style={{ ...style, backgroundColor: p.hidden ? undefined : t.fill, ...(p.hidden ? {} : gridBg(cell, 'rgb(255 255 255 / 0.9)')), boxShadow: `inset 0 0 0 2.5px ${t.strong}`, transition: 'width 150ms, height 150ms, left 150ms' }}
              >
                {body}
              </div>
            )
            return p.drop && renderDrop ? <div key={i}>{renderDrop(p.drop, null, { position: 'absolute', ...style, zIndex: 3 })}{shell}</div> : shell
          })}
          {/* bölme çizgileri */}
          {placed.slice(1).map((p, i) => (
            <span key={i} className="pointer-events-none absolute w-1 -translate-x-1/2 bg-ink" style={{ left: p.at * cell, top: -4, height: W * cell + 8, transition: 'left 150ms, height 150ms' }} />
          ))}
          {/* bölme tutamacı */}
          {split && (
            <button
              type="button"
              aria-label={`Bölme çizgisi: ${split.at} + ${L - split.at}`}
              className="absolute z-10 grid size-12 -translate-x-1/2 cursor-ew-resize touch-none place-items-center rounded-full bg-ink text-lg font-black text-white shadow-lg ring-4 ring-white"
              style={{ left: split.at * cell, top: W * cell + 26, transition: 'left 120ms' }}
              onPointerDown={(ev) => {
                sid.current = ev.pointerId
                ev.currentTarget.setPointerCapture(ev.pointerId)
              }}
              onPointerMove={(ev) => {
                if (sid.current !== ev.pointerId) return
                const at = clamp(fromPoint(ev.clientX, ev.clientY).c, 1, L - 1)
                if (at !== split.at) split.onChange(at)
              }}
              onPointerUp={(ev) => {
                if (sid.current !== ev.pointerId) return
                sid.current = null
                split.onRelease?.()
              }}
              onKeyDown={(ev) => {
                if (ev.key === 'ArrowRight' && split.at < L - 1) split.onChange(split.at + 1)
                if (ev.key === 'ArrowLeft' && split.at > 1) split.onChange(split.at - 1)
              }}
            >
              ⇔
            </button>
          )}
          {/* köşe tutamacı */}
          {onResize && (
            <button
              type="button"
              aria-label={`Köşe tutamacı: ${L} × ${W}`}
              className="absolute z-10 grid size-14 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize touch-none place-items-center rounded-full bg-pink-600 text-xl font-black text-white shadow-lg ring-4 ring-white"
              style={{ left: L * cell, top: W * cell, transition: 'left 120ms, top 120ms' }}
              onPointerDown={(ev) => {
                pid.current = ev.pointerId
                ev.currentTarget.setPointerCapture(ev.pointerId)
              }}
              onPointerMove={(ev) => {
                if (pid.current !== ev.pointerId) return
                const p = fromPoint(ev.clientX, ev.clientY)
                const l = clamp(p.c, 1, maxL)
                const w = clamp(p.r, 1, MAXW)
                if (l !== L || w !== W) onResize(l, w)
              }}
              onPointerUp={(ev) => {
                if (pid.current !== ev.pointerId) return
                pid.current = null
                onRelease?.()
              }}
            >
              ⤡
            </button>
          )}
        </div>

        {/* parça etiketleri: her parçanın üstünde */}
        {showLabels &&
          placed.map((p, i) => (
            <div key={i} className="absolute flex items-end justify-center" style={{ left: padL + p.at * cell, top: 0, width: p.len * cell, height: top - 6, transition: 'left 150ms, width 150ms' }}>
              <span className={`rounded-lg bg-white px-1.5 py-0.5 text-center leading-tight font-black whitespace-nowrap tabular-nums shadow-sm ring-2 ${p.len * cell < 70 ? 'text-[11px]' : 'text-sm sm:text-base'}`} style={{ color: TONE[p.tone].text, ['--tw-ring-color' as string]: TONE[p.tone].strong }}>
                {p.label ?? (p.len * cell < 70 ? <>{p.len} × {W}<br />= {n(p.len * W)}</> : partLabel(p.len, W))}
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}

/* ───────────── canlı denklem ───────────── */

/**
 * 14 × 5 = (10 × 5) + (4 × 5) = 50 + 20 = 70. vals/total verilirse ilgili yerlerde onlar gösterilir
 * (sürüklenen sayı kartı yuvaları ya da “?”).
 */
export function Equation({ lens, W, tones, vals, total, hideTotal, names, hideL }: { lens: number[]; W: number; tones: Tone[]; vals?: ReactNode[]; total?: ReactNode; hideTotal?: boolean; /** parça uzunluklarının yerine gösterilecek (ör. “?”) */ names?: ReactNode[]; hideL?: boolean }) {
  const L = lens.reduce((s, x) => s + x, 0)
  const c = (i: number) => TONE[tones[i]].text
  const sep = <span className="text-ink-soft">=</span>
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl bg-white px-3 py-2 text-lg font-black tabular-nums ring-1 ring-line sm:text-xl" aria-live="polite">
      <span>{hideL ? '?' : L} × {W}</span>
      {lens.length > 1 && (
        <>
          {sep}
          {lens.map((len, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-ink-soft">+</span>}
              <span style={{ color: c(i) }}>({names?.[i] ?? len} × {W})</span>
            </span>
          ))}
          {sep}
          {lens.map((len, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-ink-soft">+</span>}
              <span style={{ color: c(i) }}>{vals?.[i] ?? n(len * W)}</span>
            </span>
          ))}
        </>
      )}
      {sep}
      <span className="text-2xl text-emerald-700 sm:text-3xl">{total ?? (hideTotal ? '?' : n(L * W))}</span>
    </div>
  )
}

/* ───────────── “Nasıl kullanılır?” araçları ───────────── */

export const TOOL: Record<'sliders' | 'corner' | 'split' | 'card' | 'term' | 'curtain', ToolInfo> = {
  sliders: { icon: <span className="grid size-6 place-items-center rounded-full bg-sky-600 text-[10px] font-black text-white ring-2 ring-white">14</span>, name: 'Kaydırıcılar', text: 'Yuvarlak tutamacı tutup sağa sola sürükle: uzunluk ya da genişlik değişir. − ve + düğmeleri birer birer değiştirir.' },
  corner: { icon: <span className="grid size-6 place-items-center rounded-full bg-pink-600 text-xs font-black text-white">⤡</span>, name: 'Köşe tutamacı', text: 'Dikdörtgenin sağ alt köşesindeki pembe tutamacı sürükle: iki kenar birden değişir.' },
  split: { icon: <span className="grid size-6 place-items-center rounded-full bg-ink text-xs font-black text-white">⇔</span>, name: 'Bölme tutamacı', text: 'Dikdörtgenin altındaki siyah tutamacı sağa sola sürükle: bölme çizgisi kayar, parçalar ve denklem değişir.' },
  card: { icon: <span className="grid h-5 min-w-6 place-items-center rounded-md bg-white px-0.5 text-[10px] font-black ring-1 ring-line">40</span>, name: 'Sayı kartları', text: 'Bir kartı tutup “?” kutusuna sürükle. Uymazsa geri döner ve bir ipucu sorusu çıkar.' },
  term: { icon: <span className="grid h-5 min-w-8 place-items-center rounded-md bg-amber-100 px-0.5 text-[10px] font-black ring-1 ring-amber-400">+ 4</span>, name: 'Çözüm kartları', text: 'Arkadaşının hesabındaki her parçayı dikdörtgende hangi parçayı anlatıyorsa onun üstüne sürükle. Kaç kareyi saydığı boyanır.' },
  curtain: { icon: <span className="grid size-6 place-items-center rounded-md bg-slate-700 text-xs font-black text-white">?</span>, name: 'Perde', text: 'Gizli parçanın üstünde perde var. Doğru kartı bulunca perde kalkar.' },
}
