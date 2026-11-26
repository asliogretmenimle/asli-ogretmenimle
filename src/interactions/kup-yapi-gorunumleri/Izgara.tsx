import { useRef, type ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import { VIEW_COLOR, VIEW_LABEL, crop, type Grid, type ViewKind } from './yapi'

/**
 * Görünüm ızgaraları (kareli kâğıt).
 *  - ViewGrid: bir görünümü dolu karelerle gösterir; editable ise parmakla kare boyanır
 *    (basılı tutup gezdirince aynı işlem — boyama ya da silme — sürer).
 *  - Ön ve yan görünümlerde altta kalın “zemin” çizgisi, üst görünümde altta “ön” oku vardır.
 */

const HINT: Record<ViewKind, [string, string]> = {
  on: ['sol', 'sağ'],
  arka: ['sağ', 'sol'],
  sag: ['ön', 'arka'],
  sol: ['arka', 'ön'],
  ust: ['sol', 'sağ'],
}

export function ViewGrid({ g, kind, cell = 26, editable, onPaint, wrong, faint, title, status, cropped, hideHint }: {
  g: Grid
  kind: ViewKind
  cell?: number
  editable?: boolean
  onPaint?: (r: number, c: number, v: boolean) => void
  /** “r,c” biçiminde yanlış kareler */
  wrong?: Set<string>
  /** arkada soluk gösterilecek doğru cevap */
  faint?: Grid
  title?: ReactNode
  status?: 'ok' | 'bad' | null
  cropped?: boolean
  hideHint?: boolean
}) {
  const grid = cropped ? crop(g) : g
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  const color = VIEW_COLOR[kind]
  const ref = useRef<SVGSVGElement>(null)
  const paintVal = useRef<boolean | null>(null)
  const lastCell = useRef('')
  const pad = 4
  const w = cols * cell + pad * 2
  const hgt = rows * cell + pad * 2 + (kind !== 'ust' ? 4 : 0)

  const cellAt = (cx: number, cy: number) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return null
    const sx = (cx - r.left) * (w / r.width) - pad
    const sy = (cy - r.top) * (hgt / r.height) - pad
    const c = Math.floor(sx / cell)
    const rr = Math.floor(sy / cell)
    if (c < 0 || c >= cols || rr < 0 || rr >= rows) return null
    return [rr, c] as const
  }

  return (
    <figure className="flex flex-col items-center gap-1">
      {title !== undefined && (
        <figcaption className="flex items-center gap-1.5 text-sm font-black" style={{ color }}>
          <span className="size-3 rounded-sm" style={{ background: color }} />
          {title}
          {status === 'ok' && <span className="grid size-5 place-items-center rounded-full bg-emerald-500 text-white"><Check size={13} strokeWidth={4} /></span>}
          {status === 'bad' && <span className="grid size-5 place-items-center rounded-full bg-red-500 text-white"><X size={13} strokeWidth={4} /></span>}
        </figcaption>
      )}
      <svg
        ref={ref}
        width={w}
        height={hgt}
        viewBox={`0 0 ${w} ${hgt}`}
        className={`max-w-full ${editable ? 'cursor-pointer touch-none' : ''}`}
        role={editable ? 'grid' : 'img'}
        aria-label={`${VIEW_LABEL[kind]} görünüm`}
        onPointerDown={(e) => {
          if (!editable) return
          const c = cellAt(e.clientX, e.clientY)
          if (!c) return
          e.currentTarget.setPointerCapture(e.pointerId)
          const v = !grid[c[0]][c[1]]
          paintVal.current = v
          lastCell.current = `${c[0]},${c[1]}`
          onPaint?.(c[0], c[1], v)
        }}
        onPointerMove={(e) => {
          if (!editable || paintVal.current === null) return
          const c = cellAt(e.clientX, e.clientY)
          if (!c) return
          const k = `${c[0]},${c[1]}`
          if (k === lastCell.current) return
          lastCell.current = k
          if (grid[c[0]][c[1]] !== paintVal.current) onPaint?.(c[0], c[1], paintVal.current)
        }}
        onPointerUp={() => (paintVal.current = null)}
        onPointerCancel={() => (paintVal.current = null)}
      >
        {grid.map((row, r) =>
          row.map((v, c) => {
            const bad = wrong?.has(`${r},${c}`)
            const ghost = faint?.[r]?.[c]
            return (
              <rect
                key={`${r}-${c}`}
                x={pad + c * cell + 1}
                y={pad + r * cell + 1}
                width={cell - 2}
                height={cell - 2}
                rx={3}
                fill={v ? color : ghost ? `${color}33` : editable ? '#fff' : 'transparent'}
                stroke={bad ? '#ef4444' : v ? '#0f172a' : editable ? '#cbd5e1' : 'transparent'}
                strokeWidth={bad ? 3 : v ? 1.5 : 1}
                strokeDasharray={ghost && !v ? '3 3' : undefined}
              />
            )
          }),
        )}
        {kind !== 'ust' && <line x1={pad - 2} x2={w - pad + 2} y1={pad + rows * cell + 2} y2={pad + rows * cell + 2} stroke="#334155" strokeWidth={3} strokeLinecap="round" />}
      </svg>
      {!hideHint && (
        <span className="flex w-full max-w-[220px] justify-between px-1 text-[10px] font-black tracking-wide text-ink-soft uppercase">
          <span>{HINT[kind][0]}</span>
          {kind === 'ust' && <span className="text-blue-700">▼ ön</span>}
          <span>{HINT[kind][1]}</span>
        </span>
      )}
    </figure>
  )
}

/** İki ızgaranın kırpılmış hâllerini karşılaştırıp, çizilen ızgarada yanlış kareleri bulur */
export function wrongCells(drawn: Grid, truth: Grid) {
  const b = crop(truth)
  const out = new Set<string>()
  // çizilenin sol-alt köşesini doğrununkiyle hizala
  const rows = drawn.map((r, i) => (r.some(Boolean) ? i : -1)).filter((i) => i >= 0)
  const cols = (drawn[0] ?? []).map((_, j) => (drawn.some((r) => r[j]) ? j : -1)).filter((j) => j >= 0)
  if (!rows.length) return out
  const r1 = rows[rows.length - 1]
  const c0 = cols[0]
  const bh = b.length
  drawn.forEach((row, r) =>
    row.forEach((v, c) => {
      const br = bh - 1 - (r1 - r)
      const bc = c - c0
      const want = !!b[br]?.[bc]
      if (v !== want && (v || (br >= 0 && bc >= 0))) out.add(`${r},${c}`)
    }),
  )
  return out
}

/** Doğru görünümü, çizim ızgarasında sol-alt köşeye yerleştirilmiş hâlde verir (soluk ipucu için) */
export function placeOn(truth: Grid, rows: number, cols: number): Grid {
  const b = crop(truth)
  const out: Grid = Array.from({ length: rows }, () => Array(cols).fill(false) as boolean[])
  const off = rows - b.length
  b.forEach((row, r) => row.forEach((v, c) => { if (out[r + off] && c < cols) out[r + off][c] = v }))
  return out
}
