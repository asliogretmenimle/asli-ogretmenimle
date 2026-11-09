import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, BookOpen } from 'lucide-react'
import type { InteractionProps } from '../types'
import { Scene } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { sfx } from '../../lib/feedback'
import { useTracker } from '../../lib/trackerContext'
import { Header, NextButton, Nudge, Prompt, Split, Stage, useChecks } from '../donusum-studyosu/ortak'
import { Drag, DragAsk, HowTo, RulesFound, TOKEN, Tray, useDnd, type Ask, type Tool, type ToolInfo } from '../sayilari-karsilastir/parts'
import {
  DOT, Frames, Gone, Rows, Sentence, Sources, Story, Strip, TOOL, Tools,
  answerOf, builtOf, cardsFor, chainOf, gen, make, missOf, overOf, run, sentenceOf, stepsOf, usePlayer,
  type Col, type Ev, type Kind, type Prob, type Unk,
} from './tuval'

/**
 * 88. Pullarla Problem Çözme (1–2. sınıf, 20’ye kadar toplama ve çıkarma problemleri)
 * Kısa, resimli (emoji) hikâyeler iki onluk çerçeve ve iki renkli sayma pullarıyla modellenir. Her şey
 * sürükle-bırak: pul yığından kalkar, parmağı izler, çerçevenin gözüne oturur; çerçeveden “Gidenler”e
 * sürüklenen pul ayrılır; karşılaştırmada bir sıranın pulu öbür sıraya sürüklenince çift olur.
 * Çocuğun her hareketi yandaki çözüm adımları şeridine yazılır (8 🔴 → 2 🟡 ile çerçeve doldu → 3 🟡 daha:
 * 8 + 2 + 3 = 10 + 3 = 13); “Adımları izle” tuvali adım adım yeniden oynatır. İşlem cümlesinin kutuları
 * pullar kondukça dolar, cevap sayı kartı sürüklenerek verilir.
 *  1. Gelenler (birleştirme): 1. sınıfta sonuç bilinmeyen; 2. sınıfta değişim ve başlangıç bilinmeyen de
 *  2. Gidenler (ayırma): pulları Gidenler’e sürükleyerek; 2. sınıfta kaç gitti / başta kaç vardı
 *  3. Kimin kaç fazla? (karşılaştırma): iki sırayı bire bir eşleyip eşi olmayanları sayma; 2. sınıfta “kaç eksik” ve büyük miktar bilinmeyen
 *  4. Karışık hikâyeler: önce işaret kartı (+ ya da −), sonra model ve cevap
 *  5. Can’ın adımları: başkasının çözüm şeridini izleyip hangi hikâyeyi çözdüğünü bulma
 *  Son: kural defteri
 */

type Done = (first: boolean, rules: string[]) => void
type Say = { q: string; mis?: string; k: number } | null

const TASKS: { emoji: string; title: string; goal: string; tools: (Tool | ToolInfo)[] }[] = [
  { emoji: '🐦', title: 'Gelenler', goal: 'Hikâyeyi pullarla göstermek: baştakiler 🔴, gelenler 🟡. Çerçeveyi doldurunca 10’u görmek.', tools: [TOOL.src, TOOL.frame, TOOL.strip, TOOL.card, TOOL.undo] },
  { emoji: '🎈', title: 'Gidenler', goal: 'Baştakileri çerçeveye koymak, gidenleri çerçeveden çıkarmak ve kalanı bulmak.', tools: [TOOL.src, TOOL.take, TOOL.strip, TOOL.card, TOOL.undo] },
  { emoji: '⚖️', title: 'Kimin kaç fazla?', goal: 'İki sırayı bire bir eşlemek. Eşi olmayan pullar aradaki farkı gösterir.', tools: [TOOL.src, TOOL.pair, TOOL.strip, TOOL.card, TOOL.undo] },
  { emoji: '🔀', title: 'Karışık hikâyeler', goal: 'Hikâye gelenleri mi, gidenleri mi, karşılaştırmayı mı anlatıyor? İşareti seçip pullarla çözmek.', tools: [TOOL.sign, TOOL.src, TOOL.take, TOOL.pair, TOOL.card] },
  { emoji: '🎬', title: 'Can’ın adımları', goal: 'Can’ın çözüm adımlarını izleyip hangi hikâyeyi çözdüğünü bulmak.', tools: [TOOL.strip, 'answer'] },
]

