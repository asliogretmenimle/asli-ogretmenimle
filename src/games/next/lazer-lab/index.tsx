import { useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Crosshair, FlaskConical, HelpCircle, Lightbulb, Minus, Plus, RotateCcw, RotateCw, Sparkles, Trash2, Zap } from 'lucide-react'
import { starsFor, useFrame, useWidth, type GameProps } from '../../kit'
import { LevelDots, Nudge, Scene, SolutionList, StrategyPicker, useSolutions } from '../../kit2'
import { Plane } from '../../../interactive/Plane'
import { MathText } from '../../../components/MathText'
import { useTracker } from '../../../lib/trackerContext'
import { sfx } from '../../../lib/feedback'
import { Lab, BEAM_COLORS, type EmitterState, type MeasureState } from './Lab'
import { INSIGHT, MISSIONS, type Ctx, type Mark, type Mission, type NudgeMsg, type Step } from './missions'
import { bounceAngles, dist, fmtN, lineEq, norm180, norm360, slopeFrac, solutionKey, trace, type Mirror, type Pt, type Trace, type World } from './optics'

/**
 * Lazer Laboratuvarı (6–8. sınıf)
 * Her deney bir görev dizisidir: tahmin et → ateşle → ölç / hesapla / gerekçelendir. Kurma görevlerinde öğrenci
 * aynaları yerleştirir, döndürür (iki parmak ya da düğmeler), yayıcıyı nişanlar. Kristale ulaşan her farklı
 * ayna/nişan düzeni (yalnızca ışının kullandığı aynalar, sırayla) useSolutions ile ayrı bir çözüm sayılır.
 */

type G = 6 | 7 | 8

const txt = (t: string | ((c: Ctx) => string), c: Ctx) => (typeof t === 'function' ? t(c) : t)
const num = (t: number | ((c: Ctx) => number), c: Ctx) => (typeof t === 'function' ? t(c) : t)
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))

function initialMirrors(m: Mission): Mirror[] {
  return m.fixed.map((f) => ({ ...f, fixed: true }))
}
function initialAims(m: Mission): Pt[] {
  return m.emitters.map((e) => ({ ...e.dir }))
}

const DEFAULT_HINTS: Record<Step['kind'], string[]> = {
  predict: ['Işın düz bir çizgide ilerler; aynaya çarptığı noktada nasıl döner?', 'Gelen ışınla ayna arasındaki açı, yansıyan ışınla ayna arasındaki açıya eşittir.'],
  build: ['Kristalden geriye doğru düşün: kristale hangi yönden ışın gelebilir?', 'Aynayı döndürünce ışın aynanın döndüğü açının iki katı kadar döner.'],
  measure: ['Açıölçerin merkezi ışının aynaya çarptığı noktada. Turuncu kolu ışının üstüne getir.'],
  number: ['Şekildeki bilinen açılara bak. Hangileri yan yana, hangileri eşit?'],
  point: ['Aynaya dik bir doğru üzerinde, aynaya aynı uzaklıkta.'],
  slope: ['Eğim = y’deki değişim ÷ x’teki değişim.'],
  strategy: [],
}

