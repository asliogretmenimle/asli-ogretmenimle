import { useState } from 'react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { starsFor } from '../../games/kit'
import { sfx } from '../../lib/feedback'
import { Card, NextButton, Nudge, Prompt, Split, Stage, pick, shuffle, useChecks } from '../donusum-studyosu/ortak'
import { Drag, DragAsk, Drop, RulesFound, TOKEN, Tray, useDnd, type Opt } from '../sayilari-karsilastir/parts'
import { GTOOL, Heap, Plate, PlateStack, Reveal, Slot, Sticky, Table, Workshop, acc, er, groupMove, rep, useSay, type Kind, type TaskDef, type TaskProps } from '../carpmaya-giris/kit'

/**
 * 91. Bölmeye Giriş: Paylaştır ve Grupla (2–3. sınıf, MAT.2.2.4, MAT.2.2.5, MAT.3.2.4)
 * Bölme işareti hiç kullanılmadan, gerçek hayat hikâyeleriyle bölmenin iki anlamı ayrı ayrı yaşanır:
 * eşit paylaştırma (grup sayısı belli, bir paydaki miktar aranır) ve gruplama (bir gruptaki miktar belli,
 * grup sayısı aranır). Baştan sona sürükle-bırak (Polypad gibi); her görevin üstünde amaç ve “Nasıl kullanılır?” kartı.
 *  1. Eşit paylaştır: kurabiyeleri tabaklara birer birer ya da ikişer ikişer dağıt, tabaklar eşit mi bak,
 *     “her tabakta kaç?”; sonra “3 tabak, her birinde 4 kurabiye: hepsi 12” cümlesini sayı kartlarıyla kur
 *  2. Adil mi? Ali 5, Ece 3 top almış: adil olmayan dağıtımı fark et, topları taşıyarak düzelt (iki hikâye)
 *  3. Grupla: aynı kurabiyeleri her poşete 4 tane koyarak paketle; kalan izi 12 → 8 → 4 → 0, “kaç poşet?”
 *  4. Neyi bulduk? Hikâye kartlarını “bir paydaki miktar” ve “grup sayısı” sepetlerine ayır; aynı 12’nin iki hikâyesini karşılaştır
 *  5. Hikâyeyi çöz: hikâyenin paylaştırma mı gruplama mı olduğunu bul, modelle çöz (iki hikâye)
 *  Kalanlı bölme bu etkinliğin konusu değildir: sayılar hep tam bölünür. Sayılar her açılışta değişir.
 *  Son: kural defteri
 */

type Pair = [number, number]
/** [grup sayısı, bir gruptaki miktar]; ikisi hiç eşit değil ki iki anlam karışmasın */
const POOL: Record<2 | 3, Pair[]> = {
  2: [[3, 4], [4, 3], [2, 6], [3, 5], [2, 5], [5, 3], [2, 7], [4, 2], [3, 6], [2, 8], [4, 5]],
  3: [[4, 6], [3, 8], [4, 7], [5, 6], [6, 4], [3, 9], [6, 5], [4, 8]],
}

const NAMES = ['👦 Ali', '👧 Ece', '👦 Can', '👧 Elif', '👦 Mert', '👧 Zeynep']

interface Ctx {
  id: string
  e: string
  item: string
  /** çoğul ve belirtme hâli: “kalemler”, “kalemleri” */
  pl: string
  pla: string
  share: { kind: Kind; noun: string; title: (i: number) => string; story: (T: number, p: number) => string; q: string }
  group: { noun: string; icon: string; story: (T: number, k: number) => string; q: string }
}
const CTX: Ctx[] = [
  {
    id: 'kurabiye', e: '🍪', item: 'kurabiye', pl: 'kurabiyeler', pla: 'kurabiyeleri',
    share: { kind: 'plate', noun: 'tabak', title: (i) => `${i + 1}. tabak`, story: (T, p) => `${T} kurabiyeyi ${p} tabağa eşit dağıtıyoruz.`, q: 'Her tabakta kaç kurabiye olur?' },
    group: { noun: 'poşet', icon: '🛍️', story: (T, k) => `${T} kurabiyeyi poşetlere koyuyoruz, her poşete ${k} tane.`, q: 'Kaç poşet olur?' },
  },
  {
    id: 'kalem', e: '✏️', item: 'kalem', pl: 'kalemler', pla: 'kalemleri',
    share: { kind: 'kid', noun: 'kardeş', title: (i) => NAMES[i], story: (T, p) => `${T} kalemi ${p} kardeş eşit paylaşıyor.`, q: 'Her kardeş kaç kalem alır?' },
    group: { noun: 'kutu', icon: '📦', story: (T, k) => `${T} kalemi kutulara yerleştiriyoruz, her kutuya ${k} kalem.`, q: 'Kaç kutu gerekir?' },
  },
  {
    id: 'balon', e: '🎈', item: 'balon', pl: 'balonlar', pla: 'balonları',
    share: { kind: 'kid', noun: 'çocuk', title: (i) => NAMES[i], story: (T, p) => `${T} balonu ${p} çocuğa eşit dağıtıyoruz.`, q: 'Her çocuk kaç balon alır?' },
    group: { noun: 'demet', icon: '🎀', story: (T, k) => `${T} balondan ${er(k)} balonluk demetler yapıyoruz.`, q: 'Kaç demet olur?' },
  },
  {
    id: 'top', e: '⚽', item: 'top', pl: 'toplar', pla: 'topları',
    share: { kind: 'plate', noun: 'sepet', title: (i) => `${i + 1}. sepet`, story: (T, p) => `${T} topu ${p} sepete eşit koyuyoruz.`, q: 'Her sepette kaç top olur?' },
    group: { noun: 'file', icon: '🥅', story: (T, k) => `${T} topu filelere koyuyoruz, her fileye ${k} top.`, q: 'Kaç file gerekir?' },
  },
  {
    id: 'oyuncu', e: '🧒', item: 'oyuncu', pl: 'oyuncular', pla: 'oyuncuları',
    share: { kind: 'kid', noun: 'takım', title: (i) => `${i + 1}. takım`, story: (T, p) => `${T} oyuncu ${p} takıma eşit ayrılıyor.`, q: 'Her takımda kaç oyuncu olur?' },
    group: { noun: 'takım', icon: '🏁', story: (T, k) => `${T} oyuncu ${k} kişilik takımlara ayrılıyor.`, q: 'Kaç takım olur?' },
  },
]
const KURABIYE = CTX[0]

