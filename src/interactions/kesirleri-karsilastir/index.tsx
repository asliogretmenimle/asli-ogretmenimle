import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'
import { Check, Lightbulb, Minus, Plus, Scale, Sparkles } from 'lucide-react'
import type { InteractionProps } from '../types'
import { Scene, useAge, useSolutions } from '../../games/kit2'
import { MathText } from '../../components/MathText'
import { ZoomBox } from '../../interactive/ZoomBox'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { Card, Derived, Header, Layout, NextButton, Nudge, useFresh, useSession } from '../kesir-duvari/ortak'
import { buildHint, label, makeTasks, misconceptionFor, OPTIONS, revealQuestion, S_LABEL, strategyNote, truth, val, wrongStrategyQuestion, type Num, type Pick, type SKey, type Task } from './tasks'

/**
 * 39. Kesirleri Karşılaştır
 *  1) Tahmin: hangisi büyük (ya da eşit)?
 *  2) Gerekçe: hangi akıl yürütme işe yarar? (aynı payda, aynı pay, ½, 1’e kalan, birim kesir…)
 *  3) Kanıt: iki kesri AYNI bütün üzerindeki şeritlerde çocuk kendisi kurar; model kararı verir.
 */

const COLORS = { a: '#0d9488', b: '#ea580c' } as const
const SOFT = { a: '#ccfbf1', b: '#ffedd5' } as const

type Phase = 'predict' | 'strategy' | 'build' | 'repick' | 'done'
type Bar = { parts: number; k: number }

export default function KesirleriKarsilastir({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade), [grade])
  const ses = useSession(tasks.length)
  const sol = useSolutions()
  const fresh = useFresh(sol)
  const task = tasks[ses.idx]

  const finish = () => {
    const firsts = ses.firsts.filter(Boolean).length
    const insight =
      grade <= 3
        ? 'Aynı bütünde, bütün ne kadar çok parçaya bölünürse her parça o kadar küçülür. Paydalar aynıysa daha çok parça, daha büyük kesir demektir.'
        : grade === 4
          ? 'Paydalar aynıysa parça sayısına, paylar aynıysa parça büyüklüğüne bakarım. Denk kesirler aynı bütünde aynı yerde biter.'
          : grade === 5
            ? 'Ortak payda bulmadan da karşılaştırabilirim: [[1/2]]’ye göre konum ya da 1’e kalan parçanın büyüklüğü çoğu zaman yeter.'
            : 'Kesir, ondalık ya da tam sayılı yazılsın: önce tam kısma, sonra [[1/2]]’ye ve 1’e uzaklığa bakarak karşılaştırabilirim.'
    onFinish({
      summary: `${tasks.length} karşılaştırmayı modelle kanıtladın; ${firsts} tanesini ilk denemede çözdün ve ${sol.list.length} gerekçe buldun.`,
      insight,
      stars: ses.stars(Math.min(1, Math.max(0, sol.list.length - tasks.length) * 0.5)),
    })
  }

  return (
    <Scene grade={grade}>
      <Header
        icon={<Scale size={22} />}
        color="#0d9488"
        idx={ses.idx}
        total={tasks.length}
        title="Hangisi daha büyük?"
        extra={sol.list.length > 0 ? <span className="chip bg-amber-100 px-3 py-1 text-sm text-amber-900 ring-1 ring-amber-200"><Sparkles size={14} />{sol.list.length} gerekçe</span> : undefined}
      />
      <Round
        key={ses.idx}
        grade={grade}
        task={task}
        addReason={(k) => fresh(`${ses.idx}-${k}`, `${label(task.a)} ↔ ${label(task.b)}: ${S_LABEL[k]}`)}
        onComplete={ses.complete}
        footer={ses.done ? <NextButton isLast={ses.isLast} onNext={ses.next} onFinish={finish} label="Sonraki çift" /> : null}
      />
    </Scene>
  )
}

