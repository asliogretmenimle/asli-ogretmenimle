import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * Gerçek 3B sahne (three.js) — 101 Küp Yapılar ve Görünümleri ile 102 Prizmanın Açınımı ve Yüzey Alanı ortak motoru.
 *  - Tek parmakla / fareyle sürükleyince döner, iki parmakla ya da tekerlekle yakınlaşır (OrbitControls).
 *  - look('on' | 'sag' | 'ust' …) kamerayı o yöne yumuşakça götürür; varışta “düz bakış”a (dik izdüşüm,
 *    OrthographicCamera) geçer: ekrandaki resim tam olarak o yönden görünümdür. Kullanıcı döndürünce yeniden 3B olur.
 *  - Dokunma (sürüklemeden kısa basış) ve fare gezinmesi onTap / onHover ile bildirilir; pick() ışın atar.
 *  - Görüntü yalnızca gerekince çizilir (invalidate), animasyonlar animate() ile kare kare ilerler.
 */

export type ViewDir = 'on' | 'sag' | 'ust' | 'sol' | 'arka' | 'iso'

export const VIEW_INFO: Record<ViewDir, { label: string; theta: number; phi: number; color: string }> = {
  on: { label: 'Önden', theta: 0, phi: Math.PI / 2, color: '#2563eb' },
  sag: { label: 'Sağdan', theta: Math.PI / 2, phi: Math.PI / 2, color: '#ea580c' },
  ust: { label: 'Üstten', theta: 0, phi: 1e-4, color: '#16a34a' },
  sol: { label: 'Soldan', theta: -Math.PI / 2, phi: Math.PI / 2, color: '#9333ea' },
  arka: { label: 'Arkadan', theta: Math.PI, phi: Math.PI / 2, color: '#0891b2' },
  iso: { label: '3B', theta: Math.PI / 5, phi: 0.98, color: '#db2777' },
}

type Ticker = (now: number) => boolean
export interface ViewState { view: ViewDir | null; flat: boolean }

