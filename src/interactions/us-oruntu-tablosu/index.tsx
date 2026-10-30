import { useMemo, useRef, useState } from 'react'
import { BookOpen, Sparkles } from 'lucide-react'
import type { InteractionProps } from '../types'
import { Scene, StrategyPicker } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { MathText } from '../../components/MathText'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { Card, Choices, Header, NextButton, Nudge, Prompt, Split, Stage, useChecks } from '../donusum-studyosu/ortak'
import { diagnose, expr, key, num, parseVal, power, same, tasks, type Diag, type ExpItem, type Question, type Task, type Val } from './model'
import { PowerTable, ValuePad, type CellState } from './parts'

/**
 * 84. Üslü Sayılar Tablosu (8. sınıf)
 * Bazı kutuları boş bırakılmış kuvvetler tablosu örüntüyle doldurulur; kurallar öğrencinin bulgusundan türer:
 *  1. 2’nin kuvvetleri sağa (tekrarlı çarpma, × taban)
 *  2. sola: önce 2⁰ tahmini, sonra 2⁰, 2⁻¹… (÷ taban) → a⁰ = 1, a⁻ⁿ = 1/aⁿ
 *  3. 3 ve 5 tabanı (genelleme)
 *  4. 10’un kuvvetleri, ondalıklar ve bilimsel gösterim
 *  5. (−2) tabanı: işaret örüntüsü, (−2)² ile −2²
 *  6–7. 2ᵐ · 2ⁿ, 2ᵐ ÷ 2ⁿ, (2ᵐ)ⁿ: tablodan okuyarak üs kuralları
 *  Son: öğrencinin kural defteri
 */

type Done = (first: boolean, rules: string[]) => void

export default function UsOruntuTablosu({ grade, onFinish }: InteractionProps) {
  const [idx, setIdx] = useState(0)
  const [rules, setRules] = useState<string[]>([])
  const firsts = useRef<boolean[]>([])
  const end = idx >= tasks.length
  const task = tasks[Math.min(idx, tasks.length - 1)]

  const done: Done = (first, r) => {
    firsts.current[idx] = first
    setRules((old) => [...old, ...r.filter((x) => !old.includes(x))])
    setIdx(idx + 1)
  }
  const finish = () => {
    const f = firsts.current.filter(Boolean).length
    onFinish({
      stars: starsFor(f / tasks.length),
      summary: `${tasks.length} tabloyu örüntüyle doldurdun ve ${rules.length} kuralı kendin keşfettin.`,
      insight: 'Kuvvetler tablosunda sağa gidince tabanla çarpar, sola gidince tabana böleriz. Bu örüntü bozulmasın diye a⁰ = 1 ve a⁻ⁿ = 1/aⁿ olur; aynı tabanlı kuvvetler çarpılınca üsler toplanır, bölününce çıkarılır.',
    })
  }

  return (
    <Scene grade={grade}>
      <Header dark emoji={end ? '📒' : task.emoji} kicker={end ? 'Tamamlandı' : 'Tablo'} title={end ? 'Kural defterin' : task.title} idx={Math.min(idx, tasks.length - 1)} total={tasks.length} />
      {end ? (
        <EndView rules={rules} onFinish={finish} />
      ) : task.kind === 'table' ? (
        <TableTaskView key={idx} task={task} knowsLeft={idx > 1} onDone={done} last={idx === tasks.length - 1} />
      ) : (
        <ExpTaskView key={idx} task={task} onDone={done} last={idx === tasks.length - 1} />
      )}
    </Scene>
  )
}

/* ───────────── tablo görevi ───────────── */

type Phase = 'predict' | 'fill' | 'sci' | 'ask' | 'strategy' | 'done'

