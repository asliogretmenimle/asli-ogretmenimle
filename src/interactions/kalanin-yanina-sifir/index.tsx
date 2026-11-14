import { useState, type ReactNode } from 'react'
import type { InteractionProps } from '../types'
import { NextButton, pick, useChecks } from '../donusum-studyosu/ortak'
import { Drag, DragAsk, Drop, RulesFound, useDnd, type Ask, type ToolInfo } from '../sayilari-karsilastir/parts'
import { useSay } from '../sepetlere-grupla/sepet'
import { sfx } from '../../lib/feedback'
import {
  Burst, LessonTask, LongDivision, PLACES, PLAY_TOOL, Pile, QuotientBoard, Runner, SIM_TOOLS, ShareSim, SimTask,
  longDiv, quotientText, shareText, startState, type Done, type Hot, type Place, type SimState, type TaskDef,
} from '../virgul-nereden-geliyor/bolme'
import { lessonScenes } from '../virgul-nereden-geliyor/ders'

/**
 * 100. Kalanın Yanına Neden Sıfır? (6. sınıf, MAT.6.1.6 kesir–bölme ilişkisi)
 * Ortak parçalar: ../virgul-nereden-geliyor/bolme.tsx
 *  1. Mini ders (video): 3 ÷ 4; çikolatalar ve yazılı bölme yan yana, her kırma = kalanın yanına bir sıfır
 *  2. Sıfırı sen ekle: kırıcı yok; sıfır kartını yazılı bölmede kalanın yanına koyunca masadaki parçalar kırılır,
 *     ardından “bu sayı neyi sayıyor?” birim kartı
 *  3. Bölüme 0 ne zaman?: 21 ÷ 20 ve 1 ÷ 20; her adımda sıradaki hamle kartını seç (paylaştır, bölüme 0 yaz, virgül koy, kalanın yanına 0 ekle)
 *  4. Hata avcısı: üç öğrencinin defterindeki hatayı bul
 */

const MOVE_TOOL: ToolInfo = { icon: <span className="rounded bg-white px-1 text-[10px] font-black ring-1 ring-line">Hamle</span>, name: 'Hamle kartları', text: 'Sıradaki adımı gösteren kartı “Sıradaki hamle” kutusuna bırak. Yanlış hamle geri döner ve nedenini söyler.' }
const NOTE_TOOL: ToolInfo = { icon: <span className="text-base leading-none">📓</span>, name: 'Defter ve cevap kartları', text: 'Defterdeki çözümü oku; hatayı anlatan kartı cevap kutusuna sürükle.' }

