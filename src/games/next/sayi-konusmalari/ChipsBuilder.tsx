import { useRef, useState } from 'react'
import { Combine, Scissors, Undo2, X } from 'lucide-react'
import type { Grade } from '../../../data/types'
import { MathText } from '../../../components/MathText'
import { FinalAnswer } from './FinalAnswer'
import { fmtN, fmtP, isInt, powText, r6, same, type BuilderKind, type Pow, type Problem, type StratKey } from './problems'
import { Trail, useTheme } from './ui'

/**
 * Parçala ve birleştir: sayılar kart olur.
 *  - Bir karta dokun → “Parçala”: toplamada iki parçaya (sürüklenen ayraç), çarpmada çarpanlara ayır.
 *  - İki karta dokun → “Birleştir”: kolay olanları önce birleştir. Son iki kart kalınca sonucu öğrenci bulur.
 * Strateji, hamlelerden çıkarılır (10’a tamamlama, sıfır çifti, basamak, birleşme, yarılama…).
 */

type Chip = { id: number; v: number; pow?: Pow; from: 'o' | 's' | 'c' }
type Move = { t: 'split'; v: number; parts: [number, number]; pow?: boolean } | { t: 'comb'; a: Chip; b: Chip; r: number; pow?: 'us' | 'ortak' }

export interface BuildResult {
  builder?: BuilderKind
  key: StratKey
  trail: string[]
  firstTry: boolean
}

const isPow10 = (v: number) => [10, 100, 1000, 10000].includes(Math.abs(r6(v)))

function chipLabel(c: Chip, i: number, prod: boolean, times: string) {
  const base = c.pow && c.pow.exp > 1 ? powText(c.pow) : fmtN(c.v)
  if (i === 0) return base
  if (prod) return `${times} ${c.pow && c.pow.exp > 1 ? base : fmtP(c.v)}`
  return c.v < 0 ? `− ${fmtN(-c.v)}` : `+ ${base}`
}

function exprOf(cs: Chip[], prod: boolean, times: string) {
  return cs.map((c, i) => chipLabel(c, i, prod, times)).join(' ')
}

function factorPairs(c: Chip): { a: number; b: number; pa?: Pow; pb?: Pow }[] {
  if (c.pow && c.pow.exp >= 2) {
    const { base, exp } = c.pow
    return Array.from({ length: Math.floor(exp / 2) }, (_, k) => k + 1).map((i) => ({ a: base ** i, b: base ** (exp - i), pa: { base, exp: i }, pb: { base, exp: exp - i } }))
  }
  if (!isInt(c.v)) return []
  const n = Math.abs(c.v)
  const s = Math.sign(c.v)
  const out: { a: number; b: number }[] = []
  for (let d = 2; d * d <= n; d++) if (n % d === 0) out.push({ a: s * d, b: n / d })
  return out
}

function classify(moves: Move[], prod: boolean, isPowProblem: boolean): StratKey {
  const splits = moves.filter((m) => m.t === 'split')
  const combs = moves.filter((m): m is Extract<Move, { t: 'comb' }> => m.t === 'comb')
  if (!splits.length && combs.length === 1 && !combs[0].pow) return isPowProblem ? 'deger' : 'dogrudan'
  if (!prod) {
    for (const m of combs) {
      const [u, w] = [m.a.v, m.b.v]
      if (same(m.r, 0)) return 'sifir'
      if (same(u, w)) return 'ikiz'
      const intRound = isInt(u) && isInt(w) && Math.abs(m.r) >= 10 && m.r % 10 === 0 && !(u % 10 === 0 && w % 10 === 0)
      const decRound = isInt(m.r) && !(isInt(u) && isInt(w))
      if (intRound || decRound) return 'tamamla'
      if (splits.length && ((isInt(u) && isInt(w) && u % 10 === 0 && w % 10 === 0 && u && w) || (isInt(u) && isInt(w) && splits.some((s) => !isInt(s.v))))) return 'basamak'
      break
    }
    return splits.length ? 'parcala' : 'dogrudan'
  }
  for (const m of combs) {
    if (m.pow === 'us') return 'us'
    if (m.pow === 'ortak') return 'ortakus'
    if (isPow10(m.r) && !isPow10(m.a.v) && !isPow10(m.b.v)) return 'birlesme'
    const two = (c: Chip) => c.from === 's' && Math.abs(c.v) === 2
    if (two(m.a) !== two(m.b) && splits.length) return 'yarila'
    break
  }
  if (!splits.length) return isPowProblem ? 'deger' : 'dogrudan'
  return 'grupla'
}

