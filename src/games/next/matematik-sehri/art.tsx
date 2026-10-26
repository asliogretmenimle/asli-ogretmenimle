import type { ReactElement } from 'react'
import type { Art, Cell } from './city'

/** Piksel kutusu */
export interface Box {
  x: number
  y: number
  w: number
  h: number
}

const hash = (a: number, b: number) => {
  let h = (a * 374761393 + b * 668265263) ^ 0x5bd1e995
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) % 1000
}

export function Tree({ cx, cy, u, s = 1, tone = 0 }: { cx: number; cy: number; u: number; s?: number; tone?: number }) {
  const crowns = ['#2e8b47', '#2a7f53', '#3b9a3f']
  const hi = ['#5cbf63', '#4fae72', '#79c652']
  return (
    <g>
      <ellipse cx={cx + u * 0.09 * s} cy={cy + u * 0.11 * s} rx={u * 0.33 * s} ry={u * 0.3 * s} fill="rgba(20,40,20,.18)" />
      <circle cx={cx} cy={cy} r={u * 0.3 * s} fill={crowns[tone % 3]} />
      <circle cx={cx - u * 0.08 * s} cy={cy - u * 0.08 * s} r={u * 0.15 * s} fill={hi[tone % 3]} />
    </g>
  )
}

/** Çit: her metrede bir direk — çevre uzunluğu sayılabilir hâle gelir */
export function Fence({ b, u, sides = [true, true, true, true], color = '#8b5a2b' }: { b: Box; u: number; sides?: boolean[]; color?: string }) {
  const w = Math.round(b.w / u), h = Math.round(b.h / u)
  const sw = Math.max(3, u * 0.11)
  const pr = Math.max(3.4, u * 0.12)
  // 0 alt, 1 sağ, 2 üst, 3 sol
  const segs: [number, number, number, number, number][] = [
    [b.x, b.y + b.h, b.x + b.w, b.y + b.h, w],
    [b.x + b.w, b.y + b.h, b.x + b.w, b.y, h],
    [b.x + b.w, b.y, b.x, b.y, w],
    [b.x, b.y, b.x, b.y + b.h, h],
  ]
  return (
    <g pointerEvents="none">
      {segs.map(([x1, y1, x2, y2, n], i) =>
        sides[i] ? (
          <g key={i} className="animate-fade-up">
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={sw} strokeLinecap="round" />
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d9a066" strokeWidth={sw * 0.35} strokeLinecap="round" transform={`translate(0 ${-sw * 0.25})`} />
            {Array.from({ length: n + 1 }, (_, k) => (
              <circle key={k} cx={x1 + ((x2 - x1) * k) / n} cy={y1 + ((y2 - y1) * k) / n} r={pr} fill="#6b3f1d" stroke="#f5deb3" strokeWidth={pr * 0.35} />
            ))}
          </g>
        ) : null,
      )}
    </g>
  )
}

function Park({ b, u }: { b: Box; u: number }) {
  const w = Math.round(b.w / u), h = Math.round(b.h / u)
  const hBand = h >= 2 && w >= 3
  const vBand = w >= 2 && h >= 3
  const midY = b.y + b.h / 2, midX = b.x + b.w / 2
  const trees: [number, number, number][] = []
  for (let i = 0; i < w; i++)
    for (let j = 0; j < h; j++) {
      const cx = b.x + (i + 0.5) * u, cy = b.y + (j + 0.5) * u
      if (hBand && Math.abs(cy - midY) < u * 0.45) continue
      if (vBand && Math.abs(cx - midX) < u * 0.45) continue
      const k = hash(i + w * 7, j + h * 13)
      if (k % 5 < 2 || (w * h <= 2 && i === 0 && j === 0)) trees.push([cx, cy, k])
    }
  return (
    <g>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={u * 0.22} fill="#5fae4a" />
      <rect x={b.x + u * 0.06} y={b.y + u * 0.06} width={b.w - u * 0.12} height={b.h - u * 0.12} rx={u * 0.18} fill="#7fcb62" />
      {hBand && <rect x={b.x + u * 0.12} y={midY - u * 0.13} width={b.w - u * 0.24} height={u * 0.26} rx={u * 0.13} fill="#f0dcae" />}
      {vBand && <rect x={midX - u * 0.13} y={b.y + u * 0.12} width={u * 0.26} height={b.h - u * 0.24} rx={u * 0.13} fill="#f0dcae" />}
      {hBand && vBand && (
        <g>
          <circle cx={midX} cy={midY} r={u * 0.42} fill="#ead3a0" />
          <circle cx={midX} cy={midY} r={u * 0.28} fill="#7dd3fc" stroke="#38bdf8" strokeWidth={u * 0.04} />
          <circle cx={midX - u * 0.06} cy={midY - u * 0.06} r={u * 0.07} fill="#e0f2fe" />
        </g>
      )}
      {trees.map(([cx, cy, k], i) => <Tree key={i} cx={cx} cy={cy} u={u} s={0.85 + (k % 3) * 0.08} tone={k} />)}
    </g>
  )
}

