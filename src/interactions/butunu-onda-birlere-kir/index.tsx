import { useMemo, useState, type ReactNode } from 'react'
import type { InteractionProps } from '../types'
import { NextButton, pick, shuffle, useChecks } from '../donusum-studyosu/ortak'
import { Drag, Drop, RulesFound, useDnd, type ToolInfo } from '../sayilari-karsilastir/parts'
import { useSay } from '../sepetlere-grupla/sepet'
import { sfx } from '../../lib/feedback'
import { Block, Burst, LessonTask, PLACES, PLAY_TOOL, Pile, Runner, SIM_TOOLS, ShareSim, SimTask, type Done, type Place, type TaskDef } from '../virgul-nereden-geliyor/bolme'
import { lessonScenes } from '../virgul-nereden-geliyor/ders'

/**
 * 99. Bütünü Onda Birlere Kır (6. sınıf, MAT.6.1.6 kesir–bölme ilişkisi, MAT.6.1.5 ondalık basamaklar)
 * Ortak parçalar: ../virgul-nereden-geliyor/bolme.tsx
 *  1. Mini ders (video): 2 ÷ 5; kimseye bütün düşmez, bütünler kırılır, 1 bütün = 10 onda bir sayılır
 *  2. Kırıcı laboratuvarı: bütünü ve onda biri kır, kaç parça çıktığını kartla söyle; 3 bütün = 30 onda bir; 1 bütün = 100 yüzde bir
 *  3. Bütün yetmezse kır: c ÷ d (c < d) paylaştırması
 *  4. İki kez kır: onda birler de yetmeyince yüzde birlere
 *  5. Terazi: bir kefede bütün/onda bir, öbür kefeye eşit miktarı gösteren kartı koy; terazi dengeye gelsin
 */

const ANS_TOOL: ToolInfo = { icon: <span className="grid size-5 place-items-center rounded-md bg-white text-xs font-black ring-1 ring-line">10</span>, name: 'Sayı kartları', text: 'Doğru sayıyı gösteren kartı cümledeki boş kutuya bırak.' }
const LAB_TOOL: ToolInfo = { icon: <Block p={0} u={2} />, name: 'Tepsideki parçalar', text: 'Tepsideki yığını tutup 🔨 kırıcıya bırak; her parça 10 eş küçük parçaya ayrılır.' }
const PAN_TOOL: ToolInfo = { icon: <span className="text-base leading-none">⚖️</span>, name: 'Terazi kartları', text: 'Kartlardan birini sağ kefeye bırak. Miktarlar eşitse terazi dengeye gelir; değilse ağır taraf aşağı iner ve kart geri döner.' }

