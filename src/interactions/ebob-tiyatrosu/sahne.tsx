import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, BookOpen, Flag, Ticket } from 'lucide-react'
import type { Grade } from '../../data/types'
import { Scene, StrategyPicker } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { MathText } from '../../components/MathText'
import { factorize, sup } from '../../lib/numberTheory'
import { gen } from '../../lib/generators'
import { CheckButton, Choices, Header, Nudge, NumPad, Split, parseNum, useChecks } from '../donusum-studyosu/ortak'

/**
 * Matematik Tiyatrosu (EBOB ve EKOK Tiyatrosu ortak motoru)
 *
 * Bir oyun perdelerden (Act) oluşur; her perde sırayla oynanan vuruşlardan (Beat) oluşur:
 *  - line:     bir oyuncunun repliği (öğrenci “İleri” ile ilerletir, otomatik akmaz)
 *  - ask:      seyirciye soru (sayı, tek seçim ya da çoklu seçim). Çözülmeden ilerlenmez; yanlışta Nudge.
 *  - rule:     seyircinin cevabından türeyen kural, Kural Defteri’ne yazılır
 *  - strategy: “Nasıl düşündün?” (öğretmen raporu)
 * Vuruşlar `cast` ile sahneye yeni oyuncu çıkarabilir, `board` ile sahne dekorunu (bölenler, basamaklar,
 * asal çarpanlar…) değiştirebilir; ikisi de sonraki vuruşlarda sürer.
 */

/* ───────────── türler ───────────── */

export interface Cast {
  name: string
  /** Kostümde yazan (sayı ya da “EBOB”) */
  label: string
  color: string
  kind?: 'number' | 'director' | 'guest'
  mood?: 'happy' | 'confused'
}

export type AskSpec =
  | { kind: 'number'; prompt: string; answer: number; hint: (v: number) => string; misconception?: (v: number) => string | undefined; ok: string }
  | { kind: 'choice'; prompt: string; options: { id: string; label: string }[]; answer: string | string[]; hint: (id: string) => string; misconception?: (id: string) => string | undefined; ok: string; cols?: 1 | 2 }
  | { kind: 'multi'; prompt: string; options: number[]; answer: number[]; hint: (picked: number[]) => string; ok: string }

export interface RuleCard {
  id: string
  title: string
  text: string
  example?: string
}

export type Beat =
  | { t: 'line'; who: number; text: string; cast?: Cast[]; board?: ReactNode }
  | { t: 'ask'; who: number; ask: AskSpec; cast?: Cast[]; board?: ReactNode }
  | { t: 'rule'; rule: RuleCard; board?: ReactNode }
  | { t: 'strategy'; question: string; options: string[] }

export interface Act {
  title: string
  cast: Cast[]
  beats: Beat[]
  board?: ReactNode
}

/* ───────────── renkler ───────────── */

const PALETTE = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316']
const colorCache = new Map<number, string>()
/** Aynı sayı her perdede aynı kostümü giysin */
export function colorFor(n: number) {
  if (!colorCache.has(n)) colorCache.set(n, PALETTE[colorCache.size % PALETTE.length])
  return colorCache.get(n)!
}
export const num = (n: number, mood?: Cast['mood']): Cast => ({ name: String(n), label: String(n), color: colorFor(n), kind: 'number', mood })

/* ───────────── oyuncu ───────────── */

