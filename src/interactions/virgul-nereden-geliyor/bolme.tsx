import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { silence } from '../../lib/feedback'
import { MathText } from '../../components/MathText'
import type { Grade } from '../../data/types'
import { Scene as GameScene, useAge } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import type { InteractionProps } from '../types'
import { Header, NextButton, useChecks } from '../donusum-studyosu/ortak'
import { Drag, DragAsk, Drop, HowTo, RulesFound, useDnd, type Ask, type Dnd, type Tool, type ToolInfo } from '../sayilari-karsilastir/parts'
import { EndView, useSay } from '../sepetlere-grupla/sepet'

/**
 * Kesir–bölme ilişkisi mini konu anlatımları (98 Virgül Nereden Geliyor?, 99 Bütünü Onda Birlere Kır,
 * 100 Kalanın Yanına Neden Sıfır?) için ortak, sade parçalar. Bilerek basit tutuldu (6. sınıf, tablet):
 *  - görsel dil: 10 parçalı çikolata tableti = 1 bütün, tabletin bir parçası = onda bir (yüzde birlere inilmez)
 *  - her ekranda tek bir “Şimdi ne yapmalısın?” kutusu; araç kartları yalnızca gerektiği anda belirir
 *  - animasyonlar yavaş ve tek hareketli: tabletin parçaları yavaşça birbirinden ayrılır
 *  - ses yok: bu etkileşimler açıkken geri bildirim sesleri de susturulur (Runner)
 */

/* ───────────── basamaklar ───────────── */

export const PLACES = [
  { box: 'Bütün', unit: 'bütün', kid: 'bütün çikolata', color: '#92400e', soft: '#fef3c7' },
  { box: 'Onda bir', unit: 'onda bir', kid: 'parça', color: '#0369a1', soft: '#e0f2fe' },
] as const
export type Place = 0 | 1
export const KIDS = ['🧒', '👧', '👦', '🧑', '👩']

/** “3 bütün 5 parça” */
export const amount = (each: number[]) => {
  const t = [each[0] ? `${each[0]} bütün` : '', each[1] ? `${each[1]} parça` : ''].filter(Boolean).join(' ')
  return t || 'henüz bir şey yok'
}
export const tr = (v: number) => String(v).replace('.', ',')

/* ───────────── yazılı bölme ───────────── */

export interface DivStep { k: number; have: number; q: number; used: number; rem: number }

/** a ÷ b adım adım: k = 0 bütünler, 1 onda birler (a < 10·b varsayılır) */
export function longDiv(a: number, b: number, maxDec = 1): DivStep[] {
  const out: DivStep[] = []
  let have = a
  for (let k = 0; k <= maxDec; k++) {
    const q = Math.floor(have / b)
    const rem = have - q * b
    out.push({ k, have, q, used: q * b, rem })
    if (rem === 0) break
    have = rem * 10
  }
  return out
}
export const quotientText = (steps: DivStep[]) => (steps.length === 1 ? String(steps[0].q) : `${steps[0].q},${steps.slice(1).map((s) => s.q).join('')}`)

/** Yazılı bölmenin o an görünen kısmı */
export interface DivShow { digits: (number | null)[]; comma: boolean; broke: boolean[] }

interface Cell { r: number; c: number; ch: string; k: number; kind: 'div' | 'sub' | 'zero'; line?: boolean; minus?: boolean }

function divCells(a: number, steps: DivStep[]) {
  const cells: Cell[] = []
  const da = String(a).length
  String(a).split('').forEach((ch, i) => cells.push({ r: 0, c: i + 1, ch, k: -1, kind: 'div' }))
  let row = 0
  let end = da
  steps.forEach((s, k) => {
    if (s.q > 0) {
      const sub = String(s.used)
      const st = end - sub.length + 1
      cells.push({ r: row + 1, c: st - 1, ch: '−', k, kind: 'sub', minus: true })
      sub.split('').forEach((ch, i) => cells.push({ r: row + 1, c: st + i, ch, k, kind: 'sub', line: true }))
      row += 2
      const rem = String(s.rem)
      rem.split('').forEach((ch, i) => cells.push({ r: row, c: end - rem.length + 1 + i, ch, k, kind: 'sub' }))
    }
    if (k < steps.length - 1) {
      end++
      cells.push({ r: row, c: end, ch: '0', k, kind: 'zero' })
    }
  })
  return { cells, cols: end + 1, zeroCell: (k: number) => cells.find((c) => c.kind === 'zero' && c.k === k) }
}

const shownCell = (c: Cell, s: DivShow) => c.kind === 'div' || (c.kind === 'sub' && s.digits[c.k] != null) || (c.kind === 'zero' && !!s.broke[c.k])

/**
 * Türk usulü yazılı bölme: bölünen solda, bölen sağ üstte, bölüm altında.
 * Kalanın yanına eklenen sıfır mavi kutuda ve altında “= … parça” notuyla gösterilir.
 */
