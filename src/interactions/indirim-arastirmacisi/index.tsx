import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'
import { Scissors, Tag } from 'lucide-react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { Scene, SolutionList, StrategyPicker, useSolutions } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { ek } from '../../lib/generators'
import { useTracker } from '../../lib/trackerContext'
import { Card, CheckButton, Choices, GridButtons, Header, NextButton, Nudge, NumPad, PaintGrid, Prompt, Split, countOn, emptyCells, fmt, near, parseNum, pick, rng, tl, useChecks } from '../yuzde-boyama/ortak'

/**
 * 44. İndirim Araştırmacısı (6–8)
 * Bant (şerit) modeli: fiyat bandını eş parçalara bölüp indirimi işaretle → parça değerleri TL olarak belirir.
 *  - bar:        %25 indirimi bantta göster (4 ya da 20 parça: farklı yollar), ödenecek tutarı bul
 *  - deals:      “%30”, “3 al 2 öde”, “her 500 TL’ye 100 TL” — önce tahmin, sonra modelle, sonra seç
 *  - successive: %20 + %10 = %30 mu? 100’lük ızgarada ikinci indirim kalan fiyattan
 *  - reverse:    indirimli fiyattan etiket fiyatına (bant: ödenen parçalar)
 *  - raise:      %20 zam sonra %20 indirim → eski fiyat mı? (8. sınıf)
 */

type Deal = { id: string; label: string; kind: 'pct'; pct: number } | { id: string; label: string; kind: 'xfory'; pay: number } | { id: string; label: string; kind: 'per'; per: number; off: number } | { id: string; label: string; kind: 'second'; pct: number }
type Task =
  | { kind: 'bar'; item: string; emoji: string; price: number; pct: number; parts: number[] }
  | { kind: 'deals'; item: string; emoji: string; unit: number; qty: number; deals: Deal[] }
  | { kind: 'successive'; item: string; emoji: string; price: number; p1: number; p2: number }
  | { kind: 'reverse'; item: string; emoji: string; paid: number; pct: number; parts: number[] }
  | { kind: 'raise'; item: string; emoji: string; price: number; up: number; down: number }

const RED = '#e11d48', GREEN = '#16a34a'

function makeTasks(grade: Grade): Task[] {
  const r = rng(Date.now() % 100000)
  const dealsA: Task = { kind: 'deals', item: 'tişört', emoji: '👕', unit: 400, qty: 3, deals: [
    { id: 'A', label: '%30 indirim', kind: 'pct', pct: 30 },
    { id: 'B', label: '3 al 2 öde', kind: 'xfory', pay: 2 },
    { id: 'C', label: 'Her 500 TL’ye 100 TL indirim', kind: 'per', per: 500, off: 100 },
  ] }
  const dealsB: Task = { kind: 'deals', item: 'spor ayakkabı', emoji: '👟', unit: 900, qty: 2, deals: [
    { id: 'A', label: '%20 indirim', kind: 'pct', pct: 20 },
    { id: 'B', label: 'İkincisi %50 indirimli', kind: 'second', pct: 50 },
    { id: 'C', label: 'Her 600 TL’ye 120 TL indirim', kind: 'per', per: 600, off: 120 },
  ] }
  if (grade === 6)
    return [
      { kind: 'bar', item: 'kulaklık', emoji: '🎧', price: 1200, pct: 25, parts: [2, 4, 5, 10, 20] },
      { kind: 'bar', ...pick([{ item: 'kitap', emoji: '📚', price: 450 }, { item: 'sırt çantası', emoji: '🎒', price: 650 }], r), pct: pick([10, 20, 30], r), parts: [2, 4, 5, 10, 20] },
      { kind: 'successive', item: 'mont', emoji: '🧥', price: 2000, p1: 20, p2: 10 },
      { kind: 'bar', item: 'kalem kutusu', emoji: '✏️', price: 240, pct: 35, parts: [2, 4, 5, 10, 20] },
      dealsA,
    ]
  if (grade === 7)
    return [
      { kind: 'bar', item: 'kulaklık', emoji: '🎧', price: 1600, pct: 35, parts: [2, 4, 5, 10, 20] },
      { kind: 'successive', item: 'mont', emoji: '🧥', price: 2500, p1: 20, p2: 10 },
      { kind: 'reverse', item: 'bisiklet kaskı', emoji: '⛑️', paid: 900, pct: 25, parts: [2, 3, 4, 5, 10] },
      dealsA,
      { kind: 'reverse', item: 'akıllı saat', emoji: '⌚', paid: 1600, pct: 20, parts: [2, 3, 4, 5, 10] },
    ]
  return [
    { kind: 'bar', item: 'tablet kılıfı', emoji: '📱', price: 480, pct: 15, parts: [2, 4, 5, 10, 20] },
    { kind: 'successive', item: 'mont', emoji: '🧥', price: 3000, p1: 30, p2: 20 },
    { kind: 'raise', item: 'kitaplık', emoji: '🗄️', price: 1000, up: 20, down: 20 },
    { kind: 'reverse', item: 'akıllı saat', emoji: '⌚', paid: 2100, pct: 30, parts: [2, 4, 5, 10] },
    dealsB,
  ]
}

const titleOf = (t: Task) => ({ bar: 'Bant modeli', deals: 'En iyi teklif', successive: 'Üst üste indirim', reverse: 'Etiket fiyatı neydi?', raise: 'Zam ve indirim' })[t.kind]

