import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'
import { Eraser, RotateCw, Trash2 } from 'lucide-react'
import { useWidth } from '../../kit'
import { sfx } from '../../../lib/feedback'
import { inside, lenVal, overlap, snapValues, type Len, type Placed, type Rect, type Syms, type TileKind } from './shapes'

/**
 * Karo tahtası: çerçeveli (kenarları verilen kare/dikdörtgen) ya da serbest mat.
 *  - Kutudaki karoyu sürükle → tahtada yapışma noktasına oturur (yeşil gölge: sığıyor, kırmızı: sığmıyor).
 *  - Dokun-dokun: kutudaki karoya dokun, sonra tahtada bir yere dokun.
 *  - Tahtadaki karoya dokun → seç (Döndür / Kaldır). Sürükleyerek taşı; tahtanın dışına bırakınca kutuya döner.
 */

const M = 1.15 // kenar etiketleri için boşluk (birim)

export interface BoardProps {
  syms: Syms
  kinds: TileKind[]
  /** Çalışma alanı (birim): çerçeve ya da serbest mat */
  region: { w: number; h: number }
  /** Çerçeve kenarları (yalnız çerçeveli tahtada) */
  frame?: { w: Len; h: Len }
  placed: Placed[]
  onChange: (p: Placed[]) => void
  /** Terim başına en çok karo (yoksa sınırsız) */
  limits?: Record<string, number>
  gaps?: Rect[] | null
  locked?: boolean
  onReject?: (msg: string) => void
  /** Tahtanın altında ek içerik (ör. kenar etiketleri seçimi) */
  footer?: ReactNode
}

type Drag = { kind: string; id?: number; off: [number, number]; cx: number; cy: number; snap: { x: number; y: number; ok: boolean } | null; over: boolean }

let nextId = 1

