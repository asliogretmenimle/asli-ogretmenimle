import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, Lightbulb, RotateCcw, Scale, Search, Shuffle, Undo2 } from 'lucide-react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { BigButton, Scene, SolutionList, StrategyPicker, useSolutions } from '../../games/kit2'
import { MathText } from '../../components/MathText'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { ek } from '../../lib/generators'
import { Card, Derived, Header, Layout, NextButton, Nudge, PickBtn, isDark, useSession } from '../oruntuden-kurala/ortak'
import { Balance, sideItems, tiltOf, weightsOf, type PanItem } from './Balance'
import { DragCard, DragGhost, DropStage, EqLine, useDnd } from './stage'
import {
  applyNum, applySide, fmtNum, fmtSide, fmtSubst, isIsolated, makeTasks, nval, opKey, opLabel, solutionOf, weight, zoneText,
  type BuildT, type CompareT, type NumSide, type Op, type RestoreT, type Side, type SolveT, type Zone,
} from './model'

/**
 * 59. Eşitliği Koru — eşitlik bir denge ilişkisidir.
 *  - İşlem kartları teraziye sürüklenir: sol kefe, sağ kefe ya da iki kefe birden.
 *  - Tek kefeye yapılan işlem dengeyi bozar (= yerine ≠); öğrenci dengeyi diğer kefeye aynısını yaparak geri kurar.
 *  - 4–5: sayısal eşitlikler (hesaplamadan karşılaştır, kutuya ne koymalı, dengeyi geri kur);
 *    5–8: gizemli kutular / x; 7–8: balonlar (negatif), iki kefede x, eğik terazi (eşitsizlik), yerine koyarak kontrol.
 *  - Farklı geçerli adım sıraları useSolutions ile toplanır.
 */

const VIOLET = '#7c3aed'
type SolApi = ReturnType<typeof useSolutions>
type Common = { grade: Grade; dark: boolean; idx: number; sol: SolApi; onDone: (first: boolean) => void; footer: ReactNode }
type NudgeS = { q: string; mis?: string; tone?: 'ok'; n: number; tool?: boolean } | null

export default function EsitligiKoru({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade), [grade])
  const S = useSession(tasks.length)
  const sol = useSolutions()
  const dark = isDark(grade)
  const t = tasks[S.idx]

  const finish = () => {
    const ways = sol.list.length
    const insight =
      grade === 4
        ? 'Eşittir işareti “sonuç” demek değildir; iki tarafın aynı değerde olduğunu söyler. Bir tarafa ne yapılırsa öbür tarafa da yapılınca denge korunur.'
        : grade === 5
          ? 'Eşitliğin iki tarafına aynı sayıyı eklemek, çıkarmak ya da iki tarafı aynı sayıyla çarpıp bölmek eşitliği bozmaz. Bu yüzden bilinmeyeni farklı yollarla yalnız bırakabiliriz.'
          : grade === 6
            ? 'Denklem bir terazidir: iki kefeye aynı işlemi yaptıkça denge korunur ve bilinmeyen yavaş yavaş yalnız kalır. Bulduğun değeri yerine koyunca terazi yine dengede kalmalıdır.'
            : 'Eşitliğin iki tarafına aynı işlemi uygulamak çözüm kümesini değiştirmez; bu yüzden farklı adım sıraları aynı çözüme götürür. Eşitsizlikte de iki tarafa aynı sayı eklenip çıkarılınca ağır basan taraf değişmez.'
    onFinish({
      stars: S.stars(ways >= 2 ? 1 : ways ? 0.5 : 0),
      summary: `${tasks.length} terazi görevini tamamladın${ways ? `; ${ways} farklı çözüm yolu buldun` : ''}.`,
      insight,
    })
  }

  const footer = S.done ? <NextButton isLast={S.isLast} onNext={S.next} onFinish={finish} /> : null
  const common: Common = { grade, dark, idx: S.idx, sol, onDone: S.complete, footer }

  return (
    <Scene grade={grade}>
      <Header icon={<Scale size={24} />} color={VIOLET} idx={S.idx} total={tasks.length} title={t.title} dark={dark} />
      {t.kind === 'solve' && <SolveView key={S.idx} t={t} {...common} />}
      {t.kind === 'restore' && <RestoreView key={S.idx} t={t} {...common} />}
      {t.kind === 'build' && <BuildView key={S.idx} t={t} {...common} />}
      {t.kind === 'compare' && <CompareView key={S.idx} t={t} {...common} />}
    </Scene>
  )
}

/* ───────────────────────── ortak küçük parçalar ───────────────────────── */

function TaskText({ children, dark }: { children: ReactNode; dark: boolean }) {
  return <div className={`rounded-2xl p-3 text-[15px] leading-snug font-bold ${dark ? 'bg-slate-800/90 text-slate-100 ring-1 ring-slate-600' : 'bg-white/95 text-ink ring-1 ring-line'}`}>{children}</div>
}

