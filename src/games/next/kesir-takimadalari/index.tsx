import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Anchor, ArrowRight, Eraser, Lightbulb, Sailboat, Ship, ZoomIn } from 'lucide-react'
import type { GameProps } from '../../kit'
import { starsFor } from '../../kit'
import { BigButton, LevelDots, Nudge as KitNudge, Scene, SolutionList, StrategyPicker, TaskCard, useSolutions } from '../../kit2'
import { MathText } from '../../../components/MathText'
import { FractionSvg } from '../../../components/Visual'
import { useTracker } from '../../../lib/trackerContext'
import { celebrate, sfx } from '../../../lib/feedback'
import type { ManipulativeConfig, ManipulativeTool } from '../../../data/types'
import { Chart, type Island } from './Chart'
import { makeLevels, type Level } from './levels'
import { dec, eq, gcd, key, label, nameAt, val, type Num } from './frac'

/**
 * Kesir Takımadaları (4–6. sınıf)
 * Rota bir sayı doğrusudur (<Plane mode="x">). Öğrenci tekneyi kesrin bulunduğu yere götürür:
 * önce tahmin eder, sonra rotayı eş parçalara bölerek (ve yakınlaştırarak) kesinleştirir.
 * Aynı limana varan farklı adlar (denk kesirler) useSolutions ile toplanır.
 */

type Done = { first: boolean; bonus: number }
type SolApi = ReturnType<typeof useSolutions>

interface Ctx {
  level: Level
  idx: number
  grade: number
  sol: SolApi
  onDone: (d: Done) => void
}

/** useSolutions.add'in dönüş değeri güvenilir olmadığından yeniliği kendimiz izleriz */
function useFresh(sol: SolApi) {
  const seen = useRef(new Set<string>())
  return useCallback(
    (k: string, lbl: string) => {
      if (seen.current.has(k) || sol.list.some((s) => s.key === k)) return false
      seen.current.add(k)
      sol.add(k, lbl)
      return true
    },
    [sol],
  )
}

