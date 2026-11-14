import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { sfx } from '../../lib/feedback'
import { MathText } from '../../components/MathText'
import type { Grade } from '../../data/types'
import { Scene as GameScene } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import type { InteractionProps } from '../types'
import { Header, NextButton, useChecks } from '../donusum-studyosu/ortak'
import { Drag, DragAsk, Drop, HowTo, RulesFound, useDnd, type Ask, type Dnd, type Tool, type ToolInfo } from '../sayilari-karsilastir/parts'
import { EndView, useSay } from '../sepetlere-grupla/sepet'

/**
 * Kesir–bölme ilişkisi mini konu anlatımları (98 Virgül Nereden Geliyor?, 99 Bütünü Onda Birlere Kır,
 * 100 Kalanın Yanına Neden Sıfır?) için ortak parçalar:
 *  - çikolata blokları (bütün = 10 × 10 tablet, onda bir = şerit, yüzde bir = kare) ve kırma animasyonu
 *  - Türk usulü yazılı bölme (kalanın yanına eklenen sıfırlar ayrı renkte)
 *  - bölüm tablosu (Birler , Onda birler  Yüzde birler) ve virgül yuvaları
 *  - paylaştırma masası: yığını tabaklara sürükle = herkese birer tane; kırıcıya sürükle = 10 küçük parçaya böl
 *  - “video” oynatıcı: sahne sahne otomatik oynayan, sesli anlatımlı (cihazda Türkçe ses varsa) mini ders
 */

/* ───────────── basamaklar ───────────── */

export const PLACES = [
  { name: 'Birler', unit: 'bütün', pile: 'Bütünler', color: '#b45309', soft: '#fef3c7' },
  { name: 'Onda birler', unit: 'onda bir', pile: 'Onda birler', color: '#0284c7', soft: '#e0f2fe' },
  { name: 'Yüzde birler', unit: 'yüzde bir', pile: 'Yüzde birler', color: '#7c3aed', soft: '#ede9fe' },
] as const

export type Place = 0 | 1 | 2
export const KIDS = ['🧒', '👧', '👦', '🧑', '👩', '🧒🏽', '👧🏻', '👦🏾']

/* ───────────── yazılı bölme ───────────── */

export interface DivStep { k: number; have: number; q: number; used: number; rem: number }

