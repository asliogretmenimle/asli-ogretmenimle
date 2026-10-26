import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, Eraser, Grid3x3, Scissors } from 'lucide-react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { BigButton, Scene, useAge, useSolutions } from '../../games/kit2'
import { ZoomBox } from '../../interactive/ZoomBox'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { Card, ck, Derived, fitWidth, Header, Layout, NextButton, Nudge, NumStepper, PegBoard, PickBtn, pk, Prompt, ToolBtn, useGridGesture, type Handle, type Pt } from '../sekil-insa-et/ortak'
import { cellArea, halfCount, HalfIcon, MiniPieces, PieceBoard, piecesConnected, piecesKey, rectOf, totalArea, type Cell, type Cells } from './pieces'

/**
 * 49. Alanı Keşfet — alan, kapladığı birim kare sayısıdır ve parçalar yeniden düzenlenince değişmez.
 *  - build: aynı sayıda birim kareyle farklı şekiller / dikdörtgenler (5–6: yarım karelerle)
 *  - compare: hangisi daha büyük? Önce tahmin, sonra birim karelerle kaplayarak test
 *  - rearrange: kareleri dikdörtgen olacak biçimde yeniden diz (alanın korunumu)
 *  - para / shear / tri (6): paralelkenarı kes-taşı → dikdörtgen; üst kenarı kaydır; üçgen = paralelkenarın yarısı
 */

const C = '#db2777'
const BLUE = '#2563eb'
const fmt = (v: number) => v.toLocaleString('tr-TR')

type BuildTask = { kind: 'build'; n: number; need: number; rect?: boolean; halves?: number; emoji: string; text: string }
type CompareTask = { kind: 'compare'; a: Cells; b: Cells; cols: number; rows: number; text: string }
type RearrangeTask = { kind: 'rearrange'; tiles: string[]; text: string }
type Task = BuildTask | CompareTask | RearrangeTask | { kind: 'para' } | { kind: 'shear' } | { kind: 'tri' }

const F = (pts: Pt[]): Cells => Object.fromEntries(pts.map(([x, y]) => [ck(x, y), 'F' as Cell]))
const rect = (x0: number, y0: number, w: number, h: number): Pt[] => Array.from({ length: w * h }, (_, i) => [x0 + (i % w), y0 + Math.floor(i / w)] as Pt)

function tasksFor(grade: Grade): Task[] {
  const b = (n: number, need: number, extra: Partial<BuildTask> = {}): BuildTask => ({
    kind: 'build',
    n,
    need,
    emoji: '🟦',
    text: extra.rect
      ? `Tam **${n} birim kareyle** dikdörtgenler yap. ${need} farklı dikdörtgen bulabilir misin?`
      : extra.halves
        ? `Alanı **${n} birim kare** olan bir şekil yap; içinde en az **${extra.halves} yarım kare** olsun. ${need} farklı şekil!`
        : `Tam **${n} birim kareyle** bir şekil yap: kareler kenar kenara değsin. ${need} farklı şekil bul!`,
    ...extra,
  })
  const cmp3: CompareTask = {
    kind: 'compare',
    cols: 13,
    rows: 6,
    a: F([[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [5, 2], [5, 3], [4, 3], [3, 3]]),
    b: F(rect(8, 1, 4, 3)),
    text: 'İki bahçe var: A ve B. Hangisine **daha çok çim** ekilir? Önce tahmin et, sonra birim karelerle kaplayarak test et.',
  }
  const cmp4: CompareTask = {
    kind: 'compare',
    cols: 13,
    rows: 6,
    a: F([[1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2], [2, 2], [3, 2], [4, 2], [2, 3], [3, 3], [2, 4]]),
    b: F([...rect(8, 1, 4, 3), [9, 4]]),
    text: 'A ve B halılarından hangisi yeri **daha çok kaplar**? Önce tahmin et, sonra birim karelerle kaplayarak test et.',
  }
  const cmp5: CompareTask = {
    kind: 'compare',
    cols: 13,
    rows: 5,
    a: { ...F([[1, 1], [2, 1], [3, 1], [4, 1], [1, 2], [2, 2], [3, 2], [4, 2]]), [ck(0, 1)]: 2, [ck(5, 1)]: 3, [ck(2, 0)]: 2, [ck(3, 0)]: 3 },
    b: { ...F(rect(8, 1, 3, 3)), [ck(8, 0)]: 2, [ck(11, 3)]: 3 },
    text: 'Kayık (A) mı, kutu (B) mu daha büyük alanlı? Tahmin et, sonra **tam ve yarım karelerle** kaplayarak test et.',
  }
  const re8: RearrangeTask = { kind: 'rearrange', tiles: [[1, 1], [2, 1], [2, 2], [3, 2], [4, 2], [4, 3], [5, 3], [5, 4]].map(([x, y]) => ck(x, y)), text: 'Bu merdiven şeklindeki kareleri **dikdörtgen** olacak biçimde yeniden diz.' }
  const re12: RearrangeTask = { kind: 'rearrange', tiles: [[0, 2], [1, 1], [1, 2], [1, 3], [2, 0], [2, 1], [2, 3], [3, 1], [4, 1], [4, 2], [5, 2], [6, 3]].map(([x, y]) => ck(x, y)), text: 'Dağınık duran kareleri **dikdörtgen** olacak biçimde yeniden diz.' }

  if (grade === 3) return [b(4, 3), cmp3, re8, b(6, 3)]
  if (grade === 4) return [b(5, 3), cmp4, re12, b(12, 3, { rect: true })]
  if (grade === 5) return [b(24, 3, { rect: true }), b(4, 2, { halves: 2 }), cmp5, re12]
  return [b(5, 2, { halves: 2 }), { kind: 'para' }, { kind: 'shear' }, { kind: 'tri' }]
}

export default function AlaniKesfet({ grade, onFinish }: InteractionProps) {
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
      summary: `${tasks.length} alan görevini tamamladın ve ${sol.list.length} farklı şekil/çözüm buldun; ${f} görevi ilk denemede çözdün.`,
      insight:
        grade <= 4
          ? 'Alan, bir şeklin kaç birim kare kapladığıdır. Kareleri yeniden dizince şekil değişir ama alan değişmez; uzun görünen şekil daha büyük olmak zorunda değildir.'
          : grade === 5
            ? 'Dikdörtgenin alanı sıra sayısı × bir sıradaki kare sayısıdır. İki yarım kare bir tam kare eder; alan ölçerken parçaları birleştirebiliriz.'
            : 'Paralelkenarı kesip parçayı taşıyınca aynı taban ve yükseklikte bir dikdörtgen olur: alan = taban × yükseklik. Üçgen, eşiyle birlikte bir paralelkenar yapar; alanı onun yarısıdır.',
      stars: f >= tasks.length - 1 ? 3 : f >= tasks.length / 2 ? 2 : 1,
    })
  }
  const footer = done ? <NextButton isLast={isLast} onNext={() => { setIdx((i) => i + 1); setDone(false) }} onFinish={finish} /> : null
  const p = { grade, onComplete: complete, footer, addSol: (k: string, l: string) => sol.add(`${idx}:${k}`, l) }
  return (
    <Scene grade={grade}>
      <Header icon={<Grid3x3 size={22} />} color={C} idx={idx} total={tasks.length} title="Alanı Keşfet" extra={sol.list.length > 0 ? <span className="chip bg-amber-100 px-3 py-1 text-sm text-amber-900 ring-1 ring-amber-200">🟦 {sol.list.length}</span> : undefined} />
      {task.kind === 'build' && <BuildRound key={idx} task={task} {...p} />}
      {task.kind === 'compare' && <CompareRound key={idx} task={task} {...p} />}
      {task.kind === 'rearrange' && <RearrangeRound key={idx} task={task} {...p} />}
      {task.kind === 'para' && <ParaRound key={idx} {...p} />}
      {task.kind === 'shear' && <ShearRound key={idx} {...p} />}
      {task.kind === 'tri' && <TriRound key={idx} {...p} />}
    </Scene>
  )
}

