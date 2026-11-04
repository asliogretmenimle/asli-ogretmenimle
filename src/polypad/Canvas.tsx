import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Box, Pt, Tile } from './types'
import { getDef } from './tiles'
import { GridPattern, snapToGrid } from './grid'
import { boundsOf, boxCorners, boxesIntersect, deg, dist, pad, rotate, round, toLocal, toWorld, uid } from './geom'
import { eraseStroke, strokePath } from './tiles/basic'
import {
  api,
  commit,
  getState,
  makeTile,
  removeTiles,
  select,
  setState,
  sound,
  updateTiles,
  useStore,
  viewport,
  worldBox,
  zoomAt,
  MIN_Z,
  MAX_Z,
  type Tool,
} from './store'

// ---------------------------------------------------------------------------
// Parça görünümü
// ---------------------------------------------------------------------------

const TileView = memo(function TileView({ t, selected, tiles, hc, z }: { t: Tile; selected: boolean; tiles?: Tile[]; hc: boolean; z?: number }) {
  const def = getDef(t.type)
  if (!def) return null
  const tf = `translate(${round(t.x)} ${round(t.y)})${t.rot ? ` rotate(${round(t.rot)})` : ''}${t.flip ? ' scale(-1 1)' : ''}`
  return (
    <g data-tid={t.id} transform={tf} className={t.locked ? 'pp-tile locked' : 'pp-tile'}>
      {def.render(t, { selected, tiles, hc })}
      {/* Her zaman tutulabilen tutamaklar parçanın kendi katmanında: üstteki parçalar onları örter */}
      {z !== undefined &&
        !t.locked &&
        def.handles!(t)
          .filter((h) => h.show === 'always')
          .map((h) => <circle key={h.id} data-tid={t.id} data-handle={h.id} className="pp-handle" cx={h.x} cy={h.y} r={14 / z} fill="transparent" />)}
    </g>
  )
})

/** Parçanın her zaman görünen tutamağı var mı */
const hasAlways = (t: Tile) => !!getDef(t.type)?.handles?.(t).some((h) => h.show === 'always')

// ---------------------------------------------------------------------------
// Kalem ayarları
// ---------------------------------------------------------------------------

const PEN_W: Record<string, number[]> = {
  'pen:pen': [3, 2, 4, 8],
  'pen:marker': [8, 5, 8, 14],
  'pen:highlighter': [20, 12, 20, 32],
}

const LINE_W = [3, 2, 4, 8]

type Gesture =
  | { k: 'drag'; id: string; ids: string[]; start: Pt; orig: Map<string, Pt>; moved: boolean; wasSelected: boolean; act?: string; v?: string; sx: number; sy: number; statics: Pt[][]; movers: Pt[] }
  | { k: 'rotate'; ids: string[]; c: Pt; a0: number; orig: Map<string, { x: number; y: number; rot: number }>; step: number }
  | { k: 'handle'; id: string; hid: string }
  | { k: 'pan'; sx: number; sy: number; vx: number; vy: number; moved: boolean; touch: boolean }
  | { k: 'marquee'; a: Pt; b: Pt; add: boolean }
  | { k: 'pinch'; d0: number; c0: Pt; v0: { x: number; y: number; z: number } }
  | { k: 'draw'; pts: number[]; tool: Tool }
  | { k: 'erase' }
  | { k: 'create'; tool: Tool; a: Pt; b: Pt; sa: Pt }

/** Bir dokunuşta sürüklemenin başladığı sayılacak uzaklık (ekran px) */
const SLOP = 5
const SNAP_PX = 12

// Köşe yakalama için ızgara tabanlı hızlı arama
function bucketKey(x: number, y: number) {
  return `${Math.floor(x / 64)},${Math.floor(y / 64)}`
}

function buildStatics(exclude: Set<string>) {
  const map = new Map<string, Pt[]>()
  for (const t of getState().tiles) {
    if (exclude.has(t.id)) continue
    const def = getDef(t.type)
    if (!def?.outline || def.edgeSnap === false) continue
    for (const p of def.outline(t)) {
      const w = toWorld(t, p)
      const k = bucketKey(w.x, w.y)
      const arr = map.get(k)
      if (arr) arr.push(w)
      else map.set(k, [w])
    }
  }
  return map
}

