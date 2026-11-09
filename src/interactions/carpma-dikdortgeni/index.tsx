import { useEffect, useRef, useState, type ReactNode } from 'react'
import { BookOpen, Check } from 'lucide-react'
import type { Grade } from '../../data/types'
import type { InteractionProps } from '../types'
import { Scene } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { sfx } from '../../lib/feedback'
import { Card, Header, NextButton, Nudge, Prompt, Split, Stage, shuffle, useChecks } from '../donusum-studyosu/ortak'
import { Drag, DragAsk, Drop, HowTo, RulesFound, TOKEN, Tray, n, useDnd, type Ask, type Tool, type ToolInfo } from '../sayilari-karsilastir/parts'
import { BigSlider, Board, Equation, TOOL, tens, tonesFor, type Part } from './tuval'

/**
 * 93. Çarpma Dikdörtgeni (3–4. sınıf, MAT.3.2.4 çarpma, MAT.3.2.3 zihinden çarpma, MAT.4.2.4 kısa yoldan çarpma, MAT.4.2.5)
 * Birim karelerden oluşan bir dikdörtgen: uzunluk ve genişlik iki kalın, parmak dostu kaydırıcıyla ya da dikdörtgenin
 * köşesindeki tutamaçla değiştirilir. Uzunluk 10’u geçince dikdörtgen kendiliğinden 10’luk parça ve kalan parça diye
 * iki renge bölünür (20’yi geçince 10 + 10 + kalan); her parçanın üstünde “10 × 5 = 50” etiketi, altta canlı denklem:
 * 14 × 5 = (10 × 5) + (4 × 5) = 50 + 20 = 70. Her görevin üstünde amaç ve “Nasıl kullanılır?” kartı.
 *  1. Serbest: kaydırıcıları ve köşe tutamacını oynat; 10’u geçince ne oluyor?
 *  2. Hedef çarpımı kur (ör. 13 × 4), parçaların ve bütünün değerini sayı kartı sürükleyerek yaz (4. sınıfta 2. tur 20’yi geçer)
 *  3. Gizli parça: perdenin arkasındaki parçanın değerini, sonra uzunluğunu toplamdan bul
 *  4. Nereden bölmeli? 14 × 5’i bölme tutamacıyla 7 + 7, 10 + 4 ve başka biçimlerde böl; en kolayını seç, sonra yeni bir çarpımda uygula
 *  5. Hatalı cevap avı: “14 × 5 = 10 × 5 + 4 = 54” ve “13 × 6 = 618”: çözüm kartlarını dikdörtgene sürükle, sayılmayan kareleri gör
 *  Son: kural defteri. (1–10 arası çarpım tablosunda serbest bölme 97 numaralı etkinlikte; burada iki basamaklı × bir basamaklı ve 10’luk bölme.)
 */

type Done = (first: boolean, rules: string[]) => void
type Say = { q: string; mis?: string; k: number } | null

const TASKS: { emoji: string; title: string; goal: string; tools: (Tool | ToolInfo)[] }[] = [
  { emoji: '🎚️', title: 'Kaydır ve gözle', goal: 'Dikdörtgenin kenarlarını değiştirip uzunluk 10’u geçince dikdörtgenin nasıl bölündüğünü ve denklemin nasıl değiştiğini keşfetmek.', tools: [TOOL.sliders, TOOL.corner, 'answer'] },
  { emoji: '🎯', title: 'Hedef çarpımı kur', goal: 'Verilen çarpımı dikdörtgenle kurmak, sonra her parçanın ve bütünün değerini sayı kartlarıyla yazmak.', tools: [TOOL.sliders, TOOL.corner, TOOL.card] },
  { emoji: '🙈', title: 'Gizli parça', goal: 'Bütün dikdörtgenin değerinden ve görünen parçadan yola çıkarak perdenin arkasındaki parçayı bulmak.', tools: [TOOL.curtain, TOOL.card] },
  { emoji: '✂️', title: 'Nereden bölmeli?', goal: 'Aynı dikdörtgeni farklı yerlerden bölüp hangi bölmenin zihinden en kolay hesaplandığına karar vermek.', tools: [TOOL.split, 'answer'] },
  { emoji: '🕵️', title: 'Hatalı cevap avı', goal: 'Arkadaşlarının hesabındaki her parçayı dikdörtgende göstermek ve hangi karelerin sayılmadığını bulmak.', tools: [TOOL.term, 'answer'] },
]

