import { Fragment, useState } from 'react'
import { BookOpen, Search, Sparkles } from 'lucide-react'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { Card, Choices, Nudge, fmt, type useChecks } from '../donusum-studyosu/ortak'

/* ───────────── basamaklar ───────────── */

/** PLACE[e]: 10^e basamağı (renkler Basamak Laboratuvarı ile aynı) */
export const PLACE = [
  { name: 'Birler', unit: 'birlik', color: '#ca8a04', soft: '#fef9c3' },
  { name: 'Onlar', unit: 'onluk', color: '#16a34a', soft: '#dcfce7' },
  { name: 'Yüzler', unit: 'yüzlük', color: '#ea580c', soft: '#ffedd5' },
  { name: 'Binler', unit: 'binlik', color: '#db2777', soft: '#fce7f3' },
  { name: 'On binler', unit: 'on binlik', color: '#9333ea', soft: '#f3e8ff' },
]

export const n = (v: number) => fmt(v, 0)
/** e basamağındaki rakam; sayının o basamağı yoksa null */
export const digitAt = (v: number, e: number) => {
  const s = String(v)
  return e < s.length ? Number(s[s.length - 1 - e]) : null
}
export const cellsOf = (v: number, cols: number) => Array.from({ length: cols }, (_, e) => digitAt(v, e)?.toString() ?? null)
/** Soldan ilk farklı basamak (yoksa −1) */
export function firstDiff(a: number, b: number, cols: number) {
  for (let e = cols - 1; e >= 0; e--) if (digitAt(a, e) !== digitAt(b, e)) return e
  return -1
}
/** Her basamaktaki blok sayısı (counts[e]) */
export const countsOf = (v: number) => Array.from({ length: 5 }, (_, e) => digitAt(v, e) ?? 0)

/* ───────────── basamak tablosu ───────────── */

export type Mark = 'same' | 'diff'
/** cells[e]: o basamaktaki rakam (null: basamak yok); edit: değiştirilebilen basamaklar kesikli çerçeveli */
export interface Row { label: string; color: string; cells: (string | null)[]; edit?: number[] }

export function PlaceTable({ rows, marks = {}, lens, onCol, wrong }: { rows: Row[]; marks?: Partial<Record<number, Mark>>; lens?: number | null; onCol?: (e: number) => void; wrong?: number | null }) {
  const cols = rows[0].cells.length
  const es = Array.from({ length: cols }, (_, i) => cols - 1 - i)
  return (
    <div className="grid items-center gap-x-1.5 gap-y-1" style={{ gridTemplateColumns: `auto repeat(${cols}, minmax(0, 1fr))` }}>
      <span />
      {es.map((e) => (
        <div key={e} className="flex min-h-11 flex-col items-center justify-end text-center">
          {lens === e && <Search size={22} strokeWidth={3} className="mb-0.5 text-sky-600 animate-pop" aria-label="Büyüteç" />}
          <p className="text-[10px] leading-tight font-black uppercase sm:text-xs" style={{ color: PLACE[e].color }}>{PLACE[e].name}</p>
        </div>
      ))}
      {rows.map((r, ri) => (
        <Fragment key={ri}>
          {ri > 0 && (
            <>
              <span />
              {es.map((e) => (
                <span key={e} className={`h-5 text-center text-lg leading-5 font-black ${marks[e] === 'diff' ? 'text-pink-600' : 'text-slate-400'}`}>{marks[e] === 'same' ? '=' : marks[e] === 'diff' ? '≠' : ''}</span>
              ))}
            </>
          )}
          <span className="pr-1 text-sm font-black whitespace-nowrap" style={{ color: r.color }}>{r.label}</span>
          {es.map((e) => {
            const d = r.cells[e]
            const over = !!d && d.length > 1 && d !== '□'
            const state = lens === e ? 'ring-4 ring-sky-500 scale-105 z-10' : marks[e] === 'diff' ? 'ring-4 ring-pink-500' : wrong === e ? 'ring-4 ring-amber-400 animate-shake' : 'ring-1 ring-black/10'
            return (
              <button
                key={e}
                type="button"
                disabled={!onCol}
                onClick={() => onCol?.(e)}
                aria-label={`${r.label}: ${PLACE[e].name} basamağı ${d ?? 'boş'}`}
                className={`relative grid h-14 place-items-center rounded-xl font-black tabular-nums transition sm:h-16 ${state} ${marks[e] === 'same' ? 'opacity-40' : ''} ${r.edit?.includes(e) ? 'outline-2 outline-offset-2 outline-sky-400 outline-dashed' : ''} ${onCol ? 'cursor-pointer hover:brightness-95 active:scale-95' : 'cursor-default'} ${d === null ? 'border-2 border-dashed border-slate-300 bg-white/60' : ''} ${over ? 'animate-pulse bg-red-100! text-red-600!' : ''}`}
                style={d === null ? undefined : { background: PLACE[e].soft, color: PLACE[e].color }}
              >
                {d === null ? <span className="text-[11px] font-bold text-slate-400">boş</span> : <span className={over ? 'text-2xl' : 'text-3xl sm:text-4xl'}>{d}</span>}
              </button>
            )
          })}
        </Fragment>
      ))}
    </div>
  )
}

