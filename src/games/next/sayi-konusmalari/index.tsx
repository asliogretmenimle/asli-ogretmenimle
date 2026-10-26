import { useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Check, Flag, Grid3x3, MessageCircle, Puzzle, RefreshCw, Route, Sparkles, Wand2 } from 'lucide-react'
import type { GameProps } from '../../kit'
import { starsFor } from '../../kit'
import { LevelDots, Nudge, Scene, useAge, useSolutions } from '../../kit2'
import { MathText } from '../../../components/MathText'
import { useTracker } from '../../../lib/trackerContext'
import { celebrate, sfx } from '../../../lib/feedback'
import { AreaBuilder } from './AreaBuilder'
import { ChipsBuilder, type BuildResult } from './ChipsBuilder'
import { JumpsBuilder } from './JumpsBuilder'
import { RoundBuilder } from './RoundBuilder'
import { buildProblems, fmtN, friendsFor, NAMES, stratName, type BuilderKind, type Friend, type Problem, type StratKey } from './problems'
import { Card, ThemeCtx, themeFor, Trail, useTheme } from './ui'

/**
 * Sayı Konuşmaları (1–8. sınıf) — Number Talks.
 * Her problemde: (1) hesaplamadan tahmin et, (2) bir strateji seç ve adım adım kur, (3) sınıf arkadaşlarının yollarıyla karşılaştır.
 * Strateji, öğrencinin hamlelerinden çıkarılır ve öğretmen raporuna yazılır; farklı stratejiler useSolutions ile sayılır.
 */

type Phase = 'estimate' | 'pick' | 'build' | 'compare'

const BUILDERS: Record<BuilderKind, { icon: ReactNode; title: (p: Problem) => string; sub: (p: Problem) => string }> = {
  chips: {
    icon: <Puzzle size={26} />,
    title: (p) => (p.kind === 'mul' || p.kind === 'pow' ? 'Çarpanlara ayır, yeniden grupla' : 'Parçala ve birleştir'),
    sub: (p) => (p.kind === 'mul' || p.kind === 'pow' ? 'Sayıları çarpanlarına ayır; kolay çarpılanları önce birleştir.' : 'Sayıları parçalara ayır; kolay olanları önce birleştir.'),
  },
  jumps: { icon: <Route size={26} />, title: () => 'Sayı doğrusunda zıpla', sub: () => 'Açık sayı doğrusunda kendi zıplamalarını yap.' },
  round: { icon: <Wand2 size={26} />, title: () => 'Yuvarla ve düzelt', sub: (p) => (p.kind === 'sub' ? 'Bir sayıyı kolay sayıya çevir ya da ikisini birlikte kaydır.' : 'Bir sayıyı kolay sayıya çevir, sonra sonucu düzelt.') },
  area: { icon: <Grid3x3 size={26} />, title: () => 'Alan modeli', sub: () => 'Dikdörtgenin kenarlarını parçala, parçaları topla.' },
}

const SIMILAR: Partial<Record<StratKey, StratKey[]>> = {
  grupla: ['birlesme', 'yarila'],
  birlesme: ['grupla'],
  yarila: ['grupla'],
  dogrudan: ['deger'],
  deger: ['dogrudan'],
  parcala: ['basamak', 'tamamla'],
}
const similar = (a: StratKey, b: StratKey) => a === b || !!SIMILAR[a]?.includes(b)

/** “da/de” bağlacı ünlü uyumu: Can da, Elif de */
function daDe(name: string) {
  const v = [...name.toLocaleLowerCase('tr-TR')].reverse().find((c) => 'aıoueiöü'.includes(c)) ?? 'e'
  return 'aıou'.includes(v) ? 'da' : 'de'
}

/** Özel ad + tamlayan eki: Can → Can’ın, Defne → Defne’nin */
function genitive(name: string) {
  const v = [...name.toLocaleLowerCase('tr-TR')].reverse().find((c) => 'aıoueiöü'.includes(c)) ?? 'e'
  const suf = { a: 'ın', ı: 'ın', o: 'un', u: 'un', e: 'in', i: 'in', ö: 'ün', ü: 'ün' }[v]!
  return `${name}’${'aıoueiöü'.includes(name[name.length - 1]) ? 'n' : ''}${suf}`
}

