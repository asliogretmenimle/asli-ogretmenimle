import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, Eraser, Fence } from 'lucide-react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { BigButton, Scene, useAge, useSolutions } from '../../games/kit2'
import { ZoomBox } from '../../interactive/ZoomBox'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { ek } from '../../lib/generators'
import { boundaryEdges, Card, CellBoard, cellsConnected, cellsHaveHole, cellsPerimeter, ck, Derived, fitWidth, Header, Layout, MiniCells, NextButton, Nudge, NumStepper, PegBoard, PickBtn, pk, Prompt, ToolBtn, useGridGesture, type Handle, type Pt } from '../sekil-insa-et/ortak'

/**
 * 50. Çevre Tuzağı — “çevresi aynı olan şekillerin alanı da aynıdır” tuzağı.
 *  - walk: çiti (çevreyi) birim kenarlara dokunarak say; aynı alanlı iki bahçeden hangisine daha çok çit?
 *  - grass: çitleri aynı uzunlukta iki bahçe: hangisinde daha çok çim? Tahmin → çim ek (kaplayarak test)
 *  - rope: 12/16/20 birimlik ip hep gergin: köşeyi sürükle, dikdörtgen değişir, çevre aynı, alan değişir → en büyük alan
 *  - same: aynı sayıda kareyle en uzun ve en kısa çevre
 *  - corner: köşeden kare çıkar → çevre aynı! kenardan çıkar → çevre artar!
 */

const C = '#db2777'
const GRASS = '#22c55e'
const FENCE = '#92400e'

type Shape = { label: 'A' | 'B'; cells: string[] }
type WalkTask = { kind: 'walk'; shapes: Shape[]; text: string; estimate?: boolean }
type GrassTask = { kind: 'grass'; shapes: Shape[]; text: string }
type RopeTask = { kind: 'rope'; P: number; text: string }
type SameTask = { kind: 'same'; n: number; text: string }
type CornerTask = { kind: 'corner'; w: number; h: number; text: string }
type Task = WalkTask | GrassTask | RopeTask | SameTask | CornerTask

const rect = (x0: number, y0: number, w: number, h: number) => Array.from({ length: w * h }, (_, i) => ck(x0 + (i % w), y0 + Math.floor(i / w)))
const K = (pts: Pt[]) => pts.map(([x, y]) => ck(x, y))

function tasksFor(grade: Grade): Task[] {
  const walk = (a: string[], b: string[]): WalkTask => ({ kind: 'walk', shapes: [{ label: 'A', cells: a }, { label: 'B', cells: b }], text: `İki bahçenin de alanı ${a.length} kare. Hangisine **daha çok çit** gerekir? Önce tahmin et, sonra çitin her parçasına dokunarak say.` })
  const grass = (a: string[], b: string[]): GrassTask => ({ kind: 'grass', shapes: [{ label: 'A', cells: a }, { label: 'B', cells: b }], text: `İki bahçenin çiti de ${cellsPerimeter(a)} birim. Hangisine **daha çok çim** ekilir? Önce tahmin et, sonra çim ekerek test et.` })
  const rope = (P: number): RopeTask => ({ kind: 'rope', P, text: `Bu ip tam **${P} birim**. İple dikdörtgen bir bahçe çeviriyoruz. Köşeyi sürükleyerek farklı dikdörtgenler yap: hangisinin **alanı en büyük**?` })
  const same = (n: number): SameTask => ({ kind: 'same', n, text: `Tam **${n} kareyle** iki şekil yap: biri **çevresi en uzun**, öbürü **çevresi en kısa** olsun.` })
  const corner = (w: number, h: number): CornerTask => ({ kind: 'corner', w, h, text: `${w} × ${h} bir dikdörtgenden kare çıkaracağız. Çevresi ne olacak? Önce tahmin et, sonra çıkar!` })
  const L = [...rect(2, 1, 2, 4), ...rect(4, 3, 3, 2)]
  if (grade === 3) return [walk(rect(1, 1, 3, 2), rect(6, 2, 6, 1)), { kind: 'walk', shapes: [{ label: 'A', cells: L }], text: 'Bu L biçimli bahçeye kaç birim çit gerekir? Önce **tahmin et**, sonra çitin her parçasına dokunarak say.', estimate: true }, grass(rect(1, 2, 5, 1), rect(8, 1, 3, 3)), same(6)]
  if (grade === 4) return [walk(rect(1, 1, 4, 2), K([[7, 1], [8, 1], [8, 2], [9, 2], [9, 3], [10, 3], [10, 4], [11, 4]])), grass(rect(1, 2, 6, 1), rect(9, 1, 3, 4)), rope(12), same(8)]
  if (grade === 5) return [grass(rect(1, 2, 7, 1), rect(9, 0, 4, 4)), rope(16), same(12), corner(4, 4)]
  return [grass(rect(0, 1, 8, 2), rect(9, 0, 5, 5)), rope(20), corner(5, 4), same(16)]
}