/** a ÷ b adım adım: k = 0 bütünler, 1 onda birler, 2 yüzde birler… (a < 10·b varsayılır) */
export function longDiv(a: number, b: number, maxDec = 2): DivStep[] {
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

export type DivKind = 'q' | 'sub' | 'comma' | 'zero'
/** Yazılı bölmenin o an görünen kısmı */
export interface DivShow { digits: (number | null)[]; comma: boolean; broke: boolean[] }
export interface Hot { k: number; kind: DivKind }

interface Cell { r: number; c: number; ch: string; k: number; kind: DivKind | 'div'; line?: boolean; minus?: boolean }

function divCells(a: number, steps: DivStep[]) {
  const cells: Cell[] = []
  const da = String(a).length
  String(a).split('').forEach((ch, i) => cells.push({ r: 0, c: i + 1, ch, k: -1, kind: 'div' }))
  let row = 0
  let end = da
  steps.forEach((s, k) => {
    const last = k === steps.length - 1
    if (s.q > 0) {
      const sub = String(s.used)
      const st = end - sub.length + 1
      cells.push({ r: row + 1, c: st - 1, ch: '−', k, kind: 'sub', minus: true })
      sub.split('').forEach((ch, i) => cells.push({ r: row + 1, c: st + i, ch, k, kind: 'sub', line: true }))
      row += 2
      const rem = String(s.rem)
      rem.split('').forEach((ch, i) => cells.push({ r: row, c: end - rem.length + 1 + i, ch, k, kind: 'sub' }))
    }
    if (!last) {
      end++
      cells.push({ r: row, c: end, ch: '0', k, kind: 'zero' })
    }
  })
  return { cells, cols: end + 1, rows: row + 1, nextZero: (k: number) => cells.find((c) => c.kind === 'zero' && c.k === k) }
}

const shownCell = (c: Cell, s: DivShow) =>
  c.kind === 'div' || ((c.kind === 'q' || c.kind === 'sub') && s.digits[c.k] != null) || (c.kind === 'zero' && !!s.broke[c.k]) || (c.kind === 'comma' && s.comma)

/**
 * Türk usulü yazılı bölme: bölünen solda, bölen sağ üstte, bölüm bölenin altında.
 * Kalanın yanına eklenen sıfırlar mavi yazılır. zeroDrop verilirse sıradaki sıfırın yeri bir bırakma hedefi olur.
 */
export function LongDivision({ a, b, steps, show, hot, zeroDrop, label = 'Yazılı bölme' }: { a: number; b: number; steps: DivStep[]; show: DivShow; hot?: Hot | null; zeroDrop?: { dnd: Dnd; k: number } | null; label?: string }) {
  const { cells, cols, nextZero } = divCells(a, steps)
  const W = 1.25
  const H = 1.7
  const isHot = (k: number, kind: string) => !!hot && hot.k === k && hot.kind === kind
  const z = zeroDrop ? nextZero(zeroDrop.k) : undefined
  /** kutu yazıldıkça uzar: yalnızca görünen satırlar (ve sıradaki sıfır yuvası) yer kaplar */
  const rows = Math.max(2, ...cells.filter((c) => shownCell(c, show)).map((c) => c.r + 1), z && zeroDrop && !show.broke[zeroDrop.k] ? z.r + 1 : 0)
  const q = steps.map((s, k) => ({ d: s.q, k }))
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
      <p className="mb-1 text-[11px] font-black tracking-wide text-ink-soft uppercase">{label}</p>
      <div className="flex justify-center overflow-x-auto py-1">
        <div className="relative flex text-[26px] leading-none font-black text-ink tabular-nums sm:text-[30px]">
          <div className="relative" style={{ width: `${cols * W}em`, height: `${rows * H}em` }}>
            {cells.map((c, i) =>
              shownCell(c, show) ? (
                <span
                  key={i}
                  className={`absolute grid place-items-center ${isHot(c.k, c.kind) ? 'animate-pop text-pink-600' : ''} ${c.kind === 'zero' ? 'rounded-md bg-sky-100 text-sky-700' : ''} ${c.minus ? 'text-ink-soft' : ''}`}
                  style={{ left: `${c.c * W}em`, top: `${c.r * H}em`, width: `${W}em`, height: `${H - 0.15}em`, borderBottom: c.line ? '3px solid #334155' : undefined }}
                >
                  {c.ch}
                </span>
              ) : null,
            )}
            {z && zeroDrop && !show.broke[zeroDrop.k] && (
              <div className="absolute" style={{ left: `${z.c * W}em`, top: `${z.r * H}em`, width: `${W}em`, height: `${H - 0.15}em` }}>
                <Drop dnd={zeroDrop.dnd} id="zslot" className="grid size-full place-items-center rounded-md border-2 border-dashed border-sky-500 bg-sky-50 text-base text-sky-500">
                  <span aria-hidden>?</span>
                </Drop>
              </div>
            )}
          </div>
          <div className="ml-1 self-start border-l-[3px] border-slate-700 pl-2" style={{ minHeight: `${2 * H}em` }}>
            <div className="border-b-[3px] border-slate-700 pr-2 pb-0.5" style={{ height: `${H - 0.15}em` }}>{b}</div>
            <div className="flex pt-1 whitespace-nowrap">
              {q.map(({ d, k }) => (
                <span key={k} className="flex">
                  {k === 1 && show.comma && <span className={isHot(0, 'comma') ? 'animate-pop text-pink-600' : ''}>,</span>}
                  {show.digits[k] != null && <span className={isHot(k, 'q') ? 'animate-pop text-pink-600' : ''}>{d}</span>}
                </span>
              ))}
              {show.digits[0] != null && show.comma && show.digits[1] == null && <span className="text-slate-300">…</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───────────── bölüm tablosu ───────────── */

/**
 * Bölüm tablosu: Birler | Onda birler | Yüzde birler. commaSlots: üç virgül yuvası (birlerin solu, doğru yer, onda birlerin sağı).
 * cellDrop: birler hücresi rakam kartı bekler.
 */
export function QuotientBoard({ digits, comma, dnd, commaSlots, cellDrop, hot, places = 3 }: { digits: (number | null)[]; comma: boolean; dnd?: Dnd; commaSlots?: boolean; cellDrop?: boolean; hot?: number | 'comma' | null; places?: number }) {
  const slot = (i: number) => {
    if (comma && i === 1) return <span key={`s${i}`} className={`grid w-7 place-items-end pb-1 text-5xl leading-none font-black text-pink-600 ${hot === 'comma' ? 'animate-pop' : ''}`}>,</span>
    if (commaSlots && dnd && !comma) return <Drop key={`s${i}`} dnd={dnd} id={`comma-${i}`} className="mx-0.5 w-7 self-stretch rounded-lg" />
    return <span key={`s${i}`} className="w-2" />
  }
  const parts: ReactNode[] = []
  for (let p = 0; p < places; p++) {
    parts.push(slot(p))
    const pl = PLACES[p]
    const d = digits[p]
    const cell = (
      <span className={`grid h-16 w-full place-items-center rounded-xl bg-white text-4xl font-black tabular-nums ${hot === p ? 'animate-pop' : ''}`} style={{ color: pl.color }}>
        {d ?? ''}
      </span>
    )
    parts.push(
      <div key={p} className="flex w-[4.6rem] flex-col items-stretch gap-1 rounded-xl p-1 sm:w-24" style={{ background: pl.soft }}>
        <span className="text-center text-[11px] leading-tight font-black" style={{ color: pl.color }}>{pl.name}</span>
        {cellDrop && p === 0 && d == null && dnd ? <Drop dnd={dnd} id="cell-0" className="rounded-xl border-2 border-dashed" style={{ borderColor: pl.color }}>{cell}</Drop> : cell}
      </div>,
    )
  }
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
      <p className="mb-1.5 text-[11px] font-black tracking-wide text-ink-soft uppercase">Bölüm tablosu · bir kişinin payı</p>
      <div className="flex items-stretch justify-center">{parts}</div>
    </div>
  )
}

/* ───────────── çikolata blokları ───────────── */

const CHOC = '#6b3519'
const CHOC_LINE = '#a0623a'

/** p = 0 bütün (10 × 10 tablet), 1 onda bir (şerit), 2 yüzde bir (kare); u = küçük karenin kenarı (px) */
export function Block({ p, u = 6, className = '', style }: { p: Place; u?: number; className?: string; style?: CSSProperties }) {
  const w = p === 0 ? 10 * u : u
  const h = p === 2 ? u : 10 * u
  const lines: ReactNode[] = []
  if (p === 0) for (let i = 1; i < 10; i++) lines.push(<line key={`v${i}`} x1={i * u} y1={0} x2={i * u} y2={h} />)
  if (p !== 2) for (let i = 1; i < 10; i++) lines.push(<line key={`h${i}`} x1={0} y1={i * u} x2={w} y2={i * u} />)
  return (
    <svg width={w} height={h} viewBox={`-1 -1 ${w + 2} ${h + 2}`} className={`shrink-0 overflow-visible ${className}`} style={style} aria-hidden>
      <rect x={0} y={0} width={w} height={h} rx={Math.min(3, u / 2)} fill={CHOC} stroke={PLACES[p].color} strokeWidth={2} />
      <g stroke={CHOC_LINE} strokeWidth={Math.max(0.6, u / 8)}>{lines}</g>
    </svg>
  )
}

/** Bir yığının resmi: bütünler yan yana, onda birler 10’arlı demetler, yüzde birler 10’arlı sıralar */
export function Pile({ p, n, u = 6, max = 60 }: { p: Place; n: number; u?: number; max?: number }) {
  if (n <= 0) return null
  const shown = Math.min(n, max)
  if (p === 0) return <span className="flex flex-wrap gap-1">{Array.from({ length: shown }, (_, i) => <Block key={i} p={0} u={u} />)}</span>
  const groups = Math.ceil(shown / 10)
  return (
    <span className={`flex flex-wrap gap-1.5 ${p === 2 ? 'items-start' : ''}`}>
      {Array.from({ length: groups }, (_, g) => {
        const k = Math.min(10, shown - g * 10)
        return (
          <span key={g} className={p === 1 ? 'flex gap-[2px]' : 'grid grid-cols-5 gap-[2px]'}>
            {Array.from({ length: k }, (_, i) => <Block key={i} p={p} u={u} />)}
          </span>
        )
      })}
      {n > max && <span className="self-center text-xs font-black text-ink-soft">+{n - max}</span>}
    </span>
  )
}

const FX = `
@keyframes kbFly{0%{transform:translate(0,0) rotate(0);opacity:1}30%{transform:translate(var(--dx),-14px) rotate(var(--r));opacity:1}100%{transform:translate(calc(var(--dx)*1.8),46px) rotate(calc(var(--r)*2.2));opacity:0}}
@keyframes kbHammer{0%,100%{transform:rotate(0)}30%{transform:rotate(-38deg)}55%{transform:rotate(18deg)}}
@keyframes kbFlash{0%{opacity:.9;transform:scale(.4)}100%{opacity:0;transform:scale(1.6)}}
`
export function Fx() {
  return <style>{FX}</style>
}

/** Bir bütünün (ya da onda birin) 10 eş parçaya ayrılıp saçılması */
export function Burst({ p, n = 1, u = 7 }: { p: 0 | 1; n?: number; u?: number }) {
  const k = Math.min(n, 3)
  return (
    <span className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
      <span className="absolute size-24 rounded-full bg-amber-200" style={{ animation: 'kbFlash .6s ease-out forwards' }} />
      <span className="relative flex gap-3">
        {Array.from({ length: k }, (_, j) => (
          <span key={j} className={`relative flex ${p === 1 ? 'flex-col' : ''}`}>
            {Array.from({ length: 10 }, (_, i) => (
              <Block
                key={i}
                p={(p + 1) as Place}
                u={u}
                style={{ '--dx': `${(i - 4.5) * (p === 0 ? 7 : 3)}px`, '--r': `${(i - 4.5) * 6}deg`, animation: `kbFly 1.15s ${0.08 + j * 0.12}s cubic-bezier(.2,.7,.3,1) forwards` } as CSSProperties}
              />
            ))}
          </span>
        ))}
      </span>
    </span>
  )
}

/* ───────────── paylaştırma: durum ───────────── */

export interface SimState {
  pool: number[]
  each: number[]
  digits: (number | null)[]
  comma: boolean
  broke: boolean[]
  /** şu an paylaştırılan basamak */
  place: Place
}

export const startState = (a: number): SimState => ({ pool: [a, 0, 0], each: [0, 0, 0], digits: [null, null, null], comma: false, broke: [false, false, false], place: 0 })

export const shareText = (each: number[]) => {
  const parts = each.map((v, p) => (v ? `${v} ${PLACES[p].unit}` : '')).filter(Boolean)
  return parts.length ? parts.join(' ') : 'henüz bir şey yok'
}

/** Ders anlatımı için durumların sırası */
export interface Snap { kind: 'start' | 'deal' | 'stuck' | 'digit' | 'comma' | 'break' | 'end'; p: Place; st: SimState; round?: number; rounds?: number; n?: number }

export function snapshots(a: number, b: number): Snap[] {
  const out: Snap[] = []
  const clone = (s: SimState): SimState => ({ ...s, pool: [...s.pool], each: [...s.each], digits: [...s.digits], broke: [...s.broke] })
  let st = startState(a)
  out.push({ kind: 'start', p: 0, st: clone(st) })
  for (let p = 0 as Place; p <= 2; p = (p + 1) as Place) {
    const rounds = Math.floor(st.pool[p] / b)
    if (st.pool[p] < b) out.push({ kind: 'stuck', p, st: clone(st), n: st.pool[p] })
    for (let r = 1; r <= rounds; r++) {
      st.pool[p] -= b
      st.each[p] += 1
      out.push({ kind: 'deal', p, st: clone(st), round: r, rounds })
    }
    if (rounds > 0 && st.pool[p] > 0) out.push({ kind: 'stuck', p, st: clone(st), n: st.pool[p] })
    st.digits[p] = st.each[p]
    out.push({ kind: 'digit', p, st: clone(st) })
    if (st.pool[p] === 0 || p === 2) break
    if (p === 0) {
      st.comma = true
      out.push({ kind: 'comma', p, st: clone(st) })
    }
    const n = st.pool[p]
    st.pool[p + 1] += n * 10
    st.pool[p] = 0
    st.broke[p] = true
    st = { ...st, place: (p + 1) as Place }
    out.push({ kind: 'break', p, st: clone(st), n })
  }
  out.push({ kind: 'end', p: st.place, st: clone(st) })
  return out
}

/* ───────────── paylaştırma: görünüm ───────────── */

/** Masa (ortadaki yığınlar) + kırıcı + tabaklar. dnd verilmezse yalnızca resimdir (ders anlatımında). */
export function ShareTable({ b, st, dnd, hammer, burst, wrong, item = 'çikolata' }: { b: number; st: SimState; dnd?: Dnd; hammer?: boolean; burst?: { p: 0 | 1; n: number; key: number } | null; wrong?: string | null; item?: string }) {
  const u = b > 4 ? 3 : 4
  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl bg-amber-50/80 p-2.5 ring-1 ring-amber-200">
        {!hammer && burst && <Burst key={burst.key} p={burst.p} n={burst.n} u={5} />}
        <p className="mb-1.5 flex items-center justify-between text-[11px] font-black tracking-wide text-amber-800 uppercase">
          <span>Masada paylaştırılacak {item}</span>
          {dnd && <span className="normal-case">{hammer ? 'Yığını tut, tabaklara ya da kırıcıya sürükle' : 'Yığını tut, tabaklara sürükle'}</span>}
        </p>
        <div className="flex flex-wrap items-stretch gap-2">
          {PLACES.map((pl, p) => {
            const n = st.pool[p]
            const active = p === st.place && n > 0
            const body = (
              <span className="flex min-h-[78px] flex-col gap-1">
                <span className="flex items-center justify-between gap-2 text-xs font-black" style={{ color: pl.color }}>
                  <span>{pl.pile}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 tabular-nums ring-1" style={{ borderColor: pl.color }}>{n}</span>
                </span>
                {n > 0 ? <Pile p={p as Place} n={n} u={p === 0 ? 5 : 4} max={p === 0 ? 9 : 50} /> : <span className="grid flex-1 place-items-center text-xs font-bold text-slate-400">boş</span>}
              </span>
            )
            const cls = `rounded-2xl p-2 text-left ring-2 transition ${p === 0 ? 'min-w-[8.5rem]' : 'min-w-[7rem]'} flex-1 ${active ? 'bg-white' : 'bg-white/50 opacity-70'} ${wrong === `pile-${p}` ? 'animate-shake' : ''}`
            return dnd && n > 0 ? (
              <Drag key={p} dnd={dnd} item={`pile-${p}`} label={`${pl.pile} (${n})`} className={cls} ghost={<Block p={p as Place} u={p === 0 ? 6 : 6} />}>
                <span className="block" style={{ outlineColor: pl.color }}>{body}</span>
              </Drag>
            ) : (
              <div key={p} className={cls} style={{ borderColor: pl.color }}>{body}</div>
            )
          })}
          {hammer && (
            <HammerZone dnd={dnd} burst={burst} />
          )}
        </div>
      </div>
      <Plates b={b} st={st} dnd={dnd} u={u} hot={wrong === 'plates'} />
    </div>
  )
}

function HammerZone({ dnd, burst }: { dnd?: Dnd; burst?: { p: 0 | 1; n: number; key: number } | null }) {
  const inner = (
    <span className="relative grid min-h-[96px] w-28 place-items-center rounded-2xl bg-white p-2 text-center ring-2 ring-slate-300">
      <span key={`h${burst?.key ?? 0}`} className="text-4xl" style={{ transformOrigin: '70% 80%', animation: burst ? 'kbHammer .55s ease-in-out' : undefined }} aria-hidden>🔨</span>
      <span className="text-[11px] leading-tight font-black text-slate-700">Kırıcı<br /><span className="font-bold text-slate-500">10 eş parçaya böler</span></span>
      {burst && <Burst key={burst.key} p={burst.p} n={burst.n} u={burst.p === 0 ? 5 : 4} />}
    </span>
  )
  return dnd ? <Drop dnd={dnd} id="hammer" className="rounded-2xl">{inner}</Drop> : inner
}

function Plates({ b, st, dnd, u, hot }: { b: number; st: SimState; dnd?: Dnd; u: number; hot?: boolean }) {
  const grid = (
    <div className={`grid gap-2 ${b <= 2 ? 'grid-cols-2' : b === 3 ? 'grid-cols-3' : b === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3 sm:grid-cols-5'}`}>
      {Array.from({ length: b }, (_, i) => (
        <div key={i} className={`flex min-h-[112px] flex-col items-center gap-1 rounded-2xl bg-white p-2 ring-1 ring-line ${hot ? 'animate-shake' : ''}`}>
          <span className="text-2xl leading-none" aria-hidden>{KIDS[i % KIDS.length]}</span>
          <span className="flex min-h-[44px] w-full flex-wrap items-end justify-center gap-1 rounded-[50%] bg-slate-100 px-2 py-1.5 ring-1 ring-slate-200">
            {st.each.map((v, p) => <Pile key={p} p={p as Place} n={v} u={u} max={p === 0 ? 9 : 20} />)}
          </span>
          <span className="text-center text-[11px] leading-tight font-black text-ink-soft">{shareText(st.each)}</span>
        </div>
      ))}
    </div>
  )
  return (
    <div className="rounded-2xl bg-sky-50/60 p-2.5 ring-1 ring-sky-200">
      <p className="mb-1.5 text-[11px] font-black tracking-wide text-sky-800 uppercase">{b} arkadaşın tabağı {dnd ? '· yığını buraya bırakınca herkese birer tane gider' : ''}</p>
      {dnd ? <Drop dnd={dnd} id="plates" className="rounded-2xl">{grid}</Drop> : grid}
    </div>
  )
}

/* ───────────── paylaştırma: etkileşimli simülasyon ───────────── */

type Checks = ReturnType<typeof useChecks>

export interface SimProps {
  a: number
  b: number
  checks: Checks
  /** drag: öğrenci virgül kartını tabloya sürükler; auto: ilk kırmada kendiliğinden konur */
  comma?: 'auto' | 'drag'
  /** drag: hiç bütün düşmezse birler basamağına 0 kartını öğrenci koyar */
  zeroDigit?: 'auto' | 'drag'
  /** hammer: blok kırıcıya sürüklenir; zero: yazılı bölmede kalanın yanına 0 kartı sürüklenir */
  breakBy?: 'hammer' | 'zero'
  division?: boolean
  /** her kırmadan sonra “bu sayı neyi sayıyor?” diye birim kartı sorulur */
  askUnit?: boolean
  item?: string
  onDone: (st: SimState) => void
  /** üstte gösterilecek görev metni */
  prompt: ReactNode
}

export const SIM_TOOLS = {
  pile: { icon: <Block p={0} u={2} />, name: 'Çikolata yığını', text: 'Yığını tut ve tabaklara bırak: her bırakışta her arkadaşa birer tane gider. Herkese yetmiyorsa geri döner.' } as ToolInfo,
  hammer: { icon: <span className="text-base leading-none">🔨</span>, name: 'Kırıcı', text: 'Paylaştırılamayan yığını kırıcıya bırak: her parça 10 eş küçük parçaya bölünür (1 bütün → 10 onda bir).' } as ToolInfo,
  comma: { icon: <span className="text-xl leading-none font-black text-pink-600">,</span>, name: 'Virgül kartı', text: 'Bölüm tablosunda virgülün gelmesi gereken aralığa bırak.' } as ToolInfo,
  digit: { icon: <span className="grid size-5 place-items-center rounded-md bg-white text-xs font-black ring-1 ring-line">0</span>, name: 'Rakam kartı', text: 'Bölüm tablosunun boş hücresine bırak.' } as ToolInfo,
  zero: { icon: <span className="grid size-5 place-items-center rounded-md bg-sky-100 text-xs font-black text-sky-700 ring-1 ring-sky-300">0</span>, name: 'Sıfır kartı', text: 'Yazılı bölmede kalanın yanındaki “?” kutusuna bırak. Masadaki parçalar da aynı anda kırılır.' } as ToolInfo,
  unit: { icon: <span className="rounded bg-sky-100 px-1 text-[10px] font-black text-sky-700">onda bir</span>, name: 'Birim kartları', text: 'Yeni sayının neyi saydığını gösteren kartı boş yuvaya bırak.' } as ToolInfo,
}

export function ShareSim({ a, b, checks, comma = 'auto', zeroDigit = 'auto', breakBy = 'hammer', division = false, askUnit = false, item = 'çikolata', onDone, prompt }: SimProps) {
  const s = useSay(checks)
  const [st, setSt] = useState<SimState>(() => startState(a))
  const [burst, setBurst] = useState<{ p: 0 | 1; n: number; key: number } | null>(null)
  const [hot, setHot] = useState<{ board?: number | 'comma'; div?: Hot } | null>(null)
  const [ask, setAsk] = useState<{ p: Place; n: number } | null>(null)
  const [finished, setFinished] = useState(false)
  const steps = longDiv(a, b)
  const p = st.place
  const canDeal = st.pool[p] >= b
  const needZeroCard = zeroDigit === 'drag' && p === 0 && !canDeal && st.digits[0] == null && st.each[0] === 0
  const needComma = comma === 'drag' && !st.comma && st.digits[0] != null && st.pool[0] > 0

  /** Bir basamakta paylaştırma bitince rakam bölüme yazılır */
  useEffect(() => {
    if (canDeal || st.digits[p] != null || needZeroCard || ask) return
    const id = window.setTimeout(() => {
      const v = st.each[p]
      setSt((o) => ({ ...o, digits: o.digits.map((d, i) => (i === p ? v : d)) }))
      setHot({ board: p, div: { k: p, kind: 'q' } })
      const left = st.pool[p]
      const name = PLACES[p].name.toLowerCase()
      if (left === 0) s.ok(`Herkese ${v} ${PLACES[p].unit} düştü ve masada hiç parça kalmadı. Bölümün ${name} basamağına ${v} yazıldı.`)
      else if (p === 0 && comma === 'drag') s.ok(`Herkese ${v} bütün düştü, birler basamağına ${v} yazıldı. Masada ${left} bütün kaldı ama ${b} kişiye yetmez: bütünler bitti! Bölüm tablosunda bunu nasıl gösterirsin? Virgül kartını sürükle.`)
      else s.ok(`Herkese ${v} ${PLACES[p].unit} düştü, ${name} basamağına ${v} yazıldı. Kalan ${left} ${PLACES[p].unit} ${b} kişiye yetmez. Ne yapabilirsin?`)
    }, 450)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDeal, p, st.digits[p], needZeroCard, ask])

  /** Masada parça kalmayınca görev biter */
  useEffect(() => {
    if (finished || st.pool[p] !== 0 || st.digits[p] == null) return
    setFinished(true)
    sfx.win()
    const id = window.setTimeout(() => onDone(st), 900)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st])

  const brk = (q: Place) => {
    if (ask) return s.tell('Önce sağdaki soruyu cevapla.')
    if (q !== p) return s.nudge(`Şu an ${PLACES[p].pile.toLowerCase()} paylaştırılıyor. ${PLACES[q].pile} yığınını kırmak işe yarar mı?`, { at: `pile-${q}` })
    if (canDeal) return s.nudge(`Daha kırmaya gerek yok: masada ${st.pool[p]} ${PLACES[p].unit} var, ${b} arkadaşın her birine hâlâ birer tane verebilirsin. Önce tabaklara dağıt.`, { at: `pile-${q}`, mis: 'Bütünler yetiyorken kırarsak bölümün birler basamağı eksik kalır.' })
    if (st.digits[p] == null) return s.tell(needZeroCard ? 'Kırmadan önce: kimse bütün alamadı. Bölüm tablosunun birler basamağına ne yazmalısın?' : 'Bir saniye, bölüme rakam yazılıyor…')
    if (p === 0 && comma === 'drag' && !st.comma) return s.nudge('Bütünler bitti! Kırmadan önce bölüm tablosunda bütünlerin bittiği yeri işaretle: virgül kartını doğru aralığa sürükle.', { mis: 'Virgül, “bundan sonrası bütünden küçük parçalar” demektir.' })
    if (p >= 2) return s.tell('Yüzde birleri bu etkinlikte kırmıyoruz.')
    const n = st.pool[p]
    setSt((o) => {
      const pool = [...o.pool]
      pool[p + 1] += n * 10
      pool[p] = 0
      return { ...o, pool, comma: true, broke: o.broke.map((x, i) => (i === p ? true : x)), place: (p + 1) as Place }
    })
    setBurst({ p: p as 0 | 1, n, key: Date.now() })
    setHot({ board: p === 0 && !st.comma ? 'comma' : undefined, div: { k: p, kind: 'zero' } })
    sfx.ok()
    const from = `${n} ${PLACES[p].unit}`
    const to = `${n * 10} ${PLACES[p + 1].unit}`
    if (askUnit) {
      setAsk({ p: (p + 1) as Place, n: n * 10 })
      s.ok(`Kalan ${n}’in yanına 0 yazınca ${n * 10} oldu ve masadaki parçalar kırıldı! Şimdi düşün: bu ${n * 10} neyi sayıyor? Birim kartını yuvaya sürükle.`)
    } else if (p === 0 && comma === 'auto') s.ok(`Kırıldı! ${from} = ${to}. Artık bütün değil, bütünden küçük parçaları paylaştırıyoruz; bu yüzden bölüme virgül kondu.`)
    else s.ok(`Kırıldı! ${from} = ${to}. Parçalar küçüldü ama çikolata miktarı aynı. Şimdi bunları dağıt.`)
  }

  const dnd = useDnd((it, target) => {
    if (finished) return false
    if (it.startsWith('pile-')) {
      const q = Number(it.slice(5)) as Place
      if (target === 'hammer') return brk(q)
      if (target !== 'plates') return false
      if (ask) return s.tell('Önce sağdaki soruyu cevapla.')
      if (q !== p) return s.nudge(`Önce ${PLACES[p].pile.toLowerCase()} paylaştırılmalı.`, { at: it })
      if (!canDeal) {
        if (needZeroCard) return s.nudge(`${st.pool[0]} bütün ${b} arkadaşa birer birer yetmez: hiçbir arkadaş bütün çikolata alamaz! O zaman bir kişinin payında kaç bütün var? Bölüm tablosunun birler basamağına doğru rakam kartını sürükle.`, { at: 'plates', mis: 'Bölümün birler basamağı, bir kişinin aldığı bütün sayısıdır.' })
        if (breakBy === 'zero') return s.nudge(`${st.pool[p]} ${PLACES[p].unit} ${b} arkadaşa birer birer yetmez! Yazılı bölmede kalanın yanına 0 yazarsan ne olur? Sıfır kartını “?” kutusuna sürükle.`, { at: 'plates', mis: 'Kalanı bir kişiye vermek adil olmaz.' })
        return s.nudge(`${st.pool[p]} ${PLACES[p].unit} ${b} arkadaşa birer birer yetmez: kimine düşer, kimine düşmez. Daha küçük parçalara bölsek? Yığını 🔨 kırıcıya sürükle.`, { at: 'plates', mis: 'Kalanı bir kişiye vermek adil olmaz.' })
      }
      setSt((o) => {
        const pool = [...o.pool]
        const each = [...o.each]
        pool[p] -= b
        each[p] += 1
        return { ...o, pool, each }
      })
      s.clear()
      return true
    }
    if (it === 'zero' && target === 'zslot') return brk(p)
    if (it === 'comma') {
      if (!target.startsWith('comma-')) return false
      if (st.digits[0] == null) return s.nudge(`Henüz bütünler bitmedi: masada ${st.pool[0]} bütün var, herkese birer bütün daha verebilirsin. Virgülü ne zaman koymalısın?`)
      if (target !== 'comma-1') return s.nudge(target === 'comma-0' ? 'Virgülü birlerin soluna koyarsan herkesin aldığı bütünler de bütünden küçük gibi görünür. Herkes kaç bütün aldı? Bu rakam virgülün hangi tarafında kalmalı?' : 'Onda birler henüz paylaştırılmadı. Virgül bütünlerin bittiği yeri gösterir: birlerle onda birlerin arasına bak.', { mis: 'Virgülün solunda bütünler, sağında bütünden küçük parçalar yazılır.' })
      setSt((o) => ({ ...o, comma: true }))
      setHot({ board: 'comma' })
      sfx.ok()
      s.ok('Evet! Virgül “bütünler burada bitti, sağ tarafı bütünden küçük parçalar” demek. Şimdi kalan bütünleri 🔨 kırıcıya sürükle.')
      return true
    }
    if (it.startsWith('dig-')) {
      if (target !== 'cell-0') return false
      const v = Number(it.slice(4))
      if (v !== 0) return s.nudge(v === a ? `${a} bütün masada duruyor ama hiçbir arkadaş bütün alamadı. Bir kişinin payında kaç bütün var?` : `Bir arkadaşın tabağına bak: kaç bütün aldı?`, { mis: 'Bölümün birler basamağı, bir kişinin aldığı bütün sayısıdır.' })
      setSt((o) => ({ ...o, digits: [0, o.digits[1], o.digits[2]] }))
      setHot({ board: 0, div: { k: 0, kind: 'q' } })
      sfx.ok()
      s.ok(comma === 'drag' ? 'Doğru: kimse bütün alamadı, birler basamağı 0. Bütünler bitti: virgülü nereye koymalısın?' : 'Doğru: kimse bütün alamadı, birler basamağı 0. Şimdi bütünleri kır.')
      return true
    }
    if (it.startsWith('unit-') && target === 'uslot' && ask) {
      const v = Number(it.slice(5))
      if (v !== ask.p) return s.nudge(v === ask.p - 1 ? `${ask.n} ${PLACES[v].unit} olsaydı çikolata 10 kat artmış olurdu! Kırıcı parçaları büyütür mü, küçültür mü?` : `Masaya bak: ${ask.n} tane hangi parçadan var?`, { mis: 'Sıfır eklemek sayıyı büyütmez; birimi 10 kat küçültür.' })
      setAsk(null)
      sfx.ok()
      s.ok(`Evet: ${ask.n / 10} ${PLACES[ask.p - 1].unit} = ${ask.n} ${PLACES[ask.p].unit}. Sıfır, birimin 10 kat küçüldüğünü gösteriyor. Şimdi dağıt!`)
      return true
    }
    return false
  })

  const show: DivShow = { digits: st.digits, comma: st.comma, broke: st.broke }
  const cards: ReactNode[] = []
  if (comma === 'drag' && !st.comma) cards.push(<Drag key="c" dnd={dnd} item="comma" label="Virgül kartı" className="grid h-16 w-14 place-items-end justify-center rounded-2xl bg-white pb-2 text-5xl leading-none font-black text-pink-600 shadow-[0_3px_0_#cbd5e1] ring-2 ring-pink-300">,</Drag>)
  if (zeroDigit === 'drag' && st.digits[0] == null && steps[0].q === 0)
    [0, a, b].forEach((v) => cards.push(<Drag key={`d${v}`} dnd={dnd} item={`dig-${v}`} label={`${v} kartı`} className="grid size-14 place-items-center rounded-2xl bg-white text-2xl font-black text-ink shadow-[0_3px_0_#cbd5e1] ring-2 ring-line">{v}</Drag>))
  const zeroOpen = breakBy === 'zero' && !canDeal && st.digits[p] != null && st.pool[p] > 0 && p < 2
  if (breakBy === 'zero') cards.push(<Drag key="z" dnd={dnd} item="zero" label="Sıfır kartı" disabled={!zeroOpen} className={`grid size-14 place-items-center rounded-2xl text-2xl font-black shadow-[0_3px_0_#7dd3fc] ring-2 ${zeroOpen ? 'bg-sky-100 text-sky-700 ring-sky-400' : 'bg-slate-100 text-slate-400 ring-slate-200'}`}>0</Drag>)

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-3">
        <div className="rounded-2xl bg-white px-4 py-3 text-ink shadow-sm ring-1 ring-line">
          <div className="text-[17px] leading-snug font-extrabold sm:text-lg">{prompt}</div>
          {finished && (
            <p className="mt-2 inline-flex flex-wrap items-center gap-x-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-xl font-black text-white tabular-nums animate-pop">
              {a} ÷ {b} = <MathText text={`[[${a}/${b}]]`} /> = {quotientText(steps)} <span className="text-sm font-extrabold">· her arkadaşa {shareText(st.each)}</span>
            </p>
          )}
        </div>
        <ShareTable b={b} st={st} dnd={dnd} hammer={breakBy === 'hammer'} burst={burst} wrong={s.wrong} item={item} />
        {s.view('work')}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <QuotientBoard digits={st.digits} comma={st.comma} dnd={dnd} commaSlots={needComma} cellDrop={needZeroCard} hot={hot?.board} />
        {cards.length > 0 && (
          <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
            <p className="mb-2 text-xs font-black tracking-wide text-ink-soft uppercase">Kartlar</p>
            <div className="flex flex-wrap gap-2">{cards}</div>
          </div>
        )}
        {division && <LongDivision a={a} b={b} steps={steps} show={show} hot={hot?.div} zeroDrop={zeroOpen ? { dnd, k: p } : null} />}
        {ask && (
          <div className="rounded-2xl bg-white p-3 ring-2 ring-sky-300 animate-fade-up">
            <p className="mb-2 text-sm font-extrabold">Kalanın yanına 0 yazınca <b className="text-sky-700">{ask.n}</b> oldu. Bu {ask.n} neyi sayıyor?</p>
            <div className="mb-2 flex items-center gap-2 text-2xl font-black">
              <span className="tabular-nums">{ask.n}</span>
              <Drop dnd={dnd} id="uslot" className="grid min-h-12 flex-1 place-items-center rounded-xl border-2 border-dashed border-sky-400 bg-sky-50 text-sm text-sky-600">birim kartını buraya sürükle</Drop>
            </div>
            <div className="flex flex-wrap gap-2">
              {PLACES.map((pl, i) => (
                <Drag key={i} dnd={dnd} item={`unit-${i}`} label={pl.unit} className="min-h-12 rounded-xl bg-white px-3 text-base font-black shadow-[0_3px_0_#cbd5e1] ring-2" >
                  <span style={{ color: pl.color }}>{pl.unit}</span>
                </Drag>
              ))}
            </div>
          </div>
        )}
        {s.view('panel')}
      </div>
    </div>
  )
}

