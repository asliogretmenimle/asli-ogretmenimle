import { useMemo, useRef, useState } from 'react'
import { Check, Ear, MousePointerClick, Plus, X } from 'lucide-react'
import { MathText } from '../../components/MathText'
import { StrategyPicker, useAge, useSolutions } from '../../games/kit2'
import { ActivityLayout, DoneNote, hitZone, shuffle, useNudge, useSession, useTileDrag } from '../hizli-noktalar/kit'
import type { InteractionProps } from '../types'
import { ShowView } from './cards'
import { holdsFor, reasonsFor, setsFor, type HSet, type Reason } from './sets'

/**
 * 68. Hangisi Farklı? 2.0 — Van de Walle: “Hangisi farklı?” görevlerinde TEK doğru cevap yoktur;
 * önemli olan gerekçedir. Dört gösterimin (sayı, şekil, model, ifade, grafik) HER BİRİ için onu
 * diğerlerinden ayıran bir özellik bulunur.
 *  - Kart seç → özellik çipini seç (ya da çipi karta sürükle) → gerekçeyi kur: “Yalnızca B: tek sayı” / “Yalnızca B: tek sayı değil”
 *  - Özellik başka kartlarda da varsa o kartlar parlar: “Ama C ve D de öyle!” (ortak özellik ≠ ayırt edici özellik)
 *  - Dört kartın hepsine gerekçe bulununca görev biter; sınıf arkadaşlarının gerekçeleri açılır.
 *  - “Arkadaşım ne dedi?” takılınca bir kart için arkadaş gerekçesi gösterir (ipucu).
 * 1–2: resimler, şekiller, onluk çerçeve · 3–5: sayılar, kesirler, çokgenler, alan · 6–8: çarpanlar, ifadeler, tablolar, doğrular, üsler.
 */

const LET = ['A', 'B', 'C', 'D']
const ACC = ['A’yı', 'B’yi', 'C’yi', 'D’yi']
const CARD_COL = ['#f97316', '#3b82f6', '#16a34a', '#a855f7']
const NAMES = ['Elif', 'Can', 'Zeynep', 'Mert', 'Ada', 'Kerem', 'Defne', 'Ali', 'Nehir', 'Emir']
const MIS_SHARED = 'Ortak bir özelliği ayırt edici gerekçe olarak gösterdi'

function pickSets(grade: InteractionProps['grade']): HSet[] {
  const all = setsFor(grade)
  return shuffle(all).slice(0, Math.min(4, all.length))
}