export default function KesirTakimadalari({ grade, onFinish }: GameProps) {
  const levels = useMemo(() => makeLevels(grade), [grade])
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState<Done[]>([])
  const [ready, setReady] = useState(false)
  const sol = useSolutions()
  const level = levels[idx]
  const harborNames = sol.list.length

  const onDone = useCallback((d: Done) => {
    setResults((r) => [...r, d])
    setReady(true)
  }, [])

  const next = () => {
    if (idx + 1 < levels.length) {
      setIdx(idx + 1)
      setReady(false)
      return
    }
    const all = results
    const firsts = all.filter((r) => r.first).length
    const bonus = all.reduce((s, r) => s + r.bonus, 0)
    const ratio = (firsts + Math.min(1.5, bonus * 0.25)) / levels.length
    const names = sol.list.map((s) => s.label)
    const insight =
      grade <= 4
        ? `Payda büyüdükçe parçalar küçülür. ${names.length > 1 ? names.slice(0, 4).join(', ') + ' aynı limana vardı: ' : ''}aynı noktanın birçok kesir adı olabilir.`
        : grade === 5
          ? `Kesirleri [[1/2]] ve 1 gibi referans noktalarıyla karşılaştırabiliriz. ${names.length > 1 ? names.slice(0, 4).join(', ') + ' aynı noktadır.' : 'Bileşik kesirler 1’in ötesinde yaşar.'}`
          : 'Kesirler ve ondalıklar aynı sayı doğrusunda yaşar; iki sayı arasında her zaman başka bir sayı bulunur — yakınlaştırdıkça yeni adalar çıkar!'
    onFinish({
      stars: starsFor(Math.min(1, ratio)),
      summary: `${levels.length} adayı keşfettin, ${harborNames} farklı kesir adı buldun.`,
      score: firsts * 100 + bonus * 30 + harborNames * 20,
      insight,
    })
  }

  return (
    <Scene grade={grade}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-2xl bg-sky-600 text-white shadow"><Sailboat size={22} /></span>
          <div>
            <p className="text-[11px] font-black tracking-wide text-sky-700 uppercase">Ada {idx + 1} / {levels.length}</p>
            <p className="text-lg leading-tight font-black text-ink">{level.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {harborNames > 0 && <span className="chip bg-amber-100 px-3 py-1 text-sm text-amber-900 ring-1 ring-amber-200"><Anchor size={14} />{harborNames} liman adı</span>}
          <LevelDots current={idx} total={levels.length} />
        </div>
      </div>
      <LevelView key={idx} level={level} idx={idx} grade={grade} sol={sol} onDone={onDone} />
      {ready && (
        <div className="mt-4 flex justify-center animate-fade-up">
          <BigButton onClick={next}>
            {idx + 1 < levels.length ? <>Sonraki adaya yelken aç <ArrowRight size={20} /></> : <>Yolculuğu bitir <Ship size={20} /></>}
          </BigButton>
        </div>
      )}
    </Scene>
  )
}

function LevelView(c: Ctx) {
  switch (c.level.kind) {
    case 'place': return <PlaceLevel {...c} level={c.level} />
    case 'order': return <OrderLevel {...c} level={c.level} />
    case 'harbor': return <HarborLevel {...c} level={c.level} />
    case 'between': return <BetweenLevel {...c} level={c.level} />
    case 'compare': return <CompareLevel {...c} level={c.level} />
    case 'share': return <ShareLevel {...c} level={c.level} />
  }
}

/* ───────────────────────── ortak parçalar ───────────────────────── */

/** Dar panelde soru metni tam satır kaplasın, düğmeler alta insin */
function Nudge(p: Parameters<typeof KitNudge>[0]) {
  return (
    <div className="[&>div>div]:ml-12 [&>div>p]:basis-[calc(100%-3rem)]">
      <KitNudge {...p} />
    </div>
  )
}

function Layout({ chart, children }: { chart: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">{chart}</div>
      <div className="flex min-w-0 flex-col gap-3">{children}</div>
    </div>
  )
}

function useBoat(start = 0) {
  const [x, setX] = useState(start)
  const [dragging, setDragging] = useState(false)
  const [moved, setMoved] = useState(false)
  const onBoat = useCallback((v: number, final: boolean) => {
    setX(v)
    setDragging(!final)
    setMoved(true)
  }, [])
  return { x, setX, dragging, moved, onBoat }
}

function Partition({ dens, den, setDen, disabled, decimal, D, note }: { dens: number[]; den: number; setDen: (d: number) => void; disabled?: boolean; decimal?: boolean; D: number; note?: string }) {
  return (
    <div className={`rounded-2xl bg-white/95 p-3 ring-1 ring-line transition ${disabled ? 'opacity-50' : ''}`}>
      <p className="mb-2 flex items-center justify-between text-xs font-black tracking-wide text-sky-800 uppercase">
        <span>Rotayı eş parçalara böl</span>
        {disabled && note && <span className="normal-case text-ink-soft">{note}</span>}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <PickBtn on={!den} disabled={disabled} onClick={() => setDen(0)}>Yok</PickBtn>
        {dens.map((d) => <PickBtn key={d} on={den === d} disabled={disabled} onClick={() => setDen(d)}>{d}</PickBtn>)}
      </div>
      {!!den && !disabled && (
        <p className="mt-2 text-[13px] font-bold text-ink-soft">
          {D === 0 ? 'Parçalar çok sık; çentikleri görmek için yakınlaştır.' : D > den ? <>Yakınlaştırdın: her bütün şimdi <b className="text-sky-700">{D}</b> eş parça{decimal && den === 10 ? (D === 100 ? ' (yüzde birler)' : D === 1000 ? ' (binde birler)' : '') : ''}.</> : <>Her bütün {den} eş parça. Yakınlaştırınca parçalar {decimal && den === 10 ? 'ona' : 'ikiye'} bölünür.</>}
        </p>
      )}
    </div>
  )
}

function PickBtn({ on, disabled, onClick, children }: { on: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-pressed={on} className={`min-h-12 min-w-12 rounded-xl px-3 text-lg font-black ring-1 transition active:scale-95 ${on ? 'bg-sky-600 text-white ring-sky-700 shadow-[0_3px_0_#075985]' : 'bg-white text-sky-900 ring-sky-200 hover:bg-sky-50'} disabled:cursor-not-allowed`}>
      {children}
    </button>
  )
}

/** Teknenin bulunduğu yerin adı */
function Readout({ x, D, decimal, hidden, grade }: { x: number; D: number; decimal: boolean; hidden?: boolean; grade: number }) {
  const nm = nameAt(x, D)
  let body: ReactNode
  if (hidden) body = <span className="text-base text-sky-100">Tahmin ediyorsun… değer gizli</span>
  else if (!nm) body = <span className="text-base text-sky-100">{D ? 'Tekne bir çentiğin üzerinde değil' : 'Rotayı bölünce teknenin yerine ad verebilirsin'}</span>
  else {
    const g = gcd(nm.k, nm.D) || 1
    const w = Math.floor(nm.k / nm.D)
    const r = nm.k - w * nm.D
    body = (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-3xl"><MathText text={decimal ? dec(x) : `[[${nm.k}/${nm.D}]]`} /></span>
        {decimal && nm.D > 1 && <span className="text-lg text-sky-100">= <MathText text={`[[${nm.k}/${nm.D}]]`} /></span>}
        {!decimal && w >= 1 && r > 0 && <span className="text-lg text-sky-100">= <MathText text={`[[${w} ${r}/${nm.D}]]`} /></span>}
        {!decimal && g > 1 && nm.k % nm.D !== 0 && <span className="text-lg text-sky-100">= <MathText text={`[[${nm.k / g}/${nm.D / g}]]`} /></span>}
        {grade >= 6 && !decimal && <span className="text-lg text-sky-100">≈ {dec(x)}</span>}
      </span>
    )
  }
  return (
    <div className="rounded-2xl bg-gradient-to-br from-sky-700 to-sky-900 px-4 py-3 font-black text-white shadow-inner">
      <p className="mb-0.5 flex items-center gap-1.5 text-[11px] tracking-wide text-sky-200 uppercase"><Sailboat size={14} />Teknenin yeri</p>
      {body}
    </div>
  )
}

function ZoomBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-extrabold text-sky-900 ring-1 ring-sky-200 active:scale-95">
      <ZoomIn size={18} />Tekneye yaklaş
    </button>
  )
}

const fracTool = (grade: number): { tool: ManipulativeTool; toolConfig: ManipulativeConfig; toolTitle: string } =>
  grade >= 6
    ? { tool: 'kesirdogrusu', toolConfig: { min: 0, max: 1, dens: [2, 4, 5, 8, 10] }, toolTitle: 'Kesir sayı doğrusu' }
    : { tool: 'fractions', toolConfig: { dens: [2, 3, 4, 5, 6, 7, 8, 12] }, toolTitle: 'Kesir şeritleri' }

const isDecimalMode = (level: { decimal?: boolean }, den: number) => !!level.decimal && den === 10

/** Yer değiştirmiş ondalık / kesir için şerit modeli */
function StripCard({ q, color, title }: { q: Num; color: string; title: ReactNode }) {
  let n = q.n, d = q.d
  const g = gcd(n, d)
  if (d > 24) {
    n /= g
    d /= g
  }
  return (
    <div className="rounded-xl bg-white p-2 ring-1 ring-line">
      <p className="mb-1 text-sm font-black">{title}</p>
      {d <= 24 ? <FractionSvg num={n} den={d} shape="bar" highlight={color} /> : <p className="text-sm font-bold text-ink-soft">Bu şerit çok ince parçalı; rotada yakınlaştır.</p>}
    </div>
  )
}

/* ───────────────────────── 1) Rotayı işaretle ───────────────────────── */

