import { useEffect, useState, type ReactNode } from 'react'
import { BookOpen } from 'lucide-react'
import { Drag, Drop, type Dnd, type ToolInfo } from '../sayilari-karsilastir/parts'

/* ───────────── kişiler ───────────── */

/** gen: “Ali’nin”, dat: “Ali’ye” (Türkçe ekler isme göre değişir) */
export const PEOPLE = [
  { name: 'Ali', gen: 'Ali’nin', dat: 'Ali’ye', emoji: '👦', color: '#2563eb', soft: '#eff6ff' },
  { name: 'Ece', gen: 'Ece’nin', dat: 'Ece’ye', emoji: '👧', color: '#db2777', soft: '#fdf2f8' },
  { name: 'Can', gen: 'Can’ın', dat: 'Can’a', emoji: '🧒', color: '#16a34a', soft: '#f0fdf4' },
  { name: 'Elif', gen: 'Elif’in', dat: 'Elif’e', emoji: '👱‍♀️', color: '#9333ea', soft: '#faf5ff' },
  { name: 'Mert', gen: 'Mert’in', dat: 'Mert’e', emoji: '🧑‍🦱', color: '#ea580c', soft: '#fff7ed' },
]

/* ───────────── sayma (kodla doğrulanan gerçek sayılar) ───────────── */

/** n dilimi k kişiye kaç yolla dağıtırız? Kimin aldığı önemli; herkes lo ile hi arasında alır. */
export function countOrdered(n: number, k: number, lo = 0, hi = n): number {
  if (k === 0) return n === 0 ? 1 : 0
  let s = 0
  for (let x = lo; x <= Math.min(hi, n); x++) s += countOrdered(n - x, k - 1, lo, hi)
  return s
}
/** Yalnızca sayılar önemli: n’yi k sayıya (lo ≤ sayı ≤ hi) ayırmanın bütün yolları, büyükten küçüğe yazılmış */
export function listUnordered(n: number, k: number, lo = 0, hi = n): number[][] {
  const out: number[][] = []
  const go = (left: number, slots: number, cap: number, acc: number[]) => {
    if (slots === 0) {
      if (left === 0) out.push(acc)
      return
    }
    for (let x = Math.min(cap, left); x >= lo; x--) if (left - x <= (slots - 1) * x && left - x >= (slots - 1) * lo) go(left - x, slots - 1, x, [...acc, x])
  }
  go(n, k, hi, [])
  return out
}
export const sortDesc = (a: number[]) => [...a].sort((x, y) => y - x)
export const keyOf = (a: number[]) => a.join('-')
export const listText = (a: number[]) => a.join(', ')

/* ───────────── pasta durumu ───────────── */

/** pie[k]: pastanın k. yerinde dilim var mı; home: pastanın kaç yeri dolu başladı; plates[i]: i. kişinin dilimleri */
export interface St { pie: boolean[]; home: number; plates: number[] }
export const fresh = (people: number, home = 12): St => ({ pie: Array.from({ length: 12 }, (_, k) => k < home), home, plates: Array(people).fill(0) })
export const left = (st: St) => st.pie.filter(Boolean).length

/**
 * Bir dilimin taşınması. s-k: pastadaki k. dilim, p-i: i. tabaktaki yığından bir dilim.
 * Hedef to-i (i. tabak) ya da pie (pastaya geri). max: bir tabakta en çok kaç dilim olabilir.
 */
export type Move = { st: St; to: number } | { full: number } | null
export function move(st: St, item: string, target: string, max = 12): Move {
  const [kind, raw] = item.split('-')
  const a = Number(raw)
  const pie = st.pie.slice()
  const plates = st.plates.slice()
  if (target === 'pie') {
    if (kind !== 'p' || !plates[a]) return null
    plates[a]--
    const k = pie.findIndex((x, i) => !x && i < st.home)
    pie[k] = true
    return { st: { ...st, pie, plates }, to: -1 }
  }
  if (!target.startsWith('to-')) return null
  const to = Number(target.slice(3))
  if (kind === 'p' && a === to) return null
  if (plates[to] >= max) return { full: to }
  if (kind === 's') {
    if (!pie[a]) return null
    pie[a] = false
  } else if (kind === 'p') {
    if (!plates[a]) return null
    plates[a]--
  } else return null
  plates[to]++
  return { st: { ...st, pie, plates }, to }
}

