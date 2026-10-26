import { useEffect, useMemo, useRef, useState } from 'react'
import { Eraser, Maximize2, Minus, Plus, RotateCcw, RotateCw, Trash2 } from 'lucide-react'
import { MathText } from '../../components/MathText'
import { poss } from '../../lib/generators'
import { ToolButton } from '../ui'
import type { ToolDef } from '../types'

/**
 * Örüntü Blokları — sonsuz tuval: iki parmakla yakınlaştır, boş yeri sürükleyerek kaydır.
 *  - Bloğa dokun ya da raftan sürükle: tuvale eklenir. Bırakınca kenarı en yakın eş kenara yapışır.
 *  - Bloğu tutarken ikinci parmakla çevir → 30°’lik adımlarla döner (ya da seçili bloğa tekrar dokun / ↺ ↻).
 *  - Kesir okuması: her blok seçilen bütünün (altıgen, yamuk…) kaçta kaçı? Toplam da canlı yazılır.
 *  - Kalıp: altıgen (ya da yamuk, eşkenar dörtgen) kalıbını farklı yollarla kapla; bulunan yollar listelenir.
 *  - Açılar: blokların bir noktada buluştuğu yerde açılar toplanır (360° = tam tur).
 *  - Simetri doğrusu: taşınabilir/döndürülebilir ayna; desenin yansıması kesik çizgiyle görünür.
 *
 * Görev hedefleri (target):
 *  - { cover: 'hexagon' | 'trapezoid' | 'rhombus', using?: 'trapezoid' | 'rhombus' | 'triangle' }
 *      → tuvaldeki kalıp, taşmadan ve üst üste binmeden kaplanmalı (kalıpla aynı blok kullanılamaz;
 *        using verilirse kalıbın içindeki blokların hepsi o türden olmalı).
 *  - { fraction: { num, den } | number, whole?: 'hexagon' | 'trapezoid' | 'rhombus' | 'triangle' }
 *      → tuvaldeki blokların toplam alanı bütünün num/den katı olmalı (varsayılan bütün: altıgen).
 */

type Kind = 'hex' | 'trap' | 'rh' | 'tri' | 'sq' | 'tan'
type Pt = [number, number]
type Block = { id: number; k: Kind; x: number; y: number; r: number }
type Sym = { on: boolean; x: number; y: number; a: number }
type V = { blocks: Block[]; next: number; sel: number | null; whole: Kind; outline: Kind | null; angles: boolean; sym: Sym; found: string[] }

const R3 = Math.sqrt(3) / 2
const RAW: Record<Kind, Pt[]> = {
  hex: [[0, 0], [1, 0], [1.5, -R3], [1, -2 * R3], [0, -2 * R3], [-0.5, -R3]],
  trap: [[0, 0], [2, 0], [1.5, -R3], [0.5, -R3]],
  rh: [[0, 0], [1, 0], [1.5, -R3], [0.5, -R3]],
  tri: [[0, 0], [1, 0], [0.5, -R3]],
  sq: [[0, 0], [1, 0], [1, -1], [0, -1]],
  tan: [[0, 0], [1, 0], [1 + R3, -0.5], [R3, -0.5]],
}
const ANG: Record<Kind, number[]> = { hex: [120, 120, 120, 120, 120, 120], trap: [60, 60, 120, 120], rh: [60, 120, 60, 120], tri: [60, 60, 60], sq: [90, 90, 90, 90], tan: [30, 150, 30, 150] }
/** üçgen birimi cinsinden alan */
const AREA: Record<Kind, number> = { hex: 6, trap: 3, rh: 2, tri: 1, sq: 4 / Math.sqrt(3), tan: 2 / Math.sqrt(3) }
const FAMILY: Kind[] = ['hex', 'trap', 'rh', 'tri']
const NAME: Record<Kind, string> = { hex: 'altıgen', trap: 'yamuk', rh: 'mavi eşkenar dörtgen', tri: 'üçgen', sq: 'kare', tan: 'bej eşkenar dörtgen' }
const SHORT: Record<Kind, string> = { hex: 'Altıgen', trap: 'Yamuk', rh: 'Mavi', tri: 'Üçgen', sq: 'Kare', tan: 'Bej' }
const GEN: Record<Kind, string> = { hex: 'altıgenin', trap: 'yamuğun', rh: 'mavi eşkenar dörtgenin', tri: 'üçgenin', sq: 'karenin', tan: 'bej eşkenar dörtgenin' }
const COLOR: Record<Kind, [string, string]> = {
  hex: ['#facc15', '#a16207'],
  trap: ['#ef4444', '#991b1b'],
  rh: ['#3b82f6', '#1e3a8a'],
  tri: ['#22c55e', '#166534'],
  sq: ['#f97316', '#9a3412'],
  tan: ['#e9d5a7', '#8a6d3b'],
}
const TARGET_KIND: Record<string, Kind> = { hexagon: 'hex', trapezoid: 'trap', rhombus: 'rh', triangle: 'tri', square: 'sq', tan: 'tan', hex: 'hex', trap: 'trap', rh: 'rh', tri: 'tri' }
const LOCAL: Record<Kind, Pt[]> = Object.fromEntries(
  (Object.keys(RAW) as Kind[]).map((k) => {
    const p = RAW[k]
    const cx = p.reduce((s, q) => s + q[0], 0) / p.length, cy = p.reduce((s, q) => s + q[1], 0) / p.length
    return [k, p.map(([x, y]) => [x - cx, y - cy] as Pt)]
  }),
) as Record<Kind, Pt[]>

