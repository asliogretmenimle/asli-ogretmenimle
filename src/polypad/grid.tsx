import type { Pt } from './types'
import type { GridId, View } from './store'
import { UNIT } from './geom'

const H = UNIT * Math.sqrt(3)

/** Tuval ızgarası (dünya koordinatında desen) */
export function GridPattern({ grid, view }: { grid: GridId; view: View }) {
  if (grid === 'none') return null
  const tri = grid.startsWith('tri')
  const rot = grid.startsWith('tri2') ? ' rotate(90)' : ''
  const tf = `translate(${view.x} ${view.y}) scale(${view.z})${rot}`
  const sw = 1 / view.z
  const line = 'var(--pp-grid)'
  const strong = 'var(--pp-grid-strong)'
  let body
  let w = UNIT
  let h = UNIT
  switch (grid) {
    case 'square-grid':
      w = h = UNIT * 5
      body = (
        <>
          <path d={[1, 2, 3, 4].map((i) => `M${i * UNIT} 0V${w}M0 ${i * UNIT}H${w}`).join('')} stroke={line} strokeWidth={sw} />
          <path d={`M0 0V${w}M0 0H${w}`} stroke={strong} strokeWidth={sw * 1.6} />
        </>
      )
      break
    case 'square2-grid':
      w = h = UNIT * 2
      body = <path d={`M0 0V${w}M0 0H${w}`} stroke={strong} strokeWidth={sw * 1.3} />
      break
    case 'square-checked':
      w = h = UNIT * 2
      body = <path d={`M0 0h${UNIT}v${UNIT}h-${UNIT}zM${UNIT} ${UNIT}h${UNIT}v${UNIT}h-${UNIT}z`} fill="var(--pp-grid-check)" />
      break
    case 'square-dots':
      body = <circle r={Math.max(1.6, 2 / view.z)} fill={strong} />
      break
    case 'tri-dots':
    case 'tri2-dots':
      w = UNIT
      h = H
      body = (
        <>
          <circle r={Math.max(1.6, 2 / view.z)} fill={strong} />
          <circle cx={UNIT / 2} cy={H / 2} r={Math.max(1.6, 2 / view.z)} fill={strong} />
          <circle cx={UNIT} cy={H} r={Math.max(1.6, 2 / view.z)} fill={strong} />
          <circle cy={H} r={Math.max(1.6, 2 / view.z)} fill={strong} />
          <circle cx={UNIT} r={Math.max(1.6, 2 / view.z)} fill={strong} />
        </>
      )
      break
    case 'tri-grid':
    case 'tri2-grid':
      w = UNIT
      h = H
      body = <path d={`M0 0H${UNIT}M0 ${H / 2}H${UNIT}M0 0L${UNIT} ${H}M${UNIT} 0L0 ${H}`} stroke={line} strokeWidth={sw} />
      break
  }
  return (
    <>
      <defs>
        <pattern id="pp-grid" width={w} height={h} patternUnits="userSpaceOnUse" patternTransform={tf}>
          {body}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#pp-grid)" style={{ pointerEvents: 'none' }} data-tri={tri || undefined} />
    </>
  )
}

/** Izgara noktasına yapıştırma: en yakın ızgara noktası */
export function snapToGrid(grid: GridId, p: Pt): Pt {
  if (grid === 'none') return p
  if (grid === 'square2-grid') return { x: Math.round(p.x / (2 * UNIT)) * 2 * UNIT, y: Math.round(p.y / (2 * UNIT)) * 2 * UNIT }
  if (!grid.startsWith('tri')) return { x: Math.round(p.x / UNIT) * UNIT, y: Math.round(p.y / UNIT) * UNIT }
  // Üçgen kafes: tri2 için x/y yer değiştirir (desen 90° döner)
  const swap = grid.startsWith('tri2')
  const q = swap ? { x: p.y, y: -p.x } : p
  const j = q.y / (H / 2)
  let best = q
  let bd = Infinity
  for (const jj of [Math.floor(j), Math.ceil(j)]) {
    const off = (((jj % 2) + 2) % 2) * (UNIT / 2)
    const xx = Math.round((q.x - off) / UNIT) * UNIT + off
    const c = { x: xx, y: (jj * H) / 2 }
    const d = Math.hypot(c.x - q.x, c.y - q.y)
    if (d < bd) {
      bd = d
      best = c
    }
  }
  return swap ? { x: -best.y, y: best.x } : best
}
