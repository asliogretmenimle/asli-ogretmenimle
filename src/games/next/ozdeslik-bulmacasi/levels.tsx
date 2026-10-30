import { useMemo, useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { MathText } from '../../../components/MathText'
import { StrategyPicker } from '../../kit2'
import { useTracker } from '../../../lib/trackerContext'
import { Card, CheckButton, Choices, Nudge, Prompt, Split, Stage, useChecks } from '../../../interactions/donusum-studyosu/ortak'
import { TileBoard } from './Board'
import { area, bbox, exprFrom, gaps, isRectangle, lenStr, lenVal, toLen, type Len, type Placed, type Rect, type Syms, type TileKind } from './shapes'

/**
 * Çerçeveli seviyeler (kareyi/dikdörtgeni karolarla doldur → özdeşlik karolardan türer)
 * ve çarpanlara ayırma seviyesi (verilen karolarla dikdörtgen kur → kenarları oku).
 */

export interface Solved {
  first: boolean
  moves: number
}

export interface Identity {
  lhs: string
  rhs: string
}

export interface FrameDef {
  kind: 'frame'
  title: string
  emoji: string
  prompt: string
  syms: Syms
  kinds: TileKind[]
  frame: { w: Len; h: Len }
  order: string[]
  identity: Identity
  par: number
  predict?: { q: string; options: { id: string; label: string }[]; answer: string; misconception: string; after: string }
  strategy?: string[]
  /** Yalnız birim karo ve büyük kare konduğunda gösterilecek soru */
  squareOnly?: { text: string; misconception: string }
}

type Common = { onSolved: (r: Solved) => void; footer: ReactNode; solved: boolean }

const countTerms = (placed: Placed[], kinds: TileKind[]) => {
  const by = Object.fromEntries(kinds.map((k) => [k.id, k]))
  const c: Record<string, number> = {}
  for (const p of placed) c[by[p.kind].term] = (c[by[p.kind].term] ?? 0) + 1
  return c
}
const rectsOf = (placed: Placed[], kinds: TileKind[], s: Syms): Rect[] => {
  const by = Object.fromEntries(kinds.map((k) => [k.id, k]))
  return placed.map((p) => ({ x: p.x, y: p.y, w: lenVal(by[p.kind].w, s), h: lenVal(by[p.kind].h, s) }))
}
const termName: Record<string, string> = { x2: 'x²', x: 'x', '1': '1', a2: 'a²', ab: 'ab', b2: 'b²' }

/** Karo sayımının okunur dökümü: “1 tane x², 2 tane x, 1 tane 1” */
function CountLine({ counts, order }: { counts: Record<string, number>; order: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {order.map((t) => (
        <span key={t} className={`chip px-2.5 py-1 text-sm ${counts[t] ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-500'}`}>{counts[t] ?? 0} × {termName[t]}</span>
      ))}
    </div>
  )
}

export function IdentityCard({ id, big }: { id: Identity; big?: boolean }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg ring-2 ring-violet-300 animate-pop ${big ? 'p-4' : 'p-2.5'}`}>
      <p className={`text-center font-black ${big ? 'text-2xl' : 'text-base'}`}><MathText text={`${id.lhs} = ${id.rhs}`} /></p>
    </div>
  )
}

export function FrameLevel({ def, onSolved, footer, solved }: { def: FrameDef } & Common) {
  const checks = useChecks()
  const track = useTracker()
  const [placed, setPlaced] = useState<Placed[]>([])
  const [moves, setMoves] = useState(0)
  const [gapList, setGapList] = useState<Rect[] | null>(null)
  const [nudge, setNudge] = useState<{ text: string; misconception?: string; n: number } | null>(null)
  const [guess, setGuess] = useState<string | null>(def.predict ? null : 'yok')
  const [stratDone, setStratDone] = useState(!def.strategy)
  const W = lenVal(def.frame.w, def.syms), H = lenVal(def.frame.h, def.syms)
  const counts = countTerms(placed, def.kinds)

  const change = (p: Placed[]) => {
    setPlaced(p)
    setMoves((m) => m + 1)
    setGapList(null)
    setNudge(null)
    const filled = rectsOf(p, def.kinds, def.syms).reduce((s, r) => s + area(r), 0)
    if (Math.abs(filled - W * H) < 1e-4) onSolved({ first: checks.pass(), moves: moves + 1 })
  }

  const check = () => {
    const g = gaps({ x: 0, y: 0, w: W, h: H }, rectsOf(placed, def.kinds, def.syms))
    setGapList(g)
    checks.fail()
    const c = countTerms(placed, def.kinds)
    const onlySquares = def.squareOnly && !c.x && !c.ab
    setNudge((n) => ({
      ...(onlySquares
        ? def.squareOnly!
        : { text: 'Taralı yerler hâlâ boş. Bir boşluğun kenarları ne kadar? Kenar etiketlerine bak: hangi karo tam oraya sığar?' }),
      n: (n?.n ?? 0) + 1,
    }))
  }

  const rhs = exprFrom(counts, def.order)
  return (
    <Split
      work={
        <Stage dark className="p-2 sm:p-3">
          <TileBoard syms={def.syms} kinds={def.kinds} region={{ w: W, h: H }} frame={def.frame} placed={placed} onChange={change} gaps={gapList} locked={solved || !guess} onReject={(m) => setNudge((n) => ({ text: m, n: (n?.n ?? 0) + 1 }))} />
        </Stage>
      }
      panel={
        <>
          <Prompt step={`Kenarlar: ${paren2(def.frame.w, def.syms)} ve ${paren2(def.frame.h, def.syms)}`}><MathText text={def.prompt} /></Prompt>
          {def.predict && !guess && (
            <Card dark>
              <p className="mb-2 font-extrabold text-white"><MathText text={def.predict.q} /></p>
              <Choices cols={1} options={def.predict.options.map((o) => ({ id: o.id, label: o.label }))} value={guess} onPick={(id) => { setGuess(id); track.strategy(`Tahmin: ${def.predict!.options.find((o) => o.id === id)?.label}`); if (id !== def.predict!.answer) track.misconception(def.predict!.misconception) }} />
            </Card>
          )}
          {guess && (
            <Card dark>
              <p className="mb-2 text-xs font-black tracking-wide text-slate-300 uppercase">Karoları say</p>
              <CountLine counts={counts} order={def.order} />
              <p className="mt-2 text-lg font-black text-white">Alan = {placed.length ? rhs : '…'}</p>
            </Card>
          )}
          {!solved && guess && placed.length > 0 && <CheckButton onClick={check}>Bitti mi? Kontrol et</CheckButton>}
          {nudge && !solved && <Nudge key={nudge.n} question={nudge.text} misconception={nudge.misconception} />}
          {solved && (
            <>
              <p className="rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-black text-emerald-200">Çerçeve boşluksuz doldu! Karoların toplam alanı çerçevenin alanına eşit:</p>
              <IdentityCard id={def.identity} big />
              {def.predict && guess && <p className="rounded-xl bg-slate-700/70 px-3 py-2 text-sm font-bold text-slate-100"><MathText text={def.predict.after} /></p>}
              {!stratDone && def.strategy && <StrategyPicker question="Karoları nasıl yerleştirdin?" options={def.strategy} onPick={() => setStratDone(true)} />}
              {stratDone && footer}
            </>
          )}
        </>
      }
    />
  )
}

const paren2 = (l: Len, s: Syms) => `(${lenStr(l, s)})`

/* ───────────── çarpanlara ayırma ───────────── */

export interface FactorDef {
  kind: 'factor'
  title: string
  emoji: string
  prompt: string
  syms: Syms
  kinds: TileKind[]
  limits: Record<string, number>
  mat: number
  order: string[]
  identity: Identity
  par: number
  options: string[]
}

export function FactorLevel({ def, onSolved, footer, solved }: { def: FactorDef } & Common) {
  const checks = useChecks()
  const [placed, setPlaced] = useState<Placed[]>([])
  const [moves, setMoves] = useState(0)
  const [gapList, setGapList] = useState<Rect[] | null>(null)
  const [nudge, setNudge] = useState<{ text: string; misconception?: string; n: number } | null>(null)
  const [wPick, setW] = useState<string | null>(null)
  const [hPick, setH] = useState<string | null>(null)
  const [sideMiss, setSideMiss] = useState(0)
  const counts = countTerms(placed, def.kinds)
  const total = Object.values(def.limits).reduce((s, v) => s + v, 0)
  const rects = rectsOf(placed, def.kinds, def.syms)
  const rectDone = placed.length === total && isRectangle(rects)
  const box = useMemo(() => (rects.length ? bbox(rects) : null), [rects])
  const sides = box && rectDone ? { w: lenStr(toLen(box.w, def.syms) ?? [0, 0], def.syms), h: lenStr(toLen(box.h, def.syms) ?? [0, 0], def.syms) } : null

  const change = (p: Placed[]) => {
    setPlaced(p)
    setMoves((m) => m + 1)
    setGapList(null)
    setNudge(null)
    setW(null)
    setH(null)
  }
  const check = () => {
    checks.fail()
    if (placed.length < total) return setNudge((n) => ({ text: `Bütün karoları kullanmalısın: ${def.identity.lhs.replace(/\^\{2\}/g, '²')} karolarının hepsi dikdörtgenin içinde olmalı. Kutuda kalanlara bak.`, n: (n?.n ?? 0) + 1 }))
    const b = bbox(rects)
    setGapList(gaps(b, rects))
    setNudge((n) => ({ text: 'Henüz dikdörtgen değil: taralı boşluklar var. x karolarını büyük karenin bir yanına ve altına paylaştır; köşede kalan birim kareler de küçük bir dikdörtgen oluşturmalı. 6 birim kare kaça kaç dizilebilir?', n: (n?.n ?? 0) + 1 }))
  }
  const checkSides = () => {
    if (!sides || !wPick || !hPick) return
    if (wPick === sides.w && hPick === sides.h) return onSolved({ first: checks.pass(), moves })
    checks.fail()
    setSideMiss((m) => m + 1)
  }

  const opts = def.options.map((o) => ({ id: o, label: `(${o})` }))
  return (
    <Split
      work={
        <Stage dark className="p-2 sm:p-3">
          <TileBoard syms={def.syms} kinds={def.kinds} region={{ w: def.mat, h: def.mat }} placed={placed} onChange={change} limits={def.limits} gaps={gapList} locked={solved || rectDone} onReject={(m) => setNudge((n) => ({ text: m, n: (n?.n ?? 0) + 1 }))} />
        </Stage>
      }
      panel={
        <>
          <Prompt step="Çarpanlara ayır"><MathText text={def.prompt} /></Prompt>
          <Card dark>
            <p className="mb-2 text-xs font-black tracking-wide text-slate-300 uppercase">Kullanılan karolar</p>
            <CountLine counts={counts} order={def.order} />
          </Card>
          {!rectDone && placed.length > 0 && <CheckButton onClick={check}>Dikdörtgen oldu mu?</CheckButton>}
          {nudge && !rectDone && <Nudge key={nudge.n} question={nudge.text} misconception={nudge.misconception} />}
          {rectDone && !solved && (
            <Card dark>
              <p className="mb-2 flex items-center gap-2 font-extrabold text-white"><Search size={18} className="text-pink-300" />Dikdörtgen hazır! Kenarlarını oku:</p>
              <p className="mb-1 text-xs font-black tracking-wide text-slate-300 uppercase">Yatay kenar</p>
              <Choices cols={3} options={opts} value={wPick} onPick={setW} />
              <p className="mt-3 mb-1 text-xs font-black tracking-wide text-slate-300 uppercase">Dikey kenar</p>
              <Choices cols={3} options={opts} value={hPick} onPick={setH} />
              <div className="mt-3"><CheckButton onClick={checkSides} disabled={!wPick || !hPick}>Kenarları kontrol et</CheckButton></div>
              {sideMiss > 0 && <div className="mt-2"><Nudge key={sideMiss} question="Kenar boyunca karoları say: yatay kenarda kaç tane x uzunluğu, kaç tane birim uzunluk var? Dikey kenarda?" /></div>}
            </Card>
          )}
          {solved && (
            <>
              <p className="rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-black text-emerald-200">Karolar bir dikdörtgen oldu; alanı kenarlarının çarpımı:</p>
              <IdentityCard id={def.identity} big />
              {footer}
            </>
          )}
        </>
      }
    />
  )
}
