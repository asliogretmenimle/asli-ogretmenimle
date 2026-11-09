import { useState } from 'react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { starsFor } from '../../games/kit'
import { sfx } from '../../lib/feedback'
import { Card, CheckButton, GhostButton, NextButton, Prompt, Split, Stage, pick, shuffle, useChecks } from '../donusum-studyosu/ortak'
import { Drag, DragAsk, Drop, RulesFound, TOKEN, Tray, useDnd } from '../sayilari-karsilastir/parts'
import { GTOOL, Heap, acc, Items, Plate, PlateStack, Reveal, Slot, Sticky, Table, Workshop, groupMove, rep, useSay, type TaskDef, type TaskProps } from './kit'
import { ATOOL, ArrayBoard, MiniArray, MiniGroups, RowTray, Rotator } from './dizi'

/**
 * 90. Çarpmaya Giriş: Eşit Gruplar, Tekrarlı Toplama, Dizi (2–3. sınıf, MAT.2.2.4, MAT.2.2.5, MAT.3.2.4)
 * Çocuk çarpmayı ezberlenen bir işaret olarak değil, kendi kurduğu modellerden doğan bir fikir olarak tanır.
 * Baştan sona sürükle-bırak (Polypad gibi: nesne kalkar, parmağı izler, kaba oturur ya da geri uçar);
 * her görevin üstünde amaç ve “Nasıl kullanılır?” kartı vardır.
 *  1. Eşit gruplar: tabak yığınından tabak, sepetten meyve sürükleyerek “3 tabak, her tabakta 4” kur;
 *     sonra bir tabağa 1 fazla koy: “Bu hâlâ 3 tane 4 mü? Çarpma olur mu?” ve tabakları yeniden eşitle
 *  2. Tekrarlı toplama: dolu tabakları masaya sürükledikçe 5 + 5 + 5 toplamı adım adım büyür; hedef toplama
 *     ulaşınca sayı kartlarıyla “3 tane 5” ve “3 × 5 = 15” cümlelerini kur (× burada tanıtılır: “tane”)
 *  3. Dizi: ilk sırayı tek tek diz, sıra kartını sürükleyerek sıraları ekle, diziyi 90° döndür (düğme ya da çark):
 *     3 × 4 ile 4 × 3’ün aynı sayıda nesne olduğunu gör (değişme özelliği)
 *  4. Modeller arası eşleştirme: her hikâyeye eşit grup resmi, tekrarlı toplama, dizi ve çarpma kartını sürükle
 *  5. Kendin kur: verilen çarpmayı (ör. 5 × 3) seçtiğin modelle (eşit gruplar ya da dizi) kur, iki tur
 *  Sınıfa göre: 2. sınıfta çarpanlar 2, 3, 4, 5 ve 10; 3. sınıfta 3–9. Sayılar her açılışta değişir.
 *  Son: kural defteri
 */

type Pair = [number, number]

const POOL: Record<2 | 3, { t1: Pair[]; t2: Pair[]; t3: Pair[]; t5: Pair[]; f: number[] }> = {
  2: {
    t1: [[3, 4], [4, 3], [3, 5], [2, 5], [4, 2], [5, 3]],
    t2: [[3, 5], [4, 5], [3, 10], [2, 10], [5, 2], [4, 3]],
    t3: [[3, 4], [2, 5], [3, 5], [4, 5], [2, 4], [3, 6]],
    t5: [[5, 3], [4, 2], [2, 10], [3, 4], [5, 4], [4, 5]],
    f: [2, 3, 4, 5],
  },
  3: {
    t1: [[4, 6], [5, 4], [3, 7], [6, 3], [4, 5]],
    t2: [[6, 4], [4, 7], [5, 6], [3, 8], [4, 10]],
    t3: [[4, 6], [3, 7], [5, 6], [3, 8], [4, 7]],
    t5: [[6, 4], [7, 3], [4, 8], [5, 6], [3, 9], [6, 5]],
    f: [3, 4, 5, 6, 7],
  },
}

/** Eşleştirme için çarpımları farklı, birbirinin tersi olmayan üç çarpma */
function matchSets(f: number[]): Pair[] {
  for (;;) {
    const all: Pair[] = []
    for (const a of f) for (const b of f) if (a !== b) all.push([a, b])
    const s = shuffle(all).slice(0, 3)
    const prods = new Set(s.map(([a, b]) => a * b))
    const swapped = s.some(([a, b]) => s.some(([c, d]) => a === d && b === c))
    if (prods.size === 3 && !swapped) return s
  }
}

function plan(grade: Grade) {
  const p = POOL[grade >= 3 ? 3 : 2]
  const t1 = pick(p.t1)
  const t2 = pick(p.t2.filter(([a, b]) => a * b !== t1[0] * t1[1]))
  const t3 = pick(p.t3.filter(([a, b]) => a * b !== t2[0] * t2[1]))
  const t5 = shuffle(p.t5).slice(0, 2) as Pair[]
  return { t1, t2, t3, t4: matchSets(p.f), t5, fruit: pick(['🍐', '🍋', '🍑']) }
}

