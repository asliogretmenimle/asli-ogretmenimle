import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Box, Sparkles } from 'lucide-react'
import type { InteractionProps } from '../types'
import { Card, NextButton, Nudge, NumPad, parseNum, shuffle, Stepper, useChecks } from '../donusum-studyosu/ortak'
import { Drag, DragAsk, Drop, RulesFound, TOKEN, useDnd, type Ask, type ToolInfo } from '../sayilari-karsilastir/parts'
import { Now, Runner, type Done, type TaskDef } from '../virgul-nereden-geliyor/bolme'
import { BoxScene, FoldControls, NetThumb, useFold, type LabelMode } from './KutuSahnesi'
import { FACES, NETS, PAIR_COLOR, PAIR_NAME, analyze, surfaceArea, type FaceId, type NetDef, type Pair } from './acinim'

/**
 * 102. Prizmanın Açınımı ve Yüzey Alanı (3B) — 7. sınıf MAT.7.4.2
 *  1. Kutuyu aç: 3B kutuyu kaydırıcıyla aç-katla, boyutlarını değiştir; 6 yüz, 3 çift eş dikdörtgen
 *  2. Farklı açınımlar: aynı kutunun dört açınımını katla; sonra “kutu olur / olmaz” tahmin et, katlayıp dene
 *  3. Açınımdan yüzey alanı: yüzlere dokunup boyutlarını gör, alan kartlarını tabloya sürükle; sonra kendin hesapla
 *  4. Paketleme ustası: hediye kutusu, üstü açık akvaryum, küp zar
 *  5. En az karton: hacmi 12 birim küp olan kutuların yüzey alanlarını karşılaştır
 */

const T = {
  rotate: { icon: <span className="text-base leading-none">🖐️</span>, name: '3B sahne', text: 'Kutuyu parmağınla (farede sol tuşla) sürükleyerek çevir. İki parmakla ya da fare tekerleğiyle yakınlaş. “3B”, “Üstten”, “Önden” düğmeleri kamerayı o yöne götürür.' },
  fold: { icon: <Box size={18} className="text-pink-600" />, name: 'Katlama', text: '“Aç” ve “Katla” düğmeleri kutuyu yavaşça açar ya da kapatır. Kaydırıcıyı sürükleyerek katlamayı adım adım kendin de yapabilirsin.' },
  tap: { icon: <span className="text-base leading-none">👆</span>, name: 'Yüze dokun', text: 'Açınımdaki bir dikdörtgene dokununca kenar uzunlukları (kaç birim kare olduğu) üstünde yazar.' },
  cards: { icon: <span className="text-base leading-none">🔢</span>, name: 'Sayı kartları', text: 'Sayı kartını tutup tablodaki boş kutuya sürükle. Yanlışsa kart geri döner ve bir ipucu sorusu çıkar.' },
  net: { icon: <span className="text-base leading-none">🗺️</span>, name: 'Açınım kartları', text: 'Bir açınım kartına dokununca sahnede o açınım belirir. Katlayıp kutu olup olmadığına bak.' },
  guess: { icon: <span className="text-base leading-none">✅</span>, name: 'Tahmin kartları', text: '“Kutu olur” ya da “Kutu olmaz” kartını “Tahminin” kutusuna sürükle. Sonra açınım kendiliğinden katlanır.' },
  pad: { icon: <span className="text-base leading-none">⌨️</span>, name: 'Sayı tuşları', text: 'Cevabını tuşlarla yaz, sonra “Kontrol et” düğmesine bas.' },
  box: { icon: <span className="text-base leading-none">📦</span>, name: 'Kutu kartları', text: 'Bir kutu kartını tutup sahnenin altındaki “Kutuyu buraya sürükle” alanına bırak.' },
} satisfies Record<string, ToolInfo>

export default function PrizmaAcinimYuzeyAlani({ grade, onFinish }: InteractionProps) {
  const tasks: TaskDef[] = [
    { emoji: '📦', title: 'Kutuyu aç, katla', goal: 'Dikdörtgenler prizmasını 3B olarak açıp katlamak; açınımdaki yüzleri ve aralarındaki ilişkiyi keşfetmek.', tools: [T.fold, T.rotate, 'answer'], render: (done, last) => <Explore onDone={done} last={last} /> },
    { emoji: '✂️', title: 'Farklı açınımlar', goal: 'Aynı kutunun farklı açınımlarını katlamak; bir açınımın kutu olup olmayacağını tahmin edip denemek.', tools: [T.net, T.guess, T.fold, T.rotate], render: (done, last) => <Nets onDone={done} last={last} /> },
    { emoji: '🧮', title: 'Açınımdan yüzey alanı', goal: 'Açınımdaki dikdörtgenlerin alanlarından kutunun yüzey alanını bulmak.', tools: [T.tap, T.cards, T.pad, T.fold, 'answer'], render: (done, last) => <AreaFromNet onDone={done} last={last} /> },
    { emoji: '🎁', title: 'Paketleme ustası', goal: 'Günlük hayattaki kutuların yüzey alanını açınım yardımıyla hesaplamak.', tools: [T.tap, T.pad, T.fold, 'answer'], render: (done, last) => <Packaging onDone={done} last={last} /> },
    { emoji: '🏆', title: 'En az karton', goal: 'Hacmi aynı olan kutuların yüzey alanlarını karşılaştırıp en az kartonla yapılanı bulmak.', tools: [T.box, T.fold, T.rotate, 'answer'], render: (done, last) => <LeastCardboard onDone={done} last={last} /> },
  ]
  return (
    <Runner
      grade={grade}
      onFinish={onFinish}
      tasks={tasks}
      summary={(rules) => `Dikdörtgenler prizmasını 3B olarak açıp katladın, farklı açınımları denedin ve yüzey alanını açınımdan hesapladın. ${rules.length} kural buldun.`}
      insight="Dikdörtgenler prizmasının yüzey alanı, açınımındaki 6 dikdörtgenin alanları toplamıdır. Karşılıklı yüzler eş olduğundan Yüzey alanı = 2 × (a·b + a·c + b·c). Bir prizmanın birçok açınımı vardır ama hepsinin alanı aynıdır."
      note="Bu kuralları kutuları 3B olarak açıp katlayarak kendin keşfettin."
    />
  )
}