function Round({ grade, task, onComplete, addReason, footer }: { grade: number; task: Task; onComplete: (first: boolean) => void; addReason: (k: SKey) => void; footer: ReactNode }) {
  const track = useTracker()
  const age = useAge(grade as InteractionProps['grade'])
  const [phase, setPhase] = useState<Phase>('predict')
  const [pred, setPred] = useState<Pick | null>(null)
  const [repick, setRepick] = useState<Pick | null>(null)
  const [reasons, setReasons] = useState<SKey[]>([])
  const [badPick, setBadPick] = useState<SKey | null>(null)
  const [badCount, setBadCount] = useState(0)
  const [bars, setBars] = useState<{ a: Bar; b: Bar }>({ a: { parts: 1, k: 0 }, b: { parts: 1, k: 0 } })
  const [hint, setHint] = useState<'a' | 'b' | null>(null)
  const [overlays, setOverlays] = useState({ half: false, rest: false, unit: false })
  const ok = truth(task)
  const W = Math.max(1, Math.ceil(Math.max(val(task.a), val(task.b)) - 1e-9))
  const built = (q: Num, b: Bar) => b.parts > 0 && b.k * q.d === q.n * b.parts
  const okA = built(task.a, bars.a)
  const okB = built(task.b, bars.b)
  const solved = okA && okB
  const options = OPTIONS[Math.min(6, Math.max(3, grade))]

  const choose = (p: Pick) => {
    if (phase === 'predict') {
      setPred(p)
      const m = misconceptionFor(task, p)
      if (m) track.misconception(m)
      setPhase('strategy')
      return
    }
    if (phase === 'repick') {
      setRepick(p)
      const good = p === ok
      track.attempt(good)
      if (good) {
        setPhase('done')
        sfx.ok()
        track.item(false)
        onComplete(false)
      }
    }
  }

  const pickReason = (k: SKey) => {
    if (reasons.includes(k)) return
    if (task.valid.includes(k)) {
      setReasons((r) => [...r, k])
      setBadPick(null)
      track.strategy(S_LABEL[k])
      addReason(k)
      setOverlays((o) => ({ half: o.half || k === 'yarim', rest: o.rest || k === 'kalan' || k === 'tam', unit: o.unit || k === 'birim' || k === 'esPay' || k === 'esPayda' }))
    } else {
      setBadPick(k)
      setBadCount((c) => c + 1)
      track.hint()
    }
  }

  // Model kurulunca karar
  const decided = useRef(false)
  useEffect(() => {
    if (!solved || phase !== 'build' || decided.current) return
    decided.current = true
    const good = pred === ok
    track.attempt(good)
    if (good) {
      sfx.ok()
      const first = badCount === 0
      track.item(first)
      onComplete(first)
      setPhase('done')
    } else {
      setPhase('repick')
    }
  }, [solved, phase, pred, ok, badCount, track, onComplete])

  const sym = ok === 'eq' ? '=' : ok === 'a' ? '>' : '<'
  const half = (q: Num) => val(q) < 0.5 - 1e-9
  const crossesHalf = val(task.a) !== 0.5 && val(task.b) !== 0.5 && half(task.a) !== half(task.b)
  const chain = (() => {
    if (reasons.includes('yarim') && crossesHalf) {
      const [lo, hi] = val(task.a) < val(task.b) ? [task.a, task.b] : [task.b, task.a]
      return `${label(lo)} < [[1/2]] < ${label(hi)}`
    }
    return `${label(task.a)} ${sym} ${label(task.b)}`
  })()
  const restLine = (() => {
    if (!reasons.includes('kalan') || ok === 'eq') return null
    const r = (q: Num) => {
      const w = Math.ceil(val(q) - 1e-9)
      return { n: w * q.d - q.n, d: q.d }
    }
    const ra = r(task.a)
    const rb = r(task.b)
    const s = ra.n / ra.d > rb.n / rb.d ? '>' : '<'
    return `Kalan parçalar: [[${ra.n}/${ra.d}]] ${s} [[${rb.n}/${rb.d}]]`
  })()

  const cardSize = age.big ? 'text-5xl sm:text-6xl' : 'text-4xl sm:text-5xl'
  const pickable = phase === 'predict' || phase === 'repick'
  const shownPick = phase === 'repick' || phase === 'done' ? (repick ?? pred) : pred

  const cards = (
    <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 sm:gap-3">
      {(['a', 'b'] as const).map((s, i) => {
        const q = task[s]
        const on = shownPick === s
        const winner = phase === 'done' && ok === s
        const card = (
          <button
            key={s}
            type="button"
            data-testid={`pick-${s}`}
            disabled={!pickable}
            onClick={() => choose(s)}
            aria-pressed={on}
            aria-label={`${i === 0 ? 'Birinci' : 'İkinci'} kesir daha büyük`}
            className={`relative flex min-h-28 flex-col items-center justify-center rounded-3xl border-4 bg-white px-2 py-3 font-black transition active:scale-95 disabled:cursor-default ${pickable ? 'hover:-translate-y-0.5 shadow-[0_5px_0_rgba(15,23,42,0.12)]' : ''}`}
            style={{ borderColor: on || winner ? COLORS[s] : `${COLORS[s]}55`, background: on || winner ? SOFT[s] : '#fff', color: COLORS[s] }}
          >
            <span className={`${cardSize} leading-none`}><MathText text={label(q)} /></span>
            <span className="mt-2 text-xs font-extrabold tracking-wide text-ink-soft uppercase">{i === 0 ? 'Üst şerit' : 'Alt şerit'}</span>
            {winner && <span className="absolute -top-3 right-2 rounded-full bg-ok px-2 py-0.5 text-xs text-white shadow">Daha büyük</span>}
          </button>
        )
        if (i === 0) return card
        return [
          <button
            key="eq"
            type="button"
            data-testid="pick-eq"
            disabled={!pickable}
            onClick={() => choose('eq')}
            aria-pressed={shownPick === 'eq'}
            aria-label="İkisi eşit"
            className={`grid min-w-14 place-items-center self-center rounded-2xl px-2 py-3 text-lg font-black ring-2 transition active:scale-95 disabled:cursor-default ${shownPick === 'eq' || (phase === 'done' && ok === 'eq') ? 'bg-ink text-white ring-ink' : 'bg-white text-ink ring-line'}`}
          >
            <span className="text-2xl leading-none">=</span>
            <span className="text-[11px]">Eşit</span>
          </button>,
          card,
        ]
      })}
    </div>
  )

  const intro = (
    <Card className="text-base leading-snug font-extrabold">
      {task.ctx && <p className="mb-1.5"><MathText text={task.ctx} /></p>}
      <p className="text-sm text-ink-soft">
        {phase === 'predict' && 'Önce tahmin et: daha büyük olan kesre dokun (ya da “Eşit”).'}
        {phase === 'strategy' && 'Nasıl düşündün? İşe yarayan bir gerekçe seç. Birden fazla yol bulabilirsin!'}
        {phase === 'build' && 'Kanıtla: her şeridi eş parçalara böl (− / +) ve parçalara dokunarak ya da parmağını kaydırarak boya.'}
        {phase === 'repick' && 'Model kuruldu. Ne gösteriyor? Modele bakıp büyük olan kesre yeniden dokun.'}
        {phase === 'done' && 'Model kararı verdi.'}
      </p>
    </Card>
  )

  const work = (
    <div className="flex flex-col gap-3">
      <div className="lg:hidden">{intro}</div>
      {cards}
      {phase === 'predict' || phase === 'strategy' ? (
        <div className="grid min-h-24 place-items-center rounded-3xl border-2 border-dashed border-teal-300 bg-white/60 p-4 text-center">
          <p className="font-extrabold text-teal-800">⚖️ Kanıt tezgâhı</p>
          <p className="text-sm font-bold text-ink-soft">Önce tahmin et ve gerekçeni seç; sonra iki kesri aynı bütün üzerinde kuracaksın.</p>
        </div>
      ) : (
        <ModelBench task={task} W={W} bars={bars} setBars={setBars} overlays={overlays} setOverlays={setOverlays} solved={solved} locked={phase === 'done' || phase === 'repick'} big={age.big} />
      )}
    </div>
  )

  const panel = (
    <>
      <div className="hidden lg:block">{intro}</div>

      {phase !== 'predict' && (
        <Card title="Gerekçen">
          <div className="flex flex-wrap gap-1.5">
            {options.map((k) => {
              const on = reasons.includes(k)
              const bad = badPick === k
              return (
                <button
                  key={k}
                  type="button"
                  data-testid={`reason-${k}`}
                  onClick={() => pickReason(k)}
                  disabled={on || phase === 'done'}
                  className={`inline-flex min-h-12 items-center gap-1 rounded-xl px-3 text-sm font-extrabold ring-1 transition active:scale-95 disabled:cursor-default ${on ? 'bg-emerald-600 text-white ring-emerald-700' : bad ? 'bg-amber-50 text-amber-900 ring-amber-300' : 'bg-white text-sky-900 ring-sky-200 hover:bg-sky-50'}`}
                >
                  {on && <Check size={15} strokeWidth={3} />}
                  {S_LABEL[k]}
                </button>
              )
            })}
          </div>
          {reasons.length > 0 && (
            <ul className="mt-2 space-y-1">
              {reasons.map((k) => (
                <li key={k} className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900 animate-fade-up"><MathText text={strategyNote(k, task)} /></li>
              ))}
            </ul>
          )}
          {phase === 'strategy' && reasons.length > 0 && reasons.length < task.valid.length && <p className="mt-2 text-xs font-bold text-ink-soft">Başka bir gerekçe de işe yarıyor olabilir!</p>}
          {phase === 'strategy' && reasons.length > 0 && (
            <button type="button" data-testid="go-build" onClick={() => setPhase('build')} className="btn-primary mt-3 w-full">Modelle kanıtla</button>
          )}
        </Card>
      )}

      {badPick && phase === 'strategy' && <Nudge key={badPick + badCount} question={wrongStrategyQuestion(badPick, task)} onClose={() => setBadPick(null)} />}

      {phase === 'build' && !solved && (
        <div className="flex flex-wrap gap-2">
          {!okA && <HintBtn color={COLORS.a} onClick={() => { setHint('a'); track.hint() }}>Üst şerit için ipucu</HintBtn>}
          {!okB && <HintBtn color={COLORS.b} onClick={() => { setHint('b'); track.hint() }}>Alt şerit için ipucu</HintBtn>}
        </div>
      )}
      {phase === 'build' && hint && !(hint === 'a' ? okA : okB) && <Nudge key={hint} question={buildHint(task[hint])} tool="fractions" toolTitle="Kesir şeritleri" onClose={() => setHint(null)} />}

      {phase === 'repick' && (
        <Nudge question={repick && repick !== ok ? 'Şeritlerin sağ uçlarına bak: hangisi daha ileride bitiyor? Aynı yerde biterlerse ne demektir?' : revealQuestion(task, pred ?? 'eq')} tool="fractions" toolTitle="Kesir şeritleri" />
      )}

      {phase === 'done' && (
        <>
          <Derived>
            <span className="block text-2xl"><MathText text={chain} /></span>
            {restLine && <span className="mt-1 block text-base"><MathText text={restLine} /></span>}
            <span className="mt-1 block text-sm font-bold">{ok === 'eq' ? 'İki şerit aynı yerde bitiyor: aynı miktarın iki adı.' : 'Aynı bütünde uzun olan şerit, büyük olan kesir.'}</span>
          </Derived>
          {footer}
        </>
      )}
    </>
  )

  return (
    <div data-testid="round" data-a={`${task.a.n}/${task.a.d}`} data-b={`${task.b.n}/${task.b.d}`} data-valid={task.valid.join(',')} data-truth={ok} data-w={W}>
      <Layout work={work} panel={panel} />
    </div>
  )
}

