import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, Copy, Layers, Lightbulb, ListOrdered, RotateCcw, Shuffle, Trash2, Undo2, Wand2 } from 'lucide-react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { BigButton, Scene, SolutionList, StrategyPicker, useSolutions } from '../../games/kit2'
import { MathText } from '../../components/MathText'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { ek } from '../../lib/generators'
import { Card, Derived, Header, Layout, NextButton, Nudge, NumPad, PickBtn, isDark, parseNum, useSession } from '../oruntuden-kurala/ortak'
import { countsOf, fmtCounts, fmtNet, fmtRaw, fmtSubst, hasZeroPair, makeTasks, makeTiles, netOf, newId, valueOf, type BuildT, type Counts, type EqT, type EvalT, type JudgeT, type Kind, type MulT, type SideId, type SimplifyT, type Tile } from './model'
import { Bin, ExprEntry, Ghost, SideMat, TileFace, useTileDnd, type Src, type Target } from './tiles'

/**
 * 60. Cebir Karolarıyla Denklem
 *  - x karosu (uzun), 1 karosu (kare); kırmızılar negatif. Zıt iki karo bir “sıfır çifti”dir: üst üste sürükleyince yok olur.
 *  - Her karo hamlesi sembolik satıra yansır (ham yazım: sıfır çiftleri görünür).
 *  - Denklem matı: bir tarafa yapılan hamle eşitliği bozar (≠); “Aynısını öbür tarafa yap” ya da elle dengele.
 *    Tüm karolar k eş gruba ayrılabiliyorsa “Gruplara ayır → bir grubu tut” (÷k).
 *  - 6: ifade kurma, benzer terimler, değer verme, denklem; 7: negatif karolar, ifadeleri toplama, sayıyla çarpma;
 *    8: aynı ifadenin farklı modelleri, iki tarafta x, yerine koyarak doğrulama.
 */

const VIOLET = '#7c3aed'
type SolApi = ReturnType<typeof useSolutions>
type Common = { grade: Grade; dark: boolean; idx: number; sol: SolApi; onDone: (first: boolean) => void; footer: ReactNode }
type NudgeS = { q: string; mis?: string; tone?: 'ok'; n: number; tool?: boolean } | null

const useNudge = () => {
  const [nudge, setN] = useState<NudgeS>(null)
  const say = (q: string, o: { mis?: string; tone?: 'ok'; tool?: boolean } = {}) => setN((c) => ({ q, ...o, n: (c?.n ?? 0) + 1 }))
  return { nudge, say, clear: () => setN(null) }
}

const kindsFor = (grade: Grade): { k: Kind; neg: boolean }[] =>
  grade <= 6 ? [{ k: 'x', neg: false }, { k: '1', neg: false }] : [{ k: 'x', neg: false }, { k: 'x', neg: true }, { k: '1', neg: false }, { k: '1', neg: true }]

export default function CebirKarolari({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade), [grade])
  const S = useSession(tasks.length)
  const sol = useSolutions()
  const dark = isDark(grade)
  const t = tasks[S.idx]
  const finish = () => {
    const ways = sol.list.length
    onFinish({
      stars: S.stars(ways >= 2 ? 1 : ways ? 0.5 : 0),
      summary: `${tasks.length} karo görevini tamamladın${ways ? `; ${ways} farklı model ya da çözüm yolu buldun` : ''}.`,
      insight:
        grade === 6
          ? 'Karolar bir ifadenin resmidir: aynı türden karolar bir araya gelir (x + 2x = 3x). Denklemi çözerken iki taraftan aynı karoları kaldırır, sonra kalanları eş gruplara ayırırız.'
          : grade === 7
            ? 'Bir pozitif ve bir negatif karo birbirini götürür (sıfır çifti). İfadeleri toplarken ve denklem çözerken sıfır çiftleri kurup kaldırmak, eşitliği bozmadan sadeleştirmenin yoludur.'
            : 'Aynı ifade sıfır çiftleri eklenerek farklı karolarla gösterilebilir. Denklemin iki tarafına aynı işlem uygulandıkça çözüm değişmez; bulunan değer yerine konunca iki taraf eşit çıkmalıdır.',
    })
  }
  const footer = S.done ? <NextButton isLast={S.isLast} onNext={S.next} onFinish={finish} /> : null
  const common: Common = { grade, dark, idx: S.idx, sol, onDone: S.complete, footer }
  return (
    <Scene grade={grade}>
      <Header icon={<Layers size={24} />} color={VIOLET} idx={S.idx} total={tasks.length} title={t.title} dark={dark} />
      {t.kind === 'build' && <BuildView key={S.idx} t={t} {...common} />}
      {t.kind === 'simplify' && <SimplifyView key={S.idx} t={t} {...common} />}
      {t.kind === 'evaluate' && <EvalView key={S.idx} t={t} {...common} />}
      {t.kind === 'multiply' && <MulView key={S.idx} t={t} {...common} />}
      {t.kind === 'equation' && <EqView key={S.idx} t={t} {...common} />}
      {t.kind === 'judge' && <JudgeView key={S.idx} t={t} {...common} />}
    </Scene>
  )
}

/* ───────────────────────── ortak mat durumu ───────────────────────── */

type Mat = Partial<Record<SideId, Tile[]>>
type Act = { type: 'add' | 'remove'; side: SideId; k: Kind; neg: boolean } | { type: 'zero'; side: SideId }
const isPair = (a: Tile, b: Tile) => a.k === b.k && a.neg !== b.neg

