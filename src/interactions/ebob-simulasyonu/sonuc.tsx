import { useState, type ReactNode } from 'react'
import { Card, Choices, Nudge, Prompt, useChecks } from '../donusum-studyosu/ortak'
import type { Row } from './sim'

/**
 * Sonuç kartı (EBOB ve EKOK simülasyonları ortak): dört problemin tablosu, ortak yapıyı gösteren listeler,
 * kavramın adı, ipucu kelimeler ve kısa bir sınıflama sorusu.
 */

export type Question = { prompt: string; options: { id: string; label: string; why?: string }[]; answer: string }

export function Sonuc({ rows, lists, reveal, clues, compare, questions, onSolved, footer, solved }: {
  rows: Row[]
  /** her satır için iki niceliğin listesi (bölenler ya da katlar), işaretlenecek ortak değerler ve en iyisi */
  lists: (r: Row) => { a: number[]; b: number[]; common: number[]; more?: boolean }
  reveal: ReactNode
  clues: string[]
  compare?: ReactNode
  questions: Question[]
  onSolved: (first: boolean) => void
  footer: ReactNode
  solved: boolean
}) {
  const chk = useChecks()
  const [picks, setPicks] = useState<Record<number, string>>({})
  const [wrong, setWrong] = useState<{ key: number; text: string } | null>(null)
  const pick = (qi: number, id: string) => {
    if (solved) return
    const q = questions[qi]
    const next = { ...picks, [qi]: id }
    setPicks(next)
    if (id !== q.answer) {
      chk.fail()
      setWrong((w) => ({ key: (w?.key ?? 0) + 1, text: q.options.find((o) => o.id === id)?.why ?? 'Problemde ne aranıyor: iki niceliği de bölen bir parça mı, yoksa ikisinin de katı olan bir buluşma mı?' }))
      return
    }
    setWrong(null)
    if (questions.every((qq, i) => next[i] === qq.answer)) onSolved(chk.pass())
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-3">
        <Card dark>
          <p className="mb-2 text-[11px] font-black tracking-wide text-pink-300 uppercase">Çözdüğün problemler</p>
          <ul className="space-y-2">
            {rows.map((r) => {
              const L = lists(r)
              return (
                <li key={r.title} className="rounded-xl bg-slate-900/60 p-2.5 ring-1 ring-slate-700">
                  <p className="font-black text-white"><span aria-hidden>{r.emoji}</span> {r.title}: <span className="text-amber-300">{r.text}</span></p>
                  {([['a', r.a, L.a], ['b', r.b, L.b]] as const).map(([k, n, xs]) => (
                    <p key={k} className="mt-1 flex flex-wrap items-center gap-1 text-sm font-bold text-slate-300">
                      <span className="w-9 shrink-0 text-right font-black text-slate-100">{n}:</span>
                      {xs.map((x) => (
                        <span key={x} className={`rounded-md px-1.5 py-0.5 tabular-nums ${x === r.answer ? 'bg-amber-300 font-black text-amber-950' : L.common.includes(x) ? 'bg-emerald-600 text-white' : 'bg-slate-700'}`}>{x}</span>
                      ))}
                      {L.more && <span className="text-slate-400">…</span>}
                    </p>
                  ))}
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-xs font-bold text-slate-400"><span className="rounded bg-emerald-600 px-1.5 text-white">yeşil</span> iki listede de olanlar · <span className="rounded bg-amber-300 px-1.5 text-amber-950">sarı</span> senin bulduğun cevap</p>
        </Card>
        {compare}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <Prompt step="Ortak yapı">{reveal}</Prompt>
        <Card dark>
          <p className="mb-2 text-[11px] font-black tracking-wide text-pink-300 uppercase">İpucu kelimeler</p>
          <div className="flex flex-wrap gap-1.5">
            {clues.map((c) => <span key={c} className="chip bg-sky-500/20 px-2.5 py-1 text-sm text-sky-100 ring-1 ring-sky-500/50">“{c}”</span>)}
          </div>
        </Card>
        {questions.map((q, qi) => (
          <Card dark key={q.prompt}>
            <p className="mb-2 font-extrabold">{q.prompt}</p>
            <Choices cols={q.options.length > 2 ? 1 : 2} options={q.options.map((o) => ({ id: o.id, label: o.label }))} value={picks[qi] ?? null} onPick={(id) => pick(qi, id)} disabled={solved} />
          </Card>
        ))}
        {wrong && <Nudge key={wrong.key} question={wrong.text} />}
        {solved && footer}
      </div>
    </div>
  )
}
