import { useMemo, useState } from 'react'
import type { InteractionProps } from '../types'
import { pick, shuffle, useChecks, NextButton } from '../donusum-studyosu/ortak'
import { Drag, Drop, RulesFound, useDnd, type ToolInfo } from '../sayilari-karsilastir/parts'
import { useSay } from '../sepetlere-grupla/sepet'
import { sfx } from '../../lib/feedback'
import { LessonTask, PLAY_TOOL, Runner, SIM_TOOLS, ShareSim, SimTask, type Done, type TaskDef } from './bolme'
import { lessonScenes } from './ders'

/**
 * 98. Virgül Nereden Geliyor? (6. sınıf, MAT.6.1.6 kesir–bölme ilişkisi)
 *  1. Mini ders (video): 7 ÷ 2 paylaştırması; virgülün “bütünler bitti” anında konduğu
 *  2. Virgülü sen koy: a ÷ b’yi paylaştır, bütünler bitince virgül kartını bölüm tablosunda doğru aralığa sürükle
 *  3. Kimseye bütün düşmezse: 3 ÷ 4 gibi; birler basamağına 0 kartı, sonra virgül → 0,75
 *  4. Virgül nereye?: virgül tuşu bozuk hesap makinesi; önce herkese kaç bütün düştüğünü tahmin et, sonra virgülü rakamların arasına sürükle
 */

const GAP_TOOL: ToolInfo = { icon: <span className="text-xl leading-none font-black text-pink-600">,</span>, name: 'Virgül kartı', text: 'Rakamların arasındaki kesikli aralıklardan birine bırak.' }
const EST_TOOL: ToolInfo = { icon: <span className="grid size-5 place-items-center rounded-md bg-white text-xs font-black ring-1 ring-line">2</span>, name: 'Tahmin kartları', text: 'Herkese kaç bütün düştüğünü gösteren kartı tahmin kutusuna bırak.' }

