import { useMemo, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { SortActivity, SortRound } from '../data/types'
import { ContentView, hasVisual } from '../components/ContentView'
import { MathText } from '../components/MathText'
import { shuffleNotSame } from '../lib/random'
import { sfx } from '../lib/feedback'
import { CheckBar, Explain, Prompt, useItems, type EngineProps, type Status } from './common'

export default function SortOrder({ activity, onProgress, onFinish }: EngineProps<SortActivity>) {
  const rounds = useItems<SortRound>(activity.rounds, activity.generator, 4)
  const [idx, setIdx] = useState(0)
  const round = rounds[idx]
  const shuffled = (r: SortRound | undefined) => (r ? shuffleNotSame(r.items.map((_, i) => i)) : [])
  const [order, setOrder] = useState<number[]>(() => shuffled(rounds[0]))
  const [status, setStatus] = useState<Status>('idle')
  const [tries, setTries] = useState(0)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 80, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setPicked(null)
    setOrder((o) => arrayMove(o, o.indexOf(Number(active.id)), o.indexOf(Number(over.id))))
  }

  // Dokun-değiştir: iki öğeye sırayla dokunulursa yer değiştirir
  const tap = (item: number) => {
    if (status !== 'idle') return
    if (picked === null) return setPicked(item)
    if (picked === item) return setPicked(null)
    setOrder((o) => {
      const n = o.slice()
      const a = n.indexOf(picked), b = n.indexOf(item)
      ;[n[a], n[b]] = [n[b], n[a]]
      return n
    })
    setPicked(null)
  }

  const check = () => {
    const ok = order.every((v, i) => v === i)
    if (ok) {
      setStatus('correct')
      if (tries === 0) setScore((s) => s + 1)
      sfx.ok()
    } else {
      sfx.bad()
      if (tries >= 1) {
        setOrder(round.items.map((_, i) => i))
        setStatus('revealed')
      } else setStatus('wrong')
      setTries((t) => t + 1)
    }
  }

  const next = () => {
    const done = idx + 1
    onProgress(done, rounds.length)
    if (done >= rounds.length) return onFinish(score, rounds.length)
    setIdx(done)
    setOrder(shuffled(rounds[done]))
    setStatus('idle')
    setTries(0)
    setPicked(null)
  }

  const visual = useMemo(() => round?.items.some(hasVisual) ?? false, [round])
  const long = useMemo(() => round?.items.some((c) => typeof c === 'string' && c.length > 14) ?? false, [round])
  if (!round) return null
  const layout = long ? 'grid-cols-1' : visual ? 'grid-cols-2 sm:grid-cols-3' : round.items.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3 sm:grid-cols-5'

  return (
    <div className="animate-fade-up" key={idx}>
      <Prompt><MathText text={round.prompt} /></Prompt>
      <p className="-mt-2 mb-4 text-center text-sm font-bold text-ink-soft">Sürükle ya da iki karta sırayla dokunarak yerlerini değiştir.</p>
      {round.ends && (
        <div className="mb-2 flex justify-between px-1 text-xs font-extrabold tracking-wide text-ink-soft uppercase">
          <span>← {round.ends[0]}</span>
          <span>{round.ends[1]} →</span>
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <div className={`grid gap-3 ${layout}`}>
            {order.map((item, pos) => (
              <SortCard
                key={item}
                id={item}
                pos={pos}
                content={round.items[item]}
                disabled={status !== 'idle'}
                picked={picked === item}
                onTap={() => tap(item)}
                state={status === 'idle' ? 'idle' : item === pos ? 'right' : status === 'wrong' ? 'wrong' : 'idle'}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {(status === 'revealed' || (status === 'correct' && tries > 0)) && round.explain && <Explain tone={status === 'correct' ? 'green' : 'amber'}>{round.explain}</Explain>}
      <CheckBar
        status={status}
        canCheck
        onCheck={check}
        onRetry={() => setStatus('idle')}
        onNext={next}
        hints={round.hints}
        wrongText="Henüz değil! Turuncu kartların yerini tekrar düşün."
        revealedText="Doğru sıralama gösterildi."
      />
    </div>
  )
}

function SortCard({ id, pos, content, disabled, picked, onTap, state }: { id: number; pos: number; content: SortRound['items'][number]; disabled: boolean; picked: boolean; onTap: () => void; state: 'idle' | 'right' | 'wrong' }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{ transform: CSS.Transform.toString(transform), transition, touchAction: 'none' }}
      {...attributes}
      {...listeners}
      onClick={onTap}
      aria-label={`${pos + 1}. sıradaki kart`}
      className={`relative flex min-h-16 items-center justify-center gap-2 rounded-2xl border-2 px-3 py-3 text-center text-lg font-extrabold select-none sm:text-xl ${
        isDragging ? 'z-20 scale-105 border-brand bg-brand-soft shadow-[var(--shadow-lift)]' : state === 'right' ? 'border-ok bg-ok-soft' : state === 'wrong' ? 'border-orange-400 bg-orange-50 animate-shake' : picked ? 'border-brand bg-brand-soft shadow-[0_0_0_4px_rgb(214_69_122/0.18)]' : 'border-line bg-white shadow-[0_3px_0_var(--color-line)]'
      } ${disabled ? '' : 'cursor-grab active:cursor-grabbing'}`}
    >
      <span className="absolute top-1.5 left-2 text-[11px] font-black text-ink-soft/60">{pos + 1}</span>
      <GripVertical size={16} className="absolute top-1/2 right-1.5 -translate-y-1/2 text-slate-300" aria-hidden />
      <ContentView c={content} size="sm" />
    </button>
  )
}
