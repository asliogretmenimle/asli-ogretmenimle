import { useRef, type ReactNode } from 'react'
import { ArrowDownUp, Eraser, Scale } from 'lucide-react'
import { MathText } from '../../components/MathText'
import { gen, poss } from '../../lib/generators'
import { Stepper, ToolButton } from '../ui'
import { n, type ToolDef } from '../types'

/**
 * Yüzde Izgarası — 10×10 = 100 kare.
 *  - Parmağı kareler üzerinde gezdirerek boya (boş kareden başlarsan boyar, dolu kareden başlarsan siler).
 *  - Aynı miktar canlı olarak kesir (sadeleştirilmiş), ondalık ve yüzde olarak okunur.
 *  - "Bütünü değiştir": ızgara 200 TL ya da 40 öğrenci olur → 1 kare = 2 TL / 0,4 öğrenci.
 *  - "Karşılaştır": iki yüzde (gerekirse farklı bütünlerin yüzdeleri) yan yana.
 *
 * Görev hedefleri (target):
 *  - { percent: 35 }                     → 35 kare boyanmalı
 *  - { num: 3, den: 4 }                  → 100·3/4 kare (±0,5; ör. 1/3 için 33)
 *  - { percent: 30, whole: 200, unit: 'TL' } → ızgara 200 TL; %30 boyanmalı
 *  - { amount: 60, whole: 200, unit: 'TL' }  → 60 TL’yi gösteren kareler (30 kare) boyanmalı
 */

type Grid = { cells: boolean[]; whole: number; unit: string }
type V = { a: Grid; b: Grid; compare: boolean; wholeMode: boolean }

const empty = (): boolean[] => Array(100).fill(false)
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
const fmt = (v: number, d = 2) => (Math.abs(v) < 1e-12 ? 0 : v).toLocaleString('tr-TR', { maximumFractionDigits: d })
const count = (g: Grid) => g.cells.reduce((s, c) => s + (c ? 1 : 0), 0)
/** Sütun sütun doldurma sırası: önce 1. sütun yukarıdan aşağı, sonra 2. sütun… (onluklar görünür) */
const ORDER = Array.from({ length: 100 }, (_, i) => (i % 10) * 10 + Math.floor(i / 10))
const fillN = (k: number) => {
  const c = empty()
  for (let i = 0; i < k; i++) c[ORDER[i]] = true
  return c
}

const PRESETS: { whole: number; unit: string }[] = [
  { whole: 100, unit: '' },
  { whole: 200, unit: 'TL' },
  { whole: 40, unit: 'öğrenci' },
  { whole: 50, unit: 'kg' },
  { whole: 1000, unit: 'm' },
]
/** "200 TL’nin", "40 öğrencinin", "50 kg’ın", "80’in" */
const GEN: Record<string, string> = { TL: 'TL’nin', öğrenci: 'öğrencinin', kg: 'kg’ın', m: 'm’nin', kişi: 'kişinin', km: 'km’nin', g: 'g’ın', L: 'L’nin', soru: 'sorunun', sayfa: 'sayfanın' }
const ofWhole = (g: { whole: number; unit: string }) => (g.unit ? `${fmt(g.whole)} ${GEN[g.unit] ?? g.unit + '’ın'}` : gen(g.whole))

const COLORS = { a: { fill: '#d6457a', soft: '#fde8ef', ink: '#a92f5c' }, b: { fill: '#0ea5e9', soft: '#e0f2fe', ink: '#0369a1' } }

