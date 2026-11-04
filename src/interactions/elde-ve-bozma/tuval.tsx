import { useState, type ReactNode } from 'react'
import { BookOpen } from 'lucide-react'
import { Card, Choices, Nudge, type useChecks } from '../donusum-studyosu/ortak'

/* ───────────── basamaklar ───────────── */

/** PLACE[e]: 10^e basamağı (renkler Basamak Laboratuvarı ile aynı) */
export const PLACE = [
  { name: 'Birlikler', unit: 'birlik', color: '#ca8a04', soft: '#fef9c3' },
  { name: 'Onluklar', unit: 'onluk', color: '#16a34a', soft: '#dcfce7' },
  { name: 'Yüzlükler', unit: 'yüzlük', color: '#ea580c', soft: '#ffedd5' },
]
export const COLS = PLACE.length

export const dig = (v: number, e: number) => Math.floor(v / 10 ** e) % 10
export const digits = (v: number) => Array.from({ length: COLS }, (_, e) => dig(v, e))

/** elde: toplamada bağlanıp komşuya taşınan blok; boz: çıkarmada bozulup gelen blok */
export type Kind = 'n' | 'elde' | 'boz'
export interface Blk { id: number; k: Kind }
/** cells[e]: e basamağındaki bloklar */
export type Cells = Blk[][]

export const countsOf = (c: Cells) => c.map((x) => x.length)
export const valueOf = (c: Cells) => c.reduce((s, x, e) => s + x.length * 10 ** e, 0)
/** “2 yüzlük + 4 onluk + 12 birlik = 252” */
export function expr(c: Cells) {
  const parts = [...c.keys()].reverse().filter((e) => c[e].length).map((e) => `${c[e].length} ${PLACE[e].unit}`)
  return parts.length ? `${parts.join(' + ')} = ${valueOf(c)}` : '0'
}

/**
 * Çıkarmada, şu anki bloklarla her sütunda kalan alınacak miktar (rem) alınıp sonunda hiçbir sütunda
 * 9’dan fazla blok kalmadan bitirilebilir mi? Sağdan sola: yetmeyen sütun, solundakinden gereken kadar bozar.
 */
export function canFinish(counts: number[], rem: number[]) {
  let borrow = 0
  for (let e = 0; e < counts.length; e++) {
    const v = counts[e] - borrow - rem[e]
    const x = v < 0 ? Math.ceil(-v / 10) : 0
    if (v + 10 * x > 9) return false
    borrow = x
  }
  return borrow === 0
}

/* ───────────── taban blokları ───────────── */

const U = 12
const GRID = 'bg-[linear-gradient(#0000_86%,#fff9_86%),linear-gradient(90deg,#0000_86%,#fff9_86%)] bg-[length:10%_10%]'

function Block({ e, k, sel }: { e: number; k: Kind; sel: boolean }) {
  const mark = sel ? 'ring-[3px] ring-sky-500 -translate-y-1' : k !== 'n' ? 'ring-2 ring-amber-500 animate-pop' : 'ring-1'
  if (e === 0) return <span className={`block rounded-[2px] bg-yellow-400 ring-yellow-700 transition ${mark}`} style={{ width: U, height: U }} />
  if (e === 1) return <span className={`block rounded-[2px] bg-green-500 bg-[linear-gradient(#0000_86%,#fff9_86%)] bg-[length:100%_10%] ring-green-800 transition ${mark}`} style={{ width: U, height: U * 10 }} />
  return <span className={`block rounded-[3px] bg-orange-400 ring-orange-700 transition ${GRID} ${mark}`} style={{ width: U * 10, height: U * 10 }} />
}

export interface MatRow {
  label: string
  color: string
  cells: Cells
  /** sütunda 10 ya da daha fazla blok varsa “kalabalık” uyarısı */
  crowd?: boolean
  faded?: boolean
  /** bu satırda vurgulanan sütun */
  active?: number | null
  /** satırın üstündeki ayraç (ör. “+”, “−”, toplam çizgisi) */
  sep?: ReactNode
}

