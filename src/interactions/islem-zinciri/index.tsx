import { useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowLeftRight, ArrowUp, Flag, Plus, Sparkles, Trash2, Undo2, Wand2 } from 'lucide-react'
import type { Grade } from '../../data/types'
import type { InteractionProps } from '../types'
import { MathText } from '../../components/MathText'
import { Nudge, Scene, StrategyPicker, useSolutions } from '../../games/kit2'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { Choice, NextButton, Pad, Panel, TopBar, fmtQ, isInt, parseQ, q, qAdd, qDiv, qEq, qMul, qNum, qOk, qPow, qSub, useDragDrop, useLook, type Look, type Q } from './kit'

/**
 * 30. İşlem Zinciri Tasarla
 *  Başlangıç sayısı → işlem blokları → hedef. Bloklar zincire sürüklenir (ya da dokunulur),
 *  değerler zincir boyunca canlı akar. Görev türleri:
 *   - forward: aynı hedefe giden farklı zincirler topla (kendi bloğunu da tasarlayabilirsin)
 *   - order:   iki bloğun yerini değiştir → sonuç değişir mi? (5+: zinciri parantezli ifadeyle yaz)
 *   - compose: uzun zinciri tek bir “kısa yol bloğu” ile değiştir (her sayı için aynı mı?)
 *   - inverse: çıkışı bilinen zincirin başlangıcını geri zincirle bul (ters işlem, ters sıra)
 */

type OpK = '+' | '−' | '×' | '÷' | '^' | '√'
interface Op { k: OpK; v: Q }
interface Item { id: number; o: Op }

const op = (k: OpK, v: number | Q = 0): Op => ({ k, v: typeof v === 'number' ? q(Math.round(v * 1000), 1000) : v })
const dec = (s: string) => parseQ(s)!

const OP_COLOR: Record<OpK, string> = { '+': '#16a34a', '−': '#ea580c', '×': '#2563eb', '÷': '#7c3aed', '^': '#db2777', '√': '#0891b2' }

const valStr = (v: Q) => fmtQ(v, 'dec')
const vR = (v: Q) => (v.n < 0 ? `(${valStr(v)})` : valStr(v))
function opLabel(o: Op) {
  if (o.k === '^') return `□^{${o.v.n}}`
  if (o.k === '√') return '√{□}'
  return `${o.k} ${vR(o.v)}`
}
const opKey = (o: Op) => `${o.k}${o.v.n}/${o.v.d}`

function isSquare(n: number) {
  const r = Math.round(Math.sqrt(n))
  return n >= 0 && r * r === n
}

function apply(x: Q, o: Op): Q {
  switch (o.k) {
    case '+': return qAdd(x, o.v)
    case '−': return qSub(x, o.v)
    case '×': return qMul(x, o.v)
    case '÷': return qDiv(x, o.v)
    case '^': return qPow(x, o.v.n)
    case '√': return isSquare(x.n) && isSquare(x.d) ? q(Math.round(Math.sqrt(x.n)), Math.round(Math.sqrt(x.d))) : q(NaN)
  }
}

/** Sınıf düzeyinde geçerli bir ara değer mi? Değilse düşündüren soru döner. */
function why(prev: Q, o: Op, x: Q, grade: Grade): string | null {
  if (o.k === '÷' && o.v.n === 0) return 'Bir sayıyı 0’a bölebilir miyiz? 0 tane gruba paylaştırmak ne demek olurdu?'
  if (o.k === '√' && !qOk(x)) return `√{${valStr(prev)}} bir tam sayı mı? ${valStr(prev)} hangi sayının karesi olabilir? Önce zinciri değiştir.`
  if (!qOk(x) || Math.abs(qNum(x)) > 1e7) return 'Sayı çok büyüdü! Daha küçük adımlarla dene.'
  if (grade < 7 && x.n < 0) return `${valStr(prev)}’den ${valStr(o.v)} çıkarırsak doğal sayılarda kalır mıyız? Önce sayıyı büyütmeyi dene.`
  if (grade <= 5 && !isInt(x)) return `${valStr(prev)} sayısı ${valStr(o.v)} eşit parçaya tam bölünüyor mu? Hangi sayılar ${valStr(o.v)}’ye tam bölünür?`
  return null
}

interface Run { vals: Q[]; breakAt: number; msg: string | null }
function runChain(start: Q, ops: Op[], grade: Grade): Run {
  const vals: Q[] = []
  let x = start
  for (let i = 0; i < ops.length; i++) {
    const y = apply(x, ops[i])
    const m = why(x, ops[i], y, grade)
    if (m) return { vals, breakAt: i, msg: m }
    vals.push(y)
    x = y
  }
  return { vals, breakAt: -1, msg: null }
}

/** b işlemi a işlemini geri alır mı? */
function undoes(b: Op, a: Op) {
  const inv: Partial<Record<OpK, OpK>> = { '+': '−', '−': '+', '×': '÷', '÷': '×' }
  if (a.k === '^') return b.k === '√' && a.v.n === 2
  if (a.k === '√') return b.k === '^' && b.v.n === 2
  return inv[a.k] === b.k && qEq(a.v, b.v)
}

// ───────────────────────── Görev verisi ─────────────────────────

interface Forward { kind: 'forward'; start: Q; target: Q; palette: Op[]; slots: number; need: number; minLen?: number; mustOp?: OpK; title: string }
interface Round { start: Q; a: Op; b: Op; same: boolean; expr?: { t: string; ok: boolean; why?: string }[]; afterExpr?: { t: string; ok: boolean; why?: string }[] }
interface Order { kind: 'order'; rounds: Round[]; title: string }
interface Compose { kind: 'compose'; chain: Op[]; tests: number[]; title: string; hint: string }
interface Inverse { kind: 'inverse'; chain: Op[]; secret: Q; palette: Op[]; title: string }
type Task = Forward | Order | Compose | Inverse

function opsFor(grade: Grade): OpK[] {
  return grade === 8 ? ['+', '−', '×', '÷', '^', '√'] : ['+', '−', '×', '÷']
}

