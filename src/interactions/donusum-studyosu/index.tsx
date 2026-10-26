import { useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Eye, Lightbulb, RotateCcw, RotateCw } from 'lucide-react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { Scene, SolutionList, StrategyPicker, useSolutions } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { useTracker } from '../../lib/trackerContext'
import { Card, CheckButton, Choices, GhostButton, Header, NextButton, Nudge, Prompt, Split, Stage, pick, rng, useChecks, type Pt } from './ortak'
import { Board, Dot, MirrorLine, MovingCopy, Poly, distToLine, palette, useTfAnim, type BoardApi, type View } from './Board'
import { LETTERS, apply, applyAll, asTranslation, describe, fmtPt, lineGore, lineName, lin, moveWords, num, reflect, ruleOf, sameLabeled, sameSet, samePt, tfKey, translationToSet, type Line, type LineKind, type Tf, type TfKind } from './geo'

/**
 * 52. Geometrik Dönüşüm Stüdyosu (5–8)
 * Öğrenci önce görüntüyü TAHMİN eder (köşeleri ızgarada tek tek işaretler), sonra dönüşüm canlandırılarak gösterilir.
 *  - predict: öteleme / yansıma / (8: döndürme) — görüntünün köşelerini yerleştir, yanılgıya göre soru soran geri bildirim
 *  - find:    A’yı A′’ne taşıyan dönüşümü kur (hayalet şekil, ayna doğrusu, döndürme merkezi); simetrik şekilde birden çok yol
 *  - mirror:  (7) görüntüden aynayı bul; AA′ doğru parçalarının aynaya dik ve ortadan bölündüğünü keşfet
 *  - rule:    (8) sürüklenen P noktası ve tablodan koordinat kuralını keşfet, sonra kuralı yeni bir noktaya uygula
 * Maarif sınırları: 5–7. sınıfta koordinat yok (kareli kâğıt), 8. sınıfta koordinat düzleminde öteleme/yansıma; döndürme meydan okuma.
 */

type Task =
  | { kind: 'predict'; shape: Pt[]; tf: Tf }
  | { kind: 'find'; shape: Pt[]; tf: Tf; allow: TfKind[]; kinds: LineKind[]; goal: number }
  | { kind: 'mirror'; shape: Pt[]; line: Line }
  | { kind: 'rule'; shape: Pt[]; tf: Tf; probe: Pt }

const GRID: View = { xMin: 0, xMax: 14, yMin: 0, yMax: 10 }
const AXES: View = { xMin: -7, xMax: 7, yMin: -6, yMax: 6 }

const TRI: Pt[] = [[0, 0], [3, 0], [0, 2]]
const QUAD: Pt[] = [[0, 0], [3, 0], [2, 2], [0, 3]]
const SLANT: Pt[] = [[0, 0], [3, 1], [1, 4]]
const SLANT2: Pt[] = [[0, 0], [4, 1], [2, 3]]
const TRI3: Pt[] = [[0, 0], [3, 0], [3, 2]]
const HOUSE: Pt[] = [[0, 0], [2, 0], [2, 2], [1, 3], [0, 2]]
const HEX: Pt[] = [[0, 1], [1, 0], [3, 0], [4, 1], [3, 2], [1, 2]]
const at = (s: Pt[], ox: number, oy: number): Pt[] => s.map(([x, y]) => [x + ox, y + oy])

function makeTasks(grade: Grade): Task[] {
  const r = rng(Date.now() % 100000)
  if (grade === 5) {
    return [
      { kind: 'predict', shape: at(TRI, 1, 1), tf: { k: 'T', dx: pick([6, 7, 8], r), dy: pick([1, 2, 3], r) } },
      { kind: 'find', shape: at(QUAD, 1, 6), tf: { k: 'T', dx: pick([6, 7, 8], r), dy: pick([-3, -4, -5], r) }, allow: ['T'], kinds: ['v', 'h'], goal: 1 },
      { kind: 'predict', shape: at(SLANT, 2, 3), tf: { k: 'R', line: { k: 'v', c: pick([6, 7], r) } } },
      { kind: 'predict', shape: at(QUAD, 4, 1), tf: { k: 'R', line: { k: 'h', c: 5 } } },
      { kind: 'find', shape: at(HOUSE, 2, 2), tf: { k: 'T', dx: pick([6, 8], r), dy: 0 }, allow: ['T', 'R'], kinds: ['v', 'h'], goal: 2 },
    ]
  }
  if (grade === 6) {
    return [
      { kind: 'predict', shape: at(QUAD, 8, 5), tf: { k: 'T', dx: -pick([5, 6, 7], r), dy: -pick([2, 3, 4], r) } },
      { kind: 'predict', shape: at(SLANT, 1, 2), tf: { k: 'R', line: { k: 'v', c: pick([5.5, 6], r) } } },
      { kind: 'predict', shape: at(SLANT2, 5, 1), tf: { k: 'R', line: { k: 'h', c: 5 } } },
      { kind: 'find', shape: at(QUAD, 1, 1), tf: { k: 'R', line: { k: 'v', c: pick([6, 7], r) } }, allow: ['T', 'R'], kinds: ['v', 'h'], goal: 1 },
      { kind: 'find', shape: at(HOUSE, 1, 5), tf: { k: 'T', dx: pick([7, 9], r), dy: 0 }, allow: ['T', 'R'], kinds: ['v', 'h'], goal: 2 },
    ]
  }
  if (grade === 7) {
    const c = pick([0, -1], r)
    const mir = pick<{ shape: Pt[]; line: Line }>([
      { shape: at(SLANT, 2, 2), line: { k: 'v', c: 7 } },
      { shape: at(SLANT2, 3, 0), line: { k: 'h', c: 4.5 } },
      { shape: at(TRI3, 7, 1), line: { k: 'd', c: 0 } },
    ], r)
    return [
      { kind: 'predict', shape: at(QUAD, 1, 2), tf: { k: 'R', line: { k: 'v', c: pick([6, 6.5], r) } } },
      { kind: 'predict', shape: at(TRI3, 6, 1), tf: { k: 'R', line: { k: 'd', c } } },
      { kind: 'mirror', ...mir },
      { kind: 'find', shape: at(QUAD, 8, 1), tf: { k: 'R', line: { k: 'h', c: 5 } }, allow: ['T', 'R'], kinds: ['v', 'h', 'd', 'a'], goal: 1 },
      { kind: 'find', shape: at(HOUSE, 2, 3), tf: { k: 'T', dx: pick([6, 8], r), dy: 0 }, allow: ['T', 'R'], kinds: ['v', 'h', 'd', 'a'], goal: 2 },
    ]
  }
  const dx = pick([5, 6], r), dy = -pick([4, 5], r)
  const t2: Tf = { k: 'T', dx: pick([5, 6, 7], r), dy: pick([3, 4, 5], r) }
  const probe = pick<Pt>([[-4, -2], [-5, 0], [-3, -4]], r)
  return [
    { kind: 'predict', shape: at(TRI, -6, 1), tf: { k: 'T', dx, dy } },
    { kind: 'rule', shape: at(SLANT, 1, 1), tf: { k: 'R', line: { k: 'h', c: 0 } }, probe: pick<Pt>([[-4, 3], [-5, 2], [-3, 5]], r) },
    { kind: 'predict', shape: at(QUAD, -6, -5), tf: { k: 'R', line: { k: 'v', c: 0 } } },
    { kind: 'rule', shape: at(TRI, -6, -5), tf: t2, probe },
    { kind: 'predict', shape: at(TRI, 1, 1), tf: { k: 'O', cx: 0, cy: 0, deg: 90 } },
    { kind: 'find', shape: at(HEX, -6, 2), tf: { k: 'T', dx: 6, dy: 0 }, allow: ['T', 'R', 'O'], kinds: ['v', 'h', 'd', 'a'], goal: 3 },
  ]
}

