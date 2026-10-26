import { useEffect, useRef, useState, type PointerEvent as RPE, type ReactNode, type RefObject } from 'react'
import { Grid3x3, RotateCw, Scissors, Square } from 'lucide-react'
import type { ManipulativeConfig } from '../../data/types'
import { Stepper, ToolButton } from '../ui'
import { n, type ToolDef } from '../types'

/**
 * Çarpma Dizilim Tahtası
 *  - Köşe tutamacını sürükle (ya da boş bir çiviye dokun) → satır × sütun dizilimi.
 *    Dizilimin üzerinde iki parmak: yatay açma sütunu, dikey açma satırı değiştirir.
 *  - ✂ tutamaçları (sol ve üst kenarda): bölme çizgisini sürükle → dağılma özelliği canlı denklemle:
 *    6 × 7 = (5 + 1) × 7 = 5 × 7 + 1 × 7 = 35 + 7 = 42.
 *  - 90° döndür: satır ve sütun yer değiştirir, sonuç aynı kalır (değişme özelliği).
 *  - Alan modeli: 2 basamaklı × 1 (ya da 2) basamaklı çarpma; onluk taban blokları ölçekli
 *    (yüzlük turuncu, onluk yeşil, birlik sarı), kısmi çarpımlar ayrı ayrı yazılır.
 *
 * Hedef biçimleri:
 *  { rows, cols }                 → tam bu dizilim (anyOrder: true ise döndürülmüş hâli de kabul)
 *  { product }                    → çarpımı product olan herhangi bir dizilim (notOne: true → 1 × n kabul edilmez)
 *  { …, split: true }             → ayrıca bir bölme çizgisi olmalı; { sr } / { sc } verilirse tam o noktadan
 *  { rows, cols, area: true }     → alan modelinde kur
 */
type V = { rows: number; cols: number; sr: number; sc: number; area: boolean }

const N = 10 // tahta 10 × 10
const S = 56
const OX = 60, OY = 60
const W = OX + N * S + 52
const H = OY + N * S + 44
const COL = { a: '#ef4444', b: '#3b82f6', c: '#f59e0b', d: '#22c55e' }
const clampN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

function partColor(v: V, r: number, c: number) {
  const top = !v.sr || r < v.sr, left = !v.sc || c < v.sc
  if (v.sr && v.sc) return top ? (left ? COL.a : COL.b) : left ? COL.c : COL.d
  if (v.sr) return top ? COL.a : COL.b
  if (v.sc) return left ? COL.a : COL.b
  return COL.a
}

function equation(v: V) {
  const { rows: r, cols: c, sr, sc } = v
  const P = r * c
  if (!r || !c) return { lines: [] as string[], P }
  if (sr && sc) {
    const [r1, r2, c1, c2] = [sr, r - sr, sc, c - sc]
    return { P, lines: [`${r} × ${c} = (${r1} + ${r2}) × (${c1} + ${c2})`, `= ${r1} × ${c1} + ${r1} × ${c2} + ${r2} × ${c1} + ${r2} × ${c2}`, `= ${r1 * c1} + ${r1 * c2} + ${r2 * c1} + ${r2 * c2} = ${P}`] }
  }
  if (sr) return { P, lines: [`${r} × ${c} = (${sr} + ${r - sr}) × ${c}`, `= ${sr} × ${c} + ${r - sr} × ${c}`, `= ${sr * c} + ${(r - sr) * c} = ${P}`] }
  if (sc) return { P, lines: [`${r} × ${c} = ${r} × (${sc} + ${c - sc})`, `= ${r} × ${sc} + ${r} × ${c - sc}`, `= ${r * sc} + ${r * (c - sc)} = ${P}`] }
  return { P, lines: [`${r} × ${c} = ${P}`] }
}

type Gesture =
  | { kind: 'corner'; u: number; ox: number; oy: number }
  | { kind: 'sr' | 'sc' }
  | { kind: 'tap'; x: number; y: number }
  | { kind: 'pinch'; dx0: number; dy0: number; r0: number; c0: number }

