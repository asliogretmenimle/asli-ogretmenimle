import type { Grade } from '../../data/types'
import { dec, fr, mixed } from '../kesir-duvari/ortak'

/** Sayı: n/d. kind yazım biçimini belirler (kesir, tam sayılı kesir, ondalık). */
export type Num = { n: number; d: number; kind: 'frac' | 'mixed' | 'dec' }

export type PlaceRound = { kind: 'place'; target: Num; max: number; dens: number[]; story?: string }
export type OpenRound = { kind: 'open'; lo: Num; hi: Num; max: number; dens: number[]; goal: number; unitOnly?: boolean; decimalNames?: boolean; prompt: string }
export type Round = PlaceRound | OpenRound

export const val = (x: Num) => x.n / x.d
export const label = (x: Num) => (x.kind === 'dec' ? dec(x.n / x.d) : x.kind === 'mixed' ? mixed(x.n, x.d) : fr(x.n, x.d))

const F = (n: number, d: number): Num => ({ n, d, kind: 'frac' })
const M = (n: number, d: number): Num => ({ n, d, kind: 'mixed' })
const D = (n: number, d: number): Num => ({ n, d, kind: 'dec' })

export function makeRounds(grade: Grade): Round[] {
  if (grade <= 3) {
    const dens = [2, 3, 4, 6, 8]
    return [
      { kind: 'place', target: F(1, 2), max: 1, dens, story: 'Bir bütünün yarısı. Ortayı gözünle bulabilir misin?' },
      { kind: 'place', target: F(1, 4), max: 1, dens, story: 'Yarının da yarısı nerede olur?' },
      { kind: 'place', target: F(3, 4), max: 1, dens, story: 'Üç tane [[1/4]]. [[1/2]]’den büyük mü, küçük mü?' },
      { kind: 'place', target: F(1, 3), max: 1, dens, story: 'Bütünü 3 eş parçaya bölünce ilk parça.' },
      { kind: 'place', target: F(2, 3), max: 1, dens, story: 'İki tane [[1/3]]. 1’e mi yakın, 0’a mı?' },
      { kind: 'open', lo: F(0, 1), hi: F(1, 2), max: 1, dens, goal: 3, unitOnly: true, prompt: '[[1/2]]’den küçük birim kesirler bul. Payı 1 olan kesirler!' },
    ]
  }
  if (grade === 4) {
    const dens = [2, 3, 4, 5, 6, 8, 10]
    return [
      { kind: 'place', target: F(3, 4), max: 2, dens, story: 'Doğru 0’dan 2’ye uzanıyor. Önce 1’i bul!' },
      { kind: 'place', target: F(5, 4), max: 2, dens, story: 'Pay paydadan büyük: bu kesir 1’i geçiyor mu?' },
      { kind: 'place', target: M(3, 2), max: 2, dens, story: 'Bir tam ve bir yarım.' },
      { kind: 'place', target: F(2, 3), max: 2, dens, story: '[[1/2]]’ye mi yakın, 1’e mi?' },
      { kind: 'place', target: F(7, 8), max: 2, dens, story: '1’e ne kadar kaldı? Sadece bir tane [[1/8]]!' },
      { kind: 'open', lo: F(1, 1), hi: F(2, 1), max: 2, dens, goal: 3, prompt: '1 ile 2 arasında kesirler bul. Her birinin iki adını gör: bileşik ve tam sayılı.' },
    ]
  }
  if (grade === 5) {
    const dens = [2, 3, 4, 5, 6, 8, 10, 12]
    return [
      { kind: 'place', target: F(5, 8), max: 2, dens, story: '[[4/8]] yarım eder. [[5/8]] yarımdan ne kadar uzakta?' },
      { kind: 'place', target: F(7, 12), max: 2, dens, story: 'Yarım kaç tane [[1/12]] eder?' },
      { kind: 'place', target: F(2, 5), max: 2, dens, story: '[[1/2]]’nin biraz solunda mı, sağında mı?' },
      { kind: 'place', target: M(13, 10), max: 2, dens, story: 'Bir tam ve üç onda bir.' },
      { kind: 'place', target: D(7, 10), max: 2, dens, story: 'Ondalık gösterim: 0,7 kaç onda bir?' },
      { kind: 'place', target: D(25, 100), max: 2, dens, story: '0,25 hangi tanıdık kesre eşit? Ya da yüzde birlere yakınlaştır.' },
      { kind: 'open', lo: F(1, 2), hi: F(3, 4), max: 2, dens, goal: 3, prompt: '[[1/2]] ile [[3/4]] arasında kesirler bul. Doğruyu farklı biçimlerde böl!' },
    ]
  }
  const dens = [2, 3, 4, 5, 6, 8, 10, 12]
  return [
    { kind: 'place', target: D(35, 100), max: 3, dens, story: '3 onda bir ve 5 yüzde bir. Önce [[1/2]]’ye göre düşün.' },
    { kind: 'place', target: F(5, 6), max: 3, dens, story: '1’e ne kadar kaldı?' },
    { kind: 'place', target: D(175, 100), max: 3, dens, story: '1,75: bir tam ve [[3/4]] gibi mi?' },
    { kind: 'place', target: D(125, 1000), max: 3, dens, story: 'Binde birler! 0,125 sence 0,2’den büyük mü?' },
    { kind: 'place', target: M(7, 3), max: 3, dens, story: 'İki tam ve bir [[1/3]].' },
    { kind: 'open', lo: D(3, 10), hi: D(4, 10), max: 3, dens, goal: 3, decimalNames: true, prompt: '0,3 ile 0,4 arasında sayılar bul. Yakınlaştırınca arada başka sayılar belirir mi?' },
  ]
}
