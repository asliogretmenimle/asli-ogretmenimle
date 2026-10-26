import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'
import { Check, RotateCw, Save, Scissors } from 'lucide-react'
import type { Grade } from '../../data/types'
import type { InteractionProps } from '../types'
import { MathText } from '../../components/MathText'
import { Nudge, Scene, StrategyPicker, useSolutions } from '../../games/kit2'
import { ZoomBox } from '../../interactive/ZoomBox'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { ek } from '../../lib/generators'
import { Choice, NextButton, Pad, Panel, Stepper, TopBar, fmtN, useLook, type Look } from '../islem-zinciri/kit'

/**
 * 32. Çarpım Dikdörtgenleri
 *  Izgara tahtasında köşe tutamacını sürükleyerek (ya da bir kareye dokunarak) dikdörtgen/dizilim kurulur.
 *  ✂ tutamaçlarıyla dikdörtgen bölünür: dağılma özelliği ve kısmi çarpımlar canlı denklemle belirir.
 *  Görevler: hikâyeden dizilim kur (tekrarlı toplama, döndür = değişme), bir alanın tüm dikdörtgenlerini bul,
 *  bilinen çarpımlara böl, alan modeliyle kısmi çarpımları doldur, eksik kenarı bul (bölme).
 */

// ───────────────────────── Görev verisi ─────────────────────────

interface Build { kind: 'build'; title: string; rows: number; cols: number; emoji: string; noun: string }
interface All { kind: 'all'; title: string; area: number; max: number }
interface Split { kind: 'split'; title: string; rows: number; cols: number; need: number }
interface Partial { kind: 'partial'; title: string; rows: number; cols: number }
interface Missing { kind: 'missing'; title: string; area: number; rows: number; maxC: number }
type Task = Build | All | Split | Partial | Missing

function tasksFor(grade: Grade): Task[] {
  switch (grade) {
    case 2:
      return [
        { kind: 'build', title: 'Tepsiye 3 sıra kurabiye diz, her sırada 4 kurabiye olsun.', rows: 3, cols: 4, emoji: '🍪', noun: 'kurabiye' },
        { kind: 'all', title: '12 kurabiyeyi dikdörtgen biçiminde kaç farklı şekilde dizebilirsin?', area: 12, max: 12 },
        { kind: 'missing', title: '15 çilek 3 sıraya eşit dizilecek. Her sırada kaç çilek olur?', area: 15, rows: 3, maxC: 10 },
        { kind: 'build', title: 'Bahçeye 2 sıra fidan dik, her sırada 5 fidan olsun.', rows: 2, cols: 5, emoji: '🌱', noun: 'fidan' },
        { kind: 'all', title: '10 balonu dikdörtgen biçiminde kaç farklı şekilde dizebilirsin?', area: 10, max: 10 },
      ]
    case 3:
      return [
        { kind: 'all', title: 'Alanı 24 birim kare olan tüm dikdörtgenleri bul.', area: 24, max: 12 },
        { kind: 'split', title: '7 × 8’i bildiğin iki çarpıma böl. İki farklı yol bul.', rows: 7, cols: 8, need: 2 },
        { kind: 'missing', title: '36 kare 4 sıraya eşit dizilecek. Her sırada kaç kare olur?', area: 36, rows: 4, maxC: 12 },
        { kind: 'split', title: '6 × 9’u kolay parçalara böl. İki farklı yol bul.', rows: 6, cols: 9, need: 2 },
        { kind: 'all', title: 'Alanı 18 birim kare olan tüm dikdörtgenleri bul.', area: 18, max: 12 },
      ]
    case 4:
      return [
        { kind: 'all', title: 'Alanı 36 birim kare olan tüm dikdörtgenleri bul.', area: 36, max: 12 },
        { kind: 'split', title: '9 × 7’yi kolay parçalara böl. İki farklı yol bul.', rows: 9, cols: 7, need: 2 },
        { kind: 'partial', title: '14 × 6’yı alan modeliyle çöz: dikdörtgeni böl, parçaları hesapla.', rows: 6, cols: 14 },
        { kind: 'partial', title: '23 × 4’ü alan modeliyle çöz.', rows: 4, cols: 23 },
        { kind: 'missing', title: '72 kare 6 sıraya eşit dizilecek. Her sırada kaç kare olur?', area: 72, rows: 6, maxC: 15 },
      ]
    default:
      return [
        { kind: 'partial', title: '23 × 15’i alan modeliyle çöz: iki yönden de böl.', rows: 15, cols: 23 },
        { kind: 'all', title: 'Alanı 48 birim kare olan, kenarları 12’yi geçmeyen tüm dikdörtgenleri bul.', area: 48, max: 12 },
        { kind: 'partial', title: '34 × 12’yi alan modeliyle çöz.', rows: 12, cols: 34 },
        { kind: 'missing', title: '96 kare 8 sıraya eşit dizilecek. Her sırada kaç kare olur?', area: 96, rows: 8, maxC: 15 },
        { kind: 'split', title: '12 × 15’i iki farklı biçimde kolay parçalara böl.', rows: 12, cols: 15, need: 2 },
      ]
  }
}

const pairsOf = (n: number, max: number) => {
  const out: [number, number][] = []
  for (let a = 1; a * a <= n; a++) if (n % a === 0 && n / a <= max) out.push([a, n / a])
  return out
}

// ───────────────────────── Tahta ─────────────────────────

const PART = ['#f97316', '#3b82f6', '#22c55e', '#a855f7']
const PART_SOFT = ['#fed7aa', '#bfdbfe', '#bbf7d0', '#e9d5ff']

interface BoardProps {
  look: Look
  maxR: number
  maxC: number
  rows: number
  cols: number
  onSize?: (r: number, c: number) => void
  lockRows?: boolean
  sr?: number
  sc?: number
  onCut?: (sr: number, sc: number) => void
  emoji?: string
  labels?: (i: number, r: number, c: number) => string | null
  onPart?: (i: number) => void
  activePart?: number | null
  tens?: boolean
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(600)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  return { ref, w }
}

