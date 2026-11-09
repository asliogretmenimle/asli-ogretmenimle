import { useEffect, useRef, useState, type ReactNode } from 'react'
import { BookOpen, Check, Lightbulb } from 'lucide-react'
import type { Grade } from '../../data/types'
import type { InteractionProps } from '../types'
import { Scene } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { sfx } from '../../lib/feedback'
import { Card, NextButton, Nudge, Prompt, Split, Stage, Header, pick, shuffle, useChecks } from '../donusum-studyosu/ortak'
import { Drag, DragAsk, Drop, HowTo, RulesFound, TOKEN, Tray, useDnd, type Tool, type ToolInfo } from '../sayilari-karsilastir/parts'
import { Controls, EASY, EasyStrip, EqView, SliceGrid, TOOL, eqKey, eqOf, eqText, nb, isCut, isEasy, partsOf, valOf, type Axis, type Eq } from './tuval'

/**
 * 97. Parçala ve Birleştir Dizisi (3–4. sınıf, MAT.3.2.3 zihinden çarpma, MAT.4.2.4 kısa yoldan çarpma)
 * Çarpım tablosunu ezberlemek yerine ilişkisel anlama ve türetilmiş gerçekler: çocuk bilmediği 7 × 8’i
 * bir dizi (array) üzerinde makasla keserek iki kolay çarpmaya ayırır: 7 × 8 = (5 × 8) + (2 × 8) = 40 + 16 = 56.
 * Dizi 1–10 satır ve sütunla kurulur (kare ya da nokta); soldaki makas satırları, üstteki makas sütunları keser,
 * çizgi ızgara çizgisine yapışır, parçalar renklenir ve alttaki denklem canlı değişir. Sürüklemeler Pointer Events ile,
 * cevaplar sayı kartı sürükleyerek verilir (Polypad gibi); her görevin üstünde amaç ve “Nasıl kullanılır?” kartı vardır.
 *  1. Diziyi kes: 7 × 8’i 5 ve 2 satır diye kes, kesince karelerin değişmediğini gör; sonra iki makasla dört parça
 *  2. Kolay parçalara kes: 6 × 7, 8 × 6, 9 × 4 gibi zor çarpmaları ×1, ×2, ×5, ×10 parçalarına kes, sonuçları kartla yaz
 *     (8 ya da 9 satır iki kolay parçaya bölünmez: o zaman sütunları kesmek gerekir)
 *  3. Farklı kes, aynı sonuç: aynı çarpmanın dört farklı kesişi deftere yazılır, hepsi aynı sonucu verir
 *  4. Bildiğinden türet: 6 × 8 = 5 × 8 + bir satır; 9 × 7 = 10 × 7 − bir satır (alttaki satır gölgelenir); 4 × c = 5 × c − c
 *  5. Hata avı (arkadaşların kesişlerini Doğru / Hatalı sepetlerine ayır) ve kendi zor çarpmanı kur, kolay parçalara kes
 *  Oyun: her görevde bir rozet; tablet için büyük makas tutamaçları, kart tepsisi dar ekranda alta yapışır.
 *  Son: kural defteri ve rozetler
 */

type Done = (first: boolean, rules: string[]) => void
type SayState = { q: string; mis?: string; k: number } | null

const TASKS: { emoji: string; title: string; badge: string; goal: string; tools: (Tool | ToolInfo)[] }[] = [
  { emoji: '✂️', title: 'Diziyi kes', badge: 'Makas Ustası', goal: '7 × 8’lik diziyi bir çizgiyle iki parçaya kesmek ve kesince karelerin değişmediğini görmek; sonra iki makasla dört parça yapmak.', tools: [TOOL.rowCut, TOOL.colCut, TOOL.size, TOOL.view, 'answer'] },
  { emoji: '🧱', title: 'Kolay parçalara kes', badge: 'Kolay Parça Bulucu', goal: 'Zor bir çarpmayı ×1, ×2, ×5, ×10 gibi bildiğin kolay parçalara kesmek ve parçaların sonuçlarını sayı kartlarıyla yazmak.', tools: [TOOL.rowCut, TOOL.colCut, TOOL.card] },
  { emoji: '🔀', title: 'Farklı kes, aynı sonuç', badge: 'Çok Yollu Düşünür', goal: 'Aynı çarpmayı dört farklı biçimde kesip her kesişin aynı sonucu verdiğini görmek.', tools: [TOOL.rowCut, TOOL.colCut, 'answer'] },
  { emoji: '💡', title: 'Bildiğinden türet', badge: 'Gerçek Türetici', goal: 'Bildiğin bir çarpmadan (5 × 8, 10 × 7) bir satır ekleyerek ya da bir satırı çıkararak yeni bir çarpmayı bulmak.', tools: [TOOL.known, TOOL.rowCut, TOOL.shade, TOOL.card, 'answer'] },
  { emoji: '🕵️', title: 'Hata avı ve senin problemin', badge: 'Hata Avcısı', goal: 'Arkadaşlarının kesişlerindeki hataları bulmak, sonra kendi zor çarpmanı seçip kolay parçalara kesmek.', tools: [TOOL.judge, TOOL.size, TOOL.rowCut, TOOL.colCut] },
]

