import type { Grade } from '../../../data/types'
import { r, side, type Eq, type Op } from './algebra'

export interface RuleTerm {
  label: string
  a: number
  b: number
}

interface Base {
  title: string
  prompt: string
}

export type Door =
  | (Base & {
      kind: 'solve'
      eq: Eq
      /** Bu kadar adımda açılan yollar "farklı çözüm" sayılır */
      maxSteps: number
      /** 8. sınıf bağlamı: y = mx + b, önce y yerine değer yazılır */
      context?: { story: string; m: number; b: number; y: number; unit: string }
      extra?: Op[]
    })
  | (Base & { kind: 'range'; eq: Eq; maxSteps: number; view: [number, number] })
  | (Base & { kind: 'check'; eq: Eq; keys: number[] })
  | (Base & { kind: 'rule'; figure: 'L' | 'plus' | 'T'; rule: { a: number; b: number }; palette: RuleTerm[] })

const E = (la: number | ReturnType<typeof r>, lb: number | ReturnType<typeof r>, ra: number | ReturnType<typeof r>, rb: number | ReturnType<typeof r>, rel: Eq['rel'] = '='): Eq => ({ L: side(la, lb), R: side(ra, rb), rel })

const g6: Door[] = [
  {
    kind: 'check', title: 'Anahtar kapısı',
    prompt: 'Kilitte bir terazi var: 3 kese ve 4 altın, 19 altınla dengede olmalı. Her kesede x altın var. Hangi anahtar (x değeri) teraziyi dengeler?',
    eq: E(3, 4, 0, 19), keys: [3, 5, 7],
  },
  {
    kind: 'solve', title: 'Altın kese', maxSteps: 1,
    prompt: 'Bir kese ve 5 altın, 12 altınla dengede. Kesede kaç altın var? Bir işlem kartını kapıya sürükle: iki kefeye de uygulanır.',
    eq: E(1, 5, 0, 12),
  },
  {
    kind: 'rule', title: 'Taş örüntüsü', figure: 'L', rule: { a: 2, b: 1 },
    prompt: 'Kapıdaki taş desenleri büyüyor. n. adımda kaç taş var? Kuralı terim kartlarıyla yaz. Deseni farklı görürsen kuralı da farklı yazabilirsin!',
    palette: [
      { label: 'n', a: 1, b: 0 },
      { label: '2n', a: 2, b: 0 },
      { label: 'n + 1', a: 1, b: 1 },
      { label: '1', a: 0, b: 1 },
      { label: '2', a: 0, b: 2 },
    ],
  },
  {
    kind: 'solve', title: 'Üç kese', maxSteps: 1,
    prompt: 'Üç eş kese, 18 altınla dengede. Bir kesede kaç altın var?',
    eq: E(3, 0, 0, 18),
  },
  {
    kind: 'solve', title: 'Ters terazi', maxSteps: 1,
    prompt: 'Bu kez bilinmeyen sağ kefede: 18 altın, bir kese ve 7 altınla dengede. Kapıyı aç!',
    eq: E(0, 18, 1, 7),
  },
  {
    kind: 'rule', title: 'Yıldız kapısı', figure: 'plus', rule: { a: 4, b: 1 },
    prompt: 'Ortada bir taş, dört kolda birer sıra… n. adımda kaç taş var? Kuralı yaz; başka bir görüşle ikinci bir kural bulabilir misin?',
    palette: [
      { label: 'n', a: 1, b: 0 },
      { label: '2n', a: 2, b: 0 },
      { label: '4n', a: 4, b: 0 },
      { label: '1', a: 0, b: 1 },
      { label: '4', a: 0, b: 4 },
    ],
  },
]

