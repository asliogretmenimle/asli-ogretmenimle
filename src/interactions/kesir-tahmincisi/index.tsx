import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronLeft, ChevronRight, Crosshair, Lightbulb, Plus, Target as TargetIcon, ZoomIn } from 'lucide-react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { Plane } from '../../interactive/Plane'
import { BigButton, Scene, SolutionList, StrategyPicker, useAge, useSolutions } from '../../games/kit2'
import { MathText } from '../../components/MathText'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { Card, Derived, Header, Layout, NextButton, Nudge, PickBtn, dec, fr, gcd, mixed, useFresh, useSession } from '../kesir-duvari/ortak'
import { Band, Benchmarks, Dart, DReporter, Found, Line, RINGS, Target } from './line'
import { label, makeRounds, val, type Num, type OpenRound, type PlaceRound } from './rounds'

/**
 * 38. Kesir Tahmincisi — “Kesir Dartı”
 * 1) Tahmin: yalnızca 0 ve 1’in işaretli olduğu doğruya dartı at (sürükle ya da dokun).
 * 2) Nasıl tahmin ettin? (referans noktası stratejisi rapora yazılır)
 * 3) Kesinleştir: doğruyu eş parçalara böl (10’a bölünce yakınlaştırdıkça yüzde birler, binde birler belirir),
 *    dartı tam yerine taşı. Gerçek nokta hedef halkalarıyla açılır; ilk tahminin uzaklığı parça cinsinden söylenir.
 * Son görev açık uçlu: bir aralığa düşen farklı kesirleri bul (yoğunluk / denklik).
 */

const TEAL = '#0d9488'
const DART = '#db2777'
const EPS = 1e-7

type Acc = 0 | 1 | 2 | 3
const accOf = (dist: number): Acc => (dist <= RINGS[0] ? 3 : dist <= RINGS[1] ? 2 : dist <= RINGS[2] ? 1 : 0)
const accText = ['Bir dahakine daha yakın!', 'Yakın', 'Çok yakın', 'Tam isabet']
const accIcon = ['⚪', '🟡', '🟠', '🎯']

type Done = { first: boolean; acc?: Acc; found?: number; lbl?: string; est?: number; v?: number; max?: number }

export default function KesirTahmincisi({ grade, onFinish }: InteractionProps) {
  const rounds = useMemo(() => makeRounds(grade), [grade])
  const S = useSession(rounds.length)
  const [log, setLog] = useState<Done[]>([])
  const sol = useSolutions()
  const r = rounds[S.idx]

  const onDone = useCallback(
    (d: Done) => {
      setLog((l) => [...l, d])
      S.complete(d.first)
    },
    [S],
  )

  const finish = () => {
    const accs = log.filter((d) => d.acc !== undefined).map((d) => d.acc as Acc)
    const close = accs.filter((a) => a >= 2).length
    const found = sol.list.length
    const insight =
      grade <= 3
        ? 'Bütünü eş parçalara bölünce her parça bir birim kesir olur. Parça sayısı arttıkça parçalar küçülür; [[1/2]] ise her zaman tam ortadadır.'
        : grade === 4
          ? 'Bir kesrin sayı doğrusunda tek bir yeri vardır. Pay paydadan büyükse kesir 1’i geçer: [[5/4]] ile [[1 1/4]] aynı noktadır.'
          : grade === 5
            ? '0, [[1/2]] ve 1 gibi referans noktaları tahmini kolaylaştırır. Aynı noktanın birçok adı vardır: 0,25 = [[1/4]] = [[25/100]].'
            : 'Kesirler ve ondalıklar aynı sayı doğrusunda yaşar. Yakınlaştırdıkça onda birler yüzde birlere, yüzde birler binde birlere bölünür; iki sayı arasında hep başka sayılar vardır.'
    onFinish({
      stars: S.stars(Math.min(1, close * 0.2)),
      summary: `${accs.length} sayının yerini tahmin ettin; ${close} tahminin hedefe çok yakındı${found ? `. Aralıkta ${found} farklı sayı buldun` : ''}.`,
      insight,
    })
  }

  const history = (
    <span className="flex items-center gap-0.5 text-lg" aria-label="Tahmin karnesi">
      {log.map((d, i) => d.acc !== undefined && <span key={i} title={accText[d.acc]}>{accIcon[d.acc]}</span>)}
    </span>
  )

  return (
    <Scene grade={grade}>
      <Header icon={<TargetIcon size={24} />} color={TEAL} idx={S.idx} total={rounds.length} title={r.kind === 'place' ? `${label(r.target)} nerede?` : 'Aralıkta sayı avı'} extra={history} />
      {r.kind === 'place' ? (
        <PlaceView key={S.idx} r={r} grade={grade} onDone={onDone} history={<Karne log={log} />} footer={S.done && <NextButton isLast={S.isLast} onNext={S.next} onFinish={finish} />} />
      ) : (
        <OpenView key={S.idx} r={r} grade={grade} sol={sol} onDone={onDone} history={<Karne log={log} />} footer={S.done && <NextButton isLast={S.isLast} onNext={S.next} onFinish={finish} />} />
      )}
    </Scene>
  )
}

