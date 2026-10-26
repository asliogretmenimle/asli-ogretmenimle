import { useRef, useState, type PointerEvent as RPE } from 'react'
import { createPortal } from 'react-dom'
import { Layers, Trash2, X } from 'lucide-react'
import type { ManipulativeConfig } from '../../data/types'
import { MathText } from '../../components/MathText'
import { ToolButton } from '../ui'
import { n, type ToolDef } from '../types'

/**
 * Kesir Daireleri
 *  - Tepsideki parçaları (1, ½, ⅓, ¼, ⅕, ⅙, ⅛, 1/10, 1/12) bir daireye sürükle ya da dokun (seçili daireye gider).
 *  - Dairedeki parçaya dokun: çıkar, eş parçalara böl (½ → 2 × ¼) ya da aynı parçaları birleştir (2 × ¼ → ½).
 *    Parçayı daireden dışarı sürüklersen çıkar; öbür daireye sürüklersen taşınır.
 *  - İki daire: büyüklükleri karşılaştırılır (>, <, =) ve fark yazılır; “Üst üste koy” ikinci daireyi
 *    birincinin üzerine şeffaf koyar. Eşitlik yakalanır: “2 tane ¼ = 1 tane ½”.
 *  - Görev modunda yalnızca birinci daire görünür ve toplam gizlenir.
 *
 * config: { dens?: number[] } (kullanılabilecek paydalar; 1 = bütün)
 * Hedef biçimleri:
 *  { num, den }               → birinci dairede num/den’e eşit miktar (herhangi parçalarla)
 *  { num, den, exact: true }  → yalnızca 1/den parçalarından tam num tane
 *  { num, den, using: d }     → yalnızca 1/d parçalarıyla num/den’e eşit miktar (ör. ½’yi sekizliklerle)
 */
type V = { circles: [number[], number[]]; active: 0 | 1; stacked: boolean }

const ALL = [1, 2, 3, 4, 5, 6, 8, 10, 12]
const U = 120 // ortak payda (tüm paydaların EKOK’u)
const COLORS: Record<number, [string, string]> = {
  1: ['#fb7185', '#be123c'], 2: ['#fb923c', '#c2410c'], 3: ['#facc15', '#a16207'], 4: ['#4ade80', '#15803d'],
  5: ['#2dd4bf', '#0f766e'], 6: ['#22d3ee', '#0e7490'], 8: ['#60a5fa', '#1d4ed8'], 10: ['#a78bfa', '#6d28d9'], 12: ['#f472b6', '#be185d'],
}
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
const units = (ps: number[]) => ps.reduce((s, d) => s + U / d, 0)
const frac = (u: number) => { const g = gcd(u, U) || 1; return { p: u / g, q: U / g } }
const fracText = (u: number) => { const f = frac(u); return f.p === 0 ? '0' : f.q === 1 ? `${f.p}` : `[[${f.p}/${f.q}]]` }
const unitText = (d: number) => (d === 1 ? '1' : `[[1/${d}]]`)

