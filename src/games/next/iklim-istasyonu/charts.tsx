import { useRef, useState, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'
import { ChevronsDown, ChevronsUp, Minus, Plus } from 'lucide-react'
import { DragPoint, Plane, usePlane, type PlaneApi } from '../../../interactive/Plane'
import { ZoomBox } from '../../../interactive/ZoomBox'
import { clamp, niceStep, ticks } from '../../../interactive/axis'
import { WxIcon, wxColor, type Wx } from './art'
import { Chip, MEAN, MEDIAN, ToolBtn, ekS, f, useW, type Ink } from './ui'

/**
 * İklim İstasyonu — dokunmatik grafikler.
 * Her sürüklemenin dokun-dokun alternatifi vardır (yüksekliğe dokun, ± düğmeleri, önce kaynağa sonra hedefe dokun).
 * Sürüklenebilir parçalar data-handle taşır; touch-action: none SVG’yi saran HTML öğesindedir.
 */

const r2 = (v: number) => Math.round(v * 100) / 100

/** İstemci y’sini SVG viewBox y’sine çevirir (ZoomBox ölçeği dahil) */
function localY(svg: SVGSVGElement | null, H: number, cy: number) {
  const r = svg?.getBoundingClientRect()
  if (!r || !r.height) return 0
  return (cy - r.top) * (H / r.height)
}
function localX(svg: SVGSVGElement | null, W: number, cx: number) {
  const r = svg?.getBoundingClientRect()
  if (!r || !r.width) return 0
  return (cx - r.left) * (W / r.width)
}

function barPath(x: number, y: number, w: number, base: number, r = 6) {
  const h = base - y
  if (h <= 0.5) return ''
  const rr = Math.min(r, h, w / 2)
  return `M${x} ${base}V${y + rr}Q${x} ${y} ${x + rr} ${y}H${x + w - rr}Q${x + w} ${y} ${x + w} ${y + rr}V${base}Z`
}

/* ═══════════════ Sütun grafiği: oluştur (sürükle / dokun / ±) ya da oku (karşılaştırma çizgisi) ═══════════════ */

export interface BarCat {
  label: string
  wx?: Wx
  color?: string
}

function BarHit({ x, w, top, bottom, onSet, label, value, onSel }: { x: number; w: number; top: number; bottom: number; onSet: (cy: number) => void; label: string; value: number; onSel: () => void }) {
  const bind = useDrag(({ xy: [, cy], event, first }) => {
    event.stopPropagation()
    if (first) onSel()
    onSet(cy)
  }, { filterTaps: false })
  return (
    <g {...bind()} data-handle style={{ cursor: 'ns-resize', touchAction: 'none' }} role="slider" aria-label={`${label} sütunu`} aria-valuenow={value}>
      <rect x={x} y={top} width={w} height={bottom - top + 8} fill="transparent" />
    </g>
  )
}

export function BarChart({ ink, cats, series, max, step, labelStep, edit, hl = [], refTap, showValues = true, unit, title }: {
  ink: Ink
  cats: BarCat[]
  series: { name?: string; color?: string; values: number[] }[]
  max: number
  /** ızgara çizgisi aralığı (veri birimi) */
  step: number
  labelStep?: number
  edit?: { onChange: (i: number, v: number) => void; snap: number }
  hl?: number[]
  /** Sütuna dokununca tepesinden yatay karşılaştırma çizgisi çiz */
  refTap?: boolean
  showValues?: boolean
  unit?: string
  title?: ReactNode
}) {
  const [ref, w] = useW<HTMLDivElement>()
  const svgRef = useRef<SVGSVGElement>(null)
  const [sel, setSel] = useState(0)
  const [refV, setRefV] = useState<{ v: number; c: string } | null>(null)
  const H = Math.round(clamp(w * 0.56, 250, 340))
  const pad = { l: 42, r: 12, t: 24, b: cats.some((c) => c.wx) ? 60 : 34 }
  const pw = w - pad.l - pad.r
  const ph = H - pad.t - pad.b
  const base = pad.t + ph
  const Y = (v: number) => base - (clamp(v, 0, max) / max) * ph
  const n = cats.length
  const slot = pw / n
  const S = series.length
  const bw = S > 1 ? Math.min(40, (slot * 0.78) / S) : Math.min(68, slot * 0.56)
  const ls = labelStep ?? step
  const lines = ticks(0, max, step)
  const setAt = (i: number, cy: number) => {
    if (!edit) return
    const y = localY(svgRef.current, H, cy)
    const raw = ((base - y) / ph) * max
    const v = r2(clamp(Math.round(raw / edit.snap) * edit.snap, 0, max))
    edit.onChange(i, v)
  }
  const nudgeSel = (d: number) => {
    if (!edit) return
    const v = r2(clamp(series[0].values[sel] + d * edit.snap, 0, max))
    edit.onChange(sel, v)
  }
  const colorOf = (s: number, i: number) => (S > 1 ? series[s].color ?? '#0891b2' : cats[i].wx ? wxColor(cats[i].wx!, ink.dark) : cats[i].color ?? '#0891b2')

  return (
    <div>
      {(title || S > 1) && (
        <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
          {title && <p className="mr-auto text-sm font-black" style={{ color: ink.text }}>{title}</p>}
          {S > 1 && series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5 text-sm font-extrabold" style={{ color: ink.text }}><span className="size-3.5 rounded" style={{ background: s.color }} />{s.name}</span>
          ))}
        </div>
      )}
      <ZoomBox controls={false} maxScale={3}>
        <div ref={ref} className="select-none" style={{ touchAction: 'none' }}>
          <svg ref={svgRef} viewBox={`0 0 ${w} ${H}`} width="100%" height={H} role="img" aria-label={`Sütun grafiği: ${cats.map((c, i) => `${c.label} ${series.map((s) => f(s.values[i])).join(' ve ')}`).join(', ')}`} className="block">
            {lines.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={w - pad.r} y1={Y(t)} y2={Y(t)} stroke={ink.grid} strokeWidth={t === 0 ? 0 : 1} strokeDasharray={Math.abs(t / ls - Math.round(t / ls)) < 1e-6 ? undefined : '3 4'} />
                {Math.abs(t / ls - Math.round(t / ls)) < 1e-6 && <text x={pad.l - 7} y={Y(t) + 4} textAnchor="end" fontSize={12} fontWeight={800} fill={ink.soft}>{f(t)}</text>}
              </g>
            ))}
            {unit && <text x={pad.l - 7} y={pad.t - 10} textAnchor="end" fontSize={11} fontWeight={900} fill={ink.soft}>{unit}</text>}
            <line x1={pad.l} x2={pad.l} y1={pad.t - 4} y2={base} stroke={ink.axis} strokeWidth={1.6} />
            <line x1={pad.l} x2={w - pad.r} y1={base} y2={base} stroke={ink.axis} strokeWidth={1.6} />
            {cats.map((c, i) => {
              const cx = pad.l + slot * (i + 0.5)
              const isHl = hl.includes(i)
              const groupW = bw * S + (S - 1) * 4
              return (
                <g key={c.label}>
                  {series.map((s, k) => {
                    const v = s.values[i]
                    const x = cx - groupW / 2 + k * (bw + 4)
                    const y = Y(v)
                    const col = colorOf(k, i)
                    const active = edit && sel === i
                    return (
                      <g key={k} onClick={refTap ? () => setRefV((cur) => (cur && cur.v === v && cur.c === col ? null : { v, c: col })) : undefined} style={{ cursor: refTap ? 'pointer' : undefined }} data-handle={refTap ? true : undefined}>
                        {refTap && <rect x={x - 6} y={pad.t} width={bw + 12} height={ph} fill="transparent" />}
                        <path d={barPath(x, y, bw, base)} fill={col} opacity={edit && !active ? 0.82 : 1} style={{ transition: edit ? undefined : 'd 200ms' }} />
                        {v > 0 && <path d={barPath(x + 3, y + 3, Math.max(0, bw * 0.22), base - 2, 3)} fill="#fff" opacity={0.22} />}
                        {isHl && <rect x={x - 4} y={y - 4} width={bw + 8} height={base - y + 4} rx={8} fill="none" stroke="#f59e0b" strokeWidth={3} strokeDasharray="6 4" className="ii-pulse" />}
                        {edit && (
                          <g pointerEvents="none">
                            <rect x={x - 2} y={y - 7} width={bw + 4} height={12} rx={6} fill={active ? (ink.dark ? '#22d3ee' : '#0891b2') : ink.dark ? '#cbd5e1' : '#475569'} />
                            <path d={`M${x + bw / 2 - 8} ${y - 1}h16M${x + bw / 2 - 8} ${y + 2}h16`} stroke={ink.dark ? '#0b1324' : '#fff'} strokeWidth={1.4} strokeLinecap="round" />
                          </g>
                        )}
                        {showValues && (v > 0 || edit) && <text x={x + bw / 2} y={y - (edit ? 13 : 7)} textAnchor="middle" fontSize={S > 1 ? 12 : 14} fontWeight={900} fill={ink.text} pointerEvents="none">{f(v)}</text>}
                      </g>
                    )
                  })}
                  {edit && <BarHit x={cx - Math.max(bw, 44) / 2 - 8} w={Math.max(bw, 44) + 16} top={pad.t - 12} bottom={base} label={c.label} value={series[0].values[i]} onSel={() => setSel(i)} onSet={(cy) => setAt(i, cy)} />}
                  {c.wx && <WxIcon w={c.wx} x={cx - 12} y={base + 9} size={24} />}
                  <text x={cx} y={base + (c.wx ? 50 : 20)} textAnchor="middle" fontSize={n > 4 && w < 420 ? 11 : 13} fontWeight={800} fill={sel === i && edit ? (ink.dark ? '#22d3ee' : '#0e7490') : ink.text} onClick={edit ? () => setSel(i) : undefined}>{c.label}</text>
                </g>
              )
            })}
            {refV && (
              <g pointerEvents="none" className="animate-fade-up">
                <line x1={pad.l} x2={w - pad.r} y1={Y(refV.v)} y2={Y(refV.v)} stroke={refV.c} strokeWidth={2.2} strokeDasharray="7 5" />
                <rect x={w - pad.r - 50} y={Y(refV.v) - 22} width={48} height={18} rx={6} fill={refV.c} />
                <text x={w - pad.r - 26} y={Y(refV.v) - 9} textAnchor="middle" fontSize={12} fontWeight={900} fill="#fff">{f(refV.v)}</text>
              </g>
            )}
          </svg>
        </div>
      </ZoomBox>
      {edit && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <ToolBtn ink={ink} onClick={() => nudgeSel(-1)} label="Sütunu kısalt"><Minus size={18} /></ToolBtn>
          <span className="flex flex-wrap justify-center gap-1">
            {cats.map((c, i) => (
              <button key={c.label} type="button" onClick={() => setSel(i)} aria-pressed={sel === i} className={`min-h-12 rounded-xl px-2.5 text-sm font-extrabold ring-1 transition ${sel === i ? (ink.dark ? 'bg-cyan-500 text-slate-950 ring-cyan-400' : 'bg-cyan-600 text-white ring-cyan-600') : ink.dark ? 'bg-slate-800 text-slate-200 ring-slate-600' : 'bg-white text-ink ring-line'}`}>
                {c.label}
              </button>
            ))}
          </span>
          <ToolBtn ink={ink} onClick={() => nudgeSel(1)} label="Sütunu uzat"><Plus size={18} /></ToolBtn>
        </div>
      )}
      {refTap && <p className="mt-1 text-center text-xs font-bold" style={{ color: ink.soft }}>{refV ? 'Kesikli çizgi sütunun tepesinden geçiyor. Başka bir sütuna dokunarak karşılaştır.' : 'Bir sütuna dokun: tepesinden karşılaştırma çizgisi çekilir.'}</p>}
      {edit && <p className="mt-1 text-center text-xs font-bold" style={{ color: ink.soft }}>Sütunun tepesini sürükle, istediğin yüksekliğe dokun ya da − / + kullan. İki parmakla yakınlaştırabilirsin.</p>}
    </div>
  )
}

