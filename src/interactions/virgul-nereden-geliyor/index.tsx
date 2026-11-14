import { useMemo, useState } from 'react'
import type { InteractionProps } from '../types'
import { NextButton, pick, shuffle, useChecks } from '../donusum-studyosu/ortak'
import { Drag, Drop, RulesFound, useDnd, type ToolInfo } from '../sayilari-karsilastir/parts'
import { useSay } from '../sepetlere-grupla/sepet'
import { LessonTask, Now, PLAY_TOOL, Runner, SIM_TOOLS, ShareSim, SimTask, longDiv, quotientText, tr, type Done, type TaskDef } from './bolme'
import { lessonScenes } from './ders'

/**
 * 98. Virgül Nereden Geliyor? (6. sınıf, MAT.6.1.6 kesir–bölme ilişkisi)
 *  1. Mini ders (adım adım): 7 ÷ 2; virgül “bütün çikolatalar bitti” anında konur
 *  2. Virgülü sen koy: a ÷ b’yi paylaştır, bütünler bitince virgül kartını payın içine koy
 *  3. Kimseye bütün düşmezse: c ÷ d (c < d); “Bütün” kutusuna 0 → 0,…
 *  4. Virgül nereye?: virgül tuşu bozuk hesap makinesi; önce herkese kaç bütün düştüğünü bul, sonra virgülü koy
 */

const GAP_TOOL: ToolInfo = { icon: <span className="text-xl leading-none font-black text-pink-600">,</span>, name: 'Virgül kartı', text: 'Ekrandaki rakamların arasındaki kesikli boşluklardan birine bırak.' }
const EST_TOOL: ToolInfo = { icon: <span className="grid size-5 place-items-center rounded-md bg-white text-xs font-black ring-1 ring-line">3</span>, name: 'Sayı kartları', text: 'Herkese kaç bütün çikolata düştüğünü gösteren kartı kutuya bırak.' }

export default function VirgulNeredenGeliyor({ grade, onFinish }: InteractionProps) {
  const [[a, b]] = useState(() => pick([[7, 2], [5, 2], [6, 4], [9, 2], [3, 2]] as const))
  const [[c, d]] = useState(() => pick([[1, 2], [2, 5], [3, 5], [4, 5], [1, 5]] as const))
  const q1 = quotientText(longDiv(a, b))
  const q2 = quotientText(longDiv(c, d))

  const tasks: TaskDef[] = [
    {
      emoji: '🎬',
      title: 'Mini ders: 7 ÷ 2',
      goal: 'Adım adım ilerleyerek bölüme virgülün ne zaman ve neden konduğunu görmek.',
      tools: [PLAY_TOOL],
      render: (done) => <LessonTask scenes={lessonScenes(7, 2, 'virgul')} rule="Önce bütün çikolatalar paylaştırılır. Bir kişinin aldığı bütün sayısı “Bütün” kutusuna yazılır." onDone={done} />,
    },
    {
      emoji: '🍫',
      title: 'Virgülü sen koy',
      goal: `${a} çikolatayı ${b} arkadaşa paylaştırmak ve bütün çikolatalar bitince virgülü koymak.`,
      tools: [SIM_TOOLS.pile, SIM_TOOLS.comma, SIM_TOOLS.cut],
      render: (done, last) => (
        <SimTask
          onDone={done}
          last={last}
          rule="Virgül, bütün çikolatalar bitince konur. Virgülün solunda bütünler, sağında parçalar yazılır."
          ask={{
            q: 'Virgülü ne zaman koydun?',
            options: [
              { label: 'Bütün çikolatalar herkese yetmeyince.', ok: true },
              { label: 'Bölme bitince.', nudge: 'Virgülü koyduktan sonra masada hâlâ çikolata vardı, değil mi?' },
              { label: 'En başta.', nudge: 'En başta herkese bütün çikolata verebiliyordun.' },
              { label: 'Hiç koymasam da olur.', nudge: `Virgül olmazsa ${q1.replace(',', '')} yazarız. Herkes ${q1.replace(',', '')} çikolata almış gibi olur!`, mis: 'Virgül, bütünle parçayı ayırır.' },
            ],
          }}
          render={(checks, finish) => <ShareSim a={a} b={b} checks={checks} comma="drag" onDone={finish} prompt={<>{a} çikolatayı {b} arkadaşa eşit paylaştır. <span className="text-pink-700">Bütün çikolatalar bitince virgülü sen koy!</span></>} />}
        />
      ),
    },
    {
      emoji: '🥧',
      title: 'Kimseye bütün düşmezse',
      goal: `Çikolata az, arkadaş çok olunca (${c} ÷ ${d}) sonucun neden 0 ile başladığını görmek.`,
      tools: [SIM_TOOLS.pile, SIM_TOOLS.digit, SIM_TOOLS.comma, SIM_TOOLS.cut],
      render: (done, last) => (
        <SimTask
          onDone={done}
          last={last}
          rule={`Çikolata arkadaş sayısından azsa kimseye bütün düşmez. “Bütün” kutusuna 0 yazılır: ${c} ÷ ${d} = ${q2}.`}
          ask={{
            q: `${c} ÷ ${d} = ${q2}. Bu sayı neden 0 ile başlıyor?`,
            options: [
              { label: 'Çünkü kimse bütün çikolata almadı.', ok: true },
              { label: 'Çünkü her sonuç 0 ile başlar.', nudge: 'Önceki görevde sonuç 0 ile mi başlamıştı?' },
              { label: 'Çünkü 0 yazmak güzel görünür.', nudge: '“Bütün” kutusu, bir kişinin kaç bütün çikolata aldığını gösterir.' },
            ],
          }}
          render={(checks, finish) => <ShareSim a={c} b={d} checks={checks} comma="drag" zeroDigit="drag" onDone={finish} prompt={<>Masada sadece {c} çikolata var ama {d} arkadaş paylaşacak. <span className="text-pink-700">Ne olacak, deneyip gör!</span></>} />}
        />
      ),
    },
    {
      emoji: '🧮',
      title: 'Virgül nereye?',
      goal: 'Virgülü kaybolmuş sonuçlarda virgülün yerini bulmak.',
      tools: [EST_TOOL, GAP_TOOL],
      render: (done, last) => <CommaHunt onDone={done} last={last} />,
    },
  ]

  return (
    <Runner
      grade={grade}
      onFinish={onFinish}
      tasks={tasks}
      summary={(rules) => `${a} ÷ ${b} ve ${c} ÷ ${d} bölmelerinde çikolataları paylaştırıp virgülü kendin koydun; virgül tuşu bozuk hesap makinesini düzelttin. ${rules.length} kural öğrendin.`}
      insight="Virgül, bütün çikolataların bittiği yeri gösterir: solunda bütünler, sağında parçalar. Önce herkese kaç bütün düştüğünü bulursan virgülün yerini şaşırmazsın."
      note="Bu kuralları çikolataları paylaştırırken kendin gördün."
    />
  )
}

