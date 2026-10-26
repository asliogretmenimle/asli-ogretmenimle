import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Maximize2, Minus, Plus, RotateCw } from 'lucide-react'
import { clamp } from '../../../interactive/axis'
import { PIECES, angleOf, centerFor, localPoly, mod, nearLattice, placedPoly, rotXY, baseCenter, stepDeg, steps, toXY, unitsIn, type Kind, type P2, type TypeId, type Unit, type V2 } from './lattice'

/**
 * Mozaik tahtası: kendi dokunma yönetimi olan yakınlaştırılabilir SVG.
 *  - Parçayı tek parmakla sürükle; ikinci parmak eklenince parça döner (60° / 90° adımlara oturur).
 *  - Boş alanda iki parmak: tahtayı yakınlaştır; yakınken tek parmak: kaydır.
 *  - Tepsideki parçayı tahtaya sürükle ya da dokun (boş yere gelir). Tahtadan tepsiye sürüklersen kalkar.
 *  - Seçili parçanın üstündeki ⟳ düğmesi: döndür.
 */

export interface Piece {
  uid: number
  type: TypeId
  turns: number
  cx: number
  cy: number
  anchor: V2 | null
  cells: string[]
  locked?: boolean
}

export interface World {
  x0: number
  y0: number
  x1: number
  y1: number
}

export function snapPiece(p: Piece, others: Piece[], units: Unit[], frame?: Set<string>, magnetic = true, pivot?: P2, radius = 0.8): Piece {
  const k = PIECES[p.type].kind
  const off = rotXY(baseCenter(p.type), angleOf(p.type, p.turns))
  const c0 = pivot ?? { x: p.cx, y: p.cy }
  const ideal = { x: c0.x - off.x, y: c0.y - off.y }
  const taken = new Set(others.flatMap((o) => o.cells))
  let best: { a: V2; cells: string[]; s: number } | null = null
  for (const a of nearLattice(k, ideal, radius)) {
    const s0 = toXY(k, a)
    const cells = unitsIn(units, placedPoly(p.type, p.turns, a))
    let s = Math.hypot(s0.x - ideal.x, s0.y - ideal.y)
    if (magnetic) {
      if (cells.some((c) => taken.has(c))) s += 0.35
      if (frame) {
        const inF = cells.filter((c) => frame.has(c)).length
        if (inF > 0 && inF < cells.length) s += 0.25
        if (inF === cells.length) s -= 0.1
      }
    }
    if (!best || s < best.s) best = { a, cells, s }
  }
  if (!best) return p
  const c = centerFor(p.type, p.turns, best.a)
  return { ...p, anchor: best.a, cells: best.cells, cx: c.x, cy: c.y }
}

const pts = (ps: P2[]) => ps.map((p) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`).join(' ')

export function PieceShape({ type, bad, sel, lifted, faded }: { type: TypeId; bad?: boolean; sel?: boolean; lifted?: boolean; faded?: boolean }) {
  const d = PIECES[type]
  const poly = localPoly(type)
  return (
    <g filter={lifted ? 'url(#mz-lift)' : 'url(#mz-shadow)'}>
      <polygon points={pts(poly)} fill={`url(#mz-g-${type})`} stroke={d.dark} strokeWidth={0.04} strokeLinejoin="round" />
      <polygon points={pts(poly.map((p) => ({ x: p.x * 0.74, y: p.y * 0.74 })))} fill="none" stroke="#fff" strokeOpacity={0.38} strokeWidth={0.028} strokeLinejoin="round" />
      <polygon points={pts(poly.map((p) => ({ x: p.x * 0.74, y: p.y * 0.74 })))} fill="#fff" fillOpacity={0.07} />
      {faded && <polygon points={pts(poly)} fill="#3b2a1a" fillOpacity={0.16} />}
      {bad && <polygon points={pts(poly)} fill="rgba(239,68,68,.28)" stroke="#ef4444" strokeWidth={0.07} strokeLinejoin="round" />}
      {sel && !bad && <polygon points={pts(poly)} fill="none" stroke="#fff" strokeWidth={0.05} strokeDasharray="0.12 0.08" strokeLinejoin="round" className="mz-march" />}
    </g>
  )
}

