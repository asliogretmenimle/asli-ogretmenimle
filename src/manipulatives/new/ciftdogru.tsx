import { useEffect, useRef, useState } from 'react'
import { Maximize2, Minus, Plus, Trash2 } from 'lucide-react'
import { MathText } from '../../components/MathText'
import { clamp, fmtTick, niceStep, ticks } from '../../interactive/axis'
import { Stepper, ToolButton } from '../ui'
import { n, type ToolDef } from '../types'

/**
 * Çift Sayı Doğrusu — iki ölçek, tek konum: üstteki her değer alttaki karşılığıyla aynı dikey çizgide.
 *  - Temel eşleme (ör. 3 km ↔ 2 dk) pembe "paket" çentikleriyle tekrar eder: 6 ↔ 4, 9 ↔ 6…
 *  - İki parmakla yakınlaştır: iki doğru birlikte büyür, çentikler 1 → 0,5 → 0,1 diye incelir.
 *  - Boş yere dokun ya da “İşaret ekle”: bağlantılı bir işaret koy; tutamacından sürükle.
 *  - “1 km nerede?” / “1 dk nerede?”: birim oranı keşfet.
 *
 * Görev hedefi (target):
 *   { t: 3, b: 2, pairs: [{ top: 12, bottom: 8 }], ask?: 'bottom' | 'top' }
 *   ya da tek eşleme için { t: 3, b: 2, top: 12, bottom: 8 }.
 *   t:b temel eşleme (gösterilir). Öğrenci her çift için verilen taraftaki değere bir işaret koyar ve
 *   sorulan taraftaki karşılığını yazar. Görevde sorulan doğrunun etiketleri (0 ve temel değer dışında) gizlenir.
 */

type Pin = { x: number; ans?: string }
type V = { t: number; b: number; ctx: number; pins: Pin[]; sel: number }

const CTX = [
  { tn: 'Yol', tu: 'km', bn: 'Süre', bu: 'dk', t: 3, b: 2 },
  { tn: 'Elma', tu: 'kg', bn: 'Fiyat', bu: 'TL', t: 2, b: 30 },
  { tn: 'Yüzde', tu: '%', bn: 'Öğrenci', bu: 'kişi', t: 100, b: 40 },
  { tn: 'Harita', tu: 'cm', bn: 'Gerçek', bu: 'km', t: 1, b: 25 },
  { tn: 'Limon', tu: 'tane', bn: 'Su', bu: 'bardak', t: 2, b: 5 },
]
const ROSE = '#d6457a', ROSE_INK = '#a92f5c', SKY = '#0ea5e9', SKY_INK = '#0369a1', INK = '#1f2340'
const r4 = (v: number) => Math.round(v * 1e4) / 1e4
const fmt = (v: number) => r4(v).toLocaleString('tr-TR', { maximumFractionDigits: 2 })
const isClean = (v: number) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
/** Küçük paydalı kesir gösterimi: 0,666… → [[2/3]] */
function fracText(v: number): string {
  if (isClean(v)) return fmt(v)
  for (let d = 2; d <= 24; d++) {
    const nu = Math.round(v * d)
    if (Math.abs(nu / d - v) < 1e-7) {
      const g = gcd(nu, d)
      const N = nu / g, D = d / g, w = Math.floor(N / D)
      return w > 0 ? `[[${w} ${N - w * D}/${D}]]` : `[[${N}/${D}]]`
    }
  }
  return `≈ ${fmt(v)}`
}

type Ctx = (typeof CTX)[number]

