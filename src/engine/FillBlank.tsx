import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Delete } from 'lucide-react'
import type { FillActivity, FillItem } from '../data/types'
import { MathText } from '../components/MathText'
import { VisualView } from '../components/Visual'
import { answerMatches } from '../lib/format'
import { shuffle } from '../lib/random'
import { sfx } from '../lib/feedback'
import { CheckBar, useItems, type EngineProps, type Status } from './common'

const isNumericAnswer = (a: string) => a.split('|').every((alt) => /^[-−]?[\d.,/]+$/.test(alt.trim()))

export default function FillBlank({ activity, onProgress, onFinish }: EngineProps<FillActivity>) {
  const items = useItems<FillItem>(activity.items, activity.generator)
  const keys = useMemo(() => {
    const all = items.flatMap((it) => it.answers)
    return { comma: all.some((a) => /[.,]/.test(a.split('|')[0])), minus: all.some((a) => /^[-−]/.test(a)), slash: all.some((a) => a.includes('/')) }
  }, [items])

  const [idx, setIdx] = useState(0)
  const [values, setValues] = useState<string[]>([])
  const [active, setActive] = useState(0)
  const [status, setStatus] = useState<Status>('idle')
  const [tries, setTries] = useState(0)
  const [wrongMask, setWrongMask] = useState<boolean[]>([])
  const [score, setScore] = useState(0)
  const [showHint, setShowHint] = useState(false)

  const item = items[idx]
  const parts = useMemo(() => (item ? item.text.split('__') : []), [item])
  const blanks = parts.length - 1
  const numeric = item ? item.answers.every(isNumericAnswer) : true
  const chips = useMemo(() => (item?.choices ? (item.choices.length > 3 ? shuffle(item.choices) : item.choices) : null), [item])


  const editable = status === 'idle'

  const type = useCallback(
    (ch: string) => {
      if (!editable) return
      setValues((v) => {
        const n = v.slice()
        if (ch === 'back') n[active] = (n[active] ?? '').slice(0, -1)
        else if ((n[active] ?? '').length < 12) n[active] = (n[active] ?? '') + ch
        return n
      })
    },
    [active, editable],
  )

  const setChip = (val: string) => {
    if (!editable) return
    setValues((v) => {
      const n = v.slice()
      n[active] = val
      return n
    })
    if (active < blanks - 1) setActive(active + 1)
  }

  // Fiziksel klavye
  useEffect(() => {
    if (!numeric || chips) return
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (/^[0-9]$/.test(e.key)) type(e.key)
      else if ((e.key === ',' || e.key === '.') && keys.comma) type(',')
      else if (e.key === '-' && keys.minus) type('-')
      else if (e.key === '/' && keys.slash) type('/')
      else if (e.key === 'Backspace') type('back')
      else if (e.key === 'Tab' && blanks > 1) {
        e.preventDefault()
        setActive((a) => (a + (e.shiftKey ? blanks - 1 : 1)) % blanks)
      } else if (e.key === 'ArrowRight') setActive((a) => Math.min(blanks - 1, a + 1))
      else if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, a - 1))
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [numeric, chips, type, keys, blanks])

  const check = () => {
    const mask = item.answers.map((a, i) => !answerMatches(values[i] ?? '', a))
    if (mask.every((m) => !m)) {
      setStatus('correct')
      if (tries === 0) setScore((s) => s + 1)
      sfx.ok()
    } else {
      setWrongMask(mask)
      sfx.bad()
      if (tries >= 1) {
        setValues(item.answers.map((a) => a.split('|')[0]))
        setStatus('revealed')
      } else setStatus('wrong')
      setTries((t) => t + 1)
    }
  }

  const retry = () => {
    setValues((v) => Array.from({ length: blanks }, (_, i) => (wrongMask[i] ? '' : v[i] ?? '')))
    setActive(Math.max(0, wrongMask.findIndex(Boolean)))
    setStatus('idle')
  }

  const next = () => {
    const done = idx + 1
    onProgress(done, items.length)
    if (done >= items.length) return onFinish(score, items.length)
    setIdx(done)
    setValues([])
    setActive(0)
    setStatus('idle')
    setTries(0)
    setWrongMask([])
    setShowHint(false)
  }

  if (!item) return null
  const filled = Array.from({ length: blanks }, (_, i) => values[i] ?? '').every((v) => v.trim() !== '')

  return (
    <div className="animate-fade-up" key={idx}>
      {item.visual && (
        <div className="mb-5">
          <VisualView v={item.visual} size="lg" />
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-3 text-center text-2xl font-extrabold leading-relaxed sm:text-3xl">
        {parts.map((p, i) => (
          <Fragment key={i}>
            {p && <MathText text={p} className="whitespace-pre-wrap" />}
            {i < blanks && (
              numeric || chips ? (
                <button
                  type="button"
                  onClick={() => editable && setActive(i)}
                  aria-label={`${i + 1}. boşluk`}
                  className={`inline-flex h-14 min-w-16 items-center justify-center rounded-2xl border-[3px] px-3 tabular-nums transition sm:h-16 ${
                    status === 'correct'
                      ? 'border-ok bg-ok-soft text-green-800'
                      : status === 'revealed'
                        ? wrongMask[i] ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-ok bg-ok-soft text-green-800'
                        : status === 'wrong' && wrongMask[i]
                          ? 'border-bad bg-bad-soft text-rose-700 animate-shake'
                          : active === i
                            ? 'border-brand bg-indigo-50 text-brand shadow-[0_0_0_4px_rgb(99_102_241/0.15)]'
                            : 'border-dashed border-slate-300 bg-white'
                  }`}
                >
                  {values[i] || (active === i && editable ? <span className="h-7 w-0.5 animate-pulse bg-brand" /> : '')}
                </button>
              ) : (
                <input
                  value={values[i] ?? ''}
                  disabled={!editable}
                  onChange={(e) => setValues((v) => { const n = v.slice(); n[i] = e.target.value; return n })}
                  onFocus={() => setActive(i)}
                  aria-label={`${i + 1}. boşluk`}
                  autoFocus={i === 0}
                  autoComplete="off"
                  autoCapitalize="off"
                  className={`h-14 w-40 rounded-2xl border-[3px] px-3 text-center outline-none sm:h-16 ${
                    status === 'correct' ? 'border-ok bg-ok-soft' : status === 'wrong' && wrongMask[i] ? 'border-bad bg-bad-soft' : status === 'revealed' ? 'border-amber-400 bg-amber-50' : 'border-brand bg-white'
                  }`}
                />
              )
            )}
          </Fragment>
        ))}
      </div>

      {editable && chips && (
        <div className="flex flex-wrap justify-center gap-3">
          {chips.map((c) => (
            <button key={c} type="button" onClick={() => setChip(c)} className="min-h-14 min-w-16 rounded-2xl border-2 border-line bg-white px-5 text-2xl font-extrabold shadow-[0_3px_0_var(--color-line)] transition hover:border-brand active:translate-y-[2px] active:shadow-none">
              <MathText text={c} />
            </button>
          ))}
        </div>
      )}

      {editable && numeric && !chips && <Keypad onKey={type} comma={keys.comma} minus={keys.minus} slash={keys.slash} />}

      <CheckBar
        status={status}
        canCheck={filled}
        onCheck={check}
        onRetry={retry}
        onNext={next}
        hint={item.hint}
        showHint={showHint}
        onHint={() => setShowHint(true)}
        revealedText="Doğru cevap kutuda gösterildi."
      />
    </div>
  )
}

function Keypad({ onKey, comma, minus, slash }: { onKey: (k: string) => void; comma: boolean; minus: boolean; slash: boolean }) {
  const extra = [comma && ',', minus && '-', slash && '/'].filter(Boolean) as string[]
  const key = 'h-14 rounded-2xl bg-white text-2xl font-extrabold shadow-[0_3px_0_var(--color-line)] ring-1 ring-line transition active:translate-y-[2px] active:shadow-none hover:bg-indigo-50 sm:h-16'
  return (
    <div className="mx-auto grid max-w-sm grid-cols-5 gap-2 sm:max-w-md" role="group" aria-label="Sayı tuşları">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => (
        <button key={d} type="button" className={key} onClick={() => onKey(d)}>{d}</button>
      ))}
      {extra.map((e) => (
        <button key={e} type="button" className={`${key} text-brand`} onClick={() => onKey(e)} aria-label={e === ',' ? 'virgül' : e === '-' ? 'eksi' : 'kesir çizgisi'}>{e}</button>
      ))}
      <button type="button" className={`${key} flex items-center justify-center text-ink-soft`} style={{ gridColumn: `span ${5 - extra.length}` }} onClick={() => onKey('back')} aria-label="Sil">
        <Delete size={26} />
      </button>
    </div>
  )
}
