import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Hand, RotateCcw, Undo2 } from 'lucide-react'
import { Drag, Drop, n, type Dnd, type ToolInfo } from '../sayilari-karsilastir/parts'
import { Block, useUnit } from '../farkli-cozumleme/tuval'

/**
 * Zihinden toplama-çıkarma için üç etkileşimli model ve ortak “işlem adımları” şeridi:
 *  - Taban blokları: ikinci sayının onluk ve birlikleri tek tek (ya da hepsi birden) ilk sayıya sürüklenir;
 *    çıkarmada sayının blokları “Gidenler”e sürüklenir, birlik yetmezse bir onluk bozulur.
 *  - Yüzlük tablo: işaret sürüklenir; aşağı/yukarı bir zıplama ±10’un katı, sağa/sola ±1’in katı. Her zıplama iz bırakır.
 *  - Boş sayı doğrusu: zıplama kartları (+10, +1, −1 …) doğruya sürüklenir; yay çizilir, ara sayılar yazılır.
 * Her model bir başlangıç sayısı ve zıplama listesiyle (moves) tanımlanır; şerit bu listeden işlem cümlelerini üretir.
 */

/* ───────────── zıplamalar ve adımlar ───────────── */

/** d: değer değişimi. break: bir onluğu 10 birliğe bozma (değer değişmez) */
export interface Mv { d: number; brk?: boolean }
export const sgn = (d: number) => (d < 0 ? `− ${n(-d)}` : `+ ${n(d)}`)
export const signed = (d: number) => (d < 0 ? `−${n(-d)}` : `+${n(d)}`)
export const sumOf = (ms: Mv[]) => ms.reduce((s, m) => s + m.d, 0)

export interface Step { from: number; d: number; to: number; brk?: boolean; ten?: boolean }

/**
 * merge: bloklarda art arda aynı birimle (onluk/birlik) ve aynı yönde yapılan hareketler tek adımdır;
 * birlikler bir onluğa ulaşınca adım orada biter (onluğa tamamlama görünsün).
 */
export function stepsOf(start: number, ms: Mv[], merge: boolean): Step[] {
  const out: Step[] = []
  let v = start
  for (const m of ms) {
    if (m.brk) {
      out.push({ from: v, d: 0, to: v, brk: true })
      continue
    }
    const to = v + m.d
    const last = out[out.length - 1]
    const unit = (d: number) => (Math.abs(d) % 10 === 0 ? 10 : 1)
    if (merge && last && !last.brk && !last.ten && unit(last.d) === unit(m.d) && Math.sign(last.d) === Math.sign(m.d) && !(unit(m.d) === 1 && last.to % 10 === 0)) {
      last.d += m.d
      last.to = to
    } else out.push({ from: v, d: m.d, to })
    const cur = out[out.length - 1]
    if (merge && unit(m.d) === 1 && to % 10 === 0) cur.ten = true
    v = to
  }
  return out
}

/** “46 + 20 + 7 = 73” */
export function chainOf(start: number, steps: Step[]) {
  const real = steps.filter((s) => !s.brk)
  if (!real.length) return null
  return `${n(start)} ${real.map((s) => sgn(s.d)).join(' ')} = ${n(real[real.length - 1].to)}`
}

