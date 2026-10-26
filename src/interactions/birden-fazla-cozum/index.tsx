import { useMemo, useState } from 'react'
import { ArrowRight, Check, Lightbulb } from 'lucide-react'
import type { InteractionProps } from '../types'
import { useTracker } from '../../lib/trackerContext'
import { ActivityLayout, useNudge, useSession } from '../hizli-noktalar/kit'
import { BigButton } from '../../games/kit2'
import { PROBLEMS, answerText, bacakAns, geriAns, ikiliAns, type Problem } from './problems'

const METHODS = [
  { id: 'model', label: 'Model kurdum', hint: 'Nicelikleri parçalar, gruplar ya da bir işlem zinciri olarak göster.' },
  { id: 'tablo', label: 'Tabloyla denedim', hint: 'Olası değerleri sırala; her denemede toplamın nasıl değiştiğini izle.' },
  { id: 'tahmin', label: 'Tahmin edip denetledim', hint: 'Bir değer tahmin et, koşulları sağlayıp sağlamadığını kontrol et.' },
  { id: 'denklem', label: 'Denklem kurdum', hint: 'Bilinmeyeni bir sembolle göster ve verilen ilişkiyi eşitliğe çevir.' },
]

export default function BirdenFazlaCozum({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => PROBLEMS.filter((p) => p.g.includes(grade)).slice(0, 5), [grade])
  const S = useSession(tasks.length)
  const N = useNudge()
  const next = () => {
    N.clear()
    if (S.last) {
      onFinish({ stars: S.stars(), summary: `${S.totals.done} problemi en az iki farklı yolla çözdün.`, insight: 'Bir problemi model, tablo, deneme ya da denklemle çözebiliriz; yöntemler farklı olsa da aynı koşulları sağlamalıdır.' })
    } else S.next()
  }
  const task = tasks[S.idx]
  return <ProblemView key={task.id} grade={grade} task={task} index={S.idx} total={tasks.length} session={S} nudge={N} onNext={next} />
}

function ProblemView({ grade, task, index, total, session: S, nudge: N, onNext }: { grade: number; task: Problem; index: number; total: number; session: ReturnType<typeof useSession>; nudge: ReturnType<typeof useNudge>; onNext: () => void }) {
  const track = useTracker()
  const [method, setMethod] = useState(METHODS[0].id)
  const [answers, setAnswers] = useState<string[]>(task.kind === 'geri' ? [''] : ['', ''])
  const [used, setUsed] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const expected = task.kind === 'ikili' ? ikiliAns(task) : task.kind === 'bacak' ? bacakAns(task) : [geriAns(task)]
  const check = () => {
    const values = answers.map(Number)
    if (values.some((v) => !Number.isFinite(v)) || values.some((v, i) => Math.abs(v - expected[i]) > 0.001)) {
      S.attempt(false)
      N.show('Her yanıtı verilen koşullara göre denetle. Toplam, fark ya da işlem zinciri tutuyor mu?', { misc: 'Problem koşullarını aynı anda sağlamayan yanıt verdi' })
      return
    }
    S.attempt(true)
    if (used.includes(method)) {
      N.show('Bu yöntemi zaten kullandın. Aynı cevaba ulaşmak için başka bir yol seç.', { tone: 'ok' })
      return
    }
    const nextUsed = [...used, method]
    setUsed(nextUsed)
    track.strategy(METHODS.find((m) => m.id === method)!.label)
    track.solutions(nextUsed.length)
    const explanation = METHODS.find((m) => m.id === method)!.hint
    setMessage(`${explanation} Sonuç: ${answerText(task)}.`)
    if (nextUsed.length >= 2) S.complete()
    else N.show('Doğru! Şimdi aynı probleme farklı bir yöntem uygula.', { tone: 'ok' })
  }
  const methodOptions = grade <= 3 ? METHODS.slice(0, 3) : METHODS
  const inputs = task.kind === 'ikili'
    ? [{ label: task.a, value: answers[0] }, { label: task.b, value: answers[1] }]
    : task.kind === 'bacak'
      ? [{ label: task.k2.name, value: answers[0] }, { label: task.k1.name, value: answers[1] }]
      : [{ label: 'Başlangıç sayısı', value: answers[0] }]
  return (
    <ActivityLayout
      grade={grade as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}
      idx={index}
      total={total}
      title="Birden Fazla Çözüm"
      prompt={task.story}
      nudge={N.nudge}
      onCloseNudge={N.clear}
      done={S.done}
      doneBox={<p className="font-bold text-emerald-900">İki farklı yöntemi de denedin. {message}</p>}
      onNext={onNext}
      onHint={() => { S.hint(); N.show(METHODS.find((m) => m.id === method)!.hint) }}
      panel={
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
            <p className="mb-2 text-sm font-black text-ink">{task.question}</p>
            <div className="flex flex-wrap gap-2">{methodOptions.map((m) => <button key={m.id} type="button" aria-pressed={method === m.id} onClick={() => setMethod(m.id)} className={`min-h-11 rounded-xl px-3 text-sm font-bold ring-1 ${method === m.id ? 'bg-sky-600 text-white ring-sky-700' : 'bg-white text-ink ring-line'}`}>{m.label}</button>)}</div>
          </div>
          {inputs.map((input, i) => <label key={input.label} className="rounded-xl bg-white p-3 text-sm font-black text-ink ring-1 ring-line">{input.label}<input type="number" step="any" value={input.value} onChange={(e) => setAnswers((a) => a.map((v, j) => j === i ? e.target.value : v))} className="mt-1 min-h-12 w-full rounded-lg bg-paper px-3 text-lg" /></label>)}
          <p className="text-xs font-bold text-ink-soft">Kullandığın yollar: {used.map((id) => METHODS.find((m) => m.id === id)?.label).join(' · ') || 'henüz yok'}</p>
          <BigButton onClick={check} className="w-full"><Check size={18} />Bu yolla çöz</BigButton>
          {message && !S.done && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900">{message}<ArrowRight size={14} className="inline" /></p>}
          <p className="flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-xs font-bold text-sky-900"><Lightbulb size={16} />Aynı yanıtı iki farklı yöntemle bulup koşulları denetle.</p>
        </div>
      }
    >
      <div className="grid min-h-64 place-items-center rounded-2xl bg-white p-5 text-center ring-1 ring-line">
        <div><span className="text-6xl">{task.emoji}</span><p className="mt-3 text-xl font-black text-ink">{task.story}</p><p className="mt-2 text-base font-bold text-sky-800">{task.question}</p></div>
      </div>
    </ActivityLayout>
  )
}