/* ───────────── ortak ───────────── */

function Layout({ scene, panel }: { scene: ReactNode; panel: ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-2">{scene}</div>
      <div className="flex min-w-0 flex-col gap-3">{panel}</div>
    </div>
  )
}

function Finish({ rule, last, onNext, ask, checks }: { rule: string; last: boolean; onNext: () => void; ask?: Ask; checks: ReturnType<typeof useChecks> }) {
  const [asked, setAsked] = useState(!ask)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    window.setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200)
  }, [asked])
  return (
    <div ref={ref} className="mx-auto max-w-2xl space-y-3">
      {!asked && ask && <DragAsk ask={ask} checks={checks} onOk={() => setAsked(true)} okText="Evet! 3B kutu da bunu gösteriyor." />}
      {asked && (
        <>
          <RulesFound rules={[rule]} />
          <NextButton last={last} onClick={onNext} />
        </>
      )}
    </div>
  )
}

function Rounds({ i, n }: { i: number; n: number }) {
  return (
    <div className="flex gap-1.5" aria-label={`Tur ${i + 1} / ${n}`}>
      {Array.from({ length: n }, (_, k) => <span key={k} className={`h-2.5 flex-1 rounded-full ${k < i ? 'bg-emerald-500' : k === i ? 'bg-pink-500' : 'bg-slate-200'}`} />)}
    </div>
  )
}

function LabelSwitch({ value, onChange, options = ['none', 'name', 'dims', 'area'] }: { value: LabelMode; onChange: (v: LabelMode) => void; options?: LabelMode[] }) {
  const L: Record<LabelMode, string> = { none: 'Yazı yok', name: 'Yüz adları', dims: 'Kenarlar', area: 'Alanlar' }
  return (
    <div className="flex flex-wrap gap-1 rounded-2xl bg-white text-ink p-1 ring-1 ring-line" role="radiogroup" aria-label="Yüzlerde ne yazsın?">
      {options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(o)} className={`min-h-10 flex-1 rounded-xl px-2 text-xs font-black whitespace-nowrap ${value === o ? 'bg-sky-600 text-white' : 'text-ink'}`}>{L[o]}</button>
      ))}
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-2 text-xs font-black">
      {(Object.keys(PAIR_NAME) as Pair[]).map((p) => (
        <span key={p} className="inline-flex items-center gap-1.5 rounded-full bg-white text-ink px-2.5 py-1 ring-1 ring-line"><span className="size-3 rounded-sm" style={{ background: PAIR_COLOR[p] }} />{PAIR_NAME[p]}</span>
      ))}
    </div>
  )
}

function Dims({ a, b, c, unit = 'birim' }: { a: number; b: number; c: number; unit?: string }) {
  return <span className="tabular-nums">{a} {unit} × {b} {unit} × {c} {unit}</span>
}

/* ───────────── 1. Kutuyu aç, katla ───────────── */

