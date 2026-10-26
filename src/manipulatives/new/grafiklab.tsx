import { useEffect, useRef, useState, type PointerEvent as RPE } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { niceStep, ticks } from '../../interactive/axis'
import { Stepper, ToolButton } from '../ui'
import { n, type ToolDef } from '../types'
import { ek } from '../../lib/generators'

/**
 * Grafik Çizim Laboratuvarı
 *  - Tablo: kategori adlarını yaz, değerleri −/+ ile değiştir, kategori ekle/sil.
 *  - Gösterim: sütun, resim (piktogram), nokta, çizgi, daire grafiği — hepsi aynı veriye bağlı (küçük önizlemeler canlı).
 *  - Sütunları / noktaları parmakla yukarı-aşağı sürükle (ya da istenen yüksekliğe dokun) → tablo güncellenir.
 *  - Eksen başlangıcı: 0’dan başlamayan eksenin farkları nasıl abarttığını gösterir (yanıltıcı grafik).
 *  - Ortalama, ortanca, tepe değer, açıklık. “Ortalama çizgisi”ni sürükle: çizginin üstünde taşan miktar,
 *    altındaki eksiğe eşit olduğunda çizgi ortalamadır. “Eşitle” → fazlalıklar eksikleri doldurur (dengeleme).
 *
 * Görev hedefi (target):
 *   { data: [{ label, value }, ...], kind?: 'bar' | 'picto' | 'dot' | 'line' | 'pie', title?: string }
 *       → Tablodaki veriyi grafiğe dök (değerler 0’dan başlar; kind verilirse o gösterim zorunlu).
 *   { mean: number, count?: number, median?: number, mode?: number, range?: number }
 *       → Tabloyu düzenleyerek bu istatistiklere sahip bir veri kümesi oluştur (count: kategori sayısı).
 *   Görev modunda istenen istatistiklerin göstergeleri gizlenir.
 */

type Kind = 'bar' | 'picto' | 'dot' | 'line' | 'pie'
type Row = { label: string; value: number }
type V = { title: string; rows: Row[]; kind: Kind; y0: number; unit: number; meanLine: boolean; guess: number }

const PALETTE = ['#d6457a', '#0ea5e9', '#f59e0b', '#10b981', '#8b5cf6', '#f97316', '#14b8a6', '#64748b']
const MAXV = 60
const fmt = (v: number, d = 2) => (Math.round(v * 10 ** d) / 10 ** d + 0).toLocaleString('tr-TR', { maximumFractionDigits: d })

function stats(vals: number[]) {
  const nn = vals.length
  if (!nn) return { mean: 0, median: 0, modes: [] as number[], range: 0, sum: 0 }
  const sum = vals.reduce((s, x) => s + x, 0)
  const s = vals.slice().sort((a, b) => a - b)
  const median = nn % 2 ? s[(nn - 1) / 2] : (s[nn / 2 - 1] + s[nn / 2]) / 2
  const freq = new Map<number, number>()
  vals.forEach((v) => freq.set(v, (freq.get(v) ?? 0) + 1))
  const top = Math.max(...freq.values())
  const modes = top > 1 ? [...freq.entries()].filter(([, f]) => f === top).map(([v]) => v).sort((a, b) => a - b) : []
  return { mean: sum / nn, median, modes, range: s[nn - 1] - s[0], sum }
}

/* ───────────────────────────── Grafik ───────────────────────────── */
const L = 50, R = 18, T = 26, B = 58

function Star({ x, y, s, color, frac = 1, id }: { x: number; y: number; s: number; color: string; frac?: number; id: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const r = i % 2 ? s * 0.22 : s * 0.5
    return `${x + s / 2 + r * Math.cos(a)},${y + s / 2 + r * Math.sin(a)}`
  }).join(' ')
  return (
    <g>
      {frac < 1 && <clipPath id={id}><rect x={x} y={y} width={s * frac} height={s} /></clipPath>}
      {frac < 1 && <polygon points={pts} fill="none" stroke={color} strokeWidth={1.2} strokeDasharray="2 2" opacity={0.5} />}
      <polygon points={pts} fill={color} clipPath={frac < 1 ? `url(#${id})` : undefined} />
    </g>
  )
}

