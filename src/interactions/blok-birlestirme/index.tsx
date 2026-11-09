import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BookOpen, Check } from 'lucide-react'
import type { InteractionProps } from '../types'
import { Scene } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { sfx } from '../../lib/feedback'
import { Card, Header, NextButton, Nudge, Prompt, Split, Stage, shuffle, useChecks } from '../donusum-studyosu/ortak'
import { Drag, DragAsk, Drop, HowTo, RulesFound, n, useDnd, type Ask, type Tool, type ToolInfo } from '../sayilari-karsilastir/parts'
import { Written } from '../elde-ve-bozma/tuval'
import { COLS, Counter, TOOL, Tuval, UNIT, build, countsOf, digitsOf, joinLayout, regionOf, valueOf, type Blk, type E, type Ev } from './tuval'

/**
 * 92. Bloklarla Üç Basamaklı Toplama (3. sınıf, MAT.3.2.2 toplama, MAT.3.1.2 1000’e kadar sayıları çözümleme)
 * Polypad’deki gibi serbest bir blok tuvali: yüzlük, onluk ve birlik kutularından blok sürüklenir, tuvaldeki bloklar
 * serbestçe taşınır ve ızgaraya yapışır. Birbirine değen 10 birlik küp parlayıp kayarak tek bir onluk çubuğa,
 * 10 onluk çubuk tek bir yüzlük karesine dönüşür; çift dokunuş ya da “Boz” kutusu ters yönde çalışır.
 * Tuvalin üstünde canlı sayaç: “2 yüzlük + 5 onluk + 13 birlik = 263”. Her görevin üstünde amaç ve “Nasıl kullanılır?” kartı.
 *  1. Serbest keşif: 10 birliği yan yana getir, 10 onluğu yan yana getir, bir bloğu boz; ne oluyor?
 *  2. Verilen sayıyı kur (ör. 247), sonra içinde 0 olan bir sayıyı kur (ör. 306)
 *  3. Eldesiz toplama: iki sayıyı tuvalin iki bölgesinde kur, “2. sayı” etiketini sürükleyerek birleştir, sonucu oku
 *  4. Eldeli toplama: önce yalnız birliklerde, sonra hem birlik hem onlukta; birlikleri ve onlukları yan yana getirip
 *     dönüştürürken kâğıttaki işlemde elde 1 ve sonuç basamakları adım adım dolar
 *  5. Tahmin et ve kontrol et: Ali 158 + 267 = 3115 bulmuş; bloklarla kontrol edip hatayı bul
 *  Sonuçlar cevap kartı sürüklenerek verilir (DragAsk). Son: kural defteri.
 */

type Done = (first: boolean, rules: string[]) => void
type Say = { q: string; mis?: string; k: number } | null

const TASKS: { emoji: string; title: string; goal: string; tools: (Tool | ToolInfo)[] }[] = [
  { emoji: '🔍', title: '10 tane yan yana gelince', goal: '10 birlik küp yan yana gelince, sonra 10 onluk yan yana gelince ne olduğunu keşfetmek; bir bloğu bozup geri dönmek.', tools: [TOOL.src, TOOL.move, TOOL.join10, TOOL.join100, TOOL.boz, TOOL.trash, 'answer'] },
  { emoji: '🏗️', title: 'Sayıyı bloklarla kur', goal: 'Verilen üç basamaklı sayıyı yüzlük, onluk ve birlik bloklarıyla kurmak; sayıda 0 olunca ne olduğunu görmek.', tools: [TOOL.src, TOOL.move, TOOL.trash, 'answer'] },
  { emoji: '➕', title: 'İki sayıyı birleştir', goal: 'İki sayıyı tuvalin iki yanında kurmak, sonra bir araya getirip toplamı bloklardan okumak.', tools: [TOOL.split, TOOL.src, TOOL.hand, 'answer'] },
  { emoji: '🔁', title: '10 birlik, 1 onluk: elde', goal: 'Toplarken 10’u geçen birlikleri (ve onlukları) yan yana getirip bir üst birime dönüştürmek; kâğıttaki elde 1’in nereden geldiğini görmek.', tools: [TOOL.hand, TOOL.move, TOOL.join10, TOOL.join100, 'answer'] },
  { emoji: '🕵️', title: 'Ali’nin cevabı doğru mu?', goal: 'Önce tahmin edip sonra bloklarla kontrol ederek 158 + 267 = 3115 cevabındaki hatayı bulmak.', tools: ['answer', TOOL.hand, TOOL.move, TOOL.join10, TOOL.join100] },
]

