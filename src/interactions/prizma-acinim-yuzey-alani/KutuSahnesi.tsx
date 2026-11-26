import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { Box, Hand, PackageOpen, RotateCcw } from 'lucide-react'
import { Stage3D, VIEW_INFO, clearGroup, makeFlatText, makeLabel, makeShadowFloor, reducedMotion, type ViewDir, type ViewState } from '../kup-yapi-gorunumleri/sahne'
import { Slider } from '../donusum-studyosu/ortak'
import { FACE_NAME, PAIR_COLOR, PAIR_OF, bounds, buildHierarchy, maxDepth, setFold, slots, tree, type Analysis, type FaceDef, type FaceId, type NetDef } from './acinim'

/**
 * Dikdörtgenler prizmasının açınımını gerçek 3B sahnede katlayan/açan sahne.
 *  - Yüzler kareli (birim kareler sayılabilir), karşılıklı yüzler aynı renkte.
 *  - t = 0 açınım yerde düz, t = 1 kutu kapalı. Önce duvarlar, sonra onlara bağlı yüzler kalkar.
 *  - Yüze dokununca onFaceTap; labels ile yüz adı / boyut / alan yazısı.
 *  - analysis verilirse ve kutu kapalıysa: taşan / üst üste binen yüzler kırmızı, boş kalan yerler kırmızı çerçeve.
 *  - cubes: kutu kapalıyken içini birim küplerle doldurur (hacim aynı mı?)
 */

export type LabelMode = 'none' | 'name' | 'dims' | 'area'

export interface BoxSceneProps {
  a: number
  b: number
  c: number
  net: NetDef
  t: number
  labels?: LabelMode
  /** yalnızca bu yüzlerde yazı (verilmezse hepsinde) */
  labelOn?: Set<FaceId>
  glow?: Set<FaceId>
  hidden?: Set<FaceId>
  onFaceTap?: (id: FaceId) => void
  analysis?: Analysis | null
  cubes?: boolean
  paper?: string
  className?: string
  views?: ViewDir[]
  overlay?: ReactNode
}

const PX = 64

