import { useCallback, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { useGesture } from '@use-gesture/react'
import { ArrowRight, Flag, Minus, Plus } from 'lucide-react'
import { BigButton, LevelDots, Nudge as KitNudge } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { MathText, renderMath } from '../../components/MathText'

/**
 * Geometri keşifleri (46–51) için ortak parçalar:
 *  - oturum, yerleşim (yatay tablette çalışma alanı solda, panel sağda), başlık, kartlar, düğmeler
 *  - dokunmatik ızgara hareketi (useGridGesture) ve çivili tahta (PegBoard)
 *  - çokgen / birim kare yardımcıları (eşlik anahtarı, alan, çevre, özellikler)
 */

export type Pt = [number, number]

// ─── Oturum ve yerleşim ────────────────────────────────────────────────────

export function useSession(total: number) {
  const [idx, setIdx] = useState(0)
  const [firsts, setFirsts] = useState<boolean[]>([])
  const [done, setDone] = useState(false)
  const doneRef = useRef(false)
  const complete = useCallback((first: boolean) => {
    if (doneRef.current) return
    doneRef.current = true
    setDone(true)
    setFirsts((f) => [...f, first])
  }, [])
  const next = () => {
    doneRef.current = false
    setIdx((i) => i + 1)
    setDone(false)
  }
  const isLast = idx + 1 >= total
  const firstCount = firsts.filter(Boolean).length
  const stars = (bonus = 0) => starsFor(Math.min(1, (firstCount + bonus) / total))
  return { idx, done, complete, next, isLast, firsts, firstCount, stars }
}

/** top: görev kartı — dikeyde çalışma alanının üstünde, yatayda panelin başında */
export function Layout({ work, panel, top }: { work: ReactNode; panel: ReactNode; top?: ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        {top && <div className="mb-3 lg:hidden">{top}</div>}
        {work}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        {top && <div className="hidden lg:block">{top}</div>}
        {panel}
      </div>
    </div>
  )
}

export function Header({ icon, color, idx, total, title, extra }: { icon: ReactNode; color: string; idx: number; total: number; title: string; extra?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow" style={{ background: color }}>{icon}</span>
        <div className="min-w-0">
          <p className="text-[11px] font-black tracking-wide uppercase" style={{ color }}>Görev {idx + 1} / {total}</p>
          <p className="text-lg leading-tight font-black"><MathText text={title} /></p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {extra}
        <LevelDots current={idx} total={total} />
      </div>
    </div>
  )
}

/** Dar panelde soru metni tam satır kaplasın */
export function Nudge(p: Parameters<typeof KitNudge>[0]) {
  return (
    <div className="text-ink [&>div>div]:ml-12 [&>div>p]:basis-[calc(100%-3rem)]">
      <KitNudge {...p} />
    </div>
  )
}

export function Card({ title, children, className = '' }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white/95 p-3 text-ink ring-1 ring-line ${className}`}>
      {title && <p className="mb-2 text-xs font-black tracking-wide text-ink-soft uppercase">{title}</p>}
      {children}
    </div>
  )
}

/** **kalın** vurgulu metin (içinde MathText biçimleri de çalışır) */
export function Rich({ text }: { text: string }) {
  const parts = text.split('**')
  return <>{parts.map((t, i) => (i % 2 ? <b key={i} className="font-black text-brand-ink">{renderMath(t)}</b> : <span key={i}>{renderMath(t)}</span>))}</>
}

/** Görev kartı: büyük, okunaklı problem metni */
export function Prompt({ children, color = '#db2777', emoji }: { children: ReactNode; color?: string; emoji?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-ink shadow-sm ring-2" style={{ boxShadow: `inset 0 0 0 2px ${color}22`, borderColor: color }}>
      <div className="flex items-start gap-2">
        {emoji && <span className="text-2xl leading-none" aria-hidden>{emoji}</span>}
        <div className="min-w-0 flex-1 text-[17px] leading-snug font-extrabold">{typeof children === 'string' ? <Rich text={children} /> : children}</div>
      </div>
    </div>
  )
}

export function PickBtn({ on, disabled, onClick, children, color = '#db2777', className = '', label, big }: { on?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode; color?: string; className?: string; label?: string; big?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      className={`${big ? 'min-h-14 min-w-14 text-lg' : 'min-h-12 min-w-12 text-base'} rounded-xl px-3 font-black transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
      style={on ? { background: color, color: '#fff', boxShadow: `0 3px 0 ${color}aa` } : { background: '#fff', color: '#1f2340', boxShadow: 'inset 0 0 0 1.5px #e7e8f2' }}
    >
      {children}
    </button>
  )
}