function Explore({ onDone, last }: { onDone: Done; last: boolean }) {
  const checks = useChecks()
  const fold = useFold(1)
  const [d, setD] = useState({ a: 4, b: 2, c: 3 })
  const [labels, setLabels] = useState<LabelMode>('name')
  const [opened, setOpened] = useState(false)
  const [asked, setAsked] = useState(false)
  const [changed, setChanged] = useState(false)
  const [refolded, setRefolded] = useState(false)
  useEffect(() => {
    if (fold.t < 0.02) setOpened(true)
    if (changed && fold.t > 0.98) setRefolded(true)
  }, [fold.t, changed])
  const setDim = (k: 'a' | 'b' | 'c') => (v: number) => {
    setD((x) => ({ ...x, [k]: v }))
    setChanged(true)
  }
  const step = !opened ? 0 : !asked ? 1 : !refolded ? 2 : 3
  const rule = 'Dikdörtgenler prizmasının açınımı 6 dikdörtgenden oluşur. Karşılıklı yüzler eştir; bu yüzden açınımda 3 çift eş dikdörtgen vardır.'
  const ask: Ask = {
    q: 'Açınımda kaç dikdörtgen var ve bunlar nasıl eşleşiyor?',
    options: [
      { label: '6 dikdörtgen var; karşılıklı yüzler eş olduğu için 3 çift eş dikdörtgen var.', ok: true },
      { label: '6 dikdörtgen var; hepsi birbirinden farklı.', nudge: 'Aynı renkli iki dikdörtgenin kenarlarındaki kareleri say. Boyları aynı mı?', mis: 'Karşılıklı yüzlerin eş olduğunu görmemek' },
      { label: '4 dikdörtgen var; alt ve üst sayılmaz.', nudge: 'Yüzleri tek tek say: alt, üst, ön, arka, sağ, sol. Kutuyu kapatınca hepsi bir yüz olmuyor mu?' },
    ],
  }
  return (
    <div className="space-y-4">
      <Layout
        scene={
          <>
            <BoxScene a={d.a} b={d.b} c={d.c} net={NETS.hac} t={fold.t} labels={labels} />
            <FoldControls fold={fold} />
          </>
        }
        panel={
          <>
            {step === 0 && <Now><b>“Aç”</b> düğmesine bas ya da kaydırıcıyı sola sürükle: kutu açılsın ve yere serilsin.</Now>}
            {step === 1 && (
              <>
                <Now>Açınımı döndürerek incele. Aynı renkli dikdörtgenlere dikkat et.</Now>
                <DragAsk ask={ask} checks={checks} onOk={() => setAsked(true)} okText="Evet! Aynı renkler karşılıklı yüzler." />
              </>
            )}
            {step === 2 && <Now>Şimdi kutunun <b>en</b>, <b>boy</b> ya da <b>yüksekliğini</b> değiştir ve kutuyu yeniden <b>katla</b>.</Now>}
            {step === 3 && <Now done>Kutunun boyutu değişince açınımdaki dikdörtgenler de değişti ama hep 3 çift eş dikdörtgen kaldı.</Now>}
            <Legend />
            <LabelSwitch value={labels} onChange={setLabels} />
            <Card className="space-y-1.5">
              <p className="text-xs font-black tracking-wide text-ink-soft uppercase">Kutunun boyutları</p>
              <Stepper label="En (a)" value={d.a} onChange={setDim('a')} min={1} max={5} />
              <Stepper label="Boy / derinlik (b)" value={d.b} onChange={setDim('b')} min={1} max={4} />
              <Stepper label="Yükseklik (c)" value={d.c} onChange={setDim('c')} min={1} max={4} />
            </Card>
          </>
        }
      />
      {step === 3 && <Finish rule={rule} last={last} checks={checks} onNext={() => onDone(checks.pass(), [rule])} />}
    </div>
  )
}

/* ───────────── 2. Farklı açınımlar ───────────── */

const TRY = [NETS.hac, NETS.yanKapak, NETS.serit, NETS.uzun]
const GUESS = [NETS.merdiven, NETS.ayniTaraf, NETS.yanlisDuvar, NETS.uzunDuvar]
const ND = { a: 4, b: 2, c: 3 }