/* ───────────── video oynatıcı ───────────── */

export interface Scene {
  /** altyazı ve sesli anlatım */
  say: string
  view: ReactNode
  /** ses kapalıyken sahne süresi (ms) */
  dur?: number
}

const VOICE_KEY = 'ao-voice'
const spoken = (t: string) =>
  t
    .replace(/÷/g, ' bölü ')
    .replace(/×/g, ' çarpı ')
    .replace(/=/g, ' eşittir ')
    .replace(/→/g, ', ')
    .replace(/(\d+)\/(\d+)/g, '$2 de $1')
    .replace(/[“”"]/g, '')

function useTurkishVoice() {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null)
  useEffect(() => {
    const ss = typeof window !== 'undefined' ? window.speechSynthesis : undefined
    if (!ss) return
    const load = () => setVoice(ss.getVoices().find((v) => v.lang?.toLowerCase().startsWith('tr')) ?? null)
    load()
    ss.addEventListener?.('voiceschanged', load)
    return () => {
      ss.removeEventListener?.('voiceschanged', load)
      ss.cancel()
    }
  }, [])
  return voice
}

/**
 * Mini konu anlatımı: sahneler kendiliğinden ilerler (video gibi), istenirse durdurulur, geri sarılır.
 * Cihazda Türkçe ses varsa altyazılar sesli okunur.
 */
export function Lesson({ scenes, onDone, doneLabel = 'Şimdi sıra sende' }: { scenes: Scene[]; onDone: () => void; doneLabel?: string }) {
  const voice = useTurkishVoice()
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const [ended, setEnded] = useState(false)
  const [voiceOn, setVoiceOn] = useState(() => {
    try {
      return localStorage.getItem(VOICE_KEY) !== 'off'
    } catch {
      return true
    }
  })
  const timer = useRef(0)
  const sc = scenes[i]
  const useVoice = voiceOn && !!voice

  useEffect(() => {
    window.clearTimeout(timer.current)
    const ss = window.speechSynthesis
    ss?.cancel()
    if (!playing) return
    let gone = false
    const next = () => {
      if (gone) return
      gone = true
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        if (i < scenes.length - 1) setI(i + 1)
        else {
          setPlaying(false)
          setEnded(true)
        }
      }, sc.say ? 650 : 0)
    }
    if (useVoice && sc.say && ss && voice) {
      const u = new SpeechSynthesisUtterance(spoken(sc.say))
      u.voice = voice
      u.lang = voice.lang
      u.rate = 0.98
      u.onend = next
      u.onerror = next
      ss.speak(u)
      // bazı tarayıcılarda onend gelmeyebilir
      timer.current = window.setTimeout(next, sc.say.length * 110 + 4000)
    } else {
      timer.current = window.setTimeout(next, sc.dur ?? Math.min(7000, Math.max(1800, sc.say.length * 62)))
    }
    return () => {
      gone = true
      window.clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, playing, useVoice])

  const go = (k: number) => {
    setEnded(false)
    setI(Math.max(0, Math.min(scenes.length - 1, k)))
  }
  const toggleVoice = () => {
    setVoiceOn((v) => {
      try {
        localStorage.setItem(VOICE_KEY, v ? 'off' : 'on')
      } catch {
        /* depolama yok */
      }
      return !v
    })
  }

  return (
    <div className="space-y-3">
      <Fx />
      <div className="relative overflow-hidden rounded-3xl bg-white p-3 ring-2 ring-slate-800/80 shadow-[0_10px_30px_-12px_rgb(15_23_42/0.5)] sm:p-4">
        <div className="mb-3 flex items-start gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white" aria-live="polite">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-pink-600 text-2xl" aria-hidden>👩‍🏫</span>
          <p className="min-h-[3.2em] flex-1 text-[17px] leading-snug font-extrabold sm:text-lg">{started ? sc.say || <span className="text-slate-400">…</span> : 'Oynat düğmesine bas, mini ders başlasın. Sesi açıksa anlatımı dinleyebilirsin.'}</p>
        </div>
        <div className={`transition ${started ? '' : 'pointer-events-none blur-[2px]'}`}>{sc.view}</div>
        {!started && (
          <button type="button" onClick={() => { setStarted(true); setPlaying(true) }} className="absolute inset-0 grid place-items-center bg-slate-900/45 text-white">
            <span className="flex flex-col items-center gap-3">
              <span className="grid size-24 place-items-center rounded-full bg-pink-600 shadow-[0_8px_0_#9d174d] transition hover:scale-105"><Play size={46} fill="currentColor" /></span>
              <span className="rounded-full bg-slate-900/70 px-4 py-1.5 text-lg font-black">Mini dersi izle</span>
            </span>
          </button>
        )}
      </div>

      <div className="sticky bottom-2 z-20 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-1.5 shadow-[0_-8px_24px_-12px_rgb(15_23_42/0.35)] ring-1 ring-line backdrop-blur lg:static lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0">
        <button type="button" aria-label="Önceki sahne" onClick={() => go(i - 1)} disabled={i === 0} className="grid size-12 place-items-center rounded-xl bg-white ring-1 ring-line disabled:opacity-40"><ChevronLeft /></button>
        <button
          type="button"
          aria-label={playing ? 'Duraklat' : 'Oynat'}
          onClick={() => {
            setStarted(true)
            if (ended) { setEnded(false); setI(0); setPlaying(true) } else setPlaying((x) => !x)
          }}
          className="grid size-12 place-items-center rounded-xl bg-pink-600 text-white shadow-[0_3px_0_#9d174d]"
        >
          {playing ? <Pause /> : ended ? <RotateCcw /> : <Play fill="currentColor" />}
        </button>
        <button type="button" aria-label="Sonraki sahne" onClick={() => go(i + 1)} disabled={i === scenes.length - 1} className="grid size-12 place-items-center rounded-xl bg-white ring-1 ring-line disabled:opacity-40"><ChevronRight /></button>
        <div className="flex min-w-[8rem] flex-1 gap-1" role="group" aria-label="Sahneler">
          {scenes.map((_, k) => (
            <button key={k} type="button" aria-label={`${k + 1}. sahne`} onClick={() => { setStarted(true); go(k) }} className={`h-3 flex-1 rounded-full transition ${k < i ? 'bg-pink-400' : k === i ? 'bg-pink-600' : 'bg-slate-200'}`} />
          ))}
        </div>
        <button
          type="button"
          onClick={toggleVoice}
          disabled={!voice}
          title={voice ? 'Sesli anlatım' : 'Bu cihazda Türkçe ses bulunamadı; altyazıyla devam ediliyor.'}
          className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-extrabold ring-1 ring-line disabled:opacity-50"
        >
          {useVoice ? <Volume2 size={18} /> : <VolumeX size={18} />}
          <span className="hidden sm:inline">{voice ? (voiceOn ? 'Ses açık' : 'Ses kapalı') : 'Ses yok'}</span>
        </button>
      </div>

      <button type="button" onClick={() => { window.speechSynthesis?.cancel(); onDone() }} className={`min-h-14 w-full text-lg ${ended ? 'btn-primary animate-fade-up' : 'btn-ghost'}`}>
        {ended ? <>{doneLabel} <ChevronRight size={20} /></> : <>Dersi atla, kendim deneyeyim <SkipForward size={18} /></>}
      </button>
    </div>
  )
}

