import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useDrag, useGesture } from '@use-gesture/react'
import { Check, ChevronsDown, ChevronsUp, Minus, Plus, RotateCcw } from 'lucide-react'
import { Plane, usePlane } from '../../../interactive/Plane'
import { clamp, niceStep, ticks } from '../../../interactive/axis'
import type { Step, Thumb } from './cases'

/**
 * Veri Dedektifleri — dokunmatik, canlı grafik bileşenleri.
 * Her bileşen bir inceleme adımıdır: öğrenci grafiği değiştirdikçe matematiksel ilişki görünür hâle gelir;
 * hedefe ulaşınca onDone() bir kez çağrılır. Yanlış bir kontrol onMiss(soru, yanılgı) ile kabuğa bildirilir.
 */

export type S<K extends Step['kind']> = Extract<Step, { kind: K }>
export interface Ink {
  dark: boolean
  text: string
  soft: string
  grid: string
  axis: string
  surface: string
  panel: string
}
export const inkFor = (dark: boolean): Ink =>
  dark
    ? { dark, text: '#e2e8f0', soft: '#94a3b8', grid: '#334155', axis: '#cbd5e1', surface: '#0f172a', panel: '#1e293b' }
    : { dark, text: '#1f2340', soft: '#5b6080', grid: '#e7e8f2', axis: '#1f2340', surface: '#ffffff', panel: '#f8fafc' }

/** Kategorik renkler (sabit sırada; açık/koyu zeminde doğrulandı) */
export const SERIES = ['#0d9488', '#d97706', '#6366f1', '#db2777']
const MEAN = '#db2777'
const MEDIAN = '#0d9488'

export const fmt = (v: number, d = 2) => {
  const r = Math.round(v * 10 ** d) / 10 ** d
  return (Object.is(r, -0) ? 0 : r).toLocaleString('tr-TR', { maximumFractionDigits: d }).replace('-', '−')
}
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
const meanOf = (a: number[]) => sum(a) / a.length
const medianOf = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

interface P<K extends Step['kind']> {
  s: S<K>
  ink: Ink
  onDone: () => void
  onMiss?: (q: string, mis?: string) => void
  onClue?: (t: string) => void
}

