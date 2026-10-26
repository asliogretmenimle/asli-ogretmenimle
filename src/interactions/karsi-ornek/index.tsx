import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Crosshair, NotebookPen } from 'lucide-react'
import type { Grade } from '../../data/types'
import type { InteractionProps } from '../types'
import { MathText } from '../../components/MathText'
import { SolutionList, StrategyPicker, useSolutions } from '../../games/kit2'
import { ActivityLayout, DoneNote, useNudge, useSession } from '../hizli-noktalar/kit'
import { ChipSentence, Opt, Rich, Speaker, Steps, isDark, sentenceDone, shuffled, type SentencePart } from '../tahmin-test-acikla/ortak'
import { BoxView, MiniLine } from './boxes'
import { makeClaims, type Claim, type Ev } from './claims'

/**
 * 74. Karşı Örnek Avcısı
 * Bir karakter bir genelleme ileri sürer. Öğrenci deney tezgâhında (sayı kartları, dikdörtgen, üçgen, kesir kurucu)
 * örnekler kurar; tezgâh her örneği canlı sınar ve deftere yazar.
 *  - Karşı örnek bulursa kaydeder (uygulama doğrular) → nedenini açıklar → iddiayı düzeltir.
 *  - Bazı iddialar gerçekten doğrudur: öğrenci “her zaman doğru” der ve NEDEN doğru olduğunu açıklar
 *    (birkaç örnek kanıt sayılmaz).
 */

export default function KarsiOrnek({ grade, onFinish }: InteractionProps) {
  const claims = useMemo(() => makeClaims(grade), [grade])
  const S = useSession(claims.length)
  const N = useNudge()
  const found = useRef(0)
  const confirmed = useRef(0)
  const next = () => {
    N.clear()
    if (S.last) {
      onFinish({
        stars: S.stars(),
        summary: `${found.current} iddiayı karşı örnekle çürüttün, ${confirmed.current} iddianın her zaman doğru olduğunu gerekçelendirdin.`,
        insight: 'Bir genellemeyi çürütmek için tek bir karşı örnek yeter; ama doğru olduğunu göstermek için örnekler yetmez, NEDEN her zaman doğru olduğunu açıklamak gerekir.',
      })
      return
    }
    S.next()
  }
  return <ClaimView key={S.idx} claim={claims[S.idx]} grade={grade} S={S} N={N} total={claims.length} onNext={next} onResolved={(f) => (f ? found.current++ : confirmed.current++)} />
}

type Phase = 'hunt' | 'why' | 'fix' | 'done'