/** Ders sahnesi: masa + tabaklar solda, bölüm tablosu ve yazılı bölme sağda */
export function LessonFrame({ a, b, st, division = true, burst, hot, banner }: { a: number; b: number; st: SimState; division?: boolean; burst?: { p: 0 | 1; n: number; key: number } | null; hot?: { board?: number | 'comma'; div?: Hot } | null; banner?: ReactNode }) {
  const steps = longDiv(a, b)
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="rounded-full bg-amber-100 px-3 py-1 text-base font-black text-amber-900 tabular-nums">{a} çikolata · {b} arkadaş · {a} ÷ {b} = ?</p>
          {banner}
        </div>
        <ShareTable b={b} st={st} hammer burst={burst} />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <QuotientBoard digits={st.digits} comma={st.comma} hot={hot?.board} />
        {division && <LongDivision a={a} b={b} steps={steps} show={{ digits: st.digits, comma: st.comma, broke: st.broke }} hot={hot?.div} />}
      </div>
    </div>
  )
}

/* ───────────── görev akışı ───────────── */

export type Done = (first: boolean, rules: string[]) => void
export interface TaskDef { emoji: string; title: string; goal: string; tools: (Tool | ToolInfo)[]; render: (done: Done, last: boolean) => ReactNode }

export const PLAY_TOOL: ToolInfo = { icon: <span className="grid size-5 place-items-center rounded-full bg-pink-600 text-white"><Play size={11} fill="currentColor" /></span>, name: 'Mini ders', text: 'Oynat düğmesine bas; sahneler kendiliğinden ilerler. Duraklatabilir, oklarla geri dönebilir, sesli anlatımı açıp kapatabilirsin.' }