export default function KalaninYaninaSifir({ grade, onFinish }: InteractionProps) {
  const [ab] = useState(() => pick([[7, 4], [5, 4], [9, 4]] as const))
  const [a, b] = ab
  const q = quotientText(longDiv(a, b))
  const tasks: TaskDef[] = [
    {
      emoji: '🎬',
      title: 'Mini ders: 3 ÷ 4',
      goal: 'Kısa animasyonda yazılı bölmedeki her sıfırın masadaki çikolatalarda neye karşılık geldiğini izlemek.',
      tools: [PLAY_TOOL],
      render: (done) => <LessonTask scenes={lessonScenes(3, 4, 'sifir')} rule="Kalanın yanına yazılan 0, kalan parçaları 10 kat küçük parçalara kırmak demektir: 3 bütün = 30 onda bir." onDone={done} />,
    },
    {
      emoji: '✍️',
      title: 'Sıfırı sen ekle',
      goal: `${a} ÷ ${b} bölmesinde kalanın yanına sıfırı kendin yazmak ve masadaki çikolatalarda ne olduğunu görmek.`,
      tools: [SIM_TOOLS.pile, SIM_TOOLS.zero, SIM_TOOLS.unit],
      render: (done, last) => (
        <SimTask
          onDone={done}
          last={last}
          rule="Sıfır eklemek sayıyı büyütmez, birimi küçültür: kalan bütünler onda bire, kalan onda birler yüzde bire dönüşür."
          ask={{
            q: 'Kalanın yanına yazdığın 0 ne anlama geliyordu?',
            options: [
              { label: 'Kalan parçaları 10 kat küçük parçalara kırdım; aynı miktarı daha küçük birimle saydım.', ok: true },
              { label: 'Kalanı 10 ile çarptım, çikolata 10 kat arttı.', nudge: 'Sıfır kartını koyunca masaya yeni çikolata geldi mi, yoksa var olanlar mı kırıldı?', mis: 'Sayı 10 kat artar ama birim 10 kat küçülür; miktar aynı kalır.' },
              { label: 'Hiçbir anlamı yok; öğretmen öyle istediği için yazıyoruz.', nudge: 'Sıfırı koyduğun anda masada ne oldu? Parçalar değişti mi?' },
              { label: 'Bölmeyi bitirdim.', nudge: 'Sıfırı ekledikten sonra paylaştırmaya devam ettin mi?' },
            ],
          }}
          render={(checks, finish) => (
            <ShareSim
              a={a}
              b={b}
              checks={checks}
              breakBy="zero"
              division
              askUnit
              onDone={finish}
              prompt={<>{a} çikolatayı {b} arkadaşa paylaştır. Bu kez kırıcı yok! <span className="text-pink-700">Kalan yetmeyince yazılı bölmede kalanın yanına 0 kartını koy ve masayı izle.</span></>}
            />
          )}
        />
      ),
    },
    {
      emoji: '🧑‍🤝‍🧑',
      title: 'Bölüme 0 ne zaman?',
      goal: 'Bölme yaparken her adımda doğru hamleyi seçmek ve kırılan parçalar bile yetmediğinde bölüme 0 yazmayı keşfetmek.',
      tools: [MOVE_TOOL],
      render: (done, last) => <MoveGame onDone={done} last={last} />,
    },
    {
      emoji: '🔍',
      title: 'Hata avcısı',
      goal: 'Üç öğrencinin defterindeki bölme hatasını bulmak ve çikolata modeliyle açıklamak.',
      tools: [NOTE_TOOL, 'answer'],
      render: (done, last) => <ErrorHunt onDone={done} last={last} />,
    },
  ]
  return (
    <Runner
      grade={grade}
      onFinish={onFinish}
      tasks={tasks}
      summary={(rules) => `${a} ÷ ${b} = ${q} bölmesinde kalanın yanına sıfırı kendin ekledin, 21 ÷ 20 ve 1 ÷ 20 bölmelerinde bölüme 0 yazılması gereken adımı buldun ve üç defterdeki hatayı yakaladın; ${rules.length} kuralı kendin buldun.`}
      insight="Kalanın yanına yazılan sıfır sihir değil: kalan parçaları 10 kat küçük parçalara kırdığını gösterir. Kırılan parçalar bile yetmiyorsa o basamakta kimseye bir şey düşmez ve bölüme 0 yazılır."
      note="Bu kuralları ezberlemedin: yazılı bölmedeki her sıfırın çikolatalarda neye karşılık geldiğini kendin gördün."
    />
  )
}

/* ───────────── 3. hamle oyunu ───────────── */

type Move = 'deal' | 'zeroQ' | 'comma' | 'zeroR'
const MOVES: { id: Move; label: string; icon: string }[] = [
  { id: 'deal', label: 'Paylaştır', icon: '🤲' },
  { id: 'zeroQ', label: 'Bölüme 0 yaz', icon: '0️⃣' },
  { id: 'comma', label: 'Bölüme virgül koy', icon: '❜' },
  { id: 'zeroR', label: 'Kalanın yanına 0 ekle', icon: '🔨' },
]