function Play({ b, u }: { b: Box; u: number }) {
  const w = Math.round(b.w / u), h = Math.round(b.h / u)
  const items: ReactElement[] = []
  const mats = ['#f87171', '#60a5fa', '#facc15', '#a78bfa', '#34d399']
  for (let i = 0; i < w; i++)
    for (let j = 0; j < h; j++) {
      const cx = b.x + (i + 0.5) * u, cy = b.y + (j + 0.5) * u
      const k = hash(i * 3 + 1, j * 5 + 2)
      if (k % 4 === 0) items.push(<circle key={`m${i}${j}`} cx={cx} cy={cy} r={u * 0.3} fill={mats[k % 5]} opacity={0.9} />)
      else if (k % 4 === 1 && i < w - 1) items.push(
        <g key={`s${i}${j}`}>
          <rect x={cx - u * 0.12} y={cy - u * 0.3} width={u * 0.24} height={u * 0.6} rx={u * 0.08} fill="#f97316" />
          <rect x={cx - u * 0.06} y={cy - u * 0.24} width={u * 0.12} height={u * 0.48} rx={u * 0.05} fill="#fdba74" />
        </g>,
      )
      else if (k % 4 === 2) items.push(<Tree key={`t${i}${j}`} cx={cx} cy={cy} u={u} s={0.8} tone={k} />)
    }
  return (
    <g>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={u * 0.22} fill="#5fae4a" />
      <rect x={b.x + u * 0.12} y={b.y + u * 0.12} width={b.w - u * 0.24} height={b.h - u * 0.24} rx={u * 0.16} fill="#f6dca0" />
      {items}
    </g>
  )
}

function Building({ b, u, label }: { b: Box; u: number; label?: string }) {
  const w = Math.round(b.w / u), h = Math.round(b.h / u)
  const units: ReactElement[] = []
  for (let i = 0; i < w; i++)
    for (let j = 0; j < h; j++) {
      const k = hash(i + 11, j + 17)
      const cx = b.x + (i + 0.5) * u, cy = b.y + (j + 0.5) * u
      if (k % 6 === 0) units.push(<rect key={`${i}-${j}`} x={cx - u * 0.18} y={cy - u * 0.14} width={u * 0.36} height={u * 0.28} rx={u * 0.05} fill="#94a3b8" stroke="#64748b" strokeWidth={1} />)
      else if (k % 6 === 1) units.push(<rect key={`${i}-${j}`} x={cx - u * 0.3} y={cy - u * 0.2} width={u * 0.6} height={u * 0.4} rx={u * 0.04} fill="#1e3a8a" opacity={0.85} />)
    }
  return (
    <g>
      <rect x={b.x + u * 0.14} y={b.y + u * 0.16} width={b.w} height={b.h} rx={u * 0.12} fill="rgba(15,23,42,.22)" />
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={u * 0.12} fill="#cbd5e1" stroke="#7c8aa3" strokeWidth={Math.max(1.5, u * 0.05)} />
      <rect x={b.x + u * 0.16} y={b.y + u * 0.16} width={Math.max(0, b.w - u * 0.32)} height={Math.max(0, b.h - u * 0.32)} rx={u * 0.08} fill="#e2e8f0" />
      {units}
      {label && b.w > 70 && b.h > 34 && (
        <g>
          <rect x={b.x + b.w / 2 - label.length * Math.min(16, u * 0.45) * 0.33 - 8} y={b.y + b.h / 2 - Math.min(16, u * 0.45) * 0.8} width={label.length * Math.min(16, u * 0.45) * 0.66 + 16} height={Math.min(16, u * 0.45) * 1.6} rx={8} fill="#fff" opacity={0.92} />
          <text x={b.x + b.w / 2} y={b.y + b.h / 2 + Math.min(16, u * 0.45) * 0.35} textAnchor="middle" fontSize={Math.min(16, u * 0.45)} fontWeight={900} fill="#334155">{label}</text>
        </g>
      )}
    </g>
  )
}

