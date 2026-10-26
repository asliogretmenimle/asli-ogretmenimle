import { useMemo, useState, type ReactNode } from 'react'
import { Check, Compass, RotateCcw, RotateCw } from 'lucide-react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { BigButton, Scene, useAge, useSolutions } from '../../games/kit2'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { Card, Derived, fitWidth, Header, Layout, NextButton, Nudge, NumStepper, PickBtn, Prompt } from '../sekil-insa-et/ortak'
import { arcPath, ccw, KIND_LABEL, kindOf, norm, Stage, type Arc, type Ray } from './stage'

/**
 * 51. Açıyı Oluştur — iki ışını döndürerek açı kur.
 *  4: açı = dönme miktarı (çeyrek/yarım tur), dar–dik–geniş (dik açı referansı), standart olmayan birimle ölçme (dilim)
 *  5–7: önce referans açılarla tahmin et, sonra açıölçerle ölç; tümler/bütünler; ters açılar; (6–7) paralel doğrular ve kesen; (7) açıortay
 */

const C = '#db2777'
const BASE = '#0f766e'
const MOVE = '#db2777'
const VIEW_HALF: [number, number, number, number] = [-1.3, -1.32, 2.6, 1.62]
const VIEW_FULL: [number, number, number, number] = [-1.3, -1.3, 2.6, 2.6]

type TurnTask = { kind: 'turn'; target: number; text: string; emoji: string; insight: string }
type ClassTask = { kind: 'classify'; want: 'dar' | 'geniş'; need: number; text: string }
type WedgeTask = { kind: 'wedge'; angle: number }
type BuildTask = { kind: 'build'; target: number }
type PairTask = { kind: 'pair'; alpha: number; total: 90 | 180 }
type Task = TurnTask | ClassTask | WedgeTask | BuildTask | PairTask | { kind: 'cross' } | { kind: 'parallel' } | { kind: 'bisector'; angle: number }

function tasksFor(grade: Grade): Task[] {
  if (grade === 4)
    return [
      { kind: 'turn', target: 90, emoji: '🤖', text: 'Robot yeşil ok yönüne bakıyor. **Çeyrek tur** sola dönerse yeni yönü ne olur? Pembe ışını o yöne çevir.', insight: 'Çeyrek tur dönüş bir **dik açı** oluşturur: kitabın köşesi gibi.' },
      { kind: 'classify', want: 'dar', need: 2, text: 'Dik açıdan **küçük** bir açı (dar açı) yap. Sonra farklı bir dar açı daha!' },
      { kind: 'classify', want: 'geniş', need: 2, text: 'Dik açıdan **büyük**, doğru açıdan küçük bir açı (geniş açı) yap. İki farklı tane!' },
      { kind: 'wedge', angle: 90 },
      { kind: 'turn', target: 180, emoji: '🚪', text: 'Kapı kapalıyken yeşil yönde. **Yarım tur** açılırsa nereye gelir? Pembe ışını çevir.', insight: 'Yarım tur iki çeyrek tur eder: **doğru açı** oluşur, iki ışın bir doğru gibi uzanır.' },
    ]
  if (grade === 5) return [{ kind: 'build', target: 60 }, { kind: 'build', target: 135 }, { kind: 'cross' }, { kind: 'pair', alpha: 35, total: 90 }, { kind: 'build', target: 20 }]
  if (grade === 6) return [{ kind: 'build', target: 150 }, { kind: 'pair', alpha: 65, total: 180 }, { kind: 'cross' }, { kind: 'parallel' }, { kind: 'build', target: 75 }]
  return [{ kind: 'build', target: 105 }, { kind: 'bisector', angle: 110 }, { kind: 'pair', alpha: 28, total: 90 }, { kind: 'parallel' }, { kind: 'pair', alpha: 47, total: 180 }]
}

export default function AciyiOlustur({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => tasksFor(grade), [grade])
  const [idx, setIdx] = useState(0)
  const [firsts, setFirsts] = useState<boolean[]>([])
  const [done, setDone] = useState(false)
  const sol = useSolutions()
  const task = tasks[idx]
  const isLast = idx + 1 >= tasks.length
  const complete = (first: boolean) => {
    if (done) return
    setDone(true)
    setFirsts((f) => [...f, first])
  }
  const finish = () => {
    const f = firsts.filter(Boolean).length
    onFinish({
      summary: `${tasks.length} açı görevini tamamladın; ${f} tanesinde ilk denemede hedefe ulaştın ve ${sol.list.length} farklı açı/ilişki buldun.`,
      insight:
        grade === 4
          ? 'Açı, bir ışının ne kadar döndüğünü gösterir. Dik açı (çeyrek tur) bir ölçüttür: ondan küçükler dar, büyükler geniş. Herkes aynı birimi kullanmazsa ölçümler farklı çıkar.'
          : grade <= 6
            ? 'Açıyı ölçmeden önce 45°, 90°, 135° ve 180° gibi referans açılarla tahmin etmek hatayı yakalamamı sağlar. Kesişen doğrularda ters açılar eşit, komşu açıların toplamı 180°’dir.'
            : 'Açılar arasındaki ilişkiler (tümler, bütünler, ters, yöndeş) doğrular döndükçe değişmez. Açıortay açıyı iki eş açıya böler; bir kol, açıortaya göre öbür kolun yansımasıdır.',
      stars: f >= tasks.length - 1 ? 3 : f >= tasks.length / 2 ? 2 : 1,
    })
  }
  const footer = done ? <NextButton isLast={isLast} onNext={() => { setIdx((i) => i + 1); setDone(false) }} onFinish={finish} /> : null
  const p = { grade, onComplete: complete, footer, addSol: (k: string, l: string) => sol.add(`${idx}:${k}`, l) }
  return (
    <Scene grade={grade}>
      <Header icon={<Compass size={22} />} color={C} idx={idx} total={tasks.length} title="Açıyı Oluştur" extra={sol.list.length > 0 ? <span className="chip bg-amber-100 px-3 py-1 text-sm text-amber-900 ring-1 ring-amber-200">📐 {sol.list.length}</span> : undefined} />
      {task.kind === 'turn' && <TurnRound key={idx} task={task} {...p} />}
      {task.kind === 'classify' && <ClassRound key={idx} task={task} {...p} />}
      {task.kind === 'wedge' && <WedgeRound key={idx} task={task} {...p} />}
      {task.kind === 'build' && <BuildRound key={idx} task={task} {...p} />}
      {task.kind === 'pair' && <PairRound key={idx} task={task} {...p} />}
      {task.kind === 'cross' && <CrossRound key={idx} {...p} />}
      {task.kind === 'parallel' && <ParallelRound key={idx} {...p} />}
      {task.kind === 'bisector' && <BisectorRound key={idx} task={task} {...p} />}
    </Scene>
  )
}