function Chart({ value, onChange, interactive, mini, level, yMaxFixed, uid, narrow }: { value: V; onChange?: (v: V) => void; interactive?: boolean; mini?: boolean; level: number; yMaxFixed: number; uid: string; narrow?: boolean }) {
  const W = narrow ? 400 : 640, H = narrow ? 320 : 340
  const PW = W - L - R, PH = H - T - B
  const svgRef = useRef<SVGSVGElement>(null)
  const dragIdx = useRef<number | null>(null)
  const latest = useRef(value)
  latest.current = value
  const { rows, kind } = value
  const nn = Math.max(rows.length, 1)
  const vals = rows.map((r) => r.value)
  const st = stats(vals)
  const shown = vals.map((v) => v + (st.mean - v) * level)
  const y0 = kind === 'bar' || kind === 'line' ? Math.min(value.y0, Math.max(0, ...vals)) : 0
  const yMax = yMaxFixed
  const yv = (v: number) => T + PH - ((Math.max(v, y0) - y0) / Math.max(1e-9, yMax - y0)) * PH
  const band = PW / nn
  const cx = (i: number) => L + band * (i + 0.5)
  const step = Math.max(1, niceStep(yMax - y0, PH, 30))
  const yt = ticks(y0, yMax, step)

  const toSvg = (e: RPE) => {
    const m = svgRef.current?.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: p.x, y: p.y }
  }
  // piktogram ölçüsü
  const unit = value.unit
  const maxIcons = Math.max(5, Math.ceil(Math.max(...vals, 1) / unit) + 1)
  const pRowH = Math.min(46, (H - 30) / nn)
  const pS = Math.min(pRowH - 8, (W - 124) / maxIcons)
  const setAt = (i: number, raw: number) => {
    const v = latest.current
    const nv = Math.max(0, Math.min(MAXV, Math.round(raw)))
    if (v.rows[i] && v.rows[i].value !== nv) onChange?.({ ...v, rows: v.rows.map((r, j) => (j === i ? { ...r, value: nv } : r)) })
  }
  const apply = (p: { x: number; y: number }, start: boolean) => {
    if (kind === 'picto') {
      if (start) dragIdx.current = Math.floor((p.y - 16) / pRowH)
      const i = dragIdx.current
      if (i === null || i < 0 || i >= rows.length) return
      setAt(i, ((p.x - 112) / pS) * unit)
      return
    }
    if (start) {
      const i = Math.floor((p.x - L) / band)
      dragIdx.current = i >= 0 && i < rows.length ? i : null
    }
    const i = dragIdx.current
    if (i === null) return
    const val = y0 + ((T + PH - p.y) / PH) * (yMax - y0)
    setAt(i, kind === 'dot' ? Math.ceil(val - 0.35) : val)
  }
  const draggable = interactive && kind !== 'pie' && level === 0

  const guessY = yv(value.guess)
  const above = vals.reduce((s, v) => s + Math.max(0, v - value.guess), 0)
  const below = vals.reduce((s, v) => s + Math.max(0, value.guess - v), 0)

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="block w-full select-none"
      style={{ touchAction: draggable ? 'none' : undefined }}
      role="img"
      aria-label={mini ? undefined : 'Grafik'}
      onPointerDown={(e) => {
        if (!draggable) return
        if ((e.target as Element).closest('[data-meanline]')) return
        e.currentTarget.setPointerCapture(e.pointerId)
        apply(toSvg(e), true)
      }}
      onPointerMove={(e) => draggable && dragIdx.current !== null && e.currentTarget.hasPointerCapture(e.pointerId) && apply(toSvg(e), false)}
      onPointerUp={() => (dragIdx.current = null)}
    >
      <defs>
        <pattern id={`${uid}-hatch`} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={8} height={8} fill="#fde8ef" />
          <line x1={0} y1={0} x2={0} y2={8} stroke="#d6457a" strokeWidth={4} />
        </pattern>
      </defs>
      <rect width={W} height={H} rx={16} fill="#fff" />

      {kind === 'pie' ? (
        (() => {
          const tot = st.sum
          let acc = 0
          const pcx = mini ? W / 2 : narrow ? W / 2 : 190, pcy = narrow && !mini ? 118 : H / 2, r = mini ? 150 : narrow ? 104 : 135
          if (!tot) return <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={18} fontWeight={800} fill="#5b6080">Veri yok</text>
          return (
            <g>
              {rows.map((row, i) => {
                const a0 = (acc / tot) * 2 * Math.PI - Math.PI / 2
                acc += row.value
                const a1 = (acc / tot) * 2 * Math.PI - Math.PI / 2
                if (row.value === 0) return null
                const mid = (a0 + a1) / 2
                const large = a1 - a0 > Math.PI ? 1 : 0
                const d = row.value === tot ? `M${pcx - r} ${pcy}a${r} ${r} 0 1 1 ${2 * r} 0a${r} ${r} 0 1 1 ${-2 * r} 0` : `M${pcx} ${pcy}L${pcx + r * Math.cos(a0)} ${pcy + r * Math.sin(a0)}A${r} ${r} 0 ${large} 1 ${pcx + r * Math.cos(a1)} ${pcy + r * Math.sin(a1)}Z`
                return (
                  <g key={i}>
                    <path d={d} fill={PALETTE[i % 8]} stroke="#fff" strokeWidth={3} />
                    {!mini && a1 - a0 > 0.3 && <text x={pcx + r * 0.64 * Math.cos(mid)} y={pcy + r * 0.64 * Math.sin(mid) + 6} textAnchor="middle" fontSize={17} fontWeight={900} fill="#fff">%{fmt((row.value / tot) * 100, 0)}</text>}
                  </g>
                )
              })}
              {!mini && rows.map((row, i) => (
                <g key={i} transform={narrow ? `translate(${i % 2 ? 210 : 16} ${238 + Math.floor(i / 2) * 22})` : `translate(360 ${H / 2 - (rows.length * 34) / 2 + i * 34})`}>
                  <rect width={18} height={18} rx={5} fill={PALETTE[i % 8]} />
                  <text x={26} y={14} fontSize={15} fontWeight={800} fill="#1f2340">{row.label.slice(0, 10)}</text>
                  <text x={narrow ? 178 : 262} y={14} textAnchor="end" fontSize={narrow ? 12 : 14} fontWeight={800} fill="#5b6080">{narrow ? '' : `${row.value}/${tot} · `}{fmt((row.value / tot) * 360, 1)}°</text>
                </g>
              ))}
            </g>
          )
        })()
      ) : kind === 'picto' ? (
        <g>
          {rows.map((row, i) => {
            const y = 16 + i * pRowH
            const full = Math.floor(row.value / unit), rem = (row.value % unit) / unit
            return (
              <g key={i}>
                {i % 2 === 0 && <rect x={8} y={y} width={W - 16} height={pRowH} rx={8} fill="#fbf7f6" />}
                {!mini && <text x={102} y={y + pRowH / 2 + 5} textAnchor="end" fontSize={15} fontWeight={800} fill="#1f2340">{row.label.slice(0, 10)}</text>}
                {Array.from({ length: full }).map((_, k) => <Star key={k} x={112 + k * pS} y={y + (pRowH - pS) / 2} s={pS - 2} color={PALETTE[i % 8]} id={`${uid}-s${i}-${k}`} />)}
                {rem > 0 && <Star x={112 + full * pS} y={y + (pRowH - pS) / 2} s={pS - 2} color={PALETTE[i % 8]} frac={rem} id={`${uid}-p${i}`} />}
              </g>
            )
          })}
          {!mini && (
            <g transform={`translate(${W - 150} ${H - 24})`}>
              <Star x={0} y={-16} s={22} color="#1f2340" id={`${uid}-key`} />
              <text x={28} y={1} fontSize={15} fontWeight={900} fill="#1f2340">= {unit} kişi</text>
            </g>
          )}
        </g>
      ) : (
        <g>
          {/* eksenler */}
          {!mini && yt.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={yv(t)} y2={yv(t)} stroke="#eef0f6" />
              <text x={L - 8} y={yv(t) + 4} textAnchor="end" fontSize={13} fontWeight={800} fill="#5b6080">{fmt(t)}</text>
            </g>
          ))}
          <line x1={L} x2={L} y1={T - 6} y2={T + PH} stroke="#1f2340" strokeWidth={2} />
          <line x1={L} x2={W - R} y1={T + PH} y2={T + PH} stroke="#1f2340" strokeWidth={2} />
          {y0 > 0 && kind !== 'dot' && <path d={`M${L - 9} ${T + PH - 16}l9 -5l-9 -5l9 -5`} transform={`translate(4 0)`} stroke="#e11d48" strokeWidth={2.5} fill="#fff" />}

          {kind === 'bar' && rows.map((row, i) => {
            const v = shown[i]
            const bw = band * 0.62
            const x = cx(i) - bw / 2
            const y = yv(v)
            return (
              <g key={i}>
                <rect x={x} y={y} width={bw} height={T + PH - y} rx={mini ? 4 : 7} fill={PALETTE[i % 8]} />
                {level > 0 && !mini && <rect x={x} y={yv(row.value)} width={bw} height={T + PH - yv(row.value)} rx={7} fill="none" stroke={PALETTE[i % 8]} strokeWidth={2} strokeDasharray="5 4" opacity={0.8} />}
                {value.meanLine && level === 0 && !mini && row.value > value.guess && <rect x={x} y={y} width={bw} height={guessY - y} rx={6} fill={`url(#${uid}-hatch)`} opacity={0.9} />}
                {value.meanLine && level === 0 && !mini && row.value < value.guess && <rect x={x + 2} y={guessY} width={bw - 4} height={y - guessY} rx={5} fill="#e0f2fe" stroke="#0284c7" strokeWidth={2} strokeDasharray="5 4" />}
                {!mini && <text x={cx(i)} y={Math.min(y, value.meanLine ? guessY : y) - 8} textAnchor="middle" fontSize={16} fontWeight={900} fill="#1f2340">{level > 0 ? fmt(v, 1) : row.value}</text>}
                {draggable && !mini && <rect x={cx(i) - 16} y={y + 5} width={32} height={6} rx={3} fill="#fff" opacity={0.85} />}
              </g>
            )
          })}
          {kind === 'line' && (
            <g>
              <polyline points={rows.map((_, i) => `${cx(i)},${yv(shown[i])}`).join(' ')} fill="none" stroke="#1f2340" strokeWidth={mini ? 5 : 3.5} strokeLinejoin="round" />
              {rows.map((row, i) => (
                <g key={i}>
                  <circle cx={cx(i)} cy={yv(shown[i])} r={mini ? 9 : 10} fill={PALETTE[i % 8]} stroke="#fff" strokeWidth={3} />
                  {!mini && <text x={cx(i)} y={yv(shown[i]) - 16} textAnchor="middle" fontSize={15} fontWeight={900} fill="#1f2340">{row.value}</text>}
                </g>
              ))}
            </g>
          )}
          {kind === 'dot' && rows.map((row, i) => {
            const cell = PH / Math.max(1, yMax)
            const r = Math.max(2.5, Math.min(band * 0.3, cell * 0.46))
            return (
              <g key={i}>
                {Array.from({ length: row.value }).map((_, k) => <circle key={k} cx={cx(i)} cy={yv(k + 0.5)} r={r} fill={PALETTE[i % 8]} stroke="#fff" strokeWidth={1.5} />)}
                {!mini && <text x={cx(i)} y={yv(row.value) - 8} textAnchor="middle" fontSize={15} fontWeight={900} fill="#1f2340">{row.value}</text>}
              </g>
            )
          })}
          {!mini && rows.map((row, i) => (
            <text key={i} x={cx(i)} y={T + PH + 22} textAnchor="middle" fontSize={rows.length > 6 ? 12 : 14} fontWeight={800} fill="#1f2340">{row.label.slice(0, 9)}</text>
          ))}
          {/* ortalama çizgisi */}
          {kind === 'bar' && !mini && (value.meanLine || level > 0) && (
            <MeanLine
              W={W}
              y={level > 0 ? yv(st.mean) : guessY}
              label={level > 0 ? `ortalama ${fmt(st.mean)}` : Math.abs(above - below) < 1e-9 ? `denge: ${fmt(value.guess, 1)}` : `${fmt(value.guess, 1)}`}
              balanced={level > 0 || Math.abs(above - below) < 1e-9}
              svg={svgRef}
              onY={(py) => {
                const g = y0 + ((T + PH - py) / PH) * (yMax - y0)
                const gv = Math.max(y0, Math.min(yMax, Math.round(g * 2) / 2))
                if (gv !== latest.current.guess) onChange?.({ ...latest.current, guess: gv })
              }}
              disabled={!interactive || level > 0}
            />
          )}
        </g>
      )}
    </svg>
  )
}

