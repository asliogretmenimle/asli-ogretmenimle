import { useEffect, useRef, useState } from 'react'
import { DragPoint, Pinchable, Plane, usePlane } from '../../interactive/Plane'
import { Stepper, ToolButton } from '../ui'
import type { ToolDef } from '../types'

/**
 * Dönüşüm Düzlemi
 *  - Öteleme: görüntüyü (pembe şekil) tek parmakla sürükle ya da A′ ucundaki vektör tutamacını çek.
 *  - Yansıma: x ekseni, y ekseni, y = x ya da sürüklenebilir dikey/yatay doğru. Her köşe ile görüntüsü arasındaki
 *    bağlantılar doğruya dik ve doğrudan eşit uzaklıktadır.
 *  - Döndürme: merkez noktasını sürükle; 90° / 180° / 270° düğmeleri ya da görüntünün üzerinde iki parmakla döndür
 *    (90°’nin katlarına yapışır).
 *  Kural canlı yazılır: (x, y) → (x + 3, y − 2). Koordinat tablosu ön görüntü ↔ görüntüyü eşler.
 *  Ön görüntünün köşeleri serbest modda sürüklenebilir.
 *
 * Görev hedefi (target):
 *   { image: [[x, y], ...], shape?: [[x, y], ...], op?: 'oteleme' | 'yansima' | 'dondurme' }
 *   - shape: ön görüntü (yoksa varsayılan üçgen (1,1), (4,1), (1,3))
 *   - image: ulaşılması gereken görüntünün köşeleri (sıra önemsiz); düzlemde kesikli “hedef” olarak çizilir
 *   - op: belirli bir dönüşüm türü zorunluysa
 *   Görev modunda ön görüntü kilitlidir; kural ve görüntü koordinatları gizlenir.
 */

type Pt = [number, number]
type Op = 'oteleme' | 'yansima' | 'dondurme'
type Axis = 'x' | 'y' | 'yx' | 'v' | 'h'
type V = { shape: Pt[]; op: Op; t: Pt; axis: Axis; k: number; center: Pt; deg: number }

const PRE = '#4f46e5'
const IMG = '#d6457a'
const LETTERS = 'ABCDEFGH'
const PRESETS: { name: string; pts: Pt[] }[] = [
  { name: 'Üçgen', pts: [[-5, 1], [-2, 1], [-5, 4]] },
  { name: 'Dörtgen', pts: [[-5, 1], [-2, 1], [-3, 3], [-5, 2]] },
  { name: 'L şekli', pts: [[-5, 1], [-3, 1], [-3, 2], [-4, 2], [-4, 4], [-5, 4]] },
]
const TASK_SHAPE: Pt[] = [[1, 1], [4, 1], [1, 3]]
const r6 = (v: number) => Math.round(v * 1e6) / 1e6
const num = (v: number) => (Object.is(r6(v), -0) ? 0 : r6(v)).toLocaleString('tr-TR', { maximumFractionDigits: 2 }).replace('-', '−')

function mapPoint(v: V, [x, y]: Pt, degOverride?: number): Pt {
  if (v.op === 'oteleme') return [x + v.t[0], y + v.t[1]]
  if (v.op === 'yansima') {
    if (v.axis === 'x') return [x, -y]
    if (v.axis === 'y') return [-x, y]
    if (v.axis === 'yx') return [y, x]
    if (v.axis === 'v') return [2 * v.k - x, y]
    return [x, 2 * v.k - y]
  }
  const d = (((degOverride ?? v.deg) % 360) + 360) % 360
  const [a, b] = v.center
  const t = (d * Math.PI) / 180
  const dx = x - a, dy = y - b
  return [r6(a + dx * Math.cos(t) - dy * Math.sin(t)), r6(b + dx * Math.sin(t) + dy * Math.cos(t))]
}
const imageOf = (v: V) => v.shape.map((p) => mapPoint(v, p))