const shuffle = <T,>(xs: T[]) => {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function SayiKonusmalari({ grade, onFinish }: GameProps) {
  const age = useAge(grade)
  const theme = useMemo(() => themeFor(age.tier === 'atolye'), [age.tier])
  const problems = useMemo(() => buildProblems(grade), [grade])
  const track = useTracker()
  const sol = useSolutions()

  const [pi, setPi] = useState(0)
  const p = problems[pi]
  const [phase, setPhase] = useState<Phase>('estimate')
  const [est, setEst] = useState<'big' | 'small' | null>(null)
  const [kind, setKind] = useState<BuilderKind | null>(null)
  const [runs, setRuns] = useState(0)
  const [results, setResults] = useState<BuildResult[]>([])
  const [friends, setFriends] = useState<(Friend & { name: string; av: string; color: string })[]>([])
  const [q1, setQ1] = useState<number | 'none' | null>(null)
  const [q2, setQ2] = useState<number | 'me' | null>(null)
  const stats = useRef({ items: 0, first: 0, est: 0, names: new Set<string>() })

  const last = results[results.length - 1]
  const estOk = est === null ? null : (est === 'big') === p.answer > p.bench

  const onBuilt = (r: BuildResult) => {
    const name = stratName(r.key, grade)
    track.strategy(name)
    stats.current.names.add(name)
    sol.add(`${pi}:${r.key}`, `${p.text}: ${name}`)
    if (!results.length) {
      track.item(r.firstTry)
      stats.current.items++
      if (r.firstTry) stats.current.first++
      if (estOk) stats.current.est++
      // sınıf arkadaşları: biri öğrencininkine benzer (varsa), diğerleri farklı
      const all = friendsFor(p, grade)
      const match = all.find((f) => similar(r.key, f.key))
      const rest = shuffle(all.filter((f) => f !== match))
      const chosen = shuffle([...(match ? [match] : []), ...rest].slice(0, 3))
      const names = shuffle(NAMES)
      setFriends(chosen.map((f, i) => ({ ...f, ...names[i] })))
    }
    setResults([...results, r])
    setQ1(null)
    setQ2(null)
    setPhase('compare')
    sfx.ok()
    celebrate(false)
  }

  const next = () => {
    if (pi + 1 >= problems.length) return finish()
    setPi(pi + 1)
    setPhase('estimate')
    setEst(null)
    setKind(null)
    setResults([])
    setFriends([])
    setQ1(null)
    setQ2(null)
  }

  const finish = () => {
    const s = stats.current
    let stars = starsFor(s.items ? s.first / s.items : 1)
    if (s.names.size >= 4 && stars < 3) stars = (stars + 1) as 1 | 2 | 3
    const names = [...s.names]
    onFinish({
      stars,
      score: s.first * 10 + names.length * 5 + s.est * 2,
      summary: `${problems.length} problemi konuştun ve ${names.length} farklı strateji kullandın.`,
      insight: `Aynı işlemi farklı yollarla düşündün: ${names.slice(0, 3).join(', ')}${names.length > 3 ? '…' : ''}. Sayılara bakıp en uygun stratejiyi seçmek zihinden işlemin anahtarıdır.`,
    })
  }

  const step = phase === 'estimate' ? 0 : phase === 'compare' ? 2 : 1

  return (
    <ThemeCtx.Provider value={theme}>
      <Scene grade={grade} className="!p-2 sm:!p-4">
        {!theme.dark && <ClassroomDecor />}
        <div className="relative grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div className="min-w-0 space-y-3 lg:col-start-1">
            <Board p={p} pi={pi} total={problems.length} step={step} grade={grade} />

            {phase === 'estimate' && <Estimate p={p} onPick={(e) => { setEst(e); setPhase('pick') }} />}

            {phase === 'pick' && (
              <Card>
                <p className="mb-3 text-lg font-black">{results.length ? 'Başka bir yolla da çözebilir misin?' : 'Bu işlemi kafandan nasıl çözersin? Bir yol seç ve adım adım kur.'}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {p.builders.map((b) => {
                    const used = results.some((r) => r.builder === b)
                    return (
                      <button key={b} type="button" onClick={() => { setKind(b); setRuns(runs + 1); setPhase('build') }} className={`relative flex min-h-24 items-start gap-3 rounded-2xl p-4 text-left transition active:scale-[.98] ${theme.chip}`}>
                        <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${theme.dark ? 'bg-cyan-400/15 text-cyan-300' : 'bg-rose-100 text-rose-600'}`}>{BUILDERS[b].icon}</span>
                        <span>
                          <span className="block text-lg leading-tight font-black">{BUILDERS[b].title(p)}</span>
                          <span className={`mt-0.5 block text-sm font-bold ${theme.muted}`}>{BUILDERS[b].sub(p)}</span>
                        </span>
                        {used && <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-black text-white"><Check size={12} strokeWidth={3} />kullandın</span>}
                      </button>
                    )
                  })}
                </div>
                {results.length > 0 && (
                  <div className="mt-3 text-right">
                    <button type="button" onClick={() => setPhase('compare')} className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${theme.chip}`}>Karşılaştırmaya dön</button>
                  </div>
                )}
              </Card>
            )}

            {phase === 'build' && kind && (
              <Card>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-lg font-black"><span className={theme.dark ? 'text-cyan-300' : 'text-rose-600'}>{BUILDERS[kind].icon}</span>{BUILDERS[kind].title(p)}</p>
                  <button type="button" onClick={() => setPhase('pick')} className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-extrabold ${theme.chip}`}><RefreshCw size={16} />Yol değiştir</button>
                </div>
                {kind === 'chips' && <ChipsBuilder key={runs} p={p} grade={grade} onDone={(r) => onBuilt({ ...r, builder: 'chips' })} />}
                {kind === 'jumps' && <JumpsBuilder key={runs} p={p} onDone={(r) => onBuilt({ ...r, builder: 'jumps' })} />}
                {kind === 'round' && <RoundBuilder key={runs} p={p} onDone={(r) => onBuilt({ ...r, builder: 'round' })} />}
                {kind === 'area' && <AreaBuilder key={runs} p={p} onDone={(r) => onBuilt({ ...r, builder: 'area' })} />}
              </Card>
            )}

            {phase === 'compare' && last && (
              <Compare
                p={p}
                grade={grade}
                me={last}
                isNew={results.filter((r) => r.key === last.key).length === 1}
                count={results.length}
                estOk={results.length === 1 ? estOk : null}
                friends={friends}
                q1={q1}
                q2={q2}
                setQ1={setQ1}
                setQ2={setQ2}
                onAnother={() => setPhase('pick')}
                onNext={next}
                lastProblem={pi + 1 >= problems.length}
                canAnother={p.builders.length > 1 || p.builders[0] === 'chips'}
              />
            )}
          </div>

          <aside className="space-y-3 lg:col-start-2 lg:row-start-1">
            <Card>
              <p className="mb-2 flex items-center gap-2 text-sm font-black"><Sparkles size={16} className={theme.dark ? 'text-cyan-300' : 'text-amber-500'} />Kullandığın stratejiler: {stats.current.names.size}</p>
              {stats.current.names.size ? (
                <div className="flex flex-wrap gap-1.5">
                  {[...stats.current.names].map((n) => <span key={n} className={`chip px-2.5 py-1 text-xs ${theme.dark ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40' : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'}`}>{n}</span>)}
                </div>
              ) : (
                <p className={`text-sm font-bold ${theme.muted}`}>Her problemde bir yol kur; farklı yollar burada birikir.</p>
              )}
            </Card>
            <Card className="max-lg:hidden">
              <p className="mb-1 flex items-center gap-2 text-sm font-black"><MessageCircle size={16} className={theme.dark ? 'text-violet-300' : 'text-rose-500'} />Sayı konuşması kuralları</p>
              <ul className={`space-y-1 text-sm font-bold ${theme.muted}`}>
                <li>• Önce tahmin et, sonra hesapla.</li>
                <li>• Kafandan çöz: kâğıt kalem yok!</li>
                <li>• Tek doğru yol yok; yolunu açıklayabilmen önemli.</li>
                <li>• Arkadaşlarının yollarını dinle, karşılaştır.</li>
              </ul>
            </Card>
          </aside>
        </div>
      </Scene>
    </ThemeCtx.Provider>
  )
}

/* ───────────────────────────── parçalar ───────────────────────────── */

function ClassroomDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -top-24 -right-24 size-72 rounded-full bg-[repeating-radial-gradient(circle,#fde68a33_0,#fde68a33_14px,transparent_14px,transparent_28px)]" />
      <div className="absolute -bottom-28 -left-20 size-80 rounded-full bg-[repeating-radial-gradient(circle,#fecdd333_0,#fecdd333_16px,transparent_16px,transparent_32px)]" />
    </div>
  )
}

function Board({ p, pi, total, step, grade }: { p: Problem; pi: number; total: number; step: number; grade: number }) {
  const t = useTheme()
  const steps = ['Tahmin', 'Yolunu kur', 'Karşılaştır']
  const big = p.text.length > 14 ? 'text-4xl sm:text-5xl' : 'text-5xl sm:text-6xl'
  if (t.dark) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#0b1220,#111c33_55%,#1a1438)] p-4 ring-1 ring-cyan-400/25 shadow-[0_10px_40px_rgba(8,145,178,.15)] sm:p-5">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.12)_1px,transparent_1px)] [background-size:28px_28px]" aria-hidden />
        <div className="relative flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs font-bold tracking-[.2em] text-cyan-300/80 uppercase">Sayı konuşması · {pi + 1}/{total}</span>
          <Stepper steps={steps} step={step} />
        </div>
        <p className={`relative mt-4 mb-2 text-center font-black tracking-tight text-white tabular-nums [text-shadow:0_0_24px_rgba(34,211,238,.35)] ${big}`}><MathText text={p.text} /></p>
        <p className="relative text-center text-sm font-bold text-slate-400">Kâğıt kalem yok — zihninde hangi yolu izlersin?</p>
      </div>
    )
  }
  return (
    <div className="relative">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
        <LevelDots current={pi} total={total} />
        <Stepper steps={steps} step={step} />
      </div>
      <div className="rounded-[28px] bg-[linear-gradient(180deg,#b7791f,#92400e)] p-2.5 shadow-[0_10px_24px_rgba(120,53,15,.25)]">
        <div className="relative rounded-[20px] bg-[radial-gradient(circle_at_30%_20%,#2f6b52,#1f4d3a_70%)] px-4 pt-3 pb-5 text-white">
          <div className="flex items-start gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-amber-100 text-3xl ring-4 ring-amber-200/60" aria-hidden>👩‍🏫</span>
            <p className="relative mt-1 rounded-2xl rounded-tl-sm bg-white/95 px-3 py-2 text-sm font-extrabold text-ink shadow sm:text-base">
              {grade <= 2 ? 'Halkaya oturun! Bunu kafanızdan nasıl çözersiniz?' : 'Bu işlemi kâğıt kalem olmadan nasıl çözersin? Yollarımızı konuşalım.'}
            </p>
          </div>
          <p className={`mt-3 text-center font-black tracking-wide tabular-nums [text-shadow:0_2px_0_rgba(0,0,0,.25)] ${big}`} style={{ fontFamily: '"Nunito Variable", ui-rounded, system-ui' }}><MathText text={p.text} /></p>
          <span className="absolute right-4 bottom-1.5 h-2 w-10 rounded-full bg-white/80" aria-hidden />
          <span className="absolute right-16 bottom-1.5 h-2 w-6 rounded-full bg-amber-200/80" aria-hidden />
        </div>
      </div>
    </div>
  )
}

function Stepper({ steps, step }: { steps: string[]; step: number }) {
  const t = useTheme()
  return (
    <ol className="flex items-center gap-1" aria-label="Aşamalar">
      {steps.map((s, i) => (
        <li key={s} className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black sm:text-xs ${i === step ? (t.dark ? 'bg-cyan-400 text-slate-900' : 'bg-rose-500 text-white') : i < step ? (t.dark ? 'bg-emerald-400/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800') : t.dark ? 'bg-slate-700/70 text-slate-400' : 'bg-white/80 text-ink-soft ring-1 ring-line'}`} aria-current={i === step ? 'step' : undefined}>
          {i < step ? <Check size={12} strokeWidth={3} /> : <span>{i + 1}</span>}
          {s}
        </li>
      ))}
    </ol>
  )
}

