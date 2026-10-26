import { useState } from 'react'
import { Check, MessageCircle } from 'lucide-react'
import type { InteractionProps } from '../types'
import { ActivityLayout, useNudge, useSession } from '../hizli-noktalar/kit'
import { BigButton } from '../../games/kit2'
import { MathText } from '../../components/MathText'

const tasks = [
  { claim: '3 × (4 + 2) = 3 × 4 + 3 × 2', a: 'Ece: İki tarafı da hesapladım; ikisi 18 ediyor.', b: 'Mert: 3 grup 6, üç grup 4 ile üç grup 2’nin toplamına eşittir.', best: 'b', reason: 'Dağılma özelliğini gruplarla açıklıyor; yalnızca sonucu değil, nedenini gösteriyor.', distract: 'Ece’nin tek bir örneği iddianın her zaman doğru olduğunu kanıtlamaz.' },
  { claim: '38 + 27 = 40 + 25', a: 'Defne: 38’i 40 yapmak için 2 ekledim, toplam değişmesin diye 27’den 2 çıkardım.', b: 'Kaan: 40 daha büyük, o yüzden ikinci toplam kesin daha büyüktür.', best: 'a', reason: 'Bir toplanandan alınan miktar diğerine eklendi; toplam sabit kaldı.', distract: 'Toplananları ayrı ayrı karşılaştırmak, toplamı karşılaştırmaya yetmez.' },
  { claim: 'İki tek sayının toplamı çifttir.', a: 'Ece: 3 + 5 = 8; demek ki hep çift.', b: 'Mert: Her tek sayıda bir eşsiz kalır; iki eşsiz birleşince bir çift olur.', best: 'b', reason: 'Tek sayıyı bir çift ve bir artan olarak modelleyip tüm sayılara genelliyor.', distract: 'Bir örnek iddiayı destekler ama neden her zaman olduğunu göstermez.' },
  { claim: 'Aynı alana sahip dikdörtgenlerin çevresi de aynıdır.', a: 'Kaan: 3 × 8 ve 4 × 6 ikisi de 24 alan; çevreleri 22 ve 20, yani aynı değil.', b: 'Defne: İkisi de 24 kare olduğundan çevreleri de aynı olmalı.', best: 'a', reason: 'İki örneği hesaplayıp çevrelerin farklı olduğunu gösteren karşı örnek sunuyor.', distract: 'Alan eşitliği, kenar uzunluklarının veya çevrenin eşit olduğunu göstermez.' },
  { claim: 'Bir sayıyı çarpmak sonucu her zaman büyütür.', a: 'Arda: 8 × 2 = 16, büyüdü; demek ki hep büyür.', b: 'Ece: 8 × 1/2 = 4; 1’den küçük pozitif çarpan sonucu küçültebilir.', best: 'b', reason: 'Genellemeyi çürüten uygun bir karşı örnek ve bunun nedenini veriyor.', distract: 'İddia “her zaman” diyorsa, tek bir karşı örnek yeterlidir.' },
]

export default function MatematikselTartisma({ grade, onFinish }: InteractionProps) {
  const items = tasks.slice(0, grade < 5 ? 3 : grade < 7 ? 4 : 5)
  const S = useSession(items.length)
  const N = useNudge()
  const next = () => {
    N.clear()
    if (S.last) onFinish({ stars: S.stars(), summary: `${S.totals.done} matematiksel tartışmada kanıtı değerlendirdin.`, insight: 'Güçlü bir matematiksel gerekçe yalnızca sonucu söylemez; ilişkiyi, temsili ya da karşı örneği kullanarak nedenini açıklar.' })
    else S.next()
  }
  return <Debate key={S.idx} grade={grade} task={items[S.idx]} index={S.idx} total={items.length} session={S} nudge={N} onNext={next} />
}

function Debate({ grade, task, index, total, session: S, nudge: N, onNext }: { grade: number; task: typeof tasks[number]; index: number; total: number; session: ReturnType<typeof useSession>; nudge: ReturnType<typeof useNudge>; onNext: () => void }) {
  const [picked, setPicked] = useState<'a' | 'b' | null>(null)
  const [message, setMessage] = useState('')
  const choose = (choice: 'a' | 'b') => {
    if (choice !== task.best) {
      S.attempt(false)
      N.show(task.distract, { misc: 'Sonucu söylemeyi matematiksel gerekçe saydı' })
      return
    }
    S.attempt(true)
    setPicked(choice)
    setMessage(task.reason)
    S.complete()
    N.show('Bu gerekçe, iddiayı neden desteklediğini ya da çürüttüğünü açıklıyor.', { tone: 'ok' })
  }
  return (
    <ActivityLayout grade={grade as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8} idx={index} total={total} title="Matematiksel Tartışma" prompt="İki arkadaşın gerekçesini oku. Hangisi matematiksel olarak daha ikna edici?" nudge={N.nudge} onCloseNudge={N.clear} done={S.done} doneBox={<p className="font-bold text-emerald-900">{message}</p>} onNext={onNext} onHint={() => { S.hint(); N.show(task.distract) }}
      panel={<div className="flex flex-col gap-3">
        <p className="rounded-xl bg-violet-50 p-3 font-black text-violet-950">İddia: <MathText text={task.claim} /></p>
        {(['a', 'b'] as const).map((id) => <button key={id} type="button" disabled={S.done} onClick={() => choose(id)} className={`min-h-16 rounded-2xl p-3 text-left ring-1 ${picked === id ? 'bg-emerald-50 ring-emerald-300' : 'bg-white ring-line'}`}><span className="mb-1 flex items-center gap-2 text-sm font-black text-ink"><MessageCircle size={16} />{id === 'a' ? 'Gerekçe A' : 'Gerekçe B'}</span><span className="text-sm font-bold text-ink-soft">{task[id]}</span></button>)}
        {!S.done && <BigButton onClick={() => { S.hint(); N.show('Bir örneği kontrol etmekle, neden her zaman doğru olduğunu açıklamak aynı şey mi?') }} className="w-full">İpucu</BigButton>}
        {S.done && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900"><Check size={16} className="inline" /> {message}</p>}
      </div>}
    >
      <div className="grid min-h-64 place-items-center rounded-2xl bg-white p-5 text-center ring-1 ring-line"><div><p className="text-xs font-black uppercase tracking-wide text-violet-700">İddia</p><p className="mt-3 text-2xl font-black text-ink"><MathText text={task.claim} /></p><p className="mt-3 text-sm font-bold text-ink-soft">Örnek mi, açıklama mı? Gerekçeleri kanıtın gücüne göre karşılaştır.</p></div></div>
    </ActivityLayout>
  )
}