function tasksFor(grade: Grade): Task[] {
  const I = (n: number) => q(n)
  switch (grade) {
    case 3:
      return [
        { kind: 'forward', title: '20’den başla, 50’ye ulaş! İki farklı zincir tasarla.', start: I(20), target: I(50), palette: [op('+', 10), op('+', 5), op('×', 2), op('−', 5), op('+', 20), op('+', 30)], slots: 4, need: 2 },
        { kind: 'forward', title: '6’dan 30’a ulaş. Zincirinde mutlaka bir × bloğu olsun.', start: I(6), target: I(30), palette: [op('×', 5), op('+', 4), op('×', 2), op('×', 3), op('+', 6), op('−', 2)], slots: 4, need: 2, mustOp: '×' },
        { kind: 'order', title: 'Blokların yerini değiştirince sonuç değişir mi?', rounds: [
          { start: I(5), a: op('+', 4), b: op('−', 1), same: true },
          { start: I(5), a: op('+', 3), b: op('×', 2), same: false },
        ] },
        { kind: 'compose', title: 'Bu iki bloğun yaptığı işi tek bir blok yapsın!', chain: [op('+', 10), op('−', 1)], tests: [15, 27, 40], hint: '+10 sonra −1: toplamda kaç ekledik?' },
        { kind: 'inverse', title: 'Gizli sayı zincirden geçti, 38 çıktı. Gizli sayı neydi?', chain: [op('×', 2), op('+', 6)], secret: I(16), palette: [op('−', 6), op('÷', 2), op('+', 6), op('×', 2)] },
      ]
    case 4:
      return [
        { kind: 'forward', title: '125’ten başla, 1000’e ulaş! İki farklı zincir tasarla.', start: I(125), target: I(1000), palette: [op('×', 2), op('×', 4), op('+', 125), op('×', 10), op('−', 25), op('+', 375)], slots: 4, need: 2 },
        { kind: 'forward', title: '48’den 12’ye in. Üç farklı zincir bulabilir misin?', start: I(48), target: I(12), palette: [op('÷', 2), op('÷', 4), op('−', 12), op('÷', 3), op('−', 36), op('×', 2)], slots: 4, need: 3 },
        { kind: 'order', title: 'Blokların yerini değiştirince sonuç değişir mi?', rounds: [
          { start: I(7), a: op('+', 8), b: op('−', 3), same: true },
          { start: I(7), a: op('×', 10), b: op('+', 5), same: false },
        ] },
        { kind: 'compose', title: 'Bu iki bloğun işini tek bir blok yapsın!', chain: [op('×', 5), op('×', 2)], tests: [3, 14, 26], hint: '×5 sonra ×2: sayı toplam kaç katına çıktı?' },
        { kind: 'inverse', title: 'Gizli sayı zincirden geçti, 41 çıktı. Gizli sayı neydi?', chain: [op('×', 3), op('−', 4)], secret: I(15), palette: [op('+', 4), op('÷', 3), op('−', 4), op('×', 3)] },
      ]
    case 5:
      return [
        { kind: 'forward', title: '12’den başla, 100’e ulaş! Üç farklı zincir tasarla.', start: I(12), target: I(100), palette: [op('×', 10), op('−', 20), op('+', 8), op('×', 5), op('+', 40), op('×', 2), op('÷', 4)], slots: 4, need: 3 },
        { kind: 'forward', title: '7’den 50’ye ulaş. Zincirin en az 3 halkalı olsun.', start: I(7), target: I(50), palette: [op('×', 7), op('+', 1), op('×', 5), op('+', 3), op('×', 2), op('−', 20), op('÷', 2)], slots: 5, need: 2, minLen: 3 },
        { kind: 'order', title: 'Sıra önemli mi? Zinciri bir ifade olarak da yaz.', rounds: [
          { start: I(6), a: op('×', 4), b: op('÷', 2), same: true },
          { start: I(6), a: op('+', 4), b: op('×', 3), same: false,
            expr: [{ t: '(6 + 4) × 3', ok: true }, { t: '6 + 4 × 3', ok: false, why: '6 + 4 × 3 işlemini önce çarpmayla yaparız: 6 + 12 = 18. Zincirde önce hangi işlem yapıldı? Bunu ifadede nasıl gösteririz?' }, { t: '6 × 3 + 4', ok: false, why: 'Zincirde önce 4 eklendi. Bu ifadede önce ne yapılıyor?' }],
            afterExpr: [{ t: '6 × 3 + 4', ok: true }, { t: '6 × (3 + 4)', ok: false, why: 'Bu ifadede önce 3 + 4 yapılır. Zincirde önce ne oldu?' }, { t: '(6 + 4) × 3', ok: false, why: 'Bu ilk zincirin ifadesiydi. Şimdi blokların sırası ne?' }] },
        ] },
        { kind: 'compose', title: 'Bu iki bloğun işini tek bir blok yapsın!', chain: [op('×', 4), op('÷', 2)], tests: [5, 13, 30], hint: '4 katına çıkarıp yarısını alınca sayı kaç katına çıkmış olur?' },
        { kind: 'inverse', title: 'Gizli sayı zincirden geçti, 60 çıktı. Gizli sayı neydi?', chain: [op('+', 9), op('×', 4)], secret: I(6), palette: [op('÷', 4), op('−', 9), op('×', 4), op('+', 9)] },
      ]
    case 6:
      return [
        { kind: 'forward', title: '2,5’ten başla, 10’a ulaş! İki farklı zincir tasarla.', start: dec('2,5'), target: I(10), palette: [op('×', 4), op('+', 7.5), op('×', 2), op('+', 2.5), op('÷', 0.5), op('×', 0.5)], slots: 4, need: 2 },
        { kind: 'forward', title: '0,6’dan 3’e ulaş. Üç farklı zincir bulabilir misin?', start: dec('0,6'), target: I(3), palette: [op('×', 5), op('+', 2.4), op('×', 10), op('÷', 2), op('+', 0.4), op('−', 0.1)], slots: 4, need: 3 },
        { kind: 'order', title: 'Sıra önemli mi? Zinciri bir ifade olarak da yaz.', rounds: [
          { start: dec('1,5'), a: op('×', 10), b: op('÷', 2), same: true },
          { start: dec('1,5'), a: op('+', 0.5), b: op('×', 4), same: false,
            expr: [{ t: '(1,5 + 0,5) × 4', ok: true }, { t: '1,5 + 0,5 × 4', ok: false, why: 'Bu ifadede önce 0,5 × 4 yapılır. Zincirde önce hangi işlem vardı?' }, { t: '1,5 × 4 + 0,5', ok: false, why: 'Zincirde önce 0,5 eklendi. Bu ifadede önce ne yapılıyor?' }],
            afterExpr: [{ t: '1,5 × 4 + 0,5', ok: true }, { t: '1,5 × (4 + 0,5)', ok: false, why: 'Bu ifadede önce 4 + 0,5 yapılır. Zincirde önce ne oldu?' }, { t: '(1,5 + 0,5) × 4', ok: false, why: 'Bu ilk zincirin ifadesiydi. Şimdi sıra ne?' }] },
        ] },
        { kind: 'compose', title: 'Bu iki bloğun işini tek bir blok yapsın!', chain: [op('×', 10), op('÷', 100)], tests: [7, 35, 2.5], hint: '10 katına çıkarıp 100’e bölünce sayı küçüldü mü, büyüdü mü? Kaçta birine indi?' },
        { kind: 'inverse', title: 'Gizli sayı zincirden geçti, 4,2 çıktı. Gizli sayı neydi?', chain: [op('×', 0.5), op('+', 1.2)], secret: I(6), palette: [op('−', 1.2), op('÷', 0.5), op('+', 1.2), op('×', 0.5)] },
      ]
    case 7:
      return [
        { kind: 'forward', title: '−6’dan başla, 12’ye ulaş! İki farklı zincir tasarla.', start: I(-6), target: I(12), palette: [op('×', -2), op('+', 18), op('−', -6), op('×', -1), op('+', 6), op('×', 2)], slots: 4, need: 2 },
        { kind: 'forward', title: '4’ten −8’e ulaş. Üç farklı zincir bulabilir misin?', start: I(4), target: I(-8), palette: [op('×', -2), op('−', 12), op('+', -4), op('×', -1), op('−', -4), op('×', 2)], slots: 4, need: 3 },
        { kind: 'order', title: 'Sıra önemli mi? Zinciri bir ifade olarak da yaz.', rounds: [
          { start: I(-3), a: op('×', -1), b: op('×', 4), same: true },
          { start: I(-3), a: op('+', 5), b: op('×', -2), same: false,
            expr: [{ t: '(−3 + 5) × (−2)', ok: true }, { t: '−3 + 5 × (−2)', ok: false, why: 'Bu ifadede önce 5 × (−2) yapılır. Zincirde önce hangi işlem vardı?' }, { t: '−3 × (−2) + 5', ok: false, why: 'Zincirde önce 5 eklendi. Bu ifadede önce ne yapılıyor?' }],
            afterExpr: [{ t: '−3 × (−2) + 5', ok: true }, { t: '−3 × (−2 + 5)', ok: false, why: 'Bu ifadede önce −2 + 5 yapılır. Zincirde önce ne oldu?' }, { t: '(−3 + 5) × (−2)', ok: false, why: 'Bu ilk zincirin ifadesiydi. Şimdi sıra ne?' }] },
        ] },
        { kind: 'compose', title: 'Bu iki bloğun işini tek bir blok yapsın!', chain: [op('×', -1), op('×', -3)], tests: [4, -5, 7], hint: 'Önce işareti değiştirdik, sonra −3 ile çarptık. İki eksi çarpanı birleşince ne olur?' },
        { kind: 'inverse', title: 'Gizli sayı zincirden geçti, −7 çıktı. Gizli sayı neydi?', chain: [op('×', -3), op('+', 5)], secret: I(4), palette: [op('−', 5), op('÷', -3), op('+', 5), op('×', -3)] },
      ]
    default:
      return [
        { kind: 'forward', title: '2’den başla, 64’e ulaş! İki farklı zincir tasarla.', start: I(2), target: I(64), palette: [op('^', 2), op('^', 3), op('×', 2), op('×', 4), op('×', 8), op('√')], slots: 4, need: 2 },
        { kind: 'forward', title: '81’den 3’e in. Üç farklı zincir bulabilir misin?', start: I(81), target: I(3), palette: [op('√'), op('÷', 3), op('÷', 27), op('^', 2), op('÷', 9)], slots: 4, need: 3 },
        { kind: 'order', title: 'Sıra önemli mi? Zinciri üslü ifade olarak yaz.', rounds: [
          { start: I(3), a: op('^', 2), b: op('^', 3), same: true },
          { start: I(3), a: op('^', 2), b: op('×', 2), same: false,
            expr: [{ t: '3^{2} × 2', ok: true }, { t: '(3 × 2)^{2}', ok: false, why: 'Bu ifadede önce 3 × 2 yapılır, sonra karesi alınır. Zincirde önce ne yapıldı?' }, { t: '3 × 2^{2}', ok: false, why: 'Bu ifadede yalnız 2’nin karesi alınıyor. Zincirde neyin karesi alındı?' }],
            afterExpr: [{ t: '(3 × 2)^{2}', ok: true }, { t: '3 × 2^{2}', ok: false, why: 'Burada yalnız 2’nin karesi alınıyor. Zincirde neyin karesi alındı?' }, { t: '3^{2} × 2', ok: false, why: 'Bu ilk zincirin ifadesiydi. Şimdi sıra ne?' }] },
        ] },
        { kind: 'compose', title: 'Bu iki bloğun işini tek bir blok yapsın!', chain: [op('^', 2), op('^', 3)], tests: [2, 3, 10], hint: 'Karesinin küpü: aynı sayı kaç kez çarpılmış oldu?' },
        { kind: 'inverse', title: 'Gizli sayı zincirden geçti, 18 çıktı. Gizli sayı neydi?', chain: [op('^', 2), op('−', 7)], secret: I(5), palette: [op('+', 7), op('√'), op('−', 7), op('^', 2)] },
      ]
  }
}