type RP = { grade: Grade; onComplete: (first: boolean) => void; footer: ReactNode; addSol: (k: string, l: string) => boolean }
type NS = { q: string; mis?: string; id: number } | null

function Tools({ tool, setTool, halves, big }: { tool: Cell; setTool: (c: Cell) => void; halves: boolean; big: boolean }) {
  if (!halves) return null
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
      <ToolBtn big={big} active={tool === 'F'} onClick={() => setTool('F')} label="Tam kare"><HalfIcon c="F" color={tool === 'F' ? '#fff' : BLUE} />Tam kare</ToolBtn>
      {([0, 1, 2, 3] as Cell[]).map((c) => (
        <ToolBtn key={String(c)} big={big} active={tool === c} onClick={() => setTool(c)} label="Yarım kare"><HalfIcon c={c} color={tool === c ? '#fff' : BLUE} /></ToolBtn>
      ))}
      <span className="w-full text-center text-xs font-bold text-ink-soft">Yarım kare: önce yönünü seç, sonra kareye dokun.</span>
    </div>
  )
}

// ─── Aynı alan, farklı şekiller ───────────────────────────────────────────

function BuildRound({ grade, task, onComplete, footer, addSol }: RP & { task: BuildTask }) {
  const track = useTracker()
  const age = useAge(grade)
  const cols = task.rect ? 12 : task.n > 6 ? 10 : 8
  const rows = task.rect ? 8 : task.n > 6 ? 7 : 6
  const [cells, setCells] = useState<Cells>({})
  const [tool, setTool] = useState<Cell>('F')
  const [found, setFound] = useState<{ key: string; cells: Cells; label: string }[]>([])
  const [nudge, setNudge] = useState<NS>(null)
  const [fails, setFails] = useState(0)
  const [ok, setOk] = useState<string | null>(null)
  const area = totalArea(cells)
  const enough = found.length >= task.need

  const onSet = (k: string, c: Cell | null) => {
    if (enough) return
    setOk(null)
    setNudge(null)
    setCells((cs) => {
      const n = { ...cs }
      if (c === null) delete n[k]
      else n[k] = c
      return n
    })
  }
  const fail = (q: string, mis?: string) => {
    track.attempt(false)
    setFails((f) => f + 1)
    setNudge({ q, mis, id: Date.now() })
  }
  const check = () => {
    const pieces = Object.keys(cells).length
    if (area !== task.n) {
      if (task.halves && pieces === task.n) return fail('Parça sayın tutuyor ama yarım kareler tam kare değil! İki yarım kare kaç tam kare eder? Alanı yeniden say.', 'Yarım kareyi tam kare gibi saydı')
      return fail(`Şeklinin alanı ${fmt(area)} birim kare. Kart ${task.n} istiyor. ${area < task.n ? 'Kaç kare eklemelisin?' : 'Kaç kare fazla?'}`)
    }
    if (!piecesConnected(cells)) return fail('Bazı parçalar ayrı duruyor. Parçalar kenar kenara değmeli; yalnızca köşesi değen parçalar bağlı sayılmaz.')
    if (task.halves && halfCount(cells) < task.halves) return fail(`Şeklinde ${halfCount(cells)} yarım kare var. En az ${task.halves} yarım kare kullanırken alanı ${task.n} tutabilir misin? Bir tam kareyi iki yarım kareye çevirmeyi düşün.`)
    const r = rectOf(cells)
    if (task.rect && !r) return fail('Bu şekil bir dikdörtgen değil. Kareleri eşit uzunlukta sıralar hâlinde dizebilir misin?')
    const key = piecesKey(cells)
    if (found.some((f) => f.key === key)) {
      track.hint()
      setNudge({ q: task.rect ? 'Bu dikdörtgeni zaten yaptın; yatırınca ya da dikince aynı dikdörtgen. Sıra sayısını değiştirmeyi dene.' : 'Bu şekli zaten yaptın: döndürülmüş ya da ters çevrilmiş hâli aynı şekil sayılır. Gerçekten farklı bir şekil yapabilir misin?', id: Date.now() })
      return
    }
    track.attempt(true)
    const label = r ? `${Math.min(r.w, r.h)} × ${Math.max(r.w, r.h)} = ${task.n}` : `${task.n} birim kare`
    addSol(key, label)
    const nf = [...found, { key, cells, label }]
    setFound(nf)
    sfx.ok()
    setOk(r ? `${r.h} sıra × ${r.w} kare = ${task.n} birim kare` : `Alan = ${fmt(area)} birim kare. Biçimi farklı, alanı aynı!`)
    if (nf.length >= task.need) {
      track.item(fails === 0)
      onComplete(fails === 0)
    }
  }
  return (
    <Layout
      top={<Prompt emoji={task.emoji} color={C}>{task.text}</Prompt>}
      work={
        <div>
          <div style={fitWidth((cols + 0.6) / (rows + 0.6), 290)}>
            <ZoomBox>
              <PieceBoard cols={cols} rows={rows} cells={cells} onSet={onSet} tool={tool} locked={enough} color={ok ? '#16a34a' : BLUE} />
            </ZoomBox>
          </div>
          {!enough && <Tools tool={tool} setTool={setTool} halves={!!task.halves} big={age.big} />}
          {!enough && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <ToolBtn big={age.big} onClick={() => { setCells({}); setOk(null); setNudge(null) }} disabled={!Object.keys(cells).length}><Eraser size={18} />Temizle</ToolBtn>
              <span className="text-sm font-bold text-ink-soft">Dokun ya da parmağını gezdir; aynı yere dokunursan silinir.</span>
            </div>
          )}
        </div>
      }
      panel={
        <>
          <Card title={`Bulduğun şekiller: ${found.length} / ${task.need}`}>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: task.need }, (_, i) => (
                <span key={i} className={`grid min-h-14 min-w-14 place-items-center rounded-xl p-1 ring-1 ${found[i] ? 'bg-emerald-50 ring-emerald-200 animate-pop' : 'bg-paper ring-line'}`}>
                  {found[i] ? <span className="flex flex-col items-center"><MiniPieces cells={found[i].cells} size={44} />{task.rect && <span className="text-[11px] font-black text-emerald-800">{found[i].label}</span>}</span> : <span className="text-xl text-ink-soft/40">?</span>}
                </span>
              ))}
            </div>
          </Card>
          {task.halves && <p className="rounded-xl bg-white/80 px-3 py-2 text-sm font-bold text-ink-soft ring-1 ring-line">Alanın şu an: <b className="text-ink">{fmt(area)}</b> birim kare</p>}
          {nudge && <Nudge key={nudge.id} question={nudge.q} misconception={nudge.mis} tool="alancevre" toolConfig={{}} onClose={() => setNudge(null)} />}
          {ok && <Derived>{ok}</Derived>}
          {!enough && (ok ? <BigButton onClick={() => { setCells({}); setOk(null) }} className="w-full">Farklı bir tane yap</BigButton> : <BigButton onClick={check} disabled={!Object.keys(cells).length} className="w-full"><Check size={20} />Kontrol et</BigButton>)}
          {enough && <Derived tone="info">{task.rect ? `${task.n} birim kare: ${found.map((f) => f.label.split(' =')[0]).join(', ')}. Hepsinin alanı aynı, biçimleri farklı!` : `${found.length} farklı şekil, hepsi ${task.n} birim kare. Alan aynı kaldı, biçim değişti.`}</Derived>}
          {footer}
        </>
      }
    />
  )
}

