import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, ChevronDown, ChevronUp, Droplets, Lightbulb, Pointer, RotateCcw, Send, Trash2 } from 'lucide-react'
import type { Grade } from '../../../data/types'
import { MathText } from '../../../components/MathText'
import { ZoomBox } from '../../../interactive/ZoomBox'
import { useTracker } from '../../../lib/trackerContext'
import { celebrate, sfx } from '../../../lib/feedback'
import { starsFor, type GameProps } from '../../kit'
import { BigButton, LevelDots, Nudge, Scene, SolutionList, StrategyPicker, TaskCard, useSolutions } from '../../kit2'
import { Works } from './art'
import { insightFor, makeLevels, type Ask, type ComposeLevel, type EquivLevel, type FillLevel, type JugLevel, type Level, type OrderLevel } from './levels'
import { ChoicePad, FracPad, NumPad, PanelButton, Stat, useHold, useWater } from './ui'
import { fmt, shortest, simplify, solutionKey, U, type Move, type VesselDef } from './water'

/**
 * Su Mühendisi (3–6. sınıf) — Van de Walle: ölçmede önce karşılaştır ve tahmin et, sonra birimle;
 * kesir bütüne göredir (½ × 4 L = ¼ × 8 L); denk kesirler aynı seviyenin farklı adlarıdır.
 * Kaplar arasında su dökülür (sürükle ya da dokun-dokun), vanayla doldurulur.
 * Farklı geçerli yollar useSolutions ile toplanır:
 *  - compose: her kabın depoya net katkısı (ör. "2 L ×2 + 1 L") — sıra önemsiz
 *  - jug: döngüleri atılmış durum yolundaki aktarma planı (boşuna doldur-boşalt yeni yol sayılmaz)
 *  - equiv: her deponun kesir/yüzde adı
 */

interface Done { first: boolean; ways: number }
type Msg = { text: string; tone: 'ok' | 'think'; mis?: string; tool?: boolean; id: number }

/** **kalın** ve [[a/b]] destekli kısa metin */
function Rich({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return <>{parts.map((p, i) => (i % 2 ? <strong key={i} className="text-sky-700"><MathText text={p} /></strong> : <MathText key={i} text={p} />))}</>
}

export default function SuMuhendisi({ grade, onFinish }: GameProps) {
  const levels = useMemo(() => makeLevels(grade), [grade])
  const [idx, setIdx] = useState(0)
  const [liters, setLiters] = useState(0)
  const stats = useRef({ first: 0, ways: 0 })

  const done = (r: Done) => {
    const s = stats.current
    if (r.first) s.first++
    s.ways += r.ways
    if (idx + 1 < levels.length) {
      setIdx(idx + 1)
      return
    }
    const n = levels.length
    const ratio = Math.min(1, (s.first + 0.5 * (n - s.first)) / n + (s.ways >= 8 ? 0.1 : 0))
    onFinish({
      stars: starsFor(ratio),
      score: s.first * 100 + (n - s.first) * 60 + s.ways * 15,
      summary: `${n} mühendislik görevini bitirdin, ${s.ways} farklı yol ve ad buldun, toplam ${fmt(Math.round(liters), 'dec').replace(' L', '')} L su taşıdın.`,
      insight: insightFor(grade),
    })
  }

  const lv = levels[idx]
  return (
    <div className="select-none">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-3">
          <LevelDots current={idx} total={levels.length} />
          <span className="text-sm font-black text-sky-900">Görev {idx + 1}/{levels.length} · {lv.title}</span>
        </div>
        <span className="chip bg-sky-50 px-3 py-1 text-sm text-sky-900 ring-1 ring-sky-200"><Droplets size={15} />Taşınan su: {fmt(Math.round(liters), 'dec')}</span>
      </div>
      <LevelView key={idx} level={lv} grade={grade} step={idx + 1} total={levels.length} onDone={done} onCarry={(u) => setLiters((l) => l + u)} />
    </div>
  )
}

interface ViewProps {
  level: Level
  grade: Grade
  step: number
  total: number
  onDone: (d: Done) => void
  onCarry: (u: number) => void
}

function LevelView(p: ViewProps) {
  const l = p.level
  if (l.kind === 'fill') return <FillView {...p} level={l} />
  if (l.kind === 'order') return <OrderView {...p} level={l} />
  if (l.kind === 'compose') return <ComposeView {...p} level={l} />
  if (l.kind === 'equiv') return <EquivView {...p} level={l} />
  return <JugView {...p} level={l} />
}

/* ───────────── Ortak çekirdek ───────────── */

function useCore(level: Level, onDone: (d: Done) => void) {
  const track = useTracker()
  const [msg, setMsg] = useState<Msg | null>(null)
  const [hintN, setHintN] = useState(0)
  const [done, setDone] = useState(false)
  const wrong = useRef(0)
  const first = useRef(true)
  const ways = useRef(0)
  const say = (text: string, tone: 'ok' | 'think' = 'think', mis?: string, tool?: boolean) => setMsg({ text, tone, mis, tool, id: Math.random() })
  const fail = (text: string, mis?: string) => {
    wrong.current++
    track.attempt(false)
    sfx.bad()
    say(text, 'think', mis, !!level.tool)
  }
  const complete = (text: string) => {
    if (done) return
    first.current = wrong.current === 0 && hintN === 0
    track.item(first.current)
    setDone(true)
    say(text, 'ok')
    celebrate()
  }
  const hint = () => {
    track.hint()
    say(level.hints[Math.min(hintN, level.hints.length - 1)], 'think', undefined, !!level.tool)
    setHintN((h) => h + 1)
  }
  const next = () => onDone({ first: first.current, ways: ways.current })
  return { msg, say, fail, complete, hint, done, next, ways, track, setMsg }
}
type Core = ReturnType<typeof useCore>

function Frame({ level, grade, step, total, core, scene, controls, after }: { level: Level; grade: Grade; step: number; total: number; core: Core; scene: ReactNode; controls: ReactNode; after?: ReactNode }) {
  const big = grade <= 3
  const [picked, setPicked] = useState(false)
  const task = (
    <TaskCard step={step} total={total}>
      <Rich text={level.prompt} />
    </TaskCard>
  )
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="min-w-0">
        <div className="lg:hidden [&>div]:mb-3">{task}</div>
        <Scene grade={grade} className="!p-1.5 sm:!p-2.5">
          <ZoomBox maxScale={3}>{scene}</ZoomBox>
        </Scene>
        <p className="mt-1.5 text-center text-xs font-bold text-ink-soft">Kabı başka bir kaba sürükle ya da önce kaba, sonra hedefe dokun · iki parmakla yakınlaştır</p>
      </div>
      <aside className="flex min-w-0 flex-col gap-3">
        <div className="hidden lg:block [&>div]:mb-0">{task}</div>
        {controls}
        {core.msg && (
          <Nudge key={core.msg.id} question={core.msg.text} tone={core.msg.tone} misconception={core.msg.mis} tool={core.msg.tool ? level.tool : undefined} toolConfig={level.toolConfig} toolTitle={level.toolTitle} />
        )}
        {after}
        {core.done ? (
          <div className="rounded-2xl bg-ok-soft p-4 ring-1 ring-green-200 animate-fade-up">
            <p className="font-bold text-green-900"><MathText text={level.note} /></p>
            {level.picker && !picked && <StrategyPicker question={level.picker.q} options={level.picker.options} onPick={() => setPicked(true)} />}
            <BigButton onClick={core.next} className="mt-3 w-full">{step < total ? <>Sonraki görev<ArrowRight size={20} /></> : 'Tesisi tamamla 🎉'}</BigButton>
          </div>
        ) : (
          <PanelButton tone="amber" big={big} onClick={core.hint} className="self-start px-4"><Lightbulb size={18} />İpucu</PanelButton>
        )}
      </aside>
    </div>
  )
}