function HintBtn({ color, onClick, children }: { color: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-extrabold ring-1 ring-line active:scale-95" style={{ color }}>
      <Lightbulb size={16} />{children}
    </button>
  )
}

/* ───────────────────────── Model tezgâhı ───────────────────────── */

const X0 = 34
const REF_Y = 8
const REF_H = 30
const BAR_H = 70
const Y = { a: 74, b: 186 } as const
const VBH = 270

function ModelBench({ task, W, bars, setBars, overlays, setOverlays, solved, locked, big }: {
  task: Task
  W: number
  bars: { a: Bar; b: Bar }
  setBars: (f: (b: { a: Bar; b: Bar }) => { a: Bar; b: Bar }) => void
  overlays: { half: boolean; rest: boolean; unit: boolean }
  setOverlays: (f: (o: { half: boolean; rest: boolean; unit: boolean }) => { half: boolean; rest: boolean; unit: boolean }) => void
  solved: boolean
  locked: boolean
  big: boolean
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setNarrow(el.clientWidth < 560))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // Dar ekranda görünüm kutusu daralır: şeritler ve yazılar büyür
  const VBW = narrow ? 470 : 640
  const LEN = VBW - X0 - 34
  const U = LEN / W
  const xEnd = (b: Bar) => X0 + (U * b.k) / b.parts
  const setBar = (s: 'a' | 'b', b: Bar) => setBars((cur) => ({ ...cur, [s]: b }))
  const ok = (s: 'a' | 'b') => bars[s].k * task[s].d === task[s].n * bars[s].parts
  const xa = xEnd(bars.a)
  const xb = xEnd(bars.b)

  return (
    <div ref={boxRef} className="rounded-3xl bg-white/90 p-2 ring-1 ring-line sm:p-3">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs font-black tracking-wide text-teal-800 uppercase">Aynı bütün, iki şerit</p>
        <div className="flex flex-wrap gap-1.5">
          <Toggle on={overlays.half} onClick={() => setOverlays((o) => ({ ...o, half: !o.half }))}>½ çizgisi</Toggle>
          <Toggle on={overlays.rest} onClick={() => setOverlays((o) => ({ ...o, rest: !o.rest }))}>1’e kalan</Toggle>
          <Toggle on={overlays.unit} onClick={() => setOverlays((o) => ({ ...o, unit: !o.unit }))}>Birim parça</Toggle>
        </div>
      </div>
      <ZoomBox maxScale={4}>
        <div className="pb-10">
        <svg ref={svgRef} viewBox={`0 0 ${VBW} ${VBH}`} width="100%" className="block select-none" role="img" aria-label="Kesir şeritleri modeli">
          <defs>
            <pattern id="kk-stripe" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="10" height="10" fill="#fde68a" />
              <line x1="0" y1="0" x2="0" y2="10" stroke="#f59e0b" strokeWidth="4" />
            </pattern>
          </defs>
          {/* 1 bütün referansı */}
          {Array.from({ length: W }, (_, j) => (
            <g key={j}>
              <rect x={X0 + j * U} y={REF_Y} width={U} height={REF_H} rx={6} fill="#334155" stroke="#fff" strokeWidth={2} />
              <text x={X0 + j * U + U / 2} y={REF_Y + 21} textAnchor="middle" fontSize={15} fontWeight={900} fill="#fff">1 bütün</text>
            </g>
          ))}
          <text x={X0 - 8} y={Y.a + BAR_H / 2 + 6} textAnchor="end" fontSize={16} fontWeight={900} fill={COLORS.a}>A</text>
          <text x={X0 - 8} y={Y.b + BAR_H / 2 + 6} textAnchor="end" fontSize={16} fontWeight={900} fill={COLORS.b}>B</text>

          {/* fark bandı */}
          {solved && Math.abs(xa - xb) > 0.5 && (
            <g className="animate-fade-up">
              <rect x={Math.min(xa, xb)} y={Y.a} width={Math.abs(xa - xb)} height={Y.b + BAR_H - Y.a} fill="url(#kk-stripe)" opacity={0.75} />
              {Math.abs(xa - xb) > 44 && <text x={(xa + xb) / 2} y={(Y.a + BAR_H + Y.b) / 2 + 6} textAnchor="middle" fontSize={15} fontWeight={900} fill="#92400e">fark</text>}
            </g>
          )}

          {(['a', 'b'] as const).map((s) => (
            <BarView key={s} s={s} bar={bars[s]} W={W} U={U} vbw={VBW} svgRef={svgRef} locked={locked} onChange={(b) => setBar(s, b)} overlays={overlays} ok={ok(s)} />
          ))}

          {/* uç çizgileri (karşılaştırma) */}
          {solved && (
            <g>
              <line x1={xa} x2={xa} y1={Y.a + BAR_H + 2} y2={Y.b - 2} stroke={COLORS.a} strokeWidth={3} strokeDasharray="6 5" />
              {Math.abs(xa - xb) > 0.5 && <line x1={xb} x2={xb} y1={Y.a + BAR_H + 2} y2={Y.b - 2} stroke={COLORS.b} strokeWidth={3} strokeDasharray="6 5" />}
            </g>
          )}

          {/* ½ referans çizgileri */}
          {overlays.half &&
            Array.from({ length: W }, (_, j) => {
              const x = X0 + (j + 0.5) * U
              return (
                <g key={`h${j}`} pointerEvents="none">
                  <line x1={x} x2={x} y1={REF_Y + REF_H + 2} y2={VBH - 4} stroke="#7c3aed" strokeWidth={3} strokeDasharray="3 5" strokeLinecap="round" />
                  <rect x={x - 26} y={REF_Y + REF_H + 4} width={52} height={22} rx={11} fill="#7c3aed" />
                  <text x={x} y={REF_Y + REF_H + 20} textAnchor="middle" fontSize={14} fontWeight={900} fill="#fff">{j ? `${j}½` : '½'}</text>
                </g>
              )
            })}
        </svg>
        </div>
      </ZoomBox>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {(['a', 'b'] as const).map((s) => (
          <BarControls key={s} s={s} q={task[s]} bar={bars[s]} W={W} ok={ok(s)} locked={locked} big={big} onParts={(p) => setBar(s, { parts: p, k: 0 })} />
        ))}
      </div>
      <p className="mt-1.5 text-center text-xs font-bold text-ink-soft">Parçalar çok incelirse iki parmakla yakınlaştır.</p>
    </div>
  )
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`min-h-10 rounded-xl px-2.5 text-xs font-extrabold ring-1 transition active:scale-95 ${on ? 'bg-violet-600 text-white ring-violet-700' : 'bg-white text-violet-900 ring-violet-200'}`}>
      {children}
    </button>
  )
}

