import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, FlipHorizontal2, ImagePlus, Palette, RotateCcw, RotateCw, Shapes, Undo2 } from 'lucide-react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { BigButton, Scene, useAge, useSolutions } from '../../games/kit2'
import { MathText } from '../../components/MathText'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { Card, Derived, fitWidth, Header, Layout, NextButton, Nudge, NumStepper, PickBtn, Prompt, ToolBtn } from '../sekil-insa-et/ortak'
import { AREA, Board, coverage, KIND, MiniPiece, NAME, overlap, piecesIn, placed, SIL, Thumb, trayPieces, viewFor, type BoardState, type Piece, type PieceId } from './engine'

/**
 * 47. Tangram Stüdyosu — rehberli tangram görevleriyle alan ilişkilerine doğru:
 *  1–2: aynı iki parçadan kare, üçgen, paralelkenar → biçim değişir, kapladığı yer değişmez.
 *  3–4: kare = 2 küçük üçgen, orta üçgen = 2, büyük üçgen = 4 (farklı parçalarla kaplayarak), bütün kare = 16.
 *  5–6: parçaların bütün kareye oranı (kesir), birim değişince ölçünün değişmesi.
 *  Son görev: serbest tasarım → alanını küçük üçgen biriminde bul → galeriye ekle.
 */

const C = '#db2777'
const GALLERY_KEY = 'ao-tangram-studyo-galeri'

type Choice = { t: string; ok: boolean; nudge?: string; mis?: string }
type Question = { kind: 'num'; q: string; answer: number; max: number; unit: string; nudge: (v: number) => string; mis?: (v: number) => string | undefined } | { kind: 'choice'; q: string; choices: Choice[] }
type SilTask = { kind: 'sil'; sil: string; pieces: PieceId[]; emoji: string; text: string; need?: number; q?: Question; after?: string }
type DesignTask = { kind: 'design'; emoji: string; text: string; min: number; ask: 'count' | 'area' | 'area2' }
type Task = SilTask | DesignTask

const SIL_NAME: Record<string, string> = { kare2: 'kare', ucgen2: 'üçgen', paralel2: 'paralelkenar', ucgen3: 'büyük üçgen', ucgen5: 'dev üçgen', ev: 'ev', kedi: 'kedi', kayik: 'kayık', balik: 'balık', kare: 'büyük kare', buyukucgen: 'büyük üçgen' }
const ALL7: PieceId[] = ['L1', 'L2', 'M', 'S1', 'S2', 'Q', 'P']
const SMALL5: PieceId[] = ['M', 'S1', 'S2', 'Q', 'P']

const numQ = (q: string, answer: number, max: number, nudge: (v: number) => string, mis?: (v: number) => string | undefined, unit = 'küçük üçgen'): Question => ({ kind: 'num', q, answer, max, unit, nudge, mis })

