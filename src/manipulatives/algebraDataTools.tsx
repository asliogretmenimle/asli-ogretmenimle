import { useState } from 'react'
import { BalanceSvg, BarsSvg, DiceSvg, SpinnerSvg } from '../components/Visual'
import { Readout, Stepper, ToolButton } from './ui'
import { n, type ToolDef } from './types'
import { RotateCcw } from 'lucide-react'
import { MathText } from '../components/MathText'

// ─── Eşit kollu terazi ─────────────────────────────────────────────────────
type Bal = { x: number; shift: number }
export const balance: ToolDef<Bal> = {
  id: 'balance',
  defaultConfig: {},
  initial: () => ({ x: 0, shift: 0 }),
  check: (v, t) => {
    const a = n(t, 'a', 1), b = n(t, 'b'), c = n(t, 'c')
    return a * v.x + b === c
  },
  Component: ({ value, onChange, target, locked }) => {
    const [free, setFree] = useState({ a: 2, b: 3, c: 11 })
    const a = target ? n(target, 'a', 1) : free.a
    const b = (target ? n(target, 'b') : free.b) - value.shift
    const c = (target ? n(target, 'c') : free.c) - value.shift
    const left = [...Array(a).fill('x'), ...Array(Math.max(0, b)).fill('1')]
    const right = Array(Math.max(0, c)).fill('1')
    const lw = a * value.x + b, rw = c
    const tilt = Math.sign(rw - lw) * Math.min(12, Math.abs(rw - lw) * 2)
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="w-full max-w-lg">
          <BalanceSvg left={left.length > 6 ? [`${a}x`, ...(b > 0 ? [`${b}`] : [])] : left} right={right.length > 6 ? [`${c}`] : right} tilt={tilt} />
        </div>
        <div className="rounded-2xl bg-white px-4 py-2 text-2xl font-black tabular-nums ring-1 ring-line">
          {a === 1 ? '' : a}x {b > 0 ? `+ ${b}` : b < 0 ? `− ${-b}` : ''} = {c}
        </div>
        <p className="text-center text-sm font-bold" style={{ color: tilt === 0 ? '#16a34a' : '#e11d48' }}>
          {tilt === 0 ? 'Terazi dengede!' : tilt > 0 ? 'Sağ kefe ağır basıyor.' : 'Sol kefe ağır basıyor.'}
        </p>
        <div className="flex flex-wrap items-end justify-center gap-3">
          <Stepper label="Bir x kutusunun değeri" value={value.x} onDec={() => !locked && onChange({ ...value, x: value.x - 1 })} onInc={() => !locked && onChange({ ...value, x: value.x + 1 })} disabled={locked} />
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">İki kefeden de</span>
            <div className="flex gap-1.5">
              <ToolButton onClick={() => onChange({ ...value, shift: value.shift + 1 })} disabled={locked || b <= 0 || c <= 0}>1 çıkar</ToolButton>
              <ToolButton onClick={() => onChange({ ...value, shift: value.shift - 1 })} disabled={locked || value.shift <= 0}>1 ekle</ToolButton>
            </div>
          </div>
        </div>
        {!target && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-paper p-2">
            <span className="text-xs font-bold text-ink-soft">Denklem:</span>
            <Stepper label="x sayısı" value={free.a} onDec={() => setFree({ ...free, a: Math.max(1, free.a - 1) })} onInc={() => setFree({ ...free, a: Math.min(5, free.a + 1) })} />
            <Stepper label="sol sayı" value={free.b} onDec={() => setFree({ ...free, b: Math.max(0, free.b - 1) })} onInc={() => setFree({ ...free, b: Math.min(10, free.b + 1) })} />
            <Stepper label="sağ sayı" value={free.c} onDec={() => setFree({ ...free, c: Math.max(1, free.c - 1) })} onInc={() => setFree({ ...free, c: Math.min(30, free.c + 1) })} />
          </div>
        )}
      </div>
    )
  },
}

