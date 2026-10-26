import { useRef, type ReactNode } from 'react'
import { ck, NB, pk, useGridGesture, type Pt } from '../sekil-insa-et/ortak'

/**
 * Tam kare ve yarım kare (dik üçgen) parçaları.
 *  F: tam kare, 0..3: dik köşesi c0 (sol üst), c1 (sağ üst), c2 (sağ alt), c3 (sol alt) olan yarım kare.
 */
export type Cell = 'F' | 0 | 1 | 2 | 3
export type Cells = Record<string, Cell>

const CORNER: Pt[] = [[0, 0], [1, 0], [1, 1], [0, 1]]
export const cellPoly = (k: string, c: Cell): Pt[] => {
  const [x, y] = pk(k)
  const pts = c === 'F' ? CORNER : [CORNER[(c + 3) % 4], CORNER[c], CORNER[(c + 1) % 4]]
  return pts.map(([a, b]) => [x + a, y + b] as Pt)
}
export const cellArea = (c: Cell) => (c === 'F' ? 1 : 0.5)
export const totalArea = (cs: Cells) => Object.values(cs).reduce<number>((s, c) => s + cellArea(c), 0)
export const halfCount = (cs: Cells) => Object.values(cs).filter((c) => c !== 'F').length

/** Kenar dolu mu? kenar: 0 üst, 1 sağ, 2 alt, 3 sol */
const hasEdge = (c: Cell, e: number) => c === 'F' || e === c || e === (c + 3) % 4
const EDGE_DIR: [number, number, number][] = [[0, -1, 0], [1, 0, 1], [0, 1, 2], [-1, 0, 3]]

/** Parçalar kenar kenara bağlı mı? */
export function piecesConnected(cs: Cells) {
  const keys = Object.keys(cs)
  if (keys.length <= 1) return true
  const seen = new Set([keys[0]])
  const st = [keys[0]]
  while (st.length) {
    const k = st.pop()!
    const [x, y] = pk(k)
    for (const [dx, dy, e] of EDGE_DIR) {
      const n = ck(x + dx, y + dy)
      if (!(n in cs) || seen.has(n)) continue
      if (hasEdge(cs[k], e) && hasEdge(cs[n], (e + 2) % 4)) {
        seen.add(n)
        st.push(n)
      }
    }
  }
  return seen.size === keys.length
}

const SYM: ((p: Pt) => Pt)[] = [
  ([x, y]) => [x, y], ([x, y]) => [-x, y], ([x, y]) => [x, -y], ([x, y]) => [-x, -y],
  ([x, y]) => [y, x], ([x, y]) => [-y, x], ([x, y]) => [y, -x], ([x, y]) => [-y, -x],
]
/** Eş şekiller aynı anahtar (döndürme/yansıma/öteleme) */
export function piecesKey(cs: Cells) {
  const polys = Object.entries(cs).map(([k, c]) => cellPoly(k, c))
  let best = ''
  for (const f of SYM) {
    const q = polys.map((p) => p.map(f))
    const all = q.flat()
    const mx = Math.min(...all.map((p) => p[0])), my = Math.min(...all.map((p) => p[1]))
    const k = q.map((p) => p.map(([x, y]) => `${x - mx},${y - my}`).sort().join(' ')).sort().join('|')
    if (!best || k < best) best = k
  }
  return best
}

/** Tam kareler bir dikdörtgen mi? (yarım kare yoksa) */
export function rectOf(cs: Cells) {
  const keys = Object.keys(cs)
  if (!keys.length || halfCount(cs)) return null
  const ps = keys.map(pk)
  const w = Math.max(...ps.map((p) => p[0])) - Math.min(...ps.map((p) => p[0])) + 1
  const h = Math.max(...ps.map((p) => p[1])) - Math.min(...ps.map((p) => p[1])) + 1
  return w * h === keys.length ? { w, h } : null
}

export const neighbors = (k: string) => {
  const [x, y] = pk(k)
  return NB.map(([dx, dy]) => ck(x + dx, y + dy))
}