const TASKS: TaskDef[] = [
  { emoji: '🍽️', title: 'Eşit gruplar kur', goal: 'Tabaklara meyve koyarak eşit gruplar kurmak; gruplar eşit olmayınca “tane” diyemeyeceğimizi keşfetmek.', tools: [GTOOL.stack, GTOOL.heap, GTOOL.plate, 'answer'] },
  { emoji: '➕', title: 'Tabak tabak topla', goal: 'Her yeni tabakla toplamın nasıl büyüdüğünü görmek; tekrarlı toplamayı “3 tane 5” ve 3 × 5 ile yazmak.', tools: [GTOOL.stack, GTOOL.num, 'answer'] },
  { emoji: '🔲', title: 'Dizi kur, döndür', goal: 'Nesneleri sıra sıra dizmek; diziyi döndürünce 3 × 4 ile 4 × 3’ün aynı sayıda nesne olduğunu görmek.', tools: [ATOOL.first, ATOOL.row, ATOOL.turn, 'answer'] },
  { emoji: '🔗', title: 'Aynı çarpma, farklı modeller', goal: 'Bir hikâyeyi eşit gruplar, tekrarlı toplama, dizi ve çarpma cümlesiyle eşleştirmek.', tools: [{ icon: <span className="text-base leading-none">🃏</span>, name: 'Model kartları', text: 'Alttaki kartlardan birini tutup ona uyan hikâyenin üstüne bırak. Önce resimler, sonra toplamalar, diziler ve çarpmalar gelir.' }] },
  { emoji: '🛠️', title: 'Çarpmayı sen kur', goal: 'Verilen çarpmayı istediğin modelle (eşit gruplar ya da dizi) kendin kurmak.', tools: [{ icon: <span className="text-base leading-none">🧩</span>, name: 'Model kartı', text: '“Eşit gruplar” ya da “Dizi” kartını “Model” kutusuna sürükle.' }, GTOOL.stack, GTOOL.heap, ATOOL.row, ATOOL.turn, 'answer'] },
]

export default function CarpmayaGiris({ grade, onFinish }: InteractionProps) {
  const [P] = useState(() => plan(grade))
  return (
    <Workshop
      grade={grade}
      tasks={TASKS}
      endNote="Bu kuralları ezberlemedin: hepsini tabakları doldurup dizileri kurarak kendin buldun."
      onEnd={(firsts, rules) =>
        onFinish({
          stars: starsFor(firsts.filter(Boolean).length / TASKS.length),
          summary: `${TASKS.length} görevde eşit gruplar, tekrarlı toplama ve dizilerle çarpmayı kendin kurdun; ${rules.length} kuralı kendin buldun.`,
          insight: `Çarpma, eşit grupları saymanın kısa yoludur: ${P.t2[0]} × ${P.t2[1]}, “${P.t2[0]} tane ${P.t2[1]}” yani ${rep(P.t2[1], P.t2[0])} = ${P.t2[0] * P.t2[1]}. Gruplar eşit değilse çarpma yazılamaz. Bir dizi döndürülünce nesne sayısı değişmez: ${P.t3[0]} × ${P.t3[1]} = ${P.t3[1]} × ${P.t3[0]}.`,
        })
      }
      render={(i, p) =>
        i === 0 ? <EqualTask {...p} g={P.t1[0]} s={P.t1[1]} />
        : i === 1 ? <AddTask {...p} g={P.t2[0]} s={P.t2[1]} />
        : i === 2 ? <ArrayTask {...p} r={P.t3[0]} c={P.t3[1]} />
        : i === 3 ? <MatchTask {...p} sets={P.t4} />
        : <BuildTask {...p} rounds={P.t5} emoji={P.fruit} />
      }
    />
  )
}

const allSame = (x: number[]) => x.every((v) => v === x[0])

/* ───────────── 1. Eşit gruplar ───────────── */