// ─── Cebir karoları ────────────────────────────────────────────────────────
type Tiles = { x2: number; x: number; c: number }
const exprText = (v: Tiles) => {
  const parts: string[] = []
  const term = (k: number, s: string) => {
    if (k === 0) return
    const abs = Math.abs(k)
    const body = s && abs === 1 ? s : `${abs}${s}`
    parts.push(parts.length === 0 ? (k < 0 ? `−${body}` : body) : k < 0 ? `− ${body}` : `+ ${body}`)
  }
  term(v.x2, 'x²'); term(v.x, 'x'); term(v.c, '')
  return parts.join(' ') || '0'
}
export const algebra: ToolDef<Tiles> = {
  id: 'algebra',
  defaultConfig: {},
  initial: () => ({ x2: 0, x: 0, c: 0 }),
  check: (v, t) => v.x2 === n(t, 'x2') && v.x === n(t, 'x') && v.c === n(t, 'c'),
  Component: ({ value, onChange, target, locked }) => {
    const upd = (k: keyof Tiles, d: number) => !locked && onChange({ ...value, [k]: Math.max(-10, Math.min(10, value[k] + d)) })
    const tile = (k: keyof Tiles, neg: boolean, i: number) => {
      const cls = neg ? 'bg-rose-400 ring-rose-700' : k === 'x2' ? 'bg-indigo-400 ring-indigo-700' : k === 'x' ? 'bg-emerald-400 ring-emerald-700' : 'bg-amber-300 ring-amber-700'
      const size = k === 'x2' ? 'size-14' : k === 'x' ? 'h-14 w-5' : 'size-5'
      return <div key={`${k}${i}`} className={`${size} ${cls} grid place-items-center rounded-md text-[10px] font-black text-white ring-2`}>{k === 'x2' ? 'x²' : k === 'x' ? 'x' : ''}</div>
    }
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex min-h-32 w-full flex-wrap content-start items-end justify-center gap-2 rounded-2xl bg-white p-4 ring-1 ring-line">
          {(['x2', 'x', 'c'] as const).flatMap((k) => Array.from({ length: Math.abs(value[k]) }, (_, i) => tile(k, value[k] < 0, i)))}
          {value.x2 === 0 && value.x === 0 && value.c === 0 && <p className="self-center py-6 font-bold text-ink-soft">Karo ekle</p>}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Stepper label="x²" value={value.x2} onDec={() => upd('x2', -1)} onInc={() => upd('x2', 1)} disabled={locked} color="#4f46e5" />
          <Stepper label="x" value={value.x} onDec={() => upd('x', -1)} onInc={() => upd('x', 1)} disabled={locked} color="#059669" />
          <Stepper label="1" value={value.c} onDec={() => upd('c', -1)} onInc={() => upd('c', 1)} disabled={locked} color="#d97706" />
        </div>
        <p className="text-center text-xs font-bold text-ink-soft">Kırmızı karolar negatif değerlerdir. Bir pozitif ve bir negatif karo “sıfır çifti” oluşturur.</p>
        {!target && <Readout>{exprText(value)}</Readout>}
      </div>
    )
  },
}

