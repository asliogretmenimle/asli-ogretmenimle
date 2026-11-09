import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, BookOpen } from 'lucide-react'
import type { InteractionProps } from '../types'
import { Scene } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { sfx } from '../../lib/feedback'
import { useTracker } from '../../lib/trackerContext'
import { Card, Header, NextButton, Nudge, Prompt, Split, Stage, shuffle, useChecks } from '../donusum-studyosu/ortak'
import { Drag, DragAsk, Drop, HowTo, RulesFound, Tray, n, useDnd, type Ask, type Tool, type ToolInfo } from '../sayilari-karsilastir/parts'
import { BlocksModel, Chart, JumpCards, Line, Problem, Strip, TOOL, Tools, blocksOf, ek, chainOf, chartJump, signed, stepsOf, sumOf, uniq, useStable, type Mv, type Step } from './modeller'

/**
 * 89. Zihinden Toplama ve Çıkarma Stratejileri (2–3. sınıf, 100’e kadar; 3. sınıfta sayı doğrusunda daha büyük sayılar)
 * Üç model de gerçekten etkileşimli ve sürükle-bırak: taban blokları (onluk çubuğu, birlik küpü), yüzlük tabloda
 * sürüklenen kurbağa (aşağı +10, sağa +1; zıplamalar iz bırakır) ve boş sayı doğrusu (zıplama kartları yay çizer).
 * Her hareket “işlem adımları” şeridine işlem cümlesi olarak yazılır: 46 + 20 = 66, 66 + 7 = 73.
 *  1. Bloklarla parçala: 46 + 27’yi onluk ve birlikleri taşıyarak çöz; aynı yolu yeni bir işleme taşı
 *  2. Yüzlük tabloda zıpla: aynı işlemi kurbağayla çöz, blok adımlarıyla karşılaştır; sonra bir çıkarma
 *  3. Onluğa yuvarla: 25 + 39’u sayı doğrusunda 2 zıplamada yap (+40, −1); telafinin nedenini bul
 *  4. Tamamlama: 72 − 48’i 48’den 72’ye ileri zıplayarak bul (48 → 50 → 70 → 72, fark 24)
 *  5. Hangi strateji kolay? İşlem kartlarını parçalama / onluğa yuvarlama / tamamlama sepetlerine ayır
 *  6. Kendi yolun: bir işlemi istediğin modelde çöz, yolunu adlandır, sonra başka bir yoldan çözüp karşılaştır
 *  Son: kural defteri
 * Yüzlük Tablo Gizemi (24), Sayıyı Parçala (23) ve Elde ve Bozma (86) ile çakışmaz: burada amaç yazılı işlem değil,
 * modellerden zihinsel stratejiye ve işlem cümlesine geçiştir.
 */

type Done = (first: boolean, rules: string[]) => void
type Say = { q: string; mis?: string; k: number } | null
interface Memo { a: number; b: number; steps: Step[] }

const TASKS: { emoji: string; title: string; goal: string; tools: (Tool | ToolInfo)[] }[] = [
  { emoji: '🧱', title: 'Bloklarla parçala', goal: 'İkinci sayıyı onluk ve birliklerine ayırıp sırayla eklemek; her hareketin işlem cümlesine dönüştüğünü görmek.', tools: [TOOL.blocks, TOOL.undo, 'answer'] },
  { emoji: '🐸', title: 'Yüzlük tabloda zıpla', goal: 'Aynı işlemi yüzlük tabloda kurbağayla çözüp bloklardaki adımlarla karşılaştırmak; sonra geri zıplayarak çıkarmak.', tools: [TOOL.frog, TOOL.undo, 'answer'] },
  { emoji: '📏', title: 'Onluğa yuvarla', goal: 'Sonu 9 ya da 8 olan sayıyı onluğa yuvarlayıp eklemek, sonra fazlasını geri almak: yalnızca 2 zıplamada.', tools: [TOOL.jump, TOOL.undo, 'answer'] },
  { emoji: '🦘', title: 'İleri say: tamamlama', goal: 'Çıkarmayı küçük sayıdan büyüğe ileri zıplayarak çözmek; zıplamaların toplamı farktır.', tools: [TOOL.jump, TOOL.undo, 'answer'] },
  { emoji: '🧺', title: 'Hangi strateji kolay?', goal: 'Sayılara bakıp her işlem için en kolay stratejiyi seçmek.', tools: [TOOL.sort] },
  { emoji: '🛤️', title: 'Kendi yolun', goal: 'Bir işlemi istediğin modelde ve yolla çözmek, yolunu adlandırmak, sonra başka bir yoldan çözüp karşılaştırmak.', tools: [TOOL.model, TOOL.blocks, TOOL.frog, TOOL.jump, TOOL.label] },
]

const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

/** Eldeli toplama: a’nın birlikleri 3–8, birlikler toplamı 10’u geçer */
function addPair(): [number, number] {
  for (;;) {
    const a = ri(23, 68), b = ri(15, 39)
    if (a % 10 >= 3 && a % 10 <= 8 && b % 10 >= 3 && (a % 10) + (b % 10) > 10 && a + b <= 99) return [a, b]
  }
}
/** Bozmalı çıkarma: a’nın birlikleri b’ninkinden küçük */
function subPair(): [number, number] {
  for (;;) {
    const a = ri(52, 95), b = ri(13, 39)
    if (a % 10 >= 1 && a % 10 < b % 10 && a - b >= 11) return [a, b]
  }
}