/** Sayısal / kesir / seçenek sorusu */
function AskBox({ ask, big, onOk, onWrong }: { ask: Ask; big: boolean; onOk: () => void; onWrong: (msg: string, mis?: string) => void }) {
  const generic = 'Henüz değil. Kaptaki çizgilere ve kabın büyüklüğüne yeniden bak.'
  return (
    <div className="animate-fade-up">
      <p className="mb-2 text-base font-black"><MathText text={ask.q} /></p>
      {ask.kind === 'choice' && (
        <ChoicePad big={big} options={ask.options} onPick={(i) => (i === ask.answer ? onOk() : onWrong(ask.why[i] || generic))} />
      )}
      {ask.kind === 'frac' && (
        <FracPad
          onSubmit={(n, d) => {
            if (n * ask.answer[1] === d * ask.answer[0]) return onOk()
            const dg = ask.diagnose?.(n, d)
            onWrong(dg?.msg ?? 'Henüz değil. Kap kaç eş parçaya bölünmüş, su kaç parçayı dolduruyor?', dg?.mis)
          }}
        />
      )}
      {(ask.kind === 'num' || ask.kind === 'dec') && (
        <NumPad
          unit={ask.unit}
          prefix={ask.prefix}
          decimal={ask.kind === 'dec'}
          onSubmit={(n) => {
            if (Math.abs(n - ask.answer) < 1e-9) return onOk()
            const dg = ask.diagnose?.(n)
            onWrong(dg?.msg ?? generic, dg?.mis)
          }}
        />
      )}
    </div>
  )
}

/* ───────────── 1) Vanayla doldur ───────────── */

