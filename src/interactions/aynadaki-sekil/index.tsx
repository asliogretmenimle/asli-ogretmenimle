import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, Eye, FlipHorizontal2, Undo2 } from 'lucide-react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { BigButton, Scene, useAge, useSolutions } from '../../games/kit2'
import { ZoomBox } from '../../interactive/ZoomBox'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { Card, CellBoard, ck, Derived, fitWidth, Header, Layout, NextButton, Nudge, PegBoard, PickBtn, Prompt, ToolBtn, type Handle, type Pt } from '../sekil-insa-et/ortak'
import { FIG_LINES, FIGS, ORIENT_LABEL, reflectCell, reflectPt, tasksFor, type CompleteTask, type FindTask, type LinesTask, type Mirror, type Orient, type ReflectTask } from './data'

/**
 * 48. Aynadaki Şekil — yansımayı önce tahmin et, sonra aynayı açıp gör.
 *  - complete: yarısı verilen deseni ayna doğrusuna göre tamamla (2–4)
 *  - lines: harf/logo için simetri doğrularını tahmin et, aynayla test et (2–7)
 *  - reflect: çokgenin görüntüsünün köşelerini çivilere koy, sonra aç (4–7; 6–7 çapraz ayna)
 *  - find: şekil ve görüntüsü verilir, aynayı yerleştir (5–7; 7: orta dikme)
 */

const C = '#db2777'
const ORANGE = '#f97316'
const BLUE = '#2563eb'
const LET = 'ABCDEF'

type NudgeState = { q: string; mis?: string; id: number } | null

export default function AynadakiSekil({ grade, onFinish }: InteractionProps) {
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
      summary: `${tasks.length} ayna görevini tamamladın; ${f} tanesinde tahminin ilk seferde tuttu ve ${sol.list.length} simetri bulgusu topladın.`,
      insight:
        grade <= 3
          ? 'Aynada her parça, aynaya ne kadar uzaksa görüntüsü de aynanın öbür yanında o kadar uzaktadır. Bazı şekillerin birden çok simetri doğrusu vardır.'
          : grade <= 5
            ? 'Yansımada her nokta aynaya dik yolda, aynanın öbür yanına aynı uzaklığa gider; şekil kaymaz, ters döner. Ayna, bir nokta ile görüntüsünün tam ortasındadır.'
            : 'Yansımada nokta ile görüntüsünü birleştiren doğru parçası aynaya diktir ve ayna onu tam ortadan böler: ayna doğrusu bu doğru parçasının orta dikmesidir.',
      stars: f >= tasks.length - 1 ? 3 : f >= tasks.length / 2 ? 2 : 1,
    })
  }
  const footer = done ? <NextButton isLast={isLast} onNext={() => { setIdx((i) => i + 1); setDone(false) }} onFinish={finish} /> : null
  const props = { grade, onComplete: complete, footer, addSol: (k: string, l: string) => sol.add(`${idx}:${k}`, l) }
  return (
    <Scene grade={grade}>
      <Header icon={<FlipHorizontal2 size={22} />} color={C} idx={idx} total={tasks.length} title="Aynadaki Şekil" extra={sol.list.length > 0 ? <span className="chip bg-amber-100 px-3 py-1 text-sm text-amber-900 ring-1 ring-amber-200">🪞 {sol.list.length}</span> : undefined} />
      {task.kind === 'complete' && <CompleteRound key={idx} task={task} {...props} />}
      {task.kind === 'lines' && <LinesRound key={idx} task={task} {...props} />}
      {task.kind === 'reflect' && <ReflectRound key={idx} task={task} {...props} />}
      {task.kind === 'find' && <FindRound key={idx} task={task} {...props} />}
    </Scene>
  )
}

type RoundProps = { grade: Grade; onComplete: (first: boolean) => void; footer: ReactNode; addSol: (k: string, l: string) => boolean }

// ─── Ortak çizim yardımcıları ─────────────────────────────────────────────

function lineGeom(m: Mirror) {
  const s = Math.SQRT1_2
  if (m.o === 'v') return { p0: [m.c, 0] as Pt, dir: [0, 1] as Pt, n: [1, 0] as Pt }
  if (m.o === 'h') return { p0: [0, m.c] as Pt, dir: [1, 0] as Pt, n: [0, 1] as Pt }
  if (m.o === 'd') return { p0: [0, m.c] as Pt, dir: [s, s] as Pt, n: [s, -s] as Pt }
  return { p0: [0, m.c] as Pt, dir: [s, -s] as Pt, n: [s, s] as Pt }
}