type Story = { ctx: Ctx; type: 'pay' | 'grup'; p: number; k: number }
const T_ = (s: Story) => s.p * s.k
const text = (s: Story) => (s.type === 'pay' ? `${s.ctx.share.story(T_(s), s.p)} ${s.ctx.share.q}` : `${s.ctx.group.story(T_(s), s.k)} ${s.ctx.group.q}`)

function plan(grade: Grade) {
  const pool = POOL[grade >= 3 ? 3 : 2]
  const main = pick(pool)
  const rest = shuffle(pool.filter((x) => x[0] * x[1] !== main[0] * main[1]))
  /** en az 6 farklı hikâye sayısı gerekir; havuz yetmezse başa döner */
  const others = Array.from({ length: 6 }, (_, i) => rest[i % rest.length])
  const ctxs = shuffle(CTX.slice(1))
  /** 4. görevin kartları: ilk ikisi 1. ve 3. görevin kurabiye hikâyeleri */
  const sort: Story[] = shuffle([
    { ctx: KURABIYE, type: 'pay', p: main[0], k: main[1] },
    { ctx: KURABIYE, type: 'grup', p: main[0], k: main[1] },
    { ctx: ctxs[0], type: 'pay', p: others[0][0], k: others[0][1] },
    { ctx: ctxs[1], type: 'grup', p: others[1][0], k: others[1][1] },
    { ctx: ctxs[2], type: 'pay', p: others[2][0], k: others[2][1] },
    { ctx: ctxs[3], type: 'grup', p: others[3][0], k: others[3][1] },
  ])
  const ctx5 = shuffle(CTX.slice(1))
  const solve: Story[] = shuffle([
    { ctx: ctx5[0], type: 'pay', p: others[4][0], k: others[4][1] },
    { ctx: ctx5[1], type: 'grup', p: others[5][0], k: others[5][1] },
  ])
  /** 2. görev: Ali 5, Ece 3; ikinci hikâye sınıfa göre */
  const fair: { ctx: Ctx; gs: number[] }[] = [
    { ctx: CTX[3], gs: [5, 3] },
    grade >= 3 ? { ctx: CTX[2], gs: shuffle([8, 6, 4, 2]) } : { ctx: CTX[1], gs: shuffle([6, 4, 2]) },
  ]
  return { main, sort, solve, fair }
}

const TASKS: TaskDef[] = [
  { emoji: '🍪', title: 'Eşit paylaştır', goal: 'Kurabiyeleri tabaklara eşit dağıtmak ve her tabakta kaç kurabiye olduğunu bulmak.', tools: [GTOOL.heap, { icon: <span className="rounded-md bg-amber-100 px-1 text-[11px] font-black">1 · 2</span>, name: 'Birer / ikişer', text: 'Sepetten bir seferde kaç tane alacağını seç: birer birer ya da ikişer ikişer.' }, GTOOL.plate, 'answer', GTOOL.num] },
  { emoji: '⚖️', title: 'Adil mi?', goal: 'Herkesin eşit almadığı bir paylaştırmayı fark etmek ve nesneleri taşıyarak adil yapmak.', tools: ['answer', GTOOL.kid] },
  { emoji: '🛍️', title: 'Poşetlere grupla', goal: 'Aynı kurabiyeleri her poşete eşit sayıda koyarak paketlemek ve kaç poşet olduğunu bulmak.', tools: [GTOOL.bags, GTOOL.heap, GTOOL.bag, 'answer', GTOOL.num] },
  { emoji: '🧺', title: 'Neyi bulduk?', goal: 'Bir hikâyede bir paydaki miktarı mı, grup sayısını mı bulduğumuzu ayırt etmek.', tools: [{ icon: <span className="text-base leading-none">🧺</span>, name: 'Hikâye kartları ve sepetler', text: 'Her hikâye kartını tutup doğru sepete bırak: “Her birine kaç?” ya da “Kaç grup?”.' }, 'answer'] },
  { emoji: '🕵️', title: 'Hikâyeyi çöz', goal: 'Bir hikâyenin paylaştırma mı gruplama mı olduğunu bulup modelle çözmek.', tools: [{ icon: <span className="text-base leading-none">📜</span>, name: 'Hikâye kartı', text: 'Kartı “Paylaştırma” ya da “Gruplama” kutusuna sürükle.' }, GTOOL.heap, GTOOL.plate, GTOOL.bags, 'answer'] },
]

export default function BolmeyeGiris({ grade, onFinish }: InteractionProps) {
  const [P] = useState(() => plan(grade))
  const [p, k] = P.main
  return (
    <Workshop
      grade={grade}
      tasks={TASKS}
      endNote="Bu kuralları ezberlemedin: hepsini kurabiyeleri, topları ve kalemleri kendin paylaştırıp gruplayarak buldun."
      onEnd={(firsts, rules) =>
        onFinish({
          stars: starsFor(firsts.filter(Boolean).length / TASKS.length),
          summary: `${TASKS.length} görevde eşit paylaştırma ve gruplama hikâyelerini modelle çözdün; ${rules.length} kuralı kendin buldun.`,
          insight: `${p * k} kurabiyeyi ${p} tabağa eşit dağıtınca her tabakta ${k} olur (bir paydaki miktarı buluruz). ${p * k} kurabiyeyi ${er(k)} poşetlersek ${p} poşet olur (grup sayısını buluruz). İkisi de aynı çarpmayı anlatır: ${p} × ${k} = ${p * k}.`,
        })
      }
      render={(i, pr) =>
        i === 0 ? <ShareTask {...pr} p={p} k={k} />
        : i === 1 ? <FairTask {...pr} list={P.fair} />
        : i === 2 ? <GroupTask {...pr} p={p} k={k} />
        : i === 3 ? <SortTask {...pr} cards={P.sort} p={p} k={k} />
        : <SolveTask {...pr} stories={P.solve} />
      }
    />
  )
}