function tasksFor(grade: Grade): Task[] {
  const kare2: SilTask = { kind: 'sil', sil: 'kare2', pieces: ['S1', 'S2'], emoji: '🟨', text: 'İki küçük üçgeni döndürüp birleştirerek **kareyi** doldur.' }
  const ucgen2: SilTask = { kind: 'sil', sil: 'ucgen2', pieces: ['S1', 'S2'], emoji: '🔺', text: 'Aynı iki küçük üçgenle şimdi **üçgeni** doldur.' }
  const paralel2: SilTask = {
    kind: 'sil',
    sil: 'paralel2',
    pieces: ['S1', 'S2'],
    emoji: '▱',
    text: 'Aynı iki üçgenle **eğik dörtgeni** (paralelkenarı) doldur.',
    q: {
      kind: 'choice',
      q: 'Kareyi, üçgeni ve eğik dörtgeni **aynı iki parçayla** yaptın. Hangisi daha çok yer kaplar?',
      choices: [
        { t: '🟨 Kare', ok: false, nudge: 'Kareyi yaparken kaç parça kullandın? Eğik dörtgende kaç? Parçalar büyüdü mü?', mis: 'Şeklin biçimi değişince kapladığı yerin (alanın) değiştiğini düşündü' },
        { t: '🔺 Üçgen', ok: false, nudge: 'Üçgen daha yüksek görünüyor ama hangi parçalardan yapıldı? Aynı iki üçgen değil mi?', mis: 'Şeklin biçimi değişince kapladığı yerin (alanın) değiştiğini düşündü' },
        { t: '▱ Eğik dörtgen', ok: false, nudge: 'Eğik dörtgen daha uzun görünüyor. Ama içinde kaç küçük üçgen var?', mis: 'Uzun görünen şeklin daha çok yer kapladığını düşündü' },
        { t: '🟰 Hepsi aynı', ok: true },
      ],
    },
    after: 'Üç şekil de aynı iki üçgenden yapıldı: biçim değişti, kapladıkları yer (alan) değişmedi!',
  }
  const ucgen3: SilTask = { kind: 'sil', sil: 'ucgen3', pieces: ['M', 'S1', 'S2'], emoji: '🔶', text: 'Orta üçgen ve iki küçük üçgenle **büyük üçgeni** doldur.' }
  const ucgen5: SilTask = { kind: 'sil', sil: 'ucgen5', pieces: SMALL5, emoji: '🗻', text: 'Beş parçayla **dev üçgeni** doldur.' }
  const ev: SilTask = { kind: 'sil', sil: 'ev', pieces: ALL7, emoji: '🏠', text: 'Yedi parçanın hepsiyle **evi** kur.' }
  const kedi: SilTask = { kind: 'sil', sil: 'kedi', pieces: ALL7, emoji: '🐱', text: 'Yedi parçanın hepsiyle **kediyi** kur.', after: 'Kedi de 7 parçanın hepsinden yapıldı; yani o da 16 küçük üçgen alanında.' }
  const karesq: SilTask = {
    kind: 'sil',
    sil: 'kare2',
    pieces: ['S1', 'S2'],
    emoji: '🟨',
    text: 'Bu gölge, **kare parçanın** gölgesi. Onu iki küçük üçgenle kapla.',
    q: numQ('Kare parça kaç küçük üçgen eder?', 2, 8, (v) => (v < 2 ? 'Gölgeyi kaç küçük üçgen kapladı? Say!' : 'Gölgeyi kapladığın parçaları say. Kare parça bu gölgeye tam oturuyor.')),
  }
  const orta: SilTask = {
    kind: 'sil',
    sil: 'ucgen2',
    pieces: ['S1', 'S2'],
    emoji: '🔺',
    text: 'Bu gölge, **orta üçgenin** gölgesi. Onu iki küçük üçgenle kapla.',
    q: numQ('Orta üçgen kaç küçük üçgen eder?', 2, 8, () => 'Orta üçgenin gölgesini kaç küçük üçgen kapladı?'),
  }
  const Lcover = (need: number, q?: Question): SilTask => ({
    kind: 'sil',
    sil: 'buyukucgen',
    pieces: SMALL5,
    emoji: '🧩',
    need,
    text: `Bu gölge **büyük üçgenin** gölgesi. Onu küçük parçalarla kapla. Sonra **başka parçalarla** yeniden kapla! (${need} farklı yol)`,
    q: q ?? numQ('Büyük üçgen kaç küçük üçgen eder?', 4, 12, (v) => (v === 3 ? 'Üç parçayla kapladın ama parçaların hepsi küçük üçgen değildi. Orta üçgen (ya da kare) kaç küçük üçgen ediyordu?' : 'Kapladığın parçaları küçük üçgenlere çevir: kare = 2, orta üçgen = 2, paralelkenar = 2, küçük üçgen = 1.'), (v) => (v === 3 ? 'Parça sayısını alan sandı (3 parça → 3 birim)' : undefined)),
    after: 'Büyük üçgeni orta üçgen, kare ya da paralelkenar ile iki küçük üçgen kaplar: hepsi 2 + 1 + 1 = 4 küçük üçgen.',
  })
  const kare7: SilTask = {
    kind: 'sil',
    sil: 'kare',
    pieces: ALL7,
    emoji: '⬛',
    text: 'Yedi parçanın hepsiyle **büyük kareyi** kur.',
    q: numQ('Bütün kare kaç küçük üçgen eder?', 16, 32, (v) => (v === 7 ? 'Yedi parça kullandın ama parçalar eş değil. Her parçayı küçük üçgenle ölç: büyük üçgen kaç?' : 'Parça parça topla: 2 büyük üçgen, 1 orta üçgen, 1 kare, 1 paralelkenar, 2 küçük üçgen.'), (v) => (v === 7 ? 'Parça sayısını alan sandı (7 parça → 7 birim)' : undefined)),
  }
  const kayik: SilTask = {
    kind: 'sil',
    sil: 'kayik',
    pieces: ALL7,
    emoji: '⛵',
    text: 'Yedi parçanın hepsiyle **kayığı** kur.',
    q: {
      kind: 'choice',
      q: 'Kayık mı, yedi parçayla yaptığın büyük kare mi daha çok yer kaplar?',
      choices: [
        { t: '⛵ Kayık', ok: false, nudge: 'Kayık daha geniş görünüyor. Peki hangi parçalardan yapıldı? Kareyi yapan parçaların aynısı değil mi?', mis: 'Yayılmış görünen şeklin daha büyük alanlı olduğunu düşündü' },
        { t: '⬛ Kare', ok: false, nudge: 'Kare daha “dolu” görünüyor. İki şekilde de kaç küçük üçgen var?', mis: 'Şeklin biçimi değişince alanın değiştiğini düşündü' },
        { t: '🟰 Eşit', ok: true },
      ],
    },
    after: 'Kayık da kare de aynı 7 parçadan: ikisi de 16 küçük üçgen. Alan, parçaların nasıl dizildiğine bağlı değil.',
  }
  const kare7frac: SilTask = {
    ...kare7,
    q: {
      kind: 'choice',
      q: '**Orta üçgen** büyük karenin kaçta kaçı?',
      choices: [
        { t: '[[1/7]]', ok: false, nudge: 'Kare 7 parçadan oluşuyor ama parçalar eş değil. Orta üçgen kaç küçük üçgen, bütün kare kaç küçük üçgen?', mis: 'Eş olmayan parçaları sayarak kesir yazdı (7 parça → [[1/7]])' },
        { t: '[[1/4]]', ok: false, nudge: 'Karenin [[1/4]]’ü kaç küçük üçgen eder? Orta üçgen o kadar büyük mü?' },
        { t: '[[1/8]]', ok: true },
        { t: '[[1/16]]', ok: false, nudge: '[[1/16]], bir küçük üçgenin payı. Orta üçgen kaç küçük üçgen?' },
      ],
    },
    after: 'Bütün kare 16 küçük üçgen, orta üçgen 2 küçük üçgen: [[2/16]] = [[1/8]]. Büyük üçgen ise [[4/16]] = [[1/4]].',
  }
  const balik: SilTask = {
    kind: 'sil',
    sil: 'balik',
    pieces: ALL7,
    emoji: '🐟',
    text: 'Yedi parçanın hepsiyle **balığı** kur.',
    q: {
      kind: 'choice',
      q: 'Balığın alanı ile büyük karenin alanı için ne söylersin?',
      choices: [
        { t: 'Balık daha büyük', ok: false, nudge: 'Balık daha uzun görünüyor. Kaç küçük üçgenden yapıldı?', mis: 'Yayılmış görünen şeklin daha büyük alanlı olduğunu düşündü' },
        { t: 'Kare daha büyük', ok: false, nudge: 'Karede boşluk yok diye daha büyük mü? İkisinde de aynı parçalar var mı?' },
        { t: 'Eşit: ikisi de 16 küçük üçgen', ok: true },
      ],
    },
  }
  const ucgen5q = (frac: boolean): SilTask => ({
    ...ucgen5,
    q: frac
      ? { kind: 'choice', q: 'Dev üçgen, 7 parçalı büyük karenin kaçta kaçı?', choices: [
          { t: '[[5/7]]', ok: false, nudge: '5 parça / 7 parça… ama parçalar eş mi? Küçük üçgenle ölç.', mis: 'Eş olmayan parçaları sayarak kesir yazdı ([[5/7]])' },
          { t: '[[1/2]]', ok: true },
          { t: '[[1/4]]', ok: false, nudge: 'Dev üçgen kaç küçük üçgen? Bütün kare 16 küçük üçgen.' },
        ] }
      : numQ('Dev üçgen kaç küçük üçgen eder?', 8, 20, (v) => (v === 5 ? 'Beş parça kullandın, ama parçaların hepsi küçük üçgen değil. Kare kaç küçük üçgen ediyordu?' : 'Parçaları küçük üçgene çevirip topla: orta 2, kare 2, paralelkenar 2, küçük üçgenler 1 + 1.'), (v) => (v === 5 ? 'Parça sayısını alan sandı (5 parça → 5 birim)' : undefined)),
    after: frac ? 'Dev üçgen 8 küçük üçgen, kare 16: [[8/16]] = [[1/2]]. İki büyük üçgen de karenin öbür yarısı!' : 'Dev üçgen = 2 + 1 + 1 + 2 + 2 = 8 küçük üçgen: iki büyük üçgen kadar!',
  })
  const kare7unit: SilTask = {
    ...kare7,
    q: numQ('Bu kez **kare parçayı** 1 birim alalım. Bütün kare kaç birim olur?', 8, 40, (v) => (v === 16 ? 'Birim değişti: artık küçük üçgen değil, kare parça ile ölçüyoruz. Kare parça kaç küçük üçgendi?' : v > 16 ? 'Birim büyüdü. Daha büyük birimle ölçünce sayı artar mı, azalır mı?' : 'Kare parça 2 küçük üçgen. 16 küçük üçgende kaç tane “2 küçük üçgen” var?'), (v) => (v === 16 ? 'Birim değişince ölçünün değişmeyeceğini düşündü' : v > 16 ? 'Büyük birimle ölçünce sayının arttığını düşündü' : undefined), 'kare parça'),
    after: 'Küçük üçgenle 16, kare parçayla 8 birim: birim iki katına çıkınca ölçü yarıya iner.',
  }
  const design = (ask: DesignTask['ask'], min: number): DesignTask => ({
    kind: 'design',
    emoji: '🎨',
    ask,
    min,
    text: ask === 'count' ? `Kendi şeklini tasarla! En az ${min} parça kullan, sonra galeriye ekle.` : `Kendi figürünü tasarla (en az ${min} parça). Sonra figürünün **alanını** küçük üçgen biriminde bul ve galeriye ekle.`,
  })

  if (grade === 1) return [kare2, ucgen2, paralel2, ucgen3, design('count', 2)]
  if (grade === 2) return [kare2, ucgen2, paralel2, ucgen5, ev, design('count', 3)]
  if (grade === 3) return [karesq, orta, Lcover(2), kedi, design('area', 3)]
  if (grade === 4) return [karesq, Lcover(3), kare7, kayik, design('area', 4)]
  if (grade === 5) return [ucgen5q(false), Lcover(3), kare7frac, balik, design('area', 4)]
  return [ucgen5q(true), Lcover(3, { kind: 'choice', q: 'Büyük üçgen, 7 parçalı büyük karenin kaçta kaçı?', choices: [
    { t: '[[1/7]]', ok: false, nudge: '7 parça var ama eş değiller. Büyük üçgen kaç küçük üçgen, kare kaç?', mis: 'Eş olmayan parçaları sayarak kesir yazdı (7 parça → [[1/7]])' },
    { t: '[[1/4]]', ok: true },
    { t: '[[1/3]]', ok: false, nudge: 'Büyük üçgeni 3 parçayla kapladın; ama soru bütün kareye göre. Kare kaç küçük üçgen?', mis: 'Kapladığı parça sayısıyla kesri karıştırdı' },
  ] }), kare7unit, kedi, design('area2', 4)]
}