const g7: Door[] = [
  {
    kind: 'solve', title: 'İki yol kapısı', maxSteps: 2,
    prompt: '2x + 6 = 14. Kapıyı açmak için x’i yalnız bırak. Bu kapı iki farklı yolla açılabiliyor; ikisini de bulabilir misin?',
    eq: E(2, 6, 0, 14),
  },
  {
    kind: 'solve', title: 'Balon kapısı', maxSteps: 2,
    prompt: 'Kırmızı balonlar kefeyi yukarı çeker (negatif). 3x − 4 = −10 denklemini dengeyi bozmadan çöz.',
    eq: E(3, -4, 0, -10),
  },
  {
    kind: 'solve', title: 'Yarım kese', maxSteps: 2,
    prompt: 'Yarım kese ve 3 altın, 5 altınla dengede: [[x/2]] + 3 = 5. Önce neyi yaparsın?',
    eq: E(r(1, 2), 3, 0, 5),
  },
  {
    kind: 'solve', title: 'İki taraflı kapı', maxSteps: 3,
    prompt: 'Bilinmeyen iki kefede de var: 4x + 3 = x + 12. Keseleri bir tarafta topla ve kapıyı aç.',
    eq: E(4, 3, 1, 12),
  },
  {
    kind: 'solve', title: 'Kesirli kapı', maxSteps: 2,
    prompt: '[[3/4]]x = 6. Kesirli katsayıdan nasıl kurtulursun? Bir yol bulunca ikincisini dene.',
    eq: E(r(3, 4), 0, 0, 6),
  },
  {
    kind: 'range', title: 'Aralık kapısı', maxSteps: 2, view: [-3, 9],
    prompt: 'Bu kapı tek bir anahtarla değil, bir aralıktaki her anahtarla açılır: 2x + 1 < 9. Önce x’i yalnız bırak, sonra açan sayıları sayı doğrusunda göster.',
    eq: E(2, 1, 0, 9, '<'),
  },
]

const g8: Door[] = [
  {
    kind: 'solve', title: 'Taksi kapısı', maxSteps: 2,
    prompt: 'Taksi: açılış 12 TL, kilometre başına 3 TL. Ücret y = 3x + 12. Yolculuk 45 TL tuttuysa kaç km gidildi?',
    eq: E(0, 45, 3, 12),
    context: { story: 'Yolculuk 45 TL tuttu.', m: 3, b: 12, y: 45, unit: 'TL' },
  },
  {
    kind: 'check', title: 'Yerine koyma kapısı',
    prompt: '5x − 7 = 2x + 8. Kilitte üç anahtar var. Her birini yerine koyup iki tarafın değerini karşılaştır: hangisi eşitliği sağlar?',
    eq: E(5, -7, 2, 8), keys: [3, 5, 7],
  },
  {
    kind: 'solve', title: 'Kiralama kapısı', maxSteps: 3,
    prompt: 'Bisiklet kiralama: A firması 20 + 4x TL, B firması 8 + 7x TL (x: gün). Kaç günlük kiralamada iki firma aynı ücreti ister?',
    eq: E(4, 20, 7, 8),
  },
  {
    kind: 'solve', title: 'Kesir kapısı', maxSteps: 3,
    prompt: '[[x/3]] + 2 = [[x/2]]. Önce kesirlerden mi kurtulursun, yoksa x’leri bir tarafa mı toplarsın? İki yolu da dene.',
    eq: E(r(1, 3), 2, r(1, 2), 0),
  },
  {
    kind: 'solve', title: 'Su deposu kapısı', maxSteps: 2,
    prompt: 'Depoda 200 L su var, her dakika 8 L boşalıyor: y = −8x + 200. Kaç dakika sonra depoda 72 L kalır?',
    eq: E(0, 72, -8, 200),
    context: { story: 'Depoda 72 L kaldı.', m: -8, b: 200, y: 72, unit: 'L' },
  },
  {
    kind: 'range', title: 'Son kapı', maxSteps: 2, view: [-2, 10],
    prompt: 'Hazine odasının kapısı, y = 2x − 3 değerini 5’ten büyük yapan her x ile açılır: 2x − 3 > 5. Çöz ve aralığı sayı doğrusunda göster.',
    eq: E(2, -3, 0, 5, '>'),
  },
]

export function makeDoors(grade: Grade): Door[] {
  if (grade <= 6) return g6
  if (grade === 7) return g7
  return g8
}