export default function LazerLab({ grade, onFinish }: GameProps) {
  const g: G = grade <= 6 ? 6 : grade >= 8 ? 8 : 7
  const dark = g >= 7
  const track = useTracker()
  const sol = useSolutions()
  const missions = MISSIONS[g]

  const [mi, setMi] = useState(0)
  const m = missions[mi]
  const [si, setSi] = useState(0)
  const step = m.steps[si]
  const [mirrors, setMirrors] = useState<Mirror[]>(() => initialMirrors(m))
  const [aims, setAims] = useState<Pt[]>(() => initialAims(m))
  const [fired, setFired] = useState<Trace[] | null>(null)
  const [prog, setProg] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [predict, setPredict] = useState<Pt | null>(null)
  const [predictMsg, setPredictMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pick, setPick] = useState<Pt | null>(null)
  const [revealed, setRevealed] = useState<string[]>([])
  const [ghosts, setGhosts] = useState<{ p: Pt; label: string }[]>([])
  const [measure, setMeasure] = useState<MeasureState | null>(null)
  const [measured, setMeasured] = useState<Mark[]>([])
  const [numVal, setNumVal] = useState(0)
  const [slope, setSlope] = useState({ rise: 1, run: 1 })
  const [selected, setSelected] = useState<string | null>(null)
  const [nudge, setNudge] = useState<{ msg: NudgeMsg; id: number } | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [stepDone, setStepDone] = useState(false)
  const [hintN, setHintN] = useState(0)
  const [errors, setErrors] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [stepSols, setStepSols] = useState<string[]>([])
  const [fewest, setFewest] = useState<string[]>([])
  const [lastUsed, setLastUsed] = useState<number | null>(null)
  const lastWin = useRef<{ mirrors: Mirror[]; aims: Pt[]; traces: Trace[] } | null>(null)
  const nid = useRef(1)
  const [wrapRef, wrapW] = useWidth<HTMLDivElement>()
  const nudgeId = useRef(0)
  const animT = useRef(0)
  const animDur = useRef(1)
  const pendingDone = useRef<Trace[] | null>(null)

  const building = step?.kind === 'build'
  const visibleTargets = useMemo(() => m.targets.filter((t) => !t.hidden || revealed.includes(t.id)), [m, revealed])
  const world: World = useMemo(() => ({ room: m.room, walls: m.walls, blocks: m.blocks, targets: visibleTargets }), [m, visibleTargets])
  const emitters: EmitterState[] = m.emitters.map((e, i) => ({ x: e.x, y: e.y, dir: aims[i], aim: building ? e.aim : 'fixed', label: e.label }))
  const ctx: Ctx = { traces: fired ?? [], mirrors }
  const placed = mirrors.filter((x) => !x.fixed)
  const inventory = building ? (step as Extract<Step, { kind: 'build' }>).inventory : 0
  const lit = fired && !animating ? [...new Set(fired.flatMap((t) => t.hits))] : []

  /* ───────────── animasyon ───────────── */
  useFrame((dt) => {
    animT.current += dt
    const p = Math.min(1, animT.current / animDur.current)
    setProg(p)
    if (p >= 1) {
      setAnimating(false)
      const tr = pendingDone.current
      pendingDone.current = null
      if (tr) onFireDone(tr)
    }
  }, animating)

  const clearBeam = () => {
    if (animating) return
    setFired(null)
    setProg(0)
    setNudge(null)
    setOkMsg(null)
  }

  const fire = () => {
    if (animating) return
    setNudge(null)
    setInfo(null)
    const trs = emitters.map((e) => trace(world, mirrors, { x: e.x, y: e.y }, e.dir))
    setFired(trs)
    const L = Math.max(...trs.map((t) => t.length))
    animDur.current = Math.max(0.7, Math.min(2.4, L / 9))
    animT.current = 0
    setProg(0)
    pendingDone.current = trs
    setAnimating(true)
  }

  const showNudge = (msg: NudgeMsg) => {
    nudgeId.current++
    setNudge({ msg, id: nudgeId.current })
  }

  const miss = (msg: NudgeMsg) => {
    track.attempt(false)
    setErrors((e) => e + 1)
    showNudge(msg)
    sfx.bad()
  }

  const succeed = (text: string) => {
    track.attempt(true)
    setNudge(null)
    setOkMsg(text)
    setStepDone(true)
    sfx.ok()
  }

  function onFireDone(trs: Trace[]) {
    const c: Ctx = { traces: trs, mirrors }
    if (step.kind === 'predict') {
      const d = predict ? dist(predict, trs[0].end) : 99
      const ok = d <= (step.tol ?? 1.2)
      setPredictMsg({ ok, text: ok ? `Harika tahmin! Tahminin ışının vardığı noktaya yalnızca ${fmtN(d, 1)} birim uzaktaydı.` : `Tahminin ${fmtN(d, 1)} birim uzaktaydı. Işının aynada nasıl döndüğüne bak; bir sonraki tahminin daha yakın olacak!` })
      track.attempt(ok)
      if (ok) sfx.ok()
      setStepDone(true)
      return
    }
    if (step.kind !== 'build') return
    const need = visibleTargets.map((t) => t.id)
    const hit = new Set(trs.flatMap((t) => t.hits))
    const win = need.length > 0 && need.every((id) => hit.has(id))
    if (!win) {
      const end = trs.find((t) => need.some((id) => !t.hits.includes(id))) ?? trs[0]
      const msg: NudgeMsg = step.miss ?? (end.endKind === 'block'
        ? { q: 'Işın engele çarptı. Engelin üstünden geçmesi için ışının hangi yöne gitmesi gerekir? O yönü veren açıyı düşün.', tool: 'angle' }
        : end.endKind === 'max'
          ? { q: 'Işın aynalar arasında hapsoldu! Aynalardan birini biraz döndür.', tool: 'angle' }
          : { q: 'Işın kristali ıskaladı. Kristalden geriye doğru düşün: kristale hangi yönden bir ışın gelebilir? Aynayı o yöne göre çevir.', tool: 'angle' })
      showNudge(msg)
      return
    }
    // çözüm anahtarı: ayarlanabilir yayıcıların nişanı + kullanılan aynalar
    const aimKey = m.emitters
      .map((e, i) => {
        if (e.aim === 'fixed') return '-'
        const d = aims[i]
        if (e.aim === 'lattice') {
          const k = gcd(d.x, d.y) || 1
          return `${d.x / k},${d.y / k}`
        }
        return String(Math.round(norm360((Math.atan2(d.y, d.x) * 180) / Math.PI)))
      })
      .join('/')
    const key = trs.map((t) => solutionKey(mirrors, t, aimKey)).join('#')
    const used = new Set(trs.flatMap((t) => t.used)).size
    setLastUsed(used)
    lastWin.current = { mirrors, aims, traces: trs }
    const fresh = !stepSols.includes(key)
    if (fresh) {
      setStepSols((s) => [...s, key])
      sol.add(`${m.id}:${si}:${key}`, solLabel(m, mirrors, trs, aims, used))
      if (step.best !== undefined && step.inventory > step.best && used <= step.best && !fewest.includes(m.id)) setFewest((f) => [...f, m.id])
    }
    if (!stepDone) {
      track.attempt(true)
      setStepDone(true)
      setOkMsg(txt(step.ok, c))
      sfx.win()
    } else {
      setOkMsg(fresh ? `Yeni bir yol! ${txt(step.ok, c)}` : 'Bu yolu zaten bulmuştun. Farklı bir yer, açı ya da ayna sayısı dene!')
      if (fresh) sfx.ok()
    }
  }

  /* ───────────── adım geçişleri ───────────── */
  const enterStep = (i: number, fromWin?: { mirrors: Mirror[]; aims: Pt[]; traces: Trace[] } | null) => {
    const s = m.steps[i]
    const trs = fromWin ? fromWin.traces : fired
    const c: Ctx = { traces: trs ?? [], mirrors: fromWin ? fromWin.mirrors : mirrors }
    if ((s.kind === 'number' || s.kind === 'slope') && s.skip?.(c)) return enterStep(i + 1, fromWin)
    if (i >= m.steps.length) return
    setSi(i)
    setStepDone(false)
    setOkMsg(null)
    setNudge(null)
    setInfo(null)
    setHintN(0)
    setSelected(null)
    setPredictMsg(null)
    if (fromWin) {
      setMirrors(fromWin.mirrors)
      setAims(fromWin.aims)
      setFired(fromWin.traces)
      setProg(1)
    }
    if (s.kind === 'number') setNumVal(num(s.start, c))
    if (s.kind === 'slope') setSlope({ rise: 1, run: 1 })
    if (s.kind === 'measure') setMeasure({ b: s.b, ray: s.ray, value: 90, locked: false })
    else setMeasure(null)
    if (s.kind === 'point') setPick(null)
    if (s.kind === 'predict') {
      setPredict(null)
      setFired(null)
      setProg(0)
    }
    if (s.kind === 'build') {
      setStepSols([])
      setLastUsed(null)
      lastWin.current = null
      if (s.reveal) setRevealed((r) => [...new Set([...r, ...s.reveal!])])
      setFired(null)
      setProg(0)
      const firstAdj = m.emitters.findIndex((e) => e.aim !== 'fixed')
      if (s.inventory === 0 && firstAdj >= 0) setSelected(`e:${firstAdj}`)
    }
  }

  const resetMission = (k: number) => {
    const nm = missions[k]
    setMi(k)
    setSi(0)
    setMirrors(initialMirrors(nm))
    setAims(initialAims(nm))
    setFired(null)
    setProg(0)
    setPredict(null)
    setPredictMsg(null)
    setPick(null)
    setRevealed([])
    setGhosts([])
    setMeasure(null)
    setMeasured([])
    setSelected(null)
    setNudge(null)
    setOkMsg(null)
    setInfo(null)
    setStepDone(false)
    setHintN(0)
    setErrors(0)
    setStepSols([])
    setLastUsed(null)
    lastWin.current = null
    const s0 = nm.steps[0]
    if (s0.kind === 'build') {
      const firstAdj = nm.emitters.findIndex((e) => e.aim !== 'fixed')
      if (s0.inventory === 0 && firstAdj >= 0) setSelected(`e:${firstAdj}`)
      if (s0.reveal) setRevealed(s0.reveal)
    }
  }

  const next = () => {
    if (si + 1 < m.steps.length) {
      enterStep(si + 1, step.kind === 'build' ? lastWin.current : null)
      return
    }
    // deney bitti
    const first = errors === 0
    track.item(first)
    const res = [...results, first]
    setResults(res)
    if (mi + 1 >= missions.length) {
      const n = missions.length
      const firsts = res.filter(Boolean).length
      const builds = missions.reduce((s, x) => s + x.steps.filter((t) => t.kind === 'build').length, 0)
      const extra = Math.max(0, sol.list.length - builds)
      const ratio = Math.min(1, (firsts + 0.6 * (n - firsts)) / n + Math.min(0.15, extra * 0.05) + fewest.length * 0.02)
      onFinish({
        stars: starsFor(ratio),
        score: firsts * 100 + (n - firsts) * 60 + extra * 25 + fewest.length * 20,
        summary: `${n} deney tamamlandı · İlk denemede: ${firsts} · Bulunan yol: ${sol.list.length}${fewest.length ? ` · En az ayna: ${fewest.length}` : ''}`,
        insight: INSIGHT[g],
      })
      return
    }
    resetMission(mi + 1)
  }

  /* ───────────── sahne etkileşimi ───────────── */
  const spotOk = (p: Pt, ignore?: number) => {
    if (p.x <= 0 || p.y <= 0 || p.x >= m.room.w || p.y >= m.room.h) return false
    if (m.blocks.some((b) => p.x >= b.x0 - 0.2 && p.x <= b.x1 + 0.2 && p.y >= b.y0 - 0.2 && p.y <= b.y1 + 0.2)) return false
    if (m.targets.some((t) => dist(t, p) < 0.9)) return false
    if (m.emitters.some((e) => dist(e, p) < 0.9)) return false
    if (mirrors.some((x) => x.id !== ignore && x.x === p.x && x.y === p.y)) return false
    return true
  }

  const onTap = (tp: Pt) => {
    if (animating) return
    if (step.kind === 'predict' && !fired) {
      setPredict({ x: Math.round(tp.x * 10) / 10, y: Math.round(tp.y * 10) / 10 })
      return
    }
    if (step.kind === 'point' && !stepDone) {
      setPick({ x: Math.round(tp.x), y: Math.round(tp.y) })
      setNudge(null)
      return
    }
    if (!building || inventory === 0) {
      setSelected(null)
      return
    }
    const p = { x: Math.round(tp.x), y: Math.round(tp.y) }
    const there = mirrors.find((x) => !x.fixed && x.x === p.x && x.y === p.y)
    if (there) {
      setSelected(`m:${there.id}`)
      return
    }
    if (!spotOk(p)) {
      setInfo('Buraya ayna konamaz: oda içinde, engellerden ve kristallerden uzak bir ızgara noktası seç.')
      return
    }
    setInfo(null)
    if (placed.length < inventory) {
      const id = nid.current++
      setMirrors((ms) => [...ms, { id, x: p.x, y: p.y, a: 45 }])
      setSelected(`m:${id}`)
      clearBeam()
      return
    }
    const sel = selected?.startsWith('m:') ? Number(selected.slice(2)) : null
    if (sel !== null) {
      setMirrors((ms) => ms.map((x) => (x.id === sel ? { ...x, x: p.x, y: p.y } : x)))
      clearBeam()
      return
    }
    setInfo('Aynaların bitti. Bir aynayı seç, sonra yeni yerine dokun (ya da sürükle).')
  }

  const onMirror = (id: number, patch: Partial<Mirror>) => {
    if (!building || animating) return false
    const cur = mirrors.find((x) => x.id === id)
    if (!cur) return false
    const nx = { ...cur, ...patch }
    if ((patch.x !== undefined || patch.y !== undefined) && !spotOk(nx, id)) return false
    setMirrors((ms) => ms.map((x) => (x.id === id ? nx : x)))
    clearBeam()
    return true
  }

  const onAim = (i: number, d: Pt) => {
    if (!building || animating) return
    setAims((a) => a.map((x, k) => (k === i ? d : x)))
    clearBeam()
  }

  const selMirror = selected?.startsWith('m:') ? mirrors.find((x) => x.id === Number(selected.slice(2))) : undefined
  const selEmitter = selected?.startsWith('e:') ? Number(selected.slice(2)) : null
  const rotateSel = (d: number) => {
    if (selMirror) onMirror(selMirror.id, { a: norm180(selMirror.a + d) })
    else if (selEmitter !== null && m.emitters[selEmitter].aim === 'rotate') {
      const cur = aims[selEmitter]
      const a = norm360(Math.round((Math.atan2(cur.y, cur.x) * 180) / Math.PI) + d)
      onAim(selEmitter, { x: Math.cos((a * Math.PI) / 180), y: Math.sin((a * Math.PI) / 180) })
    }
  }
  const moveSel = (dx: number, dy: number) => {
    if (!selMirror) return
    if (!onMirror(selMirror.id, { x: selMirror.x + dx, y: selMirror.y + dy })) setInfo('O yöne taşınamaz.')
  }
  const removeSel = () => {
    if (!selMirror) return
    setMirrors((ms) => ms.filter((x) => x.id !== selMirror.id))
    setSelected(null)
    clearBeam()
  }

  /* ───────────── yanıt denetimleri ───────────── */
  const checkNumber = () => {
    if (step.kind !== 'number') return
    const ans = num(step.answer, ctx)
    const tol = step.tol ?? 0.5
    if (Math.abs(numVal - ans) <= tol) succeed(txt(step.ok, ctx))
    else miss(step.nudge(numVal, ans, ctx))
  }
  const checkPoint = () => {
    if (step.kind !== 'point' || !pick) return
    if (pick.x === step.answer.x && pick.y === step.answer.y) {
      setGhosts((gs) => (step.reveal ? gs : [...gs, { p: step.answer, label: step.label }]))
      if (step.reveal) setRevealed((r) => [...new Set([...r, ...step.reveal!])])
      setPick(null)
      succeed(txt(step.ok, ctx))
    } else miss(step.nudge(pick))
  }
  const checkSlope = () => {
    if (step.kind !== 'slope') return
    const ans = num(step.answer, ctx)
    if (slope.run !== 0 && Math.abs(slope.rise / slope.run - ans) < 1e-6) succeed(txt(step.ok, ctx))
    else miss(step.nudge(slope.rise, slope.run, ans))
  }
  const onMeasure = (v: number) => {
    if (!measure || measure.locked || !fired) return
    const b = fired[0].bounces[measure.b]
    const target = Math.round(bounceAngles(b).mirror)
    if (Math.abs(v - target) <= 2) {
      setMeasure({ ...measure, value: target, locked: true })
      setMeasured((ms) => [...ms, { b: measure.b, k: measure.ray }])
      if (step.kind === 'measure') succeed(step.ok ? txt(step.ok, ctx) : `${target}° ölçtün!`)
    } else setMeasure({ ...measure, value: Math.max(0, Math.min(180, v)) })
  }

  const hints = step ? (step.kind !== 'strategy' && step.hints) || DEFAULT_HINTS[step.kind] : []
  const askHint = () => {
    track.hint()
    setHintN((h) => Math.min(hints.length, h + 1))
  }

  const marks: Mark[] | null = step.kind === 'number' ? (step.marks ?? []) : step.kind === 'measure' ? measured : building || step.kind === 'strategy' ? null : []
  const view0 = m.view ?? { xMin: -0.6, xMax: m.room.w + 0.6, yMin: -0.6, yMax: m.room.h + 0.6 }
  // altta yakınlaştırma düğmeleri için boşluk (≈ 52 px)
  const margin = Math.round(Math.max(0.8, Math.min(3, (52 * (view0.xMax - view0.xMin)) / Math.max(200, wrapW))) * 5) / 5
  const view = { ...view0, yMin: view0.yMin - margin }
  const taskText = step ? txt(step.text, ctx) : ''
  const card = dark ? 'bg-slate-900/80 ring-1 ring-slate-700' : 'bg-slate-900/90 ring-1 ring-slate-700'
  const canFire = (step.kind === 'predict' && !!predict && !fired) || building

  /* ───────────── görünüm ───────────── */
  return (
    <Scene grade={grade} className="p-2! sm:p-4!">
      <style>{CSS}</style>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,#1e1b4b_0,transparent_55%),radial-gradient(ellipse_at_90%_100%,#3b0a1e_0,transparent_50%),linear-gradient(180deg,#0b1020,#0a0f1c)]" />
      <div className="relative text-slate-100">
        {/* üst çubuk */}
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-2 rounded-xl bg-rose-500/90 px-3 py-1.5 text-sm font-black tracking-wide text-white shadow-[0_0_18px_rgba(244,63,94,.45)]">
            <FlaskConical size={16} />DENEY {mi + 1}/{missions.length}
          </span>
          <LevelDots current={mi} total={missions.length} />
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-slate-800/90 px-3 py-1.5 text-sm font-extrabold ring-1 ring-slate-600">
            <Sparkles size={15} className="text-amber-300" />Bulunan yol: {sol.list.length}
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_340px] lg:gap-4">
          {/* SOL: sahne + araç çubuğu */}
          <div className="min-w-0">
            <div className="mb-2 lg:hidden">
              <StepLine n={si + 1} total={m.steps.length} text={taskText} title={m.title} />
            </div>
            <div ref={wrapRef} className="ll-frame relative mx-auto rounded-[22px] p-1.5" style={{ maxWidth: `max(320px, calc((100dvh - 250px) / ${((view.yMax - view.yMin) / (view.xMax - view.xMin)).toFixed(3)}))` }}>
              <Plane
                key={`${m.id}-${margin}`}
                initial={view}
                aspect={(view.yMax - view.yMin) / (view.xMax - view.xMin)}
                grid={false}
                axes={false}
                minSpan={4}
                maxSpan={(view.xMax - view.xMin) * 1.25}
                onTap={onTap}
                label={`Lazer laboratuvarı: ${m.title}`}
              >
                <Lab
                  m={m}
                  mirrors={mirrors}
                  emitters={emitters}
                  traces={fired}
                  prog={fired ? prog : 0}
                  animDone={!!fired && !animating}
                  targets={visibleTargets}
                  lit={lit}
                  predict={step.kind === 'predict' ? predict : null}
                  pick={pick && step.kind === 'point' ? { p: pick, label: step.label } : null}
                  ghosts={ghosts}
                  ghostWorld={ghosts.length > 0}
                  hitCoords={!!(m.show.hitCoords ?? m.show.coords) || (step.kind === 'number' && stepDone)}
                  selected={selected}
                  editable={building && !animating}
                  marks={marks}
                  measure={step.kind === 'measure' ? measure : null}
                  onMeasure={onMeasure}
                  onSelect={setSelected}
                  onMirror={onMirror}
                  onAim={onAim}
                />
              </Plane>
            </div>

            {/* araç çubuğu */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {(step.kind === 'predict' || building) && (
                <button type="button" onClick={fire} disabled={!canFire || animating} className="ll-fire inline-flex min-h-14 items-center gap-2 rounded-2xl px-6 text-lg font-black text-white disabled:opacity-40">
                  <Zap size={22} fill="currentColor" />Ateşle!
                </button>
              )}
              {building && inventory > 0 && (
                <span className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-slate-800 px-3 text-sm font-extrabold ring-1 ring-slate-600">
                  <MirrorIcon />Ayna: {placed.length}/{inventory}
                </span>
              )}
              {building && (selMirror || (selEmitter !== null && m.emitters[selEmitter]?.aim === 'rotate')) && (
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Döndür">
                  {m.angleStep < 45 && <ToolBtn onClick={() => rotateSel(45)} label="45° sola döndür"><RotateCcw size={16} />45°</ToolBtn>}
                  <ToolBtn onClick={() => rotateSel(m.angleStep)} label={`${m.angleStep}° sola döndür`}><RotateCcw size={16} />{m.angleStep}°</ToolBtn>
                  <ToolBtn onClick={() => rotateSel(-m.angleStep)} label={`${m.angleStep}° sağa döndür`}><RotateCw size={16} />{m.angleStep}°</ToolBtn>
                  {m.angleStep < 45 && <ToolBtn onClick={() => rotateSel(-45)} label="45° sağa döndür"><RotateCw size={16} />45°</ToolBtn>}
                </div>
              )}
              {building && selMirror && (
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Taşı">
                  <ToolBtn onClick={() => moveSel(-1, 0)} label="Sola taşı"><ArrowLeft size={18} /></ToolBtn>
                  <ToolBtn onClick={() => moveSel(0, 1)} label="Yukarı taşı"><ArrowUp size={18} /></ToolBtn>
                  <ToolBtn onClick={() => moveSel(0, -1)} label="Aşağı taşı"><ArrowDown size={18} /></ToolBtn>
                  <ToolBtn onClick={() => moveSel(1, 0)} label="Sağa taşı"><ArrowRight size={18} /></ToolBtn>
                  <ToolBtn onClick={removeSel} label="Aynayı kaldır"><Trash2 size={17} /></ToolBtn>
                </div>
              )}
              {building && m.emitters.map((e, i) => e.aim === 'lattice' && <LatticeAim key={i} label={e.label ?? ''} d={aims[i]} color={BEAM_COLORS[i]} onChange={(d) => onAim(i, d)} />)}
            </div>
            {info && <p className="mt-2 rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-amber-200 ring-1 ring-slate-600">{info}</p>}
            {building && m.emitters.some((e) => e.aim === 'lattice') && <AimReadout m={m} aims={aims} g={g} />}
          </div>

          {/* SAĞ: görev paneli */}
          <aside className={`h-fit rounded-3xl p-4 ${card} lg:sticky lg:top-20`}>
            <p className="text-[11px] font-black tracking-[0.2em] text-rose-300 uppercase">Deney {mi + 1}</p>
            <h2 className="text-xl leading-tight font-black text-white">{m.title}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-300"><MathText text={m.story} /></p>
            <div className="mt-3 hidden lg:block">
              <StepLine n={si + 1} total={m.steps.length} text={taskText} />
            </div>

            <div className="mt-3">
              {step.kind === 'predict' && (
                <p className="flex items-center gap-2 text-sm font-bold text-slate-300">
                  <Crosshair size={16} className="text-amber-300" />
                  {fired ? 'Işın ateşlendi.' : predict ? 'Tahmin noktan hazır. İstersen değiştir, sonra Ateşle!' : 'Sahnede tahmin ettiğin noktaya dokun.'}
                </p>
              )}
              {predictMsg && (
                <p className={`mt-2 rounded-xl px-3 py-2 text-sm font-extrabold ${predictMsg.ok ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/40' : 'bg-amber-400/10 text-amber-100 ring-1 ring-amber-400/40'}`}>{predictMsg.text}</p>
              )}
              {step.kind === 'measure' && measure && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-xl bg-cyan-500/15 px-3 py-2 text-lg font-black text-cyan-200 ring-1 ring-cyan-500/40">Açıölçer: {measure.value}°</span>
                  {!measure.locked && [-5, -1, 1, 5].map((d) => (
                    <ToolBtn key={d} onClick={() => onMeasure(measure.value + d)} label={`${d > 0 ? '+' : '−'}${Math.abs(d)}°`}>{d > 0 ? '+' : '−'}{Math.abs(d)}°</ToolBtn>
                  ))}
                </div>
              )}
              {step.kind === 'number' && !stepDone && (
                <NumberPad value={numVal} unit={step.unit ?? ''} steps={step.steps} min={step.min} max={step.max} onChange={setNumVal} onCheck={checkNumber} />
              )}
              {step.kind === 'point' && !stepDone && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-xl bg-pink-500/15 px-3 py-2 text-base font-black text-pink-200 ring-1 ring-pink-500/40">{pick ? `${step.label}(${fmtN(pick.x)}, ${fmtN(pick.y)})` : 'Sahnede bir noktaya dokun'}</span>
                  <button type="button" onClick={checkPoint} disabled={!pick} className="btn-primary min-h-12 disabled:opacity-40"><Check size={18} />Onayla</button>
                </div>
              )}
              {step.kind === 'slope' && !stepDone && <SlopePad v={slope} onChange={setSlope} onCheck={checkSlope} />}
              {step.kind === 'strategy' && !stepDone && (
                <div className="text-ink">
                  <StrategyPicker question={step.text} options={step.options} onPick={() => setStepDone(true)} />
                </div>
              )}
              {building && (
                <BuildStatus found={stepSols.length} goal={(step as Extract<Step, { kind: 'build' }>).goal} best={(step as Extract<Step, { kind: 'build' }>).best} used={lastUsed} inventory={inventory} fewest={fewest.includes(m.id)} />
              )}
            </div>

            {okMsg && (
              <div className="mt-3 flex items-start gap-2 rounded-2xl bg-emerald-500/15 p-3 text-emerald-100 ring-1 ring-emerald-400/40 animate-fade-up" role="status">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-white"><Check size={16} strokeWidth={3} /></span>
                <p className="text-[15px] font-extrabold"><MathText text={okMsg} /></p>
              </div>
            )}
            {nudge && <Nudge key={nudge.id} question={nudge.msg.q} tool={nudge.msg.tool} misconception={nudge.msg.mis} onClose={() => setNudge(null)} />}

            {stepDone && (
              <button type="button" onClick={next} className="btn-primary mt-3 w-full text-lg" autoFocus>
                {si + 1 < m.steps.length ? 'Devam et' : mi + 1 < missions.length ? 'Sonraki deney' : 'Laboratuvarı kapat'}<ArrowRight size={18} />
              </button>
            )}

            {!stepDone && hints.length > 0 && (
              <div className="mt-3">
                <button type="button" onClick={askHint} disabled={hintN >= hints.length} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-slate-800 px-3 text-sm font-extrabold ring-1 ring-slate-600 disabled:opacity-50">
                  <Lightbulb size={16} className="text-amber-300" />{hintN ? 'Bir ipucu daha' : 'İpucu'}
                </button>
                {hints.slice(0, hintN).map((h, i) => (
                  <p key={i} className="mt-2 flex gap-2 rounded-xl bg-amber-400/10 p-2.5 text-sm font-bold text-amber-100 animate-fade-up"><HelpCircle size={16} className="mt-0.5 shrink-0" /><MathText text={h} /></p>
                ))}
              </div>
            )}
            <SolutionList list={sol.list} />
          </aside>
        </div>
      </div>
    </Scene>
  )
}

