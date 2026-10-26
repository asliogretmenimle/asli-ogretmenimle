import { numberToWords } from '../../lib/generators'

/**
 * Ondalık Yakınlaştırıcı — sayı adları.
 * Tüm miktarlar "binde bir" cinsinden tamsayıdır (0–1000): 300 = 0,3 = [[3/10]].
 */

export type G = 4 | 5 | 6

const VOW = 'aıoueiöü'
const lastWordOf = (k: number) => numberToWords(Math.abs(k)).split(' ').pop() ?? ''

/** Okunuşun son kelimesine göre ek: 'acc' (-ı), 'dat' (-a), 'abl' (-dan), 'loc' (-da), 'gen' (-ın) */
export function ekW(word: string, kind: 'acc' | 'dat' | 'abl' | 'loc' | 'gen'): string {
  const v = [...word].reverse().find((c) => VOW.includes(c)) ?? 'e'
  const back = 'aıou'.includes(v)
  const i4 = 'aı'.includes(v) ? 'ı' : 'ei'.includes(v) ? 'i' : 'ou'.includes(v) ? 'u' : 'ü'
  const a2 = back ? 'a' : 'e'
  const vEnd = VOW.includes(word[word.length - 1])
  const d = 'çfhkpsşt'.includes(word[word.length - 1]) ? 't' : 'd'
  const s = { acc: (vEnd ? 'y' : '') + i4, dat: (vEnd ? 'y' : '') + a2, abl: d + a2 + 'n', loc: d + a2, gen: (vEnd ? 'n' : '') + i4 + 'n' }[kind]
  return `’${s}`
}

const fr = (a: number, b: number) => `[[${a}/${b}]]`

/** Ondalık yazım; minDigits ile 0,30 gibi yazılabilir */
export const decStr = (n: number, minDigits = 0) => (n / 1000).toLocaleString('tr-TR', { minimumFractionDigits: minDigits, maximumFractionDigits: 3 })

/** En kısa ad: 4. sınıfta ondalık kesir, 5–6’da ondalık gösterim */
export function nm(n: number, g: G): string {
  if (g === 4) {
    if (n % 100 === 0) return fr(n / 100, 10)
    if (n % 10 === 0) return fr(n / 10, 100)
    return fr(n, 1000)
  }
  return decStr(n)
}

/** Adın son okunan kelimesi (ek için): 0,25 → "beş", [[3/10]] → "üç" */
function readWord(n: number, g: G): string {
  if (n === 0) return 'sıfır'
  if (n === 1000) return 'bir'
  if (g === 4) return lastWordOf(n % 100 === 0 ? n / 100 : n % 10 === 0 ? n / 10 : n)
  const s = decStr(n).split(',')[1] ?? ''
  return lastWordOf(Number(s))
}

/** Ad + ek: "0,25’i", "[[3/10]]’u" */
export const nmEk = (n: number, g: G, kind: 'acc' | 'dat' | 'abl' | 'loc' | 'gen') => nm(n, g) + ekW(readWord(n, g), kind)

/** Aynı miktarın tüm adları (denklik zinciri) */
export function chain(n: number, g: G): string[] {
  if (n === 0) return []
  if (n === 1000) return g === 4 ? [fr(10, 10), fr(100, 100)] : ['1', fr(10, 10), fr(100, 100), ...(g === 6 ? [fr(1000, 1000)] : [])]
  const out: string[] = []
  const tenth = n % 100 === 0, hund = n % 10 === 0
  if (g === 4) {
    if (tenth) out.push(fr(n / 100, 10))
    if (hund) out.push(fr(n / 10, 100))
    else out.push(fr(n, 1000))
    return out
  }
  out.push(decStr(n))
  if (tenth) out.push(decStr(n, 2))
  if (g === 6 && hund && n % 1000 !== 0) out.push(decStr(n, 3))
  if (tenth) out.push(fr(n / 100, 10))
  if (hund) out.push(fr(n / 10, 100))
  if (g === 6 || !hund) out.push(fr(n, 1000))
  if (hund) out.push(`%${n / 10}`)
  return [...new Set(out)]
}

/** Basamak değeri çözümlemesi: "2 onda bir + 5 yüzde bir" */
export function breakdown(n: number): string {
  if (n >= 1000) return '1 bütün'
  const t = Math.floor(n / 100), h = Math.floor(n / 10) % 10, th = n % 10
  const p: string[] = []
  if (t) p.push(`${t} onda bir`)
  if (h) p.push(`${h} yüzde bir`)
  if (th) p.push(`${th} binde bir`)
  return p.join(' + ')
}

/** 4. sınıf okunuşu: "onda üç", "yüzde yirmi beş" */
export function words(n: number): string {
  if (n % 100 === 0) return `onda ${numberToWords(n / 100)}`
  if (n % 10 === 0) return `yüzde ${numberToWords(n / 10)}`
  return `binde ${numberToWords(n)}`
}

/** Birim adı: düzeye göre */
export const unitName = (lvl: number) => (lvl === 1 ? 'onda bir' : lvl === 2 ? 'yüzde bir' : 'binde bir')
export const unitSym = (lvl: number, g: G) => (g === 4 ? fr(1, lvl === 1 ? 10 : lvl === 2 ? 100 : 1000) : lvl === 1 ? '0,1' : lvl === 2 ? '0,01' : '0,001')

/** Soru eki: "0,3 mü", "0,25 mi", "[[3/10]] mu" */
export function mi(n: number, g: G): string {
  const w = readWord(n, g)
  const v = [...w].reverse().find((c) => VOW.includes(c)) ?? 'e'
  return 'aı'.includes(v) ? 'mı' : 'ei'.includes(v) ? 'mi' : 'ou'.includes(v) ? 'mu' : 'mü'
}
