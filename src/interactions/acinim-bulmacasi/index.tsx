import { useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Check, Eraser, Lightbulb, PackageOpen, Pencil, RotateCcw, Sparkles } from 'lucide-react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { Scene, StrategyPicker, useSolutions } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { useTracker } from '../../lib/trackerContext'
import { ek } from '../../lib/generators'
import { Card, CheckButton, Choices, GhostButton, Header, NextButton, Nudge, NumPad, Prompt, Slider, Split, parseNum, pick, rng, shuffle, useChecks } from '../donusum-studyosu/ortak'
import { COLOR_NAMES, CUBE_NETS, FACE_COLORS, PI3, TRICKY_NON_NETS, boxFaces, canonical, cellFaces, collisions, coneFaces, connected, cylinderFaces, landscape, opposites, parseCells, prepare, pyramidFaces, triPrismFaces, type Face, type P2 } from './net'
import { FoldControls, FoldStage, GridBuilder, NetThumb, useFold, type Mark } from './Fold3D'

/**
 * 55. Cisim Açınımı Bulmacası (4–8)
 * Genel bir CSS 3B katlayıcı: açınım, menteşelerle birbirine bağlı yüzlerden oluşan bir ağaçtır; “Katla”
 * ile yüzler menteşeleri etrafında döner, sahne parmakla çevrilir. Aynı dönüşümler JS’te de hesaplanır:
 * katlanınca aynı yere gelen yüzler kırmızı parlar (açınım değil), karşılıklı yüzler bulunur.
 * Görevler:
 *  - predict:  “Bu açınım küp olur mu?” — önce tahmin, sonra katlayarak kanıt
 *  - which:    dört açınımdan hangileri küp/kutu olur? (tahmin → katlayarak doğrula)
 *  - opposite: ★ yüzün karşısına hangi yüz gelir?
 *  - dice:     zar açınımına sayıları yerleştir (karşılıklı yüzlerin toplamı 7); bazen iki yerleşim var
 *  - build:    ızgaraya 6 kare çizip katla; farklı açınımlar (7–8: 11 açınımın hepsi, açık uçlu)
 *  - boxsa:    dikdörtgenler prizması açınımından yüzey alanı (7)
 *  - solids:   prizma/piramit/silindir/koni açınımı hangi cisim? (8)
 *  - cylinder: yan yüz dikdörtgeninin uzunluğunu ayarla → tüp tam kapanınca yüzey alanı (8)
 */

type SolidId = 'tri' | 'pyr' | 'cyl' | 'cone' | 'box'
type WhichItem = { faces: Face[]; ok: boolean }
type Task =
  | { kind: 'predict'; cells: P2[] }
  | { kind: 'which'; items: WhichItem[]; box?: [number, number, number] }
  | { kind: 'opposite'; cells: P2[]; star: number; colors: boolean }
  | { kind: 'dice'; cells: P2[]; given: number }
  | { kind: 'build'; goal: number; all: boolean }
  | { kind: 'boxsa'; a: number; b: number; c: number }
  | { kind: 'solids'; items: SolidId[] }
  | { kind: 'cylinder'; r: number; h: number }

const T8: ((p: P2) => P2)[] = [([x, y]) => [x, y], ([x, y]) => [-y, x], ([x, y]) => [-x, -y], ([x, y]) => [y, -x], ([x, y]) => [-x, y], ([x, y]) => [y, x], ([x, y]) => [x, -y], ([x, y]) => [-y, -x]]
function orient(s: string, r: () => number): P2[] {
  const cs = parseCells(s).map(pick(T8, r))
  const mx = Math.min(...cs.map((p) => p[0])), my = Math.min(...cs.map((p) => p[1]))
  const n = cs.map(([x, y]) => [x - mx, y - my] as P2)
  // sıra: sabit (yukarıdan aşağı, soldan sağa) — yüz numaraları düzenli olsun
  return landscape(n).sort((a, b) => a[1] - b[1] || a[0] - b[0])
}
const cubeColor = (dark: boolean) => (dark ? '#7dd3fc' : '#93c5fd')

function makeTasks(grade: Grade): Task[] {
  const r = rng(Date.now() % 100000)
  const nets = shuffle(CUBE_NETS, r)
  const bad = shuffle(TRICKY_NON_NETS, r)
  const dark = grade >= 7
  const cubeWhich = (): Task => ({
    kind: 'which',
    items: shuffle([nets[0], nets[1], bad[0], bad[1]].map((s) => ({ faces: cellFaces(orient(s, r), () => cubeColor(dark)).faces, ok: CUBE_NETS.includes(s) })), r),
  })
  const boxWhich = (a: number, b: number, c: number): Task => ({
    kind: 'which',
    box: [a, b, c],
    items: shuffle(
      (['cross', 'sidesTop', 'sameSide', 'wrongTop'] as const).map((layout) => ({ faces: boxFaces(a, b, c, { layout, grid: true, color: '#fcd34d' }), ok: layout === 'cross' || layout === 'sidesTop' })),
      r,
    ),
  })
  if (grade === 4)
    return shuffle<Task>([{ kind: 'predict', cells: orient(nets[2], r) }, { kind: 'predict', cells: orient(bad[2], r) }], r).concat([
      { kind: 'opposite', cells: orient(nets[3], r), star: Math.floor(r() * 6), colors: true },
      boxWhich(2, 2, 1),
      { kind: 'build', goal: 1, all: false },
    ])
  if (grade === 5)
    return [
      { kind: 'predict', cells: orient(r() < 0.5 ? nets[2] : bad[2], r) },
      cubeWhich(),
      { kind: 'opposite', cells: orient(nets[3], r), star: Math.floor(r() * 6), colors: false },
      { kind: 'dice', cells: orient(nets[4], r), given: 3 },
      { kind: 'build', goal: 2, all: false },
    ]
  if (grade === 6)
    return [
      cubeWhich(),
      { kind: 'opposite', cells: orient(nets[3], r), star: Math.floor(r() * 6), colors: false },
      { kind: 'dice', cells: orient(nets[4], r), given: 2 },
      boxWhich(3, 2, 1),
      { kind: 'build', goal: 3, all: false },
    ]
  if (grade === 7)
    return [
      cubeWhich(),
      { kind: 'dice', cells: orient(nets[4], r), given: 2 },
      { kind: 'build', goal: 3, all: true },
      { kind: 'boxsa', ...pick([{ a: 4, b: 3, c: 2 }, { a: 5, b: 2, c: 3 }, { a: 6, b: 3, c: 2 }, { a: 5, b: 4, c: 2 }], r) },
    ]
  const [s1, s2] = [shuffle<SolidId>(['tri', 'pyr', 'box'], r).slice(0, 2), shuffle<SolidId>(['cyl', 'cone'], r)]
  return [
    cubeWhich(),
    { kind: 'solids', items: s1 },
    { kind: 'solids', items: s2 },
    { kind: 'cylinder', r: pick([2, 3], r), h: pick([4, 5, 6], r) },
    { kind: 'build', goal: 2, all: true },
  ]
}