// ─── Sütun grafiği oluşturucu ──────────────────────────────────────────────
type BG = number[]
const DEFAULT_CATS = ['Elma', 'Muz', 'Çilek', 'Üzüm']
export const bargraph: ToolDef<BG> = {
  id: 'bargraph',
  defaultConfig: {},
  initial: (_c, t) => ((t?.data as { value: number }[]) ?? DEFAULT_CATS).map(() => 0),
  check: (v, t) => ((t.data as { value: number }[]) ?? []).every((d, i) => v[i] === d.value),
  Component: ({ value, onChange, target, locked }) => {
    const data = (target?.data as { label: string; value: number }[]) ?? DEFAULT_CATS.map((label) => ({ label, value: 0 }))
    const max = Math.max(10, ...data.map((d) => d.value))
    const set = (i: number, v: number) => {
      if (locked) return
      const nv = value.slice()
      nv[i] = Math.max(0, Math.min(max, v))
      onChange(nv)
    }
    const total = value.reduce((a, b) => a + b, 0)
    return (
      <div className="flex flex-col items-center gap-4">
        {target && (
          <table className="overflow-hidden rounded-xl text-sm ring-1 ring-line">
            <tbody>
              <tr>{data.map((d) => <th key={d.label} className="border border-line bg-brand-soft px-3 py-1.5">{d.label}</th>)}</tr>
              <tr>{data.map((d) => <td key={d.label} className="border border-line bg-white px-3 py-1.5 text-center font-black">{d.value}</td>)}</tr>
            </tbody>
          </table>
        )}
        <div className="w-full max-w-lg">
          <BarsSvg data={data.map((d, i) => ({ label: d.label, value: value[i] ?? 0 }))} />
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {data.map((d, i) => <Stepper key={d.label} label={d.label} value={value[i] ?? 0} onDec={() => set(i, (value[i] ?? 0) - 1)} onInc={() => set(i, (value[i] ?? 0) + 1)} disabled={locked} />)}
        </div>
        {!target && total > 0 && (
          <Readout>
            Toplam {total} · En çok: {data[value.indexOf(Math.max(...value))].label} · En az: {data[value.indexOf(Math.min(...value))].label}
          </Readout>
        )}
      </div>
    )
  },
}

// ─── Olasılık deneyleri ────────────────────────────────────────────────────
type Prob = { counts: number[]; last: number | null; spin: number; choice: string | null }
const outcomesFor = (mode: string, sectors?: { label: string; color: string; weight?: number }[]) => {
  if (mode === 'coin') return [{ label: 'Yazı', color: '#eab308', weight: 1 }, { label: 'Tura', color: '#6366f1', weight: 1 }]
  if (mode === 'dice') return [1, 2, 3, 4, 5, 6].map((k) => ({ label: String(k), color: '#6366f1', weight: 1 }))
  return sectors ?? [{ label: 'Kırmızı', color: '#ef4444', weight: 2 }, { label: 'Mavi', color: '#3b82f6', weight: 1 }, { label: 'Yeşil', color: '#22c55e', weight: 1 }]
}