function MoveGame({ onDone, last }: { onDone: Done; last: boolean }) {
  const checks = useChecks()
  const [r, setR] = useState(0)
  const [all, setAll] = useState(false)
  const rounds: [number, number][] = [[21, 20], [1, 20]]
  const rule = 'Kırılan parçalar bile herkese yetmiyorsa o basamakta kimseye parça düşmez: bölüme 0 yazılır ve kalanın yanına bir 0 daha eklenir (21 ÷ 20 = 1,05).'
  return (
    <div className="space-y-3">
      <div className="mx-auto flex max-w-3xl gap-1.5" aria-label="Turlar">
        {rounds.map((_, k) => <span key={k} className={`h-2.5 flex-1 rounded-full ${k < r || all ? 'bg-emerald-500' : k === r ? 'bg-pink-500' : 'bg-slate-200'}`} />)}
      </div>
      {all ? (
        <div className="mx-auto max-w-2xl space-y-3">
          <RulesFound rules={[rule]} />
          <NextButton last={last} onClick={() => onDone(checks.pass(), [rule])} />
        </div>
      ) : (
        <MoveRound key={r} a={rounds[r][0]} b={rounds[r][1]} checks={checks} onOk={() => (r === rounds.length - 1 ? setAll(true) : setR(r + 1))} />
      )}
    </div>
  )
}