const allSame = (x: number[]) => x.every((v) => v === x[0])
type Say = ReturnType<typeof useSay>

/** Seçenek sırası her açılışta karışık, ama bileşen yeniden çizilince değişmesin */
const ORDER = new Map<string, number[]>()
function mix(key: string, a: Opt[]): Opt[] {
  if (!ORDER.has(key) || ORDER.get(key)!.length !== a.length) ORDER.set(key, shuffle(a.map((_, i) => i)))
  return ORDER.get(key)!.map((i) => a[i])
}

/* ───────────── modeller ───────────── */

/** Birer / ikişer seçici (sepetin başlığında) */
function PerSwitch({ per, setPer }: { per: number; setPer: (v: number) => void }) {
  return (
    <span className="flex gap-1 normal-case">
      {[1, 2].map((v) => (
        <button key={v} type="button" onClick={() => setPer(v)} aria-pressed={per === v} className={`min-h-11 rounded-xl px-2.5 text-xs font-black ring-1 transition ${per === v ? 'bg-amber-500 text-white ring-amber-600' : 'bg-white text-amber-800 ring-amber-300'}`}>
          {v === 1 ? 'birer' : 'ikişer'}
        </button>
      ))}
    </span>
  )
}

/**
 * Eşit paylaştırma: kap sayısı belli, nesneler sepetten kaplara dağıtılır. Kaplar arasında taşınabilir.
 * Sepet boşalınca kaplar eşitse onEqual(her kaptaki) çağrılır; eşit değilse düşündüren bir ipucu çıkar (keşif: sayaca yazılmaz).
 */
function ShareBoard({ T, p, ctx, say, onEqual, onPer }: { T: number; p: number; ctx: Ctx; say: Say; onEqual: (each: number) => void; onPer?: (per: number) => void }) {
  const [gs, setGs] = useState<number[]>(() => Array.from({ length: p }, () => 0))
  const [left, setLeft] = useState(T)
  const [per, setPer] = useState(1)
  const [locked, setLocked] = useState(false)
  const sh = ctx.share
  const dnd = useDnd((item, target) => {
    if (locked) return false
    const m = groupMove(gs, item, target, { left, per, cap: 12 })
    if (!m) return false
    if ('msg' in m) return say.tell(m.msg, { at: m.at })
    say.clear()
    setGs(m.gs)
    const l = m.left ?? left
    setLeft(l)
    if (item === 'heap') onPer?.(per)
    if (l === 0) {
      if (allSame(m.gs)) {
        sfx.ok()
        setLocked(true)
        window.setTimeout(() => onEqual(m.gs[0]), 450)
      } else {
        const hi = m.gs.indexOf(Math.max(...m.gs))
        const lo = m.gs.indexOf(Math.min(...m.gs))
        say.tell(`Hepsi dağıtıldı. Ama ${sh.title(hi)}: ${m.gs[hi]}, ${sh.title(lo)}: ${m.gs[lo]}. Bu adil mi? Fazlası olandan azı olana taşı.`, { at: lo })
      }
    }
  })
  return (
    <>
      <Heap dnd={dnd} emoji={ctx.e} name={cap(ctx.item)} count={left} per={per} wrong={say.wrong === 'heap'} extra={<PerSwitch per={per} setPer={setPer} />} />
      <Table dnd={dnd} label={`${p} ${sh.noun}`}>
        {gs.map((v, i) => (
          <Plate key={i} dnd={dnd} id={`p-${i}`} count={v} emoji={ctx.e} kind={sh.kind} title={sh.title(i)} grab={locked ? undefined : `pi-${i}`} full={locked} wrong={say.wrong === i} />
        ))}
      </Table>
      <p className={`rounded-2xl px-3 py-2 text-center text-lg font-black tabular-nums ring-1 ${locked ? 'bg-emerald-50 text-emerald-800 ring-emerald-300' : 'bg-white text-ink ring-line'}`}>
        {gs.join(' · ')} {left === 0 && (allSame(gs) ? '→ hepsi eşit ✓' : '→ eşit değil')}
      </p>
    </>
  )
}

/**
 * Gruplama: bir gruptaki miktar (k) belli. Kap yığınından boş kap açılır, sepetten k tane konur; dolan kap kapanır.
 * Kalan izi T → T − k → … → 0 gösterilir. Hepsi gruplanınca onDone(kap sayısı).
 */