function TableTaskView({ task, knowsLeft, onDone, last }: { task: Extract<Task, { kind: 'table' }>; knowsLeft: boolean; onDone: Done; last: boolean }) {
  const checks = useChecks()
  const track = useTracker()
  const [solved, setSolved] = useState<Set<string>>(() => new Set())
  const blanks = useMemo(() => {
    const out: { b: number; e: number; dist: number }[] = []
    for (const r of task.rows) for (const e of r.exps) if (!r.given.includes(e)) out.push({ b: r.base, e, dist: Math.min(...r.given.map((g) => Math.abs(g - e))) })
    return out.sort((p, q) => p.dist - q.dist)
  }, [task])
  const nextBlank = (s: Set<string>) => blanks.find((c) => !s.has(key(c.b, c.e)))
  const [selected, setSelected] = useState<string | null>(() => (task.predict ? null : key(blanks[0].b, blanks[0].e)))
  const [input, setInput] = useState('')
  const [diag, setDiag] = useState<(Diag & { n: number }) | null>(null)
  const [wrongKey, setWrongKey] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>(task.predict ? 'predict' : 'fill')
  const [guess, setGuess] = useState<string | null>(null)
  const [sciIdx, setSciIdx] = useState(0)
  const [askIdx, setAskIdx] = useState(0)

  const rowOf = (b: number) => task.rows.find((r) => r.base === b)!
  const state = (b: number, e: number): CellState => (rowOf(b).given.includes(e) ? 'given' : solved.has(key(b, e)) ? 'ok' : 'blank')
  const known = (b: number) => (e: number): Val | null => {
    const r = rowOf(b)
    return r.exps.includes(e) && state(b, e) !== 'blank' ? power(b, e) : null
  }
  const leftSolved = [...solved].some((k) => {
    const [b, e] = k.split(':').map(Number)
    return e < Math.min(...rowOf(b).given)
  })
  const arrows = { right: task.arrows === 'start' || solved.size > 0, left: knowsLeft || leftSolved }

  const afterFill = () => setPhase(task.sci ? 'sci' : task.asks.length ? 'ask' : task.strategy ? 'strategy' : 'done')

  const submit = () => {
    if (!selected) return
    const [b, e] = selected.split(':').map(Number)
    const v = parseVal(input)
    if (Number.isNaN(v)) return
    const target = num(power(b, e))
    if (same(v, target)) {
      const s = new Set(solved).add(selected)
      setSolved(s)
      track.attempt(true)
      sfx.ok()
      setDiag(null)
      setWrongKey(null)
      setInput('')
      if (task.predict && selected === task.predict.cell && guess && task.predict.misconception[guess]) track.misconception(task.predict.misconception[guess])
      const nb = nextBlank(s)
      setSelected(nb ? key(nb.b, nb.e) : null)
      if (!nb) afterFill()
      return
    }
    checks.fail()
    setWrongKey(selected)
    setDiag((d) => ({ ...diagnose(b, e, v, known(b)), n: (d?.n ?? 0) + 1 }))
  }

  const sel = selected ? selected.split(':').map(Number) : null
  const predictCellDone = task.predict ? solved.has(task.predict.cell) : false
  const predictLabel = task.predict?.options.find((o) => o.id === guess)?.label

  const panel = (
    <>
      {phase === 'predict' && task.predict && (
        <Card dark>
          <p className="mb-2 font-extrabold text-white"><MathText text={task.predict.q} /></p>
          <Choices options={task.predict.options.map((o) => ({ id: o.id, label: o.label }))} value={guess} onPick={(id) => setGuess(id)} />
          <button type="button" disabled={!guess} onClick={() => { track.strategy(`Tahmin: 2⁰ = ${predictLabel ?? guess}`); setPhase('fill'); setSelected(key(blanks[0].b, blanks[0].e)) }} className="btn-primary mt-3 min-h-12 w-full">
            Tahminimi sına
          </button>
        </Card>
      )}

      {phase === 'fill' && (
        <>
          <Prompt step="Kutuyu doldur"><MathText text={task.intro} /></Prompt>
          {guess && !predictCellDone && <p className="rounded-xl bg-slate-700/70 px-3 py-2 text-sm font-bold text-slate-100">Tahminin: 2⁰ = {predictLabel}. Tabloyu doldurunca karşılaştıracağız.</p>}
          {sel && (
            <ValuePad
              value={input}
              onChange={(v) => { setInput(v); setWrongKey(null) }}
              onSubmit={submit}
              label={`${expr(sel[0], sel[1])} =`}
              frac={sel[1] < 0}
              comma={rowOf(sel[0]).decimal === true}
              sign={task.rows.some((r) => r.base < 0)}
            />
          )}
          {diag && <Nudge key={diag.n} question={diag.text} misconception={diag.misconception} />}
        </>
      )}

      {predictCellDone && guess && task.predict && phase !== 'predict' && (
        <Card dark className={guess === task.predict.answer ? 'ring-emerald-400' : 'ring-amber-400'}>
          <p className="text-sm font-extrabold text-white">
            Tahminin: 2⁰ = {predictLabel}. Örüntü ne diyor? 2¹ = 2’yi 2’ye bölünce <b className="text-emerald-300">2⁰ = 1</b>.
            {guess === task.predict.answer ? ' Tahminin doğruydu!' : ' Örüntü tahmininden daha güçlü bir kanıt.'}
          </p>
        </Card>
      )}

      {phase === 'sci' && task.sci && (
        <SciStep key={sciIdx} item={task.sci[sciIdx]} n={sciIdx} total={task.sci.length} checks={checks} onOk={() => (sciIdx + 1 < task.sci!.length ? setSciIdx(sciIdx + 1) : setPhase(task.asks.length ? 'ask' : 'done'))} />
      )}

      {phase === 'ask' && (
        <AskStep key={askIdx} q={task.asks[askIdx]} checks={checks} onOk={() => (askIdx + 1 < task.asks.length ? setAskIdx(askIdx + 1) : setPhase(task.strategy ? 'strategy' : 'done'))} />
      )}

      {phase === 'strategy' && task.strategy && <StrategyPicker question={task.strategy.q} options={task.strategy.options} onPick={() => setPhase('done')} />}

      {phase === 'done' && <RulesFound rules={task.rules} />}
      {phase === 'done' && <NextButton last={last} onClick={() => onDone(checks.pass(), task.rules)} />}
    </>
  )

  return (
    <Split
      work={
        <Stage dark className="p-3 sm:p-4">
          <PowerTable rows={task.rows} state={state} selected={phase === 'fill' ? selected : null} onSelect={phase === 'fill' ? (b, e) => { setSelected(key(b, e)); setInput(''); setDiag(null) } : undefined} arrows={arrows} wrong={wrongKey} />
          <p className="mt-3 text-sm font-bold text-slate-300">
            {arrows.right && arrows.left ? 'Sağa: tabanla çarp · Sola: tabana böl' : arrows.right ? 'Sağa bir adım: tabanla çarp. Sola gidince ne yapmalı?' : 'Kutular arasında nasıl bir ilişki var?'}
          </p>
          {phase !== 'fill' && phase !== 'predict' && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3 py-1.5 text-sm font-black text-emerald-300"><Sparkles size={16} />Tablo tamam!</p>
          )}
        </Stage>
      }
      panel={panel}
    />
  )
}

