import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'
import { Droplets, RotateCcw, Undo2 } from 'lucide-react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { Scene, SolutionList, StrategyPicker, useSolutions } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { MathText } from '../../components/MathText'
import { useTracker } from '../../lib/trackerContext'
import { Card, CheckButton, Choices, Header, NextButton, Nudge, Prompt, Split, fmt, near, pick, rng, shuffle, useChecks } from '../yuzde-boyama/ortak'

/**
 * 42. Oran Karıştırıcısı (6–7)
 * Bardakları sürahiye sürükleyerek (ya da dokunarak) karışım yapılır; sıvının rengi oranı yansıtır.
 * Bardaklar sürahinin altında “paket” (temel oran) gruplarına dizilir: 2 şurup : 3 su paketleri
 * tamamlandıkça oran korunur. Görevler:
 *  - predict: iki karışımdan hangisi daha portakallı? Önce tahmin et, sonra yap ve tat (ölçer).
 *  - fill:    aynı tadı büyük sürahide yap / bozulan tadı düzelt (toplamsal düşünme yanılgısı yakalanır).
 *  - equiv:   aynı tatta farklı boyda sürahiler (çoklu çözüm → oran tablosu).
 *  - order:   üç karışımı en koyudan en açığa sırala.
 */

type Mix = { o: number; w: number }
type CtxId = 'juice' | 'paint'
type Task =
  | { kind: 'predict'; A: Mix; B: Mix; ctx: CtxId }
  | { kind: 'fill'; base: Mix; start: Mix; ask: 'o' | 'w'; target: Mix; story: string; q: string; ctx: CtxId; half: boolean; title: string }
  | { kind: 'equiv'; base: Mix; goal: number; half: boolean; ctx: CtxId }
  | { kind: 'order'; mixes: Mix[]; ctx: CtxId }

const CTX = {
  juice: { o: 'şurup', O: 'Portakal şurubu', w: 'su', W: 'Su', unit: 'bardak', vessel: 'sürahi', strong: 'daha portakallı', strongest: 'En portakallı', weakest: 'En sulu', oc: [214, 78, 8] as const, wc: [255, 246, 232] as const, oSw: '#ea580c', wSw: '#38bdf8' },
  paint: { o: 'kırmızı', O: 'Kırmızı boya', w: 'beyaz', W: 'Beyaz boya', unit: 'kutu', vessel: 'kova', strong: 'daha koyu pembe', strongest: 'En koyu', weakest: 'En açık', oc: [220, 38, 38] as const, wc: [255, 255, 255] as const, oSw: '#dc2626', wSw: '#e2e8f0' },
}

