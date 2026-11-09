import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as RPE, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Hand, Hammer, Trash2 } from 'lucide-react'
import { sfx } from '../../lib/feedback'
import { n, type ToolInfo } from '../sayilari-karsilastir/parts'

/**
 * Polypad gibi serbest blok tuvali: kaynak kutularından (sonsuz) yüzlük, onluk, birlik bloğu tuvale sürüklenir;
 * tuvaldeki bloklar serbestçe taşınır ve ızgaraya hafifçe yapışır. Birbirine değen 10 birlik küp parlayıp kayarak
 * tek bir onluk çubuğa, birbirine değen 10 onluk çubuk tek bir yüzlük karesine dönüşür. Çift dokunuş ya da
 * “Boz” kutusu ters yönde çalışır. Sürükleme parts.tsx’teki hedef bazlı Drag değil: bırakılan yer serbest bir
 * konumdur, bu yüzden Pointer Events ile ayrıca yazıldı (setPointerCapture, touch-action: none, kenarda kaydırma).
 */

/* ───────────── model ───────────── */

export type E = 0 | 1 | 2
/** Tuvaldeki bir blok: x, y ızgara karesi cinsinden sol üst köşe */
export interface Blk { id: number; e: E; x: number; y: number }
export const COLS = 40
export const ROWS = 32
/** Bölgeli tuvalde 1. sayı solda (x < HALF), 2. sayı sağda */
export const HALF = 20
/** DIM[e]: [genişlik, yükseklik] (onluk dik durur) */
export const DIM: [number, number][] = [[1, 1], [1, 10], [10, 10]]

export const UNIT = [
  { name: 'Birlik', unit: 'birlik', color: '#ca8a04', fill: '#facc15', edge: '#a16207' },
  { name: 'Onluk', unit: 'onluk', color: '#16a34a', fill: '#22c55e', edge: '#166534' },
  { name: 'Yüzlük', unit: 'yüzlük', color: '#ea580c', fill: '#fb923c', edge: '#c2410c' },
]

let seq = 1
export const nid = () => seq++

export const countsOf = (b: Blk[]) => [0, 1, 2].map((e) => b.filter((x) => x.e === e).length)
export const valueOf = (b: Blk[]) => b.reduce((s, x) => s + 10 ** x.e, 0)
export const digitsOf = (v: number) => [v % 10, Math.floor(v / 10) % 10, Math.floor(v / 100)]
/** Bloğun bölgesi: merkezi tuvalin sol yarısındaysa 'A' */
export const regionOf = (b: Blk): 'A' | 'B' => (b.x + DIM[b.e][0] / 2 < HALF ? 'A' : 'B')