/* ───────────── onluk taban blokları ───────────── */

const GRID = 'bg-[linear-gradient(#0000_86%,#fff8_86%),linear-gradient(90deg,#0000_86%,#fff8_86%)] bg-[length:10%_10%]'

function Block({ e }: { e: number }) {
  if (e === 0) return <span className="size-1.5 rounded-[1px] bg-yellow-400 ring-1 ring-yellow-600" />
  if (e === 1) return <span className="h-10 w-1.5 rounded-[1px] bg-green-500 bg-[linear-gradient(#0000_86%,#fff8_86%)] bg-[length:100%_10%] ring-1 ring-green-700" />
  if (e === 2) return <span className={`size-10 rounded-[2px] bg-orange-400 ring-1 ring-orange-600 ${GRID}`} />
  if (e === 3) return <span className={`mt-1 mr-1 size-10 rounded-[2px] bg-pink-400 shadow-[4px_-4px_0_#be185d] ring-1 ring-pink-700 ${GRID}`} />
  // on binlik: 10 binlik küp üst üste
  return (
    <span className="mt-1 mr-1 flex h-[100px] w-10 flex-col-reverse overflow-hidden rounded-[2px] bg-purple-500 shadow-[4px_-4px_0_#6b21a8] ring-1 ring-purple-800">
      {Array.from({ length: 10 }, (_, i) => <span key={i} className="h-[10px] border-t border-white/50" />)}
    </span>
  )
}

/** Her basamağın blokları ayrı grupta; 10 olan grup “taşıyor” diye kırmızı çerçeveyle gösterilir */
export function BlockRow({ counts, label, color }: { counts: number[]; label?: string; color?: string }) {
  const es = counts.map((_, e) => e).reverse().filter((e) => counts[e] > 0)
  return (
    <div className="rounded-2xl bg-white/80 p-2 ring-1 ring-line">
      {label && <p className="mb-1 text-sm font-black" style={{ color }}>{label}</p>}
      <div className="flex flex-wrap items-end gap-3">
        {es.map((e) => (
          <div key={e} className={`flex flex-col items-center gap-1 rounded-xl p-1 ${counts[e] >= 10 ? 'bg-red-50 ring-2 ring-red-400' : ''}`}>
            <div className={`flex flex-wrap items-end gap-0.5 ${e === 0 ? 'w-[52px]' : e === 1 ? 'max-w-[90px]' : 'max-w-[240px]'}`}>
              {Array.from({ length: counts[e] }, (_, i) => <Block key={i} e={e} />)}
            </div>
            <span className="text-[11px] font-black whitespace-nowrap" style={{ color: PLACE[e].color }}>{counts[e]} {PLACE[e].unit}</span>
          </div>
        ))}
        {!es.length && <span className="text-sm font-bold text-ink-soft">Blok yok</span>}
      </div>
    </div>
  )
}

/* ───────────── on binlik kuleler ───────────── */

/**
 * Sayının bloklarını 10.000’lik kulelere doldurur: her kule 10 kat, her kat 1 binlik.
 * Yarım kalan kat, binliğin ne kadarının dolduğunu gösterir.
 */