function PlaceLevel({ level, grade, onDone }: Ctx & { level: Extract<Level, { kind: 'place' }> }) {
  const track = useTracker()
  const boat = useBoat(0)
  const [phase, setPhase] = useState<'estimate' | 'refine' | 'done'>('estimate')
  const [anchor, setAnchor] = useState<number | null>(null)
  const [den, setDen] = useState(0)
  const [D, setD] = useState(0)
  const [nudge, setNudge] = useState<{ q: string; m?: string } | null>(null)
  const [tries, setTries] = useState(0)
  const cam = useRef<((x: number, f: number) => void) | null>(null)
  const target = val(level.target)
  const decimal = isDecimalMode(level, den)

  const dropAnchor = () => {
    setAnchor(boat.x)
    setPhase('refine')
    sfx.ok()
    const err = Math.abs(boat.x - target)
    if (err <= 0.06) track.strategy('Referans noktasıyla tahmin')
  }

  const check = () => {
    const nm = nameAt(boat.x, D)
    const ok = !!nm && eq(boat.x, target)
    track.attempt(ok)
    if (ok) {
      setPhase('done')
      setNudge(null)
      sfx.ok()
      celebrate()
      const reduced = level.target.d / gcd(level.target.n, level.target.d)
      track.strategy(nm!.D === reduced || nm!.D === level.target.d ? 'Paydaya göre bölme' : 'Denk kesirle yerleştirme')
      track.item(tries === 0)
      onDone({ first: tries === 0, bonus: anchor !== null && Math.abs(anchor - target) <= 0.06 ? 1 : 0 })
      return
    }
    setTries((t) => t + 1)
    sfx.bad()
    const t = level.target
    const lbl = label(t)
    if (!den) return setNudge({ q: `Rotayı henüz bölmedin. Tekneyi tam ${lbl} noktasına götürmek için bütünü kaç eş parçaya bölmelisin?` })
    if (!D) return setNudge({ q: 'Çentikler görünmüyor. Biraz yakınlaştır ki parçaları görebilesin.' })
    if (!Number.isInteger(Math.round(target * D * 1e6) / 1e6)) return setNudge({ q: `Bu bölmede ${lbl} noktasına hiçbir çentik düşmüyor. Hangi bölme işine yarar? ${lbl} kaç eş parçalık bir bütünden geliyor?` })
    if (t.fmt !== 'dec' && t.n < t.d * 3 && eq(boat.x, t.d / t.n)) return setNudge({ q: 'Pay ile paydayı karıştırmış olabilir misin? Payda, bütünün kaç eş parçaya bölündüğünü; pay ise kaç parça gidildiğini söyler.', m: 'Kesri sayı doğrusunda yerleştirirken pay ile paydayı karıştırdı' })
    if (target > 1 && eq(boat.x, target - Math.floor(target))) return setNudge({ q: `${lbl} bir bütünden büyük. Kaç tane bütün geçmen gerekiyor? Şeritte her bütünü say.`, m: 'Bileşik kesri 1’den küçük bir kesir gibi yerleştirdi' })
    const at = nameAt(boat.x, D)
    if (at && Math.abs(boat.x - target) <= 1 / D + 1e-9) return setNudge({ q: `Çok yaklaştın! Çentikleri mi saydın, yoksa aralıkları mı? 0’dan başlayarak her aralık bir [[1/${D}]] kadardır.`, m: 'Sayı doğrusunda aralıklar yerine çentikleri saydı' })
    setNudge({ q: `Henüz değil. Tekne şu an ${decimal ? dec(boat.x) : `[[${at?.k}/${D}]]`} noktasında. Hedefin bundan büyük mü küçük mü? Alttaki şeridin ne kadarı dolu olmalı?` })
  }

  const err = anchor !== null ? Math.abs(anchor - target) : 0
  const estimateNote = err <= 0.04 ? 'Tahminin neredeyse tam isabet!' : err <= 0.1 ? 'Tahminin oldukça yakındı.' : 'Tahminin biraz uzaktı; 0, [[1/2]] ve 1 gibi referans noktaları tahmini kolaylaştırır.'

  const islands: Island[] = phase === 'done' ? [{ id: 't', x: target, label: label(level.target), kind: level.island, fresh: true, tone: 'gold' }] : []

  return (
    <Layout
      chart={
        <Chart
          view={level.view}
          range={level.range}
          den={phase === 'estimate' ? 0 : den}
          decimal={decimal}
          boat={boat.x}
          free={phase === 'estimate'}
          onBoat={phase === 'done' ? undefined : boat.onBoat}
          onDen={setD}
          islands={islands}
          anchor={anchor}
          half={level.half}
          minSpan={level.minSpan}
          locked={phase === 'done'}
          cameraRef={cam}
        />
      }
    >
      <TaskCard>{phase === 'estimate' ? level.prompt : phase === 'refine' ? level.refine : `${level.name} bulundu!`}</TaskCard>
      <Readout x={boat.x} D={phase === 'estimate' ? 0 : D} decimal={decimal} hidden={phase === 'estimate'} grade={grade} />
      <Partition dens={level.dens} den={den} setDen={(d) => { setDen(d); setNudge(null) }} disabled={phase !== 'refine'} note={phase === 'estimate' ? 'önce tahmin et' : undefined} decimal={level.decimal} D={D} />
      {phase === 'estimate' && (
        <BigButton onClick={dropAnchor} disabled={!boat.moved || boat.x === 0}><Anchor size={20} />Çapa at</BigButton>
      )}
      {phase === 'refine' && (
        <div className="flex flex-wrap gap-2">
          <BigButton onClick={check} className="flex-1"><Ship size={20} />Limana var</BigButton>
          <ZoomBtn onClick={() => cam.current?.(boat.x, 3)} />
        </div>
      )}
      {nudge && phase !== 'done' && <Nudge key={nudge.q} question={nudge.q} misconception={nudge.m} {...fracTool(grade)} onClose={() => setNudge(null)} />}
      {phase === 'done' && (
        <>
          <Nudge tone="ok" question={`Buldun! ${label(level.target)} noktası rotada işaretlendi. ${estimateNote}`} />
          <StrategyPicker question="Tahminini nasıl yaptın?" options={['Yarımla karşılaştırdım', 'Bütünü kafamda böldüm', '1’e yakınlığa baktım', 'Göz kararı']} onPick={() => {}} />
        </>
      )}
    </Layout>
  )
}

