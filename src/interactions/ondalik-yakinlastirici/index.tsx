import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Check, Microscope, Search, Sparkles } from 'lucide-react'
import type { InteractionProps } from '../types'
import type { ManipulativeTool } from '../../data/types'
import { Scene, SolutionList, StrategyPicker, useSolutions } from '../../games/kit2'
import { MathText } from '../../components/MathText'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { Derived, Header, Layout, NextButton, Nudge, useFresh, useSession } from '../kesir-duvari/ortak'
import { ZoomSquare, countShade, emptyShade, fillFirst } from './ZoomSquare'
import { ZoomLine } from './ZoomLine'
import { breakdown, chain, decStr, mi, nm, nmEk, words, type G } from './model'
import { numberToWords } from '../../lib/generators'

/**
 * 40. Ondalık Yakınlaştırıcı (4–6)
 * Birim kareye ve sayı doğrusuna "mercekle" yakınlaşınca her onda bir 10 yüzde bire,
 * her yüzde bir 10 binde bire ayrılır (anlamsal yakınlaştırma). Öğrenci boyayarak/yerleştirerek
 * ondalık miktarı kurar; sembol (kesir, ondalık, yüzde) hareketinden türeyerek belirir.
 * 4. sınıf: yalnızca ondalık kesirler ([[3/10]], [[25/100]]); 5: onda/yüzde birler; 6: binde birler.
 */

type Task =
  | { kind: 'shade'; n: number }
  | { kind: 'count'; n: number; per: 100 | 1000; choices: number[] }
  | { kind: 'compare'; a: number; b: number }
  | { kind: 'line'; n: number }
  | { kind: 'between'; lo: number; hi: number; goal: number; on: 'square' | 'line' }

const COLOR = '#0d9488'

function makeTasks(g: G): Task[] {
  if (g === 4)
    return [
      { kind: 'shade', n: 300 },
      { kind: 'count', n: 300, per: 100, choices: [3, 13, 30, 300] },
      { kind: 'shade', n: 70 },
      { kind: 'compare', a: 300, b: 250 },
      { kind: 'line', n: 450 },
      { kind: 'between', lo: 500, hi: 600, goal: 2, on: 'square' },
    ]
  if (g === 5)
    return [
      { kind: 'shade', n: 400 },
      { kind: 'count', n: 400, per: 100, choices: [4, 14, 40, 400] },
      { kind: 'shade', n: 70 },
      { kind: 'compare', a: 300, b: 250 },
      { kind: 'line', n: 620 },
      { kind: 'between', lo: 500, hi: 600, goal: 2, on: 'line' },
    ]
  return [
    { kind: 'shade', n: 250 },
    { kind: 'count', n: 300, per: 1000, choices: [3, 30, 300, 3000] },
    { kind: 'shade', n: 125 },
    { kind: 'compare', a: 125, b: 130 },
    { kind: 'line', n: 375 },
    { kind: 'between', lo: 120, hi: 130, goal: 3, on: 'line' },
  ]
}

function titleOf(t: Task, g: G): string {
  switch (t.kind) {
    case 'shade':
      return g === 4 ? `Birim karenin ${nm(t.n, g)} kadarını boya` : `${nmEk(t.n, g, 'acc')} boya`
    case 'count':
      return `${nm(t.n, g)} kaç ${t.per === 100 ? 'yüzde bir' : 'binde bir'} eder?`
    case 'compare':
      return `Hangisi daha büyük: ${nm(t.a, g)} ${mi(t.a, g)}, ${nm(t.b, g)} ${mi(t.b, g)}?`
    case 'line':
      return `${nmEk(t.n, g, 'acc')} sayı doğrusuna yerleştir`
    case 'between':
      return `${nm(t.lo, g)} ile ${nm(t.hi, g)} arasında sayılar bul`
  }
}

