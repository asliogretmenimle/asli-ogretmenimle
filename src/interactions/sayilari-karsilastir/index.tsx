import { useRef, useState } from 'react'
import { BookOpen, Plus, Repeat2 } from 'lucide-react'
import type { InteractionProps } from '../types'
import { Scene } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { CheckButton, Choices, GhostButton, Header, NextButton, Nudge, Prompt, Split, Stage, Stepper, useChecks } from '../donusum-studyosu/ortak'
import { AskBox, BlockRow, PLACE, PlaceTable, RulesFound, Towers, ZoomLine, cellsOf, countsOf, digitAt, firstDiff, n, type Mark } from './parts'

/**
 * 85. Büyüteçle Sayı Karşılaştır (4–5. sınıf)
 * Öğretme odaklı: kural söylenmez, modelden çıkar.
 *  1. 9.999 + 1: birlikten on binliğe bozdurma zinciri → en büyük 4 basamaklı < en küçük 5 basamaklı
 *  2. 8.754 ile 12.006: sağa hizalı basamak tablosu, bloklar ve on binlik kuleler → basamak sayısı karar verir
 *  3. 45.210 ile 45.830: büyüteç soldan sağa ilerler, aynı basamaklar silikleşir, ilk farklı basamakta durur
 *  4. 45.2□□ ile 45.830: sağdaki rakamları değiştir, büyüteçli sayı doğrusunda geçmeyi dene → neden geçemez?
 *  5. Karar veren basamağı bul, sonra < / > seç
 *  6. □ yerine hangi rakamlar gelebilir?
 *  Son: kural defteri
 */

const A = '#2563eb'
const B = '#ea580c'

type Done = (first: boolean, rules: string[]) => void
type Guess = 'gecer' | 'gecemez' | null

const TASKS = [
  { emoji: '➕', title: 'En büyük 4 basamaklı sayıya 1 ekle' },
  { emoji: '🏰', title: '8.754 mü, 12.006 mı?' },
  { emoji: '🔍', title: 'Büyüteçle soldan sağa' },
  { emoji: '🎯', title: '45.2□□ yarışı' },
  { emoji: '⚖️', title: 'Karar veren basamağı bul' },
  { emoji: '❓', title: 'Kutuya hangi rakamlar gelir?' },
]

export default function SayilariKarsilastir({ grade, onFinish }: InteractionProps) {
  const [idx, setIdx] = useState(0)
  const [rules, setRules] = useState<string[]>([])
  const [guess, setGuess] = useState<Guess>(null)
  const firsts = useRef<boolean[]>([])
  const end = idx >= TASKS.length
  const t = TASKS[Math.min(idx, TASKS.length - 1)]
  const last = idx === TASKS.length - 1

  const done: Done = (first, r) => {
    firsts.current[idx] = first
    setRules((old) => [...old, ...r.filter((x) => !old.includes(x))])
    setIdx(idx + 1)
  }
  const finish = () =>
    onFinish({
      stars: starsFor(firsts.current.filter(Boolean).length / TASKS.length),
      summary: `${TASKS.length} görevde sayıları bloklarla, kulelerle ve büyüteçle karşılaştırdın; ${rules.length} kuralı kendin buldun.`,
      insight: 'Basamak sayısı fazla olan sayı daha büyüktür. Basamak sayıları eşitse soldan başlarım; ilk farklı rakam karar verir, çünkü o basamaktaki 1 birim sağdaki bütün basamaklardan büyüktür.',
    })

  const props = { onDone: done, last }
  return (
    <Scene grade={grade}>
      <Header emoji={end ? '📒' : t.emoji} kicker={end ? 'Tamamlandı' : 'Görev'} title={end ? 'Kural defterin' : t.title} idx={Math.min(idx, TASKS.length - 1)} total={TASKS.length} />
      {end ? (
        <EndView rules={rules} onFinish={finish} />
      ) : idx === 0 ? (
        <GrowTask key={idx} {...props} />
      ) : idx === 1 ? (
        <DigitsTask key={idx} {...props} />
      ) : idx === 2 ? (
        <ScanTask key={idx} {...props} onGuess={setGuess} />
      ) : idx === 3 ? (
        <TailTask key={idx} {...props} guess={guess} />
      ) : idx === 4 ? (
        <SpotTask key={idx} {...props} />
      ) : (
        <MissingTask key={idx} {...props} />
      )}
    </Scene>
  )
}

