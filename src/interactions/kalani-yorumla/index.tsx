import { useEffect, useRef, useState, type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import type { InteractionProps } from '../types'
import { Scene } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { sfx } from '../../lib/feedback'
import { Card, Header, NextButton, Prompt, Split, Stage, pick, useChecks } from '../donusum-studyosu/ortak'
import { Drag, DragAsk, Drop, HowTo, RulesFound, useDnd, type Tool, type ToolInfo } from '../sayilari-karsilastir/parts'
import { BOX, EndView, GroupView, Ledger, Reveal, SKIN, SORT_TOOL, SortBins, StaticGroups, Sticky, TOOLS, useGroup, useSay, type Box, type Skin, type SortItem } from '../sepetlere-grupla/sepet'
import { SHARE_TOOLS, ShareView, amountText, useShare, useShareDnd } from './paylas'

/**
 * 96. Kalan Ne Anlatıyor? (3–4. sınıf, MAT.3.2.6 dört işlem problemleri, MAT.3.2.7 problem kurma, MAT.4.2.7 problemler)
 * Aynı bölme (ör. 23 ÷ 4 = 5, kalan 3) farklı hikâyelerde farklı cevap verir. Her hikâyede çocuk önce nesneleri
 * sürükleyerek modeller (kutulara yumurta, arabalara öğrenci, arkadaşlara bilye), sonra kalanla ne yapılacağına
 * karar veren kartı sürükler. Görsel dil Sepetlere Grupla (94) ile ortaktır (../sepetlere-grupla/sepet.tsx).
 *  1. Kalan atılır: N yumurta, 4’lük kutular; kaç DOLU kutu? → q
 *  2. Yukarı yuvarlanır: N öğrenci, 4 kişilik arabalar; herkes için kaç araba? → q + 1 (fazladan araba belirir)
 *  3. Cevap kalanın kendisi: N bilye 4 arkadaşa adil paylaştırılır; bana kaç bilye kalır? → r
 *  4. Kalan paylaştırılır: artan kurabiyeler kesme kartıyla yarım/çeyreklere bölünüp paylaştırılır → q ve r/4
 *  5. Sınıflama: sekiz hikâye kartını dört sepete ayır (artanlar sayılmaz · bir tane daha · cevap kalan · kalan da paylaştırılır)
 *  6. Problem kurma: cevabı q + 1, r, q (4. sınıfta q ve r/4) olan hikâyeleri durum ve soru kartlarıyla kur
 *  Defter: “Aynı bölme, farklı cevaplar”. Son: kural defteri.
 */

type Done = (first: boolean, rules: string[]) => void
interface Setup { N: number; q: number; r: number; seed: number; grade: number }

function makeSetup(grade: number): Setup {
  const N = pick(grade >= 4 ? [25, 26, 27, 29, 30, 31] : [21, 22, 23, 25, 26, 27])
  return { N, q: Math.floor(N / 4), r: N % 4, seed: Math.floor(Math.random() * 1e9), grade }
}

const quarterWords = (r: number, grade: number) => (grade >= 4 ? `${r}/4` : r === 2 ? 'yarım' : `${r} çeyrek`)

const TASKS: { emoji: string; title: string; goal: string; tools: () => (Tool | ToolInfo)[] }[] = [
  { emoji: '🥚', title: 'Kaç dolu kutu?', goal: 'Yumurtaları 4’lük kutulara koyarak modellemek, sonra soruya bakıp kalanla ne yapılacağına karar vermek.', tools: () => { const t = TOOLS(SKIN.yumurta, BOX.kutu); return [t.obj, t.hand, t.box, t.kalan, 'answer'] } },
  { emoji: '🚗', title: 'Herkes binebilsin', goal: 'Öğrencileri 4 kişilik arabalara bindirmek ve dışarıda kalan öğrenciler için ne gerektiğine karar vermek.', tools: () => { const t = TOOLS(SKIN.ogrenci, BOX.araba); return [t.obj, t.hand, t.box, t.kalan, 'answer'] } },
  { emoji: '🔵', title: 'Bana kaç bilye kalır?', goal: 'Bilyeleri 4 arkadaşa adil paylaştırmak ve sorunun cevabının kalanın kendisi olduğunu görmek.', tools: () => { const t = SHARE_TOOLS(SKIN.bilye); return [t.obj, t.hand, t.me, 'answer'] } },
  { emoji: '🍪', title: 'Artanları da paylaştır', goal: 'Artan kurabiyeleri yarım ve çeyreklere bölüp 4 kişiye eşit paylaştırmak.', tools: () => { const t = SHARE_TOOLS(SKIN.kurabiye); return [t.cut, t.obj, 'answer'] } },
  { emoji: '🧺', title: 'Hikâyeleri sınıflandır', goal: 'Her hikâyede kalanla ne yapılacağına karar vermek ve hikâye kartını doğru sepete koymak.', tools: () => [SORT_TOOL('kalanla ne yapılacağına karar verip doğru sepete bırak')] },
  { emoji: '✍️', title: 'Kendi hikâyeni kur', goal: 'Aynı bölme için, cevabı istenen sayı olan bir hikâyeyi durum ve soru kartlarıyla kurmak.', tools: () => [STORY_TOOL.ctx, STORY_TOOL.qst] },
]

export default function KalaniYorumla({ grade, onFinish }: InteractionProps) {
  const [setup] = useState(() => makeSetup(grade))
  const [idx, setIdx] = useState(0)
  const [rules, setRules] = useState<string[]>([])
  const [ledger, setLedger] = useState<string[]>([])
  const [help, setHelp] = useState(true)
  const firsts = useRef<boolean[]>([])
  const end = idx >= TASKS.length
  const t = TASKS[Math.min(idx, TASKS.length - 1)]
  const last = idx === TASKS.length - 1
  const { N, q, r } = setup

  const done: Done = (first, rs) => {
    firsts.current[idx] = first
    setRules((old) => [...old, ...rs.filter((x) => !old.includes(x))])
    setIdx(idx + 1)
    setHelp(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const add = (l: string) => setLedger((x) => [...x, l])
  const finish = () =>
    onFinish({
      stars: starsFor(firsts.current.filter(Boolean).length / TASKS.length),
      summary: `${TASKS.length} görevde aynı bölmeyi (${N} ÷ 4 = ${q}, kalan ${r}) farklı hikâyelerde modelledin ve kalanı yorumladın; ${rules.length} kuralı kendin buldun.`,
      insight: `Aynı bölme, farklı cevaplar: ${N} yumurtayla ${q} dolu kutu olur (kalan atılır), ${N} öğrenciye ${q + 1} araba gerekir (bir tane daha), ${N} bilyeden bana ${r} kalır (cevap kalan), ${N} kurabiyeden herkes ${amountText(4 * q + r, grade)} yer (kalan da paylaştırılır). Kalanla ne yapılacağına sorunun kendisi karar verir.`,
    })

  const props: TaskProps = { onDone: done, last, setup, ledger, add }
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
      {!end && <HowTo goal={t.goal} tools={t.tools()} open={help} onToggle={() => setHelp((h) => !h)} />}
      {end ? (
        <EndView rules={rules} onFinish={finish} note="Bu kuralları ezberlemedin: aynı bölmeyi farklı hikâyelerde modelleyerek kendin buldun." />
      ) : idx === 0 ? (
        <EggTask key={idx} {...props} />
      ) : idx === 1 ? (
        <CarTask key={idx} {...props} />
      ) : idx === 2 ? (
        <MarbleTask key={idx} {...props} />
      ) : idx === 3 ? (
        <CookieTask key={idx} {...props} />
      ) : idx === 4 ? (
        <SortTask key={idx} {...props} />
      ) : (
        <PoseTask key={idx} {...props} />
      )}
    </Scene>
  )
}

interface TaskProps { onDone: Done; last: boolean; setup: Setup; ledger: string[]; add: (l: string) => void }

function SameLedger({ ledger }: { ledger: string[] }) {
  return <Ledger title="Aynı bölme, farklı cevaplar" lines={ledger} empty="Her hikâyenin cevabı buraya yazılacak." />
}

/** Modelden çıkan bölme: hep aynı */
function Division({ N, q, r }: { N: number; q: number; r: number }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-2 text-center ring-2 ring-pink-200 animate-pop">
      <p className="text-[11px] font-black tracking-wide text-pink-700 uppercase">Modelin söylediği bölme</p>
      <p className="text-2xl font-black text-ink tabular-nums">{N} ÷ 4 = {q}, kalan {r}</p>
    </div>
  )
}

function Story({ children }: { children: ReactNode }) {
  return <Prompt step="Hikâye">{children}</Prompt>
}

/* ───────────── 1–2. kutular ve arabalar (gruplama) ───────────── */

function useGroupTask(setup: Setup, sk: Skin, bx: Box, seedAdd: number) {
  const checks = useChecks()
  const s = useSay(checks)
  const g = useGroup({ n: setup.N, size: 4, seed: setup.seed + seedAdd, kalanZone: true })
  const [phase, setPhase] = useState<'model' | 'decide' | 'done'>('model')
  const dnd = useDnd((item, target) => {
    if (phase !== 'model') return false
    const v = g.move(item, target, sk, bx)
    if (!v) return false
    if (!v.ok) return s.tell(v.msg, { mis: v.mis, at: target })
    if (v.note) s.ok(v.note)
    else s.clear()
  })
  useEffect(() => {
    if (!g.finished || phase !== 'model') return
    const id = window.setTimeout(() => {
      s.clear()
      setPhase('decide')
    }, 600)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.finished])
  return { checks, s, g, phase, setPhase, dnd }
}

function EggTask({ onDone, last, setup, ledger, add }: TaskProps) {
  const { N, q, r } = setup
  const sk = SKIN.yumurta
  const bx = BOX.kutu
  const { checks, s, g, phase, setPhase, dnd } = useGroupTask(setup, sk, bx, 1)
  const rules = [`Soru yalnızca DOLU kutuları soruyorsa kalan atılır: ${N} yumurtayla ${q} dolu kutu olur, ${r} yumurta açıkta kalır.`]
  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <GroupView g={g} dnd={dnd} skin={sk} box={bx} showKalan kalanSub="kutuya girmeyen yumurtaları buraya sürükle" locked={phase !== 'model'} wrong={s.wrong} />
          {s.view('work')}
        </Stage>
      }
      panel={
        <>
          <Story>Çiftlikte <b>{N} yumurta</b> toplandı. Yumurtalar <b>4’lük kutulara</b> konacak. Kaç <b>DOLU</b> kutu olur?</Story>
          {phase === 'model' && <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-900 ring-1 ring-sky-200">Önce modelle: yumurtaları kutulara sürükle. Hiçbir kutuya sığmayanları <b>Kalan</b> kutusuna bırak.</p>}
          {s.view('panel')}
          {phase === 'decide' && (
            <Reveal>
              <Division N={N} q={q} r={r} />
              <DragAsk
                checks={checks}
                onOk={() => {
                  add(`🥚 Kaç dolu kutu? ${N} ÷ 4 = ${q}, kalan ${r} → cevap ${q} kutu`)
                  setPhase('done')
                }}
                okText={`Evet! ${r} yumurta bir kutuyu dolduramaz; cevap ${q} dolu kutu.`}
                ask={{
                  q: `${q} kutu doldu, ${r} yumurta arttı. Soru “kaç DOLU kutu?” diyor. Kalanla ne yapalım?`,
                  options: [
                    { label: `Artanlar kutuyu doldurmaz, onları saymam: ${q} kutu`, ok: true },
                    { label: `Bir kutu daha gerek: ${q + 1} kutu`, nudge: `${q + 1}. kutu dolu olur mu? Soru yalnızca DOLU kutuları soruyor.`, mis: 'Kalanı bağlama bakmadan yukarı yuvarlıyor' },
                    { label: `Cevap kalanın kendisi: ${r} kutu`, nudge: `${r}, kutuya girmeyen yumurta sayısı. Soru yumurtaları mı, kutuları mı soruyor?`, mis: 'Kalanı soruya bakmadan cevap sanıyor' },
                  ],
                }}
              />
            </Reveal>
          )}
          {phase === 'done' && (
            <Reveal>
              <SameLedger ledger={ledger} />
              <RulesFound rules={rules} />
              <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
            </Reveal>
          )}
        </>
      }
    />
  )
}