type RP = { grade: Grade; onComplete: (first: boolean) => void; footer: ReactNode; addSol: (k: string, l: string) => boolean }
type NS = { q: string; mis?: string; id: number } | null
const deg = (d: number) => `${Math.round(d)}°`

/** Döndürme düğmeleri (dokunma alternatifi) */
function Turners({ value, set, steps, big }: { value: number; set: (d: number) => void; steps: number[]; big?: boolean }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
      {[...steps].reverse().map((s) => (
        <button key={`-${s}`} type="button" onClick={() => set(norm(value - s))} className={`inline-flex ${big ? 'min-h-14' : 'min-h-12'} min-w-12 items-center justify-center gap-1 rounded-xl bg-white px-2.5 text-sm font-extrabold text-ink ring-1 ring-line active:scale-95`} aria-label={`${s} derece kapat`}><RotateCw size={16} />−{s}°</button>
      ))}
      {steps.map((s) => (
        <button key={`+${s}`} type="button" onClick={() => set(norm(value + s))} className={`inline-flex ${big ? 'min-h-14' : 'min-h-12'} min-w-12 items-center justify-center gap-1 rounded-xl bg-white px-2.5 text-sm font-extrabold text-ink ring-1 ring-line active:scale-95`} aria-label={`${s} derece aç`}><RotateCcw size={16} />+{s}°</button>
      ))}
    </div>
  )
}
const Hint = ({ children }: { children: ReactNode }) => <p className="mt-2 text-center text-sm font-bold opacity-75">{children}</p>

// ─── 4. sınıf: dönme ──────────────────────────────────────────────────────

function TurnRound({ grade, task, onComplete, footer, addSol }: RP & { task: TurnTask }) {
  const track = useTracker()
  const age = useAge(grade)
  const [a, setA] = useState(20)
  const [tries, setTries] = useState(0)
  const [nudge, setNudge] = useState<NS>(null)
  const [done, setDone] = useState(false)
  const [paper, setPaper] = useState(false)
  const check = () => {
    const ok = Math.abs(a - task.target) <= 5
    track.attempt(ok)
    if (ok) {
      setA(task.target)
      setDone(true)
      sfx.ok()
      setNudge(null)
      addSol('donus', task.target === 90 ? 'Çeyrek tur = dik açı' : 'Yarım tur = doğru açı')
      track.item(tries === 0)
      onComplete(tries === 0)
      return
    }
    setTries((t) => t + 1)
    if (a > 300) setNudge({ q: 'Robot sağa döndü! Sola dönmek için ışını hangi yöne çevirmelisin?', mis: 'Dönüş yönünü karıştırdı', id: Date.now() })
    else if (task.target === 90) setNudge({ q: a < 90 ? 'Bir tam turun dörtte biri kadar dönmeli. Kâğıt köşesini koyup karşılaştır: ışının köşeye ulaştı mı?' : 'Biraz fazla döndü. Kâğıt köşesini koyup karşılaştır.', id: Date.now() })
    else setNudge({ q: 'Yarım tur iki çeyrek tur eder. Robot arkasını dönmüş olmalı: ilk yönünün tam tersine bakıyor mu?', mis: a > 80 && a < 100 ? 'Yarım turu çeyrek tur sandı' : undefined, id: Date.now() })
  }
  const rays: Ray[] = [{ id: 'b', deg: 0, color: BASE, width: 0.032 }, { id: 'm', deg: a, color: MOVE, draggable: !done }]
  const arcs: Arc[] = [{ from: 0, to: a, color: MOVE, r: 0.3 }]
  return (
    <Layout
      top={<Prompt emoji={task.emoji} color={C}>{task.text}</Prompt>}
      work={
        <div>
          <div style={fitWidth(2.6 / 1.62, 300)}>
            <Stage rays={rays} arcs={arcs} onRay={(_, d) => { setA(d); setNudge(null) }} view={VIEW_HALF} snap={5} locked={done} active="m"
              under={paper ? <rect x={0} y={-0.55} width={0.55} height={0.55} fill="#fde68a" fillOpacity={0.6} stroke="#d97706" strokeWidth={0.01} /> : undefined}>
              <text x={0.02} y={0.17} fontSize={0.16}>{task.emoji}</text>
            </Stage>
          </div>
          {!done && <Turners value={a} set={(d) => { setA(d); setNudge(null) }} steps={[5, 15]} big={age.big} />}
          {!done && <Hint>Pembe ışının ucunu sürükle ya da iki parmakla çevir.</Hint>}
        </div>
      }
      panel={
        <>
          <button type="button" onClick={() => setPaper((v) => !v)} className={`min-h-12 rounded-xl px-3 text-sm font-extrabold ring-1 ${paper ? 'bg-amber-100 text-amber-900 ring-amber-300' : 'bg-white text-ink ring-line'}`}>📄 Kâğıt köşesi {paper ? '(açık)' : ''}</button>
          {nudge && <Nudge key={nudge.id} question={nudge.q} misconception={nudge.mis} tool="angle" onClose={() => setNudge(null)} />}
          {!done && <BigButton onClick={check} className="w-full"><Check size={20} />Döndüm!</BigButton>}
          {done && <Derived>{task.insight.replace(/\*\*/g, '')}</Derived>}
          {footer}
        </>
      }
    />
  )
}