function EqualTask({ g, s, onDone, last }: TaskProps & { g: number; s: number }) {
  const checks = useChecks()
  const say = useSay(checks)
  const [gs, setGs] = useState<number[]>([0])
  const [phase, setPhase] = useState<'build' | 'ask' | 'odd' | 'ask2' | 'fix' | 'done'>('build')
  const T = g * s
  const E = '🍓'
  const rules = [
    `Eşit gruplarda her grupta aynı sayıda nesne vardır: ${g} tabak, her tabakta ${s} çilek. Buna “${g} tane ${s}” deriz.`,
    'Gruplar eşit değilse “tane” diyemeyiz: çarpma eşit gruplar için kullanılır.',
  ]

  const dnd = useDnd((item, target) => {
    if (phase === 'ask' || phase === 'ask2' || phase === 'done') return false
    const m = groupMove(gs, item, target, { max: 8, cap: 12 })
    if (!m) return false
    if ('msg' in m) return say.tell(m.msg, { at: m.at })
    say.clear()
    const x = m.gs
    setGs(x)
    if (phase === 'build') {
      if (x.length === g && x.every((v) => v === s)) {
        sfx.ok()
        window.setTimeout(() => setPhase('ask'), 450)
        return
      }
      const over = x.findIndex((v) => v > s)
      if (over >= 0) say.tell(`Bu tabakta ${x[over]} çilek oldu; her tabakta ${s} çilek olmalı. Fazlasını sepete geri sürükle.`, { at: over })
      else if (x.length > g) say.tell(`Masada ${x.length} tabak var; ${g} tabak yeter. Boş bir tabağı tabak yığınına geri sürükle.`)
    }
    if (phase === 'odd' && !allSame(x)) window.setTimeout(() => setPhase('ask2'), 450)
    if (phase === 'fix' && x.length >= 2 && x[0] > 0 && allSame(x)) {
      sfx.ok()
      window.setTimeout(() => setPhase('done'), 350)
    }
  })

  const building = phase === 'build'
  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <div className="flex gap-2">
            <Heap dnd={dnd} emoji={E} name="Çilek" wrong={say.wrong === 'heap'} />
            <PlateStack dnd={dnd} name="Tabak" />
          </div>
          <Table dnd={dnd} label={`Masa · ${gs.length} tabak`} wrong={say.wrong === 'table'}>
            {gs.map((v, i) => (
              <Plate key={i} dnd={dnd} id={`p-${i}`} count={v} emoji={E} title={`${i + 1}. tabak`} grab={`pi-${i}`} remove={gs.length > 1 ? `plate-${i}` : undefined} full={building && v === s} wrong={say.wrong === i} />
            ))}
          </Table>
          <p className={`rounded-2xl px-3 py-2 text-center text-lg font-black tabular-nums ring-1 ${gs.length > 1 && gs[0] > 0 && allSame(gs) ? 'bg-emerald-50 text-emerald-800 ring-emerald-300' : 'bg-white text-ink ring-line'}`}>
            Tabaklarda: {gs.join(' · ')} {gs.length > 1 && gs[0] > 0 && (allSame(gs) ? '→ hepsi eşit ✓' : '→ eşit değil')}
          </p>
          {say.view('work')}
        </Stage>
      }
      panel={
        <>
          {building && <Prompt step={`Kur: ${g} tabak, her tabakta ${s} çilek`}>Tabak yığınından tabak tutup <b>masaya</b> sürükle. Sonra sepetteki çilekleri tabaklara sürükle. <b>{g}</b> tabak olsun, her tabakta <b>{s}</b> çilek.</Prompt>}
          {say.view('panel')}
          {phase === 'ask' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('odd')}
                okText={`Evet! ${rep(s, g)} = ${T}. Buna “${g} tane ${s}” deriz.`}
                ask={{
                  q: `${g} tabak var, her tabakta ${s} çilek. Hepsi kaç çilek?`,
                  options: shuffleOnce(`eq-${g}-${s}`, [
                    { label: `${T} çilek`, ok: true },
                    { label: `${g + s} çilek`, nudge: `${g} ile ${acc(s)} topladın. Ama ${g} tabak sayısı, çilek değil. Tabaklardaki çilekleri tek tek say: kaç ediyor?`, mis: 'Grup sayısı ile gruptaki nesne sayısını topluyor' },
                    { label: `${s} çilek`, nudge: `${s}, bir tabaktaki çilek sayısı. Bütün tabaklarda hepsi kaç çilek var?` },
                  ]),
                }}
              />
            </Reveal>
          )}
          {phase === 'odd' && <Reveal><Prompt step="Dene">Şimdi tabaklardan <b>birine</b> 1 çilek daha koy. Tabaklar hâlâ eşit mi?</Prompt></Reveal>}
          {phase === 'ask2' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('fix')}
                okText="Doğru! Gruplar eşit değilse “tane” diyemeyiz. Bu bir çarpma olmaz."
                ask={{
                  q: `Tabaklarda şimdi ${gs.join(', ')} çilek var. Buna hâlâ “${g} tane ${s}” diyebilir miyiz? Bu çarpma olur mu?`,
                  options: shuffleOnce(`odd-${g}-${s}`, [
                    { label: 'Hayır: tabaklar eşit değil. “Tane” diyebilmek için her tabakta aynı sayıda olmalı.', ok: true },
                    { label: `Evet: hâlâ ${g} tabak var`, nudge: 'Tabak sayısı değişmedi, doğru. Peki her tabakta kaç çilek var? Hepsi aynı mı?', mis: 'Çarpma için grupların eşit olması gerektiğini fark etmiyor' },
                    { label: `Evet: artık “${g} tane ${s + 1}” oldu`, nudge: `Bütün tabaklarda mı ${s + 1} çilek var? Tabakların köşesindeki sayılara bak.` },
                  ]),
                }}
              />
            </Reveal>
          )}
          {phase === 'fix' && <Reveal><Prompt step="Yeniden eşitle">Tabakları yeniden eşit yap. Fazla çileği sepete geri sürükleyebilirsin; istersen her tabağa 1 tane daha da koyabilirsin. İkisi de olur!</Prompt></Reveal>}
          {phase === 'done' && (
            <Reveal>
              <Card><p className="text-center text-xl font-black text-emerald-800">Yine eşit gruplar: {gs.length} tane {gs[0]} 🎉</p></Card>
              <RulesFound rules={rules} />
              <NextButton last={last} onClick={() => onDone(checks.pass(), rules)} />
            </Reveal>
          )}
        </>
      }
    />
  )
}

/** Seçenek sırası her açılışta karışık, ama bileşen yeniden çizilince değişmesin */
const ORDER = new Map<string, number[]>()
function shuffleOnce<T>(key: string, a: T[]): T[] {
  if (!ORDER.has(key) || ORDER.get(key)!.length !== a.length) ORDER.set(key, shuffle(a.map((_, i) => i)))
  return ORDER.get(key)!.map((i) => a[i])
}

/* ───────────── 2. Tekrarlı toplama ───────────── */