function CarTask({ onDone, last, setup, ledger, add }: TaskProps) {
  const { N, q, r } = setup
  const sk = SKIN.ogrenci
  const bx = BOX.araba
  const { checks, s, g, phase, setPhase, dnd } = useGroupTask(setup, sk, bx, 2)
  const [packed, setPacked] = useState(false)
  const rules = [`Herkesin binmesi gerekiyorsa kalanlar için bir araba daha gerekir: ${N} öğrenciye ${q + 1} araba.`]
  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <GroupView g={g} dnd={dnd} skin={sk} box={bx} showKalan={!packed} kalanSub="arabaya sığmayan öğrencileri buraya sürükle" locked={phase !== 'model'} wrong={s.wrong} packed={packed} />
          {packed && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm font-black text-emerald-800 ring-1 ring-emerald-300 animate-fade-up">Son araba dolu değil ama herkes bindi: {q + 1} araba.</p>}
          {s.view('work')}
        </Stage>
      }
      panel={
        <>
          <Story><b>{N} öğrenci</b> geziye gidecek. Arabalar <b>4 kişilik</b>. Herkesin gidebilmesi için kaç araba gerekir?</Story>
          {phase === 'model' && <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-900 ring-1 ring-sky-200">Önce modelle: öğrencileri arabalara bindir. Hiçbir arabaya sığmayanları <b>Kalan</b> kutusuna bırak.</p>}
          {s.view('panel')}
          {phase === 'decide' && (
            <Reveal>
              <Division N={N} q={q} r={r} />
              <DragAsk
                checks={checks}
                onOk={() => {
                  g.packKalan()
                  setPacked(true)
                  sfx.ok()
                  add(`🚗 Herkes için kaç araba? ${N} ÷ 4 = ${q}, kalan ${r} → cevap ${q + 1} araba`)
                  setPhase('done')
                }}
                okText={`Evet! ${r} öğrenci için bir araba daha: ${q + 1} araba.`}
                ask={{
                  q: `${q} araba doldu, ${r} öğrenci dışarıda kaldı. Herkes geziye gitmeli! Kalanla ne yapalım?`,
                  options: [
                    { label: `Bir araba daha gerek: ${q + 1} araba`, ok: true },
                    { label: `Artanlar sayılmaz: ${q} araba`, nudge: `O zaman ${r} öğrenci evde mi kalacak? Hikâye herkesin gitmesini istiyor.`, mis: 'Kalanı bağlama bakmadan atıyor' },
                    { label: `${q},${r} araba`, nudge: `${q},${r} araba olur mu? Arabanın bir parçası gelmez: araba sayısı bütün olmalı. Kalan ${r} öğrenci ne yapacak?`, mis: 'Kalanı ondalık kısım gibi yazıyor' },
                  ],
                }}
              />
            </Reveal>
          )}
          {phase === 'done' && (
            <Reveal>
              <SameLedger ledger={ledger} />
              <RulesFound rules={rules} />
              <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
            </Reveal>
          )}
        </>
      }
    />
  )
}