function ClassRound({ grade, task, onComplete, footer, addSol }: RP & { task: ClassTask }) {
  const track = useTracker()
  const age = useAge(grade)
  const [a, setA] = useState(task.want === 'dar' ? 120 : 40)
  const [found, setFound] = useState<number[]>([])
  const [fails, setFails] = useState(0)
  const [nudge, setNudge] = useState<NS>(null)
  const [paper, setPaper] = useState(false)
  const done = found.length >= task.need
  const k = kindOf(a)
  const check = () => {
    if (a > 180) return setNudge({ q: 'Işın aşağı indi. Açıyı yeşil ışının üstünde kur.', id: Date.now() })
    if (k !== task.want) {
      track.attempt(false)
      setFails((f) => f + 1)
      setNudge({
        q: k === 'dik' ? 'Bu tam bir dik açı (kâğıt köşesi gibi). Biraz daha ' + (task.want === 'dar' ? 'kapat.' : 'aç.') : task.want === 'dar' ? 'Kâğıt köşesini koy: açın köşeden taşıyor mu? Dar açı köşenin içinde kalır.' : 'Kâğıt köşesini koy: açın köşenin içinde kalıyor. Geniş açı köşeden taşar.',
        mis: k === 'doğru' ? 'Doğru açıyı geniş açı sandı' : undefined,
        id: Date.now(),
      })
      setPaper(true)
      return
    }
    if (found.some((f) => Math.abs(f - a) < 10)) return setNudge({ q: 'Bu açıya çok benzeyen birini zaten yaptın. Daha farklı bir ' + KIND_LABEL[task.want] + ' yapabilir misin?', id: Date.now() })
    track.attempt(true)
    sfx.ok()
    setNudge(null)
    addSol(String(a), KIND_LABEL[task.want])
    const nf = [...found, a]
    setFound(nf)
    if (nf.length >= task.need) {
      track.item(fails === 0)
      onComplete(fails === 0)
    }
  }
  const rays: Ray[] = [
    ...found.map((f, i) => ({ id: `f${i}`, deg: f, color: '#94a3b8', width: 0.014, dashed: true, len: 0.8 })),
    { id: 'b', deg: 0, color: BASE, width: 0.032 },
    { id: 'm', deg: a, color: MOVE, draggable: !done },
  ]
  return (
    <Layout
      top={<Prompt emoji="📐" color={C}>{task.text}</Prompt>}
      work={
        <div>
          <div style={fitWidth(2.6 / 1.62, 300)}>
            <Stage rays={rays} arcs={[{ from: 0, to: a, color: MOVE, r: 0.3 }]} onRay={(_, d) => { setA(d); setNudge(null) }} view={VIEW_HALF} snap={5} locked={done} active="m"
              under={paper ? <rect x={0} y={-0.55} width={0.55} height={0.55} fill="#fde68a" fillOpacity={0.6} stroke="#d97706" strokeWidth={0.01} /> : undefined} />
          </div>
          {!done && <Turners value={a} set={(d) => { setA(d); setNudge(null) }} steps={[5, 15]} big={age.big} />}
        </div>
      }
      panel={
        <>
          <Card title={`Bulduğun açılar: ${found.length} / ${task.need}`}>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: task.need }, (_, i) => (
                <span key={i} className={`grid size-14 place-items-center rounded-xl ring-1 ${found[i] !== undefined ? 'bg-emerald-50 ring-emerald-200' : 'bg-paper ring-line'}`}>
                  {found[i] !== undefined ? <MiniAngle d={found[i]} /> : <span className="text-xl text-ink-soft/40">?</span>}
                </span>
              ))}
            </div>
          </Card>
          <button type="button" onClick={() => setPaper((v) => !v)} className={`min-h-12 rounded-xl px-3 text-sm font-extrabold ring-1 ${paper ? 'bg-amber-100 text-amber-900 ring-amber-300' : 'bg-white text-ink ring-line'}`}>📄 Kâğıt köşesiyle karşılaştır</button>
          {nudge && <Nudge key={nudge.id} question={nudge.q} misconception={nudge.mis} tool="angle" onClose={() => setNudge(null)} />}
          {!done && <BigButton onClick={check} className="w-full"><Check size={20} />Kontrol et</BigButton>}
          {done && <Derived>{task.want === 'dar' ? 'İki açı da dik açıdan (kâğıt köşesinden) küçük: dar açı.' : 'İki açı da dik açıdan büyük ama doğru açıdan küçük: geniş açı.'}</Derived>}
          {footer}
        </>
      }
    />
  )
}

function MiniAngle({ d }: { d: number }) {
  const g = arcPath(0, d, 0.35)
  const x = Math.cos((d * Math.PI) / 180), y = -Math.sin((d * Math.PI) / 180)
  return (
    <svg viewBox="-1.1 -1.1 2.2 1.4" width={44} height={30} aria-hidden>
      <path d={g.d} fill={MOVE} fillOpacity={0.25} />
      <line x1={0} y1={0} x2={1} y2={0} stroke={BASE} strokeWidth={0.08} />
      <line x1={0} y1={0} x2={x} y2={y} stroke={MOVE} strokeWidth={0.08} />
    </svg>
  )
}

// ─── 4. sınıf: dilimlerle ölç ─────────────────────────────────────────────