/* ───────────── 4. virgül nereye? ───────────── */

interface Round { a: number; b: number; digits: string; whole: number }
const ROUNDS: Round[] = [
  { a: 7, b: 2, digits: '35', whole: 3 },
  { a: 9, b: 2, digits: '45', whole: 4 },
  { a: 25, b: 2, digits: '125', whole: 12 },
  { a: 3, b: 5, digits: '06', whole: 0 },
]
const asNum = (digits: string, pos: number) => Number(`${digits.slice(0, pos) || '0'}.${digits.slice(pos) || '0'}`)

function CommaHunt({ onDone, last }: { onDone: Done; last: boolean }) {
  const checks = useChecks()
  const [r, setR] = useState(0)
  const [all, setAll] = useState(false)
  const rule = 'Önce herkese kaç bütün çikolata düştüğünü bulurum. O sayı virgülün soluna gelir.'
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex gap-1.5" aria-label="Turlar">
        {ROUNDS.map((_, i) => <span key={i} className={`h-3 flex-1 rounded-full ${i < r || all ? 'bg-emerald-500' : i === r ? 'bg-pink-500' : 'bg-slate-200'}`} />)}
      </div>
      {all ? (
        <>
          <RulesFound rules={[rule]} />
          <NextButton last={last} onClick={() => onDone(checks.pass(), [rule])} />
        </>
      ) : (
        <HuntRound key={r} R={ROUNDS[r]} checks={checks} onOk={() => (r === ROUNDS.length - 1 ? setAll(true) : setR(r + 1))} />
      )}
    </div>
  )
}