function titleOf(t: Task) {
  if (t.kind === 'predict') return t.tf.k === 'T' ? 'Tahmin et: öteleme' : t.tf.k === 'R' ? 'Tahmin et: yansıma' : 'Meydan okuma: döndürme'
  if (t.kind === 'find') return t.goal > 1 ? 'Kaç farklı yol var?' : 'Hangi dönüşüm?'
  if (t.kind === 'mirror') return 'Aynayı bul'
  return 'Kuralı keşfet'
}

type Ctx = { grade: Grade; dark: boolean; coords: boolean; view: View; footer: ReactNode; onSolved: (first: boolean) => void; sol: ReturnType<typeof useSolutions>; idx: number; askStrategy: boolean }

export default function DonusumStudyosu({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade), [grade])
  // Uçtan uca test için (yalnız geliştirme)
  if (import.meta.env.DEV) (window as unknown as { __donusum?: Task[] }).__donusum = tasks
  const [idx, setIdx] = useState(0)
  const [solved, setSolved] = useState(false)
  const firsts = useRef<boolean[]>([])
  const sol = useSolutions()
  const dark = grade >= 7
  const coords = grade === 8
  const task = tasks[idx]
  const last = idx === tasks.length - 1
  const firstPredictIdx = tasks.findIndex((t) => t.kind === 'predict')

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
    const ways = sol.list.length
    const extra = ways - tasks.filter((t) => t.kind === 'find').length
    onFinish({
      stars: starsFor((f + Math.max(0, extra) * 0.5) / tasks.length),
      summary: `${tasks.length} dönüşüm görevini tamamladın${ways > 1 ? `; şekilleri hedefe ${ways} farklı dönüşümle taşıdın` : ''}.`,
      insight:
        grade <= 6
          ? 'Ötelemede her köşe aynı yöne, aynı miktarda kayar; yansımada her köşe aynaya dik doğrultuda, aynaya eşit uzaklıkta karşıya geçer ve şeklin yönü ters döner. İki dönüşümde de şeklin boyu, açıları ve alanı değişmez.'
          : grade === 7
            ? 'Yansımada bir nokta ile görüntüsünü birleştiren doğru parçası aynaya diktir ve ayna onu tam ortadan böler. Bu yüzden ayna, ön görüntü ile görüntünün “orta dikmesi”dir.'
            : 'Koordinat kuralları hareketin kendisini anlatır: öteleme (x, y) → (x + a, y + b), x eksenine göre yansıma (x, y) → (x, −y), y eksenine göre yansıma (x, y) → (−x, y). Aynı görüntüye bazen farklı dönüşümlerle ulaşılabilir.',
    })
  }

  const ctx: Ctx = { grade, dark, coords, view: coords ? AXES : GRID, footer: solved ? <NextButton last={last} onClick={next} /> : null, onSolved, sol, idx, askStrategy: idx === firstPredictIdx }
  return (
    <Scene grade={grade}>
      <Header emoji="🔁" title={titleOf(task)} idx={idx} total={tasks.length} dark={dark} />
      <TaskView key={idx} task={task} c={ctx} />
    </Scene>
  )
}

function TaskView({ task, c }: { task: Task; c: Ctx }) {
  switch (task.kind) {
    case 'predict': return <PredictTask t={task} c={c} />
    case 'find': return <FindTask t={task} c={c} />
    case 'mirror': return <MirrorTask t={task} c={c} />
    case 'rule': return <RuleTask t={task} c={c} />
  }
}

/* ───────────────────────── ortak parçalar ───────────────────────── */

const clampTo = (v: View, [x, y]: Pt): Pt => [Math.max(v.xMin, Math.min(v.xMax, x)), Math.max(v.yMin, Math.min(v.yMax, y))]
const roundPt = (v: View, p: Pt): Pt => clampTo(v, [Math.round(p[0]), Math.round(p[1])])
const snapHalf = (x: number) => Math.round(x * 2) / 2
/** Köşe sırası saat yönünde mi? (yön: yansımada değişir) */
const orient = (ps: Pt[]) => Math.sign(ps.reduce((s, p, i) => { const q = ps[(i + 1) % ps.length]; return s + p[0] * q[1] - q[0] * p[1] }, 0))
const sfxLetters = (n: number) => LETTERS.slice(0, n).split('')