function AddTask({ g, s, onDone, last }: TaskProps & { g: number; s: number }) {
  const checks = useChecks()
  const say = useSay(checks)
  const E = '🍎'
  const T = g * s
  const [n, setN] = useState(0)
  const [phase, setPhase] = useState<'build' | 's1' | 's2' | 'ask' | 'done'>('build')
  const [fill, setFill] = useState<Record<string, number>>({})
  const [cards] = useState(() => {
    const v = [g, s, T, g + s]
    if (new Set(v).size < 4) v.push(T + s)
    return shuffle([...new Set(v)])
  })
  const [a2] = useState(() => (g === 4 ? 5 : 4))
  const [b2] = useState(() => (s === 3 ? 2 : 3))
  const want: Record<string, number> = { a: g, b: s, c: g, d: s, e: T }
  const rules = [
    `Eşit grupları art arda toplayabilirim: ${rep(s, g)} = ${T}. Buna tekrarlı toplama denir.`,
    `× işareti “tane” demektir: ${g} × ${s}, “${g} tane ${s}” yani ${rep(s, g)} = ${T}.`,
  ]

  const dnd = useDnd((item, target) => {
    if (phase === 'build') {
      if (item === 'full' && (target === 'table' || target.startsWith('p-'))) {
        if (n >= 10) return say.tell('Masada yer kalmadı. Toplama bak: hedefi geçtin mi?')
        const k = n + 1
        say.clear()
        setN(k)
        if (k * s === T) {
          sfx.ok()
          window.setTimeout(() => setPhase('s1'), 600)
        } else if (k * s > T) say.tell(`Toplam ${k * s} oldu ama hedef ${T}. Son tabağı tabak yığınına geri sürükle.`)
        return
      }
      if (item === 'lastp' && target === 'stack') {
        say.clear()
        setN(n - 1)
        return
      }
      return false
    }
    if (!item.startsWith('num-') || !target.startsWith('sl-')) return false
    const v = Number(item.slice(4))
    const k = target.slice(3)
    if (fill[k] !== undefined) return false
    if (v !== want[k]) {
      if (k === 'a' || k === 'c') return say.nudge(v === s ? `${s}, her tabaktaki elma sayısı. Önce kaç tabak (grup) olduğunu yazarız. Masada kaç tabak var?` : 'İlk sayı kaç grup olduğunu söyler. Masadaki tabakları say.', { mis: v === s ? 'Grup sayısı ile gruptaki nesne sayısını karıştırıyor' : undefined, at: k })
      if (k === 'b' || k === 'd') return say.nudge(v === g ? `${g}, tabak sayısı. İkinci sayı her tabakta kaç elma olduğunu söyler.` : 'Bir tabakta kaç elma var?', { mis: v === g ? 'Grup sayısı ile gruptaki nesne sayısını karıştırıyor' : undefined, at: k })
      return say.nudge(v === g + s ? `${g} + ${s} = ${g + s}. Ama burada ${g} tane ${s} var: ${rep(s, g)} kaç ediyordu?` : `Toplama cümlesinin sonucuna bak: ${rep(s, g)} = ?`, { mis: v === g + s ? 'Çarpmada iki sayıyı topluyor' : undefined, at: k })
    }
    say.clear()
    sfx.ok()
    const f = { ...fill, [k]: v }
    setFill(f)
    if (phase === 's1' && f.a !== undefined && f.b !== undefined) window.setTimeout(() => setPhase('s2'), 600)
    if (phase === 's2' && f.c !== undefined && f.d !== undefined && f.e !== undefined) window.setTimeout(() => setPhase('ask'), 600)
  })

  const plateGhost = <span className="grid rounded-[2rem] bg-white p-2 ring-4 ring-amber-200"><Items emoji={E} count={s} /></span>
  const sum = n * s
  const sentence = phase !== 'build'
  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <div className="flex items-stretch gap-2">
            <Drop dnd={dnd} id="stack" className="flex min-w-0 flex-1 flex-col gap-1 rounded-2xl bg-slate-50 p-2 ring-1 ring-line">
              <p className="text-[11px] font-black tracking-wide text-ink-soft uppercase sm:text-xs">Dolu tabaklar · her birinde {s} elma</p>
              <Drag dnd={dnd} item="full" disabled={sentence} label={`${s} elmalı dolu tabak`} ghost={plateGhost} className="flex min-h-20 w-full items-center justify-center gap-3 rounded-xl bg-white p-2 ring-1 ring-line disabled:opacity-40">
                <span className="grid rounded-[1.5rem] bg-white p-1.5 ring-4 ring-amber-200"><Items emoji={E} count={s} size="sm" /></span>
                <span className="text-xs font-black text-ink-soft">tut ve masaya sürükle</span>
              </Drag>
            </Drop>
          </div>
          <Table dnd={dnd} label={`Masa · ${n} tabak`}>
            {n === 0 && <p className="py-8 text-sm font-black text-amber-800/70">Dolu tabakları buraya sürükle</p>}
            {Array.from({ length: n }, (_, i) => (
              <Plate key={i} dnd={dnd} id={`p-${i}`} count={s} emoji={E} title={`${i + 1}. tabak`} grab={!sentence && i === n - 1 ? 'lastp' : undefined} grabGhost={plateGhost} grabLabel="Son tabağı yığına geri sürükle" />
            ))}
          </Table>
          <div className="rounded-2xl bg-white px-3 py-2 text-center ring-1 ring-line">
            <p className="flex flex-wrap items-center justify-center gap-1.5 text-2xl font-black tabular-nums sm:text-3xl">
              {n === 0 ? <span className="text-base text-ink-soft">Toplam: 0</span> : Array.from({ length: n }, (_, i) => (
                <span key={i} className="flex items-center gap-1.5 animate-pop">
                  {i > 0 && <span className="text-ink-soft">+</span>}
                  <span className="rounded-xl bg-amber-100 px-2 text-amber-900">{s}</span>
                </span>
              ))}
              {n > 0 && <span className={`ml-1 ${sum === T ? 'text-emerald-700' : sum > T ? 'text-orange-600' : 'text-ink'}`}>= {sum}</span>}
            </p>
            <p className="text-sm font-extrabold text-ink-soft">Hedef: {T} elma</p>
          </div>
          {sentence && (
            <div className="space-y-3 rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-200 animate-fade-up">
              <div className="flex flex-wrap items-center justify-center gap-2 text-2xl font-black">
                <Slot dnd={dnd} id="sl-a" value={fill.a} wrong={say.wrong === 'a'} /> <span>tane</span> <Slot dnd={dnd} id="sl-b" value={fill.b} wrong={say.wrong === 'b'} /> <span>= {T}</span>
              </div>
              {phase !== 's1' && (
                <>
                  <p className="rounded-xl bg-white px-3 py-2 text-center text-base font-extrabold text-ink ring-1 ring-sky-200 animate-fade-up">Matematikte “tane” yerine <b className="text-2xl text-sky-700">×</b> yazarız. <b>{g} × {s}</b> “{g} tane {s}” diye okunur.</p>
                  <div className="flex flex-wrap items-center justify-center gap-2 text-2xl font-black animate-fade-up">
                    <Slot dnd={dnd} id="sl-c" value={fill.c} wrong={say.wrong === 'c'} /> <span className="text-sky-700">×</span> <Slot dnd={dnd} id="sl-d" value={fill.d} wrong={say.wrong === 'd'} /> <span>=</span> <Slot dnd={dnd} id="sl-e" value={fill.e} wrong={say.wrong === 'e'} />
                  </div>
                </>
              )}
            </div>
          )}
          {say.view('work')}
          {(phase === 's1' || phase === 's2') && (
            <Sticky>
              <Tray title="Sayı kartları">
                {cards.map((v) => <Drag key={v} dnd={dnd} item={`num-${v}`} label={`${v} kartı`} className={TOKEN}>{v}</Drag>)}
              </Tray>
            </Sticky>
          )}
        </Stage>
      }
      panel={
        <>
          {phase === 'build' && <Prompt step={`Hedef: ${T} elma`}>Her tabakta <b>{s}</b> elma var. Dolu tabakları tek tek masaya sürükle. Her tabakta toplam nasıl büyüyor? <b>{T}</b> elmaya ulaşınca dur.</Prompt>}
          {phase === 's1' && <Reveal><Prompt step="Cümleyi kur">{n} tabak, her tabakta {s} elma. Sayı kartlarını “?” kutularına sürükle: kaç <b>tane</b> kaç?</Prompt></Reveal>}
          {phase === 's2' && <Reveal><Prompt step="× ile yaz">Aynı cümleyi şimdi <b>×</b> ile yaz. × “tane” demek.</Prompt></Reveal>}
          {say.view('panel')}
          {phase === 'ask' && (
            <Reveal>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('done')}
                okText={`Evet! ${a2} × ${b2}, ${a2} tane ${b2} demek: ${rep(b2, a2)} = ${a2 * b2}.`}
                ask={{
                  q: `Peki ${a2} × ${b2} ne demek?`,
                  options: shuffleOnce(`x-${a2}-${b2}`, [
                    { label: `${a2} tane ${b2}: ${rep(b2, a2)}`, ok: true },
                    { label: `${a2} + ${b2}`, nudge: `× “tane” demek, + değil. ${a2} tabak düşün, her tabakta ${b2} elma: hepsini nasıl bulursun?`, mis: '× işaretini + gibi okuyor' },
                    { label: `${a2}${b2}: iki sayıyı yan yana yazarız`, nudge: `× bir sayı yazmaz, bir iş anlatır: “tane”. ${a2} tane ${b2} nasıl toplanır?`, mis: 'Çarpmayı sayıları yan yana yazmak sanıyor' },
                  ]),
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

/* ───────────── 3. Dizi ───────────── */

function ArrayTask({ r, c, onDone, last }: TaskProps & { r: number; c: number }) {
  const checks = useChecks()
  const say = useSay(checks)
  const E = '🍊'
  const T = r * c
  const [rows, setRows] = useState(1)
  const [cols, setCols] = useState(0)
  const [turned, setTurned] = useState(false)
  const [phase, setPhase] = useState<'first' | 'rows' | 'turn' | 'ask' | 'done'>('first')
  const rules = [
    `Dizide her sıra bir gruptur: ${r} sıra, her sırada ${c} → ${r} × ${c} = ${rep(c, r)} = ${T}.`,
    `Diziyi döndürünce nesne sayısı değişmez: ${r} × ${c} = ${c} × ${r} = ${T}. Çarpanların yeri değişse de sonuç aynı kalır.`,
  ]

  const dnd = useDnd((item, target) => {
    if (phase === 'first') {
      if (item === 'heap' && (target === 'row0' || target === 'board')) {
        if (cols >= c) return say.tell(`İlk sırada ${c} portakal olsun. Fazlasını ilk sıradan tutup sepete geri sürükle.`, { at: 'board' })
        say.clear()
        setCols(cols + 1)
        if (cols + 1 === c) {
          sfx.ok()
          window.setTimeout(() => setPhase('rows'), 450)
        }
        return
      }
      if (item === 'rowitem' && target === 'heap') {
        setCols(cols - 1)
        return
      }
      return false
    }
    if (phase === 'rows') {
      if (item === 'rowcard' && (target === 'board' || target === 'row0')) {
        say.clear()
        setRows(rows + 1)
        if (rows + 1 === r) {
          sfx.ok()
          window.setTimeout(() => setPhase('turn'), 500)
        }
        return
      }
      if (item === 'lastrow' && target === 'rowtray') {
        setRows(rows - 1)
        return
      }
    }
    return false
  })

  const onTurn = () => {
    setRows(cols)
    setCols(rows)
    setTurned((t) => !t)
    if (phase === 'turn') window.setTimeout(() => setPhase('ask'), 300)
  }
  const after = phase === 'turn' || phase === 'ask' || phase === 'done'
  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          {phase === 'first' && <Heap dnd={dnd} emoji={E} name="Portakal" />}
          <div className="rounded-2xl bg-white px-3 py-2 text-center ring-1 ring-line">
            {phase === 'first' ? (
              <p className="text-lg font-black">İlk sıra: <span className="tabular-nums">{cols} / {c}</span></p>
            ) : (
              <>
                <p className="text-lg font-black">{rows} sıra, her sırada {cols} portakal</p>
                <p className="text-xl font-black tabular-nums text-rose-700 sm:text-2xl">{rep(cols, rows)} = {rows * cols}{after && <span className="text-ink"> · {rows} × {cols} = {rows * cols}</span>}</p>
              </>
            )}
          </div>
          {after ? (
            <Rotator onTurn={onTurn}>
              <ArrayBoard dnd={dnd} rows={rows} cols={cols} emoji={E} />
            </Rotator>
          ) : (
            <ArrayBoard dnd={dnd} rows={rows} cols={cols} emoji={E} slots={c} building={phase === 'first'} removable={phase === 'rows'} wrong={say.wrong === 'board'} />
          )}
          {say.view('work')}
          {phase === 'rows' && <Sticky><RowTray dnd={dnd} cols={cols} emoji={E} /></Sticky>}
        </Stage>
      }
      panel={
        <>
          {phase === 'first' && <Prompt step={`İlk sıra: ${c} portakal`}>Sepetten portakalları tek tek tutup tahtadaki <b>kesikli kutulara</b> sürükle. İlk sırada <b>{c}</b> portakal olsun.</Prompt>}
          {phase === 'rows' && <Reveal><Prompt step={`Hedef: ${r} sıra`}>İlk sıra bir grup oldu. Şimdi <b>sıra kartını</b> tutup tahtaya sürükle; her seferinde bir sıra daha gelir. <b>{r}</b> sıra olsun.</Prompt></Reveal>}
          {phase === 'turn' && <Reveal><Prompt step="Döndür">Bu dizi <b>{r} × {c}</b>. Diziyi 90° döndür: düğmeye bas ya da pembe çarkı tutup çevir. Kaç sıra, her sırada kaç olacak? Portakal sayısı değişecek mi?</Prompt></Reveal>}
          {say.view('panel')}
          {phase === 'ask' && (
            <Reveal>
              <Card><p className="text-center text-base font-black">Önce: <span className="text-rose-700">{r} × {c}</span> · Şimdi: <span className="text-rose-700">{rows} × {cols}</span></p></Card>
              <DragAsk
                checks={checks}
                onOk={() => setPhase('done')}
                okText={`Evet! Döndürünce hiçbir portakal eklenmedi, çıkmadı: ${r} × ${c} = ${c} × ${r} = ${T}.`}
                ask={{
                  q: `Diziyi döndürdün: ${r} × ${c} dizisi ${c} × ${r} oldu. Portakal sayısı ne oldu?`,
                  options: shuffleOnce(`rot-${r}-${c}`, [
                    { label: `Aynı kaldı: ikisinde de ${T} portakal var`, ok: true },
                    { label: `Arttı: ${Math.max(r, c)} öne geçti, daha çok oldu`, nudge: `Döndürürken bir portakal ekledik mi? Sıraları topla: ${rep(turned ? cols : rows, turned ? rows : cols)} kaç eder?`, mis: 'Çarpanların yer değiştirmesinin sonucu değiştirdiğini sanıyor' },
                    { label: 'Azaldı: sıralar kısaldı', nudge: `Sıralar kısaldı ama sıra sayısı da arttı. İstersen yeniden döndür ve say: hepsi kaç?`, mis: 'Çarpanların yer değiştirmesinin sonucu değiştirdiğini sanıyor' },
                  ]),
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

/* ───────────── 4. Modelleri eşleştir ───────────── */

const STORIES: { e: string; t: (g: number, s: number) => string }[] = [
  { e: '🍓', t: (g, s) => `${g} tabağın her birinde ${s} çilek var.` },
  { e: '🎈', t: (g, s) => `${g} çocuğun her birinin ${s} balonu var.` },
  { e: '✏️', t: (g, s) => `${g} kutunun her birinde ${s} kalem var.` },
  { e: '🐞', t: (g, s) => `${g} yaprağın her birinde ${s} uğur böceği var.` },
  { e: '⚽', t: (g, s) => `${g} filenin her birinde ${s} top var.` },
]
type MType = 'g' | 'a' | 'd' | 'x'
const MT: { t: MType; name: string; short: string }[] = [
  { t: 'g', name: 'Eşit grup resimleri', short: 'Resim' },
  { t: 'a', name: 'Tekrarlı toplamalar', short: 'Toplama' },
  { t: 'd', name: 'Diziler', short: 'Dizi' },
  { t: 'x', name: 'Çarpmalar', short: 'Çarpma' },
]

function MatchTask({ sets, onDone, last }: TaskProps & { sets: Pair[] }) {
  const checks = useChecks()
  const say = useSay(checks)
  const [stories] = useState(() => shuffle(STORIES).slice(0, 3))
  /** Dizi kartlarından biri döndürülmüş gelir: sıra sayısı ile grup sayısı aynı olmak zorunda değil */
  const [flip] = useState(() => sets.map(() => Math.random() < 0.34))
  const [order] = useState(() => MT.map(() => shuffle([0, 1, 2])))
  const [placed, setPlaced] = useState<Record<string, true>>({})
  const stage = MT.findIndex((m) => [0, 1, 2].some((j) => !placed[`${m.t}-${j}`]))
  const done = stage < 0
  const rules = ['Aynı çarpma farklı modellerle gösterilebilir: hikâye, eşit gruplar, tekrarlı toplama, dizi. Hepsinde “kaç grup, her grupta kaç?” sorusunu sorarım.']

  const view = (t: MType, j: number, small?: boolean) => {
    const [g, s] = sets[j]
    if (t === 'g') return <MiniGroups g={g} s={s} />
    if (t === 'a') return <span className={`font-black tabular-nums ${small ? 'text-sm' : 'text-lg'}`}>{rep(s, g)}</span>
    if (t === 'd') return flip[j] ? <MiniArray r={s} c={g} /> : <MiniArray r={g} c={s} />
    return <span className={`font-black tabular-nums ${small ? 'text-base' : 'text-2xl'}`}>{g} × {s}</span>
  }

  const dnd = useDnd((item, target) => {
    if (!item.startsWith('mc-') || !target.startsWith('st-')) return false
    const [, t, raw] = item.split('-')
    const j = Number(raw)
    const i = Number(target.slice(3))
    const [g, s] = sets[j]
    const [sg, ss] = sets[i]
    if (i !== j) {
      const mis = g === ss || s === sg ? 'Grup sayısı ile gruptaki nesne sayısını karıştırıyor' : undefined
      const q =
        t === 'g' ? `Bu resimde ${g} grup var, her grupta ${s}. Hikâyede kaç grup, her grupta kaç tane var?`
        : t === 'a' ? `Bu toplamada ${g} tane ${s} toplanıyor. Hikâyede kaç tane kaç var?`
        : t === 'd' ? `Bu dizide ${flip[j] ? s : g} sıra var, her sırada ${flip[j] ? g : s}: hepsi ${g * s}. Hikâyede hepsi kaç?`
        : `${g} × ${s}, “${g} tane ${s}” demek. Hikâyede kaç tane kaç var?`
      return say.nudge(q, { mis, at: `st-${i}` })
    }
    say.clear()
    sfx.ok()
    setPlaced((p) => ({ ...p, [`${t}-${j}`]: true }))
  })

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <div className="grid gap-2 md:grid-cols-3">
            {stories.map((st, i) => {
              const [g, s] = sets[i]
              const full = MT.every((m) => placed[`${m.t}-${i}`])
              return (
                <Drop key={i} dnd={dnd} id={`st-${i}`} className={`flex flex-col gap-2 rounded-2xl p-3 ring-2 ${full ? 'bg-emerald-50 ring-emerald-400' : 'bg-white ring-line'} ${say.wrong === `st-${i}` ? 'animate-shake ring-4! ring-amber-400!' : ''}`}>
                  <p className="text-base leading-snug font-black"><span className="mr-1 text-2xl">{st.e}</span>{st.t(g, s)} Hepsi kaç?</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {MT.map((m) => (placed[`${m.t}-${i}`] ? (
                      <span key={m.t} className="grid min-h-10 place-items-center rounded-xl bg-white px-2 py-1 ring-1 ring-emerald-300 animate-pop">{view(m.t, i, true)}</span>
                    ) : (
                      <span key={m.t} className="grid h-10 min-w-12 place-items-center rounded-xl border-2 border-dashed border-slate-300 text-[10px] font-black text-slate-400">{m.short}</span>
                    )))}
                  </div>
                  {full && <p className="text-lg font-black text-emerald-800 animate-fade-up">{g} × {s} = {rep(s, g)} = {g * s}</p>}
                </Drop>
              )
            })}
          </div>
          {say.view('work')}
          {!done && (
            <Sticky>
              <Tray title={`${MT[stage].name} · ${stage + 1} / ${MT.length}`}>
                {order[stage].map((j) => {
                  const t = MT[stage].t
                  return placed[`${t}-${j}`] ? null : (
                    <Drag key={`${t}-${j}`} dnd={dnd} item={`mc-${t}-${j}`} label={`${MT[stage].name}: kart ${j + 1}`} className="grid min-h-16 min-w-20 place-items-center rounded-2xl bg-white px-3 py-2 shadow-[0_3px_0_#cbd5e1] ring-2 ring-line">
                      {view(t, j)}
                    </Drag>
                  )
                })}
              </Tray>
            </Sticky>
          )}
        </Stage>
      }
      panel={
        <>
          <Prompt step={done ? 'Tamam' : `${MT[stage].name}`}>{done ? 'Her hikâye dört farklı biçimde gösterildi.' : <>Alttaki her kartı ona uyan <b>hikâyenin</b> üstüne sürükle. Kendine sor: kaç grup var, her grupta kaç tane var?</>}</Prompt>
          {say.view('panel')}
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

/* ───────────── 5. Kendin kur ───────────── */

function BuildTask({ rounds, emoji: E, onDone, last }: TaskProps & { rounds: Pair[]; emoji: string }) {
  const checks = useChecks()
  const say = useSay(checks)
  const [k, setK] = useState(0)
  const [model, setModel] = useState<'g' | 'd' | null>(null)
  const [used, setUsed] = useState<('g' | 'd')[]>([])
  const [gs, setGs] = useState<number[]>([])
  const [rows, setRows] = useState(1)
  const [cols, setCols] = useState(0)
  const [phase, setPhase] = useState<'pick' | 'build' | 'ask' | 'ok' | 'done'>('pick')
  const [a, b] = rounds[Math.min(k, rounds.length - 1)]
  const T = a * b
  const rules = [`Bir çarpmayı istediğim modelle kurabilirim: ${a} × ${b}, ${a} tabak ve her tabakta ${b}; ya da ${a} sıra ve her sırada ${b} demektir.`]

  const reset = () => {
    setGs([])
    setRows(1)
    setCols(0)
  }
  const dnd = useDnd((item, target) => {
    if (phase === 'pick') {
      if (target !== 'model' || !item.startsWith('model-')) return false
      say.clear()
      sfx.ok()
      setModel(item.slice(6) as 'g' | 'd')
      reset()
      setPhase('build')
      return
    }
    if (phase !== 'build') return false
    if (model === 'g') {
      const m = groupMove(gs, item, target, { max: 10, cap: 12 })
      if (!m) return false
      if ('msg' in m) return say.tell(m.msg, { at: m.at })
      say.clear()
      setGs(m.gs)
      return
    }
    if (item === 'heap' && (target === 'row0' || target === 'board') && rows === 1) {
      if (cols >= 10) return say.tell('Bir sırada en çok 10 tane olabilir.')
      setCols(cols + 1)
      return
    }
    if (item === 'rowitem' && target === 'heap') return void setCols(cols - 1)
    if (item === 'rowcard' && (target === 'board' || target === 'row0')) {
      if (rows >= 10) return say.tell('Tahtada yer kalmadı. Kaç sıra gerekiyordu?')
      setRows(rows + 1)
      return
    }
    if (item === 'lastrow' && target === 'rowtray') return void setRows(rows - 1)
    return false
  })

  const check = () => {
    if (model === 'g') {
      if (gs.length === a && gs.every((v) => v === b)) return win()
      if (gs.length === b && gs.every((v) => v === a)) return say.tell(`Sen ${b} tane ${a} kurdun. Hepsi yine ${T} ama ${a} × ${b}, “${a} tane ${b}” demek: ${a} tabak, her tabakta ${b}.`)
      if (gs.length > 1 && !allSame(gs)) return say.nudge(`Tabaklarda ${gs.join(', ')} var. Tabaklar eşit mi? ${a} × ${b} için her tabakta aynı sayıda olmalı.`, { mis: 'Eşit olmayan gruplarla çarpma kuruyor' })
      return say.nudge(`${a} × ${b}: kaç tabak gerekir, her tabağa kaç tane koymalısın? Masada ${gs.length} tabak var.`)
    }
    if (rows === a && cols === b) return win()
    if (rows === b && cols === a) return say.tell(`Senin dizinde ${rows} sıra, her sırada ${cols} var: ${rows} × ${cols}. Hepsi yine ${T}! ${a} × ${b} için diziyi döndür: ${a} sıra, her sırada ${b}.`)
    return say.nudge(`${a} × ${b}: ${a} sıra olmalı, her sırada ${b}. Senin dizinde ${rows} sıra, her sırada ${cols} var.`, { mis: rows * cols === a + b ? 'Çarpmada iki sayıyı topluyor' : undefined })
  }
  const win = () => {
    say.clear()
    sfx.ok()
    setUsed((u) => [...u, model!])
    setPhase('ask')
  }
  const nextRound = () => {
    if (k + 1 >= rounds.length) return setPhase('done')
    setK(k + 1)
    setModel(null)
    reset()
    setPhase('pick')
  }

  const modelCard = (m: 'g' | 'd') => (
    <Drag key={m} dnd={dnd} item={`model-${m}`} label={m === 'g' ? 'Eşit gruplar modeli' : 'Dizi modeli'} className="flex min-h-16 min-w-36 items-center gap-2 rounded-2xl bg-white px-3 py-2 text-left text-base font-black text-ink shadow-[0_3px_0_#cbd5e1] ring-2 ring-line">
      <span className="text-3xl" aria-hidden>{m === 'g' ? '🍽️' : '🔲'}</span>{m === 'g' ? 'Eşit gruplar' : 'Dizi'}
    </Drag>
  )

  return (
    <Split
      work={
        <Stage className="space-y-3 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-line">
            <span className="text-4xl font-black tabular-nums text-sky-700">{a} × {b}</span>
            <span className="text-base font-extrabold text-ink-soft">“{a} tane {b}”</span>
            {phase === 'pick' ? (
              <Drop dnd={dnd} id="model" className="grid min-h-16 min-w-40 place-items-center rounded-2xl border-2 border-dashed border-sky-400 bg-sky-50 px-3 text-sm font-black text-sky-600">Model kartını buraya sürükle</Drop>
            ) : (
              <span className="rounded-2xl bg-sky-100 px-3 py-2 text-base font-black text-sky-800">{model === 'g' ? '🍽️ Eşit gruplar' : '🔲 Dizi'}</span>
            )}
          </div>
          {phase !== 'pick' && model === 'g' && (
            <>
              <div className="flex gap-2">
                <Heap dnd={dnd} emoji={E} name="Meyve" />
                <PlateStack dnd={dnd} name="Tabak" disabled={phase !== 'build'} />
              </div>
              <Table dnd={dnd} label={`Masa · ${gs.length} tabak`} wrong={say.wrong === 'table'}>
                {gs.length === 0 && <p className="py-8 text-sm font-black text-amber-800/70">Tabak yığınından tabak sürükle</p>}
                {gs.map((v, i) => <Plate key={i} dnd={dnd} id={`p-${i}`} count={v} emoji={E} title={`${i + 1}. tabak`} grab={phase === 'build' ? `pi-${i}` : undefined} remove={phase === 'build' ? `plate-${i}` : undefined} wrong={say.wrong === i} />)}
              </Table>
            </>
          )}
          {phase !== 'pick' && model === 'd' && (
            <>
              {rows === 1 && phase === 'build' && <Heap dnd={dnd} emoji={E} name="Meyve" />}
              <p className="rounded-2xl bg-white px-3 py-2 text-center text-lg font-black ring-1 ring-line">{rows} sıra, her sırada {cols}</p>
              <Rotator onTurn={() => { setRows(cols); setCols(rows) }} disabled={phase !== 'build' || cols === 0}>
                <ArrayBoard dnd={dnd} rows={rows} cols={cols} emoji={E} slots={rows === 1 ? Math.min(10, Math.max(cols + 1, 3)) : 0} building={rows === 1 && phase === 'build'} removable={phase === 'build'} />
              </Rotator>
            </>
          )}
          {say.view('work')}
          {phase === 'pick' && (
            <Sticky>
              <Tray title="Model kartları">
                {modelCard('g')}
                {modelCard('d')}
              </Tray>
            </Sticky>
          )}
          {phase === 'build' && model === 'd' && <Sticky><RowTray dnd={dnd} cols={cols} emoji={E} disabled={cols === 0} note={rows === 1 ? '· önce ilk sırayı diz' : ''} /></Sticky>}
        </Stage>
      }
      panel={
        <>
          <Prompt step={`Çarpma ${k + 1} / ${rounds.length}`}>
            {phase === 'pick' ? (
              <><b>{a} × {b}</b> çarpmasını kur. Hangi modelle kurmak istersin? Bir model kartını tutup “Model” kutusuna sürükle.{k > 0 && used.length > 0 && <> İstersen bu kez öteki modeli dene.</>}</>
            ) : model === 'g' ? (
              <><b>{a} × {b}</b>, “{a} tane {b}” demek. Tabakları masaya sürükle, meyveleri tabaklara koy. Bitince “Kontrol et”e bas.</>
            ) : (
              <><b>{a} × {b}</b>: önce ilk sırayı meyvelerle diz, sonra sıra kartıyla sıraları ekle. Gerekirse diziyi döndür. Bitince “Kontrol et”e bas.</>
            )}
          </Prompt>
          {phase === 'build' && (
            <div className="flex flex-col gap-2">
              <CheckButton onClick={check} />
              <GhostButton onClick={() => { say.clear(); setModel(null); reset(); setPhase('pick') }}>Modeli değiştir</GhostButton>
            </div>
          )}
          {say.view('panel')}
          {phase === 'ask' && (
            <Reveal>
              <DragAsk
                key={k}
                checks={checks}
                onOk={() => setPhase('ok')}
                okText={`Evet! ${a} × ${b} = ${rep(b, a)} = ${T}.`}
                ask={{
                  q: `Harika, ${a} × ${b} kuruldu! Hepsi kaç ${E}?`,
                  options: shuffleOnce(`b-${a}-${b}`, [
                    { label: String(T), ok: true },
                    { label: String(a + b), nudge: `${a} + ${b} = ${a + b}. Ama ${a} tane ${b} var: ${rep(b, a)} kaç eder?`, mis: 'Çarpmada iki sayıyı topluyor' },
                    { label: String(T + b), nudge: `Bir grup fazla saymış olabilir misin? ${a} grubu tek tek say.` },
                  ]),
                }}
              />
            </Reveal>
          )}
          {phase === 'ok' && (
            <Reveal>
              <Card><p className="text-center text-xl font-black text-emerald-800">{a} × {b} = {rep(b, a)} = {T}</p></Card>
              <NextButton last={false} onClick={nextRound} />
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