function MoveRound({ a, b, checks, onOk }: { a: number; b: number; checks: ReturnType<typeof useChecks>; onOk: () => void }) {
  const s = useSay(checks)
  const steps = longDiv(a, b)
  const [st, setSt] = useState<SimState>(() => startState(a))
  const [hot, setHot] = useState<{ board?: number | 'comma'; div?: Hot } | null>(null)
  const [burst, setBurst] = useState<{ p: 0 | 1; n: number; key: number } | null>(null)
  const [sad, setSad] = useState(0)
  const [log, setLog] = useState<string[]>([])
  const [fin, setFin] = useState(false)
  const p = st.place
  const have = st.pool[p]
  const u = PLACES[p].unit

  const apply = (m: Move) => {
    const written = st.digits[p] != null
    switch (m) {
      case 'deal': {
        if (written) return s.nudge(have ? `Bu basamakta paylaştırma bitti; masada ${have} ${u} kaldı ve ${b} kişiye yetmiyor.` : 'Masada paylaştırılacak bir şey kalmadı.')
        if (have < b) {
          setSad(have)
          window.setTimeout(() => setSad(0), 1800)
          return s.nudge(`${have} ${u} ${b} kişiye birer birer yetmez: ${have} kişi alır, ${b - have} kişi hiçbir şey alamaz! Bu basamakta bir kişinin payı kaç ${u}?`, { mis: 'Paylaştırma adil olmalı; herkese yetmiyorsa o basamakta kimseye verilmez.' })
        }
        const k = Math.floor(have / b)
        setSt((o) => ({ ...o, pool: o.pool.map((v, i) => (i === p ? v - k * b : v)), each: o.each.map((v, i) => (i === p ? v + k : v)), digits: o.digits.map((v, i) => (i === p ? k : v)) }))
        setHot({ board: p, div: { k: p, kind: 'q' } })
        const left = have - k * b
        setLog((l) => [...l, `${have} ${u} ÷ ${b} → herkese ${k} ${u}, kalan ${left}`])
        s.ok(`Herkese ${k} ${u} düştü, bölüme ${k} yazıldı.${left ? ` Masada ${left} ${u} kaldı.` : ' Masada hiçbir şey kalmadı!'}`)
        if (!left) finish()
        return true
      }
      case 'zeroQ': {
        if (written) return s.nudge('Bu basamağın rakamı zaten yazıldı. Masada kalanlar ne olacak?')
        if (have >= b) return s.nudge(`${have} ${u} ${b} kişiye yetiyor! Herkese en az birer tane düşer. Neden 0 yazasın?`, { mis: 'Bölüme 0, ancak o basamakta kimseye parça düşmüyorsa yazılır.' })
        setSt((o) => ({ ...o, digits: o.digits.map((v, i) => (i === p ? 0 : v)) }))
        setHot({ board: p, div: { k: p, kind: 'q' } })
        setLog((l) => [...l, `${have} ${u} ${b} kişiye yetmez → bölüme 0`])
        s.ok(`Doğru! ${have} ${u} ${b} kişiye yetmediği için bu basamakta kimse bir şey almadı: bölüme 0 yazıldı.`)
        return true
      }
      case 'comma': {
        if (st.comma) return s.nudge('Virgül zaten kondu. Bir bölümde kaç virgül olabilir?')
        if (st.digits[0] == null) return s.nudge('Önce bütünlerle işini bitir: bir kişiye kaç bütün düşüyor?')
        setSt((o) => ({ ...o, comma: true }))
        setHot({ board: 'comma', div: { k: 0, kind: 'comma' } })
        setLog((l) => [...l, 'Bütünler bitti → virgül'])
        s.ok('Bütünler bitti, virgül kondu. Virgülden sonra bütünden küçük parçalar gelecek.')
        return true
      }
      case 'zeroR': {
        if (!written) return have >= b ? s.nudge(`Daha kırmaya gerek yok: ${have} ${u} ${b} kişiye yetiyor. Önce paylaştır.`) : s.nudge('Kırmadan önce bu basamağın rakamını bölüme yaz: bir kişinin payında kaç tane var?')
        if (p === 0 && !st.comma) return s.nudge('Bütünlerden onda birlere geçmeden önce bölümde bu sınırı göstermelisin.', { mis: 'Kalanın yanına ilk sıfır eklenirken bölüme virgül konur.' })
        if (p >= 2) return s.tell('Bu oyunda yüzde birlerden sonrasına geçmiyoruz.')
        setSt((o) => ({ ...o, pool: o.pool.map((v, i) => (i === p ? 0 : i === p + 1 ? v + have * 10 : v)), broke: o.broke.map((v, i) => (i === p ? true : v)), place: (p + 1) as Place }))
        setBurst({ p: p as 0 | 1, n: have, key: Date.now() })
        setHot({ div: { k: p, kind: 'zero' } })
        setLog((l) => [...l, `${have} ${u} = ${have * 10} ${PLACES[p + 1].unit} (yanına 0)`])
        s.ok(`Kalanın yanına 0: ${have} ${u} = ${have * 10} ${PLACES[p + 1].unit}.`)
        return true
      }
    }
  }
  const finish = () => {
    setFin(true)
    sfx.win()
    window.setTimeout(onOk, 2600)
  }
  const dnd = useDnd((it, target) => {
    if (fin || target !== 'move' || !it.startsWith('mv-')) return false
    /* doğru hamlede kart kutuya “girer”; asıl kart yerinde kalır, tekrar kullanılabilir */
    const r = apply(it.slice(3) as Move) === true
    if (r) sfx.ok()
    return r
  })

  const qt = quotientText(steps)
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-3">
        <div className="rounded-2xl bg-white px-4 py-3 text-[17px] leading-snug font-extrabold shadow-sm ring-1 ring-line sm:text-lg">
          {a} çikolata, {b} kişilik bir sınıfa eşit paylaştırılacak: <b>{a} ÷ {b}</b>. Her adımda <span className="text-pink-700">sıradaki hamle kartını</span> kutuya sürükle.
        </div>
        <div className="rounded-2xl bg-amber-50/80 p-3 ring-1 ring-amber-200">
          <p className="mb-1.5 flex justify-between text-[11px] font-black tracking-wide text-amber-800 uppercase"><span>Masada</span><span className="normal-case">{fin ? 'hiçbir şey kalmadı' : `${have} ${u}`}</span></p>
          <div className="relative min-h-[60px]">
            {!fin && <Pile p={p} n={have} u={p === 0 ? 4 : 4} max={60} />}
            {burst && <Burst key={burst.key} p={burst.p} n={burst.n} u={4} />}
          </div>
        </div>
        <div className="rounded-2xl bg-sky-50/60 p-3 ring-1 ring-sky-200">
          <p className="mb-1.5 text-[11px] font-black tracking-wide text-sky-800 uppercase">{b} kişilik sınıf · her birinin payı: {shareText(st.each)}</p>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: b }, (_, i) => (
              <span key={i} className={`grid aspect-square place-items-center rounded-lg text-lg transition ${sad ? (i < sad ? 'bg-emerald-100' : 'bg-red-100 animate-shake') : 'bg-white'}`} aria-hidden>
                {sad ? (i < sad ? '😋' : '😢') : ['🧒', '👧', '👦', '🧑'][i % 4]}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
          <p className="mb-2 text-xs font-black tracking-wide text-ink-soft uppercase">Hamle kartları</p>
          <Drop dnd={dnd} id="move" className="mb-2 grid min-h-14 place-items-center rounded-2xl border-2 border-dashed border-sky-400 bg-sky-50 text-sm font-black text-sky-600">
            {fin ? <span className="text-lg text-emerald-700">{a} ÷ {b} = {qt} 🎉</span> : 'Sıradaki hamle kartını buraya sürükle'}
          </Drop>
          <div className="grid grid-cols-2 gap-2">
            {MOVES.map((m) => (
              <Drag key={m.id} dnd={dnd} item={`mv-${m.id}`} label={m.label} disabled={fin} className="flex min-h-14 items-center gap-2 rounded-2xl bg-white px-3 py-2 text-left text-sm font-black text-ink shadow-[0_3px_0_#cbd5e1] ring-2 ring-line sm:text-base">
                <span className="text-xl" aria-hidden>{m.icon}</span>{m.label}
              </Drag>
            ))}
          </div>
        </div>
        {s.view('work')}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <QuotientBoard digits={st.digits} comma={st.comma} hot={hot?.board} />
        <LongDivision a={a} b={b} steps={steps} show={{ digits: st.digits, comma: st.comma, broke: st.broke }} hot={hot?.div} />
        {log.length > 0 && (
          <ol className="space-y-1 rounded-2xl bg-white p-3 ring-1 ring-line">
            {log.map((l, i) => <li key={i} className="rounded-lg bg-amber-50 px-2 py-1 text-sm font-extrabold ring-1 ring-amber-200 animate-fade-up">{i + 1}. {l}</li>)}
          </ol>
        )}
        {s.view('panel')}
      </div>
    </div>
  )
}