type Rect = [number, number, number, number]
const rect = (b: { e: E; x: number; y: number }): Rect => [b.x, b.y, b.x + DIM[b.e][0], b.y + DIM[b.e][1]]
const inter = (A: Rect, B: Rect) => [Math.min(A[2], B[2]) - Math.max(A[0], B[0]), Math.min(A[3], B[3]) - Math.max(A[1], B[1])]
/** Kenar kenara değiyor ya da üst üste biniyor (yalnızca köşe değmesi sayılmaz) */
function touch(a: Blk, b: Blk) {
  const [ix, iy] = inter(rect(a), rect(b))
  return (ix >= 0 && iy > 0) || (ix > 0 && iy >= 0)
}
const overlaps = (A: Rect, B: Rect) => {
  const [ix, iy] = inter(A, B)
  return ix > 0 && iy > 0
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Bırakılan bloktan başlayarak birbirine değen aynı türden bloklar; 10 tanesi bir araya geldiyse onları döndürür */
export function findMerge(list: Blk[], id: number): Blk[] | null {
  const start = list.find((b) => b.id === id)
  if (!start || start.e === 2) return null
  const same = list.filter((b) => b.e === start.e)
  const seen = new Set([start.id])
  const order = [start]
  for (let i = 0; i < order.length && order.length < 10; i++) {
    for (const b of same) {
      if (!seen.has(b.id) && touch(order[i], b)) {
        seen.add(b.id)
        order.push(b)
        if (order.length === 10) break
      }
    }
  }
  return order.length >= 10 ? order.slice(0, 10) : null
}

/** (px, py)’ye en yakın, hiçbir blokla çakışmayan yer */
function freeSpot(w: number, h: number, px: number, py: number, others: Blk[]) {
  const rs = others.map(rect)
  const ok = (x: number, y: number) => x >= 0 && y >= 0 && x + w <= COLS && y + h <= ROWS && !rs.some((r) => overlaps([x, y, x + w, y + h], r))
  const x0 = clamp(px, 0, COLS - w)
  const y0 = clamp(py, 0, ROWS - h)
  let best: [number, number] | null = null
  let bd = Infinity
  for (let y = 0; y <= ROWS - h; y++)
    for (let x = 0; x <= COLS - w; x++) {
      const d = (x - x0) ** 2 + (y - y0) ** 2
      if (d < bd && ok(x, y)) {
        bd = d
        best = [x, y]
      }
    }
  return best ?? [x0, y0]
}

/** 10 parçanın kayacağı yerler ve oluşacak yeni blok */
function mergePlan(list: Blk[], parts: Blk[]) {
  const e = parts[0].e
  const ids = new Set(parts.map((p) => p.id))
  const others = list.filter((b) => !ids.has(b.id))
  const minX = Math.min(...parts.map((p) => p.x))
  const minY = Math.min(...parts.map((p) => p.y))
  const avgY = Math.round(parts.reduce((s, p) => s + p.y, 0) / parts.length)
  const slots: Record<number, { x: number; y: number }> = {}
  if (e === 0) {
    // Tuvalde onluk varsa yeni onluk, birliklere en yakın onluk sırasının hemen sağına kayar: onluklara katılır
    const rods = others.filter((b) => b.e === 1)
    let pref: [number, number] = [minX, minY]
    if (rods.length) {
      const cx = parts.reduce((s, p) => s + p.x, 0) / parts.length
      const cy = parts.reduce((s, p) => s + p.y, 0) / parts.length
      const near = rods.reduce((m, r) => ((r.x - cx) ** 2 + (r.y + 5 - cy) ** 2 < (m.x - cx) ** 2 + (m.y + 5 - cy) ** 2 ? r : m))
      let x = near.x
      while (rods.some((r) => r.x === x + 1 && r.y === near.y)) x++
      pref = [x + 1, near.y]
    }
    const [tx, ty] = freeSpot(1, 10, pref[0], pref[1], others)
    ;[...parts].sort((a, b) => a.y - b.y || a.x - b.x).forEach((p, i) => (slots[p.id] = { x: tx, y: ty + i }))
    return { slots, made: { id: nid(), e: 1 as E, x: tx, y: ty }, others }
  }
  const [tx, ty] = freeSpot(10, 10, minX, avgY, others)
  ;[...parts].sort((a, b) => a.x - b.x || a.y - b.y).forEach((p, i) => (slots[p.id] = { x: tx + i, y: ty }))
  return { slots, made: { id: nid(), e: 2 as E, x: tx, y: ty }, others }
}

/**
 * Ters yön: 1 onluk → 10 birlik, 1 yüzlük → 10 onluk. Parçalar önce bloğun yerinde belirir (compact),
 * sonra aralarında birer kare boşlukla açılır (spread): yan yana durmadıkları için hemen yeniden birleşmezler.
 */
export function breakApart(b: Blk): { compact: Blk[]; spread: Blk[] } {
  if (b.e === 1) {
    const compact = Array.from({ length: 10 }, (_, i) => ({ id: nid(), e: 0 as E, x: b.x, y: b.y + i }))
    const x0 = clamp(b.x, 0, COLS - 3)
    const y0 = clamp(b.y, 0, ROWS - 9)
    return { compact, spread: compact.map((p, i) => ({ ...p, x: x0 + 2 * (i % 2), y: y0 + 2 * Math.floor(i / 2) })) }
  }
  if (b.e === 2) {
    const compact = Array.from({ length: 10 }, (_, i) => ({ id: nid(), e: 1 as E, x: b.x + i, y: b.y }))
    const x0 = clamp(b.x - 4, 0, COLS - 19)
    return { compact, spread: compact.map((p, i) => ({ ...p, x: x0 + 2 * i })) }
  }
  return { compact: [b], spread: [b] }
}

/** Bir sayıyı x0’dan başlayarak düzenli kurar: yüzlükler üstte, onluklar ortada, birlikler altta */
export function build(v: number, x0 = 0): Blk[] {
  const [u, t, h] = digitsOf(v)
  return [
    ...Array.from({ length: h }, (_, i) => ({ id: nid(), e: 2 as E, x: x0 + 10 * i, y: 0 })),
    ...Array.from({ length: t }, (_, i) => ({ id: nid(), e: 1 as E, x: x0 + i, y: 11 })),
    ...Array.from({ length: u }, (_, i) => ({ id: nid(), e: 0 as E, x: x0 + i, y: 22 })),
  ]
}

/**
 * İki bölgedeki blokları tek tuvalde, türlerine göre sıralı dizer (aynı bloklar kayarak yer değiştirir).
 * Her türde önce 1. sayının, 3 kare boşluk bırakıp 2. sayının blokları gelir: çocuk onları kendisi bir araya getirir.
 */
export function joinLayout(list: Blk[]): Blk[] {
  const out: Blk[] = []
  for (const e of [2, 1, 0] as E[]) {
    const A = list.filter((b) => b.e === e && regionOf(b) === 'A').sort((a, b) => a.x - b.x || a.y - b.y)
    const B = list.filter((b) => b.e === e && regionOf(b) === 'B').sort((a, b) => a.x - b.x || a.y - b.y)
    const w = DIM[e][0]
    const gap = e === 2 ? (A.length + B.length > 3 ? 0 : 1) : 3
    const y = e === 2 ? 0 : e === 1 ? 11 : 22
    A.forEach((b, i) => out.push({ ...b, x: i * w, y }))
    B.forEach((b, i) => out.push({ ...b, x: A.length * w + (A.length ? gap : 0) + i * w, y }))
  }
  return out
}

/* ───────────── görünüm ───────────── */

function look(e: E, cell: number): CSSProperties {
  const [w, h] = DIM[e]
  const c = UNIT[e]
  const line = 'rgb(255 255 255 / 0.6)'
  return {
    width: w * cell,
    height: h * cell,
    backgroundColor: c.fill,
    backgroundImage: e === 0 ? undefined : `linear-gradient(to bottom, ${line} 1px, transparent 1px)${e === 2 ? `, linear-gradient(to right, ${line} 1px, transparent 1px)` : ''}`,
    backgroundSize: `${cell}px ${cell}px`,
    boxShadow: `inset 0 0 0 1.5px ${c.edge}`,
    borderRadius: Math.max(2, cell / 6),
  }
}

export function BlockView({ e, cell, className = '', style }: { e: E; cell: number; className?: string; style?: CSSProperties }) {
  return <span aria-hidden className={`block ${className}`} style={{ ...look(e, cell), ...style }} />
}

/** “2 yüzlük + 5 onluk + 13 birlik = 263” (10 ya da daha fazla olan tür kırmızı yanıp söner: birleştirilebilir) */
export function Counter({ blocks, hide, label, small }: { blocks: Blk[]; hide?: boolean; label?: ReactNode; small?: boolean }) {
  const c = countsOf(blocks)
  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-2xl bg-white px-3 py-1.5 text-center font-black tabular-nums ring-1 ring-line ${small ? 'text-sm' : 'text-lg sm:text-xl'}`} aria-live="polite">
      {label && <span className="mr-1 text-ink-soft">{label}</span>}
      {[2, 1, 0].map((e, i) => (
        <span key={e} className="flex items-center gap-2">
          {i > 0 && <span className="text-ink-soft">+</span>}
          <span className={c[e] >= 10 ? 'animate-pulse rounded-lg bg-red-50 px-1 text-red-600 ring-2 ring-red-300' : ''} style={c[e] >= 10 ? undefined : { color: UNIT[e].color }}>
            {c[e]} {UNIT[e].unit}
          </span>
        </span>
      ))}
      <span className="text-ink-soft">=</span>
      <span className={`${small ? 'text-lg' : 'text-2xl sm:text-3xl'} text-emerald-700`}>{hide ? <span className="inline-grid h-9 min-w-12 place-items-center rounded-xl border-2 border-dashed border-sky-400 bg-sky-50 px-1 text-xl text-sky-500">?</span> : n(valueOf(blocks))}</span>
    </div>
  )
}

/* ───────────── tuval ───────────── */

export type Ev = { t: 'add' | 'move' | 'merge' | 'break' | 'trash'; e: E }
type Grab = { kind: 'src'; e: E } | { kind: 'blk'; id: number; e: E }
/** boş yere dokunuş (elde tutulan blok oraya konur) */
type Press = Grab | { kind: 'none' }
type Ghost = { e: E; x: number; y: number; dx: number; dy: number; back?: { x: number; y: number } }

const EDGE = 72
const edgeSpeed = (y: number) => (y < EDGE ? -Math.ceil((EDGE - y) / 5) : y > window.innerHeight - EDGE ? Math.ceil((y - (window.innerHeight - EDGE)) / 5) : 0)
const zoneAt = (x: number, y: number) => {
  for (const el of document.elementsFromPoint(x, y)) {
    const z = (el as HTMLElement).dataset?.zone
    if (z) return z
  }
  return null
}

/**
 * blocks dışarıdan verilir (görev durumu), her değişiklik onChange(yeni, olay) ile bildirilir.
 * sources: kaynak kutuları; tools: Boz ve Çöp kutuları; split: tuval iki bölgeye ayrılır.
 */
export function Tuval({ blocks, onChange, sources = true, tools = true, breakable = true, locked, split, onInfo, overlay }: {
  blocks: Blk[]
  onChange: (next: Blk[], ev: Ev) => void
  sources?: boolean
  tools?: boolean
  breakable?: boolean
  locked?: boolean
  split?: boolean
  onInfo?: (msg: string) => void
  overlay?: ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  const srcRef = useRef<(HTMLButtonElement | null)[]>([])
  const [cell, setCell] = useState(16)
  const cur = useRef(blocks)
  cur.current = blocks
  /** zamanlayıcılardaki çağrılar da görevin güncel onChange’ini kullansın */
  const emit = useRef(onChange)
  emit.current = onChange
  const onChangeNow = (next: Blk[], ev: Ev) => {
    cur.current = next
    emit.current(next, ev)
  }
  const timers = useRef<number[]>([])
  const later = (f: () => void, ms: number) => timers.current.push(window.setTimeout(f, ms))
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setCell(el.clientWidth / COLS))
    ro.observe(el)
    setCell(el.clientWidth / COLS)
    return () => ro.disconnect()
  }, [])

  /* birleşme animasyonu: önce parlar, sonra kayar, sonra tek blok olur */
  const [anim, setAnim] = useState<{ slots: Record<number, { x: number; y: number }>; slide: boolean } | null>(null)
  const [born, setBorn] = useState<Set<number>>(new Set())
  const [settled, setSettled] = useState<number | null>(null)
  const busy = !!anim

  const runMerge = (list: Blk[], id: number) => {
    const parts = findMerge(list, id)
    if (!parts) return
    const plan = mergePlan(list, parts)
    setAnim({ slots: plan.slots, slide: false })
    later(() => setAnim({ slots: plan.slots, slide: true }), 320)
    later(() => {
      const next = [...plan.others, plan.made]
      setAnim(null)
      setBorn(new Set([plan.made.id]))
      sfx.ok()
      onChangeNow(next, { t: 'merge', e: parts[0].e })
      runMerge(next, plan.made.id)
    }, 820)
  }

  const commitMove = (list: Blk[], id: number, ev: Ev) => {
    setSettled(id)
    later(() => setSettled(null), 60)
    onChangeNow(list, ev)
    runMerge(list, id)
  }

  const doBreak = (id: number) => {
    const b = cur.current.find((x) => x.id === id)
    if (!b) return
    if (!breakable) return onInfo?.('Bu görevde blokları bozmuyoruz: birleştirmeye odaklan.')
    if (b.e === 0) return onInfo?.('Birlik küpü en küçük blok: daha fazla bozulamaz.')
    const { compact, spread } = breakApart(b)
    const rest = cur.current.filter((x) => x.id !== id)
    setBorn(new Set(compact.map((p) => p.id)))
    sfx.ok()
    onChangeNow([...rest, ...compact], { t: 'break', e: b.e })
    const to = new Map(spread.map((p) => [p.id, p]))
    later(() => onChangeNow(cur.current.map((x) => to.get(x.id) ?? x), { t: 'move', e: (b.e - 1) as E }), 380)
  }
  const doTrash = (id: number) => {
    const b = cur.current.find((x) => x.id === id)
    if (!b) return
    onChangeNow(cur.current.filter((x) => x.id !== id), { t: 'trash', e: b.e })
  }

  /** ekran noktasından (blok sol üstü) ızgara konumu: en yakın kareye yapışır, tuvalin içinde kalır */
  const snap = (e: E, left: number, top: number) => {
    const r = box.current!.getBoundingClientRect()
    const [w, h] = DIM[e]
    return { x: clamp(Math.round((left - r.left) / cell), 0, COLS - w), y: clamp(Math.round((top - r.top) / cell), 0, ROWS - h) }
  }
  const inBox = (x: number, y: number) => {
    const r = box.current?.getBoundingClientRect()
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }

  /* ── sürükleme ── */
  const drag = useRef<{ g: Press; sx: number; sy: number; pid: number; moved: boolean; dx: number; dy: number } | null>(null)
  const last = useRef({ x: 0, y: 0 })
  const raf = useRef(0)
  const [ghost, setGhost] = useState<Ghost | null>(null)
  const [preview, setPreview] = useState<{ e: E; x: number; y: number } | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [held, setHeld] = useState<Grab | null>(null)
  const lastTap = useRef({ id: -1, t: 0 })
  const dg = drag.current?.g
  const draggingId = ghost && !ghost.back && dg?.kind === 'blk' ? dg.id : null

  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  useEffect(() => {
    if (locked) setHeld(null)
  }, [locked])

  const track = (x: number, y: number) => {
    const d = drag.current
    if (!d || d.g.kind === 'none') return
    const z = zoneAt(x, y)
    setOver(z)
    if (!z && inBox(x, y)) setPreview({ e: d.g.e, ...snap(d.g.e, x - d.dx, y - d.dy) })
    else setPreview(null)
  }
  const loop = () => {
    const v = edgeSpeed(last.current.y)
    if (v) {
      window.scrollBy(0, v)
      track(last.current.x, last.current.y)
    }
    raf.current = requestAnimationFrame(loop)
  }

  const begin = (ev: RPE, g: Press, dx: number, dy: number) => {
    if (locked || busy || ev.button > 0) return
    drag.current = { g, sx: ev.clientX, sy: ev.clientY, pid: ev.pointerId, moved: false, dx, dy }
    ev.currentTarget.setPointerCapture(ev.pointerId)
  }
  const move = (ev: RPE) => {
    const d = drag.current
    if (!d || d.pid !== ev.pointerId || d.g.kind === 'none') return
    last.current = { x: ev.clientX, y: ev.clientY }
    if (!d.moved) {
      if (Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) < 6) return
      d.moved = true
      setHeld(null)
      raf.current = requestAnimationFrame(loop)
    }
    setGhost({ e: d.g.e, x: ev.clientX, y: ev.clientY, dx: d.dx, dy: d.dy })
    track(ev.clientX, ev.clientY)
  }
  const flyBack = (to: { x: number; y: number }) => {
    setGhost((g) => g && { ...g, back: to })
    later(() => setGhost(null), 260)
  }

  const end = (ev: RPE) => {
    const d = drag.current
    if (!d || d.pid !== ev.pointerId) return
    drag.current = null
    cancelAnimationFrame(raf.current)
    setPreview(null)
    setOver(null)
    if (!d.moved) return tapped(d.g, ev.clientX, ev.clientY)
    const z = zoneAt(ev.clientX, ev.clientY)
    const g = d.g
    if (g.kind === 'none') return
    if (g.kind === 'blk' && z === 'trash' && tools) {
      setGhost(null)
      return doTrash(g.id)
    }
    if (g.kind === 'blk' && z === 'boz' && tools) {
      setGhost(null)
      return doBreak(g.id)
    }
    if (!z && inBox(ev.clientX, ev.clientY)) {
      setGhost(null)
      const p = snap(g.e, ev.clientX - d.dx, ev.clientY - d.dy)
      if (g.kind === 'src') {
        const b: Blk = { id: nid(), e: g.e, ...p }
        setBorn(new Set([b.id]))
        return commitMove([...cur.current, b], b.id, { t: 'add', e: g.e })
      }
      return commitMove(cur.current.map((b) => (b.id === g.id ? { ...b, ...p } : b)), g.id, { t: 'move', e: g.e })
    }
    // tuvalin dışına bırakıldı: blok yerine, yeni blok kutusuna geri uçar
    if (g.kind === 'blk') {
      const b = cur.current.find((x) => x.id === g.id)
      const r = box.current?.getBoundingClientRect()
      if (b && r) return flyBack({ x: r.left + b.x * cell + d.dx, y: r.top + b.y * cell + d.dy })
    } else {
      const r = srcRef.current[g.e]?.getBoundingClientRect()
      if (r) return flyBack({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
    }
    setGhost(null)
  }
  const cancel = () => {
    drag.current = null
    cancelAnimationFrame(raf.current)
    setGhost(null)
    setPreview(null)
    setOver(null)
  }

  /** Dokun-sonra-dokun yolu ve çift dokunuşla bozma */
  const tapped = (g: Press, x: number, y: number) => {
    if (g.kind === 'src') return setHeld((h) => (h?.kind === 'src' && h.e === g.e ? null : g))
    // tuvalde: elde yeni blok varsa ya da boş yere dokunulduysa elde tutulan blok buraya konur
    if (held && (g.kind === 'none' || held.kind === 'src')) return placeHeld(x, y)
    if (g.kind === 'blk') {
      const now = Date.now()
      if (lastTap.current.id === g.id && now - lastTap.current.t < 400) {
        lastTap.current = { id: -1, t: 0 }
        setHeld(null)
        return doBreak(g.id)
      }
      lastTap.current = { id: g.id, t: now }
      return setHeld((h) => (h?.kind === 'blk' && h.id === g.id ? null : g))
    }
  }
  /** elde tutulan bloğu tuvalde dokunulan noktaya koy */
  const placeHeld = (x: number, y: number) => {
    const h = held
    if (!h) return false
    const [w, hh] = DIM[h.e]
    const p = snap(h.e, x - (w * cell) / 2, y - (hh * cell) / 2)
    setHeld(null)
    if (h.kind === 'src') {
      const b: Blk = { id: nid(), e: h.e, ...p }
      setBorn(new Set([b.id]))
      commitMove([...cur.current, b], b.id, { t: 'add', e: h.e })
    } else commitMove(cur.current.map((b) => (b.id === h.id ? { ...b, ...p } : b)), h.id, { t: 'move', e: h.e })
    return true
  }

  /** Parmağın altındaki blok: önce tam isabet (küçük bloklar üstte), yoksa birkaç piksellik pay içindeki en yakın blok */
  const hitAt = (x: number, y: number) => {
    const r = box.current!.getBoundingClientRect()
    const px = (x - r.left) / cell
    const py = (y - r.top) / cell
    const slop = Math.max(0.6, 14 / cell)
    let best: Blk | null = null
    let bd = Infinity
    for (const b of [...cur.current].sort((a, b) => a.e - b.e)) {
      const [x1, y1, x2, y2] = rect(b)
      const dx = Math.max(x1 - px, 0, px - x2)
      const dy = Math.max(y1 - py, 0, py - y2)
      const d = Math.hypot(dx, dy)
      if (d === 0) return b
      if (d <= slop && d < bd) {
        bd = d
        best = b
      }
    }
    return best
  }

  const onBoxDown = (ev: RPE<HTMLDivElement>) => {
    if (locked || busy || ev.button > 0) return
    const b = hitAt(ev.clientX, ev.clientY)
    if (!b) return begin(ev, { kind: 'none' }, 0, 0)
    const r = box.current!.getBoundingClientRect()
    begin(ev, { kind: 'blk', id: b.id, e: b.e }, ev.clientX - (r.left + b.x * cell), ev.clientY - (r.top + b.y * cell))
  }
  const zoneTap = (z: 'trash' | 'boz') => {
    if (!held || held.kind !== 'blk') return
    setHeld(null)
    if (z === 'trash') doTrash(held.id)
    else doBreak(held.id)
  }

  const ordered = [...blocks].sort((a, b) => b.e - a.e)
  const heldBlk = held?.kind === 'blk' ? held.id : null
  const srcSize = [16, 5, 4]

  return (
    <div className="space-y-2">
      {(sources || tools) && (
        <div className="flex items-stretch gap-1.5 sm:gap-2">
          {sources && (
            <div className="flex flex-1 gap-1.5 sm:flex-none sm:gap-2">
              {([2, 1, 0] as E[]).map((e) => (
                <button
                  key={e}
                  ref={(el) => {
                    srcRef.current[e] = el
                  }}
                  type="button"
                  disabled={locked}
                  aria-label={`${UNIT[e].name} kutusu: 1 ${UNIT[e].unit} al`}
                  aria-pressed={held?.kind === 'src' && held.e === e}
                  onContextMenu={(x) => x.preventDefault()}
                  onPointerDown={(ev) => {
                    const [w, h] = DIM[e]
                    begin(ev, { kind: 'src', e }, (w * cell) / 2, (h * cell) / 2)
                  }}
                  onPointerMove={move}
                  onPointerUp={end}
                  onPointerCancel={cancel}
                  className={`flex min-h-16 flex-1 touch-none flex-col items-center justify-center gap-1 rounded-2xl bg-white px-1 py-1.5 shadow-[0_3px_0_#cbd5e1] ring-2 select-none sm:flex-none sm:flex-row sm:gap-2 sm:px-2.5 disabled:opacity-40 [&_*]:touch-none ${held?.kind === 'src' && held.e === e ? 'ring-4 ring-sky-500' : 'ring-line hover:-translate-y-0.5'} cursor-grab`}
                >
                  <BlockView e={e} cell={srcSize[e]} />
                  <span className="text-center leading-tight sm:text-left">
                    <span className="block text-xs font-black sm:text-sm" style={{ color: UNIT[e].color }}>{UNIT[e].name}</span>
                    <span className="hidden text-[11px] font-bold text-ink-soft sm:block">tut, sürükle</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {tools && (
            <div className="ml-auto flex gap-1.5 sm:gap-2">
              {breakable && (
                <div data-zone="boz" onClick={() => zoneTap('boz')} className={`flex min-h-16 min-w-14 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-1.5 text-xs font-black transition sm:min-w-16 ${over === 'boz' ? 'scale-105 border-sky-500 bg-sky-100 text-sky-700' : ghost || held?.kind === 'blk' ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-300 bg-white text-ink-soft'}`}>
                  <Hammer size={22} />
                  Boz
                </div>
              )}
              <div data-zone="trash" onClick={() => zoneTap('trash')} className={`flex min-h-16 min-w-14 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-1.5 text-xs font-black transition sm:min-w-16 ${over === 'trash' ? 'scale-105 border-red-500 bg-red-100 text-red-700' : ghost || held?.kind === 'blk' ? 'border-red-300 bg-red-50 text-red-600' : 'border-slate-300 bg-white text-ink-soft'}`}>
                <Trash2 size={22} />
                Çöp
              </div>
            </div>
          )}
        </div>
      )}

      <div
        ref={box}
        role="application"
        aria-label={`Blok tuvali: ${n(valueOf(blocks))}`}
        onPointerDown={onBoxDown}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={cancel}
        onContextMenu={(x) => x.preventDefault()}
        className={`relative w-full touch-none overflow-hidden rounded-2xl bg-white ring-2 select-none [-webkit-touch-callout:none] ${held ? 'ring-sky-400' : 'ring-line'}`}
        style={{
          aspectRatio: `${COLS} / ${ROWS}`,
          backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
          backgroundSize: `${cell}px ${cell}px`,
        }}
      >
        {split && (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 bg-sky-500/5" style={{ width: HALF * cell }} />
            <div className="pointer-events-none absolute inset-y-0 right-0 bg-pink-500/5" style={{ width: (COLS - HALF) * cell }} />
            <div className="pointer-events-none absolute inset-y-0 border-l-[3px] border-dashed border-slate-400" style={{ left: HALF * cell - 1.5 }} />
          </>
        )}
        {preview && (
          <div className="pointer-events-none absolute rounded-[3px] border-2 border-dashed border-sky-500 bg-sky-200/40" style={{ left: preview.x * cell, top: preview.y * cell, width: DIM[preview.e][0] * cell, height: DIM[preview.e][1] * cell }} />
        )}
        {ordered.map((b) => {
          const s = anim?.slide ? anim.slots[b.id] : undefined
          const glow = !!anim?.slots[b.id]
          const p = s ?? b
          return (
            <span
              key={b.id}
              className={`pointer-events-none absolute ${born.has(b.id) ? 'animate-pop' : ''}`}
              style={{
                left: p.x * cell,
                top: p.y * cell,
                transition: settled === b.id ? 'none' : 'left 420ms cubic-bezier(.3,.7,.3,1), top 420ms cubic-bezier(.3,.7,.3,1), opacity 150ms',
                opacity: draggingId === b.id ? 0.25 : 1,
                zIndex: glow ? 5 : undefined,
                filter: glow ? 'drop-shadow(0 0 5px #fde047) drop-shadow(0 0 2px #f59e0b) brightness(1.12)' : undefined,
              }}
            >
              <BlockView e={b.e} cell={cell} style={heldBlk === b.id ? { outline: '3px solid #0ea5e9', outlineOffset: 2 } : undefined} />
            </span>
          )
        })}
        {overlay}
      </div>

      {ghost &&
        createPortal(
          <div
            aria-hidden
            className="pointer-events-none fixed z-[1000]"
            style={{
              left: (ghost.back ?? ghost).x - ghost.dx,
              top: (ghost.back ?? ghost).y - ghost.dy,
              transform: ghost.back ? 'scale(0.6)' : 'scale(1.06) rotate(-2deg)',
              opacity: ghost.back ? 0.2 : 1,
              filter: 'drop-shadow(0 12px 14px rgb(15 23 42 / 0.35))',
              transition: ghost.back ? 'left 240ms ease-out, top 240ms ease-out, transform 240ms, opacity 240ms' : 'transform 120ms',
            }}
          >
            <BlockView e={ghost.e} cell={cell} />
          </div>,
          document.body,
        )}
      {held &&
        createPortal(
          <div className="fixed inset-x-3 bottom-3 z-[999] mx-auto flex max-w-md items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-extrabold text-white shadow-xl animate-fade-up" role="status">
            <Hand size={18} className="shrink-0" />
            <span>
              <b>1 {UNIT[held.e].unit}</b> elinde. Tuvalde koymak istediğin yere dokun.
              {held.kind === 'blk' && tools ? ' Silmek için Çöp’e, bozmak için Boz’a dokun.' : ''}
            </span>
          </div>,
          document.body,
        )}
    </div>
  )
}