/* ───────────────────────── ortak ───────────────────────── */

const clampX = (x: number, max: number) => Math.max(0, Math.min(max, x))

/** Dartın konumu + etkin bölme (D) ile yapışma */
function useDart(max: number, start: number) {
  const [x, setX] = useState(start)
  const [den, setDen] = useState(0)
  const [D, setDState] = useState(0)
  const Dref = useRef(0)
  const onD = useCallback((d: number) => {
    Dref.current = d
    setDState(d)
  }, [])
  const snapX = useCallback(
    (raw: number, snap: boolean) => {
      const v = clampX(raw, max)
      const d = Dref.current
      if (snap && d) return Math.round(v * d) / d
      return Math.round(v * 1000) / 1000
    },
    [max],
  )
  const nudge = (dir: 1 | -1, snap: boolean) => {
    const d = snap ? Dref.current : 0
    const step = d ? 1 / d : max / 100
    setX((c) => (d ? clampX(Math.round((c + dir * step) * d) / d, max) : clampX(Math.round((c + dir * step) * 1000) / 1000, max)))
  }
  /** Dartın çevresine yakınlaştırma (Plane yeniden kurulur); null = tüm doğru */
  const [focus, setFocus] = useState<{ c: number; span: number } | null>(null)
  return { x, setX, den, setDen, D, onD, snapX, nudge, Dref, focus, setFocus }
}

function NumberLine({ max, children, onTap, den, onD, focus, locked }: { max: number; children: ReactNode; onTap: (x: number) => void; den: number; onD: (D: number) => void; focus: { c: number; span: number } | null; locked?: boolean }) {
  const pad = 0.06 * max + 0.05
  const initial = focus ? { xMin: focus.c - focus.span / 2, xMax: focus.c + focus.span / 2, yMin: -1, yMax: 1 } : { xMin: -pad, xMax: max + pad, yMin: -1, yMax: 1 }
  return (
    <div data-testid="line">
      <Plane key={focus ? `${focus.c}:${focus.span}` : 'all'} mode="x" axes={false} grid={false} labels={false} initial={initial} locked={locked} minSpan={0.02} maxSpan={max * 3} onTap={(p) => onTap(p.x)} label="Kesir sayı doğrusu">
        <DReporter den={den} onD={onD} />
        {children}
      </Plane>
    </div>
  )
}

function Partition({ dens, den, setDen, D, grade, big }: { dens: number[]; den: number; setDen: (d: number) => void; D: number; grade: Grade; big: boolean }) {
  const cls = big ? 'min-h-14 min-w-14' : ''
  return (
    <Card title="Doğruyu eş parçalara böl">
      <div className="flex flex-wrap gap-1.5">
        <PickBtn on={!den} onClick={() => setDen(0)} className={`${cls} text-base`} color={TEAL}>Yok</PickBtn>
        {dens.map((d) => <PickBtn key={d} on={den === d} onClick={() => setDen(d)} className={cls} color={TEAL} label={`Her bütünü ${d} eş parçaya böl`}>{d}</PickBtn>)}
      </div>
      {!!den && (
        <p className="mt-2 text-sm font-bold text-ink-soft">
          {D === 0 ? 'Çentikler çok sık; yakınlaştır.' : (
            <>Her bütün <b className="text-teal-700">{D}</b> eş parça, her parça <MathText text={grade >= 5 && D >= 100 ? dec(1 / D) : fr(1, D)} />.
              {den === 10 && (D === 10 ? ' İki parmakla yakınlaştırınca onda birler de ona bölünür.' : D === 100 ? ' Şimdi yüzde birleri görüyorsun.' : ' Şimdi binde birleri görüyorsun.')}</>
          )}
        </p>
      )}
    </Card>
  )
}