export function PieceDefs() {
  return (
    <defs>
      {(Object.keys(PIECES) as TypeId[]).map((t) => (
        <linearGradient key={t} id={`mz-g-${t}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={PIECES[t].light} />
          <stop offset="0.55" stopColor={PIECES[t].base} />
          <stop offset="1" stopColor={PIECES[t].dark} />
        </linearGradient>
      ))}
      <filter id="mz-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0.02" dy="0.045" stdDeviation="0.035" floodColor="#3b2a1a" floodOpacity="0.35" />
      </filter>
      <filter id="mz-lift" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0.06" dy="0.14" stdDeviation="0.09" floodColor="#3b2a1a" floodOpacity="0.32" />
      </filter>
      <style>{`.mz-march{animation:mzMarch 1s linear infinite}@keyframes mzMarch{to{stroke-dashoffset:-.4}}.mz-glow{animation:mzGlow 1.6s ease-in-out infinite}@keyframes mzGlow{50%{opacity:.35}}.mz-pop{animation:mzPop .45s cubic-bezier(.34,1.56,.64,1) both;transform-box:fill-box;transform-origin:center}@keyframes mzPop{from{opacity:0;transform:scale(.2) rotate(-60deg)}}.mz-flash{animation:mzFlash .9s ease-out both}@keyframes mzFlash{from{opacity:1}to{opacity:0}}@media (prefers-reduced-motion:reduce){.mz-march,.mz-glow,.mz-pop,.mz-flash{animation:none}}`}</style>
    </defs>
  )
}

/** Tepsideki parça simgesi */
export function PieceIcon({ type, size = 56 }: { type: TypeId; size?: number }) {
  const poly = localPoly(type)
  const r = Math.max(...poly.map((p) => Math.hypot(p.x, p.y))) + 0.12
  return (
    <svg width={size} height={size} viewBox={`${-r} ${-r} ${2 * r} ${2 * r}`} aria-hidden>
      <PieceDefs />
      <PieceShape type={type} />
    </svg>
  )
}

type G =
  | { mode: 'none' }
  | { mode: 'drag'; uid: number; p1: number; off: P2; sx: number; sy: number; t: number; moved: boolean; fromTray: boolean }
  | { mode: 'rotate'; uid: number; p1: number; p2: number; a0: number; off: P2 }
  | { mode: 'pan'; p1: number; sx: number; sy: number; v0: View }
  | { mode: 'pinch'; p1: number; p2: number; d0: number; v0: View; mid: P2 }

interface View {
  z: number
  cx: number
  cy: number
}

export function Board({ kind, world, units, frame, frameEdges, pieces, onPieces, tray, bad, done, under, overlay, staging, maxH = 0.62, complete }: { kind: Kind; world: World; units: Unit[]; frame?: Set<string>; frameEdges?: string; pieces: Piece[]; onPieces: (p: Piece[]) => void; tray: TypeId[]; bad: Set<number>; done?: boolean; under?: ReactNode; overlay?: ReactNode; staging: P2[]; maxH?: number; complete?: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 600, h: 400 })
  const ww = world.x1 - world.x0, wh = world.y1 - world.y0
  const home: View = { z: 1, cx: (world.x0 + world.x1) / 2, cy: (world.y0 + world.y1) / 2 }
  const [view, setView] = useState<View>(home)
  const [drag, setDrag] = useState<{ uid: number; extra: number } | null>(null)
  const [sel, setSel] = useState<number | null>(null)
  const g = useRef<G>({ mode: 'none' })
  const ptrs = useRef(new Map<number, { x: number; y: number }>())
  const live = useRef({ pieces, onPieces, view, size, done, frame, units, staging })
  live.current = { pieces, onPieces, view, size, done, frame, units, staging }
  const uidRef = useRef(1000)
  const extraRef = useRef(0)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const fit = () => {
      const w = el.clientWidth
      if (w < 20) return
      const h = Math.min(w * (wh / ww), Math.max(260, window.innerHeight * maxH))
      setSize({ w, h })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    window.addEventListener('resize', fit)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [ww, wh, maxH])

  // görünür dünya penceresi
  const vw = ww / view.z
  const vh = vw * (size.h / size.w)
  const vb = { x: view.cx - vw / 2, y: view.cy - vh / 2, w: vw, h: vh }

  const clampView = (v: View): View => {
    const z = clamp(v.z, 1, 4)
    const w = ww / z, h = w * (live.current.size.h / live.current.size.w)
    const mx = Math.max(0, (ww - w) / 2) + 0.3, my = Math.max(0, (wh - h) / 2) + 0.3
    const hx = (world.x0 + world.x1) / 2, hy = (world.y0 + world.y1) / 2
    return { z, cx: clamp(v.cx, hx - mx, hx + mx), cy: clamp(v.cy, hy - my, hy + my) }
  }

  const toWorld = (cx: number, cy: number): P2 => {
    const svg = svgRef.current
    const m = svg?.getScreenCTM()
    if (!svg || !m) return { x: 0, y: 0 }
    const p = new DOMPoint(cx, cy).matrixTransform(m.inverse())
    return { x: p.x, y: p.y }
  }

  const update = (uid: number, f: (p: Piece) => Piece) => {
    const L = live.current
    L.onPieces(L.pieces.map((p) => (p.uid === uid ? f(p) : p)))
  }
  const snapOne = (list: Piece[], uid: number) => {
    const L = live.current
    return list.map((p) => (p.uid === uid ? snapPiece(p, list.filter((o) => o.uid !== uid), L.units, L.frame) : p))
  }
  // Düğmeyle art arda döndürmede kayma birikmesin: ilk merkez etrafında döndür
  const pivot = useRef<{ uid: number; c: P2 } | null>(null)
  const rotateSel = (uid: number, dir = 1) => {
    const L = live.current
    const cur = L.pieces.find((p) => p.uid === uid)
    if (!cur) return
    if (pivot.current?.uid !== uid) pivot.current = { uid, c: { x: cur.cx, y: cur.cy } }
    const turned = { ...cur, turns: cur.turns + dir }
    const others = L.pieces.filter((o) => o.uid !== uid)
    const snapped = snapPiece(turned, others, L.units, L.frame, true, pivot.current.c, 0.62)
    L.onPieces(L.pieces.map((p) => (p.uid === uid ? snapped : p)))
  }
  const remove = (uid: number) => {
    const L = live.current
    L.onPieces(L.pieces.filter((p) => p.uid !== uid))
    setSel(null)
  }

  const startDrag = (uid: number, pid: number, e: { clientX: number; clientY: number }, fromTray: boolean) => {
    const L = live.current
    const p = L.pieces.find((x) => x.uid === uid)
    const w = toWorld(e.clientX, e.clientY)
    const off = p ? { x: p.cx - w.x, y: p.cy - w.y } : { x: 0, y: 0 }
    pivot.current = null
    g.current = { mode: 'drag', uid, p1: pid, off, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: fromTray, fromTray }
    setDrag({ uid, extra: 0 })
  }

  const onDown = (e: React.PointerEvent) => {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const G = g.current
    const L = live.current
    const el = (e.target as Element).closest('[data-uid]')
    const uid = el ? Number(el.getAttribute('data-uid')) : NaN
    if ((G.mode === 'drag' || G.mode === 'rotate') && G.mode === 'drag' && e.pointerId !== G.p1) {
      const a = ptrs.current.get(G.p1)!
      g.current = { mode: 'rotate', uid: G.uid, p1: G.p1, p2: e.pointerId, a0: Math.atan2(e.clientY - a.y, e.clientX - a.x), off: G.off }
      return
    }
    if (G.mode === 'none') {
      if (!Number.isNaN(uid) && !L.done) {
        const piece = L.pieces.find((p) => p.uid === uid)
        if (piece && !piece.locked) {
          // öne getir
          L.onPieces([...L.pieces.filter((p) => p.uid !== uid), piece])
          startDrag(uid, e.pointerId, e, false)
          return
        }
      }
      g.current = { mode: 'pan', p1: e.pointerId, sx: e.clientX, sy: e.clientY, v0: L.view }
      return
    }
    if (G.mode === 'pan' && e.pointerId !== G.p1) {
      const a = ptrs.current.get(G.p1)!
      const mid = toWorld((a.x + e.clientX) / 2, (a.y + e.clientY) / 2)
      g.current = { mode: 'pinch', p1: G.p1, p2: e.pointerId, d0: Math.hypot(a.x - e.clientX, a.y - e.clientY) || 1, v0: L.view, mid }
    }
  }

  const spawn = (type: TypeId, e: React.PointerEvent) => {
    if (done) return
    e.preventDefault()
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const w = toWorld(e.clientX, e.clientY)
    const uid = ++uidRef.current
    const piece: Piece = { uid, type, turns: 0, cx: w.x, cy: w.y, anchor: null, cells: [] }
    live.current.pieces = [...live.current.pieces, piece]
    onPieces(live.current.pieces)
    g.current = { mode: 'drag', uid, p1: e.pointerId, off: { x: 0, y: 0 }, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false, fromTray: true }
    setDrag({ uid, extra: 0 })
  }

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!ptrs.current.has(e.pointerId)) return
      ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const G = g.current
      const L = live.current
      if (G.mode === 'drag' && e.pointerId === G.p1) {
        if (!G.moved && Math.hypot(e.clientX - G.sx, e.clientY - G.sy) > 6) G.moved = true
        if (!G.moved) return
        const w = toWorld(e.clientX, e.clientY)
        update(G.uid, (p) => ({ ...p, cx: w.x + G.off.x, cy: w.y + G.off.y }))
      } else if (G.mode === 'rotate') {
        const a = ptrs.current.get(G.p1), b = ptrs.current.get(G.p2)
        if (!a || !b) return
        const ang = Math.atan2(b.y - a.y, b.x - a.x)
        let deg = ((ang - G.a0) * 180) / Math.PI
        deg = ((deg + 540) % 360) - 180
        extraRef.current = deg
        setDrag({ uid: G.uid, extra: deg })
        if (e.pointerId === G.p1) {
          const w = toWorld(e.clientX, e.clientY)
          update(G.uid, (p) => ({ ...p, cx: w.x + G.off.x, cy: w.y + G.off.y }))
        }
      } else if (G.mode === 'pan' && e.pointerId === G.p1) {
        if (G.v0.z <= 1.01) return
        const k = ww / G.v0.z / L.size.w
        setView(clampView({ ...G.v0, cx: G.v0.cx - (e.clientX - G.sx) * k, cy: G.v0.cy - (e.clientY - G.sy) * k }))
      } else if (G.mode === 'pinch') {
        const a = ptrs.current.get(G.p1), b = ptrs.current.get(G.p2)
        if (!a || !b) return
        const z = clamp((G.v0.z * Math.hypot(a.x - b.x, a.y - b.y)) / G.d0, 1, 4)
        const r = svgRef.current!.getBoundingClientRect()
        const mx = (a.x + b.x) / 2 - r.left - r.width / 2, my = (a.y + b.y) / 2 - r.top - r.height / 2
        const k = ww / z / r.width
        setView(clampView({ z, cx: G.mid.x - mx * k, cy: G.mid.y - my * k }))
      }
    }
    const up = (e: PointerEvent) => {
      if (!ptrs.current.has(e.pointerId)) return
      ptrs.current.delete(e.pointerId)
      const G = g.current
      const L = live.current
      if (G.mode === 'rotate' && (e.pointerId === G.p1 || e.pointerId === G.p2)) {
        const k = Math.round(extraRef.current / stepDeg(kind))
        if (k) {
          const list = L.pieces.map((p) => (p.uid === G.uid ? { ...p, turns: p.turns - k } : p))
          L.onPieces(list)
          L.pieces = list
        }
        extraRef.current = 0
        setDrag({ uid: G.uid, extra: 0 })
        const keep = e.pointerId === G.p1 ? G.p2 : G.p1
        const kp = ptrs.current.get(keep)
        const piece = L.pieces.find((p) => p.uid === G.uid)
        if (kp && piece) {
          const w = toWorld(kp.x, kp.y)
          g.current = { mode: 'drag', uid: G.uid, p1: keep, off: { x: piece.cx - w.x, y: piece.cy - w.y }, sx: kp.x, sy: kp.y, t: 0, moved: true, fromTray: false }
        }
        return
      }
      if (G.mode === 'drag' && e.pointerId === G.p1) {
        g.current = { mode: 'none' }
        setDrag(null)
        const r = svgRef.current!.getBoundingClientRect()
        const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom
        const quick = !G.moved && performance.now() - G.t < 400
        if (G.fromTray && !G.moved) {
          // dokunarak eklendi: boş bir bekleme yerine koy
          const spot = L.staging.find((s) => !L.pieces.some((p) => p.uid !== G.uid && Math.hypot(p.cx - s.x, p.cy - s.y) < 0.9)) ?? L.staging[0]
          const list = L.pieces.map((p) => (p.uid === G.uid ? { ...p, cx: spot.x, cy: spot.y } : p))
          L.onPieces(snapOne(list, G.uid))
          setSel(G.uid)
          return
        }
        if (quick) {
          setSel((s) => (s === G.uid ? null : G.uid))
          return
        }
        if (outside) {
          L.onPieces(L.pieces.filter((p) => p.uid !== G.uid))
          setSel(null)
          return
        }
        L.onPieces(snapOne(L.pieces, G.uid))
        setSel(G.uid)
        return
      }
      if (G.mode === 'pinch') {
        const keep = e.pointerId === G.p1 ? G.p2 : G.p1
        const kp = ptrs.current.get(keep)
        g.current = kp ? { mode: 'pan', p1: keep, sx: kp.x, sy: kp.y, v0: L.view } : { mode: 'none' }
        return
      }
      if (G.mode === 'pan' && e.pointerId === G.p1) {
        if (Math.hypot(e.clientX - G.sx, e.clientY - G.sy) < 6) setSel(null)
        g.current = { mode: 'none' }
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  })

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const L = live.current
      const w = toWorld(e.clientX, e.clientY)
      const z = clamp(L.view.z * Math.exp(-e.deltaY * 0.003), 1, 4)
      const f = L.view.z / z
      setView(clampView({ z, cx: w.x + (L.view.cx - w.x) * f, cy: w.y + (L.view.cy - w.y) * f }))
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  })

  const zoom = (f: number) => setView((v) => clampView({ ...v, z: v.z * f }))
  const selPiece = pieces.find((p) => p.uid === sel && !p.locked)
  const btn = 0.36 / Math.sqrt(view.z)
  const selYs = selPiece ? localPoly(selPiece.type).map((q) => rotXY(q, angleOf(selPiece.type, selPiece.turns)).y) : [0]
  const above = selPiece ? selPiece.cy + Math.min(...selYs) - btn * 0.85 : 0
  // Düğmeler tahtanın dışına taşmasın: üstte yer yoksa parçanın altına koy
  const selTop = selPiece && above - btn * 0.7 < vb.y ? selPiece.cy + Math.max(...selYs) + btn * 0.85 : above

  // kafes noktaları
  const dots: P2[] = []
  const R = Math.ceil(Math.max(ww, wh)) + 4
  for (let q = -R; q <= R; q++)
    for (let r = -R; r <= R; r++) {
      const p = toXY(kind, [q, r])
      if (p.x >= world.x0 - 0.01 && p.x <= world.x1 + 0.01 && p.y >= world.y0 - 0.01 && p.y <= world.y1 + 0.01) dots.push(p)
    }

  return (
    <div className="select-none">
      <div ref={wrapRef} className="relative overflow-hidden rounded-3xl bg-[#e9dcc6] shadow-[inset_0_2px_10px_rgba(80,50,20,.18)] ring-1 ring-[#d8c6a6]" style={{ touchAction: 'none' }}>
        <svg ref={svgRef} width={size.w} height={size.h} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className="block" onPointerDown={onDown} onDoubleClick={() => setView(home)} role="application" aria-label="Mozaik tahtası" style={{ touchAction: 'none' }}>
          <PieceDefs />
          <defs>
            <pattern id="mz-stone" width="0.5" height="0.5" patternUnits="userSpaceOnUse">
              <rect width="0.5" height="0.5" fill="#f1e6d2" />
              <circle cx="0.12" cy="0.18" r="0.012" fill="#d9c7a7" />
              <circle cx="0.37" cy="0.4" r="0.009" fill="#dccbb0" />
            </pattern>
          </defs>
          <rect x={world.x0 - 50} y={world.y0 - 50} width={ww + 100} height={wh + 100} fill="url(#mz-stone)" />
          {dots.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={0.035} fill="#c9b48f" />)}
          {frame && (
            <g>
              {units.filter((u) => frame.has(u.id)).map((u) => (
                <polygon key={u.id} points={pts(u.poly)} fill="#fffaf0" stroke="#eadcc3" strokeWidth={0.014} />
              ))}
              {frameEdges && <path d={frameEdges} fill="none" stroke={complete ? '#16a34a' : '#6b4f3a'} strokeWidth={0.075} strokeLinecap="round" className={complete ? 'mz-glow' : ''} />}
            </g>
          )}
          {under}
          {pieces.map((p) => {
            const isDrag = drag?.uid === p.uid
            const ang = angleOf(p.type, p.turns) + (isDrag ? drag!.extra : 0)
            return (
              <g key={p.uid} data-uid={p.locked ? undefined : p.uid} style={{ transform: `translate(${p.cx}px, ${p.cy}px) rotate(${ang}deg)`, transition: isDrag ? 'none' : 'transform 220ms cubic-bezier(.34,1.56,.64,1)', cursor: p.locked || done ? 'default' : isDrag ? 'grabbing' : 'grab' }}>
                <g style={{ transform: isDrag ? 'scale(1.06)' : 'scale(1)', transition: 'transform 150ms' }}>
                  <PieceShape type={p.type} bad={bad.has(p.uid)} sel={sel === p.uid && !done} lifted={isDrag} faded={p.locked} />
                </g>
              </g>
            )
          })}
          {overlay}
          {selPiece && !drag && !done && (
            <g>
              <g onPointerDown={(e) => e.stopPropagation()} onClick={() => rotateSel(selPiece.uid)} style={{ cursor: 'pointer' }} role="button" aria-label="Döndür">
                <circle cx={selPiece.cx - btn * 0.7} cy={selTop} r={btn * 0.62} fill="#1f2340" opacity={0.92} />
                <g transform={`translate(${selPiece.cx - btn * 0.7} ${selTop}) scale(${btn * 0.032})`} fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 -4.5 A8 8 0 1 0 8 2" />
                  <path d="M8 -9 L7.5 -4 L2.6 -4.8" />
                </g>
              </g>
              <g onPointerDown={(e) => e.stopPropagation()} onClick={() => remove(selPiece.uid)} style={{ cursor: 'pointer' }} role="button" aria-label="Kaldır">
                <circle cx={selPiece.cx + btn * 0.7} cy={selTop} r={btn * 0.62} fill="#fff" stroke="#fda4af" strokeWidth={0.025} />
                <g transform={`translate(${selPiece.cx + btn * 0.7} ${selTop}) scale(${btn * 0.032})`} fill="none" stroke="#be123c" strokeWidth={2.6} strokeLinecap="round">
                  <path d="M-6 -6 L6 6 M6 -6 L-6 6" />
                </g>
              </g>
            </g>
          )}
        </svg>
        <div className="absolute right-2 bottom-2 flex gap-1">
          <button type="button" onClick={() => zoom(1.4)} className="grid size-10 place-items-center rounded-xl bg-white/90 shadow ring-1 ring-black/10 active:scale-95" aria-label="Yakınlaştır"><Plus size={18} /></button>
          {view.z > 1.01 && (
            <>
              <button type="button" onClick={() => zoom(1 / 1.4)} className="grid size-10 place-items-center rounded-xl bg-white/90 shadow ring-1 ring-black/10 active:scale-95" aria-label="Uzaklaştır"><Minus size={18} /></button>
              <button type="button" onClick={() => setView(home)} className="grid size-10 place-items-center rounded-xl bg-white/90 shadow ring-1 ring-black/10 active:scale-95" aria-label="Sığdır"><Maximize2 size={16} /></button>
            </>
          )}
        </div>
      </div>
      {tray.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 rounded-3xl bg-white/80 p-2 ring-1 ring-line" style={{ touchAction: 'none' }} aria-label="Parça tepsisi">
          {tray.map((t) => (
            <button key={t} type="button" disabled={done} onPointerDown={(e) => spawn(t, e)} onClick={(e) => e.preventDefault()} className="flex min-h-16 min-w-14 flex-col items-center justify-center rounded-2xl bg-[#fbf6ee] px-1.5 pt-1 pb-0.5 ring-1 ring-[#eadcc3] transition active:scale-95 disabled:opacity-40" style={{ touchAction: 'none' }} aria-label={`${PIECES[t].name} ekle`}>
              <PieceIcon type={t} size={t === 'rect' || t === 'trap' ? 54 : 44} />
              <span className="text-[11px] font-extrabold text-ink-soft">{PIECES[t].name}</span>
            </button>
          ))}
        </div>
      )}
      {!done && (
        <p className="mt-1.5 text-center text-xs font-bold text-ink-soft">
          Parçayı sürükle · iki parmakla döndür ya da seçip <RotateCw size={12} className="inline" /> düğmesine dokun · tahtadan dışarı atınca kalkar
        </p>
      )}
    </div>
  )
}

export const rotStep = (k: Kind) => steps(k)
export const modTurns = (t: number, k: Kind) => mod(t, steps(k))