function WedgeRound({ grade, task, onComplete, footer, addSol }: RP & { task: WedgeTask }) {
  const track = useTracker()
  const age = useAge(grade)
  const [unit, setUnit] = useState<30 | 15>(30)
  const [n, setN] = useState(0)
  const [res, setRes] = useState<{ 30?: number; 15?: number }>({})
  const [nudge, setNudge] = useState<NS>(null)
  const [pick, setPick] = useState<number | null>(null)
  const [wrong, setWrong] = useState(0)
  const [done, setDone] = useState(false)
  const filled = n * unit
  const both = res[30] !== undefined && res[15] !== undefined
  const add = () => {
    if (filled + unit > task.angle) {
      setNudge({ q: 'Bir dilim daha koyarsan açının dışına taşar. Açı tam doldu mu?', id: Date.now() })
      return
    }
    setNudge(null)
    const nn = n + 1
    setN(nn)
    if (nn * unit === task.angle) {
      sfx.ok()
      setRes((r) => ({ ...r, [unit]: nn }))
      addSol(String(unit), `${unit === 30 ? 'Büyük' : 'Küçük'} dilimle ${nn}`)
    }
  }
  const switchUnit = () => {
    setUnit(15)
    setN(0)
  }
  const choose = (i: number) => {
    setPick(i)
    const ok = i === 1
    track.attempt(ok)
    if (ok) {
      setDone(true)
      sfx.ok()
      setNudge(null)
      track.item(wrong === 0)
      onComplete(wrong === 0)
    } else {
      setWrong((w) => w + 1)
      setNudge({ q: i === 0 ? 'Açıyı hiç değiştirmedik: aynı iki ışın, aynı açı. Değişen ne?' : 'İki ölçüm de doğru yapıldı. Peki dilimlerin büyüklüğü aynı mıydı?', mis: i === 0 ? 'Farklı birimle ölçülünce açının değiştiğini düşündü' : undefined, id: Date.now() })
    }
  }
  const wedges: Arc[] = Array.from({ length: n }, (_, i) => ({ from: i * unit, to: (i + 1) * unit, color: i % 2 ? '#f59e0b' : '#fb923c', r: 0.75 }))
  return (
    <Layout
      top={<Prompt emoji="🍰" color={C}>{both ? 'Aynı açıyı iki farklı dilimle ölçtün. Neden farklı sayılar buldun?' : `Bu açıyı **${unit === 30 ? 'büyük' : 'küçük'} pasta dilimleriyle** ölç: açıyı doldurmak için kaç dilim gerekir?`}</Prompt>}
      work={
        <div>
          <div style={fitWidth(2.6 / 1.62, 300)}>
            <Stage rays={[{ id: 'b', deg: 0, color: BASE, width: 0.032 }, { id: 'm', deg: task.angle, color: MOVE, width: 0.032 }]} arcs={wedges.map((w) => ({ ...w, label: undefined }))} onRay={() => {}} view={VIEW_HALF} locked>
              {wedges.map((w, i) => { const g = arcPath(w.from, w.to, 0.75); return <path key={i} d={g.d} fill={w.color} stroke="#fff" strokeWidth={0.012} /> })}
            </Stage>
          </div>
          {!both && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <BigButton onClick={add} disabled={filled >= task.angle}>🍰 Dilim ekle</BigButton>
              {n > 0 && filled < task.angle && <button type="button" className="btn-ghost min-h-12" onClick={() => setN((x) => Math.max(0, x - 1))}>Geri al</button>}
            </div>
          )}
        </div>
      }
      panel={
        <>
          <Card title="Ölçümler">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-orange-50 p-2"><p className="text-xs font-black text-orange-700">Büyük dilim</p><p className="text-2xl font-black tabular-nums">{res[30] ?? (unit === 30 ? n : '–')}</p></div>
              <div className="rounded-xl bg-amber-50 p-2"><p className="text-xs font-black text-amber-700">Küçük dilim</p><p className="text-2xl font-black tabular-nums">{res[15] ?? (unit === 15 ? n : '–')}</p></div>
            </div>
          </Card>
          {res[30] !== undefined && unit === 30 && <BigButton onClick={switchUnit} className="w-full">Şimdi küçük dilimlerle ölç</BigButton>}
          {both && (
            <Card title="Neden?">
              <div className="grid gap-2">
                {['Açı küçüldü.', 'Dilimler farklı büyüklükte: birim değişince sayı değişir.', 'Yanlış saydım.'].map((t, i) => (
                  <PickBtn key={i} on={pick === i} color={i === 1 && pick === 1 ? '#16a34a' : C} disabled={done} onClick={() => choose(i)} className="text-left text-[15px] leading-snug" big={age.big}>{t}</PickBtn>
                ))}
              </div>
            </Card>
          )}
          {nudge && <Nudge key={nudge.id} question={nudge.q} misconception={nudge.mis} tool="angle" onClose={() => setNudge(null)} />}
          {done && <Derived>Aynı açı: 3 büyük dilim = 6 küçük dilim. Herkes aynı sonucu bulsun diye ortak bir birim kullanırız: derece. Tam tur 360 derecedir; dik açı 90°.</Derived>}
          {footer}
        </>
      }
    />
  )
}

// ─── 5–7: tahmin et, sonra ölç ────────────────────────────────────────────

