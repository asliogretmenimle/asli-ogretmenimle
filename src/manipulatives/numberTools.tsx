import { TenFrameSvg, BlocksSvg, Money } from '../components/Visual'
import { DragPoint, Plane, usePlane } from '../interactive/Plane'
import { fmt, fmtPlain } from '../lib/format'
import { Readout, Stepper, ToolButton } from './ui'
import { n, type ToolDef } from './types'
import { RotateCcw, Scissors } from 'lucide-react'

// ─── Onluk çerçeve ─────────────────────────────────────────────────────────
export const tenframe: ToolDef<number> = {
  id: 'tenframe',
  defaultConfig: { frames: 2 },
  initial: () => 0,
  check: (v, t) => v === n(t, 'count'),
  Component: ({ value, onChange, config, target, locked }) => {
    const size = (config.frames ?? 2) === 1 ? 10 : 20
    const set = (k: number) => !locked && onChange(Math.max(0, Math.min(size, k)))
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-full max-w-sm">
          <TenFrameSvg filled={value} size={size} onCell={(i) => set(i < value ? i : i + 1)} />
        </div>
        <Stepper label={target ? 'Sayaç ekle / çıkar' : 'Sayaç'} value={target ? '' : value} onDec={() => set(value - 1)} onInc={() => set(value + 1)} disabled={locked} color="#ef4444" />
        {!target && <Readout>{value} = {value >= 10 ? `10 + ${value - 10}` : `${value} birlik`}</Readout>}
      </div>
    )
  },
}

// ─── Onluk taban blokları ──────────────────────────────────────────────────
type B = { th: number; h: number; t: number; o: number }
const total = (b: B) => b.th * 1000 + b.h * 100 + b.t * 10 + b.o
export const base10: ToolDef<B> = {
  id: 'base10',
  defaultConfig: { maxPlace: 'hundreds' },
  initial: () => ({ th: 0, h: 0, t: 0, o: 0 }),
  check: (v, t) => total(v) === n(t, 'value'),
  Component: ({ value, onChange, config, target, locked }) => {
    const places: { k: keyof B; label: string; color: string; unit: number }[] = [
      ...(config.maxPlace === 'thousands' ? [{ k: 'th' as const, label: 'Binlik', color: '#6366f1', unit: 1000 }] : []),
      { k: 'h', label: 'Yüzlük', color: '#ea580c', unit: 100 },
      { k: 't', label: 'Onluk', color: '#16a34a', unit: 10 },
      { k: 'o', label: 'Birlik', color: '#ca8a04', unit: 1 },
    ]
    const upd = (k: keyof B, d: number) => !locked && onChange({ ...value, [k]: Math.max(0, Math.min(k === 'o' || k === 't' ? 20 : 9, value[k] + d)) })
    const breakDown = (k: keyof B) => {
      if (locked || value[k] === 0) return
      const nextK: Record<keyof B, keyof B | null> = { th: 'h', h: 't', t: 'o', o: null }
      const nk = nextK[k]
      if (nk && value[nk] <= 10) onChange({ ...value, [k]: value[k] - 1, [nk]: value[nk] + 10 })
    }
    const group = () => {
      if (locked) return
      const v = { ...value }
      if (v.o >= 10) { v.o -= 10; v.t += 1 } else if (v.t >= 10) { v.t -= 10; v.h += 1 } else if (v.h >= 10 && config.maxPlace === 'thousands') { v.h -= 10; v.th += 1 }
      onChange(v)
    }
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="min-h-28 w-full overflow-x-auto rounded-2xl bg-white p-3 ring-1 ring-line">
          {total(value) === 0 ? <p className="py-8 text-center font-bold text-ink-soft">Aşağıdan blok ekle</p> : <BlocksSvg thousands={value.th} hundreds={value.h} tens={value.t} ones={value.o} />}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {places.map((p) => (
            <div key={p.k} className="flex flex-col items-center gap-1">
              <Stepper label={p.label} value={value[p.k]} onDec={() => upd(p.k, -1)} onInc={() => upd(p.k, 1)} disabled={locked} color={p.color} />
              {p.k !== 'o' && (
                <button type="button" onClick={() => breakDown(p.k)} disabled={locked || value[p.k] === 0} className="flex items-center gap-1 text-xs font-bold text-ink-soft hover:text-brand disabled:opacity-30">
                  <Scissors size={13} /> Boz
                </button>
              )}
            </div>
          ))}
        </div>
        <ToolButton onClick={group} disabled={locked || (value.o < 10 && value.t < 10 && !(value.h >= 10 && config.maxPlace === 'thousands'))}>10’lu grupla</ToolButton>
        {!target && (
          <Readout>
            {places.filter((p) => value[p.k] > 0).map((p) => fmt(value[p.k] * p.unit)).join(' + ') || '0'} = {fmt(total(value))}
          </Readout>
        )}
      </div>
    )
  },
}

// ─── Sayı doğrusu ──────────────────────────────────────────────────────────
type NL = { points: number[] }

