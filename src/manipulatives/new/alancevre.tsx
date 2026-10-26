import { useEffect, useMemo, useRef, useState, type PointerEvent as RPE } from 'react'
import { useGesture } from '@use-gesture/react'
import { RotateCcw, Sparkles } from 'lucide-react'
import { Stepper, ToolButton } from '../ui'
import { n, type ToolDef } from '../types'

/**
 * Alan ve Çevre Tahtası
 *  - Serbest mod: boş kareye dokun / parmağını gezdir → kare ekle; kareye dokun → çıkar; kareyi sürükle → taşı.
 *    Kareler kenar kenara değmek zorunda (bağlı çokkare). Alan sabitken çevrenin değiştiği, aynı alan için
 *    çevre geçmişi grafiğiyle ve “Çevre = 4 × kare − 2 × ortak kenar” ilişkisiyle canlı görünür.
 *  - Dikdörtgen modu: köşe tutamacını sürükle (ya da iki parmakla büyüt/küçült) → genişlik × yükseklik.
 *
 * Görev hedefi (target):
 *   { area?: number, perimeter?: number, rect?: boolean }
 *   - area: br² cinsinden alan, perimeter: br cinsinden çevre
 *   - rect: true → şekil bir dikdörtgen olmalı (görev dikdörtgen modunda başlar)
 *   Görev modunda alan/çevre göstergeleri ve geçmiş grafiği gizlenir; öğrenci sayarak bulur.
 */

type Mode = 'serbest' | 'dikdortgen'
type Challenge = null | 'maxP' | 'minP' | 'rect12' | 'per16'
type V = {
  mode: Mode
  cells: string[]
  w: number
  h: number
  /** alan → o alanla denenen çevreler */
  hist: Record<string, number[]>
  rects: [number, number][]
  challenge: Challenge
  aids: { count: boolean; edges: boolean; shared: boolean }
}

const ROWS = 8
const U = 60
const PAD = 34
const key = (x: number, y: number) => `${x},${y}`
const parse = (k: string) => k.split(',').map(Number) as [number, number]
const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const

function sharedEdges(cells: string[]) {
  const s = new Set(cells)
  let e = 0
  for (const c of cells) {
    const [x, y] = parse(c)
    if (s.has(key(x + 1, y))) e++
    if (s.has(key(x, y + 1))) e++
  }
  return e
}
const perimeterOf = (cells: string[]) => 4 * cells.length - 2 * sharedEdges(cells)

function connected(cells: string[]) {
  if (cells.length <= 1) return true
  const s = new Set(cells)
  const seen = new Set([cells[0]])
  const st = [cells[0]]
  while (st.length) {
    const [x, y] = parse(st.pop()!)
    for (const [dx, dy] of NB) {
      const k = key(x + dx, y + dy)
      if (s.has(k) && !seen.has(k)) { seen.add(k); st.push(k) }
    }
  }
  return seen.size === cells.length
}
function isRect(cells: string[]) {
  if (!cells.length) return false
  const ps = cells.map(parse)
  const xs = ps.map((p) => p[0]), ys = ps.map((p) => p[1])
  return (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1) === cells.length
}
const rectCells = (w: number, h: number) => Array.from({ length: w * h }, (_, i) => key(i % w, Math.floor(i / w)))
const minPer = (a: number) => (a ? 2 * Math.ceil(2 * Math.sqrt(a) - 1e-9) : 0)
const maxPer = (a: number) => (a ? 2 * a + 2 : 0)

