import { useMemo, useState, type ReactNode } from 'react'
import type { InteractionProps } from '../types'
import { NextButton, pick, shuffle, useChecks } from '../donusum-studyosu/ortak'
import { Drag, Drop, RulesFound, useDnd, type ToolInfo } from '../sayilari-karsilastir/parts'
import { useSay } from '../sepetlere-grupla/sepet'
import { Bar, LessonTask, Now, PLAY_TOOL, Runner, SIM_TOOLS, ShareSim, SimTask, SplitBar, Stuff, longDiv, quotientText, type Done, type TaskDef } from '../virgul-nereden-geliyor/bolme'
import { lessonScenes } from '../virgul-nereden-geliyor/ders'

/**
 * 99. Bütünü Onda Birlere Kır (6. sınıf, MAT.6.1.6 kesir–bölme ilişkisi, MAT.6.1.5 ondalık basamaklar)
 * Ortak parçalar: ../virgul-nereden-geliyor/bolme.tsx
 *  1. Mini ders (adım adım): 2 ÷ 5; kimseye bütün düşmez, çikolatalar 10’ar parçaya bölünür, parçalar sayılır
 *  2. Böl ve say: 1, 2, 3 bütün çikolatayı böl; kaç parça olduğunu kartla söyle (10, 20, 30)
 *  3. Bütün yetmezse böl: c ÷ d (c < d) paylaştırması
 *  4. Terazi: bütün çikolatayla aynı miktardaki parçaları bul; terazi dengeye gelsin
 */

const ANS_TOOL: ToolInfo = { icon: <span className="grid size-5 place-items-center rounded-md bg-white text-xs font-black ring-1 ring-line">10</span>, name: 'Sayı kartları', text: 'Doğru sayıyı gösteren kartı boş kutuya bırak.' }
const LAB_TOOL: ToolInfo = { icon: <Bar s={2} />, name: 'Çikolata', text: 'Çikolatayı tutup ✂️ “10 parçaya böl” kutusuna bırak.' }
const PAN_TOOL: ToolInfo = { icon: <span className="text-base leading-none">⚖️</span>, name: 'Terazi kartları', text: 'Bir kartı sağ kefeye bırak. Miktarlar eşitse terazi düz olur; değilse ağır taraf aşağı iner.' }

export default function ButunuKir({ grade, onFinish }: InteractionProps) {
  const [[c, d]] = useState(() => pick([[1, 5], [3, 5], [4, 5], [1, 2]] as const))
  const q = quotientText(longDiv(c, d))
  const tasks: TaskDef[] = [
    {
      emoji: '🎬',
      title: 'Mini ders: 2 ÷ 5',
      goal: 'Adım adım ilerleyerek, çikolatalar yetmeyince nasıl 10 eşit parçaya bölündüğünü görmek.',
      tools: [PLAY_TOOL],
      render: (done) => <LessonTask scenes={lessonScenes(2, 5, 'kir')} rule="Bütün çikolata herkese yetmezse onu 10 eşit parçaya bölerim. Her parça bir “onda bir”dir." onDone={done} />,
    },
    {
      emoji: '✂️',
      title: 'Böl ve say',
      goal: 'Çikolataları 10 parçaya bölüp kaç parça olduğunu saymak.',
      tools: [LAB_TOOL, ANS_TOOL],
      render: (done, last) => <BreakLab onDone={done} last={last} />,
    },
    {
      emoji: '🍫',
      title: 'Bütün yetmezse böl',
      goal: `${c} çikolatayı ${d} arkadaşa eşit paylaştırmak.`,
      tools: [SIM_TOOLS.pile, SIM_TOOLS.cut],
      render: (done, last) => (
        <SimTask
          onDone={done}
          last={last}
          rule={`Bölünce çikolata azalmaz: ${c} bütün = ${c * 10} parça. Bu yüzden ${c} ÷ ${d} = ${q}.`}
          ask={{
            q: 'Çikolatayı 10 parçaya bölünce çikolata azaldı mı?',
            options: [
              { label: 'Hayır, aynı kaldı. Sadece parçalar küçüldü.', ok: true },
              { label: 'Evet, azaldı.', nudge: '10 parçayı yan yana koyarsan yine bütün bir çikolata olmaz mı?' },
              { label: 'Hayır, çoğaldı.', nudge: 'Parça sayısı çoğaldı ama her parça küçük. 10 parça birleşince kaç bütün eder?', mis: 'Parça sayısı artınca çikolata artmaz.' },
            ],
          }}
          render={(checks, finish) => <ShareSim a={c} b={d} checks={checks} onDone={finish} prompt={<>{c} çikolatayı {d} arkadaşa eşit paylaştır. <span className="text-pink-700">Bütün çikolata yetmezse ne yaparsın?</span></>} />}
        />
      ),
    },
    {
      emoji: '⚖️',
      title: 'Terazi',
      goal: 'Bütün çikolatayla aynı miktardaki parçaları bulup teraziyi dengelemek.',
      tools: [PAN_TOOL],
      render: (done, last) => <Balance onDone={done} last={last} />,
    },
  ]
  return (
    <Runner
      grade={grade}
      onFinish={onFinish}
      tasks={tasks}
      summary={(rules) => `Çikolataları 10 eşit parçaya böldün, saydın, ${c} ÷ ${d} paylaştırmasını yaptın ve teraziyi dengeledin. ${rules.length} kural öğrendin.`}
      insight="1 bütün = 10 parça (10 onda bir). Bütün yetmeyince 10 parçaya bölersin; çikolata azalmaz, sadece parçalar küçülür."
      note="Bu kuralları çikolataları bölüp sayarak kendin buldun."
    />
  )
}