function FillView({ level, grade, step, total, onDone, onCarry }: ViewProps & { level: FillLevel }) {
  const core = useCore(level, onDone)
  const big = grade <= 3
  const init = useMemo(() => [...(level.ref ? [level.ref] : []), { ...level.tank }], [level])
  const w = useWater(init)
  const tank = w.get(level.tank.id)
  const [phase, setPhase] = useState<'work' | 'ask' | 'done'>('work')
  const [usedFine, setUsedFine] = useState(false)
  const [overshoot, setOvershoot] = useState(false)
  const cap = level.tank.cap
  const rate = cap / (grade <= 3 ? 4.5 : 5.5)
  const amtRef = useRef(tank.amt)
  amtRef.current = tank.amt
  const [filling, setFilling] = useHold((dt) => {
    const n = Math.min(cap, amtRef.current + rate * dt)
    if (n > level.target + level.tol * cap) setOvershoot(true)
    w.setAmt(level.tank.id, n)
  })
  const [draining, setDraining] = useHold((dt) => w.setAmt(level.tank.id, Math.max(0, amtRef.current - rate * 0.6 * dt)))
  const fine = (d: number) => {
    setUsedFine(true)
    w.setAmt(level.tank.id, Math.max(0, Math.min(cap, tank.amt + d * cap * 0.02)))
  }

  const deliver = () => {
    const a = tank.amt
    if (Math.abs(a - level.target) <= level.tol * cap) {
      w.setAmt(level.tank.id, level.target)
      core.track.attempt(true)
      onCarry(level.target)
      core.track.strategy(usedFine || overshoot ? 'Yaklaşıp ince ayar yaptı' : 'Tek seferde hedefe doldurdu')
      sfx.ok()
      if (level.ask) {
        setPhase('ask')
        core.say(`Tam isabet! Şimdi çizgiler göründü. ${level.ask.q}`, 'ok')
      } else {
        setPhase('done')
        core.complete('Tam isabet!')
      }
      return
    }
    const dg = level.diagnose?.(a)
    if (dg) return core.fail(dg.msg, dg.mis)
    const over = a > level.target
    core.fail(over ? `Biraz fazla oldu. Hedef: ${level.targetText}. Su o yerin üstünde mi? “Biraz boşalt” ile azaltıp yeniden dene.` : `Henüz az. Hedef: ${level.targetText}. Su o yere ulaştı mı? Biraz daha doldur.`)
  }

  const showMarks = !level.hideMarks || phase !== 'work'
  const scene = (
    <Works
      vessels={w.vs.map((v) => (v.id === level.tank.id ? { ...v, tap: phase === 'work' } : v))}
      amounts={w.amounts}
      anim={w.anim}
      flowing={filling ? [level.tank.id] : []}
      draining={draining ? level.tank.id : undefined}
      drain
      big={big}
      gauge={tank.amt / cap}
      label={`Hedef: ${level.targetText.replace(/\[\[(\d+)\/(\d+)\]\]/g, '$1/$2').replace(/\[\[(\d+) (\d+)\/(\d+)\]\]/g, '$1 $2/$3')}`}
      hideMarks={{ [level.tank.id]: !showMarks }}
      readout={(id) => (id === level.tank.id && phase !== 'work' ? fmt(tank.amt, level.unit) : null)}
      onFaucetHold={(_, on) => phase === 'work' && setFilling(on)}
    />
  )
  const controls = (
    <>
      {phase === 'work' && (
        <div className="flex flex-col gap-2 rounded-2xl bg-white/90 p-3 ring-1 ring-line">
          <p className="text-sm font-black text-sky-900">Vana: basılı tut, bırakınca durur</p>
          <div className="grid grid-cols-2 gap-2">
            <PanelButton tone="sky" big onPointerDown={() => setFilling(true)} onPointerUp={() => setFilling(false)}><Droplets size={20} />Doldur</PanelButton>
            <PanelButton tone="rose" big onPointerDown={() => setDraining(true)} onPointerUp={() => setDraining(false)}><Trash2 size={18} />Biraz boşalt</PanelButton>
            <PanelButton big={big} onClick={() => fine(1)} aria-label="Bir damla ekle"><ChevronUp size={20} />Bir tık</PanelButton>
            <PanelButton big={big} onClick={() => fine(-1)}><ChevronDown size={20} />Bir tık</PanelButton>
          </div>
          <BigButton onClick={deliver} className="w-full"><Send size={19} />Teslim et</BigButton>
        </div>
      )}
      {phase === 'ask' && level.ask && (
        <AskBox
          ask={level.ask}
          big={big}
          onOk={() => {
            core.track.attempt(true)
            setPhase('done')
            core.complete(level.ask!.okText)
          }}
          onWrong={(m, mis) => core.fail(m, mis)}
        />
      )}
    </>
  )
  return <Frame level={level} grade={grade} step={step} total={total} core={core} scene={scene} controls={controls} />
}

/* ───────────── 2) Sırala ───────────── */

function OrderView({ level, grade, step, total, onDone }: ViewProps & { level: OrderLevel }) {
  const core = useCore(level, onDone)
  const big = grade <= 3
  const [round, setRound] = useState(0)
  const [picks, setPicks] = useState<string[]>([])
  const [shown, setShown] = useState(false)
  const R = level.rounds[round]
  const val = (v: VesselDef, by: 'amount' | 'full') => (by === 'amount' ? v.amt : v.amt / v.cap)
  const sortedBy = (by: 'amount' | 'full') => [...level.vessels].sort((a, b) => val(a, by) - val(b, by)).map((v) => v.id)

  const tap = (id: string) => {
    if (core.done) return
    const i = picks.indexOf(id)
    if (i >= 0) setPicks(picks.slice(0, i))
    else setPicks([...picks, id])
  }
  const check = () => {
    const want = sortedBy(R.by)
    if (picks.join() === want.join()) {
      core.track.attempt(true)
      sfx.ok()
      if (round + 1 < level.rounds.length) {
        core.say(R.by === 'full' ? 'Doluluk sırası doğru! Şimdi aynı depoları içlerindeki su miktarına göre sırala. Aynı sıra mı çıkacak?' : 'Doğru! Şimdi diğer ölçüte göre sırala.', 'ok')
        setRound(round + 1)
        setPicks([])
        return
      }
      setShown(true)
      core.complete(level.rounds.length > 1 ? 'İki sıra farklı çıktı! Doluluk kesre, su miktarı ise kesir × kapasiteye bağlı.' : 'Doğru sıra!')
      return
    }
    const other = R.by === 'amount' ? sortedBy('full') : sortedBy('amount')
    const fullOrderAsAmount = picks.join() === other.join() && other.join() !== want.join()
    // ilk yanlış komşu çift
    let a: VesselDef | null = null, b: VesselDef | null = null
    for (let i = 0; i + 1 < picks.length; i++) {
      const x = level.vessels.find((v) => v.id === picks[i])!, y = level.vessels.find((v) => v.id === picks[i + 1])!
      if (val(x, R.by) > val(y, R.by)) {
        a = x
        b = y
        break
      }
    }
    if (fullOrderAsAmount && R.by === 'amount') return core.fail('Bu sıra, depoların ne kadar dolu göründüğüne göre. Ama soru su miktarı! Büyük bir deponun küçük bir kısmı, küçük bir deponun büyük kısmından çok olabilir mi?', 'Doluluk oranını su miktarıyla karıştırdı')
    if (fullOrderAsAmount && R.by === 'full') return core.fail('Bu sıra su miktarına göre. Ama soru doluluk: deponun kaçta kaçı dolu? Boş kalan parçalara bak.', 'Su miktarını doluluk oranıyla karıştırdı')
    if (a && b) {
      core.fail(R.by === 'amount' ? `${a.name} ile ${b.name}: hangisinde daha çok su var? Her birinde kaç litre olduğunu kabın büyüklüğüyle düşün.` : `${a.name} ile ${b.name}: hangisinin daha büyük kısmı dolu? Kaçta kaçının dolu olduğunu yaz ve karşılaştır.`, big && R.by === 'amount' && a.amt / a.cap < b.amt / b.cap ? undefined : undefined)
    } else core.fail('Henüz değil. Sıranı yeniden düşün.')
  }

  const scene = (
    <Works
      vessels={level.vessels}
      amounts={Object.fromEntries(level.vessels.map((v) => [v.id, v.amt]))}
      anim={null}
      big={big}
      gauge={picks.length / level.vessels.length}
      label={R.by === 'amount' ? 'Ölçüt: su miktarı' : 'Ölçüt: doluluk'}
      badges={Object.fromEntries(picks.map((id, i) => [id, String(i + 1)]))}
      readout={(id) => (shown ? fmt(level.vessels.find((v) => v.id === id)!.amt, level.unit) : null)}
      onVessel={tap}
    />
  )
  const controls = (
    <>
      {!core.done && (
        <div className="flex flex-col gap-2 rounded-2xl bg-white/90 p-3 ring-1 ring-line">
          <p className="text-base font-black text-sky-900">{level.rounds.length > 1 ? `${round + 1}. sıralama: ` : ''}{R.q}</p>
          <div className="flex min-h-12 flex-wrap items-center gap-1.5">
            {picks.length === 0 && <span className="flex items-center gap-1.5 text-sm font-bold text-ink-soft"><Pointer size={16} />Kaplara sırayla dokun</span>}
            {picks.map((id, i) => (
              <span key={id} className="chip bg-amber-50 px-3 py-1.5 text-sm text-amber-900 ring-1 ring-amber-200 animate-pop">{i + 1}. {level.vessels.find((v) => v.id === id)!.name}</span>
            ))}
          </div>
          <div className="flex gap-2">
            <PanelButton big={big} onClick={() => setPicks([])} disabled={!picks.length}><RotateCcw size={17} />Sil</PanelButton>
            <BigButton onClick={check} disabled={picks.length < level.vessels.length} className="flex-1">Kontrol et</BigButton>
          </div>
        </div>
      )}
    </>
  )
  const after = shown ? (
    <div className="rounded-2xl bg-white/90 p-3 ring-1 ring-line">
      <p className="mb-1 text-sm font-black">Hesap defteri</p>
      {sortedBy('amount').map((id) => {
        const v = level.vessels.find((q) => q.id === id)!
        return <p key={id} className="flex justify-between gap-2 text-sm font-bold"><span>{v.name}</span><span className="tabular-nums"><MathText text={level.explain(v)} /></span></p>
      })}
    </div>
  ) : null
  return <Frame level={level} grade={grade} step={step} total={total} core={core} scene={scene} controls={controls} after={after} />
}