export default function ParcalaBirlestirDizisi({ grade, onFinish }: InteractionProps) {
  const [idx, setIdx] = useState(0)
  const [rules, setRules] = useState<string[]>([])
  const [help, setHelp] = useState(true)
  const firsts = useRef<boolean[]>([])
  const end = idx >= TASKS.length
  const t = TASKS[Math.min(idx, TASKS.length - 1)]
  const last = idx === TASKS.length - 1
  const badges = TASKS.slice(0, idx)

  const done: Done = (first, r) => {
    firsts.current[idx] = first
    setRules((old) => [...old, ...r.filter((x) => !old.includes(x))])
    setIdx(idx + 1)
    setHelp(false)
    sfx.win()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const finish = () =>
    onFinish({
      stars: starsFor(firsts.current.filter(Boolean).length / TASKS.length),
      summary: `${TASKS.length} görevde zor çarpmaları dizide kolay parçalara kesip birleştirdin, ${badges.length} rozet kazandın ve ${rules.length} kuralı kendin buldun.`,
      insight: 'Zor bir çarpma, kolay parçaların toplamıdır: 7 × 8 = (5 × 8) + (2 × 8) = 40 + 16 = 56. Bildiğin bir gerçekten yenisini türetebilirsin: 6 × 8 = 5 × 8 + 8, 9 × 7 = 10 × 7 − 7.',
    })

  const props = { onDone: done, last, grade }
  return (
    <Scene grade={grade} className="select-none [-webkit-touch-callout:none]">
      <Header
        emoji={end ? '📒' : t.emoji}
        kicker={end ? 'Tamamlandı' : 'Görev'}
        title={end ? 'Kural defterin' : t.title}
        idx={Math.min(idx, TASKS.length - 1)}
        total={TASKS.length}
        right={
          <>
            {badges.length > 0 && (
              <span className="inline-flex h-11 items-center gap-0.5 rounded-full bg-amber-100 px-2.5 text-lg ring-1 ring-amber-300" aria-label={`${badges.length} rozet`} title={badges.map((b) => b.badge).join(', ')}>
                {badges.map((b) => <span key={b.badge} className="animate-pop">{b.emoji}</span>)}
              </span>
            )}
            {!end && (
              <button type="button" onClick={() => setHelp((h) => !h)} aria-pressed={help} aria-label="Nasıl kullanılır?" className={`grid size-11 place-items-center rounded-full text-lg font-black ring-1 transition ${help ? 'bg-sky-600 text-white ring-sky-700' : 'bg-white text-sky-700 ring-sky-200 hover:bg-sky-50'}`}>?</button>
            )}
          </>
        }
      />
      {!end && <HowTo goal={t.goal} tools={t.tools} open={help} onToggle={() => setHelp((h) => !h)} />}
      {end ? (
        <EndView rules={rules} onFinish={finish} />
      ) : idx === 0 ? (
        <ExploreTask key={idx} {...props} />
      ) : idx === 1 ? (
        <EasyTask key={idx} {...props} />
      ) : idx === 2 ? (
        <WaysTask key={idx} {...props} />
      ) : idx === 3 ? (
        <DeriveTask key={idx} {...props} />
      ) : (
        <HuntTask key={idx} {...props} />
      )}
    </Scene>
  )
}

interface TaskProps { onDone: Done; last: boolean; grade: Grade }

/* ───────────── ortak görev yardımcıları ───────────── */

/** Panel tuvalin yanında mı (lg ve üstü)? Değilse ipucu, parmağın olduğu tuvalin içinde gösterilir. */
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

/** Görev içi düşündüren soru. nudge deneme sayacına yazar; tell yalnızca yol gösterir (keşifte serbest deneme cezalanmaz). */
function useSay(checks: ReturnType<typeof useChecks>) {
  const wide = useWide()
  const [say, setSay] = useState<SayState>(null)
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
    /** Geniş ekranda panelde, dar ekranda tuvalde: tek bir yerde gösterilir (yanılgı raporuna bir kez yazılsın) */
    view: (spot: 'work' | 'panel') => (say && (spot === 'panel') === wide ? <Nudge key={say.k} question={say.q} misconception={say.mis} /> : null),
  }
}
type Say = ReturnType<typeof useSay>

/** Dar ekranda yeni çıkan soru ya da düğme görünür alanda değilse kendiliğinden oraya kaydırılır */
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

/** Kart tepsisi dar ekranda ekranın altına yapışır: hedefe kaydırırken kartlar elinin altında kalır */
function Sticky({ children }: { children: ReactNode }) {
  return <div className="sticky bottom-2 z-20 rounded-2xl shadow-[0_-8px_24px_-12px_rgb(15_23_42/0.35)] lg:static lg:shadow-none">{children}</div>
}

/** Dizi durumu: satır, sütun ve iki kesik (kesik = satır/sütun sayısı ya da 0: bölünmemiş) */
function useArray(r0: number, c0: number) {
  const [st, setSt] = useState({ r: r0, c: c0, cutR: r0, cutC: c0 })
  return {
    ...st,
    setR: (r: number) => setSt((x) => ({ ...x, r, cutR: isCut(x.cutR, x.r) && x.cutR < r ? x.cutR : r })),
    setC: (c: number) => setSt((x) => ({ ...x, c, cutC: isCut(x.cutC, x.c) && x.cutC < c ? x.cutC : c })),
    cut: (axis: Axis, k: number) => setSt((x) => (axis === 'r' ? { ...x, cutR: k } : { ...x, cutC: k })),
    /** Parmak kalkınca oluşan kesikler */
    after: (axis: Axis, k: number) => (axis === 'r' ? { R: k, C: st.cutC } : { R: st.cutR, C: k }),
  }
}

function EqBox({ children, title = 'Denklem' }: { children: ReactNode; title?: string }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-2.5 ring-2 ring-sky-200">
      <p className="mb-1 text-center text-[11px] font-black tracking-wide text-sky-700 uppercase">{title}</p>
      {children}
    </div>
  )
}

/** Kolay çarpma için ipucu (sonek gerektirmeyen kalıplar) */
function easyHint(a: number, b: number) {
  const e = EASY.includes(a) ? a : b
  const o = e === a ? b : a
  if (e === 1) return `Yalnızca 1 sıra var: kaç kare?`
  if (e === 2) return `2 tane ${o}: ${o} + ${o}, yani ikiye katla.`
  if (e === 5) return `10 × ${o} = ${10 * o}. 5 × ${o} bunun yarısı.`
  if (e === 10) return `10 tane ${o}: ${o} onluk.`
  return `Her sırada ${b} kare var; sıraları say.`
}

/* ───────────── sayı kartlarıyla denklemi tamamla ───────────── */