function Tools({ onUndo, onReset, onHint, canUndo, dark }: { onUndo: () => void; onReset: () => void; onHint?: () => void; canUndo: boolean; dark: boolean }) {
  const cls = `inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-extrabold ring-1 transition active:scale-95 disabled:opacity-40 ${dark ? 'bg-slate-800 text-slate-100 ring-slate-600' : 'bg-white text-ink ring-line'}`
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onUndo} disabled={!canUndo} className={cls}><Undo2 size={17} />Geri al</button>
      <button type="button" onClick={onReset} disabled={!canUndo} className={cls}><RotateCcw size={17} />Baştan</button>
      {onHint && <button type="button" onClick={onHint} className="grid min-h-12 min-w-12 place-items-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200 active:scale-95" aria-label="İpucu"><Lightbulb size={20} /></button>}
    </div>
  )
}

function CardRow({ children, dark, title = 'İşlem kartları · sürükle ya da dokun' }: { children: ReactNode; dark: boolean; title?: string }) {
  return (
    <div className={`mt-3 rounded-2xl p-3 ${dark ? 'bg-slate-900/60 ring-1 ring-slate-700' : 'bg-white/70 ring-1 ring-line'}`}>
      <p className={`mb-2 text-center text-[11px] font-black tracking-wide uppercase ${dark ? 'text-slate-400' : 'text-ink-soft'}`}>{title}</p>
      <div className="flex flex-wrap justify-center gap-2">{children}</div>
    </div>
  )
}

const useNudge = () => {
  const [nudge, setN] = useState<NudgeS>(null)
  const say = (q: string, o: { mis?: string; tone?: 'ok'; tool?: boolean } = {}) => setN((c) => ({ q, ...o, n: (c?.n ?? 0) + 1 }))
  return { nudge, say, clear: () => setN(null) }
}

/* ───────────────────────── denklem / eşitsizlik ───────────────────────── */

type St = { L: Side; R: Side; op?: Op; z?: Zone; ok: boolean }