/* ───────────── çizim ───────────── */

const rad = (a: number) => (a * Math.PI) / 180
/** Saat 12’den saat yönünde a derece */
const pt = (cx: number, cy: number, r: number, a: number): [number, number] => [cx + r * Math.sin(rad(a)), cy - r * Math.cos(rad(a))]
const f = (v: number) => v.toFixed(2)
export function wedge(cx: number, cy: number, r: number, a0: number, a1: number) {
  const [x0, y0] = pt(cx, cy, r, a0)
  const [x1, y1] = pt(cx, cy, r, a1)
  return `M${f(cx)} ${f(cy)} L${f(x0)} ${f(y0)} A${f(r)} ${f(r)} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${f(x1)} ${f(y1)} Z`
}

const SPRINKLE = ['#38bdf8', '#facc15', '#a78bfa', '#34d399', '#fb923c', '#f472b6']

/** Krema, çilek ve şekerlemeli bir pasta dilimi (üstten görünüş) */
export function SliceArt({ cx, cy, r, a0, a1, k = 0, faded, held }: { cx: number; cy: number; r: number; a0: number; a1: number; k?: number; faded?: boolean; held?: boolean }) {
  const m = (a0 + a1) / 2
  const [dx, dy] = pt(cx, cy, r * 0.83, m)
  const [sx, sy] = pt(cx, cy, r * 0.6, m)
  const [k1x, k1y] = pt(cx, cy, r * 0.36, m - (a1 - a0) * 0.18)
  const [k2x, k2y] = pt(cx, cy, r * 0.42, m + (a1 - a0) * 0.2)
  const w = r * 0.075
  const h = r * 0.095
  return (
    <g opacity={faded ? 0.25 : 1}>
      <path d={wedge(cx, cy, r, a0, a1)} fill="#f2b45f" stroke="#fff" strokeWidth={r * 0.014} strokeLinejoin="round" />
      <path d={wedge(cx, cy, r * 0.9, a0 + 0.6, a1 - 0.6)} fill="#fbcfe8" />
      <path d={wedge(cx, cy, r * 0.9, a0 + 0.6, a1 - 0.6)} fill="none" stroke="#f9a8d4" strokeWidth={r * 0.02} />
      <circle cx={dx} cy={dy} r={r * 0.085} fill="#fff" stroke="#f9a8d4" strokeWidth={r * 0.012} />
      <circle cx={dx - r * 0.02} cy={dy - r * 0.02} r={r * 0.03} fill="#fdf2f8" />
      <g transform={`translate(${f(sx)} ${f(sy)}) rotate(${f(m)})`}>
        <path d={`M0 ${f(-h)} C${f(w * 1.5)} ${f(-h)} ${f(w * 1.1)} ${f(h * 0.4)} 0 ${f(h)} C${f(-w * 1.1)} ${f(h * 0.4)} ${f(-w * 1.5)} ${f(-h)} 0 ${f(-h)}Z`} fill="#ef4444" stroke="#b91c1c" strokeWidth={r * 0.008} />
        <circle cx={-w * 0.45} cy={-h * 0.2} r={r * 0.008} fill="#fde68a" />
        <circle cx={w * 0.45} cy={-h * 0.15} r={r * 0.008} fill="#fde68a" />
        <circle cx={0} cy={h * 0.35} r={r * 0.008} fill="#fde68a" />
        <path d={`M0 ${f(-h * 0.9)} l${f(-w * 0.9)} ${f(-h * 0.35)} l${f(w * 0.5)} ${f(h * 0.05)} l${f(w * 0.4)} ${f(-h * 0.35)} l${f(w * 0.4)} ${f(h * 0.35)} l${f(w * 0.5)} ${f(-h * 0.05)}Z`} fill="#22c55e" stroke="#15803d" strokeWidth={r * 0.006} strokeLinejoin="round" />
      </g>
      <rect x={k1x - r * 0.03} y={k1y - r * 0.008} width={r * 0.06} height={r * 0.016} rx={r * 0.008} fill={SPRINKLE[k % 6]} transform={`rotate(${(k * 47) % 180} ${f(k1x)} ${f(k1y)})`} />
      <rect x={k2x - r * 0.03} y={k2y - r * 0.008} width={r * 0.06} height={r * 0.016} rx={r * 0.008} fill={SPRINKLE[(k + 3) % 6]} transform={`rotate(${(k * 83 + 60) % 180} ${f(k2x)} ${f(k2y)})`} />
      {held && <path d={wedge(cx, cy, r, a0, a1)} fill="#0ea5e922" stroke="#0284c7" strokeWidth={r * 0.03} strokeLinejoin="round" />}
    </g>
  )
}

