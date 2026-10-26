import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { toPoints, type Pt } from '../donusum-studyosu/ortak'
import { bbox, clipHalf, creaseSegments, foldEdges, foldMatrix, isSymmetry, reflectPoly, shapesOf, unfoldImages, type Line } from './geom'

/**
 * Kâğıt sahnesi: katlama durumu (useFolder), katlanma/açılma animasyonu ve çizim (FoldView).
 * Kâğıdın ön yüzü renkli, arka yüzü beyazdır (origami kâğıdı gibi): ilk katlamadan sonra görünen yüz arka yüzdür.
 */

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** c değerini c0 → c1 arasında yumuşakça değiştirir */
export function useTween(initial = 1) {
  const [c, setC] = useState(initial)
  const raf = useRef(0)
  const busy = useRef(false)
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const run = useCallback((c0: number, c1: number, done?: () => void, dur = 750) => {
    cancelAnimationFrame(raf.current)
    busy.current = true
    const D = reduced() ? 1 : dur
    const t0 = performance.now()
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / D)
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
      setC(c0 + (c1 - c0) * e)
      if (k < 1) raf.current = requestAnimationFrame(step)
      else {
        busy.current = false
        done?.()
      }
    }
    raf.current = requestAnimationFrame(step)
  }, [])
  return { c, setC, run, busy }
}

type Anim = { mode: 'fold' | 'unfold'; line: Line; L: number; c: number }
type FS = { folds: Line[]; level: number; pieces: Pt[][]; bad: Line | null; anim: Anim | null }

export type Folder = ReturnType<typeof useFolder>

export function useFolder(paper: Pt[]) {
  const [s, setS] = useState<FS>({ folds: [], level: 0, pieces: [], bad: null, anim: null })
  const sr = useRef(s)
  const set = (u: Partial<FS>) => {
    sr.current = { ...sr.current, ...u }
    setS(sr.current)
  }
  const raf = useRef(0)
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const shapes = useMemo(() => shapesOf(paper, s.folds), [paper, s.folds])

  const animate = (a: Omit<Anim, 'c'>, c0: number, c1: number, end: () => void) => {
    const D = reduced() ? 1 : 750
    const t0 = performance.now()
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / D)
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
      set({ anim: { ...a, c: c0 + (c1 - c0) * e } })
      if (k < 1) raf.current = requestAnimationFrame(step)
      else {
        set({ anim: null })
        end()
      }
    }
    set({ anim: { ...a, c: c0 } })
    raf.current = requestAnimationFrame(step)
  }

  const api = {
    ...s,
    shapes,
    /** katlı biçim */
    shape: shapes[s.level],
    busy: !!s.anim,
    /** Geçerli katlı kâğıdı doğru boyunca katla; iki yarı çakışmıyorsa “bad” olarak katlı bırakır */
    fold(line: Line, done?: (ok: boolean) => void) {
      const cur = sr.current
      if (cur.anim || cur.bad || cur.level !== cur.folds.length) return
      const shp = shapesOf(paper, cur.folds)[cur.level]
      const ok = isSymmetry(shp, line)
      animate({ mode: 'fold', line, L: cur.level }, 1, -1, () => {
        if (ok) set({ folds: [...sr.current.folds, line], level: sr.current.level + 1 })
        else set({ bad: line })
        done?.(ok)
      })
    },
    /** Çakışmayan katlamayı geri aç */
    unbad(done?: () => void) {
      const cur = sr.current
      if (!cur.bad || cur.anim) return
      const l = cur.bad
      set({ bad: null })
      animate({ mode: 'fold', line: l, L: cur.level }, -1, 1, () => done?.())
    },
    /** Tüm katları sırayla aç (kat izleri ve kesikler kalır) */
    unfoldAll(done?: () => void) {
      const step = () => {
        const cur = sr.current
        const L = cur.level - 1
        if (L < 0) return done?.()
        animate({ mode: 'unfold', line: cur.folds[L], L }, -1, 1, () => {
          set({ level: L })
          step()
        })
      }
      if (!sr.current.anim) step()
    },
    /** Kat izlerinden yeniden katla */
    refoldAll(done?: () => void) {
      const step = () => {
        const cur = sr.current
        const L = cur.level
        if (L >= cur.folds.length) return done?.()
        animate({ mode: 'fold', line: cur.folds[L], L }, 1, -1, () => {
          set({ level: L + 1 })
          step()
        })
      }
      if (!sr.current.anim) step()
    },
    /** Son katlamayı geri al */
    undo(done?: () => void) {
      const cur = sr.current
      if (cur.anim || cur.bad || !cur.level || cur.level !== cur.folds.length || cur.pieces.length) return
      const L = cur.level - 1
      animate({ mode: 'unfold', line: cur.folds[L], L }, -1, 1, () => {
        set({ level: L, folds: sr.current.folds.slice(0, L) })
        done?.()
      })
    },
    reset() {
      cancelAnimationFrame(raf.current)
      set({ folds: [], level: 0, pieces: [], bad: null, anim: null })
    },
    cut(piece: Pt[]) {
      set({ pieces: [...sr.current.pieces, piece] })
    },
  }
  return api
}