export function ChipsBuilder({ p, grade, onDone }: { p: Problem; grade: Grade; onDone: (r: BuildResult) => void }) {
  const t = useTheme()
  const prod = p.kind === 'mul' || p.kind === 'pow'
  const idRef = useRef(10)
  const [chips, setChips] = useState<Chip[]>(() => p.terms.map((v, i) => ({ id: i, v, pow: p.pows?.[i], from: 'o' })))
  const [sel, setSel] = useState<number[]>([])
  const [hist, setHist] = useState<{ chips: Chip[]; moves: Move[]; trail: string[] }[]>([])
  const [moves, setMoves] = useState<Move[]>([])
  const [trail, setTrail] = useState<string[]>([p.text])
  const [split, setSplit] = useState<{ id: number; part: number } | null>(null)
  const [final, setFinal] = useState(false)
  const [msg, setMsg] = useState('')

  const commit = (next: Chip[], mv: Move) => {
    setHist([...hist, { chips, moves, trail }])
    setChips(next)
    setMoves([...moves, mv])
    setTrail([...trail, exprOf(next, prod, p.times)])
    setSel([])
    setSplit(null)
    setMsg('')
  }
  const undo = () => {
    const h = hist[hist.length - 1]
    if (!h) return
    setChips(h.chips)
    setMoves(h.moves)
    setTrail(h.trail)
    setHist(hist.slice(0, -1))
    setSel([])
    setSplit(null)
    setFinal(false)
  }

  const tap = (id: number) => {
    if (final) return
    setSplit(null)
    setMsg('')
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 2 ? [s[1], id] : [...s, id]))
  }

  const selected = sel.map((id) => chips.find((c) => c.id === id)!).filter(Boolean)
  const sorted = [...selected].sort((a, b) => chips.indexOf(a) - chips.indexOf(b))

  const combine = () => {
    if (sorted.length !== 2) return
    const [a, b] = sorted
    const powRule = !!(a.pow && b.pow && (a.pow.base === b.pow.base || (a.pow.exp === b.pow.exp && a.pow.exp > 1)))
    if (chips.length === 2 && !powRule) {
      setFinal(true)
      return
    }
    let pow: Pow | undefined
    let kind: 'us' | 'ortak' | undefined
    if (a.pow && b.pow && a.pow.base === b.pow.base) {
      pow = { base: a.pow.base, exp: a.pow.exp + b.pow.exp }
      kind = 'us'
    } else if (a.pow && b.pow && a.pow.exp === b.pow.exp && a.pow.exp > 1) {
      pow = { base: a.pow.base * b.pow.base, exp: a.pow.exp }
      kind = 'ortak'
    } else if (a.pow && b.pow) {
      const v = a.v * b.v
      pow = { base: v, exp: 1 }
    }
    const r = prod ? r6(a.v * b.v) : r6(a.v + b.v)
    const nc: Chip = { id: idRef.current++, v: r, pow, from: 'c' }
    const ia = chips.indexOf(a)
    const next = chips.filter((c) => c !== a && c !== b)
    next.splice(ia, 0, nc)
    commit(next, { t: 'comb', a, b, r, pow: kind })
    if (next.length === 1) setFinal(true)
  }

  const openSplit = () => {
    const c = selected[0]
    if (!c) return
    if (prod) {
      if (!factorPairs(c).length) {
        setMsg(c.pow && c.pow.exp === 1 ? `${fmtN(c.v)} asal bir sayı; çarpanlarına ayrılamaz. Başka bir kartla birleştirebilirsin.` : !isInt(c.v) ? `${fmtN(c.v)} sayısını bölmek yerine başka bir kartla birleştirmeyi dene.` : `${fmtN(c.v)} asal bir sayı; çarpanlarına ayrılamaz.`)
        return
      }
      setSplit({ id: c.id, part: 0 })
      return
    }
    if (Math.abs(c.v) < 2 * p.step - 1e-9) {
      setMsg('Bu sayı parçalanamayacak kadar küçük.')
      return
    }
    const mag = Math.abs(c.v)
    setSplit({ id: c.id, part: Math.max(p.step, r6(Math.round(mag / 2 / p.step) * p.step)) })
  }

  const doSplit = (a: number, b: number, pa?: Pow, pb?: Pow) => {
    const c = chips.find((x) => x.id === split!.id)!
    const i = chips.indexOf(c)
    const next = [...chips]
    next.splice(i, 1, { id: idRef.current++, v: a, pow: pa, from: 's' }, { id: idRef.current++, v: b, pow: pb, from: 's' })
    commit(next, { t: 'split', v: c.v, parts: [a, b], pow: !!pa })
  }

  const splitChip = split ? chips.find((c) => c.id === split.id) : undefined
  const tile = (c: Chip, i: number) => {
    const on = sel.includes(c.id)
    const tone = c.from === 'o' ? (t.dark ? 'bg-slate-700 text-white ring-slate-500' : 'bg-white text-ink ring-amber-300') : c.from === 's' ? (t.dark ? 'bg-violet-500/25 text-violet-100 ring-violet-400' : 'bg-amber-100 text-amber-950 ring-amber-400') : t.dark ? 'bg-emerald-500/20 text-emerald-100 ring-emerald-400' : 'bg-emerald-50 text-emerald-900 ring-emerald-400'
    const showDots = grade <= 2 && !prod && isInt(c.v) && Math.abs(c.v) <= 20 && c.v > 0
    return (
      <button
        key={c.id}
        type="button"
        onClick={() => tap(c.id)}
        aria-pressed={on}
        aria-label={`${chipLabel(c, i, prod, p.times)} kartı${on ? ', seçili' : ''}`}
        className={`relative flex min-h-16 min-w-16 flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-3xl font-black tabular-nums ring-2 transition animate-pop sm:text-4xl ${tone} ${on ? (t.dark ? '-translate-y-1 !ring-4 !ring-cyan-300 shadow-[0_0_0_6px_rgba(34,211,238,.18)]' : '-translate-y-1 !ring-4 !ring-rose-400 shadow-[0_8px_18px_rgba(225,29,72,.18)]') : ''}`}
      >
        <MathText text={chipLabel(c, i, prod, p.times)} />
        {showDots && (
          <span className="flex max-w-[10.5rem] flex-wrap justify-center gap-[3px]" aria-hidden>
            {Array.from({ length: c.v }, (_, k) => <span key={k} className={`size-2 rounded-full ${k % 10 < 5 ? 'bg-rose-400' : 'bg-sky-400'} ${k % 5 === 4 ? 'mr-1' : ''}`} />)}
          </span>
        )}
      </button>
    )
  }

  const finalExpr = chips.length === 1 ? chipLabel(chips[0], 0, prod, p.times) : exprOf(sorted, prod, p.times)
  const hint = final ? '' : sel.length === 0 ? 'Bir karta dokun: parçala. İki karta dokun: birleştir.' : sel.length === 1 ? 'Bu kartı parçalayabilir ya da bir kart daha seçip birleştirebilirsin.' : chips.length === 2 ? 'Son iki kart! Sonucu sen bul.' : 'Bu ikisini birleştirmek işini kolaylaştırır mı?'

  return (
    <div>
      <div className={`rounded-3xl p-3 sm:p-4 ${t.soft}`}>
        <div className="flex min-h-24 flex-wrap items-center justify-center gap-2 sm:gap-3">{chips.map(tile)}</div>
        <p className={`mt-2 text-center text-sm font-bold ${t.muted}`}>{hint}</p>
        {!final && (
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {sel.length === 1 && (
              <button type="button" onClick={openSplit} className={`inline-flex min-h-12 items-center gap-1.5 rounded-2xl px-4 font-extrabold ${t.chip}`}>
                <Scissors size={18} />{prod ? 'Çarpanlara ayır' : 'Parçala'}
              </button>
            )}
            {sel.length === 2 && (
              <button type="button" onClick={combine} className="btn-primary min-h-12">
                <Combine size={18} />{chips.length === 2 ? 'Sonucu bul' : <>Birleştir: <MathText text={exprOf(sorted, prod, p.times)} /></>}
              </button>
            )}
            {hist.length > 0 && (
              <button type="button" onClick={undo} className={`inline-flex min-h-12 items-center gap-1.5 rounded-2xl px-4 font-extrabold ${t.chip}`}>
                <Undo2 size={18} />Geri al
              </button>
            )}
          </div>
        )}
        {msg && <p className={`mt-2 text-center text-sm font-extrabold ${t.dark ? 'text-amber-300' : 'text-amber-700'}`}>{msg}</p>}
      </div>

      {splitChip && split && (
        <div className={`mt-3 rounded-3xl p-3 animate-fade-up sm:p-4 ${t.card}`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-black">{prod ? <><MathText text={splitChip.pow && splitChip.pow.exp > 1 ? powText(splitChip.pow) : fmtN(splitChip.v)} /> sayısını nasıl çarpanlara ayırırsın?</> : <>{fmtN(Math.abs(splitChip.v))} sayısını iki parçaya ayır</>}</p>
            <button type="button" onClick={() => setSplit(null)} className={`grid size-11 place-items-center rounded-xl ${t.chip}`} aria-label="Vazgeç"><X size={18} /></button>
          </div>
          {prod ? (
            <div className="flex flex-wrap justify-center gap-2">
              {factorPairs(splitChip).map((f) => (
                <button key={`${f.a}-${f.b}`} type="button" onClick={() => doSplit(f.a, f.b, f.pa, f.pb)} className={`min-h-14 rounded-2xl px-4 text-2xl font-black ${t.chip}`}>
                  <MathText text={f.pa ? `${powText(f.pa)}·${powText(f.pb!)}`.replace(/\^\{1\}/g, '') : `${fmtN(f.a)} ${p.times} ${fmtN(f.b)}`} />
                </button>
              ))}
            </div>
          ) : (
            <SumSplitter v={splitChip.v} step={p.step} part={split.part} onPart={(x) => setSplit({ ...split, part: x })} onOk={() => { const s = Math.sign(splitChip.v); doSplit(r6(s * split.part), r6(splitChip.v - s * split.part)) }} />
          )}
        </div>
      )}

      <Trail lines={trail} className="mt-3" />

      {final && (sorted.length === 2 || chips.length === 1) && (
        <FinalAnswer
          p={p}
          expr={finalExpr}
          expected={p.answer}
          onCorrect={(firstTry) => {
            const all: Move[] = chips.length === 1 ? moves : [...moves, { t: 'comb', a: sorted[0], b: sorted[1], r: p.answer }]
            onDone({ key: classify(all, prod, p.kind === 'pow'), trail: [...trail, `${finalExpr} = ${fmtN(p.answer)}`], firstTry })
          }}
        />
      )}
      {final && chips.length > 1 && (
        <div className="mt-2 text-center">
          <button type="button" onClick={() => setFinal(false)} className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${t.chip}`}>Kartlara dön</button>
        </div>
      )}
    </div>
  )
}

/** Toplamada parçalama: sürüklenen ayraçlı şerit + ince ayar düğmeleri */
function SumSplitter({ v, step, part, onPart, onOk }: { v: number; step: number; part: number; onPart: (x: number) => void; onOk: () => void }) {
  const t = useTheme()
  const mag = Math.abs(v)
  const neg = v < 0
  const barRef = useRef<HTMLDivElement>(null)
  const set = (x: number) => onPart(r6(Math.min(mag - step, Math.max(step, Math.round(x / step) * step))))
  const fromPointer = (cx: number) => {
    const r = barRef.current?.getBoundingClientRect()
    if (!r) return
    set(((cx - r.left) / r.width) * mag)
  }
  const deltas = [step, step * 10, step * 100].filter((d) => d < mag / 1.5).slice(0, mag >= 200 * step ? 3 : 2)
  const rest = r6(mag - part)
  const sg = neg ? '−' : ''
  return (
    <div>
      <p className="mb-3 text-center text-3xl font-black tabular-nums sm:text-4xl">
        {sg}{fmtN(mag)} = <span className={t.dark ? 'text-violet-300' : 'text-rose-600'}>{sg}{fmtN(part)}</span> {neg ? '−' : '+'} <span className={t.dark ? 'text-cyan-300' : 'text-sky-600'}>{fmtN(rest)}</span>
      </p>
      <div
        ref={barRef}
        data-handle
        className="relative mx-auto h-16 w-full max-w-xl cursor-ew-resize touch-none select-none overflow-hidden rounded-2xl ring-2 ring-black/10"
        onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); fromPointer(e.clientX) }}
        onPointerMove={(e) => e.buttons && fromPointer(e.clientX)}
        role="slider"
        aria-label="Birinci parça"
        aria-valuemin={step}
        aria-valuemax={mag - step}
        aria-valuenow={part}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') set(part + step); if (e.key === 'ArrowLeft') set(part - step) }}
      >
        <div className={`absolute inset-y-0 left-0 grid place-items-center text-xl font-black text-white ${t.dark ? 'bg-violet-500' : 'bg-rose-500'}`} style={{ width: `${(part / mag) * 100}%` }}>{part / mag > 0.12 ? fmtN(part) : ''}</div>
        <div className={`absolute inset-y-0 right-0 grid place-items-center text-xl font-black text-white ${t.dark ? 'bg-cyan-600' : 'bg-sky-500'}`} style={{ width: `${(rest / mag) * 100}%` }}>{rest / mag > 0.12 ? fmtN(rest) : ''}</div>
        <div className="absolute inset-y-0 w-2 -translate-x-1 bg-white shadow-[0_0_0_2px_rgba(0,0,0,.25)]" style={{ left: `${(part / mag) * 100}%` }}>
          <span className="absolute top-1/2 left-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-xs font-black text-slate-700 shadow">⇔</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {[...deltas].reverse().map((d) => (
          <button key={`m${d}`} type="button" onClick={() => set(part - d)} className={`min-h-12 min-w-14 rounded-xl px-2 font-black ${t.chip}`} aria-label={`Birinci parçayı ${fmtN(d)} azalt`}>−{fmtN(d)}</button>
        ))}
        {deltas.map((d) => (
          <button key={`p${d}`} type="button" onClick={() => set(part + d)} className={`min-h-12 min-w-14 rounded-xl px-2 font-black ${t.chip}`} aria-label={`Birinci parçayı ${fmtN(d)} artır`}>+{fmtN(d)}</button>
        ))}
        <button type="button" onClick={onOk} className="btn-primary min-h-12"><Scissors size={18} />Böl</button>
      </div>
    </div>
  )
}
