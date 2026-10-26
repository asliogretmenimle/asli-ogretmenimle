import { useRef } from 'react'
import { MarsSky, ModuleArt, type Mod } from './art'

/**
 * Mars yüzeyindeki üs alanı: cols × rows parsel.
 * Seçili modülle parsele dokun ya da parmağını parseller üzerinde gezdir (boya). Aynı modülün üstüne dokunmak siler.
 * Modüller parsellere yapışır.
 */
export const CELL = 64
const SKY = 120
const PAD = 18

export function BaseGrid({ cols, rows, cells, tool, onChange, locked, dark, highlight }: { cols: number; rows: number; cells: (Mod | null)[]; tool: Mod | 'sil'; onChange: (c: (Mod | null)[]) => void; locked?: boolean; dark?: boolean; highlight?: Mod | null }) {
  const W = cols * CELL + PAD * 2
  const H = SKY + rows * CELL + PAD * 2
  const svgRef = useRef<SVGSVGElement>(null)
  const paint = useRef<{ mode: 'put' | 'erase'; seen: Set<number>; cur: (Mod | null)[] } | null>(null)

  const cellAt = (cx: number, cy: number) => {
    const r = svgRef.current!.getBoundingClientRect()
    const x = ((cx - r.left) / r.width) * W - PAD
    const y = ((cy - r.top) / r.height) * H - SKY - PAD
    const c = Math.floor(x / CELL), rr = Math.floor(y / CELL)
    if (c < 0 || rr < 0 || c >= cols || rr >= rows) return -1
    return rr * cols + c
  }
  const apply = (i: number) => {
    const p = paint.current
    if (!p || i < 0 || p.seen.has(i)) return
    p.seen.add(i)
    const next = [...p.cur]
    next[i] = p.mode === 'put' ? (tool === 'sil' ? null : tool) : null
    p.cur = next
    onChange(next)
  }
  const down = (e: React.PointerEvent) => {
    if (locked) return
    const i = cellAt(e.clientX, e.clientY)
    if (i < 0) return
    e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    const erase = tool === 'sil' || cells[i] === tool
    paint.current = { mode: erase ? 'erase' : 'put', seen: new Set(), cur: cells }
    apply(i)
  }
  const move = (e: React.PointerEvent) => {
    if (!paint.current) return
    apply(cellAt(e.clientX, e.clientY))
  }
  const up = () => (paint.current = null)

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto block h-auto w-full rounded-[22px]"
      style={{ touchAction: 'none', maxWidth: `calc(72vh * ${(W / H).toFixed(3)})` }}
      role="img"
      aria-label={`Üs alanı: ${cols} × ${rows} parsel`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <MarsSky w={W} h={SKY + 40} dark={dark} />
      <rect x={0} y={SKY + 20} width={W} height={H - SKY - 20} fill={dark ? '#7c2d12' : '#c2410c'} />
      {/* kraterler ve taşlar */}
      {[[0.1, 0.35], [0.92, 0.6], [0.5, 0.97], [0.03, 0.9]].map(([fx, fy], i) => (
        <ellipse key={i} cx={W * fx} cy={SKY + (H - SKY) * fy} rx={14} ry={5} fill="#7c2d12" opacity={0.6} />
      ))}
      {/* üs zemini */}
      <rect x={PAD - 6} y={SKY + PAD - 6} width={cols * CELL + 12} height={rows * CELL + 12} rx={14} fill={dark ? '#1e293b' : '#334155'} stroke="#94a3b8" strokeOpacity={0.5} strokeWidth={2} />
      <g data-handle style={{ cursor: locked ? 'default' : 'pointer' }}>
        {cells.map((m, i) => {
          const c = i % cols, r = Math.floor(i / cols)
          const x = PAD + c * CELL, y = SKY + PAD + r * CELL
          const hl = highlight && m === highlight
          return (
            <g key={i}>
              <rect x={x + 2} y={y + 2} width={CELL - 4} height={CELL - 4} rx={8} fill={m ? (hl ? '#fef08a33' : '#0f172a') : '#475569'} stroke={hl ? '#fde047' : '#64748b'} strokeWidth={hl ? 2.5 : 1} />
              {!m && <circle cx={x + CELL / 2} cy={y + CELL / 2} r={2.2} fill="#94a3b8" opacity={0.6} />}
              {m && <ModuleArt key={m} mod={m} x={x + 4} y={y + 2} s={CELL - 8} />}
            </g>
          )
        })}
      </g>
    </svg>
  )
}