function Board({ look, maxR, maxC, rows, cols, onSize, lockRows, sr = 0, sc = 0, onCut, emoji, labels, onPart, activePart, tens }: BoardProps) {
  const { ref, w } = useWidth()
  const ML = onCut ? 46 : 34, MT = onCut ? 46 : 34, PAD = 16
  const cell = Math.max(8, Math.min(look.big ? 56 : 48, Math.floor((w - ML - PAD) / maxC)))
  const W = ML + maxC * cell + PAD
  const H = MT + maxR * cell + PAD
  const svgRef = useRef<SVGSVGElement>(null)
  const toCell = (cx: number, cy: number) => {
    const r = svgRef.current!.getBoundingClientRect()
    const k = W / r.width
    return { x: ((cx - r.left) * k - ML) / cell, y: ((cy - r.top) * k - MT) / cell }
  }
  const clampI = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

  const corner = useDrag(({ xy: [x, y], event }) => {
    event.stopPropagation()
    if (!onSize) return
    const p = toCell(x, y)
    onSize(lockRows ? rows : clampI(Math.round(p.y), 1, maxR), clampI(Math.round(p.x), 1, maxC))
  }, { filterTaps: true })
  const cutR = useDrag(({ xy: [x, y], event }) => {
    event.stopPropagation()
    if (!onCut) return
    const p = toCell(x, y)
    onCut(clampI(Math.round(p.y), 0, rows - 1), sc)
  }, { filterTaps: true })
  const cutC = useDrag(({ xy: [x, y], event }) => {
    event.stopPropagation()
    if (!onCut) return
    const p = toCell(x, y)
    onCut(sr, clampI(Math.round(p.x), 0, cols - 1))
  }, { filterTaps: true })

  const rs = sr > 0 && sr < rows ? [sr, rows - sr] : [rows]
  const cs = sc > 0 && sc < cols ? [sc, cols - sc] : [cols]
  const parts: { i: number; x: number; y: number; r: number; c: number }[] = []
  let yy = 0
  rs.forEach((r, ri) => {
    let xx = 0
    cs.forEach((c, ci) => {
      parts.push({ i: ri * cs.length + ci, x: xx, y: yy, r, c })
      xx += c
    })
    yy += r
  })
  const X = (c: number) => ML + c * cell
  const Y = (r: number) => MT + r * cell
  const grid = look.dark ? '#334155' : '#e2e8f0'
  const ink = look.dark ? '#e2e8f0' : '#1f2340'
  const fs = Math.max(12, Math.min(22, cell * 0.55))

  return (
    <div ref={ref} className="w-full select-none">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, touchAction: 'manipulation' }} className="mx-auto block" role="img" aria-label={`${rows} satır, ${cols} sütunluk dikdörtgen`}>
        {/* boş ızgara (dokun: boyut) */}
        {Array.from({ length: maxR }, (_, r) =>
          Array.from({ length: maxC }, (_, c) => (
            <rect key={`${r}-${c}`} x={X(c) + 1} y={Y(r) + 1} width={cell - 2} height={cell - 2} rx={Math.min(6, cell / 6)} fill={look.dark ? '#1e293b' : '#ffffff'} stroke={grid}
              onClick={onSize ? () => onSize(lockRows ? rows : r + 1, c + 1) : undefined} style={{ cursor: onSize ? 'pointer' : 'default' }} />
          )),
        )}
        {/* parçalar */}
        {parts.map((p) => (
          <g key={p.i} onClick={onPart ? () => onPart(p.i) : undefined} style={{ cursor: onPart ? 'pointer' : undefined }}>
            <rect x={X(p.x)} y={Y(p.y)} width={p.c * cell} height={p.r * cell} rx={8} fill={parts.length > 1 ? PART_SOFT[p.i] : PART_SOFT[0]} stroke={parts.length > 1 ? PART[p.i] : PART[0]} strokeWidth={activePart === p.i ? 5 : 2.5} opacity={0.95} />
            {!emoji && cell >= 14 && Array.from({ length: p.r }, (_, r) => Array.from({ length: p.c }, (_, c) => (
              <rect key={`${r}-${c}`} x={X(p.x + c) + 2} y={Y(p.y + r) + 2} width={cell - 4} height={cell - 4} rx={Math.min(5, cell / 6)} fill={parts.length > 1 ? PART[p.i] : PART[0]} opacity={0.32} pointerEvents="none" />
            )))}
            {!emoji && cell < 14 && tens && Array.from({ length: Math.floor(p.c / 10) + 1 }, (_, k) => k * 10 < p.c && k > 0 ? <line key={k} x1={X(p.x + k * 10)} x2={X(p.x + k * 10)} y1={Y(p.y)} y2={Y(p.y + p.r)} stroke={PART[p.i]} strokeOpacity={0.35} strokeDasharray="3 3" pointerEvents="none" /> : null)}
            {emoji && Array.from({ length: p.r }, (_, r) => Array.from({ length: p.c }, (_, c) => (
              <text key={`${r}-${c}`} x={X(p.x + c) + cell / 2} y={Y(p.y + r) + cell / 2 + cell * 0.18} fontSize={cell * 0.55} textAnchor="middle" pointerEvents="none">{emoji}</text>
            )))}
            {labels && (() => {
              const t = labels(p.i, p.r, p.c)
              if (!t) return null
              const room = p.c * cell - 8
              const f = Math.max(9, Math.min(fs, room / (t.length * 0.58)))
              const vertical = f < 11 && p.r * cell > p.c * cell * 2
              const ff = vertical ? Math.max(9, Math.min(fs, (p.r * cell - 8) / (t.length * 0.58))) : f
              const bw = Math.min(vertical ? p.r * cell - 6 : room + 2, t.length * ff * 0.6 + 12)
              const cx = X(p.x) + (p.c * cell) / 2, cy = Y(p.y) + (p.r * cell) / 2
              return (
                <g pointerEvents="none" transform={vertical ? `rotate(-90 ${cx} ${cy})` : undefined}>
                  <rect x={cx - bw / 2} y={cy - ff * 0.85} width={bw} height={ff * 1.7} rx={8} fill={look.dark ? '#0f172a' : '#ffffff'} opacity={0.92} />
                  <text x={cx} y={cy + ff * 0.36} textAnchor="middle" fontSize={ff} fontWeight={900} fill={parts.length > 1 ? PART[p.i] : look.dark ? '#fdba74' : '#c2410c'}>{t}</text>
                </g>
              )
            })()}
          </g>
        ))}
        {/* kenar ölçüleri */}
        {cs.map((c, k) => {
          const x0 = k === 0 ? 0 : cs[0]
          return <text key={`c${k}`} x={X(x0) + (c * cell) / 2} y={MT - (onCut ? 26 : 10)} textAnchor="middle" fontSize={17} fontWeight={900} fill={ink}>{c}</text>
        })}
        {rs.map((r, k) => {
          const y0 = k === 0 ? 0 : rs[0]
          return <text key={`r${k}`} x={ML - (onCut ? 30 : 12)} y={Y(y0) + (r * cell) / 2 + 6} textAnchor="middle" fontSize={17} fontWeight={900} fill={ink}>{r}</text>
        })}
        {/* kesim çizgileri ve tutamaçları */}
        {onCut && (
          <>
            {sr > 0 && <line x1={X(0) - 6} x2={X(cols) + 6} y1={Y(sr)} y2={Y(sr)} stroke="#0f172a" strokeWidth={3} strokeDasharray="7 5" pointerEvents="none" />}
            {sc > 0 && <line y1={Y(0) - 6} y2={Y(rows) + 6} x1={X(sc)} x2={X(sc)} stroke="#0f172a" strokeWidth={3} strokeDasharray="7 5" pointerEvents="none" />}
            <g {...cutR()} data-handle style={{ cursor: 'ns-resize', touchAction: 'none' }} aria-label="Satır kesimi tutamacı">
              <circle cx={ML - 16} cy={Y(sr)} r={26} fill="transparent" />
              <circle cx={ML - 16} cy={Y(sr)} r={14} fill="#0f172a" stroke="#fff" strokeWidth={2} />
              <text x={ML - 16} y={Y(sr) + 5} textAnchor="middle" fontSize={14} fill="#fff">✂</text>
            </g>
            <g {...cutC()} data-handle style={{ cursor: 'ew-resize', touchAction: 'none' }} aria-label="Sütun kesimi tutamacı">
              <circle cx={X(sc)} cy={MT - 16} r={26} fill="transparent" />
              <circle cx={X(sc)} cy={MT - 16} r={14} fill="#0f172a" stroke="#fff" strokeWidth={2} />
              <text x={X(sc)} y={MT - 11} textAnchor="middle" fontSize={14} fill="#fff">✂</text>
            </g>
          </>
        )}
        {/* köşe tutamacı */}
        {onSize && (
          <g {...corner()} data-handle style={{ cursor: 'nwse-resize', touchAction: 'none' }} aria-label="Köşe tutamacı">
            <circle cx={X(cols)} cy={Y(rows)} r={30} fill="transparent" />
            <circle cx={X(cols)} cy={Y(rows)} r={look.big ? 17 : 14} fill={look.accent} stroke="#fff" strokeWidth={4} />
            <path d={`M ${X(cols) - 5} ${Y(rows) + 5} L ${X(cols) + 5} ${Y(rows) - 5} M ${X(cols) + 1} ${Y(rows) - 5} L ${X(cols) + 5} ${Y(rows) - 5} L ${X(cols) + 5} ${Y(rows) - 1}`} stroke="#fff" strokeWidth={2.4} fill="none" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </div>
  )
}