const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2)
export const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export class Stage3D {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly persp = new THREE.PerspectiveCamera(30, 1, 0.1, 400)
  readonly ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400)
  readonly controls: OrbitControls
  /** İçerik buraya eklenir */
  readonly world = new THREE.Group()
  readonly sun: THREE.DirectionalLight
  state: ViewState = { view: 'iso', flat: false }
  radius = 3
  touched = false

  private w = 1
  private h = 1
  private raf = 0
  private dirty = true
  private tickers = new Set<Ticker>()
  private camTicker: Ticker | null = null
  private snapPos: THREE.Vector3 | null = null
  private ro: ResizeObserver
  private viewSubs = new Set<(s: ViewState) => void>()
  private tapSubs = new Set<(x: number, y: number) => void>()
  private hoverSubs = new Set<(x: number, y: number, inside: boolean) => void>()
  private touchSubs = new Set<() => void>()
  private ray = new THREE.Raycaster()
  private ndc = new THREE.Vector2()
  private down: { x: number; y: number; t: number; id: number } | null = null
  private pointers = 0

  constructor(private host: HTMLElement) {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    r.shadowMap.enabled = true
    r.shadowMap.type = THREE.PCFSoftShadowMap
    r.domElement.style.display = 'block'
    r.domElement.style.width = '100%'
    r.domElement.style.height = '100%'
    r.domElement.style.outline = 'none'
    host.appendChild(r.domElement)
    this.renderer = r

    this.scene.add(this.world)
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 1.9))
    const sun = new THREE.DirectionalLight(0xffffff, 2.1)
    sun.position.set(4, 9, 6)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -8
    sun.shadow.camera.right = 8
    sun.shadow.camera.top = 8
    sun.shadow.camera.bottom = -8
    sun.shadow.camera.far = 40
    sun.shadow.bias = -0.0005
    sun.shadow.normalBias = 0.03
    sun.shadow.radius = 4
    this.sun = sun
    this.scene.add(sun)
    this.scene.add(sun.target)
    const fill = new THREE.DirectionalLight(0xffffff, 0.55)
    fill.position.set(-6, 3, -4)
    this.scene.add(fill)

    const c = new OrbitControls(this.persp, r.domElement)
    c.enableDamping = true
    c.dampingFactor = 0.12
    c.enablePan = false
    c.rotateSpeed = 0.9
    c.maxPolarAngle = Math.PI / 2
    c.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }
    c.addEventListener('start', () => {
      this.camTicker = null
      if (!this.touched) {
        this.touched = true
        this.touchSubs.forEach((f) => f())
      }
    })
    c.addEventListener('change', () => {
      this.dirty = true
      if (this.camTicker || !this.snapPos) return
      if (this.persp.position.distanceTo(this.snapPos) > 0.02 * this.radius) {
        this.snapPos = null
        this.setState({ view: null, flat: false })
      }
    })
    this.controls = c

    const el = r.domElement
    el.addEventListener('pointerdown', this.onDown)
    el.addEventListener('pointerup', this.onUp)
    el.addEventListener('pointercancel', this.onCancel)
    el.addEventListener('pointermove', this.onMove)
    el.addEventListener('pointerleave', this.onLeave)
    el.addEventListener('contextmenu', this.prevent)

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(host)
    this.resize()
    this.persp.position.set(6, 5, 8)
    this.raf = requestAnimationFrame(this.frame)
    // geliştirme sırasında tarayıcı testleri sahneye ulaşabilsin
    if (import.meta.env?.DEV) (window as unknown as { __stage3d?: Stage3D }).__stage3d = this
  }

  /** Dünya koordinatındaki bir noktanın ekrandaki yeri (test ve ipucu okları için) */
  toScreen(p: THREE.Vector3) {
    const r = this.renderer.domElement.getBoundingClientRect()
    const v = p.clone().project(this.camera)
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height }
  }

  /* ───── olaylar ───── */

  private prevent = (e: Event) => e.preventDefault()
  private onDown = (e: PointerEvent) => {
    this.pointers++
    this.down = this.pointers === 1 ? { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId } : null
  }
  private onUp = (e: PointerEvent) => {
    this.pointers = Math.max(0, this.pointers - 1)
    const d = this.down
    this.down = null
    if (!d || d.id !== e.pointerId) return
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8 && performance.now() - d.t < 600) this.tapSubs.forEach((f) => f(e.clientX, e.clientY))
  }
  private onCancel = () => {
    this.pointers = 0
    this.down = null
  }
  private onMove = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.buttons === 0) this.hoverSubs.forEach((f) => f(e.clientX, e.clientY, true))
  }
  private onLeave = () => this.hoverSubs.forEach((f) => f(0, 0, false))

  onTap(f: (x: number, y: number) => void) {
    this.tapSubs.add(f)
    return () => void this.tapSubs.delete(f)
  }
  onHover(f: (x: number, y: number, inside: boolean) => void) {
    this.hoverSubs.add(f)
    return () => void this.hoverSubs.delete(f)
  }
  onView(f: (s: ViewState) => void) {
    this.viewSubs.add(f)
    return () => void this.viewSubs.delete(f)
  }
  onFirstTouch(f: () => void) {
    this.touchSubs.add(f)
    return () => void this.touchSubs.delete(f)
  }
  private setState(s: ViewState) {
    this.state = s
    this.dirty = true
    // düz bakışta gölgeler kareli resme karışmasın
    if (this.sun.castShadow === s.flat) this.sun.castShadow = !s.flat
    this.viewSubs.forEach((f) => f(s))
  }

  /* ───── çizim döngüsü ───── */

  invalidate() {
    this.dirty = true
  }
  get camera() {
    return this.state.flat ? this.ortho : this.persp
  }
  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame)
    if (this.camTicker && !this.camTicker(now)) this.camTicker = null
    this.controls.update()
    for (const t of this.tickers) if (!t(now)) this.tickers.delete(t)
    if (this.tickers.size) this.dirty = true
    if (!this.dirty) return
    this.dirty = false
    if (this.state.flat) {
      this.ortho.position.copy(this.persp.position)
      this.ortho.quaternion.copy(this.persp.quaternion)
    }
    this.renderer.render(this.scene, this.camera)
  }

  /** ms süresince her karede fn(0…1, yumuşatılmış) çağrılır */
  animate(ms: number, fn: (k: number) => void, done?: () => void) {
    const dur = reducedMotion() ? Math.min(ms, 200) : ms
    const start = performance.now()
    const tick: Ticker = (now) => {
      const k = Math.min(1, (now - start) / Math.max(1, dur))
      fn(ease(k))
      if (k >= 1) {
        done?.()
        return false
      }
      return true
    }
    this.tickers.add(tick)
    this.dirty = true
    return () => void this.tickers.delete(tick)
  }

  /* ───── boyut ve kadraj ───── */

  private resize() {
    const r = this.host.getBoundingClientRect()
    this.w = Math.max(1, Math.round(r.width))
    this.h = Math.max(1, Math.round(r.height))
    this.renderer.setSize(this.w, this.h, false)
    this.persp.aspect = this.w / this.h
    this.persp.updateProjectionMatrix()
    this.updateOrtho()
    this.dirty = true
  }
  private updateOrtho() {
    const a = this.w / this.h
    const half = (this.radius * 1.08) / Math.min(1, a)
    this.ortho.left = -half * a
    this.ortho.right = half * a
    this.ortho.top = half
    this.ortho.bottom = -half
    this.ortho.zoom = 1
    this.ortho.updateProjectionMatrix()
  }
  fitDistance() {
    const v = THREE.MathUtils.degToRad(this.persp.fov) / 2
    const hz = Math.atan(Math.tan(v) * this.persp.aspect)
    return (this.radius / Math.sin(Math.min(v, hz))) * 1.04
  }
  /** Kadraj: hedef nokta ve içeriği saran kürenin yarıçapı */
  frameTo(center: THREE.Vector3, radius: number, dir: ViewDir = 'iso', animate = false) {
    this.radius = radius
    this.controls.target.copy(center)
    this.controls.minDistance = radius * 1.2
    this.controls.maxDistance = radius * 7
    this.updateOrtho()
    this.sun.target.position.copy(center)
    if (animate) this.look(dir, dir !== 'iso')
    else {
      const v = VIEW_INFO[dir]
      this.persp.position.copy(center).add(new THREE.Vector3().setFromSphericalCoords(this.fitDistance(), Math.max(1e-4, v.phi), v.theta))
      this.persp.lookAt(center)
      this.snapPos = dir === 'iso' ? null : this.persp.position.clone()
      this.setState({ view: dir, flat: dir !== 'iso' })
    }
    this.dirty = true
  }

  /** Kamerayı bir yöne götürür; flat ise varışta dik izdüşüme (düz bakış) geçer */
  look(dir: ViewDir, flat = dir !== 'iso', ms = 750) {
    const t = this.controls.target
    const s0 = new THREE.Spherical().setFromVector3(this.persp.position.clone().sub(t))
    const v = VIEW_INFO[dir]
    let th1 = v.theta
    const ph1 = Math.max(1e-4, v.phi)
    while (th1 - s0.theta > Math.PI) th1 -= 2 * Math.PI
    while (th1 - s0.theta < -Math.PI) th1 += 2 * Math.PI
    // üstten bakışa giderken yön, aşağı inmeden önce dönsün (ekranda “ön” alta gelsin)
    const r1 = this.fitDistance()
    const dur = reducedMotion() ? 200 : ms
    const start = performance.now()
    this.snapPos = null
    if (this.state.flat) this.setState({ view: this.state.view, flat: false })
    const sph = new THREE.Spherical()
    this.camTicker = (now) => {
      const k = Math.min(1, (now - start) / dur)
      const e = ease(k)
      sph.set(s0.radius + (r1 - s0.radius) * e, s0.phi + (ph1 - s0.phi) * e, s0.theta + (th1 - s0.theta) * e)
      this.persp.position.copy(t).add(new THREE.Vector3().setFromSpherical(sph))
      this.persp.lookAt(t)
      this.dirty = true
      if (k >= 1) {
        this.snapPos = this.persp.position.clone()
        this.setState({ view: dir, flat })
        return false
      }
      return true
    }
  }

  /** Ekran noktasından ışın atar */
  pick(cx: number, cy: number, objs: THREE.Object3D[], recursive = true) {
    const r = this.renderer.domElement.getBoundingClientRect()
    if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return []
    this.ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
    // son çizimden sonra eklenen nesnelerin konumu da güncel olsun
    this.scene.updateMatrixWorld()
    if (this.state.flat) {
      this.ortho.position.copy(this.persp.position)
      this.ortho.quaternion.copy(this.persp.quaternion)
    }
    this.camera.updateMatrixWorld()
    this.ray.setFromCamera(this.ndc, this.camera)
    return this.ray.intersectObjects(objs, recursive)
  }
  contains(cx: number, cy: number) {
    const r = this.renderer.domElement.getBoundingClientRect()
    return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    this.controls.dispose()
    const el = this.renderer.domElement
    el.removeEventListener('pointerdown', this.onDown)
    el.removeEventListener('pointerup', this.onUp)
    el.removeEventListener('pointercancel', this.onCancel)
    el.removeEventListener('pointermove', this.onMove)
    el.removeEventListener('pointerleave', this.onLeave)
    el.removeEventListener('contextmenu', this.prevent)
    disposeTree(this.scene)
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    el.remove()
  }
}

