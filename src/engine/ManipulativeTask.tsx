import { useState } from 'react'
import type { ManipulativeActivity } from '../data/types'
import { tools } from '../manipulatives/registry'
import { MathText } from '../components/MathText'
import { sfx } from '../lib/feedback'
import { CheckBar, type EngineProps, type Status } from './common'

export default function ManipulativeTask({ activity, onProgress, onFinish }: EngineProps<ManipulativeActivity>) {
  const tool = tools[activity.tool]
  const config = { ...tool.defaultConfig, ...activity.config }
  const [idx, setIdx] = useState(0)
  const task = activity.tasks[idx]
  const [value, setValue] = useState(() => tool.initial(config, task?.target))
  const [status, setStatus] = useState<Status>('idle')
  const [tries, setTries] = useState(0)
  const [score, setScore] = useState(0)

  const check = () => {
    if (tool.check(value, task.target, config)) {
      setStatus('correct')
      if (tries === 0) setScore((s) => s + 1)
      sfx.ok()
    } else {
      setStatus('wrong')
      setTries((t) => t + 1)
      sfx.bad()
    }
  }

  const next = () => {
    const done = idx + 1
    onProgress(done, activity.tasks.length)
    if (done >= activity.tasks.length) return onFinish(score, activity.tasks.length)
    setIdx(done)
    setValue(tool.initial(config, activity.tasks[done].target))
    setStatus('idle')
    setTries(0)
  }

  if (!task) return null
  const Comp = tool.Component

  return (
    <div className="animate-fade-up" key={idx}>
      <div className="mb-5 rounded-2xl bg-indigo-50 px-4 py-3 text-center text-lg font-extrabold text-indigo-900 sm:text-xl">
        <MathText text={task.prompt} />
      </div>
      <Comp value={value} onChange={setValue} config={config} target={task.target} locked={status === 'correct' || status === 'revealed'} />
      <CheckBar
        status={status}
        canCheck
        onCheck={check}
        onRetry={() => setStatus('idle')}
        onNext={next}
        wrongText={tries >= 2 ? 'Biraz daha dene, yapabilirsin!' : 'Henüz olmadı, tekrar dene!'}
        nextLabel={idx + 1 >= activity.tasks.length ? 'Bitir' : 'Sonraki görev'}
        onSkip={tries >= 2 ? () => setStatus('revealed') : undefined}
        revealedText="Bu görevi geçtin."
      />
    </div>
  )
}