/** Dikdörtgenden türeyen denklem */
function equation(rows: number, cols: number, sr: number, sc: number, opts: { repeated?: boolean; hideTotal?: boolean } = {}): string {
  const R = sr > 0 && sr < rows ? [sr, rows - sr] : [rows]
  const C = sc > 0 && sc < cols ? [sc, cols - sc] : [cols]
  const total = opts.hideTotal ? '?' : fmtN(rows * cols)
  if (R.length === 1 && C.length === 1) {
    if (opts.repeated) return `${Array(rows).fill(cols).join(' + ')} = ${total}  →  ${rows} × ${cols} = ${total}`
    return `${rows} × ${cols} = ${total}`
  }
  const rS = R.length > 1 ? `(${R.join(' + ')})` : `${rows}`
  const cS = C.length > 1 ? `(${C.join(' + ')})` : `${cols}`
  const prods = R.flatMap((r) => C.map((c) => `${r} × ${c}`))
  const vals = R.flatMap((r) => C.map((c) => fmtN(r * c)))
  return `${rows} × ${cols} = ${rS} × ${cS} = ${prods.join(' + ')}${opts.hideTotal ? '' : ` = ${vals.join(' + ')} = ${total}`}`
}

function EqStrip({ look, text }: { look: Look; text: string }) {
  return (
    <div className={`mt-3 rounded-2xl px-4 py-3 text-center text-lg leading-relaxed font-black tabular-nums sm:text-xl ${look.dark ? 'bg-slate-900/70 text-cyan-100 ring-1 ring-slate-700' : 'bg-white/90 text-ink ring-1 ring-line'}`} aria-live="polite">
      <MathText text={text} />
    </div>
  )
}

