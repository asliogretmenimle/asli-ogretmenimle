import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Eye, Grid3x3, RotateCcw, Scissors } from 'lucide-react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { Scene, SolutionList, StrategyPicker, useSolutions } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { MathText } from '../../components/MathText'
import { ek } from '../../lib/generators'
import { Card, CheckButton, Choices, GridButtons, Header, NextButton, Nudge, NumPad, PaintGrid, Prompt, S, Slider, Split, countOn, emptyCells, fmt, gcd, parseNum, pick, rng, shuffle, tl, useChecks } from './ortak'

/**
 * 41. Yüzde Boyama (5–7)
 * Yüzde = “yüzde bir”lerin sayısı. Öğrenci 100 karelik ızgarayı parmağıyla boyar; boyadığı miktarın
 * kesir, ondalık ve yüzde adları hareketinden türeyerek belirir. Görevler:
 *  - paint:    aynı yüzdeyi farklı desenlerle boya (çoklu çözüm)
 *  - frac/dec: bir kesri/ondalığı boya → aynı miktarın üç adı
 *  - estimate: düzensiz bir gölün kapladığı yüzdeyi önce tahmin et, sonra kareleri sayarak kanıtla
 *  - whole:    ızgaranın tamamı 300 TL / 40 öğrenci olursa? (farklı bütünler)
 *  - compare:  farklı bütünlerin yüzdeleri — büyük yüzde, büyük miktar demek mi?
 */

type Side = { name: string; whole: number; pct: number }
type Task =
  | { kind: 'paint'; pct: number }
  | { kind: 'frac'; num: number; den: number }
  | { kind: 'dec'; text: string; k: number }
  | { kind: 'estimate'; target: number; seed: number; tol: number; invert: boolean }
  | { kind: 'amount'; whole: number; unit: string; amount: number; story: string; ask: string }
  | { kind: 'percent'; whole: number; unit: string; pct: number; story: string; ask: string; noun: string }
  | { kind: 'compare'; a: Side; b: Side; story: string; noun: string; unit: string; q: string }

const TEAL = '#0d9488'
/** %40’ı, %36’sı */
const pp = (p: number) => `%${p}${ek(p, 'poss', false)}`
/** %40’ını, %36’sını */
const ppAcc = (p: number) => { const x = ek(p, 'poss', false); return `%${p}${x}n${x.slice(-1)}` }

function makeTasks(grade: Grade): Task[] {
  const r = rng(Date.now() % 100000)
  const seed = Math.floor(r() * 1e6)
  if (grade === 5) {
    const [f1, f2] = shuffle([[1, 4], [3, 4], [2, 5], [3, 10], [1, 2]] as const, r)
    const am = pick([{ amount: 50, ask: '50 TL' }, { amount: 70, ask: '70 TL' }, { amount: 90, ask: '90 TL' }], r)
    return [
      { kind: 'paint', pct: pick([30, 24, 45], r) },
      { kind: 'frac', num: f1[0], den: f1[1] },
      { kind: 'dec', ...pick([{ text: '0,6', k: 60 }, { text: '0,25', k: 25 }, { text: '0,7', k: 70 }], r) },
      { kind: 'estimate', target: 28 + Math.floor(r() * 12), seed, tol: 10, invert: false },
      { kind: 'amount', whole: 200, unit: 'TL', amount: am.amount, story: `Ece’nin kumbarasında 200 TL var. Izgaranın tamamı bu 200 TL.`, ask: `Ece kitap için ${am.ask} harcadı. Harcadığı parayı ızgarada boya.` },
      { kind: 'frac', num: f2[0], den: f2[1] },
    ]
  }
  if (grade === 6) {
    const p = pick([{ whole: 40, pct: 35, noun: 'öğrenci' }, { whole: 40, pct: 15, noun: 'öğrenci' }, { whole: 60, pct: 45, noun: 'öğrenci' }], r)
    const cmp = pick([
      { a: { name: '6-A', whole: 20, pct: 40 }, b: { name: '6-B', whole: 30, pct: 30 } },
      { a: { name: '6-A', whole: 25, pct: 60 }, b: { name: '6-B', whole: 40, pct: 40 } },
    ], r)
    return [
      { kind: 'paint', pct: pick([36, 48, 64], r) },
      { kind: 'frac', ...pick([{ num: 3, den: 20 }, { num: 7, den: 25 }, { num: 9, den: 50 }], r) },
      { kind: 'dec', ...pick([{ text: '0,05', k: 5 }, { text: '0,45', k: 45 }, { text: '0,08', k: 8 }], r) },
      { kind: 'estimate', target: 30 + Math.floor(r() * 12), seed, tol: 8, invert: false },
      { kind: 'percent', whole: p.whole, unit: 'öğrenci', pct: p.pct, noun: 'öğrenci', story: `Bir sınıfta ${p.whole} öğrenci var. Izgaranın tamamı bu ${p.whole} öğrenci.`, ask: `Öğrencilerin ${pp(p.pct)} gözlüklü. Önce %${ek(p.pct, 'acc')} boya, sonra kaç öğrenci olduğunu bul.` },
      { kind: 'compare', ...cmp, noun: 'öğrenci', unit: 'öğrenci', story: `${cmp.a.name} sınıfında ${cmp.a.whole} öğrencinin ${pp(cmp.a.pct)}, ${cmp.b.name} sınıfında ${cmp.b.whole} öğrencinin ${pp(cmp.b.pct)} okula bisikletle geliyor.`, q: 'Hangi sınıfta bisikletle gelen öğrenci daha çok?' },
    ]
  }
  const p = pick([{ whole: 250, pct: 12 }, { whole: 300, pct: 35 }, { whole: 800, pct: 15 }], r)
  const cmp = pick([
    { a: { name: 'A mağazası', whole: 400, pct: 25 }, b: { name: 'B mağazası', whole: 500, pct: 20 } },
    { a: { name: 'A mağazası', whole: 300, pct: 30 }, b: { name: 'B mağazası', whole: 450, pct: 20 } },
  ], r)
  return [
    { kind: 'frac', ...pick([{ num: 1, den: 3 }, { num: 3, den: 8 }, { num: 1, den: 8 }], r) },
    { kind: 'dec', ...pick([{ text: '0,07', k: 7 }, { text: '0,125', k: 12.5 }], r) },
    { kind: 'paint', pct: pick([48, 72, 36], r) },
    { kind: 'estimate', target: 62 + Math.floor(r() * 12), seed, tol: 6, invert: true },
    { kind: 'percent', whole: p.whole, unit: 'TL', pct: p.pct, noun: 'TL', story: `Bir bisiklet kaskı ${tl(p.whole)}. Izgaranın tamamı bu ${tl(p.whole)}.`, ask: `Kaska %${p.pct} indirim yapıldı. Önce indirimi ızgarada boya, sonra indirimin kaç TL olduğunu bul.` },
    { kind: 'compare', ...cmp, noun: 'TL', unit: 'TL', story: `${cmp.a.name}: ${tl(cmp.a.whole)}’lik montta %${cmp.a.pct} indirim. ${cmp.b.name}: ${tl(cmp.b.whole)}’lik montta %${cmp.b.pct} indirim.`, q: 'Hangi mağazada indirim tutarı (TL) daha çok?' },
  ]
}

