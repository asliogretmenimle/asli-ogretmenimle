import { useMemo, useState } from 'react'
import type { MatchActivity, MatchPair } from '../data/types'
import { ContentView, hasVisual } from '../components/ContentView'
import { shuffle, shuffleNotSame } from '../lib/random'
import { sfx } from '../lib/feedback'
import { CheckBar, Prompt, useItems, type EngineProps } from './common'
import { useTracker } from '../lib/trackerContext'

type Side = 'L' | 'R'

export default function MatchGame({ activity, onProgress, onFinish }: EngineProps<MatchActivity>) {
  const pairs = useItems<MatchPair>(activity.pairs, activity.generator, 10)
  const per = activity.perRound ?? 5
  const rounds = useMemo(() => {
    const src = activity.generator ? pairs : shuffle(pairs)
    const out: MatchPair[][] = []
    for (let i = 0; i < src.length; i += per) out.push(src.slice(i, i + per))
    // Son tur tek çift kalırsa önceki tura ekle
    if (out.length > 1 && out[out.length - 1].length < 2) out[out.length - 2].push(...out.pop()!)
    return out
  }, [pairs, per, activity.generator])

  const [round, setRound] = useState(0)
  const [sel, setSel] = useState<{ side: Side; i: number } | null>(null)
  const [done, setDone] = useState<Set<number>>(new Set())
  const [flash, setFlash] = useState<{ L: number; R: number } | null>(null)
  const [missed, setMissed] = useState<Set<number>>(new Set())
  const [score, setScore] = useState(0)
  const [matchedTotal, setMatchedTotal] = useState(0)
  const track = useTracker()

  const current = rounds[round] ?? []
  const rightOrder = useMemo(() => shuffleNotSame(current.map((_, i) => i)), [current])
  const total = pairs.length


  const tap = (side: Side, i: number) => {
    if (done.has(i) && side === 'L') return
    if (side === 'R' && done.has(i)) return
    if (!sel || sel.side === side) {
      setSel(sel && sel.side === side && sel.i === i ? null : { side, i })
      return
    }
    const L = side === 'L' ? i : sel.i
    const R = side === 'R' ? i : sel.i
    setSel(null)
    track.attempt(L === R)
    if (L === R) {
      track.item(!missed.has(L))
      const nd = new Set(done).add(L)
      setDone(nd)
      sfx.ok()
      if (!missed.has(L)) setScore((s) => s + 1)
      const m = matchedTotal + 1
      setMatchedTotal(m)
      onProgress(m, total)
    } else {
      setFlash({ L, R })
      setMissed((ms) => new Set(ms).add(L))
      sfx.bad()
      setTimeout(() => setFlash(null), 500)
    }
  }

  const roundDone = current.length > 0 && done.size === current.length
  const next = () => {
    if (round + 1 >= rounds.length) return onFinish(score, total)
    setDone(new Set())
    setMissed(new Set())
    setSel(null)
    setRound(round + 1)
  }

  const visual = current.some((p) => hasVisual(p.left) || hasVisual(p.right))

  const card = (side: Side, i: number) => {
    const p = current[i]
    const c = side === 'L' ? p.left : p.right
    const isSel = sel?.side === side && sel.i === i
    const isDone = done.has(i)
    const isFlash = flash && (side === 'L' ? flash.L === i : flash.R === i)
    return (
      <button
        key={`${side}${i}`}
        type="button"
        onClick={() => tap(side, i)}
        disabled={isDone}
        aria-pressed={isSel}
        className={`flex h-full w-full items-center justify-center rounded-2xl border-2 px-3 py-2 text-center text-lg font-extrabold transition sm:text-xl ${visual ? 'min-h-24' : 'min-h-16'} ${
          isDone
            ? 'border-ok bg-ok-soft text-green-800 opacity-80'
            : isFlash
              ? 'border-bad bg-bad-soft animate-shake'
              : isSel
                ? 'border-brand bg-brand-soft shadow-[0_0_0_4px_rgb(214_69_122/0.18)] -translate-y-0.5'
                : 'border-line bg-white shadow-[0_3px_0_var(--color-line)] hover:border-brand/40 active:translate-y-[2px] active:shadow-none'
        }`}
      >
        <ContentView c={c} size="sm" />
      </button>
    )
  }

  return (
    <div className="animate-fade-up" key={round}>
      <Prompt>
        <span className="text-base font-bold text-ink-soft sm:text-lg">Bir karta, sonra eşine dokun.</span>
        {rounds.length > 1 && <span className="ml-2 chip bg-brand-soft text-brand">Tur {round + 1}/{rounds.length}</span>}
      </Prompt>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:gap-x-8">
        {current.flatMap((_, row) => [card('L', row), card('R', rightOrder[row])])}
      </div>
      {roundDone && <CheckBar status="correct" canCheck={false} onNext={next} correctText={round + 1 >= rounds.length ? 'Hepsini eşleştirdin!' : 'Tur tamam!'} />}
    </div>
  )
}