function MeanLine({ W, y, label, balanced, svg, onY, disabled }: { W: number; y: number; label: string; balanced: boolean; svg: React.RefObject<SVGSVGElement | null>; onY: (py: number) => void; disabled?: boolean }) {
  const col = balanced ? '#16a34a' : '#1f2340'
  const move = (e: RPE) => {
    const m = svg.current?.getScreenCTM()
    if (!m) return
    onY(new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()).y)
  }
  return (
    <g
      data-meanline
      style={{ cursor: disabled ? 'default' : 'ns-resize', touchAction: 'none' }}
      onPointerDown={(e) => { if (disabled) return; e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId) }}
      onPointerMove={(e) => !disabled && e.currentTarget.hasPointerCapture(e.pointerId) && move(e)}
    >
      <rect x={L} y={y - 22} width={W - L - R} height={44} fill="transparent" />
      <line x1={L} x2={W - R} y1={y} y2={y} stroke={col} strokeWidth={3} strokeDasharray="10 6" />
      {!disabled && (
        <g transform={`translate(${W - R - 22} ${y})`}>
          <circle r={18} fill={col} stroke="#fff" strokeWidth={3} />
          <path d="M-5 -4l5 -6l5 6M-5 4l5 6l5 -6" stroke="#fff" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      <g transform={`translate(${L + 8} ${y - 10})`}>
        <rect x={-4} y={-15} width={label.length * 8.4 + 10} height={22} rx={8} fill={col} />
        <text x={1} y={1} fontSize={14} fontWeight={900} fill="#fff">{label}</text>
      </g>
    </g>
  )
}