/* ═══════════════ Yağmur ölçer kuleleri: blok taşı (dengele) ya da yükseklik ayarla ═══════════════ */

export function Towers({ ink, labels, values, max, mode, onMove, onSet, meanLine, unit = 'mm', showExcess }: {
  ink: Ink
  labels: string[]
  values: number[]
  max: number
  mode: 'move' | 'set' | 'view'
  onMove?: (from: number, to: number) => void
  onSet?: (i: number, v: number) => void
  meanLine?: number
  unit?: string
  showExcess?: boolean
}) {
  const [ref, w] = useW<HTMLDivElement>()
  const svgRef = useRef<SVGSVGElement>(null)
  const [sel, setSel] = useState<number | null>(mode === 'set' ? 0 : null)
  const [drag, setDrag] = useState<{ from: number; x: number; y: number } | null>(null)
  const n = values.length
  const H = Math.round(clamp(w * 0.55, 250, 330))
  const pad = { t: 26, b: 40, l: 34, r: 8 }
  const ph = H - pad.t - pad.b
  const base = pad.t + ph
  const slot = (w - pad.l - pad.r) / n
  const tw = Math.min(58, slot * 0.58)
  const cube = ph / max
  const colX = (i: number) => pad.l + slot * (i + 0.5)
  const Y = (v: number) => base - v * cube
  const colAt = (cx: number) => clamp(Math.floor((localX(svgRef.current, w, cx) - pad.l) / slot), 0, n - 1)

  const bindMove = useDrag(({ first, last, xy: [cx, cy], tap, event, args: [i] }) => {
    if (mode !== 'move') return
    event.stopPropagation()
    if (tap) {
      if (sel === null) setSel(values[i] >= 1 ? i : null)
      else {
        if (sel !== i) onMove?.(sel, i)
        setSel(null)
      }
      return
    }
    const r = svgRef.current?.getBoundingClientRect()
    const k = r ? w / r.width : 1
    const p = { x: r ? (cx - r.left) * k : 0, y: r ? (cy - r.top) * k : 0 }
    if (first && values[i] >= 1) setDrag({ from: i, ...p })
    else if (drag) setDrag({ ...drag, ...p })
    if (last && drag) {
      const to = colAt(cx)
      if (to !== drag.from) onMove?.(drag.from, to)
      setDrag(null)
      setSel(null)
    }
  }, { filterTaps: true })

  const bindSet = useDrag(({ xy: [, cy], event, args: [i], first }) => {
    if (mode !== 'set') return
    event.stopPropagation()
    if (first) setSel(i)
    const y = localY(svgRef.current, H, cy)
    onSet?.(i, clamp(Math.round((base - y) / cube), 0, max))
  }, { filterTaps: false })

  const water = ink.dark ? ['#38bdf8', '#0ea5e9'] : ['#7dd3fc', '#0ea5e9']
  return (
    <div>
      <ZoomBox controls={false} maxScale={3}>
        <div ref={ref} className="select-none" style={{ touchAction: 'none' }}>
          <svg ref={svgRef} viewBox={`0 0 ${w} ${H}`} width="100%" height={H} role="img" aria-label={`Yağmur ölçerler: ${labels.map((l, i) => `${l} ${f(values[i])} ${unit}`).join(', ')}`} className="block">
            <defs>
              <linearGradient id="ii-water" x1="0" x2="1">
                <stop offset="0" stopColor={water[0]} />
                <stop offset="1" stopColor={water[1]} />
              </linearGradient>
              <pattern id="ii-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="#f59e0b" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="#fde68a" strokeWidth="3" />
              </pattern>
            </defs>
            {ticks(0, max, max > 12 ? 2 : 1).map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={w - pad.r} y1={Y(t)} y2={Y(t)} stroke={ink.grid} strokeDasharray={t % 2 ? '2 5' : undefined} />
                {t % 2 === 0 && <text x={pad.l - 6} y={Y(t) + 4} textAnchor="end" fontSize={11} fontWeight={800} fill={ink.soft}>{t}</text>}
              </g>
            ))}
            <text x={pad.l - 6} y={pad.t - 12} textAnchor="end" fontSize={11} fontWeight={900} fill={ink.soft}>{unit}</text>
            <line x1={pad.l} x2={w - pad.r} y1={base} y2={base} stroke={ink.axis} strokeWidth={1.6} />
            {values.map((v, i) => {
              const x = colX(i) - tw / 2
              const whole = Math.floor(v + 1e-9)
              const frac = r2(v - whole)
              const lifted = drag?.from === i
              const isSel = sel === i
              const handlers = mode === 'move' ? bindMove(i) : mode === 'set' ? bindSet(i) : {}
              return (
                <g key={i} {...handlers} data-handle={mode !== 'view' ? true : undefined} style={{ cursor: mode === 'move' ? 'grab' : mode === 'set' ? 'ns-resize' : 'default', touchAction: 'none' }} role={mode === 'view' ? undefined : mode === 'set' ? 'slider' : 'button'} aria-label={`${labels[i]}: ${f(v)} ${unit}`}>
                  <rect x={colX(i) - slot / 2 + 3} y={pad.t - 18} width={slot - 6} height={ph + 18 + 36} rx={12} fill={isSel ? (ink.dark ? '#22d3ee22' : '#cffafe') : 'transparent'} />
                  {/* cam tüp */}
                  <rect x={x - 3} y={pad.t - 6} width={tw + 6} height={ph + 6} rx={8} fill={ink.dark ? '#0f1c33' : '#f0f9ff'} stroke={ink.dark ? '#3b5277' : '#bae6fd'} strokeWidth={2} />
                  {Array.from({ length: whole }, (_, k) => {
                    const top = Y(k + 1)
                    const over = showExcess && meanLine !== undefined && k + 1 > meanLine + 1e-9
                    const fade = lifted && k === whole - 1
                    return <rect key={k} x={x + 1} y={top + 1} width={tw - 2} height={cube - 2} rx={3} fill={over ? 'url(#ii-hatch)' : 'url(#ii-water)'} opacity={fade ? 0.25 : 1} style={{ transition: 'y 200ms' }} />
                  })}
                  {frac > 0 && <rect x={x + 1} y={Y(whole + frac) + 1} width={tw - 2} height={cube * frac - 2} rx={3} fill="url(#ii-water)" stroke="#fff" strokeDasharray="3 2" className="animate-pop" />}
                  {showExcess && meanLine !== undefined && v < meanLine - 1e-9 && (
                    <rect x={x + 1} y={Y(meanLine) + 1} width={tw - 2} height={(meanLine - v) * cube - 2} rx={3} fill="none" stroke={MEAN} strokeWidth={1.8} strokeDasharray="5 4" />
                  )}
                  <text x={colX(i)} y={Y(v) - 10} textAnchor="middle" fontSize={14} fontWeight={900} fill={ink.text}>{f(v)}</text>
                  <text x={colX(i)} y={base + 22} textAnchor="middle" fontSize={13} fontWeight={800} fill={ink.text}>{labels[i]}</text>
                </g>
              )
            })}
            {meanLine !== undefined && (
              <g pointerEvents="none">
                <line x1={pad.l} x2={w - pad.r} y1={Y(meanLine)} y2={Y(meanLine)} stroke={MEAN} strokeWidth={2.2} strokeDasharray="8 5" />
                <rect x={w - pad.r - 92} y={Y(meanLine) - 21} width={90} height={18} rx={6} fill={MEAN} />
                <text x={w - pad.r - 47} y={Y(meanLine) - 8} textAnchor="middle" fontSize={11.5} fontWeight={900} fill="#fff">ortalama {f(meanLine)}</text>
              </g>
            )}
            {drag && <rect x={drag.x - tw / 2} y={drag.y - cube / 2} width={tw - 2} height={cube - 2} rx={3} fill="url(#ii-water)" stroke="#fff" strokeWidth={2} pointerEvents="none" />}
          </svg>
        </div>
      </ZoomBox>
      {mode === 'set' && sel !== null && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <ToolBtn ink={ink} onClick={() => onSet?.(sel, clamp(values[sel] - 1, 0, max))} label="1 mm azalt"><Minus size={18} /></ToolBtn>
          <span className="flex flex-wrap justify-center gap-1">
            {labels.map((l, i) => (
              <button key={l} type="button" onClick={() => setSel(i)} aria-pressed={sel === i} className={`min-h-12 min-w-12 rounded-xl px-2 text-sm font-extrabold ring-1 ${sel === i ? (ink.dark ? 'bg-cyan-500 text-slate-950 ring-cyan-400' : 'bg-cyan-600 text-white ring-cyan-600') : ink.dark ? 'bg-slate-800 text-slate-200 ring-slate-600' : 'bg-white text-ink ring-line'}`}>{l}</button>
            ))}
          </span>
          <ToolBtn ink={ink} onClick={() => onSet?.(sel, clamp(values[sel] + 1, 0, max))} label="1 mm artır"><Plus size={18} /></ToolBtn>
        </div>
      )}
      {mode === 'move' && <p className="mt-1 text-center text-xs font-bold" style={{ color: ink.soft }}>{sel !== null ? `${labels[sel]} seçildi: bloğu taşımak istediğin tüpe dokun.` : 'Bir tüpten ötekine blok sürükle ya da önce kaynağa, sonra hedefe dokun.'}</p>}
      {mode === 'set' && <p className="mt-1 text-center text-xs font-bold" style={{ color: ink.soft }}>Tüpü sürükleyerek doldur, istediğin yüksekliğe dokun ya da − / + kullan.</p>}
    </div>
  )
}