function Actor({ c, speaking }: { c: Cast; speaking: boolean }) {
  const skin = '#ffd9b3'
  const confused = c.mood === 'confused'
  const fs = c.label.length >= 4 ? 13 : c.label.length === 3 ? 17 : 22
  return (
    <div className={`flex flex-col items-center transition-transform duration-300 ${speaking ? '-translate-y-1 scale-110' : 'scale-95 opacity-90'}`}>
      <svg viewBox="0 0 80 112" className="h-[92px] w-[66px] sm:h-[112px] sm:w-[80px]" aria-hidden>
        <ellipse cx="40" cy="106" rx="24" ry="5" fill="#000" opacity="0.3" />
        <rect x="27" y="86" width="9" height="18" rx="4" fill="#334155" />
        <rect x="44" y="86" width="9" height="18" rx="4" fill="#334155" />
        <path d={speaking ? 'M15 58 L4 44' : 'M15 60 L7 78'} stroke={c.color} strokeWidth="7" strokeLinecap="round" />
        <path d={speaking ? 'M65 58 L76 46' : 'M65 60 L73 78'} stroke={c.color} strokeWidth="7" strokeLinecap="round" />
        <rect x="13" y="45" width="54" height="46" rx="16" fill={c.color} stroke="#0f172a" strokeOpacity="0.25" strokeWidth="2" />
        <rect x="20" y="52" width="40" height="30" rx="10" fill="#fff" opacity="0.92" />
        <text x="40" y="68" textAnchor="middle" dominantBaseline="central" fontSize={fs} fontWeight="900" fill="#0f172a">{c.label}</text>
        <circle cx="40" cy="26" r="19" fill={skin} stroke="#0f172a" strokeOpacity="0.15" />
        {confused ? (
          <>
            <path d="M29 22 q3 -4 6 0 q-3 4 -6 0" stroke="#0f172a" strokeWidth="2" fill="none" />
            <path d="M45 22 q3 -4 6 0 q-3 4 -6 0" stroke="#0f172a" strokeWidth="2" fill="none" />
            <ellipse cx="40" cy="35" rx="3.5" ry="4" fill="#0f172a" />
          </>
        ) : (
          <>
            <circle cx="33" cy="24" r="2.6" fill="#0f172a" />
            <circle cx="47" cy="24" r="2.6" fill="#0f172a" />
            <path d={speaking ? 'M32 32 q8 9 16 0 z' : 'M33 33 q7 6 14 0'} stroke="#0f172a" strokeWidth="2.2" fill={speaking ? '#be123c' : 'none'} strokeLinecap="round" />
          </>
        )}
        <circle cx="28" cy="31" r="3" fill="#fb7185" opacity="0.45" />
        <circle cx="52" cy="31" r="3" fill="#fb7185" opacity="0.45" />
        {c.kind === 'director' && (
          <>
            <ellipse cx="38" cy="10" rx="20" ry="7" fill="#1e293b" />
            <circle cx="40" cy="4" r="3" fill="#1e293b" />
            <path d="M24 40 L40 46 L56 40" stroke="#fde047" strokeWidth="4" fill="none" strokeLinejoin="round" />
          </>
        )}
        {c.kind === 'guest' && <path d="M27 9 L32 1 L37 8 L40 0 L43 8 L48 1 L53 9 Z" fill="#fde047" stroke="#ca8a04" strokeWidth="1.5" />}
        {c.kind === 'number' && <path d="M33 45 L40 50 L47 45 L47 52 L40 48 L33 52 Z" fill="#0f172a" opacity="0.8" />}
      </svg>
      {c.kind !== 'number' && <span className={`mt-0.5 max-w-[86px] truncate rounded-full px-2 py-0.5 text-[11px] font-black ${speaking ? 'bg-amber-300 text-slate-900' : 'bg-slate-900/70 text-slate-200'}`}>{c.name}</span>}
    </div>
  )
}

/* ───────────── sahne ───────────── */

const velvet = 'repeating-linear-gradient(90deg,#7f1d1d 0 9px,#b91c1c 9px 21px,#991b1b 21px 30px)'