interface Decoy { v: number; q?: string; mis?: string }

/** Yanlış kartlar: toplama yanılgısı ve “bir satır eksik/fazla” */
function decoysFor(eq: Eq, extra: Decoy[] = []): Decoy[] {
  const need = new Set([...eq.terms.map(valOf), eq.total])
  const pool: Decoy[] = [...extra]
  for (const t of eq.terms)
    if (t.a > 1 && t.b > 1)
      pool.push({ v: t.a + t.b, mis: 'Çarpma yerine toplama yapıyor', q: `${t.a} + ${t.b} = ${t.a + t.b}. Ama ${t.a} × ${t.b} demek: ${t.a} sıra, her sırada ${t.b} kare. Renkli parçada ${t.a + t.b} kare mi var?` })
  pool.push({ v: eq.op === '+' ? eq.total - eq.lhs[1] : eq.total + eq.lhs[1] })
  pool.push({ v: eq.total + 10 })
  const out: Decoy[] = []
  for (const d of pool) if (d.v > 0 && !need.has(d.v) && !out.some((x) => x.v === d.v)) out.push(d)
  return out.slice(0, extra.length + 2)
}

function FillEq({ r, c, eq, given = [], decoys, s, onDone }: { r: number; c: number; eq: Eq; given?: number[]; decoys: Decoy[]; s: Say; onDone: () => void }) {
  const slots = [...eq.terms.map((t, i) => ({ id: `p${i}`, v: valOf(t), t })).filter((_, i) => !given.includes(i)), { id: 't', v: eq.total, t: null }]
  const [cards] = useState(() => shuffle([...slots.map((x) => x.v), ...decoys.map((d) => d.v)]))
  const [filled, setFilled] = useState<Record<string, number>>({})
  const [used, setUsed] = useState<number[]>([])
  const complete = Object.keys(filled).length === slots.length

  const dnd = useDnd((item, target) => {
    if (!target.startsWith('slot-')) return false
    const id = target.slice(5)
    const slot = slots.find((x) => x.id === id)
    if (!slot || filled[id] !== undefined) return false
    const ci = Number(item.slice(5))
    const v = cards[ci]
    if (v !== slot.v) {
      if (!slot.t && slots.some((x) => x.t && filled[x.id] === undefined)) return s.tell(`Önce parçaların sonuçlarını yerleştir, sonra ${eq.op === '+' ? 'topla' : 'çıkar'}.`)
      const d = decoys.find((x) => x.v === v && x.q)
      if (d) return s.nudge(d.q!, d.mis)
      if (slot.t) return s.nudge(`${slot.t.a} × ${slot.t.b} parçasına bak. ${easyHint(slot.t.a, slot.t.b)}`)
      return s.nudge(`${eq.terms.map(valOf).join(` ${eq.op} `)} kaç eder? ${eq.op === '+' ? 'Önce onlukları, sonra birlikleri topla.' : 'Onluklardan geriye doğru düşün.'}`)
    }
    s.clear()
    sfx.ok()
    const f = { ...filled, [id]: v }
    setFilled(f)
    setUsed((u) => [...u, ci])
    if (Object.keys(f).length === slots.length) window.setTimeout(onDone, 650)
  })

  const slot = (k: string) => {
    if (k !== 't' && given.includes(Number(k.slice(1)))) return undefined
    const f = filled[k]
    if (f !== undefined) return <span className="grid h-11 min-w-12 place-items-center rounded-xl bg-emerald-500 px-2 text-white animate-pop">{f}</span>
    return <Drop dnd={dnd} id={`slot-${k}`} className="grid h-11 min-w-12 place-items-center rounded-xl border-2 border-dashed border-sky-400 bg-sky-50 px-2 text-base text-sky-500">?</Drop>
  }
  return (
    <>
      <EqBox title={complete ? 'Tamam!' : 'Denklemi kartlarla tamamla'}>
        <EqView r={r} c={c} eq={eq} slot={slot} />
      </EqBox>
      {s.view('work')}
      {!complete && (
        <Sticky>
          <Tray title="Sayı kartları">
            {cards.map((v, i) => (used.includes(i) ? null : <Drag key={i} dnd={dnd} item={`card-${i}`} label={`${v} kartı`} className={TOKEN}>{v}</Drag>))}
          </Tray>
        </Sticky>
      )}
    </>
  )
}

/* ───────────── 1. Diziyi kes ───────────── */

function ExploreTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const g = useArray(7, 8)
  const [view, setView] = useState<'sq' | 'dot'>('sq')
  const [phase, setPhase] = useState<'cut' | 'ask' | 'four' | 'done'>('cut')
  const rules = ['Bir diziyi kesmek kare eklemez, kare silmez: 7 × 8 = (5 × 8) + (2 × 8) = 40 + 16 = 56.'].map(nb)
  const eq = eqOf(g.r, g.c, g.cutR, g.cutC)

  const commit = (axis: Axis, k: number) => {
    const { R, C } = g.after(axis, k)
    if (phase === 'cut') {
      if (isCut(C, g.c)) return s.tell('Güzel kesik! Ama önce satırları kesiyoruz. Üstteki makası sağ kenara geri çek, soldaki makası kullan.')
      if (!isCut(R, g.r)) return
      if (R === 5 || R === 2) {
        s.clear()
        sfx.ok()
        window.setTimeout(() => setPhase('ask'), 500)
        return
      }
      return s.tell(`Şimdi ${R} satır ve ${g.r - R} satır oldu. 7 satırı 5 ve 2 diye kes: çizgiyi 5. satırın altına çek.`)
    }
    if (phase === 'four') {
      if (isCut(R, g.r) && isCut(C, g.c)) {
        s.clear()
        sfx.ok()
        setPhase('done')
      } else if (isCut(R, g.r) || isCut(C, g.c)) s.tell('İki parça oldu. Diğer makası da kullan: kaç parça olacak?')
    }
  }

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <Controls r={g.r} c={g.c} onR={g.setR} onC={g.setC} view={view} onView={setView} locked={phase === 'cut' || phase === 'ask'} />
          <SliceGrid r={g.r} c={g.c} cutR={g.cutR} cutC={g.cutC} onCut={phase === 'ask' ? undefined : g.cut} onCommit={commit} view={view} nudgeKnobs={phase === 'cut'} />
          <EqBox><EqView r={g.r} c={g.c} eq={eq} /></EqBox>
          {s.view('work')}
        </Stage>
      }
      panel={
        <>
          {phase === 'cut' && <Prompt step="Kes">Ekranda 7 satır var, her satırda 8 kare: <b>7 × 8</b>. Bilmiyor musun? Soldaki <b>✂ makası</b> tut ve yukarı sürükle: 7 satırı <b>5 satır</b> ve <b>2 satır</b> diye kes. Alttaki denklemi izle!</Prompt>}
          {s.view('panel')}
          {phase === 'ask' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('four')}
                okText="Evet! Kesmek kare eklemez, kare silmez: 7 × 8 = 40 + 16 = 56."
                ask={{
                  q: 'Diziyi kestin: mavi parça 5 × 8 = 40, turuncu parça 2 × 8 = 16. Kesince ne oldu?',
                  options: [
                    { label: 'Kareler aynı kaldı: 40 + 16 = 56, yine 7 × 8', ok: true },
                    { label: 'Kesince kare sayısı azaldı', nudge: 'Makas bir kareyi sildi mi? Mavi ve turuncu kareleri birlikte düşün: 40 + 16 kaç?', mis: 'Parçalamanın toplam miktarı değiştirdiğini sanıyor' },
                    { label: 'İki sonuç çıktı: 40 ve 16', nudge: 'Mavi ve turuncu parça aynı dizinin parçaları. İkisini birleştirince ne olur?' },
                  ],
                }}
              />
            </Reveal>
          )}
          {phase === 'four' && (
            <Reveal>
              <Prompt step="Şimdi serbestsin">Satır ve sütun sayısını <b>−</b> ve <b>+</b> ile değiştir, istersen <b>Nokta</b> görünümüne geç. Sonra <b>iki makası birlikte</b> kullan: dizi dört parçaya ayrılsın, dört renk olsun.</Prompt>
            </Reveal>
          )}
          {phase === 'done' && (
            <Reveal>
              <Prompt step="Dört parça!">Denkleme bak: dört parçanın toplamı yine {g.r} × {g.c} = {g.r * g.c}. İstersen biraz daha dene, sonra devam et.</Prompt>
              <RulesFound rules={rules} />
              <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
            </Reveal>
          )}
        </>
      }
    />
  )
}

/* ───────────── 2. Kolay parçalara kes ───────────── */

/** n satır (ya da sütun) iki kolay parçaya bölünebilir mi? */
const canSplit = (n: number) => EASY.some((e) => e < n && EASY.includes(n - e))
const HARD = [3, 4, 6, 7, 8, 9]
/** Satırları kolayca bölünenler ve yalnızca sütunu kesince çözülenler */
const POOL_ROW: [number, number][] = [[6, 7], [7, 6], [6, 8], [7, 8], [6, 9], [7, 4], [4, 6], [7, 7], [6, 6], [3, 8]]
const POOL_COL: [number, number][] = [[8, 6], [9, 4], [8, 7], [9, 6], [8, 3], [9, 7], [8, 4]]

function easyProblems(grade: Grade): [number, number][] {
  const big = (p: [number, number]) => (grade >= 4 ? p[0] * p[1] >= 36 : p[0] * p[1] <= 56)
  const a = pick(POOL_ROW.filter(big))
  const b = pick(POOL_COL.filter(big))
  const c = pick([...POOL_ROW, ...POOL_COL].filter((p) => big(p) && p !== a && p !== b))
  return [a, b, c]
}

function EasyTask({ onDone, last, grade }: TaskProps) {
  const checks = useChecks()
  const [list] = useState(() => easyProblems(grade))
  const [k, setK] = useState(0)
  const [solved, setSolved] = useState<string[]>([])
  const rules = ['Zor bir çarpmayı bildiğim kolay parçalara (×1, ×2, ×5, ×10) keserim, sonra parçaları toplarım: 6 × 7 = (5 × 7) + (1 × 7) = 35 + 7 = 42.', 'Satırlar kolay parçalara ayrılmıyorsa sütunları keserim: 9 × 4 = (9 × 2) + (9 × 2).'].map(nb)
  const allDone = solved.length === list.length
  return (
    <EasyRound
      key={k}
      p={list[k]}
      n={k}
      total={list.length}
      checks={checks}
      solved={solved}
      onSolved={(t) => setSolved((x) => [...x, t])}
      after={
        allDone ? (
          <Reveal>
            <RulesFound rules={rules} />
            <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
          </Reveal>
        ) : solved.length > k ? (
          <Reveal>
            <button type="button" onClick={() => setK(k + 1)} className="btn-primary min-h-14 w-full text-lg animate-fade-up">Sonraki çarpma →</button>
          </Reveal>
        ) : null
      }
    />
  )
}