// ─── Hangisi daha büyük? ──────────────────────────────────────────────────

function CompareRound({ grade, task, onComplete, footer, addSol }: RP & { task: CompareTask }) {
  const track = useTracker()
  const age = useAge(grade)
  const { a, b, cols, rows } = task
  const areaA = totalArea(a), areaB = totalArea(b)
  const truth: 'A' | 'B' | '=' = areaA > areaB ? 'A' : areaB > areaA ? 'B' : '='
  const halves = halfCount(a) + halfCount(b) > 0
  const [pred, setPred] = useState<'A' | 'B' | '=' | null>(null)
  const [cells, setCells] = useState<Cells>({})
  const [tool, setTool] = useState<Cell>('F')
  const [nudge, setNudge] = useState<NS>(null)
  const [done, setDone] = useState(false)
  const inA = (k: string) => k in a, inB = (k: string) => k in b
  const coveredA = Object.keys(a).every((k) => cells[k] === a[k])
  const coveredB = Object.keys(b).every((k) => cells[k] === b[k])
  const sum = (f: (k: string) => boolean) => Object.entries(cells).filter(([k, c]) => f(k) && c === (a[k] ?? b[k])).reduce<number>((s, [, c]) => s + cellArea(c), 0)

  const predict = (p: 'A' | 'B' | '=') => {
    setPred(p)
    if (p !== truth) track.misconception(truth === '=' ? 'Biçimi farklı iki şeklin alanlarının farklı olduğunu düşündü' : 'Uzun/yayılmış görünen şeklin alanının daha büyük olduğunu düşündü')
  }
  const onSet = (k: string, c: Cell | null) => {
    if (done || !pred) return
    const want = a[k] ?? b[k]
    if (c !== null && want !== c) {
      setNudge({ q: want === 'F' ? 'Buraya tam kare sığar.' : 'Bu kare yarım: hangi yöne bakan yarım kare buraya tam oturur? Alttaki düğmelerden yönünü seç.', id: Date.now() })
      return
    }
    setNudge(null)
    setCells((cs) => {
      const n = { ...cs }
      if (c === null) delete n[k]
      else n[k] = c
      return n
    })
  }
  useEffect(() => {
    if (done || !pred || !coveredA || !coveredB) return
    setDone(true)
    const ok = pred === truth
    track.attempt(ok)
    track.item(ok)
    sfx.ok()
    addSol('kapla', `A = ${fmt(areaA)}, B = ${fmt(areaB)}`)
    onComplete(ok)
  }, [done, pred, coveredA, coveredB, truth, track, addSol, areaA, areaB, onComplete])
  const outline = (r: Cells, col: string, label: string) => {
    const keys = Object.keys(r)
    const ps = keys.map(pk)
    const lx = Math.min(...ps.map((p) => p[0])), ly = Math.min(...ps.map((p) => p[1]))
    return (
      <g pointerEvents="none">
        {Object.entries(r).map(([k, c]) => {
          const [x, y] = pk(k)
          const pts = c === 'F' ? [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]] : (() => { const C4 = [[0, 0], [1, 0], [1, 1], [0, 1]]; return [C4[(c + 3) % 4], C4[c], C4[(c + 1) % 4]].map(([p, q]) => [x + p, y + q]) })()
          return <polygon key={k} points={pts.map((q) => q.join(',')).join(' ')} fill={col} fillOpacity={0.13} stroke={col} strokeWidth={0.05} strokeDasharray="0.12 0.08" />
        })}
        <text x={lx + 0.15} y={ly - 0.12 < 0.2 ? ly + 0.45 : ly - 0.12} fontSize={0.5} fontWeight={900} fill={col}>{label}</text>
      </g>
    )
  }
  return (
    <Layout
      top={<Prompt emoji="🌱" color={C}>{task.text}</Prompt>}
      work={
        <div>
          <div style={fitWidth((cols + 0.6) / (rows + 0.6), 290)}>
            <ZoomBox>
              <PieceBoard cols={cols} rows={rows} cells={cells} onSet={onSet} tool={tool} canPaint={(k) => inA(k) || inB(k)} locked={done || !pred} cellColor={(k) => (inA(k) ? '#16a34a' : '#0d9488')} under={<>{outline(a, '#ea580c', 'A')}{outline(b, '#7c3aed', 'B')}</>} />
            </ZoomBox>
          </div>
          {pred && !done && <Tools tool={tool} setTool={setTool} halves={halves} big={age.big} />}
          {pred && !done && <p className="mt-2 text-center text-sm font-bold text-ink-soft">Bahçelerin içini birim karelerle kapla.</p>}
        </div>
      }
      panel={
        <>
          <Card title="1. Tahmin et">
            <div className="grid grid-cols-3 gap-2">
              {(['A', '=', 'B'] as const).map((p) => (
                <PickBtn key={p} big={age.big} on={pred === p} disabled={!!pred} onClick={() => predict(p)}>{p === '=' ? 'Eşit' : `${p} büyük`}</PickBtn>
              ))}
            </div>
          </Card>
          {pred && (
            <Card title="2. Kaplayarak test et">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-orange-50 p-2 ring-1 ring-orange-200"><p className="text-xs font-black text-orange-700">A</p><p className="text-2xl font-black text-ink tabular-nums">{fmt(sum(inA))}{coveredA ? ' ✓' : ''}</p></div>
                <div className="rounded-xl bg-violet-50 p-2 ring-1 ring-violet-200"><p className="text-xs font-black text-violet-700">B</p><p className="text-2xl font-black text-ink tabular-nums">{fmt(sum(inB))}{coveredB ? ' ✓' : ''}</p></div>
              </div>
              <p className="mt-1 text-center text-xs font-bold text-ink-soft">birim kare</p>
            </Card>
          )}
          {nudge && <Nudge key={nudge.id} question={nudge.q} onClose={() => setNudge(null)} />}
          {done && (
            <Derived tone={pred === truth ? 'ok' : 'info'}>
              {`A = ${fmt(areaA)} birim kare, B = ${fmt(areaB)} birim kare: ${truth === '=' ? 'alanları eşit' : `${truth} daha büyük`}. ${pred === truth ? 'Tahminin tuttu!' : 'Gözümüz bizi yanıltabilir; ölçmek (kaplamak) kesin cevabı verir.'}`}
            </Derived>
          )}
          {footer}
        </>
      }
    />
  )
}

