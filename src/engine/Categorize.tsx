import { useMemo, useState } from 'react'
import { DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import type { CategorizeActivity } from '../data/types'
import { ContentView, hasVisual } from '../components/ContentView'
import { MathText } from '../components/MathText'
import { shuffle } from '../lib/random'
import { celebrate, sfx } from '../lib/feedback'
import { CheckBar, Explain, Prompt, type EngineProps } from './common'

const BUCKET_COLORS = ['#6366f1', '#f97316', '#22c55e', '#ec4899']

export default function Categorize({ activity, onProgress, onFinish }: EngineProps<CategorizeActivity>) {
  const items = useMemo(() => shuffle(activity.items.map((it, i) => ({ ...it, i }))), [activity.items])
  const [placed, setPlaced] = useState<Record<number, string>>({})
  const [missed, setMissed] = useState<Set<number>>(new Set())
  const [shake, setShake] = useState<{ item: number; bucket: string } | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 80, tolerance: 8 } }),
  )

  const drop = (itemIdx: number, bucket: string) => {
    const it = activity.items[itemIdx]
    setPicked(null)
    if (it.category === bucket) {
      setNote(null)
      const np = { ...placed, [itemIdx]: bucket }
      setPlaced(np)
      sfx.ok()
      onProgress(Object.keys(np).length, items.length)
      if (Object.keys(np).length === items.length) celebrate()
    } else {
      setMissed((m) => new Set(m).add(itemIdx))
      setNote(it.explain ?? null)
      setShake({ item: itemIdx, bucket })
      sfx.bad()
      setTimeout(() => setShake(null), 500)
    }
  }

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over) return
    drop(Number(e.active.id), String(e.over.id))
  }

  const pool = items.filter((it) => placed[it.i] === undefined)
  const finished = pool.length === 0
  const score = items.length - missed.size
  const visual = items.some((it) => hasVisual(it.content))

  return (
    <div className="animate-fade-up">
      <Prompt>
        <span className="text-base font-bold text-ink-soft sm:text-lg">Kartları doğru gruba sürükle ya da karta, sonra gruba dokun.</span>
      </Prompt>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className={`mb-5 flex min-h-20 flex-wrap justify-center gap-2.5 rounded-2xl bg-white/60 p-3 ring-1 ring-line ${finished ? 'hidden' : ''}`}>
          {pool.map((it) => (
            <DraggableItem key={it.i} id={it.i} picked={picked === it.i} shaking={shake?.item === it.i} visual={visual} onTap={() => setPicked(picked === it.i ? null : it.i)}>
              <ContentView c={it.content} size="sm" />
            </DraggableItem>
          ))}
        </div>
        <div className={`grid gap-3 ${activity.categories.length === 2 ? 'grid-cols-2' : activity.categories.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'}`}>
          {activity.categories.map((cat, ci) => (
            <Bucket
              key={cat.id}
              id={cat.id}
              label={cat.label}
              color={cat.color ?? BUCKET_COLORS[ci % BUCKET_COLORS.length]}
              armed={picked !== null}
              shaking={shake?.bucket === cat.id}
              onTap={() => picked !== null && drop(picked, cat.id)}
            >
              {items.filter((it) => placed[it.i] === cat.id).map((it) => (
                <div key={it.i} className="animate-pop rounded-xl bg-white px-2.5 py-1.5 text-base font-extrabold shadow-sm ring-1 ring-green-200">
                  <ContentView c={it.content} size="sm" />
                </div>
              ))}
            </Bucket>
          ))}
        </div>
      </DndContext>
      {note && !finished && <Explain>{note}</Explain>}
      {finished && <CheckBar status="correct" canCheck={false} onNext={() => onFinish(score, items.length)} correctText="Hepsini yerleştirdin!" nextLabel="Bitir" />}
    </div>
  )
}

function DraggableItem({ id, children, picked, shaking, visual, onTap }: { id: number; children: React.ReactNode; picked: boolean; shaking: boolean; visual: boolean; onTap: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={onTap}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, touchAction: 'none' }}
      className={`flex items-center justify-center rounded-2xl border-2 px-4 py-2 text-lg font-extrabold select-none sm:text-xl ${visual ? 'min-h-20 min-w-24' : 'min-h-14 min-w-14'} ${
        isDragging ? 'z-30 scale-110 border-brand bg-brand-soft shadow-[var(--shadow-lift)]' : shaking ? 'border-orange-400 bg-orange-50 animate-shake' : picked ? 'border-brand bg-brand-soft shadow-[0_0_0_4px_rgb(63_138_79/0.18)]' : 'border-line bg-white shadow-[0_3px_0_var(--color-line)]'
      } cursor-grab`}
    >
      {children}
    </button>
  )
}

function Bucket({ id, label, color, children, armed, shaking, onTap }: { id: string; label: string; color: string; children: React.ReactNode; armed: boolean; shaking: boolean; onTap: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      onClick={onTap}
      role="button"
      tabIndex={armed ? 0 : -1}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onTap()}
      className={`flex min-h-40 flex-col rounded-2xl border-[3px] p-3 transition ${shaking ? 'animate-shake' : ''} ${armed ? 'cursor-pointer' : ''}`}
      style={{ borderColor: color, background: isOver ? `${color}22` : `${color}0d`, borderStyle: armed || isOver ? 'solid' : 'dashed' }}
    >
      <div className="mb-2 text-center text-base font-black sm:text-lg" style={{ color }}><MathText text={label} /></div>
      <div className="flex flex-wrap justify-center gap-2">{children}</div>
    </div>
  )
}