function Stage({ cast, speaker, text, open, board, curtainTitle }: { cast: Cast[]; speaker: number | null; text: string | null; open: boolean; board: ReactNode; curtainTitle: ReactNode }) {
  const n = Math.max(1, cast.length)
  const x = speaker === null ? 50 : ((speaker + 0.5) / n) * 100
  return (
    <div className="relative overflow-hidden rounded-3xl ring-1 ring-slate-600" style={{ background: 'radial-gradient(ellipse at 50% 0,#3b1d4a 0,#1a1026 55%,#0d0a14 100%)' }}>
      {/* üst saçak */}
      <div className="relative z-20 h-5" style={{ background: velvet }} />
      <div className="relative z-20 -mt-px h-3" style={{ background: 'radial-gradient(circle at 50% 0,#991b1b 68%,transparent 70%) 0 0/26px 12px repeat-x' }} />

      {/* spot ışığı */}
      {open && speaker !== null && (
        <div
          className="pointer-events-none absolute top-0 bottom-0 z-0 w-48 -translate-x-1/2 transition-[left] duration-300"
          style={{ left: `${x}%`, background: 'linear-gradient(180deg,rgba(255,244,214,0.32),rgba(255,244,214,0.06))', clipPath: 'polygon(42% 0,58% 0,100% 100%,0 100%)' }}
          aria-hidden
        />
      )}

      {/* konuşma balonu */}
      <div className="relative z-10 mx-7 mt-1 min-h-[96px] sm:mx-9 sm:min-h-[88px]">
        {open && text && (
          <div key={text} className="relative rounded-2xl bg-white px-4 py-3 text-[15px] leading-snug font-extrabold text-slate-900 shadow-lg animate-pop sm:text-base" aria-live="polite">
            {speaker !== null && <span className="mb-0.5 block text-[11px] font-black tracking-wide uppercase" style={{ color: cast[speaker]?.color }}>{cast[speaker]?.name}</span>}
            <MathText text={text} />
            <span className="absolute -bottom-2 size-4 rotate-45 bg-white" style={{ left: `clamp(16px, calc(${x}% - 8px), calc(100% - 32px))` }} />
          </div>
        )}
      </div>

      {/* oyuncular */}
      <div className="relative z-10 mt-2 grid items-end px-6 sm:px-8" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {cast.map((c, i) => (
          <div key={c.name + i} className="flex justify-center animate-fade-up">
            <Actor c={c} speaking={open && speaker === i} />
          </div>
        ))}
      </div>

      {/* sahne zemini ve dekor */}
      <div className="relative z-10 border-t-4 border-amber-900/80 px-6 pt-3 pb-3 sm:px-8" style={{ background: 'repeating-linear-gradient(90deg,#6b3d16 0 46px,#5a3211 46px 48px),linear-gradient(#6b3d16,#3f230b)' }}>
        <div className="min-h-[72px]">{board}</div>
      </div>

      {/* perdeler */}
      <div className={`absolute inset-y-0 left-0 z-30 w-1/2 shadow-[8px_0_20px_rgba(0,0,0,0.5)] transition-transform duration-700 ease-in-out ${open ? '-translate-x-[94%]' : 'translate-x-0'}`} style={{ background: `linear-gradient(90deg,rgba(0,0,0,0.25),transparent 30%,rgba(0,0,0,0.3)),${velvet}` }} aria-hidden />
      <div className={`absolute inset-y-0 right-0 z-30 w-1/2 shadow-[-8px_0_20px_rgba(0,0,0,0.5)] transition-transform duration-700 ease-in-out ${open ? 'translate-x-[94%]' : 'translate-x-0'}`} style={{ background: `linear-gradient(270deg,rgba(0,0,0,0.25),transparent 30%,rgba(0,0,0,0.3)),${velvet}` }} aria-hidden />
      {!open && (
        <div className="absolute inset-0 z-40 grid place-items-center p-6 text-center">
          <div className="rounded-3xl bg-slate-950/70 px-6 py-5 text-white shadow-2xl ring-2 ring-amber-300/70 animate-pop">{curtainTitle}</div>
        </div>
      )}
    </div>
  )
}

/* ───────────── sahne dekorları ───────────── */

const Plate = ({ children }: { children: ReactNode }) => <div className="rounded-2xl bg-slate-950/55 p-2.5 ring-1 ring-amber-200/20 animate-fade-up">{children}</div>
const RowLabel = ({ n }: { n: number }) => (
  <span className="grid h-10 min-w-10 shrink-0 place-items-center rounded-xl px-1.5 text-base font-black text-slate-900" style={{ background: colorFor(n) }}>{n}</span>
)

