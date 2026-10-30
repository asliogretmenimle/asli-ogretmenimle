import { useEffect, useRef, useState } from 'react'
import { Columns3, Footprints, Sparkles, Undo2 } from 'lucide-react'
import { ek } from '../../lib/generators'
import { isPrime, smallestPrimeFactor } from '../../lib/numberTheory'
import { ToolButton } from '../ui'
import { n, type ToolDef } from '../types'

/**
 * Eratosthenes Kalburu
 *  - 1–100 tablosu (serbest modda 120 ya da 200’e kadar; 10’lu ya da 6’lı dizilim).
 *  - Elenmemiş bir asala dokun → o asalın katları sırayla, asalın rengiyle elenir (kısa animasyon).
 *    Daha önce başka bir asalla elenmiş katlar yeniden boyanmaz; üzerlerinde küçük renkli bir nokta belirir.
 *    Asalı en küçükten başlayarak seçersen her sayının rengi en küçük asal çarpanını gösterir.
 *  - Bileşik bir sayıya “asal” diye dokunulursa neden asal olmadığı (ya da hangi asalın eleyeceği) açıklanır;
 *    1’e dokunulursa 1’in ne asal ne bileşik olduğu yazılır.
 *  - “Adım adım otomatik”: sıradaki asalı kendisi eler. Sıradaki adayın karesi sınırı geçince
 *    (100 için 11 × 11 = 121) yeni eleme olmayacağı, kalanların hepsinin asal olduğu vurgulanır (√100 = 10).
 *  - “Kalanların hepsi asal!”: elenmemiş bütün sayıları asal olarak işaretler.
 *
 * Hedef biçimleri:
 *  { upTo: n }                 → n’ye kadar bütün bileşikleri ele ve bütün asalları işaretle (“Kalanların hepsi asal!”)
 *  { upTo: n, minimal: true }  → aynısı, ama yalnızca karesi n’yi geçmeyen asallarla eleyerek (gereksiz eleme yok)
 * Görev modunda otomatik düğmesi, sayaçlar ve karekök ipucu gizlenir.
 */
type V = { size: number; cols: 10 | 6; sieved: number[]; one: boolean; done: boolean }

const COLORS: Record<number, string> = { 2: '#ef4444', 3: '#f97316', 5: '#ca8a04', 7: '#16a34a', 11: '#0891b2', 13: '#2563eb' }
const colorOf = (p: number) => COLORS[p] ?? '#9333ea'
const SIZES = [100, 120, 200]

/** Her sayı için onu eleyen asallar (eleme sırasıyla) */
function crossers(v: V) {
  const map = new Map<number, number[]>()
  for (const p of v.sieved) for (let m = 2 * p; m <= v.size; m += p) map.set(m, [...(map.get(m) ?? []), p])
  return map
}
const isCrossed = (map: Map<number, number[]>, x: number) => (map.get(x)?.length ?? 0) > 0
/** Henüz elenmemiş ve kalbura atılmamış en küçük aday */
function nextCandidate(v: V, map: Map<number, number[]>) {
  for (let x = 2; x <= v.size; x++) if (!isCrossed(map, x) && !v.sieved.includes(x)) return x
  return null
}
const leftComposite = (v: V, map: Map<number, number[]>) => {
  for (let x = 4; x <= v.size; x++) if (!isPrime(x) && !isCrossed(map, x)) return x
  return null
}
const primeCount = (size: number) => Array.from({ length: size }, (_, i) => i + 1).filter(isPrime).length
const sqrtText = (s: number) => (Number.isInteger(Math.sqrt(s)) ? `√${s} = ${Math.sqrt(s)}` : `√${s} ≈ ${Math.sqrt(s).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`)

type Msg = { text: string; tone: 'info' | 'ok' | 'think' }