const phraseOf = (set: HSet, r: Reason) => (r.neg ? set.props[r.prop].neg : set.props[r.prop].pos)
const listJoin = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ve ${xs[xs.length - 1]}`)

export default function HangisiFarkli2({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => pickSets(grade), [grade])
  const S = useSession(tasks.length)
  const set = tasks[S.idx]
  const age = useAge(grade)
  const big = age.big
  const dark = age.tier === 'atolye'
  const { nudge, show, clear } = useNudge()
  const sol = useSolutions()
  const reasons = useMemo(() => reasonsFor(set), [set])
  const chips = useMemo(() => shuffle(set.props.map((_, i) => i)), [set])
  const names = useMemo(() => shuffle(NAMES).slice(0, 4), [set])

  const [sel, setSel] = useState<number | null>(null)
  const [chip, setChip] = useState<number | null>(null)
  const [found, setFound] = useState<Reason[][]>([[], [], [], []])
  const [learned, setLearned] = useState<number[]>([])
  const [flash, setFlash] = useState<number[]>([])
  const [okCard, setOkCard] = useState<number | null>(null)
  const [more, setMore] = useState(false)
  const sharedLogged = useRef(false)
  const totals = useRef({ own: 0, cards: 0, learned: 0 })
  const cardEls = useRef(new Map<number, HTMLElement | null>())
  const flashT = useRef<number | undefined>(undefined)

  const covered = (f: Reason[][], l: number[]) => [0, 1, 2, 3].every((i) => f[i].length > 0 || l.includes(i))

  const pulse = (cards: number[]) => {
    setFlash(cards)
    window.clearTimeout(flashT.current)
    flashT.current = window.setTimeout(() => setFlash([]), 1800)
  }

  const decide = (neg: boolean) => {
    if (sel === null || chip === null) return
    const card = sel
    const pr = set.props[chip]
    const phrase = neg ? pr.neg : pr.pos
    const holders = holdsFor(pr, neg)
    const L = LET[card]
    if (!holders.includes(card)) {
      S.attempt(false)
      show(`${L} kartına bir daha bak: “${phrase}” ${L} için doğru mu? Belki tersini söylemek istedin.`)
      return
    }
    if (holders.length > 1) {
      S.attempt(false)
      const others = holders.filter((h) => h !== card)
      pulse(others)
      if (holders.length === 4) show(`Dört kartın hepsi için “${phrase}” doğru. Bu bir benzerlik! Yalnızca ${ACC[card]} ayıran bir özellik ara.`)
      else {
        show(`Evet, ${L} için “${phrase}” doğru. Ama ${listJoin(others.map((o) => LET[o]))} için de doğru! Yalnızca ${ACC[card]} ayıran bir özellik ara.`, sharedLogged.current ? undefined : { misc: MIS_SHARED })
        sharedLogged.current = true
      }
      return
    }
    if (found[card].some((r) => r.prop === chip && r.neg === neg)) {
      show('Bu gerekçeyi zaten buldun. Başka bir özellik dener misin?')
      return
    }
    S.attempt(true)
    const next = found.map((f, i) => (i === card ? [...f, { prop: chip, neg }] : f))
    setFound(next)
    sol.add(`${set.id}:${card}:${chip}:${neg ? 1 : 0}`, `${L}: ${phrase}`)
    setOkCard(card)
    window.setTimeout(() => setOkCard(null), 900)
    setSel(null)
    setChip(null)
    const left = [0, 1, 2, 3].filter((i) => next[i].length === 0 && !learned.includes(i))
    show(left.length ? `Evet! ${L} farklı, çünkü “${phrase}” yalnızca ${L} için doğru. ${left.length === 1 ? `Sırada ${LET[left[0]]} var.` : 'Şimdi başka bir kart seç.'}` : `Evet! ${L} farklı, çünkü “${phrase}” yalnızca ${L} için doğru.`, { tone: 'ok' })
    if (!S.done && covered(next, learned)) S.complete()
  }

  const ask = () => {
    const target = [0, 1, 2, 3].find((i) => found[i].length === 0 && !learned.includes(i))
    if (target === undefined) return
    S.hint()
    const r = reasons[target][0]
    const nl = [...learned, target]
    setLearned(nl)
    show(`${names[target]}: “${LET[target]} farklı, çünkü yalnızca ${LET[target]} → ${phraseOf(set, r)}.” Sen de başka kartlar için gerekçe bulabilir misin?`)
    pulse([target])
    if (!S.done && covered(found, nl)) S.complete()
  }

  const tapCard = (i: number) => {
    setSel((s) => (s === i ? null : i))
  }
  const tapChip = (k: number) => setChip((c) => (c === k ? null : k))
  const drag = useTileDrag<number>({
    onTap: tapChip,
    onDrop: (k, x, y) => {
      const hit = hitZone(cardEls.current, x, y, 4)
      if (hit === null) return
      setSel(hit)
      setChip(k)
    },
    ghost: (k) => <span className="chip bg-amber-300 px-4 py-2 text-base font-extrabold text-amber-950 shadow-lg"><MathText text={set.props[k].pos} /></span>,
  })

  const next = () => {
    const own = found.filter((f) => f.length > 0).length
    totals.current.own += own
    totals.current.cards += 4
    totals.current.learned += learned.filter((i) => found[i].length === 0).length
    if (S.last) {
      const t = totals.current
      const r = t.own / t.cards
      onFinish({
        stars: r >= 0.9 ? 3 : r >= 0.6 ? 2 : 1,
        summary: `${tasks.length} grupta ${t.cards} karttan ${t.own} tanesi için kendi gerekçeni buldun; toplam ${sol.list.length} farklı gerekçe kurdun.`,
        insight:
          grade <= 2
            ? 'Her kart başka bir nedenle farklı olabilir: rengine, biçimine, sayısına ya da dizilişine bakmak yeni bir neden bulmanı sağlar.'
            : grade <= 5
              ? '“Hangisi farklı?” sorusunun tek cevabı yoktur: hangi özelliğe baktığına göre her kart farklı olabilir. Önemli olan, özelliğin yalnızca o kartta olduğunu göstermektir.'
              : 'Ayırt edici bir özellik yalnızca bir nesnede bulunmalıdır; ortak özellik ise bir benzerliktir. Aynı değere sahip ifadeler bile biçim, yapı ya da gösterim bakımından ayrılabilir.',
      })
      return
    }
    setSel(null)
    setChip(null)
    setFound([[], [], [], []])
    setLearned([])
    setFlash([])
    setMore(false)
    clear()
    S.next()
  }

  const nOwn = found.filter((f) => f.length > 0).length
  const nCovered = [0, 1, 2, 3].filter((i) => found[i].length > 0 || learned.includes(i)).length

  const instr =
    sel === null && chip === null
      ? 'Bir karta dokun, sonra onu farklı yapan özelliği seç. Çipi karta sürükleyebilirsin de.'
      : sel === null
        ? 'Şimdi bu özelliğin ait olduğu karta dokun.'
        : chip === null
          ? `${LET[sel]} kartını seçtin. Onu diğerlerinden ayıran özellik hangisi?`
          : 'Gerekçeni kur: özellik yalnızca bu kartta mı var, yoksa yalnızca bu kartta mı yok?'

  const chipCls = (k: number) =>
    `${big ? 'min-h-14 text-base' : 'min-h-12 text-[15px]'} rounded-2xl px-3 py-1.5 text-left font-extrabold transition touch-none select-none ${
      chip === k ? 'bg-amber-300 text-amber-950 ring-4 ring-amber-200' : 'bg-white text-ink ring-1 ring-line shadow-[0_3px_0_#e7e8f2] hover:bg-amber-50'
    } ${drag.dragging === k ? 'opacity-40' : ''}`

  const showTools = !S.done || more || sel !== null
  const panel = (
    <>
      {S.done && !showTools && (
        <button type="button" onClick={() => setMore(true)} className="btn-ghost min-h-12 w-full text-sm"><Plus size={16} />Yeni gerekçe ekle</button>
      )}
      {showTools && <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
        <p className={`flex items-start gap-2 font-extrabold text-ink-soft ${big ? 'text-base' : 'text-sm'}`}><MousePointerClick size={18} className="mt-0.5 shrink-0 text-brand" />{instr}</p>
        {sel !== null && chip !== null && (
          <div className="mt-3 grid gap-2 animate-fade-up">
            {[false, true].map((neg) => (
              <button key={String(neg)} type="button" data-neg={neg ? 1 : 0} onClick={() => decide(neg)} className={`flex min-h-14 items-center gap-2 rounded-2xl border-2 px-3 py-2 text-left font-black text-ink transition hover:-translate-y-0.5 ${big ? 'text-lg' : 'text-base'}`} style={{ borderColor: CARD_COL[sel], background: `${CARD_COL[sel]}10` }}>
                <span className="grid size-9 shrink-0 place-items-center rounded-xl text-white" style={{ background: CARD_COL[sel] }}>{LET[sel]}</span>
                <span>Yalnızca {LET[sel]}: <MathText text={neg ? set.props[chip].neg : set.props[chip].pos} /></span>
              </button>
            ))}
            <button type="button" onClick={() => { setChip(null); setSel(null) }} className="btn-ghost min-h-12 text-sm"><X size={16} />Vazgeç</button>
          </div>
        )}
      </div>}
      {showTools && <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
        <p className="mb-2 text-sm font-black text-ink">Özellikler</p>
        <div className="flex flex-wrap gap-2">
          {chips.map((k) => (
            <button key={k} type="button" {...drag.bind(k)} data-prop={k} data-handle style={{ touchAction: 'none' }} className={chipCls(k)} aria-pressed={chip === k}>
              <MathText text={set.props[k].pos} />
            </button>
          ))}
        </div>
      </div>}
      {!S.done && sol.list.some((s) => s.key.startsWith(`${set.id}:`)) && (
        <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
          <p className="mb-2 text-sm font-black text-ink">Senin gerekçelerin</p>
          <ul className="grid gap-1.5">
            {[0, 1, 2, 3].flatMap((i) =>
              found[i].map((r) => (
                <li key={`${i}-${r.prop}-${r.neg}`} className="flex items-center gap-2 text-[15px] font-bold text-ink animate-pop">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg text-sm font-black text-white" style={{ background: CARD_COL[i] }}>{LET[i]}</span>
                  <span>Yalnızca {LET[i]}: <MathText text={phraseOf(set, r)} /></span>
                </li>
              )),
            )}
          </ul>
        </div>
      )}
    </>
  )

  const doneBox = (
    <DoneNote title={nOwn === 4 ? 'Dört kartın her biri farklı olabilir!' : 'Her kart için bir gerekçe var!'}>
      <p className="mt-2 text-sm font-black text-green-900">Sınıf arkadaşların ne dedi?</p>
      <ul className="mt-1 grid gap-1.5">
        {[0, 1, 2, 3].map((i) => {
          const mine = found[i]
          const other = reasons[i].find((r) => !mine.some((m) => m.prop === r.prop && m.neg === r.neg)) ?? reasons[i][0]
          const same = mine.some((m) => m.prop === other.prop && m.neg === other.neg)
          return (
            <li key={i} className="flex items-start gap-2 text-[15px] font-bold text-green-950">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg text-sm font-black text-white" style={{ background: CARD_COL[i] }}>{LET[i]}</span>
              <span>
                <b>{names[i]}:</b> “Yalnızca {LET[i]}: <MathText text={phraseOf(set, other)} />.”
                {same ? <span className="ml-1 text-emerald-700">Sen de böyle düşündün.</span> : mine.length ? <span className="ml-1 text-emerald-700">Sen başka bir gerekçe buldun!</span> : null}
              </span>
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-sm font-bold text-green-900">İstersen kartlara yeni gerekçeler eklemeye devam edebilirsin.</p>
      {(S.idx === 1 || S.last) && (
        <StrategyPicker key={S.idx} question="Gerekçe ararken nasıl düşündün?" options={['Kartları ikişer karşılaştırdım', 'Önce ortak özellikleri buldum', 'Her özelliği dört kartta denedim', 'Bir özelliğin tersini düşündüm (“yalnızca o değil”)']} onPick={() => {}} />
      )}
    </DoneNote>
  )

  const prompt = big ? 'Her kart başka bir nedenle farklı olabilir. Dört kartın her biri için bir neden bul!' : 'Dört kartın HER BİRİ “farklı olan” olabilir. Her kart için onu diğerlerinden ayıran bir gerekçe kur.'

  return (
    <ActivityLayout
      grade={grade}
      idx={S.idx}
      total={tasks.length}
      title={set.title.replace(/\[\[|\]\]/g, '')}
      prompt={prompt}
      nudge={nudge}
      onCloseNudge={clear}
      done={S.done}
      doneBox={doneBox}
      onNext={next}
      onHint={nCovered < 4 ? ask : undefined}
      hintLabel="Arkadaşım ne dedi?"
      panel={panel}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <p className={`text-base font-black sm:text-lg ${dark ? 'text-white' : 'text-ink'}`}><MathText text={set.title} /></p>
          <span className={`chip px-3 py-1 text-sm ${dark ? 'bg-slate-700 text-slate-100' : 'bg-white text-ink ring-1 ring-line'}`}>Gerekçeli kart: {nCovered}/4</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {[0, 1, 2, 3].map((i) => {
            const isSel = sel === i
            const fl = flash.includes(i)
            const n = found[i].length
            const ln = learned.includes(i) && n === 0
            return (
              <button
                key={`${set.id}-${i}`}
                ref={(el) => {
                  cardEls.current.set(i, el)
                }}
                type="button"
                onClick={() => tapCard(i)}
                aria-pressed={isSel}
                data-card={i}
                aria-label={`Kart ${LET[i]}${n ? `, ${n} gerekçe` : ''}`}
                className={`relative flex ${big ? 'min-h-[170px]' : 'min-h-[150px]'} flex-col items-center justify-center rounded-3xl bg-white px-2 pt-9 pb-3 transition sm:min-h-[190px] ${
                  isSel ? 'ring-4 -translate-y-0.5 shadow-lg' : fl ? 'ring-4 ring-amber-400 animate-shake' : n ? 'ring-2 ring-emerald-400' : dark ? 'ring-2 ring-slate-500' : 'ring-2 ring-line'
                } ${okCard === i ? 'animate-pop' : ''}`}
                style={isSel ? { ['--tw-ring-color' as string]: CARD_COL[i] } : undefined}
              >
                <span className="absolute top-2 left-2 grid size-9 place-items-center rounded-xl text-lg font-black text-white" style={{ background: CARD_COL[i] }}>{LET[i]}</span>
                {n > 0 && (
                  <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-sm font-black text-white"><Check size={15} strokeWidth={3} />{n}</span>
                )}
                {ln && <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-black text-sky-800"><Ear size={14} />{names[i]}</span>}
                <ShowView show={set.cards[i]} big={big} />
              </button>
            )
          })}
        </div>
        {sol.list.length > 0 && (
          <p className={`px-1 text-sm font-extrabold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>Toplam bulduğun farklı gerekçe: {sol.list.length}</p>
        )}
      </div>
      {drag.ghost}
    </ActivityLayout>
  )
}