export default function BlokBirlestirme({ grade, onFinish }: InteractionProps) {
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
      summary: `${TASKS.length} görevde taban bloklarını serbest tuvalde birleştirerek üç basamaklı sayıları kurdun ve topladın; ${rules.length} kuralı kendin buldun.`,
      insight: 'Toplamak, aynı tür blokları bir araya getirmektir. 10 birlik yan yana gelince 1 onluk, 10 onluk yan yana gelince 1 yüzlük olur. Kâğıttaki küçük “elde 1” işte bu yeni onluk ya da yüzlüktür.',
    })

  const props = { onDone: done, last }
  return (
    <Scene grade={grade} className="select-none [-webkit-touch-callout:none]">
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
        <ExploreTask key={idx} {...props} />
      ) : idx === 1 ? (
        <BuildTask key={idx} {...props} />
      ) : idx === 2 ? (
        <PlainTask key={idx} {...props} />
      ) : idx === 3 ? (
        <CarryTask key={idx} {...props} />
      ) : (
        <ErrorTask key={idx} {...props} />
      )}
    </Scene>
  )
}

interface TaskProps { onDone: Done; last: boolean }

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

/** Görev içi düşündüren soru: nudge sayaca yazar, tell yalnızca yol gösterir. Dar ekranda tuvalde, genişte panelde. */
function useSay(checks: ReturnType<typeof useChecks>) {
  const wide = useWide()
  const [say, setSay] = useState<Say>(null)
  const show = (q: string, mis?: string) => setSay((s) => ({ q, mis, k: (s?.k ?? 0) + 1 }))
  return {
    clear: () => setSay(null),
    nudge(q: string, mis?: string) {
      checks.fail()
      show(q, mis)
    },
    tell: (q: string) => show(q),
    view: (spot: 'work' | 'panel') => (say && (spot === 'panel') === wide ? <Nudge key={say.k} question={say.q} misconception={say.mis} /> : null),
  }
}

/** Dar ekranda yeni çıkan soru görünür alanda değilse oraya kaydırılır */
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

const rand = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const num = (h: number, t: number, u: number) => 100 * h + 10 * t + u

/** Hedef listesi: tamamlananlar yeşil tikli */
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

/** Bölgeli tuvalin üstündeki iki etiket. join: “2. sayı” sürüklenir, “1. sayı” bırakma hedefidir. */
function RegionHeads({ blocks, a, b, join, onJoin }: { blocks: Blk[]; a: number; b: number; join: boolean; onJoin: () => void }) {
  const dnd = useDnd((item, target) => {
    if (item !== 'B' || target !== 'A') return false
    onJoin()
  })
  const vA = valueOf(blocks.filter((x) => regionOf(x) === 'A'))
  const vB = valueOf(blocks.filter((x) => regionOf(x) === 'B'))
  const head = (label: string, target: number, v: number, tone: string) => (
    <div className="flex min-h-16 flex-col justify-center">
      <p className="text-xs font-black tracking-wide uppercase" style={{ color: tone }}>{label}: <span className="text-base">{n(target)}</span></p>
      <p className={`text-sm font-extrabold tabular-nums ${v === target ? 'text-emerald-700' : 'text-ink-soft'}`}>
        Tuvalde: {n(v)} {v === target && <Check size={16} strokeWidth={3} className="inline align-[-3px]" />}
      </p>
    </div>
  )
  if (!join)
    return (
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-sky-50 px-3 ring-2 ring-sky-200">{head('1. sayı', a, vA, '#0369a1')}</div>
        <div className="rounded-2xl bg-pink-50 px-3 ring-2 ring-pink-200">{head('2. sayı', b, vB, '#be185d')}</div>
      </div>
    )
  return (
    <div className="grid grid-cols-2 gap-2">
      <Drop dnd={dnd} id="A" className="flex min-h-16 flex-col justify-center rounded-2xl border-2 border-dashed border-sky-400 bg-sky-50 px-3">
        <p className="text-xs font-black tracking-wide text-sky-700 uppercase">1. sayı: <span className="text-base">{n(a)}</span></p>
        <p className="text-sm font-extrabold text-sky-600">2. sayıyı buraya bırak</p>
      </Drop>
      <Drag dnd={dnd} item="B" label={`2. sayı: ${n(b)}`} className="flex min-h-16 w-full items-center gap-2 rounded-2xl bg-pink-600 px-3 text-left text-white shadow-[0_4px_0_#9d174d] ring-2 ring-pink-700 animate-pop">
        <span className="text-2xl" aria-hidden>✋</span>
        <span className="min-w-0">
          <span className="block text-xs font-black tracking-wide uppercase">2. sayı: <span className="text-base">{n(b)}</span></span>
          <span className="block text-sm font-extrabold">Tut, sola sürükle: ekle</span>
        </span>
      </Drag>
    </div>
  )
}