/** Hücre maskeli çiçek bahçesi (alan sayma görevi) */
export function Garden({ cells, u, X, Y, grid }: { cells: Cell[]; u: number; X: (x: number) => number; Y: (y: number) => number; grid: boolean }) {
  const flowers = ['#f43f5e', '#f59e0b', '#a855f7', '#ec4899', '#fde047']
  return (
    <g>
      {cells.map(([x, y]) => (
        <rect key={`b${x},${y}`} x={X(x) - 0.5} y={Y(y + 1) - 0.5} width={u + 1} height={u + 1} fill="#a86b3c" />
      ))}
      {cells.map(([x, y]) => {
        const k = hash(x, y)
        return (
          <g key={`f${x},${y}`}>
            {[0, 1, 2].map((t) => {
              const fx = X(x) + u * (0.25 + ((k >> t) % 3) * 0.25)
              const fy = Y(y + 1) + u * (0.25 + t * 0.25)
              return (
                <g key={t}>
                  <circle cx={fx} cy={fy} r={u * 0.12} fill={flowers[(k + t) % 5]} />
                  <circle cx={fx} cy={fy} r={u * 0.045} fill="#fff7cc" />
                </g>
              )
            })}
          </g>
        )
      })}
      {grid && cells.map(([x, y]) => <rect key={`g${x},${y}`} x={X(x)} y={Y(y + 1)} width={u} height={u} fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={1.5} />)}
    </g>
  )
}

export function ArtFor({ art, b, u, label }: { art: Art; b: Box; u: number; label?: string }) {
  if (art === 'oyun') return <Play b={b} u={u} />
  if (art === 'bina') return <Building b={b} u={u} label={label} />
  return <Park b={b} u={u} />
}

export function School({ b, u }: { b: Box; u: number }) {
  const roofH = b.h * 0.55
  return (
    <g>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={u * 0.15} fill="#e7e5e4" />
      {/* bahçe ve basket sahası */}
      <rect x={b.x + u * 0.25} y={b.y + roofH + u * 0.18} width={b.w - u * 0.5} height={b.h - roofH - u * 0.4} rx={u * 0.08} fill="#f59e0b" />
      <rect x={b.x + u * 0.35} y={b.y + roofH + u * 0.28} width={b.w - u * 0.7} height={b.h - roofH - u * 0.6} fill="none" stroke="#fff" strokeWidth={1.5} />
      <line x1={b.x + b.w / 2} x2={b.x + b.w / 2} y1={b.y + roofH + u * 0.28} y2={b.y + b.h - u * 0.32} stroke="#fff" strokeWidth={1.5} />
      <circle cx={b.x + b.w / 2} cy={b.y + roofH + (b.h - roofH) / 2 - u * 0.02} r={u * 0.22} fill="none" stroke="#fff" strokeWidth={1.5} />
      {/* bina */}
      <rect x={b.x + u * 0.14} y={b.y + u * 0.2} width={b.w} height={roofH} fill="rgba(0,0,0,.18)" rx={u * 0.08} />
      <rect x={b.x} y={b.y} width={b.w} height={roofH} rx={u * 0.1} fill="#dc4c3a" />
      <rect x={b.x} y={b.y} width={b.w} height={roofH / 2} rx={u * 0.1} fill="#ef6a55" />
      <line x1={b.x + u * 0.1} x2={b.x + b.w - u * 0.1} y1={b.y + roofH / 2} y2={b.y + roofH / 2} stroke="#b4382a" strokeWidth={Math.max(1.5, u * 0.06)} />
      <text x={b.x + b.w / 2} y={b.y + roofH / 2 + Math.min(15, u * 0.42) * 0.36} textAnchor="middle" fontSize={Math.min(15, u * 0.42)} fontWeight={900} fill="#fff" letterSpacing={1}>OKUL</text>
      {/* bayrak */}
      <line x1={b.x + b.w - u * 0.3} x2={b.x + b.w - u * 0.3} y1={b.y + roofH + u * 0.05} y2={b.y + roofH - u * 1.1} stroke="#475569" strokeWidth={2} />
      <rect x={b.x + b.w - u * 0.3} y={b.y + roofH - u * 1.1} width={u * 0.55} height={u * 0.36} fill="#e30a17" />
      <circle cx={b.x + b.w - u * 0.3 + u * 0.21} cy={b.y + roofH - u * 0.92} r={u * 0.1} fill="#fff" />
      <circle cx={b.x + b.w - u * 0.3 + u * 0.24} cy={b.y + roofH - u * 0.92} r={u * 0.08} fill="#e30a17" />
    </g>
  )
}