export default function CevreTuzagi({ grade, onFinish }: InteractionProps) {
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
      summary: `${tasks.length} çevre tuzağını inceledin ve ${sol.list.length} farklı şekil/dikdörtgen buldun; ${f} tahminin ilk seferde tuttu.`,
      insight:
        grade <= 4
          ? 'Çevre ve alan farklı ölçülerdir: çitleri eşit uzunlukta olan bahçelerin alanları farklı olabilir, alanları eşit olan bahçelerin çitleri de.'
          : 'Çevre sabitken dikdörtgen kareye yaklaştıkça alanı büyür; alan sabitken şekil topaklaştıkça çevresi kısalır. Köşeden kare çıkarmak alanı azaltır ama çevreyi değiştirmez.',
      stars: f >= tasks.length - 1 ? 3 : f >= tasks.length / 2 ? 2 : 1,
    })
  }
  const footer = done ? <NextButton isLast={isLast} onNext={() => { setIdx((i) => i + 1); setDone(false) }} onFinish={finish} /> : null
  const p = { grade, onComplete: complete, footer, addSol: (k: string, l: string) => sol.add(`${idx}:${k}`, l) }
  return (
    <Scene grade={grade}>
      <Header icon={<Fence size={22} />} color={C} idx={idx} total={tasks.length} title="Çevre Tuzağı" extra={sol.list.length > 0 ? <span className="chip bg-amber-100 px-3 py-1 text-sm text-amber-900 ring-1 ring-amber-200">🪤 {sol.list.length}</span> : undefined} />
      {task.kind === 'walk' && <WalkRound key={idx} task={task} {...p} />}
      {task.kind === 'grass' && <GrassRound key={idx} task={task} {...p} />}
      {task.kind === 'rope' && <RopeRound key={idx} task={task} {...p} />}
      {task.kind === 'same' && <SameRound key={idx} task={task} {...p} />}
      {task.kind === 'corner' && <CornerRound key={idx} task={task} {...p} />}
    </Scene>
  )
}

type RP = { grade: Grade; onComplete: (first: boolean) => void; footer: ReactNode; addSol: (k: string, l: string) => boolean }
type NS = { q: string; mis?: string; id: number } | null
type Edge = [number, number, number, number]
const edgeKey = (e: Edge) => e.join(',')

function boardSize(shapes: Shape[]) {
  const ps = shapes.flatMap((s) => s.cells.map(pk))
  return { cols: Math.max(...ps.map((p) => p[0])) + 2, rows: Math.max(...ps.map((p) => p[1])) + 2 }
}

/** Sınır kenarlarını çevre boyunca sıraya diz (numaralandırma için) */
function orderEdges(edges: Edge[]): Edge[] {
  const left = [...edges]
  const out: Edge[] = []
  while (left.length) {
    let cur = left.shift()!
    out.push(cur)
    for (;;) {
      const ex = cur[2], ey = cur[3]
      const i = left.findIndex((e) => (e[0] === ex && e[1] === ey) || (e[2] === ex && e[3] === ey))
      if (i < 0) break
      const e = left.splice(i, 1)[0]
      cur = e[0] === ex && e[1] === ey ? e : [e[2], e[3], e[0], e[1]]
      out.push(cur)
    }
  }
  return out
}

/** Çit çizimi: kenarlar + direkler; numaralar şeklin dışında */
function FenceLines({ edges, color = FENCE, numbers, cells }: { edges: Edge[]; color?: string; numbers?: boolean; cells?: string[] }) {
  const posts = new Set<string>()
  edges.forEach(([a, b, c, d]) => { posts.add(`${a},${b}`); posts.add(`${c},${d}`) })
  const set = new Set(cells ?? [])
  const labelPos = (e: Edge): [number, number] => {
    const mx = (e[0] + e[2]) / 2, my = (e[1] + e[3]) / 2
    if (e[1] === e[3]) {
      const below = set.has(ck(Math.floor(mx), e[1]))
      return [mx, below || !cells ? e[1] - 0.17 : e[1] + 0.36]
    }
    const right = set.has(ck(e[0], Math.floor(my)))
    return [right || !cells ? e[0] - 0.24 : e[0] + 0.24, my + 0.11]
  }
  return (
    <g pointerEvents="none">
      {edges.map((e, i) => {
        const [lx, ly] = labelPos(e)
        return (
          <g key={edgeKey(e)}>
            <line x1={e[0]} y1={e[1]} x2={e[2]} y2={e[3]} stroke={color} strokeWidth={0.13} strokeLinecap="round" />
            {numbers && <text x={lx} y={ly} textAnchor="middle" fontSize={0.28} fontWeight={900} fill={color} stroke="#fff" strokeWidth={0.06} paintOrder="stroke">{i + 1}</text>}
          </g>
        )
      })}
      {[...posts].map((p) => { const [x, y] = p.split(',').map(Number); return <circle key={p} cx={x} cy={y} r={0.09} fill={color} /> })}
    </g>
  )
}