function GridBoard({ grid, color, onChange, locked, label }: { grid: Grid; color: { fill: string; soft: string }; onChange: (c: boolean[]) => void; locked?: boolean; label: string }) {
  const ref = useRef<SVGSVGElement>(null)
  const drag = useRef<{ id: number; mode: boolean; last: [number, number]; cells: boolean[] } | null>(null)
  const S = 30
  const cellAt = (cx: number, cy: number): [number, number] | null => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return null
    const c = Math.floor(((cx - r.left) / r.width) * 10), rw = Math.floor(((cy - r.top) / r.height) * 10)
    if (c < 0 || c > 9 || rw < 0 || rw > 9) return null
    return [c, rw]
  }
  const paintLine = (cells: boolean[], from: [number, number], to: [number, number], mode: boolean) => {
    const steps = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]), 1)
    for (let s = 0; s <= steps; s++) {
      const c = Math.round(from[0] + ((to[0] - from[0]) * s) / steps), r = Math.round(from[1] + ((to[1] - from[1]) * s) / steps)
      cells[r * 10 + c] = mode
    }
  }
  return (
    <svg
      ref={ref}
      viewBox={`-2 -2 ${S * 10 + 4} ${S * 10 + 4}`}
      className="block w-full rounded-xl bg-white"
      style={{ touchAction: 'none', cursor: locked ? 'default' : 'crosshair' }}
      role="img"
      aria-label={label}
      onPointerDown={(e) => {
        if (locked || drag.current) return
        const p = cellAt(e.clientX, e.clientY)
        if (!p) return
        e.currentTarget.setPointerCapture(e.pointerId)
        const cells = [...grid.cells]
        const mode = !cells[p[1] * 10 + p[0]]
        cells[p[1] * 10 + p[0]] = mode
        drag.current = { id: e.pointerId, mode, last: p, cells }
        onChange(cells)
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d || d.id !== e.pointerId) return
        const p = cellAt(e.clientX, e.clientY)
        if (!p || (p[0] === d.last[0] && p[1] === d.last[1])) return
        paintLine(d.cells, d.last, p, d.mode)
        d.last = p
        onChange([...d.cells])
      }}
      onPointerUp={(e) => drag.current?.id === e.pointerId && (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      {grid.cells.map((on, i) => {
        const x = (i % 10) * S, y = Math.floor(i / 10) * S
        return <rect key={i} x={x + 1.5} y={y + 1.5} width={S - 3} height={S - 3} rx={4} fill={on ? color.fill : '#fff'} style={{ transition: 'fill 120ms' }} />
      })}
      {Array.from({ length: 11 }).map((_, i) => (
        <g key={i} stroke={i === 5 ? '#c3c6da' : '#e3e5ef'} strokeWidth={i === 5 ? 1.6 : 1}>
          <line x1={i * S} x2={i * S} y1={0} y2={S * 10} />
          <line y1={i * S} y2={i * S} x1={0} x2={S * 10} />
        </g>
      ))}
      <rect x={0} y={0} width={S * 10} height={S * 10} rx={6} fill="none" stroke="#1f2340" strokeWidth={2.5} />
    </svg>
  )
}

function Tile({ title, children, color }: { title: string; children: ReactNode; color: string }) {
  return (
    <div className="flex min-w-20 flex-1 flex-col items-center rounded-2xl bg-white px-2 py-2 ring-1 ring-line">
      <span className="text-[11px] font-extrabold tracking-wide text-ink-soft uppercase">{title}</span>
      <span className="flex min-h-12 items-center text-2xl font-black tabular-nums" style={{ color }}>{children}</span>
    </div>
  )
}

function Readouts({ g, color, wholeMode, compact }: { g: Grid; color: { fill: string; ink: string; soft: string }; wholeMode: boolean; compact?: boolean }) {
  const k = count(g)
  const d = gcd(k, 100) || 100
  const per = g.whole / 100
  const amount = k * per
  const unit = g.unit ? ` ${g.unit}` : ''
  const frac = (
    <>
      <MathText text={`[[${k}/100]]`} />
      {d > 1 && k > 0 && k < 100 && <span className="ml-1.5 inline-flex items-center gap-1.5 text-lg text-ink-soft">= <MathText text={`[[${k / d}/${100 / d}]]`} /></span>}
    </>
  )
  const cols = Math.floor(k / 10), rest = k % 10
  return (
    <div className="w-full">
      {compact ? (
        <div className="divide-y divide-line rounded-2xl bg-white ring-1 ring-line">
          {([['Kesir', frac], ['Ondalık', fmt(k / 100)], ['Yüzde', `%${k}`]] as const).map(([t, v]) => (
            <div key={t} className="flex min-h-12 items-center justify-between gap-2 px-3 py-1">
              <span className="text-[11px] font-extrabold tracking-wide text-ink-soft uppercase">{t}</span>
              <span className="flex items-center whitespace-nowrap text-xl font-black tabular-nums" style={{ color: color.ink }}>{v}</span>
            </div>
          ))}
        </div>
      ) : (
      <div className="flex items-stretch gap-1.5">
        <Tile title="Kesir" color={color.ink}>{frac}</Tile>
        <span className="self-center text-xl font-black text-ink-soft">=</span>
        <Tile title="Ondalık" color={color.ink}>{fmt(k / 100)}</Tile>
        <span className="self-center text-xl font-black text-ink-soft">=</span>
        <Tile title="Yüzde" color={color.ink}>%{k}</Tile>
      </div>
      )}
      {!compact && (
        <p className="mt-1.5 text-center text-sm font-bold text-ink-soft">
          {cols} tam sütun + {rest} kare = {cols} onda bir + {rest} yüzde bir = {fmt(cols / 10)} + {fmt(rest / 100)}
        </p>
      )}
      {wholeMode && (
        <div className="mt-2 rounded-2xl px-3 py-2 text-center font-extrabold" style={{ background: color.soft, color: color.ink }}>
          <div className="text-sm">1 kare = {fmt(g.whole)}{unit} ÷ 100 = <b>{fmt(per)}{unit}</b></div>
          <div className="mt-0.5 text-base text-ink">
            {ofWhole(g)} %{k}{poss(k)} = {k} × {fmt(per)} = <b className="text-lg" style={{ color: color.ink }}>{fmt(amount)}{unit}</b>
          </div>
        </div>
      )}
    </div>
  )
}