const poly = (b: { k: Kind; x: number; y: number; r: number }): Pt[] => {
  const a = (b.r * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  return LOCAL[b.k].map(([x, y]) => [b.x + x * c - y * s, b.y + x * s + y * c])
}
const ptsAttr = (p: Pt[]) => p.map((q) => `${q[0].toFixed(4)},${q[1].toFixed(4)}`).join(' ')
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
const inPoly = ([x, y]: Pt, p: Pt[]) => {
  let ins = false
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins
  }
  return ins
}
const OUTLINE_AT: Record<Kind, Block> = {
  hex: { id: -1, k: 'hex', x: 0, y: 0, r: 0 },
  trap: { id: -1, k: 'trap', x: 0, y: 0, r: 0 },
  rh: { id: -1, k: 'rh', x: 0, y: 0, r: 0 },
  tri: { id: -1, k: 'tri', x: 0, y: 0, r: 0 },
  sq: { id: -1, k: 'sq', x: 0, y: 0, r: 0 },
  tan: { id: -1, k: 'tan', x: 0, y: 0, r: 0 },
}

/** kesir metni: 7/6 → "1 [[1/6]]" */
function fracText(num: number, den: number) {
  const g = gcd(num, den) || 1
  const N = num / g, D = den / g
  if (D === 1) return `${N}`
  const w = Math.floor(N / D)
  return w > 0 ? `${w} [[${N - w * D}/${D}]]` : `[[${N}/${D}]]`
}

function coverInfo(outline: Kind, blocks: Block[]) {
  const o = poly(OUTLINE_AT[outline])
  const polys = blocks.map(poly)
  const xs = o.map((p) => p[0]), ys = o.map((p) => p[1])
  const st = 0.045
  let inside = 0, good = 0, bad = 0
  for (let x = Math.min(...xs) - 0.25 + 0.0123; x < Math.max(...xs) + 0.25; x += st)
    for (let y = Math.min(...ys) - 0.25 + 0.0171; y < Math.max(...ys) + 0.25; y += st) {
      const s = inPoly([x, y], o)
      let c = 0
      for (const q of polys) if (inPoly([x, y], q)) c++
      if (s) { inside++; if (c === 1) good++; else if (c > 1) bad++ } else if (c > 0) bad++
    }
  const inBlocks = blocks.filter((b) => inPoly([b.x, b.y], o))
  return { ratio: inside ? good / inside : 0, exact: inside > 0 && good / inside > 0.985 && bad < inside * 0.02, inBlocks }
}
const signature = (bl: Block[]) => {
  const c: Record<string, number> = {}
  bl.forEach((b) => (c[b.k] = (c[b.k] ?? 0) + 1))
  return (['hex', 'trap', 'rh', 'tri', 'sq', 'tan'] as Kind[]).filter((k) => c[k]).map((k) => `${c[k]} ${k}`).join(' + ')
}
const sigText = (sig: string) => sig.split(' + ').map((p) => { const [c, k] = p.split(' '); return `${c} ${NAME[k as Kind]}` }).join(' + ')

