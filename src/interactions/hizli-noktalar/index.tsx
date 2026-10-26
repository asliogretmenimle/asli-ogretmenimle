import { useEffect, useMemo, useRef, useState } from 'react'
import { Eye, Paintbrush, RotateCcw } from 'lucide-react'
import type { Grade } from '../../data/types'
import { StrategyPicker } from '../../games/kit2'
import type { InteractionProps } from '../types'
import { ek } from '../../lib/generators'
import { ActivityLayout, DoneNote, NumPad, parseNum, pick, useNudge, useSession } from './kit'
import { BuildFrame, cardTotal, DotCard, layout, PAINT, type Card } from './cards'

/**
 * 22. Hızlı Noktalar — Van de Walle “quick images”: kısa süre gösterilen nokta düzenini saymadan tanı,
 * 5 ve 10 çapalarını, ikizleri ve parça-parça-bütün ilişkisini kullan.
 *  1. sınıf: zar yüzü, onluk çerçeve (5’lik sıra), iki renk (parça-parça-bütün), çerçeveyi yeniden kurma, ikizler, 10 ve fazlası.
 *  2. sınıf: yirmilik çerçevede 10’a tamamlama, abaküs sıraları (5 + 5), onluk çerçevelerle onar sayma, beşli gruplar,
 *            “kaç boş?” (20’ye tamamlama), ikişer gruplar.
 * Doğru cevaptan sonra öğrenci gördüğü parçaları parmağıyla boyar → eşitlik kendiliğinden belirir; sonra “Nasıl gördün?”.
 */

type Mode = 'count' | 'rebuild' | 'empty'
interface Task {
  card: Card
  mode: Mode
  title: string
  prompt: string
  strategies: string[]
  nudges: string[]
  note: string
}

const frameSize = (c: Card): 10 | 20 => (c.kind === 'frame' ? c.size : 10)