export function LongDivision({ a, b, steps, show, zeroHot, zeroDrop }: { a: number; b: number; steps: DivStep[]; show: DivShow; zeroHot?: boolean; zeroDrop?: Dnd | null }) {
  const { cells, cols, zeroCell } = divCells(a, steps)
  const W = 1.3
  const H = 1.75
  const z = zeroCell(0)
  const waiting = !!zeroDrop && !!z && !show.broke[0]
  const rows = Math.max(2, ...cells.filter((c) => shownCell(c, show)).map((c) => c.r + 1), waiting && z ? z.r + 1 : 0)
  const q = steps.map((s, k) => (show.digits[k] != null ? String(s.q) : ''))
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
      <p className="mb-1 text-sm font-black text-ink-soft">Yazılı bölme</p>
      <div className="flex justify-center py-1">
        <div className="flex text-[30px] leading-none font-black text-ink tabular-nums">
          <div className="relative" style={{ width: `${cols * W}em`, height: `${rows * H}em` }}>
            {cells.map((c, i) =>
              shownCell(c, show) ? (
                <span
                  key={i}
                  className={`absolute grid place-items-center ${c.kind === 'zero' ? `rounded-lg bg-sky-200 text-sky-800 ${zeroHot ? 'animate-pop ring-4 ring-sky-400' : ''}` : ''} ${c.minus ? 'text-slate-400' : ''}`}
                  style={{ left: `${c.c * W}em`, top: `${c.r * H}em`, width: `${W}em`, height: `${H - 0.15}em`, borderBottom: c.line ? '3px solid #334155' : undefined }}
                >
                  {c.ch}
                </span>
              ) : null,
            )}
            {waiting && z && zeroDrop && (
              <div className="absolute" style={{ left: `${z.c * W}em`, top: `${z.r * H}em`, width: `${W}em`, height: `${H - 0.15}em` }}>
                <Drop dnd={zeroDrop} id="zslot" className="grid size-full place-items-center rounded-lg border-[3px] border-dashed border-sky-500 bg-sky-50 text-lg text-sky-600" style={{ animation: 'kbGlow 1.6s ease-in-out infinite' }}>
                  <span aria-hidden>?</span>
                </Drop>
              </div>
            )}
          </div>
          <div className="ml-1 self-start border-l-[3px] border-slate-700 pl-2" style={{ minHeight: `${2 * H}em` }}>
            <div className="border-b-[3px] border-slate-700 pr-2 pb-0.5" style={{ height: `${H - 0.15}em` }}>{b}</div>
            <div className="pt-1 whitespace-nowrap">
              {q[0]}
              {show.comma && <span className="text-pink-600">,</span>}
              {q[1]}
            </div>
          </div>
        </div>
      </div>
      {show.broke[0] && (
        <p className="mt-1 rounded-xl bg-sky-50 px-3 py-2 text-center text-base font-black text-sky-800 ring-1 ring-sky-200">
          Kalanın yanındaki <span className="rounded bg-sky-200 px-1">0</span>: {steps[0].rem} bütün = {steps[0].rem * 10} parça (onda bir)
        </p>
      )}
    </div>
  )
}

/* ───────────── bir kişinin payı ───────────── */

/**
 * “Bir kişinin payı” kutuları: Bütün | Onda bir. commaSlots: üç virgül yuvası (bütünün solu, arası, sağı).
 * cellDrop: “Bütün” kutusu rakam kartı bekler.
 */
export function ShareBox({ digits, comma, places = 2, dnd, commaSlots, cellDrop, hot }: { digits: (number | null)[]; comma: boolean; places?: number; dnd?: Dnd; commaSlots?: boolean; cellDrop?: boolean; hot?: number | 'comma' | null }) {
  const slot = (i: number) => {
    if (comma && i === 1) return <span key={`s${i}`} className={`grid w-8 place-items-end pb-9 text-6xl leading-none font-black text-pink-600 ${hot === 'comma' ? 'animate-pop' : ''}`}>,</span>
    if (commaSlots && dnd && !comma) return <Drop key={`s${i}`} dnd={dnd} id={`comma-${i}`} className="mx-1 w-8 self-stretch rounded-xl border-[3px] border-dashed border-pink-300 bg-pink-50/60" />
    return <span key={`s${i}`} className="w-3" />
  }
  const parts: ReactNode[] = []
  for (let p = 0; p < places; p++) {
    parts.push(slot(p))
    const pl = PLACES[p]
    const d = digits[p]
    const cell = (
      <span className={`grid h-20 w-full place-items-center rounded-xl bg-white text-5xl font-black tabular-nums ${hot === p ? 'animate-pop' : ''}`} style={{ color: pl.color }}>
        {d ?? ''}
      </span>
    )
    parts.push(
      <div key={p} className="flex w-24 flex-col items-stretch gap-1 rounded-2xl p-1.5 sm:w-28" style={{ background: pl.soft }}>
        {cellDrop && p === 0 && d == null && dnd ? <Drop dnd={dnd} id="cell-0" className="rounded-xl border-[3px] border-dashed" style={{ borderColor: pl.color, animation: 'kbGlow 1.6s ease-in-out infinite' }}>{cell}</Drop> : cell}
        <span className="text-center text-sm leading-tight font-black" style={{ color: pl.color }}>{pl.box}{p === 1 && <span className="block text-[11px] font-bold">(parça)</span>}</span>
      </div>,
    )
  }
  if (places > 1) parts.push(slot(places))
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
      <p className="mb-2 text-sm font-black text-ink-soft">Bir kişinin payı</p>
      <div className="flex items-stretch justify-center">{parts}</div>
    </div>
  )
}

/* ───────────── çikolata ───────────── */

const DARK = '#5b2c12'
const MID = '#8a4a24'
const SHINE = '#b06a3b'

