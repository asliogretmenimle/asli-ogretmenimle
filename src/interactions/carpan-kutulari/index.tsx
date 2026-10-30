import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import type { InteractionProps } from '../types'
import { Scene, StrategyPicker } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { sfx } from '../../lib/feedback'
import { ek } from '../../lib/generators'
import { divisorCount, divisors, factorPairs, factorString, factorize, isSquare, sup } from '../../lib/numberTheory'
import { Card, CheckButton, Choices, Header, NextButton, NumPad, Nudge, Prompt, Split, Stage, parseNum, useChecks } from '../donusum-studyosu/ortak'

/**
 * 78. Çarpan Kutuları (8. sınıf, Çarpanlar ve Katlar)
 * Her sayı için çarpan sayısı kadar boş kare kutu çiftler hâlinde dizilir: □ × □ = n.
 * Öğrenci bir kutuya çarpan yazar; eşini kendisi bulur (d × (n ÷ d) = n). Tam karede ortadaki kutu
 * kendisiyle eşleşir (tek kutu), asal sayıda yalnızca iki kutu vardır.
 * Son görevlerde kutu sayısı önce asal çarpanların üslerinden tahmin edilir: (m + 1)(k + 1)…
 *  fill:    kutuları doldur (isteğe bağlı keşif sorusuyla)
 *  predict: kaç kutu gerektiğini tahmin et, sonra doldur (fill: true) ya da yalnızca kuralı uygula
 */

type Ask = { q: string; options: string[]; answer: number; why: string }
type Task =
  | { kind: 'fill'; n: number; title: string; ask?: Ask; strategy?: boolean }
  | { kind: 'predict'; n: number; title: string; fill: boolean }

const TASKS: Task[] = [
  { kind: 'fill', n: 12, title: '12’nin çarpan kutuları' },
  { kind: 'fill', n: 18, title: '18’in çarpan kutuları', strategy: true },
  {
    kind: 'fill', n: 36, title: '36: ortadaki tek kutu',
    ask: { q: '36’nın kutularından biri neden eşsiz, tek başına kaldı?', options: ['6 × 6 = 36: 6 kendisiyle eşleşiyor', '36 çift sayı olduğu için', '36’nın çok fazla çarpanı olduğu için'], answer: 0, why: '36 bir tam kare: 6’nın eşi yine 6. Bu yüzden 36’nın çarpan sayısı tek (9). 48 gibi tam kare olmayan sayılarda bütün kutular çiftlenir.' },
  },
  {
    kind: 'fill', n: 17, title: '17: yalnızca iki kutu',
    ask: { q: '17’nin neden yalnızca iki kutusu var?', options: ['1 ve kendisinden başka böleni yok: 17 asal', '17 tek sayı olduğu için', '17 küçük bir sayı olduğu için'], answer: 0, why: 'Asal sayıların yalnızca iki çarpanı vardır: 1 ve kendisi. 15 de tek sayıdır ama 3 ve 5 kutularıyla 4 kutusu olur.' },
  },
  { kind: 'fill', n: 48, title: '48’in çarpan kutuları', strategy: true },
  { kind: 'predict', n: 72, title: 'Kaç kutu gerekir?', fill: true },
  { kind: 'predict', n: 240, title: 'Kuralı sına: 240', fill: false },
]

const LOOK_BACK = [12, 18, 36, 17, 48]

export default function CarpanKutulari({ grade, onFinish }: InteractionProps) {
  const [idx, setIdx] = useState(0)
  const [solved, setSolved] = useState(false)
  const firsts = useRef<boolean[]>([])
  const task = TASKS[idx]
  const last = idx === TASKS.length - 1

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
      stars: starsFor(f / TASKS.length),
      summary: `${TASKS.length} sayının çarpan kutularını doldurdun ve kutu sayısını üslerden tahmin etmeyi keşfettin.`,
      insight: 'Çarpanlar çiftler hâlinde gelir: d bir çarpansa n ÷ d de çarpandır. Tam karelerde ortadaki çarpan kendisiyle eşleştiği için çarpan sayısı tektir; asal sayıların yalnızca iki çarpanı (1 ve kendisi) vardır. n = 2ᵃ · 3ᵇ ise çarpan sayısı (a + 1)(b + 1)’dir.',
    })
  }
  const footer = solved ? <NextButton last={last} onClick={next} /> : null

  return (
    <Scene grade={grade}>
      <Header emoji="🔲" kicker="Görev" title={task.title} idx={idx} total={TASKS.length} dark />
      {task.kind === 'fill' ? (
        <FillTask key={idx} n={task.n} ask={task.ask} strategy={task.strategy} intro={idx === 0} footer={footer} onSolved={onSolved} />
      ) : (
        <PredictTask key={idx} n={task.n} fill={task.fill} footer={footer} onSolved={onSolved} />
      )}
    </Scene>
  )
}

