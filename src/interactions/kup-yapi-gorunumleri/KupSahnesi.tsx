import { useEffect, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { Eraser, Hand, Paintbrush, Plus, RotateCcw, Trash2, Undo2 } from 'lucide-react'
import { Stage3D, VIEW_INFO, clearGroup, makeGround, makeSideLabels, syncSideLabels, type ViewDir, type ViewState } from './sahne'
import { cloneMap, dims, type HMap, type ViewKind } from './yapi'

/**
 * Eş küplerle kurulmuş bir yapının gerçek 3B görünümü.
 *  - Sürükle: döndür · iki parmak / tekerlek: yakınlaş · “Önden / Sağdan / Üstten”: o yönden düz bakış
 *  - “Görünen yüzleri boya”: seçili yönden görünen yüzler o yönün rengine boyanır (görünüm = boyalı kareler)
 *  - onChange verilirse yapı kurulur: küpü tepsiden yapıya sürükle ya da bir yüze / zemine dokun;
 *    “Sil” kipinde dokunulan kulenin en üstteki küpü kalkar. Küpler yer çekimiyle durur.
 */

const BOX = new THREE.BoxGeometry(1, 1, 1)
BOX.userData.shared = true
const EDGES = new THREE.EdgesGeometry(BOX)
EDGES.userData.shared = true
const PLANE = new THREE.PlaneGeometry(0.94, 0.94)
PLANE.userData.shared = true

type Target = { x: number; d: number }

export interface CubeSceneProps {
  h: HMap
  onChange?: (h: HMap) => void
  maxH?: number
  color?: string
  /** gösterilecek bakış düğmeleri (boş dizi: hiçbiri) */
  views?: ViewDir[]
  /** görünen yüzleri boyama düğmesi */
  paintable?: boolean
  /** başlangıçta boyama açık mı */
  paintOn?: boolean
  /** yalnızca ekleme (silme kipi yok) */
  addOnly?: boolean
  /** her eklemede çağrılır (ör. dedektif görevinde tek küp kuralı) */
  canAdd?: (h: HMap) => boolean
  className?: string
  below?: ReactNode
  onStage?: (s: Stage3D | null) => void
  /** kırmızıyla vurgulanacak küpler (x, d, kat) */
  flash?: [number, number, number][]
}

export function CubeScene({ h, onChange, maxH = 4, color = '#60a5fa', views = ['iso', 'on', 'sag', 'ust'], paintable = true, paintOn = false, addOnly, canAdd, className = 'h-[360px] sm:h-[440px]', below, onStage, flash }: CubeSceneProps) {
  const host = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState<Stage3D | null>(null)
  const [vs, setVs] = useState<ViewState>({ view: 'iso', flat: false })
  const [touched, setTouched] = useState(false)
  const [paint, setPaint] = useState(paintOn)
  const [mode, setMode] = useState<'add' | 'del'>('add')
  const hist = useRef<HMap[]>([])
  const start = useRef(cloneMap(h))
  const { W, D } = dims(h)
  const build = !!onChange

  const refs = useRef<{ cubes: THREE.Group; cubeMeshes: THREE.Mesh[]; overlay: THREE.Group; ghost: THREE.Group; plane: THREE.Mesh; flash: THREE.Group } | null>(null)
  const prev = useRef<Set<string>>(new Set())
  const hRef = useRef(h)
  hRef.current = h
  const modeRef = useRef(mode)
  modeRef.current = mode
  const changeRef = useRef(onChange)
  changeRef.current = onChange
  const canAddRef = useRef(canAdd)
  canAddRef.current = canAdd

  /* sahneyi kur */
  useEffect(() => {
    const s = new Stage3D(host.current!)
    const { group: ground, plane } = makeGround(W, D)
    s.world.add(ground)
    const sides = makeSideLabels(W, D, 0.85)
    s.world.add(sides)
    const cubes = new THREE.Group()
    const overlay = new THREE.Group()
    const flashG = new THREE.Group()
    const ghost = new THREE.Group()
    const gm = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: '#0ea5e9', transparent: true, opacity: 0.35, depthWrite: false }))
    const gl = new THREE.LineSegments(EDGES, new THREE.LineBasicMaterial({ color: '#0369a1' }))
    ghost.add(gm, gl)
    ghost.visible = false
    s.world.add(cubes, overlay, flashG, ghost)
    refs.current = { cubes, cubeMeshes: [], overlay, ghost, plane, flash: flashG }
    s.frameTo(new THREE.Vector3(0, maxH * 0.32, 0), Math.hypot(W / 2 + 1, D / 2 + 1, maxH / 2) * 0.8)
    const off = [s.onView((v) => { setVs(v); syncSideLabels(sides, v) }), s.onFirstTouch(() => setTouched(true))]
    setStage(s)
    onStage?.(s)
    return () => {
      off.forEach((f) => f())
      onStage?.(null)
      refs.current = null
      s.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, D, maxH])

  const X = (x: number) => x - (W - 1) / 2
  const Z = (d: number) => (D - 1) / 2 - d

  /* küpleri çiz */
  useEffect(() => {
    const r = refs.current
    if (!stage || !r) return
    clearGroup(r.cubes)
    r.cubeMeshes = []
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })
    const top = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).offsetHSL(0, 0, 0.06), roughness: 0.55, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })
    const line = new THREE.LineBasicMaterial({ color: '#1e293b' })
    const now = new Set<string>()
    const fresh: THREE.Object3D[] = []
    h.forEach((row, d) =>
      row.forEach((v, x) => {
        for (let y = 0; y < v; y++) {
          const k = `${x},${d},${y}`
          now.add(k)
          const m = new THREE.Mesh(BOX, y === v - 1 ? [mat, mat, top, mat, mat, mat] : mat)
          m.castShadow = true
          m.receiveShadow = true
          m.position.set(X(x), y + 0.5, Z(d))
          m.userData = { cube: true, x, d, y }
          m.add(new THREE.LineSegments(EDGES, line))
          r.cubes.add(m)
          r.cubeMeshes.push(m)
          if (prev.current.size && !prev.current.has(k)) fresh.push(m)
        }
      }),
    )
    prev.current = now
    fresh.forEach((m) => {
      const y0 = m.position.y
      stage.animate(260, (k) => {
        m.position.y = y0 + (1 - k) * 0.9
        m.scale.setScalar(0.7 + 0.3 * k)
      })
    })
    stage.invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h, stage, color])

  /* görünen yüzleri boya */
  const paintKind: ViewKind | null = paint && vs.view && vs.view !== 'iso' ? (vs.view as ViewKind) : null
  useEffect(() => {
    const r = refs.current
    if (!stage || !r) return
    clearGroup(r.overlay)
    if (paintKind) {
      const mat = new THREE.MeshBasicMaterial({ color: VIEW_INFO[paintKind].color, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
      for (const [x, d, y] of visibleFaces(h, paintKind)) {
        const p = new THREE.Mesh(PLANE, mat)
        const c = new THREE.Vector3(X(x), y + 0.5, Z(d))
        if (paintKind === 'on') c.z += 0.502
        if (paintKind === 'arka') { c.z -= 0.502; p.rotation.y = Math.PI }
        if (paintKind === 'sag') { c.x += 0.502; p.rotation.y = Math.PI / 2 }
        if (paintKind === 'sol') { c.x -= 0.502; p.rotation.y = -Math.PI / 2 }
        if (paintKind === 'ust') { c.y = y + 1.002; p.rotation.x = -Math.PI / 2 }
        p.position.copy(c)
        r.overlay.add(p)
      }
    }
    stage.invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paintKind, h, stage])

  /* kırmızı vurgu */
  useEffect(() => {
    const r = refs.current
    if (!stage || !r) return
    clearGroup(r.flash)
    for (const [x, d, y] of flash ?? []) {
      const m = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0.45, depthWrite: false }))
      m.scale.setScalar(1.06)
      m.position.set(X(x), y + 0.5, Z(d))
      r.flash.add(m)
    }
    stage.invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash, stage])

  /* dokunma ve gezinme */
  const targetAt = (cx: number, cy: number, m: 'add' | 'del'): Target | null => {
    const r = refs.current
    if (!stage || !r) return null
    const hm = hRef.current
    const hits = stage.pick(cx, cy, [...r.cubeMeshes, r.plane], false)
    const hit = hits[0]
    if (!hit) return null
    const ud = hit.object.userData
    if (ud.cube) {
      if (m === 'del') return { x: ud.x, d: ud.d }
      const n = hit.face?.normal
      if (!n) return null
      let t: Target
      if (n.y > 0.5) t = { x: ud.x, d: ud.d }
      else if (n.y < -0.5) return null
      else if (Math.abs(n.x) > 0.5) t = { x: ud.x + Math.sign(n.x), d: ud.d }
      else t = { x: ud.x, d: ud.d - Math.sign(n.z) }
      if (t.x < 0 || t.x >= W || t.d < 0 || t.d >= D || hm[t.d][t.x] >= maxH) return null
      return t
    }
    if (ud.ground && m === 'add') {
      const x = Math.round(hit.point.x + (W - 1) / 2)
      const d = Math.round((D - 1) / 2 - hit.point.z)
      if (x < 0 || x >= W || d < 0 || d >= D || hm[d][x] >= maxH) return null
      return { x, d }
    }
    return null
  }
  const showGhost = (t: Target | null, m: 'add' | 'del') => {
    const r = refs.current
    if (!r || !stage) return
    const g = r.ghost
    if (!t) {
      if (g.visible) stage.invalidate()
      g.visible = false
      return
    }
    const hm = hRef.current
    const y = m === 'add' ? hm[t.d][t.x] : hm[t.d][t.x] - 1
    ;((g.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set(m === 'add' ? '#0ea5e9' : '#ef4444')
    g.scale.setScalar(m === 'add' ? 1 : 1.05)
    g.position.set(X(t.x), y + 0.5, Z(t.d))
    g.visible = true
    stage.invalidate()
  }
  const apply = (t: Target, m: 'add' | 'del') => {
    const hm = hRef.current
    const next = cloneMap(hm)
    if (m === 'add') {
      if (next[t.d][t.x] >= maxH) return
      next[t.d][t.x]++
      if (canAddRef.current && !canAddRef.current(next)) return
    } else {
      if (next[t.d][t.x] <= 0) return
      next[t.d][t.x]--
    }
    hist.current.push(hm)
    changeRef.current?.(next)
  }

  useEffect(() => {
    if (!stage || !build) return
    const offTap = stage.onTap((cx, cy) => {
      const m = modeRef.current
      const t = targetAt(cx, cy, m)
      if (t) apply(t, m)
      showGhost(null, m)
    })
    const offHover = stage.onHover((cx, cy, inside) => showGhost(inside ? targetAt(cx, cy, modeRef.current) : null, modeRef.current))
    return () => {
      offTap()
      offHover()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, build, W, D, maxH])

  /* tepsiden küp sürükleme */
  const [drag, setDrag] = useState<{ x: number; y: number; ok: boolean } | null>(null)
  const onTrayDown = (e: React.PointerEvent) => {
    if (e.button > 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ x: e.clientX, y: e.clientY, ok: false })
  }
  const onTrayMove = (e: React.PointerEvent) => {
    if (!drag) return
    const t = targetAt(e.clientX, e.clientY, 'add')
    showGhost(t, 'add')
    setDrag({ x: e.clientX, y: e.clientY, ok: !!t })
  }
  const onTrayUp = (e: React.PointerEvent) => {
    if (!drag) return
    const t = targetAt(e.clientX, e.clientY, 'add')
    if (t) apply(t, 'add')
    showGhost(null, 'add')
    setDrag(null)
  }

  const undo = () => {
    const p = hist.current.pop()
    if (p) onChange?.(p)
  }
  const clear = () => {
    hist.current.push(hRef.current)
    onChange?.(start.current.map((r) => r.map(() => 0)))
  }
  const reset = () => {
    hist.current.push(hRef.current)
    onChange?.(cloneMap(start.current))
  }
  const startEmpty = start.current.flat().every((v) => v === 0)

  const flatLabel = vs.flat && vs.view && vs.view !== 'iso' ? VIEW_INFO[vs.view] : null
  return (
    <div className="space-y-2">
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-b from-sky-50 to-white ring-1 ring-line ${className}`}>
        <div ref={host} className="absolute inset-0 touch-none select-none" />
        {views.length > 0 && (
          <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-wrap gap-1.5">
            {views.map((v) => {
              const on = vs.view === v
              const info = VIEW_INFO[v]
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => stage?.look(v)}
                  aria-pressed={on}
                  className={`pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-black shadow-sm ring-2 transition active:scale-95 ${on ? 'text-white' : 'bg-white/95 text-ink ring-line'}`}
                  style={on ? { background: info.color, boxShadow: `0 0 0 2px ${info.color}` } : undefined}
                >
                  {v === 'iso' ? <RotateCcw size={16} /> : <span className="size-3 rounded-sm" style={{ background: info.color }} />}
                  {v === 'iso' ? '3B' : info.label}
                </button>
              )
            })}
          </div>
        )}
        {flatLabel && (
          <div className="pointer-events-none absolute bottom-2 left-2 rounded-xl px-3 py-1.5 text-sm font-black text-white shadow animate-fade-up" style={{ background: flatLabel.color }}>
            Düz bakış: {flatLabel.label.toLowerCase()} görünüm
          </div>
        )}
        {!touched && (
          <div className="pointer-events-none absolute right-2 bottom-2 flex items-center gap-1.5 rounded-xl bg-slate-900/80 px-3 py-1.5 text-xs font-extrabold text-white sm:text-sm">
            <Hand size={16} className="animate-bounce" /> Sürükle: çevir · iki parmak: yakınlaş
          </div>
        )}
        {drag && (
          <div className="pointer-events-none fixed z-[1000] -translate-x-1/2 -translate-y-1/2" style={{ left: drag.x, top: drag.y }}>
            <CubeIcon size={46} color={color} faded={!drag.ok} />
          </div>
        )}
      </div>

      {(build || paintable) && (
        <div className="flex flex-wrap items-center gap-2">
          {build && (
            <div
              role="button"
              tabIndex={0}
              aria-label="Küp tepsisi: küpü tutup yapıya sürükle"
              onPointerDown={onTrayDown}
              onPointerMove={onTrayMove}
              onPointerUp={onTrayUp}
              onPointerCancel={() => { setDrag(null); showGhost(null, 'add') }}
              className="flex min-h-14 cursor-grab touch-none items-center gap-2 rounded-2xl bg-white text-ink px-3 py-1.5 shadow-[0_3px_0_#cbd5e1] ring-2 ring-sky-300 select-none active:cursor-grabbing"
            >
              <CubeIcon size={36} color={color} />
              <span className="text-sm leading-tight font-black text-sky-800">Küpü tut,<br />yapıya sürükle</span>
            </div>
          )}
          {build && !addOnly && (
            <div className="flex rounded-2xl bg-white text-ink p-1 ring-1 ring-line">
              <button type="button" onClick={() => setMode('add')} aria-pressed={mode === 'add'} className={`inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-black ${mode === 'add' ? 'bg-sky-600 text-white' : 'text-ink'}`}><Plus size={16} /> Ekle</button>
              <button type="button" onClick={() => setMode('del')} aria-pressed={mode === 'del'} className={`inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-black ${mode === 'del' ? 'bg-red-600 text-white' : 'text-ink'}`}><Eraser size={16} /> Sil</button>
            </div>
          )}
          {build && (
            <button type="button" onClick={undo} className="inline-flex min-h-12 items-center gap-1 rounded-xl bg-white text-ink px-3 text-sm font-black ring-1 ring-line active:scale-95"><Undo2 size={16} /> Geri al</button>
          )}
          {build && !addOnly && (
            <button type="button" onClick={startEmpty ? clear : reset} className="inline-flex min-h-12 items-center gap-1 rounded-xl bg-white text-ink px-3 text-sm font-black ring-1 ring-line active:scale-95">{startEmpty ? <><Trash2 size={16} /> Temizle</> : <><RotateCcw size={16} /> Baştan</>}</button>
          )}
          {paintable && (
            <button type="button" onClick={() => setPaint((p) => !p)} aria-pressed={paint} className={`inline-flex min-h-12 items-center gap-1.5 rounded-xl px-3 text-sm font-black ring-1 active:scale-95 ${paint ? 'bg-amber-400 text-amber-950 ring-amber-500' : 'bg-white text-ink ring-line'}`}>
              <Paintbrush size={16} /> Görünen yüzleri boya
            </button>
          )}
        </div>
      )}
      {build && (
        <p className="text-xs font-bold text-slate-300">
          {mode === 'add' ? 'İpucu: Küpü sürüklemek yerine bir küpün yüzüne ya da zemindeki kareye dokunarak da ekleyebilirsin.' : 'Sil kipi: dokunduğun kulenin en üstteki küpü kalkar.'}
        </p>
      )}
      {paint && !paintKind && paintable && <p className="text-xs font-bold text-amber-300">Boyamayı görmek için “Önden”, “Sağdan” ya da “Üstten” düğmesine bas.</p>}
      {below}
    </div>
  )
}

/** Bir yönden bakınca görünen küp yüzleri: [x, d, kat] */
export function visibleFaces(h: HMap, k: ViewKind): [number, number, number][] {
  const { W, D, H } = dims(h)
  const out: [number, number, number][] = []
  if (k === 'ust') {
    h.forEach((row, d) => row.forEach((v, x) => v > 0 && out.push([x, d, v - 1])))
    return out
  }
  for (let y = 0; y < H; y++) {
    if (k === 'on' || k === 'arka') {
      for (let x = 0; x < W; x++) {
        const ds = Array.from({ length: D }, (_, i) => (k === 'on' ? i : D - 1 - i))
        const d = ds.find((dd) => h[dd][x] > y)
        if (d !== undefined) out.push([x, d, y])
      }
    } else {
      for (let d = 0; d < D; d++) {
        const xs = Array.from({ length: W }, (_, i) => (k === 'sag' ? W - 1 - i : i))
        const x = xs.find((xx) => h[d][xx] > y)
        if (x !== undefined) out.push([x, d, y])
      }
    }
  }
  return out
}

/** Tepsideki küp simgesi (izometrik) */
export function CubeIcon({ size = 36, color = '#60a5fa', faded }: { size?: number; color?: string; faded?: boolean }) {
  const c = new THREE.Color(color)
  const hex = (f: number) => '#' + c.clone().offsetHSL(0, 0, f).getHexString()
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden style={{ opacity: faded ? 0.55 : 1, filter: 'drop-shadow(0 4px 4px rgb(15 23 42 / 0.25))' }}>
      <path d="M20 4 L36 12 L20 20 L4 12 Z" fill={hex(0.12)} stroke="#1e293b" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 12 L20 20 L20 37 L4 29 Z" fill={hex(0)} stroke="#1e293b" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M36 12 L20 20 L20 37 L36 29 Z" fill={hex(-0.14)} stroke="#1e293b" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