/** Bir parça (onda bir): tabletin tek bir karesi. s = parçanın genişliği (px) */
export function Piece({ s = 12 }: { s?: number }) {
  const h = s * 2
  return (
    <svg width={s} height={h} viewBox={`0 0 ${s} ${h}`} className="shrink-0" aria-hidden>
      <rect width={s} height={h} rx={Math.max(2, s * 0.25)} fill={DARK} />
      <rect x={1.5} y={1.5} width={Math.max(1, s - 3)} height={h - 3} rx={Math.max(1.5, s * 0.18)} fill={MID} />
      <rect x={2.5} y={2.5} width={Math.max(1, s - 5)} height={Math.max(1.5, h * 0.12)} rx={1} fill={SHINE} opacity={0.7} />
    </svg>
  )
}

/** Bütün çikolata: 10 parçalı tablet */
export function Bar({ s = 12 }: { s?: number }) {
  const h = s * 2
  return (
    <svg width={10 * s} height={h} viewBox={`0 0 ${10 * s} ${h}`} className="shrink-0" aria-hidden>
      <rect width={10 * s} height={h} rx={Math.max(3, s * 0.35)} fill={DARK} />
      {Array.from({ length: 10 }, (_, i) => (
        <g key={i}>
          <rect x={i * s + 1.5} y={1.5} width={Math.max(1, s - 3)} height={h - 3} rx={Math.max(1.5, s * 0.18)} fill={MID} />
          <rect x={i * s + 2.5} y={2.5} width={Math.max(1, s - 5)} height={Math.max(1.5, h * 0.12)} rx={1} fill={SHINE} opacity={0.7} />
        </g>
      ))}
    </svg>
  )
}

const FX = `
@keyframes kbApart{to{transform:translateX(var(--dx))}}
@keyframes kbIn{to{opacity:1}}
@keyframes kbGlow{0%,100%{box-shadow:0 0 0 0 rgb(14 165 233/0)}50%{box-shadow:0 0 0 7px rgb(14 165 233/.35)}}
`
export function Fx() {
  return <style>{FX}</style>
}

/** Bir tabletin 10 parçası yavaşça birbirinden ayrılır; count ise altlarında 1…10 belirir */
export function SplitBar({ s = 14, count }: { s?: number; count?: boolean }) {
  return (
    <span className="inline-flex items-start px-6 py-1" role="img" aria-label="Bir bütün çikolata 10 eşit parçaya ayrılıyor">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className="flex flex-col items-center gap-0.5" style={{ '--dx': `${(i - 4.5) * 5}px`, animation: 'kbApart 1.2s .4s ease-in-out forwards' } as CSSProperties}>
          <Piece s={s} />
          {count && <span className="text-xs font-black text-sky-700 opacity-0" style={{ animation: `kbIn .3s ${1.6 + i * 0.3}s forwards` }}>{i + 1}</span>}
        </span>
      ))}
    </span>
  )
}

/** Bütünler ve parçalar (parçalar 10’arlı gruplanır ki sayması kolay olsun) */
export function Stuff({ w = 0, t = 0, s = 10, max = 40 }: { w?: number; t?: number; s?: number; max?: number }) {
  const pieces = Math.min(t, max)
  return (
    <span className="flex flex-wrap items-end gap-1.5">
      {Array.from({ length: Math.min(w, 9) }, (_, i) => <Bar key={`b${i}`} s={s} />)}
      {Array.from({ length: Math.ceil(pieces / 10) }, (_, g) => (
        <span key={`g${g}`} className="flex gap-px">
          {Array.from({ length: Math.min(10, pieces - g * 10) }, (_, i) => <Piece key={i} s={s} />)}
        </span>
      ))}
      {t > max && <span className="self-center text-xs font-black text-ink-soft">+{t - max}</span>}
    </span>
  )
}

/* ───────────── paylaştırma: durum ───────────── */

export interface SimState { pool: number[]; each: number[]; digits: (number | null)[]; comma: boolean; broke: boolean[]; place: Place }
export const startState = (a: number): SimState => ({ pool: [a, 0], each: [0, 0], digits: [null, null], comma: false, broke: [false, false], place: 0 })

/** Ders anlatımı için durumların sırası */
export interface Snap { kind: 'start' | 'deal' | 'stuck' | 'digit' | 'comma' | 'break' | 'end'; p: Place; st: SimState; round?: number; rounds?: number; n?: number }

export function snapshots(a: number, b: number): Snap[] {
  const out: Snap[] = []
  const clone = (s: SimState): SimState => ({ ...s, pool: [...s.pool], each: [...s.each], digits: [...s.digits], broke: [...s.broke] })
  const st = startState(a)
  out.push({ kind: 'start', p: 0, st: clone(st) })
  for (const p of [0, 1] as Place[]) {
    st.place = p
    const rounds = Math.floor(st.pool[p] / b)
    if (rounds === 0) out.push({ kind: 'stuck', p, st: clone(st), n: st.pool[p] })
    for (let r = 1; r <= rounds; r++) {
      st.pool[p] -= b
      st.each[p] += 1
      out.push({ kind: 'deal', p, st: clone(st), round: r, rounds })
    }
    if (rounds > 0 && st.pool[p] > 0) out.push({ kind: 'stuck', p, st: clone(st), n: st.pool[p] })
    st.digits[p] = st.each[p]
    out.push({ kind: 'digit', p, st: clone(st) })
    if (st.pool[p] === 0 || p === 1) break
    st.comma = true
    out.push({ kind: 'comma', p, st: clone(st) })
    const n = st.pool[0]
    st.pool[1] += n * 10
    st.pool[0] = 0
    st.broke[0] = true
    st.place = 1
    out.push({ kind: 'break', p, st: clone(st), n })
  }
  out.push({ kind: 'end', p: st.place, st: clone(st) })
  return out
}

