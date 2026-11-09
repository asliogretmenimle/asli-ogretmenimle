import { useEffect, useRef, useState } from 'react'
import type { InteractionProps } from '../types'
import { Scene } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { Header, NextButton, Prompt, Split, Stage, pick, shuffle, useChecks } from '../donusum-studyosu/ortak'
import { DragAsk, HowTo, RulesFound, useDnd, type Tool, type ToolInfo } from '../sayilari-karsilastir/parts'
import { BOX, CARD_TOOL, EndView, Fill, GUESS_TOOL, GroupView, Ledger, Reveal, SKIN, SORT_TOOL, SortBins, StaticGroups, TOOLS, erli, pickN, useGroup, useSay, type Part, type SayApi, type Skin } from './sepet'

/**
 * 94. Sepetlere Grupla (3. sınıf, MAT.3.2.4 çarpma ve bölme)
 * Masaya dağınık biçimde rastgele sayıda elma, yumurta ya da top gelir. Çocuk bunları tek tek ya da avuç avuç
 * 4’erli sepetlere sürükler (Polypad gibi: nesne kalkar, parmağı izler, sepete oturur ya da geri uçar).
 * Sepet 4’e ulaşınca kapanır, yeni boş sepet çıkar; fazlası sığmaz, geri döner. Dışarıda kalanların neden
 * girmediğini keşfeder: kalan. Her görevin üstünde amaç ve “Nasıl kullanılır?” kartı vardır.
 *  1. 4’erli sepetler: hepsini sepetlere koy; son sepet neden kapanmadı? (kalan) → bölme defterine ilk satır
 *  2. Önce tahmin, sonra dene: aynı sayıda nesne 3’erli, sonra 5’erli sepetlere (kalan tahmini kartla)
 *  3. Hiç kalan yok mu? Tam bölünme (kalan 0) ve “1 tane daha gelseydi?”
 *  4. Kalan 5 olabilir mi? Bir arkadaşın yarım işini düzelt, sonra olası/olanaksız kalan kartlarını ayır
 *  5. Cümleden işarete: “15 elmayı 4’erli sepetlere koydum, 3 sepet doldu, 3 elma kaldı” → 15 ÷ 4 = 3, kalan 3 → 3 × 4 + 3 = 15
 *  Defter: “15 elma = 3 sepet × 4 + 3 kalan” biçiminde her denemenin kaydı. Son: kural defteri.
 */

type Done = (first: boolean, rules: string[]) => void
export interface Entry { n: number; d: number; q: number; r: number; sk: Skin }
const lineOf = (e: Entry) => `${e.n} ${e.sk.one} = ${e.q} sepet × ${e.d} + ${e.r} kalan`

interface Setup { seed: number; t1: { n: number; sk: Skin }; t2: { n: number; sk: Skin }; t3: { n: number; sk: Skin }; t4: { n: number; sk: Skin } }
function makeSetup(): Setup {
  const sk = shuffle([SKIN.elma, SKIN.yumurta, SKIN.top] as Skin[])
  const n1 = pickN(4, 11, 23)
  let n4 = pickN(4, 17, 23)
  while (n4 === n1) n4 = pickN(4, 17, 23)
  return {
    seed: Math.floor(Math.random() * 1e9),
    t1: { n: n1, sk: sk[0] },
    /** 3’e de 5’e de tam bölünmeyen: iki denemede de kalan olsun */
    t2: { n: pick([11, 13, 14, 16, 17, 19, 22, 23]), sk: sk[1] },
    t3: { n: pick([16, 20, 24]), sk: sk[2] },
    t4: { n: n4, sk: sk[1] },
  }
}