function wedge(cx: number, cy: number, r: number, a0: number, a1: number) {
  if (a1 - a0 >= 0.9999) return `M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
  const p = (a: number) => [cx + r * Math.sin(a * 2 * Math.PI), cy - r * Math.cos(a * 2 * Math.PI)]
  const [x0, y0] = p(a0), [x1, y1] = p(a1)
  return `M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 0.5 ? 1 : 0} 1 ${x1} ${y1} Z`
}

const C = 130, R = 116

function Defs() {
  return (
    <defs>
      {Object.entries(COLORS).map(([d, [a, b]]) => (
        <radialGradient key={d} id={`kd-${d}`} gradientUnits="userSpaceOnUse" cx={C} cy={C} r={R}>
          <stop offset="0%" stopColor={a} stopOpacity={0.55} />
          <stop offset="35%" stopColor={a} stopOpacity={0.8} />
          <stop offset="88%" stopColor={a} />
          <stop offset="100%" stopColor={b} />
        </radialGradient>
      ))}
      <filter id="kd-sh" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#1f2340" floodOpacity="0.18" /></filter>
    </defs>
  )
}

function Circle({ pieces, idx, sel, active, bind, overlay, label }: { pieces: number[]; idx: number; sel: number | null; active: boolean; bind?: (i: number) => Record<string, unknown>; overlay?: number[]; label: string }) {
  let a = 0
  const segs = pieces.map((d) => { const s = { d, a0: a, a1: a + 1 / d }; a += 1 / d; return s })
  let b = 0
  const over = (overlay ?? []).map((d) => { const s = { d, a0: b, a1: b + 1 / d }; b += 1 / d; return s })
  return (
    <svg viewBox="0 0 260 260" className="block w-full select-none" data-circle={idx} role="img" aria-label={label} style={{ touchAction: bind ? 'none' : 'auto' }}>
      <Defs />
      <circle cx={C} cy={C} r={R + 6} fill={active ? '#fde8ef' : '#f4f4f8'} />
      <circle cx={C} cy={C} r={R} fill="#fff" stroke="#c9cbe0" strokeWidth={2} strokeDasharray="6 5" />
      {segs.map((s, i) => (
        <path
          key={i}
          d={wedge(C, C, R, s.a0, s.a1)}
          fill={`url(#kd-${s.d})`}
          stroke={sel === i ? '#1f2340' : '#fff'}
          strokeWidth={sel === i ? 4 : 2.5}
          strokeLinejoin="round"
          filter="url(#kd-sh)"
          style={{ touchAction: 'none', cursor: bind ? 'grab' : 'default', transformOrigin: `${C}px ${C}px`, transform: sel === i ? 'scale(1.035)' : undefined, transition: 'transform 150ms' }}
          {...(bind ? bind(i) : {})}
        />
      ))}
      {segs.map((s, i) => {
        const m = (s.a0 + s.a1) / 2
        const rr = s.d === 1 ? 0 : R * 0.64
        const fs = s.d >= 10 ? 14 : s.d >= 6 ? 18 : 25
        return (
          <g key={`t${i}`} pointerEvents="none" transform={`translate(${C + rr * Math.sin(m * 2 * Math.PI)} ${C - rr * Math.cos(m * 2 * Math.PI)})`}>
            {s.d === 1 ? <text y={10} textAnchor="middle" fontSize={30} fontWeight={900} fill="#fff">1</text> : (
              <>
                <text y={-3} textAnchor="middle" fontSize={fs} fontWeight={900} fill="#1f2340">1</text>
                <line x1={-fs * 0.45} x2={fs * 0.45} y1={1} y2={1} stroke="#1f2340" strokeWidth={2} />
                <text y={fs * 0.95} textAnchor="middle" fontSize={fs} fontWeight={900} fill="#1f2340">{s.d}</text>
              </>
            )}
          </g>
        )
      })}
      {over.map((s, i) => <path key={`o${i}`} d={wedge(C, C, R - 2, s.a0, s.a1)} fill="#1f2340" fillOpacity={0.08} stroke="#1f2340" strokeWidth={3} strokeDasharray="7 5" pointerEvents="none" />)}
      {overlay && b > 0 && b < 0.9999 && (
        <line x1={C} y1={C} x2={C + (R + 8) * Math.sin(b * 2 * Math.PI)} y2={C - (R + 8) * Math.cos(b * 2 * Math.PI)} stroke="#1f2340" strokeWidth={4} strokeLinecap="round" pointerEvents="none" />
      )}
    </svg>
  )
}

function TrayPiece({ d }: { d: number }) {
  return (
    <svg viewBox="0 0 64 64" className="block size-full" aria-hidden>
      <path d={d === 1 ? wedge(32, 34, 26, 0, 1) : wedge(32, 40, 30, -0.5 / d, 0.5 / d)} fill={COLORS[d][0]} stroke={COLORS[d][1]} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  )
}

type Src = { kind: 'tray'; d: number } | { kind: 'piece'; c: 0 | 1; i: number }