/* ───────────── paylaştırma: görünüm ───────────── */

/** Masadaki çikolatalar; dnd varsa her yığın sürüklenir. splitting: n tablet ayrılırken gösterilir (ders anlatımında). */
export function Table({ st, dnd, splitting, extra, warn }: { st: SimState; dnd?: Dnd; splitting?: number; extra?: ReactNode; warn?: boolean }) {
  const piles = ([0, 1] as Place[]).filter((p) => st.pool[p] > 0 && !(splitting && p === 1))
  return (
    <div className={`rounded-2xl bg-amber-50 p-3 ring-2 ${warn ? 'ring-red-300' : 'ring-amber-200'}`}>
      <p className="mb-2 text-sm font-black text-amber-900">Masadaki çikolatalar</p>
      <div className="flex min-h-[64px] flex-wrap items-center gap-3">
        {splitting ? (
          <span className="flex flex-wrap gap-2">{Array.from({ length: Math.min(splitting, 3) }, (_, i) => <SplitBar key={i} s={splitting === 1 ? 16 : 12} count={splitting === 1} />)}</span>
        ) : null}
        {piles.map((p) => {
          const n = st.pool[p]
          const body = (
            <span className="flex flex-col items-start gap-1.5">
              <Stuff w={p === 0 ? n : 0} t={p === 1 ? n : 0} s={p === 0 ? 11 : 10} />
              <span className="text-base font-black" style={{ color: PLACES[p].color }}>{n} {PLACES[p].kid}</span>
            </span>
          )
          const cls = `rounded-2xl bg-white p-2.5 text-left ring-2 ${warn ? 'ring-red-300' : 'ring-amber-300'}`
          return dnd ? (
            <Drag key={p} dnd={dnd} item={`pile-${p}`} label={`${n} ${PLACES[p].kid}`} className={cls} ghost={p === 0 ? <Bar s={11} /> : <Piece s={14} />}>{body}</Drag>
          ) : (
            <div key={p} className={cls}>{body}</div>
          )
        })}
        {!piles.length && !splitting && <span className="text-base font-bold text-amber-800/70">Masada çikolata kalmadı.</span>}
        {extra}
      </div>
    </div>
  )
}

/** Arkadaşların tabakları */
export function Kids({ b, each, dnd }: { b: number; each: number[]; dnd?: Dnd }) {
  const grid = (
    <div className={`grid gap-2 ${b <= 2 ? 'grid-cols-2' : b === 3 ? 'grid-cols-3' : b === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3 sm:grid-cols-5'}`}>
      {Array.from({ length: b }, (_, i) => (
        <div key={i} className="flex flex-col items-center gap-1 rounded-2xl bg-white p-2 ring-1 ring-line">
          <span className="text-3xl leading-none" aria-hidden>{KIDS[i % KIDS.length]}</span>
          <span className="flex min-h-[40px] w-full flex-wrap items-center justify-center gap-1 rounded-[50%] bg-slate-100 px-2 py-2">
            <Stuff w={each[0]} t={each[1]} s={b > 4 ? 5 : b > 2 ? 6 : 8} max={10} />
          </span>
          <span className="text-center text-sm leading-tight font-black text-ink">{amount(each)}</span>
        </div>
      ))}
    </div>
  )
  return (
    <div className="rounded-2xl bg-sky-50 p-3 ring-2 ring-sky-200">
      <p className="mb-2 text-sm font-black text-sky-900">{b} arkadaşın tabağı</p>
      {dnd ? <Drop dnd={dnd} id="plates" className="rounded-2xl">{grid}</Drop> : grid}
    </div>
  )
}

/** “Şimdi ne yapmalısın?” kutusu */
export function Now({ children, done }: { children: ReactNode; done?: boolean }) {
  return (
    <div className={`flex items-start gap-3 rounded-2xl px-4 py-3 ring-2 ${done ? 'bg-emerald-50 ring-emerald-300' : 'bg-sky-50 ring-sky-300'}`} role="status">
      <span className="text-3xl leading-none" aria-hidden>{done ? '🎉' : '👉'}</span>
      <div>
        <p className={`text-xs font-black tracking-wide uppercase ${done ? 'text-emerald-700' : 'text-sky-700'}`}>{done ? 'Bitti!' : 'Şimdi ne yapmalısın?'}</p>
        <p className="text-lg leading-snug font-extrabold text-ink sm:text-xl">{children}</p>
      </div>
    </div>
  )
}

/* ───────────── paylaştırma: etkileşimli ───────────── */

type Checks = ReturnType<typeof useChecks>

export interface SimProps {
  a: number
  b: number
  checks: Checks
  /** drag: öğrenci virgül kartını koyar; auto: bölünce kendiliğinden konur */
  comma?: 'auto' | 'drag'
  /** drag: kimseye bütün düşmezse “Bütün” kutusuna 0 kartını öğrenci koyar */
  zeroDigit?: 'auto' | 'drag'
  /** cut: kalan çikolatalar ✂️ kutusuna sürüklenir; zero: yazılı bölmede kalanın yanına 0 kartı koyulur */
  breakBy?: 'cut' | 'zero'
  division?: boolean
  /** böldükten sonra “masada ne var?” diye cevap kartı sorulur */
  askUnit?: boolean
  onDone: (st: SimState) => void
  prompt: ReactNode
}

