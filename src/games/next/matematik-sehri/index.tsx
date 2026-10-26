import { useMemo, useRef, useState } from 'react'
import { ArrowRight, Hammer, Lightbulb, Move, RotateCcw } from 'lucide-react'
import type { GameProps } from '../../kit'
import { starsFor } from '../../kit'
import { BigButton, LevelDots, Nudge, Scene, StrategyPicker, TaskCard, useSolutions } from '../../kit2'
import { Plane } from '../../../interactive/Plane'
import { useTracker } from '../../../lib/trackerContext'
import { sfx } from '../../../lib/feedback'
import type { Grade } from '../../../data/types'
import { CityLayer, cellAt } from './CityMap'
import { GOAL, MAP_H, MAP_W, START, adj, area, dims, findSpot, fits, key, occupied, perim, same, shortest, tl, turns, type Built, type Cell, type Rect } from './city'
import { areaUnit, costOf, insightFor, missionsFor, type Mission } from './missions'
import { DesignCard, NumPad, Stat } from './ui'

/**
 * Matematik Şehri — öğrenci kendi şehrini kurar.
 * Yol uzunluğu (birim yineleme), park çevresi (çit), bina tabanı (alan) ve bütçe görevleri.
 * Açık uçlu tasarım görevlerinde farklı geçerli tasarımlar useSolutions ile toplanır.
 */

interface Result {
  first: boolean
  extra: number
  designs: number
  road?: Cell[]
  built?: Built
}

type Msg = { text: string; tone: 'ok' | 'think'; mis?: string; tool?: boolean; id: number }

export default function MatematikSehri({ grade, onFinish }: GameProps) {
  const missions = useMemo(() => missionsFor(grade), [grade])
  const [idx, setIdx] = useState(0)
  const [road, setRoad] = useState<Cell[]>([])
  const [built, setBuilt] = useState<Built[]>([])
  const stats = useRef({ first: 0, extra: 0, designs: 0 })

  const done = (r: Result) => {
    const s = stats.current
    if (r.first) s.first++
    s.extra += r.extra
    s.designs += r.designs
    if (r.road) setRoad(r.road)
    if (r.built) setBuilt((b) => [...b, r.built!])
    if (idx + 1 < missions.length) {
      setIdx(idx + 1)
      return
    }
    const n = missions.length
    const ratio = Math.min(1, s.first / n + (s.extra >= 2 ? 0.1 : 0))
    const items = built.length + (r.built ? 1 : 0) + 1
    onFinish({
      stars: starsFor(ratio),
      score: s.first * 100 + (n - s.first) * 60 + s.extra * 25 + s.designs * 10,
      summary: `Şehrine ${items} yapı ekledin ve ${s.designs} farklı tasarım buldun.`,
      insight: insightFor(grade),
    })
  }

  const m = missions[idx]
  return (
    <Scene grade={grade}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <LevelDots current={idx} total={missions.length} />
          <span className="text-sm font-black text-ink-soft">Görev {idx + 1}/{missions.length} · {m.title}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="chip bg-white px-3 py-1 text-sm text-ink ring-1 ring-line">🟩 1 kare = 1 m</span>
          <span className="chip bg-sky-50 px-3 py-1 text-sm text-sky-900 ring-1 ring-sky-200">🏙️ Şehrinde {built.length + (road.length ? 1 : 0)} yapı</span>
        </div>
      </div>
      <MissionView key={idx} m={m} grade={grade} step={idx + 1} total={missions.length} road={road} built={built} onDone={done} />
    </Scene>
  )
}

