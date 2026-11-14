import { useState } from 'react'
import type { InteractionProps } from '../types'
import { NextButton, pick, useChecks } from '../donusum-studyosu/ortak'
import { DragAsk, RulesFound, type Ask, type ToolInfo } from '../sayilari-karsilastir/parts'
import { LessonTask, PLAY_TOOL, Runner, SIM_TOOLS, ShareSim, SimTask, Stuff, longDiv, quotientText, type Done, type TaskDef } from '../virgul-nereden-geliyor/bolme'
import { lessonScenes } from '../virgul-nereden-geliyor/ders'

/**
 * 100. Kalanın Yanına Neden Sıfır? (6. sınıf, MAT.6.1.6 kesir–bölme ilişkisi)
 * Ortak parçalar: ../virgul-nereden-geliyor/bolme.tsx
 *  1. Mini ders (adım adım): 6 ÷ 4; çikolatalar ve yazılı bölme yan yana; kalanın yanındaki 0 = 10 parçaya bölmek
 *  2. Sıfırı sen ekle: kalanın yanına 0 kartını koyunca masadaki çikolatalar 10’ar parçaya bölünür; “masada ne var?”
 *  3. Hata avcısı: üç defterdeki basit hatayı çikolatalarla bul
 */

const NOTE_TOOL: ToolInfo = { icon: <span className="text-base leading-none">📓</span>, name: 'Defter', text: 'Defterdeki çözümü oku ve resme bak. Hatayı anlatan kartı cevap kutusuna sürükle.' }

export default function KalaninYaninaSifir({ grade, onFinish }: InteractionProps) {
  const [[a, b]] = useState(() => pick([[5, 2], [7, 2], [9, 2], [3, 2]] as const))
  const q = quotientText(longDiv(a, b))
  const tasks: TaskDef[] = [
    {
      emoji: '🎬',
      title: 'Mini ders: 6 ÷ 4',
      goal: 'Adım adım ilerleyerek yazılı bölmede kalanın yanına yazılan 0’ın ne anlama geldiğini görmek.',
      tools: [PLAY_TOOL],
      render: (done) => <LessonTask scenes={lessonScenes(6, 4, 'sifir')} rule="Kalanın yanına yazılan 0, kalan çikolataları 10’ar parçaya bölmek demektir: 2 bütün = 20 parça." onDone={done} />,
    },
    {
      emoji: '✍️',
      title: 'Sıfırı sen ekle',
      goal: `${a} ÷ ${b} bölmesinde kalanın yanına 0’ı kendin yazmak ve çikolatalara ne olduğunu görmek.`,
      tools: [SIM_TOOLS.pile, SIM_TOOLS.zero, SIM_TOOLS.unit],
      render: (done, last) => (
        <SimTask
          onDone={done}
          last={last}
          rule="Sıfır eklemek çikolatayı çoğaltmaz. Kalan bütün çikolatalar 10’ar parçaya bölünür."
          ask={{
            q: 'Kalanın yanına yazdığın 0 ne işe yaradı?',
            options: [
              { label: 'Kalan çikolatayı 10 parçaya böldü.', ok: true },
              { label: 'Çikolatayı 10 kat çoğalttı.', nudge: '0’ı koyunca masaya yeni çikolata geldi mi? Yoksa var olan çikolata mı bölündü?', mis: 'Sıfır, çikolatayı çoğaltmaz; parçalara böler.' },
              { label: 'Hiçbir işe yaramadı.', nudge: '0’ı koyduğun anda masadaki çikolataya ne oldu?' },
            ],
          }}
          render={(checks, finish) => <ShareSim a={a} b={b} checks={checks} breakBy="zero" division askUnit onDone={finish} prompt={<>{a} çikolatayı {b} arkadaşa paylaştır. <span className="text-pink-700">Çikolata yetmeyince yazılı bölmede kalanın yanına 0 kartını koy.</span></>} />}
        />
      ),
    },
    {
      emoji: '🔍',
      title: 'Hata avcısı',
      goal: 'Üç defterdeki bölme hatasını bulmak.',
      tools: [NOTE_TOOL, 'answer'],
      render: (done, last) => <ErrorHunt onDone={done} last={last} />,
    },
  ]
  return (
    <Runner
      grade={grade}
      onFinish={onFinish}
      tasks={tasks}
      summary={(rules) => `${a} ÷ ${b} = ${q} bölmesinde kalanın yanına 0’ı kendin yazdın ve üç defterdeki hatayı buldun. ${rules.length} kural öğrendin.`}
      insight="Kalanın yanına yazılan 0 sihir değil: kalan bütün çikolataları 10’ar parçaya böldüğünü gösterir. Çikolata çoğalmaz, sadece parçalar küçülür."
      note="Bu kuralları yazılı bölmeyi çikolatalarla karşılaştırarak kendin buldun."
    />
  )
}

/* ───────────── 3. hata avcısı ───────────── */