function MiniRect({ r, c, look }: { r: number; c: number; look: Look }) {
  const s = Math.min(6, 60 / Math.max(r, c))
  return (
    <span className={`inline-flex flex-col items-center gap-1 rounded-xl p-2 animate-pop ${look.dark ? 'bg-slate-900 ring-1 ring-slate-700' : 'bg-emerald-50'}`}>
      <svg width={c * s + 2} height={r * s + 2} aria-hidden><rect x={1} y={1} width={c * s} height={r * s} rx={2} fill="#22c55e" opacity={0.5} stroke="#15803d" /></svg>
      <span className={`text-sm font-black ${look.dark ? 'text-emerald-200' : 'text-emerald-800'}`}>{r} × {c}</span>
    </span>
  )
}

// ───────────────────────── Görevler ─────────────────────────

type Say = { q: string; tone?: 'ok'; mis?: string; k: number } | null
interface Res { first: boolean; found: number }

function useSay() {
  const [say, setSay] = useState<Say>(null)
  const nudge = (q: string, tone?: 'ok', mis?: string) => setSay((s) => ({ q, tone, mis, k: (s?.k ?? 0) + 1 }))
  return { say, setSay, nudge }
}

function Layout({ grade, look, board, panel }: { grade: Grade; look: Look; board: ReactNode; panel: ReactNode }) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
      <Scene grade={grade}>{board}</Scene>
      <div className="space-y-3 lg:sticky lg:top-20">
        <Panel look={look} title="Atölye masası" icon={<span aria-hidden>📐</span>}>{panel}</Panel>
      </div>
    </div>
  )
}

function BuildTask({ t, grade, look, onDone, last }: { t: Build; grade: Grade; look: Look; onDone: (r: Res) => void; last: boolean }) {
  const track = useTracker()
  const { say, setSay, nudge } = useSay()
  const [size, setSize] = useState({ r: 1, c: 1 })
  const [phase, setPhase] = useState<'build' | 'count' | 'rotate' | 'done'>('build')
  const [bad, setBad] = useState<number[]>([])
  const misses = useRef(0)
  const N = t.rows * t.cols
  const check = () => {
    if (size.r === t.rows && size.c === t.cols) {
      track.attempt(true)
      sfx.ok()
      setSay(null)
      setPhase('count')
    } else if (size.r === t.cols && size.c === t.rows) {
      track.attempt(true)
      nudge(`Sen ${size.r} sıra, her sırada ${size.c} dizdin. Kurabiye sayısı aynı mı? Şimdi istenen gibi ${t.rows} sıra yap.`)
    } else {
      misses.current++
      track.attempt(false)
      nudge(`Şu an ${size.r} sıra var ve her sırada ${size.c} ${t.noun} var. Kaç sıra olmalıydı? Her sırada kaç tane?`)
    }
  }
  const opts = useMemo(() => [N, t.rows + t.cols, N + t.cols].sort((a, b) => a - b), [N, t.rows, t.cols])
  const pick = (v: number) => {
    if (v === N) {
      track.attempt(true)
      sfx.ok()
      setPhase('rotate')
      nudge(`Evet! ${Array(t.rows).fill(t.cols).join(' + ')} = ${N}. Yani ${t.rows} × ${t.cols} = ${N}. Şimdi tepsiyi döndür!`, 'ok')
    } else {
      misses.current++
      track.attempt(false)
      setBad((b) => [...b, v])
      nudge(v === t.rows + t.cols ? `${t.rows} ile ${t.cols}’ü topladın. Ama her sırada ${t.cols} tane var ve ${t.rows} sıra var. Sıraları tek tek toplasan?` : 'Sıraları tek tek say: her sırada kaç tane var?', undefined, v === t.rows + t.cols ? 'Çarpma yerine kenarları topladı' : undefined)
    }
  }
  const rotate = () => {
    setSize((s) => ({ r: s.c, c: s.r }))
    sfx.ok()
    setPhase('done')
    track.item(misses.current === 0)
    nudge(`Döndürünce ${t.cols} sıra, her sırada ${t.rows}. Toplam yine ${N}! ${t.rows} × ${t.cols} = ${t.cols} × ${t.rows}`, 'ok')
  }
  return (
    <Layout grade={grade} look={look}
      board={
        <>
          <Board look={look} maxR={Math.max(t.rows, t.cols) + 2} maxC={Math.max(t.rows, t.cols) + 3} rows={size.r} cols={size.c} onSize={phase === 'build' ? (r, c) => setSize({ r, c }) : undefined} emoji={t.emoji} />
          {phase !== 'build' && <EqStrip look={look} text={equation(size.r, size.c, 0, 0, { repeated: true })} />}
          {phase === 'build' && <p className={`mt-2 text-center text-sm font-bold ${look.muted}`}>Pembe köşeyi sürükle ya da bir kareye dokun.</p>}
        </>
      }
      panel={
        <>
          {phase === 'build' && (
            <>
              <div className="flex flex-wrap justify-center gap-4">
                <Stepper look={look} label="Sıra" value={size.r} min={1} max={Math.max(t.rows, t.cols) + 2} onChange={(v) => setSize((s) => ({ ...s, r: v }))} />
                <Stepper look={look} label="Her sırada" value={size.c} min={1} max={Math.max(t.rows, t.cols) + 3} onChange={(v) => setSize((s) => ({ ...s, c: v }))} />
              </div>
              <button type="button" className="btn-primary mt-2 min-h-14 w-full text-lg" onClick={check}><Check size={20} />Dizdim</button>
            </>
          )}
          {phase === 'count' && (
            <>
              <p className={`mb-2 text-[15px] font-black ${look.strong}`}>Tepside kaç {t.noun} var? Tek tek saymadan bulabilir misin?</p>
              <div className="grid grid-cols-3 gap-2">{opts.map((v) => <Choice key={v} look={look} text={String(v)} state={bad.includes(v) ? 'wrong' : 'idle'} onClick={() => pick(v)} />)}</div>
            </>
          )}
          {phase === 'rotate' && <button type="button" className="btn-primary min-h-14 w-full text-lg" onClick={rotate}><RotateCw size={20} />Tepsiyi döndür</button>}
          {say && <Nudge key={say.k} question={say.q} tone={say.tone} misconception={say.mis} onClose={() => setSay(null)} />}
          {phase === 'done' && <NextButton last={last} onClick={() => onDone({ first: misses.current === 0, found: 0 })} />}
        </>
      }
    />
  )
}

