import { useRef, useState, type PointerEvent as RPE } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeftRight, Undo2 } from 'lucide-react'
import type { ManipulativeConfig } from '../../data/types'
import { numberToWords } from '../../lib/generators'
import { fmt } from '../../lib/format'
import { Stepper, ToolButton } from '../ui'
import { n, type ToolDef } from '../types'

/**
 * Sayı Kartları
 *  - 0–9 rakam kartlarını basamak yuvalarına sürükle (ya da karta dokun → ilk boş yuvaya gider;
 *    yuvaya dokunup sonra karta dokunursan o yuvaya gider).
 *  - Yerleşmiş kartı başka bir yuvaya sürükle ya da iki yuvaya sırayla dokun: kartlar yer değiştirir ve
 *    her rakamın değerinin nasıl değiştiği (ör. 5: 50 → 500) ve sayının ne kadar değiştiği vurgulanır.
 *  - Canlı: sayı, Türkçe okunuşu, çözümlenmiş biçimi; ara boşluk ve baştaki 0 için açıklama.
 *  - Ondalık yuvalar (virgülden sonra) üst sınıflar için.
 *
 * config: { digits?: 1–6 (tam kısım yuva sayısı, varsayılan 3), decimals?: 0–3 }
 * Hedef biçimleri:
 *  { value }                              → bu sayıyı kur (ondalık olabilir)
 *  { largest: true, digits: [..] }        → verilen kartların hepsiyle en büyük sayıyı kur
 *  { smallest: true, digits: [..] }       → en küçük sayıyı kur (0 başa gelemez)
 *  `digits` verilirse tepside yalnızca bu kartlar (birer tane) bulunur.
 */
type Swap = { before: string; after: string; i: number; j: number }
type V = { int: number; dec: number; slots: (number | null)[]; last: Swap | null }
type Cfg = ManipulativeConfig & { digits?: number; decimals?: number }
const cfgDefault: Cfg = { digits: 3, decimals: 0 }

const INT_PLACES = [
  { name: 'Birler', short: 'B', color: '#ca8a04' },
  { name: 'Onlar', short: 'O', color: '#16a34a' },
  { name: 'Yüzler', short: 'Y', color: '#ea580c' },
  { name: 'Binler', short: 'Bin', color: '#4f46e5' },
  { name: 'On binler', short: 'On b.', color: '#7c3aed' },
  { name: 'Yüz binler', short: 'Yüz b.', color: '#c026d3' },
]
const DEC_PLACES = [
  { name: 'Onda birler', short: 'Onda', color: '#0891b2' },
  { name: 'Yüzde birler', short: 'Yüzde', color: '#0e7490' },
  { name: 'Binde birler', short: 'Binde', color: '#155e75' },
]
const DEC_WORD = ['onda', 'yüzde', 'binde']

/** yuva i’nin basamak değeri (10’un kuvveti) */
const placePow = (v: { int: number }, i: number) => v.int - 1 - i

function parts(v: V) {
  const intD = v.slots.slice(0, v.int), decD = v.slots.slice(v.int)
  const first = intD.findIndex((d) => d !== null)
  const lastDec = decD.reduce<number>((a, d, i) => (d !== null ? i : a), -1)
  const intBody = first < 0 ? [] : intD.slice(first)
  const gapInt = intBody.some((d) => d === null)
  const gapDec = decD.slice(0, lastDec + 1).some((d) => d === null)
  const empty = first < 0 && lastDec < 0
  const intStr = intBody.map((d) => d ?? 0).join('') || '0'
  const decStr = decD.slice(0, lastDec + 1).map((d) => d ?? 0).join('')
  const num = Number(intStr + (decStr ? '.' + decStr : ''))
  return { empty, gap: gapInt || gapDec, intStr, decStr, num, leadingZero: intBody.length > 1 && intBody[0] === 0 }
}

const show = (p: ReturnType<typeof parts>) => (p.empty ? '' : fmt(Number(p.intStr), 0) + (p.decStr ? ',' + p.decStr : ''))

