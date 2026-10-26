import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useGesture } from '@use-gesture/react'
import { Maximize2, Minus, Plus } from 'lucide-react'
import { clamp, fmtTick, niceStep, ticks } from './axis'

/**
 * Anlamsal yakınlaştırmalı düzlem.
 *  - İki parmakla (pinch) ya da fare tekerleğiyle yakınlaştır: ölçek değişir, çentikler yeniden hesaplanır.
 *  - Boş alanı tek parmakla sürükle: kaydır.
 *  - Çift dokunuş ya da ⤢ düğmesi: başlangıç görünümü.
 * Çocuk bileşenler `usePlane()` ile ekran ↔ matematik koordinatı dönüşümlerine erişir.
 */

export interface View {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

export interface PlaneApi {
  view: View
  width: number
  height: number
  /** matematik → piksel */
  sx: (x: number) => number
  sy: (y: number) => number
  /** piksel → matematik */
  ix: (px: number) => number
  iy: (py: number) => number
  /** istemci (ekran) koordinatından matematik koordinatına */
  fromClient: (cx: number, cy: number) => { x: number; y: number }
  /** piksel başına birim */
  unitPx: number
  /** görünür adım (ızgara aralığı) */
  step: number
  svg: SVGSVGElement | null
}

const PlaneCtx = createContext<PlaneApi | null>(null)
export const usePlane = () => {
  const c = useContext(PlaneCtx)
  if (!c) throw new Error('usePlane yalnızca <Plane> içinde kullanılabilir')
  return c
}

export interface PlaneProps {
  initial: View
  /** 'x' : yalnız yatay eksen (sayı doğrusu), 'xy': koordinat düzlemi */
  mode?: 'x' | 'xy'
  /** Yükseklik / genişlik oranı (xy için). Varsayılan: kare */
  aspect?: number
  /** Yakınlaştırma sınırları (görünür x aralığı) */
  minSpan?: number
  maxSpan?: number
  grid?: boolean
  axes?: boolean
  labels?: boolean
  /** Eksen etiketleri */
  xLabel?: string
  yLabel?: string
  /** Yakınlaştırma/kaydırma kapalı */
  locked?: boolean
  /** Arka plana dokunuş (matematik koordinatı) */
  onTap?: (p: { x: number; y: number }) => void
  children?: ReactNode
  className?: string
  /** Erişilebilir ad */
  label?: string
  /** Sabit tamsayı adımı zorla (ör. ızgara her zaman 1) */
  fixedStep?: number
  /** Etiketli iki çentik arası en az kaç piksel (küçük = sık etiket) */
  tickPx?: number
  /** xy modunda false ise y ekseni x’ten bağımsız ölçeklenir (ör. deneme sayısı–olasılık grafikleri) */
  equalUnits?: boolean
  /** ± ve ⤢ düğmeleri (varsayılan: açık). Kapalıyken iki parmakla yakınlaştırma sürer. */
  controls?: boolean
  /** ± düğmeleri bu noktaya (matematik koordinatı) odaklanarak yakınlaştırır (ör. sürüklenen işaretçi) */
  zoomFocus?: { x: number; y?: number }
}

export function Plane({ initial, mode = 'xy', aspect, minSpan = 0.02, maxSpan = 2000, grid = true, axes = true, labels = true, xLabel, yLabel, locked, onTap, children, className = '', label = 'Etkileşimli grafik', fixedStep, tickPx, equalUnits = true, controls = true, zoomFocus }: PlaneProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [width, setWidth] = useState(360)
  const [view, setView] = useState<View>(initial)
  const initialRef = useRef(initial)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(Math.max(200, el.clientWidth)))
    ro.observe(el)
    setWidth(Math.max(200, el.clientWidth))
    return () => ro.disconnect()
  }, [])

  const height = mode === 'x' ? 150 : Math.round(width * (aspect ?? (initial.yMax - initial.yMin) / (initial.xMax - initial.xMin)))
  // xy modunda eşit ölçek: y aralığını genişliğe göre ayarla
  const v = useMemo<View>(() => {
    if (mode === 'x' || !equalUnits) return view
    const ppu = width / (view.xMax - view.xMin)
    const cy = (view.yMin + view.yMax) / 2
    const half = height / ppu / 2
    return { ...view, yMin: cy - half, yMax: cy + half }
  }, [view, width, height, mode, equalUnits])

  const unitPx = width / (v.xMax - v.xMin)
  const sx = useCallback((x: number) => ((x - v.xMin) / (v.xMax - v.xMin)) * width, [v, width])
  const sy = useCallback((y: number) => (mode === 'x' ? height * 0.58 : height - ((y - v.yMin) / (v.yMax - v.yMin)) * height), [v, height, mode])
  const ix = useCallback((px: number) => v.xMin + (px / width) * (v.xMax - v.xMin), [v, width])
  const iy = useCallback((py: number) => v.yMin + ((height - py) / height) * (v.yMax - v.yMin), [v, height])
  const fromClient = useCallback(
    (cx: number, cy: number) => {
      const r = svgRef.current?.getBoundingClientRect()
      if (!r) return { x: 0, y: 0 }
      return { x: ix(((cx - r.left) / r.width) * width), y: iy(((cy - r.top) / r.height) * height) }
    },
    [ix, iy, width, height],
  )

  const step = fixedStep ?? niceStep(v.xMax - v.xMin, width, tickPx ?? (mode === 'x' ? 56 : 40))

  /** Belirli bir istemci noktası etrafında ölçekle */
  const zoomAt = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      setView((cur) => {
        const span = cur.xMax - cur.xMin
        const nextSpan = clamp(span / factor, minSpan, maxSpan)
        const f = nextSpan / span
        const r = svgRef.current?.getBoundingClientRect()
        const px = r && cx !== undefined ? (cx - r.left) / r.width : 0.5
        const py = r && cy !== undefined ? (cy - r.top) / r.height : 0.5
        const ax = cur.xMin + px * span
        const vy0 = mode === 'x' ? cur.yMin : v.yMin
        const vy1 = mode === 'x' ? cur.yMax : v.yMax
        const ay = vy1 - py * (vy1 - vy0)
        return {
          xMin: ax - (ax - cur.xMin) * f,
          xMax: ax + (cur.xMax - ax) * f,
          yMin: ay - (ay - vy0) * f,
          yMax: ay + (vy1 - ay) * f,
        }
      })
    },
    [minSpan, maxSpan, mode, v.yMin, v.yMax],
  )

  const reset = () => setView(initialRef.current)
  /** Düğmeyle yakınlaştırma: zoomFocus varsa o noktayı sabit tutar */
  const zoomButton = (f: number) => {
    const r = svgRef.current?.getBoundingClientRect()
    if (!zoomFocus || !r) return zoomAt(f)
    const px = r.left + (sx(zoomFocus.x) / width) * r.width
    const py = r.top + ((zoomFocus.y === undefined ? height / 2 : sy(zoomFocus.y)) / height) * r.height
    zoomAt(f, px, py)
  }
  const lastPinch = useRef(1)

  useGesture(
    {
      onDrag: ({ delta: [dx, dy], pinching, tap, event, first, memo }) => {
        if (tap) {
          const e = event as PointerEvent
          if (onTap && !(e.target as Element).closest('[data-handle], button')) onTap(fromClient(e.clientX, e.clientY))
          return
        }
        if (locked || pinching) return memo
        if (first && (event.target as Element).closest('[data-handle]')) return 'skip'
        if (memo === 'skip') return memo
        const r = svgRef.current?.getBoundingClientRect()
        if (!r) return memo
        const ux = ((v.xMax - v.xMin) / r.width) * dx
        const uy = ((v.yMax - v.yMin) / r.height) * dy
        setView((cur) => ({ xMin: cur.xMin - ux, xMax: cur.xMax - ux, yMin: cur.yMin + (mode === 'x' ? 0 : uy), yMax: cur.yMax + (mode === 'x' ? 0 : uy) }))
        return memo
      },
      onPinch: ({ offset: [s], origin: [ox, oy], first, event }) => {
        if (locked) return
        event?.preventDefault?.()
        if (first) lastPinch.current = s
        const f = s / lastPinch.current
        lastPinch.current = s
        if (Math.abs(f - 1) > 0.001) zoomAt(f, ox, oy)
      },
      onWheel: ({ event, delta: [, dy] }) => {
        if (locked) return
        const e = event as WheelEvent
        if (!e.ctrlKey && !e.metaKey && mode === 'xy') return
        e.preventDefault()
        zoomAt(Math.exp(-dy * 0.0025), e.clientX, e.clientY)
      },
      onDoubleClick: () => !locked && reset(),
    },
    { target: wrapRef, eventOptions: { passive: false }, drag: { filterTaps: true }, pinch: { scaleBounds: { min: 0.05, max: 40 } } },
  )

  const api: PlaneApi = { view: v, width, height, sx, sy, ix, iy, fromClient, unitPx, step, svg: svgRef.current }
  const xt = ticks(v.xMin, v.xMax, step)
  const yStep = equalUnits ? step : niceStep(v.yMax - v.yMin, height, tickPx ?? 34)
  const yt = mode === 'xy' ? ticks(v.yMin, v.yMax, yStep) : []
  const minor = step / (String(step).startsWith('2') ? 4 : 5)
  const showMinor = grid && unitPx * minor > 9
  const y0 = mode === 'x' ? height * 0.58 : clamp(sy(0), 0, height)
  const x0 = clamp(sx(0), 0, width)

  return (
    <div className={`relative select-none ${className}`}>
      <div ref={wrapRef} className="relative overflow-hidden rounded-2xl bg-white ring-1 ring-line" style={{ touchAction: 'none' }}>
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label={label} className="block">
          {grid && mode === 'xy' && (
            <g>
              {showMinor && ticks(v.xMin, v.xMax, minor).map((t) => <line key={`mx${t}`} x1={sx(t)} x2={sx(t)} y1={0} y2={height} stroke="#f1f2f7" />)}
              {showMinor && equalUnits && ticks(v.yMin, v.yMax, minor).map((t) => <line key={`my${t}`} y1={sy(t)} y2={sy(t)} x1={0} x2={width} stroke="#f1f2f7" />)}
              {xt.map((t) => <line key={`gx${t}`} x1={sx(t)} x2={sx(t)} y1={0} y2={height} stroke="#e3e5ef" />)}
              {yt.map((t) => <line key={`gy${t}`} y1={sy(t)} y2={sy(t)} x1={0} x2={width} stroke="#e3e5ef" />)}
            </g>
          )}
          {axes && (
            <g>
              <line x1={0} x2={width} y1={y0} y2={y0} stroke="#1f2340" strokeWidth={mode === 'x' ? 3 : 1.6} />
              {mode === 'xy' && <line y1={0} y2={height} x1={x0} x2={x0} stroke="#1f2340" strokeWidth={1.6} />}
              {mode === 'x' && showMinor && ticks(v.xMin, v.xMax, minor).map((t) => <line key={`m${t}`} x1={sx(t)} x2={sx(t)} y1={y0 - 5} y2={y0 + 5} stroke="#8a8fb0" strokeWidth={1} />)}
              {xt.map((t) => (
                <g key={`tx${t}`}>
                  <line x1={sx(t)} x2={sx(t)} y1={y0 - (mode === 'x' ? 10 : 4)} y2={y0 + (mode === 'x' ? 10 : 4)} stroke="#1f2340" strokeWidth={mode === 'x' ? 2 : 1.2} />
                  {labels && (mode === 'x' || Math.abs(t) > 1e-9) && (
                    <text x={sx(t)} y={mode === 'x' ? y0 + 30 : clamp(y0 + 15, 12, height - 4)} textAnchor="middle" fontSize={mode === 'x' ? 15 : 11} fontWeight={800} fill="#1f2340">{fmtTick(t, step)}</text>
                  )}
                </g>
              ))}
              {mode === 'xy' && labels && yt.map((t) => Math.abs(t) > 1e-9 && (
                <text key={`ty${t}`} x={clamp(x0 - 6, 22, width - 4)} y={sy(t) + 4} textAnchor="end" fontSize={11} fontWeight={800} fill="#1f2340">{fmtTick(t, yStep)}</text>
              ))}
              {xLabel && <text x={width - 8} y={clamp(y0 - 8, 14, height - 6)} textAnchor="end" fontSize={13} fontWeight={900} fill="#1f2340">{xLabel}</text>}
              {yLabel && mode === 'xy' && <text x={clamp(x0 + 8, 8, width - 40)} y={16} fontSize={13} fontWeight={900} fill="#1f2340">{yLabel}</text>}
            </g>
          )}
          <PlaneCtx.Provider value={api}>{children}</PlaneCtx.Provider>
        </svg>
        {!locked && controls && (
          <div className={`absolute right-2 flex gap-1 ${mode === 'x' ? 'top-2' : 'bottom-2'}`}>
            <button type="button" onClick={() => zoomButton(1.5)} className="grid size-10 place-items-center rounded-xl bg-white/90 shadow ring-1 ring-line active:scale-95" aria-label="Yakınlaştır"><Plus size={18} /></button>
            <button type="button" onClick={() => zoomButton(1 / 1.5)} className="grid size-10 place-items-center rounded-xl bg-white/90 shadow ring-1 ring-line active:scale-95" aria-label="Uzaklaştır"><Minus size={18} /></button>
            <button type="button" onClick={reset} className="grid size-10 place-items-center rounded-xl bg-white/90 shadow ring-1 ring-line active:scale-95" aria-label="Başlangıç görünümü"><Maximize2 size={16} /></button>
          </div>
        )}
      </div>
      {!locked && <p className="mt-1.5 text-center text-xs font-bold text-ink-soft">İki parmakla yakınlaştır, boş alanı sürükleyerek kaydır.</p>}
    </div>
  )
}