function Component({ value, onChange, config, target, locked }: { value: V; onChange: (v: V) => void; config: ManipulativeConfig; target?: Record<string, unknown>; locked?: boolean }) {
  const dens = (config.dens ?? ALL).filter((d) => ALL.includes(d))
  const free = !target
  const [sel, setSel] = useState<{ c: 0 | 1; i: number } | null>(null)
  const [warn, setWarn] = useState<string | null>(null)
  const [ghost, setGhost] = useState<{ d: number; x: number; y: number } | null>(null)
  const press = useRef<{ src: Src; x0: number; y0: number; drag: boolean; id: number } | null>(null)
  const nCircles = free ? 2 : 1
  const totals = value.circles.map(units)

  const setCircle = (c: 0 | 1, ps: number[], extra: Partial<V> = {}) => {
    const circles = value.circles.slice() as [number[], number[]]
    circles[c] = ps
    onChange({ ...value, ...extra, circles })
  }
  const add = (c: 0 | 1, d: number) => {
    if (locked) return
    if (totals[c] + U / d > U) { setWarn(`Bu dairede yalnızca ${fracText(U - totals[c])} boşluk kaldı; ${unitText(d)} sığmıyor.`); return }
    setWarn(null)
    setSel(null)
    setCircle(c, [...value.circles[c], d], { active: c })
  }
  const removeAt = (c: 0 | 1, i: number) => { setCircle(c, value.circles[c].filter((_, j) => j !== i)); setSel(null) }
  const movePiece = (from: 0 | 1, i: number, to: 0 | 1) => {
    const d = value.circles[from][i]
    if (from === to) return
    if (totals[to] + U / d > U) { setWarn(`Öbür dairede ${unitText(d)} için yer yok.`); return }
    const circles = value.circles.slice() as [number[], number[]]
    circles[from] = circles[from].filter((_, j) => j !== i)
    circles[to] = [...circles[to], d]
    onChange({ ...value, circles, active: to })
    setSel(null)
  }
  const splitPiece = (c: 0 | 1, i: number, into: number) => {
    const d = value.circles[c][i]
    const k = into / d
    const ps = value.circles[c].slice()
    ps.splice(i, 1, ...Array(k).fill(into))
    setCircle(c, ps)
    setSel(null)
  }
  const mergePieces = (c: 0 | 1, i: number, into: number) => {
    const d = value.circles[c][i]
    const m = d / into
    const ps = value.circles[c].slice()
    let need = m
    const keep: number[] = []
    // seçili parçadan başlayarak aynı parçaları topla
    const order = [i, ...ps.map((_, j) => j).filter((j) => j !== i)]
    const take = new Set<number>()
    for (const j of order) if (need && ps[j] === d) { take.add(j); need-- }
    ps.forEach((x, j) => { if (j === Math.min(...take)) keep.push(into); if (!take.has(j)) keep.push(x) })
    setCircle(c, keep)
    setSel(null)
  }

  // ── sürükle / dokun ──
  const down = (src: Src) => (e: RPE<Element>) => {
    if (locked || e.button > 0) return
    e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    press.current = { src, x0: e.clientX, y0: e.clientY, drag: false, id: e.pointerId }
  }
  const srcDen = (s: Src) => (s.kind === 'tray' ? s.d : value.circles[s.c][s.i])
  const move = (e: RPE<Element>) => {
    const s = press.current
    if (!s || s.id !== e.pointerId) return
    if (!s.drag && Math.hypot(e.clientX - s.x0, e.clientY - s.y0) > 8) s.drag = true
    if (s.drag) setGhost({ d: srcDen(s.src), x: e.clientX, y: e.clientY })
  }
  const up = (e: RPE<Element>) => {
    const s = press.current
    press.current = null
    setGhost(null)
    if (!s || s.id !== e.pointerId) return
    if (!s.drag) {
      if (s.src.kind === 'tray') return add(value.active, s.src.d)
      const { c, i } = s.src
      setWarn(null)
      return setSel(sel && sel.c === c && sel.i === i ? null : { c, i })
    }
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-circle]') as HTMLElement | null
    const to = el ? (Number(el.dataset.circle) as 0 | 1) : null
    if (s.src.kind === 'tray') { if (to !== null) add(to, s.src.d); return }
    if (to === null) removeAt(s.src.c, s.src.i)
    else movePiece(s.src.c, s.src.i, to)
  }
  const handlers = (src: Src) => ({ onPointerDown: down(src), onPointerMove: move, onPointerUp: up, onPointerCancel: () => { press.current = null; setGhost(null) } })

  const selD = sel ? value.circles[sel.c][sel.i] : null
  const splits = selD ? dens.filter((x) => x > selD && x % selD === 0) : []
  const merges = selD && sel ? dens.filter((x) => x < selD && selD % x === 0 && value.circles[sel.c].filter((y) => y === selD).length >= selD / x) : []

  const describe = (ps: number[]) => {
    if (!ps.length) return null
    const groups = [...new Set(ps)].sort((a, b) => a - b).map((d) => ({ d, k: ps.filter((x) => x === d).length }))
    const u = units(ps)
    const parts = groups.map((g) => `${g.k} tane ${unitText(g.d)}`)
    const homo = groups.length === 1 ? groups[0] : null
    const raw = homo && homo.d > 1 ? `[[${homo.k}/${homo.d}]]` : null
    const simple = fracText(u)
    return { text: parts.join(' + '), raw, simple, u, homo }
  }
  const da = describe(value.circles[0]), db = describe(value.circles[1])
  const cmp = free && da && db ? Math.sign(totals[0] - totals[1]) : null

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`grid w-full gap-3 ${nCircles === 2 && !value.stacked ? 'max-w-3xl grid-cols-2' : 'max-w-sm grid-cols-1'}`}>
        {(value.stacked ? [0] : nCircles === 2 ? [0, 1] : [0]).map((c) => {
          const ci = c as 0 | 1
          return (
            <div key={c} className="flex flex-col items-center gap-1">
              <button type="button" onClick={() => !locked && onChange({ ...value, active: ci })} className={`min-h-9 rounded-full px-3 text-xs font-extrabold tracking-wide uppercase ${value.active === ci && nCircles === 2 && !value.stacked ? 'bg-brand text-white' : 'text-ink-soft'}`}>
                {value.stacked ? '1. daire + 2. daire (kesikli)' : nCircles === 2 ? `${c + 1}. daire` : 'Bütün'}
              </button>
              <div className="w-full">
                <Circle pieces={value.circles[ci]} idx={ci} sel={sel && sel.c === ci ? sel.i : null} active={value.active === ci && nCircles === 2} bind={locked ? undefined : (i) => handlers({ kind: 'piece', c: ci, i })} overlay={value.stacked ? value.circles[1] : undefined} label={`${c + 1}. daire`} />
              </div>
              {(free || locked) && !value.stacked && (
                <div className="min-h-8 text-center text-lg font-black text-ink">
                  {totals[ci] ? <MathText text={fracText(totals[ci])} /> : <span className="text-sm font-bold text-ink-soft">boş</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {sel && selD !== null && !locked && (
        <div className="flex w-full max-w-2xl flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-white p-2 ring-2 ring-ink/15">
          <span className="px-1 text-sm font-extrabold">Seçili: <MathText text={unitText(selD)} /></span>
          <ToolButton onClick={() => removeAt(sel.c, sel.i)}><X size={16} />Çıkar</ToolButton>
          {splits.map((x) => <ToolButton key={`s${x}`} onClick={() => splitPiece(sel.c, sel.i, x)}><span>Böl: {x / selD} × </span><MathText text={unitText(x)} /></ToolButton>)}
          {merges.map((x) => <ToolButton key={`m${x}`} onClick={() => mergePieces(sel.c, sel.i, x)}><span>{selD / x} × </span><MathText text={unitText(selD)} /><span> → </span><MathText text={unitText(x)} /></ToolButton>)}
        </div>
      )}
      {warn && <p className="rounded-2xl bg-amber-50 px-4 py-2 text-center text-sm font-extrabold text-amber-900 ring-1 ring-amber-200"><MathText text={warn} /></p>}

      {/* Tepsi */}
      <div className="w-full max-w-3xl">
        <div className="mb-1 text-center text-xs font-extrabold tracking-wide text-ink-soft uppercase">Parçalar · dokun ya da daireye sürükle</div>
        <div className="grid grid-cols-5 gap-1.5 rounded-2xl bg-paper p-2 ring-1 ring-line sm:grid-cols-9">
          {dens.map((d) => (
            <button key={d} type="button" aria-label={d === 1 ? 'Bütün parça' : `1 bölü ${d} parça`} {...handlers({ kind: 'tray', d })} onClick={(e) => { if (e.detail === 0) add(value.active, d) }} disabled={locked} className="flex min-h-16 flex-col items-center justify-center rounded-xl bg-white p-1 ring-1 ring-line transition active:scale-95 disabled:opacity-40" style={{ touchAction: 'none' }}>
              <span className="block h-10 w-12"><TrayPiece d={d} /></span>
              <span className="text-sm font-black text-ink"><MathText text={unitText(d)} /></span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {free && <ToolButton active={value.stacked} onClick={() => { setSel(null); onChange({ ...value, stacked: !value.stacked }) }} disabled={!value.circles[0].length || !value.circles[1].length}><Layers size={16} />Üst üste koy</ToolButton>}
        <ToolButton disabled={locked || (!value.circles[0].length && !value.circles[1].length)} onClick={() => { setSel(null); setWarn(null); onChange({ ...value, circles: [[], []], stacked: false }) }}><Trash2 size={16} />Temizle</ToolButton>
      </div>

      {(free || locked) && (da || db) && (
        <div className="w-full max-w-2xl space-y-1.5 rounded-2xl bg-ink px-4 py-3 text-center text-white">
          {[da, db].slice(0, nCircles).map((d, i) => d && (
            <div key={i} className="text-base font-extrabold">
              {nCircles === 2 && <span className="mr-2 text-xs font-bold tracking-wide text-white/55 uppercase">{i + 1}. daire</span>}
              <MathText text={d.text} />
              <span className="mx-1">=</span>
              {d.raw && d.raw !== d.simple ? <><span className="text-xl"><MathText text={d.raw} /></span><span className="mx-1">=</span></> : null}
              <span className="text-xl text-amber-300"><MathText text={d.simple} /></span>
              {d.u < U && <span className="ml-2 text-sm text-white/60">(bütüne <MathText text={fracText(U - d.u)} /> kaldı)</span>}
            </div>
          ))}
          {cmp !== null && da && db && (
            <div className="mt-1 border-t border-white/15 pt-2 text-xl font-black">
              {cmp === 0 ? (
                <span className="text-emerald-300">
                  Eşit! <MathText text={da.homo && db.homo ? `${da.homo.k} tane ${unitText(da.homo.d)} = ${db.homo.k} tane ${unitText(db.homo.d)}` : `${da.raw ?? da.simple} = ${db.raw ?? db.simple}`} />
                </span>
              ) : (
                <span>
                  <MathText text={`${da.simple} ${cmp > 0 ? '>' : '<'} ${db.simple}`} />
                  <span className="ml-2 text-base text-white/70">fark: <MathText text={fracText(Math.abs(totals[0] - totals[1]))} /></span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {ghost && createPortal(
        <div className="pointer-events-none fixed z-[100] size-20 -translate-x-1/2 -translate-y-1/2 drop-shadow-lg" style={{ left: ghost.x, top: ghost.y }}>
          <TrayPiece d={ghost.d} />
        </div>,
        document.body,
      )}
    </div>
  )
}

export const kesirdaireleri: ToolDef<V> = {
  id: 'kesirdaireleri',
  defaultConfig: { dens: ALL },
  initial: () => ({ circles: [[], []], active: 0, stacked: false }),
  check: (v, t) => {
    const ps = v.circles[0]
    const num = n(t, 'num'), den = n(t, 'den', 1)
    if (t.exact) return ps.length === num && ps.every((d) => d === den)
    if (typeof t.using === 'number' && !ps.every((d) => d === n(t, 'using'))) return false
    return units(ps) * den === num * U
  },
  Component,
}