/** Görev ve sınıfa göre problem türleri */
function plan(task: number, grade: number): [Kind, Unk][] {
  const g2 = grade >= 2
  if (task === 0) return g2 ? [['join', 'res'], ['join', 'chg'], ['join', 'start']] : [['join', 'res'], ['join', 'res']]
  if (task === 1) return g2 ? [['sep', 'res'], ['sep', 'chg'], ['sep', 'start']] : [['sep', 'res'], ['sep', 'res']]
  if (task === 2) return g2 ? [['cmp', 'more'], ['cmp', 'less'], ['cmp', 'big']] : [['cmp', 'more'], ['cmp', 'more']]
  const pool: [Kind, Unk][] = g2
    ? [['join', Math.random() < 0.5 ? 'chg' : 'res'], ['sep', Math.random() < 0.5 ? 'start' : 'res'], ['cmp', Math.random() < 0.5 ? 'less' : 'more']]
    : [['join', 'res'], ['sep', 'res'], ['cmp', 'more']]
  const order = [0, 1, 2].sort(() => Math.random() - 0.5)
  return order.map((i) => pool[i])
}

const RULES: Record<number, (g2: boolean) => string[]> = {
  0: (g2) => [
    'Gelenler olunca sayı artar: baştakilere gelenleri eklerim. Önce çerçeveyi 10’a tamamlarsam kolay sayarım: 8 + 5 = 8 + 2 + 3 = 10 + 3 = 13.',
    ...(g2 ? ['Kaç tane geldiğini bilmiyorsam, sonuca ulaşana kadar pul eklerim; eklediğim 🟡 pullar cevaptır.'] : []),
  ],
  1: (g2) => [
    'Gidenler olunca sayı azalır: baştakilerden gidenleri çıkarırım. Önce 10’a inersem kolay: 13 − 5 = 13 − 3 − 2 = 10 − 2 = 8.',
    ...(g2 ? ['Başta kaç olduğunu bilmiyorsam, kalanlarla gidenleri birleştiririm.'] : []),
  ],
  2: (g2) => [
    'Karşılaştırırken iki sırayı bire bir eşlerim. Eşi olmayan pullar farkı gösterir: 9 − 6 = 3.',
    ...(g2 ? ['“Kaç fazla?” ile “kaç eksik?” aynı farkı sorar: 9, 6’dan 3 fazla; 6, 9’dan 3 eksik.'] : []),
  ],
  3: () => ['Önce hikâyeyi dinlerim: gelenler varsa +, gidenler varsa −; karşılaştırmada farkı bulurum.'],
  4: () => ['Çözüm adımları bir hikâye anlatır: adımları okuyunca hangi problemin çözüldüğünü anlarım.'],
}

export default function ToplamaCikarmaHikayeleri({ grade, onFinish }: InteractionProps) {
  const [idx, setIdx] = useState(0)
  const [rules, setRules] = useState<string[]>([])
  const [help, setHelp] = useState(true)
  const firsts = useRef<boolean[]>([])
  const end = idx >= TASKS.length
  const t = TASKS[Math.min(idx, TASKS.length - 1)]
  const last = idx === TASKS.length - 1
  const g2 = grade >= 2

  const done: Done = (first, r) => {
    firsts.current[idx] = first
    setRules((old) => [...old, ...r.filter((x) => !old.includes(x))])
    setIdx(idx + 1)
    setHelp(false)
  }
  const finish = () =>
    onFinish({
      stars: starsFor(firsts.current.filter(Boolean).length / TASKS.length),
      summary: `${TASKS.length} görevde birleştirme, ayırma ve karşılaştırma hikâyelerini onluk çerçeve ve pullarla adım adım çözdün; ${rules.length} kuralı kendin buldun.`,
      insight: 'Gelenler sayıyı artırır (+), gidenler azaltır (−), karşılaştırmada iki sıra eşlenir ve eşi olmayanlar farkı verir. Onluk çerçeveyi önce 10’a tamamlamak saymayı kolaylaştırır: 8 + 5 = 10 + 3 = 13.',
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
      ) : idx < 4 ? (
        <StoryTask key={idx} task={idx} rules={RULES[idx](g2)} {...props} />
      ) : (
        <StepsQuiz key={idx} rules={RULES[4](g2)} {...props} />
      )}
    </Scene>
  )
}

interface TaskProps { onDone: Done; last: boolean; grade: number; rules: string[] }

/* ───────────── yardımcılar (farkli-cozumleme ile aynı davranış) ───────────── */

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

/** Görev içi düşündüren soru. nudge deneme sayacına yazar; tell yalnızca yol gösterir. */
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