interface Case { whose: string; emoji: string; task: string; lines: string[]; answer: string; truth: { w: number; t: number }; ask: Ask }
const CASES: Case[] = [
  {
    whose: 'Ali’nin',
    emoji: '👦',
    task: '3 ÷ 2',
    lines: ['3 ÷ 2 = 1, kalan 1', 'Kalanın yanına 0 yazdım: 10', '10 ÷ 2 = 5'],
    answer: '15',
    truth: { w: 1, t: 5 },
    ask: {
      q: 'Ali’nin cevabı 15. Ne unuttu?',
      options: [
        { label: 'Virgülü unuttu. Doğrusu 1,5.', ok: true },
        { label: '10 ÷ 2 işlemini yanlış yaptı.', nudge: '2 × 5 = 10. Bu doğru.' },
        { label: 'Hiçbir şey, cevap doğru.', nudge: '3 çikolatayı 2 kişiye paylaştırınca herkes 15 çikolata alır mı?', mis: 'Herkes 1 bütün ve 5 parça alır: 1,5.' },
      ],
    },
  },
  {
    whose: 'Ece’nin',
    emoji: '👧',
    task: '1 ÷ 2',
    lines: ['1’in içinde 2 yok', 'Yanına 0 yazdım: 10', '10 ÷ 2 = 5'],
    answer: '5',
    truth: { w: 0, t: 5 },
    ask: {
      q: 'Ece’nin cevabı 5. Ne unuttu?',
      options: [
        { label: 'Önce “0,” yazmayı unuttu. Doğrusu 0,5.', ok: true },
        { label: '10 ÷ 2 işlemini yanlış yaptı.', nudge: '2 × 5 = 10. Bu doğru.' },
        { label: 'Hiçbir şey, cevap doğru.', nudge: '1 çikolatayı 2 kişiye paylaştırınca herkes 5 çikolata alır mı?', mis: 'Kimse bütün almadı: 0 bütün 5 parça = 0,5.' },
      ],
    },
  },
  {
    whose: 'Can’ın',
    emoji: '🧑',
    task: '6 ÷ 4',
    lines: ['6 ÷ 4 = 1, kalan 2 → virgül koydum', 'Kalanın yanına 0 yazdım: 20', 'Bölüme de 0 yazdım', '20 ÷ 4 = 5'],
    answer: '1,05',
    truth: { w: 1, t: 5 },
    ask: {
      q: 'Can’ın cevabı 1,05. Hata nerede?',
      options: [
        { label: 'Kalanın yanına yazılan 0 bölüme yazılmaz. Doğrusu 1,5.', ok: true },
        { label: 'Virgülü koymamalıydı.', nudge: 'Bütün çikolatalar bitmişti. Virgül gerekli değil mi?' },
        { label: 'Hiçbir şey, cevap doğru.', nudge: 'Herkes 1 bütün ve 5 parça aldı. Bunu nasıl yazarız?', mis: '1 bütün 5 parça = 1,5.' },
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
  const rule = 'Sonucu çikolatalarla kontrol ederim: herkes kaç bütün ve kaç parça aldı? Bütünler virgülün soluna, parçalar sağına yazılır.'
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex gap-1.5" aria-label="Defterler">
        {CASES.map((_, k) => <span key={k} className={`h-3 flex-1 rounded-full ${k < i || all ? 'bg-emerald-500' : k === i ? 'bg-pink-500' : 'bg-slate-200'}`} />)}
      </div>
      {all ? (
        <>
          <RulesFound rules={[rule]} />
          <NextButton last={last} onClick={() => onDone(checks.pass(), [rule])} />
        </>
      ) : (
        <div key={i} className="space-y-3 animate-fade-up">
          <div className="rounded-3xl bg-[repeating-linear-gradient(#fff,#fff_35px,#bfdbfe_36px)] p-4 pl-10 shadow-sm ring-1 ring-line">
            <p className="mb-1 flex items-center gap-2 text-xl font-black"><span className="text-3xl" aria-hidden>{C.emoji}</span>{C.whose} defteri: {C.task}</p>
            <ol className="space-y-0 text-xl leading-[36px] font-bold text-slate-700">
              {C.lines.map((l, k) => <li key={k}>{l}</li>)}
            </ol>
            <p className="text-2xl leading-[36px] font-black text-red-600">Cevap: {C.answer}</p>
          </div>
          <Truth task={C.task} w={C.truth.w} t={C.truth.t} />
          <DragAsk key={i} ask={C.ask} checks={checks} onOk={() => setOk(true)} okText="Yakaladın! Çikolatalar da bunu gösteriyor." />
          {ok && <NextButton last={false} onClick={() => { setOk(false); if (i === CASES.length - 1) setAll(true); else setI(i + 1) }} />}
        </div>
      )}
    </div>
  )
}

/** Çikolatayla kontrol: bir kişinin gerçek payı */
function Truth({ task, w, t }: { task: string; w: number; t: number }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 p-3 ring-2 ring-amber-200">
      <span className="text-base font-black text-amber-900">Çikolatayla kontrol ({task}): bir kişinin payı</span>
      <span className="rounded-xl bg-white p-2 ring-1 ring-amber-200"><Stuff w={w} t={t} s={10} /></span>
      <span className="text-lg font-black text-ink">{w} bütün {t} parça</span>
    </div>
  )
}