/* ═══════════════ Çizgi grafiği (Plane, bağımsız y ölçeği) ═══════════════ */

export interface LineProps {
  ink: Ink
  xs: number[]
  xLabels: string[]
  ys: (number | null)[]
  editable?: boolean[]
  onSet?: (i: number, y: number) => void
  view: { xMin: number; xMax: number; yMin: number; yMax: number }
  yUnit?: string
  seg?: { onTap: (i: number) => void; state?: Record<number, 'ok' | 'no'> }
  hlPts?: number[]
  extra?: (P: PlaneApi) => ReactNode
  aspect?: number
  color?: string
  /** Boş alana dokununca (seçili / en yakın düzenlenebilir noktayı ayarla) */
  tapSets?: boolean
  label?: string
}

function LineLayer({ ink, xs, xLabels, ys, editable, onSet, view, yUnit, seg, hlPts = [], extra, color, sel, setSel }: LineProps & { sel: number | null; setSel: (i: number) => void }) {
  const P = usePlane()
  const v = P.view
  const yStep = niceStep(v.yMax - v.yMin, P.height, 34)
  const yt = ticks(v.yMin, v.yMax, yStep)
  const col = color ?? (ink.dark ? '#22d3ee' : '#0891b2')
  const pts = xs.map((x, i) => ({ x, y: ys[i], i }))
  const zeroIn = v.yMin < 0 && v.yMax > 0
  return (
    <g className="ii-own">
      {zeroIn && (
        <g pointerEvents="none">
          <line x1={0} x2={P.width} y1={P.sy(0)} y2={P.sy(0)} stroke={ink.dark ? '#7dd3fc' : '#0369a1'} strokeWidth={2} opacity={0.55} />
          <text x={P.width - 6} y={P.sy(0) - 6} textAnchor="end" fontSize={11} fontWeight={900} fill={ink.dark ? '#7dd3fc' : '#0369a1'}>0 {yUnit}</text>
        </g>
      )}
      {yt.map((t) => (
        <g key={t} pointerEvents="none">
          <rect x={2} y={P.sy(t) - 9} width={34} height={17} rx={5} fill={ink.dark ? '#0b1324' : '#ffffff'} opacity={0.85} />
          <text x={32} y={P.sy(t) + 4} textAnchor="end" fontSize={11.5} fontWeight={800} fill={ink.dark ? '#cbd5e1' : '#1f2340'}>{f(t)}</text>
        </g>
      ))}
      {yUnit && <text x={40} y={14} fontSize={12} fontWeight={900} fill={ink.dark ? '#94a3b8' : '#5b6080'} pointerEvents="none">{yUnit}</text>}
      {pts.map((p) => (
        <g key={`xl${p.i}`} pointerEvents="none">
          <line x1={P.sx(p.x)} x2={P.sx(p.x)} y1={0} y2={P.height - 20} stroke={ink.dark ? '#2b3b57' : '#dbe3ee'} strokeDasharray="2 4" />
          <rect x={P.sx(p.x) - 23} y={P.height - 19} width={46} height={17} rx={5} fill={ink.dark ? '#0b1324' : '#fff'} opacity={0.9} />
          <text x={P.sx(p.x)} y={P.height - 6} textAnchor="middle" fontSize={11.5} fontWeight={900} fill={ink.dark ? '#cbd5e1' : '#1f2340'}>{xLabels[p.i]}</text>
        </g>
      ))}
      {pts.slice(0, -1).map((p, k) => {
        const q = pts[k + 1]
        if (p.y === null || q.y === null) return null
        const st = seg?.state?.[k]
        const stroke = st === 'ok' ? '#16a34a' : st === 'no' ? '#f59e0b' : col
        return (
          <g key={`s${k}`} onClick={seg ? () => seg.onTap(k) : undefined} data-handle={seg ? true : undefined} style={{ cursor: seg ? 'pointer' : 'default' }} role={seg ? 'button' : undefined} aria-label={seg ? `${xLabels[k]} – ${xLabels[k + 1]} aralığı` : undefined}>
            {seg && <line x1={P.sx(p.x)} y1={P.sy(p.y)} x2={P.sx(q.x)} y2={P.sy(q.y)} stroke="transparent" strokeWidth={30} strokeLinecap="round" />}
            {seg && <line x1={P.sx(p.x)} y1={P.sy(p.y)} x2={P.sx(q.x)} y2={P.sy(q.y)} stroke={stroke} strokeWidth={10} strokeLinecap="round" opacity={st ? 0.35 : 0.12} />}
            <line x1={P.sx(p.x)} y1={P.sy(p.y)} x2={P.sx(q.x)} y2={P.sy(q.y)} stroke={stroke} strokeWidth={st === 'ok' ? 4.5 : 3} strokeLinecap="round" />
          </g>
        )
      })}
      {pts.map((p) => {
        if (p.y === null) return null
        const ed = editable?.[p.i]
        const isHl = hlPts.includes(p.i)
        if (ed && onSet)
          return (
            <g key={`p${p.i}`} onPointerDown={() => setSel(p.i)}>
              {(sel === p.i || isHl) && <circle cx={P.sx(p.x)} cy={P.sy(p.y)} r={19} fill="none" stroke={isHl ? '#f59e0b' : col} strokeWidth={2.5} strokeDasharray={isHl ? '5 3' : undefined} className={isHl ? 'ii-pulse' : ''} pointerEvents="none" />}
              <DragPoint x={p.x} y={p.y} color={ink.dark ? '#f472b6' : '#db2777'} r={11} constrain={(q) => ({ x: p.x, y: clamp(Math.round(q.y), Math.ceil(view.yMin), Math.floor(view.yMax)) })} onChange={(q) => { setSel(p.i); onSet(p.i, q.y) }} />
              <text x={P.sx(p.x)} y={P.sy(p.y) - 18} textAnchor="middle" fontSize={12.5} fontWeight={900} fill={ink.dark ? '#f9a8d4' : '#be185d'} pointerEvents="none">{f(p.y)}</text>
            </g>
          )
        return (
          <g key={`p${p.i}`} pointerEvents="none">
            {isHl && <circle cx={P.sx(p.x)} cy={P.sy(p.y)} r={15} fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="5 3" className="ii-pulse" />}
            <circle cx={P.sx(p.x)} cy={P.sy(p.y)} r={6.5} fill={col} stroke={ink.dark ? '#0b1324' : '#fff'} strokeWidth={2.5} />
            <text x={P.sx(p.x)} y={P.sy(p.y) - 12} textAnchor="middle" fontSize={12} fontWeight={900} fill={ink.dark ? '#e2e8f0' : '#1f2340'}>{f(p.y)}</text>
          </g>
        )
      })}
      {extra?.(P)}
    </g>
  )
}