/** Dartın çevresine yakınlaştır (tablette iki parmakla da olur) */
function ZoomCard({ dart, deep }: { dart: ReturnType<typeof useDart>; deep: boolean }) {
  const f = dart.focus
  const at = (span: number) => dart.setFocus({ c: Math.round(dart.x * 1000) / 1000, span })
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-auto text-xs font-black tracking-wide text-ink-soft uppercase">Dartın çevresi</span>
      <PickBtn on={f?.span === 0.3} onClick={() => at(0.3)} className="text-base" color={TEAL} label="Dartın çevresine 10 kat yakınlaştır"><span className="inline-flex items-center gap-1"><ZoomIn size={18} />×10</span></PickBtn>
      {deep && <PickBtn on={f?.span === 0.03} onClick={() => at(0.03)} className="text-base" color={TEAL} label="Dartın çevresine 100 kat yakınlaştır"><span className="inline-flex items-center gap-1"><ZoomIn size={18} />×100</span></PickBtn>}
      <PickBtn on={!f} onClick={() => dart.setFocus(null)} className="text-base" color={TEAL} label="Tüm doğruyu gör">Tümü</PickBtn>
    </div>
  )
}

function FineMove({ onMove, label: lbl }: { onMove: (dir: 1 | -1) => void; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onMove(-1)} className="grid size-12 place-items-center rounded-xl bg-white ring-1 ring-line active:scale-95" aria-label="Dartı sola kaydır"><ChevronLeft size={22} /></button>
      <span className="flex-1 text-center text-xs font-bold text-ink-soft">{lbl}</span>
      <button type="button" onClick={() => onMove(1)} className="grid size-12 place-items-center rounded-xl bg-white ring-1 ring-line active:scale-95" aria-label="Dartı sağa kaydır"><ChevronRight size={22} /></button>
    </div>
  )
}

/** Hedef sayı kartı */
function NumberCard({ n, story }: { n: Num; story?: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white/95 p-3 ring-1 ring-line">
      <span className="grid min-w-20 place-items-center rounded-2xl bg-teal-50 px-3 py-2 text-4xl font-black text-teal-800 ring-2 ring-teal-200" data-testid="target-number"><MathText text={label(n)} /></span>
      {story && <p className="text-[15px] leading-snug font-bold text-ink-soft"><MathText text={story} /></p>}
    </div>
  )
}

/** Bir noktanın D’ye göre adı: k/D, sadeleşmiş hâli */
function nameAt(x: number, D: number) {
  if (!D) return null
  const k = Math.round(x * D)
  if (Math.abs(k / D - x) > EPS) return null
  return { k, D }
}

/** Kavram yanılgısı tespiti (yanlış yerleştirme ya da uzak tahmin) */
function misread(t: Num, x: number, den: number): string | null {
  const v = val(t)
  const near = (a: number, tol = 0.02) => Math.abs(x - a) <= tol && Math.abs(a - v) > 0.05
  if (t.kind !== 'dec') {
    if (t.n > 1 && near(t.n, 0.06)) return 'Payı sayı doğrusunda konum sanma (pay kadar ileri gitme)'
    if (t.n !== t.d && near(t.d / t.n, 0.03)) return 'Pay ile paydanın rolünü karıştırma'
    if (v > 1 && near(v - Math.floor(v), 0.03)) return 'Tam sayılı / bileşik kesirde tam kısmı yok sayma'
    if (den && den !== t.d && near(t.n / den, 0.001) && den % t.d !== 0) return 'Bütünü paydadan farklı sayıda parçaya bölüp pay kadar sayma'
  } else {
    if (near(v * 10, 0.03) || near(v / 10, 0.004)) return 'Ondalık basamak yanılgısı (onda birler ile yüzde birleri karıştırma)'
    // 0,125’i 0,8 sanmak gibi: “uzun ondalık daha büyüktür” → hedefin çok sağına yerleştirme
    if (t.d >= 100 && v < 1 && x > v + 0.3 && x < 1) return 'Ondalık basamak yanılgısı (basamak sayısı arttıkça sayıyı büyük sanma)'
  }
  return null
}

/* ───────────────────────── yerleştirme görevi ───────────────────────── */

