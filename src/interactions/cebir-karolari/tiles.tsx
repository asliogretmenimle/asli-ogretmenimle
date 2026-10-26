import { useCallback, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useDrag } from '@use-gesture/react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { MathText } from '../../components/MathText'
import type { Kind, SideId, Tile } from './model'
import { fmtNet } from './model'

/**
 * Karo görselleri ve sürükle-bırak.
 *  - Kaynaklar: kutudaki karo türleri (bin) ve mattaki karolar.
 *  - Hedefler: data-drop="side:L" | "tile:L:12" | "bin". Hedef, bırakılan noktadaki öğeden bulunur.
 */

export const GREEN = '#10b981'
export const AMBER = '#f59e0b'
export const RED = '#ef4444'
const GROUP_RING = ['#7c3aed', '#0ea5e9', '#db2777']

export type Src = { from: 'bin'; k: Kind; neg: boolean } | { from: SideId; id: number; k: Kind; neg: boolean }
export type Target = { t: 'side'; side: SideId } | { t: 'tile'; side: SideId; id: number } | { t: 'bin' } | null

export function useTileDnd(onDrop: (src: Src, to: Target) => void) {
  const [drag, setDrag] = useState<{ src: Src; x: number; y: number } | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const cb = useRef(onDrop)
  cb.current = onDrop
  const find = useCallback((x: number, y: number): { key: string | null; target: Target } => {
    const el = document.elementFromPoint(x, y)?.closest('[data-drop]') as HTMLElement | null
    const key = el?.dataset.drop ?? null
    if (!key) return { key: null, target: null }
    const [t, side, id] = key.split(':')
    if (t === 'bin') return { key, target: { t: 'bin' } }
    if (t === 'side') return { key, target: { t: 'side', side: side as SideId } }
    return { key, target: { t: 'tile', side: side as SideId, id: Number(id) } }
  }, [])
  return { drag, setDrag, over, setOver, find, drop: (s: Src, t: Target) => cb.current(s, t) }
}
export type TileDnd = ReturnType<typeof useTileDnd>

export function TileFace({ k, neg, g, selected, ghost, flip, dim, small }: { k: Kind; neg: boolean; g?: number; selected?: boolean; ghost?: boolean; flip?: number; dim?: boolean; small?: boolean }) {
  const color = neg ? RED : k === 'x' ? GREEN : AMBER
  const w = small ? 36 : 48
  const h = k === 'x' ? (small ? 84 : 112) : w
  if (flip !== undefined && k === 'x') {
    // x karosu değerine çevrildi: |v| tane küçük kare
    const n = Math.abs(flip)
    const vneg = neg !== flip < 0
    return (
      <span className="inline-grid content-end gap-0.5 rounded-lg p-0.5 ring-2 ring-dashed" style={{ width: w, minHeight: h, gridTemplateColumns: 'repeat(2, 1fr)', boxShadow: `inset 0 0 0 2px ${color}55` }} aria-label={`x = ${flip}`}>
        {Array.from({ length: n }, (_, i) => <span key={i} className="aspect-square rounded-[4px]" style={{ background: vneg ? RED : AMBER }} />)}
      </span>
    )
  }
  return (
    <span
      className={`relative grid place-items-center rounded-lg font-black text-white transition ${ghost ? 'shadow-2xl' : ''} ${dim ? 'opacity-30' : ''}`}
      style={{
        width: w,
        height: h,
        background: `linear-gradient(160deg, ${color}, ${color}cc)`,
        boxShadow: `inset 0 -3px 0 #0003, 0 2px 0 #0002${selected ? `, 0 0 0 3px #fff, 0 0 0 6px ${color}` : ''}${g !== undefined ? `, 0 0 0 2px ${GROUP_RING[g % 3]}` : ''}`,
        transform: selected ? 'translateY(-3px)' : undefined,
      }}
    >
      <span className={k === 'x' ? 'text-lg' : 'text-sm'}>{neg ? (k === 'x' ? '−x' : '−1') : k === 'x' ? 'x' : '1'}</span>
    </span>
  )
}

/** Karoya dokunuştan hemen sonra gelen “click” olayı (düzen değişince) mata düşmesin */
let lastTileTap = 0