export default function CarpmaDikdortgeni({ grade, onFinish }: InteractionProps) {
  const [idx, setIdx] = useState(0)
  const [rules, setRules] = useState<string[]>([])
  const [help, setHelp] = useState(true)
  const firsts = useRef<boolean[]>([])
  const end = idx >= TASKS.length
  const t = TASKS[Math.min(idx, TASKS.length - 1)]
  const last = idx === TASKS.length - 1

  const done: Done = (first, r) => {
    firsts.current[idx] = first
    setRules((old) => [...old, ...r.filter((x) => !old.includes(x))])
    setIdx(idx + 1)
    setHelp(false)
  }
  const finish = () =>
    onFinish({
      stars: starsFor(firsts.current.filter(Boolean).length / TASKS.length),
      summary: `${TASKS.length} görevde çarpma dikdörtgenini 10’luk parça ve kalan parça diye bölerek iki basamaklı sayıları çarptın; ${rules.length} kuralı kendin buldun.`,
      insight: '14 × 5 = (10 × 5) + (4 × 5) = 50 + 20 = 70. Büyük bir dikdörtgeni 10’luk parçadan bölmek çarpmayı kolaylaştırır; her parçayı ayrı çarpıp toplarız ve hiçbir parçayı unutmayız.',
    })

  const props = { onDone: done, last, grade }
  return (
    <Scene grade={grade} className="overflow-clip! select-none [-webkit-touch-callout:none]">
      <Header
        emoji={end ? '📒' : t.emoji}
        kicker={end ? 'Tamamlandı' : 'Görev'}
        title={end ? 'Kural defterin' : t.title}
        idx={Math.min(idx, TASKS.length - 1)}
        total={TASKS.length}
        right={end ? null : (
          <button type="button" onClick={() => setHelp((h) => !h)} aria-pressed={help} aria-label="Nasıl kullanılır?" className={`grid size-11 place-items-center rounded-full text-lg font-black ring-1 transition ${help ? 'bg-sky-600 text-white ring-sky-700' : 'bg-white text-sky-700 ring-sky-200 hover:bg-sky-50'}`}>?</button>
        )}
      />
      {!end && <HowTo goal={t.goal} tools={t.tools} open={help} onToggle={() => setHelp((h) => !h)} />}
      {end ? (
        <EndView rules={rules} onFinish={finish} />
      ) : idx === 0 ? (
        <FreeTask key={idx} {...props} />
      ) : idx === 1 ? (
        <TargetTask key={idx} {...props} />
      ) : idx === 2 ? (
        <HiddenTask key={idx} {...props} />
      ) : idx === 3 ? (
        <SplitTask key={idx} {...props} />
      ) : (
        <ErrorTask key={idx} {...props} />
      )}
    </Scene>
  )
}

interface TaskProps { onDone: Done; last: boolean; grade: Grade }

/* ───────────── ortak yardımcılar ───────────── */

function useWide() {
  const q = '(min-width: 1024px)'
  const [wide, setWide] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setWide(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return wide
}

/** nudge sayaca yazar, tell yalnızca yol gösterir. Dar ekranda ipucu tuvalde, genişte panelde. */
function useSay(checks: ReturnType<typeof useChecks>) {
  const wide = useWide()
  const [say, setSay] = useState<Say>(null)
  const show = (q: string, mis?: string) => {
    setSay((s) => ({ q, mis, k: (s?.k ?? 0) + 1 }))
    return false as const
  }
  return {
    clear: () => setSay(null),
    nudge(q: string, mis?: string) {
      checks.fail()
      return show(q, mis)
    },
    tell: (q: string) => show(q),
    view: (spot: 'work' | 'panel') => (say && (spot === 'panel') === wide ? <Nudge key={say.k} question={say.q} misconception={say.mis} /> : null),
  }
}

function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || window.innerWidth >= 1024) return
    const id = window.setTimeout(() => {
      const r = el.getBoundingClientRect()
      if (r.top < 70 || r.bottom > window.innerHeight) el.scrollIntoView({ behavior: 'smooth', block: r.height > window.innerHeight - 90 ? 'start' : 'center' })
    }, 250)
    return () => window.clearTimeout(id)
  }, [])
  return <div ref={ref} className="flex flex-col gap-3 scroll-mt-20">{children}</div>
}

/** Kart tepsisi dar ekranda ekranın altına yapışır */
function Sticky({ children }: { children: ReactNode }) {
  return <div className="sticky bottom-2 z-20 rounded-2xl shadow-[0_-8px_24px_-12px_rgb(15_23_42/0.35)] lg:static lg:shadow-none">{children}</div>
}