/* ───────────── üs bulma görevi (çarpım/bölüm/kuvvetin kuvveti) ───────────── */

function ExpTaskView({ task, onDone, last }: { task: Extract<Task, { kind: 'exp' }>; onDone: Done; last: boolean }) {
  const checks = useChecks()
  const [g, setG] = useState(0)
  const [i, setI] = useState(0)
  const [asking, setAsking] = useState(false)
  const [doneAll, setDoneAll] = useState(false)
  const group = task.groups[g]
  const items = task.groups.slice(0, g + 1).flatMap((gr, gi) => gr.items.map((it, ii) => ({ it, solved: gi < g || ii < i || (gi === g && asking) || doneAll, active: gi === g && ii === i && !asking && !doneAll })))

  const okItem = () => {
    if (i + 1 < group.items.length) setI(i + 1)
    else setAsking(true)
  }
  const okAsk = () => {
    if (g + 1 < task.groups.length) {
      setG(g + 1)
      setI(0)
      setAsking(false)
    } else setDoneAll(true)
  }

  return (
    <Split
      work={
        <Stage dark className="p-3 sm:p-4">
          <p className="mb-2 text-xs font-black tracking-wide text-slate-300 uppercase">2’nin kuvvetleri</p>
          <PowerTable rows={[task.ref]} state={() => 'given'} arrows={{ right: true, left: true }} small />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {items.map(({ it, solved, active }, k) => (
              <div key={k} className={`rounded-2xl p-3 ring-1 transition ${active ? 'bg-pink-50 text-ink ring-4 ring-pink-500' : solved ? 'bg-emerald-50 text-emerald-950 ring-emerald-400' : 'bg-slate-800 text-slate-200 ring-slate-600'}`}>
                <p className="text-lg font-black"><MathText text={it.expr} /></p>
                <p className={`text-sm font-bold ${active ? 'text-ink-soft' : solved ? 'text-emerald-800' : 'text-slate-400'}`}><MathText text={`= ${it.expand} = ${it.lhs}^{${solved ? fmtExp(it.answer) : '□'}}`} /></p>
              </div>
            ))}
          </div>
        </Stage>
      }
      panel={
        <>
          <Prompt step="Tablodan oku"><MathText text={task.intro} /></Prompt>
          {!asking && !doneAll && <ExpStep key={`${g}-${i}`} item={group.items[i]} checks={checks} onOk={okItem} />}
          {asking && !doneAll && <AskStep key={`a${g}`} q={group.ask} checks={checks} onOk={okAsk} />}
          {doneAll && <RulesFound rules={task.rules} />}
          {doneAll && <NextButton last={last} onClick={() => onDone(checks.pass(), task.rules)} />}
        </>
      }
    />
  )
}

const fmtExp = (n: number) => (n < 0 ? `−${-n}` : String(n))

type Checks = ReturnType<typeof useChecks>