function reading(p: ReturnType<typeof parts>) {
  if (p.empty) return ''
  const ip = numberToWords(Number(p.intStr))
  if (!p.decStr) return ip
  return `${ip} tam ${DEC_WORD[p.decStr.length - 1]} ${numberToWords(Number(p.decStr))}`
}

const digitValue = (d: number, pow: number) => (pow >= 0 ? d * 10 ** pow : Math.round(d * 10 ** pow * 1000) / 1000)

const SIZES = {
  xl: 'h-[clamp(64px,15vw,112px)] w-[clamp(46px,11vw,80px)] text-[clamp(32px,8vw,58px)]',
  md: 'h-[clamp(42px,10vw,84px)] w-[clamp(26px,7vw,60px)] text-[clamp(21px,5.6vw,42px)]',
  sm: 'h-14 w-11 text-3xl',
}
function Card({ d, size = 'md', lifted, faded }: { d: number | string; size?: keyof typeof SIZES; lifted?: boolean; faded?: boolean }) {
  return (
    <span
      className={`grid place-items-center rounded-xl bg-white font-black text-ink tabular-nums select-none ${SIZES[size]} ${lifted ? 'shadow-[0_10px_20px_rgb(31_35_64/.25)] ring-4 ring-brand' : 'shadow-[0_2px_0_#c9cbe0,0_3px_8px_rgb(31_35_64/.10)] ring-1 ring-[#d9dbea]'} ${faded ? 'opacity-25' : ''}`}
      style={{ backgroundImage: 'linear-gradient(180deg,#fff 0%,#fff 60%,#f6f2ff 100%)' }}
    >
      {d}
    </span>
  )
}

type Src = { kind: 'tray'; d: number; k: number } | { kind: 'slot'; i: number }
type Ghost = { src: Src; x: number; y: number }