function makeTasks(grade: Grade): Task[] {
  if (grade <= 1) {
    const dice = pick([4, 5, 6])
    const f10 = pick([7, 8, 9])
    const a = pick([4, 5, 6]), b = pick([2, 3])
    const rb = pick([6, 7, 8].filter((x) => x !== f10))
    const d = pick([3, 4, 5]), dd = pick([0, 1])
    const t = pick([3, 4, 5, 6])
    return [
      { card: { kind: 'dice', n: dice }, mode: 'count', title: 'Zar yüzü', prompt: 'Bir zar yüzü kısa bir süre görünecek. Kaç nokta var? Tek tek sayma, şekline bak!', strategies: ['Zar yüzü gibi tanıdım', 'İki gruba ayırdım', 'Tek tek saydım'], nudges: ['Zarın köşelerinde nokta var mıydı? Ya ortada?', 'Bir daha bak: kaç köşe dolu, ortada nokta var mı?'], note: 'Zar yüzlerini saymadan tanıyabiliyoruz: şekil bize sayıyı söylüyor.' },
      { card: { kind: 'frame', n: f10, size: 10 }, mode: 'count', title: 'Onluk çerçeve', prompt: 'Onluk çerçevede üst sıra 5 kişilik, alt sıra da 5 kişilik. Kaç nokta var?', strategies: ['Üst sıra 5, altta birkaç', '10’dan birkaç eksik', 'Tek tek saydım'], nudges: ['Üst sıra dolu muydu? Dolu bir sıra kaç eder?', 'Alt sırada kaç boş kutu vardı? 10’dan eksikleri düşün.'], note: `${f10} = 5 + ${f10 - 5}. Ayrıca ${f10}, 10’dan ${10 - f10} eksik!` },
      { card: { kind: 'frame', n: a + b, size: 10, split: a }, mode: 'count', title: 'İki renk', prompt: 'Kırmızı ve mavi noktalar! Hepsi kaç tane?', strategies: ['Kırmızılar ve maviler', '5 ve fazlası', 'Tek tek saydım'], nudges: ['Kaç kırmızı, kaç mavi vardı?', 'Kırmızıların sayısına mavileri ekle. Üst sıra dolu muydu?'], note: `${a} kırmızı ve ${b} mavi: ${a} + ${b} = ${a + b}. İki parça bir bütün yapar.` },
      { card: { kind: 'frame', n: rb, size: 10 }, mode: 'rebuild', title: 'Yeniden kur', prompt: 'Bu kez gördüğünü boş çerçevede yeniden yap! Kutulara dokunarak nokta koy.', strategies: ['Üst sırayı doldurdum, sonra alt sıra', 'Boşlukları hatırladım', 'Tek tek koydum'], nudges: ['Üst sıra tamamen dolu muydu?', 'Alt sırada kaç nokta vardı? Bir daha bakmak ister misin?'], note: `${rb} = 5 + ${rb - 5}: dolu bir sıra ve ${rb - 5} tane daha.` },
      { card: { kind: 'domino', a: d, b: d + dd }, mode: 'count', title: 'Domino', prompt: 'İki zar yan yana! Toplam kaç nokta var?', strategies: ['İkizler', 'İkizlerin bir fazlası', 'İki zarı topladım', 'Tek tek saydım'], nudges: ['İki zar aynı mıydı? İkizleri düşün.', `Bir zarda ${d} nokta vardı. Diğerinde kaç?`], note: dd ? `${d} + ${d + 1}: ikizlerin bir fazlası! ${d} + ${d} = ${2 * d}, bir de 1 → ${2 * d + 1}.` : `${d} + ${d} = ${2 * d}: ikizler!` },
      { card: { kind: 'frame', n: 10 + t, size: 20 }, mode: 'count', title: '10 ve fazlası', prompt: 'İki onluk çerçeve! Kaç nokta var?', strategies: ['10 ve fazlası', 'Dolu çerçeveye alttakileri ekledim', 'Tek tek saydım'], nudges: ['Üstteki çerçeve tamamen dolu muydu? Dolu bir çerçeve kaç eder?', `10 ve kaç tane daha? Alt çerçevede üst sıra dolu muydu?`], note: `10 + ${t} = ${10 + t}: bir dolu onluk ve ${t} tane daha.` },
    ]
  }
  const a = pick([8, 9]), b = pick([5, 6, 7])
  const top = pick([6, 7, 8]), bottom = top + pick([-1, 0, 1])
  const full = pick([2, 3, 4]), extra = pick([3, 4, 6, 7])
  const g = pick([3, 4]), ge = pick([2, 3, 4])
  const rb = pick([12, 13, 16, 17])
  const em = pick([13, 14, 15, 16].filter((x) => x !== rb))
  const pr = pick([6, 7, 8])
  return [
    { card: { kind: 'frame', n: a + b, size: 20, split: a }, mode: 'count', title: '10’a tamamla', prompt: 'Yirmilik çerçevede kırmızılar ve maviler. Hepsi kaç tane? Saymadan bulmaya çalış!', strategies: ['10’a tamamladım', 'İkizlere yakın', 'Kırmızılar ve maviler', 'Tek tek saydım'], nudges: [`Kırmızıları 10 yapmak için kaç mavi gerekir?`, 'Önce 10 yap, sonra kalan maviler kaç?'], note: `${a} + ${b} = 10 + ${a + b - 10}. ${10 - a} mavi kırmızıları 10’a tamamlıyor!` },
    { card: { kind: 'rek', top, bottom }, mode: 'count', title: 'Abaküs', prompt: 'Abaküste iki sırada boncuklar sola itildi. Solda kaç boncuk var?', strategies: ['Her sırada 5 ve fazlası', 'İkizlere yakın', '5 ile 5 = 10, sonra fazlası', 'Tek tek saydım'], nudges: ['Her sırada 5 kırmızı vardı. İki 5 kaç eder?', 'Beyaz boncuklar kaç tane? Onları 10’a ekle.'], note: `${top} + ${bottom} = 5 + 5 + ${top - 5} + ${bottom - 5} = 10 + ${top + bottom - 10}.` },
    { card: { kind: 'tens', full, extra }, mode: 'count', title: 'Onar onar', prompt: 'Çerçeveler! Kaç nokta var? Dolu çerçevelere dikkat.', strategies: ['Onar saydım', '10, 20, 30… sonra birler', 'Tek tek saydım'], nudges: ['Kaç dolu çerçeve vardı? Her biri 10.', 'Dolu çerçeveleri onar say, sonra son çerçevedekileri ekle.'], note: `${full} tane 10 ve ${extra} tane 1: ${full * 10 + extra}.` },
    { card: { kind: 'fives', groups: g, extra: ge }, mode: 'count', title: 'Beşli gruplar', prompt: 'Kutularda zar beşleri var. Toplam kaç nokta?', strategies: ['Beşer saydım', 'İki beşi 10 yaptım', 'Tek tek saydım'], nudges: ['Her kırmızı kutuda 5 nokta vardı. 5, 10, 15… diye say.', 'Mavi kutuda kaç nokta vardı?'], note: `${Array.from({ length: g }, (_, i) => 5 * (i + 1)).join(', ')} ve ${ge} daha: ${g * 5 + ge}.` },
    { card: { kind: 'frame', n: rb, size: 20 }, mode: 'rebuild', title: 'Yeniden kur', prompt: 'Gördüğünü boş yirmilik çerçevede yeniden yap! Kutulara dokunarak nokta koy.', strategies: ['Üst çerçeveyi doldurdum, sonra alttakiler', '10 ve fazlası', 'Tek tek koydum'], nudges: ['Üstteki çerçeve tamamen dolu muydu?', 'Alt çerçevede kaç nokta vardı? Üst sırası dolu muydu?'], note: `${rb} = 10 + ${rb - 10}.` },
    { card: { kind: 'frame', n: em, size: 20 }, mode: 'empty', title: 'Kaç boş?', prompt: 'Dikkat, soru değişti! Bu kez kaç kutu BOŞ? Kaç nokta daha gelirse çerçeveler dolar?', strategies: ['Boşları bir bakışta gördüm', '20’den geri saydım', `${ek(em, 'abl')} 20’ye ileri saydım`], nudges: ['Dolu olanları değil, boş kutuları soruyoruz. Alt çerçevede kaç boş vardı?', '20’ye tamamlamak için kaç nokta gerekir?'], note: `${em} + ${20 - em} = 20. Boş kutular, 20’ye tamamlayan parça!` },
    { card: { kind: 'pairs', pairs: pr }, mode: 'count', title: 'Çift çift', prompt: 'Çorap çiftleri gibi ikişer nokta! Kaç nokta var?', strategies: ['İkişer saydım', 'Sıraları topladım', 'Tek tek saydım'], nudges: ['Her kutuda 2 nokta vardı. Kaç kutu vardı?', '2, 4, 6… diye ikişer say.'], note: `${pr} tane 2: ${Array.from({ length: pr }, (_, i) => 2 * (i + 1)).join(', ')}.` },
  ]
}