interface TaskProps { onDone: Done; last: boolean }

/* ───────────── 1. 9.999 + 1 ───────────── */

function GrowTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const [counts, setCounts] = useState([9, 9, 9, 9, 0])
  const [phase, setPhase] = useState<'add' | 'trade' | 'ask' | 'done'>('add')
  const over = counts.findIndex((c) => c >= 10)
  const top = Math.max(...counts.map((c, e) => (c ? e : 0)))
  const cells = counts.map((c, e) => (e <= top ? String(c) : null))
  const value = counts.reduce((s, c, e) => s + c * 10 ** e, 0)
  const rules = ['En büyük 4 basamaklı sayı (9.999) bile en küçük 5 basamaklı sayıdan (10.000) küçüktür.']

  const trade = () => {
    const c = counts.slice()
    c[over] -= 10
    c[over + 1] += 1
    setCounts(c)
    sfx.ok()
    if (!c.some((x) => x >= 10)) setPhase('ask')
  }

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <PlaceTable rows={[{ label: 'Sayı', color: A, cells }]} wrong={over >= 0 ? over : null} />
          <p className="text-center text-xl font-black text-ink tabular-nums">{phase === 'add' ? n(9999) : over >= 0 ? `${n(9999)} + 1` : n(value)}</p>
          <BlockRow counts={counts} />
        </Stage>
      }
      panel={
        <>
          {phase === 'add' && (
            <>
              <Prompt step="Gözle">Bu sayı 4 basamaklı sayıların en büyüğü: 9.999. Her basamakta 9 var. Bir birlik ekle ve neler olduğunu izle.</Prompt>
              <button type="button" onClick={() => { setCounts([10, 9, 9, 9, 0]); setPhase('trade'); sfx.ok() }} className="btn-primary min-h-14 w-full text-lg"><Plus size={20} />1 birlik ekle</button>
            </>
          )}
          {phase === 'trade' && over >= 0 && (
            <>
              <Prompt step="Bozdur">{PLACE[over].name} basamağında 10 {PLACE[over].unit} oldu, ama bir basamağa en fazla 9 sığar. 10 {PLACE[over].unit} birleşip 1 {PLACE[over + 1].unit} olsun.</Prompt>
              <button type="button" onClick={trade} className="btn-primary min-h-14 w-full text-lg"><Repeat2 size={20} />10 {PLACE[over].unit} → 1 {PLACE[over + 1].unit}</button>
            </>
          )}
          {phase === 'ask' && (
            <>
              <Prompt step="Ne oldu?">Bir tek birlik, sayıyı 5 basamaklı yaptı: 10.000. Bloklarda artık tek bir on binlik kule var.</Prompt>
              <AskBox
                checks={checks}
                onOk={() => setPhase('done')}
                ask={{
                  q: '9.999, 4 basamaklı en büyük sayıydı ve 10.000’e 1 birlik eksikti. O hâlde 4 basamaklı bir sayı ile 10.000 için ne söylersin?',
                  options: [
                    { label: '4 basamaklı her sayı 10.000’den küçüktür', ok: true },
                    { label: 'Rakamları büyükse 10.000’i geçebilir', nudge: 'En büyük rakamlarla yazılan 4 basamaklı sayı 9.999’du. O bile 10.000’e ulaşmak için 1 birlik istedi.', mis: 'Sayının büyüklüğünü rakamların büyüklüğüne göre değerlendiriyor' },
                    { label: 'Bazen 10.000’e eşit olabilir', nudge: 'Bloklara bak: 10.000 bir on binlik kule. 4 basamaklı bir sayıda on binlik var mı?' },
                  ],
                }}
              />
            </>
          )}
          {phase === 'done' && <RulesFound rules={rules} />}
          {phase === 'done' && <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />}
        </>
      }
    />
  )
}

/* ───────────── 2. 8.754 ile 12.006 ───────────── */

function DigitsTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const track = useTracker()
  const [a, b] = [8754, 12006]
  const [phase, setPhase] = useState<'predict' | 'look' | 'fill' | 'ask' | 'done'>('predict')
  const [pred, setPred] = useState<number | null>(null)
  const rules = ['Basamak sayısı fazla olan doğal sayı daha büyüktür.']
  const showBlocks = phase !== 'predict'
  const showTowers = phase === 'ask' || phase === 'done'

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          {phase === 'predict' ? (
            <div className="flex flex-wrap items-center justify-center gap-4 py-6 text-4xl font-black tabular-nums sm:text-5xl">
              <span style={{ color: A }}>{n(a)}</span>
              <span className="text-slate-400">?</span>
              <span style={{ color: B }}>{n(b)}</span>
            </div>
          ) : (
            <PlaceTable rows={[{ label: n(a), color: A, cells: cellsOf(a, 5) }, { label: n(b), color: B, cells: cellsOf(b, 5) }]} lens={phase === 'look' ? 4 : null} />
          )}
          {showBlocks && !showTowers && (
            <div className="grid gap-2">
              <BlockRow counts={countsOf(a)} label={n(a)} color={A} />
              <BlockRow counts={countsOf(b)} label={n(b)} color={B} />
            </div>
          )}
          {showTowers && (
            <div className="flex flex-wrap items-end justify-center gap-6 rounded-2xl bg-white/80 p-3 ring-1 ring-line animate-fade-up">
              <Towers value={a} label={n(a)} color={A} scale={1} />
              <Towers value={b} label={n(b)} color={B} scale={2} />
            </div>
          )}
        </Stage>
      }
      panel={
        <>
          {phase === 'predict' && (
            <>
              <Prompt step="Tahmin et">Hangisi daha büyük? Hesaplama yapma, ilk düşündüğünü seç.</Prompt>
              <Choices options={[{ id: a, label: n(a) }, { id: b, label: n(b) }]} value={pred} onPick={(v) => { setPred(v); track.strategy(`Tahmin: ${n(v)} daha büyük`) }} />
              <button type="button" disabled={pred === null} onClick={() => setPhase('look')} className="btn-primary min-h-14 w-full text-lg">Tablo ve bloklarla bak</button>
            </>
          )}
          {phase === 'look' && (
            <>
              <Prompt step="Gözle">Sayıları basamak tablosuna sağdan hizalayarak yazdık: birler birlerin altında. Büyüteç on binler basamağında.</Prompt>
              <AskBox
                checks={checks}
                onOk={() => setPhase('fill')}
                okText="Evet! 8.754 4 basamaklı, 12.006 5 basamaklı."
                ask={{
                  q: '8.754’ün on binler basamağında ne var?',
                  options: [
                    { label: 'Hiçbir şey: on binler basamağı boş', ok: true },
                    { label: '8 var', nudge: '8 hangi sütunun altında duruyor? Sütun başlığını oku.', mis: 'Sayıları sola hizalayarak karşılaştırıyor' },
                    { label: '1 var', nudge: '1, 12.006’nın rakamı. Mavi satıra bak.' },
                  ],
                }}
              />
            </>
          )}
          {phase === 'fill' && (
            <>
              <Prompt step="Kuleye doldur">Bir on binlik kule, üst üste 10 binlikten oluşur. İki sayının bütün bloklarını kulelere dolduralım. Hangisi bir kuleyi doldurabilecek?</Prompt>
              <button type="button" onClick={() => { setPhase('ask'); sfx.ok() }} className="btn-primary min-h-14 w-full text-lg">Blokları kulelere doldur</button>
            </>
          )}
          {phase === 'ask' && (
            <AskBox
              checks={checks}
              onOk={() => setPhase('done')}
              ask={{
                q: '8.754’ün blokları bir on binlik kuleyi dolduramadı. Hangisi büyük, neden?',
                options: [
                  { label: '12.006: 5 basamaklı, en az 1 on binliği var', ok: true },
                  { label: '8.754: rakamları daha büyük (8, 7, 5, 4)', nudge: 'Kulelere bak. 8, 7, 5, 4 hangi basamaklarda? 12.006’daki 1 hangi basamakta?', mis: 'Sayının büyüklüğünü rakamların büyüklüğüne göre değerlendiriyor' },
                  { label: '8.754: çünkü 8 > 1', nudge: '8 binler basamağında, 1 ise on binler basamağında. Farklı basamaklardaki rakamları mı karşılaştırdın?', mis: 'Basamak sayısına bakmadan ilk rakamları karşılaştırıyor' },
                ],
              }}
            />
          )}
          {phase === 'done' && pred === a && <Nudge tone="ok" question="İlk tahminin 8.754’tü. Kuleler fikrini değiştirdi: iyi matematikçiler de böyle yapar!" />}
          {phase === 'done' && <RulesFound rules={rules} />}
          {phase === 'done' && <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />}
        </>
      }
    />
  )
}