/* ───────────── 3. bilyeler (paylaştırma) ───────────── */

function MarbleTask({ onDone, last, setup, ledger, add }: TaskProps) {
  const { N, q, r, grade } = setup
  const sk = SKIN.bilye
  const checks = useChecks()
  const s = useSay(checks)
  const sh = useShare({ n: N })
  const [phase, setPhase] = useState<'model' | 'decide' | 'done'>('model')
  const dnd = useDnd((item, target) => {
    if (phase !== 'model') return false
    const v = sh.move(item, target, sk, false)
    if (!v) return false
    if (!v.ok) return s.tell(v.msg, { mis: v.mis, at: target })
    s.clear()
  })
  useEffect(() => {
    if (!sh.finished || phase !== 'model') return
    const id = window.setTimeout(() => setPhase('decide'), 600)
    return () => window.clearTimeout(id)
  }, [sh.finished, phase])
  const rules = [`Soru artanları soruyorsa cevap kalanın kendisidir: ${N} bilyeden bana ${r} bilye kalır.`]
  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <ShareView sh={sh} dnd={dnd} sk={sk} grade={grade} locked={phase !== 'model'} wrong={s.wrong} />
          {s.view('work')}
        </Stage>
      }
      panel={
        <>
          <Story><b>{N} bilyem</b> var. Bilyeleri <b>4 arkadaşıma eşit</b> paylaştıracağım. Eşit paylaştıramadıklarım bana kalacak. <b>Bana kaç bilye kalır?</b></Story>
          {phase === 'model' && <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-900 ring-1 ring-sky-200">Önce modelle: bilyeleri arkadaşlarının tabağına sürükle. Herkes aynı sayıda almalı. Eşit dağıtamadıklarını <b>Bana kalanlar</b> kutusuna bırak.</p>}
          {s.view('panel')}
          {phase === 'decide' && (
            <Reveal>
              <Division N={N} q={q} r={r} />
              <DragAsk
                checks={checks}
                onOk={() => {
                  add(`🔵 Bana kaç bilye? ${N} ÷ 4 = ${q}, kalan ${r} → cevap ${r} bilye`)
                  setPhase('done')
                }}
                okText={`Evet! Bu hikâyede cevap kalanın ta kendisi: ${r} bilye.`}
                ask={{
                  q: `Her arkadaşın ${q} bilye aldı, ${r} bilye arttı. Soru “bana kaç bilye kalır?” diyor. Kalanla ne yapalım?`,
                  options: [
                    { label: `Cevap kalanın kendisi: ${r} bilye`, ok: true },
                    { label: `${q} bilye: bölmenin sonucu`, nudge: `${q}, her arkadaşının aldığı bilye. Soru arkadaşlarını mı, seni mi soruyor?`, mis: 'Soruya bakmadan bölümü cevap sanıyor' },
                    { label: 'Hiç kalmaz, artanları da dağıtırım', nudge: `${r} bilyeyi 4 arkadaşa eşit dağıtabilir misin? Bilyeyi ikiye bölemeyiz.` },
                  ],
                }}
              />
            </Reveal>
          )}
          {phase === 'done' && (
            <Reveal>
              <SameLedger ledger={ledger} />
              <RulesFound rules={rules} />
              <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
            </Reveal>
          )}
        </>
      }
    />
  )
}