export const SIM_TOOLS = {
  pile: { icon: <Bar s={2} />, name: 'Çikolatalar', text: 'Masadaki çikolataları tutup tabaklara bırak. Her bırakışta her arkadaşa 1 tane gider.' } as ToolInfo,
  cut: { icon: <span className="text-base leading-none">✂️</span>, name: '10 parçaya böl', text: 'Çikolatalar herkese yetmeyince bu kutu çıkar. Kalan çikolatayı buraya bırak: 10 eşit parça olur.' } as ToolInfo,
  comma: { icon: <span className="text-xl leading-none font-black text-pink-600">,</span>, name: 'Virgül kartı', text: 'Bütünler bitince çıkar. “Bir kişinin payı” kutularının arasındaki pembe yuvaya bırak.' } as ToolInfo,
  digit: { icon: <span className="grid size-5 place-items-center rounded-md bg-white text-xs font-black ring-1 ring-line">0</span>, name: 'Rakam kartı', text: '“Bütün” kutusuna bırak.' } as ToolInfo,
  zero: { icon: <span className="grid size-5 place-items-center rounded-md bg-sky-100 text-xs font-black text-sky-700 ring-1 ring-sky-300">0</span>, name: 'Sıfır kartı', text: 'Yazılı bölmede kalanın yanındaki “?” kutusuna bırak.' } as ToolInfo,
  unit: { icon: <span className="rounded bg-sky-100 px-1 text-[10px] font-black text-sky-700">parça</span>, name: 'Cevap kartları', text: 'Doğru kartı boş kutuya bırak.' } as ToolInfo,
}