/** İki sayının bölen aksesuarları; mark verilirse o sayılar parlar, diğerleri soluklaşır */
export function DivisorBoard({ rows, mark, crown }: { rows: { n: number; list: number[] }[]; mark?: number[]; crown?: number }) {
  return (
    <Plate>
      <p className="mb-1.5 text-[11px] font-black tracking-wide text-amber-200 uppercase">Bölen aksesuarları</p>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.n} className="flex items-center gap-1.5">
            <RowLabel n={r.n} />
            <div className="flex flex-wrap gap-1">
              {r.list.map((d) => {
                const on = mark?.includes(d)
                return (
                  <span key={d} className={`relative grid size-9 place-items-center rounded-full text-sm font-black transition ${mark ? (on ? 'bg-amber-300 text-slate-900 shadow-[0_0_12px_#fcd34d]' : 'bg-slate-700 text-slate-400') : 'bg-white text-slate-900'}`}>
                    {d}
                    {crown === d && <span className="absolute -top-3 text-sm" aria-hidden>👑</span>}
                  </span>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </Plate>
  )
}

/** Kat basamakları: a ve b’nin ayak izleri; upTo’ya kadar basamak, reach’e kadar adım görünür */
export function StepsBoard({ a, b, upTo, reachA, reachB, mark }: { a: number; b: number; upTo: number; reachA: number; reachB: number; mark?: boolean }) {
  const cols = Math.min(12, upTo)
  return (
    <Plate>
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] font-black tracking-wide text-amber-200 uppercase">
        <span>Kat basamakları</span>
        <span className="flex items-center gap-1 normal-case"><span className="size-3 rounded-full" style={{ background: colorFor(a) }} />{gen(a)} adımları</span>
        <span className="flex items-center gap-1 normal-case"><span className="size-3 rounded-full" style={{ background: colorFor(b) }} />{gen(b)} adımları</span>
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: upTo }, (_, i) => i + 1).map((k) => {
          const A = k % a === 0 && k <= reachA
          const B = k % b === 0 && k <= reachB
          const both = mark && A && B
          return (
            <span key={k} className={`relative flex h-9 flex-col items-center justify-center rounded-md text-[11px] font-black sm:h-10 sm:text-xs ${both ? 'bg-amber-300 text-slate-900 shadow-[0_0_10px_#fcd34d]' : 'bg-slate-800/90 text-slate-300'}`}>
              {k}
              <span className="flex gap-0.5">
                {A && <span className="size-2 rounded-full" style={{ background: colorFor(a) }} />}
                {B && <span className="size-2 rounded-full" style={{ background: colorFor(b) }} />}
              </span>
            </span>
          )
        })}
      </div>
    </Plate>
  )
}

/**
 * Asal çarpan kostümleri: her sayının asal çarpanları sütunlarda hizalanır.
 * take: 'min' (EBOB) ya da 'max' (EKOK) verilirse alınacak kutular parlar ve sonuç satırı yazılır.
 */
export function FactorBoard({ a, b, take }: { a: number; b: number; take?: 'min' | 'max' }) {
  const fa = new Map(factorize(a)), fb = new Map(factorize(b))
  const primes = [...new Set([...fa.keys(), ...fb.keys()])].sort((x, y) => x - y)
  const pick = (p: number) => (take === 'min' ? Math.min(fa.get(p) ?? 0, fb.get(p) ?? 0) : Math.max(fa.get(p) ?? 0, fb.get(p) ?? 0))
  const result = primes.filter((p) => pick(p) > 0).map((p) => (pick(p) > 1 ? `${p}${sup(pick(p))}` : String(p))).join(' · ') || '1'
  const row = (n: number, f: Map<number, number>) => (
    <div className="flex items-center gap-1.5">
      <RowLabel n={n} />
      <span className="text-sm font-black text-slate-300">=</span>
      <div className="flex flex-wrap gap-2">
        {primes.map((p) => {
          const e = f.get(p) ?? 0
          return (
            <span key={p} className="flex gap-0.5 rounded-lg bg-slate-800/70 p-1">
              {e === 0 && <span className="grid size-8 place-items-center rounded-md border border-dashed border-slate-500 text-xs font-black text-slate-500">–</span>}
              {Array.from({ length: e }, (_, i) => {
                const glow = take && (take === 'min' ? i < pick(p) : e === pick(p))
                return <span key={i} className={`grid size-8 place-items-center rounded-md text-sm font-black ${glow ? 'bg-amber-300 text-slate-900 shadow-[0_0_10px_#fcd34d]' : 'bg-white text-slate-900'}`}>{p}</span>
              })}
            </span>
          )
        })}
      </div>
    </div>
  )
  return (
    <Plate>
      <p className="mb-1.5 text-[11px] font-black tracking-wide text-amber-200 uppercase">Asal çarpan kostümleri</p>
      <div className="space-y-1.5">
        {row(a, fa)}
        {row(b, fb)}
      </div>
      {take && <p className="mt-2 rounded-xl bg-amber-300/15 px-3 py-1.5 text-sm font-black text-amber-100">{take === 'min' ? 'EBOB' : 'EKOK'}({a}, {b}) = {result}</p>}
    </Plate>
  )
}