/* ───────────── Seçme + dökme (dokun-dokun) ortak mantığı ───────────── */

function useSelect() {
  const [sel, setSel] = useState<string | null>(null)
  return { sel, setSel }
}

/* ───────────── 3) Ölçü kaplarıyla oluştur ───────────── */

function ComposeView({ level, grade, step, total, onDone, onCarry }: ViewProps & { level: ComposeLevel }) {
  const core = useCore(level, onDone)
  const sol = useSolutions()
  const big = grade <= 3
  const init = useMemo(() => [level.tank, ...level.cups], [level])
  const w = useWater(init)
  const { sel, setSel } = useSelect()
  const [log, setLog] = useState<{ cup: string; q: number; dir: 1 | -1 }[]>([])
  const seen = useRef(new Set<string>())
  const tankId = level.tank.id
  const tank = w.get(tankId)
  const name = (id: string) => w.get(id).name

  const term = (q: number) => fmt(q, level.unit).replace(/ (L|mL)$/, '')
  const unitSfx = level.unit === 'mL' ? ' mL' : ' L'
  const eq = log.map((t, i) => `${i === 0 ? (t.dir < 0 ? '− ' : '') : t.dir < 0 ? ' − ' : ' + '}${term(t.q)}`).join('') + (log.length ? unitSfx : '')

  const act = (from: string, to: string | 'drain') => {
    if (w.busy || core.done) return
    setSel(null)
    if (to === 'drain') {
      if (from === tankId) return core.say('Depoyu boşaltmak için “Baştan” düğmesini kullan.')
      if (!w.drain(from)) core.say(`${name(from)} zaten boş.`)
      return
    }
    if (from === tankId && !level.allowScoop) return core.say('Bu görevde depodan geri su alınmıyor.')
    if (from !== tankId && to !== tankId) {
      // kaptan kaba aktarma: serbest ama kayda girmez
      const q = w.pour(from, to)
      if (!q) core.say(w.get(from).amt === 0 ? `${name(from)} boş. Önce musluktan doldur.` : `${name(to)} dolu.`)
      return
    }
    const a = w.get(from), b = w.get(to)
    if (a.amt === 0) return core.say(from === tankId ? 'Depo boş.' : `${a.name} boş. Önce musluğuna dokunarak doldur.`)
    if (b.amt >= b.cap) return core.say(`${b.name} dolu.`)
    const q = Math.min(a.amt, b.cap - b.amt)
    w.pour(from, to)
    if (from === tankId) setLog((l) => [...l, { cup: to, q, dir: -1 }])
    else setLog((l) => [...l, { cup: from, q, dir: 1 }])
    if (from !== tankId) onCarry(q)
  }
  const fillCup = (id: string) => {
    if (w.busy || core.done || id === tankId) return
    setSel(null)
    if (!w.fill(id)) core.say(`${name(id)} zaten dolu.`)
  }
  const tapVessel = (id: string) => {
    if (w.busy || core.done) return
    if (sel && sel !== id) return act(sel, id)
    setSel(sel === id ? null : id)
  }
  const resetAll = () => {
    if (w.busy) return
    w.reset(init.map((v) => ({ ...v, amt: 0 })))
    setLog([])
    setSel(null)
  }

  const deliver = () => {
    if (w.busy) return
    if (!log.length) return core.say('Önce bir kabı doldurup depoya dök.')
    if (tank.amt === level.target) {
      // net katkı (kap başına) — sıradan bağımsız anahtar
      const net = new Map<string, number>()
      for (const t of log) net.set(t.cup, (net.get(t.cup) ?? 0) + t.dir * t.q)
      const k = level.cups.map((c) => `${c.id}:${net.get(c.id) ?? 0}`).join('|')
      core.track.attempt(true)
      if (seen.current.has(k)) return core.say('Bu yolu zaten buldun! Kapları farklı biçimde birleştirmeyi dene.')
      seen.current.add(k)
      core.ways.current++
      sol.add(k, `${eq.replace(unitSfx, '')} = ${level.targetText.replace(/ (L|mL)$/, '')}${unitSfx}`)
      const used = new Set(log.map((t) => t.cup))
      if (log.some((t) => t.dir < 0)) core.track.strategy('Fazla koyup geri aldı (çıkarma)')
      else if (used.size === 1) core.track.strategy('Aynı kabı yineledi (birim yineleme)')
      else {
        const caps = log.map((t) => t.q)
        if (caps[0] === Math.max(...caps)) core.track.strategy('Büyük kapla başlayıp küçükle tamamladı')
        else core.track.strategy('Farklı kapları birleştirdi')
      }
      const found = seen.current.size
      if (found >= level.goal) {
        core.complete(`${found} farklı yol! Hepsi tam ${level.targetText}.`)
      } else {
        core.say(`Harika: ${eq} = ${level.targetText}. Şimdi farklı kaplarla başka bir yol bul! Depo boşaltılıyor…`, 'ok')
        setTimeout(() => {
          w.reset(init.map((v) => ({ ...v, amt: 0 })))
          setLog([])
        }, 900)
      }
      return
    }
    const over = tank.amt > level.target
    if (grade <= 3) core.fail(over ? `Akvaryumda ${fmt(tank.amt, level.unit)} var; hedef ${level.targetText}. Ne kadar fazla? Fazlayı bir kapla geri alabilirsin: depoyu boş bir kabın üstüne sürükle.` : `Akvaryumda ${fmt(tank.amt, level.unit)} var. ${level.targetText} için ne kadar daha gerekir?`)
    else core.fail(over ? `Döktüklerini topla: ${eq}. Bu toplam ${level.targetText}’den fazla mı? Fazlayı depodan bir kapla geri alabilirsin.` : `Döktüklerini topla: ${eq}. ${level.targetText} için ne kadar eksik? Hangi kap tam o kadarını tamamlar?`, over ? undefined : undefined)
  }

  const scene = (
    <Works
      vessels={w.vs}
      amounts={w.amounts}
      anim={w.anim}
      selected={sel}
      drain
      big={big}
      gauge={tank.amt / tank.cap}
      label={`Hedef: ${level.targetText.replace(/\[\[(\d+) (\d+)\/(\d+)\]\]/, '$1 $2/$3').replace(/\[\[(\d+)\/(\d+)\]\]/, '$1/$2')}`}
      canDrag={(id) => !core.done && (id !== tankId || level.allowScoop)}
      readout={(id) => (id === tankId && (level.showTotal || core.done) ? fmt(Math.round(w.amounts[id]), level.unit) : null)}
      onVessel={tapVessel}
      onDrop={act}
      onFaucet={fillCup}
      onBackground={() => setSel(null)}
    />
  )
  const selV = sel ? w.get(sel) : null
  const controls = (
    <>
      {!core.done && (
        <div className="flex flex-col gap-2 rounded-2xl bg-white/90 p-3 ring-1 ring-line">
          <p className="text-[11px] font-black tracking-wide text-ink-soft uppercase">Döktüklerin</p>
          <p className="min-h-8 text-xl font-black text-sky-950 tabular-nums">{log.length ? <MathText text={eq} /> : <span className="text-base font-bold text-ink-soft">Henüz bir şey dökmedin.</span>}</p>
          {selV ? (
            <div className="flex flex-wrap gap-2 rounded-xl bg-amber-50 p-2 ring-1 ring-amber-200">
              <span className="w-full text-sm font-black text-amber-900">Seçili: {selV.name}. Hedefe dokun ya da:</span>
              {sel !== tankId && <PanelButton big={big} onClick={() => fillCup(sel!)}><Droplets size={17} />Doldur</PanelButton>}
              {sel !== tankId && <PanelButton big={big} tone="sky" onClick={() => act(sel!, tankId)}>Depoya dök</PanelButton>}
              {sel !== tankId && <PanelButton big={big} tone="rose" onClick={() => act(sel!, 'drain')}><Trash2 size={16} />Boşalt</PanelButton>}
              {sel === tankId && <span className="text-sm font-bold text-amber-900">Geri almak için boş bir kaba dokun.</span>}
            </div>
          ) : (
            <p className="text-sm font-bold text-ink-soft">Musluğa dokun → kap dolar. Kabı depoya sürükle → dökülür.</p>
          )}
          <div className="flex gap-2">
            <PanelButton big={big} onClick={resetAll}><RotateCcw size={17} />Baştan</PanelButton>
            <BigButton onClick={deliver} className="flex-1"><Send size={19} />Teslim et</BigButton>
          </div>
        </div>
      )}
      <SolutionList list={sol.list} goal={level.goal} />
    </>
  )
  return <Frame level={level} grade={grade} step={step} total={total} core={core} scene={scene} controls={controls} />
}

