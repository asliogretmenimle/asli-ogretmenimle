import type { Grade } from '../../../data/types'
import { ek } from '../../../lib/generators'
import { repValue, type Car, type Rep } from './reps'

/**
 * Sayı Treni seviyeleri.
 *  couple  — lokomotifteki sayıyla aynı değerdeki vagonları bağla (her farklı temsil = yeni çözüm)
 *  range   — koşula uyan (… büyük, … küçük) vagonları bağla (her farklı sayı = yeni çözüm)
 *  missing — dizideki eksik vagonları bul (bir fazlası/eksiği, onar, beşer, komşular)
 *  order   — vagonları küçükten büyüğe diz (sıra sayıları)
 *  load    — boş vagona onluk ve birlik yükle (her farklı ayrıştırma = yeni vagon)
 */

export type Kind = 'couple' | 'range' | 'missing' | 'order' | 'load'
export type Stage = 'Somut' | 'Model' | 'Sembol' | 'Problem'

export interface Slot {
  fixed?: Car
  answer?: number
  tag?: string
}

export interface Level {
  kind: Kind
  stage: Stage
  title: string
  prompt: string
  hints: string[]
  goal: number
  yard: Car[]
  target?: number
  range?: [number, number]
  slots?: Slot[]
  /** missing: dizinin adımı (komşular için 0) */
  step?: number
  /** lokomotif plakası */
  plate: string
  /** istasyon tabelası */
  board?: string[]
  note: string
  picker?: { q: string; options: string[] }
  /** başarıda otomatik yazılan strateji */
  auto?: string
}