function GroupBoard({ T, k, ctx, say, onDone }: { T: number; k: number; ctx: Ctx; say: Say; onDone: (groups: number) => void }) {
  const [gs, setGs] = useState<number[]>([])
  const [left, setLeft] = useState(T)
  const [per, setPer] = useState(1)
  const [locked, setLocked] = useState(false)
  const gr = ctx.group
  const full = gs.filter((v) => v === k).length
  const dnd = useDnd((item, target) => {
    if (locked) return false
    if (item === 'heap' && target === 'table') return say.tell(`Önce ${gr.noun} yığınından boş bir ${gr.noun} sürükle, sonra ${ctx.pla} onun içine koy.`, { at: 'table' })
    const m = groupMove(gs, item, target, { left, per, cap: k, max: 10 })
    if (!m) return false
    if ('msg' in m) return say.tell(m.msg.replace('kap', gr.noun), { at: m.at })
    say.clear()
    const l = m.left ?? left
    setGs(m.gs)
    setLeft(l)
    const f = m.gs.filter((v) => v === k).length
    if (f > full) sfx.ok()
    if (l === 0 && m.gs.every((v) => v === k || v === 0)) {
      setLocked(true)
      setGs(m.gs.filter((v) => v > 0))
      window.setTimeout(() => onDone(f), 500)
    }
  })
  const trace = Array.from({ length: full + 1 }, (_, i) => T - i * k)
  return (
    <>
      <div className="flex gap-2">
        <Heap dnd={dnd} emoji={ctx.e} name={cap(ctx.item)} count={left} per={per} wrong={say.wrong === 'heap'} extra={<PerSwitch per={per} setPer={setPer} />} />
        <PlateStack dnd={dnd} kind="bag" icon={gr.icon} name={cap(gr.noun)} disabled={locked} />
      </div>
      <Table dnd={dnd} label={`Masa · her ${locative(gr.noun)} ${k} ${ctx.item}`} wrong={say.wrong === 'table'}>
        {gs.length === 0 && <p className="py-8 text-sm font-black text-amber-800/70">{cap(gr.noun)} yığınından boş bir {gr.noun} sürükle</p>}
        {gs.map((v, i) => (
          <Plate key={i} dnd={dnd} id={`p-${i}`} count={v} emoji={ctx.e} kind="bag" icon={gr.icon} cap={k} title={`${gr.icon} ${i + 1}. ${gr.noun}${v === k ? ' ✓' : ''}`} grab={!locked && v < k ? `pi-${i}` : undefined} remove={locked ? undefined : `plate-${i}`} full={v === k} wrong={say.wrong === i} />
        ))}
      </Table>
      <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-line">
        <p className="mb-1 text-[11px] font-black tracking-wide text-ink-soft uppercase">Sepette kalan</p>
        <p className="flex flex-wrap items-center gap-1.5 text-2xl font-black tabular-nums">
          {trace.map((v, i) => (
            <span key={i} className="flex items-center gap-1.5 animate-pop">
              {i > 0 && <span className="text-sm text-orange-600">−{k} →</span>}
              <span className={`rounded-xl px-2 ${v === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-50 text-orange-800'}`}>{v}</span>
            </span>
          ))}
        </p>
      </div>
    </>
  )
}

const cap = (s: string) => s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1)
/** “poşette”, “kutuda”, “demette”, “filede”, “takımda” */
function locative(noun: string) {
  const m: Record<string, string> = { poşet: 'poşette', kutu: 'kutuda', demet: 'demette', file: 'filede', takım: 'takımda', tabak: 'tabakta', sepet: 'sepette' }
  return m[noun] ?? `${noun}da`
}

/**
 * Çarpma bağlantısı: “[3] tabak, her birinde [4] kurabiye: hepsi [12]” cümlesini sayı kartlarıyla kur;
 * sonra 3 × 4 = 12 belirir (bölme işareti hiç kullanılmaz).
 */
function LinkSentence({ p, k, noun, item, checks, onDone }: { p: number; k: number; noun: string; item: string; checks: ReturnType<typeof useChecks>; onDone: () => void }) {
  const T = p * k
  const [fill, setFill] = useState<Record<string, number>>({})
  const [msg, setMsg] = useState<{ q: string; mis?: string; n: number } | null>(null)
  const [cards] = useState(() => {
    const v = [p, k, T, p + k]
    if (new Set(v).size < 4) v.push(T + 1)
    return shuffle([...new Set(v)])
  })
  const want: Record<string, number> = { a: p, b: k, c: T }
  const done = Object.keys(fill).length === 3
  const nudge = (q: string, mis?: string) => {
    checks.fail()
    setMsg((m) => ({ q, mis, n: (m?.n ?? 0) + 1 }))
    return false
  }
  const dnd = useDnd((it, target) => {
    if (!it.startsWith('num-') || !target.startsWith('sl-')) return false
    const v = Number(it.slice(4))
    const s = target.slice(3)
    if (v !== want[s]) {
      if (s === 'a') return nudge(v === k ? `${k}, her birindeki ${item} sayısı. İlk kutuya kaç ${noun} olduğunu yaz.` : `Kaç ${noun} vardı?`, v === k ? 'Grup sayısı ile gruptaki nesne sayısını karıştırıyor' : undefined)
      if (s === 'b') return nudge(v === p ? `${p}, ${noun} sayısı. Her birinde kaç ${item} var?` : `Bir ${locative(noun)} kaç ${item} var? Modele bak.`, v === p ? 'Grup sayısı ile gruptaki nesne sayısını karıştırıyor' : undefined)
      return nudge(`Başta kaç ${item} vardı? Hepsini saymayı unutma.`)
    }
    setMsg(null)
    sfx.ok()
    const f = { ...fill, [s]: v }
    setFill(f)
    if (Object.keys(f).length === 3) window.setTimeout(onDone, 900)
  })
  return (
    <Card>
      <p className="mb-2 text-sm font-black text-sky-700">Cümleyi sayı kartlarıyla tamamla</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-lg font-black">
        <Slot dnd={dnd} id="sl-a" value={fill.a} /> <span>{noun},</span> <span>her birinde</span> <Slot dnd={dnd} id="sl-b" value={fill.b} /> <span>{item}:</span> <span>hepsi</span> <Slot dnd={dnd} id="sl-c" value={fill.c} />
      </div>
      {done && <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-center text-2xl font-black text-sky-800 ring-1 ring-sky-200 animate-pop">{p} × {k} = {T}</p>}
      {msg && <div className="mt-2"><Nudge key={msg.n} question={msg.q} misconception={msg.mis} /></div>}
      {!done && (
        <div className="mt-3">
          <Tray title="Sayı kartları">
            {cards.map((v) => <Drag key={v} dnd={dnd} item={`num-${v}`} label={`${v} kartı`} className={TOKEN}>{v}</Drag>)}
          </Tray>
        </div>
      )}
    </Card>
  )
}

/* ───────────── 1. Eşit paylaştır ───────────── */

function ShareTask({ p, k, onDone, last }: TaskProps & { p: number; k: number }) {
  const checks = useChecks()
  const say = useSay(checks)
  const T = p * k
  const [phase, setPhase] = useState<'deal' | 'ask' | 'link' | 'done'>('deal')
  const [pers, setPers] = useState<number[]>([])
  const rules = [
    `Eşit paylaştırmada grup sayısı bellidir (${p} tabak); her gruba kaç düştüğünü buluruz. Birer birer ya da ikişer ikişer dağıtırım, sonunda her tabakta ${k} olur.`,
    `Paylaştırmayı çarpmayla kontrol ederim: ${p} tabak, her birinde ${k} kurabiye: ${p} × ${k} = ${T}.`,
  ]
  const both = pers.includes(1) && pers.includes(2)
  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <ShareBoard T={T} p={p} ctx={KURABIYE} say={say} onEqual={() => setPhase('ask')} onPer={(v) => !pers.includes(v) && setPers([...pers, v])} />
          {say.view('work')}
        </Stage>
      }
      panel={
        <>
          {phase === 'deal' && <Prompt step={`${T} kurabiye, ${p} tabak`}><b>{T}</b> kurabiyeyi <b>{p}</b> tabağa <b>eşit</b> dağıt. Sepetten kurabiye tutup bir tabağa sürükle. İstersen “ikişer”i seçip ikişer ikişer dağıt.</Prompt>}
          {say.view('panel')}
          {phase === 'ask' && (
            <Reveal>
              <Card><p className="text-center text-base font-black text-emerald-800">Hepsi dağıtıldı, tabaklar eşit! {both ? 'Birer birer ve ikişer ikişer dağıttın.' : pers.includes(2) ? 'İkişer ikişer dağıttın.' : 'Birer birer dağıttın.'}</p></Card>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('link')}
                okText={`Evet! Her tabakta ${k} kurabiye var.`}
                ask={{
                  q: 'Her tabakta kaç kurabiye var?',
                  options: mix(`sh-${p}-${k}`, [
                    { label: `${k} kurabiye`, ok: true },
                    { label: `${p} kurabiye`, nudge: `${p}, tabak sayısı. Bir tabağa bak: içinde kaç kurabiye var?`, mis: 'Grup sayısını, bir paydaki miktar sanıyor' },
                    { label: `${T} kurabiye`, nudge: `${T}, bütün kurabiyeler. Yalnızca bir tabakta kaç tane var?` },
                  ]),
                }}
              />
            </Reveal>
          )}
          {phase === 'link' && <Reveal><LinkSentence p={p} k={k} noun="tabak" item="kurabiye" checks={checks} onDone={() => setPhase('done')} /></Reveal>}
          {phase === 'done' && (
            <Reveal>
              <RulesFound rules={rules} />
              <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
            </Reveal>
          )}
        </>
      }
    />
  )
}