function Kalbur({ value: v, onChange, target, locked }: { value: V; onChange: (v: V) => void; target?: Record<string, unknown>; locked?: boolean }) {
  const task = !!target
  const map = crossers(v)
  const [anim, setAnim] = useState<{ p: number; list: number[]; shown: number } | null>(null)
  const [msg, setMsg] = useState<Msg>({ text: task ? 'Bir asal sayıya dokun: katları kalburdan elensin.' : '2 asal sayıdır. 2’ye dokun ve katlarının kalburdan nasıl elendiğini izle!', tone: 'info' })
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearInterval(timer.current), [])

  const cand = nextCandidate(v, map)
  const finished = cand === null || cand * cand > v.size
  const composite = leftComposite(v, map)

  const play = (p: number, list: number[]) => {
    window.clearInterval(timer.current)
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || !list.length) return setAnim(null)
    const step = Math.max(16, Math.min(70, 1500 / list.length))
    setAnim({ p, list, shown: 0 })
    timer.current = window.setInterval(() => {
      setAnim((a) => {
        if (!a || a.shown >= a.list.length) {
          window.clearInterval(timer.current)
          return null
        }
        return { ...a, shown: a.shown + 1 }
      })
    }, step)
  }

  const sieve = (p: number) => {
    const list: number[] = []
    let fresh = 0, firstNew = 0
    for (let m = 2 * p; m <= v.size; m += p) {
      list.push(m)
      if (!isCrossed(map, m)) {
        fresh++
        if (!firstNew) firstNew = m
      }
    }
    onChange({ ...v, sieved: [...v.sieved, p] })
    play(p, list)
    if (!fresh) {
      setMsg({ text: `${p} asal! Ama ${v.size} içinde ${ek(p, 'gen')} elenecek yeni katı kalmadı${p * p > v.size ? `: en küçük yeni kat ${p} × ${p} = ${p * p} olurdu, bu da ${ek(v.size, 'abl')} büyük.` : '.'}`, tone: 'think' })
    } else if (task) {
      setMsg({ text: `${p} asal! ${ek(p, 'gen')} katları kalburdan elendi.`, tone: 'ok' })
    } else {
      const before = list.filter((m) => m < firstNew)
      setMsg({
        text: `${p} asal! ${fresh} yeni sayı elendi.${before.length ? ` ${ek(p, 'gen')} ${ek(firstNew, 'abl')} küçük katları (${before.slice(0, 3).join(', ')}${before.length > 3 ? '…' : ''}) zaten elenmişti; ilk yeni elenen ${firstNew}${firstNew === p * p ? ` = ${p} × ${p}` : ''}.` : ''}`,
        tone: 'ok',
      })
    }
  }

  const tap = (x: number) => {
    if (locked || anim) return
    if (x === 1) {
      onChange({ ...v, one: !v.one })
      setMsg({ text: '1 ne asal ne bileşiktir: yalnızca tek bir böleni var (1). Asal sayıların tam iki böleni vardır: 1 ve kendisi.', tone: 'think' })
      return
    }
    const by = map.get(x)
    if (by?.length) {
      const p = by[0]
      setMsg({ text: `${x} zaten elendi: ${ek(p, 'gen')} katı (${p} × ${x / p}).${by.length > 1 ? ` Üstündeki noktalar onu ${by.slice(1).join(' ve ')} ile de elendiğini gösteriyor.` : ''}`, tone: 'info' })
      return
    }
    if (v.sieved.includes(x)) {
      setMsg({ text: `${x} asal ve katları zaten elendi. Sıradaki elenmemiş sayıya bak!`, tone: 'info' })
      return
    }
    if (isPrime(x)) return sieve(x)
    const s = smallestPrimeFactor(x)
    setMsg(
      task
        ? { text: `${x} asal mı? Bölenlerini düşün: 1 ve ${x} dışında ${ek(x, 'acc')} bölen bir sayı var mı?`, tone: 'think' }
        : { text: `${x} = ${s} × ${x / s}: ${x} bileşik bir sayı, asal değil. ${ek(s, 'gen')} katlarını elersen ${x} de elenir.`, tone: 'think' },
    )
  }

  const auto = () => {
    if (anim || locked) return
    if (cand !== null && cand * cand <= v.size) return sieve(cand)
    claim()
  }

  const claim = () => {
    if (locked || anim) return
    if (composite !== null) {
      const s = smallestPrimeFactor(composite)
      setMsg(
        task
          ? { text: 'Henüz elenmemiş bileşik sayılar var. Hangi asalın katlarını elemedin?', tone: 'think' }
          : { text: `Dur! ${composite} hâlâ kalburda ama ${composite} = ${s} × ${composite / s}. ${ek(s, 'gen')} katlarını eledin mi?`, tone: 'think' },
      )
      return
    }
    onChange({ ...v, done: true })
    setMsg({ text: task ? 'Kalan sayıları asal olarak işaretledin.' : `Harika! ${ek(v.size, 'dat')} kadar ${primeCount(v.size)} asal sayı var. Yalnızca ${v.sieved.filter((p) => p * p <= v.size).join(', ')} ile elemek yetti.`, tone: 'ok' })
  }

  const undo = () => {
    if (anim || locked || (!v.sieved.length && !v.done)) return
    onChange(v.done ? { ...v, done: false } : { ...v, sieved: v.sieved.slice(0, -1) })
    setMsg({ text: 'Son adım geri alındı.', tone: 'info' })
  }

  const reset = (patch: Partial<V>) => {
    window.clearInterval(timer.current)
    setAnim(null)
    onChange({ ...v, sieved: [], one: false, done: false, ...patch })
  }

  // Animasyonda henüz sırası gelmemiş katlar
  const pending = new Set(anim ? anim.list.slice(anim.shown) : [])
  const latest = anim && anim.shown > 0 ? anim.list[anim.shown - 1] : null
  const remaining = Array.from({ length: v.size - 1 }, (_, i) => i + 2).filter((x) => !isCrossed(map, x)).length
  const found = Array.from({ length: v.size - 1 }, (_, i) => i + 2).filter((x) => v.sieved.includes(x) || (v.done && !isCrossed(map, x))).length
  const fresh = (p: number) => [...map.values()].filter((l) => l[0] === p).length

  return (
    <div className="mx-auto max-w-3xl">
      {!task && (
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
          {SIZES.map((s) => <ToolButton key={s} active={v.size === s} onClick={() => reset({ size: s })}>1–{s}</ToolButton>)}
          <ToolButton active={v.cols === 6} onClick={() => onChange({ ...v, cols: v.cols === 10 ? 6 : 10 })}><Columns3 size={17} />{v.cols === 10 ? '6’lı dizilim' : '10’lu dizilim'}</ToolButton>
        </div>
      )}

      <div className="mx-auto grid gap-1 sm:gap-1.5" style={{ gridTemplateColumns: `repeat(${v.cols}, minmax(0, 1fr))`, maxWidth: v.cols === 10 ? 640 : 420 }} role="grid" aria-label={`1’den ${ek(v.size, 'dat')} kadar sayılar`}>
        {Array.from({ length: v.size }, (_, i) => i + 1).map((x) => {
          const by = (map.get(x) ?? []).filter((p) => !(pending.has(x) && p === anim?.p))
          const crossed = by.length > 0
          const circled = v.sieved.includes(x) || (v.done && x > 1 && !crossed && !pending.has(x))
          const c = crossed ? colorOf(by[0]) : circled ? colorOf(x) : ''
          const isOne = x === 1 && v.one
          return (
            <button
              key={x}
              type="button"
              onClick={() => tap(x)}
              disabled={locked}
              aria-label={`${x}${crossed ? `, ${ek(by[0], 'gen')} katı olarak elendi` : circled ? ', asal' : isOne ? ', ne asal ne bileşik' : ''}`}
              className={`relative grid aspect-square min-h-8 place-items-center text-sm font-black tabular-nums transition sm:text-lg ${x === latest ? 'animate-pop' : ''} ${
                circled
                  ? v.sieved.includes(x) ? 'rounded-full text-white shadow-md ring-2 ring-white' : 'rounded-full bg-amber-50 text-amber-800 ring-2 ring-amber-400'
                  : crossed ? 'rounded-lg text-slate-500' : isOne ? 'rounded-lg border-2 border-dashed border-slate-300 bg-slate-100 text-slate-400' : 'rounded-lg bg-white text-ink ring-1 ring-line hover:bg-paper'
              }`}
              style={circled && v.sieved.includes(x) ? { background: c } : crossed ? { background: `${c}22`, boxShadow: `inset 0 0 0 1.5px ${c}66` } : undefined}
            >
              <span className="relative">{x}</span>
              {crossed && (
                <svg viewBox="0 0 10 10" className="pointer-events-none absolute inset-1" aria-hidden preserveAspectRatio="none">
                  <line x1="1" y1="9" x2="9" y2="1" stroke={c} strokeWidth="0.9" strokeLinecap="round" opacity="0.45" />
                </svg>
              )}
              {by.length > 1 && (
                <span className="absolute right-0.5 bottom-0.5 flex gap-px" aria-hidden>
                  {by.slice(1, 4).map((p) => <span key={p} className="size-1.5 rounded-full sm:size-2" style={{ background: colorOf(p) }} />)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {!task && <ToolButton onClick={auto} disabled={!!anim || v.done}><Footprints size={17} />Adım adım otomatik</ToolButton>}
        <ToolButton onClick={claim} disabled={!!anim || v.done || locked}><Sparkles size={17} />Kalanların hepsi asal!</ToolButton>
        <ToolButton onClick={undo} disabled={!!anim || locked || (!v.sieved.length && !v.done)}><Undo2 size={17} />Geri al</ToolButton>
      </div>

      <p className={`mx-auto mt-3 max-w-xl rounded-2xl px-4 py-2.5 text-center text-[15px] font-bold ${msg.tone === 'ok' ? 'bg-ok-soft text-green-900' : msg.tone === 'think' ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200' : 'bg-paper text-ink'}`} aria-live="polite">{msg.text}</p>

      {v.sieved.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5" aria-label="Renk efsanesi">
          {v.sieved.map((p) => (
            <span key={p} className="chip bg-white px-2.5 py-1 text-sm text-ink ring-1 ring-line">
              <span className="size-3 rounded-full" style={{ background: colorOf(p) }} />
              {ek(p, 'gen')} katları{!task && <span className="text-ink-soft"> · {fresh(p)} yeni</span>}
            </span>
          ))}
        </div>
      )}

      {!task && (
        <>
          <div className="mx-auto mt-3 w-fit rounded-2xl bg-ink px-4 py-2 text-center text-base font-extrabold text-white tabular-nums sm:text-lg">
            Kalburda kalan: {remaining} · Bulunan asal: {found}
          </div>
          {finished && !v.done && cand !== null && v.sieved.length > 0 && (
            <p className="mx-auto mt-3 max-w-xl rounded-2xl bg-violet-50 px-4 py-2.5 text-center text-[15px] font-bold text-violet-900 ring-1 ring-violet-200 animate-fade-up">
              💡 Sıradaki aday {cand}, ama {cand} × {cand} = {cand * cand} &gt; {v.size}. {ek(cand, 'gen')} daha küçük katları zaten elendi: artık yeni eleme olmayacak, kalburda kalanların hepsi asal! ({sqrtText(v.size)})
            </p>
          )}
          {v.cols === 6 && v.sieved.includes(3) && (
            <p className="mx-auto mt-3 max-w-xl rounded-2xl bg-sky-50 px-4 py-2.5 text-center text-[15px] font-bold text-sky-900 ring-1 ring-sky-200">
              6’lı dizilime bak: 2 ve 3 dışındaki asallar hep 1. ve 5. sütunda. Neden? (Diğer sütunlar 2’nin ya da 3’ün katı: 6k, 6k + 2, 6k + 3, 6k + 4)
            </p>
          )}
        </>
      )}
    </div>
  )
}

export const kalbur: ToolDef<V> = {
  id: 'kalbur',
  defaultConfig: { max: 100 },
  initial: (config, target) => ({ size: n(target, 'upTo', config.max ?? 100), cols: 10, sieved: [], one: false, done: false }),
  check: (v, target) => {
    const upTo = Math.min(v.size, n(target, 'upTo', v.size))
    const map = crossers(v)
    for (let x = 2; x <= upTo; x++) {
      const prime = isPrime(x)
      if (!prime && !isCrossed(map, x)) return false
      if (prime && !(v.sieved.includes(x) || v.done)) return false
    }
    if (target.minimal && v.sieved.some((p) => p * p > upTo)) return false
    return true
  },
  Component: Kalbur,
}