const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]
export function shuffle<T>(xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
export const rev = (n: number) => Number(String(n).split('').reverse().join(''))

let uid = 0
/** Depo vagonları: renkler sırayla değişsin ki yan yana aynı renk az olsun */
function cars(reps: Rep[]): Car[] {
  const out = shuffle(reps).map((rep) => ({ id: `c${++uid}`, rep, color: 0 }))
  const c0 = rnd(0, 5)
  out.forEach((c, i) => (c.color = (c0 + i) % 6))
  return out
}
const car = (rep: Rep, color = rnd(0, 5)): Car => ({ id: `c${++uid}`, rep, color })

/** Bir sayı için uygun (≤ sınırlar) görsel temsiller — 1. sınıf */
function g1Reps(n: number): Rep[] {
  const out: Rep[] = [{ k: 'num', n }, { k: 'frame', n }]
  if (n <= 10) out.push({ k: 'dots', n, style: 'five' })
  if (n <= 12) out.push({ k: 'dots', n, style: 'dice' })
  if (n > 10 && n <= 16) out.push({ k: 'dots', n, style: 'ten' })
  if (n >= 3) out.push({ k: 'tally', n })
  out.push({ k: 'word', n })
  return out
}

function g1Couple(n: number): Level {
  const correct = shuffle(g1Reps(n)).slice(0, 5)
  const near = n + pick([-1, 1])
  const traps: Rep[] = [
    { k: 'frame', n: near },
    { k: 'dots', n: n + (near > n ? -1 : 1), style: n + 1 <= 10 ? 'five' : 'dice' },
    { k: 'tally', n: n - 2 },
  ]
  return {
    kind: 'couple',
    stage: 'Model',
    title: 'Aynı sayı, farklı görünüş',
    prompt: `Lokomotifte ${n} yazıyor. ${n} gösteren vagonları bağla. 3 farklı vagon bul!`,
    hints: [
      'Bir vagonu seç. İçinde kaç tane var?',
      `Onluk çerçevede boş karelere bak. 10’dan kaç eksik?`,
      'Noktaları 5’li grup gibi gör. 5 ve birkaç tane daha…',
    ],
    goal: 3,
    yard: cars([...correct, ...traps]),
    target: n,
    plate: String(n),
    board: ['Lokomotif', `${n} istiyor`],
    note: `Rakam, nokta, çerçeve, çetele… Hepsi ${n}!`,
    picker: { q: 'Çerçevedeki sayıyı nasıl buldun?', options: ['Tek tek saydım', '5’ten devam ettim', 'Boş karelere baktım', 'Bakınca gördüm'] },
  }
}

function g1Teen(n: number): Level {
  const o = n - 10
  const correct: Rep[] = shuffle<Rep>([
    { k: 'frame', n },
    { k: 'dots', n, style: 'ten' },
    { k: 'exp', parts: [10, o] },
    { k: 'tally', n },
    { k: 'word', n },
  ]).slice(0, 4)
  const traps: Rep[] = [
    { k: 'num', n: rev(n) },
    { k: 'exp', parts: [1, o] },
    { k: 'frame', n: n + pick([-1, 1]) },
  ]
  return {
    kind: 'couple',
    stage: 'Model',
    title: '10 ve birkaç tane',
    prompt: `Bu tren ${n} yolcu taşıyor. ${n} gösteren vagonları bağla. 3 farklı vagon bul!`,
    hints: ['Dolu bir onluk çerçeve 10 eder. Yanında kaç tane var?', `${n} = 10 ve ${o} demek. Hangi vagonda 10 ve ${o} var?`, `“${rev(n)}” ile “${n}” aynı mı? Rakamların yerine bak.`],
    goal: 3,
    yard: cars([{ k: 'num', n }, ...correct, ...traps]),
    target: n,
    plate: String(n),
    board: ['Lokomotif', `${n} istiyor`],
    note: `${n} = 10 + ${o}. Bir onluk ve ${o} birlik!`,
  }
}

function g1Range(): Level {
  const lo = pick([4, 5, 6])
  const hi = lo + 5
  const inside = shuffle([lo + 1, lo + 2, lo + 3, lo + 4])
  const repsIn: Rep[] = inside.map((n, i) => (i === 0 ? { k: 'frame', n } : i === 1 ? { k: 'dots', n, style: 'five' } : i === 2 ? { k: 'num', n } : { k: 'tally', n }))
  const traps: Rep[] = [{ k: 'num', n: lo }, { k: 'frame', n: hi }, { k: 'dots', n: lo - 2, style: 'dice' }, { k: 'num', n: hi + 3 }]
  return {
    kind: 'range',
    stage: 'Problem',
    title: 'Kimler binebilir?',
    prompt: `Bu trene ${ek(lo, 'abl')} büyük, ${ek(hi, 'abl')} küçük sayılar biner. 3 farklı sayı bul!`,
    hints: [`${lo} trene binebilir mi? ${lo}, ${ek(lo, 'abl')} büyük mü?`, `${ek(lo, 'abl')} sonra hangi sayı gelir?`, `${lo} ile ${hi} arasındaki sayıları say.`],
    goal: 3,
    yard: cars([...repsIn, ...traps]),
    range: [lo, hi],
    plate: '?',
    board: [`${ek(lo, 'abl')} büyük`, `${ek(hi, 'abl')} küçük`],
    note: `${lo} ile ${hi} arasında ${hi - lo - 1} sayı var: ${Array.from({ length: hi - lo - 1 }, (_, i) => lo + 1 + i).join(', ')}.`,
    picker: { q: 'Nasıl karar verdin?', options: ['Sayı doğrusunu düşündüm', 'Saydım', '5 ve 10’a göre baktım'] },
  }
}

function g1FrameSeq(): Level {
  const s = rnd(2, 5)
  const seq = Array.from({ length: 5 }, (_, i) => s + i)
  const gaps = [2, 4]
  const slots: Slot[] = seq.map((n, i) => (gaps.includes(i) ? { answer: n } : { fixed: car({ k: 'frame', n }, i) }))
  const traps: Rep[] = [{ k: 'frame', n: s + 3 }, { k: 'frame', n: s + 5 }]
  return {
    kind: 'missing',
    stage: 'Model',
    title: 'Bir fazlası',
    prompt: 'Her vagonda yolcular artıyor. Eksik vagonları bul!',
    hints: ['Yan yana iki vagona bak. Ne değişti?', 'Her vagonda bir yolcu fazla. Boş vagonda kaç yolcu olmalı?'],
    goal: 2,
    yard: cars([{ k: 'frame', n: s + 2 }, { k: 'frame', n: s + 4 }, ...traps]),
    slots,
    step: 1,
    plate: '+1',
    board: ['Her vagonda', 'bir yolcu fazla'],
    note: `${seq.join(', ')}: her vagon bir fazlası!`,
    auto: 'Bir fazlası / bir eksiği',
  }
}

function g1Back(): Level {
  const e = rnd(17, 20)
  const seq = Array.from({ length: 5 }, (_, i) => e - i)
  const gaps = [2, 4]
  const slots: Slot[] = seq.map((n, i) => (gaps.includes(i) ? { answer: n } : { fixed: car({ k: 'num', n }, i + 2) }))
  const traps: Rep[] = [{ k: 'num', n: e + 1 }, { k: 'num', n: rev(e - 4) !== e - 4 ? rev(e - 4) : e - 7 }]
  return {
    kind: 'missing',
    stage: 'Sembol',
    title: 'Geri sayım',
    prompt: `Tren ${ek(e, 'abl')} geriye sayıyor. Eksik vagonları bul!`,
    hints: [`${e}, ${e - 1}, … Sonra hangi sayı gelir?`, 'Geriye sayınca sayı bir azalır.'],
    goal: 2,
    yard: cars([{ k: 'num', n: e - 2 }, { k: 'num', n: e - 4 }, ...traps]),
    slots,
    step: -1,
    plate: '−1',
    board: ['Geri sayım', `${e}, ${e - 1}, …`],
    note: `${seq.join(', ')}: her vagon bir eksiği!`,
    auto: 'Geriye ritmik sayma',
  }
}

function orderLevel(grade: Grade): Level {
  let vals: number[]
  let reps: Rep[]
  if (grade <= 1) {
    const a = rnd(3, 6)
    const b = rnd(a + 2, 9)
    const c = rnd(11, 14)
    const d = rnd(c + 2, 19)
    vals = [a, b, c, d]
    const sh = shuffle(vals)
    reps = [{ k: 'frame', n: sh[0] }, { k: 'num', n: sh[1] }, sh[2] <= 10 ? { k: 'dots', n: sh[2], style: 'five' } : { k: 'tally', n: sh[2] }, sh[3] <= 12 ? { k: 'dots', n: sh[3], style: 'dice' } : { k: 'frame', n: sh[3] }]
  } else {
    const a = rnd(2, 4)
    const b = rnd(6, 9)
    const c = pick([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x !== a && x !== b))
    vals = [a * 10 + b, b * 10 + a, a * 10 + c, rnd(a + 1, b - 1) * 10 + rnd(1, 9)]
    const sh = shuffle(vals)
    const t = (n: number) => Math.floor(n / 10)
    reps = [{ k: 'b10', t: t(sh[0]), o: sh[0] % 10 }, { k: 'num', n: sh[1] }, { k: 'exp', parts: [t(sh[2]) * 10, sh[2] % 10] }, { k: 'word', n: sh[3] }]
  }
  return {
    kind: 'order',
    stage: 'Problem',
    title: 'Sıraya diz',
    prompt: grade <= 1 ? 'Vagonları küçükten büyüğe diz. En küçük sayı 1. vagon olsun.' : 'Vagonları küçükten büyüğe diz: 1. vagon en küçük, 4. vagon en büyük olsun.',
    hints: grade <= 1 ? ['Hangi vagonlar 10’dan büyük?', 'İki vagonu karşılaştır: hangisinde daha çok var?'] : ['Önce onluklara bak: hangisinde en az onluk var?', 'Onlukları aynı olan iki sayıda birliklere bak.'],
    goal: 1,
    yard: cars(reps),
    slots: [1, 2, 3, 4].map((i) => ({ tag: `${i}.` })),
    plate: grade <= 1 ? '1 → 4' : 'küçük → büyük',
    board: ['Küçükten', 'büyüğe'],
    note: `${[...vals].sort((x, y) => x - y).join(' < ')}`,
    picker: grade <= 1 ? { q: 'Nasıl sıraladın?', options: ['Önce 10’dan küçükleri seçtim', 'Saydım', 'Sayı doğrusunu düşündüm', '5 ve 10’a göre baktım'] } : { q: 'Nasıl sıraladın?', options: ['Önce onluklara baktım', 'Sayı doğrusunu düşündüm', 'Blokları karşılaştırdım', 'Birliklere baktım'] },
  }
}

/* ───────────────────────────── 2. sınıf ───────────────────────────── */

function g2Load(): Level {
  const t = rnd(2, 4)
  const o = rnd(2, 7)
  const n = t * 10 + o
  return {
    kind: 'load',
    stage: 'Somut',
    title: 'Vagonu yükle',
    prompt: `${n} yolcu yola çıkacak. Vagona onluk ve birlik yükle. ${n} etmenin 3 farklı yolunu bul!`,
    hints: [`${n} kaç onluk, kaç birlik?`, 'Bir onluğu boz: 10 birlik olur. Sayı değişir mi?', `${t - 1} onlukla ${n} etmek için kaç birlik gerekir?`],
    goal: 3,
    yard: [],
    target: n,
    plate: String(n),
    board: ['Lokomotif', `${n} istiyor`],
    note: `${t} onluk ${o} birlik = ${t - 1} onluk ${o + 10} birlik. Bir onluğu bozmak sayıyı değiştirmez!`,
    auto: 'Esnek basamak değeri (onluğu bozma)',
  }
}

function g2Couple(): Level {
  let t = rnd(3, 8)
  let o = rnd(2, 8)
  if (t === o) o = o === 8 ? 2 : o + 1
  const n = t * 10 + o
  const correct = shuffle<Rep>([
    { k: 'num', n },
    { k: 'b10', t, o },
    { k: 'b10', t: t - 1, o: o + 10 },
    { k: 'exp', parts: [t * 10, o] },
    { k: 'exp', parts: [(t - 1) * 10, o + 10] },
    { k: 'place', t, o },
    { k: 'word', n },
  ]).slice(0, 6)
  const traps: Rep[] = [{ k: 'num', n: rev(n) }, { k: 'exp', parts: [t, o] }, { k: 'b10', t, o: o - 1 }, { k: 'place', t: o, o: t }]
  return {
    kind: 'couple',
    stage: 'Model',
    title: 'Aynı sayı, farklı vagon',
    prompt: `Lokomotifte ${n} yazıyor. ${n} gösteren vagonları bağla. 4 farklı vagon bul!`,
    hints: ['Onlukları 10, 20, 30… diye say; sonra birlikleri ekle.', `${t * 10} + ${o} ile ${(t - 1) * 10} + ${o + 10} aynı mı? Neden?`, `${n} ile ${rev(n)} aynı mı? Onlar basamağına bak.`],
    goal: 4,
    yard: cars([...correct, ...traps]),
    target: n,
    plate: String(n),
    board: ['Lokomotif', `${n} istiyor`],
    note: `${n} = ${t * 10} + ${o} = ${(t - 1) * 10} + ${o + 10}: aynı sayı, farklı yazılış!`,
    picker: { q: 'Vagonları nasıl tanıdın?', options: ['Onlukları 10’ar saydım', 'Onluk ve birlikleri ayırdım', 'Toplamı hesapladım', 'Rakamların yerine baktım'] },
  }
}

function g2Tens(): Level {
  const s = rnd(1, 4) * 10 + rnd(1, 9)
  const seq = Array.from({ length: 5 }, (_, i) => s + 10 * i)
  const gaps = [2, 4]
  const slots: Slot[] = seq.map((n, i) =>
    gaps.includes(i) ? { answer: n } : { fixed: car(i % 2 === 0 ? { k: 'b10', t: Math.floor(n / 10), o: n % 10 } : { k: 'num', n }, i) },
  )
  const a = s + 20
  const b = s + 40
  const traps: Rep[] = [...new Set([s + 11, b + 1, rev(a)])].filter((n) => n !== a && n !== b && n < 100).map((n) => ({ k: 'num', n }) as Rep)
  return {
    kind: 'missing',
    stage: 'Sembol',
    title: 'Onar onar',
    prompt: 'Vagonlar bir kurala göre dizilmiş. Kuralı keşfet, eksik vagonları bul!',
    hints: ['Yan yana iki vagona bak. Ne değişti: onluklar mı, birlikler mi?', `${s} ile ${s + 10} arasında kaç onluk fark var?`],
    goal: 2,
    yard: cars([{ k: 'num', n: a }, { k: 'b10', t: Math.floor(b / 10), o: b % 10 }, ...traps]),
    slots,
    step: 10,
    plate: '?',
    board: ['Kuralı', 'keşfet!'],
    note: `${seq.join(', ')}: her vagonda bir onluk arttı, birlikler hep ${s % 10}!`,
    auto: 'Onar ritmik sayma',
    picker: { q: 'Kuralı nasıl buldun?', options: ['Onlar basamağı 1 arttı', 'Onar saydım', 'Bloklara baktım', 'Birlikler hiç değişmedi'] },
  }
}

function g2Skip(): Level {
  const step = pick([5, 2])
  const s = step === 5 ? rnd(3, 8) * 5 : rnd(12, 30) * 2
  const seq = Array.from({ length: 5 }, (_, i) => s + step * i)
  const gaps = [1, 4]
  const slots: Slot[] = seq.map((n, i) => (gaps.includes(i) ? { answer: n } : { fixed: car({ k: 'num', n }, i + 1) }))
  const [a, b] = gaps.map((i) => seq[i])
  const traps: Rep[] = [{ k: 'num', n: seq[0] + 1 }, { k: 'num', n: b + 1 }, { k: 'num', n: b + step }]
  return {
    kind: 'missing',
    stage: 'Sembol',
    title: step === 5 ? 'Beşer beşer' : 'İkişer ikişer',
    prompt: 'Bu tren ritmik sayıyor. Boş vagonu ve sıradaki vagonu bul!',
    hints: ['Yan yana iki vagon arasında kaç adım var?', `${seq[2]}, ${seq[3]}… Her seferinde ${step} ekleniyor mu?`],
    goal: 2,
    yard: cars([{ k: 'num', n: a }, { k: 'num', n: b }, ...traps]),
    slots,
    step,
    plate: '?',
    board: ['Ritmik', 'sayma'],
    note: `${seq.join(', ')}: ${step === 5 ? 'beşer' : 'ikişer'} saydık!`,
    auto: step === 5 ? '5’er ritmik sayma' : '2’şer ritmik sayma',
  }
}

function g2Neighbours(): Level {
  const t = rnd(2, 8)
  const o = rnd(1, 8)
  const c = t * 10 + o
  const ans = [c - 10, c - 1, c + 1, c + 10]
  const tags = ['10 eksiği', '1 eksiği', '1 fazlası', '10 fazlası']
  const slots: Slot[] = [
    { answer: ans[0], tag: tags[0] },
    { answer: ans[1], tag: tags[1] },
    { fixed: car({ k: 'b10', t, o }, 2), tag: 'Bu sayı' },
    { answer: ans[2], tag: tags[2] },
    { answer: ans[3], tag: tags[3] },
  ]
  const traps: Rep[] = [{ k: 'num', n: c + 11 }, { k: 'num', n: c - 9 }]
  return {
    kind: 'missing',
    stage: 'Model',
    title: 'Komşu vagonlar',
    prompt: 'Ortadaki vagonda kaç var? Onun 1 fazlasını, 1 eksiğini, 10 fazlasını ve 10 eksiğini bul!',
    hints: ['Önce ortadaki blokları oku: kaç onluk, kaç birlik?', '10 fazlası: bir onluk ekle. Birlikler değişir mi?', '1 eksiği: bir birlik çıkar.'],
    goal: 4,
    yard: cars([...ans.map((n) => ({ k: 'num', n }) as Rep), ...traps]),
    slots,
    step: 0,
    plate: '?',
    board: ['±1', '±10'],
    note: `${c - 10} ← ${c} → ${c + 10}: 10 fazlasında onluk değişir, birlik aynı kalır!`,
    picker: { q: '10 fazlasını nasıl buldun?', options: ['Bir onluk ekledim', '10 ileri saydım', 'Yüzlük tabloyu düşündüm', 'Onlar basamağını 1 artırdım'] },
  }
}

function g2Range(): Level {
  const lo = pick([30, 40, 50])
  const hi = lo + 20
  const inside = shuffle(Array.from({ length: 19 }, (_, i) => lo + 1 + i).filter((n) => n !== lo + 10)).slice(0, 4)
  const t = (n: number) => Math.floor(n / 10)
  const repsIn: Rep[] = inside.map((n, i) => (i === 0 ? { k: 'b10', t: t(n), o: n % 10 } : i === 1 ? { k: 'exp', parts: [t(n) * 10, n % 10] } : i === 2 ? { k: 'num', n } : { k: 'word', n }))
  repsIn.push({ k: 'place', t: t(lo) + 1, o: 0 })
  const r = rev(inside[2])
  const traps: Rep[] = [{ k: 'num', n: lo }, { k: 'b10', t: t(hi), o: 0 }, { k: 'num', n: r >= lo && r <= hi ? lo - 3 : r }, { k: 'exp', parts: [hi, 4] }]
  return {
    kind: 'range',
    stage: 'Problem',
    title: 'Bilet kuralı',
    prompt: `Bu trene ${ek(lo, 'abl')} büyük, ${ek(hi, 'abl')} küçük sayılar biner. 4 farklı sayı bul!`,
    hints: [`${lo} trene binebilir mi? ${lo}, ${ek(lo, 'abl')} büyük mü?`, 'Önce onluklara bak. Kaç onluk olmalı?', `${hi}’den küçük olması için en çok kaç onluk olabilir?`],
    goal: 4,
    yard: cars([...repsIn, ...traps]),
    range: [lo, hi],
    plate: '?',
    board: [`${ek(lo, 'abl')} büyük`, `${ek(hi, 'abl')} küçük`],
    note: `${lo} ile ${hi} arasında ${hi - lo - 1} sayı var. ${lo} ve ${hi} binemez!`,
  }
}

export function buildLevels(grade: Grade): Level[] {
  if (grade <= 1) {
    return [g1Couple(rnd(6, 9)), g1Range(), g1FrameSeq(), g1Teen(rnd(12, 16)), g1Back(), orderLevel(1)]
  }
  return [g2Load(), g2Couple(), g2Tens(), g2Skip(), g2Neighbours(), g2Range(), orderLevel(2)]
}

export const valueOf = (c: Car) => repValue(c.rep)