/** Bir dilimin beşte biri: ince bir dilim (krema ve pandispanya) */
export function PieceArt({ cx, cy, r, a0, a1 }: { cx: number; cy: number; r: number; a0: number; a1: number }) {
  return (
    <g>
      <path d={wedge(cx, cy, r, a0, a1)} fill="#f2b45f" stroke="#fff" strokeWidth={r * 0.01} strokeLinejoin="round" />
      <path d={wedge(cx, cy, r * 0.9, a0 + 0.4, a1 - 0.4)} fill="#ec4899" />
    </g>
  )
}

/** Parmağı izleyen dilim (ucu aşağıda) */
export function SliceGhost({ size = 88 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <SliceArt cx={50} cy={94} r={88} a0={-15} a1={15} k={2} />
    </svg>
  )
}

/** Beşte bir dilim: bütün dilimin kesik çizgili çerçevesi içinde dolu bir şerit */
export function PieceToken({ size = 64, j = 2 }: { size?: number; j?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <path d={wedge(50, 94, 88, -15, 15)} fill="#fdf2f8" stroke="#f472b6" strokeWidth={2} strokeDasharray="5 4" strokeLinejoin="round" />
      {[1, 2, 3, 4].map((c) => {
        const [x, y] = pt(50, 94, 88, -15 + c * 6)
        return <line key={c} x1={50} y1={94} x2={x} y2={y} stroke="#f9a8d4" strokeWidth={1} strokeDasharray="3 3" />
      })}
      <PieceArt cx={50} cy={94} r={88} a0={-15 + j * 6} a1={-15 + (j + 1) * 6} />
    </svg>
  )
}

/** CSS clip-path: dilimin dışında kalan yere dokunmak o dilimi tutmaz (yan yana dilimler karışmasın) */
function clipFor(a0: number, a1: number) {
  const R = 48.8
  const ps = ['50% 50%']
  for (let i = 0; i <= 6; i++) {
    const a = a0 + ((a1 - a0) * i) / 6
    ps.push(`${(50 + R * Math.sin(rad(a))).toFixed(2)}% ${(50 - R * Math.cos(rad(a))).toFixed(2)}%`)
  }
  return `polygon(${ps.join(', ')})`
}

/**
 * Üstten görünen 12 dilimli pasta. Her dilim ayrı bir sürüklenebilir öğedir (s-k);
 * clip-path ile yalnızca kendi diliminin üstüne dokununca tutulur. Pastanın tamamı bir bırakma hedefidir (pie).
 */