function WholePicker({ g, onChange, disabled }: { g: Grid; onChange: (w: { whole: number; unit: string }) => void; disabled?: boolean }) {
  const step = g.whole >= 500 ? 100 : g.whole >= 100 ? 20 : 5
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap justify-center gap-1.5">
        {PRESETS.map((p) => (
          <ToolButton key={`${p.whole}${p.unit}`} active={p.whole === g.whole && p.unit === g.unit} disabled={disabled} onClick={() => onChange(p)}>
            {p.whole} {p.unit || 'kare'}
          </ToolButton>
        ))}
      </div>
      <Stepper label={`Bütün (${g.unit || 'birim'})`} value={g.whole} disabled={disabled} onDec={() => onChange({ ...g, whole: Math.max(step, g.whole - step) })} onInc={() => onChange({ ...g, whole: Math.min(10000, g.whole + step) })} />
    </div>
  )
}

function Panel({ which, value, onChange, locked, task, wholeLabel }: { which: 'a' | 'b'; value: V; onChange: (v: V) => void; locked?: boolean; task: boolean; wholeLabel?: string }) {
  const compact = value.compare && !task
  const g = value[which]
  const color = COLORS[which]
  const set = (p: Partial<Grid>) => onChange({ ...value, [which]: { ...g, ...p } })
  const k = count(g)
  const bump = (dk: number) => !locked && set({ cells: fillN(Math.max(0, Math.min(100, k + dk))) })
  return (
    <div className="flex w-full flex-col items-center gap-2">
      {wholeLabel && (
        <div className="rounded-full px-3 py-1 text-center text-sm font-black" style={{ background: color.soft, color: color.ink }}>
          Izgaranın tamamı = {wholeLabel}
        </div>
      )}
      <div className="w-full rounded-2xl p-1.5" style={{ background: color.soft }}>
        <GridBoard grid={g} color={color} locked={locked} label={`Yüzde ızgarası ${which.toUpperCase()}`} onChange={(cells) => set({ cells })} />
      </div>
      {!locked && (
        <div className="flex flex-wrap justify-center gap-1">
          <ToolButton onClick={() => bump(-10)}>−10</ToolButton>
          <ToolButton onClick={() => bump(-1)}>−1</ToolButton>
          <ToolButton onClick={() => bump(1)}>+1</ToolButton>
          <ToolButton onClick={() => bump(10)}>+10</ToolButton>
          <ToolButton onClick={() => set({ cells: fillN(k) })}><ArrowDownUp size={16} />{!compact && <span className="hidden sm:inline">Sütunlara diz</span>}</ToolButton>
          <ToolButton onClick={() => set({ cells: empty() })}><Eraser size={16} /></ToolButton>
        </div>
      )}
      {!task && <Readouts g={g} color={color} wholeMode={value.wholeMode} compact={compact} />}
    </div>
  )
}

function Compare({ value }: { value: V }) {
  const ka = count(value.a), kb = count(value.b)
  const amt = (g: Grid, k: number) => (g.whole * k) / 100
  const wm = value.wholeMode
  const A = wm ? amt(value.a, ka) : ka, B = wm ? amt(value.b, kb) : kb
  const sign = Math.abs(A - B) < 1e-9 ? '=' : A > B ? '>' : '<'
  const max = Math.max(A, B, wm ? 1 : 100)
  const label = (g: Grid, k: number) => (wm ? `${ofWhole(g)} %${k}${poss(k)}` : `Izgaranın %${k}${poss(k)}`)
  const bar = (v: number, g: Grid, k: number, c: { fill: string; soft: string; ink: string }) => (
    <div>
      <div className="flex items-baseline justify-between gap-2 px-1">
        <span className="text-sm font-extrabold" style={{ color: c.ink }}>{label(g, k)}</span>
        <span className="text-lg font-black tabular-nums" style={{ color: c.ink }}>{wm ? `${fmt(v)}${g.unit ? ' ' + g.unit : ''}` : `%${k}`}</span>
      </div>
      <div className="h-6 overflow-hidden rounded-xl" style={{ background: c.soft }}>
        <div className="h-full rounded-xl transition-all duration-300" style={{ width: `${(v / max) * 100}%`, background: c.fill }} />
      </div>
    </div>
  )
  const diffPct = ka !== kb && !wm ? ` (fark %${Math.abs(ka - kb)})` : ''
  return (
    <div className="w-full max-w-3xl rounded-2xl bg-paper p-3 ring-1 ring-line">
      <div className="space-y-1.5">
        {bar(A, value.a, ka, COLORS.a)}
        {bar(B, value.b, kb, COLORS.b)}
      </div>
      <p className="mt-2 text-center text-lg font-black">
        <span style={{ color: COLORS.a.ink }}>{wm ? fmt(A) : `%${ka}`}</span> <span className="mx-1 text-2xl">{sign}</span> <span style={{ color: COLORS.b.ink }}>{wm ? fmt(B) : `%${kb}`}</span>
        <span className="ml-2 text-sm text-ink-soft">{diffPct}</span>
      </p>
      {wm && ka !== kb && Math.sign(ka - kb) !== Math.sign(A - B) && (
        <p className="mt-1 text-center text-sm font-extrabold text-ink-soft">Dikkat: yüzdesi büyük olan, miktarı büyük olmayabilir — bütünler farklı!</p>
      )}
    </div>
  )
}