export default function ZihindenToplamaCikarma({ grade, onFinish }: InteractionProps) {
  const [idx, setIdx] = useState(0)
  const [rules, setRules] = useState<string[]>([])
  const [help, setHelp] = useState(true)
  const firsts = useRef<boolean[]>([])
  const memo = useRef<Memo | null>(null)
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
      summary: `${TASKS.length} görevde taban blokları, yüzlük tablo ve boş sayı doğrusuyla parçalama, onluğa yuvarlama ve tamamlama stratejilerini denedin; ${rules.length} kuralı kendin buldun.`,
      insight: 'Zihinden işlemde tek bir yol yoktur: 46 + 27 = 46 + 20 + 7 (parçalama), 25 + 39 = 25 + 40 − 1 (onluğa yuvarlama), 72 − 48: 48 → 50 → 70 → 72, fark 24 (tamamlama). Sayılara bakıp en kolay yolu seçeriz.',
    })

  const props = { onDone: done, last, grade }
  return (
    <Scene grade={grade} className="overflow-visible! select-none [-webkit-touch-callout:none]">
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
        <BlocksTask key={idx} {...props} memo={memo} />
      ) : idx === 1 ? (
        <ChartTask key={idx} {...props} memo={memo} />
      ) : idx === 2 ? (
        <RoundTask key={idx} {...props} />
      ) : idx === 3 ? (
        <UpTask key={idx} {...props} />
      ) : idx === 4 ? (
        <SortTask key={idx} {...props} />
      ) : (
        <FreeTask key={idx} {...props} />
      )}
    </Scene>
  )
}

interface TaskProps { onDone: Done; last: boolean; grade: number }

/* ───────────── yardımcılar ───────────── */

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