/** Sınır kenarlarını çevre boyunca sıralar (numaralandırma için) */
function boundaryLoop(cells: string[]) {
  const s = new Set(cells)
  type E = { a: [number, number]; b: [number, number]; o: [number, number] }
  const edges: E[] = []
  for (const c of cells) {
    const [x, y] = parse(c)
    if (!s.has(key(x, y - 1))) edges.push({ a: [x, y], b: [x + 1, y], o: [0, -1] })
    if (!s.has(key(x + 1, y))) edges.push({ a: [x + 1, y], b: [x + 1, y + 1], o: [1, 0] })
    if (!s.has(key(x, y + 1))) edges.push({ a: [x + 1, y + 1], b: [x, y + 1], o: [0, 1] })
    if (!s.has(key(x - 1, y))) edges.push({ a: [x, y + 1], b: [x, y], o: [-1, 0] })
  }
  const from = new Map<string, number[]>()
  edges.forEach((e, i) => { const k = key(...e.a); from.set(k, [...(from.get(k) ?? []), i]) })
  const used = new Set<number>()
  const out: E[] = []
  // en üst-sol kenardan başla
  const order = edges.map((_, i) => i).sort((i, j) => edges[i].a[1] - edges[j].a[1] || edges[i].a[0] - edges[j].a[0])
  for (const st of order) {
    let cur: number | undefined = st
    while (cur !== undefined && !used.has(cur)) {
      used.add(cur)
      out.push(edges[cur])
      const nx: number[] = from.get(key(...edges[cur].b)) ?? []
      cur = nx.find((i) => !used.has(i))
    }
  }
  return out
}

function nextHist(v: V, cells: string[]): Record<string, number[]> {
  const a = String(cells.length)
  if (!cells.length) return v.hist
  const p = perimeterOf(cells)
  const list = v.hist[a] ?? []
  return { ...v.hist, [a]: [...list, p].slice(-12) }
}

