import { useRef, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'

/**
 * Hızlı Noktalar kart düzenleri. Her kart, noktaların konumu ve yapı çizgileri (çerçeve, zar kutusu) ile çizilir.
 * Noktaların hepsi "boyanabilir": öğrenci gördüğü grupları parmağıyla boyar → eşitlik kendiliğinden belirir.
 */

export type Card =
  | { kind: 'dice'; n: number }
  | { kind: 'domino'; a: number; b: number }
  | { kind: 'frame'; n: number; size: 10 | 20; split?: number }
  | { kind: 'tens'; full: number; extra: number }
  | { kind: 'rek'; top: number; bottom: number }
  | { kind: 'fives'; groups: number; extra: number }
  | { kind: 'pairs'; pairs: number }

export const RED = '#ef4444'
export const BLUE = '#3b82f6'
const INK = '#1f2340'

export interface Dot {
  x: number
  y: number
  c: string
}

const DICE: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
}

export const cardTotal = (c: Card) =>
  c.kind === 'dice' ? c.n : c.kind === 'domino' ? c.a + c.b : c.kind === 'frame' ? c.n : c.kind === 'tens' ? c.full * 10 + c.extra : c.kind === 'rek' ? c.top + c.bottom : c.kind === 'fives' ? c.groups * 5 + c.extra : c.pairs * 2

