import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { useGesture } from '@use-gesture/react'
import { Eraser, Hand, Minus, Paintbrush, Plus } from 'lucide-react'
import { MathText } from '../../components/MathText'
import { clamp } from '../../interactive/axis'
import { unitName, unitSym, type G } from './model'

/**
 * Birim kare ("1 bütün") — anlamsal yakınlaştırma:
 *  - ×1: 10 dikey şerit (onda birler)
 *  - ×1,8’den sonra her şerit 10 hücreye ayrılır (yüzde birler)
 *  - ×8’den sonra (6. sınıf) her hücre 10 ince dilime ayrılır (binde birler)
 * Boyama, o anda görünen en küçük birimle yapılır: tek parmakla dokun/sürükle.
 * İki parmak: yakınlaştır + kaydır. Ctrl+tekerlek: yakınlaştır. Düğmeler: ±, düzey seçimi, kaydırma modu, mini harita.
 * Değer 1000 elemanlı dizi: indeks = şerit·100 + satır·10 + dilim (binde bir cinsinden).
 */

export const T2 = 1.8
export const T3 = 8
const LEVEL_S: Record<number, number> = { 1: 1, 2: 2.5, 3: 10 }

export const emptyShade = () => Array<boolean>(1000).fill(false)
export const countShade = (v: boolean[]) => v.reduce((s, b) => s + (b ? 1 : 0), 0)
/** İlk k binde biri sütun sütun doldur (şerit → hücre → dilim) */
export const fillFirst = (k: number) => {
  const v = emptyShade()
  for (let i = 0; i < k; i++) v[i] = true
  return v
}
export const levelOf = (s: number, maxLevel: 2 | 3) => (maxLevel === 3 && s >= T3 ? 3 : s >= T2 ? 2 : 1)

function unitsAt(px: number, py: number, lvl: number): [number, number] | null {
  if (px < 0 || py < 0 || px >= 1000 || py >= 1000) return null
  const i = Math.floor(px / 100), r = Math.floor(py / 100), k = Math.floor((px - i * 100) / 10)
  if (lvl === 1) return [i * 100, i * 100 + 100]
  const base = i * 100 + r * 10
  if (lvl === 2) return [base, base + 10]
  return [base + k, base + k + 1]
}

function ShadeRects({ value, color }: { value: boolean[]; color: string }) {
  const rects = useMemo(() => {
    const out: [number, number, number, number][] = []
    for (let i = 0; i < 10; i++) {
      let c = 0
      for (let j = 0; j < 100; j++) c += value[i * 100 + j] ? 1 : 0
      if (!c) continue
      if (c === 100) {
        out.push([i * 100, 0, 100, 1000])
        continue
      }
      for (let r = 0; r < 10; r++) {
        const b = i * 100 + r * 10
        let cc = 0
        for (let k = 0; k < 10; k++) cc += value[b + k] ? 1 : 0
        if (cc === 10) out.push([i * 100, r * 100, 100, 100])
        else for (let k = 0; k < 10; k++) if (value[b + k]) out.push([i * 100 + k * 10, r * 100, 10, 100])
      }
    }
    return out
  }, [value])
  return (
    <g fill={color}>
      {rects.map(([x, y, w, h]) => <rect key={`${x}-${y}-${w}`} x={x} y={y} width={w} height={h} />)}
    </g>
  )
}

const NS = { vectorEffect: 'non-scaling-stroke' as const }