/** Sahnede asılı tabelalar */
export function SignBoard({ lines, title }: { lines: { text: string; tone?: 'ok' | 'bad' | 'plain' }[]; title?: string }) {
  return (
    <Plate>
      {title && <p className="mb-1.5 text-[11px] font-black tracking-wide text-amber-200 uppercase">{title}</p>}
      <div className="flex flex-wrap gap-1.5">
        {lines.map((l, i) => (
          <span key={i} className={`rounded-xl px-3 py-2 text-base font-black animate-pop ${l.tone === 'bad' ? 'bg-rose-500/90 text-white line-through decoration-2' : l.tone === 'ok' ? 'bg-emerald-400 text-slate-900' : 'bg-white text-slate-900'}`}>
            <MathText text={l.text} />
          </span>
        ))}
      </div>
    </Plate>
  )
}

/* ───────────── seyirci sorusu ───────────── */

function AskCard({ spec, onSolved }: { spec: AskSpec; onSolved: (first: boolean) => void }) {
  const checks = useChecks()
  const [val, setVal] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [multi, setMulti] = useState<number[]>([])
  const [fb, setFb] = useState<{ text: string; mis?: string; n: number } | null>(null)
  const [done, setDone] = useState(false)

  const pass = () => {
    const first = checks.pass()
    setDone(true)
    setFb(null)
    onSolved(first)
  }
  const fail = (text: string, mis?: string) => {
    checks.fail()
    setFb((f) => ({ text, mis, n: (f?.n ?? 0) + 1 }))
  }

  const checkNumber = () => {
    if (spec.kind !== 'number') return
    const v = parseNum(val)
    if (Number.isNaN(v)) return
    if (v === spec.answer) return pass()
    fail(spec.hint(v), spec.misconception?.(v))
    setVal('')
  }
  const pickChoice = (id: string) => {
    if (spec.kind !== 'choice' || done) return
    setPicked(id)
    const ok = Array.isArray(spec.answer) ? spec.answer.includes(id) : spec.answer === id
    if (ok) pass()
    else fail(spec.hint(id), spec.misconception?.(id))
  }
  const checkMulti = () => {
    if (spec.kind !== 'multi') return
    const a = [...multi].sort((x, y) => x - y), b = [...spec.answer].sort((x, y) => x - y)
    if (a.length === b.length && a.every((x, i) => x === b[i])) pass()
    else fail(spec.hint(a))
  }

  return (
    <div className="rounded-2xl bg-white p-3 text-ink shadow-sm ring-2 ring-amber-300">
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-black tracking-wide text-amber-700 uppercase"><Ticket size={15} />Seyirciye soru</p>
      <p className="mb-3 text-[17px] leading-snug font-extrabold"><MathText text={spec.prompt} /></p>
      {spec.kind === 'number' && (
        <>
          <NumPad value={val} onChange={setVal} max={5} disabled={done} />
          {!done && <div className="mt-2"><CheckButton onClick={checkNumber} disabled={val === ''}>Söyle</CheckButton></div>}
        </>
      )}
      {spec.kind === 'choice' && <Choices options={spec.options.map((o) => ({ id: o.id, label: <MathText text={o.label} /> }))} value={picked} onPick={pickChoice} disabled={done} cols={spec.cols ?? 1} />}
      {spec.kind === 'multi' && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {spec.options.map((o) => {
              const on = multi.includes(o)
              return (
                <button
                  key={o}
                  type="button"
                  disabled={done}
                  aria-pressed={on}
                  onClick={() => setMulti((m) => (on ? m.filter((x) => x !== o) : [...m, o]))}
                  className={`grid size-12 place-items-center rounded-full text-lg font-black ring-2 transition active:scale-95 ${on ? 'bg-amber-400 text-slate-900 ring-amber-600' : 'bg-white text-ink ring-line hover:bg-amber-50'}`}
                >
                  {o}
                </button>
              )
            })}
          </div>
          {!done && <div className="mt-3"><CheckButton onClick={checkMulti} disabled={multi.length === 0}>Söyle</CheckButton></div>}
        </>
      )}
      {fb && !done && (
        <div className="mt-3">
          <Nudge key={fb.n} question={fb.text} misconception={fb.mis} />
        </div>
      )}
      {done && (
        <div className="mt-3">
          <Nudge question={spec.ok} tone="ok" />
        </div>
      )}
    </div>
  )
}