function useMat(init: () => Mat, opts: { single?: boolean; noRemove?: boolean; noAdd?: boolean; onAct?: (next: Mat, act: Act, prev: Mat) => void; onIllegal?: (why: 'cross' | 'remove') => void }) {
  const [m, setMState] = useState<Mat>(init)
  const ref = useRef(m)
  const [sel, setSel] = useState<{ side: SideId; id: number } | null>(null)
  const [picked, setPicked] = useState<{ k: Kind; neg: boolean } | null>(null)
  const set = (next: Mat) => {
    ref.current = next
    setMState(next)
  }
  const commit = (next: Mat, act: Act) => {
    const prev = ref.current
    set(next)
    setSel(null)
    opts.onAct?.(next, act, prev)
  }
  const add = (side: SideId, k: Kind, neg: boolean) => {
    if (opts.noAdd) return
    const cur = ref.current
    commit({ ...cur, [side]: [...(cur[side] ?? []), { id: newId(), k, neg }] }, { type: 'add', side, k, neg })
  }
  const remove = (side: SideId, id: number) => {
    if (opts.noRemove) return opts.onIllegal?.('remove')
    const cur = ref.current
    const tile = cur[side]?.find((x) => x.id === id)
    if (!tile) return
    commit({ ...cur, [side]: cur[side]!.filter((x) => x.id !== id) }, { type: 'remove', side, k: tile.k, neg: tile.neg })
  }
  const zero = (side: SideId, a: number, b: number) => {
    const cur = ref.current
    sfx.ok()
    commit({ ...cur, [side]: cur[side]!.filter((x) => x.id !== a && x.id !== b) }, { type: 'zero', side })
  }
  const onDrop = (src: Src, to: Target) => {
    if (!to) return
    if (src.from === 'bin') {
      if (to.t === 'side' || to.t === 'tile') add(to.side, src.k, src.neg)
      return
    }
    if (to.t === 'bin') return remove(src.from, src.id)
    if (to.t === 'tile' || to.t === 'side') {
      if (to.side !== src.from) return opts.onIllegal?.('cross')
      if (to.t === 'tile' && to.id !== src.id) {
        const a = ref.current[src.from]?.find((x) => x.id === src.id)
        const b = ref.current[to.side]?.find((x) => x.id === to.id)
        if (a && b && isPair(a, b)) zero(to.side, a.id, b.id)
      }
    }
  }
  const tapTile = (side: SideId, t: Tile) => {
    if (picked && !opts.single) return add(side, picked.k, picked.neg)
    if (sel && sel.side === side && sel.id !== t.id) {
      const a = ref.current[side]?.find((x) => x.id === sel.id)
      if (a && isPair(a, t)) return zero(side, a.id, t.id)
    }
    setSel((s) => (s && s.side === side && s.id === t.id ? null : { side, id: t.id }))
  }
  const tapSide = (side: SideId) => {
    if (picked) add(side, picked.k, picked.neg)
    else setSel(null)
  }
  const pick = (k: Kind, neg: boolean) => {
    if (opts.single) return add('E', k, neg)
    setSel(null)
    setPicked((p) => (p && p.k === k && p.neg === neg ? null : { k, neg }))
  }
  const removeSel = () => sel && remove(sel.side, sel.id)
  const reset = (next: Mat) => {
    set(next)
    setSel(null)
    setPicked(null)
  }
  return { m, ref, sel, picked, setPicked, add, remove, zero, onDrop, tapTile, tapSide, pick, removeSel, reset, set }
}

function TaskText({ children, dark }: { children: ReactNode; dark: boolean }) {
  return <div className={`rounded-2xl p-3 text-[15px] leading-snug font-bold ${dark ? 'bg-slate-800/90 text-slate-100 ring-1 ring-slate-600' : 'bg-white/95 text-ink ring-1 ring-line'}`}>{children}</div>
}

function SymLine({ children, dark, broken }: { children: ReactNode; dark: boolean; broken?: boolean }) {
  return (
    <div className={`flex min-h-14 flex-wrap items-center justify-center gap-x-3 rounded-2xl px-4 py-2 text-2xl font-black tabular-nums sm:text-3xl ${dark ? 'bg-slate-900/70 text-white ring-1 ring-slate-600' : 'bg-white/95 text-ink ring-1 ring-line'} ${broken ? 'ring-2 ring-rose-400' : ''}`} aria-live="polite">
      {children}
    </div>
  )
}

const toolCls = (dark: boolean) => `inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-extrabold ring-1 transition active:scale-95 disabled:opacity-40 ${dark ? 'bg-slate-800 text-slate-100 ring-slate-600' : 'bg-white text-ink ring-line'}`

/* ───────────────────────── ifadeyi kur ───────────────────────── */

