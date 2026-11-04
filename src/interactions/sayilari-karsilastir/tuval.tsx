import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { Combine, Copy, Hand, MousePointerClick, Play, Search, Trash2, Undo2, Ungroup } from 'lucide-react'

/**
 * Polypad tarzı küçük tuval:
 *  - Solda sonsuz parça kutusu: parçayı tut, tuvale sürükle → yeni parça oluşur (dokun-dokun da olur).
 *  - Tuvaldeki parça serbestçe taşınır; boş yerden sürükleyince çerçeveyle çoklu seçim, seçili grup birlikte taşınır.
 *  - Parça kutusuna ya da çöpe sürüklenen parça silinir.
 *  - Alttaki seçim çubuğu: kopyala, sil; regroup açıksa 10 aynı bloğu birleştir / bir bloğu 10’a böl.
 *  - regroup: 10 aynı blok bir soldaki “col-e” bölgesine sürüklenince birleşir, tek blok bir sağdakine sürüklenince 10’a bölünür.
 *  - Bölgeler (Zone) yalnızca mantıksal dikdörtgenlerdir; görünümü görev board ile çizer. snap: tek parça bölgenin ortasına oturur.
 * Koordinatlar mantıksal piksel (W × H); tuval kapsayıcının genişliğine ölçeklenir.
 */

export interface Piece { id: number; kind: string; x: number; y: number }
export interface Zone { id: string; x: number; y: number; w: number; h: number; snap?: boolean | { x: number; y: number }; replace?: boolean }
export interface DropInfo { ids: number[]; kind: string; zone: Zone | null; fromPalette: boolean; before: Piece[] }