const cap1 = (s: string) => s[0].toLocaleUpperCase('tr') + s.slice(1)
const conc = (m: Mix) => (m.o + m.w > 0 ? m.o / (m.o + m.w) : 0)
const same = (a: Mix, b: Mix) => a.o + a.w > 0 && near(a.o * b.w, a.w * b.o, 1e-9)
const ratioTxt = (m: Mix) => `${fmt(m.o)} : ${fmt(m.w)}`
function color(ctx: CtxId, m: Mix) {
  const c = CTX[ctx]
  if (m.o + m.w === 0) return 'transparent'
  const t = Math.pow(conc(m), ctx === 'juice' ? 0.9 : 0.75)
  const ch = (i: number) => Math.round(c.wc[i] + (c.oc[i] - c.wc[i]) * t)
  return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`
}
/** Parça/bütün kesri (yarım bardaklar ikiyle genişletilir) */
function partWhole(m: Mix) {
  const k = Number.isInteger(m.o) && Number.isInteger(m.w) ? 1 : 2
  return `[[${fmt(m.o * k)}/${fmt((m.o + m.w) * k)}]]`
}

function makeTasks(grade: Grade): Task[] {
  const r = rng(Date.now() % 100000)
  if (grade <= 6) {
    const p1 = pick([{ A: { o: 2, w: 3 }, B: { o: 4, w: 5 } }, { A: { o: 3, w: 4 }, B: { o: 1, w: 2 } }, { A: { o: 1, w: 3 }, B: { o: 3, w: 5 } }], r)
    const sc = pick([{ base: { o: 2, w: 3 }, k: 3 }, { base: { o: 1, w: 3 }, k: 4 }, { base: { o: 3, w: 4 }, k: 2 }], r)
    const swap = r() < 0.5
    return [
      { kind: 'predict', ...(swap ? { A: p1.B, B: p1.A } : p1), ctx: 'juice' },
      { kind: 'fill', base: sc.base, start: { o: sc.base.o * sc.k, w: 0 }, ask: 'w', target: { o: sc.base.o * sc.k, w: sc.base.w * sc.k }, ctx: 'juice', half: false, title: 'Büyük sürahi', story: `Annem ${sc.base.o} bardak şurup ile ${sc.base.w} bardak suyu karıştırınca çok güzel bir tat oldu. Doğum günü için büyük sürahiye ${sc.base.o * sc.k} bardak şurup koydu.`, q: 'Aynı tat için sürahiye kaç bardak su eklemelisin?' },
      { kind: 'equiv', base: pick([{ o: 2, w: 3 }, { o: 1, w: 2 }, { o: 3, w: 2 }], r), goal: 3, half: false, ctx: 'juice' },
      { kind: 'fill', base: { o: 4, w: 6 }, start: { o: 6, w: 6 }, ask: 'w', target: { o: 6, w: 9 }, ctx: 'juice', half: false, title: 'Tadı düzelt', story: 'Sürahide 4 bardak şurup ile 6 bardak su vardı. Kardeşim 2 bardak daha şurup ekledi; içecek çok koyulaştı.', q: 'Tadı eskisi gibi yapmak için kaç bardak su eklemelisin?' },
      { kind: 'predict', A: { o: 3, w: 4 }, B: { o: 6, w: 8 }, ctx: 'juice' },
      { kind: 'order', mixes: shuffle([{ o: 1, w: 2 }, { o: 2, w: 5 }, { o: 3, w: 7 }], r), ctx: 'juice' },
    ]
  }
  return [
    { kind: 'predict', ...pick([{ A: { o: 3, w: 5 }, B: { o: 5, w: 8 } }, { A: { o: 2, w: 3 }, B: { o: 3, w: 5 } }], r), ctx: 'paint' },
    { kind: 'equiv', base: { o: 2, w: 3 }, goal: 4, half: true, ctx: 'juice' },
    { kind: 'fill', base: { o: 3, w: 2 }, start: { o: 0, w: 5 }, ask: 'o', target: { o: 7.5, w: 5 }, ctx: 'paint', half: true, title: 'Pembe boya', story: 'Ece duvar için 3 kutu kırmızı ile 2 kutu beyaz boyayı karıştırıp çok güzel bir pembe elde etti. Şimdi elinde 5 kutu beyaz boya var.', q: 'Aynı pembe için kaç kutu kırmızı boya gerekir? (Yarım kutu da kullanabilirsin.)' },
    { kind: 'fill', base: { o: 6, w: 9 }, start: { o: 9, w: 9 }, ask: 'w', target: { o: 9, w: 13.5 }, ctx: 'juice', half: true, title: 'Tadı düzelt', story: 'Sürahide 6 bardak şurup ile 9 bardak su vardı. Biri 3 bardak daha şurup ekledi.', q: 'Tadı eskisi gibi yapmak için kaç bardak su eklemelisin?' },
    { kind: 'order', mixes: shuffle([{ o: 1, w: 2 }, { o: 2, w: 5 }, { o: 3, w: 7 }, { o: 3, w: 5 }], r), ctx: 'paint' },
    { kind: 'predict', A: { o: 4, w: 6 }, B: { o: 6, w: 9 }, ctx: 'juice' },
  ]
}

const titleOf = (t: Task) => (t.kind === 'predict' ? 'Hangisi daha koyu?' : t.kind === 'fill' ? t.title : t.kind === 'equiv' ? 'Aynı tat, farklı sürahi' : 'Sırala')

export default function OranKaristirici({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade), [grade])
  const [idx, setIdx] = useState(0)
  const [solved, setSolved] = useState(false)
  const firsts = useRef<boolean[]>([])
  const sol = useSolutions()
  const dark = grade >= 7
  const task = tasks[idx]
  const last = idx === tasks.length - 1
  const onSolved = (first: boolean) => {
    if (firsts.current.length <= idx) firsts.current.push(first)
    setSolved(true)
  }
  const next = () => {
    if (!last) {
      setIdx(idx + 1)
      setSolved(false)
      return
    }
    const f = firsts.current.filter(Boolean).length
    onFinish({
      stars: starsFor((f + Math.min(1, sol.list.length * 0.2)) / tasks.length),
      summary: `${tasks.length} karışım görevini tamamladın, aynı tadı ${sol.list.length} farklı sürahide yaptın.`,
      insight:
        grade <= 6
          ? 'Aynı tadı korumak için iki miktarı da aynı sayıyla çarparız (2 : 3 → 6 : 9). İkisine de aynı sayıyı eklemek (2 : 3 → 6 : 7) tadı değiştirir.'
          : 'Karışımları karşılaştırmak için farka değil, orana bakarız: şurubun tüm karışıma oranı ya da 1 bardak suya düşen şurup. Eşdeğer oranlar yarım bardaklarla da kurulabilir (2 : 3 = 1 : 1½).',
    })
  }
  const footer = solved ? <NextButton last={last} onClick={next} /> : null
  const c = { grade, footer, onSolved, sol }
  return (
    <Scene grade={grade}>
      <Header emoji="🧃" kicker="Karışım" title={titleOf(task)} idx={idx} total={tasks.length} dark={dark} />
      {task.kind === 'predict' && <PredictTask key={idx} t={task} {...c} />}
      {task.kind === 'fill' && <FillTask key={idx} t={task} {...c} />}
      {task.kind === 'equiv' && <EquivTask key={idx} t={task} {...c} />}
      {task.kind === 'order' && <OrderTask key={idx} t={task} {...c} />}
    </Scene>
  )
}

type Common = { grade: Grade; footer: ReactNode; onSolved: (first: boolean) => void; sol: ReturnType<typeof useSolutions> }

/* ───────────────────────── görseller ───────────────────────── */

function Pitcher({ id, mix, ctx, cap, label, active, onTap, small }: { id: string; mix: Mix; ctx: CtxId; cap: number; label?: ReactNode; active?: boolean; onTap?: () => void; small?: boolean }) {
  const total = mix.o + mix.w
  const level = Math.min(1, total / cap)
  const bodyTop = 46, bodyBot = 222
  const h = (bodyBot - bodyTop - 8) * level
  const y = bodyBot - 4 - h
  const col = color(ctx, mix)
  const paint = ctx === 'paint'
  const Root = onTap ? 'button' : 'div'
  return (
    <Root data-pitcher={id} {...(onTap ? { type: 'button' as const, onClick: onTap } : {})} className={`group relative flex w-full flex-col items-center rounded-3xl p-1.5 transition ${active ? 'bg-amber-100/80 ring-4 ring-amber-400' : 'ring-0'} ${onTap ? 'cursor-pointer' : 'cursor-default'}`} aria-label={`${typeof label === 'string' ? label : 'Kap'}: ${fmt(mix.o)} ${CTX[ctx].o}, ${fmt(mix.w)} ${CTX[ctx].w}`}>
      <svg viewBox="0 0 200 236" className={`block w-full ${small ? 'max-w-[9rem]' : 'max-w-[15rem]'}`} aria-hidden>
        <defs>
          <clipPath id={`clip-${id}`}>
            {paint ? <path d="M30 50 L170 50 L162 222 Q100 232 38 222 Z" /> : <path d="M40 46 Q36 30 54 24 L132 24 Q150 24 150 40 L156 60 Q166 140 158 214 Q156 226 140 226 L60 226 Q44 226 42 214 Q34 140 44 60 Z" />}
          </clipPath>
          <linearGradient id={`shine-${id}`} x1="0" x2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="0.25" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.85" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        {!paint && <path d="M152 70 Q192 76 186 124 Q182 160 150 168" fill="none" stroke="#94a3b8" strokeWidth="10" strokeLinecap="round" />}
        {paint && <path d="M34 60 Q100 -10 166 60" fill="none" stroke="#64748b" strokeWidth="5" />}
        <g clipPath={`url(#clip-${id})`}>
          <rect x="0" y="0" width="200" height="236" fill={paint ? '#f8fafc' : '#f1f5f9'} />
          <rect x="0" width="200" style={{ y, height: h + 10, transition: 'y 350ms ease, height 350ms ease, fill 350ms ease' } as React.CSSProperties} fill={col} />
          {total > 0 && <path d={`M0 ${y + 2} Q50 ${y - 5} 100 ${y + 2} T200 ${y + 2}`} fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="3" style={{ transition: 'd 350ms' }} />}
          <rect x="0" y="0" width="200" height="236" fill={`url(#shine-${id})`} />
          {/* bardak çizgileri */}
          {Array.from({ length: Math.floor(cap / (cap > 16 ? 5 : 2)) }, (_, i) => {
            const st = cap > 16 ? 5 : 2
            const yy = bodyBot - 4 - ((bodyBot - bodyTop - 8) * (st * (i + 1))) / cap
            return (
              <g key={i}>
                <line x1={paint ? 40 : 50} x2={paint ? 58 : 66} y1={yy} y2={yy} stroke="#334155" strokeOpacity="0.45" strokeWidth="2" />
                <text x={paint ? 62 : 70} y={yy + 4} fontSize="11" fontWeight="900" fill="#334155" fillOpacity="0.6">{st * (i + 1)}</text>
              </g>
            )
          })}
        </g>
        {paint ? <path d="M30 50 L170 50 L162 222 Q100 232 38 222 Z" fill="none" stroke="#475569" strokeWidth="4" /> : <path d="M40 46 Q36 30 54 24 L132 24 Q150 24 150 40 L156 60 Q166 140 158 214 Q156 226 140 226 L60 226 Q44 226 42 214 Q34 140 44 60 Z" fill="none" stroke="#475569" strokeWidth="4" />}
        {!paint && <path d="M132 24 Q150 18 160 8" fill="none" stroke="#475569" strokeWidth="4" strokeLinecap="round" />}
      </svg>
      {label && <span className="mt-0.5 text-sm font-black text-ink">{label}</span>}
    </Root>
  )
}

