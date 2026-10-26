import { useEffect, useRef, useState, type PointerEvent as RPE, type ReactNode } from 'react'
import { Eye, EyeOff, Shuffle, Zap } from 'lucide-react'
import type { ManipulativeConfig } from '../../data/types'
import { ek } from '../../lib/generators'
import { Stepper, ToolButton } from '../ui'
import { n, type ToolDef } from '../types'

/**
 * Rekenrek (Sayı Boncuğu)
 *  Her sırada 10 boncuk: 5 kırmızı + 5 beyaz. Boncuklar sağda durur; sola itilenler sayılır.
 *  - Boncuğa dokun: o boncuk ve onunla sol grup arasındaki tüm boncuklar sola kayar (gerçek rekenrek gibi).
 *    Sol gruptaki bir boncuğa dokunmak onu ve sağındakileri geri iter.
 *  - Boncuğu sürükle: bir grup hâlinde kayar, bırakınca yerine oturur.
 *  - “Hızlı bakış”: düzen birkaç saniye görünür, sonra perde iner (hızlı tanıma).
 *  - Serbest modda her sıranın ve toplamın 5’li / 10’lu yapısı canlı yazılır.
 *
 * config: { rows?: 1–10 } (varsayılan 2)
 * Hedef biçimleri:
 *  { count }                 → tüm sıraların toplamı count
 *  { count, maxMoves }       → en çok maxMoves itişle (ör. 7’yi tek hamlede: 5 + 2)
 *  { rows: [a, b, …] }       → her sıra tam bu sayıda (fazla sıralar 0)
 *  { rows | count, flash }   → üstte hedef düzen `flash` saniye gösterilip kapanır; öğrenci aynısını kurar
 */
type V = { rows: number[]; moves: number }
type Cfg = ManipulativeConfig & { rows?: number }
const cfgDefault: Cfg = { rows: 2 }

const W = 800
const ROW_H = 66
const PAD = 26
const GUT = 78 // soldaki sayı sütunu
const D = 50 // boncuk aralığı
const R = 23
const ROD0 = GUT + 34, ROD1 = W - 34
const leftPos = (i: number) => ROD0 + D / 2 + 4 + i * D
const rightPos = (i: number) => ROD1 - D / 2 - 4 - (9 - i) * D
const GAP = rightPos(0) - leftPos(0)

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0)
const clampN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

function BeadDefs() {
  return (
    <defs>
      <radialGradient id="rk-red" cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#fca5a5" />
        <stop offset="35%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#991b1b" />
      </radialGradient>
      <radialGradient id="rk-white" cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="55%" stopColor="#f4f4f5" />
        <stop offset="100%" stopColor="#a1a1aa" />
      </radialGradient>
      <linearGradient id="rk-wood" x1="0" x2="1">
        <stop offset="0%" stopColor="#b45309" />
        <stop offset="50%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#92400e" />
      </linearGradient>
      <linearGradient id="rk-rod" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e2e8f0" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
      <filter id="rk-shadow" x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="1.8" floodColor="#1f2340" floodOpacity="0.28" />
      </filter>
    </defs>
  )
}

type Drag = { row: number; j: number; left: boolean; x0: number; dx: number; moved: boolean; id: number }