function useBoardGestures(svgRef: RefObject<SVGSVGElement | null>, w: number, h: number, handlers: { start: (x: number, y: number) => Gesture | null; move: (g: Gesture, x: number, y: number) => void; pinch: (g: Gesture & { kind: 'pinch' }, dx: number, dy: number) => void; tap: (x: number, y: number) => void; pinchStart: () => { r0: number; c0: number } | null }) {
  const pts = useRef(new Map<number, { x: number; y: number }>())
  const g = useRef<Gesture | null>(null)
  const toSvg = (cx: number, cy: number) => {
    const b = svgRef.current!.getBoundingClientRect()
    return { x: ((cx - b.left) / b.width) * w, y: ((cy - b.top) / b.height) * h }
  }
  const down = (e: RPE<SVGSVGElement>) => {
    if (e.button > 0) return
    const p = toSvg(e.clientX, e.clientY)
    pts.current.set(e.pointerId, p)
    e.currentTarget.setPointerCapture(e.pointerId)
    if (pts.current.size === 2) {
      const ps = handlers.pinchStart()
      if (!ps) return
      const [a, b] = [...pts.current.values()]
      g.current = { kind: 'pinch', dx0: Math.abs(a.x - b.x), dy0: Math.abs(a.y - b.y), ...ps }
      return
    }
    if (pts.current.size === 1) g.current = handlers.start(p.x, p.y)
  }
  const move = (e: RPE<SVGSVGElement>) => {
    if (!pts.current.has(e.pointerId)) return
    const p = toSvg(e.clientX, e.clientY)
    pts.current.set(e.pointerId, p)
    const cur = g.current
    if (!cur) return
    if (cur.kind === 'pinch') {
      if (pts.current.size < 2) return
      const [a, b] = [...pts.current.values()]
      handlers.pinch(cur, Math.abs(a.x - b.x), Math.abs(a.y - b.y))
      return
    }
    if (cur.kind === 'tap') {
      if (Math.hypot(p.x - cur.x, p.y - cur.y) > 10) g.current = null
      return
    }
    handlers.move(cur, p.x, p.y)
  }
  const up = (e: RPE<SVGSVGElement>) => {
    const cur = g.current
    pts.current.delete(e.pointerId)
    if (cur?.kind === 'tap') handlers.tap(cur.x, cur.y)
    if (pts.current.size === 0 || cur?.kind !== 'pinch') g.current = null
  }
  const cancel = (e: RPE<SVGSVGElement>) => { pts.current.delete(e.pointerId); g.current = null }
  return { onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: cancel }
}