const titles: Record<Task['kind'], string> = {
  paint: 'Aynı yüzde, farklı desen',
  frac: 'Kesri yüzde bire çevir',
  dec: 'Ondalığı boya',
  estimate: 'Göz kararı yüzde',
  amount: 'Bütün 100 değilse?',
  percent: 'Bütün 100 değilse?',
  compare: 'Hangisi daha çok?',
}

export default function YuzdeBoyama({ grade, onFinish }: InteractionProps) {
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
    const ways = sol.list.length
    onFinish({
      stars: starsFor((f + Math.min(1, ways * 0.25)) / tasks.length),
      summary: `${tasks.length} yüzde görevini boyayarak çözdün${ways > 1 ? `, aynı yüzdeyi ${ways} farklı desenle gösterdin` : ''}.`,
      insight:
        grade === 5
          ? 'Yüzde, “100 eş parçadan kaçı” demektir: aynı boyalı alanın kesir, ondalık ve yüzde adları vardır ([[3/4]] = [[75/100]] = 0,75 = %75).'
          : grade === 6
            ? 'Yüzde her zaman bir bütünün yüzdesidir: ızgaranın tamamı 40 öğrenci olunca 1 kare 0,4 öğrenci eder; büyük yüzde her zaman büyük miktar demek değildir.'
            : 'Yüzde bir karşılaştırma ölçüsüdür: bütün değişince aynı yüzde farklı miktar, farklı yüzdeler aynı miktar olabilir; tahminde %50 ve %25 gibi referanslar çok işe yarar.',
    })
  }

  const footer = solved ? <NextButton last={last} onClick={next} /> : null
  const common = { grade, dark, footer, onSolved, sol }
  return (
    <Scene grade={grade}>
      <Header emoji="🖌️" kicker="Görev" title={titles[task.kind]} idx={idx} total={tasks.length} dark={dark} />
      <TaskView key={idx} task={task} {...common} />
    </Scene>
  )
}

type Common = { grade: Grade; dark: boolean; footer: ReactNode; onSolved: (first: boolean) => void; sol: ReturnType<typeof useSolutions> }

function TaskView({ task, ...c }: { task: Task } & Common) {
  switch (task.kind) {
    case 'paint': return <PaintTask t={task} {...c} />
    case 'frac': return <FracTask t={task} {...c} />
    case 'dec': return <FracTask t={task} {...c} />
    case 'estimate': return <EstimateTask t={task} {...c} />
    case 'amount': return <AmountTask t={task} {...c} />
    case 'percent': return <PercentTask t={task} {...c} />
    case 'compare': return <CompareTask t={task} {...c} />
  }
}

/* ───────────────────────── ortak görünüm ───────────────────────── */

function GridStage({ children, label }: { children: ReactNode; label?: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[34rem] lg:max-w-[min(34rem,calc(100dvh-18rem))]">
      {label && <div className="mb-2 flex justify-center">{label}</div>}
      <div className="rounded-3xl bg-teal-50 p-2 shadow-sm ring-1 ring-teal-200">{children}</div>
    </div>
  )
}

/** Boyanan miktarın üç adı: [[k/100]] = 0,kk = %k */
function Names({ k, reveal = true, extra }: { k: number; reveal?: boolean; extra?: ReactNode }) {
  const d = gcd(Math.round(k * 10), 1000) / 10
  const simple = k > 0 && k < 100 && Number.isInteger(k) && d > 1 ? `[[${k / d}/${100 / d}]]` : null
  return (
    <div className="rounded-2xl bg-teal-700 px-3 py-2.5 text-white">
      <p className="text-xs font-black tracking-wide text-teal-100 uppercase">Boyadığın miktar</p>
      {reveal ? (
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xl font-black tabular-nums">
          <span>{fmt(k)} kare</span>
          <span className="text-teal-200">=</span>
          <MathText text={`[[${fmt(k)}/100]]`} />
          {simple && (
            <>
              <span className="text-teal-200">=</span>
              <MathText text={simple} />
            </>
          )}
          <span className="text-teal-200">=</span>
          <span>{fmt(k / 100, 3)}</span>
          <span className="text-teal-200">=</span>
          <span>%{fmt(k)}</span>
        </p>
      ) : (
        <p className="mt-1 text-2xl font-black tabular-nums">{fmt(k)} kare</p>
      )}
      {extra}
    </div>
  )
}