function ClaimView({ claim: C, grade, S, N, total, onNext, onResolved }: { claim: Claim; grade: Grade; S: ReturnType<typeof useSession>; N: ReturnType<typeof useNudge>; total: number; onNext: () => void; onResolved: (found: boolean) => void }) {
  const dark = isDark(grade)
  const [a, setA] = useState<number[]>(C.start)
  const [phase, setPhase] = useState<Phase>('hunt')
  const [log, setLog] = useState<{ key: string; ev: Ev }[]>([])
  const [counter, setCounter] = useState<Ev | null>(null)
  const [why, setWhy] = useState<Record<string, number | undefined>>({})
  const [whyMark, setWhyMark] = useState<'ok' | 'think' | undefined>()
  const [fixPick, setFixPick] = useState<number | null>(null)
  const [hintN, setHintN] = useState(0)
  const sol = useSolutions()
  const ev = C.ev(a)
  const whyOpts = useMemo(() => shuffled(C.why), [C])
  const fixOpts = useMemo(() => (C.fix ? shuffled(C.fix) : []), [C])

  // Her yeni yapılandırma deftere yazılır
  const k = a.join(',')
  useEffect(() => {
    const e = C.ev(a)
    if (!e.na) setLog((l) => (l.some((x) => x.key === k) ? l : [{ key: k, ev: e }, ...l].slice(0, 30)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k])

  // Bittikten sonra bulunan yeni türde karşı örnekler toplanır
  useEffect(() => {
    if (phase !== 'done' || C.truth || ev.holds || !ev.kind) return
    if (sol.add(ev.kind, ev.kind)) N.show(`Yeni türde bir karşı örnek: ${ev.kind}! Karşı örnekleri türlerine ayırmak, iddiayı nasıl düzelteceğimizi gösterir.`, { tone: 'ok' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, phase])

  const tested = log.length
  const counters = log.filter((x) => !x.ev.holds).length

  const submitCounter = () => {
    if (ev.na) {
      N.show(`${ev.test}. Bu örnek iddianın konusu dışında kalıyor; iddianın koşuluna uyan bir örnek kur.`)
      return
    }
    if (ev.holds) {
      S.attempt(false)
      N.show(`Bu örnekte iddia tutuyor: ${ev.test.replace(/\?$/, '')} → evet. Karşı örnek, iddiayı yanlış çıkaran bir örnektir. Başka bir örnek dene.`, { misc: 'İddiayı destekleyen bir örneği karşı örnek sandı' })
      return
    }
    S.attempt(true)
    setCounter(ev)
    if (ev.kind) sol.add(ev.kind, ev.kind)
    N.show('Karşı örnek doğrulandı! 🎯 Tek bir karşı örnek “her zaman” iddiasını çürütür.', { tone: 'ok' })
    setPhase('why')
  }
  const claimTrue = () => {
    if (tested < 3) {
      N.show(`Karar vermeden önce en az 3 farklı örnek dene (${tested}/3). Özellikle “sıra dışı” örnekleri seç.`)
      return
    }
    if (!C.truth) {
      S.attempt(false)
      N.show(`${C.miss ?? 'Daha uç örnekleri denedin mi?'} Bir iddianın her zaman doğru olduğundan emin olmak için birkaç örnek yetmez.`, { misc: 'Birkaç örnekte tuttu diye genellemenin her zaman doğru olduğunu düşündü' })
      return
    }
    S.attempt(true)
    N.show('Hiç karşı örnek çıkmadı. Ama bu bir kanıt mı? Şimdi NEDEN her zaman doğru olduğunu açıkla.', { tone: 'ok' })
    setPhase('why')
  }
  const whyParts: SentencePart[] = C.truth
    ? ['Bu iddia her zaman doğru, çünkü ', { id: 'w', options: whyOpts.map((o) => o.t) }, '.']
    : [`${counter?.expr ?? ''} örneği iddiayı çürütür, çünkü `, { id: 'w', options: whyOpts.map((o) => o.t) }, '.']
  const checkWhy = () => {
    const o = whyOpts[why.w!]
    if (!o.ok) {
      S.attempt(false)
      setWhyMark('think')
      N.show(o.nudge ?? 'Bu bir neden mi? Tezgâhta gördüğünle karşılaştır.', { misc: o.misc })
      return
    }
    S.attempt(true)
    setWhyMark('ok')
    N.clear()
    if (C.truth || !C.fix) finish()
    else setPhase('fix')
  }
  const pickFix = (i: number) => {
    setFixPick(i)
    const o = fixOpts[i]
    if (!o.ok) {
      S.attempt(false)
      N.show(o.nudge ?? 'Bu düzeltilmiş iddiaya da bir karşı örnek bulabilir misin?', { misc: o.misc })
      return
    }
    S.attempt(true)
    finish()
  }
  const finish = () => {
    onResolved(!C.truth)
    S.complete()
    N.show(C.truth ? 'Gerekçen sağlam: örnekler güven verdi, açıklama kanıtladı.' : 'İddiayı çürüttün ve düzelttin. Tezgâhta başka türden karşı örnekler de arayabilirsin.', { tone: 'ok' })
    setPhase('done')
  }
  const hint = () => {
    S.hint()
    N.show(C.hints[Math.min(hintN, C.hints.length - 1)])
    setHintN((h) => h + 1)
  }

  const steps = C.truth ? [{ label: 'Dene', emoji: '🔍' }, { label: 'Gerekçelendir', emoji: '💬' }] : [{ label: 'Avla', emoji: '🎯' }, { label: 'Açıkla', emoji: '💬' }, { label: 'Düzelt', emoji: '🛠️' }]
  const stepIdx = phase === 'hunt' ? 0 : phase === 'why' ? 1 : phase === 'fix' ? 2 : steps.length
  const card = dark ? 'bg-slate-800/90 ring-1 ring-slate-600' : 'bg-white/95 ring-1 ring-line'

  const panel = (
    <div className="flex flex-col gap-3">
      <Speaker who={C.who}>
        <Rich text={C.text} />
      </Speaker>
      {phase === 'hunt' && (
        <>
          <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-black text-sky-900 ring-1 ring-sky-200">Tezgâhta örnekler kur. İddiayı çürüten bir örnek bulursan kaydet; bulamıyorsan belki iddia doğrudur.</p>
          <button type="button" onClick={submitCounter} className="btn-primary min-h-14 w-full text-lg"><Crosshair size={20} />Bu bir karşı örnek!</button>
          <button type="button" onClick={claimTrue} className="btn-ghost min-h-12 w-full"><CheckCircle2 size={18} className="text-emerald-600" />Bence her zaman doğru</button>
        </>
      )}
      {(phase === 'why' || phase === 'fix' || phase === 'done') && (
        <>
          {counter && (
            <div className="rounded-2xl bg-rose-50 px-3 py-2 ring-1 ring-rose-200">
              <p className="text-xs font-black tracking-wide text-rose-800 uppercase">🎯 Karşı örneğin</p>
              <p className="text-lg font-black text-ink"><MathText text={counter.expr} /></p>
            </div>
          )}
          <ChipSentence grade={grade} parts={whyParts} value={why} marks={{ w: whyMark }} disabled={phase !== 'why'} onChange={(_, i) => { setWhy({ w: i }); setWhyMark(undefined) }} label={C.truth ? 'Neden her zaman doğru?' : 'Neden işe yaradı?'} />
          {phase === 'why' && <button type="button" onClick={checkWhy} disabled={!sentenceDone(whyParts, why)} className="btn-primary min-h-12 w-full">💬 Gerekçemi kontrol et</button>}
        </>
      )}
      {(phase === 'fix' || (phase === 'done' && fixPick !== null)) && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-black text-ink-soft">🛠️ {C.who.name}’in iddiasını nasıl düzeltirsin? (Birden fazla doğru olabilir.)</p>
          {fixOpts.map((o, i) => (
            <Opt key={i} grade={grade} disabled={phase === 'done'} state={fixPick === i ? (o.ok ? 'right' : 'think') : phase === 'done' ? 'dim' : 'idle'} onClick={() => pickFix(i)}>{o.t}</Opt>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <ActivityLayout
      grade={grade}
      idx={S.idx}
      total={total}
      title={C.truth ? 'Doğru mu, yanlış mı?' : 'Karşı örnek avı'}
      prompt={phase === 'hunt' ? `${C.who.name} bir genelleme yaptı. Her zaman doğru mu?` : C.truth ? 'Neden her zaman doğru?' : 'Karşı örneği açıkla.'}
      nudge={N.nudge}
      onCloseNudge={N.clear}
      done={phase === 'done'}
      doneBox={
        <DoneNote title={C.truth ? 'İddia doğrulandı!' : 'İddia çürütüldü!'} note={<MathText text={C.insight} />}>
          {!C.truth && <SolutionList list={sol.list} />}
          <StrategyPicker
            question={C.truth ? 'Neden doğru olduğunu nasıl anladın?' : 'Karşı örneği nasıl buldun?'}
            options={C.truth ? ['Örneklerin ortak yapısına baktım', 'Bir model / çizim düşündüm', 'Harflerle (n) düşündüm'] : ['Özel sayıları denedim (0, 1, negatif, kesir)', 'Sırayla sistemli denedim', 'İddianın nedenini düşündüm', 'Rastgele denedim']}
            onPick={() => undefined}
          />
        </DoneNote>
      }
      onNext={onNext}
      onHint={phase === 'done' ? undefined : hint}
      panel={panel}
    >
      <Steps steps={steps} current={stepIdx} dark={dark} />
      <div className="flex flex-col gap-3">
        <BoxView box={C.box} a={a} set={setA} g={grade} />
        <div className={`rounded-2xl p-3 ${card}`} aria-live="polite">
          <p className="text-center text-2xl font-black"><MathText text={ev.expr} /></p>
          <p className={`mt-1 text-center font-extrabold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}><MathText text={ev.test} /></p>
          <p className={`mx-auto mt-2 w-fit rounded-full px-4 py-1.5 text-center font-black ${ev.holds || ev.na ? (dark ? 'bg-slate-700 text-slate-100' : 'bg-sky-50 text-sky-900 ring-1 ring-sky-200') : 'bg-rose-500 text-white animate-pop'}`}>
            {ev.na ? '… Bu örnek iddianın koşuluna uymuyor' : ev.holds ? '✔ Bu örnekte iddia tutuyor' : '✖ Bu örnekte iddia tutmuyor!'}
          </p>
          {ev.pts && <div className="mt-2"><MiniLine pts={ev.pts} g={grade} /></div>}
        </div>
        <details className={`rounded-2xl px-3 py-2 ${card}`} open={tested > 1}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-black">
            <NotebookPen size={18} />Deney defteri: {tested} örnek · {counters} karşı örnek
          </summary>
          <ul className="mt-1 flex max-h-40 flex-col gap-1 overflow-y-auto pb-1">
            {log.slice(0, 10).map((x) => (
              <li key={x.key} className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-bold ${x.ev.holds ? '' : 'bg-rose-500/15'}`}>
                <span aria-hidden>{x.ev.holds ? '✔' : '🎯'}</span>
                <MathText text={x.ev.expr} />
              </li>
            ))}
          </ul>
        </details>
      </div>
    </ActivityLayout>
  )
}