export default function IndirimArastirmacisi({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade), [grade])
  const [idx, setIdx] = useState(0)
  const [solved, setSolved] = useState(false)
  const firsts = useRef<boolean[]>([])
  const sol = useSolutions()
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
      stars: starsFor((f + Math.min(1, sol.list.length * 0.25)) / tasks.length),
      summary: `${tasks.length} indirim vakasını bant modeliyle çözdün.`,
      insight:
        grade === 6
          ? 'Yüzde indirim, fiyat bandını 100 eş parçaya (ya da 4, 10, 20 parçaya) bölmek gibidir. Üst üste indirimde ikinci indirim yeni fiyattan yapılır: %20 + %10, %30 değil %28 eder.'
          : grade === 7
            ? 'İndirimli fiyat, etiket fiyatının bir yüzdesidir (%25 indirim → %75’i ödenir). Etiket fiyatını bulmak için ödenen parçalardan bir parçanın değerine, oradan bütüne gideriz.'
            : 'Yüzdeler her zaman bir bütüne göredir: %20 zamdan sonra %20 indirim eski fiyata dönmez, çünkü ikinci yüzde daha büyük bir bütünden alınır. Teklifleri aynı sepet üzerinde karşılaştırırız.',
    })
  }
  const footer = solved ? <NextButton last={last} onClick={next} /> : null
  const c = { grade, footer, onSolved, sol }
  return (
    <Scene grade={grade}>
      <Header emoji="🏷️" kicker="Vaka" title={titleOf(task)} idx={idx} total={tasks.length} dark={grade >= 7} />
      {task.kind === 'bar' && <BarTask key={idx} t={task} {...c} />}
      {task.kind === 'deals' && <DealsTask key={idx} t={task} {...c} />}
      {task.kind === 'successive' && <SuccessiveTask key={idx} t={task} {...c} />}
      {task.kind === 'reverse' && <ReverseTask key={idx} t={task} {...c} />}
      {task.kind === 'raise' && <RaiseTask key={idx} t={task} {...c} />}
    </Scene>
  )
}

type Common = { grade: Grade; footer: ReactNode; onSolved: (first: boolean) => void; sol: ReturnType<typeof useSolutions> }

const Tagline = ({ emoji, item, price, extra }: { emoji: string; item: string; price?: number; extra?: ReactNode }) => (
  <div className="flex items-center gap-3 rounded-2xl bg-white p-3 text-ink shadow-sm ring-1 ring-line">
    <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-amber-50 text-4xl">{emoji}</span>
    <div className="min-w-0">
      <p className="text-lg leading-tight font-black first-letter:uppercase">{item}</p>
      {price !== undefined && <p className="mt-0.5 inline-flex items-center gap-1 rounded-lg bg-amber-300 px-2 py-0.5 text-lg font-black text-amber-950"><Tag size={16} />{tl(price)}</p>}
      {extra}
    </div>
  </div>
)

/* ───────────────────────── bant modeli ───────────────────────── */

/**
 * Bölünebilir fiyat bandı. Parçalara dokun ya da parmağını sürükle: işaretlenir.
 * `values`: parça değerleri gösterilsin mi; `mode`: indirim (çizgili kırmızı), ödenen (yeşil), zam (mavi).
 */