export function Strip({ start, steps, title = 'İşlem adımlarım', note, empty = 'Bir zıplama ya da blok hareketi yaptıkça işlem cümlelerin burada yazılacak.', dim }: { start: number; steps: Step[]; title?: string; note?: ReactNode; empty?: string; dim?: boolean }) {
  const chain = chainOf(start, steps)
  return (
    <div className={`rounded-2xl bg-white p-3 ring-2 ring-violet-200 ${dim ? 'opacity-80' : ''}`}>
      <p className="mb-2 text-xs font-black tracking-wide text-violet-700 uppercase">📝 {title}</p>
      {steps.length ? (
        <ol className="max-h-64 space-y-1.5 overflow-y-auto pr-0.5">
          {steps.map((s, i) => (
            <li key={i} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 animate-fade-up ${s.ten ? 'bg-emerald-50 ring-1 ring-emerald-300' : 'bg-violet-50/70 ring-1 ring-violet-200'}`}>
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-violet-600 text-xs font-black text-white">{i + 1}</span>
              {s.brk ? (
                <span className="text-[15px] font-extrabold">1 onluğu 10 birliğe bozdum.</span>
              ) : (
                <span className="text-lg font-black tabular-nums">{n(s.from)} {sgn(s.d)} = <b className={s.ten ? 'text-emerald-700' : 'text-violet-800'}>{n(s.to)}</b></span>
              )}
              {s.ten && <span className="ml-auto text-xs font-black text-emerald-700">onluk!</span>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-xl bg-violet-50/60 px-3 py-3 text-sm font-bold text-violet-900/70">{empty}</p>
      )}
      {chain && steps.filter((s) => !s.brk).length > 1 && <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-center text-lg font-black text-emerald-800 tabular-nums ring-1 ring-emerald-300">{chain}</p>}
      {note}
    </div>
  )
}

/* ───────────── taban blokları ───────────── */

/** Sayının o anki onluk ve birlik sayısı (bloklarda bozma olabilir; toplamada 10 birlik kendiliğinden onluk olur) */
export function blocksOf(start: number, ms: Mv[], add: boolean) {
  let t = Math.floor(start / 10), o = start % 10, merged = false
  ms.forEach((m, i) => {
    if (m.brk) {
      t--
      o += 10
    } else if (Math.abs(m.d) % 10 === 0) t += m.d / 10
    else o += m.d
    if (add && o >= 10) {
      t += Math.floor(o / 10)
      o %= 10
      if (i === ms.length - 1) merged = true
    }
  })
  return { t, o, merged }
}

function Bars({ t, o, u, fresh }: { t: number; o: number; u: number; fresh?: { t: number; o: number } }) {
  return (
    <div className="flex min-h-[110px] flex-wrap items-end justify-center gap-x-3 gap-y-2">
      <span className="flex flex-wrap items-end gap-[3px]">
        {Array.from({ length: t }, (_, i) => <span key={i} className={fresh && i >= t - fresh.t ? 'animate-pop' : ''}><Block e={1} size={u} /></span>)}
      </span>
      <span className="grid grid-flow-col grid-rows-5 gap-[3px]">
        {Array.from({ length: o }, (_, i) => <Block key={i} e={0} size={u + 2} />)}
      </span>
    </div>
  )
}

/**
 * add: ikinci sayının (b) blokları kaynak tepsisinde; tutup sayıya (num) sürüklenir.
 * sub: sayının kendi blokları sürüklenir: Gidenler’e (gone) ya da onluk birlik alanına (bozma).
 */
export function BlocksModel({ start, b, ms, add, dnd, lock }: { start: number; b: number; ms: Mv[]; add: boolean; dnd: Dnd; lock?: boolean }) {
  const u = useUnit()
  const v = start + sumOf(ms)
  const { t, o, merged } = blocksOf(start, ms, add)
  const usedT = ms.filter((m) => !m.brk && Math.abs(m.d) % 10 === 0).reduce((s, m) => s + Math.abs(m.d) / 10, 0)
  const usedO = ms.filter((m) => !m.brk && Math.abs(m.d) % 10 !== 0).reduce((s, m) => s + Math.abs(m.d), 0)
  const remT = Math.floor(b / 10) - usedT
  const remO = (b % 10) - usedO
  const gone = start - v
  const pill = 'rounded-xl bg-white px-2 py-1 text-xs font-black text-ink shadow-[0_2px_0_#cbd5e1] ring-2 ring-line'
  const numArea = (
    <Drop dnd={dnd} id="num" className="flex flex-col items-center gap-1 rounded-2xl bg-sky-50/70 p-2 ring-1 ring-sky-200">
      <p className="text-4xl font-black text-sky-800 tabular-nums">{n(v)}</p>
      <p className="text-xs font-black text-ink-soft">{t} onluk · {o} birlik</p>
      {add ? (
        <Bars t={t} o={o} u={u} />
      ) : (
        <div className="flex w-full flex-wrap items-end justify-center gap-3">
          {t > 0 && !lock ? (
            <Drag dnd={dnd} item="v-ten" label="Sayıdan 1 onluk" ghost={<Block e={1} size={u + 2} />} className="flex min-h-28 min-w-16 flex-col items-center justify-end gap-1 rounded-xl p-1.5">
              <span className="flex flex-wrap items-end gap-[3px]">{Array.from({ length: t }, (_, i) => <Block key={i} e={1} size={u} />)}</span>
              <span className="text-[10px] font-black text-green-700">onluklar</span>
            </Drag>
          ) : (
            <span className="flex flex-wrap items-end gap-[3px]">{Array.from({ length: t }, (_, i) => <Block key={i} e={1} size={u} />)}</span>
          )}
          <Drop dnd={dnd} id="ones" className="flex min-h-28 min-w-20 flex-col items-center justify-end gap-1 rounded-xl border-2 border-dashed border-yellow-300 p-1.5">
            {o > 0 && !lock ? (
              <Drag dnd={dnd} item="v-one" label="Sayıdan 1 birlik" ghost={<Block e={0} size={u + 4} />} className="flex min-h-16 min-w-16 flex-col items-center justify-end gap-1 rounded-xl p-1">
                <span className="grid grid-flow-col grid-rows-5 gap-[3px]">{Array.from({ length: o }, (_, i) => <Block key={i} e={0} size={u + 2} />)}</span>
              </Drag>
            ) : (
              <span className="grid grid-flow-col grid-rows-5 gap-[3px]">{Array.from({ length: o }, (_, i) => <Block key={i} e={0} size={u + 2} />)}</span>
            )}
            <span className="text-[10px] font-black text-yellow-700">birlikler</span>
          </Drop>
        </div>
      )}
      {merged && <p className="rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-black text-white animate-pop">10 birlik → 1 onluk!</p>}
    </Drop>
  )
  if (add)
    return (
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {numArea}
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-2 ring-1 ring-line">
          <p className="text-sm font-black text-ink">+ {ek(b, 'gen')} blokları</p>
          <div className="flex flex-wrap items-end justify-center gap-3">
            {remT > 0 && (
              <div className="flex flex-col items-center gap-1">
                <Drag dnd={dnd} item="b-ten" label={`${ek(b, 'abl')} 1 onluk`} disabled={lock} ghost={<Block e={1} size={u + 2} />} className="flex min-h-28 min-w-16 items-end justify-center gap-[3px] rounded-xl p-1.5 ring-1 ring-green-200">
                  {Array.from({ length: remT }, (_, i) => <Block key={i} e={1} size={u} />)}
                </Drag>
                {remT > 1 && <Drag dnd={dnd} item="b-tens" label={`${remT} onluğun hepsi`} disabled={lock} className={pill}>{remT} onluk birden</Drag>}
              </div>
            )}
            {remO > 0 && (
              <div className="flex flex-col items-center gap-1">
                <Drag dnd={dnd} item="b-one" label={`${ek(b, 'abl')} 1 birlik`} disabled={lock} ghost={<Block e={0} size={u + 4} />} className="flex min-h-28 min-w-16 items-end justify-center rounded-xl p-1.5 ring-1 ring-yellow-200">
                  <span className="grid grid-flow-col grid-rows-5 gap-[3px]">{Array.from({ length: remO }, (_, i) => <Block key={i} e={0} size={u + 2} />)}</span>
                </Drag>
                {remO > 1 && <Drag dnd={dnd} item="b-ones" label={`${remO} birliğin hepsi`} disabled={lock} className={pill}>{remO} birlik birden</Drag>}
              </div>
            )}
            {remT <= 0 && remO <= 0 && <p className="py-6 text-sm font-black text-emerald-700">Bütün bloklar eklendi ✓</p>}
          </div>
        </div>
      </div>
    )
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
      {numArea}
      <Drop dnd={dnd} id="gone" className="flex min-h-28 flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-2 sm:w-36">
        <p className="text-sm font-black text-slate-600">👋 Gidenler</p>
        <p className="text-3xl font-black text-slate-600 tabular-nums">{n(gone)}</p>
        <p className="text-xs font-bold text-slate-500">− {n(b)} olmalı</p>
      </Drop>
    </div>
  )
}

/* ───────────── yüzlük tablo ───────────── */

const center = (v: number) => [((v - 1) % 10) + 0.5, Math.floor((v - 1) / 10) + 0.5] as const

/** Bir zıplamanın geçtiği hücreler (satır atlayınca çizgi kesilir) */
function pathOf(from: number, d: number): [number, number][][] {
  const segs: [number, number][][] = []
  const step = Math.abs(d) % 10 === 0 ? Math.sign(d) * 10 : Math.sign(d)
  /** İz rakamların üstünden geçmesin: birlik zıplamaları altı çizili gibi, onluk zıplamaları hücrenin sağından */
  const off = (v: number): [number, number] => {
    const [x, y] = center(v)
    return Math.abs(step) === 1 ? [x, y + 0.3] : [x + 0.33, y]
  }
  let cur: [number, number][] = [off(from)]
  for (let v = from + step; step > 0 ? v <= from + d : v >= from + d; v += step) {
    const prev = v - step
    if (Math.abs(step) === 1 && Math.floor((prev - 1) / 10) !== Math.floor((v - 1) / 10)) {
      segs.push(cur)
      cur = []
    }
    cur.push(off(v))
  }
  segs.push(cur)
  return segs
}

/** Bir zıplama geçerli mi? Aynı sütun: onluklar; 10’dan az fark: birlikler (satır sonundan sonraki satıra geçer) */
export function chartJump(from: number, to: number): number | string {
  const d = to - from
  if (!d) return 0
  if (d % 10 === 0) return d
  if (Math.abs(d) < 10) return d
  return 'Bir zıplamada ya yalnızca aşağı-yukarı (onluklar) ya da yalnızca sağa-sola (birlikler) git. Önce onlukları, sonra birlikleri dene.'
}

const JCOL = ['#7c3aed', '#db2777', '#0891b2', '#ea580c', '#16a34a', '#ca8a04']

/**
 * İşaret (🐸) parmakla sürüklenir; bırakılan hücreye bir zıplama yapılır. Dokun-dokun yolu: işarete, sonra hücreye dokun.
 * Pointer Events, touch-action: none ve setPointerCapture ile (sayfa kaymasın).
 */
export function Chart({ start, ms, onMove, lock, target }: { start: number; ms: Mv[]; onMove: (to: number) => void; lock?: boolean; target?: number | null }) {
  const grid = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ x: number; y: number; over: number | null; moved: boolean; id: number; sx: number; sy: number } | null>(null)
  const [held, setHeld] = useState(false)
  const v = start + sumOf(ms)
  const visited = new Set<number>([start])
  let cur = start
  const jumps = ms.filter((m) => !m.brk).map((m) => {
    const j = { from: cur, d: m.d, segs: pathOf(cur, m.d) }
    for (let k = 1; k <= Math.abs(m.d); k += Math.abs(m.d) % 10 === 0 ? 10 : 1) visited.add(cur + Math.sign(m.d) * k)
    cur += m.d
    visited.add(cur)
    return j
  })
  const cellAt = (x: number, y: number) => {
    const r = grid.current?.getBoundingClientRect()
    if (!r) return null
    const c = Math.floor(((x - r.left) / r.width) * 10)
    const w = Math.floor(((y - r.top) / r.height) * 10)
    if (c < 0 || c > 9 || w < 0 || w > 9) return null
    return w * 10 + c + 1
  }
  const [cx, cy] = center(v)
  const down = (ev: ReactPointerEvent) => {
    if (lock || ev.button > 0) return
    ev.currentTarget.setPointerCapture(ev.pointerId)
    setDrag({ x: ev.clientX, y: ev.clientY, over: v, moved: false, id: ev.pointerId, sx: ev.clientX, sy: ev.clientY })
  }
  const move = (ev: ReactPointerEvent) => {
    if (!drag || drag.id !== ev.pointerId) return
    const moved = drag.moved || Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) > 6
    setDrag({ ...drag, x: ev.clientX, y: ev.clientY, over: cellAt(ev.clientX, ev.clientY), moved })
  }
  const up = (ev: ReactPointerEvent) => {
    if (!drag) return
    const to = cellAt(ev.clientX, ev.clientY)
    const moved = drag.moved
    setDrag(null)
    if (!moved) {
      setHeld((h) => !h)
      return
    }
    setHeld(false)
    if (to && to !== v) onMove(to)
  }
  return (
    <div className="mx-auto w-full max-w-[520px]">
      <div ref={grid} className="relative grid grid-cols-10 overflow-hidden rounded-xl bg-white ring-2 ring-slate-300">
        {Array.from({ length: 100 }, (_, i) => {
          const k = i + 1
          const on = visited.has(k)
          const isOver = drag?.moved && drag.over === k
          return (
            <button
              key={k}
              type="button"
              tabIndex={held ? 0 : -1}
              onClick={() => {
                if (!held || lock) return
                setHeld(false)
                if (k !== v) onMove(k)
              }}
              className={`grid aspect-square place-items-center border-r border-b border-slate-200 text-[11px] font-extrabold tabular-nums sm:text-sm ${isOver ? 'bg-sky-200 text-sky-900' : k === target ? 'bg-amber-100 text-amber-800' : on ? 'bg-violet-50 text-violet-900' : 'text-slate-500'} ${k % 10 === 0 ? 'border-r-0' : ''} ${(k - 1) % 10 === 4 ? 'border-r-slate-400' : ''} ${k > 50 && k <= 60 ? '' : ''} ${held ? 'cursor-pointer hover:bg-sky-100' : ''}`}
            >
              {k}
            </button>
          )
        })}
        <svg viewBox="0 0 10 10" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
          {jumps.map((j, i) =>
            j.segs.map((s, si) => (
              <polyline key={`${i}-${si}`} points={s.map((p) => p.join(',')).join(' ')} fill="none" stroke={JCOL[i % JCOL.length]} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={0.85} />
            )),
          )}
          {jumps.map((j, i) => {
            const s = j.segs[j.segs.length - 1]
            const [x, y] = s[s.length - 1]
            return <circle key={i} cx={x} cy={y} r={0.1} fill={JCOL[i % JCOL.length]} />
          })}
          <circle cx={center(start)[0]} cy={center(start)[1]} r={0.42} fill="none" stroke="#0f172a" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
        {jumps.map((j, i) => {
          const s = j.segs.reduce((m, x) => (x.length > m.length ? x : m), j.segs[0])
          const [x, y] = s.length > 1 ? [(s[0][0] + s[s.length - 1][0]) / 2, (s[0][1] + s[s.length - 1][1]) / 2] : center(j.from)
          return (
            <span key={i} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-md px-1 text-[11px] font-black text-white shadow sm:text-xs" style={{ left: `${x * 10}%`, top: `${y * 10}%`, background: JCOL[i % JCOL.length] }}>{signed(j.d)}</span>
          )
        })}
        <button
          type="button"
          aria-label={`İşaret ${v} üzerinde. Sürükle ya da dokunup bir hücreye dokun.`}
          aria-pressed={held}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={() => setDrag(null)}
          onContextMenu={(e) => e.preventDefault()}
          className={`absolute z-10 grid size-[10%] -translate-x-1/2 -translate-y-1/2 touch-none place-items-center transition-[left,top] duration-300 select-none [-webkit-touch-callout:none] ${lock ? '' : 'cursor-grab'} ${drag?.moved ? 'opacity-30' : ''}`}
          style={{ left: `${cx * 10}%`, top: `${cy * 10}%` }}
        >
          <span className={`absolute -inset-1.5 rounded-full ${held ? 'ring-4 ring-sky-500' : ''}`} />
          <span className={`grid size-[115%] place-items-center rounded-full bg-emerald-500 text-[clamp(14px,3.6vw,22px)] leading-none shadow-lg ring-[3px] ring-white ${lock ? '' : 'animate-pop'}`} key={v}>🐸</span>
        </button>
      </div>
      {drag?.moved &&
        createPortal(
          <span className="pointer-events-none fixed z-[1000] grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-emerald-500 text-2xl shadow-xl ring-4 ring-white" style={{ left: drag.x, top: drag.y }}>
            🐸
            {drag.over && drag.over !== v && (
              <span className="absolute -top-8 rounded-lg bg-slate-900 px-2 py-0.5 text-sm font-black whitespace-nowrap text-white">{typeof chartJump(v, drag.over) === 'number' ? signed(chartJump(v, drag.over) as number) : '?'}</span>
            )}
          </span>,
          document.body,
        )}
      {held &&
        createPortal(
          <div className="fixed inset-x-3 bottom-3 z-[999] mx-auto flex max-w-md items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-extrabold text-white shadow-xl animate-fade-up" role="status">
            <Hand size={18} className="shrink-0" />
            <span>Kurbağa elinde. Zıplayacağı sayıya dokun.</span>
          </div>,
          document.body,
        )}
    </div>
  )
}

/* ───────────── boş sayı doğrusu ───────────── */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(600)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/** Zıplama kartı yayları: + zıplamalar doğrunun üstünde, − zıplamalar altında; varılan sayılar yazılır */
export function Line({ start, ms, dnd, target }: { start: number; ms: Mv[]; dnd: Dnd; target?: number | null }) {
  const [ref, W] = useWidth<HTMLDivElement>()
  const pts = [start]
  for (const m of ms) if (!m.brk) pts.push(pts[pts.length - 1] + m.d)
  const all = [...pts, ...(target != null ? [target] : [])]
  let lo = Math.min(...all), hi = Math.max(...all)
  const span = Math.max(hi - lo, 20)
  const pad = span * 0.07 + 1
  lo -= pad
  hi += pad
  const L = 18, R = W - 18
  const X = (v: number) => L + ((v - lo) / (hi - lo)) * (R - L)
  const negs = pts.slice(1).some((p, i) => p < pts[i])
  const ups = pts.slice(1).some((p, i) => p > pts[i])
  /** Yalnızca geri zıplama varsa üstte boşluk bırakma */
  const Y = ups || target != null || !negs ? 112 : 30
  const H = Y + 60
  const labels = pts.map((v, i) => ({ v, i, x: X(v) })).sort((a, b) => a.x - b.x)
  const level: Record<number, number> = {}
  let lastX = -999, lastL = 1
  for (const l of labels) {
    if (level[l.v] !== undefined) continue
    const lv = l.x - lastX < 40 ? 1 - lastL : 0
    level[l.v] = lv
    lastX = l.x
    lastL = lv
  }
  return (
    <Drop dnd={dnd} id="line" className="rounded-2xl bg-white ring-1 ring-line">
      <div ref={ref} className="w-full">
        <svg width={W} height={negs ? H + 50 : H} className="block" role="img" aria-label={`Boş sayı doğrusu: ${pts.map((p) => n(p)).join(', ')}`}>
          <line x1={8} x2={W - 8} y1={Y} y2={Y} stroke="#334155" strokeWidth={4} strokeLinecap="round" />
          {target != null && (
            <g>
              <line x1={X(target)} x2={X(target)} y1={Y - 100} y2={Y + 8} stroke="#d97706" strokeWidth={2} strokeDasharray="5 4" />
              <text x={X(target)} y={18} textAnchor="middle" fontSize={16} fontWeight={900} fill="#b45309">🏁 {n(target)}</text>
            </g>
          )}
          {pts.slice(1).map((p, i) => {
            const a = X(pts[i]), b = X(p)
            const up = p > pts[i]
            const h = up ? Math.max(18, Math.min(78, Math.abs(b - a) * 0.45)) : Math.max(46, Math.min(56, Math.abs(b - a) * 0.45))
            const c = JCOL[i % JCOL.length]
            const my = up ? Y - 2 * h : Y + 2 * h
            const ly = up ? Y - h - 8 : Y + h + 24
            const d = p - pts[i]
            return (
              <g key={i} className="animate-fade-up">
                <path d={`M${a} ${Y} Q${(a + b) / 2} ${my} ${b} ${Y}`} fill="none" stroke={c} strokeWidth={3.5} />
                <path d={`M${b} ${Y} l${up ? (b > a ? -9 : 9) : b > a ? -9 : 9} ${up ? -6 : 6}`} stroke={c} strokeWidth={3.5} strokeLinecap="round" />
                <rect x={(a + b) / 2 - 22} y={ly - 15} width={44} height={21} rx={7} fill={c} />
                <text x={(a + b) / 2} y={ly} textAnchor="middle" fontSize={15} fontWeight={900} fill="#fff">{signed(d)}</text>
              </g>
            )
          })}
          {[...new Set(pts)].map((v) => {
            const x = X(v)
            const lv = level[v] ?? 0
            const first = v === start
            const end = v === pts[pts.length - 1]
            return (
              <g key={v}>
                <line x1={x} x2={x} y1={Y - 9} y2={Y + 9} stroke="#334155" strokeWidth={3} />
                <rect x={x - 22} y={Y + 13 + lv * 22} width={44} height={22} rx={6} fill={end && pts.length > 1 ? '#059669' : first ? '#0f172a' : '#fff'} stroke="#cbd5e1" />
                <text x={x} y={Y + 29 + lv * 22} textAnchor="middle" fontSize={15} fontWeight={900} fill={(end && pts.length > 1) || first ? '#fff' : '#334155'}>{n(v)}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </Drop>
  )
}

export function JumpCards({ cards, dnd, disabled }: { cards: number[]; dnd: Dnd; disabled?: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-2.5 ring-1 ring-line">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-black tracking-wide text-ink-soft uppercase"><Hand size={14} />Zıplama kartları · doğruya sürükle</p>
      <div className="flex flex-wrap gap-2">
        {cards.map((d) => (
          <Drag key={d} dnd={dnd} item={`j:${d}`} label={`${signed(d)} zıplama kartı`} disabled={disabled} className={`grid min-h-14 min-w-16 place-items-center rounded-2xl px-2.5 text-2xl font-black shadow-[0_3px_0_#cbd5e1] ring-2 ${d < 0 ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-white text-violet-700 ring-violet-200'}`}>
            {signed(d)}
          </Drag>
        ))}
      </div>
    </div>
  )
}

/* ───────────── düğmeler ───────────── */

export function Tools({ onUndo, onReset, disabled }: { onUndo: () => void; onReset: () => void; disabled?: boolean }) {
  const b = 'inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-black text-ink shadow-[0_3px_0_#cbd5e1] ring-2 ring-line active:translate-y-0.5 disabled:opacity-40'
  return (
    <div className="flex justify-center gap-2">
      <button type="button" onClick={onUndo} disabled={disabled} className={b}><Undo2 size={17} />Geri al</button>
      <button type="button" onClick={onReset} disabled={disabled} className={b}><RotateCcw size={17} />Baştan</button>
    </div>
  )
}

/** İşlem satırı: “46 + 27 = ?” (cevap bulununca yeşil) */
export function Problem({ a, b, op, value, done }: { a: number; b: number; op: '+' | '−'; value?: number | null; done?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-white/90 px-3 py-2 text-4xl font-black text-ink tabular-nums ring-1 ring-line">
      <span>{n(a)}</span><span>{op}</span><span>{n(b)}</span><span>=</span>
      <span className={`grid h-14 min-w-20 place-items-center rounded-2xl px-2 ${done ? 'bg-emerald-500 text-white animate-pop' : 'border-[3px] border-dashed border-slate-300 text-slate-300'}`}>{done && value != null ? n(value) : '?'}</span>
    </div>
  )
}

/* ───────────── “Nasıl kullanılır?” araçları ───────────── */

export const TOOL: Record<'blocks' | 'gone' | 'frog' | 'jump' | 'undo' | 'sort' | 'model' | 'label', ToolInfo> = {
  blocks: { icon: <span className="flex items-end gap-0.5"><span className="h-5 w-1.5 rounded-[1px] bg-green-500 ring-1 ring-green-700" /><span className="size-2 rounded-[1px] bg-yellow-400 ring-1 ring-yellow-700" /></span>, name: 'Taban blokları', text: 'İkinci sayının onluk çubuğunu ya da birlik küpünü tutup sayıya sürükle. “… birden” kartı hepsini birlikte taşır.' },
  gone: { icon: <span className="text-base leading-none">👋</span>, name: 'Gidenler', text: 'Çıkarmada sayının onluk ya da birliğini Gidenler’e sürükle. Birlik yetmezse bir onluğu birlikler alanına sürükleyip boz.' },
  frog: { icon: <span className="text-base leading-none">🐸</span>, name: 'Yüzlük tabloda kurbağa', text: 'Kurbağayı tutup bir sayıya sürükle. Aşağı bir satır +10, sağa bir kare +1. Her zıplama renkli bir iz bırakır.' },
  jump: { icon: <span className="rounded-md bg-white px-1 text-xs font-black text-violet-700 ring-1 ring-violet-200">+10</span>, name: 'Zıplama kartları', text: 'Bir kartı tutup sayı doğrusunun üstüne bırak: doğru üzerinde bir yay çizilir ve vardığın sayı yazılır.' },
  undo: { icon: <Undo2 size={16} />, name: 'Geri al / Baştan', text: 'Son zıplamayı geri alır ya da hepsini siler.' },
  sort: { icon: <span className="text-base leading-none">🧺</span>, name: 'İşlem kartları ve sepetler', text: 'Her işlem kartını, onu en kolay çözeceğin stratejinin sepetine sürükle.' },
  model: { icon: <span className="text-base leading-none">🧰</span>, name: 'Model seçimi', text: 'Bloklar, yüzlük tablo ya da sayı doğrusundan birini seç. Sonra istediğin gibi çöz.' },
  label: { icon: <span className="rounded-md bg-amber-100 px-1 text-[10px] font-black text-amber-800 ring-1 ring-amber-300">Yolum</span>, name: 'Strateji kartları', text: 'Çözünce yolunu anlatan strateji kartını “Benim yolum” kutusuna sürükle.' },
}

/** Zıplama kartları üretimi: istenen stratejiler mümkün, kestirme (tek kart) yok */
export function uniq(xs: number[]) {
  return [...new Set(xs.filter((x) => x !== 0))].sort((a, b) => (Math.sign(a) - Math.sign(b)) * 1000 + Math.abs(a) - Math.abs(b))
}

export function useStable<T>(f: () => T) {
  const [v] = useState(f)
  return v
}

/** Görünür olunca bir kez kaydırma (dar ekran) */
export function useScrollOnce(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || window.innerWidth >= 1024) return
    const id = window.setTimeout(() => {
      const r = el.getBoundingClientRect()
      if (r.top < 70 || r.bottom > window.innerHeight) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 250)
    return () => window.clearTimeout(id)
  }, [dep])
  return ref
}

/* ───────────── sayılara Türkçe ek ───────────── */

const WORD: Record<number, string> = { 0: 'sıfır', 1: 'bir', 2: 'iki', 3: 'üç', 4: 'dört', 5: 'beş', 6: 'altı', 7: 'yedi', 8: 'sekiz', 9: 'dokuz', 10: 'on', 20: 'yirmi', 30: 'otuz', 40: 'kırk', 50: 'elli', 60: 'altmış', 70: 'yetmiş', 80: 'seksen', 90: 'doksan' }
/** Sayının okunuşundaki son sözcük: 46 → “altı”, 40 → “kırk”, 300 → “yüz”, 2000 → “bin” */
function lastWord(v: number) {
  v = Math.abs(v)
  if (v % 10) return WORD[v % 10]
  if (v % 100) return WORD[v % 100]
  if (v % 1000) return 'yüz'
  return v ? 'bin' : 'sıfır'
}
/**
 * Sayıya kesme işaretiyle ek: ek(46, 'dat') → “46’ya”, ek(27, 'acc') → “27’yi”, ek(48, 'abl') → “48’den”.
 * dat: -e/-a · abl: -den/-dan/-ten/-tan · loc: -de/-da/-te/-ta · gen: -in/-ın/-un/-ün · acc: -i/-ı/-u/-ü
 */
export function ek(v: number, k: 'dat' | 'abl' | 'loc' | 'gen' | 'acc') {
  const w = lastWord(v)
  const vow = [...w].reverse().find((c) => 'aeıioöuü'.includes(c)) ?? 'e'
  const endV = 'aeıioöuü'.includes(w[w.length - 1])
  const hard = 'çfhkpsşt'.includes(w[w.length - 1])
  const back = 'aıou'.includes(vow)
  const four = 'ei'.includes(vow) ? 'i' : 'öü'.includes(vow) ? 'ü' : 'aı'.includes(vow) ? 'ı' : 'u'
  const two = back ? 'a' : 'e'
  const s = k === 'dat' ? (endV ? 'y' : '') + two : k === 'abl' ? (hard ? 't' : 'd') + two + 'n' : k === 'loc' ? (hard ? 't' : 'd') + two : k === 'gen' ? (endV ? 'n' : '') + four + 'n' : (endV ? 'y' : '') + four
  return `${n(v)}’${s}`
}
