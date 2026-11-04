import { useEffect, useRef, useState, type ReactNode } from 'react'
import { BookOpen, Check, RotateCcw } from 'lucide-react'
import type { InteractionProps } from '../types'
import { Scene } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { sfx } from '../../lib/feedback'
import { Card, Header, NextButton, Nudge, Prompt, Split, Stage, useChecks } from '../donusum-studyosu/ortak'
import { Drag, DragAsk, Drop, HowTo, RulesFound, TOKEN, Tray, n, useDnd, type Tool, type ToolInfo } from '../sayilari-karsilastir/parts'
import { COL, EMPTY, Mat, MiniBlocks, PartsBox, START, TARGET, TOOL, colName, keyOf, sumText, tryMove, valueOf, words, type Counts } from './tuval'

/**
 * 87. Bir Sayı, Birçok Çözümleme (4–5. sınıf, MAT.5.1.1 doğal sayıları okuma ve yazma)
 * “254 = 2 yüzlük, 5 onluk, 4 birlik. Peki başka nasıl olabilir?” Çocuk sayıyı tek bir prototip çözümlemeyle
 * değil, onluk taban bloklarını bozup birleştirerek farklı biçimlerde çözümler. Baştan sona sürükle-bırak
 * (Polypad gibi: blok kalkar, parmağı izler, hedefe oturur ya da geri uçar); her görevin üstünde amaç ve
 * “Nasıl kullanılır?” kartı vardır.
 *  1. 254’ü parça kutusundan kur; bir yüzlüğü, sonra bir onluğu boz: bloklar değişir, sayı hep 254
 *  2. Hedef çözümlemeler: 25 onluk + 4 birlik, 2 yüzlük + 54 birlik, 24 onluk + 14 birlik (bulunan her yeni çözümleme deftere yazılır)
 *  3. Eksik parça: sayı kartını çözümlemedeki boş kutuya sürükle
 *  4. 254 eder mi? Çözümleme kartlarını iki sepete ayır
 *  5. Büyük sayılara: 254’te kaç onluk var (yüzlükleri bozup say), 4.508.120’de kaç bin var?
 *  Tablet için: blok yığınının tamamı tek, büyük tutma alanıdır; sürüklerken ekran kenarında sayfa kayar;
 *  dar ekranda yeni çıkan soru kendiliğinden görünür alana kaydırılır.
 *  Son: kural defteri
 */

type Done = (first: boolean, rules: string[]) => void
type Say = { q: string; mis?: string; k: number } | null

const TASKS: { emoji: string; title: string; goal: string; tools: (Tool | ToolInfo)[] }[] = [
  { emoji: '🔨', title: '254’ü kur, sonra boz', goal: '254’ü bloklarla kurmak; sonra bir yüzlüğü 10 onluğa, bir onluğu 10 birliğe bozunca blokların değiştiğini ama sayının hep 254 kaldığını görmek.', tools: [TOOL.box, TOOL.break, 'answer'] },
  { emoji: '🎯', title: '254’ün başka kılıkları', goal: 'Blokları bozup birleştirerek 254’ü üç farklı biçimde çözümlemek; her yeni çözümleme deftere yazılır.', tools: [TOOL.break, TOOL.join, TOOL.reset, 'answer'] },
  { emoji: '🧩', title: 'Eksik parçayı bul', goal: 'Bilinen parçaların değerinden yola çıkarak çözümlemedeki eksik sayıyı bulmak.', tools: [TOOL.card] },
  { emoji: '🧺', title: '254 eder mi?', goal: 'Her çözümleme kartının değerini hesaplayıp 254 edenleri ve etmeyenleri ayırmak.', tools: [TOOL.sort] },
  { emoji: '🔭', title: 'Büyük sayılarda da aynı fikir', goal: 'Basamaktaki rakam ile sayıda o birimden kaç tane olduğunu ayırt etmek ve bunu milyonlu sayılara taşımak.', tools: ['answer'] },
]