function HuntRound({ R, checks, onOk }: { R: Round; checks: ReturnType<typeof useChecks>; onOk: () => void }) {
  const s = useSay(checks)
  const [est, setEst] = useState<number | null>(null)
  const [pos, setPos] = useState<number | null>(null)
  const cards = useMemo(() => shuffle([...new Set([R.whole, R.whole + 1, Math.max(0, R.whole - 1), Number(R.digits.slice(0, R.whole >= 10 ? 3 : 2))])]), [R])
  const dnd = useDnd((it, target) => {
    if (it.startsWith('est-') && target === 'est' && est === null) {
      const v = Number(it.slice(4))
      if (v !== R.whole) return s.nudge(v * R.b > R.a ? `Herkese ${v} çikolata verirsen ${R.b} × ${v} = ${R.b * v} çikolata gerekir. Ama sadece ${R.a} tane var!` : `Herkese ${v} çikolata verirsen geriye ${R.a - R.b * v} çikolata kalır. Herkese 1 tane daha verebilirsin!`)
      setEst(v)
      s.ok(`Evet! Herkese ${v} bütün çikolata düşer.`)
      return true
    }
    if (it === 'comma' && target.startsWith('gap-') && est !== null) {
      const g = Number(target.slice(4))
      const v = asNum(R.digits, g)
      if (g !== String(R.whole).length) return s.nudge(`Virgülü buraya koyarsan ${tr(v)} olur. Bu, herkes ${Math.floor(v)} bütün çikolata aldı demek. Ama sen ${R.whole} buldun!`)
      setPos(g)
      s.ok(`Harika! ${R.a} ÷ ${R.b} = ${tr(v)}`)
      window.setTimeout(onOk, 1800)
      return true
    }
    return false
  })
  const digits = R.digits.split('')
  const open = est !== null && pos === null
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-line">
        <p className="text-lg leading-snug font-extrabold sm:text-xl">Hesap makinesinin virgül tuşu bozuldu! {R.a} çikolata {R.b} arkadaşa paylaştırılınca ekranda <b className="tabular-nums">{R.digits}</b> yazıyor.</p>
      </div>
      <Now done={pos !== null}>{pos !== null ? `${R.a} ÷ ${R.b} = ${tr(asNum(R.digits, pos))}` : est === null ? <>Önce düşün: herkese kaç <b>bütün</b> çikolata düşer? Doğru sayı kartını kutuya sürükle.</> : <>Herkese {est} bütün düşüyor. Öyleyse <b>{est}</b> virgülün solunda olmalı. Virgül kartını ekrana sürükle.</>}</Now>

      <div className="mx-auto w-fit rounded-3xl bg-slate-700 p-3 shadow-[0_6px_0_#334155]">
        <div className="flex items-end rounded-2xl bg-lime-100 px-4 py-2 font-mono text-6xl font-black text-slate-800 tabular-nums">
          {digits.map((ch, i) => (
            <span key={i} className="flex items-end">
              <Gap i={i} pos={pos} dnd={dnd} open={open} />
              <span>{ch}</span>
            </span>
          ))}
          <Gap i={digits.length} pos={pos} dnd={dnd} open={open} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
          <p className="mb-2 text-base font-extrabold">1. Herkese kaç bütün çikolata düşer?</p>
          <Drop dnd={dnd} id="est" className={`mb-2 grid min-h-16 place-items-center rounded-2xl border-[3px] border-dashed text-base font-black ${est !== null ? 'border-emerald-400 bg-emerald-50 text-2xl text-emerald-800' : 'border-sky-400 bg-sky-50 text-sky-600'}`}>
            {est !== null ? `${est} bütün` : 'kartı buraya sürükle'}
          </Drop>
          {est === null && <div className="flex flex-wrap gap-2">{cards.map((v) => <Drag key={v} dnd={dnd} item={`est-${v}`} label={`${v} bütün`} className="grid size-16 place-items-center rounded-2xl bg-white text-3xl font-black shadow-[0_4px_0_#cbd5e1] ring-2 ring-line">{v}</Drag>)}</div>}
        </div>
        <div className={`rounded-2xl bg-white p-3 ring-1 ring-line ${est === null ? 'opacity-40' : ''}`}>
          <p className="mb-2 text-base font-extrabold">2. Virgülü ekrana koy.</p>
          {pos === null ? (
            <Drag dnd={dnd} item="comma" label="Virgül kartı" disabled={est === null} className="grid h-20 w-16 place-items-end justify-center rounded-2xl bg-white pb-2 text-6xl leading-none font-black text-pink-600 shadow-[0_4px_0_#f9a8d4] ring-[3px] ring-pink-400">,</Drag>
          ) : (
            <p className="text-3xl font-black text-emerald-700 tabular-nums">{R.a} ÷ {R.b} = {tr(asNum(R.digits, pos))}</p>
          )}
        </div>
      </div>
      {s.view('work')}
      {s.view('panel')}
    </div>
  )
}

function Gap({ i, pos, dnd, open }: { i: number; pos: number | null; dnd: ReturnType<typeof useDnd>; open: boolean }) {
  if (pos === i) return <span className="animate-pop text-pink-600">,</span>
  if (!open) return <span className="w-1" />
  return <Drop dnd={dnd} id={`gap-${i}`} className="mx-1 h-16 w-6 self-center rounded-lg border-[3px] border-dashed border-pink-400 bg-pink-50/70" />
}