/* ─────────────────────────────── Tahta ─────────────────────────────── */
function Board({ value, onChange, locked, task, flash, cols: COLS }: { value: V; onChange: (v: V) => void; locked?: boolean; task: boolean; flash: (m: string) => void; cols: number }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const latest = useRef(value)
  latest.current = value
  const [drag, setDrag] = useState<null | { from: string; sx: number; sy: number; x: number; y: number; moved: boolean }>(null)
  const painting = useRef(false)
  const cells = value.cells
  const set = useMemo(() => new Set(cells), [cells])

  const toSvg = (cx: number, cy: number) => {
    const m = svgRef.current?.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const p = new DOMPoint(cx, cy).matrixTransform(m.inverse())
    return { x: p.x, y: p.y }
  }
  const cellAt = (p: { x: number; y: number }) => {
    const x = Math.floor(p.x / U), y = Math.floor(p.y / U)
    return x >= 0 && y >= 0 && x < COLS && y < ROWS ? key(x, y) : null
  }
  const canAdd = (cs: string[], k: string) => {
    if (cs.includes(k)) return false
    if (!cs.length) return true
    const [x, y] = parse(k)
    return NB.some(([dx, dy]) => cs.includes(key(x + dx, y + dy)))
  }
  const commit = (cs: string[]) => {
    const v = latest.current
    const nv = { ...v, cells: cs, hist: nextHist(v, cs) }
    latest.current = nv
    onChange(nv)
  }
  const tryAdd = (k: string, quiet = false) => {
    const cs = latest.current.cells
    if (cs.includes(k)) return
    if (!canAdd(cs, k)) { if (!quiet) flash('Yeni kare, şekle bir kenarıyla değmeli.'); return }
    commit([...cs, k])
  }

  const down = (e: RPE<SVGSVGElement>) => {
    if (locked || value.mode !== 'serbest') return
    const p = toSvg(e.clientX, e.clientY)
    const k = cellAt(p)
    if (!k) return
    e.currentTarget.setPointerCapture(e.pointerId)
    if (set.has(k)) setDrag({ from: k, sx: p.x, sy: p.y, x: p.x, y: p.y, moved: false })
    else { painting.current = true; tryAdd(k) }
  }
  const move = (e: RPE<SVGSVGElement>) => {
    if (!drag && !painting.current) return
    const p = toSvg(e.clientX, e.clientY)
    if (drag) {
      setDrag({ ...drag, x: p.x, y: p.y, moved: drag.moved || Math.hypot(p.x - drag.sx, p.y - drag.sy) > 10 })
    } else {
      const k = cellAt(p)
      if (k) tryAdd(k, true)
    }
  }
  const up = (e: RPE<SVGSVGElement>) => {
    painting.current = false
    if (!drag) return
    const cs = latest.current.cells
    if (!drag.moved) {
      const rest = cs.filter((c) => c !== drag.from)
      if (connected(rest)) commit(rest)
      else flash('Bu kare çıkarsa şekil ikiye bölünür. Önce kenardaki bir kareyi dene.')
    } else {
      const t = cellAt(toSvg(e.clientX, e.clientY))
      if (t && t !== drag.from && !cs.includes(t)) {
        const nc = cs.map((c) => (c === drag.from ? t : c))
        if (connected(nc)) commit(nc)
        else flash('Kareler kenar kenara değmeli. Kareyi şeklin yanına bırak.')
      }
    }
    setDrag(null)
  }

  // Dikdörtgen modu: köşe tutamacı + iki parmak
  const handleRef = useRef<SVGGElement>(null)
  const rectRef = useRef<SVGGElement>(null)
  useGesture(
    {
      onDrag: ({ xy: [cx, cy], event }) => {
        event.stopPropagation()
        if (locked) return
        const p = toSvg(cx, cy)
        const w = Math.max(1, Math.min(COLS, Math.round(p.x / U)))
        const h = Math.max(1, Math.min(ROWS, Math.round(p.y / U)))
        const v = latest.current
        if (w !== v.w || h !== v.h) onChange({ ...v, w, h })
      },
    },
    { target: handleRef, eventOptions: { passive: false }, },
  )
  useGesture(
    {
      onPinch: ({ offset: [s], first, memo, event }) => {
        event?.preventDefault?.()
        if (locked) return memo
        const v = latest.current
        const m = first || !memo ? { w0: v.w, h0: v.h, s0: s } : memo
        const f = s / m.s0
        const w = Math.max(1, Math.min(COLS, Math.round(m.w0 * f)))
        const h = Math.max(1, Math.min(ROWS, Math.round(m.h0 * f)))
        if (w !== v.w || h !== v.h) onChange({ ...v, w, h })
        return m
      },
    },
    { target: rectRef, eventOptions: { passive: false } },
  )

  const shown = value.mode === 'dikdortgen' ? rectCells(value.w, value.h) : cells
  const shownSet = new Set(shown)
  const free = value.mode === 'serbest'
  const loop = value.aids.edges && !task && free ? boundaryLoop(shown) : []
  const target = drag?.moved ? cellAt({ x: drag.x, y: drag.y }) : null
  const targetOk = target && drag ? !cells.includes(target) && connected(cells.map((c) => (c === drag.from ? target : c))) : false

  // sınır çizgisi
  const outline: string[] = []
  const inner: string[] = []
  for (const c of shown) {
    const [x, y] = parse(c)
    if (!shownSet.has(key(x, y - 1))) outline.push(`M${x * U} ${y * U}h${U}`)
    if (!shownSet.has(key(x, y + 1))) outline.push(`M${x * U} ${(y + 1) * U}h${U}`)
    if (!shownSet.has(key(x - 1, y))) outline.push(`M${x * U} ${y * U}v${U}`)
    if (!shownSet.has(key(x + 1, y))) outline.push(`M${(x + 1) * U} ${y * U}v${U}`)
    if (shownSet.has(key(x + 1, y))) inner.push(`M${(x + 1) * U} ${y * U + 10}v${U - 20}`)
    if (shownSet.has(key(x, y + 1))) inner.push(`M${x * U + 10} ${(y + 1) * U}h${U - 20}`)
  }
  const ordered = value.mode === 'serbest' ? [...cells].sort((a, b) => parse(a)[1] - parse(b)[1] || parse(a)[0] - parse(b)[0]) : shown

  return (
    <svg
      ref={svgRef}
      viewBox={`${-PAD} ${-PAD} ${COLS * U + 2 * PAD} ${ROWS * U + 2 * PAD}`}
      className="block w-full select-none"
      style={{ touchAction: 'none' }}
      role="img"
      aria-label="Kare tahtası"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => { painting.current = false; setDrag(null) }}
    >
      <rect x={-PAD} y={-PAD} width={COLS * U + 2 * PAD} height={ROWS * U + 2 * PAD} rx={24} fill="#fbf7f6" />
      {Array.from({ length: ROWS }).map((_, y) =>
        Array.from({ length: COLS }).map((_, x) => <rect key={key(x, y)} x={x * U + 3} y={y * U + 3} width={U - 6} height={U - 6} rx={9} fill="#fff" stroke="#ebecf4" strokeWidth={1.5} />),
      )}
      <g>
        {ordered.map((c, i) => {
          const [x, y] = parse(c)
          const lifted = drag?.moved && drag.from === c
          return (
            <g key={c} opacity={lifted ? 0.25 : 1}>
              <rect x={x * U + 1.5} y={y * U + 1.5} width={U - 3} height={U - 3} rx={6} fill="#f7b6cd" stroke="#e57aa1" strokeWidth={1.5} />
              <rect x={x * U + 6} y={y * U + 6} width={U - 12} height={(U - 12) / 2.4} rx={4} fill="#fff" opacity={0.35} />
              {value.aids.count && !task && free && <text x={x * U + U / 2} y={y * U + U / 2 + 7} textAnchor="middle" fontSize={20} fontWeight={900} fill="#7a1f43">{i + 1}</text>}
            </g>
          )
        })}
      </g>
      {value.aids.shared && !task && free && <path d={inner.join('')} stroke="#f59e0b" strokeWidth={5} strokeLinecap="round" strokeDasharray="2 9" fill="none" />}
      <path d={outline.join('')} stroke="#d6457a" strokeWidth={5.5} strokeLinecap="round" fill="none" />
      {loop.map((e, i) => {
        const mx = ((e.a[0] + e.b[0]) / 2) * U + e.o[0] * 13, my = ((e.a[1] + e.b[1]) / 2) * U + e.o[1] * 13
        return (
          <g key={i}>
            <circle cx={mx} cy={my} r={11} fill="#1f2340" />
            <text x={mx} y={my + 4} textAnchor="middle" fontSize={12} fontWeight={900} fill="#fff">{i + 1}</text>
          </g>
        )
      })}
      {value.mode === 'dikdortgen' && (
        <g>
          <g ref={rectRef} style={{ touchAction: 'none' }}>
            <rect x={0} y={0} width={value.w * U} height={value.h * U} fill="transparent" />
          </g>
          {!task && (
            <g pointerEvents="none" fontSize={19} fontWeight={900} fill="#0369a1" textAnchor="middle">
              <path d={`M2 -14H${value.w * U - 2}M2 -20v12M${value.w * U - 2} -20v12`} stroke="#0ea5e9" strokeWidth={2.5} />
              <text x={(value.w * U) / 2} y={-19} paintOrder="stroke" stroke="#fbf7f6" strokeWidth={6}>{value.w} br</text>
              <path d={`M-14 2V${value.h * U - 2}M-20 2h12M-20 ${value.h * U - 2}h12`} stroke="#0ea5e9" strokeWidth={2.5} />
              <text transform={`translate(-19 ${(value.h * U) / 2}) rotate(-90)`} paintOrder="stroke" stroke="#fbf7f6" strokeWidth={6}>{value.h} br</text>
            </g>
          )}
          <g ref={handleRef} data-handle style={{ touchAction: 'none', cursor: locked ? 'default' : 'nwse-resize' }}>
            <circle cx={value.w * U} cy={value.h * U} r={34} fill="transparent" />
            <circle cx={value.w * U} cy={value.h * U} r={17} fill="#d6457a" stroke="#fff" strokeWidth={4} />
            <path d={`M${value.w * U - 6} ${value.h * U - 6}l12 12M${value.w * U + 6} ${value.h * U - 1}v7h-7M${value.w * U - 6} ${value.h * U + 1}v-7h7`} stroke="#fff" strokeWidth={2.5} strokeLinecap="round" fill="none" />
          </g>
        </g>
      )}
      {drag?.moved && (
        <g pointerEvents="none">
          {target && <rect x={parse(target)[0] * U + 2} y={parse(target)[1] * U + 2} width={U - 4} height={U - 4} rx={8} fill="none" stroke={targetOk ? '#16a34a' : '#e11d48'} strokeWidth={4} strokeDasharray="8 6" />}
          <rect x={drag.x - U / 2} y={drag.y - U / 2} width={U - 3} height={U - 3} rx={7} fill="#f08cb0" stroke="#d6457a" strokeWidth={3} opacity={0.92} style={{ filter: 'drop-shadow(0 6px 8px rgb(31 35 64 / .25))' }} />
        </g>
      )}
    </svg>
  )
}

