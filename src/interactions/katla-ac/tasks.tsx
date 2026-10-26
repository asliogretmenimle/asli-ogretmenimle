import { useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useDrag } from '@use-gesture/react'
import { Eye, RotateCcw, RotateCw, Scissors, Undo2 } from 'lucide-react'
import type { Grade } from '../../data/types'
import { SolutionList, StrategyPicker, useSolutions } from '../../games/kit2'
import { MathText } from '../../components/MathText'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { Card, CheckButton, Choices, GhostButton, Nudge, Prompt, Split, Stage, Stepper, fmt, toPoints, useChecks, type Pt } from '../donusum-studyosu/ortak'
import {
  NOTCHES, SHAPES, angleOf, area, candidateLines, centroid, clipConvex, creasePattern, creaseSegments, lineAt, lineInPoly, predictOptions,
  symmetryAngles, unfoldImages, type Line, type NotchId, type OptKind, type ShapeId,
} from './geom'
import { FoldContent, PaperSvg, Thumb, svgPoint, useFolder, viewBoxOf, type PaperColors } from './Paper'

export type Common = { grade: Grade; dark: boolean; footer: ReactNode; onSolved: (first: boolean) => void; sol: ReturnType<typeof useSolutions>; colors: PaperColors; tag: string }

const ext = (seg: [Pt, Pt], k = 7): [Pt, Pt] => {
  const [a, b] = seg
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L
  return [[a[0] - ux * k, a[1] - uy * k], [b[0] + ux * k, b[1] + uy * k]]
}

/** Kat adayı doğrular: kâğıt üzerinde dokunulabilir kesikli çizgiler */
function LineTargets({ shape, cands, onPick, color }: { shape: Pt[]; cands: { id: string; line: Line }[]; onPick: (id: string) => void; color: string }) {
  return (
    <g>
      {cands.map((c) => {
        const s = lineInPoly(c.line, shape)
        if (!s) return null
        const [a, b] = ext(s)
        return (
          <g key={c.id} data-handle onClick={(e) => { e.stopPropagation(); onPick(c.id) }} style={{ cursor: 'pointer' }} role="button" aria-label="Bu çizgiden katla">
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="transparent" strokeWidth={11} />
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={1.4} strokeDasharray="4 3" strokeLinecap="round" />
            <circle cx={b[0]} cy={b[1]} r={3.2} fill={color} />
          </g>
        )
      })}
    </g>
  )
}

/** Panelde aynı adaylar: küçük çizim + ad (dokunma alternatifi) */
function LineButtons({ shape, cands, onPick, disabled, dark }: { shape: Pt[]; cands: { id: string; line: Line; kind: string }[]; onPick: (id: string) => void; disabled?: boolean; dark?: boolean }) {
  const names: Record<string, string> = { dikey: 'Dikey', yatay: 'Yatay', capraz: 'Çapraz', kayik: 'Kenara yakın' }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
      {cands.map((c) => {
        const s = lineInPoly(c.line, shape)
        return (
          <GhostButton key={c.id} onClick={() => onPick(c.id)} disabled={disabled} dark={dark} className="min-h-14 justify-start">
            <svg viewBox={viewBoxOf(shape, 6)} className="size-9 shrink-0" aria-hidden>
              <polygon points={toPoints(shape)} fill="#fde68a" stroke="#92400e" strokeWidth={2} />
              {s && <line x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} stroke="#db2777" strokeWidth={5} strokeDasharray="8 6" />}
            </svg>
            {names[c.kind]} kat
          </GhostButton>
        )
      })}
    </div>
  )
}

const partName = (k: number, grade: Grade) => {
  const n = 2 ** k
  if (grade <= 2) return k === 1 ? 'yarım' : k === 2 ? 'çeyrek' : 'sekizde bir'
  return `[[1/${n}]]`
}

function badText(kind: string, shapeId: string) {
  if (kind === 'kayik') return { q: 'İki parça tam üst üste geldi mi? Taşan kısmı görüyor musun? Katlama çizgisi kâğıdın tam ortasından geçiyor mu?', m: 'Eş olmayan iki parçayı “yarım” saydı' }
  if (kind === 'capraz' && shapeId === 'dikdortgen') return { q: 'Köşeden köşeye katladın ama kenarlar çakışmadı. Bu çizgi iki yarıyı tam üst üste getiriyor mu? Başka bir çizgi dene.', m: 'Dikdörtgenin köşegenini simetri doğrusu sandı' }
  return { q: 'Kenarlar üst üste gelmedi; taşan kısımlar var. Bu katlama eş parçalar oluşturur mu? Aç ve başka bir çizgi dene.', m: 'Simetri doğrusu olmayan bir çizgiden katladı' }
}

/* ───────────────────────── 1. Eş parçalara katla (yarım, çeyrek, sekizde bir) ───────────────────────── */