function BuildRound({ grade, task, onComplete, footer, addSol }: RP & { task: BuildTask }) {
  const track = useTracker()
  const age = useAge(grade)
  const dark = age.tier === 'atolye'
  const T = task.target
  const [a, setA] = useState(T > 90 ? 40 : 150)
  const [phase, setPhase] = useState<'est' | 'measure' | 'done'>('est')
  const [est, setEst] = useState<number | null>(null)
  const [bench, setBench] = useState(true)
  const [nudge, setNudge] = useState<NS>(null)
  const [tries, setTries] = useState(0)
  const lock = () => {
    if (a > 180) return setNudge({ q: 'Açıyı yeşil ışının üstünde kur (0° ile 180° arası).', id: Date.now() })
    setEst(a)
    const err = Math.abs(a - T)
    if (err > 25 && Math.abs(180 - a - T) <= 10) track.misconception('Açıölçerde ters ölçeği okur gibi tahmin etti (açıyı 180°’den çıkardı)')
    else if (kindOf(a) !== kindOf(T) && err > 15) track.misconception(`${T}° için ${KIND_LABEL[kindOf(a)]} kurdu (dik açı referansını kullanmadı)`)
    setPhase('measure')
    setNudge(null)
  }
  const check = () => {
    const ok = Math.abs(a - T) <= 1
    track.attempt(ok)
    if (ok) {
      setA(T)
      setPhase('done')
      sfx.ok()
      setNudge(null)
      const first = est !== null && Math.abs(est - T) <= 10 && tries === 0
      addSol(String(T), `${T}° (tahmin ${Math.round(est ?? 0)}°)`)
      track.item(first)
      onComplete(first)
      return
    }
    setTries((t) => t + 1)
    setNudge({ q: Math.abs(180 - a - T) <= 2 ? `Açıölçerde öbür ölçeği okumuş olabilir misin? Açın ${KIND_LABEL[kindOf(a)]}; ${T}° ise ${KIND_LABEL[kindOf(T)]} olmalı.` : `Şu an açın ${deg(a)}. Açıölçerde 0 çizgisini yeşil ışından başlatıp say: ${T}° için ${a < T ? 'biraz daha aç' : 'biraz kapat'}.`, mis: Math.abs(180 - a - T) <= 2 ? 'Açıölçerde yanlış ölçeği okudu' : undefined, id: Date.now() })
  }
  const showDeg = phase !== 'est'
  return (
    <Layout
      top={<Prompt emoji="🎯" color={C}>{phase === 'est' ? `Açıölçer kullanmadan **${T}°** bir açı kur. Referans açılar yardımcı olur: ${T}° hangi ikisinin arasında?` : phase === 'measure' ? `Şimdi açıölçerle ölç ve açını tam **${T}°** yap.` : `Harika: ${T}°!`}</Prompt>}
      work={
        <div>
          <div style={fitWidth(2.6 / 1.62, 300)}>
            <Stage rays={[...(est !== null ? [{ id: 'e', deg: est, color: '#94a3b8', dashed: true, width: 0.014, len: 0.9 }] : []), { id: 'b', deg: 0, color: dark ? '#5eead4' : BASE, width: 0.032 }, { id: 'm', deg: a, color: MOVE, draggable: phase !== 'done' }]} arcs={[{ from: 0, to: a, color: MOVE, r: 0.3, label: showDeg ? deg(a) : undefined }]} onRay={(_, d) => { setA(d); setNudge(null) }} view={VIEW_HALF} snap={1} protractor={showDeg ? 0 : null} benchmarks={phase === 'est' && bench} dark={dark} locked={phase === 'done'} active="m" />
          </div>
          {phase !== 'done' && <Turners value={a} set={(d) => { setA(d); setNudge(null) }} steps={[1, 10]} big={age.big} />}
          {phase !== 'done' && <Hint>Pembe ışının ucunu sürükle, iki parmakla çevir ya da düğmeleri kullan.</Hint>}
        </div>
      }
      panel={
        <>
          {phase === 'est' && <button type="button" onClick={() => setBench((v) => !v)} className={`min-h-12 rounded-xl px-3 text-sm font-extrabold ring-1 ${bench ? 'bg-sky-100 text-sky-900 ring-sky-300' : 'bg-white text-ink ring-line'}`}>Referans açılar: {bench ? 'açık' : 'kapalı'}</button>}
          {phase === 'est' && <BigButton onClick={lock} className="w-full">Tahminim bu</BigButton>}
          {phase !== 'est' && est !== null && (
            <Card title="Tahminin">
              <p className="text-lg font-black">{deg(est)} <span className="text-sm font-bold text-ink-soft">→ hedef {T}°, fark {Math.round(Math.abs(est - T))}°</span></p>
              <p className="text-sm font-bold text-ink-soft">{Math.abs(est - T) <= 10 ? 'Çok iyi bir tahmin!' : Math.abs(est - T) <= 25 ? 'Fena değil. Referans açılarla daha da yaklaşabilirsin.' : 'Hangi referans açıya daha yakın olduğunu düşün.'}</p>
            </Card>
          )}
          {nudge && <Nudge key={nudge.id} question={nudge.q} misconception={nudge.mis} tool="angle" onClose={() => setNudge(null)} />}
          {phase === 'measure' && <BigButton onClick={check} className="w-full"><Check size={20} />Ölçtüm</BigButton>}
          {phase === 'done' && <Derived>{`${T}° bir ${KIND_LABEL[kindOf(T)]}: ${T < 90 ? `dik açıdan ${90 - T}° küçük` : T > 90 ? `dik açıdan ${T - 90}° büyük` : 'tam çeyrek tur'}.`}</Derived>}
          {footer}
        </>
      }
    />
  )
}