/* ───────────── parçalar ───────────── */

function solLabel(m: Mission, mirrors: Mirror[], trs: Trace[], aims: Pt[], used: number) {
  const parts: string[] = []
  m.emitters.forEach((e, i) => {
    if (e.aim === 'rotate') {
      const a = Math.round((Math.atan2(aims[i].y, aims[i].x) * 180) / Math.PI)
      parts.push(`yayıcı ${a < 0 ? `−${-a}` : a}°`)
    }
    if (e.aim === 'lattice') parts.push(`eğim ${slopeFrac(aims[i].x, aims[i].y).text}`)
  })
  const ids = [...new Set(trs.flatMap((t) => t.used))]
  if (ids.length) parts.push(`${used} ayna: ${ids.map((id) => `${Math.round(mirrors.find((x) => x.id === id)!.a)}°`).join(' · ')}`)
  return `${m.title}: ${parts.join(', ') || 'doğrudan'}`
}

function StepLine({ n, total, text, title }: { n: number; total: number; text: string; title?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-rose-500/10 px-3 py-2.5 text-rose-50 ring-1 ring-rose-400/30">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-rose-500 text-xs font-black text-white">{n}<span className="text-[9px] opacity-80">/{total}</span></span>
      <p className="min-w-0 self-center text-[15px] leading-snug font-extrabold">
        {title && <span className="mr-1.5 text-rose-300">{title} ·</span>}
        <MathText text={text} />
      </p>
    </div>
  )
}