/* ───────────────────── Aynı alan → çevre geçmişi grafiği ───────────────────── */
function PerimeterHistory({ area, list }: { area: number; list: number[] }) {
  const lo = minPer(area), hi = maxPer(area)
  const top = Math.max(hi, ...list, 4)
  const W = 300, H = 120, pad = 26
  const bw = Math.min(22, (W - pad - 8) / Math.max(list.length, 1) - 4)
  const y = (p: number) => H - 18 - (p / top) * (H - 34)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-h-44" role="img" aria-label="Aynı alan için çevre geçmişi">
      {[lo, hi].map((p, i) => (
        <g key={i}>
          <line x1={pad} x2={W - 4} y1={y(p)} y2={y(p)} stroke={i ? '#d6457a' : '#0ea5e9'} strokeDasharray="5 4" strokeWidth={1.6} />
          <text x={W - 4} y={y(p) - 4} textAnchor="end" fontSize={10} fontWeight={800} fill={i ? '#be185d' : '#0369a1'}>{i ? `en çok ${p}` : `en az ${p}`}</text>
        </g>
      ))}
      <line x1={pad} x2={W - 4} y1={H - 18} y2={H - 18} stroke="#1f2340" strokeWidth={1.4} />
      <text x={pad - 6} y={y(top) + 4} textAnchor="end" fontSize={10} fontWeight={800} fill="#5b6080">{top}</text>
      <text x={pad - 6} y={H - 14} textAnchor="end" fontSize={10} fontWeight={800} fill="#5b6080">0</text>
      {list.map((p, i) => {
        const x = pad + 6 + i * (bw + 4)
        const last = i === list.length - 1
        return (
          <g key={i}>
            <rect x={x} y={y(p)} width={bw} height={H - 18 - y(p)} rx={4} fill={last ? '#d6457a' : '#f7b6cd'} />
            <text x={x + bw / 2} y={y(p) - 4} textAnchor="middle" fontSize={10} fontWeight={900} fill={last ? '#be185d' : '#5b6080'}>{p}</text>
          </g>
        )
      })}
      <text x={pad} y={H - 3} fontSize={10} fontWeight={800} fill="#5b6080">her sütun: alanı {area} br² olan bir deneme</text>
    </svg>
  )
}

