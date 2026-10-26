import { useRef, useState, type ReactNode } from 'react'
import { useGesture } from '@use-gesture/react'
import { Eraser, Layers, Plus, RotateCcw, RotateCw, Trash2 } from 'lucide-react'
import { GhostButton } from '../donusum-studyosu/ortak'

/**
 * Hacim İnşaatı için izometrik küp çizimi.
 *  - Yükseklik haritası h[j][i]: j = arka (0) → ön (D−1), i = sol → sağ.
 *  - Ressam sırası: kat kat (z), kat içinde x + y. Bir yükseklik haritasında bu sıra her zaman doğrudur.
 *  - “Katmanları ayır”: her kat yukarı kalkar (CSS geçişiyle), yanına “1. kat: 6 küp” yazılır.
 *  - Görünüm 90°’lik adımlarla döner (düğmeler ya da iki parmakla çevirme).
 */

export type HMap = number[][]

export const LAYER = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#fb923c', '#22d3ee', '#a3e635', '#f87171', '#818cf8', '#2dd4bf', '#facc15']

export function shade(hex: string, f: number) {
  const c = parseInt(hex.slice(1), 16)
  const mix = (v: number) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))
  return `rgb(${mix(c >> 16)}, ${mix((c >> 8) & 255)}, ${mix(c & 255)})`
}

export const emptyMap = (W: number, D: number): HMap => Array.from({ length: D }, () => Array(W).fill(0) as number[])
export const boxMap = (w: number, d: number, h: number): HMap => Array.from({ length: d }, () => Array(w).fill(h) as number[])
export const volume = (h: HMap) => h.flat().reduce((s, v) => s + v, 0)
export const layerCounts = (h: HMap) => {
  const m = Math.max(0, ...h.flat())
  return Array.from({ length: m }, (_, z) => h.flat().filter((v) => v > z).length)
}
/** Dış yüzlerin sayısı (yerdeki alt yüzler dâhil) */
export function surface(h: HMap) {
  const at = (j: number, i: number) => h[j]?.[i] ?? 0
  let s = 0
  h.forEach((row, j) =>
    row.forEach((v, i) => {
      if (!v) return
      s += 2
      for (const [dj, di] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) s += Math.max(0, v - at(j + dj, i + di))
    }),
  )
  return s
}
/** Bu açıdan bakınca hiç görünmeyen küp sayısı (yaklaşık: üst, ön ve sağ komşusu dolu ya da çapraz önü dolu) */
export function hiddenCount(h: HMap) {
  const D = h.length, W = h[0].length
  const has = (j: number, i: number, z: number) => j >= 0 && j < D && i >= 0 && i < W && h[j][i] > z
  let n = 0
  for (let j = 0; j < D; j++)
    for (let i = 0; i < W; i++)
      for (let z = 0; z < h[j][i]; z++) if ((has(j, i, z + 1) && has(j + 1, i, z) && has(j, i + 1, z)) || has(j + 1, i + 1, z + 1)) n++
  return n
}

/** Haritayı k × 90° döndürür; back[y][x] → orijinal [j, i] */
export function rotateMap(h: HMap, k: number) {
  let cur = h.map((r) => [...r])
  let back: [number, number][][] = h.map((r, j) => r.map((_, i) => [j, i] as [number, number]))
  for (let t = 0; t < ((k % 4) + 4) % 4; t++) {
    const D = cur.length, W = cur[0].length
    const n: HMap = Array.from({ length: W }, () => Array(D).fill(0))
    const nb: [number, number][][] = Array.from({ length: W }, () => Array(D).fill([0, 0]))
    for (let j = 0; j < D; j++)
      for (let i = 0; i < W; i++) {
        n[i][D - 1 - j] = cur[j][i]
        nb[i][D - 1 - j] = back[j][i]
      }
    cur = n
    back = nb
  }
  return { h: cur, back }
}