function Estimate({ p, onPick }: { p: Problem; onPick: (e: 'big' | 'small') => void }) {
  const t = useTheme()
  const zero = p.bench === 0
  return (
    <Card>
      <p className="text-lg font-black">{zero ? 'Hesaplamadan düşün: sonuç sıfırdan büyük mü (pozitif), küçük mü (negatif)?' : <>Hesaplamadan tahmin et: sonuç <span className={t.dark ? 'text-cyan-300' : 'text-rose-600'}>{fmtN(p.bench)}</span> sayısından büyük mü, küçük mü?</>}</p>
      <p className={`mt-1 text-sm font-bold ${t.muted}`}>Sayıları yuvarlayarak ya da yakın kolay sayılarla düşün. Tahmin yanlış olamaz; sonra birlikte kontrol edeceğiz.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onPick('small')} className={`min-h-16 rounded-2xl text-xl font-black transition active:scale-[.98] ${t.chip}`}>{zero ? 'Negatif' : `${fmtN(p.bench)} sayısından küçük`}</button>
        <button type="button" onClick={() => onPick('big')} className={`min-h-16 rounded-2xl text-xl font-black transition active:scale-[.98] ${t.chip}`}>{zero ? 'Pozitif' : `${fmtN(p.bench)} sayısından büyük`}</button>
      </div>
    </Card>
  )
}