/* ───────────── 4. kurabiyeler (kalan da paylaştırılır) ───────────── */

function CookieTask({ onDone, last, setup, ledger, add }: TaskProps) {
  const { N, q, r, grade } = setup
  const sk = SKIN.kurabiye
  const checks = useChecks()
  const s = useSay(checks)
  const sh = useShare({ n: N, preset: q })
  const [phase, setPhase] = useState<'model' | 'decide' | 'done'>('model')
  const dnd = useShareDnd((item, target) => {
    if (phase !== 'model') return false
    const v = sh.move(item, target, sk, true)
    if (!v) return false
    if (!v.ok) return s.tell(v.msg, { mis: v.mis, at: target })
    s.clear()
  })
  useEffect(() => {
    if (!sh.finished || phase !== 'model') return
    const id = window.setTimeout(() => setPhase('decide'), 600)
    return () => window.clearTimeout(id)
  }, [sh.finished, phase])
  const each = amountText(4 * q + r, grade)
  const rules = [`Kalan bölünebilen bir şeyse (kurabiye, pizza) artanlar da parçalara bölünüp paylaştırılır: ${N} kurabiyeden herkes ${each} yer.`]
  const right = grade >= 4 ? `Her biri ${q} ${r}/4 kurabiye yer` : `Her biri ${q} kurabiye ve ${r === 2 ? 'yarım kurabiye' : `${r} çeyrek kurabiye`} yer`
  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <ShareView sh={sh} dnd={dnd} sk={sk} grade={grade} cookie locked={phase !== 'model'} wrong={s.wrong} />
          {s.view('work')}
        </Stage>
      }
      panel={
        <>
          <Story><b>{N} kurabiye</b> 4 arkadaşa eşit paylaştırılıyor. Herkese {q} bütün kurabiye verildi, <b>{r} kurabiye</b> arttı. Kurabiye bölünebilir! Her biri <b>ne kadar</b> kurabiye yer?</Story>
          {phase === 'model' && <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-900 ring-1 ring-sky-200">✂️ Kesme kartını masadaki bir kurabiyenin üstüne sürükle; kurabiye yarımlara ya da çeyreklere bölünür. Sonra parçaları arkadaşlarına eşit paylaştır.</p>}
          {s.view('panel')}
          {phase === 'decide' && (
            <Reveal>
              <Division N={N} q={q} r={r} />
              <DragAsk
                checks={checks}
                onOk={() => {
                  add(`🍪 Her biri ne kadar? ${N} ÷ 4 = ${q}, kalan ${r} → cevap ${each}`)
                  setPhase('done')
                }}
                okText={grade >= 4 ? `Evet! ${r} kurabiye 4 kişiye bölününce herkes ${r}/4 alır: ${q} ${r}/4 kurabiye.` : `Evet! ${r} kurabiye 4 kişiye bölününce herkes ${quarterWords(r, grade)} daha alır.`}
                ask={{
                  q: `Tabaklara bak. Kalanla ne yaptık? Her biri ne kadar kurabiye yer?`,
                  options: [
                    { label: right, ok: true },
                    { label: `Her biri ${q} kurabiye yer, artanlar kalır`, nudge: `Masada kurabiye kaldı mı? Tabaklara bak: ${q} bütün kurabiyenin yanında başka ne var?`, mis: 'Bölünebilen kalanı da atıyor' },
                    { label: `Her biri ${q + 1} kurabiye yer`, nudge: `Herkes 1 bütün kurabiye daha mı aldı? ${r} kurabiye 4 kişiye bütün olarak yeter mi?`, mis: 'Kalanı bağlama bakmadan yukarı yuvarlıyor' },
                  ],
                }}
              />
            </Reveal>
          )}
          {phase === 'done' && (
            <Reveal>
              <SameLedger ledger={ledger} />
              <RulesFound rules={rules} />
              <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
            </Reveal>
          )}
        </>
      }
    />
  )
}