/**
 * Düzlemde sürüklenebilir nokta. `snapStep` verilirse o adıma yapışır.
 */
export function DragPoint({ x, y, onChange, color = '#d6457a', r = 11, label, snapStep, constrain, disabled }: { x: number; y: number; onChange?: (p: { x: number; y: number }) => void; color?: string; r?: number; label?: string; snapStep?: number; constrain?: (p: { x: number; y: number }) => { x: number; y: number }; disabled?: boolean }) {
  const P = usePlane()
  const ref = useRef<SVGGElement>(null)
  useGesture(
    {
      onDrag: ({ xy: [cx, cy], event }) => {
        event.stopPropagation()
        if (disabled || !onChange) return
        let p = P.fromClient(cx, cy)
        if (snapStep) p = { x: Math.round(p.x / snapStep) * snapStep, y: Math.round(p.y / snapStep) * snapStep }
        if (constrain) p = constrain(p)
        onChange(p)
      },
    },
    { target: ref, eventOptions: { passive: false } },
  )
  return (
    <g ref={ref} data-handle style={{ cursor: disabled ? 'default' : 'grab', touchAction: 'none' }}>
      <circle cx={P.sx(x)} cy={P.sy(y)} r={r + 12} fill="transparent" />
      <circle cx={P.sx(x)} cy={P.sy(y)} r={r} fill={color} stroke="#fff" strokeWidth={3} />
      {label && <text x={P.sx(x) + r + 4} y={P.sy(y) - r} fontSize={14} fontWeight={900} fill={color}>{label}</text>}
    </g>
  )
}