/** Ayna doğrusunu kutuya kırp */
function clipLine(m: Mirror, x0: number, y0: number, x1: number, y1: number): [Pt, Pt] | null {
  const { p0, dir } = lineGeom(m)
  let lo = -1e9, hi = 1e9
  for (const [p, d, a, b] of [[p0[0], dir[0], x0, x1], [p0[1], dir[1], y0, y1]] as const) {
    if (Math.abs(d) < 1e-9) {
      if (p < a || p > b) return null
      continue
    }
    const t1 = (a - p) / d, t2 = (b - p) / d
    lo = Math.max(lo, Math.min(t1, t2))
    hi = Math.min(hi, Math.max(t1, t2))
  }
  if (lo > hi) return null
  return [[p0[0] + dir[0] * lo, p0[1] + dir[1] * lo], [p0[0] + dir[0] * hi, p0[1] + dir[1] * hi]]
}

/** Katlanma (yansıma) dönüşümü: t=0 kimlik, t=1 tam yansıma */
function foldMatrix(m: Mirror, t: number) {
  const { p0, n } = lineGeom(m)
  const k = 2 * t
  const a = 1 - k * n[0] * n[0], d = 1 - k * n[1] * n[1], bc = -k * n[0] * n[1]
  const pn = p0[0] * n[0] + p0[1] * n[1]
  return `matrix(${a} ${bc} ${bc} ${d} ${k * pn * n[0]} ${k * pn * n[1]})`
}

