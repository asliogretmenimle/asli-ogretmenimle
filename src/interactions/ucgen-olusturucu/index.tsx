import { useMemo, useRef, useState } from 'react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { Scene, useSolutions } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { Header, NextButton, pick, rng, shuffle } from '../donusum-studyosu/ortak'
import type { Common, SelectItem, Task } from './common'
import { BuildTask, CirclesTask, RangeTask, SelectTask, SticksTask, sideItems } from './sticks'
import { TearTask, ThirdTask, TwoAnglesTask } from './angles'
import { CoincideTask, LinesTask, OutsideTask } from './lines'
import { CongruenceTask, SideAngleTask, SimilarTask } from './eight'

/**
 * 53. Üçgen Oluşturucu (5–8)
 * Kenar ve açı koşullarını değiştirerek üçgenleri araştırma:
 *  5: çubuk deneyi (iki çubuğu tabana doğru indir → kapanır mı?), üçgen eşitsizliği, pergelle (çember kesişimi) eşkenar/ikizkenar
 *  6: açıları kopar → düz doğru (180°), iki taban açısından tepe açısı (C = 90° olan çok çözüm), eksik açı problemleri
 *  7: açılar toplamı tekrar + yükseklik/kenarortay/açıortayı özelliklerinden tanıma, çakıştırma (ikizkenar), dışarıda yükseklik
 *  8: üçüncü kenarın aralığı (menteşeli çubuk), açı–kenar ilişkisi, eşlik için yeterli bilgi (KKK/KAK/AKA vs AAA/KKA), benzerlik (iki parmakla ölçekle)
 */

function angleItems(list: [number, number, number][]): SelectItem[] {
  return list.map((t) => {
    const s = t[0] + t[1] + t[2]
    const ok = s === 180
    return {
      label: t.map((v) => `${v}°`).join(' · '),
      ok,
      why: ok ? `${t.join(' + ')} = 180` : `${t.join(' + ')} = ${s}${t.filter((v) => v >= 90).length >= 2 ? ' — iki açı birden 90° ya da daha büyük olamaz' : ''}, 180 değil.`,
      mis: 'İç açıların toplamını kontrol etmeden üçgen olabilir dedi',
    }
  })
}