function SolveView({ t, grade, dark, idx, sol, onDone, footer }: { t: SolveT } & Common) {
  const track = useTracker()
  const dnd = useDnd()
  const { nudge, say, clear } = useNudge()
  const v = grade <= 5 ? '□' : 'x'
  const boxLabel = grade <= 5 ? '?' : 'x'
  const allowNeg = grade >= 7
  const ineq = t.rel !== '='
  const base = solutionOf(t.L, t.R)!
  const [hist, setHist] = useState<St[]>([{ L: t.L, R: t.R, ok: true }])
  const [sel, setSel] = useState<number | null>(null)
  const [solved, setSolved] = useState(false)
  const [verified, setVerified] = useState(false)
  const [picks, setPicks] = useState<number[]>([])
  const [ineqDone, setIneqDone] = useState(false)
  const [rounds, setRounds] = useState(0)
  const first = useRef(true)
  const itemDone = useRef(false)
  const misLogged = useRef(false)
  const stratLogged = useRef(false)
  const cur = hist[hist.length - 1]
  const myPaths = sol.list.filter((s) => s.key.startsWith(`${idx}:`))

  const valid = (L: Side, R: Side) => {
    const s = solutionOf(L, R)
    if (!s) return false
    if (!ineq) return Math.abs(s.s - t.xv) < 1e-9
    return Math.abs(s.s - base.s) < 1e-9 && Math.sign(s.a) === Math.sign(base.a)
  }

  const relNow = (st: St) => {
    if (!st.ok) return ineq ? '?' : '≠'
    if (!ineq) return '='
    return t.rel
  }

  const angle = ineq ? (cur.ok ? (t.rel === '>' ? -8 : 8) : 0) : tiltOf(weight(cur.R, t.xv) - weight(cur.L, t.xv))

  const apply = (o: Op, z: Zone) => {
    if (solved) return
    setSel(null)
    const nl = z === 'R' ? cur.L : applySide(cur.L, o, allowNeg)
    const nr = z === 'L' ? cur.R : applySide(cur.R, o, allowNeg)
    const err = typeof nl === 'string' ? nl : typeof nr === 'string' ? nr : null
    if (err || typeof nl === 'string' || typeof nr === 'string') {
      const where = typeof nl === 'string' ? 'sol' : 'sağ'
      if (err === 'neg') say(`${where === 'sol' ? 'Sol' : 'Sağ'} kefede o kadar ağırlık yok. ${opLabel(o, v)} yapabilmek için önce kefede ne olmalı? Başka bir kart dene.`)
      else if (err === 'negx') say(`${where === 'sol' ? 'Sol' : 'Sağ'} kefede çıkarılacak kadar kutu yok. Kutular hangi kefede?`)
      else say(`Kefedeki her şeyi ${o.k} eş gruba ayırabilir misin? Kutuların sayısı da ağırlıklar da ${ek(o.k, 'dat')} tam bölünmeli. Önce başka bir adım dene.`)
      return
    }
    const ok = valid(nl, nr)
    const next: St = { L: nl, R: nr, op: o, z, ok }
    const nh = [...hist, next]
    setHist(nh)
    if (cur.ok && !ok) {
      // tek kefeye işlem: denge bozuldu
      sfx.bad()
      track.attempt(false)
      first.current = false
      const mis = misLogged.current ? undefined : 'İşlemi eşitliğin yalnızca bir tarafına uygulama'
      misLogged.current = true
      if (z === 'both') say(`Bu adım dengeyi bozdu. Neden? Kefelere bak.`)
      else say(`“${opLabel(o, v)}” işlemini yalnızca ${zoneText[z]}ye uyguladın; terazi bozuldu. Eşitliği korumak için ${z === 'L' ? 'sağ' : 'sol'} kefeye ne yapmalısın?`, { mis })
      return
    }
    if (!cur.ok && ok) {
      sfx.ok()
      say('Denge yeniden kuruldu! İki kefeye de aynı işlemi yapmış oldun.', { tone: 'ok' })
    } else if (!cur.ok && !ok) {
      say('Terazi hâlâ dengede değil. Geri alıp son işlemi iki kefeye birlikte uygulamayı dene.')
    } else clear()
    if (ok && isIsolated(nl, nr)) win(nh)
  }

  const win = (nh: St[]) => {
    setSolved(true)
    track.attempt(true)
    sfx.ok()
    if (!itemDone.current) {
      itemDone.current = true
      track.item(first.current)
    }
    // yol anahtarı: dengedeki durumların sırası
    const okStates = nh.filter((s) => s.ok)
    const key = `${idx}:` + okStates.map((s) => `${fmtSide(s.L)}|${fmtSide(s.R)}`).join('>')
    const label = okStates.slice(1).map((s) => opLabel(s.op!, v)).join(' → ')
    const firstOp = okStates[1]?.op
    if (firstOp && !stratLogged.current) {
      stratLogged.current = true
      track.strategy(firstOp.t === '/' ? 'Önce bölerek sadeleştirme' : firstOp.x ? 'Bilinmeyenleri bir tarafta toplama' : firstOp.t === '*' ? 'İki tarafı çarparak deneme' : 'Önce sabit terimi yok etme')
    }
    const fresh = t.multi ? sol.add(key, label) : true
    if (t.multi && !fresh) say('Bu yolu zaten bulmuştun. Bu kez ilk adımı farklı seçebilir misin?')
    else if (t.multi) say(myPaths.length >= 1 ? 'İkinci bir yol! Aynı sonuca farklı sırayla ulaştın.' : 'Çözdün! Şimdi başka bir sırayla çözmeyi dene.', { tone: 'ok' })
    else clear()
    if (!ineq && !t.verify) onDone(first.current)
  }

  const undo = () => {
    if (hist.length < 2 || solved) return
    setHist((h) => h.slice(0, -1))
    clear()
  }
  const reset = () => {
    setHist([{ L: t.L, R: t.R, ok: true }])
    setSolved(false)
    setVerified(false)
    clear()
  }
  const again = () => {
    reset()
    setRounds((r) => r + 1)
  }

  const askHint = () => {
    track.hint()
    first.current = false
    const { L, R } = cur
    let q: string
    if (!cur.ok) q = 'Terazi dengede değil. Son işlemi diğer kefeye de yaparsan ne olur?'
    else if (L.x !== 0 && R.x !== 0) q = `İki kefede de ${grade <= 5 ? 'kutu' : 'x'} var. İki kefeden de aynı sayıda kutu alırsan denge bozulur mu?`
    else {
      const xs = L.x !== 0 ? L : R
      if (xs.c > 0) q = `Kutuların yanında ${xs.c} birim ağırlık var. Bu ağırlığı dengeyi bozmadan nasıl kaldırırsın?`
      else if (xs.c < 0) q = `Kutuları ${-xs.c} birimlik balon yukarı çekiyor. Balonun etkisini yok etmek için iki kefeye ne ekleyebilirsin?`
      else q = `Kefede ${Math.abs(xs.x)} eş kutu var. Her iki kefeyi ${Math.abs(xs.x)} eş gruba ayırırsan bir grupta ne olur?`
    }
    say(q, { tool: true })
  }

  // eşitsizlik: kutunun olası ağırlıkları
  const choices = Array.from({ length: 10 }, (_, i) => i + 1)
  const fits = (k: number) => (t.rel === '>' ? weight(t.L, k) > weight(t.R, k) : weight(t.L, k) < weight(t.R, k))
  const checkPicks = () => {
    const want = choices.filter(fits)
    const okSet = want.length === picks.length && want.every((k) => picks.includes(k))
    track.attempt(okSet)
    if (okSet) {
      sfx.ok()
      setIneqDone(true)
      if (!itemDone.current) itemDone.current = true
      onDone(first.current)
      say(`Evet! ${base.s} ve ondan ${t.rel === '>' ? 'küçük' : 'büyük'} sayılar olmaz. Peki ${t.rel === '>' ? `${base.s},5` : `${base.s - 1},5`} gibi ondalık bir ağırlık da olabilir mi?`, { tone: 'ok' })
      return
    }
    first.current = false
    sfx.bad()
    if (picks.includes(base.s)) say(`Kutu ${base.s} olursa kefeler dengede kalır. Bu durumda bir kefe “ağır basar” mı?`, { mis: 'Eşitsizliğin sınır değerini çözüme katma' })
    else if (picks.some((k) => !fits(k))) say(`Seçtiğin sayılardan birini kutulara koyup kefeleri hesapla. ${t.rel === '>' ? 'Sol' : 'Sağ'} kefe gerçekten ağır basıyor mu?`)
    else say('Hepsini buldun mu? Kutunun alabileceği başka ağırlıklar da var mı?')
  }

  const showOrig = verified
  const leftItems = sideItems(showOrig ? t.L : cur.L, showOrig ? String(t.xv) : boxLabel)
  const rightItems = sideItems(showOrig ? t.R : cur.R, showOrig ? String(t.xv) : boxLabel)
  const iso = solved ? (cur.L.x === 1 ? { a: v, b: fmtSide(cur.R, v) } : { a: v, b: fmtSide(cur.L, v) }) : null
  const finalRel = ineq ? (cur.L.x === 1 ? t.rel : t.rel === '>' ? '<' : '>') : '='
  const needVerify = !ineq && t.verify && solved && !verified

  const work = (
    <div className="flex flex-col gap-2">
      <EqLine left={fmtSide(showOrig ? t.L : cur.L, v)} rel={showOrig ? '=' : relNow(cur)} right={fmtSide(showOrig ? t.R : cur.R, v)} broken={!cur.ok && !showOrig} dark={dark} />
      <DropStage dnd={dnd} zones={['L', 'both', 'R']} armed={sel !== null} onZone={(z) => sel !== null && apply(t.cards[sel], z)} dark={dark}>
        <Balance left={leftItems} right={rightItems} angle={showOrig ? 0 : angle} wobble={ineq && !cur.ok} dark={dark} label={`Terazi: ${fmtSide(cur.L, v)} ${relNow(cur)} ${fmtSide(cur.R, v)}`} />
      </DropStage>
      {!solved && (
        <CardRow dark={dark}>
          {t.cards.map((c, i) => (
            <DragCard key={i} label={opLabel(c, v)} selected={sel === i} onTap={() => setSel((s) => (s === i ? null : i))} onDrop={(z) => apply(c, z)} dnd={dnd} dark={dark} />
          ))}
        </CardRow>
      )}
      <DragGhost dnd={dnd} />
      <p className={`text-center text-sm font-bold ${dark ? 'text-slate-400' : 'text-ink-soft'}`}>
        {sel !== null ? `Şimdi kartı nereye uygulayacağını seç: sol kefe, iki kefe ya da sağ kefe.` : solved ? (ineq ? 'Bilinmeyen yalnız kaldı.' : 'Kutu yalnız kaldı!') : `Kartı bir kefeye ya da ortadaki “iki kefe” bölgesine sürükle. Amaç: ${grade <= 5 ? 'kutuyu' : 'x’i'} yalnız bırakmak.`}
      </p>
    </div>
  )

  const panel = (
    <>
      <TaskText dark={dark}>
        {t.story ? <MathText text={t.story} /> : <>Terazi dengede. Kutuyu yalnız bırak; ama her adımdan sonra terazi dengede kalsın. Her kutu aynı ağırlıkta.</>}
      </TaskText>
      <Card title="Adımlarım" dark={dark}>
        <ol className="flex flex-col gap-1 text-[15px] font-black tabular-nums">
          {hist.map((s, i) => (
            <li key={i} className="flex flex-wrap items-center gap-x-2">
              {s.op && <span className={`rounded-lg px-1.5 py-0.5 text-xs font-extrabold ${s.ok ? (dark ? 'bg-violet-500/25 text-violet-200' : 'bg-violet-50 text-violet-800') : 'bg-rose-100 text-rose-700'}`}>{opLabel(s.op, v)} · {zoneText[s.z!]}</span>}
              <span className={s.ok ? '' : 'text-rose-500'}><MathText text={`${fmtSide(s.L, v)} ${relNow(s)} ${fmtSide(s.R, v)}`} /></span>
            </li>
          ))}
        </ol>
      </Card>
      {!solved && <Tools onUndo={undo} onReset={reset} onHint={askHint} canUndo={hist.length > 1} dark={dark} />}
      {nudge && <Nudge key={nudge.n} question={nudge.q} misconception={nudge.mis} tone={nudge.tone} tool={nudge.tool ? 'balance' : undefined} toolConfig={{}} toolTitle="Terazi" />}
      {solved && iso && (
        <Derived>
          {ineq ? <MathText text={`${v} ${finalRel} ${iso.b}`} /> : <MathText text={`${v} = ${iso.b}`} />}
          {!ineq && <span className="mt-1 block text-sm font-extrabold text-green-800">Her {grade <= 5 ? 'kutu' : 'x kutusu'} {t.xv} birim.</span>}
        </Derived>
      )}
      {needVerify && (
        <BigButton onClick={() => { setVerified(true); sfx.ok(); onDone(first.current) }} className="w-full"><Search size={20} />Yerine koyarak kontrol et</BigButton>
      )}
      {verified && (
        <Derived tone="info">
          <span className="block text-xs font-black tracking-wide uppercase">{v} yerine {t.xv} koy</span>
          <MathText text={`${fmtSubst(t.L, t.xv)} = ${fmtSubst(t.R, t.xv)}`} />
          <span className="block"><MathText text={`${weight(t.L, t.xv)} = ${weight(t.R, t.xv)} ✓`} /></span>
        </Derived>
      )}
      {solved && ineq && !ineqDone && (
        <Card title={`Kutu kaç birim olabilir? Uyanların hepsini seç`} dark={dark}>
          <div className="grid grid-cols-5 gap-1.5">
            {choices.map((k) => (
              <PickBtn key={k} on={picks.includes(k)} dark={dark} onClick={() => setPicks((p) => (p.includes(k) ? p.filter((q) => q !== k) : [...p, k]))}>{k}</PickBtn>
            ))}
          </div>
          <BigButton onClick={checkPicks} disabled={!picks.length} className="mt-2 w-full"><Check size={20} />Kontrol et</BigButton>
        </Card>
      )}
      {t.multi && solved && (
        <>
          <SolutionList list={myPaths} goal={2} />
          <BigButton variant="ghost" onClick={again} className="w-full"><Shuffle size={20} />Başka bir yoldan çöz</BigButton>
          {myPaths.length >= 1 && rounds === 0 && <StrategyPicker question="İlk adımını neye göre seçtin?" options={['Önce ağırlıkları kaldırdım', 'Önce gruplara ayırdım (böldüm)', 'Önce kutuları bir kefede topladım', 'Deneyerek buldum']} onPick={() => undefined} />}
        </>
      )}
      {((solved && (ineq ? ineqDone : !t.verify || verified)) || rounds > 0) && footer}
    </>
  )

  return <Layout work={work} panel={panel} />
}