export default function ButunuKir({ grade, onFinish }: InteractionProps) {
  const [one] = useState(() => pick([[1, 5], [3, 5], [4, 5], [1, 2]] as const))
  const [two] = useState(() => pick([[3, 4], [1, 4], [9, 4], [7, 4]] as const))
  const tasks: TaskDef[] = [
    {
      emoji: '🎬',
      title: 'Mini ders: 2 ÷ 5',
      goal: 'Kısa animasyonda bütünler yetmeyince çikolataların nasıl 10 eş parçaya kırıldığını izlemek.',
      tools: [PLAY_TOOL],
      render: (done) => <LessonTask scenes={lessonScenes(2, 5, 'kir')} rule="Paylaştıramadığım bütünleri 10 eş parçaya (onda birlere) kırarak paylaştırmaya devam edebilirim." onDone={done} />,
    },
    {
      emoji: '🔬',
      title: 'Kırıcı laboratuvarı',
      goal: 'Bütünleri ve onda birleri kırıcıya atarak bir bütünün içinde kaç onda bir, kaç yüzde bir olduğunu kendin bulmak.',
      tools: [LAB_TOOL, ANS_TOOL],
      render: (done, last) => <BreakLab onDone={done} last={last} />,
    },
    {
      emoji: '🍫',
      title: 'Bütün yetmezse kır',
      goal: `${one[0]} çikolatayı ${one[1]} arkadaşa eşit paylaştırmak: bütünler yetmeyince kırıcıyı kullanmak.`,
      tools: [SIM_TOOLS.pile, SIM_TOOLS.hammer],
      render: (done, last) => (
        <SimTask
          onDone={done}
          last={last}
          rule={`Kırınca miktar değişmez: ${one[0]} bütün = ${one[0] * 10} onda bir. Bu yüzden ${one[0]} ÷ ${one[1]} = ${one[0] * 10} onda bir ÷ ${one[1]} = ${String(one[0] / one[1]).replace('.', ',')}.`}
          ask={{
            q: `${one[0]} bütünü kırıcıya atınca masadaki çikolata miktarı ne oldu?`,
            options: [
              { label: `Değişmedi: ${one[0]} bütün = ${one[0] * 10} onda bir; sadece parçalar küçüldü.`, ok: true },
              { label: `Arttı: ${one[0] * 10} tane parça oldu.`, nudge: `Parça sayısı arttı ama her parça ne kadar büyük? ${one[0] * 10} küçük parçayı birleştirsen kaç bütün eder?`, mis: 'Parça sayısının artması miktarın arttığı anlamına gelmez.' },
              { label: 'Azaldı: kırarken çikolata ufalandı.', nudge: 'Kırıcı bir parçayı 10 eş parçaya böler, hiçbirini atmaz. 10 şeridi yan yana koyunca ne elde edersin?' },
              { label: 'Belli olmaz.', nudge: 'Bir bütünü kırınca kaç onda bir çıkıyordu? Hepsini toplayınca ne olur?' },
            ],
          }}
          render={(checks, finish) => (
            <ShareSim a={one[0]} b={one[1]} checks={checks} onDone={finish} prompt={<>{one[0]} çikolata {one[1]} arkadaşa eşit paylaştırılacak. Herkese bir bütün düşer mi? <span className="text-pink-700">Düşmüyorsa 🔨 kırıcıyı dene!</span></>} />
          )}
        />
      ),
    },
    {
      emoji: '🔨',
      title: 'İki kez kır',
      goal: `${two[0]} çikolatayı ${two[1]} arkadaşa paylaştırmak: onda birler de yetmeyince onları yüzde birlere kırmak.`,
      tools: [SIM_TOOLS.pile, SIM_TOOLS.hammer],
      render: (done, last) => (
        <SimTask
          onDone={done}
          last={last}
          rule="Onda birler de yetmezse her onda bir 10 yüzde bire kırılır: 1 bütün = 10 onda bir = 100 yüzde bir."
          ask={{
            q: 'Masada kalan onda birleri nasıl paylaştırdın?',
            options: [
              { label: 'Her onda biri 10 yüzde bire kırdım, sonra yüzde birleri dağıttım.', ok: true },
              { label: 'Kalan onda birleri bir kişiye verdim.', nudge: 'Bir kişi fazla alırsa paylaştırma adil olur mu?', mis: 'Eşit paylaştırmada herkes aynı miktarı almalı.' },
              { label: 'Onda birleri birleştirip yeniden bütün yaptım.', nudge: 'Bütünler zaten herkese yetmiyordu. Parçaları büyütmek mi, küçültmek mi işe yarar?' },
              { label: 'Kalanı çöpe attım.', nudge: 'O zaman paylaştırdığın miktar başlangıçtakinden az olmaz mı?' },
            ],
          }}
          render={(checks, finish) => (
            <ShareSim a={two[0]} b={two[1]} checks={checks} onDone={finish} prompt={<>{two[0]} çikolata {two[1]} arkadaşa eşit paylaştırılacak. <span className="text-pink-700">Bu kez onda birler de yetmeyebilir. Ne yapacaksın?</span></>} />
          )}
        />
      ),
    },
    {
      emoji: '⚖️',
      title: 'Terazi dengede mi?',
      goal: 'Kefelere bütün, onda bir ve yüzde birleri koyarak kırmanın miktarı değiştirmediğini terazide göstermek.',
      tools: [PAN_TOOL],
      render: (done, last) => <Balance onDone={done} last={last} />,
    },
  ]
  return (
    <Runner
      grade={grade}
      onFinish={onFinish}
      tasks={tasks}
      summary={(rules) => `Kırıcıyla bütünleri onda birlere, onda birleri yüzde birlere çevirdin; ${one[0]} ÷ ${one[1]} ve ${two[0]} ÷ ${two[1]} paylaştırmalarını yaptın ve teraziyi dengeledin; ${rules.length} kuralı kendin buldun.`}
      insight="1 bütün = 10 onda bir = 100 yüzde bir. Bütünler yetmeyince kırarsın; parça sayısı 10 kat artar, miktar hiç değişmez."
      note="Bu kuralları ezberlemedin: çikolataları kırarak, sayarak ve tartarak kendin buldun."
    />
  )
}