function PriceBar({ whole, n, marked, onChange, mode = 'discount', values = true, locked, label, extraWhole }: { whole: number | null; n: number; marked: boolean[]; onChange: (m: boolean[]) => void; mode?: 'discount' | 'paid' | 'raise'; values?: boolean; locked?: boolean; label: ReactNode; extraWhole?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const work = useRef<{ mode: boolean; last: number; m: boolean[] } | null>(null)
  const at = (x: number) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return -1
    const i = Math.floor(((x - r.left) / r.width) * n)
    return i >= 0 && i < n ? i : -1
  }
  const bind = useDrag(({ xy: [x], first, last, event }) => {
    if (locked) return
    event.preventDefault()
    const i = at(x)
    if (first) {
      if (i < 0) return
      const m = [...marked]
      const md = !m[i]
      m[i] = md
      work.current = { mode: md, last: i, m }
      onChange([...m])
    } else if (work.current && i >= 0 && i !== work.current.last) {
      const a = Math.min(i, work.current.last), b = Math.max(i, work.current.last)
      for (let k = a; k <= b; k++) work.current.m[k] = work.current.mode
      work.current.last = i
      onChange([...work.current.m])
    }
    if (last) work.current = null
  }, { filterTaps: false })
  const per = whole !== null ? whole / n : null
  const col = mode === 'discount' ? RED : mode === 'paid' ? GREEN : '#2563eb'
  const showVals = values && per !== null
  return (
    <div className="w-full">
      <div className="mb-1 flex items-end justify-between gap-2 text-sm font-black text-ink">
        <span>{label}</span>
        {showVals && n > 1 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-ink-soft">1 parça = {tl(per!)}</span>}
      </div>
      <div ref={ref} {...bind()} className="flex h-16 w-full touch-none overflow-hidden rounded-xl bg-white ring-2 ring-ink select-none" role="group" aria-label="Fiyat bandı">
        {Array.from({ length: n }, (_, i) => {
          const on = marked[i]
          return (
            <div key={i} className="relative flex flex-1 items-center justify-center border-r-2 border-ink/70 text-[13px] font-black last:border-r-0 sm:text-sm" style={{ background: on ? (mode === 'discount' ? `repeating-linear-gradient(45deg, ${col}, ${col} 6px, #fecdd3 6px, #fecdd3 12px)` : col) : '#fef3c7', color: on ? '#fff' : '#78350f', cursor: locked ? 'default' : 'pointer' }}>
              {showVals && n <= 10 && <span className={`rounded px-0.5 ${on && mode === 'discount' ? 'bg-rose-700/80' : ''}`}>{fmt(per!)}</span>}
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs font-black text-ink-soft">
        <span>0</span>
        <span>{whole !== null ? tl(whole) : '?'}{extraWhole !== undefined ? ` → ${tl(extraWhole)}` : ''}</span>
      </div>
    </div>
  )
}

function PartPicker({ parts, n, onPick, disabled }: { parts: number[]; n: number; onPick: (n: number) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 flex items-center gap-1 text-xs font-black tracking-wide text-ink-soft uppercase"><Scissors size={14} />Eş parçaya böl</span>
      {parts.map((k) => (
        <button key={k} type="button" disabled={disabled} onClick={() => onPick(k)} aria-pressed={n === k} className={`min-h-12 min-w-12 rounded-xl px-2 text-lg font-black ring-1 transition active:scale-95 disabled:opacity-40 ${n === k ? 'bg-amber-500 text-white ring-amber-600 shadow-[0_3px_0_#b45309]' : 'bg-white text-ink ring-line'}`}>{k}</button>
      ))}
    </div>
  )
}

const Workbench = ({ children }: { children: ReactNode }) => <div className="space-y-3 rounded-3xl bg-white/95 p-3 text-ink shadow-sm ring-1 ring-line sm:p-4">{children}</div>

/* ───────────────────────── 1. bant: indirimi göster ───────────────────────── */

function BarTask({ t, footer, onSolved, sol }: { t: Extract<Task, { kind: 'bar' }> } & Common) {
  const [n, setN] = useState(1)
  const [marked, setMarked] = useState<boolean[]>([false])
  const [phase, setPhase] = useState<'shade' | 'pay' | 'done'>('shade')
  const [val, setVal] = useState('')
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const [ways, setWays] = useState<number[]>([])
  const chk = useChecks()
  const k = marked.filter(Boolean).length
  const off = (t.price * t.pct) / 100
  const pay = t.price - off
  const choose = (m: number) => {
    setN(m)
    setMarked(Array(m).fill(false))
    setFb(null)
  }
  const checkShade = () => {
    if (n > 1 && near(k / n, t.pct / 100)) {
      const isNew = !ways.includes(n)
      if (isNew) {
        setWays((w) => [...w, n])
        sol.add(`bar-${t.item}-${n}`, `${n} parçadan ${k}${ek(k, 'poss', false)}`)
      }
      if (phase === 'shade') setPhase('pay')
      setFb({ ok: true, text: `Evet: ${n} parçadan ${k} parça = %${t.pct}. İndirim ${tl(off)}. ${phase === 'shade' ? 'Şimdi ödeyeceğin tutarı bul.' : isNew ? 'Yeni bir bölme yolu!' : ''}` })
      return
    }
    chk.fail()
    if (n === 1) setFb({ ok: false, text: `%${t.pct}’i göstermek için bandı kaç eş parçaya bölersen bir parça kolay bir yüzde olur? %10 için 10 parça, %25 için…?` })
    else if (n === 100 / t.pct || near((100 / n) * k, t.pct)) setFb({ ok: false, text: 'Bir parça bandın yüzde kaçı?' })
    else if (k === t.pct % n || k * 10 === t.pct) setFb({ ok: false, text: `Bant ${n} eş parça; bir parça %${fmt(100 / n)} eder. %${t.pct} için kaç parça işaretlemelisin? Olmuyorsa başka bir bölme seç.` })
    else setFb({ ok: false, text: `Her parça %${fmt(100 / n)}. ${k} parça %${fmt((100 / n) * k)} ediyor. %${t.pct} için ${100 % t.pct === 0 ? 'kaç parça' : 'hangi bölme daha uygun'}?` })
  }
  const checkPay = () => {
    const v = parseNum(val)
    if (near(v, pay)) {
      onSolved(chk.pass())
      setPhase('done')
      setFb({ ok: true, text: `Evet! ${tl(t.price)} − ${tl(off)} = ${tl(pay)}. Yani fiyatın %${100 - t.pct}${ek(100 - t.pct, 'poss', false)} ödenir.` })
      return
    }
    chk.fail()
    if (near(v, off)) setFb({ ok: false, text: `${tl(off)} indirim tutarı, yani kasada senden düşülen para. Bantta işaretlemediğin parçalar ne kadar?`, mis: 'İndirim tutarını ödenecek tutar sandı' })
    else if (near(v, t.price - t.pct)) setFb({ ok: false, text: `Fiyattan ${t.pct} TL çıkardın. Ama %${t.pct}, ${t.pct} TL mi? Bantta işaretli parçalar kaç TL?`, mis: 'Yüzdeyi TL gibi çıkardı (%25 → 25 TL)' })
    else setFb({ ok: false, text: 'Bantta işaretlenmemiş parçaları say: her biri kaç TL? Hepsi kaç TL eder?' })
  }
  return (
    <Split
      work={
        <Workbench>
          <Tagline emoji={t.emoji} item={t.item} price={t.price} extra={<span className="ml-1 inline-block rounded-lg bg-rose-600 px-2 py-0.5 text-lg font-black text-white">%{t.pct} indirim</span>} />
          <PartPicker parts={t.parts} n={n} onPick={choose} />
          <PriceBar whole={t.price} n={n} marked={marked} onChange={(m) => { setMarked(m); setFb(null) }} label="Etiket fiyatı (%100)" />
          <div className="flex flex-wrap gap-2 text-sm font-black">
            <span className="rounded-xl bg-rose-50 px-3 py-2 text-rose-800 ring-1 ring-rose-200">İşaretli: {k}/{n} parça</span>
            {n > 1 && <span className="rounded-xl bg-slate-50 px-3 py-2 text-ink-soft ring-1 ring-line">1 parça = %{fmt(100 / n)}</span>}
          </div>
          {phase === 'shade' && <p className="text-sm font-bold text-ink-soft">Bandı böl, sonra indirim kadar parçaya dokun (ya da parmağını sürükle).</p>}
        </Workbench>
      }
      panel={
        <>
          <Prompt step={phase === 'shade' ? '1. Modelle' : '2. Hesapla'}>{t.item[0].toLocaleUpperCase('tr') + t.item.slice(1)} {tl(t.price)}; kasada <b className="text-rose-700">%{t.pct} indirim</b> var. İndirimi bantta göster. <span className="mt-1 block text-teal-800">Kaç TL ödersin?</span></Prompt>
          {phase === 'shade' && <CheckButton onClick={checkShade} disabled={k === 0} />}
          {phase !== 'shade' && (
            <>
              <NumPad value={val} onChange={(v) => { setVal(v); setFb(null) }} unit="TL" label="Ödenecek" disabled={phase === 'done'} />
              {phase === 'pay' && <CheckButton onClick={checkPay} disabled={!val} />}
            </>
          )}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="yuzdeizgarasi" toolTitle="Yüzde ızgarasında dene" />)}
          {phase === 'done' && (
            <Card>
              <p className="text-sm font-bold text-ink-soft">Başka bir bölmeyle de göster: bandı farklı sayıda parçaya bölüp yine %{t.pct}’i işaretle, “Kontrol et”e dokun.</p>
              <div className="mt-2"><CheckButton onClick={checkShade} disabled={k === 0}>Bu bölmeyi kontrol et</CheckButton></div>
            </Card>
          )}
          <SolutionList list={sol.list.filter((s) => s.key.startsWith(`bar-${t.item}-`))} />
          {phase === 'done' && <StrategyPicker question="Nasıl buldun?" options={['%10’u bulup katladım', 'Kesre çevirdim (%25 = 1/4)', `Kalan %${100 - t.pct}’i hesapladım`, 'Bantta parçaları topladım']} onPick={() => {}} />}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 2. en iyi teklif ───────────────────────── */

function dealPay(d: Deal, unit: number, qty: number) {
  const total = unit * qty
  if (d.kind === 'pct') return total * (1 - d.pct / 100)
  if (d.kind === 'xfory') return unit * d.pay
  if (d.kind === 'per') return total - Math.floor(total / d.per) * d.off
  return total - unit * (d.pct / 100)
}

function DealModel({ d, unit, qty, reveal }: { d: Deal; unit: number; qty: number; reveal: boolean }) {
  const total = unit * qty
  const W = 100
  const seg = (x: number, w: number, kind: 'pay' | 'off', key: string, text?: string) => (
    <div key={key} className="absolute inset-y-0 flex items-center justify-center overflow-hidden border-r-2 border-white text-[11px] font-black sm:text-xs" style={{ left: `${x}%`, width: `${w}%`, background: kind === 'off' ? `repeating-linear-gradient(45deg, ${RED}, ${RED} 5px, #fecdd3 5px, #fecdd3 10px)` : '#fbbf24', color: kind === 'off' ? '#fff' : '#78350f' }}>
      {text && <span className={kind === 'off' ? 'rounded bg-rose-700/85 px-0.5' : ''}>{text}</span>}
    </div>
  )
  const segs: ReactNode[] = []
  if (d.kind === 'pct') {
    for (let i = 0; i < 10; i++) segs.push(seg(i * 10, 10, i >= 10 - d.pct / 10 ? 'off' : 'pay', `${i}`, fmt(total / 10)))
  } else if (d.kind === 'xfory') {
    for (let i = 0; i < qty; i++) segs.push(seg((i * W) / qty, W / qty, i >= d.pay ? 'off' : 'pay', `${i}`, i >= d.pay ? 'bedava' : tl(unit)))
  } else if (d.kind === 'second') {
    segs.push(seg(0, 50, 'pay', 'a', tl(unit)))
    segs.push(seg(50, 25, 'pay', 'b', tl(unit / 2)))
    segs.push(seg(75, 25, 'off', 'c', `%${d.pct}`))
  } else {
    let x = 0
    for (let i = 0; x < total; i++) {
      const w = Math.min(d.per, total - x)
      if (w === d.per) {
        segs.push(seg((x / total) * W, ((w - d.off) / total) * W, 'pay', `p${i}`, tl(w - d.off)))
        segs.push(seg(((x + w - d.off) / total) * W, (d.off / total) * W, 'off', `o${i}`, fmt(d.off)))
      } else segs.push(seg((x / total) * W, (w / total) * W, 'pay', `r${i}`, tl(w)))
      x += w
    }
  }
  return (
    <div>
      <div className="relative h-12 w-full overflow-hidden rounded-xl ring-2 ring-ink">{segs}</div>
      <div className="mt-0.5 flex justify-between text-[11px] font-black text-ink-soft"><span>0</span><span>{reveal ? `Ödenecek: ${tl(dealPay(d, unit, qty))}` : ''}</span><span>{tl(total)}</span></div>
    </div>
  )
}

function DealsTask({ t, footer, onSolved, grade }: { t: Extract<Task, { kind: 'deals' }> } & Common) {
  const [phase, setPhase] = useState<'predict' | 'model' | 'choose' | 'done'>('predict')
  const [pred, setPred] = useState<string | null>(null)
  const [active, setActive] = useState<string>(t.deals[0].id)
  const [vals, setVals] = useState<Record<string, string>>({})
  const [okd, setOkd] = useState<string[]>([])
  const [best, setBest] = useState<string | null>(null)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const chk = useChecks()
  const track = useTracker()
  const total = t.unit * t.qty
  const pays = Object.fromEntries(t.deals.map((d) => [d.id, dealPay(d, t.unit, t.qty)]))
  const minPay = Math.min(...Object.values(pays))
  const bestIds = t.deals.filter((d) => near(pays[d.id], minPay)).map((d) => d.id)
  const ad = t.deals.find((d) => d.id === active)!
  const checkOne = () => {
    const v = parseNum(vals[active] ?? '')
    if (near(v, pays[active])) {
      const next = [...okd, active]
      setOkd(next)
      chk.pass()
      const rest = t.deals.find((d) => !next.includes(d.id))
      setFb({ ok: true, text: `${active} teklifinde ${tl(pays[active])} ödersin (indirim ${tl(total - pays[active])}, yani %${fmt(((total - pays[active]) / total) * 100, 1)}).` })
      if (rest) setActive(rest.id)
      else setPhase('choose')
      return
    }
    chk.fail()
    if (ad.kind === 'per' && near(v, total - (total / ad.per) * ad.off)) setFb({ ok: false, text: `${tl(total)} içinde kaç tane tam ${tl(ad.per)} var? Artan ${tl(total % ad.per)} için de indirim var mı?`, mis: '“Her X TL’ye Y TL indirim” teklifini oransal (yüzde gibi) hesapladı' })
    else if (near(v, total - pays[active])) setFb({ ok: false, text: 'Bu sayı indirim tutarı. Kasada ödenen, çizgisiz (sarı) parçalar.', mis: 'İndirim tutarını ödenecek tutar sandı' })
    else if (ad.kind === 'pct' && near(v, total - ad.pct)) setFb({ ok: false, text: `%${ad.pct}, ${ad.pct} TL değil. Bantta her parça bütünün %10’u: bir parça kaç TL?`, mis: 'Yüzdeyi TL gibi çıkardı' })
    else setFb({ ok: false, text: 'Modeldeki sarı (ödenen) parçaların değerlerini topla.' })
  }
  const checkBest = () => {
    if (best && bestIds.includes(best)) {
      onSolved(chk.fails === 0)
      setPhase('done')
      setFb({ ok: true, text: `${best} teklifi en ucuzu: ${tl(minPay)}.${bestIds.length > 1 ? ' (Eşit olanlar da var!)' : ''} Tahminin ${pred && bestIds.includes(pred) ? 'doğru çıktı' : `${pred} idi — kanıt fikrini değiştirdi`}.` })
      return
    }
    chk.fail()
    const bd = t.deals.find((d) => d.id === best)!
    setFb({ ok: false, text: bd.kind === 'pct' ? `“%${bd.pct}” büyük bir sayı gibi görünüyor ama ödenecek tutarları karşılaştır: hangisi en az?` : 'Hangi teklifte en az ödüyorsun? Ödenecek tutarlar aynı sepet için hesaplandı.', mis: bd.kind === 'pct' ? 'Teklifleri tutarları karşılaştırmadan, yüzdenin büyüklüğüne bakarak seçti' : undefined })
  }
  return (
    <Split
      work={
        <Workbench>
          <Tagline emoji={t.emoji} item={`${t.qty} ${t.item}`} extra={<p className="text-sm font-bold text-ink-soft">Tanesi {tl(t.unit)} → sepet {tl(total)}</p>} />
          <div className="space-y-2.5">
            {t.deals.map((d) => {
              const done = okd.includes(d.id)
              const isA = phase === 'model' && active === d.id
              return (
                <button key={d.id} type="button" onClick={() => { if (phase === 'model' && !done) { setActive(d.id); setFb(null) } if (phase === 'choose') { setBest(d.id); setFb(null) } }} className={`block w-full rounded-2xl p-2.5 text-left ring-2 transition ${isA ? 'bg-amber-50 ring-amber-400' : phase === 'choose' && best === d.id ? 'bg-teal-50 ring-teal-500' : done ? 'bg-emerald-50/60 ring-emerald-300' : 'bg-white ring-line'}`}>
                  <p className="mb-1.5 flex items-center gap-2 text-base font-black"><span className="grid size-8 place-items-center rounded-lg bg-ink text-white">{d.id}</span>{d.label}{done && <span className="ml-auto text-sm text-emerald-700">{tl(pays[d.id])} ✓</span>}</p>
                  {phase === 'predict' ? <div className="grid h-12 place-items-center rounded-xl bg-slate-100 text-xs font-black text-ink-soft">Model tahminden sonra açılacak</div> : <DealModel d={d} unit={t.unit} qty={t.qty} reveal={done} />}
                </button>
              )
            })}
          </div>
        </Workbench>
      }
      panel={
        <>
          <Prompt step={phase === 'predict' ? '1. Tahmin et' : phase === 'model' ? '2. Her teklifi modelle' : '3. Karar ver'}>
            {phase === 'predict' ? <>{t.qty} {t.item} alacaksın. Üç mağazanın teklifleri farklı. <span className="mt-1 block text-teal-800">Hesaplamadan tahmin et: hangisi en ucuz?</span></> : phase === 'model' ? <><b>{active}</b> teklifinde kaç TL ödersin? Modeldeki parçaları kullan.</> : <>En ucuz teklif hangisi? Kartına dokun.</>}
          </Prompt>
          {phase === 'predict' && (
            <>
              <Choices cols={3} value={pred} onPick={setPred} options={t.deals.map((d) => ({ id: d.id, label: d.id }))} />
              <CheckButton disabled={!pred} onClick={() => { track.strategy(`Teklif tahmini: ${pred}`); setPhase('model') }}>Tahminimi kaydet</CheckButton>
            </>
          )}
          {phase === 'model' && (
            <>
              <NumPad value={vals[active] ?? ''} onChange={(v) => { setVals((o) => ({ ...o, [active]: v })); setFb(null) }} unit="TL" label={`${active}:`} />
              <CheckButton onClick={checkOne} disabled={!vals[active]} />
            </>
          )}
          {phase === 'choose' && <CheckButton onClick={checkBest} disabled={!best}>Bu teklif en iyisi</CheckButton>}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="yuzdeizgarasi" />)}
          {phase === 'done' && <StrategyPicker question="Mağaza sahibine nasıl açıklarsın?" options={grade >= 8 ? ['Her teklifi ödenecek tutara çevirdim', 'Her teklifi yüzdeye çevirdim', '1 ürünün fiyatına baktım', 'Tahminim tuttu'] : ['Ödenecek tutarları karşılaştırdım', 'İndirim yüzdelerini karşılaştırdım', 'Bedava ürünü düşündüm', 'Tahminim tuttu']} onPick={() => {}} />}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 3. üst üste indirim ───────────────────────── */

function SuccessiveTask({ t, footer, onSolved }: { t: Extract<Task, { kind: 'successive' }> } & Common) {
  const [cells, setCells] = useState(emptyCells)
  const [blocked, setBlocked] = useState<boolean[] | null>(null)
  const [cells2, setCells2] = useState(emptyCells)
  const [phase, setPhase] = useState<'one' | 'two' | 'total' | 'done'>('one')
  const [tot, setTot] = useState<number | null>(null)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const chk = useChecks()
  const k1 = countOn(cells), k2 = countOn(cells2)
  const need2 = ((100 - t.p1) * t.p2) / 100
  const total = t.p1 + need2
  const per = t.price / 100
  const mid = t.price * (1 - t.p1 / 100)
  const check1 = () => {
    if (k1 === t.p1) {
      setBlocked(cells)
      setPhase('two')
      setFb({ ok: true, text: `Evet: ${t.p1} kare = ${tl(t.p1 * per)}. Yeni fiyat ${tl(mid)} — kalan ${100 - t.p1} kare.` })
      return
    }
    chk.fail()
    setFb({ ok: false, text: `Izgaranın tamamı ${tl(t.price)}; 100 kare. %${t.p1} kaç kare?` })
  }
  const check2 = () => {
    if (near(k2, need2)) {
      setPhase('total')
      setFb({ ok: true, text: `Evet! Kasadaki %${t.p2}, yeni fiyatın (${100 - t.p1} karenin) %${t.p2}${ek(t.p2, 'poss', false)}: ${fmt(need2)} kare = ${tl(need2 * per)}.` })
      return
    }
    chk.fail()
    if (k2 === t.p2) setFb({ ok: false, text: `${t.p2} kare boyadın, yani etiket fiyatının %${t.p2}${ek(t.p2, 'poss', false)}. Ama kasada indirim hangi fiyattan yapılıyor? Kalan ${100 - t.p1} karenin %${t.p2}${ek(t.p2, 'poss', false)} kaç kare?`, mis: 'Art arda indirimde ikinci yüzdeyi ilk fiyattan hesapladı' })
    else setFb({ ok: false, text: `Kalan ${100 - t.p1} kareyi ${100 / t.p2} eş gruba ayır: bir grup kaç kare?` })
  }
  const check3 = () => {
    if (tot !== null && near(tot, total)) {
      onSolved(chk.pass())
      setPhase('done')
      setFb({ ok: true, text: `Toplam indirim %${fmt(total)}, %${t.p1 + t.p2} değil! Ödenecek: ${tl(t.price * (1 - total / 100))}.` })
      return
    }
    chk.fail()
    setFb({ ok: false, text: tot === t.p1 + t.p2 ? `Yüzdeleri topladın. Izgarada toplam kaç kare indirim boyalı? Say!` : 'Izgarada iki renkteki karelerin toplamı kaç?', mis: tot === t.p1 + t.p2 ? 'Art arda indirim yüzdelerini topladı (%20 + %10 = %30)' : undefined })
  }
  return (
    <Split
      work={
        <Workbench>
          <Tagline emoji={t.emoji} item={t.item} price={t.price} extra={<span className="ml-1 text-sm font-black text-rose-700">Önce %{t.p1}, kasada %{t.p2} daha!</span>} />
          <div className="mx-auto w-full max-w-[30rem] lg:max-w-[min(30rem,calc(100dvh-22rem))]">
            {phase === 'one' ? (
              <PaintGrid cells={cells} onChange={(c) => { setCells(c); setFb(null) }} color={RED} label="Fiyat ızgarası" />
            ) : (
              <PaintGrid cells={cells2} onChange={(c) => { setCells2(c); setFb(null) }} locked={phase !== 'two'} blocked={blocked!} blockedColor="#fda4af" blockedPattern color="#7c3aed" label="Fiyat ızgarası" />
            )}
            {phase === 'one' && <div className="mt-2"><GridButtons cells={cells} onChange={(c) => { setCells(c); setFb(null) }} /></div>}
            {phase === 'two' && <div className="mt-2"><GridButtons cells={cells2} blocked={blocked!} onChange={(c) => { setCells2(c); setFb(null) }} /></div>}
          </div>
          <div className="flex flex-wrap justify-center gap-2 text-sm font-black">
            <span className="rounded-xl bg-slate-50 px-3 py-1.5 ring-1 ring-line">1 kare = {tl(per)}</span>
            <span className="rounded-xl bg-rose-50 px-3 py-1.5 text-rose-800 ring-1 ring-rose-200">1. indirim: {phase === 'one' ? k1 : t.p1} kare</span>
            {phase !== 'one' && <span className="rounded-xl bg-violet-50 px-3 py-1.5 text-violet-800 ring-1 ring-violet-200">Kasa: {k2} kare</span>}
          </div>
        </Workbench>
      }
      panel={
        <>
          <Prompt step={phase === 'one' ? '1. İlk indirim' : phase === 'two' ? '2. Kasada' : '3. Toplam'}>
            {phase === 'one' && <>Izgaranın tamamı {tl(t.price)}. Önce <b className="text-rose-700">%{t.p1} indirimi</b> boya.</>}
            {phase === 'two' && <>Kasada <b className="text-violet-700">%{t.p2} daha</b> indirim yapıldı. Kasadaki indirim <b>yeni fiyat</b> üzerinden. Onu mor boya.</>}
            {(phase === 'total' || phase === 'done') && <>Ece: “%{t.p1} + %{t.p2} = %{t.p1 + t.p2} indirim aldım.” <span className="mt-1 block text-teal-800">Toplam indirim yüzde kaç?</span></>}
          </Prompt>
          {phase === 'one' && <CheckButton onClick={check1} disabled={k1 === 0} />}
          {phase === 'two' && <CheckButton onClick={check2} disabled={k2 === 0} />}
          {(phase === 'total' || phase === 'done') && (
            <>
              <Choices cols={3} value={tot} disabled={phase === 'done'} onPick={(v) => { setTot(v); setFb(null) }} options={[t.p1 + t.p2, total, t.p1 + t.p2 + 2].sort((a, b) => a - b).map((v) => ({ id: v, label: `%${fmt(v)}` }))} />
              {phase === 'total' && <CheckButton onClick={check3} disabled={tot === null} />}
            </>
          )}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="yuzdeizgarasi" />)}
          {phase === 'done' && <StrategyPicker question="Ece’ye nasıl açıklarsın?" options={['İkinci indirim daha küçük bir fiyattan', 'Izgarada kareleri saydım', `%${100 - t.p1}’in %${100 - t.p2}’i = %${fmt(100 - total)} ödenir`, 'Örnek bir fiyatla denedim']} onPick={() => {}} />}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 4. etiket fiyatı (ters yüzde) ───────────────────────── */

function ReverseTask({ t, footer, onSolved }: { t: Extract<Task, { kind: 'reverse' }> } & Common) {
  const [n, setN] = useState(1)
  const [marked, setMarked] = useState<boolean[]>([false])
  const [phase, setPhase] = useState<'model' | 'answer' | 'done'>('model')
  const [val, setVal] = useState('')
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const chk = useChecks()
  const k = marked.filter(Boolean).length
  const orig = t.paid / (1 - t.pct / 100)
  const modeled = n > 1 && near(k / n, 1 - t.pct / 100)
  const checkModel = () => {
    if (modeled) {
      setPhase('answer')
      setFb({ ok: true, text: `Evet: ödenen ${tl(t.paid)}, bandın ${n} parçasından ${k}${ek(k, 'poss', false)} (%${100 - t.pct}). O zaman 1 parça ${tl(t.paid / k)}.` })
      return
    }
    chk.fail()
    if (n > 1 && near(k / n, t.pct / 100)) setFb({ ok: false, text: `İşaretlediğin parçalar indirim kadar (%${t.pct}). Ama ${tl(t.paid)} senin ÖDEDİĞİN tutar. Ödenen kısım bandın yüzde kaçı?`, mis: 'İndirimli fiyatı indirim yüzdesiyle eşleştirdi' })
    else setFb({ ok: false, text: `%${t.pct} indirim varsa etiket fiyatının yüzde kaçı ödenir? Bandı uygun sayıda parçaya böl ve ödenen parçaları işaretle.` })
  }
  const checkAns = () => {
    const v = parseNum(val)
    if (near(v, orig)) {
      onSolved(chk.pass())
      setPhase('done')
      setFb({ ok: true, text: `Evet! 1 parça ${tl(t.paid / k)} → ${n} parça ${tl(orig)}. Kontrol: ${tl(orig)}’nin %${t.pct}${ek(t.pct, 'poss', false)} ${tl(orig - t.paid)}, kalan ${tl(t.paid)}.` })
      return
    }
    chk.fail()
    if (near(v, t.paid * (1 + t.pct / 100))) setFb({ ok: false, text: `${tl(t.paid)}’ye onun %${t.pct}${ek(t.pct, 'poss', false)} ekledin. Ama indirim ${tl(t.paid)}’den değil, etiket fiyatından yapılmıştı. Bantta bir parça kaç TL? Bütün kaç parça?`, mis: 'Ters yüzde probleminde indirimli fiyata aynı yüzdeyi ekledi' })
    else setFb({ ok: false, text: `Bantta ödenen ${k} parça ${tl(t.paid)}. Bir parça kaç TL? Bütün bant kaç parça?` })
  }
  return (
    <Split
      work={
        <Workbench>
          <Tagline emoji={t.emoji} item={t.item} extra={<p className="mt-0.5 text-sm font-black text-ink-soft">Etiket: <span className="rounded bg-slate-200 px-1.5 text-ink">? TL</span> · %{t.pct} indirim · ödenen {tl(t.paid)}</p>} />
          <PartPicker parts={t.parts} n={n} onPick={(m) => { setN(m); setMarked(Array(m).fill(false)); setFb(null) }} disabled={phase !== 'model'} />
          <PriceBar whole={phase === 'model' ? null : phase === 'done' ? orig : null} n={n} marked={marked} onChange={(m) => { setMarked(m); setFb(null) }} mode="paid" locked={phase !== 'model'} label="Etiket fiyatı (%100)" values={phase !== 'model'} />
          {phase === 'answer' && (
            <div className="flex">
              {Array.from({ length: n }, (_, i) => (
                <span key={i} className={`flex-1 text-center text-xs font-black ${marked[i] ? 'text-green-700' : 'text-rose-700'}`}>{marked[i] ? fmt(t.paid / k) : '?'}</span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2 text-sm font-black">
            <span className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-800 ring-1 ring-emerald-200">Ödenen parçalar: {k}/{n} = {tl(t.paid)}</span>
          </div>
        </Workbench>
      }
      panel={
        <>
          <Prompt step={phase === 'model' ? '1. Modelle' : '2. Etiket fiyatı'}>Deniz {t.item} için %{t.pct} indirimle <b>{tl(t.paid)}</b> ödedi. <span className="mt-1 block text-teal-800">İndirimden önceki etiket fiyatı neydi?</span>{phase === 'model' && <span className="mt-1 block text-sm font-bold text-ink-soft">Bandı böl ve Deniz’in ödediği parçaları yeşile boya.</span>}</Prompt>
          {phase === 'model' && <CheckButton onClick={checkModel} disabled={k === 0 || n === 1} />}
          {phase !== 'model' && (
            <>
              <NumPad value={val} onChange={(v) => { setVal(v); setFb(null) }} unit="TL" label="Etiket" disabled={phase === 'done'} />
              {phase === 'answer' && <CheckButton onClick={checkAns} disabled={!val} />}
            </>
          )}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="ciftdogru" toolTitle="Çift sayı doğrusunda dene" />)}
          {phase === 'done' && <StrategyPicker question="Nasıl buldun?" options={['Bir parçanın değerini bulup çarptım', `%${100 - t.pct} = ${tl(t.paid)} → %${t.pct === 25 ? 25 : 10} = ?`, 'Deneyerek (fiyat tahmin edip kontrol)', 'Çift sayı doğrusu']} onPick={() => {}} />}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 5. zam sonra indirim ───────────────────────── */

function RaiseTask({ t, footer, onSolved }: { t: Extract<Task, { kind: 'raise' }> } & Common) {
  const [n1, setN1] = useState(1)
  const [m1, setM1] = useState<boolean[]>([false])
  const [n2, setN2] = useState(1)
  const [m2, setM2] = useState<boolean[]>([false])
  const [phase, setPhase] = useState<'up' | 'down' | 'judge' | 'done'>('up')
  const [ans, setAns] = useState<string | null>(null)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const chk = useChecks()
  const high = t.price * (1 + t.up / 100)
  const fin = high * (1 - t.down / 100)
  const k1 = m1.filter(Boolean).length, k2 = m2.filter(Boolean).length
  const check1 = () => {
    if (n1 > 1 && near(k1 / n1, t.up / 100)) {
      setPhase('down')
      setFb({ ok: true, text: `Zam ${tl(t.price * t.up / 100)}; yeni fiyat ${tl(high)}. Şimdi indirim bu YENİ fiyattan yapılacak.` })
      return
    }
    chk.fail()
    setFb({ ok: false, text: `%${t.up} için bandı kaç eş parçaya bölmelisin? Kaç parça zam eklenir?` })
  }
  const check2 = () => {
    if (n2 > 1 && near(k2 / n2, t.down / 100)) {
      setPhase('judge')
      setFb({ ok: true, text: `İndirim ${tl(high * t.down / 100)}; son fiyat ${tl(fin)}.` })
      return
    }
    chk.fail()
    setFb({ ok: false, text: `Bu kez bütün ${tl(high)}. Onun %${t.down}${ek(t.down, 'poss', false)} için bandı nasıl bölersin?` })
  }
  const right = near(fin, t.price) ? 'same' : fin < t.price ? 'less' : 'more'
  const check3 = () => {
    if (ans === right) {
      onSolved(chk.pass())
      setPhase('done')
      setFb({ ok: true, text: `Evet: ${tl(fin)}, eski fiyattan ${tl(Math.abs(t.price - fin))} ${fin < t.price ? 'daha ucuz' : 'daha pahalı'}. İndirim daha büyük bir bütünden alındı!` })
      return
    }
    chk.fail()
    setFb({ ok: false, text: ans === 'same' ? `%${t.up} zam ve %${t.down} indirim aynı yüzde ama aynı TL mi? Zam ${tl(t.price * t.up / 100)}, indirim ${tl(high * t.down / 100)}.` : 'Son fiyatı eski fiyatla karşılaştır.', mis: ans === 'same' ? 'Aynı yüzdede zam ve indirimin birbirini götürdüğünü düşündü' : undefined })
  }
  return (
    <Split
      work={
        <Workbench>
          <Tagline emoji={t.emoji} item={t.item} price={t.price} />
          <PartPicker parts={[2, 4, 5, 10]} n={n1} onPick={(m) => { setN1(m); setM1(Array(m).fill(false)); setFb(null) }} disabled={phase !== 'up'} />
          <PriceBar whole={t.price} n={n1} marked={m1} onChange={(m) => { setM1(m); setFb(null) }} mode="raise" locked={phase !== 'up'} label={phase === 'up' ? <>Eski fiyat — zam kadar parçayı mavi yap</> : <>Eski fiyat: {tl(t.price)}, zam: {tl(t.price * t.up / 100)}</>} />
          {phase !== 'up' && (
            <>
              <div className="border-t-2 border-dashed border-line pt-3"><PartPicker parts={[2, 4, 5, 6, 10]} n={n2} onPick={(m) => { setN2(m); setM2(Array(m).fill(false)); setFb(null) }} disabled={phase !== 'down'} /></div>
              <PriceBar whole={high} n={n2} marked={m2} onChange={(m) => { setM2(m); setFb(null) }} locked={phase !== 'down'} label={<>Zamlı fiyat {tl(high)} — indirim kadar parçayı işaretle</>} />
            </>
          )}
          {(phase === 'judge' || phase === 'done') && (
            <div className="space-y-1 text-sm font-black">
              <div className="flex items-center gap-2"><span className="w-20">Eski</span><span className="h-6 rounded-md bg-amber-300" style={{ width: `${(t.price / high) * 70}%` }} /><span>{tl(t.price)}</span></div>
              <div className="flex items-center gap-2"><span className="w-20">Son</span><span className="h-6 rounded-md bg-emerald-400" style={{ width: `${(fin / high) * 70}%` }} /><span>{phase === 'done' ? tl(fin) : '?'}</span></div>
            </div>
          )}
        </Workbench>
      }
      panel={
        <>
          <Prompt step={phase === 'up' ? '1. Zam' : phase === 'down' ? '2. İndirim' : '3. Karşılaştır'}>{t.item[0].toLocaleUpperCase('tr') + t.item.slice(1)} {tl(t.price)} idi. Önce <b className="text-blue-700">%{t.up} zam</b> geldi, bir ay sonra <b className="text-rose-700">%{t.down} indirim</b> yapıldı. <span className="mt-1 block text-teal-800">Son fiyat eski fiyatla aynı mı?</span></Prompt>
          {phase === 'up' && <CheckButton onClick={check1} disabled={k1 === 0} />}
          {phase === 'down' && <CheckButton onClick={check2} disabled={k2 === 0} />}
          {(phase === 'judge' || phase === 'done') && (
            <>
              <Choices cols={3} value={ans} disabled={phase === 'done'} onPick={(v) => { setAns(v); setFb(null) }} options={[{ id: 'less', label: 'Daha ucuz' }, { id: 'same', label: 'Aynı' }, { id: 'more', label: 'Daha pahalı' }]} />
              {phase === 'judge' && <CheckButton onClick={check3} disabled={!ans} />}
            </>
          )}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} />)}
          {phase === 'done' && <StrategyPicker question="Nasıl düşündün?" options={['Bütün değişti: indirim büyük fiyattan', `${fmt(1 + t.up / 100)} × ${fmt(1 - t.down / 100)} = ${fmt((1 + t.up / 100) * (1 - t.down / 100))}`, 'Bant modelinde parçaları karşılaştırdım', 'Tahmin ettim']} onPick={() => {}} />}
          {footer}
        </>
      }
    />
  )
}

