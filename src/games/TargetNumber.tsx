import { useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Flag, Lightbulb, RotateCcw, Undo2 } from 'lucide-react'
import type { Grade, ManipulativeConfig, ManipulativeTool } from '../data/types'
import { distinctInts, pick, randInt, shuffle } from '../lib/random'
import { sfx } from '../lib/feedback'
import { fmt } from '../lib/format'
import { MathText } from '../components/MathText'
import { useTracker } from '../lib/trackerContext'
import { Plane, usePlane } from '../interactive/Plane'
import { signed, starsFor, type GameProps } from './kit'
import { LevelDots, Nudge, Scene, SolutionList, StrategyPicker, TaskCard, useAge, useSolutions } from './kit2'

/**
 * Bir İşlem: Çözüm Atölyesi (Van de Walle)
 *  - Aynı hedefe giden birçok yol toplanır (useSolutions); her çözüm bir işlem ağacı olarak gösterilir.
 *  - "Yakın ol" görevinde hedefe ne kadar yaklaşılabildiği sayı doğrusunda görülür (tahmin, ceza yok).
 *  - 5. sınıfta "ağacı tek satırda yaz": işlem önceliği = ağacın yapısı = parantez.
 *  - Süre yok; geçersiz işlem ya da çıkmaz sokakta düşündüren soru (Nudge).
 */

type Op = '+' | '−' | '×' | '÷'
type Unary = 'sq' | 'sqrt'

/** İşlem ağacı düğümü: yaprak (kart) ya da işlem */
interface Node {
  v: number
  op?: Op | Unary
  l?: Node
  r?: Node
  /** önbelleğe alınmış kanonik anahtar */
  k?: string
}
interface Card { id: number; n: Node }

interface Cfg {
  cards: () => number[]
  ops: Op[]
  unary: boolean
  noNeg: boolean
  range: [number, number]
}

const ALL_OPS: Op[] = ['+', '−', '×', '÷']

function configFor(grade: Grade): Cfg {
  switch (grade) {
    case 3:
      return { cards: () => [...distinctInts(3, 1, 9), ...shuffle([10, 20, 30, 40, 50]).slice(0, 2)], ops: ['+', '−'], unary: false, noNeg: true, range: [15, 120] }
    case 4:
      return { cards: () => [...distinctInts(4, 1, 9), pick([10, 20, 25])], ops: ALL_OPS, unary: false, noNeg: true, range: [12, 150] }
    case 5:
      return { cards: () => [...distinctInts(4, 1, 9), pick([10, 25, 50])], ops: ALL_OPS, unary: false, noNeg: true, range: [20, 200] }
    case 6:
      return { cards: () => [...distinctInts(4, 2, 10), pick([12, 15, 20, 25])], ops: ALL_OPS, unary: false, noNeg: true, range: [24, 240] }
    case 7:
      return {
        cards: () => {
          const s = distinctInts(4, 1, 9)
          return [-s[0], -s[1], s[2], s[3], pick([10, 12, 15, 20])]
        },
        ops: ALL_OPS, unary: false, noNeg: false, range: [-80, 100],
      }
    default:
      return { cards: () => [...distinctInts(4, 2, 9), pick([16, 25, 36, 49])], ops: ALL_OPS, unary: true, noNeg: false, range: [20, 300] }
  }
}

// ───────────────────────── İfade yazımı ─────────────────────────

const num = (v: number) => signed(fmt(v))
/** Sağdaki negatif sayı parantezle yazılır: 5 × (−3) */
const numR = (v: number) => (v < 0 ? `(${num(v)})` : num(v))

/** p: öncelik (1: + −, 2: × ÷, 3: tek sayı / kare); lead: ifade eksi işaretiyle başlıyor (sağda parantez ister) */
interface Expr { s: string; p: number; lead?: boolean }
const PREC: Record<Op, number> = { '+': 1, '−': 1, '×': 2, '÷': 2 }
const wrap = (e: Expr) => `(${e.s})`
function joinExpr(a: Expr, op: Op, b: Expr): Expr {
  const p = PREC[op]
  const lw = a.p < p
  const r = b.lead || b.p < p || (b.p === p && (op === '−' || op === '÷')) ? wrap(b) : b.s
  return { s: `${lw ? wrap(a) : a.s} ${op} ${r}`, p, lead: !lw && !!a.lead }
}
const squareExpr = (a: Expr): Expr => ({ s: `${a.p < 3 || a.lead ? wrap(a) : a.s}^{2}`, p: 3 })
const sqrtExpr = (a: Expr): Expr => ({ s: a.s.includes('{') ? `√(${a.s})` : `√{${a.s}}`, p: 3 })

function exprOf(n: Node): Expr {
  if (!n.op) return { s: num(n.v), p: 3, lead: n.v < 0 }
  if (n.op === 'sq') return squareExpr(exprOf(n.l!))
  if (n.op === 'sqrt') return sqrtExpr(exprOf(n.l!))
  return joinExpr(exprOf(n.l!), n.op, exprOf(n.r!))
}

const apply = (a: number, op: Op, b: number) => (op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b)
const sqrtOf = (v: number) => {
  if (v < 0) return null
  const r = Math.round(Math.sqrt(v))
  return r * r === v ? r : null
}

/**
 * Kanonik anahtar: toplama/çıkarma zinciri işaretli terimler kümesi, çarpma/bölme zinciri pay/payda kümesi
 * olarak yazılır. Böylece 3 + 5 ile 5 + 3, (a + b) − c ile a + (b − c) aynı yol sayılır.
 * ×1, ÷1, +0, −0 gibi “etkisiz” adımlar yolu değiştirmez.
 */
function keyOf(n: Node): string {
  if (n.k) return n.k
  let k: string
  if (!n.op) k = String(n.v)
  else if (n.op === 'sq') k = `sq(${keyOf(n.l!)})`
  else if (n.op === 'sqrt') k = `rt(${keyOf(n.l!)})`
  else {
    const add = n.op === '+' || n.op === '−'
    const [same, inv, id] = add ? ['+', '−', '0'] : ['×', '÷', '1']
    const pos: string[] = []
    const neg: string[] = []
    const walk = (m: Node, sign: boolean) => {
      if (m.op === same) {
        walk(m.l!, sign)
        walk(m.r!, sign)
      } else if (m.op === inv) {
        walk(m.l!, sign)
        walk(m.r!, !sign)
      } else (sign ? pos : neg).push(keyOf(m))
    }
    walk(n, true)
    const p = pos.filter((t) => t !== id).sort()
    const q = neg.filter((t) => t !== id).sort()
    k = !q.length && p.length <= 1 ? (p[0] ?? id) : `${add ? 'S' : 'P'}(${p.join(',')}|${q.join(',')})`
  }
  n.k = k
  return k
}