function ToolBtn({ children, onClick, label }: { children: ReactNode; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="inline-flex min-h-12 min-w-12 items-center justify-center gap-1 rounded-xl bg-slate-800 px-2.5 text-sm font-black text-slate-100 ring-1 ring-slate-600 transition hover:bg-slate-700 active:scale-95">
      {children}
    </button>
  )
}

function MirrorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <line x1="3" y1="15" x2="15" y2="3" stroke="#e2e8f0" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="3" y1="15" x2="15" y2="3" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

function NumberPad({ value, unit, steps, min, max, onChange, onCheck }: { value: number; unit: string; steps: number[]; min: number; max: number; onChange: (v: number) => void; onCheck: () => void }) {
  const dec = Math.max(0, ...steps.map((s) => (s < 1 ? 1 : 0)))
  const set = (v: number) => onChange(Math.max(min, Math.min(max, Math.round(v * 10 ** dec) / 10 ** dec)))
  const big = [...steps].sort((a, b) => b - a)
  return (
    <div className="rounded-2xl bg-slate-950/60 p-3 ring-1 ring-slate-700">
      <output className="mx-auto block w-fit min-w-32 rounded-xl bg-slate-900 px-4 py-1.5 text-center text-4xl font-black text-white tabular-nums ring-1 ring-rose-400/40" aria-live="polite">{fmtN(value, dec).replace('-', '−')}{unit}</output>
      <div className={`mt-2 grid gap-1.5 ${big.length > 1 ? 'grid-cols-4' : 'grid-cols-2'}`}>
        {big.map((s) => <ToolBtn key={`m${s}`} onClick={() => set(value - s)} label={`${fmtN(s, 1)} azalt`}>−{fmtN(s, 1)}</ToolBtn>)}
        {[...big].reverse().map((s) => <ToolBtn key={`p${s}`} onClick={() => set(value + s)} label={`${fmtN(s, 1)} artır`}>+{fmtN(s, 1)}</ToolBtn>)}
      </div>
      <button type="button" onClick={onCheck} className="btn-primary mt-3 min-h-12 w-full"><Check size={18} />Kontrol et</button>
    </div>
  )
}