const titles: Record<Task['kind'], string> = {
  predict: 'Küp olur mu?',
  which: 'Hangileri kapanır?',
  opposite: 'Karşılıklı yüzler',
  dice: 'Zar açınımı',
  build: 'Açınım tasarla',
  boxsa: 'Kutuyu kapla',
  solids: 'Hangi cismin açınımı?',
  cylinder: 'Silindiri sar',
}

export default function AcinimBulmacasi({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade), [grade])
  const [idx, setIdx] = useState(0)
  const [solved, setSolved] = useState(false)
  const firsts = useRef<boolean[]>([])
  const sol = useSolutions()
  const dark = grade >= 7
  const task = tasks[idx]
  const last = idx === tasks.length - 1

  const onSolved = (first: boolean) => {
    if (firsts.current.length <= idx) firsts.current.push(first)
    setSolved(true)
  }
  const next = () => {
    if (!last) {
      setIdx(idx + 1)
      setSolved(false)
      return
    }
    const f = firsts.current.filter(Boolean).length
    const nets = sol.list.filter((s) => s.key.startsWith('net:')).length
    onFinish({
      stars: starsFor((f + Math.min(1, nets * 0.15)) / tasks.length),
      summary: `${tasks.length} açınım görevini katlayarak tamamladın${nets > 1 ? `; ${nets} farklı küp açınımı buldun` : ''}.`,
      insight:
        grade === 4
          ? 'Küpün 6 eş kare yüzü vardır ama 6 karelik her şekil küp olmaz: katlanınca iki kare üst üste gelirse bir yüz açık kalır. Bir kutunun açınımında karşılıklı yüzler eştir.'
          : grade <= 6
            ? 'Küpte karşılıklı iki yüz açınımda asla yan yana (komşu) değildir; düz bir sırada bir kare atlayınca karşıya gelinir. Zarda karşılıklı yüzlerin toplamı 7’dir ve aynı küpün birçok farklı açınımı vardır.'
            : grade === 7
              ? 'Küpün tam 11 farklı açınımı vardır. Dikdörtgenler prizmasının yüzey alanı, açınımındaki 6 dikdörtgenin alanları toplamıdır; karşılıklı yüzler eş olduğundan 2·(a·b + a·c + b·c) olur.'
              : 'Açınım cismin yüzlerini gösterir: prizmanın iki eş tabanı ve dikdörtgen yan yüzleri, piramidin tek tabanı ve üçgen yan yüzleri vardır. Silindirin yan yüzü, uzunluğu taban çevresine (2πr) eşit bir dikdörtgendir; yüzey alanı = 2πr² + 2πrh.',
    })
  }

  const footer = solved ? <NextButton last={last} onClick={next} /> : null
  const common: Common = { grade, dark, footer, onSolved, sol }
  return (
    <Scene grade={grade}>
      <Header emoji="🧊" title={titles[task.kind]} idx={idx} total={tasks.length} dark={dark} />
      <TaskView key={idx} task={task} {...common} />
    </Scene>
  )
}

type Common = { grade: Grade; dark: boolean; footer: ReactNode; onSolved: (first: boolean) => void; sol: ReturnType<typeof useSolutions> }

function TaskView({ task, ...c }: { task: Task } & Common) {
  switch (task.kind) {
    case 'predict': return <PredictTask t={task} {...c} />
    case 'which': return <WhichTask t={task} {...c} />
    case 'opposite': return <OppositeTask t={task} {...c} />
    case 'dice': return <DiceTask t={task} {...c} />
    case 'build': return <BuildTask t={task} {...c} />
    case 'boxsa': return <BoxSATask t={task} {...c} />
    case 'solids': return <SolidsTask t={task} {...c} />
    case 'cylinder': return <CylinderTask t={task} {...c} />
  }
}

const badMarks = (pairs: [number, number][]) => Object.fromEntries(pairs.flat().map((i) => [i, 'bad' as Mark]))
const MIS_ALL6 = 'Altı kareden oluşan her şeklin küp açınımı olduğunu düşündü'

/* ───────────────────────── 1. küp olur mu? ───────────────────────── */