export const probability: ToolDef<Prob> = {
  id: 'probability',
  defaultConfig: { mode: 'dice' },
  initial: (c) => ({ counts: outcomesFor(c.mode ?? 'dice', c.sectors).map(() => 0), last: null, spin: 0, choice: null }),
  check: (v, t) => v.choice === t.answer,
  Component: ({ value, onChange, config, target, locked }) => {
    const [mode, setMode] = useState(config.mode ?? 'dice')
    const outs = outcomesFor(mode, config.sectors)
    const counts = value.counts.length === outs.length ? value.counts : outs.map(() => 0)
    const totalW = outs.reduce((s, o) => s + (o.weight ?? 1), 0)
    const draw = () => {
      let r = Math.random() * totalW
      for (let i = 0; i < outs.length; i++) {
        r -= outs[i].weight ?? 1
        if (r < 0) return i
      }
      return outs.length - 1
    }
    const run = (times: number) => {
      const c = counts.slice()
      let last = 0
      for (let k = 0; k < times; k++) { last = draw(); c[last]++ }
      // Çarkın göstergesi son sonucun ortasına gelecek şekilde döndür
      let acc = 0
      for (let i = 0; i < last; i++) acc += outs[i].weight ?? 1
      const mid = ((acc + (outs[last].weight ?? 1) / 2) / totalW) * 360
      const spin = value.spin + 720 + ((360 - mid - (value.spin % 360)) % 360 + 360) % 360
      onChange({ ...value, counts: c, last, spin })
    }
    const total = counts.reduce((a, b) => a + b, 0)
    const choices = (target?.choices as string[]) ?? []
    return (
      <div className="flex flex-col items-center gap-4">
        {!target && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {(['coin', 'dice', 'spinner', 'bag'] as const).map((m) => (
              <ToolButton key={m} active={mode === m} onClick={() => { setMode(m); onChange({ counts: outcomesFor(m, config.sectors).map(() => 0), last: null, spin: 0, choice: null }) }}>
                {m === 'coin' ? '🪙 Para' : m === 'dice' ? '🎲 Zar' : m === 'spinner' ? '🎡 Çark' : '👜 Torba'}
              </ToolButton>
            ))}
          </div>
        )}
        <div className="grid h-44 place-items-center">
          {mode === 'dice' && <DiceSvg value={value.last !== null ? value.last + 1 : 6} size={120} />}
          {mode === 'coin' && (
            <div className={`grid size-32 place-items-center rounded-full text-xl font-black ring-8 ${value.last === 1 ? 'bg-indigo-200 text-indigo-800 ring-indigo-400' : 'bg-amber-200 text-amber-800 ring-amber-400'}`}>
              {value.last === null ? '?' : outs[value.last].label}
            </div>
          )}
          {mode === 'spinner' && <div className="w-44"><SpinnerSvg sectors={outs} rotation={value.spin} /></div>}
          {mode === 'bag' && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex max-w-56 flex-wrap justify-center gap-1 rounded-b-[2.5rem] rounded-t-xl bg-amber-100 p-3 ring-2 ring-amber-300">
                {outs.flatMap((o, i) => Array.from({ length: o.weight ?? 1 }, (_, k) => <span key={`${i}${k}`} className="size-6 rounded-full ring-2 ring-white" style={{ background: o.color }} />))}
              </div>
              {value.last !== null && <span className="chip text-sm text-white" style={{ background: outs[value.last].color }}>Çekilen: {outs[value.last].label} (geri konuldu)</span>}
            </div>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className="btn-primary" onClick={() => run(1)} disabled={locked}>1 kez</button>
          <ToolButton onClick={() => run(10)} disabled={locked}>10 kez</ToolButton>
          <ToolButton onClick={() => run(100)} disabled={locked}>100 kez</ToolButton>
          <ToolButton onClick={() => onChange({ ...value, counts: outs.map(() => 0), last: null })} disabled={locked || total === 0}><RotateCcw size={16} /></ToolButton>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="mx-auto text-sm">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left text-ink-soft">Sonuç</th>
                {outs.map((o) => <th key={o.label} className="px-2 py-1"><span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-full" style={{ background: o.color }} />{o.label}</span></th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-2 py-1 font-bold text-ink-soft">Sayı</td>
                {counts.map((c, i) => <td key={i} className="px-2 py-1 text-center font-black tabular-nums">{c}</td>)}
              </tr>
              <tr>
                <td className="px-2 py-1 font-bold text-ink-soft">Oran</td>
                {counts.map((c, i) => <td key={i} className="px-2 py-1 text-center tabular-nums">{total ? (c / total).toLocaleString('tr-TR', { maximumFractionDigits: 2 }) : '–'}</td>)}
              </tr>
            </tbody>
          </table>
          <p className="mt-1 text-center text-xs font-bold text-ink-soft">Toplam deneme: {total}</p>
        </div>
        {target && (
          <div className="w-full rounded-2xl bg-brand-soft p-4">
            <p className="mb-3 text-center font-extrabold"><MathText text={String(target.question ?? '')} /></p>
            <div className="flex flex-wrap justify-center gap-2">
              {choices.map((ch) => (
                <button key={ch} type="button" disabled={locked} onClick={() => onChange({ ...value, choice: ch })} className={`min-h-12 rounded-2xl border-2 px-4 font-extrabold ${value.choice === ch ? 'border-brand bg-white text-brand' : 'border-transparent bg-white'}`}><MathText text={ch} /></button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  },
}
