import { useCallback, useRef, useState, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'
import { DiceSvg } from '../../components/Visual'
import { Plane, usePlane } from '../../interactive/Plane'
import { clamp } from '../../interactive/axis'
import { drawIndex, fmtN, useBoxW, useRaf, type Look } from '../veri-toplama/kit'

/**
 * Olasılık etkinlikleri (65, 66) için rastgele araçlar:
 *  - Device: yazı-tura, zar, çark (ağırlıklı dilimler), torba (renkli bilyeler), raptiye (kuramı bilinmeyen)
 *  - DeviceView: son sonucu canlandırarak gösterir
 *  - useTrials: animasyonlu çok sayıda deneme, sayaçlar ve göreli sıklık geçmişi
 *  - ProbLine: 0 (imkânsız) – 1 (kesin) olasılık doğrusu, sürüklenebilir işaretler
 *  - FreqChart: deneme sayısı – göreli sıklık grafiği (Plane, bağımsız y ölçeği, iki parmakla yakınlaştırma)
 */

export interface Out { label: string; color: string; w: number }
export type Device =
  | { kind: 'coin' }
  | { kind: 'die' }
  | { kind: 'spinner'; sectors: Out[] }
  | { kind: 'bag'; balls: Out[]; hidden?: boolean }
  | { kind: 'tack' }

export const COL = { red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308', purple: '#a855f7', orange: '#f97316' }

export function outcomes(d: Device): Out[] {
  switch (d.kind) {
    case 'coin':
      return [{ label: 'Yazı', color: '#d97706', w: 1 }, { label: 'Tura', color: '#6366f1', w: 1 }]
    case 'die':
      return [1, 2, 3, 4, 5, 6].map((k) => ({ label: String(k), color: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'][k - 1], w: 1 }))
    case 'spinner':
      return d.sectors
    case 'bag':
      return d.balls
    case 'tack':
      // gerçek raptiyelerde deneyle ~%60 civarı bulunur; kuramsal değer yoktur
      return [{ label: 'Ucu yukarı', color: '#0ea5e9', w: 0.62 }, { label: 'Yan yatık', color: '#f97316', w: 0.38 }]
  }
}

/** Kuramsal olasılık (bilinmiyorsa null) */
export function theory(d: Device, i: number): number | null {
  if (d.kind === 'tack') return null
  const o = outcomes(d)
  const t = o.reduce((s, x) => s + x.w, 0)
  return o[i].w / t
}

// ───────────────────────── Deneme sayacı ─────────────────────────

export interface Trials {
  n: number
  counts: number[]
  /** [deneme sayısı, ...sayaçlar] */
  hist: number[][]
  last: number | null
  /** son tek denemenin anahtarı (animasyon için) */
  flick: number
  running: boolean
  run: (k: number) => void
  reset: () => void
}

export function useTrials(d: Device, sampler?: () => number): Trials {
  const outs = outcomes(d)
  const k = outs.length
  const w = outs.map((o) => o.w)
  const st = useRef({ n: 0, counts: Array(k).fill(0) as number[], hist: [[0, ...Array(k).fill(0)]] as number[][] })
  const [, force] = useState(0)
  const [last, setLast] = useState<number | null>(null)
  const [flick, setFlick] = useState(0)
  const [running, setRunning] = useState(false)
  const raf = useRaf()
  const drawRef = useRef<() => number>(() => 0)
  drawRef.current = sampler ?? (() => drawIndex(w))
  if (st.current.counts.length !== k) st.current = { n: 0, counts: Array(k).fill(0), hist: [[0, ...Array(k).fill(0)]] }

  const one = () => {
    const s = st.current
    const r = drawRef.current()
    s.n++
    s.counts[r]++
    const every = s.n <= 120 ? 1 : Math.ceil(s.n / 120)
    if (s.n % every === 0) s.hist.push([s.n, ...s.counts])
    return r
  }

  const run = useCallback(
    (m: number) => {
      if (m <= 1) {
        const r = one()
        setLast(r)
        setFlick((f) => f + 1)
        force((x) => x + 1)
        return
      }
      setRunning(true)
      const frames = m <= 10 ? m : m <= 100 ? 25 : 45
      const per = Math.ceil(m / frames)
      let left = m
      raf(() => {
        const now = Math.min(per, left)
        let r = 0
        for (let i = 0; i < now; i++) r = one()
        left -= now
        setLast(r)
        if (m <= 10) setFlick((f) => f + 1)
        force((x) => x + 1)
        if (left <= 0) {
          const s = st.current
          if (s.hist[s.hist.length - 1][0] !== s.n) s.hist.push([s.n, ...s.counts])
          setRunning(false)
          return false
        }
        return true
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [raf],
  )
  const reset = useCallback(() => {
    st.current = { n: 0, counts: Array(k).fill(0), hist: [[0, ...Array(k).fill(0)]] }
    setLast(null)
    force((x) => x + 1)
  }, [k])

  return { n: st.current.n, counts: st.current.counts, hist: st.current.hist, last, flick, running, run, reset }
}

// ───────────────────────── Araç görselleri ─────────────────────────

function Coin({ face, flick }: { face: number | null; flick: number }) {
  const y = face === 0
  return (
    <svg key={flick} viewBox="0 0 120 120" className="h-full w-full animate-pop" role="img" aria-label={face === null ? 'Madeni para' : y ? 'Yazı' : 'Tura'}>
      <defs>
        <radialGradient id="coin-g" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.6" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#b45309" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="54" fill="url(#coin-g)" stroke="#92400e" strokeWidth="4" />
      <circle cx="60" cy="60" r="42" fill="none" stroke="#92400e" strokeWidth="2" strokeDasharray="3 4" opacity="0.6" />
      {face === null ? (
        <text x="60" y="72" textAnchor="middle" fontSize="34" fontWeight="900" fill="#78350f">?</text>
      ) : y ? (
        <text x="60" y="74" textAnchor="middle" fontSize="38" fontWeight="900" fill="#78350f">Y</text>
      ) : (
        <g fill="#78350f">
          <text x="60" y="74" textAnchor="middle" fontSize="38" fontWeight="900">T</text>
        </g>
      )}
    </svg>
  )
}

/** Çark: ağırlıklı dilimler, ok son sonuca döner */
export function Spinner({ sectors, last, flick, size = 220, onSector, owners }: { sectors: Out[]; last: number | null; flick: number; size?: number; onSector?: (i: number) => void; owners?: (string | null)[] }) {
  const total = sectors.reduce((s, x) => s + x.w, 0)
  const rot = useRef({ flick: -1, deg: 0 })
  if (rot.current.flick !== flick && last !== null) {
    let a = 0
    for (let i = 0; i < last; i++) a += (sectors[i].w / total) * 360
    const span = (sectors[last].w / total) * 360
    const target = a + span * (0.2 + Math.random() * 0.6)
    const base = Math.ceil(rot.current.deg / 360) * 360 + 720
    rot.current = { flick, deg: base + target }
  }
  let acc = 0
  const r = 92
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className="mx-auto block max-w-full" role="img" aria-label="Çark">
      <circle cx="100" cy="100" r="97" fill="#1f2340" opacity="0.12" />
      {sectors.map((s, i) => {
        const a0 = (acc / total) * 2 * Math.PI - Math.PI / 2
        acc += s.w
        const a1 = (acc / total) * 2 * Math.PI - Math.PI / 2
        const mid = (a0 + a1) / 2
        const large = a1 - a0 > Math.PI ? 1 : 0
        const full = sectors.length === 1 || s.w === total
        const d = full ? `M${100 - r} 100 A${r} ${r} 0 1 1 ${100 + r} 100 A${r} ${r} 0 1 1 ${100 - r} 100` : `M100 100 L${100 + r * Math.cos(a0)} ${100 + r * Math.sin(a0)} A${r} ${r} 0 ${large} 1 ${100 + r * Math.cos(a1)} ${100 + r * Math.sin(a1)} Z`
        const own = owners?.[i]
        return (
          <g key={i} onClick={onSector ? () => onSector(i) : undefined} style={{ cursor: onSector ? 'pointer' : undefined }}>
            <path d={d} fill={s.color} stroke="#fff" strokeWidth={3} opacity={last === null || last === i ? 1 : 0.75} />
            {s.w / total >= 0.07 && (
              <text x={100 + r * 0.62 * Math.cos(mid)} y={100 + r * 0.62 * Math.sin(mid) + 6} textAnchor="middle" fontSize={own ? 13 : 16} fontWeight={900} fill="#fff" style={{ paintOrder: 'stroke', stroke: '#0003', strokeWidth: 3 }}>
                {own ?? s.label}
              </text>
            )}
          </g>
        )
      })}
      <g style={{ transform: `rotate(${rot.current.deg}deg)`, transformOrigin: '100px 100px', transition: last === null ? undefined : 'transform 0.9s cubic-bezier(.17,.67,.2,1)' }}>
        <path d="M100 22 L108 100 L92 100 Z" fill="#1f2340" />
        <path d="M100 22 L104 60 L96 60 Z" fill="#fff" opacity="0.35" />
      </g>
      <circle cx="100" cy="100" r="11" fill="#fff" stroke="#1f2340" strokeWidth="3" />
    </svg>
  )
}

function Bag({ balls, hidden, last, flick }: { balls: Out[]; hidden?: boolean; last: number | null; flick: number }) {
  const list = balls.flatMap((b, i) => Array.from({ length: Math.round(b.w) }, () => i))
  const cols = Math.min(5, Math.ceil(Math.sqrt(list.length * 1.4)))
  const rows = Math.ceil(list.length / cols)
  const cell = Math.min(22, 92 / Math.max(cols, rows))
  return (
    <svg viewBox="0 0 160 170" className="h-full w-full" role="img" aria-label={hidden ? 'Gizli torba' : 'Torba'}>
      <path d="M38 52 Q20 70 22 112 Q26 160 80 162 Q134 160 138 112 Q140 70 122 52 Z" fill={hidden ? '#475569' : '#c4a484'} stroke={hidden ? '#1e293b' : '#7c5a3a'} strokeWidth="4" />
      <path d="M44 52 Q80 40 116 52 L112 42 Q80 30 48 42 Z" fill={hidden ? '#334155' : '#a3825f'} />
      {hidden ? (
        <text x="80" y="122" textAnchor="middle" fontSize="44" fontWeight="900" fill="#cbd5e1">?</text>
      ) : (
        list.map((bi, j) => {
          const cx = 80 - ((cols - 1) * cell) / 2 + (j % cols) * cell
          const cy = 108 - ((rows - 1) * cell) / 2 + Math.floor(j / cols) * cell
          return <circle key={j} cx={cx} cy={cy} r={cell * 0.42} fill={balls[bi].color} stroke="#fff" strokeWidth="1.5" />
        })
      )}
      {last !== null && (
        <g key={flick} className="animate-pop">
          <circle cx="80" cy="20" r="15" fill={balls[last].color} stroke="#fff" strokeWidth="3" />
          <circle cx="75" cy="15" r="4" fill="#fff" opacity="0.5" />
        </g>
      )}
    </svg>
  )
}

function Tack({ up, flick }: { up: boolean | null; flick: number }) {
  return (
    <svg key={flick} viewBox="0 0 120 120" className="h-full w-full animate-pop" role="img" aria-label={up === null ? 'Raptiye' : up ? 'Ucu yukarı' : 'Yan yatık'}>
      <rect x="6" y="96" width="108" height="8" rx="4" fill="#cbd5e1" />
      {up === false ? (
        <g transform="translate(60 80) rotate(-70)">
          <ellipse cx="0" cy="0" rx="22" ry="8" fill="#ef4444" stroke="#991b1b" strokeWidth="2" />
          <line x1="0" y1="0" x2="0" y2="-40" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          <ellipse cx="60" cy="92" rx="26" ry="7" fill="#ef4444" stroke="#991b1b" strokeWidth="2" />
          <line x1="60" y1="90" x2="60" y2={up === null ? 60 : 46} stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}
    </svg>
  )
}

export function DeviceView({ d, t, size = 200 }: { d: Device; t: Pick<Trials, 'last' | 'flick'>; size?: number }) {
  const box = (c: ReactNode) => <div className="mx-auto" style={{ width: size, height: size }}>{c}</div>
  switch (d.kind) {
    case 'coin':
      return box(<Coin face={t.last} flick={t.flick} />)
    case 'die':
      return box(<div key={t.flick} className="grid h-full place-items-center animate-pop"><DiceSvg value={t.last === null ? 5 : t.last + 1} size={size * 0.7} /></div>)
    case 'spinner':
      return <Spinner sectors={d.sectors} last={t.last} flick={t.flick} size={size} />
    case 'bag':
      return box(<Bag balls={d.balls} hidden={d.hidden} last={t.last} flick={t.flick} />)
    case 'tack':
      return box(<Tack up={t.last === null ? null : t.last === 0} flick={t.flick} />)
  }
}

// ───────────────────────── Deneme düğmeleri ─────────────────────────

export function RunButtons({ look, t, sizes = [1, 10, 100, 1000], max = 20000 }: { look: Look; t: Trials; sizes?: number[]; max?: number }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {sizes.map((k) => (
        <button key={k} type="button" disabled={t.running || t.n + k > max} onClick={() => t.run(k)} className={`${look.h} rounded-2xl px-1 text-base font-black tabular-nums transition active:scale-95 disabled:opacity-40 ${look.key}`}>
          +{fmtN(k)}
        </button>
      ))}
    </div>
  )
}

// ───────────────────────── Olasılık doğrusu ─────────────────────────

export interface Mark { id: string; v: number | null; color: string; label: string; drag?: boolean; ghost?: boolean }

const PL = { L: 34, R: 34, Y: 84 }
const vxW = (W: number) => (v: number) => PL.L + v * (W - PL.L - PL.R)

function MarkG({ m, onMove, svg, active, onPick, row = 0, W }: { m: Mark; onMove?: (v: number) => void; svg: React.RefObject<SVGSVGElement | null>; active?: boolean; onPick?: () => void; row?: number; W: number }) {
  const vx = vxW(W)
  const ref = useRef<SVGGElement>(null)
  useDrag(
    ({ xy: [cx], tap, event }) => {
      event.stopPropagation()
      if (tap) return onPick?.()
      if (!onMove || !m.drag) return
      const r = svg.current?.getBoundingClientRect()
      if (!r) return
      const px = ((cx - r.left) / r.width) * W
      onMove(clamp((px - PL.L) / (W - PL.L - PL.R), 0, 1))
    },
    { target: ref, filterTaps: true, eventOptions: { passive: false } },
  )
  if (m.v === null) return null
  const x = vx(m.v)
  return (
    <g ref={ref} data-handle style={{ cursor: m.drag ? 'grab' : 'default', touchAction: 'none' }} opacity={m.ghost ? 0.55 : 1}>
      <rect x={x - 34} y={4} width={68} height={100} fill="transparent" />
      <line x1={x} x2={x} y1={PL.Y - 30 - row * 26} y2={PL.Y + 2} stroke={m.color} strokeWidth={4} strokeDasharray={m.ghost ? '6 5' : undefined} />
      <circle cx={x} cy={PL.Y} r={active ? 17 : 14} fill={m.color} stroke="#fff" strokeWidth={4} />
      <text x={clamp(x, 70, W - 70)} y={PL.Y - 36 - row * 26} textAnchor="middle" fontSize={22} fontWeight={900} fill={m.color} style={{ paintOrder: 'stroke', stroke: '#fff', strokeWidth: 5 }}>{m.label}</text>
    </g>
  )
}

/**
 * 0–1 olasılık doğrusu. Sürüklenebilir işaretler; doğruya dokununca seçili işaret oraya gider (dokunuş alternatifi).
 * words: 'simple' (imkânsız–kesin), 'five' (5 düzey)
 */
export function ProbLine({ look, marks, onMove, selected, onSelect, words: wordsIn = 'five', numbers = false }: { look: Look; marks: Mark[]; onMove?: (id: string, v: number) => void; selected?: string | null; onSelect?: (id: string) => void; words?: 'five' | 'simple'; numbers?: boolean }) {
  const svg = useRef<SVGSVGElement>(null)
  const [box, bw] = useBoxW(800)
  const W = Math.round(clamp(bw * 1.45, 520, 1000))
  const words = W < 760 ? 'simple' : wordsIn
  const vx = vxW(W)
  const tapLine = (e: React.PointerEvent) => {
    if (!selected || !onMove) return
    if ((e.target as Element).closest('[data-handle]')) return
    const r = svg.current?.getBoundingClientRect()
    if (!r) return
    const px = ((e.clientX - r.left) / r.width) * W
    onMove(selected, clamp((px - PL.L) / (W - PL.L - PL.R), 0, 1))
  }
  const lab = words === 'five' ? [[0, 'İmkânsız'], [0.25, 'Olası değil'], [0.5, 'Yarı yarıya'], [0.75, 'Olası'], [1, 'Kesin']] : [[0, 'İmkânsız'], [0.5, 'Yarı yarıya'], [1, 'Kesin']]
  const ink = look.dark ? '#e2e8f0' : '#1f2340'
  // yakın işaretlerin etiketleri üst üste binmesin: iki satıra dağıt
  const rows: Record<string, number> = {}
  const lastIn = [-9, -9]
  marks.filter((m) => m.v !== null).sort((a, b) => a.v! - b.v!).forEach((m) => {
    const gap = 0.12 * (1000 / W)
    const r = m.v! - lastIn[0] > gap ? 0 : m.v! - lastIn[1] > gap ? 1 : 0
    rows[m.id] = r
    lastIn[r] = m.v!
  })
  return (
    <div ref={box} style={{ touchAction: 'none' }} className="select-none">
      <svg ref={svg} viewBox={`0 0 ${W} ${numbers ? 168 : 146}`} className="block w-full" onPointerUp={tapLine} role="img" aria-label="Olasılık doğrusu">
        <defs>
          <linearGradient id="pl-g" x1="0" x2="1">
            <stop offset="0" stopColor="#94a3b8" />
            <stop offset="0.5" stopColor="#a78bfa" />
            <stop offset="1" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <rect x={PL.L} y={PL.Y - 7} width={W - PL.L - PL.R} height={14} rx={7} fill="url(#pl-g)" />
        <rect x={0} y={PL.Y - 30} width={W} height={60} fill="transparent" />
        {lab.map(([v, t]) => (
          <g key={t as string}>
            <line x1={vx(v as number)} x2={vx(v as number)} y1={PL.Y - 12} y2={PL.Y + 12} stroke={ink} strokeWidth={3} />
            <text x={clamp(vx(v as number), 60, W - 60)} y={PL.Y + 40} textAnchor="middle" fontSize={22} fontWeight={800} fill={ink}>{t as string}</text>
            {numbers && <text x={clamp(vx(v as number), 20, W - 20)} y={PL.Y + 66} textAnchor="middle" fontSize={20} fontWeight={800} fill={look.dark ? '#94a3b8' : '#5b6080'}>{fmtN(v as number)}</text>}
          </g>
        ))}
        {marks.map((m) => <MarkG key={m.id} m={m} W={W} row={rows[m.id] ?? 0} svg={svg} active={selected === m.id} onPick={() => onSelect?.(m.id)} onMove={onMove ? (v) => onMove(m.id, v) : undefined} />)}
      </svg>
    </div>
  )
}

// ───────────────────────── Göreli sıklık grafiği ─────────────────────────

function Lines({ hist, focus, color, theoryV, guess, complement }: { hist: number[][]; focus: number[]; color: string[]; theoryV?: (number | null)[]; guess?: number | null; complement?: { idx: number; color: string } }) {
  const P = usePlane()
  const xMax = P.view.xMax
  return (
    <g>
      {theoryV?.map((tv, j) => tv !== null && tv !== undefined && (
        <g key={`t${j}`}>
          <line x1={P.sx(0)} x2={P.sx(xMax)} y1={P.sy(tv)} y2={P.sy(tv)} stroke={color[j]} strokeWidth={2.5} strokeDasharray="10 7" opacity={0.85} />
        </g>
      ))}
      {guess !== null && guess !== undefined && <line x1={P.sx(0)} x2={P.sx(xMax)} y1={P.sy(guess)} y2={P.sy(guess)} stroke="#f59e0b" strokeWidth={3} strokeDasharray="2 6" strokeLinecap="round" />}
      {complement && (() => {
        const pts = hist.filter((h) => h[0] > 0).map((h) => `${P.sx(h[0])},${P.sy(1 - h[complement.idx + 1] / h[0])}`).join(' ')
        return <polyline points={pts} fill="none" stroke={complement.color} strokeWidth={3} strokeLinejoin="round" />
      })()}
      {focus.map((fi, j) => {
        const pts = hist.filter((h) => h[0] > 0).map((h) => `${P.sx(h[0])},${P.sy(h[fi + 1] / h[0])}`).join(' ')
        const lastH = hist[hist.length - 1]
        return (
          <g key={fi}>
            <polyline points={pts} fill="none" stroke={color[j]} strokeWidth={3} strokeLinejoin="round" />
            {lastH[0] > 0 && <circle cx={P.sx(lastH[0])} cy={P.sy(lastH[fi + 1] / lastH[0])} r={6} fill={color[j]} stroke="#fff" strokeWidth={2} />}
          </g>
        )
      })}
    </g>
  )
}

export function FreqChart({ t, focus, colors, theoryV, guess, label = 'Göreli sıklık grafiği', complement }: { t: Trials; focus: number[]; colors: string[]; theoryV?: (number | null)[]; guess?: number | null; label?: string; complement?: { idx: number; color: string } }) {
  const bucket = t.n <= 20 ? 20 : t.n <= 100 ? 100 : t.n <= 500 ? 500 : t.n <= 2000 ? 2000 : t.n <= 5000 ? 5000 : 20000
  return (
    <Plane key={bucket} initial={{ xMin: -bucket * 0.07, xMax: bucket * 1.03, yMin: -0.1, yMax: 1.08 }} equalUnits={false} aspect={0.42} xLabel="deneme" yLabel="göreli sıklık" label={label} minSpan={5} maxSpan={40000}>
      <Lines hist={t.hist} focus={focus} color={colors} theoryV={theoryV} guess={guess} complement={complement} />
    </Plane>
  )
}

/** Sonuç sütunları (göreli sıklık), isteğe bağlı kuram çizgisi */
export function FreqBars({ look, outs, counts, n, theoryV, height = 150 }: { look: Look; outs: Out[]; counts: number[]; n: number; theoryV?: (number | null)[]; height?: number }) {
  return (
    <div className="flex items-end justify-center gap-2" style={{ height: height + 44 }}>
      {outs.map((o, i) => {
        const f = n ? counts[i] / n : 0
        const tv = theoryV?.[i]
        return (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center" style={{ maxWidth: 90 }}>
            <span className={`text-xs font-black tabular-nums ${look.strong}`}>{fmtN(counts[i])}</span>
            <div className={`relative w-full rounded-t-lg ${look.dark ? 'bg-slate-700/60' : 'bg-slate-100'}`} style={{ height }}>
              <div className="absolute inset-x-0 bottom-0 rounded-t-lg transition-[height] duration-150" style={{ height: f * height, background: o.color }} />
              {tv !== null && tv !== undefined && <div className="absolute inset-x-[-4px] border-t-[3px] border-dashed" style={{ bottom: tv * height, borderColor: look.dark ? '#f8fafc' : '#1f2340' }} />}
            </div>
            <span className={`mt-1 max-w-full truncate text-xs font-extrabold ${look.muted}`}>{o.label}</span>
          </div>
        )
      })}
    </div>
  )
}