function BuildView({ t, grade, dark, idx, sol, onDone, footer }: { t: BuildT } & Common) {
  const track = useTracker()
  const { nudge, say, clear } = useNudge()
  const mat = useMat(() => ({ E: [] }), { single: true, onAct: () => clear() })
  const dnd = useTileDnd(mat.onDrop)
  const [ok, setOk] = useState(false)
  const first = useRef(true)
  const doneRef = useRef(false)
  const tiles = mat.m.E ?? []
  const n = netOf(tiles)
  const target = fmtNet(t.a, t.b)
  const mine = sol.list.filter((s) => s.key.startsWith(`${idx}:`))
  const check = () => {
    const good = n.a === t.a && n.b === t.b
    track.attempt(good)
    if (!good) {
      first.current = false
      sfx.bad()
      if (n.a === t.a && n.b === -t.b) say(`Sabit terim ${t.b < 0 ? 'negatif' : 'pozitif'} olmalı. ${t.b < 0 ? 'Kırmızı' : 'Sarı'} 1 karoları ne anlama geliyor?`, { mis: 'Negatif sayıyı pozitif karoyla gösterme' })
      else if (n.a !== t.a) say(`Mattaki karolar ${fmtNet(n.a, n.b)} ediyor. Kaç tane x gerekiyor? Bir yeşil x ile bir kırmızı x yan yana olunca ne olur?`, { tool: true })
      else say(`x’ler tamam! Şimdi sabit terime bak: matta ${n.b < 0 ? n.b.toString().replace('-', '−') : n.b} var, ${t.b.toString().replace('-', '−')} olmalı.`)
      return
    }
    sfx.ok()
    const c = countsOf(tiles)
    const fresh = sol.add(`${idx}:${c.join(',')}`, fmtRaw(tiles))
    if (!doneRef.current) {
      doneRef.current = true
      track.item(first.current)
      onDone(first.current)
    }
    if (hasZeroPair(tiles)) track.strategy('Sıfır çiftiyle farklı model kurma')
    setOk(true)
    if (!t.multi) say('Karolar ifadeyi tam gösteriyor!', { tone: 'ok' })
    else if (!fresh) say('Bu modeli zaten kurmuştun. Sıfır çifti eklersen değer değişir mi?')
    else say(mine.length ? 'Bir model daha! Karolar farklı, ifade aynı.' : `Doğru! Aynı ifadeyi başka karolarla kurabilir misin? İpucu: bir +1 ile bir −1’in toplamı kaç?`, { tone: 'ok' })
  }
  const again = () => {
    mat.reset({ E: [] })
    setOk(false)
    clear()
  }
  const work = (
    <div className="flex flex-col gap-3">
      <SymLine dark={dark}><MathText text={tiles.length ? fmtRaw(tiles) : '…'} />{hasZeroPair(tiles) && <span className="text-lg opacity-70"><MathText text={`= ${fmtNet(n.a, n.b)}`} /></span>}</SymLine>
      <SideMat side="E" tiles={tiles} dnd={dnd} sel={mat.sel} onTapTile={(x) => !ok && mat.tapTile('E', x)} onTapSide={() => mat.tapSide('E')} dark={dark} label="Mat" sorted minH={200} />
      {!ok && <Bin kinds={kindsFor(grade)} dnd={dnd} picked={null} onPick={mat.pick} dark={dark} />}
      <Ghost dnd={dnd} />
    </div>
  )
  const panel = (
    <>
      <TaskText dark={dark}>
        <span className="mb-1 block text-3xl font-black"><MathText text={target} /></span>
        Bu ifadeyi karolarla modelle. Kutudaki karoya dokun ya da mata sürükle; çıkarmak için karoyu kutuya geri sürükle.
        {t.multi && <b className="mt-1 block">En az iki farklı model kur!</b>}
      </TaskText>
      {!ok && (
        <div className="flex gap-2">
          <button type="button" className={toolCls(dark)} disabled={!mat.sel} onClick={mat.removeSel}><Trash2 size={17} />Seçileni kaldır</button>
          <button type="button" className={toolCls(dark)} disabled={!tiles.length} onClick={() => mat.reset({ E: [] })}><RotateCcw size={17} />Temizle</button>
        </div>
      )}
      {!ok && <BigButton onClick={check} disabled={!tiles.length} className="w-full"><Check size={20} />Kontrol et</BigButton>}
      {nudge && <Nudge key={nudge.n} question={nudge.q} misconception={nudge.mis} tone={nudge.tone} tool={nudge.tool ? 'algebra' : undefined} toolTitle="Cebir karoları" />}
      {t.multi && <SolutionList list={mine} goal={2} />}
      {ok && t.multi && <BigButton variant="ghost" onClick={again} className="w-full"><Shuffle size={20} />Başka bir model kur</BigButton>}
      {ok && footer}
    </>
  )
  return <Layout work={work} panel={panel} />
}

/* ───────────────────────── sadeleştir / topla ───────────────────────── */

function SimplifyView({ t, grade, dark, onDone, footer }: { t: SimplifyT } & Common) {
  const track = useTracker()
  const { nudge, say, clear } = useNudge()
  const init = () => ({ E: t.groups.flatMap((g, i) => makeTiles(g.c, t.groups.length > 1 ? i : undefined)) })
  const mat = useMat(init, { single: true, noAdd: true, noRemove: true, onAct: () => clear(), onIllegal: () => say('Tek bir karoyu atarsan ifadenin değeri değişir. Hangi iki karo birlikte atılabilir? (Sıfır çifti)') })
  const dnd = useTileDnd(mat.onDrop)
  const [sorted, setSorted] = useState(false)
  const [a, setA] = useState(0)
  const [b, setB] = useState(0)
  const [ok, setOk] = useState(false)
  const first = useRef(true)
  const tiles = mat.m.E ?? []
  const all = t.groups.reduce((s, g) => [s[0] + g.c[0], s[1] + g.c[1], s[2] + g.c[2], s[3] + g.c[3]] as Counts, [0, 0, 0, 0] as Counts)
  const want = { a: all[0] - all[1], b: all[2] - all[3] }
  const check = () => {
    const good = a === want.a && b === want.b
    track.attempt(good)
    if (good) {
      sfx.ok()
      setOk(true)
      track.item(first.current)
      onDone(first.current)
      return
    }
    first.current = false
    sfx.bad()
    if ((a === all[0] + all[1] && all[1] > 0) || (b === all[2] + all[3] && all[3] > 0)) say('Kırmızı karoları da yeşil/sarı gibi saydın gibi görünüyor. Bir kırmızı ile bir yeşil yan yana gelince ne olur?', { mis: 'Negatif terimleri pozitif sayma', tool: true })
    else if (a + b === want.a + want.b && b !== want.b) say('x karoları ile 1 karoları aynı büyüklükte mi? Bir x ile bir 1 toplanıp tek bir terim olabilir mi?', { mis: 'Benzer olmayan terimleri birleştirme' })
    else if (a !== want.a) say('x karolarını yeniden say. Sıfır çiftlerini kaldırınca kaç x kalıyor?')
    else say('x’ler doğru! 1 karolarına bak: sıfır çiftlerini kaldırınca kaç tane kalıyor, hangi renkte?')
  }
  const work = (
    <div className="flex flex-col gap-3">
      <SymLine dark={dark}><MathText text={fmtRaw(tiles)} /></SymLine>
      {t.groups.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2">
          {t.groups.map((g, i) => <span key={i} className="chip px-3 py-1 text-sm font-black" style={{ boxShadow: `inset 0 0 0 2px ${['#7c3aed', '#0ea5e9', '#db2777'][i]}`, color: dark ? '#e2e8f0' : '#1f2340' }}>(<MathText text={g.label} />)</span>)}
        </div>
      )}
      <SideMat side="E" tiles={tiles} dnd={dnd} sel={mat.sel} onTapTile={(x) => !ok && mat.tapTile('E', x)} onTapSide={() => mat.tapSide('E')} dark={dark} label="Mat" sorted={sorted} minH={200} groupRings={t.groups.length > 1} />
      <Ghost dnd={dnd} />
      <p className={`text-center text-sm font-bold ${dark ? 'text-slate-400' : 'text-ink-soft'}`}>{grade >= 7 ? 'Zıt iki karoyu üst üste sürükle (ya da birine, sonra ötekine dokun): sıfır çifti yok olur.' : 'Benzer karoları yan yana getirmek için “Benzerleri diz” düğmesini kullan.'}</p>
    </div>
  )
  const panel = (
    <>
      <TaskText dark={dark}><MathText text={t.prompt} /></TaskText>
      <button type="button" className={toolCls(dark)} onClick={() => setSorted((s) => !s)}><ListOrdered size={17} />{sorted ? 'Karışık göster' : 'Benzerleri diz'}</button>
      <Card title="Sadeleşmiş ifade" dark={dark}>
        <ExprEntry a={a} b={b} setA={(v) => { setA(v); clear() }} setB={(v) => { setB(v); clear() }} dark={dark} allowNeg={grade >= 7} />
      </Card>
      {!ok && <BigButton onClick={check} className="w-full"><Check size={20} />Kontrol et</BigButton>}
      {nudge && <Nudge key={nudge.n} question={nudge.q} misconception={nudge.mis} tone={nudge.tone} tool={nudge.tool ? 'algebra' : undefined} toolTitle="Cebir karoları" />}
      {ok && (
        <>
          <Derived><MathText text={`${t.groups.map((g) => (t.groups.length > 1 ? `(${g.label})` : g.label)).join(' + ')} = ${fmtNet(want.a, want.b)}`} /></Derived>
          <StrategyPicker options={grade >= 7 ? ['Sıfır çiftlerini kaldırdım', 'Kafamda saydım', 'Önce x’leri, sonra sabitleri topladım'] : ['Benzer karoları yan yana dizdim', 'Önce x’leri, sonra 1’leri saydım', 'Kafamda topladım']} onPick={() => undefined} />
          {footer}
        </>
      )}
    </>
  )
  return <Layout work={work} panel={panel} />
}