/** Kabın genişliği — ilk boyamadan önce ölçülür (varsayılan genişlikle bir kare titremesin) */
function useWidth<T extends HTMLElement>() {
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

/** onDone'u yalnızca bir kez çağırır */
function useOnce(cond: boolean, cb: () => void) {
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

/** İstemci koordinatını SVG (viewBox = piksel) koordinatına çevirir */
function toLocal(svg: SVGSVGElement | null, w: number, cx: number, cy: number) {
  const r = svg?.getBoundingClientRect()
  if (!r || !r.width) return { x: 0, y: 0 }
  const k = w / r.width
  return { x: (cx - r.left) * k, y: (cy - r.top) * k }
}

/** Grafik kartı + altında canlı okuma */
function Frame({ ink, title, children, readout, tools }: { ink: Ink; title?: string; children: ReactNode; readout?: ReactNode; tools?: ReactNode }) {
  return (
    <div className="rounded-2xl p-2 sm:p-3" style={{ background: ink.surface, boxShadow: ink.dark ? 'inset 0 0 0 1px #334155' : 'inset 0 0 0 1px #e7e8f2' }}>
      {title && <p className="px-1 pb-1 text-sm font-black" style={{ color: ink.text }}>{title}</p>}
      {children}
      {tools && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{tools}</div>}
      {readout && <div className="mt-2 flex flex-wrap justify-center gap-2">{readout}</div>}
    </div>
  )
}

export function Chip({ ink, tone = 'plain', children }: { ink: Ink; tone?: 'plain' | 'warn' | 'ok' | 'mean' | 'median'; children: ReactNode }) {
  const c = {
    plain: ink.dark ? 'bg-slate-700 text-slate-100' : 'bg-slate-100 text-ink',
    warn: ink.dark ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40' : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200',
    ok: ink.dark ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40' : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200',
    mean: ink.dark ? 'bg-pink-500/20 text-pink-200 ring-1 ring-pink-400/40' : 'bg-pink-50 text-pink-800 ring-1 ring-pink-200',
    median: ink.dark ? 'bg-teal-500/20 text-teal-200 ring-1 ring-teal-400/40' : 'bg-teal-50 text-teal-800 ring-1 ring-teal-200',
  }[tone]
  return <span className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-extrabold ${c}`}>{children}</span>
}

export function ToolBtn({ ink, onClick, children, active, disabled, label }: { ink: Ink; onClick: () => void; children: ReactNode; active?: boolean; disabled?: boolean; label?: string }) {
  const cls = active
    ? 'bg-teal-600 text-white ring-teal-600'
    : ink.dark
      ? 'bg-slate-700 text-slate-100 ring-slate-500 hover:bg-slate-600'
      : 'bg-white text-ink ring-line hover:bg-paper'
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} aria-pressed={active} className={`inline-flex min-h-12 min-w-12 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-extrabold ring-1 transition active:scale-95 disabled:opacity-40 ${cls}`}>
      {children}
    </button>
  )
}

/** Yuvarlatılmış tepeli sütun yolu (alt kenar düz, taban çizgisine bağlı) */
function barPath(x: number, y: number, w: number, base: number, r = 4) {
  const h = base - y
  if (h <= 0.5) return ''
  const rr = Math.min(r, h, w / 2)
  return `M${x} ${base}V${y + rr}Q${x} ${y} ${x + rr} ${y}H${x + w - rr}Q${x + w} ${y} ${x + w} ${y + rr}V${base}Z`
}

/* ═════════════════════════ 1. Yanıltıcı eksen: eksen başlangıcını/üstünü sürükle, iki parmakla ölçekle ═════════════════════════ */
export function AxisChart({ s, ink, onDone }: P<'axis'>) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const svgRef = useRef<SVGSVGElement>(null)
  const H = Math.round(clamp(w * 0.6, 250, 340))
  const pad = { l: 62, r: 16, t: 30, b: 42 }
  const pw = w - pad.l - pad.r
  const ph = H - pad.t - pad.b
  const [lo, setLo] = useState(s.lo)
  const [hi, setHi] = useState(s.hi)
  const vals = s.data.map((d) => d.value)
  const maxV = Math.max(...vals)
  const fitTop = maxV * 1.6
  const solved = s.goal === 'zero' ? lo <= 0 : hi <= fitTop
  useOnce(solved, onDone)
  const Y = (v: number) => pad.t + ph * (1 - (v - lo) / (hi - lo))
  const base = pad.t + ph
  const r1 = (v: number) => Math.round(v * 10) / 10

  const setLoSafe = (v: number) => setLo(() => {
    const x = clamp(r1(v), 0, s.lo)
    return x < s.lo * 0.04 ? 0 : x
  })
  const setHiSafe = (v: number) => setHi(() => {
    const x = clamp(r1(v), maxV * 1.08, s.hi)
    return x <= fitTop ? Math.max(maxV * 1.1, Math.ceil((maxV * 1.25) / 10) * 10) : x
  })

  const bindLo = useDrag(({ movement: [, my], first, memo, event }) => {
    event.stopPropagation()
    const m0 = first ? lo : (memo as number)
    setLoSafe(m0 - (my / (ph * 0.8)) * s.lo)
    return m0
  })
  const bindHi = useDrag(({ movement: [, my], first, memo, event }) => {
    event.stopPropagation()
    const m0 = first ? hi : (memo as number)
    setHiSafe(m0 - (my / (ph * 0.8)) * (s.hi - maxV))
    return m0
  })
  useGesture(
    {
      onPinch: ({ movement: [f], first, memo, event }) => {
        event.preventDefault()
        const m = first || !memo ? { lo, hi } : (memo as { lo: number; hi: number })
        if (s.goal === 'zero') setLoSafe(m.hi - (m.hi - m.lo) / f)
        else setHiSafe(m.lo + (m.hi - m.lo) / f)
        return m
      },
    },
    { target: ref, eventOptions: { passive: false } },
  )

  const step = niceStep(hi - lo, ph, 30)
  const tk = ticks(lo, hi, step).filter((t) => Math.abs(t - lo) > step * 0.45 && Math.abs(t - hi) > step * 0.45)
  const n = s.data.length
  const slot = pw / n
  const cx = (i: number) => pad.l + slot * (i + 0.5)
  const bw = Math.min(84, slot * 0.52)

  // canlı okuma
  let shown: ReactNode = null
  if (s.chart === 'bar' && n === 2 && s.goal === 'zero') {
    const [a, b] = s.data
    const ratio = (b.value - lo) / Math.max(0.0001, a.value - lo)
    shown = <Chip ink={ink} tone={solved ? 'ok' : 'warn'}>Görünen: {b.label} sütunu {a.label} sütununun {fmt(ratio, 1)} katı uzun</Chip>
  } else if (s.chart === 'line') {
    const first = s.data[0].value, last = s.data[n - 1].value
    const pct = (Math.abs(last - first) / (hi - lo)) * 100
    shown = <Chip ink={ink} tone={solved ? 'ok' : 'warn'}>Görünen değişim: çizgi grafik yüksekliğinin %{fmt(pct, 0)}’{pctSuffix(Math.round(pct))} kadar {last < first ? 'iniyor' : 'çıkıyor'}</Chip>
  } else if (s.goal === 'fit') {
    shown = <Chip ink={ink} tone={solved ? 'ok' : 'warn'}>En uzun sütun, grafik yüksekliğinin %{fmt((maxV / hi) * 100, 0)}’{pctSuffix(Math.round((maxV / hi) * 100))} kadar</Chip>
  }

  const handle = (y: number, value: number, kind: 'lo' | 'hi') => (
    <g {...(kind === 'lo' ? bindLo() : bindHi())} data-handle style={{ cursor: 'ns-resize', touchAction: 'none' }} role="slider" aria-label={kind === 'lo' ? 'Eksen başlangıcı' : 'Eksen üst sınırı'} aria-valuenow={value}>
      <rect x={2} y={y - 22} width={pad.l - 6} height={44} fill="transparent" />
      <rect x={4} y={y - 14} width={pad.l - 10} height={28} rx={14} fill={solved ? '#16a34a' : '#db2777'} />
      <text x={pad.l / 2 - 1} y={y + 5} textAnchor="middle" fontSize={13} fontWeight={900} fill="#fff">{fmt(value, 1)}</text>
      {!solved && (
        <g className="vd-bob">
          <path d={kind === 'lo' ? `M${pad.l / 2 - 6} ${y + 20}l6 7l6 -7` : `M${pad.l / 2 - 6} ${y - 20}l6 -7l6 7`} fill="none" stroke="#db2777" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </g>
  )

  return (
    <Frame
      ink={ink}
      title={s.title}
      readout={<>{shown}{solved && <Chip ink={ink} tone="ok"><Check size={16} />Eksen dürüst: {s.goal === 'zero' ? '0’dan başlıyor' : 'verilere uygun'}</Chip>}</>}
      tools={
        s.goal === 'zero' ? (
          <>
            <ToolBtn ink={ink} onClick={() => setLoSafe(lo - s.lo / 4)} disabled={solved} label="Ekseni aşağı çek"><ChevronsDown size={18} />Ekseni aşağı çek</ToolBtn>
            <ToolBtn ink={ink} onClick={() => setLoSafe(lo + s.lo / 4)} disabled={lo >= s.lo} label="Geri al"><ChevronsUp size={18} /></ToolBtn>
          </>
        ) : (
          <>
            <ToolBtn ink={ink} onClick={() => setHiSafe(hi - (s.hi - maxV) / 4)} disabled={solved} label="Üst sınırı küçült"><ChevronsDown size={18} />Üst sınırı küçült</ToolBtn>
            <ToolBtn ink={ink} onClick={() => setHi(s.hi)} disabled={hi >= s.hi} label="Başa dön"><RotateCcw size={16} /></ToolBtn>
          </>
        )
      }
    >
      <div ref={ref} style={{ touchAction: 'none' }} className="select-none">
        <svg ref={svgRef} viewBox={`0 0 ${w} ${H}`} width="100%" height={H} role="img" aria-label={`${s.title}: ${s.data.map((d) => `${d.label} ${fmt(d.value)}`).join(', ')}`}>
          {tk.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={Y(t)} y2={Y(t)} stroke={ink.grid} />
              <text x={pad.l - 8} y={Y(t) + 4} textAnchor="end" fontSize={12} fontWeight={800} fill={ink.soft}>{fmt(t, 2)}</text>
            </g>
          ))}
          <line x1={pad.l} x2={pad.l} y1={pad.t - 6} y2={base} stroke={ink.axis} strokeWidth={1.5} />
          <line x1={pad.l} x2={w - pad.r} y1={base} y2={base} stroke={ink.axis} strokeWidth={1.5} />
          {s.chart === 'bar'
            ? s.data.map((d, i) => (
                <g key={d.label}>
                  <path d={barPath(cx(i) - bw / 2, Y(d.value), bw, base)} fill={SERIES[0]} style={{ transition: 'd 120ms' }} />
                  {solved && <text x={cx(i)} y={Y(d.value) - 8} textAnchor="middle" fontSize={15} fontWeight={900} fill={ink.text} className="animate-pop">{fmt(d.value)}</text>}
                </g>
              ))
            : (
              <g>
                <polyline points={s.data.map((d, i) => `${cx(i)},${Y(d.value)}`).join(' ')} fill="none" stroke={SERIES[0]} strokeWidth={2.5} strokeLinejoin="round" />
                {s.data.map((d, i) => (
                  <g key={d.label}>
                    <circle cx={cx(i)} cy={Y(d.value)} r={6} fill={SERIES[0]} stroke={ink.surface} strokeWidth={2} />
                    {solved && <text x={cx(i)} y={Y(d.value) - 12} textAnchor="middle" fontSize={13} fontWeight={900} fill={ink.text} className="animate-pop">{fmt(d.value)}</text>}
                  </g>
                ))}
              </g>
            )}
          {s.data.map((d, i) => <text key={d.label} x={cx(i)} y={base + 22} textAnchor="middle" fontSize={13} fontWeight={800} fill={ink.text}>{d.label}</text>)}
          {s.goal === 'zero' ? handle(base, lo, 'lo') : handle(pad.t, hi, 'hi')}
          {s.goal === 'zero' && <text x={pad.l - 8} y={pad.t + 4} textAnchor="end" fontSize={12} fontWeight={800} fill={ink.soft}>{fmt(hi, 1)}</text>}
          {s.goal === 'fit' && <text x={pad.l - 8} y={base + 4} textAnchor="end" fontSize={12} fontWeight={800} fill={ink.soft}>0</text>}
        </svg>
      </div>
    </Frame>
  )
}

/** "%40’ı", "%67’si" gibi yüzde ekleri (yüzde + sayı okunuşu: kırk → kırkı) */
export function pctSuffix(n: number): string {
  const last = n % 10, tens = Math.floor(n / 10) % 10
  if (n === 100) return 'ü'
  if (last === 0) return ['', 'u', 'si', 'u', 'ı', 'si', 'ı', 'i', 'i', 'ı'][tens] || 'ı'
  return ['', 'i', 'si', 'ü', 'ü', 'i', 'sı', 'si', 'i', 'u'][last]
}

/* ═════════════════════════ 2. Resim grafiği: büyütülmüş simgeleri eşit boya getir ═════════════════════════ */
function Glyph({ kind, x, y, size, color }: { kind: 'book' | 'tree'; x: number; y: number; size: number; color: string }) {
  if (kind === 'tree')
    return (
      <g>
        <rect x={x + size * 0.42} y={y + size * 0.6} width={size * 0.16} height={size * 0.4} rx={2} fill="#92400e" />
        <circle cx={x + size / 2} cy={y + size * 0.4} r={size * 0.38} fill={color} />
      </g>
    )
  return (
    <g>
      <rect x={x + size * 0.12} y={y + size * 0.06} width={size * 0.76} height={size * 0.88} rx={size * 0.1} fill={color} />
      <rect x={x + size * 0.12} y={y + size * 0.06} width={size * 0.14} height={size * 0.88} rx={size * 0.06} fill="#0f766e" />
      <rect x={x + size * 0.36} y={y + size * 0.24} width={size * 0.4} height={size * 0.08} rx={2} fill="#ffffffaa" />
      <rect x={x + size * 0.36} y={y + size * 0.4} width={size * 0.3} height={size * 0.07} rx={2} fill="#ffffff88" />
    </g>
  )
}

export function Pictograph({ s, ink, onDone }: P<'picto'>) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [scales, setScales] = useState(() => s.rows.map((r) => r.scale))
  const odd = s.rows.map((r) => r.scale !== 1)
  const solved = scales.every((x) => x === 1)
  useOnce(solved, onDone)
  const labelW = 58
  const worst = Math.max(...s.rows.map((r) => r.count * r.scale))
  const base = clamp((w - labelW - 70) / (worst * 1.12), 18, 44)
  const gap = base * 0.12
  const rowH = (sc: number) => base * sc + 16
  const setScale = (i: number, v: number) =>
    setScales((cur) => cur.map((x, k) => (k === i ? (Math.abs(v - 1) < 0.12 ? 1 : clamp(Math.round(v * 100) / 100, 0.55, 2.4)) : x)))

  useGesture(
    {
      onPinch: ({ movement: [f], first, memo, event }) => {
        event.preventDefault()
        const m = first || !memo ? [...scales] : (memo as number[])
        s.rows.forEach((_, i) => odd[i] && setScale(i, m[i] * f))
        return m
      },
    },
    { target: ref, eventOptions: { passive: false } },
  )

  let y = 8
  const rows = s.rows.map((r, i) => {
    const sc = scales[i]
    const top = y
    y += rowH(sc) + 8
    return { r, i, sc, top }
  })
  const H = y + 4

  return (
    <Frame
      ink={ink}
      title={s.title}
      readout={
        <>
          <Chip ink={ink}><svg width={22} height={22} viewBox="0 0 22 22" aria-hidden><Glyph kind={s.icon} x={0} y={0} size={22} color={SERIES[0]} /></svg>= {s.per} {s.unit}</Chip>
          {solved ? <Chip ink={ink} tone="ok"><Check size={16} />Simgeler aynı boyda</Chip> : <Chip ink={ink} tone="warn">Simgeler aynı boyda değil!</Chip>}
        </>
      }
      tools={odd.some(Boolean) && (
        <>
          <ToolBtn ink={ink} onClick={() => s.rows.forEach((_, i) => odd[i] && setScale(i, scales[i] - 0.2))} disabled={solved} label="Simgeyi küçült"><Minus size={18} />Küçült</ToolBtn>
          <ToolBtn ink={ink} onClick={() => s.rows.forEach((_, i) => odd[i] && setScale(i, scales[i] + 0.2))} label="Simgeyi büyüt"><Plus size={18} />Büyüt</ToolBtn>
        </>
      )}
    >
      <div ref={ref} style={{ touchAction: 'none' }} className="select-none">
        <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H} role="img" aria-label={`${s.title}: ${s.rows.map((r) => `${r.label} ${r.count} simge`).join(', ')}`}>
          {rows.map(({ r, i, sc, top }) => {
            const size = base * sc
            const end = labelW + r.count * (size + gap)
            return (
              <g key={r.label}>
                <rect x={0} y={top} width={w} height={rowH(sc)} rx={10} fill={i % 2 ? 'transparent' : ink.dark ? '#ffffff08' : '#f8fafc'} />
                <text x={8} y={top + rowH(sc) / 2 + 5} fontSize={15} fontWeight={900} fill={ink.text}>{r.label}</text>
                {Array.from({ length: r.count }, (_, k) => <Glyph key={k} kind={s.icon} x={labelW + k * (size + gap)} y={top + 8} size={size} color={SERIES[0]} />)}
                <text x={end + 6} y={top + rowH(sc) / 2 + 5} fontSize={13} fontWeight={800} fill={ink.soft}>{r.count} simge</text>
                {odd[i] && <PictoHandle x={end + 4} y={top + rowH(sc) / 2 - 18} active={!solved} onDrag={(dx, s0) => setScale(i, s0 + dx / (r.count * base))} getScale={() => scales[i]} />}
              </g>
            )
          })}
        </svg>
      </div>
    </Frame>
  )
}

function PictoHandle({ x, y, onDrag, getScale, active }: { x: number; y: number; onDrag: (dx: number, s0: number) => void; getScale: () => number; active: boolean }) {
  const bind = useDrag(({ movement: [mx], first, memo, event }) => {
    event.stopPropagation()
    const s0 = first ? getScale() : (memo as number)
    onDrag(mx, s0)
    return s0
  })
  return (
    <g {...bind()} data-handle style={{ cursor: 'ew-resize', touchAction: 'none' }} transform={`translate(${x + 58} ${y})`} role="slider" aria-label="Simge boyutu">
      <circle cx={18} cy={18} r={26} fill="transparent" />
      <circle cx={18} cy={18} r={16} fill={active ? '#db2777' : '#16a34a'} stroke="#fff" strokeWidth={3} className={active ? 'vd-pulse' : ''} />
      <path d="M11 18h14M11 18l4-4M11 18l4 4M25 18l-4-4M25 18l-4 4" stroke="#fff" strokeWidth={2} strokeLinecap="round" fill="none" />
    </g>
  )
}

/* ═════════════════════════ 3. Anket simülasyonu: örneklem seç, veriyi topla ═════════════════════════ */
export function Survey({ s, ink, onDone, onClue }: P<'survey'>) {
  const people = useMemo(() => s.groups.flatMap((g) => g.dist.flatMap((c, a) => Array.from({ length: c }, () => ({ g: g.id, a })))), [s])
  // grup içinde cevapları karıştır (gruplar yan yana kalsın)
  const ordered = useMemo(() => {
    const out: { g: string; a: number }[] = []
    for (const g of s.groups) {
      const part = people.filter((p) => p.g === g.id)
      for (let i = part.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[part[i], part[j]] = [part[j], part[i]]
      }
      out.push(...part)
    }
    return out
  }, [people, s.groups])
  const popCounts = s.answers.map((_, a) => ordered.filter((p) => p.a === a).length)
  const [sel, setSel] = useState(s.samples[0].id)
  const [active, setActive] = useState<{ id: string; picked: number[] } | null>(null)
  const [fairDone, setFairDone] = useState(false)
  const [runs, setRuns] = useState(0)
  useOnce(fairDone, onDone)

  const run = () => {
    const sm = s.samples.find((x) => x.id === sel)!
    const pool = ordered.map((p, i) => ({ p, i })).filter(({ p }) => sm.from === 'all' || sm.from.includes(p.g)).map((x) => x.i)
    let picked = pool.slice(0, sm.n)
    if (sm.n < pool.length) {
      for (let tries = 0; tries < 60; tries++) {
        const sh = [...pool].sort(() => Math.random() - 0.5).slice(0, sm.n)
        const c = s.answers.map((_, a) => sh.filter((i) => ordered[i].a === a).length)
        const tv = sum(c.map((x, a) => Math.abs(x / sm.n - popCounts[a] / ordered.length)))
        picked = sh
        if (tv < 0.3) break
      }
    }
    setActive({ id: sm.id, picked })
    setRuns((r) => r + 1)
    onClue?.(sm.clue)
    if (sm.fair) setFairDone(true)
  }

  const cols = ordered.length <= 30 ? 7 : 15
  const cell = ordered.length <= 30 ? 34 : 22
  const rowsN = Math.ceil(ordered.length / cols)
  const gw = cols * cell, gh = rowsN * cell
  const pickedSet = new Set(active?.picked ?? [])
  const counts = s.answers.map((_, a) => (active ? active.picked.filter((i) => ordered[i].a === a).length : 0))
  const maxC = Math.max(1, ...counts)
  const sample = s.samples.find((x) => x.id === active?.id)

  return (
    <Frame ink={ink} title={`Anket sorusu: “${s.question}”`}>
      <div className="grid gap-3 md:grid-cols-[auto_1fr] md:items-start">
        <div className="mx-auto w-full max-w-[360px]">
          <svg viewBox={`0 0 ${gw} ${gh}`} width="100%" role="img" aria-label={`${ordered.length} kişilik evren`}>
            {ordered.map((p, i) => {
              const x = (i % cols) * cell + cell / 2, y = Math.floor(i / cols) * cell + cell / 2
              const on = pickedSet.has(i)
              const r = cell * 0.36
              return (
                <g key={`${runs}-${i}`} className={on ? 'animate-pop' : ''} style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: `${(active?.picked.indexOf(i) ?? 0) * 18}ms` }}>
                  <circle cx={x} cy={y - r * 0.55} r={r * 0.45} fill={on ? SERIES[p.a] : ink.dark ? '#475569' : '#cbd5e1'} />
                  <path d={`M${x - r * 0.75} ${y + r * 0.95}Q${x - r * 0.75} ${y + r * 0.05} ${x} ${y + r * 0.05}Q${x + r * 0.75} ${y + r * 0.05} ${x + r * 0.75} ${y + r * 0.95}Z`} fill={on ? SERIES[p.a] : ink.dark ? '#475569' : '#cbd5e1'} />
                  {on && <circle cx={x} cy={y} r={cell * 0.48} fill="none" stroke={SERIES[p.a]} strokeWidth={1.5} opacity={0.5} />}
                </g>
              )
            })}
          </svg>
          <p className="mt-1 text-center text-xs font-bold" style={{ color: ink.soft }}>Evren: {ordered.length} öğrenci · renkli olanlara soruldu</p>
        </div>
        <div className="min-w-0">
          <div className="grid gap-2">
            {s.samples.map((sm) => (
              <button key={sm.id} type="button" onClick={() => setSel(sm.id)} aria-pressed={sel === sm.id} className={`flex min-h-14 items-center gap-3 rounded-xl px-3 text-left text-[15px] font-extrabold ring-2 transition ${sel === sm.id ? 'ring-teal-500' : ink.dark ? 'ring-slate-600' : 'ring-line'} ${ink.dark ? 'bg-slate-800 text-slate-100' : 'bg-white text-ink'}`}>
                <span className="text-2xl" aria-hidden>{sm.emoji}</span>
                <span className="flex-1">{sm.label}</span>
                {sel === sm.id && <Check size={18} className="text-teal-500" />}
              </button>
            ))}
          </div>
          <button type="button" onClick={run} className="btn-primary mt-3 w-full">{active ? 'Anketi yeniden yap' : 'Anketi yap'}</button>
          {active && sample && (
            <div className="mt-3 animate-fade-up" aria-live="polite">
              <p className="mb-1.5 text-sm font-black" style={{ color: ink.text }}>{sample.label}: {active.picked.length} cevap</p>
              {s.answers.map((a, i) => (
                <div key={a} className="mb-1.5 flex items-center gap-2">
                  <span className="w-28 shrink-0 text-right text-[13px] font-extrabold" style={{ color: ink.text }}>{a}</span>
                  <div className="relative h-7 flex-1 overflow-hidden rounded-r-lg" style={{ background: ink.dark ? '#ffffff0d' : '#f1f5f9' }}>
                    <div className="h-full rounded-r-md transition-all duration-700" style={{ width: `${(counts[i] / maxC) * 100}%`, background: SERIES[i] }} />
                  </div>
                  <span className="w-7 text-sm font-black" style={{ color: ink.text }}>{counts[i]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Frame>
  )
}

/* ═════════════════════════ 4. Tablodan grafik: sütunları sürükleyerek çiz ═════════════════════════ */
export function BuildBars({ s, ink, onDone }: P<'build'>) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const svgRef = useRef<SVGSVGElement>(null)
  const [vals, setVals] = useState(() => s.data.map(() => 0))
  const solved = vals.every((v, i) => v === s.data[i].value)
  useOnce(solved, onDone)
  const H = Math.round(clamp(w * 0.62, 250, 330))
  const pad = { l: 40, r: 10, t: 16, b: 40 }
  const pw = w - pad.l - pad.r, ph = H - pad.t - pad.b
  const Y = (v: number) => pad.t + ph * (1 - v / s.max)
  const slot = pw / s.data.length
  const bw = Math.min(70, slot * 0.6)
  const set = (i: number, cy: number) => {
    const { y } = toLocal(svgRef.current, w, 0, cy)
    const v = clamp(Math.round(((pad.t + ph - y) / ph) * s.max), 0, s.max)
    setVals((cur) => cur.map((x, k) => (k === i ? v : x)))
  }
  return (
    <Frame ink={ink} title={s.title}>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div ref={ref} className="select-none" style={{ touchAction: 'none' }}>
          <svg ref={svgRef} viewBox={`0 0 ${w} ${H}`} width="100%" height={H} role="img" aria-label="Oluşturulan sütun grafiği">
            {ticks(0, s.max, 1).map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={w - pad.r} y1={Y(t)} y2={Y(t)} stroke={ink.grid} strokeDasharray={t % 2 ? '3 4' : undefined} />
                {t % 2 === 0 && <text x={pad.l - 8} y={Y(t) + 4} textAnchor="end" fontSize={12} fontWeight={800} fill={ink.soft}>{t}</text>}
              </g>
            ))}
            <line x1={pad.l} x2={w - pad.r} y1={Y(0)} y2={Y(0)} stroke={ink.axis} strokeWidth={1.5} />
            <line x1={pad.l} x2={pad.l} y1={pad.t} y2={Y(0)} stroke={ink.axis} strokeWidth={1.5} />
            {s.data.map((d, i) => (
              <BuildCol key={d.label} x={pad.l + slot * i} slot={slot} bw={bw} top={pad.t} height={ph} y={Y(vals[i])} base={Y(0)} ok={vals[i] === d.value} value={vals[i]} label={d.label} ink={ink} onSet={(cy) => set(i, cy)} />
            ))}
          </svg>
        </div>
        <table className="mx-auto text-sm font-extrabold" style={{ color: ink.text }}>
          <thead><tr><th className="px-2 pb-1 text-left">Oyun</th><th className="px-2 pb-1 text-right">Kişi</th></tr></thead>
          <tbody>
            {s.data.map((d, i) => (
              <tr key={d.label} className={i % 2 ? '' : ink.dark ? 'bg-white/5' : 'bg-slate-50'}>
                <td className="px-2 py-1.5">{d.label}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{d.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Frame>
  )
}

function BuildCol({ x, slot, bw, top, height, y, base, ok, value, label, ink, onSet }: { x: number; slot: number; bw: number; top: number; height: number; y: number; base: number; ok: boolean; value: number; label: string; ink: Ink; onSet: (cy: number) => void }) {
  const bind = useDrag(({ xy: [, cy], event }) => {
    event.stopPropagation()
    onSet(cy)
  }, { filterTaps: false })
  const cx = x + slot / 2
  return (
    <g {...bind()} data-handle style={{ cursor: 'ns-resize', touchAction: 'none' }} role="slider" aria-label={`${label} sütunu`} aria-valuenow={value}>
      <rect x={x + 2} y={top} width={slot - 4} height={height} fill="transparent" />
      <path d={barPath(cx - bw / 2, y, bw, base)} fill={SERIES[0]} opacity={ok ? 1 : 0.8} />
      <rect x={cx - bw / 2} y={y - 5} width={bw} height={10} rx={5} fill={ok ? '#16a34a' : '#db2777'} />
      <text x={cx} y={y - 12} textAnchor="middle" fontSize={14} fontWeight={900} fill={ink.text}>{value}{ok ? ' ✓' : ''}</text>
      <text x={cx} y={base + 22} textAnchor="middle" fontSize={12} fontWeight={800} fill={ink.text}>{label}</text>
    </g>
  )
}

/* ═════════════════════════ 5. Çetele: her kişiye dokun, veriyi topla ═════════════════════════ */
export function Tally({ s, ink, onDone }: P<'tally'>) {
  const people = useMemo(() => {
    const a = s.cats.flatMap((c, i) => Array.from({ length: c.count }, () => i))
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }, [s])
  const [counted, setCounted] = useState<boolean[]>(() => people.map(() => false))
  const solved = counted.every(Boolean)
  useOnce(solved, onDone)
  const tallies = s.cats.map((_, i) => people.filter((p, k) => p === i && counted[k]).length)
  return (
    <Frame ink={ink} title={s.title} tools={!solved && <ToolBtn ink={ink} onClick={() => setCounted((c) => { const k = c.indexOf(false); return c.map((x, i) => (i === k ? true : x)) })}>Sıradakini say</ToolBtn>}>
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {people.map((c, i) => (
            <button key={i} type="button" disabled={counted[i]} onClick={() => setCounted((cur) => cur.map((x, k) => (k === i ? true : x)))} aria-label={`${i + 1}. öğrenci${counted[i] ? ', sayıldı' : ''}`} className={`relative grid aspect-square min-h-12 place-items-center rounded-2xl ring-1 transition active:scale-95 ${counted[i] ? 'opacity-35' : 'hover:-translate-y-0.5'} ${ink.dark ? 'bg-slate-800 ring-slate-600' : 'bg-amber-50 ring-amber-200'}`}>
              <svg viewBox="0 0 40 40" className="size-[78%]" aria-hidden>
                <circle cx={20} cy={20} r={17} fill="#fcd9b6" />
                <path d="M4 17Q6 3 20 3Q34 3 36 17Q30 9 20 10Q10 9 4 17Z" fill={['#3f2a1d', '#111827', '#a16207', '#7c2d12'][i % 4]} />
                {[13, 27].map((ex) => (
                  <g key={ex}>
                    <ellipse cx={ex} cy={21} rx={5} ry={4.2} fill="#fff" />
                    <circle cx={ex} cy={21} r={3.1} fill={s.cats[c].color} />
                    <circle cx={ex} cy={21} r={1.4} fill="#111" />
                  </g>
                ))}
                <path d="M15 29Q20 33 25 29" stroke="#9a3412" strokeWidth={1.8} fill="none" strokeLinecap="round" />
              </svg>
              {counted[i] && <Check size={18} className="absolute top-1 right-1 text-emerald-600" strokeWidth={3} />}
            </button>
          ))}
        </div>
        <table className="w-full text-[15px] font-extrabold md:w-56" style={{ color: ink.text }}>
          <tbody>
            {s.cats.map((c, i) => (
              <tr key={c.label} className={i % 2 ? '' : ink.dark ? 'bg-white/5' : 'bg-slate-50'}>
                <td className="py-2 pl-2"><span className="mr-1.5 inline-block size-3 rounded-full align-middle" style={{ background: c.color }} />{c.label}</td>
                <td className="py-2"><TallyMarks n={tallies[i]} color={ink.text} /></td>
                <td className="py-2 pr-2 text-right tabular-nums">{tallies[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Frame>
  )
}

function TallyMarks({ n, color }: { n: number; color: string }) {
  const groups = Math.floor(n / 5), rest = n % 5
  const W = groups * 26 + rest * 6 + 4
  return (
    <svg width={Math.max(W, 10)} height={22} aria-hidden>
      {Array.from({ length: groups }, (_, g) => (
        <g key={g} transform={`translate(${g * 26 + 2} 2)`}>
          {[0, 1, 2, 3].map((k) => <line key={k} x1={k * 5} x2={k * 5} y1={0} y2={18} stroke={color} strokeWidth={2} strokeLinecap="round" />)}
          <line x1={-2} x2={18} y1={15} y2={3} stroke={color} strokeWidth={2} strokeLinecap="round" />
        </g>
      ))}
      {Array.from({ length: rest }, (_, k) => <line key={k} x1={groups * 26 + 2 + k * 6} x2={groups * 26 + 2 + k * 6} y1={2} y2={20} stroke={color} strokeWidth={2} strokeLinecap="round" />)}
    </svg>
  )
}

/* ═════════════════════════ 6. Ortalama = eşit paylaşım: kuleleri dengele ═════════════════════════ */
export function Level({ s, ink, onDone, onMiss }: P<'level'>) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const svgRef = useRef<SVGSVGElement>(null)
  const [vals, setVals] = useState(() => s.data.map((d) => d.value))
  const [sel, setSel] = useState<number | null>(null)
  const [drag, setDrag] = useState<{ from: number; x: number; y: number } | null>(null)
  const [moves, setMoves] = useState(0)
  const [leveled, setLeveled] = useState(false)
  const miss = s.missing
  const n = vals.length
  const total = sum(vals)
  const solved = miss ? leveled : vals.every((v) => v === vals[0])
  useOnce(solved, onDone)

  const maxH = Math.max(...s.data.map((d) => d.value), miss ? miss.mean + 6 : 0, 9)
  const H = Math.round(clamp(w * 0.55, 240, 330))
  const pad = { t: 14, b: 40 }
  const slot = w / n
  const cube = Math.min(34, (H - pad.t - pad.b) / maxH, slot * 0.62)
  const base = H - pad.b
  const colX = (i: number) => slot * (i + 0.5)

  const move = (from: number, to: number) => {
    if (from === to || vals[from] <= 0) return
    setVals((v) => v.map((x, k) => (k === from ? x - 1 : k === to ? x + 1 : x)))
    setMoves((m) => m + 1)
  }
  const colAt = (cx: number) => clamp(Math.floor(toLocal(svgRef.current, w, cx, 0).x / slot), 0, n - 1)

  const bind = useDrag(({ first, last, xy: [cx, cy], tap, event, args: [i] }) => {
    if (miss) return
    event.stopPropagation()
    if (tap) {
      if (sel === null) setSel(vals[i] > 0 ? i : null)
      else {
        move(sel, i)
        setSel(null)
      }
      return
    }
    const p = toLocal(svgRef.current, w, cx, cy)
    if (first && vals[i] > 0) setDrag({ from: i, ...p })
    else if (drag) setDrag({ ...drag, ...p })
    if (last && drag) {
      move(drag.from, colAt(cx))
      setDrag(null)
      setSel(null)
    }
  }, { filterTaps: true })

  const tryLevel = () => {
    if (!miss) return
    const m = total / n
    if (total === miss.mean * n) {
      setVals(vals.map(() => miss.mean))
      setLeveled(true)
    } else {
      onMiss?.(`Dengeleyince her kulede ${fmt(m)} oluyor, 6 değil. Kulelerin 6’da eşitlenmesi için toplam kaç küp olmalı?`, vals[miss.index] === miss.mean ? 'Eksik değeri ortalamaya eşit sandı' : undefined)
    }
  }

  const meanLine = miss ? base - miss.mean * cube : null
  return (
    <Frame
      ink={ink}
      readout={
        <>
          <Chip ink={ink}>Toplam: {total} {s.unit} · {n} kule</Chip>
          {!miss && <Chip ink={ink}>Taşıma: {moves}</Chip>}
          {solved && <Chip ink={ink} tone="ok"><Check size={16} />Her kulede {vals[0]}: ortalama {vals[0]}</Chip>}
        </>
      }
      tools={miss && !solved && (
        <>
          <ToolBtn ink={ink} onClick={() => setVals((v) => v.map((x, k) => (k === miss.index ? Math.max(0, x - 1) : x)))} label="Bir küp çıkar"><Minus size={18} /></ToolBtn>
          <Chip ink={ink}>{s.data[miss.index].label}: {vals[miss.index]}</Chip>
          <ToolBtn ink={ink} onClick={() => setVals((v) => v.map((x, k) => (k === miss.index ? Math.min(maxH, x + 1) : x)))} label="Bir küp ekle"><Plus size={18} /></ToolBtn>
          <ToolBtn ink={ink} onClick={tryLevel} active>Dengele</ToolBtn>
        </>
      )}
    >
      <div ref={ref} className="select-none" style={{ touchAction: 'none' }}>
        <svg ref={svgRef} viewBox={`0 0 ${w} ${H}`} width="100%" height={H} role="img" aria-label={`Kuleler: ${s.data.map((d, i) => `${d.label} ${vals[i]}`).join(', ')}`}>
          <line x1={8} x2={w - 8} y1={base} y2={base} stroke={ink.axis} strokeWidth={1.5} />
          {meanLine !== null && (
            <g>
              <line x1={8} x2={w - 8} y1={meanLine} y2={meanLine} stroke={MEAN} strokeWidth={2} strokeDasharray="7 5" />
              <text x={w - 10} y={meanLine - 6} textAnchor="end" fontSize={12} fontWeight={900} fill={MEAN}>ortalama {miss!.mean}</text>
            </g>
          )}
          {vals.map((v, i) => {
            const unknown = miss && i === miss.index && !leveled
            return (
              <g key={i} {...bind(i)} data-handle style={{ cursor: miss ? 'default' : 'grab', touchAction: 'none' }} role={miss ? undefined : 'button'} aria-label={`${s.data[i].label}: ${v} küp`}>
                <rect x={colX(i) - slot / 2 + 3} y={pad.t} width={slot - 6} height={base - pad.t + 36} rx={12} fill={sel === i ? (ink.dark ? '#0d948833' : '#ccfbf1') : 'transparent'} />
                {Array.from({ length: v }, (_, k) => {
                  const lift = drag?.from === i && k === v - 1
                  return (
                    <rect key={k} x={colX(i) - cube / 2 + 1} y={base - (k + 1) * cube + 1} width={cube - 2} height={cube - 2} rx={5} fill={unknown ? '#d97706' : SERIES[0]} opacity={lift ? 0.25 : 1} stroke={ink.surface} strokeWidth={1.5} style={{ transition: 'y 200ms' }} />
                  )
                })}
                <text x={colX(i)} y={base - v * cube - 8} textAnchor="middle" fontSize={14} fontWeight={900} fill={ink.text}>{unknown ? '?' : v}</text>
                <text x={colX(i)} y={base + 22} textAnchor="middle" fontSize={13} fontWeight={800} fill={ink.text}>{s.data[i].label}</text>
              </g>
            )
          })}
          {drag && <rect x={drag.x - cube / 2} y={drag.y - cube / 2} width={cube - 2} height={cube - 2} rx={5} fill={SERIES[0]} stroke="#fff" strokeWidth={2} pointerEvents="none" />}
        </svg>
      </div>
    </Frame>
  )
}

/* ═════════════════════════ 7. Nokta grafikleri: açıklık, karşılaştırma ve denge (tahterevalli) ═════════════════════════ */
function useDotGeom(w: number, min: number, max: number) {
  const padL = 64, padR = 18
  const X = (v: number) => padL + ((v - min) / (max - min)) * (w - padL - padR)
  const r = clamp(((w - padL - padR) / (max - min)) * 0.38, 5, 9)
  return { X, r, padL, padR }
}

/** Değerleri yığılmış nokta konumlarına çevirir: [{v, k(yığındaki sıra), i(özgün sıra)}] */
function stack(values: number[]) {
  const seen = new Map<number, number>()
  return values.map((v, i) => {
    const k = seen.get(v) ?? 0
    seen.set(v, k + 1)
    return { v, k, i }
  })
}

function NumberAxis({ X, y, min, max, step, ink, w, padR }: { X: (v: number) => number; y: number; min: number; max: number; step: number; ink: Ink; w: number; padR: number }) {
  return (
    <g>
      <line x1={X(min) - 6} x2={w - padR + 6} y1={y} y2={y} stroke={ink.axis} strokeWidth={1.5} />
      {ticks(min, max, step).map((t) => (
        <g key={t}>
          <line x1={X(t)} x2={X(t)} y1={y - 4} y2={y + 4} stroke={ink.axis} strokeWidth={1.2} />
          <text x={X(t)} y={y + 18} textAnchor="middle" fontSize={12} fontWeight={800} fill={ink.soft}>{fmt(t)}</text>
        </g>
      ))}
    </g>
  )
}

export function RangeDots({ s, ink, onDone }: P<'range'>) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const { X, r, padR } = useDotGeom(w, s.min, s.max)
  const [tapped, setTapped] = useState<number[][]>(() => s.rows.map(() => []))
  const [note, setNote] = useState<string | null>(null)
  const rowOk = s.rows.map((row, ri) => {
    const vs = tapped[ri].map((i) => row.values[i])
    return vs.includes(Math.min(...row.values)) && vs.includes(Math.max(...row.values))
  })
  const solved = rowOk.every(Boolean)
  useOnce(solved, onDone)
  const maxStack = Math.max(...s.rows.map((row) => Math.max(...stack(row.values).map((d) => d.k)))) + 1
  const rowH = maxStack * (2 * r + 3) + 64
  const H = rowH * s.rows.length + 4
  const tap = (ri: number, i: number) => {
    const row = s.rows[ri]
    const v = row.values[i]
    if (v !== Math.min(...row.values) && v !== Math.max(...row.values)) {
      setNote(`${fmt(v)}, ${row.label} için en küçük ya da en büyük değer mi? Satırın iki ucuna bak.`)
      return
    }
    setNote(null)
    setTapped((cur) => cur.map((t, k) => (k === ri && !t.includes(i) ? [...t, i] : t)))
  }
  return (
    <Frame ink={ink} readout={<>
      {s.rows.map((row, ri) => rowOk[ri] && <Chip key={row.label} ink={ink} tone="ok">{row.label}: açıklık {Math.max(...row.values)} − {Math.min(...row.values)} = {Math.max(...row.values) - Math.min(...row.values)}</Chip>)}
      {note && <Chip ink={ink} tone="warn">{note}</Chip>}
    </>}>
      <div ref={ref}>
        <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H} role="img" aria-label="Nokta grafikleri">
          {s.rows.map((row, ri) => {
            const top = ri * rowH
            const base = top + rowH - 30
            const mn = Math.min(...row.values), mx = Math.max(...row.values)
            return (
              <g key={row.label}>
                <text x={6} y={base - 8} fontSize={14} fontWeight={900} fill={SERIES[ri]}>{row.label}</text>
                <NumberAxis X={X} y={base} min={s.min} max={s.max} step={s.max - s.min > 12 ? 2 : 1} ink={ink} w={w} padR={padR} />
                {rowOk[ri] && (
                  <g className="animate-fade-up">
                    <path d={`M${X(mn)} ${top + 18}v-6H${X(mx)}v6`} fill="none" stroke={SERIES[ri]} strokeWidth={2} />
                    <text x={(X(mn) + X(mx)) / 2} y={top + 8} textAnchor="middle" fontSize={12} fontWeight={900} fill={ink.text}>açıklık {mx - mn}</text>
                  </g>
                )}
                {stack(row.values).map((d) => {
                  const on = tapped[ri].includes(d.i)
                  const cy = base - r - 3 - d.k * (2 * r + 3)
                  return (
                    <g key={d.i} onClick={() => tap(ri, d.i)} style={{ cursor: 'pointer' }} role="button" aria-label={`${row.label}: ${fmt(d.v)}`}>
                      <circle cx={X(d.v)} cy={cy} r={r + 14} fill="transparent" />
                      <circle cx={X(d.v)} cy={cy} r={r} fill={SERIES[ri]} stroke={on ? ink.text : ink.surface} strokeWidth={on ? 3 : 2} />
                    </g>
                  )
                })}
              </g>
            )
          })}
        </svg>
      </div>
    </Frame>
  )
}

export function CompareDots({ s, ink, onDone, onClue }: P<'compare'>) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const { X, r, padR } = useDotGeom(w, s.min, s.max)
  const [tools, setTools] = useState<string[]>([])
  const solved = tools.length >= 2
  useOnce(solved, onDone)
  const maxStack = Math.max(...s.rows.map((row) => Math.max(...stack(row.values).map((d) => d.k)))) + 1
  const rowH = maxStack * (2 * r + 3) + 76
  const H = rowH * s.rows.length + 4
  const toggle = (t: string) => {
    if (!tools.includes(t)) {
      setTools((c) => [...c, t])
      const txt = t === 'mean'
        ? `Ortalama: ${s.rows.map((row) => `${row.label} ${fmt(meanOf(row.values))}`).join(', ')}.`
        : t === 'median'
          ? `Ortanca: ${s.rows.map((row) => `${row.label} ${fmt(medianOf(row.values))}`).join(', ')}.`
          : `Açıklık: ${s.rows.map((row) => `${row.label} ${Math.max(...row.values) - Math.min(...row.values)}`).join(', ')}.`
      onClue?.(txt)
    } else setTools((c) => c.filter((x) => x !== t))
  }
  return (
    <Frame
      ink={ink}
      tools={
        <>
          <ToolBtn ink={ink} active={tools.includes('mean')} onClick={() => toggle('mean')}><span className="size-3 rounded-full" style={{ background: MEAN }} />Ortalama</ToolBtn>
          <ToolBtn ink={ink} active={tools.includes('median')} onClick={() => toggle('median')}><span className="size-3 rotate-45" style={{ background: MEDIAN }} />Ortanca</ToolBtn>
          <ToolBtn ink={ink} active={tools.includes('range')} onClick={() => toggle('range')}>↔ Açıklık</ToolBtn>
        </>
      }
    >
      <div ref={ref}>
        <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H} role="img" aria-label="İki veri grubunun nokta grafikleri">
          {s.rows.map((row, ri) => {
            const top = ri * rowH
            const base = top + rowH - 30
            const mn = Math.min(...row.values), mx = Math.max(...row.values)
            const m = meanOf(row.values), md = medianOf(row.values)
            return (
              <g key={row.label}>
                <text x={6} y={base - 8} fontSize={14} fontWeight={900} fill={SERIES[ri]}>{row.label}</text>
                <NumberAxis X={X} y={base} min={s.min} max={s.max} step={2} ink={ink} w={w} padR={padR} />
                {stack(row.values).map((d) => <circle key={d.i} cx={X(d.v)} cy={base - r - 3 - d.k * (2 * r + 3)} r={r} fill={SERIES[ri]} stroke={ink.surface} strokeWidth={2} />)}
                {tools.includes('range') && (
                  <g className="animate-fade-up">
                    <path d={`M${X(mn)} ${top + 26}v-6H${X(mx)}v6`} fill="none" stroke={ink.text} strokeWidth={1.8} />
                    <text x={(X(mn) + X(mx)) / 2} y={top + 14} textAnchor="middle" fontSize={12} fontWeight={900} fill={ink.text}>açıklık {mx - mn}</text>
                  </g>
                )}
                {tools.includes('mean') && (
                  <g className="animate-fade-up">
                    <line x1={X(m)} x2={X(m)} y1={top + 30} y2={base} stroke={MEAN} strokeWidth={2} strokeDasharray="4 3" />
                    <path d={`M${X(m) - 7} ${base + 30}l7 -9l7 9z`} fill={MEAN} />
                    <text x={X(m) + 10} y={base + 30} fontSize={11} fontWeight={900} fill={MEAN}>ort. {fmt(m)}</text>
                  </g>
                )}
                {tools.includes('median') && (
                  <g className="animate-fade-up">
                    <rect x={X(md) - 5} y={base - 5} width={10} height={10} transform={`rotate(45 ${X(md)} ${base})`} fill={MEDIAN} stroke={ink.surface} strokeWidth={1.5} />
                    <text x={X(md) - 10} y={base + 30} textAnchor="end" fontSize={11} fontWeight={900} fill={MEDIAN}>ortanca {fmt(md)}</text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </Frame>
  )
}

export function BalanceDots({ s, ink, onDone }: P<'balance'>) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const svgRef = useRef<SVGSVGElement>(null)
  const { X, r, padL, padR } = useDotGeom(w, s.min, s.max)
  const [f, setF] = useState(s.min + (s.max - s.min) * 0.72)
  const snapF = (v: number) => clamp(Math.round(v * 2) / 2, s.min, s.max)
  const torque = sum(s.values.map((v) => v - f))
  const solved = Math.abs(torque) < 1e-9
  useOnce(solved, onDone)
  const H = 210
  const base = 120
  const ang = clamp(-torque * 1.1, -14, 14) * -1
  const fromX = (cx: number) => s.min + ((toLocal(svgRef.current, w, cx, 0).x - padL) / (w - padL - padR)) * (s.max - s.min)
  const bind = useDrag(({ xy: [cx], event }) => {
    event.stopPropagation()
    setF(snapF(fromX(cx)))
  })
  const tilt = solved ? 'Denge! Destek ortalamanın üstünde.' : torque > 0 ? 'Tahterevalli sağa yatıyor' : 'Tahterevalli sola yatıyor'
  return (
    <Frame ink={ink} readout={<Chip ink={ink} tone={solved ? 'ok' : 'warn'}>{solved ? <Check size={16} /> : null}{tilt}{solved ? ` (${fmt(f)})` : ''}</Chip>}
      tools={<>
        <ToolBtn ink={ink} onClick={() => setF(snapF(f - 0.5))} label="Desteği sola kaydır"><Minus size={18} /></ToolBtn>
        <Chip ink={ink}>Destek: {fmt(f)}</Chip>
        <ToolBtn ink={ink} onClick={() => setF(snapF(f + 0.5))} label="Desteği sağa kaydır"><Plus size={18} /></ToolBtn>
      </>}>
      <div ref={ref} className="select-none" style={{ touchAction: 'none' }}>
        <svg ref={svgRef} viewBox={`0 0 ${w} ${H}`} width="100%" height={H} role="img" aria-label={`Nokta grafiği tahterevallisi, destek ${fmt(f)}`}>
          <g style={{ transform: `rotate(${ang}deg)`, transformOrigin: `${X(f)}px ${base}px`, transition: 'transform 350ms cubic-bezier(.34,1.56,.64,1)' }}>
            <rect x={X(s.min) - 10} y={base - 3} width={X(s.max) - X(s.min) + 20} height={6} rx={3} fill={ink.dark ? '#94a3b8' : '#64748b'} />
            {stack(s.values).map((d) => <circle key={d.i} cx={X(d.v)} cy={base - r - 5 - d.k * (2 * r + 3)} r={r} fill={SERIES[0]} stroke={ink.surface} strokeWidth={2} />)}
            {ticks(s.min, s.max, 1).map((t) => <text key={t} x={X(t)} y={base + 20} textAnchor="middle" fontSize={12} fontWeight={800} fill={ink.soft}>{t}</text>)}
          </g>
          <g {...bind()} data-handle style={{ cursor: 'ew-resize', touchAction: 'none' }} role="slider" aria-label="Destek noktası" aria-valuenow={f}>
            <rect x={X(f) - 30} y={base + 4} width={60} height={70} fill="transparent" />
            <path d={`M${X(f)} ${base + 4}l-20 34h40z`} fill={solved ? '#16a34a' : MEAN} stroke={ink.surface} strokeWidth={2} />
            <text x={X(f)} y={base + 56} textAnchor="middle" fontSize={13} fontWeight={900} fill={ink.text}>{fmt(f)}</text>
          </g>
          <line x1={padL - 20} x2={w - padR + 10} y1={base + 40} y2={base + 40} stroke={ink.grid} strokeWidth={3} strokeLinecap="round" />
        </svg>
      </div>
    </Frame>
  )
}

/* ═════════════════════════ 8. Aykırı değer ve ortanca: anlamsal yakınlaştırmalı sayı doğrusu (Plane) ═════════════════════════ */
export function Spread({ s, ink, onDone, onMiss }: P<'spread'>) {
  const [vals, setVals] = useState(s.values)
  const [marker, setMarker] = useState<number | null>(null)
  const [crossed, setCrossed] = useState<number[]>([])
  const [ok, setOk] = useState(false)
  const outIdx = s.values.indexOf(Math.max(...s.values))
  const movedIn = s.mode === 'outlier' && vals[outIdx] < (s.threshold ?? 0)
  useOnce(s.mode === 'outlier' ? movedIn : ok, onDone)
  const m = meanOf(vals), md = medianOf(vals)
  const check = () => {
    if (marker === null) return onMiss?.('Önce yeşil işareti bir yere koy: sayı doğrusuna dokun ya da işareti sürükle.')
    if (Math.abs(marker - md) < 1e-9) return setOk(true)
    if (Math.abs(marker - m) < 0.6) return onMiss?.('Bu nokta ortalamaya yakın. Ortanca için değerleri sırala: tam ortadaki değer hangisi?', 'Ortanca yerine ortalamayı buldu')
    onMiss?.('Noktaları iki uçtan birer birer ele (dokun). Ortada hangi nokta kalıyor?')
  }
  return (
    <div>
      <div className="rounded-2xl p-1.5" style={{ background: ink.dark ? '#ffffff10' : 'transparent' }}>
        <Plane initial={{ xMin: s.view[0], xMax: s.view[1], yMin: -1, yMax: 1 }} mode="x" minSpan={4} maxSpan={(s.view[1] - s.view[0]) * 1.6} label={`Nokta grafiği (${s.unit})`} onTap={s.mode === 'median' ? (p) => setMarker(Math.round(p.x * 2) / 2) : undefined}>
          <SpreadLayer vals={vals} mode={s.mode} outIdx={outIdx} onOutlier={(v) => setVals((c) => c.map((x, i) => (i === outIdx ? v : x)))} marker={marker} setMarker={setMarker} crossed={crossed} toggleCross={(i) => setCrossed((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]))} mean={m} median={md} ok={ok} />
        </Plane>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {s.mode === 'outlier' ? (
          <>
            <Chip ink={ink} tone="mean"><span className="size-3 rounded-full" style={{ background: MEAN }} />Ortalama: {fmt(m, 1)} {s.unit}</Chip>
            <Chip ink={ink} tone="median"><span className="size-3 rotate-45" style={{ background: MEDIAN }} />Ortanca: {fmt(md, 1)} {s.unit}</Chip>
            <ToolBtn ink={ink} onClick={() => setVals(s.values)} label="Başa dön"><RotateCcw size={16} />Başa dön</ToolBtn>
          </>
        ) : (
          <>
            <Chip ink={ink} tone="median">Ortanca işareti: {marker === null ? '—' : `${fmt(marker)} ${s.unit}`}</Chip>
            {crossed.length > 0 && <ToolBtn ink={ink} onClick={() => setCrossed([])}><RotateCcw size={16} />Elemeleri sil</ToolBtn>}
            {!ok ? <button type="button" onClick={check} className="btn-primary">Kontrol et</button> : <Chip ink={ink} tone="ok"><Check size={16} />Ortanca {fmt(md)} {s.unit}</Chip>}
          </>
        )}
      </div>
    </div>
  )
}

function SpreadLayer({ vals, mode, outIdx, onOutlier, marker, setMarker, crossed, toggleCross, mean, median, ok }: { vals: number[]; mode: 'outlier' | 'median'; outIdx: number; onOutlier: (v: number) => void; marker: number | null; setMarker: (v: number) => void; crossed: number[]; toggleCross: (i: number) => void; mean: number; median: number; ok: boolean }) {
  const P = usePlane()
  const y0 = P.sy(0)
  const r = 7
  const bindOut = useDrag(({ xy: [cx, cy], event }) => {
    event.stopPropagation()
    const v = Math.round(P.fromClient(cx, cy).x)
    onOutlier(clamp(v, 0, 1e6))
  })
  const bindMarker = useDrag(({ xy: [cx, cy], event }) => {
    event.stopPropagation()
    setMarker(Math.round(P.fromClient(cx, cy).x * 2) / 2)
  })
  const st = stack(vals)
  return (
    <g>
      {mode === 'outlier' && (
        <g>
          <line x1={P.sx(mean)} x2={P.sx(mean)} y1={18} y2={y0} stroke={MEAN} strokeWidth={2} strokeDasharray="4 3" style={{ transition: 'all 120ms' }} />
          <text x={P.sx(mean)} y={13} textAnchor="middle" fontSize={11} fontWeight={900} fill={MEAN}>ortalama</text>
          <rect x={P.sx(median) - 6} y={y0 - 6} width={12} height={12} transform={`rotate(45 ${P.sx(median)} ${y0})`} fill={MEDIAN} stroke="#fff" strokeWidth={2} />
          <text x={P.sx(median)} y={y0 + 46} textAnchor="middle" fontSize={11} fontWeight={900} fill={MEDIAN}>ortanca</text>
        </g>
      )}
      {st.map((d) => {
        const cx = P.sx(d.v), cy = y0 - r - 4 - d.k * (2 * r + 2)
        if (mode === 'outlier' && d.i === outIdx)
          return (
            <g key={d.i} {...bindOut()} data-handle style={{ cursor: 'ew-resize', touchAction: 'none' }} role="slider" aria-label="Aykırı değer" aria-valuenow={d.v}>
              <circle cx={cx} cy={cy} r={22} fill="transparent" />
              <circle cx={cx} cy={cy} r={r + 3} fill="#d97706" stroke="#fff" strokeWidth={2.5} className="vd-pulse" />
              <text x={cx} y={cy - 16} textAnchor="middle" fontSize={11} fontWeight={900} fill="#b45309">{fmt(d.v)}</text>
            </g>
          )
        const x = crossed.includes(d.i)
        return (
          <g key={d.i} data-handle onClick={mode === 'median' ? () => toggleCross(d.i) : undefined} style={{ cursor: mode === 'median' ? 'pointer' : 'default' }} role={mode === 'median' ? 'button' : undefined} aria-label={`${fmt(d.v)}${x ? ', elendi' : ''}`}>
            <circle cx={cx} cy={cy} r={r + 7} fill="transparent" />
            <circle cx={cx} cy={cy} r={r} fill={SERIES[0]} opacity={x ? 0.25 : 1} stroke="#fff" strokeWidth={1.5} />
            {x && <path d={`M${cx - 6} ${cy - 6}l12 12M${cx + 6} ${cy - 6}l-12 12`} stroke="#be123c" strokeWidth={2.2} strokeLinecap="round" />}
          </g>
        )
      })}
      {mode === 'median' && marker !== null && (
        <g {...bindMarker()} data-handle style={{ cursor: 'ew-resize', touchAction: 'none' }} role="slider" aria-label="Ortanca işareti" aria-valuenow={marker}>
          <rect x={P.sx(marker) - 22} y={y0 + 2} width={44} height={44} fill="transparent" />
          <path d={`M${P.sx(marker)} ${y0 + 4}l-11 18h22z`} fill={ok ? '#16a34a' : MEDIAN} stroke="#fff" strokeWidth={2} />
          <line x1={P.sx(marker)} x2={P.sx(marker)} y1={8} y2={y0} stroke={MEDIAN} strokeWidth={1.5} strokeDasharray="3 3" />
        </g>
      )}
      {mode === 'median' && ok && <text x={P.sx(median)} y={12} textAnchor="middle" fontSize={11} fontWeight={900} fill="#16a34a">ortanca</text>}
    </g>
  )
}

/* ═════════════════════════ 9. Seçilmiş zaman aralığı: pencereyi genişlet ═════════════════════════ */
export function WindowChart({ s, ink, onDone }: P<'window'>) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const svgRef = useRef<SVGSVGElement>(null)
  const n = s.data.length
  const [win, setWin] = useState<[number, number]>(s.start)
  const solved = win[0] === 0 && win[1] === n - 1
  useOnce(solved, onDone)
  const H = Math.round(clamp(w * 0.55, 240, 320))
  const pad = { l: 46, r: 16, t: 26, b: 40 }
  const pw = w - pad.l - pad.r, ph = H - pad.t - pad.b
  const maxV = Math.max(...s.data.map((d) => d.value))
  const top = Math.ceil((maxV * 1.1) / 20) * 20
  const X = (i: number) => pad.l + (pw * i) / (n - 1)
  const Y = (v: number) => pad.t + ph * (1 - v / top)
  const idxAt = (cx: number) => clamp(Math.round(((toLocal(svgRef.current, w, cx, 0).x - pad.l) / pw) * (n - 1)), 0, n - 1)
  const setEdge = (edge: 0 | 1, i: number) => setWin(([a, b]) => (edge === 0 ? [Math.min(i, b - 1), b] : [a, Math.max(i, a + 1)]))
  useGesture(
    {
      onPinch: ({ movement: [f], first, memo, event }) => {
        event.preventDefault()
        const m = first || !memo ? win : (memo as [number, number])
        const c = (m[0] + m[1]) / 2, half = ((m[1] - m[0]) / 2) * f
        setWin([clamp(Math.round(c - half), 0, n - 2), clamp(Math.round(c + half), 1, n - 1)])
        return m
      },
    },
    { target: ref, eventOptions: { passive: false } },
  )
  const a = s.data[win[0]].value, b = s.data[win[1]].value
  const ch = ((b - a) / a) * 100
  return (
    <Frame
      ink={ink}
      title={s.title}
      readout={<Chip ink={ink} tone={solved ? 'ok' : 'warn'}>Pencere: {s.data[win[0]].label}–{s.data[win[1]].label} · {fmt(a)} → {fmt(b)} ({ch >= 0 ? '+' : '−'}%{fmt(Math.abs(ch), 1)})</Chip>}
      tools={<>
        <ToolBtn ink={ink} onClick={() => setEdge(0, win[0] - 1)} disabled={win[0] === 0} label="Pencereyi sola genişlet"><ChevronsDown size={18} className="rotate-90" />Sola</ToolBtn>
        <ToolBtn ink={ink} onClick={() => setEdge(1, win[1] + 1)} disabled={win[1] === n - 1} label="Pencereyi sağa genişlet">Sağa<ChevronsDown size={18} className="-rotate-90" /></ToolBtn>
      </>}
    >
      <div ref={ref} className="select-none" style={{ touchAction: 'none' }}>
        <svg ref={svgRef} viewBox={`0 0 ${w} ${H}`} width="100%" height={H} role="img" aria-label={`${s.title}: ${s.data.map((d) => `${d.label} ${d.value}`).join(', ')}`}>
          {ticks(0, top, niceStep(top, ph, 34)).map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={Y(t)} y2={Y(t)} stroke={ink.grid} />
              <text x={pad.l - 8} y={Y(t) + 4} textAnchor="end" fontSize={12} fontWeight={800} fill={ink.soft}>{t}</text>
            </g>
          ))}
          <polyline points={s.data.map((d, i) => `${X(i)},${Y(d.value)}`).join(' ')} fill="none" stroke={SERIES[0]} strokeWidth={2.5} strokeLinejoin="round" />
          {s.data.map((d, i) => <circle key={i} cx={X(i)} cy={Y(d.value)} r={4.5} fill={SERIES[0]} stroke={ink.surface} strokeWidth={2} />)}
          {/* pencere dışını karart */}
          <rect x={pad.l - 6} y={pad.t - 10} width={Math.max(0, X(win[0]) - pad.l + 6)} height={ph + 10} fill={ink.surface} opacity={0.82} />
          <rect x={X(win[1])} y={pad.t - 10} width={Math.max(0, w - pad.r - X(win[1]) + 6)} height={ph + 10} fill={ink.surface} opacity={0.82} />
          <rect x={X(win[0])} y={pad.t - 10} width={X(win[1]) - X(win[0])} height={ph + 10} fill="none" stroke={solved ? '#16a34a' : '#db2777'} strokeWidth={2.5} rx={6} />
          {s.data.map((d, i) => (i % (w < 480 ? 2 : 1) === 0 || i === n - 1) && <text key={d.label} x={X(i)} y={pad.t + ph + 22} textAnchor="middle" fontSize={12} fontWeight={800} fill={i >= win[0] && i <= win[1] ? ink.text : ink.soft}>{d.label}</text>)}
          <line x1={pad.l} x2={w - pad.r} y1={Y(0)} y2={Y(0)} stroke={ink.axis} strokeWidth={1.5} />
          <EdgeHandle x={X(win[0])} top={pad.t - 10} h={ph + 10} color={solved ? '#16a34a' : '#db2777'} onX={(cx) => setEdge(0, idxAt(cx))} label="Pencerenin sol kenarı" />
          <EdgeHandle x={X(win[1])} top={pad.t - 10} h={ph + 10} color={solved ? '#16a34a' : '#db2777'} onX={(cx) => setEdge(1, idxAt(cx))} label="Pencerenin sağ kenarı" />
        </svg>
      </div>
    </Frame>
  )
}

function EdgeHandle({ x, top, h, color, onX, label }: { x: number; top: number; h: number; color: string; onX: (cx: number) => void; label: string }) {
  const bind = useDrag(({ xy: [cx], event }) => {
    event.stopPropagation()
    onX(cx)
  })
  return (
    <g {...bind()} data-handle style={{ cursor: 'ew-resize', touchAction: 'none' }} role="slider" aria-label={label}>
      <rect x={x - 22} y={top} width={44} height={h} fill="transparent" />
      <rect x={x - 9} y={top + h / 2 - 22} width={18} height={44} rx={9} fill={color} stroke="#fff" strokeWidth={2} />
      <path d={`M${x - 3} ${top + h / 2 - 8}v16M${x + 3} ${top + h / 2 - 8}v16`} stroke="#fff" strokeWidth={2} strokeLinecap="round" />
    </g>
  )
}

/* ═════════════════════════ 10. Yüzde çubukları: sayıları oranlara çevir ═════════════════════════ */
export function PercentBars({ s, ink, onDone, onMiss }: P<'percent'>) {
  const [vals, setVals] = useState(() => s.groups.map(() => 0))
  const [ok, setOk] = useState(false)
  useOnce(ok, onDone)
  const target = s.groups.map((g) => (g.part / g.whole) * 100)
  const set = (i: number, v: number) => setVals((c) => c.map((x, k) => (k === i ? clamp(Math.round(v / s.snap) * s.snap, 0, 100) : x)))
  const check = () => {
    const bad = vals.findIndex((v, i) => Math.abs(v - target[i]) > 1e-9)
    if (bad < 0) return setOk(true)
    const g = s.groups[bad]
    if (Math.abs(vals[bad] - Math.min(100, g.part)) < 1e-9 && g.part !== target[bad]) return onMiss?.(`${g.label}: ${g.part} kişi, yüzde ${g.part} değil. ${g.whole} kişinin yüzde 10’u kaç kişi eder?`, 'Sayıyı yüzde sandı')
    onMiss?.(`${g.label} için yeniden düşün: ${g.whole} öğrencinin %10’u kaç öğrenci? ${g.part} öğrenci bunun kaç katı?`)
  }
  return (
    <Frame ink={ink} tools={!ok ? <button type="button" onClick={check} className="btn-primary">Kontrol et</button> : <Chip ink={ink} tone="ok"><Check size={16} />Oranlar doğru</Chip>}>
      <div className="grid gap-4">
        {s.groups.map((g, i) => (
          <div key={g.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2 font-extrabold" style={{ color: ink.text }}>
              <span className="text-base font-black" style={{ color: SERIES[i] }}>{g.label}</span>
              <span className="text-sm">{g.whole} öğrenciden {g.part}’{pctSuffix(g.part)} katılıyor</span>
            </div>
            <div className="flex items-center gap-2">
              <ToolBtn ink={ink} onClick={() => set(i, vals[i] - s.snap)} disabled={ok} label={`${g.label} azalt`}><Minus size={18} /></ToolBtn>
              <PercentTrack value={vals[i]} color={SERIES[i]} ink={ink} disabled={ok} onValue={(v) => set(i, v)} />
              <ToolBtn ink={ink} onClick={() => set(i, vals[i] + s.snap)} disabled={ok} label={`${g.label} artır`}><Plus size={18} /></ToolBtn>
              <span className="w-14 text-right text-lg font-black tabular-nums" style={{ color: ink.text }}>%{vals[i]}</span>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  )
}

function PercentTrack({ value, color, ink, onValue, disabled }: { value: number; color: string; ink: Ink; onValue: (v: number) => void; disabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const bind = useDrag(({ xy: [cx], event }) => {
    event.stopPropagation()
    if (disabled) return
    const r = ref.current!.getBoundingClientRect()
    onValue(((cx - r.left) / r.width) * 100)
  })
  return (
    <div ref={ref} {...bind()} data-handle className="relative h-12 flex-1 cursor-ew-resize overflow-hidden rounded-xl" style={{ touchAction: 'none', background: ink.dark ? '#ffffff12' : '#f1f5f9' }} role="slider" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <div className="absolute inset-y-0 left-0 rounded-r-lg transition-[width] duration-100" style={{ width: `${value}%`, background: color }} />
      {Array.from({ length: 9 }, (_, k) => <span key={k} className="absolute inset-y-0 w-px" style={{ left: `${(k + 1) * 10}%`, background: ink.dark ? '#ffffff30' : '#00000018' }} />)}
      <span className="absolute inset-y-1 w-2 -translate-x-1 rounded-full bg-white shadow ring-1 ring-black/10" style={{ left: `${value}%` }} />
    </div>
  )
}

/* ═════════════════════════ 11. Bütünün içinde: 600 kişilik ızgara ═════════════════════════ */
export function WholeGrid({ s, ink, onDone }: P<'grid'>) {
  const [seen, setSeen] = useState<number[]>([])
  const [on, setOn] = useState<number | null>(null)
  useOnce(seen.length === s.sets.length, onDone)
  const cols = 30, rows = Math.ceil(s.total / cols), cell = 12
  // dağınık ama sabit konumlar
  const spots = useMemo(() => {
    const max = Math.max(...s.sets.map((x) => x.count))
    const out: number[] = []
    let k = 37
    while (out.length < max) {
      k = (k * 7919 + 131) % s.total
      if (!out.includes(k)) out.push(k)
    }
    return out
  }, [s])
  const lit = on === null ? 0 : s.sets[on].count
  const show = (i: number) => {
    setOn(i)
    setSeen((c) => (c.includes(i) ? c : [...c, i]))
  }
  return (
    <Frame
      ink={ink}
      title={`Okuldaki ${s.total} ${s.unit}`}
      tools={s.sets.map((x, i) => <ToolBtn key={x.label} ink={ink} active={on === i} onClick={() => show(i)}>{x.label}: {x.count}</ToolBtn>)}
      readout={on !== null && <Chip ink={ink} tone="warn">{s.sets[on].count} / {s.total} · %{fmt((s.sets[on].count / s.total) * 100, 1)}</Chip>}
    >
      <svg viewBox={`0 0 ${cols * cell} ${rows * cell}`} width="100%" role="img" aria-label={`${s.total} öğrenciden ${lit} tanesi işaretli`}>
        {Array.from({ length: s.total }, (_, i) => {
          const hit = spots.indexOf(i)
          const isOn = hit >= 0 && hit < lit
          return <circle key={i} cx={(i % cols) * cell + cell / 2} cy={Math.floor(i / cols) * cell + cell / 2} r={isOn ? cell * 0.48 : cell * 0.3} fill={isOn ? '#db2777' : ink.dark ? '#475569' : '#cbd5e1'} className={isOn ? 'animate-pop' : ''} />
        })}
      </svg>
    </Frame>
  )
}

/* ═════════════════════════ 12. Histogram: aralık genişliğini değiştir ═════════════════════════ */
export function Histogram({ s, ink, onDone }: P<'hist'>) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [bw, setBw] = useState(s.widths[s.widths.length - 1])
  const [tried, setTried] = useState<number[]>([s.widths[s.widths.length - 1]])
  useOnce(tried.length >= 2, onDone)
  const lo = s.start
  const hiV = Math.max(...s.values)
  const nb = Math.ceil((hiV - lo + 1e-9) / bw)
  const counts = Array.from({ length: nb }, (_, k) => s.values.filter((v) => v >= lo + k * bw && v < lo + (k + 1) * bw).length)
  const maxC = Math.max(...counts)
  const top = Math.max(4, Math.ceil(maxC / 2) * 2 + 2)
  const H = Math.round(clamp(w * 0.56, 240, 320))
  const pad = { l: 40, r: 14, t: 18, b: 48 }
  const pw = w - pad.l - pad.r, ph = H - pad.t - pad.b
  const span = nb * bw
  const X = (v: number) => pad.l + ((v - lo) / span) * pw
  const Y = (c: number) => pad.t + ph * (1 - c / top)
  const labelEvery = Math.ceil((nb + 1) / Math.max(2, Math.floor(pw / 40)))
  return (
    <Frame
      ink={ink}
      title={`Boy uzunlukları (${s.values.length} öğrenci)`}
      tools={<>
        <span className="text-sm font-extrabold" style={{ color: ink.soft }}>Aralık genişliği:</span>
        {s.widths.map((x) => <ToolBtn key={x} ink={ink} active={bw === x} onClick={() => { setBw(x); setTried((c) => (c.includes(x) ? c : [...c, x])) }}>{x} {s.unit}</ToolBtn>)}
      </>}
    >
      <div ref={ref}>
        <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H} role="img" aria-label={`Histogram, aralık ${bw} ${s.unit}`}>
          {ticks(0, top, top > 8 ? 2 : 1).map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={Y(t)} y2={Y(t)} stroke={ink.grid} />
              <text x={pad.l - 8} y={Y(t) + 4} textAnchor="end" fontSize={12} fontWeight={800} fill={ink.soft}>{t}</text>
            </g>
          ))}
          {counts.map((c, k) => (
            <g key={`${bw}-${k}`}>
              <path d={barPath(X(lo + k * bw) + 1, Y(c), Math.max(1, X(lo + (k + 1) * bw) - X(lo + k * bw) - 2), Y(0), 3)} fill={SERIES[0]} className="animate-fade-up" />
              {c > 0 && pw / nb > 18 && <text x={(X(lo + k * bw) + X(lo + (k + 1) * bw)) / 2} y={Y(c) - 5} textAnchor="middle" fontSize={11} fontWeight={900} fill={ink.text}>{c}</text>}
            </g>
          ))}
          <line x1={pad.l} x2={w - pad.r} y1={Y(0)} y2={Y(0)} stroke={ink.axis} strokeWidth={1.5} />
          {Array.from({ length: nb + 1 }, (_, k) => k % labelEvery === 0 && <text key={k} x={X(lo + k * bw)} y={Y(0) + 18} textAnchor="middle" fontSize={11} fontWeight={800} fill={ink.soft}>{lo + k * bw}</text>)}
          <text x={w - pad.r} y={H - 6} textAnchor="end" fontSize={12} fontWeight={900} fill={ink.text}>boy ({s.unit})</text>
          <text x={pad.l} y={12} fontSize={12} fontWeight={900} fill={ink.text}>öğrenci sayısı</text>
        </svg>
      </div>
    </Frame>
  )
}

/* ═════════════════════════ Grafik türü küçük resimleri (seçim kartları için) ═════════════════════════ */
export function ThumbIcon({ g, ink }: { g: Thumb; ink: Ink }) {
  const st = { stroke: ink.axis, strokeWidth: 1.5 }
  const body: Record<Thumb, ReactNode> = {
    bar: <>{[30, 18, 40, 24].map((h, i) => <rect key={i} x={10 + i * 15} y={52 - h} width={10} height={h} rx={2} fill={SERIES[0]} />)}<line x1={6} x2={72} y1={52} y2={52} {...st} /></>,
    line: <><polyline points="8,44 22,36 36,40 50,22 66,14" fill="none" stroke={SERIES[0]} strokeWidth={2.5} strokeLinejoin="round" />{[[8, 44], [22, 36], [36, 40], [50, 22], [66, 14]].map(([x, y]) => <circle key={x} cx={x} cy={y} r={3} fill={SERIES[0]} />)}<line x1={6} x2={72} y1={52} y2={52} {...st} /></>,
    pie: <>{[[0, 0.45, 0], [0.45, 0.75, 1], [0.75, 0.9, 2], [0.9, 1, 3]].map(([a, b, c]) => { const R = 22, cx = 39, cy = 30; const p = (t: number) => [cx + R * Math.sin(t * 2 * Math.PI), cy - R * Math.cos(t * 2 * Math.PI)]; const [x1, y1] = p(a), [x2, y2] = p(b); return <path key={c} d={`M${cx} ${cy}L${x1} ${y1}A${R} ${R} 0 ${b - a > 0.5 ? 1 : 0} 1 ${x2} ${y2}Z`} fill={SERIES[c]} stroke={ink.surface} strokeWidth={1.5} /> })}</>,
    hist: <>{[10, 22, 36, 28, 14, 6].map((h, i) => <rect key={i} x={8 + i * 10.5} y={52 - h} width={10} height={h} fill={SERIES[0]} stroke={ink.surface} strokeWidth={1} />)}<line x1={6} x2={72} y1={52} y2={52} {...st} /></>,
    picto: <>{[4, 2, 5].map((n, r) => Array.from({ length: n }, (_, k) => <circle key={`${r}-${k}`} cx={14 + k * 12} cy={14 + r * 15} r={5} fill={SERIES[0]} />))}</>,
    table: <>{[0, 1, 2, 3].map((r) => <g key={r}><rect x={10} y={8 + r * 11} width={58} height={10} rx={2} fill={r === 0 ? SERIES[0] : ink.dark ? '#334155' : '#e2e8f0'} /><line x1={46} x2={46} y1={8 + r * 11} y2={18 + r * 11} stroke={ink.surface} /></g>)}</>,
    dot: <>{[[14, 1], [24, 3], [34, 4], [44, 2], [54, 1]].map(([x, n]) => Array.from({ length: n }, (_, k) => <circle key={`${x}-${k}`} cx={x} cy={46 - k * 8} r={3.5} fill={SERIES[0]} />))}<line x1={6} x2={72} y1={52} y2={52} {...st} /></>,
  }
  return <svg viewBox="0 0 78 58" width={78} height={58} aria-hidden>{body[g]}</svg>
}