/* ───────────── 4. hata avcısı ───────────── */

interface Case { who: string; whose: string; emoji: string; task: string; lines: ReactNode[]; answer: string; ask: Ask }
const CASES: Case[] = [
  {
    who: 'Ali',
    whose: 'Ali’nin',
    emoji: '👦',
    task: '3 ÷ 4',
    lines: ['3’ün yanına 0 ekledim: 30', '30 ÷ 4 = 7, kalan 2', '2’nin yanına 0 ekledim: 20', '20 ÷ 4 = 5, kalan 0'],
    answer: '75',
    ask: {
      q: 'Ali’nin cevabı 75. Hata nerede?',
      options: [
        { label: 'Bütünler yetmediğinde bölüme 0 yazıp virgül koymayı unuttu; doğrusu 0,75.', ok: true },
        { label: '30 ÷ 4 işlemini yanlış yaptı.', nudge: '4 × 7 = 28, kalan 2. Bu adım doğru mu?' },
        { label: 'Hata yok; 3 ÷ 4 = 75.', nudge: '3 çikolatayı 4 kişiye paylaştırınca herkese 75 çikolata düşer mi?', mis: 'Bölünen bölenden küçükse bölüm 1’den küçüktür.' },
        { label: '2’nin yanına 0 eklememeliydi.', nudge: 'Kalan 2 onda bir 4 kişiye yetiyor muydu? Kırmadan nasıl paylaştırırdı?' },
      ],
    },
  },
  {
    who: 'Ece',
    whose: 'Ece’nin',
    emoji: '👧',
    task: '21 ÷ 20',
    lines: ['21 ÷ 20 = 1, kalan 1 → bölüme 1, virgül', '1’in yanına 0 ekledim: 10', '10, 20’den küçük; bir 0 daha ekledim: 100', '100 ÷ 20 = 5, kalan 0'],
    answer: '1,5',
    ask: {
      q: 'Ece’nin cevabı 1,5. Hata nerede?',
      options: [
        { label: '10 onda bir 20 kişiye yetmediği için bölüme 0 yazmalıydı; doğrusu 1,05.', ok: true },
        { label: '100 ÷ 20 işlemini yanlış yaptı.', nudge: '20 × 5 = 100. Bu adım doğru.' },
        { label: 'Virgülü yanlış yere koydu; doğrusu 15.', nudge: '21 çikolatayı 20 kişiye paylaştırınca herkese 15 çikolata düşer mi?' },
        { label: 'Hata yok; 1,05 ile 1,5 aynı sayıdır.', nudge: '0,05 ile 0,5’i karşılaştır: 5 yüzde bir mi, 5 onda bir mi?', mis: 'Ara sıfır yer tutar: 1,05’teki 5 yüzde birler basamağındadır.' },
      ],
    },
  },
  {
    who: 'Can',
    whose: 'Can’ın',
    emoji: '🧑',
    task: '6 ÷ 4',
    lines: ['6 ÷ 4 = 1, kalan 2 → bölüme 1, virgül', '2’nin yanına 0 ekledim: 20, bölüme de 0 yazdım', '20 ÷ 4 = 5, kalan 0'],
    answer: '1,05',
    ask: {
      q: 'Can’ın cevabı 1,05. Hata nerede?',
      options: [
        { label: 'Kalanın yanına yazılan 0 bölüme yazılmaz; 20 onda bir 4 kişiye 5’er düşer, doğrusu 1,5.', ok: true },
        { label: 'Kalanın yanına 0 eklememeliydi.', nudge: 'Kalan 2 bütün 4 kişiye yetiyor muydu? Kırmadan nasıl paylaştırırdı?' },
        { label: 'Virgülü koymamalıydı.', nudge: 'Bütünler bitmişti; sonrası bütünden küçük parçalar değil mi?' },
        { label: 'Hata yok.', nudge: '20 onda bir 4 kişiye yetiyor mu? Yetiyorsa onda birler basamağına 0 mı yazılır?', mis: 'Bölüme 0, ancak o basamakta kimseye parça düşmezse yazılır.' },
      ],
    },
  },
]