function EasyRound({ p, n, total, checks, solved, onSolved, after }: { p: [number, number]; n: number; total: number; checks: ReturnType<typeof useChecks>; solved: string[]; onSolved: (t: string) => void; after: ReactNode }) {
  const s = useSay(checks)
  const g = useArray(p[0], p[1])
  const [phase, setPhase] = useState<'cut' | 'fill' | 'ok'>('cut')
  const eq = eqOf(g.r, g.c, g.cutR, g.cutC)

  const commit = (axis: Axis, k: number) => {
    if (phase !== 'cut') return
    const { R, C } = g.after(axis, k)
    const ps = partsOf(g.r, g.c, R, C)
    if (ps.length === 1) return
    const hard = ps.find((q) => !isEasy(q.a, q.b))
    if (!hard) {
      s.clear()
      sfx.ok()
      setPhase('fill')
      return
    }
    if (!canSplit(g.r) && isCut(R, g.r) && !isCut(C, g.c)) return s.tell(`${g.r} satırı iki kolay parçaya bölemezsin: ${hard.a} × ${hard.b} hâlâ zor. Üstteki sütun makasını dene!`)
    return s.tell(`Bu kesikte ${hard.a} × ${hard.b} parçası var; o da zor. Her parçada 1, 2, 5 ya da 10 olsun. Çizgiyi başka yere çek.`)
  }

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <EasyStrip />
          <SliceGrid r={g.r} c={g.c} cutR={g.cutR} cutC={g.cutC} onCut={phase === 'cut' ? g.cut : undefined} onCommit={commit} />
          {phase === 'cut' ? <EqBox><EqView r={g.r} c={g.c} eq={null} /></EqBox> : eq && <FillEq r={g.r} c={g.c} eq={eq} decoys={decoysFor(eq)} s={s} onDone={() => { setPhase('ok'); onSolved(eqText(eq)) }} />}
          {phase !== 'fill' && s.view('work')}
        </Stage>
      }
      panel={
        <>
          <Prompt step={`Çarpma ${n + 1} / ${total}`}>
            {phase === 'cut' ? <><b>{g.r} × {g.c}</b> zor mu? Diziyi öyle kes ki <b>her parça kolay</b> olsun: içinde 1, 2, 5 ya da 10 olsun. İki makası da kullanabilirsin.</> : phase === 'fill' ? <>Harika kesik! Şimdi parçaların sonuçlarını bul: sayı kartlarını tutup <b>?</b> kutularına sürükle.</> : <>Süper! {g.r} × {g.c} = {g.r * g.c}. Bunu kolay parçalardan buldun.</>}
          </Prompt>
          {s.view('panel')}
          {solved.length > 0 && (
            <Card>
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black tracking-wide text-amber-700 uppercase"><BookOpen size={14} />Bulduklarım</p>
              <ul className="space-y-1">
                {solved.map((x) => <li key={x} className="rounded-lg bg-amber-50 px-2 py-1 text-sm font-extrabold tabular-nums ring-1 ring-amber-200 animate-fade-up">{x}</li>)}
              </ul>
            </Card>
          )}
          {after}
        </>
      }
    />
  )
}

/* ───────────── 3. Farklı kes, aynı sonuç ───────────── */

const WAYS: [number, number][] = [[7, 8], [6, 8], [8, 7], [7, 9], [6, 7], [8, 6]]
const GOAL = 4

function WaysTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const [p] = useState(() => pick(WAYS))
  const g = useArray(p[0], p[1])
  const [view, setView] = useState<'sq' | 'dot'>('sq')
  const [found, setFound] = useState<{ key: string; text: string; vert: boolean }[]>([])
  const [phase, setPhase] = useState<'play' | 'ask' | 'done'>('play')
  const [hit, setHit] = useState<string | null>(null)
  const prod = p[0] * p[1]
  const rules = ['Bir çarpmayı nereden kesersem keseyim, satırlardan ya da sütunlardan, sonuç hep aynıdır.'].map(nb)
  const eq = eqOf(g.r, g.c, g.cutR, g.cutC)

  const commit = (axis: Axis, k: number) => {
    if (phase !== 'play') return
    const { R, C } = g.after(axis, k)
    const e = eqOf(g.r, g.c, R, C)
    if (!e) return
    const key = eqKey(e)
    if (found.some((f) => f.key === key)) {
      setHit(key)
      window.setTimeout(() => setHit(null), 900)
      return s.tell('Bu kesişi zaten buldun. Çizgiyi başka bir yere çek ya da diğer makası dene.')
    }
    s.clear()
    sfx.ok()
    const f = [...found, { key, text: eqText(e), vert: isCut(C, g.c) }]
    setFound(f)
    setHit(key)
    window.setTimeout(() => setHit(null), 900)
    if (f.length >= GOAL && f.some((x) => x.vert) && f.some((x) => !x.vert)) window.setTimeout(() => setPhase('ask'), 700)
    else if (f.length >= GOAL) s.tell(f.some((x) => x.vert) ? 'Bir de yalnızca satırları kesmeyi dene: sütun makasını sağ kenara geri çek.' : `${f.length} kesiş buldun! Bir de üstteki sütun makasını dene: sütunları kesince de aynı sonuç çıkar mı?`)
  }

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <div className="flex justify-end gap-1.5">
            {(['sq', 'dot'] as const).map((v) => (
              <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} className={`min-h-12 rounded-xl px-4 text-sm font-black ring-1 ${view === v ? 'bg-sky-600 text-white ring-sky-700' : 'bg-white text-ink ring-line'}`}>{v === 'sq' ? '■ Kare' : '● Nokta'}</button>
            ))}
          </div>
          <SliceGrid r={g.r} c={g.c} cutR={g.cutR} cutC={g.cutC} onCut={phase === 'play' ? g.cut : undefined} onCommit={commit} view={view} />
          <EqBox><EqView r={g.r} c={g.c} eq={eq} /></EqBox>
          {s.view('work')}
        </Stage>
      }
      panel={
        <>
          {phase === 'play' && <Prompt step={`Kesiş ${Math.min(found.length, GOAL)} / ${GOAL}`}><b>{p[0]} × {p[1]}</b> dizisini {GOAL} farklı biçimde kes. Satır makasını, sütun makasını ya da ikisini birlikte kullan. Her yeni kesiş deftere yazılır.</Prompt>}
          {s.view('panel')}
          <Card>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black tracking-wide text-amber-700 uppercase"><BookOpen size={14} />Kesiş defterim · {found.length}</p>
            {found.length === 0 && <p className="text-sm font-bold text-ink-soft">Henüz kesiş yok. Makaslardan birini sürükle.</p>}
            <ol className="max-h-64 space-y-1 overflow-y-auto pr-1">
              {found.map((f) => (
                <li key={f.key} className={`flex items-start gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-sm font-extrabold tabular-nums ring-1 ring-amber-200 animate-fade-up ${hit === f.key ? 'animate-pop ring-2 ring-amber-500' : ''}`}>
                  <Check size={16} strokeWidth={3} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span>{f.text}</span>
                </li>
              ))}
            </ol>
          </Card>
          {phase === 'ask' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('done')}
                okText={`Evet! Hep aynı ${prod} kareyi farklı gruplara ayırdın.`}
                ask={{
                  q: `Hepsini farklı kestin ama hepsi ${prod} çıktı. Neden?`,
                  options: [
                    { label: 'Kesmek kare eklemez, kare silmez: hep aynı diziyi farklı gruplara ayırdım', ok: true },
                    { label: 'Şans eseri: başka bir kesik farklı sonuç verebilir', nudge: 'Defterindeki her kesişi düşün: dizideki karelerden biri kayboldu mu, yeni kare geldi mi?', mis: 'Parçalamanın toplamı değiştirebileceğini düşünüyor' },
                    { label: 'Yalnızca 5’ten kesince doğru sonuç çıkar', nudge: 'Defterine bak: 5’ten kesmediğin kesişler de aynı sonucu vermedi mi?' },
                  ],
                }}
              />
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

/* ───────────── 4. Bildiğinden türet ───────────── */

/** R satırlık dizi; minus ise alttaki satırlar çıkarılır. known: bildiğimiz gerçeğin satır sayısı, target: istenen. */
interface Item { minus: boolean; R: number; c: number; known: number; target: number }

function deriveItems(): Item[] {
  const cs = shuffle([6, 7, 8, 9])
  return [
    { minus: false, R: 6, c: cs[0], known: 5, target: 6 },
    { minus: true, R: 10, c: cs[1], known: 10, target: 9 },
    { minus: true, R: 5, c: cs[2], known: 5, target: 4 },
  ]
}

function DeriveTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const [items] = useState(deriveItems)
  const [k, setK] = useState(0)
  const [solved, setSolved] = useState<string[]>([])
  const [ask, setAsk] = useState<'no' | 'ask' | 'done'>('no')
  const rules = ['Bildiğim bir gerçekten yenisini türetirim: bir satır fazlası için o satırı eklerim, bir satır eksiği için o satırı çıkarırım. 6 × 8 = 40 + 8, 9 × 7 = 70 − 7.'].map(nb)
  const allDone = solved.length === items.length
  return (
    <DeriveRound
      key={k}
      it={items[k]}
      n={k}
      total={items.length}
      checks={checks}
      solved={solved}
      onSolved={(t) => {
        const x = [...solved, t]
        setSolved(x)
        if (x.length === items.length) window.setTimeout(() => setAsk('ask'), 500)
      }}
      after={
        allDone ? (
          <>
            {ask !== 'no' && (
              <Reveal>
                <DragAsk
                  checks={checks}
                  onOk={() => setAsk('done')}
                  okText="Evet! 9 × 8, 10 × 8’den bir satır eksik: 80 − 8 = 72."
                  ask={{
                    q: 'Dizi yok! 9 × 8’i bildiğin bir gerçekten nasıl bulursun?',
                    options: [
                      { label: '10 × 8 = 80, bir satır eksik: 80 − 8 = 72', ok: true },
                      { label: '10 × 8 = 80, bir eksik: 80 − 1 = 79', nudge: '9 × 8 dizisi, 10 × 8 dizisinden bir satır eksik. Bir satırda kaç kare var: 1 mi, 8 mi?', mis: 'Bir satırı çıkarırken yalnızca 1 çıkarıyor' },
                      { label: '5 × 8 = 40, bir satır fazla: 40 + 8 = 48', nudge: '5 satıra bir satır eklersen kaç satır olur? 9 satıra ulaşmak için kaç satır eklemek gerekir?' },
                    ],
                  }}
                />
              </Reveal>
            )}
            {ask === 'done' && (
              <Reveal>
                <RulesFound rules={rules} />
                <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
              </Reveal>
            )}
          </>
        ) : solved.length > k ? (
          <Reveal>
            <button type="button" onClick={() => setK(k + 1)} className="btn-primary min-h-14 w-full text-lg animate-fade-up">Sonraki gerçek →</button>
          </Reveal>
        ) : null
      }
    />
  )
}

