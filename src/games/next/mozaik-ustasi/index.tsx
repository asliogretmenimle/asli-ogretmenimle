import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Eraser, Lightbulb, RotateCcw, Sparkles, Undo2 } from 'lucide-react'
import type { GameProps } from '../../kit'
import { starsFor } from '../../kit'
import { BigButton, LevelDots, Nudge, Scene, SolutionList, StrategyPicker, TaskCard, useSolutions } from '../../kit2'
import { MathText } from '../../../components/MathText'
import { useTracker } from '../../../lib/trackerContext'
import { sfx } from '../../../lib/feedback'
import type { Grade } from '../../../data/types'
import { Board, PieceIcon, type Piece, type World } from './Board'
import { PIECES, boundary, centerFor, centroidKey, edgesPath, makeUnits, mirrorUnit, placedPoly, symmetryOf, toXY, unitCount, unitsIn, type P2, type TypeId } from './lattice'
import { insightFor, missionsFor, type Follow, type MMission, type Tally } from './missions'
import { POLY_INFO, PolyIcon, VertexLab, interior } from './VertexLab'

/**
 * Mozaik Ustası — örüntü bloklarıyla yüzey kaplama.
 * Parçalar kafese oturur; boşluk/örtüşme birim parçalarla denetlenir. Farklı doldurma yolları
 * (parça karışımları), köşe açısı karışımları ve çokgen karışımları useSolutions ile toplanır.
 */

interface Result {
  first: boolean
  solutions: number
  extra: number
}
type Msg = { text: string; tone: 'ok' | 'think'; mis?: string; tool?: boolean; id: number }

const ORDER: TypeId[] = ['hex', 'trap', 'rhom', 'tri', 'rect', 'sq', 'rt']
const plural = (t: TypeId, n: number) => `${n} ${PIECES[t].name}`