/* ───────────── 4) Aynı su, farklı kaplar ───────────── */

const CHOICES: { label: string; f: [number, number] }[] = [
  { label: 'bütünü', f: [1, 1] },
  { label: 'yarısı', f: [1, 2] },
  { label: 'çeyreği', f: [1, 4] },
  { label: 'üç çeyreği', f: [3, 4] },
]

function EquivView({ level, grade, step, total, onDone, onCarry }: ViewProps & { level: EquivLevel }) {
  const core = useCore(level, onDone)
  const sol = useSolutions()
  const big = grade <= 3
  const init = useMemo(() => [level.source, ...level.tanks], [level])
  const w = useWater(init)
  const { sel, setSel } = useSelect()
  const [pred, setPred] = useState<Record<string, number>>({})
  const [active, setActive] = useState<string | null>(null)
  const [named, setNamed] = useState<Record<string, string>>({})
  const src = level.source.id
  const amount = level.source.cap

  const tankOf = (id: string) => level.tanks.find((t) => t.id === id)!
  const pourInto = (to: string) => {
    if (w.busy || core.done) return
    setSel(null)
    if (active) return core.say(`Önce ${tankOf(active).name} için soruyu cevapla.`)
    if (named[to]) return core.say(`${tankOf(to).name} deposunu zaten adlandırdın. Boş bir depo seç.`)
    if (level.predict && pred[to] === undefined) return core.say(`Önce tahmin et: 3 L’lik… değil, ${fmt(amount, level.unit)} su ${tankOf(to).name} deposunda nereye kadar çıkar? Depoya dokunarak tahmin çizgisini koy.`.replace('3 L’lik… değil, ', ''))
    if (w.get(src).amt < amount) return core.say('Kap dolarken bekle.')
    w.pour(src, to, () => {
      onCarry(amount)
      setActive(to)
      const t = tankOf(to)
      const real = amount / t.cap
      if (level.predict && pred[to] !== undefined) {
        const d = Math.abs(pred[to] - real)
        core.say(d <= 0.05 ? 'Tahminin çok yakındı! Şimdi bu depo kaçta kaç dolu, yaz.' : `Tahminin ${pred[to] > real ? 'yüksek' : 'düşük'} kaldı. Neden olabilir? Şimdi bu deponun ne kadarının dolu olduğunu yaz.`, 'ok')
      } else core.say(`${t.name}: kabın ne kadarı doldu?`, 'ok')
      // kaynak kap musluktan yeniden dolar
      setTimeout(() => w.fill(src), 250)
    })
  }
  const tapVessel = (id: string, frac: number) => {
    if (w.busy || core.done) return
    if (id === src) return setSel(sel === src ? null : src)
    if (sel === src) return pourInto(id)
    if (level.predict && !named[id] && active !== id && w.get(id).amt === 0) {
      setPred((p) => ({ ...p, [id]: Math.round(frac * 100) / 100 }))
      core.say(`Tahmin çizgisi kondu. Şimdi kabı ${tankOf(id).name} deposuna sürükle ya da önce kaba, sonra depoya dokun.`)
      return
    }
    if (!named[id]) setSel(null)
  }

  const answerOk = (t: VesselDef, label: string, typed: string) => {
    core.track.attempt(true)
    setNamed((n) => ({ ...n, [t.id]: label }))
    setActive(null)
    core.ways.current++
    sol.add(t.id, `${t.plate ?? t.name}: ${label}`)
    const count = Object.keys(named).length + 1
    if (count >= level.tanks.length) {
      core.complete(`Hepsi aynı ${fmt(amount, level.unit)} su!`)
    } else core.say(`${typed} Sıradaki boş depoya dök.`, 'ok')
  }
  const answerFrac = (n: number, d: number) => {
    const t = tankOf(active!)
    const div = t.marks?.div ?? 1
    const realN = (amount * div) / t.cap // çizgilere göre pay
    if (n * t.cap === d * amount) {
      const nice = Number.isInteger(realN) ? `[[${realN}/${div}]]` : `[[${n}/${d}]]`
      const [sn, sd] = simplify(n, d)
      const same = d === div
      answerOk(t, same ? nice : `[[${n}/${d}]] = ${nice}`, same ? (sn !== n ? `Doğru: ${nice} = [[${sn}/${sd}]].` : `Doğru: ${nice}.`) : `Doğru! Çizgilere göre adı ${nice}.`)
      return
    }
    if (n * amount === d * t.cap) return core.fail('Pay, dolu kısım; payda bütünün kaç eş parçaya bölündüğü. Hangisini üste yazmalısın?', 'Pay ile paydayı karıştırdı')
    if (d === div - 1 && div > 1) return core.fail('Depodaki çizgileri saydın; ama kaç eş parça var? Parçaları say: en alttan en üste.', 'Çizgileri saydı, parçaları değil')
    if (d === div && n !== realN) return core.fail('Payda doğru: depo o kadar eş parçaya bölünmüş. Su kaç parçayı dolduruyor? Alttan say.')
    core.fail('Henüz değil. Depo kaç eş parçaya bölünmüş? Su kaç parçayı dolduruyor?')
  }
  const answerPct = (n: number) => {
    const t = tankOf(active!)
    const real = Math.round((100 * amount) / t.cap)
    if (n === real) return answerOk(t, `%${real}`, `Doğru: ${fmt(amount, 'dec')}, ${fmt(t.cap, 'dec')}’nin %${real}’${real % 10 === 0 && [10, 30, 90].includes(real) ? 'u' : 'ı'}.`.replace(/’ı\.$/, '’ı.'))
    if (Math.round(n) === Math.round((amount * 100) / U / 10)) return core.fail('Bu sayı litre gibi duruyor. Yüzde, deponun 100 eş parçasından kaçının dolu olduğu. Bir çizgi aralığı %10.', 'Yüzdeyi miktar sandı')
    core.fail(n > real ? 'Biraz fazla. Su kaç çizgi aralığını dolduruyor? Her aralık %10.' : 'Biraz az. Su kaç çizgi aralığını dolduruyor? Her aralık %10.')
  }
  const answerChoice = (i: number) => {
    const t = tankOf(active!)
    const c = CHOICES[i]
    if (c.f[0] * t.cap === c.f[1] * amount) return answerOk(t, c.label, `Evet, ${t.plate ?? t.name} kabının ${c.label} doldu.`)
    core.fail(i === 0 ? 'Kap tamamen dolu mu? Üstte boş yer kaldı mı?' : `Kap kaç eş parçaya bölünmüş? 1 L su kaç parçayı doldurdu?`, i !== 0 && c.f[1] < (t.marks?.div ?? 1) ? 'Parça sayısını dikkate almadı' : undefined)
  }

  const scene = (
    <Works
      vessels={w.vs}
      amounts={w.amounts}
      anim={w.anim}
      selected={sel ?? active}
      big={big}
      gauge={Object.keys(named).length / level.tanks.length}
      label={`${fmt(amount, level.unit)} su`}
      predictions={pred}
      canDrag={(id) => id === src && !core.done}
      dim={(id) => id !== src && !!active && active !== id}
      readout={(id) => (id !== src && named[id] ? named[id].replace(/\[\[(\d+)\/(\d+)\]\]/g, '$1/$2').split(' = ').pop()! : null)}
      onVessel={tapVessel}
      onDrop={(from, to) => from === src && to !== 'drain' && pourInto(to)}
      onBackground={() => setSel(null)}
    />
  )
  const controls = (
    <>
      {!core.done && active && (
        <div className="rounded-2xl bg-white/90 p-3 ring-1 ring-line animate-fade-up">
          <p className="mb-2 text-base font-black text-sky-950">
            {level.answer === 'pct' ? `${tankOf(active).plate} depo yüzde kaç dolu?` : level.answer === 'choice' ? `${tankOf(active).plate ?? ''}: kabın ne kadarı doldu?` : `${tankOf(active).plate} depo kaçta kaçı dolu?`}
          </p>
          {level.answer === 'frac' && <FracPad key={active} onSubmit={answerFrac} />}
          {level.answer === 'pct' && <NumPad key={active} prefix="%" onSubmit={answerPct} />}
          {level.answer === 'choice' && <ChoicePad big={big} options={CHOICES.map((c) => `Kabın ${c.label}`)} onPick={answerChoice} />}
        </div>
      )}
      {!core.done && !active && (
        <div className="rounded-2xl bg-white/90 p-3 text-sm font-bold text-ink-soft ring-1 ring-line">
          {level.predict ? '1) Boş bir depoya dokun: tahmin çizgisi. 2) Kabı o depoya sürükle. 3) Kesri yaz.' : 'Kabı boş bir kaba sürükle ya da önce kaba, sonra hedefe dokun.'}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Stat label="Adlandırılan" value={`${Object.keys(named).length} / ${level.tanks.length}`} tone="blue" />
            <Stat label="Elindeki su" value={fmt(amount, level.unit)} />
          </div>
        </div>
      )}
      <SolutionList list={sol.list} goal={level.tanks.length} />
    </>
  )
  return <Frame level={level} grade={grade} step={step} total={total} core={core} scene={scene} controls={controls} />
}