/** Boncuk rafı. onSet verilmezse salt görüntü. */
function Rack({ rows, onSet, showCounts, cover, label = 'Rekenrek' }: { rows: number[]; onSet?: (row: number, count: number) => void; showCounts?: boolean; cover?: ReactNode; label?: string }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const H = rows.length * ROW_H + PAD * 2
  const rowY = (r: number) => PAD + r * ROW_H + ROW_H / 2

  const toSvg = (cx: number, cy: number) => {
    const b = svgRef.current!.getBoundingClientRect()
    return { x: ((cx - b.left) / b.width) * W, y: ((cy - b.top) / b.height) * H, k: W / b.width }
  }

  const beadX = (row: number, i: number) => {
    const c = rows[row]
    const base = i < c ? leftPos(i) : rightPos(i)
    if (!drag || drag.row !== row) return base
    if (drag.left && i >= drag.j && i < c) return clampN(base + Math.max(0, drag.dx), leftPos(i), rightPos(i))
    if (!drag.left && i <= drag.j && i >= c) return clampN(base + Math.min(0, drag.dx), leftPos(i), rightPos(i))
    return base
  }

  const down = (e: RPE<SVGSVGElement>) => {
    if (!onSet || e.button > 0) return
    const p = toSvg(e.clientX, e.clientY)
    const row = Math.floor((p.y - PAD) / ROW_H)
    if (row < 0 || row >= rows.length) return
    let best = -1, bd = Infinity
    for (let i = 0; i < 10; i++) {
      const d = Math.abs(beadX(row, i) - p.x)
      if (d < bd) { bd = d; best = i }
    }
    if (bd > D * 0.75) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ row, j: best, left: best < rows[row], x0: p.x, dx: 0, moved: false, id: e.pointerId })
  }
  const move = (e: RPE<SVGSVGElement>) => {
    if (!drag || e.pointerId !== drag.id) return
    const p = toSvg(e.clientX, e.clientY)
    const dx = p.x - drag.x0
    setDrag({ ...drag, dx, moved: drag.moved || Math.abs(dx) > 8 })
  }
  const up = (e: RPE<SVGSVGElement>) => {
    if (!drag || e.pointerId !== drag.id) return
    const { row, j, left, dx, moved } = drag
    setDrag(null)
    if (!onSet) return
    if (!moved) return onSet(row, left ? j : j + 1)
    if (left && dx > GAP / 2) onSet(row, j)
    else if (!left && -dx > GAP / 2) onSet(row, j + 1)
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full select-none"
        style={{ touchAction: onSet ? 'none' : 'auto', cursor: onSet ? 'grab' : 'default' }}
        role="img"
        aria-label={`${label}: ${rows.map((c, i) => `${i + 1}. sırada ${c}`).join(', ')}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => setDrag(null)}
      >
        <BeadDefs />
        <rect x={GUT} y={4} width={W - GUT - 4} height={H - 8} rx={20} fill="#fff7ed" stroke="#fed7aa" strokeWidth={2} />
        {/* yan direkler */}
        <rect x={GUT + 8} y={6} width={20} height={H - 12} rx={8} fill="url(#rk-wood)" />
        <rect x={W - 30} y={6} width={20} height={H - 12} rx={8} fill="url(#rk-wood)" />
        {rows.map((c, r) => {
          const y = rowY(r)
          return (
            <g key={r}>
              <rect x={ROD0 - 8} y={y - 3.5} width={ROD1 - ROD0 + 16} height={7} rx={3.5} fill="url(#rk-rod)" />
              {Array.from({ length: 10 }).map((_, i) => {
                const x = beadX(r, i)
                const lifted = drag && drag.row === r && drag.moved && ((drag.left && i >= drag.j && i < c) || (!drag.left && i <= drag.j && i >= c))
                return (
                  <g key={i} filter="url(#rk-shadow)" style={{ transition: drag && drag.row === r ? 'none' : 'transform 220ms cubic-bezier(.3,1.3,.5,1)' }} transform={`translate(${x} ${y - (lifted ? 2 : 0)})`}>
                    <circle r={R} fill={i < 5 ? 'url(#rk-red)' : 'url(#rk-white)'} stroke={i < 5 ? '#7f1d1d' : '#a1a1aa'} strokeWidth={1.2} />
                    <rect x={-R} y={-2.6} width={2 * R} height={5.2} fill="#000" opacity={0.08} />
                  </g>
                )
              })}
              {showCounts && (
                <g>
                  <rect x={6} y={y - 24} width={GUT - 14} height={48} rx={14} fill={c ? '#1f2340' : '#f1f2f7'} />
                  <text x={6 + (GUT - 14) / 2} y={y + 9} textAnchor="middle" fontSize={26} fontWeight={900} fill={c ? '#fff' : '#8a8fb0'}>{c}</text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
      {cover}
    </div>
  )
}

function rowStructure(c: number) {
  if (c === 0) return '0'
  if (c <= 5) return c === 5 ? '5 (tüm kırmızılar)' : `${c}`
  if (c === 10) return '5 + 5 = 10 (tam sıra)'
  return `5 + ${c - 5} = ${c}`
}

function Explain({ rows }: { rows: number[] }) {
  const total = sum(rows)
  const reds = sum(rows.map((c) => Math.min(5, c)))
  const whites = sum(rows.map((c) => Math.max(0, c - 5)))
  const multi = rows.length > 1
  const used = rows.filter((c) => c > 0)
  let pair: string | null = null
  if (rows.length === 2 && rows[0] && rows[1]) {
    const [a, b] = rows
    if (a === b) pair = `İkizler: ${a} + ${a} = ${2 * a}`
    else if (Math.abs(a - b) === 1) {
      const m = Math.min(a, b)
      pair = `İkize yakın: ${a} + ${b} = ${m} + ${m} + 1 = ${a + b}`
    } else if (a + b > 10 && (a >= 5 || b >= 5)) pair = `10’a tamamla: ${a} + ${b} = 10 + ${a + b - 10}`
  }
  const full = rows.filter((c) => c === 10).length
  return (
    <div className="mx-auto mt-1 w-full max-w-xl rounded-2xl bg-ink px-4 py-3 text-white">
      <div className="grid gap-1 text-base font-extrabold tabular-nums">
        {rows.map((c, i) => (
          <div key={i} className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-bold tracking-wide text-white/60 uppercase">{multi ? `${i + 1}. sıra` : 'Sıra'}</span>
            <span>
              {c > 5 ? (<><span className="text-red-300">5</span> + <span className="text-white">{c - 5}</span>{c === 10 ? ' = 10' : ` = ${c}`}</>) : <span className={c ? 'text-red-300' : 'text-white/50'}>{rowStructure(c)}</span>}
              {c > 0 && c < 10 && <span className="ml-2 text-sm text-white/55">10’a {10 - c} kaldı</span>}
            </span>
          </div>
        ))}
      </div>
      {multi && (
        <div className="mt-2 border-t border-white/15 pt-2 text-center text-xl font-black tabular-nums">
          {used.length > 1 ? `${used.join(' + ')} = ${total}` : `Toplam ${total}`}
          {total > 0 && (
            <div className="mt-0.5 text-sm font-bold text-white/75">
              <span className="text-red-300">{reds} kırmızı</span> + {whites} beyaz
              {full > 0 && full < rows.filter((c) => c > 0).length ? ` · ${full} tam sıra = ${full * 10}` : ''}
              {total >= 10 && total % 10 !== 0 ? ` · ${total} = ${Math.floor(total / 10) * 10} + ${total % 10}` : ''}
            </div>
          )}
          {pair && <div className="mt-1 text-sm font-extrabold text-amber-300">{pair}</div>}
        </div>
      )}
    </div>
  )
}

type Flash = 'off' | 'show' | 'hidden'

function Curtain({ state, secs, onReveal, msg = 'Kaç boncuk gördün? Nasıl gördün?' }: { state: Flash; secs: number; onReveal: () => void; msg?: string }) {
  if (state === 'off') return null
  return (
    <div className={`absolute inset-0 overflow-hidden rounded-[20px] ${state === 'hidden' ? 'bg-[#1f2340]' : 'pointer-events-none'}`} style={{ left: `${(GUT / W) * 100}%` }}>
      {state === 'show' ? (
        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-amber-200">
          <div className="h-full bg-amber-500" style={{ animation: `rk-count ${secs}s linear forwards` }} />
          <style>{'@keyframes rk-count { from { width: 100% } to { width: 0% } }'}</style>
        </div>
      ) : (
        <div className="flex h-full flex-wrap items-center justify-center gap-x-4 gap-y-1 p-2 text-center text-white">
          <span className="hidden text-4xl font-black sm:inline">?</span>
          <span className="text-xs font-extrabold sm:text-base">{msg}</span>
          <button type="button" onClick={onReveal} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-ink active:scale-95"><Eye size={18} />Aç</button>
        </div>
      )}
    </div>
  )
}

function useFlash() {
  const [state, setState] = useState<Flash>('off')
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const start = (secs: number) => {
    window.clearTimeout(timer.current)
    setState('show')
    timer.current = window.setTimeout(() => setState('hidden'), secs * 1000)
  }
  const reveal = () => { window.clearTimeout(timer.current); setState('off') }
  return { state, start, reveal, setState }
}

const targetRows = (t: Record<string, unknown>, len: number): number[] => {
  if (Array.isArray(t.rows)) return (t.rows as number[]).map((x) => clampN(Math.round(x), 0, 10))
  let c = n(t, 'count')
  return Array.from({ length: Math.max(1, len) }, () => { const k = Math.min(10, c); c -= k; return k })
}

function Component({ value, onChange, target, locked }: { value: V; onChange: (v: V) => void; target?: Record<string, unknown>; locked?: boolean }) {
  const rowsN = value.rows.length
  const [secs, setSecs] = useState(2)
  const [flashUI, setFlashUI] = useState(false)
  const flash = useFlash()
  const peek = useFlash()
  const [peeks, setPeeks] = useState(0)
  const flashT = target && typeof target.flash === 'number' ? (target.flash as number) : 0

  useEffect(() => { if (flashT) peek.start(flashT) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setRow = (r: number, c: number) => {
    if (locked || flash.state === 'hidden') return
    if (value.rows[r] === c) return
    const rows = value.rows.slice()
    rows[r] = clampN(c, 0, 10)
    onChange({ rows, moves: value.moves + 1 })
  }
  const setRowsN = (k: number) => {
    const m = clampN(k, 1, 10)
    onChange({ ...value, rows: Array.from({ length: m }, (_, i) => value.rows[i] ?? 0) })
  }
  const randomFlash = () => {
    const cap = rowsN * 10
    const total = 1 + Math.floor(Math.random() * Math.min(cap, rowsN === 1 ? 10 : 20))
    let rest = total
    const rows = value.rows.map((_, i) => {
      if (i === rowsN - 1) return Math.min(10, rest)
      const k = rowsN > 1 && rest > 5 && Math.random() < 0.6 ? Math.min(10, Math.max(rest - 10, Math.ceil(rest / 2) + (Math.random() < 0.5 ? 0 : -1))) : Math.min(10, rest)
      rest -= k
      return k
    })
    onChange({ rows, moves: 0 })
    flash.start(secs)
  }

  const total = sum(value.rows)
  const free = !target
  const ghostRows = flashT && target ? targetRows(target, rowsN) : null
  const maxMoves = target ? n(target, 'maxMoves') : 0

  return (
    <div className="flex flex-col items-center gap-3">
      {ghostRows && (
        <div className="w-full max-w-3xl">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">Bu düzene iyi bak</span>
            <ToolButton onClick={() => { setPeeks(peeks + 1); peek.start(flashT) }} disabled={locked || peek.state === 'show'}><Eye size={16} />Bir daha bak{peeks ? ` (${peeks})` : ''}</ToolButton>
          </div>
          <div className="opacity-95"><Rack rows={ghostRows} label="Gösterilen düzen" cover={<Curtain state={locked ? 'off' : peek.state === 'off' ? 'hidden' : peek.state} secs={flashT} onReveal={() => { setPeeks(peeks + 1); peek.start(flashT) }} msg="Gördüğün düzeni aşağıda kur." />} /></div>
        </div>
      )}
      <div className="w-full max-w-3xl">
        <Rack
          rows={value.rows}
          onSet={locked ? undefined : setRow}
          showCounts={free && flash.state === 'off'}
          cover={<Curtain state={flash.state} secs={secs} onReveal={flash.reveal} />}
        />
      </div>
      <p className="text-center text-sm font-bold text-ink-soft">
        Boncuğa dokun ya da sürükle: o boncuk ve aradakiler birlikte kayar. Sola gelen boncuklar sayılır.
        {maxMoves > 0 && <span className="block text-brand">En çok {maxMoves} itişte yap! (Şu ana kadar {value.moves})</span>}
      </p>

      <div className="flex flex-wrap items-end justify-center gap-2">
        {free && <Stepper label="Sıra" value={rowsN} onDec={() => setRowsN(rowsN - 1)} onInc={() => setRowsN(rowsN + 1)} disabled={locked} />}
        <ToolButton onClick={() => onChange({ rows: value.rows.map(() => 0), moves: value.moves + 1 })} disabled={locked || total === 0}>Hepsini sağa</ToolButton>
        {free && <ToolButton active={flashUI} onClick={() => { setFlashUI(!flashUI); flash.reveal() }}><Zap size={16} />Hızlı bakış</ToolButton>}
      </div>

      {free && flashUI && (
        <div className="flex w-full max-w-xl flex-wrap items-center justify-center gap-2 rounded-2xl bg-amber-50 p-2.5 ring-1 ring-amber-200">
          <span className="text-xs font-extrabold tracking-wide text-amber-800 uppercase">Süre</span>
          {[1, 2, 3, 5].map((s) => <ToolButton key={s} active={secs === s} onClick={() => setSecs(s)}>{s} sn</ToolButton>)}
          <ToolButton onClick={randomFlash}><Shuffle size={16} />Rastgele göster</ToolButton>
          <ToolButton onClick={() => flash.start(secs)} disabled={total === 0}><EyeOff size={16} />Bu düzeni göster</ToolButton>
        </div>
      )}

      {(free || locked) && flash.state === 'off' && <Explain rows={value.rows} />}
      {free && flash.state === 'off' && total > 0 && total <= 20 && rowsN <= 2 && (
        <p className="text-center text-xs font-bold text-ink-soft">{ek(total, 'acc')} en az kaç itişle kurabilirsin? Kırmızı beşlikler saymadan görmeyi sağlar.</p>
      )}
    </div>
  )
}

export const rekenrek: ToolDef<V> = {
  id: 'rekenrek',
  defaultConfig: cfgDefault,
  initial: (config, target) => {
    const len = clampN((config as Cfg).rows ?? 2, 1, 10)
    const tl = target && Array.isArray(target.rows) ? (target.rows as unknown[]).length : 0
    const need = target && typeof target.count === 'number' ? Math.ceil(n(target, 'count') / 10) : 0
    return { rows: Array(Math.max(len, tl, need)).fill(0), moves: 0 }
  },
  check: (v, t) => {
    if (typeof t.maxMoves === 'number' && v.moves > n(t, 'maxMoves')) return false
    if (Array.isArray(t.rows)) {
      const want = t.rows as number[]
      return v.rows.every((c, i) => c === (want[i] ?? 0)) && want.length <= v.rows.length
    }
    return sum(v.rows) === n(t, 'count')
  },
  Component,
}
