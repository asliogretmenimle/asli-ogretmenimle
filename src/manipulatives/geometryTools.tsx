import { useRef, useState } from 'react'
import { RotateCcw, Undo2 } from 'lucide-react'
import { GridSvg, ShapeSvg } from '../components/Visual'
import { DragPoint, Plane, usePlane } from '../interactive/Plane'
import type { ShapeName } from '../data/types'
import { Readout, ToolButton } from './ui'
import { n, type ToolDef } from './types'

// ─── Geometri tahtası ──────────────────────────────────────────────────────
type Pt = [number, number]
type GB = { pts: Pt[]; closed: boolean }

const polyArea = (p: Pt[]) => Math.abs(p.reduce((s, [x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; return s + x * y2 - x2 * y }, 0)) / 2
const axisPerimeter = (p: Pt[]) => {
  let per = 0
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]
    if (x1 !== x2 && y1 !== y2) return null
    per += Math.abs(x2 - x1) + Math.abs(y2 - y1)
  }
  return per
}

export const geoboard: ToolDef<GB> = {
  id: 'geoboard',
  defaultConfig: { size: 8 },
  initial: () => ({ pts: [], closed: false }),
  check: (v, t) => {
    if (!v.closed) return false
    if (typeof t.sides === 'number' && v.pts.length !== t.sides) return false
    if (typeof t.area === 'number' && polyArea(v.pts) !== t.area) return false
    if (typeof t.perimeter === 'number' && axisPerimeter(v.pts) !== t.perimeter) return false
    if (t.rect || t.square) {
      if (v.pts.length !== 4 || axisPerimeter(v.pts) === null) return false
      const xs = new Set(v.pts.map((p) => p[0])), ys = new Set(v.pts.map((p) => p[1]))
      if (xs.size !== 2 || ys.size !== 2) return false
      const [x1, x2] = [...xs], [y1, y2] = [...ys]
      if (t.square && Math.abs(x1 - x2) !== Math.abs(y1 - y2)) return false
    }
    return true
  },
  Component: ({ value, onChange, config, target, locked }) => {
    const size = config.size ?? 8
    const u = 300 / size
    const tap = (x: number, y: number) => {
      if (locked) return
      if (value.closed) return onChange({ pts: [[x, y]], closed: false })
      const [fx, fy] = value.pts[0] ?? [-1, -1]
      if (value.pts.length >= 3 && fx === x && fy === y) return onChange({ ...value, closed: true })
      if (value.pts.some(([px, py]) => px === x && py === y)) return
      onChange({ pts: [...value.pts, [x, y]], closed: false })
    }
    const per = value.closed ? axisPerimeter(value.pts) : null
    return (
      <div className="flex flex-col items-center gap-3">
        <svg viewBox={`-10 -10 ${size * u + 20} ${size * u + 20}`} className="w-full max-w-md touch-none rounded-2xl bg-sky-50 ring-1 ring-line">
          {Array.from({ length: size + 1 }).map((_, i) => (
            <g key={i}>
              <line x1={i * u} x2={i * u} y1={0} y2={size * u} stroke="#dbeafe" />
              <line y1={i * u} y2={i * u} x1={0} x2={size * u} stroke="#dbeafe" />
            </g>
          ))}
          {value.pts.length > 0 && (
            value.closed ? (
              <polygon points={value.pts.map(([x, y]) => `${x * u},${y * u}`).join(' ')} fill="#6366f1" fillOpacity={0.3} stroke="#4f46e5" strokeWidth={4} strokeLinejoin="round" />
            ) : (
              <polyline points={value.pts.map(([x, y]) => `${x * u},${y * u}`).join(' ')} fill="none" stroke="#4f46e5" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
            )
          )}
          {Array.from({ length: size + 1 }).map((_, y) =>
            Array.from({ length: size + 1 }).map((_, x) => {
              const isFirst = value.pts[0]?.[0] === x && value.pts[0]?.[1] === y && !value.closed && value.pts.length >= 3
              const used = value.pts.some(([px, py]) => px === x && py === y)
              return (
                <g key={`${x},${y}`} onClick={() => tap(x, y)} style={{ cursor: locked ? 'default' : 'pointer' }}>
                  <circle cx={x * u} cy={y * u} r={u / 2.2} fill="transparent" />
                  <circle cx={x * u} cy={y * u} r={isFirst ? 9 : used ? 7 : 4.5} fill={isFirst ? '#f97316' : used ? '#4f46e5' : '#64748b'} className={isFirst ? 'animate-pulse' : ''} />
                </g>
              )
            }),
          )}
        </svg>
        <p className="text-center text-sm font-bold text-ink-soft">
          {value.closed ? 'Şekil tamam! Yeni şekil için bir çiviye dokun.' : value.pts.length >= 3 ? 'Şekli kapatmak için turuncu çiviye dokun.' : 'Köşeleri sırayla seçmek için çivilere dokun.'}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <ToolButton onClick={() => onChange({ pts: value.pts.slice(0, -1), closed: false })} disabled={locked || value.pts.length === 0}><Undo2 size={16} />Geri al</ToolButton>
          <ToolButton onClick={() => onChange({ pts: [], closed: false })} disabled={locked || value.pts.length === 0}><RotateCcw size={16} />Temizle</ToolButton>
        </div>
        {value.closed && (!target || locked) && (
          <Readout>
            {value.pts.length} kenar · Alan {polyArea(value.pts).toLocaleString('tr-TR')} br² {per !== null && <>· Çevre {per} br</>}
          </Readout>
        )}
      </div>
    )
  },
}