/** Kartın düzeni: noktalar ve yapı çizgileri */
export function layout(card: Card): { w: number; h: number; dots: Dot[]; deco: ReactNode } {
  const dots: Dot[] = []
  const deco: ReactNode[] = []
  if (card.kind === 'dice' || card.kind === 'domino') {
    const faces = card.kind === 'dice' ? [card.n] : [card.a, card.b]
    const S = 132
    faces.forEach((n, f) => {
      const ox = 10 + f * (S + 14)
      deco.push(<rect key={`d${f}`} x={ox} y={10} width={S} height={S} rx={22} fill="#fff" stroke={INK} strokeWidth={3} />)
      DICE[n].forEach(([gx, gy]) => dots.push({ x: ox + 28 + gx * 38, y: 38 + gy * 38, c: f === 0 ? RED : BLUE }))
    })
    return { w: 20 + faces.length * S + (faces.length - 1) * 14, h: S + 20, dots, deco }
  }
  if (card.kind === 'frame') {
    const cell = 44
    const frames = card.size / 10
    for (let f = 0; f < frames; f++) {
      const oy = 10 + f * (2 * cell + 16)
      deco.push(
        <g key={`f${f}`}>
          <rect x={10} y={oy} width={5 * cell} height={2 * cell} fill="#fff" />
          {Array.from({ length: 10 }, (_, i) => <rect key={i} x={10 + (i % 5) * cell} y={oy + Math.floor(i / 5) * cell} width={cell} height={cell} fill="none" stroke={INK} strokeWidth={1.5} />)}
          <rect x={10} y={oy} width={5 * cell} height={2 * cell} fill="none" stroke={INK} strokeWidth={3.5} rx={3} />
        </g>,
      )
    }
    const split = card.split ?? card.n
    for (let i = 0; i < card.n; i++) {
      // iki renkli kartta: kırmızılar önce (ilk çerçeve), maviler ikinci çerçeveye ya da kalan hücrelere
      const slot = card.split !== undefined && card.size === 20 && i >= split ? 10 + (i - split) : i
      const f = Math.floor(slot / 10), k = slot % 10
      dots.push({ x: 10 + (k % 5) * cell + cell / 2, y: 10 + f * (2 * cell + 16) + Math.floor(k / 5) * cell + cell / 2, c: i < split ? RED : BLUE })
    }
    return { w: 5 * cell + 20, h: frames * 2 * cell + (frames - 1) * 16 + 20, dots, deco }
  }
  if (card.kind === 'tens') {
    const cell = 26
    const fw = 5 * cell, fh = 2 * cell
    const n = card.full + (card.extra ? 1 : 0)
    const cols = 2
    for (let f = 0; f < n; f++) {
      const ox = 10 + (f % cols) * (fw + 14), oy = 10 + Math.floor(f / cols) * (fh + 14)
      deco.push(
        <g key={`t${f}`}>
          <rect x={ox} y={oy} width={fw} height={fh} fill="#fff" />
          {Array.from({ length: 10 }, (_, i) => <rect key={i} x={ox + (i % 5) * cell} y={oy + Math.floor(i / 5) * cell} width={cell} height={cell} fill="none" stroke={INK} strokeWidth={1.2} />)}
          <rect x={ox} y={oy} width={fw} height={fh} fill="none" stroke={INK} strokeWidth={3} rx={3} />
        </g>,
      )
      const cnt = f < card.full ? 10 : card.extra
      for (let i = 0; i < cnt; i++) dots.push({ x: ox + (i % 5) * cell + cell / 2, y: oy + Math.floor(i / 5) * cell + cell / 2, c: f < card.full ? RED : BLUE })
    }
    const rows = Math.ceil(n / cols)
    return { w: 20 + cols * fw + 14, h: 20 + rows * fh + (rows - 1) * 14, dots, deco }
  }
  if (card.kind === 'rek') {
    const b = 26
    const W = 20 + 10 * b + 90
    ;[card.top, card.bottom].forEach((cnt, r) => {
      const y = 34 + r * 54
      deco.push(<line key={`w${r}`} x1={8} x2={W - 8} y1={y} y2={y} stroke="#94a3b8" strokeWidth={4} strokeLinecap="round" />)
      for (let i = 0; i < 10; i++) {
        const color = i < 5 ? RED : '#f8fafc'
        if (i < cnt) dots.push({ x: 22 + i * b, y, c: color })
        else deco.push(<circle key={`u${r}${i}`} cx={W - 22 - (9 - i) * b} cy={y} r={12} fill={i < 5 ? '#fecaca' : '#f1f5f9'} stroke="#cbd5e1" strokeWidth={1.5} />)
      }
    })
    deco.unshift(<rect key="frame" x={2} y={6} width={W - 4} height={124} rx={14} fill="#fff7ed" stroke="#c2410c" strokeWidth={3} />)
    return { w: W, h: 136, dots, deco }
  }
  if (card.kind === 'fives') {
    const S = 92
    const n = card.groups + (card.extra ? 1 : 0)
    const cols = Math.min(3, n)
    for (let g = 0; g < n; g++) {
      const ox = 10 + (g % cols) * (S + 12), oy = 10 + Math.floor(g / cols) * (S + 12)
      deco.push(<rect key={`g${g}`} x={ox} y={oy} width={S} height={S} rx={16} fill="#fff" stroke="#cbd5e1" strokeWidth={2} />)
      const cnt = g < card.groups ? 5 : card.extra
      DICE[cnt].forEach(([gx, gy]) => dots.push({ x: ox + 20 + gx * 26, y: oy + 20 + gy * 26, c: g < card.groups ? RED : BLUE }))
    }
    const rows = Math.ceil(n / cols)
    return { w: 20 + cols * S + (cols - 1) * 12, h: 20 + rows * S + (rows - 1) * 12, dots, deco }
  }
  // pairs: ikişerli gruplar (çorap çiftleri gibi), iki sıra hâlinde
  const per = Math.ceil(card.pairs / 2)
  for (let p = 0; p < card.pairs; p++) {
    const ox = 14 + (p % per) * 58, oy = 14 + Math.floor(p / per) * 66
    deco.push(<rect key={`p${p}`} x={ox} y={oy} width={46} height={52} rx={14} fill="#fff" stroke="#cbd5e1" strokeWidth={2} />)
    dots.push({ x: ox + 23, y: oy + 14, c: p % 2 ? BLUE : RED }, { x: ox + 23, y: oy + 38, c: p % 2 ? BLUE : RED })
  }
  return { w: 28 + per * 58 - 12, h: 28 + 2 * 66 - 14, dots, deco }
}