type GalleryItem = { pieces: Piece[]; area: number; at: number }
const loadGallery = (): GalleryItem[] => {
  try {
    const v = JSON.parse(localStorage.getItem(GALLERY_KEY) ?? '[]')
    return Array.isArray(v) ? v.slice(0, 12) : []
  } catch {
    return []
  }
}
const saveGallery = (g: GalleryItem[]) => {
  try {
    localStorage.setItem(GALLERY_KEY, JSON.stringify(g.slice(0, 12)))
  } catch {
    /* depolama yok */
  }
}

export default function TangramStudyosu({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => tasksFor(grade), [grade])
  const [idx, setIdx] = useState(0)
  const [firsts, setFirsts] = useState<boolean[]>([])
  const [done, setDone] = useState(false)
  const [designs, setDesigns] = useState(0)
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
      summary: `${tasks.length} tangram görevini tamamladın, ${designs} tasarımı galeriye ekledin; ${f} görevi ilk denemede çözdün.`,
      insight:
        grade <= 2
          ? 'Aynı parçalarla farklı şekiller yapılabilir: şekil değişir ama kapladığı yer (alan) aynı kalır.'
          : grade <= 4
            ? 'Küçük üçgen bir alan birimi olabilir: kare, orta üçgen ve paralelkenar 2, büyük üçgen 4 küçük üçgen eder. Yedi parçadan yapılan her şekil 16 küçük üçgendir.'
            : 'Parçaların alanını ortak bir birimle ölçünce kesirler ortaya çıkar (orta üçgen = [[1/8]]); birim değişince ölçü değişir ama alan aynı kalır.',
      stars: f >= tasks.length - 1 ? 3 : f >= tasks.length / 2 ? 2 : 1,
    })
  }
  return (
    <Scene grade={grade}>
      <Header icon={<Shapes size={22} />} color={C} idx={idx} total={tasks.length} title="Tangram Stüdyosu" extra={sol.list.length > 0 ? <span className="chip bg-amber-100 px-3 py-1 text-sm text-amber-900 ring-1 ring-amber-200">✨ {sol.list.length} çözüm</span> : undefined} />
      {task.kind === 'sil' ? (
        <SilRound key={idx} grade={grade} task={task} addSol={(k, l) => sol.add(`${idx}:${k}`, l)} onComplete={complete} footer={done ? <NextButton isLast={isLast} onNext={() => { setIdx((i) => i + 1); setDone(false) }} onFinish={finish} /> : null} />
      ) : (
        <DesignRound key={idx} grade={grade} task={task} onSaved={() => setDesigns((d) => d + 1)} addSol={(k, l) => sol.add(`d:${k}`, l)} onComplete={complete} footer={done ? <NextButton isLast={isLast} onNext={() => { setIdx((i) => i + 1); setDone(false) }} onFinish={finish} /> : null} />
      )}
    </Scene>
  )
}

