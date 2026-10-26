import { useMemo, useRef, useState } from 'react'
import { Check, Dices, FlaskConical, GripVertical, Minus, Plus, Quote, X } from 'lucide-react'
import { MathText } from '../../components/MathText'
import { StrategyPicker, useAge, useSolutions } from '../../games/kit2'
import { ActivityLayout, DoneNote, hitZone, shuffle, useNudge, useSession, useTileDrag } from '../hizli-noktalar/kit'
import type { InteractionProps } from '../types'
import { claimsFor, nf, type Claim, type Opt, type Test, type Truth } from './claims'
import { AnglesView, FracBars, RectBuilder, TriangleView } from './viz'

/**
 * 69. Her Zaman mı, Bazen mi? — Van de Walle: iddiaları sınama, örnek ve karşı örnekle gerekçelendirme.
 * Akış (her iddia):
 *  1) Deney sandığında örnek kur (sayı adımlayıcıları, özel sayı düğmeleri, zar; dikdörtgeni köşesinden sürükle…)
 *  2) Sonucu kanıt panosuna koy: “✓ İddia doğru” (örnek) ya da “✗ İddia yanlış” (karşı örnek) — sürükle ya da dokun.
 *     Öğrenci örneğin iddiaya uyup uymadığına KENDİ karar verir; yanlış yerleştirmede düşündüren soru.
 *  3) Karar: Her zaman / Bazen / Asla. Kanıt şartı: bir örnek + bir karşı örnek, ya da (karşı örnek yoksa) en az 3 örnek.
 *  4) “Her zaman / asla” için genel bir neden seçilir (örnekler kanıt değildir); “bazen” için iddianın doğru olduğu koşul seçilir.
 * 3–4: tek/çift, bölünebilme, kesir şeritleri, dikdörtgen · 5–6: kesir, alan-çevre, işlem önceliği, asal, ondalık
 * 7–8: tam sayılar, mutlak değer, cebirsel ifadeler, kareler, kökler, üsler, üçgen eşitsizliği.
 */

type Phase = 'test' | 'why' | 'fix'
interface Ev { key: string; text: string }
const TRUTH_LABEL: Record<Truth, string> = { always: 'Her zaman doğru', sometimes: 'Bazen doğru', never: 'Asla doğru değil' }
const TRUTH_TONE: Record<Truth, string> = { always: '#16a34a', sometimes: '#d97706', never: '#dc2626' }
const MIS_HYP = 'İddianın koşulunu (hangi sayılardan söz ettiğini) gözden kaçırdı'
const MIS_GEN = 'Birkaç örnekten genelleme yaptı; karşı örnek aramadı'

function pickClaims(grade: InteractionProps['grade']): Claim[] {
  const all = shuffle(claimsFor(grade))
  const by = (t: Truth) => all.filter((c) => c.truth === t)
  const out = [...by('sometimes').slice(0, 2), ...by('always').slice(0, 1), ...by('never').slice(0, 1)]
  for (const c of all) if (out.length < 5 && !out.includes(c)) out.push(c)
  return shuffle(out)
}

const randOn = (min: number, max: number, step: number) => {
  const n = Math.round((max - min) / step)
  return Math.round((min + Math.floor(Math.random() * (n + 1)) * step) * 1000) / 1000
}

