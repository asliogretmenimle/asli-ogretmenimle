import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, Eye, Hand, Scaling, Scissors, Sparkles } from 'lucide-react'
import type { InteractionProps } from '../types'
import { Scene, SolutionList, StrategyPicker, useAge, useSolutions } from '../../games/kit2'
import { MathText } from '../../components/MathText'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { gen } from '../../lib/generators'
import { Card, Derived, Header, Layout, NextButton, Nudge, PickBtn, dec, gcd, useFresh, useSession } from '../kesir-duvari/ortak'
import { makeTasks, fLabel, fPoss, partUnits, share, type Reflect, type Task, type Whole } from './tasks'
import { BarStage, BarTrack, CountSlider, Plates, PizzaPair, Stepper, Who } from './models'

/**
 * 37. Bütünü Değiştir (3–6)
 * Aynı kesir, farklı bütünlerde farklı miktardır: öğrenci bütünü tutamaçla / iki parmakla / ± ile
 * büyütüp küçültür; kesir etiketi sabit kalırken miktar canlı değişir. Paylaştırma (eş gruplara dağıtma),
 * parçadan bütüne (birim kesri yineleme) ve açık uçlu “kaç farklı yol?” görevleri.
 */

type Sol = ReturnType<typeof useSolutions>
interface ViewProps {
  grade: number
  footer: ReactNode
  onDone: (first: boolean) => void
  sol: Sol
  fresh: (k: string, l: string) => boolean
}

/** Miktarı birimiyle yazar: 4. sınıfa kadar tam sayılı kesir, sonra ondalık */
function amount(units: number, task: Task, grade: number) {
  const v = units * (task.unitValue ?? 1)
  const u = task.unit ? ` ${task.unit}` : ''
  if (Math.abs(v - Math.round(v)) < 1e-9) return `${Math.round(v)}${u}`
  if (grade <= 4) {
    // payda en çok 12 olacak biçimde kesir
    for (let d = 2; d <= 12; d++) {
      const nn = Math.round(v * d)
      if (Math.abs(nn / d - v) < 1e-9) {
        const g = gcd(nn, d)
        const N = nn / g, D = d / g
        const whole = Math.floor(N / D), r = N - whole * D
        return `${whole > 0 ? `[[${whole} ${r}/${D}]]` : `[[${r}/${D}]]`}${u}`
      }
    }
  }
  return `${dec(v, 2)}${u}`
}

export default function ButunuDegistir({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade), [grade])
  const S = useSession(tasks.length)
  const track = useTracker()
  const sol = useSolutions()
  const fresh = useFresh(sol)
  const task = tasks[S.idx]
  const age = useAge(grade)

  const onDone = (first: boolean) => {
    if (S.done) return
    track.item(first)
    S.complete(first)
    sfx.ok()
  }

  const finish = () => {
    const firsts = S.firsts.filter(Boolean).length
    const insight =
      grade <= 3
        ? 'Büyük pizzanın yarısı, küçük pizzanın yarısından büyüktür: bir kesir ne kadar olduğunu bütünü bilince söyler.'
        : grade === 4
          ? 'Bir çokluğun [[1/4]]’ü, onu 4 eş gruba ayırınca bir grubun büyüklüğüdür; bütün değişince grup da değişir. Bir grubu bilirsek bütünü de buluruz.'
          : grade === 5
            ? 'Kesir, bir parçanın bütüne göre büyüklüğüdür. [[3/4]], [[1/2]]’den büyüktür ama yalnızca bütünler aynıysa; küçük bir bütünün [[3/4]]’ü daha az olabilir.'
            : 'Kesir, ondalık ve yüzde bir ilişkiyi anlatır: %25’i ya da 0,25’i ne kadar ettiği bütüne bağlıdır. Bir kesri bilinen parçadan bütüne ulaşmak için önce birim kesri buluruz.'
    onFinish({
      summary: `${tasks.length} görevde bütünü değiştirdin; ${firsts} görevi ilk denemede çözdün${sol.list.length ? `, ${sol.list.length} farklı yol buldun` : ''}.`,
      insight,
      stars: S.stars(Math.min(1, sol.list.length * 0.25)),
    })
  }

  const footer = S.done ? <NextButton isLast={S.isLast} onNext={S.next} onFinish={finish} /> : null
  const props: ViewProps = { grade, footer, onDone, sol, fresh }

  return (
    <Scene grade={grade}>
      <Header
        icon={<Scaling size={22} />}
        color="#0d9488"
        idx={S.idx}
        total={tasks.length}
        title={task.title}
        extra={age.big ? <span className="text-2xl" aria-hidden>🍕</span> : undefined}
      />
      <TaskView key={S.idx} task={task} {...props} />
    </Scene>
  )
}