export function LinePlot(props: LineProps) {
  const { ink, xs, ys, editable, onSet, view, aspect = 0.62, tapSets = true, label = 'Çizgi grafiği' } = props
  const [ref, w] = useW<HTMLDivElement>()
  const firstEd = editable ? editable.findIndex(Boolean) : -1
  const [sel, setSel] = useState<number | null>(firstEd >= 0 ? firstEd : null)
  const asp = w < 520 ? Math.max(aspect, 0.82) : aspect
  const tap = (p: { x: number; y: number }) => {
    if (!tapSets || !editable || !onSet) return
    // en yakın düzenlenebilir nokta (x’e göre)
    let best = -1, bd = Infinity
    xs.forEach((x, i) => {
      if (!editable[i]) return
      const d = Math.abs(x - p.x)
      if (d < bd) { bd = d; best = i }
    })
    const gap = Math.min(...xs.slice(1).map((x, i) => x - xs[i]))
    if (best >= 0 && bd <= gap * 0.6) {
      setSel(best)
      onSet(best, clamp(Math.round(p.y), Math.ceil(view.yMin), Math.floor(view.yMax)))
    }
  }
  const selY = sel !== null ? ys[sel] : null
  return (
    <div ref={ref}>
      <Plane
        key={`${aspect}-${w < 520}`}
        initial={view}
        mode="xy"
        equalUnits={false}
        aspect={asp}
        labels={false}
        fixedStep={1}
        minSpan={2}
        maxSpan={(view.xMax - view.xMin) * 2.5}
        onTap={tap}
        zoomFocus={sel !== null && selY !== null ? { x: xs[sel], y: selY } : undefined}
        className={ink.dark ? 'ii-dark-plane' : ''}
        label={label}
      >
        <LineLayer {...props} sel={sel} setSel={setSel} />
      </Plane>
      {editable && onSet && sel !== null && editable[sel] && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <ToolBtn ink={ink} onClick={() => onSet(sel, clamp((ys[sel] ?? 0) - 1, Math.ceil(view.yMin), Math.floor(view.yMax)))} label="1 derece aşağı"><Minus size={18} /></ToolBtn>
          <span className="flex flex-wrap justify-center gap-1">
            {xs.map((_, i) => editable[i] && (
              <button key={i} type="button" onClick={() => setSel(i)} aria-pressed={sel === i} className={`min-h-12 min-w-12 rounded-xl px-2 text-sm font-extrabold ring-1 ${sel === i ? (ink.dark ? 'bg-pink-500 text-white ring-pink-400' : 'bg-pink-600 text-white ring-pink-600') : ink.dark ? 'bg-slate-800 text-slate-200 ring-slate-600' : 'bg-white text-ink ring-line'}`}>{props.xLabels[i]}</button>
            ))}
          </span>
          <ToolBtn ink={ink} onClick={() => onSet(sel, clamp((ys[sel] ?? 0) + 1, Math.ceil(view.yMin), Math.floor(view.yMax)))} label="1 derece yukarı"><Plus size={18} /></ToolBtn>
        </div>
      )}
    </div>
  )
}