export function Houses({ b, u }: { b: Box; u: number }) {
  const colors: [string, string][] = [['#fb923c', '#ea580c'], ['#38bdf8', '#0284c7'], ['#c084fc', '#9333ea'], ['#facc15', '#ca8a04']]
  const s = b.w / 2
  return (
    <g>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={u * 0.15} fill="#9bd282" />
      {[0, 1, 2, 3].map((i) => {
        const hx = b.x + (i % 2) * s + s * 0.15, hy = b.y + Math.floor(i / 2) * s + s * 0.18
        const hw = s * 0.7, hh = s * 0.6
        const [c1, c2] = colors[i]
        return (
          <g key={i}>
            <rect x={hx + u * 0.12} y={hy + u * 0.14} width={hw} height={hh} rx={u * 0.06} fill="rgba(0,0,0,.18)" />
            <rect x={hx} y={hy} width={hw} height={hh / 2} rx={u * 0.06} fill={c1} />
            <rect x={hx} y={hy + hh / 2} width={hw} height={hh / 2} rx={u * 0.06} fill={c2} />
            <line x1={hx + u * 0.05} x2={hx + hw - u * 0.05} y1={hy + hh / 2} y2={hy + hh / 2} stroke="rgba(0,0,0,.25)" strokeWidth={1.5} />
            <rect x={hx + hw * 0.7} y={hy + hh * 0.08} width={hw * 0.12} height={hh * 0.22} fill="#78350f" />
            <Tree cx={hx + hw + s * 0.06} cy={hy + hh + s * 0.08} u={u} s={0.55} tone={i} />
          </g>
        )
      })}
    </g>
  )
}

export function Lake({ b, u }: { b: Box; u: number }) {
  const { x, y, w, h } = b
  const d = `M${x + w * 0.2} ${y + h * 0.08} C${x + w * 0.55} ${y - h * 0.04} ${x + w * 1.02} ${y + h * 0.1} ${x + w * 0.95} ${y + h * 0.45} C${x + w * 0.9} ${y + h * 0.8} ${x + w * 0.75} ${y + h * 1.0} ${x + w * 0.42} ${y + h * 0.95} C${x + w * 0.08} ${y + h * 0.92} ${x - w * 0.02} ${y + h * 0.65} ${x + w * 0.05} ${y + h * 0.38} C${x + w * 0.08} ${y + h * 0.2} ${x + w * 0.12} ${y + h * 0.12} ${x + w * 0.2} ${y + h * 0.08}Z`
  return (
    <g>
      <path d={d} fill="#eadbb0" transform={`translate(0 ${u * 0.06})`} />
      <path d={d} fill="url(#ms-lake)" stroke="#0ea5e9" strokeWidth={Math.max(1.5, u * 0.05)} />
      {[0.32, 0.55, 0.7].map((t, i) => (
        <path key={i} d={`M${x + w * (0.25 + i * 0.12)} ${y + h * t} q${u * 0.18} ${-u * 0.12} ${u * 0.36} 0`} fill="none" stroke="#e0f2fe" strokeWidth={1.6} strokeLinecap="round" />
      ))}
      <ellipse cx={x + w * 0.72} cy={y + h * 0.3} rx={u * 0.22} ry={u * 0.16} fill="#4ade80" />
      <text x={x + w * 0.4} y={y + h * 0.62} fontSize={Math.max(12, u * 0.5)} textAnchor="middle">🦆</text>
    </g>
  )
}