// ─── Simetri ───────────────────────────────────────────────────────────────
type Sym = string[]
const mirror = (cells: string[], axis: 'v' | 'h', cols: number, rows: number) =>
  cells.map((c) => {
    const [x, y] = c.split(',').map(Number)
    return axis === 'v' ? `${cols - 1 - x},${y}` : `${x},${rows - 1 - y}`
  })

export const symmetry: ToolDef<Sym> = {
  id: 'symmetry',
  defaultConfig: { size: 10 },
  initial: () => [],
  check: (v, t, c) => {
    const size = c.size ?? 10
    const axis = (t.axis as 'v' | 'h') ?? 'v'
    const given = new Set((t.cells as string[]) ?? [])
    const need = new Set(mirror([...given], axis, size, size).filter((x) => !given.has(x)))
    const mine = new Set(v.filter((x) => !given.has(x)))
    return mine.size === need.size && [...need].every((x) => mine.has(x))
  },
  Component: ({ value, onChange, config, target, locked }) => {
    const size = config.size ?? 10
    const axis = ((target?.axis as 'v' | 'h') ?? 'v')
    const given = (target?.cells as string[]) ?? []
    const [color, setColor] = useState('#f97316')
    const toggle = (x: number, y: number) => {
      if (locked) return
      const k = `${x},${y}`
      if (given.includes(k)) return
      if (target) return onChange(value.includes(k) ? value.filter((c) => c !== k) : [...value, k])
      // Serbest mod: aynalı boya
      const m = mirror([k], axis, size, size)[0]
      const has = value.includes(k)
      onChange(has ? value.filter((c) => c !== k && c !== m) : [...new Set([...value, k, m])])
    }
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="w-full max-w-md">
          <GridSvg cols={size} rows={size} cells={value} color={target ? '#6366f1' : color} extra={{ cells: given, color: '#f97316' }} axis={axis} axisAt={size / 2} onCell={toggle} />
        </div>
        {target ? (
          <p className="text-center text-sm font-bold text-ink-soft">Turuncu şeklin kırmızı çizgiye göre simetriğini boya. Kareye dokun.</p>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {['#f97316', '#6366f1', '#22c55e', '#ec4899', '#eab308'].map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} className={`size-9 rounded-full ring-offset-2 ${color === c ? 'ring-3 ring-ink' : ''}`} style={{ background: c }} aria-label="Renk seç" />
            ))}
            <ToolButton onClick={() => onChange([])}><RotateCcw size={16} />Temizle</ToolButton>
          </div>
        )}
      </div>
    )
  },
}