/* ───────────── 2. böl ve say ───────────── */

const LAB = [
  { n: 1, cards: [5, 10, 100], wrong: (v: number) => (v < 10 ? 'Parçaları tek tek say.' : '100 parça mı? Tek tek say.') },
  { n: 2, cards: [2, 12, 20], wrong: (v: number) => (v === 12 ? 'Her çikolatadan 10 parça çıktı: 10 + 10 = ?' : 'İki çikolatayı böldün. Her birinden kaç parça çıktı?') },
  { n: 3, cards: [3, 13, 30], wrong: (v: number) => (v === 13 ? 'Her çikolatadan 10 parça: 10 + 10 + 10 = ?' : 'Üç çikolatanın her birinden 10 parça çıktı.') },
]

function BreakLab({ onDone, last }: { onDone: Done; last: boolean }) {
  const checks = useChecks()
  const [i, setI] = useState(0)
  const [all, setAll] = useState(false)
  const rule = '1 bütün = 10 parça, 2 bütün = 20 parça, 3 bütün = 30 parça. Bütün sayısının yanına 0 gelir.'
  return (
    <div className="mx-auto max-w-4xl space-y-3">
      <div className="flex gap-1.5" aria-label="Deneyler">
        {LAB.map((_, k) => <span key={k} className={`h-3 flex-1 rounded-full ${k < i || all ? 'bg-emerald-500' : k === i ? 'bg-pink-500' : 'bg-slate-200'}`} />)}
      </div>
      {all ? (
        <div className="mx-auto max-w-2xl space-y-3">
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-3 text-center text-2xl font-black ring-1 ring-line">
            {LAB.map((l) => (
              <span key={l.n} className="rounded-xl bg-sky-50 py-2">
                <span className="text-amber-800">{l.n} bütün</span>
                <br />
                <span className="text-sky-700">{l.n}<span className="rounded bg-sky-200 px-0.5">0</span> parça</span>
              </span>
            ))}
          </div>
          <RulesFound rules={[rule]} />
          <NextButton last={last} onClick={() => onDone(checks.pass(), [rule])} />
        </div>
      ) : (
        <LabRound key={i} n={LAB[i].n} cards={LAB[i].cards} wrong={LAB[i].wrong} checks={checks} onOk={() => (i === LAB.length - 1 ? setAll(true) : setI(i + 1))} />
      )}
    </div>
  )
}