function PredictTask({ t, grade, dark, footer, onSolved }: { t: Extract<Task, { kind: 'predict' }> } & Common) {
  const prep = useMemo(() => prepare(cellFaces(t.cells, (i) => (grade <= 4 ? FACE_COLORS[i % 6] : cubeColor(dark))).faces), [t.cells, grade, dark])
  const coll = useMemo(() => collisions(prep), [prep])
  const valid = coll.length === 0
  const fold = useFold()
  const [guess, setGuess] = useState<boolean | null>(null)
  const [done, setDone] = useState(false)
  const chk = useChecks()
  const choose = (g: boolean) => {
    if (guess !== null) return
    setGuess(g)
    fold.animateTo(1, () => {
      setDone(true)
      if (g !== valid) chk.fail()
      onSolved(chk.pass())
    })
  }
  const right = guess === valid
  return (
    <Split
      work={
        <>
          <FoldStage prep={prep} t={fold.t} dark={dark} marks={done && !valid && fold.t > 0.97 ? badMarks(coll) : {}} />
          {done && <FoldControls {...fold} dark={dark} />}
        </>
      }
      panel={
        <>
          <Prompt step="Önce tahmin et">Bu açınımı katlarsan <b className="text-pink-700">kapalı bir küp</b> olur mu?</Prompt>
          <Card dark={dark}><p className="text-sm font-bold">6 kare var. Kafanda katla: kareler hangi yüzlere gidiyor? Tahminin katlayarak sınanacak.</p></Card>
          <Choices<'e' | 'h'> options={[{ id: 'e', label: 'Evet, küp olur' }, { id: 'h', label: 'Hayır, olmaz' }]} value={guess === null ? null : guess ? 'e' : 'h'} onPick={(id) => choose(id === 'e')} disabled={guess !== null} />
          {guess !== null && !done && <p className={`text-center text-sm font-black ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>Katlanıyor… izle!</p>}
          {done && right && <Nudge tone="ok" question={valid ? 'Tahminin doğru: altı kare altı farklı yüze gitti, küp kapandı. Hangi kare tabana, hangisi kapağa gitti? “Aç” ile tekrar izle.' : 'Tahminin doğru: kırmızı parlayan iki kare aynı yere geldi, bu yüzden küpün bir yüzü açık kaldı.'} />}
          {done && !right && (valid
            ? <Nudge question="Küp kapandı! Bu şekil alışık olduğun haç biçimine benzemese de bir küp açınımı. Hangi kare hangi yüze gidiyor? Aç ve yavaşça katlayarak izle." />
            : <Nudge question="Kırmızı parlayan iki kare katlanınca aynı yere geldi. O zaman küpün hangi yüzü boş kaldı? Sahneyi parmağınla çevirip açık yüzü bul." misconception={MIS_ALL6} tool="nets" />)}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 2. hangileri kapanır? ───────────────────────── */

function BoxPic({ a, b, c, dark }: { a: number; b: number; c: number; dark: boolean }) {
  const u = 26, dx = 0.55 * u, dy = 0.45 * u
  const W = a * u + b * dx + 50, H = c * u + b * dy + 30
  const x0 = 20, y0 = b * dy + 10
  const front = `${x0},${y0} ${x0 + a * u},${y0} ${x0 + a * u},${y0 + c * u} ${x0},${y0 + c * u}`
  const top = `${x0},${y0} ${x0 + b * dx},${y0 - b * dy} ${x0 + a * u + b * dx},${y0 - b * dy} ${x0 + a * u},${y0}`
  const side = `${x0 + a * u},${y0} ${x0 + a * u + b * dx},${y0 - b * dy} ${x0 + a * u + b * dx},${y0 - b * dy + c * u} ${x0 + a * u},${y0 + c * u}`
  const txt = dark ? '#e2e8f0' : '#1f2340'
  return (
    <svg viewBox={`0 0 ${W} ${H + 8}`} className="mx-auto block w-full max-w-56" aria-label={`${a} × ${b} × ${c} kutu`}>
      <polygon points={front} fill="#fcd34d" stroke="#1e293b" strokeWidth={2} strokeLinejoin="round" />
      <polygon points={top} fill="#fde68a" stroke="#1e293b" strokeWidth={2} strokeLinejoin="round" />
      <polygon points={side} fill="#f59e0b" stroke="#1e293b" strokeWidth={2} strokeLinejoin="round" />
      {Array.from({ length: a - 1 }, (_, i) => <line key={i} x1={x0 + (i + 1) * u} x2={x0 + (i + 1) * u} y1={y0} y2={y0 + c * u} stroke="#1e293b" strokeOpacity={0.3} strokeDasharray="3 3" />)}
      <text x={x0 + (a * u) / 2} y={y0 + c * u + 15} textAnchor="middle" fontSize={13} fontWeight={900} fill={txt}>{a}</text>
      <text x={x0 - 8} y={y0 + (c * u) / 2 + 4} textAnchor="middle" fontSize={13} fontWeight={900} fill={txt}>{c}</text>
      <text x={x0 + a * u + (b * dx) / 2 + 10} y={y0 + c * u - (b * dy) / 2 + 12} fontSize={13} fontWeight={900} fill={txt}>{b}</text>
    </svg>
  )
}

function WhichTask({ t, dark, footer, onSolved }: { t: Extract<Task, { kind: 'which' }> } & Common) {
  const preps = useMemo(() => t.items.map((it) => prepare(it.faces)), [t.items])
  const colls = useMemo(() => preps.map((p) => collisions(p)), [preps])
  const [focus, setFocus] = useState(0)
  const [ans, setAns] = useState<(boolean | null)[]>(t.items.map(() => null))
  const [checked, setChecked] = useState<boolean[] | null>(null)
  const [done, setDone] = useState(false)
  const [fb, setFb] = useState<{ text: string; mis?: string } | null>(null)
  const fold = useFold()
  const chk = useChecks()
  const isBox = !!t.box
  const noun = isBox ? 'kutu' : 'küp'

  const show = (i: number) => {
    setFocus(i)
    fold.setT(0)
  }
  const setA = (i: number, v: boolean) => {
    if (done) return
    setAns((a) => a.map((x, j) => (j === i ? v : x)))
    setChecked(null)
    setFb(null)
    show(i)
  }
  const check = () => {
    const res = t.items.map((it, i) => ans[i] === it.ok)
    setChecked(res)
    if (res.every(Boolean)) {
      setDone(true)
      setFb(null)
      onSolved(chk.pass())
      return
    }
    chk.fail()
    const wrongYes = t.items.findIndex((it, i) => !res[i] && !it.ok)
    const firstWrong = res.findIndex((x) => !x)
    show(firstWrong)
    if (wrongYes >= 0)
      setFb({
        text: `Turuncu çerçeveli açınımlardan en az birinde tahminin tutmadı. Onu seç ve “Katla”ya dokun: katlanınca ${isBox ? 'boşluk kalıyor ya da iki yüz üst üste geliyor mu' : 'iki kare üst üste geliyor mu'}?`,
        mis: isBox ? 'Kutu açınımında yüzlerin boyutlarını ve yerlerini dikkate almadı' : MIS_ALL6,
      })
    else setFb({ text: `Turuncu çerçeveli açınımı seç ve katla. Kapalı bir ${noun} oluşuyor mu? Alışık olmadığın biçimler de ${noun} olabilir.` })
  }
  const prep = preps[focus]
  const canFold = checked !== null
  const folded = fold.t > 0.97
  return (
    <Split
      work={
        <>
          <FoldStage key={focus} prep={prep} t={fold.t} dark={dark} marks={folded ? badMarks(colls[focus]) : {}}>
            <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-pink-600 px-3 py-1 text-sm font-black text-white shadow">{String.fromCharCode(65 + focus)}</span>
          </FoldStage>
          {canFold ? <FoldControls {...fold} dark={dark} /> : <p className={`mt-2 text-center text-sm font-black ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>Önce her açınım için tahmin et; sonra katlayarak kontrol edeceksin.</p>}
          {folded && checked && (
            <p className={`mt-2 rounded-xl px-3 py-2 text-center text-sm font-black ${colls[focus].length || !t.items[focus].ok ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
              {t.items[focus].ok ? `${String.fromCharCode(65 + focus)}: kapandı, bu bir ${noun} açınımı.` : colls[focus].length ? `${String.fromCharCode(65 + focus)}: iki yüz üst üste geldi, ${noun} olmadı.` : `${String.fromCharCode(65 + focus)}: yüzler birbirine uymadı, boşluk kaldı.`}
            </p>
          )}
        </>
      }
      panel={
        <>
          <Prompt step="Tahmin et, sonra katla">
            {isBox ? <>Hangi açınımlar katlanınca bu <b className="text-pink-700">kutuyu</b> oluşturur?</> : <>Hangi açınımlar katlanınca <b className="text-pink-700">kapalı bir küp</b> olur?</>}
          </Prompt>
          {t.box && <Card dark={dark}><BoxPic a={t.box[0]} b={t.box[1]} c={t.box[2]} dark={dark} /></Card>}
          <div className="grid grid-cols-2 gap-2">
            {t.items.map((it, i) => {
              const ring = checked ? (checked[i] ? 'ring-green-500' : 'ring-amber-500') : focus === i ? 'ring-pink-500' : dark ? 'ring-slate-600' : 'ring-line'
              return (
                <div key={i} className={`rounded-2xl p-2 ring-2 ${ring} ${dark ? 'bg-slate-800' : 'bg-white'}`}>
                  <button type="button" onClick={() => show(i)} className="relative grid h-24 w-full place-items-center rounded-xl" aria-label={`${String.fromCharCode(65 + i)} açınımını göster`}>
                    <span className="absolute top-0 left-0 rounded-md bg-pink-600 px-1.5 text-xs font-black text-white">{String.fromCharCode(65 + i)}</span>
                    {checked && <span className={`absolute top-0 right-0 grid size-6 place-items-center rounded-full text-white ${checked[i] ? 'bg-green-500' : 'bg-amber-500'}`}>{checked[i] ? <Check size={14} strokeWidth={3} /> : '?'}</span>}
                    <NetThumb faces={it.faces} size={88} dark={dark} />
                  </button>
                  <div className="mt-1 grid grid-cols-2 gap-1">
                    <button type="button" disabled={done} onClick={() => setA(i, true)} aria-pressed={ans[i] === true} className={`min-h-12 rounded-xl text-sm font-black ring-1 ${ans[i] === true ? 'bg-pink-600 text-white ring-pink-700' : dark ? 'bg-slate-700 text-slate-100 ring-slate-500' : 'bg-white text-ink ring-line'}`}>Olur</button>
                    <button type="button" disabled={done} onClick={() => setA(i, false)} aria-pressed={ans[i] === false} className={`min-h-12 rounded-xl text-sm font-black ring-1 ${ans[i] === false ? 'bg-slate-700 text-white ring-slate-800' : dark ? 'bg-slate-700 text-slate-100 ring-slate-500' : 'bg-white text-ink ring-line'}`}>Olmaz</button>
                  </div>
                </div>
              )
            })}
          </div>
          {!done && <CheckButton onClick={check} disabled={ans.some((a) => a === null)}>Tahminimi kontrol et</CheckButton>}
          {fb && <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="nets" />}
          {done && <Nudge tone="ok" question={`Hepsi doğru! Kapanan açınımları da katlayıp izle: ${isBox ? 'karşılıklı yüzler eş mi?' : 'hangi kareler karşılıklı geliyor?'}`} />}
          {done && <StrategyPicker question="Nasıl karar verdin?" options={['Kafamda katladım', 'Üst üste gelen yüzleri aradım', isBox ? 'Yüzlerin boyutlarını karşılaştırdım' : 'Bildiğim açınımlara benzettim', 'Önce tahmin, sonra deneme']} onPick={() => {}} />}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 3. karşılıklı yüzler ───────────────────────── */

const shareEdge = (a: P2, b: P2) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1

function OppositeTask({ t, dark, footer, onSolved }: { t: Extract<Task, { kind: 'opposite' }> } & Common) {
  const built = useMemo(() => cellFaces(t.cells, (i) => (t.colors ? FACE_COLORS[i % 6] : cubeColor(dark))), [t.cells, t.colors, dark])
  const prep = useMemo(() => prepare(built.faces), [built])
  const opp = useMemo(() => opposites(prep), [prep])
  const star = built.faceOfCell[t.star]
  const [picked, setPicked] = useState<number | null>(null)
  const [res, setRes] = useState<boolean | null>(null)
  const [done, setDone] = useState(false)
  const fold = useFold()
  const chk = useChecks()
  const colorName = t.colors ? COLOR_NAMES[t.star % 6] : ''

  const tap = (i: number) => {
    if (done || fold.t > 0.01 || i === star) return
    setPicked(i)
    setRes(null)
  }
  const test = () => {
    if (picked === null) return
    fold.animateTo(1, () => {
      const ok = opp[star] === picked
      setRes(ok)
      if (ok) {
        setDone(true)
        onSolved(chk.pass())
      } else chk.fail()
    })
  }
  const retry = () => {
    fold.animateTo(0)
    setRes(null)
    setPicked(null)
  }
  const marks: Record<number, Mark> = { [star]: 'star' }
  if (picked !== null) marks[picked] = res === null ? 'pick' : res ? 'ok' : 'bad'
  const adjacent = picked !== null && shareEdge(prep.faces[star].cell!, prep.faces[picked].cell!)
  return (
    <Split
      work={
        <>
          <FoldStage prep={prep} t={fold.t} dark={dark} marks={marks} onFaceTap={tap} />
          {done && <FoldControls {...fold} dark={dark} />}
        </>
      }
      panel={
        <>
          <Prompt step="Dokun, sonra katla">
            {t.colors ? <>Küp katlanınca <b style={{ color: FACE_COLORS[t.star % 6] }} className="[text-shadow:0_0_1px_#0005]">{colorName.toLocaleLowerCase('tr')}</b> ★ yüzün tam <b>karşısına</b> hangi yüz gelir?</> : <>Küp katlanınca <b className="text-pink-700">★ yüzün</b> tam <b>karşısına</b> hangi yüz gelir?</>}
          </Prompt>
          <Card dark={dark}><p className="text-sm font-bold">Tahmin ettiğin yüze dokun (mavi çerçeve). Sonra katlayıp ★ ile karşı karşıya gelip gelmediğine bak.</p></Card>
          {!done && res === null && <CheckButton onClick={test} disabled={picked === null || fold.moving}>Katla ve kontrol et</CheckButton>}
          {res === false && (
            <>
              <Nudge
                key={chk.tries}
                question={adjacent ? 'Seçtiğin yüz ★ yüzle bir kenarı paylaşıyor. Kenarları birleşik iki kare katlanınca yan yana mı kalır, karşı karşıya mı gelir?' : 'Seçtiğin yüz ★ yüzün yanına geldi. Sahneyi çevirip bak: ★ yüzün tam karşısındaki yüz hangisi? Açıp tekrar dene.'}
                misconception={adjacent ? 'Küpte komşu (kenar paylaşan) yüzleri karşılıklı sandı' : undefined}
                tool="nets"
              />
              <GhostButton onClick={retry} dark={dark}><RotateCcw size={18} />Aç ve tekrar seç</GhostButton>
            </>
          )}
          {done && <Nudge tone="ok" question="Evet! Bu iki yüz katlanınca karşı karşıya geldi. Açınımda bu iki yüz yan yana mı? Aralarında kaç kare var?" />}
          {done && <StrategyPicker options={['Bir kare atlayarak saydım', 'Kafamda katladım', 'Komşu yüzleri eledim', 'Deneyerek buldum']} onPick={() => {}} />}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 4. zar ───────────────────────── */

function DiceTask({ t, grade, dark, footer, onSolved, sol }: { t: Extract<Task, { kind: 'dice' }> } & Common) {
  const prep = useMemo(() => prepare(cellFaces(t.cells, () => (dark ? '#f8fafc' : '#ffffff')).faces), [t.cells, dark])
  const opp = useMemo(() => opposites(prep), [prep])
  /** verilen sayılar: karşılıklı olmayan yüzlere 1, 2 (ve 3) */
  const given = useMemo(() => {
    const g: Record<number, number> = {}
    const order = [0, 1, 2, 3, 4, 5].sort((a, b) => ((a * 7 + 3) % 6) - ((b * 7 + 3) % 6))
    let n = 1
    for (const i of order) {
      if (n > t.given) break
      if (Object.keys(g).some((k) => opp[Number(k)] === i)) continue
      g[i] = n++
    }
    return g
  }, [opp, t.given])
  const [nums, setNums] = useState<Record<number, number>>(given)
  const [chip, setChip] = useState<number | null>(null)
  const [bad, setBad] = useState<[number, number] | null>(null)
  const [ok, setOk] = useState(false)
  const [solvedOnce, setSolvedOnce] = useState(false)
  const [mine, setMine] = useState<string[]>([])
  const fold = useFold()
  const chk = useChecks()
  const free = [1, 2, 3, 4, 5, 6].filter((n) => !Object.values(given).includes(n))
  const placed = Object.keys(nums).length

  const tap = (i: number) => {
    if (fold.t > 0.01 || given[i] !== undefined) return
    setBad(null)
    setOk(false)
    setNums((cur) => {
      const nx = { ...cur }
      if (chip !== null) {
        for (const k of Object.keys(nx)) if (nx[Number(k)] === chip) delete nx[Number(k)]
        nx[i] = chip
      } else delete nx[i]
      return nx
    })
    if (chip !== null) {
      const rest = free.filter((n) => n !== chip && !Object.values(nums).includes(n))
      setChip(rest[0] ?? null)
    }
  }
  const test = () => {
    fold.animateTo(1, () => {
      const wrong = [0, 1, 2, 3, 4, 5].find((i) => nums[i] + nums[opp[i]] !== 7)
      if (wrong === undefined) {
        setOk(true)
        const key = [0, 1, 2, 3, 4, 5].map((i) => nums[i]).join('')
        const isNew = !mine.includes(key)
        if (isNew) {
          setMine((m) => [...m, key])
          sol.add(`dice:${key}`, `Zar ${mine.length + 1}`)
        }
        if (!solvedOnce) {
          setSolvedOnce(true)
          onSolved(chk.pass())
        }
      } else {
        chk.fail()
        setBad([wrong, opp[wrong]])
      }
    })
  }
  const reset = () => {
    fold.animateTo(0)
    setNums(given)
    setOk(false)
    setBad(null)
    setChip(free[0])
  }
  const marks: Record<number, Mark> = {}
  Object.keys(given).forEach((k) => (marks[Number(k)] = 'focus'))
  if (bad && fold.t > 0.97) bad.forEach((i) => (marks[i] = 'bad'))
  if (ok && fold.t > 0.97) Object.keys(nums).forEach((k) => (marks[Number(k)] = 'ok'))
  const labels = Object.fromEntries(Object.entries(nums).map(([k, v]) => [Number(k), String(v)]))
  const twoWays = t.given === 2
  return (
    <Split
      work={
        <>
          <FoldStage prep={prep} t={fold.t} dark={dark} marks={marks} labels={labels} onFaceTap={tap} />
          {solvedOnce && <FoldControls {...fold} dark={dark} />}
        </>
      }
      panel={
        <>
          <Prompt step="Zarı tamamla">Bir zarda <b className="text-pink-700">karşılıklı yüzlerin toplamı 7</b>’dir. Eksik sayıları açınıma yerleştir.</Prompt>
          <Card dark={dark}>
            <p className="mb-2 text-sm font-bold">Önce bir sayı seç, sonra yüze dokun. Yanlış yere koyduysan yüze tekrar dokun.</p>
            <div className="flex flex-wrap gap-2">
              {free.map((n) => {
                const used = Object.values(nums).includes(n)
                return (
                  <button key={n} type="button" onClick={() => setChip(chip === n ? null : n)} aria-pressed={chip === n} className={`grid size-14 place-items-center rounded-2xl text-2xl font-black ring-2 transition active:scale-95 ${chip === n ? 'bg-pink-600 text-white ring-pink-800' : used ? 'bg-slate-200 text-slate-500 ring-slate-300' : 'bg-white text-ink ring-line'}`}>
                    {n}
                  </button>
                )
              })}
            </div>
          </Card>
          {!ok && <CheckButton onClick={test} disabled={placed < 6 || fold.moving || fold.t > 0.5}>Katla ve kontrol et</CheckButton>}
          {bad && fold.t > 0.97 && (
            <>
              <Nudge key={chk.tries} question={`${nums[bad[0]]} ile ${nums[bad[1]]} katlanınca karşı karşıya geldi. Toplamları 7 mi? ${ek(nums[bad[0]], 'gen')} karşısına hangi sayı gelmeli?`} tool="nets" />
              <GhostButton onClick={() => { fold.animateTo(0); setBad(null) }} dark={dark}><PackageOpen size={18} />Aç ve düzelt</GhostButton>
            </>
          )}
          {ok && <Nudge tone="ok" question={mine.length >= 2 ? 'İki farklı yerleşim buldun! İkisi de doğru zar: biri diğerinin aynadaki görüntüsü gibi.' : twoWays && grade >= 6 ? 'Doğru zar! Peki 3 ile 4 yer değiştirse yine doğru olur mu? Başka bir yerleşim dene.' : 'Doğru zar! Karşılıklı yüzler: 1–6, 2–5, 3–4.'} />}
          {ok && twoWays && mine.length < 2 && <GhostButton onClick={reset} dark={dark}><RotateCcw size={18} />Başka bir yerleşim dene</GhostButton>}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 5. açınım tasarla ───────────────────────── */

const HINTS = [
  '4 karelik bir sıra dene: üstüne bir, altına bir kare ekle. Üstteki ve alttaki kareyi farklı sütunlara koyarak kaç açınım bulabilirsin? (6 tane var)',
  '3 karelik bir sıra, üstünde 2 kare, altında 1 kare… Merdiven gibi basamaklar da işe yarar.',
  'İki tane 3’lü sıra yan yana kaydırılarak birleşebilir. 2-2-2 merdiveni de unutma!',
]

function BuildTask({ t, dark, footer, onSolved, sol }: { t: Extract<Task, { kind: 'build' }> } & Common) {
  const [cells, setCells] = useState<P2[]>([])
  const [mode, setMode] = useState<'draw' | 'fold'>('draw')
  const [found, setFound] = useState<{ key: string; cells: P2[] }[]>([])
  const [res, setRes] = useState<{ kind: 'new' | 'dup' | 'bad' } | null>(null)
  const [hint, setHint] = useState(-1)
  const fold = useFold()
  const chk = useChecks()
  const track = useTracker()
  const solvedRef = useRef(false)
  const prep = useMemo(() => (cells.length ? prepare(cellFaces(cells, () => cubeColor(dark)).faces) : null), [cells, dark])
  const coll = useMemo(() => (prep && cells.length === 6 ? collisions(prep) : []), [prep, cells.length])
  const ready = cells.length === 6 && connected(cells)
  const target = t.all ? 11 : t.goal

  const toggle = (p: P2) => {
    setRes(null)
    setCells((cs) => (cs.some((c) => c[0] === p[0] && c[1] === p[1]) ? cs.filter((c) => c[0] !== p[0] || c[1] !== p[1]) : cs.length >= 6 ? cs : [...cs, p]))
  }
  const doFold = () => {
    setMode('fold')
    fold.setT(0)
    fold.animateTo(1, () => {
      if (coll.length) {
        track.attempt(false)
        setRes({ kind: 'bad' })
        return
      }
      const key = canonical(cells)
      if (found.some((f) => f.key === key)) {
        setRes({ kind: 'dup' })
        return
      }
      const nf = [...found, { key, cells }]
      setFound(nf)
      sol.add(`net:${key}`, `Açınım ${nf.length}`)
      setRes({ kind: 'new' })
      if (!solvedRef.current && nf.length >= t.goal) {
        solvedRef.current = true
        onSolved(chk.pass())
      } else track.attempt(true)
    })
  }
  const edit = () => {
    fold.setT(0)
    setMode('draw')
    setRes(null)
  }
  const fresh = () => {
    edit()
    setCells([])
  }
  const status = cells.length < 6 ? `${cells.length} / 6 kare` : !connected(cells) ? 'Kareler kenarlarından birleşmeli' : 'Hazır! Katla.'
  return (
    <Split
      work={
        mode === 'draw' || !prep ? (
          <div className={`rounded-2xl p-3 ${dark ? 'bg-slate-900/50' : 'bg-white/80'}`}>
            <GridBuilder cells={cells} onToggle={toggle} dark={dark} />
            <p className={`mt-2 text-center text-sm font-black ${ready ? 'text-green-600' : dark ? 'text-slate-300' : 'text-ink-soft'}`}>{status}</p>
          </div>
        ) : (
          <>
            <FoldStage key={canonical(cells)} prep={prep} t={fold.t} dark={dark} marks={res?.kind === 'bad' && fold.t > 0.97 ? badMarks(coll) : {}} />
            <FoldControls {...fold} dark={dark} />
          </>
        )
      }
      panel={
        <>
          <Prompt step={t.all ? 'Açık uçlu meydan okuma' : 'Tasarla ve katla'}>
            {t.all ? <>Küpün <b className="text-pink-700">kaç farklı açınımı</b> var? Izgaraya 6 kare çiz, katla, hepsini bul!</> : t.goal === 1 ? <>Izgaraya <b className="text-pink-700">6 kare</b> çizerek kendi küp açınımını tasarla, sonra katla.</> : <>Izgaraya 6 kare çizerek <b className="text-pink-700">{t.goal} farklı</b> küp açınımı tasarla.</>}
          </Prompt>
          {mode === 'draw' ? (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <CheckButton onClick={doFold} disabled={!ready}>Katla</CheckButton>
              <GhostButton onClick={() => { setCells([]); setRes(null) }} dark={dark} disabled={!cells.length}><Eraser size={18} />Sil</GhostButton>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <GhostButton onClick={edit} dark={dark} disabled={fold.moving}><Pencil size={18} />Düzenle</GhostButton>
              <GhostButton onClick={fresh} dark={dark} disabled={fold.moving}><Sparkles size={18} />Yeni açınım</GhostButton>
            </div>
          )}
          {res?.kind === 'bad' && <Nudge key={`b${chk.tries}${cells.join()}`} question="Kırmızı parlayan iki kare aynı yere geldi, küpün bir yüzü açık kaldı. Hangi kareyi başka bir kenara taşırsan açık yüz kapanır?" misconception={found.length === 0 ? MIS_ALL6 : undefined} tool="nets" />}
          {res?.kind === 'dup' && <Nudge question="Bu açınımı zaten bulmuştun! Döndürülmüş ya da ters çevrilmiş hâli aynı açınım sayılır. Bambaşka bir dizilim dene." />}
          {res?.kind === 'new' && <Nudge tone="ok" question={found.length >= 11 ? 'İnanılmaz! 11 açınımın hepsini buldun. Küpün başka açınımı yok.' : found.length >= target ? `Harika, ${found.length}. açınım! ${t.all ? 'Devam edebilirsin: toplam 11 tane var.' : 'Hedefe ulaştın. İstersen yeni açınımlar dene.'}` : `Küp kapandı! ${found.length}. açınımı buldun. Şimdi farklı bir tane dene.`} />}
          <Card dark={dark}>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-black"><Sparkles size={16} className="text-amber-500" />Bulduğun açınımlar: {found.length}{t.all ? ' / 11' : ` / ${t.goal}`}</p>
            <div className={`grid gap-1.5 ${t.all ? 'grid-cols-6' : 'grid-cols-4'}`}>
              {Array.from({ length: Math.max(target, found.length) }, (_, i) => (
                <div key={i} className={`grid aspect-square place-items-center rounded-lg p-1 ${found[i] ? (dark ? 'bg-slate-700' : 'bg-pink-50') : `border-2 border-dashed ${dark ? 'border-slate-600' : 'border-slate-300'}`}`}>
                  {found[i] && <NetThumb faces={cellFaces(found[i].cells, () => cubeColor(dark)).faces} size={48} dark={dark} />}
                </div>
              ))}
            </div>
          </Card>
          {t.all && hint < HINTS.length - 1 && (
            <GhostButton onClick={() => { setHint(hint + 1); track.hint() }} dark={dark}><Lightbulb size={18} />İpucu</GhostButton>
          )}
          {hint >= 0 && <Card dark={dark}><p className="text-sm font-bold">{HINTS[hint]}</p></Card>}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 6. kutunun yüzey alanı ───────────────────────── */

function BoxSATask({ t, dark, footer, onSolved }: { t: Extract<Task, { kind: 'boxsa' }> } & Common) {
  const { a, b, c } = t
  const prep = useMemo(() => prepare(boxFaces(a, b, c, { pairs: true, labels: true })), [a, b, c])
  const fold = useFold()
  const [val, setVal] = useState('')
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const chk = useChecks()
  const ans = 2 * (a * b + a * c + b * c)
  const check = () => {
    const v = parseNum(val)
    if (v === ans) {
      setFb({ ok: true, text: `Evet! 2·(${a}·${b}) + 2·(${a}·${c}) + 2·(${b}·${c}) = ${2 * a * b} + ${2 * a * c} + ${2 * b * c} = ${ans} cm². Karşılıklı yüzler eş olduğu için her alanı ikişer saydık.` })
      onSolved(chk.pass())
      return
    }
    chk.fail()
    if (v === a * b * c) setFb({ ok: false, text: `${a}·${b}·${c} kutunun içini dolduran birim küplerin sayısıdır (hacim). Kutuyu dıştan kaplamak için hangi yüzlerin alanlarına ihtiyacın var?`, mis: 'Yüzey alanı yerine hacmi hesapladı' })
    else if (v === a * b + a * c + b * c) setFb({ ok: false, text: 'Açınımda kaç dikdörtgen var? Her renkten kaç tane görüyorsun? Hepsini saydın mı?', mis: 'Yüzey alanında karşılıklı yüzleri bir kez saydı (3 yüz)' })
    else if (v === 6 * a * b || v === 6 * Math.max(a * b, a * c, b * c)) setFb({ ok: false, text: 'Bütün yüzler aynı büyüklükte mi? Aynı renkli yüzlerin boyutlarına bak: üç farklı dikdörtgen var.', mis: 'Prizmanın tüm yüzlerini eş sandı' })
    else setFb({ ok: false, text: 'Açınımdaki her dikdörtgenin alanını bul (en × boy). Aynı renkli yüzler eş: kaç farklı alan var, her birinden kaç tane?' })
  }
  return (
    <Split
      work={
        <>
          <FoldStage prep={prep} t={fold.t} dark={dark} />
          <FoldControls {...fold} dark={dark} />
        </>
      }
      panel={
        <>
          <Prompt step="Problem">Bir hediye kutusunun açınımı: ölçüler cm. Kutunun dışını tamamen kaplamak için <b className="text-pink-700">kaç cm² kâğıt</b> gerekir?</Prompt>
          <Card dark={dark}><p className="text-sm font-bold">Kutu {a} cm × {b} cm × {c} cm. Katlayıp aynı renkli yüzlerin nereye gittiğine bak.</p></Card>
          <NumPad value={val} onChange={(v) => { setVal(v); setFb(null) }} unit="cm²" label="Yüzey alanı" disabled={fb?.ok} max={4} />
          {!fb?.ok && <CheckButton onClick={check} disabled={!val}>Kontrol et</CheckButton>}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="nets" />)}
          {fb?.ok && <StrategyPicker options={['Altı yüzü tek tek topladım', 'Eş yüzleri ikişer saydım', '2·(ab + ac + bc) kullandım']} onPick={() => {}} />}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 7. hangi cisim? ───────────────────────── */

const SOLID_NAMES: Record<SolidId, string> = { tri: 'Üçgen prizma', pyr: 'Kare piramit', cyl: 'Silindir', cone: 'Koni', box: 'Kare prizma' }
const SOLID_FACTS: Record<SolidId, string> = {
  tri: 'Üçgen prizma: 2 eş üçgen taban + 3 dikdörtgen yan yüz.',
  pyr: 'Kare piramit: 1 kare taban + 4 eş üçgen yan yüz; yan yüzler tepede birleşir.',
  cyl: 'Silindir: 2 eş daire taban + 1 dikdörtgen yan yüz; dikdörtgen tabanın çevresini sarar.',
  cone: 'Koni: 1 daire taban + 1 daire dilimi yan yüz; dilim tepede bir noktada birleşir.',
  box: 'Kare prizma: 2 eş kare taban + 4 eş dikdörtgen yan yüz.',
}
const solidFaces = (s: SolidId): Face[] => (s === 'tri' ? triPrismFaces(2, 3) : s === 'pyr' ? pyramidFaces(2, 2) : s === 'cyl' ? cylinderFaces(1.5, 3, 9) : s === 'cone' ? coneFaces(2, 4) : boxFaces(2, 2, 3, { color: '#86efac' }).map((f, i) => (i === 0 || i === 2 ? { ...f, color: '#a78bfa' } : f)))
const round = (s: SolidId) => s === 'cyl' || s === 'cone'
const pointy = (s: SolidId) => s === 'pyr' || s === 'cone'

function SolidsTask({ t, dark, footer, onSolved }: { t: Extract<Task, { kind: 'solids' }> } & Common) {
  const [j, setJ] = useState(0)
  const cur = t.items[j]
  const prep = useMemo(() => prepare(solidFaces(cur)), [cur])
  const fold = useFold()
  const [guess, setGuess] = useState<SolidId | null>(null)
  const [right, setRight] = useState(false)
  const [fb, setFb] = useState<{ text: string; mis?: string } | null>(null)
  const [allDone, setAllDone] = useState(false)
  const chk = useChecks()
  const lastItem = j === t.items.length - 1

  const choose = (g: SolidId) => {
    if (right || fold.moving) return
    setGuess(g)
    setFb(null)
    const judge = () => {
      if (g === cur) {
        setRight(true)
        if (lastItem) {
          setAllDone(true)
          onSolved(chk.pass())
        }
        return
      }
      chk.fail()
      if (round(cur) !== round(g)) setFb({ text: round(cur) ? 'Açınımda daire var mı? Tabanı daire olan cisimler hangileri?' : 'Bu açınımda hiç daire yok. Daire olmadan yuvarlak bir yüzey oluşabilir mi?', mis: 'Açınımdaki taban şekline bakmadan cisim seçti' })
      else if (pointy(cur) !== pointy(g)) setFb({ text: pointy(cur) ? 'Katlanınca yan yüzler tepede bir noktada birleşti mi? Kaç tane taban var?' : 'Kaç taban var? Katlanınca sivri bir tepe oluştu mu, yoksa iki eş taban karşılıklı mı geldi?', mis: 'Prizma ile piramidi (silindir ile koniyi) karıştırdı' })
      else setFb({ text: 'Tabanın şekline bak: üçgen mi, kare mi? Cismin adı tabanından gelir.' })
    }
    if (fold.t > 0.97) judge()
    else fold.animateTo(1, judge)
  }
  const nextItem = () => {
    setJ(j + 1)
    setGuess(null)
    setRight(false)
    setFb(null)
    fold.setT(0)
  }
  const options: SolidId[] = ['tri', 'box', 'pyr', 'cyl', 'cone']
  return (
    <Split
      work={
        <>
          <FoldStage key={cur} prep={prep} t={fold.t} dark={dark} />
          {(right || fb) && <FoldControls {...fold} dark={dark} />}
        </>
      }
      panel={
        <>
          <Prompt step={`Açınım ${j + 1} / ${t.items.length}`}>Bu açınım katlanınca <b className="text-pink-700">hangi cisim</b> olur? Önce tahmin et — seçince katlanacak.</Prompt>
          <Choices<SolidId> options={options.map((id) => ({ id, label: SOLID_NAMES[id] }))} value={guess} onPick={choose} disabled={right || fold.moving} />
          {fb && !right && <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="nets" />}
          {right && <Nudge tone="ok" question={`Doğru! ${SOLID_FACTS[cur]}`} />}
          {right && !lastItem && <button type="button" onClick={nextItem} className="btn-primary min-h-14 w-full text-lg animate-fade-up">Sıradaki açınım <ArrowRight size={20} /></button>}
          {allDone && footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 8. silindiri sar ───────────────────────── */

function CylinderTask({ t, dark, footer, onSolved }: { t: Extract<Task, { kind: 'cylinder' }> } & Common) {
  const { r, h } = t
  const C = 2 * PI3 * r
  const [w, setW] = useState(2 * r + 2)
  const prep = useMemo(() => prepare(cylinderFaces(r, h, w)), [r, h, w])
  const fold = useFold()
  const [phase, setPhase] = useState<'width' | 'area'>('width')
  const [wfb, setWfb] = useState<{ text: string; mis?: string } | null>(null)
  const [val, setVal] = useState('')
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const chkW = useChecks()
  const chk = useChecks()
  const firstW = useRef(true)
  const test = () => {
    setWfb(null)
    fold.animateTo(1, () => {
      if (w === C) {
        firstW.current = chkW.fails === 0
        setPhase('area')
        return
      }
      chkW.fail()
      const mis = w === 2 * r ? 'Silindirin yan yüz uzunluğunu çap kadar sandı' : w === PI3 * r * r ? 'Yan yüz uzunluğunu taban alanıyla karıştırdı' : undefined
      setWfb({
        text: w < C ? 'Dikdörtgen tabanı tam saramadı, arada boşluk kaldı. Dikdörtgenin uzun kenarı katlanınca dairenin hangi uzunluğunu sarıyor?' : 'Dikdörtgen fazla geldi, kenarları üst üste bindi. Dairenin çevresi kaç cm? (π ≈ 3)',
        mis,
      })
    })
  }
  const ans = 2 * PI3 * r * r + C * h
  const check = () => {
    const v = parseNum(val)
    if (v === ans) {
      setFb({ ok: true, text: `Evet! 2 kapak: 2·(3·${r}·${r}) = ${2 * PI3 * r * r} cm², yan yüz: ${C}·${h} = ${C * h} cm². Toplam ${ans} cm².` })
      const p = chk.pass()
      onSolved(firstW.current && p)
      return
    }
    chk.fail()
    if (v === C * h) setFb({ ok: false, text: 'Yan yüzü buldun. Silindirin kapakları da var: kaç tane, her birinin alanı kaç?', mis: 'Silindirin yüzey alanında taban alanlarını unuttu' })
    else if (v === PI3 * r * r + C * h) setFb({ ok: false, text: 'Açınımda kaç daire var? İkisini de saydın mı?', mis: 'Silindirin yüzey alanında tek taban aldı' })
    else if (v === PI3 * r * r * h) setFb({ ok: false, text: 'πr²h silindirin içini dolduran miktar (hacim). Dışını kaplamak için açınımdaki şekillerin alanlarını topla.', mis: 'Yüzey alanı yerine hacmi hesapladı' })
    else if (v === 2 * PI3 * r * 2 + C * h || v === 2 * C + C * h) setFb({ ok: false, text: 'Dairenin alanı mı, çevresi mi? Daire alanı = π·r·r.', mis: 'Dairenin alanı ile çevresini karıştırdı' })
    else setFb({ ok: false, text: `Açınımda 2 daire ve 1 dikdörtgen var. Dikdörtgen ${C} cm × ${h} cm. Dairenin alanı π·r·r (π ≈ 3).` })
  }
  return (
    <Split
      work={
        <>
          <FoldStage prep={prep} t={fold.t} dark={dark} />
          <FoldControls {...fold} dark={dark} />
        </>
      }
      panel={
        phase === 'width' ? (
          <>
            <Prompt step="1. Uzunluğu ayarla">Kapakların yarıçapı <b>{r} cm</b>, silindirin yüksekliği <b>{h} cm</b>. Yan yüz dikdörtgeni <b className="text-pink-700">kaç cm uzunlukta</b> olmalı ki kapakların çevresini tam sarsın?</Prompt>
            <Card dark={dark}>
              <p className="mb-1 text-sm font-bold">Dikdörtgenin uzunluğu: <b className="text-lg">{w} cm</b> <span className="opacity-70">(π ≈ 3)</span></p>
              <Slider value={w} onChange={(v) => { setW(v); fold.setT(0); setWfb(null) }} min={2 * r} max={10 * r} step={1} format={(v) => `${v}`} label="Dikdörtgenin uzunluğu" dark={dark} />
            </Card>
            <CheckButton onClick={test} disabled={fold.moving}>Sar ve dene</CheckButton>
            {wfb && <Nudge key={chkW.tries} question={wfb.text} misconception={wfb.mis} tool="nets" />}
          </>
        ) : (
          <>
            <Nudge tone="ok" question={`Tam kapandı! Dikdörtgenin uzunluğu dairenin çevresine eşit: 2·π·r ≈ 2·3·${r} = ${C} cm.`} />
            <Prompt step="2. Yüzey alanı">Bu silindirin <b className="text-pink-700">yüzey alanı</b> kaç cm²? (π ≈ 3)</Prompt>
            <NumPad value={val} onChange={(v) => { setVal(v); setFb(null) }} unit="cm²" label="Yüzey alanı" disabled={fb?.ok} max={4} />
            {!fb?.ok && <CheckButton onClick={check} disabled={!val}>Kontrol et</CheckButton>}
            {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="nets" />)}
            {footer}
          </>
        )
      }
    />
  )
}