function Checklist({ items }: { items: { label: ReactNode; ok: boolean }[] }) {
  return (
    <Card>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-[15px] font-extrabold ring-1 transition ${it.ok ? 'bg-emerald-50 ring-emerald-300' : 'bg-white ring-line'}`}>
            <span className={`grid size-6 shrink-0 place-items-center rounded-full ${it.ok ? 'bg-emerald-500 text-white animate-pop' : 'bg-slate-100 text-slate-400'}`}>{it.ok ? <Check size={15} strokeWidth={3} /> : i + 1}</span>
            {it.label}
          </li>
        ))}
      </ul>
    </Card>
  )
}

const rand = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const maxLFor = (g: Grade) => (g >= 4 ? 30 : 20)
const marksFor = (g: Grade) => (g >= 4 ? [10, 20] : [10])
const partsFor = (L: number, extra: (len: number, i: number) => Partial<Part> = () => ({})): Part[] => {
  const lens = tens(L)
  const tones = tonesFor(lens)
  return lens.map((len, i) => ({ len, tone: tones[i], ...extra(len, i) }))
}

/** Kaydırıcılar: uzunluk ve genişlik */
function Sliders({ L, W, setL, setW, grade, onRelease, disabled }: { L: number; W: number; setL: (v: number) => void; setW: (v: number) => void; grade: Grade; onRelease?: () => void; disabled?: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <BigSlider label="Uzunluk" value={L} min={1} max={maxLFor(grade)} onChange={setL} onRelease={onRelease} color="#0284c7" marks={marksFor(grade)} disabled={disabled} />
      <BigSlider label="Genişlik" value={W} min={1} max={10} onChange={setW} onRelease={onRelease} color="#db2777" disabled={disabled} />
    </div>
  )
}

/* ───────────── 1. Serbest keşif ───────────── */

function FreeTask({ onDone, last, grade }: TaskProps) {
  const checks = useChecks()
  const [L, setL] = useState(7)
  const [W, setW] = useState(5)
  const [got, setGot] = useState({ over10: false, w: false, corner: false, over20: false })
  const [phase, setPhase] = useState<'play' | 'ask' | 'done'>('play')
  const g4 = grade >= 4
  const rules = [
    'Uzunluk 10’u geçince dikdörtgeni 10’luk parça ve kalan parça diye bölerim: 14 × 5 = (10 × 5) + (4 × 5) = 50 + 20 = 70.',
    ...(g4 ? ['20’yi geçince 10 + 10 + kalan diye bölerim: 24 × 3 = 30 + 30 + 12 = 72.'] : []),
  ]
  const all = got.over10 && got.w && got.corner && (!g4 || got.over20)

  useEffect(() => {
    setGot((g) => ({ ...g, over10: g.over10 || L > 10, over20: g.over20 || L > 20, w: g.w || W !== 5 }))
  }, [L, W])
  useEffect(() => {
    if (all && phase === 'play') {
      const id = window.setTimeout(() => setPhase('ask'), 900)
      return () => window.clearTimeout(id)
    }
  }, [all, phase])

  const lens = tens(L)
  const [ask] = useState<Ask>(() => ({
    q: 'Uzunluk 10’u geçince dikdörtgen neden iki renge bölünüyor?',
    options: shuffle([
      { label: '10’luk parçayı hesaplamak kolay: 10 × 5 = 50. Kalan parça ayrıca hesaplanır', ok: true },
      { label: 'Rastgele bölünüyor, her seferinde başka yerden', nudge: 'Uzunluğu 13’e, sonra 17’ye getir. Mavi parçanın uzunluğu her seferinde kaç oluyor?' },
      { label: 'Dikdörtgen küçülüyor, kareler azalıyor', nudge: 'Denklemin sonundaki sayıya bak: iki parçanın toplamı bütün dikdörtgen kadar mı? Bölmek kare eksiltir mi?', mis: 'Bölmenin toplamı değiştirdiğini sanıyor' },
    ]),
  }))

  return (
    <Split
      work={
        <Stage className="space-y-3 p-2 sm:p-4">
          <Board maxL={maxLFor(grade)} W={W} parts={partsFor(L)} onResize={(l, w) => {
            setL(l)
            setW(w)
            setGot((g) => ({ ...g, corner: true }))
          }} />
          <Equation lens={lens} W={W} tones={tonesFor(lens)} />
          <Sliders L={L} W={W} setL={setL} setW={setW} grade={grade} disabled={phase === 'done'} />
        </Stage>
      }
      panel={
        <>
          <Prompt step="Keşfet">Kaydırıcıları ve pembe köşe tutamacını oynat. <b>Uzunluğu 10’un ötesine</b> taşıyınca dikdörtgene ve denkleme ne oluyor?</Prompt>
          <Checklist
            items={[
              { label: 'Uzunluğu 10’dan büyük yap', ok: got.over10 },
              { label: 'Genişliği değiştir', ok: got.w },
              { label: 'Köşe tutamacıyla boyutlandır', ok: got.corner },
              ...(g4 ? [{ label: 'Uzunluğu 20’den büyük yap', ok: got.over20 }] : []),
            ]}
          />
          {phase === 'ask' && (
            <Reveal>
              <DragAsk checks={checks} ask={ask} onOk={() => setPhase('done')} okText="Evet! 10’la çarpmak kolaydır. Büyük çarpımı iki kolay çarpıma böleriz, sonra toplarız." />
            </Reveal>
          )}
          {phase === 'done' && (
            <Reveal>
              <RulesFound rules={rules} />
              <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
            </Reveal>
          )}
        </>
      }
    />
  )
}

/* ───────────── 2. Hedef çarpım ───────────── */

function targetsFor(g: Grade) {
  const a = { L: rand(11, 19), W: rand(3, 8) }
  let b = { L: g >= 4 ? rand(21, 28) : rand(11, 19), W: g >= 4 ? rand(3, 6) : rand(3, 8) }
  while (b.L === a.L) b = { ...b, L: g >= 4 ? rand(21, 28) : rand(11, 19) }
  return [a, b]
}

function TargetTask({ onDone, last, grade }: TaskProps) {
  const checks = useChecks()
  const [targets] = useState(() => targetsFor(grade))
  const [k, setK] = useState(0)
  const rules = [
    'Bir çarpımı parçalara bölünce her parçayı ayrı çarpar, sonra toplarım: 13 × 4 = (10 × 4) + (3 × 4) = 40 + 12 = 52.',
    ...(grade >= 4 ? ['Uzunluk 20’yi geçerse iki tane 10’luk parça olur; ikisini de toplarım.'] : []),
  ]
  if (k >= targets.length)
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <RulesFound rules={rules} />
        <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
      </div>
    )
  return <TargetRound key={k} round={k} total={targets.length} tL={targets[k].L} tW={targets[k].W} grade={grade} checks={checks} onNext={() => setK(k + 1)} />
}

function TargetRound({ round, total, tL, tW, grade, checks, onNext }: { round: number; total: number; tL: number; tW: number; grade: Grade; checks: ReturnType<typeof useChecks>; onNext: () => void }) {
  const s = useSay(checks)
  const [L, setL] = useState(round === 0 ? 6 : 10)
  const [W, setW] = useState(round === 0 ? 2 : 3)
  const [phase, setPhase] = useState<'set' | 'fill' | 'done'>('set')
  const lens = tens(tL)
  const rest = lens[lens.length - 1]
  const want = [...lens.map((len) => len * tW), tL * tW]
  /** slot i (parça i, son slot bütün) → yerleştirilen değer */
  const [filled, setFilled] = useState<Record<number, number>>({})
  const [cards] = useState(() => {
    const d = [rest + tW, tL + tW, 10 * tW * (lens.length - 1) + rest, tL * tW + tW, rest * 10]
    const vals = [...want]
    for (const x of d) if (!vals.includes(x) && x > 0 && vals.length < want.length + 3) vals.push(x)
    return shuffle(vals.map((v, i) => ({ v, id: i })))
  })
  const [used, setUsed] = useState<number[]>([])

  // kaydırıcı ya da tutamaç bırakılınca boyut tutuyorsa yuvalar açılır
  useEffect(() => {
    if (phase !== 'set' || L !== tL || W !== tW) return
    const id = window.setTimeout(() => {
      sfx.ok()
      setPhase('fill')
    }, 450)
    return () => window.clearTimeout(id)
  }, [L, W, tL, tW, phase])

  const slots = lens.length + 1
  const dnd = useDnd((item, target) => {
    if (!target.startsWith('slot-')) return false
    const i = Number(target.slice(5))
    const card = cards[Number(item.slice(5))]
    if (filled[i] !== undefined) return false
    const isTot = i === slots - 1
    const c = card.v
    if (c !== want[i]) {
      if (isTot) {
        if (want.slice(0, -1).includes(c)) return s.nudge('Bu yalnızca bir parçanın değeri. Bütün dikdörtgen kaç kare? Parçaların değerlerini topla.')
        if (c === 10 * tW * (lens.length - 1) + rest) return s.nudge(`${n(c - rest)} + ${rest} mi? Turuncu parça ${rest} kare mi? Her sütununda ${tW} kare var: ${rest} × ${tW} kaç?`, 'Dağılma özelliğinde kalan parçayı çarpmadan ekliyor')
        return s.nudge(`Parçaların değerlerini topla: ${want.slice(0, -1).map(n).join(' + ')} = ?`)
      }
      const len = lens[i]
      if (c === len + tW) return s.nudge(`Bu parçada ${len} sütun var, her sütunda ${tW} kare. ${len} + ${tW} mi, ${len} × ${tW} mi?`, 'Çarpma yerine toplama yapıyor')
      if (c === want[slots - 1]) return s.nudge('Bu bütün dikdörtgenin değeri. Yalnızca bu parçadaki kareler kaç?')
      if (want.includes(c)) return s.nudge('Bu kart başka bir parçanın değeri. Bu parçanın uzunluğu kaç, genişliği kaç?')
      return s.nudge(`Bu parçada ${len} sütun var, her sütunda ${tW} kare. ${len} × ${tW} kaç eder?`)
    }
    s.clear()
    sfx.ok()
    const next = { ...filled, [i]: c }
    setFilled(next)
    setUsed((u) => [...u, card.id])
    if (Object.keys(next).length === slots) window.setTimeout(() => setPhase('done'), 400)
  })

  const slot = (i: number) =>
    filled[i] !== undefined ? (
      <span className="inline-grid h-10 min-w-12 place-items-center rounded-xl bg-emerald-500 px-1.5 text-lg text-white animate-pop">{n(filled[i])}</span>
    ) : (
      <Drop dnd={dnd} id={`slot-${i}`} className="inline-grid h-11 min-w-12 place-items-center rounded-xl border-2 border-dashed border-sky-400 bg-sky-50 px-1.5 text-base text-sky-500">?</Drop>
    )

  const fill = phase !== 'set'
  const parts = fill ? partsFor(tL, (len, i) => ({ labelWidth: 118, label: <span className="flex items-center gap-1">{len} × {tW} = {slot(i)}</span> })) : partsFor(L)
  const shownLens = fill ? lens : tens(L)
  const match = L === tL && W === tW

  return (
    <Split
      work={
        <Stage className="space-y-3 overflow-clip! p-2 sm:p-4">
          <Board maxL={maxLFor(grade)} W={fill ? tW : W} parts={parts} onResize={fill ? undefined : (l, w) => {
            setL(l)
            setW(w)
          }} />
          {fill ? (
            <Equation lens={lens} W={tW} tones={tonesFor(lens)} vals={lens.map((_, i) => (filled[i] !== undefined ? n(filled[i]) : '?'))} total={slot(slots - 1)} />
          ) : (
            <Equation lens={shownLens} W={W} tones={tonesFor(shownLens)} />
          )}
          {!fill && <Sliders L={L} W={W} setL={setL} setW={setW} grade={grade} />}
          {s.view('work')}
          {phase === 'fill' && (
            <Sticky>
              <Tray title="Sayı kartları">
                {cards.map((c, i) => (used.includes(c.id) ? null : <Drag key={c.id} dnd={dnd} item={`card-${i}`} label={`${n(c.v)} kartı`} className={TOKEN}>{n(c.v)}</Drag>))}
              </Tray>
            </Sticky>
          )}
        </Stage>
      }
      panel={
        <>
          <Prompt step={`Hedef ${round + 1} / ${total}`}>
            <span className="flex flex-wrap items-center gap-3">
              <span className={`grid h-16 min-w-28 place-items-center rounded-2xl px-3 text-3xl font-black tabular-nums ring-2 ${match || fill ? 'bg-emerald-50 text-emerald-700 ring-emerald-400' : 'bg-amber-50 text-amber-800 ring-amber-300'}`}>{tL} × {tW}</span>
              <span className="min-w-0 flex-1">
                {phase === 'set' ? <>Dikdörtgeni <b>{tL} × {tW}</b> yap: uzunluk {tL}, genişlik {tW}. Kaydırıcıları ya da köşe tutamacını kullan.</> : phase === 'fill' ? <>Şimdi her parçanın üstündeki <b>?</b> kutusuna ve denklemin sonuna doğru sayı kartını sürükle.</> : <>Tamam! {tL} × {tW} = {n(tL * tW)}</>}
              </span>
            </span>
          </Prompt>
          {phase === 'set' && <p className="rounded-xl bg-white/80 px-3 py-2 text-sm font-bold text-ink-soft ring-1 ring-line">Şu an: {L} × {W}. {L !== tL ? `Uzunluk ${tL} olmalı.` : W !== tW ? `Genişlik ${tW} olmalı.` : 'Tamam!'}</p>}
          {s.view('panel')}
          {phase === 'done' && (
            <Reveal>
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800 ring-1 ring-emerald-300 animate-pop">
                {tL} × {tW} = {lens.map((len) => `(${len} × ${tW})`).join(' + ')} = {lens.map((len) => n(len * tW)).join(' + ')} = {n(tL * tW)}
              </p>
              <button type="button" onClick={onNext} className="btn-primary min-h-14 w-full text-lg animate-fade-up">{round + 1 < total ? 'Sıradaki hedef' : 'Devam'}</button>
            </Reveal>
          )}
        </>
      }
    />
  )
}

/* ───────────── 3. Gizli parça ───────────── */

function HiddenTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const [rounds] = useState(() => {
    const a = { L: rand(13, 19), W: rand(4, 9) }
    let b = { L: rand(12, 18), W: rand(3, 8) }
    while (b.L === a.L) b = { ...b, L: rand(12, 18) }
    return [a, b]
  })
  const [k, setK] = useState(0)
  const [solved, setSolved] = useState(false)
  const r = rounds[Math.min(k, 1)]
  const rest = r.L - 10
  const T = r.L * r.W
  const known = 10 * r.W
  const askLen = k === 1
  const rules = ['Bütünü ve bir parçayı biliyorsam gizli parçayı çıkararak bulurum: bütün − bilinen parça = gizli parça.']

  const [cards, setCards] = useState(() => cardsFor(rounds[0], false))
  function cardsFor(x: { L: number; W: number }, len: boolean) {
    const re = x.L - 10
    const vals = len ? [re, re * x.W, x.L, re + 2] : [re * x.W, 10 * x.W, x.L * x.W + 10 * x.W, re]
    return shuffle([...new Set(vals)])
  }

  const dnd = useDnd((item, target) => {
    if (target !== 'gap' || solved) return false
    const v = Number(item.slice(5))
    if (!askLen) {
      if (v === rest * r.W) return win()
      if (v === known) return s.nudge(`${known}, mavi parçanın değeri. Gizli parça ile mavi parça birlikte ${n(T)} ediyor. Gizli parça kaç?`)
      if (v > T) return s.nudge(`Gizli parça bütün dikdörtgenden büyük olabilir mi? ${n(T)}’den mavi parçayı çıkar.`, 'Parça ile bütünü karıştırıyor')
      if (v === rest) return s.nudge(`${rest}, gizli parçanın uzunluğu olabilir. Ama soru kaç kare olduğunu soruyor. Her sütunda ${r.W} kare var.`)
      return s.nudge(`${n(known)} + ${n(v)} = ${n(known + v)}. Bu ${n(T)} mi?`)
    }
    if (v === rest) return win()
    if (v === rest * r.W) return s.nudge(`${n(v)}, gizli parçadaki kare sayısı. Her sütunda ${r.W} kare var: ${n(v)} kare kaç sütun eder?`, 'Parçanın alanı ile kenar uzunluğunu karıştırıyor')
    if (v === r.L) return s.nudge(`${r.L}, bütün dikdörtgenin uzunluğu olurdu. Mavi parçanın uzunluğu 10. Gizli parçanın uzunluğu kaç?`)
    return s.nudge(`Gizli parçada ${v} sütun olsaydı ${v} × ${r.W} = ${n(v * r.W)} kare olurdu. Gizli parçada kaç kare var?`)
  })
  function win() {
    s.clear()
    sfx.ok()
    setSolved(true)
    return true
  }
  const next = () => {
    setSolved(false)
    s.clear()
    if (k === 0) setCards(cardsFor(rounds[1], true))
    setK(k + 1)
  }

  const gap = <Drop dnd={dnd} id="gap" className="inline-grid h-11 min-w-12 place-items-center rounded-xl border-2 border-dashed border-sky-400 bg-sky-50 px-1.5 text-base text-sky-500">?</Drop>
  const hiddenLabel = solved ? undefined : askLen ? <span className="flex items-center gap-1">{gap} × {r.W} = {n(rest * r.W)}</span> : <span className="flex items-center gap-1">? × {r.W} = {gap}</span>
  const parts: Part[] = [
    { len: 10, tone: 'ten' },
    { len: rest, tone: 'rest', hidden: !solved, label: hiddenLabel, labelWidth: 118 },
  ]
  const done = k >= 2

  return (
    <Split
      work={
        done ? (
          <Stage className="space-y-3 p-3 sm:p-4">
            <RulesFound rules={rules} />
          </Stage>
        ) : (
          <Stage className="space-y-3 overflow-clip! p-2 sm:p-4">
            <Board key={k} maxL={20} W={r.W} parts={parts} hideL={!solved} />
            <Equation
              names={solved ? undefined : ['10', '?']}
              hideL={!solved}
              lens={[10, rest]}
              W={r.W}
              tones={['ten', 'rest']}
              vals={[n(known), solved ? n(rest * r.W) : askLen ? n(rest * r.W) : '?']}
              total={n(T)}
            />
            {solved && <p className="text-center text-sm font-black text-emerald-700 animate-pop">Perde kalktı: {rest} × {r.W} = {n(rest * r.W)}. {n(known)} + {n(rest * r.W)} = {n(T)}</p>}
            {s.view('work')}
            {!solved && (
              <Sticky>
                <Tray title="Sayı kartları">
                  {cards.map((v) => <Drag key={`${k}-${v}`} dnd={dnd} item={`card-${v}`} label={`${n(v)} kartı`} className={TOKEN}>{n(v)}</Drag>)}
                </Tray>
              </Sticky>
            )}
          </Stage>
        )
      }
      panel={
        <>
          {!done && (
            <Prompt step={`Gizli parça ${k + 1} / 2`}>
              {askLen ? (
                <>Bu dikdörtgende <b>{n(T)}</b> kare var, genişliği <b>{r.W}</b>. Mavi parça 10 × {r.W} = {n(known)}. Gizli parçada {n(rest * r.W)} kare var. Gizli parçanın <b>uzunluğu</b> kaç? Kartı sürükle.</>
              ) : (
                <>Bu dikdörtgende toplam <b>{n(T)}</b> kare var. Mavi parça 10 × {r.W} = {n(known)}. Perdenin arkasındaki parçada <b>kaç kare</b> var? Kartı sürükle.</>
              )}
            </Prompt>
          )}
          {s.view('panel')}
          {solved && !done && (
            <Reveal>
              <button type="button" onClick={next} className="btn-primary min-h-14 w-full text-lg animate-fade-up">{k === 0 ? 'Sıradaki gizli parça' : 'Devam'}</button>
            </Reveal>
          )}
          {done && (
            <Reveal>
              <Prompt step="Tamam">İki gizli parçayı da bütünden bilinen parçayı çıkararak buldun.</Prompt>
              <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
            </Reveal>
          )}
        </>
      }
    />
  )
}

/* ───────────── 4. Nereden bölmeli? ───────────── */

function SplitTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const [round, setRound] = useState(0)
  const [r2] = useState(() => {
    const L = rand(13, 19)
    return { L, W: rand(3, 8), at: L - 10 === 5 ? 3 : 5 }
  })
  const L = round === 0 ? 14 : r2.L
  const W = round === 0 ? 5 : r2.W
  const [at, setAt] = useState(3)
  /** bırakılan bölmelerin küçük parçası (7: 7 + 7, 4: 10 + 4) */
  const [tried, setTried] = useState<number[]>([])
  const [phase, setPhase] = useState<'play' | 'ask' | 'r2' | 'done'>('play')
  const [info, setInfo] = useState<string | null>(null)
  const lo = Math.min(at, L - at)
  const rules = ['Bir dikdörtgeni nereden bölersem böleyim sonuç aynıdır; ama 10’luk parçayla bölmek zihinden en kolayıdır: 10 × 5 = 50 hemen bilinir.']
  const t7 = tried.includes(7)
  const t10 = tried.includes(4)
  const tOther = tried.some((x) => x !== 7 && x !== 4)

  useEffect(() => {
    if (phase === 'play' && t7 && t10 && tOther) {
      const id = window.setTimeout(() => setPhase('ask'), 900)
      return () => window.clearTimeout(id)
    }
  }, [t7, t10, tOther, phase])

  const [ask] = useState<Ask>(() => ({
    q: '14 × 5’i zihinden hesaplamak için en kolay bölme hangisi?',
    options: shuffle([
      { label: '10 + 4: 10 × 5 = 50’yi hemen biliriz, 4 × 5 = 20 de kolay', ok: true },
      { label: '7 + 7: iki parça eşit', nudge: 'İki parçanın eşit olması güzel! Ama 7 × 5’i mi daha hızlı bulursun, 10 × 5’i mi?' },
      { label: 'Hepsi aynı zorlukta, çünkü sonuç hep 70', nudge: 'Sonuç hep 70, doğru. Peki hangi parçaları zihninden en hızlı çarparsın: 3 × 5 ile 11 × 5 mi, 10 × 5 ile 4 × 5 mi?' },
    ]),
  }))

  const release = () => {
    if (phase === 'play') setTried((t) => (t.includes(lo) ? t : [...t, lo]))
    if (phase !== 'r2') return
    if (at === 10 || L - at === 10) {
      sfx.ok()
      setInfo(null)
      setPhase('done')
    } else setInfo(`Bu bölmede ${at} × ${W} ve ${L - at} × ${W} hesaplanır. ${Math.max(at, L - at)} × ${W}’i zihinden hemen bulabilir misin? Daha kolay bir yer var mı?`)
  }

  const lens = [at, L - at]
  const tones = tonesFor(lens, true)
  const parts: Part[] = lens.map((len, i) => ({ len, tone: tones[i] }))
  return (
    <Split
      work={
        <Stage className="space-y-3 p-2 sm:p-4">
          <Board
            key={round}
            maxL={20}
            W={W}
            parts={parts}
            split={phase === 'play' || phase === 'r2' ? {
              at,
              onChange: (v) => {
                setAt(v)
                setInfo(null)
              },
              onRelease: release,
            } : undefined}
          />
          <Equation lens={lens} W={W} tones={tones} />
          {phase === 'r2' && info && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900 ring-1 ring-amber-200 animate-fade-up">{info}</p>}
        </Stage>
      }
      panel={
        <>
          {round === 0 ? (
            <>
              <Prompt step="Böl ve karşılaştır">Siyah <b>⇔</b> tutamacı sağa sola sürükleyerek 14 × 5’i farklı yerlerden böl. Hangi parçaları zihinden daha kolay çarparsın?</Prompt>
              <Checklist
                items={[
                  { label: <>7 + 7 diye böl</>, ok: t7 },
                  { label: <>10 + 4 diye böl</>, ok: t10 },
                  { label: <>Başka bir yerden böl (ör. {lo === 2 ? '12 + 2' : '11 + 3'})</>, ok: tOther },
                ]}
              />
              {phase === 'ask' && (
                <Reveal>
                  <DragAsk checks={checks} ask={ask} onOk={() => {
                    setRound(1)
                    setAt(r2.at)
                    setPhase('r2')
                  }} okText="Evet! Hangi bölmeyi seçersen seç sonuç 70, ama 10’luk parça hesabı kolaylaştırır." />
                </Reveal>
              )}
            </>
          ) : (
            <>
              <Prompt step="Şimdi sen seç">Yeni çarpım: <b>{L} × {W}</b>. Bölme tutamacını, zihinden en kolay hesaplayacağın yere taşı ve bırak.</Prompt>
              {phase === 'done' && (
                <Reveal>
                  <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800 ring-1 ring-emerald-300 animate-pop">
                    Harika! {L} × {W} = (10 × {W}) + ({L - 10} × {W}) = {n(10 * W)} + {n((L - 10) * W)} = {n(L * W)}
                  </p>
                  <RulesFound rules={rules} />
                  <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
                </Reveal>
              )}
            </>
          )}
        </>
      }
    />
  )
}

/* ───────────── 5. Hatalı cevap avı ───────────── */

interface Term { text: string; part: number; paint: [number, number]; claim: number }
interface Hunt { who: string; /** “Can’ın”, “Ece’nin” */ whose: string; L: number; W: number; work: string; wrong: number; terms: Term[]; wrongPart: string; ask: Ask; ok: string }

const HUNTS: Hunt[] = [
  {
    who: 'Can', whose: 'Can’ın', L: 14, W: 5, work: '14 × 5 = 10 × 5 + 4 = 54', wrong: 54,
    terms: [
      { text: '10 × 5', part: 0, paint: [10, 5], claim: 50 },
      { text: '+ 4', part: 1, paint: [4, 1], claim: 4 },
    ],
    wrongPart: 'Can’ın “+ 4”ü 14’ün hangi parçasından geliyor? 14 = 10 + 4.',
    ask: {
      q: 'Can nerede yanıldı?',
      options: [
        { label: '4 × 5 yerine yalnızca 4 ekledi: 16 kare sayılmadı. Doğrusu 50 + 20 = 70', ok: true },
        { label: '10 × 5’i yanlış hesapladı', nudge: 'Mavi parçaya bak: 10 sütun, her sütunda 5 kare. 50 doğru mu?' },
        { label: 'Hata yok, 54 doğru', nudge: 'Turuncu parçada kaç kare var? Can kaçını boyadı? Taralı kareler sayıldı mı?', mis: 'Dağılma özelliğinde kalan parçayı çarpmadan ekliyor' },
      ],
    },
    ok: 'Evet! Turuncu parça 4 × 5 = 20 kare; Can yalnızca 4’ünü saydı.',
  },
  {
    who: 'Ece', whose: 'Ece’nin', L: 13, W: 6, work: '13 × 6 = 1 × 6 ve 3 × 6 → 6 | 18 = 618', wrong: 618,
    terms: [
      { text: '1 × 6 = 6', part: 0, paint: [1, 6], claim: 6 },
      { text: '3 × 6 = 18', part: 1, paint: [3, 6], claim: 18 },
    ],
    wrongPart: 'Ece 13’teki rakamları ayrı ayrı çarptı. 13’teki 3 hangi parça? 13’teki 1 aslında kaç sütun anlatıyor?',
    ask: {
      q: 'Ece nerede yanıldı?',
      options: [
        { label: '13’teki 1 aslında 10: 1 × 6 değil 10 × 6 = 60. Sonra 60 + 18 = 78', ok: true },
        { label: '3 × 6’yı yanlış hesapladı', nudge: 'Turuncu parçaya bak: 3 sütun, her sütunda 6 kare. 18 doğru mu?' },
        { label: '6 ile 18’i yan yana yazmak doğru, 618', nudge: '13 × 6, 20 × 6’dan küçük olmalı. 20 × 6 = 120. 618 olabilir mi?', mis: 'Kısmi çarpımları toplamak yerine yan yana yazıyor' },
      ],
    },
    ok: 'Doğru! Mavi parçada 60 kare var; Ece yalnızca bir sütununu (6 kare) saydı. 13 × 6 = 78.',
  },
]

function ErrorTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const [k, setK] = useState(0)
  const rules = [
    'Dikdörtgeni bölünce her parçayı ayrı ayrı çarparım; hiçbir parçayı unutmam: 14 × 5 = 50 + 20, 50 + 4 değil.',
    'İki basamaklı sayıdaki onlar rakamı onluk anlatır: 13 × 6’da 1 aslında 10’dur, 10 × 6 = 60.',
  ]
  if (k >= HUNTS.length)
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <RulesFound rules={rules} />
        <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
      </div>
    )
  return <HuntRound key={k} h={HUNTS[k]} round={k} checks={checks} onNext={() => setK(k + 1)} />
}

function HuntRound({ h, round, checks, onNext }: { h: Hunt; round: number; checks: ReturnType<typeof useChecks>; onNext: () => void }) {
  const s = useSay(checks)
  const [placed, setPlaced] = useState<Record<number, Term>>({})
  const [phase, setPhase] = useState<'place' | 'ask' | 'done'>('place')
  const [ask] = useState<Ask>(() => ({ ...h.ask, options: shuffle(h.ask.options) }))
  const lens = tens(h.L)

  const dnd = useDnd((item, target) => {
    if (!target.startsWith('part-')) return false
    const p = Number(target.slice(5))
    const t = h.terms[Number(item.slice(5))]
    if (placed[p]) return false
    if (t.part !== p) return s.nudge(h.wrongPart)
    s.clear()
    sfx.ok()
    const next = { ...placed, [p]: t }
    setPlaced(next)
    if (Object.keys(next).length === h.terms.length) window.setTimeout(() => setPhase('ask'), 600)
  })

  const reveal = phase === 'done'
  const parts: Part[] = lens.map((len, i) => ({
    len,
    tone: i === 0 ? 'ten' : 'rest',
    paint: reveal ? null : placed[i]?.paint ?? null,
    drop: placed[i] || phase !== 'place' ? undefined : `part-${i}`,
    label: reveal ? undefined : placed[i] ? <span>{h.who}: {n(placed[i].claim)} kare</span> : <span className="text-slate-400">?</span>,
  }))
  const missing = Object.entries(placed).reduce((sum, [p, t]) => sum + lens[Number(p)] * h.W - t.paint[0] * t.paint[1], 0)

  return (
    <Split
      work={
        <Stage className="space-y-3 overflow-clip! p-2 sm:p-4">
          <div className="rounded-2xl bg-amber-50 px-3 py-2 text-center ring-1 ring-amber-300">
            <p className="text-xs font-black tracking-wide text-amber-800 uppercase">{h.whose} çözümü</p>
            <p className="text-xl font-black text-amber-950 tabular-nums sm:text-2xl">{h.work}</p>
          </div>
          <Board
            maxL={20}
            W={h.W}
            parts={parts}
            renderDrop={(id, _b, style) => <Drop dnd={dnd} id={id} className="rounded-sm" style={style} />}
          />
          {Object.keys(placed).length > 0 && !reveal && (
            <p className="text-center text-sm font-black text-ink-soft">
              {h.whose} saydığı kareler boyalı. {missing > 0 ? <span className="text-red-600">Taralı {missing} kare hiç sayılmadı!</span> : 'Bu parçanın bütün kareleri sayıldı.'}
            </p>
          )}
          {reveal && <Equation lens={lens} W={h.W} tones={tonesFor(lens)} />}
          {s.view('work')}
          {phase === 'place' && (
            <Sticky>
              <Tray title={`${h.whose} hesabındaki parçalar`}>
                {h.terms.map((t, i) => (Object.values(placed).includes(t) ? null : (
                  <Drag key={i} dnd={dnd} item={`term-${i}`} label={t.text} className="grid min-h-14 min-w-16 place-items-center rounded-2xl bg-amber-100 px-3 text-xl font-black text-amber-950 shadow-[0_3px_0_#f59e0b] ring-2 ring-amber-400">{t.text}</Drag>
                )))}
              </Tray>
            </Sticky>
          )}
        </Stage>
      }
      panel={
        <>
          <Prompt step={`Hata avı ${round + 1} / ${HUNTS.length}`}>
            {phase === 'place' ? (
              <>{h.who} {h.L} × {h.W} için <b>{n(h.wrong)}</b> buldu. Hesabındaki her parçayı tutup dikdörtgende <b>anlattığı parçanın üstüne</b> sürükle. {h.who} kaç kare saymış?</>
            ) : (
              <>{h.who} {n(h.wrong)} dedi, dikdörtgende {n(h.L * h.W)} kare var.</>
            )}
          </Prompt>
          {s.view('panel')}
          {phase === 'ask' && (
            <Reveal>
              <DragAsk checks={checks} ask={ask} okText={h.ok} onOk={() => setPhase('done')} />
            </Reveal>
          )}
          {phase === 'done' && (
            <Reveal>
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800 ring-1 ring-emerald-300 animate-pop">
                {h.L} × {h.W} = (10 × {h.W}) + ({h.L - 10} × {h.W}) = {n(10 * h.W)} + {n((h.L - 10) * h.W)} = {n(h.L * h.W)}
              </p>
              <button type="button" onClick={onNext} className="btn-primary min-h-14 w-full text-lg animate-fade-up">{round + 1 < HUNTS.length ? 'Sıradaki hata' : 'Devam'}</button>
            </Reveal>
          )}
        </>
      }
    />
  )
}

/* ───────────── kural defteri ───────────── */

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
        <p className="mt-3 text-sm font-bold text-amber-900">Bu kuralları ezberlemedin: hepsini dikdörtgeni bölüp birleştirerek kendin buldun.</p>
      </div>
      <div className="mt-4"><NextButton last onClick={onFinish} /></div>
    </div>
  )
}