/** Küçük araç düğmesi (≥ 48 px) */
export function ToolBtn({ onClick, children, disabled, active, label, big }: { onClick: () => void; children: ReactNode; disabled?: boolean; active?: boolean; label?: string; big?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex ${big ? 'min-h-14 px-4' : 'min-h-12 px-3'} items-center justify-center gap-1.5 rounded-xl text-sm font-extrabold ring-1 transition active:scale-95 disabled:opacity-40 ${active ? 'bg-ink text-white ring-ink' : 'bg-white text-ink ring-line hover:bg-paper'}`}
    >
      {children}
    </button>
  )
}

export function NextButton({ isLast, onNext, onFinish, label = 'Sonraki görev' }: { isLast: boolean; onNext: () => void; onFinish: () => void; label?: string }) {
  return (
    <div className="animate-fade-up">
      <BigButton onClick={isLast ? onFinish : onNext} className="w-full">
        {isLast ? <>Keşfi bitir <Flag size={20} /></> : <>{label} <ArrowRight size={20} /></>}
      </BigButton>
    </div>
  )
}

export function Derived({ children, tone = 'ok' }: { children: ReactNode; tone?: 'ok' | 'info' }) {
  return (
    <div className={`rounded-2xl px-4 py-3 text-[17px] leading-snug font-black animate-pop ${tone === 'ok' ? 'bg-ok-soft text-green-900 ring-1 ring-green-200' : 'bg-sky-50 text-sky-900 ring-1 ring-sky-200'}`}>
      {typeof children === 'string' ? <MathText text={children} /> : children}
    </div>
  )
}

/** Sayı girişi: büyük ± düğmeleri */
export function NumStepper({ value, onChange, min = 0, max = 99, step = 1, label, color = '#db2777', big, fmt }: { value: number | null; onChange: (v: number) => void; min?: number; max?: number; step?: number; label?: string; color?: string; big?: boolean; fmt?: (v: number) => string }) {
  const s = big ? 'size-14' : 'size-12'
  const v = value ?? min
  return (
    <div className="flex flex-col items-center gap-1">
      {label && <span className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">{label}</span>}
      <div className="flex items-center gap-1 rounded-2xl bg-white p-1 ring-1 ring-line">
        <button type="button" disabled={value !== null && v <= min} onClick={() => onChange(Math.max(min, value === null ? min : v - step))} className={`grid ${s} place-items-center rounded-xl bg-paper active:scale-95 disabled:opacity-30`} aria-label="Azalt"><Minus size={22} /></button>
        <span className="min-w-16 text-center text-2xl font-black tabular-nums" style={{ color }}>{value === null ? '?' : fmt ? fmt(v) : v}</span>
        <button type="button" disabled={v >= max} onClick={() => onChange(Math.min(max, value === null ? min : v + step))} className={`grid ${s} place-items-center rounded-xl bg-paper active:scale-95 disabled:opacity-30`} aria-label="Artır"><Plus size={22} /></button>
      </div>
    </div>
  )
}

/** Yatay tablette tahtanın ekrana sığması için genişlik sınırı (en/boy oranına göre) */
export const fitWidth = (aspect: number, reserve = 250): CSSProperties => ({ maxWidth: `min(100%, calc((100dvh - ${reserve}px) * ${aspect.toFixed(3)}))`, minWidth: 'min(100%, 300px)', marginInline: 'auto' })

// ─── Dokunmatik ızgara hareketi ────────────────────────────────────────────

/** SVG istemci koordinatını viewBox (dünya) koordinatına çevirir (CSS ölçeğine dayanıklı) */
export function toWorld(svg: SVGSVGElement | null, cx: number, cy: number): Pt {
  if (!svg) return [0, 0]
  const r = svg.getBoundingClientRect()
  const vb = svg.viewBox.baseVal
  return [vb.x + ((cx - r.left) / r.width) * vb.width, vb.y + ((cy - r.top) / r.height) * vb.height]
}

/**
 * Tek parmak sürükleme/dokunma: dünya koordinatlarıyla onStart → onMove → onEnd(tap).
 * İkinci parmak (pinch) ZoomBox’a bırakılır.
 */
export function useGridGesture<M>(svgRef: RefObject<SVGSVGElement | null>, h: { onStart: (p: Pt) => M; onMove?: (p: Pt, m: M) => void; onEnd?: (p: Pt, m: M, tap: boolean) => void; disabled?: boolean }) {
  const hr = useRef(h)
  hr.current = h
  const memo = useRef<{ m: M; active: boolean; id: number } | null>(null)
  useGesture(
    {
      onDrag: ({ first, last, tap, xy: [cx, cy], event, canceled }) => {
        const e = event as PointerEvent
        if (hr.current.disabled) return
        if (e && 'isPrimary' in e && e.isPrimary === false) return
        const p = toWorld(svgRef.current, cx, cy)
        if (tap) {
          // dokunuş: tek olayda başla + bitir
          if (memo.current?.active) memo.current.active = false
          const m = hr.current.onStart(p)
          hr.current.onEnd?.(p, m, true)
          return
        }
        if (first) memo.current = { m: hr.current.onStart(p), active: true, id: e?.pointerId ?? 0 }
        const s = memo.current
        if (!s?.active) return
        if (!first && !last) hr.current.onMove?.(p, s.m)
        if (last || canceled) {
          s.active = false
          hr.current.onEnd?.(p, s.m, false)
        }
      },
    },
    { target: svgRef, eventOptions: { passive: false }, drag: { filterTaps: true, tapsThreshold: 6 } },
  )
}

// ─── Çivili tahta (geometri tahtası) ───────────────────────────────────────

export interface Handle {
  id: string
  x: number
  y: number
  color: string
  label?: string
  /** dış halka (seçili) */
  ring?: boolean
  /** sürüklenemez */
  fixed?: boolean
}

/**
 * Çivili tahta: (0..cols) × (0..rows) tam sayı noktaları. y aşağı doğru artar.
 *  - Boş çiviye dokun → onTap(x, y)
 *  - Tutamacı sürükle → onHandleMove (çiviye yapışır), dokun → onHandleTap
 *  - İçerik (children) dünya biriminde çizilir; `under` çivilerin altında kalır.
 */
export function PegBoard({ cols, rows, handles = [], onTap, onHandleMove, onHandleTap, onHandleEnd, children, under, locked, bg = '#f8fbff', peg = '#9aa6c7', label = 'Geometri tahtası', handleR = 0.3, gridLines = true }: { cols: number; rows: number; handles?: Handle[]; onTap?: (x: number, y: number) => void; onHandleMove?: (id: string, x: number, y: number) => void; onHandleTap?: (id: string) => void; onHandleEnd?: (id: string) => void; children?: ReactNode; under?: ReactNode; locked?: boolean; bg?: string; peg?: string; label?: string; handleR?: number; gridLines?: boolean }) {
  const svg = useRef<SVGSVGElement>(null)
  const hs = useRef(handles)
  hs.current = handles
  const last = useRef<string>('')
  const P = 0.7
  const snapP = (p: Pt): Pt => [Math.max(0, Math.min(cols, Math.round(p[0]))), Math.max(0, Math.min(rows, Math.round(p[1])))]
  useGridGesture<{ id: string | null }>(svg, {
    disabled: locked,
    onStart: (p) => {
      let best: string | null = null
      let bd = 0.55
      for (const h of hs.current) {
        if (h.fixed) continue
        const d = Math.hypot(h.x - p[0], h.y - p[1])
        if (d < bd) { bd = d; best = h.id }
      }
      last.current = ''
      return { id: best }
    },
    onMove: (p, m) => {
      if (!m.id || !onHandleMove) return
      const [x, y] = snapP(p)
      const k = `${x},${y}`
      if (k === last.current) return
      last.current = k
      onHandleMove(m.id, x, y)
    },
    onEnd: (p, m, tap) => {
      if (m.id) {
        if (tap) onHandleTap?.(m.id)
        else onHandleEnd?.(m.id)
        return
      }
      if (!tap || !onTap) return
      const [x, y] = snapP(p)
      if (Math.hypot(x - p[0], y - p[1]) < 0.5) onTap(x, y)
    },
  })
  const pegs: Pt[] = []
  for (let y = 0; y <= rows; y++) for (let x = 0; x <= cols; x++) pegs.push([x, y])
  return (
    <svg ref={svg} viewBox={`${-P} ${-P} ${cols + 2 * P} ${rows + 2 * P}`} className="block w-full select-none rounded-2xl ring-1 ring-line" style={{ touchAction: 'none', background: bg }} role="img" aria-label={label}>
      {gridLines && (
        <g stroke="#e4e9f5" strokeWidth={0.025}>
          {Array.from({ length: cols + 1 }, (_, i) => <line key={`v${i}`} x1={i} x2={i} y1={0} y2={rows} />)}
          {Array.from({ length: rows + 1 }, (_, i) => <line key={`h${i}`} y1={i} y2={i} x1={0} x2={cols} />)}
        </g>
      )}
      {under}
      {pegs.map(([x, y]) => <circle key={`${x},${y}`} cx={x} cy={y} r={0.075} fill={peg} />)}
      {children}
      {handles.map((h) => (
        <g key={h.id} data-handle style={{ cursor: h.fixed ? 'default' : 'grab' }}>
          <circle cx={h.x} cy={h.y} r={0.48} fill="transparent" />
          {h.ring && <circle cx={h.x} cy={h.y} r={handleR + 0.13} fill="none" stroke={h.color} strokeWidth={0.07} opacity={0.5} />}
          <circle cx={h.x} cy={h.y} r={handleR} fill={h.color} stroke="#fff" strokeWidth={0.07} />
          {h.label && <text x={h.x} y={h.y + 0.11} textAnchor="middle" fontSize={0.3} fontWeight={900} fill="#fff" pointerEvents="none">{h.label}</text>}
        </g>
      ))}
    </svg>
  )
}

// ─── Çokgen yardımcıları ───────────────────────────────────────────────────

export const area2 = (p: Pt[]) => p.reduce((s, [x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; return s + x * y2 - x2 * y }, 0)
export const polyArea = (p: Pt[]) => Math.abs(area2(p)) / 2
export const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]]
export const cross = (a: Pt, b: Pt) => a[0] * b[1] - a[1] * b[0]
export const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1]
export const len2 = (a: Pt) => a[0] * a[0] + a[1] * a[1]
export const samePt = (a: Pt, b: Pt) => a[0] === b[0] && a[1] === b[1]

/** Ardışık tekrarları ve doğrusal (köşe olmayan) noktaları atar */
export function simplify(pts: Pt[]): Pt[] {
  let p = pts.filter((q, i) => !samePt(q, pts[(i + pts.length - 1) % pts.length]))
  let changed = true
  while (changed && p.length >= 3) {
    changed = false
    for (let i = 0; i < p.length; i++) {
      const a = p[(i + p.length - 1) % p.length], b = p[i], c = p[(i + 1) % p.length]
      if (cross(sub(b, a), sub(c, b)) === 0) {
        p = p.filter((_, j) => j !== i)
        changed = true
        break
      }
    }
  }
  return p
}

function segX(a: Pt, b: Pt, c: Pt, d: Pt) {
  const o = (p: Pt, q: Pt, r: Pt) => Math.sign(cross(sub(q, p), sub(r, p)))
  const on = (p: Pt, q: Pt, r: Pt) => Math.min(p[0], r[0]) <= q[0] && q[0] <= Math.max(p[0], r[0]) && Math.min(p[1], r[1]) <= q[1] && q[1] <= Math.max(p[1], r[1])
  const o1 = o(a, b, c), o2 = o(a, b, d), o3 = o(c, d, a), o4 = o(c, d, b)
  if (o1 !== o2 && o3 !== o4) return true
  if (o1 === 0 && on(a, c, b)) return true
  if (o2 === 0 && on(a, d, b)) return true
  if (o3 === 0 && on(c, a, d)) return true
  if (o4 === 0 && on(c, b, d)) return true
  return false
}

/** Kenarlar kesişiyor mu (basit çokgen değil)? */
export function selfIntersects(p: Pt[]) {
  const n = p.length
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue
      if (segX(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n])) return true
    }
  return false
}

export type AngleKind = 'dar' | 'dik' | 'genis' | 'icbukey'

/** Çokgenin özellikleri (köşeler tam sayı) */
export function analyze(raw: Pt[]) {
  const p = simplify(raw)
  const n = p.length
  const ccw = area2(p) > 0
  const sides = p.map((q, i) => sub(p[(i + 1) % n], q))
  const lens = sides.map(len2)
  const angles: AngleKind[] = p.map((_, i) => {
    const a = sides[(i + n - 1) % n], b = sides[i]
    const turn = cross(a, b)
    const interiorConvex = ccw ? turn > 0 : turn < 0
    if (!interiorConvex) return 'icbukey'
    const d = dot([-a[0], -a[1]], b)
    return d === 0 ? 'dik' : d > 0 ? 'dar' : 'genis'
  })
  let parallelPairs = 0
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (cross(sides[i], sides[j]) === 0) parallelPairs++
  const right = angles.filter((a) => a === 'dik').length
  const allEq = lens.every((l) => l === lens[0])
  const eqPairs = (() => {
    const c = new Map<number, number>()
    for (const l of lens) c.set(l, (c.get(l) ?? 0) + 1)
    return Math.max(...c.values())
  })()
  const convex = !angles.includes('icbukey')
  let kind = ''
  if (n === 3) kind = 'üçgen'
  else if (n === 4) {
    if (parallelPairs === 2) kind = right === 4 ? (allEq ? 'kare' : 'dikdörtgen') : allEq ? 'eşkenar dörtgen' : 'paralelkenar'
    else if (parallelPairs === 1) kind = 'yamuk'
    else kind = 'dörtgen'
  } else if (n === 5) kind = 'beşgen'
  else if (n === 6) kind = 'altıgen'
  else kind = `${n} kenarlı çokgen`
  return { pts: p, n, sides, lens, angles, right, parallelPairs, allEq, eqPairs, convex, area: polyArea(p), kind, simple: n >= 3 && !selfIntersects(p) }
}
export type Shape = ReturnType<typeof analyze>

const SYM: ((p: Pt) => Pt)[] = [
  ([x, y]) => [x, y], ([x, y]) => [-x, y], ([x, y]) => [x, -y], ([x, y]) => [-x, -y],
  ([x, y]) => [y, x], ([x, y]) => [-y, x], ([x, y]) => [y, -x], ([x, y]) => [-y, -x],
]

/** Eş (döndürülmüş/yansıtılmış/ötelenmiş) çokgenler aynı anahtarı alır */
export function polyKey(raw: Pt[]) {
  const p = simplify(raw)
  let best = ''
  for (const f of SYM) {
    const q = p.map(f)
    for (const dir of [q, [...q].reverse()])
      for (let s = 0; s < dir.length; s++) {
        const r = [...dir.slice(s), ...dir.slice(0, s)]
        const mx = Math.min(...r.map((t) => t[0])), my = Math.min(...r.map((t) => t[1]))
        const k = r.map(([x, y]) => `${x - mx},${y - my}`).join(';')
        if (!best || k < best) best = k
      }
  }
  return best
}

// ─── Birim kare yardımcıları ──────────────────────────────────────────────

export const ck = (x: number, y: number) => `${x},${y}`
export const pk = (k: string) => k.split(',').map(Number) as Pt
export const NB: Pt[] = [[1, 0], [-1, 0], [0, 1], [0, -1]]

export function cellsConnected(cells: string[]) {
  if (cells.length <= 1) return true
  const s = new Set(cells)
  const seen = new Set([cells[0]])
  const st = [cells[0]]
  while (st.length) {
    const [x, y] = pk(st.pop()!)
    for (const [dx, dy] of NB) {
      const k = ck(x + dx, y + dy)
      if (s.has(k) && !seen.has(k)) { seen.add(k); st.push(k) }
    }
  }
  return seen.size === cells.length
}

/** Birim karelerden oluşan şeklin çevresi (birim kenar sayısı) */
export function cellsPerimeter(cells: string[]) {
  const s = new Set(cells)
  let e = 0
  for (const c of cells) {
    const [x, y] = pk(c)
    for (const [dx, dy] of NB) if (!s.has(ck(x + dx, y + dy))) e++
  }
  return e
}

/** Sınır kenarları: [x1,y1,x2,y2] (dünya biriminde) */
export function boundaryEdges(cells: string[]): [number, number, number, number][] {
  const s = new Set(cells)
  const out: [number, number, number, number][] = []
  for (const c of cells) {
    const [x, y] = pk(c)
    if (!s.has(ck(x, y - 1))) out.push([x, y, x + 1, y])
    if (!s.has(ck(x + 1, y))) out.push([x + 1, y, x + 1, y + 1])
    if (!s.has(ck(x, y + 1))) out.push([x, y + 1, x + 1, y + 1])
    if (!s.has(ck(x - 1, y))) out.push([x, y, x, y + 1])
  }
  return out
}

/** İçinde delik var mı? (dış bölgeden ulaşılamayan boş kare) */
export function cellsHaveHole(cells: string[]) {
  if (!cells.length) return false
  const ps = cells.map(pk)
  const x0 = Math.min(...ps.map((p) => p[0])) - 1, x1 = Math.max(...ps.map((p) => p[0])) + 1
  const y0 = Math.min(...ps.map((p) => p[1])) - 1, y1 = Math.max(...ps.map((p) => p[1])) + 1
  const s = new Set(cells)
  const seen = new Set([ck(x0, y0)])
  const st: Pt[] = [[x0, y0]]
  while (st.length) {
    const [x, y] = st.pop()!
    for (const [dx, dy] of NB) {
      const nx = x + dx, ny = y + dy
      if (nx < x0 || nx > x1 || ny < y0 || ny > y1) continue
      const k = ck(nx, ny)
      if (s.has(k) || seen.has(k)) continue
      seen.add(k)
      st.push([nx, ny])
    }
  }
  return (x1 - x0 + 1) * (y1 - y0 + 1) - seen.size > cells.length
}

export function cellsBox(cells: string[]) {
  const ps = cells.map(pk)
  const x0 = Math.min(...ps.map((p) => p[0])), x1 = Math.max(...ps.map((p) => p[0]))
  const y0 = Math.min(...ps.map((p) => p[1])), y1 = Math.max(...ps.map((p) => p[1]))
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}
export const isRectCells = (cells: string[]) => cells.length > 0 && (() => { const b = cellsBox(cells); return b.w * b.h === cells.length })()

/** Eş çok-kareliler aynı anahtarı alır (döndürme/yansıma/öteleme) */
export function cellsKey(cells: string[]) {
  const ps = cells.map(pk)
  let best = ''
  for (const f of SYM) {
    const q = ps.map(f)
    const mx = Math.min(...q.map((t) => t[0])), my = Math.min(...q.map((t) => t[1]))
    const k = q.map(([x, y]) => `${x - mx},${y - my}`).sort().join(';')
    if (!best || k < best) best = k
  }
  return best
}

/** Küçük önizleme SVG’si (çözüm rozetleri için) */
export function MiniCells({ cells, color = '#db2777', size = 34 }: { cells: string[]; color?: string; size?: number }) {
  if (!cells.length) return null
  const b = cellsBox(cells)
  const m = Math.max(b.w, b.h)
  return (
    <svg viewBox={`${b.x0 - 0.2} ${b.y0 - 0.2} ${m + 0.4} ${m + 0.4}`} width={size} height={size} aria-hidden className="shrink-0">
      {cells.map((c) => { const [x, y] = pk(c); return <rect key={c} x={x} y={y} width={1} height={1} fill={color} stroke="#fff" strokeWidth={0.12} /> })}
    </svg>
  )
}

export function MiniPoly({ pts, color = '#db2777', size = 34 }: { pts: Pt[]; color?: string; size?: number }) {
  if (pts.length < 3) return null
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
  const x0 = Math.min(...xs), y0 = Math.min(...ys)
  const m = Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0, 1)
  return (
    <svg viewBox={`${x0 - 0.3} ${y0 - 0.3} ${m + 0.6} ${m + 0.6}`} width={size} height={size} aria-hidden className="shrink-0">
      <polygon points={pts.map((p) => p.join(',')).join(' ')} fill={`${color}55`} stroke={color} strokeWidth={m * 0.06} strokeLinejoin="round" />
    </svg>
  )
}

// ─── Birim kare tahtası ───────────────────────────────────────────────────

/**
 * Kare ızgara: (0..cols) × (0..rows), her kare 1×1. Dokun → aç/kapa; parmağını gezdir → aynı işlemi sürdür.
 * İçerik (children) dünya biriminde, karelerin üstünde çizilir.
 */
export function CellBoard({ cols, rows, cells, onPaint, canPaint, fill = '#db2777', cellFill, children, under, locked, bg = '#ffffff', label = 'Kare ızgara', pad = 0.25, gridColor = '#e3e7f2' }: { cols: number; rows: number; cells: string[]; onPaint?: (key: string, add: boolean) => void; canPaint?: (x: number, y: number) => boolean; fill?: string; cellFill?: (key: string) => string | undefined; children?: ReactNode; under?: ReactNode; locked?: boolean; bg?: string; label?: string; pad?: number; gridColor?: string }) {
  const svg = useRef<SVGSVGElement>(null)
  const set = new Set(cells)
  const cur = useRef(set)
  cur.current = set
  const lastK = useRef('')
  const at = (p: Pt) => {
    const x = Math.floor(p[0]), y = Math.floor(p[1])
    if (x < 0 || y < 0 || x >= cols || y >= rows) return null
    if (canPaint && !canPaint(x, y)) return null
    return ck(x, y)
  }
  useGridGesture<{ add: boolean } | null>(svg, {
    disabled: locked || !onPaint,
    onStart: (p) => {
      const k = at(p)
      if (!k) return null
      const add = !cur.current.has(k)
      lastK.current = k
      onPaint?.(k, add)
      return { add }
    },
    onMove: (p, m) => {
      if (!m) return
      const k = at(p)
      if (!k || k === lastK.current) return
      lastK.current = k
      if (cur.current.has(k) !== m.add) onPaint?.(k, m.add)
    },
  })
  return (
    <svg ref={svg} viewBox={`${-pad} ${-pad} ${cols + 2 * pad} ${rows + 2 * pad}`} className="block w-full select-none rounded-2xl ring-1 ring-line" style={{ touchAction: 'none', background: bg }} role="img" aria-label={label}>
      {under}
      {cells.map((k) => {
        const [x, y] = pk(k)
        return <rect key={k} x={x + 0.04} y={y + 0.04} width={0.92} height={0.92} rx={0.12} fill={cellFill?.(k) ?? fill} />
      })}
      <g stroke={gridColor} strokeWidth={0.03}>
        {Array.from({ length: cols + 1 }, (_, i) => <line key={`v${i}`} x1={i} x2={i} y1={0} y2={rows} />)}
        {Array.from({ length: rows + 1 }, (_, i) => <line key={`h${i}`} y1={i} y2={i} x1={0} x2={cols} />)}
      </g>
      {children}
    </svg>
  )
}