export function ShareSim({ a, b, checks, comma = 'auto', zeroDigit = 'auto', breakBy = 'cut', division = false, askUnit = false, onDone, prompt }: SimProps) {
  const s = useSay(checks)
  const [st, setSt] = useState<SimState>(() => startState(a))
  const [split, setSplit] = useState<{ n: number; key: number } | null>(null)
  const [ask, setAsk] = useState<number | null>(null)
  const [hot, setHot] = useState<number | 'comma' | null>(null)
  const [finished, setFinished] = useState(false)
  const steps = longDiv(a, b)
  const places = steps.length
  const p = st.place
  const left = st.pool[p]
  const canDeal = left >= b
  const needZeroCard = zeroDigit === 'drag' && p === 0 && !canDeal && st.digits[0] == null && st.each[0] === 0
  const needComma = comma === 'drag' && !st.comma && st.digits[0] != null && st.pool[0] > 0
  const canBreak = p === 0 && !canDeal && left > 0 && st.digits[0] != null && (comma !== 'drag' || st.comma)

  /** Paylaştırma bitince bir kişinin payı kendiliğinden yazılır */
  useEffect(() => {
    if (canDeal || st.digits[p] != null || needZeroCard || ask !== null) return
    const id = window.setTimeout(() => {
      setSt((o) => ({ ...o, digits: o.digits.map((d, i) => (i === p ? o.each[p] : d)) }))
      setHot(p)
    }, 600)
    return () => window.clearTimeout(id)
  }, [canDeal, p, st.digits, needZeroCard, ask])

  useEffect(() => {
    if (finished || st.pool[p] !== 0 || st.digits[p] == null) return
    setFinished(true)
    s.clear()
    const id = window.setTimeout(() => onDone(st), 1200)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st])

  useEffect(() => {
    if (!split) return
    const id = window.setTimeout(() => setSplit(null), 3400)
    return () => window.clearTimeout(id)
  }, [split])

  const brk = () => {
    if (ask !== null) return s.tell('Önce sağdaki soruyu cevapla.')
    if (p !== 0) return s.tell('Parçaları bölmüyoruz. Parçaları tabaklara dağıt.')
    if (canDeal) return s.nudge(`Daha bölme! Masada ${left} çikolata var. Herkese 1 tane daha verebilirsin.`)
    if (st.digits[0] == null) return s.tell(needZeroCard ? 'Önce “Bütün” kutusuna kaç yazacağını bul.' : 'Bir saniye…')
    if (comma === 'drag' && !st.comma) return s.nudge('Önce virgül kartını koy. Sonra bölersin.')
    const n = left
    setSt((o) => ({ ...o, pool: [0, o.pool[1] + n * 10], comma: true, broke: [true, o.broke[1]], place: 1 }))
    setSplit({ n, key: Date.now() })
    if (comma === 'auto') setHot('comma')
    if (askUnit) setAsk(n * 10)
    else s.ok(`${n} bütün çikolata = ${n * 10} parça. Çikolata azalmadı, sadece parçalara bölündü.`)
    return true
  }

  const dnd = useDnd((it, target) => {
    if (finished) return false
    if (it.startsWith('pile-')) {
      const q = Number(it.slice(5)) as Place
      if (target === 'cut') return brk()
      if (target !== 'plates') return false
      if (ask !== null) return s.tell('Önce sağdaki soruyu cevapla.')
      if (q !== p) return s.nudge('Önce bütün çikolataları dağıt.')
      if (!canDeal) {
        if (needZeroCard) return s.nudge(`${left} çikolata ${b} arkadaşa yetmiyor. Kimse bütün çikolata alamaz. “Bütün” kutusuna kaç yazmalısın?`, { mis: 'Bir kişinin aldığı bütün çikolata sayısı yazılır.' })
        if (p === 1) return s.nudge('Parçalar herkese yetmiyor.')
        return s.nudge(`${left} çikolata ${b} arkadaşa yetmiyor. Kimi alır, kimi alamaz. Bu adil olmaz!`, { mis: breakBy === 'zero' ? 'Kalanın yanına 0 yazarsan çikolatalar parçalara bölünür.' : 'Çikolatayı parçalara bölmek gerekiyor.' })
      }
      setSt((o) => ({ ...o, pool: o.pool.map((v, i) => (i === p ? v - b : v)), each: o.each.map((v, i) => (i === p ? v + 1 : v)) }))
      s.clear()
      return true
    }
    if (it === 'zero' && target === 'zslot') return brk()
    if (it === 'comma') {
      if (!target.startsWith('comma-')) return false
      if (target !== 'comma-1') return s.nudge('Virgül, “Bütün” ile “Onda bir” kutusunun ARASINA gelir. Solunda bütünler, sağında parçalar olur.')
      setSt((o) => ({ ...o, comma: true }))
      setHot('comma')
      s.ok('Evet! Virgülün solunda bütünler, sağında parçalar olacak.')
      return true
    }
    if (it.startsWith('dig-')) {
      if (target !== 'cell-0') return false
      if (Number(it.slice(4)) !== 0) return s.nudge('Tabaklara bak: bir arkadaş kaç bütün çikolata aldı?', { mis: '“Bütün” kutusuna bir kişinin aldığı bütün çikolata sayısı yazılır.' })
      setSt((o) => ({ ...o, digits: [0, o.digits[1]] }))
      setHot(0)
      s.ok('Doğru! Kimse bütün almadı, bu yüzden 0.')
      return true
    }
    if (it.startsWith('unit-') && target === 'uslot' && ask !== null) {
      if (it !== 'unit-1') return s.nudge(`Masaya bak: ${ask} tane bütün çikolata mı var, yoksa küçük parça mı?`, { mis: 'Sıfır eklemek çikolatayı çoğaltmaz; çikolata parçalara bölünür.' })
      setAsk(null)
      s.ok(`Evet: ${ask / 10} bütün = ${ask} parça (onda bir). Şimdi parçaları dağıt!`)
      return true
    }
    return false
  })

  const zeroOpen = breakBy === 'zero' && canBreak
  const now = finished
    ? <>Herkes <b>{amount(st.each)}</b> aldı.</>
    : ask !== null
      ? <>Masada şimdi <b>{ask}</b> tane ne var? Doğru kartı kutuya sürükle.</>
      : canDeal
        ? p === 0 ? 'Çikolataları tutup tabaklara sürükle. Her bırakışta herkese 1 tane gider.' : 'Parçaları tutup tabaklara sürükle. Her bırakışta herkese 1 parça gider.'
        : needZeroCard
          ? <>{a} çikolata {b} arkadaşa yetmiyor. Kimse bütün çikolata alamaz. <b>“Bütün” kutusuna 0 kartını koy.</b></>
          : st.digits[p] == null
            ? 'Bir kişinin payı yazılıyor…'
            : needComma
              ? <>Bütün çikolatalar bitti! <b>Virgül kartını</b> “Bütün” ile “Onda bir” kutusunun arasına koy.</>
              : breakBy === 'zero'
                ? <>{left} çikolata kaldı, {b} arkadaşa yetmiyor. <b>Yazılı bölmede kalanın yanına 0 kartını koy.</b> Çikolatalar 10’ar parçaya bölünecek.</>
                : <>{left} çikolata kaldı, {b} arkadaşa yetmiyor. <b>Kalan çikolatayı ✂️ “10 parçaya böl” kutusuna sürükle.</b></>

  const cutZone = breakBy === 'cut' && canBreak && (
    <Drop dnd={dnd} id="cut" className="rounded-2xl animate-fade-up">
      <span className="grid min-h-[88px] w-32 place-items-center rounded-2xl border-[3px] border-dashed border-sky-500 bg-white p-2 text-center" style={{ animation: 'kbGlow 1.6s ease-in-out infinite' }}>
        <span className="text-4xl" aria-hidden>✂️</span>
        <span className="text-sm leading-tight font-black text-sky-800">10 parçaya böl</span>
      </span>
    </Drop>
  )

  const cards: ReactNode[] = []
  if (needComma) cards.push(<Drag key="c" dnd={dnd} item="comma" label="Virgül kartı" className="grid h-20 w-16 place-items-end justify-center rounded-2xl bg-white pb-2 text-6xl leading-none font-black text-pink-600 shadow-[0_4px_0_#f9a8d4] ring-[3px] ring-pink-400">,</Drag>)
  if (needZeroCard) [0, a, b].forEach((v) => cards.push(<Drag key={`d${v}`} dnd={dnd} item={`dig-${v}`} label={`${v} kartı`} className="grid size-16 place-items-center rounded-2xl bg-white text-3xl font-black text-ink shadow-[0_4px_0_#cbd5e1] ring-2 ring-line">{v}</Drag>))
  if (zeroOpen) cards.push(<Drag key="z" dnd={dnd} item="zero" label="Sıfır kartı" className="grid size-16 place-items-center rounded-2xl bg-sky-100 text-3xl font-black text-sky-700 shadow-[0_4px_0_#7dd3fc] ring-[3px] ring-sky-400">0</Drag>)
  if (ask !== null)
    PLACES.forEach((pl, i) => cards.push(<Drag key={`u${i}`} dnd={dnd} item={`unit-${i}`} label={i === 0 ? 'bütün çikolata' : 'parça'} className="min-h-14 rounded-2xl bg-white px-4 text-lg font-black shadow-[0_4px_0_#cbd5e1] ring-2 ring-line"><span style={{ color: pl.color }}>{i === 0 ? 'bütün çikolata' : 'parça (onda bir)'}</span></Drag>))

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white px-4 py-3 text-ink shadow-sm ring-1 ring-line">
        <p className="text-lg leading-snug font-extrabold sm:text-xl">{prompt}</p>
        {finished && (
          <p className="mt-2 inline-flex flex-wrap items-center gap-x-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-2xl font-black text-white tabular-nums animate-pop">
            {a} ÷ {b} = <MathText text={`[[${a}/${b}]]`} /> = {quotientText(steps)}
          </p>
        )}
      </div>
      <Now done={finished}>{now}</Now>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-3">
          <Table
            st={st}
            dnd={dnd}
            warn={!canDeal && !finished && left > 0 && p === 0}
            extra={
              <>
                {cutZone}
                {split && (
                  <span key={split.key} className="flex flex-col items-center gap-1 rounded-2xl bg-white p-2 ring-2 ring-sky-300 animate-fade-up">
                    <span className="flex gap-1">{Array.from({ length: Math.min(split.n, 3) }, (_, i) => <SplitBar key={i} s={9} />)}</span>
                    <span className="text-base font-black text-sky-800">{split.n} bütün = {split.n * 10} parça</span>
                  </span>
                )}
              </>
            }
          />
          <Kids b={b} each={st.each} dnd={dnd} />
          {s.view('work')}
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <ShareBox digits={st.digits} comma={st.comma} places={places} dnd={dnd} commaSlots={needComma} cellDrop={needZeroCard} hot={hot} />
          {ask !== null && (
            <div className="rounded-2xl bg-white p-3 ring-2 ring-sky-300 animate-fade-up">
              <div className="flex items-center gap-2 text-3xl font-black tabular-nums">
                <span>{ask}</span>
                <Drop dnd={dnd} id="uslot" className="grid min-h-14 flex-1 place-items-center rounded-xl border-[3px] border-dashed border-sky-400 bg-sky-50 text-base text-sky-600">kartı buraya sürükle</Drop>
              </div>
            </div>
          )}
          {cards.length > 0 && <div className="flex flex-wrap gap-3 rounded-2xl bg-white p-3 ring-1 ring-line animate-fade-up">{cards}</div>}
          {division && <LongDivision a={a} b={b} steps={steps} show={{ digits: st.digits, comma: st.comma, broke: st.broke }} zeroHot={!!split} zeroDrop={zeroOpen ? dnd : null} />}
          {s.view('panel')}
        </div>
      </div>
    </div>
  )
}