/** Bardakları temel oran “paket”lerine dizen şerit modeli */
function Tape({ mix, ctx, base, compact }: { mix: Mix; ctx: CtxId; base?: Mix; compact?: boolean }) {
  const c = CTX[ctx]
  const cell = compact ? 14 : 18
  const cellRow = (n: number, sw: string, key: string) => (
    <div key={key} className="flex gap-[3px]">
      {Array.from({ length: Math.ceil(n - 1e-9) }, (_, i) => {
        const part = Math.min(1, n - i)
        return (
          <span key={i} className="relative overflow-hidden rounded-[4px] ring-1 ring-black/10" style={{ width: cell, height: cell, background: '#f1f5f9' }}>
            <span className="absolute inset-y-0 left-0" style={{ width: `${part * 100}%`, background: sw }} />
          </span>
        )
      })}
    </div>
  )
  if (!base) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5"><span className="w-12 text-right text-[11px] font-black" style={{ color: c.oSw }}>{c.o}</span>{cellRow(mix.o, c.oSw, 'o')}<span className="text-xs font-black text-ink">{fmt(mix.o)}</span></div>
        <div className="flex items-center gap-1.5"><span className="w-12 text-right text-[11px] font-black text-sky-700">{c.w}</span>{cellRow(mix.w, c.wSw, 'w')}<span className="text-xs font-black text-ink">{fmt(mix.w)}</span></div>
      </div>
    )
  }
  const packs = Math.max(Math.ceil(mix.o / base.o - 1e-9), Math.ceil(mix.w / base.w - 1e-9), 1)
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {Array.from({ length: packs }, (_, i) => {
        const po = Math.max(0, Math.min(base.o, mix.o - i * base.o))
        const pw = Math.max(0, Math.min(base.w, mix.w - i * base.w))
        const full = near(po, base.o) && near(pw, base.w)
        const partial = !full && near(po / base.o, pw / base.w) && po > 0
        return (
          <div key={i} className={`flex flex-col gap-[3px] rounded-lg p-1 ring-2 ${full ? 'bg-emerald-50 ring-emerald-500' : partial ? 'bg-emerald-50/60 ring-emerald-300 ring-dashed' : 'bg-white ring-slate-200'}`}>
            {cellRow(po, c.oSw, 'o')}
            {cellRow(pw, c.wSw, 'w')}
            {po === 0 && pw === 0 && <span style={{ height: cell }} />}
          </div>
        )
      })}
    </div>
  )
}