let NEXT = 1
export const mk = (kind: string, x: number, y: number): Piece => ({ id: NEXT++, kind, x, y })
export const inRect = (r: { x: number; y: number; w: number; h: number }, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
export const zoneAt = (zones: Zone[], x: number, y: number) => [...zones].reverse().find((z) => inRect(z, x, y)) ?? null
export const zoneOf = (zones: Zone[], p: Piece) => zoneAt(zones, p.x, p.y)

/* ───────────── parçalar ───────────── */

const GRID = 'bg-[linear-gradient(#0000_86%,#fff9_86%),linear-gradient(90deg,#0000_86%,#fff9_86%)] bg-[length:10%_10%]'
export const BLOCK_NAME = ['birlik', 'onluk', 'yüzlük', 'binlik', 'on binlik']
const SYM: Record<string, string> = { eq: '=', ne: '≠', lt: '<', gt: '>', crown: '👑' }

export function sizeOf(kind: string): [number, number] {
  if (kind === 'b0') return [10, 10]
  if (kind === 'b1') return [10, 100]
  if (kind[0] === 'b') return [100, 100]
  if (kind[0] === 'd') return [56, 64]
  return [56, 56]
}
export function labelOf(kind: string) {
  if (kind[0] === 'b') return `1 ${BLOCK_NAME[Number(kind[1])]}`
  if (kind[0] === 'd') return `${kind[1]} kartı`
  return { lens: 'Büyüteç', eq: 'Eşit (=)', ne: 'Eşit değil (≠)', lt: 'Küçüktür (<)', gt: 'Büyüktür (>)', crown: 'Taç: daha büyük' }[kind] ?? kind
}

export function PieceView({ kind, sel }: { kind: string; sel?: boolean }) {
  const ring = sel ? 'outline-[3px] outline-offset-2 outline-sky-500' : ''
  const [w, h] = sizeOf(kind)
  if (kind === 'b0') return <div className={`rounded-[2px] bg-yellow-400 ring-1 ring-yellow-700 ${ring}`} style={{ width: w, height: h }} />
  if (kind === 'b1') return <div className={`rounded-[2px] bg-green-500 bg-[linear-gradient(#0000_88%,#fff9_88%)] bg-[length:100%_10%] ring-1 ring-green-800 ${ring}`} style={{ width: w, height: h }} />
  if (kind === 'b2') return <div className={`rounded-[3px] bg-orange-400 ring-1 ring-orange-700 ${GRID} ${ring}`} style={{ width: w, height: h }} />
  if (kind === 'b3') return <div className={`rounded-[3px] bg-pink-400 shadow-[6px_-6px_0_#be185d] ring-1 ring-pink-800 ${GRID} ${ring}`} style={{ width: w, height: h }} />
  if (kind === 'b4')
    return (
      <div className={`relative flex flex-col-reverse overflow-hidden rounded-[3px] bg-purple-500 shadow-[6px_-6px_0_#6b21a8] ring-1 ring-purple-900 ${ring}`} style={{ width: w, height: h }}>
        {Array.from({ length: 10 }, (_, i) => <span key={i} className="flex-1 border-t border-white/60" />)}
        <span className="absolute inset-0 grid place-items-center text-[11px] font-black text-white [text-shadow:0_1px_2px_#0008]">10 binlik</span>
      </div>
    )
  if (kind[0] === 'd')
    return <div className={`grid place-items-center rounded-xl bg-white text-4xl font-black text-ink shadow-[0_3px_0_#94a3b8] ring-2 ring-slate-300 ${ring}`} style={{ width: w, height: h }}>{kind[1]}</div>
  if (kind === 'lens')
    return <div className={`grid place-items-center rounded-full bg-sky-500 text-white shadow-[0_3px_0_#0369a1] ring-4 ring-white ${ring}`} style={{ width: w, height: h }}><Search size={30} strokeWidth={3} /></div>
  return <div className={`grid place-items-center rounded-2xl bg-white text-3xl font-black shadow-[0_3px_0_#94a3b8] ring-2 ring-slate-300 ${kind === 'ne' ? 'text-pink-600' : 'text-ink'} ${ring}`} style={{ width: w, height: h }}>{SYM[kind]}</div>
}

/** Parça kutusundaki küçük resim (en fazla 56 px) */
function Thumb({ kind }: { kind: string }) {
  const [w, h] = sizeOf(kind)
  const k = Math.min(1, 52 / Math.max(w, h))
  return (
    <div className="grid size-14 place-items-center">
      <div style={{ width: w * k, height: h * k }}>
        <div style={{ transform: `scale(${k})`, transformOrigin: '0 0', width: w, height: h }}><PieceView kind={kind} /></div>
      </div>
    </div>
  )
}

/* ───────────── yeniden gruplama ───────────── */

const colOf = (z: Zone | null) => (z && /^col-\d$/.test(z.id) ? Number(z.id[4]) : null)
const centroid = (ps: Piece[]) => ({ x: ps.reduce((s, p) => s + p.x, 0) / ps.length, y: ps.reduce((s, p) => s + p.y, 0) / ps.length })

export function mergeTen(pieces: Piece[], ids: number[]): Piece[] | null {
  const ps = pieces.filter((p) => ids.includes(p.id))
  if (ps.length !== 10 || !ps.every((p) => p.kind === ps[0].kind) || !/^b[0-3]$/.test(ps[0].kind)) return null
  const c = centroid(ps)
  return [...pieces.filter((p) => !ids.includes(p.id)), mk(`b${Number(ps[0].kind[1]) + 1}`, c.x, c.y)]
}
export function splitOne(pieces: Piece[], id: number): Piece[] | null {
  const p = pieces.find((q) => q.id === id)
  if (!p || !/^b[1-4]$/.test(p.kind)) return null
  const e = Number(p.kind[1]) - 1
  const step = e === 0 ? 13 : e === 1 ? 13 : 6
  const out = Array.from({ length: 10 }, (_, i) => (e === 0 ? mk('b0', p.x - 26 + (i % 5) * step, p.y - 6 + Math.floor(i / 5) * step) : e === 1 ? mk('b1', p.x - 58 + i * step, p.y) : mk(`b${e}`, p.x - 27 + i * step, p.y - 27 + i * step)))
  return [...pieces.filter((q) => q.id !== id), ...out]
}

/* ───────────── tuval ───────────── */

type Drag =
  | { t: 'new'; kind: string; sx: number; sy: number; moved: boolean }
  | { t: 'move'; ids: number[]; tap: number; sx: number; sy: number; moved: boolean }
  | { t: 'rect'; lx: number; ly: number; sx: number; sy: number; moved: boolean }

export interface TuvalProps {
  W: number
  H: number
  pieces: Piece[]
  onPieces: (p: Piece[]) => void
  palette: string[]
  zones?: Zone[]
  /** Parçaların altında çizilen arka plan (mantıksal koordinatta, absolute) */
  board?: ReactNode
  /** Dikkat çekilecek bölgeler (kesikli, yanıp söner) */
  hot?: string[]
  /** Bırakma denetimi: düzeltilmiş dizi, null (geri al) ya da void (olduğu gibi) */
  onDrop?: (next: Piece[], info: DropInfo) => Piece[] | null | void
  regroup?: boolean
  /** Tuvalde yalnızca bir tane bulunabilen parçalar (büyüteç, taç) */
  single?: string[]
  locked?: boolean
  /** “Göster” düğmesinin canlandırdığı hareket: kutudaki parça → tuvaldeki nokta */
  demo?: { kind: string; x: number; y: number } | null
  autoDemo?: boolean
}

export function Tuval({ W, H, pieces, onPieces, palette, zones = [], board, hot = [], onDrop, regroup, single = [], locked, demo, autoDemo }: TuvalProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const demoRef = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const history = useRef<Piece[][]>([])
  const [s, setS] = useState(1)
  const [sel, setSel] = useState<Set<number>>(() => new Set())
  const [held, setHeld] = useState<string | null>(null)
  const [ghost, setGhost] = useState<{ kind: string; x: number; y: number } | null>(null)
  const [off, setOff] = useState<{ ids: number[]; dx: number; dy: number } | null>(null)
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [demoRun, setDemoRun] = useState(autoDemo ? 1 : 0)

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setS(el.clientWidth / W))
    ro.observe(el)
    setS(el.clientWidth / W)
    return () => ro.disconnect()
  }, [W])

  // Elle gösterim: parça kutusundan hedefe giden el
  useLayoutEffect(() => {
    if (!demoRun || !demo) return
    const root = rootRef.current, el = demoRef.current, cv = canvasRef.current
    const src = root?.querySelector(`[data-pal="${demo.kind}"]`)
    if (!root || !el || !cv || !src || typeof el.animate !== 'function') return
    const rr = root.getBoundingClientRect(), sr = src.getBoundingClientRect(), cr = cv.getBoundingClientRect()
    const x0 = sr.left + sr.width / 2 - rr.left, y0 = sr.top + sr.height / 2 - rr.top
    const x1 = cr.left - rr.left + demo.x * s, y1 = cr.top - rr.top + demo.y * s
    const at = (x: number, y: number) => `translate(${x}px, ${y}px)`
    const a = el.animate(
      [
        { transform: at(x0, y0), opacity: 0 },
        { transform: at(x0, y0), opacity: 1, offset: 0.15 },
        { transform: at(x1, y1), opacity: 1, offset: 0.7 },
        { transform: at(x1, y1), opacity: 1, offset: 0.85 },
        { transform: at(x1, y1), opacity: 0 },
      ],
      { duration: 2200, iterations: 2, easing: 'ease-in-out' },
    )
    a.onfinish = () => setDemoRun(0)
    return () => a.cancel()
  }, [demoRun, demo, s])

  useEffect(() => {
    if (locked) {
      setSel(new Set())
      setHeld(null)
    }
  }, [locked])

  const commit = (next: Piece[]) => {
    history.current.push(pieces)
    if (history.current.length > 50) history.current.shift()
    onPieces(next)
  }
  const toLogical = (cx: number, cy: number) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: (cx - r.left) / s, y: (cy - r.top) / s }
  }
  const overTray = (cx: number, cy: number) => document.elementsFromPoint(cx, cy).some((e) => (e as HTMLElement).dataset?.pp === 'tray')
  const clamp = (p: Piece): Piece => {
    const [w, h] = sizeOf(p.kind)
    return { ...p, x: Math.min(W - w / 2, Math.max(w / 2, p.x)), y: Math.min(H - h / 2, Math.max(h / 2, p.y)) }
  }
  const overId = (cx: number, cy: number) => {
    if (overTray(cx, cy)) return 'tray'
    const l = toLogical(cx, cy)
    return inRect({ x: 0, y: 0, w: W, h: H }, l.x, l.y) ? zoneAt(zones, l.x, l.y)?.id ?? 'canvas' : null
  }

  /** Bırakılan parçaları bölgeye oturt, yeniden grupla, görev denetimine sor */
  const settle = (next: Piece[], ids: number[], zone: Zone | null, fromPalette: boolean, kind: string) => {
    let out = next
    if (ids.length === 1 && zone?.snap) {
      const pt = zone.snap === true ? { x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 } : zone.snap
      out = out.map((p) => (p.id === ids[0] ? { ...p, ...pt } : p))
      if (zone.replace) out = out.filter((p) => ids.includes(p.id) || !inRect(zone, p.x, p.y))
    }
    if (single.includes(kind)) out = out.filter((p) => p.kind !== kind || ids.includes(p.id))
    const c = colOf(zone)
    if (regroup && c !== null) {
      const moved = out.filter((p) => ids.includes(p.id))
      if (moved.length === 10 && moved.every((p) => p.kind === `b${c - 1}`)) out = mergeTen(out, ids) ?? out
      else if (moved.length === 1 && moved[0].kind === `b${c + 1}`) out = splitOne(out, moved[0].id) ?? out
    }
    const res = onDrop?.(out, { ids, kind, zone, fromPalette, before: pieces })
    if (res === null) return false
    commit(res ?? out)
    return true
  }

  const place = (kind: string, x: number, y: number) => {
    const p = clamp(mk(kind, x, y))
    settle([...pieces, p], [p.id], zoneAt(zones, x, y), true, kind)
  }

  const begin = (d: Drag, e: RPointerEvent) => {
    if (locked) return
    e.preventDefault()
    e.stopPropagation()
    drag.current = d
    const move = (ev: PointerEvent) => {
      const g = drag.current
      if (!g) return
      if (!g.moved && Math.hypot(ev.clientX - g.sx, ev.clientY - g.sy) > 6) g.moved = true
      if (!g.moved) return
      if (g.t === 'new') {
        const rr = rootRef.current!.getBoundingClientRect()
        setGhost({ kind: g.kind, x: ev.clientX - rr.left, y: ev.clientY - rr.top })
        setOver(overId(ev.clientX, ev.clientY))
      } else if (g.t === 'move') {
        setOff({ ids: g.ids, dx: (ev.clientX - g.sx) / s, dy: (ev.clientY - g.sy) / s })
        setOver(overId(ev.clientX, ev.clientY))
      } else {
        const l = toLogical(ev.clientX, ev.clientY)
        setRect({ x: Math.min(g.lx, l.x), y: Math.min(g.ly, l.y), w: Math.abs(l.x - g.lx), h: Math.abs(l.y - g.ly) })
      }
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      const g = drag.current
      drag.current = null
      setGhost(null)
      setOff(null)
      setRect(null)
      setOver(null)
      if (!g || ev.type === 'pointercancel') return
      if (g.t === 'new') {
        if (!g.moved) return setHeld((h) => (h === g.kind ? null : g.kind))
        setHeld(null)
        const id = overId(ev.clientX, ev.clientY)
        if (!id || id === 'tray') return
        const l = toLogical(ev.clientX, ev.clientY)
        place(g.kind, l.x, l.y)
        return
      }
      if (g.t === 'move') {
        if (!g.moved) {
          setSel((old) => {
            const n = new Set(old)
            if (n.has(g.tap)) n.delete(g.tap)
            else n.add(g.tap)
            return n
          })
          return
        }
        if (overTray(ev.clientX, ev.clientY)) {
          commit(pieces.filter((p) => !g.ids.includes(p.id)))
          setSel(new Set())
          return
        }
        const dx = (ev.clientX - g.sx) / s, dy = (ev.clientY - g.sy) / s
        const next = pieces.map((p) => (g.ids.includes(p.id) ? clamp({ ...p, x: p.x + dx, y: p.y + dy }) : p))
        const l = toLogical(ev.clientX, ev.clientY)
        const kind = pieces.find((p) => p.id === g.tap)!.kind
        settle(next, g.ids, zoneAt(zones, l.x, l.y), false, kind)
        setSel(new Set())
        return
      }
      if (!g.moved) {
        if (held) {
          const l = toLogical(ev.clientX, ev.clientY)
          place(held, l.x, l.y)
          setHeld(null)
        } else setSel(new Set())
        return
      }
      const l = toLogical(ev.clientX, ev.clientY)
      const r = { x: Math.min(g.lx, l.x), y: Math.min(g.ly, l.y), w: Math.abs(l.x - g.lx), h: Math.abs(l.y - g.ly) }
      setSel(new Set(pieces.filter((p) => inRect(r, p.x, p.y)).map((p) => p.id)))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const onPiece = (p: Piece) => (e: RPointerEvent) => {
    if (held) return
    const ids = sel.has(p.id) ? [...sel] : [p.id]
    begin({ t: 'move', ids, tap: p.id, sx: e.clientX, sy: e.clientY, moved: false }, e)
  }
  const onBg = (e: RPointerEvent) => {
    const l = toLogical(e.clientX, e.clientY)
    begin({ t: 'rect', lx: l.x, ly: l.y, sx: e.clientX, sy: e.clientY, moved: false }, e)
  }

  const selected = pieces.filter((p) => sel.has(p.id))
  const canMerge = regroup && mergeTen(pieces, [...sel]) !== null
  const canSplit = regroup && selected.length === 1 && /^b[1-4]$/.test(selected[0].kind)
  const act = (next: Piece[] | null) => {
    if (!next) return
    commit(next)
    setSel(new Set())
  }
  const tool = 'inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-extrabold text-ink ring-1 ring-line transition hover:bg-sky-50 active:scale-95 disabled:opacity-40'

  return (
    <div ref={rootRef} className="relative select-none">
      <div className="flex flex-col gap-2 sm:flex-row">
        {/* parça kutusu */}
        <aside data-pp="tray" className={`flex shrink-0 flex-row flex-wrap items-center gap-1.5 rounded-2xl bg-slate-100 p-2 ring-1 transition sm:w-[84px] sm:flex-col sm:flex-nowrap ${over === 'tray' ? 'ring-4 ring-red-400 bg-red-50' : 'ring-line'}`}>
          <p className="w-full text-center text-[10px] font-black tracking-wide text-ink-soft uppercase">Parçalar</p>
          {palette.map((k) => (
            <button
              key={k}
              type="button"
              data-pal={k}
              aria-label={`${labelOf(k)}: tuvale sürükle`}
              aria-pressed={held === k}
              disabled={locked}
              onPointerDown={(e) => begin({ t: 'new', kind: k, sx: e.clientX, sy: e.clientY, moved: false }, e)}
              className={`flex touch-none flex-col items-center rounded-xl bg-white p-1 ring-1 transition hover:bg-sky-50 disabled:opacity-40 ${held === k ? 'ring-4 ring-sky-500' : 'ring-line'} ${locked ? '' : 'cursor-grab active:cursor-grabbing'}`}
            >
              <Thumb kind={k} />
              {k[0] === 'b' && <span className="text-[10px] font-black text-ink-soft">{BLOCK_NAME[Number(k[1])]}</span>}
            </button>
          ))}
          <div className="mt-auto flex w-14 flex-col items-center gap-0.5 rounded-xl border-2 border-dashed border-slate-300 p-1 text-slate-400 sm:w-full" aria-label="Çöp kutusu: parçayı buraya sürükle">
            <Trash2 size={20} />
            <span className="text-[10px] font-black">Çöp</span>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* üst çubuk */}
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {demo && (
              <button type="button" onClick={() => setDemoRun((r) => r + 1)} className={`${tool} text-sky-700`}><Play size={16} />Göster</button>
            )}
            <button type="button" disabled={!history.current.length || locked} onClick={() => { const p = history.current.pop(); if (p) onPieces(p); setSel(new Set()) }} className={tool}><Undo2 size={16} />Geri al</button>
            {held && <span className="rounded-xl bg-sky-100 px-3 py-2 text-xs font-black text-sky-800">{labelOf(held)} elinde: tuvalde bir yere dokun</span>}
          </div>

          <div ref={boxRef} className="relative overflow-hidden rounded-2xl bg-white ring-1 ring-line" style={{ height: H * s }}>
            <div
              ref={canvasRef}
              onPointerDown={onBg}
              className={`absolute top-0 left-0 touch-none bg-[radial-gradient(#cbd5e1_1.2px,transparent_1.2px)] [background-size:20px_20px] ${held ? 'cursor-copy' : ''}`}
              style={{ width: W, height: H, transform: `scale(${s})`, transformOrigin: '0 0' }}
            >
              {board}
              {zones.map((z) =>
                over === z.id || hot.includes(z.id) ? (
                  <div key={z.id} className={`pointer-events-none absolute rounded-2xl ${over === z.id ? 'bg-sky-400/15 ring-4 ring-sky-400' : 'animate-pulse ring-4 ring-sky-400/70 ring-dashed'}`} style={{ left: z.x, top: z.y, width: z.w, height: z.h }} />
                ) : null,
              )}
              {pieces.map((p) => {
                const [w, h] = sizeOf(p.kind)
                const mv = off?.ids.includes(p.id)
                return (
                  <div
                    key={p.id}
                    onPointerDown={onPiece(p)}
                    aria-label={labelOf(p.kind)}
                    className={`absolute ${locked ? '' : 'cursor-grab active:cursor-grabbing'} ${mv ? 'z-50 drop-shadow-xl' : ''}`}
                    style={{ left: p.x - w / 2 + (mv ? off!.dx : 0), top: p.y - h / 2 + (mv ? off!.dy : 0) }}
                  >
                    <PieceView kind={p.kind} sel={sel.has(p.id)} />
                  </div>
                )
              })}
              {rect && <div className="pointer-events-none absolute rounded-md border-2 border-dashed border-sky-500 bg-sky-400/10" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }} />}
            </div>
            {locked && <div className="absolute inset-0" />}
          </div>

          {/* seçim çubuğu */}
          {selected.length > 0 && !locked && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-2xl bg-sky-50 p-1.5 ring-1 ring-sky-200 animate-fade-up">
              <span className="px-2 text-sm font-black text-sky-900">{selected.length} parça seçili</span>
              {canMerge && <button type="button" className={tool} onClick={() => act(mergeTen(pieces, [...sel]))}><Combine size={16} />10’u birleştir</button>}
              {canSplit && <button type="button" className={tool} onClick={() => act(splitOne(pieces, selected[0].id))}><Ungroup size={16} />10’a böl</button>}
              <button type="button" className={tool} onClick={() => act([...pieces, ...selected.map((p) => clamp(mk(p.kind, p.x + 24, p.y + 24)))])}><Copy size={16} />Kopyala</button>
              <button type="button" className={tool} onClick={() => act(pieces.filter((p) => !sel.has(p.id)))}><Trash2 size={16} />Sil</button>
            </div>
          )}
        </div>
      </div>

      {ghost && (
        <div className="pointer-events-none absolute top-0 left-0 z-50 opacity-90 drop-shadow-xl" style={{ transform: `translate(${ghost.x}px, ${ghost.y}px)` }}>
          <div style={{ transform: `translate(-50%, -50%) scale(${s})` }}><PieceView kind={ghost.kind} /></div>
        </div>
      )}
      {demo && (
        <div ref={demoRef} className="pointer-events-none absolute top-0 left-0 z-50 opacity-0" aria-hidden>
          <div style={{ transform: `translate(-50%, -50%) scale(${s})` }}><PieceView kind={demo.kind} /></div>
          <Hand size={34} className="absolute top-1 left-1 fill-white text-ink drop-shadow" />
        </div>
      )}
    </div>
  )
}