const bx = BOX.sepet
const TASKS: { emoji: string; title: string; goal: string; tools: (sk: Skin) => (Tool | ToolInfo)[] }[] = [
  { emoji: '🧺', title: '4’erli sepetler', goal: 'Masadaki nesneleri 4’erli sepetlere koymak ve dışarıda kalanların neden sepete girmediğini keşfetmek.', tools: (sk) => { const t = TOOLS(sk, bx); return [t.obj, t.hand, t.box, 'answer'] } },
  { emoji: '🔮', title: 'Önce tahmin et, sonra dene', goal: 'Sepetler 3’erli ve 5’erli olunca kaç nesne dışarıda kalacağını önce tahmin etmek, sonra deneyip karşılaştırmak.', tools: (sk) => { const t = TOOLS(sk, bx, '3 ya da 5'); return [GUESS_TOOL, t.obj, t.hand, t.box, t.kalan, 'answer'] } },
  { emoji: '🎯', title: 'Hiç kalan yok mu?', goal: 'Hiç nesnenin dışarıda kalmadığı durumu (kalan 0, tam bölünme) bulmak.', tools: (sk) => { const t = TOOLS(sk, bx); return [GUESS_TOOL, t.obj, t.hand, t.box, t.kalan, 'answer'] } },
  { emoji: '🤔', title: 'Kalan 5 olabilir mi?', goal: 'Bir arkadaşın işini düzeltip kalanın neden sepet büyüklüğünden küçük olması gerektiğini göstermek.', tools: (sk) => { const t = TOOLS(sk, bx); return [t.obj, t.box, t.kalan, 'answer', SORT_TOOL('böyle bir kalan olabilir mi, düşün')] } },
  { emoji: '➗', title: 'Cümleden işarete', goal: 'Sepet deneyini önce cümleyle, sonra ÷ işaretiyle yazmak ve çarpmayla kontrol etmek.', tools: () => [CARD_TOOL] },
]