function DoubleLine({ value, onChange, ctx, locked, hideTop, hideBottom }: { value: V; onChange: (v: V) => void; ctx: Ctx; locked?: boolean; hideTop: boolean; hideBottom: boolean }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(600)
  const H = 250
  const yT = 92, yB = 168
  const init = () => ({ min: -value.t * 0.25, max: value.t * 4.4 })
  const [view, setView] = useState(init)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(Math.max(260, el.clientWidth)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const key = `${value.t}:${value.b}`
  const lastKey = useRef(key)
  useEffect(() => {
    if (lastKey.current !== key) {
      lastKey.current = key
      setView(init())
    }
  })

  const PADL = 8
  const ppu = (W - PADL * 2) / (view.max - view.min)
  const sx = (x: number) => PADL + (x - view.min) * ppu
  const ix = (px: number) => view.min + (px - PADL) / ppu
  const k = value.b / value.t // alt = üst × k
  const topStep = niceStep(view.max - view.min, W, 64)
  const botStep = niceStep((view.max - view.min) * k, W, 64)
  const topTicks = ticks(view.min, view.max, topStep).filter((v) => v >= -1e-9)
  const botTicks = ticks(view.min * k, view.max * k, botStep).filter((v) => v >= -1e-9)
  // paket (temel eşleme) çentikleri
  const every = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find((m) => value.t * m * ppu >= 46) ?? 1000
  const batches: number[] = []
  for (let i = Math.max(0, Math.ceil(view.min / value.t)); i * value.t <= view.max + 1e-9 && batches.length < 200; i++) if (i % every === 0) batches.push(i)

  const svgX = (clientX: number) => {
    const r = wrap.current!.getBoundingClientRect()
    return ((clientX - r.left) / r.width) * W
  }
  /** sürükleme sırasında yapışma: görünür çentiklere (14 px), yoksa adıma göre yuvarla */
  const snapX = (px: number) => {
    const x = ix(px)
    const cands = [...topTicks, ...botTicks.map((v) => v / k), ...batches.map((i) => i * value.t)]
    let best = x, bd = 14
    for (const c of cands) {
      const d = Math.abs(sx(c) - px)
      if (d < bd) { bd = d; best = c }
    }
    if (best === x) best = Math.round(x / (topStep / 10)) * (topStep / 10)
    return Math.max(0, r4(best))
  }

  const ptrs = useRef(new Map<number, { x: number; y: number }>())
  const g = useRef<{ mode: 'pan' | 'pin' | 'pinch' | null; pin?: number; moved: boolean; startX: number; d0?: number; v0?: { min: number; max: number }; mid?: number }>({ mode: null, moved: false, startX: 0 })

  const onDown = (e: React.PointerEvent) => {
    wrap.current!.setPointerCapture(e.pointerId)
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const target = (e.target as Element).closest('[data-pin]')
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()]
      g.current = { mode: 'pinch', moved: true, startX: 0, d0: Math.hypot(a.x - b.x, a.y - b.y), v0: view, mid: ix(svgX((a.x + b.x) / 2)) }
      return
    }
    if (target && !locked) {
      const i = Number(target.getAttribute('data-pin'))
      g.current = { mode: 'pin', pin: i, moved: false, startX: e.clientX }
      if (value.sel !== i) onChange({ ...value, sel: i })
      return
    }
    g.current = { mode: 'pan', moved: false, startX: e.clientX }
  }
  const onMove = (e: React.PointerEvent) => {
    const prev = ptrs.current.get(e.pointerId)
    if (!prev) return
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const s = g.current
    if (s.mode === 'pinch' && ptrs.current.size >= 2 && s.v0 && s.d0 && s.mid !== undefined) {
      const [a, b] = [...ptrs.current.values()]
      const f = Math.hypot(a.x - b.x, a.y - b.y) / s.d0
      const span = clamp((s.v0.max - s.v0.min) / f, value.t * 0.05, value.t * 400)
      // iki parmağın ortasındaki değer parmakların altında kalsın
      const ratio = clamp((svgX((a.x + b.x) / 2) - PADL) / (W - 2 * PADL), 0, 1)
      setView({ min: s.mid - ratio * span, max: s.mid + (1 - ratio) * span })
      return
    }
    if (Math.abs(e.clientX - s.startX) > 4) s.moved = true
    if (s.mode === 'pin' && s.pin !== undefined && s.moved) {
      const pins = value.pins.map((p, i) => (i === s.pin ? { ...p, x: snapX(svgX(e.clientX)) } : p))
      onChange({ ...value, pins })
    } else if (s.mode === 'pan' && s.moved) {
      const r = wrap.current!.getBoundingClientRect()
      const dx = ((e.clientX - prev.x) / r.width) * W / ppu
      setView((v) => ({ min: v.min - dx, max: v.max - dx }))
    }
  }
  const onUp = (e: React.PointerEvent) => {
    ptrs.current.delete(e.pointerId)
    const s = g.current
    if (s.mode === 'pan' && !s.moved && !locked && value.pins.length < 8) {
      const x = snapX(svgX(e.clientX))
      onChange({ ...value, pins: [...value.pins, { x }], sel: value.pins.length })
    }
    if (ptrs.current.size === 0) g.current = { mode: null, moved: false, startX: 0 }
    else if (s.mode === 'pinch') g.current = { mode: 'pan', moved: true, startX: 0 }
  }
  const zoom = (f: number) => setView((v) => { const c = (v.min + v.max) / 2, h = clamp((v.max - v.min) / f, value.t * 0.05, value.t * 400) / 2; return { min: c - h, max: c + h } })

  const lbl = (x: number, y: number, txt: string, color: string, size = 14, weight = 800) => (
    <text x={x} y={y} textAnchor="middle" fontSize={size} fontWeight={weight} fill={color}>{txt}</text>
  )
  const near = (px: number) => batches.some((i) => Math.abs(sx(i * value.t) - px) < 26)
  const showTopLabel = (v: number) => !hideTop || Math.abs(v) < 1e-9 || Math.abs(v - value.t) < 1e-9
  const showBotLabel = (v: number) => !hideBottom || Math.abs(v) < 1e-9 || Math.abs(v - value.b) < 1e-9

  return (
    <div className="relative">
      <div
        ref={wrap}
        className="relative overflow-hidden rounded-2xl bg-white ring-1 ring-line"
        style={{ touchAction: 'none', cursor: 'grab' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={(e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoom(Math.exp(-e.deltaY * 0.003)) } }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="block select-none" role="img" aria-label="Çift sayı doğrusu">
          <rect x={0} y={yT + 12} width={W} height={yB - yT - 24} fill="#fbf7f6" />
          {/* paket bağlantıları */}
          {batches.map((i) => (
            <line key={`bl${i}`} x1={sx(i * value.t)} x2={sx(i * value.t)} y1={yT} y2={yB} stroke={ROSE} strokeWidth={1.5} strokeDasharray="4 5" opacity={0.55} />
          ))}
          {/* doğrular */}
          <line x1={0} x2={W} y1={yT} y2={yT} stroke={INK} strokeWidth={3} />
          <line x1={0} x2={W} y1={yB} y2={yB} stroke={INK} strokeWidth={3} />
          {/* nötr çentikler */}
          {topTicks.map((v) => (
            <g key={`t${v}`}>
              <line x1={sx(v)} x2={sx(v)} y1={yT - 7} y2={yT + 7} stroke={INK} strokeWidth={1.6} />
              {!near(sx(v)) && showTopLabel(v) && lbl(sx(v), yT - 14, fmtTick(v, topStep), '#5b6080', 13)}
            </g>
          ))}
          {botTicks.map((v) => (
            <g key={`b${v}`}>
              <line x1={sx(v / k)} x2={sx(v / k)} y1={yB - 7} y2={yB + 7} stroke={INK} strokeWidth={1.6} />
              {!near(sx(v / k)) && showBotLabel(v) && lbl(sx(v / k), yB + 25, fmtTick(v, botStep), '#5b6080', 13)}
            </g>
          ))}
          {/* paket çentikleri */}
          {batches.map((i) => {
            const X = sx(i * value.t)
            return (
              <g key={`bt${i}`}>
                <line x1={X} x2={X} y1={yT - 11} y2={yT + 11} stroke={ROSE} strokeWidth={3} strokeLinecap="round" />
                <line x1={X} x2={X} y1={yB - 11} y2={yB + 11} stroke={ROSE} strokeWidth={3} strokeLinecap="round" />
                {showTopLabel(i * value.t) && lbl(X, yT - 16, fmt(i * value.t), ROSE_INK, 15, 900)}
                {showBotLabel(i * value.b) && lbl(X, yB + 29, fmt(i * value.b), ROSE_INK, 15, 900)}
              </g>
            )
          })}
          {/* birim adları */}
          <g>
            {[[ctx.tu, yT + 13, ROSE_INK], [ctx.bu, yB - 33, SKY_INK]].map(([u, y, c]) => {
              const w = String(u).length * 8 + 14
              const left = !value.pins.some((p) => sx(p.x) < w + 40)
              const x0 = left ? 6 : W - w - 6
              return (
                <g key={String(u)} pointerEvents="none">
                  <rect x={x0} y={Number(y)} width={w} height={20} rx={10} fill="#fff" stroke="#e7e8f2" />
                  <text x={x0 + 7} y={Number(y) + 14} fontSize={12} fontWeight={900} fill={String(c)}>{u}</text>
                </g>
              )
            })}
          </g>
          {/* işaretler */}
          {value.pins.map((p, i) => {
            const X = sx(p.x)
            if (X < -40 || X > W + 40) return null
            const sel = i === value.sel
            const top = hideTop ? (p.ans?.trim() ? p.ans : '?') : fmt(p.x)
            const bot = hideBottom ? (p.ans?.trim() ? p.ans : '?') : fmt(p.x * k)
            const badge = (y: number, txt: string, color: string) => {
              const w = Math.max(40, txt.length * 9 + 18)
              return (
                <g>
                  <rect x={X - w / 2} y={y - 15} width={w} height={26} rx={13} fill={color} />
                  {lbl(X, y + 3, txt, '#fff', 14, 900)}
                </g>
              )
            }
            return (
              <g key={i} data-pin={i} style={{ cursor: locked ? 'default' : 'ew-resize' }}>
                <g stroke={sel ? SKY : '#7dd3fc'} strokeWidth={sel ? 3.5 : 2.5}>
                  <line x1={X} x2={X} y1={yT - 42} y2={yT - 31} />
                  <line x1={X} x2={X} y1={yT - 9} y2={yB + 9} />
                  <line x1={X} x2={X} y1={yB + 34} y2={yB + 44} />
                </g>
                {badge(yT - 54, top, sel ? SKY_INK : SKY)}
                {badge(yB + 56, bot, sel ? SKY_INK : SKY)}
                <circle cx={X} cy={(yT + yB) / 2} r={26} fill="transparent" />
                <circle cx={X} cy={(yT + yB) / 2} r={sel ? 14 : 12} fill={sel ? SKY_INK : SKY} stroke="#fff" strokeWidth={3} />
                <path d={`M${X - 5} ${(yT + yB) / 2} l-3 0 M${X + 5} ${(yT + yB) / 2} l3 0`} stroke="#fff" strokeWidth={2} />
              </g>
            )
          })}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <div className="flex gap-1">
          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => zoom(1.5)} className="grid size-10 place-items-center rounded-xl bg-white/90 shadow ring-1 ring-line active:scale-95" aria-label="Yakınlaştır"><Plus size={18} /></button>
          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => zoom(1 / 1.5)} className="grid size-10 place-items-center rounded-xl bg-white/90 shadow ring-1 ring-line active:scale-95" aria-label="Uzaklaştır"><Minus size={18} /></button>
          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => setView(init())} className="grid size-10 place-items-center rounded-xl bg-white/90 shadow ring-1 ring-line active:scale-95" aria-label="Başlangıç görünümü"><Maximize2 size={16} /></button>
        </div>
        <p className="max-w-md text-center text-xs font-bold text-ink-soft">İki parmakla iki doğruyu birlikte yakınlaştır; boş yeri sürükleyerek kaydır, dokunarak işaret koy.</p>
      </div>
    </div>
  )
}