function composition(types: TypeId[]) {
  const c = new Map<TypeId, number>()
  types.forEach((t) => c.set(t, (c.get(t) ?? 0) + 1))
  const list = ORDER.filter((t) => c.has(t)).map((t) => [t, c.get(t)!] as const)
  return { key: list.map(([t, n]) => `${t}${n}`).join('-'), label: list.map(([t, n]) => plural(t, n)).join(' + ') }
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
/** n/d kesrini MathText biçiminde yazar */
function frac(n: number, d: number) {
  const g = gcd(n, d)
  const a = n / g, b = d / g
  if (b === 1) return `${a}`
  if (a > b) return `[[${Math.floor(a / b)} ${a % b}/${b}]]`
  return `[[${a}/${b}]]`
}
/** Tally: her parçanın değeri (taban birim cinsinden pay) ve payda */
function tallyValue(t: TypeId, mode: Tally): [number, number] {
  if (mode === 'hexfrac') return [unitCount(t), 6]
  if (mode === 'trapunit') return [unitCount(t), 3]
  if (mode === 'squares') return [unitCount(t), 4]
  return [unitCount(t), 1]
}

// ── ortak görev çekirdeği ─────────────────────────────────────────

function useCore(m: MMission, initial: 'pre' | 'work' = 'work') {
  const track = useTracker()
  const [msg, setMsg] = useState<Msg | null>(null)
  const [wrong, setWrong] = useState(0)
  const [hintN, setHintN] = useState(0)
  const [phase, setPhase] = useState<'pre' | 'work' | 'follow' | 'done'>(initial)
  const res = useRef<Result>({ first: true, solutions: 0, extra: 0 })
  const say = (text: string, tone: 'ok' | 'think' = 'think', mis?: string, tool?: boolean) => setMsg({ text, tone, mis, tool, id: Math.random() })
  const fail = (text: string, mis?: string, tool?: boolean) => {
    setWrong((w) => w + 1)
    track.attempt(false)
    sfx.bad()
    say(text, 'think', mis, tool)
  }
  const complete = (text: string, r: Partial<Result> = {}) => {
    const first = wrong === 0 && hintN === 0
    track.item(first)
    res.current = { ...res.current, ...r, first }
    setPhase('done')
    say(text, 'ok')
  }
  const hint = () => {
    track.hint()
    say(m.hints[Math.min(hintN, m.hints.length - 1)], 'think', undefined, m.kind === 'mirror')
    setHintN((h) => h + 1)
  }
  return { track, msg, say, fail, complete, hint, phase, setPhase, res, clearMsg: () => setMsg(null) }
}

function FollowBox({ f, onPick }: { f: Follow; onPick: (i: number) => void }) {
  return (
    <div className="rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-200 animate-fade-up">
      <p className="mb-2 text-base font-black text-sky-950"><MathText text={f.q} /></p>
      <div className="flex flex-col gap-2">
        {f.choices.map((c, i) => (
          <button key={i} type="button" onClick={() => onPick(i)} className="flex min-h-12 items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-left font-extrabold text-sky-950 ring-1 ring-sky-200 active:scale-[0.98]">
            {c.icon && <PieceIcon type={c.icon} size={40} />}
            <MathText text={c.label} />
          </button>
        ))}
      </div>
    </div>
  )
}

function Shell({ board, panel }: { board: ReactNode; panel: ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">{board}</div>
      <aside className="flex min-w-0 flex-col gap-3">{panel}</aside>
    </div>
  )
}

function Footer({ phase, onHint, onNext, last, extra }: { phase: string; onHint: () => void; onNext: () => void; last: boolean; extra?: ReactNode }) {
  return (
    <div className="mt-auto flex flex-wrap gap-2 pt-1">
      {phase !== 'done' && (
        <button type="button" onClick={onHint} className="inline-flex min-h-12 items-center gap-1.5 rounded-2xl bg-amber-50 px-4 font-extrabold text-amber-900 ring-1 ring-amber-200 active:scale-95">
          <Lightbulb size={18} />İpucu
        </button>
      )}
      {extra}
      {phase === 'done' && <BigButton onClick={onNext} className="flex-1">{last ? 'Atölyeyi bitir 🎉' : <>Sonraki görev<ArrowRight size={20} /></>}</BigButton>}
    </div>
  )
}

// ── oyun ──────────────────────────────────────────────────────────

export default function MozaikUstasi({ grade, onFinish }: GameProps) {
  const missions = useMemo(() => missionsFor(grade), [grade])
  const [idx, setIdx] = useState(0)
  const stats = useRef({ first: 0, solutions: 0, extra: 0 })
  const done = (r: Result) => {
    const s = stats.current
    if (r.first) s.first++
    s.solutions += r.solutions
    s.extra += r.extra
    if (idx + 1 < missions.length) return setIdx(idx + 1)
    const n = missions.length
    onFinish({
      stars: starsFor(Math.min(1, s.first / n + (s.extra >= 2 ? 0.1 : 0))),
      score: s.first * 100 + (n - s.first) * 60 + s.solutions * 15 + s.extra * 20,
      summary: `${n} mozaik görevinde ${s.solutions} farklı çözüm buldun.`,
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
        <span className="chip bg-white px-3 py-1 text-sm text-ink ring-1 ring-line">🧩 Mozaik atölyesi</span>
      </div>
      {m.kind === 'lab' ? (
        <LabMission key={idx} m={m} grade={grade} step={idx + 1} total={missions.length} onDone={done} />
      ) : (
        <BoardMission key={idx} m={m} grade={grade} step={idx + 1} total={missions.length} onDone={done} />
      )}
    </Scene>
  )
}

// ── tahta görevleri ───────────────────────────────────────────────

type BM = Exclude<MMission, { kind: 'lab' }>

function BoardMission({ m, grade, step, total, onDone }: { m: BM; grade: Grade; step: number; total: number; onDone: (r: Result) => void }) {
  const core = useCore(m, m.kind === 'fill' && m.estimate ? 'pre' : 'work')
  const { track, say, fail, complete, phase, setPhase } = core
  const sol = useSolutions()
  const seen = useRef(new Set<string>())
  const kind = m.lattice
  const mismatchShown = useRef(false)

  const geo = useMemo(() => {
    const units = makeUnits(kind, 10)
    const unitMap = new Map(units.map((u) => [u.id, u]))
    const byC = new Map(units.map((u) => [centroidKey(u.c), u.id]))
    let frame: Set<string> | undefined
    let edges: string | undefined
    let world: World
    let staging: P2[] = []
    if (m.kind === 'fill' || m.kind === 'mirror') {
      const poly = m.frame.map((v) => toXY(kind, v))
      frame = new Set(unitsIn(units, poly))
      edges = edgesPath(boundary(units, frame))
      const xs = poly.map((p) => p.x), ys = poly.map((p) => p.y)
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
      const side = Math.max(2.6, Math.min(3.6, (y1 - y0) * 0.9))
      world = { x0: x0 - 0.8, x1: x1 + side + 0.6, y0: y0 - 0.8, y1: Math.max(y1 + 0.8, y0 + 3.4) }
      for (let k = 0; k < 6; k++) staging.push({ x: x1 + 0.6 + side * (k % 2 === 0 ? 0.3 : 0.75), y: world.y0 + 1.05 + Math.floor(k / 2) * 1.35 })
    } else if (m.kind === 'vertex') {
      world = { x0: -2.4, x1: 5.6, y0: -2.3, y1: 2.3 }
      staging = [{ x: 3.2, y: -1.2 }, { x: 4.6, y: -1.2 }, { x: 3.2, y: 0.4 }, { x: 4.6, y: 0.4 }, { x: 3.4, y: 1.6 }, { x: 4.7, y: 1.7 }]
    } else {
      world = { x0: -4.6, x1: 4.6, y0: -3.1, y1: 3.1 }
      for (let y = -2; y <= 2; y += 1.7) for (let x = -3.5; x <= 3.6; x += 1.75) staging.push({ x, y })
    }
    // ayna deseni
    const given: Piece[] =
      m.kind === 'mirror'
        ? m.given.map((g, i) => {
            const c = centerFor(g.type, g.turns, g.anchor)
            return { uid: i + 1, type: g.type, turns: g.turns, anchor: g.anchor, cx: c.x, cy: c.y, cells: unitsIn(units, placedPoly(g.type, g.turns, g.anchor)), locked: true }
          })
        : []
    const target = m.kind === 'vertex' ? units.filter((u) => u.verts.includes('0,0')).map((u) => u.id) : []
    return { units, unitMap, byC, frame, edges, world, staging, given, target }
  }, [m, kind])

  const [pieces, setPieces] = useState<Piece[]>(geo.given)
  const [estimate, setEstimate] = useState<number | null>(null)
  const [found, setFound] = useState(0)
  const [solvedNow, setSolvedNow] = useState(false)
  const firstInFrame = useRef<TypeId | null>(null)
  const badShown = useRef(0)

  // ── çözümleme ──
  const an = useMemo(() => {
    const placed = pieces.filter((p) => p.anchor)
    const owner = new Map<string, number[]>()
    for (const p of placed) for (const c of p.cells) owner.set(c, [...(owner.get(c) ?? []), p.uid])
    const bad = new Set<number>()
    for (const uids of owner.values()) if (uids.length > 1) uids.forEach((u) => bad.add(u))
    const typeOf = new Map(pieces.map((p) => [p.uid, p.type]))
    let inFrame: Piece[] = []
    let complete = false
    let mismatch = false
    let studentFull = false
    if (geo.frame) {
      const F = geo.frame
      for (const p of placed) {
        if (p.locked) continue
        const n = p.cells.filter((c) => F.has(c)).length
        if (n > 0 && n < p.cells.length) bad.add(p.uid)
        if (n === p.cells.length && n > 0) inFrame.push(p)
      }
      if (m.kind === 'fill') complete = [...F].every((c) => owner.get(c)?.length === 1) && !inFrame.some((p) => bad.has(p.uid)) && placed.every((p) => !bad.has(p.uid))
      if (m.kind === 'mirror') {
        const ax = m.axis
        const studentSide = (id: string) => {
          const u = geo.unitMap.get(id)!
          return ax.dir === 'v' ? u.c.x > ax.at : u.c.y > ax.at
        }
        const sideUnits = [...F].filter(studentSide)
        for (const p of inFrame) if (p.cells.some((c) => !studentSide(c))) bad.add(p.uid)
        studentFull = sideUnits.every((c) => owner.get(c)?.length === 1)
        const ok = sideUnits.every((c) => {
          const mine = owner.get(c)
          if (mine?.length !== 1) return false
          const mir = mirrorUnit(geo.unitMap, geo.byC, c, ax)
          const theirs = mir ? owner.get(mir) : undefined
          return !!theirs && typeOf.get(theirs[0]) === typeOf.get(mine[0])
        })
        mismatch = studentFull && !ok
        complete = ok && placed.every((p) => !bad.has(p.uid))
      }
    }
    let angles: { uid: number; type: TypeId; deg: number; units: string[] }[] = []
    if (m.kind === 'vertex') {
      const tset = new Set(geo.target)
      angles = placed.filter((p) => p.cells.some((c) => tset.has(c))).map((p) => {
        const us = p.cells.filter((c) => tset.has(c))
        return { uid: p.uid, type: p.type, deg: us.length * 60, units: us }
      })
      complete = geo.target.every((c) => owner.get(c)?.length === 1) && angles.every((a) => !bad.has(a.uid))
      inFrame = placed.filter((p) => angles.some((a) => a.uid === p.uid))
    }
    let sym = { center: { x: 0, y: 0 }, lines: [] as number[], rotation: 1 }
    if (m.kind === 'free') {
      const cells = placed.flatMap((p) => p.cells.map((c) => ({ c: geo.unitMap.get(c)!.c, type: p.type })))
      sym = symmetryOf(kind, cells)
      inFrame = placed
    }
    return { bad, inFrame, complete, mismatch, studentFull, angles, sym, placed }
  }, [pieces, geo, m, kind])

  // ── çözüm yakalama ──
  const lastKey = useRef('')
  useEffect(() => {
    if (phase !== 'work') return
    if (!an.complete) {
      lastKey.current = ''
      setSolvedNow(false)
      if (!an.mismatch) mismatchShown.current = false
      else if (!mismatchShown.current) {
        mismatchShown.current = true
        fail(`Aynaya bak: ${m.kind === 'mirror' && m.axis.dir === 'h' ? 'üstteki' : 'soldaki'} her parçanın eşi çizgiye aynı uzaklıkta mı? Üçgenlerin yatık kenarı doğru yöne bakıyor mu?`, 'Yansımayı öteleme gibi kopyalıyor', true)
      }
      return
    }
    if (m.kind === 'free') return
    if (m.kind === 'mirror') {
      track.attempt(true)
      complete('Harika! Sağ yarı, sol yarının tam aynadaki görüntüsü oldu. Çizgiden katlasan iki yarı üst üste gelir.', { solutions: 1 })
      return
    }
    const types = an.inFrame.map((p) => p.type)
    const comp =
      m.kind === 'vertex'
        ? (() => {
            const degs = an.angles.map((a) => a.deg).sort((a, b) => b - a)
            return { key: degs.join('+'), label: m.degrees ? `${degs.map((d) => `${d}°`).join(' + ')} = 360°` : `${degs.map((d) => d / 60).join(' + ')} = 6 üçgen köşesi` }
          })()
        : composition(types)
    if (lastKey.current === comp.key) return
    lastKey.current = comp.key
    setSolvedNow(true)
    if (seen.current.has(comp.key)) {
      say('Bu karışımı zaten buldun. Farklı parçalarla başka bir yol dene!')
      return
    }
    seen.current.add(comp.key)
    if (!sol.add(comp.key, comp.label)) sfx.ok()
    track.attempt(true)
    // strateji
    if (m.kind === 'fill') {
      if (types.every((t) => t === 'tri' || t === 'rt')) track.strategy('Küçük parçalara ayırma')
      else if (firstInFrame.current && m.tray[0] === firstInFrame.current) track.strategy('Büyük parçalarla başlama')
    }
    if (m.kind === 'vertex') track.strategy(new Set(types).size === 1 ? 'Eş parçalarla çevreleme' : 'Farklı açıları birleştirme')
    const n = seen.current.size
    setFound(n)
    const tallyText = m.kind === 'fill' && m.tally !== 'none' ? ` ${tallySentence(an.inFrame.map((p) => p.type), m.tally)}` : ''
    if (n >= m.goal) {
      if (m.kind === 'fill' && m.follow) {
        setPhase('follow')
        say(`Tam oturdu! ${comp.label}.${tallyText}`, 'ok')
      } else complete(`Tam oturdu! ${comp.label}.${tallyText}${n >= 2 ? ' Parçalar farklı ama kapladıkları yer aynı!' : ''}`, { solutions: n, extra: 0 })
    } else say(`Tam oturdu! ${comp.label}.${tallyText} Şimdi başka bir yol bul: “Temizle”ye bas.`, 'ok')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [an.complete, an.mismatch, an.inFrame, phase])

  const onPieces = (list: Piece[]) => {
    // yeni bırakılan parça kötü yerde mi?
    const prev = new Map(pieces.map((p) => [p.uid, p]))
    const dropped = list.find((p) => p.anchor && (!prev.get(p.uid)?.anchor || prev.get(p.uid)!.anchor!.join() !== p.anchor.join() || prev.get(p.uid)!.turns !== p.turns))
    setPieces(list)
    if (!dropped || phase !== 'work') return
    if (geo.frame && !firstInFrame.current && dropped.cells.length && dropped.cells.every((c) => geo.frame!.has(c))) firstInFrame.current = dropped.type
    const others = new Set(list.filter((p) => p.uid !== dropped.uid && p.anchor).flatMap((p) => p.cells))
    const overlap = dropped.cells.some((c) => others.has(c))
    const partial = geo.frame && dropped.cells.some((c) => geo.frame!.has(c)) && dropped.cells.some((c) => !geo.frame!.has(c))
    if ((overlap || partial) && badShown.current < 3) {
      badShown.current++
      say(overlap ? 'Parçalar üst üste binmesin. Bu boşluğa hangi şeklin köşesi sığar?' : 'Parça çerçevenin dışına taşıyor. Döndürmeyi dene: köşesi boşluğa uyuyor mu?')
    }
  }

  const clear = () => {
    core.clearMsg()
    setPieces(geo.given)
    lastKey.current = ''
    setSolvedNow(false)
    firstInFrame.current = null
  }

  const pickFollow = (i: number) => {
    if (m.kind !== 'fill' || !m.follow) return
    const f = m.follow
    if (i === f.answer) {
      track.attempt(true)
      complete(`Evet! ${f.choices[i].label.replace(/^Hayır, /, '')}`.replace(/^Evet! Evet, /, 'Evet! '), { solutions: found, extra: Math.max(0, found - m.goal) })
    } else fail(f.wrong[i] ?? 'Bir daha düşün.', f.misconception?.[i] ?? undefined)
  }

  const finishFree = () => {
    if (m.kind !== 'free') return
    const n = an.placed.length
    const lines = an.sym.lines.length
    if (n < m.minPieces) return say(`Desenin için en az ${m.minPieces} parça gerekli; şimdi ${n} parça var.`)
    if (an.bad.size) return say('Bazı parçalar üst üste biniyor. Onları düzelt, sonra yeniden dene.')
    if (lines < m.minLines) {
      return fail(
        lines === 0 ? 'Desenini bir çizgi boyunca katlasan iki yarısı üst üste gelir mi? Bir parçanın karşısına aynısını koymayı dene.' : `Desenin ${lines} simetri doğrusu var. En az ${m.minLines} tane olsun: ortadaki parçanın her yanına aynı parçaları koy.`,
        undefined,
        true,
      )
    }
    track.attempt(true)
    track.strategy(an.sym.rotation > 1 ? 'Dönme simetrisi kullanma' : 'Simetri doğrusuna göre yansıtma')
    sol.add(`sym${lines}-${an.sym.rotation}`, `${lines} simetri doğrusu`)
    complete(`Muhteşem bir desen! ${lines} simetri doğrusu${grade >= 5 && an.sym.rotation > 1 ? ` ve ${an.sym.rotation} katlı dönme simetrisi` : ''} var.`, { solutions: 1, extra: lines > m.minLines ? 1 : 0 })
  }

  const frameBox = useMemo(() => {
    if (!geo.frame) return null
    const cs = [...geo.frame].map((id) => geo.unitMap.get(id)!.c)
    const xs = cs.map((p) => p.x), ys = cs.map((p) => p.y)
    return { cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2, rx: (Math.max(...xs) - Math.min(...xs)) / 2 + 0.7, ry: (Math.max(...ys) - Math.min(...ys)) / 2 + 0.7 }
  }, [geo])
  const celebrate =
    an.complete && m.kind !== 'free' ? (
      <g pointerEvents="none" key={lastKey.current}>
        {geo.edges && <path d={geo.edges} fill="none" stroke="#fff" strokeWidth={0.22} strokeLinecap="round" className="mz-flash" />}
        {(m.kind === 'vertex' ? { cx: 0, cy: 0, rx: 1.5, ry: 1.5 } : frameBox) &&
          Array.from({ length: 8 }, (_, i) => {
            const b = m.kind === 'vertex' ? { cx: 0, cy: 0, rx: 1.5, ry: 1.5 } : frameBox!
            const t = (i / 8) * Math.PI * 2 + 0.3
            const x = b.cx + Math.cos(t) * b.rx, y = b.cy + Math.sin(t) * b.ry
            return <path key={i} d={`M${x} ${y - 0.16}L${x + 0.05} ${y - 0.05}L${x + 0.16} ${y}L${x + 0.05} ${y + 0.05}L${x} ${y + 0.16}L${x - 0.05} ${y + 0.05}L${x - 0.16} ${y}L${x - 0.05} ${y - 0.05}Z`} fill={['#f59e0b', '#ec4899', '#22c55e', '#3b82f6'][i % 4]} className="mz-pop" style={{ animationDelay: `${i * 60}ms` }} />
          })}
      </g>
    ) : null
  // ── çizim katmanları ──
  const overlay = (
    <g pointerEvents="none">
      {m.kind === 'mirror' &&
        (() => {
          const b = geo.frame ? [...geo.frame].map((id) => geo.unitMap.get(id)!.c) : []
          const xs = b.map((p) => p.x), ys = b.map((p) => p.y)
          const x0 = Math.min(...xs) - 0.6, x1 = Math.max(...xs) + 0.6, y0 = Math.min(...ys) - 0.6, y1 = Math.max(...ys) + 0.6
          const [a, c] = m.axis.dir === 'v' ? [{ x: m.axis.at, y: y0 }, { x: m.axis.at, y: y1 }] : [{ x: x0, y: m.axis.at }, { x: x1, y: m.axis.at }]
          return (
            <g>
              <line x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke="#fff" strokeWidth={0.12} strokeLinecap="round" />
              <line x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke="#db2777" strokeWidth={0.06} strokeDasharray="0.18 0.12" strokeLinecap="round" className="mz-march" />
            </g>
          )
        })()}
      {m.kind === 'vertex' && (
        <g>
          {an.angles.map((a) => {
            const col = PIECES[a.type].dark
            const dirs = a.units.map((id) => geo.unitMap.get(id)!.c)
            const mx = dirs.reduce((s, p) => s + p.x / Math.hypot(p.x, p.y), 0), my = dirs.reduce((s, p) => s + p.y / Math.hypot(p.x, p.y), 0)
            const len = Math.hypot(mx, my) || 1
            return (
              <g key={a.uid}>
                {a.units.map((id) => {
                  const u = geo.unitMap.get(id)!
                  const others = u.poly.filter((p) => Math.hypot(p.x, p.y) > 1e-6)
                  const r = 0.34
                  const p0 = others[0], p1 = others[1]
                  const q0 = { x: (p0.x / Math.hypot(p0.x, p0.y)) * r, y: (p0.y / Math.hypot(p0.x, p0.y)) * r }
                  const q1 = { x: (p1.x / Math.hypot(p1.x, p1.y)) * r, y: (p1.y / Math.hypot(p1.x, p1.y)) * r }
                  const sweep = q0.x * q1.y - q0.y * q1.x > 0 ? 1 : 0
                  return <path key={id} d={`M0 0L${q0.x} ${q0.y}A${r} ${r} 0 0 ${sweep} ${q1.x} ${q1.y}Z`} fill="#fff" fillOpacity={0.75} stroke={col} strokeWidth={0.02} />
                })}
                <text x={(mx / len) * 0.58} y={(my / len) * 0.58 + 0.07} textAnchor="middle" fontSize={0.2} fontWeight={900} fill="#1f2340" stroke="#fff" strokeWidth={0.05} paintOrder="stroke">{m.degrees ? `${a.deg}°` : a.deg / 60}</text>
              </g>
            )
          })}
          <circle r={0.11} fill={an.complete ? '#16a34a' : '#3b2a1a'} stroke="#fff" strokeWidth={0.04} />
          {!an.complete && <circle r={0.26} fill="none" stroke="#db2777" strokeWidth={0.035} className="mz-glow" />}
        </g>
      )}
      {celebrate}
      {m.kind === 'free' &&
        an.placed.length > 1 &&
        an.sym.lines.map((deg) => {
          const t = (deg * Math.PI) / 180
          const c = an.sym.center
          return (
            <g key={deg}>
              <line x1={c.x - Math.cos(t) * 9} y1={c.y - Math.sin(t) * 9} x2={c.x + Math.cos(t) * 9} y2={c.y + Math.sin(t) * 9} stroke="#fff" strokeWidth={0.1} opacity={0.9} />
              <line x1={c.x - Math.cos(t) * 9} y1={c.y - Math.sin(t) * 9} x2={c.x + Math.cos(t) * 9} y2={c.y + Math.sin(t) * 9} stroke="#db2777" strokeWidth={0.05} strokeDasharray="0.16 0.1" />
            </g>
          )
        })}
    </g>
  )
  const under = m.kind === 'vertex' ? <circle r={1.2} fill="#fffaf0" stroke="#eadcc3" strokeWidth={0.02} /> : null
  const locked = phase === 'done' || phase === 'follow' || phase === 'pre' || (solvedNow && m.kind !== 'free')

  // ── panel ──
  const tally = m.kind === 'fill' && m.tally !== 'none' ? <TallyBox types={an.inFrame.map((p) => p.type)} mode={m.tally} /> : null
  const vertexSum =
    m.kind === 'vertex' && an.angles.length > 0 ? (
      <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-line">
        <p className="text-xs font-black tracking-wide text-ink-soft uppercase">Çivinin çevresi</p>
        <p className="text-xl font-black tabular-nums">
          {m.degrees ? `${an.angles.map((a) => `${a.deg}°`).join(' + ')} = ${an.angles.reduce((s, a) => s + a.deg, 0)}°` : `${an.angles.map((a) => a.deg / 60).join(' + ')} = ${an.angles.reduce((s, a) => s + a.deg / 60, 0)}`}
          <span className="text-ink-soft"> / {m.degrees ? '360°' : '6'}</span>
        </p>
        {!m.degrees && <p className="text-xs font-bold text-ink-soft">üçgen köşesi</p>}
      </div>
    ) : null
  const freeInfo =
    m.kind === 'free' ? (
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
          <p className="text-[11px] font-black tracking-wide text-ink-soft uppercase">Parça</p>
          <p className="text-xl font-black">{an.placed.length} / {m.minPieces}</p>
        </div>
        <div className="rounded-2xl bg-pink-50 p-3 ring-1 ring-pink-200">
          <p className="text-[11px] font-black tracking-wide text-pink-800 uppercase">Simetri doğrusu</p>
          <p className="text-xl font-black text-pink-900">{an.placed.length > 1 ? an.sym.lines.length : 0}</p>
        </div>
        {grade >= 5 && an.sym.rotation > 1 && an.placed.length > 1 && <p className="col-span-2 rounded-2xl bg-violet-50 px-3 py-2 text-sm font-extrabold text-violet-900 ring-1 ring-violet-200">Dönme simetrisi: {an.sym.rotation} kez dönünce kendisiyle çakışıyor ({360 / an.sym.rotation}°)</p>}
      </div>
    ) : null

  const panel = (
    <>
      <TaskCard step={step} total={total}>{m.prompt}</TaskCard>
      {m.kind === 'fill' && m.estimate && estimate === null && (
        <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
          <p className="mb-2 text-sm font-black">{m.estimate.q}</p>
          <div className="grid grid-cols-4 gap-2">
            {m.estimate.choices.map((c, i) => (
              <button key={c} type="button" onClick={() => { setEstimate(i); setPhase('work'); say('Şimdi doldur ve kontrol et!', 'ok') }} className="min-h-12 rounded-xl bg-amber-50 text-lg font-black text-amber-900 ring-1 ring-amber-200 active:scale-95">{c}</button>
            ))}
          </div>
        </div>
      )}
      {m.kind === 'fill' && m.estimate && estimate !== null && (
        <p className="rounded-2xl bg-amber-50 px-3 py-2 text-sm font-extrabold text-amber-900 ring-1 ring-amber-200">Tahminin: {m.estimate.choices[estimate]} üçgen{an.complete ? ` · Gerçek: ${an.inFrame.reduce((s, p) => s + unitCount(p.type), 0)} üçgen` : ''}</p>
      )}
      {tally}
      {vertexSum}
      {freeInfo}
      {core.msg && <Nudge key={core.msg.id} question={core.msg.text} tone={core.msg.tone} misconception={core.msg.mis} tool={core.msg.tool ? 'symmetry' : undefined} toolConfig={{ size: 8 }} toolTitle="Simetri tahtasında dene" />}
      {phase === 'follow' && m.kind === 'fill' && m.follow && <FollowBox f={m.follow} onPick={pickFollow} />}
      {(m.kind === 'fill' || m.kind === 'vertex') && <SolutionList list={sol.list} goal={m.goal} />}
      {phase === 'done' && m.picker && <StrategyPicker options={m.picker} onPick={() => {}} />}
      <Footer
        phase={phase}
        onHint={core.hint}
        onNext={() => onDone(core.res.current)}
        last={step === total}
        extra={
          phase === 'work' ? (
            <>
              <button type="button" onClick={clear} className="inline-flex min-h-12 items-center gap-1.5 rounded-2xl bg-white px-4 font-extrabold text-ink ring-1 ring-line active:scale-95">
                {solvedNow ? <RotateCcw size={18} /> : <Eraser size={18} />}{solvedNow ? 'Temizle, başka yol' : 'Temizle'}
              </button>
              {m.kind === 'free' && <BigButton onClick={finishFree} className="flex-1"><Sparkles size={20} />Desenim hazır</BigButton>}
            </>
          ) : null
        }
      />
    </>
  )

  return (
    <Shell
      board={<Board kind={kind} world={geo.world} units={geo.units} frame={geo.frame} frameEdges={geo.edges} pieces={pieces} onPieces={onPieces} tray={m.tray} bad={an.bad} done={locked} under={under} overlay={overlay} staging={geo.staging} complete={an.complete && m.kind !== 'free'} />}
      panel={panel}
    />
  )
}

function tallySentence(types: TypeId[], mode: Tally) {
  const [, d] = tallyValue(types[0] ?? 'tri', mode)
  const sum = types.reduce((s, t) => s + tallyValue(t, mode)[0], 0)
  if (mode === 'units') return `Toplam ${sum} üçgenlik yer.`
  if (mode === 'squares') return `Alan: ${frac(sum, d)} kare.`
  if (mode === 'hexfrac') return `Toplam ${frac(sum, d)} altıgen.`
  return `Toplam ${frac(sum, d)} yamuk.`
}

function TallyBox({ types, mode }: { types: TypeId[]; mode: Tally }) {
  const c = ORDER.filter((t) => types.includes(t)).map((t) => [t, types.filter((x) => x === t).length] as const)
  const [, d] = tallyValue(types[0] ?? (mode === 'squares' ? 'sq' : 'tri'), mode)
  const sum = types.reduce((s, t) => s + tallyValue(t, mode)[0], 0)
  const unitName = mode === 'units' ? 'üçgen' : mode === 'squares' ? 'kare' : mode === 'hexfrac' ? 'altıgen' : 'yamuk'
  const each = (t: TypeId) => {
    const [n] = tallyValue(t, mode)
    return frac(n, d)
  }
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
      <p className="mb-1.5 text-xs font-black tracking-wide text-ink-soft uppercase">Çerçevedeki parçalar · birim: 1 {mode === 'units' ? 'üçgen' : unitName}</p>
      {c.length === 0 && <p className="text-sm font-bold text-ink-soft">Henüz parça yok.</p>}
      <div className="flex flex-col gap-1">
        {c.map(([t, n]) => (
          <div key={t} className="flex items-center gap-2 text-[15px] font-extrabold">
            <PieceIcon type={t} size={34} />
            <span className="min-w-0 flex-1">{n} × <MathText text={each(t)} /> {unitName}</span>
            <span className="tabular-nums"><MathText text={frac(n * tallyValue(t, mode)[0], d)} /></span>
          </div>
        ))}
      </div>
      {c.length > 0 && (
        <p className="mt-1.5 border-t border-line pt-1.5 text-lg font-black">
          Toplam: <MathText text={(mode === 'hexfrac' || mode === 'trapunit') && types.length <= 8 ? `${types.slice().sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).map(each).join(' + ')} = ${frac(sum, d)}` : frac(sum, d)} /> {unitName}
        </p>
      )}
    </div>
  )
}

// ── köşe laboratuvarı ─────────────────────────────────────────────

function LabMission({ m, grade, step, total, onDone }: { m: Extract<MMission, { kind: 'lab' }>; grade: Grade; step: number; total: number; onDone: (r: Result) => void }) {
  const core = useCore(m)
  const { track, say, fail, complete, phase, setPhase } = core
  const sol = useSolutions()
  const [ring, setRing] = useState<number[]>([])
  const [tested, setTested] = useState<Record<number, 'yes' | 'no'>>({})
  const seen = useRef(new Set<string>())
  const sum = ring.reduce((s, n) => s + interior(n), 0)
  const full = Math.abs(sum - 360) < 1e-6
  const over = sum > 360 + 1e-6
  const frozen = phase !== 'work' || full || over

  const add = (n: number) => {
    if (phase !== 'work') return
    let next = [...ring, n]
    if (m.mode === 'single' && ring.length && ring[0] !== n) next = [n]
    if (full || over) next = [n]
    setRing(next)
    const s = next.reduce((a, k) => a + interior(k), 0)
    if (m.mode === 'single') {
      const name = POLY_INFO[n].name
      if (Math.abs(s - 360) < 1e-6) {
        const t = { ...tested, [n]: 'yes' as const }
        setTested(t)
        sfx.ok()
        say(`${next.length} ${name} bir köşede tam buluşuyor: ${next.length} × ${interior(n)}° = 360°. ${name[0].toLocaleUpperCase('tr')}${name.slice(1)} zemini kaplar!`, 'ok')
        checkAll(t)
      } else if (s > 360) {
        const t = { ...tested, [n]: 'no' as const }
        setTested(t)
        const k = next.length - 1
        say(`${k} ${name} ${Math.round(k * interior(n) * 10) / 10}° ediyor, boşluk kalıyor; ${next.length} ${name} ise ${Math.round(s * 10) / 10}°, üst üste biniyor. ${name[0].toLocaleUpperCase('tr')}${name.slice(1)} tek başına kaplamaz.`)
        checkAll(t)
      }
    } else if (Math.abs(s - 360) < 1e-6) {
      const key = [...next].sort((a, b) => a - b).join('-')
      const label = `${next.map((k) => `${interior(k)}°`).join(' + ')} = 360°`
      if (seen.current.has(key)) return say('Bu karışımı zaten buldun. Başka çokgenler dene!')
      seen.current.add(key)
      if (!sol.add(key, label)) sfx.ok()
      track.attempt(true)
      track.strategy(new Set(next).size > 1 ? 'Farklı çokgenleri karıştırma' : 'Tek tür çokgenle kaplama')
      if (seen.current.size >= m.goal) complete(`Harika! ${label}. Açıların toplamı 360° olunca çokgenler köşede boşluksuz buluşuyor.`, { solutions: seen.current.size })
      else say(`Tam 360°! ${label}. “Yeni köşe” ile başka bir karışım dene.`, 'ok')
    } else if (s > 360) say(`Toplam ${Math.round(s * 10) / 10}°: 360°’yi aştı, çokgenler üst üste bindi. Sonuncuyu geri al ve daha küçük açılı bir çokgen dene.`)
  }
  const checkAll = (t: Record<number, 'yes' | 'no'>) => {
    if (m.polys.every((n) => t[n])) {
      track.attempt(true)
      if (m.follow) {
        setPhase('follow')
      } else complete('Hepsini denedin!', { solutions: 1 })
    }
  }
  const pick = (i: number) => {
    const f = m.follow
    if (!f) return
    if (i === f.answer) {
      track.attempt(true)
      complete('Evet! 60°, 90° ve 120° 360°’yi tam böler; 108° ve 135° bölmez. Bu yüzden yalnız üçgen, kare ve altıgen tek başına kaplar.', { solutions: 5 })
    } else fail(f.wrong[i] ?? 'Bir daha düşün.', f.misconception?.[i] ?? undefined)
  }

  const panel = (
    <>
      <TaskCard step={step} total={total}>{m.prompt}</TaskCard>
      <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-line">
        <p className="text-xs font-black tracking-wide text-ink-soft uppercase">Köşedeki açılar</p>
        <p className={`text-xl font-black tabular-nums ${full ? 'text-emerald-700' : over ? 'text-rose-600' : ''}`}>
          {ring.length ? `${ring.map((n) => `${Math.round(interior(n) * 10) / 10}°`).join(' + ')} = ${Math.round(sum * 10) / 10}°` : '—'}
        </p>
        <p className="text-sm font-bold text-ink-soft">{full ? 'Tam bir dönüş: boşluk yok!' : over ? 'Üst üste bindi!' : ring.length ? `Boşluk: ${Math.round((360 - sum) * 10) / 10}°` : 'Bir çokgen seç'}</p>
      </div>
      {m.mode === 'single' && (
        <div className="grid grid-cols-5 gap-1.5">
          {m.polys.map((n) => (
            <div key={n} className={`flex flex-col items-center rounded-xl py-1.5 text-[11px] font-black ring-1 ${tested[n] === 'yes' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : tested[n] === 'no' ? 'bg-rose-50 text-rose-800 ring-rose-200' : 'bg-white text-ink-soft ring-line'}`}>
              <PolyIcon n={n} size={26} />
              {tested[n] === 'yes' ? 'kaplar ✓' : tested[n] === 'no' ? 'kaplamaz' : '?'}
            </div>
          ))}
        </div>
      )}
      {core.msg && <Nudge key={core.msg.id} question={core.msg.text} tone={core.msg.tone} misconception={core.msg.mis} tool={core.msg.tone === 'think' ? 'angle' : undefined} toolTitle="Açıyı modelle" />}
      {phase === 'follow' && m.follow && <FollowBox f={m.follow} onPick={pick} />}
      {m.mode === 'mix' && <SolutionList list={sol.list} goal={m.goal} />}
      {phase === 'done' && m.picker && <StrategyPicker options={m.picker} onPick={() => {}} />}
      <Footer phase={phase} onHint={core.hint} onNext={() => onDone(core.res.current)} last={step === total} />
    </>
  )

  const board = (
    <div>
      <div className="rounded-3xl bg-[#e9dcc6] p-3 shadow-[inset_0_2px_10px_rgba(80,50,20,.18)] ring-1 ring-[#d8c6a6]">
        <VertexLab ring={ring} degrees={grade >= 5} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 rounded-3xl bg-white/80 p-2 ring-1 ring-line">
        {m.polys.map((n) => (
          <button key={n} type="button" disabled={phase !== 'work'} onClick={() => add(n)} className="flex min-h-16 min-w-[72px] flex-col items-center justify-center rounded-2xl bg-[#fbf6ee] px-2 py-1 ring-1 ring-[#eadcc3] transition active:scale-95 disabled:opacity-40" aria-label={`${POLY_INFO[n].name} ekle`}>
            <PolyIcon n={n} size={36} />
            <span className="text-[11px] font-extrabold text-ink-soft">{POLY_INFO[n].name} · {Math.round(interior(n) * 10) / 10}°</span>
          </button>
        ))}
        <button type="button" disabled={!ring.length || phase !== 'work'} onClick={() => setRing(ring.slice(0, -1))} className="flex min-h-16 min-w-16 flex-col items-center justify-center rounded-2xl bg-white px-2 ring-1 ring-line active:scale-95 disabled:opacity-40" aria-label="Geri al">
          <Undo2 size={22} /><span className="text-[11px] font-extrabold text-ink-soft">geri al</span>
        </button>
        {frozen && phase === 'work' && (
          <button type="button" onClick={() => setRing([])} className="flex min-h-16 min-w-16 flex-col items-center justify-center rounded-2xl bg-emerald-50 px-2 text-emerald-900 ring-1 ring-emerald-200 active:scale-95">
            <RotateCcw size={22} /><span className="text-[11px] font-extrabold">yeni köşe</span>
          </button>
        )}
      </div>
    </div>
  )
  return <Shell board={board} panel={panel} />
}
