import { useEffect, useRef, useState } from 'react'

/**
 * Animasyonlu iki kefeli terazi (SVG).
 *  - box: bilinmeyen kutu (x ya da ?), w: ağırlık (etiketli), neg: balon (kefeyi yukarı çeker)
 *  - angle (derece): pozitifse sağ kefe aşağıda; wobble: denge bilinmiyor (sallanır)
 *  - support: kefelerin altında takoz (tahmin ederken terazi kilitli)
 */

export type PanItem = { kind: 'box'; label: string; neg?: boolean; hl?: boolean } | { kind: 'w'; label: string; size?: number; neg?: boolean; hl?: boolean }

export const W = 640
export const H = 360
const PX = 320
const PY = 74
const ARM = 215
const HANG = 138

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Hedef açıya yaylı geçiş; wobble iken hafif sallanma */
function useAngle(target: number, wobble: boolean) {
  const [a, setA] = useState(target)
  const cur = useRef(target)
  const vel = useRef(0)
  useEffect(() => {
    if (reduced()) {
      cur.current = target
      setA(target)
      return
    }
    let raf = 0
    let last = performance.now()
    const t0 = last
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const goal = target + (wobble ? 5 * Math.sin((now - t0) / 260) : 0)
      // kritik altı sönümlü yay: hafif salınım
      const acc = 90 * (goal - cur.current) - 11 * vel.current
      vel.current += acc * dt
      cur.current += vel.current * dt
      setA(cur.current)
      if (wobble || Math.abs(goal - cur.current) > 0.02 || Math.abs(vel.current) > 0.02) raf = requestAnimationFrame(tick)
      else setA(goal)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, wobble])
  return a
}

/** Ağırlık farkından eğim açısı (derece) */
export const tiltOf = (diff: number) => (Math.abs(diff) < 1e-9 ? 0 : Math.sign(diff) * Math.min(13, 4 + Math.abs(diff) * 0.9))

type Dims = { w: number; h: number }
const dims = (it: PanItem): Dims => {
  if (it.kind === 'box') return { w: 44, h: 44 }
  const s = it.size ?? 1
  return { w: Math.max(30, 14 + it.label.length * 10) * s, h: 30 * s }
}

/** Kefedeki pozitif nesneleri satırlara diz (alttan yukarı) */
function layout(items: PanItem[]) {
  const rows: { items: PanItem[]; w: number; h: number }[] = []
  const MAXW = 176
  for (const it of items) {
    const d = dims(it)
    const r = rows[rows.length - 1]
    if (!r || r.w + d.w + 4 > MAXW) rows.push({ items: [it], w: d.w, h: d.h })
    else {
      r.items.push(it)
      r.w += d.w + 4
      r.h = Math.max(r.h, d.h)
    }
  }
  const out: { it: PanItem; x: number; y: number; d: Dims }[] = []
  let base = 0
  for (const r of rows) {
    let x = -r.w / 2
    for (const it of r.items) {
      const d = dims(it)
      out.push({ it, x, y: -base - d.h, d })
      x += d.w + 4
    }
    base += r.h + 3
  }
  return out
}

function Item({ it, x, y, d, dark }: { it: PanItem; x: number; y: number; d: Dims; dark: boolean }) {
  if (it.kind === 'box')
    return (
      <g>
        <rect x={x} y={y} width={d.w} height={d.h} rx={8} fill={it.hl ? '#a78bfa' : '#7c3aed'} stroke={dark ? '#ddd6fe' : '#4c1d95'} strokeWidth={2} />
        <path d={`M${x + 4} ${y + 12} H${x + d.w - 4}`} stroke="#fff" strokeOpacity={0.25} strokeWidth={2} />
        <text x={x + d.w / 2} y={y + d.h / 2 + 7} textAnchor="middle" fontSize={it.label.length > 2 ? 15 : 21} fontWeight={900} fill="#fff">{it.label}</text>
      </g>
    )
  // ağırlık: üstü tutamaklı metal blok
  const fill = it.hl ? '#14b8a6' : '#f59e0b'
  const stroke = it.hl ? '#0f766e' : '#b45309'
  return (
    <g>
      <path d={`M${x + d.w / 2 - 6} ${y + 2} q6 -9 12 0`} fill="none" stroke={stroke} strokeWidth={3} />
      <rect x={x} y={y + 2} width={d.w} height={d.h - 2} rx={6} fill={fill} stroke={stroke} strokeWidth={2} />
      <text x={x + d.w / 2} y={y + d.h / 2 + 6} textAnchor="middle" fontSize={15 * Math.min(1.2, it.size ?? 1)} fontWeight={900} fill="#fff">{it.label}</text>
    </g>
  )
}

function Balloons({ items, cx, ty, dark }: { items: PanItem[]; cx: number; ty: number; dark: boolean }) {
  if (!items.length) return null
  const n = items.length
  return (
    <g>
      {items.map((it, i) => {
        const bx = cx + (i - (n - 1) / 2) * 38
        const by = ty - 112 - (i % 2) * 14
        const isBox = it.kind === 'box'
        return (
          <g key={i}>
            <path d={`M${bx} ${by + 19} Q${bx + 6} ${(by + ty) / 2} ${cx + (i - (n - 1) / 2) * 12} ${ty - 2}`} fill="none" stroke={dark ? '#94a3b8' : '#64748b'} strokeWidth={1.4} />
            <ellipse cx={bx} cy={by} rx={17} ry={20} fill={isBox ? '#e11d48' : '#f43f5e'} stroke={dark ? '#fecdd3' : '#9f1239'} strokeWidth={2} />
            <ellipse cx={bx - 6} cy={by - 7} rx={4} ry={6} fill="#fff" opacity={0.35} />
            <text x={bx} y={by + 6} textAnchor="middle" fontSize={it.label.length > 2 ? 12 : 15} fontWeight={900} fill="#fff">{it.label}</text>
          </g>
        )
      })}
    </g>
  )
}