/* ───────────── 2. kırıcı laboratuvarı ───────────── */

interface LabStep { give: number[]; breakP: Place | null; text: ReactNode; q: string; cards: number[]; answer: number; after: string; wrong: (v: number) => string }
const LAB: LabStep[] = [
  {
    give: [1, 0, 0],
    breakP: 0,
    text: <>Tepside <b>1 bütün</b> çikolata var. Onu 🔨 kırıcıya sürükle ve ne olduğunu izle.</>,
    q: '1 bütün = ? onda bir',
    cards: [2, 5, 10, 100],
    answer: 10,
    after: 'Doğru! 1 bütün kırılınca 10 eş şerit çıktı. Her şerit bütünün onda biri: 0,1.',
    wrong: (v) => (v < 10 ? `Masadaki şeritleri tek tek say. ${v} tane mi?` : 'Şeritleri say: 100 tane mi, daha az mı?'),
  },
  {
    give: [0, 1, 0],
    breakP: 1,
    text: <>Şimdi tepsiye <b>1 onda bir</b> (tek şerit) koyduk. Onu da kırıcıya sürükle.</>,
    q: '1 onda bir = ? yüzde bir',
    cards: [1, 10, 100, 5],
    answer: 10,
    after: 'Evet! Bir şerit de 10 küçük kareye ayrıldı. Her kare bütünün yüzde biri: 0,01.',
    wrong: (v) => (v === 100 ? '100 kare bir bütünün tamamını yapar. Tek şeritten kaç kare çıktı?' : 'Küçük kareleri say.'),
  },
  {
    give: [3, 0, 0],
    breakP: 0,
    text: <>Tepside <b>3 bütün</b> var. Yığını kırıcıya sürükle, üçü birden kırılsın.</>,
    q: '3 bütün = ? onda bir',
    cards: [3, 13, 30, 300],
    answer: 30,
    after: 'Harika! Her bütünden 10 şerit: 3 × 10 = 30 onda bir. Sayının yanına bir 0 geldi, fark ettin mi?',
    wrong: (v) => (v === 13 ? 'Her bütünden 10 şerit çıkıyor. 3 bütünden 10 + 10 + 10 = ?' : v === 300 ? '300 şerit olsaydı 30 bütün kırmış olurdun! Kaç tane bütün kırdın?' : 'Bir bütünden kaç şerit çıkıyordu? 3 bütünden?'),
  },
  {
    give: [1, 0, 0],
    breakP: null,
    text: <>Bu kez kırmadan düşün. Bütün çikolatanın üstündeki küçük karelere bak.</>,
    q: '1 bütün = ? yüzde bir',
    cards: [10, 20, 100, 1000],
    answer: 100,
    after: 'Süper! 1 bütün = 10 onda bir = 100 yüzde bir. Bütün çikolata 10 × 10 küçük kareden oluşuyor.',
    wrong: (v) => (v === 10 ? '10 tane olan onda birlerdi (şeritler). Küçük kareler kaç tane?' : 'Bütünde 10 sıra var, her sırada 10 kare. Toplam kaç kare?'),
  },
]

function BreakLab({ onDone, last }: { onDone: Done; last: boolean }) {
  const checks = useChecks()
  const [i, setI] = useState(0)
  const [all, setAll] = useState(false)
  const rule = '1 bütün = 10 onda bir = 100 yüzde bir; kırınca parça sayısı 10 kat artar, miktar değişmez.'
  return (
    <div className="mx-auto max-w-4xl space-y-3">
      <div className="flex gap-1.5" aria-label="Deneyler">
        {LAB.map((_, k) => <span key={k} className={`h-2.5 flex-1 rounded-full ${k < i || all ? 'bg-emerald-500' : k === i ? 'bg-pink-500' : 'bg-slate-200'}`} />)}
      </div>
      {all ? (
        <div className="mx-auto max-w-2xl space-y-3">
          <RulesFound rules={[rule]} />
          <NextButton last={last} onClick={() => onDone(checks.pass(), [rule])} />
        </div>
      ) : (
        <LabRound key={i} L={LAB[i]} checks={checks} onOk={() => (i === LAB.length - 1 ? setAll(true) : setI(i + 1))} />
      )}
    </div>
  )
}