/* ───────────────────────── 1. aynı yüzde, farklı desen ───────────────────────── */

function shapeOf(cells: boolean[]): { key: string; label: string } {
  const on = cells.flatMap((v, i) => (v ? [i] : []))
  const k = on.length
  const cols = Array.from({ length: 10 }, (_, c) => Array.from({ length: 10 }, (_, r) => cells[r * 10 + c]))
  const rows = Array.from({ length: 10 }, (_, r) => cells.slice(r * 10, r * 10 + 10))
  const fullCols = cols.filter((c) => c.every(Boolean)).length
  const fullRows = rows.filter((r) => r.every(Boolean)).length
  if (k % 10 === 0 && fullCols * 10 === k) return { key: 'cols', label: `${k / 10} tam sütun` }
  if (k % 10 === 0 && fullRows * 10 === k) return { key: 'rows', label: `${k / 10} tam satır` }
  const xs = on.map((i) => i % 10), ys = on.map((i) => Math.floor(i / 10))
  const w = Math.max(...xs) - Math.min(...xs) + 1, h = Math.max(...ys) - Math.min(...ys) + 1
  if (w * h === k) return { key: `rect-${Math.min(w, h)}x${Math.max(w, h)}`, label: `${w} × ${h} dikdörtgen` }
  const pc = cols.map((c) => c.filter(Boolean).length)
  const partial = pc.filter((n) => n > 0 && n < 10).length
  if (fullCols === Math.floor(k / 10) && partial <= 1) return { key: 'tens', label: `${Math.floor(k / 10)} sütun + ${k % 10} kare` }
  const pr = rows.map((r) => r.filter(Boolean).length)
  if (fullRows === Math.floor(k / 10) && pr.filter((n) => n > 0 && n < 10).length <= 1) return { key: 'tensr', label: `${Math.floor(k / 10)} satır + ${k % 10} kare` }
  return { key: 'free', label: 'Serbest desen' }
}

function PaintTask({ t, footer, onSolved, sol }: { t: Extract<Task, { kind: 'paint' }> } & Common) {
  const [cells, setCells] = useState(emptyCells)
  const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null)
  const [mine, setMine] = useState<string[]>([])
  const chk = useChecks()
  const k = countOn(cells)
  const check = () => {
    if (k !== t.pct) {
      chk.fail()
      setFb({
        ok: false,
        text: k === 100 - t.pct ? `${k} kare boyadın; boş kalan kareler kaç? %${t.pct} boyalı kısmı anlatır.` : `%${t.pct} “her 100 kareden ${t.pct}${ek(t.pct, 'poss', false)}” demek. Şu an ${k} kare boyalı — ${k > t.pct ? 'fazla mı' : 'eksik mi'}, kaç kare ${k > t.pct ? 'silmelisin' : 'eklemelisin'}?`,
      })
      return
    }
    const s = shapeOf(cells)
    const isNew = !mine.includes(s.key)
    if (isNew) {
      setMine((m) => [...m, s.key])
      sol.add(`${t.pct}-${s.key}`, `%${t.pct}: ${s.label}`)
    }
    const first = chk.pass()
    if (mine.length === 0) onSolved(first)
    setFb({ ok: true, text: isNew ? `Harika: ${s.label}. ${mine.length === 0 ? 'Aynı yüzdeyi bambaşka bir desenle de boyayabilir misin?' : 'Bir desen daha!'}` : `Bu deseni zaten buldun (${s.label}). Satırlar, dikdörtgenler ya da serbest bir şekil dene.` })
  }
  return (
    <Split
      work={
        <GridStage label={<span className="rounded-full bg-white px-4 py-1 text-sm font-black text-teal-800 ring-1 ring-teal-200">Boyalı: {k} kare</span>}>
          <PaintGrid cells={cells} onChange={(c) => { setCells(c); setFb(null) }} label="Yüzde ızgarası" />
          <div className="mt-2"><GridButtons cells={cells} onChange={(c) => { setCells(c); setFb(null) }} /></div>
        </GridStage>
      }
      panel={
        <>
          <Prompt step="Boya">Izgaranın <b className="text-teal-700">{ppAcc(t.pct)}</b> boya. Sonra aynı miktarı <b>başka bir desenle</b> boya.</Prompt>
          <Card>
            <p className="text-sm font-bold text-ink-soft">Parmağını karelerin üzerinde gezdir. Dolu bir kareden başlarsan silersin. +10 bir sütun ekler.</p>
          </Card>
          <CheckButton onClick={check} disabled={k === 0} />
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={k === 100 - t.pct ? 'Yüzde boyamada boyalı ve boş kısmı karıştırdı' : undefined} tool="yuzdeizgarasi" />)}
          {fb?.ok && <Names k={k} />}
          {fb?.ok && <button type="button" onClick={() => { setCells(emptyCells()); setFb(null) }} className="btn-ghost min-h-12"><RotateCcw size={18} />Yeni desen dene</button>}
          <SolutionList list={sol.list.filter((s) => s.key.startsWith(`${t.pct}-`))} />
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 2. kesir / ondalık boya ───────────────────────── */