/** Sürüklenebilir karo (mattaki ya da kutudaki) */
export function DragTile({ src, dnd, onTap, selected, dropKey, flip, small, label }: { src: Src; dnd: TileDnd; onTap: () => void; selected?: boolean; dropKey?: string; flip?: number; small?: boolean; label: string }) {
  const bind = useDrag(
    ({ tap, last, xy: [x, y], event }) => {
      event?.preventDefault?.()
      if (tap) {
        lastTileTap = Date.now()
        onTap()
        return
      }
      if (last) {
        lastTileTap = Date.now()
        const { target } = dnd.find(x, y)
        dnd.setDrag(null)
        dnd.setOver(null)
        dnd.drop(src, target)
        return
      }
      dnd.setDrag({ src, x, y })
      dnd.setOver(dnd.find(x, y).key)
    },
    { filterTaps: true },
  )
  const me = dnd.drag && dnd.drag.src.from !== 'bin' && src.from !== 'bin' && dnd.drag.src.id === src.id
  const hot = dropKey && dnd.over === dropKey && !me
  return (
    <button
      type="button"
      {...bind()}
      onClick={(e) => e.detail === 0 && onTap()}
      data-drop={dropKey}
      aria-label={label}
      aria-pressed={selected}
      className={`cursor-grab rounded-lg transition select-none active:cursor-grabbing ${hot ? 'scale-110' : ''}`}
      style={{ touchAction: 'none' }}
    >
      <TileFace k={src.k} neg={src.neg} selected={selected} dim={!!me} flip={flip} small={small} />
    </button>
  )
}

export function Ghost({ dnd }: { dnd: TileDnd }) {
  if (!dnd.drag) return null
  return createPortal(
    <div className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-1/2" style={{ left: dnd.drag.x, top: dnd.drag.y }}>
      <TileFace k={dnd.drag.src.k} neg={dnd.drag.src.neg} ghost />
    </div>,
    document.body,
  )
}

/** Matın bir tarafı */
export function SideMat({ side, tiles, dnd, sel, onTapTile, onTapSide, dark, label, rows, flip, sorted, minH = 168, groupRings }: { side: SideId; tiles: Tile[]; dnd: TileDnd; sel: { side: SideId; id: number } | null; onTapTile: (t: Tile) => void; onTapSide: () => void; dark: boolean; label?: ReactNode; rows?: number; flip?: number; sorted?: boolean; minH?: number; groupRings?: boolean }) {
  const key = `side:${side}`
  const hot = dnd.over === key
  const order = (a: Tile, b: Tile) => (a.k === b.k ? Number(a.neg) - Number(b.neg) : a.k === 'x' ? -1 : 1)
  const list = sorted ? [...tiles].sort(order) : tiles
  const tileBtn = (t: Tile) => (
    <span key={t.id} className="inline-flex rounded-lg" style={groupRings && t.g !== undefined ? { boxShadow: `0 0 0 3px ${GROUP_RING[t.g % 3]}`, borderRadius: 10 } : undefined}>
      <DragTile src={{ from: side, id: t.id, k: t.k, neg: t.neg }} dnd={dnd} onTap={() => onTapTile(t)} selected={sel?.side === side && sel.id === t.id} dropKey={`tile:${side}:${t.id}`} flip={flip} label={`${t.neg ? 'negatif ' : ''}${t.k === 'x' ? 'x' : '1'} karosu`} />
    </span>
  )
  let body: ReactNode
  if (rows && rows > 1) {
    const per = tiles.length / rows
    const grp = Array.from({ length: rows }, (_, r) => [...tiles].sort(order).slice(r * per, (r + 1) * per))
    body = (
      <div className="flex w-full flex-col gap-2">
        {grp.map((g, r) => (
          <div key={r} className={`flex flex-wrap items-end gap-1.5 rounded-xl p-1.5 ${r === 0 ? (dark ? 'bg-violet-500/20 ring-2 ring-violet-400' : 'bg-violet-50 ring-2 ring-violet-300') : 'opacity-60 ring-1 ring-dashed ring-slate-400'}`}>
            {g.map(tileBtn)}
          </div>
        ))}
      </div>
    )
  } else body = <div className="flex flex-wrap content-start items-end gap-1.5">{list.map(tileBtn)}</div>
  return (
    <div
      data-drop={key}
      onClick={(e) => !(e.target as Element).closest('button') && Date.now() - lastTileTap > 400 && onTapSide()}
      className={`relative flex flex-col rounded-2xl p-2.5 transition ${dark ? 'bg-slate-900/60' : 'bg-white/90'} ${hot ? 'ring-4 ring-violet-400' : dark ? 'ring-1 ring-slate-600' : 'ring-1 ring-line'}`}
      style={{ minHeight: minH, touchAction: 'none' }}
    >
      {label && <p className={`pointer-events-none mb-1.5 text-[11px] font-black tracking-wide uppercase ${dark ? 'text-slate-400' : 'text-ink-soft'}`}>{label}</p>}
      <div className="flex-1">
        {tiles.length ? body : <p className={`pointer-events-none py-6 text-center text-sm font-bold ${dark ? 'text-slate-500' : 'text-ink-soft/70'}`}>Karoları buraya sürükle</p>}
      </div>
    </div>
  )
}