function LabRound({ L, checks, onOk }: { L: LabStep; checks: ReturnType<typeof useChecks>; onOk: () => void }) {
  const s = useSay(checks)
  const [tray, setTray] = useState<number[]>(L.give)
  const [broken, setBroken] = useState(L.breakP === null)
  const [burst, setBurst] = useState<{ p: 0 | 1; n: number; key: number } | null>(null)
  const [ans, setAns] = useState<number | null>(null)
  const cards = useMemo(() => shuffle(L.cards), [L])
  const dnd = useDnd((it, target) => {
    if (it.startsWith('tray-') && target === 'hammer') {
      const p = Number(it.slice(5)) as Place
      if (broken || p !== L.breakP) return s.tell(p === 2 ? 'Yüzde birleri bu laboratuvarda kırmıyoruz.' : 'Bunu zaten kırdın. Şimdi soruyu cevapla.')
      const n = tray[p]
      setTray((t) => t.map((v, k) => (k === p ? 0 : k === p + 1 ? v + n * 10 : v)))
      setBurst({ p: p as 0 | 1, n, key: Date.now() })
      setBroken(true)
      sfx.ok()
      s.ok(`Kırıldı! Tepsiye bak ve parçaları say.`)
      return true
    }
    if (it.startsWith('ans-') && target === 'ans') {
      if (!broken) return s.tell('Önce parçayı kırıcıya at, sonra say.')
      const v = Number(it.slice(4))
      if (v !== L.answer) return s.nudge(L.wrong(v), { mis: 'Her kırmada bir parça 10 eş parçaya ayrılır.' })
      setAns(v)
      sfx.ok()
      s.ok(L.after)
      window.setTimeout(onOk, 2200)
      return true
    }
    return false
  })
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-3">
        <div className="rounded-2xl bg-white px-4 py-3 text-[17px] leading-snug font-extrabold shadow-sm ring-1 ring-line sm:text-lg">{L.text}</div>
        <div className="flex flex-wrap items-stretch gap-3 rounded-2xl bg-amber-50/80 p-3 ring-1 ring-amber-200">
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-[11px] font-black tracking-wide text-amber-800 uppercase">Tepsi</p>
            <div className="flex flex-wrap gap-2">
              {PLACES.map((pl, p) => {
                const n = tray[p]
                if (!n) return null
                const body = (
                  <span className="flex flex-col gap-1.5">
                    <span className="text-xs font-black" style={{ color: pl.color }}>{n} {pl.unit}</span>
                    {L.breakP === null && p === 0 ? <Block p={0} u={14} /> : <Pile p={p as Place} n={n} u={p === 0 ? 9 : 8} max={60} />}
                  </span>
                )
                return !broken && p === L.breakP ? (
                  <Drag key={p} dnd={dnd} item={`tray-${p}`} label={`${n} ${pl.unit}`} className="rounded-2xl bg-white p-2 text-left ring-2 ring-amber-300" ghost={<Block p={p as Place} u={8} />}>{body}</Drag>
                ) : (
                  <div key={p} className="rounded-2xl bg-white p-2 ring-1 ring-line animate-fade-up">{body}</div>
                )
              })}
            </div>
          </div>
          {L.breakP !== null && (
            <Drop dnd={dnd} id="hammer" className="rounded-2xl">
              <span className="relative grid min-h-[140px] w-32 place-items-center rounded-2xl bg-white p-2 text-center ring-2 ring-slate-300">
                <span key={`h${burst?.key ?? 0}`} className="text-5xl" style={{ transformOrigin: '70% 80%', animation: burst ? 'kbHammer .55s ease-in-out' : undefined }} aria-hidden>🔨</span>
                <span className="text-xs font-black text-slate-700">Kırıcı</span>
                {burst && <Burst key={burst.key} p={burst.p} n={burst.n} u={burst.p === 0 ? 8 : 7} />}
              </span>
            </Drop>
          )}
        </div>
        {s.view('work')}
      </div>
      <div className={`flex flex-col gap-3 ${broken ? '' : 'opacity-60'}`}>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
          <p className="mb-2 text-xs font-black tracking-wide text-ink-soft uppercase">Say ve tamamla</p>
          <div className="mb-3 flex items-center gap-2 text-2xl font-black tabular-nums">
            <span>{L.q.split('?')[0]}</span>
            <Drop dnd={dnd} id="ans" className={`grid min-h-14 min-w-16 place-items-center rounded-xl border-2 border-dashed px-2 ${ans !== null ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-sky-400 bg-sky-50 text-base text-sky-500'}`}>{ans ?? '?'}</Drop>
            <span>{L.q.split('?')[1]}</span>
          </div>
          {ans === null && (
            <div className="flex flex-wrap gap-2">
              {cards.map((v) => <Drag key={v} dnd={dnd} item={`ans-${v}`} label={String(v)} disabled={!broken} className="grid size-14 place-items-center rounded-2xl bg-white text-2xl font-black shadow-[0_3px_0_#cbd5e1] ring-2 ring-line">{v}</Drag>)}
            </div>
          )}
        </div>
        {s.view('panel')}
      </div>
    </div>
  )
}