export default function OndalikYakinlastirici({ grade, onFinish }: InteractionProps) {
  const g: G = grade <= 4 ? 4 : grade >= 6 ? 6 : 5
  const tasks = useMemo(() => makeTasks(g), [g])
  const S = useSession(tasks.length)
  const sol = useSolutions()
  const t = tasks[S.idx]
  const goal = (tasks.find((x) => x.kind === 'between') as { goal: number } | undefined)?.goal ?? 2

  const finish = () => {
    const extra = Math.max(0, sol.list.length - goal)
    const insight =
      g === 4
        ? 'Bir onda bir 10 eş parçaya ayrılınca yüzde birler oluşur: [[3/10]] = [[30/100]]. Bu yüzden [[3/10]], [[25/100]]’ten büyüktür; paydaki sayının büyüklüğüne değil, parçaların büyüklüğüne bakarız.'
        : g === 5
          ? 'Yakınlaştırınca her onda bir 10 yüzde bire ayrılır: 0,3 = 0,30. 0,3 ile 0,25’i aynı birimle karşılaştırınca 30 yüzde bir > 25 yüzde bir; basamak sayısı değil, basamak değeri önemlidir.'
          : 'Her basamak bir öncekinin onda biridir: 0,13 = 0,130 > 0,125. İki ondalık arasında her zaman başka ondalıklar vardır; yakınlaştırdıkça yenileri belirir.'
    onFinish({
      stars: S.stars(Math.min(1, extra * 0.5)),
      summary: `${tasks.length} görevi tamamladın${sol.list.length ? `, iki sayı arasında ${sol.list.length} farklı sayı buldun` : ''}.`,
      insight,
    })
  }

  const footer = S.done ? <NextButton isLast={S.isLast} onNext={S.next} onFinish={finish} /> : null
  const common = { g, complete: S.complete, done: S.done, footer }

  return (
    <Scene grade={grade}>
      <Header
        icon={<Microscope size={22} />}
        color={COLOR}
        idx={S.idx}
        total={tasks.length}
        title={titleOf(t, g)}
        extra={sol.list.length > 0 ? <span className="chip bg-amber-100 px-3 py-1 text-sm text-amber-900 ring-1 ring-amber-200"><Sparkles size={14} />{sol.list.length} sayı</span> : undefined}
      />
      {t.kind === 'shade' && <ShadeTask key={S.idx} t={t} {...common} />}
      {t.kind === 'count' && <CountTask key={S.idx} t={t} {...common} />}
      {t.kind === 'compare' && <CompareTask key={S.idx} t={t} {...common} />}
      {t.kind === 'line' && <LineTask key={S.idx} t={t} {...common} />}
      {t.kind === 'between' && <BetweenTask key={S.idx} t={t} sol={sol} {...common} />}
    </Scene>
  )
}

type Common = { g: G; complete: (first: boolean) => void; done: boolean; footer: ReactNode }
type NudgeState = { q: string; mis?: string; tool?: ManipulativeTool } | null

const maxLevelFor = (g: G): 2 | 3 => (g === 6 ? 3 : 2)

/* ───────────────────────── ortak parçalar ───────────────────────── */

/** Boyanan miktarın tüm adları (hareketten türeyen sembol) */
function Names({ n, g, title = 'Boyadığın miktar' }: { n: number; g: G; title?: string }) {
  const c = chain(n, g)
  return (
    <div className="rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-inner" aria-live="polite" data-testid="names">
      <p className="text-[11px] font-black tracking-wide text-teal-300 uppercase">{title}</p>
      {n === 0 ? (
        <p className="mt-1 text-base font-bold text-slate-300">Henüz boyalı parça yok.</p>
      ) : (
        <>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xl font-black">
            {c.map((s, i) => (
              <span key={s} className="inline-flex items-center gap-2">
                {i > 0 && <span className="text-slate-400">=</span>}
                <MathText text={s} />
              </span>
            ))}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-300">{g === 4 ? `${words(n)} · ` : ''}{breakdown(n)}</p>
        </>
      )}
    </div>
  )
}