function PairRound({ grade, task, onComplete, footer, addSol }: RP & { task: PairTask }) {
  const track = useTracker()
  const age = useAge(grade)
  const dark = age.tier === 'atolye'
  const { alpha, total } = task
  const beta = total - alpha
  const [pred, setPred] = useState<number | null>(null)
  const [sent, setSent] = useState(false)
  const [r2, setR2] = useState(alpha + 20)
  const [nudge, setNudge] = useState<NS>(null)
  const [done, setDone] = useState(false)
  const b = ccw(alpha, r2)
  const name = total === 90 ? 'tümler' : 'bütünler'
  const sendPred = () => {
    setSent(true)
    if (pred !== beta) {
      if (pred === 180 - alpha && total === 90) track.misconception('Tümler ile bütünler açıyı karıştırdı')
      else if (pred === 90 - alpha && total === 180) track.misconception('Bütünler ile tümler açıyı karıştırdı')
    }
  }
  const check = () => {
    const ok = Math.abs(b - beta) <= 1
    track.attempt(ok)
    if (ok) {
      setR2(total)
      setDone(true)
      sfx.ok()
      setNudge(null)
      addSol(`${alpha}`, `${alpha}° + ${beta}° = ${total}°`)
      track.item(pred === beta)
      onComplete(pred === beta)
      return
    }
    setNudge({ q: `İki açının toplamı şu an ${alpha}° + ${deg(b)} = ${deg(alpha + b)}. ${total === 90 ? 'Dik açı' : 'Doğru açı'} için toplam ${total}° olmalı.`, id: Date.now() })
  }
  return (
    <Layout
      top={<Prompt emoji="🧩" color={C}>{`Yeşil ile mavi ışın arasında **${alpha}°** var. Pembe ışını öyle çevir ki iki açı birlikte bir **${total === 90 ? 'dik açı' : 'doğru açı'}** oluştursun (${name} açılar). Önce: pembe açı kaç derece olmalı?`}</Prompt>}
      work={
        <div>
          <div style={fitWidth(2.6 / 1.62, 300)}>
            <Stage
              rays={[{ id: 'b', deg: 0, color: dark ? '#5eead4' : BASE, width: 0.03 }, { id: 'a', deg: alpha, color: '#2563eb', width: 0.03 }, { id: 'm', deg: r2, color: MOVE, draggable: sent && !done }]}
              arcs={[{ from: 0, to: alpha, color: '#2563eb', r: 0.42, label: `${alpha}°` }, { from: alpha, to: r2, color: MOVE, r: 0.28, label: sent ? deg(b) : '?' }]}
              onRay={(_, d) => { setR2(d); setNudge(null) }}
              view={VIEW_HALF}
              protractor={sent ? 0 : null}
              dark={dark}
              locked={!sent || done}
              active="m"
            />
          </div>
          {sent && !done && <Turners value={r2} set={(d) => { setR2(d); setNudge(null) }} steps={[1, 10]} big={age.big} />}
        </div>
      }
      panel={
        <>
          <Card title="Önce düşün">
            <div className="flex flex-wrap items-end justify-center gap-3">
              <NumStepper value={pred} onChange={(v) => setPred(v)} max={180} step={1} label="pembe açı (°)" big={age.big} />
              {!sent && <BigButton onClick={sendPred} disabled={pred === null}>Tahminim bu</BigButton>}
            </div>
          </Card>
          {sent && !done && (
            <Card title="Kur ve ölç">
              <p className="text-lg font-black">{alpha}° + {deg(b)} = <span style={{ color: Math.abs(alpha + b - total) <= 1 ? '#16a34a' : MOVE }}>{deg(alpha + b)}</span></p>
            </Card>
          )}
          {nudge && <Nudge key={nudge.id} question={nudge.q} misconception={nudge.mis} tool="angle" onClose={() => setNudge(null)} />}
          {sent && !done && <BigButton onClick={check} className="w-full"><Check size={20} />Kontrol et</BigButton>}
          {done && <Derived>{`${alpha}° + ${beta}° = ${total}°: ${alpha}° ile ${beta}° ${name} açılardır. ${pred === beta ? 'Tahminin tuttu!' : `Tahminin ${pred}° idi: ${total} − ${alpha} = ${beta}.`}`}</Derived>}
          {footer}
        </>
      }
    />
  )
}

// ─── Kesişen doğrular: ters açılar ────────────────────────────────────────

function CrossRound({ grade, onComplete, footer, addSol }: RP) {
  const track = useTracker()
  const age = useAge(grade)
  const dark = age.tier === 'atolye'
  const [t, setT] = useState(50)
  const [seen, setSeen] = useState<number[]>([50])
  const [pairs, setPairs] = useState<string[]>([])
  const [bad, setBad] = useState<string | null>(null)
  const [sumPick, setSumPick] = useState<number | null>(null)
  const [wrong, setWrong] = useState(0)
  const [nudge, setNudge] = useState<NS>(null)
  const [done, setDone] = useState(false)
  const th = ((t % 180) + 180) % 180 || 1
  const setLine = (d: number) => {
    const v = ((d % 180) + 180) % 180
    const c = Math.max(10, Math.min(170, v))
    setT(c)
    setSeen((s) => (s.some((x) => Math.abs(x - c) < 15) ? s : [...s, c]))
  }
  const moved = seen.length >= 3
  const OPTS: [string, string][] = [['ab', 'a ile b'], ['ac', 'a ile c'], ['bd', 'b ile d'], ['ad', 'a ile d']]
  const pickPair = (k: string) => {
    if (pairs.includes(k)) return
    const ok = k === 'ac' || k === 'bd'
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      setBad(null)
      setNudge(null)
      addSol(k, k === 'ac' ? 'a = c (ters açılar)' : 'b = d (ters açılar)')
      setPairs((p) => [...p, k])
    } else {
      setBad(k)
      setWrong((w) => w + 1)
      setNudge({ q: 'Doğruyu biraz döndür ve izle: bu iki açı hep eşit kalıyor mu? Biri büyürken öbürü ne oluyor?', mis: 'Komşu açıları her zaman eşit sandı', id: Date.now() })
    }
  }
  const pickSum = (v: number) => {
    setSumPick(v)
    const ok = v === 180
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      setNudge(null)
      setDone(true)
      track.item(wrong === 0)
      onComplete(wrong === 0)
    } else {
      setWrong((w) => w + 1)
      setNudge({ q: 'a ile b birlikte yatay doğrunun bir yanını oluşturuyor. Bir doğru boyunca açı kaç derecedir?', id: Date.now() })
    }
  }
  const arcs: Arc[] = [
    { from: 0, to: th, color: '#db2777', r: 0.3, label: `a ${deg(th)}` },
    { from: th, to: 180, color: '#2563eb', r: 0.24, label: `b ${deg(180 - th)}` },
    { from: 180, to: 180 + th, color: '#db2777', r: 0.3, label: `c ${deg(th)}` },
    { from: 180 + th, to: 360, color: '#2563eb', r: 0.24, label: `d ${deg(180 - th)}` },
  ]
  return (
    <Layout
      top={<Prompt emoji="✖️" color={C}>İki doğru kesişiyor. Pembe doğruyu **döndür** ve dört açıyı izle. Hangi açılar **her zaman** eşit kalıyor?</Prompt>}
      work={
        <div>
          <div style={fitWidth(1, 300)}>
            <Stage rays={[{ id: 'h', deg: 0, color: dark ? '#5eead4' : BASE, line: true, len: 1.15, width: 0.026 }, { id: 'm', deg: t, color: MOVE, line: true, len: 1.15, draggable: !done }]} arcs={arcs} onRay={(_, d) => setLine(d)} view={VIEW_FULL} dark={dark} locked={done} active="m" />
          </div>
          {!done && <Turners value={t} set={setLine} steps={[1, 10]} big={age.big} />}
        </div>
      }
      panel={
        <>
          {!moved && <Card><p className="font-bold">Önce pembe doğruyu birkaç farklı konuma döndür ({seen.length}/3).</p></Card>}
          {moved && (
            <Card title={`Her zaman eşit olan çiftler (${pairs.length}/2)`}>
              <div className="grid grid-cols-2 gap-2">
                {OPTS.map(([k, l]) => <PickBtn key={k} big={age.big} on={pairs.includes(k) || bad === k} color={pairs.includes(k) ? '#16a34a' : '#f59e0b'} onClick={() => pickPair(k)} disabled={pairs.includes(k) || done}>{l}</PickBtn>)}
              </div>
            </Card>
          )}
          {pairs.length >= 2 && (
            <Card title="Komşu açılar">
              <p className="mb-2 font-extrabold">Doğru nasıl dönerse dönsün, a + b kaç derecedir?</p>
              <div className="grid grid-cols-3 gap-2">
                {[90, 180, 360].map((v) => <PickBtn key={v} big={age.big} on={sumPick === v} color={v === 180 && sumPick === 180 ? '#16a34a' : C} onClick={() => pickSum(v)} disabled={done}>{v}°</PickBtn>)}
              </div>
            </Card>
          )}
          {nudge && <Nudge key={nudge.id} question={nudge.q} misconception={nudge.mis} tool="angle" onClose={() => setNudge(null)} />}
          {done && <Derived>Ters açılar eşittir (a = c, b = d). Komşu açılar bir doğru oluşturur: a + b = 180°.</Derived>}
          {footer}
        </>
      }
    />
  )
}

