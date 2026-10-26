import { useState } from 'react'
import { ArrowDown, Check, Lightbulb } from 'lucide-react'
import type { InteractionProps } from '../types'
import { ActivityLayout, useNudge, useSession } from '../hizli-noktalar/kit'
import { BigButton } from '../../games/kit2'

const bank = [
  { title: '38 + 27', strategy: 'Onluğa tamamlama', steps: ['38 + 2 = 40', '27’den 2 çıkar: 25', '40 + 25 = 65'], choices: ['40 + 25 = 65', '38 + 2 = 40', '27’den 2 çıkar: 25'] },
  { title: '64 − 29', strategy: 'Telafi', steps: ['29’u 30 yap: 1 ekle', '64 − 30 = 34', '1’i geri ekle: 35'], choices: ['64 − 30 = 34', '29’u 30 yap: 1 ekle', '1’i geri ekle: 35'] },
  { title: '6 × 14', strategy: 'Dağılma özelliği', steps: ['14’ü 10 + 4 olarak ayır', '6 × 10 = 60 ve 6 × 4 = 24', '60 + 24 = 84'], choices: ['60 + 24 = 84', '14’ü 10 + 4 olarak ayır', '6 × 10 = 60 ve 6 × 4 = 24'] },
  { title: '3/4 + 1/2', strategy: 'Ortak birimle düşünme', steps: ['1/2, 2/4’e denktir', '3/4 + 2/4 = 5/4', '5/4 = 1 1/4'], choices: ['5/4 = 1 1/4', '1/2, 2/4’e denktir', '3/4 + 2/4 = 5/4'] },
]

export default function StratejiniOgret({ grade, onFinish }: InteractionProps) {
  const tasks = grade <= 3 ? bank.slice(0, 2) : grade <= 5 ? bank.slice(0, 3) : bank
  const S = useSession(tasks.length)
  const N = useNudge()
  const next = () => {
    N.clear()
    if (S.last) onFinish({ stars: S.stars(), summary: `${S.totals.done} çözümü adım adım öğrettin.`, insight: 'Bir stratejiyi öğretirken her adımın neden yapıldığını ve adımların sonuca nasıl bağlandığını açıklarız.' })
    else S.next()
  }
  return <Teach key={S.idx} grade={grade} task={tasks[S.idx]} index={S.idx} total={tasks.length} session={S} nudge={N} onNext={next} />
}

function Teach({ grade, task, index, total, session: S, nudge: N, onNext }: { grade: number; task: typeof bank[number]; index: number; total: number; session: ReturnType<typeof useSession>; nudge: ReturnType<typeof useNudge>; onNext: () => void }) {
  const [picked, setPicked] = useState<string[]>([])
  const pick = (step: string) => {
    if (S.done || picked.includes(step)) return
    const expected = task.steps[picked.length]
    if (step !== expected) {
      S.attempt(false)
      N.show(`Sıradaki adım “${expected}”. Önce bu adımı neden yaptığımızı düşün.`, { misc: 'Çözüm adımlarının sırasını karıştırdı' })
      return
    }
    const list = [...picked, step]
    setPicked(list)
    if (list.length === task.steps.length) {
      S.attempt(true)
      S.complete()
      N.show(`Harika! ${task.strategy} stratejisini anlaşılır sırayla öğrettin.`, { tone: 'ok' })
    }
  }
  return (
    <ActivityLayout grade={grade as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8} idx={index} total={total} title="Kendi Stratejini Öğret" prompt={`Bir arkadaşına ${task.strategy} yolunu öğret. Adımları doğru sırayla seç.`} nudge={N.nudge} onCloseNudge={N.clear} done={S.done} doneBox={<p className="font-bold text-emerald-900">Çözümü açık ve sıralı anlattın: {task.title}.</p>} onNext={onNext} onHint={() => { S.hint(); N.show(`İlk adım: ${task.steps[0]}`) }}
      panel={<div className="flex flex-col gap-3">
        <div className="rounded-xl bg-orange-50 p-4 text-center text-2xl font-black text-orange-950">{task.title}</div>
        <p className="text-sm font-black text-ink">Öğretme sırası: {picked.length}/{task.steps.length}</p>
        {picked.map((step, i) => <div key={step} className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 font-bold text-emerald-950"><span>{i + 1}.</span>{step}{i < picked.length - 1 && <ArrowDown size={16} />}</div>)}
        <div className="flex flex-col gap-2">{task.choices.map((step) => <button key={step} type="button" disabled={S.done || picked.includes(step)} onClick={() => pick(step)} className="min-h-12 rounded-xl bg-white p-3 text-left text-sm font-bold text-ink ring-1 ring-line disabled:opacity-50">{step}</button>)}</div>
        {S.done && <p className="rounded-xl bg-emerald-50 p-3 font-bold text-emerald-900"><Check size={16} className="inline" /> Strateji: {task.strategy}</p>}
        {!S.done && <BigButton onClick={() => { S.hint(); N.show('İşlemi bir anda söyleme; önce sayıyı ya da işlemi kolay parçalara ayır.') }} variant="ghost" className="w-full"><Lightbulb size={18} />İpucu</BigButton>}
      </div>}
    >
      <div className="grid min-h-64 place-items-center rounded-2xl bg-white p-5 text-center ring-1 ring-line"><div><p className="text-xs font-black uppercase tracking-wide text-orange-700">Öğretmen sensin</p><p className="mt-3 text-4xl font-black text-ink">{task.title}</p><p className="mt-3 text-base font-bold text-ink-soft">Adımları bir arkadaşının takip edebileceği sırayla kur.</p></div></div>
    </ActivityLayout>
  )
}