/** d eş parçaya bölme çizgileri (100 karelik ızgarada) */
function Partition({ d }: { d: number }) {
  const L = S * 10
  const lines: ReactNode[] = []
  const v = (x: number, key: string) => <line key={key} x1={x} x2={x} y1={0} y2={L} stroke="#e11d48" strokeWidth={3} strokeDasharray="7 5" />
  const h = (y: number, key: string) => <line key={key} y1={y} y2={y} x1={0} x2={L} stroke="#e11d48" strokeWidth={3} strokeDasharray="7 5" />
  if (d === 4) lines.push(v(L / 2, 'v'), h(L / 2, 'h'))
  else if (d === 20) {
    for (let i = 1; i < 10; i++) lines.push(v(i * S, `v${i}`))
    lines.push(h(L / 2, 'h'))
  } else if (d === 25) for (let i = 1; i < 5; i++) lines.push(v(i * 2 * S, `v${i}`), h(i * 2 * S, `h${i}`))
  else if (d === 50) {
    for (let i = 1; i < 10; i++) lines.push(v(i * S, `v${i}`))
    for (let i = 1; i < 5; i++) lines.push(h(i * 2 * S, `h${i}`))
  } else if (d === 8) {
    for (let i = 1; i < 4; i++) lines.push(v((i * L) / 4, `v${i}`))
    lines.push(h(L / 2, 'h'))
  } else for (let i = 1; i < d; i++) lines.push(v((i * L) / d, `v${i}`))
  return <g pointerEvents="none">{lines}</g>
}

function FracTask({ t, grade, footer, onSolved }: { t: Extract<Task, { kind: 'frac' } | { kind: 'dec' }> } & Common) {
  const isFrac = t.kind === 'frac'
  const target = isFrac ? (100 * t.num) / t.den : t.k
  const [cells, setCells] = useState(emptyCells)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const [cut, setCut] = useState(false)
  const [done, setDone] = useState(false)
  const chk = useChecks()
  const k = countOn(cells)
  const label = isFrac ? `[[${t.num}/${t.den}]]` : t.text
  const check = () => {
    if (Math.abs(k - target) <= 0.5 + 1e-9) {
      onSolved(chk.pass())
      setDone(true)
      const exact = Number.isInteger(target) ? '' : ` Tam olarak ${fmt(target)} kare gerekir: bir karenin bir parçası! Bu yüzden ${label} = %${fmt(target)}.`
      setFb({ ok: true, text: `Evet! ${label} kadarı ${fmt(k)} kare.${exact}` })
      return
    }
    chk.fail()
    if (isFrac) {
      const cat = t.num * 10 + t.den
      if (k === cat) setFb({ ok: false, text: `${k} kare, ${t.num} ile ${ek(t.den, 'acc')} yan yana yazmak gibi oldu. ${label}: bütün ${t.den} eş parçaya bölünür, ${t.num} parça alınır. 100 kare ${t.den} eş parçaya bölünürse her parça kaç kare olur?`, mis: 'Kesri yüzdeye çevirirken pay ve paydayı yan yana yazdı (3/4 → %34)' })
      else if (k === t.num) setFb({ ok: false, text: `${t.num} kare boyadın. ${label} “${t.num} kare” mi, yoksa “bütünün ${t.den} eş parçasından ${t.num}${ek(t.num, 'poss', false)}” mi? Izgarayı ${t.den} eş parçaya bölmeyi dene.`, mis: 'Kesrin payı kadar kare boyadı (bütünü dikkate almadı)' })
      else setFb({ ok: false, text: `${label} için ızgarayı ${t.den} eş parçaya bölünmüş düşün. Her parça kaç kare? ${t.num} parça kaç kare eder?` })
    } else {
      if (near10(k, target)) setFb({ ok: false, text: k < target ? `${t.text}: virgülden sonraki ilk basamak onda birleri gösterir. Bir tam sütun (10 kare) ızgaranın onda biri mi, yüzde biri mi?` : `${t.text}: kaç onda bir, kaç yüzde bir var? Tek bir kare ızgaranın yüzde biri (0,01).`, mis: 'Onda birler ile yüzde birleri karıştırdı (0,6 → 6 kare)' })
      else setFb({ ok: false, text: `Bir sütun = 10 kare = 0,1; bir kare = 0,01. ${t.text} kaç sütun ve kaç kare eder?` })
    }
  }
  return (
    <Split
      work={
        <GridStage label={<span className="rounded-full bg-white px-4 py-1 text-sm font-black text-teal-800 ring-1 ring-teal-200">Boyalı: {k} kare</span>}>
          <PaintGrid cells={cells} locked={done} onChange={(c) => { setCells(c); setFb(null) }} label="Yüzde ızgarası">{cut && isFrac && <Partition d={t.den} />}</PaintGrid>
          {!done && <div className="mt-2"><GridButtons cells={cells} onChange={(c) => { setCells(c); setFb(null) }} /></div>}
        </GridStage>
      }
      panel={
        <>
          <Prompt step="Boya">
            Izgaranın <span className="inline-flex align-middle text-2xl text-teal-700"><MathText text={label} /></span> kadarını boya.
            {grade >= 6 && <span className="mt-1 block text-sm font-bold text-ink-soft">Kaç kare boyadığın, bu kesrin yüzde adını söyleyecek.</span>}
          </Prompt>
          {isFrac && !done && (
            <button type="button" onClick={() => { if (!cut) chk.hint(); setCut(!cut) }} aria-pressed={cut} className={`btn min-h-12 ring-1 ${cut ? 'bg-rose-50 text-rose-800 ring-rose-300' : 'bg-white text-ink ring-line'}`}>
              <Scissors size={18} />{cut ? 'Bölme çizgilerini gizle' : `Izgarayı ${t.den} eş parçaya böl`}
            </button>
          )}
          {!done && <CheckButton onClick={check} disabled={k === 0} />}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="yuzdeizgarasi" toolTitle="Yüzde ızgarasında dene" />)}
          {done && <Names k={target} />}
          {done && (
            <StrategyPicker
              question="Kaç kare olduğunu nasıl buldun?"
              options={isFrac ? [`100’ü ${t.den} eş parçaya böldüm`, `Denk kesir: payı ve paydayı aynı sayıyla çarptım`, `Önce 1/${t.den}’i buldum, sonra katladım`, 'Deneyerek boyadım'] : ['Sütunları onda bir, kareleri yüzde bir diye saydım', 'Ondalığı yüzde bir olarak okudum', 'Deneyerek boyadım']}
              onPick={() => {}}
            />
          )}
          {footer}
        </>
      }
    />
  )
}
const near10 = (k: number, target: number) => Math.abs(k * 10 - target) < 1e-6 || Math.abs(k - target * 10) < 1e-6