/* ───────────── adım adım mini ders ───────────── */

export interface Scene {
  /** büyük, tek cümlelik anlatım */
  say: string
  /** küçük yardımcı not (isteğe bağlı) */
  note?: ReactNode
  view: ReactNode
}

/**
 * Mini konu anlatımı: her adımda tek cümle ve tek resim. Öğrenci “İleri” ile kendi hızında ilerler;
 * istenirse “Otomatik” ile adımlar okuma süresi kadar bekleyip kendiliğinden geçer. Ses yoktur.
 */
export function Lesson({ scenes, onDone }: { scenes: Scene[]; onDone: () => void }) {
  const [i, setI] = useState(0)
  const [auto, setAuto] = useState(false)
  const sc = scenes[i]
  const last = i === scenes.length - 1
  useEffect(() => {
    if (!auto) return
    if (last) {
      setAuto(false)
      return
    }
    const id = window.setTimeout(() => setI((k) => k + 1), Math.max(4500, sc.say.length * 90 + (sc.note ? 2500 : 0)))
    return () => window.clearTimeout(id)
  }, [i, auto, last, sc])

  return (
    <div className="space-y-3">
      <div className="rounded-3xl bg-white p-3 shadow-sm ring-2 ring-slate-200 sm:p-4">
        <div key={i} className="mb-3 animate-fade-up">
          <p className="text-xs font-black tracking-wide text-pink-700 uppercase">Adım {i + 1} / {scenes.length}</p>
          <p className="text-2xl leading-snug font-black text-ink sm:text-[28px]">{sc.say}</p>
          {sc.note && <p className="mt-2 inline-block rounded-xl bg-amber-100 px-3 py-1.5 text-lg font-extrabold text-amber-900">{sc.note}</p>}
        </div>
        {sc.view}
      </div>
      <div className="sticky bottom-2 z-20 flex items-center gap-2 rounded-2xl bg-white/95 p-2 shadow-[0_-8px_24px_-12px_rgb(15_23_42/0.35)] ring-1 ring-line backdrop-blur">
        <button type="button" onClick={() => { setAuto(false); setI(Math.max(0, i - 1)) }} disabled={i === 0} className="inline-flex min-h-14 items-center gap-1 rounded-xl bg-white px-3 text-base font-extrabold ring-1 ring-line disabled:opacity-40">
          <ChevronLeft size={22} /> Geri
        </button>
        <button type="button" onClick={() => setAuto((x) => !x)} disabled={last} aria-pressed={auto} aria-label={auto ? 'Otomatik geçişi durdur' : 'Adımlar kendiliğinden geçsin'} className="inline-flex min-h-14 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-extrabold ring-1 ring-line disabled:opacity-40">
          {auto ? <Pause size={18} /> : <Play size={18} />}<span className="hidden sm:inline">{auto ? 'Durdur' : 'Otomatik'}</span>
        </button>
        <div className="hidden flex-1 gap-1 sm:flex" aria-hidden>
          {scenes.map((_, k) => <span key={k} className={`h-2.5 flex-1 rounded-full ${k <= i ? 'bg-pink-500' : 'bg-slate-200'}`} />)}
        </div>
        {last ? (
          <button type="button" onClick={onDone} className="btn-primary ml-auto min-h-14 flex-1 text-lg sm:flex-none sm:px-6">Şimdi sen dene <ChevronRight size={22} /></button>
        ) : (
          <button type="button" onClick={() => { setAuto(false); setI(i + 1) }} className="btn-primary ml-auto min-h-14 flex-1 text-lg sm:flex-none sm:px-8">İleri <ChevronRight size={22} /></button>
        )}
      </div>
      {!last && (
        <button type="button" onClick={onDone} className="mx-auto block text-sm font-bold text-ink-soft underline underline-offset-4">Anlatımı geç, hemen deneyeyim</button>
      )}
    </div>
  )
}