/* ───────────── 5) Aktarma bulmacası ───────────── */

function JugView({ level, grade, step, total, onDone, onCarry }: ViewProps & { level: JugLevel }) {
  const core = useCore(level, onDone)
  const sol = useSolutions()
  const big = grade <= 3
  const init = useMemo(() => level.vessels.map((v) => ({ ...v })), [level])
  const w = useWater(init)
  const { sel, setSel } = useSelect()
  const ids = level.vessels.map((v) => v.id)
  const caps = level.vessels.map((v) => v.cap)
  const start = level.vessels.map((v) => v.amt)
  const best = useMemo(() => shortest(caps, start, level.vessels.map((v) => !!v.tap), level.drain, level.goal), [level]) // eslint-disable-line react-hooks/exhaustive-deps
  const hist = useRef<{ states: number[][]; moves: Move[] }>({ states: [start], moves: [] })
  const [steps, setSteps] = useState(0)
  const [reached, setReached] = useState(false)
  const [askOpen, setAskOpen] = useState(false)
  const [found, setFound] = useState<{ steps: number; best: boolean }[]>([])
  const seen = useRef(new Set<string>())
  const firstMove = useRef<string | null>(null)

  const record = (m: Move) => {
    const s = applyLocal(m)
    hist.current.states.push(s)
    hist.current.moves.push(m)
    const n = hist.current.moves.length
    setSteps(n)
    if (!firstMove.current) firstMove.current = m.t === 'fill' ? (caps[m.i] === Math.max(...caps) ? 'big' : 'small') : m.t === 'pour' ? (caps[m.i] === Math.max(...caps) ? 'big' : 'small') : null
    return { s, n }
  }
  const applyLocal = (m: Move) => {
    const s = [...hist.current.states[hist.current.states.length - 1]]
    if (m.t === 'fill') s[m.i] = caps[m.i]
    else if (m.t === 'empty') s[m.i] = 0
    else {
      const q = Math.min(s[m.i], caps[m.j] - s[m.j])
      s[m.i] -= q
      s[m.j] += q
    }
    return s
  }
  const after = (s: number[], n: number) => {
    if (!level.goal(s)) return
    setReached(true)
    const k = solutionKey(hist.current.states, hist.current.moves)
    const isBest = n === best
    core.track.attempt(true)
    core.track.strategy(firstMove.current === 'big' ? 'Büyük kaptan başladı' : 'Küçük kaptan başladı')
    const isNew = !seen.current.has(k)
    let list = found
    if (isNew) {
      seen.current.add(k)
      core.ways.current++
      list = [...found, { steps: n, best: isBest }]
      setFound(list)
      sol.add(k, `${n} adım${isBest ? ' ⭐' : ''}`)
    }
    const ways = seen.current.size
    const hasBest = list.some((f) => f.best) || (isBest && !isNew)
    const enough = ways >= level.ways && (!level.needShortest || hasBest)
    if (enough) {
      if (level.ask) {
        setAskOpen(true)
        core.say(`Başardın: ${level.goalText}! ${n} adım${isBest ? ', en kısa yol!' : '.'}`, 'ok')
      } else core.complete(`Başardın: ${level.goalText}! ${n} adım${isBest ? ' — en kısa yol!' : ` (en kısası ${best} adım).`}`)
      return
    }
    if (!isNew) return core.say('Bu planı zaten buldun. Başka bir kaptan başlayarak dene! “Yeni yol”a bas.')
    if (level.needShortest && !isBest) return core.say(`Hedefe ${n} adımda ulaştın. Daha az adımla olur mu? Hangi hamleler gereksizdi? “Yeni yol”a bas ve yeniden planla.`, 'think')
    core.say(`Harika, ${n} adımda buldun! Şimdi başka bir yol bul: “Yeni yol”a bas ve diğer kaptan başla.`, 'ok')
  }

  const act = (from: string, to: string | 'drain') => {
    if (w.busy || core.done || reached) return
    setSel(null)
    const i = ids.indexOf(from)
    if (to === 'drain') {
      if (!level.drain) return core.say('Bu görevde gider yok; su boşa dökülmez.')
      if (w.get(from).amt === 0) return core.say(`${w.get(from).name} zaten boş.`)
      const r = record({ t: 'empty', i })
      w.drain(from, () => after(r.s, r.n))
      return
    }
    const j = ids.indexOf(to)
    const a = w.get(from), b = w.get(to)
    if (a.amt === 0) return core.say(`${a.name} boş.${a.tap ? ' Önce musluğuna dokunarak doldur.' : ''}`)
    if (b.amt >= b.cap) return core.say(`${b.name} dolu, içine su sığmaz.`)
    const r = record({ t: 'pour', i, j })
    w.pour(from, to, (q) => {
      onCarry(q)
      after(r.s, r.n)
    })
  }
  const fillOne = (id: string) => {
    if (w.busy || core.done || reached) return
    setSel(null)
    const v = w.get(id)
    if (!v.tap) return
    if (v.amt >= v.cap) return core.say(`${v.name} zaten dolu.`)
    const r = record({ t: 'fill', i: ids.indexOf(id) })
    w.fill(id, () => after(r.s, r.n))
  }
  const tapVessel = (id: string) => {
    if (w.busy || core.done || reached) return
    if (sel && sel !== id) return act(sel, id)
    setSel(sel === id ? null : id)
  }
  const restart = () => {
    if (w.busy) return
    w.reset(init.map((v) => ({ ...v })))
    hist.current = { states: [start], moves: [] }
    firstMove.current = null
    setSteps(0)
    setReached(false)
    setSel(null)
  }

  const scene = (
    <Works
      vessels={w.vs}
      amounts={w.amounts}
      anim={w.anim}
      selected={sel}
      drain={level.drain}
      big={big}
      gauge={Math.min(1, steps / Math.max(best * 1.5, 1))}
      label={`Hedef: ${level.goalText.replace(/\[\[(\d+)\/(\d+)\]\]/, '$1/$2')}`}
      hideMarks={Object.fromEntries(ids.map((id) => [id, !level.showMarks]))}
      canDrag={() => !core.done && !reached}
      readout={(id) => (reached || core.done ? fmt(Math.round(w.amounts[id]), level.unit) : null)}
      onVessel={tapVessel}
      onDrop={act}
      onFaucet={fillOne}
      onBackground={() => setSel(null)}
    />
  )
  const selV = sel ? w.get(sel) : null
  const controls = (
    <>
      {!core.done && !askOpen && (
        <div className="flex flex-col gap-2 rounded-2xl bg-white/90 p-3 ring-1 ring-line">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Adım" value={String(steps)} tone={level.needShortest ? (steps > best ? 'amber' : 'blue') : 'blue'} />
            <Stat label={level.ways > 1 ? 'Bulunan yol' : 'Hedef'} value={level.ways > 1 ? `${found.length} / ${level.ways}` : <span className="text-base"><MathText text={level.goalText} /></span>} />
          </div>
          {selV && !reached ? (
            <div className="flex flex-wrap gap-2 rounded-xl bg-amber-50 p-2 ring-1 ring-amber-200">
              <span className="w-full text-sm font-black text-amber-900">Seçili: {selV.name}. Dökeceğin kaba dokun ya da:</span>
              {selV.tap && <PanelButton big={big} onClick={() => fillOne(sel!)}><Droplets size={17} />Doldur</PanelButton>}
              {ids.filter((x) => x !== sel).map((x) => (
                <PanelButton key={x} big={big} tone="sky" onClick={() => act(sel!, x)}>{w.get(x).name}’a dök</PanelButton>
              ))}
              {level.drain && <PanelButton big={big} tone="rose" onClick={() => act(sel!, 'drain')}><Trash2 size={16} />Boşalt</PanelButton>}
            </div>
          ) : !reached ? (
            <p className="text-sm font-bold text-ink-soft">{level.vessels.some((v) => v.tap) ? 'Musluk → doldur · kabı kaba sürükle → dök · gidere sürükle → boşalt' : 'Kabı başka bir kaba sürükle → dök. Kap boşalana ya da öteki dolana kadar akar.'}</p>
          ) : null}
          <PanelButton big={big} tone={reached ? 'sky' : 'white'} onClick={restart}><RotateCcw size={17} />{reached ? 'Yeni yol' : 'Baştan'}</PanelButton>
        </div>
      )}
      {askOpen && level.ask && !core.done && (
        <AskBox
          ask={level.ask}
          big={big}
          onOk={() => {
            core.track.attempt(true)
            core.complete(level.ask!.okText)
          }}
          onWrong={(m, mis) => core.fail(m, mis)}
        />
      )}
      <SolutionList list={sol.list} goal={level.ways > 1 ? level.ways : undefined} />
    </>
  )
  return <Frame level={level} grade={grade} step={step} total={total} core={core} scene={scene} controls={controls} />
}

// Kullanılmayan uyarısını önlemek için (gelecekteki görev türleri)
export const _internal = { useEffect }