export type CreaseT = { kind: 'crease'; paper: 'kare' | 'dikdortgen'; folds: number; need: number }
export const PAPERS: Record<'kare' | 'dikdortgen', Pt[]> = {
  kare: [[0, 0], [100, 0], [100, 100], [0, 100]],
  dikdortgen: [[0, 0], [130, 0], [130, 70], [0, 70]],
}

export function CreaseTask({ t, grade, dark, footer, onSolved, sol, colors, tag }: { t: CreaseT } & Common) {
  const paper = PAPERS[t.paper]
  const f = useFolder(paper)
  const chk = useChecks()
  const track = useTracker()
  const [phase, setPhase] = useState<'fold' | 'show'>('fold')
  const [fb, setFb] = useState<{ ok: boolean; text: string; m?: string } | null>(null)
  const [found, setFound] = useState<string[]>([])
  const solvedRef = useRef(false)
  const cands = useMemo(() => candidateLines(f.shape, { offCenter: t.folds === 1 && f.level === 0 }), [f.shape, f.level, t.folds])
  const n = 2 ** t.folds
  const canFold = phase === 'fold' && !f.busy && !f.bad

  const pick = (id: string) => {
    const c = cands.find((x) => x.id === id)
    if (!c || !canFold) return
    setFb(null)
    const before = f.folds
    const lvl = f.level
    f.fold(c.line, (ok) => {
      if (!ok) {
        chk.fail()
        const b = badText(c.kind, t.paper)
        setFb({ ok: false, text: b.q, m: b.m })
        return
      }
      sfx.ok()
      if (lvl + 1 < t.folds) return
      const folds = [...before, c.line]
      window.setTimeout(() => f.unfoldAll(() => {
        const p = creasePattern(paper, folds)
        const isNew = sol.add(`${tag}-${p.key}`, p.label)
        const nextFound = isNew ? [...found, p.key] : found
        if (isNew) setFound(nextFound)
        setPhase('show')
        if (nextFound.length >= t.need && !solvedRef.current) {
          solvedRef.current = true
          onSolved(chk.pass())
        } else if (isNew) track.attempt(true)
        setFb({
          ok: true,
          text: isNew
            ? nextFound.length >= t.need
              ? `Harika! ${n} eş parça oldu. ${t.need > 1 ? `${nextFound.length} farklı yol buldun.` : ''} ${nextFound.length < 4 && t.folds > 1 ? 'Başka bir yol daha var mı?' : ''}`
              : `${n} eş parça! Şimdi aynı kâğıdı başka bir yoldan ${n} eş parçaya katlayabilir misin?`
            : 'Bu kat izi desenini zaten bulmuştun. Başka hangi çizgilerden katlayabilirsin?',
        })
      }), 350)
    })
  }

  const again = () => {
    f.reset()
    setPhase('fold')
    setFb(null)
  }

  const prompt =
    t.folds === 1
      ? <>Kâğıdı, iki parçası <b>tam üst üste</b> gelecek şekilde <b>bir kez</b> katla. {t.need > 1 && <>En az <b>{t.need}</b> farklı yol bul.</>}</>
      : <>Kâğıdı <b>{t.folds} kez</b> katlayarak <b>{n} eş parçaya</b> ayır. En az <b>{t.need}</b> farklı yol bul.</>

  return (
    <Split
      work={
        <Stage dark={dark}>
          <PaperSvg viewBox={viewBoxOf(paper, 12)} label="Katlanacak kâğıt">
            <FoldContent f={f} colors={colors} />
            {phase === 'show' && !f.busy && f.shapes[t.folds] && (
              <g pointerEvents="none">
                <polygon points={toPoints(f.shapes[t.folds])} fill={colors.paint} fillOpacity={0.35} />
                <text x={centroid(f.shapes[t.folds])[0]} y={centroid(f.shapes[t.folds])[1] + 2} textAnchor="middle" fontSize={t.folds === 3 ? 6 : 8} fontWeight={900} fill={colors.edge}>1 parça</text>
              </g>
            )}
            {canFold && <LineTargets shape={f.shape} cands={cands} onPick={pick} color="#db2777" />}
          </PaperSvg>
          <p className={`mt-1 text-center text-xs font-bold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>{f.level > 0 && phase === 'fold' ? `${f.level}. kat tamam · ${2 ** f.level} kat kalınlık` : 'Kesikli çizgilerden birine dokun.'}</p>
        </Stage>
      }
      panel={
        <>
          <Prompt step="Katla">{prompt}</Prompt>
          {phase === 'fold' && !f.bad && (
            <Card dark={dark}>
              <p className="mb-2 text-sm font-black">{f.level === 0 ? 'Nereden katlayacaksın?' : `Katlanmış kâğıdı ${f.level + 1}. kez nereden katlayacaksın?`}</p>
              <LineButtons shape={f.shape} cands={cands} onPick={pick} disabled={!canFold} dark={dark} />
              {f.level > 0 && <GhostButton onClick={() => f.undo()} disabled={f.busy} dark={dark} className="mt-2 w-full"><Undo2 size={18} />Son katı aç</GhostButton>}
            </Card>
          )}
          {f.bad && (
            <>
              <Nudge key={chk.tries} question={fb?.text ?? ''} misconception={fb?.m} tool="symmetry" />
              <GhostButton onClick={() => f.unbad(() => setFb(null))} dark={dark} className="w-full"><Undo2 size={18} />Kâğıdı aç, yeniden dene</GhostButton>
            </>
          )}
          {phase === 'show' && (
            <Card dark={dark}>
              <p className="text-lg font-black"><MathText text={`${n} eş parça · her biri ${partName(t.folds, grade)}`} /></p>
              <p className={`text-sm font-bold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>Her katlama, parça sayısını iki katına çıkarır: {Array.from({ length: t.folds + 1 }, (_, i) => 2 ** i).join(' → ')}</p>
            </Card>
          )}
          {phase === 'show' && fb && <Nudge tone={fb.ok ? 'ok' : 'think'} question={fb.text} />}
          {phase === 'show' && <GhostButton onClick={again} dark={dark} className="w-full"><RotateCcw size={18} />Yeni bir yol dene</GhostButton>}
          <SolutionList list={sol.list.filter((s) => s.key.startsWith(`${tag}-`))} goal={t.folds === 1 ? (t.paper === 'kare' ? 4 : 2) : 4} />
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 2. Denk kesirler: katla, boya, yeniden katla ───────────────────────── */

export type EquivT = { kind: 'equiv'; start: 1 | 2; shade: number; rounds: number }
const STRIP: Pt[] = [[0, 0], [200, 0], [200, 50], [0, 50]]

export function EquivTask({ t, grade, dark, footer, onSolved, colors }: { t: EquivT } & Common) {
  const f = useFolder(STRIP)
  const chk = useChecks()
  const [phase, setPhase] = useState<'start' | 'shade' | 'refold' | 'pick' | 'count' | 'final' | 'done'>('start')
  const [paint, setPaint] = useState<string[]>([]) // "i,j" hücreleri (başlangıç ızgarasında)
  const [grid0, setGrid0] = useState<[number, number]>([1, 1])
  const [chain, setChain] = useState<[number, number][]>([])
  const [ans, setAns] = useState({ total: 2, shaded: 1 })
  const [fb, setFb] = useState<{ ok: boolean; text: string; m?: string } | null>(null)
  const [choice, setChoice] = useState<string | null>(null)
  const grid = (folds: Line[]): [number, number] => {
    let nx = 1, ny = 1
    folds.forEach((l) => (Math.abs(angleOf(l) - 90) < 1 ? (nx *= 2) : (ny *= 2)))
    return [nx, ny]
  }
  const [nx, ny] = grid(f.folds)
  const paintPolys = paint.map((k) => {
    const [i, j] = k.split(',').map(Number)
    const w = 200 / grid0[0], h = 50 / grid0[1]
    return [[i * w, j * h], [(i + 1) * w, j * h], [(i + 1) * w, (j + 1) * h], [i * w, (j + 1) * h]] as Pt[]
  })
  const cands = useMemo(() => candidateLines(f.shape, { axisOnly: true }), [f.shape])
  const startFrac: [number, number] = [t.shade, 2 ** t.start]

  const pick = (id: string) => {
    const c = cands.find((x) => x.id === id)
    if (!c || f.busy) return
    setFb(null)
    const lvl = f.level
    const folds = [...f.folds, c.line]
    f.fold(c.line, (ok) => {
      if (!ok) return
      sfx.ok()
      if (phase === 'start') {
        if (lvl + 1 < t.start) return
        window.setTimeout(() => f.unfoldAll(() => { setGrid0(grid(folds)); setPhase('shade') }), 300)
      } else {
        window.setTimeout(() => f.unfoldAll(() => { setPhase('count'); setAns({ total: 2, shaded: 1 }) }), 300)
      }
    })
  }

  const tapPaper = (p: Pt) => {
    if (phase !== 'shade' || f.busy) return
    const i = Math.floor(p[0] / (200 / nx)), j = Math.floor(p[1] / (50 / ny))
    if (i < 0 || j < 0 || i >= nx || j >= ny) return
    const k = `${i},${j}`
    setPaint((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))
    setFb(null)
  }
  const checkShade = () => {
    if (paint.length !== t.shade) {
      chk.fail()
      setFb({ ok: false, text: `${2 ** t.start} eş parçadan ${t.shade} tanesini boyamalısın. Şu an ${paint.length} parça boyalı.` })
      return
    }
    setChain([startFrac])
    setFb(null)
    setPhase('refold')
  }
  const total = nx * ny
  const shadedParts = Math.round((paint.length * (200 / grid0[0]) * (50 / grid0[1])) / ((200 / nx) * (50 / ny)))
  const checkCount = () => {
    if (ans.total !== total) {
      chk.fail()
      setFb({ ok: false, text: 'Kat izlerinin ayırdığı parçaları tek tek say. Son katlama parça sayısını ne yaptı?', m: ans.total === total - 1 ? undefined : 'Katlamayla oluşan eş parçaları saymakta zorlandı' })
      return
    }
    if (ans.shaded !== shadedParts) {
      chk.fail()
      setFb({ ok: false, text: 'Boyalı bölgenin içinde kaç küçük parça var? Boyayı değiştirmedik, yalnız kat izi ekledik.', m: ans.shaded === shadedParts / 2 ? 'Yeni kat izinden sonra boyalı parçaların da çoğaldığını görmedi' : undefined })
      return
    }
    sfx.ok()
    const nc: [number, number][] = [...chain, [shadedParts, total]]
    setChain(nc)
    setFb({ ok: true, text: `Boyalı kısım hiç değişmedi; yalnızca daha küçük parçalara bölündü: [[${chain[chain.length - 1][0]}/${chain[chain.length - 1][1]}]] = [[${shadedParts}/${total}]].` })
    setPhase(nc.length - 1 >= t.rounds ? 'final' : 'refold')
  }
  const refold = () => {
    setFb(null)
    f.refoldAll(() => setPhase('pick'))
  }
  const final = (id: string) => {
    setChoice(id)
    if (id === 'iki') {
      setFb({ ok: true, text: 'Evet! Her katlamada hem bütündeki parça sayısı hem boyalı parça sayısı 2 katına çıkar; boyalı alan aynı kalır. Bu yüzden kesirler denktir.' })
      setPhase('done')
      onSolved(chk.pass())
    } else {
      chk.fail()
      setFb({ ok: false, text: id === 'kucul' ? 'Boyalı alana bak: katlayıp açınca boya azaldı mı? Parçalar küçüldü ama kaç tane oldu?' : 'Kâğıda yeni boya sürdük mü? Boyalı alan büyüdü mü, yoksa yalnız daha çok parçaya mı bölündü?', m: id === 'kucul' ? 'Payda büyüyünce kesrin küçüldüğünü düşündü (denk kesir)' : 'Pay büyüyünce kesrin büyüdüğünü düşündü (denk kesir)' })
    }
  }

  const chainText = chain.map(([a, b]) => `[[${a}/${b}]]`).join(' = ')
  const showLines = (phase === 'start' || phase === 'pick') && !f.busy && !f.bad

  return (
    <Split
      work={
        <Stage dark={dark}>
          <PaperSvg viewBox="-10 -10 220 70" label="Kâğıt şerit" onTap={tapPaper}>
            <FoldContent f={f} colors={colors} paint={paintPolys} />
            {showLines && <LineTargets shape={f.shape} cands={cands} onPick={pick} color="#db2777" />}
            {phase === 'shade' && <rect x={0} y={0} width={200} height={50} fill="transparent" style={{ cursor: 'pointer' }} />}
          </PaperSvg>
          {chain.length > 0 && (
            <p className={`mt-2 text-center text-2xl font-black ${dark ? 'text-white' : 'text-ink'}`}><MathText text={chainText} /></p>
          )}
        </Stage>
      }
      panel={
        <>
          {phase === 'start' && <Prompt step="1. Katla">Kâğıt şeridi {t.start === 1 ? <><b>2 eş parçaya</b> katla (bir kez).</> : <><b>4 eş parçaya</b> katla (iki kez).</>} Kesikli çizgilere dokun.</Prompt>}
          {phase === 'shade' && (
            <>
              <Prompt step="2. Boya">Kâğıt <b>{2 ** t.start}</b> eş parçaya ayrıldı. <b>{t.shade}</b> parçayı boya: <MathText text={`[[${t.shade}/${2 ** t.start}]]`} /></Prompt>
              <Card dark={dark}><p className="text-sm font-bold">Bir parçaya dokununca boyanır, yeniden dokununca silinir. Boyalı: {paint.length}</p></Card>
              <CheckButton onClick={checkShade} disabled={!paint.length} />
            </>
          )}
          {phase === 'refold' && (
            <>
              <Prompt step="3. Yeniden katla">Kâğıdı kat izlerinden yeniden katla, sonra <b>bir kez daha</b> katla. Açınca boyalı kısım nasıl görünecek?</Prompt>
              <CheckButton onClick={refold} disabled={f.busy}>Kat izlerinden katla</CheckButton>
            </>
          )}
          {phase === 'pick' && <Prompt step="3. Bir kez daha">Katlanmış şeridi bir kez daha katla: kesikli çizgilerden birine dokun.</Prompt>}
          {phase === 'pick' && <Card dark={dark}><LineButtons shape={f.shape} cands={cands} onPick={pick} disabled={f.busy} dark={dark} /></Card>}
          {phase === 'count' && (
            <>
              <Prompt step="4. Say">Kâğıdı açtık. Şimdi kaç eş parça var? Kaçı boyalı?</Prompt>
              <Card dark={dark} className="space-y-2">
                <Stepper label="Toplam parça" value={ans.total} onChange={(v) => { setAns({ ...ans, total: v }); setFb(null) }} min={1} max={32} dark={dark} />
                <Stepper label="Boyalı parça" value={ans.shaded} onChange={(v) => { setAns({ ...ans, shaded: v }); setFb(null) }} min={0} max={32} dark={dark} />
              </Card>
              <CheckButton onClick={checkCount} />
            </>
          )}
          {(phase === 'final' || phase === 'done') && (
            <>
              <Prompt step="Düşün">Her yeni katlamada <b>parça sayısı</b> ve <b>boyalı parça sayısı</b> ne oldu?</Prompt>
              <Choices<string> cols={1} value={choice} disabled={phase === 'done'} onPick={final} options={[
                { id: 'iki', label: 'İkisi de 2 katına çıktı' },
                { id: 'kucul', label: 'Parçalar çoğaldı, boyalı kısım küçüldü' },
                { id: 'buyu', label: 'Boyalı parça çoğaldı, boyalı kısım büyüdü' },
              ]} />
            </>
          )}
          {fb && <Nudge key={`${phase}-${chk.tries}`} tone={fb.ok ? 'ok' : 'think'} question={fb.text} misconception={fb.ok ? undefined : fb.m} tool={fb.ok ? undefined : 'fractions'} />}
          {phase === 'done' && grade >= 4 && <StrategyPicker question="Denk kesri nasıl açıklarsın?" options={['Katlayınca parçalar ikiye bölündü', 'Pay ve paydayı 2 ile çarptım', 'Boyalı alan değişmedi']} onPick={() => undefined} />}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 3. Katla, kes, tahmin et, aç ───────────────────────── */

export type NotchT = { kind: 'notch'; folds: number; hint?: boolean }
const optNudge: Record<Exclude<OptKind, 'dogru'>, { q: string; m: string }> = {
  tek: { q: 'Makas katlı kâğıtta kaç kattan geçti? Her katta bir kesik oluşmaz mı?', m: 'Katlı kâğıtta kesilen deliğin yalnız bir katta oluştuğunu düşündü' },
  kaydir: { q: 'Açınca kesik yana kayıyor mu, yoksa kat izine göre ayna görüntüsü gibi ters mi dönüyor? Üçgenin sivri ucuna bak.', m: 'Katlayıp açmayı yansıma yerine öteleme gibi düşündü' },
  sonKat: { q: 'Kâğıdı kaç kez katlamıştın? Her katlama kesik sayısını ne yapar?', m: 'Birden çok katlamada her katın kesikleri ikiye katladığını hesaba katmadı' },
  ilkKat: { q: 'Kâğıdı kaç kez katlamıştın? Her katlama kesik sayısını ne yapar?', m: 'Birden çok katlamada her katın kesikleri ikiye katladığını hesaba katmadı' },
  eksik: { q: 'Katlı kâğıt kaç kat kalınlığındaydı? Açınca kaç kesik olmalı?', m: 'Katlı kâğıttaki kat sayısını eksik saydı' },
}

export function NotchTask({ t, grade, dark, footer, onSolved, colors }: { t: NotchT } & Common) {
  const paper = PAPERS.kare
  const f = useFolder(paper)
  const track = useTracker()
  const [phase, setPhase] = useState<'fold' | 'cut' | 'predict' | 'reveal' | 'done'>('fold')
  const [notch, setNotch] = useState<NotchId>(grade <= 3 ? 'daire' : 'ucgen')
  const [pos, setPos] = useState<Pt | null>(null)
  const [opts, setOpts] = useState<ReturnType<typeof predictOptions>>([])
  const [choice, setChoice] = useState<number | null>(null)
  const [fb, setFb] = useState<{ ok: boolean; text: string; m?: string } | null>(null)
  const [round, setRound] = useState(0)
  const solved = useRef(false)
  const cands = useMemo(() => candidateLines(f.shape), [f.shape])
  const svgRef = useRef<SVGSVGElement>(null)

  const pick = (id: string) => {
    const c = cands.find((x) => x.id === id)
    if (!c || f.busy || f.bad || phase !== 'fold') return
    setFb(null)
    const lvl = f.level
    f.fold(c.line, (ok) => {
      if (!ok) {
        track.attempt(false)
        const b = badText(c.kind, 'kare')
        setFb({ ok: false, text: b.q, m: b.m })
        return
      }
      if (lvl + 1 >= t.folds) {
        setPhase('cut')
        setPos(null)
      }
    })
  }
  const place = (p: Pt) => {
    if (phase !== 'cut') return
    setPos([Math.round(p[0]), Math.round(p[1])])
    setFb(null)
  }
  const make = NOTCHES.find((x) => x.id === notch)!.make
  const cut = () => {
    if (!pos) return
    const piece = clipConvex(make(pos), f.shape)
    if (piece.length < 3 || area(piece) < 6) {
      setFb({ ok: false, text: 'Makas kâğıda değmiyor gibi. Kesiği kâğıdın üzerine, bir kenara ya da kat yerine koy.' })
      return
    }
    sfx.ok()
    f.cut(piece)
    setOpts(predictOptions(f.folds, piece, grade <= 3 ? 3 : 4, Math.random))
    setChoice(null)
    setPhase('predict')
  }
  const reveal = () => {
    if (choice === null) return
    setPhase('reveal')
    f.unfoldAll(() => {
      const o = opts[choice]
      const ok = o.kind === 'dogru'
      if (!solved.current) {
        solved.current = true
        track.attempt(ok)
        onSolved(ok)
      }
      const nHoles = unfoldImages(f.pieces, f.folds).length
      if (ok) {
        sfx.ok()
        setFb({ ok: true, text: `Tahminin tuttu! Kâğıt ${2 ** t.folds} kattı, bu yüzden ${nHoles} kesik oluştu ve her biri kat izine göre ayna görüntüsü gibi yerleşti.` })
      } else {
        const n = optNudge[o.kind as Exclude<OptKind, 'dogru'>]
        setFb({ ok: false, text: n.q, m: n.m })
      }
      setPhase('done')
    })
  }
  const again = () => {
    f.reset()
    setPhase('fold')
    setPos(null)
    setFb(null)
    setChoice(null)
    setRound((r) => r + 1)
  }

  const preview = pos ? make(pos) : null
  return (
    <Split
      work={
        <Stage dark={dark}>
          <PaperSvg viewBox={viewBoxOf(paper, 12)} label="Katlanan kâğıt" svgRef={svgRef} onTap={place}>
            <FoldContent f={f} colors={colors} foldMarks />
            {phase === 'fold' && !f.busy && !f.bad && <LineTargets shape={f.shape} cands={cands} onPick={pick} color="#db2777" />}
            {phase === 'cut' && <CutDragger svgRef={svgRef} onMove={place} />}
            {phase === 'cut' && preview && (
              <g pointerEvents="none">
                <polygon points={toPoints(preview)} fill="#0f172a" fillOpacity={0.18} stroke="#0f172a" strokeWidth={1} strokeDasharray="2.5 2" />
                <text x={pos![0]} y={pos![1] - 13} textAnchor="middle" fontSize={9}>✂️</text>
              </g>
            )}
          </PaperSvg>
          <p className={`mt-1 text-center text-xs font-bold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>
            {phase === 'fold' ? `Katlama: ${f.level} / ${t.folds}` : phase === 'cut' ? `Kâğıt ${2 ** t.folds} kat kalınlığında. Kalın çizgiler kat yeri.` : phase === 'predict' ? 'Açmadan önce tahmin et!' : ''}
          </p>
        </Stage>
      }
      panel={
        <>
          {phase === 'fold' && (
            <>
              <Prompt step="1. Katla">Kâğıdı <b>{t.folds === 1 ? 'bir kez' : `${t.folds} kez`}</b> katla. {t.folds > 1 && 'Hangi çizgilerden katlayacağına sen karar ver.'}</Prompt>
              {!f.bad && (
                <Card dark={dark}>
                  <LineButtons shape={f.shape} cands={cands} onPick={pick} disabled={f.busy} dark={dark} />
                  {f.level > 0 && <GhostButton onClick={() => f.undo()} disabled={f.busy} dark={dark} className="mt-2 w-full"><Undo2 size={18} />Son katı aç</GhostButton>}
                </Card>
              )}
              {f.bad && (
                <>
                  <Nudge question={fb?.text ?? ''} misconception={fb?.m} />
                  <GhostButton onClick={() => f.unbad(() => setFb(null))} dark={dark} className="w-full"><Undo2 size={18} />Kâğıdı aç</GhostButton>
                </>
              )}
            </>
          )}
          {phase === 'cut' && (
            <>
              <Prompt step="2. Kes">Bir kesik biçimi seç, sonra katlı kâğıtta kesmek istediğin yere dokun. {(t.hint || grade <= 3) && <b>Kat yerine (kalın kenar) koymayı dene!</b>}</Prompt>
              <Choices<NotchId> cols={3} value={notch} onPick={(id) => { setNotch(id); setFb(null) }} options={NOTCHES.map((n) => ({ id: n.id, label: <NotchIcon id={n.id} />, sub: n.name }))} />
              <CheckButton onClick={cut} disabled={!pos}><Scissors size={20} />Kes</CheckButton>
              {fb && <Nudge question={fb.text} />}
            </>
          )}
          {(phase === 'predict' || phase === 'reveal' || phase === 'done') && (
            <>
              <Prompt step="3. Tahmin et">Kâğıdı açınca nasıl görünecek?</Prompt>
              <div className="grid grid-cols-2 gap-2">
                {opts.map((o, i) => {
                  const sel = choice === i
                  const showOk = phase === 'done' && o.kind === 'dogru'
                  return (
                    <button key={i} type="button" disabled={phase !== 'predict'} onClick={() => setChoice(i)} aria-pressed={sel}
                      className={`rounded-2xl bg-white p-1.5 ring-2 transition active:scale-[0.97] ${showOk ? 'ring-4 ring-ok' : sel ? 'ring-4 ring-pink-600' : 'ring-line hover:ring-pink-300'}`}>
                      <Thumb paper={paper} holes={o.holes} colors={colors} creases={creaseSegments(paper, f.folds)} />
                      <span className="block text-xs font-black text-ink-soft">{String.fromCharCode(65 + i)}{showOk ? ' ✓' : ''}</span>
                    </button>
                  )
                })}
              </div>
              {phase === 'predict' && <CheckButton onClick={reveal} disabled={choice === null}><Eye size={20} />Aç ve gör</CheckButton>}
            </>
          )}
          {phase === 'done' && fb && <Nudge key={round} tone={fb.ok ? 'ok' : 'think'} question={fb.text} misconception={fb.ok ? undefined : fb.m} tool={fb.ok ? undefined : 'symmetry'} />}
          {phase === 'done' && (
            <>
              <StrategyPicker key={`s${round}`} question="Nasıl tahmin ettin?" options={['Katları saydım', 'Kat izine göre aynaladım', 'Kafamda açtım', 'Rastgele seçtim']} onPick={() => undefined} />
              <GhostButton onClick={again} dark={dark} className="w-full"><RotateCcw size={18} />Başka bir kesik dene</GhostButton>
            </>
          )}
          {footer}
        </>
      }
    />
  )
}

/** Kesik konumunu parmakla sürükleyerek de ayarlamak için şeffaf katman */
function CutDragger({ svgRef, onMove }: { svgRef: RefObject<SVGSVGElement | null>; onMove: (p: Pt) => void }) {
  const bind = useDrag(({ xy: [x, y], tap }) => {
    if (tap) return
    onMove(svgPoint(svgRef.current, x, y))
  }, { filterTaps: true })
  return <rect {...bind()} x={-20} y={-20} width={140} height={140} fill="transparent" style={{ touchAction: 'none', cursor: 'crosshair' }} />
}

function NotchIcon({ id }: { id: NotchId }) {
  const p = NOTCHES.find((n) => n.id === id)!.make([12, 12])
  return <svg viewBox="0 0 24 24" className="mx-auto size-8" aria-hidden><polygon points={toPoints(p)} fill="currentColor" /></svg>
}

/* ───────────────────────── 4. Simetri doğrularını katlayarak bul ───────────────────────── */

export type SymT = { kind: 'sym'; shape: ShapeId }

export function SymTask({ t, grade, dark, footer, onSolved, sol, colors, tag }: { t: SymT } & Common) {
  const S = SHAPES[t.shape]
  const f = useFolder(S.poly)
  const chk = useChecks()
  const c = useMemo(() => centroid(S.poly), [S.poly])
  const total = useMemo(() => symmetryAngles(S.poly), [S.poly])
  const R = useMemo(() => Math.max(...S.poly.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1]))) + 8, [S.poly, c])
  const [ang, setAng] = useState(t.shape === 'kalp' || t.shape === 'ucgen' ? 30 : 60)
  const [found, setFound] = useState<number[]>([])
  const [fb, setFb] = useState<{ ok: boolean; text: string; m?: string } | null>(null)
  const [done, setDone] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const norm = (a: number) => ((Math.round(a / S.snap) * S.snap) % 180 + 180) % 180
  const line = lineAt(c, ang)
  const toward = (p: Pt) => setAng(norm((Math.atan2(-(p[1] - c[1]), p[0] - c[0]) * 180) / Math.PI))
  const bind = useDrag(({ xy: [x, y], event }) => {
    event.stopPropagation()
    toward(svgPoint(svgRef.current, x, y))
    setFb(null)
  })
  const idle = !f.busy && !f.bad && f.level === 0 && !done

  const fold = () => {
    if (!idle) return
    setFb(null)
    f.fold(line, (ok) => {
      if (!ok) {
        chk.fail()
        setFb({
          ok: false,
          text: 'İki yarı tam üst üste gelmedi; taşan kısımları görüyor musun? Kâğıdı aç ve katlama çizgisini çevirerek yeniden dene.',
          m: t.shape === 'dikdortgen' && ang % 90 !== 0 ? 'Dikdörtgenin köşegenini simetri doğrusu sandı' : t.shape === 'paralelkenar' ? 'Paralelkenarda simetri doğrusu olduğunu düşündü' : undefined,
        })
        return
      }
      const a = norm(ang)
      const isNew = !found.includes(a)
      if (isNew) {
        setFound((x) => [...x, a])
        sol.add(`${tag}-${a}`, a === 90 ? 'Dikey' : a === 0 ? 'Yatay' : grade >= 6 ? `${fmt(a)}°’lik` : 'Çapraz')
      }
      setFb({ ok: true, text: isNew ? 'İki yarı tam çakıştı: bu bir simetri doğrusu! Başka var mı?' : 'Bu simetri doğrusunu zaten bulmuştun. Başka bir yerden dene.' })
      window.setTimeout(() => f.undo(), 650)
    })
  }
  const finish = () => {
    if (found.length === total.length) {
      setDone(true)
      setFb({ ok: true, text: total.length === 0 ? `Doğru: ${S.name.toLocaleLowerCase('tr')} hangi çizgiden katlanırsa katlansın iki yarı çakışmaz; simetri doğrusu yok.` : `Tamam! ${S.name} şeklinin ${total.length} simetri doğrusu var.` })
      onSolved(chk.pass())
      return
    }
    chk.fail()
    setFb({
      ok: false,
      text: found.length === 0
        ? 'Gerçekten hiç yok mu? Kenarların ortasından ya da köşeden köşeye katlamayı denedin mi?'
        : `Şimdiye kadar ${found.length} doğru buldun. Başka bir yerden katlayınca da iki yarı çakışabilir mi? Köşeden köşeye ve kenar ortasından kenar ortasına dene.`,
      m: found.length === 0 ? undefined : 'Bir şeklin simetri doğrularının hepsini bulmadan bitirdi',
    })
  }

  const end: Pt = [c[0] + R * Math.cos((ang * Math.PI) / 180), c[1] - R * Math.sin((ang * Math.PI) / 180)]
  const opp: Pt = [2 * c[0] - end[0], 2 * c[1] - end[1]]
  return (
    <Split
      work={
        <Stage dark={dark}>
          <PaperSvg viewBox={`${c[0] - R - 6} ${c[1] - R - 6} ${2 * R + 12} ${2 * R + 12}`} label={`${S.name} kâğıdı`} svgRef={svgRef} onTap={(p) => { if (idle) { toward(p); setFb(null) } }}>
            <FoldContent f={f} colors={colors} creases={false} />
            {found.map((a) => {
              const s = lineInPoly(lineAt(c, a), S.poly)
              return s ? <line key={a} x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} stroke="#16a34a" strokeWidth={1.6} strokeLinecap="round" pointerEvents="none" /> : null
            })}
            {idle && (
              <g>
                <line x1={opp[0]} y1={opp[1]} x2={end[0]} y2={end[1]} stroke="#db2777" strokeWidth={1.4} strokeDasharray="4 3" pointerEvents="none" />
                <g {...bind()} data-handle style={{ touchAction: 'none', cursor: 'grab' }}>
                  <circle cx={end[0]} cy={end[1]} r={9} fill="transparent" />
                  <circle cx={end[0]} cy={end[1]} r={4.6} fill="#db2777" stroke="#fff" strokeWidth={1.4} />
                </g>
                <circle cx={c[0]} cy={c[1]} r={1.6} fill="#db2777" pointerEvents="none" />
              </g>
            )}
          </PaperSvg>
          <p className={`mt-1 text-center text-xs font-bold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>Pembe tutamacı sürükle ya da kâğıtta bir yere dokun: kat çizgisi o yöne döner.</p>
        </Stage>
      }
      panel={
        <>
          <Prompt step="Simetri avı">{S.name} biçimindeki kâğıdı katla. İki yarısı <b>tam üst üste</b> gelen tüm katlama çizgilerini bul.</Prompt>
          {!f.bad && !done && (
            <Card dark={dark}>
              <div className="flex items-center gap-2">
                <GhostButton onClick={() => { setAng(norm(ang + S.snap)); setFb(null) }} disabled={!idle} dark={dark} className="flex-1" ><RotateCcw size={18} />Çevir</GhostButton>
                <GhostButton onClick={() => { setAng(norm(ang - S.snap)); setFb(null) }} disabled={!idle} dark={dark} className="flex-1"><RotateCw size={18} />Çevir</GhostButton>
              </div>
              <CheckButton onClick={fold} disabled={!idle}>Bu çizgiden katla</CheckButton>
            </Card>
          )}
          {f.bad && <GhostButton onClick={() => f.unbad(() => setFb(null))} dark={dark} className="w-full"><Undo2 size={18} />Kâğıdı aç</GhostButton>}
          {fb && <Nudge key={`${chk.tries}-${found.length}`} tone={fb.ok ? 'ok' : 'think'} question={fb.text} misconception={fb.ok ? undefined : fb.m} tool={fb.ok ? undefined : 'symmetry'} />}
          <Card dark={dark}>
            <p className="text-sm font-black">Bulunan simetri doğrusu: <span className="text-2xl text-green-600 tabular-nums">{found.length}</span></p>
          </Card>
          {!done && <GhostButton onClick={finish} disabled={!idle} dark={dark} className="min-h-14 w-full text-base">{found.length ? 'Hepsini buldum' : 'Hiç simetri doğrusu yok'}</GhostButton>}
          <SolutionList list={sol.list.filter((s) => s.key.startsWith(`${tag}-`))} />
          {done && grade >= 3 && <StrategyPicker question="Simetri doğrularını nasıl aradın?" options={['Köşeden köşeye katladım', 'Kenar ortasından katladım', 'Şeklin dönüşüne baktım', 'Deneme yanılma']} onPick={() => undefined} />}
          {footer}
        </>
      }
    />
  )
}