function makeTasks(grade: Grade): Task[] {
  const r = rng(Date.now() % 100000)
  if (grade === 5) {
    const rounds: [number, number, number][] = [
      pick([[3, 4, 6], [4, 5, 7], [3, 5, 6]] as [number, number, number][], r),
      pick([[2, 3, 8], [2, 4, 9], [1, 3, 7]] as [number, number, number][], r),
      pick([[3, 4, 7], [2, 5, 7], [4, 4, 8]] as [number, number, number][], r),
    ].map((t) => shuffle(t, r) as [number, number, number])
    return [
      { kind: 'sticks', rounds },
      { kind: 'build', longest: pick([7, 8, 9], r), goal: 3 },
      { kind: 'circles', base: 6, mode: 'eskenar', goal: 1 },
      { kind: 'circles', base: 6, mode: 'ikizkenar', goal: 3 },
      { kind: 'select', title: 'Hangileri kapanır?', prompt: 'Çubukları denemeden düşün: hangi üçlülerle üçgen kurulur? Kurulanlara dokun.', okLabel: 'kurulur', items: shuffle(sideItems([[3, 5, 7], [2, 2, 5], [4, 4, 4], [1, 6, 7], [5, 6, 10], [2, 3, 6]]), r) },
    ]
  }
  if (grade === 6) {
    const [a, b] = pick([[65, 45], [55, 75], [35, 80]] as const, r)
    const top = pick([40, 50, 30], r)
    const base = (180 - top) / 2
    return [
      { kind: 'tear' },
      { kind: 'twoAngles', base: 7, goal: 3 },
      {
        kind: 'third', angles: [a, b, 180 - a - b], labels: [`${a}°`, `${b}°`, '?'], story: `Bir üçgenin iki açısı ${a}° ve ${b}°. Üçüncü açı (C) kaç derece?`, question: 'C açısı', answer: 180 - a - b,
        traps: [
          { v: 360 - a - b, q: `${360 - a - b}° + ${a}° + ${b}° = 360°. Kopardığın üç açı tam bir tur mu oluşturdu, yoksa düz bir doğru mu?`, mis: 'Üçgenin iç açıları toplamını 360° sandı' },
          { v: a + b, q: `${a + b}°, bilinen iki açının toplamı. Üç açı birlikte kaç etmeli?` },
        ],
      },
      {
        kind: 'third', angles: [base, base, top], labels: ['?', '', `${top}°`], story: `ABC ikizkenar bir üçgen, AC = BC. Tepe açısı C = ${top}°. A açısı kaç derece?`, question: 'A açısı', answer: base,
        traps: [
          { v: 180 - top, q: `${180 - top}°, A ile B açılarının toplamı. İkizkenar üçgende bu iki açı nasıl paylaşılır?`, mis: 'İkizkenar üçgende taban açılarını ikiye bölmeyi unuttu' },
          { v: (360 - top) / 2, q: 'Üç açının toplamını 360° almış olabilir misin? Üçgenin açıları düz bir doğru oluşturuyordu.', mis: 'Üçgenin iç açıları toplamını 360° sandı' },
          { v: top, q: 'Eşit olan kenarlar AC ve BC. Eşit açılar tepe açısıyla mı, yoksa tabanda mı?' },
        ],
      },
      { kind: 'select', title: 'Üçgen olabilir mi?', prompt: 'Hangi açı üçlüleri bir üçgenin açıları olabilir? Olabilenlere dokun.', okLabel: 'olabilir', items: shuffle(angleItems([[50, 60, 70], [90, 60, 40], [100, 40, 40], [90, 90, 10], [30, 60, 80], [120, 30, 30]]), r) },
    ]
  }
  if (grade === 7) {
    const [p, q, s] = pick([[2, 3, 4], [1, 2, 3], [3, 4, 5]] as const, r)
    const x = 180 / (p + q + s)
    const lab = (k: number) => (k === 1 ? 'x' : `${k}x`)
    return [
      { kind: 'tear' },
      {
        kind: 'third', angles: [p * x, q * x, s * x], labels: [lab(p), lab(q), lab(s)], story: `Bir üçgenin açıları ${lab(p)}, ${lab(q)} ve ${lab(s)}. x kaç derecedir?`, question: 'x', answer: x,
        traps: [
          { v: 360 / (p + q + s), q: `Toplamı 360° almışsın: ${p + q + s}x = 360 mi, yoksa ${p + q + s}x = 180 mi olmalı?`, mis: 'Üçgenin iç açıları toplamını 360° sandı' },
          { v: s * x, q: `Bulduğun ${s * x}° açılardan biri (${lab(s)}). Soru x’i istiyor: ${lab(s)} = ${s * x} ise x kaç?` },
        ],
      },
      { kind: 'lines' },
      { kind: 'coincide' },
      { kind: 'outside' },
    ]
  }
  const [a, b] = pick([[5, 8], [4, 7], [6, 9]] as const, r)
  return [
    { kind: 'range', a, b },
    { kind: 'select', title: 'Kenarlar yeter mi?', prompt: 'Bu uzunluklarla (cm) bir üçgen kurulabilir mi? Kurulanlara dokun.', okLabel: 'kurulur', items: shuffle(sideItems([[2.5, 3.5, 6], [2.5, 3.5, 5.9], [1.2, 1.2, 2.3], [0.5, 4, 4.4], [3.1, 4.2, 7.3], [6, 6, 11.9]]), r) },
    { kind: 'sideAngle' },
    { kind: 'congruence' },
    { kind: 'similar', k: pick([2.5, 1.5, 2], r) },
  ]
}