// ─── Yeniden diz: alan değişir mi? ────────────────────────────────────────

function RearrangeRound({ grade, task, onComplete, footer, addSol }: RP & { task: RearrangeTask }) {
  const track = useTracker()
  const age = useAge(grade)
  const cols = 9, rows = 6
  const [tiles, setTiles] = useState<string[]>(task.tiles)
  const [pred, setPred] = useState<'artar' | 'azalir' | 'ayni' | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ from: string; at: Pt } | null>(null)
  const [moves, setMoves] = useState(0)
  const [done, setDone] = useState(false)
  const svg = useRef<SVGSVGElement>(null)
  const tset = new Set(tiles)
  const r = rectOf(Object.fromEntries(tiles.map((k) => [k, 'F' as Cell])))

  const move = (from: string, to: string) => {
    if (from === to || tset.has(to)) return
    const nt = tiles.map((k) => (k === from ? to : k))
    setTiles(nt)
    setMoves((m) => m + 1)
    const rr = rectOf(Object.fromEntries(nt.map((k) => [k, 'F' as Cell])))
    if (rr && !done) {
      setDone(true)
      const ok = pred === 'ayni'
      track.attempt(ok)
      track.item(ok)
      sfx.ok()
      addSol(`${Math.min(rr.w, rr.h)}x${Math.max(rr.w, rr.h)}`, `${rr.h} × ${rr.w} = ${nt.length}`)
      onComplete(ok)
    }
  }
  const cellAt = (p: Pt) => {
    const x = Math.floor(p[0]), y = Math.floor(p[1])
    return x >= 0 && y >= 0 && x < cols && y < rows ? ck(x, y) : null
  }
  useGridGesture<{ from: string | null }>(svg, {
    disabled: done || !pred,
    onStart: (p) => {
      const k = cellAt(p)
      if (k && tset.has(k)) {
        setDrag({ from: k, at: p })
        return { from: k }
      }
      return { from: null }
    },
    onMove: (p, m) => m.from && setDrag({ from: m.from, at: p }),
    onEnd: (p, m, tap) => {
      setDrag(null)
      const k = cellAt(p)
      if (tap) {
        if (m.from) setSel((s) => (s === m.from ? null : m.from))
        else if (k && sel) {
          move(sel, k)
          setSel(null)
        }
        return
      }
      if (m.from && k) move(m.from, k)
    },
  })
  const pad = 0.3
  return (
    <Layout
      top={<Prompt emoji="🔀" color={C}>{task.text}</Prompt>}
      work={
        <div>
          <div style={fitWidth((cols + 0.6) / (rows + 0.6), 290)}>
            <svg ref={svg} viewBox={`${-pad} ${-pad} ${cols + 2 * pad} ${rows + 2 * pad}`} className="block w-full select-none rounded-2xl bg-white ring-1 ring-line" style={{ touchAction: 'none' }} role="img" aria-label="Kareleri yeniden diz">
              <g stroke="#e3e7f2" strokeWidth={0.03}>
                {Array.from({ length: cols + 1 }, (_, i) => <line key={`v${i}`} x1={i} x2={i} y1={0} y2={rows} />)}
                {Array.from({ length: rows + 1 }, (_, i) => <line key={`h${i}`} y1={i} y2={i} x1={0} x2={cols} />)}
              </g>
              {task.tiles.map((k) => { const [x, y] = pk(k); return <rect key={`g${k}`} x={x + 0.1} y={y + 0.1} width={0.8} height={0.8} rx={0.12} fill="none" stroke="#cbd5e1" strokeWidth={0.04} strokeDasharray="0.1 0.08" /> })}
              {tiles.map((k) => {
                const [x, y] = pk(k)
                const dragging = drag?.from === k
                const px = dragging ? drag.at[0] - 0.5 : x, py = dragging ? drag.at[1] - 0.5 : y
                return <rect key={k} data-handle x={px + 0.05} y={py + 0.05} width={0.9} height={0.9} rx={0.14} fill={done ? '#16a34a' : sel === k ? '#1e3a8a' : BLUE} stroke={sel === k ? '#fbbf24' : '#fff'} strokeWidth={sel === k ? 0.1 : 0.05} opacity={dragging ? 0.85 : 1} />
              })}
              {done && r && (() => { const ps = tiles.map(pk); const x0 = Math.min(...ps.map((p) => p[0])), y0 = Math.min(...ps.map((p) => p[1])); return <rect x={x0} y={y0} width={r.w} height={r.h} fill="none" stroke="#16a34a" strokeWidth={0.1} rx={0.1} /> })()}
            </svg>
          </div>
          {pred && !done && <p className="mt-2 text-center text-sm font-bold text-ink-soft">Bir kareyi sürükle ya da önce kareye, sonra boş yere dokun.</p>}
        </div>
      }
      panel={
        <>
          <Card title="Önce tahmin et">
            <p className="mb-2 text-[16px] leading-snug font-extrabold">Kareleri dikdörtgen olacak biçimde dizersen alan ne olur?</p>
            <div className="grid grid-cols-3 gap-2">
              {([['artar', 'Artar'], ['ayni', 'Aynı kalır'], ['azalir', 'Azalır']] as const).map(([v, t]) => (
                <PickBtn key={v} big={age.big} on={pred === v} disabled={!!pred} onClick={() => { setPred(v); if (v !== 'ayni') track.misconception('Parçalar yeniden düzenlenince alanın değiştiğini düşündü') }} className="text-sm">{t}</PickBtn>
              ))}
            </div>
          </Card>
          {pred && (
            <Card title="Sayaç">
              <p className="text-lg font-black">Kare sayısı: <span className="tabular-nums text-blue-700">{tiles.length}</span> <span className="text-sm font-bold text-ink-soft">· {moves} taşıma</span></p>
            </Card>
          )}
          {done && r && <Derived>{`${r.h} sıra × ${r.w} kare = ${tiles.length} birim kare. ${moves} kare taşıdın ama alan hep ${tiles.length} kaldı!`}</Derived>}
          {done && pred !== 'ayni' && <Derived tone="info">Şekil değişti ama hiç kare eklemedik ya da çıkarmadık; bu yüzden alan aynı kaldı.</Derived>}
          {footer}
        </>
      }
    />
  )
}