/* ───────────────────────── değer ver ───────────────────────── */

function EvalView({ t, dark, onDone, footer }: { t: EvalT } & Common) {
  const track = useTracker()
  const { nudge, say } = useNudge()
  const tiles = useMemo(() => makeTiles([Math.max(0, t.a), Math.max(0, -t.a), Math.max(0, t.b), Math.max(0, -t.b)]), [t])
  const dnd = useTileDnd(() => undefined)
  const [guess, setGuess] = useState('')
  const [flip, setFlip] = useState(false)
  const [ok, setOk] = useState(false)
  const first = useRef(true)
  const val = t.a * t.v + t.b
  const check = () => {
    setFlip(true)
    const good = parseNum(guess) === val
    track.attempt(good)
    if (good) {
      sfx.ok()
      setOk(true)
      track.item(first.current)
      onDone(first.current)
      say('Tahminin doğru! Karolar da aynı sonucu gösteriyor.', { tone: 'ok' })
      return
    }
    first.current = false
    sfx.bad()
    if (parseNum(guess) === Number(`${t.a}${t.v}`) + t.b) say(`${t.a}x, “${t.a} ile x yan yana” mı demek, yoksa “${t.a} tane x” mi? Çevrilen karolara bak: her x karosu kaç tane 1 oldu?`, { mis: '3x’i 3 ile x’in basamak olarak yan yana yazılması sanma' })
    else say(`Karolar çevrildi: her x karosu ${t.v} tane 1’e dönüştü. Toplam kaç tane 1 karosu var? Say ve yeniden yaz.`)
    setGuess('')
  }
  const work = (
    <div className="flex flex-col gap-3">
      <SymLine dark={dark}><MathText text={flip ? `${fmtSubst(t.a, t.b, t.v)}${ok ? ` = ${val}` : ''}` : fmtNet(t.a, t.b)} /></SymLine>
      <SideMat side="E" tiles={tiles} dnd={dnd} sel={null} onTapTile={() => undefined} onTapSide={() => undefined} dark={dark} label={flip ? `x = ${t.v}: her x karosu ${t.v} tane 1` : 'Mat'} sorted flip={flip ? t.v : undefined} minH={200} />
    </div>
  )
  const panel = (
    <>
      <TaskText dark={dark}>
        Mattaki karolar <b><MathText text={fmtNet(t.a, t.b)} /></b> ifadesini gösteriyor. <b>x = {t.v}</b> olursa bu ifade kaç eder? Önce tahmin et, sonra x karolarını çevirerek kontrol et.
      </TaskText>
      {!ok && (
        <Card title="Tahminin" dark={dark}>
          <NumPad value={guess} onChange={setGuess} dark={dark} maxLen={3} onEnter={check} enterLabel={<><Wand2 size={20} />x karolarını çevir</>} />
        </Card>
      )}
      {nudge && <Nudge key={nudge.n} question={nudge.q} misconception={nudge.mis} tone={nudge.tone} />}
      {ok && (
        <>
          <Derived><MathText text={`x = ${t.v} için ${fmtNet(t.a, t.b)} = ${fmtSubst(t.a, t.b, t.v)} = ${val}`} /></Derived>
          <StrategyPicker options={[`${t.a} ile ${ek(t.v, 'acc')} çarpıp ${t.b} ekledim`, 'Karoları tek tek saydım', 'Önce bir x’i, sonra hepsini düşündüm']} onPick={() => undefined} />
          {footer}
        </>
      )}
    </>
  )
  return <Layout work={work} panel={panel} />
}

/* ───────────────────────── sayıyla çarp ───────────────────────── */