function SlopePad({ v, onChange, onCheck }: { v: { rise: number; run: number }; onChange: (v: { rise: number; run: number }) => void; onCheck: () => void }) {
  const row = (label: string, k: 'rise' | 'run', lo: number) => (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-extrabold text-slate-300">{label}</span>
      <div className="flex items-center gap-1.5">
        <ToolBtn onClick={() => onChange({ ...v, [k]: Math.max(lo, v[k] - 1) })} label={`${label} azalt`}><Minus size={16} /></ToolBtn>
        <output className="w-14 text-center text-2xl font-black text-white tabular-nums">{String(v[k]).replace('-', '−')}</output>
        <ToolBtn onClick={() => onChange({ ...v, [k]: Math.min(12, v[k] + 1) })} label={`${label} artır`}><Plus size={16} /></ToolBtn>
      </div>
    </div>
  )
  const f = slopeFrac(v.run, v.rise)
  return (
    <div className="rounded-2xl bg-slate-950/60 p-3 ring-1 ring-slate-700">
      {row('Yükselme (Δy)', 'rise', -12)}
      <div className="my-1.5 h-px bg-slate-700" />
      {row('İlerleme (Δx)', 'run', 1)}
      <p className="mt-2 text-center text-xl font-black text-pink-200">eğim = <MathText text={v.rise === 0 ? '0' : `${v.rise < 0 ? '−' : ''}[[${Math.abs(v.rise)}/${v.run}]]`} />{f.m !== null && Math.abs(v.rise) % v.run !== 0 && gcd(v.rise, v.run) > 1 ? <span className="ml-2 text-base text-slate-400">= <MathText text={f.text} /></span> : null}</p>
      <button type="button" onClick={onCheck} className="btn-primary mt-3 min-h-12 w-full"><Check size={18} />Kontrol et</button>
    </div>
  )
}