/* ───────────────────────── Kutular ───────────────────────── */

type Row = { a: number | null; b: number | null; single: boolean }
type Sel = { row: number; side: 0 | 1 } | null
type Fb = { ok: boolean; text: string; mis?: string } | null

const emptyRows = (n: number): Row[] => factorPairs(n).map(([a, b]) => ({ a: null, b: null, single: a === b }))

function FillTask({ n, ask, strategy, intro, footer, onSolved, onFilled }: { n: number; ask?: Ask; strategy?: boolean; intro?: boolean; footer: ReactNode; onSolved: (first: boolean) => void; onFilled?: () => void }) {
  const [rows, setRows] = useState<Row[]>(() => emptyRows(n))
  const [sel, setSel] = useState<Sel>({ row: 0, side: 0 })
  const [val, setVal] = useState('')
  const [fb, setFb] = useState<Fb>(null)
  const [phase, setPhase] = useState<'fill' | 'ask' | 'done'>('fill')
  const [pick, setPick] = useState<number | null>(null)
  const chk = useChecks()

  const placed = rows.flatMap((r) => [r.a, r.single ? null : r.b]).filter((x): x is number => x !== null)
  const total = divisorCount(n)
  const filled = placed.length === total

  const finish = () => {
    onFilled?.()
    if (ask) {
      setPhase('ask')
      setFb(null)
      return
    }
    onSolved(chk.pass())
    setPhase('done')
  }

  const write = () => {
    const x = parseNum(val)
    if (!sel || Number.isNaN(x)) return
    const row = rows[sel.row]
    const other = sel.side === 0 ? row.b : row.a
    const say = (text: string, mis?: string) => {
      chk.fail()
      setVal('')
      setFb({ ok: false, text, mis })
    }
    if (x === 0) return say(`0 ile hangi sayıyı çarparsan çarp sonuç 0 olur. ${n} elde edebilir misin?`, 'Sıfırı çarpan sandı')
    if (x > n) return say(`${x}, ${ek(n, 'abl')} büyük. Bir sayının çarpanı, sayının kendisinden büyük olabilir mi? ${x} × 1 bile ${n} sayısını geçer.`, 'Çarpanı sayıdan büyük sandı')
    if (n % x !== 0) {
      const q = Math.floor(n / x)
      return say(`${x} × ${q} = ${x * q}, ${x} × ${q + 1} = ${x * (q + 1)}. ${n} ikisinin arasında kalıyor: ${n} ÷ ${x} tam bölünmüyor, yani ${x} bir çarpan değil.`, 'Bölmeyen bir sayıyı çarpan sandı')
    }
    if (placed.includes(x)) return say(`${x} zaten bir kutuda. Her çarpan yalnızca bir kez yazılır; henüz yazmadığın bir çarpan ara.`)
    if (row.single) {
      if (x * x !== n) return say(`Bu ortadaki kutunun eşi yok: içindeki sayı kendisiyle çarpılınca ${n} etmeli. ${x} × ${x} = ${x * x}.`)
    } else if (other !== null) {
      if (x * other !== n) return say(`${other} × ${x} = ${other * x}, ${n} değil. Bu kutu ${ek(other, 'gen')} eşi: ${n} ÷ ${other} kaç eder?`, 'Çarpan çiftini yanlış eşleştirdi')
    } else if (x * x === n) {
      return say(`${x} × ${x} = ${n}: ${x} kendi kendisinin eşi! Onu ortadaki tek kutuya yaz.`)
    }

    sfx.ok()
    const nextRows = rows.map((r, i) => (i !== sel.row ? r : sel.side === 0 ? { ...r, a: x } : { ...r, b: x }))
    setRows(nextRows)
    setVal('')
    const nowFilled = nextRows.flatMap((r) => [r.a, r.single ? null : r.b]).filter((v) => v !== null).length === total
    if (nowFilled) {
      setSel(null)
      setFb({ ok: true, text: `Bütün kutular doldu! ${n} sayısının ${total} çarpanı var.` })
      finish()
      return
    }
    if (!row.single && other === null) {
      setSel({ row: sel.row, side: sel.side === 0 ? 1 : 0 })
      setFb({ ok: true, text: `${x}, ${ek(n, 'acc')} böler. Şimdi ${ek(x, 'gen')} eşini bul: ${x} × ? = ${n}` })
    } else {
      const r = nextRows.findIndex((rr) => rr.a === null || (!rr.single && rr.b === null))
      setSel(r < 0 ? null : { row: r, side: nextRows[r].a === null ? 0 : 1 })
      setFb({ ok: true, text: row.single ? `${x} × ${x} = ${n}. Ortadaki kutu doldu!` : `${other} × ${x} = ${n}. Bir çift tamam!` })
    }
  }

  const answer = () => {
    if (!ask || pick === null) return
    if (pick === ask.answer) {
      onSolved(chk.pass())
      setPhase('done')
      setFb({ ok: true, text: ask.why })
      return
    }
    chk.fail()
    setFb({ ok: false, text: n === 36 ? 'Ortadaki kutudaki sayıya bak: onun eşi kim? 36 ÷ 6 kaç eder?' : 'Kutulara yazdığın çarpanlara bak: 1 ve 17’den başka 17’yi bölen bir sayı buldun mu? 2, 3, 5 bölüyor mu?' })
  }

  const sorted = filled ? [...placed].sort((a, b) => a - b) : []

  return (
    <Split
      work={
        <Stage dark>
          <Boxes n={n} rows={rows} sel={phase === 'fill' ? sel : null} onSelect={(s) => { setSel(s); setFb(null) }} />
          {filled && <FactorStrip list={sorted} n={n} />}
        </Stage>
      }
      panel={
        <>
          <Prompt step={`${n} için ${total} kutu`}>
            {intro
              ? <>{n} sayısının çarpanları için <b>{total} kare kutu</b> ayrıldı ve kutular çiftler hâlinde dizildi: her satırda <b>□ × □ = {n}</b>. Bir kutuya dokun, bir çarpan yaz; sonra eşini bul.</>
              : <>Kutuları {ek(n, 'gen')} çarpanlarıyla doldur. Her satırdaki iki kutunun çarpımı {n} olmalı.</>}
          </Prompt>
          {phase === 'fill' && (
            <>
              <NumPad value={val} onChange={(v) => setVal(v)} max={3} label={sel ? 'Kutuya:' : 'Bir kutu seç'} disabled={!sel} />
              <CheckButton onClick={write} disabled={!sel || !val}>Kutuya yaz</CheckButton>
            </>
          )}
          {phase === 'ask' && ask && (
            <>
              <Card dark><p className="font-extrabold">{ask.q}</p></Card>
              <Choices cols={1} options={ask.options.map((o, i) => ({ id: i, label: o }))} value={pick} onPick={(v) => { setPick(v); setFb(null) }} />
              <CheckButton onClick={answer} disabled={pick === null} />
            </>
          )}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="carpanagaci" />)}
          {phase === 'done' && strategy && <StrategyPicker question="Çarpanları nasıl buldun?" options={['Çiftler hâlinde düşündüm (d ve n ÷ d)', 'Bölünebilme kurallarını kullandım', 'Sırayla 1, 2, 3… diye denedim']} onPick={() => undefined} />}
          {phase === 'done' && footer}
        </>
      }
    />
  )
}