function BarView({ s, bar, W, U, vbw, svgRef, locked, onChange, overlays, ok }: { s: 'a' | 'b'; bar: Bar; W: number; U: number; vbw: number; svgRef: React.RefObject<SVGSVGElement | null>; locked: boolean; onChange: (b: Bar) => void; overlays: { rest: boolean; unit: boolean }; ok: boolean }) {
  const y = Y[s]
  const pw = U / bar.parts
  const total = bar.parts * W
  const color = COLORS[s]
  const bind = useDrag(
    ({ xy: [cx], tap, first, memo, event }) => {
      if (locked) return memo
      event.stopPropagation?.()
      const r = svgRef.current?.getBoundingClientRect()
      if (!r) return memo
      const vx = ((cx - r.left) / r.width) * vbw
      const k0: number = first ? bar.k : (memo ?? bar.k)
      const i = Math.floor((vx - X0) / pw)
      if (tap) {
        const p = Math.max(0, Math.min(total - 1, i))
        onChange({ ...bar, k: k0 === p + 1 ? p : p + 1 })
      } else {
        onChange({ ...bar, k: vx < X0 ? 0 : Math.max(0, Math.min(total, i + 1)) })
      }
      return k0
    },
    { filterTaps: true },
  )

  const xEnd = X0 + pw * bar.k
  const restTo = X0 + U * Math.ceil(bar.k / bar.parts - 1e-9)
  return (
    <g>
      <g {...bind()} data-handle data-testid={`bar-${s}`} style={{ touchAction: 'none', cursor: locked ? 'default' : 'pointer' }}>
        {Array.from({ length: total }, (_, i) => {
          const on = i < bar.k
          return <rect key={i} x={X0 + i * pw} y={y} width={pw} height={BAR_H} fill={on ? color : '#fff'} fillOpacity={on ? (ok ? 1 : 0.85) : 1} stroke="#1f2340" strokeWidth={1.5} />
        })}
        {/* parça etiketleri */}
        {pw >= 34 &&
          Array.from({ length: total }, (_, i) => (
            <SvgFrac key={`l${i}`} x={X0 + i * pw + pw / 2} y={y + BAR_H / 2} n={1} d={bar.parts} fill={i < bar.k ? '#fff' : '#64748b'} size={pw >= 60 ? 16 : 13} />
          ))}
        {/* bütün sınırları */}
        {Array.from({ length: W + 1 }, (_, j) => (
          <line key={`w${j}`} x1={X0 + j * U} x2={X0 + j * U} y1={y - 4} y2={y + BAR_H + 4} stroke="#1f2340" strokeWidth={4} />
        ))}
        <rect x={X0} y={y} width={U * W} height={BAR_H} fill="none" stroke="#1f2340" strokeWidth={3} rx={2} />
      </g>
      {/* birim parça işareti */}
      {overlays.unit && bar.parts > 1 && (
        <g pointerEvents="none">
          <path d={`M${X0 + 2} ${y - 4} v-8 h${pw - 4} v8`} fill="none" stroke={color} strokeWidth={3} />
          <SvgFrac x={X0 + pw / 2} y={y - 22} n={1} d={bar.parts} fill={color} size={13} bg />
        </g>
      )}
      {/* 1’e kalan */}
      {overlays.rest && bar.k > 0 && restTo - xEnd > 0.5 && (
        <g pointerEvents="none">
          <rect x={xEnd + 2} y={y + 3} width={restTo - xEnd - 4} height={BAR_H - 6} fill="none" stroke="#7c3aed" strokeWidth={3} strokeDasharray="7 5" rx={4} />
          {restTo - xEnd > 40 && <text x={(xEnd + restTo) / 2} y={y + BAR_H + 15} textAnchor="middle" fontSize={12} fontWeight={900} fill="#7c3aed">kalan</text>}
        </g>
      )}
      {ok && (
        <g pointerEvents="none">
          <circle cx={X0 + U * W + 0} cy={y - 2} r={11} fill="#16a34a" stroke="#fff" strokeWidth={2} />
          <path d={`M${X0 + U * W - 5} ${y - 2} l3.5 4 l6 -8`} fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" />
        </g>
      )}
    </g>
  )
}