function LatticeAim({ label, d, color, onChange }: { label: string; d: Pt; color: string; onChange: (d: Pt) => void }) {
  const set = (x: number, y: number) => (x || y) && onChange({ x: Math.max(-14, Math.min(14, x)), y: Math.max(-14, Math.min(14, y)) })
  const axis = (name: string, v: number, f: (k: number) => void) => (
    <span className="flex items-center gap-1">
      <span className="w-6 text-sm font-black">{name}</span>
      <ToolBtn onClick={() => f(-1)} label={`${name} azalt`}><Minus size={14} /></ToolBtn>
      <span className="w-7 text-center font-black tabular-nums">{String(v).replace('-', '−')}</span>
      <ToolBtn onClick={() => f(1)} label={`${name} artır`}><Plus size={14} /></ToolBtn>
    </span>
  )
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-slate-800/80 px-2 py-1 ring-1 ring-slate-600" role="group" aria-label={`${label || 'Yayıcı'} nişanı`}>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        {label && <span className="text-xs font-black text-slate-300">{label}</span>}
      </span>
      {axis('Δx', d.x, (k) => set(d.x + k, d.y))}
      {axis('Δy', d.y, (k) => set(d.x, d.y + k))}
    </div>
  )
}

function AimReadout({ m, aims, g }: { m: Mission; aims: Pt[]; g: G }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {m.emitters.map((e, i) => {
        if (e.aim !== 'lattice' && g < 8) return null
        const d = aims[i]
        const s = slopeFrac(d.x, d.y)
        return (
          <span key={i} className="inline-flex flex-wrap items-center gap-x-2 rounded-xl bg-slate-900/80 px-3 py-1.5 text-sm font-extrabold ring-1 ring-slate-700">
            <span className="size-2.5 rounded-full" style={{ background: BEAM_COLORS[i] }} />
            {e.label ? `${e.label}: ` : ''}
            {g >= 8 ? (
              <>
                eğim = <MathText text={s.text} className="text-pink-200" />
                <span className="text-slate-400">· <MathText text={lineEq(e, d, true)} /></span>
              </>
            ) : (
              <span>x {Math.abs(d.x)} {d.x >= 0 ? 'artarken' : 'azalırken'} y {Math.abs(d.y)} {d.y >= 0 ? 'artar' : 'azalır'}</span>
            )}
          </span>
        )
      })}
    </div>
  )
}