/* ───────────── kural defteri ───────────── */

function Notebook({ rules, fresh, big }: { rules: RuleCard[]; fresh?: string; big?: boolean }) {
  return (
    <div className="rounded-2xl bg-amber-50 p-3 text-ink ring-1 ring-amber-200">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-black text-amber-900"><BookOpen size={17} />Kural Defteri <span className="ml-auto chip bg-white text-amber-800">{rules.length}</span></p>
      {rules.length === 0 ? (
        <p className="text-sm font-bold text-amber-800/80">Perdeler ilerledikçe keşfettiğin kurallar buraya yazılacak.</p>
      ) : (
        <ol className="space-y-1.5">
          {rules.map((r, i) => (
            <li key={r.id} className={`rounded-xl bg-white ring-1 ring-amber-200 ${fresh === r.id ? 'animate-pop ring-2 ring-amber-400' : ''}`}>
              <details open={big} className="group">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-2.5 py-2 text-sm font-black text-amber-900 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">{i + 1}. {r.title}</span>
                  {!big && <span className="shrink-0 text-xs text-amber-700 group-open:rotate-180" aria-hidden>▾</span>}
                </summary>
                <div className="px-2.5 pb-2.5">
                  <p className="text-sm font-bold text-ink"><MathText text={r.text} /></p>
                  {r.example && <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-extrabold text-amber-900"><MathText text={r.example} /></p>}
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/* ───────────── tiyatro ───────────── */

function lastOf<T>(beats: Beat[], upto: number, get: (b: Beat) => T | undefined, fallback: T): T {
  for (let i = Math.min(upto, beats.length - 1); i >= 0; i--) {
    const v = get(beats[i])
    if (v !== undefined) return v
  }
  return fallback
}

export function Theater({ grade, acts, emoji, playTitle, onFinish, finish }: {
  grade: Grade
  acts: Act[]
  emoji: string
  playTitle: string
  onFinish: (r: { summary: string; insight?: string; stars?: 1 | 2 | 3 }) => void
  finish: { insight: string; summary: (rules: number, asks: number) => string }
}) {
  const [ai, setAi] = useState(0)
  const [bi, setBi] = useState(0)
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [solved, setSolved] = useState(false)
  const [picked, setPicked] = useState(false)
  const [rules, setRules] = useState<RuleCard[]>([])
  const firsts = useRef<boolean[]>([])
  const act = acts[ai]
  const beat = act.beats[bi]
  const cast = lastOf<Cast[]>(act.beats, bi, (b) => ('cast' in b ? b.cast : undefined), act.cast)
  const board = lastOf<ReactNode>(act.beats, bi, (b) => ('board' in b ? b.board : undefined), act.board ?? null)
  const totalAsks = useMemo(() => acts.reduce((s, a) => s + a.beats.filter((b) => b.t === 'ask').length, 0), [acts])

  // Kural vuruşuna gelince deftere yaz
  useEffect(() => {
    if (open && beat?.t === 'rule') setRules((r) => (r.some((x) => x.id === beat.rule.id) ? r : [...r, beat.rule]))
  }, [open, beat])

  const lastBeat = bi === act.beats.length - 1
  const lastAct = ai === acts.length - 1
  const next = () => {
    setSolved(false)
    setPicked(false)
    if (!lastBeat) return setBi(bi + 1)
    setOpen(false)
    if (lastAct) return setClosing(true)
    setAi(ai + 1)
    setBi(0)
  }
  const done = () => {
    const f = firsts.current.filter(Boolean).length
    onFinish({ stars: starsFor(f / Math.max(1, totalAsks)), summary: finish.summary(rules.length, totalAsks), insight: finish.insight })
  }

  const speaker = beat && (beat.t === 'line' || beat.t === 'ask') ? beat.who : null
  const text = beat ? (beat.t === 'line' ? beat.text : beat.t === 'ask' ? beat.ask.prompt : beat.t === 'rule' ? `📜 Kural Defteri’ne yaz: ${beat.rule.title}` : beat.question) : null
  const canNext = beat && (beat.t === 'line' || beat.t === 'rule' || (beat.t === 'ask' && solved) || (beat.t === 'strategy' && picked))

  const curtainTitle = closing ? (
    <>
      <p className="text-4xl" aria-hidden>👏🎭👏</p>
      <p className="mt-1 text-xl font-black">Perde kapandı!</p>
      <p className="text-sm font-bold text-amber-200">{playTitle} sona erdi. Seyirciler ayakta alkışlıyor.</p>
    </>
  ) : (
    <>
      <p className="text-xs font-black tracking-widest text-amber-300 uppercase">{playTitle}</p>
      <p className="mt-1 text-2xl font-black">{ai + 1}. Perde</p>
      <p className="text-lg font-extrabold text-amber-100">{act.title}</p>
    </>
  )

  const panel = closing ? (
    <>
      <Notebook rules={rules} big />
      <button type="button" onClick={done} className="btn-primary min-h-14 w-full text-lg animate-fade-up">Gösteriyi bitir <Flag size={20} /></button>
    </>
  ) : !open ? (
    <>
      <div className="rounded-2xl bg-slate-800/90 p-4 text-slate-100 ring-1 ring-slate-600">
        <p className="text-sm font-bold text-slate-300">{ai === 0 ? 'Salon karardı, seyirci yerini aldı. Sen de seyircisin: oyuncular sana sorular soracak!' : 'Kısa bir ara… Kural Defteri’ne bir göz at, sonra perde yeniden açılıyor.'}</p>
        <button type="button" onClick={() => setOpen(true)} className="btn-primary mt-3 min-h-14 w-full text-lg" autoFocus>🎭 Perdeyi aç</button>
      </div>
      <Notebook rules={rules} />
    </>
  ) : (
    <>
      {beat.t === 'ask' && <AskCard key={`${ai}-${bi}`} spec={beat.ask} onSolved={(first) => { firsts.current.push(first); setSolved(true) }} />}
      {beat.t === 'strategy' && <StrategyPicker key={`${ai}-${bi}`} question={beat.question} options={beat.options} onPick={() => setPicked(true)} />}
      {beat.t === 'rule' && (
        <div className="rounded-2xl bg-amber-300 p-3 text-slate-900 shadow-lg animate-pop">
          <p className="text-[11px] font-black tracking-wide uppercase">📜 Yeni kural</p>
          <p className="text-lg font-black">{beat.rule.title}</p>
          <p className="mt-1 text-[15px] font-bold"><MathText text={beat.rule.text} /></p>
          {beat.rule.example && <p className="mt-1.5 rounded-lg bg-white/70 px-2 py-1 text-sm font-extrabold"><MathText text={beat.rule.example} /></p>}
        </div>
      )}
      {beat.t === 'line' && (
        <p className="rounded-2xl bg-slate-800/80 px-3 py-2 text-sm font-bold text-slate-300 ring-1 ring-slate-600">
          🎟️ Repliği oku, hazır olunca “İleri”ye dokun. Seyirciye soru geldiğinde oyun seni bekler.
        </p>
      )}
      {canNext && (
        <button type="button" onClick={next} className="btn-primary min-h-14 w-full text-lg animate-fade-up">
          {lastBeat ? (lastAct ? <>Son perdeyi kapat <Flag size={20} /></> : <>Perdeyi kapat <ArrowRight size={20} /></>) : <>İleri <ArrowRight size={20} /></>}
        </button>
      )}
      <Notebook rules={rules} fresh={beat.t === 'rule' ? beat.rule.id : undefined} />
    </>
  )

  return (
    <Scene grade={grade}>
      <Header emoji={emoji} kicker="Perde" title={closing ? 'Perde kapanış' : act.title} idx={closing ? acts.length - 1 : ai} total={acts.length} dark />
      <Split
        work={<Stage cast={closing ? [] : cast} speaker={speaker} text={text} open={open && !closing} board={closing ? null : board} curtainTitle={curtainTitle} />}
        panel={panel}
      />
    </Scene>
  )
}