/* ───────────── yardımcılar ───────────── */

export function disposeTree(o: THREE.Object3D) {
  o.traverse((x) => {
    const m = x as THREE.Mesh
    if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose()
    const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : []
    for (const mat of mats) {
      if (mat.userData?.shared) continue
      const map = (mat as THREE.MeshBasicMaterial).map
      if (map) map.dispose()
      mat.dispose()
    }
  })
}

export function clearGroup(g: THREE.Group) {
  for (const ch of [...g.children]) {
    g.remove(ch)
    disposeTree(ch)
  }
}

/** Kameraya dönük yazı etiketi (ör. “ÖN”) */
export function makeLabel(text: string, { color = '#0f172a', bg = 'rgba(255,255,255,0.92)', size = 0.5, ring = '#cbd5e1' }: { color?: string; bg?: string; size?: number; ring?: string } = {}) {
  const pad = 22
  const font = '900 64px Nunito Variable, Nunito, system-ui, sans-serif'
  const cv = document.createElement('canvas')
  const ctx = cv.getContext('2d')!
  ctx.font = font
  const tw = Math.ceil(ctx.measureText(text).width)
  cv.width = tw + pad * 2
  cv.height = 96
  ctx.font = font
  ctx.fillStyle = bg
  ctx.strokeStyle = ring
  ctx.lineWidth = 6
  const r = 34
  ctx.beginPath()
  ctx.roundRect(3, 3, cv.width - 6, cv.height - 6, r)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, cv.width / 2, cv.height / 2 + 3)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
  const s = new THREE.Sprite(mat)
  s.scale.set((size * cv.width) / cv.height, size, 1)
  s.renderOrder = 10
  return s
}