const hasIdentity = (n: Node): boolean =>
  !!n.op && (((n.op === '×' || n.op === '÷') && n.r?.v === 1) || (n.op === '×' && n.l?.v === 1) || ((n.op === '+' || n.op === '−') && n.r?.v === 0) || hasIdentity(n.l!) || (!!n.r && hasIdentity(n.r)))

const size = (n: Node): number => (n.op ? 1 + size(n.l!) + (n.r ? size(n.r) : 0) : 1)
const leaves = (n: Node): Node[] => (n.op ? [...leaves(n.l!), ...(n.r ? leaves(n.r) : [])] : [n])
const usesOp = (n: Node, ops: (Op | Unary)[]): boolean => !!n.op && (ops.includes(n.op) || usesOp(n.l!, ops) || (!!n.r && usesOp(n.r, ops)))

// ───────────────────────── Çözücü ─────────────────────────

function calc(a: number, op: Op, b: number, noNeg: boolean): number | null {
  if (op === '+') return a + b
  if (op === '−') return noNeg && a - b < 0 ? null : a - b
  if (op === '×') return Math.abs(a * b) > 1e6 ? null : a * b
  if (b === 0 || a % b !== 0) return null
  return a / b
}

/** Hedefe giden farklı yolları (en fazla cap tane) ve en yakın sonucu arar */
function search(start: number[], cfg: Cfg, target: number, cap: number, budget: number) {
  const sols: Node[] = []
  const keys = new Set<string>()
  const seen = new Set<string>()
  const st = { best: null as Node | null, left: budget }
  const visit = (n: Node) => {
    const d = Math.abs(n.v - target)
    const b = st.best
    if (!b || d < Math.abs(b.v - target) || (d === Math.abs(b.v - target) && size(n) < size(b))) st.best = n
    if (d === 0) {
      const k = keyOf(n)
      if (!keys.has(k)) {
        keys.add(k)
        sols.push(n)
      }
    }
  }
  const dfs = (cards: Node[], un: number) => {
    if (st.left-- <= 0 || sols.length >= cap) return
    if (cards.length < 2 && un === 0) return
    const sk = cards.map(keyOf).sort().join('|') + '#' + un
    if (seen.has(sk)) return
    seen.add(sk)
    for (let i = 0; i < cards.length; i++) {
      for (let j = 0; j < cards.length; j++) {
        if (i === j) continue
        const a = cards[i].v, b = cards[j].v
        for (const op of cfg.ops) {
          if ((op === '+' || op === '×') && j < i) continue
          if ((op === '×' && (a === 1 || b === 1)) || (op === '÷' && b === 1) || ((op === '+' || op === '−') && b === 0)) continue
          const r = calc(a, op, b, cfg.noNeg)
          if (r === null || r === 0) continue
          const n: Node = { v: r, op, l: cards[i], r: cards[j] }
          visit(n)
          dfs([...cards.filter((_, k) => k !== i && k !== j), n], un)
          if (sols.length >= cap) return
        }
      }
    }
    if (un > 0) {
      cards.forEach((c, i) => {
        const opts: Node[] = []
        if (Math.abs(c.v) >= 2 && Math.abs(c.v) <= 12) opts.push({ v: c.v * c.v, op: 'sq', l: c })
        const rt = sqrtOf(c.v)
        if (rt !== null && c.v >= 4) opts.push({ v: rt, op: 'sqrt', l: c })
        for (const n of opts) {
          visit(n)
          dfs(cards.map((x, k) => (k === i ? n : x)), un - 1)
        }
      })
    }
  }
  const ls = start.map((v): Node => ({ v }))
  ls.forEach(visit)
  dfs(ls, cfg.unary ? 1 : 0)
  return { sols, best: st.best }
}

// ───────────────────────── Görevler ─────────────────────────

interface ParenOpt { s: string; v: number; ok: boolean; q?: string; mis?: string }
type Task =
  | { kind: 'many'; cards: number[]; target: number; goal: number; sols: Node[] }
  | { kind: 'near'; cards: number[]; target: number; bestDist: number }
  | { kind: 'paren'; tree: Node; opts: ParenOpt[] }

type Plan = { kind: 'many'; goal: number; target?: number[]; four?: boolean; neg?: boolean } | { kind: 'near' } | { kind: 'paren'; tpl: number }

const many = (goal: number, extra: Partial<Extract<Plan, { kind: 'many' }>> = {}): Plan => ({ kind: 'many', goal, ...extra })
const PLANS: Record<number, Plan[]> = {
  3: [many(2), many(2), { kind: 'near' }, many(2), many(3)],
  4: [many(2, { target: [24], four: true }), many(2), { kind: 'near' }, many(3), many(3, { target: [24, 36] })],
  5: [many(2), { kind: 'paren', tpl: 0 }, { kind: 'near' }, { kind: 'paren', tpl: 1 + randInt(0, 1) }, many(3)],
  6: [many(3, { target: [24, 36, 48] }), many(2), { kind: 'near' }, { kind: 'paren', tpl: 1 }, many(3, { target: [36, 48, 60, 72] })],
  7: [many(2), many(2, { neg: true }), { kind: 'near' }, many(3), many(2, { neg: true })],
  8: [many(2), many(2), { kind: 'near' }, many(3), many(2)],
}

/** Hedef üretirken "güzel" işlemler */
function genOk(a: number, op: Op, b: number, cfg: Cfg) {
  switch (op) {
    case '+': return a + b !== 0
    case '−': return cfg.noNeg ? a > b : a !== b
    case '×': return Math.abs(a) > 1 && Math.abs(b) > 1 && Math.abs(a * b) <= 2000
    case '÷': return Math.abs(b) > 1 && a !== 0 && a % b === 0 && a !== b
  }
}

/** Kartların bir kısmıyla rastgele bir işlem zinciri kurup sonucunu döndürür */
function walk(cards: number[], cfg: Cfg): number | null {
  let pool = shuffle(cards).slice(0, randInt(3, Math.min(4, cards.length)))
  let unary = cfg.unary && Math.random() < 0.7
  while (pool.length > 1) {
    let [x, y, ...rest] = shuffle(pool)
    if (unary) {
      const rt = sqrtOf(x)
      if (rt !== null && x >= 4) x = rt
      else if (Math.abs(x) >= 2 && Math.abs(x) <= 12) x = x * x
      unary = false
    }
    const op = shuffle(cfg.ops).find((o) => genOk(x, o, y, cfg))
    if (!op) return null
    pool = [...rest, apply(x, op, y)]
  }
  return pool[0]
}