/* ───────────── görünümler ───────────── */
export const frontView = (h: HMap) => h[0].map((_, i) => Math.max(...h.map((r) => r[i])))
export const sideView = (h: HMap) => h.map((r) => Math.max(...r)).reverse()
export const topView = (h: HMap) => h.map((r) => r.map((v) => (v > 0 ? '#' : '.')).join(''))
export const trim1 = (a: number[]) => {
  let s = 0, e = a.length
  while (s < e && !a[s]) s++
  while (e > s && !a[e - 1]) e--
  return a.slice(s, e).join(',')
}
export const trimTop = (rows: string[]) => {
  const r = rows.filter((x) => x.includes('#'))
  if (!r.length) return ''
  let s = 99, e = 0
  rows.forEach((x) => [...x].forEach((c, i) => { if (c === '#') { s = Math.min(s, i); e = Math.max(e, i + 1) } }))
  return r.map((x) => x.slice(s, e)).join('/')
}

export function ViewGrid({ title, cols, rows, filled, hint, dark }: { title: string; cols: number; rows: number; filled: (c: number, r: number) => boolean; hint?: string; dark?: boolean }) {
  const u = 22
  return (
    <div className={`flex flex-col items-center gap-1 rounded-2xl p-2.5 ring-1 ${dark ? 'bg-slate-800 ring-slate-600' : 'bg-white ring-line'}`}>
      <span className={`text-xs font-black tracking-wide uppercase ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>{title}</span>
      <svg viewBox={`-2 -2 ${cols * u + 4} ${rows * u + 4}`} style={{ width: Math.min(120, cols * u + 4) }} aria-label={title}>
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => (
            <rect key={`${r}-${c}`} x={c * u} y={r * u} width={u} height={u} fill={filled(c, r) ? '#db2777' : dark ? '#1e293b' : '#fff'} stroke={filled(c, r) ? '#9d174d' : dark ? '#475569' : '#e3e5ef'} strokeWidth={1.2} />
          )),
        )}
      </svg>
      {hint && <span className={`text-[11px] font-bold ${dark ? 'text-slate-400' : 'text-ink-soft'}`}>{hint}</span>}
    </div>
  )
}

export function Views({ front, side, top, dark }: { front: number[]; side: number[]; top: string[]; dark?: boolean }) {
  const H = Math.max(2, ...front, ...side)
  return (
    <div className="flex flex-wrap items-start justify-center gap-2">
      <ViewGrid title="Önden" cols={front.length} rows={H} filled={(c, r) => H - r <= front[c]} hint="sol → sağ" dark={dark} />
      <ViewGrid title="Sağdan" cols={side.length} rows={H} filled={(c, r) => H - r <= side[c]} hint="ön → arka" dark={dark} />
      <ViewGrid title="Üstten" cols={top[0]?.length ?? 1} rows={top.length} filled={(c, r) => top[r]?.[c] === '#'} hint="ön aşağıda" dark={dark} />
    </div>
  )
}

/* ───────────── izometrik sahne ───────────── */

export interface IsoProps {
  h: HMap
  rot?: number
  explode?: boolean
  /** Sütuna dokunuş (orijinal koordinat) */
  onTap?: (j: number, i: number) => void
  onRotate?: (d: 1 | -1) => void
  dark?: boolean
  /** Cam kutu (orijinal genişlik × derinlik × yükseklik), haritanın sol-arka köşesine oturur */
  glass?: { w: number; d: number; h: number }
  /** Görünüm için ayrılacak en büyük yükseklik */
  maxH?: number
  /** Kat renkleri yerine tek renk */
  mono?: string
  /** ÖN etiketi */
  front?: boolean
  /** Katmanları ayırınca kat etiketleri */
  layerLabels?: boolean
  label?: string
  maxHeight?: number
  /** yeni eklenen küpü vurgula (orijinal j, i, z) */
  flash?: string | null
}

export function Iso({ h: h0, rot = 0, explode = false, onTap, onRotate, dark, glass, maxH, mono, front = true, layerLabels = true, label = 'İzometrik küp yapısı', maxHeight = 420, flash }: IsoProps) {
  const s = 34
  const cw = s * 0.866, ch = s * 0.5
  const { h, back } = rotateMap(h0, rot)
  const D = h.length, W = h[0].length
  const M = Math.max(W, D)
  const topH = Math.max(maxH ?? 0, glass?.h ?? 0, ...h.flat(), 1)
  const gap = explode ? s * 0.62 : 0
  const P = (x: number, y: number, z: number) => [(x - y) * cw, (x + y) * ch - z * s] as const
  const ps = (...pts: (readonly [number, number])[]) => pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const minX = -M * cw - 10, maxX = M * cw + (layerLabels ? 70 : 10)
  const minY = -topH * s - topH * s * 0.62 - 14, maxY = 2 * M * ch + 30

  const floor: ReactNode[] = []
  for (let y = 0; y < D; y++)
    for (let x = 0; x < W; x++) {
      const [j, i] = back[y][x]
      floor.push(
        <polygon
          key={`f${x}-${y}`}
          points={ps(P(x, y, 0), P(x + 1, y, 0), P(x + 1, y + 1, 0), P(x, y + 1, 0))}
          fill={dark ? ((x + y) % 2 ? '#334155' : '#3b4a5f') : (x + y) % 2 ? '#eef0f7' : '#f6f7fb'}
          stroke={dark ? '#52627a' : '#d5d8e6'}
          strokeWidth={1}
          onClick={onTap ? () => onTap(j, i) : undefined}
          style={{ cursor: onTap ? 'pointer' : 'default' }}
        />,
      )
    }

  // cam kutu: döndürülmüş boyutlar
  const gw = glass ? (rot % 2 ? glass.d : glass.w) : 0, gd = glass ? (rot % 2 ? glass.w : glass.d) : 0
  const gx0 = glass ? (() => {
    // orijinal (0..w, 0..d) dikdörtgeninin döndürülmüş hâlindeki en küçük köşe
    const D0 = h0.length, W0 = h0[0].length
    let corners: [number, number][] = [[0, 0], [glass.w, 0], [0, glass.d], [glass.w, glass.d]]
    let dd = D0, ww = W0
    for (let t = 0; t < ((rot % 4) + 4) % 4; t++) {
      corners = corners.map(([x, y]) => [dd - y, x])
      ;[ww, dd] = [dd, ww]
    }
    return [Math.min(...corners.map((c) => c[0])), Math.min(...corners.map((c) => c[1]))] as const
  })() : ([0, 0] as const)
  const G = (x: number, y: number, z: number) => P(gx0[0] + x, gx0[1] + y, z)

  const cubes: ReactNode[] = []
  const cells: { x: number; y: number }[] = []
  for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) cells.push({ x, y })
  cells.sort((p, q) => p.x + p.y - (q.x + q.y))
  for (let z = 0; z < topH; z++) {
    const layer: ReactNode[] = []
    for (const { x, y } of cells) {
      if (h[y][x] <= z) continue
      const [j, i] = back[y][x]
      const c = mono ?? LAYER[z % LAYER.length]
      const isFlash = flash === `${j}-${i}-${z}`
      layer.push(
        <g key={`c${j}-${i}-${z}`} onClick={onTap ? () => onTap(j, i) : undefined} style={{ cursor: onTap ? 'pointer' : 'default' }} stroke={dark ? '#0f172a' : '#1f2340'} strokeWidth={1.3} strokeLinejoin="round" className={isFlash ? 'animate-pop' : undefined}>
          <polygon points={ps(P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1))} fill={shade(c, 0.45)} />
          <polygon points={ps(P(x, y + 1, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1))} fill={shade(c, 0)} />
          <polygon points={ps(P(x + 1, y, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x + 1, y, z + 1))} fill={shade(c, -0.22)} />
        </g>,
      )
    }
    const n = layer.length
    if (!n) continue
    const [lx, ly] = P(W, 0, z + 0.5)
    cubes.push(
      <g key={`L${z}`} style={{ transform: `translateY(${-z * gap}px)`, transition: 'transform .5s cubic-bezier(.3,1.3,.5,1)' }}>
        {layer}
        {explode && layerLabels && (
          <g pointerEvents="none">
            <rect x={lx + 6} y={ly - 11} width={60} height={22} rx={11} fill={mono ?? LAYER[z % LAYER.length]} />
            <text x={lx + 36} y={ly + 4.5} textAnchor="middle" fontSize={12} fontWeight={900} fill="#1f2340">{z + 1}. kat: {n}</text>
          </g>
        )}
      </g>,
    )
  }

  // ÖN etiketi: orijinal ön kenar (j = D0) döndürülmüş hâli
  let frontTag: ReactNode = null
  if (front) {
    const D0 = h0.length, W0 = h0[0].length
    let a: [number, number] = [0, D0], b: [number, number] = [W0, D0]
    let dd = D0, ww = W0
    for (let t = 0; t < ((rot % 4) + 4) % 4; t++) {
      a = [dd - a[1], a[0]]
      b = [dd - b[1], b[0]]
      ;[ww, dd] = [dd, ww]
    }
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
    const [lx, ly] = P(mx + (mx - W / 2) * 0.35, my + (my - D / 2) * 0.35, 0)
    frontTag = (
      <g pointerEvents="none">
        <rect x={lx - 22} y={ly - 2} width={44} height={22} rx={11} fill="#db2777" />
        <text x={lx} y={ly + 13} textAnchor="middle" fontSize={12} fontWeight={900} fill="#fff">ÖN</text>
      </g>
    )
  }

  const ref = useRef<SVGSVGElement>(null)
  const acc = useRef(0)
  useGesture(
    {
      onPinch: ({ offset: [, a], first, memo, event }) => {
        event?.preventDefault?.()
        if (!onRotate) return
        if (first) {
          acc.current = 0
          return a
        }
        const d = a - (memo ?? a)
        acc.current += d
        if (Math.abs(acc.current) > 45) {
          onRotate(acc.current > 0 ? 1 : -1)
          acc.current = 0
        }
        return a
      },
    },
    { target: ref, eventOptions: { passive: false } },
  )

  const glassStroke = dark ? '#7dd3fc' : '#0ea5e9'
  return (
    <svg ref={ref} viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className="mx-auto block w-full select-none" style={{ touchAction: 'none', maxHeight }} role="img" aria-label={label}>
      {floor}
      {glass && (
        <g pointerEvents="none">
          <polygon points={ps(G(0, 0, 0), G(gw, 0, 0), G(gw, 0, glass.h), G(0, 0, glass.h))} fill={glassStroke} fillOpacity={0.06} />
          <polygon points={ps(G(0, 0, 0), G(0, gd, 0), G(0, gd, glass.h), G(0, 0, glass.h))} fill={glassStroke} fillOpacity={0.06} />
          {[[G(0, 0, 0), G(0, 0, glass.h)], [G(0, 0, glass.h), G(gw, 0, glass.h)], [G(0, 0, glass.h), G(0, gd, glass.h)]].map(([p, q], k) => (
            <line key={k} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={glassStroke} strokeWidth={1.5} strokeDasharray="5 4" opacity={0.7} />
          ))}
        </g>
      )}
      {cubes}
      {glass && (
        <g pointerEvents="none" fill="none" stroke={glassStroke} strokeWidth={2} strokeDasharray="6 4" opacity={0.85}>
          <polygon points={ps(G(gw, 0, glass.h), G(gw, gd, glass.h), G(0, gd, glass.h))} fill={glassStroke} fillOpacity={0.05} />
          <line x1={G(gw, gd, 0)[0]} y1={G(gw, gd, 0)[1]} x2={G(gw, gd, glass.h)[0]} y2={G(gw, gd, glass.h)[1]} />
          <line x1={G(gw, 0, 0)[0]} y1={G(gw, 0, 0)[1]} x2={G(gw, 0, glass.h)[0]} y2={G(gw, 0, glass.h)[1]} />
          <line x1={G(0, gd, 0)[0]} y1={G(0, gd, 0)[1]} x2={G(0, gd, glass.h)[0]} y2={G(0, gd, glass.h)[1]} />
          <polyline points={ps(G(0, gd, 0), G(gw, gd, 0), G(gw, 0, 0))} />
        </g>
      )}
      {frontTag}
    </svg>
  )
}

/* ───────────── dokunarak inşa tahtası ───────────── */

export function useBoard(W: number, D: number, init?: HMap) {
  const [h, setH] = useState<HMap>(() => init ?? emptyMap(W, D))
  return { h, setH }
}

/**
 * Dokunarak küp ekle / çıkar. Araç çubuğu: Ekle, Çıkar, ↺ ↻, Katmanları ayır, Temizle.
 */
export function BuildBoard({ h, onChange, maxH = 5, dark, glass, extraTools, explodable = true, lockedCells, maxHeight, clear = true }: { h: HMap; onChange: (h: HMap) => void; maxH?: number; dark?: boolean; glass?: IsoProps['glass']; extraTools?: ReactNode; explodable?: boolean; lockedCells?: boolean; maxHeight?: number; clear?: boolean }) {
  const [rot, setRot] = useState(0)
  const [mode, setMode] = useState<'add' | 'remove'>('add')
  const [explode, setExplode] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const tap = (j: number, i: number) => {
    if (lockedCells) return
    const v = h[j][i]
    if (mode === 'add' && v >= maxH) return
    if (mode === 'remove' && v <= 0) return
    const n = h.map((r) => [...r])
    n[j][i] = v + (mode === 'add' ? 1 : -1)
    if (mode === 'add') setFlash(`${j}-${i}-${v}`)
    onChange(n)
  }
  return (
    <div>
      <Iso h={h} rot={rot} explode={explode} onTap={tap} onRotate={(d) => setRot((r) => (r + d + 4) % 4)} dark={dark} glass={glass} maxH={maxH} flash={flash} maxHeight={maxHeight} />
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
        {!lockedCells && (
          <>
            <GhostButton dark={dark} active={mode === 'add'} onClick={() => setMode('add')}><Plus size={18} />Ekle</GhostButton>
            <GhostButton dark={dark} active={mode === 'remove'} onClick={() => setMode('remove')}><Eraser size={18} />Çıkar</GhostButton>
          </>
        )}
        <GhostButton dark={dark} onClick={() => setRot((r) => (r + 3) % 4)}><RotateCcw size={18} /><span className="sr-only">Sola döndür</span></GhostButton>
        <GhostButton dark={dark} onClick={() => setRot((r) => (r + 1) % 4)}><RotateCw size={18} /><span className="sr-only">Sağa döndür</span></GhostButton>
        {explodable && <GhostButton dark={dark} active={explode} onClick={() => setExplode((e) => !e)}><Layers size={18} />{explode ? 'Katları birleştir' : 'Katmanları ayır'}</GhostButton>}
        {clear && !lockedCells && <GhostButton dark={dark} onClick={() => onChange(h.map((r) => r.map(() => 0)))}><Trash2 size={18} /><span className="sr-only">Temizle</span></GhostButton>}
        {extraTools}
      </div>
    </div>
  )
}

/** Yalnızca bakılan yapı: döndür + katmanları ayır */
export function ViewBoard({ h, dark, glass, maxH, maxHeight, mono, onExplode }: { h: HMap; dark?: boolean; glass?: IsoProps['glass']; maxH?: number; maxHeight?: number; mono?: string; onExplode?: (on: boolean) => void }) {
  const [rot, setRot] = useState(0)
  const [explode, setExplode] = useState(false)
  return (
    <div>
      <Iso h={h} rot={rot} explode={explode} onRotate={(d) => setRot((r) => (r + d + 4) % 4)} dark={dark} glass={glass} maxH={maxH} maxHeight={maxHeight} mono={mono} />
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
        <GhostButton dark={dark} onClick={() => setRot((r) => (r + 3) % 4)}><RotateCcw size={18} /><span className="sr-only">Sola döndür</span></GhostButton>
        <GhostButton dark={dark} onClick={() => setRot((r) => (r + 1) % 4)}><RotateCw size={18} /><span className="sr-only">Sağa döndür</span></GhostButton>
        <GhostButton dark={dark} active={explode} onClick={() => { setExplode(!explode); onExplode?.(!explode) }}><Layers size={18} />{explode ? 'Katları birleştir' : 'Katmanları ayır'}</GhostButton>
      </div>
    </div>
  )
}