/* ═══════════════ Nokta grafiği (Plane, sayı doğrusu) ═══════════════ */

/** Değerleri yığılmış konumlara çevirir */
function stack(values: number[]) {
  const seen = new Map<number, number>()
  return values.map((v, i) => {
    const key = Math.round(v * 100)
    const k = seen.get(key) ?? 0
    seen.set(key, k + 1)
    return { v, k, i }
  })
}

export interface DotProps {
  ink: Ink
  values: number[]
  view: [number, number]
  color?: string
  title?: string
  unit?: string
  marks?: { mean?: boolean; median?: boolean; range?: boolean }
  /** dokunulan noktalar: 'sel' halka, 'x' üstü çizili */
  dotState?: Record<number, 'sel' | 'x'>
  onDot?: (i: number) => void
  /** Sürüklenebilir işaretçi (tahmin, ortanca) */
  marker?: { v: number | null; label: string; color?: string; onChange: (v: number) => void; step?: number }
  /** Sürüklenebilir nokta (aykırı değer) */
  dragDot?: { i: number; onChange: (v: number) => void; min: number; max: number }
  /** açıklık parantezinin üstüne sayıyı yaz (varsayılan: evet) */
  rangeLabel?: boolean
}

function DotLayer({ ink, values, color, title, marks, dotState, onDot, marker, dragDot, rangeLabel = true }: DotProps) {
  const P = usePlane()
  const y0 = P.sy(0)
  const r = 7.5
  const col = color ?? (ink.dark ? '#22d3ee' : '#0891b2')
  const st = stack(values)
  const m = values.reduce((a, b) => a + b, 0) / values.length
  const s = [...values].sort((a, b) => a - b)
  const md = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
  const mn = s[0], mx = s[s.length - 1]
  const bindMarker = useDrag(({ xy: [cx, cy], event }) => {
    event.stopPropagation()
    if (!marker) return
    const stp = marker.step ?? 0.5
    marker.onChange(Math.round(P.fromClient(cx, cy).x / stp) * stp)
  })
  const bindDot = useDrag(({ xy: [cx, cy], event }) => {
    event.stopPropagation()
    if (!dragDot) return
    dragDot.onChange(clamp(Math.round(P.fromClient(cx, cy).x), dragDot.min, dragDot.max))
  })
  const topY = Math.min(...st.map((d) => y0 - r - 4 - d.k * (2 * r + 2))) - r
  return (
    <g className="ii-own">
      {title && <text x={8} y={16} fontSize={13.5} fontWeight={900} fill={col}>{title}</text>}
      {marks?.range && (
        <g className="animate-fade-up" pointerEvents="none">
          <path d={`M${P.sx(mn)} ${topY - 2}v-7H${P.sx(mx)}v7`} fill="none" stroke={ink.dark ? '#fbbf24' : '#b45309'} strokeWidth={2} />
          <text x={(P.sx(mn) + P.sx(mx)) / 2} y={topY - 13} textAnchor="middle" fontSize={11.5} fontWeight={900} fill={ink.dark ? '#fbbf24' : '#b45309'}>{rangeLabel ? `açıklık ${f(mx - mn)}` : 'açıklık ?'}</text>
        </g>
      )}
      {marks?.mean && (
        <g className="animate-fade-up" pointerEvents="none">
          <line x1={P.sx(m)} x2={P.sx(m)} y1={24} y2={y0} stroke={MEAN} strokeWidth={2} strokeDasharray="4 3" />
          <path d={`M${P.sx(m) - 7} ${y0 + 14}l7 -10l7 10z`} fill={MEAN} />
          <text x={P.sx(m) + 9} y={y0 + 15} fontSize={11} fontWeight={900} fill={MEAN}>ort. {f(m, 1)}</text>
        </g>
      )}
      {marks?.median && (
        <g className="animate-fade-up" pointerEvents="none">
          <rect x={P.sx(md) - 6} y={y0 - 6} width={12} height={12} transform={`rotate(45 ${P.sx(md)} ${y0})`} fill={MEDIAN} stroke="#fff" strokeWidth={2} />
          <text x={P.sx(md) - 9} y={y0 + 15} textAnchor="end" fontSize={11} fontWeight={900} fill={MEDIAN}>ortanca {f(md, 1)}</text>
        </g>
      )}
      {st.map((d) => {
        const cx = P.sx(d.v), cy = y0 - r - 4 - d.k * (2 * r + 2)
        if (dragDot && d.i === dragDot.i)
          return (
            <g key={d.i} {...bindDot()} data-handle style={{ cursor: 'ew-resize', touchAction: 'none' }} role="slider" aria-label="Aykırı gün" aria-valuenow={d.v}>
              <circle cx={cx} cy={cy} r={24} fill="transparent" />
              <circle cx={cx} cy={cy} r={r + 3} fill="#f59e0b" stroke="#fff" strokeWidth={2.5} className="ii-pulse" />
              <path d={`M${cx - 20} ${cy}l-5 0m5 0l-3 -3m3 3l-3 3M${cx + 20} ${cy}l5 0m-5 0l3 -3m-3 3l3 3`} stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" fill="none" />
            </g>
          )
        const ds = dotState?.[d.i]
        return (
          <g key={d.i} data-handle={onDot ? true : undefined} onClick={onDot ? () => onDot(d.i) : undefined} style={{ cursor: onDot ? 'pointer' : 'default' }} role={onDot ? 'button' : undefined} aria-label={`${f(d.v)}${ds === 'x' ? ', elendi' : ds === 'sel' ? ', seçildi' : ''}`}>
            {onDot && <circle cx={cx} cy={cy} r={r + 9} fill="transparent" />}
            {ds === 'sel' && <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={ink.dark ? '#fbbf24' : '#b45309'} strokeWidth={2.5} />}
            <circle cx={cx} cy={cy} r={r} fill={col} opacity={ds === 'x' ? 0.25 : 1} stroke={ink.dark ? '#0b1324' : '#fff'} strokeWidth={1.8} />
            {ds === 'x' && <path d={`M${cx - 6} ${cy - 6}l12 12M${cx + 6} ${cy - 6}l-12 12`} stroke="#e11d48" strokeWidth={2.4} strokeLinecap="round" />}
          </g>
        )
      })}
      {marker && marker.v !== null && (
        <g {...bindMarker()} data-handle style={{ cursor: 'ew-resize', touchAction: 'none' }} role="slider" aria-label={marker.label} aria-valuenow={marker.v}>
          <rect x={P.sx(marker.v) - 24} y={0} width={48} height={y0 + 4} fill="transparent" />
          <line x1={P.sx(marker.v)} x2={P.sx(marker.v)} y1={22} y2={y0} stroke={marker.color ?? '#7c3aed'} strokeWidth={2} strokeDasharray="4 3" />
          <circle cx={P.sx(marker.v)} cy={14} r={12} fill={marker.color ?? '#7c3aed'} stroke="#fff" strokeWidth={2.5} />
          <path d={`M${P.sx(marker.v) - 5} 14h10M${P.sx(marker.v) - 5} 14l2.5 -2.5M${P.sx(marker.v) - 5} 14l2.5 2.5M${P.sx(marker.v) + 5} 14l-2.5 -2.5M${P.sx(marker.v) + 5} 14l-2.5 2.5`} stroke="#fff" strokeWidth={1.6} strokeLinecap="round" />
          <text x={P.sx(marker.v) + 16} y={18} fontSize={12} fontWeight={900} fill={marker.color ?? '#7c3aed'}>{marker.label} {f(marker.v)}</text>
        </g>
      )}
    </g>
  )
}