/** Sürüklenebilir bardak (dokununca da döker) */
function Source({ ing, ctx, half, onPour, disabled }: { ing: 'o' | 'w'; ctx: CtxId; half?: boolean; onPour: (target: string | null, amount: number) => void; disabled?: boolean }) {
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null)
  const c = CTX[ctx]
  const sw = ing === 'o' ? c.oSw : c.wSw
  const amount = half ? 0.5 : 1
  const bind = useDrag(
    ({ xy: [x, y], tap, last, event }) => {
      if (disabled) return
      if (tap) {
        onPour(null, amount)
        return
      }
      event.preventDefault()
      if (last) {
        setGhost(null)
        const el = document.elementFromPoint(x, y)?.closest('[data-pitcher]')
        if (el) onPour(el.getAttribute('data-pitcher'), amount)
        return
      }
      setGhost({ x, y })
    },
    { filterTaps: true },
  )
  const cup = (
    <svg viewBox="0 0 48 56" className="size-11" aria-hidden>
      {ctx === 'paint' ? (
        <>
          <rect x="6" y="10" width="36" height="42" rx="4" fill="#e2e8f0" stroke="#475569" strokeWidth="3" />
          <rect x="9" y={half ? 32 : 14} width="30" height={half ? 18 : 36} rx="2" fill={sw} />
          <path d="M8 10 Q24 -4 40 10" fill="none" stroke="#475569" strokeWidth="3" />
        </>
      ) : (
        <>
          <path d="M8 6 L40 6 L36 52 L12 52 Z" fill="#f8fafc" stroke="#475569" strokeWidth="3" strokeLinejoin="round" />
          <path d={half ? 'M11.5 30 L36.5 30 L35 50 L13 50 Z' : 'M9.8 12 L38.2 12 L35 50 L13 50 Z'} fill={sw} />
        </>
      )}
    </svg>
  )
  return (
    <>
      <button type="button" {...bind()} disabled={disabled} className="flex min-h-16 flex-1 touch-none items-center gap-2 rounded-2xl bg-white px-3 py-1.5 text-left ring-2 ring-line transition select-none active:scale-95 disabled:opacity-40" style={{ borderColor: sw }} aria-label={`${half ? 'Yarım' : '1'} ${c.unit} ${c.o === 'şurup' && ing === 'o' ? 'şurup' : ing === 'o' ? c.o : c.w} ekle`}>
        {cup}
        <span className="leading-tight">
          <span className="block text-sm font-black" style={{ color: ing === 'o' ? sw : '#0369a1' }}>{half ? '½' : '1'} {c.unit}</span>
          <span className="block text-xs font-bold text-ink-soft">{ing === 'o' ? c.O.toLowerCase() : c.W.toLowerCase()}</span>
        </span>
      </button>
      {ghost && <div className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 drop-shadow-xl" style={{ left: ghost.x, top: ghost.y }}>{cup}</div>}
    </>
  )
}