/**
 * Parça tahtası: dokun/gezdir → seçili araçla boya (tam kare ya da seçili yönde yarım kare); aynı parçaya dokun → sil.
 */
export function PieceBoard({ cols, rows, cells, onSet, tool, canPaint, locked, color = '#2563eb', children, under, bg = '#fff', cellColor }: { cols: number; rows: number; cells: Cells; onSet: (k: string, c: Cell | null) => void; tool: Cell; canPaint?: (k: string) => boolean; locked?: boolean; color?: string; children?: ReactNode; under?: ReactNode; bg?: string; cellColor?: (k: string) => string | undefined }) {
  const svg = useRef<SVGSVGElement>(null)
  const cur = useRef(cells)
  cur.current = cells
  const last = useRef('')
  const at = (p: Pt) => {
    const x = Math.floor(p[0]), y = Math.floor(p[1])
    if (x < 0 || y < 0 || x >= cols || y >= rows) return null
    const k = ck(x, y)
    return canPaint && !canPaint(k) ? null : k
  }
  useGridGesture<{ erase: boolean } | null>(svg, {
    disabled: locked,
    onStart: (p) => {
      const k = at(p)
      if (!k) return null
      last.current = k
      const erase = cur.current[k] === tool
      onSet(k, erase ? null : tool)
      return { erase }
    },
    onMove: (p, m) => {
      if (!m) return
      const k = at(p)
      if (!k || k === last.current) return
      last.current = k
      onSet(k, m.erase ? null : tool)
    },
  })
  const pad = 0.3
  return (
    <svg ref={svg} viewBox={`${-pad} ${-pad} ${cols + 2 * pad} ${rows + 2 * pad}`} className="block w-full select-none rounded-2xl ring-1 ring-line" style={{ touchAction: 'none', background: bg }} role="img" aria-label="Birim kare tahtası">
      {under}
      <g stroke="#e3e7f2" strokeWidth={0.03}>
        {Array.from({ length: cols + 1 }, (_, i) => <line key={`v${i}`} x1={i} x2={i} y1={0} y2={rows} />)}
        {Array.from({ length: rows + 1 }, (_, i) => <line key={`h${i}`} y1={i} y2={i} x1={0} x2={cols} />)}
      </g>
      {Object.entries(cells).map(([k, c]) => (
        <polygon key={k} points={cellPoly(k, c).map((p) => p.join(',')).join(' ')} fill={cellColor?.(k) ?? color} fillOpacity={0.88} stroke="#fff" strokeWidth={0.06} strokeLinejoin="round" />
      ))}
      {children}
    </svg>
  )
}

export function MiniPieces({ cells, color = '#2563eb', size = 40 }: { cells: Cells; color?: string; size?: number }) {
  const polys = Object.entries(cells).map(([k, c]) => cellPoly(k, c))
  if (!polys.length) return null
  const all = polys.flat()
  const x0 = Math.min(...all.map((p) => p[0])), y0 = Math.min(...all.map((p) => p[1]))
  const m = Math.max(Math.max(...all.map((p) => p[0])) - x0, Math.max(...all.map((p) => p[1])) - y0)
  return (
    <svg viewBox={`${x0 - 0.2} ${y0 - 0.2} ${m + 0.4} ${m + 0.4}`} width={size} height={size} aria-hidden>
      {polys.map((p, i) => <polygon key={i} points={p.map((q) => q.join(',')).join(' ')} fill={color} stroke="#fff" strokeWidth={0.1} />)}
    </svg>
  )
}

/** Yarım kare yön simgesi */
export function HalfIcon({ c, size = 26, color = '#2563eb' }: { c: Cell; size?: number; color?: string }) {
  return (
    <svg viewBox="-0.1 -0.1 1.2 1.2" width={size} height={size} aria-hidden>
      <rect x={0} y={0} width={1} height={1} fill="none" stroke="#cbd5e1" strokeWidth={0.05} />
      <polygon points={cellPoly('0,0', c).map((p) => p.join(',')).join(' ')} fill={color} />
    </svg>
  )
}