/* ───────────── 3. 45.210 ile 45.830: büyüteç ───────────── */

function ScanTask({ onDone, last, onGuess }: TaskProps & { onGuess: (g: Guess) => void }) {
  const checks = useChecks()
  const track = useTracker()
  const [a, b] = [45210, 45830]
  const fd = firstDiff(a, b, 5)
  const [phase, setPhase] = useState<'start' | 'walk' | 'which' | 'predict' | 'done'>('start')
  const [lens, setLens] = useState<number | null>(null)
  const [marks, setMarks] = useState<Partial<Record<number, Mark>>>({})
  const [say, setSay] = useState<{ q: string; mis?: string; k: number } | null>(null)
  const [wrong, setWrong] = useState<number | null>(null)
  const [guess, setGuess] = useState<Guess>(null)
  const rules = ['Basamak sayıları eşitse en soldaki basamaktan başlarım; ilk farklı rakamda durur, büyük olana bakarım.']
  const nudge = (q: string, mis?: string) => {
    checks.fail()
    setSay((s) => ({ q, mis, k: (s?.k ?? 0) + 1 }))
  }

  const pickStart = (e: number) => {
    if (phase !== 'start') return
    if (e === 4) {
      sfx.ok()
      setSay(null)
      setWrong(null)
      setLens(4)
      setPhase('walk')
      return
    }
    setWrong(e)
    if (e === 0) nudge('Birler basamağı en az değer taşıyan basamak. 1 birlik mi daha değerli, 1 on binlik mi? En değerli basamak nerede?', 'Karşılaştırmaya sağdan (birlerden) başlıyor')
    else nudge('Solunda daha değerli bir basamak var mı? En çok değeri taşıyan basamaktan başla.')
  }

  const answer = (same: boolean) => {
    if (lens === null) return
    const isSame = digitAt(a, lens) === digitAt(b, lens)
    if (same !== isSame) {
      nudge(isSame ? `Büyütece tekrar bak: iki sayının ${PLACE[lens].name.toLowerCase()} basamağında da ${digitAt(a, lens)} var.` : `Büyütece tekrar bak: ${digitAt(a, lens)} ${PLACE[lens].unit} ile ${digitAt(b, lens)} ${PLACE[lens].unit} aynı mı?`)
      return
    }
    sfx.ok()
    setSay(null)
    track.attempt(true)
    setMarks((m) => ({ ...m, [lens]: isSame ? 'same' : 'diff' }))
    if (isSame) setLens(lens - 1)
    else setPhase('which')
  }

  const fdBlocks = (v: number) => Array.from({ length: 5 }, (_, e) => (e === fd ? digitAt(v, e) ?? 0 : 0))

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <PlaceTable rows={[{ label: n(a), color: A, cells: cellsOf(a, 5) }, { label: n(b), color: B, cells: cellsOf(b, 5) }]} marks={marks} lens={lens} wrong={wrong} onCol={phase === 'start' ? pickStart : undefined} />
          {phase !== 'start' && phase !== 'walk' && (
            <div className="grid gap-2 sm:grid-cols-2 animate-fade-up">
              <BlockRow counts={fdBlocks(a)} label={`${n(a)} → ${PLACE[fd].name.toLowerCase()}`} color={A} />
              <BlockRow counts={fdBlocks(b)} label={`${n(b)} → ${PLACE[fd].name.toLowerCase()}`} color={B} />
            </div>
          )}
        </Stage>
      }
      panel={
        <>
          {phase === 'start' && <Prompt step="Başla">İki sayı da 5 basamaklı: basamak sayısı karar veremedi. Karşılaştırmaya hangi basamaktan başlamalıyız? Tablodan bir sütuna dokun.</Prompt>}
          {phase === 'walk' && lens !== null && (
            <>
              <Prompt step="Büyüteç">Büyüteç {PLACE[lens].name.toLowerCase()} basamağında: {digitAt(a, lens)} ve {digitAt(b, lens)}. Bu iki rakam aynı mı?</Prompt>
              <div className="grid grid-cols-2 gap-2">
                <GhostButton onClick={() => answer(true)} className="min-h-14 text-base">Aynı → sağa geç</GhostButton>
                <GhostButton onClick={() => answer(false)} className="min-h-14 text-base">Farklı → dur!</GhostButton>
              </div>
            </>
          )}
          {say && <Nudge key={say.k} question={say.q} misconception={say.mis} />}
          {phase === 'which' && (
            <>
              <Prompt step="Karar">Büyüteç {PLACE[fd].name.toLowerCase()} basamağında durdu. Soldaki basamaklar aynıydı, silikleşti.</Prompt>
              <AskBox
                checks={checks}
                onOk={() => setPhase('predict')}
                ask={{
                  q: 'Hangi sayı daha büyük?',
                  options: [
                    { label: `${n(b)}: 8 yüzlük, 2 yüzlükten çok`, ok: true },
                    { label: `${n(a)}`, nudge: 'Bloklara bak: 2 yüzlük mü daha çok, 8 yüzlük mü?' },
                  ],
                }}
              />
            </>
          )}
          {phase === 'predict' && (
            <div className="rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-200 animate-fade-up">
              <p className="mb-2 text-sm font-black text-sky-900">Tahmin et: 45.210’un onlar ve birler rakamlarını istediğin gibi değiştirsen 45.830’u geçebilir misin?</p>
              <Choices options={[{ id: 'gecer', label: 'Geçebilirim' }, { id: 'gecemez', label: 'Geçemem' }]} value={guess} onPick={(g) => { setGuess(g); onGuess(g); track.strategy(g === 'gecer' ? 'Tahmin: sağdaki rakamlar sonucu değiştirebilir' : 'Tahmin: sağdaki rakamlar sonucu değiştiremez'); setPhase('done') }} />
            </div>
          )}
          {phase === 'done' && <RulesFound rules={rules} />}
          {phase === 'done' && <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />}
        </>
      }
    />
  )
}