/** Yere yatık yazı (ör. açınımın üstündeki alan yazısı) */
export function makeFlatText(text: string, { color = '#0f172a', size = 0.45, bg }: { color?: string; size?: number; bg?: string } = {}) {
  const font = '900 72px Nunito Variable, Nunito, system-ui, sans-serif'
  const cv = document.createElement('canvas')
  const ctx = cv.getContext('2d')!
  ctx.font = font
  const tw = Math.ceil(ctx.measureText(text).width)
  cv.width = tw + 40
  cv.height = 104
  ctx.font = font
  if (bg) {
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.roundRect(0, 0, cv.width, cv.height, 30)
    ctx.fill()
  }
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, cv.width / 2, cv.height / 2 + 4)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const m = new THREE.Mesh(new THREE.PlaneGeometry((size * cv.width) / cv.height, size), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }))
  m.renderOrder = 5
  return m
}

/** Yalnızca gölge alan, görünmez zemin */
export function makeShadowFloor(size = 80) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.ShadowMaterial({ opacity: 0.16 }))
  m.rotation.x = -Math.PI / 2
  m.position.y = -0.002
  m.receiveShadow = true
  return m
}

/** Gölge alan zemin + ızgara (w × d hücre, merkez orijinde) */
export function makeGround(w: number, d: number, { tile = '#f8fafc', line = '#cbd5e1', margin = 0 }: { tile?: string; line?: string; margin?: number } = {}) {
  const g = new THREE.Group()
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.16 }))
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = -0.002
  shadow.receiveShadow = true
  g.add(shadow)
  const W = w + margin * 2
  const D = d + margin * 2
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: tile, roughness: 1 }))
  plane.rotation.x = -Math.PI / 2
  plane.position.y = -0.004
  plane.receiveShadow = true
  plane.userData.ground = true
  g.add(plane)
  const pts: number[] = []
  for (let i = 0; i <= w; i++) pts.push(i - w / 2, 0.001, -d / 2, i - w / 2, 0.001, d / 2)
  for (let j = 0; j <= d; j++) pts.push(-w / 2, 0.001, j - d / 2, w / 2, 0.001, j - d / 2)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  g.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: line })))
  return { group: g, plane }
}

/** Düz bakışta, bakılan yönün etiketi resmin önüne düşmesin diye gizlenir */
export function syncSideLabels(g: THREE.Object3D, s: ViewState) {
  g.children.forEach((c) => (c.visible = !(s.flat && c.userData.side === s.view)))
}

/** Ön / sağ / arka / sol yön etiketleri (zeminin kenarlarında) */
export function makeSideLabels(w: number, d: number, gap = 0.9) {
  const g = new THREE.Group()
  const add = (t: string, side: ViewDir, x: number, z: number, color: string, ring: string) => {
    const s = makeLabel(t, { color, ring, size: 0.42 })
    s.position.set(x, 0.25, z)
    s.userData.side = side
    g.add(s)
  }
  add('ÖN', 'on', 0, d / 2 + gap, '#1d4ed8', '#93c5fd')
  add('SAĞ', 'sag', w / 2 + gap, 0, '#c2410c', '#fdba74')
  add('ARKA', 'arka', 0, -d / 2 - gap, '#64748b', '#e2e8f0')
  add('SOL', 'sol', -w / 2 - gap, 0, '#64748b', '#e2e8f0')
  return g
}