function TaskView({ task, ...p }: ViewProps & { task: Task }) {
  switch (task.kind) {
    case 'match':
      return task.model === 'pizza' ? <PizzaTask task={task} {...p} /> : <MatchBarTask task={task} {...p} />
    case 'share':
      return <ShareTask task={task} {...p} />
    case 'find':
      return <FindTask task={task} {...p} />
    case 'fromPart':
      return <FromPartTask task={task} {...p} />
    case 'open':
      return <OpenTask task={task} {...p} />
  }
}

/* ───────────────────────── ortak parçalar ───────────────────────── */

function Prompt({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-white/95 px-4 py-3 text-base leading-snug font-extrabold ring-1 ring-line sm:text-lg">
      <MathText text={text} />
    </div>
  )
}

/** Dikeyde görev metni çalışma alanının üstünde, yatayda sağ panelin başında */
function TaskLayout({ prompt, work, panel }: { prompt: string; work: ReactNode; panel: ReactNode }) {
  return (
    <Layout
      work={<><div className="mb-3 lg:hidden"><Prompt text={prompt} /></div>{work}</>}
      panel={<><div className="hidden lg:block"><Prompt text={prompt} /></div>{panel}</>}
    />
  )
}

/** Tek soruluk düşündürme: yanlışta soru sorar, yanılgıyı rapora yazar */
function ChoiceQ({ r, onRight }: { r: Reflect; onRight: (first: boolean) => void }) {
  const track = useTracker()
  const [wrong, setWrong] = useState<number | null>(null)
  const [tries, setTries] = useState(0)
  const [ok, setOk] = useState(false)
  return (
    <div className="rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-200 animate-fade-up">
      <p className="mb-2 text-[15px] font-black text-sky-900"><MathText text={r.q} /></p>
      <div className="flex flex-col gap-2">
        {r.options.map((o, i) => (
          <button
            key={i}
            type="button"
            disabled={ok}
            data-testid={`choice-${i}`}
            onClick={() => {
              const right = i === r.correct
              track.attempt(right)
              if (right) {
                setOk(true)
                setWrong(null)
                onRight(tries === 0)
              } else {
                setWrong(i)
                setTries((t) => t + 1)
              }
            }}
            className={`min-h-12 rounded-xl px-3 py-2 text-left text-[15px] font-extrabold ring-1 transition active:scale-[0.98] ${ok && i === r.correct ? 'bg-ok text-white ring-ok' : wrong === i ? 'bg-amber-50 text-amber-900 ring-amber-300' : 'bg-white text-sky-900 ring-sky-200 hover:bg-sky-100'}`}
          >
            <MathText text={o} />
          </button>
        ))}
      </div>
      {wrong !== null && r.wrong[wrong] && <Nudge key={`${wrong}-${tries}`} question={r.wrong[wrong]!} misconception={r.mis?.[wrong] ?? undefined} />}
    </div>
  )
}

/** Başarıdan sonra: (varsa) düşündürme sorusu → (varsa) strateji → bitti */
function After({ task, first, onDone }: { task: Task; first: boolean; onDone: (first: boolean) => void }) {
  const [reflectOk, setReflectOk] = useState<boolean | null>(task.reflect ? null : true)
  const needStrategy = !!task.strategies
  const [picked, setPicked] = useState(false)
  const sent = useRef(false)
  useEffect(() => {
    if (sent.current || reflectOk === null) return
    if (needStrategy && !picked) return
    sent.current = true
    onDone(first && reflectOk)
  }, [reflectOk, picked, needStrategy, first, onDone])
  return (
    <>
      {task.reflect && <ChoiceQ r={task.reflect} onRight={(f) => setReflectOk(f)} />}
      {reflectOk !== null && needStrategy && <StrategyPicker options={task.strategies!} onPick={() => setPicked(true)} />}
    </>
  )
}