export function TileBoard({ syms, kinds, region, frame, placed, onChange, limits, gaps, locked, onReject, footer }: BoardProps) {
  const byId = useMemo(() => Object.fromEntries(kinds.map((k) => [k.id, k])), [kinds])
  const dims = (kind: string) => ({ w: lenVal(byId[kind].w, syms), h: lenVal(byId[kind].h, syms) })
  const rectOf = (p: Placed): Rect => ({ x: p.x, y: p.y, ...dims(p.kind) })
  const [wrap, width] = useWidth<HTMLDivElement>()
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDragState] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const setDrag = (d: Drag | null) => {
    dragRef.current = d
    setDragState(d)
  }
  const dragMove = (cx: number, cy: number) => dragRef.current && setDrag(move(dragRef.current, cx, cy))
  const dragEnd = (cx: number, cy: number) => {
    const d = dragRef.current
    setDrag(null)
    if (!d) return
    const f = move(d, cx, cy)
    commit(f.kind, f.id, f.snap, f.over)
  }
  const [armed, setArmed] = useState<string | null>(null)
  const [sel, setSel] = useState<number | null>(null)

  const vb = { x: -M, y: -M, w: region.w + M + 0.25, h: region.h + M + 0.25 }
  const maxH = typeof window === 'undefined' ? 480 : Math.max(280, Math.min(560, window.innerHeight * 0.52))
  const ppu = Math.min(width / vb.w, maxH / vb.h)

  const counts = (except?: number) => {
    const c: Record<string, number> = {}
    for (const p of placed) if (p.id !== except) c[byId[p.kind].term] = (c[byId[p.kind].term] ?? 0) + 1
    return c
  }
  const left = (term: string) => (limits?.[term] === undefined ? Infinity : limits[term] - (counts()[term] ?? 0))

  const toU = (cx: number, cy: number): [number, number] | null => {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r) return null
    return [vb.x + ((cx - r.left) / r.width) * vb.w, vb.y + ((cy - r.top) / r.height) * vb.h]
  }
  const overBoard = (cx: number, cy: number) => {
    const r = svgRef.current?.getBoundingClientRect()
    return !!r && cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom
  }

  const valid = (kind: string, x: number, y: number, except?: number) => {
    const rr = { x, y, ...dims(kind) }
    return inside(rr, { x: 0, y: 0, ...region }) && !placed.some((p) => p.id !== except && overlap(rr, rectOf(p)))
  }
  const snapFor = (kind: string, rx: number, ry: number, except?: number) => {
    const { w, h } = dims(kind)
    const near = (vals: number[], v: number) => [...vals].sort((p, q) => Math.abs(p - v) - Math.abs(q - v)).slice(0, 4)
    const xs = near(snapValues(syms, region.w - w), rx)
    const ys = near(snapValues(syms, region.h - h), ry)
    if (!xs.length || !ys.length) return null
    const combos = xs.flatMap((x) => ys.map((y) => ({ x, y, d: Math.hypot(x - rx, y - ry) }))).sort((p, q) => p.d - q.d)
    const ok = combos.find((c) => c.d < 2.2 && valid(kind, c.x, c.y, except))
    return ok ? { x: ok.x, y: ok.y, ok: true } : { x: combos[0].x, y: combos[0].y, ok: false }
  }

  const commit = (kind: string, id: number | undefined, s: { x: number; y: number; ok: boolean } | null, over: boolean) => {
    if (id !== undefined && !over) {
      onChange(placed.filter((p) => p.id !== id))
      setSel(null)
      return
    }
    if (!s || !over) return
    if (!s.ok) {
      sfx.bad()
      onReject?.('Karo oraya sığmıyor: başka bir karoyla üst üste biniyor ya da tahtadan taşıyor.')
      return
    }
    if (id === undefined) {
      if (left(byId[kind].term) <= 0) return onReject?.('Bu karodan kalmadı.')
      onChange([...placed, { id: nextId++, kind, x: s.x, y: s.y }])
    } else onChange(placed.map((p) => (p.id === id ? { ...p, x: s.x, y: s.y } : p)))
    sfx.ok()
  }

  const move = (d: Drag, cx: number, cy: number): Drag => {
    const u = toU(cx, cy)
    const over = overBoard(cx, cy)
    const snap = u && over ? snapFor(d.kind, u[0] - d.off[0], u[1] - d.off[1], d.id) : null
    return { ...d, cx, cy, snap, over }
  }

  const tapBoard = (e: React.MouseEvent<SVGSVGElement>) => {
    if (locked) return
    if ((e.target as Element).closest('[data-tile]')) return
    if (!armed) return setSel(null)
    const u = toU(e.clientX, e.clientY)
    if (!u) return
    const { w, h } = dims(armed)
    const sn = snapFor(armed, u[0] - w / 2, u[1] - h / 2)
    commit(armed, undefined, sn, true)
    if (sn?.ok) setArmed(null)
  }

  const selP = placed.find((p) => p.id === sel)
  const rotate = () => {
    if (!selP) return
    const r = byId[selP.kind].rot
    if (!r) return
    const s = valid(r, selP.x, selP.y, selP.id) ? { x: selP.x, y: selP.y, ok: true } : snapFor(r, selP.x, selP.y, selP.id)
    if (!s?.ok) return onReject?.('Döndürünce sığmıyor; önce yanında yer aç ya da başka yere taşı.')
    onChange(placed.map((p) => (p.id === selP.id ? { ...p, kind: r, x: s.x, y: s.y } : p)))
  }

  const ghostDims = drag ? dims(drag.kind) : null
  // kutu önizlemeleri: x² karosu ~76 px olacak ölçek
  const binScale = Math.min(ppu * 0.6, 76 / Math.max(...kinds.map((k) => Math.max(lenVal(k.w, syms), lenVal(k.h, syms)))))

  return (
    <div ref={wrap} className="min-w-0">
      <div className="flex justify-center">
        <svg
          ref={svgRef}
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          width={vb.w * ppu}
          height={vb.h * ppu}
          onClick={tapBoard}
          className="touch-none select-none"
          style={{ touchAction: 'none' }}
          role="application"
          aria-label="Karo tahtası"
        >
          <defs>
            <pattern id="ozd-hatch" width="0.3" height="0.3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="0.3" height="0.3" fill="#fbbf2433" />
              <line x1="0" y1="0" x2="0" y2="0.3" stroke="#fbbf24" strokeWidth="0.12" />
            </pattern>
          </defs>
          {/* çalışma alanı */}
          <rect x={0} y={0} width={region.w} height={region.h} rx={0.06} fill={frame ? '#0f172a' : '#1e293b'} stroke={frame ? '#e2e8f0' : '#64748b'} strokeWidth={frame ? 0.06 : 0.04} strokeDasharray={frame ? undefined : '0.2 0.15'} />
          {frame && <EdgeLabels frame={frame} syms={syms} />}
          {/* boşluklar */}
          {gaps?.map((g, i) => <rect key={i} x={g.x} y={g.y} width={g.w} height={g.h} fill="url(#ozd-hatch)" stroke="#fbbf24" strokeWidth={0.05} className="animate-pulse" />)}
          {/* karolar */}
          {placed.map((p) => (
            <PlacedTile key={p.id} p={p} k={byId[p.kind]} rect={rectOf(p)} selected={sel === p.id} dragging={drag?.id === p.id} locked={locked}
              onTap={() => setSel(sel === p.id ? null : p.id)}
              onStart={(cx, cy) => {
                const u = toU(cx, cy)
                if (!u) return
                setSel(p.id)
                setDrag({ kind: p.kind, id: p.id, off: [u[0] - p.x, u[1] - p.y], cx, cy, snap: null, over: true })
              }}
              onMove={dragMove}
              onEnd={dragEnd}
            />
          ))}
          {/* sürükleme gölgesi */}
          {drag?.snap && ghostDims && (
            <rect x={drag.snap.x} y={drag.snap.y} width={ghostDims.w} height={ghostDims.h} rx={0.06} fill={drag.snap.ok ? '#10b98133' : '#ef444433'} stroke={drag.snap.ok ? '#34d399' : '#f87171'} strokeWidth={0.07} strokeDasharray="0.2 0.12" pointerEvents="none" />
          )}
        </svg>
      </div>

      {/* sürüklenen karo (tahta dışındayken parmağın altında) */}
      {drag && !drag.over && ghostDims && (
        <div className="pointer-events-none fixed z-50 rounded-md opacity-80 shadow-2xl" style={{ left: drag.cx - drag.off[0] * ppu, top: drag.cy - drag.off[1] * ppu, width: ghostDims.w * ppu, height: ghostDims.h * ppu, background: byId[drag.kind].color }} />
      )}

      {!locked && (
        <div className="mt-3 rounded-2xl bg-slate-800/80 p-2 ring-1 ring-slate-600">
          <div className="flex flex-wrap items-end justify-center gap-2.5">
            {kinds.map((k) => (
              <BinTile key={k.id} k={k} syms={syms} scale={binScale} armed={armed === k.id} left={left(k.term)}
                onTap={() => setArmed(armed === k.id ? null : k.id)}
                onStart={(cx, cy) => {
                  if (left(k.term) <= 0) return false
                  const { w, h } = dims(k.id)
                  setArmed(null)
                  setDrag({ kind: k.id, off: [w / 2, h / 2], cx, cy, snap: null, over: false })
                  return true
                }}
                onMove={dragMove}
                onEnd={dragEnd}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <ToolBtn onClick={rotate} disabled={!selP || !byId[selP.kind].rot}><RotateCw size={17} />Döndür</ToolBtn>
            <ToolBtn onClick={() => { if (selP) { onChange(placed.filter((p) => p.id !== selP.id)); setSel(null) } }} disabled={!selP}><Trash2 size={17} />Kaldır</ToolBtn>
            <ToolBtn onClick={() => { onChange([]); setSel(null) }} disabled={!placed.length}><Eraser size={17} />Temizle</ToolBtn>
          </div>
          <p className="mt-1.5 text-center text-xs font-bold text-slate-400">{armed ? 'Şimdi tahtada karoyu koymak istediğin yere dokun.' : 'Karoyu tahtaya sürükle ya da önce karoya, sonra tahtaya dokun.'}</p>
        </div>
      )}
      {footer}
    </div>
  )
}

function ToolBtn({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-slate-700 px-3 text-sm font-extrabold text-slate-100 ring-1 ring-slate-500 active:scale-95 disabled:opacity-35">
      {children}
    </button>
  )
}

/** Tahta kenarındaki parça etiketleri: x | 1 | 1 */
function EdgeLabels({ frame, syms }: { frame: { w: Len; h: Len }; syms: Syms }) {
  const segs = (l: Len) => [...Array(l[0]).fill(0), ...Array(Math.max(0, l[1])).fill(1)].map((i) => ({ len: syms[i].value, label: syms[i].label, main: i === 0 }))
  const draw = (l: Len, vertical: boolean) => {
    let at = 0
    return segs(l).map((s, i) => {
      const a = at
      at += s.len
      const mid = a + s.len / 2
      const col = s.main ? '#93c5fd' : '#fcd34d'
      return vertical ? (
        <g key={i}>
          <line x1={-0.35} y1={a + 0.05} x2={-0.35} y2={a + s.len - 0.05} stroke={col} strokeWidth={0.06} />
          <line x1={-0.5} y1={a + 0.05} x2={-0.2} y2={a + 0.05} stroke={col} strokeWidth={0.05} />
          <line x1={-0.5} y1={a + s.len - 0.05} x2={-0.2} y2={a + s.len - 0.05} stroke={col} strokeWidth={0.05} />
          <text x={-0.72} y={mid} fontSize={s.main ? 0.5 : 0.42} fontWeight={900} fill={col} textAnchor="middle" dominantBaseline="central">{s.label}</text>
        </g>
      ) : (
        <g key={i}>
          <line x1={a + 0.05} y1={-0.35} x2={a + s.len - 0.05} y2={-0.35} stroke={col} strokeWidth={0.06} />
          <line x1={a + 0.05} y1={-0.5} x2={a + 0.05} y2={-0.2} stroke={col} strokeWidth={0.05} />
          <line x1={a + s.len - 0.05} y1={-0.5} x2={a + s.len - 0.05} y2={-0.2} stroke={col} strokeWidth={0.05} />
          <text x={mid} y={-0.72} fontSize={s.main ? 0.5 : 0.42} fontWeight={900} fill={col} textAnchor="middle" dominantBaseline="central">{s.label}</text>
        </g>
      )
    })
  }
  return (
    <g pointerEvents="none">
      {draw(frame.w, false)}
      {draw(frame.h, true)}
    </g>
  )
}

/** SVG içindeki karo çizimi (bulmaca parçalarında da kullanılır) */
export function TileShape({ rect, color, label, selected, faded, dashed }: { rect: Rect; color: string; label: string; selected?: boolean; faded?: boolean; dashed?: boolean }) {
  const fs = Math.max(0.32, Math.min(0.85, Math.min(rect.w, rect.h) * 0.42))
  return (
    <g opacity={faded ? 0.35 : 1}>
      <rect x={rect.x + 0.03} y={rect.y + 0.03} width={rect.w - 0.06} height={rect.h - 0.06} rx={0.08} fill={color} stroke={selected ? '#fff' : '#0f172a'} strokeWidth={selected ? 0.1 : 0.05} strokeDasharray={dashed ? '0.18 0.12' : undefined} />
      <rect x={rect.x + 0.03} y={rect.y + rect.h - 0.16} width={rect.w - 0.06} height={0.13} rx={0.05} fill="#0002" />
      <text x={rect.x + rect.w / 2} y={rect.y + rect.h / 2} fontSize={fs} fontWeight={900} fill="#fff" textAnchor="middle" dominantBaseline="central">{label}</text>
    </g>
  )
}

function PlacedTile({ p, k, rect, selected, dragging, locked, onTap, onStart, onMove, onEnd }: {
  p: Placed; k: TileKind; rect: Rect; selected: boolean; dragging: boolean; locked?: boolean
  onTap: () => void; onStart: (cx: number, cy: number) => void; onMove: (cx: number, cy: number) => void; onEnd: (cx: number, cy: number) => void
}) {
  const bind = useDrag(({ first, last, tap, xy: [cx, cy], event }) => {
    if (locked) return
    event?.stopPropagation?.()
    if (tap) return onTap()
    if (first) onStart(cx, cy)
    if (last) onEnd(cx, cy)
    else onMove(cx, cy)
  }, { filterTaps: true })
  return (
    <g {...bind()} data-tile={p.id} onClick={(e) => e.stopPropagation()} style={{ cursor: locked ? 'default' : 'grab', touchAction: 'none' }} opacity={dragging ? 0.35 : 1}>
      <TileShape rect={rect} color={k.color} label={k.label} selected={selected} />
    </g>
  )
}

function BinTile({ k, syms, scale, armed, left, onTap, onStart, onMove, onEnd }: {
  k: TileKind; syms: Syms; scale: number; armed: boolean; left: number
  onTap: () => void; onStart: (cx: number, cy: number) => boolean; onMove: (cx: number, cy: number) => void; onEnd: (cx: number, cy: number) => void
}) {
  const started = useRef(false)
  const bind = useDrag(({ first, last, tap, xy: [cx, cy] }) => {
    if (tap) return left > 0 && onTap()
    if (first) started.current = onStart(cx, cy)
    if (!started.current) return
    if (last) onEnd(cx, cy)
    else onMove(cx, cy)
  }, { filterTaps: true })
  const w = Math.max(14, lenVal(k.w, syms) * scale), h = Math.max(14, lenVal(k.h, syms) * scale)
  const out = left <= 0
  return (
    <button type="button" {...bind()} aria-label={`${k.label} karosu${Number.isFinite(left) ? `, ${left} tane kaldı` : ''}`} aria-pressed={armed} disabled={out}
      className={`relative grid min-h-12 min-w-12 touch-none place-items-center rounded-xl p-1.5 transition ${armed ? 'bg-pink-600/30 ring-2 ring-pink-400' : 'hover:bg-slate-700'} ${out ? 'opacity-30' : ''}`}
      style={{ touchAction: 'none' }}
    >
      <span className="grid place-items-center rounded-md text-sm font-black text-white shadow-[inset_0_-3px_0_#0003]" style={{ width: w, height: h, background: k.color }}>{k.label}</span>
      {Number.isFinite(left) && <span className="absolute -top-1 -right-1 grid size-6 place-items-center rounded-full bg-white text-xs font-black text-ink ring-1 ring-slate-300">{Math.max(0, left)}</span>}
    </button>
  )
}