/* ───────────────────────── dengeyi geri kur (sayısal) ───────────────────────── */

function numItems(s: NumSide): PanItem[] {
  const one: PanItem[] = s.terms.flatMap((v) => (Math.abs(v) <= 12 ? weightsOf(v) : [{ kind: 'w' as const, label: String(Math.abs(v)), size: 1.2, neg: v < 0 }]))
  if (s.f === 1) return one
  if (s.f <= 3 && one.length * s.f <= 14) return Array.from({ length: s.f }, () => one).flat()
  return weightsOf(nval(s))
}

function RestoreView({ t, grade, dark, idx, sol, onDone, footer }: { t: RestoreT } & Common) {
  const track = useTracker()
  const dnd = useDnd()
  const { nudge, say, clear } = useNudge()
  const disrupted = () => {
    const L = t.dis.z === 'L' ? applyNum(t.L, t.dis.o) : t.L
    const R = t.dis.z === 'R' ? applyNum(t.R, t.dis.o) : t.R
    return { L: L as NumSide, R: R as NumSide }
  }
  const [st, setSt] = useState<{ L: NumSide; R: NumSide }>({ L: t.L, R: t.R })
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro')
  const [moves, setMoves] = useState<string[]>([])
  const [sel, setSel] = useState<number | null>(null)
  const first = useRef(true)
  const itemDone = useRef(false)
  const myWays = sol.list.filter((s) => s.key.startsWith(`${idx}:`))

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSt(disrupted())
      setPhase('play')
      sfx.bad()
    }, 1300)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const bal = nval(st.L) === nval(st.R)
  const apply = (o: Op, z: Zone) => {
    if (phase !== 'play') return
    setSel(null)
    const L = z === 'R' ? st.L : applyNum(st.L, o)
    const R = z === 'L' ? st.R : applyNum(st.R, o)
    if (typeof L === 'string' || typeof R === 'string') {
      const e = typeof L === 'string' ? L : R
      say(e === 'neg' ? 'Kefede o kadar ağırlık yok. Başka bir kart dene.' : 'Bu kefe o kadar eş parçaya ayrılamıyor. Başka bir kart dene.')
      return
    }
    const mv = [...moves, `${z}:${opKey(o)}`]
    setMoves(mv)
    setSt({ L, R })
    const ok = nval(L) === nval(R)
    if (!ok) {
      if (z === 'both') say('İki kefeye de aynı şeyi yaptın; ama terazi zaten bozuktu. Aradaki fark kapandı mı? Hangi kefe ağır basıyor?')
      else say(`Terazi hâlâ dengede değil. Şu an sol kefe ${nval(L)}, sağ kefe ${nval(R)}. Hangisine ne yapmalısın?`)
      first.current = false
      track.attempt(false)
      return
    }
    // dengelendi
    track.attempt(true)
    sfx.ok()
    setPhase('done')
    if (!itemDone.current) {
      itemDone.current = true
      track.item(first.current)
      onDone(first.current)
    }
    const lab = mv.map((m) => {
      const [zz, k] = m.split(':')
      const sign = k[0] === '+' ? '+' : k[0] === '-' ? '−' : k[0] === '*' ? '×' : '÷'
      return `${zz === 'L' ? 'Sol' : zz === 'R' ? 'Sağ' : 'İki'} kefe ${sign}${k.slice(1)}`
    }).join(', ')
    const fresh = sol.add(`${idx}:${mv.join('>')}`, lab)
    const undoing = mv.length === 1 && mv[0].startsWith(t.dis.z)
    track.strategy(undoing ? 'Bozan işlemi ters işlemle geri alma' : 'Diğer kefeye aynı işlemi yapma')
    say(fresh ? (myWays.length ? 'Bir yol daha! Dengeyi kurmanın birden çok yolu var.' : 'Denge geri geldi! Başka bir yolla da dengeleyebilir misin?') : 'Bu yolu zaten bulmuştun. Başka bir kart ya da başka bir kefe dene!', { tone: fresh ? 'ok' : undefined })
  }

  const again = () => {
    setSt(disrupted())
    setMoves([])
    setPhase('play')
    clear()
  }

  const angle = tiltOf(nval(st.R) - nval(st.L))
  const work = (
    <div className="flex flex-col gap-2">
      <EqLine left={fmtNum(st.L)} rel={bal ? '=' : '≠'} right={fmtNum(st.R)} broken={!bal} dark={dark} />
      <DropStage dnd={dnd} zones={['L', 'both', 'R']} armed={sel !== null} onZone={(z) => sel !== null && apply(t.cards[sel], z)} dark={dark}>
        <Balance left={numItems(st.L)} right={numItems(st.R)} angle={angle} dark={dark} />
      </DropStage>
      {phase === 'play' && (
        <CardRow dark={dark}>
          {t.cards.map((c, i) => (
            <DragCard key={i} big={grade <= 4} label={opLabel(c)} selected={sel === i} onTap={() => setSel((s) => (s === i ? null : i))} onDrop={(z) => apply(c, z)} dnd={dnd} dark={dark} />
          ))}
        </CardRow>
      )}
      <DragGhost dnd={dnd} />
    </div>
  )
  const panel = (
    <>
      <TaskText dark={dark}>
        {phase === 'intro' ? <>Terazi dengede: <b><MathText text={`${fmtNum(t.L)} = ${fmtNum(t.R)}`} /></b>. Dikkatle izle…</> : <><b>{t.story}</b> Bir kartı bir kefeye sürükleyerek dengeyi yeniden kur.</>}
      </TaskText>
      <Card title="Önce" dark={dark}>
        <p className="text-lg font-black tabular-nums"><MathText text={`${fmtNum(t.L)} = ${fmtNum(t.R)}`} /> <span className="text-sm font-bold text-green-600">dengede</span></p>
      </Card>
      {phase === 'play' && moves.length > 0 && <button type="button" onClick={again} className={`inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-extrabold ring-1 active:scale-95 ${dark ? 'bg-slate-800 text-slate-100 ring-slate-600' : 'bg-white text-ink ring-line'}`}><RotateCcw size={17} />Baştan</button>}
      {nudge && <Nudge key={nudge.n} question={nudge.q} tone={nudge.tone} />}
      <SolutionList list={myWays} goal={2} />
      {phase === 'done' && (
        <>
          <BigButton variant="ghost" onClick={again} className="w-full"><Shuffle size={20} />Başka bir yolla dengele</BigButton>
          {footer}
        </>
      )}
    </>
  )
  return <Layout work={work} panel={panel} />
}