function LabRound({ n, cards: raw, wrong, checks, onOk }: { n: number; cards: number[]; wrong: (v: number) => string; checks: ReturnType<typeof useChecks>; onOk: () => void }) {
  const s = useSay(checks)
  const [cut, setCut] = useState(false)
  const [ans, setAns] = useState<number | null>(null)
  const cards = useMemo(() => shuffle(raw), [raw])
  const dnd = useDnd((it, target) => {
    if (it === 'bars' && target === 'cut' && !cut) {
      setCut(true)
      s.clear()
      return true
    }
    if (it.startsWith('ans-') && target === 'ans') {
      if (!cut) return s.tell('Önce çikolatayı ✂️ kutusuna sürükle.')
      const v = Number(it.slice(4))
      if (v !== n * 10) return s.nudge(wrong(v))
      setAns(v)
      s.ok(`Evet! ${n} bütün = ${n * 10} parça.`)
      window.setTimeout(onOk, 2000)
      return true
    }
    return false
  })
  return (
    <div className="space-y-3">
      <Now done={ans !== null}>{ans !== null ? `${n} bütün çikolata = ${n * 10} parça` : !cut ? <>Masada <b>{n} bütün çikolata</b> var. Çikolatayı tutup ✂️ kutusuna sürükle.</> : <>Parçaları say. Kaç parça oldu? Doğru kartı kutuya sürükle.</>}</Now>
      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-amber-50 p-4 ring-2 ring-amber-200">
        {!cut ? (
          <>
            <Drag dnd={dnd} item="bars" label={`${n} bütün çikolata`} className="rounded-2xl bg-white p-3 ring-2 ring-amber-300" ghost={<Bar s={12} />}>
              <span className="flex flex-col items-start gap-2">
                <span className="flex flex-col gap-2">{Array.from({ length: n }, (_, k) => <Bar key={k} s={16} />)}</span>
                <span className="text-lg font-black text-amber-900">{n} bütün çikolata</span>
              </span>
            </Drag>
            <Drop dnd={dnd} id="cut" className="rounded-2xl">
              <span className="grid min-h-[110px] w-36 place-items-center rounded-2xl border-[3px] border-dashed border-sky-500 bg-white p-2 text-center" style={{ animation: 'kbGlow 1.6s ease-in-out infinite' }}>
                <span className="text-5xl" aria-hidden>✂️</span>
                <span className="text-base font-black text-sky-800">10 parçaya böl</span>
              </span>
            </Drop>
          </>
        ) : (
          <div className="flex flex-col gap-2">{Array.from({ length: n }, (_, k) => <SplitBar key={k} s={16} count={n === 1} />)}</div>
        )}
      </div>
      <div className={`rounded-2xl bg-white p-3 ring-1 ring-line ${cut ? '' : 'opacity-40'}`}>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-3xl font-black tabular-nums">
          <span className="text-amber-800">{n} bütün =</span>
          <Drop dnd={dnd} id="ans" className={`grid min-h-16 min-w-20 place-items-center rounded-xl border-[3px] border-dashed px-2 ${ans !== null ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-sky-400 bg-sky-50 text-lg text-sky-500'}`}>{ans ?? '?'}</Drop>
          <span className="text-sky-700">parça</span>
        </div>
        {ans === null && <div className="flex flex-wrap gap-2">{cards.map((v) => <Drag key={v} dnd={dnd} item={`ans-${v}`} label={String(v)} disabled={!cut} className="grid size-16 place-items-center rounded-2xl bg-white text-3xl font-black shadow-[0_4px_0_#cbd5e1] ring-2 ring-line">{v}</Drag>)}</div>}
      </div>
      {s.view('work')}
      {s.view('panel')}
    </div>
  )
}

/* ───────────── 4. terazi ───────────── */

type Amt = [number, number]
const val = (a: Amt) => a[0] * 10 + a[1]
const amtText = (a: Amt) => [a[0] ? `${a[0]} bütün` : '', a[1] ? `${a[1]} parça` : ''].filter(Boolean).join(' ')
interface Pan { left: Amt; cards: Amt[]; answer: number }
const PANS: Pan[] = [
  { left: [1, 0], cards: [[0, 1], [0, 10], [0, 100]], answer: 1 },
  { left: [2, 0], cards: [[0, 2], [0, 12], [0, 20]], answer: 2 },
  { left: [1, 5], cards: [[0, 15], [0, 6], [0, 51]], answer: 0 },
]

