import { useEffect, useReducer, useRef, useState } from 'react'
import { ArrowRight, RotateCcw, Undo2 } from 'lucide-react'
import type { Grade } from '../data/types'
import { pick, randInt } from '../lib/random'
import { sfx } from '../lib/feedback'
import { fmt } from '../lib/format'
import { Hud, Toast, starsFor, useFrame, type GameProps } from './kit'

interface Level {
  max: number
  cards: number[]
  /** Hedef üretirken rastgele yürüyüşte kartların ağırlığı */
  walk: number[]
  /** Başlangıç aralığı (unit cinsinden) */
  start: [number, number]
  unit: number
  /** Ekranda gösterilecek en dar pencere */
  minSpan: number
  insight: string
}

const LEVELS: Record<1 | 2 | 3 | 4, Level> = {
  1: {
    max: 20, cards: [1, 2, 5, -1], walk: [5, 5, 2, 2, 1, -1], start: [0, 8], unit: 1, minSpan: 20,
    insight: '5’er zıplamak, 1’er zıplamaktan çok daha hızlı! Önce büyük zıplamalarla yaklaşıp sonra küçüklerle düzeltmek en kısa yolu bulmanı sağlar.',
  },
  2: {
    max: 100, cards: [10, 5, 1, -1], walk: [10, 10, 10, 5, 1, -1, -1], start: [3, 60], unit: 1, minSpan: 30,
    insight: '10’ar zıplarken birler basamağı hiç değişmez, yalnızca onlar basamağı artar. Bazen hedefi biraz geçip −1 ile geri dönmek daha kısa bir yoldur!',
  },
  3: {
    max: 1000, cards: [100, 10, -10, 1], walk: [100, 100, 10, 10, -10, 1], start: [20, 650], unit: 1, minSpan: 300,
    insight: '100’er zıplarken yalnızca yüzler, 10’ar zıplarken yalnızca onlar basamağı değişir. Basamaklara bakarak kaç zıplama gerektiğini önceden söyleyebilir misin?',
  },
  4: {
    max: 10000, cards: [1000, 100, -100, 10], walk: [1000, 1000, 100, 100, -100, 10], start: [50, 650], unit: 10, minSpan: 3000,
    insight: '1000’er zıplarken yalnızca binler basamağı değişir. Hedefle başlangıcın basamaklarını karşılaştırınca en kısa yolu hesaplayabilirsin!',
  },
}

const ROUNDS = 6
const MAX_JUMPS = 20
const HOP = 0.42
const H = 172
const LINE_Y = 126
const M = 26
const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]
/** Turlara göre en kısa yolun uzunluğu */
const DIFFICULTY: [number, number][] = [[2, 3], [2, 3], [3, 4], [3, 4], [3, 5], [4, 5]]

interface Round { start: number; target: number; best: number[] }
interface Hop { to: number; idx: number; back?: boolean }
interface Msg { text: string; tone: 'ok' | 'bad' | 'info'; key: number }

const levelOf = (g: Grade) => Math.min(4, Math.max(1, g)) as 1 | 2 | 3 | 4

/** BFS ile sınırlar içinde en az zıplamalı yol (kart listesi) */
function shortest(from: number, to: number, lv: Level): number[] | null {
  if (from === to) return []
  const prev = new Int32Array(lv.max + 1).fill(-1)
  const via = new Int32Array(lv.max + 1)
  prev[from] = from
  const q = [from]
  for (let h = 0; h < q.length; h++) {
    const p = q[h]
    for (const c of lv.cards) {
      const n = p + c
      if (n < 0 || n > lv.max || prev[n] !== -1) continue
      prev[n] = p
      via[n] = c
      if (n === to) {
        const out: number[] = []
        for (let v = to; v !== from; v = prev[v]) out.unshift(via[v])
        return out
      }
      q.push(n)
    }
  }
  return null
}