/* ───────────────────────── kutuya ne koymalı? ───────────────────────── */

const termsText = (ts: number[]) => ts.map((v, i) => (i === 0 ? String(v) : v < 0 ? `− ${-v}` : `+ ${v}`)).join(' ')

function BuildView({ t, dark, onDone, footer }: { t: BuildT } & Common) {
  const track = useTracker()
  const dnd = useDnd()
  const { nudge, say, clear } = useNudge()
  const [slot, setSlot] = useState<number[]>([])
  const [done, setDone] = useState(false)
  const [sel, setSel] = useState<number | null>(null)
  const first = useRef(true)
  const sum = slot.reduce((a, b) => a + b, 0)
  const lv = t.L.reduce((a, b) => a + b, 0)
  const rv = sum + t.R.reduce((a, b) => a + b, 0)
  const rightText = `${slot.length ? `[${sum}]` : '□'} ${t.R.map((v) => (v < 0 ? `− ${-v}` : `+ ${v}`)).join(' ')}`
  const add = (k: number) => {
    if (done) return
    setSel(null)
    clear()
    setSlot((s) => (s.length >= 12 ? s : [...s, k]))
  }
  const check = () => {
    const ok = lv === rv
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      setDone(true)
      track.item(first.current)
      onDone(first.current)
      say('Terazi dengede! İki tarafın değeri aynı.', { tone: 'ok' })
      return
    }
    first.current = false
    sfx.bad()
    if (sum === lv) say(`Kutuya ${lv} koydun: ${termsText(t.L)} işleminin sonucu. Ama sağ kefede ${t.R[0] < 0 ? 'bir balon' : 'başka ağırlık'} da var. Sağ taraf şimdi kaç ediyor?`, { mis: 'Eşittir işaretini “sonucu yaz” olarak görme' })
    else if (sum === lv + Math.abs(t.R[0])) say('Bütün sayıları topladın gibi görünüyor. Eşittir işareti “iki taraf aynı değerde” demek. Sağ kefe sol kefeyle aynı mı?', { mis: 'Eşitlikteki tüm sayıları toplama' })
    else say(lv > rv ? 'Sol kefe ağır basıyor. Kutuya daha çok mu, daha az mı koymalısın?' : 'Sağ kefe ağır basıyor. Kutudan bir şey çıkarmalı mısın?')
  }
  const rightItems: PanItem[] = [...slot.map((k) => ({ kind: 'w' as const, label: String(k), size: k >= 10 ? 1.15 : k >= 5 ? 1 : 0.8, hl: true })), ...t.R.flatMap((v) => weightsOf(v))]
  const leftItems: PanItem[] = t.L.flatMap((v) => (Math.abs(v) <= 12 ? weightsOf(v) : [{ kind: 'w' as const, label: String(Math.abs(v)), size: 1.25, neg: v < 0 }]))
  const work = (
    <div className="flex flex-col gap-2">
      <EqLine left={termsText(t.L)} rel={done ? '=' : lv === rv ? '=' : '?'} right={rightText.replace(/\[(\d+)\]/, '$1')} dark={dark} />
      <DropStage dnd={dnd} zones={['R']} armed={sel !== null} onZone={() => sel !== null && add(sel)} dark={dark}>
        <Balance left={leftItems} right={rightItems} angle={tiltOf(rv - lv)} dark={dark} />
      </DropStage>
      {!done && (
        <CardRow dark={dark} title="Ağırlıklar · sağ kefedeki kutuya sürükle ya da dokun">
          {t.chips.map((k) => (
            <DragCard key={k} big label={String(k)} color="#0d9488" selected={sel === k} onTap={() => add(k)} onDrop={() => add(k)} dnd={dnd} dark={dark} />
          ))}
        </CardRow>
      )}
      <DragGhost dnd={dnd} />
    </div>
  )
  const panel = (
    <>
      <TaskText dark={dark}>
        Sağ kefedeki kutuya (□) yeşil ağırlıklar koy. <b>Kutuya ne koyarsan terazi dengede kalır?</b>
      </TaskText>
      <Card title={`Kutudaki ağırlıklar: ${sum}`} dark={dark}>
        <div className="flex min-h-12 flex-wrap gap-1.5">
          {slot.length === 0 && <span className="self-center text-sm font-bold opacity-60">Kutu boş</span>}
          {slot.map((k, i) => (
            <button key={i} type="button" disabled={done} onClick={() => { setSlot((s) => s.filter((_, j) => j !== i)); clear() }} className="min-h-12 min-w-12 rounded-xl bg-teal-500 px-2 text-lg font-black text-white shadow active:scale-95" aria-label={`${k} ağırlığını çıkar`}>{k}</button>
          ))}
        </div>
        {slot.length > 0 && !done && <p className="mt-1 text-xs font-bold opacity-70">Çıkarmak için ağırlığa dokun.</p>}
      </Card>
      {!done && <BigButton onClick={check} disabled={!slot.length} className="w-full"><Check size={20} />Kontrol et</BigButton>}
      {nudge && <Nudge key={nudge.n} question={nudge.q} misconception={nudge.mis} tone={nudge.tone} />}
      {done && (
        <>
          <Derived>
            <MathText text={`${termsText(t.L)} = ${t.ans} ${t.R.map((v) => (v < 0 ? `− ${-v}` : `+ ${v}`)).join(' ')}`} />
            <span className="block text-base"><MathText text={`${lv} = ${lv}`} /></span>
          </Derived>
          <StrategyPicker options={['İki tarafı ayrı ayrı hesapladım', 'Sayıları karşılaştırdım', 'Ağırlık ekleyip teraziye baktım']} onPick={() => undefined} />
          {footer}
        </>
      )}
    </>
  )
  return <Layout work={work} panel={panel} />
}