/* ───────────── 1. Serbest keşif ───────────── */

function ExploreTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const [blocks, setBlocks] = useState<Blk[]>([])
  const [got, setGot] = useState({ ten: false, hundred: false, broke: false })
  const [phase, setPhase] = useState<'play' | 'ask1' | 'ask2' | 'done'>('play')
  const rules = [
    '10 birlik yan yana gelince 1 onluk olur, 10 onluk yan yana gelince 1 yüzlük olur. Bloklar değişir, sayı değişmez.',
    '1 onluk bozulunca 10 birlik, 1 yüzlük bozulunca 10 onluk olur.',
  ]
  const all = got.ten && got.hundred && got.broke

  useEffect(() => {
    if (all && phase === 'play') {
      const id = window.setTimeout(() => setPhase('ask1'), 700)
      return () => window.clearTimeout(id)
    }
  }, [all, phase])

  const change = (next: Blk[], ev: Ev) => {
    setBlocks(next)
    s.clear()
    if (ev.t === 'merge') setGot((g) => (ev.e === 0 ? { ...g, ten: true } : { ...g, hundred: true }))
    if (ev.t === 'break') setGot((g) => ({ ...g, broke: true }))
  }

  const c = countsOf(blocks)
  const tip = !got.ten
    ? c[0] === 0
      ? 'Birlik kutusundan bir küpü tutup tuvale sürükle.'
      : `Tuvalde ${c[0]} birlik var. Küpleri birbirine değecek biçimde yan yana koy. 10 olunca ne olacak?`
    : !got.hundred
      ? c[1] < 10
        ? `Şimdi onluk kutusundan çubuk sürükle ve çubukları yan yana diz. Tuvalde ${c[1]} onluk var.`
        : 'Onluk çubukların birbirine değsin: yan yana, aralarında boşluk olmadan.'
      : 'Bir onluğa ya da yüzlüğe iki kez hızlıca dokun ya da onu Boz kutusuna sürükle.'

  return (
    <Split
      work={
        <Stage className="space-y-2 p-2 sm:p-3">
          <Counter blocks={blocks} />
          <Tuval blocks={blocks} onChange={change} onInfo={s.tell} locked={phase !== 'play'} />
          {s.view('work')}
        </Stage>
      }
      panel={
        <>
          <Prompt step="Keşfet">Blokları tuvale sürükle ve yan yana diz. <b>10 tane</b> yan yana gelince ne oluyor? Sayaca da bak.</Prompt>
          <Checklist
            items={[
              { label: '10 birlik küpü yan yana getir', ok: got.ten },
              { label: '10 onluk çubuğu yan yana getir', ok: got.hundred },
              { label: 'Bir onluğu ya da yüzlüğü boz', ok: got.broke },
            ]}
          />
          {phase === 'play' && <p className="rounded-xl bg-white/80 px-3 py-2 text-sm font-bold text-ink-soft ring-1 ring-line">İpucu: {tip}</p>}
          {s.view('panel')}
          {phase === 'ask1' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('ask2')}
                okText="Evet! Bloğun biçimi değişti, değeri değişmedi: 10 birlik = 1 onluk = 10."
                ask={{
                  q: '10 birlik küp birleşip onluk çubuk olunca tuvaldeki sayı ne oldu?',
                  options: [
                    { label: 'Aynı kaldı: 10 birlik ile 1 onluk aynı değerde', ok: true },
                    { label: 'Azaldı: 10 blok gitti, 1 blok geldi', nudge: 'Blok sayısı azaldı ama sayaca bak: sayı da azaldı mı? 1 onluk çubukta kaç küp var?', mis: 'Blok sayısı ile sayının değerini karıştırıyor' },
                    { label: 'Arttı: onluk birlikten büyük', nudge: 'Onluk bir birlikten büyük, ama 10 birliğin yerine geldi. 10 birlik kaç eder, 1 onluk kaç eder?' },
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
                okText="Doğru! 1 yüzlük = 10 onluk = 100 birlik."
                ask={{
                  q: '1 yüzlük karesinde kaç birlik küp var?',
                  options: [
                    { label: '100: 10 onluk var, her onlukta 10 birlik', ok: true },
                    { label: '10: yüzlük 10 parçadan oluştu', nudge: 'Yüzlük 10 onluktan oluştu. Her onlukta kaç birlik vardı? 10 tane 10 kaç eder?', mis: 'Yüzlüğün 10 birlikten oluştuğunu sanıyor' },
                    { label: '20: 10 onluk ve 10 birlik', nudge: 'Bir yüzlüğü boz: kaç onluk çıkıyor? Sonra bir onluğu boz: kaç birlik çıkıyor?' },
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

/* ───────────── 2. Sayıyı kur ───────────── */

function makeTargets() {
  const t1 = num(rand(2, 4), rand(1, 8), rand(2, 8))
  const zeroTens = Math.random() < 0.6
  const t2 = zeroTens ? num(rand(2, 5), 0, rand(2, 9)) : num(rand(2, 5), rand(2, 9), 0)
  return [t1, t2]
}

function BuildTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const [targets] = useState(makeTargets)
  const [k, setK] = useState(0)
  const [blocks, setBlocks] = useState<Blk[]>([])
  const [phase, setPhase] = useState<'build' | 'ask' | 'done'>('build')
  const target = targets[k]
  const [tu, tt, th] = digitsOf(target)
  const zeroAt = tt === 0 ? 1 : 0
  const rules = [
    'Üç basamaklı bir sayıyı yüzlük, onluk ve birlik bloklarıyla kurarım: 247 = 2 yüzlük + 4 onluk + 7 birlik = 200 + 40 + 7.',
    'Bir türden hiç blok yoksa o basamağa 0 yazarım: 3 yüzlük + 6 birlik = 306, 36 değil.',
  ]
  const ok = valueOf(blocks) === target

  const change = (next: Blk[]) => {
    setBlocks(next)
    s.clear()
    const v = valueOf(next)
    if (v === target && phase === 'build') {
      sfx.ok()
      window.setTimeout(() => setPhase('ask'), 600)
    } else if (v > target) s.tell(`Tuvalde ${n(v)} var, hedef ${n(target)}. Fazla bloğu Çöp kutusuna sürükle.`)
  }

  const c = countsOf(blocks)
  const askFirst: Ask = useMemo(() => ({
    q: `${n(target)} sayısındaki ${tt} onluk kaç eder?`,
    options: shuffle([
      { label: `${tt * 10}: her onluk 10 eder`, ok: true },
      { label: `${tt}: onlar basamağında ${tt} yazıyor`, nudge: `Tuvaldeki onluk çubuklara bak: her birinde kaç küp var? ${tt} tane 10 kaç eder?`, mis: 'Onlukların değerini basamaktaki rakamla karıştırıyor' },
      { label: `${th * 100 + tt * 10}: yüzlüklerle birlikte`, nudge: 'Yalnızca onluk çubuklarını say. Yüzlükler ayrı bir parça.' },
    ]),
  }), [target]) // eslint-disable-line react-hooks/exhaustive-deps
  const askZero: Ask = useMemo(() => ({
    q: zeroAt === 1 ? `${n(target)}’ü kurarken hiç onluk koymadın. Sayıyı yazarken onlar basamağına ne yazarız?` : `${n(target)}’ü kurarken hiç birlik koymadın. Sayıyı yazarken birler basamağına ne yazarız?`,
    options: shuffle([
      { label: '0 yazarız: o türden hiç blok yok demek', ok: true },
      {
        label: zeroAt === 1 ? `Hiçbir şey yazmayız: ${th}${tu}` : `Hiçbir şey yazmayız: ${th}${tt}`,
        nudge: zeroAt === 1 ? `${th}${tu} yazarsak tuvalde ${th} onluk ${tu} birlik mi olur, ${th} yüzlük ${tu} birlik mi? 0, yüzlüklerin yerinde durmasını sağlar.` : `${th}${tt} yazarsak ${th} yüzlük mü olur, ${th} onluk mu? Boş basamağı 0 tutar.`,
        mis: 'Sıfırın basamak tutucu rolünü göz ardı ediyor',
      },
      { label: '1 yazarız: bir boşluk var', nudge: '1 yazarsak 1 tane blok var demek olur. Tuvalde o türden kaç blok var?' },
    ]),
  }), [target]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Split
      work={
        <Stage className="space-y-2 p-2 sm:p-3">
          <Counter blocks={blocks} />
          <Tuval blocks={blocks} onChange={change} onInfo={s.tell} locked={phase !== 'build'} />
          {s.view('work')}
        </Stage>
      }
      panel={
        <>
          <Prompt step={`Sayı ${k + 1} / ${targets.length}`}>
            <span className="flex items-center gap-3">
              <span className={`grid h-16 min-w-24 place-items-center rounded-2xl px-3 text-4xl font-black tabular-nums ring-2 ${ok ? 'bg-emerald-50 text-emerald-700 ring-emerald-400' : 'bg-amber-50 text-amber-800 ring-amber-300'}`}>{n(target)}</span>
              <span>Bu sayıyı bloklarla kur. Kutulardan blok sürükle; fazlasını Çöp’e at.</span>
            </span>
          </Prompt>
          {phase === 'build' && (
            <p className="rounded-xl bg-white/80 px-3 py-2 text-sm font-bold text-ink-soft ring-1 ring-line">
              Tuvalde {c[2]} yüzlük, {c[1]} onluk, {c[0]} birlik var. {n(target)} için kaç yüzlük gerekir?
            </p>
          )}
          {s.view('panel')}
          {phase === 'ask' && (
            <Reveal key={k}>
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800 ring-1 ring-emerald-300 animate-pop">
                {n(target)} hazır: {c[2]} yüzlük + {c[1]} onluk + {c[0]} birlik = {n(c[2] * 100)} + {n(c[1] * 10)} + {n(c[0])}
              </p>
              <DragAsk
                checks={checks}
                ask={k === 0 ? askFirst : askZero}
                okText={k === 0 ? `Evet! ${tt} onluk = ${tt * 10}.` : 'Doğru! 0, “bu türden blok yok” der ve diğer rakamları kendi yerinde tutar.'}
                onOk={() => {
                  if (k === 0) {
                    setK(1)
                    setBlocks([])
                    setPhase('build')
                  } else setPhase('done')
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

/* ───────────── 3. Eldesiz toplama ───────────── */

function plainPair() {
  const [hA, hB] = shuffle([1, rand(1, 2)])
  const tA = rand(1, 4), tB = rand(1, 4)
  const uA = rand(1, 4), uB = rand(1, 5)
  return [num(hA, tA, uA), num(hB, tB, uB)]
}

/** Toplamı bloklardan okuma sorusu */
function sumAsk(a: number, b: number): Ask {
  const S = a + b
  const [u, t, h] = digitsOf(S)
  const opts = [
    { label: n(S), ok: true },
    { label: n(num(u, t, h)), nudge: 'En soldaki rakam en büyük bloklardan gelir. Tuvalde kaç yüzlük var? Önce onu yaz.', mis: 'Basamakları ters sırayla yazıyor' },
    { label: n(h + t + u), nudge: `${h + t + u}, blok sayısı. Bir yüzlük ile bir birlik aynı değerde mi? Her türü ayrı say.`, mis: 'Blokların değerini dikkate almadan sayıyor' },
  ]
  return { q: `Tuvaldeki bloklar şimdi hangi sayıyı gösteriyor? ${n(a)} + ${n(b)} = ?`, options: shuffle(opts) }
}

function PlainTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const [[a, b]] = useState(plainPair)
  const [blocks, setBlocks] = useState<Blk[]>([])
  const [phase, setPhase] = useState<'build' | 'join' | 'read' | 'done'>('build')
  const rules = ['Toplamak, iki sayının aynı tür bloklarını bir araya getirmektir: yüzlükler yüzlüklerle, onluklar onluklarla, birlikler birliklerle.']
  const S = a + b
  const ask = useMemo(() => sumAsk(a, b), [a, b])

  const change = (next: Blk[]) => {
    setBlocks(next)
    s.clear()
    if (phase !== 'build') return
    const vA = valueOf(next.filter((x) => regionOf(x) === 'A'))
    const vB = valueOf(next.filter((x) => regionOf(x) === 'B'))
    if (vA === a && vB === b) {
      sfx.ok()
      window.setTimeout(() => setPhase('join'), 500)
    } else if (vA > a) s.tell(`Sol bölgede ${n(vA)} var, 1. sayı ${n(a)}. Fazla bloğu Çöp’e at.`)
    else if (vB > b) s.tell(`Sağ bölgede ${n(vB)} var, 2. sayı ${n(b)}. Fazla bloğu Çöp’e at.`)
  }
  const join = () => {
    setBlocks((bl) => joinLayout(bl))
    sfx.ok()
    setPhase('read')
  }

  return (
    <Split
      work={
        <Stage className="space-y-2 p-2 sm:p-3">
          {phase === 'build' || phase === 'join' ? <RegionHeads blocks={blocks} a={a} b={b} join={phase === 'join'} onJoin={join} /> : <Counter blocks={blocks} hide={phase === 'read'} />}
          <Tuval blocks={blocks} onChange={change} onInfo={s.tell} split={phase === 'build' || phase === 'join'} sources={phase === 'build'} tools={phase === 'build'} breakable={false} locked={phase === 'join' || phase === 'done'} />
          {s.view('work')}
        </Stage>
      }
      panel={
        <>
          {phase === 'build' && <Prompt step="Kur">Tuvalin <b className="text-sky-700">soluna {n(a)}</b>, <b className="text-pink-700">sağına {n(b)}</b> sayısını bloklarla kur. Etiketler her yanda kaç olduğunu gösterir.</Prompt>}
          {phase === 'join' && <Reveal><Prompt step="Birleştir">İki sayı da hazır. Pembe <b>“2. sayı”</b> etiketini tut ve <b>“1. sayı”</b> etiketinin üstüne sürükle: bloklar bir araya gelsin.</Prompt></Reveal>}
          {s.view('panel')}
          {(phase === 'read' || phase === 'done') && (
            <Reveal>
              <div className="flex justify-center"><Written op="+" a={a} b={b} result={phase === 'done' ? digitsOf(S) : [null, null, null]} /></div>
              <DragAsk checks={checks} ask={ask} okText={`Evet! ${countsOf(blocks)[2]} yüzlük + ${countsOf(blocks)[1]} onluk + ${countsOf(blocks)[0]} birlik = ${n(S)}.`} onOk={() => setPhase('done')} />
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

/* ───────────── 4. Eldeli toplama ───────────── */

function carryPair(both: boolean) {
  for (;;) {
    const hA = rand(1, 2), hB = rand(1, 3 - hA)
    const uA = rand(3, 9), uB = rand(3, 9)
    const tA = rand(1, 8), tB = rand(1, 8)
    if (uA + uB < 11) continue
    if (both ? tA + tB + 1 < 11 : tA + tB + 1 > 9) continue
    return [num(hA, tA, uA), num(hB, tB, uB)]
  }
}

/**
 * Birleştirilmiş tuvalde basamakların yerleşmesi: sağdan sola, bir basamak ancak kendisi ve
 * sağındakilerin hepsi 10’un altına inince kâğıda yazılır.
 */
function settled(blocks: Blk[]) {
  const c = countsOf(blocks)
  const out: (number | null)[] = [null, null, null]
  for (let e = 0; e < 3; e++) {
    if (c[e] > 9) break
    out[e] = c[e]
  }
  return out
}

/** Birleştir + dönüştür akışı (4. ve 5. görev): bloklar ve kâğıttaki işlem birlikte ilerler */
function useCarry(a: number, b: number) {
  const [blocks, setBlocks] = useState<Blk[]>(() => [...build(a, 0), ...build(b, COLS / 2)])
  const [joined, setJoined] = useState(false)
  const [top, setTop] = useState<(number | null)[]>([])
  const [flash, setFlash] = useState<E | null>(null)
  const res = settled(blocks)
  const finished = joined && res.every((d) => d !== null)
  return {
    blocks,
    joined,
    top,
    flash,
    res,
    finished,
    join() {
      setBlocks((bl) => joinLayout(bl))
      setJoined(true)
      sfx.ok()
    },
    change(next: Blk[], ev: Ev) {
      setBlocks(next)
      if (ev.t === 'merge') {
        setTop((t) => {
          const x = [...t]
          x[ev.e + 1] = 1
          return x
        })
        setFlash(ev.e)
      }
    },
  }
}

function CarryBoard({ a, b, cf, s, done }: { a: number; b: number; cf: ReturnType<typeof useCarry>; s: ReturnType<typeof useSay>; done: boolean }) {
  return (
    <Stage className="space-y-2 p-2 sm:p-3">
      {cf.joined ? <Counter blocks={cf.blocks} /> : <RegionHeads blocks={cf.blocks} a={a} b={b} join onJoin={cf.join} />}
      <Tuval blocks={cf.blocks} onChange={cf.change} onInfo={s.tell} split={!cf.joined} sources={false} tools={false} breakable={false} locked={!cf.joined || done} />
      {s.view('work')}
    </Stage>
  )
}

/** Birleştirilmiş tuvalde sıradaki adım için kısa yönerge */
function carryTip(blocks: Blk[]) {
  const c = countsOf(blocks)
  if (c[0] > 9) return `Tuvalde ${c[0]} birlik var: kâğıtta birler basamağına tek rakam yazabiliriz. Birlikleri birbirine değecek biçimde yan yana getir. 10 tanesi bir araya gelince ne olacak?`
  if (c[1] > 9) return `Şimdi ${c[1]} onluk var. Onluk çubuklarını yan yana getir: 10 onluk bir araya gelince?`
  return ''
}

function CarryTask({ onDone, last }: TaskProps) {
  const [k, setK] = useState(0)
  const [pairs] = useState(() => [carryPair(false), carryPair(true)])
  const checks = useChecks()
  const rules = [
    'Birlikler 10’u geçince 10 tanesi 1 onluk olur ve onluklara katılır. Kâğıtta onlar basamağının üstüne yazdığımız küçük 1 bu onluktur (elde).',
    'Onluklar da 10’u geçerse 10 onluk 1 yüzlük olur; elde 1 yüzler basamağına gider.',
  ]
  return k < 2 ? (
    <CarryRound key={k} a={pairs[k][0]} b={pairs[k][1]} round={k} checks={checks} onNext={() => setK(k + 1)} />
  ) : (
    <div className="mx-auto max-w-2xl space-y-3">
      <RulesFound rules={rules} />
      <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
    </div>
  )
}

function CarryRound({ a, b, round, checks, onNext }: { a: number; b: number; round: number; checks: ReturnType<typeof useChecks>; onNext: () => void }) {
  const s = useSay(checks)
  const cf = useCarry(a, b)
  const [asked, setAsked] = useState(false)
  const [eldeAsk] = useState<Ask>(() => ({
    q: 'Kâğıtta onlar basamağının üstüne yazdığımız küçük 1 neyi gösteriyor?',
    options: shuffle([
      { label: 'Birliklerden gelen 1 onluğu: 10 birliği', ok: true },
      { label: '1 birliği', nudge: 'Birlikler yan yana gelince ne oluştu? O blok kaç birlik eder?', mis: 'Eldenin basamak değerini göz ardı ediyor' },
      { label: 'Bir şey göstermiyor, hatırlamak için yazılır', nudge: 'Tuvalde 10 birlik birleşince yeni bir blok oluştu. O blok nereye katıldı?' },
    ]),
  }))
  const S = a + b
  const both = round === 1
  const tip = carryTip(cf.blocks)
  const c = countsOf(cf.blocks)
  return (
    <Split
      work={<CarryBoard a={a} b={b} cf={cf} s={s} done={cf.finished} />}
      panel={
        <>
          <Prompt step={`İşlem ${round + 1} / 2`}>
            {!cf.joined ? (
              <>Tuvalde <b className="text-sky-700">{n(a)}</b> ve <b className="text-pink-700">{n(b)}</b> hazır. Pembe <b>“2. sayı”</b> etiketini <b>“1. sayı”</b> etiketinin üstüne sürükle.</>
            ) : cf.finished ? (
              <>Bütün türlerde 10’dan az blok kaldı: sonucu kâğıda yazdık. {n(a)} + {n(b)} = <b>{n(S)}</b></>
            ) : (
              tip
            )}
          </Prompt>
          <Card className="flex flex-wrap items-center justify-center gap-3">
            <Written op="+" a={a} b={b} top={cf.top} result={cf.res} />
            <p className="max-w-56 text-sm font-bold text-ink-soft">
              {cf.top[1] ? <>Onlar basamağının üstündeki küçük <b className="text-amber-600">1</b>: birliklerden gelen onluk.</> : 'Kâğıttaki işlem tuvalle birlikte dolacak.'}
              {cf.top[2] ? <> Yüzler basamağının üstündeki <b className="text-amber-600">1</b>: onluklardan gelen yüzlük.</> : null}
            </p>
          </Card>
          {cf.flash !== null && !cf.finished && (
            <p key={cf.top.join()} className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-black text-amber-900 ring-1 ring-amber-300 animate-pop">
              10 {UNIT[cf.flash].unit} → 1 {UNIT[cf.flash + 1].unit}! Kâğıtta elde 1 yazıldı. Şimdi tuvalde {c[cf.flash]} {UNIT[cf.flash].unit} var.
            </p>
          )}
          {s.view('panel')}
          {cf.finished && (
            <Reveal>
              {both && !asked ? (
                <DragAsk
                  checks={checks}
                  onOk={() => setAsked(true)}
                  okText="Evet! Elde 1, 10 birlikten oluşan onluktur; o yüzden onlar basamağına yazılır."
                  ask={eldeAsk}
                />
              ) : (
                <button type="button" onClick={onNext} className="btn-primary min-h-14 w-full text-lg animate-fade-up">{round === 0 ? 'Sıradaki işlem' : 'Devam'}</button>
              )}
            </Reveal>
          )}
        </>
      }
    />
  )
}

/* ───────────── 5. Tahmin et ve kontrol et ───────────── */

const EA = 158, EB = 267

function ErrorTask({ onDone, last }: TaskProps) {
  const checks = useChecks()
  const s = useSay(checks)
  const cf = useCarry(EA, EB)
  const [phase, setPhase] = useState<'guess' | 'check' | 'ask' | 'done'>('guess')
  const [guessAsk] = useState<Ask>(() => ({
    q: '158 + 267 işleminin sonucu hangisine yakın olmalı?',
    options: shuffle([
      { label: '400’e yakın: 150 + 250 = 400', ok: true },
      { label: '3.000’e yakın: Ali öyle buldu', nudge: '158, 200’den küçük; 267, 300’den küçük. 200 + 300 kaç eder? Toplam bundan büyük olabilir mi?', mis: 'Sonucun büyüklüğünü tahmin etmeden kabul ediyor' },
      { label: '300’e yakın: 100 + 200 = 300', nudge: '158, 100’e mi daha yakın, 200’e mi? 267, 200’e mi daha yakın, 300’e mi?' },
    ]),
  }))
  const [whyAsk] = useState<Ask>(() => ({
    q: 'Ali nerede yanıldı?',
    options: shuffle([
      { label: 'Birliklerden çıkan 1 onluğu (elde) unuttu; onluklarda da 11’in 10’unu yüzlüğe çevirmeden 11 yazdı', ok: true },
      { label: 'Yüzlükleri yanlış topladı: 1 + 2 = 3 değil', nudge: 'Tuvalde başta kaç yüzlük vardı? 1 + 2 = 3 doğru. Peki sonunda neden 4 yüzlük oldu?' },
      { label: 'Hiç yanılmadı: her basamağı doğru topladı', nudge: 'Her basamağın toplamı doğru, ama bir basamağa iki rakam yazılabilir mi? Tuvalde 11 onluk kalabildi mi?', mis: 'Basamakta 9’u geçen toplamı olduğu gibi yazmayı doğru sayıyor' },
    ]),
  }))
  const rules = ['Toplamadan önce tahmin ederim: 158 + 267, 150 + 250 = 400’e yakın olmalı. Sonuç tahminden çok uzaksa işlemi bloklarla kontrol ederim.']

  useEffect(() => {
    if (cf.finished && phase === 'check') {
      const id = window.setTimeout(() => setPhase('ask'), 600)
      return () => window.clearTimeout(id)
    }
  }, [cf.finished, phase])

  const tip = carryTip(cf.blocks)
  return (
    <Split
      work={
        phase === 'guess' ? (
          <Stage className="space-y-3 p-3 sm:p-4">
            <div className="flex flex-wrap items-start justify-center gap-4">
              <div className="text-center">
                <p className="mb-1 text-sm font-black text-ink-soft">Ali’nin kâğıdı</p>
                <Written op="+" a={EA} b={EB} result="3115" wrong />
              </div>
              <div className="max-w-xs rounded-2xl bg-amber-50 p-3 text-[15px] font-extrabold text-amber-950 ring-1 ring-amber-300">
                Ali: “Birlikleri topladım, 15 etti, 5 yazdım. Onlukları topladım, 11 etti, 11 yazdım. Yüzlükleri topladım, 3 yazdım. Sonuç 3115.”
              </div>
            </div>
          </Stage>
        ) : (
          <CarryBoard a={EA} b={EB} cf={cf} s={s} done={phase !== 'check'} />
        )
      }
      panel={
        <>
          {phase === 'guess' && (
            <>
              <Prompt step="Önce tahmin et">Ali, 158 + 267 işleminin sonucunu <b>3115</b> buldu. Hesaplamadan önce düşün: sonuç kaça yakın olmalı?</Prompt>
              <Reveal>
                <DragAsk
                  checks={checks}
                  onOk={() => setPhase('check')}
                  okText="Evet! 158 yaklaşık 150, 267 yaklaşık 250: toplam 400’e yakın olmalı. 3115 çok büyük."
                  ask={guessAsk}
                />
              </Reveal>
            </>
          )}
          {phase !== 'guess' && (
            <>
              <Prompt step="Bloklarla kontrol et">
                {!cf.joined ? <>Tuvalde 158 ve 267 hazır. Pembe <b>“2. sayı”</b> etiketini <b>“1. sayı”</b> etiketinin üstüne sürükle.</> : cf.finished ? <>Bloklar <b>{n(EA + EB)}</b> gösteriyor. Ali 3115 bulmuştu.</> : tip}
              </Prompt>
              <Card className="flex flex-wrap items-end justify-center gap-4">
                <div className="text-center">
                  <p className="mb-1 text-xs font-black text-ink-soft">Ali</p>
                  <Written op="+" a={EA} b={EB} result="3115" wrong />
                </div>
                <div className="text-center">
                  <p className="mb-1 text-xs font-black text-emerald-700">Bloklar</p>
                  <Written op="+" a={EA} b={EB} top={cf.top} result={cf.res} />
                </div>
              </Card>
            </>
          )}
          {s.view('panel')}
          {phase === 'ask' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('done')}
                okText="Doğru! 15 birlikten 10’u 1 onluk olur; o onluk onluklara katılır. 5 + 6 + 1 = 12 onluk: 10’u 1 yüzlük olur. Sonuç 425."
                ask={whyAsk}
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
        <p className="mt-3 text-sm font-bold text-amber-900">Bu kuralları ezberlemedin: hepsini blokları birleştirip bozarak kendin buldun.</p>
      </div>
      <div className="mt-4"><NextButton last onClick={onFinish} /></div>
    </div>
  )
}