function Component({ value, onChange, target, locked }: { value: V; onChange: (v: V) => void; config: ManipulativeConfig; target?: Record<string, unknown>; locked?: boolean }) {
  const fixed = target && Array.isArray(target.digits) ? (target.digits as number[]) : null
  const [sel, setSel] = useState<number | null>(null) // seçili yuva
  const [ghost, setGhost] = useState<Ghost | null>(null)
  const press = useRef<{ src: Src; x0: number; y0: number; drag: boolean; id: number } | null>(null)
  const free = !target
  const p = parts(value)
  const total = value.int + value.dec
  const big = total <= 4 ? 'xl' : 'md'

  // kullanılan sabit kartlar
  const usedCount: Record<number, number> = {}
  value.slots.forEach((d) => { if (d !== null) usedCount[d] = (usedCount[d] ?? 0) + 1 })
  const trayItems = (fixed ?? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).map((d, k, arr) => {
    const before = arr.slice(0, k).filter((x) => x === d).length
    return { d, k, used: !!fixed && before < (usedCount[d] ?? 0) }
  })

  const commit = (slots: (number | null)[], last: Swap | null = null) => onChange({ ...value, slots, last })

  const place = (d: number, i: number) => {
    const slots = value.slots.slice()
    slots[i] = d
    commit(slots)
  }
  const swap = (i: number, j: number) => {
    if (i === j) return
    const slots = value.slots.slice()
    ;[slots[i], slots[j]] = [slots[j], slots[i]]
    const before = show(p)
    const after = show(parts({ ...value, slots }))
    commit(slots, slots[i] !== null && slots[j] !== null && before !== after ? { before, after, i, j } : null)
  }
  const remove = (i: number) => {
    const slots = value.slots.slice()
    slots[i] = null
    commit(slots)
  }

  const tapTray = (d: number) => {
    if (locked) return
    const i = sel !== null ? sel : value.slots.findIndex((x) => x === null)
    if (i < 0) return
    place(d, i)
    setSel(null)
  }
  const tapSlot = (i: number) => {
    if (locked) return
    if (sel === null) return setSel(i)
    if (sel === i) return setSel(null)
    if (value.slots[sel] !== null || value.slots[i] !== null) swap(sel, i)
    setSel(null)
  }

  const down = (src: Src) => (e: RPE<HTMLElement>) => {
    if (locked || e.button > 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    press.current = { src, x0: e.clientX, y0: e.clientY, drag: false, id: e.pointerId }
  }
  const move = (e: RPE<HTMLElement>) => {
    const s = press.current
    if (!s || s.id !== e.pointerId) return
    if (s.src.kind === 'slot' && value.slots[s.src.i] === null) return
    if (!s.drag && Math.hypot(e.clientX - s.x0, e.clientY - s.y0) > 8) s.drag = true
    if (s.drag) setGhost({ src: s.src, x: e.clientX, y: e.clientY })
  }
  const up = (e: RPE<HTMLElement>) => {
    const s = press.current
    press.current = null
    setGhost(null)
    if (!s || s.id !== e.pointerId) return
    if (!s.drag) return s.src.kind === 'tray' ? tapTray(s.src.d) : tapSlot(s.src.i)
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-slot]') as HTMLElement | null
    const i = el ? Number(el.dataset.slot) : -1
    setSel(null)
    if (s.src.kind === 'tray') { if (i >= 0) place(s.src.d, i) }
    else if (i >= 0) swap(s.src.i, i)
    else remove(s.src.i)
  }
  const handlers = (src: Src) => ({ onPointerDown: down(src), onPointerMove: move, onPointerUp: up, onPointerCancel: () => { press.current = null; setGhost(null) } })

  const setShape = (int: number, dec: number) => {
    const slots = [...Array(Math.max(0, int - value.int)).fill(null), ...value.slots.slice(Math.max(0, value.int - int), value.int), ...value.slots.slice(value.int, value.int + dec), ...Array(Math.max(0, dec - value.dec)).fill(null)]
    onChange({ int, dec, slots, last: null })
    setSel(null)
  }

  const places = [...INT_PLACES.slice(0, value.int).reverse(), ...DEC_PLACES.slice(0, value.dec)]
  const swapped = value.last ? [value.last.i, value.last.j] : []

  const expanded = () => {
    const terms = value.slots.map((d, i) => ({ d, pow: placePow(value, i) })).filter((t) => t.d !== null && t.d !== 0) as { d: number; pow: number }[]
    if (!terms.length) return null
    return {
      mult: terms.map((t) => `${t.d} × ${fmt(10 ** t.pow, 3)}`).join(' + '),
      sum: terms.map((t) => fmt(digitValue(t.d, t.pow), 3)).join(' + '),
    }
  }
  const ex = !p.empty && !p.gap ? expanded() : null
  const diff = value.last ? Number(value.last.after.replace(/\./g, '').replace(',', '.')) - Number(value.last.before.replace(/\./g, '').replace(',', '.')) : 0

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Basamak tablosu */}
      <div className="w-full overflow-x-auto">
        <div className="mx-auto flex w-fit items-end gap-[clamp(3px,1vw,10px)] rounded-3xl bg-[#f6f3ee] p-[clamp(6px,1.6vw,14px)] ring-1 ring-line">
          {value.slots.map((d, i) => {
            const pl = places[i]
            const pow = placePow(value, i)
            const isSel = sel === i
            const hl = swapped.includes(i)
            return (
              <div key={i} className="flex items-end gap-[clamp(3px,1vw,10px)]">
                {i === value.int && value.dec > 0 && <span className="pb-6 text-3xl leading-none font-black text-ink sm:text-5xl">,</span>}
                <div className="flex flex-col items-center gap-1">
                  <span className="max-w-[clamp(34px,8vw,64px)] text-center text-[clamp(9px,1.7vw,12px)] leading-tight font-extrabold" style={{ color: pl.color }}>
                    <span className="hidden sm:inline">{pl.name}</span><span className="sm:hidden">{pl.short}</span>
                  </span>
                  <button
                    type="button"
                    data-slot={i}
                    aria-label={`${pl.name} yuvası${d !== null ? `: ${d}` : ', boş'}`}
                    onClick={(e) => { if (e.detail === 0) tapSlot(i) }}
                    {...handlers({ kind: 'slot', i })}
                    className={`grid place-items-center rounded-2xl p-0.5 transition sm:p-1 ${isSel ? 'bg-brand-soft ring-4 ring-brand' : hl ? 'ring-4 ring-amber-400' : ''}`}
                    style={{ touchAction: 'none', background: d === null ? `repeating-linear-gradient(135deg, ${pl.color}14 0 6px, transparent 6px 12px)` : undefined, outline: d === null ? `2px dashed ${pl.color}88` : undefined, outlineOffset: -2 }}
                  >
                    {d !== null ? <span className={ghost?.src.kind === 'slot' && ghost.src.i === i ? 'opacity-30' : ''}><Card d={d} lifted={isSel} size={big} /></span> : <span className={`block ${SIZES[big]}`} />}
                  </button>
                  {(free || locked) && (
                    <span className={`min-h-5 text-center text-[clamp(10px,1.8vw,14px)] font-black tabular-nums ${hl ? 'animate-pop' : ''}`} style={{ color: pl.color }}>
                      {d !== null ? fmt(digitValue(d, pow), 3) : ''}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Kart tepsisi */}
      <div data-tray className="flex w-full max-w-2xl flex-wrap justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-white p-3">
        {trayItems.map(({ d, k, used }) => (
          <button
            key={k}
            type="button"
            disabled={used || locked}
            aria-label={`${d} kartı`}
            onClick={(e) => { if (e.detail === 0) tapTray(d) }}
            {...(used ? {} : handlers({ kind: 'tray', d, k }))}
            className="rounded-xl transition active:scale-95 disabled:cursor-default"
            style={{ touchAction: 'none' }}
          >
            <Card d={d} size="sm" faded={used} />
          </button>
        ))}
      </div>
      <p className="-mt-1 text-center text-sm font-bold text-ink-soft">
        {sel !== null ? (value.slots[sel] !== null ? 'Takas için başka bir yuvaya dokun ya da bir karta dokun.' : 'Şimdi bir karta dokun: bu yuvaya gelir.') : 'Kartı yuvaya sürükle ya da dokun. İki yuvaya sırayla dokunursan kartlar yer değiştirir.'}
      </p>

      <div className="flex flex-wrap items-end justify-center gap-2">
        {free && <Stepper label="Basamak" value={value.int} onDec={() => value.int > 1 && setShape(value.int - 1, value.dec)} onInc={() => value.int < 6 && setShape(value.int + 1, value.dec)} />}
        {free && <Stepper label="Virgülden sonra" value={value.dec} color="#0891b2" onDec={() => value.dec > 0 && setShape(value.int, value.dec - 1)} onInc={() => value.dec < 3 && setShape(value.int, value.dec + 1)} />}
        {sel !== null && value.slots[sel] !== null && <ToolButton onClick={() => { remove(sel); setSel(null) }}><Undo2 size={16} />Kartı geri al</ToolButton>}
        <ToolButton disabled={locked || value.slots.every((x) => x === null)} onClick={() => { commit(Array(total).fill(null)); setSel(null) }}>Temizle</ToolButton>
      </div>

      {(free || locked) && !p.empty && (
        <div className="w-full max-w-2xl rounded-2xl bg-ink px-4 py-3 text-center text-white">
          {p.gap ? (
            <p className="text-base font-extrabold text-amber-300">Arada boş yuva var. O basamakta hiç birim yoksa ne koymalısın? <span className="text-white">0 kartı yer tutucudur.</span></p>
          ) : (
            <>
              <div className="text-4xl font-black tracking-wide tabular-nums">{show(p)}</div>
              <div className="mt-0.5 text-lg font-extrabold text-white/85">{reading(p)}</div>
              {ex && ex.sum.includes('+') && (
                <div className="mt-2 space-y-0.5 border-t border-white/15 pt-2 text-sm font-bold text-white/75 tabular-nums">
                  <div>{ex.mult}</div>
                  <div className="text-base text-white">= {ex.sum}</div>
                </div>
              )}
              {p.leadingZero && <p className="mt-2 text-sm font-extrabold text-amber-300">En baştaki 0 sayının değerini değiştirmez: {show(p)}.</p>}
            </>
          )}
        </div>
      )}

      {free && value.last && !p.gap && (
        <div className="w-full max-w-2xl rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <div className="flex flex-wrap items-center justify-center gap-2 text-xl font-black tabular-nums">
            <span>{value.last.before}</span><ArrowLeftRight size={20} className="text-amber-600" /><span>{value.last.after}</span>
            <span className={`rounded-lg px-2 py-0.5 text-base ${diff >= 0 ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'}`}>{diff >= 0 ? '+' : '−'}{fmt(Math.abs(diff), 3)}</span>
          </div>
          <div className="mt-1 space-y-0.5 text-center text-sm font-bold text-ink-soft">
            {[value.last.i, value.last.j].map((k) => {
              const d = value.slots[k]
              const other = k === value.last!.i ? value.last!.j : value.last!.i
              if (d === null) return null
              const was = digitValue(d, placePow(value, other)), now = digitValue(d, placePow(value, k))
              return <div key={k}>{d}: {places[other].name.toLocaleLowerCase('tr-TR')} basamağında {fmt(was, 3)} değerindeydi, {places[k].name.toLocaleLowerCase('tr-TR')} basamağında {fmt(now, 3)} oldu.</div>
            })}
          </div>
        </div>
      )}

      {ghost && createPortal(
        <div className="pointer-events-none fixed z-[100] -translate-x-1/2 -translate-y-1/2 rotate-[-4deg]" style={{ left: ghost.x, top: ghost.y }}>
          <Card d={ghost.src.kind === 'tray' ? ghost.src.d : (value.slots[ghost.src.i] ?? '')} lifted size={big} />
        </div>,
        document.body,
      )}
    </div>
  )
}

function bestNumber(digits: number[], largest: boolean) {
  const s = [...digits].sort((a, b) => (largest ? b - a : a - b))
  if (!largest && s[0] === 0) {
    const k = s.findIndex((x) => x !== 0)
    if (k > 0) [s[0], s[k]] = [s[k], s[0]]
  }
  return Number(s.join(''))
}

export const sayikartlari: ToolDef<V> = {
  id: 'sayikartlari',
  defaultConfig: cfgDefault,
  initial: (config, target) => {
    const c = config as Cfg
    let int = Math.min(6, Math.max(1, c.digits ?? 3)), dec = Math.min(3, Math.max(0, c.decimals ?? 0))
    if (target && Array.isArray(target.digits)) { int = Math.min(6, (target.digits as number[]).length); dec = 0 }
    else if (target && typeof target.value === 'number') {
      const [a, b = ''] = String(n(target, 'value')).split('.')
      int = Math.min(6, Math.max(int, a.length))
      dec = Math.min(3, Math.max(dec, b.length))
    }
    return { int, dec, slots: Array(int + dec).fill(null), last: null }
  },
  check: (v, t) => {
    const p = parts(v)
    if (p.empty || p.gap) return false
    if (Array.isArray(t.digits) && (t.largest || t.smallest)) {
      const ds = t.digits as number[]
      const placed = v.slots.filter((x): x is number => x !== null)
      if (placed.length !== ds.length || [...placed].sort().join() !== [...ds].sort().join()) return false
      if (t.smallest && placed[0] === 0 && placed.some((x) => x !== 0)) return false
      return p.num === bestNumber(ds, !!t.largest)
    }
    return Math.abs(p.num - n(t, 'value')) < 1e-9
  },
  Component,
}