function faceTexture(w: number, h: number, color: string, mode: 'normal' | 'glow' | 'bad') {
  const px = Math.max(16, Math.min(PX, Math.floor(1024 / Math.max(w, h))))
  const cv = document.createElement('canvas')
  cv.width = Math.max(2, Math.round(w * px))
  cv.height = Math.max(2, Math.round(h * px))
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = mode === 'bad' ? '#fca5a5' : color
  ctx.fillRect(0, 0, cv.width, cv.height)
  if (mode === 'glow') {
    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    ctx.fillRect(0, 0, cv.width, cv.height)
  }
  if (mode === 'bad') {
    ctx.strokeStyle = 'rgba(220,38,38,0.55)'
    ctx.lineWidth = px * 0.18
    for (let x = -cv.height; x < cv.width; x += px * 0.6) {
      ctx.beginPath()
      ctx.moveTo(x, cv.height)
      ctx.lineTo(x + cv.height, 0)
      ctx.stroke()
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = Math.max(2, px * 0.05)
  for (let i = 1; i < w; i++) {
    ctx.beginPath()
    ctx.moveTo(i * px, 0)
    ctx.lineTo(i * px, cv.height)
    ctx.stroke()
  }
  for (let j = 1; j < h; j++) {
    ctx.beginPath()
    ctx.moveTo(0, j * px)
    ctx.lineTo(cv.width, j * px)
    ctx.stroke()
  }
  if (mode === 'glow') {
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = px * 0.12
    ctx.strokeRect(0, 0, cv.width, cv.height)
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

function labelText(f: FaceDef, mode: LabelMode) {
  if (mode === 'name') return FACE_NAME[f.id]
  if (mode === 'dims') return `${f.w} × ${f.h}`
  if (mode === 'area') return `${f.w * f.h}`
  return ''
}

export function BoxScene({ a, b, c, net, t, labels = 'none', labelOn, glow, hidden, onFaceTap, analysis, cubes, paper, className = 'h-[360px] sm:h-[460px]', views = ['iso', 'ust', 'on'], overlay }: BoxSceneProps) {
  const host = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState<Stage3D | null>(null)
  const [vs, setVs] = useState<ViewState>({ view: 'iso', flat: false })
  const [touched, setTouched] = useState(false)
  const faces = useMemo(() => net.faces(a, b, c).filter((f) => !hidden?.has(f.id) || !f.parent), [net, a, b, c, hidden])
  const allFaces = useMemo(() => net.faces(a, b, c), [net, a, b, c])
  const root = useMemo(() => tree(faces), [faces])
  const K = useMemo(() => maxDepth(root), [root])
  const parts = useRef<{ outer: THREE.Group; groups: ReturnType<typeof buildHierarchy>['groups'] | null; meshes: THREE.Mesh[]; extra: THREE.Group; fill: THREE.Group } | null>(null)
  const tapRef = useRef(onFaceTap)
  tapRef.current = onFaceTap
  const tRef = useRef(t)
  tRef.current = t

  useEffect(() => {
    const s = new Stage3D(host.current!)
    s.world.add(makeShadowFloor())
    const outer = new THREE.Group()
    const extra = new THREE.Group()
    const fill = new THREE.Group()
    s.world.add(outer, extra, fill)
    parts.current = { outer, groups: null, meshes: [], extra, fill }
    const sh = s.sun.shadow.camera
    sh.left = -14
    sh.right = 14
    sh.top = 14
    sh.bottom = -14
    sh.updateProjectionMatrix()
    s.sun.shadow.mapSize.set(2048, 2048)
    const off = [s.onView(setVs), s.onFirstTouch(() => setTouched(true))]
    const offTap = s.onTap((x, y) => {
      const p = parts.current
      if (!p || !tapRef.current) return
      const hit = s.pick(x, y, p.meshes, false)[0]
      if (hit) tapRef.current(hit.object.userData.face as FaceId)
    })
    setStage(s)
    return () => {
      off.forEach((f) => f())
      offTap()
      parts.current = null
      s.dispose()
    }
  }, [])

  /* kadraj: açınım ve kutu sığsın */
  const bb = useMemo(() => bounds(allFaces), [allFaces])
  useEffect(() => {
    if (!stage) return
    const cx = (bb.u0 + bb.u1) / 2 - a / 2
    const cz = b / 2 - (bb.v0 + bb.v1) / 2
    const r = Math.max(Math.hypot(bb.w / 2, bb.h / 2) * 0.82, Math.hypot(a, b, c) / 2 + 0.6)
    stage.frameTo(new THREE.Vector3(cx * 0.8, c * 0.25, cz * 0.8), r, stage.state.view && stage.state.view !== 'iso' ? stage.state.view : 'iso')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, bb.u0, bb.u1, bb.v0, bb.v1, a, b, c])

  const glowKey = [...(glow ?? [])].sort().join()
  const labelKey = labels + [...(labelOn ?? ['*'])].sort().join()
  const showBad = !!analysis && t > 0.995
  const badKey = showBad ? analysis!.bad.join() + '|' + analysis!.holes.join() : ''
  const showCubes = !!cubes && t > 0.995 && !analysis?.bad.length

  /* yüzleri kur */
  useEffect(() => {
    const p = parts.current
    if (!stage || !p) return
    clearGroup(p.outer)
    clearGroup(p.extra)
    const bad = new Set(showBad ? analysis!.bad : [])
    const meshes: THREE.Mesh[] = []
    const { top, groups } = buildHierarchy(root, (f) => {
      const mode = bad.has(f.id) ? 'bad' : glow?.has(f.id) ? 'glow' : 'normal'
      const col = paper ?? PAIR_COLOR[PAIR_OF[f.id]]
      // içi birim küplerle doluyken yüzler yarı saydam olsun ki küpler görünsün
      const mat = new THREE.MeshStandardMaterial({ map: faceTexture(f.w, f.h, col, mode), side: THREE.DoubleSide, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, transparent: showCubes, opacity: showCubes ? 0.3 : 1, depthWrite: !showCubes })
      const geo = new THREE.PlaneGeometry(f.w, f.h)
      const m = new THREE.Mesh(geo, mat)
      m.castShadow = true
      m.receiveShadow = true
      m.userData.face = f.id
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: '#1e293b' })))
      const txt = labels !== 'none' && (!labelOn || labelOn.has(f.id)) ? labelText(f, labels) : ''
      if (txt) {
        const size = Math.min(0.75, f.h * 0.42, 0.5 + Math.min(f.w, f.h) * 0.08)
        const lbl = makeFlatText(txt, { size, bg: 'rgba(255,255,255,0.88)' })
        const lw = (lbl.geometry as THREE.PlaneGeometry).parameters.width
        if (lw > f.w * 0.92) lbl.scale.setScalar((f.w * 0.92) / lw)
        lbl.position.z = 0.02
        m.add(lbl)
      }
      meshes.push(m)
      return m
    })
    p.groups = groups
    p.meshes = meshes
    p.outer.add(top)
    p.outer.rotation.x = -Math.PI / 2
    p.outer.position.set(-a / 2, 0.012, b / 2)
    setFold(groups, tRef.current, K)

    if (showBad) {
      for (const s of slots(a, b, c).filter((x) => analysis!.holes.includes(x.id))) {
        const g = new THREE.PlaneGeometry(s.dims[0], s.dims[1])
        if (s.normal === 'y') g.rotateX(Math.PI / 2)
        if (s.normal === 'x') {
          g.rotateX(Math.PI / 2)
          g.rotateZ(Math.PI / 2)
        }
        const hole = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }))
        hole.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: '#dc2626' })))
        hole.position.copy(s.c)
        const lbl = makeLabel('BOŞ!', { color: '#b91c1c', ring: '#fca5a5', size: 0.55 })
        lbl.position.set(0, 0, 0)
        hole.add(lbl)
        const holder = new THREE.Group()
        holder.rotation.x = -Math.PI / 2
        holder.position.set(-a / 2, 0.012, b / 2)
        holder.add(hole)
        p.extra.add(holder)
      }
    }
    stage.invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, root, K, labelKey, glowKey, badKey, paper, a, b, c, showCubes])

  /* katla */
  useEffect(() => {
    const p = parts.current
    if (!stage || !p?.groups) return
    setFold(p.groups, t, K)
    stage.invalidate()
  }, [t, stage, K, root])

  /* birim küplerle doldur */
  useEffect(() => {
    const p = parts.current
    if (!stage || !p) return
    clearGroup(p.fill)
    if (showCubes) {
      const geo = new THREE.BoxGeometry(0.92, 0.92, 0.92)
      const mat = new THREE.MeshStandardMaterial({ color: '#34d399', roughness: 0.5 })
      const edges = new THREE.EdgesGeometry(geo)
      const lm = new THREE.LineBasicMaterial({ color: '#065f46' })
      const list: THREE.Mesh[] = []
      for (let y = 0; y < c; y++)
        for (let z = 0; z < b; z++)
          for (let x = 0; x < a; x++) {
            const m = new THREE.Mesh(geo, mat)
            m.add(new THREE.LineSegments(edges, lm))
            m.position.set(x + 0.5 - a / 2, y + 0.5, z + 0.5 - b / 2)
            m.scale.setScalar(0.001)
            p.fill.add(m)
            list.push(m)
          }
      list.forEach((m, i) => {
        window.setTimeout(() => stage.animate(220, (k) => m.scale.setScalar(Math.max(0.001, k))), reducedMotion() ? 0 : i * 35)
      })
    }
    stage.invalidate()
  }, [showCubes, stage, a, b, c])

  const flatLabel = vs.flat && vs.view && vs.view !== 'iso' ? VIEW_INFO[vs.view] : null
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-b from-sky-50 to-white ring-1 ring-line ${className}`}>
      <div ref={host} className="absolute inset-0 touch-none select-none" />
      {views.length > 0 && (
        <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-wrap gap-1.5">
          {views.map((v) => {
            const on = vs.view === v
            const info = VIEW_INFO[v]
            return (
              <button key={v} type="button" onClick={() => stage?.look(v, false)} aria-pressed={on} className={`pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-black shadow-sm ring-2 transition active:scale-95 ${on ? 'text-white' : 'bg-white/95 text-ink ring-line'}`} style={on ? { background: info.color, boxShadow: `0 0 0 2px ${info.color}` } : undefined}>
                {v === 'iso' ? <RotateCcw size={16} /> : <span className="size-3 rounded-sm" style={{ background: info.color }} />}
                {v === 'iso' ? '3B' : info.label}
              </button>
            )
          })}
        </div>
      )}
      {flatLabel && <div className="pointer-events-none absolute bottom-2 left-2 rounded-xl px-3 py-1.5 text-sm font-black text-white shadow" style={{ background: flatLabel.color }}>{flatLabel.label} bakış</div>}
      {!touched && (
        <div className="pointer-events-none absolute right-2 bottom-2 flex items-center gap-1.5 rounded-xl bg-slate-900/80 px-3 py-1.5 text-xs font-extrabold text-white sm:text-sm">
          <Hand size={16} className="animate-bounce" /> Sürükle: çevir · iki parmak: yakınlaş
        </div>
      )}
      {overlay}
    </div>
  )
}

/* ───────────── katlama denetimi ───────────── */

export function useFold(initial = 0) {
  const [t, setTState] = useState(initial)
  const cur = useRef(initial)
  const raf = useRef(0)
  const [moving, setMoving] = useState(false)
  const set = useCallback((v: number) => {
    cancelAnimationFrame(raf.current)
    setMoving(false)
    cur.current = v
    setTState(v)
  }, [])
  const animateTo = useCallback((to: number, done?: () => void, ms = 1800) => {
    cancelAnimationFrame(raf.current)
    const from = cur.current
    const dur = (reducedMotion() ? 300 : ms) * Math.abs(to - from)
    if (dur < 20) {
      set(to)
      done?.()
      return
    }
    const start = performance.now()
    setMoving(true)
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / dur)
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
      cur.current = from + (to - from) * e
      setTState(cur.current)
      if (k < 1) raf.current = requestAnimationFrame(step)
      else {
        setMoving(false)
        done?.()
      }
    }
    raf.current = requestAnimationFrame(step)
  }, [set])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  return { t, set, animateTo, moving }
}

export function FoldControls({ fold, disabled }: { fold: ReturnType<typeof useFold>; disabled?: boolean }) {
  const { t, set, animateTo, moving } = fold
  return (
    <div className="rounded-2xl bg-white text-ink p-2 ring-1 ring-line">
      <div className="mb-1 flex gap-2">
        <button type="button" disabled={disabled || moving || t < 0.001} onClick={() => animateTo(0)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white text-ink text-base font-black ring-2 ring-line active:scale-95 disabled:opacity-40"><PackageOpen size={20} /> Aç</button>
        <button type="button" disabled={disabled || moving || t > 0.999} onClick={() => animateTo(1)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-pink-600 text-base font-black text-white active:scale-95 disabled:opacity-40"><Box size={20} /> Katla</button>
      </div>
      <Slider label="Katlama" value={Math.round(t * 100)} onChange={(v) => set(v / 100)} min={0} max={100} step={1} format={(v) => (v === 0 ? 'açık' : v === 100 ? 'kapalı' : `%${v}`)} disabled={disabled} />
    </div>
  )
}

/** Açınımın küçük 2B resmi (kart üstünde) */
export function NetThumb({ faces, size = 120, pair = true }: { faces: FaceDef[]; size?: number; pair?: boolean }) {
  const bb = bounds(faces)
  const s = size / Math.max(bb.w, bb.h)
  return (
    <svg width={bb.w * s + 4} height={bb.h * s + 4} viewBox={`-2 -2 ${bb.w * s + 4} ${bb.h * s + 4}`} aria-hidden>
      {faces.map((f) => (
        <rect key={f.id} x={(f.u - bb.u0) * s} y={(bb.v1 - f.v - f.h) * s} width={f.w * s} height={f.h * s} fill={pair ? PAIR_COLOR[PAIR_OF[f.id]] : '#e2e8f0'} stroke="#1e293b" strokeWidth={1.5} />
      ))}
    </svg>
  )
}