function Legend({ dark, items }: { dark: boolean; items: { color: string; label: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map((it) => (
        <span key={it.label} className={`inline-flex items-center gap-1.5 text-xs font-extrabold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>
          <span className="inline-block h-3 w-5 rounded-sm" style={{ background: `${it.color}40`, border: `2px ${it.dashed ? 'dashed' : 'solid'} ${it.color}` }} />
          {it.label}
        </span>
      ))}
    </div>
  )
}

function TfMarks({ api, tf, dark }: { api: BoardApi; tf: Tf; dark: boolean }) {
  const pal = palette(dark)
  if (tf.k === 'R') return <MirrorLine api={api} line={tf.line} color={pal.mirror} />
  if (tf.k === 'O') return (
    <g pointerEvents="none">
      <Dot api={api} p={[tf.cx, tf.cy]} color={pal.mirror} r={7} />
      <text x={api.sx(tf.cx) + 10} y={api.sy(tf.cy) - 10} fontSize={13} fontWeight={900} fill={pal.mirror}>merkez</text>
    </g>
  )
  return null
}

function predictText(tf: Tf, coords: boolean): ReactNode {
  if (tf.k === 'T') {
    if (coords) {
      const [a, b] = ruleOf(tf)
      return <>Şekli <b className="whitespace-nowrap text-pink-700">(x, y) → ({a}, {b})</b> kuralına göre ötele.</>
    }
    return <>Şekli <b className="text-pink-700">{moveWords(tf.dx, tf.dy)}</b> ötele.</>
  }
  if (tf.k === 'R') return <>Şekli <b className="text-orange-600">{lineGore(tf.line, coords)}</b> yansıt.</>
  return <>Şekli <b className="text-orange-600">orijin etrafında, saatin tersi yönünde 90°</b> döndür.</>
}

/* ───────────────────────── 1. tahmin et ───────────────────────── */

function diagnosePredict(t: Extract<Task, { kind: 'predict' }>, placed: Pt[], coords: boolean): { text: string; mis?: string } {
  const { shape, tf } = t
  const right = applyAll(tf, shape)
  if (sameSet(placed, right)) return { text: 'Şeklin yeri tam doğru! Peki köşelerin adları? A’nın görüntüsü A′, B’nin görüntüsü B′ olmalı. Hangi köşe hangisinin eşi?', mis: 'Görüntüde köşe eşlemesini karıştırdı' }
  const d = asTranslation(shape, placed)
  if (tf.k === 'T') {
    if (!d) return { text: 'Ötelemede şekil kaymadan önce ve sonra aynı mı kalır? Her köşeyi aynı yöne, aynı miktarda kaydır. A’dan A′’ne ve B’den B′’ne kaçar birim gittin?', mis: 'Ötelemede köşeleri farklı miktarda kaydırdı (şekil bozuldu)' }
    if (d[0] === tf.dy && d[1] === tf.dx && tf.dx !== tf.dy) return { text: 'Şeklin bütün olarak kayması güzel! Yatay (sağa–sola) ve dikey (yukarı–aşağı) adımları karıştırmış olabilir misin? Önce sağa/sola, sonra yukarı/aşağı say.', mis: 'Ötelemede yatay ve dikey adımları karıştırdı' }
    if ((d[0] === -tf.dx && tf.dx !== 0) || (d[1] === -tf.dy && tf.dy !== 0)) return { text: coords ? 'Kuraldaki “+” ve “−” neyi anlatıyor? x büyürse nokta sağa mı gider sola mı? y küçülürse yukarı mı aşağı mı?' : 'Yönleri bir daha oku: sağa mı sola mı, yukarı mı aşağı mı? A köşesinden başlayıp say.', mis: 'Ötelemede yönü ters aldı' }
    return { text: `Şekli bütün olarak kaydırman çok iyi! Ama ${coords ? 'kurala göre' : 'yönergeye göre'} kaç birim? A köşesinden başla: sağa/sola kaç kare, yukarı/aşağı kaç kare saydın?` }
  }
  if (tf.k === 'R') {
    if (d) return { text: 'Aynaya baktığında sağ elin aynada hangi el gibi görünür? Yansımada şeklin yönü ters döner: aynaya en yakın köşe, görüntüde de aynaya en yakın köşe olur.', mis: 'Yansımayı öteleme gibi yaptı (şeklin yönü korunmuş)' }
    const L = tf.line
    if (L.k === 'd' || L.k === 'a') {
      const alt: Line[] = [{ k: 'v', c: Math.round(shape[0][0]) }, { k: 'h', c: Math.round(shape[0][1]) }]
      for (let cc = -14; cc <= 28; cc += 0.5) alt.push({ k: 'v', c: cc }, { k: 'h', c: cc })
      if (alt.some((l) => sameLabeled(applyAll({ k: 'R', line: l }, shape), placed))) return { text: 'Ayna çapraz duruyor! Bir köşeden aynaya dik bir yol düşün: bu yol yatay mı, dikey mi, yoksa çapraz mı gider? Ayna kare köşegenlerinden geçiyor; köşegen boyunca say.', mis: 'Çapraz aynada yatay/dikey yansıma yaptı' }
    }
    for (let cc = -14; cc <= 28; cc += 0.5) {
      if (cc === L.c) continue
      if (sameLabeled(applyAll({ k: 'R', line: { k: L.k, c: cc } }, shape), placed)) return { text: 'Şekli ters çevirmen çok doğru! Şimdi uzaklıkları say: A aynadan kaç birim uzakta? A′ de aynanın öbür yanında aynı uzaklıkta mı?', mis: 'Yansımada aynaya uzaklığı korumadı' }
    }
    return { text: 'Yeşil halkalı köşeler doğru. Diğerleri için: köşeden aynaya dik olarak git, aynaya kaç birimde vardığını say ve aynanın öbür yanında aynı sayıda birim daha ilerle.' }
  }
  const opp = applyAll({ ...tf, deg: -tf.deg }, shape)
  if (sameLabeled(opp, placed)) return { text: 'Döndürme güzel, ama hangi yöne? Saatin akrebi hangi yönde döner? “Saatin tersi” onun tam tersidir.', mis: 'Döndürme yönünü karıştırdı' }
  if (d) return { text: 'Şekil kaydı ama dönmedi. Döndürmede şeklin yönü değişir: merkezden A’ya bir ok düşün; ok 90° dönünce nereyi gösterir?', mis: 'Döndürmeyi öteleme gibi yaptı' }
  return { text: 'Merkezden A’ya giden oku düşün: A 2 birim sağdaysa, 90° saatin tersine dönünce 2 birim yukarıda olur. Her köşe için bunu dene.' }
}

function PredictTask({ t, c }: { t: Extract<Task, { kind: 'predict' }>; c: Ctx }) {
  const { dark, coords, view } = c
  const pal = palette(dark)
  const n = t.shape.length
  const right = useMemo(() => applyAll(t.tf, t.shape), [t])
  const [placed, setPlaced] = useState<(Pt | null)[]>(() => Array(n).fill(null))
  const [active, setActive] = useState(0)
  const [checked, setChecked] = useState(false)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const [done, setDone] = useState(false)
  const [run, setRun] = useState(0)
  const [strat, setStrat] = useState(false)
  const anim = useTfAnim(run)
  const chk = useChecks()
  const drag = useRef<number | null>(null)
  const all = placed.every(Boolean)

  const put = (i: number, q: Pt) => {
    setPlaced((ps) => ps.map((p, j) => (j === i ? q : p)))
    setChecked(false)
    setFb(null)
  }
  const onTap = (p: Pt) => {
    if (done) return
    const q = roundPt(view, p)
    const hit = placed.findIndex((x) => x && samePt(x, q))
    if (hit >= 0 && hit !== active) return setActive(hit)
    put(active, q)
    const nx = placed.findIndex((x, j) => !x && j !== active)
    if (nx >= 0) setActive(nx)
  }
  const onDown = (p: Pt) => {
    if (done) return false
    let best = -1, bd = 0.6
    placed.forEach((x, j) => { if (x) { const dd = Math.hypot(x[0] - p[0], x[1] - p[1]); if (dd < bd) { bd = dd; best = j } } })
    drag.current = best >= 0 ? best : null
    if (best >= 0) setActive(best)
    return best >= 0
  }
  const onMove = (p: Pt) => { if (drag.current !== null) put(drag.current, roundPt(view, p)) }

  const check = () => {
    const ps = placed as Pt[]
    setChecked(true)
    if (sameLabeled(ps, right)) {
      const first = chk.pass()
      c.onSolved(first)
      setDone(true)
      setRun((x) => x + 1)
      setFb({ ok: true, text: okText(t.tf, coords, t.shape) })
      return
    }
    chk.fail()
    setFb({ ok: false, ...diagnosePredict(t, ps, coords) })
  }
  const show = () => {
    chk.hint()
    setPlaced(right)
    setDone(true)
    setChecked(true)
    setRun((x) => x + 1)
    c.onSolved(false)
    setFb({ ok: true, text: `İzle: ${okText(t.tf, coords, t.shape)}` })
  }

  return (
    <Split
      work={
        <Stage dark={dark}>
          <Board view={view} coords={coords} dark={dark} onTap={onTap} onDown={onDown} onMove={onMove} onUp={() => (drag.current = null)} label="Dönüşüm tahtası: görüntünün köşelerini işaretle">
            {(api) => (
              <>
                <TfMarks api={api} tf={t.tf} dark={dark} />
                <Poly api={api} pts={t.shape} color={pal.pre} labels />
                {done && anim >= 1 && <Poly api={api} pts={right} color={pal.img} labels prime glow />}
                {done && <MovingCopy api={api} tf={t.tf} pts={t.shape} t={anim} color={pal.pre} />}
                {!done && all && <Poly api={api} pts={placed as Pt[]} color={pal.img} dashed fill={0.1} width={2.5} />}
                {!done && placed.map((p, i) => {
                  if (!p) return null
                  const good = checked && samePt(p, right[i])
                  return (
                    <g key={i}>
                      <Dot api={api} p={p} color={pal.img} r={8} ring={checked ? (good ? pal.ok : pal.warn) : i === active ? pal.img : undefined} />
                      <text x={api.sx(p[0]) + 11} y={api.sy(p[1]) - 10} fontSize={15} fontWeight={900} fill={pal.img} stroke={dark ? '#0f172a' : '#fff'} strokeWidth={3} paintOrder="stroke" pointerEvents="none">{LETTERS[i]}′</text>
                    </g>
                  )
                })}
              </>
            )}
          </Board>
        </Stage>
      }
      panel={
        <>
          <Prompt step={t.tf.k === 'O' ? 'Meydan okuma · önce tahmin' : 'Önce tahmin et'}>
            {predictText(t.tf, coords)} Görüntünün köşelerini ({sfxLetters(n).map((l) => `${l}′`).join(', ')}) ızgarada dokunarak işaretle.
          </Prompt>
          <Card dark={dark}>
            <p className={`mb-2 text-sm font-bold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>Sıradaki köşe vurgulu. Bir köşeyi düzeltmek için ona dokun ya da sürükle.</p>
            <div className="flex flex-wrap gap-2">
              {t.shape.map((p, i) => (
                <button key={i} type="button" disabled={done} onClick={() => setActive(i)} aria-pressed={i === active}
                  className={`min-h-12 rounded-xl px-3 text-left text-sm font-black ring-2 transition ${i === active && !done ? 'bg-pink-600 text-white ring-pink-700' : dark ? 'bg-slate-700 text-slate-100 ring-slate-600' : 'bg-white text-ink ring-line'}`}>
                  {coords ? <>{LETTERS[i]}{fmtPt(p)} → {LETTERS[i]}′{placed[i] ? fmtPt(placed[i]!) : '(?, ?)'}</> : <>{LETTERS[i]}′ {placed[i] ? '✓' : '?'}</>}
                </button>
              ))}
            </div>
          </Card>
          <Legend dark={dark} items={[{ color: pal.pre, label: 'Ön görüntü' }, { color: pal.img, label: 'Görüntü (senin tahminin)', dashed: true }, ...(t.tf.k !== 'T' ? [{ color: pal.mirror, label: t.tf.k === 'R' ? 'Ayna doğrusu' : 'Döndürme merkezi' }] : [])]} />
          {!done && (
            <div className="flex gap-2">
              <GhostButton dark={dark} onClick={() => { setPlaced(Array(n).fill(null)); setActive(0); setChecked(false); setFb(null) }} disabled={!placed.some(Boolean)}><RotateCcw size={17} />Temizle</GhostButton>
              {chk.fails >= 2 && <GhostButton dark={dark} onClick={show}><Eye size={17} />Göster</GhostButton>}
            </div>
          )}
          {!done && <CheckButton onClick={check} disabled={!all}>Tahminimi kontrol et</CheckButton>}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="donusum" />)}
          {done && c.askStrategy && !strat && (
            <StrategyPicker question="Görüntüyü nasıl buldun?" options={coords ? ['Kuralı her köşeye uyguladım', 'Kareleri saydım', 'Şekli bütün olarak hayal ettim'] : ['Her köşeyi tek tek saydım', 'Şekli bütün olarak hayal ettim', 'Önce bir köşeyi bulup gerisini ona göre yerleştirdim']} onPick={() => setStrat(true)} />
          )}
          {c.footer}
        </>
      }
    />
  )
}

function okText(tf: Tf, coords: boolean, shape: Pt[]) {
  if (tf.k === 'T') {
    const [a, b] = ruleOf(tf)
    return coords ? `Her köşenin x’ine ${num(tf.dx)}, y’sine ${num(tf.dy)} eklendi: (x, y) → (${a}, ${b}). Şeklin boyu, açıları ve yönü değişti mi?` : `Her köşe ${moveWords(tf.dx, tf.dy)} kaydı. Şeklin boyu ya da yönü değişti mi? Hayır — yalnızca yeri değişti.`
  }
  if (tf.k === 'R') {
    const flip = orient(shape) !== orient(applyAll(tf, shape))
    const [a, b] = ruleOf(tf)
    return coords ? `Her köşe aynaya eşit uzaklıkta karşıya geçti: (x, y) → (${a}, ${b}). Hangi koordinat aynı kaldı, hangisinin işareti değişti?` : `Her köşe aynaya dik doğrultuda, aynaya eşit uzaklıkta karşıya geçti.${flip ? ' Şeklin yönü de ters döndü: ön görüntüde A → B → C sırası bir yöne dönüyorsa görüntüde öbür yöne döner.' : ''}`
  }
  const [a, b] = ruleOf(tf)
  return `Her köşe merkez etrafında 90° döndü ve merkeze uzaklığı değişmedi. Kural: (x, y) → (${a}, ${b}).`
}

/* ───────────────────────── 2. dönüşümü bul ───────────────────────── */

const MODE_NAME: Record<TfKind, string> = { T: 'Öteleme', R: 'Yansıma', O: 'Döndürme' }
const KIND_NAME: Record<LineKind, string> = { v: 'Dikey', h: 'Yatay', d: 'Çapraz ↗', a: 'Çapraz ↖' }

function possibleKinds(shape: Pt[], target: Pt[], v: View): Set<TfKind> {
  const s = new Set<TfKind>()
  if (translationToSet(shape, target)) s.add('T')
  for (const k of ['v', 'h', 'd', 'a'] as LineKind[])
    for (let cc = -30; cc <= 30; cc += k === 'v' || k === 'h' ? 0.5 : 1)
      if (sameSet(applyAll({ k: 'R', line: { k, c: cc } }, shape), target)) s.add('R')
  for (let x = v.xMin; x <= v.xMax; x += 0.5)
    for (let y = v.yMin; y <= v.yMax; y += 0.5)
      for (const deg of [90, 180, 270]) if (sameSet(applyAll({ k: 'O', cx: x, cy: y, deg }, shape), target)) s.add('O')
  return s
}

const lineThrough = (k: LineKind, p: Pt): Line => (k === 'v' ? { k, c: snapHalf(p[0]) } : k === 'h' ? { k, c: snapHalf(p[1]) } : k === 'd' ? { k, c: Math.round(p[1] - p[0]) } : { k, c: Math.round(p[1] + p[0]) })
const insidePoly = (ps: Pt[], [x, y]: Pt) => {
  let ins = false
  for (let i = 0, j = ps.length - 1; i < ps.length; j = i++) {
    const [xi, yi] = ps[i], [xj, yj] = ps[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins
  }
  return ins
}

function FindTask({ t, c }: { t: Extract<Task, { kind: 'find' }>; c: Ctx }) {
  const { dark, coords, view, sol, idx } = c
  const pal = palette(dark)
  const target = useMemo(() => applyAll(t.tf, t.shape), [t])
  const possible = useMemo(() => possibleKinds(t.shape, target, view), [t, target, view])
  const midX = Math.round((view.xMin + view.xMax) / 2), midY = Math.round((view.yMin + view.yMax) / 2)
  const [mode, setMode] = useState<TfKind>(t.allow[0])
  const [d, setD] = useState<Pt>([0, 0])
  const [line, setLine] = useState<Line>({ k: 'v', c: midX })
  const [center, setCenter] = useState<Pt>(coords ? [0, 0] : [midX, midY])
  const [deg, setDeg] = useState(90)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [found, setFound] = useState(0)
  const chk = useChecks()
  const track = useTracker()
  const drag = useRef<{ what: 'ghost' | 'line' | 'center'; p0: Pt; d0: Pt } | null>(null)
  const twist = useRef(0)

  const tf: Tf = mode === 'T' ? { k: 'T', dx: d[0], dy: d[1] } : mode === 'R' ? { k: 'R', line } : { k: 'O', cx: center[0], cy: center[1], deg }
  const ghost = applyAll(tf, t.shape)
  const clear = () => { setFb(null); setHint(null) }

  const onDown = (p: Pt) => {
    if (mode === 'T' && (insidePoly(ghost, p) || ghost.some((g) => Math.hypot(g[0] - p[0], g[1] - p[1]) < 0.8))) {
      drag.current = { what: 'ghost', p0: p, d0: d }
      return true
    }
    if (mode === 'R' && distToLine(line, p) < 0.8) {
      drag.current = { what: 'line', p0: p, d0: [0, 0] }
      return true
    }
    if (mode === 'O' && Math.hypot(center[0] - p[0], center[1] - p[1]) < 0.9) {
      drag.current = { what: 'center', p0: p, d0: center }
      return true
    }
    return false
  }
  const onMove = (p: Pt) => {
    const g = drag.current
    if (!g) return
    clear()
    if (g.what === 'ghost') setD([Math.round(g.d0[0] + p[0] - g.p0[0]), Math.round(g.d0[1] + p[1] - g.p0[1])])
    else if (g.what === 'line') setLine(lineThrough(line.k, p))
    else setCenter(clampTo(view, [snapHalf(p[0]), snapHalf(p[1])]))
  }
  const onTap = (p: Pt) => {
    clear()
    if (mode === 'R') setLine(lineThrough(line.k, p))
    if (mode === 'O') setCenter(clampTo(view, [snapHalf(p[0]), snapHalf(p[1])]))
  }
  const onTwist = mode === 'O' ? (a: number) => {
    twist.current += a
    if (Math.abs(twist.current) >= 45) {
      const s = twist.current > 0 ? -90 : 90
      twist.current = 0
      clear()
      setDeg((x) => ((x + s) % 360 + 360) % 360 || 360)
    }
  } : undefined

  const check = () => {
    setHint(null)
    if (sameSet(ghost, target)) {
      const label = describe(tf, coords)
      const isNew = sol.add(`${idx}|${tfKey(tf)}`, label.replace(/^[^:]+: /, `${MODE_NAME[tf.k]}: `))
      if (found === 0) {
        const first = chk.pass()
        c.onSolved(first)
      }
      if (isNew) {
        const k = found + 1
        setFound(k)
        const more = t.goal > 1 && k < t.goal
        setFb({ ok: true, text: `Buldun: ${label}.${more ? ` Aynı hedefe başka bir dönüşümle de ulaşabilir misin? (${k}/${t.goal}) ${k === 1 ? 'Şekle dikkatle bak: kendi içinde simetrik mi?' : ''}` : t.goal > 1 ? ' Harika, hedefe farklı yollardan ulaştın! Neden mümkün oldu? Şeklin simetrisini düşün.' : ''}` })
      } else setFb({ ok: true, text: 'Bu dönüşümü zaten buldun. Farklı bir dönüşüm türü ya da farklı bir ayna dene!' })
      return
    }
    if (found === 0) chk.fail()
    else track.attempt(false)
    if (!possible.has(mode)) {
      const flipped = mode === 'T' || mode === 'O'
      setFb({ ok: false, text: flipped ? 'Hedefteki şekil, ilk şekle göre ters dönmüş görünüyor mu? Köşelerin sırasına bak. Kaydırmak ya da döndürmek bir şeklin yönünü ters çevirebilir mi?' : 'Hedefteki şekil ilk şekille aynı yöne mi bakıyor? Yansıma şeklin yönünü ters çevirir. Hangi dönüşüm yönü korur?', mis: flipped ? 'Yönü ters dönmüş şekli öteleme/döndürme ile eşlemeye çalıştı' : 'Yönü korunmuş şekli yansıma ile eşlemeye çalıştı' })
      return
    }
    if (mode === 'T') setFb({ ok: false, text: 'Hayalet şekil ile hedefin aynı köşelerini karşılaştır: aralarında kaç birim yatay, kaç birim dikey fark var?' })
    else if (mode === 'R') setFb({ ok: false, text: 'Aynaya göre her köşenin görüntüsü, aynadan aynı uzaklıkta olmalı. Ön görüntü ile hedefin tam ortası nerede? Ayna oradan geçmeli.' })
    else setFb({ ok: false, text: 'Döndürme merkezi neresi olmalı? Ön görüntüdeki bir köşe ile hedefteki eşi, merkeze eşit uzaklıkta olmalı.' })
  }
  const askHint = () => {
    track.hint()
    setHint(mode === 'T' ? 'A köşesinden başla: hedefteki eşine ulaşmak için kaç birim sağa ya da sola, kaç birim yukarı ya da aşağı gitmek gerekir?' : mode === 'R' ? 'Ön görüntü ile hedef arasındaki boşluğun tam ortası nerede? Hangi yönde bir ayna, şekli hedefe çevirir?' : 'Hedef ters mi duruyor, yan mı yatmış? 180° döndürmede merkez, bir köşe ile eşinin tam ortasıdır.')
  }

  const multi = t.goal > 1
  const mine = sol.list.filter((s) => s.key.startsWith(`${idx}|`))
  const ctl = 'grid size-12 place-items-center rounded-xl ring-1 active:scale-95'
  const ctlCls = `${ctl} ${dark ? 'bg-slate-700 text-white ring-slate-500' : 'bg-white text-ink ring-line'}`
  return (
    <Split
      work={
        <Stage dark={dark}>
          <Board view={view} coords={coords} dark={dark} onTap={onTap} onDown={onDown} onMove={onMove} onUp={() => (drag.current = null)} onTwist={onTwist} label="Dönüşüm tahtası: ön görüntüyü hedefe taşı">
            {(api) => (
              <>
                <Poly api={api} pts={target} color={pal.goal} dashed fill={0.1} />
                <text x={api.sx(Math.max(...target.map((p) => p[0])))} y={api.sy(Math.max(...target.map((p) => p[1]))) - 8} fontSize={13} fontWeight={900} fill={pal.goal} textAnchor="end" pointerEvents="none">hedef</text>
                <Poly api={api} pts={t.shape} color={pal.pre} labels />
                {mode === 'R' && <MirrorLine api={api} line={line} color={pal.mirror} />}
                {mode === 'T' && (d[0] !== 0 || d[1] !== 0) && (
                  <line x1={api.sx(t.shape[0][0])} y1={api.sy(t.shape[0][1])} x2={api.sx(ghost[0][0])} y2={api.sy(ghost[0][1])} stroke={pal.img} strokeWidth={2.5} strokeDasharray="6 5" pointerEvents="none" />
                )}
                <Poly api={api} pts={ghost} color={pal.img} fill={0.28} labels prime width={2.5} />
                {mode === 'O' && <><Dot api={api} p={center} color={pal.mirror} r={9} ring={pal.mirror} /><text x={api.sx(center[0]) + 14} y={api.sy(center[1]) - 12} fontSize={13} fontWeight={900} fill={pal.mirror} pointerEvents="none">merkez</text></>}
              </>
            )}
          </Board>
        </Stage>
      }
      panel={
        <>
          <Prompt step={multi ? `Birden çok yol · ${found}/${t.goal}` : 'Dönüşümü kur'}>
            {multi ? <>Mavi şekli yeşil <b>hedefin</b> üzerine taşıyan dönüşümü bul. Sonra <b>başka bir dönüşüm</b> daha bul!</> : <>Mavi şekli yeşil <b>hedefin</b> üzerine tam oturtan dönüşümü bul.</>}
          </Prompt>
          {t.allow.length > 1 && (
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${t.allow.length}, minmax(0, 1fr))` }}>
              {t.allow.map((m) => <GhostButton key={m} dark={dark} active={mode === m} onClick={() => { setMode(m); clear() }}>{MODE_NAME[m]}</GhostButton>)}
            </div>
          )}
          <Card dark={dark}>
            {mode === 'T' && (
              <div className="flex items-center gap-3">
                <div className="grid grid-cols-3 gap-1">
                  <span />
                  <button type="button" className={ctlCls} onClick={() => { clear(); setD([d[0], d[1] + 1]) }} aria-label="Yukarı"><ArrowUp size={20} /></button>
                  <span />
                  <button type="button" className={ctlCls} onClick={() => { clear(); setD([d[0] - 1, d[1]]) }} aria-label="Sola"><ArrowLeft size={20} /></button>
                  <button type="button" className={`${ctlCls} text-xs font-black`} onClick={() => { clear(); setD([0, 0]) }} aria-label="Sıfırla"><RotateCcw size={16} /></button>
                  <button type="button" className={ctlCls} onClick={() => { clear(); setD([d[0] + 1, d[1]]) }} aria-label="Sağa"><ArrowRight size={20} /></button>
                  <span />
                  <button type="button" className={ctlCls} onClick={() => { clear(); setD([d[0], d[1] - 1]) }} aria-label="Aşağı"><ArrowDown size={20} /></button>
                  <span />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-black uppercase ${dark ? 'text-pink-300' : 'text-pink-700'}`}>{coords ? 'Kural' : 'Kod'}</p>
                  <p className="text-lg leading-snug font-black">{coords ? `(x, y) → (${lin(1, 'x', d[0])}, ${lin(1, 'y', d[1])})` : moveWords(d[0], d[1])}</p>
                  <p className={`mt-1 text-xs font-bold ${dark ? 'text-slate-400' : 'text-ink-soft'}`}>Pembe şekli parmağınla da sürükleyebilirsin.</p>
                </div>
              </div>
            )}
            {mode === 'R' && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {t.kinds.map((k) => <GhostButton key={k} dark={dark} active={line.k === k} onClick={() => { clear(); setLine(lineThrough(k, line.k === 'v' ? [line.c, midY] : line.k === 'h' ? [midX, line.c] : [midX, midY])) }}>{KIND_NAME[k]}</GhostButton>)}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className={ctlCls} onClick={() => { clear(); setLine({ ...line, c: line.c - (line.k === 'v' || line.k === 'h' ? 0.5 : 1) }) }} aria-label="Aynayı geri kaydır">{line.k === 'h' ? <ArrowDown size={20} /> : <ArrowLeft size={20} />}</button>
                  <p className="min-w-0 flex-1 text-center text-base font-black">{coords ? lineName(line, true) : 'Ayna'}</p>
                  <button type="button" className={ctlCls} onClick={() => { clear(); setLine({ ...line, c: line.c + (line.k === 'v' || line.k === 'h' ? 0.5 : 1) }) }} aria-label="Aynayı ileri kaydır">{line.k === 'h' ? <ArrowUp size={20} /> : <ArrowRight size={20} />}</button>
                </div>
                <p className={`text-xs font-bold ${dark ? 'text-slate-400' : 'text-ink-soft'}`}>Aynayı sürükle ya da aynanın geçmesini istediğin yere dokun.</p>
              </div>
            )}
            {mode === 'O' && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {[90, 180, 270].map((a) => <GhostButton key={a} dark={dark} active={deg === a} onClick={() => { clear(); setDeg(a) }}>{a === 90 ? <><RotateCcw size={16} />90°</> : a === 180 ? '180°' : <><RotateCw size={16} />90°</>}</GhostButton>)}
                </div>
                <p className="text-sm font-black">Merkez {fmtPt(center)} · {deg === 270 ? 'saat yönünde 90°' : deg === 180 ? '180°' : 'saatin tersine 90°'}</p>
                <p className={`text-xs font-bold ${dark ? 'text-slate-400' : 'text-ink-soft'}`}>Merkezi taşımak için düzleme dokun ya da sürükle. İki parmakla çevirerek de döndürebilirsin.</p>
              </div>
            )}
          </Card>
          <Legend dark={dark} items={[{ color: pal.pre, label: 'Ön görüntü' }, { color: pal.img, label: 'Senin görüntün' }, { color: pal.goal, label: 'Hedef', dashed: true }]} />
          <div className="flex gap-2">
            <CheckButton onClick={check}>{found ? 'Bu dönüşümü dene' : 'Kontrol et'}</CheckButton>
            {!found && <GhostButton dark={dark} onClick={askHint} className="min-h-14 shrink-0"><Lightbulb size={18} />İpucu</GhostButton>}
          </div>
          {hint && <Nudge question={hint} />}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="donusum" />)}
          {multi && <SolutionList list={mine} goal={t.goal} />}
          {c.footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 3. aynayı bul (7) ───────────────────────── */

function MirrorTask({ t, c }: { t: Extract<Task, { kind: 'mirror' }>; c: Ctx }) {
  const { dark, view } = c
  const pal = palette(dark)
  const image = useMemo(() => t.shape.map((p) => reflect(t.line, p)), [t])
  const midX = Math.round((view.xMin + view.xMax) / 2), midY = Math.round((view.yMin + view.yMax) / 2)
  const [line, setLine] = useState<Line>({ k: t.line.k === 'h' ? 'v' : 'h', c: t.line.k === 'h' ? 3 : 8 })
  const [step, setStep] = useState<1 | 2>(1)
  const [wrong, setWrong] = useState(false)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const [ans, setAns] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const chk = useChecks()
  const drag = useRef(false)
  const clear = () => { setFb(null); setWrong(false) }
  const same = line.k === t.line.k && line.c === t.line.c

  const check1 = () => {
    if (same) {
      setStep(2)
      setFb({ ok: true, text: 'Aynayı buldun! Şimdi her köşeyi görüntüsüyle birleştirdim. Bu doğru parçalarına ve aynaya dikkatle bak.' })
      return
    }
    chk.fail()
    setWrong(true)
    const sameDir = line.k === t.line.k
    setFb(sameDir
      ? { ok: false, text: 'Senin aynana göre görüntü kesikli pembe şekil olurdu. A ile A′ arasında kaç birim var? Ayna bu uzaklığın tam ortasından geçmeli.', mis: 'Aynayı ön görüntü ile görüntünün ortasına yerleştirmedi' }
      : { ok: false, text: 'A ile A′’yü birleştiren yol hangi yönde gidiyor: yatay mı, dikey mi, çapraz mı? Ayna bu yola dik olmalı.', mis: 'Ayna doğrultusunu yanlış seçti' })
  }
  const OPTS = [
    { id: 'dik', label: 'Hepsi aynaya dik ve ayna her birini tam ortadan ikiye bölüyor' },
    { id: 'esit', label: 'Hepsinin uzunluğu eşit' },
    { id: 'paralel', label: 'Hepsi aynaya paralel' },
    { id: 'tek', label: 'Hepsi aynı noktada kesişiyor' },
  ]
  const check2 = (id: string) => {
    setAns(id)
    if (id === 'dik') {
      const first = chk.pass()
      c.onSolved(first)
      setDone(true)
      setFb({ ok: true, text: 'Evet! Bir nokta ile görüntüsünü birleştiren doğru parçası aynaya diktir ve ayna onu ortadan böler. Bu yüzden aynaya “orta dikme” denir. Aynanın üzerindeki her nokta A’ya ve A′’ne eşit uzaklıktadır.' })
      return
    }
    chk.fail()
    if (id === 'esit') setFb({ ok: false, text: 'AA′ ile CC′ uzunluklarını karşılaştır: eşit mi? Aynaya uzak olan köşe ile yakın olan köşe aynı yolu mu gidiyor?', mis: 'Yansımada tüm noktaların aynı miktarda yer değiştirdiğini düşündü' })
    else if (id === 'paralel') setFb({ ok: false, text: 'Doğru parçaları aynayı kesiyor mu? Kesişme yerindeki açıya bak: kaç derece?' })
    else setFb({ ok: false, text: 'Doğru parçaları birbirini kesiyor mu, yoksa birbirine paralel mi duruyor? Aynayı nasıl kesiyorlar?' })
  }

  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  return (
    <Split
      work={
        <Stage dark={dark}>
          <Board view={view} coords={false} dark={dark}
            onTap={(p) => { if (step === 1) { clear(); setLine(lineThrough(line.k, p)) } }}
            onDown={(p) => { drag.current = step === 1 && distToLine(line, p) < 0.8; return drag.current }}
            onMove={(p) => { if (drag.current) { clear(); setLine(lineThrough(line.k, p)) } }}
            onUp={() => (drag.current = false)}
            label="Ön görüntü ile görüntü arasındaki aynayı bul">
            {(api) => (
              <>
                {step === 2 && t.shape.map((p, i) => {
                  const q = image[i], m = mid(p, q)
                  return (
                    <g key={i} pointerEvents="none">
                      <line x1={api.sx(p[0])} y1={api.sy(p[1])} x2={api.sx(q[0])} y2={api.sy(q[1])} stroke={pal.text} strokeOpacity={0.7} strokeWidth={2} strokeDasharray="6 5" />
                      <circle cx={api.sx(m[0])} cy={api.sy(m[1])} r={5} fill={pal.mirror} />
                      {ans && <text x={api.sx(m[0]) + 8} y={api.sy(m[1]) + 18} fontSize={12} fontWeight={900} fill={pal.text}>{LETTERS[i]}{LETTERS[i]}′ = {num(Math.hypot(p[0] - q[0], p[1] - q[1]))}</text>}
                    </g>
                  )
                })}
                <Poly api={api} pts={t.shape} color={pal.pre} labels />
                <Poly api={api} pts={image} color={pal.img} labels prime />
                {wrong && <Poly api={api} pts={t.shape.map((p) => reflect(line, p))} color={pal.img} dashed fill={0.05} width={2} />}
                <MirrorLine api={api} line={step === 2 ? t.line : line} color={pal.mirror} dashed={step === 1} />
              </>
            )}
          </Board>
        </Stage>
      }
      panel={
        <>
          {step === 1 ? (
            <>
              <Prompt step="Aynayı yerleştir">Pembe şekil, mavi şeklin bir aynadaki görüntüsü. <b>Ayna nerede?</b> Turuncu aynayı doğru yere taşı.</Prompt>
              <Card dark={dark}>
                <div className="flex flex-wrap gap-1.5">
                  {(['v', 'h', 'd', 'a'] as LineKind[]).map((k) => <GhostButton key={k} dark={dark} active={line.k === k} onClick={() => { clear(); setLine(lineThrough(k, line.k === 'v' ? [line.c, midY] : line.k === 'h' ? [midX, line.c] : [midX, midY])) }}>{KIND_NAME[k]}</GhostButton>)}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <GhostButton dark={dark} onClick={() => { clear(); setLine({ ...line, c: line.c - (line.k === 'v' || line.k === 'h' ? 0.5 : 1) }) }}>{line.k === 'h' ? <ArrowDown size={20} /> : <ArrowLeft size={20} />}</GhostButton>
                  <p className="flex-1 text-center text-sm font-bold">Sürükle, dokun ya da oklarla kaydır</p>
                  <GhostButton dark={dark} onClick={() => { clear(); setLine({ ...line, c: line.c + (line.k === 'v' || line.k === 'h' ? 0.5 : 1) }) }}>{line.k === 'h' ? <ArrowUp size={20} /> : <ArrowRight size={20} />}</GhostButton>
                </div>
              </Card>
              <CheckButton onClick={check1}>Ayna burada</CheckButton>
            </>
          ) : (
            <>
              <Prompt step="Ne fark ettin?">AA′, BB′ ve CC′ doğru parçaları ile ayna arasında nasıl bir ilişki var?</Prompt>
              <Choices cols={1} options={OPTS} value={ans} disabled={done} onPick={(id) => check2(id)} />
            </>
          )}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="donusum" />)}
          {c.footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 4. kuralı keşfet (8) ───────────────────────── */

function ruleOptions(tf: Tf): [string[], string[]] {
  if (tf.k === 'T') {
    const u = (a: string[]) => [...new Set(a)]
    return [u([lin(1, 'x', tf.dx), lin(1, 'x', -tf.dx), 'x', lin(1, 'x', tf.dy)]), u([lin(1, 'y', tf.dy), lin(1, 'y', -tf.dy), 'y', lin(1, 'y', tf.dx)])]
  }
  return [['x', '−x', 'y', '−y'], ['y', '−y', 'x', '−x']]
}

function RuleTask({ t, c }: { t: Extract<Task, { kind: 'rule' }>; c: Ctx }) {
  const { dark, view } = c
  const pal = palette(dark)
  const image = useMemo(() => applyAll(t.tf, t.shape), [t])
  const truth = ruleOf(t.tf)
  const [opts] = useState(() => ruleOptions(t.tf).map((o) => [...o].sort(() => Math.random() - 0.5)))
  const [P, setP] = useState<Pt>(t.tf.k === 'T' ? [-2, 0] : [3, 3])
  const [a, setA] = useState<string | null>(null)
  const [b, setB] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2>(1)
  const [guess, setGuess] = useState<Pt | null>(null)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const [done, setDone] = useState(false)
  const chk = useChecks()
  const drag = useRef(false)
  const P2 = apply(t.tf, P)
  const qImg = apply(t.tf, t.probe)

  const check1 = () => {
    if (a === truth[0] && b === truth[1]) {
      setStep(2)
      setFb({ ok: true, text: `Kural: (x, y) → (${truth[0]}, ${truth[1]}). Şimdi kuralı hiç görmediğin bir noktaya uygula.` })
      return
    }
    chk.fail()
    if (t.tf.k === 'R') {
      if (a === '−x' && b === 'y') return setFb({ ok: false, text: 'x eksenine göre yansımada noktalar yatay mı, dikey mi hareket ediyor? Tabloya bak: hangi koordinat hiç değişmemiş?', mis: 'x eksenine göre yansımada apsisin işaretini değiştirdi' })
      if (a === 'y' || b === 'x' || a === '−y' || b === '−x') return setFb({ ok: false, text: 'Kuralı tablodaki bir satırda dene: A’nın koordinatlarını yerine koyunca A′ çıkıyor mu? x ile y yer değiştiriyor mu?' })
      return setFb({ ok: false, text: 'Tabloda A ile A′’nü karşılaştır: x aynı mı kaldı? y’ye ne oldu?' })
    }
    const T = t.tf.k === 'T' ? t.tf : { dx: 0, dy: 0 }
    if (a === lin(1, 'x', -T.dx) || b === lin(1, 'y', -T.dy)) return setFb({ ok: false, text: 'A’dan A′’ne giderken şekil sağa mı gitti sola mı, yukarı mı aşağı mı? x büyüdü mü küçüldü mü?', mis: 'Ötelemede yön ile işareti ters ilişkilendirdi' })
    if (a === lin(1, 'x', T.dy) || b === lin(1, 'y', T.dx)) return setFb({ ok: false, text: 'Sağa–sola kayma hangi koordinatı değiştirir: x’i mi, y’yi mi? Tabloda x’ler kaç arttı, y’ler kaç arttı?', mis: 'Öteleme kuralında yatay ve dikey kaymayı karıştırdı' })
    setFb({ ok: false, text: 'Kuralı tablodaki bir satırda dene: A’nın koordinatlarını yerine koyunca A′ çıkıyor mu?' })
  }
  const check2 = () => {
    if (!guess) return
    if (samePt(guess, qImg)) {
      const first = chk.pass()
      c.onSolved(first)
      setDone(true)
      setFb({ ok: true, text: `Doğru: Q${fmtPt(t.probe)} → Q′${fmtPt(qImg)}. Kural, şekli çizmeden de görüntüyü bulmanı sağlıyor!` })
      return
    }
    chk.fail()
    setFb({ ok: false, text: `Kuralı Q’ya uygula: x yerine ${num(t.probe[0])}, y yerine ${num(t.probe[1])} koy. (${truth[0]}, ${truth[1]}) kaç eder?`, mis: samePt(guess, [t.probe[0], -t.probe[1]]) || samePt(guess, [-t.probe[0], t.probe[1]]) ? 'Kuralı uygularken yanlış koordinatın işaretini değiştirdi' : undefined })
  }

  const rows: { n: string; p: Pt; q: Pt; live?: boolean }[] = [...t.shape.map((p, i) => ({ n: LETTERS[i], p, q: image[i] })), { n: 'P', p: P, q: P2, live: true }]
  const slot = (v: string | null) => <span className={`inline-block min-w-14 rounded-lg px-2 text-center ${v ? 'bg-pink-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{v ?? '?'}</span>
  return (
    <Split
      work={
        <Stage dark={dark}>
          <Board view={view} coords dark={dark}
            onTap={(p) => {
              if (done) return
              if (step === 1) setP(roundPt(view, p))
              else { setGuess(roundPt(view, p)); setFb(null) }
            }}
            onDown={(p) => { drag.current = step === 1 && Math.hypot(P[0] - p[0], P[1] - p[1]) < 0.9; return drag.current }}
            onMove={(p) => { if (drag.current) setP(roundPt(view, p)) }}
            onUp={() => (drag.current = false)}
            label="Koordinat düzlemi: P noktasını sürükle, görüntüsünü izle">
            {(api) => (
              <>
                <TfMarks api={api} tf={t.tf} dark={dark} />
                <Poly api={api} pts={t.shape} color={pal.pre} labels />
                <Poly api={api} pts={image} color={pal.img} labels prime />
                {step === 1 && (
                  <g pointerEvents="none">
                    <line x1={api.sx(P[0])} y1={api.sy(P[1])} x2={api.sx(P2[0])} y2={api.sy(P2[1])} stroke={pal.text} strokeOpacity={0.5} strokeWidth={2} strokeDasharray="5 5" />
                    <Dot api={api} p={P2} color={pal.img} r={7} />
                    <text x={api.sx(P2[0]) + 10} y={api.sy(P2[1]) - 9} fontSize={14} fontWeight={900} fill={pal.img} stroke={dark ? '#0f172a' : '#fff'} strokeWidth={3} paintOrder="stroke">P′</text>
                    <Dot api={api} p={P} color={pal.pre} r={10} ring={pal.pre} />
                    <text x={api.sx(P[0]) + 12} y={api.sy(P[1]) - 12} fontSize={14} fontWeight={900} fill={pal.pre} stroke={dark ? '#0f172a' : '#fff'} strokeWidth={3} paintOrder="stroke">P</text>
                  </g>
                )}
                {step === 2 && (
                  <g pointerEvents="none">
                    <Dot api={api} p={t.probe} color={pal.mirror} r={8} />
                    <text x={api.sx(t.probe[0]) + 11} y={api.sy(t.probe[1]) - 10} fontSize={14} fontWeight={900} fill={pal.mirror} stroke={dark ? '#0f172a' : '#fff'} strokeWidth={3} paintOrder="stroke">Q</text>
                    {guess && <Dot api={api} p={guess} color={pal.img} r={8} ring={done ? pal.ok : undefined} />}
                    {guess && <text x={api.sx(guess[0]) + 11} y={api.sy(guess[1]) - 10} fontSize={14} fontWeight={900} fill={pal.img} stroke={dark ? '#0f172a' : '#fff'} strokeWidth={3} paintOrder="stroke">Q′</text>}
                  </g>
                )}
              </>
            )}
          </Board>
        </Stage>
      }
      panel={
        <>
          {step === 1 ? (
            <Prompt step="Örneklerden kurala">Mavi şekil pembe şekle {t.tf.k === 'T' ? 'ötelendi' : 'yansıtıldı'}. <b>P</b> noktasını sürükle ya da düzleme dokun; P′ nereye gidiyor? Koordinatlardaki değişimi kurala dönüştür.</Prompt>
          ) : (
            <Prompt step="Kuralı uygula">Bu kurala göre <b>Q{fmtPt(t.probe)}</b> noktasının görüntüsü nerede? Düzlemde dokunarak Q′’nü işaretle.</Prompt>
          )}
          <Card dark={dark}>
            <table className="w-full text-center text-[15px] font-black tabular-nums">
              <thead>
                <tr className={dark ? 'text-indigo-300' : 'text-indigo-700'}><th className="py-1 font-black">Nokta</th><th className="font-black">Görüntü</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.n} className={`border-t ${dark ? 'border-slate-600' : 'border-line'} ${r.live ? (dark ? 'bg-slate-700/60' : 'bg-pink-50') : ''}`}>
                    <td className="py-1.5">{r.n}{fmtPt(r.p)}</td>
                    <td className={dark ? 'text-pink-300' : 'text-pink-700'}>{r.n}′{fmtPt(r.q)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {step === 1 && (
            <>
              <Card dark={dark}>
                <p className="mb-2 text-center text-xl font-black">(x, y) → ({slot(a)}, {slot(b)})</p>
                <p className={`mb-1 text-xs font-black uppercase ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>Görüntünün x’i</p>
                <div className="mb-2 grid grid-cols-4 gap-1.5">{opts[0].map((o) => <GhostButton key={o} dark={dark} active={a === o} onClick={() => { setA(o); setFb(null) }}>{o}</GhostButton>)}</div>
                <p className={`mb-1 text-xs font-black uppercase ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>Görüntünün y’si</p>
                <div className="grid grid-cols-4 gap-1.5">{opts[1].map((o) => <GhostButton key={o} dark={dark} active={b === o} onClick={() => { setB(o); setFb(null) }}>{o}</GhostButton>)}</div>
              </Card>
              <CheckButton onClick={check1} disabled={!a || !b}>Kuralı kontrol et</CheckButton>
            </>
          )}
          {step === 2 && !done && <CheckButton onClick={check2} disabled={!guess}>Q′ burada</CheckButton>}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} tool="donusum" />)}
          {c.footer}
        </>
      }
    />
  )
}