function Boxes({ n, rows, sel, onSelect }: { n: number; rows: Row[]; sel: Sel; onSelect: (s: Sel) => void }) {
  return (
    <div className="flex flex-col items-center gap-2.5 py-3">
      {rows.map((r, i) => {
        const done = r.single ? r.a !== null : r.a !== null && r.b !== null
        return (
          <div key={i} className={`flex items-center gap-2 rounded-2xl px-2 py-1.5 transition sm:gap-3 ${done ? 'bg-emerald-500/15 ring-1 ring-emerald-400/50' : ''}`}>
            <Box v={r.a} on={sel?.row === i && sel.side === 0} onClick={() => onSelect({ row: i, side: 0 })} />
            <span className="text-2xl font-black text-slate-300">×</span>
            {r.single ? (
              <span className="relative grid size-14 place-items-center rounded-xl text-2xl font-black text-slate-200 border-2 border-dashed border-slate-500 sm:size-16" title="Aynı kutu">
                {r.a ?? ''}
                <span className="absolute -bottom-2 rounded-full bg-slate-800 px-1.5 text-[10px] font-black text-amber-300 ring-1 ring-slate-600">kendisi</span>
              </span>
            ) : (
              <Box v={r.b} on={sel?.row === i && sel.side === 1} onClick={() => onSelect({ row: i, side: 1 })} />
            )}
            <span className="min-w-16 text-2xl font-black text-white tabular-nums">= {n}</span>
            <span className="grid size-6 place-items-center">{done && <Check size={20} className="text-emerald-400" strokeWidth={3} />}</span>
          </div>
        )
      })}
    </div>
  )
}

