import { useMemo, useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import type { QuizActivity, QuizQuestion } from '../data/types'
import { ContentView, hasVisual } from '../components/ContentView'
import { MathText } from '../components/MathText'
import { shuffle } from '../lib/random'
import { sfx } from '../lib/feedback'
import { CheckBar, Explain, FlashCover, Prompt, useFlash, useItems, type EngineProps, type Status } from './common'
import { useTracker } from '../lib/trackerContext'

export default function Quiz({ activity, onProgress, onFinish }: EngineProps<QuizActivity>) {
  const raw = useItems<QuizQuestion>(activity.questions, activity.generator)
  const questions = useMemo(
    () =>
      raw.map((q) => {
        const order = activity.fixedOrder ? q.choices.map((_, i) => i) : shuffle(q.choices.map((_, i) => i))
        return {
          ...q,
          choices: order.map((i) => q.choices[i]),
          feedback: q.feedback ? order.map((i) => q.feedback![i]) : undefined,
          reasons: q.reasons ? order.map((i) => q.reasons![i]) : undefined,
          answer: order.indexOf(q.answer),
        }
      }),
    [raw, activity.fixedOrder],
  )
  const open = !!activity.anyCorrect
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [wrongPicks, setWrongPicks] = useState<number[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [score, setScore] = useState(0)
  const q = questions[idx]
  const flash = useFlash(q?.flash, idx)
  const track = useTracker()

  const choose = (i: number) => {
    if (status === 'correct' || status === 'revealed') return
    setPicked(i)
    track.attempt(open || i === q.answer)
    if (open || i === q.answer) {
      track.item(wrongPicks.length === 0)
      setStatus('correct')
      if (wrongPicks.length === 0) setScore((s) => s + 1)
      flash.reveal()
      sfx.ok()
    } else {
      const wp = [...wrongPicks, i]
      setWrongPicks(wp)
      track.misconception(q.feedback?.[i])
      sfx.bad()
      // İki seçenekli sorularda ya da ikinci yanlışta doğru cevabı göster
      if (wp.length >= Math.min(2, q.choices.length - 1)) {
        track.item(false)
        setStatus('revealed')
        flash.reveal()
      } else setStatus('wrong')
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
    setWrongPicks([])
    setStatus('idle')
  }

  if (!q) return null
  const visualChoices = q.choices.some(hasVisual)
  const longChoices = open || q.choices.some((c) => typeof c === 'string' && c.length > 28)
  const promptVisual = typeof q.prompt !== 'string' && q.prompt.visual
  const lastWrong = wrongPicks[wrongPicks.length - 1]
  const misconception = lastWrong !== undefined ? q.feedback?.[lastWrong] : undefined
  const locked = status === 'correct' || status === 'revealed'

  return (
    <div className="animate-fade-up" key={idx}>
      <Prompt>
        {flash.active && promptVisual && !flash.visible ? (
          <div className="flex flex-col items-center gap-3">
            <FlashCover canPeek={flash.canPeek} onPeek={flash.peek} />
            {typeof q.prompt !== 'string' && q.prompt.text && <MathText text={q.prompt.text} />}
          </div>
        ) : (
          <ContentView c={q.prompt} size="lg" />
        )}
      </Prompt>
      <div className={`grid gap-3 ${visualChoices ? 'grid-cols-2' : longChoices ? 'grid-cols-1 sm:grid-cols-2' : q.choices.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'}`} role="group" aria-label="Seçenekler">
        {q.choices.map((c, i) => {
          const isPicked = i === picked
          const wasWrong = wrongPicks.includes(i)
          const state = open
            ? status === 'correct' ? (isPicked ? 'chosen' : 'open') : 'idle'
            : locked && i === q.answer
              ? 'right'
              : wasWrong
                ? 'wrong'
                : locked
                  ? 'dim'
                  : 'idle'
          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              disabled={locked || wasWrong}
              className={`relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-4 py-3 text-lg font-extrabold transition sm:text-xl ${
                state === 'idle'
                  ? 'border-line bg-white shadow-[0_3px_0_var(--color-line)] hover:border-brand hover:bg-brand-soft active:translate-y-[2px] active:shadow-none'
                  : state === 'right' || state === 'chosen'
                    ? 'border-ok bg-ok-soft text-green-800 animate-pop'
                    : state === 'wrong'
                      ? 'border-orange-300 bg-orange-50 text-orange-800/70'
                      : state === 'open'
                        ? 'border-line bg-white'
                        : 'border-line bg-white opacity-50'
              }`}
            >
              <span className={state === 'wrong' ? 'line-through decoration-2' : ''}><ContentView c={c} size="sm" /></span>
              {open && status === 'correct' && q.reasons?.[i] && (
                <span className={`text-sm font-bold ${isPicked ? 'text-green-800' : 'text-ink-soft'}`}><MathText text={q.reasons[i]} /></span>
              )}
              {(state === 'right' || state === 'chosen') && <Check className="absolute top-2 right-2 text-ok" size={20} strokeWidth={3} />}
            </button>
          )
        })}
      </div>

      {status === 'wrong' && misconception && <Explain>{misconception}</Explain>}
      {status === 'revealed' && <Explain>{[misconception, q.explain].filter(Boolean).join(' ') || 'Doğru cevabı yeşil kartta görebilirsin.'}</Explain>}
      {status === 'correct' && !open && q.explain && wrongPicks.length > 0 && <Explain tone="green">{q.explain}</Explain>}
      {status === 'correct' && open && (
        <Explain tone="green">
          <span className="flex items-start gap-1.5"><Sparkles size={16} className="mt-0.5 shrink-0" />Her seçeneğin farklı olması için bir sebep var! Senin gerekçen hangisine benziyor? Başka bir gerekçe bulabilir misin?</span>
        </Explain>
      )}

      <CheckBar
        status={status}
        canCheck={false}
        onNext={next}
        onRetry={() => setStatus('idle')}
        correctText={open ? 'Güzel düşünce!' : wrongPicks.length ? 'Buldun!' : 'Harika!'}
        wrongText="Henüz değil! Başka bir seçeneği düşün."
        revealedText="Doğru cevap yeşil kartta."
      />
    </div>
  )
}