export default function SepetlereGrupla({ grade, onFinish }: InteractionProps) {
  const [setup] = useState(makeSetup)
  const [idx, setIdx] = useState(0)
  const [rules, setRules] = useState<string[]>([])
  const [ledger, setLedger] = useState<Entry[]>([])
  const [help, setHelp] = useState(true)
  const firsts = useRef<boolean[]>([])
  const end = idx >= TASKS.length
  const t = TASKS[Math.min(idx, TASKS.length - 1)]
  const last = idx === TASKS.length - 1
  const sk = [setup.t1.sk, setup.t2.sk, setup.t3.sk, setup.t4.sk, setup.t1.sk][Math.min(idx, 4)]

  const done: Done = (first, r) => {
    firsts.current[idx] = first
    setRules((old) => [...old, ...r.filter((x) => !old.includes(x))])
    setIdx(idx + 1)
    setHelp(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const add = (e: Entry) => setLedger((l) => [...l, e])
  const finish = () => {
    const e = ledger[0]
    onFinish({
      stars: starsFor(firsts.current.filter(Boolean).length / TASKS.length),
      summary: `${TASKS.length} görevde nesneleri sepetlere gruplayıp ${ledger.length} bölme kaydı yazdın; ${rules.length} kuralı kendin buldun.`,
      insight: e
        ? `${lineOf(e)}: bu, ${e.n} ÷ ${e.d} = ${e.q}, kalan ${e.r} demektir. Kalan, sepeti dolduramayan nesnelerdir ve her zaman sepet büyüklüğünden küçüktür; kalan 0 ise sayı tam bölünür.`
        : 'Kalan, sepeti dolduramayan nesnelerdir ve her zaman sepet büyüklüğünden küçüktür.',
    })
  }

  const props: TaskProps = { onDone: done, last, ledger, add, setup }
  return (
    <Scene grade={grade} className="select-none [-webkit-touch-callout:none]">
      <Header
        emoji={end ? '📒' : t.emoji}
        kicker={end ? 'Tamamlandı' : 'Görev'}
        title={end ? 'Kural defterin' : t.title}
        idx={Math.min(idx, TASKS.length - 1)}
        total={TASKS.length}
        right={end ? null : (
          <button type="button" onClick={() => setHelp((h) => !h)} aria-pressed={help} aria-label="Nasıl kullanılır?" className={`grid size-11 place-items-center rounded-full text-lg font-black ring-1 transition ${help ? 'bg-sky-600 text-white ring-sky-700' : 'bg-white text-sky-700 ring-sky-200 hover:bg-sky-50'}`}>?</button>
        )}
      />
      {!end && <HowTo goal={t.goal} tools={t.tools(sk)} open={help} onToggle={() => setHelp((h) => !h)} />}
      {end ? (
        <EndView rules={rules} onFinish={finish} note="Bu kuralları ezberlemedin: hepsini nesneleri sepetlere koyarak kendin buldun." />
      ) : idx === 0 ? (
        <FirstTask key={idx} {...props} />
      ) : idx === 1 ? (
        <GuessTask key={idx} {...props} />
      ) : idx === 2 ? (
        <ExactTask key={idx} {...props} />
      ) : idx === 3 ? (
        <FixTask key={idx} {...props} />
      ) : (
        <SignTask key={idx} {...props} />
      )}
    </Scene>
  )
}

interface TaskProps { onDone: Done; last: boolean; ledger: Entry[]; add: (e: Entry) => void; setup: Setup }

function LedgerCard({ ledger }: { ledger: Entry[] }) {
  return <Ledger lines={ledger.map(lineOf)} empty="Sepetleri doldurdukça buraya yazılacak." />
}

/** Her görevde aynı: masa + sepetler; bırakma reddedilirse nesne geri uçar ve ipucu çıkar */
function useBoard(g: ReturnType<typeof useGroup>, sk: Skin, s: SayApi, active: boolean) {
  return useDnd((item, target) => {
    if (!active) return false
    const v = g.move(item, target, sk, bx)
    if (!v) return false
    if (!v.ok) return s.tell(v.msg, { mis: v.mis, at: target })
    if (v.note) s.ok(v.note)
    else s.clear()
  })
}

/* ───────────── 1. 4’erli sepetler ───────────── */

function FirstTask({ onDone, last, ledger, add, setup }: TaskProps) {
  const { n, sk } = setup.t1
  const d = 4
  const checks = useChecks()
  const s = useSay(checks)
  const g = useGroup({ n, size: d, seed: setup.seed, kalanZone: false })
  const [phase, setPhase] = useState<'play' | 'why' | 'done'>('play')
  const dnd = useBoard(g, sk, s, phase === 'play')
  const q = Math.floor(n / d)
  const r = n % d
  const rules = ['4’erli sepetlere koyarken 4’e tamamlanamayan nesneler dışarıda kalır: bunlara kalan denir.']
  const lastLen = g.boxes[g.boxes.length - 1]?.length ?? 0
  const few = g.loose.length > 0 && g.loose.length + (lastLen < d ? lastLen : 0) < d

  useEffect(() => {
    if (!g.partial || phase !== 'play') return
    const id = window.setTimeout(() => setPhase('why'), 700)
    return () => window.clearTimeout(id)
  }, [g.partial, phase])

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <GroupView g={g} dnd={dnd} skin={sk} box={bx} showKalan={phase === 'done'} kalanSub="sepeti dolduramadılar" locked={phase !== 'play'} wrong={s.wrong} />
          {s.view('work')}
        </Stage>
      }
      panel={
        <>
          {phase === 'play' && !few && (
            <Prompt step={`${n} ${sk.one}`}>Masada <b>{n} {sk.one}</b> var. Hepsini <b>4’erli</b> sepetlere koy: her sepet 4 {sk.one} alır, dolunca kapanır. İstersen yukarıdan bir seferde kaç tane alacağını seç.</Prompt>
          )}
          {phase === 'play' && few && (
            <Reveal><Prompt step="Son sepet">Masada <b>{g.loose.length} {sk.one}</b> kaldı. Onları da yeni sepete koymayı dene. Sepet kapanacak mı?</Prompt></Reveal>
          )}
          {s.view('panel')}
          {phase === 'why' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => {
                  g.flushPartial()
                  add({ n, d, q, r, sk })
                  setPhase('done')
                }}
                okText={`Evet! ${r} ${sk.one} sepeti dolduramadı. Onlar kalan.`}
                ask={{
                  q: `${q} sepet doldu ve kapandı. Son sepette ${r} ${sk.one} var ama kapanmadı. Neden?`,
                  options: [
                    { label: `4’e tamamlanamadı: ${d - r} ${sk.one} daha gerekirdi`, ok: true },
                    { label: 'Sepet bozuk, kapağı kapanmıyor', nudge: `Önceki sepetler kaç ${sk.one} alınca kapandı? Bu sepette kaç tane var?` },
                    { label: `${r} ${sk.one} de bir sepet eder, kapanmalıydı`, nudge: `Diğer sepetlerde kaçar ${sk.one} var? Bu sepet onlarla aynı mı?`, mis: 'Eksik kalan grubu da tam grup gibi sayıyor' },
                  ],
                }}
              />
            </Reveal>
          )}
          {phase === 'done' && (
            <Reveal>
              <Prompt step="Defterine yazıldı">{n} {sk.one}: {q} sepet doldu, {r} {sk.one} kaldı. Kısaca:</Prompt>
              <LedgerCard ledger={ledger} />
              <RulesFound rules={rules} />
              <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
            </Reveal>
          )}
        </>
      }
    />
  )
}