/* ───────────────────────── 3. tahmin: göl ───────────────────────── */

function makeBlob(seed: number, target: number, invert: boolean) {
  const r = rng(seed)
  const want = invert ? 100 - target : target
  const amps = [0.1 + r() * 0.08, 0.05 + r() * 0.06, 0.02 + r() * 0.04]
  const ks = [2, 3, 5]
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28]
  const N = 160
  const unit = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2
    const rr = 1 + amps.reduce((s, m, j) => s + m * Math.sin(ks[j] * a + ph[j]), 0)
    return [rr * Math.cos(a) * 1.12, rr * Math.sin(a) * 0.9] as [number, number]
  })
  const area0 = Math.abs(unit.reduce((s, [x, y], i) => { const [x2, y2] = unit[(i + 1) % N]; return s + x * y2 - x2 * y }, 0)) / 2
  let s = Math.sqrt(want / area0)
  const maxX = Math.max(...unit.map(([x]) => Math.abs(x))), maxY = Math.max(...unit.map(([, y]) => Math.abs(y)))
  s = Math.min(s, 4.75 / maxX, 4.75 / maxY)
  const cx = 5 + (r() - 0.5) * Math.max(0, 9.6 - 2 * s * maxX) * 0.9
  const cy = 5 + (r() - 0.5) * Math.max(0, 9.6 - 2 * s * maxY) * 0.9
  const pts = unit.map(([x, y]) => [cx + s * x, cy + s * y] as [number, number])
  const area = area0 * s * s
  const inside = (px: number, py: number) => {
    let c = false
    for (let i = 0, j = N - 1; i < N; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j]
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c
    }
    return c
  }
  // her karenin dolu kısmı (6×6 örnek)
  const cover = Array.from({ length: 100 }, (_, i) => {
    const c = i % 10, rw = Math.floor(i / 10)
    let n = 0
    for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) if (inside(c + (a + 0.5) / 6, rw + (b + 0.5) / 6)) n++
    const f = n / 36
    return invert ? 1 - f : f
  })
  const actual = Math.round(invert ? 100 - area : area)
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(x * S).toFixed(1)} ${(y * S).toFixed(1)}`).join(' ') + 'Z'
  return { d, actual, cover }
}

function EstimateTask({ t, footer, onSolved, grade }: { t: Extract<Task, { kind: 'estimate' }> } & Common) {
  const blob = useMemo(() => makeBlob(t.seed, t.target, t.invert), [t])
  const [guess, setGuess] = useState(50)
  const [touched, setTouched] = useState(false)
  const [lines, setLines] = useState(false)
  const [marks, setMarks] = useState(emptyCells)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const [done, setDone] = useState(false)
  const chk = useChecks()
  const full = blob.cover.filter((c) => c > 0.97).length
  const part = blob.cover.filter((c) => c > 0.03 && c <= 0.97).length
  const thing = t.invert ? 'çimenlik (yeşil alan)' : 'göl'
  const check = () => {
    const diff = guess - blob.actual
    if (Math.abs(diff) <= t.tol) {
      onSolved(chk.pass())
      setDone(true)
      setLines(true)
      setFb({ ok: true, text: `Gerçek değer yaklaşık %${blob.actual}. Tahminin %${guess} — ${Math.abs(diff) <= 3 ? 'çok yakın!' : 'iyi bir tahmin!'}` })
      return
    }
    chk.fail()
    if (!lines) setLines(true)
    const big = diff > 0
    const ref = blob.actual < 50 ? (blob.actual < 25 ? '%25' : '%50') : blob.actual < 75 ? '%50' : '%75'
    setFb({
      ok: false,
      text: chk.fails === 1
        ? `Henüz değil. ${thing[0].toUpperCase() + thing.slice(1)} ızgaranın yarısından ${blob.actual > 50 ? 'fazla mı, az mı' : 'az mı, fazla mı'}? ${ref} çizgisiyle karşılaştır. Kareleri görmek için ızgarayı açtım: tam dolu kareleri işaretleyip sayabilirsin.`
        : `Tahminin biraz ${big ? 'büyük' : 'küçük'}. Tam dolu kareleri say; yarım dolu iki kareyi bir tam kare gibi düşün.`,
      mis: Math.abs(diff) > 25 ? 'Alan tahmininde yüzde referanslarını (%25, %50) kullanmadı' : undefined,
    })
  }
  const marked = countOn(marks)
  const fieldColor = '#4ade80'
  return (
    <Split
      work={
        <GridStage label={<span className="rounded-full bg-white px-4 py-1 text-sm font-black text-teal-800 ring-1 ring-teal-200">{t.invert ? '🌿 Park planı: yeşil alan çimenlik, mavi alan havuz' : '🗺️ Harita: mavi alan göl'}</span>}>
          <PaintGrid
            cells={marks}
            onChange={(c) => lines && !done && setMarks(c)}
            locked={!lines || done}
            color="rgba(250, 204, 21, 0.55)"
            lines={lines}
            label="Göl haritası"
            under={
              <g pointerEvents="none">
                {t.invert && <rect x={0} y={0} width={S * 10} height={S * 10} rx={6} fill={fieldColor} />}
                <path d={blob.d} fill={t.invert ? '#7dd3fc' : '#38bdf8'} stroke={t.invert ? '#0284c7' : '#0369a1'} strokeWidth={2.5} />
                {!lines && (
                  <g stroke="#1f2340" strokeOpacity={0.25} strokeWidth={1.5} strokeDasharray="6 6">
                    <line x1={S * 5} x2={S * 5} y1={0} y2={S * 10} />
                    <line y1={S * 5} y2={S * 5} x1={0} x2={S * 10} />
                  </g>
                )}
              </g>
            }
          >
            {done && (
              <g pointerEvents="none">
                {blob.cover.map((c, i) => {
                  const x = (i % 10) * S, y = Math.floor(i / 10) * S
                  if (c > 0.97) return <rect key={i} x={x + 3} y={y + 3} width={S - 6} height={S - 6} rx={3} fill="none" stroke="#166534" strokeWidth={2} />
                  if (c > 0.03) return <circle key={i} cx={x + S / 2} cy={y + S / 2} r={4} fill="#f97316" />
                  return null
                })}
              </g>
            )}
          </PaintGrid>
          {lines && !done && <p className="mt-2 text-center text-sm font-bold text-teal-900">Saydığın kareleri parmağınla işaretle: <b>{marked}</b> kare işaretli.</p>}
        </GridStage>
      }
      panel={
        <>
          <Prompt step="Önce tahmin et">
            {t.invert ? <>Yeşil çimenlik parkın <b>yüzde kaçı</b>?</> : <>Mavi göl haritanın <b>yüzde kaçını</b> kaplıyor?</>}
            <span className="mt-1 block text-sm font-bold text-ink-soft">Kareleri saymadan önce göz kararı tahmin et. Kesikli çizgiler ızgarayı dörde bölüyor.</span>
          </Prompt>
          <Card>
            <p className="mb-1 text-xs font-black tracking-wide text-ink-soft uppercase">Tahminin</p>
            <Slider value={guess} onChange={(v) => { setGuess(v); setTouched(true); setFb(null) }} marks={[0, 25, 50, 75, 100]} format={(v) => `%${v}`} disabled={done} label="Yüzde tahmini" />
          </Card>
          {!done && !lines && (
            <button type="button" onClick={() => { chk.hint(); setLines(true) }} className="btn-ghost min-h-12"><Grid3x3 size={18} />Kareleri göster</button>
          )}
          {!done && <CheckButton onClick={check} disabled={!touched}>Tahminimi kontrol et</CheckButton>}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} />)}
          {done && (
            <Card className="text-sm font-bold">
              <p className="flex items-center gap-1.5 font-black"><Eye size={16} />Kanıt</p>
              <p className="mt-1">
                <span className="inline-block size-3 rounded-sm ring-2 ring-green-800" /> tam dolu: <b>{full}</b> kare, <span className="inline-block size-3 rounded-full bg-orange-500" /> kısmen dolu: <b>{part}</b> kare.
              </p>
              <p className="mt-1">Kısmen dolu kareler aşağı yukarı yarım sayılırsa: {full} + {part} ÷ 2 ≈ <b>{fmt(full + part / 2, 1)}</b> kare ≈ %{fmt(Math.round(full + part / 2))}.</p>
            </Card>
          )}
          {done && (
            <StrategyPicker
              question="Nasıl tahmin ettin?"
              options={grade >= 7 ? ['%50 ve %75 ile karşılaştırdım', 'Havuzu tahmin edip 100’den çıkardım', 'Tam kareleri saydım, yarımları birleştirdim', 'Göz kararı'] : ['%50 (yarım) ile karşılaştırdım', '%25 (çeyrek) ile karşılaştırdım', 'Tam kareleri saydım, yarımları birleştirdim', 'Göz kararı']}
              onPick={() => {}}
            />
          )}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 4. bütün 100 değil ───────────────────────── */

/** Yüzde şeridi: üstte %, altta miktar (çift sayı doğrusu gibi) */
function PercentBar({ k, whole, unit, show }: { k: number; whole: number; unit: string; show: boolean }) {
  const W = 420
  const x = (p: number) => 22 + (p / 100) * (W - 44)
  return (
    <svg viewBox={`0 0 ${W} 86`} className="block w-full" role="img" aria-label="Yüzde şeridi">
      <rect x={22} y={22} width={W - 44} height={26} rx={6} fill="#f1f5f9" stroke="#1f2340" strokeWidth={1.5} />
      <rect x={22} y={22} width={Math.max(0, x(k) - 22)} height={26} rx={6} fill={TEAL} style={{ transition: 'width 150ms' }} />
      {[0, 25, 50, 75, 100].map((p) => (
        <g key={p}>
          <line x1={x(p)} x2={x(p)} y1={16} y2={54} stroke="#1f2340" strokeWidth={p % 50 ? 1 : 1.6} />
          <text x={x(p)} y={12} textAnchor="middle" fontSize={11} fontWeight={900} fill="#0f766e">%{p}</text>
        </g>
      ))}
      <text x={x(0)} y={70} textAnchor="middle" fontSize={11} fontWeight={900} fill="#1f2340">0</text>
      <text x={x(100)} y={70} textAnchor="middle" fontSize={11} fontWeight={900} fill="#1f2340">{fmt(whole)} {unit}</text>
      {show && k > 0 && k < 100 && (
        <g>
          <line x1={x(k)} x2={x(k)} y1={22} y2={60} stroke="#e11d48" strokeWidth={2.5} />
          <text x={x(k)} y={80} textAnchor="middle" fontSize={13} fontWeight={900} fill="#be123c">{fmt((whole * k) / 100)} {unit}</text>
        </g>
      )}
    </svg>
  )
}

function WholeBadge({ whole, unit }: { whole: number; unit: string }) {
  return <span className="rounded-full bg-amber-100 px-4 py-1 text-sm font-black text-amber-900 ring-1 ring-amber-300">Izgaranın tamamı = {fmt(whole)} {unit}</span>
}

function AmountTask({ t, footer, onSolved }: { t: Extract<Task, { kind: 'amount' }> } & Common) {
  const [cells, setCells] = useState(emptyCells)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const [done, setDone] = useState(false)
  const chk = useChecks()
  const k = countOn(cells)
  const per = t.whole / 100
  const need = t.amount / per
  const check = () => {
    if (k === need) {
      onSolved(chk.pass())
      setDone(true)
      setFb({ ok: true, text: `Evet! 100 kare ${tl(t.whole)} ise 1 kare ${tl(per)}. ${t.amount} TL = ${need} kare = %${need}.` })
      return
    }
    chk.fail()
    if (k === t.amount) setFb({ ok: false, text: `${k} kare boyadın; her kareyi 1 TL gibi saydın. Ama 100 kare ${tl(t.whole)} ediyor. O zaman 1 kare kaç TL eder?`, mis: 'Bütün 100 değilken yüzdeyi miktarla karıştırdı (50 TL → 50 kare)' })
    else setFb({ ok: false, text: `Şu an ${k} kare boyalı. 10 kare (bir sütun) kaç TL eder? ${t.amount} TL için kaç sütun ya da kaç kare gerekir?` })
  }
  return (
    <Split
      work={
        <GridStage label={<WholeBadge whole={t.whole} unit={t.unit} />}>
          <PaintGrid cells={cells} locked={done} onChange={(c) => { setCells(c); setFb(null) }} color="#f59e0b" label="Para ızgarası" />
          {!done && <div className="mt-2"><GridButtons cells={cells} onChange={(c) => { setCells(c); setFb(null) }} /></div>}
          <div className="mt-2 rounded-2xl bg-white p-2 ring-1 ring-line"><PercentBar k={k} whole={t.whole} unit={t.unit} show={done} /></div>
        </GridStage>
      }
      panel={
        <>
          <Prompt step="Bütün değişti">{t.story} <span className="mt-1 block">{t.ask}</span></Prompt>
          <Card><p className="text-sm font-bold text-ink-soft">İpucu sorusu: Bir kare kaç TL’yi gösteriyor? Şeritte %50 kaç TL’ye denk geliyor?</p></Card>
          {!done && <CheckButton onClick={check} disabled={k === 0} />}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="yuzdeizgarasi" toolTitle="Bütünü değiştirerek dene" />)}
          {done && <Names k={k} />}
          {done && <StrategyPicker question="Nasıl düşündün?" options={['1 karenin değerini buldum', '10 kareyi (sütunu) kullandım', '%50 ve %25’ten yola çıktım', 'Deneyerek']} onPick={() => {}} />}
          {footer}
        </>
      }
    />
  )
}

function PercentTask({ t, footer, onSolved }: { t: Extract<Task, { kind: 'percent' }> } & Common) {
  const [cells, setCells] = useState(emptyCells)
  const [phase, setPhase] = useState<'paint' | 'count' | 'done'>('paint')
  const [val, setVal] = useState('')
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const chk = useChecks()
  const k = countOn(cells)
  const ans = (t.whole * t.pct) / 100
  const unitShort = t.unit === 'TL' ? 'TL' : t.noun
  const checkPaint = () => {
    if (k === t.pct) {
      setPhase('count')
      setFb({ ok: true, text: `Doğru: %${t.pct} = ${t.pct} kare. Şimdi bu kareler kaç ${t.noun} ediyor?` })
      return
    }
    chk.fail()
    setFb({ ok: false, text: `Yüzde, bütün ne olursa olsun “100 kareden kaçı” demek. %${t.pct} için kaç kare boyamalısın?` })
  }
  const checkCount = () => {
    const v = parseNum(val)
    if (Math.abs(v - ans) < 1e-9) {
      onSolved(chk.pass())
      setPhase('done')
      setFb({ ok: true, text: `Evet! 100 kare ${fmt(t.whole)} ${unitShort} → 10 kare ${fmt(t.whole / 10)} ${unitShort} → ${t.pct} kare ${fmt(ans)} ${unitShort}.` })
      return
    }
    chk.fail()
    if (Math.abs(v - t.pct) < 1e-9) setFb({ ok: false, text: `${t.pct} ${unitShort} dedin; bu yalnızca bütün 100 olsaydı doğru olurdu. Izgaranın tamamı ${fmt(t.whole)} ${unitShort}. Bir sütun (10 kare) kaç ${unitShort} eder?`, mis: 'Yüzdeyi miktar sandı (%35 → 35 öğrenci)' })
    else setFb({ ok: false, text: `100 karenin tamamı ${fmt(t.whole)} ${unitShort}. 10 kare kaç ${unitShort}? ${t.pct} kare bundan kaç tane ve biraz daha eder?` })
  }
  return (
    <Split
      work={
        <GridStage label={<WholeBadge whole={t.whole} unit={unitShort} />}>
          <PaintGrid cells={cells} locked={phase !== 'paint'} onChange={(c) => { setCells(c); setFb(null) }} color="#8b5cf6" label="Yüzde ızgarası" >
            {phase !== 'paint' && Array.from({ length: Math.ceil(k / 10) }, (_, c) => (
              <text key={c} x={c * S + S / 2} y={S * 10 + 0} dy={-6} textAnchor="middle" fontSize={11} fontWeight={900} fill="#fff" pointerEvents="none">{phase === 'done' ? fmt((t.whole / 100) * Math.min(10, k - c * 10)) : ''}</text>
            ))}
          </PaintGrid>
          {phase === 'paint' && <div className="mt-2"><GridButtons cells={cells} onChange={(c) => { setCells(c); setFb(null) }} /></div>}
          <div className="mt-2 rounded-2xl bg-white p-2 ring-1 ring-line"><PercentBar k={k} whole={t.whole} unit={unitShort} show={phase === 'done'} /></div>
        </GridStage>
      }
      panel={
        <>
          <Prompt step={phase === 'paint' ? '1. Boya' : '2. Hesapla'}>{t.story} <span className="mt-1 block">{t.ask}</span></Prompt>
          {phase === 'paint' && <CheckButton onClick={checkPaint} disabled={k === 0} />}
          {phase !== 'paint' && (
            <>
              <NumPad value={val} onChange={(v) => { setVal(v); setFb(null) }} comma unit={unitShort} label={`%${t.pct} =`} disabled={phase === 'done'} />
              {phase === 'count' && <CheckButton onClick={checkCount} disabled={!val} />}
            </>
          )}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="yuzdeizgarasi" toolTitle="Bütünü değiştirerek dene" />)}
          {phase === 'done' && <StrategyPicker question="Nasıl buldun?" options={['1 kareyi buldum, çarptım', '10 kareyi (%10’u) buldum', 'Kesre çevirdim', 'Şeritte yarıdan yola çıktım']} onPick={() => {}} />}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 5. farklı bütünler ───────────────────────── */

function CompareTask({ t, footer, onSolved }: { t: Extract<Task, { kind: 'compare' }> } & Common) {
  const [a, setA] = useState(emptyCells)
  const [b, setB] = useState(emptyCells)
  const [pick, setPick] = useState<'a' | 'b' | 'eq' | null>(null)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const [done, setDone] = useState(false)
  const chk = useChecks()
  const ka = countOn(a), kb = countOn(b)
  const ready = ka === t.a.pct && kb === t.b.pct
  const A = (t.a.whole * t.a.pct) / 100, B = (t.b.whole * t.b.pct) / 100
  const right: 'a' | 'b' | 'eq' = Math.abs(A - B) < 1e-9 ? 'eq' : A > B ? 'a' : 'b'
  const bigPct: 'a' | 'b' = t.a.pct > t.b.pct ? 'a' : 'b'
  const u = t.unit
  const check = () => {
    if (!pick) return
    if (pick === right) {
      onSolved(chk.pass())
      setDone(true)
      setFb({ ok: true, text: right === 'eq' ? `İkisi de ${fmt(A)} ${u}! Yüzdeler farklı ama bütünler de farklı.` : `Evet! ${t.a.name}: ${fmt(A)} ${u}, ${t.b.name}: ${fmt(B)} ${u}. Yüzdesi küçük olan bile daha çok olabilir.` })
      return
    }
    chk.fail()
    if (pick === bigPct) setFb({ ok: false, text: `%${t[bigPct].pct} daha büyük bir yüzde, doğru. Ama ${ek(t.a.whole, 'gen')} ${pp(t.a.pct)} ile ${ek(t.b.whole, 'gen')} ${pp(t.b.pct)} aynı bütünün parçaları mı? Her ızgarada 10 kare kaç ${u} ediyor?`, mis: 'Farklı bütünlerin yüzdelerini, miktarları hesaplamadan karşılaştırdı' })
    else setFb({ ok: false, text: `Her ızgarada bir sütun (10 kare) kaç ${u}? Boyadığın sütunları ${u} olarak topla.` })
  }
  const board = (s: Side, cells: boolean[], set: (c: boolean[]) => void, color: string) => (
    <div className="min-w-0 rounded-3xl bg-white p-2 ring-2" style={{ ['--tw-ring-color' as string]: `${color}66` }}>
      <p className="mb-1 text-center text-sm font-black" style={{ color }}>{s.name}: <span className="whitespace-nowrap">%{s.pct}</span></p>
      <p className="mb-1.5 text-center text-xs font-extrabold text-ink-soft">tamamı = {fmt(s.whole)} {u}</p>
      <PaintGrid cells={cells} locked={done} onChange={(c) => { set(c); setFb(null) }} color={color} label={`${s.name} ızgarası`} />
      {!done && <div className="mt-1.5"><GridButtons compact cells={cells} onChange={(c) => { set(c); setFb(null) }} /></div>}
      <p className={`mt-1 text-center text-sm font-black ${countOn(cells) === s.pct ? 'text-ok' : 'text-ink-soft'}`}>{countOn(cells)} kare {done && `= ${fmt((s.whole * s.pct) / 100)} ${u}`}</p>
    </div>
  )
  return (
    <Split
      work={
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {board(t.a, a, setA, '#db2777')}
          {board(t.b, b, setB, '#0284c7')}
        </div>
      }
      panel={
        <>
          <Prompt step="Karşılaştır">{t.story} <span className="mt-1 block text-teal-800">{t.q}</span></Prompt>
          {!ready && <Card><p className="text-sm font-bold text-ink-soft">Önce iki yüzdeyi de kendi ızgarasında boya. Sonra karar ver.</p></Card>}
          {ready && (
            <Choices
              cols={3}
              value={pick}
              disabled={done}
              onPick={(p) => { setPick(p); setFb(null) }}
              options={[{ id: 'a', label: t.a.name }, { id: 'b', label: t.b.name }, { id: 'eq', label: 'Eşit' }]}
            />
          )}
          {ready && !done && <CheckButton onClick={check} disabled={!pick} />}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="yuzdeizgarasi" toolTitle="İki yüzdeyi karşılaştır" />)}
          {done && <StrategyPicker question="Nasıl karar verdin?" options={['Her ızgarada 1 karenin değerini buldum', '%10’u bulup katladım', 'Kesre çevirdim', 'Yüzdelere baktım']} onPick={() => {}} />}
          {footer}
        </>
      }
    />
  )
}