/** Karo kutusu: yeni karo al; mattaki karoyu buraya bırakınca kaldırılır */
export function Bin({ kinds, dnd, picked, onPick, dark, trashLabel = 'Kaldırmak için buraya' }: { kinds: { k: Kind; neg: boolean }[]; dnd: TileDnd; picked: { k: Kind; neg: boolean } | null; onPick: (k: Kind, neg: boolean) => void; dark: boolean; trashLabel?: string }) {
  const hot = dnd.over === 'bin'
  const dragFromMat = dnd.drag && dnd.drag.src.from !== 'bin'
  return (
    <div data-drop="bin" className={`flex flex-wrap items-end justify-center gap-3 rounded-2xl p-3 transition ${dark ? 'bg-slate-900/70' : 'bg-white/80'} ${hot ? 'ring-4 ring-rose-400' : dragFromMat ? 'ring-2 ring-dashed ring-rose-300' : dark ? 'ring-1 ring-slate-700' : 'ring-1 ring-line'}`} style={{ touchAction: 'none' }}>
      <p className={`w-full text-center text-[11px] font-black tracking-wide uppercase ${dark ? 'text-slate-400' : 'text-ink-soft'}`}>{dragFromMat ? <span className="inline-flex items-center gap-1 text-rose-500"><Trash2 size={13} />{trashLabel}</span> : 'Karo kutusu · sürükle ya da dokun'}</p>
      {kinds.map((t) => (
        <div key={`${t.k}${t.neg}`} className="flex flex-col items-center gap-1">
          <DragTile src={{ from: 'bin', k: t.k, neg: t.neg }} dnd={dnd} onTap={() => onPick(t.k, t.neg)} selected={picked?.k === t.k && picked.neg === t.neg} label={`Kutudan ${t.neg ? 'negatif ' : ''}${t.k} karosu al`} />
          <span className={`text-xs font-black ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>{t.neg ? (t.k === 'x' ? '−x' : '−1') : t.k === 'x' ? '+x' : '+1'}</span>
        </div>
      ))}
    </div>
  )
}

/** ax + b girişi: iki adım düğmesi */
export function ExprEntry({ a, b, setA, setB, dark, allowNeg }: { a: number; b: number; setA: (v: number) => void; setB: (v: number) => void; dark: boolean; allowNeg: boolean }) {
  const lo = allowNeg ? -20 : 0
  const st = (label: string, v: number, set: (v: number) => void, color: string) => (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-[11px] font-black tracking-wide uppercase ${dark ? 'text-slate-400' : 'text-ink-soft'}`}>{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => set(Math.max(lo, v - 1))} className={`grid size-12 place-items-center rounded-xl ring-1 active:scale-95 ${dark ? 'bg-slate-700 ring-slate-500' : 'bg-white ring-line'}`} aria-label={`${label} azalt`}><Minus size={18} /></button>
        <span className="min-w-12 text-center text-2xl font-black tabular-nums" style={{ color }}>{signed(v)}</span>
        <button type="button" onClick={() => set(Math.min(20, v + 1))} className={`grid size-12 place-items-center rounded-xl ring-1 active:scale-95 ${dark ? 'bg-slate-700 ring-slate-500' : 'bg-white ring-line'}`} aria-label={`${label} artır`}><Plus size={18} /></button>
      </div>
    </div>
  )
  return (
    <div>
      <div className="flex flex-wrap justify-center gap-3">
        {st('x’lerin sayısı', a, setA, GREEN)}
        {st('sabit terim', b, setB, '#d97706')}
      </div>
      <p className={`mt-2 rounded-xl py-1.5 text-center text-2xl font-black ${dark ? 'bg-slate-900 text-white' : 'bg-paper text-ink'}`}><MathText text={fmtNet(a, b)} /></p>
    </div>
  )
}

const signed = (v: number) => String(v).replace('-', '−')