/* ───────────────────────── 2) Adaları sırala ───────────────────────── */

function OrderLevel({ level, grade, onDone }: Ctx & { level: Extract<Level, { kind: 'order' }> }) {
  const track = useTracker()
  const boat = useBoat(0)
  const [den, setDen] = useState(0)
  const [D, setD] = useState(0)
  const [seq, setSeq] = useState<number[]>([])
  const [revealed, setRevealed] = useState(false)
  const [sailing, setSailing] = useState(false)
  const [done, setDone] = useState(false)
  const [nudge, setNudge] = useState<{ q: string; m?: string } | null>(null)
  const [tries, setTries] = useState(0)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const decimal = isDecimalMode(level, den)
  const cards = level.cards

  const tap = (i: number) => {
    if (sailing || done) return
    setNudge(null)
    setSeq((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))
  }

  const animateTo = (from: number, to: number) =>
    new Promise<void>((res) => {
      const t0 = performance.now()
      const dur = 450 + Math.abs(to - from) * 700
      const step = (now: number) => {
        if (!alive.current) return res()
        const t = Math.min(1, (now - t0) / dur)
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
        boat.setX(from + (to - from) * e)
        if (t < 1) requestAnimationFrame(step)
        else res()
      }
      requestAnimationFrame(step)
    })

  const sail = async () => {
    setSailing(true)
    setRevealed(true)
    setNudge(null)
    let at = 0
    boat.setX(0)
    let bad = -1
    for (let j = 0; j < seq.length; j++) {
      const v = val(cards[seq[j]])
      if (v < at - 1e-9) {
        bad = j
        break
      }
      await animateTo(at, v)
      at = v
    }
    if (!alive.current) return
    setSailing(false)
    const ok = bad < 0
    track.attempt(ok)
    if (ok) {
      setDone(true)
      sfx.ok()
      celebrate()
      track.item(tries === 0)
      onDone({ first: tries === 0, bonus: 0 })
      return
    }
    sfx.bad()
    setTries((t) => t + 1)
    const prev = cards[seq[bad - 1]], cur = cards[seq[bad]]
    const vals = seq.map((i) => val(cards[i]))
    if (level.trap === 'unit' && vals.every((v, j) => j === 0 || v < vals[j - 1]))
      return setNudge({ q: 'Tekne hep geri dönmek zorunda kaldı! [[1/8]] mi daha büyük, [[1/4]] mü? Payda büyüdükçe parçalar küçülür mü büyür mü? Şeritlere bak.', m: '[[1/8]] > [[1/4]] çünkü 8 > 4 (birim kesirlerde paydası büyük olanı büyük sandı)' })
    if (level.trap === 'decimal') {
      const i55 = cards.findIndex((c) => c.fmt === 'dec' && c.d === 100)
      const i6 = cards.findIndex((c) => c.fmt === 'dec' && c.d === 10)
      if (seq.indexOf(i55) > seq.indexOf(i6))
        return setNudge({ q: '0,55 mi büyük, 0,6 mı? 0,6’yı yüzde birlerle yazarsan kaç olur? Rotayı 10’a bölüp yakınlaştır ve ikisine de bak.', m: '0,55 > 0,6 çünkü 55 > 6 (ondalık kısmı uzun olanı büyük sandı)' })
    }
    setNudge({ q: `Tekne ${label(prev)} adasından sonra ${label(cur)} adasına gitmek için geri dönmek zorunda kaldı! ${label(cur)}, ${label(prev)} ile karşılaştırınca büyük mü küçük mü? Referans noktalarını kullan.` })
  }

  const islands: Island[] = revealed ? cards.map((c, i) => ({ id: String(i), x: val(c), label: label(c), kind: (['palm', 'hill', 'house', 'rock'] as const)[i % 4], fresh: true })) : []

  return (
    <Layout
      chart={<Chart view={level.view} range={level.range} den={den} decimal={decimal} boat={boat.x} onBoat={sailing || done ? undefined : boat.onBoat} onDen={setD} islands={islands} half={level.half} minSpan={level.minSpan} locked={sailing || done} />}
    >
      <TaskCard>{level.prompt}</TaskCard>
      <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
        <p className="mb-2 text-xs font-black tracking-wide text-sky-800 uppercase">Adalar</p>
        <div className="grid grid-cols-4 gap-2">
          {cards.map((c, i) => {
            const pos = seq.indexOf(i)
            return (
              <button key={i} type="button" onClick={() => tap(i)} disabled={sailing || done} className={`relative grid min-h-16 place-items-center rounded-2xl text-2xl font-black ring-2 transition active:scale-95 ${pos >= 0 ? 'bg-sky-50 text-sky-300 ring-sky-100' : 'bg-gradient-to-b from-amber-50 to-amber-100 text-amber-950 ring-amber-300 shadow-[0_3px_0_#d97706]'}`}>
                <MathText text={label(c)} />
                {pos >= 0 && <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-sky-600 text-xs text-white">{pos + 1}</span>}
              </button>
            )
          })}
        </div>
        <p className="mt-3 mb-1.5 text-xs font-black tracking-wide text-sky-800 uppercase">Rotan</p>
        <div className="flex min-h-14 flex-wrap items-center gap-1.5 rounded-xl bg-sky-50 p-2 ring-1 ring-sky-100">
          <span className="chip bg-white px-2 py-1 text-sm text-sky-900 ring-1 ring-sky-200">Fener (0)</span>
          {seq.map((i) => (
            <span key={i} className="flex items-center gap-1.5">
              <ArrowRight size={14} className="text-sky-400" />
              <button type="button" onClick={() => tap(i)} disabled={sailing || done} className="chip min-h-10 bg-white px-2.5 text-lg text-sky-950 ring-1 ring-sky-300"><MathText text={label(cards[i])} /></button>
            </span>
          ))}
          {!seq.length && <span className="text-sm font-bold text-sky-700/70">Adalara sırayla dokun</span>}
        </div>
      </div>
      <Partition dens={level.dens} den={den} setDen={setDen} decimal={level.decimal} D={D} disabled={done} />
      {!done && (
        <div className="flex gap-2">
          <BigButton onClick={sail} disabled={seq.length < cards.length || sailing} className="flex-1"><Sailboat size={20} />Yelken aç</BigButton>
          <button type="button" onClick={() => { setSeq([]); setNudge(null) }} disabled={sailing || !seq.length} className="btn-ghost min-h-14" aria-label="Rotayı temizle"><Eraser size={18} /></button>
        </div>
      )}
      {!done && !revealed && <p className="text-center text-[13px] font-bold text-ink-soft">İpucu: Sıralamadan önce tekneyi rotada gezdirip parçalara bölerek araştırabilirsin.</p>}
      {nudge && <Nudge key={nudge.q} question={nudge.q} misconception={nudge.m} {...fracTool(grade)} onClose={() => setNudge(null)} />}
      {done && (
        <>
          <Nudge tone="ok" question={`Rota kusursuz: ${[...cards].sort((a, b) => val(a) - val(b)).map(label).join(' < ')}`} />
          <StrategyPicker options={grade <= 4 ? ['Parça büyüklüğünü düşündüm', 'Şeritleri hayal ettim', 'Yarımla karşılaştırdım'] : grade === 5 ? ['Bütünle karşılaştırdım', 'Yarımla karşılaştırdım', 'Ortak payda buldum'] : ['Hepsini ondalığa çevirdim', 'Hepsini kesre çevirdim', 'Rotada yerleştirdim']} onPick={() => {}} />
        </>
      )}
    </Layout>
  )
}

/* ───────────────────────── 3) Aynı liman (denk kesirler) ───────────────────────── */

function HarborLevel({ level, idx, grade, sol, onDone }: Ctx & { level: Extract<Level, { kind: 'harbor' }> }) {
  const track = useTracker()
  const boat = useBoat(0)
  const [den, setDen] = useState(0)
  const [D, setD] = useState(0)
  const [info, setInfo] = useState<string | null>(null)
  const [hints, setHints] = useState(0)
  const [finished, setFinished] = useState(false)
  const zoomed = useRef(false)
  const cam = useRef<((x: number, f: number) => void) | null>(null)
  const target = val(level.target)
  const decimal = isDecimalMode(level, den)
  const mine = sol.list.filter((s) => s.key.startsWith(`${idx}:`))
  const fresh = useFresh(sol)

  const seenState = useRef('')
  useEffect(() => {
    if (boat.dragging) return
    const st = `${boat.x}|${D}`
    if (seenState.current === st) return
    seenState.current = st
    const nm = nameAt(boat.x, D)
    if (nm && eq(boat.x, target)) {
      if (nm.k === level.target.n && nm.D === level.target.d && level.target.fmt !== 'dec') {
        setInfo(`Bu limanın verilen adı ${label(level.target)}. Rotayı başka bir biçimde böl ya da yakınlaştır: liman yeni bir ad alacak mı?`)
        return
      }
      const w = Math.floor(nm.k / nm.D), r = nm.k - w * nm.D
      const lbl = decimal ? `${dec(target)} = [[${nm.k}/${nm.D}]]` : w >= 1 && r > 0 ? `[[${nm.k}/${nm.D}]] = [[${w} ${r}/${nm.D}]]` : `[[${nm.k}/${nm.D}]]`
      const isNew = fresh(`${idx}:${nm.k}/${nm.D}`, lbl)
      if (isNew) {
        setInfo(null)
        if (nm.D > den && !zoomed.current) {
          zoomed.current = true
          track.strategy('Yakınlaştırarak parçaları bölme')
        }
      }
      return
    }
    if (D && Math.abs(boat.x - target) < 1 / D - 1e-9 && boat.moved)
      setInfo(`${D} eş parçaya bölünce limana tam bir çentik düşmüyor. Neden olabilir? Başka bir bölme dene.`)
  }, [boat.x, boat.dragging, D, den, target, decimal, idx, fresh, track, boat.moved, level.target])

  useEffect(() => {
    if (!finished && mine.length >= level.goal) {
      setFinished(true)
      celebrate()
      track.attempt(true)
      track.item(hints === 0)
      track.strategy('Denk kesirleri modelle bulma')
      onDone({ first: hints === 0, bonus: Math.max(0, mine.length - level.goal) })
    }
  }, [mine.length, finished, level.goal, hints, onDone, track])

  const hint = () => {
    track.hint()
    setHints((h) => h + 1)
    setInfo(hints === 0 ? 'Rotayı 2’ye böl ve tekneyi limana götür. Sonra yakınlaştır: her parça ikiye bölünür. Tekne hâlâ bir çentiğin üzerinde mi? Adı değişti mi?' : 'Liman bir çentiğe denk gelmeli. Hangi paydalarda limana çentik düşüyor? 4, 6, 8, 10’u dene.')
  }

  return (
    <Layout
      chart={<Chart view={level.view} range={level.range} den={den} decimal={decimal} boat={boat.x} onBoat={boat.onBoat} onDen={setD} harbor={{ x: target, label: label(level.target) }} half={level.half} minSpan={level.minSpan} cameraRef={cam} />}
    >
      <TaskCard>{level.prompt}</TaskCard>
      <Readout x={boat.x} D={D} decimal={decimal} grade={grade} />
      <Partition dens={level.dens} den={den} setDen={(d) => { setDen(d); setInfo(null) }} decimal={level.decimal} D={D} />
      <div className="flex flex-wrap gap-2">
        <ZoomBtn onClick={() => cam.current?.(boat.x, 3)} />
        <button type="button" onClick={hint} className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-extrabold text-amber-800 ring-1 ring-amber-200 active:scale-95"><Lightbulb size={18} />İpucu</button>
        <span className="ml-auto self-center text-sm font-black text-sky-900">{Math.min(mine.length, level.goal)} / {level.goal} ad</span>
      </div>
      {info && !finished && <Nudge key={info} question={info} onClose={() => setInfo(null)} />}
      <SolutionList list={mine} goal={level.goal} />
      {finished && (
        <>
          <Nudge tone="ok" question={`Aynı liman, farklı adlar! ${level.pattern}${mine.length === level.goal ? ' Başka bir ad daha bulabilir misin?' : ''}`} />
          <div className="grid grid-cols-2 gap-2">
            {mine.slice(0, 4).map((s) => {
              const m = /\[\[(\d+)\/(\d+)\]\]/.exec(s.label)
              if (!m || +m[2] > 24) return null
              return <StripCard key={s.key} q={{ n: +m[1], d: +m[2] }} color="#f97316" title={<MathText text={`[[${m[1]}/${m[2]}]]`} />} />
            })}
          </div>
        </>
      )}
    </Layout>
  )
}

/* ───────────────────────── 4) Aradaki ada (yoğunluk) ───────────────────────── */

function BetweenLevel({ level, idx, grade, sol, onDone }: Ctx & { level: Extract<Level, { kind: 'between' }> }) {
  const track = useTracker()
  const a = val(level.a), b = val(level.b)
  const boat = useBoat(a)
  const [den, setDen] = useState(level.dens.length === 1 ? level.dens[0] : 0)
  const [D, setD] = useState(0)
  const [info, setInfo] = useState<string | null>(null)
  const [found, setFound] = useState<{ x: number; label: string }[]>([])
  const [hints, setHints] = useState(0)
  const [finished, setFinished] = useState(false)
  const cam = useRef<((x: number, f: number) => void) | null>(null)
  const decimal = isDecimalMode(level, den)
  const mine = sol.list.filter((s) => s.key.startsWith(`${idx}:`))
  const fresh = useFresh(sol)

  const seenState = useRef('')
  useEffect(() => {
    if (boat.dragging || !boat.moved) return
    const st = `${boat.x}|${D}`
    if (seenState.current === st) return
    seenState.current = st
    const nm = nameAt(boat.x, D)
    if (!nm) return
    if (eq(boat.x, a) || eq(boat.x, b)) return setInfo('Bu, adanın kendisi. İki adanın arasında bir nokta bul.')
    if (boat.x > a && boat.x < b) {
      const g = gcd(nm.k, nm.D)
      const lbl = decimal ? dec(boat.x, 4) : `[[${nm.k / g}/${nm.D / g}]]`
      if (fresh(`${idx}:${key(boat.x)}`, lbl)) {
        setFound((f) => [...f, { x: boat.x, label: lbl }])
        setInfo(null)
        if (nm.D > den) track.strategy('Yakınlaştırarak parçaları bölme')
      }
    } else setInfo('Tekne iki adanın arasında değil. Altın renkli bölgeye götür.')
  }, [boat.x, boat.dragging, boat.moved, D, a, b, decimal, den, idx, fresh, track])

  useEffect(() => {
    if (!finished && mine.length >= level.goal) {
      setFinished(true)
      celebrate()
      track.attempt(true)
      track.item(hints === 0)
      onDone({ first: hints === 0, bonus: Math.max(0, mine.length - level.goal) })
    }
  }, [mine.length, finished, level.goal, hints, onDone, track])

  const hint = () => {
    track.hint()
    setHints((h) => h + 1)
    setInfo(hints === 0 ? 'Aralarında hiç çentik yoksa parçalar fazla büyük demektir. Tekneyi altın bölgeye götür ve iki parmakla yakınlaştır.' : 'Her yakınlaştırmada parçalar yeniden bölünür. Ondalıkta onda birler yüzde birlere, yüzde birler binde birlere bölünür.')
  }

  const islands: Island[] = [
    { id: 'a', x: a, label: label(level.a), kind: 'hill' },
    { id: 'b', x: b, label: label(level.b), kind: 'palm' },
    ...found.map((f, i) => ({ id: `f${i}`, x: f.x, label: f.label, kind: 'mini' as const, fresh: true, tone: 'gold' as const })),
  ]

  return (
    <Layout chart={<Chart view={level.view} range={level.range} den={den} decimal={decimal} boat={boat.x} onBoat={boat.onBoat} onDen={setD} islands={islands} gap={[a, b]} minSpan={level.minSpan} cameraRef={cam} />}>
      <TaskCard>{level.prompt}</TaskCard>
      <Readout x={boat.x} D={D} decimal={decimal} grade={grade} />
      <Partition dens={level.dens} den={den} setDen={(d) => { setDen(d); setInfo(null) }} decimal={level.decimal} D={D} />
      <div className="flex flex-wrap gap-2">
        <ZoomBtn onClick={() => cam.current?.((a + b) / 2, 4)} />
        <button type="button" onClick={hint} className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-extrabold text-amber-800 ring-1 ring-amber-200 active:scale-95"><Lightbulb size={18} />İpucu</button>
        <span className="ml-auto self-center text-sm font-black text-sky-900">{Math.min(mine.length, level.goal)} / {level.goal} ada</span>
      </div>
      {info && !finished && <Nudge key={info} question={info} onClose={() => setInfo(null)} />}
      <SolutionList list={mine} goal={level.goal} />
      {finished && <Nudge tone="ok" question="İki sayı ne kadar yakın olursa olsun, yakınlaştırınca aralarında yeni sayılar belirir. Sence bu kaç kez tekrarlanabilir?" />}
    </Layout>
  )
}

/* ───────────────────────── 5) Köprü kur (karşılaştırma) ───────────────────────── */

function CompareLevel({ level, grade, onDone }: Ctx & { level: Extract<Level, { kind: 'compare' }> }) {
  const track = useTracker()
  const boat = useBoat(0)
  const [den, setDen] = useState(0)
  const [D, setD] = useState(0)
  const [strips, setStrips] = useState(false)
  const [done, setDone] = useState(false)
  const [nudge, setNudge] = useState<{ q: string; m?: string } | null>(null)
  const [tries, setTries] = useState(0)
  const [wrong, setWrong] = useState<string[]>([])
  const decimal = isDecimalMode(level, den)
  const va = val(level.a), vb = val(level.b)
  const answer = eq(va, vb) ? 'eq' : va > vb ? 'a' : 'b'

  const pick = (c: 'a' | 'b' | 'eq') => {
    if (done) return
    const ok = c === answer
    track.attempt(ok)
    if (ok) {
      setDone(true)
      setNudge(null)
      sfx.ok()
      celebrate()
      track.item(tries === 0)
      onDone({ first: tries === 0, bonus: 0 })
      return
    }
    sfx.bad()
    setTries((t) => t + 1)
    setWrong((w) => [...w, c])
    setNudge(c === 'eq' && level.nudgeEq ? { q: level.nudgeEq, m: level.misconception } : { q: level.nudgeA, m: level.misconception })
  }

  const showStrips = () => {
    if (!strips) track.hint()
    setStrips(true)
  }

  const islands: Island[] = done ? [
    { id: 'a', x: va, label: label(level.a), kind: 'palm', fresh: true, tone: answer === 'a' ? 'gold' : 'normal' },
    { id: 'b', x: vb, label: label(level.b), kind: 'rock', fresh: true, tone: answer === 'b' ? 'gold' : 'normal' },
  ] : []

  const card = (c: 'a' | 'b', q: Num) => (
    <button key={c} type="button" onClick={() => pick(c)} disabled={done || wrong.includes(c)} className={`group relative flex min-h-24 flex-col items-center justify-center rounded-2xl text-3xl font-black ring-2 transition active:scale-95 ${done && answer === c ? 'bg-amber-300 text-amber-950 ring-amber-500' : wrong.includes(c) ? 'bg-slate-100 text-slate-400 ring-slate-200' : 'bg-gradient-to-b from-white to-sky-50 text-sky-950 ring-sky-300 shadow-[0_4px_0_#0369a1]'}`}>
      <span className="text-[11px] font-black tracking-wide text-sky-700 uppercase">{c === 'a' ? 'Ada A' : 'Ada B'}</span>
      <MathText text={label(q)} />
    </button>
  )

  return (
    <Layout chart={<Chart view={level.view} range={level.range} den={den} decimal={decimal} boat={boat.x} onBoat={boat.onBoat} onDen={setD} islands={islands} bridge={done ? [Math.min(va, vb), Math.max(va, vb)] : null} half={level.half} minSpan={level.minSpan} />}>
      <TaskCard>{level.prompt}</TaskCard>
      <div className={`grid gap-2 ${level.equal ? 'grid-cols-[1fr_auto_1fr]' : 'grid-cols-2'}`}>
        {card('a', level.a)}
        {level.equal && (
          <button type="button" onClick={() => pick('eq')} disabled={done || wrong.includes('eq')} className={`min-h-24 rounded-2xl px-3 text-lg font-black ring-2 transition active:scale-95 ${wrong.includes('eq') ? 'bg-slate-100 text-slate-400 ring-slate-200' : 'bg-white text-sky-950 ring-sky-200'}`}>=<br /><span className="text-xs">Eşitler</span></button>
        )}
        {card('b', level.b)}
      </div>
      <Readout x={boat.x} D={D} decimal={decimal} grade={grade} />
      <Partition dens={level.dens} den={den} setDen={setDen} decimal={level.decimal} D={D} />
      {!strips && !done && (
        <button type="button" onClick={showStrips} className="btn-ghost min-h-12"><Lightbulb size={18} className="text-amber-500" />Şeritlerle bak</button>
      )}
      {(strips || done) && (
        <div className="grid gap-2">
          <StripCard q={level.a} color="#0ea5e9" title={<>Ada A: <MathText text={label(level.a)} /></>} />
          <StripCard q={level.b} color="#f97316" title={<>Ada B: <MathText text={label(level.b)} /></>} />
        </div>
      )}
      {nudge && !done && <Nudge key={nudge.q} question={nudge.q} misconception={nudge.m} {...fracTool(grade)} onClose={() => setNudge(null)} />}
      {done && (
        <>
          <Nudge tone="ok" question={answer === 'eq' ? 'Evet, ikisi aynı noktada!' : `Köprü kuruldu: ${label(answer === 'a' ? level.a : level.b)} > ${label(answer === 'a' ? level.b : level.a)}`} />
          <StrategyPicker options={level.strategies} onPick={() => {}} />
        </>
      )}
    </Layout>
  )
}

/* ───────────────────────── 6) Yük iskelesi (bir çokluğun kesri) ───────────────────────── */

function ShareLevel({ level, onDone }: Ctx & { level: Extract<Level, { kind: 'share' }> }) {
  const track = useTracker()
  const [g, setG] = useState(0)
  const [loaded, setLoaded] = useState<boolean[]>(() => Array(level.total).fill(false))
  const [nudge, setNudge] = useState<{ q: string; m?: string } | null>(null)
  const [tries, setTries] = useState(0)
  const [done, setDone] = useState(false)
  const need = (level.total * level.frac.n) / level.frac.d
  const size = g && level.total % g === 0 ? level.total / g : 0
  const count = loaded.filter(Boolean).length
  const lbl = label(level.frac)

  const tapCrate = (i: number) => {
    if (done) return
    setNudge(null)
    setLoaded((l) => {
      const n = [...l]
      if (size) {
        const s = Math.floor(i / size) * size
        const on = !l[i]
        for (let k = s; k < s + size; k++) n[k] = on
      } else n[i] = !n[i]
      return n
    })
  }

  const check = () => {
    const ok = count === need
    track.attempt(ok)
    if (ok) {
      setDone(true)
      sfx.ok()
      celebrate()
      if (g === level.frac.d) track.strategy('Gruplara ayırma')
      track.item(tries === 0)
      onDone({ first: tries === 0, bonus: 0 })
      return
    }
    sfx.bad()
    setTries((t) => t + 1)
    if (count === level.frac.n) return setNudge({ q: `${lbl} demek ${level.frac.n} sandık mı? Önce sandıkları ${level.frac.d} eş gruba ayır; her grup bütünün kaçta kaçı olur?`, m: 'Bir çokluğun kesrini bulurken payı doğrudan sayı olarak aldı' })
    if (count === level.total / level.frac.d) return setNudge({ q: `Bu, sandıkların [[1/${level.frac.d}]]’i. ${lbl} için kaç grup gerekiyordu?` })
    setNudge({ q: `Şu an ${count} sandık yüklü. Sandıkları ${level.frac.d} eş gruba ayırınca her grupta kaç sandık olur? Kaç grup yüklemelisin?` })
  }

  const groups: number[][] = []
  for (let i = 0; i < level.total; i += size || level.total) groups.push(Array.from({ length: size || level.total }, (_, k) => i + k))

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="relative min-w-0 self-start overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,#8fd3f7_0%,#d7f1ff_34%,#2aa6d8_34%,#0b6aa0_100%)] p-4 pt-6 shadow-[0_10px_30px_rgb(3_105_161/0.25)]">
        <svg viewBox="0 0 400 120" className="mx-auto mb-2 block w-full max-w-lg" aria-hidden>
          <g className={done ? 'transition-transform duration-1000' : ''} style={{ transform: done ? 'translateX(30px)' : undefined }}>
            <path d="M120 86 L330 86 L306 112 L146 112 Z" fill="#7c2d12" />
            <path d="M120 86 L330 86 L326 92 L124 92 Z" fill="#fbbf24" />
            <rect x={150} y={52} width={110} height={34} rx={4} fill="#fef3c7" stroke="#7c2d12" strokeWidth={2} />
            {Array.from({ length: Math.min(12, count) }, (_, i) => <rect key={i} x={156 + (i % 6) * 17} y={i < 6 ? 70 : 56} width={14} height={12} rx={2} fill="#ea580c" stroke="#7c2d12" />)}
            <rect x={268} y={12} width={4} height={74} fill="#4b2e14" />
            <path d="M272 14 L310 30 L272 46 Z" fill="#d6457a" />
          </g>
          <path d="M0 112 q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#fff" strokeWidth={2} fill="none" opacity={0.5} />
        </svg>
        <div className="rounded-2xl bg-[#8b5e34] p-3 shadow-[inset_0_-6px_0_#6b4423] sm:p-4">
          <p className="mb-2 text-center text-sm font-black text-amber-100">İskele · {level.total} sandık{size ? ` · ${g} grup, her grupta ${size} sandık` : ''}</p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {groups.map((grp, gi) => (
              <div key={gi} className={`flex flex-wrap justify-center gap-1.5 rounded-xl p-1.5 ${size ? 'bg-amber-900/40 ring-2 ring-amber-200/60' : ''}`}>
                {grp.map((i) => (
                  <button key={i} type="button" onClick={() => tapCrate(i)} aria-pressed={loaded[i]} aria-label={`Sandık ${i + 1}`} className={`size-12 rounded-lg border-2 text-lg transition active:scale-90 ${loaded[i] ? 'border-orange-800 bg-orange-500 shadow-[0_3px_0_#7c2d12] -translate-y-1' : 'border-amber-900 bg-[repeating-linear-gradient(90deg,#d6a35c_0_8px,#c8924a_8px_10px)]'}`}>
                    {loaded[i] ? '✓' : ''}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-center text-lg font-black text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.4)]">Gemide {count} sandık var</p>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <TaskCard>{level.prompt}</TaskCard>
        <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
          <p className="mb-2 text-xs font-black tracking-wide text-sky-800 uppercase">Sandıkları eş gruplara ayır</p>
          <div className="flex flex-wrap gap-1.5">
            <PickBtn on={!g} onClick={() => setG(0)} disabled={done}>Yok</PickBtn>
            {level.groups.map((k) => <PickBtn key={k} on={g === k} onClick={() => { setG(k); setLoaded(Array(level.total).fill(false)) }} disabled={done}>{k}</PickBtn>)}
          </div>
          {g > 0 && !size && <p className="mt-2 text-[13px] font-bold text-orange-700">{level.total} sandık {g} eş gruba ayrılamıyor: biri hep eksik ya da fazla kalıyor!</p>}
          {size > 0 && <p className="mt-2 text-[13px] font-bold text-ink-soft">Her grup sandıkların <MathText text={`[[1/${g}]]`} />’i. Bir gruba dokununca tamamı yüklenir.</p>}
        </div>
        {!done && <BigButton onClick={check} disabled={count === 0}><Ship size={20} />Gemiyi yükle</BigButton>}
        {nudge && !done && <Nudge key={nudge.q} question={nudge.q} misconception={nudge.m} tool="fractions" toolConfig={{ dens: [2, 3, 4, 6, 12] }} toolTitle="Kesir şeritleri" onClose={() => setNudge(null)} />}
        {done && (
          <>
            <Nudge tone="ok" question={`Tam ${need} sandık! ${level.total} sandığın ${lbl}’ü = ${level.frac.d} gruptan ${level.frac.n} grup = ${need} sandık.`} />
            <StrategyPicker options={['Gruplara ayırdım', 'Önce dörtte birini buldum', 'Yarısını ve yarısının yarısını aldım']} onPick={() => {}} />
          </>
        )}
      </div>
    </div>
  )
}