/* ───────────── 1–4. Hikâye görevleri ───────────── */

function hintFor(p: Prob): ReactNode {
  if (p.kind === 'join') {
    if (p.unk === 'res') return <>Baştakileri <b>🔴</b>, gelenleri <b>🟡</b> pulla çerçeveye sürükle. Sonra cevap kartını <b>?</b> kutusuna bırak.</>
    if (p.unk === 'chg') return <>Önce <b>{p.a} 🔴</b> koy. Sonra <b>{p.c}</b> olana kadar <b>🟡</b> ekle. Kaç 🟡 koydun?</>
    return <>Gelenleri <b>{p.b} 🟡</b> pulla koy. Sonra <b>{p.c}</b> olana kadar <b>🔴</b> ekle. Kaç 🔴 koydun?</>
  }
  if (p.kind === 'sep') {
    if (p.unk === 'res') return <>Baştakileri çerçeveye koy. Gidenleri çerçeveden <b>👋 Gidenler</b>’e sürükle.</>
    if (p.unk === 'chg') return <>Önce <b>{p.a}</b> pul koy. Çerçevede <b>{p.c}</b> pul kalana kadar <b>👋 Gidenler</b>’e sürükle.</>
    return <>Çerçevede <b>{p.c}</b> pul kalmalı, <b>👋 Gidenler</b>’de <b>{p.b}</b> pul olmalı. Nasıl yaparsın?</>
  }
  if (p.unk === 'big') return <>{p.names[1]} sırasına <b>{p.b} 🟡</b> koy. {p.names[0]} sırasına 🔴 koy, çift yap. {p.names[0]} sırasında <b>{p.c}</b> pulun eşi olmamalı.</>
  return <>Herkesin pulunu kendi sırasına koy. Sonra bir sıranın pulunu tutup öbür sıraya sürükle: <b>çift</b> olur.</>
}

