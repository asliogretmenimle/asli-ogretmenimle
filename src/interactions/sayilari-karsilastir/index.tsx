import { useRef, useState } from 'react'
import { BookOpen } from 'lucide-react'
import type { InteractionProps } from '../types'
import { Scene } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { Header, NextButton, Nudge, Prompt, Split, Stage, useChecks } from '../donusum-studyosu/ortak'
import { BlockMat, BlockRow, Drag, DragAsk, Drop, LensToken, PLACE, PlaceTable, RulesFound, TOKEN, Towers, Tray, ZoomLine, cellsOf, countsOf, digitAt, firstDiff, n, useDnd, type Mark } from './parts'

/**
 * 85. Büyüteçle Sayı Karşılaştır (4–5. sınıf)
 * Öğretme odaklı ve baştan sona sürükle-bırak: kural söylenmez, modelden çıkar.
 *  1. 9.999 + 1: birlik küpü altlığa sürükle, 10’lu demetleri bir sola taşıyarak on binliğe ulaş
 *  2. 8.754 ile 12.006: tacı tahminine koy, rakam kartlarını tabloya sağdan hizalı yerleştir, blokları kulelere dök
 *  3. 45.210 ile 45.830: büyüteci soldan sağa sütun sütun taşı, = / ≠ kartlarıyla işaretle, ilk farklıda dur
 *  4. 45.2□□ ile 45.830: rakam kartlarını onlar ve birlere sürükle, büyüteçli sayı doğrusunda geçmeyi dene
 *  5. Büyüteci karar veren basamağa, < / > kartını sayıların arasına sürükle
 *  6. 0–9 kartlarını kutuda dene, “Olur” ve “Olmaz” sepetlerine ayır
 *  Sorular da sürüklemeli: cevap kartı yuvaya bırakılır. Son: kural defteri
 */

const A = '#2563eb'
const B = '#ea580c'

type Done = (first: boolean, rules: string[]) => void
type Say = { q: string; mis?: string; k: number } | null

const TASKS = [
  { emoji: '➕', title: 'En büyük 4 basamaklı sayıya 1 ekle' },
  { emoji: '🏰', title: '8.754 mü, 12.006 mı?' },
  { emoji: '🔍', title: 'Büyüteçle soldan sağa' },
  { emoji: '🎯', title: '45.2□□ yarışı' },
  { emoji: '⚖️', title: 'Karar veren basamağı bul' },
  { emoji: '🧺', title: 'Kutuya hangi rakamlar gelir?' },
]

