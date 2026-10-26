import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { tr, useTileDrag, hitZone } from '../hizli-noktalar/kit'
import { ek } from '../../lib/generators'

/** Kabın piksel genişliği (SVG yazıları gerçek boyutta kalsın diye) */
export function useBoxWidth<T extends HTMLElement>(initial = 600) {
  const ref = useRef<T>(null)
  const [w, setW] = useState(initial)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((e) => setW(Math.round(Math.max(280, Math.min(760, e[0].contentRect.width)))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/* ───────────────────────── Ortak renkler ───────────────────────── */

export const COL = {
  ink: '#1f2340',
  part: '#86efac',
  partInk: '#166534',
  part2: '#93c5fd',
  part2Ink: '#1e3a8a',
  miss: '#fdba74',
  missInk: '#9a3412',
  over: '#fca5a5',
  whole: '#c4b5fd',
  wholeInk: '#4c1d95',
}

/** Basamak değerine göre zıplama düğmesi rengi (onluk blok renkleriyle uyumlu) */
export const jumpColor = (v: number) => (v >= 1000 ? '#a5b4fc' : v >= 100 ? '#fdba74' : v >= 10 ? '#86efac' : '#fde047')

/* ───────────────────────── Bilye ───────────────────────── */

export function Marble({ color = 'red', size = 30 }: { color?: 'red' | 'blue'; size?: number }) {
  const id = useId().replace(/:/g, '')
  const [c1, c2] = color === 'red' ? ['#fb7185', '#be123c'] : ['#7dd3fc', '#1d4ed8']
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fff" stopOpacity={0.9} />
          <stop offset="25%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </radialGradient>
      </defs>
      <circle cx={20} cy={20} r={17} fill={`url(#${id})`} />
    </svg>
  )
}

/* ───────────────────────── 1. sınıf: bardak + onluk çerçeve ───────────────────────── */

/** Bardak ve dışarıdaki bilyeler; lifted → bardak kalkar, altındakiler görünür */
export function CupStage({ W, a, b, lifted, big }: { W: number; a: number; b: number; lifted: boolean; big: boolean }) {
  const ms = big ? 30 : 26
  return (
    <div className="flex flex-wrap items-end justify-center gap-x-6 gap-y-3 rounded-2xl bg-white/70 px-3 pt-3 pb-2 ring-1 ring-line">
      <div className="flex flex-col items-center">
        <div className="flex max-w-[15rem] flex-wrap justify-center gap-0.5">
          {Array.from({ length: a }, (_, i) => <Marble key={i} size={ms} />)}
        </div>
        <span className="mt-1 text-sm font-black text-rose-700">dışarıda {a}</span>
      </div>
      <div className="relative h-[172px] w-[150px]">
        {/* bardağın altındakiler: bardak kalkınca görünür */}
        <div className={`absolute inset-x-3 bottom-7 flex flex-wrap-reverse content-start justify-center gap-0.5 transition-opacity duration-500 ${lifted ? 'opacity-100 delay-300' : 'opacity-0'}`}>
          {Array.from({ length: b }, (_, i) => <Marble key={i} color="blue" size={b > 4 ? 24 : ms} />)}
        </div>
        <svg viewBox="0 0 120 100" width={130} height={108} className="absolute bottom-6 left-[10px] transition-transform duration-700 ease-out" style={{ transform: lifted ? 'translate(18px, -46px) rotate(14deg)' : 'none', transformOrigin: '80% 100%' }} aria-label={lifted ? 'Bardak kalktı' : 'Bardağın altında saklı bilyeler'}>
          <path d="M10 98 L26 6 H94 L110 98 Z" fill="#f59e0b" stroke={COL.ink} strokeWidth={3.5} strokeLinejoin="round" />
          <path d="M26 6 H94" stroke="#fff" strokeWidth={4} opacity={0.55} />
          <path d="M34 20 L25 82" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.3} />
          {!lifted && <text x={60} y={66} textAnchor="middle" fontSize={40} fontWeight={900} fill="#fff">?</text>}
        </svg>
        <span className="absolute inset-x-0 bottom-0 text-center text-sm font-black text-sky-700">{lifted ? `bardağın altında ${b}` : 'bardağın altında ?'}</span>
      </div>
      <div className="self-center rounded-2xl bg-ink px-3 py-1.5 text-center text-white">
        <p className="text-xs font-bold opacity-80">Toplam</p>
        <p className="text-2xl leading-none font-black">{W}</p>
      </div>
    </div>
  )
}

/**
 * Etkileşimli onluk/yirmilik çerçeve: ilk `a` göz kırmızı (dışarıdakiler), çocuk mavi sayaç ekler.
 * Boş göze dokun → sıradaki göze mavi sayaç; mavi sayaca dokun → sondakini çıkar. Kutudan sürükleyerek de eklenir.
 */
export function FrameBuilder({ a, added, size, onAdd, onRemove, locked, big }: { a: number; added: number; size: 10 | 20; onAdd: () => void; onRemove: () => void; locked?: boolean; big: boolean }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const cell = big ? 'size-14 sm:size-16' : 'size-12 sm:size-14'
  const { bind, ghost, dragging } = useTileDrag<'c'>({
    onDrop: (_i, x, y) => {
      if (locked) return
      if (hitZone(new Map([[1, frameRef.current]]), x, y, 24)) onAdd()
    },
    onTap: () => !locked && onAdd(),
    ghost: () => <Marble color="blue" size={44} />,
  })
  const frames = size / 10
  const total = a + added
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <div ref={frameRef} className={`flex flex-wrap justify-center gap-3 rounded-2xl p-1 transition ${dragging ? 'ring-4 ring-sky-300' : ''}`}>
        {Array.from({ length: frames }, (_, f) => (
          <div key={f} className="grid grid-cols-5 overflow-hidden rounded-xl border-[3px] border-ink bg-white" role="group" aria-label={`${f + 1}. onluk çerçeve`}>
            {Array.from({ length: 10 }, (_, k) => {
              const i = f * 10 + k
              const red = i < a
              const blue = !red && i < total
              return (
                <button
                  key={k}
                  type="button"
                  disabled={locked || red}
                  onClick={() => (blue ? onRemove() : onAdd())}
                  className={`${cell} grid place-items-center border-ink/60 ${k % 5 !== 4 ? 'border-r-[1.5px]' : ''} ${k < 5 ? 'border-b-[1.5px]' : ''} ${!red && !blue && !locked ? 'hover:bg-sky-50' : ''} disabled:cursor-default`}
                  aria-label={red ? 'Dışarıdaki bilye' : blue ? 'Eklediğin sayaç, çıkarmak için dokun' : 'Boş göz, sayaç eklemek için dokun'}
                >
                  {red ? <Marble size={big ? 40 : 34} /> : blue ? <span className="animate-pop"><Marble color="blue" size={big ? 40 : 34} /></span> : null}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      {!locked && (
        <button type="button" {...bind('c')} data-handle style={{ touchAction: 'none' }} className="flex min-h-16 flex-col items-center justify-center rounded-2xl bg-sky-50 px-3 py-2 ring-2 ring-sky-200 active:scale-95" aria-label="Sayaç kutusu: dokun ya da çerçeveye sürükle">
          <span className="flex -space-x-2"><Marble color="blue" size={30} /><Marble color="blue" size={30} /><Marble color="blue" size={30} /></span>
          <span className="mt-1 text-xs font-black text-sky-800">sürükle ya da dokun</span>
        </button>
      )}
      {ghost}
    </div>
  )
}

/** Sayı bağı: üstte bütün, altta iki parça */
export function NumberBond({ W, a, b, showB }: { W: number; a: number; b: number; showB: boolean }) {
  return (
    <svg viewBox="0 0 220 150" className="mx-auto w-full max-w-[220px]" role="img" aria-label={`Sayı bağı: bütün ${W}, parçalar ${a} ve ${showB ? b : 'bilinmiyor'}`}>
      <line x1={110} y1={42} x2={52} y2={108} stroke={COL.ink} strokeWidth={3} />
      <line x1={110} y1={42} x2={168} y2={108} stroke={COL.ink} strokeWidth={3} />
      <circle cx={110} cy={38} r={30} fill={COL.whole} stroke={COL.ink} strokeWidth={3} />
      <text x={110} y={48} textAnchor="middle" fontSize={28} fontWeight={900} fill={COL.wholeInk}>{W}</text>
      <circle cx={52} cy={112} r={28} fill="#fecdd3" stroke={COL.ink} strokeWidth={3} />
      <text x={52} y={122} textAnchor="middle" fontSize={26} fontWeight={900} fill="#9f1239">{a}</text>
      <circle cx={168} cy={112} r={28} fill={showB ? '#bae6fd' : '#fff'} stroke={COL.ink} strokeWidth={3} strokeDasharray={showB ? undefined : '6 4'} />
      <text x={168} y={122} textAnchor="middle" fontSize={26} fontWeight={900} fill={showB ? '#075985' : '#d6457a'}>{showB ? b : '?'}</text>
    </svg>
  )
}

/* ───────────────────────── Şerit modeli ───────────────────────── */

export type TapeKind = 'tape' | 'first' | 'compare' | 'three' | 'equal'

/**
 * Şerit modeli. Eksik parça `built` kadar büyür; bütünü aşarsa taşan kısım kırmızı görünür.
 * equal: k eşit parça, her biri `built`.
 */
export function TapeModel({ kind, W, a, c = 0, k = 1, built, showB, names, unit, width = 600 }: { width?: number; kind: TapeKind; W: number; a: number; c?: number; k?: number; built: number; showB: boolean; names?: [string, string]; unit?: string }) {
  const VW = width
  const L = 18
  const span = VW - 2 * L
  const known = a + c
  const sumBuilt = kind === 'equal' ? built * k : known + built
  const max = Math.max(W, kind === 'compare' ? a + built : sumBuilt)
  const s = span / max
  const X = (v: number) => L + v * s
  const H = kind === 'compare' ? 206 : 132
  const barY = kind === 'compare' ? 112 : 54
  const bh = 50
  const lbl = (v: number, x: number, w: number, y: number, fill: string, text?: string) =>
    w > 34 ? <text x={x + w / 2} y={y + bh / 2 + 8} textAnchor="middle" fontSize={w > 70 ? 22 : 17} fontWeight={900} fill={fill}>{text ?? tr(v)}</text> : null
  const missLabel = showB ? tr(kind === 'equal' ? built : W - known) : '?'
  const missing = (x0: number, w: number, key: string, label: string) => {
    if (w <= 0) return null
    return (
      <g key={key}>
        <rect x={x0} y={barY} width={w} height={bh} rx={6} fill={COL.miss} stroke={COL.ink} strokeWidth={2.5} />
        {lbl(0, x0, w, barY, COL.missInk, label)}
      </g>
    )
  }
  const gap = (x0: number, w: number) => (w > 1 ? <rect x={x0} y={barY} width={w} height={bh} rx={6} fill="#fff" fillOpacity={0.6} stroke={COL.ink} strokeWidth={2} strokeDasharray="7 5" /> : null)
  const overflow = (x0: number, w: number) => (w > 0.5 ? <rect x={x0} y={barY - 4} width={w} height={bh + 8} rx={6} fill={COL.over} fillOpacity={0.55} stroke="#dc2626" strokeWidth={2} strokeDasharray="4 3" /> : null)
  const bracket = (y: number, label: string) => (
    <g>
      <path d={`M${X(0)} ${y + 12} v-10 h${W * s} v10`} fill="none" stroke={COL.ink} strokeWidth={2.5} />
      <rect x={X(W / 2) - 52} y={y - 26} width={104} height={28} rx={14} fill={COL.whole} />
      <text x={X(W / 2)} y={y - 6} textAnchor="middle" fontSize={19} fontWeight={900} fill={COL.wholeInk}>{label}</text>
    </g>
  )
  const parts: ReactNode[] = []
  if (kind === 'tape' || kind === 'three') {
    parts.push(<rect key="a" x={X(0)} y={barY} width={a * s} height={bh} rx={6} fill={COL.part} stroke={COL.ink} strokeWidth={2.5} />, <g key="al">{lbl(a, X(0), a * s, barY, COL.partInk)}</g>)
    if (kind === 'three') parts.push(<rect key="c" x={X(a)} y={barY} width={c * s} height={bh} rx={6} fill={COL.part2} stroke={COL.ink} strokeWidth={2.5} />, <g key="cl">{lbl(c, X(a), c * s, barY, COL.part2Ink)}</g>)
    parts.push(<g key="gap">{gap(X(known + built), Math.max(0, W - known - built) * s)}</g>)
    parts.push(missing(X(known), built * s, 'm', missLabel) ?? <g key="q">{lbl(0, X(known), (W - known) * s, barY, '#d6457a', '?')}</g>)
    parts.push(<g key="o">{overflow(X(W), Math.max(0, known + built - W) * s)}</g>)
  } else if (kind === 'first') {
    // bilinen parça sağda sabit, eksik parça soldan büyür
    parts.push(<rect key="a" x={X(W - a)} y={barY} width={a * s} height={bh} rx={6} fill={COL.part} stroke={COL.ink} strokeWidth={2.5} />, <g key="al">{lbl(a, X(W - a), a * s, barY, COL.partInk)}</g>)
    parts.push(<g key="gap">{gap(X(built), Math.max(0, W - a - built) * s)}</g>)
    parts.push(missing(X(0), built * s, 'm', missLabel) ?? <g key="q">{lbl(0, X(0), (W - a) * s, barY, '#d6457a', '?')}</g>)
    parts.push(<g key="o">{overflow(X(W - a), Math.max(0, built - (W - a)) * s)}</g>)
  } else if (kind === 'compare') {
    const [n1, n2] = names ?? ['A', 'B']
    const y1 = 26
    parts.push(
      <g key="w">
        <rect x={X(0)} y={y1} width={W * s} height={bh} rx={6} fill={COL.whole} stroke={COL.ink} strokeWidth={2.5} />
        {lbl(W, X(0), W * s, y1, COL.wholeInk)}
        <text x={X(0)} y={y1 - 6} fontSize={15} fontWeight={900} fill={COL.wholeInk}>{n1}</text>
      </g>,
      <text key="n2" x={X(0)} y={barY - 6} fontSize={15} fontWeight={900} fill={COL.partInk}>{n2}</text>,
      <rect key="b" x={X(0)} y={barY} width={a * s} height={bh} rx={6} fill={COL.part} stroke={COL.ink} strokeWidth={2.5} />,
      <g key="bl">{lbl(a, X(0), a * s, barY, COL.partInk)}</g>,
      <g key="gap">{gap(X(a + built), Math.max(0, W - a - built) * s)}</g>,
      missing(X(a), built * s, 'm', missLabel) ?? <g key="q">{lbl(0, X(a), (W - a) * s, barY, '#d6457a', '?')}</g>,
      <g key="o">{overflow(X(W), Math.max(0, a + built - W) * s)}</g>,
      <line key="dash" x1={X(W)} x2={X(W)} y1={y1 + bh} y2={barY + bh + 8} stroke={COL.wholeInk} strokeWidth={2.5} strokeDasharray="6 4" />,
      <g key="brace">
        <path d={`M${X(a)} ${barY + bh + 6} v8 h${(W - a) * s} v-8`} fill="none" stroke="#9a3412" strokeWidth={2.5} />
        <text x={X(a + (W - a) / 2)} y={barY + bh + 34} textAnchor="middle" fontSize={17} fontWeight={900} fill="#9a3412">fark: {missLabel}</text>
      </g>,
    )
  } else {
    // equal: k eşit parça
    if (built === 0) {
      parts.push(<g key="gap">{gap(X(0), W * s)}</g>)
      for (let i = 1; i < k; i++) parts.push(<line key={`d${i}`} x1={X((W / k) * i)} x2={X((W / k) * i)} y1={barY + 6} y2={barY + bh - 6} stroke={COL.ink} strokeWidth={1.5} strokeDasharray="4 4" opacity={0.4} />)
    } else {
      for (let i = 0; i < k; i++) parts.push(<g key={`p${i}`}><rect x={X(built * i)} y={barY} width={built * s} height={bh} rx={6} fill={i % 2 ? '#fed7aa' : COL.miss} stroke={COL.ink} strokeWidth={2.5} />{lbl(built, X(built * i), built * s, barY, COL.missInk)}</g>)
      parts.push(<g key="gap">{gap(X(built * k), Math.max(0, W - built * k) * s)}</g>)
      parts.push(<g key="o">{overflow(X(W), Math.max(0, built * k - W) * s)}</g>)
    }
  }
  return (
    <svg viewBox={`0 0 ${VW} ${H}`} className="block w-full" role="img" aria-label="Şerit modeli">
      {kind !== 'compare' && bracket(barY - 14, `${tr(W)}${unit ? ' ' + unit : ''}`)}
      {parts}
      {kind === 'equal' && built > 0 && built * k !== W && (
        <text x={VW / 2} y={barY + bh + 34} textAnchor="middle" fontSize={17} fontWeight={900} fill={built * k > W ? '#dc2626' : '#5b6080'}>
          {built * k > W ? 'Parçalar bütünden taştı!' : 'Parçalar bütünü doldurmadı.'}
        </text>
      )}
    </svg>
  )
}

/* ───────────────────────── Boş sayı doğrusu (zıplamalar) ───────────────────────── */

/** Ardışık eşit zıplamaları birleştirir: [10,10,1,1,1] → [20, 3] */
export function mergeJumps(jumps: number[]) {
  const out: { size: number; total: number }[] = []
  for (const j of jumps) {
    const last = out[out.length - 1]
    if (last && last.size === j) last.total += j
    else out.push({ size: j, total: j })
  }
  return out
}

export function JumpLine({ start, goal, jumps, dark, width = 600 }: { start: number; goal: number; jumps: number[]; dark?: boolean; width?: number }) {
  const VW = width
  const sum = jumps.reduce((x, y) => x + y, 0)
  const hi = Math.max(goal, start + sum)
  const lo = start - (hi - start) * 0.04
  const X = (v: number) => 24 + ((v - lo) / (hi - lo)) * (VW - 60)
  const y = 92
  const groups = mergeJumps(jumps)
  let pos = start
  const arcs = groups.map((g, i) => {
    const x1 = X(pos), x2 = X(pos + g.total)
    pos += g.total
    const h = Math.min(54, Math.max(16, (x2 - x1) * 0.45))
    return (
      <g key={i} className="animate-fade-up">
        <path d={`M${x1} ${y} Q ${(x1 + x2) / 2} ${y - h * 1.6} ${x2} ${y}`} fill="none" stroke="#ea580c" strokeWidth={3} markerEnd="url(#ep-arrow)" />
        {x2 - x1 > 24 && (
          <text x={(x1 + x2) / 2} y={y - h * 0.8 - 8} textAnchor="middle" fontSize={16} fontWeight={900} fill="#9a3412">+{tr(g.total)}</text>
        )}
      </g>
    )
  })
  // varış noktası etiketleri (çakışmayanlar)
  const stops = [start]
  let p = start
  for (const g of groups) stops.push((p += g.total))
  const shown: number[] = [start, stops[stops.length - 1]]
  for (let i = stops.length - 2; i > 0; i--) if (shown.every((w) => Math.abs(X(w) - X(stops[i])) > 46)) shown.push(stops[i])
  if (shown.length === 2 && shown[0] === shown[1]) shown.pop()
  const reached = start + sum === goal
  const over = start + sum > goal
  const ink = dark ? '#e2e8f0' : COL.ink
  return (
    <div>
    <svg viewBox={`0 0 ${VW} 150`} className="block w-full" role="img" aria-label={`Sayı doğrusu: ${ek(start, 'abl')} başlayan zıplamalar`}>
      <defs>
        <marker id="ep-arrow" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={11} markerHeight={11} markerUnits="userSpaceOnUse" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#ea580c" />
        </marker>
      </defs>
      <line x1={8} x2={VW - 8} y1={y} y2={y} stroke={ink} strokeWidth={3} />
      {/* hedef bayrağı */}
      <g>
        <line x1={X(goal)} x2={X(goal)} y1={y - 70} y2={y + 10} stroke={reached ? '#16a34a' : over ? '#dc2626' : '#7c3aed'} strokeWidth={3} strokeDasharray="5 4" />
        <path d={`M${X(goal)} ${y - 72} l26 8 l-26 8 z`} fill={reached ? '#16a34a' : '#7c3aed'} />
      </g>
      {arcs}
      {stops.map((v, i) => <circle key={i} cx={X(v)} cy={y} r={i === 0 ? 7 : 5.5} fill={i === 0 ? COL.partInk : '#ea580c'} stroke="#fff" strokeWidth={2} />)}
      {shown.map((v) => (
        <text key={`t${v}`} x={X(v)} y={y + 30} textAnchor="middle" fontSize={17} fontWeight={900} fill={v === goal ? (dark ? '#86efac' : '#15803d') : ink}>{tr(v)}</text>
      ))}
      {!shown.includes(goal) && (
        <text x={X(goal)} y={y + 52} textAnchor="middle" fontSize={15} fontWeight={900} fill="#7c3aed">hedef {tr(goal)}</text>
      )}
    </svg>
    {groups.length > 0 && (
      <p className="flex flex-wrap items-center justify-center gap-1.5 pb-1 text-sm font-black text-orange-900" aria-label="Zıplamalar">
        <span className="text-ink-soft">zıplamalar:</span>
        {groups.map((g, i) => <span key={i} className="rounded-full bg-orange-100 px-2.5 py-0.5 ring-1 ring-orange-300">+{tr(g.total)}</span>)}
      </p>
    )}
    </div>
  )
}

/* ───────────────────────── Eşitlik kurucu (karo sürükle-bırak) ───────────────────────── */

export type Tile = { id: string; kind: 'num' | 'op'; v: number | string }
type Slot = Tile | null

/**
 * [ □ ][ ○ ][ □ ] = [ □ ]  — karolar sürüklenir ya da dokunulunca sıradaki uygun boş kutuya gider.
 * Dolu kutuya dokunmak karoyu geri alır. Dört kutu dolunca onCheck çağrılır.
 */
export function EquationBuilder({ tiles, onCheck, big, resetSignal }: { tiles: Tile[]; onCheck: (x: number, op: string, y: number, z: number) => 'ok' | 'dup' | 'bad'; big: boolean; resetSignal: number }) {
  const [slots, setSlots] = useState<Slot[]>([null, null, null, null])
  const [state, setState] = useState<'idle' | 'ok' | 'bad'>('idle')
  const refs = useRef<(HTMLDivElement | null)[]>([])
  useEffect(() => {
    setSlots([null, null, null, null])
    setState('idle')
  }, [resetSignal])
  const used = new Set(slots.filter(Boolean).map((t) => t!.id))
  const place = (t: Tile, i: number) => {
    if ((i === 1) !== (t.kind === 'op')) return
    setState('idle')
    setSlots((cur) => {
      const next = cur.map((s) => (s && s.id === t.id ? null : s))
      next[i] = t
      return next
    })
  }
  const clear = (i: number) => {
    if (!slots[i]) return
    setState('idle')
    setSlots((c) => c.map((v, k) => (k === i ? null : v)))
  }
  const auto = (t: Tile) => {
    if (t.kind === 'op') return place(t, 1)
    const i = [0, 2, 3].find((k) => !slots[k])
    if (i !== undefined) place(t, i)
  }
  const { bind, ghost, dragging } = useTileDrag<Tile>({
    onDrop: (t, x, y) => {
      const z = hitZone(new Map(refs.current.map((el, i) => [i, el])), x, y, 12)
      if (z !== null) place(t, z)
    },
    onTap: (t) => auto(t),
    ghost: (t) => <TileView t={t} big={big} />,
  })
  // dört kutu dolunca kontrol
  useEffect(() => {
    if (slots.some((s) => !s) || state !== 'idle') return
    const tmr = setTimeout(() => {
      const r = onCheck(slots[0]!.v as number, slots[1]!.v as string, slots[2]!.v as number, slots[3]!.v as number)
      if (r === 'bad') setState('bad')
      else {
        setState('ok')
        setTimeout(() => {
          setSlots([null, null, null, null])
          setState('idle')
        }, r === 'ok' ? 900 : 700)
      }
    }, 250)
    return () => clearTimeout(tmr)
  }, [slots]) // eslint-disable-line react-hooks/exhaustive-deps
  const box = big ? 'min-h-16 min-w-[4.5rem] text-2xl' : 'min-h-14 min-w-16 text-xl'
  const slotCls = (i: number) =>
    `${box} ${i === 1 ? '!min-w-14' : ''} grid place-items-center rounded-2xl border-[3px] px-2 font-black transition ${
      slots[i]
        ? state === 'ok'
          ? 'border-green-500 bg-green-50 text-green-800'
          : state === 'bad'
            ? 'border-amber-400 bg-amber-50 text-amber-900'
            : 'border-ink bg-white'
        : `border-dashed ${dragging && (i === 1) === (dragging.kind === 'op') ? 'border-sky-400 bg-sky-50' : 'border-ink/30 bg-white/60'}`
    }`
  return (
    <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-line">
      <div className="flex flex-wrap items-center justify-center gap-2" aria-label="Eşitlik">
        {[0, 1, 2].map((i) => (
          <div key={i} ref={(el) => { refs.current[i] = el }}>
            <button type="button" className={slotCls(i)} onClick={() => clear(i)} aria-label={slots[i] ? `${slots[i]!.v}, geri almak için dokun` : 'Boş kutu'}>
              {slots[i] ? (typeof slots[i]!.v === 'number' ? tr(slots[i]!.v as number) : slots[i]!.v) : ''}
            </button>
          </div>
        ))}
        <span className="px-1 text-3xl font-black">=</span>
        <div ref={(el) => { refs.current[3] = el }}>
          <button type="button" className={slotCls(3)} onClick={() => clear(3)} aria-label={slots[3] ? `${slots[3]!.v}, geri almak için dokun` : 'Boş kutu'}>
            {slots[3] ? tr(slots[3]!.v as number) : ''}
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2 border-t border-line pt-3">
        {tiles.map((t) => (
          <button key={t.id} type="button" {...bind(t)} data-handle style={{ touchAction: 'none' }} disabled={used.has(t.id)} className="disabled:opacity-25" aria-label={`Karo ${t.v}`}>
            <TileView t={t} big={big} />
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-xs font-bold text-ink-soft">Karoları kutulara sürükle ya da dokun. Kutudaki karoya dokununca geri gelir.</p>
      {ghost}
    </div>
  )
}

function TileView({ t, big }: { t: Tile; big: boolean }) {
  const op = t.kind === 'op'
  return (
    <span className={`grid ${big ? 'min-h-16 min-w-16 text-2xl' : 'min-h-14 min-w-14 text-xl'} cursor-grab place-items-center rounded-2xl px-3 font-black shadow-[0_4px_0_rgb(0_0_0/0.15)] ${op ? 'bg-violet-600 text-white' : 'bg-amber-300 text-amber-950'}`}>
      {typeof t.v === 'number' ? tr(t.v) : t.v}
    </span>
  )
}