/* ───────────── tahmin + deneme turu (görev 2 ve 3) ───────────── */

const skip = (d: number, upto: number) => Array.from({ length: Math.floor(upto / d) }, (_, i) => (i + 1) * d).join(', ')

function GuessRound({ n, d, sk, seed, s, ledger, add, onNext, nextText, step }: { n: number; d: number; sk: Skin; seed: number; s: SayApi; ledger: Entry[]; add: (e: Entry) => void; onNext: (e: Entry) => void; nextText: string; step: string }) {
  const g = useGroup({ n, size: d, seed, kalanZone: true })
  const [guess, setGuess] = useState<number | null>(null)
  const [entry, setEntry] = useState<Entry | null>(null)
  const dnd = useBoard(g, sk, s, guess !== null && !g.finished)
  const guessChecks = useChecks()

  useEffect(() => {
    if (!g.finished || entry || guess === null) return
    const e = { n, d, q: g.q, r: g.r, sk }
    setEntry(e)
    add(e)
    if (guess === g.r) s.ok(`Tahminin tuttu: kalan ${g.r}! ${d}’er saydığında ${n} = ${g.q * d} + ${g.r}.`)
    else if (guess >= d) s.tell(`Tahminin ${guess}, kalan ${g.r} çıktı. Dışarıda ${guess} ${sk.one} kalsaydı, ${d} tanesiyle bir sepet daha dolmaz mıydı?`, { mis: 'Kalanın bölenden büyük ya da eşit olabileceğini tahmin ediyor' })
    else s.tell(`Tahminin ${guess}, kalan ${g.r} çıktı. ${d}’er say: ${skip(d, n)}. ${n} = ${g.q * d} + ${g.r}.`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.finished])

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <GroupView g={g} dnd={dnd} skin={sk} box={bx} showKalan locked={guess === null || !!entry} wrong={s.wrong} />
          {s.view('work')}
        </Stage>
      }
      panel={
        <>
          {guess === null && (
            <>
              <Prompt step={`${step} · Tahmin`}>Masada <b>{n} {sk.one}</b> var. Bu kez sepetler <b>{erli(d)}</b>: her sepet {d} {sk.one} alır. Denemeden önce tahmin et: kaç {sk.one} dışarıda kalır?</Prompt>
              <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-900 ring-1 ring-sky-200">İpucu: {d}’er sayabilirsin: {d}, {2 * d}, {3 * d}…</p>
              <Fill predict step="Tahmin kartını sürükle" checks={guessChecks} parts={['Tahminim: kalan', { id: 'g' }]} cards={[0, 1, 2, 3, 4, 5]} title="Tahmin kartları" onDone={(v) => setGuess(v.g)} />
            </>
          )}
          {guess !== null && !entry && (
            <Reveal>
              <Prompt step={`${step} · Dene`}>Tahminin: <b className="text-sky-700">kalan {guess}</b>. Şimdi dene: {sk.acc} {erli(d)} sepetlere koy. Hiçbir sepete sığmayanları <b>Kalan</b> kutusuna sürükle.</Prompt>
            </Reveal>
          )}
          {s.view('panel')}
          {entry && (
            <Reveal>
              <div className="flex flex-wrap gap-2 text-sm font-black">
                <span className="rounded-xl bg-sky-100 px-3 py-1.5 text-sky-900">Tahminin: {guess}</span>
                <span className="rounded-xl bg-rose-100 px-3 py-1.5 text-rose-900">Kalan: {entry.r}</span>
              </div>
              <LedgerCard ledger={ledger} />
              <button type="button" onClick={() => onNext(entry)} className="btn-primary min-h-14 w-full text-lg animate-fade-up">{nextText} →</button>
            </Reveal>
          )}
        </>
      }
    />
  )
}

/* ───────────── 2. Önce tahmin et ───────────── */