/** Noktalar arası sıçrama yayları */
function Jumps({ points }: { points: number[] }) {
  const P = usePlane()
  const y0 = P.sy(0)
  return (
    <g pointerEvents="none">
      {points.slice(1).map((p, i) => {
        const a = points[i]
        const mid = (P.sx(a) + P.sx(p)) / 2
        const h = Math.min(70, Math.abs(P.sx(p) - P.sx(a)) / 2 + 12)
        const d = p - a
        return (
          <g key={i}>
            <path d={`M${P.sx(a)} ${y0 - 6} Q${mid} ${y0 - 6 - h} ${P.sx(p)} ${y0 - 6}`} fill="none" stroke="#f97316" strokeWidth={3} />
            <text x={mid} y={y0 - h / 2 - 12} textAnchor="middle" fontSize={14} fontWeight={900} fill="#c2410c">{d >= 0 ? '+' : '−'}{fmtPlain(Math.abs(d))}</text>
          </g>
        )
      })}
    </g>
  )
}

export const numberline: ToolDef<NL> = {
  id: 'numberline',
  defaultConfig: { min: 0, max: 20, step: 1 },
  initial: () => ({ points: [] }),
  check: (v, t) => v.points.length > 0 && Math.abs(v.points[v.points.length - 1] - n(t, 'value')) < 1e-6,
  Component: ({ value, onChange, config, target, locked }) => {
    const min = config.min ?? 0, max = config.max ?? 20, step = config.step ?? 1
    const snapV = (x: number) => Math.round(Math.max(min, Math.min(max, Math.round((x - min) / step) * step + min)) * 1e6) / 1e6
    const tap = (x: number) => {
      if (locked) return
      const v = snapV(x)
      onChange({ points: target ? [v] : [...value.points.slice(-5), v] })
    }
    const last = value.points[value.points.length - 1]
    const pad = (max - min) * 0.04
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="w-full max-w-3xl">
          <Plane mode="x" initial={{ xMin: min - pad, xMax: max + pad, yMin: -1, yMax: 1 }} minSpan={step * 2} maxSpan={(max - min) * 4 + 10} onTap={(p) => tap(p.x)} tickPx={30} label="Sayı doğrusu">
            {!target && <Jumps points={value.points} />}
            {value.points.map((p, i) => (
              <DragPoint
                key={i}
                x={p}
                y={0}
                r={i === value.points.length - 1 ? 12 : 8}
                color={i === value.points.length - 1 ? '#d6457a' : '#f9a8c2'}
                disabled={locked || i !== value.points.length - 1}
                onChange={(q) => {
                  const pts = value.points.slice()
                  pts[i] = snapV(q.x)
                  onChange({ points: pts })
                }}
              />
            ))}
          </Plane>
        </div>
        <p className="text-sm font-bold text-ink-soft">Çizgiye dokunarak nokta koy, noktayı sürükle. {target ? '' : 'Art arda dokunursan sıçramaları görürsün.'}</p>
        <div className="flex items-center gap-2">
          {!target && last !== undefined && (
            <Readout>
              {value.points.length > 1 ? value.points.map((p, i) => (i === 0 ? fmtPlain(p) : `${p - value.points[i - 1] >= 0 ? '+' : '−'} ${fmtPlain(Math.abs(p - value.points[i - 1]))}`)).join(' ') + ` = ${fmtPlain(last)}` : fmtPlain(last)}
            </Readout>
          )}
          {!target && value.points.length > 0 && <ToolButton onClick={() => onChange({ points: [] })}><RotateCcw size={16} />Temizle</ToolButton>}
        </div>
      </div>
    )
  },
}

// ─── Paralarımız ───────────────────────────────────────────────────────────
export const money: ToolDef<number[]> = {
  id: 'money',
  defaultConfig: { coins: [1, 5, 10, 20, 50, 100, 200] },
  initial: () => [],
  check: (v, t) => Math.abs(v.reduce((a, b) => a + b, 0) - n(t, 'total')) < 0.001,
  Component: ({ value, onChange, config, target, locked }) => {
    const coins = config.coins ?? [1, 5, 10, 20, 50, 100, 200]
    const sum = Math.round(value.reduce((a, b) => a + b, 0) * 100) / 100
    return (
      <div className="flex flex-col gap-4">
        <div className="min-h-32 rounded-2xl border-[3px] border-dashed border-amber-300 bg-amber-50/60 p-3">
          <div className="mb-2 text-center text-xs font-extrabold tracking-wide text-amber-700 uppercase">Cüzdan {value.length > 0 && '(çıkarmak için dokun)'}</div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {value.map((c, i) => <Money key={i} value={c} small onClick={locked ? undefined : () => onChange(value.filter((_, j) => j !== i))} />)}
          </div>
        </div>
        <div>
          <div className="mb-2 text-center text-xs font-extrabold tracking-wide text-ink-soft uppercase">Eklemek için paraya dokun</div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {coins.map((c) => <Money key={c} value={c} small onClick={locked ? undefined : () => onChange([...value, c].sort((a, b) => b - a))} />)}
          </div>
        </div>
        {!target && <Readout>Toplam: {fmtPlain(sum, 2)} ₺</Readout>}
      </div>
    )
  },
}