/* ───────────────────────── hangi kefe ağır? ───────────────────────── */

type Pred = 'L' | 'eq' | 'R'
function CompareView({ t, dark, onDone, footer }: { t: CompareT } & Common) {
  const track = useTracker()
  const { nudge, say, clear } = useNudge()
  const [k, setK] = useState(0)
  const [pred, setPred] = useState<Pred | null>(null)
  const [allFirst, setAllFirst] = useState(true)
  const [over, setOver] = useState(false)
  const p = t.pairs[k]
  const sL = p.L.reduce((a, b) => a + b.v, 0)
  const sR = p.R.reduce((a, b) => a + b.v, 0)
  const truth: Pred = sL > sR ? 'L' : sL < sR ? 'R' : 'eq'
  const items = (xs: { label: string; v: number }[]): PanItem[] => xs.map((x) => ({ kind: 'w', label: x.label.replace('−', ''), size: 1.25, neg: x.v < 0 }))
  const choose = (q: Pred) => {
    if (pred) return
    setPred(q)
    const ok = q === truth
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      say(truth === 'eq' ? 'Evet, terazi dengede kaldı! Hesaplamadan nasıl anladın?' : 'Evet! Hesaplamadan nasıl anladın?', { tone: 'ok' })
    } else {
      sfx.bad()
      setAllFirst(false)
      say(p.why, { mis: truth === 'eq' ? 'Eşitliği yalnızca hesaplayarak kontrol etme (ilişkisel düşünmeme)' : undefined })
    }
  }
  const nextPair = () => {
    clear()
    if (k + 1 < t.pairs.length) {
      setK(k + 1)
      setPred(null)
    } else {
      setOver(true)
    }
  }
  const textOf = (xs: { label: string; v: number }[]) => xs.map((x, i) => (i === 0 ? x.label : x.v < 0 ? `− ${x.label.replace('−', '')}` : `+ ${x.label}`)).join(' ')
  const relSign = pred ? (truth === 'L' ? '>' : truth === 'R' ? '<' : '=') : '?'
  const work = (
    <div className="flex flex-col gap-2">
      <EqLine left={textOf(p.L)} rel={relSign} right={textOf(p.R)} dark={dark} />
      <Balance key={k} left={items(p.L)} right={items(p.R)} angle={tiltOf((sR - sL) / 3)} support={!pred} dark={dark} />
      <p className={`text-center text-sm font-bold ${dark ? 'text-slate-400' : 'text-ink-soft'}`}>{pred ? 'Takozlar çekildi.' : 'Terazi takozlarla kilitli. Hesaplamadan tahmin et: takozları çekince ne olur?'}</p>
    </div>
  )
  const opts: { q: Pred; label: string }[] = [
    { q: 'L', label: '⬅ Sol ağır basar' },
    { q: 'eq', label: '⚖ Dengede kalır' },
    { q: 'R', label: 'Sağ ağır basar ➡' },
  ]
  const panel = (
    <>
      <TaskText dark={dark}>Terazi {k + 1} / {t.pairs.length}: kefelerdeki ağırlıklara bak. <b>Hesaplamadan</b> karar ver.</TaskText>
      <div className="flex flex-col gap-2">
        {opts.map((o) => (
          <PickBtn key={o.q} on={pred === o.q} disabled={!!pred && pred !== o.q} dark={dark} onClick={() => choose(o.q)} className="min-h-14 text-lg">{o.label}</PickBtn>
        ))}
      </div>
      {nudge && <Nudge key={nudge.n} question={nudge.q} misconception={nudge.mis} tone={nudge.tone} />}
      {pred && !over && <BigButton onClick={nextPair} className="w-full">{k + 1 < t.pairs.length ? 'Sonraki terazi' : 'Tamam'}</BigButton>}
      {over && (
        <>
          <StrategyPicker options={['Her iki tarafı hesapladım', 'Sayıların ne kadar değiştiğine baktım', 'Tahmin ettim']} onPick={() => { track.item(allFirst); onDone(allFirst) }} />
          {footer}
        </>
      )}
    </>
  )
  return <Layout work={work} panel={panel} />
}