/* ───────────── 5. sınıflama ───────────── */

type QType = 'at' | 'ekle' | 'kalan' | 'bol'
const STORIES: { text: string; bin: QType }[] = [
  { text: '17 çiçek var. Her vazoya 5 çiçek konuyor. Kaç vazo tam dolar?', bin: 'at' },
  { text: '26 kişi kampa gidiyor. Her çadırda 4 kişi yatıyor. Herkese kaç çadır gerekir?', bin: 'ekle' },
  { text: '14 kalem 4 kardeşe eşit paylaştırılıyor. Kaç kalem artar?', bin: 'kalan' },
  { text: '10 pizza 4 kişiye eşit paylaştırılıyor. Her biri ne kadar pizza yer?', bin: 'bol' },
  { text: 'Her gün 4 sayfa okuyorum. 30 sayfalık kitap kaç günde biter?', bin: 'ekle' },
  { text: '22 lirayla tanesi 5 lira olan defterlerden kaç tane alabilirim?', bin: 'at' },
  { text: '19 çıkartma 3 arkadaşa eşit dağıtılıyor, artanlar öğretmene veriliyor. Öğretmene kaç çıkartma kalır?', bin: 'kalan' },
  { text: '9 metre kurdele 2 kişiye eşit kesilecek. Her biri kaç metre alır?', bin: 'bol' },
]
const BINS: { id: QType; title: string; tone: string }[] = [
  { id: 'at', title: '🚫 Artanlar sayılmaz', tone: 'border-orange-300 bg-orange-50 text-orange-900' },
  { id: 'ekle', title: '➕ Bir tane daha gerek', tone: 'border-sky-300 bg-sky-50 text-sky-900' },
  { id: 'kalan', title: '🎯 Cevap kalanın kendisi', tone: 'border-rose-300 bg-rose-50 text-rose-900' },
  { id: 'bol', title: '✂️ Kalan da paylaştırılır', tone: 'border-emerald-300 bg-emerald-50 text-emerald-900' },
]
function whyBin(right: QType, to: string): { q: string; mis?: string } {
  if (to === 'kalan') return { q: 'Soru artan şeylerin sayısını mı soruyor? Sorunun son cümlesini bir daha oku.', mis: 'Kalanı soruya bakmadan cevap sanıyor' }
  if (to === 'bol') return { q: 'Bu şey parçalara bölünebilir mi? Yarım vazo, yarım çadır ya da yarım defter olur mu?', mis: 'Bölünemeyen kalanı kesirle paylaştırıyor' }
  if (right === 'at' && to === 'ekle') return { q: 'Soru tam dolu olanları mı, yoksa hepsine yetecek kadarını mı soruyor? Yarım dolu olan sayılır mı?', mis: 'Kalanı bağlama bakmadan yukarı yuvarlıyor' }
  if (right === 'ekle' && to === 'at') return { q: 'Artanlar ne olacak? Herkesin ya da hepsinin bir yere sığması gerekiyor mu?', mis: 'Kalanı bağlama bakmadan atıyor' }
  if (right === 'kalan') return { q: 'Soru, artan şeylerin sayısını soruyor. Cevap kalanın ta kendisi değil mi?' }
  if (right === 'bol') return { q: 'Pizza ve kurdele bölünebilir. Artanları da paylaştırabilir miyiz?' }
  return { q: 'Sorunun son cümlesini bir daha oku: kalanla ne yapmalıyız?' }
}