function MissionView({ m, grade, step, total, road, built, onDone }: { m: Mission; grade: Grade; step: number; total: number; road: Cell[]; built: Built[]; onDone: (r: Result) => void }) {
  const track = useTracker()
  const sol = useSolutions()
  const unitA = areaUnit(grade)
  const occ = useMemo(() => occupied(road, built), [road, built])
  const seen = useRef(new Set<string>())
  const [wrong, setWrong] = useState(0)
  const [hintN, setHintN] = useState(0)
  const [msg, setMsg] = useState<Msg | null>(null)
  const [phase, setPhase] = useState<'work' | 'ask' | 'follow' | 'done'>(m.kind === 'compute' ? 'ask' : 'work')
  const [picked, setPicked] = useState<string | null>(null)
  const [strategyDone, setStrategyDone] = useState(false)
  const result = useRef<Result>({ first: true, extra: 0, designs: 0 })
  const geo = m.kind !== 'road'

  const say = (text: string, tone: 'ok' | 'think' = 'think', mis?: string, tool?: boolean) => setMsg({ text, tone, mis, tool, id: Math.random() })
  const fail = (text: string, mis?: string) => {
    setWrong((w) => w + 1)
    track.attempt(false)
    sfx.bad()
    say(text, 'think', mis, geo)
  }
  const complete = (text: string, extra: Partial<Result> = {}) => {
    if (phase === 'done') return
    const first = wrong === 0 && hintN === 0
    track.item(first)
    result.current = { ...result.current, ...extra, first }
    setPhase('done')
    say(text, 'ok')
  }
  const newSolution = (k: string, label: string) => {
    if (seen.current.has(k)) return false
    seen.current.add(k)
    if (!sol.add(k, label)) sfx.ok()
    track.attempt(true)
    return true
  }
  const hint = () => {
    track.hint()
    say(m.hints[Math.min(hintN, m.hints.length - 1)], 'think', undefined, geo)
    setHintN((h) => h + 1)
  }

  // ── yol ──
  const [path, setPath] = useState<Cell[]>([START])
  const lastRoad = useRef<Cell[] | null>(null)
  const best = useMemo(() => shortest(START, GOAL, occ), [occ])
  const roadLen = path.length - 1
  const onPath = (p: Cell[]) => {
    setPath(p)
    if (m.kind !== 'road' || phase !== 'work') return
    const head = p[p.length - 1]
    if (!same(head, GOAL)) return
    const len = p.length - 1
    if (len > best) {
      fail(`Yolun ${len} m oldu. Daha kısa bir yol var! Geri dönen ya da dolanan bir yer var mı?`)
      return
    }
    const k = p.map(key).join('|')
    if (!newSolution(k, `Yol ${seen.current.size + 1}: ${len} m`)) {
      say('Bu yolu zaten buldun. Farklı karelerden geçen başka bir en kısa yol dene!')
      return
    }
    lastRoad.current = p
    const t = turns(p)
    track.strategy(t <= 1 ? 'Tek dönüşlü (L biçimli) yol' : t >= 4 ? 'Basamaklı (zikzak) yol' : 'Birkaç dönüşlü yol')
    const found = seen.current.size
    if (found >= m.goal) {
      if (m.ask) {
        setPhase('ask')
        say(found >= 2 ? `Farklı yollar ama ikisi de ${len} m! Sağa ve aşağı gidilecek kare sayısı hiç değişmiyor.` : `Harika! En kısa yol ${len} m.`, 'ok')
      } else complete(found >= 2 ? `Farklı yollar ama hepsi ${len} m! Okula doğru kaç kare sağa, kaç kare aşağı gittiğin değişmiyor; yalnızca sırası değişiyor.` : `Harika! En kısa yol ${len} m.`, { road: p, designs: found })
    } else say(`Harika! En kısa yol ${len} m. Şimdi farklı karelerden geçen başka bir en kısa yol bul: “Yeni yol”a bas.`, 'ok')
  }
  const onTap = (pt: { x: number; y: number }) => {
    if (m.kind !== 'road' || phase !== 'work') return
    const c = cellAt(pt)
    const i = path.findIndex((p) => same(p, c))
    if (i >= 0) return onPath(path.slice(0, i + 1))
    const head = path[path.length - 1]
    if (same(head, GOAL)) return
    if (adj(c, head) && !occ.has(key(c)) && c[0] >= 0 && c[1] >= 0 && c[0] < MAP_W && c[1] < MAP_H) onPath([...path, c])
  }

  // ── sabit nesneler (çit, hesap, sayma) ──
  const spot = useMemo<Rect | null>(() => {
    if (m.kind === 'fence' || m.kind === 'compute') return findSpot(m.size[0], m.size[1], occ, m.at)
    if (m.kind === 'count') {
      const w = Math.max(...m.cells.map((c) => c[0])) + 2, h = Math.max(...m.cells.map((c) => c[1])) + 1
      return findSpot(w, h, occ, m.at)
    }
    return null
  }, [m, occ])
  const [sides, setSides] = useState([false, false, false, false])
  const onSide = (i: number) => {
    const s = sides.map((v, j) => v || j === i)
    setSides(s)
    if (s.every(Boolean)) {
      setPhase('ask')
      say('Çit tamam! Şimdi soruyu cevapla.', 'ok')
    }
  }
  const countCells = useMemo<Cell[]>(() => (m.kind === 'count' && spot ? m.cells.map(([x, y]) => [spot.x + 1 + x, spot.y + y] as Cell) : []), [m, spot])
  const [estimate, setEstimate] = useState<number | null>(null)
  const [counted, setCounted] = useState<Map<string, number>>(new Map())
  const countUse = useRef({ cell: 0, row: 0 })
  const addCounted = (cs: Cell[]) => {
    if (m.kind !== 'count' || phase !== 'work') return
    const next = new Map(counted)
    for (const c of cs) if (!next.has(key(c))) next.set(key(c), next.size + 1)
    setCounted(next)
    if (next.size === countCells.length) {
      const u = countUse.current
      track.strategy(u.row && !u.cell ? 'Sıra sıra sayma' : u.cell && !u.row ? 'Tek tek sayma' : 'Sıra ve tek tek karışık sayma')
      track.attempt(true)
      const okEst = estimate === m.correctRange
      complete(`Bahçe ${countCells.length} birimkare! Tahminin “${m.estimate[estimate ?? 0]}” idi — ${okEst ? 'çok iyi bir tahmin!' : 'şimdi bu büyüklüğü gözünde canlandırabilirsin.'}`, { built: { id: `g${step}`, art: 'bahce', r: spot!, cells: countCells } })
    }
  }

  // ── tasarım ──
  const [rect, setRect] = useState<Rect>(() => {
    if (m.kind !== 'design') return { x: 0, y: 0, w: 1, h: 1 }
    // Büyümeye yer kalsın diye önce geniş bir boş alan ara, parçayı ortasına koy
    const o = occupied(road, built)
    const [w, h] = m.start
    for (const [rw, rh] of [[8, 7], [7, 6], [6, 5], [w, h]]) {
      const s = findSpot(Math.max(w, rw), Math.max(h, rh), o, m.at)
      if (s) return { x: s.x + Math.floor((s.w - w) / 2), y: s.y + Math.floor((s.h - h) / 2), w, h }
    }
    return { x: 14, y: 8, w, h }
  })
  const [designs, setDesigns] = useState<{ k: string; r: Rect; opt: boolean }[]>([])
  const rectOk = fits(rect, occ)
  const build = () => {
    if (m.kind !== 'design' || phase !== 'work') return
    if (!rectOk) return say(`Bu yer dolu ya da harita dışında. ${m.art === 'bina' ? 'Binayı' : 'Parkı'} boş bir yere sürükle, sonra yeniden “Kur”a bas.`)
    const v = m.check(rect)
    if (!v.ok) return fail(v.msg, v.misconception)
    const k = dims(rect)
    const isNew = newSolution(k, `${Math.min(rect.w, rect.h)} × ${Math.max(rect.w, rect.h)}`)
    if (!isNew) {
      say('Bu ölçüleri zaten buldun (döndürülmüş hâli de aynı dikdörtgen). Başka bir biçim dene!')
      return
    }
    const list = [...designs, { k, r: rect, opt: !!v.optimal }]
    setDesigns(list)
    const reached = m.optimal ? !!v.optimal : list.length >= m.goal
    if (!reached) {
      say(m.optimal ? v.msg : `${v.msg} Şimdi farklı biçimde bir tane daha bul!`, 'ok')
      return
    }
    if (m.optimal && list.length >= 2) {
      const gaps = list.map((d) => Math.abs(d.r.w - d.r.h))
      if (gaps[gaps.length - 1] < gaps[0]) track.strategy('Kareye yaklaştırma')
    }
    if (m.follow) {
      setPhase('follow')
      say(v.msg, 'ok')
    } else complete(v.msg, { built: { id: `d${step}`, art: m.art, r: rect, fence: m.fence, label: m.label }, designs: list.length, extra: Math.max(0, list.length - m.goal) })
  }
  const relocate = () => {
    const s = findSpot(rect.w, rect.h, occ, [rect.x + rect.w / 2, rect.y + rect.h / 2])
    if (s) setRect(s)
    else say('Bu büyüklükte boş yer kalmadı. Biraz küçültüp yeniden dene.')
  }
  const commitDesign = (r: Rect, text: string) => {
    if (m.kind !== 'design') return
    complete(text, { built: { id: `d${step}`, art: m.art, r, fence: m.fence, label: m.label }, designs: designs.length, extra: Math.max(0, designs.length - m.goal) })
  }
  const pickDesign = (d: { k: string; r: Rect }) => {
    if (m.kind !== 'design' || m.follow?.kind !== 'pick' || phase !== 'follow') return
    const f = m.follow
    const val = (r: Rect) => (f.best === 'minPerim' ? perim(r) : area(r))
    const target = f.best === 'minPerim' ? Math.min(...designs.map((x) => val(x.r))) : Math.max(...designs.map((x) => val(x.r)))
    setPicked(d.k)
    if (val(d.r) === target) {
      track.attempt(true)
      commitDesign(d.r, f.best === 'minPerim' ? `Evet! ${d.r.w} × ${d.r.h} parkın çevresi ${perim(d.r)} m, en az çit bu parkta. Şehrine bu park eklendi.` : `Evet! ${d.r.w} × ${d.r.h} parkın alanı ${area(d.r)} ${unitA}. Çevreleri aynı, alanları farklı! Bu park şehrine eklendi.`)
    } else fail(f.why)
  }

  // ── sayısal cevap ──
  const answerFor = () => {
    if (m.kind === 'road' && m.ask) return best * m.ask.per
    if (m.kind === 'fence' || m.kind === 'compute') return m.answer
    if (m.kind === 'design' && m.follow?.kind === 'num') return m.follow.answer
    return NaN
  }
  const submit = (n: number) => {
    const ans = answerFor()
    if (n === ans) {
      track.attempt(true)
      if (m.kind === 'road') return complete(`Doğru! ${best} m × ${m.ask!.per} TL = ${tl(ans)}.`, { road: lastRoad.current ?? path, designs: seen.current.size, extra: Math.max(0, seen.current.size - m.goal) })
      if (m.kind === 'fence') return complete(m.unit === 'TL' ? `Doğru! ${perim(spot!)} m çit × 3 TL = ${tl(ans)}.` : `Doğru! ${spot!.w} + ${spot!.h} + ${spot!.w} + ${spot!.h} = ${ans} m. Parkın çevresi ${ans} m.`, { built: { id: `f${step}`, art: m.art, r: spot!, fence: true } })
      if (m.kind === 'compute') return complete(`Doğru! Toplam ${tl(ans)}.`, { built: { id: `c${step}`, art: m.art, r: spot!, fence: m.fence } })
      if (m.kind === 'design') {
        const last = designs[designs.length - 1]
        return commitDesign(rectOk && m.check(rect).ok ? rect : last.r, `Doğru! 7 + 3 = 10, çevrenin yarısı. Bahçen şehrine eklendi.`)
      }
      return
    }
    const d = m.kind === 'road' ? m.ask!.diagnose(n, best) : m.kind === 'fence' || m.kind === 'compute' ? m.diagnose(n) : m.kind === 'design' && m.follow?.kind === 'num' ? m.follow.diagnose(n) : { msg: 'Bir daha düşün.' }
    fail(d.msg, d.misconception)
  }
  const choose = (i: number) => {
    if (m.kind !== 'design' || m.follow?.kind !== 'choice') return
    if (i === m.follow.answer) {
      track.attempt(true)
      const last = designs[designs.length - 1]
      commitDesign(rectOk && m.check(rect).ok ? rect : last.r, 'Evet! Çitleri aynı uzunlukta ama içlerindeki kare sayısı farklı. Şehrine son parkın eklendi.')
    } else fail(m.follow.wrong)
  }

  const next = () => onDone(result.current)

  // ── harita ──
  const plane = (
    <Plane initial={{ xMin: -0.9, xMax: MAP_W + 0.9, yMin: -0.9, yMax: MAP_H + 0.9 }} aspect={(MAP_H + 1.8) / (MAP_W + 1.8)} grid={false} axes={false} labels={false} fixedStep={1} minSpan={6} maxSpan={44} onTap={onTap} label="Şehir haritası">
      <CityLayer
        road={road}
        built={phase === 'done' && result.current.built ? [...built, result.current.built] : built}
        roadEdit={m.kind === 'road' ? { path, onChange: onPath, blocked: occ, numbers: grade <= 4, locked: phase !== 'work' } : undefined}
        piece={m.kind === 'design' && phase !== 'done' ? { r: rect, onChange: (r) => phase === 'work' && setRect(r), art: m.art, ok: rectOk, show: m.show, fence: m.fence, label: m.label } : undefined}
        fence={m.kind === 'fence' && spot && phase !== 'done' ? { r: spot, art: m.art, sides, onSide } : undefined}
        focus={m.kind === 'compute' && spot && phase !== 'done' ? { r: spot, art: m.art, fence: m.fence, show: m.show } : undefined}
        count={m.kind === 'count' && spot && estimate !== null && phase !== 'done' ? { cells: countCells, reveal: true, counted, done: false, onCell: (c) => { countUse.current.cell++; addCounted([c]) }, onRow: (y) => { countUse.current.row++; addCounted(countCells.filter((c) => c[1] === y).sort((a, b) => a[0] - b[0])) } } : m.kind === 'count' && phase !== 'done' ? { cells: countCells, reveal: false, counted, done: true, onCell: () => {}, onRow: () => {} } : undefined}
      />
    </Plane>
  )

  // ── panel ──
  const r = rect
  const panel = (
    <aside className="flex min-w-0 flex-col gap-3">
      <TaskCard step={step} total={total}>{m.prompt}</TaskCard>

      {m.kind === 'road' && (
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Yolun uzunluğu" value={`${roadLen} m`} tone={same(path[path.length - 1], GOAL) ? (roadLen === best ? 'green' : 'amber') : 'blue'} />
          <Stat label="Bulunan en kısa yol" value={`${seen.current.size} / ${m.goal}`} tone="slate" />
          {phase === 'work' && (
            <button type="button" onClick={() => setPath([START])} className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white font-extrabold ring-1 ring-line active:scale-[0.98]">
              <RotateCcw size={18} />Yeni yol
            </button>
          )}
        </div>
      )}

      {m.kind === 'count' && estimate === null && (
        <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
          <p className="mb-2 text-sm font-black">Önce tahmin et: bahçe kaç birimkare?</p>
          <div className="grid grid-cols-2 gap-2">
            {m.estimate.map((e, i) => (
              <button key={e} type="button" onClick={() => { setEstimate(i); say('Şimdi say! Karelere dokun ya da soldaki → düğmesiyle bir sırayı bir kerede say.', 'ok') }} className="min-h-12 rounded-xl bg-amber-50 px-2 text-sm font-extrabold text-amber-900 ring-1 ring-amber-200 active:scale-95">{e}</button>
            ))}
          </div>
        </div>
      )}
      {m.kind === 'count' && estimate !== null && (
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Tahminin" value={<span className="text-base">{m.estimate[estimate]}</span>} tone="amber" />
          <Stat label="Saydığın" value={`${counted.size} birimkare`} tone={counted.size === countCells.length ? 'green' : 'blue'} />
        </div>
      )}

      {m.kind === 'fence' && phase === 'work' && (
        <Stat label="Kurulan kenar" value={`${sides.filter(Boolean).length} / 4`} tone="amber" />
      )}

      {m.kind === 'design' && phase !== 'done' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Kenarlar" value={`${r.w} m × ${r.h} m`} tone="blue" wide={!m.show.includes('perim') && !m.show.includes('area')} />
            {m.show.includes('perim') && <Stat label="Çevre" value={`${perim(r)} m`} />}
            {m.show.includes('area') && <Stat label="Alan" value={`${area(r)} ${unitA}`} tone="green" />}
            {m.show.includes('rows') && <Stat wide tone="green" label="Sıra × bir sıradaki kare" value={<span>{r.h} sıra × {r.w} = {area(r)} m²</span>} />}
            {m.show.includes('cost') && m.budget && (
              <Stat wide tone={costOf(r, m.budget) === m.budget.total ? 'green' : costOf(r, m.budget) > (m.budget.total ?? Infinity) ? 'red' : 'amber'} label={m.budget.fence ? 'Çitin maliyeti' : 'Çimin maliyeti'} value={`${tl(costOf(r, m.budget))} / ${tl(m.budget.total ?? 0)}`} />
            )}
            {m.show.includes('costx') && m.budget && (
              <div className="col-span-2 rounded-2xl bg-white p-3 text-sm font-bold ring-1 ring-line tabular-nums">
                <p className="flex justify-between"><span>Çit: {perim(r)} m × {m.budget.fence} TL</span><span>{tl(perim(r) * (m.budget.fence ?? 0))}</span></p>
                <p className="flex justify-between"><span>Çim: {area(r)} m² × {m.budget.grass} TL</span><span>{tl(area(r) * (m.budget.grass ?? 0))}</span></p>
                <p className="mt-1 flex justify-between border-t border-line pt-1 text-base font-black"><span>Toplam</span><span>{tl(costOf(r, m.budget))}</span></p>
                <p className={`flex justify-between text-base font-black ${costOf(r, m.budget) > (m.budget.total ?? 0) ? 'text-rose-600' : 'text-emerald-700'}`}>
                  <span>{costOf(r, m.budget) > (m.budget.total ?? 0) ? 'Aşan' : 'Kalan'}</span><span>{tl(Math.abs((m.budget.total ?? 0) - costOf(r, m.budget)))}</span>
                </p>
              </div>
            )}
          </div>
          {phase === 'work' && !rectOk && (
            <button type="button" onClick={relocate} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-rose-50 px-4 font-extrabold text-rose-800 ring-1 ring-rose-200 active:scale-[0.98]">
              <Move size={18} />Boş bir yere taşı
            </button>
          )}
          {phase === 'work' && (
            <BigButton onClick={build} className="w-full"><Hammer size={20} />Kur!</BigButton>
          )}
          {phase === 'work' && <p className="-mt-1 text-center text-xs font-bold text-ink-soft">Köşeleri çek · ortadan sürükle · iki parmakla büyüt</p>}
        </>
      )}

      {msg && (
        <Nudge key={msg.id} question={msg.text} tone={msg.tone} misconception={msg.mis} tool={msg.tool ? 'geoboard' : undefined} toolConfig={{ size: 8 }} toolTitle="Geometri tahtasında dene" />
      )}

      {phase === 'ask' && (
        <div className="animate-fade-up">
          <p className="mb-2 text-base font-black">{m.kind === 'road' ? m.ask?.q : m.kind === 'fence' || m.kind === 'compute' ? m.ask : ''}</p>
          <NumPad unit={m.kind === 'fence' ? m.unit : 'TL'} onSubmit={submit} />
        </div>
      )}

      {m.kind === 'design' && designs.length > 0 && (
        <div className="rounded-2xl bg-white/90 p-3 ring-1 ring-line">
          <p className="mb-2 text-sm font-black">{phase === 'follow' && m.follow?.kind === 'pick' ? m.follow.q : `Bulduğun tasarımlar: ${designs.length}${m.optimal ? '' : ` / ${m.goal}`}`}</p>
          <div className="grid grid-cols-2 gap-2">
            {(m.optimal ? [...designs].sort((a, b) => area(b.r) - area(a.r)) : designs).map((d) => (
              <DesignCard
                key={d.k}
                r={d.r}
                unitA={unitA}
                showArea={phase === 'done' || (grade >= 4 && !(phase === 'follow' && m.follow?.kind === 'pick' && m.follow.best === 'maxArea'))}
                showPerim={phase === 'done' || !(phase === 'follow' && m.follow?.kind === 'pick' && m.follow.best === 'minPerim')}
                extra={m.budget && m.show.includes('costx') ? tl(costOf(d.r, m.budget)) : undefined}
                state={d.opt ? 'best' : picked === d.k ? (phase === 'done' ? 'best' : 'wrong') : 'idle'}
                onClick={phase === 'follow' && m.follow?.kind === 'pick' ? () => pickDesign(d) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {phase === 'follow' && m.kind === 'design' && m.follow?.kind === 'choice' && (
        <div className="rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-200 animate-fade-up">
          <p className="mb-2 text-base font-black text-sky-950">{m.follow.q}</p>
          <div className="flex flex-col gap-2">
            {m.follow.choices.map((c, i) => (
              <button key={c} type="button" onClick={() => choose(i)} className="min-h-12 rounded-xl bg-white px-3 text-left font-extrabold text-sky-950 ring-1 ring-sky-200 active:scale-[0.98]">{c}</button>
            ))}
          </div>
        </div>
      )}
      {phase === 'follow' && m.kind === 'design' && m.follow?.kind === 'num' && (
        <div className="animate-fade-up">
          <p className="mb-2 text-base font-black">{m.follow.q}</p>
          <NumPad unit={m.follow.unit} onSubmit={submit} />
        </div>
      )}

      {phase === 'done' && m.picker && !strategyDone && <StrategyPicker options={m.picker} onPick={() => setStrategyDone(true)} />}

      <div className="mt-auto flex gap-2 pt-1">
        {phase !== 'done' && (
          <button type="button" onClick={hint} className="inline-flex min-h-12 items-center gap-1.5 rounded-2xl bg-amber-50 px-4 font-extrabold text-amber-900 ring-1 ring-amber-200 active:scale-95">
            <Lightbulb size={18} />İpucu
          </button>
        )}
        {phase === 'done' && (
          <BigButton onClick={next} className="flex-1">{step < total ? <>Sonraki görev<ArrowRight size={20} /></> : 'Şehri tamamla 🎉'}</BigButton>
        )}
      </div>
    </aside>
  )

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">{plane}</div>
      {panel}
    </div>
  )
}