function DeriveRound({ it, n, total, checks, solved, onSolved, after }: { it: Item; n: number; total: number; checks: ReturnType<typeof useChecks>; solved: string[]; onSolved: (t: string) => void; after: ReactNode }) {
  const s = useSay(checks)
  const g = useArray(it.R, it.c)
  const [phase, setPhase] = useState<'cut' | 'fill' | 'ok'>('cut')
  const eq = eqOf(g.r, g.c, g.cutR, g.c, it.minus)
  const c = it.c
  const knownVal = it.known * c

  const commit = (axis: Axis, k: number) => {
    if (phase !== 'cut' || axis !== 'r' || !isCut(k, it.R)) return
    const good = it.minus ? k === it.target : k === it.known || it.R - k === it.known
    if (good) {
      s.clear()
      sfx.ok()
      setPhase('fill')
      return
    }
    if (it.minus)
      return s.tell(`Şimdi üstte ${k} satır kaldı, ${it.R - k} satır gölgelendi. ${it.target} × ${c} için üstte ${it.target} satır kalmalı.`)
    return s.tell(`Bildiğin parça ${it.known} × ${c}. Çizgiyi öyle çek ki bir parça tam ${it.known} satır olsun.`)
  }

  const given = eq ? [eq.terms.findIndex((t) => t.a === it.known)] : []
  const extra: Decoy[] = it.minus
    ? [{ v: knownVal - 1, mis: 'Bir satırı çıkarırken yalnızca 1 çıkarıyor', q: `${knownVal} − 1 mi? Gölgeli satırda kaç kare var? Bir satırı çıkarmak ${c} çıkarmak demek.` }]
    : [{ v: knownVal + 1, mis: 'Bir satır eklemeyi 1 eklemek sanıyor', q: `${knownVal} + 1 mi? Turuncu satırda kaç kare var? Bir satır eklemek ${c} eklemek demek.` }]
  if (c > 1) extra.push({ v: 1, q: `1 × ${c} parçasında 1 kare mi var? Bir satırdaki kareleri say.`, mis: 'Bir satırı 1 olarak sayıyor' })

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <div className="mx-auto flex w-fit items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2 ring-2 ring-amber-300">
            <Lightbulb size={20} className="shrink-0 text-amber-600" />
            <span className="text-lg font-black text-amber-900">Biliyorum: {it.known} × {c} = {knownVal}</span>
          </div>
          <SliceGrid r={g.r} c={g.c} cutR={g.cutR} cutC={g.c} onCut={phase === 'cut' ? g.cut : undefined} onCommit={commit} axes={['r']} minus={it.minus} />
          {phase === 'cut' || !eq ? <EqBox><EqView r={g.r} c={g.c} eq={eq} known={it.minus} /></EqBox> : <FillEq r={g.r} c={g.c} eq={eq} given={given} decoys={decoysFor(eq, extra)} s={s} onDone={() => { setPhase('ok'); onSolved(eqText(eq)) }} />}
          {phase !== 'fill' && s.view('work')}
        </Stage>
      }
      panel={
        <>
          <Prompt step={`Gerçek ${n + 1} / ${total}`}>
            {phase !== 'cut' ? (
              phase === 'fill' ? <>Bildiğin parça hazır. Kalanını sayı kartlarıyla tamamla.</> : <>Süper! {it.target} × {c} = {it.target * c}. Ezberlemeden, bildiğinden türettin.</>
            ) : it.minus ? (
              <><b>{it.target} × {c}</b> zor mu? Ama {it.known} × {c} = {knownVal}, bunu biliyorsun! Ekranda {it.R} × {c} var. Soldaki makası <b>yukarı</b> çek: alttaki satır gölgelenip çıkarılsın, üstte <b>{it.target} satır</b> kalsın.</>
            ) : (
              <><b>{it.R} × {c}</b> kaç? Bildiğin gerçekten yola çık: {it.known} × {c} = {knownVal}. Makasla diziyi kes: bir parça tam <b>{it.known} × {c}</b> olsun. Geriye kaç satır kaldı?</>
            )}
          </Prompt>
          {s.view('panel')}
          {solved.length > 0 && (
            <Card>
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black tracking-wide text-amber-700 uppercase"><BookOpen size={14} />Türettiğim gerçekler</p>
              <ul className="space-y-1">
                {solved.map((x) => <li key={x} className="rounded-lg bg-amber-50 px-2 py-1 text-sm font-extrabold tabular-nums ring-1 ring-amber-200 animate-fade-up">{x}</li>)}
              </ul>
            </Card>
          )}
          {after}
        </>
      }
    />
  )
}

/* ───────────── 5. Hata avı ve senin problemin ───────────── */

const HUNT: { text: string; ok: boolean; q: string; mis?: string }[] = [
  { text: '7 × 8 = (5 × 8) + (2 × 8) = 40 + 16 = 56', ok: true, q: 'Diziyle kontrol et: 5 satır ve 2 satır 7 satır ediyor mu? 5 × 8 ve 2 × 8 doğru mu?' },
  { text: '7 × 8 = (5 × 8) + 2 = 40 + 2 = 42', ok: false, q: 'Alttaki parça 2 kare mi, yoksa 2 satır mı? 2 satırda kaç kare var?', mis: 'Parçalardan birini çarpmayı unutuyor' },
  { text: '6 × 9 = (5 × 9) + (1 × 9) = 45 + 1 = 46', ok: false, q: '1 × 9 kaç eder? Bir satırda 1 kare mi var, 9 kare mi?', mis: 'Bir satır eklemeyi 1 eklemek sanıyor' },
  { text: '8 × 6 = (8 × 5) + (8 × 1) = 40 + 8 = 48', ok: true, q: 'Bu kesişte sütunlar kesilmiş: 5 sütun ve 1 sütun 6 sütun ediyor mu? 8 × 5 = 40, 8 × 1 = 8. Hata var mı?', mis: 'Sütunlardan yapılan kesişi yanlış sanıyor' },
  { text: '7 × 6 = (5 × 6) + (3 × 6) = 30 + 18 = 48', ok: false, q: '5 satır ve 3 satır kaç satır eder? Dizide 7 satır var.', mis: 'Parçaların toplamı çarpanı tutmuyor' },
  { text: '9 × 7 = (10 × 7) − (1 × 7) = 70 − 7 = 63', ok: true, q: '10 satırdan 1 satır çıkarınca 9 satır kalır mı? 70 − 7 kaç eder?', mis: 'Çıkarmayla türetilen gerçeği yanlış sanıyor' },
]

function HuntTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const [order] = useState(() => shuffle(HUNT.map((_, i) => i)))
  const [where, setWhere] = useState<Record<number, 'ok' | 'bad'>>({})
  const [phase, setPhase] = useState<'sort' | 'own' | 'done'>('sort')
  const [mine, setMine] = useState<string | null>(null)
  const g = useArray(7, 8)
  const [view, setView] = useState<'sq' | 'dot'>('sq')
  const rules = [
    'Bir kesişi kontrol ederken bakarım: parçalar bütün satırları tutuyor mu, her parça doğru çarpılmış mı?',
    'Zor bir çarpmayı kendim de kolay parçalara kesebilirim: hangi parçaları bildiğime göre seçerim.',
  ].map(nb)
  const next = order.find((i) => where[i] === undefined)
  const eq = eqOf(g.r, g.c, g.cutR, g.cutC)

  const dnd = useDnd((item, target) => {
    if (target !== 'ok' && target !== 'bad') return false
    const i = Number(item.slice(2))
    const h = HUNT[i]
    if ((target === 'ok') !== h.ok) return s.nudge(h.q, h.mis)
    s.clear()
    sfx.ok()
    const w: Record<number, 'ok' | 'bad'> = { ...where, [i]: target }
    setWhere(w)
    if (Object.keys(w).length === HUNT.length) {
      window.setTimeout(() => {
        setPhase('own')
        g.setR(7)
        g.setC(8)
      }, 600)
    }
  })

  const commit = (axis: Axis, k: number) => {
    if (phase !== 'own') return
    const { R, C } = g.after(axis, k)
    const ps = partsOf(g.r, g.c, R, C)
    if (ps.length === 1) return
    if (isEasy(g.r, g.c)) return s.tell(`${g.r} × ${g.c} zaten kolay bir çarpma! Zor bir çarpma seç: iki sayı da ${HARD.join(', ')} olsun.`)
    const hard = ps.find((q) => !isEasy(q.a, q.b))
    if (hard) return s.tell(`Kesik güzel ama ${hard.a} × ${hard.b} parçası hâlâ zor. Her parçada 1, 2, 5 ya da 10 olsun.`)
    const e = eqOf(g.r, g.c, R, C)
    if (!e) return
    s.clear()
    sfx.win()
    setMine(eqText(e))
    setPhase('done')
  }

  const basket = (id: 'ok' | 'bad', title: string, tone: string) => (
    <Drop dnd={dnd} id={id} className={`min-h-28 rounded-2xl border-2 border-dashed p-2 ${tone}`}>
      <p className="mb-1.5 text-center text-base font-black">{title}</p>
      <ul className="space-y-1">
        {HUNT.map((h, i) => (where[i] === id ? <li key={i} className="rounded-lg bg-white px-2 py-1 text-xs font-extrabold text-ink tabular-nums ring-1 ring-black/5 animate-pop sm:text-sm">{nb(h.text)}</li> : null))}
      </ul>
    </Drop>
  )

  const own = phase !== 'sort'
  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          {!own && (
            <div className="grid grid-cols-2 gap-2">
              {basket('ok', '✓ Doğru', 'border-emerald-400 bg-emerald-50 text-emerald-800')}
              {basket('bad', '✗ Hatalı', 'border-rose-300 bg-rose-50 text-rose-800')}
            </div>
          )}
          {!own && next !== undefined && (
            <Sticky>
              <Tray title={`Arkadaşının kesişi · ${Object.keys(where).length + 1} / ${HUNT.length}`}>
                <Drag key={next} dnd={dnd} item={`h-${next}`} label={HUNT[next].text} className="min-h-14 w-full rounded-2xl bg-white px-3 py-2 text-left text-base font-black text-ink tabular-nums shadow-[0_3px_0_#cbd5e1] ring-2 ring-line sm:text-lg">
                  <span className="mr-1.5 text-slate-400" aria-hidden>⠿</span>{nb(HUNT[next].text)}
                </Drag>
              </Tray>
            </Sticky>
          )}
          {s.view('work')}
          <div className={own ? '' : 'rounded-2xl bg-slate-50/80 p-2 ring-1 ring-line'}>
            {!own && <p className="mb-2 text-center text-xs font-black tracking-wide text-ink-soft uppercase">Kontrol dizisi: istersen kesişi burada kur</p>}
            <div className="space-y-3">
              <Controls r={g.r} c={g.c} onR={g.setR} onC={g.setC} view={view} onView={setView} locked={phase === 'done'} />
              <SliceGrid r={g.r} c={g.c} cutR={g.cutR} cutC={g.cutC} onCut={phase === 'done' ? undefined : g.cut} onCommit={commit} view={view} maxH={own ? 470 : 380} />
              <EqBox><EqView r={g.r} c={g.c} eq={eq} /></EqBox>
            </div>
          </div>
        </Stage>
      }
      panel={
        <>
          {phase === 'sort' && <Prompt step="Hata avı">Arkadaşların zor çarpmaları kesip buldu. Kesişi oku: doğruysa <b>Doğru</b>, hata varsa <b>Hatalı</b> sepetine sürükle. Emin değilsen aşağıdaki diziyle kur ve kontrol et.</Prompt>}
          {phase === 'own' && (
            <Reveal>
              <Prompt step="Senin problemin">Şimdi sıra sende! <b>Zor</b> bir çarpma seç: iki sayı da {HARD.join(', ')} olsun. Sonra diziyi öyle kes ki her parça kolay olsun (1, 2, 5 ya da 10).</Prompt>
              <EasyStrip />
            </Reveal>
          )}
          {s.view('panel')}
          {phase === 'done' && mine && (
            <Reveal>
              <div className="rounded-2xl bg-gradient-to-br from-amber-100 to-pink-100 p-3 ring-2 ring-amber-300 animate-pop">
                <p className="text-[11px] font-black tracking-wide text-amber-800 uppercase">🌟 Senin problemin</p>
                <p className="text-lg font-black text-ink tabular-nums">{mine}</p>
                <p className="mt-1 text-sm font-bold text-ink-soft">Bunu bir arkadaşına sor: o nasıl keserdi?</p>
              </div>
              <RulesFound rules={rules} />
              <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
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
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-3xl bg-white/95 p-4 ring-2 ring-pink-200">
        <p className="mb-2 text-sm font-black tracking-wide text-pink-700 uppercase">Rozetlerin</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TASKS.map((t, i) => (
            <div key={t.badge} className="flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2 ring-1 ring-amber-300 animate-pop" style={{ animationDelay: `${i * 80}ms` }}>
              <span className="text-2xl" aria-hidden>{t.emoji}</span>
              <span className="text-sm leading-tight font-black text-amber-900">{t.badge}</span>
            </div>
          ))}
        </div>
      </div>
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
        <p className="mt-3 text-sm font-bold text-amber-900">Bu kuralları ezberlemedin: hepsini dizileri keserek kendin buldun.</p>
      </div>
      <NextButton last onClick={onFinish} />
    </div>
  )
}
