import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'
import { bounds, parseKey, type Kind, type Pattern } from './patterns'

/** Görme biçimi renkleri: 0 başlangıç, 1–2 tekrarlanan gruplar, 3 iki kez sayılan */
export const TONES = ['#f59e0b', '#8b5cf6', '#0ea5e9', '#ef4444']
export const NEW = '#f97316'

const BASE: Record<Kind, string> = { tile: '#a78bfa', dot: '#14b8a6', stick: '#c99a5b' }

type Box = { x0: number; y0: number; x1: number; y1: number }

/** Bir şekli SVG olarak çizer (y yukarı). */
export function FigureSvg({ keys, kind, colorOf, twice, u, box, pad = 0.5, dark, ghost, title, maxW }: { keys: string[]; kind: Kind; colorOf?: (k: string) => string | undefined; twice?: Set<string>; u: number; box?: Box; pad?: number; dark?: boolean; ghost?: string[]; title?: string; maxW?: boolean }) {
  const b = box ?? bounds(keys)
  const W = (b.x1 - b.x0 + 2 * pad) * u
  const H = (b.y1 - b.y0 + 2 * pad) * u
  const X = (x: number) => (x - b.x0 + pad) * u
  const Y = (y: number) => (b.y1 - y + pad) * u
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={maxW ? 'h-auto max-w-full' : 'block'} role="img" aria-label={title ?? `${keys.length} parçalı şekil`}>
      {ghost?.map((k) => <Piece key={`g${k}`} k={k} X={X} Y={Y} u={u} color={dark ? '#475569' : '#e2e8f0'} ghost />)}
      {keys.map((k) => <Piece key={k} k={k} X={X} Y={Y} u={u} color={colorOf?.(k) ?? BASE[kind]} twice={twice?.has(k)} dark={dark} />)}
    </svg>
  )
}

function Piece({ k, X, Y, u, color, twice, ghost, dark }: { k: string; X: (x: number) => number; Y: (y: number) => number; u: number; color: string; twice?: boolean; ghost?: boolean; dark?: boolean }) {
  const it = parseKey(k)
  if (it.kind === 'tile') {
    const i = u * 0.05
    return (
      <g>
        <rect x={X(it.x) + i} y={Y(it.y + 1) + i} width={u - 2 * i} height={u - 2 * i} rx={u * 0.14} fill={color} stroke={ghost ? 'none' : 'rgba(30,27,75,.45)'} strokeWidth={Math.max(1, u * 0.04)} />
        {!ghost && <rect x={X(it.x) + u * 0.18} y={Y(it.y + 1) + u * 0.14} width={u * 0.5} height={u * 0.12} rx={u * 0.06} fill="#fff" opacity={0.35} />}
        {twice && <rect x={X(it.x) + u * 0.12} y={Y(it.y + 1) + u * 0.12} width={u * 0.76} height={u * 0.76} rx={u * 0.12} fill="none" stroke="#fff" strokeWidth={u * 0.08} strokeDasharray={`${u * 0.12} ${u * 0.1}`} />}
      </g>
    )
  }
  if (it.kind === 'dot') {
    return (
      <g>
        <circle cx={X(it.x)} cy={Y(it.y)} r={u * (ghost ? 0.12 : 0.28)} fill={color} stroke={ghost ? 'none' : dark ? '#0f172a' : '#fff'} strokeWidth={Math.max(1, u * 0.05)} />
        {twice && <circle cx={X(it.x)} cy={Y(it.y)} r={u * 0.4} fill="none" stroke={TONES[3]} strokeWidth={u * 0.07} strokeDasharray={`${u * 0.12} ${u * 0.09}`} />}
      </g>
    )
  }
  // kibrit çöpü
  const hor = it.y === it.y2
  const inset = 0.09
  const x1 = X(it.x + (hor ? inset : 0)), y1 = Y(it.y + (hor ? 0 : inset))
  const x2 = X(it.x2 - (hor ? inset : 0)), y2 = Y(it.y2 - (hor ? 0 : inset))
  if (ghost) return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={Math.max(2, u * 0.06)} strokeLinecap="round" strokeDasharray={`${u * 0.08} ${u * 0.1}`} />
  return (
    <g>
      {twice && <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={TONES[3]} strokeWidth={u * 0.3} strokeLinecap="round" opacity={0.35} />}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(0,0,0,.25)" strokeWidth={u * 0.17} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={u * 0.13} strokeLinecap="round" />
      <circle cx={x2} cy={y2} r={u * 0.1} fill="#dc2626" stroke="rgba(0,0,0,.25)" strokeWidth={1} />
    </g>
  )
}