function SvgFrac({ x, y, n, d, fill, size = 14, bg }: { x: number; y: number; n: number; d: number; fill: string; size?: number; bg?: boolean }) {
  const w = size * (String(d).length > 1 ? 1.4 : 1)
  return (
    <g pointerEvents="none">
      {bg && <rect x={x - w / 2 - 4} y={y - size - 2} width={w + 8} height={size * 2 + 4} rx={5} fill="#fff" />}
      <text x={x} y={y - 3} textAnchor="middle" fontSize={size} fontWeight={900} fill={fill}>{n}</text>
      <line x1={x - w / 2} x2={x + w / 2} y1={y} y2={y} stroke={fill} strokeWidth={1.6} />
      <text x={x} y={y + size - 1} textAnchor="middle" fontSize={size} fontWeight={900} fill={fill}>{d}</text>
    </g>
  )
}

function BarControls({ s, q, bar, W, ok, locked, big, onParts }: { s: 'a' | 'b'; q: Num; bar: Bar; W: number; ok: boolean; locked: boolean; big: boolean; onParts: (p: number) => void }) {
  const color = COLORS[s]
  const btn = `grid ${big ? 'size-14' : 'size-12'} place-items-center rounded-xl bg-white ring-1 ring-line active:scale-95 disabled:opacity-40`
  return (
    <div className="flex items-center gap-2 rounded-2xl p-2 ring-1" style={{ background: SOFT[s], borderColor: color, boxShadow: `inset 0 0 0 1px ${color}44` }}>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black tracking-wide uppercase" style={{ color }}>{s === 'a' ? 'A · Üst şerit' : 'B · Alt şerit'}: <MathText text={label(q)} /></p>
        <p className="text-sm font-extrabold text-ink">
          {W > 1 ? 'Her bütün ' : 'Bütün '}
          <b style={{ color }}>{bar.parts}</b> eş parça · boyalı <MathText text={`[[${bar.k}/${bar.parts}]]`} />
          {ok && <span className="ml-1 text-ok">✓</span>}
        </p>
      </div>
      <button type="button" className={btn} disabled={locked || bar.parts <= 1} onClick={() => onParts(bar.parts - 1)} aria-label={`${s === 'a' ? 'Üst' : 'Alt'} şeritte parça sayısını azalt`} data-testid={`minus-${s}`}>
        <Minus size={20} />
      </button>
      <span className="w-7 text-center text-xl font-black" style={{ color }}>{bar.parts}</span>
      <button type="button" className={btn} disabled={locked || bar.parts >= 12} onClick={() => onParts(bar.parts + 1)} aria-label={`${s === 'a' ? 'Üst' : 'Alt'} şeritte parça sayısını artır`} data-testid={`plus-${s}`}>
        <Plus size={20} />
      </button>
    </div>
  )
}