function PlaceView({ r, grade, onDone, footer, history }: { r: PlaceRound; grade: Grade; onDone: (d: Done) => void; footer: ReactNode; history: ReactNode }) {
  const track = useTracker()
  const age = useAge(grade)
  const v = val(r.target)
  const t = r.target
  const lbl = label(t)
  const dart = useDart(r.max, 0)
  const [phase, setPhase] = useState<'estimate' | 'strategy' | 'refine' | 'reveal'>('estimate')
  const [moved, setMoved] = useState(false)
  const [est, setEst] = useState<number | null>(null)
  const [nudge, setNudge] = useState<{ q: string; mis?: string; n: number } | null>(null)
  const [hint, setHint] = useState(0)
  const first = useRef(true)
  const logged = useRef(new Set<string>())
  const snap = phase === 'refine'

  const place = (raw: number) => {
    if (phase !== 'estimate' && phase !== 'refine') return
    dart.setX(dart.snapX(raw, snap))
    setMoved(true)
    setNudge(null)
  }

  const logMis = (m: string | null) => {
    if (!m || logged.current.has(m)) return undefined
    logged.current.add(m)
    return m
  }

  const dropEstimate = () => {
    setEst(dart.x)
    setPhase('strategy')
    sfx.ok()
    // otomatik strateji çıkarımı: tahmin bir referans noktasının hemen yanında ve hedef de oraya yakınsa
    const marks: number[] = []
    for (let w = 0; w <= r.max; w += 0.5) marks.push(w)
    const b = marks.find((m) => Math.abs(dart.x - m) <= 0.04 && Math.abs(v - m) <= 0.15 && Math.abs(v - m) > EPS)
    if (b !== undefined) track.strategy('Referans noktasına göre tahmin (hamleden)')
    const m = misread(t, dart.x, 0)
    if (m && !logged.current.has(m)) {
      logged.current.add(m)
      track.misconception(m)
    }
  }

  const options = useMemo(() => {
    const o = ['½’ye göre düşündüm', '0’a ya da 1’e yakınlığına baktım', 'Kafamda eş parçalara böldüm']
    if (v > 1) o.push('Önce tam kısmı buldum')
    if (t.kind === 'dec') o.push('Ondalığı kesre çevirdim')
    else if (grade >= 5 && v < 1) o.push('1’e kalan parçaya baktım')
    o.push('Şöyle bir tahmin ettim')
    return o
  }, [v, t.kind, grade])

  const check = () => {
    const ok = Math.abs(dart.x - v) < EPS
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      setNudge(null)
      setPhase('reveal')
      const dist = Math.abs((est ?? 0) - v)
      const acc = accOf(dist)
      onDone({ first: first.current, acc, lbl, est: est ?? 0, v, max: r.max })
      track.item(first.current)
      const nm = nameAt(dart.x, dart.D)
      if (nm && t.kind !== 'dec' && nm.D !== t.d) track.strategy('Denk kesirle yerleştirme')
      if (dart.den === 10 && dart.D >= 100) track.strategy('Yakınlaştırarak parçaları bölme')
      return
    }
    first.current = false
    sfx.bad()
    const D = dart.D
    const mis = logMis(misread(t, dart.x, dart.den))
    let q: string
    if (!D) q = 'Tam yeri bulmak için doğruyu eş parçalara böl. Bu sayı için her bütün kaç eş parçaya bölünebilir?'
    else if (Math.abs(v * D - Math.round(v * D)) > 1e-6) {
      q = t.kind === 'dec'
        ? D === 10
          ? `Bu çentikler onda birler. ${lbl} kaç onda bir, kaç yüzde bir? Yüzde birleri görmek için yakınlaştır: iki parmakla ya da ×10 düğmesiyle.`
          : `Bu çentikler yüzde birler. ${lbl} için daha da yakınlaştır (×100): binde birler belirsin.`
        : `Her bütünü ${D} eş parçaya böldün. Hedef sayı bu çentiklerden birine düşüyor mu? Paydaya bak: bütün kaç eş parçaya bölünmeli?`
    } else {
      const unit = grade >= 5 && t.kind === 'dec' ? dec(1 / D) : fr(1, D)
      const need = Math.round(v * D)
      const w = Math.floor(v)
      q = w >= 1
        ? `Önce ${w} tamı geç. Sonra kaç tane ${unit} parçası daha gerekir? Her tam ${D} parça.`
        : `Her parça ${unit}. Hedef sayı kaç tane ${unit} eder? 0’dan başlayarak parçaları say.`
      if (dart.x > v && Math.abs(dart.x - v) * D < 1.5) q = `Çok yaklaştın! Dart bir parça fazla gitmiş olabilir mi? Hedef sayı ${need} tane ${unit}.`
      if (dart.x < v && Math.abs(dart.x - v) * D < 1.5) q = `Çok yaklaştın! Bir parça daha ileri mi? Hedef sayı ${need} tane ${unit}.`
    }
    if (mis?.startsWith('Payı')) q = `Dart ${t.n} noktasına yakın. Ama hedef sayı ${t.n} tam mı? Pay ve payda bize neyi anlatır?`
    setNudge({ q, mis, n: (nudge?.n ?? 0) + 1 })
  }

  const askHint = () => {
    track.hint()
    first.current = false
    setHint((h) => h + 1)
  }

  const dist = est === null ? 0 : Math.abs(est - v)
  const acc = accOf(dist)
  const unitStep = t.kind === 'dec' ? (Math.abs(v * 10 - Math.round(v * 10)) < 1e-9 || dist >= 0.05 ? 0.1 : v * 100 === Math.round(v * 100) ? 0.01 : 0.001) : 1 / t.d
  const units = Math.round(dist / unitStep)
  const unitText = t.kind === 'dec' ? dec(unitStep) : fr(1, t.d)
  const nm = phase === 'reveal' ? nameAt(dart.x, dart.D) : null

  const names: string[] = [lbl]
  if (nm) {
    const g = gcd(nm.k, nm.D) || 1
    const a = fr(nm.k, nm.D)
    if (!names.includes(a)) names.push(a)
    if (t.kind !== 'dec' && g > 1 && fr(nm.k / g, nm.D / g) !== lbl) names.push(fr(nm.k / g, nm.D / g))
  }
  if (t.kind === 'dec' && !names.includes(fr(t.n, t.d))) names.push(fr(t.n, t.d))
  if (t.kind === 'mixed' && !names.includes(fr(t.n, t.d))) names.push(fr(t.n, t.d))
  if (t.kind === 'frac' && v > 1) names.push(mixed(t.n, t.d))
  if (grade >= 6 && t.kind !== 'dec') names.push(Number.isInteger(v * 1000) ? dec(v) : `≈ ${dec(v, 2)}`)

  const work = (
    <div className="flex flex-col gap-3">
      <NumberLine max={r.max} den={phase === 'refine' || phase === 'reveal' ? dart.den : 0} onD={dart.onD} onTap={place} focus={phase === 'estimate' ? null : dart.focus} locked={phase === 'estimate' || phase === 'strategy'}>
        <Line max={r.max} D={phase === 'refine' || phase === 'reveal' ? dart.D : 0} grade={grade} tenthLabels={phase !== 'estimate'} />
        {(hint > 0 || phase === 'reveal') && !(dart.den === 10 && dart.D >= 100) && <Benchmarks max={r.max} skip={phase === 'reveal' ? v : undefined} />}
        {phase === 'reveal' && <Target x={v} text={lbl} />}
        {est !== null && phase !== 'strategy' && <Dart x={est} color="#64748b" tag="tahmin" />}
        {phase === 'reveal' ? null : <Dart x={dart.x} color={DART} onMove={phase === 'estimate' || phase === 'refine' ? place : undefined} />}
      </NumberLine>
      <p className="rounded-2xl bg-white/80 px-3 py-2 text-center text-sm font-bold text-ink-soft ring-1 ring-line">
        {phase === 'estimate' && <>🎯 Dartı sürükle ya da doğruya dokun. Yalnızca {r.max === 1 ? '0 ve 1' : r.max === 2 ? '0, 1 ve 2' : '0, 1, 2 ve 3'} belli; hesaplamadan tahmin et!</>}
        {phase === 'strategy' && <>Tahminin işaretlendi. Nasıl düşündüğünü seç.</>}
        {phase === 'refine' && <>Gri dart ilk tahminin. Pembe dartı çentiklere yapıştırarak tam yere taşı. İki parmakla yakınlaştırabilirsin.</>}
        {phase === 'reveal' && <>Yeşil nokta gerçek yer, halkalar hedef bölgeleri. Gri dart ilk tahminin.</>}
      </p>
      {phase === 'reveal' && (
        <div className="flex items-center gap-3 rounded-2xl bg-white/95 p-3 ring-1 ring-line animate-fade-up" data-testid="accuracy">
          <span className="text-4xl" aria-hidden>{accIcon[acc]}</span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black text-ink">{accText[acc]}</p>
            <Meter dist={dist} />
          </div>
        </div>
      )}
      <div className="hidden lg:block">{history}</div>
    </div>
  )

  const panel = (
    <>
      <NumberCard n={t} story={phase === 'estimate' || phase === 'strategy' ? r.story : undefined} />
      {phase === 'estimate' && (
        <>
          <Card title="1. Tahmin et">
            <FineMove onMove={(d) => { dart.nudge(d, false); setMoved(true) }} label="Hassas ayar" />
          </Card>
          <BigButton onClick={dropEstimate} disabled={!moved} className="w-full"><Crosshair size={20} />Tahminimi bırak</BigButton>
        </>
      )}
      {phase === 'strategy' && (
        <StrategyPicker question="Nasıl tahmin ettin?" options={options} onPick={() => setTimeout(() => setPhase('refine'), 350)} />
      )}
      {phase === 'refine' && (
        <>
          <Partition dens={r.dens} den={dart.den} setDen={(d) => { dart.setDen(d); setNudge(null); setTimeout(() => dart.setX((x) => (dart.Dref.current ? Math.round(x * dart.Dref.current) / dart.Dref.current : x)), 0) }} D={dart.D} grade={grade} big={age.big} />
          <Card title="2. Kesinleştir">
            <FineMove onMove={(d) => { dart.nudge(d, true); setNudge(null) }} label={dart.D ? 'Bir parça kaydır' : 'Hassas ayar'} />
            {grade >= 5 && <div className="mt-2 border-t border-line pt-2"><ZoomCard dart={dart} deep={grade >= 6} /></div>}
          </Card>
          <div className="flex gap-2">
            <BigButton onClick={check} className="flex-1"><Check size={20} />Kontrol et</BigButton>
            <button type="button" onClick={askHint} className="grid min-h-14 min-w-14 place-items-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-200 active:scale-95" aria-label="İpucu"><Lightbulb size={22} /></button>
          </div>
          {hint > 0 && (
            <Nudge question={hint === 1 ? 'Turuncu çizgiler [[1/2]] noktalarını gösteriyor. Hedef sayı [[1/2]]’den büyük mü, küçük mü?' : t.kind === 'dec' ? 'Doğruyu 10 eş parçaya böl, sonra iki parmakla yakınlaştır. Kaç onda bir, kaç yüzde bir gerekiyor?' : `Paydaya bak: her bütünü ${t.d} eş parçaya bölmeyi dene.`} onClose={() => setHint(0)} />
          )}
          {nudge && <Nudge key={nudge.n} question={nudge.q} misconception={nudge.mis} tool="kesirdogrusu" toolConfig={{ min: 0, max: r.max, dens: r.dens }} toolTitle="Kesir sayı doğrusu" />}
        </>
      )}
      {phase === 'reveal' && (
        <>
          <Derived>
            <span className="mb-1 block text-xs font-black tracking-wide text-green-700 uppercase">Bu noktanın adları</span>
            <span className="flex flex-wrap items-center gap-x-2">{names.map((n, i) => <span key={n} className="inline-flex items-center gap-2">{i > 0 && <span>=</span>}<MathText text={n} /></span>)}</span>
          </Derived>
          <Card title="Tahminin ne kadar uzaktaydı?">
            <p className="text-[15px] font-bold text-ink">
              {units === 0 ? <>Aradaki mesafe bir tane <MathText text={unitText} /> parçasından bile kısa!</> : <>Aradaki mesafe yaklaşık <b>{units}</b> tane <MathText text={unitText} /> parçası{grade >= 5 && t.kind !== 'dec' ? <> (≈ {dec(dist, 2)})</> : null}.</>}
              {est !== null && dist > 0.02 && <> Tahminin hedefin biraz {est < v ? 'solunda' : 'sağında'} kaldı: sayıyı {est < v ? 'olduğundan küçük' : 'olduğundan büyük'} düşündün.</>}
            </p>
          </Card>
          {footer}
        </>
      )}
      <div className="lg:hidden">{history}</div>
    </>
  )

  return <Layout work={work} panel={panel} />
}