function makeMany(cfg: Cfg, p: Extract<Plan, { kind: 'many' }>): Task {
  let fallback: Task | null = null
  for (let t = 0; t < 70; t++) {
    const cards = p.four ? distinctInts(4, 1, 9) : cfg.cards()
    const target = p.target ? pick(p.target) : walk(cards, cfg)
    if (target === null || cards.includes(target) || Math.abs(target) < 5) continue
    if (!p.target && (target < cfg.range[0] || target > cfg.range[1])) continue
    if (p.neg && target >= 0) continue
    if (!p.target && target === 24 && cfg.ops.length === 4) continue
    const { sols } = search(cards, cfg, target, p.goal + 6, 30000)
    if (sols.length >= p.goal) return { kind: 'many', cards, target, goal: p.goal, sols }
    if (sols.length && (!fallback || (fallback.kind === 'many' && sols.length > fallback.sols.length))) fallback = { kind: 'many', cards, target, goal: sols.length, sols }
  }
  if (fallback) return fallback
  const cards = [4, 6, 9, 25]
  return { kind: 'many', cards, target: 44, goal: 1, sols: search(cards, cfg, 44, 4, 20000).sols }
}

function makeNear(cfg: Cfg): Task {
  const cards = cfg.cards()
  const lo = Math.max(cfg.range[0], cfg.noNeg ? 20 : cfg.range[0])
  let target = randInt(Math.round((lo + cfg.range[1]) / 2), cfg.range[1])
  for (let i = 0; i < 20 && (cards.includes(target) || target % 10 === 0); i++) target = randInt(lo, cfg.range[1])
  const { best } = search(cards, cfg, target, 1, 80000)
  return { kind: 'near', cards, target, bestDist: best ? Math.abs(best.v - target) : Infinity }
}

const leaf = (v: number): Node => ({ v })
const bin = (l: Node, op: Op, r: Node): Node => ({ v: apply(l.v, op, r.v), op, l, r })

function makeParen(tpl: number): Task {
  const [a, b, c] = distinctInts(3, 2, 9)
  let tree: Node
  let opts: ParenOpt[]
  if (tpl % 3 === 0) {
    tree = bin(bin(leaf(a), '+', leaf(b)), '×', leaf(c))
    opts = [
      { s: `(${a} + ${b}) × ${c}`, v: (a + b) * c, ok: true },
      { s: `${a} + ${b} × ${c}`, v: a + b * c, ok: false, q: `“${a} + ${b} × ${c}” satırında önce hangi işlem yapılır? Ağaçta ise önce ${a} + ${b} hesaplanıyor. Bu satırı hesaplasan kaç bulursun?`, mis: 'İşlem önceliği: parantez olmadan toplamanın çarpmadan önce yapılacağını düşünme' },
      { s: `${a} + (${b} × ${c})`, v: a + b * c, ok: false, q: `Bu satırda parantez önce ${b} × ${c} işlemini yaptırıyor. Ağaçta en altta, yani ilk yapılan işlem hangisi?` },
    ]
  } else if (tpl % 3 === 1) {
    const [x, y] = [Math.max(b, c), Math.min(b, c)]
    tree = bin(leaf(a), '×', bin(leaf(x), '−', leaf(y)))
    opts = [
      { s: `${a} × (${x} − ${y})`, v: a * (x - y), ok: true },
      { s: `${a} × ${x} − ${y}`, v: a * x - y, ok: false, q: `“${a} × ${x} − ${y}” satırında önce ${a} × ${x} yapılır. Ağaçta ise önce hangi iki sayı işleme giriyor? Bunu satırda nasıl gösterebilirsin?`, mis: 'İşlem önceliği: çıkarmanın çarpmadan önce yapılacağını düşünme' },
      { s: `(${a} × ${x}) − ${y}`, v: a * x - y, ok: false, q: `Bu satırdaki parantez önce ${a} × ${x} işlemini yaptırıyor. Ağaçta en altta hangi işlem var?` },
    ]
  } else {
    const big = b + c + randInt(4, 20)
    tree = bin(leaf(big), '−', bin(leaf(b), '+', leaf(c)))
    opts = [
      { s: `${big} − (${b} + ${c})`, v: big - (b + c), ok: true },
      { s: `${big} − ${b} + ${c}`, v: big - b + c, ok: false, q: `“${big} − ${b} + ${c}” satırını soldan sağa hesapla: önce ${big} − ${b}, sonra + ${c}. Ağaçta ise önce hangi iki sayı toplanıyor?`, mis: 'a − b + c ifadesini a − (b + c) sanma (soldan sağa kuralını unutma)' },
      { s: `(${big} − ${b}) + ${c}`, v: big - b + c, ok: false, q: `Bu satırdaki parantez önce ${big} − ${b} işlemini yaptırıyor. Ağaçta ilk yapılan işlem bu mu?` },
    ]
  }
  return { kind: 'paren', tree, opts: shuffle(opts) }
}

function makeTasks(grade: Grade, cfg: Cfg): Task[] {
  return (PLANS[grade] ?? PLANS[4]).map((p) => (p.kind === 'many' ? makeMany(cfg, p) : p.kind === 'near' ? makeNear(cfg) : makeParen(p.tpl)))
}

// ───────────────────────── İşlem ağacı ─────────────────────────

const OP_SYM: Record<Op | Unary, string> = { '+': '+', '−': '−', '×': '×', '÷': '÷', sq: 'x²', sqrt: '√' }

interface Placed { n: Node; x: number; y: number; kids: Placed[] }

function layout(root: Node) {
  let col = 0
  const hgt = (n: Node): number => (n.op ? 1 + Math.max(hgt(n.l!), n.r ? hgt(n.r) : 0) : 0)
  const H = hgt(root)
  const go = (n: Node): Placed => {
    if (!n.op) return { n, x: col++, y: H, kids: [] }
    const kids = [go(n.l!), ...(n.r ? [go(n.r)] : [])]
    return { n, x: (kids[0].x + kids[kids.length - 1].x) / 2, y: H - hgt(n), kids }
  }
  const p = go(root)
  return { p, cols: col, rows: H }
}