// ───────────────────────── Görsel parçalar ─────────────────────────

function Block({ o, look, small, ghost }: { o: Op; look: Look; small?: boolean; ghost?: boolean }) {
  const c = OP_COLOR[o.k]
  return (
    <span
      className={`inline-flex ${small ? 'min-h-11 min-w-16 text-lg' : `${look.big ? 'min-h-14' : 'min-h-12'} min-w-20 text-xl sm:text-2xl`} items-center justify-center rounded-2xl px-3 font-black whitespace-nowrap text-white select-none ${ghost ? 'opacity-40' : ''}`}
      style={{ background: `linear-gradient(180deg, ${c}, ${c}dd)`, boxShadow: `0 4px 0 ${c}99, inset 0 2px 0 #ffffff40` }}
    >
      <MathText text={opLabel(o)} />
    </span>
  )
}

function Bubble({ v, look, tone = 'idle', label }: { v: Q | null; look: Look; tone?: 'idle' | 'goal' | 'bad' | 'start'; label?: string }) {
  const cls =
    tone === 'goal'
      ? 'bg-emerald-500 text-white ring-4 ring-emerald-200'
      : tone === 'bad'
        ? look.dark ? 'bg-rose-500/20 text-rose-200 ring-2 ring-rose-400' : 'bg-rose-50 text-rose-600 ring-2 ring-rose-300'
        : tone === 'start'
          ? look.dark ? 'bg-cyan-400 text-slate-900 ring-4 ring-cyan-200/40' : 'bg-amber-400 text-amber-950 ring-4 ring-amber-200'
          : look.dark ? 'bg-slate-900 text-cyan-200 ring-2 ring-slate-600' : 'bg-white text-ink ring-2 ring-sky-200'
  return (
    <span className="inline-flex flex-col items-center">
      <span key={v ? valStr(v) : 'x'} className={`inline-flex min-h-12 min-w-14 items-center justify-center rounded-full px-3 text-xl font-black tabular-nums animate-pop sm:text-2xl ${cls}`}>
        {v ? <MathText text={valStr(v)} /> : '?'}
      </span>
      {label && <span className={`mt-0.5 text-[11px] font-black tracking-wide uppercase ${look.muted}`}>{label}</span>}
    </span>
  )
}

const Pipe = ({ look, bad, up }: { look: Look; bad?: boolean; up?: boolean }) => (
  <div className="flex h-6 justify-center" aria-hidden>
    <span className={`relative w-1.5 rounded-full ${bad ? 'bg-rose-400' : look.dark ? 'bg-cyan-500/50' : 'bg-sky-300'}`}>
      {up ? <ArrowUp size={14} className={`absolute -top-1 left-1/2 -translate-x-1/2 ${look.dark ? 'text-cyan-300' : 'text-sky-500'}`} /> : <ArrowDown size={14} className={`absolute -bottom-1 left-1/2 -translate-x-1/2 ${look.dark ? 'text-cyan-300' : 'text-sky-500'}`} />}
    </span>
  </div>
)

/** Paletteki sürüklenebilir blok */
function PaletteBlock({ o, look, onAdd, onDropTo, onOver }: { o: Op; look: Look; onAdd: () => void; onDropTo: (t: string | null) => void; onOver: (t: string | null) => void }) {
  const d = useDragDrop({ onDrop: onDropTo, onTap: onAdd, onOver })
  return (
    <button type="button" {...d.bind()} onClick={d.onClick} style={d.style} data-handle className="cursor-grab rounded-2xl active:cursor-grabbing" aria-label={`${opLabel(o)} bloğunu zincire ekle`}>
      <Block o={o} look={look} small={!look.big} />
    </button>
  )
}

/** Zincirdeki blok: sürükleyip başka halkaya bırakınca yer değiştirir; dokununca seçilir */
function ChainBlock({ it, look, selected, onTap, onDropTo, onOver }: { it: Item; look: Look; selected: boolean; onTap: () => void; onDropTo: (t: string | null) => void; onOver: (t: string | null) => void }) {
  const d = useDragDrop({ onDrop: onDropTo, onTap, onOver })
  return (
    <button type="button" {...d.bind()} onClick={d.onClick} style={d.style} data-handle className={`cursor-grab rounded-2xl ${selected ? 'ring-4 ring-amber-400 ring-offset-2' : ''}`} aria-label={`${opLabel(it.o)} halkası`} aria-pressed={selected}>
      <Block o={it.o} look={look} />
    </button>
  )
}