/* ───────────── 2. Adil mi? ───────────── */

function FairTask({ list, onDone, last }: TaskProps & { list: { ctx: Ctx; gs: number[] }[] }) {
  const checks = useChecks()
  const say = useSay(checks)
  const [i, setI] = useState(0)
  const [gs, setGs] = useState(list[0].gs)
  const [phase, setPhase] = useState<'ask' | 'fix' | 'ok' | 'done'>('ask')
  const sc = list[Math.min(i, list.length - 1)]
  const T = sc.gs.reduce((a, b) => a + b, 0)
  const p = sc.gs.length
  const names = (x: number[]) => x.map((v, j) => `${NAMES[j].split(' ')[1]} ${v}`).join(', ')
  const rules = ['Adil paylaştırmada herkes aynı sayıda alır. Hepsini dağıtmak yetmez: fazlası olandan azı olana taşırım.']

  const dnd = useDnd((item, target) => {
    if (phase !== 'fix') return false
    const m = groupMove(gs, item, target, { cap: 12 })
    if (!m || target === 'heap') return false
    if ('msg' in m) return say.tell(m.msg, { at: m.at })
    say.clear()
    setGs(m.gs)
    if (allSame(m.gs)) {
      sfx.ok()
      window.setTimeout(() => setPhase('ok'), 400)
    }
  })
  const next = () => {
    if (i + 1 >= list.length) return setPhase('done')
    setI(i + 1)
    setGs(list[i + 1].gs)
    setPhase('ask')
  }
  const hi = sc.gs.indexOf(Math.max(...sc.gs))
  const lo = sc.gs.indexOf(Math.min(...sc.gs))
  const nm = (j: number) => NAMES[j].split(' ')[1]
  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <Card><p className="text-center text-lg font-black">{sc.ctx.e} {T} {sc.ctx.item}, {p} çocuk</p></Card>
          <Table dnd={dnd} label={phase === 'fix' ? 'Nesnelere dokunup bir çocuktan ötekine sürükle' : `Bir arkadaşımız ${sc.ctx.pla} böyle dağıttı`}>
            {gs.map((v, j) => (
              <Plate key={j} dnd={dnd} id={`p-${j}`} count={v} emoji={sc.ctx.e} kind="kid" title={NAMES[j]} grab={phase === 'fix' ? `pi-${j}` : undefined} full={phase === 'ok' || phase === 'done'} wrong={say.wrong === j} />
            ))}
          </Table>
          <p className="rounded-2xl bg-white px-3 py-2 text-center text-lg font-black tabular-nums ring-1 ring-line">{gs.join(' · ')} {allSame(gs) ? '→ herkes eşit ✓' : '→ eşit değil'}</p>
          {say.view('work')}
        </Stage>
      }
      panel={
        <>
          <Prompt step={`Hikâye ${Math.min(i + 1, list.length)} / ${list.length}`}>
            {phase === 'ask' ? <>{T} {sc.ctx.item} {p} çocuğa paylaştırıldı: {names(sc.gs)} aldı. Bu paylaştırma <b>adil</b> mi?</>
              : phase === 'fix' ? <>Paylaştırmayı adil yap: fazlası olan çocuktan azı olana {sc.ctx.item} taşı. Herkes eşit alsın.</>
              : <>Şimdi herkes eşit aldı.</>}
          </Prompt>
          {say.view('panel')}
          {phase === 'ask' && (
            <Reveal key={i}>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('fix')}
                okText="Doğru! Herkes aynı sayıda almadı. Hadi düzeltelim."
                ask={{
                  q: 'Bu paylaştırma adil mi?',
                  options: mix(`fair-${i}`, [
                    { label: `Hayır: ${nm(hi)} ${sc.gs[hi]}, ${nm(lo)} ${sc.gs[lo]} aldı. Eşit değil.`, ok: true },
                    { label: `Evet: bütün ${sc.ctx.pl} dağıtıldı`, nudge: `Hepsi dağıtıldı, doğru. Peki herkes aynı sayıda mı aldı? ${nm(hi)} ile ${nm(lo)} kaçar tane aldı? Say.`, mis: 'Hepsini dağıtmayı eşit paylaştırma sanıyor' },
                    { label: `Evet: herkes ${sc.ctx.item} aldı`, nudge: `Herkes aldı ama kaçar tane? ${nm(hi)} ile ${nm(lo)} aynı sayıda mı aldı?`, mis: 'Herkesin bir şey almasını adil paylaşım sanıyor' },
                  ]),
                }}
              />
            </Reveal>
          )}
          {phase === 'ok' && (
            <Reveal>
              <Card><p className="text-center text-lg font-black text-emerald-800">Herkes {gs[0]} {sc.ctx.item} aldı. {p} çocuk, her biri {gs[0]} {sc.ctx.item}: {p} × {gs[0]} = {T}</p></Card>
              <NextButton last={false} onClick={next} />
            </Reveal>
          )}
          {phase === 'done' && (
            <Reveal>
              <RulesFound rules={rules} />
              <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
            </Reveal>
          )}
        </>
      }
    />
  )
}