/* ───────────── görev akışı ───────────── */

export type Done = (first: boolean, rules: string[]) => void
export interface TaskDef { emoji: string; title: string; goal: string; tools: (Tool | ToolInfo)[]; render: (done: Done, last: boolean) => ReactNode }

export const PLAY_TOOL: ToolInfo = { icon: <span className="grid size-5 place-items-center rounded-full bg-pink-600 text-white"><ChevronRight size={14} /></span>, name: 'Mini ders', text: 'Cümleyi oku, resme bak, sonra “İleri” düğmesine bas. İstersen “Otomatik” ile adımlar kendiliğinden geçer.' }

/** Görevleri sırayla oynatır; sonunda kural defterini gösterir. Açıkken geri bildirim sesleri susturulur. */
export function Runner({ grade, onFinish, tasks, summary, insight, note }: { grade: Grade; onFinish: InteractionProps['onFinish']; tasks: TaskDef[]; summary: (rules: string[]) => string; insight: string; note: string }) {
  // geliştirirken ?gorev=N ile doğrudan N. göreve atlanabilir
  const [idx, setIdx] = useState(() => (import.meta.env.DEV ? Math.max(0, Math.min(tasks.length - 1, Number(new URLSearchParams(window.location.search).get('gorev') ?? 1) - 1 || 0)) : 0))
  const [rules, setRules] = useState<string[]>([])
  const [help, setHelp] = useState(false)
  const firsts = useRef<boolean[]>([])
  const dark = useAge(grade).tier === 'atolye'
  useEffect(() => {
    silence(true)
    return () => silence(false)
  }, [])
  const end = idx >= tasks.length
  const t = tasks[Math.min(idx, tasks.length - 1)]
  const done: Done = (first, rs) => {
    firsts.current[idx] = first
    setRules((old) => [...old, ...rs.filter((x) => !old.includes(x))])
    setIdx(idx + 1)
    setHelp(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const finish = () => onFinish({ stars: starsFor(firsts.current.filter(Boolean).length / tasks.length), summary: summary(rules), insight })
  return (
    <GameScene grade={grade} className="select-none [-webkit-touch-callout:none]">
      <Fx />
      <Header
        emoji={end ? '📒' : t.emoji}
        kicker={end ? 'Tamamlandı' : 'Görev'}
        title={end ? 'Kural defterin' : t.title}
        idx={Math.min(idx, tasks.length - 1)}
        total={tasks.length}
        dark={dark}
        right={end ? null : (
          <button type="button" onClick={() => setHelp((h) => !h)} aria-pressed={help} aria-label="Nasıl kullanılır?" className={`grid size-11 place-items-center rounded-full text-lg font-black ring-1 transition ${help ? 'bg-sky-600 text-white ring-sky-700' : 'bg-white text-sky-700 ring-sky-200 hover:bg-sky-50'}`}>?</button>
        )}
      />
      {!end && <HowTo goal={t.goal} tools={t.tools} open={help} onToggle={() => setHelp((h) => !h)} />}
      {end ? <EndView rules={rules} onFinish={finish} note={note} /> : <div key={idx}>{t.render(done, idx === tasks.length - 1)}</div>}
    </GameScene>
  )
}

export function LessonTask({ scenes, rule, onDone }: { scenes: Scene[]; rule: string; onDone: Done }) {
  return <Lesson scenes={scenes} onDone={() => onDone(true, [rule])} />
}

/** Simülasyon → (isteğe bağlı) sürüklemeli soru → öğrenilen kural → sonraki görev */
export function SimTask({ render, ask, rule, onDone, last, okText }: { render: (checks: Checks, finish: () => void) => ReactNode; ask?: Ask; rule: string; onDone: Done; last: boolean; okText?: string }) {
  const checks = useChecks()
  const [phase, setPhase] = useState<'sim' | 'ask' | 'done'>('sim')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (phase !== 'sim') window.setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
  }, [phase])
  return (
    <div className="space-y-4">
      {render(checks, () => setPhase(ask ? 'ask' : 'done'))}
      <div ref={ref} className="mx-auto max-w-2xl space-y-3">
        {phase === 'ask' && ask && <DragAsk ask={ask} checks={checks} onOk={() => setPhase('done')} okText={okText} />}
        {phase === 'done' && (
          <>
            <RulesFound rules={[rule]} />
            <NextButton last={last} onClick={() => onDone(checks.pass(), [rule])} />
          </>
        )}
      </div>
    </div>
  )
}