function Nets({ onDone, last }: { onDone: Done; last: boolean }) {
  const checks = useChecks()
  const fold = useFold(0)
  const [phase, setPhase] = useState<'try' | 'guess' | 'end'>('try')
  const [cur, setCur] = useState<NetDef>(TRY[0])
  const [closed, setClosed] = useState<Set<string>>(() => new Set())
  const [order] = useState(() => shuffle(GUESS))
  const [gi, setGi] = useState(0)
  const [guess, setGuess] = useState<'olur' | 'olmaz' | null>(null)
  const [res, setRes] = useState<{ right: boolean } | null>(null)
  const analysis = useMemo(() => analyze(cur.faces(ND.a, ND.b, ND.c), ND.a, ND.b, ND.c), [cur])

  useEffect(() => {
    if (phase === 'try' && fold.t > 0.98) setClosed((s) => new Set(s).add(cur.id))
  }, [fold.t, phase, cur.id])

  const choose = (n: NetDef) => {
    fold.set(0)
    setCur(n)
  }
  const dnd = useDnd((item, target) => {
    if (target !== 'guess' || guess) return false
    const g = item === 'g-olur' ? 'olur' : 'olmaz'
    setGuess(g)
    window.setTimeout(() => fold.animateTo(1, () => {
      const right = (g === 'olur') === analysis.ok
      if (!right) checks.fail()
      setRes({ right })
    }, 2200), 300)
  })
  const nextGuess = () => {
    setGuess(null)
    setRes(null)
    fold.set(0)
    if (gi === order.length - 1) {
      setPhase('end')
      return
    }
    setGi(gi + 1)
    setCur(order[gi + 1])
  }
  const startGuess = () => {
    setPhase('guess')
    fold.set(0)
    setCur(order[0])
  }
  const rule = 'Bir prizmanın birden çok açınımı vardır. Açınım katlanınca yüzler üst üste binmemeli, boş yer kalmamalı ve birleşen kenarların uzunlukları eşit olmalı.'
  const allTried = TRY.every((n) => closed.has(n.id))

  return (
    <div className="space-y-4">
      {phase !== 'end' && (
        <Layout
          scene={
            <>
              <BoxScene key={cur.id} a={ND.a} b={ND.b} c={ND.c} net={cur} t={fold.t} analysis={phase === 'guess' && res ? analysis : null} />
              <FoldControls fold={fold} disabled={phase === 'guess' && !res} />
            </>
          }
          panel={
            phase === 'try' ? (
              <>
                <Now done={allTried}>{allTried ? 'Dört farklı açınım da aynı kutuyu oluşturdu!' : 'Bir açınım kartına dokun, sonra “Katla” ile kutuyu kapat. Dört açınımı da dene.'}</Now>
                <div className="grid grid-cols-2 gap-2">
                  {TRY.map((n) => (
                    <button key={n.id} type="button" onClick={() => choose(n)} aria-pressed={cur.id === n.id} className={`relative flex min-h-28 flex-col items-center justify-center gap-1 rounded-2xl bg-white text-ink p-2 ring-2 transition active:scale-95 ${cur.id === n.id ? 'ring-pink-500' : 'ring-line'}`}>
                      <NetThumb faces={n.faces(ND.a, ND.b, ND.c)} size={80} />
                      <span className="text-xs font-black">{n.name}</span>
                      {closed.has(n.id) && <span className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-emerald-500 text-sm text-white">✓</span>}
                    </button>
                  ))}
                </div>
                <p className="text-sm font-bold text-slate-300">Kutu: <Dims {...ND} /> · Katladığın açınım: {closed.size} / {TRY.length}</p>
                {allTried && <button type="button" onClick={startGuess} className="btn-primary min-h-14 w-full text-lg animate-fade-up">Şimdi tahmin et <ArrowRight size={20} /></button>}
              </>
            ) : (
              <>
                <Rounds i={gi} n={order.length} />
                {!res && <Now>Bu açınım katlanınca kutu olur mu? Tahmin kartını “Tahminin” kutusuna sürükle.</Now>}
                {res && (
                  <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ring-2 animate-fade-up ${analysis.ok ? 'bg-emerald-50 text-emerald-900 ring-emerald-300' : 'bg-red-50 text-red-900 ring-red-300'}`} role="status">
                    <span className="text-3xl leading-none" aria-hidden>{analysis.ok ? '📦' : '🚫'}</span>
                    <p className="text-lg leading-snug font-black sm:text-xl">{analysis.ok ? 'Kutu kapandı: bu bir açınım!' : 'Kutu kapanmadı: bu bir açınım değil.'}</p>
                  </div>
                )}
                <Card>
                  <div className="mb-2 grid place-items-center rounded-xl bg-slate-50 p-2 ring-1 ring-line"><NetThumb faces={cur.faces(ND.a, ND.b, ND.c)} size={110} /></div>
                  <Drop dnd={dnd} id="guess" className={`mb-2 grid min-h-14 place-items-center rounded-2xl border-2 border-dashed text-center ${guess ? 'border-sky-400 bg-sky-50' : 'border-sky-400 bg-sky-50/50'}`}>
                    {guess ? <span className="text-base font-black">{guess === 'olur' ? '✅ Kutu olur' : '❌ Kutu olmaz'}</span> : <span className="text-sm font-black text-sky-600">Tahminin: kartı buraya sürükle</span>}
                  </Drop>
                  {!guess && (
                    <div className="grid grid-cols-2 gap-2">
                      <Drag dnd={dnd} item="g-olur" label="Kutu olur" className="min-h-14 rounded-2xl bg-white text-ink text-base font-black shadow-[0_3px_0_#cbd5e1] ring-2 ring-emerald-300">✅ Kutu olur</Drag>
                      <Drag dnd={dnd} item="g-olmaz" label="Kutu olmaz" className="min-h-14 rounded-2xl bg-white text-ink text-base font-black shadow-[0_3px_0_#cbd5e1] ring-2 ring-red-300">❌ Kutu olmaz</Drag>
                    </div>
                  )}
                </Card>
                {res && (
                  <div className={`rounded-2xl px-3 py-2 text-[15px] font-extrabold ring-2 animate-fade-up ${res.right ? 'bg-emerald-50 text-emerald-900 ring-emerald-300' : 'bg-amber-50 text-amber-900 ring-amber-300'}`}>
                    <p className="mb-1">{res.right ? 'Tahminin doğru!' : 'Tahminin tutmadı, ama deneyerek gördün.'}</p>
                    <p className="font-bold">{analysis.ok ? 'Bütün yüzler yerine oturdu; hiçbir yüz üst üste binmedi, boş yer kalmadı.' : cur.why}</p>
                  </div>
                )}
                {res && !res.right && <Nudge question={analysis.ok ? 'Katlarken her yüzün kutunun hangi yüzüne gittiğini takip et. Hangi kenarlar birleşti?' : 'Kırmızı yüze ve “BOŞ” yazan yere bak. Katlamadan önce bunu nasıl fark edebilirdin?'} misconception={analysis.ok ? undefined : 'Altı dikdörtgeni olan her şekli açınım sanmak'} />}
                {res && <button type="button" onClick={nextGuess} className="btn-primary min-h-14 w-full text-lg animate-fade-up">{gi === order.length - 1 ? 'Devam' : 'Sonraki açınım'} <ArrowRight size={20} /></button>}
              </>
            )
          }
        />
      )}
      {phase === 'end' && <Finish rule={rule} last={last} checks={checks} onNext={() => onDone(checks.pass(), [rule])} />}
    </div>
  )
}

/* ───────────── 3. Açınımdan yüzey alanı ───────────── */

const AREA_DIMS: [number, number, number][] = [[4, 3, 2], [5, 2, 3], [3, 2, 4], [4, 2, 3], [5, 3, 2]]
type Slot = `${Pair}-1` | `${Pair}-2` | 'total'

function AreaTable({ a, b, c, onDone, checks }: { a: number; b: number; c: number; onDone: () => void; checks: ReturnType<typeof useChecks> }) {
  const area: Record<Pair, number> = { ab: a * b, ac: a * c, bc: b * c }
  const want: Record<Slot, number> = { 'ab-1': area.ab, 'ab-2': 2 * area.ab, 'ac-1': area.ac, 'ac-2': 2 * area.ac, 'bc-1': area.bc, 'bc-2': 2 * area.bc, total: surfaceArea(a, b, c) }
  const vol = a * b * c
  const half = area.ab + area.ac + area.bc
  const [cards] = useState(() => {
    const vals = new Set<number>([...Object.values(want), vol, half, a + b + c, 4 * (a + b + c)])
    return shuffle([...vals])
  })
  const [filled, setFilled] = useState<Partial<Record<Slot, number>>>({})
  const [say, setSay] = useState<{ q: string; mis?: string; k: number } | null>(null)
  const dnd = useDnd((item, target) => {
    const v = Number(item.slice(2))
    const s = target as Slot
    if (filled[s] !== undefined) return false
    if (s === 'total' && Object.keys(filled).length < 6) {
      setSay({ q: 'Önce tablonun üst satırlarını doldur: her çift yüzün alanını bul.', k: Date.now() })
      return false
    }
    if (want[s] === v) {
      setFilled((f) => ({ ...f, [s]: v }))
      setSay(null)
      return
    }
    checks.fail()
    let q = 'Yüzün kenarlarındaki kareleri say: alanı = bir kenar × diğer kenar.'
    let mis: string | undefined
    if (s === 'total' && v === vol) {
      q = `${vol}, kutunun içine sığan birim küp sayısı (hacim). Yüzey alanı ise yüzleri kaplayan kareler. Hangisini arıyoruz?`
      mis = 'Yüzey alanını hacimle karıştırmak'
    } else if (s === 'total' && v === half) {
      q = 'Her yüzden ikişer tane var. Tablodaki “İki yüz” sütununu topladın mı?'
      mis = 'Yüzey alanında karşılıklı yüzleri bir kez saymak'
    } else if (s.endsWith('-2')) q = 'Aynı renkli iki yüz eş. Bir yüzün alanının 2 katı kaç eder?'
    setSay({ q, mis, k: Date.now() })
    return false
  })
  const pairs: Pair[] = ['ab', 'ac', 'bc']
  const doneAll = filled.total !== undefined
  useEffect(() => {
    if (doneAll) window.setTimeout(onDone, 500)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneAll])
  const slot = (s: Slot) => (
    <Drop dnd={dnd} id={s} className={`grid min-h-12 min-w-14 place-items-center rounded-xl border-2 border-dashed px-1 text-xl font-black tabular-nums ${filled[s] !== undefined ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-sky-400 bg-sky-50 text-sky-500'}`}>
      {filled[s] ?? '?'}
    </Drop>
  )
  const dimsOf: Record<Pair, string> = { ab: `${a} × ${b}`, ac: `${a} × ${c}`, bc: `${b} × ${c}` }
  return (
    <Card className="space-y-2">
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-sm font-black">
        <span className="text-xs text-ink-soft uppercase">Yüzler</span>
        <span className="text-center text-xs text-ink-soft uppercase">Bir yüz</span>
        <span className="text-center text-xs text-ink-soft uppercase">İki yüz</span>
        {pairs.map((p) => (
          <div key={p} className="contents">
            <span className="flex items-center gap-1.5"><span className="size-3.5 shrink-0 rounded-sm" style={{ background: PAIR_COLOR[p] }} />{PAIR_NAME[p]}<span className="text-xs text-ink-soft">({filled[`${p}-1`] !== undefined ? dimsOf[p] : '? × ?'})</span></span>
            {slot(`${p}-1`)}
            {slot(`${p}-2`)}
          </div>
        ))}
        <span className="col-span-2 text-right text-base">Yüzey alanı (toplam) =</span>
        {slot('total')}
      </div>
      <div className="flex flex-wrap justify-center gap-2 border-t border-line pt-2">
        {cards.map((v) => {
          const wanted = (Object.keys(want) as Slot[]).filter((s) => want[s] === v)
          const left = !wanted.length || wanted.some((s) => filled[s] === undefined)
          return left ? <Drag key={v} dnd={dnd} item={`n-${v}`} label={`${v}`} className={TOKEN}>{v}</Drag> : null
        })}
      </div>
      {say && <Nudge key={say.k} question={say.q} misconception={say.mis} />}
    </Card>
  )
}

function AreaFromNet({ onDone, last }: { onDone: Done; last: boolean }) {
  const checks = useChecks()
  const [dims] = useState(() => shuffle(AREA_DIMS).slice(0, 2))
  const [round, setRound] = useState(0)
  const [a, b, c] = dims[round]
  const fold = useFold(0)
  const [shown, setShown] = useState<Set<FaceId>>(() => new Set())
  const [tableDone, setTableDone] = useState(false)
  const [val, setVal] = useState('')
  const [miss, setMiss] = useState<{ q: string; mis?: string; k: number } | null>(null)
  const [solved, setSolved] = useState(false)
  const [end, setEnd] = useState(false)
  const S = surfaceArea(a, b, c)
  const tap = (id: FaceId) => setShown((s) => new Set(s).add(id))
  const glow = useMemo(() => (tableDone || solved ? new Set(FACES) : new Set<FaceId>()), [tableDone, solved])

  const checkPad = () => {
    const v = parseNum(val)
    if (v === S) {
      setSolved(true)
      setMiss(null)
      fold.animateTo(1)
      return
    }
    checks.fail()
    if (v === a * b * c) setMiss({ q: `${v} bu kutunun hacmi: içine sığan birim küp sayısı. Yüzleri kaplayan kareleri saymalısın.`, mis: 'Yüzey alanını hacimle karıştırmak', k: Date.now() })
    else if (v === S / 2) setMiss({ q: 'Üç farklı yüzün alanını topladın. Kutunun kaç yüzü var? Karşılıklı yüzleri unutma.', mis: 'Yüzey alanında karşılıklı yüzleri bir kez saymak', k: Date.now() })
    else setMiss({ q: 'Yüzlere dokunarak kenarlarını gör. Aynı renkli iki yüzün alanı eşit: üç çiftin alanlarını bul ve topla.', k: Date.now() })
  }
  const next = () => {
    if (round === 1) return setEnd(true)
    setRound(1)
    setShown(new Set())
    setVal('')
    setMiss(null)
    setSolved(false)
    fold.set(0)
  }
  const rule = 'Yüzey alanı, açınımdaki 6 dikdörtgenin alanları toplamıdır. Karşılıklı yüzler eş olduğundan: Yüzey alanı = 2 × (a·b + a·c + b·c).'
  const ask: Ask = {
    q: 'Kutuyu açınca ya da katlayınca onu kaplayan kâğıdın alanı değişir mi?',
    options: [
      { label: 'Hayır. Kutunun yüzey alanı, açınımının alanına eşittir.', ok: true },
      { label: 'Evet. Açınca alan büyür, çünkü yere daha çok yayılır.', nudge: 'Açarken kâğıda yeni kare eklendi mi, ya da bir kare kesildi mi?', mis: 'Açınımın alanının yüzey alanından farklı olduğunu sanmak' },
      { label: 'Evet. Katlayınca bazı yüzler içeride kaldığı için alan küçülür.', nudge: 'Katlayınca kâğıttaki kareler kayboluyor mu? Kaydırıcıyı yavaşça sürükleyerek izle.' },
    ],
  }
  const ready = round === 0 ? tableDone : solved
  return (
    <div className="space-y-4">
      <Rounds i={end ? 2 : round} n={2} />
      {!end && (
        <Layout
          scene={
            <>
              <BoxScene key={round} a={a} b={b} c={c} net={NETS.hac} t={fold.t} labels={ready ? 'area' : 'dims'} labelOn={ready ? undefined : shown} glow={glow} onFaceTap={tap} />
              <FoldControls fold={fold} />
            </>
          }
          panel={
            <>
              <Now done={ready}>
                {ready
                  ? `Yüzey alanı ${S} birim kare. Kutuyu katla: aynı kâğıt kutuyu boşluksuz kaplıyor.`
                  : round === 0
                    ? 'Açınımdaki dikdörtgenlere dokun: kenarları yazsın. Sonra sayı kartlarını tabloya sürükle.'
                    : 'Bu kez tablo yok! Yüzlere dokunarak kenarları bul ve yüzey alanını kendin hesapla.'}
              </Now>
              <p className="text-sm font-bold text-slate-300">Kutu: <Dims a={a} b={b} c={c} /> · Dokunduğun yüz: {shown.size} / 6</p>
              {round === 0 && <AreaTable a={a} b={b} c={c} checks={checks} onDone={() => { setTableDone(true); fold.animateTo(1) }} />}
              {round === 1 && !solved && (
                <>
                  <NumPad value={val} onChange={setVal} label="Yüzey alanı" unit="br²" max={4} />
                  <button type="button" onClick={checkPad} disabled={!val} className="btn-primary min-h-14 w-full text-lg">Kontrol et</button>
                  {miss && <Nudge key={miss.k} question={miss.q} misconception={miss.mis} />}
                </>
              )}
              {ready && <button type="button" onClick={next} className="btn-primary min-h-14 w-full text-lg animate-fade-up">{round === 1 ? 'Devam' : 'Sonraki kutu'} <ArrowRight size={20} /></button>}
            </>
          }
        />
      )}
      {end && <Finish rule={rule} last={last} ask={ask} checks={checks} onNext={() => onDone(checks.pass(), [rule])} />}
    </div>
  )
}

/* ───────────── 4. Paketleme ustası ───────────── */

interface Problem {
  emoji: string
  text: ReactNode
  a: number
  b: number
  c: number
  unit: string
  /** kapaksız: önce kapağa dokunulmalı */
  open?: boolean
  paper?: string
  answer: number
  ask?: Ask
}

const PROBLEMS: Problem[] = [
  { emoji: '🎁', text: <>Ece, <b>5 cm × 4 cm × 3 cm</b> boyutlarındaki hediye kutusunu hiç boşluk ve taşma olmadan renkli kâğıtla kaplayacak. Kaç <b>cm²</b> kâğıt gerekir?</>, a: 5, b: 4, c: 3, unit: 'cm²', answer: 94 },
  { emoji: '🐠', text: <>Üstü açık bir akvaryumun eni <b>6 dm</b>, derinliği <b>3 dm</b>, yüksekliği <b>4 dm</b>. Akvaryum için kaç <b>dm²</b> cam kullanılmıştır?</>, a: 6, b: 3, c: 4, unit: 'dm²', open: true, paper: '#a5f3fc', answer: 90 },
  {
    emoji: '🎲',
    text: <>Bir zarın her kenarı <b>3 cm</b>. Zarın bütün yüzleri boyanacak. Boyanacak yüzey kaç <b>cm²</b>?</>,
    a: 3, b: 3, c: 3, unit: 'cm²', paper: '#fde68a', answer: 54,
    ask: {
      q: 'Kenarı 3 cm olan küpün yüzey alanı kaç cm²?',
      options: [
        { label: '6 × (3 × 3) = 54 cm²', ok: true },
        { label: '3 × 3 × 3 = 27 cm²', nudge: '3 × 3 × 3 küpün içine sığan birim küpleri sayar. Biz yüzeyi boyuyoruz!', mis: 'Yüzey alanını hacimle karıştırmak' },
        { label: '4 × (3 × 3) = 36 cm²', nudge: 'Küpün kaç yüzü var? Alttaki ve üstteki yüzleri de say.' },
        { label: '3 × 3 = 9 cm²', nudge: 'Bu yalnızca bir yüzün alanı. Küpün bütün yüzleri boyanacak.' },
      ],
    },
  },
]

function Packaging({ onDone, last }: { onDone: Done; last: boolean }) {
  const checks = useChecks()
  const [pi, setPi] = useState(0)
  const P = PROBLEMS[pi]
  const fold = useFold(1)
  const [hidden, setHidden] = useState<Set<FaceId>>(() => new Set())
  const [shown, setShown] = useState<Set<FaceId>>(() => new Set())
  const [val, setVal] = useState('')
  const [miss, setMiss] = useState<{ q: string; mis?: string; k: number } | null>(null)
  const [solved, setSolved] = useState(false)
  const [end, setEnd] = useState(false)
  const lidOff = !P.open || hidden.has('ust')
  const tap = (id: FaceId) => {
    if (P.open && !hidden.has('ust')) {
      if (id === 'ust') {
        setHidden(new Set(['ust']))
        setMiss(null)
      } else setMiss({ q: `${id === 'alt' ? 'Akvaryumun tabanı' : 'Bu yan yüz'} camdan yapılmış. Akvaryumun hangi yüzü yok? Üstten bak.`, k: Date.now() })
      return
    }
    setShown((s) => new Set(s).add(id))
  }
  const check = () => {
    const v = parseNum(val)
    const { a, b, c } = P
    if (v === P.answer) {
      setSolved(true)
      setMiss(null)
      return
    }
    checks.fail()
    if (P.open && v === surfaceArea(a, b, c)) setMiss({ q: 'Bu, kapağı olan kutunun yüzey alanı. Akvaryumun üstü açık: kapağın alanını çıkarmalısın.', mis: 'Kapaksız kutuda 6 yüzü de saymak', k: Date.now() })
    else if (v === a * b * c) setMiss({ q: `${v} akvaryumun hacmi olurdu. Biz yüzeyi kaplayan kâğıt ya da camı arıyoruz.`, mis: 'Yüzey alanını hacimle karıştırmak', k: Date.now() })
    else if (v === surfaceArea(a, b, c) / 2) setMiss({ q: 'Her yüzden ikişer tane var. Karşılıklı yüzleri de saydın mı?', mis: 'Yüzey alanında karşılıklı yüzleri bir kez saymak', k: Date.now() })
    else setMiss({ q: 'Kutuyu aç, yüzlere dokunarak kenarlarını gör. Her yüzün alanını bulup topla.', k: Date.now() })
  }
  const next = () => {
    if (pi === PROBLEMS.length - 1) return setEnd(true)
    setPi(pi + 1)
    setHidden(new Set())
    setShown(new Set())
    setVal('')
    setMiss(null)
    setSolved(false)
    fold.set(1)
  }
  const rule = 'Günlük hayattaki bir kutunun yüzey alanını bulurken önce hangi yüzlerin kaplanacağına karar veririm: kapaksız kutuda 5 yüz vardır; küpte 6 eş kare vardır.'
  return (
    <div className="space-y-4">
      <Rounds i={end ? PROBLEMS.length : pi} n={PROBLEMS.length} />
      {!end && (
        <Layout
          scene={
            <>
              <BoxScene key={pi} a={P.a} b={P.b} c={P.c} net={NETS.hac} t={fold.t} paper={P.paper} hidden={hidden} labels={solved ? 'area' : 'dims'} labelOn={solved ? undefined : shown} onFaceTap={tap} views={['iso', 'ust', 'on']} />
              <FoldControls fold={fold} />
            </>
          }
          panel={
            <>
              <Card className="flex gap-3">
                <span className="text-4xl leading-none" aria-hidden>{P.emoji}</span>
                <p className="text-[17px] leading-snug font-extrabold">{P.text}</p>
              </Card>
              {!lidOff && <Now>Akvaryumun <b>üstü açık</b>. 3B sahnede olmayan yüze dokunup kaldır.</Now>}
              {lidOff && !solved && !P.ask && <Now>Kutuyu aç, yüzlere dokunarak kenarlarını gör ve cevabı yaz.</Now>}
              {lidOff && !solved && P.ask && <DragAsk key={pi} ask={P.ask} checks={checks} onOk={() => setSolved(true)} />}
              {lidOff && !solved && !P.ask && (
                <>
                  <NumPad value={val} onChange={setVal} label="Cevap" unit={P.unit} max={4} />
                  <button type="button" onClick={check} disabled={!val} className="btn-primary min-h-14 w-full text-lg">Kontrol et</button>
                </>
              )}
              {miss && <Nudge key={miss.k} question={miss.q} misconception={miss.mis} />}
              {solved && (
                <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-[15px] font-extrabold text-emerald-900 ring-2 ring-emerald-300 animate-fade-up">
                  <Sparkles size={16} className="mr-1 inline" />
                  {pi === 0 && '2 × (5·4 + 5·3 + 4·3) = 2 × 47 = 94 cm²'}
                  {pi === 1 && 'Kapak yok: 6·3 + 2·(6·4) + 2·(3·4) = 18 + 48 + 24 = 90 dm²'}
                  {pi === 2 && 'Küpün 6 eş yüzü var: 6 × 9 = 54 cm²'}
                </div>
              )}
              {solved && <button type="button" onClick={next} className="btn-primary min-h-14 w-full text-lg animate-fade-up">{pi === PROBLEMS.length - 1 ? 'Devam' : 'Sonraki problem'} <ArrowRight size={20} /></button>}
            </>
          }
        />
      )}
      {end && <Finish rule={rule} last={last} checks={checks} onNext={() => onDone(checks.pass(), [rule])} />}
    </div>
  )
}

/* ───────────── 5. En az karton ───────────── */

const V = 12
const BOXES: [number, number, number][] = [[12, 1, 1], [6, 2, 1], [4, 3, 1], [3, 2, 2]]

function LeastCardboard({ onDone, last }: { onDone: Done; last: boolean }) {
  const checks = useChecks()
  const fold = useFold(1)
  const [cur, setCur] = useState<[number, number, number] | null>(null)
  const [seen, setSeen] = useState<Record<string, number>>({})
  const [cubes, setCubes] = useState(true)
  const [asked, setAsked] = useState(false)
  const k = cur?.join('x') ?? ''
  useEffect(() => {
    if (cur && fold.t < 0.02 && seen[k] === undefined) setSeen((s) => ({ ...s, [k]: surfaceArea(...cur) }))
  }, [fold.t, cur, k, seen])
  const dnd = useDnd((item, target) => {
    if (target !== 'stage') return false
    const d = item.slice(4).split('x').map(Number) as [number, number, number]
    fold.set(1)
    setCur(d)
  })
  const tried = Object.keys(seen).length
  const min = BOXES.reduce((m, d) => Math.min(m, surfaceArea(...d)), Infinity)
  const ask: Ask = {
    q: `Hacmi ${V} birim küp olan kutulardan hangisi en az kartonla yapılır?`,
    options: shuffle([
      { label: '3 × 2 × 2 kutu', ok: true },
      { label: '12 × 1 × 1 kutu', nudge: 'Tablodaki yüzey alanlarına bak. Uzun ince kutu kaç birim kare karton istiyor?', mis: 'Uzun kutunun daha az malzeme istediğini sanmak' },
      { label: 'Hepsi aynı kartonu ister, çünkü hacimleri eşit.', nudge: 'Hacimleri eşit ama tablodaki yüzey alanları da eşit mi?', mis: 'Hacmi eşit prizmaların yüzey alanlarının da eşit olduğunu sanmak' },
    ]),
  }
  const rule = 'Hacimleri eşit prizmaların yüzey alanları farklı olabilir. Boyutları birbirine yakın, küpe benzeyen kutu en az kartonu ister.'
  return (
    <div className="space-y-4">
      <Layout
        scene={
          <>
            {cur ? (
              <BoxScene key={k} a={cur[0]} b={cur[1]} c={cur[2]} net={NETS.hac} t={fold.t} labels="area" cubes={cubes} paper="#e7c9a9" />
            ) : (
              <div className="grid h-[360px] place-items-center rounded-3xl bg-gradient-to-b from-sky-50 to-white text-center ring-1 ring-line sm:h-[460px]">
                <p className="max-w-xs text-lg font-black text-ink-soft">📦 Bir kutu kartını aşağıdaki alana sürükle; kutu burada belirecek.</p>
              </div>
            )}
            <Drop dnd={dnd} id="stage" className="grid min-h-16 place-items-center rounded-2xl border-2 border-dashed border-sky-400 bg-sky-50 text-sm font-black text-sky-700">Kutuyu buraya sürükle</Drop>
            {cur && <FoldControls fold={fold} />}
          </>
        }
        panel={
          <>
            <Now done={tried >= 3}>{tried >= 3 ? 'Tablon doldu! Hangi kutu en az kartonu istiyor?' : `Hepsinin hacmi ${V} birim küp. Kutuları sahneye sürükle, açıp yüzey alanını gör. En az 3 kutu dene.`}</Now>
            <div className="grid grid-cols-2 gap-2">
              {BOXES.map((d) => (
                <Drag key={d.join('x')} dnd={dnd} item={`box-${d.join('x')}`} label={`${d.join(' × ')} kutu`} className={`min-h-14 rounded-2xl bg-white text-ink px-2 text-base font-black shadow-[0_3px_0_#cbd5e1] ring-2 ${k === d.join('x') ? 'ring-pink-500' : 'ring-line'}`}>
                  📦 {d.join(' × ')}
                </Drag>
              ))}
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={cubes} onChange={(e) => setCubes(e.target.checked)} className="size-5 accent-emerald-600" />
              Kapalıyken içini birim küplerle doldur
            </label>
            <Card>
              <table className="w-full text-center text-sm font-black tabular-nums">
                <thead className="text-xs text-ink-soft uppercase"><tr><th className="py-1 text-left">Kutu</th><th>Hacim</th><th>Yüzey alanı</th></tr></thead>
                <tbody>
                  {BOXES.map((d) => {
                    const s = seen[d.join('x')]
                    return (
                      <tr key={d.join('x')} className={`border-t border-line ${s === min && tried >= 3 ? 'bg-emerald-50' : ''}`}>
                        <td className="py-1.5 text-left">{d.join(' × ')}</td>
                        <td>{V}</td>
                        <td>{s !== undefined ? <span>{s} br²</span> : <span className="text-slate-300">aç ve gör</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Card>
            {tried >= 3 && !asked && <DragAsk ask={ask} checks={checks} onOk={() => setAsked(true)} />}
          </>
        }
      />
      {asked && <Finish rule={rule} last={last} checks={checks} onNext={() => onDone(checks.pass(), [rule])} />}
    </div>
  )
}

