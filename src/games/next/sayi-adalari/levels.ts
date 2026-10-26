import type { Grade } from '../../../data/types'

/**
 * Sayı Adaları seviyeleri — somut → görsel → sembolik → açık uçlu.
 *  blocks : iki renk küp (ve 10’luk çubuk) ile hedef sayıyı kur (1. sınıf: onluk çerçeve, 2. sınıf: onluk-birlik blokları)
 *  planks : sayı tahtalarıyla hedefi kur (1. sınıf: noktalı tahtalar bankası, 2. sınıf: ayarlanabilir tahtalar)
 *  equal  : ilişkisel eşitlik  8 + 6 = 10 + ?
 *  missing: eksik parça  14 = 9 + ?
 *  open   : “Kaç farklı yol?” — en fazla üç parça
 */
export type LevelKind = 'blocks' | 'planks' | 'equal' | 'missing' | 'open'

export interface SubTask {
  /** Görev ifadesi; “?” eksik tahtanın yeri */
  left: string
  right: string
  answer: number
  /** Adadaki tabelada görünen yazı */
  sign: string
  /** Yaklaşılan strateji (rapor için) */
  strategy: string
  /** Toplamayı seçerse düşülen kavram yanılgısı değeri */
  trap?: number
}

export interface Level {
  kind: LevelKind
  target: number
  goal: number
  stage: 'Somut' | 'Görsel' | 'Sembolik' | 'Açık uçlu'
  title: string
  /** 10’luk çubuk kullanılabilir */
  rods?: boolean
  /** Bloklar: 1. sınıf onluk çerçeve, 2. sınıf onluk-birlik */
  model?: 'frame' | 'base10'
  /** Tahta bankası (1. sınıf) ya da ayarlanabilir tahtalar (2. sınıf) */
  input?: 'bank' | 'stepper'
  dots?: boolean
  bank?: number[]
  maxParts?: 2 | 3
  tasks?: SubTask[]
}

const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

function g1Equal(): SubTask[] {
  const a = ri(7, 9)
  const b = ri(Math.max(4, 11 - a), Math.min(8, 17 - a))
  const n = ri(5, 8)
  const c = ri(6, 8)
  const d = ri(4, 6)
  return [
    { left: `${a} + ${b}`, right: '10 + ?', answer: a + b - 10, sign: `${a} + ${b}`, strategy: '10’a tamamlama', trap: a + b },
    { left: `${n} + ${n + 1}`, right: `${n} + ${n} + ?`, answer: 1, sign: `${n} + ${n + 1}`, strategy: 'İkizlere yakın', trap: 2 * n + 1 },
    { left: `${c} + ${d}`, right: `${c + 1} + ?`, answer: d - 1, sign: `${c} + ${d}`, strategy: 'Bir tanesini ver (telafi)', trap: c + d },
  ]
}

function g2Equal(): SubTask[] {
  const a = 10 * ri(2, 5) + pick([8, 9])
  const b = 10 * ri(1, 3) + ri(3, 7)
  const up = Math.ceil(a / 10) * 10
  const x = 10 * ri(2, 5) + ri(1, 6)
  const t = ri(2, 3)
  const u = ri(2, 8)
  const y = 10 * t + u
  const h = 5 * pick([5, 7, 9]) // 25, 35, 45
  return [
    { left: `${a} + ${b}`, right: `${up} + ?`, answer: a + b - up, sign: `${a} + ${b}`, strategy: '10’a tamamlama', trap: a + b },
    { left: `${x} + ${y}`, right: `${x} + ${10 * t} + ?`, answer: u, sign: `${x} + ${y}`, strategy: 'Onluk ve birliklere ayırma', trap: x + y },
    { left: `${h} + ${h + 1}`, right: `${h} + ${h} + ?`, answer: 1, sign: `${h} + ${h + 1}`, strategy: 'İkizlere yakın', trap: 2 * h + 1 },
  ]
}

function g1Missing(): SubTask[] {
  const t1 = ri(13, 17)
  const t2 = ri(11, 18)
  const b2 = ri(Math.max(3, t2 - 9), Math.min(9, t2 - 2))
  const t3 = ri(12, 19)
  return [
    { left: `${t1}`, right: `9 + ?`, answer: t1 - 9, sign: `${t1}`, strategy: '10’a tamamlama', trap: t1 + 9 },
    { left: `${t2}`, right: `? + ${b2}`, answer: t2 - b2, sign: `${t2}`, strategy: 'Toplamayı düşünerek çıkarma', trap: t2 + b2 },
    { left: `${t3}`, right: `10 + ?`, answer: t3 - 10, sign: `${t3}`, strategy: '10 ve birlikler', trap: t3 + 10 },
  ]
}