/** Görevleri sırayla oynatır; sonunda kural defterini gösterir */
export function Runner({ grade, onFinish, tasks, summary, insight, note }: { grade: Grade; onFinish: InteractionProps['onFinish']; tasks: TaskDef[]; summary: (rules: string[]) => string; insight: string; note: string }) {
  const [idx, setIdx] = useState(0)
  const [rules, setRules] = useState<string[]>([])
  const [help, setHelp] = useState(false)
  const firsts = useRef<boolean[]>([])
  const end = idx >= tasks.length
  const t = tasks[Math.min(idx, tasks.length - 1)]
  const done: Done = (first, rs) => {
    firsts.current[idx] = first
    setRules((old) => [...old, ...rs.filter((x) => !old.includes(x))])
    setIdx(idx + 1)
    setHelp(false)
    window.speechSynthesis?.cancel()
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
        right={end ? null : (
          <button type="button" onClick={() => setHelp((h) => !h)} aria-pressed={help} aria-label="Nasıl kullanılır?" className={`grid size-11 place-items-center rounded-full text-lg font-black ring-1 transition ${help ? 'bg-sky-600 text-white ring-sky-700' : 'bg-white text-sky-700 ring-sky-200 hover:bg-sky-50'}`}>?</button>
        )}
      />
      {!end && <HowTo goal={t.goal} tools={t.tools} open={help} onToggle={() => setHelp((h) => !h)} />}
      {end ? <EndView rules={rules} onFinish={finish} note={note} /> : <div key={idx}>{t.render(done, idx === tasks.length - 1)}</div>}
    </GameScene>
  )
}

/** Mini ders görevi: izledikten sonra kural eklenir (puanlamada ilk denemede sayılır) */
export function LessonTask({ scenes, rule, onDone }: { scenes: Scene[]; rule: string; onDone: Done }) {
  return <Lesson scenes={scenes} onDone={() => onDone(true, [rule])} />
}

/** Simülasyon → (isteğe bağlı) sürüklemeli soru → keşfedilen kural → sonraki görev */
export function SimTask({ render, ask, rule, onDone, last, okText }: { render: (checks: Checks, finish: () => void) => ReactNode; ask?: Ask; rule: string; onDone: Done; last: boolean; okText?: string }) {
  const checks = useChecks()
  const [phase, setPhase] = useState<'sim' | 'ask' | 'done'>('sim')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (phase !== 'sim') window.setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120)
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