/* ───────────── 4. 45.2□□ ile 45.830 ───────────── */

function TailTask({ onDone, last, guess }: TaskProps & { guess: Guess }) {
  const checks = useChecks()
  const b = 45830
  const [tens, setTens] = useState(1)
  const [ones, setOnes] = useState(0)
  const [moves, setMoves] = useState(0)
  const [phase, setPhase] = useState<'try' | 'ask' | 'done'>('try')
  const a = 45200 + tens * 10 + ones
  const rules = ['İlk farklı basamaktan sonraki rakamlar sonucu değiştiremez: 1 yüzlük, onlar ve birlerin en büyük hâlinden (99) bile büyüktür.']
  const change = (set: (v: number) => void) => (v: number) => {
    set(v)
    setMoves((m) => m + 1)
  }
  const maxed = tens === 9 && ones === 9
  const marks: Partial<Record<number, Mark>> = { 4: 'same', 3: 'same', 2: 'diff' }

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <PlaceTable rows={[{ label: n(a), color: A, cells: cellsOf(a, 5), edit: phase === 'try' ? [1, 0] : [] }, { label: n(b), color: B, cells: cellsOf(b, 5) }]} marks={marks} />
          <p className="text-center text-3xl font-black tabular-nums">
            <span style={{ color: A }}>{n(a)}</span> <span className="text-pink-600">{a < b ? '<' : '>'}</span> <span style={{ color: B }}>{n(b)}</span>
          </p>
          <div className="rounded-2xl bg-white/80 p-2 ring-1 ring-line">
            <p className="text-xs font-black tracking-wide text-sky-700 uppercase">Büyüteçle sayı doğrusu: 45.000–46.000</p>
            <ZoomLine a={a} b={b} band={[45200, 45299]} colors={[A, B]} />
            <p className="text-center text-xs font-bold text-orange-700">Turuncu bant: 45.2□□ biçimindeki bütün sayılar</p>
          </div>
        </Stage>
      }
      panel={
        <>
          {phase === 'try' && (
            <>
              <Prompt step="Dene">45.2□□ sayısının onlar ve birler rakamlarını istediğin gibi değiştir. 45.830’u geçebilir misin?</Prompt>
              {guess && <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-900 ring-1 ring-sky-200">Tahminin: {guess === 'gecer' ? 'geçebilirim' : 'geçemem'}. Şimdi dene!</p>}
              <div className="space-y-2 rounded-2xl bg-white p-3 ring-1 ring-line">
                <Stepper label="Onlar rakamı" value={tens} max={9} onChange={change(setTens)} />
                <Stepper label="Birler rakamı" value={ones} max={9} onChange={change(setOnes)} />
              </div>
              {maxed && <Nudge question="İkisine de en büyük rakamı, 9’u yazdın: 45.299. Daha büyük bir rakam yok. 45.830’a yetişebildi mi?" />}
              {(maxed || moves >= 6) && <button type="button" onClick={() => setPhase('ask')} className="btn-primary min-h-14 w-full text-lg">Geçemiyorum. Neden?</button>}
            </>
          )}
          {phase === 'ask' && (
            <AskBox
              checks={checks}
              onOk={() => setPhase('done')}
              ask={{
                q: '45.2□□ en fazla 45.299 olabiliyor. Neden 45.830’u hiç geçemiyor?',
                options: [
                  { label: '45.830’da 6 yüzlük fazla var; onlar ve birler en fazla 99 eder, 1 yüzlüğü bile tamamlayamaz', ok: true },
                  { label: 'Seçebileceğim rakamlar yeterince büyük değil', nudge: 'Onlar ve birlere en büyük rakamı, 9’u yazabildin. 99, 1 yüzlükten büyük mü?', mis: 'Sağdaki basamakların sonucu değiştirebileceğini düşünüyor' },
                  { label: 'Sayı doğrusu buna izin vermiyor', nudge: 'Sayı doğrusu yalnızca gösteriyor. Turuncu bant neden 45.300’e bile ulaşmıyor? Bant kaç birlik genişliğinde?' },
                ],
              }}
            />
          )}
          {phase === 'done' && guess === 'gecer' && <Nudge tone="ok" question="Tahminin “geçebilirim”di. Denedin ve modelden nedenini buldun!" />}
          {phase === 'done' && <RulesFound rules={rules} />}
          {phase === 'done' && <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />}
        </>
      }
    />
  )
}