// ─── 6. sınıf: paralelkenarı kes ve taşı ──────────────────────────────────

function ParaRound({ grade, onComplete, footer, addSol }: RP) {
  const track = useTracker()
  const age = useAge(grade)
  const [est, setEst] = useState<number | null>(null)
  const [phase, setPhase] = useState<'est' | 'cut' | 'move' | 'done'>('est')
  const [dx, setDx] = useState(0)
  const [nudge, setNudge] = useState<NS>(null)
  const [estOk, setEstOk] = useState(true)
  // A(1,5) B(6,5) C(8,2) D(3,2) → taban 5, yükseklik 3
  const A: Pt = [1, 5], B: Pt = [6, 5], Cc: Pt = [8, 2], D: Pt = [3, 2]
  const tri: Pt[] = [A, [3, 5], D].map(([x, y]) => [x + dx, y] as Pt)
  const rest: Pt[] = [[3, 5], B, Cc, D]
  const sendEst = () => {
    if (est === null) return
    const ok = Math.abs(est - 15) <= 1
    setEstOk(ok)
    if (est >= 17 && est <= 19) track.misconception('Paralelkenarın alanında eğik kenarı yükseklik gibi kullandı')
    setPhase('cut')
  }
  const onMove = (_: string, x: number) => {
    const d = Math.max(0, Math.min(6, x - 2))
    setDx(d)
    if (d === 5 && phase === 'move') {
      setPhase('done')
      sfx.ok()
      track.attempt(true)
      track.item(estOk)
      addSol('dikdortgen', 'Paralelkenar → dikdörtgen')
      onComplete(estOk)
    }
  }
  const handles: Handle[] = phase === 'move' ? [{ id: 't', x: 2 + dx, y: 5, color: '#f59e0b', ring: true, label: '✂' }] : []
  const poly = (p: Pt[]) => p.map((q) => q.join(',')).join(' ')
  return (
    <Layout
      top={<Prompt emoji="✂️" color={C}>Bu paralelkenarın alanı kaç birim kare? Önce **tahmin et**, sonra kes ve parçayı taşıyarak kanıtla.</Prompt>}
      work={
        <div>
          <div style={fitWidth(11.4 / 7.4, 300)}>
            <PegBoard cols={10} rows={6} handles={handles} onHandleMove={onMove} locked={phase !== 'move'} handleR={age.big ? 0.32 : 0.28}>
              {phase === 'est' ? (
                <polygon points={poly([A, B, Cc, D])} fill="#0d948833" stroke="#0d9488" strokeWidth={0.08} strokeLinejoin="round" />
              ) : (
                <>
                  <polygon points={poly(rest)} fill="#0d948833" stroke="#0d9488" strokeWidth={0.08} strokeLinejoin="round" />
                  <polygon points={poly(tri)} fill="#f59e0b55" stroke="#d97706" strokeWidth={0.08} strokeLinejoin="round" />
                  {phase === 'move' && dx < 5 && <polygon points={poly([B, [8, 5], Cc])} fill="none" stroke="#d97706" strokeWidth={0.05} strokeDasharray="0.15 0.12" />}
                  <line x1={3} y1={2} x2={3} y2={5} stroke="#1f2340" strokeWidth={0.06} strokeDasharray="0.18 0.1" />
                  <path d="M3,4.72 h0.28 v0.28" fill="none" stroke="#1f2340" strokeWidth={0.04} />
                </>
              )}
              {phase === 'done' && (
                <g>
                  <rect x={3} y={2} width={5} height={3} fill="none" stroke="#16a34a" strokeWidth={0.12} />
                  <text x={5.5} y={5.6} textAnchor="middle" fontSize={0.4} fontWeight={900} fill="#16a34a">taban 5</text>
                  <text x={8.25} y={3.65} fontSize={0.4} fontWeight={900} fill="#16a34a">yükseklik 3</text>
                </g>
              )}
            </PegBoard>
          </div>
          {phase === 'move' && <p className="mt-2 text-center text-sm font-bold text-ink-soft">Turuncu üçgeni ✂ tutamacından sürükleyerek kesikli yere taşı.</p>}
        </div>
      }
      panel={
        <>
          <Card title="1. Tahmin et">
            <div className="flex flex-wrap items-end justify-center gap-3">
              <NumStepper value={est} onChange={setEst} min={0} max={40} label="birim kare" big={age.big} />
              {phase === 'est' && <BigButton onClick={sendEst} disabled={est === null}>Tahminim bu</BigButton>}
            </div>
          </Card>
          {phase === 'cut' && (
            <Card title="2. Kes">
              <p className="mb-2 text-[15px] font-bold">Üst köşeden tabana dik bir çizgiyle kesersek sol uçtaki üçgen ayrılır.</p>
              <BigButton onClick={() => setPhase('move')} className="w-full"><Scissors size={20} />Makasla kes</BigButton>
            </Card>
          )}
          {nudge && <Nudge key={nudge.id} question={nudge.q} onClose={() => setNudge(null)} />}
          {phase === 'done' && (
            <>
              <Derived>Paralelkenar, aynı taban ve yükseklikte bir dikdörtgene dönüştü: 5 × 3 = 15 birim kare.</Derived>
              <Derived tone="info">{estOk ? `Tahminin (${est}) çok yakındı!` : est !== null && est >= 17 && est <= 19 ? `Tahminin ${est} idi. Eğik kenar yükseklik değildir; yükseklik tabana diktir (3 birim).` : `Tahminin ${est} idi. Parçayı taşıyınca alan değişmedi: 15 birim kare.`}</Derived>
            </>
          )}
          {footer}
        </>
      }
    />
  )
}