export function DotPlot(props: DotProps) {
  const { ink, view, unit, marker } = props
  return (
    <Plane
      initial={{ xMin: view[0], xMax: view[1], yMin: -1, yMax: 1 }}
      mode="x"
      minSpan={4}
      maxSpan={(view[1] - view[0]) * 2}
      xLabel={unit}
      onTap={marker ? (p) => marker.onChange(Math.round(p.x / (marker.step ?? 0.5)) * (marker.step ?? 0.5)) : undefined}
      zoomFocus={marker && marker.v !== null ? { x: marker.v } : undefined}
      className={ink.dark ? 'ii-dark-plane' : ''}
      label={`Nokta grafiği${props.title ? ` (${props.title})` : ''}`}
    >
      <DotLayer {...props} />
    </Plane>
  )
}

/* ═══════════════ Termometre (dikey sayı doğrusu) ═══════════════ */

export function Thermo({ ink, lo, hi, level, stops = [], marks = [], onLevel, onCommit, bracket, labelEvery = 2, height }: {
  ink: Ink
  lo: number
  hi: number
  /** kırmızı sıvının seviyesi */
  level: number
  /** zıplama durakları (ilk eleman başlangıç) */
  stops?: number[]
  marks?: { v: number; color: string; label: string; side?: 'l' | 'r' }[]
  onLevel?: (v: number) => void
  onCommit?: (v: number) => void
  bracket?: [number, number]
  labelEvery?: number
  height?: number
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const W = 300
  const span = hi - lo
  const px = height ? (height - 90) / span : clamp(380 / span, 11, 18)
  const H = Math.round(span * px + 92)
  const top = 22
  const Y = (v: number) => top + (hi - v) * px
  const tubeX = 96
  const interactive = !!onCommit
  const valAt = (cy: number) => clamp(Math.round(hi - (localY(svgRef.current, H, cy) - top) / px), lo, hi)
  const bind = useDrag(({ xy: [, cy], last, event }) => {
    event.stopPropagation()
    const v = valAt(cy)
    onLevel?.(v)
    if (last) onCommit?.(v)
  }, { filterTaps: false })
  const jumps = stops.slice(1).map((b, k) => ({ a: stops[k], b, k }))
  const liquidTop = Y(level)
  return (
    <ZoomBox controls={false} maxScale={3}>
      <div className="mx-auto w-full max-w-[300px] select-none" style={{ touchAction: 'none' }}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Termometre ${f(lo)} ile ${f(hi)} derece arası, seviye ${f(level)}`} className="block">
          <defs>
            <linearGradient id="ii-glass" x1="0" x2="1">
              <stop offset="0" stopColor={ink.dark ? '#1e2b44' : '#ffffff'} />
              <stop offset="0.5" stopColor={ink.dark ? '#24344f' : '#f1f5f9'} />
              <stop offset="1" stopColor={ink.dark ? '#16223a' : '#e2e8f0'} />
            </linearGradient>
            <linearGradient id="ii-merc" x1="0" x2="1">
              <stop offset="0" stopColor="#f87171" />
              <stop offset="1" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          {/* sıfırın altı soğuk bölge */}
          {lo < 0 && <rect x={tubeX - 66} y={Y(0)} width={W - (tubeX - 66) - 6} height={Y(lo) - Y(0)} rx={8} fill={ink.dark ? '#1e3a8a22' : '#e0f2fe'} opacity={0.7} />}
          {ticks(lo, hi, 1).map((t) => {
            const major = t % labelEvery === 0
            return (
              <g key={t} pointerEvents="none">
                <line x1={tubeX - (major ? 24 : 16)} x2={tubeX - 13} y1={Y(t)} y2={Y(t)} stroke={t === 0 ? (ink.dark ? '#7dd3fc' : '#0369a1') : ink.axis} strokeWidth={t === 0 ? 3 : major ? 1.8 : 1} />
                {major && <text x={tubeX - 30} y={Y(t) + 4.5} textAnchor="end" fontSize={t === 0 ? 15 : 13} fontWeight={900} fill={t === 0 ? (ink.dark ? '#7dd3fc' : '#0369a1') : t < 0 ? (ink.dark ? '#93c5fd' : '#1d4ed8') : ink.text}>{f(t)}</text>}
              </g>
            )
          })}
          <text x={tubeX - 30} y={top - 8} textAnchor="end" fontSize={12} fontWeight={900} fill={ink.soft}>°C</text>
          {/* cam tüp + hazne */}
          <rect x={tubeX - 11} y={top - 10} width={22} height={Y(lo) - top + 20} rx={11} fill="url(#ii-glass)" stroke={ink.dark ? '#64748b' : '#94a3b8'} strokeWidth={2} />
          <circle cx={tubeX} cy={Y(lo) + 30} r={21} fill="url(#ii-merc)" stroke={ink.dark ? '#64748b' : '#94a3b8'} strokeWidth={2} />
          <rect x={tubeX - 5} y={liquidTop} width={10} height={Y(lo) + 20 - liquidTop} fill="url(#ii-merc)" style={{ transition: 'y 160ms, height 160ms' }} />
          <circle cx={tubeX - 6} cy={Y(lo) + 24} r={5} fill="#fff" opacity={0.4} />
          {/* işaretler: sağ kenarda etiket, tüpe kesikli kılavuz */}
          {marks.map((m) => {
            const lw = Math.max(64, m.label.length * 7.2 + 14)
            const lx = W - lw - 4
            return (
              <g key={m.label + m.v} pointerEvents="none">
                <line x1={tubeX + 12} x2={lx} y1={Y(m.v)} y2={Y(m.v)} stroke={m.color} strokeWidth={1.6} strokeDasharray="3 3" opacity={0.8} />
                <rect x={lx} y={Y(m.v) - 12} width={lw} height={24} rx={8} fill={m.color} />
                <text x={lx + lw / 2} y={Y(m.v) + 5} textAnchor="middle" fontSize={12.5} fontWeight={900} fill="#fff">{m.label}</text>
              </g>
            )
          })}
          {bracket && (
            <g pointerEvents="none" className="animate-fade-up">
              <path d={`M${tubeX + 30} ${Y(bracket[0])}h12V${Y(bracket[1])}h-12`} fill="none" stroke={ink.dark ? '#fbbf24' : '#b45309'} strokeWidth={2.5} />
              <circle cx={tubeX + 56} cy={(Y(bracket[0]) + Y(bracket[1])) / 2} r={13} fill={ink.dark ? '#fbbf24' : '#b45309'} />
              <text x={tubeX + 56} y={(Y(bracket[0]) + Y(bracket[1])) / 2 + 6} textAnchor="middle" fontSize={17} fontWeight={900} fill={ink.dark ? '#0b1324' : '#fff'}>?</text>
            </g>
          )}
          {/* zıplamalar */}
          {jumps.map(({ a, b, k }) => {
            const x = tubeX + 28 + (k % 3) * 32
            const up = b > a
            const d = b - a
            const ya = Y(a), yb = Y(b)
            return (
              <g key={k} pointerEvents="none" className="animate-fade-up">
                <path d={`M${tubeX + 13} ${ya}C${x + 14} ${ya} ${x + 14} ${yb} ${tubeX + 13} ${yb}`} fill="none" stroke={up ? '#ea580c' : '#2563eb'} strokeWidth={2.6} />
                <path d={`M${tubeX + 13} ${yb}l8 ${up ? 2 : -2}l-2 ${up ? 6 : -6}z`} fill={up ? '#ea580c' : '#2563eb'} />
                <rect x={x - 10} y={(ya + yb) / 2 - 12} width={40} height={24} rx={8} fill={up ? '#ea580c' : '#2563eb'} />
                <text x={x + 10} y={(ya + yb) / 2 + 5} textAnchor="middle" fontSize={13} fontWeight={900} fill="#fff">{d > 0 ? '+' : '−'}{Math.abs(d)}</text>
              </g>
            )
          })}
          {stops.map((s, k) => <circle key={`st${k}`} cx={tubeX} cy={Y(s)} r={4.5} fill="#fff" stroke="#dc2626" strokeWidth={2} pointerEvents="none" />)}
          {interactive && (
            <g {...bind()} data-handle style={{ cursor: 'ns-resize', touchAction: 'none' }} role="slider" aria-label="Termometre seviyesi" aria-valuenow={level} aria-valuemin={lo} aria-valuemax={hi}>
              <rect x={tubeX - 70} y={top - 12} width={92} height={Y(lo) - top + 24} fill="transparent" />
              <g transform={`translate(${tubeX - 11} ${liquidTop})`}>
                <rect x={-26} y={-13} width={22} height={26} rx={8} fill={ink.dark ? '#f472b6' : '#db2777'} stroke="#fff" strokeWidth={2} />
                <path d="M-19 -4h8M-19 0h8M-19 4h8" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" />
              </g>
            </g>
          )}
        </svg>
      </div>
    </ZoomBox>
  )
}

/* ═══════════════ Yanıltıcı eksen: sütun grafiğinde eksen başlangıcını aşağı çek ═══════════════ */

export function AxisBars({ ink, data, lo, setLo, lo0, unit, onFixed }: { ink: Ink; data: { label: string; value: number }[]; lo: number; setLo: (v: number) => void; lo0: number; unit: string; onFixed?: boolean }) {
  const [ref, w] = useW<HTMLDivElement>()
  const svgRef = useRef<SVGSVGElement>(null)
  const H = Math.round(clamp(w * 0.58, 250, 330))
  const pad = { l: 62, r: 16, t: 26, b: 40 }
  const pw = w - pad.l - pad.r, ph = H - pad.t - pad.b
  const maxV = Math.max(...data.map((d) => d.value))
  const hi = Math.ceil((maxV + 3) / 5) * 5
  const base = pad.t + ph
  const Y = (v: number) => pad.t + ph * (1 - (v - lo) / (hi - lo))
  const bind = useDrag(({ movement: [, my], first, memo, event }) => {
    event.stopPropagation()
    const m0 = first ? lo : (memo as number)
    const nv = Math.round(clamp(m0 - (my / (ph * 0.8)) * lo0, 0, lo0))
    setLo(nv <= lo0 * 0.06 ? 0 : nv)
    return m0
  })
  const step = niceStep(hi - lo, ph, 30)
  const tk = ticks(lo, hi, step).filter((t) => Math.abs(t - lo) > step * 0.45)
  const n = data.length
  const slot = pw / n
  const bw = Math.min(90, slot * 0.5)
  const fixed = lo === 0
  const a = data[0].value, b = data[1].value
  const ratio = (b - lo) / Math.max(0.001, a - lo)
  return (
    <div>
      <ZoomBox controls={false} maxScale={3}>
        <div ref={ref} className="select-none" style={{ touchAction: 'none' }}>
          <svg ref={svgRef} viewBox={`0 0 ${w} ${H}`} width="100%" height={H} role="img" aria-label={`Sütun grafiği, eksen ${ekS(lo, 'abl')} başlıyor`} className="block">
            {tk.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={w - pad.r} y1={Y(t)} y2={Y(t)} stroke={ink.grid} />
                <text x={pad.l - 8} y={Y(t) + 4} textAnchor="end" fontSize={12} fontWeight={800} fill={ink.soft}>{f(t)}</text>
              </g>
            ))}
            <text x={pad.l - 8} y={pad.t - 10} textAnchor="end" fontSize={11} fontWeight={900} fill={ink.soft}>{unit}</text>
            <line x1={pad.l} x2={pad.l} y1={pad.t - 4} y2={base} stroke={ink.axis} strokeWidth={1.6} />
            <line x1={pad.l} x2={w - pad.r} y1={base} y2={base} stroke={ink.axis} strokeWidth={1.6} />
            {data.map((d, i) => {
              const cx = pad.l + slot * (i + 0.5)
              return (
                <g key={d.label}>
                  <path d={barPath(cx - bw / 2, Y(d.value), bw, base)} fill={i ? '#0284c7' : '#7dd3fc'} style={{ transition: 'd 160ms' }} />
                  <text x={cx} y={Y(d.value) - 8} textAnchor="middle" fontSize={15} fontWeight={900} fill={ink.text}>{f(d.value)}</text>
                  <text x={cx} y={base + 24} textAnchor="middle" fontSize={14} fontWeight={800} fill={ink.text}>{d.label}</text>
                </g>
              )
            })}
            {!fixed && <path d={`M${pad.l - 10} ${base - 10}l10 -5l-10 -5l10 -5`} stroke={ink.axis} strokeWidth={2} fill="none" />}
            <g {...bind()} data-handle style={{ cursor: 'ns-resize', touchAction: 'none' }} role="slider" aria-label="Eksenin başlangıç değeri" aria-valuenow={lo}>
              <rect x={0} y={base - 26} width={pad.l - 2} height={52} fill="transparent" />
              <rect x={4} y={base - 15} width={pad.l - 10} height={30} rx={15} fill={fixed ? '#16a34a' : '#db2777'} />
              <text x={(pad.l - 6) / 2 + 2} y={base + 5} textAnchor="middle" fontSize={14} fontWeight={900} fill="#fff">{f(lo)}</text>
              {!fixed && !onFixed && <path className="ii-bob" d={`M${pad.l / 2 - 5} ${base + 21}l6 7l6 -7`} fill="none" stroke="#db2777" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />}
            </g>
          </svg>
        </div>
      </ZoomBox>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Chip ink={ink} tone={fixed ? 'ok' : 'warn'}>Görünen: {data[1].label} sütunu {data[0].label} sütununun {f(ratio, 1)} katı uzun</Chip>
        <ToolBtn ink={ink} onClick={() => setLo(Math.max(0, lo - Math.ceil(lo0 / 4)) <= lo0 * 0.06 ? 0 : Math.max(0, lo - Math.ceil(lo0 / 4)))} disabled={fixed} label="Ekseni aşağı çek"><ChevronsDown size={18} />Ekseni aşağı çek</ToolBtn>
        <ToolBtn ink={ink} onClick={() => setLo(Math.min(lo0, lo + Math.ceil(lo0 / 4)))} disabled={lo >= lo0} label="Ekseni yukarı al"><ChevronsUp size={18} /></ToolBtn>
      </div>
    </div>
  )
}