function ShapeUnder({ shapes, fillOp = 0.16 }: { shapes: Shape[]; fillOp?: number }) {
  return (
    <g pointerEvents="none">
      {shapes.map((s) => {
        const ps = s.cells.map(pk)
        const cx = ps.reduce((a, p) => a + p[0] + 0.5, 0) / ps.length, cy = ps.reduce((a, p) => a + p[1] + 0.5, 0) / ps.length
        const col = s.label === 'A' ? '#ea580c' : '#7c3aed'
        return (
          <g key={s.label}>
            {ps.map(([x, y]) => <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={col} fillOpacity={fillOp} />)}
            <text x={cx} y={cy + 0.25} textAnchor="middle" fontSize={0.75} fontWeight={900} fill={col} fillOpacity={0.35}>{s.label}</text>
          </g>
        )
      })}
    </g>
  )
}

const segDist = (p: Pt, e: Edge) => {
  const [x1, y1, x2, y2] = e
  const dx = x2 - x1, dy = y2 - y1
  const t = Math.max(0, Math.min(1, ((p[0] - x1) * dx + (p[1] - y1) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p[0] - (x1 + t * dx), p[1] - (y1 + t * dy))
}

// ─── Çiti say ─────────────────────────────────────────────────────────────

function WalkRound({ grade, task, onComplete, footer, addSol }: RP & { task: WalkTask }) {
  const track = useTracker()
  const age = useAge(grade)
  const { cols, rows } = boardSize(task.shapes)
  const edgesOf = useMemo(() => task.shapes.map((s) => boundaryEdges(s.cells)), [task.shapes])
  const all = useMemo(() => edgesOf.flatMap((es, i) => es.map((e) => ({ e, s: i }))), [edgesOf])
  const two = task.shapes.length === 2
  const [pred, setPred] = useState<'A' | 'B' | '=' | null>(null)
  const [est, setEst] = useState<number | null>(null)
  const [estSent, setEstSent] = useState(false)
  const [fenced, setFenced] = useState<Edge[][]>(task.shapes.map(() => []))
  const [done, setDone] = useState(false)
  const svg = useRef<SVGSVGElement>(null)
  const ready = two ? !!pred : estSent
  const per = edgesOf.map((e) => e.length)
  const truth: 'A' | 'B' | '=' = two ? (per[0] > per[1] ? 'A' : per[1] > per[0] ? 'B' : '=') : '='

  const hit = (p: Pt, maxD: number) => {
    let best: { e: Edge; s: number } | null = null, bd = maxD
    for (const it of all) {
      const d = segDist(p, it.e)
      if (d < bd) { bd = d; best = it }
    }
    return best
  }
  const mark = (p: Pt, maxD: number) => {
    const h = hit(p, maxD)
    if (!h) return
    setFenced((f) => (f[h.s].some((e) => edgeKey(e) === edgeKey(h.e)) ? f : f.map((arr, i) => (i === h.s ? [...arr, h.e] : arr))))
  }
  useGridGesture<null>(svg, { disabled: !ready || done, onStart: (p) => { mark(p, 0.42); return null }, onMove: (p) => mark(p, 0.3) })

  const complete = fenced.every((f, i) => f.length === per[i])
  useEffect(() => {
    if (!complete || done) return
    setDone(true)
    sfx.ok()
    const ok = two ? pred === truth : est !== null && Math.abs(est - per[0]) <= 2
    track.attempt(ok)
    track.item(ok)
    addSol('cit', two ? `Çit: A = ${per[0]}, B = ${per[1]}` : `Çit = ${per[0]}`)
    onComplete(ok)
  }, [complete, done, two, pred, truth, est, per, track, addSol, onComplete])

  return (
    <Layout
      top={<Prompt emoji="🐜" color={C}>{task.text}</Prompt>}
      work={
        <div>
          <div style={fitWidth((cols + 0.5) / (rows + 0.5), 290)}>
            <ZoomBox>
              <svg ref={svg} viewBox={`-0.25 -0.25 ${cols + 0.5} ${rows + 0.5}`} className="block w-full select-none rounded-2xl bg-[#fbfdf7] ring-1 ring-line" style={{ touchAction: 'none' }} role="img" aria-label="Bahçeler">
                <g stroke="#e3e7f2" strokeWidth={0.03}>
                  {Array.from({ length: cols + 1 }, (_, i) => <line key={`v${i}`} x1={i} x2={i} y1={0} y2={rows} />)}
                  {Array.from({ length: rows + 1 }, (_, i) => <line key={`h${i}`} y1={i} y2={i} x1={0} x2={cols} />)}
                </g>
                <ShapeUnder shapes={task.shapes} fillOp={0.22} />
                {edgesOf.flat().map((e) => <line key={`g${edgeKey(e)}`} x1={e[0]} y1={e[1]} x2={e[2]} y2={e[3]} stroke="#cbd5e1" strokeWidth={0.07} strokeDasharray="0.12 0.1" pointerEvents="none" />)}
                {fenced.map((f, i) => <FenceLines key={i} edges={f} cells={task.shapes[i].cells} numbers />)}
              </svg>
            </ZoomBox>
          </div>
          {ready && !done && <p className="mt-2 text-center text-sm font-bold text-ink-soft">Kesikli kenarlara dokun ya da parmağını kenar boyunca gezdir: her dokunuş 1 birim çit.</p>}
        </div>
      }
      panel={
        <>
          {two ? (
            <Card title="Önce tahmin et: hangisine daha çok?">
              <div className="grid grid-cols-3 gap-2">
                {(['A', '=', 'B'] as const).map((v) => (
                  <PickBtn key={v} big={age.big} on={pred === v} disabled={!!pred} onClick={() => { setPred(v); if (v === '=') track.misconception('Alanları eşit iki şeklin çevrelerinin de eşit olduğunu düşündü') }}>{v === '=' ? 'Eşit' : v}</PickBtn>
                ))}
              </div>
            </Card>
          ) : (
            <Card title="Önce tahmin et">
              <div className="flex flex-wrap items-end justify-center gap-3">
                <NumStepper value={est} onChange={setEst} max={40} label="birim çit" big={age.big} />
                {!estSent && <BigButton onClick={() => setEstSent(true)} disabled={est === null}>Tahminim bu</BigButton>}
              </div>
            </Card>
          )}
          {ready && (
            <Card title="Çit sayacı">
              <div className={`grid gap-2 text-center ${two ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {task.shapes.map((s, i) => (
                  <div key={s.label} className={`rounded-xl p-2 ring-1 ${s.label === 'A' ? 'bg-orange-50 ring-orange-200' : 'bg-violet-50 ring-violet-200'}`}>
                    <p className="text-xs font-black text-ink-soft">{two ? s.label : 'Bahçe'}</p>
                    <p className="text-2xl font-black tabular-nums" style={{ color: FENCE }}>{fenced[i].length}{fenced[i].length === per[i] ? ' ✓' : ''}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {done && (
            <Derived tone={two ? (pred === truth ? 'ok' : 'info') : 'ok'}>
              {two
                ? `Alanlar eşit (${task.shapes[0].cells.length} kare) ama çitler farklı: A = ${per[0]}, B = ${per[1]} birim. ${pred === truth ? 'Tahminin tuttu!' : 'Uzun ince bahçenin daha çok kenarı dışarıda kalıyor.'}`
                : `Çevre = ${per[0]} birim. Tahminin ${est} idi${est !== null && Math.abs(est - per[0]) <= 2 ? ': çok yakın!' : '.'}`}
            </Derived>
          )}
          {footer}
        </>
      }
    />
  )
}

// ─── Çitler eşit: hangisinde daha çok çim? ───────────────────────────────

function GrassRound({ grade, task, onComplete, footer, addSol }: RP & { task: GrassTask }) {
  const track = useTracker()
  const age = useAge(grade)
  const { cols, rows } = boardSize(task.shapes)
  const [a, b] = task.shapes
  const truth: 'A' | 'B' | '=' = a.cells.length > b.cells.length ? 'A' : b.cells.length > a.cells.length ? 'B' : '='
  const [pred, setPred] = useState<'A' | 'B' | '=' | null>(null)
  const [grass, setGrass] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const inS = (s: Shape) => (k: string) => s.cells.includes(k)
  const cnt = (s: Shape) => grass.filter(inS(s)).length
  const complete = cnt(a) === a.cells.length && cnt(b) === b.cells.length
  useEffect(() => {
    if (!complete || done) return
    setDone(true)
    const ok = pred === truth
    track.attempt(ok)
    track.item(ok)
    sfx.ok()
    addSol('cim', `Çit ${cellsPerimeter(a.cells)}: A = ${a.cells.length}, B = ${b.cells.length}`)
    onComplete(ok)
  }, [complete, done, pred, truth, a, b, track, addSol, onComplete])
  const edges = [...boundaryEdges(a.cells), ...boundaryEdges(b.cells)]
  return (
    <Layout
      top={<Prompt emoji="🌱" color={C}>{task.text}</Prompt>}
      work={
        <div>
          <div style={fitWidth((cols + 0.5) / (rows + 0.5), 290)}>
            <ZoomBox>
              <CellBoard cols={cols} rows={rows} cells={grass} fill={GRASS} onPaint={(k, add) => setGrass((g) => (add ? (g.includes(k) ? g : [...g, k]) : g.filter((q) => q !== k)))} canPaint={(x, y) => a.cells.includes(ck(x, y)) || b.cells.includes(ck(x, y))} locked={!pred || done} bg="#fbfdf7" under={<ShapeUnder shapes={task.shapes} />}>
                <FenceLines edges={edges} />
                {grass.map((k) => { const [x, y] = pk(k); return <text key={k} x={x + 0.5} y={y + 0.66} textAnchor="middle" fontSize={0.45} pointerEvents="none">🌱</text> })}
              </CellBoard>
            </ZoomBox>
          </div>
          {pred && !done && <p className="mt-2 text-center text-sm font-bold text-ink-soft">Bahçelerin içine dokunarak ya da parmağını gezdirerek çim ek.</p>}
        </div>
      }
      panel={
        <>
          <Card title="Önce tahmin et: hangisinde daha çok?">
            <div className="grid grid-cols-3 gap-2">
              {(['A', '=', 'B'] as const).map((v) => (
                <PickBtn key={v} big={age.big} on={pred === v} disabled={!!pred} onClick={() => { setPred(v); if (v === '=') track.misconception('Çevreleri eşit iki şeklin alanlarının da eşit olduğunu düşündü') }}>{v === '=' ? 'Eşit' : v}</PickBtn>
              ))}
            </div>
          </Card>
          {pred && (
            <Card title="Ölçüm tablosu">
              <table className="w-full text-center text-sm font-bold">
                <thead><tr className="text-ink-soft"><th /><th>Çit (çevre)</th><th>Çim (alan)</th></tr></thead>
                <tbody>
                  {task.shapes.map((s) => (
                    <tr key={s.label} className="text-lg">
                      <td className="font-black" style={{ color: s.label === 'A' ? '#ea580c' : '#7c3aed' }}>{s.label}</td>
                      <td style={{ color: FENCE }}>{cellsPerimeter(s.cells)}</td>
                      <td className="tabular-nums text-green-700">{cnt(s)}{cnt(s) === s.cells.length ? ' ✓' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
          {done && <Derived tone={pred === truth ? 'ok' : 'info'}>{`Çitler aynı (${cellsPerimeter(a.cells)} birim) ama çimler farklı: A = ${a.cells.length}, B = ${b.cells.length}. ${pred === truth ? 'Tuzağa düşmedin!' : 'İşte çevre tuzağı: aynı çit, farklı alan!'} Kareye yakın bahçe daha çok alan çevirir.`}</Derived>}
          {footer}
        </>
      }
    />
  )
}

// ─── Gergin ip: çevre sabit, alan değişir ────────────────────────────────

function RopeRound({ grade, task, onComplete, footer, addSol }: RP & { task: RopeTask }) {
  const track = useTracker()
  const age = useAge(grade)
  const half = task.P / 2
  const size = half + 1
  const [pred, setPred] = useState<'degisir' | 'degismez' | null>(null)
  const [w, setW] = useState(1)
  const [tried, setTried] = useState<number[]>([])
  const [pick, setPick] = useState<number | null>(null)
  const [nudge, setNudge] = useState<NS>(null)
  const [wrong, setWrong] = useState(0)
  const [done, setDone] = useState(false)
  const h = half - w
  const distinct = Math.floor(half / 2)
  const found = [...new Set(tried.map((x) => Math.min(x, half - x)))].sort((p, q) => p - q)
  const allFound = found.length >= distinct
  const best = Math.floor(half / 2)

  const setWidth = (nw: number) => {
    const c = Math.max(1, Math.min(half - 1, nw))
    setW(c)
    const k = Math.min(c, half - c)
    if (!tried.some((x) => Math.min(x, half - x) === k)) addSol(`${k}`, `${k} × ${half - k} → alan ${k * (half - k)}`)
    setTried((t) => (t.includes(c) ? t : [...t, c]))
  }
  const choose = (k: number) => {
    setPick(k)
    const ok = k === best
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      setNudge(null)
      setDone(true)
      const first = wrong === 0 && pred === 'degisir'
      track.item(first)
      onComplete(first)
    } else {
      setWrong((x) => x + 1)
      setNudge({ q: k === 1 ? 'En uzun dikdörtgen en çok yeri mi kaplıyor? Tablodaki alanlara bak.' : 'Tablodaki alanları karşılaştır. Kenarlar birbirine yaklaştıkça alan ne oluyor?', mis: k === 1 ? 'En uzun dikdörtgenin alanının en büyük olduğunu düşündü' : undefined, id: Date.now() })
    }
  }
  const handles: Handle[] = pred && !done ? [{ id: 'k', x: 1 + w, y: 1 + h, color: FENCE, ring: true, label: '✥' }] : []
  const x0 = 1, y0 = 1
  // ip: dikdörtgen çevresi boyunca kalın kahverengi
  return (
    <Layout
      top={<Prompt emoji="🪢" color={C}>{task.text}</Prompt>}
      work={
        <div>
          <div style={fitWidth(1, 270)}>
            <ZoomBox>
              <PegBoard cols={size} rows={size} handles={handles} onHandleMove={(_, x) => setWidth(x - 1)} locked={!pred || done} handleR={age.big ? 0.32 : 0.28} bg="#fbfdf7">
                {Array.from({ length: w * h }, (_, i) => <rect key={i} x={x0 + (i % w) + 0.06} y={y0 + Math.floor(i / w) + 0.06} width={0.88} height={0.88} rx={0.1} fill={GRASS} fillOpacity={0.55} />)}
                <rect x={x0} y={y0} width={w} height={h} fill="none" stroke={FENCE} strokeWidth={0.16} strokeLinejoin="round" />
                <rect x={x0} y={y0} width={w} height={h} fill="none" stroke="#fde68a" strokeWidth={0.04} strokeDasharray="0.2 0.2" />
                <text x={x0 + w / 2} y={y0 - 0.25} textAnchor="middle" fontSize={0.4} fontWeight={900} fill={FENCE}>{w}</text>
                <text x={x0 - 0.25} y={y0 + h / 2 + 0.14} textAnchor="end" fontSize={0.4} fontWeight={900} fill={FENCE}>{h}</text>
              </PegBoard>
            </ZoomBox>
          </div>
          {pred && !done && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <ToolBtn big={age.big} onClick={() => setWidth(w - 1)} disabled={w <= 1}>◀ Daralt</ToolBtn>
              <span className="text-sm font-bold text-ink-soft">ya da köşeyi sürükle</span>
              <ToolBtn big={age.big} onClick={() => setWidth(w + 1)} disabled={w >= half - 1}>Genişlet ▶</ToolBtn>
            </div>
          )}
        </div>
      }
      panel={
        <>
          <Card title="Önce tahmin et">
            <p className="mb-2 text-[15px] font-bold">İp hep {task.P} birim. Dikdörtgenin biçimi değişince içindeki alan…</p>
            <div className="grid grid-cols-2 gap-2">
              {([['degismez', 'Değişmez'], ['degisir', 'Değişir']] as const).map(([v, t]) => (
                <PickBtn key={v} big={age.big} on={pred === v} disabled={!!pred} onClick={() => { setPred(v); setWidth(w); if (v === 'degismez') track.misconception('Çevre aynı kalınca alanın da aynı kalacağını düşündü') }}>{t}</PickBtn>
              ))}
            </div>
          </Card>
          {pred && (
            <Card title={`Denediğin dikdörtgenler (${found.length} / ${distinct})`}>
              <div className="flex items-baseline justify-between text-sm font-bold"><span>Şimdi: {w} × {h}</span><span>Çevre <b style={{ color: FENCE }}>{task.P}</b> · Alan <b className="text-green-700">{w * h}</b></span></div>
              <div className="mt-2 flex items-end gap-1.5" style={{ height: 96 }} aria-label="Alan grafiği">
                {Array.from({ length: half - 1 }, (_, i) => i + 1).map((x) => {
                  const k = Math.min(x, half - x)
                  const seen = found.includes(k)
                  const a = x * (half - x)
                  return (
                    <div key={x} className="flex flex-1 flex-col items-center justify-end" style={{ height: '100%' }}>
                      {seen && <span className="text-[10px] font-black text-green-800">{a}</span>}
                      <div className="w-full rounded-t-md transition-all" style={{ height: seen ? `${(a / (best * (half - best))) * 70}%` : 4, background: seen ? (x === w ? '#15803d' : '#86efac') : '#e5e7eb' }} />
                      <span className="text-[10px] font-bold text-ink-soft">{x}</span>
                    </div>
                  )
                })}
              </div>
              <p className="mt-1 text-center text-[11px] font-bold text-ink-soft">genişlik → alan</p>
            </Card>
          )}
          {pred && allFound && (
            <Card title="Hangisinin alanı en büyük?">
              <div className="flex flex-wrap gap-2">
                {found.map((k) => <PickBtn key={k} on={pick === k} color={pick === k && k === best ? '#16a34a' : C} disabled={done} onClick={() => choose(k)}>{k} × {half - k}</PickBtn>)}
              </div>
            </Card>
          )}
          {nudge && <Nudge key={nudge.id} question={nudge.q} misconception={nudge.mis} tool="alancevre" onClose={() => setNudge(null)} />}
          {done && <Derived>{`Hepsinin çevresi ${task.P} birim, ama alanları ${(half - 1)} ile ${best * (half - best)} arasında değişti. En büyük alan kareye en yakın dikdörtgende: ${best} × ${half - best} = ${best * (half - best)}.`}</Derived>}
          {footer}
        </>
      }
    />
  )
}

// ─── Aynı alan: en uzun / en kısa çevre ──────────────────────────────────

function SameRound({ grade, task, onComplete, footer, addSol }: RP & { task: SameTask }) {
  const track = useTracker()
  const age = useAge(grade)
  const n = task.n
  const maxP = 2 * n + 2
  const minP = 2 * Math.ceil(2 * Math.sqrt(n) - 1e-9)
  const cols = n >= 12 ? 10 : 8, rows = n >= 12 ? 8 : 6
  const [cells, setCells] = useState<string[]>([])
  const [slots, setSlots] = useState<{ max?: string[]; min?: string[] }>({})
  const [ok, setOk] = useState<string | null>(null)
  const [nudge, setNudge] = useState<NS>(null)
  const [fails, setFails] = useState(0)
  const [done, setDone] = useState(false)
  const P = cellsPerimeter(cells)
  const check = () => {
    const fail = (q: string, mis?: string) => {
      track.attempt(false)
      setFails((f) => f + 1)
      setNudge({ q, mis, id: Date.now() })
    }
    if (cells.length !== n) return fail(`Şeklinde ${cells.length} kare var. Tam ${n} kare kullanmalısın.`)
    if (!cellsConnected(cells)) return fail('Bazı kareler ayrı duruyor. Kareler kenar kenara değmeli.')
    if (cellsHaveHole(cells)) return fail('Şeklinin ortasında boşluk var. Boşluksuz bir şekil yap.')
    const ns = { ...slots }
    let got = ''
    if (P === maxP && !slots.max) { ns.max = cells; got = 'max' }
    else if (P === minP && !slots.min) { ns.min = cells; got = 'min' }
    if (!got) {
      if (P === maxP || P === minP) return setNudge({ q: 'Bu çevreyi zaten buldun. Şimdi öbür uç: ' + (slots.max ? 'en kısa çevreli şekli' : 'en uzun çevreli şekli') + ' yap.', id: Date.now() })
      return fail(`Çevresi ${P} birim. ${!slots.max ? 'Daha uzun olabilir mi? Kareleri yan yana tek sıra ya da merdiven gibi dizmeyi dene.' : ''} ${!slots.min ? 'Daha kısa olabilir mi? Kareleri bir kareye benzeyecek biçimde topla.' : ''}`.trim())
    }
    track.attempt(true)
    sfx.ok()
    setNudge(null)
    addSol(got, `${n} kare, çevre ${P}`)
    setSlots(ns)
    setOk(got === 'max' ? `Çevresi en uzun şekil: ${P} birim! Şimdi çevresi en kısa olanı yap.` : `Çevresi en kısa şekil: ${P} birim! Şimdi çevresi en uzun olanı yap.`)
    if (!(ns.max && ns.min)) setCells([])
    else {
      setDone(true)
      track.item(fails === 0)
      onComplete(fails === 0)
    }
  }
  return (
    <Layout
      top={<Prompt emoji="🧱" color={C}>{task.text}</Prompt>}
      work={
        <div>
          <div style={fitWidth((cols + 0.5) / (rows + 0.5), 290)}>
            <ZoomBox>
              <CellBoard cols={cols} rows={rows} cells={cells} fill={GRASS} onPaint={(k, add) => { setNudge(null); setOk(null); setCells((c) => (add ? (c.includes(k) ? c : [...c, k]) : c.filter((q) => q !== k))) }} locked={done} bg="#fbfdf7">
                <FenceLines edges={boundaryEdges(cells)} />
              </CellBoard>
            </ZoomBox>
          </div>
          {!done && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <ToolBtn big={age.big} onClick={() => setCells([])} disabled={!cells.length}><Eraser size={18} />Temizle</ToolBtn>
              <span className="text-sm font-bold text-ink-soft">Karelere dokun ya da parmağını gezdir.</span>
            </div>
          )}
        </div>
      }
      panel={
        <>
          <Card title="Şeklin">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-green-50 p-2"><p className="text-xs font-black text-green-800">Alan</p><p className="text-2xl font-black tabular-nums text-green-700">{cells.length} / {n}</p></div>
              <div className="rounded-xl bg-amber-50 p-2"><p className="text-xs font-black" style={{ color: FENCE }}>Çevre</p><p className="text-2xl font-black tabular-nums" style={{ color: FENCE }}>{P}</p></div>
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-2">
            {(['max', 'min'] as const).map((s) => (
              <div key={s} className={`flex flex-col items-center rounded-2xl p-2 ring-1 ${slots[s] ? 'bg-emerald-50 ring-emerald-200' : 'bg-white/90 ring-line'}`}>
                <p className="text-xs font-black text-ink-soft uppercase">{s === 'max' ? 'En uzun çevre' : 'En kısa çevre'}</p>
                {slots[s] ? <><MiniCells cells={slots[s]!} color={GRASS} size={44} /><b className="text-lg" style={{ color: FENCE }}>{s === 'max' ? maxP : minP}</b></> : <span className="py-3 text-2xl text-ink-soft/40">?</span>}
              </div>
            ))}
          </div>
          {nudge && <Nudge key={nudge.id} question={nudge.q} misconception={nudge.mis} tool="alancevre" onClose={() => setNudge(null)} />}
          {ok && !done && <Derived>{ok}</Derived>}
          {!done && <BigButton onClick={check} disabled={!cells.length} className="w-full"><Check size={20} />Kontrol et</BigButton>}
          {done && <Derived>{`İkisi de ${n} kare, ama çevreleri ${minP} ile ${maxP} birim! Kareler topaklaştıkça ortak kenarlar artar ve çevre kısalır.`}</Derived>}
          {footer}
        </>
      }
    />
  )
}

// ─── Köşeden kare çıkar ──────────────────────────────────────────────────

function CornerRound({ grade, task, onComplete, footer, addSol }: RP & { task: CornerTask }) {
  const track = useTracker()
  const age = useAge(grade)
  const { w, h } = task
  const base = useMemo(() => rect(1, 1, w, h), [w, h])
  const [cells, setCells] = useState<string[]>(base)
  const [step, setStep] = useState<'p1' | 'cut1' | 'p2' | 'cut2' | 'done'>('p1')
  const [p1, setP1] = useState<string | null>(null)
  const [p2, setP2] = useState<string | null>(null)
  const [nudge, setNudge] = useState<NS>(null)
  const isCorner = (k: string) => { const [x, y] = pk(k); return (x === 1 || x === w) && (y === 1 || y === h) }
  const isEdgeMid = (k: string) => { const [x, y] = pk(k); return !isCorner(k) && (x === 1 || x === w || y === 1 || y === h) }
  const P0 = 2 * (w + h)
  const onPaint = (k: string, add: boolean) => {
    if (add) return
    if (step === 'cut1') {
      if (!isCorner(k)) return setNudge({ q: 'Önce bir **köşedeki** kareyi çıkar.', id: Date.now() })
      setCells((c) => c.filter((q) => q !== k))
      setNudge(null)
      setStep('p2')
      sfx.ok()
    } else if (step === 'cut2') {
      if (!isEdgeMid(k)) return setNudge({ q: 'Şimdi bir kenarın **ortasından** (köşe olmayan, kenarda duran) bir kare çıkar.', id: Date.now() })
      setCells((c) => c.filter((q) => q !== k))
      setNudge(null)
      setStep('done')
      sfx.ok()
      const ok = p1 === 'ayni' && p2 === 'artar'
      track.attempt(ok)
      track.item(ok)
      addSol('kose', 'Köşe → çevre aynı; kenar → çevre +2')
      onComplete(ok)
    }
  }
  const Pick = ({ v, set, disabled }: { v: string | null; set: (s: string) => void; disabled: boolean }) => (
    <div className="grid grid-cols-3 gap-2">
      {([['azalir', 'Azalır'], ['ayni', 'Aynı kalır'], ['artar', 'Artar']] as const).map(([k, t]) => <PickBtn key={k} big={age.big} on={v === k} disabled={disabled} onClick={() => set(k)} className="text-sm">{t}</PickBtn>)}
    </div>
  )
  const P = cellsPerimeter(cells)
  return (
    <Layout
      top={<Prompt emoji="✂️" color={C}>{task.text}</Prompt>}
      work={
        <div>
          <div style={fitWidth((w + 2.5) / (h + 2.5), 300)}>
            <ZoomBox>
              <CellBoard cols={w + 2} rows={h + 2} cells={cells} fill={GRASS} onPaint={onPaint} locked={step !== 'cut1' && step !== 'cut2'} bg="#fbfdf7">
                <FenceLines edges={orderEdges(boundaryEdges(cells))} cells={cells} numbers={step === 'p2' || step === 'done'} />
              </CellBoard>
            </ZoomBox>
          </div>
          {(step === 'cut1' || step === 'cut2') && <p className="mt-2 text-center text-sm font-bold text-ink-soft">Çıkarmak istediğin kareye dokun.</p>}
        </div>
      }
      panel={
        <>
          <Card title="Ölçümler">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-green-50 p-2"><p className="text-xs font-black text-green-800">Alan</p><p className="text-2xl font-black text-green-700 tabular-nums">{cells.length}</p></div>
              <div className="rounded-xl bg-amber-50 p-2"><p className="text-xs font-black" style={{ color: FENCE }}>Çevre</p><p className="text-2xl font-black tabular-nums" style={{ color: FENCE }}>{P}</p></div>
            </div>
          </Card>
          <Card title="1. Köşeden bir kare çıkarınca çevre…">
            <Pick v={p1} set={(s) => { setP1(s); setStep('cut1'); if (s === 'azalir') track.misconception('Alan azalınca çevrenin de azalacağını düşündü') }} disabled={step !== 'p1'} />
          </Card>
          {(step === 'p2' || step === 'cut2' || step === 'done') && (
            <>
              <Derived tone={p1 === 'ayni' ? 'ok' : 'info'}>{`Alan ${ek(w * h, 'abl')} ${ek(w * h - 1, 'dat')} indi ama çevre hâlâ ${P0}! Köşede çıkan iki kenarın yerine içeride iki yeni kenar açıldı.`}</Derived>
              <Card title="2. Kenarın ortasından bir kare çıkarınca çevre…">
                <Pick v={p2} set={(s) => { setP2(s); setStep('cut2') }} disabled={step !== 'p2'} />
              </Card>
            </>
          )}
          {nudge && <Nudge key={nudge.id} question={nudge.q.replace(/\*\*/g, '')} onClose={() => setNudge(null)} />}
          {step === 'done' && <Derived tone={p2 === 'artar' ? 'ok' : 'info'}>{`Bu kez çevre ${P0 + 2} oldu: 1 kenar gitti, 3 yeni kenar açıldı. Alan azalırken çevre arttı!`}</Derived>}
          {footer}
        </>
      }
    />
  )
}