// ─── Açı ölçer ─────────────────────────────────────────────────────────────
export const angle: ToolDef<number> = {
  id: 'angle',
  defaultConfig: {},
  initial: () => 30,
  check: (v, t) => Math.abs(v - n(t, 'degrees')) <= 3,
  Component: ({ value, onChange, target, locked }) => {
    const ref = useRef<SVGSVGElement>(null)
    const drag = useRef(false)
    const cx = 160, cy = 170, R = 140
    const move = (e: React.PointerEvent) => {
      if (!ref.current || locked) return
      const pt = ref.current.createSVGPoint()
      pt.x = e.clientX; pt.y = e.clientY
      const p = pt.matrixTransform(ref.current.getScreenCTM()!.inverse())
      let a = (Math.atan2(cy - p.y, p.x - cx) * 180) / Math.PI
      if (a < 0) a = a < -90 ? 180 : 0
      onChange(Math.round(Math.max(0, Math.min(180, a))))
    }
    const rad = (value * Math.PI) / 180
    const type = value === 0 ? 'Sıfır açı' : value < 90 ? 'Dar açı' : value === 90 ? 'Dik açı' : value < 180 ? 'Geniş açı' : 'Doğru açı'
    return (
      <div className="flex flex-col items-center gap-3">
        <svg
          ref={ref}
          viewBox="0 0 320 190"
          className="w-full max-w-lg touch-none select-none"
          onPointerDown={(e) => { drag.current = true; (e.currentTarget as Element).setPointerCapture(e.pointerId); move(e) }}
          onPointerMove={(e) => drag.current && move(e)}
          onPointerUp={() => (drag.current = false)}
        >
          <path d={`M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy} Z`} fill="#fef9c3" fillOpacity={0.7} stroke="#ca8a04" strokeWidth={1.5} />
          {Array.from({ length: 181 }).map((_, d) => {
            const a = (d * Math.PI) / 180
            const len = d % 10 === 0 ? 14 : d % 5 === 0 ? 9 : 5
            return <line key={d} x1={cx + R * Math.cos(a)} y1={cy - R * Math.sin(a)} x2={cx + (R - len) * Math.cos(a)} y2={cy - (R - len) * Math.sin(a)} stroke="#a16207" strokeWidth={d % 10 === 0 ? 1.4 : 0.7} />
          })}
          {Array.from({ length: 19 }).map((_, i) => {
            const d = i * 10, a = (d * Math.PI) / 180
            return (
              <g key={d}>
                <text x={cx + (R - 24) * Math.cos(a)} y={cy - (R - 24) * Math.sin(a) + 3} textAnchor="middle" fontSize={8.5} fontWeight={800} fill="#713f12">{d}</text>
                <text x={cx + (R - 38) * Math.cos(a)} y={cy - (R - 38) * Math.sin(a) + 3} textAnchor="middle" fontSize={7} fill="#a16207">{180 - d}</text>
              </g>
            )
          })}
          <path d={`M${cx + 40} ${cy} A40 40 0 0 0 ${cx + 40 * Math.cos(rad)} ${cy - 40 * Math.sin(rad)}`} fill="none" stroke="#f97316" strokeWidth={4} />
          <line x1={cx} y1={cy} x2={cx + R + 10} y2={cy} stroke="#1f2340" strokeWidth={4} strokeLinecap="round" />
          <line x1={cx} y1={cy} x2={cx + (R + 10) * Math.cos(rad)} y2={cy - (R + 10) * Math.sin(rad)} stroke="#3b82f6" strokeWidth={5} strokeLinecap="round" />
          <circle cx={cx + (R + 10) * Math.cos(rad)} cy={cy - (R + 10) * Math.sin(rad)} r={11} fill="#3b82f6" stroke="#fff" strokeWidth={3} />
          <circle cx={cx} cy={cy} r={5} fill="#1f2340" />
        </svg>
        <p className="-mt-1 text-sm font-bold text-ink-soft">Mavi ışının ucunu sürükle.</p>
        <div className="flex gap-2">
          <ToolButton onClick={() => !locked && onChange(Math.max(0, value - 1))} disabled={locked}>−1°</ToolButton>
          <ToolButton onClick={() => !locked && onChange(Math.min(180, value + 1))} disabled={locked}>+1°</ToolButton>
        </div>
        {!target && <Readout>{value}° · {type}</Readout>}
      </div>
    )
  },
}

// ─── Koordinat düzlemi ─────────────────────────────────────────────────────
type CP = { x: number; y: number }[]

function CoordShapes({ value, onChange, target, locked }: { value: CP; onChange: (v: CP) => void; target?: Record<string, unknown>; locked?: boolean }) {
  const P = usePlane()
  const letters = 'ABCDEFGH'
  return (
    <g>
      {!target && value.length >= 3 && (
        <polygon points={value.map((p) => `${P.sx(p.x)},${P.sy(p.y)}`).join(' ')} fill="#d6457a" fillOpacity={0.18} stroke="#d6457a" strokeWidth={2.5} strokeLinejoin="round" pointerEvents="none" />
      )}
      {value.map((p, i) => (
        <DragPoint
          key={i}
          x={p.x}
          y={p.y}
          label={target ? 'P' : `${letters[i]}(${p.x}, ${p.y})`}
          snapStep={1}
          disabled={locked}
          onChange={(q) => onChange(value.map((o, j) => (j === i ? { x: Math.round(q.x), y: Math.round(q.y) } : o)))}
        />
      ))}
    </g>
  )
}

