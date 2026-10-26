import { useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import type { QuizActivity, QuizQuestion } from '../data/types'
import { ContentView, hasVisual } from '../components/ContentView'
import { shuffle } from '../lib/random'
import { sfx } from '../lib/feedback'
import { CheckBar, Prompt, useItems, type EngineProps, type Status } from './common'

export default function Quiz({ activity, onProgress, onFinish }: EngineProps<QuizActivity>) {
  const raw = useItems<QuizQuestion>(activity.questions, activity.generator)
  const questions = useMemo(
    () =>
      raw.map((q) => {
        const order = activity.fixedOrder ? q.choices.map((_, i) => i) : shuffle(q.choices.map((_, i) => i))
        return { ...q, choices: order.map((i) => q.choices[i]), answer: order.indexOf(q.answer) }
      }),
    [raw, activity.fixedOrder],
  )
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [score, setScore] = useState(0)
  const q = questions[idx]

  const choose = (i: number) => {
    if (status !== 'idle') return
    setPicked(i)
    if (i === q.answer) {
      setStatus('correct')
      setScore((s) => s + 1)
      sfx.ok()
    } else {
      setStatus('wrong')
      sfx.bad()
    }
  }

  const next = () => {
    const done = idx + 1
    onProgress(done, questions.length)
    if (done >= questions.length) {
      onFinish(score, questions.length)
      return
    }
    setIdx(done)
    setPicked(null)
    setStatus('idle')
  }

  if (!q) return null
  const visualChoices = q.choices.some(hasVisual)
  const longChoices = q.choices.some((c) => typeof c === 'string' && c.length > 28)

  return (
    <div className="animate-fade-up" key={idx}>
      <Prompt>
        <ContentView c={q.prompt} size="lg" />
      </Prompt>
      <div className={`grid gap-3 ${visualChoices ? 'grid-cols-2' : longChoices ? 'grid-cols-1' : q.choices.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'}`} role="group" aria-label="Seçenekler">
        {q.choices.map((c, i) => {
          const isAnswer = i === q.answer
          const isPicked = i === picked
          const state =
            status === 'idle' ? 'idle' : isAnswer && (status === 'correct' || status === 'wrong') ? 'right' : isPicked ? 'wrong' : 'dim'
          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              disabled={status !== 'idle'}
              className={`relative flex min-h-16 items-center justify-center rounded-2xl border-2 px-4 py-3 text-lg font-extrabold transition sm:text-xl ${
                state === 'idle'
                  ? 'border-line bg-white shadow-[0_3px_0_var(--color-line)] hover:border-brand hover:bg-brand-soft active:translate-y-[2px] active:shadow-none'
                  : state === 'right'
                    ? 'border-ok bg-ok-soft text-green-800 animate-pop'
                    : state === 'wrong'
                      ? 'border-bad bg-bad-soft text-rose-800 animate-shake'
                      : 'border-line bg-white opacity-50'
              }`}
            >
              <ContentView c={c} size="sm" />
              {state === 'right' && <Check className="absolute top-2 right-2 text-ok" size={20} strokeWidth={3} />}
              {state === 'wrong' && <X className="absolute top-2 right-2 text-bad" size={20} strokeWidth={3} />}
            </button>
          )
        })}
      </div>
      {status === 'wrong' && q.explain && <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-center font-bold text-amber-800">{q.explain}</p>}
      <CheckBar status={status === 'wrong' ? 'revealed' : status} canCheck={false} onNext={next} revealedText="Olmadı! Doğru cevap yeşil renkte." />
    </div>
  )
}