/* ───────────── 5. terazi ───────────── */

type Amt = [number, number, number]
const val = (a: Amt) => a[0] * 100 + a[1] * 10 + a[2]
const amtText = (a: Amt) => a.map((v, p) => (v ? `${v} ${PLACES[p].unit}` : '')).filter(Boolean).join(' ')
interface Pan { left: Amt; cards: Amt[]; answer: number }
const PANS: Pan[] = [
  { left: [1, 0, 0], cards: [[0, 10, 0], [0, 0, 10], [0, 1, 0]], answer: 0 },
  { left: [0, 3, 0], cards: [[0, 0, 3], [0, 0, 30], [0, 30, 0]], answer: 1 },
  { left: [2, 0, 0], cards: [[0, 2, 0], [0, 0, 20], [0, 20, 0]], answer: 2 },
  { left: [1, 5, 0], cards: [[0, 15, 0], [0, 0, 15], [0, 0, 105]], answer: 0 },
]

function Balance({ onDone, last }: { onDone: Done; last: boolean }) {
  const checks = useChecks()
  const [r, setR] = useState(0)
  const [all, setAll] = useState(false)
  const rule = 'Kırmak miktarı değiştirmez: 1 bütün = 10 onda bir, 1 onda bir = 10 yüzde bir; terazi hep dengede kalır.'
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex gap-1.5" aria-label="Turlar">
        {PANS.map((_, k) => <span key={k} className={`h-2.5 flex-1 rounded-full ${k < r || all ? 'bg-emerald-500' : k === r ? 'bg-pink-500' : 'bg-slate-200'}`} />)}
      </div>
      {all ? (
        <>
          <RulesFound rules={[rule]} />
          <NextButton last={last} onClick={() => onDone(checks.pass(), [rule])} />
        </>
      ) : (
        <PanRound key={r} P={PANS[r]} checks={checks} onOk={() => (r === PANS.length - 1 ? setAll(true) : setR(r + 1))} />
      )}
    </div>
  )
}

function PanContent({ a }: { a: Amt }) {
  return (
    <span className="flex flex-wrap items-end justify-center gap-1">
      {a.map((v, p) => <Pile key={p} p={p as Place} n={v} u={p === 0 ? 4 : 3} max={p === 2 ? 40 : 30} />)}
    </span>
  )
}