export default function HerZamanMi({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => pickClaims(grade), [grade])
  const S = useSession(tasks.length)
  const C = tasks[S.idx]
  const age = useAge(grade)
  const big = age.big
  const dark = age.tier === 'atolye'
  const { nudge, show, clear } = useNudge()
  const sol = useSolutions()

  const [vals, setVals] = useState<number[]>(() => C.vars.map((x) => x.init))
  const [ex, setEx] = useState<Ev[]>([])
  const [cx, setCx] = useState<Ev[]>([])
  const [phase, setPhase] = useState<Phase>('test')
  const [verdict, setVerdict] = useState<Truth | null>(null)
  const [wrongPicks, setWrongPicks] = useState<string[]>([])
  const [hintI, setHintI] = useState(0)
  const logged = useRef<Set<string>>(new Set())
  const zones = useRef(new Map<'ex' | 'cx', HTMLElement | null>())
  const stats = useRef({ cx: 0, firstVerdict: 0 })
  const verdictFails = useRef(0)

  const test: Test = C.run(vals)
  const key = vals.join('|')
  const reasons = useMemo(() => shuffle(C.reasons ?? []), [C])
  const fixes = useMemo(() => shuffle(C.fix ?? []), [C])

  const logMis = (m: string | undefined) => {
    if (!m || logged.current.has(m)) return undefined
    logged.current.add(m)
    return m
  }

  const place = (slot: 'ex' | 'cx') => {
    if (phase !== 'test') return
    if (ex.some((e) => e.key === key) || cx.some((e) => e.key === key)) {
      show('Bu örneği zaten panoya koydun. Farklı bir örnek dene!')
      return
    }
    if (test.ok === null) {
      S.attempt(false)
      show(`Bu örnek iddianın konusu değil: ${test.fact}`, { misc: logMis(MIS_HYP) })
      return
    }
    const want = slot === 'ex'
    if (test.ok !== want) {
      S.attempt(false)
      show(`${test.fact} ${want ? 'Bu örnekte iddia gerçekten doğru mu?' : 'Bu örnekte iddia yanlış mı, yoksa doğru mu?'}`)
      return
    }
    S.attempt(true)
    const ev = { key, text: test.text }
    if (slot === 'ex') {
      const n = [...ex, ev]
      setEx(n)
      if (n.length === 1 && !cx.length) show(`Güzel, bir örnek buldun: ${test.fact} Şimdi iddiayı yanlış çıkaran bir örnek (karşı örnek) arayabilir misin?`, { tone: 'ok' })
      else if (n.length === 3 && !cx.length) show('Üç örnekte de iddia doğru çıktı. Karşı örnek bulamıyorsan belki de yoktur… Karar verebilirsin.', { tone: 'ok' })
      else clear()
    } else {
      const n = [...cx, ev]
      setCx(n)
      if (n.length === 1) {
        stats.current.cx++
        sol.add(`${C.id}:cx`, 'Karşı örnek')
        show(`Karşı örnek buldun! ${test.fact} Tek bir karşı örnek, iddianın “her zaman” doğru olmadığını gösterir.`, { tone: 'ok' })
      } else clear()
    }
  }

  const remove = (slot: 'ex' | 'cx', k: string) => {
    if (phase !== 'test') return
    if (slot === 'ex') setEx(ex.filter((e) => e.key !== k))
    else setCx(cx.filter((e) => e.key !== k))
  }

  const canDecide = (ex.length > 0 && cx.length > 0) || ex.length >= 3 || cx.length >= 3

  const decide = (t: Truth) => {
    if (!canDecide || phase !== 'test') return
    const both = ex.length > 0 && cx.length > 0
    const fail = (q: string, mis?: string) => {
      S.attempt(false)
      verdictFails.current++
      setWrongPicks((w) => [...w, t])
      show(q, { misc: logMis(mis) })
    }
    if (both) {
      if (t !== 'sometimes') return fail(`Panoda hem iddiaya uyan hem de uymayan bir örnek var. Bu durumda iddia “${TRUTH_LABEL[t].toLowerCase()}” olabilir mi?`, 'Karşı örneğe rağmen genel bir yargıda bulundu')
    } else if (ex.length) {
      if (t === 'never') return fail('Bütün örneklerinde iddia doğru çıktı. “Asla doğru değil” diyebilir miyiz?')
      if (t === 'sometimes') return fail('“Bazen” dediysen iddianın yanlış çıktığı bir örnek göster: karşı örneği panoya ekle.')
      if (C.truth !== 'always') return fail(`Emin misin? ${C.hint}`, C.mis ?? MIS_GEN)
    } else {
      if (t === 'always') return fail('Bütün örneklerinde iddia yanlış çıktı. “Her zaman doğru” olabilir mi?')
      if (t === 'sometimes') return fail('“Bazen” dediysen iddianın doğru çıktığı bir örnek göster.')
      if (C.truth !== 'never') return fail(`Emin misin? ${C.hint}`, C.mis)
    }
    S.attempt(true)
    if (verdictFails.current === 0) stats.current.firstVerdict++
    setVerdict(t)
    clear()
    if (t === 'sometimes') {
      if (fixes.length) setPhase('fix')
      else S.complete()
    } else if (reasons.length) setPhase('why')
    else S.complete()
  }

  const pickOpt = (o: Opt, kind: 'why' | 'fix') => {
    if (S.done) return
    if (o.ok) {
      S.attempt(true)
      sol.add(`${C.id}:${kind}`, kind === 'why' ? 'Genel gerekçe' : 'Koşul')
      setWrongPicks([])
      S.complete()
      clear()
      return
    }
    S.attempt(false)
    setWrongPicks((w) => [...w, o.t])
    show(o.q ?? 'Bu seçenek her durum için geçerli mi? Bir örnekle sına.', { misc: logMis(o.mis) })
  }

  const hint = () => {
    S.hint()
    if (phase === 'test') {
      const tips = [C.hint, 'Özel sayıları dene: 0, 1, çok büyük sayılar' + (grade >= 6 ? ', ondalık ya da negatif sayılar.' : '.')]
      show(tips[Math.min(hintI, tips.length - 1)])
      setHintI((i) => i + 1)
    } else if (phase === 'why') show('Örnekleri bir kenara bırak: iddianın içindeki sayıların yapısına (tek/çift, çarpan, işaret, parça…) bak. Neden hep böyle olmak zorunda?')
    else show('Karşı örneklerine bak: onları ötekilerden ayıran ne? İddia hangi durumda bozuluyor?')
  }

  const next = () => {
    if (S.last) {
      const n = tasks.length
      onFinish({
        stars: S.stars(),
        summary: `${n} iddiayı sınadın; ${stats.current.cx} karşı örnek buldun ve ${stats.current.firstVerdict} iddiaya ilk kararında doğru sınıflandırdın.`,
        insight:
          grade <= 4
            ? 'Bir iddiayı yanlış çıkarmak için tek bir karşı örnek yeter; ama “her zaman doğru” demek için örnekler yetmez, nedenini açıklamak gerekir.'
            : grade <= 6
              ? 'Karşı örnekler genellikle “özel” sayılarda saklanır: 0, 1, 2, 1’den küçük sayılar… Bir iddia “bazen” doğruysa, hangi koşulda doğru olduğunu söylemek onu düzeltir.'
              : 'Örnekler bir genellemeyi kanıtlamaz, ama tek bir karşı örnek onu çürütür. Cebirsel bir gerekçe (2x + 1, 3(n + 1)…) iddianın neden HER durumda doğru olduğunu gösterir.',
      })
      return
    }
    S.next()
    const nc = tasks[S.idx + 1]
    setVals(nc.vars.map((x) => x.init))
    setEx([])
    setCx([])
    setPhase('test')
    setVerdict(null)
    setWrongPicks([])
    setHintI(0)
    verdictFails.current = 0
    clear()
  }

  const setVar = (i: number, x: number) => {
    const vv = C.vars[i]
    const st = vv.step ?? 1
    const c = Math.max(vv.min, Math.min(vv.max, Math.round(x / st) * st))
    setVals((p) => p.map((y, j) => (j === i ? Math.round(c * 1000) / 1000 : y)))
  }
  const roll = () => {
    for (let t = 0; t < 40; t++) {
      const r = C.vars.map((x) => randOn(x.min, x.max, x.step ?? 1))
      if (C.run(r).ok !== null || t === 39) {
        setVals(r)
        return
      }
    }
  }

  const drag = useTileDrag<string>({
    onDrop: (_k, x, y) => {
      const z = hitZone(zones.current, x, y, 12)
      if (z) place(z)
    },
    ghost: () => <div className="rounded-2xl bg-amber-300 px-4 py-3 text-xl font-black text-amber-950 shadow-xl"><MathText text={test.text} /></div>,
  })

  // ── görünüm ──
  const box = dark ? 'bg-slate-800/80 ring-1 ring-slate-600 text-slate-100' : 'bg-white/90 ring-1 ring-line text-ink'
  const soft = dark ? 'text-slate-300' : 'text-ink-soft'
  const btnH = big ? 'min-h-14' : 'min-h-12'
  const stepBtn = `grid ${big ? 'size-14' : 'size-12'} shrink-0 place-items-center rounded-2xl font-black transition active:scale-95 disabled:opacity-40 ${dark ? 'bg-slate-700 text-white ring-1 ring-slate-500' : 'bg-white text-ink ring-1 ring-line shadow-[0_3px_0_#e7e8f2]'}`
  const locked = phase !== 'test'

  const viz = (() => {
    switch (C.viz) {
      case 'rect':
        return <RectBuilder w={vals[0]} h={vals[1]} maxW={C.vars[0].max} maxH={C.vars[1].max} dark={dark} onChange={(w, h) => !locked && setVals([w, h])} />
      case 'rect2':
        return (
          <div className="grid grid-cols-2 gap-2">
            <RectBuilder w={vals[0]} h={vals[1]} maxW={C.vars[0].max} maxH={C.vars[1].max} u={20} dark={dark} label="Turuncu" onChange={(w, h) => !locked && setVals([w, h, vals[2], vals[3]])} />
            <RectBuilder w={vals[2]} h={vals[3]} maxW={C.vars[2].max} maxH={C.vars[3].max} u={20} color="#3b82f6" dark={dark} label="Mavi" onChange={(w, h) => !locked && setVals([vals[0], vals[1], w, h])} />
          </div>
        )
      case 'tri':
        return C.vars.length === 2 ? <TriangleView a={vals[0]} b={vals[1]} right dark={dark} /> : <TriangleView a={vals[0]} b={vals[1]} c={vals[2]} dark={dark} />
      case 'angles':
        return <AnglesView a={vals[0]} b={vals[1]} dark={dark} />
      case 'frac':
        return C.fracs ? <FracBars fracs={C.fracs(vals)} dark={dark} /> : null
      default:
        return null
    }
  })()

  const span = (i: number) => (C.vars[i].max - C.vars[i].min) / (C.vars[i].step ?? 1)

  const evList = (slot: 'ex' | 'cx', list: Ev[]) => (
    <div
      ref={(el) => {
        zones.current.set(slot, el)
      }}
      className={`min-h-28 rounded-2xl border-2 border-dashed p-2 transition ${drag.dragging ? 'scale-[1.01]' : ''} ${slot === 'ex' ? (dark ? 'border-emerald-500/60 bg-emerald-900/30' : 'border-emerald-300 bg-emerald-50/80') : dark ? 'border-rose-500/60 bg-rose-900/30' : 'border-rose-300 bg-rose-50/80'}`}
    >
      <p className={`mb-1.5 flex items-center gap-1.5 text-sm font-black ${slot === 'ex' ? (dark ? 'text-emerald-200' : 'text-emerald-800') : dark ? 'text-rose-200' : 'text-rose-800'}`}>
        {slot === 'ex' ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
        {slot === 'ex' ? 'Örnekler: iddia doğru' : 'Karşı örnekler: iddia yanlış'}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {list.map((e) => (
          <span key={e.key} className={`inline-flex items-center gap-1 rounded-xl px-2 py-1 text-[15px] font-extrabold animate-pop ${dark ? 'bg-slate-900/60 text-white' : 'bg-white text-ink ring-1 ring-line'}`}>
            <MathText text={e.text} />
            {!locked && (
              <button type="button" onClick={() => remove(slot, e.key)} className="grid size-8 place-items-center rounded-lg opacity-60 hover:opacity-100" aria-label="Kaldır"><X size={14} /></button>
            )}
          </span>
        ))}
        {!list.length && <span className={`text-sm font-bold ${soft}`}>{slot === 'ex' ? 'Henüz yok' : C.truth === 'always' && ex.length >= 2 ? 'Bulamıyor musun? Belki de yoktur!' : 'Henüz yok'}</span>}
      </div>
    </div>
  )

  const panel = (
    <>
      <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
        <p className="text-sm font-black text-ink">Kararın</p>
        <p className="mb-2 text-sm font-bold text-ink-soft">
          {canDecide ? 'Kanıtların hazır. İddia için kararın ne?' : `Kanıt: ${ex.length} örnek, ${cx.length} karşı örnek. Bir örnek ve bir karşı örnek bul; karşı örnek bulamıyorsan en az 3 farklı örnek dene.`}
        </p>
        <div className="grid gap-2">
          {(['always', 'sometimes', 'never'] as Truth[]).map((t) => {
            const chosen = verdict === t
            const wrong = phase === 'test' && wrongPicks.includes(t)
            return (
              <button
                key={t}
                type="button"
                disabled={!canDecide || locked}
                onClick={() => decide(t)}
                className={`${btnH} rounded-2xl border-2 px-3 text-left text-lg font-black transition disabled:cursor-default ${chosen ? 'text-white' : wrong ? 'border-line bg-paper text-ink-soft line-through' : 'bg-white text-ink hover:-translate-y-0.5'} ${!canDecide && !chosen ? 'opacity-45' : ''}`}
                style={chosen ? { background: TRUTH_TONE[t], borderColor: TRUTH_TONE[t] } : { borderColor: wrong ? undefined : `${TRUTH_TONE[t]}66` }}
              >
                {TRUTH_LABEL[t]}
              </button>
            )
          })}
        </div>
      </div>
      {phase === 'why' && !S.done && (
        <div className="rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-200 animate-fade-up">
          <p className="mb-2 text-sm font-black text-sky-900">{verdict === 'always' ? 'Neden HER ZAMAN doğru?' : 'Neden ASLA doğru değil?'} Bir neden seç.</p>
          <div className="grid gap-2">
            {reasons.map((o) => (
              <button key={o.t} type="button" onClick={() => pickOpt(o, 'why')} disabled={wrongPicks.includes(o.t)} className={`min-h-12 rounded-xl px-3 py-2 text-left text-[15px] font-extrabold ring-1 transition ${wrongPicks.includes(o.t) ? 'bg-paper text-ink-soft line-through ring-line' : 'bg-white text-sky-950 ring-sky-200 hover:bg-sky-100'}`}>
                <MathText text={o.t} />
              </button>
            ))}
          </div>
        </div>
      )}
      {phase === 'fix' && !S.done && (
        <div className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200 animate-fade-up">
          <p className="mb-2 text-sm font-black text-amber-900">İddiayı düzelt: hangi koşulda HER ZAMAN doğru olur?</p>
          <div className="grid gap-2">
            {fixes.map((o) => (
              <button key={o.t} type="button" onClick={() => pickOpt(o, 'fix')} disabled={wrongPicks.includes(o.t)} className={`min-h-12 rounded-xl px-3 py-2 text-left text-[15px] font-extrabold ring-1 transition ${wrongPicks.includes(o.t) ? 'bg-paper text-ink-soft line-through ring-line' : 'bg-white text-amber-950 ring-amber-200 hover:bg-amber-100'}`}>
                <MathText text={o.t} />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )

  const doneBox = (
    <DoneNote title={`${TRUTH_LABEL[C.truth]}!`}>
      <p className="mt-1 font-bold text-green-900"><MathText text={C.note} /></p>
      {(ex[0] || cx[0]) && (
        <p className="mt-2 text-sm font-extrabold text-green-900">
          {ex[0] && <>Örneğin: <MathText text={ex[0].text} />. </>}
          {cx[0] && <>Karşı örneğin: <MathText text={cx[0].text} />.</>}
        </p>
      )}
      {S.last && (
        <StrategyPicker key="st" question="Karşı örnekleri nasıl aradın?" options={['Özel sayıları denedim (0, 1, 2…)', grade >= 6 ? 'Ondalık ya da negatif sayılar denedim' : 'Çok büyük ve çok küçük sayılar denedim', 'Rastgele örnekler denedim', 'Önce iddianın nedenini düşündüm']} onPick={() => {}} />
      )}
    </DoneNote>
  )

  return (
    <ActivityLayout
      grade={grade}
      idx={S.idx}
      total={tasks.length}
      title="İddiayı sına"
      prompt={big ? 'Bu iddia her zaman mı, bazen mi doğru, yoksa asla mı? Örnekler kur ve panoya koy.' : 'İddiayı örneklerle sına: bir örnek ve bir karşı örnek bul, sonra kararını ver.'}
      nudge={nudge}
      onCloseNudge={clear}
      done={S.done}
      doneBox={doneBox}
      onNext={next}
      onHint={S.done ? undefined : hint}
      panel={panel}
    >
      <div className="flex flex-col gap-3">
        {/* İddia */}
        <div className={`flex items-start gap-3 rounded-2xl px-4 py-3 ${dark ? 'bg-amber-400/15 ring-1 ring-amber-400/40' : 'bg-amber-50 ring-1 ring-amber-200'}`}>
          <Quote className={`mt-1 shrink-0 ${dark ? 'text-amber-300' : 'text-amber-500'}`} size={26} />
          <div>
            <p className={`text-xs font-black tracking-wide uppercase ${dark ? 'text-amber-300' : 'text-amber-700'}`}>İddia</p>
            <p data-claim className={`${big ? 'text-2xl' : 'text-xl sm:text-2xl'} leading-snug font-black ${dark ? 'text-white' : 'text-ink'}`}><MathText text={C.text} /></p>
          </div>
          {verdict && (
            <span className="ml-auto shrink-0 self-center rounded-xl px-3 py-1.5 text-sm font-black text-white animate-pop" style={{ background: TRUTH_TONE[verdict] }}>{TRUTH_LABEL[verdict]}</span>
          )}
        </div>

        {/* Deney sandığı */}
        <div className={`rounded-2xl p-3 ${box}`}>
          <p className={`mb-2 flex items-center gap-1.5 text-sm font-black ${soft}`}><FlaskConical size={17} />Deney sandığı{C.viz === 'rect' || C.viz === 'rect2' ? ': köşeyi sürükle ya da bir kareye dokun' : ''}</p>
          {viz && <div className="mb-2">{viz}</div>}
          <div className={`grid gap-2 ${C.vars.length > 2 ? 'sm:grid-cols-2' : C.vars.length === 2 ? 'sm:grid-cols-2' : ''}`}>
            {C.vars.map((vv, i) => {
              const st = vv.step ?? 1
              const wide = span(i) > 40
              return (
                <div key={vv.k} className={`flex flex-wrap items-center justify-center gap-1.5 rounded-2xl p-1.5 ${dark ? 'bg-slate-900/50' : 'bg-paper/80'}`}>
                  <span className={`w-full pl-1 text-center text-sm font-extrabold ${soft}`}><MathText text={vv.label} /></span>
                  {wide && <button type="button" className={`${stepBtn} text-sm`} disabled={locked || vals[i] <= vv.min} onClick={() => setVar(i, vals[i] - st * 10)} aria-label={`${vv.label} on azalt`}>−{nf(st * 10)}</button>}
                  <button type="button" className={stepBtn} disabled={locked || vals[i] <= vv.min} onClick={() => setVar(i, vals[i] - st)} aria-label={`${vv.label} azalt`}><Minus size={20} strokeWidth={3} /></button>
                  <span className={`min-w-[3.2rem] text-center text-2xl font-black tabular-nums ${dark ? 'text-white' : 'text-ink'}`}>{nf(vals[i])}</span>
                  <button type="button" className={stepBtn} disabled={locked || vals[i] >= vv.max} onClick={() => setVar(i, vals[i] + st)} aria-label={`${vv.label} artır`}><Plus size={20} strokeWidth={3} /></button>
                  {wide && <button type="button" className={`${stepBtn} text-sm`} disabled={locked || vals[i] >= vv.max} onClick={() => setVar(i, vals[i] + st * 10)} aria-label={`${vv.label} on artır`}>+{nf(st * 10)}</button>}
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={`text-xs font-black ${soft}`}>Dene:</span>
            {(C.quick ?? []).map((q) => (
              <button key={q.join(',')} type="button" disabled={locked} onClick={() => setVals(q.slice())} className={`min-h-11 rounded-xl px-3 text-sm font-black transition disabled:opacity-40 ${dark ? 'bg-slate-700 text-cyan-100 ring-1 ring-slate-500' : 'bg-sky-50 text-sky-900 ring-1 ring-sky-200'}`}>
                {q.map(nf).join(' ; ')}
              </button>
            ))}
            <button type="button" disabled={locked} onClick={roll} className={`inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-black transition disabled:opacity-40 ${dark ? 'bg-slate-700 text-white ring-1 ring-slate-500' : 'bg-white text-ink ring-1 ring-line'}`}><Dices size={17} />Rastgele</button>
          </div>

          {/* Sonuç kartı */}
          <div className={`mt-3 flex flex-wrap items-center gap-2 rounded-2xl p-2 ${dark ? 'bg-slate-900/70' : 'bg-sky-50/80 ring-1 ring-sky-100'}`}>
            <button
              type="button"
              {...drag.bind(key)}
              data-handle
              disabled={locked}
              style={{ touchAction: 'none' }}
              className={`flex min-h-14 min-w-0 flex-1 basis-60 items-center gap-2 rounded-xl px-3 py-2 text-left transition ${dark ? 'bg-white text-ink' : 'bg-white text-ink ring-2 ring-amber-300'} ${drag.dragging ? 'opacity-40' : ''} disabled:opacity-60`}
              aria-label="Sonucu panoya sürükle"
            >
              <GripVertical size={20} className="shrink-0 text-amber-500" />
              <span className="text-xl font-black sm:text-2xl"><MathText text={test.text} /></span>
            </button>
            <div className="flex gap-2">
              <button type="button" disabled={locked} onClick={() => place('ex')} className={`${btnH} inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 text-sm font-black text-white shadow-[0_3px_0_#047857] disabled:opacity-40`}><Check size={18} strokeWidth={3} />İddia doğru</button>
              <button type="button" disabled={locked} onClick={() => place('cx')} className={`${btnH} inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 text-sm font-black text-white shadow-[0_3px_0_#be123c] disabled:opacity-40`}><X size={18} strokeWidth={3} />İddia yanlış</button>
            </div>
          </div>
        </div>

        {/* Kanıt panosu */}
        <div className="grid gap-2 sm:grid-cols-2">
          {evList('ex', ex)}
          {evList('cx', cx)}
        </div>
      </div>
      {drag.ghost}
    </ActivityLayout>
  )
}