function AllTask({ t, grade, look, onDone, sols, last }: { t: All; grade: Grade; look: Look; onDone: (r: Res) => void; sols: ReturnType<typeof useSolutions>; last: boolean }) {
  const track = useTracker()
  const { say, setSay, nudge } = useSay()
  const [size, setSize] = useState({ r: 2, c: 2 })
  const [found, setFound] = useState<[number, number][]>([])
  const [phase, setPhase] = useState<'find' | 'strategy' | 'done'>('find')
  const misses = useRef(0)
  const all = pairsOf(t.area, t.max)
  const area = size.r * size.c
  const save = () => {
    if (area !== t.area) {
      misses.current++
      track.attempt(false)
      return nudge(`Bu dikdörtgende ${size.r} × ${size.c} = ${area} kare var. ${area < t.area ? 'Daha çok' : 'Daha az'} kare gerekiyor. Hangi kenarı değiştirirsin?`)
    }
    const key: [number, number] = [Math.min(size.r, size.c), Math.max(size.r, size.c)]
    if (found.some((f) => f[0] === key[0] && f[1] === key[1])) {
      const same = found.find((f) => f[0] === key[0] && f[1] === key[1])!
      return nudge(`Bu dikdörtgeni zaten buldun: ${same[0]} × ${same[1]}’i döndürünce ${size.r} × ${size.c} olur. Döndürmek yeni bir dikdörtgen yapar mı?`)
    }
    track.attempt(true)
    sfx.ok()
    sols.add(`${t.area}:${key.join('x')}`, `${size.r} × ${size.c}`)
    const nf = [...found, key].sort((a, b) => a[0] - b[0])
    setFound(nf)
    if (nf.length >= all.length) {
      track.item(misses.current === 0)
      setPhase('strategy')
      nudge(`Hepsini buldun! ${ek(t.area, 'acc')} ${nf.map((f) => `${f[0]} × ${f[1]}`).join(', ')} biçiminde yazabiliriz. Bunlar ${ek(t.area, 'gen')} çarpan çiftleri.`, 'ok')
    } else nudge(`Harika! ${nf.length} / ${all.length}. Başka bir dikdörtgen kurabilir misin?`, 'ok')
  }
  return (
    <Layout grade={grade} look={look}
      board={
        <>
          <ZoomBox controls={false}>
            <Board look={look} maxR={t.max} maxC={t.max} rows={size.r} cols={size.c} onSize={phase === 'find' ? (r, c) => setSize({ r, c }) : undefined} labels={(_, r, c) => (r * c === t.area ? `${r * c} ✓` : `${r * c}`)} />
          </ZoomBox>
          <EqStrip look={look} text={`${size.r} × ${size.c} = ${area}${area === t.area ? ' ✓' : ` (hedef ${t.area})`}`} />
        </>
      }
      panel={
        <>
          <p className={`text-[15px] font-bold ${look.muted}`}>Pembe köşeyi sürükle ya da bir kareye dokun. Alanı {t.area} olunca kaydet.</p>
          {phase === 'find' && (
            <div className="mt-2 flex flex-wrap justify-center gap-4">
              <Stepper look={look} label="Satır" value={size.r} min={1} max={t.max} onChange={(v) => setSize((s) => ({ ...s, r: v }))} />
              <Stepper look={look} label="Sütun" value={size.c} min={1} max={t.max} onChange={(v) => setSize((s) => ({ ...s, c: v }))} />
            </div>
          )}
          {phase === 'find' && <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" onClick={save}><Save size={20} />Bu dikdörtgeni kaydet</button>}
          <p className={`mt-3 text-sm font-black ${look.strong}`}>Bulunan dikdörtgenler: {found.length} / {all.length}</p>
          <div className="mt-2 flex flex-wrap gap-2">{found.map((f) => <MiniRect key={f.join('x')} r={f[0]} c={f[1]} look={look} />)}</div>
          {say && <Nudge key={say.k} question={say.q} tone={say.tone} misconception={say.mis} onClose={() => setSay(null)} />}
          {phase === 'strategy' && <StrategyPicker question="Dikdörtgenleri nasıl buldun?" options={['1’den başlayıp sırayla denedim', 'Çarpım tablosunu düşündüm', 'Bir kenarı ikiye katlayıp diğerini yarıya indirdim', 'Rastgele denedim']} onPick={() => setPhase('done')} />}
          {phase === 'done' && <NextButton last={last} onClick={() => onDone({ first: misses.current === 0, found: found.length })} />}
        </>
      }
    />
  )
}

function SplitTask({ t, grade, look, onDone, sols, last }: { t: Split; grade: Grade; look: Look; onDone: (r: Res) => void; sols: ReturnType<typeof useSolutions>; last: boolean }) {
  const track = useTracker()
  const { say, setSay, nudge } = useSay()
  const [cut, setCut] = useState({ sr: 0, sc: 0 })
  const [found, setFound] = useState<string[]>([])
  const [phase, setPhase] = useState<'find' | 'strategy' | 'done'>('find')
  const has = cut.sr > 0 || cut.sc > 0
  const save = () => {
    if (!has) return nudge('Önce ✂ tutamaçlarından birini sürükleyerek dikdörtgeni böl.')
    const key = `${cut.sr ? Math.min(cut.sr, t.rows - cut.sr) : 0}-${cut.sc ? Math.min(cut.sc, t.cols - cut.sc) : 0}`
    if (found.includes(key)) return nudge('Bu bölmeyi zaten kaydettin. Kesimi başka bir yere taşı ya da diğer yönden kes.')
    track.attempt(true)
    sfx.ok()
    const eq = equation(t.rows, t.cols, cut.sr, cut.sc)
    sols.add(`${t.rows}x${t.cols}:${key}`, eq)
    const nf = [...found, key]
    setFound(nf)
    if (nf.length >= t.need) {
      track.item(true)
      setPhase('strategy')
      nudge(`Her bölmede parçaların toplamı yine ${t.rows * t.cols}! Dikdörtgeni nereden bölersen böl alan değişmez.`, 'ok')
    } else nudge('Güzel! Şimdi başka bir yerden böl. Hangi parçaları kolay hesaplarsın?', 'ok')
  }
  return (
    <Layout grade={grade} look={look}
      board={
        <>
          <ZoomBox controls={false}>
            <Board look={look} maxR={t.rows} maxC={t.cols} rows={t.rows} cols={t.cols} sr={cut.sr} sc={cut.sc} onCut={phase === 'find' ? (sr, sc) => setCut({ sr, sc }) : undefined} labels={(_, r, c) => `${r} × ${c} = ${r * c}`} />
          </ZoomBox>
          <EqStrip look={look} text={equation(t.rows, t.cols, cut.sr, cut.sc)} />
        </>
      }
      panel={
        <>
          <p className={`text-[15px] font-bold ${look.muted}`}>✂ tutamaçlarını sürükle ya da aşağıdan kesim yerini seç.</p>
          {phase === 'find' && (
            <div className="mt-2 flex flex-wrap justify-center gap-4">
              <Stepper look={look} label="Satır kesimi" value={cut.sr} min={0} max={t.rows - 1} onChange={(v) => setCut((c) => ({ ...c, sr: v }))} />
              <Stepper look={look} label="Sütun kesimi" value={cut.sc} min={0} max={t.cols - 1} onChange={(v) => setCut((c) => ({ ...c, sc: v }))} />
            </div>
          )}
          {phase === 'find' && <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" onClick={save}><Scissors size={20} />Bu bölmeyi kaydet</button>}
          <p className={`mt-3 text-sm font-black ${look.strong}`}>Kaydedilen yollar: {found.length} / {t.need}</p>
          <ul className="mt-1 space-y-1">{sols.list.filter((s) => s.key.startsWith(`${t.rows}x${t.cols}:`)).map((s) => <li key={s.key} className={`rounded-xl px-3 py-2 text-sm font-extrabold ${look.dark ? 'bg-emerald-400/10 text-emerald-200' : 'bg-emerald-50 text-emerald-900'}`}><MathText text={s.label} /></li>)}</ul>
          {say && <Nudge key={say.k} question={say.q} tone={say.tone} misconception={say.mis} onClose={() => setSay(null)} />}
          {phase === 'strategy' && <StrategyPicker question="Hangi bölme işini en çok kolaylaştırdı?" options={['5’ten böldüm', '10’dan böldüm', 'İkiye eşit böldüm', 'Bildiğim bir çarpımı ayırdım']} onPick={() => setPhase('done')} />}
          {phase === 'done' && <NextButton last={last} onClick={() => onDone({ first: true, found: found.length })} />}
        </>
      }
    />
  )
}

function PartialTask({ t, grade, look, onDone, last }: { t: Partial; grade: Grade; look: Look; onDone: (r: Res) => void; last: boolean }) {
  const track = useTracker()
  const { say, setSay, nudge } = useSay()
  const [cut, setCut] = useState({ sr: 0, sc: 0 })
  const [phase, setPhase] = useState<'cut' | 'fill' | 'total' | 'done'>('cut')
  const [vals, setVals] = useState<Record<number, number>>({})
  const [active, setActive] = useState<number | null>(null)
  const [entry, setEntry] = useState('')
  const misses = useRef(0)
  const R = cut.sr ? [cut.sr, t.rows - cut.sr] : [t.rows]
  const C = cut.sc ? [cut.sc, t.cols - cut.sc] : [t.cols]
  const parts = R.flatMap((r) => C.map((c) => ({ r, c })))
  const needBoth = t.rows >= 10
  const ready = cut.sc > 0 && (!needBoth || cut.sr > 0)
  const startFill = () => {
    if (!ready) return nudge(needBoth ? 'İki yönden de böl: hem satırları hem sütunları. Onluk ve birlik olarak ayırmak işini kolaylaştırır mı?' : `${t.cols}’ü onluklar ve birlikler olarak bölmeyi dene. ✂ tutamacını sürükle.`)
    const friendly = (cut.sc % 10 === 0 || (t.cols - cut.sc) % 10 === 0) && (!needBoth || cut.sr % 10 === 0 || (t.rows - cut.sr) % 10 === 0)
    track.strategy(friendly ? 'Onluk–birlik ayırma (alan modeli)' : 'Başka bir bölme')
    setSay(null)
    if (!friendly) nudge('Bu bölme de doğru! Ama parçalar kolay mı? İstersen geri dönüp onluk sınırından böl.', 'ok')
    setPhase('fill')
    setActive(0)
  }
  const submit = () => {
    if (active === null) return
    const p = parts[active]
    const v = Number(entry)
    if (v === p.r * p.c) {
      track.attempt(true)
      sfx.ok()
      const nv = { ...vals, [active]: v }
      setVals(nv)
      setEntry('')
      const nxt = parts.findIndex((_, i) => nv[i] === undefined)
      if (nxt === -1) {
        setActive(null)
        setPhase('total')
      } else setActive(nxt)
      setSay(null)
    } else {
      misses.current++
      track.attempt(false)
      setEntry('')
      const big = p.c % 10 === 0 ? p.c : p.r % 10 === 0 ? p.r : 0
      const other = big === p.c ? p.r : p.c
      const tensWrong = big > 0 && (v === other * (big / 10) || v === (big / 10) * (other % 10 === 0 ? other / 10 : other))
      nudge(
        big
          ? `${p.c} × ${p.r} parçasına bak. ${big}, ${big / 10} onluk demek. ${other} × ${big / 10} onluk kaç onluk eder? Bu kaç birim kare?`
          : `${p.c} × ${p.r} parçasına bak: ${p.r} satırın her birinde ${p.c} kare var.`,
        undefined,
        tensWrong ? 'Onluklarla çarparken basamak değerini kaybetti' : undefined,
      )
    }
  }
  const total = t.rows * t.cols
  const submitTotal = () => {
    if (Number(entry) === total) {
      track.attempt(true)
      track.item(misses.current === 0)
      sfx.ok()
      setEntry('')
      setPhase('done')
      nudge(`${Object.values(vals).map((v) => fmtN(v)).join(' + ')} = ${fmtN(total)}. Kısmi çarpımları topladın!`, 'ok')
    } else {
      misses.current++
      track.attempt(false)
      setEntry('')
      nudge('Parçaların değerlerini topla. Önce yüzlükleri, sonra onlukları birleştirebilirsin.')
    }
  }
  const labels = (i: number, r: number, c: number) => (phase === 'cut' ? `${c} × ${r}` : vals[i] !== undefined ? `${c} × ${r} = ${fmtN(vals[i])}` : `${c} × ${r} = ?`)
  return (
    <Layout grade={grade} look={look}
      board={
        <>
          <ZoomBox controls={false}>
            <Board look={look} maxR={t.rows} maxC={t.cols} rows={t.rows} cols={t.cols} sr={cut.sr} sc={cut.sc} onCut={phase === 'cut' ? (sr, sc) => setCut({ sr, sc }) : undefined} labels={labels} onPart={phase === 'fill' ? (i) => { setActive(i); setEntry('') } : undefined} activePart={active} tens />
          </ZoomBox>
          <EqStrip look={look} text={phase === 'cut' ? equation(t.cols, t.rows, cut.sc, cut.sr, { hideTotal: true }) : `${t.cols} × ${t.rows} = ${parts.map((p, i) => (vals[i] !== undefined ? fmtN(vals[i]) : `${p.c} × ${p.r}`)).join(' + ')}${phase === 'done' ? ` = ${fmtN(total)}` : ''}`} />
        </>
      }
      panel={
        <>
          {phase === 'cut' && (
            <>
              <p className={`text-[15px] font-bold ${look.muted}`}>Dikdörtgeni ✂ ile böl. Hangi bölme parçaları kolay hesaplanır yapar?</p>
              <div className="mt-2 flex flex-wrap justify-center gap-4">
                {needBoth && <Stepper look={look} label="Satır kesimi" value={cut.sr} min={0} max={t.rows - 1} onChange={(v) => setCut((c) => ({ ...c, sr: v }))} />}
                <Stepper look={look} label="Sütun kesimi" value={cut.sc} min={0} max={t.cols - 1} onChange={(v) => setCut((c) => ({ ...c, sc: v }))} />
              </div>
              <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" onClick={startFill}><Scissors size={20} />Böldüm, hesaplayalım</button>
            </>
          )}
          {phase === 'fill' && active !== null && (
            <>
              <p className={`mb-2 text-[15px] font-black ${look.strong}`}>Parça {active + 1}: <MathText text={`${parts[active].c} × ${parts[active].r} = ?`} /> <span className={`text-sm font-bold ${look.muted}`}>(başka parçaya dokunabilirsin)</span></p>
              <div className={`mb-2 grid min-h-12 place-items-center rounded-xl text-3xl font-black tabular-nums ${look.dark ? 'bg-slate-900' : 'bg-white ring-1 ring-line'}`}>{entry || <span className={look.muted}>?</span>}</div>
              <Pad look={look} value={entry} onChange={setEntry} onSubmit={submit} />
            </>
          )}
          {phase === 'total' && (
            <>
              <p className={`mb-2 text-[15px] font-black ${look.strong}`}><MathText text={`Hepsi bir arada: ${Object.values(vals).map((v) => fmtN(v)).join(' + ')} = ?`} /></p>
              <div className={`mb-2 grid min-h-12 place-items-center rounded-xl text-3xl font-black tabular-nums ${look.dark ? 'bg-slate-900' : 'bg-white ring-1 ring-line'}`}>{entry || <span className={look.muted}>?</span>}</div>
              <Pad look={look} value={entry} onChange={setEntry} onSubmit={submitTotal} />
            </>
          )}
          {say && <Nudge key={say.k} question={say.q} tone={say.tone} misconception={say.mis} onClose={() => setSay(null)} />}
          {phase === 'done' && <NextButton last={last} onClick={() => onDone({ first: misses.current === 0, found: 0 })} />}
        </>
      }
    />
  )
}

function MissingTask({ t, grade, look, onDone, last }: { t: Missing; grade: Grade; look: Look; onDone: (r: Res) => void; last: boolean }) {
  const track = useTracker()
  const { say, setSay, nudge } = useSay()
  const [cols, setCols] = useState(2)
  const [cut, setCut] = useState(0)
  const [phase, setPhase] = useState<'build' | 'ask' | 'done'>('build')
  const [bad, setBad] = useState<number[]>([])
  const misses = useRef(0)
  const ans = t.area / t.rows
  const area = t.rows * cols
  const check = () => {
    if (area === t.area) {
      track.attempt(true)
      sfx.ok()
      setPhase('ask')
      setSay(null)
    } else {
      misses.current++
      track.attempt(false)
      nudge(`Şu an ${t.rows} × ${cols} = ${area} kare var. ${area < t.area ? `${t.area - area} kare daha` : `${area - t.area} kare fazla`}. Her sıraya bir sütun eklemek kaç kare ekler?`)
    }
  }
  const opts = useMemo(() => [ans, ans + 1, t.area - t.rows].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b), [ans, t.area, t.rows])
  const pick = (v: number) => {
    if (v === ans) {
      track.attempt(true)
      track.item(misses.current === 0)
      sfx.ok()
      setPhase('done')
      nudge(`${t.area} ÷ ${t.rows} = ${ans}, çünkü ${t.rows} × ${ans} = ${t.area}. Bölme, eksik kenarı bulmaktır!`, 'ok')
    } else {
      misses.current++
      track.attempt(false)
      setBad((b) => [...b, v])
      nudge(v === t.area - t.rows ? `${t.area} − ${t.rows} mü? Dikdörtgende ${t.rows} sıra ve her sırada kaç kare var?` : 'Dikdörtgenin üst kenarındaki sayıya bak.', undefined, v === t.area - t.rows ? 'Bölme yerine çıkarma yaptı' : undefined)
    }
  }
  return (
    <Layout grade={grade} look={look}
      board={
        <>
          <ZoomBox controls={false}>
            <Board look={look} maxR={t.rows} maxC={t.maxC} rows={t.rows} cols={cols} lockRows onSize={phase === 'build' ? (_, c) => setCols(c) : undefined} sc={grade >= 4 ? cut : 0} onCut={grade >= 4 && phase === 'build' ? (_, sc) => setCut(sc) : undefined} labels={(_, r, c) => `${r * c}`} />
          </ZoomBox>
          <EqStrip look={look} text={grade >= 4 && cut > 0 && cut < cols ? equation(t.rows, cols, 0, cut) : `${t.rows} × ${cols} = ${area}${area === t.area ? ' ✓' : ` (hedef ${t.area})`}`} />
        </>
      }
      panel={
        <>
          {phase === 'build' && (
            <>
              <p className={`text-[15px] font-bold ${look.muted}`}>Sıra sayısı sabit: {t.rows}. Köşeyi sağa sürükleyerek {t.area} kareye ulaş.{grade >= 4 ? ' İstersen ✂ ile 10’dan bölüp parça parça düşün.' : ''}</p>
              <div className="mt-2 flex justify-center"><Stepper look={look} label="Her sıradaki kare" value={cols} min={1} max={t.maxC} onChange={setCols} /></div>
              <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" onClick={check}><Check size={20} />Tamam</button>
            </>
          )}
          {phase === 'ask' && (
            <>
              <p className={`mb-2 text-[15px] font-black ${look.strong}`}><MathText text={`${t.area} ÷ ${t.rows} = ?`} /></p>
              <div className="grid grid-cols-3 gap-2">{opts.map((v) => <Choice key={v} look={look} text={String(v)} state={bad.includes(v) ? 'wrong' : 'idle'} onClick={() => pick(v)} />)}</div>
            </>
          )}
          {say && <Nudge key={say.k} question={say.q} tone={say.tone} misconception={say.mis} onClose={() => setSay(null)} />}
          {phase === 'done' && <NextButton last={last} onClick={() => onDone({ first: misses.current === 0, found: 0 })} />}
        </>
      }
    />
  )
}

// ───────────────────────── Ana bileşen ─────────────────────────

export default function CarpimDikdortgenleri({ grade, onFinish }: InteractionProps) {
  const look = useLook(grade)
  const tasks = useMemo(() => tasksFor(grade), [grade])
  const [i, setI] = useState(0)
  const sols = useSolutions()
  const firsts = useRef(0)
  const t = tasks[i]
  const last = i === tasks.length - 1
  const done = (r: Res) => {
    if (r.first) firsts.current++
    if (!last) {
      setI(i + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const stars = (firsts.current >= tasks.length - 1 ? 3 : firsts.current >= 2 ? 2 : 1) as 1 | 2 | 3
    onFinish({
      summary: `${tasks.length} dikdörtgen görevini tamamladın${sols.list.length ? `, ${sols.list.length} farklı dikdörtgen/bölme buldun` : ''}.`,
      insight:
        grade === 2
          ? 'Eşit sıralar halinde dizilen nesneler tekrarlı toplamadır: 3 sıra 4 = 4 + 4 + 4 = 3 × 4. Dizilimi döndürünce sayı değişmez.'
          : grade === 3
            ? 'Bir dikdörtgeni iki parçaya bölünce alan değişmez: 7 × 8 = 5 × 8 + 2 × 8. Bildiğin çarpımlarla bilmediklerini bulabilirsin.'
            : 'Alan modelinde sayıları onluk ve birlik olarak bölmek kısmi çarpımları verir: 14 × 6 = 10 × 6 + 4 × 6. Bölme, eksik kenarı bulmaktır.',
      stars,
    })
  }
  const EMO: Record<Task['kind'], string> = { build: '🍪', all: '🔍', split: '✂️', partial: '🧮', missing: '❓' }
  let body: ReactNode
  if (t.kind === 'build') body = <BuildTask key={i} t={t} grade={grade} look={look} onDone={done} last={last} />
  else if (t.kind === 'all') body = <AllTask key={i} t={t} grade={grade} look={look} onDone={done} sols={sols} last={last} />
  else if (t.kind === 'split') body = <SplitTask key={i} t={t} grade={grade} look={look} onDone={done} sols={sols} last={last} />
  else if (t.kind === 'partial') body = <PartialTask key={i} t={t} grade={grade} look={look} onDone={done} last={last} />
  else body = <MissingTask key={i} t={t} grade={grade} look={look} onDone={done} last={last} />
  return (
    <div>
      <TopBar look={look} step={i} total={tasks.length} title={t.title} emoji={EMO[t.kind]} />
      {body}
    </div>
  )
}