function BuildStatus({ found, goal, best, used, inventory, fewest }: { found: number; goal: number; best?: number; used: number | null; inventory: number; fewest: boolean }) {
  return (
    <div className="mt-1 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-extrabold text-slate-300">Bu deneyde bulduğun yollar</span>
        <span className="ml-auto flex gap-1">
          {Array.from({ length: Math.max(goal, found) }, (_, i) => (
            <span key={i} className={`grid size-7 place-items-center rounded-lg text-xs font-black ${i < found ? 'bg-amber-400 text-slate-900 shadow-[0_0_10px_rgba(251,191,36,.6)]' : 'bg-slate-800 text-slate-500 ring-1 ring-slate-600'}`}>{i + 1}</span>
          ))}
        </span>
      </div>
      {found > 0 && found < goal && <p className="text-sm font-bold text-amber-200">Başka bir yol bul! {inventory > 0 ? 'Aynayı başka bir yere ya da başka bir açıya koy.' : 'Yayıcıyı başka bir açıya çevir.'}</p>}
      {found >= goal && goal > 1 && <p className="text-sm font-bold text-emerald-300">Hedeflenen sayıda yol buldun. Daha fazlası da olabilir!</p>}
      {best !== undefined && inventory > best && used !== null && (
        fewest
          ? <p className="text-sm font-extrabold text-emerald-300">🏅 En az aynalı yolu buldun: yalnızca {best} ayna!</p>
          : <p className="text-sm font-extrabold text-amber-200">{used} ayna kullandın. Daha az aynayla yapabilir misin?</p>
      )}
    </div>
  )
}

const CSS = `
.ll-frame .ring-line{--tw-ring-color:#334155}
.ll-frame .bg-white{background:#050a14}
.ll-frame button{background:rgba(15,23,42,.88)!important;color:#e2e8f0!important;--tw-ring-color:#475569!important}
.ll-frame p.text-ink-soft{color:#94a3b8}
.ll-frame{background:linear-gradient(135deg,#334155,#0f172a 40%,#1e293b);box-shadow:0 0 0 1px #475569,0 18px 40px -18px rgba(244,63,94,.35)}
.ll-fire{background:radial-gradient(circle at 30% 20%,#fb7185,#e11d48 55%,#9f1239);box-shadow:0 0 0 2px rgba(255,255,255,.08),0 0 22px rgba(244,63,94,.55);transition:transform .12s}
.ll-fire:not(:disabled):active{transform:scale(.96)}
.ll-fire:not(:disabled){animation:llFire 2s ease-in-out infinite}
@keyframes llFire{50%{box-shadow:0 0 0 2px rgba(255,255,255,.08),0 0 34px rgba(244,63,94,.85)}}
@media (prefers-reduced-motion:reduce){.ll-fire{animation:none!important}}
`