export const coordinate: ToolDef<CP> = {
  id: 'coordinate',
  defaultConfig: { size: 6 },
  initial: () => [],
  check: (v, t) => {
    const last = v[v.length - 1]
    return !!last && last.x === n(t, 'x') && last.y === n(t, 'y')
  },
  Component: ({ value, onChange, config, target, locked }) => {
    const range = config.size ?? 6
    const tap = (p: { x: number; y: number }) => {
      if (locked) return
      const q = { x: Math.round(p.x), y: Math.round(p.y) }
      if (target) return onChange([q])
      const exists = value.findIndex((o) => o.x === q.x && o.y === q.y)
      if (exists >= 0) return onChange(value.filter((_, i) => i !== exists))
      onChange([...value, q].slice(-8))
    }
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="w-full max-w-xl">
          <Plane initial={{ xMin: -range - 0.5, xMax: range + 0.5, yMin: -range - 0.5, yMax: range + 0.5 }} onTap={tap} fixedStep={range > 12 ? undefined : 1} minSpan={4} maxSpan={80} xLabel="x" yLabel="y" label="Koordinat düzlemi">
            <CoordShapes value={value} onChange={onChange} target={target} locked={locked} />
          </Plane>
        </div>
        <p className="text-sm font-bold text-ink-soft">Kesişim noktalarına dokunarak nokta koy; noktaları sürükleyebilirsin.</p>
        {!target && value.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <ToolButton onClick={() => onChange([])}><RotateCcw size={16} />Temizle</ToolButton>
          </div>
        )}
      </div>
    )
  },
}

// ─── Açınımlar ─────────────────────────────────────────────────────────────
type Solid = 'cube' | 'cuboid' | 'triangular-prism' | 'pyramid' | 'cylinder' | 'cone'
const SOLIDS: { id: Solid; name: string }[] = [
  { id: 'cube', name: 'Küp' },
  { id: 'cuboid', name: 'Dikdörtgenler prizması' },
  { id: 'triangular-prism', name: 'Üçgen prizma' },
  { id: 'pyramid', name: 'Kare dik piramit' },
  { id: 'cylinder', name: 'Silindir' },
  { id: 'cone', name: 'Koni' },
]

export function NetSvg({ solid }: { solid: Solid }) {
  const f = { fill: '#e0e7ff', stroke: '#1f2340', strokeWidth: 2, strokeLinejoin: 'round' as const }
  const b = { ...f, fill: '#c7d2fe' }
  const s = 40
  switch (solid) {
    case 'cube':
      return (
        <svg viewBox={`0 0 ${4 * s + 4} ${3 * s + 4}`}><g transform="translate(2 2)">
          {[[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]].map(([x, y], i) => <rect key={i} x={x * s} y={y * s} width={s} height={s} {...(i === 2 ? b : f)} />)}
        </g></svg>
      )
    case 'cuboid': {
      const w = 50, h = 30, d = 22
      return (
        <svg viewBox={`0 0 ${2 * w + 2 * d + 4} ${2 * h + 2 * d + 4}`}><g transform="translate(2 2)">
          <rect x={d} y={0} width={w} height={d} {...f} />
          <rect x={0} y={d} width={d} height={h} {...f} />
          <rect x={d} y={d} width={w} height={h} {...b} />
          <rect x={d + w} y={d} width={d} height={h} {...f} />
          <rect x={2 * d + w} y={d} width={w} height={h} {...f} />
          <rect x={d} y={d + h} width={w} height={d} {...f} />
        </g></svg>
      )
    }
    case 'triangular-prism':
      return (
        <svg viewBox="0 0 184 124"><g transform="translate(2 2)">
          {[0, 1, 2].map((i) => <rect key={i} x={i * 60} y={34} width={60} height={50} {...(i === 1 ? b : f)} />)}
          <polygon points="60,34 120,34 90,0" {...f} />
          <polygon points="60,84 120,84 90,118" {...f} />
        </g></svg>
      )
    case 'pyramid':
      return (
        <svg viewBox="0 0 164 164"><g transform="translate(2 2)">
          <rect x={50} y={50} width={60} height={60} {...b} />
          <polygon points="50,50 110,50 80,0" {...f} />
          <polygon points="50,110 110,110 80,160" {...f} />
          <polygon points="50,50 50,110 0,80" {...f} />
          <polygon points="110,50 110,110 160,80" {...f} />
        </g></svg>
      )
    case 'cylinder':
      return (
        <svg viewBox="0 0 164 164"><g transform="translate(2 2)">
          <rect x={0} y={42} width={160} height={70} {...b} />
          <circle cx={50} cy={21} r={21} {...f} />
          <circle cx={50} cy={133} r={21} {...f} />
        </g></svg>
      )
    case 'cone':
      return (
        <svg viewBox="0 0 164 164"><g transform="translate(2 2)">
          <path d="M80 10 L10 100 A90 90 0 0 0 150 100 Z" {...b} transform="translate(0 -6)" />
          <circle cx={80} cy={138} r={22} {...f} />
        </g></svg>
      )
  }
}