function Balance({ onDone, last }: { onDone: Done; last: boolean }) {
  const checks = useChecks()
  const [r, setR] = useState(0)
  const [all, setAll] = useState(false)
  const rule = 'Bölmek miktarı değiştirmez: 1 bütün = 10 parça. Terazi dengede kalır.'
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex gap-1.5" aria-label="Turlar">
        {PANS.map((_, k) => <span key={k} className={`h-3 flex-1 rounded-full ${k < r || all ? 'bg-emerald-500' : k === r ? 'bg-pink-500' : 'bg-slate-200'}`} />)}
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

const PanContent = ({ a }: { a: Amt }) => <Stuff w={a[0]} t={a[1]} s={4} max={60} />

function PanRound({ P, checks, onOk }: { P: Pan; checks: ReturnType<typeof useChecks>; onOk: () => void }) {
  const s = useSay(checks)
  const [on, setOn] = useState<number | null>(null)
  const [ok, setOk] = useState(false)
  const L = val(P.left)
  const R = on === null ? 0 : val(P.cards[on])
  const ang = on === null ? -10 : R === L ? 0 : R > L ? 10 : -10
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
      s.ok(`Terazi düz! ${amtText(P.left)} = ${amtText(P.cards[i])}`)
      window.setTimeout(onOk, 2000)
    } else {
      const heavy = val(P.cards[i]) > L
      window.setTimeout(() => {
        setOn(null)
        s.nudge(heavy ? 'Sağ taraf ağır geldi! Daha az parça dene.' : 'Sağ taraf hafif kaldı! 1 bütün çikolata kaç parça ediyordu?')
      }, 1500)
    }
    return true
  })
  const pan = (x: number, y: number, child: ReactNode, drop?: boolean) => (
    <div className="absolute" style={{ left: x, top: y, transform: 'translateX(-50%)', transition: 'left .9s ease-in-out, top .9s ease-in-out' }}>
      <div className="mx-auto h-10 w-px bg-slate-500" />
      {drop ? (
        <Drop dnd={dnd} id="pan" className={`grid min-h-16 w-28 place-items-center rounded-b-[50%] border-t-4 border-slate-600 px-1 pt-1 pb-3 ${ok ? 'bg-emerald-100' : 'bg-slate-100'}`}>{child}</Drop>
      ) : (
        <div className="grid min-h-16 w-28 place-items-center rounded-b-[50%] border-t-4 border-slate-600 bg-slate-100 px-1 pt-1 pb-3">{child}</div>
      )}
    </div>
  )
  return (
    <div className="space-y-3">
      <Now done={ok}>{ok ? `${amtText(P.left)} = ${amtText(P.cards[P.answer])}` : <>Sol kefede <b>{amtText(P.left)}</b> var. Sağ kefeye aynı miktarı koy: doğru kartı sağ kefeye sürükle.</>}</Now>
      <div className="mx-auto overflow-hidden rounded-3xl bg-gradient-to-b from-sky-50 to-white p-2 ring-1 ring-line" style={{ maxWidth: W + 40 }}>
        <div className="relative mx-auto" style={{ width: W, height: 230 }}>
          <div className="absolute rounded-full bg-slate-700" style={{ left: W / 2 - len - 6, top: cy - 4, width: 2 * len + 12, height: 8, transform: `rotate(${ang}deg)`, transition: 'transform .9s ease-in-out' }} />
          <div className="absolute size-5 rounded-full bg-pink-600 ring-4 ring-white" style={{ left: W / 2 - 10, top: cy - 10 }} />
          <div className="absolute bg-slate-600" style={{ left: W / 2 - 4, top: cy, width: 8, height: 160 }} />
          <div className="absolute rounded-t-xl bg-slate-600" style={{ left: W / 2 - 50, top: cy + 156, width: 100, height: 14 }} />
          {pan(lx, ly, <span className="flex flex-col items-center gap-0.5"><PanContent a={P.left} /><span className="text-xs font-black text-ink">{amtText(P.left)}</span></span>)}
          {pan(rx, ry, on === null ? <span className="text-xs font-black text-sky-600">kartı buraya bırak</span> : <span className="flex flex-col items-center gap-0.5"><PanContent a={P.cards[on]} /><span className="text-xs font-black text-ink">{amtText(P.cards[on])}</span></span>, true)}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {P.cards.map((c, i) =>
          i === on ? null : (
            <Drag key={i} dnd={dnd} item={`pan-${i}`} label={amtText(c)} disabled={on !== null || ok} className="min-h-16 rounded-2xl bg-white px-5 py-2 text-xl font-black text-sky-800 shadow-[0_4px_0_#cbd5e1] ring-2 ring-line">
              {amtText(c)}
            </Drag>
          ),
        )}
      </div>
      {s.view('work')}
      {s.view('panel')}
    </div>
  )
}