export const PAINT = ['#f59e0b', '#22c55e', '#a855f7']

/**
 * Kart çizimi. `paint` verilirse noktalar boyanabilir (dokun ya da parmağı sürükle).
 */
export function DotCard({ card, paint, onPaint, maxH = 300 }: { card: Card; paint?: (number | null)[]; onPaint?: (i: number, mode: 'tap' | 'drag') => void; maxH?: number }) {
  const L = layout(card)
  const R = card.kind === 'tens' || card.kind === 'fives' || card.kind === 'pairs' ? 10 : card.kind === 'rek' ? 12 : 15
  const svgRef = useRef<SVGSVGElement>(null)
  const touched = useRef(new Set<number>())
  const hit = (cx: number, cy: number) => {
    const svg = svgRef.current
    const m = svg?.getScreenCTM()
    if (!svg || !m) return -1
    const p = new DOMPoint(cx, cy).matrixTransform(m.inverse())
    let best = -1, bd = 22 * 22
    L.dots.forEach((d, i) => {
      const dd = (d.x - p.x) ** 2 + (d.y - p.y) ** 2
      if (dd < bd) {
        bd = dd
        best = i
      }
    })
    return best
  }
  const bind = useDrag(
    ({ xy: [x, y], first, tap, event }) => {
      if (!onPaint) return
      event?.preventDefault?.()
      if (first) touched.current = new Set()
      const i = hit(x, y)
      if (i < 0) return
      if (tap) {
        onPaint(i, 'tap')
        return
      }
      if (!touched.current.has(i)) {
        touched.current.add(i)
        onPaint(i, 'drag')
      }
    },
    { filterTaps: true, threshold: 0, eventOptions: { passive: false } },
  )
  return (
    <svg
      ref={svgRef}
      {...(onPaint ? bind() : {})}
      data-handle={onPaint ? '' : undefined}
      viewBox={`0 0 ${L.w} ${L.h}`}
      className="mx-auto block h-auto w-full"
      style={{ maxHeight: maxH, touchAction: onPaint ? 'none' : undefined, cursor: onPaint ? 'crosshair' : undefined }}
      role="img"
      aria-label={`${L.dots.length} nokta`}
    >
      {L.deco}
      {L.dots.map((d, i) => {
        const p = paint?.[i]
        const fill = p === null || p === undefined ? d.c : PAINT[p]
        return (
          <g key={i}>
            <circle cx={d.x} cy={d.y} r={R} fill={fill} stroke={d.c === '#f8fafc' && p == null ? '#94a3b8' : '#fff'} strokeWidth={2} />
            {p != null && <circle cx={d.x} cy={d.y} r={R + 3} fill="none" stroke={PAINT[p]} strokeWidth={2} opacity={0.5} />}
          </g>
        )
      })}
    </svg>
  )
}

/** Boş onluk / yirmilik çerçeve: dokunarak yeniden kur */
export function BuildFrame({ size, filled, onToggle, disabled }: { size: 10 | 20; filled: boolean[]; onToggle: (i: number) => void; disabled?: boolean }) {
  const frames = size / 10
  return (
    <div className="mx-auto flex w-full max-w-[22rem] flex-col gap-3">
      {Array.from({ length: frames }, (_, f) => (
        <div key={f} className="grid grid-cols-5 overflow-hidden rounded-lg border-[3px] border-ink bg-white">
          {Array.from({ length: 10 }, (_, k) => {
            const i = f * 10 + k
            return (
              <button
                key={k}
                type="button"
                disabled={disabled}
                onClick={() => onToggle(i)}
                aria-label={`${i + 1}. kutu ${filled[i] ? 'dolu' : 'boş'}`}
                className="grid aspect-square min-h-14 place-items-center border border-ink/40 transition active:bg-amber-50"
              >
                {filled[i] && <span className="size-[70%] rounded-full bg-red-500 shadow-[inset_0_-3px_0_rgb(0_0_0/0.15)] animate-pop" />}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