/* ───────────── 3. Grupla ───────────── */

function GroupTask({ p, k, onDone, last }: TaskProps & { p: number; k: number }) {
  const checks = useChecks()
  const say = useSay(checks)
  const T = p * k
  const [phase, setPhase] = useState<'pack' | 'ask' | 'link' | 'done'>('pack')
  const rules = [
    `Gruplamada bir gruptaki miktar bellidir (her poşete ${k}); kaç grup olduğunu buluruz. ${er(k)} ${er(k)} ayırırken sepetteki kurabiye azalır: ${Array.from({ length: p + 1 }, (_, i) => T - i * k).join(' → ')}.`,
    `Sepetteki kurabiyelerden ${p} kez ${k} çıkardım, sepet boşaldı: ${p} poşet. Çarpmayla kontrol: ${p} × ${k} = ${T}.`,
  ]
  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <GroupBoard T={T} k={k} ctx={KURABIYE} say={say} onDone={() => setPhase('ask')} />
          {say.view('work')}
        </Stage>
      }
      panel={
        <>
          {phase === 'pack' && <Prompt step={`${T} kurabiye, her poşete ${k}`}>Yine <b>{T}</b> kurabiye var. Bu kez her poşete <b>{k}</b> kurabiye koy. Poşet yığınından boş poşet sürükle, sonra kurabiyeleri içine koy. Sepette kalanları izle!</Prompt>}
          {say.view('panel')}
          {phase === 'ask' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('link')}
                okText={`Evet! ${p} poşet oldu.`}
                ask={{
                  q: 'Kaç poşet oldu?',
                  options: mix(`gr-${p}-${k}`, [
                    { label: `${p} poşet`, ok: true },
                    { label: `${k} poşet`, nudge: `${k}, bir poşetteki kurabiye sayısı. Masadaki poşetleri say.`, mis: 'Gruptaki nesne sayısını grup sayısı sanıyor' },
                    { label: `${T} poşet`, nudge: `${T}, bütün kurabiyeler. Kaç poşet doldurdun?` },
                  ]),
                }}
              />
            </Reveal>
          )}
          {phase === 'link' && <Reveal><LinkSentence p={p} k={k} noun="poşet" item="kurabiye" checks={checks} onDone={() => setPhase('done')} /></Reveal>}
          {phase === 'done' && (
            <Reveal>
              <RulesFound rules={rules} />
              <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
            </Reveal>
          )}
        </>
      }
    />
  )
}

/* ───────────── 4. Neyi bulduk? ───────────── */