/** ±x + c biçiminde doğrusal ifade */
function lin(sign: 1 | -1, name: 'x' | 'y', c: number) {
  if (sign === 1) return c === 0 ? name : c > 0 ? `${name} + ${num(c)}` : `${name} − ${num(-c)}`
  return c === 0 ? `−${name}` : c > 0 ? `${num(c)} − ${name}` : `−${name} − ${num(-c)}`
}
function ruleOf(v: V) {
  if (v.op === 'oteleme') return `(x, y) → (${lin(1, 'x', v.t[0])}, ${lin(1, 'y', v.t[1])})`
  if (v.op === 'yansima') {
    if (v.axis === 'x') return '(x, y) → (x, −y)'
    if (v.axis === 'y') return '(x, y) → (−x, y)'
    if (v.axis === 'yx') return '(x, y) → (y, x)'
    if (v.axis === 'v') return `(x, y) → (${lin(-1, 'x', 2 * v.k)}, y)`
    return `(x, y) → (x, ${lin(-1, 'y', 2 * v.k)})`
  }
  const [a, b] = v.center
  const d = ((v.deg % 360) + 360) % 360
  if (d === 0) return '(x, y) → (x, y)'
  if (d === 90) return `(x, y) → (${lin(-1, 'y', a + b)}, ${lin(1, 'x', b - a)})`
  if (d === 180) return `(x, y) → (${lin(-1, 'x', 2 * a)}, ${lin(-1, 'y', 2 * b)})`
  return `(x, y) → (${lin(1, 'y', a - b)}, ${lin(-1, 'x', a + b)})`
}
function describe(v: V) {
  if (v.op === 'oteleme') {
    const [dx, dy] = v.t
    const h = dx ? `${Math.abs(dx)} birim ${dx > 0 ? 'sağa' : 'sola'}` : ''
    const w = dy ? `${Math.abs(dy)} birim ${dy > 0 ? 'yukarı' : 'aşağı'}` : ''
    return [h, w].filter(Boolean).join(', ') || 'Hiç kaydırılmadı'
  }
  if (v.op === 'yansima') return v.axis === 'x' ? 'x eksenine göre yansıma' : v.axis === 'y' ? 'y eksenine göre yansıma' : v.axis === 'yx' ? 'y = x doğrusuna göre yansıma' : v.axis === 'v' ? `x = ${num(v.k)} doğrusuna göre yansıma` : `y = ${num(v.k)} doğrusuna göre yansıma`
  const d = ((v.deg % 360) + 360) % 360
  const c = v.center[0] === 0 && v.center[1] === 0 ? 'orijin' : `(${num(v.center[0])}, ${num(v.center[1])})`
  return d === 0 ? 'Döndürülmedi' : `${c} etrafında ${d === 270 ? '90° saat yönünde' : `${d}° saatin tersi yönünde`}`
}

