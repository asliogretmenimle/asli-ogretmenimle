import { coprime, divisors, gcd, isPrime } from '../../../lib/numberTheory'
import { pick, shuffle } from '../../../interactions/donusum-studyosu/ortak'

/**
 * Kapılar ve sayı havuzları.
 * Her havuzda bilerek tuzaklar var: ardışık sayı (hep geçer), 1 (hep geçer), iki bileşik ama aralarında asal,
 * hedefi bölen bir asal (asal ama geçemez), hedefin katı, hedefle bir asal çarpanı paylaşan bileşik sayılar.
 */

export type Kind = 'one' | 'consec' | 'coprimeComposite' | 'primeOther' | 'primeFactor' | 'multiple' | 'share' | 'other'

export interface Token {
  id: number
  n: number
  kind: Kind
  /** Kapıdan geçer mi (EBOB = 1) */
  pass: boolean
  /** Daha önce denendi ve geri döndü */
  tried?: boolean
}

export interface Gate {
  T: number
  /** Geçirilmesi gereken sayı adedi */
  need: number
  /** Önce “hangileri geçer?” tahmini */
  predict?: boolean
  /** Kapı sonunda keşif sorusu */
  question?: 'iki-bilesik' | 'ardisik'
  withOne?: boolean
}

const OPTIONS: [number[], Omit<Gate, 'T'>][] = [
  [[12, 18], { need: 2, withOne: true }],
  [[15, 10], { need: 3 }],
  [[20, 24], { need: 3, question: 'iki-bilesik' }],
  [[21, 33], { need: 3, predict: true, withOne: true }],
  [[28, 30], { need: 3, predict: true }],
  [[35, 45], { need: 3, predict: true, question: 'ardisik' }],
]

export const makeGates = (r: () => number): Gate[] => OPTIONS.map(([ts, g]) => ({ T: pick(ts, r), ...g }))

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

export function makePool(g: Gate, r: () => number, startId: number): Token[] {
  const T = g.T
  const used = new Set<number>([T])
  const out: { n: number; kind: Kind }[] = []
  const add = (n: number, kind: Kind) => {
    if (n < 1 || n > 99 || used.has(n)) return
    used.add(n)
    out.push({ n, kind })
  }
  const pickFrom = (list: number[], kind: Kind, k = 1) => shuffle(list.filter((x) => !used.has(x)), r).slice(0, k).forEach((x) => add(x, kind))

  if (g.withOne) add(1, 'one')
  add(T + 1, 'consec')
  pickFrom(range(4, 60).filter((x) => !isPrime(x) && coprime(x, T) && Math.abs(x - T) > 1), 'coprimeComposite')
  pickFrom(divisors(T).filter(isPrime), 'primeFactor')
  add(2 * T, 'multiple')
  pickFrom(range(4, 60).filter((x) => !isPrime(x) && gcd(x, T) > 1 && x % T !== 0), 'share', 2)
  pickFrom(range(2, 50).filter((x) => isPrime(x) && T % x !== 0), 'primeOther')
  const passers = () => out.filter((o) => coprime(o.n, T)).length
  while (passers() < g.need + 1) pickFrom(range(2, 70).filter((x) => coprime(x, T)), 'other')
  const size = g.withOne ? 9 : 8
  while (out.length < size) pickFrom(range(2, 70), 'other')
  return shuffle(out, r).map((o, i) => ({ id: startId + i, n: o.n, kind: o.kind, pass: coprime(o.n, T) }))
}