function ArrayBoard({ value, onChange, locked, free, rot }: { value: V; onChange: (v: V) => void; locked?: boolean; free: boolean; rot: 'cw' | 'ccw' | null }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const { rows, cols, sr, sc } = value
  const set = (p: Partial<V>) => {
    const nv = { ...value, ...p }
    nv.rows = clampN(nv.rows, 1, N); nv.cols = clampN(nv.cols, 1, N)
    if (nv.sr >= nv.rows) nv.sr = 0
    if (nv.sc >= nv.cols) nv.sc = 0
    if (nv.rows !== value.rows || nv.cols !== value.cols || nv.sr !== value.sr || nv.sc !== value.sc) onChange(nv)
  }
  const cx = OX + cols * S, cy = OY + rows * S
  const srY = OY + (sr || 0) * S, scX = OX + (sc || 0) * S
  const bind = useBoardGestures(svgRef, W, H, {
    start: (x, y) => {
      if (locked) return null
      if (Math.hypot(x - cx, y - cy) < 40) return { kind: 'corner', u: S, ox: OX, oy: OY }
      if (x < OX - 4 && Math.abs(y - (sr ? srY : OY + (rows * S) / 2)) < 30) return { kind: 'sr' }
      if (y < OY - 4 && Math.abs(x - (sc ? scX : OX + (cols * S) / 2)) < 30) return { kind: 'sc' }
      return { kind: 'tap', x, y }
    },
    move: (g, x, y) => {
      if (g.kind === 'corner') set({ cols: Math.round((x - OX) / S), rows: Math.round((y - OY) / S) })
      else if (g.kind === 'sr') set({ sr: clampN(Math.round((y - OY) / S), 0, rows) })
      else if (g.kind === 'sc') set({ sc: clampN(Math.round((x - OX) / S), 0, cols) })
    },
    pinchStart: () => (locked ? null : { r0: rows, c0: cols }),
    pinch: (g, dx, dy) => set({ cols: g.c0 + Math.round((dx - g.dx0) / S), rows: g.r0 + Math.round((dy - g.dy0) / S) }),
    tap: (x, y) => {
      if (x < OX - 4 && y > OY && y < OY + rows * S) return set({ sr: clampN(Math.round((y - OY) / S), 0, rows) })
      if (y < OY - 4 && x > OX && x < OX + cols * S) return set({ sc: clampN(Math.round((x - OX) / S), 0, cols) })
      const c = Math.floor((x - OX) / S), r = Math.floor((y - OY) / S)
      if (c >= 0 && c < N && r >= 0 && r < N) set({ rows: r + 1, cols: c + 1 })
    },
  })

  const rowParts = sr ? [[0, sr], [sr, rows]] : [[0, rows]]
  const colParts = sc ? [[0, sc], [sc, cols]] : [[0, cols]]
  const rotStyle = rot ? { transformBox: 'view-box' as const, transformOrigin: `${OX}px ${OY}px`, transition: 'transform 450ms cubic-bezier(.4,0,.2,1)', transform: rot === 'cw' ? `translate(${rows * S}px, 0px) rotate(90deg)` : `translate(0px, ${cols * S}px) rotate(-90deg)` } : undefined

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="block w-full select-none" style={{ touchAction: 'none' }} role="img" aria-label={`${rows} satır, ${cols} sütun dizilim`} {...bind}>
      <defs>
        {Object.entries(COL).map(([k, c]) => (
          <radialGradient key={k} id={`dz-${k}`} cx="35%" cy="30%" r="80%"><stop offset="0%" stopColor="#fff" stopOpacity={0.7} /><stop offset="35%" stopColor={c} /><stop offset="100%" stopColor={c} stopOpacity={0.85} /></radialGradient>
        ))}
        <filter id="dz-sh" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1f2340" floodOpacity="0.3" /></filter>
      </defs>
      <rect x={OX - 6} y={OY - 6} width={N * S + 12} height={N * S + 12} rx={16} fill="#f8f6f2" stroke="#e7e3dc" strokeWidth={2} />
      {/* çiviler */}
      {Array.from({ length: N * N }).map((_, i) => {
        const r = Math.floor(i / N), c = i % N
        return <circle key={i} cx={OX + c * S + S / 2} cy={OY + r * S + S / 2} r={4} fill="#cfcbd8" />
      })}
      <g style={rotStyle}>
        <rect x={OX} y={OY} width={cols * S} height={rows * S} rx={10} fill="#fff" stroke="#1f2340" strokeOpacity={0.15} strokeWidth={2} />
        {Array.from({ length: rows * cols }).map((_, i) => {
          const r = Math.floor(i / cols), c = i % cols
          const col = partColor(value, r, c)
          const key = Object.entries(COL).find(([, v]) => v === col)![0]
          return <circle key={i} cx={OX + c * S + S / 2} cy={OY + r * S + S / 2} r={S * 0.36} fill={`url(#dz-${key})`} stroke={col} strokeWidth={1.5} />
        })}
        {free && !rot && rowParts.map(([r0, r1]) => colParts.map(([c0, c1]) => {
          const pr = r1 - r0, pc = c1 - c0
          if (!(sr || sc) || pr < 2 || pc < 3) return null
          const x = OX + ((c0 + c1) / 2) * S, y = OY + ((r0 + r1) / 2) * S
          const t = `${pr} × ${pc} = ${pr * pc}`
          const wpx = t.length * 9.4 + 14
          return (
            <g key={`${r0}-${c0}`} pointerEvents="none">
              <rect x={x - wpx / 2} y={y - 16} width={wpx} height={32} rx={10} fill="#1f2340" opacity={0.88} />
              <text x={x} y={y + 6} textAnchor="middle" fontSize={17} fontWeight={900} fill="#fff">{t}</text>
            </g>
          )
        }))}
      </g>
      {!rot && (
        <g>
          {/* bölme çizgileri */}
          {sr > 0 && <line x1={OX - 30} x2={OX + cols * S + 10} y1={srY} y2={srY} stroke="#1f2340" strokeWidth={3} strokeDasharray="9 6" />}
          {sc > 0 && <line y1={OY - 30} y2={OY + rows * S + 10} x1={scX} x2={scX} stroke="#1f2340" strokeWidth={3} strokeDasharray="9 6" />}
          {/* satır/sütun sayıları */}
          {rowParts.map(([a, b]) => b - a > 0 && <text key={`r${a}`} x={OX + cols * S + 26} y={OY + ((a + b) / 2) * S + 8} textAnchor="middle" fontSize={22} fontWeight={900} fill={sr ? (a === 0 ? COL.a : sc ? COL.c : COL.b) : '#1f2340'}>{b - a}</text>)}
          {colParts.map(([a, b]) => b - a > 0 && <text key={`c${a}`} x={OX + ((a + b) / 2) * S} y={OY + rows * S + 32} textAnchor="middle" fontSize={22} fontWeight={900} fill={sc && !sr ? (a === 0 ? COL.a : COL.b) : '#1f2340'}>{b - a}</text>)}
          {!locked && (
            <>
              {/* ✂ tutamaçlar */}
              <g transform={`translate(${OX - 32} ${sr ? srY : OY + (rows * S) / 2})`} style={{ cursor: 'ns-resize' }}>
                <rect x={-22} y={-18} width={44} height={36} rx={12} fill={sr ? '#1f2340' : '#fff'} stroke="#1f2340" strokeWidth={2} strokeDasharray={sr ? undefined : '4 3'} filter="url(#dz-sh)" />
                <text x={0} y={7} textAnchor="middle" fontSize={20} fill={sr ? '#fff' : '#1f2340'}>✂</text>
              </g>
              <g transform={`translate(${sc ? scX : OX + (cols * S) / 2} ${OY - 32})`} style={{ cursor: 'ew-resize' }}>
                <rect x={-18} y={-22} width={36} height={44} rx={12} fill={sc ? '#1f2340' : '#fff'} stroke="#1f2340" strokeWidth={2} strokeDasharray={sc ? undefined : '4 3'} filter="url(#dz-sh)" />
                <text x={0} y={7} textAnchor="middle" fontSize={20} fill={sc ? '#fff' : '#1f2340'} transform="rotate(90)">✂</text>
              </g>
              {/* köşe tutamacı */}
              <g transform={`translate(${cx} ${cy})`} style={{ cursor: 'nwse-resize' }} filter="url(#dz-sh)">
                <circle r={22} fill="#d6457a" stroke="#fff" strokeWidth={4} />
                <path d="M-8 -2 L-8 -8 L-2 -8 M8 2 L8 8 L2 8 M-7 -7 L7 7" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </>
          )}
        </g>
      )}
    </svg>
  )
}