export function Towers({ value, label, color, scale }: { value: number; label: string; color: string; scale: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-lg font-black tabular-nums" style={{ color }}>{label}</p>
      <div className="flex items-end gap-2">
        {Array.from({ length: scale }, (_, t) => {
          const full = value >= (t + 1) * 10000
          return (
            <div key={t} className="flex flex-col items-center gap-1">
              <div className={`flex h-[150px] w-14 flex-col-reverse rounded-lg p-0.5 ring-2 ${full ? 'bg-purple-100 ring-purple-600' : 'bg-white ring-slate-300'}`}>
                {Array.from({ length: 10 }, (_, k) => {
                  const f = Math.max(0, Math.min(1, (value - t * 10000 - k * 1000) / 1000))
                  return (
                    <div key={k} className="relative h-[14.5px] overflow-hidden border-t border-white">
                      <div className="h-full transition-[width] duration-700" style={{ width: `${f * 100}%`, background: full ? '#9333ea' : '#f472b6', transitionDelay: `${(t * 10 + k) * 60}ms` }} />
                    </div>
                  )
                })}
              </div>
              <span className={`text-[11px] font-black ${full ? 'text-purple-700' : 'text-slate-500'}`}>{full ? 'Dolu: 1 on binlik' : value > t * 10000 ? 'Dolmadı' : 'Boş'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────── büyüteçli sayı doğrusu ───────────── */

/** Üstte 40.000–50.000, altta büyüteçle açılan 45.000–46.000 aralığı */
export function ZoomLine({ a, b, band, colors }: { a: number; b: number; band: [number, number]; colors: [string, string] }) {
  const W = 600
  const top = (v: number) => 20 + ((v - 40000) / 10000) * 560
  const X = (v: number) => 20 + ((v - 45000) / 1000) * 560
  const ticks = Array.from({ length: 11 }, (_, i) => 45000 + i * 100)
  return (
    <svg viewBox={`0 0 ${W} 200`} className="w-full" role="img" aria-label={`Sayı doğrusu: ${n(a)} ve ${n(b)}`}>
      <line x1={20} x2={580} y1={22} y2={22} stroke="#94a3b8" strokeWidth={3} />
      {[40000, 45000, 50000].map((v) => (
        <g key={v}>
          <line x1={top(v)} x2={top(v)} y1={15} y2={29} stroke="#64748b" strokeWidth={2} />
          <text x={top(v) + (v === 45000 ? -6 : 0)} y={44} textAnchor={v === 45000 ? 'end' : 'middle'} fontSize={12} fontWeight={800} fill="#64748b">{n(v)}</text>
        </g>
      ))}
      <rect x={top(45000)} y={12} width={top(46000) - top(45000)} height={20} rx={4} fill="#0ea5e922" stroke="#0284c7" strokeWidth={2} />
      <path d={`M${top(45000)} 32 L20 95 M${top(46000)} 32 L580 95`} stroke="#0284c7" strokeWidth={1.5} strokeDasharray="5 4" fill="none" />
      <rect x={14} y={95} width={572} height={2} fill="#0284c7" opacity={0.4} />
      <rect x={X(band[0])} y={112} width={X(band[1]) - X(band[0])} height={26} rx={6} fill="#ffedd5" stroke="#ea580c" strokeDasharray="4 3" />
      <line x1={20} x2={580} y1={125} y2={125} stroke="#334155" strokeWidth={3} />
      {ticks.map((v, i) => (
        <g key={v}>
          <line x1={X(v)} x2={X(v)} y1={117} y2={133} stroke="#334155" strokeWidth={i % 5 === 0 ? 3 : 1.5} />
          <text x={X(v)} y={152} textAnchor="middle" fontSize={11} fontWeight={i % 5 === 0 ? 900 : 700} fill="#475569">{i % 5 === 0 ? n(v) : `.${String(v).slice(2, 3)}00`}</text>
        </g>
      ))}
      {[{ v: a, c: colors[0], y: 102 }, { v: b, c: colors[1], y: 180 }].map((m, i) => (
        <g key={i} style={{ transition: 'transform 0.4s' }} transform={`translate(${X(m.v)} 0)`}>
          <circle cx={0} cy={125} r={8} fill={m.c} stroke="#fff" strokeWidth={2.5} />
          <rect x={-34} y={m.y - 15} width={68} height={22} rx={7} fill={m.c} />
          <text x={0} y={m.y} textAnchor="middle" fontSize={13} fontWeight={900} fill="#fff">{n(m.v)}</text>
        </g>
      ))}
    </svg>
  )
}

/* ───────────── soru kartı ───────────── */

export interface Opt { label: string; ok?: boolean; nudge?: string; mis?: string }
export interface Ask { q: string; options: Opt[] }
type Checks = ReturnType<typeof useChecks>

export function AskBox({ ask, checks, onOk, okText = 'Evet! Model de bunu gösteriyor.' }: { ask: Ask; checks: Checks; onOk: () => void; okText?: string }) {
  const track = useTracker()
  const [pick, setPick] = useState<number | null>(null)
  const [miss, setMiss] = useState(0)
  const [ok, setOk] = useState(false)
  const choose = (i: number) => {
    if (ok) return
    setPick(i)
    if (ask.options[i].ok) {
      track.attempt(true)
      sfx.ok()
      setOk(true)
      window.setTimeout(onOk, 700)
      return
    }
    checks.fail()
    setMiss((m) => m + 1)
  }
  const o = pick === null ? null : ask.options[pick]
  return (
    <Card>
      <p className="mb-2 flex items-start gap-2 font-extrabold"><BookOpen size={18} className="mt-0.5 shrink-0 text-pink-600" />{ask.q}</p>
      <Choices cols={1} options={ask.options.map((x, i) => ({ id: i, label: x.label }))} value={pick} onPick={choose} disabled={ok} />
      {o && !o.ok && <div className="mt-2"><Nudge key={miss} question={o.nudge ?? 'Modele tekrar bak.'} misconception={o.mis} /></div>}
      {ok && <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800 ring-1 ring-emerald-300 animate-pop">{okText}</p>}
    </Card>
  )
}

export function RulesFound({ rules }: { rules: string[] }) {
  return (
    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-950 ring-2 ring-emerald-400 animate-fade-up">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-black tracking-wide uppercase"><Sparkles size={15} />Keşfettiğin kural</p>
      <ul className="space-y-1">
        {rules.map((r) => <li key={r} className="flex gap-2 text-[15px] font-extrabold"><span aria-hidden>✓</span>{r}</li>)}
      </ul>
    </div>
  )
}