function g2Missing(): SubTask[] {
  const t1 = 10 * ri(5, 8) + ri(1, 9)
  const k = ri(3, Math.floor(t1 / 10) - 1)
  const t2 = 10 * ri(6, 9) + ri(1, 8)
  const b2 = 10 * ri(2, 4) + ri(1, 9)
  const a3 = 10 * ri(5, 8) + pick([5, 4, 6])
  return [
    { left: `${t1}`, right: `${10 * k} + ?`, answer: t1 - 10 * k, sign: `${t1}`, strategy: 'Onluk ve birliklere ayırma', trap: t1 + 10 * k },
    { left: `${t2}`, right: `? + ${b2}`, answer: t2 - b2, sign: `${t2}`, strategy: 'Toplamayı düşünerek çıkarma', trap: t2 + b2 },
    { left: '100', right: `${a3} + ?`, answer: 100 - a3, sign: '100', strategy: 'Yuvarlak sayıya tamamlama', trap: 100 + a3 },
  ]
}

export function buildLevels(grade: Grade): Level[] {
  if (grade <= 1) {
    return [
      { kind: 'blocks', target: pick([8, 9, 10]), goal: 3, stage: 'Somut', title: 'Küplerle köprü', model: 'frame' },
      { kind: 'blocks', target: ri(12, 16), goal: 3, stage: 'Somut', title: 'Onluk çerçeveli sal', model: 'frame', rods: true },
      { kind: 'planks', target: ri(11, 15), goal: 3, stage: 'Görsel', title: 'Noktalı tahtalar', input: 'bank', dots: true, bank: range(1, 10) },
      { kind: 'equal', target: 0, goal: 3, stage: 'Sembolik', title: 'Dengeli köprüler', input: 'bank', bank: range(0, 10), tasks: g1Equal() },
      { kind: 'missing', target: 0, goal: 3, stage: 'Sembolik', title: 'Kayıp tahta', input: 'bank', bank: range(0, 10), tasks: g1Missing() },
      { kind: 'open', target: pick([12, 15, 16, 18, 20]), goal: 4, stage: 'Açık uçlu', title: 'Kaç farklı yol?', input: 'bank', bank: range(1, 10), maxParts: 3 },
    ]
  }
  return [
    { kind: 'blocks', target: 10 * ri(2, 3) + ri(2, 8), goal: 3, stage: 'Somut', title: 'Onluk ve birlik blokları', model: 'base10', rods: true },
    { kind: 'blocks', target: 10 * ri(4, 6) + ri(1, 8), goal: 3, stage: 'Somut', title: 'Büyük sal', model: 'base10', rods: true },
    { kind: 'planks', target: 10 * ri(4, 8) + ri(2, 8), goal: 3, stage: 'Görsel', title: 'Sayı tahtaları', input: 'stepper' },
    { kind: 'equal', target: 0, goal: 3, stage: 'Sembolik', title: 'Dengeli köprüler', input: 'stepper', tasks: g2Equal() },
    { kind: 'missing', target: 0, goal: 3, stage: 'Sembolik', title: 'Kayıp tahta', input: 'stepper', tasks: g2Missing() },
    { kind: 'open', target: pick([50, 60, 75, 80, 100]), goal: 4, stage: 'Açık uçlu', title: 'Kaç farklı yol?', input: 'stepper', maxParts: 3 },
  ]
}

/** Bir ayrıştırmanın (parçaların) hangi stratejiyi gösterdiği */
export function strategiesOf(parts: number[], grade: Grade): string[] {
  const out: string[] = []
  const p = parts.filter((x) => x > 0)
  if (p.length === 2) {
    const [a, b] = p
    if (a === b) out.push('İkizler')
    else if (Math.abs(a - b) === 1) out.push('İkizlere yakın')
  }
  if (p.length === 3 && new Set(p).size < 3) out.push('İkizler')
  if (grade <= 1) {
    if (p.includes(10)) out.push('10 ve birlikler')
    else if (p.length === 2 && p.every((x) => x < 10) && p[0] + p[1] > 10) out.push('10’a tamamlama')
    if (p.includes(5)) out.push('5 çapası')
  } else {
    const tensOnly = p.filter((x) => x % 10 === 0)
    const standard = p.length === 2 && tensOnly.length === 1 && p.find((x) => x % 10 !== 0)! < 10
    if (standard) out.push('Onluk ve birliklere ayırma')
    else if (p.some((x) => x % 10 !== 0)) out.push('Esnek basamak değeri')
    if (p.length === 2 && p.every((x) => x % 10 !== 0) && (p[0] % 10) + (p[1] % 10) >= 10) out.push('10’a tamamlama')
    if (p.some((x) => x % 10 === 5 && x % 10 !== 0)) out.push('5 çapası')
  }
  if (p.length === 3) out.push('Üç parçaya ayırma')
  return out
}

export const keyOf = (parts: number[]) => parts.filter((x) => x > 0).slice().sort((a, b) => b - a).join('+')