// ── Alan modeli ─────────────────────────────────────────────────────────────
const AW = 640
function AreaBoard({ value, onChange, locked, free }: { value: V; onChange: (v: V) => void; locked?: boolean; free: boolean }) {
  const { rows, cols } = value
  const u = Math.min((AW - 90) / cols, 34, 340 / rows)
  const ox = 46, oy = 40
  const h = oy + rows * u + 30
  const rT = rows >= 10 ? 10 : 0, rO = rows - rT
  const cT = Math.floor(cols / 10) * 10, cO = cols - cT
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ u: number } | null>(null)
  const toSvg = (e: RPE<SVGSVGElement>) => {
    const b = svgRef.current!.getBoundingClientRect()
    return { x: ((e.clientX - b.left) / b.width) * AW, y: ((e.clientY - b.top) / b.height) * (b.height / b.width) * AW }
  }
  const cx = ox + cols * u, cy = oy + rows * u
  const regions: { x: number; y: number; w: number; h: number; kind: 'flat' | 'vrod' | 'hrod' | 'unit'; pr: number; pc: number }[] = []
  if (rT && cT) regions.push({ x: 0, y: 0, w: cT, h: rT, kind: 'flat', pr: rT, pc: cT })
  if (rT && cO) regions.push({ x: cT, y: 0, w: cO, h: rT, kind: 'vrod', pr: rT, pc: cO })
  if (rO && cT) regions.push({ x: 0, y: rT, w: cT, h: rO, kind: 'hrod', pr: rO, pc: cT })
  if (rO && cO) regions.push({ x: cT, y: rT, w: cO, h: rO, kind: 'unit', pr: rO, pc: cO })
  const fill = { flat: '#fdba74', vrod: '#86efac', hrod: '#86efac', unit: '#fde047' }
  const line = { flat: '#c2410c', vrod: '#15803d', hrod: '#15803d', unit: '#a16207' }

  const pieces: ReactNode[] = []
  regions.forEach((g, gi) => {
    const X = (c: number) => ox + c * u, Y = (r: number) => oy + r * u
    if (g.kind === 'flat') {
      for (let k = 0; k < g.w / 10; k++) pieces.push(<rect key={`f${gi}${k}`} x={X(g.x + k * 10) + 1} y={Y(g.y) + 1} width={10 * u - 2} height={10 * u - 2} rx={2} fill={fill.flat} stroke={line.flat} strokeWidth={1.5} />)
    } else if (g.kind === 'vrod') {
      for (let k = 0; k < g.w; k++) pieces.push(<rect key={`v${gi}${k}`} x={X(g.x + k) + 1} y={Y(g.y) + 1} width={u - 2} height={10 * u - 2} rx={2} fill={fill.vrod} stroke={line.vrod} strokeWidth={1.5} />)
    } else if (g.kind === 'hrod') {
      for (let r = 0; r < g.h; r++) for (let k = 0; k < g.w / 10; k++) pieces.push(<rect key={`h${gi}${r}-${k}`} x={X(g.x + k * 10) + 1} y={Y(g.y + r) + 1} width={10 * u - 2} height={u - 2} rx={2} fill={fill.hrod} stroke={line.hrod} strokeWidth={1.5} />)
    } else {
      for (let r = 0; r < g.h; r++) for (let k = 0; k < g.w; k++) pieces.push(<rect key={`u${gi}${r}-${k}`} x={X(g.x + k) + 1} y={Y(g.y + r) + 1} width={u - 2} height={u - 2} rx={1.5} fill={fill.unit} stroke={line.unit} strokeWidth={1.2} />)
    }
  })
  const H2 = h
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${AW} ${H2}`}
      className="block w-full select-none"
      style={{ touchAction: 'none' }}
      role="img"
      aria-label={`Alan modeli ${rows} × ${cols}`}
      onPointerDown={(e) => {
        if (locked) return
        const p = toSvg(e)
        if (Math.hypot(p.x - cx, p.y - cy) < 40) { drag.current = { u }; e.currentTarget.setPointerCapture(e.pointerId) }
      }}
      onPointerMove={(e) => {
        if (!drag.current) return
        const p = toSvg(e)
        const nc = clampN(Math.round((p.x - ox) / drag.current.u), 10, 99), nr = clampN(Math.round((p.y - oy) / drag.current.u), 1, 19)
        if (nc !== cols || nr !== rows) onChange({ ...value, cols: nc, rows: nr })
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      <g>
        {Array.from({ length: Math.floor(cols / 10) }).map((_, k) => <text key={k} x={ox + (k * 10 + 5) * u} y={oy - 12} textAnchor="middle" fontSize={18} fontWeight={900} fill="#15803d">10</text>)}
        {cO > 0 && <text x={ox + (cT + cO / 2) * u} y={oy - 12} textAnchor="middle" fontSize={18} fontWeight={900} fill="#a16207">{cO}</text>}
        {rT > 0 && <text x={ox - 12} y={oy + 5 * u + 5} textAnchor="end" fontSize={18} fontWeight={900} fill="#c2410c">10</text>}
        {rO > 0 && <text x={ox - 12} y={oy + (rT + rO / 2) * u + 5} textAnchor="end" fontSize={18} fontWeight={900} fill="#1f2340">{rO}</text>}
      </g>
      {pieces}
      {cT > 0 && cO > 0 && <line x1={ox + cT * u} x2={ox + cT * u} y1={oy - 6} y2={oy + rows * u + 6} stroke="#1f2340" strokeWidth={2.5} strokeDasharray="7 5" />}
      {rT > 0 && rO > 0 && <line y1={oy + rT * u} y2={oy + rT * u} x1={ox - 6} x2={ox + cols * u + 6} stroke="#1f2340" strokeWidth={2.5} strokeDasharray="7 5" />}
      <defs>
        <pattern id="dz-grid" width={u} height={u} patternUnits="userSpaceOnUse" x={ox} y={oy}><path d={`M ${u} 0 L 0 0 0 ${u}`} fill="none" stroke="#1f2340" strokeOpacity={0.14} strokeWidth={1} /></pattern>
      </defs>
      {u >= 7 && regions.filter((g) => g.kind !== 'unit').map((g, i) => <rect key={`g${i}`} x={ox + g.x * u + 1} y={oy + g.y * u + 1} width={g.w * u - 2} height={g.h * u - 2} fill="url(#dz-grid)" pointerEvents="none" />)}
      {free && regions.map((g, i) => {
        const x = ox + (g.x + g.w / 2) * u, y = oy + (g.y + g.h / 2) * u
        const t = String(g.pr * g.pc)
        const tw = t.length * 10 + 14
        if (g.w * u < tw + 4 || g.h * u < 24) return null
        return (
          <g key={i} pointerEvents="none">
            <rect x={x - tw / 2} y={y - 12} width={tw} height={24} rx={8} fill="#fff" opacity={0.92} />
            <text x={x} y={y + 6} textAnchor="middle" fontSize={16} fontWeight={900} fill={line[g.kind]}>{t}</text>
          </g>
        )
      })}
      {!locked && (
        <g transform={`translate(${cx} ${cy})`} style={{ cursor: 'nwse-resize' }}>
          <circle r={18} fill="#d6457a" stroke="#fff" strokeWidth={4} />
          <path d="M-6 -1 L-6 -6 L-1 -6 M6 1 L6 6 L1 6 M-5 -5 L5 5" stroke="#fff" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </g>
      )}
    </svg>
  )
}

function areaEquation(v: V) {
  const { rows, cols } = v
  const rT = rows >= 10 ? 10 : 0, rO = rows - rT
  const cT = Math.floor(cols / 10) * 10, cO = cols - cT
  const P = rows * cols
  const rp = [rT, rO].filter(Boolean), cp = [cT, cO].filter(Boolean)
  const grp = (a: number[], other: boolean) => (a.length > 1 ? `(${a.join(' + ')})` : other ? `${a[0]}` : `${a[0]}`)
  const terms = rp.flatMap((a) => cp.map((b) => [a, b]))
  if (terms.length === 1) return [`${rows} × ${cols} = ${P}`, cT && !cO ? `${rows} × ${cT / 10} onluk = ${(rows * cT) / 10} onluk` : '']
  return [`${rows} × ${cols} = ${grp(rp, true)} × ${grp(cp, true)}`, `= ${terms.map(([a, b]) => `${a} × ${b}`).join(' + ')}`, `= ${terms.map(([a, b]) => a * b).join(' + ')} = ${P}`]
}

function Component({ value, onChange, target, locked }: { value: V; onChange: (v: V) => void; config: ManipulativeConfig; target?: Record<string, unknown>; locked?: boolean }) {
  const free = !target
  const [rot, setRot] = useState<'cw' | 'ccw' | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const rotate = () => {
    if (locked || rot) return
    const dir = value.sc && !value.sr ? 'cw' : 'ccw'
    setRot(dir)
    timer.current = window.setTimeout(() => {
      const { rows, cols, sr, sc } = value
      const nv: V = dir === 'cw' ? { ...value, rows: cols, cols: rows, sr: sc, sc: 0 } : { ...value, rows: cols, cols: rows, sc: sr, sr: sc ? cols - sc : 0 }
      setNote(`${rows} × ${cols} = ${cols} × ${rows} = ${rows * cols}: döndürünce nokta sayısı değişmedi.`)
      setRot(null)
      onChange(nv)
    }, 470)
  }
  const setArea = (area: boolean) => {
    setNote(null)
    onChange(area ? { rows: 4, cols: 23, sr: 0, sc: 0, area } : { rows: Math.min(value.rows, N), cols: Math.min(N, value.cols % 10 || 7), sr: 0, sc: 0, area })
  }
  const eq = value.area ? { lines: areaEquation(value), P: value.rows * value.cols } : equation(value)
  const upd = (p: Partial<V>) => { if (locked) return; setNote(null); onChange({ ...value, ...p }) }

  return (
    <div className="flex flex-col items-center gap-3">
      {free && (
        <div className="flex gap-1.5 rounded-2xl bg-paper p-1 ring-1 ring-line">
          <ToolButton active={!value.area} onClick={() => setArea(false)}><Grid3x3 size={16} />Dizilim</ToolButton>
          <ToolButton active={value.area} onClick={() => setArea(true)}><Square size={16} />Alan modeli</ToolButton>
        </div>
      )}
      <div className="w-full max-w-[680px]">
        {value.area ? <AreaBoard value={value} onChange={(v) => upd(v)} locked={locked} free={free || !!locked} /> : <ArrayBoard value={value} onChange={(v) => upd(v)} locked={locked} free={free || !!locked} rot={rot} />}
      </div>
      <p className="text-center text-sm font-bold text-ink-soft">
        {value.area ? 'Pembe köşeyi sürükle ya da aşağıdan kenarları ayarla. Kesikli çizgi sayıyı onluk ve birliklerine ayırır.' : 'Pembe köşeyi sürükle ya da bir çiviye dokun. ✂ tutamacını sürükleyerek dizilimi böl. İki parmakla açıp kapatabilirsin.'}
      </p>
      <div className="flex flex-wrap items-end justify-center gap-2">
        <Stepper label="Satır" value={value.rows} disabled={locked} onDec={() => upd({ rows: Math.max(1, value.rows - 1), sr: value.sr >= value.rows - 1 ? 0 : value.sr })} onInc={() => upd({ rows: Math.min(value.area ? 19 : N, value.rows + 1) })} />
        <Stepper label="Sütun" value={value.cols} disabled={locked} color="#2563eb" onDec={() => upd({ cols: Math.max(value.area ? 10 : 1, value.cols - 1), sc: value.sc >= value.cols - 1 ? 0 : value.sc })} onInc={() => upd({ cols: Math.min(value.area ? 99 : N, value.cols + 1) })} />
        {value.area && (
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">Onluk</span>
            <div className="flex gap-1">
              <ToolButton disabled={locked || value.cols < 20} onClick={() => upd({ cols: value.cols - 10 })}>−10</ToolButton>
              <ToolButton disabled={locked || value.cols > 89} onClick={() => upd({ cols: value.cols + 10 })}>+10</ToolButton>
            </div>
          </div>
        )}
        {!value.area && <ToolButton disabled={locked || !!rot} onClick={rotate}><RotateCw size={16} />90° döndür</ToolButton>}
        {!value.area && (value.sr > 0 || value.sc > 0) && <ToolButton disabled={locked} onClick={() => upd({ sr: 0, sc: 0 })}><Scissors size={16} />Bölmeyi kaldır</ToolButton>}
      </div>
      {note && free && <div className="rounded-2xl bg-brand-soft px-4 py-2 text-center text-base font-extrabold text-brand-ink">{note}</div>}
      {(free || locked) && eq.lines.length > 0 && (
        <div className="w-full max-w-xl rounded-2xl bg-ink px-4 py-3 text-center text-white tabular-nums">
          {eq.lines.filter(Boolean).map((l, i) => <div key={i} className={i === 0 ? 'text-xl font-black' : 'text-base font-extrabold text-white/85'}>{l}</div>)}
          {!value.area && !value.sr && !value.sc && <div className="mt-1 text-sm font-bold text-white/65">{value.rows} satır, her satırda {value.cols} · ✂ ile böl ya da döndür</div>}
        </div>
      )}
    </div>
  )
}

export const dizilim: ToolDef<V> = {
  id: 'dizilim',
  defaultConfig: {},
  initial: (_c, target) => {
    if (target?.area) return { rows: 3, cols: 12, sr: 0, sc: 0, area: true }
    return { rows: target ? 1 : 4, cols: target ? 1 : 6, sr: 0, sc: 0, area: false }
  },
  check: (v, t) => {
    if (typeof t.product === 'number') {
      if (v.rows * v.cols !== n(t, 'product')) return false
      if (t.notOne && (v.rows === 1 || v.cols === 1)) return false
    }
    if (typeof t.rows === 'number' && typeof t.cols === 'number') {
      const same = v.rows === n(t, 'rows') && v.cols === n(t, 'cols')
      const swapped = v.rows === n(t, 'cols') && v.cols === n(t, 'rows')
      if (!(same || (t.anyOrder && swapped))) return false
    }
    if (t.split && !v.sr && !v.sc) return false
    if (typeof t.sr === 'number' && v.sr !== n(t, 'sr')) return false
    if (typeof t.sc === 'number' && v.sc !== n(t, 'sc')) return false
    if (t.area && !v.area) return false
    return true
  },
  Component,
}