function Canvas({ value, onChange, locked, addRef }: { value: V; onChange: (v: V) => void; locked?: boolean; addRef: React.MutableRefObject<((k: Kind, client?: Pt) => void) | null> }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(600)
  const Hh = Math.round(Math.min(560, Math.max(360, W * 0.72)))
  const [view, setView] = useState({ cx: 0, cy: 0, s: 56 })
  const [live, setLive] = useState<{ id: number; r: number } | null>(null)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(Math.max(260, el.clientWidth)))
    ro.observe(el)
    setW(Math.max(260, el.clientWidth))
    setView((v) => ({ ...v, s: Math.max(40, Math.min(64, el.clientWidth / 10)) }))
    return () => ro.disconnect()
  }, [])
  const sx = (x: number) => (x - view.cx) * view.s + W / 2
  const sy = (y: number) => (y - view.cy) * view.s + Hh / 2
  const toWorld = (cx: number, cy: number): Pt => {
    const r = wrap.current!.getBoundingClientRect()
    return [(cx - r.left - W / 2) / view.s + view.cx, (cy - r.top - Hh / 2) / view.s + view.cy]
  }
  const vref = useRef(value)
  vref.current = value

  /** bırakınca: eş uzunlukta zıt yönlü bir kenara yapış */
  const settle = (b: Block, all: Block[]): Block => {
    const r = Math.round(b.r / 30) * 30
    const nb = { ...b, r: ((r % 360) + 360) % 360 }
    const mine = poly(nb)
    let best: Pt | null = null, bd = 0.42
    const tryEdges = (other: Pt[], same: boolean) => {
      for (let i = 0; i < mine.length; i++) {
        const a = mine[i], bb = mine[(i + 1) % mine.length]
        const la = Math.hypot(bb[0] - a[0], bb[1] - a[1])
        for (let j = 0; j < other.length; j++) {
          const c = other[j], d = other[(j + 1) % other.length]
          if (Math.abs(Math.hypot(d[0] - c[0], d[1] - c[1]) - la) > 0.02) continue
          const ex = (bb[0] - a[0]) / la, ey = (bb[1] - a[1]) / la
          const fx = (d[0] - c[0]) / la, fy = (d[1] - c[1]) / la
          const dot = ex * fx + ey * fy
          if (same ? dot < 0.99 : dot > -0.99) continue
          const off: Pt = same ? [c[0] - a[0], c[1] - a[1]] : [c[0] - bb[0], c[1] - bb[1]]
          const dd = Math.hypot(off[0], off[1])
          if (dd < bd) { bd = dd; best = off }
        }
      }
    }
    all.filter((o) => o.id !== b.id).forEach((o) => tryEdges(poly(o), false))
    if (vref.current.outline) tryEdges(poly(OUTLINE_AT[vref.current.outline]), true)
    if (!best) {
      let vd = 0.25
      const verts = all.filter((o) => o.id !== b.id).flatMap(poly)
      for (const a of mine) for (const c of verts) { const d = Math.hypot(c[0] - a[0], c[1] - a[1]); if (d < vd) { vd = d; best = [c[0] - a[0], c[1] - a[1]] } }
    }
    const fin = best as Pt | null
    return fin ? { ...nb, x: Math.round((nb.x + fin[0]) * 1e4) / 1e4, y: Math.round((nb.y + fin[1]) * 1e4) / 1e4 } : nb
  }

  const ptrs = useRef(new Map<number, Pt>())
  type G = { mode: 'none' | 'block' | 'pan' | 'pinch' | 'symc' | 'symr'; id?: number; off?: Pt; moved?: boolean; wasSel?: boolean; start?: Pt; rot?: { a0: number; base: number }; pinch?: { d0: number; s0: number; w0: Pt } }
  const g = useRef<G>({ mode: 'none' })
  const angle = () => { const [a, b] = [...ptrs.current.values()]; return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI }

  const onDown = (e: React.PointerEvent) => {
    wrap.current!.setPointerCapture(e.pointerId)
    ptrs.current.set(e.pointerId, [e.clientX, e.clientY])
    const v = vref.current
    if (ptrs.current.size === 2) {
      if (g.current.mode === 'block' && g.current.id !== undefined && !locked) {
        const b = v.blocks.find((q) => q.id === g.current.id)!
        g.current.rot = { a0: angle(), base: b.r }
        g.current.moved = true
        setLive({ id: b.id, r: b.r })
        return
      }
      const [a, b] = [...ptrs.current.values()]
      g.current = { mode: 'pinch', pinch: { d0: Math.hypot(a[0] - b[0], a[1] - b[1]), s0: view.s, w0: toWorld((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) } }
      return
    }
    if (ptrs.current.size > 2) return
    const t = e.target as Element
    const handle = t.closest('[data-sym]')?.getAttribute('data-sym')
    if (handle && !locked) { g.current = { mode: handle === 'c' ? 'symc' : 'symr' }; return }
    const el = t.closest('[data-block]')
    if (el && !locked) {
      const id = Number(el.getAttribute('data-block'))
      const b = v.blocks.find((q) => q.id === id)!
      const w = toWorld(e.clientX, e.clientY)
      g.current = { mode: 'block', id, off: [b.x - w[0], b.y - w[1]], moved: false, wasSel: v.sel === id, start: [e.clientX, e.clientY] }
      onChange({ ...v, sel: id, blocks: [...v.blocks.filter((q) => q.id !== id), b] })
      return
    }
    g.current = { mode: 'pan', start: [e.clientX, e.clientY], moved: false }
  }
  const onMove = (e: React.PointerEvent) => {
    const prev = ptrs.current.get(e.pointerId)
    if (!prev) return
    ptrs.current.set(e.pointerId, [e.clientX, e.clientY])
    const s = g.current, v = vref.current
    if (s.mode === 'pinch' && s.pinch && ptrs.current.size >= 2) {
      const [a, b] = [...ptrs.current.values()]
      const ns = Math.min(140, Math.max(14, (s.pinch.s0 * Math.hypot(a[0] - b[0], a[1] - b[1])) / s.pinch.d0))
      const r = wrap.current!.getBoundingClientRect()
      const mx = (a[0] + b[0]) / 2 - r.left, my = (a[1] + b[1]) / 2 - r.top
      setView({ s: ns, cx: s.pinch.w0[0] - (mx - W / 2) / ns, cy: s.pinch.w0[1] - (my - Hh / 2) / ns })
      return
    }
    if (s.mode === 'block' && s.id !== undefined) {
      if (s.rot && ptrs.current.size >= 2) {
        let d = angle() - s.rot.a0
        if (d > 180) d -= 360
        if (d < -180) d += 360
        setLive({ id: s.id, r: s.rot.base + d })
        return
      }
      if (!s.moved && s.start && Math.hypot(e.clientX - s.start[0], e.clientY - s.start[1]) < 6) return
      s.moved = true
      const w = toWorld(e.clientX, e.clientY)
      onChange({ ...v, blocks: v.blocks.map((b) => (b.id === s.id ? { ...b, x: w[0] + s.off![0], y: w[1] + s.off![1] } : b)) })
      return
    }
    if (s.mode === 'symc' || s.mode === 'symr') {
      const w = toWorld(e.clientX, e.clientY)
      if (s.mode === 'symc') onChange({ ...v, sym: { ...v.sym, x: Math.round(w[0] * 4) / 4, y: Math.round(w[1] * 4) / 4 } })
      else {
        const a = (Math.atan2(v.sym.y - w[1], v.sym.x - w[0]) * 180) / Math.PI
        onChange({ ...v, sym: { ...v.sym, a: ((Math.round(a / 15) * 15) % 180 + 180) % 180 } })
      }
      return
    }
    if (s.mode === 'pan') {
      if (!s.moved && s.start && Math.hypot(e.clientX - s.start[0], e.clientY - s.start[1]) < 5) return
      s.moved = true
      setView((vw) => ({ ...vw, cx: vw.cx - (e.clientX - prev[0]) / vw.s, cy: vw.cy - (e.clientY - prev[1]) / vw.s }))
    }
  }
  const onUp = (e: React.PointerEvent) => {
    if (!ptrs.current.has(e.pointerId)) return
    ptrs.current.delete(e.pointerId)
    const s = g.current, v = vref.current
    if (s.mode === 'block' && s.id !== undefined) {
      const b = v.blocks.find((q) => q.id === s.id)
      if (s.rot) {
        if (ptrs.current.size > 0) return
        const r = live?.id === s.id ? live.r : b?.r ?? 0
        setLive(null)
        if (b) onChange({ ...v, blocks: v.blocks.map((q) => (q.id === b.id ? settle({ ...b, r }, v.blocks) : q)) })
      } else if (b) {
        if (!s.moved && s.wasSel) onChange({ ...v, blocks: v.blocks.map((q) => (q.id === b.id ? settle({ ...b, r: b.r + 30 }, v.blocks) : q)) })
        else if (s.moved) onChange({ ...v, blocks: v.blocks.map((q) => (q.id === b.id ? settle(b, v.blocks) : q)) })
      }
    } else if (s.mode === 'pan' && !s.moved && v.sel !== null) onChange({ ...v, sel: null })
    if (ptrs.current.size === 0) g.current = { mode: 'none' }
    else if (s.mode === 'pinch') g.current = { mode: 'none' }
  }

  // raftan ekleme
  addRef.current = (k: Kind, client?: Pt) => {
    const v = vref.current
    let p: Pt = client ? toWorld(client[0], client[1]) : [view.cx, view.cy]
    if (!client) {
      // ortadaki boş bir yer bul
      for (let i = 0; i < 40; i++) {
        const a = i * 2.4, d = 0.5 * Math.sqrt(i)
        const q: Pt = [view.cx + Math.cos(a) * d * 1.6, view.cy + Math.sin(a) * d * 1.6]
        if (!v.blocks.some((b) => Math.hypot(b.x - q[0], b.y - q[1]) < 1.3)) { p = q; break }
      }
    }
    const b = { id: v.next, k, x: p[0], y: p[1], r: 0 }
    const placed = client ? settle(b, v.blocks) : b
    onChange({ ...v, blocks: [...v.blocks, placed], next: v.next + 1, sel: b.id })
  }

  // açılar: çakışan köşeler
  const clusters = useMemo(() => {
    if (!value.angles) return []
    const out: { p: Pt; items: { k: Kind; ang: number; a1: number; a2: number }[] }[] = []
    value.blocks.forEach((b) => {
      const P = poly(b)
      P.forEach((q, i) => {
        const prev = P[(i + P.length - 1) % P.length], nx = P[(i + 1) % P.length]
        const a1 = Math.atan2(prev[1] - q[1], prev[0] - q[0]), a2 = Math.atan2(nx[1] - q[1], nx[0] - q[0])
        let c = out.find((o) => Math.hypot(o.p[0] - q[0], o.p[1] - q[1]) < 0.03)
        if (!c) out.push((c = { p: q, items: [] }))
        c.items.push({ k: b.k, ang: ANG[b.k][i], a1, a2 })
      })
    })
    return out.filter((c) => c.items.length >= 2)
  }, [value.angles, value.blocks])

  const sym = value.sym
  const reflect = ([x, y]: Pt): Pt => {
    const a = (sym.a * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a)
    const dx = x - sym.x, dy = y - sym.y, d = dx * ux + dy * uy
    return [sym.x + 2 * d * ux - dx, sym.y + 2 * d * uy - dy]
  }
  const sp = (p: Pt[]) => p.map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(' ')
  const gridStep = view.s > 30 ? 1 : 2

  return (
    <div className="relative">
      <div
        ref={wrap}
        className="relative overflow-hidden rounded-2xl ring-1 ring-line"
        style={{ touchAction: 'none', height: Hh, background: '#fbf7f6' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={(e) => {
          if (!(e.ctrlKey || e.metaKey)) return
          e.preventDefault()
          const w = toWorld(e.clientX, e.clientY)
          const ns = Math.min(140, Math.max(14, view.s * Math.exp(-e.deltaY * 0.003)))
          const r = wrap.current!.getBoundingClientRect()
          setView({ s: ns, cx: w[0] - (e.clientX - r.left - W / 2) / ns, cy: w[1] - (e.clientY - r.top - Hh / 2) / ns })
        }}
      >
        <svg width={W} height={Hh} className="block select-none" role="img" aria-label="Örüntü blokları tuvali">
          <defs>
            <pattern id="pb-dots" width={view.s * gridStep} height={view.s * gridStep * R3 * 2} patternUnits="userSpaceOnUse" x={sx(0)} y={sy(0)}>
              <circle cx={0} cy={0} r={1.3} fill="#d9dbe8" />
              <circle cx={view.s * gridStep * 0.5} cy={view.s * gridStep * R3} r={1.3} fill="#d9dbe8" />
              <circle cx={view.s * gridStep} cy={0} r={1.3} fill="#d9dbe8" />
              <circle cx={0} cy={view.s * gridStep * R3 * 2} r={1.3} fill="#d9dbe8" />
              <circle cx={view.s * gridStep} cy={view.s * gridStep * R3 * 2} r={1.3} fill="#d9dbe8" />
            </pattern>
          </defs>
          <rect width={W} height={Hh} fill="url(#pb-dots)" />
          {value.outline && (
            <polygon points={sp(poly(OUTLINE_AT[value.outline]))} fill="#fff" stroke="#1f2340" strokeWidth={2.5} strokeDasharray="8 6" strokeLinejoin="round" />
          )}
          {value.blocks.map((b) => {
            const P = poly(live?.id === b.id ? { ...b, r: live.r } : b)
            const [fill, stroke] = COLOR[b.k]
            const sel = value.sel === b.id
            return (
              <g key={b.id} data-block={b.id} style={{ cursor: locked ? 'default' : 'grab' }}>
                {sel && <polygon points={sp(P)} fill="none" stroke="#1f2340" strokeWidth={7} strokeLinejoin="round" opacity={0.18} />}
                <polygon points={sp(P)} fill={fill} stroke={sel ? '#fff' : stroke} strokeWidth={sel ? 3 : 1.6} strokeLinejoin="round" />
              </g>
            )
          })}
          {clusters.map((c, i) => {
            const X = sx(c.p[0]), Y = sy(c.p[1]), rr = Math.min(22, view.s * 0.32)
            const sum = Math.round(c.items.reduce((s, it) => s + it.ang, 0))
            return (
              <g key={i} pointerEvents="none">
                {c.items.map((it, j) => {
                  const x1 = X + rr * Math.cos(it.a1), y1 = Y + rr * Math.sin(it.a1), x2 = X + rr * Math.cos(it.a2), y2 = Y + rr * Math.sin(it.a2)
                  const cross = Math.cos(it.a1) * Math.sin(it.a2) - Math.sin(it.a1) * Math.cos(it.a2)
                  return <path key={j} d={`M${X} ${Y} L${x1} ${y1} A${rr} ${rr} 0 0 ${cross > 0 ? 1 : 0} ${x2} ${y2} Z`} fill="#fff" fillOpacity={0.75} stroke={COLOR[it.k][1]} strokeWidth={1.5} />
                })}
                <g transform={`translate(${X} ${Y - rr - 14})`}>
                  <rect x={-24} y={-12} width={48} height={22} rx={11} fill={sum === 360 ? '#16a34a' : '#1f2340'} />
                  <text y={4} textAnchor="middle" fontSize={12} fontWeight={900} fill="#fff">{sum}°</text>
                </g>
              </g>
            )
          })}
          {sym.on && (
            <g>
              {value.blocks.map((b) => (
                <polygon key={`m${b.id}`} points={sp(poly(b).map(reflect))} fill={COLOR[b.k][0]} fillOpacity={0.12} stroke={COLOR[b.k][1]} strokeWidth={1.6} strokeDasharray="5 4" pointerEvents="none" />
              ))}
              {(() => {
                const a = (sym.a * Math.PI) / 180, L = 60
                const ux = Math.cos(a), uy = Math.sin(a)
                const hx = sym.x - ux * 2.2, hy = sym.y - uy * 2.2
                return (
                  <>
                    <line x1={sx(sym.x - ux * L)} y1={sy(sym.y - uy * L)} x2={sx(sym.x + ux * L)} y2={sy(sym.y + uy * L)} stroke="#d6457a" strokeWidth={2.5} strokeDasharray="10 6" pointerEvents="none" />
                    <g data-sym="c" style={{ cursor: 'move' }}>
                      <circle cx={sx(sym.x)} cy={sy(sym.y)} r={24} fill="transparent" />
                      <circle cx={sx(sym.x)} cy={sy(sym.y)} r={11} fill="#d6457a" stroke="#fff" strokeWidth={3} />
                    </g>
                    <g data-sym="r" style={{ cursor: 'grab' }}>
                      <circle cx={sx(hx)} cy={sy(hy)} r={24} fill="transparent" />
                      <circle cx={sx(hx)} cy={sy(hy)} r={10} fill="#fff" stroke="#d6457a" strokeWidth={3} />
                      <path d={`M${sx(hx) - 4} ${sy(hy) - 2} a5 5 0 1 1 1 5`} fill="none" stroke="#d6457a" strokeWidth={2} />
                    </g>
                  </>
                )
              })()}
            </g>
          )}
        </svg>
        <div className="absolute right-2 bottom-2 flex gap-1">
          {[
            { l: 'Yakınlaştır', i: <Plus size={18} />, f: () => setView((v) => ({ ...v, s: Math.min(140, v.s * 1.3) })) },
            { l: 'Uzaklaştır', i: <Minus size={18} />, f: () => setView((v) => ({ ...v, s: Math.max(14, v.s / 1.3) })) },
            { l: 'Ortala', i: <Maximize2 size={16} />, f: () => setView((v) => ({ ...v, cx: 0, cy: 0, s: Math.max(40, Math.min(64, W / 10)) })) },
          ].map((b) => (
            <button key={b.l} type="button" aria-label={b.l} onPointerDown={(e) => e.stopPropagation()} onClick={b.f} className="grid size-10 place-items-center rounded-xl bg-white/90 shadow ring-1 ring-line active:scale-95">{b.i}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

function TrayButton({ k, onAdd, disabled }: { k: Kind; onAdd: (k: Kind, client?: Pt) => void; disabled?: boolean }) {
  const P = LOCAL[k]
  const xs = P.map((p) => p[0]), ys = P.map((p) => p[1])
  const minX = Math.min(...xs), minY = Math.min(...ys), w = Math.max(...xs) - minX, hh = Math.max(...ys) - minY
  const st = useRef<{ id: number; x: number; y: number; dragged: boolean } | null>(null)
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`${NAME[k]} ekle`}
      title={NAME[k]}
      className="grid h-14 min-w-14 place-items-center rounded-2xl bg-white px-2 ring-1 ring-line transition hover:bg-paper active:scale-95 disabled:opacity-30"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        st.current = { id: e.pointerId, x: e.clientX, y: e.clientY, dragged: false }
        const move = (ev: PointerEvent) => {
          if (ev.pointerId !== st.current?.id) return
          if (Math.hypot(ev.clientX - st.current.x, ev.clientY - st.current.y) > 12) st.current.dragged = true
        }
        const up = (ev: PointerEvent) => {
          if (ev.pointerId !== st.current?.id) return
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
          const s = st.current
          st.current = null
          if (!s.dragged) return onAdd(k)
          const el = document.elementFromPoint(ev.clientX, ev.clientY)
          if (el?.closest('[aria-label="Örüntü blokları tuvali"]')) onAdd(k, [ev.clientX, ev.clientY])
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
      }}
    >
      <svg viewBox={`${minX - 0.08} ${minY - 0.08} ${w + 0.16} ${hh + 0.16}`} style={{ height: k === 'hex' ? 40 : k === 'trap' || k === 'rh' || k === 'tri' ? 26 : 28 }} aria-hidden>
        <polygon points={ptsAttr(P)} fill={COLOR[k][0]} stroke={COLOR[k][1]} strokeWidth={0.06} strokeLinejoin="round" />
      </svg>
    </button>
  )
}

function readFraction(t: Record<string, unknown>): [number, number] | null {
  const f = t.fraction
  if (typeof f === 'number') { for (let d = 1; d <= 24; d++) if (Math.abs(Math.round(f * d) - f * d) < 1e-9) return [Math.round(f * d), d]; return null }
  if (f && typeof f === 'object') { const o = f as Record<string, unknown>; if (typeof o.num === 'number' && typeof o.den === 'number') return [o.num, o.den] }
  return null
}

export const oruntubloklari: ToolDef<V> = {
  id: 'oruntubloklari',
  defaultConfig: {},
  initial: (_c, t) => {
    const cover = TARGET_KIND[String(t?.cover ?? '')] ?? null
    const whole = TARGET_KIND[String(t?.whole ?? '')] ?? 'hex'
    return {
      blocks: t ? [] : [{ id: 1, k: 'hex', x: -2.6, y: 2.4, r: 0 }, { id: 2, k: 'trap', x: 0.2, y: 2.4, r: 0 }, { id: 3, k: 'rh', x: 2.5, y: 2.4, r: 0 }],
      next: 4,
      sel: null,
      whole,
      outline: cover,
      angles: false,
      sym: { on: false, x: 0, y: 0.6, a: 90 },
      found: [],
    }
  },
  check: (v, t) => {
    const cover = TARGET_KIND[String(t.cover ?? '')]
    if (cover) {
      const c = coverInfo(cover, v.blocks)
      if (!c.exact || c.inBlocks.length < 2) return false
      if (c.inBlocks.some((b) => b.k === cover)) return false
      const using = TARGET_KIND[String(t.using ?? '')]
      if (using && c.inBlocks.some((b) => b.k !== using)) return false
      return true
    }
    const fr = readFraction(t)
    if (fr) {
      if (!v.blocks.length || v.blocks.some((b) => !FAMILY.includes(b.k))) return false
      const whole = TARGET_KIND[String(t.whole ?? '')] ?? 'hex'
      const T = v.blocks.reduce((s, b) => s + AREA[b.k], 0)
      return Math.abs(T * fr[1] - AREA[whole] * fr[0]) < 1e-6
    }
    return false
  },
  Component: ({ value, onChange, target, locked }) => {
    const task = !!target
    const reveal = !task || !!locked
    const addRef = useRef<((k: Kind, client?: Pt) => void) | null>(null)
    const sel = value.blocks.find((b) => b.id === value.sel)
    const set = (p: Partial<V>) => onChange({ ...value, ...p })
    const cover = value.outline ? coverInfo(value.outline, value.blocks) : null
    const sig = cover?.exact && cover.inBlocks.length >= 2 && !cover.inBlocks.some((b) => b.k === value.outline) ? signature(cover.inBlocks) : null
    useEffect(() => {
      if (!task && sig && !value.found.includes(sig)) onChange({ ...value, found: [...value.found, sig] })
    }) // eslint-disable-line react-hooks/exhaustive-deps
    const wholeA = AREA[value.whole]
    const famOnly = value.blocks.every((b) => FAMILY.includes(b.k))
    const T = value.blocks.reduce((s, b) => s + AREA[b.k], 0)
    const ofWhole = (k: Kind) => {
      if (!FAMILY.includes(k) || !FAMILY.includes(value.whole)) return null
      return fracText(AREA[k], wholeA)
    }
    const symOk = useMemo(() => {
      if (!value.sym.on || !value.blocks.length) return null
      const a = (value.sym.a * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a)
      const refl = ([x, y]: Pt): Pt => { const dx = x - value.sym.x, dy = y - value.sym.y, d = dx * ux + dy * uy; return [value.sym.x + 2 * d * ux - dx, value.sym.y + 2 * d * uy - dy] }
      const polys = value.blocks.map((b) => ({ k: b.k, p: poly(b) }))
      const miss = polys.filter((b) => {
        const m = b.p.map(refl)
        return !polys.some((o) => o.k === b.k && o.p.every((q) => m.some((r) => Math.hypot(r[0] - q[0], r[1] - q[1]) < 0.04)))
      }).length
      return miss
    }, [value.sym, value.blocks])
    const usingK = TARGET_KIND[String(target?.using ?? '')]
    const trayKinds: Kind[] = task && usingK ? [usingK] : task && target?.fraction !== undefined ? FAMILY : ['hex', 'trap', 'rh', 'tri', 'sq', 'tan']
    const turn = (d: number) => sel && onChange({ ...value, blocks: value.blocks.map((b) => (b.id === sel.id ? { ...b, r: (((b.r + d) % 360) + 360) % 360 } : b)) })

    return (
      <div className="flex flex-col items-center gap-3">
        {!locked && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-paper p-1.5 ring-1 ring-line">
            {trayKinds.map((k) => <TrayButton key={k} k={k} onAdd={(kk, c) => addRef.current?.(kk, c)} disabled={value.blocks.length >= 80} />)}
          </div>
        )}
        <div className="w-full max-w-4xl">
          <Canvas value={value} onChange={onChange} locked={locked} addRef={addRef} />
          <p className="mt-1.5 text-center text-xs font-bold text-ink-soft">Bloğa dokun ya da raftan sürükle. Bloğu tutarken ikinci parmakla çevir; seçili bloğa dokununca 30° döner. İki parmakla tuvali yakınlaştır.</p>
        </div>
        {!locked && (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <ToolButton disabled={!sel} onClick={() => turn(-30)}><RotateCcw size={16} /> 30°</ToolButton>
            <ToolButton disabled={!sel} onClick={() => turn(30)}><RotateCw size={16} /> 30°</ToolButton>
            <ToolButton disabled={!sel} onClick={() => sel && onChange({ ...value, blocks: value.blocks.filter((b) => b.id !== sel.id), sel: null })}><Trash2 size={16} /> Sil</ToolButton>
            <ToolButton disabled={!value.blocks.length} onClick={() => set({ blocks: [], sel: null })}><Eraser size={16} /> Temizle</ToolButton>
            {!task && <ToolButton active={value.angles} onClick={() => set({ angles: !value.angles })}>Açılar</ToolButton>}
            {!task && <ToolButton active={value.sym.on} onClick={() => set({ sym: { ...value.sym, on: !value.sym.on } })}>Simetri doğrusu</ToolButton>}
          </div>
        )}
        {!task && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
            <div className="flex items-center gap-1">
              <span className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">Bütün</span>
              {FAMILY.slice(0, 3).map((k) => <ToolButton key={k} active={value.whole === k} onClick={() => set({ whole: k })}>{SHORT[k]}</ToolButton>)}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">Kalıp</span>
              <ToolButton active={!value.outline} onClick={() => set({ outline: null })}>Yok</ToolButton>
              {(['hex', 'trap', 'rh'] as Kind[]).map((k) => <ToolButton key={k} active={value.outline === k} onClick={() => set({ outline: k, found: value.outline === k ? value.found : [] })}>{SHORT[k]}</ToolButton>)}
            </div>
          </div>
        )}
        {reveal && (
          <div className="grid w-full max-w-4xl gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-ink px-4 py-3 text-center text-white">
              <p className="text-xs font-extrabold tracking-wide text-white/60 uppercase">Bütün = 1 {NAME[value.whole]}</p>
              {sel ? (
                <p className="mt-1 flex flex-wrap items-center justify-center gap-x-1.5 text-lg font-black">
                  {ofWhole(sel.k) ? (
                    AREA[sel.k] >= wholeA ? (
                      <>1 {NAME[sel.k]} = <span className="text-xl"><MathText text={ofWhole(sel.k)!} /></span> {NAME[value.whole]}</>
                    ) : (
                      <>1 {NAME[sel.k]} = {GEN[value.whole]} <span className="text-xl"><MathText text={ofWhole(sel.k)!} /></span>{poss(AREA[sel.k] / (gcd(AREA[sel.k], wholeA) || 1))}</>
                    )
                  ) : (
                    <>Bu {NAME[sel.k]}, {NAME[value.whole]} ile tam kesir olarak ölçülemez.</>
                  )}
                </p>
              ) : (
                <p className="mt-1 font-bold text-white/80">Bir bloğa dokun: bütünün kaçta kaçı?</p>
              )}
              {value.blocks.length > 0 && (
                <p className="mt-1 flex flex-wrap items-center justify-center gap-x-1.5 text-sm font-bold text-white/85">
                  {famOnly && FAMILY.includes(value.whole) ? (
                    <>Tuvaldeki tüm bloklar = <span className="text-lg text-white"><MathText text={fracText(Math.round(T), wholeA)} /></span> {NAME[value.whole]}</>
                  ) : (
                    <>Kare ve bej eşkenar dörtgen altıgenin tam kesirleri değildir.</>
                  )}
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-center ring-1 ring-line">
              {value.outline && cover ? (
                <>
                  <p className={`font-black ${sig ? 'text-ok' : 'text-ink'}`}>
                    {sig ? `Kalıp tam kaplandı: 1 ${NAME[value.outline]} = ${sigText(sig)}` : `Kalıbın %${Math.round(cover.ratio * 100)}${poss(Math.round(cover.ratio * 100))} kaplandı`}
                  </p>
                  {value.found.length > 0 && (
                    <div className="mt-1.5 space-y-0.5 text-left text-sm font-bold text-ink-soft">
                      <p className="text-center text-xs font-extrabold tracking-wide uppercase">Bulduğun yollar ({value.found.length})</p>
                      {value.found.map((f) => <p key={f} className="text-center">1 {NAME[value.outline!]} = {sigText(f)}</p>)}
                      <p className="text-center text-xs text-brand">Başka bir yol bul!</p>
                    </div>
                  )}
                </>
              ) : value.sym.on ? (
                <p className={`font-black ${symOk === 0 ? 'text-ok' : 'text-ink'}`}>
                  {symOk === null ? 'Desen yap; ayna görüntüsü kesik çizgiyle görünür.' : symOk === 0 ? 'Desen bu doğruya göre simetrik! ✓' : `${symOk} blok aynadaki görüntüsüyle örtüşmüyor.`}
                </p>
              ) : value.angles ? (
                <p className="font-bold text-ink-soft">Köşeleri bir noktada buluştur: açılar toplanır. Tam tur = <b className="text-ok">360°</b>.</p>
              ) : (
                <p className="font-bold text-ink-soft">“Kalıp” seç: altıgeni kaç farklı yolla kaplayabilirsin?</p>
              )}
            </div>
          </div>
        )}
      </div>
    )
  },
}