function StoryTask({ task, onDone, last, grade, rules }: TaskProps & { task: number }) {
  const checks = useChecks()
  const s = useSay(checks)
  const track = useTracker()
  const probs = useMemo(() => {
    const used = new Set<string>()
    return plan(task, grade).map(([k, u]) => make(k, u, grade, used))
  }, [task, grade])
  const signSlot = task === 3
  const [pi, setPi] = useState(0)
  const [acts, setActs] = useState<Ev[][]>([])
  const [answer, setAnswer] = useState<number | null>(null)
  const [sign, setSign] = useState<string | null>(null)
  const [wrongAt, setWrongAt] = useState<'ans' | 'sign' | null>(null)
  const p = probs[pi]
  const mode = p.kind === 'cmp' ? 'cmp' : 'frame'
  const evs = acts.flat()
  const now = run(evs)
  const steps = stepsOf(evs, mode, p.names)
  const player = usePlayer(steps)
  const st = player.end === null ? now : run(evs.slice(0, player.end))
  const built = builtOf(p, now)
  const over = overOf(p, now)
  const solved = answer !== null
  const allDone = solved && pi === probs.length - 1
  const sen = sentenceOf(p)

  const push = (e: Ev[]) => {
    s.clear()
    setWrongAt(null)
    setActs((a) => [...a, e])
  }

  const dnd = useDnd((item, target) => {
    if (player.play !== null || solved) return false
    if (item.startsWith('src-')) {
      const [, c, k] = item.split('-') as [string, Col, string]
      const n = Number(k)
      if (mode === 'frame') {
        if (target !== 'board') return false
        if (now.cells.length >= 20) return s.tell('İki çerçeve de doldu: 20 pul.')
        if (now.cells.length + n > 20) return s.tell(`Çerçevelerde ${20 - now.cells.length} boş göz kaldı. Pulları tek tek koy.`)
        if (p.kind === 'join' && p.unk !== 'start' && c === 'y' && now.a < p.a) return s.tell(`Önce baştakileri koy: ${p.a} ${p.noun}, ${p.a} tane 🔴. 🟡 pullar gelenler.`)
      } else {
        if (target !== 'rowA' && target !== 'rowB') return false
        const want: Col = target === 'rowA' ? 'r' : 'y'
        if (c !== want) return s.tell(`${p.names[want === 'r' ? 0 : 1]} sırasının pulları ${want === 'r' ? '🔴 kırmızı' : '🟡 sarı'}.`)
        const cnt = c === 'r' ? now.a : now.b
        if (cnt + n > 10) return s.tell(cnt >= 10 ? 'Bu sırada boş yer kalmadı.' : `Bu sırada ${10 - cnt} boş yer kaldı. Pulları tek tek koy.`)
      }
      push(Array.from({ length: n }, () => ({ k: 'put', c }) as Ev))
      return
    }
    if (item === 'board') {
      if (target !== 'gone') return false
      push([{ k: 'take' }])
      return
    }
    if (item === 'rowA' || item === 'rowB') {
      if (target !== (item === 'rowA' ? 'rowB' : 'rowA')) return false
      if (now.pairs >= Math.min(now.a, now.b)) return s.tell(now.a === now.b ? 'Bütün pullar eşlendi.' : 'Öbür sırada eşi olmayan pul kalmadı. Eşi olmayan pullar parlıyor: kaç tane?')
      push([{ k: 'pair' }])
      return
    }
    if (item.startsWith('sign-')) {
      if (target !== 'sign') return false
      if (item.slice(5) !== sen.sign) {
        setWrongAt('sign')
        const q = p.kind === 'join' ? `Hikâyede ${p.noun} ${p.verb}. Gelenler olunca sayı artar mı, azalır mı?` : p.kind === 'sep' ? `Hikâyede ${p.noun} ${p.verb}. Gidenler olunca sayı artar mı, azalır mı?` : p.unk === 'big' ? `${gen(p.names[0])} ${p.c} fazla ${p.poss} var. ${gen(p.names[1])} sayısına ${p.c} eklersek mi, çıkarırsak mı ${gen(p.names[0])} sayısını buluruz?` : 'Büyük sayıdan küçüğü çıkarınca aradaki fark kalır. Toplarsak iki sıranın hepsini buluruz.'
        return s.nudge(q, 'İşlem türünü problemin yapısıyla ilişkilendiremiyor')
      }
      s.clear()
      setWrongAt(null)
      sfx.ok()
      setSign(sen.sign)
      return
    }
    if (item.startsWith('num-')) {
      if (target !== 'ans') return false
      const v = Number(item.slice(4))
      if (signSlot && !sign) return s.tell('Önce işaret kartını (+ ya da −) cümledeki boş kutuya sürükle.')
      if (!built) return s.tell('Önce hikâyeyi pullarla göster. İşlem cümlesinin kutuları yeşil olunca cevabı sürükle.')
      if (v !== answerOf(p)) {
        setWrongAt('ans')
        const m = missOf(p, v)
        return s.nudge(m.q, m.mis)
      }
      s.clear()
      setWrongAt(null)
      sfx.ok()
      track.attempt(true)
      const ten = steps.some((x) => x.ten)
      if (mode === 'frame') track.strategy(ten ? (p.kind === 'join' ? 'Onluğu tamamlayarak topladı' : '10’a inerek çıkardı') : 'Pulları tek tek saydı')
      setAnswer(v)
      return
    }
    return false
  })

  const next = () => {
    player.stop()
    setPi(pi + 1)
    setActs([])
    setAnswer(null)
    setSign(null)
    setWrongAt(null)
    s.clear()
  }

  const nums = sen.nums.map((v, i) => (i === sen.unknown ? '?' : v))
  const doneText = `${sen.nums[0]} ${sen.sign} ${sen.nums[1]} = ${sen.nums[2]}`
  const tray = !solved && (built || (signSlot && !sign)) ? (
    <Tray title={signSlot && !sign ? 'İşaret kartları' : 'Sayı kartları: cevabı ? kutusuna sürükle'}>
      {signSlot && !sign
        ? ['+', '−'].map((g) => <Drag key={g} dnd={dnd} item={`sign-${g}`} label={`${g} işareti`} className={`${TOKEN} min-w-16 text-3xl`}>{g}</Drag>)
        : cardsFor(p).map((v) => <Drag key={v} dnd={dnd} item={`num-${v}`} label={`${v} kartı`} className={`${TOKEN} min-w-16 text-3xl`}>{v}</Drag>)}
    </Tray>
  ) : null
  const strip = <Strip steps={steps} play={player.play} onPlay={player.start} chain={mode === 'frame' && built ? chainOf(steps) : null} />
  const board = mode === 'frame' ? (
    <div className={`grid items-start gap-2 ${p.kind === 'sep' ? 'sm:grid-cols-[auto_minmax(0,1fr)_auto]' : 'sm:grid-cols-[auto_minmax(0,1fr)]'}`}>
      <Sources dnd={dnd} disabled={solved || player.play !== null} colors={p.kind === 'sep' ? ['r'] : ['r', 'y']} />
      <Frames st={st} dnd={dnd} take={p.kind === 'sep'} lock={solved || player.play !== null} />
      {p.kind === 'sep' && <Gone st={st} dnd={dnd} />}
    </div>
  ) : (
    <div className="grid items-start gap-2 sm:grid-cols-[auto_minmax(0,1fr)]">
      <Sources dnd={dnd} disabled={solved || player.play !== null} colors={['r', 'y']} names={p.names} />
      <Rows st={st} dnd={dnd} names={p.names} lock={solved || player.play !== null} />
    </div>
  )

  return (
    <Split
      work={
        <Stage className="space-y-3 overflow-visible! p-3 sm:p-4">
          <Story key={pi} p={p} />
          <Sentence p={p} st={now} dnd={dnd} answer={answer} sign={sign} signSlot={signSlot} built={built} wrongAt={wrongAt} />
          {s.view('work')}
          {board}
          {over && !solved && <p className="rounded-xl bg-amber-50 px-3 py-2 text-center text-sm font-extrabold text-amber-900 ring-1 ring-amber-200 animate-fade-up">{over}</p>}
          {!solved && <Tools onUndo={() => { s.clear(); setActs((a) => a.slice(0, -1)) }} onReset={() => { s.clear(); setActs([]) }} disabled={!acts.length || player.play !== null} />}
          {!s.wide && strip}
          {!s.wide && tray && <Sticky>{tray}</Sticky>}
        </Stage>
      }
      panel={
        <>
          <Prompt step={`Hikâye ${pi + 1} / ${probs.length}`}>
            {signSlot && !sign ? <>Hikâye gelenleri mi, gidenleri mi, karşılaştırmayı mı anlatıyor? <b>+</b> ya da <b>−</b> kartını cümledeki boş kutuya sürükle.</> : hintFor(p)}
          </Prompt>
          {s.view('panel')}
          {s.wide && strip}
          {built && !solved && <p className="rounded-2xl bg-sky-50 px-4 py-2.5 text-[15px] font-black text-sky-900 ring-1 ring-sky-200 animate-fade-up">Model hazır! Kaç? Sayı kartını <b>?</b> kutusuna sürükle.</p>}
          {s.wide && tray}
          {solved && (
            <Reveal>
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-900 ring-2 ring-emerald-400 animate-pop">
                <p className="text-2xl font-black tabular-nums">{doneText} {p.emoji}</p>
                <p className="text-sm font-extrabold">{p.kind === 'cmp' ? 'Eşi olmayan pullar cevabı gösterdi.' : 'Adımların cevaba götürdü.'} İstersen <b>Adımları izle</b>.</p>
              </div>
              {allDone ? (
                <>
                  <RulesFound rules={rules} />
                  <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
                </>
              ) : (
                <button type="button" onClick={next} className="btn-primary min-h-14 w-full text-lg animate-fade-up">Sonraki hikâye <ArrowRight size={20} /></button>
              )}
            </Reveal>
          )}
          <p className="sr-only">İşlem: {nums.join(' ')}</p>
        </>
      }
    />
  )
}