export function Pie({ st, dnd, locked, wrong, label }: { st: St; dnd: Dnd; locked?: boolean; wrong?: boolean; label?: string }) {
  const n = left(st)
  return (
    <Drop dnd={dnd} id="pie" className={`relative mx-auto aspect-square w-full max-w-[min(300px,72vw)] rounded-full ${wrong ? 'animate-shake' : ''}`}>
      <svg viewBox="0 0 300 300" className="absolute inset-0 size-full" aria-hidden>
        <circle cx={150} cy={152} r={149} fill="#e2e8f0" />
        <circle cx={150} cy={150} r={149} fill="#fff" stroke="#cbd5e1" strokeWidth={2} />
        <circle cx={150} cy={150} r={140} fill="#f8fafc" stroke="#e2e8f0" strokeWidth={2} strokeDasharray="6 6" />
        {st.pie.map((has, k) =>
          has ? null : (
            <g key={k}>
              <path d={wedge(150, 150, 140, k * 30, k * 30 + 30)} fill="none" stroke={k < st.home ? '#e2e8f0' : '#f1f5f9'} strokeWidth={1.5} />
              {k < st.home && (() => {
                const [x, y] = pt(150, 150, 95, k * 30 + 12)
                return <circle cx={x} cy={y} r={2.5} fill="#f2b45f" opacity={0.6} />
              })()}
            </g>
          ),
        )}
        {n === 0 && <text x={150} y={158} textAnchor="middle" fontSize={22} fontWeight={900} fill="#94a3b8">Pasta bitti!</text>}
      </svg>
      {st.pie.map((has, k) => {
        if (!has) return null
        const item = `s-${k}`
        const art = (
          <svg viewBox="0 0 300 300" className="size-full" aria-hidden>
            <SliceArt cx={150} cy={150} r={140} a0={k * 30} a1={k * 30 + 30} k={k} faded={dnd.dragging === item} held={dnd.held === item} />
          </svg>
        )
        return (
          <div key={k} className="absolute inset-0" style={{ clipPath: clipFor(k * 30, k * 30 + 30) }}>
            {locked ? art : (
              <Drag dnd={dnd} item={item} label="Pasta dilimi" ghost={<SliceGhost />} className="block size-full rounded-none">
                {art}
              </Drag>
            )}
          </div>
        )
      })}
      {label && <span className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-0.5 text-sm font-black whitespace-nowrap text-ink shadow-sm ring-1 ring-line">{label}</span>}
    </Drop>
  )
}

/** Tabaktaki dilimler pastadaki gibi yan yana dizilir: kimin pastanın ne kadarını aldığı bir bakışta görünür */
export function PlateArt({ count, pieces = 0, cap }: { count: number; pieces?: number; cap?: number }) {
  return (
    <svg viewBox="0 0 100 100" className="mx-auto block aspect-square w-full max-w-[112px]" aria-hidden>
      <circle cx={50} cy={51.5} r={48} fill="#cbd5e1" />
      <circle cx={50} cy={50} r={48} fill="#fff" stroke="#cbd5e1" strokeWidth={1} />
      <circle cx={50} cy={50} r={40} fill="none" stroke="#e2e8f0" strokeWidth={1.2} />
      {cap !== undefined && Array.from({ length: cap }, (_, k) => (k < count ? null : <path key={k} d={wedge(50, 50, 40, k * 30, k * 30 + 30)} fill="none" stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 2.5" />))}
      {Array.from({ length: count }, (_, k) => <SliceArt key={k} cx={50} cy={50} r={40} a0={k * 30} a1={k * 30 + 30} k={k + 5} />)}
      {Array.from({ length: pieces }, (_, j) => {
        const a0 = count * 30 + 4 + j * 8
        return <PieceArt key={`q${j}`} cx={50} cy={50} r={40} a0={a0} a1={a0 + 6} />
      })}
    </svg>
  )
}

/** Bir kişinin tabağı: bırakma hedefi (to-i); doluysa dilim yığını tek, büyük bir tutma alanıdır (p-i) */
export function Plate({ i, count, pieces = 0, dnd, wrong, locked, cap, flash }: { i: number; count: number; pieces?: number; dnd: Dnd; wrong?: boolean; locked?: boolean; cap?: number; flash?: boolean }) {
  const p = PEOPLE[i]
  const art = <PlateArt count={count} pieces={pieces} cap={cap} />
  return (
    <Drop dnd={dnd} id={`to-${i}`} className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl border-2 p-1.5 ${wrong ? 'animate-shake ring-4 ring-amber-400' : ''} ${flash ? 'animate-pop' : ''}`} style={{ background: p.soft, borderColor: `${p.color}55` }}>
      <p className="flex items-center gap-1 text-sm leading-none font-black" style={{ color: p.color }}>
        <span className="text-xl" aria-hidden>{p.emoji}</span>{p.name}
      </p>
      {count > 0 && !locked ? (
        <Drag dnd={dnd} item={`p-${i}`} label={`${p.gen} tabağından bir dilim`} ghost={<SliceGhost />} className="block w-full rounded-full">
          {art}
        </Drag>
      ) : (
        <div className="w-full">{art}</div>
      )}
      <p className="text-center text-xs leading-tight font-extrabold text-ink-soft">
        <b className="text-xl text-ink tabular-nums">{count}</b> dilim
        {pieces > 0 && <span className="block text-[11px] font-black text-pink-700">+ {pieces} parça</span>}
        {cap !== undefined && <span className="block text-[10px] text-slate-400">en çok {cap}</span>}
      </p>
    </Drop>
  )
}

/** Tabaklar: telefonda 3 + 2, tablette tek sıra */
export function Plates({ st, dnd, wrong, locked, cap, pieces, flash }: { st: St; dnd: Dnd; wrong?: number | null; locked?: boolean; cap?: number; pieces?: number[]; flash?: number | null }) {
  const k = st.plates.length
  return (
    <div className={`mx-auto grid gap-2 ${k === 2 ? 'max-w-sm grid-cols-2' : 'grid-cols-3 sm:grid-cols-5'}`}>
      {st.plates.map((c, i) => <Plate key={i} i={i} count={c} pieces={pieces?.[i]} dnd={dnd} wrong={wrong === i} locked={locked} cap={cap} flash={flash === i} />)}
    </div>
  )
}

/** Kısa süre için true olan bir işaret (yeni kayıt parlasın) */
export function useFlash<T>(ms = 900) {
  const [v, setV] = useState<T | null>(null)
  useEffect(() => {
    if (v === null) return
    const id = window.setTimeout(() => setV(null), ms)
    return () => window.clearTimeout(id)
  }, [v, ms])
  return [v, setV] as const
}

/* ───────────── “Nasıl kullanılır?” araçları ───────────── */

const mini = (node: ReactNode) => <svg viewBox="0 0 100 100" width={26} height={26} aria-hidden>{node}</svg>

export const TOOL: Record<'slice' | 'plate' | 'ledger' | 'knife' | 'piece' | 'card' | 'reset', ToolInfo> = {
  slice: { icon: mini(<SliceArt cx={50} cy={94} r={88} a0={-15} a1={15} />), name: 'Pasta dilimi', text: 'Pastadaki bir dilimi tut ve bir arkadaşın tabağına sürükle.' },
  plate: { icon: <span className="text-lg leading-none">🍽️</span>, name: 'Tabak', text: 'Tabaktaki dilimlere dokunup sürükle: bir dilim kalkar. Başka bir tabağa ya da pastaya geri bırak.' },
  ledger: { icon: <BookOpen size={18} className="text-amber-600" />, name: 'Dağıtım defteri', text: 'Pasta bitince dağıtım kendiliğinden yazılır. “Kim kaç aldı?” ve “Yalnızca sayılar” düğmeleriyle iki türlü bakabilirsin.' },
  knife: { icon: <span className="text-lg leading-none">🔪</span>, name: 'Kesme tahtası', text: 'Artan bir dilimi tahtaya sürükle: 5 eşit parçaya kesilir.' },
  piece: { icon: <PieceToken size={26} />, name: 'Küçük parça', text: 'Kesilen parçaları tek tek tabaklara sürükle. Herkese birer parça!' },
  card: { icon: <span className="grid h-5 min-w-6 place-items-center rounded-md bg-white px-0.5 text-[10px] font-black ring-1 ring-line">13</span>, name: 'Sayı kartları', text: 'Bir kartı tutup tablodaki “?” kutusuna bırak. Uymazsa geri döner ve bir soru çıkar.' },
  reset: { icon: <span className="text-base leading-none">↺</span>, name: 'Dilimleri geri koy', text: 'Bütün dilimleri pastaya geri koyar. Defterdekiler silinmez.' },
}