export function Canvas() {
  const tiles = useStore((s) => s.tiles)
  const sel = useStore((s) => s.sel)
  const view = useStore((s) => s.view)
  const tool = useStore((s) => s.tool)
  const grid = useStore((s) => s.grid)
  const bg = useStore((s) => s.bg)
  const settings = useStore((s) => s.settings)
  const canvasSize = useStore((s) => s.canvasSize)
  const canvasW = useStore((s) => s.canvasW)
  const canvasH = useStore((s) => s.canvasH)
  const editing = useStore((s) => s.editing)

  const wrap = useRef<HTMLDivElement>(null)
  const live = useRef<SVGPathElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const pointers = useRef(new Map<number, Pt>())
  const statics = useRef<Map<string, Pt[]> | null>(null)
  const lastTap = useRef<{ id: string; time: number } | null>(null)
  const longPress = useRef(0)
  const raf = useRef(0)
  const pending = useRef<(() => void) | null>(null)
  const [marquee, setMarquee] = useState<Box | null>(null)
  const [draft, setDraft] = useState<{ tool: Tool; a: Pt; b: Pt } | null>(null)
  const [, force] = useState(0)

  const selSet = useMemo(() => new Set(sel), [sel])

  // Tuval boyutu
  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      const first = viewport.w === 1024 && viewport.h === 768 && getState().view.x === 0 && getState().view.y === 0
      Object.assign(viewport, { w: r.width, h: r.height, left: r.left, top: r.top })
      if (first) setState({ view: { x: r.width / 2, y: r.height / 2, z: 1 } })
      force((n) => n + 1)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('scroll', update, true)
    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', update, true)
    }
  }, [])

  // Fare tekerleği: kaydır; Ctrl/⌘ ya da dokunmatik yüzey kıstırması: yakınlaştır
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.01)), e.clientX - r.left, e.clientY - r.top)
      else {
        const v = getState().view
        const k = e.deltaMode ? 20 : 1
        setState({ view: { ...v, x: v.x - (e.shiftKey ? e.deltaY : e.deltaX) * k, y: v.y - (e.shiftKey ? 0 : e.deltaY) * k } })
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    // iOS Safari kendi kıstırma hareketini başlatmasın
    const stop = (e: Event) => e.preventDefault()
    el.addEventListener('gesturestart', stop)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('gesturestart', stop)
    }
  }, [])

  const local = (e: { clientX: number; clientY: number }): Pt => {
    const r = wrap.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const toW = (s: Pt): Pt => {
    const v = getState().view
    return { x: (s.x - v.x) / v.z, y: (s.y - v.y) / v.z }
  }

  /** Durum güncellemelerini kare başına bire indir */
  const schedule = (fn: () => void) => {
    pending.current = fn
    if (raf.current) return
    raf.current = requestAnimationFrame(() => {
      raf.current = 0
      const f = pending.current
      pending.current = null
      f?.()
    })
  }
  const flush = () => {
    if (raf.current) cancelAnimationFrame(raf.current)
    raf.current = 0
    const f = pending.current
    pending.current = null
    f?.()
  }

  function startPinch() {
    const ps = [...pointers.current.values()]
    if (ps.length < 2) return
    const g = gesture.current
    if (g?.k === 'draw' && live.current) live.current.setAttribute('d', '')
    if (g?.k === 'drag' || g?.k === 'rotate' || g?.k === 'handle') {
      flush()
      commit()
    }
    window.clearTimeout(longPress.current)
    setMarquee(null)
    setDraft(null)
    gesture.current = { k: 'pinch', d0: dist(ps[0], ps[1]), c0: { x: (ps[0].x + ps[1].x) / 2, y: (ps[0].y + ps[1].y) / 2 }, v0: { ...getState().view } }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.button === 2) return
    const s = local(e)
    pointers.current.set(e.pointerId, s)
    try {
      wrap.current!.setPointerCapture(e.pointerId)
    } catch {
      /* yakalama desteklenmiyor */
    }
    const state = getState()
    if (state.editing) setState({ editing: null })
    if (pointers.current.size === 2) {
      if (state.settings.pinch) startPinch()
      return
    }
    if (pointers.current.size > 2) return

    const w = toW(s)
    const target = e.target as Element
    const handleEl = target.closest('[data-handle]')
    const tileEl = target.closest('[data-tid]')

    // Orta tuş, kaydırma aracı
    if (e.button === 1 || state.tool === 'pan') {
      gesture.current = { k: 'pan', sx: s.x, sy: s.y, vx: state.view.x, vy: state.view.y, moved: false, touch: false }
      return
    }

    if (handleEl && state.tool === 'move') {
      const id = handleEl.getAttribute('data-tid')!
      const hid = handleEl.getAttribute('data-handle')!
      if (hid === '__rotate') {
        const ids = state.sel.filter((i) => !state.tiles.find((t) => t.id === i)?.locked)
        const box = selBox(ids)
        if (!box) return
        const c = { x: box.x + box.w / 2, y: box.y + box.h / 2 }
        const one = ids.length === 1 ? state.tiles.find((t) => t.id === ids[0]) : undefined
        const center = one ? { x: one.x, y: one.y } : c
        const orig = new Map(state.tiles.filter((t) => ids.includes(t.id)).map((t) => [t.id, { x: t.x, y: t.y, rot: t.rot }]))
        const step = one ? (getDef(one.type)?.rotStep ?? 15) : 15
        gesture.current = { k: 'rotate', ids, c: center, a0: Math.atan2(w.y - center.y, w.x - center.x), orig, step }
        return
      }
      const t = state.tiles.find((x) => x.id === id)
      const def = t && getDef(t.type)
      if (t && def?.onHandle) {
        const patch = def.onHandle(t, hid, toLocal(t, w), api, 'start')
        if (patch) updateTiles([id], () => patch)
        gesture.current = { k: 'handle', id, hid }
      }
      return
    }

    const tl = state.tool
    if (tl === 'pen:pen' || tl === 'pen:marker' || tl === 'pen:highlighter') {
      gesture.current = { k: 'draw', pts: [round(w.x, 1), round(w.y, 1)], tool: tl }
      const width = PEN_W[tl][state.strokeWidth]
      const l = live.current
      if (l) {
        l.setAttribute('d', strokePath(gesture.current.pts))
        l.setAttribute('stroke', state.color)
        l.setAttribute('stroke-width', String(width))
        l.setAttribute('stroke-opacity', tl === 'pen:highlighter' ? '0.4' : '1')
        l.setAttribute('stroke-linecap', tl === 'pen:highlighter' ? 'butt' : 'round')
      }
      return
    }
    if (tl === 'pen:eraser') {
      gesture.current = { k: 'erase' }
      erase(w)
      return
    }
    if (tl.startsWith('line:') || tl.startsWith('geo:')) {
      const a = tl.startsWith('geo:') ? snapGeoPoint(w) : w
      gesture.current = { k: 'create', tool: tl, a, b: a, sa: s }
      return
    }
    if (tl.startsWith('text:')) {
      gesture.current = { k: 'create', tool: tl, a: w, b: w, sa: s }
      return
    }

    // Taşıma aracı
    if (tileEl) {
      const id = tileEl.getAttribute('data-tid')!
      const t = state.tiles.find((x) => x.id === id)
      if (!t) return
      const wasSelected = state.sel.includes(id)
      let ids = state.sel
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        ids = wasSelected ? state.sel.filter((i) => i !== id) : [...state.sel, id]
        select(ids)
      } else if (!wasSelected) {
        ids = [id]
        select(ids)
      }
      const actEl = target.closest('[data-act]')
      const movable = ids.filter((i) => {
        const x = state.tiles.find((tt) => tt.id === i)
        return x && !x.locked
      })
      const orig = new Map(state.tiles.filter((x) => movable.includes(x.id)).map((x) => [x.id, { x: x.x, y: x.y }]))
      gesture.current = {
        k: 'drag',
        id,
        ids: movable,
        start: w,
        orig,
        moved: false,
        wasSelected,
        act: actEl && tileEl.contains(actEl) ? (actEl.getAttribute('data-act') ?? undefined) : undefined,
        v: actEl?.getAttribute('data-v') ?? undefined,
        sx: s.x,
        sy: s.y,
        statics: [],
        movers: [],
      }
      statics.current = null
      return
    }

    // Boş alan
    if (e.pointerType === 'mouse') {
      if (!e.shiftKey) select([])
      gesture.current = { k: 'marquee', a: w, b: w, add: e.shiftKey }
    } else {
      gesture.current = { k: 'pan', sx: s.x, sy: s.y, vx: state.view.x, vy: state.view.y, moved: false, touch: true }
      // Uzun basış: seçim kutusu
      window.clearTimeout(longPress.current)
      longPress.current = window.setTimeout(() => {
        const g = gesture.current
        if (g?.k === 'pan' && !g.moved) {
          setState({ view: { ...getState().view, x: g.vx, y: g.vy } })
          gesture.current = { k: 'marquee', a: w, b: w, add: false }
          setMarquee({ x: w.x, y: w.y, w: 0, h: 0 })
          navigator.vibrate?.(15)
        }
      }, 450)
    }
  }

  function snapGeoPoint(w: Pt): Pt {
    const r = SNAP_PX / getState().view.z
    let best = w
    let bd = r
    for (const t of getState().tiles) {
      const cands: Pt[] = []
      if (t.type === 'geo-point' || t.type === 'geo-circle') cands.push({ x: t.x, y: t.y })
      else if (t.type === 'geo-segment') cands.push(toWorld(t, t.p.a), toWorld(t, t.p.b))
      else {
        const def = getDef(t.type)
        if (def?.outline) cands.push(...def.outline(t).map((p) => toWorld(t, p)))
      }
      for (const c of cands) {
        const d = dist(c, w)
        if (d < bd) {
          bd = d
          best = c
        }
      }
    }
    return best
  }

  function erase(w: Pt) {
    const st = getState()
    const r = 12 / st.view.z
    const probe = { x: w.x - r, y: w.y - r, w: r * 2, h: r * 2 }
    let changed = false
    const out: Tile[] = []
    for (const t of st.tiles) {
      const def = getDef(t.type)
      if (!def?.erasable || !boxesIntersect(worldBox(t), probe)) {
        out.push(t)
        continue
      }
      const parts = eraseStroke(t, w, r)
      if (!parts) {
        out.push(t)
        continue
      }
      changed = true
      parts.forEach((pts, i) => out.push({ ...t, id: i === 0 ? t.id : uid(), p: { ...t.p, pts } }))
    }
    if (changed) setState({ tiles: out, sel: st.sel.filter((id) => out.some((t) => t.id === id)) })
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return
    const s = local(e)
    pointers.current.set(e.pointerId, s)
    const g = gesture.current
    if (!g) return
    const w = toW(s)
    switch (g.k) {
      case 'pinch': {
        const ps = [...pointers.current.values()]
        if (ps.length < 2) return
        const d = dist(ps[0], ps[1])
        const c = { x: (ps[0].x + ps[1].x) / 2, y: (ps[0].y + ps[1].y) / 2 }
        const z = Math.min(MAX_Z, Math.max(MIN_Z, g.v0.z * (d / (g.d0 || 1))))
        const wx = (g.c0.x - g.v0.x) / g.v0.z
        const wy = (g.c0.y - g.v0.y) / g.v0.z
        schedule(() => setState({ view: { z, x: c.x - wx * z, y: c.y - wy * z } }))
        return
      }
      case 'pan': {
        if (!g.moved && Math.hypot(s.x - g.sx, s.y - g.sy) < SLOP) return
        if (!g.moved) window.clearTimeout(longPress.current)
        g.moved = true
        schedule(() => setState({ view: { ...getState().view, x: g.vx + s.x - g.sx, y: g.vy + s.y - g.sy } }))
        return
      }
      case 'marquee': {
        g.b = w
        setMarquee(boundsOf([g.a, g.b]))
        return
      }
      case 'draw': {
        const n = g.pts.length
        const z = getState().view.z
        if (Math.hypot(w.x - g.pts[n - 2], w.y - g.pts[n - 1]) * z < 1.5) return
        // Birleştirilmiş olaylarla daha pürüzsüz çizgi
        const evs = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? []
        const extra = evs.length > 1 ? evs.slice(0, -1).map((ce) => toW(local(ce))) : []
        for (const p of [...extra, w]) g.pts.push(round(p.x, 1), round(p.y, 1))
        live.current?.setAttribute('d', strokePath(g.pts))
        return
      }
      case 'erase':
        erase(w)
        return
      case 'create': {
        g.b = g.tool.startsWith('geo:') ? snapGeoPoint(w) : w
        if (Math.hypot(s.x - g.sa.x, s.y - g.sa.y) > SLOP && !g.tool.startsWith('text:')) setDraft({ tool: g.tool, a: g.a, b: g.b })
        return
      }
      case 'handle': {
        const t = getState().tiles.find((x) => x.id === g.id)
        const def = t && getDef(t.type)
        if (!t || !def?.onHandle) return
        schedule(() => {
          const cur = getState().tiles.find((x) => x.id === g.id)
          if (!cur) return
          const patch = def.onHandle!(cur, g.hid, toLocal(cur, w), api, 'move')
          if (patch) updateTiles([g.id], () => patch)
        })
        return
      }
      case 'rotate': {
        const a = Math.atan2(w.y - g.c.y, w.x - g.c.x)
        let d = deg(a - g.a0)
        const one = g.ids.length === 1 ? g.orig.get(g.ids[0]) : undefined
        if (!e.shiftKey && g.step > 0) {
          if (one) d = Math.round((one.rot + d) / g.step) * g.step - one.rot
          else d = Math.round(d / g.step) * g.step
        }
        schedule(() =>
          updateTiles(g.ids, (t) => {
            const o = g.orig.get(t.id)!
            const p = rotate({ x: o.x - g.c.x, y: o.y - g.c.y }, d)
            return { x: g.c.x + p.x, y: g.c.y + p.y, rot: (((o.rot + d) % 360) + 360) % 360 }
          }),
        )
        return
      }
      case 'drag': {
        if (!g.moved && Math.hypot(s.x - g.sx, s.y - g.sy) < SLOP) return
        if (!g.ids.length) return
        if (!g.moved) {
          g.moved = true
          // Köşe yakalama hazırlığı
          const st = getState()
          const set = new Set(g.ids)
          if (st.settings.snap) {
            statics.current = buildStatics(set)
            g.movers = []
            for (const t of st.tiles) {
              if (!set.has(t.id)) continue
              const def = getDef(t.type)
              if (!def?.outline || def.edgeSnap === false) continue
              g.movers.push(...def.outline(t).map((p) => toWorld(t, p)))
            }
          }
        }
        let dx = w.x - g.start.x
        let dy = w.y - g.start.y
        const st = getState()
        if (st.settings.snap && !e.altKey) {
          const snap = snapOffset(g, dx, dy, st.view.z)
          dx += snap.x
          dy += snap.y
        }
        schedule(() =>
          updateTiles(g.ids, (t) => {
            const o = g.orig.get(t.id)
            return o ? { x: o.x + dx, y: o.y + dy } : null
          }),
        )
        return
      }
    }
  }

  /** Taşınan köşeleri yakındaki köşelere ya da ızgaraya yapıştıran kayma */
  function snapOffset(g: Extract<Gesture, { k: 'drag' }>, dx: number, dy: number, z: number): Pt {
    const r = SNAP_PX / z
    let best: Pt | null = null
    let bd = r
    const map = statics.current
    if (map && g.movers.length && g.movers.length < 400) {
      for (const m of g.movers) {
        const x = m.x + dx
        const y = m.y + dy
        const cx = Math.floor(x / 64)
        const cy = Math.floor(y / 64)
        for (let i = -1; i <= 1; i++)
          for (let j = -1; j <= 1; j++) {
            const arr = map.get(`${cx + i},${cy + j}`)
            if (!arr) continue
            for (const p of arr) {
              const d = Math.hypot(p.x - x, p.y - y)
              if (d < bd) {
                bd = d
                best = { x: p.x - x, y: p.y - y }
              }
            }
          }
      }
    }
    if (best) return best
    // Izgara: ilk taşınan parçanın ilk köşesi
    const st = getState()
    if (st.grid !== 'none' && g.ids.length) {
      const t = st.tiles.find((x) => x.id === g.ids[0])
      const def = t && getDef(t.type)
      if (t && def?.gridSnap) {
        const o = g.orig.get(t.id)!
        const ol = def.outline?.(t)
        const lp = ol?.length ? ol[0] : boxCorners(def.bounds(t))[0]
        const v = toWorld({ ...t, x: o.x + dx, y: o.y + dy }, lp)
        const sp = snapToGrid(st.grid, v)
        if (Math.hypot(sp.x - v.x, sp.y - v.y) < r * 1.5) return { x: sp.x - v.x, y: sp.y - v.y }
      }
    }
    return { x: 0, y: 0 }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return
    // Tarayıcı son hareket olaylarını birleştirmiş olabilir: bırakma konumunu da işle
    if (e.type === 'pointerup' && gesture.current && gesture.current.k !== 'pinch' && gesture.current.k !== 'draw') onPointerMove(e)
    pointers.current.delete(e.pointerId)
    window.clearTimeout(longPress.current)
    const g = gesture.current
    if (!g) return
    if (g.k === 'pinch') {
      flush()
      // Kalan parmak yeni bir hareket başlatmasın
      if (pointers.current.size === 0) gesture.current = null
      return
    }
    if (pointers.current.size > 0) return
    gesture.current = null
    flush()
    const cancelled = e.type === 'pointercancel'
    const s = local(e)
    const w = toW(s)
    const st = getState()

    switch (g.k) {
      case 'pan':
        if (!g.moved && g.touch) select([])
        return
      case 'marquee': {
        setMarquee(null)
        const b = boundsOf([g.a, g.b])
        if (b.w < 2 && b.h < 2) return
        const hit = st.tiles.filter((t) => boxesIntersect(worldBox(t), b)).map((t) => t.id)
        select(g.add ? [...new Set([...st.sel, ...hit])] : hit)
        return
      }
      case 'draw': {
        live.current?.setAttribute('d', '')
        if (cancelled || g.pts.length < 2) return
        const b = boundsOf(Array.from({ length: g.pts.length / 2 }, (_, i) => ({ x: g.pts[i * 2], y: g.pts[i * 2 + 1] })))
        const cx = round(b.x + b.w / 2, 1)
        const cy = round(b.y + b.h / 2, 1)
        const pts = g.pts.map((v, i) => round(v - (i % 2 ? cy : cx), 1))
        const kind = g.tool.slice(4)
        setState((s2) => ({
          tiles: [...s2.tiles, { id: uid(), type: 'stroke', x: cx, y: cy, rot: 0, color: s2.color, p: { pts, w: PEN_W[g.tool][s2.strokeWidth], kind, dash: s2.strokeStyle } }],
        }))
        commit()
        return
      }
      case 'erase':
        commit()
        return
      case 'create': {
        setDraft(null)
        if (cancelled) return
        createShape(g.tool, g.a, g.b, Math.hypot(s.x - g.sa.x, s.y - g.sa.y) > SLOP)
        return
      }
      case 'handle': {
        const t = st.tiles.find((x) => x.id === g.id)
        const def = t && getDef(t.type)
        if (t && def?.onHandle) {
          const patch = def.onHandle(t, g.hid, toLocal(t, w), api, 'end')
          if (patch) updateTiles([g.id], () => patch)
        }
        commit()
        return
      }
      case 'rotate':
        commit()
        return
      case 'drag': {
        const t = st.tiles.find((x) => x.id === g.id)
        const def = t && getDef(t.type)
        if (!g.moved) {
          if (!t || !def) return
          const now = performance.now()
          const dbl = lastTap.current && lastTap.current.id === t.id && now - lastTap.current.time < 350
          lastTap.current = { id: t.id, time: now }
          const info = { act: g.act, v: g.v, local: toLocal(t, w), world: w }
          if (dbl && !g.act) {
            lastTap.current = null
            if (def.text) openTextEditor(t)
            else def.onDoubleTap?.(t, api, info)
            return
          }
          if (def.onTap && (g.act || g.wasSelected)) def.onTap(t, api, info)
          return
        }
        statics.current = null
        // Bağlı çizgiler kendi uçlarına geri dönsün
        const set = new Set(g.ids)
        updateTiles(set, (x) => {
          const d = getDef(x.type)
          return d?.follow ? d.follow(x, (id) => getState().tiles.find((y) => y.id === id)) : null
        })
        // Kenar çubuğuna bırakılan parçalar silinir
        const over = document.elementFromPoint(e.clientX, e.clientY)
        if (over?.closest('.pp-sidebar') && st.settings.del) {
          removeTiles(g.ids)
          sound('pop')
          commit()
          return
        }
        dropOnto(g.ids)
        commit()
        return
      }
    }
  }

  function dropOnto(ids: string[]) {
    const st = getState()
    const set = new Set(ids)
    const dropped = st.tiles.filter((t) => set.has(t.id))
    if (!dropped.length) return
    for (let i = st.tiles.length - 1; i >= 0; i--) {
      const target = st.tiles[i]
      if (set.has(target.id)) continue
      const def = getDef(target.type)
      if (!def?.onDrop) continue
      const b = worldBox(target)
      const inside = dropped.filter((d) => d.x >= b.x && d.x <= b.x + b.w && d.y >= b.y && d.y <= b.y + b.h)
      if (inside.length) {
        def.onDrop(target, inside, api)
        return
      }
    }
  }

  function createShape(tl: Tool, a: Pt, b: Pt, dragged: boolean) {
    const st = getState()
    const color = st.color
    const w = LINE_W[st.strokeWidth]
    const dash = st.strokeStyle
    let tile: Tile | null = null
    if (tl.startsWith('text:')) {
      if (tl === 'text:text') {
        tile = makeTile('text', {}, a.x + 100, a.y + 18)
        tile.color = color
      } else {
        tile = makeTile('equation', {}, a.x, a.y)
        tile.color = color
      }
      setState((s2) => ({ tiles: [...s2.tiles, tile!], sel: [tile!.id], tool: 'move' }))
      commit()
      if (tl === 'text:text') setState({ editing: tile.id })
      else openTextEditor(tile)
      return
    }
    if (tl === 'geo:point') {
      const n = st.tiles.filter((t) => t.type === 'geo-point').length
      tile = makeTile('geo-point', { color, label: pointLabel(n) }, b.x, b.y)
    } else if (!dragged) {
      return
    } else if (tl.startsWith('line:')) {
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const ta = st.tiles.slice().reverse().find((t) => t.type !== 'line' && t.type !== 'stroke' && containsPt(t, a))
      const tb = st.tiles.slice().reverse().find((t) => t.type !== 'line' && t.type !== 'stroke' && containsPt(t, b))
      tile = makeTile('line', { lineStyle: tl.slice(5), color, w, dash, a: { x: a.x - mid.x, y: a.y - mid.y }, b: { x: b.x - mid.x, y: b.y - mid.y } }, mid.x, mid.y)
      tile.p.links = { a: ta?.id ?? null, b: tb?.id ?? null }
      if (ta) tile.p.la = toLocal(ta, a)
      if (tb) tile.p.lb = toLocal(tb, b)
    } else if (tl === 'geo:line') {
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      tile = makeTile('geo-segment', { color, w, dash, a: { x: a.x - mid.x, y: a.y - mid.y }, b: { x: b.x - mid.x, y: b.y - mid.y } }, mid.x, mid.y)
    } else if (tl === 'geo:circle') {
      tile = makeTile('geo-circle', { color, w, dash, r: round(dist(a, b)) }, a.x, a.y)
    } else if (tl === 'geo:rect') {
      const bx = boundsOf([a, b])
      tile = makeTile('geo-rect', { color, w, dash, w2: round(bx.w), h2: round(bx.h) }, bx.x + bx.w / 2, bx.y + bx.h / 2)
    } else if (tl === 'geo:angle') {
      tile = makeTile('geo-angle', { color, w, dash, len: Math.max(60, round(dist(a, b))), a1: Math.round(deg(Math.atan2(b.y - a.y, b.x - a.x))), a2: Math.round(deg(Math.atan2(b.y - a.y, b.x - a.x))) - 60 }, a.x, a.y)
    }
    if (!tile) return
    const t = tile
    setState((s2) => ({ tiles: [...s2.tiles, t] }))
    commit()
  }

  const selBox = (ids: string[]) => {
    const set = new Set(ids)
    const pts = getState().tiles.filter((t) => set.has(t.id)).flatMap((t) => boxCorners(worldBox(t)))
    return pts.length ? boundsOf(pts) : null
  }

  const watchTiles = tiles
  const hc = settings.contrast
  const cursor = tool === 'pan' ? 'grab' : tool.startsWith('pen:') ? 'crosshair' : tool === 'move' ? 'default' : 'crosshair'

  return (
    <div
      ref={wrap}
      className={`pp-canvas${hc ? ' hc' : ''}`}
      style={{ background: canvasSize === 'infinite' ? bg : 'var(--pp-outside)', cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg className="pp-svg" width="100%" height="100%">
        <defs>
          <filter id="pp-shadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.25" />
          </filter>
          {settings.handdrawn && (
            <filter id="pp-rough">
              <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" />
              <feDisplacementMap in="SourceGraphic" scale="4" />
            </filter>
          )}
        </defs>
        {canvasSize !== 'infinite' && <PageRect view={view} bg={bg} w={canvasSize === 'notebook' ? canvasW : canvasW} h={canvasSize === 'notebook' ? 100000 : canvasH} />}
        {canvasSize === 'infinite' ? <GridPattern grid={grid} view={view} /> : null}
        <g transform={`translate(${view.x} ${view.y}) scale(${view.z})`} filter={settings.handdrawn ? 'url(#pp-rough)' : undefined} className="pp-world">
          {tiles.map((t) => (
            <TileView key={t.id} t={t} selected={selSet.has(t.id)} tiles={getDef(t.type)?.watch ? watchTiles : undefined} hc={hc} z={tool === 'move' && hasAlways(t) ? view.z : undefined} />
          ))}
          <path ref={live} fill="none" strokeLinejoin="round" style={{ pointerEvents: 'none' }} data-export="skip" />
          {draft && (
            <g data-export="skip">
              <Draft {...draft} />
            </g>
          )}
        </g>
        <Overlay tiles={tiles} sel={sel} view={view} tool={tool} editing={editing} rotateOn={settings.rotate} />
        {marquee && (
          <rect
            x={marquee.x * view.z + view.x}
            y={marquee.y * view.z + view.y}
            width={marquee.w * view.z}
            height={marquee.h * view.z}
            className="pp-marquee"
          />
        )}
      </svg>
    </div>
  )
}

const pointLabel = (n: number) => String.fromCharCode(65 + (n % 26)) + (n >= 26 ? String(Math.floor(n / 26)) : '')

function containsPt(t: Tile, w: Pt) {
  const def = getDef(t.type)
  if (!def) return false
  const l = toLocal(t, w)
  const b = def.bounds(t)
  return l.x >= b.x && l.x <= b.x + b.w && l.y >= b.y && l.y <= b.y + b.h
}

export function openTextEditor(t: Tile) {
  const def = getDef(t.type)
  if (!def?.text) return
  if (t.type === 'text') {
    setState({ editing: t.id, sel: [t.id] })
    return
  }
  void api.prompt(def.text.label ?? 'Metin', String(t.p[def.text.key] ?? '')).then((v) => {
    if (v == null) {
      // Boş denklem iptal edilirse kaldır
      if (t.type === 'equation' && !t.p.src) removeTiles([t.id])
      return
    }
    api.updateP(t.id, { [def.text!.key]: v }, true)
  })
}

function PageRect({ view, bg, w, h }: { view: { x: number; y: number; z: number }; bg: string; w: number; h: number }) {
  const pw = w * 32
  const ph = h * 32
  return <rect x={view.x - (pw / 2) * view.z} y={view.y - (ph / 2) * view.z} width={pw * view.z} height={ph * view.z} fill={bg} className="pp-page" />
}

function Draft({ tool, a, b }: { tool: Tool; a: Pt; b: Pt }) {
  const color = getState().color
  const common = { fill: 'none', stroke: color, strokeWidth: 2, strokeDasharray: '6 4', style: { pointerEvents: 'none' as const } }
  if (tool === 'geo:circle') return <circle cx={a.x} cy={a.y} r={dist(a, b)} {...common} />
  if (tool === 'geo:rect') {
    const bx = boundsOf([a, b])
    return <rect x={bx.x} y={bx.y} width={bx.w} height={bx.h} {...common} />
  }
  if (tool === 'line:curved') {
    const l = dist(a, b) || 1
    const m = { x: (a.x + b.x) / 2 + ((a.y - b.y) / l) * l * 0.25, y: (a.y + b.y) / 2 + ((b.x - a.x) / l) * l * 0.25 }
    return <path d={`M${a.x} ${a.y}Q${m.x} ${m.y} ${b.x} ${b.y}`} {...common} />
  }
  if (tool === 'line:custom') {
    const mx = (a.x + b.x) / 2
    return <path d={`M${a.x} ${a.y}H${mx}V${b.y}H${b.x}`} {...common} />
  }
  return <path d={`M${a.x} ${a.y}L${b.x} ${b.y}`} {...common} />
}

// ---------------------------------------------------------------------------
// Seçim katmanı (ekran koordinatı: tutamaklar yakınlaştırmadan bağımsız boyutta)
// ---------------------------------------------------------------------------

function Overlay({ tiles, sel, view, tool, editing, rotateOn }: { tiles: Tile[]; sel: string[]; view: { x: number; y: number; z: number }; tool: Tool; editing: string | null; rotateOn: boolean }) {
  const sc = (p: Pt) => ({ x: p.x * view.z + view.x, y: p.y * view.z + view.y })
  const set = new Set(sel)
  const selected = tiles.filter((t) => set.has(t.id))
  const items: React.ReactNode[] = []

  // Tek seçili parçanın tutamakları
  const only = selected.length === 1 ? selected[0] : null
  const odef = only && getDef(only.type)
  if (only && odef?.handles && tool === 'move' && !only.locked) {
    const t = only
    for (const h of odef.handles(t)) {
      const p = sc(toWorld(t, h))
      items.push(
        <g key={`${t.id}:${h.id}`} data-tid={t.id} data-handle={h.id} className="pp-handle" transform={`translate(${p.x} ${p.y})`}>
          <circle r={18} fill="transparent" />
          {!h.hidden && <circle r={7} fill="#fff" stroke={h.color ?? 'var(--pp-accent)'} strokeWidth={2.5} />}
        </g>,
      )
    }
  }

  if (!selected.length || editing) return <g className="pp-overlay">{items}</g>

  const outlines = selected.map((t) => {
    const def = getDef(t.type)
    if (!def) return null
    const b = pad(def.bounds(t), 4 / view.z)
    const pts = boxCorners(b).map((p) => sc(toWorld(t, p)))
    return <path key={`o${t.id}`} d={`M${pts.map((p) => `${p.x} ${p.y}`).join('L')}Z`} className="pp-sel" />
  })

  let rot: React.ReactNode = null
  const lockedAll = selected.every((t) => t.locked)
  const canRotate = rotateOn && !lockedAll && tool === 'move' && selected.every((t) => getDef(t.type)?.rotatable !== false)
  if (canRotate) {
    let anchor: Pt
    let dir: Pt
    if (selected.length === 1) {
      const t = selected[0]
      const b = pad(getDef(t.type)!.bounds(t), 4 / view.z)
      const top = toWorld(t, { x: b.x + b.w / 2, y: b.y })
      const c = toWorld(t, { x: b.x + b.w / 2, y: b.y + b.h / 2 })
      anchor = sc(top)
      const l = dist(top, c) || 1
      dir = { x: (top.x - c.x) / l, y: (top.y - c.y) / l }
    } else {
      const b = boundsOf(selected.flatMap((t) => boxCorners(worldBox(t))))
      anchor = sc({ x: b.x + b.w / 2, y: b.y })
      dir = { x: 0, y: -1 }
      const p1 = sc({ x: b.x, y: b.y })
      const p2 = sc({ x: b.x + b.w, y: b.y + b.h })
      outlines.push(<rect key="group" x={p1.x - 4} y={p1.y - 4} width={p2.x - p1.x + 8} height={p2.y - p1.y + 8} className="pp-sel group" />)
    }
    const hp = { x: anchor.x + dir.x * 30, y: anchor.y + dir.y * 30 }
    rot = (
      <g>
        <line x1={anchor.x} y1={anchor.y} x2={hp.x} y2={hp.y} className="pp-rot-line" />
        <g data-handle="__rotate" data-tid={selected[0].id} className="pp-handle pp-rot" transform={`translate(${hp.x} ${hp.y})`}>
          <circle r={20} fill="transparent" />
          <circle r={11} fill="var(--pp-accent)" />
          <path d="M4.5 -1.5a4.8 4.8 0 1 1 -1.4 -3.4M4.5 -6v4.5h-4.5" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
    )
  }

  return (
    <g className="pp-overlay">
      {outlines}
      {rot}
      {items}
    </g>
  )
}