/* ───────────── 5. Can’ın adımları ───────────── */

const put = (c: Col, n: number): Ev[] => Array.from({ length: n }, () => ({ k: 'put', c }))
const take = (n: number): Ev[] => Array.from({ length: n }, () => ({ k: 'take' }))
const pair = (n: number): Ev[] => Array.from({ length: n }, () => ({ k: 'pair' }))

const QUIZ: { evs: Ev[]; mode: 'frame' | 'cmp'; names?: [string, string]; ask: Ask; ok: string }[] = [
  {
    evs: [...put('r', 7), ...put('y', 7)],
    mode: 'frame',
    ask: {
      q: 'Can bu adımlarla hangi hikâyeyi çözdü?',
      options: [
        { label: '🐦 Dalda 7 kuş var. 7 kuş daha geldi.', ok: true },
        { label: '🐦 Dalda 7 kuş var. 4 kuş daha geldi.', nudge: 'Can kaç 🟡 koydu? 2. ve 3. adımdaki sarıları birlikte say: 3 + 4.', mis: 'Adımlardaki son parçayı bütün değişim sanıyor' },
        { label: '🐦 Dalda 14 kuş var. 7 kuş uçtu.', nudge: 'Can pul koydu mu, çıkardı mı? Adımlarda “gitti” yazıyor mu?' },
      ],
    },
    ok: 'Evet! 7 + 3 + 4 = 10 + 4 = 14. Can önce çerçeveyi 10’a tamamladı.',
  },
  {
    evs: [...put('r', 15), ...take(8)],
    mode: 'frame',
    ask: {
      q: 'Can bu adımlarla hangi hikâyeyi çözdü?',
      options: [
        { label: '🍎 Sepette 15 elma var. 8 elma yendi.', ok: true },
        { label: '🍎 Sepette 15 elma var. 3 elma yendi.', nudge: 'Kaç pul gitti? 2. adımda 5, 3. adımda 3 pul gitti. Hepsi kaç?', mis: 'Adımlardaki son parçayı bütün değişim sanıyor' },
        { label: '🍎 Sepette 7 elma var. 8 elma daha geldi.', nudge: 'Can ilk adımda kaç pul koydu? Sonra pul ekledi mi, çıkardı mı?' },
      ],
    },
    ok: 'Doğru! 15 − 5 − 3 = 10 − 3 = 7. Can önce 10’a indi.',
  },
  {
    evs: [...put('r', 8), ...put('y', 5), ...pair(5)],
    mode: 'cmp',
    names: ['Ali', 'Ece'],
    ask: {
      q: 'Can bu adımlarla hangi soruyu çözdü?',
      options: [
        { label: '⚽ Ali’nin 8, Ece’nin 5 topu var. Ali’nin kaç fazla topu var?', ok: true },
        { label: '⚽ Ali’nin 8 topu var. Ece 5 top daha getirdi. Kaç top oldu?', nudge: 'Can pulları birleştirdi mi, yoksa çift mi yaptı? Çift yapınca neyi buluruz?', mis: 'Karşılaştırma ile birleştirmeyi karıştırıyor' },
        { label: '⚽ Ali’nin 3, Ece’nin 5 topu var.', nudge: 'Can’ın tuvalinde Ali’nin sırasında kaç pul var?' },
      ],
    },
    ok: 'Evet! 5 çift oldu, 3 pulun eşi yok: 8 − 5 = 3.',
  },
]