function ErrorHunt({ onDone, last }: { onDone: Done; last: boolean }) {
  const checks = useChecks()
  const [i, setI] = useState(0)
  const [ok, setOk] = useState(false)
  const [all, setAll] = useState(false)
  const C = CASES[i]
  const rule = 'Bölmeyi çikolatalarla kontrol ederim: virgül bütünler bitince konur, kalanın yanındaki 0 bölüme yazılmaz, parçalar yetmiyorsa bölüme 0 yazılır.'
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex gap-1.5" aria-label="Defterler">
        {CASES.map((_, k) => <span key={k} className={`h-2.5 flex-1 rounded-full ${k < i || all ? 'bg-emerald-500' : k === i ? 'bg-pink-500' : 'bg-slate-200'}`} />)}
      </div>
      {all ? (
        <>
          <RulesFound rules={[rule]} />
          <NextButton last={last} onClick={() => onDone(checks.pass(), [rule])} />
        </>
      ) : (
        <div key={i} className="space-y-3 animate-fade-up">
          <div className="rounded-3xl bg-[repeating-linear-gradient(#fff,#fff_31px,#bfdbfe_32px)] p-4 pl-12 shadow-sm ring-1 ring-line" style={{ backgroundPositionY: 10 }}>
            <p className="mb-2 flex items-center gap-2 text-lg font-black"><span className="text-2xl" aria-hidden>{C.emoji}</span>{C.whose} defteri: {C.task}</p>
            <ol className="space-y-1 font-[cursive] text-[17px] leading-[32px] font-bold text-slate-700">
              {C.lines.map((l, k) => <li key={k}>{l}</li>)}
            </ol>
            <p className="mt-1 text-xl leading-[32px] font-black text-red-600">Cevap: {C.task} = {C.answer}</p>
          </div>
          <DragAsk key={i} ask={C.ask} checks={checks} onOk={() => setOk(true)} okText="Yakaladın! Çikolata modeli de bunu gösteriyor." />
          {ok && <NextButton last={false} onClick={() => { setOk(false); if (i === CASES.length - 1) setAll(true); else setI(i + 1) }} />}
        </div>
      )}
    </div>
  )
}