function SortTask({ cards, p, k, onDone, last }: TaskProps & { cards: Story[]; p: number; k: number }) {
  const checks = useChecks()
  const say = useSay(checks)
  const T = p * k
  const [where, setWhere] = useState<Record<number, 'pay' | 'grup'>>({})
  const [phase, setPhase] = useState<'sort' | 'cmp' | 'done'>('sort')
  const rules = [
    'Paylaştırmada kaç grup olduğunu biliriz, bir paydaki miktarı buluruz. Gruplamada bir gruptaki miktarı biliriz, kaç grup olduğunu buluruz.',
    `İki hikâye de aynı çarpmayı anlatır: ${p} × ${k} = ${T}. Paylaştırmada ${acc(k)}, gruplamada ${acc(p)} bulduk.`,
  ]
  const dnd = useDnd((item, target) => {
    if (phase !== 'sort' || (target !== 'pay' && target !== 'grup')) return false
    const i = Number(item.slice(3))
    const s = cards[i]
    if (s.type !== target) {
      const q = s.type === 'pay'
        ? `Bu hikâyede kaç ${s.ctx.share.noun} olduğu söylenmiş: ${s.p}. Bilmediğimiz şey ne: ${s.p} grubun her birine kaç düştüğü mü, kaç grup olduğu mu?`
        : `Bu hikâyede bir gruba kaç tane konacağı söylenmiş: ${s.k}. Bilmediğimiz şey ne: her gruba kaç düştüğü mü, kaç grup olacağı mı?`
      return say.nudge(q, { mis: 'Paylaştırma ile gruplamayı karıştırıyor', at: target })
    }
    say.clear()
    sfx.ok()
    const w = { ...where, [i]: target as 'pay' | 'grup' }
    setWhere(w)
    if (Object.keys(w).length === cards.length) window.setTimeout(() => setPhase('cmp'), 500)
  })
  const basket = (id: 'pay' | 'grup', title: string, sub: string, tone: string) => (
    <Drop dnd={dnd} id={id} className={`min-h-36 rounded-2xl border-2 border-dashed p-2 ${tone} ${say.wrong === id ? 'animate-shake' : ''}`}>
      <p className="text-center text-base font-black">{title}</p>
      <p className="mb-1.5 text-center text-xs font-bold opacity-80">{sub}</p>
      <ul className="space-y-1">
        {cards.map((s, i) => (where[i] === id ? <li key={i} className="rounded-lg bg-white px-2 py-1 text-xs font-extrabold text-ink ring-1 ring-black/5 animate-pop">{s.ctx.e} {text(s)}</li> : null))}
      </ul>
    </Drop>
  )
  const pay = cards.find((s) => s.ctx.id === 'kurabiye' && s.type === 'pay')!
  const grup = cards.find((s) => s.ctx.id === 'kurabiye' && s.type === 'grup')!
  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {basket('pay', '🍽️ Her birine kaç?', 'Bir paydaki miktarı bulduk', 'border-sky-400 bg-sky-50 text-sky-900')}
            {basket('grup', '🛍️ Kaç grup?', 'Grup sayısını bulduk', 'border-orange-400 bg-orange-50 text-orange-900')}
          </div>
          {say.view('work')}
          {phase === 'sort' && (
            <Sticky>
              <Tray title={`Hikâye kartları · ${cards.length - Object.keys(where).length} kart kaldı`}>
                {cards.map((s, i) => [s, i] as const).filter(([, i]) => !where[i]).slice(0, 3).map(([s, i]) => ((
                  <Drag key={i} dnd={dnd} item={`sc-${i}`} label={text(s)} className="min-h-14 w-full rounded-2xl bg-white px-3 py-2 text-left text-[15px] leading-snug font-black text-ink shadow-[0_3px_0_#cbd5e1] ring-2 ring-line sm:w-[calc(50%-0.25rem)]">
                    <span className="mr-1.5 text-xl" aria-hidden>{s.ctx.e}</span>{text(s)}
                  </Drag>
                )))}
              </Tray>
            </Sticky>
          )}
          {phase !== 'sort' && (
            <div className="grid gap-2 sm:grid-cols-2 animate-fade-up">
              <Card className="bg-sky-50! ring-sky-300!">
                <p className="text-sm font-black text-sky-800">{pay.ctx.e} {text(pay)}</p>
                <p className="mt-1 text-lg font-black">Bildik: {p} tabak · Bulduk: her tabakta <span className="text-sky-700">{k}</span></p>
              </Card>
              <Card className="bg-orange-50! ring-orange-300!">
                <p className="text-sm font-black text-orange-800">{grup.ctx.e} {text(grup)}</p>
                <p className="mt-1 text-lg font-black">Bildik: her poşette {k} · Bulduk: <span className="text-orange-700">{p}</span> poşet</p>
              </Card>
            </div>
          )}
        </Stage>
      }
      panel={
        <>
          <Prompt step={phase === 'sort' ? `${Object.keys(where).length} / ${cards.length}` : 'Karşılaştır'}>
            {phase === 'sort' ? <>Her hikâyeyi oku. Bu hikâyede neyi buluyoruz: <b>bir paydaki miktarı</b> mı, <b>grup sayısını</b> mı? Kartı doğru sepete sürükle.</> : <>1. ve 3. görevdeki iki kurabiye hikâyesine bak. İkisinde de {T} kurabiye var.</>}
          </Prompt>
          {say.view('panel')}
          {phase === 'cmp' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('done')}
                okText={`Evet! İkisi de ${p} × ${k} = ${T}. Paylaştırmada ${acc(k)}, gruplamada ${acc(p)} bulduk.`}
                ask={{
                  q: `“${p} grup, her birinde ${k}: hepsi ${T}” cümlesi hangi hikâyeye uyar?`,
                  options: mix(`cmp-${p}-${k}`, [
                    { label: 'İkisine de: yalnızca bulduğumuz sayı farklı', ok: true },
                    { label: 'Yalnızca tabak hikâyesine', nudge: `Poşet hikâyesinde kaç poşet vardı, her poşette kaç kurabiye? ${p} poşet, her birinde ${k}: hepsi kaç?` },
                    { label: 'Hiçbirine: bu hikâyelerde çarpma yok', nudge: `Tabaklara bak: ${p} tabak, her birinde ${k}. ${rep(k, p)} kaç eder?`, mis: 'Paylaştırma ve gruplamanın çarpmayla ilişkisini görmüyor' },
                  ]),
                }}
              />
            </Reveal>
          )}
          {phase === 'done' && (
            <Reveal>
              <RulesFound rules={rules} />
              <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
            </Reveal>
          )}
        </>
      }
    />
  )
}

/* ───────────── 5. Hikâyeyi çöz ───────────── */