/** Küp açınımını 3B katlama (CSS 3D) */
function CubeFold({ t }: { t: number }) {
  const s = 64
  const a = 90 * t
  const face = 'absolute inset-0 border-2 border-ink bg-indigo-100/90 [backface-visibility:visible]'
  return (
    <div className="mx-auto" style={{ width: 4 * s, height: 3 * s + 40, perspective: 700 }}>
      <div className="relative" style={{ width: s, height: s, left: s, top: s + 20, transformStyle: 'preserve-3d', transform: `rotateX(${55 * t}deg) rotateZ(${-30 * t}deg)`, transition: 'transform .2s' }}>
        <div className={`${face} bg-indigo-300/90`} />
        <div className={face} style={{ transformOrigin: 'top', transform: `translateY(${s}px) rotateX(${a}deg)` }} />
        <div className={face} style={{ transformOrigin: 'right', transform: `translateX(${-s}px) rotateY(${a}deg)` }} />
        <div className={face} style={{ transformOrigin: 'left', transform: `translateX(${s}px) rotateY(${-a}deg)`, transformStyle: 'preserve-3d' }}>
          <div className={face} style={{ transformOrigin: 'left', transform: `translateX(${s}px) rotateY(${-a}deg)` }} />
        </div>
        <div className={face} style={{ transformOrigin: 'bottom', transform: `translateY(${-s}px) rotateX(${-a}deg)` }} />
      </div>
    </div>
  )
}

type NetsV = { solid: Solid; fold: number; pick: Solid | null }
export const nets: ToolDef<NetsV> = {
  id: 'nets',
  defaultConfig: {},
  initial: (_c, t) => ({ solid: ((t?.solid as Solid) ?? 'cube'), fold: 0, pick: null }),
  check: (v, t) => v.pick === t.solid,
  Component: ({ value, onChange, target, locked }) => {
    if (target) {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="w-full max-w-60 rounded-2xl bg-white p-4 ring-1 ring-line"><NetSvg solid={target.solid as Solid} /></div>
          <p className="font-bold text-ink-soft">Bu açınım katlanınca hangi cisim oluşur?</p>
          <div className="grid w-full grid-cols-3 gap-2 sm:grid-cols-6">
            {SOLIDS.map((so) => (
              <button key={so.id} type="button" disabled={locked} onClick={() => onChange({ ...value, pick: so.id })} className={`flex flex-col items-center rounded-2xl border-2 p-2 text-xs font-extrabold transition ${value.pick === so.id ? 'border-brand bg-brand-soft' : 'border-line bg-white hover:border-brand/40'}`}>
                <div className="w-16"><ShapeSvg shape={so.id as ShapeName} /></div>
                {so.name}
              </button>
            ))}
          </div>
        </div>
      )
    }
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap justify-center gap-1.5">
          {SOLIDS.map((so) => <ToolButton key={so.id} active={value.solid === so.id} onClick={() => onChange({ ...value, solid: so.id, fold: 0 })}>{so.name}</ToolButton>)}
        </div>
        <div className="grid w-full items-center gap-4 sm:grid-cols-2">
          <div className="mx-auto w-full max-w-48 rounded-2xl bg-white p-4 ring-1 ring-line"><ShapeSvg shape={value.solid as ShapeName} /></div>
          <div className="mx-auto w-full max-w-64 rounded-2xl bg-white p-4 ring-1 ring-line">
            {value.solid === 'cube' ? <CubeFold t={value.fold} /> : <NetSvg solid={value.solid} />}
          </div>
        </div>
        {value.solid === 'cube' && (
          <label className="flex w-full max-w-sm items-center gap-3 font-bold">
            <span className="text-sm text-ink-soft">Aç</span>
            <input type="range" min={0} max={1} step={0.01} value={value.fold} onChange={(e) => onChange({ ...value, fold: Number(e.target.value) })} className="flex-1 accent-[#d6457a]" aria-label="Katla" />
            <span className="text-sm text-ink-soft">Katla</span>
          </label>
        )}
      </div>
    )
  },
}