function PanRound({ P, checks, onOk }: { P: Pan; checks: ReturnType<typeof useChecks>; onOk: () => void }) {
  const s = useSay(checks)
  const [on, setOn] = useState<number | null>(null)
  const [ok, setOk] = useState(false)
  const L = val(P.left)
  const R = on === null ? 0 : val(P.cards[on])
  const ang = on === null ? -14 : Math.max(-14, Math.min(14, ((R - L) / Math.max(L, R)) * 14))
  const W = 320
  const len = 100
  const cy = 46
  const rad = (ang * Math.PI) / 180
  const lx = W / 2 - len * Math.cos(rad)
  const ly = cy - len * Math.sin(rad)
  const rx = W / 2 + len * Math.cos(rad)
  const ry = cy + len * Math.sin(rad)
  const dnd = useDnd((it, target) => {
    if (!it.startsWith('pan-') || target !== 'pan' || on !== null || ok) return false
    const i = Number(it.slice(4))
    setOn(i)
    s.clear()
    if (i === P.answer) {
      setOk(true)
      sfx.ok()
      s.ok(`Denge! ${amtText(P.left)} = ${amtText(P.cards[i])}.`)
      window.setTimeout(onOk, 2000)
    } else {
      const c = P.cards[i]
      const heavy = val(c) > L
      window.setTimeout(() => {
        setOn(null)
        s.nudge(heavy ? `${amtText(c)} daha ağır geldi! ${amtText(P.left)} kırılınca kaç parça olur?` : `${amtText(c)} çok hafif kaldı. ${amtText(P.left)} kırılırsa kaç tane ${PLACES[c.findIndex((x) => x > 0)].unit} çıkar?`, { mis: c[2] && P.left[1] ? 'Onda bir ile yüzde biri karıştırma: 1 onda bir = 10 yüzde bir.' : undefined })
      }, 1500)
    }
    return true
  })
  const pan = (x: number, y: number, child: ReactNode, drop?: boolean) => (
    <div className="absolute" style={{ left: x, top: y, transform: 'translateX(-50%)', transition: 'left .7s cubic-bezier(.3,1.4,.5,1), top .7s cubic-bezier(.3,1.4,.5,1)' }}>
      <div className="mx-auto h-10 w-px bg-slate-500" />
      {drop ? (
        <Drop dnd={dnd} id="pan" className={`grid min-h-16 w-28 place-items-center rounded-b-[50%] border-t-4 border-slate-600 bg-slate-100 px-1 pt-1 pb-3 ${ok ? 'bg-emerald-100' : ''}`}>{child}</Drop>
      ) : (
        <div className="grid min-h-16 w-28 place-items-center rounded-b-[50%] border-t-4 border-slate-600 bg-slate-100 px-1 pt-1 pb-3">{child}</div>
      )}
    </div>
  )
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white px-4 py-3 text-[17px] leading-snug font-extrabold shadow-sm ring-1 ring-line sm:text-lg">
        Sol kefede <b>{amtText(P.left)}</b> var. Sağ kefeye hangi kartı koyarsan terazi dengeye gelir?
      </div>
      <div className="mx-auto overflow-hidden rounded-3xl bg-gradient-to-b from-sky-50 to-white p-2 ring-1 ring-line" style={{ maxWidth: W + 40 }}>
        <div className="relative mx-auto" style={{ width: W, height: 230 }}>
          <div className="absolute rounded-full bg-slate-700" style={{ left: W / 2 - len - 6, top: cy - 4, width: 2 * len + 12, height: 8, transform: `rotate(${ang}deg)`, transition: 'transform .7s cubic-bezier(.3,1.4,.5,1)' }} />
          <div className="absolute size-5 rounded-full bg-pink-600 ring-4 ring-white" style={{ left: W / 2 - 10, top: cy - 10 }} />
          <div className="absolute bg-slate-600" style={{ left: W / 2 - 4, top: cy, width: 8, height: 160 }} />
          <div className="absolute rounded-t-xl bg-slate-600" style={{ left: W / 2 - 50, top: cy + 156, width: 100, height: 14 }} />
          {pan(lx, ly, <span className="flex flex-col items-center gap-0.5"><PanContent a={P.left} /><span className="text-[11px] font-black text-ink">{amtText(P.left)}</span></span>)}
          {pan(rx, ry, on === null ? <span className="text-xs font-black text-sky-600">kartı buraya bırak</span> : <span className="flex flex-col items-center gap-0.5"><PanContent a={P.cards[on]} /><span className="text-[11px] font-black text-ink">{amtText(P.cards[on])}</span></span>, true)}
          {ok && <span className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-1 text-sm font-black text-white animate-pop">Dengede! ⚖️</span>}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {P.cards.map((c, i) =>
          i === on ? null : (
            <Drag key={i} dnd={dnd} item={`pan-${i}`} label={amtText(c)} disabled={on !== null || ok} className="flex min-h-16 flex-col items-center gap-1 rounded-2xl bg-white px-3 py-2 shadow-[0_3px_0_#cbd5e1] ring-2 ring-line">
              <PanContent a={c} />
              <span className="text-sm font-black text-ink">{amtText(c)}</span>
            </Drag>
          ),
        )}
      </div>
      {s.view('work')}
      {s.view('panel')}
    </div>
  )
}