function Tree({ node, target, hide = false }: { node: Node; target?: number; hide?: boolean }) {
  const { p, cols, rows } = layout(node)
  const CW = 68, RH = 84, TOP = 52
  const X = (x: number) => 10 + CW / 2 + x * CW
  const Y = (y: number) => TOP + y * RH
  const W = cols * CW + 20
  const Hh = TOP + rows * RH + 26
  const lines: ReactNode[] = []
  const shapes: ReactNode[] = []
  let k = 0
  const draw = (q: Placed, isRoot: boolean) => {
    const cx = X(q.x), cy = Y(q.y)
    if (!q.n.op) {
      const label = num(q.n.v)
      const w = Math.max(46, 18 + label.length * 10)
      shapes.push(
        <g key={k++}>
          <rect x={cx - w / 2} y={cy - 19} width={w} height={38} rx={11} fill="#fff7e6" stroke="#f59e0b" strokeWidth={2.5} />
          <text x={cx} y={cy + 7} textAnchor="middle" fontSize={19} fontWeight={900} fill="#1f2340">{label}</text>
        </g>,
      )
      return
    }
    for (const c of q.kids) {
      const top = c.n.op ? Y(c.y) - 44 : Y(c.y) - 19
      lines.push(<line key={k++} x1={cx} y1={cy + 16} x2={X(c.x)} y2={top} stroke="#94a3b8" strokeWidth={2.5} strokeLinecap="round" />)
      draw(c, false)
    }
    const val = hide ? '?' : num(q.n.v)
    const pw = Math.max(40, 18 + val.length * 9.5)
    const hit = isRoot && target !== undefined && q.n.v === target && !hide
    lines.push(<line key={k++} x1={cx} y1={cy - 16} x2={cx} y2={cy - 22} stroke="#94a3b8" strokeWidth={2.5} />)
    shapes.push(
      <g key={k++}>
        <rect x={cx - pw / 2} y={cy - 46} width={pw} height={26} rx={13} fill={hit ? '#16a34a' : hide ? '#e2e8f0' : '#1f2340'} />
        <text x={cx} y={cy - 27.5} textAnchor="middle" fontSize={15} fontWeight={900} fill={hide ? '#475569' : '#fff'}>{val}</text>
        <circle cx={cx} cy={cy} r={17} fill="#f59e0b" stroke="#fff" strokeWidth={2.5} />
        <text x={cx} y={cy + (q.n.op === 'sq' ? 5 : 7)} textAnchor="middle" fontSize={q.n.op === 'sq' ? 13 : 20} fontWeight={900} fill="#fff">{OP_SYM[q.n.op]}</text>
      </g>,
    )
  }
  draw(p, true)
  return (
    <svg viewBox={`0 0 ${W} ${Hh}`} width={W} className="mx-auto block h-auto max-w-full" role="img" aria-label={`İşlem ağacı: ${exprOf(node).s.replace(/[{}^]/g, '')}`}>
      {lines}
      {shapes}
    </svg>
  )
}

// ───────────────────────── Yakın ol: sayı doğrusu ─────────────────────────

function NearMarks({ target, tries }: { target: number; tries: number[] }) {
  const P = usePlane()
  const y0 = P.sy(0)
  const best = tries.length ? tries.reduce((b, v) => (Math.abs(v - target) < Math.abs(b - target) ? v : b), tries[0]) : null
  const tx = P.sx(target)
  return (
    <g>
      {best !== null && best !== target && (
        <g>
          <line x1={P.sx(best)} x2={tx} y1={y0 - 44} y2={y0 - 44} stroke="#16a34a" strokeWidth={3} />
          <line x1={P.sx(best)} x2={P.sx(best)} y1={y0 - 50} y2={y0 - 38} stroke="#16a34a" strokeWidth={3} />
          <line x1={tx} x2={tx} y1={y0 - 50} y2={y0 - 38} stroke="#16a34a" strokeWidth={3} />
          <text x={(P.sx(best) + tx) / 2} y={y0 - 52} textAnchor="middle" fontSize={14} fontWeight={900} fill="#15803d" stroke="#fff" strokeWidth={3} paintOrder="stroke">{num(Math.abs(best - target))} uzak</text>
        </g>
      )}
      <line x1={tx} x2={tx} y1={y0 - 34} y2={y0 + 8} stroke="#db2777" strokeWidth={3} />
      <path d={`M${tx} ${y0 - 34} l18 6 l-18 6 z`} fill="#db2777" />
      <text x={tx} y={y0 + 46} textAnchor="middle" fontSize={13} fontWeight={900} fill="#db2777">hedef</text>
      {tries.map((v, i) => (
        <g key={i}>
          <circle cx={P.sx(v)} cy={y0} r={v === best ? 9 : 6.5} fill={v === best ? '#16a34a' : '#64748b'} stroke="#fff" strokeWidth={2} />
          {v === best && <text x={P.sx(v)} y={y0 - 14} textAnchor="middle" fontSize={13} fontWeight={900} fill="#15803d" stroke="#fff" strokeWidth={3} paintOrder="stroke">{num(v)}</text>}
        </g>
      ))}
    </g>
  )
}

// ───────────────────────── Oyun ─────────────────────────

interface NudgeSpec { q: string; tone?: 'ok'; mis?: string; tool?: ManipulativeTool; toolConfig?: ManipulativeConfig; k: number }

const insightFor = (grade: Grade) =>
  grade === 3
    ? 'Aynı hedefe farklı kartlarla ve farklı işlemlerle ulaşılabilir. Onlukları önce toplayıp sonra birlerle ayarlamak çoğu zaman en kolay yoldur.'
    : grade === 4
      ? 'Bir sayıyı pek çok şekilde oluşturabilirsin: 24 = 4 × 6 = 3 × 8 = 30 − 6… Hedefin çarpanlarını düşünmek yeni yollar açar.'
      : grade === 5
        ? 'İşlem ağacında en alttaki işlem önce yapılır; tek satırda bunu parantezle gösteririz. (4 + 2) × 5 ile 4 + 2 × 5 aynı değil!'
        : grade === 6
          ? 'Hedefin çarpan çiftlerini bilmek (36 = 4 × 9 = 6 × 6 = 3 × 12) sana pek çok farklı yol açar.'
          : grade === 7
            ? 'Negatif bir sayıyı çıkarmak, onun ters işaretlisini eklemekle aynıdır; iki negatifin çarpımı pozitiftir. Farklı yolların aynı sonucu vermesi bu kuralları gösterir.'
            : 'Kare almak bir sayıyı hızla büyütür, karekök küçültür. Aynı hedefe kare ve karekökle ya da onlarsız giden farklı yollar buldun.'