/** Döndür / çevir düğmeleri */
function PieceTools({ v, set, big }: { v: BoardState; set: (v: BoardState) => void; big: boolean }) {
  const hasP = v.pieces.some((p) => p.id === 'P')
  const sel = v.pieces.find((p) => p.id === v.sel)
  const turn = (d: number) => sel && set({ ...v, pieces: v.pieces.map((p) => (p.id === sel.id ? { ...p, r: (p.r + d + 8) % 8 } : p)) })
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
      <ToolBtn big={big} disabled={!sel} onClick={() => turn(-1)} label="Sola döndür"><RotateCcw size={18} />45°</ToolBtn>
      <ToolBtn big={big} disabled={!sel} onClick={() => turn(1)} label="Sağa döndür"><RotateCw size={18} />45°</ToolBtn>
      {hasP && <ToolBtn big={big} disabled={sel?.id !== 'P'} onClick={() => set({ ...v, pieces: v.pieces.map((p) => (p.id === 'P' ? { ...p, f: !p.f } : p)) })}><FlipHorizontal2 size={18} />Ters çevir</ToolBtn>}
    </div>
  )
}

function Question({ q, onDone, grade }: { q: Question; onDone: (first: boolean) => void; grade: Grade }) {
  const track = useTracker()
  const age = useAge(grade)
  const [val, setVal] = useState<number | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [wrong, setWrong] = useState(0)
  const [nudge, setNudge] = useState<{ q: string; mis?: string; id: number } | null>(null)
  const [ok, setOk] = useState(false)
  const good = (first: boolean) => {
    setOk(true)
    setNudge(null)
    sfx.ok()
    onDone(first)
  }
  const checkNum = () => {
    if (q.kind !== 'num' || val === null) return
    const right = val === q.answer
    track.attempt(right)
    if (right) return good(wrong === 0)
    setWrong((w) => w + 1)
    setNudge({ q: q.nudge(val), mis: q.mis?.(val), id: Date.now() })
  }
  const pick = (i: number) => {
    if (q.kind !== 'choice' || ok) return
    setPicked(i)
    const c = q.choices[i]
    track.attempt(c.ok)
    if (c.ok) return good(wrong === 0)
    setWrong((w) => w + 1)
    setNudge({ q: c.nudge ?? 'Bir daha düşün.', mis: c.mis, id: Date.now() })
  }
  return (
    <Card title="Düşün">
      <p className="mb-3 text-[17px] leading-snug font-extrabold"><Bold text={q.q} /></p>
      {q.kind === 'num' ? (
        <div className="flex flex-wrap items-end justify-center gap-3">
          <NumStepper value={val} onChange={(v) => { setVal(v); setNudge(null) }} min={0} max={q.max} label={q.unit} big={age.big} />
          {!ok && <BigButton onClick={checkNum} disabled={val === null}><Check size={20} />Kontrol</BigButton>}
        </div>
      ) : (
        <div className="grid gap-2">
          {q.choices.map((c, i) => (
            <PickBtn key={i} big={age.big} on={picked === i} color={c.ok && picked === i ? '#16a34a' : C} onClick={() => pick(i)} className="text-left"><MathText text={c.t} /></PickBtn>
          ))}
        </div>
      )}
      {nudge && <Nudge key={nudge.id} question={nudge.q} misconception={nudge.mis} tool="tangram" onClose={() => setNudge(null)} />}
    </Card>
  )
}