/** Tahmin karnesi: önceki görevlerde tahmin (gri) ve gerçek yer (yeşil) */
function Karne({ log }: { log: Done[] }) {
  const rows = log.filter((d) => d.acc !== undefined && d.lbl)
  if (!rows.length) return null
  return (
    <div className="rounded-2xl bg-white/90 p-3 ring-1 ring-line">
      <p className="mb-2 text-xs font-black tracking-wide text-ink-soft uppercase">Tahmin karnem</p>
      <div className="flex flex-col gap-1.5">
        {rows.map((d, i) => {
          const W = 220, m = d.max ?? 1
          const sx = (x: number) => 8 + (x / m) * (W - 16)
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-center text-[15px] font-black text-teal-800"><MathText text={d.lbl!} /></span>
              <svg viewBox={`0 0 ${W} 28`} className="h-7 min-w-0 flex-1" aria-hidden>
                <line x1={8} x2={W - 8} y1={16} y2={16} stroke="#1f2340" strokeWidth={2} />
                {Array.from({ length: m + 1 }, (_, w) => <line key={w} x1={sx(w)} x2={sx(w)} y1={10} y2={22} stroke="#1f2340" strokeWidth={2} />)}
                <line x1={sx(d.est!)} x2={sx(d.v!)} y1={16} y2={16} stroke="#f59e0b" strokeWidth={5} strokeLinecap="round" opacity={0.7} />
                <path d={`M${sx(d.est!)} 16 l-5 10 h10 z`} fill="#64748b" />
                <circle cx={sx(d.v!)} cy={16} r={5} fill="#16a34a" stroke="#fff" strokeWidth={1.5} />
              </svg>
              <span className="text-lg" title={accText[d.acc!]}>{accIcon[d.acc!]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Sıcak–soğuk göstergesi */
function Meter({ dist }: { dist: number }) {
  const pos = Math.min(1, dist / 0.4)
  return (
    <div className="relative mt-1.5 h-4 rounded-full bg-[linear-gradient(90deg,#16a34a,#facc15_35%,#fb923c_60%,#93c5fd)]">
      <span className="absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-ink shadow" style={{ left: `${pos * 100}%` }} />
      <span className="absolute -bottom-5 left-0 text-[11px] font-black text-green-700">sıcak</span>
      <span className="absolute right-0 -bottom-5 text-[11px] font-black text-sky-600">soğuk</span>
    </div>
  )
}

/* ───────────────────────── açık görev: aralıkta sayı avı ───────────────────────── */

function OpenView({ r, grade, sol, onDone, footer, history }: { r: OpenRound; grade: Grade; sol: ReturnType<typeof useSolutions>; onDone: (d: Done) => void; footer: ReactNode; history: ReactNode }) {
  const track = useTracker()
  const age = useAge(grade)
  const fresh = useFresh(sol)
  const lo = val(r.lo), hi = val(r.hi)
  const dart = useDart(r.max, lo)
  const [found, setFound] = useState<{ x: number; text: string; D: number }[]>([])
  const [nudge, setNudge] = useState<{ q: string; tone?: 'ok'; n: number } | null>(null)
  const first = useRef(true)
  const done = useRef(false)

  const place = (raw: number) => {
    dart.setX(dart.snapX(raw, true))
    setNudge(null)
  }

  const say = (q: string, tone?: 'ok') => setNudge((c) => ({ q, tone, n: (c?.n ?? 0) + 1 }))

  const add = () => {
    const nm = nameAt(dart.x, dart.D)
    if (!nm) {
      track.attempt(false)
      first.current = false
      say('Önce doğruyu eş parçalara böl ve dartı bir çentiğe koy. Böylece sayıya bir ad verebilirsin.')
      return
    }
    const x = dart.x
    if (x <= lo + EPS || x >= hi - EPS) {
      track.attempt(false)
      first.current = false
      say(`Dart sarı aralığın ${x <= lo + EPS ? 'solunda ya da ucunda' : 'sağında ya da ucunda'}. Aralığın içinde çentik yoksa doğruyu daha çok parçaya bölmeyi dene: çentikler sıklaşınca aralığa daha çok çentik düşer mi?`)
      return
    }
    const g = gcd(nm.k, nm.D) || 1
    const sk = nm.k / g, sd = nm.D / g
    if (r.unitOnly && sk !== 1) {
      track.attempt(false)
      first.current = false
      say(`${fr(nm.k, nm.D)} bir birim kesir mi? Birim kesirlerin payı 1’dir. Bütünü başka sayıda parçaya bölüp 0’dan sonraki ilk çentiğe bak.`)
      return
    }
    const decName = r.decimalNames && /^10+$/.test(String(nm.D))
    const text = decName ? `${dec(x)} = ${fr(nm.k, nm.D)}` : grade === 4 && sk > sd ? `${fr(sk, sd)} = ${mixed(sk, sd)}` : sk !== nm.k ? `${fr(nm.k, nm.D)} = ${fr(sk, sd)}` : fr(sk, sd)
    const prev = found.find((f) => Math.abs(f.x - x) < EPS)
    if (prev) {
      say(`Bu noktayı zaten bulmuştun: ${prev.text}. Aynı nokta, farklı ad! Başka bir nokta dene.`, 'ok')
      return
    }
    track.attempt(true)
    const short = decName ? dec(x) : fr(sk, sd)
    fresh(`${sk}/${sd}`, short)
    const next = [...found, { x, text, D: nm.D }]
    setFound(next)
    sfx.ok()
    if (next.length >= r.goal && !done.current) {
      done.current = true
      track.item(first.current)
      track.strategy(new Set(next.map((f) => f.D)).size > 1 ? 'Farklı bölmelerle aralıkta sayı bulma' : 'Tek bölmede çentikleri sayma')
      onDone({ first: first.current, found: next.length })
      say(grade >= 6 ? 'Harika! Yakınlaştırmaya devam etsen aralıkta hep yeni sayılar bulur muydun?' : 'Harika! Doğruyu başka sayıda parçaya bölersen yeni kesirler bulabilir misin?', 'ok')
    } else say(`Buldun: ${text}. ${next.length < r.goal ? `${r.goal - next.length} tane daha bul!` : 'İstersen daha da bul.'}`, 'ok')
  }

  const work = (
    <div className="flex flex-col gap-3">
      <NumberLine max={r.max} den={dart.den} onD={dart.onD} onTap={place} focus={dart.focus}>
        <Band lo={lo} hi={hi} loText={label(r.lo)} hiText={label(r.hi)} labels={!(dart.den === 10 && dart.D >= 100 && grade >= 5)} />
        <Line max={r.max} D={dart.D} grade={grade} tenthLabels />
        <Found xs={found.map((f) => f.x)} />
        <Dart x={dart.x} color={DART} onMove={place} />
      </NumberLine>
      <p className="rounded-2xl bg-white/80 px-3 py-2 text-center text-sm font-bold text-ink-soft ring-1 ring-line">
        Doğruyu eş parçalara böl, dartı sarı aralıktaki bir çentiğe koy ve sayıyı ekle. {grade >= 6 && 'Yakınlaştırarak yeni çentikler bul!'}
      </p>
      <div className="hidden lg:block">{history}</div>
    </div>
  )

  const panel = (
    <>
      <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
        <p className="text-[11px] font-black tracking-wide text-teal-700 uppercase">Açık görev · en az {r.goal} sayı</p>
        <p className="mt-1 text-lg leading-snug font-black text-ink"><MathText text={r.prompt} /></p>
      </div>
      <Partition dens={r.dens} den={dart.den} setDen={(d) => { dart.setDen(d); setNudge(null); setTimeout(() => dart.setX((x) => (dart.Dref.current ? Math.round(x * dart.Dref.current) / dart.Dref.current : x)), 0) }} D={dart.D} grade={grade} big={age.big} />
      <Card title="Dartı taşı">
        <FineMove onMove={(d) => { dart.nudge(d, true); setNudge(null) }} label={dart.D ? 'Bir parça kaydır' : 'Hassas ayar'} />
        {grade >= 5 && <div className="mt-2 border-t border-line pt-2"><ZoomCard dart={dart} deep={grade >= 6} /></div>}
      </Card>
      <BigButton onClick={add} className="w-full"><Plus size={20} />Bu sayıyı ekle</BigButton>
      {nudge && <Nudge key={nudge.n} question={nudge.q} tone={nudge.tone} />}
      <SolutionList list={sol.list} goal={r.goal} />
      {footer}
      <div className="lg:hidden">{history}</div>
    </>
  )

  return <Layout work={work} panel={panel} />
}