export default function TargetNumber({ grade, onFinish }: GameProps) {
  const cfg = useRef(configFor(grade)).current
  const [tasks] = useState(() => makeTasks(grade, cfg))
  const age = useAge(grade)
  const dark = age.tier === 'atolye'
  const track = useTracker()
  const sol = useSolutions()
  const [ti, setTi] = useState(0)
  const task = tasks[ti]
  const startCards = (t: Task): Card[] => (t.kind === 'paren' ? [] : t.cards.map((v, i) => ({ id: i, n: { v } })))
  const [cards, setCards] = useState<Card[]>(() => startCards(tasks[0]))
  const [log, setLog] = useState<string[]>([])
  const [hist, setHist] = useState<{ cards: Card[]; log: string[] }[]>([])
  const [sel, setSel] = useState<number | null>(null)
  const [op, setOp] = useState<Op | null>(null)
  const [nudge, setNudge] = useState<NudgeSpec | null>(null)
  const [tip, setTip] = useState<string | null>(null)
  const [shown, setShown] = useState<Node | null>(null)
  const [tries, setTries] = useState<number[]>([])
  const [wrong, setWrong] = useState<number[]>([])
  const [parenDone, setParenDone] = useState(false)
  const [hintLv, setHintLv] = useState(0)
  const [stuck, setStuck] = useState(0)
  const nk = useRef(0)
  const nextId = useRef(100)
  const inferred = useRef(new Set<string>())
  const results = useRef<{ frac: number; sols: number }[]>([])
  const finished = useRef(false)

  const target = task.kind === 'paren' ? undefined : task.target
  const say = (s: Omit<NudgeSpec, 'k'>) => setNudge({ ...s, k: ++nk.current })

  const resetBoard = () => {
    setCards(startCards(task))
    setLog([])
    setHist([])
    setSel(null)
    setOp(null)
  }

  const infer = (n: Node) => {
    const names: string[] = []
    const t = task.kind === 'paren' ? 0 : task.target
    if (n.op === '×' || n.op === '÷') names.push('Çarpanlarla düşünme')
    if ((n.op === '+' || n.op === '−') && n.l && n.r) {
      const small = Math.min(Math.abs(n.l.v), Math.abs(n.r.v))
      const bigNode = Math.abs(n.l.v) >= Math.abs(n.r.v) ? n.l : n.r
      if (bigNode.op && small <= Math.max(9, Math.abs(t) * 0.15)) names.push('Yaklaş ve ayarla')
    }
    if (usesOp(n, ['sq', 'sqrt'])) names.push('Kare/karekök kullanma')
    if (grade === 3 && !usesOp(n, ['−']) && leaves(n).some((x) => x.v % 10 === 0)) names.push('Onlukları önce toplama')
    for (const s of names) {
      if (inferred.current.has(s)) continue
      inferred.current.add(s)
      track.strategy(s)
    }
  }

  const found = (n: Node) => {
    if (task.kind !== 'many') return
    const key = keyOf(n)
    resetBoard()
    if (sol.list.some((s) => s.key === key)) {
      say({ q: hasIdentity(n) ? '1 ile çarpmak ya da 0 eklemek sayıyı değiştirmez. Bu gerçekten yeni bir yol mu? Farklı kartlar ya da farklı işlemler dene.' : 'Bu yolu zaten bulmuştun! Kartların yerini değiştirmek yeni bir yol olmuyor. Farklı kartlar ya da farklı işlemler dene.' })
      return
    }
    sol.add(key, `${exprOf(n).s} = ${num(task.target)}`)
    track.attempt(true)
    infer(n)
    setShown(n)
    const count = sol.list.length + 1
    say({
      tone: 'ok',
      q: count >= task.goal
        ? `Süper! ${count} farklı yol buldun. İstersen daha fazlasını ara ya da sonraki hedefe geç.`
        : count === 1
          ? 'Buldun! Kartlar başa döndü. Şimdi başka bir yol bul: farklı kartlar ya da farklı işlemler dene.'
          : `Bir yol daha! ${task.goal - count} yol daha bulabilir misin?`,
    })
  }

  const mark = (n: Node) => {
    if (task.kind !== 'near') return
    const d = Math.abs(n.v - task.target)
    const prevBest = tries.length ? Math.min(...tries.map((v) => Math.abs(v - task.target))) : Infinity
    setTries([...tries, n.v])
    setShown(n)
    resetBoard()
    track.attempt(d <= task.bestDist)
    if (n.op) infer(n)
    if (d === 0) {
      sfx.ok()
      say({ tone: 'ok', q: 'Tam isabet! Bu kartlarla hedefe tam ulaştın.' })
    } else if (d <= task.bestDist) {
      sfx.ok()
      say({ tone: 'ok', q: `Hedefe ${num(d)} uzaktasın ve bu kartlarla bundan daha yakını yok. Harika tahmin!` })
    } else {
      say({ q: `Hedefe ${num(d)} uzaktasın${d < prevBest && tries.length ? ' — öncekinden daha yakın!' : '.'} Daha yaklaşmak mümkün. Hangi adımı değiştirirsen fark küçülür?` })
    }
  }

  const deadEnd = (n: Node) => {
    if (task.kind !== 'many') return
    const d = task.target - n.v
    setStuck((s) => s + 1)
    track.attempt(false)
    say({
      q: `Tek kart kaldı: ${num(n.v)}. Hedefe ulaşmak için ${num(Math.abs(d))} ${d > 0 ? 'daha gerekiyordu' : 'fazla oldu'}. Hangi kartlar ${num(Math.abs(d))} yapabilirdi? Geri al ve bir adımı değiştir.`,
      tool: grade <= 4 ? 'numberline' : undefined,
      toolConfig: { min: 0, max: 100, step: 1 },
    })
  }

  const commit = (next: Card[], node: Node, id: number, step: string) => {
    setHist([...hist, { cards, log }])
    setCards(next)
    setLog([...log, step])
    setSel(id)
    setOp(null)
    setNudge(null)
    setTip(null)
    if (task.kind === 'many' && node.v === task.target) return found(node)
    if (next.length === 1) {
      if (task.kind === 'near') return mark(node)
      deadEnd(node)
    }
  }

  const checkOp = (a: number, o: Op, b: number): Omit<NudgeSpec, 'k'> | null => {
    if (o === '−' && cfg.noNeg && a - b < 0)
      return { q: `${num(a)} − ${num(b)}: ${num(a)} tane şeyin içinden ${num(b)} tane alabilir misin? Hangi sırayla çıkarırsan sonuç sıfırın altına inmez?`, mis: 'Çıkarmada sıranın önemsiz olduğunu düşünme (küçükten büyüğü çıkarma)', tool: 'numberline', toolConfig: { min: 0, max: 100, step: 1 } }
    if (o === '÷') {
      if (b === 0) return { q: 'Bir şeyi 0 gruba paylaştırabilir miyiz? Sıfıra bölme tanımsızdır; başka bir kart seç.' }
      if (a % b !== 0)
        return { q: `${num(a)} ÷ ${numR(b)}: ${num(Math.abs(a))} nesneyi ${num(Math.abs(b))} eşit gruba paylaştırınca artan kalır mı? Burada yalnızca kalansız bölme var. Hangi kart bu sayıya tam bölünür?`, tool: 'dizilim' }
    }
    if (Math.abs(apply(a, o, b)) > 1_000_000) return { q: 'Bu çok büyük bir sayı oldu! Hedefe yaklaşmak için daha küçük adımlar dener misin?' }
    return null
  }

  const tapCard = (c: Card) => {
    if (task.kind === 'paren') return
    setTip(null)
    if (sel === null || op === null) {
      setSel(sel === c.id ? null : c.id)
      return
    }
    if (sel === c.id) {
      setTip('Bir kart kendisiyle birleşemez; ikinci bir kart seç.')
      return
    }
    const a = cards.find((x) => x.id === sel)
    if (!a) return
    const err = checkOp(a.n.v, op, c.n.v)
    if (err) {
      setOp(null)
      if (err.mis) track.attempt(false)
      say(err)
      return
    }
    const r = apply(a.n.v, op, c.n.v)
    const node: Node = { v: r, op, l: a.n, r: c.n }
    const id = nextId.current++
    commit(cards.filter((x) => x.id !== a.id).map((x) => (x.id === c.id ? { id, n: node } : x)), node, id, `${num(a.n.v)} ${op} ${numR(c.n.v)} = ${num(r)}`)
  }

  const tapOp = (o: Op | Unary) => {
    const a = cards.find((x) => x.id === sel)
    if (!a) {
      setTip('Önce bir sayı kartı seç.')
      return
    }
    if (o === 'sq' || o === 'sqrt') {
      const v = a.n.v
      let r: number | null = null
      if (o === 'sq') {
        if (Math.abs(v) > 1000) return say({ q: 'Bu sayının karesi çok büyük olur! Daha küçük bir sayının karesini almayı düşün.' })
        r = v * v
      } else {
        r = sqrtOf(v)
        if (r === null)
          return say(v < 0
            ? { q: 'Hangi sayının karesi negatif olabilir? Negatif bir sayının karekökü gerçek sayı değildir.', mis: 'Negatif sayının karekökünü alma' }
            : { q: `${num(v)} bir tam kare mi? Hangi sayıyı kendisiyle çarpınca ${num(v)} bulunur? Tam kareler: 1, 4, 9, 16, 25, 36…` })
      }
      const node: Node = { v: r, op: o, l: a.n }
      const id = nextId.current++
      commit(cards.map((x) => (x.id === a.id ? { id, n: node } : x)), node, id, o === 'sq' ? `${numR(v)}^{2} = ${num(r)}` : `√{${num(v)}} = ${num(r)}`)
      return
    }
    setTip(null)
    setOp(op === o ? null : o)
  }

  const undo = () => {
    const last = hist[hist.length - 1]
    if (!last) return
    setCards(last.cards)
    setLog(last.log)
    setHist(hist.slice(0, -1))
    setSel(null)
    setOp(null)
    setNudge(null)
  }

  const hint = () => {
    if (task.kind !== 'many') return
    track.hint()
    const lv = hintLv + 1
    setHintLv(lv)
    const fresh = task.sols.find((s) => !sol.list.some((x) => x.key === keyOf(s))) ?? task.sols[0]
    if (!fresh) return
    if (lv === 1) {
      // en alttaki ilk işlem
      let n = fresh
      while (n.op && ((n.l && n.l.op) || (n.r && n.r.op))) n = n.l?.op ? n.l : n.r!
      const ls = leaves(n)
      say({ q: ls.length >= 2 ? `Şu iki kartla başlamayı düşündün mü: ${num(ls[0].v)} ve ${num(ls[1].v)}? Onlarla hangi işlemi yapabilirsin?` : `${num(ls[0].v)} kartıyla ne yapabilirsin?` })
    } else {
      const o = fresh.op as Op | Unary
      const side = fresh.r && !fresh.r.op ? `? ${OP_SYM[o]} ${numR(fresh.r.v)}` : fresh.l && !fresh.l.op && fresh.r ? `${num(fresh.l.v)} ${OP_SYM[o]} ?` : `? ${OP_SYM[o]} ?`
      say({ q: `Son adım şöyle olabilir mi: ${side} = ${num(task.target)}? Soru işaretine hangi sayı gelmeli, onu kartlardan nasıl yaparsın?` })
    }
  }

  const pickParen = (i: number) => {
    if (task.kind !== 'paren' || parenDone || wrong.includes(i)) return
    const o = task.opts[i]
    track.attempt(o.ok)
    if (o.ok) {
      sfx.ok()
      setParenDone(true)
      say({ tone: 'ok', q: 'Evet! Ağaçta en alttaki işlem önce yapılır; tek satırda bunu parantezle gösteririz. Aşağıda üç satırın sonuçlarını karşılaştır: parantezin yeri neyi değiştirdi?' })
      return
    }
    setWrong([...wrong, i])
    say({ q: o.q ?? 'Ağaçta önce hangi işlem yapılıyor?', mis: o.mis })
  }

  const finishTask = () => {
    let frac = 0
    let first = false
    if (task.kind === 'many') {
      frac = Math.min(sol.list.length, task.goal) / task.goal
      first = sol.list.length > 0 && stuck === 0 && hintLv === 0
    } else if (task.kind === 'near') {
      const d = tries.length ? Math.min(...tries.map((v) => Math.abs(v - task.target))) : Infinity
      frac = d <= task.bestDist ? 1 : d - task.bestDist <= Math.max(2, Math.abs(task.target) * 0.05) ? 0.75 : tries.length ? 0.5 : 0
      first = tries.length > 0 && Math.abs(tries[0] - task.target) <= task.bestDist
    } else {
      frac = parenDone ? (wrong.length ? 0.7 : 1) : 0
      first = parenDone && wrong.length === 0
    }
    track.item(first)
    results.current.push({ frac, sols: task.kind === 'many' ? sol.list.length : 0 })
    if (ti + 1 >= tasks.length) {
      if (finished.current) return
      finished.current = true
      const total = results.current.reduce((s, r) => s + r.sols, 0)
      const ratio = results.current.reduce((s, r) => s + r.frac, 0) / tasks.length
      const nMany = tasks.filter((t) => t.kind === 'many').length
      onFinish({
        stars: starsFor(ratio),
        score: Math.round(ratio * 100) + total * 5,
        summary: `${nMany} hedefte toplam ${total} farklı yol buldun.`,
        insight: insightFor(grade),
      })
      return
    }
    const nt = tasks[ti + 1]
    setTi(ti + 1)
    setCards(startCards(nt))
    setLog([])
    setHist([])
    setSel(null)
    setOp(null)
    setNudge(null)
    setTip(null)
    setShown(null)
    setTries([])
    setWrong([])
    setParenDone(false)
    setHintLv(0)
    setStuck(0)
    sol.reset()
    inferred.current = new Set()
  }

  // ───── Görünüm ─────
  const selCard = cards.find((c) => c.id === sel)
  const ops: (Op | Unary)[] = [...cfg.ops, ...(cfg.unary ? (['sq', 'sqrt'] as Unary[]) : [])]
  const last = tasks.length - 1 === ti
  const panel = dark ? 'bg-slate-800/80 ring-1 ring-slate-600' : 'bg-white/90 ring-1 ring-line'
  const soft = dark ? 'text-slate-300' : 'text-ink-soft'
  const nearBest = task.kind === 'near' && tries.length ? tries.reduce((b, v) => (Math.abs(v - task.target) < Math.abs(b - task.target) ? v : b), tries[0]) : null
  const liveTree = selCard?.n.op ? selCard.n : null
  const treeNode = liveTree ?? shown
  const strategyOpts = task.kind === 'near'
    ? ['Önce hedefe yakın büyük bir sayı yaptım', 'Sayıları yuvarlayıp tahmin ettim', 'Geriye doğru çalıştım (hedeften başladım)', 'Deneme-yanılma ile denedim']
    : [
        'Hedefe yakın bir sayı yapıp ayarladım',
        grade === 3 ? 'Önce onlukları topladım' : 'Hedefin çarpanlarını düşündüm',
        'Geriye doğru çalıştım (hedeften başladım)',
        'Deneme-yanılma ile denedim',
      ]

  const taskText: ReactNode =
    task.kind === 'many' ? (
      <>Kartları birleştirerek <span className="text-amber-500">{num(task.target)}</span> sayısına ulaş. En az <b>{task.goal}</b> farklı yol bul!</>
    ) : task.kind === 'near' ? (
      <>Bu kartlarla <span className="text-amber-500">{num(task.target)}</span> sayısına tam ulaşmak zor olabilir. Hedefe ne kadar <b>yaklaşabilirsin</b>?</>
    ) : (
      <>Bu işlem ağacını tek satırda nasıl yazarsın? Ağaçla <b>aynı işi yapan</b> satırı seç.</>
    )

  // Telefonda "Modelle dene" düğmesi metnin altına insin (metin sıkışmasın)
  const nudgeEl = nudge && (
    <div className="max-sm:[&>div>p]:min-w-[60%]">
      <Nudge key={nudge.k} question={nudge.q} tone={nudge.tone} misconception={nudge.mis} tool={nudge.tool} toolConfig={nudge.toolConfig} onClose={() => setNudge(null)} />
    </div>
  )

  const nextBtn = (label: string, primary = true) => (
    <button type="button" onClick={finishTask} className={`${primary ? 'btn-primary' : 'btn-ghost'} mt-3 min-h-12 w-full`}>
      {last ? <>Sonuçları gör<Flag size={18} /></> : <>{label}<ArrowRight size={18} /></>}
    </button>
  )

  return (
    <Scene grade={grade} className="animate-fade-up">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <LevelDots current={ti} total={tasks.length} />
        {task.kind === 'many' && (
          <span className={`chip px-3 py-1.5 text-sm ring-1 ${sol.list.length >= task.goal ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-amber-200'}`}>
            🎯 {sol.list.length}/{task.goal} yol
          </span>
        )}
        {task.kind === 'near' && nearBest !== null && (
          <span className="chip bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800 ring-1 ring-emerald-200">En yakın: {num(nearBest)} ({num(Math.abs(nearBest - task.target))} uzak)</span>
        )}
      </div>

      <TaskCard step={ti + 1} total={tasks.length} tone={dark ? 'dark' : 'brand'}>{taskText}</TaskCard>

      <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-4">
        {/* Sol: çalışma alanı */}
        <div className="min-w-0">
          {task.kind === 'paren' ? (
            <>
              <div className="rounded-3xl bg-white p-4 text-ink ring-1 ring-line">
                <p className="mb-1 text-center text-xs font-extrabold tracking-wide text-ink-soft uppercase">İşlem ağacı · en alttaki işlem önce yapılır</p>
                <Tree node={task.tree} hide={!parenDone} />
              </div>
              <div className="mt-3 grid gap-2">
                {task.opts.map((o, i) => {
                  const isWrong = wrong.includes(i)
                  const good = parenDone && o.ok
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => pickParen(i)}
                      disabled={parenDone || isWrong}
                      className={`flex min-h-14 items-center justify-between gap-2 rounded-2xl px-4 text-xl font-black text-ink ring-2 transition active:scale-[0.99] ${good ? 'bg-ok-soft ring-ok' : isWrong ? 'bg-amber-50 ring-amber-200' : 'bg-white ring-line hover:ring-amber-300'}`}
                    >
                      <MathText text={o.s} />
                      {(parenDone || isWrong) && <span className={`text-base font-extrabold ${good ? 'text-green-700' : 'text-ink-soft'}`}>= {num(o.v)}</span>}
                    </button>
                  )
                })}
              </div>
              {nudgeEl}
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-center gap-3 rounded-2xl bg-ink px-4 py-2.5 text-white ring-1 ring-white/10">
                <span className="text-xs font-extrabold tracking-wide text-white/70 uppercase">{task.kind === 'near' ? 'Yaklaş' : 'Hedef'}</span>
                <span className="text-4xl font-black tabular-nums sm:text-5xl">{num(task.target)}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {cards.map((c) => {
                  const label = num(c.n.v)
                  const on = c.id === sel
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => tapCard(c)}
                      aria-pressed={on}
                      className={`h-16 rounded-2xl font-black tabular-nums shadow-[0_3px_0_#e7e8f2] ring-2 transition animate-pop ${label.length > 7 ? 'text-base' : label.length > 4 ? 'text-xl' : 'text-3xl'} ${on ? '-translate-y-1 bg-amber-100 text-amber-900 ring-amber-400' : c.n.op ? 'bg-sky-50 text-ink ring-sky-200 hover:ring-amber-300' : 'bg-white text-ink ring-line hover:ring-amber-300'}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {ops.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => tapOp(o)}
                    aria-label={{ '+': 'Topla', '−': 'Çıkar', '×': 'Çarp', '÷': 'Böl', sq: 'Karesini al', sqrt: 'Karekökünü al' }[o]}
                    aria-pressed={op === o}
                    className={`grid place-items-center rounded-2xl text-2xl ${ops.length > 4 ? 'size-12 sm:size-14' : 'size-14'} font-black ring-2 transition active:scale-95 ${op === o ? 'bg-brand text-white ring-brand' : 'bg-white text-ink ring-line'} ${!selCard ? 'opacity-60' : ''}`}
                  >
                    {o === 'sq' ? <span>x<sup className="text-sm">2</sup></span> : o === 'sqrt' ? '√' : o}
                  </button>
                ))}
              </div>

              <p className={`mt-2 min-h-6 text-center text-sm font-bold ${soft}`} aria-live="polite">
                {tip ?? (!selCard ? 'Bir sayı kartı seç.' : op ? `${num(selCard.n.v)} ${op} ? — şimdi ikinci kartı seç.` : `${num(selCard.n.v)} seçili — bir işlem seç.`)}
              </p>

              {log.length > 0 && (
                <ol className="mx-auto mt-1 flex max-w-lg flex-wrap justify-center gap-1.5">
                  {log.map((s, i) => (
                    <li key={i} className="chip bg-white px-3 py-1 text-base text-ink tabular-nums ring-1 ring-line"><MathText text={s} /></li>
                  ))}
                </ol>
              )}

              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={undo} disabled={!hist.length} className="btn-ghost min-h-12 px-4 text-sm"><Undo2 size={18} />Geri al</button>
                <button type="button" onClick={() => { resetBoard(); setNudge(null) }} disabled={!hist.length} className="btn-ghost min-h-12 px-4 text-sm"><RotateCcw size={18} />Baştan</button>
                {task.kind === 'many' && (
                  <button type="button" onClick={hint} className="btn-ghost min-h-12 px-4 text-sm"><Lightbulb size={18} />İpucu</button>
                )}
                {task.kind === 'near' && (
                  <button type="button" onClick={() => { const c = selCard ?? cards.reduce((b, x) => (Math.abs(x.n.v - task.target) < Math.abs(b.n.v - task.target) ? x : b), cards[0]); mark(c.n) }} className="btn-primary min-h-12 px-4 text-sm">
                    <Flag size={18} />Sonucumu işaretle
                  </button>
                )}
              </div>

              {nudgeEl}

              {task.kind === 'near' && (
                <div className="mt-3 text-ink">
                  <Plane
                    key={`${ti}-${tries.length}`}
                    mode="x"
                    initial={(() => {
                      const far = Math.max(10, ...tries.map((v) => Math.abs(v - task.target) * 1.25), Math.round(Math.abs(task.target) * 0.25))
                      return { xMin: task.target - far, xMax: task.target + far, yMin: -1, yMax: 1 }
                    })()}
                    label="Hedef ve sonuçların sayı doğrusu"
                  >
                    <NearMarks target={task.target} tries={tries} />
                  </Plane>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sağ: ağaç, bulunan yollar, strateji */}
        <div className="mt-4 min-w-0 lg:mt-0">
          {task.kind !== 'paren' && (
            <div className={`rounded-3xl p-3 ${panel}`}>
              <p className={`mb-1 text-xs font-extrabold tracking-wide uppercase ${soft}`}>{liveTree ? 'Seçili kartın işlem ağacı' : shown ? (task.kind === 'near' ? 'Son sonucunun ağacı' : 'Son bulduğun yolun ağacı') : 'İşlem ağacı'}</p>
              {treeNode ? (
                <div className="rounded-2xl bg-white p-2 text-ink">
                  <Tree node={treeNode} target={target} />
                  <p className="mt-1 text-center text-lg font-black tabular-nums"><MathText text={`${exprOf(treeNode).s} = ${num(treeNode.v)}`} /></p>
                  {grade >= 5 && exprOf(treeNode).s.includes('(') && (
                    <p className="mt-1 text-center text-xs font-bold text-ink-soft">Ağaçta aşağıdaki işlem önce yapılır; tek satırda bunu parantez gösterir.</p>
                  )}
                </div>
              ) : (
                <p className={`py-6 text-center text-sm font-bold ${soft}`}>Kartları birleştirdikçe işlem ağacın burada büyür. 🌳</p>
              )}
            </div>
          )}

          {task.kind === 'many' && <div className="text-ink"><SolutionList list={sol.list} goal={task.goal} /></div>}

          {task.kind === 'near' && nearBest !== null && (
            <p className={`mt-3 rounded-2xl p-3 text-sm font-extrabold ${Math.abs(nearBest - task.target) <= task.bestDist ? 'bg-ok-soft text-green-900' : 'bg-sky-50 text-sky-900'}`}>
              {Math.abs(nearBest - task.target) <= task.bestDist ? 'Bu kartlarla bundan daha yakını yok — en iyi sonucu buldun!' : 'Daha yakın bir sonuç mümkün. Bir daha dener misin?'}
            </p>
          )}

          {task.kind === 'paren' && parenDone && (
            <div className={`rounded-3xl p-3 text-sm font-bold ${panel}`}>
              <p className="mb-1 font-black">Düşün:</p>
              <p className={soft}>Hangi satırlarda parantez olmasa da sonuç aynı kalırdı? Neden?</p>
            </div>
          )}

          {((task.kind === 'many' && sol.list.length > 0) || (task.kind === 'near' && tries.length > 0)) && (
            <StrategyPicker key={ti} options={strategyOpts} onPick={() => {}} />
          )}

          {task.kind === 'many' && sol.list.length > 0 && nextBtn('Sonraki hedef')}
          {task.kind === 'many' && sol.list.length === 0 && (stuck >= 2 || hintLv >= 2) && nextBtn('Bu hedefi şimdilik geç', false)}
          {task.kind === 'near' && tries.length > 0 && nextBtn('Sonraki görev')}
          {task.kind === 'paren' && parenDone && nextBtn('Sonraki görev')}
        </div>
      </div>
    </Scene>
  )
}