export default function VirgulNeredenGeliyor({ grade, onFinish }: InteractionProps) {
  const [ab] = useState(() => pick([[9, 4], [7, 4], [5, 2], [6, 4], [9, 2]] as const))
  const [small] = useState(() => pick([[3, 4], [1, 4], [2, 5], [3, 5], [1, 2]] as const))
  const [a, b] = ab
  const [c, d] = small

  const tasks: TaskDef[] = [
    {
      emoji: '🎬',
      title: 'Mini ders: 7 ÷ 2',
      goal: 'Kısa animasyonu izleyerek bölüme virgülün hangi anda ve neden konduğunu görmek.',
      tools: [PLAY_TOOL],
      render: (done) => <LessonTask scenes={lessonScenes(7, 2, 'virgul')} rule="Bölmede önce bütünler paylaştırılır; bir kişinin aldığı bütün sayısı bölümün birler basamağına yazılır." onDone={done} />,
    },
    {
      emoji: '🍫',
      title: 'Virgülü sen koy',
      goal: `${a} çikolatayı ${b} arkadaşa eşit paylaştırmak ve bütünler bittiği anda virgülü bölüm tablosunda doğru yere koymak.`,
      tools: [SIM_TOOLS.pile, SIM_TOOLS.comma, SIM_TOOLS.hammer],
      render: (done, last) => (
        <SimTask
          onDone={done}
          last={last}
          rule="Virgül, bütünlerin bittiği yeri gösterir: solunda bir kişinin aldığı bütünler, sağında bütünden küçük parçalar yazılır."
          ask={{
            q: 'Bölüme virgülü koyduğun an masada ne olmuştu?',
            options: [
              { label: 'Bütün çikolatalar herkese yetmez olmuştu; sıra bütünden küçük parçalara geçiyordu.', ok: true },
              { label: 'Bölme işlemi bitmişti.', nudge: 'Virgülü koyduktan sonra paylaştırmaya devam ettin mi? Masada hâlâ çikolata var mıydı?' },
              { label: 'Kalan sıfır olmuştu.', nudge: 'Virgülü koyduğunda masada kalan çikolata vardı. Onları ne yaptın?' },
              { label: 'Hiçbir şey; virgül sadece bir yazım kuralı.', nudge: 'Virgülün solundaki ve sağındaki rakamlar aynı büyüklükte parçaları mı sayıyor?', mis: 'Virgül süs değildir: bütünle parçanın sınırını gösterir.' },
            ],
          }}
          render={(checks, finish) => (
            <ShareSim
              a={a}
              b={b}
              checks={checks}
              comma="drag"
              onDone={finish}
              prompt={<>{a} çikolatayı {b} arkadaşa eşit paylaştır. <span className="text-pink-700">Bütün çikolatalar bittiği anda bölüme virgülü sen koy!</span></>}
            />
          )}
        />
      ),
    },
    {
      emoji: '🥧',
      title: 'Kimseye bütün düşmezse',
      goal: `Bölünen bölenden küçükken (${c} ÷ ${d}) bölümün neden “0,” ile başladığını keşfetmek.`,
      tools: [SIM_TOOLS.pile, SIM_TOOLS.digit, SIM_TOOLS.comma, SIM_TOOLS.hammer],
      render: (done, last) => (
        <SimTask
          onDone={done}
          last={last}
          rule={`Bölünen bölenden küçükse kimseye bütün düşmez: bölümün birler basamağına 0 yazılır, sonra virgül konur (${c} ÷ ${d} = ${String(c / d).replace('.', ',')}).`}
          ask={{
            q: `${c} ÷ ${d} sonucu neden ${String(c / d).replace('.', ',')} yazılır da “${String(c / d).split('.')[1]}” ya da “,${String(c / d).split('.')[1]}” yazılmaz?`,
            options: [
              { label: 'Çünkü kimse bütün çikolata almadı; birler basamağı 0 ve virgülden sonrası parçaları gösteriyor.', ok: true },
              { label: `Çünkü ${String(c / d).split('.')[1]} de doğru, ikisi aynı şey.`, nudge: `${String(c / d).split('.')[1]} çikolata, masadaki ${c} çikolatadan çok değil mi?`, mis: 'Virgül ve birler basamağındaki 0 olmadan sayı bütünleri sayar.' },
              { label: 'Çünkü sonuç her zaman 0 ile başlar.', nudge: 'Önceki görevde bölüm 0 ile mi başlamıştı? Ne zaman 0 ile başlıyor?' },
              { label: 'Sıfır sadece süs için yazılır.', nudge: 'Birler basamağı bir kişinin kaç bütün aldığını söyler. Kaç bütün almıştı?' },
            ],
          }}
          render={(checks, finish) => (
            <ShareSim
              a={c}
              b={d}
              checks={checks}
              comma="drag"
              zeroDigit="drag"
              onDone={finish}
              prompt={<>Bu kez masada yalnızca {c} çikolata var ama {d} arkadaş paylaşacak. Önce dene: herkese bir bütün düşer mi? <span className="text-pink-700">Bölüme ne yazacağına sen karar ver.</span></>}
            />
          )}
        />
      ),
    },
    {
      emoji: '🕵️',
      title: 'Virgül nereye?',
      goal: 'Virgülü kaybolmuş bölümlerde virgülün yerini, herkese kaç bütün düştüğünü tahmin ederek bulmak.',
      tools: [EST_TOOL, GAP_TOOL],
      render: (done, last) => <CommaHunt onDone={done} last={last} />,
    },
  ]

  return (
    <Runner
      grade={grade}
      onFinish={onFinish}
      tasks={tasks}
      summary={(rules) => `Paylaştırma modeliyle ${a} ÷ ${b} ve ${c} ÷ ${d} bölmelerinde virgülü kendin koydun, virgülü kaybolmuş bölümleri tahminle düzelttin; ${rules.length} kuralı kendin buldun.`}
      insight="Virgül, bölmede bütünlerin bittiği ve onda birlerin başladığı yeri gösterir. Önce herkese kaç bütün düştüğünü tahmin edersen virgülün yerini hiç şaşırmazsın."
      note="Bu kuralları ezberlemedin: çikolataları paylaştırırken virgülün neden orada olduğunu kendin gördün."
    />
  )
}

/* ───────────── 4. virgül nereye? ───────────── */

interface Round { a: number; b: number; digits: string; whole: number }
const ROUNDS: Round[] = [
  { a: 9, b: 4, digits: '225', whole: 2 },
  { a: 50, b: 4, digits: '125', whole: 12 },
  { a: 3, b: 8, digits: '0375', whole: 0 },
  { a: 63, b: 4, digits: '1575', whole: 15 },
]
const asNum = (digits: string, pos: number) => Number(`${digits.slice(0, pos) || '0'}.${digits.slice(pos) || '0'}`)
const tr = (v: number) => String(v).replace('.', ',')