function SortTask({ onDone, last, ledger }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const [done, setDone] = useState(false)
  const rules = ['Bölme işlemini yapmak yetmez: kalanla ne yapacağıma sorunun kendisi karar verir.']
  const items: SortItem[] = STORIES.map((st) => ({ label: st.text, text: st.text, bin: st.bin, why: (to) => whyBin(st.bin, to) }))
  return (
    <Split
      work={
        <Stage className="p-3 sm:p-4">
          <SortBins s={s} items={items} bins={BINS} cols={4} deck trayTitle="Hikâye kartları" onDone={() => setDone(true)} />
        </Stage>
      }
      panel={
        <>
          <Prompt step="Sınıflandır">Her hikâye kartını oku. Kalanla ne yapmak gerekir? Kartı doğru sepete sürükle.</Prompt>
          {s.view('panel')}
          <SameLedger ledger={ledger} />
          {done && (
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

/* ───────────── 6. kendi hikâyeni kur ───────────── */

const STORY_TOOL: Record<'ctx' | 'qst', ToolInfo> = {
  ctx: { icon: <span className="grid h-5 min-w-6 place-items-center rounded-md bg-amber-100 px-0.5 text-[11px] ring-1 ring-amber-300">🥚</span>, name: 'Durum kartı', text: 'Hikâyenin başlangıcını seç: kartı “Hikâyem” kutusundaki ilk boşluğa sürükle. Değiştirmek istersen “Durumu değiştir”e dokun.' },
  qst: { icon: <span className="grid h-5 min-w-6 place-items-center rounded-md bg-pink-100 px-0.5 text-[11px] font-black text-pink-700 ring-1 ring-pink-300">?</span>, name: 'Soru kartı', text: 'Durumu seçince o duruma uygun sorular çıkar. Cevabı hedefteki sayı olan soruyu ikinci boşluğa sürükle.' },
}

interface Ctx { id: string; icon: string; text: string; sk: Skin; bx: Box; qs: [QType, string][] }
const CTXS = (N: number): Ctx[] => [
  { id: 'yumurta', icon: '🥚', text: `${N} yumurta 4’lük kutulara konuyor.`, sk: SKIN.yumurta, bx: BOX.kutu, qs: [['at', 'Kaç kutu tam dolar?'], ['ekle', 'Bütün yumurtalar için kaç kutu gerekir?'], ['kalan', 'Kaç yumurta kutulara girmez?']] },
  { id: 'araba', icon: '🚗', text: `${N} öğrenci 4 kişilik arabalarla geziye gidiyor.`, sk: SKIN.ogrenci, bx: BOX.araba, qs: [['ekle', 'Herkesin gitmesi için kaç araba gerekir?'], ['at', 'Kaç araba tam dolu gider?'], ['kalan', 'Son arabada kaç öğrenci olur?']] },
  { id: 'bilye', icon: '🔵', text: `${N} bilye 4 arkadaşa eşit paylaştırılıyor, artanlar bana kalıyor.`, sk: SKIN.bilye, bx: BOX.sepet, qs: [['at', 'Her arkadaş kaç bilye alır?'], ['kalan', 'Bana kaç bilye kalır?']] },
  { id: 'kurabiye', icon: '🍪', text: `${N} kurabiye 4 kişiye eşit paylaştırılıyor.`, sk: SKIN.kurabiye, bx: BOX.sepet, qs: [['at', 'Her biri kaç bütün kurabiye alır?'], ['bol', 'Artanları da bölersek her biri ne kadar kurabiye yer?'], ['kalan', 'Bütün olarak kaç kurabiye artar?']] },
]
const REASON: Record<QType, string> = { at: 'artanlar sayılmaz', ekle: 'artanlar için bir tane daha gerekir', kalan: 'cevap kalanın kendisidir', bol: 'artanlar da bölünüp paylaştırılır' }

function PoseTask({ onDone, last, setup, ledger }: TaskProps) {
  const { N, q, r, grade } = setup
  const checks = useChecks()
  const s = useSay(checks)
  const ctxs = CTXS(N)
  const ans = (t: QType) => (t === 'at' ? `${q}` : t === 'ekle' ? `${q + 1}` : t === 'kalan' ? `${r}` : grade >= 4 ? `${q} ${r}/4` : `${q} ve ${quarterWords(r, grade)}`)
  const goals: QType[] = grade >= 4 ? ['ekle', 'kalan', 'bol', 'at'] : ['ekle', 'kalan', 'at']
  const [k, setK] = useState(0)
  const [ctx, setCtx] = useState<Ctx | null>(null)
  const [made, setMade] = useState<{ ctx: Ctx; qt: string; a: string } | null>(null)
  const [stories, setStories] = useState<string[]>([])
  const done = k >= goals.length
  const goal = ans(goals[Math.min(k, goals.length - 1)])
  const rules = [`Aynı bölmeyle (${N} ÷ 4 = ${q}, kalan ${r}) farklı sorular kurabilirim; sorunun cevabı ${q}, ${q + 1} ya da ${r} olabilir.`]

  const dnd = useDnd((item, target) => {
    if (done || made) return false
    if (item.startsWith('ctx-') && target === 'story-ctx') {
      s.clear()
      setCtx(ctxs.find((c) => c.id === item.slice(4)) ?? null)
      sfx.ok()
      return
    }
    if (item.startsWith('qst-') && target === 'story-qst' && ctx) {
      const [t, text] = ctx.qs[Number(item.slice(4))]
      const a = ans(t)
      if (a !== goal) {
        const can = ctx.qs.some(([x]) => ans(x) === goal)
        return s.nudge(`Bu soruda ${REASON[t]}: cevap ${a} olur. Cevabın ${goal} olması için kalanla ne yapılmalı?${can ? '' : ' Bu durumla böyle bir soru yok; durumu değiştir.'}`, { at: target })
      }
      s.clear()
      sfx.ok()
      setMade({ ctx, qt: text, a })
      setStories((x) => [...x, `${ctx.icon} ${ctx.text} ${text} → ${a}`])
      window.setTimeout(() => {
        setMade(null)
        setCtx(null)
        setK((v) => v + 1)
      }, 1600)
      return
    }
    return false
  })

  const view = made?.ctx ?? ctx
  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <div className="rounded-2xl bg-white px-3 py-2 text-center ring-2 ring-pink-200">
            <p className="text-[11px] font-black tracking-wide text-pink-700 uppercase">Hep aynı bölme</p>
            <p className="text-2xl font-black text-ink tabular-nums">{N} ÷ 4 = {q}, kalan {r}</p>
          </div>
          <StaticGroups q={q} r={r} size={4} skin={view?.sk ?? SKIN.top} box={view?.bx ?? BOX.sepet} />
          {s.view('work')}
          {!done && !made && (
            <Sticky>
              <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
                <p className="mb-2 text-xs font-black tracking-wide text-ink-soft uppercase">{ctx ? 'Soru kartları: birini ikinci boşluğa sürükle' : 'Durum kartları: birini ilk boşluğa sürükle'}</p>
                <div className="flex flex-wrap gap-2">
                  {!ctx &&
                    ctxs.map((c) => (
                      <Drag key={c.id} dnd={dnd} item={`ctx-${c.id}`} label={`Durum: ${c.text}`} className="min-h-14 max-w-full rounded-2xl bg-amber-50 px-3 py-2 text-left text-[15px] leading-snug font-black text-amber-950 shadow-[0_3px_0_#fcd34d] ring-2 ring-amber-300">
                        <span className="mr-1.5" aria-hidden>{c.icon}</span>{c.text}
                      </Drag>
                    ))}
                  {ctx &&
                    ctx.qs.map(([, text], i) => (
                      <Drag key={i} dnd={dnd} item={`qst-${i}`} label={`Soru: ${text}`} className="min-h-14 max-w-full rounded-2xl bg-pink-50 px-3 py-2 text-left text-[15px] leading-snug font-black text-pink-950 shadow-[0_3px_0_#f9a8d4] ring-2 ring-pink-300">
                        <span className="mr-1.5 text-pink-400" aria-hidden>?</span>{text}
                      </Drag>
                    ))}
                </div>
              </div>
            </Sticky>
          )}
        </Stage>
      }
      panel={
        <>
          {!done && (
            <Reveal key={k}>
              <div data-goal>
                <Prompt step={`Hikâye ${k + 1} / ${goals.length}`}>Cevabı <b className="rounded-lg bg-pink-100 px-1.5 text-pink-700">{goal}</b> olan bir hikâye kur. Önce bir durum kartı, sonra bir soru kartı sürükle.</Prompt>
              </div>
              <Card>
                <p className="mb-2 text-[11px] font-black tracking-wide text-amber-700 uppercase">Hikâyem</p>
                {view ? (
                  <div data-ctx className="rounded-xl bg-amber-50 px-3 py-2 text-base font-extrabold ring-1 ring-amber-300 animate-pop">{view.icon} {view.text}</div>
                ) : (
                  <Drop dnd={dnd} id="story-ctx" className="grid min-h-14 place-items-center rounded-xl border-2 border-dashed border-amber-400 bg-amber-50/60 px-3 text-sm font-black text-amber-700">Durum kartını buraya sürükle</Drop>
                )}
                <div className="mt-2">
                  {made ? (
                    <div className="rounded-xl bg-emerald-50 px-3 py-2 text-base font-extrabold text-emerald-900 ring-2 ring-emerald-400 animate-pop">{made.qt} <span className="whitespace-nowrap">→ cevap {made.a} ✓</span></div>
                  ) : ctx ? (
                    <Drop dnd={dnd} id="story-qst" className={`grid min-h-14 place-items-center rounded-xl border-2 border-dashed border-pink-400 bg-pink-50/60 px-3 text-sm font-black text-pink-700 ${s.wrong === 'story-qst' ? 'animate-shake ring-4 ring-amber-400' : ''}`}>Soru kartını buraya sürükle</Drop>
                  ) : (
                    <div className="grid min-h-14 place-items-center rounded-xl border-2 border-dashed border-slate-200 px-3 text-sm font-bold text-slate-400">Soru (önce durumu seç)</div>
                  )}
                </div>
                {ctx && !made && (
                  <button type="button" onClick={() => { s.clear(); setCtx(null) }} className="mt-2 inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-extrabold text-ink ring-1 ring-line hover:bg-amber-50">
                    <RotateCcw size={16} />Durumu değiştir
                  </button>
                )}
              </Card>
            </Reveal>
          )}
          {s.view('panel')}
          {stories.length > 0 && <Ledger title="Kurduğum hikâyeler" lines={stories} />}
          {done && (
            <Reveal>
              <SameLedger ledger={ledger} />
              <RulesFound rules={rules} />
              <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
            </Reveal>
          )}
        </>
      }
    />
  )
}