function makeRounds(lv: Level): Round[] {
  const out: Round[] = []
  for (const [lo, hi] of DIFFICULTY) {
    let found: Round | null = null
    for (let i = 0; i < 400; i++) {
      const start = randInt(lv.start[0], lv.start[1]) * lv.unit
      let pos = start
      const k = randInt(lo, hi + 1)
      for (let j = 0; j < k; j++) {
        const c = pick(lv.walk)
        if (pos + c >= 0 && pos + c <= lv.max) pos += c
      }
      if (pos === start || out.some((o) => o.target === pos)) continue
      const best = shortest(start, pos, lv)
      if (!best) continue
      found = { start, target: pos, best }
      if (best.length >= lo && best.length <= hi) break
    }
    out.push(found ?? { start: 0, target: lv.cards[0] * 2, best: [lv.cards[0], lv.cards[0]] })
  }
  return out
}

const term = (c: number) => `${c > 0 ? '+' : '−'} ${fmt(Math.abs(c))}`
const expr = (start: number, jumps: number[]) => [fmt(start), ...jumps.map(term)].join(' ')
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
const hopHeight = (dx: number) => Math.min(58, Math.max(16, 12 + Math.abs(dx) * 0.35))

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(340)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

function Pad({ x, r, fill = '#4ade80' }: { x: number; r: number; fill?: string }) {
  const k = 0.36
  const a = (12 * Math.PI) / 180
  const p = (s: number) => `${r * Math.cos(s * a)} ${k * r * Math.sin(s * a)}`
  return (
    <g transform={`translate(${x} ${LINE_Y + 2})`}>
      <path d={`M0 0 L${p(1)} A${r} ${k * r} 0 1 1 ${p(-1)} Z`} fill={fill} stroke="#15803d" strokeWidth={1.2} strokeLinejoin="round" />
    </g>
  )
}

function Frog({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={-13} cy={-3} rx={7} ry={3.5} fill="#16a34a" />
      <ellipse cx={13} cy={-3} rx={7} ry={3.5} fill="#16a34a" />
      <ellipse cx={0} cy={-12} rx={15} ry={11} fill="#22c55e" stroke="#15803d" strokeWidth={1.5} />
      <ellipse cx={0} cy={-8} rx={8} ry={5} fill="#bbf7d0" />
      <circle cx={-7} cy={-23} r={5.5} fill="#fff" stroke="#15803d" strokeWidth={1.5} />
      <circle cx={7} cy={-23} r={5.5} fill="#fff" stroke="#15803d" strokeWidth={1.5} />
      <circle cx={-6} cy={-23} r={2.4} fill="#1f2340" />
      <circle cx={8} cy={-23} r={2.4} fill="#1f2340" />
      <path d="M-6 -13 Q0 -8 6 -13" stroke="#14532d" strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </g>
  )
}