/* ───────────────────────────── Sahne ───────────────────────────── */
function Scene({ value, onChange, locked, task, goal }: { value: V; onChange: (v: V) => void; locked?: boolean; task: boolean; goal: Pt[] | null }) {
  const P = usePlane()
  const img = imageOf(value)
  const px = (p: Pt) => [P.sx(p[0]), P.sy(p[1])] as const
  const pts = (ps: Pt[]) => ps.map((p) => px(p).join(',')).join(' ')
  const editable = !locked && !task

  // öteleme: sürüklerken küçük adımları biriktir
  const acc = useRef<{ key: string; x: number; y: number } | null>(null)
  const keyT = value.t.join(',')
  const onMove = (dx: number, dy: number) => {
    if (!acc.current || acc.current.key !== keyT) acc.current = { key: keyT, x: value.t[0], y: value.t[1] }
    acc.current.x += dx
    acc.current.y += dy
    const t: Pt = [Math.round(acc.current.x), Math.round(acc.current.y)]
    acc.current.key = t.join(',')
    if (t[0] !== value.t[0] || t[1] !== value.t[1]) onChange({ ...value, t })
  }

  // döndürme: iki parmak, 90°’nin katlarına yapışır; parmak hareketi hayalet şekille gösterilir
  const [ghost, setGhost] = useState<number | null>(null)
  const rot = useRef<{ acc: number; active: boolean; timer?: number }>({ acc: 0, active: false })
  const onRotate = (deg: number) => {
    if (!rot.current.active) { rot.current.acc = value.deg; rot.current.active = true }
    rot.current.acc -= deg
    const a = rot.current.acc
    setGhost(a)
    const snapped = ((Math.round(a / 90) * 90) % 360 + 360) % 360
    if (snapped !== value.deg) onChange({ ...value, deg: snapped })
    window.clearTimeout(rot.current.timer)
    rot.current.timer = window.setTimeout(() => { rot.current.active = false; setGhost(null) }, 350)
  }
  useEffect(() => () => window.clearTimeout(rot.current.timer), [])

  const far = (P.view.xMax - P.view.xMin) * 2
  const A = value.shape[0], A2 = img[0]

  return (
    <g>
      {/* hedef */}
      {goal && <polygon points={pts(goal)} fill="#16a34a" fillOpacity={0.08} stroke="#16a34a" strokeWidth={2.5} strokeDasharray="8 6" pointerEvents="none" />}
      {goal && <text x={P.sx(goal[0][0])} y={P.sy(goal[0][1]) + 20} textAnchor="middle" fontSize={12} fontWeight={900} fill="#15803d" pointerEvents="none">hedef</text>}

      {/* yansıma doğrusu */}
      {value.op === 'yansima' && (() => {
        const ax = value.axis
        const L: [Pt, Pt] = ax === 'x' ? [[-far, 0], [far, 0]] : ax === 'y' ? [[0, -far], [0, far]] : ax === 'yx' ? [[-far, -far], [far, far]] : ax === 'v' ? [[value.k, -far], [value.k, far]] : [[-far, value.k], [far, value.k]]
        return (
          <g pointerEvents="none">
            <line x1={px(L[0])[0]} y1={px(L[0])[1]} x2={px(L[1])[0]} y2={px(L[1])[1]} stroke="#f59e0b" strokeWidth={4} strokeDasharray="12 7" />
          </g>
        )
      })()}

      {/* köşe ↔ görüntü bağlantıları */}
      {value.shape.map((p, i) => {
        const q = img[i]
        const [x1, y1] = px(p), [x2, y2] = px(q)
        if (value.op === 'dondurme') return null
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
        const len = Math.hypot(x2 - x1, y2 - y1)
        const main = i === 0 && value.op === 'oteleme'
        return (
          <g key={i} pointerEvents="none">
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={main ? '#0f766e' : '#94a3b8'} strokeWidth={main ? 3 : 1.6} strokeDasharray={main ? undefined : '4 4'} markerEnd={value.op === 'oteleme' && len > 14 ? `url(#dn-ok${main ? 'M' : ''})` : undefined} />
            {value.op === 'yansima' && len > 20 && (
              <g stroke="#f59e0b" strokeWidth={2.5}>
                {[0.25, 0.75].map((f) => {
                  const cx = x1 + (x2 - x1) * f, cy = y1 + (y2 - y1) * f
                  const nx = -(y2 - y1) / len * 6, ny = (x2 - x1) / len * 6
                  return <line key={f} x1={cx - nx} y1={cy - ny} x2={cx + nx} y2={cy + ny} />
                })}
                <circle cx={mx} cy={my} r={3} fill="#f59e0b" />
              </g>
            )}
          </g>
        )
      })}
      <defs>
        <marker id="dn-ok" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#94a3b8" /></marker>
        <marker id="dn-okM" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={5} markerHeight={5} orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#0f766e" /></marker>
      </defs>

      {/* döndürme yayı */}
      {value.op === 'dondurme' && (() => {
        const C: Pt = value.center
        const [cx, cy] = px(C)
        const d = ((value.deg % 360) + 360) % 360
        const r = Math.hypot(A[0] - C[0], A[1] - C[1]) * P.unitPx
        const a0 = Math.atan2(A[1] - C[1], A[0] - C[0])
        const sweep = d === 270 ? -Math.PI / 2 : (d * Math.PI) / 180
        const a1 = a0 + sweep
        const e = [cx + r * Math.cos(a1), cy - r * Math.sin(a1)]
        const s = [cx + r * Math.cos(a0), cy - r * Math.sin(a0)]
        const mid = a0 + sweep / 2
        return (
          <g pointerEvents="none">
            <line x1={cx} y1={cy} x2={px(A)[0]} y2={px(A)[1]} stroke={PRE} strokeWidth={2} strokeDasharray="5 4" />
            <line x1={cx} y1={cy} x2={px(A2)[0]} y2={px(A2)[1]} stroke={IMG} strokeWidth={2} strokeDasharray="5 4" />
            {d !== 0 && r > 4 && (
              <>
                <path d={`M${s[0]} ${s[1]}A${r} ${r} 0 ${Math.abs(sweep) > Math.PI ? 1 : 0} ${sweep > 0 ? 0 : 1} ${e[0]} ${e[1]}`} fill="none" stroke="#0f766e" strokeWidth={2.5} markerEnd="url(#dn-okM)" />
                <text x={cx + (r + 18) * Math.cos(mid)} y={cy - (r + 18) * Math.sin(mid) + 5} textAnchor="middle" fontSize={14} fontWeight={900} fill="#0f766e" paintOrder="stroke" stroke="#fff" strokeWidth={4}>{d === 270 ? '90° ↻' : `${d}° ↺`}</text>
              </>
            )}
          </g>
        )
      })()}

      {/* ön görüntü */}
      <polygon points={pts(value.shape)} fill={PRE} fillOpacity={0.16} stroke={PRE} strokeWidth={3} strokeLinejoin="round" pointerEvents="none" />
      {ghost !== null && <polygon points={pts(value.shape.map((p) => mapPoint(value, p, ghost)))} fill={IMG} fillOpacity={0.1} stroke={IMG} strokeWidth={2} strokeDasharray="5 5" pointerEvents="none" />}

      {/* görüntü */}
      <Pinchable onMove={!locked && value.op === 'oteleme' ? onMove : undefined} onRotate={!locked && value.op === 'dondurme' ? onRotate : undefined}>
        <polygon points={pts(img)} fill="transparent" stroke="transparent" strokeWidth={44} strokeLinejoin="round" />
        <polygon points={pts(img)} fill={IMG} fillOpacity={0.28} stroke={IMG} strokeWidth={3.5} strokeLinejoin="round" />
      </Pinchable>
      {img.map((q, i) => (
        <g key={i} pointerEvents="none">
          <circle cx={px(q)[0]} cy={px(q)[1]} r={5} fill={IMG} />
          <text x={px(q)[0] + 8} y={px(q)[1] - 8} fontSize={14} fontWeight={900} fill={IMG} paintOrder="stroke" stroke="#fff" strokeWidth={4}>{LETTERS[i]}′</text>
        </g>
      ))}

      {/* tutamaçlar */}
      {value.op === 'oteleme' && !locked && <DragPoint x={A2[0]} y={A2[1]} r={10} color="#0f766e" onChange={(p) => onChange({ ...value, t: [Math.round(p.x - A[0]), Math.round(p.y - A[1])] })} />}
      {value.op === 'yansima' && (value.axis === 'v' || value.axis === 'h') && !locked && (
        <DragPoint
          x={value.axis === 'v' ? value.k : (P.view.xMin + P.view.xMax) / 2 + (P.view.xMax - P.view.xMin) * 0.3}
          y={value.axis === 'h' ? value.k : (P.view.yMin + P.view.yMax) / 2 + (P.view.yMax - P.view.yMin) * 0.3}
          r={12}
          color="#f59e0b"
          label={value.axis === 'v' ? `x = ${num(value.k)}` : `y = ${num(value.k)}`}
          onChange={(p) => onChange({ ...value, k: Math.round((value.axis === 'v' ? p.x : p.y) * 2) / 2 })}
        />
      )}
      {value.op === 'dondurme' && <DragPoint x={value.center[0]} y={value.center[1]} r={10} color="#0f766e" label="M" disabled={locked} onChange={(p) => onChange({ ...value, center: [Math.round(p.x), Math.round(p.y)] })} />}
      {value.shape.map((p, i) =>
        editable ? (
          <DragPoint key={i} x={p[0]} y={p[1]} r={10} color={PRE} label={LETTERS[i]} onChange={(q) => {
            const np: Pt = [Math.round(q.x), Math.round(q.y)]
            if (value.shape.some((s, j) => j !== i && s[0] === np[0] && s[1] === np[1])) return
            onChange({ ...value, shape: value.shape.map((s, j) => (j === i ? np : s)) })
          }} />
        ) : (
          <g key={i} pointerEvents="none">
            <circle cx={px(p)[0]} cy={px(p)[1]} r={5} fill={PRE} />
            <text x={px(p)[0] + 8} y={px(p)[1] - 8} fontSize={14} fontWeight={900} fill={PRE} paintOrder="stroke" stroke="#fff" strokeWidth={4}>{LETTERS[i]}</text>
          </g>
        ),
      )}
    </g>
  )
}