export const yuzdeizgarasi: ToolDef<V> = {
  id: 'yuzdeizgarasi',
  defaultConfig: {},
  initial: (_c, t) => {
    const whole = n(t, 'whole', 100)
    const unit = typeof t?.unit === 'string' ? (t.unit as string) : ''
    return {
      a: { cells: t ? empty() : fillN(25), whole, unit },
      b: { cells: fillN(40), whole: 100, unit: '' },
      compare: false,
      wholeMode: !!t && whole !== 100,
    }
  },
  check: (v, t) => {
    const k = count(v.a)
    if (typeof t.amount === 'number') return Math.abs(k - (n(t, 'amount') / n(t, 'whole', 100)) * 100) <= 0.5 + 1e-9
    if (typeof t.percent === 'number') return k === n(t, 'percent')
    if (typeof t.num === 'number') return Math.abs(k - (100 * n(t, 'num')) / n(t, 'den', 1)) <= 0.5 + 1e-9
    return false
  },
  Component: ({ value, onChange, target, locked }) => {
    const task = !!target
    const showData = !task || !!locked
    const wl = (g: Grid) => (value.wholeMode ? `${fmt(g.whole)} ${g.unit || 'birim'}` : undefined)
    return (
      <div className="flex flex-col items-center gap-4">
        {!task && (
          <div className="flex flex-wrap justify-center gap-2">
            <ToolButton active={value.wholeMode} onClick={() => onChange({ ...value, wholeMode: !value.wholeMode })}><Scale size={16} /> Bütünü değiştir</ToolButton>
            <ToolButton active={value.compare} onClick={() => onChange({ ...value, compare: !value.compare })}>İki yüzdeyi karşılaştır</ToolButton>
          </div>
        )}
        {!task && value.wholeMode && (
          <div className={`grid w-full gap-3 ${value.compare ? 'sm:grid-cols-2' : ''}`}>
            <div className="rounded-2xl p-2 ring-1 ring-line" style={{ background: COLORS.a.soft }}>
              {value.compare && <p className="mb-1 text-center text-xs font-black" style={{ color: COLORS.a.ink }}>A ızgarasının bütünü</p>}
              <WholePicker g={value.a} onChange={(w) => onChange({ ...value, a: { ...value.a, ...w } })} />
            </div>
            {value.compare && (
              <div className="rounded-2xl p-2 ring-1 ring-line" style={{ background: COLORS.b.soft }}>
                <p className="mb-1 text-center text-xs font-black" style={{ color: COLORS.b.ink }}>B ızgarasının bütünü</p>
                <WholePicker g={value.b} onChange={(w) => onChange({ ...value, b: { ...value.b, ...w } })} />
              </div>
            )}
          </div>
        )}
        <div className={`grid w-full gap-3 ${value.compare && !task ? 'max-w-4xl grid-cols-2' : 'max-w-md'}`}>
          <Panel which="a" value={value} onChange={onChange} locked={locked} task={!showData} wholeLabel={task ? (value.wholeMode ? wl(value.a) : undefined) : wl(value.a)} />
          {value.compare && !task && <Panel which="b" value={value} onChange={onChange} locked={locked} task={false} wholeLabel={wl(value.b)} />}
        </div>
        {value.compare && !task && <Compare value={value} />}
        {!locked && <p className="text-center text-sm font-bold text-ink-soft">Parmağını karelerin üzerinde gezdirerek boya; dolu bir kareden başlarsan silersin.</p>}
      </div>
    )
  },
}