function Bold({ text }: { text: string }) {
  return <>{text.split('**').map((t, i) => (i % 2 ? <b key={i} className="font-black text-brand-ink"><MathText text={t} /></b> : <MathText key={i} text={t} />))}</>
}

function SilRound({ grade, task, addSol, onComplete, footer }: { grade: Grade; task: SilTask; addSol: (k: string, l: string) => boolean; onComplete: (first: boolean) => void; footer: ReactNode }) {
  const track = useTracker()
  const age = useAge(grade)
  const need = task.need ?? 1
  const sil = SIL[task.sil]
  const view = viewFor(task.pieces.length)
  const [v, setV] = useState<BoardState>({ pieces: trayPieces(task.pieces), sel: null })
  const [combos, setCombos] = useState<{ key: string; ids: PieceId[] }[]>([])
  const [phase, setPhase] = useState<'build' | 'between' | 'q' | 'done'>('build')
  const [nudge, setNudge] = useState<{ q: string; mis?: string; id: number } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [hinted, setHinted] = useState(false)
  const cov = useMemo(() => coverage(sil, v.pieces), [sil, v.pieces])
  const handled = useRef('')

  useEffect(() => {
    if (phase !== 'build' || !cov.solved) return
    const used = piecesIn(sil, v.pieces).map((p) => p.id).sort() as PieceId[]
    const key = used.map((id) => KIND[id]).sort().join('')
    if (handled.current === key + combos.length) return
    handled.current = key + combos.length
    track.attempt(true)
    if (combos.some((c) => c.key === key)) {
      setNudge({ q: 'Bu parçalarla zaten kapladın! Hangi parçayı kullanmadın? Onunla dene.', id: Date.now() })
      track.hint()
      return
    }
    const label = used.map((id) => NAME[KIND[id]]).join(' + ')
    addSol(key, need > 1 ? label : SIL_NAME[task.sil] ?? task.sil)
    const nc = [...combos, { key, ids: used }]
    setCombos(nc)
    setNudge(null)
    sfx.ok()
    if (nc.length < need) {
      setMsg(`Kapladın: ${label}. Şimdi başka parçalarla kaplayabilir misin?`)
      setPhase('between')
      return
    }
    setMsg(need > 1 ? `${nc.length} farklı yol buldun!` : 'Harika, siluet tam doldu!')
    if (task.q) setPhase('q')
    else {
      setPhase('done')
      track.item(!hinted)
      onComplete(!hinted)
    }
  }, [cov.solved, phase, sil, v.pieces, combos, need, task, addSol, track, hinted, onComplete])

  const again = () => {
    setV({ pieces: trayPieces(task.pieces), sel: null })
    setMsg(null)
    setPhase('build')
  }
  const help = () => {
    setHinted(true)
    track.hint()
    const over = cov.bad > cov.inside * 0.015
    setNudge({
      q: over
        ? 'Bazı parçalar gölgenin dışına taşıyor ya da üst üste biniyor. Hangi parçayı döndürünce gölgeye tam oturur?'
        : task.pieces.length === 2
          ? 'Gölgenin köşelerine bak: küçük üçgenin dik köşesi nereye oturabilir? Parçaya dokunarak döndür.'
          : 'Önce en büyük parçayı yerleştir: gölgenin hangi köşesine tam oturuyor? Sonra kalan boşluğun biçimine bak.',
      id: Date.now(),
    })
  }

  const showAreas = phase === 'done' && (grade >= 3 || !!task.q)
  return (
    <Layout
      top={<Prompt emoji={task.emoji} color={C}>{task.text}</Prompt>}
      work={
        <div>
          <div style={fitWidth(view[2] / view[3], 230)}>
            <Board view={view} value={v} onChange={setV} sil={sil} areas={showAreas} locked={phase !== 'build'} />
          </div>
          {phase === 'build' && <PieceTools v={v} set={setV} big={age.big} />}
          {phase === 'build' && <p className="mt-2 text-center text-sm font-bold text-ink-soft">Parçayı sürükle. Döndürmek için seçili parçaya bir kez daha dokun ya da tutarken ikinci parmakla çevir.</p>}
        </div>
      }
      panel={
        <>
          <Card title="Siluet">
            <div className="h-3 overflow-hidden rounded-full bg-paper ring-1 ring-line">
              <div className="h-full rounded-full bg-ok transition-all" style={{ width: `${Math.round(cov.ratio * 100)}%` }} />
            </div>
            <p className="mt-1.5 text-sm font-bold text-ink-soft">%{Math.round(cov.ratio * 100)} doldu{cov.bad > cov.inside * 0.03 ? ' · bazı parçalar taşıyor' : ''}</p>
            {need > 1 && (
              <div className="mt-2 flex flex-col gap-1.5">
                {Array.from({ length: need }, (_, i) => (
                  <div key={i} className={`flex min-h-10 items-center gap-1.5 rounded-xl px-2 ring-1 ${combos[i] ? 'bg-emerald-50 ring-emerald-200 animate-pop' : 'bg-paper ring-line'}`}>
                    <span className="text-xs font-black text-ink-soft">{i + 1}. yol</span>
                    {combos[i]?.ids.map((id) => <MiniPiece key={id} id={id} h={24} />)}
                  </div>
                ))}
              </div>
            )}
          </Card>
          {nudge && <Nudge key={nudge.id} question={nudge.q} misconception={nudge.mis} tool="tangram" onClose={() => setNudge(null)} />}
          {msg && <Derived>{msg}</Derived>}
          {phase === 'build' && !nudge && <button type="button" onClick={help} className="btn-ghost min-h-12 w-full">💡 Takıldım</button>}
          {phase === 'between' && <BigButton onClick={again} className="w-full"><Undo2 size={20} />Parçaları geri koy</BigButton>}
          {phase === 'q' && task.q && (
            <Question q={task.q} grade={grade} onDone={(first) => { setPhase('done'); const f = first && !hinted; track.item(f); onComplete(f) }} />
          )}
          {phase === 'done' && task.after && <Derived tone="info">{task.after}</Derived>}
          {phase === 'done' && showAreas && <AreaKey />}
          {footer}
        </>
      }
    />
  )
}