type Phase = 'ready' | 'flash' | 'answer' | 'seen'

export default function HizliNoktalar({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade), [grade])
  const S = useSession(tasks.length)
  const T = tasks[S.idx]
  const total = cardTotal(T.card)
  const size = frameSize(T.card)
  const expected = T.mode === 'empty' ? size - total : total
  const flashMs = grade <= 1 ? 2200 : 1600
  const { nudge, show, clear } = useNudge()
  const [phase, setPhase] = useState<Phase>('ready')
  const [value, setValue] = useState('')
  const [fails, setFails] = useState(0)
  const [built, setBuilt] = useState<boolean[]>(() => Array(20).fill(false))
  const [paint, setPaint] = useState<(number | null)[]>([])
  const [brush, setBrush] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [flashKey, setFlashKey] = useState(0)
  const [say, setSay] = useState('Hazır olunca “Göster”e dokun. Noktalar kısa bir süre görünecek!')
  const stats = useRef({ counted: 0, structure: 0, strategies: [] as string[] })
  const showAlways = fails >= 2

  useEffect(() => {
    if (phase !== 'flash') return
    const id = window.setTimeout(() => setPhase('answer'), flashMs)
    return () => window.clearTimeout(id)
  }, [phase, flashMs, flashKey])

  const flash = () => {
    clear()
    setFlashKey((k) => k + 1)
    setPhase('flash')
    setSay('Bak!')
  }
  const lookAgain = () => {
    S.hint()
    flash()
  }

  const answered = (ans: number) => {
    const ok = ans === expected
    S.attempt(ok)
    if (ok) {
      clear()
      setPhase('seen')
      setPaint(Array(layout(T.card).dots.length).fill(null))
      setSay(fails ? 'Buldun! Şimdi nasıl gördüğünü göster.' : 'Bir bakışta buldun! Nasıl gördün?')
      return
    }
    const f = fails + 1
    setFails(f)
    setValue('')
    const diff = Math.abs(ans - expected)
    const misc =
      T.mode === 'empty' && ans === total
        ? 'Boş kutular yerine dolu kutuları saydı'
        : T.mode !== 'empty' && diff === 1
          ? 'Hızlı bakışta noktaları tek tek saymaya çalıştı (1 eksik/fazla)'
          : diff === 5 || diff === 10
            ? '5’lik/10’luk yapıyı (çerçeve sırası) gözden kaçırdı'
            : undefined
    const base = T.nudges[Math.min(f - 1, T.nudges.length - 1)]
    show(f >= 2 ? `${base} Şimdi resim açık kalacak; yapıya bakarak düşün.` : `Henüz değil. ${base}`, {
      misc,
      tool: T.card.kind === 'frame' || T.card.kind === 'tens' ? 'tenframe' : undefined,
      toolConfig: { frames: size === 20 || total > 10 ? 2 : 1 },
      toolTitle: 'Onluk çerçeve',
    })
    setSay(f >= 2 ? 'Resme bakarak düşün. Acele yok!' : 'Bir daha bakmak ister misin?')
  }

  const checkBuild = () => {
    const n = built.filter(Boolean).length
    answered(n)
    if (n !== expected) setBuilt(Array(20).fill(false))
  }

  const onPaint = (i: number, mode: 'tap' | 'drag') => {
    setPaint((p) => {
      const next = p.slice()
      next[i] = mode === 'tap' && p[i] === brush ? null : brush
      return next
    })
  }

  const pickStrategy = (s: string) => {
    setPicked(s)
    stats.current.strategies.push(s)
    if (s.startsWith('Tek tek')) stats.current.counted++
    else stats.current.structure++
    S.complete()
    setSay(s.startsWith('Tek tek') ? 'Saymak da bir yol! Bir dahaki sefere 5’lik sıraları ya da ikizleri ara.' : 'Harika bir göz! Yapıyı kullandın.')
  }

  const next = () => {
    if (S.last) {
      const n = tasks.length
      const st = stats.current
      const fav = st.strategies.filter((s) => !s.startsWith('Tek tek'))
      onFinish({
        stars: S.stars(),
        summary: `${n} hızlı görüntünün ${S.totals.first} tanesini ilk bakışta buldun. ${st.structure} kez yapıyı kullanarak gördün.`,
        insight:
          (grade <= 1
            ? 'Noktaları tek tek saymak yerine 5’lik sıraları, ikizleri ve dolu 10’u kullanınca bir bakışta görebilirsin: 7 = 5 + 2, 14 = 10 + 4.'
            : 'Büyük sayıları 10’luk ve 5’lik gruplarla görmek saymaktan hızlıdır: 8 + 7 = 10 + 5; 3 dolu çerçeve ve 4 nokta daha 34 eder.') + (fav.length ? ` Senin bir yolun: “${fav[fav.length - 1]}”.` : ''),
      })
      return
    }
    S.next()
    setPhase('ready')
    setValue('')
    setFails(0)
    setBuilt(Array(20).fill(false))
    setPaint([])
    setPicked(null)
    clear()
    setSay('Yeni görüntü! Hazır olunca “Göster”e dokun.')
  }

  // Boyama → eşitlik
  const counts = PAINT.map((_, c) => paint.filter((p) => p === c).length)
  const unpainted = paint.filter((p) => p === null).length
  const used = counts.map((c, i) => ({ c, i })).filter((x) => x.c > 0)
  const paintedEq = paint.length && unpainted === 0 && used.length > 1 ? `${used.map((u) => u.c).join(' + ')} = ${paint.length}` : null

  const big = grade <= 3
  const chooserMax = expected > 10 ? 20 : 10

  const stage = (
    <div className="relative mx-auto w-full max-w-120" data-hn={expected}>
      <div className="relative grid min-h-57.5 place-items-center rounded-3xl bg-white/80 p-3 ring-2 ring-sky-100 sm:min-h-67.5 sm:p-4">
        {phase === 'ready' && (
          <button type="button" onClick={flash} className="flex flex-col items-center gap-2 rounded-3xl bg-sky-500 px-10 py-6 text-2xl font-black text-white shadow-[0_6px_0_#0369a1] transition active:translate-y-1 active:shadow-[0_2px_0_#0369a1]">
            <Eye size={40} />
            Göster
          </button>
        )}
        {phase === 'flash' && (
          <div className="w-full animate-pop">
            <DotCard card={T.card} maxH={280} />
            <div className="mx-auto mt-3 h-2 w-2/3 overflow-hidden rounded-full bg-sky-100">
              <div key={flashKey} className="h-full rounded-full bg-sky-500" style={{ animation: `hn-shrink ${flashMs}ms linear forwards` }} />
            </div>
          </div>
        )}
        {phase === 'answer' && T.mode !== 'rebuild' && (showAlways ? <DotCard card={T.card} maxH={280} /> : <Curtain />)}
        {phase === 'answer' && T.mode === 'rebuild' && (
          <div className="w-full">
            {showAlways && <div className="mx-auto mb-3 max-w-56 opacity-90"><DotCard card={T.card} maxH={150} /></div>}
            <BuildFrame size={size} filled={built} onToggle={(i) => setBuilt((b) => b.map((v, k) => (k === i ? !v : v)))} />
          </div>
        )}
        {phase === 'seen' && (
          <div className="w-full">
            {T.mode === 'rebuild' && <p className="mb-1 text-center text-sm font-black text-sky-800">Gösterilen görüntü</p>}
            <DotCard card={T.card} paint={paint} onPaint={picked ? undefined : onPaint} maxH={300} />
          </div>
        )}
      </div>
      <style>{'@keyframes hn-shrink { from { width: 100% } to { width: 0% } }'}</style>
    </div>
  )

  const answerPanel =
    phase === 'answer' &&
    (T.mode === 'rebuild' ? (
      <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
        <p className="mb-2 font-extrabold">Çerçevede {built.filter(Boolean).length} nokta var.</p>
        <button type="button" onClick={checkBuild} disabled={!built.some(Boolean)} className="btn-primary min-h-14 w-full text-lg">Bitti, karşılaştır</button>
      </div>
    ) : grade <= 1 ? (
      <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
        <p className="mb-2 font-extrabold">{T.mode === 'empty' ? 'Kaç kutu boş?' : 'Kaç nokta gördün?'}</p>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: chooserMax }, (_, i) => i + 1).map((v) => (
            <button key={v} type="button" onClick={() => answered(v)} className={`min-h-14 rounded-2xl text-2xl font-black ring-1 transition active:scale-95 ${v <= 5 || (v > 10 && v <= 15) ? 'bg-rose-50 text-rose-900 ring-rose-200' : 'bg-sky-50 text-sky-900 ring-sky-200'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>
    ) : (
      <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
        <p className="mb-2 font-extrabold">{T.mode === 'empty' ? 'Kaç kutu boş?' : 'Kaç nokta gördün?'} <span className="ml-1 inline-block min-w-14 rounded-xl bg-sky-50 px-3 text-center text-2xl text-sky-900 ring-1 ring-sky-200">{value || '?'}</span></p>
        <NumPad value={value} onChange={setValue} onSubmit={() => answered(parseNum(value))} maxLen={2} big={big} />
      </div>
    ))

  const seenPanel = phase === 'seen' && (
    <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
      <p className="flex items-center gap-1.5 font-black"><Paintbrush size={18} className="text-amber-500" />Gördüğün parçaları boya</p>
      <p className="text-sm font-bold text-ink-soft">Bir renk seç, parmağını noktaların üzerinde gezdir.</p>
      <div className="mt-2 flex items-center gap-2">
        {PAINT.map((c, i) => (
          <button key={c} type="button" onClick={() => setBrush(i)} aria-label={`${i + 1}. renk`} aria-pressed={brush === i} className={`size-14 rounded-2xl ring-4 transition ${brush === i ? 'scale-105 ring-ink/70' : 'ring-transparent'}`} style={{ background: c }} />
        ))}
        <button type="button" onClick={() => setPaint((p) => p.map(() => null))} className="ml-auto grid size-14 place-items-center rounded-2xl bg-white ring-1 ring-line" aria-label="Boyamayı temizle"><RotateCcw size={20} /></button>
      </div>
      <div className="mt-2 flex min-h-12 flex-wrap items-center gap-1.5 text-lg font-black">
        {used.length === 0 && <span className="text-sm font-bold text-ink-soft">Boyadıkça parçalar burada belirecek.</span>}
        {used.map((u, k) => (
          <span key={u.i} className="flex items-center gap-1.5">
            {k > 0 && <span>+</span>}
            <span className="rounded-xl px-3 py-1 text-white" style={{ background: PAINT[u.i] }}>{u.c}</span>
          </span>
        ))}
        {used.length > 0 && unpainted > 0 && <span className="text-sm font-bold text-ink-soft">(boyanmamış {unpainted})</span>}
        {paintedEq && <span className="ml-1 rounded-xl bg-ink px-3 py-1 text-white animate-pop">= {paint.length}</span>}
      </div>
      {!picked && <StrategyPicker question="Nasıl gördün?" options={T.strategies} onPick={pickStrategy} />}
    </div>
  )

  return (
    <ActivityLayout
      grade={grade}
      idx={S.idx}
      total={tasks.length}
      title={T.title}
      prompt={T.prompt}
      nudge={nudge}
      onCloseNudge={clear}
      done={S.done}
      doneBox={<DoneNote title={picked && !picked.startsWith('Tek tek') ? 'Bir bakışta!' : 'Buldun!'} note={<>{T.note}{paintedEq && <span className="mt-1 block">Senin boyaman: {paintedEq}</span>}</>} />}
      onNext={next}
      onHint={phase === 'answer' ? lookAgain : undefined}
      hintLabel="Bir daha bak"
      panel={
        <>
          {phase === 'ready' && <div className="rounded-2xl bg-sky-50 p-3 text-sm font-bold text-sky-900 ring-1 ring-sky-200">Görüntü {grade <= 1 ? '2' : '1,5'} saniye kadar görünecek. Saymaya çalışma; şekle, sıralara ve gruplara bak!</div>}
          {phase === 'flash' && <div className="rounded-2xl bg-sky-50 p-3 text-lg font-black text-sky-900 ring-1 ring-sky-200">👀 Dikkatle bak…</div>}
          {answerPanel}
          {seenPanel}
        </>
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-3xl" aria-hidden>🦉</span>
        <p className="rounded-2xl rounded-tl-sm bg-white px-3 py-2 font-extrabold shadow-sm ring-1 ring-line">{say}</p>
      </div>
      {stage}
    </ActivityLayout>
  )
}

function Curtain() {
  return (
    <div className="grid h-50 w-full place-items-center rounded-2xl bg-[repeating-linear-gradient(90deg,#7dd3fc_0_22px,#38bdf8_22px_44px)] shadow-inner sm:h-60">
      <span className="grid size-20 place-items-center rounded-full bg-white/90 text-5xl font-black text-sky-700 shadow">?</span>
    </div>
  )
}