export default function FarkliCozumleme({ grade, onFinish }: InteractionProps) {
  const [idx, setIdx] = useState(0)
  const [rules, setRules] = useState<string[]>([])
  /** İlk görevde açık gelir; sonra başlıktaki “?” ile açılır */
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
      summary: `${TASKS.length} görevde 254’ü taban bloklarıyla bozup birleştirerek farklı biçimlerde çözümledin; ${rules.length} kuralı kendin buldun.`,
      insight: 'Bir sayının tek bir çözümlemesi yoktur: 254 = 2 yüzlük + 5 onluk + 4 birlik = 25 onluk + 4 birlik = 2 yüzlük + 54 birlik. Bozmak ve birleştirmek değeri değiştirmez. 254’ün onlar basamağında 5 vardır ama 254’te 25 onluk vardır.',
    })

  const props = { onDone: done, last }
  return (
    <Scene grade={grade}>
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
        <BreakTask key={idx} {...props} />
      ) : idx === 1 ? (
        <TargetsTask key={idx} {...props} />
      ) : idx === 2 ? (
        <MissingTask key={idx} {...props} />
      ) : idx === 3 ? (
        <SortTask key={idx} {...props} />
      ) : (
        <BigTask key={idx} {...props} />
      )}
    </Scene>
  )
}

interface TaskProps { onDone: Done; last: boolean }

/** Görev içi düşündüren soru. nudge deneme sayacına yazar; tell yalnızca yol gösterir (keşifte serbest deneme cezalanmaz). */
function useSay(checks: ReturnType<typeof useChecks>) {
  const [say, setSay] = useState<Say>(null)
  const [wrong, setWrong] = useState<number | null>(null)
  const show = (q: string, opts: { mis?: string; at?: number }) => {
    setWrong(opts.at ?? null)
    setSay((s) => ({ q, mis: opts.mis, k: (s?.k ?? 0) + 1 }))
    /** sürükle-bırakta bırakmayı reddeder: kart yerine geri uçar */
    return false as const
  }
  return {
    clear() {
      setSay(null)
      setWrong(null)
    },
    wrong,
    nudge(q: string, opts: { mis?: string; at?: number } = {}) {
      checks.fail()
      return show(q, opts)
    },
    tell: (q: string, opts: { mis?: string; at?: number } = {}) => show(q, opts),
    view: () => (say ? <Nudge key={say.k} question={say.q} misconception={say.mis} /> : null),
  }
}

/** Tuvalin üstündeki eşitlik: blok sayıları, değerleri ve hep aynı kalan toplam */
function Equation({ counts, flash }: { counts: Counts; flash?: boolean }) {
  return (
    <div className={`rounded-2xl bg-white px-3 py-2 text-center ring-1 ring-line ${flash ? 'animate-pop' : ''}`}>
      <p className="text-lg leading-snug font-black text-ink sm:text-xl">{words(counts)}</p>
      <p className="text-sm font-extrabold text-ink-soft tabular-nums">{sumText(counts)} = <b className="text-2xl text-emerald-700">{n(valueOf(counts))}</b></p>
    </div>
  )
}

/**
 * Dar ekranda (tablet dikey, telefon) panel tuvalin altına iner: yeni çıkan soru ya da düğme
 * görünür alanda değilse kendiliğinden oraya kaydırılır.
 */
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

/* ───────────── 1. Kur ve boz ───────────── */

function BreakTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const [counts, setCounts] = useState<Counts>(EMPTY)
  const [phase, setPhase] = useState<'build' | 'h' | 'ask1' | 'o' | 'ask2' | 'done'>('build')
  const rules = ['Bir bloğu bozmak sayının değerini değiştirmez, yalnızca çözümlemesini değiştirir: 2 yüzlük + 5 onluk + 4 birlik = 1 yüzlük + 15 onluk + 4 birlik = 254.']
  const want = phase === 'h' ? 2 : phase === 'o' ? 1 : null

  /** Kurma: parça kutusundan sütuna, fazlasını sütundan kutuya */
  const build = (item: string, target: string) => {
    const [kind, raw] = item.split('-')
    const e = Number(raw)
    const c = counts.slice()
    if (kind === 'src') {
      if (!target.startsWith('col-')) return false
      const to = Number(target.slice(4))
      if (to !== e) return s.tell(`Bu bir ${COL[e].unit} ${COL[e].shape}: ${colName(e)} sütununa bırak.`, { at: to })
      if (c[e] >= 12) return s.tell(`${COL[e].name} sütununda zaten ${c[e]} blok var. 254’te kaç ${COL[e].unit} olmalı? Fazlasını parça kutusuna geri sürükle.`, { at: e })
      c[e]++
    } else if (kind === 'pile') {
      if (target !== 'tray') return s.tell('Şimdi 254’ü kuruyoruz. Fazla bir bloğu çıkarmak istersen onu parça kutusuna geri sürükle.')
      c[e]--
    } else return false
    s.clear()
    setCounts(c)
    if (keyOf(c) === keyOf(START)) {
      sfx.ok()
      window.setTimeout(() => setPhase('h'), 700)
    }
  }

  const dnd = useDnd((item, target) => {
    if (phase === 'build') return build(item, target)
    if (want === null) return false
    const m = tryMove(counts, item, target)
    if (!m) return false
    if ('msg' in m) return s.tell(m.msg, { mis: m.mis, at: m.at })
    if (m.kind !== 'break' || m.from !== want)
      return s.tell(want === 2 ? 'Önce bir yüzlüğü boz: yüzlükler yığınına dokunup hemen sağındaki onluklar sütununa sürükle.' : 'Şimdi bir onluğu boz: onluklar yığınına dokunup birlikler sütununa sürükle.')
    s.clear()
    sfx.ok()
    setCounts(m.counts)
    window.setTimeout(() => setPhase(want === 2 ? 'ask1' : 'ask2'), 500)
  })

  const building = phase === 'build'
  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          {building && <PartsBox dnd={dnd} />}
          <Equation key={keyOf(counts)} counts={counts} flash={!building} />
          <Mat counts={counts} dnd={dnd} wrong={s.wrong} locked={!building && want === null} movable={building ? [0, 1, 2] : [1, 2]} bundles={!building} />
        </Stage>
      }
      panel={
        <>
          {building && <Prompt step={`Kur: ${TARGET}`}>Önce <b>254</b> sayısını kur. Parça kutusundan blokları tutup kendi sütununa sürükle: kaç yüzlük, kaç onluk, kaç birlik gerekir? Fazla koyduğun bloğu kutuya geri sürükle.</Prompt>}
          {phase === 'h' && <Reveal><Prompt step="Boz">Tuvalde 254 var: 2 yüzlük, 5 onluk, 4 birlik. Şimdi <b>yüzlükler</b> yığınına dokun ve bir yüzlüğü hemen sağındaki <b>onluklar</b> sütununa sürükle. Ne olacağını tahmin et!</Prompt></Reveal>}
          {phase === 'o' && <Reveal><Prompt step="Bir daha boz">Şimdi <b>onluklar</b> yığınına dokun ve bir onluğu <b>birlikler</b> sütununa sürükle.</Prompt></Reveal>}
          {s.view()}
          {phase === 'ask1' && (
            <Reveal>
              <Prompt step="Ne oldu?">Yüzlük kayboldu mu? Onluklar sütununa bak: 5 onluk vardı, şimdi {counts[1]} onluk var.</Prompt>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('o')}
                okText="Evet! 1 yüzlük, 10 onluğa dönüştü; değer aynı kaldı."
                ask={{
                  q: 'Bloklar değişti: 1 yüzlük + 15 onluk + 4 birlik. Tuvaldeki sayı şimdi kaç?',
                  options: [
                    { label: 'Hâlâ 254: 100 + 150 + 4 = 254', ok: true },
                    { label: '154: bir yüzlük gitti', nudge: 'Yüzlük kayboldu mu, yoksa bir şeye mi dönüştü? Onluklar sütununda kaç çubuk vardı, şimdi kaç tane var?', mis: 'Bozmanın sayının değerini azalttığını sanıyor' },
                    { label: '1.154: 1, 15 ve 4’ü yan yana yazarız', nudge: '15 onluk kaç eder? Yalnızca bir basamağa 15 yazamayız; 15 onluğun değeri 150’dir. 100 + 150 + 4 kaç eder?', mis: 'Çözümlemedeki sayıları yan yana yazarak sayı oluşturuyor' },
                  ],
                }}
              />
            </Reveal>
          )}
          {phase === 'ask2' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('done')}
                okText="Doğru! Bloklar her bozmada değişti, sayı hep 254."
                ask={{
                  q: 'Şimdi 1 yüzlük + 14 onluk + 14 birlik var. Hangisi bu çözümlemenin değerini doğru hesaplar?',
                  options: [
                    { label: '100 + 140 + 14 = 254', ok: true },
                    { label: '1 + 14 + 14 = 29', nudge: 'Bunlar blok sayıları. Bir yüzlük ile bir birlik aynı değerde mi? 14 onluk kaç birlik eder?', mis: 'Birimleri dikkate almadan blok sayılarını topluyor' },
                    { label: '100 + 14 + 14 = 128', nudge: '14 onluk, 14 birlik değildir. Her onluk çubuğu 10 birlik eder: 14 onluk = ?', mis: 'Onlukların değerini birlik gibi sayıyor' },
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

/* ───────────── 2. Hedef çözümlemeler ───────────── */

const GOALS: Counts[] = [[4, 25, 0], [54, 0, 2], [14, 24, 0]]

function TargetsTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const [counts, setCounts] = useState<Counts>(START)
  /** Bulunan farklı çözümlemeler (ilki başlangıç) */
  const [found, setFound] = useState<Counts[]>([START])
  const [phase, setPhase] = useState<'play' | 'ask' | 'done'>('play')
  const [hit, setHit] = useState<string | null>(null)
  const rules = ['Bir sayının tek bir çözümlemesi yoktur: 254 = 25 onluk + 4 birlik = 2 yüzlük + 54 birlik = 24 onluk + 14 birlik. Hepsinin değeri aynıdır.']
  const keys = new Set(found.map(keyOf))
  const got = GOALS.filter((g) => keys.has(keyOf(g))).length

  const land = (c: Counts) => {
    setCounts(c)
    const k = keyOf(c)
    if (keys.has(k)) return
    const f = [...found, c]
    setFound(f)
    const isGoal = GOALS.some((g) => keyOf(g) === k)
    if (isGoal) {
      sfx.ok()
      setHit(k)
      window.setTimeout(() => setHit(null), 1200)
    }
    const fk = new Set(f.map(keyOf))
    if (GOALS.every((g) => fk.has(keyOf(g)))) window.setTimeout(() => setPhase('ask'), 900)
  }

  const dnd = useDnd((item, target) => {
    if (phase !== 'play') return false
    const m = tryMove(counts, item, target)
    if (!m) return false
    if ('msg' in m) return s.tell(m.msg, { mis: m.mis, at: m.at })
    s.clear()
    land(m.counts)
  })

  const hint = (g: Counts) => {
    const k = keyOf(g)
    if (k === '4-25-0') return 'İki yüzlüğün ikisini de onluklar sütununa boz. Kaç onluk olur?'
    if (k === '54-0-2') return 'Yüzlüklere dokunma; onlukların hepsini birlikler sütununa boz.'
    return '25 onluğa ulaştıktan sonra bir onluğu daha boz.'
  }

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <Equation key={keyOf(counts)} counts={counts} flash />
          <Mat counts={counts} dnd={dnd} wrong={s.wrong} locked={phase !== 'play'} />
          <div className="flex justify-end">
            <button type="button" onClick={() => { s.clear(); setCounts(START) }} disabled={phase !== 'play'} className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-white px-4 text-base font-black text-ink shadow-[0_3px_0_#cbd5e1] ring-2 ring-line hover:bg-slate-50 disabled:opacity-40">
              <RotateCcw size={18} /> Baştan: 2 yüzlük + 5 onluk + 4 birlik
            </button>
          </div>
        </Stage>
      }
      panel={
        <>
          {phase === 'play' && <Prompt step={`Hedef ${got} / ${GOALS.length}`}>254’ü aşağıdaki üç biçimde çözümle. Bir bloğu <b>sağa</b> sürükleyince bozulur, 10’lu demeti <b>sola</b> sürükleyince birleşir. İstediğin sırayla yapabilirsin.</Prompt>}
          <Card>
            <p className="mb-2 text-[11px] font-black tracking-wide text-pink-700 uppercase">Hedef çözümlemeler</p>
            <ul className="space-y-1.5">
              {GOALS.map((g) => {
                const ok = keys.has(keyOf(g))
                return (
                  <li key={keyOf(g)} className={`rounded-xl px-3 py-2 ring-1 transition ${ok ? 'bg-emerald-50 ring-emerald-400' : 'bg-white ring-line'} ${hit === keyOf(g) ? 'animate-pop ring-4' : ''}`}>
                    <p className="flex items-center gap-2 text-base font-black">
                      <span className={`grid size-6 shrink-0 place-items-center rounded-full ${ok ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{ok ? <Check size={15} strokeWidth={3} /> : '?'}</span>
                      254 = {words(g)}
                    </p>
                    {!ok && phase === 'play' && <p className="mt-0.5 ml-8 text-xs font-bold text-ink-soft">İpucu: {hint(g)}</p>}
                  </li>
                )
              })}
            </ul>
          </Card>
          {s.view()}
          <Card>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black tracking-wide text-amber-700 uppercase"><BookOpen size={14} />Çözümleme defterim · {found.length} farklı</p>
            <ol className="max-h-56 space-y-1 overflow-y-auto pr-1">
              {[...found].reverse().map((c) => (
                <li key={keyOf(c)} className="rounded-lg bg-amber-50 px-2 py-1 text-sm font-extrabold tabular-nums ring-1 ring-amber-200 animate-fade-up">
                  {words(c)} <span className="text-ink-soft">= {sumText(c)} = {n(valueOf(c))}</span>
                </li>
              ))}
            </ol>
          </Card>
          {phase === 'ask' && (
            <Reveal>
            <DragAsk
              checks={checks}
              onOk={() => setPhase('done')}
              okText="Evet! Yüzlük, onluk ve birliklerle 254’ün tam 48 farklı çözümlemesi var; hepsi 254 eder."
              ask={{
                q: `${found.length} farklı çözümleme buldun ve hepsi 254 etti. 254’ün kaç çözümlemesi vardır?`,
                options: [
                  { label: 'Çok sayıda: her bozma ya da birleştirme yeni bir çözümleme verir, değer hep 254 kalır', ok: true },
                  { label: 'Tek bir doğru çözümleme var: 2 yüzlük + 5 onluk + 4 birlik', nudge: 'Defterine bak: oradaki çözümlemelerin her biri kaç ediyor? Hiçbiri yanlış mı?', mis: 'Yalnızca basamaklara göre yapılan (prototip) çözümlemeyi doğru kabul ediyor' },
                  { label: 'Yalnızca 3: hedefteki çözümlemeler', nudge: 'Hedefe ulaşırken geçtiğin ara durumlar da 254 etmedi mi? Örneğin 1 yüzlük + 15 onluk + 4 birlik.' },
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

/* ───────────── 3. Eksik parça ───────────── */

/** c[e]: bilinen blok sayısı; null: boş kutu */
const GAPS: { c: (number | null)[]; ans: number }[] = [
  { c: [null, 4, 2], ans: 14 },
  { c: [4, null, 1], ans: 15 },
  { c: [34, null, 0], ans: 22 },
  { c: [24, 3, null], ans: 2 },
]
const CARDS = [14, 15, 22, 2, 4, 5, 25, 1]
const STD = [4, 5, 2]

function MissingTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const [filled, setFilled] = useState<Record<number, number>>({})
  const [used, setUsed] = useState<number[]>([])
  const rules = ['Eksik parçayı bulmak için bilinen parçaların değerini 254’ten çıkarırım: 2 yüzlük + 4 onluk = 240, 254 − 240 = 14 birlik.']
  const complete = Object.keys(filled).length === GAPS.length
  const with_ = (r: number, v: number) => GAPS[r].c.map((x) => x ?? v)

  const dnd = useDnd((item, target) => {
    if (!target.startsWith('gap-')) return false
    const r = Number(target.slice(4))
    const ci = Number(item.slice(5))
    const v = CARDS[ci]
    if (filled[r] !== undefined) return false
    const g = GAPS[r]
    if (v !== g.ans) {
      const e = g.c.indexOf(null)
      const c = with_(r, v)
      const total = valueOf(c)
      const diff = total < TARGET ? `254’e ${n(TARGET - total)} eksik` : `254’ten ${n(total - TARGET)} fazla`
      const mis = v === STD[e] ? 'Çözümlemede yalnızca basamaktaki rakamı arıyor' : undefined
      return s.nudge(`Bu kartla ${sumText(c)} = ${n(total)} olur; ${diff}. Bilinen parçalar kaç ediyor? 254’e ulaşmak için kaç ${COL[e].unit} gerekir?`, { mis, at: r })
    }
    s.clear()
    sfx.ok()
    setFilled((f) => ({ ...f, [r]: v }))
    setUsed((u) => [...u, ci])
  })

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <ul className="space-y-2">
            {GAPS.map((g, r) => {
              const v = filled[r]
              const c = v === undefined ? null : with_(r, v)
              return (
                <li key={r} className={`rounded-2xl p-2.5 ring-1 ${s.wrong === r ? 'animate-shake ring-4 ring-amber-400' : c ? 'bg-emerald-50 ring-emerald-300' : 'bg-white ring-line'}`}>
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-lg font-black">
                    <span className="text-ink-soft">254 =</span>
                    {[2, 1, 0].filter((e) => g.c[e] !== 0).map((e, i) => (
                      <span key={e} className="flex items-center gap-1.5">
                        {i > 0 && <span className="text-ink-soft">+</span>}
                        {g.c[e] === null ? (
                          v !== undefined ? (
                            <span className="grid h-11 min-w-12 place-items-center rounded-xl bg-emerald-500 px-2 text-xl text-white animate-pop">{v}</span>
                          ) : (
                            <Drop dnd={dnd} id={`gap-${r}`} className="grid h-11 min-w-12 place-items-center rounded-xl border-2 border-dashed border-sky-400 bg-sky-50 px-2 text-sm text-sky-500">?</Drop>
                          )
                        ) : (
                          <span className="tabular-nums">{g.c[e]}</span>
                        )}
                        <span style={{ color: COL[e].color }}>{COL[e].unit}</span>
                      </span>
                    ))}
                  </div>
                  {!c && (
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <span className="text-[11px] font-black text-ink-soft">Bilinen parçalar:</span>
                      <MiniBlocks counts={g.c.map((x) => x ?? 0)} />
                    </div>
                  )}
                  {c && (
                    <div className="mt-2 flex flex-wrap items-end justify-between gap-2 animate-fade-up">
                      <MiniBlocks counts={c} />
                      <span className="text-sm font-extrabold text-emerald-800 tabular-nums">{sumText(c)} = {n(valueOf(c))}</span>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          {!complete && (
            <Tray title="Sayı kartları">
              {CARDS.map((v, i) => (used.includes(i) ? null : <Drag key={i} dnd={dnd} item={`card-${i}`} label={`${v} kartı`} className={TOKEN}>{v}</Drag>))}
            </Tray>
          )}
        </Stage>
      }
      panel={
        <>
          <Prompt step={`${Object.keys(filled).length} / ${GAPS.length}`}>Her satır 254’ün bir çözümlemesi ama bir parçası eksik. Doğru sayı kartını tutup <b>?</b> kutusuna sürükle. Önce bilinen parçaların kaç ettiğini hesapla.</Prompt>
          {s.view()}
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

/* ───────────── 4. 254 eder mi? ───────────── */

const SORT: Counts[] = [
  [14, 4, 2],
  [54, 20, 0],
  [14, 5, 2],
  [254, 0, 0],
  [4, 0, 25],
  [14, 14, 1],
  [0, 54, 2],
  [4, 5, 1],
]

function SortTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const [where, setWhere] = useState<Record<number, 'yes' | 'no'>>({})
  const rules = ['Bir çözümlemenin doğru olup olmadığını anlamak için her parçanın değerini bulup toplarım; blok sayılarının küçük ya da büyük görünmesine bakmam.']
  const complete = Object.keys(where).length === SORT.length

  const dnd = useDnd((item, target) => {
    if (target !== 'yes' && target !== 'no') return false
    const i = Number(item.slice(3))
    const c = SORT[i]
    const v = valueOf(c)
    const ok = v === TARGET
    if ((target === 'yes') !== ok) {
      if (ok) return s.nudge(`Hesapla: ${sumText(c)} = ${n(v)}. Bloklar alışık olduğumuzdan farklı görünebilir ama değer ne?`, { mis: 'Prototip dışındaki çözümlemeleri yanlış sayıyor' })
      const mis = c[1] === 54 && c[0] === 0 ? 'Birlik ile onluğu karıştırıyor' : c[2] === 25 ? 'Onluk ile yüzlüğü karıştırıyor' : undefined
      return s.nudge(`Hesapla: ${sumText(c)} = ${n(v)}. Bu 254 mü?`, { mis })
    }
    s.clear()
    sfx.ok()
    setWhere((w) => ({ ...w, [i]: target }))
  })

  const basket = (id: 'yes' | 'no', title: string, tone: string) => (
    <Drop dnd={dnd} id={id} className={`min-h-32 rounded-2xl border-2 border-dashed p-2 ${tone}`}>
      <p className="mb-1.5 text-center text-sm font-black">{title}</p>
      <ul className="space-y-1">
        {SORT.map((c, i) => (where[i] === id ? (
          <li key={i} className="rounded-lg bg-white px-2 py-1 text-xs font-extrabold text-ink ring-1 ring-black/5 animate-pop">
            {words(c)} <span className="text-ink-soft tabular-nums">= {n(valueOf(c))}</span>
          </li>
        ) : null))}
      </ul>
    </Drop>
  )

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {basket('yes', '✓ 254 eder', 'border-emerald-400 bg-emerald-50 text-emerald-800')}
            {basket('no', '✗ 254 etmez', 'border-slate-300 bg-slate-50 text-slate-600')}
          </div>
          {!complete && (
            <Tray title="Çözümleme kartları">
              {SORT.map((c, i) => (where[i] ? null : (
                <Drag key={i} dnd={dnd} item={`sc-${i}`} label={words(c)} className="min-h-14 rounded-2xl bg-white px-3 py-2 text-left text-base font-black text-ink shadow-[0_3px_0_#cbd5e1] ring-2 ring-line">
                  <span className="mr-1.5 text-slate-400" aria-hidden>⠿</span>{words(c)}
                </Drag>
              )))}
            </Tray>
          )}
        </Stage>
      }
      panel={
        <>
          <Prompt step={`${Object.keys(where).length} / ${SORT.length}`}>Her kartın değerini hesapla. Toplamı 254 ise kartı <b>“254 eder”</b>, değilse <b>“254 etmez”</b> sepetine sürükle.</Prompt>
          {s.view()}
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

/* ───────────── 5. Büyük sayılar ───────────── */

function Groups({ heads, cells, colors }: { heads: string[]; cells: string[]; colors: string[] }) {
  return (
    <div className="mx-auto grid max-w-md gap-1.5" style={{ gridTemplateColumns: `repeat(${heads.length}, minmax(0, 1fr))` }}>
      {heads.map((h, i) => <p key={h} className="rounded-xl py-1 text-center text-[11px] font-black text-white uppercase sm:text-xs" style={{ background: colors[i] }}>{h}</p>)}
      {cells.map((c, i) => <p key={i} className="grid h-16 place-items-center rounded-xl bg-white text-3xl font-black tabular-nums ring-1 ring-line" style={{ color: colors[i] }}>{c}</p>)}
    </div>
  )
}
const C3 = ['#ea580c', '#16a34a', '#ca8a04']
const BOLUK = ['#9333ea', '#db2777', '#ca8a04']
const C4 = ['#db2777', '#ea580c', '#16a34a', '#ca8a04']

/** 254’te kaç onluk var? Yüzlükleri onluklara bozup bütün çubukları sayabilir */
function TensView() {
  const [counts, setCounts] = useState<Counts>(START)
  const dnd = useDnd((item, target) => {
    const m = tryMove(counts, item, target)
    if (!m || 'msg' in m || m.kind !== 'break' || m.from !== 2) return false
    sfx.ok()
    setCounts(m.counts)
  })
  return (
    <div className="space-y-2">
      <Groups heads={['Yüzler', 'Onlar', 'Birler']} cells={['2', '5', '4']} colors={C3} />
      <p className="text-center text-sm font-extrabold text-ink-soft">İstersen yüzlükleri onluklar sütununa sürükleyip boz, sonra onlukları say.</p>
      <Equation key={keyOf(counts)} counts={counts} flash={counts[2] < 2} />
      <Mat counts={counts} dnd={dnd} movable={[2]} bundles={false} />
    </div>
  )
}

const BIG: { view: ReactNode; ask: { q: string; options: { label: string; ok?: boolean; nudge?: string; mis?: string }[] }; ok: string }[] = [
  {
    view: <TensView />,
    ask: {
      q: '254 sayısında kaç tane onluk var?',
      options: [
        { label: '25 tane: 2 yüzlük de 20 onluk eder, 20 + 5 = 25', ok: true },
        { label: '5 tane: onlar basamağında 5 yazıyor', nudge: 'Onlar basamağındaki rakam 5. Ama 2 yüzlüğü bozsan kaç onluk daha çıkar? Yüzlükleri onluklar sütununa sürükleyip çubukları say.', mis: 'Basamaktaki rakamı, sayıdaki toplam onluk sayısıyla karıştırıyor' },
        { label: '2 tane', nudge: '2, yüzler basamağındaki rakam. Bir yüzlüğü onluklar sütununa sürükle: 1 yüzlük kaç onluk eder?' },
      ],
    },
    ok: 'Evet! Onlar basamağındaki rakam 5, ama 254’te 25 onluk var.',
  },
  {
    view: (
      <div className="space-y-2">
        <Groups heads={['Milyonlar', 'Binler', 'Birler']} cells={['4', '508', '120']} colors={BOLUK} />
        <p className="text-center text-sm font-extrabold text-ink-soft">“dört milyon beş yüz sekiz bin yüz yirmi”</p>
      </div>
    ),
    ask: {
      q: '4.508.120 sayısında kaç tane bin var?',
      options: [
        { label: '4.508 bin ve 120 birlik: 4 milyon = 4.000 bin', ok: true },
        { label: '508 bin: binler bölüğünde 508 yazıyor', nudge: 'Binler bölüğünde 508 var. Ama milyonlar bölüğündeki 4 milyon da bin olarak yazılabilir: 1 milyon = 1.000 bin. 4 milyon kaç bin eder?', mis: 'Bölükteki sayıyı, sayıdaki toplam bin sayısıyla karıştırıyor' },
        { label: '8 bin: binler basamağında 8 var', nudge: '8, binler basamağındaki rakam. 254’te kaç onluk olduğunu nasıl bulmuştun? Aynı fikri binler için dene.', mis: 'Basamaktaki rakamı, sayıdaki toplam bin sayısıyla karıştırıyor' },
      ],
    },
    ok: 'Harika! 4.508.120 = 4.508 bin + 120. Sayıyı okurken de bölükleri böyle kullanırız.',
  },
  {
    view: <Groups heads={['Binler', 'Yüzler', 'Onlar', 'Birler']} cells={['3', '2', '5', '4']} colors={C4} />,
    ask: {
      q: '3.254 sayısının hangisi doğru bir çözümlemesidir?',
      options: [
        { label: '32 yüzlük + 54 birlik', ok: true },
        { label: '3 yüzlük + 254 birlik', nudge: 'Hesapla: 300 + 254 = 554. 3.254’teki 3 bin kaç yüzlük eder?', mis: 'Binliği yüzlük gibi sayıyor' },
        { label: '32 onluk + 54 birlik', nudge: 'Hesapla: 320 + 54 = 374. 32 onluk mu, 32 yüzlük mü 3.200 eder?', mis: 'Onluk ile yüzlüğü karıştırıyor' },
      ],
    },
    ok: 'Doğru! 3.200 + 54 = 3.254. 3 bin, 30 yüzlük eder; 2 yüzlükle birlikte 32 yüzlük.',
  },
]

function BigTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const [k, setK] = useState(0)
  const rules = [
    'Basamaktaki rakam ile sayıda o birimden kaç tane olduğu farklıdır: 254’ün onlar basamağında 5 var ama 254’te 25 onluk var.',
    'Büyük sayılar da farklı çözümlenebilir: 4.508.120 = 4 milyon + 508 bin + 120 = 4.508 bin + 120.',
  ]
  const done = k >= BIG.length
  const q = BIG[Math.min(k, BIG.length - 1)]
  return (
    <Split
      work={<Stage className="p-3 sm:p-5" key={k}>{done ? <Groups heads={['Milyonlar', 'Binler', 'Birler']} cells={['4', '508', '120']} colors={BOLUK} /> : q.view}</Stage>}
      panel={
        <>
          <Prompt step={done ? 'Tamam' : `Soru ${k + 1} / ${BIG.length}`}>{done ? 'Blokları bozup birleştirirken bulduğun fikir, milyonlu sayıları okurken de işe yarıyor.' : 'Cevap kartını tutup “Cevap kartını buraya sürükle” kutusuna bırak.'}</Prompt>
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
        <p className="mt-3 text-sm font-bold text-amber-900">Bu kuralları ezberlemedin: hepsini blokları bozup birleştirerek kendin çıkardın.</p>
      </div>
      <div className="mt-4"><NextButton last onClick={onFinish} /></div>
    </div>
  )
}