/* ───────────── 5. karar veren basamak ───────────── */

const PAIRS: [number, number][] = [
  [72384, 72391],
  [60518, 60158],
  [39999, 41000],
  [9870, 10012],
  [85470, 85407],
]

function SpotTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const [i, setI] = useState(0)
  const [step, setStep] = useState<'col' | 'sign' | 'next'>('col')
  const [wrong, setWrong] = useState<number | null>(null)
  const [say, setSay] = useState<{ q: string; mis?: string; k: number } | null>(null)
  const [sign, setSign] = useState<'<' | '>' | null>(null)
  const [a, b] = PAIRS[i]
  const fd = firstDiff(a, b, 5)
  const right = a < b ? '<' : '>'
  const allDone = i >= PAIRS.length - 1 && step === 'next'
  const rules = ['Sağdaki rakamlar ne kadar büyük olursa olsun, soldan ilk farklı basamak karar verir.']
  const nudge = (q: string, mis?: string) => {
    checks.fail()
    setSay((s) => ({ q, mis, k: (s?.k ?? 0) + 1 }))
  }

  const marks: Partial<Record<number, Mark>> = {}
  if (step !== 'col') {
    for (let e = 4; e > fd; e--) marks[e] = 'same'
    marks[fd] = 'diff'
  }

  const pickCol = (e: number) => {
    if (e === fd) {
      sfx.ok()
      setWrong(null)
      setSay(null)
      setStep('sign')
      return
    }
    setWrong(e)
    if (digitAt(a, e) === digitAt(b, e)) nudge('Bu basamakta iki sayının rakamı aynı. Aynı olan basamak karar veremez; büyüteci ilerlet.')
    else nudge('Burada rakamlar farklı, ama daha solda farklı bir basamak var mı? Büyüteci en soldan başlat.', 'Sağdaki basamağa göre karar veriyor')
  }
  const pickSign = (s: '<' | '>') => {
    setSign(s)
    if (s === right) {
      sfx.ok()
      setSay(null)
      setStep('next')
      if (i + 1 < PAIRS.length) window.setTimeout(() => { setI(i + 1); setStep('col'); setSign(null) }, 1100)
      return
    }
    const da = digitAt(a, fd), db = digitAt(b, fd)
    nudge(
      da === null || db === null
        ? `${n(da === null ? a : b)} sayısının ${PLACE[fd].name.toLowerCase()} basamağı boş. Hangisinin basamağı daha çok?`
        : `Karar veren basamakta ${da} ve ${db} var. Hangisi büyük? Ağzı büyüğe açılır.`,
      a === 39999 ? 'Sayının büyüklüğünü rakamların büyüklüğüne göre değerlendiriyor' : undefined,
    )
  }

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <p className="text-xs font-black tracking-wide text-slate-500 uppercase">Çift {i + 1} / {PAIRS.length}</p>
          <PlaceTable key={i} rows={[{ label: n(a), color: A, cells: cellsOf(a, 5) }, { label: n(b), color: B, cells: cellsOf(b, 5) }]} marks={marks} lens={step === 'col' ? null : fd} wrong={wrong} onCol={step === 'col' ? pickCol : undefined} />
          <p className="text-center text-3xl font-black tabular-nums">
            <span style={{ color: A }}>{n(a)}</span>{' '}
            <span className={`inline-grid size-11 place-items-center rounded-xl align-middle ${step === 'next' ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-400 ring-2 ring-line'}`}>{step === 'next' ? right : '?'}</span>{' '}
            <span style={{ color: B }}>{n(b)}</span>
          </p>
        </Stage>
      }
      panel={
        <>
          {step === 'col' && <Prompt step="Dokun">Karar veren basamak hangisi? Tablodan o sütuna dokun.</Prompt>}
          {step === 'sign' && (
            <>
              <Prompt step="Karşılaştır">{n(a)} ? {n(b)}</Prompt>
              <Choices options={[{ id: '<' as const, label: '<' }, { id: '>' as const, label: '>' }]} value={sign} onPick={pickSign} />
            </>
          )}
          {say && <Nudge key={say.k} question={say.q} misconception={say.mis} />}
          {step === 'next' && <Nudge tone="ok" question={`${PLACE[fd].name} basamağı karar verdi: ${n(a)} ${right} ${n(b)}.${i + 1 < PAIRS.length ? ' Sıradaki çift geliyor…' : ''}`} />}
          {allDone && <RulesFound rules={rules} />}
          {allDone && <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />}
        </>
      }
    />
  )
}