function useFold() {
  const [t, setT] = useState(0)
  const raf = useRef(0)
  const play = () => {
    cancelAnimationFrame(raf.current)
    const t0 = performance.now()
    const step = (now: number) => {
      const u = Math.min(1, (now - t0) / 900)
      setT(u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2)
      if (u < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  return { t, play, set: setT }
}

function MirrorLine({ m, box, color = '#0ea5e9', dashed, width = 0.12, glow = true }: { m: Mirror; box: [number, number, number, number]; color?: string; dashed?: boolean; width?: number; glow?: boolean }) {
  const seg = clipLine(m, ...box)
  if (!seg) return null
  const [a, b] = seg
  return (
    <g pointerEvents="none">
      {glow && <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeOpacity={0.18} strokeWidth={width * 3.5} strokeLinecap="round" />}
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={width} strokeDasharray={dashed ? '0.25 0.18' : undefined} strokeLinecap="round" />
    </g>
  )
}

const keyOf = (p: Pt) => ck(p[0], p[1])
const same = (a: Pt, b: Pt) => a[0] === b[0] && a[1] === b[1]

/** Nokta → görüntü bağlantıları (orta nokta ve dik işaretiyle) */
function Connectors({ pts, m, color = '#64748b', marks }: { pts: Pt[]; m: Mirror; color?: string; marks: boolean }) {
  const { dir } = lineGeom(m)
  return (
    <g pointerEvents="none">
      {pts.map((p, i) => {
        const q = reflectPt(p, m)
        if (same(p, q)) return null
        const mid: Pt = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
        const u = [q[0] - p[0], q[1] - p[1]]
        const l = Math.hypot(u[0], u[1])
        const un: Pt = [u[0] / l, u[1] / l]
        const k = 0.22
        return (
          <g key={i}>
            <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={color} strokeWidth={0.05} strokeDasharray="0.12 0.1" />
            <circle cx={mid[0]} cy={mid[1]} r={0.1} fill={color} />
            {marks && <path d={`M${mid[0] + un[0] * k},${mid[1] + un[1] * k} l${dir[0] * k},${dir[1] * k} l${-un[0] * k},${-un[1] * k}`} fill="none" stroke={color} strokeWidth={0.045} />}
            {marks && [p, q].map((e, j) => {
              const c: Pt = [(e[0] + mid[0]) / 2, (e[1] + mid[1]) / 2]
              return <line key={j} x1={c[0] - dir[0] * 0.13} y1={c[1] - dir[1] * 0.13} x2={c[0] + dir[0] * 0.13} y2={c[1] + dir[1] * 0.13} stroke={color} strokeWidth={0.05} />
            })}
          </g>
        )
      })}
    </g>
  )
}

function Poly({ pts, color, fillOpacity = 0.28, dashed, labels, prime, width = 0.08 }: { pts: Pt[]; color: string; fillOpacity?: number; dashed?: boolean; labels?: boolean; prime?: boolean; width?: number }) {
  if (pts.length < 2) return null
  const s = pts.map((p) => p.join(',')).join(' ')
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length
  return (
    <g pointerEvents="none">
      <polygon points={s} fill={color} fillOpacity={fillOpacity} stroke={color} strokeWidth={width} strokeLinejoin="round" strokeDasharray={dashed ? '0.18 0.14' : undefined} />
      {labels &&
        pts.map((p, i) => {
          const v = [p[0] - cx, p[1] - cy]
          const l = Math.hypot(v[0], v[1]) || 1
          return (
            <g key={i}>
              <circle cx={p[0]} cy={p[1]} r={0.13} fill={color} />
              <text x={p[0] + (v[0] / l) * 0.42} y={p[1] + (v[1] / l) * 0.42 + 0.13} textAnchor="middle" fontSize={0.36} fontWeight={900} fill={color} stroke="#fff" strokeWidth={0.08} paintOrder="stroke">{LET[i]}{prime ? '′' : ''}</text>
            </g>
          )
        })}
    </g>
  )
}

const ORIENT_ICON: Record<Orient, ReactNode> = {
  v: <svg viewBox="0 0 24 24" className="size-6"><line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>,
  h: <svg viewBox="0 0 24 24" className="size-6"><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>,
  d: <svg viewBox="0 0 24 24" className="size-6"><line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>,
  a: <svg viewBox="0 0 24 24" className="size-6"><line x1="20" y1="4" x2="4" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>,
}

// ─── 1) Yarısı verilen deseni tamamla ─────────────────────────────────────

function CompleteRound({ grade, task, onComplete, footer, addSol }: RoundProps & { task: CompleteTask }) {
  const track = useTracker()
  const age = useAge(grade)
  const { cols, rows, mirror: m, given } = task
  const givenKeys = useMemo(() => new Set(given.map(keyOf)), [given])
  const target = useMemo(() => new Set(given.map((p) => keyOf(reflectCell(p, m)))), [given, m])
  const [painted, setPainted] = useState<string[]>([])
  const [tries, setTries] = useState(0)
  const [nudge, setNudge] = useState<NudgeState>(null)
  const [done, setDone] = useState(false)
  const [peek, setPeek] = useState(false)
  const fold = useFold()

  const onPaint = (k: string, add: boolean) => {
    if (done || givenKeys.has(k)) return
    setNudge(null)
    setPainted((p) => (add ? (p.includes(k) ? p : [...p, k]) : p.filter((q) => q !== k)))
  }
  const check = () => {
    const ps = new Set(painted)
    const missing = [...target].filter((k) => !ps.has(k)).length
    const extra = painted.filter((k) => !target.has(k)).length
    const ok = missing === 0 && extra === 0
    track.attempt(ok)
    if (ok) {
      setDone(true)
      setPeek(true)
      fold.play()
      sfx.ok()
      addSol('tamam', `${task.emoji} tamamlandı`)
      track.item(tries === 0)
      onComplete(tries === 0)
      return
    }
    setTries((t) => t + 1)
    // öteleme (kopyalama) yanılgısı
    const dx = m.o === 'v' ? cols / 2 : 0, dy = m.o === 'h' ? rows / 2 : 0
    const shifted = new Set(given.map(([x, y]) => ck(x + dx, y + dy)))
    const isCopy = painted.length === shifted.size && painted.every((k) => shifted.has(k))
    if (isCopy) {
      setNudge({ q: 'Deseni olduğu gibi kopyaladın, kaydırdın. Aynada sağ ile sol yer değiştirir! Aynaya en yakın kareler, aynanın öbür yanında da aynaya en yakında olmalı.', mis: 'Yansıma yerine şekli öteledi (kopyaladı)', id: Date.now() })
      return
    }
    const parts = [missing ? `${missing} kare eksik` : '', extra ? `${extra} kare fazla` : ''].filter(Boolean).join(', ')
    setNudge({
      q: `Henüz tam değil (${parts}). Her satırda renkli karelerin aynaya kaç kare uzakta olduğunu say: görüntüleri aynanın öbür yanında aynı uzaklıkta mı?`,
      mis: extra && !missing ? undefined : tries >= 1 ? 'Yansımada uzaklığı korumakta zorlandı' : undefined,
      id: Date.now(),
    })
  }
  const box: [number, number, number, number] = [-0.3, -0.3, cols + 0.3, rows + 0.3]
  const cells = [...given.map(keyOf), ...painted]
  return (
    <Layout
      top={<Prompt emoji={task.emoji} color={C}>{task.text}</Prompt>}
      work={
        <div>
          <div style={fitWidth((cols + 0.5) / (rows + 0.5), 280)}>
            <ZoomBox>
              <CellBoard cols={cols} rows={rows} cells={cells} onPaint={onPaint} canPaint={(x, y) => (m.o === 'v' ? x >= m.c : y >= m.c)} cellFill={(k) => (givenKeys.has(k) ? ORANGE : done ? '#16a34a' : BLUE)} locked={done} bg={age.tier === 'mini' ? '#fffdf5' : '#fff'}>
                <MirrorLine m={m} box={box} />
                {peek && (
                  <g transform={foldMatrix(m, fold.t)} opacity={0.55} pointerEvents="none">
                    {given.map(([x, y]) => <rect key={`${x},${y}`} x={x + 0.1} y={y + 0.1} width={0.8} height={0.8} rx={0.15} fill="none" stroke={ORANGE} strokeWidth={0.08} />)}
                  </g>
                )}
              </CellBoard>
            </ZoomBox>
          </div>
          <p className="mt-2 text-center text-sm font-bold text-ink-soft">{done ? 'Ayna katlandı: turuncu kareler tam senin karelerinin üstüne oturdu!' : 'Karelere dokun ya da parmağını gezdirerek boya. Tekrar dokunursan silinir.'}</p>
        </div>
      }
      panel={
        <>
          <Card title="Aynanın öbür yanı">
            <p className="text-sm font-bold text-ink-soft">Boyadığın: <b className="text-ink">{painted.length}</b> kare · Turuncu: <b className="text-ink">{given.length}</b> kare</p>
          </Card>
          {nudge && <Nudge key={nudge.id} question={nudge.q} misconception={nudge.mis} tool="symmetry" onClose={() => setNudge(null)} />}
          {!done && (
            <div className="flex flex-col gap-2">
              <BigButton onClick={check} disabled={!painted.length} className="w-full"><Check size={20} />Aynayla kontrol et</BigButton>
              {tries >= 2 && !peek && (
                <button type="button" className="btn-ghost min-h-12 w-full" onClick={() => { setPeek(true); fold.play(); track.hint() }}><Eye size={18} />Katlayıp bak</button>
              )}
            </div>
          )}
          {done && <Derived>Her kare aynaya ne kadar uzaksa, görüntüsü de aynanın öbür yanında o kadar uzakta!</Derived>}
          {footer}
        </>
      }
    />
  )
}

// ─── 2) Simetri doğrularını bul ───────────────────────────────────────────

function LinesRound({ grade, task, onComplete, footer, addSol }: RoundProps & { task: LinesTask }) {
  const track = useTracker()
  const age = useAge(grade)
  const fig = FIGS[task.fig]
  const cellKeys = useMemo(() => fig.cells.map(keyOf), [fig])
  const symmetric = useMemo(() => {
    const s = new Set(cellKeys)
    const r = {} as Record<Orient, boolean>
    for (const o of ['v', 'h', 'd', 'a'] as Orient[]) r[o] = fig.cells.every((p) => s.has(keyOf(reflectCell(p, FIG_LINES[o]))))
    return r
  }, [fig, cellKeys])
  const correct = task.orients.filter((o) => symmetric[o])
  const [sel, setSel] = useState<Orient[]>([])
  const [none, setNone] = useState(false)
  const [found, setFound] = useState<Orient[]>([])
  const [wrong, setWrong] = useState<Orient[]>([])
  const [show, setShow] = useState<Orient | null>(null)
  const [tries, setTries] = useState(0)
  const [nudge, setNudge] = useState<NudgeState>(null)
  const [done, setDone] = useState(false)
  const fold = useFold()

  const toggle = (o: Orient) => {
    if (done || found.includes(o)) return
    setNone(false)
    setNudge(null)
    setSel((s) => (s.includes(o) ? s.filter((q) => q !== o) : [...s, o]))
  }
  const test = () => {
    const picked = sel.filter((o) => !found.includes(o))
    const good = picked.filter((o) => symmetric[o])
    const bad = picked.filter((o) => !symmetric[o])
    const nf = [...found, ...good]
    good.forEach((o) => addSol(o, `${fig.emoji} ${ORIENT_LABEL[o]}`))
    setFound(nf)
    setWrong((w) => [...new Set([...w, ...bad])])
    setSel(nf)
    const missing = correct.filter((o) => !nf.includes(o))
    const allOk = bad.length === 0 && missing.length === 0 && (correct.length > 0 || none)
    track.attempt(allOk)
    if (bad.length) {
      setShow(bad[0])
      fold.set(0)
      fold.play()
    } else if (good.length) {
      setShow(good[good.length - 1])
      fold.set(0)
      fold.play()
    }
    if (allOk) {
      setDone(true)
      setNudge(null)
      sfx.ok()
      const first = tries === 0
      track.item(first)
      onComplete(first)
      return
    }
    setTries((t) => t + 1)
    if (bad.length) {
      const diag = bad.some((o) => o === 'd' || o === 'a')
      setNudge({
        q: `${ORIENT_LABEL[bad[0]]} doğru boyunca katladığımızda mor gölge şeklin üstüne tam oturdu mu? Hangi kareler açıkta kaldı?`,
        mis: diag && !symmetric.d && !symmetric.a ? 'Köşegeni (çapraz doğruyu) simetri doğrusu sandı' : 'Şekli ikiye bölen her doğruyu simetri doğrusu sandı',
        id: Date.now(),
      })
    } else if (missing.length) {
      const needDiag = missing.some((o) => o === 'd' || o === 'a')
      setNudge({ q: nf.length ? `Harika, ${nf.length} tane buldun! Ama ${missing.length === 1 ? 'bir' : missing.length} simetri doğrusu daha var. ${needDiag ? 'Şekli çapraz katlamayı düşündün mü?' : 'Şekli başka bir yönde katlamayı düşün.'}` : `Bu şeklin ${correct.length === 1 ? 'bir' : 'birden çok'} simetri doğrusu var. Hangi yönde katlarsan iki yarı üst üste gelir?`, id: Date.now() })
    } else if (!correct.length && !none) {
      setNudge({ q: 'Bir doğru seç ya da şeklin hiç simetri doğrusu olmadığını düşünüyorsan “Hiç yok” de.', id: Date.now() })
    }
  }
  const sayNone = () => {
    setSel([])
    setNone(true)
    if (correct.length === 0) {
      track.attempt(true)
      setDone(true)
      sfx.ok()
      addSol('yok', `${fig.emoji} simetri doğrusu yok`)
      track.item(tries === 0)
      onComplete(tries === 0)
    } else {
      track.attempt(false)
      setTries((t) => t + 1)
      setNudge({ q: 'Bu şekli öyle bir katlayabilir misin ki iki yarısı tam üst üste gelsin? Bir doğru seçip aynayla test et.', mis: 'Simetrik şekli simetrik değil sandı', id: Date.now() })
    }
  }

  const box: [number, number, number, number] = [-0.6, -0.6, 7.6, 7.6]
  const lineColor = (o: Orient) => (found.includes(o) ? '#16a34a' : wrong.includes(o) && !sel.includes(o) ? '#e11d48' : sel.includes(o) ? '#0ea5e9' : '#94a3b8')
  return (
    <Layout
      top={<Prompt emoji={fig.emoji} color={C}>{task.text}</Prompt>}
      work={
        <div>
          <div style={fitWidth(1, 330)}>
            <ZoomBox>
              <CellBoard cols={7} rows={7} cells={cellKeys} fill="#7c3aed" locked pad={0.6} bg="#fff">
                {show && (
                  <g transform={foldMatrix(FIG_LINES[show], fold.t)} opacity={0.5} pointerEvents="none">
                    {fig.cells.map(([x, y]) => <rect key={`${x},${y}`} x={x + 0.12} y={y + 0.12} width={0.76} height={0.76} rx={0.14} fill={symmetric[show] ? '#16a34a' : '#f59e0b'} />)}
                  </g>
                )}
                {task.orients.map((o) => (
                  <MirrorLine key={o} m={FIG_LINES[o]} box={box} color={lineColor(o)} dashed={!found.includes(o) && !sel.includes(o)} width={found.includes(o) || sel.includes(o) ? 0.11 : 0.06} glow={sel.includes(o) || found.includes(o)} />
                ))}
              </CellBoard>
            </ZoomBox>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {task.orients.map((o) => (
              <button key={o} type="button" onClick={() => toggle(o)} disabled={done} aria-pressed={sel.includes(o)} className={`flex ${age.big ? 'min-h-14' : 'min-h-12'} items-center gap-1.5 rounded-xl px-3 text-sm font-extrabold ring-2 transition active:scale-95`} style={{ color: lineColor(o), background: sel.includes(o) || found.includes(o) ? `${lineColor(o)}14` : '#fff', borderColor: lineColor(o) }}>
                {ORIENT_ICON[o]}{ORIENT_LABEL[o]}{found.includes(o) ? ' ✓' : wrong.includes(o) && !sel.includes(o) ? ' ✗' : ''}
              </button>
            ))}
          </div>
        </div>
      }
      panel={
        <>
          <Card title="Simetri doğruları">
            <p className="text-sm font-bold text-ink-soft">Doğruların düğmelerine dokunarak tahminini seç. Yeşil: aynayla doğrulandı.</p>
            {found.length > 0 && <p className="mt-1 text-base font-black text-green-800">Bulunan: {found.length}</p>}
          </Card>
          {nudge && <Nudge key={nudge.id} question={nudge.q} misconception={nudge.mis} tool="symmetry" onClose={() => setNudge(null)} />}
          {!done && (
            <div className="flex flex-col gap-2">
              <BigButton onClick={test} disabled={!sel.some((o) => !found.includes(o))} className="w-full"><FlipHorizontal2 size={20} />Aynayla test et</BigButton>
              {found.length === 0 && <button type="button" onClick={sayNone} className="btn-ghost min-h-12 w-full">🚫 Hiç simetri doğrusu yok</button>}
            </div>
          )}
          {done && <Derived>{correct.length ? `${fig.name}: ${correct.length} simetri doğrusu (${correct.map((o) => ORIENT_LABEL[o].toLocaleLowerCase('tr-TR')).join(', ')}).` : `${fig.name} döndürünce kendine benziyor ama hiç simetri doğrusu yok!`}</Derived>}
          {footer}
        </>
      }
    />
  )
}

// ─── 3) Görüntüyü tahmin et ───────────────────────────────────────────────

function ReflectRound({ grade, task, onComplete, footer, addSol }: RoundProps & { task: ReflectTask }) {
  const track = useTracker()
  const age = useAge(grade)
  const { cols, rows, mirror: m, pts } = task
  const img = useMemo(() => pts.map((p) => reflectPt(p, m)), [pts, m])
  const [pred, setPred] = useState<Pt[]>([])
  const [tries, setTries] = useState(0)
  const [status, setStatus] = useState<boolean[] | null>(null)
  const [reveal, setReveal] = useState(false)
  const [nudge, setNudge] = useState<NudgeState>(null)
  const [phase, setPhase] = useState<'place' | 'q' | 'done'>('place')
  const [qPick, setQPick] = useState<number | null>(null)
  const fold = useFold()
  const full = pred.length === pts.length

  const succeed = (first: boolean) => {
    setStatus(pred.map(() => true))
    setNudge(null)
    sfx.ok()
    setReveal(true)
    fold.set(0)
    fold.play()
    addSol('yansima', `Yansıma (${ORIENT_LABEL[m.o].toLocaleLowerCase('tr-TR')} ayna)`)
    if (task.bisector) {
      setPhase('q')
      return
    }
    setPhase('done')
    track.item(first)
    onComplete(first)
  }

  // Gösterimden sonra öğrenci noktaları doğru yere sürükleyince tamamla
  useEffect(() => {
    if (phase !== 'place' || !reveal || !full) return
    if (pred.every((p, i) => same(p, img[i]))) succeed(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pred, reveal, phase])

  const onTap = (x: number, y: number) => {
    if (phase !== 'place' || full) return
    if (pred.some((p) => p[0] === x && p[1] === y)) return
    setStatus(null)
    setNudge(null)
    setPred((p) => [...p, [x, y]])
  }
  const onMove = (id: string, x: number, y: number) => {
    if (phase !== 'place') return
    const i = Number(id.slice(1))
    setStatus(null)
    setPred((p) => p.map((q, j) => (j === i ? [x, y] : q)))
  }
  const check = () => {
    const ok = pred.every((p, i) => same(p, img[i]))
    const setOk = !ok && pred.every((p) => img.some((q) => same(p, q))) && new Set(pred.map(keyOf)).size === pred.length
    track.attempt(ok || setOk)
    if (ok || setOk) {
      if (setOk) setPred(img)
      succeed(tries === 0)
      return
    }
    const st = pred.map((p, i) => same(p, img[i]))
    setStatus(st)
    const t = tries + 1
    setTries(t)
    const dx = pred[0][0] - pts[0][0], dy = pred[0][1] - pts[0][1]
    const isShift = pred.every((p, i) => p[0] - pts[i][0] === dx && p[1] - pts[i][1] === dy)
    const i = st.findIndex((x) => !x)
    const L = LET[i]
    const p = pts[i], q = pred[i]
    const onPerp = m.o === 'v' ? q[1] === p[1] : m.o === 'h' ? q[0] === p[0] : m.o === 'd' ? q[0] + q[1] === p[0] + p[1] : q[0] - q[1] === p[0] - p[1]
    let msg: { q: string; mis?: string }
    if (isShift) msg = { q: 'Şekli aynanın öbür yanına kaydırdın. Ama aynada şekil ters döner! Aynaya en yakın köşe, görüntüde de aynaya en yakın olmalı.', mis: 'Yansıma yerine öteleme yaptı (şekli kaydırdı)' }
    else if (onPerp) msg = { q: `${L} noktası aynaya kaç adım uzakta? ${L}′ de aynanın öbür yanında aynı uzaklıkta mı?`, mis: 'Yansımada noktanın aynaya uzaklığını korumadı' }
    else if (m.o === 'd' || m.o === 'a') msg = { q: `${L} noktasından aynaya dik yürü: çapraz aynada bu yol da çaprazdır (bir sağa, bir ${m.o === 'd' ? 'yukarı' : 'aşağı'} gibi). ${L}′ bu yolun üstünde mi?`, mis: 'Çapraz aynada yansımayı yatay/dikey taşıdı' }
    else msg = { q: `${L} noktasından aynaya en kısa yoldan (dik) git. ${L}′ bu yolun devamında olmalı. Seninki aynı ${m.o === 'v' ? 'satırda' : 'sütunda'} mı?` }
    if (t >= 2) {
      setReveal(true)
      fold.set(0)
      fold.play()
      setNudge({ q: msg.q + ' Aynayı açtım: kesikli görüntüye bak ve turuncu işaretli köşelerini oraya sürükle.', mis: msg.mis, id: Date.now() })
    } else setNudge({ ...msg, id: Date.now() })
  }
  const pickQ = (i: number) => {
    setQPick(i)
    const ok = i === 0
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      setNudge(null)
      setPhase('done')
      track.item(tries === 0)
      onComplete(tries === 0)
    } else setNudge({ q: i === 1 ? 'Ayna ile AA′ çizgisi arasındaki açıya bak. Paralel çizgiler hiç kesişmez; bunlar kesişiyor mu?' : 'Köşedeki küçük kare işaretine bak: ayna ile AA′ arasındaki açı kaç derece?', mis: 'Ayna doğrusu ile orta dikme ilişkisini kuramadı', id: Date.now() })
  }

  const handles: Handle[] = phase === 'place' ? pred.map((p, i) => ({ id: `p${i}`, x: p[0], y: p[1], color: status ? (status[i] ? '#16a34a' : '#f59e0b') : BLUE, label: `${LET[i]}′`, ring: !!status && !status[i] })) : []
  const box: [number, number, number, number] = [-0.5, -0.5, cols + 0.5, rows + 0.5]
  return (
    <Layout
      top={<Prompt emoji="🪞" color={C}>{task.text}</Prompt>}
      work={
        <div>
          <div style={fitWidth((cols + 1.4) / (rows + 1.4), 280)}>
            <ZoomBox>
              <PegBoard cols={cols} rows={rows} handles={handles} onTap={onTap} onHandleMove={onMove} locked={phase !== 'place'} handleR={age.big ? 0.32 : 0.27}>
                <MirrorLine m={m} box={box} />
                <Poly pts={pts} color={ORANGE} labels />
                {reveal && (
                  <g transform={foldMatrix(m, fold.t)} opacity={0.6}>
                    <Poly pts={pts} color={ORANGE} fillOpacity={0.12} dashed width={0.06} />
                  </g>
                )}
                {pred.length >= 2 && <Poly pts={pred} color={phase === 'place' ? BLUE : '#16a34a'} fillOpacity={pred.length === pts.length ? 0.22 : 0} labels={phase !== 'place'} prime />}
                {phase !== 'place' && grade >= 5 && <Connectors pts={pts} m={m} marks={grade >= 6} />}
              </PegBoard>
            </ZoomBox>
          </div>
          {phase === 'place' && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <ToolBtn big={age.big} onClick={() => { setPred((p) => p.slice(0, -1)); setStatus(null) }} disabled={!pred.length}><Undo2 size={18} />Geri al</ToolBtn>
              <span className="text-sm font-bold text-ink-soft">{full ? 'Köşeleri sürükleyerek düzeltebilirsin.' : `Sıradaki: ${LET[pred.length]}′ — bir çiviye dokun.`}</span>
            </div>
          )}
        </div>
      }
      panel={
        <>
          <Card title="Tahminin">
            <div className="flex flex-wrap gap-1.5">
              {pts.map((_, i) => (
                <span key={i} className="chip px-3 py-1 text-sm" style={{ background: status ? (status[i] ? '#dcfce7' : '#fef3c7') : pred[i] ? '#dbeafe' : '#f1f5f9', color: '#1f2340' }}>
                  {LET[i]}′ {pred[i] ? (status ? (status[i] ? '✓' : '?') : '•') : '—'}
                </span>
              ))}
            </div>
          </Card>
          {nudge && <Nudge key={nudge.id} question={nudge.q} misconception={nudge.mis} tool="symmetry" onClose={() => setNudge(null)} />}
          {phase === 'place' && !(reveal && tries >= 2) && <BigButton onClick={check} disabled={!full} className="w-full"><FlipHorizontal2 size={20} />Aynayı aç</BigButton>}
          {phase === 'q' && (
            <Card title="Düşün">
              <p className="mb-2 text-[17px] leading-snug font-extrabold">Kesikli çizgiler her köşeyi görüntüsüne bağlıyor. Ayna doğrusu, AA′ doğru parçası için nedir?</p>
              <div className="grid gap-2">
                {['AA′’ye dik ve onu tam ortadan bölüyor: orta dikmesi', 'AA′’ye paralel', 'AA′’yi ortadan bölüyor ama dik değil'].map((t, i) => (
                  <PickBtn key={i} on={qPick === i} color={i === 0 && qPick === 0 ? '#16a34a' : C} onClick={() => pickQ(i)} className="text-left text-[15px] leading-snug">{t}</PickBtn>
                ))}
              </div>
            </Card>
          )}
          {phase === 'done' && (
            <Derived>
              {grade >= 6
                ? 'Her nokta ile görüntüsünü birleştiren doğru parçası aynaya dik ve ayna onu tam ortadan bölüyor.'
                : 'Her köşe aynaya ne kadar uzaksa, görüntüsü de öbür yanda o kadar uzakta. Şekil ters döndü ama biçimi ve büyüklüğü değişmedi.'}
            </Derived>
          )}
          {footer}
        </>
      }
    />
  )
}

// ─── 4) Aynayı bul ────────────────────────────────────────────────────────

function handleOf(m: Mirror, cols: number, rows: number): Pt {
  if (m.o === 'v') return [m.c, Math.round(rows / 2)]
  if (m.o === 'h') return [Math.round(cols / 2), m.c]
  if (m.o === 'd') {
    let x = Math.round((cols / 2 + rows / 2 - m.c) / 2)
    x = Math.max(0, Math.min(cols, x))
    return [x, x + m.c]
  }
  let x = Math.round((cols / 2 - rows / 2 + m.c) / 2)
  x = Math.max(0, Math.min(cols, x))
  return [x, m.c - x]
}
const mirrorThrough = (o: Orient, [x, y]: Pt): Mirror => ({ o, c: o === 'v' ? x : o === 'h' ? y : o === 'd' ? y - x : x + y })

function FindRound({ grade, task, onComplete, footer, addSol }: RoundProps & { task: FindTask }) {
  const track = useTracker()
  const age = useAge(grade)
  const { cols, rows, pts } = task
  const img = useMemo(() => pts.map((p) => reflectPt(p, task.mirror)), [pts, task.mirror])
  const [m, setM] = useState<Mirror>(task.start)
  const [h, setH] = useState<Pt>(() => handleOf(task.start, cols, rows))
  const [tries, setTries] = useState(0)
  const [nudge, setNudge] = useState<NudgeState>(null)
  const [done, setDone] = useState(false)
  const fold = useFold()
  const [preview, setPreview] = useState(false)

  const setOrient = (o: Orient) => {
    if (done) return
    setNudge(null)
    setPreview(false)
    setM(mirrorThrough(o, h))
  }
  const onMove = (_: string, x: number, y: number) => {
    if (done) return
    setNudge(null)
    setPreview(false)
    setH([x, y])
    setM(mirrorThrough(m.o, [x, y]))
  }
  const check = () => {
    const ok = pts.every((p, i) => same(reflectPt(p, m), img[i]))
    track.attempt(ok)
    setPreview(true)
    fold.set(0)
    fold.play()
    if (ok) {
      setDone(true)
      setNudge(null)
      sfx.ok()
      addSol('ayna', `Ayna: ${ORIENT_LABEL[m.o].toLocaleLowerCase('tr-TR')}`)
      track.item(tries === 0)
      onComplete(tries === 0)
      return
    }
    setTries((t) => t + 1)
    const v = [img[0][0] - pts[0][0], img[0][1] - pts[0][1]]
    const perp = task.mirror.o === m.o
    if (!perp)
      setNudge({ q: 'Mor gölge görüntünün üstüne oturmadı. A noktasından A′ noktasına giden yola bak: ayna bu yola dik durmalı. Hangi yönde?', mis: v[0] && v[1] && (m.o === 'v' || m.o === 'h') ? 'Çapraz yansımada aynayı yatay/dikey sandı' : 'Ayna doğrusunun nokta–görüntü doğrusuna dik olduğunu kullanmadı', id: Date.now() })
    else setNudge({ q: 'Yönü doğru! Şimdi A ile A′ noktalarının aynaya uzaklıklarını karşılaştır. Ayna tam ortalarında mı?', mis: 'Aynayı nokta ile görüntüsünün tam ortasına koymadı', id: Date.now() })
  }
  const box: [number, number, number, number] = [-0.5, -0.5, cols + 0.5, rows + 0.5]
  const handles: Handle[] = done ? [] : [{ id: 'm', x: h[0], y: h[1], color: '#0ea5e9', ring: true, label: '⇔' }]
  return (
    <Layout
      top={<Prompt emoji="🔍" color={C}>{task.text}</Prompt>}
      work={
        <div>
          <div style={fitWidth((cols + 1.4) / (rows + 1.4), 300)}>
            <ZoomBox>
              <PegBoard cols={cols} rows={rows} handles={handles} onHandleMove={onMove} locked={done} handleR={age.big ? 0.34 : 0.3}>
                <Poly pts={pts} color={ORANGE} labels />
                <Poly pts={img} color={BLUE} labels prime />
                {preview && (
                  <g transform={foldMatrix(m, fold.t)} opacity={0.5}>
                    <Poly pts={pts} color="#7c3aed" fillOpacity={0.2} dashed width={0.06} />
                  </g>
                )}
                <MirrorLine m={m} box={box} color={done ? '#16a34a' : '#0ea5e9'} />
                {done && grade >= 6 && <Connectors pts={pts} m={m} marks />}
              </PegBoard>
            </ZoomBox>
          </div>
          {!done && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {task.orients.map((o) => (
                <ToolBtn key={o} big={age.big} active={m.o === o} onClick={() => setOrient(o)} label={ORIENT_LABEL[o]}>{ORIENT_ICON[o]}<span className="max-sm:hidden">{ORIENT_LABEL[o]}</span></ToolBtn>
              ))}
            </div>
          )}
          {!done && <p className="mt-2 text-center text-sm font-bold text-ink-soft">Mavi tutamacı sürükleyerek aynayı kaydır; düğmelerle yönünü değiştir.</p>}
        </div>
      }
      panel={
        <>
          {nudge && <Nudge key={nudge.id} question={nudge.q} misconception={nudge.mis} tool="symmetry" onClose={() => setNudge(null)} />}
          {!done && <BigButton onClick={check} className="w-full"><Check size={20} />Aynayı dene</BigButton>}
          {done && <Derived>{grade >= 6 ? 'Ayna, her noktayı görüntüsüne bağlayan doğru parçasının orta dikmesi: ona dik ve onu tam ortadan bölüyor.' : 'Ayna, her nokta ile görüntüsünün tam ortasında duruyor.'}</Derived>}
          {footer}
        </>
      }
    />
  )
}