// ─── Paralel iki doğru ve bir kesen ───────────────────────────────────────

function ParallelRound({ grade, onComplete, footer, addSol }: RP) {
  const track = useTracker()
  const age = useAge(grade)
  const dark = age.tier === 'atolye'
  const [t, setT] = useState(60)
  const [found, setFound] = useState<number[]>([])
  const [bad, setBad] = useState<number[]>([])
  const [nudge, setNudge] = useState<NS>(null)
  const [wrong, setWrong] = useState(0)
  const [done, setDone] = useState(false)
  const h = 0.42
  const th = Math.max(25, Math.min(155, ((t % 180) + 180) % 180))
  const setLine = (d: number) => setT(Math.max(25, Math.min(155, ((d % 180) + 180) % 180)))
  const dx = h / Math.tan((th * Math.PI) / 180)
  const P1: [number, number] = [dx, -h], P2: [number, number] = [-dx, h]
  // açı i: 1 sağ üst, 2 sol üst, 3 sol alt, 4 sağ alt (her kesişimde)
  const val = (i: number) => ([1, 3, 5, 7].includes(i) ? th : 180 - th)
  const ang = (i: number): [number, number] => {
    const k = (i - 1) % 4
    return k === 0 ? [0, th] : k === 1 ? [th, 180] : k === 2 ? [180, 180 + th] : [180 + th, 360]
  }
  const NAMES: Record<number, string> = { 3: 'ters açı', 5: 'yöndeş açı', 7: 'dış ters açı' }
  const pick = (i: number) => {
    if (done || i === 1 || found.includes(i)) return
    const ok = [3, 5, 7].includes(i)
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      setNudge(null)
      addSol(String(i), `1 = ${i} (${NAMES[i]})`)
      const nf = [...found, i]
      setFound(nf)
      if (nf.length === 3) {
        setDone(true)
        track.item(wrong === 0)
        onComplete(wrong === 0)
      }
    } else {
      setWrong((w) => w + 1)
      setBad((b) => [...b, i])
      setNudge({ q: `Keseni döndür ve izle: ${i} numaralı açı 1 numaralı açıyla hep eşit mi? 1 büyürken ${i} ne yapıyor?`, mis: [6, 8].includes(i) ? 'Paralel doğrularda iç/dış açıları yöndeşle karıştırdı' : undefined, id: Date.now() })
    }
  }
  const arcFor = (i: number, c: [number, number]) => {
    const [f, to] = ang(i)
    const g = arcPath(f, to, 0.17)
    const mid = (f + to) / 2
    const lx = c[0] + Math.cos((mid * Math.PI) / 180) * 0.27, ly = c[1] - Math.sin((mid * Math.PI) / 180) * 0.27
    const isF = found.includes(i) || i === 1
    const col = isF ? '#16a34a' : bad.includes(i) ? '#f59e0b' : '#64748b'
    return (
      <g key={i}>
        {(isF || bad.includes(i)) && <path d={g.d} transform={`translate(${c[0]} ${c[1]})`} fill={col} fillOpacity={0.3} />}
        <g onClick={() => pick(i)} style={{ cursor: 'pointer' }} data-handle>
          <circle cx={lx} cy={ly} r={0.085} fill={dark ? '#1e293b' : '#fff'} stroke={col} strokeWidth={0.014} />
          <text x={lx} y={ly + 0.03} textAnchor="middle" fontSize={0.08} fontWeight={900} fill={col}>{i}</text>
        </g>
        {grade >= 6 && <text x={lx} y={ly + 0.13} textAnchor="middle" fontSize={0.05} fontWeight={800} fill={col}>{deg(val(i))}</text>}
      </g>
    )
  }
  const line = dark ? '#5eead4' : BASE
  return (
    <Layout
      top={<Prompt emoji="🛤️" color={C}>Raylar gibi iki **paralel** doğruyu bir kesen kesiyor. Keseni döndür. **1 numaralı açıya her zaman eşit** olan açıları bul ve onlara dokun.</Prompt>}
      work={
        <div>
          <div style={fitWidth(1, 300)}>
            <Stage rays={[{ id: 'm', deg: th, color: MOVE, line: true, len: 1.2, draggable: !done }]} onRay={(_, d) => setLine(d)} view={VIEW_FULL} dark={dark} locked={done} active="m" hideVertex
              under={<g><line x1={-1.3} x2={1.3} y1={-h} y2={-h} stroke={line} strokeWidth={0.026} /><line x1={-1.3} x2={1.3} y1={h} y2={h} stroke={line} strokeWidth={0.026} /></g>}>
              {[1, 2, 3, 4].map((i) => arcFor(i, P1))}
              {[5, 6, 7, 8].map((i) => arcFor(i, P2))}
            </Stage>
          </div>
          {!done && <Turners value={th} set={setLine} steps={[1, 10]} big={age.big} />}
          {!done && <Hint>Pembe keseni sürükle ya da iki parmakla çevir; numaralara dokunarak seç.</Hint>}
        </div>
      }
      panel={
        <>
          <Card title={`1 numaralı açıya eşit olanlar (${found.length}/3)`}>
            <div className="grid grid-cols-4 gap-2">
              {[2, 3, 4, 5, 6, 7, 8].map((i) => <PickBtn key={i} big={age.big} on={found.includes(i) || bad.includes(i)} color={found.includes(i) ? '#16a34a' : '#f59e0b'} onClick={() => pick(i)} disabled={done || found.includes(i)}>{i}</PickBtn>)}
            </div>
            {found.length > 0 && <p className="mt-2 text-sm font-bold text-green-800">{found.map((i) => `1 ile ${i}: ${NAMES[i]}`).join(' · ')}</p>}
          </Card>
          {nudge && <Nudge key={nudge.id} question={nudge.q} misconception={nudge.mis} tool="angle" onClose={() => setNudge(null)} />}
          {done && <Derived>Kesen nasıl dönerse dönsün 1 = 3 = 5 = 7 ve 2 = 4 = 6 = 8. Paralel doğrularda yöndeş açılar eşittir; bu yüzden iki kesişimdeki açılar aynı kalıyor.</Derived>}
          {footer}
        </>
      }
    />
  )
}