function SolveTask({ stories, onDone, last }: TaskProps & { stories: Story[] }) {
  const checks = useChecks()
  const say = useSay(checks)
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState<'type' | 'model' | 'ask' | 'ok' | 'done'>('type')
  const s = stories[Math.min(i, stories.length - 1)]
  const T = T_(s)
  const pay = s.type === 'pay'
  const rules = ['Bir hikâyeyi çözmeden önce sorarım: kaç grup olduğunu mu biliyorum, bir gruptakini mi? Sonra paylaştırarak ya da gruplayarak modellerim.']
  const dnd = useDnd((item, target) => {
    if (phase !== 'type' || item !== 'story' || (target !== 'pay' && target !== 'grup')) return false
    if (target !== s.type) {
      return say.nudge(pay ? `Bu hikâyede kaç ${s.ctx.share.noun} olduğu belli: ${s.p}. Sorulan ne: kaç grup mu, her birine kaç mı?` : `Bu hikâyede her gruba kaç tane konacağı belli: ${s.k}. Sorulan ne: her birine kaç mı, kaç grup mu?`, { mis: 'Paylaştırma ile gruplamayı karıştırıyor', at: target })
    }
    say.clear()
    sfx.ok()
    setPhase('model')
  })
  const next = () => {
    say.clear()
    if (i + 1 >= stories.length) return setPhase('done')
    setI(i + 1)
    setPhase('type')
  }
  const sh = s.ctx.share
  const gr = s.ctx.group
  const opts: Opt[] = pay
    ? [
      { label: `${s.k} ${s.ctx.item}`, ok: true },
      { label: `${s.p} ${s.ctx.item}`, nudge: `${s.p}, ${sh.noun} sayısı. Modelde bir ${sh.noun} için kaç ${s.ctx.item} var?`, mis: 'Grup sayısını, bir paydaki miktar sanıyor' },
      { label: `${T} ${s.ctx.item}`, nudge: `${T}, hepsi. Bir tanesine kaç düştü?` },
    ]
    : [
      { label: `${s.p} ${gr.noun}`, ok: true },
      { label: `${s.k} ${gr.noun}`, nudge: `${s.k}, bir ${gr.noun} içindeki sayı. Masada kaç ${gr.noun} oldu?`, mis: 'Gruptaki nesne sayısını grup sayısı sanıyor' },
      { label: `${T} ${gr.noun}`, nudge: `${T}, bütün ${s.ctx.pl}. Kaç ${gr.noun} doldurdun?` },
    ]
  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4" key={i}>
          {phase === 'type' ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <Drop dnd={dnd} id="pay" className={`grid min-h-28 place-items-center rounded-2xl border-2 border-dashed border-sky-400 bg-sky-50 p-3 text-center text-sky-900 ${say.wrong === 'pay' ? 'animate-shake' : ''}`}>
                  <span><span className="block text-3xl">🍽️</span><b className="text-lg">Paylaştırma</b><span className="block text-xs font-bold">Kaç grup var biliyoruz; her birine kaç?</span></span>
                </Drop>
                <Drop dnd={dnd} id="grup" className={`grid min-h-28 place-items-center rounded-2xl border-2 border-dashed border-orange-400 bg-orange-50 p-3 text-center text-orange-900 ${say.wrong === 'grup' ? 'animate-shake' : ''}`}>
                  <span><span className="block text-3xl">🛍️</span><b className="text-lg">Gruplama</b><span className="block text-xs font-bold">Bir grupta kaç var biliyoruz; kaç grup?</span></span>
                </Drop>
              </div>
              {say.view('work')}
              <Sticky>
                <Tray title="Hikâye kartı">
                  <Drag dnd={dnd} item="story" label={text(s)} className="min-h-16 w-full rounded-2xl bg-white px-4 py-3 text-left text-lg leading-snug font-black text-ink shadow-[0_3px_0_#cbd5e1] ring-2 ring-line">
                    <span className="mr-2 text-2xl" aria-hidden>{s.ctx.e}</span>{text(s)}
                  </Drag>
                </Tray>
              </Sticky>
            </>
          ) : (
            <>
              <Card><p className="text-base font-black"><span className="mr-1 text-xl">{s.ctx.e}</span>{text(s)} <span className={`ml-1 rounded-lg px-2 py-0.5 text-sm ${pay ? 'bg-sky-100 text-sky-800' : 'bg-orange-100 text-orange-800'}`}>{pay ? 'Paylaştırma' : 'Gruplama'}</span></p></Card>
              {pay ? <ShareBoard T={T} p={s.p} ctx={s.ctx} say={say} onEqual={() => setPhase('ask')} /> : <GroupBoard T={T} k={s.k} ctx={s.ctx} say={say} onDone={() => setPhase('ask')} />}
              {say.view('work')}
            </>
          )}
        </Stage>
      }
      panel={
        <>
          <Prompt step={`Hikâye ${Math.min(i + 1, stories.length)} / ${stories.length}`}>
            {phase === 'type' ? <>Hikâyeyi oku. Bu bir <b>paylaştırma</b> mı, <b>gruplama</b> mı? Hikâye kartını doğru kutuya sürükle.</>
              : phase === 'model' ? (pay ? <>{T} {s.ctx.item} var, {s.p} {sh.noun} var. Eşit paylaştır: sepetten tutup sürükle.</> : <>Her {gr.noun} için {s.k} {s.ctx.item}. {cap(gr.noun)} yığınından boş {gr.noun} sürükle ve doldur.</>)
              : <>Modeline bak ve hikâyenin sorusunu cevapla.</>}
          </Prompt>
          {say.view('panel')}
          {phase === 'ask' && (
            <Reveal key={i}>
              <DragAsk checks={checks} onOk={() => setPhase('ok')} okText="Doğru!" ask={{ q: pay ? sh.q : gr.q, options: mix(`sv-${i}-${s.ctx.id}`, opts) }} />
            </Reveal>
          )}
          {phase === 'ok' && (
            <Reveal>
              <Card><p className="text-center text-lg font-black text-emerald-800">{pay ? `${s.p} ${sh.noun}, her birine ${s.k} ${s.ctx.item}` : `${s.p} ${gr.noun}, her birinde ${s.k} ${s.ctx.item}`}: {s.p} × {s.k} = {T}</p></Card>
              <NextButton last={false} onClick={next} />
            </Reveal>
          )}
          {phase === 'done' && (
            <Reveal>
              <RulesFound rules={rules} />
              <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
            </Reveal>
          )}
        </>
      }
    />
  )
}