type FriendView = Friend & { name: string; av: string; color: string }

function Compare({ p, grade, me, isNew, count, estOk, friends, q1, q2, setQ1, setQ2, onAnother, onNext, lastProblem, canAnother }: {
  p: Problem
  grade: number
  me: BuildResult
  isNew: boolean
  count: number
  estOk: boolean | null
  friends: FriendView[]
  q1: number | 'none' | null
  q2: number | 'me' | null
  setQ1: (v: number | 'none') => void
  setQ2: (v: number | 'me') => void
  onAnother: () => void
  onNext: () => void
  lastProblem: boolean
  canAnother: boolean
}) {
  const t = useTheme()
  const g = grade as 1
  const myName = stratName(me.key, g)
  const matchIdx = friends.findIndex((f) => similar(me.key, f.key))
  const revealed = q1 !== null
  const myLen = Math.max(1, me.trail.length - 1)

  let q1msg: { text: string; ok: boolean } | null = null
  if (q1 === 'none') q1msg = matchIdx >= 0 ? { text: `Bir daha bak: ${friends[matchIdx].name} ${daDe(friends[matchIdx].name)} “${stratName(friends[matchIdx].key, g)}” yolunu kullandı. Hangi adımlarınız benziyor?`, ok: false } : { text: 'Doğru, senin yolun farklı! Sınıfa yeni bir strateji kazandırdın.', ok: true }
  else if (typeof q1 === 'number') {
    const f = friends[q1]
    q1msg = f.key === me.key
      ? { text: `Evet! İkiniz de “${stratName(f.key, g)}” yolunu kullandınız.`, ok: true }
      : similar(me.key, f.key)
        ? { text: `Yollarınız benziyor: ikiniz de sayıları parçalayıp yeniden düzenlediniz. ${f.name} “${stratName(f.key, g)}” kullandı, sen “${myName}”. Hangi adımda ayrıldınız?`, ok: true }
        : { text: `${f.name} “${stratName(f.key, g)}” kullandı, sen “${myName}”. Ortak bir yanı var mı? Farkı ne?`, ok: false }
  }
  let q2msg = ''
  if (q2 !== null) {
    const lens = friends.map((f) => f.steps.length)
    const minLen = Math.min(myLen, ...lens)
    const chosenLen = q2 === 'me' ? myLen : lens[q2]
    const who = q2 === 'me' ? 'Senin yolun' : `${genitive(friends[q2].name)} yolu`
    q2msg = chosenLen <= minLen
      ? `${who} ${chosenLen} adım: en kısa yollardan biri! Sayılar uygun olduğunda kısa yollar işi kolaylaştırır.`
      : `${who} ${chosenLen} adım. Daha kısa yollar da var; ama senin için en anlaşılır yol da değerlidir. Hangi sayılar bu yolu seçtirdi?`
  }

  return (
    <div className="space-y-3 animate-fade-up">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-lg font-black">
            <span className={`grid size-10 place-items-center rounded-full text-xl ${t.dark ? 'bg-cyan-400 text-slate-900' : 'bg-rose-500 text-white'}`} aria-hidden>★</span>Senin yolun
          </p>
          <span className={`chip px-3 py-1 text-sm ${t.dark ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'}`}>{myName}{isNew && count > 1 ? ' · yeni!' : ''}</span>
        </div>
        <Trail lines={me.trail} className="mt-2" />
        {estOk !== null && (
          <p className={`mt-2 text-sm font-extrabold ${estOk ? (t.dark ? 'text-emerald-300' : 'text-emerald-700') : t.dark ? 'text-amber-300' : 'text-amber-700'}`}>
            {estOk ? `Tahminin isabetliydi: ${fmtN(p.answer)}, ${p.bench === 0 ? (p.answer > 0 ? 'pozitif' : 'negatif') : `${fmtN(p.bench)} sayısından ${p.answer > p.bench ? 'büyük' : 'küçük'}`}.` : `Tahminini kontrol et: ${fmtN(p.answer)}, ${p.bench === 0 ? (p.answer > 0 ? 'pozitif' : 'negatif') : `${fmtN(p.bench)} sayısından ${p.answer > p.bench ? 'büyük' : 'küçük'}`}. Hangi sayıyı yanlış yuvarlamış olabilirsin?`}
          </p>
        )}
      </Card>

      <Card>
        <p className="mb-3 flex items-center gap-2 text-lg font-black"><MessageCircle size={20} className={t.dark ? 'text-violet-300' : 'text-rose-500'} />Arkadaşların nasıl düşündü?</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {friends.map((f, i) => {
            const picked = q1 === i || q2 === i
            return (
              <button
                key={f.name}
                type="button"
                disabled={q1 !== null && q2 !== null}
                onClick={() => (q1 === null ? setQ1(i) : q2 === null ? setQ2(i) : undefined)}
                className={`flex flex-col gap-2 rounded-3xl p-3 text-left transition active:scale-[.99] ${t.dark ? 'bg-slate-900/70 ring-1 ring-slate-600 hover:ring-cyan-400/60' : 'bg-[linear-gradient(180deg,#fff,#fff8f1)] ring-2 ring-amber-100 hover:ring-rose-200'} ${picked ? (t.dark ? '!ring-2 !ring-cyan-300' : '!ring-rose-400') : ''}`}
                aria-label={`${genitive(f.name)} yolu`}
              >
                <span className="flex items-center gap-2">
                  <span className="grid size-11 place-items-center rounded-full text-2xl" style={{ background: `${f.color}26`, boxShadow: `inset 0 0 0 2px ${f.color}55` }} aria-hidden>{t.dark ? <span className="text-base font-black" style={{ color: f.color }}>{f.name[0]}</span> : f.av}</span>
                  <span className="font-black">{f.name}</span>
                  {revealed && <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-black ${t.dark ? 'bg-slate-700 text-slate-200' : 'bg-amber-100 text-amber-900'}`}>{stratName(f.key, g)}</span>}
                </span>
                <span className={`relative rounded-2xl rounded-tl-sm px-3 py-2 ${t.dark ? 'bg-slate-800 text-slate-100' : 'bg-white text-ink shadow-sm ring-1 ring-line'}`}>
                  {f.steps.map((s, k) => <span key={k} className="block text-base leading-relaxed font-extrabold tabular-nums"><MathText text={s} /></span>)}
                </span>
              </button>
            )
          })}
        </div>

        <div className={`mt-3 rounded-2xl p-3 ${t.soft}`}>
          {q1 === null ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="mr-auto font-black">Hangisi seninkine benziyor? Bir karta dokun.</p>
              <button type="button" onClick={() => setQ1('none')} className={`min-h-12 rounded-2xl px-4 font-extrabold ${t.chip}`}>Hiçbiri, benimki farklı</button>
            </div>
          ) : q2 === null ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="mr-auto font-black">Sence bu problem için en verimli yol hangisi? Bir karta dokun.</p>
              <button type="button" onClick={() => setQ2('me')} className={`min-h-12 rounded-2xl px-4 font-extrabold ${t.chip}`}>Benim yolum</button>
            </div>
          ) : null}
          {q1msg && <Nudge tone={q1msg.ok ? 'ok' : 'think'} question={q1msg.text} />}
          {q2msg && <Nudge tone="think" question={q2msg} />}
        </div>
      </Card>

      {q1 !== null && (
        <div className="flex flex-wrap gap-2">
          {canAnother && (
            <button type="button" onClick={onAnother} className={`inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl px-5 text-lg font-extrabold ${t.chip}`}>
              <RefreshCw size={20} />Başka bir yolla çöz
            </button>
          )}
          <button type="button" onClick={onNext} className="btn-primary min-h-14 flex-1 text-lg">
            {lastProblem ? <><Flag size={20} />Bitir</> : <>Sonraki problem<ArrowRight size={20} /></>}
          </button>
        </div>
      )}
    </div>
  )
}