function Pan({ cx, ty, items, dark, support }: { cx: number; ty: number; items: PanItem[]; dark: boolean; support?: boolean }) {
  const pos = items.filter((i) => !i.neg)
  const neg = items.filter((i) => i.neg)
  const lay = layout(pos)
  const metal = dark ? '#cbd5e1' : '#475569'
  return (
    <g>
      {support && <rect x={cx - 40} y={ty + 16} width={80} height={H - 22 - ty - 16} rx={4} fill={dark ? '#78350f' : '#d97706'} opacity={0.85} />}
      <Balloons items={neg} cx={cx} ty={ty} dark={dark} />
      <g transform={`translate(${cx} ${ty})`}>
        {lay.map((l, i) => <Item key={i} {...l} dark={dark} />)}
      </g>
      <path d={`M${cx - 100} ${ty} H${cx + 100} Q${cx + 92} ${ty + 18} ${cx + 70} ${ty + 18} H${cx - 70} Q${cx - 92} ${ty + 18} ${cx - 100} ${ty} Z`} fill={metal} />
      <path d={`M${cx - 96} ${ty + 2} H${cx + 96}`} stroke="#fff" strokeOpacity={0.3} strokeWidth={2} />
    </g>
  )
}

export function Balance({ left, right, angle, wobble = false, dark = false, support = false, label }: { left: PanItem[]; right: PanItem[]; angle: number; wobble?: boolean; dark?: boolean; support?: boolean; label?: string }) {
  const a = useAngle(support ? 0 : angle, wobble && !support)
  const t = (a * Math.PI) / 180
  const L = { x: PX - ARM * Math.cos(t), y: PY - ARM * Math.sin(t) }
  const R = { x: PX + ARM * Math.cos(t), y: PY + ARM * Math.sin(t) }
  const tyL = L.y + HANG
  const tyR = R.y + HANG
  const beam = dark ? '#e2e8f0' : '#334155'
  const post = dark ? '#64748b' : '#64748b'
  const str = dark ? '#94a3b8' : '#94a3b8'
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label ?? 'Terazi'} className="block" style={{ touchAction: 'none' }}>
      {/* zemin ve gövde */}
      <ellipse cx={PX} cy={H - 16} rx={150} ry={10} fill={dark ? '#0b1220' : '#cbd5e1'} opacity={0.6} />
      <path d={`M${PX - 70} ${H - 18} L${PX - 40} ${H - 44} H${PX + 40} L${PX + 70} ${H - 18} Z`} fill={post} />
      <rect x={PX - 9} y={PY} width={18} height={H - 44 - PY} fill={post} />
      {/* denge göstergesi */}
      <path d={`M${PX} ${PY - 6} L${PX - 8} ${PY - 22} H${PX + 8} Z`} fill={Math.abs(a) < 0.6 && !wobble ? '#22c55e' : '#f59e0b'} />
      {/* kefe ipleri */}
      {[L, R].map((p, i) => {
        const ty = i ? tyR : tyL
        return (
          <g key={i} stroke={str} strokeWidth={2}>
            <line x1={p.x} y1={p.y} x2={p.x - 96} y2={ty} />
            <line x1={p.x} y1={p.y} x2={p.x + 96} y2={ty} />
          </g>
        )
      })}
      <Pan cx={L.x} ty={tyL} items={left} dark={dark} support={support} />
      <Pan cx={R.x} ty={tyR} items={right} dark={dark} support={support} />
      {/* kol */}
      <line x1={L.x} y1={L.y} x2={R.x} y2={R.y} stroke={beam} strokeWidth={10} strokeLinecap="round" />
      <circle cx={L.x} cy={L.y} r={6} fill={beam} />
      <circle cx={R.x} cy={R.y} r={6} fill={beam} />
      <circle cx={PX} cy={PY} r={12} fill={dark ? '#a78bfa' : '#7c3aed'} stroke={beam} strokeWidth={3} />
    </svg>
  )
}

/* ───────────── kefe içerikleri ───────────── */

/** Sabiti 10’luk, 5’lik ve 1’lik ağırlıklara ayır */
export function weightsOf(c: number, hl = false): PanItem[] {
  const neg = c < 0
  let v = Math.abs(c)
  const out: PanItem[] = []
  if (v > 60) return [{ kind: 'w', label: String(v), size: 1.3, neg, hl }]
  for (const [k, s] of [[10, 1.15], [5, 1], [1, 0.8]] as const) {
    while (v >= k) {
      out.push({ kind: 'w', label: String(k), size: s, neg, hl })
      v -= k
    }
  }
  return out
}

export function sideItems(s: { x: number; c: number }, boxLabel: string): PanItem[] {
  const out: PanItem[] = []
  const nx = Math.abs(s.x)
  if (nx > 8) out.push({ kind: 'box', label: `${nx}${boxLabel}`, neg: s.x < 0 })
  else for (let i = 0; i < nx; i++) out.push({ kind: 'box', label: boxLabel, neg: s.x < 0 })
  return [...out, ...weightsOf(s.c)]
}