/** Zincir: başlangıç → halkalar → (boş yuva). Değerler sağda akar. */
function ChainView({ look, start, items, run, slots, target, selected, over, onSelect, onMoveTo, onOver, reverse, startLabel = 'Başlangıç', endLabel }: {
  look: Look; start: Q; items: Item[]; run: Run; slots: number; target?: Q | null; selected: number | null; over: string | null
  onSelect: (i: number) => void; onMoveTo: (from: number, t: string | null) => void; onOver: (t: string | null) => void; reverse?: boolean; startLabel?: string; endLabel?: string
}) {
  const canAdd = items.length < slots
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="flex items-center justify-center gap-3">
        <Bubble v={start} look={look} tone="start" label={startLabel} />
      </div>
      {items.map((it, i) => {
        const broken = run.breakAt !== -1 && i >= run.breakAt
        const v = broken ? null : run.vals[i]
        const isLast = i === items.length - 1
        const goal = !!target && !!v && isLast && qEq(v, target)
        return (
          <div key={it.id}>
            <Pipe look={look} bad={broken} up={reverse} />
            <div data-drop={`slot-${i}`} className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl p-1 transition ${over === `slot-${i}` ? (look.dark ? 'bg-cyan-400/20' : 'bg-sky-100') : ''}`}>
              <div className="flex justify-end">
                <ChainBlock it={it} look={look} selected={selected === i} onTap={() => onSelect(i)} onDropTo={(t) => onMoveTo(i, t)} onOver={onOver} />
              </div>
              <span className={`text-2xl font-black ${look.muted}`} aria-hidden>⟶</span>
              <div className="flex items-center gap-1">
                <Bubble v={v} look={look} tone={broken && i === run.breakAt ? 'bad' : goal ? 'goal' : 'idle'} label={isLast && endLabel ? endLabel : undefined} />
                {goal && <Flag size={22} className="text-emerald-500 animate-pop" />}
              </div>
            </div>
          </div>
        )
      })}
      {canAdd && (
        <>
          <Pipe look={look} up={reverse} />
          <div data-drop="slot-new" className={`mx-auto flex ${look.big ? 'min-h-16' : 'min-h-14'} w-full max-w-xs items-center justify-center gap-2 rounded-2xl border-[3px] border-dashed text-sm font-black transition ${over === 'slot-new' ? (look.dark ? 'border-cyan-300 bg-cyan-400/15 text-cyan-200' : 'border-sky-400 bg-sky-50 text-sky-700') : look.dark ? 'border-slate-600 text-slate-400' : 'border-sky-200 text-sky-600/80'}`}>
            <Plus size={18} />Bloğu buraya sürükle ya da dokun
          </div>
        </>
      )}
    </div>
  )
}

/** Seçili halka için küçük araç çubuğu */
function SelectedBar({ look, i, n, onMove, onRemove, onClose }: { look: Look; i: number; n: number; onMove: (d: -1 | 1) => void; onRemove: () => void; onClose: () => void }) {
  const b = `inline-flex min-h-12 items-center gap-1.5 rounded-xl px-3 text-sm font-extrabold ${look.key}`
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-2 animate-fade-up">
      <button type="button" className={b} disabled={i === 0} onClick={() => onMove(-1)}><ArrowUp size={18} />Yukarı</button>
      <button type="button" className={b} disabled={i === n - 1} onClick={() => onMove(1)}><ArrowDown size={18} />Aşağı</button>
      <button type="button" className={b} onClick={onRemove}><Trash2 size={18} />Çıkar</button>
      <button type="button" className={`${b} opacity-80`} onClick={onClose}>Tamam</button>
    </div>
  )
}

/** Kendi bloğunu tasarla: işlem + sayı */
function Designer({ look, grade, onMake, title = 'Kendi bloğunu tasarla', cta = 'Bloğu ekle' }: { look: Look; grade: Grade; onMake: (o: Op) => void; title?: string; cta?: string }) {
  const ops = opsFor(grade)
  const [k, setK] = useState<OpK>(ops[0])
  const [val, setVal] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const make = () => {
    if (k === '√') return onMake(op('√'))
    const v = parseQ(val)
    if (!v) return setErr('Bir sayı yaz.')
    if (k === '^' && (!isInt(v) || v.n < 2 || v.n > 6)) return setErr('Üs olarak 2 ile 6 arasında bir tam sayı yaz.')
    if (grade <= 5 && !isInt(v)) return setErr('Bu sınıfta tam sayılarla çalışıyoruz.')
    if ((k === '×' || k === '÷') && v.n === 0) return setErr(k === '÷' ? '0’a bölme tanımsız. Başka bir sayı dene.' : '0 ile çarpınca her sayı 0 olur. Başka bir sayı dene.')
    setErr(null)
    setVal('')
    onMake(op(k, v))
  }
  return (
    <div className={`rounded-2xl p-3 ${look.soft}`}>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-black"><Wand2 size={16} />{title}</p>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {ops.map((o) => (
          <button key={o} type="button" onClick={() => { setK(o); setErr(null) }} aria-pressed={k === o} className={`grid ${look.big ? 'size-14' : 'size-12'} place-items-center rounded-xl text-xl font-black transition ${k === o ? 'text-white ring-2 ring-white/70' : look.chip}`} style={k === o ? { background: OP_COLOR[o] } : undefined}>
            {o === '^' ? <MathText text="□^{n}" /> : o === '√' ? <MathText text="√{□}" /> : o}
          </button>
        ))}
      </div>
      {k !== '√' && (
        <div className={`mb-2 flex min-h-12 items-center justify-center gap-2 rounded-xl text-2xl font-black ${look.dark ? 'bg-slate-900' : 'bg-white ring-1 ring-line'}`}>
          <span style={{ color: OP_COLOR[k] }}>{k === '^' ? 'üs' : k}</span>
          <span className="tabular-nums">{val || <span className={look.muted}>?</span>}</span>
        </div>
      )}
      {k !== '√' && <Pad look={look} value={val} onChange={(v) => { setVal(v); setErr(null) }} allow={{ dec: grade >= 6 && k !== '^', neg: grade >= 7 && k !== '^' }} />}
      {err && <p className="mt-2 text-sm font-bold text-amber-600">{err}</p>}
      <button type="button" onClick={make} className="btn-primary mt-2 min-h-12 w-full"><Plus size={18} />{cta}</button>
    </div>
  )
}

// ───────────────────────── Görevler ─────────────────────────

interface Res { first: boolean; chains: number }
let uid = 1

function useChain(initial: Op[] = []) {
  const [items, setItems] = useState<Item[]>(() => initial.map((o) => ({ id: uid++, o })))
  const [sel, setSel] = useState<number | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const add = (o: Op, at?: number, max = 9) =>
    setItems((cur) => {
      if (at !== undefined && at < cur.length) return cur.map((c, i) => (i === at ? { id: uid++, o } : c))
      if (cur.length >= max) return cur
      return [...cur, { id: uid++, o }]
    })
  const moveTo = (from: number, t: string | null) => {
    setSel(null)
    if (!t || !t.startsWith('slot-')) return
    setItems((cur) => {
      const a = cur.slice()
      if (t === 'slot-new') {
        const [x] = a.splice(from, 1)
        a.push(x)
        return a
      }
      const to = Number(t.slice(5))
      if (to === from || Number.isNaN(to)) return cur
      ;[a[from], a[to]] = [a[to], a[from]]
      return a
    })
  }
  const shift = (i: number, d: -1 | 1) => {
    setItems((cur) => {
      const a = cur.slice()
      const j = i + d
      if (j < 0 || j >= a.length) return cur
      ;[a[i], a[j]] = [a[j], a[i]]
      return a
    })
    setSel(i + d)
  }
  const remove = (i: number) => {
    setItems((cur) => cur.filter((_, k) => k !== i))
    setSel(null)
  }
  return { items, setItems, sel, setSel, over, setOver, add, moveTo, shift, remove }
}

type Say = { q: string; tone?: 'ok'; mis?: string; k: number } | null

function ForwardTask({ t, grade, look, onDone, sols }: { t: Forward; grade: Grade; look: Look; onDone: (r: Res) => void; sols: ReturnType<typeof useSolutions> }) {
  const track = useTracker()
  const ch = useChain()
  const [palette, setPalette] = useState<Op[]>(t.palette)
  const [saved, setSaved] = useState<{ key: string; bag: string; label: string }[]>([])
  const [say, setSay] = useState<Say>(null)
  const [design, setDesign] = useState(false)
  const [phase, setPhase] = useState<'build' | 'strategy' | 'done'>('build')
  const misses = useRef(0)
  const ops = ch.items.map((x) => x.o)
  const run = runChain(t.start, ops, grade)
  const last = run.vals[run.vals.length - 1]
  const reached = ops.length > 0 && run.breakAt === -1 && !!last && qEq(last, t.target)
  const nudge = (q: string, tone?: 'ok', mis?: string) => setSay((s) => ({ q, tone, mis, k: (s?.k ?? 0) + 1 }))

  const dropPalette = (o: Op, target: string | null) => {
    if (!target?.startsWith('slot-')) return
    if (target === 'slot-new') ch.add(o, undefined, t.slots)
    else ch.add(o, Number(target.slice(5)))
  }

  const save = () => {
    const key = ops.map(opKey).join('|')
    const bag = ops.map(opKey).sort().join('|')
    if (t.minLen && ops.length < t.minLen) {
      misses.current++
      track.attempt(false)
      return nudge(`Hedefe ulaştın! Ama bu görevde zincir en az ${t.minLen} halkalı olmalı. Bir adımı iki küçük adıma bölebilir misin?`)
    }
    if (t.mustOp && !ops.some((o) => o.k === t.mustOp)) {
      misses.current++
      track.attempt(false)
      return nudge(`Hedefe ulaştın! Bu görevde zincirde bir ${t.mustOp} bloğu olmalı. ${t.mustOp} ile başlayan bir yol düşünebilir misin?`)
    }
    if (saved.some((s) => s.key === key)) {
      track.attempt(false)
      return nudge('Bu zinciri zaten koleksiyonuna ekledin. Farklı bloklarla başka bir yol bulabilir misin?')
    }
    if (saved.some((s) => s.bag === bag)) {
      return nudge('Aynı blokları yalnızca farklı sıraya dizdin ve sonuç değişmedi. İlginç! Peki tamamen farklı bloklarla bir yol var mı?', 'ok')
    }
    track.attempt(true)
    sfx.ok()
    const label = `${valStr(t.start)} → ${ops.map(opLabel).join(' → ')} → ${valStr(t.target)}`
    const next = [...saved, { key, bag, label }]
    setSaved(next)
    sols.add(`f${t.title}:${key}`, label)
    ch.setItems([])
    if (next.length >= t.need) {
      setSay(null)
      setPhase('strategy')
    } else nudge(`Harika bir zincir! Şimdi ${next.length + 1}. zinciri tasarla — farklı bloklar dene.`, 'ok')
  }

  const status = (() => {
    if (!ops.length) return 'Zincir boş. Bir blok seç.'
    if (run.breakAt !== -1) return 'Zincir koptu!'
    if (reached) return 'Hedefe ulaştın! 🎉'
    const diff = qSub(t.target, last)
    return `Şu an ${valStr(last)}. Hedefe ${diff.n > 0 ? `${valStr(diff)} eksik` : `${valStr(q(-diff.n, diff.d))} fazla`}.`
  })()

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
      <Scene grade={grade}>
        <div className="mb-3 flex flex-wrap items-center justify-center gap-3">
          <span className={`chip px-3 py-1.5 text-base ${look.dark ? 'bg-slate-800 text-cyan-200 ring-1 ring-slate-600' : 'bg-white text-ink ring-1 ring-line'}`}>🎯 Hedef: <b className="text-xl"><MathText text={valStr(t.target)} /></b></span>
          {t.minLen && <span className={`chip px-3 py-1.5 text-sm ${look.dark ? 'bg-slate-800 text-slate-200' : 'bg-amber-50 text-amber-800'}`}>En az {t.minLen} halka</span>}
          {t.mustOp && <span className={`chip px-3 py-1.5 text-sm ${look.dark ? 'bg-slate-800 text-slate-200' : 'bg-amber-50 text-amber-800'}`}>İçinde {t.mustOp} olsun</span>}
        </div>
        <ChainView look={look} start={t.start} items={ch.items} run={run} slots={t.slots} target={t.target} selected={ch.sel} over={ch.over}
          onSelect={(i) => ch.setSel(ch.sel === i ? null : i)} onMoveTo={ch.moveTo} onOver={ch.setOver} />
        {ch.sel !== null && ch.sel < ch.items.length && (
          <SelectedBar look={look} i={ch.sel} n={ch.items.length} onMove={(d) => ch.shift(ch.sel!, d)} onRemove={() => ch.remove(ch.sel!)} onClose={() => ch.setSel(null)} />
        )}
        <div className={`mt-5 rounded-2xl p-3 ${look.dark ? 'bg-slate-900/50 ring-1 ring-slate-700' : 'bg-white/70 ring-1 ring-line'}`}>
          <p className={`mb-2 text-center text-xs font-black tracking-wide uppercase ${look.muted}`}>Blok kutusu · sürükle ya da dokun</p>
          <div className="flex flex-wrap justify-center gap-2">
            {palette.map((o, i) => (
              <PaletteBlock key={`${opKey(o)}-${i}`} o={o} look={look} onAdd={() => ch.add(o, undefined, t.slots)} onDropTo={(tg) => dropPalette(o, tg)} onOver={ch.setOver} />
            ))}
          </div>
        </div>
      </Scene>

      <div className="space-y-3 lg:sticky lg:top-20">
        <Panel look={look} title={`Zincir koleksiyonu: ${saved.length} / ${t.need}`} icon={<span aria-hidden>⛓️</span>}>
          <p className={`text-base font-extrabold ${reached ? 'text-emerald-500' : run.breakAt !== -1 ? 'text-rose-500' : look.strong}`}><MathText text={status} /></p>
          {run.msg && <Nudge key={run.msg} question={run.msg} />}
          {phase === 'build' && (
            <div className="mt-3 grid gap-2">
              {reached && <button type="button" onClick={save} className="btn-primary min-h-14 text-lg animate-pop"><Sparkles size={20} />Koleksiyona ekle</button>}
              <div className="flex gap-2">
                <button type="button" onClick={() => ch.setItems([])} disabled={!ops.length} className={`btn-ghost flex-1 ${look.dark ? '!bg-slate-700 !text-white !ring-slate-500' : ''}`}><Undo2 size={18} />Temizle</button>
                <button type="button" onClick={() => setDesign((d) => !d)} aria-expanded={design} className={`btn-ghost flex-1 ${look.dark ? '!bg-slate-700 !text-white !ring-slate-500' : ''}`}><Wand2 size={18} />Blok tasarla</button>
              </div>
              {design && <Designer look={look} grade={grade} onMake={(o) => { setPalette((p) => (p.some((x) => opKey(x) === opKey(o)) ? p : [...p, o])); setDesign(false); sfx.ok() }} />}
            </div>
          )}
          {saved.length > 0 && (
            <ol className="mt-3 space-y-1.5">
              {saved.map((s, i) => (
                <li key={s.key} className={`rounded-xl px-3 py-2 text-[15px] font-extrabold animate-fade-up ${look.dark ? 'bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-400/30' : 'bg-emerald-50 text-emerald-900'}`}>
                  <span className="mr-1 opacity-60">{i + 1}.</span><MathText text={s.label} />
                </li>
              ))}
            </ol>
          )}
          {say && <Nudge key={say.k} question={say.q} tone={say.tone} misconception={say.mis} onClose={() => setSay(null)} />}
          {phase === 'strategy' && (
            <StrategyPicker
              question="Zincirlerini nasıl tasarladın?"
              options={['Hedeften geriye düşündüm', 'Önce büyük bir adım attım', 'Deneyip yaklaştım', 'Bir zinciri değiştirip yenisini yaptım']}
              onPick={() => setPhase('done')}
            />
          )}
          {phase === 'done' && <NextButton onClick={() => onDone({ first: misses.current === 0, chains: saved.length })} />}
        </Panel>
      </div>
    </div>
  )
}

function OrderTask({ t, grade, look, onDone }: { t: Order; grade: Grade; look: Look; onDone: (r: Res) => void }) {
  const track = useTracker()
  const [r, setR] = useState(0)
  const round = t.rounds[r]
  const [items, setItems] = useState<Item[]>(() => [{ id: uid++, o: round.a }, { id: uid++, o: round.b }])
  const [phase, setPhase] = useState<'predict' | 'swap' | 'expr1' | 'see' | 'expr2' | 'done'>('predict')
  const [guess, setGuess] = useState<boolean | null>(null)
  const [bad, setBad] = useState<string[]>([])
  const [say, setSay] = useState<Say>(null)
  const [over, setOver] = useState<string | null>(null)
  const misses = useRef(0)
  const before = useMemo(() => runChain(round.start, [round.a, round.b], grade), [round, grade])
  const swapped = items[0].o === round.b
  const run = runChain(round.start, items.map((x) => x.o), grade)
  const nudge = (q: string, tone?: 'ok', mis?: string) => setSay((s) => ({ q, tone, mis, k: (s?.k ?? 0) + 1 }))
  const res0 = before.vals[1]

  const doSwap = () => {
    if (phase !== 'swap') return
    setItems((c) => [c[1], c[0]])
    sfx.ok()
    const after = runChain(round.start, [round.b, round.a], grade).vals[1]
    const same = qEq(after, res0)
    const right = guess === same
    if (!right) misses.current++
    track.attempt(right)
    nudge(
      same
        ? `Sonuç yine ${valStr(after)}! ${right ? 'Tahminin doğruydu. ' : ''}${round.a.k === '+' || round.a.k === '−' ? 'Yalnızca ekleyip çıkardığımızda sıra sonucu değiştirmiyor.' : round.a.k === '^' ? 'Önce kare sonra küp ya da önce küp sonra kare: ikisi de aynı kuvvete çıkarır.' : 'İki çarpma/bölme bloğunun sırası sonucu değiştirmedi.'}`
        : `Önce ${valStr(res0)}, şimdi ${valStr(after)}! ${right ? 'Tahminin doğruydu. ' : ''}İlk zincirde ${opLabel(round.b)} bloğu hangi sayıya uygulandı, şimdi hangisine?`,
      right ? 'ok' : undefined,
      right ? undefined : same ? undefined : 'İşlem sırasının sonucu değiştirmeyeceğini düşündü',
    )
    setPhase(round.expr ? 'expr2' : 'see')
  }

  const startRound2 = () => {
    if (r + 1 < t.rounds.length) {
      const nr = t.rounds[r + 1]
      setR(r + 1)
      setItems([{ id: uid++, o: nr.a }, { id: uid++, o: nr.b }])
      setGuess(null)
      setBad([])
      setSay(null)
      setPhase('predict')
    } else {
      track.item(misses.current === 0)
      setPhase('done')
    }
  }

  const exprList = phase === 'expr1' ? round.expr : phase === 'expr2' ? round.afterExpr : undefined
  const pickExpr = (e: { t: string; ok: boolean; why?: string }) => {
    if (e.ok) {
      track.attempt(true)
      sfx.ok()
      setBad([])
      if (phase === 'expr1') {
        setPhase('swap')
        nudge('Doğru! Parantez, zincirde önce yapılan işlemi gösteriyor. Şimdi iki bloğun yerini değiştir.', 'ok')
      } else {
        setPhase('see')
        nudge('Harika! Zincirin sırası = ifadedeki işlem önceliği.', 'ok')
      }
      return
    }
    misses.current++
    track.attempt(false)
    setBad((b) => [...b, e.t])
    nudge(e.why ?? 'Zincirde hangi işlem önce yapıldı?', undefined, 'İşlem önceliğini (parantezi) göz ardı etti')
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
      <Scene grade={grade}>
        <p className={`mb-2 text-center text-sm font-black ${look.muted}`}>Deney {r + 1} / {t.rounds.length}</p>
        <ChainView look={look} start={round.start} items={items} run={run} slots={2} selected={null} over={over}
          onSelect={() => phase === 'swap' && doSwap()} onMoveTo={(_, tg) => tg?.startsWith('slot-') && doSwap()} onOver={setOver} endLabel={swapped ? 'Yeni sonuç' : 'Sonuç'} />
        {swapped && (
          <p className={`mt-3 text-center text-base font-extrabold ${look.strong}`}>
            Önceki sıra: <MathText text={`${opLabel(round.a)}, ${opLabel(round.b)} → ${valStr(res0)}`} />
          </p>
        )}
        {phase === 'swap' && (
          <div className="mt-4 flex justify-center">
            <button type="button" onClick={doSwap} className="btn-primary min-h-14 px-6 text-lg animate-pop"><ArrowLeftRight size={20} />Blokların yerini değiştir</button>
          </div>
        )}
        {phase === 'swap' && <p className={`mt-2 text-center text-sm font-bold ${look.muted}`}>Bir bloğu diğerinin üstüne sürükleyebilir ya da düğmeye dokunabilirsin.</p>}
      </Scene>
      <div className="space-y-3 lg:sticky lg:top-20">
        <Panel look={look} title={phase === 'predict' ? 'Önce tahmin et' : exprList ? 'Bu zinciri tek bir ifade olarak yaz' : 'Ne oldu?'} icon={<span aria-hidden>🔁</span>}>
          {phase === 'predict' && (
            <>
              <p className={`mb-3 text-[15px] font-semibold ${look.muted}`}>
                <MathText text={`Zincir şimdi ${valStr(res0)} veriyor. ${opLabel(round.a)} ile ${opLabel(round.b)} bloklarının yerini değiştirirsek sonuç değişir mi?`} />
              </p>
              <div className="grid gap-2">
                <Choice look={look} text="Değişir" onClick={() => { setGuess(false); setPhase(round.expr ? 'expr1' : 'swap') }} />
                <Choice look={look} text="Değişmez" onClick={() => { setGuess(true); setPhase(round.expr ? 'expr1' : 'swap') }} />
              </div>
            </>
          )}
          {exprList && (
            <div className="grid gap-2">
              {exprList.map((e) => <Choice key={e.t} look={look} text={e.t} state={bad.includes(e.t) ? 'wrong' : 'idle'} onClick={() => pickExpr(e)} />)}
            </div>
          )}
          {phase === 'swap' && <p className={`text-[15px] font-bold ${look.muted}`}>Tahminin: <b className={look.strong}>{guess ? 'Değişmez' : 'Değişir'}</b>. Şimdi dene!</p>}
          {say && <Nudge key={say.k} question={say.q} tone={say.tone} misconception={say.mis} />}
          {phase === 'see' && <NextButton onClick={startRound2} label={r + 1 < t.rounds.length ? 'Sonraki deney' : 'Devam'} />}
          {phase === 'done' && (
            <>
              <StrategyPicker question="Sence sıra ne zaman önemli?" options={['Toplama ile çarpma karışınca', 'Hep önemli', 'Hiç önemli değil', 'Emin değilim']} onPick={() => {}} />
              <NextButton onClick={() => onDone({ first: misses.current === 0, chains: 0 })} />
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}

function ComposeTask({ t, grade, look, onDone }: { t: Compose; grade: Grade; look: Look; onDone: (r: Res) => void }) {
  const track = useTracker()
  const [mine, setMine] = useState<Op | null>(null)
  const [say, setSay] = useState<Say>(null)
  const [ok, setOk] = useState(false)
  const [tries, setTries] = useState(0)
  const nudge = (q: string, tone?: 'ok', mis?: string) => setSay((s) => ({ q, tone, mis, k: (s?.k ?? 0) + 1 }))
  const tests = t.tests.map((x) => q(Math.round(x * 1000), 1000))
  const rows = tests.map((x) => {
    const long = runChain(x, t.chain, 8).vals[t.chain.length - 1]
    const short = mine ? runChain(x, [mine], 8).vals[0] ?? null : null
    return { x, long, short, same: !!short && !!long && qEq(long, short) }
  })
  const extra = [1, 2, 7, 11].map((n) => q(n))
  const check = (o: Op) => {
    setMine(o)
    setTries((n) => n + 1)
    const all = [...tests, ...extra].every((x) => {
      const a = runChain(x, t.chain, 8).vals[t.chain.length - 1]
      const b = runChain(x, [o], 8).vals[0]
      return a && b && qEq(a, b)
    })
    track.attempt(all)
    if (all) {
      sfx.ok()
      setOk(true)
      track.item(tries === 0)
      nudge(`Evet! ${t.chain.map(opLabel).join(' sonra ')} yapmak, tek başına ${opLabel(o)} yapmakla aynı. Her sayı için!`, 'ok')
    } else {
      const firstBad = tests.find((x) => {
        const a = runChain(x, t.chain, 8).vals[t.chain.length - 1]
        const b = runChain(x, [o], 8).vals[0]
        return !(a && b && qEq(a, b))
      })
      const sameSome = tests.some((x) => {
        const a = runChain(x, t.chain, 8).vals[t.chain.length - 1]
        const b = runChain(x, [o], 8).vals[0]
        return a && b && qEq(a, b)
      })
      nudge(
        sameSome
          ? `Bazı sayılarda tuttu ama ${firstBad ? valStr(firstBad) : 'bir sayı'} için tutmadı. Kısa yol bloğu her sayı için aynı işi yapmalı. ${t.hint}`
          : t.hint,
        undefined,
        tries >= 1 ? 'Ardışık işlemleri tek işlemde birleştirmekte zorlandı' : undefined,
      )
    }
  }
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
      <Scene grade={grade}>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className={`text-sm font-black tracking-wide uppercase ${look.muted}`}>Uzun zincir</span>
          {t.chain.map((o, i) => <span key={i} className="flex items-center gap-2">{i > 0 && <span className={`text-xl font-black ${look.muted}`}>→</span>}<Block o={o} look={look} small /></span>)}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className={`text-sm font-black tracking-wide uppercase ${look.muted}`}>Kısa yol</span>
          {mine ? <Block o={mine} look={look} small /> : <span className={`inline-flex min-h-11 min-w-20 items-center justify-center rounded-2xl border-[3px] border-dashed px-3 font-black ${look.dark ? 'border-slate-600 text-slate-400' : 'border-sky-200 text-sky-600'}`}>?</span>}
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-line">
          <table className={`w-full text-center text-lg font-black tabular-nums ${look.dark ? 'bg-slate-900/60 text-slate-100' : 'bg-white text-ink'}`}>
            <thead>
              <tr className={`text-xs tracking-wide uppercase ${look.dark ? 'bg-slate-800 text-slate-300' : 'bg-sky-50 text-sky-900'}`}>
                <th className="py-2">Giren</th><th>Uzun zincir</th><th>Kısa yol</th><th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={valStr(r.x)} className={`border-t ${look.dark ? 'border-slate-700' : 'border-line'}`}>
                  <td className="py-2.5"><MathText text={valStr(r.x)} /></td>
                  <td><MathText text={r.long ? valStr(r.long) : '—'} /></td>
                  <td className={r.short ? (r.same ? 'text-emerald-500' : 'text-rose-500') : look.muted}><MathText text={r.short ? valStr(r.short) : '?'} /></td>
                  <td>{r.short ? (r.same ? '✅' : '❌') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={`mt-2 text-center text-sm font-bold ${look.muted}`}>Kısa yol bloğu her giren sayı için uzun zincirle aynı sonucu vermeli.</p>
      </Scene>
      <div className="space-y-3 lg:sticky lg:top-20">
        <Panel look={look} title="Kısa yol bloğunu tasarla" icon={<span aria-hidden>⚡</span>}>
          {!ok && <Designer look={look} grade={grade} onMake={check} title="İşlemi ve sayıyı seç" cta="Dene" />}
          {say && <Nudge key={say.k} question={say.q} tone={say.tone} misconception={say.mis} />}
          {ok && <NextButton onClick={() => onDone({ first: tries <= 1, chains: 0 })} />}
        </Panel>
      </div>
    </div>
  )
}

function InverseTask({ t, grade, look, onDone }: { t: Inverse; grade: Grade; look: Look; onDone: (r: Res) => void }) {
  const track = useTracker()
  const out = runChain(t.secret, t.chain, grade).vals[t.chain.length - 1]
  const ch = useChain()
  const [say, setSay] = useState<Say>(null)
  const [tested, setTested] = useState<{ start: Q; run: Run } | null>(null)
  const [ok, setOk] = useState(false)
  const misses = useRef(0)
  const nudge = (q: string, tone?: 'ok', mis?: string) => setSay((s) => ({ q, tone, mis, k: (s?.k ?? 0) + 1 }))
  const ops = ch.items.map((x) => x.o)
  const run = runChain(out, ops, grade)
  const found = ops.length && run.breakAt === -1 ? run.vals[run.vals.length - 1] : null

  const test = () => {
    if (!found) return
    const fr = runChain(found, t.chain, 8)
    setTested({ start: found, run: fr })
    const end = fr.vals[fr.vals.length - 1]
    if (fr.breakAt === -1 && end && qEq(end, out)) {
      track.attempt(true)
      track.item(misses.current === 0)
      sfx.ok()
      setOk(true)
      const strat = ops.length === t.chain.length ? 'Ters işlemle geriye çalışma' : 'Dene-gör'
      track.strategy(strat)
      nudge(`Buldun! Gizli sayı ${valStr(found)}. Geri giderken her işlemi tersine çevirdin ve en sondakinden başladın.`, 'ok')
    } else {
      misses.current++
      track.attempt(false)
      const firstUndo = t.chain[t.chain.length - 1]
      const wrongOrder = ops.length === t.chain.length && undoes(ops[0], t.chain[0]) && !undoes(ops[0], firstUndo)
      nudge(
        wrongOrder
          ? `${valStr(found)} zincirden geçince ${end ? valStr(end) : '?'} çıktı, ${valStr(out)} değil. Geri giderken önce hangi işlemi geri almalısın: ilk yapılanı mı, en son yapılanı mı? (Önce ayakkabı, sonra çorap çıkarılır 👟)`
          : `${valStr(found)} zincirden geçince ${end ? valStr(end) : '?'} çıktı. ${opLabel(firstUndo)} işlemini hangi işlem geri alır?`,
        undefined,
        wrongOrder ? 'Ters işlemleri yanlış sırada uyguladı' : 'Ters işlemi seçmekte zorlandı',
      )
    }
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
      <Scene grade={grade}>
        <div className={`mb-4 rounded-2xl p-3 ${look.dark ? 'bg-slate-900/50 ring-1 ring-slate-700' : 'bg-white/80 ring-1 ring-line'}`}>
          <p className={`mb-2 text-center text-xs font-black tracking-wide uppercase ${look.muted}`}>Gizli makine</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Bubble v={tested?.start ?? null} look={look} tone="start" />
            {t.chain.map((o, i) => {
              const v = tested ? (tested.run.breakAt !== -1 && i >= tested.run.breakAt ? null : tested.run.vals[i]) : null
              return (
                <span key={i} className="flex items-center gap-2">
                  <span className={`text-xl font-black ${look.muted}`}>→</span>
                  <Block o={o} look={look} small />
                  {i < t.chain.length - 1 && tested && <><span className={`text-xl font-black ${look.muted}`}>→</span><Bubble v={v} look={look} /></>}
                </span>
              )
            })}
            <span className={`text-xl font-black ${look.muted}`}>→</span>
            <Bubble v={tested ? (tested.run.vals[t.chain.length - 1] ?? null) : out} look={look} tone={tested ? (ok ? 'goal' : 'bad') : 'goal'} />
          </div>
        </div>
        <p className={`mb-2 text-center text-xs font-black tracking-wide uppercase ${look.muted}`}>Geri zincir: {valStr(out)}’den geriye</p>
        <ChainView look={look} start={out} items={ch.items} run={run} slots={3} selected={ch.sel} over={ch.over} startLabel="Çıkış" endLabel="Gizli sayı?"
          onSelect={(i) => ch.setSel(ch.sel === i ? null : i)} onMoveTo={ch.moveTo} onOver={ch.setOver} />
        {ch.sel !== null && ch.sel < ch.items.length && (
          <SelectedBar look={look} i={ch.sel} n={ch.items.length} onMove={(d) => ch.shift(ch.sel!, d)} onRemove={() => ch.remove(ch.sel!)} onClose={() => ch.setSel(null)} />
        )}
        <div className={`mt-5 rounded-2xl p-3 ${look.dark ? 'bg-slate-900/50 ring-1 ring-slate-700' : 'bg-white/70 ring-1 ring-line'}`}>
          <p className={`mb-2 text-center text-xs font-black tracking-wide uppercase ${look.muted}`}>Blok kutusu</p>
          <div className="flex flex-wrap justify-center gap-2">
            {t.palette.map((o, i) => (
              <PaletteBlock key={i} o={o} look={look} onAdd={() => ch.add(o, undefined, 3)} onDropTo={(tg) => tg?.startsWith('slot-') && (tg === 'slot-new' ? ch.add(o, undefined, 3) : ch.add(o, Number(tg.slice(5))))} onOver={ch.setOver} />
            ))}
          </div>
        </div>
      </Scene>
      <div className="space-y-3 lg:sticky lg:top-20">
        <Panel look={look} title="Gizli sayıyı geri zincirle bul" icon={<span aria-hidden>🕵️</span>}>
          <p className={`text-[15px] font-semibold ${look.muted}`}>Çıkıştan başla, makinenin yaptığını geri al. Bulduğun sayıyı makinede dene.</p>
          {run.msg && <Nudge key={run.msg} question={run.msg} />}
          {!ok && (
            <div className="mt-3 grid gap-2">
              <button type="button" onClick={test} disabled={!found} className="btn-primary min-h-14 text-lg">
                <Sparkles size={20} />{found ? <MathText text={`${valStr(found)} sayısını makinede dene`} /> : 'Önce geri zinciri kur'}
              </button>
              <button type="button" onClick={() => { ch.setItems([]); setTested(null) }} disabled={!ops.length} className={`btn-ghost ${look.dark ? '!bg-slate-700 !text-white !ring-slate-500' : ''}`}><Undo2 size={18} />Temizle</button>
            </div>
          )}
          {say && <Nudge key={say.k} question={say.q} tone={say.tone} misconception={say.mis} />}
          {ok && <NextButton last onClick={() => onDone({ first: misses.current === 0, chains: 0 })} />}
        </Panel>
      </div>
    </div>
  )
}

// ───────────────────────── Ana bileşen ─────────────────────────

const EMOJI: Record<Task['kind'], string> = { forward: '⛓️', order: '🔁', compose: '⚡', inverse: '🕵️' }

export default function IslemZinciri({ grade, onFinish }: InteractionProps) {
  const look = useLook(grade)
  const tasks = useMemo(() => tasksFor(grade), [grade])
  const [i, setI] = useState(0)
  const sols = useSolutions()
  const track = useTracker()
  const firsts = useRef(0)
  const chains = useRef(0)
  const t = tasks[i]

  const done = (r: Res) => {
    if (r.first) firsts.current++
    chains.current += r.chains
    if (t.kind === 'forward') track.item(r.first)
    if (i + 1 < tasks.length) {
      setI(i + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const stars = (firsts.current >= tasks.length - 1 ? 3 : firsts.current >= 2 ? 2 : 1) as 1 | 2 | 3
    onFinish({
      summary: `${chains.current} farklı zincir tasarladın, ${tasks.length} görevi tamamladın.`,
      insight:
        grade <= 4
          ? 'Aynı hedefe birçok farklı zincirle ulaşılabilir. Bir zinciri geri çözmek için işlemleri tersine çevirip en sondakinden başlarız.'
          : grade <= 6
            ? 'Zincirin sırası, ifadedeki işlem önceliğidir; ardışık işlemler tek bir işlemde birleşebilir ve ters işlemler zinciri geri çözer.'
            : grade === 7
              ? 'Tam sayılarla da zincirler birleşebilir: iki eksi çarpan artı yapar; geri çözmek için ters işlemleri ters sırada uygularız.'
              : 'Kuvvetin kuvveti üsleri çarpar; karekök kare almayı geri alır. Zincirde sıra, üslü ifadedeki parantezi belirler.',
      stars,
    })
  }

  let body: ReactNode
  if (t.kind === 'forward') body = <ForwardTask key={i} t={t} grade={grade} look={look} onDone={done} sols={sols} />
  else if (t.kind === 'order') body = <OrderTask key={i} t={t} grade={grade} look={look} onDone={done} />
  else if (t.kind === 'compose') body = <ComposeTask key={i} t={t} grade={grade} look={look} onDone={done} />
  else body = <InverseTask key={i} t={t} grade={grade} look={look} onDone={done} />

  return (
    <div>
      <TopBar look={look} step={i} total={tasks.length} title={t.title} emoji={EMOJI[t.kind]} />
      {body}
    </div>
  )
}