const titles: Record<Task['kind'], string> = {
  sticks: 'Çubuklar kapanır mı?',
  build: 'Üçgen kuran çubuklar',
  circles: 'Pergelle üçgen',
  select: 'Hangileri?',
  tear: 'Açıları kopar',
  twoAngles: 'İki açı, bir tepe',
  third: 'Eksik açı',
  lines: 'Üç özel çizgi',
  coincide: 'Çizgileri çakıştır',
  outside: 'Dışarıdaki yükseklik',
  range: 'Üçüncü kenar ne olabilir?',
  sideAngle: 'Büyük kenar, büyük açı',
  congruence: 'Hangi bilgi yeter?',
  similar: 'Benzer üçgen',
}

const insights: Record<number, string> = {
  5: 'Üç çubuk ancak iki kısa çubuğun toplamı en uzun çubuktan büyükse üçgen olur; toplam eşitse uçlar tabanda buluşur ve düz bir çizgi oluşur. Pergelle çizilen çemberdeki her nokta merkeze aynı uzaklıktadır, bu yüzden eşit yarıçaplar eşit kenarlar verir.',
  6: 'Bir üçgenin üç iç açısını yan yana koyunca her zaman düz bir doğru (180°) oluşur; bu yüzden iki açıyı bilen üçüncüyü bulur ve bir üçgende iki dik açı olamaz.',
  7: 'İç açılar toplamı 180°’dir. Yükseklik karşı kenara dik iner, kenarortay karşı kenarı ortalar, açıortay açıyı ikiye böler; ikizkenar üçgende tepeden inen bu üç çizgi çakışır.',
  8: 'Üçüncü kenar iki kenarın farkı ile toplamı arasındadır; en uzun kenarın karşısında en büyük açı bulunur. KKK, KAK ve AKA bir üçgeni tek türlü belirler; açıları eşit üçgenler ise yalnızca benzerdir ve kenarları aynı oranda büyür.',
}

export default function UcgenOlusturucu({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade), [grade])
  const [idx, setIdx] = useState(0)
  const [solved, setSolved] = useState(false)
  const firsts = useRef<boolean[]>([])
  const sol = useSolutions()
  const dark = grade >= 7
  const task = tasks[idx]
  const last = idx === tasks.length - 1

  const onSolved = (first: boolean) => {
    if (firsts.current.length <= idx) firsts.current.push(first)
    setSolved(true)
  }
  const next = () => {
    if (!last) {
      setIdx(idx + 1)
      setSolved(false)
      return
    }
    const f = firsts.current.filter(Boolean).length
    const ways = sol.list.length
    onFinish({
      stars: starsFor((f + Math.min(1, ways * 0.15)) / tasks.length),
      summary: `${tasks.length} üçgen görevini keşfederek tamamladın${ways > 1 ? ` ve ${ways} farklı çözüm buldun` : ''}.`,
      insight: insights[grade] ?? insights[8],
    })
  }

  const footer = solved ? <NextButton last={last} onClick={next} /> : null
  const common: Common = { grade, dark, footer, onSolved, sol }
  return (
    <Scene grade={grade}>
      <Header emoji="📐" title={task.kind === 'select' ? task.title : titles[task.kind]} idx={idx} total={tasks.length} dark={dark} />
      <TaskView key={idx} task={task} {...common} />
    </Scene>
  )
}

function TaskView({ task, ...c }: { task: Task } & Common) {
  switch (task.kind) {
    case 'sticks': return <SticksTask t={task} {...c} />
    case 'build': return <BuildTask t={task} {...c} />
    case 'circles': return <CirclesTask t={task} {...c} />
    case 'select': return <SelectTask t={task} {...c} />
    case 'tear': return <TearTask t={task} {...c} />
    case 'twoAngles': return <TwoAnglesTask t={task} {...c} />
    case 'third': return <ThirdTask t={task} {...c} />
    case 'lines': return <LinesTask t={task} {...c} />
    case 'coincide': return <CoincideTask t={task} {...c} />
    case 'outside': return <OutsideTask t={task} {...c} />
    case 'range': return <RangeTask t={task} {...c} />
    case 'sideAngle': return <SideAngleTask t={task} {...c} />
    case 'congruence': return <CongruenceTask t={task} {...c} />
    case 'similar': return <SimilarTask t={task} {...c} />
  }
}