/* ───────────── nasıl kullanılır ───────────── */

export function HowTo({ onClose }: { onClose: () => void }) {
  const steps: [ReactNode, string, string][] = [
    [<Hand key="h" size={22} />, 'Parçayı sürükle', 'Soldaki “Parçalar” kutusundan bir parçayı parmağınla (ya da fareyle) tut, bırakmadan tuvale taşı ve bırak. Kutu hiç bitmez; aynı parçadan istediğin kadar alabilirsin.'],
    [<MousePointerClick key="m" size={22} />, 'Taşı ve seç', 'Tuvaldeki bir parçayı tutup istediğin yere taşıyabilirsin. Bir parçaya kısa dokunursan seçilir (mavi çerçeve). Boş bir yerden başlayıp sürüklersen çerçeve çizilir ve içindeki bütün parçalar seçilir; seçili parçalar birlikte taşınır.'],
    [<Trash2 key="t" size={22} />, 'Sil ve geri al', 'Fazla parçayı soldaki kutuya ya da çöpe geri sürükle: silinir. Yanlış bir şey yaparsan üstteki “Geri al” düğmesine bas.'],
    [<Play key="p" size={22} />, 'Takılırsan', '“Göster” düğmesine basınca bir el, hangi parçanın nereye gideceğini gösterir. Sağdaki adım listesi de sana ne yapacağını söyler; yanlış bir yere bırakırsan sana bir ipucu sorusu gelir.'],
  ]
  return (
    <div className="mb-3 rounded-3xl bg-white p-4 ring-2 ring-sky-300 animate-fade-up sm:p-5">
      <p className="mb-1 text-lg font-black text-ink">Bu tuval nasıl kullanılır?</p>
      <p className="mb-3 text-sm font-bold text-ink-soft">Bu etkinlikte her şeyi sürükleyip bırakarak yaparsın: bloklar, rakam kartları, büyüteç ve işaretler. Dokunmatik tahtada sürükleyemezsen önce parçaya, sonra tuvalde bırakmak istediğin yere dokun.</p>
      <ol className="grid gap-2 sm:grid-cols-2">
        {steps.map(([icon, t, d], i) => (
          <li key={t} className="flex gap-3 rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-100">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-500 text-white">{icon}</span>
            <div>
              <p className="text-sm font-black text-sky-900">{i + 1}. {t}</p>
              <p className="text-[13px] leading-snug font-bold text-slate-700">{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" onClick={onClose} className="btn-primary mt-3 min-h-12 w-full text-base">Anladım, başlayalım</button>
    </div>
  )
}

/** Görevin adım listesi: yapılan adım yeşil tik, sıradaki vurgulu */
export function Steps({ items }: { items: { text: ReactNode; done: boolean }[] }) {
  const cur = items.findIndex((x) => !x.done)
  return (
    <div className="rounded-2xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-line">
      <p className="mb-1.5 text-[11px] font-black tracking-wide text-pink-700 uppercase">Ne yapacaksın?</p>
      <ol className="space-y-1.5">
        {items.map((x, i) => (
          <li key={i} className={`flex gap-2 rounded-xl px-2 py-1.5 text-[15px] leading-snug font-extrabold ${i === cur ? 'bg-sky-50 text-ink ring-2 ring-sky-300' : x.done ? 'text-emerald-800' : 'text-slate-400'}`}>
            <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-black ${x.done ? 'bg-emerald-500 text-white' : i === cur ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{x.done ? '✓' : i + 1}</span>
            <span>{x.text}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