/** Dar ekran (telefon) mı? */
function useNarrow(q = '(max-width: 640px)') {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const f = () => setM(mq.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [q])
  return m
}

/* ───────────────────────────── Araç ───────────────────────────── */
const OPS: { id: Op; label: string }[] = [
  { id: 'oteleme', label: '➡️ Öteleme' },
  { id: 'yansima', label: '🪞 Yansıma' },
  { id: 'dondurme', label: '🔄 Döndürme' },
]
const AXES: { id: Axis; label: string }[] = [
  { id: 'x', label: 'x ekseni' },
  { id: 'y', label: 'y ekseni' },
  { id: 'yx', label: 'y = x' },
  { id: 'v', label: 'Dikey doğru' },
  { id: 'h', label: 'Yatay doğru' },
]
const toPts = (x: unknown): Pt[] | null => (Array.isArray(x) ? (x as number[][]).map((p) => [Number(p[0]), Number(p[1])] as Pt) : null)

export const donusum: ToolDef<V> = {
  id: 'donusum',
  defaultConfig: {},
  initial: (_c, t) => {
    const shape = toPts(t?.shape) ?? (t ? TASK_SHAPE : PRESETS[0].pts)
    const op = (t?.op as Op) ?? 'oteleme'
    return { shape, op, t: t ? [0, 0] : [6, -3], axis: 'y', k: 0, center: [0, 0], deg: t ? 0 : 90 }
  },
  check: (v, t) => {
    const goal = toPts(t.image)
    if (!goal) return false
    if (t.op && v.op !== t.op) return false
    const img = imageOf(v)
    if (img.length !== goal.length) return false
    const k = (p: Pt) => `${r6(p[0])},${r6(p[1])}`
    const want = new Set(goal.map(k))
    return img.every((p) => want.has(k(p)))
  },
  Component: ({ value, onChange, target, locked }) => {
    const task = !!target
    const narrow = useNarrow()
    const goal = toPts(target?.image)
    const img = imageOf(value)
    const set = (p: Partial<V>) => !locked && onChange({ ...value, ...p })
    const opLocked = task && !!target?.op

    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap justify-center gap-1.5">
            {OPS.map((o) => <ToolButton key={o.id} active={value.op === o.id} disabled={locked || (opLocked && o.id !== value.op)} onClick={() => set({ op: o.id })}>{o.label}</ToolButton>)}
          </div>
          <Plane key={String(narrow)} initial={narrow ? { xMin: -7, xMax: 7, yMin: -7, yMax: 7 } : { xMin: -8, xMax: 8, yMin: -6.5, yMax: 6.5 }} aspect={narrow ? 1 : 0.8} xLabel="x" yLabel="y" label="Dönüşüm düzlemi" locked={locked}>
            <Scene value={value} onChange={onChange} locked={locked} task={task} goal={goal} />
          </Plane>
          <p className="text-center text-sm font-bold text-ink-soft">
            {value.op === 'oteleme' && 'Pembe görüntüyü sürükle ya da yeşil vektör ucunu çek.'}
            {value.op === 'yansima' && 'Yansıma doğrusunu seç. Dikey/yatay doğruyu turuncu tutamaçtan sürükle.'}
            {value.op === 'dondurme' && 'M merkezini sürükle. Görüntünün üstünde iki parmakla döndür ya da düğmeleri kullan.'}
            {!task && ' Mavi köşeleri sürükleyerek şekli değiştirebilirsin.'}
          </p>
          <div className="flex flex-wrap items-end justify-center gap-2">
            {value.op === 'oteleme' && (
              <>
                <Stepper label="x yönünde" value={num(value.t[0])} onDec={() => set({ t: [value.t[0] - 1, value.t[1]] })} onInc={() => set({ t: [value.t[0] + 1, value.t[1]] })} disabled={locked} color="#0f766e" />
                <Stepper label="y yönünde" value={num(value.t[1])} onDec={() => set({ t: [value.t[0], value.t[1] - 1] })} onInc={() => set({ t: [value.t[0], value.t[1] + 1] })} disabled={locked} color="#0f766e" />
              </>
            )}
            {value.op === 'yansima' && (
              <>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {AXES.map((a) => <ToolButton key={a.id} active={value.axis === a.id} disabled={locked} onClick={() => set({ axis: a.id, k: a.id === value.axis ? value.k : a.id === 'v' || a.id === 'h' ? -1 : 0 })}>{a.label}</ToolButton>)}
                </div>
                {(value.axis === 'v' || value.axis === 'h') && <Stepper label={value.axis === 'v' ? 'x =' : 'y ='} value={num(value.k)} onDec={() => set({ k: value.k - 0.5 })} onInc={() => set({ k: value.k + 0.5 })} disabled={locked} color="#b45309" />}
              </>
            )}
            {value.op === 'dondurme' && (
              <div className="flex flex-wrap justify-center gap-1.5">
                <ToolButton active={value.deg === 90} disabled={locked} onClick={() => set({ deg: 90 })}>90° ↺</ToolButton>
                <ToolButton active={value.deg === 180} disabled={locked} onClick={() => set({ deg: 180 })}>180°</ToolButton>
                <ToolButton active={value.deg === 270} disabled={locked} onClick={() => set({ deg: 270 })}>90° ↻</ToolButton>
                <ToolButton active={value.deg === 0} disabled={locked} onClick={() => set({ deg: 0 })}>0°</ToolButton>
                <ToolButton disabled={locked || (value.center[0] === 0 && value.center[1] === 0)} onClick={() => set({ center: [0, 0] })}>Merkez: orijin</ToolButton>
              </div>
            )}
          </div>
          {!task && (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">Şekil</span>
              {PRESETS.map((p) => <ToolButton key={p.name} active={JSON.stringify(p.pts) === JSON.stringify(value.shape)} onClick={() => set({ shape: p.pts })}>{p.name}</ToolButton>)}
            </div>
          )}
        </div>

        <aside className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {(!task || locked) && (
            <div className="self-start rounded-2xl bg-ink p-4 text-white">
              <p className="text-xs font-extrabold tracking-wide text-white/60 uppercase">Kural</p>
              <p className="mt-1 text-2xl font-black tabular-nums">{ruleOf(value)}</p>
              <p className="mt-1 text-sm font-bold text-white/75">{describe(value)}</p>
            </div>
          )}
          {task && !locked && (
            <div className="self-start rounded-2xl bg-ok-soft p-3 text-sm font-bold text-green-900 ring-1 ring-green-200">
              Pembe görüntüyü kesikli yeşil <b>hedefin</b> tam üstüne getir. Hangi dönüşüm işe yarar? Birden fazla yol olabilir!
            </div>
          )}
          <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
            <table className="w-full text-center tabular-nums">
              <thead>
                <tr className="text-xs font-extrabold tracking-wide uppercase">
                  <th className="pb-1 text-left" style={{ color: PRE }}>Ön görüntü</th>
                  <th />
                  <th className="pb-1 text-right" style={{ color: IMG }}>Görüntü</th>
                </tr>
              </thead>
              <tbody>
                {value.shape.map((p, i) => (
                  <tr key={i} className="border-t border-line font-black">
                    <td className="py-1.5 text-left" style={{ color: PRE }}>{LETTERS[i]}({num(p[0])}, {num(p[1])})</td>
                    <td className="text-ink-soft">→</td>
                    <td className="py-1.5 text-right" style={{ color: IMG }}>{task && !locked ? `${LETTERS[i]}′(?, ?)` : `${LETTERS[i]}′(${num(img[i][0])}, ${num(img[i][1])})`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!task && (
            <div className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-950 ring-1 ring-amber-200 sm:col-span-2 lg:col-span-1">
              {value.op === 'oteleme' && 'Ötelemede her köşe aynı miktarda kayar: tüm oklar eşit ve paraleldir. Şekil ne döner ne ters yüz olur.'}
              {value.op === 'yansima' && 'Her köşe ile görüntüsü doğruya eşit uzaklıkta; aralarındaki çizgi doğruya diktir. Şekil ters yüz olur (A, B, C sırası tersine döner).'}
              {value.op === 'dondurme' && 'Merkezden her köşeye ve görüntüsüne olan uzaklık aynıdır. 90° döndürmede x ile y yer değiştirir ve biri işaret değiştirir.'}
            </div>
          )}
        </aside>
      </div>
    )
  },
}