function Box({ v, on, onClick }: { v: number | null; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={v !== null}
      aria-label={v === null ? 'Boş kutu' : `Kutu: ${v}`}
      className={`grid size-14 place-items-center rounded-xl text-2xl font-black transition active:scale-95 sm:size-16 ${v !== null ? 'border-2 border-white bg-white text-ink shadow-[0_3px_0_#94a3b8] animate-pop' : on ? 'border-2 border-amber-400 bg-amber-300/20 ring-4 ring-amber-400/40' : 'border-2 border-dashed border-slate-400 bg-slate-700/70 hover:bg-slate-600'}`}
    >
      {v ?? ''}
    </button>
  )
}

/** Bulunan çarpanlar küçükten büyüğe; tam karede ortadaki vurgulanır */
function FactorStrip({ list, n }: { list: number[]; n: number }) {
  const mid = isSquare(n) ? Math.sqrt(n) : null
  return (
    <div className="mx-2 mb-2 rounded-2xl bg-slate-800 p-3 ring-1 ring-slate-600 animate-fade-up">
      <p className="mb-2 text-xs font-black tracking-wide text-pink-300 uppercase">{ek(n, 'gen')} çarpanları ({list.length} tane)</p>
      <div className="flex flex-wrap gap-1.5">
        {list.map((d) => (
          <span key={d} className={`grid h-10 min-w-10 place-items-center rounded-lg px-2 text-lg font-black ${d === mid ? 'bg-amber-400 text-slate-900' : 'bg-white text-ink'}`}>{d}</span>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────── Kutu sayısını tahmin et ───────────────────────── */

const ruleText = (n: number) => factorize(n).map(([, e]) => `(${e} + 1)`).join(' · ')

function PredictTask({ n, fill, footer, onSolved }: { n: number; fill: boolean; footer: ReactNode; onSolved: (first: boolean) => void }) {
  const total = divisorCount(n)
  const exps = factorize(n).map(([, e]) => e)
  const [phase, setPhase] = useState<'predict' | 'fill' | 'done'>('predict')
  const [val, setVal] = useState('')
  const [fb, setFb] = useState<Fb>(null)
  const chk = useChecks()
  const firstRef = useRef(true)
  const table = useMemo(() => LOOK_BACK.map((m) => ({ m, f: factorString(m), c: divisorCount(m) })), [])

  const check = () => {
    const x = parseNum(val)
    if (Number.isNaN(x)) return
    if (x === total) {
      sfx.ok()
      if (fill) {
        setPhase('fill')
        setFb({ ok: true, text: `Evet, ${total} kutu! ${ruleText(n)} = ${total}. Şimdi kutuları doldurup tahminini sına.` })
      } else {
        onSolved(chk.pass())
        setPhase('done')
        setFb({ ok: true, text: `Kural tuttu: ${ruleText(n)} = ${total}. Her çarpan, her asal çarpanın 0’dan en büyük üssüne kadar bir kuvveti seçilerek oluşur.` })
      }
      return
    }
    chk.fail()
    firstRef.current = false
    const sum = exps.reduce((s, e) => s + e, 0)
    const prod = exps.reduce((s, e) => s * e, 1)
    const [p0, e0] = factorize(n)[0]
    const powers = Array.from({ length: e0 + 1 }, (_, i) => p0 ** i).join(', ')
    if (x === sum || x === prod) setFb({ ok: false, mis: 'Çarpan sayısını üslerin toplamı ya da çarpımı sandı', text: `Üsleri ${x === sum ? 'topladın' : 'çarptın'}. ${p0}${sup(e0)} = ${p0 ** e0} sayısının kendi bölenlerini say: ${powers}. Bu kaç seçenek? Üs ${e0} ama seçenek ${e0 + 1}: neden?` })
    else if (x === sum + 1 || x === exps.reduce((s, e) => s + e + 1, 0)) setFb({ ok: false, text: `Seçenekleri topladın. Ama her çarpan, bir ${p0} kuvveti İLE diğer asalların birer kuvvetinin çarpımı: seçenekler çarpılır mı, toplanır mı? Yukarıdaki tabloda 36 = 2² · 3² için dene.` })
    else setFb({ ok: false, text: `Tabloya bak: 12 = 2² · 3 için 6 kutu, 36 = 2² · 3² için 9 kutu vardı. Üslerle kutu sayısı arasında nasıl bir ilişki var? (İpucu: 2² için 2⁰, 2¹, 2² — üç seçenek.)` })
  }

  return (
    <>
      {phase === 'fill' ? (
        <FillTask n={n} footer={footer} onSolved={(f) => onSolved(f && firstRef.current)} />
      ) : (
        <Split
          work={
            <Stage dark>
              <div className="p-3">
                <p className="mb-2 text-xs font-black tracking-wide text-pink-300 uppercase">Şimdiye kadar doldurduğun kutular</p>
                <table className="w-full text-left text-base font-extrabold text-slate-100">
                  <thead>
                    <tr className="text-xs text-slate-400 uppercase"><th className="pb-1">Sayı</th><th className="pb-1">Asal çarpanlar</th><th className="pb-1 text-right">Kutu</th></tr>
                  </thead>
                  <tbody>
                    {table.map((r) => (
                      <tr key={r.m} className="border-t border-slate-700">
                        <td className="py-2 text-xl font-black">{r.m}</td>
                        <td className="py-2 text-lg">{r.f}</td>
                        <td className="py-2 text-right text-xl font-black text-amber-300">{r.c}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-pink-400/60">
                      <td className="py-2 text-xl font-black text-pink-300">{n}</td>
                      <td className="py-2 text-lg">{factorString(n)}</td>
                      <td className="py-2 text-right text-xl font-black text-pink-300">{phase === 'done' ? total : '?'}</td>
                    </tr>
                  </tbody>
                </table>
                {phase === 'done' && (
                  <div className="mt-3 rounded-2xl bg-amber-400/15 p-3 ring-1 ring-amber-400/50 animate-fade-up">
                    <p className="text-xs font-black tracking-wide text-amber-300 uppercase">Kutu sayısı kuralı</p>
                    <p className="mt-1 text-lg font-black text-white">n = aᵐ · bᵏ · cʳ ise çarpan sayısı = (m + 1) · (k + 1) · (r + 1)</p>
                    <p className="mt-2 text-sm font-bold text-slate-300">Kontrol — {ek(n, 'gen')} çarpanları:</p>
                    <div className="mt-1 flex flex-wrap gap-1">{divisors(n).map((d) => <span key={d} className="rounded-md bg-white px-1.5 text-sm font-black text-ink">{d}</span>)}</div>
                  </div>
                )}
              </div>
            </Stage>
          }
          panel={
            <>
              <Prompt step="Önce tahmin">
                {n} = {factorString(n)}. Kutuları açmadan önce düşün: {ek(n, 'gen')} çarpanları için <b>kaç kutu</b> gerekir?
              </Prompt>
              {phase === 'predict' && (
                <>
                  <NumPad value={val} onChange={setVal} max={3} label="Kutu sayısı:" />
                  <CheckButton onClick={check} disabled={!val}>Tahminimi kontrol et</CheckButton>
                </>
              )}
              {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} />)}
              {phase === 'done' && <StrategyPicker question="Kutu sayısını nasıl buldun?" options={['Üslere 1 ekleyip çarptım', 'Tablodaki örüntüye baktım', 'Çarpanları tek tek saydım']} onPick={() => undefined} />}
              {phase === 'done' && footer}
            </>
          }
        />
      )}
    </>
  )
}