function pairsOf(t: Record<string, unknown>): { top: number; bottom: number }[] {
  if (Array.isArray(t.pairs)) return (t.pairs as { top: number; bottom: number }[]).filter((p) => typeof p.top === 'number' && typeof p.bottom === 'number')
  if (typeof t.top === 'number' && typeof t.bottom === 'number') return [{ top: t.top, bottom: t.bottom }]
  return []
}

export const ciftdogru: ToolDef<V> = {
  id: 'ciftdogru',
  defaultConfig: {},
  initial: (_c, t) => (t ? { t: n(t, 't', 3), b: n(t, 'b', 2), ctx: n(t, 'ctx', 0), pins: [], sel: -1 } : { t: 3, b: 2, ctx: 0, pins: [{ x: 6 }], sel: 0 }),
  check: (v, t) => {
    const ask = t.ask === 'top' ? 'top' : 'bottom'
    const k = v.b / v.t
    const pairs = pairsOf(t)
    if (!pairs.length) return false
    return pairs.every((pr) =>
      v.pins.some((p) => {
        const given = ask === 'bottom' ? p.x : p.x * k
        const ans = Number((p.ans ?? '').replace(',', '.'))
        if (!(p.ans ?? '').trim() || !Number.isFinite(ans)) return false
        return ask === 'bottom' ? Math.abs(given - pr.top) < 1e-6 && Math.abs(ans - pr.bottom) < 1e-6 : Math.abs(given - pr.bottom) < 1e-6 && Math.abs(ans - pr.top) < 1e-6
      }),
    )
  },
  Component: ({ value, onChange, target, locked }) => {
    const task = !!target
    const reveal = !task || !!locked
    const ctx = CTX[value.ctx] ?? CTX[0]
    const ask = target?.ask === 'top' ? 'top' : 'bottom'
    const hideTop = task && !locked && ask === 'top'
    const hideBottom = task && !locked && ask === 'bottom'
    const k = value.b / value.t
    const sel = value.pins[value.sel]
    const set = (p: Partial<V>) => onChange({ ...value, ...p })
    const addPin = (x: number) => onChange({ ...value, pins: [...value.pins.filter((p) => Math.abs(p.x - x) > 1e-9), { x }], sel: value.pins.filter((p) => Math.abs(p.x - x) > 1e-9).length })
    const factor = sel ? sel.x / value.t : 0
    return (
      <div className="flex flex-col items-center gap-3">
        {!task && (
          <div className="flex flex-wrap items-end justify-center gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">Durum</span>
              <div className="flex flex-wrap justify-center gap-1">
                {CTX.map((c, i) => <ToolButton key={i} active={value.ctx === i} onClick={() => onChange({ ...value, ctx: i, t: c.t, b: c.b, pins: [], sel: -1 })}>{c.tu} ↔ {c.bu}</ToolButton>)}
              </div>
            </div>
            <div className="flex gap-3">
            <Stepper label={`${ctx.tn} (${ctx.tu})`} value={value.t} onDec={() => set({ t: Math.max(1, value.t - 1) })} onInc={() => set({ t: Math.min(200, value.t + 1) })} />
            <Stepper label={`${ctx.bn} (${ctx.bu})`} value={value.b} color={SKY_INK} onDec={() => set({ b: Math.max(1, value.b - 1) })} onInc={() => set({ b: Math.min(500, value.b + 1) })} />
            </div>
          </div>
        )}
        {task && (
          <p className="rounded-full bg-brand-soft px-4 py-1.5 text-center font-black text-brand-ink">{fmt(value.t)} {ctx.tu} ↔ {fmt(value.b)} {ctx.bu}</p>
        )}
        <div className="w-full max-w-4xl">
          <DoubleLine value={value} onChange={onChange} ctx={ctx} locked={locked} hideTop={hideTop} hideBottom={hideBottom} />
        </div>
        {!locked && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {!task && <ToolButton onClick={() => addPin(1)}>1 {ctx.tu} nerede?</ToolButton>}
            {!task && <ToolButton onClick={() => addPin(r4(value.t / value.b))}>1 {ctx.bu} nerede?</ToolButton>}
            <ToolButton disabled={!sel} onClick={() => onChange({ ...value, pins: value.pins.filter((_, i) => i !== value.sel), sel: -1 })}><Trash2 size={15} /> İşareti sil</ToolButton>
          </div>
        )}
        {task && sel && !locked && (
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-paper p-3 ring-1 ring-line">
            <span className="font-extrabold">
              {ask === 'bottom' ? `${fmt(sel.x)} ${ctx.tu}` : `${fmt(sel.x * k)} ${ctx.bu}`} ↔
            </span>
            <input
              inputMode="decimal"
              aria-label="Karşılık gelen değer"
              placeholder="?"
              value={sel.ans ?? ''}
              onChange={(e) => onChange({ ...value, pins: value.pins.map((p, i) => (i === value.sel ? { ...p, ans: e.target.value.slice(0, 8) } : p)) })}
              className="h-12 w-24 rounded-xl bg-white text-center text-xl font-black text-sky-700 ring-2 ring-sky-300 outline-none focus:ring-sky-500"
            />
            <span className="font-extrabold">{ask === 'bottom' ? ctx.bu : ctx.tu}</span>
          </div>
        )}
        {reveal && (
          <div className="grid w-full max-w-4xl gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-ink px-4 py-3 text-center text-white">
              <p className="text-xs font-extrabold tracking-wide text-white/60 uppercase">Birim oran</p>
              <p className="mt-1 flex flex-wrap items-center justify-center gap-x-1 text-lg font-black">1 {ctx.tu} ↔ <MathText text={fracText(k)} /> {ctx.bu}</p>
              <p className="flex flex-wrap items-center justify-center gap-x-1 font-bold text-white/80">1 {ctx.bu} ↔ <MathText text={fracText(1 / k)} /> {ctx.tu}</p>
            </div>
            <div className="flex flex-col justify-center rounded-2xl bg-sky-50 px-4 py-3 text-center ring-1 ring-sky-200">
              {sel ? (
                <>
                  <p className="flex flex-wrap items-center justify-center gap-x-1 text-lg font-black text-sky-800">
                    <MathText text={fracText(sel.x)} /> {ctx.tu} ↔ <MathText text={fracText(sel.x * k)} /> {ctx.bu}
                  </p>
                  {sel.x > 0 && (
                    <p className="mt-0.5 flex flex-wrap items-center justify-center gap-x-1 text-sm font-extrabold text-ink-soft">
                      İki değer de temel eşlemenin <span className="text-base text-ink"><MathText text={fracText(factor)} /></span> katı: <span className="whitespace-nowrap">{fmt(value.t)} × <MathText text={fracText(factor)} /></span> ve <span className="whitespace-nowrap">{fmt(value.b)} × <MathText text={fracText(factor)} /></span>
                    </p>
                  )}
                </>
              ) : (
                <p className="font-extrabold text-ink-soft">Bir işaret seç ya da doğruya dokunarak yeni işaret koy.</p>
              )}
            </div>
          </div>
        )}
      </div>
    )
  },
}