export type PaperColors = { front: string; back: string; paint: string; edge: string }
export const paperColors = (grade: number): PaperColors =>
  grade <= 3 ? { front: '#fcd34d', back: '#fffbeb', paint: '#f97316', edge: '#b45309' } : grade <= 6 ? { front: '#7dd3fc', back: '#f8fafc', paint: '#2563eb', edge: '#0369a1' } : { front: '#f9a8d4', back: '#f8fafc', paint: '#be185d', edge: '#64748b' }

/** Kesikli (delikli), boyalı, katmanlı tek bir kâğıt yüzü */
export function Face({ poly, holes = [], fill, paint, paintColor = '#f97316', transform, layers = 1, edge = '#64748b', opacity = 1, outline }: { poly: Pt[]; holes?: Pt[][]; fill: string; paint?: Pt[][]; paintColor?: string; transform?: string; layers?: number; edge?: string; opacity?: number; outline?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  if (poly.length < 3) return null
  const pts = toPoints(poly)
  const extra = Math.min(layers, 4) - 1
  return (
    <g transform={transform} opacity={opacity}>
      <defs>
        {holes.length > 0 && (
          <mask id={`m${id}`} maskUnits="userSpaceOnUse" x={-500} y={-500} width={1400} height={1400}>
            <rect x={-500} y={-500} width={1400} height={1400} fill="#fff" />
            {holes.map((h, i) => <polygon key={i} points={toPoints(h)} fill="#000" />)}
          </mask>
        )}
        {paint && paint.length > 0 && <clipPath id={`c${id}`}><polygon points={pts} /></clipPath>}
      </defs>
      <g mask={holes.length ? `url(#m${id})` : undefined}>
        {Array.from({ length: extra }, (_, j) => extra - j).map((j) => (
          <polygon key={j} points={pts} transform={`translate(${j * 1.1} ${j * 1.3})`} fill={fill} stroke={edge} strokeOpacity={0.5} strokeWidth={0.5} strokeLinejoin="round" />
        ))}
        <polygon points={pts} fill={fill} stroke={outline ?? edge} strokeWidth={outline ? 1.2 : 0.7} strokeDasharray={outline ? '3 2' : undefined} strokeLinejoin="round" />
        {paint && paint.length > 0 && (
          <g clipPath={`url(#c${id})`}>
            {paint.map((p, i) => <polygon key={i} points={toPoints(p)} fill={paintColor} fillOpacity={0.85} />)}
          </g>
        )}
      </g>
    </g>
  )
}

/** Katlama durumunu (animasyon dâhil) çizer */
export function FoldContent({ f, colors, paint, creases = true, foldMarks = false }: { f: Folder; colors: PaperColors; paint?: Pt[][]; creases?: boolean; foldMarks?: boolean }) {
  const { anim, bad, folds, pieces, shapes } = f
  const lay = (L: number) => 2 ** L
  const front = colors.front, back = colors.back

  if (anim || bad) {
    const a: Anim = anim ?? { mode: 'fold', line: bad!, L: f.level, c: -1 }
    const { line, L, c } = a
    if (a.mode === 'fold') {
      const base = shapes[L]
      const st = clipHalf(base, line, -1)
      const fl = clipHalf(base, line, 1)
      return (
        <g>
          <Face poly={st} fill={L === 0 ? front : back} paint={L === 0 ? paint : undefined} paintColor={colors.paint} layers={lay(L)} edge={colors.edge} />
          <Face poly={fl} transform={foldMatrix(line, c)} fill={L === 0 && c > 0 ? front : back} paint={L === 0 && c > 0 ? paint : undefined} paintColor={colors.paint} layers={lay(L)} edge={colors.edge} opacity={bad && !anim ? 0.92 : 1} outline={bad && !anim ? '#d97706' : undefined} />
        </g>
      )
    }
    const H = unfoldImages(pieces, folds, L + 1)
    const fl = clipHalf(shapes[L], line, 1)
    return (
      <g>
        <Face poly={shapes[L + 1]} holes={H} fill={L === 0 ? front : back} paint={L === 0 ? paint : undefined} paintColor={colors.paint} layers={lay(L)} edge={colors.edge} />
        <Face poly={fl} holes={H.map((h) => reflectPoly(line, h))} transform={foldMatrix(line, c)} fill={L === 0 && c > 0 ? front : back} paint={L === 0 && c > 0 ? paint : undefined} paintColor={colors.paint} layers={lay(L)} edge={colors.edge} />
      </g>
    )
  }

  const L = f.level
  const holes = unfoldImages(pieces, folds, L)
  return (
    <g>
      <Face poly={shapes[L]} holes={holes} fill={L === 0 ? front : back} paint={L === 0 ? paint : undefined} paintColor={colors.paint} layers={lay(L)} edge={colors.edge} />
      {L === 0 && creases && creaseSegments(shapes[0], folds).map(([p, q], i) => (
        <line key={i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={colors.edge} strokeWidth={0.8} strokeDasharray="2.5 2" strokeOpacity={0.9} pointerEvents="none" />
      ))}
      {L > 0 && foldMarks && foldEdges(shapes[L], folds).map(([p, q], i) => (
        <g key={i} pointerEvents="none">
          <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={colors.edge} strokeWidth={2.2} strokeLinecap="round" />
        </g>
      ))}
    </g>
  )
}

/** viewBox dizgesi (kenar boşluklu) */
export function viewBoxOf(ps: Pt[], pad = 8) {
  const b = bbox(ps)
  return `${b.x0 - pad} ${b.y0 - pad} ${b.x1 - b.x0 + 2 * pad} ${b.y1 - b.y0 + 2 * pad}`
}

/** İstemci koordinatından SVG kullanıcı koordinatına */
export function svgPoint(svg: SVGSVGElement | null, cx: number, cy: number): Pt {
  if (!svg) return [0, 0]
  const m = svg.getScreenCTM()
  if (!m) return [0, 0]
  const p = new DOMPoint(cx, cy).matrixTransform(m.inverse())
  return [p.x, p.y]
}

/** Çalışma alanı SVG’si: yükseklik ekrana sığar */
export function PaperSvg({ viewBox, children, svgRef, label, onTap, className = '' }: { viewBox: string; children: ReactNode; svgRef?: RefObject<SVGSVGElement | null>; label: string; onTap?: (p: Pt) => void; className?: string }) {
  const local = useRef<SVGSVGElement>(null)
  const ref = svgRef ?? local
  return (
    <svg
      ref={ref as RefObject<SVGSVGElement>}
      viewBox={viewBox}
      role="img"
      aria-label={label}
      className={`mx-auto block h-auto max-h-[min(62dvh,560px)] w-full touch-none select-none ${className}`}
      onClick={onTap ? (e) => {
        if ((e.target as Element).closest('[data-handle]')) return
        onTap(svgPoint(ref.current, e.clientX, e.clientY))
      } : undefined}
    >
      {children}
    </svg>
  )
}

/** Tahmin seçeneği için küçük açılmış kâğıt */
export function Thumb({ paper, holes, colors, creases = [] }: { paper: Pt[]; holes: Pt[][]; colors: PaperColors; creases?: [Pt, Pt][] }) {
  return (
    <svg viewBox={viewBoxOf(paper, 4)} className="mx-auto block h-auto max-h-28 w-full" aria-hidden>
      <Face poly={paper} holes={holes} fill={colors.front} edge={colors.edge} />
      {creases.map(([p, q], i) => <line key={i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={colors.edge} strokeWidth={0.6} strokeDasharray="2 2" strokeOpacity={0.6} />)}
    </svg>
  )
}