/* ─────────────────────────────── Araç ─────────────────────────────── */
const CHALLENGES: Record<Exclude<Challenge, null>, { mode: Mode; title: string }> = {
  maxP: { mode: 'serbest', title: 'Aynı alan, en büyük çevre' },
  minP: { mode: 'serbest', title: 'Aynı alan, en küçük çevre' },
  rect12: { mode: 'dikdortgen', title: 'Alanı 12 br² olan tüm dikdörtgenler' },
  per16: { mode: 'dikdortgen', title: 'Çevresi 16 br, alanı en büyük' },
}

function ChallengeCard({ value, area, per, cols: COLS }: { value: V; area: number; per: number; cols: number }) {
  const c = value.challenge
  if (!c) return null
  let goal = '', done = false, win = ''
  if (c === 'maxP') {
    goal = `${area} kareyi yerinden oynatarak çevreyi olabildiğince büyüt.`
    done = area > 1 && per === maxPer(area)
    win = `Süper! ${area} karenin çevresi en çok ${maxPer(area)} br olur. Kareler yalnızca birer kenarla tutunduğunda (hiç “halka” yokken) ortak kenar en az olur.`
  } else if (c === 'minP') {
    goal = `${area} kareyi olabildiğince “toplu” yerleştir: çevre en az kaç olur?`
    done = area > 1 && per === minPer(area)
    win = `Harika! ${area} kare için en küçük çevre ${minPer(area)} br. Kareye en yakın şekil en çok ortak kenarı paylaşır.`
  } else if (c === 'rect12') {
    const found = new Set(value.rects.filter(([w, h]) => w * h === 12).map(([w, h]) => [Math.min(w, h), Math.max(w, h)].join('×')))
    const all = ['1×12', '2×6', '3×4'].filter((s) => s !== '1×12' || COLS >= 12)
    goal = `Köşeyi sürükle. Alanı 12 br² olan kaç farklı dikdörtgen bulabilirsin? Bulunan: ${[...found].join(', ') || '—'}`
    done = all.every((s) => found.has(s))
    win = 'Hepsini buldun! Alanları aynı ama çevreleri farklı: 2 × 6 → 16 br, 3 × 4 → 14 br. Kareye yaklaştıkça çevre küçülüyor.'
  } else {
    goal = 'Çevresi 16 br olan dikdörtgenler kur. Hangisinin alanı en büyük?'
    done = value.w === 4 && value.h === 4
    win = 'Evet! Çevre 16 br iken en büyük alan 4 × 4 = 16 br². Aynı çevrede kare, en çok alanı kaplar.'
  }
  return (
    <div className={`rounded-2xl p-3 text-sm font-bold ring-1 ${done ? 'bg-ok-soft text-green-800 ring-green-300' : 'bg-brand-soft text-brand-ink ring-brand/20'}`}>
      <p className="flex items-center gap-1.5 font-black"><Sparkles size={16} />{CHALLENGES[c].title}</p>
      <p className="mt-1">{done ? win : goal}</p>
    </div>
  )
}