function ShearRound({ grade, onComplete, footer, addSol }: RP) {
  const track = useTracker()
  const age = useAge(grade)
  const [pred, setPred] = useState<'artar' | 'azalir' | 'ayni' | null>(null)
  const [s, setS] = useState(0)
  const [seen, setSeen] = useState<number[]>([0])
  const [done, setDone] = useState(false)
  // taban A(2,5)–B(6,5), üst D(2+s,2)–C(6+s,2)
  const A: Pt = [2, 5], B: Pt = [6, 5], Cc: Pt = [6 + s, 2], D: Pt = [2 + s, 2]
  const slant = Math.hypot(s, 3)
  const onMove = (_: string, x: number) => {
    const ns = Math.max(-2, Math.min(5, x - 4))
    setS(ns)
    setSeen((v) => (v.includes(ns) ? v : [...v, ns]))
  }
  const finish = () => {
    setDone(true)
    const ok = pred === 'ayni'
    track.attempt(ok)
    track.item(ok)
    sfx.ok()
    addSol('kaydir', 'Aynı taban, aynı yükseklik → aynı alan')
    onComplete(ok)
  }
  const handles: Handle[] = pred && !done ? [{ id: 'top', x: 4 + s, y: 2, color: '#7c3aed', ring: true, label: '⇔' }] : []
  const poly = (p: Pt[]) => p.map((q) => q.join(',')).join(' ')
  return (
    <Layout
      top={<Prompt emoji="↔️" color={C}>Paralelkenarın **üst kenarını** sağa sola kaydırırsak alanı ne olur? Önce tahmin et, sonra kaydır ve izle.</Prompt>}
      work={
        <div>
          <div style={fitWidth(13.4 / 7.4, 300)}>
            <PegBoard cols={12} rows={6} handles={handles} onHandleMove={onMove} locked={!pred || done} handleR={age.big ? 0.32 : 0.28}>
              <polygon points={poly([A, B, Cc, D])} fill="#7c3aed2e" stroke="#7c3aed" strokeWidth={0.08} strokeLinejoin="round" />
              <line x1={D[0]} y1={2} x2={D[0]} y2={5} stroke="#1f2340" strokeWidth={0.05} strokeDasharray="0.15 0.1" />
              <text x={D[0] + 0.12} y={3.6} fontSize={0.36} fontWeight={900} fill="#1f2340">3</text>
              <text x={4} y={5.6} textAnchor="middle" fontSize={0.36} fontWeight={900} fill="#1f2340">4</text>
            </PegBoard>
          </div>
          {pred && !done && <p className="mt-2 text-center text-sm font-bold text-ink-soft">Mor tutamacı sağa sola sürükle.</p>}
        </div>
      }
      panel={
        <>
          <Card title="Önce tahmin et">
            <div className="grid grid-cols-3 gap-2">
              {([['artar', 'Artar'], ['ayni', 'Aynı kalır'], ['azalir', 'Azalır']] as const).map(([v, t]) => (
                <PickBtn key={v} big={age.big} on={pred === v} disabled={!!pred} onClick={() => { setPred(v); if (v === 'artar') track.misconception('Eğik kenar uzayınca paralelkenarın alanının arttığını düşündü') }} className="text-sm">{t}</PickBtn>
              ))}
            </div>
          </Card>
          {pred && (
            <Card title="Ölçümler">
              <div className="grid grid-cols-2 gap-2 text-center text-sm font-bold">
                <div className="rounded-xl bg-paper p-2">Taban<br /><b className="text-xl text-ink">4</b></div>
                <div className="rounded-xl bg-paper p-2">Yükseklik<br /><b className="text-xl text-ink">3</b></div>
                <div className="rounded-xl bg-amber-50 p-2">Eğik kenar<br /><b className="text-xl text-amber-700 tabular-nums">{slant.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}</b></div>
                <div className="rounded-xl bg-violet-50 p-2">Alan<br /><b className="text-xl text-violet-700 tabular-nums">12</b></div>
              </div>
            </Card>
          )}
          {pred && !done && seen.length >= 3 && <BigButton onClick={finish} className="w-full"><Check size={20} />Gördüm!</BigButton>}
          {done && <Derived>{pred === 'ayni' ? 'Tahminin tuttu! ' : ''}Eğik kenar uzadı ama taban (4) ve yükseklik (3) değişmedi: alan hep 4 × 3 = 12 birim kare.</Derived>}
          {footer}
        </>
      }
    />
  )
}