/* ───────────── 6. kutuya hangi rakamlar gelir? ───────────── */

const MISSING = [
  { e: 2, text: '63.□41 > 63.552', make: (d: number) => 63041 + d * 100, other: 63552, rel: '>' as const },
  { e: 3, text: '8□.500 < 84.120', make: (d: number) => 80500 + d * 1000, other: 84120, rel: '<' as const },
]

function MissingTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const [k, setK] = useState(0)
  const [sel, setSel] = useState<Set<number>>(() => new Set())
  const [peek, setPeek] = useState<number | null>(null)
  const [say, setSay] = useState<{ q: string; mis?: string; n: number } | null>(null)
  const [ok, setOk] = useState(false)
  const item = MISSING[k]
  const fits = (d: number) => (item.rel === '>' ? item.make(d) > item.other : item.make(d) < item.other)
  const answer = Array.from({ length: 10 }, (_, d) => d).filter(fits)
  const rules = ['Bilinmeyen rakamı bulurken de soldan ilk farklı basamağa bakarım; rakamlar eşit çıkarsa bir sağdaki basamak karar verir.']

  const toggle = (d: number) => {
    if (ok) return
    setPeek(d)
    const s = new Set(sel)
    if (s.has(d)) s.delete(d)
    else s.add(d)
    setSel(s)
    setSay(null)
  }
  const check = () => {
    const extra = [...sel].filter((d) => !fits(d))
    const missing = answer.filter((d) => !sel.has(d))
    const other = digitAt(item.other, item.e)!
    if (!extra.length && !missing.length) {
      sfx.ok()
      setOk(true)
      setPeek(null)
      return
    }
    checks.fail()
    const d = extra[0]
    const q =
      d === other
        ? `${d} yazınca ${n(item.make(d))} olur. ${PLACE[item.e].name} basamağında ikisinde de ${d} var: karar veremedi. Bir sağdaki basamağa bak.`
        : d !== undefined
          ? `${d} yazınca ${PLACE[item.e].name.toLowerCase()} basamağında ${d} ile ${other} karşılaşır. Karar orada verilir: ${n(item.make(d))} ${item.make(d) > item.other ? '>' : '<'} ${n(item.other)}.`
          : `Başka rakam da olabilir mi? ${missing[0]} yazmayı dene.`
    setSay((s) => ({ q, mis: d === other ? 'Rakamlar eşit olunca sağdaki basamağa geçmiyor' : undefined, n: (s?.n ?? 0) + 1 }))
  }
  const nextItem = () => {
    setK(k + 1)
    setSel(new Set())
    setPeek(null)
    setSay(null)
    setOk(false)
  }

  const shown = peek ?? null
  const cellsA = cellsOf(item.make(shown ?? 0), 5).map((c, e) => (e === item.e ? (shown === null ? '□' : String(shown)) : c))
  const marks: Partial<Record<number, Mark>> = {}
  if (shown !== null) {
    const fd = firstDiff(item.make(shown), item.other, 5)
    for (let e = 4; e > fd; e--) marks[e] = 'same'
    if (fd >= 0) marks[fd] = 'diff'
  }

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <p className="text-center text-3xl font-black tabular-nums text-ink">{item.text}</p>
          <PlaceTable rows={[{ label: 'Kutulu', color: A, cells: cellsA, edit: [item.e] }, { label: n(item.other), color: B, cells: cellsOf(item.other, 5) }]} marks={marks} />
          {shown !== null && (
            <p className={`text-center text-xl font-black ${fits(shown) ? 'text-emerald-700' : 'text-slate-500'}`}>
              {n(item.make(shown))} {item.make(shown) > item.other ? '>' : '<'} {n(item.other)} {fits(shown) ? '✓ uyar' : '✗ uymaz'}
            </p>
          )}
        </Stage>
      }
      panel={
        <>
          <Prompt step={`Soru ${k + 1} / ${MISSING.length}`}>{item.text} olması için kutuya hangi rakamlar gelebilir? Hepsini seç. Bir rakama dokununca tabloda dener.</Prompt>
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: 10 }, (_, d) => (
              <button key={d} type="button" disabled={ok} onClick={() => toggle(d)} aria-pressed={sel.has(d)} className={`min-h-14 rounded-2xl text-2xl font-black ring-2 transition active:scale-95 ${sel.has(d) ? 'bg-pink-600 text-white ring-pink-700' : 'bg-white text-ink ring-line hover:bg-pink-50'}`}>
                {d}
              </button>
            ))}
          </div>
          {!ok && <CheckButton onClick={check} disabled={!sel.size} />}
          {say && <Nudge key={say.n} question={say.q} misconception={say.mis} />}
          {ok && <Nudge tone="ok" question={`Evet: ${answer.join(', ')}. ${digitAt(item.other, item.e)} rakamı neden olmadı? Çünkü eşit çıkınca karar bir sağdaki basamağa kaldı.`} />}
          {ok && k + 1 < MISSING.length && <button type="button" onClick={nextItem} className="btn-primary min-h-14 w-full text-lg">Sonraki soru</button>}
          {ok && k + 1 >= MISSING.length && <RulesFound rules={rules} />}
          {ok && k + 1 >= MISSING.length && <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />}
        </>
      }
    />
  )
}

/* ───────────── son ───────────── */

function EndView({ rules, onFinish }: { rules: string[]; onFinish: () => void }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-3xl bg-amber-50 p-5 text-ink shadow-[0_6px_0_#d9770633] ring-2 ring-amber-300">
        <p className="mb-3 flex items-center gap-2 text-lg font-black text-amber-900"><BookOpen size={20} />Kural defterim</p>
        <ol className="space-y-2">
          {rules.map((r, i) => (
            <li key={r} className="flex gap-3 rounded-xl bg-white p-3 text-base font-extrabold ring-1 ring-amber-200 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber-500 text-sm font-black text-white">{i + 1}</span>
              {r}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm font-bold text-amber-900">Bu kuralları ezberlemedin: hepsini bloklardan, kulelerden ve büyüteçten kendin çıkardın.</p>
      </div>
      <div className="mt-4"><NextButton last onClick={onFinish} /></div>
    </div>
  )
}