export default function FrogJump({ grade, onFinish }: GameProps) {
  const lv = LEVELS[levelOf(grade)]
  const [rounds] = useState(() => makeRounds(lv))
  const [s] = useState(() => ({
    round: 0,
    path: [rounds[0].start],
    frog: rounds[0].start,
    queue: [] as Hop[],
    hop: null as (Hop & { from: number; t: number }) | null,
    landed: 0,
    won: false,
    cheered: false,
    score: 0,
    perfect: 0,
    used: 0,
    view: null as [number, number] | null,
    msg: null as Msg | null,
    bad: null as { i: number; key: number } | null,
    over: false,
  }))
  const [, render] = useReducer((x: number) => x + 1, 0)
  const [box, W] = useWidth<HTMLDivElement>()
  const r = rounds[s.round]

  /** Kurbağa, hedef ve yol görünecek şekilde pencere */
  const wanted = (): [number, number] => {
    const vals = [r.start, r.target, s.frog, ...s.path]
    let lo = Math.min(...vals)
    let hi = Math.max(...vals)
    const pad = Math.max((hi - lo) * 0.15, lv.minSpan * 0.1)
    lo -= pad
    hi += pad
    if (hi - lo < lv.minSpan) {
      const c = (lo + hi) / 2
      lo = c - lv.minSpan / 2
      hi = c + lv.minSpan / 2
    }
    if (lo < 0) { hi -= lo; lo = 0 }
    if (hi > lv.max) { lo -= hi - lv.max; hi = lv.max }
    return [Math.max(0, lo), hi]
  }
  if (!s.view) s.view = wanted()

  useFrame((dt) => {
    if (s.over || !s.view) return
    let dirty = false
    if (!s.hop && s.queue.length) s.hop = { ...s.queue.shift()!, from: s.frog, t: 0 }
    if (s.hop) {
      const h = s.hop
      h.t = Math.min(1, h.t + dt / (s.queue.length ? HOP * 0.6 : HOP))
      s.frog = h.from + (h.to - h.from) * ease(h.t)
      if (h.t >= 1) {
        s.frog = h.to
        s.landed = h.idx
        s.hop = null
        if (s.won && !s.cheered && !s.queue.length) {
          s.cheered = true
          sfx.ok()
        }
      }
      dirty = true
    }
    const [wl, wh] = wanted()
    const [vl, vh] = s.view!
    if (Math.abs(wl - vl) + Math.abs(wh - vh) > (vh - vl) * 0.002) {
      const k = Math.min(1, dt * 5)
      s.view = [vl + (wl - vl) * k, vh + (wh - vh) * k]
      dirty = true
    }
    if (dirty) render()
  }, true)

  const say = (text: string, tone: Msg['tone']) => (s.msg = { text, tone, key: Date.now() })

  const jump = (i: number) => {
    if (s.won || s.over) return
    const c = lv.cards[i]
    const cur = s.path[s.path.length - 1]
    const n = cur + c
    if (n < 0 || n > lv.max || s.path.length > MAX_JUMPS) {
      sfx.bad()
      s.bad = { i, key: Date.now() }
      say(
        s.path.length > MAX_JUMPS ? 'Kurbağa yoruldu! Geri al ya da baştan başla.'
          : n < 0 ? 'Sayı doğrusu 0’dan başlıyor; kurbağa daha geriye gidemez!'
          : `Nehir ${fmt(lv.max)}’de bitiyor; daha ileri zıplayamazsın!`,
        'bad',
      )
      render()
      return
    }
    s.path.push(n)
    s.queue.push({ to: n, idx: s.path.length - 1 })
    s.msg = null
    if (n === r.target) {
      const used = s.path.length - 1
      const perfect = used <= r.best.length
      s.won = true
      s.used += used
      s.score += 10 + (perfect ? 5 : 0)
      if (perfect) s.perfect++
    } else if ((c > 0 && n > r.target && cur < r.target) || (c < 0 && n < r.target && cur > r.target)) {
      say(`Hedefi geçtin! ${fmt(n)}, ${fmt(r.target)} sayısından ${n > r.target ? 'büyük' : 'küçük'}.`, 'info')
    }
    render()
  }

  const undo = () => {
    if (s.won || s.path.length < 2) return
    s.path.pop()
    const last = s.queue[s.queue.length - 1]
    if (last && !last.back && last.idx === s.path.length) s.queue.pop()
    else s.queue.push({ to: s.path[s.path.length - 1], idx: s.path.length - 1, back: true })
    s.landed = Math.min(s.landed, s.path.length - 1)
    s.msg = null
    render()
  }

  const restart = () => {
    if (s.won || s.path.length < 2) return
    s.path = [r.start]
    s.queue = [{ to: r.start, idx: 0, back: true }]
    s.landed = 0
    s.msg = null
    render()
  }

  const finish = () => {
    if (s.over) return
    s.over = true
    onFinish({
      stars: starsFor(s.score / (ROUNDS * 15)),
      score: s.score,
      summary: `${ROUNDS} yaprağın ${s.perfect} tanesine en az zıplamayla ulaştın (toplam ${s.used} zıplama).`,
      insight: lv.insight,
    })
  }

  const next = () => {
    if (s.round + 1 >= ROUNDS) return finish()
    s.round++
    const nr = rounds[s.round]
    Object.assign(s, { path: [nr.start], frog: nr.start, queue: [], hop: null, landed: 0, won: false, cheered: false, msg: null, bad: null, view: null })
    render()
  }

  // Çizim
  const [lo, hi] = s.view
  const span = Math.max(1e-6, hi - lo)
  const inner = W - 2 * M
  const X = (v: number) => M + ((v - lo) / span) * inner
  const minor = STEPS.find((st) => st >= lv.unit && span / st <= inner / 12) ?? 5000
  const major = STEPS.find((st) => st >= minor && span / st <= inner / 64) ?? 5000
  const ticks: number[] = []
  for (let v = Math.ceil(lo / minor) * minor; v <= hi + 1e-9; v += minor) ticks.push(v)
  const tx = X(r.target)
  const shown = Math.min(s.landed, s.path.length - 1)
  const arcs = s.path.slice(0, shown).map((a, i) => ({ a, b: s.path[i + 1] }))
  const pads = [...new Set(s.path.slice(0, shown + 1))].filter((v) => v !== r.target)
  const frogY = LINE_Y - 2 - (s.hop ? Math.sin(Math.PI * s.hop.t) * hopHeight(X(s.hop.to) - X(s.hop.from)) : 0)
  const cur = s.path[s.path.length - 1]
  const jumps = s.path.slice(1).map((v, i) => v - s.path[i])
  const arrived = s.won && !s.hop && s.queue.length === 0
  const used = s.path.length - 1
  const perfect = used <= r.best.length
  const pillW = 14 + fmt(r.target).length * 8.5

  return (
    <div className="animate-fade-up">
      <Hud round={s.round + 1} rounds={ROUNDS} score={s.score} extra={<span className="chip bg-green-50 px-3 py-1.5 text-sm text-green-800 ring-1 ring-green-200">🐸 {used} zıplama</span>} />

      <div className="mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        <p className="text-lg font-black sm:text-xl">Hedef yaprak: <span className="rounded-xl bg-pink-600 px-2.5 py-0.5 text-white">{fmt(r.target)}</span></p>
        <p className="text-sm font-extrabold text-ink-soft">En az {r.best.length} zıplamada ulaşabilir misin?</p>
      </div>

      <div ref={box} className="relative overflow-hidden rounded-3xl ring-1 ring-sky-200 select-none">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="img" aria-label={`Kurbağa ${fmt(cur)} üzerinde, hedef ${fmt(r.target)}`}>
          <defs>
            <linearGradient id="frog-river" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e0f2fe" />
              <stop offset="1" stopColor="#7dd3fc" />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill="url(#frog-river)" />
          {[34, 70, 156].map((y, i) => (
            <path key={y} d={`M${-20 + i * 30} ${y} q20 -6 40 0 t40 0 M${W * 0.55 + i * 20} ${y + 10} q20 -6 40 0 t40 0`} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} fill="none" />
          ))}
          <line x1={lo > 0 ? 0 : X(0)} y1={LINE_Y} x2={hi < lv.max ? W : X(lv.max)} y2={LINE_Y} stroke="#1f2340" strokeWidth={2.5} />
          {ticks.map((v) => {
            const isMajor = Math.abs(v / major - Math.round(v / major)) < 1e-9
            const x = X(v)
            return (
              <g key={v}>
                <line x1={x} y1={LINE_Y - (isMajor ? 7 : 4)} x2={x} y2={LINE_Y + (isMajor ? 7 : 4)} stroke="#1f2340" strokeWidth={isMajor ? 2 : 1} />
                {isMajor && Math.abs(x - tx) > pillW / 2 + 16 && (
                  <text x={x} y={LINE_Y + 26} textAnchor="middle" fontSize={12} fontWeight={800} fill="#5b6080">{fmt(v)}</text>
                )}
              </g>
            )
          })}
          <Pad x={tx} r={21} fill="#86efac" />
          <g transform={`translate(${tx - 7} ${LINE_Y - 2})`}>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx={0} cy={-4} rx={3} ry={5} fill="#f472b6" transform={`rotate(${a}) translate(0 -1)`} />
            ))}
            <circle r={2.6} fill="#facc15" />
          </g>
          <rect x={tx - pillW / 2} y={LINE_Y + 12} width={pillW} height={22} rx={11} fill="#db2777" />
          <text x={tx} y={LINE_Y + 28} textAnchor="middle" fontSize={14} fontWeight={900} fill="#fff">{fmt(r.target)}</text>
          {pads.map((v) => <Pad key={v} x={X(v)} r={13} />)}
          {arcs.map(({ a, b }, i) => {
            const x1 = X(a), x2 = X(b)
            const h = hopHeight(x2 - x1)
            const y = LINE_Y - 4
            const c = b - a
            return (
              <g key={i}>
                <path d={`M${x1} ${y} Q${(x1 + x2) / 2} ${y - 2 * h} ${x2} ${y}`} fill="none" stroke={c > 0 ? '#15803d' : '#ea580c'} strokeWidth={2} strokeDasharray="5 4" />
                <text x={(x1 + x2) / 2} y={y - h - 4} textAnchor="middle" fontSize={12} fontWeight={900} fill={c > 0 ? '#15803d' : '#ea580c'} stroke="#fff" strokeWidth={3} paintOrder="stroke">{term(c).replace(' ', '')}</text>
              </g>
            )
          })}
          <Frog x={X(s.frog)} y={frogY} />
        </svg>
      </div>

      <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-center ring-1 ring-line" aria-live="polite">
        <p className="text-xl font-black tabular-nums break-words sm:text-2xl">
          {expr(r.start, jumps)}
          {jumps.length > 0 && <> = <span className={s.won ? 'text-ok' : ''}>{fmt(cur)}</span></>}
          {s.won && ' ✓'}
        </p>
        {jumps.length === 0 && <p className="text-sm font-bold text-ink-soft">Kurbağa {fmt(r.start)} üzerinde. Bir zıplama kartı seç!</p>}
      </div>

      {s.msg && <Toast key={s.msg.key} text={s.msg.text} tone={s.msg.tone} />}

      {arrived ? (
        <div className="mt-4 rounded-3xl bg-ok-soft p-4 text-center ring-1 ring-green-200 animate-pop">
          <p className="text-xl font-black text-green-800">{perfect ? 'Harika! En az zıplamayla ulaştın. +15' : `Ulaştın! ${used} zıplama yaptın. +10`}</p>
          {!perfect && (
            <p className="mt-1 font-bold text-ink">
              {r.best.length} zıplamada da olurdu: <span className="font-black whitespace-nowrap">{expr(r.start, r.best)} = {fmt(r.target)}</span>
            </p>
          )}
          <button type="button" onClick={next} className="btn-primary mt-3 w-full max-w-xs" autoFocus>
            {s.round + 1 >= ROUNDS ? 'Bitir' : 'Sonraki yaprak'}<ArrowRight size={18} />
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {lv.cards.map((c, i) => (
              <button
                key={`${i}-${s.bad?.i === i ? s.bad.key : 0}`}
                type="button"
                onClick={() => jump(i)}
                disabled={s.won}
                aria-label={`${fmt(Math.abs(c))} ${c > 0 ? 'ileri' : 'geri'} zıpla`}
                className={`flex min-h-16 flex-col items-center justify-center rounded-2xl text-white shadow-[0_4px_0_rgb(0_0_0/0.18)] transition active:translate-y-[2px] active:shadow-none disabled:opacity-50 ${c > 0 ? 'bg-green-600' : 'bg-orange-500'} ${s.bad?.i === i ? 'animate-shake' : ''}`}
              >
                <span className="text-xl font-black tabular-nums sm:text-2xl">{term(c).replace(' ', '')}</span>
                <span className="text-[11px] font-extrabold opacity-85">{c > 0 ? 'ileri' : 'geri'}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" onClick={undo} disabled={s.path.length < 2} className="btn-ghost min-h-11 px-4 text-sm"><Undo2 size={18} />Geri al</button>
            <button type="button" onClick={restart} disabled={s.path.length < 2} className="btn-ghost min-h-11 px-4 text-sm"><RotateCcw size={18} />Baştan</button>
          </div>
        </>
      )}
    </div>
  )
}