// ─── 7. sınıf: açıortay ───────────────────────────────────────────────────

function BisectorRound({ grade, task, onComplete, footer, addSol }: RP & { task: { kind: 'bisector'; angle: number } }) {
  const track = useTracker()
  const age = useAge(grade)
  const dark = age.tier === 'atolye'
  const A = task.angle
  const [r, setR] = useState(25)
  const [tries, setTries] = useState(0)
  const [nudge, setNudge] = useState<NS>(null)
  const [done, setDone] = useState(false)
  const mirror = norm(2 * r)
  const check = () => {
    const ok = Math.abs(r - A / 2) <= 1
    track.attempt(ok)
    if (ok) {
      setR(A / 2)
      setDone(true)
      sfx.ok()
      setNudge(null)
      addSol('aciortay', `Açıortay: ${A}° → ${A / 2}° + ${A / 2}°`)
      track.item(tries === 0)
      onComplete(tries === 0)
      return
    }
    setTries((t) => t + 1)
    setNudge({ q: `Kesikli çizgi, yeşil kolun pembe ışına göre yansıması. Yansıma mavi kolun üstüne oturmalı. Şu an iki parça ${deg(r)} ve ${deg(A - r)}: eşit mi?`, id: Date.now() })
  }
  return (
    <Layout
      top={<Prompt emoji="🪞" color={C}>{`Bu açı **${A}°**. Pembe ışını öyle yerleştir ki açıyı **iki eş açıya** bölsün (açıortay). İpucu: pembe ışını ayna gibi düşün!`}</Prompt>}
      work={
        <div>
          <div style={fitWidth(2.6 / 1.62, 300)}>
            <Stage
              rays={[{ id: 'b', deg: 0, color: dark ? '#5eead4' : BASE, width: 0.03 }, { id: 'a', deg: A, color: '#2563eb', width: 0.03 }, { id: 'mir', deg: mirror, color: '#a3a3a3', dashed: true, width: 0.016, len: 0.95 }, { id: 'm', deg: r, color: MOVE, draggable: !done }]}
              arcs={[{ from: 0, to: r, color: '#0d9488', r: 0.32, label: deg(r) }, { from: r, to: A, color: '#2563eb', r: 0.26, label: deg(A - r) }]}
              onRay={(_, d) => { setR(Math.max(1, Math.min(A - 1, d > 270 ? 1 : d))); setNudge(null) }}
              view={VIEW_HALF}
              dark={dark}
              locked={done}
              active="m"
            />
          </div>
          {!done && <Turners value={r} set={(d) => { setR(Math.max(1, Math.min(A - 1, d > 270 ? 1 : d))); setNudge(null) }} steps={[1, 5]} big={age.big} />}
        </div>
      }
      panel={
        <>
          <Card title="Ölçümler">
            <p className="text-lg font-black">{deg(r)} + {deg(A - r)} = {A}°</p>
          </Card>
          {nudge && <Nudge key={nudge.id} question={nudge.q} tool="angle" onClose={() => setNudge(null)} />}
          {!done && <BigButton onClick={check} className="w-full"><Check size={20} />Kontrol et</BigButton>}
          {done && <Derived>{`Açıortay ${A}° açıyı ${A / 2}° + ${A / 2}° olarak böldü. Açıortaya göre yansıtınca bir kol öbür kolun üstüne oturur: açıortay, açının simetri doğrusudur.`}</Derived>}
          {footer}
        </>
      }
    />
  )
}