/** Şekil 1..upto şeridi; growth açıksa her şekilde yeni eklenen parçalar turuncu */
export function Strip({ p, upto, growth, dark, extra, u = 16 }: { p: Pattern; upto: number; growth: boolean; dark?: boolean; extra?: ReactNode; u?: number }) {
  const big = p.fig(upto)
  const bb = bounds(big)
  return (
    <div className="flex flex-wrap items-end justify-center gap-2 sm:gap-3">
      {Array.from({ length: upto }, (_, i) => i + 1).map((n) => {
        const keys = p.fig(n)
        const prev = new Set(n > 1 ? p.fig(n - 1) : [])
        const b = bounds(keys)
        // aynı ölçek, aynı dikey hiza (en büyük şeklin yüksekliği)
        const box = { x0: b.x0, x1: b.x1, y0: bb.y0, y1: bb.y1 }
        return (
          <figure key={n} className={`flex flex-col items-center gap-1 rounded-2xl px-2 pt-2 pb-1 ${dark ? 'bg-slate-900/70 ring-1 ring-slate-600' : 'bg-white ring-1 ring-line'}`}>
            <FigureSvg keys={keys} kind={p.kind} u={u} box={box} dark={dark} colorOf={growth && n > 1 ? (k) => (prev.has(k) ? undefined : NEW) : undefined} title={`Şekil ${n}: ${keys.length} ${p.unit}`} />
            <figcaption className={`text-xs font-black ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>Şekil {n}</figcaption>
          </figure>
        )
      })}
      {extra}
    </div>
  )
}

/**
 * Yapım tuvali: karolara/noktalara dokun ya da parmağını sürükleyerek boya; kibritlerde kenarlara dokun.
 * Sürüklemenin ilk öğesi ekle/sil kipini belirler.
 */
export function BuildCanvas({ kind, region, keys, onChange, mark, dark, ghost }: { kind: Kind; region: Box; keys: string[]; onChange: (k: string[]) => void; mark?: (k: string) => string | undefined; dark?: boolean; ghost?: string[] }) {
  const wrap = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [w, setW] = useState(360)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const pad = kind === 'tile' ? 0.15 : 0.5
  const spanX = region.x1 - region.x0 + 2 * pad
  const spanY = region.y1 - region.y0 + 2 * pad
  const u = Math.max(30, Math.min(64, (w - 8) / spanX))
  const W = spanX * u, H = spanY * u
  const X = (x: number) => (x - region.x0 + pad) * u
  const Y = (y: number) => (region.y1 - y + pad) * u
  const latest = useRef(keys)
  latest.current = keys
  const mode = useRef<'add' | 'del'>('add')
  const lastHit = useRef<string | null>(null)

  const hit = (cx: number, cy: number): string | null => {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r) return null
    const ux = region.x0 - pad + ((cx - r.left) / r.width) * spanX
    const uy = region.y1 + pad - ((cy - r.top) / r.height) * spanY
    if (kind === 'tile') {
      const x = Math.floor(ux), y = Math.floor(uy)
      if (x < region.x0 || x >= region.x1 || y < region.y0 || y >= region.y1) return null
      return `t:${x},${y}`
    }
    if (kind === 'dot') {
      const x = Math.round(ux), y = Math.round(uy)
      if (x < region.x0 || x > region.x1 || y < region.y0 || y > region.y1) return null
      if (Math.hypot(ux - x, uy - y) > 0.48) return null
      return `d:${x},${y}`
    }
    const ry = Math.round(uy), rx = Math.round(ux)
    const dh = Math.abs(uy - ry), dv = Math.abs(ux - rx)
    if (Math.min(dh, dv) > 0.36) return null
    if (dh <= dv) {
      const x = Math.floor(ux)
      if (x < region.x0 || x >= region.x1 || ry < region.y0 || ry > region.y1) return null
      return `s:${x},${ry},${x + 1},${ry}`
    }
    const y = Math.floor(uy)
    if (y < region.y0 || y >= region.y1 || rx < region.x0 || rx > region.x1) return null
    return `s:${rx},${y},${rx},${y + 1}`
  }

  const bind = useDrag(
    ({ xy: [cx, cy], first, event }) => {
      event.preventDefault?.()
      const k = hit(cx, cy)
      if (first) {
        lastHit.current = null
        if (!k) return
        mode.current = latest.current.includes(k) ? 'del' : 'add'
      }
      if (!k || k === lastHit.current) return
      lastHit.current = k
      const has = latest.current.includes(k)
      if (mode.current === 'add' && !has) onChange([...latest.current, k])
      if (mode.current === 'del' && has) onChange(latest.current.filter((q) => q !== k))
    },
    { pointer: { capture: true }, filterTaps: false, eventOptions: { passive: false } },
  )

  // aday hedefler (soluk)
  const cands: ReactElement[] = []
  const faint = dark ? '#334155' : '#e5e7f0'
  if (kind === 'tile') {
    for (let x = region.x0; x < region.x1; x++) for (let y = region.y0; y < region.y1; y++) cands.push(<rect key={`${x},${y}`} x={X(x) + 2} y={Y(y + 1) + 2} width={u - 4} height={u - 4} rx={u * 0.14} fill="none" stroke={faint} strokeWidth={1.5} strokeDasharray="4 4" />)
  } else if (kind === 'dot') {
    for (let x = region.x0; x <= region.x1; x++) for (let y = region.y0; y <= region.y1; y++) cands.push(<circle key={`${x},${y}`} cx={X(x)} cy={Y(y)} r={u * 0.1} fill={dark ? '#475569' : '#cbd5e1'} />)
  } else {
    for (let x = region.x0; x <= region.x1; x++) for (let y = region.y0; y <= region.y1; y++) {
      cands.push(<circle key={`p${x},${y}`} cx={X(x)} cy={Y(y)} r={3} fill={dark ? '#64748b' : '#cbd5e1'} />)
      if (x < region.x1) cands.push(<line key={`h${x},${y}`} x1={X(x) + 6} x2={X(x + 1) - 6} y1={Y(y)} y2={Y(y)} stroke={faint} strokeWidth={2} strokeDasharray="3 5" />)
      if (y < region.y1) cands.push(<line key={`v${x},${y}`} x1={X(x)} x2={X(x)} y1={Y(y) - 6} y2={Y(y + 1) + 6} stroke={faint} strokeWidth={2} strokeDasharray="3 5" />)
    }
  }

  return (
    <div ref={wrap} className="w-full">
      <div className={`mx-auto w-fit max-w-full rounded-2xl p-1 ${dark ? 'bg-slate-900 ring-1 ring-slate-600' : 'bg-white ring-1 ring-line'}`} style={{ touchAction: 'none' }}>
        <svg ref={svgRef} {...bind()} viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block h-auto max-w-full cursor-pointer select-none" style={{ touchAction: 'none' }} role="application" aria-label="Yapım alanı: parçaları eklemek için dokun ya da sürükle" data-testid="build-canvas">
          {cands}
          {ghost?.map((k) => <Piece key={`g${k}`} k={k} X={X} Y={Y} u={u} color={dark ? '#64748b' : '#cbd5e1'} ghost />)}
          {keys.map((k) => <Piece key={k} k={k} X={X} Y={Y} u={u} color={mark?.(k) ?? BASE[kind]} dark={dark} />)}
        </svg>
      </div>
    </div>
  )
}