function useSay(checks: ReturnType<typeof useChecks>) {
  const wide = useWide()
  const [say, setSay] = useState<Say>(null)
  const show = (q: string, mis?: string) => {
    setSay((s) => ({ q, mis, k: (s?.k ?? 0) + 1 }))
    return false as const
  }
  return {
    wide,
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

function Sticky({ children }: { children: ReactNode }) {
  return <div className="sticky bottom-2 z-20 rounded-2xl shadow-[0_-8px_24px_-12px_rgb(15_23_42/0.35)] lg:static lg:shadow-none">{children}</div>
}

function useMoves() {
  const [ms, setMs] = useState<Mv[]>([])
  return { ms, push: (m: Mv) => setMs((x) => [...x, m]), undo: () => setMs((x) => x.slice(0, -1)), reset: () => setMs([]) }
}

function Win({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-900 ring-2 ring-emerald-400 animate-pop">{children}</div>
}

function NextProblem({ onClick, children = 'Sonraki işlem' }: { onClick: () => void; children?: ReactNode }) {
  return <button type="button" onClick={onClick} className="btn-primary min-h-14 w-full text-lg animate-fade-up">{children} <ArrowRight size={20} /></button>
}

/** Bloklarda toplama: kaynak tepsisinden sayıya; çıkarma: sayıdan Gidenler’e ya da bozma */
function blocksHandle(item: string, target: string, a: number, b: number, add: boolean, ms: Mv[], tell: (q: string) => false): Mv | false {
  const used = (ten: boolean) => ms.filter((m) => !m.brk && (Math.abs(m.d) % 10 === 0) === ten).reduce((s, m) => s + Math.abs(m.d), 0)
  if (add) {
    if (target !== 'num') return false
    const remT = Math.floor(b / 10) * 10 - used(true)
    const remO = (b % 10) - used(false)
    if (item === 'b-ten') return remT > 0 ? { d: 10 } : false
    if (item === 'b-one') return remO > 0 ? { d: 1 } : false
    if (item === 'b-tens') return remT > 0 ? { d: remT } : false
    if (item === 'b-ones') return remO > 0 ? { d: remO } : false
    return false
  }
  const { t, o } = blocksOf(a, ms, false)
  const gone = -sumOf(ms)
  if (item === 'v-ten' && target === 'ones') {
    if (o >= 10) return tell('Birlikler alanında zaten 10 birlik var. Önce birlikleri kullan.')
    return { d: 0, brk: true }
  }
  if (target !== 'gone') return false
  if (item === 'v-ten') {
    if (gone + 10 > b) return tell(`${n(b)} çıkarıyoruz. Gidenlerde ${n(gone)} var; bir onluk daha çıkarırsan ${n(gone + 10)} olur, fazla.`)
    return t > 0 ? { d: -10 } : false
  }
  if (item === 'v-one') {
    if (gone + 1 > b) return tell(`Gidenlerde zaten ${n(gone)} var. ${n(b)} çıkarıyoruz.`)
    return o > 0 ? { d: -1 } : false
  }
  return false
}

/* ───────────── 1. Bloklarla parçala ───────────── */

function transferAsk(): Ask {
  let x = 0, y = 0
  for (;;) {
    x = ri(35, 68); y = ri(23, 38)
    if (x % 10 + (y % 10) >= 10 && x + y < 100 && x % 10 !== 0) break
  }
  const T = Math.floor(y / 10) * 10, O = y % 10
  const tensAsOnes = x + Math.floor(y / 10) + O
  const glued = Number(`${Math.floor(x / 10) + Math.floor(y / 10)}${(x % 10) + O}`)
  return {
    q: `${n(x)} + ${n(y)} işlemini aynı yolla zihninden nasıl yaparsın?`,
    options: shuffle([
      { label: `${n(x)} + ${n(T)} = ${n(x + T)}, ${n(x + T)} + ${O} = ${n(x + y)}`, ok: true },
      { label: `${n(x)} + ${Math.floor(y / 10)} = ${n(x + Math.floor(y / 10))}, ${n(x + Math.floor(y / 10))} + ${O} = ${n(tensAsOnes)}`, nudge: `${ek(y, 'loc')}ki ${Math.floor(y / 10)}, kaç onluk demek? ${Math.floor(y / 10)} onluk kaç eder? Blokları hatırla: her çubuk 10.`, mis: 'Onlukları birlik gibi ekliyor' },
      { label: `Onlukları ve birlikleri ayrı ayrı topla, yan yana yaz: ${glued}`, nudge: `${(x % 10)} + ${O} = ${(x % 10) + O}: bu, 1 onluk ve ${((x % 10) + O) % 10} birlik. Bloklarda 10 birlik ne oldu? Sonuç 100’den büyük olabilir mi?`, mis: 'Basamakları ayrı toplayıp yan yana yazıyor' },
    ]),
  }
}

function BlocksTask({ onDone, last, memo }: TaskProps & { memo: { current: Memo | null } }) {
  const checks = useChecks()
  const s = useSay(checks)
  const probs = useStable(() => [addPair(), addPair()])
  const ask = useStable(transferAsk)
  const [pi, setPi] = useState(0)
  const [phase, setPhase] = useState<'play' | 'ask' | 'done'>('play')
  const mv = useMoves()
  const [a, b] = probs[Math.min(pi, 1)]
  const v = a + sumOf(mv.ms)
  const solved = v === a + b
  const steps = stepsOf(a, mv.ms, true)
  const rules = ['Toplarken ikinci sayıyı onluk ve birliklerine parçalarım: 46 + 27 = 46 + 20 + 7. Önce onlukları, sonra birlikleri eklerim.']
  const dnd = useDnd((item, target) => {
    if (solved) return false
    const m = blocksHandle(item, target, a, b, true, mv.ms, s.tell)
    if (!m) return false
    s.clear()
    mv.push(m)
    if (v + m.d === a + b) {
      sfx.ok()
      if (pi === 0) memo.current = { a, b, steps: stepsOf(a, [...mv.ms, m], true) }
    }
  })
  const next = () => {
    mv.reset()
    s.clear()
    if (pi === 0) setPi(1)
    else setPhase('ask')
  }
  return (
    <Split
      work={
        <Stage className="space-y-3 overflow-visible! p-3 sm:p-4">
          <Problem a={a} b={b} op="+" value={v} done={solved} />
          {s.view('work')}
          <BlocksModel start={a} b={b} ms={mv.ms} add dnd={dnd} lock={solved || phase !== 'play'} />
          {!solved && <Tools onUndo={mv.undo} onReset={mv.reset} disabled={!mv.ms.length} />}
          {!s.wide && <Strip start={a} steps={steps} />}
        </Stage>
      }
      panel={
        <>
          <Prompt step={phase === 'play' ? `İşlem ${pi + 1} / 2` : 'Aynı yol, yeni işlem'}>
            {phase === 'play' ? <>{ek(b, 'gen')} bloklarını tutup <b>{ek(a, 'dat')}</b> sürükle. Önce onlukları mı, birlikleri mi eklersin? Her hareketin işlem cümlesine dönüşür.</> : 'Artık blok yok. Aynı yolu zihninde yap.'}
          </Prompt>
          {s.view('panel')}
          {s.wide && <Strip start={a} steps={steps} />}
          {phase === 'play' && solved && (
            <Reveal>
              <Win><p className="text-2xl font-black tabular-nums">{chainOf(a, steps)}</p><p className="text-sm font-extrabold">{ek(b, 'acc')} parçalayarak ekledin.</p></Win>
              <NextProblem onClick={next}>{pi === 0 ? 'Sonraki işlem' : 'Bloksuz dene'}</NextProblem>
            </Reveal>
          )}
          {phase === 'ask' && <Reveal><DragAsk checks={checks} ask={ask} onOk={() => setPhase('done')} okText="Evet! Onlukları ekle, sonra birlikleri: bloklar olmadan da aynı yol." /></Reveal>}
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

/* ───────────── 2. Yüzlük tablo ───────────── */

function ChartTask({ onDone, last, memo }: TaskProps & { memo: { current: Memo | null } }) {
  const checks = useChecks()
  const s = useSay(checks)
  const first = useStable(() => memo.current ?? (() => { const [a, b] = addPair(); return { a, b, steps: [] as Step[] } })())
  const sub = useStable(subPair)
  const [pi, setPi] = useState(0)
  const [phase, setPhase] = useState<'play' | 'cmp' | 'done'>('play')
  const mv = useMoves()
  const add = pi === 0
  const [a, b] = add ? [first.a, first.b] : sub
  const goal = add ? a + b : a - b
  const v = a + sumOf(mv.ms)
  const solved = v === goal
  const steps = stepsOf(a, mv.ms, false)
  const rules = [
    'Yüzlük tabloda bir satır aşağı inmek 10 eklemek, bir kare sağa gitmek 1 eklemektir: 46 + 27 = 46 + 20 + 7.',
    'Çıkarırken geri zıplarım: önce onluklar (yukarı), sonra birlikler (sola).',
  ]
  const onMove = (to: number) => {
    if (solved || phase === 'cmp') return
    const j = chartJump(v, to)
    if (typeof j === 'string') return void s.tell(j)
    if (!j) return
    s.clear()
    mv.push({ d: j })
    if (v + j === goal) sfx.ok()
    else if (add && v + j > goal + 9) s.tell(`${ek(goal, 'acc')} geçtin. Geri zıplayabilir ya da “Geri al” diyebilirsin.`)
  }
  const cmpAsk: Ask = useStable(() => ({
    q: 'Bloklarda ve yüzlük tabloda ne oldu? Şeritlere bak.',
    options: shuffle([
      { label: `İkisinde de ${ek(first.b, 'acc')} onluklar ve birlikler diye parçaladım; sonuç aynı: ${n(first.a + first.b)}`, ok: true },
      { label: 'Yüzlük tabloda başka bir sonuç buldum', nudge: 'İki şeridin son sayısına bak. Aynı mı?' },
      { label: 'Yüzlük tabloda bir satır aşağı inmek 1 ekler', nudge: `Kurbağa ${ek(first.a, 'abl')} bir satır aşağı inince hangi sayıya geldi? ${ek(first.a, 'abl')} kaç fazla?`, mis: 'Yüzlük tabloda aşağı inmeyi +1 sanıyor' },
    ]),
  }))
  return (
    <Split
      work={
        <Stage className="space-y-3 overflow-visible! p-3 sm:p-4">
          <Problem a={a} b={b} op={add ? '+' : '−'} value={v} done={solved} />
          {s.view('work')}
          <Chart start={a} ms={mv.ms} onMove={onMove} lock={solved} />
          {!solved && <Tools onUndo={mv.undo} onReset={mv.reset} disabled={!mv.ms.length} />}
          {!s.wide && <Strip start={a} steps={steps} title="Yüzlük tablodaki adımlarım" />}
        </Stage>
      }
      panel={
        <>
          <Prompt step={`İşlem ${pi + 1} / 2`}>
            {add ? <>🐸 Kurbağa <b>{ek(a, 'loc')}</b>. Onu tutup sürükle: aşağı bir satır <b>+10</b>, sağa bir kare <b>+1</b>. <b>{n(b)}</b> ekle.</> : <>Şimdi çıkarma: kurbağa <b>{ek(a, 'loc')}</b>. Yukarı bir satır <b>−10</b>, sola bir kare <b>−1</b>. <b>{n(b)}</b> çıkar.</>}
          </Prompt>
          {s.view('panel')}
          {s.wide && <Strip start={a} steps={steps} title="Yüzlük tablodaki adımlarım" />}
          {add && first.steps.length > 0 && <Strip start={first.a} steps={first.steps} title="Bloklardaki adımlarım" dim />}
          {solved && phase === 'play' && (
            <Reveal>
              <Win><p className="text-2xl font-black tabular-nums">{chainOf(a, steps)}</p></Win>
              {add ? <NextProblem onClick={() => setPhase('cmp')}>Karşılaştır</NextProblem> : <NextProblem onClick={() => setPhase('done')}>Bitti</NextProblem>}
            </Reveal>
          )}
          {phase === 'cmp' && (
            <Reveal>
              <DragAsk checks={checks} ask={cmpAsk} okText="Evet! Model değişti, strateji aynı kaldı." onOk={() => { mv.reset(); setPi(1); setPhase('play') }} />
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

/* ───────────── 3. Onluğa yuvarla ───────────── */

function roundPair(grade: number): [number, number] {
  if (grade >= 3) {
    const b = [99, 49, 59, 98, 69, 199][ri(0, 5)]
    return [ri(12, 45) * 10 + ri(1, 8), b]
  }
  const b = [19, 29, 39, 18, 28, 38, 49][ri(0, 6)]
  for (;;) {
    const a = ri(21, 55)
    if (a % 10 !== 0 && a + b <= 99) return [a, b]
  }
}
function roundCards(b: number) {
  const R = Math.ceil(b / 10) * 10
  const tens = R <= 50 ? Array.from({ length: R / 10 }, (_, i) => (i + 1) * 10) : [10, R - 10, R]
  return uniq([...tens, 1, 2, 5, -1, -2])
}

function RoundTask({ onDone, last, grade }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const probs = useStable(() => [roundPair(grade), roundPair(grade)])
  const [pi, setPi] = useState(0)
  const [tries, setTries] = useState<string[]>([])
  const [phase, setPhase] = useState<'play' | 'ask' | 'done'>('play')
  const mv = useMoves()
  const [a, b] = probs[Math.min(pi, 1)]
  const goal = a + b
  const R = Math.ceil(b / 10) * 10
  const v = a + sumOf(mv.ms)
  const solved = v === goal && mv.ms.length <= 2
  const long = v === goal && mv.ms.length > 2
  const steps = stepsOf(a, mv.ms, false)
  const rules = [`Sonu 9 ya da 8 olan bir sayıyı eklerken onluğa yuvarlarım, sonra fazlasını geri alırım: 25 + 39 = 25 + 40 − 1 = 64.`]
  const dnd = useDnd((item, target) => {
    if (target !== 'line' || solved || phase !== 'play') return false
    const d = Number(item.slice(2))
    s.clear()
    const ms = [...mv.ms, { d }]
    mv.push({ d })
    const to = v + d
    if (to === goal && ms.length <= 2) {
      sfx.ok()
      setTries((t) => [...t, chainOf(a, stepsOf(a, ms, false)) ?? ''])
    } else if (to === goal) {
      setTries((t) => [...t, chainOf(a, stepsOf(a, ms, false)) ?? ''])
      s.tell(`${ek(goal, 'dat')} ulaştın, ${ms.length} zıplamada! Şimdi 2 zıplamada dene: ${n(b)} hangi onluğa çok yakın? “Baştan” ile yeniden başla.`)
    } else if (ms.length >= 2 && to !== goal) s.tell(`2 zıplama bitti ama ${ek(to, 'dat')} geldin. ${n(b)}, ${ek(R, 'dat')} çok yakın. ${n(R)} ekleyince kaç fazla eklemiş olursun? “Baştan” ile dene.`)
  })
  const ask: Ask = useStable(() => {
    const b = probs[1][1], R = Math.ceil(b / 10) * 10, a = probs[1][0]
    return {
    q: `${n(b)} eklemek için önce ${n(R)} ekledin, sonra ${R - b} geri gittin. Neden geri gittin?`,
    options: shuffle([
      { label: `${n(R)}, ${ek(b, 'abl')} ${R - b} fazla. Fazla eklediğimi geri aldım.`, ok: true },
      { label: 'Geri gitmesem de olurdu, sonuç aynı', nudge: `${n(a)} + ${n(R)} kaç eder? ${n(a)} + ${n(b)} ile aynı mı?`, mis: 'Yuvarladıktan sonra telafi etmesi gerektiğini görmüyor' },
      { label: `Geri değil, ${R - b} daha ileri gitmeliydim`, nudge: `${n(R)}, ${ek(b, 'abl')} büyük mü, küçük mü? Fazla mı ekledin, eksik mi?`, mis: 'Telafinin yönünü karıştırıyor' },
    ]),
  }
  })
  const next = () => {
    mv.reset()
    s.clear()
    setTries([])
    if (pi === 0) setPi(1)
    else setPhase('ask')
  }
  return (
    <Split
      work={
        <Stage className="space-y-3 overflow-visible! p-3 sm:p-4">
          <Problem a={a} b={b} op="+" value={v} done={solved} />
          {s.view('work')}
          <Line start={a} ms={mv.ms} dnd={dnd} />
          {!solved && <Tools onUndo={() => { s.clear(); mv.undo() }} onReset={() => { s.clear(); mv.reset() }} disabled={!mv.ms.length} />}
          {!solved && phase === 'play' && <Sticky><JumpCards cards={roundCards(b)} dnd={dnd} disabled={long} /></Sticky>}
          {!s.wide && <Strip start={a} steps={steps} />}
        </Stage>
      }
      panel={
        <>
          <Prompt step={phase === 'play' ? `İşlem ${pi + 1} / 2 · en çok 2 zıplama` : 'Neden?'}>
            {phase === 'play' ? <><b>{ek(a, 'abl')}</b> başla. <b>{n(a)} + {ek(b, 'acc')}</b> yalnızca <b>2 zıplamada</b> yap. Zıplama kartını doğruya sürükle. İpucu: {n(b)} neredeyse kaç?</> : 'Yaptığın yolu açıkla.'}
          </Prompt>
          {s.view('panel')}
          {s.wide && <Strip start={a} steps={steps} />}
          {tries.length > 0 && (
            <Card>
              <p className="mb-1 text-[11px] font-black tracking-wide text-amber-700 uppercase">Denediğin yollar</p>
              <ul className="space-y-1">{tries.map((t, i) => <li key={i} className="rounded-lg bg-amber-50 px-2 py-1 text-sm font-black tabular-nums ring-1 ring-amber-200">{t}</li>)}</ul>
            </Card>
          )}
          {solved && phase === 'play' && (
            <Reveal>
              <Win><p className="text-2xl font-black tabular-nums">{chainOf(a, steps)}</p><p className="text-sm font-extrabold">2 zıplamada! Onluğa yuvarladın, sonra fazlasını geri aldın.</p></Win>
              <NextProblem onClick={next}>{pi === 0 ? 'Sonraki işlem' : 'Devam'}</NextProblem>
            </Reveal>
          )}
          {phase === 'ask' && <Reveal><DragAsk checks={checks} ask={ask} onOk={() => setPhase('done')} okText="Evet! Yuvarlarken fazla ekledik, o kadar geri aldık. Buna telafi denir." /></Reveal>}
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

/* ───────────── 4. Tamamlama (ileri sayma) ───────────── */

function upPair(grade: number): [number, number] {
  for (;;) {
    const s = grade >= 3 ? ri(152, 388) : ri(31, 68)
    const d = ri(18, 36)
    const t = s + d
    if (s % 10 >= 3 && s % 10 <= 8 && t % 10 >= 1 && t % 10 <= 6 && (grade < 3 || Math.floor(t / 100) > Math.floor(s / 100) || Math.random() < 0.3)) return [t, s]
  }
}
function upCards(t: number, s: number) {
  const c1 = 10 - (s % 10)
  const mid = (Math.floor(t / 10) - Math.ceil(s / 10)) * 10
  return uniq([c1, t % 10, 1, 2, 5, 10, mid, -1, -10])
}
/** Her basamakta büyükten küçüğü çıkarma yanılgısı (72 − 48 → 36) */
const digitWise = (t: number, s: number) => Number(String(t).split('').map((c, i, arr) => Math.abs(Number(c) - Number(String(s).padStart(arr.length, '0')[i]))).join(''))

function UpTask({ onDone, last, grade }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const probs = useStable(() => [upPair(grade), upPair(grade)])
  const [pi, setPi] = useState(0)
  const [phase, setPhase] = useState<'play' | 'ask' | 'done'>('play')
  const mv = useMoves()
  const [t, sm] = probs[Math.min(pi, 1)]
  const v = sm + sumOf(mv.ms)
  const reached = v === t
  const steps = stepsOf(sm, mv.ms, false)
  const d = t - sm
  const rules = ['Çıkarmada sayılar yakınsa küçükten büyüğe ileri sayarım; zıplamaların toplamı farktır: 72 − 48: 48 → 50 → 70 → 72, 2 + 20 + 2 = 24.']
  const dnd = useDnd((item, target) => {
    if (target !== 'line' || reached || phase !== 'play') return false
    const j = Number(item.slice(2))
    s.clear()
    mv.push({ d: j })
    if (v + j === t) sfx.ok()
    else if (v + j > t) s.tell(`🏁 ${ek(t, 'acc')} geçtin. Bir “−” kartıyla geri dönebilir ya da “Geri al” diyebilirsin.`)
  })
  const dw = digitWise(t, sm)
  const opts = uniq([d, d + 10, dw !== d ? dw : d + 2, d - 10 > 0 ? d - 10 : d + 1])
  const ask: Ask = {
    q: `${ek(sm, 'abl')} ${ek(t, 'dat')} zıpladın: ${mv.ms.filter((m) => !m.brk).map((m) => n(m.d)).join(' + ')}. Öyleyse ${n(t)} − ${n(sm)} kaç?`,
    options: opts.map((x) =>
      x === d
        ? { label: n(x), ok: true }
        : x === dw
          ? { label: n(x), nudge: `Her basamakta büyükten küçüğü mü çıkardın? Zıplamalarını topla: ${mv.ms.map((m) => n(m.d)).join(' + ')} = ?`, mis: 'Her basamakta büyük rakamdan küçüğü çıkarıyor' }
          : { label: n(x), nudge: `Zıplamalarının üstündeki sayıları topla: ${mv.ms.map((m) => signed(m.d)).join(' ')}.` },
    ),
  }
  const after = () => {
    if (pi === 0) {
      mv.reset()
      s.clear()
      setPi(1)
    } else setPhase('done')
  }
  return (
    <Split
      work={
        <Stage className="space-y-3 overflow-visible! p-3 sm:p-4">
          <Problem a={t} b={sm} op="−" value={d} done={phase !== 'play' && (phase === 'done')} />
          {s.view('work')}
          <Line start={sm} ms={mv.ms} dnd={dnd} target={t} />
          {!reached && <Tools onUndo={() => { s.clear(); mv.undo() }} onReset={() => { s.clear(); mv.reset() }} disabled={!mv.ms.length} />}
          {!reached && <Sticky><JumpCards cards={upCards(t, sm)} dnd={dnd} /></Sticky>}
          {!s.wide && <Strip start={sm} steps={steps} />}
        </Stage>
      }
      panel={
        <>
          <Prompt step={`İşlem ${pi + 1} / 2`}>
            <b>{n(t)} − {n(sm)}</b>: geri saymak yerine <b>{ek(sm, 'abl')}</b> 🏁 <b>{ek(t, 'dat')}</b> ileri zıpla. Önce bir onluğa ulaşmak kolay olabilir. Kaç zıpladın?
          </Prompt>
          {s.view('panel')}
          {s.wide && <Strip start={sm} steps={steps} />}
          {reached && phase === 'play' && <Reveal key={pi}><DragAsk checks={checks} ask={ask} onOk={after} okText={`Evet! ${n(t)} − ${n(sm)} = ${n(d)}. İleri zıplamaların toplamı fark.`} /></Reveal>}
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

/* ───────────── 5. Hangi strateji kolay? ───────────── */

type Basket = 'parca' | 'yuvarla' | 'tamamla'
const BASKETS: { id: Basket; title: string; ex: string; tone: string }[] = [
  { id: 'parca', title: '✂️ Parçalama', ex: '46 + 27 = 46 + 20 + 7', tone: 'border-sky-400 bg-sky-50 text-sky-900' },
  { id: 'yuvarla', title: '🎯 Onluğa yuvarlama', ex: '25 + 39 = 25 + 40 − 1', tone: 'border-violet-400 bg-violet-50 text-violet-900' },
  { id: 'tamamla', title: '🦘 Tamamlama', ex: '72 − 48: 48 → 50 → 72', tone: 'border-amber-400 bg-amber-50 text-amber-900' },
]
interface SortItem { t: string; k: Basket; why: string }
const SORT2: SortItem[] = [
  { t: '34 + 25', k: 'parca', why: 'Bu işlemde 9 ya da 8 ile biten sayı yok, sayılar birbirine yakın da değil. Onlukları, sonra birlikleri eklemek kolay: 34 + 20 + 5.' },
  { t: '52 + 36', k: 'parca', why: 'Ne 9 ile biten bir sayı var ne de yakın iki sayı. 52 + 30 + 6 kolay.' },
  { t: '47 + 29', k: 'yuvarla', why: '29 neredeyse kaç? 30 ekleyip 1 geri almak kolay olmaz mı?' },
  { t: '56 + 19', k: 'yuvarla', why: '19, 20’ye çok yakın. 56 + 20 − 1 dene.' },
  { t: '83 − 39', k: 'yuvarla', why: '39, 40’a çok yakın. 83 − 40 = 43, sonra 1 fazla çıkardığın için 1 ekle.' },
  { t: '62 − 58', k: 'tamamla', why: '58 ile 62 birbirine çok yakın. 58’den 62’ye kaç adım ileri sayarsın?' },
  { t: '81 − 77', k: 'tamamla', why: '77’den 81’e ileri saymak çok kısa: 77 → 80 → 81.' },
]
const SORT3: SortItem[] = [
  { t: '234 + 152', k: 'parca', why: 'Bu sayılarda 9 ile biten ya da birbirine yakın sayı yok. 234 + 100 + 50 + 2 kolay.' },
  { t: '345 + 230', k: 'parca', why: '345 + 200 + 30 kolay; yuvarlamaya gerek yok.' },
  { t: '256 + 99', k: 'yuvarla', why: '99, 100’e çok yakın. 256 + 100 − 1 dene.' },
  { t: '148 + 199', k: 'yuvarla', why: '199 neredeyse 200. 148 + 200 − 1 kolay olmaz mı?' },
  { t: '372 − 98', k: 'yuvarla', why: '98, 100’e çok yakın. 372 − 100 = 272, sonra 2 fazla çıkardın: 2 ekle.' },
  { t: '403 − 398', k: 'tamamla', why: '398 ile 403 çok yakın. 398’den 403’e ileri say: 398 → 400 → 403.' },
  { t: '701 − 696', k: 'tamamla', why: '696’dan 701’e kaç adım? 696 → 700 → 701.' },
]

function SortTask({ onDone, last, grade }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const track = useTracker()
  const items = useStable(() => shuffle(grade >= 3 ? SORT3 : SORT2))
  const [where, setWhere] = useState<Record<number, Basket>>({})
  const complete = Object.keys(where).length === items.length
  const rules = ['Stratejiyi sayılara bakarak seçerim: 9’la ya da 8’le biten sayıda onluğa yuvarlama, birbirine yakın sayılarda tamamlama, diğerlerinde parçalama.']
  const dnd = useDnd((item, target) => {
    if (!BASKETS.some((x) => x.id === target)) return false
    const i = Number(item.slice(3))
    const it = items[i]
    if (it.k !== target) {
      const mis = it.k === 'tamamla' && target === 'parca' ? 'Yakın sayıların çıkarmasında ileri saymayı görmüyor' : it.k === 'yuvarla' ? 'Onluğa yakın sayıları fark etmiyor' : undefined
      return s.nudge(it.why, mis)
    }
    s.clear()
    sfx.ok()
    track.strategy(`${it.t}: ${BASKETS.find((x) => x.id === target)!.title}`)
    setWhere((w) => ({ ...w, [i]: target as Basket }))
  })
  return (
    <Split
      work={
        <Stage className="space-y-3 overflow-visible! p-3 sm:p-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {BASKETS.map((bk) => (
              <Drop key={bk.id} dnd={dnd} id={bk.id} className={`min-h-36 rounded-2xl border-2 border-dashed p-2 ${bk.tone}`}>
                <p className="text-center text-base font-black">{bk.title}</p>
                <p className="mb-1.5 text-center text-xs font-bold tabular-nums opacity-80">{bk.ex}</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {items.map((it, i) => (where[i] === bk.id ? <span key={i} className="rounded-lg bg-white px-2 py-1 text-base font-black text-ink tabular-nums ring-1 ring-black/5 animate-pop">{it.t}</span> : null))}
                </div>
              </Drop>
            ))}
          </div>
          {s.view('work')}
          {!complete && (
            <Sticky>
              <Tray title="İşlem kartları">
                {items.map((it, i) => (where[i] ? null : <Drag key={i} dnd={dnd} item={`it-${i}`} label={it.t} className="min-h-14 rounded-2xl bg-white px-3 text-2xl font-black text-ink tabular-nums shadow-[0_3px_0_#cbd5e1] ring-2 ring-line">{it.t}</Drag>))}
              </Tray>
            </Sticky>
          )}
        </Stage>
      }
      panel={
        <>
          <Prompt step={`${Object.keys(where).length} / ${items.length}`}>Her işlem kartına bak. Hangi stratejiyle <b>en kolay</b> çözersin? Kartı o sepete sürükle.</Prompt>
          {s.view('panel')}
          {complete && (
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

/* ───────────── 6. Kendi yolun ───────────── */

type Model = 'blocks' | 'chart' | 'line'
const MODELS: { id: Model; emoji: string; name: string }[] = [
  { id: 'blocks', emoji: '🧱', name: 'Taban blokları' },
  { id: 'chart', emoji: '🐸', name: 'Yüzlük tablo' },
  { id: 'line', emoji: '📏', name: 'Sayı doğrusu' },
]
const LABELS = ['✂️ Parçalama', '🎯 Onluğa yuvarlama', '🦘 Tamamlama', '💡 Başka bir yol']
interface Sol { model: Model; start: number; steps: Step[]; label: string; up: boolean }

function freeCards(a: number, b: number, add: boolean, up: boolean) {
  const T = Math.floor(b / 10) * 10, O = b % 10
  if (add) return uniq([1, 2, 3, 5, O, 10, T, T + 10, -1, -2])
  if (up) return upCards(a, b)
  return uniq([-1, -2, -3, -5, -O, -10, -T, -(T + 10), 1, 2])
}

function FreeTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const track = useTracker()
  const [add] = useState(() => Math.random() < 0.5)
  const [[a, b]] = useState(() => (add ? addPair() : subPair()))
  const ans = add ? a + b : a - b
  const [sols, setSols] = useState<Sol[]>([])
  const [model, setModel] = useState<Model | null>(null)
  const [up, setUp] = useState(false)
  const [label, setLabel] = useState<string | null>(null)
  const [star, setStar] = useState<number | null>(null)
  const mv = useMoves()
  const start = up ? b : a
  const goal = up ? a : ans
  const v = start + sumOf(mv.ms)
  const solved = model !== null && v === goal && (model !== 'blocks' || add || -sumOf(mv.ms) === b)
  const steps = stepsOf(start, mv.ms, model === 'blocks')
  const two = sols.length >= 2
  const rules = ['Aynı işlemi farklı modellerle ve farklı yollarla çözebilirim; hepsi aynı sonuca varır. Ben en kolay yolu seçerim.']
  const choose = (m: Model, fromB = false) => {
    setModel(m)
    setUp(fromB)
    mv.reset()
    s.clear()
  }
  const dnd = useDnd((item, target) => {
    if (item.startsWith('lab-')) {
      if (target !== 'yol' || !solved || label) return false
      const l = LABELS[Number(item.slice(4))]
      setLabel(l)
      track.strategy(`${a} ${add ? '+' : '−'} ${b}: ${l} (${MODELS.find((x) => x.id === model)!.name})`)
      sfx.ok()
      return
    }
    if (item === 'star') {
      if (!target.startsWith('sol-')) return false
      setStar(Number(target.slice(4)))
      sfx.ok()
      return
    }
    if (solved || !model) return false
    if (model === 'line') {
      if (target !== 'line') return false
      s.clear()
      mv.push({ d: Number(item.slice(2)) })
      return
    }
    if (model === 'blocks') {
      const m = blocksHandle(item, target, a, b, add, mv.ms, s.tell)
      if (!m) return false
      s.clear()
      mv.push(m)
      return
    }
    return false
  })
  useEffect(() => {
    if (solved) sfx.ok()
  }, [solved])
  const onChart = (to: number) => {
    if (solved) return
    const j = chartJump(v, to)
    if (typeof j === 'string') return void s.tell(j)
    if (j) {
      s.clear()
      mv.push({ d: j })
    }
  }
  const save = () => {
    setSols((x) => [...x, { model: model!, start, steps, label: label!, up }])
    setModel(null)
    setLabel(null)
    setUp(false)
    mv.reset()
  }
  const askStart = !add && model && model !== 'blocks'
  return (
    <Split
      work={
        <Stage className="space-y-3 overflow-visible! p-3 sm:p-4">
          <Problem a={a} b={b} op={add ? '+' : '−'} value={ans} done={solved || two} />
          {s.view('work')}
          {!two && (
            <div className="grid grid-cols-3 gap-2">
              {MODELS.map((m) => (
                <button key={m.id} type="button" onClick={() => choose(m.id)} aria-pressed={model === m.id} className={`flex min-h-16 flex-col items-center justify-center rounded-2xl px-2 py-1.5 text-sm font-black ring-2 transition ${model === m.id ? 'bg-violet-600 text-white ring-violet-700' : 'bg-white text-ink ring-line hover:bg-violet-50'}`}>
                  <span className="text-2xl leading-none">{m.emoji}</span>{m.name}
                </button>
              ))}
            </div>
          )}
          {askStart && !mv.ms.length && (
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-amber-50 p-2 ring-1 ring-amber-200">
              <span className="text-sm font-black text-amber-900">Nereden başlarsın?</span>
              <button type="button" onClick={() => choose(model!, false)} aria-pressed={!up} className={`min-h-12 rounded-xl px-3 text-sm font-black ring-2 ${!up ? 'bg-amber-500 text-white ring-amber-600' : 'bg-white ring-line'}`}>{ek(a, 'abl')} geri</button>
              <button type="button" onClick={() => choose(model!, true)} aria-pressed={up} className={`min-h-12 rounded-xl px-3 text-sm font-black ring-2 ${up ? 'bg-amber-500 text-white ring-amber-600' : 'bg-white ring-line'}`}>{ek(b, 'abl')} ileri 🦘</button>
            </div>
          )}
          {!two && model === 'blocks' && <BlocksModel start={a} b={b} ms={mv.ms} add={add} dnd={dnd} lock={solved} />}
          {!two && model === 'chart' && <Chart start={start} ms={mv.ms} onMove={onChart} lock={solved} target={up ? a : null} />}
          {!two && model === 'line' && <Line start={start} ms={mv.ms} dnd={dnd} target={up ? a : null} />}
          {!two && model && !solved && <Tools onUndo={() => { s.clear(); mv.undo() }} onReset={() => { s.clear(); mv.reset() }} disabled={!mv.ms.length} />}
          {!two && model === 'line' && !solved && <Sticky><JumpCards cards={freeCards(a, b, add, up)} dnd={dnd} /></Sticky>}
          {!two && model && !s.wide && <Strip start={start} steps={steps} />}
          {two && (
            <div className="grid gap-2 sm:grid-cols-2">
              {sols.map((x, i) => (
                <Drop key={i} dnd={dnd} id={`sol-${i}`} className={`rounded-2xl p-1 ${star === i ? 'bg-amber-100 ring-2 ring-amber-400' : ''}`}>
                  <Strip start={x.start} steps={x.steps} title={`${i + 1}. yol · ${MODELS.find((m) => m.id === x.model)!.emoji} ${x.label}${star === i ? ' ⭐' : ''}`} note={x.up ? <p className="mt-1.5 text-center text-sm font-black text-amber-800">Zıplamaların toplamı: {n(sumOf(x.steps.map((st) => ({ d: st.d }))))}</p> : undefined} />
                </Drop>
              ))}
            </div>
          )}
        </Stage>
      }
      panel={
        <>
          <Prompt step={two ? 'Karşılaştır' : `${sols.length + 1}. yol`}>
            {two ? <>İki yolun da {n(ans)} buldu. Hangisi sana daha kolay geldi? ⭐ kartını o yola sürükle.</> : sols.length ? <>Şimdi <b>başka bir model</b> ya da <b>başka bir yol</b> seç ve yeniden çöz.</> : <>Bir model seç ve <b>{n(a)} {add ? '+' : '−'} {n(b)}</b> işlemini kendi yolunla çöz.</>}
          </Prompt>
          {s.view('panel')}
          {!two && model && s.wide && <Strip start={start} steps={steps} />}
          {!two && solved && (
            <Reveal>
              <Win><p className="text-xl font-black tabular-nums">{up ? `${n(b)} → ${n(a)}: zıplamaların toplamı ${n(ans)}` : chainOf(start, steps)}</p></Win>
              <Card>
                <p className="mb-2 font-extrabold">Yolunun adı ne? Bir kartı “Benim yolum” kutusuna sürükle.</p>
                <Drop dnd={dnd} id="yol" className={`mb-2 grid min-h-14 place-items-center rounded-2xl border-2 border-dashed px-3 ${label ? 'border-emerald-400 bg-emerald-50' : 'border-sky-400 bg-sky-50'}`}>
                  {label ? <span className="text-base font-black text-emerald-800 animate-pop">Benim yolum: {label}</span> : <span className="text-sm font-black text-sky-600">Benim yolum</span>}
                </Drop>
                {!label && <div className="flex flex-wrap gap-2">{LABELS.map((l, i) => <Drag key={l} dnd={dnd} item={`lab-${i}`} label={l} className="min-h-12 rounded-2xl bg-white px-3 text-sm font-black text-ink shadow-[0_3px_0_#cbd5e1] ring-2 ring-line">{l}</Drag>)}</div>}
              </Card>
              {label && <NextProblem onClick={save}>{sols.length === 0 ? 'Başka bir yoldan çöz' : 'İki yolu karşılaştır'}</NextProblem>}
            </Reveal>
          )}
          {two && star === null && (
            <Sticky>
              <Tray title="Daha kolay olan yola sürükle">
                <Drag dnd={dnd} item="star" label="Yıldız kartı" className="grid size-16 place-items-center rounded-2xl bg-amber-400 text-3xl shadow-[0_3px_0_#b45309] ring-2 ring-amber-500">⭐</Drag>
              </Tray>
            </Sticky>
          )}
          {two && star !== null && (
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
        <p className="mt-3 text-sm font-bold text-amber-900">Bu stratejileri bloklarla, yüzlük tabloda ve sayı doğrusunda zıplayarak kendin buldun.</p>
      </div>
      <div className="mt-4"><NextButton last onClick={onFinish} /></div>
    </div>
  )
}

