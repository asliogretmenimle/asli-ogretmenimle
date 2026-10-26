import { useState } from 'react'
import { ArrowRight, Minus, Plus } from 'lucide-react'
import { MathText } from '../../../components/MathText'
import { Nudge } from '../../kit2'
import { useTracker } from '../../../lib/trackerContext'
import { sfx } from '../../../lib/feedback'
import { FinalAnswer } from './FinalAnswer'
import type { BuildResult } from './ChipsBuilder'
import { fmtN, fmtP, r6, same, type Problem } from './problems'
import { Trail, useTheme } from './ui'

/**
 * Yuvarla ve düzelt (telafi) / sabit fark:
 *  1) Hangi sayıyı “kolay” bir sayıya çevireceğini seç ve kaydır (49 → 50).
 *  2) Sonucu nasıl düzelteceğine karar ver (1 çıkar? 1 ekle? hiç?).
 *  3) Kolaylaşan işlemi zihinden hesapla.
 */
type Which = 0 | 1 | 'both'

export function RoundBuilder({ p, onDone }: { p: Problem; onDone: (r: BuildResult) => void }) {
  const t = useTheme()
  const track = useTracker()
  const isSub = p.kind === 'sub'
  const isMul = p.kind === 'mul'
  const vals = isSub ? [p.terms[0], -p.terms[1]] : [p.terms[0], p.terms[1]]
  const [which, setWhich] = useState<Which | null>(null)
  const [d, setD] = useState(0)
  const [stage, setStage] = useState<'adjust' | 'fix' | 'final'>('adjust')
  const [fixMiss, setFixMiss] = useState(false)
  const [nudge, setNudge] = useState<{ q: string; mis?: string } | null>(null)
  const [chosen, setChosen] = useState<number | null>(null)

  const nv = vals.map((v, i) => (which === 'both' || which === i ? r6(v + d) : v))
  const exprOf = (vs: number[]) => (isSub ? `${fmtN(vs[0])} − ${fmtP(vs[1])}` : isMul ? `${fmtN(vs[0])} ${p.times} ${fmtP(vs[1])}` : `${fmtN(vs[0])} + ${fmtP(vs[1])}`)
  const newExpr = exprOf(nv)
  const newRes = isSub ? nv[0] - nv[1] : isMul ? nv[0] * nv[1] : nv[0] + nv[1]
  const fix = r6(p.answer - newRes)
  const finalExpr = same(fix, 0) ? newExpr : `${newExpr} ${fix > 0 ? '+' : '−'} ${fmtN(Math.abs(fix))}`

  if (which === null) {
    const opts: { w: Which; title: string; sub: string }[] = vals.map((v, i) => ({ w: i as 0 | 1, title: `${fmtN(v)} sayısını değiştir`, sub: 'Kolay bir sayıya yuvarla, sonra sonucu düzelt.' }))
    if (isSub) opts.push({ w: 'both', title: 'İki sayıyı birlikte kaydır', sub: 'İkisine de aynı sayıyı ekle ya da çıkar.' })
    return (
      <div className={`grid gap-2 ${opts.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {opts.map((o) => (
          <button key={String(o.w)} type="button" onClick={() => { setWhich(o.w); setD(0) }} className={`min-h-20 rounded-2xl p-4 text-left transition active:scale-[.98] ${t.chip}`}>
            <span className="block text-lg font-black">{o.title}</span>
            <span className={`block text-sm font-bold ${t.muted}`}>{o.sub}</span>
          </button>
        ))}
      </div>
    )
  }

  const base = which === 'both' ? vals[1] : vals[which]
  const deltas = [p.step, p.step * 10, p.step * 100].filter((x) => x <= Math.max(Math.abs(base), 1) * 0.6 || x === p.step).slice(0, 3)

  // seçenekler: her biri sonuca uygulanacak düzeltmeyi temsil eder
  type Opt = { label: string; v: number }
  let opts: Opt[] = []
  if (which === 'both') {
    opts = [{ label: 'Fark aynı kaldı', v: 0 }, { label: `${fmtN(Math.abs(d))} arttı`, v: 1 }, { label: `${fmtN(Math.abs(d))} azaldı`, v: -1 }]
  } else if (isMul) {
    const other = vals[which === 0 ? 1 : 0]
    const big = Math.abs(r6(d * other))
    opts = [{ label: `${fmtN(big)} çıkar`, v: -big }, { label: `${fmtN(big)} ekle`, v: big }, { label: `${fmtN(Math.abs(d))} ${fix < 0 ? 'çıkar' : 'ekle'}`, v: fix < 0 ? -Math.abs(d) : Math.abs(d) }]
  } else {
    const m = Math.abs(d)
    opts = [{ label: `${fmtN(m)} çıkar`, v: -m }, { label: `${fmtN(m)} ekle`, v: m }, { label: 'Düzeltme gerekmez', v: 0 }]
  }
  const isRight = (o: Opt) => (which === 'both' ? o.v === 0 : same(o.v, fix))

  const pickFix = (o: Opt, i: number) => {
    setChosen(i)
    if (isRight(o)) {
      track.attempt(true)
      sfx.ok()
      setNudge(null)
      setStage('final')
      return
    }
    track.attempt(false)
    sfx.bad()
    setFixMiss(true)
    const changed = which === 'both' ? 0 : vals[which]
    const nn = which === 'both' ? 0 : nv[which]
    if (which === 'both') setNudge({ q: `Sayı doğrusunda iki sayıyı da aynı kadar kaydırınca aralarındaki uzaklık değişir mi? Bir cetvelin üzerinde düşün.`, mis: 'Sabit fark ilkesini kullanamadı' })
    else if (isMul) setNudge({ q: `${fmtN(nn)} ${p.times} ${fmtP(vals[which === 0 ? 1 : 0])} işleminde kaç tane fazladan (ya da eksik) ${fmtN(vals[which === 0 ? 1 : 0])} var? O kadar düzeltmelisin.`, mis: o.v !== 0 && Math.abs(o.v) === Math.abs(d) ? 'Çarpmada telafide yalnız değişen miktarı düzeltti' : undefined })
    else if (isSub && which === 1) setNudge({ q: `${fmtN(changed)} yerine ${fmtN(nn)} çıkardın: ${nn > changed ? 'gerekenden fazla' : 'gerekenden az'} çıkardın. Kalan çok mu oldu, az mı?`, mis: 'Çıkarmada telafinin yönünü karıştırdı' })
    else setNudge({ q: `${fmtN(changed)} yerine ${fmtN(nn)} kullandın. Sonuç olması gerekenden büyük mü çıktı, küçük mü?` })
  }

  const trail = [p.text]
  if (d) trail.push(`${p.text} → ${newExpr}`)
  if (stage === 'final') trail.push(same(fix, 0) ? `${p.text} = ${newExpr}` : `${p.text} = ${finalExpr}`)

  return (
    <div>
      {stage === 'adjust' && (
        <div className={`rounded-3xl p-3 sm:p-4 ${t.soft}`}>
          <p className="mb-3 text-center text-3xl font-black tabular-nums sm:text-4xl">
            <MathText text={exprOf(vals)} /> <ArrowRight className="mx-1 inline" size={28} /> <span className={t.dark ? 'text-cyan-300' : 'text-rose-600'}><MathText text={newExpr} /></span>
          </p>
          <p className={`mb-2 text-center text-sm font-bold ${t.muted}`}>
            {which === 'both' ? 'İki sayıyı da aynı miktarda kaydır: hangisi kolay bir sayı olsun?' : `${fmtN(base)} sayısını kolay bir sayıya kaydır.`} {d !== 0 && <b className={t.strong}>({d > 0 ? '+' : '−'}{fmtN(Math.abs(d))})</b>}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[...deltas].reverse().map((x) => (
              <button key={`m${x}`} type="button" onClick={() => setD(r6(d - x))} className={`inline-flex min-h-12 min-w-14 items-center justify-center gap-0.5 rounded-xl px-2 font-black ${t.chip}`} aria-label={`${fmtN(x)} azalt`}><Minus size={14} />{fmtN(x)}</button>
            ))}
            {deltas.map((x) => (
              <button key={`p${x}`} type="button" onClick={() => setD(r6(d + x))} className={`inline-flex min-h-12 min-w-14 items-center justify-center gap-0.5 rounded-xl px-2 font-black ${t.chip}`} aria-label={`${fmtN(x)} artır`}><Plus size={14} />{fmtN(x)}</button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => { setWhich(null); setD(0) }} className={`min-h-12 rounded-2xl px-4 font-extrabold ${t.chip}`}>Başka sayı seç</button>
            <button type="button" disabled={d === 0} onClick={() => { setStage('fix'); setChosen(null) }} className="btn-primary min-h-12">Devam<ArrowRight size={18} /></button>
          </div>
        </div>
      )}

      {stage !== 'adjust' && (
        <div className={`rounded-3xl p-3 sm:p-4 ${t.soft}`}>
          <p className="text-center text-lg font-black">
            {which === 'both'
              ? <>İki sayıyı da {fmtN(Math.abs(d))} {d > 0 ? 'artırdın' : 'azalttın'}: <MathText text={newExpr} />. Fark nasıl değişti?</>
              : <>{fmtN(vals[which as number])} yerine {fmtN(nv[which as number])} kullandın: <MathText text={newExpr} />. Sonucu nasıl düzeltmelisin?</>}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {opts.map((o, i) => (
              <button key={o.label} type="button" disabled={stage === 'final'} onClick={() => pickFix(o, i)} className={`min-h-14 rounded-2xl px-4 text-lg font-black transition ${stage === 'final' && isRight(o) ? 'bg-emerald-500 text-white ring-2 ring-emerald-300' : chosen === i && !isRight(o) ? (t.dark ? 'bg-amber-500/20 text-amber-200 ring-2 ring-amber-400' : 'bg-amber-50 text-amber-900 ring-2 ring-amber-300') : t.chip}`}>
                {o.label}
              </button>
            ))}
          </div>
          {nudge && <div className="mx-auto max-w-lg"><Nudge key={nudge.q} question={nudge.q} misconception={nudge.mis} tool={isMul ? 'dizilim' : 'numberline'} onClose={() => setNudge(null)} /></div>}
          {stage === 'fix' && <div className="mt-2 text-center"><button type="button" onClick={() => { setStage('adjust'); setNudge(null) }} className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${t.chip}`}>Kaydırmayı değiştir</button></div>}
        </div>
      )}

      <Trail lines={trail} className="mt-3" />
      {stage === 'final' && (
        <FinalAnswer p={p} expr={finalExpr} expected={p.answer} onCorrect={(firstTry) => onDone({ key: which === 'both' ? 'sabit' : 'telafi', trail: [...trail, `${finalExpr} = ${fmtN(p.answer)}`], firstTry: firstTry && !fixMiss })} />
      )}
    </div>
  )
}