/* ───────────── “Nasıl kullanılır?” araçları ───────────── */

const mini = (e: E) => <BlockView e={e} cell={e === 0 ? 14 : e === 1 ? 2.4 : 2} />
export const TOOL: Record<'src' | 'move' | 'join10' | 'join100' | 'boz' | 'trash' | 'split' | 'hand', ToolInfo> = {
  src: { icon: mini(0), name: 'Blok kutuları', text: 'Yüzlük, onluk ya da birlik kutusundan bir bloğu tutup tuvale sürükle. Kutular hiç bitmez.' },
  move: { icon: <span className="grid size-5 place-items-center rounded-md bg-sky-100 text-[11px] font-black text-sky-700 ring-1 ring-sky-300">✥</span>, name: 'Taşıma', text: 'Tuvaldeki bir bloğu tutup istediğin yere taşı. Bırakınca en yakın kareye yapışır.' },
  join10: { icon: mini(1), name: '10 birlik → 1 onluk', text: '10 birlik küpü birbirine değecek biçimde yan yana koy: parlayıp tek bir onluk çubuğa dönüşürler.' },
  join100: { icon: mini(2), name: '10 onluk → 1 yüzlük', text: '10 onluk çubuğu yan yana dizince tek bir yüzlük karesine dönüşür.' },
  boz: { icon: <Hammer size={18} className="text-sky-700" />, name: 'Boz', text: 'Bir onluğa ya da yüzlüğe iki kez hızlıca dokun ya da Boz kutusuna sürükle: 10 küçük parçaya ayrılır.' },
  trash: { icon: <Trash2 size={18} className="text-red-600" />, name: 'Çöp', text: 'Fazla koyduğun bloğu Çöp kutusuna sürükle, silinir.' },
  split: { icon: <span className="h-4 w-6 rounded-[3px] border-r-2 border-dashed border-slate-500 bg-sky-100" />, name: 'İki bölge', text: 'Tuvalin solu 1. sayının, sağı 2. sayının yeri. Üstteki yazılar her bölgede kaç olduğunu gösterir.' },
  hand: { icon: <span className="text-base leading-none">✋</span>, name: '2. sayının etiketi', text: '“2. sayı” etiketini tutup “1. sayı” etiketinin üstüne bırak: iki sayının blokları tek tuvalde buluşur.' },
}