function MulView({ t, grade, dark, onDone, footer }: { t: MulT } & Common) {
  const track = useTracker()
  const { nudge, say, clear } = useNudge()
  const [n, setN] = useState(1)
  const [a, setA] = useState(0)
  const [b, setB] = useState(0)
  const [ok, setOk] = useState(false)
  const first = useRef(true)
  const inner = fmtNet(t.a, t.b)
  const c: Counts = [Math.max(0, t.a), Math.max(0, -t.a), Math.max(0, t.b), Math.max(0, -t.b)]
  const groupTiles = useMemo(() => makeTiles(c), [])
  const check = () => {
    const good = n === t.k && a === t.k * t.a && b === t.k * t.b
    track.attempt(good)
    if (good) {
      sfx.ok()
      setOk(true)
      track.item(first.current)
      onDone(first.current)
      return
    }
    first.current = false
    sfx.bad()
    if (n !== t.k) say(`${t.k}(${inner}) kaç tane (${inner}) demek? Matta şu an ${n} tane var.`)
    else if (a === t.k * t.a && b === t.b) say(`Matta kaç tane ${t.b < 0 ? '−1' : '1'} karosu var? Her kopyada ${Math.abs(t.b)} tane, ${t.k} kopya…`, { mis: 'Çarpmayı yalnızca ilk terime dağıtma' })
    else say('Bütün kopyalardaki x karolarını, sonra 1 karolarını say.')
  }
  const work = (
    <div className="flex flex-col gap-3">
      <SymLine dark={dark}><MathText text={n === 1 ? `(${inner})` : `${n} · (${inner})`} />{ok && <MathText text={`= ${fmtNet(t.k * t.a, t.k * t.b)}`} />}</SymLine>
      <div className={`flex min-h-52 flex-wrap content-start justify-center gap-3 rounded-2xl p-3 ${dark ? 'bg-slate-900/60 ring-1 ring-slate-600' : 'bg-white/90 ring-1 ring-line'}`}>
        {Array.from({ length: n }, (_, i) => (
          <div key={i} className={`flex items-end gap-1.5 rounded-xl p-2 ring-2 ring-dashed animate-pop ${dark ? 'ring-violet-400/70' : 'ring-violet-300'}`}>
            {groupTiles.map((x) => <TileFace key={x.id} k={x.k} neg={x.neg} />)}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" className={toolCls(dark)} disabled={ok || n >= 6} onClick={() => { setN(n + 1); clear() }}><Copy size={17} />Bir kopya ekle</button>
        <button type="button" className={toolCls(dark)} disabled={ok || n <= 1} onClick={() => { setN(n - 1); clear() }}><Trash2 size={17} />Bir kopya sil</button>
      </div>
    </div>
  )
  const panel = (
    <>
      <TaskText dark={dark}>
        <span className="mb-1 block text-3xl font-black"><MathText text={`${t.k}(${inner})`} /></span>
        Matta bir tane <MathText text={`(${inner})`} /> grubu var. Kopyalayarak <MathText text={`${t.k}(${inner})`} /> modelini kur, sonra ifadeyi parantezsiz yaz.
      </TaskText>
      <Card title="Parantezsiz yazılışı" dark={dark}>
        <ExprEntry a={a} b={b} setA={(v) => { setA(v); clear() }} setB={(v) => { setB(v); clear() }} dark={dark} allowNeg={grade >= 7} />
      </Card>
      {!ok && <BigButton onClick={check} className="w-full"><Check size={20} />Kontrol et</BigButton>}
      {nudge && <Nudge key={nudge.n} question={nudge.q} misconception={nudge.mis} tone={nudge.tone} />}
      {ok && (
        <>
          <Derived><MathText text={`${t.k}(${inner}) = ${t.k} · x ${t.b < 0 ? '−' : '+'} ${t.k} · ${Math.abs(t.b)} = ${fmtNet(t.k * t.a, t.k * t.b)}`} /></Derived>
          {footer}
        </>
      )}
    </>
  )
  return <Layout work={work} panel={panel} />
}

/* ───────────────────────── denklem matı ───────────────────────── */

type Snap = { L: Counts; R: Counts; note?: string }
type Full = { m: Mat; hist: Snap[]; pend: Act[] }

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))

function EqView({ t, grade, dark, idx, sol, onDone, footer }: { t: EqT } & Common) {
  const track = useTracker()
  const { nudge, say, clear } = useNudge()
  const init = (): Mat => ({ L: makeTiles(t.L), R: makeTiles(t.R) })
  const [hist, setHist] = useState<Snap[]>([{ L: t.L, R: t.R }])
  const [pend, setPend] = useState<Act[]>([])
  const [rows, setRows] = useState(0)
  const [solved, setSolved] = useState(false)
  const [rounds, setRounds] = useState(0)
  const stack = useRef<Full[]>([])
  const first = useRef(true)
  const itemDone = useRef(false)
  const stratDone = useRef(false)
  const misDone = useRef(false)
  const histRef = useRef(hist)
  histRef.current = hist
  const pendRef = useRef(pend)
  pendRef.current = pend

  const valid = (m: Mat) => {
    const l = netOf(m.L ?? []), r = netOf(m.R ?? [])
    const a = l.a - r.a, b = l.b - r.b
    return a !== 0 && Math.abs(-b / a - t.xv) < 1e-9
  }
  const isolated = (m: Mat) => {
    const one = (ts: Tile[]) => ts.length === 1 && ts[0].k === 'x' && !ts[0].neg
    const units = (ts: Tile[]) => ts.every((x) => x.k === '1') && !hasZeroPair(ts)
    const L = m.L ?? [], R = m.R ?? []
    return (one(L) && units(R)) || (one(R) && units(L))
  }

  const deltaNote = (s0: Snap, m: Mat) => {
    const n0L = { a: s0.L[0] - s0.L[1], b: s0.L[2] - s0.L[3] }
    const n1L = netOf(m.L ?? [])
    const d = fmtNet(n1L.a - n0L.a, n1L.b - n0L.b)
    return d === '0' ? 'sıfır çifti' : `${d.startsWith('−') ? d : `+${d}`} · iki taraf`
  }

  const onAct = (next: Mat, act: Act, prev: Mat) => {
    stack.current.push({ m: prev, hist: histRef.current, pend: pendRef.current })
    setRows(0)
    const ok = valid(next)
    const wasOk = valid(prev)
    const snap = (note: string): Snap => ({ L: countsOf(next.L ?? []), R: countsOf(next.R ?? []), note })
    let nh = histRef.current
    if (act.type === 'zero') {
      const h = histRef.current
      const last = h[h.length - 1]
      if (ok) {
        nh = last.note === 'sıfır çifti' ? [...h.slice(0, -1), snap('sıfır çifti')] : [...h, snap('sıfır çifti')]
        setHist(nh)
      }
      clear()
    } else if (!ok) {
      const p = pendRef.current
      const sameSide = !p.length || p[0].side === act.side
      setPend(sameSide ? [...p, act] : [])
      if (wasOk) {
        const other = act.side === 'L' ? 'sağ' : 'sol'
        say(`${act.side === 'L' ? 'Sol' : 'Sağ'} tarafa ${act.type === 'add' ? 'karo ekledin' : 'karo kaldırdın'}; eşitlik bozuldu (≠). Eşitliği korumak için ${other} tarafa ne yapmalısın?`)
      }
    } else {
      // denge yeniden kuruldu
      setPend([])
      const h = histRef.current
      nh = [...h, snap(deltaNote(h[h.length - 1], next))]
      setHist(nh)
      sfx.ok()
      say('Eşitlik yeniden kuruldu: iki tarafa da aynı şeyi yaptın.', { tone: 'ok' })
    }
    if (ok && isolated(next)) win(next, nh)
    else if (!ok && isolated(next) && !misDone.current) {
      misDone.current = true
      first.current = false
      track.attempt(false)
      say('x yalnız kaldı ama eşitlik bozuk (≠)! Bu değer denklemin çözümü olabilir mi? Geri al ve her hamleyi iki tarafa da yap.', { mis: 'İşlemi eşitliğin yalnızca bir tarafına uygulama' })
    }
  }
  const mat = useMat(init, {
    onAct,
    onIllegal: (w) => w === 'cross' && say('Bir karoyu öbür tarafa taşımak eşitliği korur mu? Karoyu kaldırmak için kutuya sürükle; sonra aynısını öbür taraftan da yap.'),
  })
  const dnd = useTileDnd(mat.onDrop)
  const L = mat.m.L ?? [], R = mat.m.R ?? []
  const ok = valid(mat.m)

  function win(m: Mat, h: Snap[]) {
    setSolved(true)
    track.attempt(true)
    const key = `${idx}:` + h.map((s) => `${s.L}|${s.R}`).join('>') + `>${countsOf(m.L ?? [])}|${countsOf(m.R ?? [])}`
    const label = h.slice(1).map((s) => s.note).filter((x) => x && x !== 'sıfır çifti').map((x) => x!.replace(' · iki taraf', '')).join(' → ') || 'çözüm'
    if (!stratDone.current) {
      stratDone.current = true
      const firstNote = h.slice(1).find((s) => s.note && s.note !== 'sıfır çifti')?.note ?? ''
      track.strategy(firstNote.startsWith('÷') ? 'Gruplara ayırarak bölme' : firstNote.includes('x') ? 'Önce x karolarını bir tarafta toplama' : 'Önce sabit karoları kaldırma')
    }
    if (!itemDone.current) {
      itemDone.current = true
      track.item(first.current)
      onDone(first.current)
    }
    if (t.multi) {
      const fresh = sol.add(key, label)
      say(fresh ? 'Çözdün! Başka bir sırayla da çözebilir misin?' : 'Bu yolu zaten bulmuştun. Bu kez ilk hamleni değiştir!', { tone: fresh ? 'ok' : undefined })
    } else say('x yalnız kaldı ve eşitlik korundu!', { tone: 'ok' })
  }

  const mirror = () => {
    const p = pendRef.current
    if (!p.length) return
    const from = p[0].side
    const to: SideId = from === 'L' ? 'R' : 'L'
    let cur = mat.ref.current
    const prevFull = cur
    let target = [...(cur[to] ?? [])]
    for (const a of p) {
      if (a.type === 'zero') continue
      if (a.type === 'add') target.push({ id: newId(), k: a.k, neg: a.neg })
      else {
        const i = target.findIndex((x) => x.k === a.k && x.neg === a.neg)
        if (i >= 0) target = target.filter((_, j) => j !== i)
        else {
          if (grade <= 6) return say(`${to === 'R' ? 'Sağ' : 'Sol'} tarafta kaldırılacak aynı karo yok. Başka bir yol düşün: önce ${to === 'R' ? 'sağ' : 'sol'} tarafa ne yapabilirsin?`)
          target.push({ id: newId(), k: a.k, neg: !a.neg })
        }
      }
    }
    cur = { ...cur, [to]: target }
    mat.set(cur)
    onAct(cur, { type: 'add', side: to, k: '1', neg: false }, prevFull)
    setPend([])
  }

  const k = (() => {
    const all = [...countsOf(L), ...countsOf(R)].filter((x) => x > 0)
    return all.reduce((g, x) => gcd(g, x), 0)
  })()
  const canGroup = ok && !hasZeroPair(L) && !hasZeroPair(R) && k >= 2
  const group = () => {
    if (!ok) return say('Önce eşitliği yeniden kur; sonra gruplara ayır.')
    if (hasZeroPair(L) || hasZeroPair(R)) return say('Matta hâlâ sıfır çiftleri var. Önce onları kaldır.')
    if (k < 2) return say('Karolar eş gruplara ayrılamıyor: her türden karonun sayısı aynı sayıya bölünmeli. Önce başka bir hamle yap; x’lerin yanındaki 1’leri kaldırmayı dene.')
    setRows(k)
    say(`İki taraf da ${k} eş gruba ayrıldı. Her grup birbirine eşit; bir grubu tutarsan eşitlik korunur mu?`)
  }
  const keepOne = () => {
    const take = (ts: Tile[]) => {
      const c = countsOf(ts).map((x) => x / rows) as Counts
      return makeTiles(c)
    }
    const prev = mat.ref.current
    const next = { L: take(L), R: take(R) }
    stack.current.push({ m: prev, hist: histRef.current, pend: pendRef.current })
    mat.set(next)
    const nh = [...histRef.current, { L: countsOf(next.L), R: countsOf(next.R), note: `÷${rows}` }]
    setHist(nh)
    setRows(0)
    sfx.ok()
    clear()
    if (isolated(next)) win(next, nh)
  }

  const undo = () => {
    const s = stack.current.pop()
    if (!s || solved) return
    mat.reset(s.m)
    setHist(s.hist)
    setPend(s.pend)
    setRows(0)
    clear()
  }
  const reset = () => {
    stack.current = []
    mat.reset(init())
    setHist([{ L: t.L, R: t.R }])
    setPend([])
    setRows(0)
    setSolved(false)
    clear()
  }
  const hint = () => {
    track.hint()
    first.current = false
    const l = netOf(L), r = netOf(R)
    if (!ok) return say('Eşitlik bozuk. Son hamleni öbür tarafa da yaptın mı?', { tool: true })
    if (hasZeroPair(L) || hasZeroPair(R)) return say('Matta sıfır çifti var. Zıt iki karoyu üst üste getir.')
    if (l.a !== 0 && r.a !== 0) return say('İki tarafta da x var. İki taraftan aynı sayıda x kaldırırsan (ya da ekleyip sıfır çifti yaparsan) ne olur?', { tool: true })
    const xs = l.a !== 0 ? l : r
    if (xs.b > 0) return say(`x’lerin yanında ${xs.b} tane +1 var. İki taraftan da ${xs.b} tane +1 kaldırabilir misin?`)
    if (xs.b < 0) return say(`x’lerin yanında ${-xs.b} tane −1 var. İki tarafa da ${-xs.b} tane +1 eklersen ne olur?`)
    return say(`${Math.abs(xs.a)} tane x kaldı. “Gruplara ayır” ile iki tarafı ${Math.abs(xs.a)} eş gruba ayırmayı dene.`)
  }

  const lt = netOf(L), rt = netOf(R)
  const xOnLeft = L.length === 1 && L[0].k === 'x'
  const sideVal = xOnLeft ? rt.b : lt.b
  const L0 = { a: t.L[0] - t.L[1], b: t.L[2] - t.L[3] }, R0 = { a: t.R[0] - t.R[1], b: t.R[2] - t.R[3] }
  const mine = sol.list.filter((s) => s.key.startsWith(`${idx}:`))

  const work = (
    <div className="flex flex-col gap-3">
      <SymLine dark={dark} broken={!ok}>
        <MathText text={fmtRaw(L)} />
        <span className={`grid min-w-10 place-items-center rounded-xl px-1 ${ok ? (dark ? 'text-violet-300' : 'text-violet-700') : 'bg-rose-500 text-white animate-pop'}`}>{ok ? '=' : '≠'}</span>
        <MathText text={fmtRaw(R)} />
      </SymLine>
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
        <SideMat side="L" tiles={L} dnd={dnd} sel={mat.sel} onTapTile={(x) => !solved && mat.tapTile('L', x)} onTapSide={() => !solved && mat.tapSide('L')} dark={dark} label="Sol taraf" sorted rows={rows} minH={220} />
        <span className={`grid place-items-center text-3xl font-black ${ok ? (dark ? 'text-violet-300' : 'text-violet-600') : 'text-rose-500'}`}>{ok ? '=' : '≠'}</span>
        <SideMat side="R" tiles={R} dnd={dnd} sel={mat.sel} onTapTile={(x) => !solved && mat.tapTile('R', x)} onTapSide={() => !solved && mat.tapSide('R')} dark={dark} label="Sağ taraf" sorted rows={rows} minH={220} />
      </div>
      {!solved && <Bin kinds={kindsFor(grade)} dnd={dnd} picked={mat.picked} onPick={mat.pick} dark={dark} />}
      {mat.picked && <p className={`text-center text-sm font-bold ${dark ? 'text-violet-300' : 'text-violet-700'}`}>Karoyu hangi tarafa koyacaksın? Sol ya da sağ tarafa dokun.</p>}
      <Ghost dnd={dnd} />
    </div>
  )
  const panel = (
    <>
      <TaskText dark={dark}>
        {t.story ? <MathText text={t.story} /> : <>Karolar bir denklemi gösteriyor. x’i bir tarafta yalnız bırak; ama eşitlik hep korunsun.</>} <span className="mt-1 block text-sm opacity-80">Karoyu kutuya sürükleyince kaldırılır; zıt iki karo üst üste gelince sıfır çifti olur.</span>
      </TaskText>
      <Card title="Adımlarım" dark={dark}>
        <ol className="flex flex-col gap-1 text-[15px] font-black tabular-nums">
          {hist.map((s, i) => (
            <li key={i} className="flex flex-wrap items-center gap-x-2">
              {s.note && <span className={`rounded-lg px-1.5 py-0.5 text-xs font-extrabold ${dark ? 'bg-violet-500/25 text-violet-200' : 'bg-violet-50 text-violet-800'}`}><MathText text={s.note} /></span>}
              <MathText text={`${fmtCounts(s.L)} = ${fmtCounts(s.R)}`} />
            </li>
          ))}
        </ol>
      </Card>
      {!solved && pend.length > 0 && !ok && (
        <BigButton onClick={mirror} className="w-full"><Copy size={20} />Aynısını {pend[0].side === 'L' ? 'sağ' : 'sol'} tarafa da yap</BigButton>
      )}
      {!solved && rows > 0 && <BigButton onClick={keepOne} className="w-full"><Layers size={20} />Bir grubu tut (÷{rows})</BigButton>}
      {!solved && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={toolCls(dark)} onClick={group} disabled={rows > 0}><Layers size={17} />Gruplara ayır{canGroup ? ` (${k})` : ''}</button>
          <button type="button" className={toolCls(dark)} disabled={!mat.sel} onClick={mat.removeSel}><Trash2 size={17} />Seçileni kaldır</button>
          <button type="button" className={toolCls(dark)} disabled={!stack.current.length} onClick={undo}><Undo2 size={17} />Geri al</button>
          <div className="flex gap-2">
            <button type="button" className={toolCls(dark)} onClick={reset} aria-label="Baştan"><RotateCcw size={17} /></button>
            <button type="button" onClick={hint} className="grid min-h-12 min-w-12 place-items-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200 active:scale-95" aria-label="İpucu"><Lightbulb size={20} /></button>
          </div>
        </div>
      )}
      {nudge && <Nudge key={nudge.n} question={nudge.q} misconception={nudge.mis} tone={nudge.tone} tool={nudge.tool ? 'algebra' : undefined} toolTitle="Cebir karoları" />}
      {solved && (
        <>
          <Derived>
            <MathText text={`x = ${String(sideVal).replace('-', '−')}`} />
            <span className="mt-1 block text-base font-extrabold">Kontrol: <MathText text={`${fmtSubst(L0.a, L0.b, t.xv)} = ${fmtSubst(R0.a, R0.b, t.xv)}`} /> → <MathText text={`${L0.a * t.xv + L0.b} = ${R0.a * t.xv + R0.b} ✓`} /></span>
          </Derived>
          {t.multi && <SolutionList list={mine} goal={2} />}
          {t.multi && <BigButton variant="ghost" onClick={() => { reset(); setRounds((r) => r + 1) }} className="w-full"><Shuffle size={20} />Başka bir yoldan çöz</BigButton>}
        </>
      )}
      {(solved || rounds > 0) && footer}
    </>
  )
  return <Layout work={work} panel={panel} />
}