function StepsQuiz({ onDone, last, grade, rules }: TaskProps) {
  const checks = useChecks()
  const n = grade >= 2 ? QUIZ.length : 2
  const [k, setK] = useState(0)
  const done = k >= n
  const q = QUIZ[Math.min(k, n - 1)]
  const steps = stepsOf(q.evs, q.mode, q.names)
  const player = usePlayer(steps)
  const st = run(player.end === null ? q.evs : q.evs.slice(0, player.end))
  const dnd = useDnd(() => false)
  const start = player.start
  useEffect(() => {
    const id = window.setTimeout(start, 700)
    return () => window.clearTimeout(id)
    // her yeni soruda bir kez kendiliğinden oynasın
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k])
  return (
    <Split
      work={
        <Stage className="space-y-3 overflow-visible! p-3 sm:p-4">
          <p className="text-center text-lg font-black text-ink">🧒 Can’ın tuvali</p>
          <div key={k} className="pointer-events-none">
            {q.mode === 'frame' ? (
              <div className={`grid items-start gap-2 ${q.evs.some((e) => e.k === 'take') ? 'sm:grid-cols-[minmax(0,1fr)_auto]' : ''}`}>
                <Frames st={st} dnd={dnd} lock />
                {q.evs.some((e) => e.k === 'take') && <Gone st={st} dnd={dnd} />}
              </div>
            ) : (
              <Rows st={st} dnd={dnd} names={q.names!} lock />
            )}
          </div>
          <Strip steps={steps} play={player.play} onPlay={player.start} chain={q.mode === 'frame' ? chainOf(steps) : null} />
        </Stage>
      }
      panel={
        <>
          <Prompt step={done ? 'Tamam' : `Soru ${k + 1} / ${n}`}>{done ? 'Adımları okuyarak çözümü takip ettin.' : <>Can’ın adımlarını izle. Sonra doğru hikâye kartını sürükle. {DOT.r} {DOT.y}</>}</Prompt>
          {!done && <Reveal key={k}><DragAsk checks={checks} ask={q.ask} okText={q.ok} onOk={() => setK(k + 1)} /></Reveal>}
          {done && (
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
        <p className="mt-3 text-sm font-bold text-amber-900">Bu kuralları pulları koyup çıkararak, eşleyerek kendin buldun.</p>
      </div>
      <div className="mt-4"><NextButton last onClick={onFinish} /></div>
    </div>
  )
}