function AreaKey() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl bg-ink px-3 py-2.5 text-sm text-white">
      <span className="w-full text-[11px] font-extrabold tracking-wide text-white/60 uppercase">Küçük üçgen = 1 birim</span>
      {(['S1', 'Q', 'P', 'M', 'L1'] as PieceId[]).map((id) => (
        <span key={id} className="flex items-center gap-1 font-black"><MiniPiece id={id} h={22} />{AREA[KIND[id]]}</span>
      ))}
    </div>
  )
}

function DesignRound({ grade, task, onSaved, addSol, onComplete, footer }: { grade: Grade; task: DesignTask; onSaved: () => void; addSol: (k: string, l: string) => boolean; onComplete: (first: boolean) => void; footer: ReactNode }) {
  const track = useTracker()
  const age = useAge(grade)
  const [v, setV] = useState<BoardState>({ pieces: trayPieces(ALL7), sel: null })
  const [phase, setPhase] = useState<'build' | 'ask' | 'ask2' | 'saved'>('build')
  const [val, setVal] = useState<number | null>(null)
  const [wrong, setWrong] = useState(0)
  const [nudge, setNudge] = useState<{ q: string; mis?: string; id: number } | null>(null)
  const [gallery, setGallery] = useState<GalleryItem[]>(loadGallery)
  const [count, setCount] = useState(0)
  const on = useMemo(() => placed(v.pieces), [v.pieces])
  const area = on.reduce((s, p) => s + AREA[KIND[p.id]], 0)
  const ov = useMemo(() => overlap(on), [on])

  const finishDesign = () => {
    if (on.length < task.min) {
      setNudge({ q: `En az ${task.min} parçayı tepsiden yukarıdaki tasarım alanına taşı.`, id: Date.now() })
      return
    }
    if (ov > 0.2) {
      track.attempt(false)
      setNudge({ q: 'Bazı parçalar üst üste binmiş. Üst üste binen parçalar ne kadar yer kaplar? Tangramda parçalar yalnızca kenar kenara değer.', id: Date.now() })
      return
    }
    setNudge(null)
    setVal(null)
    setPhase('ask')
  }
  const target = phase === 'ask' ? (task.ask === 'count' ? on.length : area) : area / 2
  const check = () => {
    if (val === null) return
    const ok = Math.abs(val - target) < 1e-9
    track.attempt(ok)
    if (!ok) {
      setWrong((w) => w + 1)
      const q =
        task.ask === 'count'
          ? 'Tasarımındaki parçalara tek tek dokunur gibi say. Tepside kalanları sayma!'
          : phase === 'ask2'
            ? 'Kare parça 2 küçük üçgen eder. Senin figürün kaç küçük üçgendi? Onun içinde kaç tane “2 küçük üçgen” var?'
            : val === on.length
              ? `${on.length} parça kullandın, ama parçalar eş değil. Her parçayı küçük üçgenle ölç ve topla.`
              : 'Her parça kaç küçük üçgen? Büyük üçgen 4, orta üçgen 2, kare 2, paralelkenar 2, küçük üçgen 1. Tek tek topla.'
      setNudge({ q, mis: task.ask !== 'count' && phase === 'ask' && val === on.length ? 'Parça sayısını alan sandı' : undefined, id: Date.now() })
      return
    }
    setNudge(null)
    sfx.ok()
    if (task.ask === 'area2' && phase === 'ask') {
      setVal(null)
      setPhase('ask2')
      return
    }
    const item: GalleryItem = { pieces: on, area, at: Date.now() }
    const g = [item, ...gallery].slice(0, 12)
    setGallery(g)
    saveGallery(g)
    onSaved()
    setCount((c) => c + 1)
    addSol(on.map((p) => `${p.id}${Math.round(p.x * 10)},${Math.round(p.y * 10)},${p.r}`).join('|'), `Tasarım: ${task.ask === 'count' ? `${on.length} parça` : `${area} küçük üçgen`}`)
    setPhase('saved')
    if (count === 0) {
      track.item(wrong === 0)
      onComplete(wrong === 0)
    }
  }
  const fresh = () => {
    setV({ pieces: trayPieces(ALL7), sel: null })
    setPhase('build')
    setVal(null)
  }

  return (
    <Layout
      top={<Prompt emoji={task.emoji} color={C}>{task.text}</Prompt>}
      work={
        <div>
          <div style={fitWidth(12 / 12.3, 230)}>
            <Board value={v} onChange={setV} areas={grade >= 3 && phase !== 'build'} locked={phase !== 'build'} designLabel="TASARIM ALANI" />
          </div>
          {phase === 'build' && <PieceTools v={v} set={setV} big={age.big} />}
        </div>
      }
      panel={
        <>
          {phase === 'build' && (
            <>
              <Card title="Tasarımın">
                <p className="text-sm font-bold text-ink-soft">Tasarım alanında <b className="text-ink">{on.length}</b> parça var.</p>
              </Card>
              {nudge && <Nudge key={nudge.id} question={nudge.q} onClose={() => setNudge(null)} />}
              <BigButton onClick={finishDesign} disabled={on.length === 0} className="w-full"><Palette size={20} />Tasarımım hazır</BigButton>
            </>
          )}
          {(phase === 'ask' || phase === 'ask2') && (
            <Card title="Ölç">
              <p className="mb-3 text-[17px] leading-snug font-extrabold">
                {task.ask === 'count' ? 'Tasarımında kaç parça kullandın?' : phase === 'ask' ? 'Figürünün alanı kaç küçük üçgen?' : 'Şimdi kare parçayı 1 birim al. Figürünün alanı kaç birim?'}
              </p>
              <div className="flex flex-wrap items-end justify-center gap-3">
                <NumStepper value={val} onChange={(x) => { setVal(x); setNudge(null) }} min={0} max={task.ask === 'count' ? 7 : 16} step={phase === 'ask2' ? 0.5 : 1} fmt={(x) => x.toLocaleString('tr-TR')} label={task.ask === 'count' ? 'parça' : phase === 'ask' ? 'küçük üçgen' : 'kare parça'} big={age.big} />
                <BigButton onClick={check} disabled={val === null}><Check size={20} />Kontrol</BigButton>
              </div>
              {nudge && <Nudge key={nudge.id} question={nudge.q} misconception={nudge.mis} tool="tangram" onClose={() => setNudge(null)} />}
            </Card>
          )}
          {phase === 'saved' && (
            <>
              <Derived>{task.ask === 'count' ? `Galeriye eklendi! ${on.length} parçalık bir tasarım.` : task.ask === 'area2' ? `Galeriye eklendi! Alan: ${area} küçük üçgen = ${(area / 2).toLocaleString('tr-TR')} kare parça.` : `Galeriye eklendi! Alan: ${area} küçük üçgen.`}</Derived>
              <button type="button" onClick={fresh} className="btn-ghost min-h-12 w-full"><ImagePlus size={18} />Yeni bir tasarım yap</button>
            </>
          )}
          {gallery.length > 0 && (
            <Card title={`Galerim (${gallery.length})`}>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
                {gallery.map((g) => (
                  <div key={g.at} className="flex flex-col items-center rounded-xl bg-paper p-1.5 ring-1 ring-line">
                    <Thumb pieces={g.pieces} size={64} />
                    <span className="text-[11px] font-black text-ink-soft">{grade >= 3 ? `${g.area} birim` : `${g.pieces.length} parça`}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {footer}
        </>
      }
    />
  )
}