/**
 * İki parmakla ölçeklenebilen nesne sarmalayıcısı: nesnenin üzerinde pinch yapılınca onScale(çarpan) çağrılır,
 * düzlem yakınlaşmaz. Tek parmakla sürüklenirse onMove(dx, dy) matematik biriminde çağrılır.
 */
export function Pinchable({ onScale, onMove, onRotate, onEnd, children }: { onScale?: (factor: number) => void; onMove?: (dx: number, dy: number) => void; onRotate?: (deg: number) => void; /** sürükleme ya da iki parmak hareketi bitince */ onEnd?: () => void; children: ReactNode }) {
  const P = usePlane()
  const ref = useRef<SVGGElement>(null)
  const last = useRef({ s: 1, a: 0 })
  useGesture(
    {
      onPinch: ({ offset: [s, a], first, last: ended, event }) => {
        event?.preventDefault?.()
        event?.stopPropagation?.()
        if (ended) {
          onEnd?.()
          return
        }
        if (first) last.current = { s, a }
        const f = s / last.current.s
        const da = a - last.current.a
        last.current = { s, a }
        if (onScale && Math.abs(f - 1) > 0.002) onScale(f)
        if (onRotate && Math.abs(da) > 0.2) onRotate(da)
      },
      onDrag: ({ delta: [dx, dy], pinching, last: ended, event }) => {
        event.stopPropagation()
        if (ended && !pinching) onEnd?.()
        if (pinching || !onMove) return
        onMove(dx / P.unitPx, -dy / P.unitPx)
      },
    },
    { target: ref, eventOptions: { passive: false } },
  )
  return (
    <g ref={ref} data-handle style={{ touchAction: 'none', cursor: onMove ? 'move' : 'default' }}>
      {children}
    </g>
  )
}