function CheckBtn({ onClick, children = 'Kontrol et', disabled }: { onClick: () => void; children?: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} data-testid="check" className="btn-primary min-h-14 w-full text-lg">
      <Check size={20} strokeWidth={3} />{children}
    </button>
  )
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="flex items-center gap-1.5 text-sm font-bold text-ink-soft"><Hand size={16} className="shrink-0" />{children}</p>
}

/* ───────────────────────── 1) pizza: aynı kesir, farklı bütün ───────────────────────── */

function PizzaTask({ task, footer, onDone }: ViewProps & { task: Extract<Task, { kind: 'match' }> }) {
  const track = useTracker()
  const [nB, setNB] = useState(task.B.n)
  const [overlay, setOverlay] = useState(false)
  const [moved, setMoved] = useState(false)
  const [fail, setFail] = useState(0)
  const [won, setWon] = useState(false)
  const B = { ...task.B, n: nB }
  const A = task.A
  const ratio = (nB * nB) / (A.n * A.n)
  const ok = task.rel === 'gt' ? ratio >= 1.18 : task.rel === 'lt' ? ratio <= 0.82 : Math.abs(ratio - 1) < 0.1
  const change = (n: number) => {
    setNB(n)
    setMoved(true)
  }
  const check = () => {
    track.attempt(ok)
    if (ok) {
      setWon(true)
      setOverlay(true)
      sfx.ok()
    } else setFail((f) => f + 1)
  }
  const want = task.rel === 'gt' ? 'daha çok' : 'daha az'
  return (
    <TaskLayout
      prompt={task.prompt}
      work={
        <div className="rounded-3xl bg-[radial-gradient(circle_at_30%_20%,#fff7ed,#fdecd5)] p-3 ring-1 ring-amber-200">
          <PizzaPair A={A} B={B} onChange={change} overlay={overlay} />
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <Hint>Tutamacı sürükle ya da pizzanın üzerinde iki parmakla aç.</Hint>
            <Stepper w={B} onChange={change} label="pizza" />
          </div>
        </div>
      }
      panel={
        <>
          <Card title="Karşılaştır">
            <button type="button" onClick={() => setOverlay((o) => !o)} aria-pressed={overlay} data-testid="overlay" className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-3 font-extrabold ring-1 transition ${overlay ? 'bg-teal-600 text-white ring-teal-700' : 'bg-white text-ink ring-line'}`}>
              <Eye size={18} />{A.gen} dilimini {B.gen} pizzasına koy
            </button>
          </Card>
          {!won && <CheckBtn onClick={check} disabled={!moved}>Hazırım, kontrol et</CheckBtn>}
          {fail > 0 && !won && (
            <Nudge key={fail} question={`${share(B)} henüz ${A.gen}kinden ${want} değil. Dilimleri üst üste koyup bak. ${B.gen} pizzası ${task.rel === 'gt' ? 'büyüyünce' : 'küçülünce'} ${fLabel(B)}${fPoss(B)} ne olur?`} />
          )}
          {won && <Derived>{`Kesir aynı: ${fLabel(A)}. Ama ${B.gen} pizzası ${task.rel === 'gt' ? 'büyük' : 'küçük'}, bu yüzden ${fLabel(B)}${fPoss(B)} ${want}!`}</Derived>}
          {won && <After task={task} first={fail === 0} onDone={onDone} />}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 2) şerit/çikolata eşleştirme ───────────────────────── */

function relText(rel: 'eq' | 'gt' | 'lt') {
  return rel === 'eq' ? '=' : rel === 'gt' ? '>' : '<'
}

function MatchBarTask({ task, grade, footer, onDone }: ViewProps & { task: Extract<Task, { kind: 'match' }> }) {
  const track = useTracker()
  const age = useAge(grade as 3)
  const [nB, setNB] = useState(task.B.n)
  const [fail, setFail] = useState(0)
  const [won, setWon] = useState(false)
  const A = task.A
  const B = { ...task.B, n: nB }
  const a = partUnits(A), b = partUnits(B)
  const ok = task.rel === 'eq' ? Math.abs(a - b) < 1e-9 : task.rel === 'gt' ? b > a + 1e-9 : b < a - 1e-9
  const style = task.style ?? 'ribbon'
  const max = task.maxUnits ?? 16
  const check = () => {
    track.attempt(ok)
    if (ok) {
      setWon(true)
      sfx.ok()
    } else setFail((f) => f + 1)
  }
  const need = task.rel === 'eq' ? (b < a ? 'büyümeli' : 'küçülmeli') : task.rel === 'gt' ? 'büyümeli' : 'küçülmeli'
  const h = age.big ? 64 : 56
  return (
    <TaskLayout
      prompt={task.prompt}
      work={
        <div className="rounded-3xl bg-white/70 p-3 ring-1 ring-line sm:p-4">
          <BarStage maxUnits={max} guide={a} guideColor={A.color}>
            {(ppu) => (
              <div className="flex flex-col gap-5 pb-1">
                <BarTrack w={A} ppu={ppu} maxUnits={max} style={style} height={h} testid="bar-a"
                  label={<Who w={A}>{A.gen} {A.its}: {amount(A.n, task, grade)}</Who>}
                  readout={<MathText text={`${fLabel(A)}${fPoss(A)}: ${amount(a, task, grade)}`} />} />
                <BarTrack w={B} ppu={ppu} maxUnits={max} style={style} height={h} testid="bar-b" resizable onChange={setNB}
                  label={<Who w={B}>{B.gen} {B.its}: {amount(B.n, task, grade)}</Who>}
                  readout={<MathText text={`${fLabel(B)}${fPoss(B)}: ${amount(b, task, grade)}`} />} />
              </div>
            )}
          </BarStage>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <Hint>Kesik çizgi: {A.gen} {fLabel(A) === 'bütün' ? 'bütünü' : 'payı'}. Tutamacı sürükle ya da iki parmakla aç.</Hint>
            <Stepper w={B} onChange={setNB} label="bar-b" />
          </div>
        </div>
      }
      panel={
        <>
          {!won && <CheckBtn onClick={check} />}
          {fail > 0 && !won && (
            <Nudge key={fail} question={`${share(B)} şimdi ${amount(b, task, grade)}, ${share(A)} ise ${amount(a, task, grade)}. ${B.gen} ${B.its} ${need}. Bütün değişince ${fLabel(B)}${fPoss(B)} nasıl değişiyor?`} tool="fractions" toolTitle="Kesir şeritleriyle dene" />
          )}
          {won && (
            <Derived>{`${share(B)} ${relText(task.rel)} ${share(A)}`}</Derived>
          )}
          {won && (
            <p className="text-center text-base font-extrabold text-ink-soft">
              <MathText text={`${amount(b, task, grade)} ${relText(task.rel)} ${amount(a, task, grade)} · ${B.gen} ${B.its}: ${amount(B.n, task, grade)}`} />
            </p>
          )}
          {won && <After task={task} first={fail === 0} onDone={onDone} />}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 3) paylaştır ve karşılaştır ───────────────────────── */

function ShareTask({ task, grade, footer, onDone }: ViewProps & { task: Extract<Task, { kind: 'share' }> }) {
  const track = useTracker()
  const { A, B } = task
  const [pred, setPred] = useState<number | null>(null)
  const [dealt, setDealt] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [first, setFirst] = useState(true)
  const [won, setWon] = useState(false)
  const a = partUnits(A), b = partUnits(B)
  const correct = Math.abs(a - b) < 1e-9 ? 2 : a > b ? 0 : 1
  const options = [`${A.emoji} ${A.who}`, `${B.emoji} ${B.who}`, 'İkisi aynı']
  const maxN = Math.max(A.n, B.n)
  const isSet = task.model === 'set'

  // birer birer dağıt
  useEffect(() => {
    if (!isSet || dealt === 0 || dealt >= maxN) return
    const t = setTimeout(() => setDealt((d) => d + 1), maxN > 16 ? 70 : 140)
    return () => clearTimeout(t)
  }, [dealt, maxN, isSet])
  useEffect(() => {
    if (isSet && dealt >= maxN && !revealed) {
      setRevealed(true)
      judge()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealt])

  const judge = () => {
    const right = pred === correct
    track.attempt(right)
    if (right) {
      setWon(true)
      sfx.ok()
    } else setFirst(false)
  }
  const start = () => {
    if (isSet) setDealt(1)
    else {
      setRevealed(true)
      judge()
    }
  }
  const mis =
    pred === 2 && A.num * B.den === B.num * A.den
      ? 'Aynı kesir her bütünde aynı miktardır'
      : pred !== null && pred !== 2 && pred !== correct && (pred === 0 ? A.num / A.den > B.num / B.den : B.num / B.den > A.num / A.den)
        ? 'Kesrin büyüklüğüne bakıp bütünü hesaba katmadı'
        : undefined
  const dA = Math.min(dealt, A.n), dB = Math.min(dealt, B.n)
  const size = grade <= 3 ? 24 : maxN > 20 ? 16 : 20
  const sym = (w: Whole, part: number) =>
    task.unitValue
      ? `${amount(w.n, task, grade)}’nin ${fLabel(w)}${fPoss(w)} = ${amount(part, task, grade)}`
      : `${gen(w.n * (task.unitValue ?? 1))} ${fLabel(w)}${fPoss(w)} = ${amount(part, task, grade)}`
  const max = task.maxUnits ?? 10

  return (
    <TaskLayout
      prompt={task.prompt}
      work={
        <div className="rounded-3xl bg-white/70 p-3 ring-1 ring-line sm:p-4">
          {isSet ? (
            <div className="flex flex-col gap-4">
              {[{ w: A, d: dA, id: 'set-a' }, { w: B, d: dB, id: 'set-b' }].map(({ w, d, id }) => (
                <div key={id}>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <Who w={w}>{w.gen} {w.its}: {w.n} {task.unit}</Who>
                    <span className="chip px-3 py-1 text-sm" style={{ background: `${w.color}1a`, color: w.color }}><MathText text={`${fLabel(w)}${fPoss(w)}`} />{revealed ? ` = ${partUnits(w)} ${task.unit}` : ' = ?'}</span>
                  </div>
                  <Plates w={w} dealt={d} item={task.item} highlight={revealed} size={size} testid={id} />
                </div>
              ))}
            </div>
          ) : (
            <BarStage maxUnits={max}>
              {(ppu) => (
                <div className="flex flex-col gap-5">
                  {[A, B].map((w, i) => (
                    <BarTrack key={i} w={w} ppu={ppu} maxUnits={max} style={task.style ?? 'tape'} showParts={revealed} testid={`bar-${i}`}
                      label={<Who w={w}>{w.gen} {w.its}: {amount(w.n, task, grade)}</Who>}
                      readout={<MathText text={`${fLabel(w)}${fPoss(w)} = ${revealed ? amount(partUnits(w), task, grade) : '?'}`} />} />
                  ))}
                </div>
              )}
            </BarStage>
          )}
        </div>
      }
      panel={
        <>
          {pred === null ? (
            <Card title="Tahminin">
              <div className="grid grid-cols-3 gap-2">
                {options.map((o, i) => <PickBtn key={i} onClick={() => setPred(i)} className="text-base" label={o}><span data-testid={`pred-${i}`}>{o}</span></PickBtn>)}
              </div>
            </Card>
          ) : (
            <Card title="Tahminin">
              <p className="text-lg font-black text-ink">{options[pred]}</p>
            </Card>
          )}
          {pred !== null && !revealed && dealt === 0 && (
            <CheckBtn onClick={start}>{isSet ? `Paylaştır: ${A.den} ve ${B.den} eş gruba` : 'Eş parçalara böl'}</CheckBtn>
          )}
          {pred !== null && !revealed && dealt > 0 && <p className="text-center font-extrabold text-ink-soft">Paylaştırılıyor… birer birer</p>}
          {revealed && !won && (
            <>
              <Nudge question={`Modele bak: ${share(A)} ${amount(a, task, grade)}, ${share(B)} ${amount(b, task, grade)}. Kesirleri karşılaştırmak yetti mi? Bütünler aynı büyüklükte miydi?`} misconception={mis} />
              <ChoiceQ r={{ q: 'Şimdi modele bakarak söyle: kim daha çok aldı?', options, correct, wrong: options.map(() => 'Her grubun içindekileri say. Vurgulanan gruplarda kaç tane var?') }} onRight={() => setWon(true)} />
            </>
          )}
          {won && (
            <Derived>
              <span className="flex flex-col gap-1">
                <MathText text={sym(A, a)} />
                <MathText text={sym(B, b)} />
              </span>
            </Derived>
          )}
          {won && <After task={task} first={first} onDone={onDone} />}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 4) parçası bilinen çokluğu bul ───────────────────────── */

function FindTask({ task, grade, footer, onDone }: ViewProps & { task: Extract<Task, { kind: 'find' }> }) {
  const track = useTracker()
  const [n, setN] = useState(task.A.n)
  const [fail, setFail] = useState<string | null>(null)
  const [fails, setFails] = useState(0)
  const [mis, setMis] = useState<string | undefined>()
  const [won, setWon] = useState(false)
  const w = { ...task.A, n }
  const equal = n % w.den === 0
  const part = equal ? (n / w.den) * w.num : null
  const target = task.target
  const pinchRef = useRef<HTMLDivElement>(null)
  const check = () => {
    const ok = equal && part === target
    track.attempt(ok)
    if (ok) {
      setWon(true)
      sfx.ok()
      return
    }
    setFails((f) => f + 1)
    setMis(undefined)
    if (!equal) setFail(`${n} bilyeyi ${w.den} eş gruba ayırınca gruplar eşit oldu mu? Kesir için gruplar eş olmalı.`)
    else if (w.num > 1 && n === target * w.den) {
      setMis('Parçayı birim kesir sandı')
      setFail(`Şimdi bir grupta ${target} bilye var, yani [[1/${w.den}]]${fPoss({ ...w, num: 1 })} ${target} oldu. Oysa ${fLabel(w)}${fPoss(w)}, yani ${w.num} grubun toplamı ${target} olmalı. Bir grupta kaç bilye olmalı?`)
    } else
      setFail(`${fLabel(w)}${fPoss(w)} şimdi ${part}. ${target} olması için torba büyümeli mi, küçülmeli mi? Bir grupta kaç bilye olmalı?`)
  }
  return (
    <TaskLayout
      prompt={task.prompt}
      work={
        <div className="rounded-3xl bg-white/70 p-3 ring-1 ring-line sm:p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <Who w={w}>{w.gen} {w.its}: {n} bilye</Who>
            <span className="chip px-3 py-1 text-sm" style={{ background: `${w.color}1a`, color: w.color }}>
              <MathText text={`${fLabel(w)}${fPoss(w)} → ${part ?? '?'} bilye`} />
            </span>
          </div>
          <div ref={pinchRef} className="min-h-40">
            <Plates w={w} dealt={n} highlight={equal} size={grade <= 4 ? 20 : 18} testid="plates" />
          </div>
          {!equal && <p className="mt-2 text-sm font-extrabold text-amber-700">{w.den} grup eşit değil: bazı gruplarda bir bilye eksik.</p>}
          <div className="mt-3">
            <CountSlider w={w} onChange={setN} testid="count" />
          </div>
          <Hint>Sürgüyü kaydır ya da ± ile bilye ekle/çıkar. Bilyeler {w.den} tabağa birer birer dağılır.</Hint>
        </div>
      }
      panel={
        <>
          {!won && <CheckBtn onClick={check} />}
          {fail && !won && <Nudge key={fails} question={fail} misconception={mis} tool={task.A.fl?.startsWith('%') ? 'yuzdeizgarasi' : 'fractions'} />}
          {won && <Derived>{`${gen(n)} ${fLabel(w)}${fPoss(w)} = ${target} → bütün: ${n} bilye`}</Derived>}
          {won && grade >= 4 && (
            <p className="text-center text-sm font-extrabold text-ink-soft">
              <MathText text={`Bir grup: ${n / w.den} bilye · ${w.num} grup: ${target} · ${w.den} grup: ${n}`} />
            </p>
          )}
          {won && <After task={task} first={fails === 0} onDone={onDone} />}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 5) parçadan bütüne ───────────────────────── */

function FromPartTask({ task, grade, footer, onDone }: ViewProps & { task: Extract<Task, { kind: 'fromPart' }> }) {
  const track = useTracker()
  const [nB, setNB] = useState(task.B.n)
  const [fails, setFails] = useState(0)
  const [q, setQ] = useState<{ text: string; mis?: string } | null>(null)
  const [hint, setHint] = useState(false)
  const [won, setWon] = useState(false)
  const A = task.A
  const B = { ...task.B, n: nB }
  const p = task.part
  const goal = (p * A.den) / A.num
  const unit = p / A.num
  const max = task.maxUnits ?? 14
  const check = () => {
    const ok = Math.abs(nB - goal) < 1e-9
    track.attempt(ok)
    if (ok) {
      setWon(true)
      sfx.ok()
      return
    }
    setFails((f) => f + 1)
    if (nB === p) setQ({ text: `Bu parça bütünün tamamı mı, yoksa ${fLabel(A)}${fPoss(A)} mü? Bütün, parçadan daha büyük olmalı mı?` })
    else if (nB === p * A.den) setQ({ text: `Parçan [[1/${A.den}]] mi, yoksa ${fLabel(A)} mi? Parçada kaç tane [[1/${A.den}]] var?`, mis: 'Parçayı birim kesir sandı' })
    else if (nB === p + A.den) setQ({ text: `Parçaya ${A.den} birim ekledin. Ama [[1/${A.den}]]’lik bir parça kaç ${task.unit}? Önce parçayı ${A.num} eş parçaya böl.`, mis: 'Paydayı birim sayısı sandı' })
    else setQ({ text: `Parçayı ${A.num} eş parçaya bölersen her biri [[1/${A.den}]] olur. Bütünde kaç tane [[1/${A.den}]] olmalı? Şimdi bütün ${nB > goal ? 'çok uzun' : 'kısa'}.` })
  }
  const askHint = () => {
    if (!hint) track.hint()
    setHint(true)
  }
  const bShown = won
  return (
    <TaskLayout
      prompt={task.prompt}
      work={
        <div className="rounded-3xl bg-white/70 p-3 ring-1 ring-line sm:p-4">
          <BarStage maxUnits={max} guide={won ? p : null} guideColor={A.color}>
            {(ppu) => (
              <div className="flex flex-col gap-6 pb-2">
                <BarTrack w={{ ...A, n: p }} ppu={ppu} maxUnits={max} style={task.style ?? 'ribbon'} testid="part" fullPart splitHint={hint}
                  label={<Who w={A}>Parça: {amount(p, task, grade)}</Who>}
                  readout={<MathText text={`bütünün ${fLabel(A)}${fPoss(A)}`} />} />
                <BarTrack w={B} ppu={ppu} maxUnits={max} style={task.style ?? 'ribbon'} testid="whole" resizable onChange={setNB} showParts={bShown} ghostUnit={hint && !won ? unit : undefined}
                  label={<Who w={B}>Bütün {B.thing}: {amount(nB, task, grade)}</Who>}
                  readout={bShown ? <MathText text={`${fLabel(B)}${fPoss(B)} = ${amount(partUnits(B), task, grade)}`} /> : <span className="text-ink-soft">?</span>} />
              </div>
            )}
          </BarStage>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <Hint>Alttaki bütünün tutamacını sürükle ya da ± kullan.</Hint>
            <Stepper w={B} onChange={setNB} label="whole" />
          </div>
        </div>
      }
      panel={
        <>
          {!won && (
            <button type="button" onClick={askHint} disabled={hint} data-testid="split" className="btn-ghost min-h-12 w-full">
              <Scissors size={18} />{hint ? `Parça ${A.num} eş parçaya bölündü` : 'Parçayı böl'}
            </button>
          )}
          {hint && !won && <Hint><MathText text={`Turuncu çizgiler bir [[1/${A.den}]] uzunluğunu yineliyor.`} /></Hint>}
          {!won && <CheckBtn onClick={check} />}
          {q && !won && <Nudge key={fails} question={q.text} misconception={q.mis} tool="fractions" />}
          {won && <Derived>{`[[1/${A.den}]] = ${amount(unit, task, grade)} → bütün = ${A.den} × ${amount(unit, task, grade)} = ${amount(goal, task, grade)}`}</Derived>}
          {won && <After task={task} first={fails === 0 && !hint} onDone={onDone} />}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 6) açık uçlu: kaç farklı yol? ───────────────────────── */

function OpenTask({ task, grade, footer, onDone, sol, fresh }: ViewProps & { task: Extract<Task, { kind: 'open' }> }) {
  const track = useTracker()
  const [nA, setNA] = useState(task.A.n)
  const [nB, setNB] = useState(task.B.n)
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null)
  const [count, setCount] = useState(0)
  const [tries, setTries] = useState(0)
  const [fails, setFails] = useState(0)
  const A = { ...task.A, n: nA }, B = { ...task.B, n: nB }
  const a = partUnits(A), b = partUnits(B)
  const ok = task.rel === 'gt' ? a > b + 1e-9 : Math.abs(a - b) < 1e-9
  const max = task.maxUnits ?? 16
  const style = task.style ?? 'ribbon'
  const reached = count >= task.goal
  const save = () => {
    setTries((t) => t + 1)
    track.attempt(ok)
    if (!ok) {
      setFails((f) => f + 1)
      setMsg({ text: `${share(A)} ${amount(a, task, grade)}, ${share(B)} ${amount(b, task, grade)}. ${task.rel === 'gt' ? `${A.gen} payı daha uzun olmalı.` : 'İkisi eşit olmalı.'} Hangi ipi değiştirirsen işe yarar?` })
      return
    }
    const isNew = fresh(`${task.title}:${nA}-${nB}`, `${amount(nA, task, grade)} ve ${amount(nB, task, grade)}`)
    if (isNew) {
      setCount((c) => c + 1)
      setMsg({ text: count + 1 >= task.goal ? 'Harika! Çözümlerine bak: hepsinde ortak olan ne?' : 'Bir yol buldun! Başka bir yol daha bul.', ok: true })
    } else setMsg({ text: 'Bunu zaten buldun. İpleri başka uzunluklara getir.' })
  }
  const mine = sol.list.filter((s) => s.key.startsWith(`${task.title}:`))
  return (
    <TaskLayout
      prompt={task.prompt}
      work={
        <div className="rounded-3xl bg-white/70 p-3 ring-1 ring-line sm:p-4">
          <BarStage maxUnits={max} guide={b} guideColor={B.color}>
            {(ppu) => (
              <div className="flex flex-col gap-5 pb-1">
                <BarTrack w={A} ppu={ppu} maxUnits={max} style={style} testid="open-a" resizable onChange={setNA}
                  label={<Who w={A}>{A.gen} {A.its}: {amount(nA, task, grade)}</Who>}
                  readout={<MathText text={`${fLabel(A)}${fPoss(A)}: ${amount(a, task, grade)}`} />} />
                <BarTrack w={B} ppu={ppu} maxUnits={max} style={style} testid="open-b" resizable onChange={setNB}
                  label={<Who w={B}>{B.gen} {B.its}: {amount(nB, task, grade)}</Who>}
                  readout={<MathText text={`${fLabel(B)}${fPoss(B)}: ${amount(b, task, grade)}`} />} />
              </div>
            )}
          </BarStage>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2"><span className="text-sm font-black" style={{ color: A.color }}>{A.who}</span><Stepper w={A} onChange={setNA} label="open-a" /></div>
            <div className="flex items-center gap-2"><span className="text-sm font-black" style={{ color: B.color }}>{B.who}</span><Stepper w={B} onChange={setNB} label="open-b" /></div>
          </div>
        </div>
      }
      panel={
        <>
          <div className={`rounded-2xl px-4 py-2 text-center text-lg font-black ring-1 ${ok ? 'bg-ok-soft text-green-900 ring-green-200' : 'bg-white text-ink ring-line'}`}>
            <MathText text={`${amount(a, task, grade)} ${ok ? (task.rel === 'gt' ? '>' : '=') : a > b ? '>' : a < b ? '<' : '='} ${amount(b, task, grade)}`} />
          </div>
          {!reached && <CheckBtn onClick={save}>Bu yolu kaydet</CheckBtn>}
          {msg && (msg.ok ? <Derived tone="info">{msg.text}</Derived> : <Nudge key={tries} question={msg.text} />)}
          <SolutionList list={mine} goal={task.goal} />
          {reached && task.pattern && (
            <div className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-[15px] font-extrabold text-amber-900 ring-1 ring-amber-200 animate-fade-up">
              <Sparkles size={18} className="mt-0.5 shrink-0" /><MathText text={task.pattern} />
            </div>
          )}
          {reached && <After task={task} first={fails === 0} onDone={onDone} />}
          {footer}
        </>
      }
    />
  )
}