function GuessTask({ onDone, last, ledger, add, setup }: TaskProps) {
  const { n, sk } = setup.t2
  const checks = useChecks()
  const s = useSay(checks)
  const [k, setK] = useState(0)
  const [res, setRes] = useState<Entry[]>([])
  const [ok, setOk] = useState(false)
  const rules = [
    'Sepet büyüklüğü değişince dolu sepet sayısı da kalan da değişir: sepetler büyüdükçe daha az sepet dolar.',
    'Kalanı tahmin etmek için sepet büyüklüğüyle ritmik sayarım (3, 6, 9, 12…): sayıyı geçmeden ulaştığım son sayıdan sonrası kalandır.',
  ]
  const D = [3, 5]
  if (k < 2)
    return (
      <GuessRound
        key={k}
        n={n}
        d={D[k]}
        sk={sk}
        seed={setup.seed + k + 7}
        s={s}
        ledger={ledger}
        add={add}
        step={`${k + 1}. deneme`}
        nextText={k === 0 ? '5’erli sepetlerle dene' : 'İki denemeyi karşılaştır'}
        onNext={(e) => {
          s.clear()
          setRes((r) => [...r, e])
          setK(k + 1)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
      />
    )
  const [a, b] = res
  return (
    <Split
      work={
        <Stage className="space-y-4 p-3 sm:p-4">
          {res.map((e) => (
            <div key={e.d}>
              <p className="mb-1 text-sm font-black text-ink">{erli(e.d)} sepetler: {e.q} sepet, {e.r} kalan</p>
              <StaticGroups q={e.q} r={e.r} size={e.d} skin={sk} box={bx} />
            </div>
          ))}
        </Stage>
      }
      panel={
        <>
          <LedgerCard ledger={ledger} />
          {!ok && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => setOk(true)}
                okText="Evet! Her sepet daha çok alınca aynı nesneler daha az sepete yeter."
                ask={{
                  q: `Aynı ${n} ${sk.one}: ${erli(3)} sepetlerde ${a.q} sepet doldu, ${erli(5)} sepetlerde ${b.q} sepet. ${erli(5)} sepetlerde neden daha az sepet doldu?`,
                  options: [
                    { label: 'Her sepete daha çok girdi; aynı nesneler daha az sepete yetti', ok: true },
                    { label: '5, 3’ten büyük; sepet sayısı da artmalıydı', nudge: 'Her sepete 5 tane koyunca masadakiler daha çabuk mu bitti, daha yavaş mı?', mis: 'Bölen büyüyünce bölümün de büyüyeceğini düşünüyor' },
                    { label: `İkinci denemede ${sk.one} sayısı azaldı`, nudge: `İki denemede de masada kaç ${sk.one} vardı? Defterine bak.` },
                  ],
                }}
              />
            </Reveal>
          )}
          {ok && (
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

/* ───────────── 3. Hiç kalan yok mu? ───────────── */

function ExactTask({ onDone, last, ledger, add, setup }: TaskProps) {
  const { n, sk } = setup.t3
  const d = 4
  const q = n / d
  const checks = useChecks()
  const s = useSay(checks)
  const [phase, setPhase] = useState<'round' | 'ask' | 'ask2' | 'done'>('round')
  const rules = [`Hiç nesne dışarıda kalmazsa kalan 0’dır: sayı o gruplara tam bölünür (${n} = ${q} × 4 + 0).`]
  if (phase === 'round')
    return (
      <GuessRound
        n={n}
        d={d}
        sk={sk}
        seed={setup.seed + 31}
        s={s}
        ledger={ledger}
        add={add}
        step={`${n} ${sk.one}`}
        nextText="Ne fark ettin?"
        onNext={() => {
          s.clear()
          setPhase('ask')
        }}
      />
    )
  return (
    <Split
      work={
        <Stage className="p-3 sm:p-4">
          <p className="mb-1 text-sm font-black text-ink">{n} {sk.one}, 4’erli sepetler: {q} sepet, 0 kalan</p>
          <StaticGroups q={q} r={0} size={d} skin={sk} box={bx} />
          <div className="mt-2 rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50 p-2 text-center text-xs font-black text-rose-800 uppercase">Kalan: 0 · masada hiç {sk.one} kalmadı</div>
        </Stage>
      }
      panel={
        <>
          <LedgerCard ledger={ledger} />
          {phase === 'ask' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('ask2')}
                okText={`Evet! ${n} ÷ 4 = ${q}, kalan 0. Hiçbir ${sk.one} açıkta kalmadı.`}
                ask={{
                  q: `${n} ${sk.acc} 4’erli sepetlere koyunca dışarıda hiç ${sk.one} kalmadı. Ne diyebiliriz?`,
                  options: [
                    { label: `Kalan 0: ${n}, 4’erli gruplara tam bölünür`, ok: true },
                    { label: 'Kalan yok, demek ki bölme yapılmadı', nudge: `${sk.acc} eşit gruplara ayırdık mı? Kaç sepet doldu, kaç ${sk.one} dışarıda kaldı?`, mis: 'Kalanı 0 olan durumu bölme saymıyor' },
                    { label: `Kalan 4: son sepete giren ${sk.one} sayısı`, nudge: `Son sepet doldu ve kapandı mı? Dolu bir sepetteki ${sk.one} kalan sayılır mı?`, mis: 'Son tam grubu kalan sanıyor' },
                  ],
                }}
              />
            </Reveal>
          )}
          {phase === 'ask2' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('done')}
                okText={`Doğru! ${n + 1} = ${q} × 4 + 1. Bir sepet daha dolması için 4 tane daha gerekir.`}
                ask={{
                  q: `Masaya 1 ${sk.one} daha gelseydi (${n + 1} ${sk.one}), 4’erli sepetlerde kalan kaç olurdu?`,
                  options: [
                    { label: '1: yeni gelen sepeti dolduramaz', ok: true },
                    { label: '5: önceki 4’e 1 eklenir', nudge: 'Dolu sepetteki nesneler kalan mı? Sepetler zaten doldu; yalnızca yeni gelen dışarıda.', mis: 'Kalanın bölenden büyük olabileceğini düşünüyor' },
                    { label: '0: yine tam bölünür', nudge: `Yeni gelen 1 ${sk.one} hangi sepete girebilir? Bütün sepetler dolu.` },
                  ],
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

/* ───────────── 4. Kalan 5 olabilir mi? ───────────── */

const CASES: [number, number][] = [[4, 3], [4, 5], [3, 3], [5, 4], [3, 2], [4, 0], [5, 6], [4, 4]]

function FixTask({ onDone, last, ledger, add, setup }: TaskProps) {
  const { n, sk } = setup.t4
  const d = 4
  const q = Math.floor(n / d)
  const r = n % d
  const checks = useChecks()
  const s = useSay(checks)
  const g = useGroup({ n, size: d, seed: setup.seed + 53, full0: q - 1, kalanZone: true })
  const [phase, setPhase] = useState<'fix' | 'ask' | 'sort' | 'done'>('fix')
  const dnd = useBoard(g, sk, s, phase === 'fix')
  const rules = ['Kalan, sepet büyüklüğünden her zaman küçüktür: 4’erli sepetlerde kalan 0, 1, 2 ya da 3 olabilir. 4 ya da daha fazlası bir sepet daha doldurur.']

  useEffect(() => {
    if (!g.finished || phase !== 'fix') return
    add({ n, d, q: g.q, r: g.r, sk })
    const id = window.setTimeout(() => setPhase('ask'), 600)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.finished])

  const items = CASES.map(([dd, rr]) => ({
    label: <>{erli(dd)} sepetler · <b>kalan {rr}</b></>,
    text: `${erli(dd)} sepetler, kalan ${rr}`,
    bin: rr < dd ? 'yes' : 'no',
    why: () =>
      rr >= dd
        ? { q: `${erli(dd)} sepetlerde dışarıda ${rr} ${sk.one} kalsaydı, ${dd} tanesiyle bir sepet daha dolmaz mıydı?`, mis: 'Kalanın bölenden büyük ya da eşit olabileceğini düşünüyor' }
        : rr === 0
          ? { q: `Hiç kalmaması olur mu? ${setup.t3.n} ${setup.t3.sk.one} 4’erli sepetlere koyduğunu hatırla.`, mis: 'Kalanın 0 olabileceğini kabul etmiyor' }
          : { q: `${rr} ${sk.one} ile ${dd}’lik bir sepet dolar mı? Dolmuyorsa dışarıda kalır: bu bir kalandır.` },
  }))

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          {phase === 'sort' ? (
            <SortBins
              s={s}
              items={items}
              trayTitle="Kalan kartları"
              deck="narrow"
              onDone={() => setPhase('done')}
              bins={[
                { id: 'yes', title: '✓ Böyle bir kalan olabilir', tone: 'border-emerald-400 bg-emerald-50 text-emerald-800' },
                { id: 'no', title: '✗ Olamaz: bir sepet daha dolar', tone: 'border-slate-300 bg-slate-50 text-slate-600' },
              ]}
            />
          ) : (
            <>
              <GroupView g={g} dnd={dnd} skin={sk} box={bx} showKalan locked={phase !== 'fix'} wrong={s.wrong} />
              {s.view('work')}
            </>
          )}
        </Stage>
      }
      panel={
        <>
          {phase === 'fix' && (
            <Prompt step="Ece’nin işi">Ece {n} {sk.acc} 4’erli sepetlere koydu ve “{q - 1} sepet doldu, <b>{r + 4} {sk.one} kaldı</b>. Kalan {r + 4}!” dedi. Ece’nin “kalan” dediği {r + 4} {sk.one} masada duruyor. Sence işi bitti mi? Masadakileri sepete ya da Kalan kutusuna sürükle.</Prompt>
          )}
          {phase !== 'sort' && s.view('panel')}
          {phase === 'ask' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => {
                  s.clear()
                  setPhase('sort')
                }}
                okText="Evet! Dışarıda 4 tane olunca onlar bir sepet daha doldurur."
                ask={{
                  q: `Ece “kalan ${r + 4}” demişti; sen ${g.q} sepet ve ${g.r} kalan buldun. 4’erli sepetlerde kalan 5, 6 ya da 7 olabilir mi?`,
                  options: [
                    { label: `Hayır: 4 ya da daha fazla ${sk.one} kalsaydı bir sepet daha dolardı`, ok: true },
                    { label: `Evet: ${sk.one} çoksa kalan da çok olur`, nudge: `Dışarıda 5 ${sk.one} kalsaydı, 4’lük bir sepeti doldurabilir miydin? Sonra kaç tane kalırdı?`, mis: 'Kalanın bölenden büyük olabileceğini düşünüyor' },
                    { label: 'Ece’nin sepetleri küçükse olabilir', nudge: `Ece’nin sepetleri de 4’lüktü. Her sepet 4 alırken dışarıda 4 ya da daha fazla ${sk.one} kalabilir mi?` },
                  ],
                }}
              />
            </Reveal>
          )}
          {phase === 'sort' && <Prompt step="Olabilir mi?">Her kartta sepet büyüklüğü ve bir kalan var. Böyle bir kalan olabilir mi? Kartı doğru sepete sürükle.</Prompt>}
          {phase === 'sort' && s.view('panel')}
          {(phase === 'ask' || phase === 'done') && <LedgerCard ledger={ledger} />}
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

/* ───────────── 5. Cümleden işarete ───────────── */

const cardsFor = (e: Entry, more: number[] = []) => [...new Set([e.n, e.d, e.q, e.r, e.q + 1, e.d + 1, ...more])].sort((x, y) => x - y)

function SignTask({ onDone, last, ledger, setup }: TaskProps) {
  const checks = useChecks()
  const e1 = ledger[0] ?? { n: setup.t1.n, d: 4, q: Math.floor(setup.t1.n / 4), r: setup.t1.n % 4, sk: setup.t1.sk }
  const e2 = ledger.find((e) => e.d === 5) ?? { n: setup.t2.n, d: 5, q: Math.floor(setup.t2.n / 5), r: setup.t2.n % 5, sk: setup.t2.sk }
  const [step, setStep] = useState(0)
  const rules = [`Gruplamayı önce cümleyle, sonra işaretle yazarım: ${e1.n} ${e1.sk.acc} 4’erli sepetlere koyunca ${e1.q} sepet dolar, ${e1.r} kalır → ${e1.n} ÷ 4 = ${e1.q}, kalan ${e1.r}. Kontrol: ${e1.q} × 4 + ${e1.r} = ${e1.n}.`]
  const e = step < 3 ? e1 : e2
  const one = e.sk.one

  const hintN = `÷ işaretinden önce bütün ${one} sayısı gelir: başta masada kaç ${one} vardı?`
  const hintD = `÷ işaretinden sonra her sepete kaç ${one} koyduğumuz gelir.`
  const hintQ = `= işaretinden sonra kaç sepet dolduğunu yaz.`
  const hintR = `Kalan, hiçbir sepete sığmayan ${one} sayısıdır.`
  const divParts = (x: Entry): Part[] => [
    { id: 'n', ok: (v) => v === x.n, hint: hintN },
    '÷',
    { id: 'd', ok: (v) => v === x.d, hint: hintD, mis: (v) => (v === x.q ? 'Bölen ile bölümü karıştırıyor' : undefined) },
    '=',
    { id: 'q', ok: (v) => v === x.q, hint: hintQ, mis: (v) => (v === x.r ? 'Bölüm ile kalanı karıştırıyor' : undefined) },
    ', kalan',
    { id: 'r', ok: (v) => v === x.r, hint: hintR },
  ]
  const other = (v: number) => (v === e1.q ? e1.d : e1.q)
  const STEPS: { title: string; text: string; parts: Part[] }[] = [
    {
      title: '1 · Cümleyle',
      text: `İlk görevdeki sepetlerin resmine bak. Önce ne olduğunu cümleyle anlat: kartları “?” kutularına sürükle.`,
      parts: [`${e1.n} ${e1.sk.acc} 4’erli sepetlere koydum.`, { id: 'q', ok: (v) => v === e1.q, hint: 'Resimde kaç sepet dolu? Kapağı kapalı sepetleri say.' }, 'sepet doldu,', { id: 'r', ok: (v) => v === e1.r, hint: `Kalan kutusunda kaç ${e1.sk.one} var?`, mis: (v) => (v >= 4 ? 'Kalanın bölenden büyük olabileceğini düşünüyor' : undefined) }, `${e1.sk.one} kaldı.`],
    },
    {
      title: '2 · İşaretle',
      text: `Matematikte aynı cümleyi kısaca ÷ (bölü) işaretiyle yazarız. “${e1.n} bölü 4 eşittir ${e1.q}, kalan ${e1.r}” diye okunur. Kartlarla yaz.`,
      parts: divParts(e1),
    },
    {
      title: '3 · Kontrol et',
      text: `Bölmeyi çarpmayla kontrol edebiliriz: dolu sepetlerdeki ${e1.sk.one} ile kalanlar birlikte kaç eder?`,
      parts: [
        { id: 'a', ok: (v, f) => (f.b === undefined ? v === e1.q || v === e1.d : v === other(f.b)), hint: `Kaç sepet doldu, her sepette kaç ${e1.sk.one} var? Bu ikisini çarp.` },
        '×',
        { id: 'b', ok: (v, f) => (f.a === undefined ? v === e1.q || v === e1.d : v === other(f.a)), hint: `Kaç sepet doldu, her sepette kaç ${e1.sk.one} var? Bu ikisini çarp.` },
        '+',
        { id: 'c', ok: (v) => v === e1.r, hint: 'Sepetlerdekilere kalanları da ekle: kaç tane kalmıştı?' },
        '=',
        { id: 't', ok: (v) => v === e1.n, hint: `Hepsi birlikte kaç ${e1.sk.one} eder? Başta masada kaç tane vardı?` },
      ],
    },
    {
      title: '4 · Bir daha',
      text: `Defterindeki bir başka deneme: ${e2.n} ${e2.sk.one}, ${erli(e2.d)} sepetler, ${e2.q} sepet doldu, ${e2.r} ${e2.sk.one} kaldı. Bunu ÷ işaretiyle yaz.`,
      parts: divParts(e2),
    },
  ]
  const done = step >= STEPS.length
  const cur = STEPS[Math.min(step, STEPS.length - 1)]
  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <p className="text-sm font-black text-ink">{e.n} {one}, {erli(e.d)} sepetler</p>
          <StaticGroups q={e.q} r={e.r} size={e.d} skin={e.sk} box={bx} />
          <Ledger lines={done ? ledger.map((x, i) => <span key={i}>{lineOf(x)} <span className="whitespace-nowrap text-pink-700">→ {x.n} ÷ {x.d} = {x.q}, kalan {x.r}</span></span>) : []} title="Bölme defterim · işaretle" empty="İşaretle yazmayı öğrenince defterin burada dolacak." />
        </Stage>
      }
      panel={
        <>
          {!done && (
            <Reveal key={step}>
              <Prompt step={cur.title}>{cur.text}</Prompt>
              <Fill key={step} checks={checks} parts={cur.parts} cards={cardsFor(e, step === 2 ? [e.n + e.r] : [])} onDone={() => setStep(step + 1)} />
            </Reveal>
          )}
          {done && (
            <Reveal>
              <Prompt step="Tamam">Cümle ve işaret aynı şeyi anlatıyor: önce sepetler, sonra sözcükler, en son ÷ işareti.</Prompt>
              <RulesFound rules={rules} />
              <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
            </Reveal>
          )}
        </>
      }
    />
  )
}