function Tile({ label, value, unit, color, sub }: { label: string; value: number | string; unit: string; color: string; sub?: string }) {
  return (
    <div className="flex min-w-32 flex-1 flex-col items-center rounded-2xl bg-white px-3 py-2 ring-1 ring-line">
      <span className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">{label}</span>
      <span className="text-3xl font-black tabular-nums" style={{ color }}>{value} <span className="text-base">{unit}</span></span>
      {sub && <span className="text-center text-xs font-bold text-ink-soft tabular-nums">{sub}</span>}
    </div>
  )
}

const START = ['1,1', '2,1', '3,1', '1,2', '1,3', '2,3']

export const alancevre: ToolDef<V> = {
  id: 'alancevre',
  defaultConfig: {},
  initial: (_c, t) => {
    const rect = !!t?.rect
    const cells = t ? [] : START
    return { mode: rect ? 'dikdortgen' : 'serbest', cells, w: rect ? 1 : 4, h: rect ? 1 : 3, hist: cells.length ? { [cells.length]: [perimeterOf(cells)] } : {}, rects: [], challenge: null, aids: { count: false, edges: false, shared: false } }
  },
  check: (v, t) => {
    const cells = v.mode === 'dikdortgen' ? rectCells(v.w, v.h) : v.cells
    if (!cells.length || !connected(cells)) return false
    if (typeof t.area === 'number' && cells.length !== n(t, 'area')) return false
    if (typeof t.perimeter === 'number' && perimeterOf(cells) !== n(t, 'perimeter')) return false
    if (t.rect && !isRect(cells)) return false
    return true
  },
  Component: ({ value, onChange, target, locked }) => {
    const task = !!target
    const wrap = useRef<HTMLDivElement>(null)
    const [cols, setCols] = useState(10)
    useEffect(() => {
      const el = wrap.current
      if (!el) return
      const ro = new ResizeObserver(() => setCols(el.clientWidth < 560 ? 7 : 10))
      ro.observe(el)
      return () => ro.disconnect()
    }, [])
    const COLS = cols
    useEffect(() => {
      if (value.w > cols) onChange({ ...value, w: cols })
    }, [cols, value, onChange])
    const [msg, setMsg] = useState<string | null>(null)
    const timer = useRef<number | undefined>(undefined)
    const flash = (m: string) => {
      setMsg(m)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setMsg(null), 2600)
    }
    useEffect(() => () => window.clearTimeout(timer.current), [])

    // dikdörtgen modunda denenen dikdörtgenleri kaydet
    useEffect(() => {
      if (value.mode !== 'dikdortgen' || locked) return
      if (value.rects.some(([w, h]) => w === value.w && h === value.h)) return
      const t = window.setTimeout(() => onChange({ ...value, rects: [...value.rects, [value.w, value.h] as [number, number]].slice(-10) }), 450)
      return () => window.clearTimeout(t)
    }, [value, onChange, locked])

    const rectMode = value.mode === 'dikdortgen'
    const cells = rectMode ? rectCells(value.w, value.h) : value.cells
    const area = cells.length
    const E = sharedEdges(cells)
    const per = 4 * area - 2 * E
    const hist = value.hist[String(area)] ?? []
    const aid = (k: keyof V['aids']) => onChange({ ...value, aids: { ...value.aids, [k]: !value.aids[k] } })
    const setMode = (m: Mode) => onChange({ ...value, mode: m, challenge: value.challenge && CHALLENGES[value.challenge].mode === m ? value.challenge : null })
    const setWH = (w: number, h: number) => !locked && onChange({ ...value, w: Math.max(1, Math.min(COLS, w)), h: Math.max(1, Math.min(ROWS, h)) })

    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-3">
          {!task && (
            <div className="flex flex-wrap justify-center gap-1.5">
              <ToolButton active={!rectMode} onClick={() => setMode('serbest')}>🧩 Serbest şekil</ToolButton>
              <ToolButton active={rectMode} onClick={() => setMode('dikdortgen')}>▭ Dikdörtgen</ToolButton>
            </div>
          )}
          <div ref={wrap} className="relative mx-auto w-full max-w-[680px]">
            <Board value={value} onChange={onChange} locked={locked} task={task} flash={flash} cols={cols} />
            {msg && <div className="pointer-events-none absolute inset-x-4 bottom-3 mx-auto w-fit max-w-[90%] rounded-xl bg-ink/90 px-3 py-2 text-center text-sm font-bold text-white shadow-lg">{msg}</div>}
          </div>
          <p className="text-center text-sm font-bold text-ink-soft">
            {rectMode
              ? 'Pembe köşeyi sürükle ya da dikdörtgenin üstünde iki parmakla büyüt, küçült.'
              : 'Boş kareye dokun ya da parmağını gezdir: kare ekle. Kareye dokun: çıkar. Kareyi sürükle: yerini değiştir.'}
          </p>
          {rectMode ? (
            <div className="flex flex-wrap items-end justify-center gap-3">
              <Stepper label="Genişlik" value={value.w} onDec={() => setWH(value.w - 1, value.h)} onInc={() => setWH(value.w + 1, value.h)} disabled={locked} color="#0369a1" />
              <Stepper label="Yükseklik" value={value.h} onDec={() => setWH(value.w, value.h - 1)} onInc={() => setWH(value.w, value.h + 1)} disabled={locked} color="#0369a1" />
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-1.5">
              {!task && <ToolButton active={value.aids.count} onClick={() => aid('count')}>🔢 Kareleri say</ToolButton>}
              {!task && <ToolButton active={value.aids.edges} onClick={() => aid('edges')}>📏 Çevreyi say</ToolButton>}
              {!task && <ToolButton active={value.aids.shared} onClick={() => aid('shared')}>🔗 Ortak kenarlar</ToolButton>}
              <ToolButton disabled={locked || !value.cells.length} onClick={() => onChange({ ...value, cells: [] })}><RotateCcw size={16} />Temizle</ToolButton>
            </div>
          )}
        </div>

        {!task || locked ? (
          <aside className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
              <Tile label="Alan" value={area} unit="br²" color="#d6457a" sub={rectMode ? `${value.w} × ${value.h} = ${area}` : `${area} birim kare`} />
              <Tile label="Çevre" value={per} unit="br" color="#1f2340" sub={rectMode ? `${value.w} + ${value.h} + ${value.w} + ${value.h} = ${per}` : `${per} birim kenar`} />
            </div>
            {!rectMode && area > 0 && value.aids.shared && (
              <div className="self-start rounded-2xl bg-amber-50 p-3 text-center text-sm font-bold text-amber-900 ring-1 ring-amber-200">
                Her kare 4 kenar getirir; her <b>ortak kenar</b> çevreden 2 kenar götürür.
                <div className="mt-1 text-lg font-black tabular-nums">4 × {area} − 2 × {E} = {per}</div>
              </div>
            )}
            {!rectMode && area > 1 && (
              <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
                <p className="text-sm font-black">Alan hep {area} br², çevre ise…</p>
                <PerimeterHistory area={area} list={hist.length ? hist : [per]} />
                <p className="text-xs font-bold text-ink-soft">Kareleri sürükleyip yeniden düzenle: alan değişmez ama çevre {minPer(area)} ile {maxPer(area)} br arasında değişebilir.</p>
              </div>
            )}
            {rectMode && value.rects.length > 0 && (
              <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
                <p className="mb-1.5 text-sm font-black">Denediğin dikdörtgenler</p>
                <table className="w-full text-center text-sm tabular-nums">
                  <thead><tr className="text-xs text-ink-soft"><th className="py-1">Boyut</th><th>Alan</th><th>Çevre</th></tr></thead>
                  <tbody>
                    {value.rects.map(([w, h]) => {
                      const sameA = w * h === area, sameP = 2 * (w + h) === per
                      const cur = w === value.w && h === value.h
                      return (
                        <tr key={`${w}x${h}`} className={cur ? 'bg-paper font-black' : ''}>
                          <td className="py-0.5">{w} × {h}</td>
                          <td className={sameA ? 'font-black text-brand' : ''}>{w * h}</td>
                          <td className={sameP ? 'font-black text-sky-700' : ''}>{2 * (w + h)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <p className="mt-1 text-xs font-bold text-ink-soft"><span className="text-brand">Pembe</span>: şimdikiyle aynı alan · <span className="text-sky-700">mavi</span>: aynı çevre</p>
              </div>
            )}
            {!task && (
              <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
                <span className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">Meydan okuma</span>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(CHALLENGES) as Exclude<Challenge, null>[]).filter((c) => CHALLENGES[c].mode === value.mode).map((c) => (
                    <ToolButton key={c} active={value.challenge === c} onClick={() => onChange({ ...value, challenge: value.challenge === c ? null : c, rects: c === 'rect12' || c === 'per16' ? [] : value.rects })}>{CHALLENGES[c].title}</ToolButton>
                  ))}
                </div>
                <ChallengeCard value={value} area={area} per={per} cols={cols} />
              </div>
            )}
          </aside>
        ) : (
          <aside className="rounded-2xl bg-paper p-4 text-sm font-bold text-ink-soft">
            Kareleri ve kenarları sayarak kontrol et. Alan: kaç birim kare? Çevre: şeklin etrafında kaç birim kenar var?
            {target?.rect ? ' Şeklin bir dikdörtgen olmalı.' : ''}
          </aside>
        )}
      </div>
    )
  },
}