/* ───────────────────────────── Araç ───────────────────────────── */
const KINDS: { id: Kind; label: string }[] = [
  { id: 'bar', label: 'Sütun' },
  { id: 'picto', label: 'Resim' },
  { id: 'dot', label: 'Nokta' },
  { id: 'line', label: 'Çizgi' },
  { id: 'pie', label: 'Daire' },
]
const DEFAULT: V = {
  title: 'Sınıfımızın en sevdiği meyveler',
  rows: [
    { label: 'Elma', value: 6 },
    { label: 'Muz', value: 3 },
    { label: 'Çilek', value: 8 },
    { label: 'Üzüm', value: 5 },
    { label: 'Kiraz', value: 4 },
  ],
  kind: 'bar',
  y0: 0,
  unit: 2,
  meanLine: false,
  guess: 3,
}
const NEW_LABELS = ['Karpuz', 'Armut', 'Erik', 'Kayısı', 'Portakal', 'Nar', 'İncir', 'Ayva']

function Stat({ label, value, hint, color }: { label: string; value: string; hint: string; color: string }) {
  return (
    <div className="rounded-2xl bg-white p-2.5 ring-1 ring-line">
      <p className="text-[11px] font-extrabold tracking-wide text-ink-soft uppercase">{label}</p>
      <p className="text-2xl font-black tabular-nums" style={{ color }}>{value}</p>
      <p className="text-[11px] leading-tight font-bold text-ink-soft">{hint}</p>
    </div>
  )
}