/** Tat ölçer: şurubun tüm karışıma oranı */
function Meter({ mix, ctx, label }: { mix: Mix; ctx: CtxId; label: string }) {
  const c = conc(mix)
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 text-sm font-black">{label}</span>
      <div className="relative h-7 flex-1 overflow-hidden rounded-full bg-slate-100 ring-1 ring-line">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${c * 100}%`, background: color(ctx, mix) }} />
        <span className="absolute inset-y-0 left-1/2 w-0.5 bg-slate-400" />
      </div>
      <span className="w-20 text-right text-base font-black"><MathText text={partWhole(mix)} /> <span className="text-xs text-ink-soft">≈ %{Math.round(c * 100)}</span></span>
    </div>
  )
}

function PitcherControls({ onUndo, onEmpty, disabled }: { onUndo: () => void; onEmpty: () => void; disabled?: boolean }) {
  return (
    <div className="flex justify-center gap-1.5">
      <button type="button" onClick={onUndo} disabled={disabled} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-white px-3 text-sm font-extrabold text-ink ring-1 ring-line active:scale-95 disabled:opacity-40"><Undo2 size={16} />Geri al</button>
      <button type="button" onClick={onEmpty} disabled={disabled} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-white px-3 text-sm font-extrabold text-ink ring-1 ring-line active:scale-95 disabled:opacity-40"><RotateCcw size={16} />Boşalt</button>
    </div>
  )
}

/** Dökülebilir karışım durumu (geri alma geçmişiyle) */
function useMix(start: Mix = { o: 0, w: 0 }) {
  const [mix, setMix] = useState<Mix>(start)
  const hist = useRef<Mix[]>([])
  return {
    mix,
    pour(ing: 'o' | 'w', a: number, cap = 40) {
      setMix((m) => {
        if (m.o + m.w + a > cap + 1e-9) return m
        hist.current.push(m)
        return { ...m, [ing]: m[ing] + a }
      })
    },
    undo() {
      const p = hist.current.pop()
      if (p) setMix(p)
    },
    reset() {
      hist.current = []
      setMix(start)
    },
  }
}

const Work = ({ children }: { children: ReactNode }) => <div className="rounded-3xl bg-gradient-to-b from-amber-50 to-orange-50 p-3 shadow-sm ring-1 ring-amber-200">{children}</div>

/* ───────────────────────── 1. tahmin et, yap, tat ───────────────────────── */

function PredictTask({ t, footer, onSolved, grade }: { t: Extract<Task, { kind: 'predict' }> } & Common) {
  const c = CTX[t.ctx]
  const A = useMix(), B = useMix()
  const [active, setActive] = useState<'A' | 'B'>('A')
  const [pred, setPred] = useState<'A' | 'B' | 'eq' | null>(null)
  const [phase, setPhase] = useState<'predict' | 'build' | 'taste' | 'done'>('predict')
  const [ans, setAns] = useState<'A' | 'B' | 'eq' | null>(null)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const chk = useChecks()
  const track = useTracker()
  const cap = Math.max(t.A.o + t.A.w, t.B.o + t.B.w) + 2
  const right: 'A' | 'B' | 'eq' = near(conc(t.A), conc(t.B)) ? 'eq' : conc(t.A) > conc(t.B) ? 'A' : 'B'
  const builtA = near(A.mix.o, t.A.o) && near(A.mix.w, t.A.w)
  const builtB = near(B.mix.o, t.B.o) && near(B.mix.w, t.B.w)
  const pour = (target: string | null, ing: 'o' | 'w', a: number) => {
    const id = (target as 'A' | 'B' | null) ?? active
    if (target) setActive(id)
    ;(id === 'A' ? A : B).pour(ing, a, cap)
  }
  const sameDiff = near(t.A.w - t.A.o, t.B.w - t.B.o)
  const check = () => {
    if (ans === right) {
      onSolved(chk.pass())
      setPhase('done')
      setFb({ ok: true, text: right === 'eq' ? `Evet, ikisi aynı tatta! ${ratioTxt(t.B)} karışımı, ${ratioTxt(t.A)} karışımının ${fmt(t.B.o / t.A.o)} katı.` : `Evet! ${right} karışımında ${c.o} payı daha büyük: ${partWhole(right === 'A' ? t.A : t.B)} > ${partWhole(right === 'A' ? t.B : t.A)}.` })
      return
    }
    chk.fail()
    if (ans === 'eq' && sameDiff) setFb({ ok: false, text: `İki karışımda da ${c.w}, ${c.o === 'şurup' ? 'şuruptan' : 'kırmızıdan'} ${fmt(t.A.w - t.A.o)} ${c.unit} fazla. Ama ${fmt(t.A.o)} ${c.unit} ${c.o} ile ${fmt(t.A.w - t.A.o)} fazla ${c.w} ile ${fmt(t.B.o)} ${c.unit} ${c.o} ile ${fmt(t.B.w - t.B.o)} fazla ${c.w} aynı etkiyi mi yapar? Ölçerlere bak.`, mis: 'Oranları farka bakarak karşılaştırdı (toplamsal düşünme)' })
    else if (right === 'eq') setFb({ ok: false, text: `${t.B.o} ${c.unit} ${c.o}, ${t.A.o} ${c.unit === 'bardak' ? 'bardağın' : 'kutunun'} kaç katı? ${cap1(c.w)} da aynı katına çıktı mı? Ölçerler ne söylüyor?`, mis: 'Eşdeğer oranları farklı sandı (büyük sayılar daha koyu)' })
    else if ((ans === 'A' ? t.A.o : t.B.o) > (ans === 'A' ? t.B.o : t.A.o)) setFb({ ok: false, text: `${ans} karışımında daha çok ${c.o} var, doğru. Ama daha çok ${c.w} da var! Her karışımda ${c.o}, tüm karışımın ne kadarı? Ölçerleri karşılaştır.`, mis: 'Karışımı yalnızca bir bileşenin miktarına bakarak değerlendirdi' })
    else setFb({ ok: false, text: `Ölçerlerde hangisinin çubuğu daha uzun? Her karışımda 1 ${c.unit} ${c.w} başına ne kadar ${c.o} düşüyor?` })
  }
  const opts = [{ id: 'A' as const, label: `A daha koyu` }, { id: 'B' as const, label: `B daha koyu` }, { id: 'eq' as const, label: 'Aynı' }]
  return (
    <Split
      work={
        <Work>
          <div className="grid grid-cols-2 gap-2">
            {(['A', 'B'] as const).map((id) => {
              const M = id === 'A' ? A : B
              const goal = id === 'A' ? t.A : t.B
              return (
                <div key={id} className="flex min-w-0 flex-col items-center gap-1.5">
                  <span className="rounded-full bg-white px-3 py-0.5 text-sm font-black text-ink ring-1 ring-line">{id}: {fmt(goal.o)} {c.o} : {fmt(goal.w)} {c.w}</span>
                  <Pitcher id={id} mix={M.mix} ctx={t.ctx} cap={cap} active={phase === 'build' && active === id} onTap={() => setActive(id)} label={phase === 'build' ? (active === id ? 'Buraya dökülüyor' : 'Seçmek için dokun') : undefined} />
                  <Tape mix={M.mix} ctx={t.ctx} compact />
                  {phase === 'build' && <PitcherControls onUndo={M.undo} onEmpty={M.reset} />}
                </div>
              )
            })}
          </div>
          {phase === 'build' && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Source ing="o" ctx={t.ctx} onPour={(tg, a) => pour(tg, 'o', a)} />
              <Source ing="w" ctx={t.ctx} onPour={(tg, a) => pour(tg, 'w', a)} />
            </div>
          )}
        </Work>
      }
      panel={
        <>
          <Prompt step={phase === 'predict' ? '1. Tahmin et' : phase === 'build' ? '2. Karışımları yap' : '3. Tat ve karar ver'}>
            A: <b>{fmt(t.A.o)} {c.unit} {c.o}</b> + <b>{fmt(t.A.w)} {c.unit} {c.w}</b>
            <br />B: <b>{fmt(t.B.o)} {c.unit} {c.o}</b> + <b>{fmt(t.B.w)} {c.unit} {c.w}</b>
            <span className="mt-1 block text-teal-800">Hangisi {c.strong}?</span>
          </Prompt>
          {phase === 'predict' && (
            <>
              <Choices cols={3} value={pred} onPick={setPred} options={opts} />
              <CheckButton disabled={!pred} onClick={() => { track.strategy(`Tahmin: ${pred === 'eq' ? 'aynı' : pred}`); setPhase('build') }}>Tahminimi kaydet</CheckButton>
            </>
          )}
          {phase === 'build' && (
            <>
              <Card><p className="text-sm font-bold text-ink-soft">Bardakları sürahiye sürükle ya da dokun. Önce bir sürahiye dokunup seç. İki karışımı da tarifteki gibi yap.</p></Card>
              <div className="grid grid-cols-2 gap-2 text-center text-sm font-black">
                <span className={`rounded-xl px-2 py-2 ring-1 ${builtA ? 'bg-ok-soft text-green-800 ring-green-300' : 'bg-white text-ink-soft ring-line'}`}>A {builtA ? 'hazır ✓' : `${fmt(A.mix.o)} : ${fmt(A.mix.w)}`}</span>
                <span className={`rounded-xl px-2 py-2 ring-1 ${builtB ? 'bg-ok-soft text-green-800 ring-green-300' : 'bg-white text-ink-soft ring-line'}`}>B {builtB ? 'hazır ✓' : `${fmt(B.mix.o)} : ${fmt(B.mix.w)}`}</span>
              </div>
              <CheckButton disabled={!builtA || !builtB} onClick={() => setPhase('taste')}><Droplets size={18} />Tadına bak</CheckButton>
            </>
          )}
          {(phase === 'taste' || phase === 'done') && (
            <>
              <Card>
                <p className="mb-2 text-xs font-black tracking-wide text-ink-soft uppercase">Tat ölçer: {c.o} / tüm karışım</p>
                <div className="space-y-2"><Meter mix={t.A} ctx={t.ctx} label="A" /><Meter mix={t.B} ctx={t.ctx} label="B" /></div>
                <p className="mt-2 text-xs font-bold text-ink-soft">Tahminin: {pred === 'eq' ? 'aynı' : `${pred} daha koyu`}. Şimdi kanıta bakarak karar ver.</p>
              </Card>
              <Choices cols={3} value={ans} disabled={phase === 'done'} onPick={(v) => { setAns(v); setFb(null) }} options={opts} />
              {phase === 'taste' && <CheckButton disabled={!ans} onClick={check} />}
            </>
          )}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="orantablosu" toolTitle="Oran tablosunda dene" />)}
          {phase === 'done' && (
            <StrategyPicker
              question="Nasıl karşılaştırdın?"
              options={grade >= 7 ? [`${cap1(c.o)} / tüm karışım (kesir)`, `1 ${c.unit} ${c.w} başına ${c.o} (birim oran)`, `${cap1(c.o)} miktarlarını eşitledim`, 'Farklarına baktım'] : ['Şurubun tüm karışıma oranı', 'Karışımları büyütüp eşitledim', 'Renge baktım', 'Farklarına baktım']}
              onPick={(s) => s.startsWith('Farklarına') && track.misconception('Karışımları farka bakarak karşılaştırdığını söyledi')}
            />
          )}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 2. aynı tadı büyüt / düzelt ───────────────────────── */

function FillTask({ t, footer, onSolved, grade }: { t: Extract<Task, { kind: 'fill' }> } & Common) {
  const c = CTX[t.ctx]
  const M = useMix(t.start)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const [done, setDone] = useState(false)
  const chk = useChecks()
  const other = t.ask === 'o' ? 'w' : 'o'
  const cap = Math.ceil((t.target.o + t.target.w) / 2) * 2 + 4
  const ingName = t.ask === 'o' ? c.o : c.w
  const additive = t.ask === 'w' ? t.start.o + (t.base.w - t.base.o) : t.start.w + (t.base.o - t.base.w)
  const added = M.mix[t.ask] - t.start[t.ask]
  const check = () => {
    if (same(M.mix, t.base)) {
      onSolved(chk.pass())
      setDone(true)
      const k = M.mix[other] / t.base[other]
      setFb({ ok: true, text: `Aynı ${t.ctx === 'paint' ? 'renk' : 'tat'}! ${ratioTxt(t.base)} → ${ratioTxt(M.mix)}: iki miktar da ${fmt(k)} katına çıktı.` })
      return
    }
    chk.fail()
    if (near(M.mix[t.ask], additive)) {
      const diff = Math.abs(t.base.w - t.base.o)
      setFb({ ok: false, text: `${ratioTxt(t.base)} karışımında ${t.ask === 'w' ? 'su, şuruptan' : `${c.o}, ${c.w}tan`} ${fmt(diff)} fazlaydı; sen de farkı korudun. Ama paketlere bak: her ${fmt(t.base[other])} ${c.unit} ${other === 'o' ? c.o : c.w} için kaç ${c.unit} ${ingName} gerekiyor? Paketlerin hepsi dolu mu?`, mis: 'Oranı korumak için iki miktara aynı sayıyı ekledi (toplamsal düşünme)' })
    } else setFb({ ok: false, text: M.mix[t.ask] > t.target[t.ask] ? `Renk ${t.ask === 'w' ? 'açıldı' : 'koyulaştı'}. Paketlerden biri taşıyor mu? Her pakette ${fmt(t.base.o)} ${c.o} ve ${fmt(t.base.w)} ${c.w} olmalı.` : `Paketlerin bazıları eksik. ${fmt(M.mix[other])} ${c.unit} ${other === 'o' ? c.o : c.w} kaç paket eder?` })
  }
  return (
    <Split
      work={
        <Work>
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-end gap-2">
            <div className="flex flex-col items-center gap-1">
              <span className="rounded-full bg-white px-3 py-0.5 text-sm font-black text-ink ring-1 ring-line">Senin {c.vessel}n: {ratioTxt(M.mix)}</span>
              <Pitcher id="main" mix={M.mix} ctx={t.ctx} cap={cap} />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="rounded-full bg-amber-100 px-3 py-0.5 text-center text-xs font-black text-amber-900 ring-1 ring-amber-300">Hedef {t.ctx === 'paint' ? 'renk' : 'tat'}: {ratioTxt(t.base)}</span>
              <Pitcher id="ref" mix={t.base} ctx={t.ctx} cap={t.base.o + t.base.w + 1} small />
            </div>
          </div>
          <div className="mt-2 rounded-2xl bg-white/80 p-2 ring-1 ring-line">
            <p className="mb-1 text-center text-xs font-black text-ink-soft">{fmt(t.base.o)} {c.o} : {fmt(t.base.w)} {c.w} paketleri</p>
            <Tape mix={M.mix} ctx={t.ctx} base={t.base} />
          </div>
          {!done && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Source ing={t.ask} ctx={t.ctx} onPour={(_, a) => { M.pour(t.ask, a, cap); setFb(null) }} />
              {t.half && <Source ing={t.ask} ctx={t.ctx} half onPour={(_, a) => { M.pour(t.ask, a, cap); setFb(null) }} />}
            </div>
          )}
          {!done && <div className="mt-2"><PitcherControls onUndo={() => { M.undo(); setFb(null) }} onEmpty={() => { M.reset(); setFb(null) }} /></div>}
        </Work>
      }
      panel={
        <>
          <Prompt step={t.title}>{t.story} <span className="mt-1 block text-teal-800">{t.q}</span></Prompt>
          <Card>
            <p className="text-sm font-bold text-ink-soft">{c.O === 'Portakal şurubu' ? 'Su bardağını' : 'Boya kutusunu'} {t.ctx === 'paint' ? 'kovaya' : 'sürahiye'} sürükle ya da dokun.</p>
            <p className="mt-1 text-lg font-black">Eklediğin {ingName}: {fmt(added)} {c.unit}</p>
          </Card>
          {!done && <CheckButton onClick={check} disabled={added <= 0} />}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool={grade >= 7 ? 'ciftdogru' : 'orantablosu'} toolTitle={grade >= 7 ? 'Çift sayı doğrusunda dene' : 'Oran tablosunda dene'} />)}
          {done && <StrategyPicker question="Nasıl buldun?" options={['Paketleri saydım (katladım)', `1 ${c.unit} ${other === 'o' ? c.o : c.w} için ne gerektiğini buldum`, 'Oran tablosu gibi düşündüm', 'Rengi eşleyerek denedim']} onPick={() => {}} />}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 3. aynı tat, farklı sürahi ───────────────────────── */

function EquivTask({ t, footer, onSolved, sol }: { t: Extract<Task, { kind: 'equiv' }> } & Common) {
  const c = CTX[t.ctx]
  const M = useMix()
  const [found, setFound] = useState<Mix[]>([])
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const chk = useChecks()
  const solvedRef = useRef(false)
  const cap = 20
  const check = () => {
    const m = M.mix
    if (same(m, t.base)) {
      if (found.some((f) => near(f.o, m.o) && near(f.w, m.w))) {
        setFb({ ok: false, text: `${ratioTxt(m)} karışımını zaten yaptın. Daha büyük ya da daha küçük bir sürahi dene!` })
        return
      }
      const next = [...found, m].sort((a, b) => a.o - b.o)
      setFound(next)
      sol.add(`eq-${m.o}-${m.w}`, `${ratioTxt(m)}`)
      if (next.length >= t.goal && !solvedRef.current) {
        solvedRef.current = true
        onSolved(chk.pass())
      } else chk.pass()
      const half = !Number.isInteger(m.o) || !Number.isInteger(m.w)
      setFb({ ok: true, text: next.length >= t.goal ? `Harika, ${next.length} farklı sürahi! Tabloya bak: ${c.o} ve ${c.w} hep aynı sayıyla çarpılmış.` : half ? 'Yarım bardaklarla bile aynı tat! Bir tane daha bul.' : `Aynı tat! ${t.goal - next.length} tane daha bul.` })
      M.reset()
      return
    }
    chk.fail()
    const add = near(m.w - m.o, t.base.w - t.base.o)
    setFb(
      add
        ? { ok: false, text: `${ratioTxt(m)}: farkı ${ratioTxt(t.base)} ile aynı tuttun. Ama paketlere ayırınca her paket ${ratioTxt(t.base)} oluyor mu? Rengi hedefle karşılaştır.`, mis: 'Eşdeğer oran için iki miktara aynı sayıyı ekledi (toplamsal düşünme)' }
        : { ok: false, text: `Renk hedeften ${conc(m) > conc(t.base) ? 'koyu' : 'açık'}. ${fmt(m.o)} ${c.unit} ${c.o} kaç paket? O kadar paket için kaç ${c.unit} ${c.w} gerekir?` },
    )
  }
  return (
    <Split
      work={
        <Work>
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-end gap-2">
            <div className="flex flex-col items-center gap-1">
              <span className="rounded-full bg-white px-3 py-0.5 text-sm font-black text-ink ring-1 ring-line">Senin sürahin: {ratioTxt(M.mix)}</span>
              <Pitcher id="main" mix={M.mix} ctx={t.ctx} cap={cap} />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="rounded-full bg-amber-100 px-3 py-0.5 text-center text-xs font-black text-amber-900 ring-1 ring-amber-300">Hedef tat: {ratioTxt(t.base)}</span>
              <Pitcher id="ref" mix={t.base} ctx={t.ctx} cap={t.base.o + t.base.w + 1} small />
            </div>
          </div>
          <div className="mt-2 rounded-2xl bg-white/80 p-2 ring-1 ring-line"><Tape mix={M.mix} ctx={t.ctx} /></div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Source ing="o" ctx={t.ctx} onPour={(_, a) => { M.pour('o', a, cap); setFb(null) }} />
            <Source ing="w" ctx={t.ctx} onPour={(_, a) => { M.pour('w', a, cap); setFb(null) }} />
            {t.half && <Source ing="o" half ctx={t.ctx} onPour={(_, a) => { M.pour('o', a, cap); setFb(null) }} />}
            {t.half && <Source ing="w" half ctx={t.ctx} onPour={(_, a) => { M.pour('w', a, cap); setFb(null) }} />}
          </div>
          <div className="mt-2"><PitcherControls onUndo={() => { M.undo(); setFb(null) }} onEmpty={() => { M.reset(); setFb(null) }} /></div>
        </Work>
      }
      panel={
        <>
          <Prompt step="Çok yol">Bu tadı herkes sevdi: <b>{fmt(t.base.o)} {c.unit} {c.o}</b> + <b>{fmt(t.base.w)} {c.unit} {c.w}</b>. Aynı tatta <b>farklı boylarda {t.goal} sürahi</b> yap.{t.half && <span className="mt-1 block text-sm font-bold text-ink-soft">İpucu: yarım bardak da kullanabilirsin; hedeften küçük bir sürahi de olur!</span>}</Prompt>
          <CheckButton onClick={check} disabled={M.mix.o + M.mix.w === 0}>Bu aynı tat mı?</CheckButton>
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="orantablosu" toolTitle="Oran tablosunda dene" />)}
          <Card>
            <p className="mb-1.5 text-xs font-black tracking-wide text-ink-soft uppercase">Oran tablosu</p>
            <div className="overflow-x-auto">
              <table className="w-full text-center text-base font-black tabular-nums">
                <tbody>
                  <tr>
                    <th className="pr-2 text-left text-xs" style={{ color: c.oSw }}>{c.o}</th>
                    <td className="rounded-l-lg bg-amber-100 px-2 py-1">{fmt(t.base.o)}</td>
                    {found.map((f, i) => <td key={i} className="bg-emerald-50 px-2 py-1 animate-pop">{fmt(f.o)}</td>)}
                  </tr>
                  <tr>
                    <th className="pr-2 text-left text-xs text-sky-700">{c.w}</th>
                    <td className="rounded-l-lg bg-amber-100 px-2 py-1">{fmt(t.base.w)}</td>
                    {found.map((f, i) => <td key={i} className="bg-emerald-50 px-2 py-1 animate-pop">{fmt(f.w)}</td>)}
                  </tr>
                  <tr>
                    <th />
                    <td className="text-[11px] text-ink-soft">hedef</td>
                    {found.map((f, i) => <td key={i} className="text-[11px] text-emerald-700">×{fmt(f.o / t.base.o)}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
          <SolutionList list={sol.list.filter((s) => s.key.startsWith('eq-'))} goal={t.goal} />
          {found.length >= t.goal && <StrategyPicker question="Yeni sürahileri nasıl buldun?" options={['İkisini de aynı sayıyla çarptım', 'Paket ekledim (2 : 3 + 2 : 3)', 'Yarıya böldüm', 'Rengi eşleyerek']} onPick={() => {}} />}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 4. sırala ───────────────────────── */

function OrderTask({ t, footer, onSolved, grade }: { t: Extract<Task, { kind: 'order' }> } & Common) {
  const c = CTX[t.ctx]
  const [order, setOrder] = useState<number[]>([])
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const [done, setDone] = useState(false)
  const chk = useChecks()
  const letters = 'ABCD'
  const right = t.mixes.map((_, i) => i).sort((a, b) => conc(t.mixes[b]) - conc(t.mixes[a]))
  const tap = (i: number) => {
    if (done) return
    setFb(null)
    setOrder((o) => (o.includes(i) ? o.filter((x) => x !== i) : [...o, i]))
  }
  const check = () => {
    if (order.every((v, i) => v === right[i])) {
      onSolved(chk.pass())
      setDone(true)
      setFb({ ok: true, text: `Doğru sıra! ${c.o} payları: ${right.map((i) => `${letters[i]} ${partWhole(t.mixes[i])}`).join(', ')}.` })
      return
    }
    chk.fail()
    const byO = t.mixes.map((_, i) => i).sort((a, b) => t.mixes[b].o - t.mixes[a].o)
    const byDiff = t.mixes.map((_, i) => i).sort((a, b) => t.mixes[a].w - t.mixes[a].o - (t.mixes[b].w - t.mixes[b].o))
    if (order.every((v, i) => v === byO[i])) setFb({ ok: false, text: `En çok ${c.o} olanı en koyu saydın. Ama ${c.w} miktarları da farklı! Her karışımda ${c.o}, tüm karışımın ne kadarı?`, mis: 'Karışımları yalnızca bir bileşenin miktarına göre sıraladı' })
    else if (order.every((v, i) => v === byDiff[i])) setFb({ ok: false, text: `Farka göre sıraladın (${c.w} − ${c.o}). Farkı aynı olan 1 : 2 ile 5 : 6 aynı tatta mı olur? 1 ${c.unit} ${c.o} başına kaç ${c.unit} ${c.w} düşüyor?`, mis: 'Karışımları farka göre sıraladı (toplamsal düşünme)' })
    else setFb({ ok: false, text: `Karışımları aynı dile çevir: her birinde 1 ${c.unit} ${c.o} için kaç ${c.unit} ${c.w} var? Ya da ${c.o} tüm karışımın kaçta kaçı?` })
  }
  return (
    <Split
      work={
        <Work>
          <div className={`grid gap-2 ${t.mixes.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
            {t.mixes.map((m, i) => {
              const pos = order.indexOf(i)
              return (
                <button key={i} type="button" onClick={() => tap(i)} className={`relative flex min-h-40 flex-col items-center gap-2 rounded-2xl bg-white p-2 ring-2 transition active:scale-[0.98] ${pos >= 0 ? 'ring-teal-500' : 'ring-line'}`}>
                  {pos >= 0 && <span className="absolute -top-2 -right-2 grid size-9 place-items-center rounded-full bg-teal-600 text-lg font-black text-white shadow">{pos + 1}</span>}
                  <span className="text-xl font-black">{letters[i]}</span>
                  {done ? <Pitcher id={`o${i}`} mix={m} ctx={t.ctx} cap={m.o + m.w + 1} small /> : <span className="grid h-24 w-full place-items-center rounded-xl bg-slate-50 text-4xl">{t.ctx === 'paint' ? '🪣' : '🫙'}</span>}
                  <Tape mix={m} ctx={t.ctx} compact />
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-center text-sm font-bold text-amber-900">Kaplara {c.strongest.toLowerCase()}dan başlayarak sırayla dokun. Tekrar dokunursan sıradan çıkar.</p>
        </Work>
      }
      panel={
        <>
          <Prompt step="Sırala">Renkler gizli! Yalnızca tariflere bakarak karışımları <b>{c.strongest.toLowerCase()}</b>dan <b>{c.weakest.toLowerCase()}</b>a sırala.</Prompt>
          <Card>
            <div className="flex items-center gap-2 text-lg font-black">
              {right.map((_, k) => <span key={k} className={`grid size-12 place-items-center rounded-xl ring-2 ${order[k] !== undefined ? 'bg-teal-600 text-white ring-teal-700' : 'bg-white text-slate-300 ring-line'}`}>{order[k] !== undefined ? letters[order[k]] : k + 1}</span>)}
            </div>
            <p className="mt-1 text-xs font-bold text-ink-soft">{c.strongest} → {c.weakest.toLowerCase()}</p>
          </Card>
          {!done && <CheckButton onClick={check} disabled={order.length !== t.mixes.length} />}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="orantablosu" toolTitle="Oran tablosunda dene" />)}
          {done && <Card><div className="space-y-2">{right.map((i) => <Meter key={i} mix={t.mixes[i]} ctx={t.ctx} label={letters[i]} />)}</div></Card>}
          {done && <StrategyPicker question="Nasıl karşılaştırdın?" options={grade >= 7 ? [`${c.o[0].toUpperCase() + c.o.slice(1)} / tüm karışım kesirleri`, `1 ${c.unit} ${c.o} başına ${c.w} (birim oran)`, `${c.o[0].toUpperCase() + c.o.slice(1)} miktarlarını eşitledim`, 'Tahmin ettim'] : ['Kesirle (şurup / tüm karışım)', '1 bardak şurup başına su', 'Şurupları eşitledim', 'Tahmin ettim']} onPick={() => {}} />}
          {footer}
        </>
      }
    />
  )
}