/**
 * Polypad tuvali gibi: üç sütun (Yüzlükler · Onluklar · Birlikler), her satır bir sayı.
 * Bloğa dokunma onBlock ile bildirilir; onAdd verilirse her hücrede “+” düğmesi çıkar (kurma).
 */
export function Mat({ rows, sel, onBlock, onAdd }: { rows: MatRow[]; sel?: Set<number>; onBlock?: (row: number, e: number, id: number) => void; onAdd?: (row: number, e: number) => void }) {
  const es = [...PLACE.keys()].reverse()
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-[minmax(136px,1.35fr)_minmax(0,1fr)_minmax(0,1fr)] gap-1.5">
        {es.map((e) => (
          <p key={e} className="rounded-xl py-1.5 text-center text-xs font-black tracking-wide uppercase sm:text-sm" style={{ background: PLACE[e].color, color: '#fff' }}>{PLACE[e].name}</p>
        ))}
      </div>
      {rows.map((r, ri) => (
        <div key={ri} className={`flex flex-col gap-1 ${r.faded ? 'opacity-55' : ''}`}>
          {r.sep}
          <p className="flex flex-wrap items-baseline justify-between gap-x-2 px-1 text-sm font-black">
            <span style={{ color: r.color }}>{r.label}</span>
            <span className="text-xs font-extrabold text-ink-soft tabular-nums">{expr(r.cells)}</span>
          </p>
          <div className="grid grid-cols-[minmax(136px,1.35fr)_minmax(0,1fr)_minmax(0,1fr)] gap-1.5">
            {es.map((e) => {
              const list = r.cells[e]
              const crowded = r.crowd && list.length >= 10
              return (
                <div
                  key={e}
                  className={`relative flex min-h-[148px] flex-col rounded-2xl p-1.5 transition ${crowded ? 'bg-red-50 ring-[3px] ring-red-500 animate-shake' : r.active === e ? 'ring-[3px] ring-sky-500' : 'ring-1 ring-black/10'}`}
                  style={crowded ? undefined : { background: PLACE[e].soft }}
                >
                  {crowded && <span className="absolute -top-2.5 right-1 z-10 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-black text-white shadow">Kalabalık! {list.length}</span>}
                  <div className={`flex flex-1 flex-wrap content-start ${e === 0 ? 'gap-[5px]' : 'gap-1'} ${e === 2 ? 'relative' : ''}`} style={e === 2 ? { minHeight: U * 10 + Math.max(0, list.length - 1) * 5 } : undefined}>
                    {list.map((b, i) => (
                      <button
                        key={b.id}
                        type="button"
                        disabled={!onBlock}
                        onClick={() => onBlock?.(ri, e, b.id)}
                        aria-label={`${r.label}: ${PLACE[e].unit} bloğu`}
                        className={`${e === 0 ? '-m-1 p-1' : e === 1 ? '-mx-0.5 px-0.5' : 'absolute'} ${onBlock ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                        style={e === 2 ? { left: i * 5, top: i * 5 } : undefined}
                      >
                        <Block e={e} k={b.k} sel={!!sel?.has(b.id)} />
                      </button>
                    ))}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-1">
                    <span className="text-[11px] font-black tabular-nums" style={{ color: crowded ? '#dc2626' : PLACE[e].color }}>{list.length} {PLACE[e].unit}</span>
                    {onAdd && (
                      <button type="button" onClick={() => onAdd(ri, e)} className="grid h-9 min-w-11 place-items-center rounded-lg bg-white px-1.5 text-xs font-black ring-1 ring-line active:scale-95" style={{ color: PLACE[e].color }} aria-label={`${r.label}: ${PLACE[e].unit} ekle`}>
                        + 1
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ───────────── kâğıttaki işlem ───────────── */

/**
 * Alt alta yazılmış işlem. top[e]: sütunun üstüne küçük yazılan sayı (toplamada elde 1,
 * çıkarmada bozmadan sonra o basamakta olan miktar; asıl rakam üstü çizilir).
 */
export function Written({ op, a, b, result, top = [], wrong }: { op: '+' | '−'; a: number; b: number; result: (number | null)[] | string; top?: (number | null)[]; wrong?: boolean }) {
  const res = typeof result === 'string' ? result : null
  const n = Math.max(COLS, res?.length ?? 0)
  const es = Array.from({ length: n }, (_, i) => n - 1 - i)
  const color = (e: number) => PLACE[e]?.color ?? '#475569'
  const row = (cells: (ReactNode | null)[]) => es.map((e) => <span key={e} className="grid h-10 place-items-center text-3xl font-black tabular-nums" style={{ color: color(e) }}>{cells[e]}</span>)
  return (
    <div className="inline-grid gap-x-1 rounded-2xl bg-white px-4 py-2 font-black ring-1 ring-line" style={{ gridTemplateColumns: `1.5rem repeat(${n}, 2.25rem)` }} aria-label={`${a} ${op} ${b}`}>
      <span />
      {es.map((e) => <span key={e} className="grid h-6 place-items-center text-lg leading-none text-amber-600 tabular-nums">{top[e] ?? ''}</span>)}
      <span />
      {row(digits(a).map((d, e) => (e >= String(a).length ? null : top[e] != null && op === '−' ? <span className="relative text-slate-400">{d}<span className="absolute inset-x-0 top-1/2 h-[3px] -rotate-12 bg-red-500" /></span> : d)))}
      <span className="grid h-10 place-items-center text-3xl text-ink">{op}</span>
      {row(digits(b).map((d, e) => (e >= String(b).length ? null : d)))}
      <span className="col-span-full h-[3px] rounded bg-ink" />
      <span />
      {res
        ? es.map((e) => <span key={e} className={`grid h-10 place-items-center text-3xl tabular-nums ${wrong ? 'text-red-600' : 'text-ink'}`}>{res[res.length - 1 - e] ?? ''}</span>)
        : row((result as (number | null)[]).map((d) => d ?? <span className="text-slate-300">?</span>))}
    </div>
  )
}

/* ───────────── rehber soru ───────────── */

export interface Opt { label: string; ok?: boolean; nudge?: string; mis?: string }
export interface Ask { q: string; options: Opt[]; /** doğru cevaptan sonra gösterilen açıklama */ why: string }
type Checks = ReturnType<typeof useChecks>

/** Öğretmenin tuval başında soracağı soru: yanlış seçenek düşündüren bir ipucu verir */
export function AskBox({ ask, chk, onOk }: { ask: Ask; chk: Checks; onOk: () => void }) {
  const [pick, setPick] = useState<number | null>(null)
  const [miss, setMiss] = useState(0)
  const [ok, setOk] = useState(false)
  const choose = (i: number) => {
    if (ok) return
    setPick(i)
    if (ask.options[i].ok) {
      setOk(true)
      onOk()
      return
    }
    chk.fail()
    setMiss((m) => m + 1)
  }
  const o = pick === null ? null : ask.options[pick]
  return (
    <Card className="animate-fade-up">
      <p className="mb-2 flex items-start gap-2 font-extrabold"><BookOpen size={18} className="mt-0.5 shrink-0 text-pink-600" />{ask.q}</p>
      <Choices cols={1} options={ask.options.map((x, i) => ({ id: i, label: x.label }))} value={pick} onPick={choose} disabled={ok} />
      {o && !o.ok && <div className="mt-2"><Nudge key={miss} question={o.nudge ?? 'Tuvale tekrar bak.'} misconception={o.mis} tool="base10" /></div>}
      {ok && <div className="mt-2"><Nudge tone="ok" question={ask.why} /></div>}
    </Card>
  )
}