/** Tek bir üssü sorar (çarpım tablosu maddesi) */
function ExpStep({ item, checks, onOk }: { item: ExpItem; checks: Checks; onOk: () => void }) {
  const track = useTracker()
  const [v, setV] = useState('')
  const [miss, setMiss] = useState(0)
  const submit = () => {
    const x = parseVal(v)
    if (Number.isNaN(x)) return
    if (x === item.answer) {
      track.attempt(true)
      sfx.ok()
      onOk()
      return
    }
    checks.fail()
    setMiss((m) => m + 1)
  }
  return (
    <>
      <ValuePad value={v} onChange={setV} onSubmit={submit} label={`${item.expr} = ${item.lhs}^{□}`} frac={false} comma={false} />
      {miss > 0 && <Nudge key={miss} question={`${item.expand}. ${item.hint} Üssü yaz.`} />}
    </>
  )
}

/** Bilimsel gösterim maddesi */
function SciStep({ item, n, total, checks, onOk }: { item: ExpItem; n: number; total: number; checks: Checks; onOk: () => void }) {
  const track = useTracker()
  const [v, setV] = useState('')
  const [miss, setMiss] = useState(0)
  const submit = () => {
    const x = parseVal(v)
    if (Number.isNaN(x)) return
    if (x === item.answer) {
      track.attempt(true)
      sfx.ok()
      onOk()
      return
    }
    checks.fail()
    setMiss((m) => m + 1)
  }
  return (
    <>
      <Prompt step={`Bilimsel gösterim ${n + 1} / ${total}`}>
        <MathText text={`${item.expr} = ${item.expand} = ${item.lhs}^{□}`} />
      </Prompt>
      <ValuePad value={v} onChange={setV} onSubmit={submit} label="Üs:" frac={false} comma={false} />
      {miss > 0 && <Nudge key={miss} question={item.hint} misconception={item.answer < 0 && parseVal(v) > 0 ? 'Küçük sayıları bilimsel gösterimde pozitif üsle yazmak' : undefined} />}
    </>
  )
}

/** Çoktan seçmeli keşif sorusu */
function AskStep({ q, checks, onOk }: { q: Question; checks: Checks; onOk: () => void }) {
  const track = useTracker()
  const [pick, setPick] = useState<string | null>(null)
  const [miss, setMiss] = useState(0)
  const [ok, setOk] = useState(false)
  const choose = (id: string) => {
    if (ok) return
    setPick(id)
    if (id === q.answer) {
      track.attempt(true)
      sfx.ok()
      setOk(true)
      window.setTimeout(onOk, 700)
      return
    }
    checks.fail()
    setMiss((m) => m + 1)
  }
  return (
    <Card dark>
      <p className="mb-2 flex items-start gap-2 font-extrabold text-white"><BookOpen size={18} className="mt-0.5 shrink-0 text-pink-300" /><MathText text={q.q} /></p>
      <Choices cols={1} options={q.options.map((o) => ({ id: o.id, label: <MathText text={o.label} /> }))} value={pick} onPick={choose} disabled={ok} />
      {pick && !ok && pick !== q.answer && <div className="mt-2"><Nudge key={miss} question={q.nudge[pick] ?? 'Tabloya tekrar bak.'} misconception={q.misconception?.[pick]} /></div>}
      {ok && <p className="mt-2 rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-black text-emerald-300 animate-pop">Evet! Tablo bunu gösteriyor.</p>}
    </Card>
  )
}

function RulesFound({ rules }: { rules: string[] }) {
  return (
    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-950 ring-2 ring-emerald-400 animate-fade-up">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-black tracking-wide uppercase"><Sparkles size={15} />Keşfettiğin {rules.length > 1 ? 'kurallar' : 'kural'}</p>
      <ul className="space-y-1">
        {rules.map((r) => <li key={r} className="flex gap-2 text-[15px] font-extrabold"><span aria-hidden>✓</span><MathText text={r} /></li>)}
      </ul>
    </div>
  )
}

function EndView({ rules, onFinish }: { rules: string[]; onFinish: () => void }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-3xl bg-amber-50 p-5 text-ink shadow-[0_6px_0_#d9770633] ring-2 ring-amber-300">
        <p className="mb-3 flex items-center gap-2 text-lg font-black text-amber-900"><BookOpen size={20} />Kural defterim</p>
        <ol className="space-y-2">
          {rules.map((r, i) => (
            <li key={r} className="flex gap-3 rounded-xl bg-white p-3 text-base font-extrabold ring-1 ring-amber-200 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber-500 text-sm font-black text-white">{i + 1}</span>
              <MathText text={r} />
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm font-bold text-amber-900">Bu kuralların hiçbirini ezberlemedin: hepsi “sağa çarp, sola böl” örüntüsünden çıktı.</p>
      </div>
      <div className="mt-4"><NextButton last onClick={onFinish} /></div>
    </div>
  )
}