export const grafiklab: ToolDef<V> = {
  id: 'grafiklab',
  defaultConfig: {},
  initial: (_c, t) => {
    const data = t?.data as Row[] | undefined
    if (data) return { ...DEFAULT, title: String(t?.title ?? ''), rows: data.map((d) => ({ label: d.label, value: 0 })), kind: (t?.kind as Kind) ?? 'bar' }
    if (t) {
      const cnt = typeof t.count === 'number' ? (t.count as number) : 4
      return { ...DEFAULT, title: String(t.title ?? ''), rows: DEFAULT.rows.concat(NEW_LABELS.map((l) => ({ label: l, value: 2 }))).slice(0, cnt).map((r) => ({ ...r, value: 2 })) }
    }
    return DEFAULT
  },
  check: (v, t) => {
    const data = t.data as Row[] | undefined
    if (data) {
      if (t.kind && v.kind !== t.kind) return false
      return data.length === v.rows.length && data.every((d, i) => v.rows[i].value === d.value)
    }
    const s = stats(v.rows.map((r) => r.value))
    if (typeof t.count === 'number' && v.rows.length !== t.count) return false
    if (typeof t.mean === 'number' && Math.abs(s.mean - n(t, 'mean')) > 1e-9) return false
    if (typeof t.median === 'number' && Math.abs(s.median - n(t, 'median')) > 1e-9) return false
    if (typeof t.mode === 'number' && !(s.modes.length === 1 && s.modes[0] === t.mode)) return false
    if (typeof t.range === 'number' && s.range !== t.range) return false
    return v.rows.length > 0
  },
  Component: ({ value, onChange, target, locked }) => {
    const task = !!target
    const buildTask = !!target?.data
    const goalRows = (target?.data as Row[] | undefined) ?? null
    const vals = value.rows.map((r) => r.value)
    const st = stats(vals)
    const set = (p: Partial<V>) => !locked && onChange({ ...value, ...p })
    const setRow = (i: number, p: Partial<Row>) => set({ rows: value.rows.map((r, j) => (j === i ? { ...r, ...p } : r)) })

    // y ekseni üst sınırı: sürükleme sırasında zıplamasın diye yalnızca büyürken/çok küçülünce değişir
    const need = Math.max(8, ...vals, ...(goalRows?.map((r) => r.value) ?? []))
    const [yMax, setYMax] = useState(() => Math.ceil((need + 1) / 5) * 5)
    useEffect(() => {
      if (need >= yMax) setYMax(Math.min(MAXV, Math.ceil((need + 1) / 5) * 5))
      else if (need < yMax * 0.45 && yMax > 10) setYMax(Math.max(10, Math.ceil((need + 1) / 5) * 5))
    }, [need, yMax])

    // dengeleme animasyonu
    const [level, setLevel] = useState(0)
    const [leveled, setLeveled] = useState(false)
    useEffect(() => {
      const goal = leveled ? 1 : 0
      let raf = 0
      const t0 = performance.now(), from = level
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / 1100)
        const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
        setLevel(from + (goal - from) * e)
        if (k < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(raf)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leveled])
    useEffect(() => { if (leveled) setLeveled(false) }, [vals.join(','), value.kind]) // eslint-disable-line react-hooks/exhaustive-deps

    const above = vals.reduce((s, v) => s + Math.max(0, v - value.guess), 0)
    const below = vals.reduce((s, v) => s + Math.max(0, value.guess - v), 0)
    const chartBox = useRef<HTMLDivElement>(null)
    const [narrow, setNarrow] = useState(false)
    useEffect(() => {
      const el = chartBox.current
      if (!el) return
      const ro = new ResizeObserver(() => setNarrow(el.clientWidth < 520))
      ro.observe(el)
      return () => ro.disconnect()
    }, [])
    const axisKind = value.kind === 'bar' || value.kind === 'line'
    const minV = Math.min(...vals), maxV = Math.max(...vals)
    const y0 = axisKind ? Math.min(value.y0, maxV) : 0
    const iMax = vals.indexOf(maxV), iMin = vals.indexOf(minV)
    const looks = maxV - y0 > 0 && minV - y0 > 0 ? (maxV - y0) / (minV - y0) : null
    const hideStat = (k: string) => task && typeof target?.[k] === 'number'

    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {KINDS.map((k) => <ToolButton key={k.id} active={value.kind === k.id} disabled={locked || (task && !!target?.kind && target.kind !== k.id)} onClick={() => set({ kind: k.id })}>{k.label}</ToolButton>)}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-2">
            {!task ? (
              <input value={value.title} onChange={(e) => set({ title: e.target.value })} maxLength={48} aria-label="Grafik başlığı" className="mx-auto w-full max-w-md rounded-xl bg-transparent px-2 py-1 text-center text-lg font-black outline-none hover:bg-paper focus:bg-white focus:ring-2 focus:ring-brand/40" />
            ) : value.title ? (
              <p className="text-center text-lg font-black">{value.title}</p>
            ) : null}
            <div ref={chartBox} className="overflow-hidden rounded-2xl ring-1 ring-line">
              <Chart value={value} onChange={locked ? undefined : onChange} interactive={!locked} level={level} yMaxFixed={yMax} uid="gl" narrow={narrow} />
            </div>
            <p className="text-center text-sm font-bold text-ink-soft">
              {value.kind === 'pie' ? 'Daire grafiği tüm veriyi 360°’ye paylaştırır. Değerleri tablodan değiştir.' : value.kind === 'picto' ? 'Bir satırda parmağını sağa-sola kaydır: simgeler değişir.' : 'Sütunu ya da noktayı parmağınla yukarı-aşağı sürükle; tablo da değişir.'}
            </p>
            {!task && (
              <div className="grid grid-cols-5 gap-1.5">
                {KINDS.map((k) => (
                  <button key={k.id} type="button" onClick={() => set({ kind: k.id })} className={`overflow-hidden rounded-xl ring-2 transition active:scale-95 ${value.kind === k.id ? 'ring-brand' : 'ring-line opacity-80 hover:opacity-100'}`} aria-label={`${k.label} grafiği`}>
                    <Chart value={{ ...value, kind: k.id, meanLine: false }} mini level={0} yMaxFixed={yMax} uid={`m${k.id}`} />
                    <span className="block bg-paper py-0.5 text-[11px] font-extrabold">{k.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <aside className="flex flex-col gap-3">
            {/* tablo */}
            <div className="rounded-2xl bg-white p-2.5 ring-1 ring-line">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[11px] font-extrabold tracking-wide text-ink-soft uppercase">
                    <th className="px-1 pb-1">Kategori</th>
                    {buildTask && <th className="px-1 pb-1 text-center">Veri</th>}
                    <th className="px-1 pb-1 text-center">{buildTask ? 'Grafiğin' : 'Değer'}</th>
                    {!task && <th />}
                  </tr>
                </thead>
                <tbody>
                  {value.rows.map((r, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="px-1 py-1">
                        <div className="flex items-center gap-1.5">
                          <span className="size-3 shrink-0 rounded-full" style={{ background: PALETTE[i % 8] }} />
                          {task ? <span className="font-extrabold">{r.label}</span> : <input value={r.label} maxLength={12} onChange={(e) => setRow(i, { label: e.target.value })} aria-label="Kategori adı" className="w-full min-w-0 rounded-lg bg-transparent px-1 py-1.5 font-extrabold outline-none hover:bg-paper focus:bg-paper focus:ring-2 focus:ring-brand/30" />}
                        </div>
                      </td>
                      {buildTask && <td className="text-center text-lg font-black tabular-nums">{goalRows?.[i]?.value}</td>}
                      <td className="px-1 py-1">
                        {buildTask ? (
                          <span className={`block text-center text-lg font-black tabular-nums ${goalRows?.[i]?.value === r.value ? 'text-ok' : 'text-ink-soft'}`}>{r.value}</span>
                        ) : (
                          <div className="flex items-center justify-center gap-0.5">
                            <button type="button" disabled={locked || r.value <= 0} onClick={() => setRow(i, { value: r.value - 1 })} className="grid size-10 place-items-center rounded-xl text-xl font-black ring-1 ring-line active:scale-95 disabled:opacity-30" aria-label="Azalt">−</button>
                            <span className="w-9 text-center text-lg font-black tabular-nums" style={{ color: PALETTE[i % 8] }}>{r.value}</span>
                            <button type="button" disabled={locked || r.value >= MAXV} onClick={() => setRow(i, { value: r.value + 1 })} className="grid size-10 place-items-center rounded-xl text-xl font-black ring-1 ring-line active:scale-95 disabled:opacity-30" aria-label="Artır">+</button>
                          </div>
                        )}
                      </td>
                      {!task && (
                        <td className="w-10">
                          <button type="button" disabled={value.rows.length <= 2} onClick={() => set({ rows: value.rows.filter((_, j) => j !== i) })} className="grid size-10 place-items-center rounded-xl text-ink-soft hover:bg-bad-soft hover:text-bad disabled:opacity-20" aria-label="Kategoriyi sil"><Trash2 size={17} /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!task || (!buildTask && typeof target?.count !== 'number')) && value.rows.length < 8 && (
                <button type="button" disabled={locked} onClick={() => set({ rows: [...value.rows, { label: NEW_LABELS.find((l) => !value.rows.some((r) => r.label === l)) ?? 'Yeni', value: 3 }] })} className="mt-1.5 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line text-sm font-extrabold text-ink-soft hover:border-brand hover:text-brand">
                  <Plus size={16} />Kategori ekle
                </button>
              )}
            </div>

            {/* istatistikler */}
            {!buildTask && (
              <div className="grid grid-cols-2 gap-2">
                {!hideStat('mean') && <Stat label="Ortalama" value={fmt(st.mean)} hint={`${st.sum} ÷ ${vals.length}`} color="#d6457a" />}
                {!hideStat('median') && <Stat label="Ortanca" value={fmt(st.median)} hint="sıralayınca ortadaki" color="#0284c7" />}
                {!hideStat('mode') && <Stat label="Tepe değer" value={st.modes.length ? st.modes.join('; ') : 'yok'} hint="en sık tekrar eden" color="#7c3aed" />}
                {!hideStat('range') && <Stat label="Açıklık" value={fmt(st.range)} hint={`${maxV} − ${minV}`} color="#0f766e" />}
              </div>
            )}

            {!task && (
              <div className="flex flex-col gap-2 rounded-2xl bg-paper p-3">
                <div className="flex flex-wrap gap-1.5">
                  <ToolButton active={value.meanLine} onClick={() => set({ meanLine: !value.meanLine, kind: 'bar' })}>⚖️ Ortalama çizgisi</ToolButton>
                  <ToolButton active={leveled} onClick={() => { if (value.kind !== 'bar') set({ kind: 'bar' }); setLeveled(!leveled) }}>{leveled ? '↩︎ Geri al' : '🟰 Eşitle'}</ToolButton>
                </div>
                {value.meanLine && !leveled && (
                  <p className={`rounded-xl p-2 text-sm font-bold ${Math.abs(above - below) < 1e-9 ? 'bg-ok-soft text-green-900' : 'bg-white text-ink'}`}>
                    Çizginin üstünde taşan: <b className="text-brand">{fmt(above, 1)}</b> · altında eksik: <b className="text-sky-700">{fmt(below, 1)}</b>
                    <br />
                    {Math.abs(above - below) < 1e-9 ? `Dengede! Taşanlar eksikleri tam dolduruyor: ortalama ${fmt(value.guess, 1)}.` : above > below ? 'Taşan daha çok: çizgiyi yukarı çek.' : 'Eksik daha çok: çizgiyi aşağı indir.'}
                  </p>
                )}
                {leveled && <p className="rounded-xl bg-ok-soft p-2 text-sm font-bold text-green-900">Fazlalıklar eksiklere taşındı: her sütun {fmt(st.mean)} oldu. Ortalama, veriyi “eşit paylaştırınca” her birine düşen değerdir.</p>}
                {axisKind && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold">Dikey eksen başlangıcı</span>
                    <Stepper label="" value={y0} onDec={() => set({ y0: Math.max(0, y0 - 1) })} onInc={() => set({ y0: Math.min(minV, y0 + 1) })} />
                  </div>
                )}
                {value.kind === 'picto' && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold">Bir simge kaç kişi?</span>
                    <div className="flex gap-1">{[1, 2, 5].map((u) => <ToolButton key={u} active={value.unit === u} onClick={() => set({ unit: u })}>{u}</ToolButton>)}</div>
                  </div>
                )}
                {axisKind && y0 > 0 && looks && iMax !== iMin && (
                  <p className="rounded-xl bg-bad-soft p-2 text-sm font-bold text-rose-900">
                    ⚠️ Eksen 0’dan değil {ek(y0, 'abl')} başlıyor! Görünüşte {value.rows[iMax].label}, {value.rows[iMin].label} sütununun <b>{fmt(looks, 1)} katı</b>; gerçekte yalnızca {maxV} ÷ {minV} ≈ <b>{fmt(maxV / minV, 1)} katı</b>.
                  </p>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    )
  },
}