export default function SayilariKarsilastir({ grade, onFinish }: InteractionProps) {
  const [idx, setIdx] = useState(0)
  const [rules, setRules] = useState<string[]>([])
  const [guess, setGuess] = useState<number | null>(null)
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

/** Görev içi düşündüren soru: her yanlışta deneme sayacına yazılır */
function useSay(checks: ReturnType<typeof useChecks>) {
  const [say, setSay] = useState<Say>(null)
  const [wrong, setWrong] = useState<number | null>(null)
  return {
    say,
    wrong,
    clear() {
      setSay(null)
      setWrong(null)
    },
    nudge(q: string, opts: { mis?: string; at?: number } = {}) {
      checks.fail()
      setWrong(opts.at ?? null)
      setSay((s) => ({ q, mis: opts.mis, k: (s?.k ?? 0) + 1 }))
    },
    view: () => (say ? <Nudge key={say.k} question={say.q} misconception={say.mis} /> : null),
  }
}

/* ───────────── 1. 9.999 + 1 ───────────── */

function GrowTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const [counts, setCounts] = useState([9, 9, 9, 9, 0])
  const [phase, setPhase] = useState<'add' | 'trade' | 'ask' | 'done'>('add')
  const over = counts.findIndex((c) => c >= 10)
  const value = counts.reduce((sum, c, e) => sum + c * 10 ** e, 0)
  const rules = ['En büyük 4 basamaklı sayı (9.999) bile en küçük 5 basamaklı sayıdan (10.000) küçüktür.']

  const dnd = useDnd((item, target) => {
    const e = Number(target.replace('mat-', ''))
    if (!target.startsWith('mat-')) return
    if (item === 'unit') {
      if (e !== 0) return s.nudge('Tek bir küp 1 birliktir. Hangi basamağa gider?', { at: e })
      s.clear()
      sfx.ok()
      setCounts([10, 9, 9, 9, 0])
      setPhase('trade')
      return
    }
    if (item === 'bundle' && over >= 0) {
      if (e !== over + 1)
        return s.nudge(
          e === over ? `Demet zaten ${PLACE[over].name.toLowerCase()} basamağında. 10 ${PLACE[over].unit} birleşince neye dönüşür? Bir sola taşı.` : `10 ${PLACE[over].unit} birleşince 1 ${PLACE[over + 1].unit} olur. Hemen solundaki basamağa taşı.`,
          { at: e, mis: e < over ? 'Bozdurma yönünü karıştırıyor' : undefined },
        )
      s.clear()
      sfx.ok()
      const c = counts.slice()
      c[over] -= 10
      c[over + 1] += 1
      setCounts(c)
      if (!c.some((x) => x >= 10)) setPhase('ask')
    }
  })

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <p className="text-center text-2xl font-black text-ink tabular-nums">{phase === 'add' ? n(9999) : over >= 0 ? `${n(9999)} + 1 = ?` : n(value)}</p>
          <BlockMat counts={counts} dnd={dnd} wrong={s.wrong} />
        </Stage>
      }
      panel={
        <>
          {phase === 'add' && (
            <>
              <Prompt step="Sürükle">Altlıkta 4 basamaklı en büyük sayı var: 9.999. Her basamakta 9 blok. Bu tek küpü altlıkta doğru basamağa sürükle.</Prompt>
              <Tray title="1 birlik">
                <Drag dnd={dnd} item="unit" label="1 birlik küp" className={`${TOKEN} gap-1 px-4`}>
                  <span className="size-5 rounded-[3px] bg-yellow-400 ring-2 ring-yellow-600" />
                  <span className="text-xs font-black text-yellow-700">1 birlik</span>
                </Drag>
              </Tray>
            </>
          )}
          {phase === 'trade' && over >= 0 && (
            <Prompt step="Bozdur">{PLACE[over].name} basamağında 10 {PLACE[over].unit} oldu, ama bir basamağa en fazla 9 sığar. Kırmızı çerçeveli 10 {PLACE[over].unit} demetini birleştirmek için tut ve doğru basamağa sürükle.</Prompt>
          )}
          {s.view()}
          {phase === 'ask' && (
            <>
              <Prompt step="Ne oldu?">Bir tek birlik, sayıyı 5 basamaklı yaptı: 10.000. Altlıkta artık yalnızca bir on binlik kule var.</Prompt>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('done')}
                ask={{
                  q: '9.999, 4 basamaklı en büyük sayıydı ve 10.000’e 1 birlik eksikti. O hâlde 4 basamaklı bir sayı ile 10.000 için ne söylersin?',
                  options: [
                    { label: '4 basamaklı her sayı 10.000’den küçüktür', ok: true },
                    { label: 'Rakamları büyükse 10.000’i geçebilir', nudge: 'En büyük rakamlarla yazılan 4 basamaklı sayı 9.999’du. O bile 10.000’e ulaşmak için 1 birlik istedi.', mis: 'Sayının büyüklüğünü rakamların büyüklüğüne göre değerlendiriyor' },
                    { label: 'Bazen 10.000’e eşit olabilir', nudge: 'Altlığa bak: 10.000 bir on binlik kule. 4 basamaklı bir sayıda on binlik var mı?' },
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

const NUMS = { a: 8754, b: 12006 }

function DigitsTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const track = useTracker()
  const [phase, setPhase] = useState<'predict' | 'build' | 'fill' | 'ask' | 'done'>('predict')
  const [pred, setPred] = useState<'a' | 'b' | null>(null)
  /** yerleşen kartlar: "satır-basamak" → kart kimliği */
  const [placed, setPlaced] = useState<Record<string, string>>({})
  const [poured, setPoured] = useState<{ a: boolean; b: boolean }>({ a: false, b: false })
  const rules = ['Basamak sayısı fazla olan doğal sayı daha büyüktür.']
  const cards = (k: 'a' | 'b') => String(NUMS[k]).split('').map((d, i) => ({ id: `${k}-${i}`, d: Number(d) }))
  const used = new Set(Object.values(placed))
  const built = used.size === 9

  const dnd = useDnd((item, target) => {
    if (item === 'crown' && target.startsWith('num-')) {
      const k = target.slice(4) as 'a' | 'b'
      setPred(k)
      track.strategy(`Tahmin: ${n(NUMS[k])} daha büyük`)
      sfx.ok()
      window.setTimeout(() => setPhase('build'), 500)
      return
    }
    if (target.startsWith('cell-')) {
      const [, ri, e] = target.split('-').map(Number)
      const k = item[0] as 'a' | 'b'
      const i = Number(item.slice(2))
      const v = NUMS[k]
      const d = Number(String(v)[i])
      if (placed[`${ri}-${e}`]) return
      if ((k === 'a' ? 0 : 1) !== ri) return s.nudge(`Bu kart ${n(v)} sayısının kartı. ${k === 'a' ? 'Mavi' : 'Turuncu'} satıra yerleştir.`, { at: e })
      if (digitAt(v, e) !== d) {
        const leftAligned = k === 'a' && e === 4 - i
        return s.nudge(
          leftAligned ? `Sayılar birler basamağından hizalanır. ${n(v)} sayısının son rakamı ${String(v).at(-1)} birler sütununa gider. ${d} hangi basamakta?` : `${n(v)} sayısını sağdan oku: ${String(v).at(-1)} birler, ${String(v).at(-2)} onlar… ${d} hangi basamakta?`,
          { at: e, mis: leftAligned ? 'Sayıyı basamak tablosuna soldan hizalıyor' : undefined },
        )
      }
      s.clear()
      sfx.ok()
      const p = { ...placed, [`${ri}-${e}`]: item }
      setPlaced(p)
      if (Object.keys(p).length === 9) window.setTimeout(() => setPhase('fill'), 600)
      return
    }
    if (target.startsWith('tw-')) {
      const k = item.slice(4) as 'a' | 'b'
      if (target !== `tw-${k}`) return s.nudge(`Bu bloklar ${n(NUMS[k])} sayısının. ${k === 'a' ? 'Mavi' : 'Turuncu'} kuleye dök.`)
      s.clear()
      sfx.ok()
      const p = { ...poured, [k]: true }
      setPoured(p)
      if (p.a && p.b) window.setTimeout(() => setPhase('ask'), 1200)
    }
  })

  const row = (k: 'a' | 'b', ri: number) => ({
    label: n(NUMS[k]),
    color: k === 'a' ? A : B,
    cells: Array.from({ length: 5 }, (_, e) => {
      const id = placed[`${ri}-${e}`]
      if (id) return String(NUMS[k])[Number(id.slice(2))]
      return built && digitAt(NUMS[k], e) === null ? null : ''
    }),
  })

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          {phase === 'predict' ? (
            <div className="grid grid-cols-2 gap-3 py-4">
              {(['a', 'b'] as const).map((k) => (
                <Drop key={k} dnd={dnd} id={`num-${k}`} className="grid min-h-32 place-items-center rounded-3xl border-2 border-dashed border-slate-300 bg-white/70 text-4xl font-black tabular-nums sm:text-5xl">
                  <span style={{ color: k === 'a' ? A : B }}>{pred === k && '👑 '}{n(NUMS[k])}</span>
                </Drop>
              ))}
            </div>
          ) : (
            <PlaceTable rows={[row('a', 0), row('b', 1)]} dnd={dnd} wrong={s.wrong} cellDrop={phase === 'build' ? (ri, e) => `cell-${ri}-${e}` : undefined} lens={built && phase === 'fill' ? 4 : null} />
          )}
          {(phase === 'fill' || phase === 'ask' || phase === 'done') && (
            <div className="flex flex-wrap items-end justify-center gap-6 rounded-2xl bg-white/80 p-3 ring-1 ring-line animate-fade-up">
              {(['a', 'b'] as const).map((k) => (
                <Drop key={k} dnd={dnd} id={`tw-${k}`} className="rounded-2xl p-2">
                  <Towers value={poured[k] ? NUMS[k] : null} label={n(NUMS[k])} color={k === 'a' ? A : B} scale={k === 'a' ? 1 : 2} />
                </Drop>
              ))}
            </div>
          )}
        </Stage>
      }
      panel={
        <>
          {phase === 'predict' && (
            <>
              <Prompt step="Tahmin et">Hangisi daha büyük? Hesaplama yapma. Tacı daha büyük olduğunu düşündüğün sayının üstüne sürükle.</Prompt>
              <Tray title="Taç">
                <Drag dnd={dnd} item="crown" label="Taç: daha büyük" className={`${TOKEN} text-4xl`}>👑</Drag>
              </Tray>
            </>
          )}
          {phase === 'build' && (
            <>
              <Prompt step="Yerleştir">Rakam kartlarını basamak tablosuna yerleştir. Her rakam kendi basamağına gitmeli.</Prompt>
              {(['a', 'b'] as const).map((k) => (
                <Tray key={k} title={`${n(NUMS[k])} kartları`}>
                  {cards(k).map((c) =>
                    used.has(c.id) ? (
                      <span key={c.id} className="grid size-14 place-items-center rounded-2xl border-2 border-dashed border-slate-200" />
                    ) : (
                      <Drag key={c.id} dnd={dnd} item={c.id} label={`${n(NUMS[k])}: ${c.d} kartı`} className={`${TOKEN} w-14 px-0 text-3xl`}>
                        <span style={{ color: k === 'a' ? A : B }}>{c.d}</span>
                      </Drag>
                    ),
                  )}
                </Tray>
              ))}
            </>
          )}
          {phase === 'fill' && (
            <>
              <Prompt step="Kuleye dök">8.754’ün on binler kutusu boş kaldı! Bir on binlik kule, üst üste 10 binlikten oluşur. Her sayının bloklarını kendi kulesine sürükle.</Prompt>
              {(['a', 'b'] as const).map((k) =>
                poured[k] ? null : (
                  <Drag key={k} dnd={dnd} item={`blk-${k}`} label={`${n(NUMS[k])} blokları`} className="w-full rounded-2xl">
                    <BlockRow counts={countsOf(NUMS[k])} label={`${n(NUMS[k])} blokları ⠿`} color={k === 'a' ? A : B} />
                  </Drag>
                ),
              )}
            </>
          )}
          {s.view()}
          {phase === 'ask' && (
            <DragAsk
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
          {phase === 'done' && pred === 'a' && <Nudge tone="ok" question="Tacı önce 8.754’e koymuştun. Kuleler fikrini değiştirdi: iyi matematikçiler de böyle yapar!" />}
          {phase === 'done' && <RulesFound rules={rules} />}
          {phase === 'done' && <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />}
        </>
      }
    />
  )
}

/* ───────────── 3. 45.210 ile 45.830: büyüteç ───────────── */

function ScanTask({ onDone, last, onGuess }: TaskProps & { onGuess: (g: number) => void }) {
  const checks = useChecks()
  const s = useSay(checks)
  const track = useTracker()
  const [a, b] = [45210, 45830]
  const fd = firstDiff(a, b, 5)
  const [phase, setPhase] = useState<'walk' | 'mark' | 'which' | 'predict' | 'done'>('walk')
  const [lens, setLens] = useState<number | null>(null)
  const [next, setNext] = useState(4)
  const [marks, setMarks] = useState<Partial<Record<number, Mark>>>({})
  const [crown, setCrown] = useState<number | null>(null)
  const rules = ['Basamak sayıları eşitse en soldaki basamaktan başlarım; ilk farklı rakamda durur, büyük olana bakarım.']

  const dnd = useDnd((item, target) => {
    if (item === 'lens' && target.startsWith('col-') && phase === 'walk') {
      const e = Number(target.slice(4))
      if (e !== next) {
        if (next === 4 && e === 0) return s.nudge('Birler basamağı en az değer taşıyan basamak. 1 birlik mi daha değerli, 1 on binlik mi? Büyüteci en değerli basamağa koy.', { at: e, mis: 'Karşılaştırmaya sağdan (birlerden) başlıyor' })
        if (next === 4) return s.nudge('Solunda daha değerli bir basamak var mı? En çok değeri taşıyan basamaktan başla.', { at: e })
        return s.nudge(`Büyüteç soldan sağa, sırayla ilerler. ${PLACE[next + 1].name} basamağından sonra hangisi geliyor?`, { at: e })
      }
      s.clear()
      sfx.ok()
      setLens(e)
      setPhase('mark')
      return
    }
    if ((item === 'eq' || item === 'ne') && phase === 'mark' && lens !== null && target === `mark-${lens}`) {
      const isSame = digitAt(a, lens) === digitAt(b, lens)
      if ((item === 'eq') !== isSame)
        return s.nudge(isSame ? `Büyütece tekrar bak: iki sayının ${PLACE[lens].name.toLowerCase()} basamağında da ${digitAt(a, lens)} var.` : `Büyütece tekrar bak: ${digitAt(a, lens)} ${PLACE[lens].unit} ile ${digitAt(b, lens)} ${PLACE[lens].unit} aynı mı?`)
      s.clear()
      sfx.ok()
      track.attempt(true)
      setMarks((m) => ({ ...m, [lens]: isSame ? 'same' : 'diff' }))
      if (isSame) {
        setNext(lens - 1)
        setPhase('walk')
      } else setPhase('which')
      return
    }
    if (item === 'crown' && target.startsWith('row-') && phase === 'which') {
      const ri = Number(target.slice(4))
      if (ri !== 1) return s.nudge('Büyüteç yüzlerde durdu. Bloklara bak: 2 yüzlük mü daha çok, 8 yüzlük mü?')
      s.clear()
      sfx.ok()
      setCrown(1)
      window.setTimeout(() => setPhase('predict'), 600)
    }
  })

  const fdBlocks = (v: number) => Array.from({ length: 5 }, (_, e) => (e === fd ? digitAt(v, e) ?? 0 : 0))

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <PlaceTable
            rows={[{ label: n(a), color: A, cells: cellsOf(a, 5) }, { label: n(b), color: B, cells: cellsOf(b, 5) }]}
            dnd={dnd}
            marks={marks}
            lens={lens}
            wrong={s.wrong}
            crown={crown}
            colDrop={phase === 'walk' ? (e) => `col-${e}` : undefined}
            markDrop={phase === 'mark' ? (e) => (e === lens ? `mark-${e}` : undefined) : undefined}
            rowDrop={phase === 'which' ? (ri) => `row-${ri}` : undefined}
          />
          {(phase === 'which' || phase === 'predict' || phase === 'done') && (
            <div className="grid gap-2 sm:grid-cols-2 animate-fade-up">
              <BlockRow counts={fdBlocks(a)} label={`${n(a)} → ${PLACE[fd].name.toLowerCase()}`} color={A} />
              <BlockRow counts={fdBlocks(b)} label={`${n(b)} → ${PLACE[fd].name.toLowerCase()}`} color={B} />
            </div>
          )}
        </Stage>
      }
      panel={
        <>
          {phase === 'walk' && (
            <>
              <Prompt step="Büyüteç">{next === 4 ? 'İki sayı da 5 basamaklı: basamak sayısı karar veremedi. Karşılaştırmaya hangi basamaktan başlamalıyız? Büyüteci o sütuna sürükle.' : 'Bu basamakta rakamlar aynıydı, karar veremedi. Büyüteci bir sonraki basamağa sürükle.'}</Prompt>
              <Tray title="Büyüteç"><LensToken dnd={dnd} /></Tray>
            </>
          )}
          {phase === 'mark' && lens !== null && (
            <>
              <Prompt step="İşaretle">Büyüteç {PLACE[lens].name.toLowerCase()} basamağında: {digitAt(a, lens)} ve {digitAt(b, lens)}. Aynılarsa “=”, farklılarsa “≠” kartını iki rakamın arasındaki yuvaya sürükle.</Prompt>
              <Tray title="İşaretler">
                <Drag dnd={dnd} item="eq" label="Aynı (=)" className={`${TOKEN} text-3xl`}>=</Drag>
                <Drag dnd={dnd} item="ne" label="Farklı (≠)" className={`${TOKEN} text-3xl text-pink-600`}>≠</Drag>
              </Tray>
            </>
          )}
          {phase === 'which' && (
            <>
              <Prompt step="Karar">Büyüteç {PLACE[fd].name.toLowerCase()} basamağında durdu; soldaki basamaklar aynıydı, silikleşti. Tacı daha büyük sayının adına sürükle.</Prompt>
              <Tray title="Taç"><Drag dnd={dnd} item="crown" label="Taç: daha büyük" className={`${TOKEN} text-4xl`}>👑</Drag></Tray>
            </>
          )}
          {s.view()}
          {phase === 'predict' && (
            <DragAsk
              checks={checks}
              okText="Tahminini bir sonraki görevde deneyeceğiz!"
              onOk={(i) => {
                onGuess(i)
                track.strategy(i === 0 ? 'Tahmin: sağdaki rakamlar sonucu değiştirebilir' : 'Tahmin: sağdaki rakamlar sonucu değiştiremez')
                setPhase('done')
              }}
              ask={{
                q: 'Tahmin et: 45.210’un onlar ve birler rakamlarını istediğin gibi değiştirsen 45.830’u geçebilir misin?',
                options: [
                  { label: 'Geçebilirim', ok: true },
                  { label: 'Geçemem', ok: true },
                ],
              }}
            />
          )}
          {phase === 'done' && <RulesFound rules={rules} />}
          {phase === 'done' && <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />}
        </>
      }
    />
  )
}

/* ───────────── 4. 45.2□□ ile 45.830 ───────────── */

function TailTask({ onDone, last, guess }: TaskProps & { guess: number | null }) {
  const checks = useChecks()
  const s = useSay(checks)
  const b = 45830
  const [tens, setTens] = useState(1)
  const [ones, setOnes] = useState(0)
  const [moves, setMoves] = useState(0)
  const [phase, setPhase] = useState<'try' | 'ask' | 'done'>('try')
  const a = 45200 + tens * 10 + ones
  const rules = ['İlk farklı basamaktan sonraki rakamlar sonucu değiştiremez: 1 yüzlük, onlar ve birlerin en büyük hâlinden (99) bile büyüktür.']
  const maxed = tens === 9 && ones === 9
  const marks: Partial<Record<number, Mark>> = { 4: 'same', 3: 'same', 2: 'diff' }

  const dnd = useDnd((item, target) => {
    if (phase !== 'try' || !target.startsWith('cell-')) return
    const [, ri, e] = target.split('-').map(Number)
    if (ri !== 0 || e > 1) return s.nudge('Bu yarışta yalnızca 45.2□□ sayısının onlar ve birler kutularını değiştirebilirsin.', { at: e })
    s.clear()
    sfx.ok()
    const d = Number(item.slice(2))
    if (e === 1) setTens(d)
    else setOnes(d)
    setMoves((m) => m + 1)
  })

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <PlaceTable rows={[{ label: n(a), color: A, cells: cellsOf(a, 5), edit: phase === 'try' ? [1, 0] : [] }, { label: n(b), color: B, cells: cellsOf(b, 5) }]} marks={marks} dnd={dnd} wrong={s.wrong} cellDrop={phase === 'try' ? (ri, e) => `cell-${ri}-${e}` : undefined} />
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
              <Prompt step="Dene">Rakam kartlarını 45.2□□ sayısının onlar ve birler kutularına sürükle. 45.830’u geçebilir misin?</Prompt>
              {guess !== null && <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-900 ring-1 ring-sky-200">Tahminin: {guess === 0 ? 'geçebilirim' : 'geçemem'}. Şimdi dene!</p>}
              <Tray title="Rakam kartları">
                {Array.from({ length: 10 }, (_, d) => (
                  <Drag key={d} dnd={dnd} item={`d-${d}`} label={`${d} kartı`} className={`${TOKEN} w-14 px-0 text-3xl`}>{d}</Drag>
                ))}
              </Tray>
              {s.view()}
              {maxed && <Nudge question="İkisine de en büyük rakamı, 9’u koydun: 45.299. Daha büyük bir rakam kartı yok. 45.830’a yetişebildi mi?" />}
              {(maxed || moves >= 6) && (
                <DragAsk
                  checks={checks}
                  onOk={() => setPhase('done')}
                  ask={{
                    q: '45.2□□ en fazla 45.299 olabiliyor. Neden 45.830’u hiç geçemiyor?',
                    options: [
                      { label: '45.830’da 6 yüzlük fazla var; onlar ve birler en fazla 99 eder, 1 yüzlüğü bile tamamlayamaz', ok: true },
                      { label: 'Seçebileceğim rakamlar yeterince büyük değil', nudge: 'Onlar ve birlere en büyük rakamı, 9’u koyabildin. 99, 1 yüzlükten büyük mü?', mis: 'Sağdaki basamakların sonucu değiştirebileceğini düşünüyor' },
                      { label: 'Sayı doğrusu buna izin vermiyor', nudge: 'Sayı doğrusu yalnızca gösteriyor. Turuncu bant neden 45.300’e bile ulaşmıyor? Bant kaç birlik genişliğinde?' },
                    ],
                  }}
                />
              )}
            </>
          )}
          {phase === 'done' && guess === 0 && <Nudge tone="ok" question="Tahminin “geçebilirim”di. Denedin ve modelden nedenini buldun!" />}
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
  const s = useSay(checks)
  const [i, setI] = useState(0)
  const [step, setStep] = useState<'col' | 'sign' | 'next'>('col')
  const [a, b] = PAIRS[i]
  const fd = firstDiff(a, b, 5)
  const right = a < b ? '<' : '>'
  const allDone = i >= PAIRS.length - 1 && step === 'next'
  const rules = ['Sağdaki rakamlar ne kadar büyük olursa olsun, soldan ilk farklı basamak karar verir.']

  const marks: Partial<Record<number, Mark>> = {}
  if (step !== 'col') {
    for (let e = 4; e > fd; e--) marks[e] = 'same'
    marks[fd] = 'diff'
  }

  const dnd = useDnd((item, target) => {
    if (item === 'lens' && step === 'col' && target.startsWith('col-')) {
      const e = Number(target.slice(4))
      if (e !== fd) {
        if (digitAt(a, e) === digitAt(b, e)) return s.nudge('Bu basamakta iki sayının rakamı aynı. Aynı olan basamak karar veremez.', { at: e })
        return s.nudge('Burada rakamlar farklı, ama daha solda farklı bir basamak var mı? Soldan başla.', { at: e, mis: 'Sağdaki basamağa göre karar veriyor' })
      }
      s.clear()
      sfx.ok()
      setStep('sign')
      return
    }
    if ((item === '<' || item === '>') && step === 'sign' && target === 'sign') {
      if (item !== right) {
        const da = digitAt(a, fd), db = digitAt(b, fd)
        return s.nudge(
          da === null || db === null ? `${n(da === null ? a : b)} sayısının ${PLACE[fd].name.toLowerCase()} basamağı boş. Hangisinin basamağı daha çok?` : `Karar veren basamakta ${da} ve ${db} var. Hangisi büyük? Ağız büyüğe açılır.`,
          { mis: a === 39999 ? 'Sayının büyüklüğünü rakamların büyüklüğüne göre değerlendiriyor' : undefined },
        )
      }
      s.clear()
      sfx.ok()
      setStep('next')
      if (i + 1 < PAIRS.length) window.setTimeout(() => { setI(i + 1); setStep('col') }, 1400)
    }
  })

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <p className="text-xs font-black tracking-wide text-slate-500 uppercase">Çift {i + 1} / {PAIRS.length}</p>
          <PlaceTable key={i} rows={[{ label: n(a), color: A, cells: cellsOf(a, 5) }, { label: n(b), color: B, cells: cellsOf(b, 5) }]} marks={marks} lens={step === 'col' ? null : fd} wrong={s.wrong} dnd={dnd} colDrop={step === 'col' ? (e) => `col-${e}` : undefined} />
          <div className="flex items-center justify-center gap-2 text-3xl font-black tabular-nums">
            <span style={{ color: A }}>{n(a)}</span>
            <Drop dnd={dnd} id="sign" className={`grid size-14 place-items-center rounded-2xl ${step === 'next' ? 'bg-emerald-100 text-emerald-700' : step === 'sign' ? 'border-2 border-dashed border-sky-400 bg-sky-50 text-sky-400' : 'bg-white text-slate-300 ring-2 ring-line'}`}>
              {step === 'next' ? right : '?'}
            </Drop>
            <span style={{ color: B }}>{n(b)}</span>
          </div>
        </Stage>
      }
      panel={
        <>
          {step === 'col' && (
            <>
              <Prompt step="Büyüteç">Karar veren basamak hangisi? Büyüteci o sütuna sürükle.</Prompt>
              <Tray title="Büyüteç"><LensToken dnd={dnd} /></Tray>
            </>
          )}
          {step === 'sign' && (
            <>
              <Prompt step="Karşılaştır">Doğru işareti iki sayının arasındaki yuvaya sürükle.</Prompt>
              <Tray title="İşaretler">
                <Drag dnd={dnd} item="<" label="Küçüktür" className={`${TOKEN} text-3xl`}>&lt;</Drag>
                <Drag dnd={dnd} item=">" label="Büyüktür" className={`${TOKEN} text-3xl`}>&gt;</Drag>
              </Tray>
            </>
          )}
          {s.view()}
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
  { e: 2, text: '63.□41 > 63.552', make: (d: number) => 63041 + d * 100, other: 63552 },
  { e: 3, text: '8□.500 < 84.120', make: (d: number) => 80500 + d * 1000, other: 84120 },
]

function MissingTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const [k, setK] = useState(0)
  const [sorted, setSorted] = useState<Record<number, 'yes' | 'no'>>({})
  const [peek, setPeek] = useState<number | null>(null)
  const item = MISSING[k]
  const rel = item.text.includes('>') ? '>' : '<'
  const fits = (d: number) => (rel === '>' ? item.make(d) > item.other : item.make(d) < item.other)
  const other = digitAt(item.other, item.e)!
  const ok = Object.keys(sorted).length === 10
  const rules = ['Bilinmeyen rakamı bulurken de soldan ilk farklı basamağa bakarım; rakamlar eşit çıkarsa bir sağdaki basamak karar verir.']
  const cmp = (d: number) => `${n(item.make(d))} ${item.make(d) > item.other ? '>' : '<'} ${n(item.other)}`

  const dnd = useDnd((it, target) => {
    const d = Number(it.slice(2))
    if (target === 'box') {
      setPeek(d)
      s.clear()
      return
    }
    if (target !== 'yes' && target !== 'no') return
    setPeek(d)
    if ((target === 'yes') !== fits(d)) {
      return s.nudge(
        d === other
          ? `${d} koyunca ${n(item.make(d))} olur. ${PLACE[item.e].name} basamağında ikisinde de ${d} var: karar veremedi. Bir sağdaki basamağa bak: ${cmp(d)}.`
          : `${d} koyunca ${PLACE[item.e].name.toLowerCase()} basamağında ${d} ile ${other} karşılaşır. Karar orada verilir: ${cmp(d)}. ${fits(d) ? 'Bu rakam uyuyor!' : 'Bu rakam uymuyor.'}`,
        { mis: d === other ? 'Rakamlar eşit olunca sağdaki basamağa geçmiyor' : undefined },
      )
    }
    s.clear()
    sfx.ok()
    setSorted((m) => ({ ...m, [d]: target }))
  })

  const nextItem = () => {
    setK(k + 1)
    setSorted({})
    setPeek(null)
    s.clear()
  }

  const cellsA = cellsOf(item.make(peek ?? 0), 5).map((c, e) => (e === item.e ? (peek === null ? '' : String(peek)) : c))
  const marks: Partial<Record<number, Mark>> = {}
  if (peek !== null) {
    const fd = firstDiff(item.make(peek), item.other, 5)
    for (let e = 4; e > fd; e--) marks[e] = 'same'
    if (fd >= 0) marks[fd] = 'diff'
  }
  const basket = (id: 'yes' | 'no', title: string, tone: string) => (
    <Drop dnd={dnd} id={id} className={`min-h-28 rounded-2xl border-2 border-dashed p-2 ${tone}`}>
      <p className="mb-1 text-sm font-black">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(sorted).filter(([, v]) => v === id).map(([d]) => (
          <span key={d} className="grid size-10 place-items-center rounded-xl bg-white text-xl font-black text-ink ring-1 ring-line animate-pop">{d}</span>
        ))}
      </div>
    </Drop>
  )

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <p className="text-center text-3xl font-black tabular-nums text-ink">{item.text}</p>
          <PlaceTable rows={[{ label: 'Kutulu', color: A, cells: cellsA, edit: [item.e] }, { label: n(item.other), color: B, cells: cellsOf(item.other, 5) }]} marks={marks} dnd={dnd} cellDrop={(ri, e) => (ri === 0 && e === item.e ? 'box' : undefined)} />
          {peek !== null && <p className={`text-center text-xl font-black ${fits(peek) ? 'text-emerald-700' : 'text-slate-500'}`}>{cmp(peek)} {fits(peek) ? '✓ uyar' : '✗ uymaz'}</p>}
          <div className="grid grid-cols-2 gap-2">
            {basket('yes', '✓ Olur', 'border-emerald-400 bg-emerald-50 text-emerald-800')}
            {basket('no', '✗ Olmaz', 'border-slate-300 bg-slate-50 text-slate-600')}
          </div>
        </Stage>
      }
      panel={
        <>
          <Prompt step={`Soru ${k + 1} / ${MISSING.length}`}>{item.text} olması için kutuya hangi rakamlar gelebilir? Bir kartı tablodaki kutuya sürükleyip dene, sonra “Olur” ya da “Olmaz” sepetine at.</Prompt>
          {!ok && (
            <Tray title="Rakam kartları">
              {Array.from({ length: 10 }, (_, d) => d).filter((d) => !(d in sorted)).map((d) => (
                <Drag key={d} dnd={dnd} item={`d-${d}`} label={`${d} kartı`} className={`${TOKEN} w-14 px-0 text-3xl`}>{d}</Drag>
              ))}
            </Tray>
          )}
          {s.view()}
          {ok && <Nudge tone="ok" question={`Evet! Olanlar: ${Object.keys(sorted).filter((d) => sorted[Number(d)] === 'yes').join(', ')}. ${other} neden olmadı? Eşit çıkınca karar bir sağdaki basamağa kaldı.`} />}
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