/* ───────────────────────── kim haklı? ───────────────────────── */

function JudgeView({ t, dark, onDone, footer }: { t: JudgeT } & Common) {
  const track = useTracker()
  const { nudge, say, clear } = useNudge()
  const dnd = useTileDnd(() => undefined)
  const L = useMemo(() => makeTiles(t.L), [t])
  const R = useMemo(() => makeTiles(t.R), [t])
  const [i, setI] = useState(0)
  const [verdict, setVerdict] = useState<boolean | null>(null)
  const [allFirst, setAllFirst] = useState(true)
  const [over, setOver] = useState(false)
  const c = t.claims[i]
  const l0 = netOf(L), r0 = netOf(R)
  const lv = valueOf(L, c.v), rv = valueOf(R, c.v)
  const truth = lv === rv
  const choose = (v: boolean) => {
    if (verdict !== null) return
    setVerdict(v)
    const good = v === truth
    track.attempt(good)
    if (good) {
      sfx.ok()
      say(truth ? `Evet! x = ${c.v} iken iki taraf da ${lv}.` : `Evet! x = ${c.v} iken sol taraf ${lv}, sağ taraf ${rv}; eşit değil.`, { tone: 'ok' })
    } else {
      sfx.bad()
      setAllFirst(false)
      say(`Karolar çevrildi. Sol tarafta kaç tane 1 kaldı, sağda kaç tane? Sıfır çiftlerini unutma: her kırmızı bir sarıyı götürür.`, { mis: truth ? undefined : 'Bir değerin çözüm olup olmadığını yerine koymadan karar verme' })
    }
  }
  const next = () => {
    clear()
    if (i + 1 < t.claims.length) {
      setI(i + 1)
      setVerdict(null)
    } else {
      setOver(true)
      track.item(allFirst)
      track.strategy('Yerine koyarak doğrulama')
      onDone(allFirst)
    }
  }
  const flip = verdict !== null ? c.v : undefined
  const work = (
    <div className="flex flex-col gap-3">
      <SymLine dark={dark}>
        <MathText text={flip !== undefined ? fmtSubst(l0.a, l0.b, c.v) : fmtNet(l0.a, l0.b)} />
        <span className={dark ? 'text-violet-300' : 'text-violet-700'}>{flip === undefined ? '=' : truth ? '=' : '≠'}</span>
        <MathText text={flip !== undefined ? fmtSubst(r0.a, r0.b, c.v) : fmtNet(r0.a, r0.b)} />
      </SymLine>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
        <SideMat side="L" tiles={L} dnd={dnd} sel={null} onTapTile={() => undefined} onTapSide={() => undefined} dark={dark} label={flip !== undefined ? `Sol taraf = ${String(lv).replace('-', '−')}` : 'Sol taraf'} sorted flip={flip} minH={200} />
        <span className="grid place-items-center text-3xl font-black text-violet-500">=</span>
        <SideMat side="R" tiles={R} dnd={dnd} sel={null} onTapTile={() => undefined} onTapSide={() => undefined} dark={dark} label={flip !== undefined ? `Sağ taraf = ${String(rv).replace('-', '−')}` : 'Sağ taraf'} sorted flip={flip} minH={200} />
      </div>
    </div>
  )
  const panel = (
    <>
      <TaskText dark={dark}>
        <span className="mb-1 block text-2xl font-black">💬 {c.who}: “x = {c.v}”</span>
        {c.who} bu denklemin çözümünün {c.v} olduğunu söylüyor. Önce karar ver; sonra x karoları {c.v} değerine çevrilecek.
      </TaskText>
      <div className="grid grid-cols-2 gap-2">
        <PickBtn on={verdict === true} disabled={verdict !== null && verdict !== true} dark={dark} onClick={() => choose(true)} className="min-h-14 text-base">{c.who} haklı</PickBtn>
        <PickBtn on={verdict === false} disabled={verdict !== null && verdict !== false} dark={dark} onClick={() => choose(false)} className="min-h-14 text-base">{c.who} haklı değil</PickBtn>
      </div>
      {nudge && <Nudge key={nudge.n} question={nudge.q} misconception={nudge.mis} tone={nudge.tone} />}
      {verdict !== null && !over && <BigButton onClick={next} className="w-full">{i + 1 < t.claims.length ? 'Sıradaki iddia' : 'Tamam'}</BigButton>}
      {over && (
        <>
          <Derived>Bir değerin çözüm olup olmadığını anlamak için onu yerine koyarız: iki taraf eşit çıkıyorsa çözümdür.</Derived>
          {footer}
        </>
      )}
    </>
  )
  return <Layout work={work} panel={panel} />
}