function Prompt({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl bg-white/95 px-4 py-3 text-base leading-snug font-extrabold ring-1 ring-line">{typeof children === 'string' ? <MathText text={children} /> : children}</div>
}

function CheckBtn({ onClick, disabled, children = 'Kontrol et' }: { onClick: () => void; disabled?: boolean; children?: ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="btn-primary min-h-14 w-full text-lg" data-testid="check">
      <Check size={20} />{children}
    </button>
  )
}

/* ───────────────────────── 1. Boya ───────────────────────── */

function shadeFeedback(n: number, T: number, g: G, wrongs: number): NudgeState {
  if (n === 0) return { q: `Henüz hiç boyamadın. ${nm(T, g)} kaç ${T % 100 === 0 ? 'onda bir' : T % 10 === 0 ? 'yüzde bir' : 'binde bir'} demek? Parmağını parçaların üzerinde gezdir.` }
  if (n === T * 10)
    return {
      q: `Boyadığın miktar ${nm(n, g)}. ${nm(T, g)} bundan 10 kat küçük. Bir onda biri yakınlaştırınca kaç eş parça görüyorsun?`,
      mis: g === 4 ? `${nm(T, g)} ile ${nm(n, g)} kesirlerini karıştırdı (paydaya bakmadı)` : `Basamak değerini karıştırdı: ${nm(T, g)} yerine ${nm(n, g)} boyadı`,
      tool: g === 4 ? undefined : 'yuzdeizgarasi',
    }
  if (n * 10 === T)
    return {
      q: `${nm(n, g)} boyadın; bu çok küçük bir miktar. ${nm(T, g)} kaç tane ${T % 100 === 0 ? 'şerit (onda bir)' : 'yüzde bir'} eder?`,
      mis: 'Onda bir ile yüzde birin büyüklüğünü karıştırdı',
    }
  if (n > T) return { q: `Şu an ${nm(n, g)} boyalı; bu ${nmEk(T, g, 'abl')} fazla. Hangi parçaları silersin? Gerekirse yakınlaştırıp küçük parçalarla düzelt.` }
  if (wrongs >= 1) return { q: `${nm(T, g)} = ${breakdown(T)}. Şu an ${nm(n, g)} boyalı. Hangi parçalar eksik?`, tool: g === 4 ? undefined : 'yuzdeizgarasi' }
  return { q: `Şu an ${nm(n, g)} boyalı. ${nmEk(T, g, 'dat')} ulaşmak için kaç onda bir, kaç yüzde bir${g === 6 ? ', kaç binde bir' : ''} daha gerekiyor? Gerekirse yakınlaştır.` }
}

function ShadeTask({ t, g, complete, done, footer }: Common & { t: { n: number } }) {
  const track = useTracker()
  const [v, setV] = useState(emptyShade)
  const [nudge, setNudge] = useState<NudgeState>(null)
  const [wrongs, setWrongs] = useState(0)
  const n = countShade(v)
  const needs = t.n % 10 !== 0 ? 3 : t.n % 100 !== 0 ? 2 : 1

  const check = () => {
    if (n === t.n) {
      track.attempt(true)
      track.item(wrongs === 0)
      if (needs > 1) track.strategy(needs === 3 ? 'Binde birlere kadar yakınlaştırdı' : 'Yüzde birlere yakınlaştırdı')
      sfx.ok()
      setNudge(null)
      complete(wrongs === 0)
      return
    }
    track.attempt(false)
    const f = shadeFeedback(n, t.n, g, wrongs)
    if (wrongs >= 1) track.hint()
    setWrongs((w) => w + 1)
    setNudge(f)
  }

  const intro =
    needs === 1
      ? `Bütün kare 1. Her şerit ${g === 4 ? '[[1/10]]' : '0,1'}, yani bir onda bir. Şeritlere dokunarak ya da parmağını gezdirerek boya.`
      : needs === 2
        ? `${nm(t.n, g)} bir şeritten ${t.n < 100 ? 'küçük' : 'büyük'}. İki parmakla (ya da “yüzde bir” düğmesiyle) yakınlaştır: şeritler küçük karelere ayrılır.`
        : `${nm(t.n, g)} = ${breakdown(t.n)}. En küçük parçalar için binde birlere kadar yakınlaştır.`

  return (
    <Layout
      work={<ZoomSquare value={v} onChange={done ? undefined : (x) => { setV(x); setNudge(null) }} locked={done} maxLevel={maxLevelFor(g)} g={g} testid="sq" />}
      panel={
        <>
          <Prompt>{intro}</Prompt>
          <Names n={n} g={g} />
          {!done && <CheckBtn onClick={check} />}
          {nudge && !done && <Nudge question={nudge.q} misconception={nudge.mis} tool={nudge.tool} onClose={() => setNudge(null)} />}
          {done && <Derived>{`${chain(t.n, g).join(' = ')}${g === 4 ? ` · ${words(t.n)}` : ''}`}</Derived>}
          {done && needs > 1 && <p className="text-sm font-bold text-ink-soft">Yakınlaştırınca parçalar küçüldü ama bütün aynı kaldı: {needs === 2 ? 'her onda bir = 10 yüzde bir' : 'her yüzde bir = 10 binde bir'}.</p>}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 2. Say (aynı miktar, daha küçük birim) ───────────────────────── */

function CountTask({ t, g, complete, done, footer }: Common & { t: { n: number; per: 100 | 1000; choices: number[] } }) {
  const track = useTracker()
  const [seen, setSeen] = useState(1)
  const [nudge, setNudge] = useState<NudgeState>(null)
  const [wrongs, setWrongs] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const v = useMemo(() => fillFirst(t.n), [t.n])
  const need = t.per === 100 ? 2 : 3
  const ready = seen >= need
  const answer = t.per === 100 ? t.n / 10 : t.n
  const unit = t.per === 100 ? 'yüzde bir' : 'binde bir'
  const onLevel = useCallback((l: number) => setSeen((s) => Math.max(s, l)), [])

  const pick = (c: number) => {
    setPicked(c)
    if (c === answer) {
      track.attempt(true)
      track.item(wrongs === 0)
      sfx.ok()
      setNudge(null)
      complete(wrongs === 0)
      return
    }
    track.attempt(false)
    setWrongs((w) => w + 1)
    if (wrongs >= 1) track.hint()
    const tenths = t.n / 100
    if (c === tenths)
      setNudge({ q: `${c} tane şerit var, doğru. Ama soru ${unit} soruyor. Yakınlaştırınca bir şerit kaç ${unit} oluyor?`, mis: 'Farklı büyüklükteki birimleri aynı saydı (onda bir = yüzde bir sandı)' })
    else if (c > answer) setNudge({ q: `Bir şeritte kaç ${unit} var? ${tenths} şeritte kaç tane olur? ${c} çok fazla değil mi?` })
    else setNudge({ q: `Yakınlaştırıp bir şeridin ${t.per === 100 ? 'kaç küçük kareye' : 'kaç ince dilime'} ayrıldığını say. ${tenths} şerit için bu kaç eder?` })
  }

  return (
    <Layout
      work={<ZoomSquare value={v} maxLevel={maxLevelFor(g)} g={g} locked onLevel={onLevel} testid="sq" />}
      panel={
        <>
          <Prompt>{`Karede ${nm(t.n, g)} boyalı (${t.n / 100} şerit). Mercekle yakınlaştır: ${t.per === 100 ? 'her şerit küçük karelere' : 'şeritler önce karelere, sonra ince dilimlere'} ayrılır. Aynı miktar kaç ${unit}?`}</Prompt>
          {!ready && (
            <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-extrabold text-amber-900 ring-1 ring-amber-200">
              <Search size={18} className="shrink-0" />Önce yakınlaştır: {unit === 'yüzde bir' ? 'yüzde birler' : 'binde birler'} görünsün (iki parmak ya da aşağıdaki düğme).
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {t.choices.map((c) => (
              <button
                key={c}
                type="button"
                disabled={!ready || done}
                onClick={() => pick(c)}
                data-testid={`choice-${c}`}
                className={`min-h-14 rounded-2xl text-2xl font-black ring-1 transition active:scale-95 ${done && c === answer ? 'bg-ok text-white ring-ok' : 'disabled:opacity-45 '}${done && c === answer ? '' : picked === c && !done ? 'bg-amber-100 ring-amber-300' : 'bg-white ring-line hover:bg-paper'}`}
              >
                {c}
              </button>
            ))}
          </div>
          {nudge && !done && <Nudge question={nudge.q} misconception={nudge.mis} onClose={() => setNudge(null)} />}
          {done && (
            <>
              <Derived>{chain(t.n, g).filter((s) => (g === 6 ? true : !s.includes('1000'))).join(' = ')}</Derived>
              <p className="text-sm font-bold text-ink-soft">Miktar değişmedi; aynı şeyi daha küçük birimlerle saydık. {g >= 5 ? <MathText text={`${nm(t.n, g)} ile ${decStr(t.n, t.per === 100 ? 2 : 3)} aynı sayıdır: sondaki sıfır yeni bir miktar eklemez, birimi küçültür.`} /> : `${words(t.n)} = yüzde ${numberToWords(t.n / 10)}.`}</p>
            </>
          )}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 3. Karşılaştır ───────────────────────── */

function CompareTask({ t, g, complete, done, footer }: Common & { t: { a: number; b: number } }) {
  const track = useTracker()
  const [pred, setPred] = useState<'a' | 'b' | 'eq' | null>(null)
  const [va, setVa] = useState(emptyShade)
  const [vb, setVb] = useState(emptyShade)
  const [picked, setPicked] = useState(false)
  const na = countShade(va), nb = countShade(vb)
  const right: 'a' | 'b' | 'eq' = t.a > t.b ? 'a' : t.b > t.a ? 'b' : 'eq'
  const proven = na === t.a && nb === t.b
  // Kanıt tamamlanınca parçaları sütun sütun düzenle: yan yana karşılaştırma kolaylaşsın
  useEffect(() => {
    if (!proven) return
    setVa(fillFirst(t.a))
    setVb(fillFirst(t.b))
  }, [proven, t.a, t.b])
  const big = right === 'a' ? t.a : t.b, small = right === 'a' ? t.b : t.a
  const unitDen = g === 6 ? 1000 : 100

  const predict = (p: 'a' | 'b' | 'eq') => {
    setPred(p)
    track.attempt(p === right)
    if (p !== right) {
      const longer = String(t.a).replace(/0+$/, '').length < String(t.b).replace(/0+$/, '').length ? 'b' : 'a'
      if (p === longer) track.misconception(g === 4 ? `Payı büyük olan ondalık kesir daha büyüktür sandı (${nm(t.b, g)} > ${nm(t.a, g)})` : 'Basamak sayısı çok olan ondalık daha büyüktür sandı')
      else if (p === 'eq') track.misconception('Farklı ondalıkları eşit sandı')
    }
  }

  const finishTask = () => {
    if (done) return
    track.item(pred === right)
    complete(pred === right)
  }

  const sameUnit = (n: number) => (unitDen === 100 ? n / 10 : n)
  const unitWord = unitDen === 100 ? 'yüzde bir' : 'binde bir'

  return (
    <Layout
      work={
        <div className="grid gap-4 sm:grid-cols-2">
          {([['a', t.a, va, setVa, '#14b8a6'], ['b', t.b, vb, setVb, '#f59e0b']] as const).map(([k, target, v, set, col]) => {
            const n = countShade(v)
            return (
              <div key={k} className="flex flex-col gap-2">
                <p className="text-center text-xl font-black" style={{ color: col === '#14b8a6' ? '#0f766e' : '#b45309' }}><MathText text={nm(target, g)} /></p>
                <ZoomSquare value={v} onChange={pred && !proven ? set : undefined} locked={proven} maxLevel={maxLevelFor(g)} g={g} size="md" color={col} testid={`sq-${k}`} disabledNote={pred ? undefined : 'Önce tahmin et'} />
                {pred && (
                  <p className={`rounded-xl px-3 py-1.5 text-center text-sm font-black ${n === target ? 'bg-ok-soft text-green-900' : n > target ? 'bg-amber-50 text-amber-900' : 'bg-white text-ink-soft ring-1 ring-line'}`}>
                    {n === target ? <>✓ <MathText text={`${nm(target, g)} hazır`} /></> : n === 0 ? <MathText text={`${nmEk(target, g, 'acc')} boya`} /> : <MathText text={`Şu an ${nm(n, g)}${n > target ? ' · fazla oldu' : ''}`} />}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      }
      panel={
        <>
          {!pred && (
            <>
              <Prompt>Önce tahmin et: hangisi birim karede daha çok yer kaplar?</Prompt>
              <div className="grid grid-cols-2 gap-2">
                {(['a', 'b'] as const).map((k) => (
                  <button key={k} type="button" onClick={() => predict(k)} data-testid={`pred-${k}`} className="min-h-20 rounded-2xl bg-white text-3xl font-black ring-2 ring-line transition hover:ring-teal-400 active:scale-95">
                    <MathText text={nm(k === 'a' ? t.a : t.b, g)} />
                  </button>
                ))}
                <button type="button" onClick={() => predict('eq')} data-testid="pred-eq" className="col-span-2 min-h-12 rounded-2xl bg-white text-lg font-black ring-1 ring-line active:scale-95">İkisi eşit</button>
              </div>
            </>
          )}
          {pred && !proven && (
            <Prompt>{`Tahminin: ${pred === 'eq' ? 'eşit' : nm(pred === 'a' ? t.a : t.b, g) + ' daha büyük'}. Şimdi kanıtla: iki kareyi de boya. Küçük parçalar için yakınlaştırmayı unutma.`}</Prompt>
          )}
          {pred && <Names n={na} g={g} title={`Sol kare (${nm(t.a, g).replace(/\[\[|\]\]/g, '')})`} />}
          {pred && <Names n={nb} g={g} title={`Sağ kare (${nm(t.b, g).replace(/\[\[|\]\]/g, '')})`} />}
          {proven && (
            <>
              <Derived>{`${nm(big, g)} > ${nm(small, g)}`}</Derived>
              <p className="text-sm font-bold text-ink-soft">Boyalı parçaları soldan sağa düzenledik; iki kareyi yan yana karşılaştır.</p>
              <p className="rounded-2xl bg-white/95 px-3 py-2 text-sm font-bold text-ink ring-1 ring-line">
                <MathText text={`Aynı birimle say: ${nm(t.a, g)} = ${sameUnit(t.a)} ${unitWord}, ${nm(t.b, g)} = ${sameUnit(t.b)} ${unitWord}. ${Math.max(sameUnit(t.a), sameUnit(t.b))} > ${Math.min(sameUnit(t.a), sameUnit(t.b))}.`} />
              </p>
              {pred !== right && (
                <Nudge
                  question={`Tahminin ${pred === 'eq' ? 'eşit' : nm(pred === 'a' ? t.a : t.b, g)} idi. Model ne gösteriyor? ${g === 4 ? 'Paydaki sayı büyük diye kesir büyük olur mu? Parçaların büyüklüğüne bak.' : 'Basamak sayısı çok olan sayı her zaman büyük müdür? Önce onda birlere bak.'}`}
                  tool={g === 4 ? undefined : 'kesirdogrusu'}
                />
              )}
              {pred === right && <Nudge tone="ok" question="Tahminin modelle doğrulandı!" />}
              {!picked && (
                <StrategyPicker
                  question="Nasıl düşündün?"
                  options={[g === 4 ? 'Onda birlere (şeritlere) baktım' : 'Önce onda birlere baktım', g === 6 ? 'Aynı birimle (binde birlerle) düşündüm' : 'Aynı birimle (yüzde birlerle) düşündüm', 'Modeli boyayınca gördüm', 'Tahmin ettim']}
                  onPick={() => {
                    setPicked(true)
                    finishTask()
                  }}
                />
              )}
            </>
          )}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 4. Sayı doğrusuna yerleştir ───────────────────────── */

function LineTask({ t, g, complete, done, footer }: Common & { t: { n: number } }) {
  const track = useTracker()
  const [x, setX] = useState(0)
  const [nudge, setNudge] = useState<NudgeState>(null)
  const [wrongs, setWrongs] = useState(0)
  const [moved, setMoved] = useState(false)

  const check = () => {
    if (x === t.n) {
      track.attempt(true)
      track.item(wrongs === 0)
      sfx.ok()
      setNudge(null)
      complete(wrongs === 0)
      return
    }
    track.attempt(false)
    if (wrongs >= 1) track.hint()
    setWrongs((w) => w + 1)
    const needFine = t.n % 10 !== 0 ? 'binde birler' : t.n % 100 !== 0 ? 'yüzde birler' : ''
    if (x * 10 === t.n || x === t.n * 10) setNudge({ q: `Noktan ${nm(x, g)} üzerinde. ${nm(t.n, g)} ile ${nm(x, g)} arasında 10 kat fark var. ${nm(t.n, g)} hangi iki onda birin arasında?`, mis: 'Ondalıkta basamak değerini karıştırdı' })
    else if (wrongs >= 1) setNudge({ q: `${nm(t.n, g)} = ${breakdown(t.n)}. Önce onda birleri say, sonra o aralığı büyütüp ${needFine || 'çentikleri'} say.`, tool: 'kesirdogrusu' })
    else setNudge({ q: `Noktan şu an ${nm(x, g)} üzerinde. ${nm(t.n, g)} hangi iki onda birin arasında? O aralığı yakınlaştır${needFine ? `; ${needFine} görünsün` : ''}.` })
  }

  return (
    <Layout
      work={
        <div className="rounded-3xl bg-white/80 p-3 ring-1 ring-line">
          <ZoomLine x={x} setX={(n) => { setX(n); setMoved(true); setNudge(null) }} g={g} maxDec={g === 6 ? 3 : 2} showValue={done} />
        </div>
      }
      panel={
        <>
          <Prompt>{`Noktayı ${nmEk(t.n, g, 'dat')} götür. Doğruda sadece onda birler görünüyor; iki parmakla yakınlaştır ya da “onda birini büyüt” düğmesine bas. Her aralık 10 eş parçaya ayrılır.`}</Prompt>
          {!done && <CheckBtn onClick={check} disabled={!moved} />}
          {nudge && !done && <Nudge question={nudge.q} misconception={nudge.mis} tool={nudge.tool} onClose={() => setNudge(null)} />}
          {done && (
            <>
              <Derived>{chain(t.n, g).join(' = ')}</Derived>
              <p className="text-sm font-bold text-ink-soft">{breakdown(t.n)}: önce onda birlik aralığı buldun, sonra o aralığı büyütüp daha küçük parçaları saydın.</p>
            </>
          )}
          {footer}
        </>
      }
    />
  )
}

/* ───────────────────────── 5. Arasında bir sayı bul (açık uçlu) ───────────────────────── */

function BetweenTask({ t, g, complete, done, footer, sol }: Common & { t: { lo: number; hi: number; goal: number; on: 'square' | 'line' }; sol: ReturnType<typeof useSolutions> }) {
  const track = useTracker()
  const fresh = useFresh(sol)
  const [v, setV] = useState(() => fillFirst(t.lo))
  const [x, setX] = useState(t.lo)
  const [nudge, setNudge] = useState<NudgeState>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [wrongs, setWrongs] = useState(0)
  const [found, setFound] = useState(0)
  const n = t.on === 'square' ? countShade(v) : x
  const sub = t.hi - t.lo === 100 ? 'yüzde birler' : 'binde birler'

  const save = () => {
    setOk(null)
    if (n > t.lo && n < t.hi) {
      const isNew = fresh(`b${n}`, nm(n, g))
      track.attempt(true)
      if (!isNew) {
        setNudge({ q: `${nm(n, g)} sayısını zaten buldun. Başka bir tane var mı? Aralıkta kaç tane ${sub.replace('ler', '')} var?` })
        return
      }
      setNudge(null)
      setOk(`${nm(t.lo, g)} < ${nm(n, g)} < ${nm(t.hi, g)}`)
      const f = found + 1
      setFound(f)
      if (f === 1) track.strategy(t.on === 'square' ? 'Yüzde birlerle boyayarak buldu' : 'Aralığı yakınlaştırarak buldu')
      if (f >= t.goal && !done) {
        track.item(wrongs === 0)
        complete(wrongs === 0)
      }
      return
    }
    track.attempt(false)
    setWrongs((w) => w + 1)
    if (n === t.lo || n === t.hi) setNudge({ q: `${nm(n, g)} sınırın tam üstünde; aradaki sayılar ondan büyük ve ${nmEk(t.hi, g, 'abl')} küçük olmalı. Bu iki sayının arası yakınlaşınca neye ayrılıyor?` })
    else if (n < t.lo) setNudge({ q: `${nm(n, g)}, ${nmEk(t.lo, g, 'abl')} küçük. Biraz daha ${t.on === 'square' ? 'boya' : 'sağa git'}; ama ${nmEk(t.hi, g, 'dat')} ulaşma.` })
    else setNudge({ q: `${nm(n, g)}, ${nmEk(t.hi, g, 'abl')} büyük. ${nm(t.lo, g)} ile ${nm(t.hi, g)} arasında kalmak için ${sub} gerekir. Yakınlaştırdın mı?`, mis: t.on === 'line' && g === 6 ? 'İki ondalık arasında başka sayı olmadığını düşündü' : undefined })
  }

  return (
    <Layout
      work={
        t.on === 'square' ? (
          <ZoomSquare value={v} onChange={(z) => { setV(z); setOk(null); setNudge(null) }} maxLevel={maxLevelFor(g)} g={g} testid="sq" />
        ) : (
          <div className="rounded-3xl bg-white/80 p-3 ring-1 ring-line">
            <ZoomLine x={x} setX={(z) => { setX(z); setOk(null); setNudge(null) }} g={g} maxDec={g === 6 ? 3 : 2} showValue />
          </div>
        )
      }
      panel={
        <>
          <Prompt>
            {t.on === 'square'
              ? `Karede ${nm(t.lo, g)} boyalı. ${nmEk(t.lo, g, 'abl')} büyük ama ${nmEk(t.hi, g, 'abl')} küçük bir miktar boya ve kaydet. Şeritlere dokunursan çok büyük adımlar atarsın; ne yapmalısın?`
              : `${nm(t.lo, g)} ile ${nm(t.hi, g)} arasında başka sayı var mı? Noktayı arasına götür ve kaydet. En az ${t.goal} farklı sayı bul. İpucu: aralığı büyüt.`}
          </Prompt>
          {t.on === 'square' && <Names n={n} g={g} />}
          <CheckBtn onClick={save}>Bu sayıyı kaydet</CheckBtn>
          {ok && <Derived>{ok}</Derived>}
          {nudge && <Nudge question={nudge.q} misconception={nudge.mis} onClose={() => setNudge(null)} />}
          <SolutionList list={sol.list} goal={t.goal} />
          {done && <p className="text-sm font-bold text-ink-soft">{found > t.goal ? 'Harika, hedefin ötesine geçtin! ' : ''}Daha fazla da bulabilirsin: her aralık yakınlaştırınca yeniden 10 parçaya ayrılır, sayılar hiç bitmez.</p>}
          {footer}
        </>
      }
    />
  )
}