function CommaHunt({ onDone, last }: { onDone: Done; last: boolean }) {
  const checks = useChecks()
  const [r, setR] = useState(0)
  const [all, setAll] = useState(false)
  const R = ROUNDS[r]
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex gap-1.5" aria-label="Turlar">
        {ROUNDS.map((_, i) => <span key={i} className={`h-2.5 flex-1 rounded-full ${i < r || all ? 'bg-emerald-500' : i === r ? 'bg-pink-500' : 'bg-slate-200'}`} />)}
      </div>
      {all ? (
        <>
          <RulesFound rules={['Virgülün yerini tahminle kontrol edebilirim: önce herkese kaç bütün düştüğünü bulurum; o sayı virgülün soluna gelir.']} />
          <NextButton last={last} onClick={() => onDone(checks.pass(), ['Virgülün yerini tahminle kontrol edebilirim: önce herkese kaç bütün düştüğünü bulurum; o sayı virgülün soluna gelir.'])} />
        </>
      ) : (
        <HuntRound key={r} R={R} checks={checks} onOk={() => (r === ROUNDS.length - 1 ? setAll(true) : setR(r + 1))} />
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
      if (v !== R.whole) {
        const many = v * R.b > R.a
        return s.nudge(many ? `Herkese ${v} bütün verirsen ${R.b} × ${v} = ${R.b * v} çikolata gerekir. Masada yalnızca ${R.a} tane var!` : `Herkese ${v} bütün verirsen ${R.b * v} çikolata dağıtılır, geriye ${R.a - R.b * v} kalır. Herkese bir bütün daha verebilir misin?`, { mis: 'Bir kişinin payındaki bütün sayısı, bölenle çarpınca bölüneni geçmeyen en büyük sayıdır.' })
      }
      setEst(v)
      sfx.ok()
      s.ok(`Evet: ${R.b} × ${v} = ${R.b * v} ≤ ${R.a}. Herkese ${v} bütün düşer. Şimdi virgülü rakamların arasına sürükle.`)
      return true
    }
    if (it === 'comma' && target.startsWith('gap-') && est !== null) {
      const g = Number(target.slice(4))
      const v = asNum(R.digits, g)
      if (g !== String(R.whole).length) {
        return s.nudge(`Virgülü buraya koyarsan sonuç ${tr(v)} olur: herkese ${Math.floor(v)} bütün düşer demek. Ama sen tahminde ${R.whole} bütün buldun!`, { at: target, mis: 'Virgülün solu bir kişinin aldığı bütünleri gösterir.' })
      }
      setPos(g)
      sfx.ok()
      s.ok(`Harika! ${R.a} ÷ ${R.b} = ${tr(v)}: herkese ${R.whole} bütün ve biraz parça düşer.`)
      window.setTimeout(onOk, 1600)
      return true
    }
    return false
  })
  const digits = R.digits.split('')
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-line">
        <p className="text-[11px] font-black tracking-wide text-pink-700 uppercase">Virgül tuşu bozuk hesap makinesi</p>
        <p className="text-[17px] leading-snug font-extrabold sm:text-lg">{R.a} çikolata {R.b} arkadaşa paylaştırılacak. Hesap makinesi {R.a} ÷ {R.b} için ekranda virgülsüz <b className="tabular-nums">{R.digits}</b> gösteriyor. Virgül nereye gelmeli?</p>
      </div>

      <div className="mx-auto w-fit rounded-3xl bg-slate-800 p-3 shadow-[0_8px_0_#0f172a]">
        <div className="flex items-end rounded-2xl bg-lime-100 px-3 py-2 font-mono text-5xl font-black text-slate-800 tabular-nums ring-4 ring-slate-600 sm:text-6xl">
          {digits.map((ch, i) => (
            <span key={i} className="flex items-end">
              <Gap i={i} pos={pos} dnd={dnd} open={est !== null && pos === null} />
              <span>{ch}</span>
            </span>
          ))}
          <Gap i={digits.length} pos={pos} dnd={dnd} open={est !== null && pos === null} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
          <p className="mb-2 text-sm font-extrabold">1. Tahmin et: herkese kaç <b>bütün</b> çikolata düşer?</p>
          <Drop dnd={dnd} id="est" className={`mb-2 grid min-h-14 place-items-center rounded-2xl border-2 border-dashed text-sm font-black ${est !== null ? 'border-emerald-400 bg-emerald-50 text-2xl text-emerald-800' : 'border-sky-400 bg-sky-50 text-sky-600'}`}>
            {est !== null ? `${est} bütün` : 'Tahmin kartını buraya sürükle'}
          </Drop>
          {est === null && (
            <div className="flex flex-wrap gap-2">
              {cards.map((v) => <Drag key={v} dnd={dnd} item={`est-${v}`} label={`${v} bütün`} className="grid size-14 place-items-center rounded-2xl bg-white text-2xl font-black shadow-[0_3px_0_#cbd5e1] ring-2 ring-line">{v}</Drag>)}
            </div>
          )}
        </div>
        <div className={`rounded-2xl bg-white p-3 ring-1 ring-line ${est === null ? 'opacity-50' : ''}`}>
          <p className="mb-2 text-sm font-extrabold">2. Virgül kartını ekrandaki doğru aralığa sürükle.</p>
          {pos === null ? (
            <Drag dnd={dnd} item="comma" label="Virgül kartı" disabled={est === null} className="grid h-16 w-14 place-items-end justify-center rounded-2xl bg-white pb-2 text-5xl leading-none font-black text-pink-600 shadow-[0_3px_0_#cbd5e1] ring-2 ring-pink-300">,</Drag>
          ) : (
            <p className="text-2xl font-black text-emerald-700 tabular-nums">{R.a} ÷ {R.b} = {tr(asNum(R.digits, pos))}</p>
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
  return <Drop dnd={dnd} id={`gap-${i}`} className="mx-0.5 h-14 w-5 self-center rounded-md border-2 border-dashed border-slate-400/70" />
}