export function ZoomSquare({
  value,
  onChange,
  maxLevel,
  g,
  locked,
  color = '#14b8a6',
  size = 'lg',
  onLevel,
  testid,
  disabledNote,
}: {
  value: boolean[]
  onChange?: (v: boolean[]) => void
  maxLevel: 2 | 3
  g: G
  locked?: boolean
  color?: string
  size?: 'lg' | 'md'
  onLevel?: (lvl: number) => void
  testid?: string
  /** Doluysa kare soluk ve dokunulmaz görünür (ör. "Önce tahmin et") */
  disabledNote?: string
}) {
  const gestRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const maxS = maxLevel === 3 ? 25 : 5
  const [view, setView] = useState({ s: 1, x: 0, y: 0 })
  const viewRef = useRef(view)
  viewRef.current = view
  const valRef = useRef(value)
  valRef.current = value
  const [pan, setPan] = useState(false)
  const lvl = levelOf(view.s, maxLevel)
  const canPaint = !!onChange && !locked && !disabledNote

  useEffect(() => {
    onLevel?.(lvl)
  }, [lvl, onLevel])

  const fit = (s: number, x: number, y: number) => {
    const ns = clamp(s, 1, maxS)
    const V = 1000 / ns
    return { s: ns, x: clamp(x, 0, 1000 - V), y: clamp(y, 0, 1000 - V) }
  }
  const zoomAt = (f: number, fx = 0.5, fy = 0.5) =>
    setView((c) => {
      const V = 1000 / c.s
      const px = c.x + fx * V, py = c.y + fy * V
      const ns = clamp(c.s * f, 1, maxS)
      const NV = 1000 / ns
      return fit(ns, px - fx * NV, py - fy * NV)
    })
  /** Düzey düğmesi: boyanan bölgenin sınırına (en son boyalı birime) odaklanarak yakınlaş */
  const toLevel = (l: number) => {
    const ns = LEVEL_S[l]
    const val = valRef.current
    let j = -1
    for (let q = 999; q >= 0; q--) if (val[q]) { j = q; break }
    setView((c) => {
      const V = 1000 / c.s
      let cx = c.x + V / 2, cy = c.y + V / 2
      if (j >= 0 && ns > 1) {
        const i = Math.floor(j / 100), r = Math.floor((j % 100) / 10), k = j % 10
        let stripFull = true, cellFull = true
        for (let q = i * 100; q < i * 100 + 100; q++) if (!val[q]) stripFull = false
        for (let q = i * 100 + r * 10; q < i * 100 + r * 10 + 10; q++) if (!val[q]) cellFull = false
        if (stripFull) { cx = (i + 1) * 100; cy = 500 }
        else if (cellFull) { cx = i * 100 + 50; cy = (r + 1) * 100 }
        else { cx = i * 100 + k * 10 + 10; cy = r * 100 + 50 }
      }
      const NV = 1000 / ns
      return fit(ns, cx - NV / 2, cy - NV / 2)
    })
  }

  // Kilitlenince (ör. kanıt tamamlanınca) bütünü göster
  const wasLocked = useRef(locked)
  useEffect(() => {
    if (locked && !wasLocked.current) setView({ s: 1, x: 0, y: 0 })
    wasLocked.current = locked
  }, [locked])

  const fromClient = (cx: number, cy: number) => {
    const r = svgRef.current!.getBoundingClientRect()
    const v = viewRef.current
    const V = 1000 / v.s
    return { px: v.x + ((cx - r.left) / r.width) * V, py: v.y + ((cy - r.top) / r.height) * V }
  }

  type Memo = { snap: boolean[]; work: boolean[] | null; cancel: boolean; mode: boolean | null; painted: boolean }

  useGesture(
    {
      onDrag: ({ xy: [cx, cy], delta: [dx, dy], first, pinching, touches, memo, event }) => {
        if (disabledNote) return memo
        let m = memo as Memo | undefined
        if (first || !m) m = { snap: valRef.current, work: null, cancel: false, mode: null, painted: false }
        if (m.cancel) return m
        if (pinching || touches > 1) {
          if (m.painted) onChange?.(m.snap)
          m.cancel = true
          return m
        }
        event.preventDefault?.()
        if (!canPaint || pan) {
          const r = svgRef.current!.getBoundingClientRect()
          const V = 1000 / viewRef.current.s
          setView((c) => fit(c.s, c.x - (dx * V) / r.width, c.y - (dy * V) / r.height))
          return m
        }
        const p = fromClient(cx, cy)
        const u = unitsAt(p.px, p.py, levelOf(viewRef.current.s, maxLevel))
        if (!u) return m
        const cur = m.work ?? valRef.current
        if (m.mode === null) {
          let all = true
          for (let k = u[0]; k < u[1]; k++) if (!cur[k]) all = false
          m.mode = !all
        }
        let changed = false
        const next = cur.slice()
        for (let k = u[0]; k < u[1]; k++)
          if (next[k] !== m.mode) {
            next[k] = m.mode
            changed = true
          }
        if (changed) {
          m.work = next
          m.painted = true
          onChange!(next)
        }
        return m
      },
      onPinch: ({ offset: [s], origin: [ox, oy], first, memo, event }) => {
        event?.preventDefault?.()
        if (disabledNote) return memo
        const r = svgRef.current!.getBoundingClientRect()
        let m = memo as { s0: number; p0: number; P: { x: number; y: number } } | undefined
        if (first || !m) {
          const v = viewRef.current
          const V = 1000 / v.s
          m = { s0: v.s, p0: s, P: { x: v.x + ((ox - r.left) / r.width) * V, y: v.y + ((oy - r.top) / r.height) * V } }
        }
        const ns = clamp((m.s0 * s) / m.p0, 1, maxS)
        const NV = 1000 / ns
        setView(fit(ns, m.P.x - ((ox - r.left) / r.width) * NV, m.P.y - ((oy - r.top) / r.height) * NV))
        return m
      },
      onWheel: ({ event, delta: [wx, wy] }) => {
        if (disabledNote) return
        const e = event as WheelEvent
        const r = svgRef.current!.getBoundingClientRect()
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          zoomAt(Math.exp(-wy * 0.004), (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)
        } else if (viewRef.current.s > 1.01) {
          e.preventDefault()
          const V = 1000 / viewRef.current.s
          setView((c) => fit(c.s, c.x + (wx * V) / r.width, c.y + (wy * V) / r.height))
        }
      },
    },
    { target: gestRef, eventOptions: { passive: false }, pinch: { scaleBounds: { min: 0.01, max: 100 } } },
  )

  const V = 1000 / view.s
  const hOp = clamp((view.s - 1.35) / (T2 - 1.35), 0, 1)
  const tOp = maxLevel === 3 ? clamp((view.s - 5) / (T3 - 5), 0, 1) : 0
  const zoomed = view.s > 1.05

  // mini harita: dokun/sürükle → görünümü oraya taşı
  const mini = useRef(false)
  const onMini = (e: RPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * 1000, py = ((e.clientY - r.top) / r.height) * 1000
    setView((c) => fit(c.s, px - 500 / c.s, py - 500 / c.s))
  }

  const width = size === 'lg' ? 'min(100%, 520px, max(270px, calc(100dvh - 330px)))' : 'min(100%, 340px)'

  return (
    <div className="mx-auto flex flex-col items-center gap-2" style={{ width }} data-testid={testid}>
      <div className="relative w-full rounded-[1.6rem] bg-[linear-gradient(160deg,#1e293b,#0f172a)] p-2 shadow-[0_10px_30px_-12px_#0f172a99] ring-1 ring-slate-700">
        <div
          ref={gestRef}
          className={`relative aspect-square w-full overflow-hidden rounded-[1.1rem] bg-white ${disabledNote ? 'opacity-50' : ''}`}
          style={{ touchAction: 'none', cursor: disabledNote ? 'default' : canPaint && !pan ? 'crosshair' : 'grab' }}
          data-handle
          data-testid={testid ? `${testid}-surface` : undefined}
          data-view={`${view.x},${view.y},${V}`}
        >
          <svg ref={svgRef} viewBox={`${view.x} ${view.y} ${V} ${V}`} preserveAspectRatio="none" className="block size-full" role="img" aria-label={`Birim kare, ${unitName(lvl)} düzeyi`}>
            <rect x={0} y={0} width={1000} height={1000} fill="#fff" />
            <ShadeRects value={value} color={color} />
            {tOp > 0 && (
              <g stroke="#64748b" strokeWidth={0.8} opacity={tOp}>
                {Array.from({ length: 10 }, (_, i) =>
                  Array.from({ length: 9 }, (_, k) => {
                    const x = i * 100 + (k + 1) * 10
                    if (x < view.x - 10 || x > view.x + V + 10) return null
                    return <line key={`t${i}-${k}`} x1={x} x2={x} y1={0} y2={1000} {...NS} />
                  }),
                )}
              </g>
            )}
            {hOp > 0 && (
              <g stroke="#475569" strokeWidth={1.3} opacity={hOp}>
                {Array.from({ length: 9 }, (_, r) => <line key={`h${r}`} x1={0} x2={1000} y1={(r + 1) * 100} y2={(r + 1) * 100} {...NS} />)}
              </g>
            )}
            <g stroke="#0f172a" strokeWidth={2.6}>
              {Array.from({ length: 9 }, (_, i) => <line key={`s${i}`} x1={(i + 1) * 100} x2={(i + 1) * 100} y1={0} y2={1000} {...NS} />)}
            </g>
            <rect x={0} y={0} width={1000} height={1000} fill="none" stroke="#0f172a" strokeWidth={5} {...NS} />
          </svg>
          {disabledNote && (
            <div className="absolute inset-0 grid place-items-center p-4">
              <span className="rounded-2xl bg-white/95 px-4 py-2 text-center text-sm font-black text-ink shadow ring-1 ring-line">{disabledNote}</span>
            </div>
          )}
        </div>

        {/* düzey rozeti */}
        <div className="pointer-events-none absolute top-3.5 left-3.5 rounded-xl bg-slate-900/85 px-2.5 py-1 text-[12px] font-black text-white shadow">
          ×{view.s.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} · {unitName(lvl)}
        </div>

      </div>

      {!disabledNote && (
        <div className="flex w-full flex-wrap items-center justify-center gap-1.5">
          {([1, 2, 3] as const).filter((l) => l <= maxLevel).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => toLevel(l)}
              aria-pressed={lvl === l}
              aria-label={`${unitName(l)} düzeyine yakınlaştır`}
              data-testid={testid ? `${testid}-lvl${l}` : undefined}
              className={`inline-flex min-h-12 min-w-12 items-center justify-center gap-1.5 rounded-xl px-2.5 text-sm font-black ring-1 transition active:scale-95 ${lvl === l ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-ink ring-line hover:bg-paper'}`}
            >
              <span className="text-base"><MathText text={unitSym(l, g)} /></span>
              {size === 'lg' && <span className={lvl === l ? 'text-slate-300' : 'text-ink-soft'}>{unitName(l)}</span>}
            </button>
          ))}
          <span className="mx-0.5 h-8 w-px bg-line" aria-hidden />
          <button type="button" onClick={() => zoomAt(1 / 1.6)} disabled={!zoomed} className="grid size-12 place-items-center rounded-xl bg-white ring-1 ring-line active:scale-95 disabled:opacity-40" aria-label="Uzaklaştır"><Minus size={20} /></button>
          <button type="button" onClick={() => zoomAt(1.6)} disabled={view.s >= maxS - 0.01} className="grid size-12 place-items-center rounded-xl bg-white ring-1 ring-line active:scale-95 disabled:opacity-40" aria-label="Yakınlaştır"><Plus size={20} /></button>
          {zoomed && canPaint && (
            <button type="button" onClick={() => setPan((p) => !p)} aria-pressed={pan} className={`grid size-12 place-items-center rounded-xl ring-1 active:scale-95 ${pan ? 'bg-amber-400 text-slate-900 ring-amber-500' : 'bg-white text-ink ring-line'}`} aria-label={pan ? 'Boyama moduna geç' : 'Kaydırma moduna geç'} title={pan ? 'Boya' : 'Kaydır'}>
              {pan ? <Paintbrush size={20} /> : <Hand size={20} />}
            </button>
          )}
          {canPaint && (
            <button type="button" onClick={() => onChange!(emptyShade())} className="grid size-12 place-items-center rounded-xl bg-white text-ink-soft ring-1 ring-line active:scale-95" aria-label="Temizle" data-testid={testid ? `${testid}-clear` : undefined}>
              <Eraser size={20} />
            </button>
          )}
          {zoomed && (
            <div
              className="size-12 touch-none overflow-hidden rounded-lg bg-white ring-2 ring-slate-900"
              onPointerDown={(e) => {
                mini.current = true
                e.currentTarget.setPointerCapture(e.pointerId)
                onMini(e)
              }}
              onPointerMove={(e) => mini.current && onMini(e)}
              onPointerUp={() => (mini.current = false)}
              role="button"
              aria-label="Mini harita: görmek istediğin yere dokun"
            >
              <svg viewBox="0 0 1000 1000" className="block size-full">
                <ShadeRects value={value} color={color} />
                {Array.from({ length: 9 }, (_, i) => <line key={i} x1={(i + 1) * 100} x2={(i + 1) * 100} y1={0} y2={1000} stroke="#334155" strokeWidth={16} />)}
                <rect x={view.x} y={view.y} width={V} height={V} fill="#f59e0b44" stroke="#d97706" strokeWidth={50} />
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