function TriRound({ grade, onComplete, footer, addSol }: RP) {
  const track = useTracker()
  const age = useAge(grade)
  const [phase, setPhase] = useState<'start' | 'q1' | 'q2' | 'done'>('start')
  const [t, setT] = useState(0)
  const [v1, setV1] = useState<number | null>(null)
  const [v2, setV2] = useState<number | null>(null)
  const [wrong, setWrong] = useState(0)
  const [nudge, setNudge] = useState<NS>(null)
  const A: Pt = [1, 5], B: Pt = [5, 5], Cc: Pt = [2, 2]
  const M: Pt = [(B[0] + Cc[0]) / 2, (B[1] + Cc[1]) / 2]
  const addTwin = () => {
    const t0 = performance.now()
    const step = (now: number) => {
      const u = Math.min(1, (now - t0) / 900)
      setT(u)
      if (u < 1) requestAnimationFrame(step)
      else setPhase('q1')
    }
    requestAnimationFrame(step)
  }
  const check1 = () => {
    if (v1 === 12) {
      sfx.ok()
      setNudge(null)
      setPhase('q2')
    } else {
      setWrong((w) => w + 1)
      track.attempt(false)
      setNudge({ q: 'Paralelkenarın tabanı kaç birim, yüksekliği kaç birim? Az önce paralelkenarı dikdörtgene çevirmiştin.', id: Date.now() })
    }
  }
  const check2 = () => {
    if (v2 === 6) {
      sfx.ok()
      setNudge(null)
      setPhase('done')
      track.attempt(true)
      track.item(wrong === 0)
      addSol('ucgen', 'Üçgen = paralelkenarın yarısı')
      onComplete(wrong === 0)
    } else {
      setWrong((w) => w + 1)
      track.attempt(false)
      setNudge({ q: v2 === 12 ? 'Paralelkenar iki eş üçgenden oluştu. Bir üçgen paralelkenarın ne kadarı?' : 'İki eş üçgen 12 birim kare ediyorsa bir tanesi kaç eder?', mis: v2 === 12 ? 'Üçgenin alanını paralelkenarınkine eşit sandı' : undefined, id: Date.now() })
    }
  }
  const poly = (p: Pt[]) => p.map((q) => q.join(',')).join(' ')
  return (
    <Layout
      top={<Prompt emoji="🔺" color={C}>Bu üçgenin alanını bulmak için ona **eş bir üçgen** ekleyelim. Hangi şekil oluşacak?</Prompt>}
      work={
        <div style={fitWidth(9.4 / 7.4, 300)}>
          <PegBoard cols={8} rows={6} locked handleR={0.28}>
            <polygon points={poly([A, B, Cc])} fill="#0ea5e955" stroke="#0284c7" strokeWidth={0.08} strokeLinejoin="round" />
            {t > 0 && (
              <g transform={`rotate(${180 * t} ${M[0]} ${M[1]})`}>
                <polygon points={poly([A, B, Cc])} fill="#f59e0b55" stroke="#d97706" strokeWidth={0.08} strokeLinejoin="round" strokeDasharray={t < 1 ? '0.15 0.1' : undefined} />
              </g>
            )}
            {phase !== 'start' && (
              <g>
                <line x1={2} y1={2} x2={2} y2={5} stroke="#1f2340" strokeWidth={0.05} strokeDasharray="0.15 0.1" />
                <text x={3} y={5.6} textAnchor="middle" fontSize={0.36} fontWeight={900} fill="#1f2340">taban 4</text>
                <text x={1.85} y={3.6} textAnchor="end" fontSize={0.36} fontWeight={900} fill="#1f2340">3</text>
              </g>
            )}
          </PegBoard>
        </div>
      }
      panel={
        <>
          {phase === 'start' && <BigButton onClick={addTwin} className="w-full">🔁 Eşini ekle ve döndür</BigButton>}
          {(phase === 'q1' || phase === 'q2' || phase === 'done') && (
            <Card title="Paralelkenar oluştu!">
              <p className="mb-2 font-extrabold">Paralelkenarın alanı kaç birim kare?</p>
              <div className="flex flex-wrap items-end justify-center gap-3">
                <NumStepper value={v1} onChange={(x) => { setV1(x); setNudge(null) }} max={30} big={age.big} />
                {phase === 'q1' && <BigButton onClick={check1} disabled={v1 === null}><Check size={20} />Kontrol</BigButton>}
              </div>
            </Card>
          )}
          {(phase === 'q2' || phase === 'done') && (
            <Card title="Ya üçgen?">
              <p className="mb-2 font-extrabold">Mavi üçgenin alanı kaç birim kare?</p>
              <div className="flex flex-wrap items-end justify-center gap-3">
                <NumStepper value={v2} onChange={(x) => { setV2(x); setNudge(null) }} max={30} step={0.5} fmt={fmt} big={age.big} />
                {phase === 'q2' && <BigButton onClick={check2} disabled={v2 === null}><Check size={20} />Kontrol</BigButton>}
              </div>
            </Card>
          )}
          {nudge && <Nudge key={nudge.id} question={nudge.q} misconception={nudge.mis} onClose={() => setNudge(null)} />}
          {phase === 'done' && <Derived>İki eş üçgen bir paralelkenar yapar: üçgenin alanı = (taban × yükseklik) ÷ 2 = (4 × 3) ÷ 2 = 6 birim kare.</Derived>}
          {footer}
        </>
      }
    />
  )
}
