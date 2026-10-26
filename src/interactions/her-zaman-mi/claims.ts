import type { Grade } from '../../data/types'
import { ek } from '../../lib/generators'

/**
 * Her Zaman mı, Bazen mi? — iddia bankası.
 * Her iddia: test edilebilir değişkenler (vars), örnek hesaplayan run(), doğruluk (truth),
 * “her zaman / asla” için gerekçe seçenekleri (reasons), “bazen” için koşul seçenekleri (fix).
 * run(): ok = bu örnekte iddia doğru mu; null = örnek iddianın koşulunu sağlamıyor (ör. “iki tek sayı” derken çift sayı).
 */

export type Truth = 'always' | 'sometimes' | 'never'
export type Viz = 'rect' | 'rect2' | 'tri' | 'angles' | 'frac' | 'none'
export interface Var { k: string; label: string; min: number; max: number; step?: number; init: number }
export interface Test { text: string; ok: boolean | null; fact: string }
export interface Opt { t: string; ok: boolean; q?: string; mis?: string }
export interface Claim {
  id: string
  g: Grade[]
  text: string
  truth: Truth
  vars: Var[]
  viz?: Viz
  run: (v: number[]) => Test
  quick?: number[][]
  reasons?: Opt[]
  fix?: Opt[]
  hint: string
  note: string
  mis?: string
  /** frac görseli için kesirler [pay, payda] */
  fracs?: (v: number[]) => [number, number][]
}

/** Türkçe sayı yazımı: −3,5 */
export const nf = (n: number) => {
  const r = Math.round(n * 1000) / 1000
  return r.toLocaleString('tr-TR', { maximumFractionDigits: 3, useGrouping: false }).replace('-', '−')
}
const par = (n: number) => (n < 0 ? `(${nf(n)})` : nf(n))
const abl = (n: number) => (Number.isInteger(n) && n >= 0 ? ek(n, 'abl') : `${nf(n)} sayısından`)
const isPrime = (n: number) => {
  if (n < 2 || !Number.isInteger(n)) return false
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false
  return true
}
const isSq = (n: number) => Number.isInteger(Math.sqrt(n))
const parity = (n: number) => (n % 2 === 0 ? 'çift' : 'tek')
const v = (k: string, label: string, min: number, max: number, init: number, step = 1): Var => ({ k, label, min, max, init, step })

const EX: Opt = { t: 'Denediğim örneklerin hepsinde böyle çıktı.', ok: false, q: 'Örnekler fikir verir ama bütün sayıları deneyemeyiz. Neden HER durumda böyle olmak zorunda? Örneklerin ardındaki nedeni düşün.', mis: 'Birkaç örneği genel bir kanıt saydı' }

export const CLAIMS: Claim[] = [
  // ───────── 3. sınıf ─────────
  {
    id: 'tek-tek', g: [3, 4], text: 'İki tek sayının toplamı çift sayıdır.', truth: 'always',
    vars: [v('a', 'Birinci tek sayı', 1, 99, 3), v('b', 'İkinci tek sayı', 1, 99, 5)],
    run: ([a, b]) => {
      if (a % 2 === 0 || b % 2 === 0) return { text: `${a} + ${b}`, ok: null, fact: `İddia iki TEK sayıdan söz ediyor; ${a % 2 === 0 ? a : b} çift.` }
      return { text: `${a} + ${b} = ${a + b}`, ok: (a + b) % 2 === 0, fact: `${a + b} ${parity(a + b)} bir sayı.` }
    },
    quick: [[1, 1], [7, 9], [35, 51]],
    reasons: [
      { t: 'Her tek sayı bir çiftten 1 fazladır; iki tek sayıdaki iki “artık 1” birleşip yeni bir çift oluşturur.', ok: true },
      { t: 'Tek sayılar ikişerli eşleştirilince birer tane açıkta kalır; açıkta kalan iki tane birbiriyle eşleşir.', ok: true },
      EX,
      { t: 'Çünkü tek + tek = tek olur.', ok: false, q: 'Kendi örneklerine bak: 3 + 5 kaç? Tek mi?' },
    ],
    hint: 'Küçük ve büyük tek sayıları dene. Hiç tek bir toplam bulabildin mi?',
    note: 'Tek sayı = çift + 1. İki tek sayı toplanınca (çift + 1) + (çift + 1) = çift + 2 olur; bu da çifttir.',
  },
  {
    id: 'ardisik', g: [3, 4], text: 'Ardışık iki sayının toplamı tek sayıdır.', truth: 'always',
    vars: [v('n', 'Küçük sayı', 0, 99, 6)],
    run: ([n]) => ({ text: `${n} + ${n + 1} = ${2 * n + 1}`, ok: (2 * n + 1) % 2 === 1, fact: `${2 * n + 1} ${parity(2 * n + 1)} bir sayı.` }),
    quick: [[0], [9], [50]],
    reasons: [
      { t: 'Ardışık iki sayıdan biri tek, biri çifttir; tek ile çiftin toplamı tektir.', ok: true },
      { t: 'n + (n + 1): iki tane n eşleşir, 1 tane açıkta kalır.', ok: true },
      EX,
      { t: 'Çünkü büyük sayılar hep tektir.', ok: false, q: '10 büyük bir sayı. Tek mi?' },
    ],
    hint: '0’dan başlamayı ya da büyük sayıları denedin mi?',
    note: 'n + (n + 1) = 2 × n + 1. İki eş grup ve bir artık: her zaman tek.',
  },
  {
    id: 'toplam-buyuk', g: [3], text: 'İki sayıyı toplayınca sonuç, iki sayıdan da büyük olur.', truth: 'sometimes',
    vars: [v('a', 'Birinci sayı', 0, 20, 4), v('b', 'İkinci sayı', 0, 20, 3)],
    run: ([a, b]) => {
      const s = a + b
      const ok = s > a && s > b
      return { text: `${a} + ${b} = ${s}`, ok, fact: ok ? `${s}, hem ${abl(a)} hem ${abl(b)} büyük.` : `${s}, ${abl(s === a ? a : b)} büyük değil; ona eşit.` }
    },
    quick: [[5, 0], [0, 0], [7, 2]],
    fix: [
      { t: 'İki sayı da 0’dan büyükse', ok: true },
      { t: 'Sayılardan biri büyükse', ok: false, q: '9 + 0’ı düşün: 9 büyük ama toplam 9’dan büyük mü?' },
      { t: 'Toplam çift sayıysa', ok: false, q: '4 + 0 = 4, çift. Toplam 4’ten büyük mü?' },
    ],
    hint: 'Hiç değiştirmeyen bir sayı var mı? 0’ı eklemeyi dene.',
    note: 'Bir sayıya 0 eklersen sayı değişmez. Bu yüzden iddia yalnızca iki sayı da 0’dan büyükken doğrudur.',
    mis: 'Toplamanın her zaman büyüttüğünü düşündü',
  },
  {
    id: 'iki-kat-tek', g: [3], text: 'Bir sayıyı 2 ile çarparsan sonuç tek sayı olur.', truth: 'never',
    vars: [v('n', 'Sayı', 0, 50, 7)],
    run: ([n]) => ({ text: `${n} × 2 = ${2 * n}`, ok: (2 * n) % 2 === 1, fact: `${2 * n} ${parity(2 * n)} bir sayı.` }),
    quick: [[1], [13], [0]],
    reasons: [
      { t: '2 ile çarpmak, sayıyı iki eş gruba ayrılabilen bir sayı yapar; bu da çift demektir.', ok: true },
      { t: 'n × 2 = n + n: aynı sayıyı iki kez almak her zaman ikişerli eşlenir.', ok: true },
      EX,
      { t: 'Çünkü 2 küçük bir sayıdır.', ok: false, q: 'Büyüklüğü mü önemli, yoksa 2’nin çift olması mı?' },
    ],
    hint: 'Tek sayıları 2 ile çarp. Sonuç hiç tek çıktı mı?',
    note: 'n × 2 = n + n. İki eş grup her zaman çift sayı verir; iddia asla doğru değildir.',
  },
  {
    id: 'cift-tek', g: [3, 4], text: 'Bir çift sayı ile bir tek sayının toplamı çift sayıdır.', truth: 'never',
    vars: [v('a', 'Çift sayı', 0, 98, 8), v('b', 'Tek sayı', 1, 99, 5)],
    run: ([a, b]) => {
      if (a % 2 === 1) return { text: `${a} + ${b}`, ok: null, fact: `Birinci sayı çift olmalı; ${a} tek.` }
      if (b % 2 === 0) return { text: `${a} + ${b}`, ok: null, fact: `İkinci sayı tek olmalı; ${b} çift.` }
      return { text: `${a} + ${b} = ${a + b}`, ok: (a + b) % 2 === 0, fact: `${a + b} ${parity(a + b)} bir sayı.` }
    },
    quick: [[0, 1], [12, 7], [40, 25]],
    reasons: [
      { t: 'Çift sayı ikişerli eşlenir; tek sayıda bir tane açıkta kalır. Toplamda da o bir tane açıkta kalır.', ok: true },
      EX,
      { t: 'Çünkü çift sayı tek sayıdan büyüktür.', ok: false, q: '2 + 9’u dene: çift sayı küçük olsa ne olur?' },
    ],
    hint: 'Farklı çift ve tek sayılar dene. Toplam hiç çift oldu mu?',
    note: 'Çift + tek = (ikişerli gruplar) + (ikişerli gruplar + 1). Hep 1 artık kalır: toplam her zaman tektir.',
  },
  {
    id: 'dikdortgen-kare', g: [3, 4], text: 'Bir dikdörtgenin dört kenarı birbirine eşittir.', truth: 'sometimes', viz: 'rect',
    vars: [v('w', 'Genişlik', 1, 9, 6), v('h', 'Yükseklik', 1, 7, 3)],
    run: ([w, h]) => ({ text: `Kenarlar: ${w}, ${h}, ${w}, ${h}`, ok: w === h, fact: w === h ? 'Dört kenar da eşit: bu bir kare!' : `${w} ile ${h} eşit değil.` }),
    quick: [[4, 4], [8, 2]],
    fix: [
      { t: 'Dikdörtgen bir kare ise', ok: true },
      { t: 'Dikdörtgen büyükse', ok: false, q: '9’a 7’lik büyük bir dikdörtgenin kenarları eşit mi?' },
      { t: 'Kısa kenarı 1 ise', ok: false, q: '5’e 1’lik dikdörtgeni kur. Kenarları eşit mi?' },
    ],
    hint: 'Köşeyi sürükleyerek iki kenarı eşitlemeyi dene.',
    note: 'Her kare bir dikdörtgendir ama her dikdörtgen kare değildir: kenarları eşit olan dikdörtgenler karedir.',
  },
  {
    id: 'birim-kesir', g: [3, 4], text: 'Paydası büyük olan birim kesir daha büyüktür.', truth: 'never', viz: 'frac', fracs: ([b, d]) => [[1, b], [1, d]],
    vars: [v('b', 'Birinci payda', 2, 12, 3), v('d', 'İkinci payda', 2, 12, 6)],
    run: ([b, d]) => {
      if (b === d) return { text: `[[1/${b}]] ve [[1/${d}]]`, ok: null, fact: 'Paydalar eşit; karşılaştırmak için farklı paydalar seç.' }
      const big = Math.max(b, d), small = Math.min(b, d)
      return { text: `[[1/${b}]] ve [[1/${d}]]`, ok: false, fact: `Paydası büyük olan [[1/${big}]], [[1/${small}]] kesrinden küçük.` }
    },
    quick: [[2, 10], [4, 5]],
    reasons: [
      { t: 'Bütün daha çok eş parçaya bölündükçe her parça küçülür.', ok: true },
      EX,
      { t: '8, 4’ten büyük olduğu için [[1/8]] de [[1/4]]’ten büyüktür.', ok: false, q: 'Bir pizzayı 8 kişiyle mi, 4 kişiyle mi paylaşırsan daha büyük dilim alırsın?', mis: 'Birim kesirlerde paydası büyük olanı büyük sandı' },
    ],
    hint: 'Şeritlere bak: paydayı büyüttükçe boyalı parça ne oluyor?',
    note: 'Birim kesirde payda, bütünün kaç eş parçaya bölündüğünü söyler. Parça sayısı arttıkça her parça küçülür.',
  },

  // ───────── 4. sınıf ─────────
  {
    id: 'carpim-buyuk', g: [4, 5], text: 'Çarpma işleminin sonucu, çarpılan iki sayıdan da büyüktür.', truth: 'sometimes',
    vars: [v('a', 'Birinci sayı', 0, 12, 3), v('b', 'İkinci sayı', 0, 12, 4)],
    run: ([a, b]) => {
      const p = a * b
      const ok = p > a && p > b
      const which = p <= a ? a : b
      return { text: `${a} × ${b} = ${p}`, ok, fact: ok ? `${p}, hem ${abl(a)} hem ${abl(b)} büyük.` : `${p}, ${abl(which)} büyük değil.` }
    },
    quick: [[1, 7], [0, 5], [6, 6]],
    fix: [
      { t: 'İki sayı da 1’den büyükse', ok: true },
      { t: 'Sayılardan biri çiftse', ok: false, q: '2 × 1 = 2. Sonuç 2’den büyük mü?' },
      { t: 'İki sayı farklıysa', ok: false, q: '0 × 5’i dene. Sayılar farklı ama…' },
    ],
    hint: '1 ile ya da 0 ile çarpmayı denedin mi?',
    note: '1 ile çarpmak sayıyı değiştirmez, 0 ile çarpmak 0 yapar. Çarpma yalnızca iki sayı da 1’den büyükken iki sayıdan da büyük bir sonuç verir.',
    mis: 'Çarpmanın her zaman büyüttüğünü düşündü',
  },
  {
    id: 'on-bes', g: [4, 5], text: 'Bir sayı 10’a kalansız bölünüyorsa 5’e de kalansız bölünür.', truth: 'always',
    vars: [v('n', 'Sayı', 0, 500, 40)],
    run: ([n]) => {
      if (n % 10 !== 0) return { text: `${n}`, ok: null, fact: `${n} sayısı 10’a kalansız bölünmüyor; iddia 10’a bölünen sayılarla ilgili.` }
      return { text: `${n} ÷ 10 = ${n / 10}, ${n} ÷ 5 = ${n / 5}`, ok: n % 5 === 0, fact: `${n} sayısı 5’e kalansız bölünüyor.` }
    },
    quick: [[30], [120], [0]],
    reasons: [
      { t: '10 = 2 × 5; 10’un her katı aynı zamanda 5’in de katıdır.', ok: true },
      { t: 'Her onluk iki tane 5’ten oluşur.', ok: true },
      EX,
      { t: 'Çünkü 5, 10’dan küçüktür.', ok: false, q: '3 de 10’dan küçük. 20, 3’e bölünür mü?' },
    ],
    hint: '10’un katlarını dene: 10, 20, 30, … 5’e bölünmeyen var mı?',
    note: '10’un katları 10, 20, 30… her biri 5’lerin de katıdır, çünkü her 10 iki tane 5’tir.',
  },
  {
    id: 'bes-on', g: [4, 5], text: 'Bir sayı 5’e kalansız bölünüyorsa 10’a da kalansız bölünür.', truth: 'sometimes',
    vars: [v('n', 'Sayı', 0, 500, 20)],
    run: ([n]) => {
      if (n % 5 !== 0) return { text: `${n}`, ok: null, fact: `${n} sayısı 5’e kalansız bölünmüyor; iddia 5’e bölünen sayılarla ilgili.` }
      return { text: `${n} ÷ 5 = ${n / 5}`, ok: n % 10 === 0, fact: n % 10 === 0 ? `${n} sayısı 10’a da bölünüyor.` : `${n} sayısı 10’a kalansız bölünmüyor.` }
    },
    quick: [[15], [40], [5]],
    fix: [
      { t: 'Sayı çiftse', ok: true },
      { t: 'Sayı 50’den büyükse', ok: false, q: '55 sayısını dene.' },
      { t: 'Sayı 5 ile bitiyorsa', ok: false, q: '25 ile biten bir sayı 10’a bölünür mü?' },
    ],
    hint: '5 ile biten sayıları denedin mi?',
    note: '5’in katları 0 ya da 5 ile biter. 0 ile bitenler (çift olanlar) 10’a da bölünür; 5 ile bitenler bölünmez.',
    mis: 'Bölünebilmede “ise” ilişkisini tersine çevirdi',
  },
  {
    id: 'alan-cevre', g: [4, 5], text: 'Alanı daha büyük olan dikdörtgenin çevresi de daha büyüktür.', truth: 'sometimes', viz: 'rect2',
    vars: [v('w1', 'Turuncu: genişlik', 1, 9, 6), v('h1', 'Turuncu: yükseklik', 1, 6, 2), v('w2', 'Mavi: genişlik', 1, 9, 4), v('h2', 'Mavi: yükseklik', 1, 6, 4)],
    run: ([w1, h1, w2, h2]) => {
      const A1 = w1 * h1, A2 = w2 * h2, P1 = 2 * (w1 + h1), P2 = 2 * (w2 + h2)
      const txt = `Turuncu: alan ${A1}, çevre ${P1} · Mavi: alan ${A2}, çevre ${P2}`
      if (A1 === A2) return { text: txt, ok: null, fact: 'Alanlar eşit; birinin alanı daha büyük olmalı.' }
      const [Ab, Pb, Ps] = A1 > A2 ? ['Turuncunun', P1, P2] : ['Mavinin', P2, P1]
      return { text: txt, ok: Pb > Ps, fact: Pb > Ps ? `${Ab} alanı da çevresi de daha büyük.` : `${Ab} alanı büyük ama çevresi ${Pb === Ps ? 'eşit' : 'daha küçük'}.` }
    },
    quick: [[6, 2, 4, 4], [8, 1, 3, 3], [5, 4, 6, 1]],
    fix: [
      { t: 'Küçük dikdörtgen büyüğün içine sığıyorsa', ok: true },
      { t: 'İki dikdörtgen de kare değilse', ok: false, q: '8’e 1 ile 3’e 3’ü karşılaştır: hangisi kare?' },
      { t: 'Alanlar çift sayıysa', ok: false, q: '6’ya 2 (alan 12) ile 4’e 4 (alan 16): çevreleri nasıl?' },
    ],
    hint: 'Biri uzun ve ince, öbürü kareye yakın iki dikdörtgen kur.',
    note: 'Alan ile çevre birlikte artmak zorunda değildir: uzun ince bir dikdörtgenin çevresi büyük, alanı küçük olabilir.',
    mis: 'Alan büyüdükçe çevrenin de büyüdüğünü düşündü',
  },
  {
    id: 'pay-buyuk', g: [4], text: 'Paydaları eşit iki kesirden payı büyük olan daha büyüktür.', truth: 'always', viz: 'frac', fracs: ([a, b, d]) => [[a, d], [b, d]],
    vars: [v('a', 'Birinci pay', 1, 12, 2), v('b', 'İkinci pay', 1, 12, 5), v('d', 'Ortak payda', 2, 12, 6)],
    run: ([a, b, d]) => {
      if (a === b) return { text: `[[${a}/${d}]] ve [[${b}/${d}]]`, ok: null, fact: 'Paylar eşit; farklı paylar seç.' }
      const big = Math.max(a, b), small = Math.min(a, b)
      return { text: `[[${a}/${d}]] ve [[${b}/${d}]]`, ok: true, fact: `[[${big}/${d}]], [[${small}/${d}]] kesrinden büyük.` }
    },
    quick: [[1, 2, 3], [7, 9, 12]],
    reasons: [
      { t: 'Parçalar aynı büyüklükte; daha çok parça alan daha çok almış olur.', ok: true },
      EX,
      { t: 'Çünkü büyük sayı her zaman büyük kesir demektir.', ok: false, q: '[[1/2]] ile [[2/8]]’i düşün: 8 büyük ama…' },
    ],
    hint: 'Paydayı değiştirerek farklı kesirler dene.',
    note: 'Payda aynıysa parçaların büyüklüğü aynıdır; pay, kaç parça alındığını söyler. Daha çok parça → daha büyük kesir.',
  },
  {
    id: 'dar-dar', g: [4, 5], text: 'İki dar açının toplamı geniş açıdır.', truth: 'sometimes', viz: 'angles',
    vars: [v('a', 'Birinci açı (°)', 5, 85, 60, 5), v('b', 'İkinci açı (°)', 5, 85, 50, 5)],
    run: ([a, b]) => {
      const s = a + b
      const kind = s < 90 ? 'dar' : s === 90 ? 'dik' : 'geniş'
      return { text: `${a}° + ${b}° = ${s}°`, ok: s > 90, fact: `${s}°’lik açı ${kind} bir açı.` }
    },
    quick: [[30, 40], [45, 45], [80, 70]],
    fix: [
      { t: 'İki açının toplamı 90°’den büyükse', ok: true },
      { t: 'İki açı da 30°’den büyükse', ok: false, q: '35° + 40°’ı dene.' },
      { t: 'Açılar eşitse', ok: false, q: '45° + 45° kaç eder? Geniş mi?' },
    ],
    hint: 'İki küçük dar açı dene: 20° ile 30° gibi.',
    note: 'Dar açılar 90°’den küçüktür; ikisinin toplamı 90°’den küçük, eşit ya da büyük olabilir.',
  },
  {
    id: 'bilesik', g: [4, 5], text: 'Bileşik kesir 1’den küçüktür.', truth: 'never', viz: 'frac', fracs: ([a, b]) => [[a, b]],
    vars: [v('a', 'Pay', 1, 15, 7), v('b', 'Payda', 2, 12, 4)],
    run: ([a, b]) => {
      if (a < b) return { text: `[[${a}/${b}]]`, ok: null, fact: `[[${a}/${b}]] kesrinin payı paydasından küçük; bu bileşik kesir değil.` }
      return { text: `[[${a}/${b}]]`, ok: a / b < 1, fact: a === b ? `[[${a}/${b}]] tam 1 bütün.` : `[[${a}/${b}]] 1 bütünden fazla.` }
    },
    quick: [[3, 3], [9, 2]],
    reasons: [
      { t: 'Payı paydasına eşit ya da büyük olduğu için en az bir bütün eder.', ok: true },
      EX,
      { t: 'Kesirler zaten her zaman 1’den küçüktür.', ok: false, q: '[[5/4]] ile bir bütünü şeritte karşılaştır.', mis: 'Kesirlerin her zaman 1’den küçük olduğunu düşündü' },
    ],
    hint: 'Payı paydasına eşit ya da büyük kesirler kur.',
    note: 'Bileşik kesirde pay ≥ payda olduğu için en az bir bütün vardır: [[4/4]] = 1, [[7/4]] = 1 tam [[3/4]].',
  },

  // ───────── 5. sınıf ─────────
  {
    id: 'pay-payda-ekle', g: [5, 6], text: 'Bir kesrin payına ve paydasına aynı sayıyı eklersen kesrin değeri değişmez.', truth: 'sometimes', viz: 'frac', fracs: ([a, b, k]) => [[a, b], [a + k, b + k]],
    vars: [v('a', 'Pay', 1, 9, 1), v('b', 'Payda', 1, 9, 2), v('k', 'Eklenen sayı', 1, 5, 1)],
    run: ([a, b, k]) => {
      const same = a * (b + k) === b * (a + k)
      return { text: `[[${a}/${b}]] → [[${a + k}/${b + k}]]`, ok: same, fact: same ? 'İki kesir eşit.' : `[[${a}/${b}]] ≈ ${nf(a / b)} ama [[${a + k}/${b + k}]] ≈ ${nf((a + k) / (b + k))}.` }
    },
    quick: [[2, 2, 3], [3, 4, 1], [1, 3, 5]],
    fix: [
      { t: 'Kesir 1’e eşitse (pay = payda)', ok: true },
      { t: 'Eklenen sayı küçükse', ok: false, q: '[[1/2]] kesrine 1 ekledin mi? [[2/3]] ile aynı mı?' },
      { t: 'Kesir [[1/2]] ise', ok: false, q: '[[1/2]] → [[2/3]]: aynı mı?' },
    ],
    hint: 'Payı ile paydası eşit olan bir kesir dene.',
    note: 'Denk kesir için pay ve paydayı aynı sayıyla ÇARPARIZ ya da BÖLERİZ. Aynı sayıyı eklemek yalnızca kesir 1’e eşitken değeri korur.',
    mis: 'Denk kesirde toplamsal düşündü',
  },
  {
    id: 'cevre-alan', g: [5, 6], text: 'Bir dikdörtgenin çevresinin sayı değeri, alanının sayı değerinden büyüktür.', truth: 'sometimes', viz: 'rect',
    vars: [v('w', 'Genişlik', 1, 12, 5), v('h', 'Yükseklik', 1, 8, 2)],
    run: ([w, h]) => {
      const P = 2 * (w + h), A = w * h
      return { text: `Çevre ${P} br, alan ${A} br²`, ok: P > A, fact: P > A ? `${P} > ${A}` : P === A ? `${P} = ${A}: eşit!` : `${P} < ${A}` }
    },
    quick: [[4, 4], [6, 3], [9, 2]],
    fix: [
      { t: 'Kenarlardan biri 1 ya da 2 birimse', ok: true },
      { t: 'Dikdörtgen kare ise', ok: false, q: '4’e 4’lük kareyi dene.' },
      { t: 'Uzun kenar 10’dan büyükse', ok: false, q: '11’e 5’lik dikdörtgeni dene.' },
    ],
    hint: 'Kareye yakın, büyük bir dikdörtgen kur.',
    note: 'Küçük ya da ince dikdörtgenlerde çevre sayısı büyük, kareye yakın büyük dikdörtgenlerde alan sayısı büyük çıkar.',
  },
  {
    id: 'bol-carp', g: [5], text: 'Bir sayıyı 4’e bölüp sonucu 4 ile çarparsan başladığın sayıyı bulursun.', truth: 'always',
    vars: [v('n', 'Sayı (4’ün katı)', 0, 400, 36, 4)],
    run: ([n]) => ({ text: `${n} ÷ 4 = ${n / 4} → ${n / 4} × 4 = ${n}`, ok: true, fact: `Yeniden ${n} bulundu.` }),
    quick: [[0], [4], [400]],
    reasons: [
      { t: 'Çarpma ve bölme birbirinin tersidir; biri öbürünün yaptığını geri alır.', ok: true },
      { t: '4 eş gruba ayırıp sonra 4 grubu birleştirince başlangıçtaki miktar geri gelir.', ok: true },
      EX,
      { t: 'Çünkü 4 ÷ 4 = 0’dır.', ok: false, q: '4 ÷ 4 kaç eder? 0 mı, 1 mi?' },
    ],
    hint: 'Çok büyük ve çok küçük sayılar dene.',
    note: 'n ÷ 4 × 4 = n: bölme ile çarpma ters işlemlerdir.',
  },
  {
    id: 'bilesik-buyuk', g: [5], text: 'Payı paydasından büyük olan bir kesir 1’den büyüktür.', truth: 'always', viz: 'frac', fracs: ([a, b]) => [[a, b]],
    vars: [v('a', 'Pay', 1, 15, 7), v('b', 'Payda', 1, 12, 5)],
    run: ([a, b]) => {
      if (a <= b) return { text: `[[${a}/${b}]]`, ok: null, fact: `[[${a}/${b}]] kesrinin payı paydasından büyük değil.` }
      return { text: `[[${a}/${b}]]`, ok: a / b > 1, fact: `[[${a}/${b}]] = 1 bütün ve [[${a - b}/${b}]] daha.` }
    },
    quick: [[6, 5], [12, 1]],
    reasons: [
      { t: 'Bir bütünde payda kadar parça vardır; daha fazla parça bir bütünü aşar.', ok: true },
      EX,
      { t: 'Çünkü pay büyükse kesir de büyüktür.', ok: false, q: '[[6/12]] kesrinin payı 6, ama 1’den büyük mü?' },
    ],
    hint: 'Payı paydasından yalnızca 1 fazla kesirler dene.',
    note: '[[b/b]] = 1. Pay paydadan büyükse [[a/b]] = 1 + [[a − b/b]] olur.',
  },
  {
    id: 'oncelik', g: [5, 6], text: 'a + b × c ile (a + b) × c işlemlerinin sonucu aynıdır.', truth: 'sometimes',
    vars: [v('a', 'a', 0, 9, 2), v('b', 'b', 0, 9, 3), v('c', 'c', 0, 9, 4)],
    run: ([a, b, c]) => {
      const x = a + b * c, y = (a + b) * c
      return { text: `${a} + ${b} × ${c} = ${x} · (${a} + ${b}) × ${c} = ${y}`, ok: x === y, fact: x === y ? `İkisi de ${x}.` : `${x} ≠ ${y}` }
    },
    quick: [[0, 5, 3], [4, 2, 1], [3, 3, 3]],
    fix: [
      { t: 'a = 0 ya da c = 1 ise', ok: true },
      { t: 'b = 0 ise', ok: false, q: 'b = 0, a = 2, c = 4: 2 + 0 ile 2 × 4 aynı mı?' },
      { t: 'a = b ise', ok: false, q: '3 + 3 × 3 ile (3 + 3) × 3’ü hesapla.' },
    ],
    hint: 'a’yı 0 yap ya da c’yi 1 yap. Ne oluyor?',
    note: 'İşlem önceliği sonucu değiştirir. (a + b) × c = a × c + b × c; bu, a + b × c’ye ancak a × c = a iken (a = 0 ya da c = 1) eşittir.',
    mis: 'İşlem önceliğini dikkate almadı',
  },
  {
    id: 'oruntu-3', g: [5], text: 'Her adımda 3 eklenen bir örüntünün bütün terimleri 3’ün katıdır.', truth: 'sometimes',
    vars: [v('s', 'İlk terim', 0, 20, 3)],
    run: ([s]) => ({ text: `${s}, ${s + 3}, ${s + 6}, ${s + 9}, …`, ok: s % 3 === 0, fact: s % 3 === 0 ? 'Hepsi 3’ün katı.' : `${s} sayısı 3’ün katı değil.` }),
    quick: [[0], [1], [12]],
    fix: [
      { t: 'İlk terim 3’ün katıysa', ok: true },
      { t: 'İlk terim tekse', ok: false, q: '5 ile başla: 5, 8, 11…' },
      { t: 'İlk terim 3’ten küçükse', ok: false, q: '1 ile başla: 1, 4, 7…' },
    ],
    hint: 'İlk terimi değiştir: 1 ya da 2 ile başla.',
    note: 'Örüntünün kuralı yalnızca “artış miktarı” değildir; başlangıç terimi de önemlidir.',
  },

  // ───────── 6. sınıf ─────────
  {
    id: 'carpma-ondalik', g: [6, 7], text: 'Çarpma işleminin sonucu, çarpılan sayılardan büyüktür.', truth: 'sometimes',
    vars: [v('a', 'Birinci sayı', 0, 10, 4, 0.5), v('b', 'İkinci sayı', 0, 10, 0.5, 0.5)],
    run: ([a, b]) => {
      const p = a * b
      const ok = p > a && p > b
      return { text: `${nf(a)} × ${nf(b)} = ${nf(p)}`, ok, fact: ok ? `${nf(p)}, iki sayıdan da büyük.` : `${nf(p)}, ${nf(p <= a ? a : b)} sayısından büyük değil.` }
    },
    quick: [[4, 0.5], [2.5, 2], [1, 7]],
    fix: [
      { t: 'İki sayı da 1’den büyükse', ok: true },
      { t: 'Sayılar ondalıklı değilse', ok: false, q: '1 × 7’yi dene.' },
      { t: 'Sayılardan biri çiftse', ok: false, q: '0,5 × 4: 4 çift ama…' },
    ],
    hint: '1’den küçük bir sayıyla (0,5 gibi) çarpmayı dene.',
    note: '1’den küçük bir sayıyla çarpmak, sayının bir parçasını almak demektir: 4 × 0,5 = 4’ün yarısı = 2.',
    mis: 'Çarpmanın her zaman büyüttüğünü düşündü',
  },
  {
    id: 'bolme-kucuk', g: [6, 7], text: 'Bölme işleminin sonucu, bölünen sayıdan küçüktür.', truth: 'sometimes',
    vars: [v('a', 'Bölünen', 1, 20, 6, 0.5), v('b', 'Bölen', 0.5, 10, 2, 0.5)],
    run: ([a, b]) => {
      const q = a / b
      return { text: `${nf(a)} ÷ ${nf(b)} = ${nf(q)}`, ok: q < a, fact: q < a ? `${nf(q)} < ${nf(a)}` : q === a ? `${nf(q)} = ${nf(a)}` : `${nf(q)} > ${nf(a)}` }
    },
    quick: [[6, 0.5], [6, 1], [9, 3]],
    fix: [
      { t: 'Bölen 1’den büyükse', ok: true },
      { t: 'Bölünen bölenden büyükse', ok: false, q: '6 ÷ 0,5’i dene: 6 büyük ama sonuç?' },
      { t: 'Sayılar tam sayıysa', ok: false, q: '6 ÷ 1’i dene.' },
    ],
    hint: '1 ile ya da 1’den küçük bir sayıyla bölmeyi dene.',
    note: '6 ÷ 0,5 “6’nın içinde kaç tane yarım var?” demektir: 12 tane. Bölen 1’den küçükse sonuç büyür.',
    mis: 'Bölmenin her zaman küçülttüğünü düşündü',
  },
  {
    id: 'asal-toplam', g: [6], text: 'İki asal sayının toplamı çift sayıdır.', truth: 'sometimes',
    vars: [v('a', 'Birinci asal', 2, 50, 3), v('b', 'İkinci asal', 2, 50, 5)],
    run: ([a, b]) => {
      if (!isPrime(a) || !isPrime(b)) return { text: `${a} + ${b}`, ok: null, fact: `${isPrime(a) ? b : a} asal sayı değil.` }
      return { text: `${a} + ${b} = ${a + b}`, ok: (a + b) % 2 === 0, fact: `${a + b} ${parity(a + b)}.` }
    },
    quick: [[3, 5], [2, 7], [11, 13]],
    fix: [
      { t: 'İki asal da 2’den farklıysa', ok: true },
      { t: 'Asallar ardışık değilse', ok: false, q: '2 ile 5 ardışık değil. Toplamları?' },
      { t: 'Toplam 10’dan büyükse', ok: false, q: '2 + 11’i dene.' },
    ],
    hint: 'En küçük asal sayıyı denedin mi?',
    note: '2 tek çift asal sayıdır. Diğer asallar tektir ve iki tek sayının toplamı çifttir; ama 2 + tek asal tektir.',
    mis: 'Bütün asal sayıları tek sandı',
  },
  {
    id: 'bolen-sayisi', g: [6], text: 'Bir doğal sayının bölen sayısı çifttir.', truth: 'sometimes',
    vars: [v('n', 'Sayı', 1, 100, 12)],
    run: ([n]) => {
      const ds: number[] = []
      for (let i = 1; i <= n; i++) if (n % i === 0) ds.push(i)
      return { text: `${n}: ${ds.join(', ')}`, ok: ds.length % 2 === 0, fact: `${ds.length} bölen var (${parity(ds.length)}).` }
    },
    quick: [[16], [12], [1]],
    fix: [
      { t: 'Sayı tam kare değilse', ok: true },
      { t: 'Sayı çiftse', ok: false, q: '4 ve 16 çift. Kaç böleni var?' },
      { t: 'Sayı asal değilse', ok: false, q: '9’un bölenlerini say.' },
    ],
    hint: '4, 9, 16 gibi sayıları dene.',
    note: 'Bölenler ikişer eşleşir: 12 = 1 × 12 = 2 × 6 = 3 × 4. Tam karede bir bölen kendisiyle eşleşir (16 = 4 × 4), bu yüzden bölen sayısı tektir.',
  },
  {
    id: 'alti', g: [6], text: 'Bir sayı 6’ya kalansız bölünüyorsa hem 2’ye hem 3’e kalansız bölünür.', truth: 'always',
    vars: [v('n', 'Sayı', 0, 300, 42)],
    run: ([n]) => {
      if (n % 6 !== 0) return { text: `${n}`, ok: null, fact: `${n} sayısı 6’ya kalansız bölünmüyor; iddia 6’ya bölünen sayılarla ilgili.` }
      return { text: `${n} ÷ 2 = ${n / 2}, ${n} ÷ 3 = ${n / 3}`, ok: n % 2 === 0 && n % 3 === 0, fact: 'İkisine de kalansız bölünüyor.' }
    },
    quick: [[6], [0], [252]],
    reasons: [
      { t: '6 = 2 × 3; 6’nın her katında 2 ve 3 çarpan olarak vardır.', ok: true },
      EX,
      { t: 'Çünkü 2 + 3 = 5, 6’dan küçük.', ok: false, q: '6 ile 2 ve 3 arasındaki ilişki toplama mı, çarpma mı?' },
    ],
    hint: '6’nın katlarını dene.',
    note: 'n = 6 × k = 2 × (3 × k) = 3 × (2 × k): hem 2’nin hem 3’ün katı.',
  },
  {
    id: 'iki-dort-sekiz', g: [6], text: 'Bir sayı 4’e kalansız bölünüyorsa 8’e de kalansız bölünür.', truth: 'sometimes',
    vars: [v('n', 'Sayı', 0, 200, 24)],
    run: ([n]) => {
      if (n % 4 !== 0) return { text: `${n}`, ok: null, fact: `${n} sayısı 4’e kalansız bölünmüyor.` }
      return { text: `${n} ÷ 4 = ${n / 4}${n % 8 === 0 ? `, ${n} ÷ 8 = ${n / 8}` : ''}`, ok: n % 8 === 0, fact: n % 8 === 0 ? '8’e de bölünüyor.' : '8’e kalansız bölünmüyor.' }
    },
    quick: [[12], [4], [16]],
    fix: [
      { t: '4’e bölündükten sonra sonuç çiftse', ok: true },
      { t: 'Sayı 12’den büyükse', ok: false, q: '20 sayısını dene.' },
      { t: 'Sayı 2’ye de bölünüyorsa', ok: false, q: '4’e bölünen her sayı 2’ye de bölünür. 12’yi dene.' },
    ],
    hint: '12 ya da 20 gibi sayıları dene.',
    note: '8 = 4 × 2. 4’e bölünen bir sayı 8’e de bölünsün diye, bölüm (n ÷ 4) çift olmalıdır.',
  },
  {
    id: 'asal-tek', g: [6], text: 'Asal sayılar tek sayıdır.', truth: 'sometimes',
    vars: [v('n', 'Asal sayı', 2, 60, 7)],
    run: ([n]) => {
      if (!isPrime(n)) return { text: `${n}`, ok: null, fact: `${n} asal sayı değil; asal bir sayı seç.` }
      return { text: `${n}`, ok: n % 2 === 1, fact: `${n} ${parity(n)}.` }
    },
    quick: [[2], [13], [59]],
    fix: [
      { t: 'Asal sayı 2 değilse', ok: true },
      { t: 'Asal sayı 10’dan büyükse', ok: false, q: '3, 5, 7: 10’dan küçük ve tek.' },
      { t: 'Asal sayının rakamları farklıysa', ok: false, q: 'Rakamlar tek/çiftliği belirler mi?' },
    ],
    hint: 'En küçük asal sayı hangisi?',
    note: '2 hem asal hem çifttir. Diğer bütün çift sayılar 2’ye bölündüğü için asal olamaz.',
    mis: 'Bütün asal sayıları tek sandı',
  },
  {
    id: 'yuzde-50', g: [6, 7], text: 'Bir sayıyı %50 artırıp sonra %50 azaltırsan başladığın sayıya dönersin.', truth: 'never',
    vars: [v('n', 'Başlangıç', 10, 1000, 200, 10)],
    run: ([n]) => ({ text: `${nf(n)} → ${nf(n * 1.5)} → ${nf(n * 0.75)}`, ok: n * 0.75 === n, fact: `${nf(n * 0.75)} ≠ ${nf(n)}` }),
    quick: [[100], [10], [1000]],
    reasons: [
      { t: 'İkinci %50, daha büyük bir sayının yarısıdır; azalış, artıştan fazla olur.', ok: true },
      { t: '×1,5 sonra ×0,5 yapmak ×0,75 yapmaktır; sayı hep küçülür.', ok: true },
      EX,
      { t: '%50 + %50 = %100, yani bir şey değişmez.', ok: false, q: 'Kendi örneğine bak: başladığın sayıya döndün mü?', mis: 'Yüzde değişimlerinin toplanabileceğini düşündü' },
    ],
    hint: 'Farklı sayılar dene: 100 ile başla.',
    note: '100 → 150 → 75. Artış 100’ün %50’si, azalış 150’nin %50’si: aynı miktar değil.',
  },

  // ───────── 7. sınıf ─────────
  {
    id: 'neg-neg-toplam', g: [7], text: 'İki negatif tam sayının toplamı negatiftir.', truth: 'always',
    vars: [v('a', 'a', -20, -1, -4), v('b', 'b', -20, -1, -7)],
    run: ([a, b]) => ({ text: `${nf(a)} + ${par(b)} = ${nf(a + b)}`, ok: a + b < 0, fact: `${nf(a + b)} negatif.` }),
    quick: [[-1, -1], [-20, -15]],
    reasons: [
      { t: 'Sayı doğrusunda sıfırın solundan başlayıp yine sola gidersin.', ok: true },
      { t: 'İki borcun toplamı yine borçtur.', ok: true },
      EX,
      { t: 'İki eksi artı yapar.', ok: false, q: '−3 + (−4) için sayı doğrusunda yürü. Nereye vardın?', mis: 'Çarpmadaki işaret kuralını toplamaya uyguladı' },
    ],
    hint: 'Çok küçük ve çok büyük negatif sayılar dene.',
    note: '(−a) + (−b) = −(a + b): sola iki adım daha sola götürür.',
  },
  {
    id: 'fark-kucuk', g: [7], text: 'İki tam sayının farkı (a − b), a’dan küçüktür.', truth: 'sometimes',
    vars: [v('a', 'a', -10, 10, 6), v('b', 'b', -10, 10, 2)],
    run: ([a, b]) => {
      const d = a - b
      return { text: `${nf(a)} − ${par(b)} = ${nf(d)}`, ok: d < a, fact: d < a ? `${nf(d)} < ${nf(a)}` : d === a ? `${nf(d)} = ${nf(a)}` : `${nf(d)} > ${nf(a)}` }
    },
    quick: [[5, -3], [5, 0], [-2, 4]],
    fix: [
      { t: 'b pozitifse', ok: true },
      { t: 'a pozitifse', ok: false, q: 'a = 5, b = −3: 5 − (−3) kaç?' },
      { t: 'a, b’den büyükse', ok: false, q: 'a = 5, b = −3: a büyük ama fark?' },
    ],
    hint: 'Negatif bir sayı çıkarmayı dene.',
    note: 'Negatif bir sayıyı çıkarmak, pozitifini eklemek demektir: 5 − (−3) = 8. Fark yalnızca b pozitifken a’dan küçüktür.',
    mis: 'Çıkarmanın her zaman küçülttüğünü düşündü',
  },
  {
    id: 'eksi-a', g: [7, 8], text: '−a negatif bir sayıdır.', truth: 'sometimes',
    vars: [v('a', 'a', -10, 10, 4)],
    run: ([a]) => ({ text: `a = ${nf(a)} ⇒ −a = ${nf(-a)}`, ok: -a < 0, fact: -a < 0 ? `${nf(-a)} negatif.` : -a === 0 ? '0 ne pozitif ne negatif.' : `${nf(-a)} pozitif!` }),
    quick: [[-3], [0], [7]],
    fix: [
      { t: 'a pozitifse', ok: true },
      { t: 'a bir tam sayıysa', ok: false, q: 'a = −3 bir tam sayı. −a kaç?' },
      { t: 'a sıfırdan farklıysa', ok: false, q: 'a = −5 sıfırdan farklı. −a?' },
    ],
    hint: 'a’ya negatif bir değer ver.',
    note: '−a, “a’nın ters işaretlisi” demektir; a negatifse −a pozitiftir.',
    mis: '−a ifadesini her zaman negatif sandı',
  },
  {
    id: 'mutlak', g: [7], text: 'Bir sayının mutlak değeri, o sayıdan büyüktür.', truth: 'sometimes',
    vars: [v('a', 'Sayı', -10, 10, 5)],
    run: ([a]) => ({ text: `|${nf(a)}| = ${nf(Math.abs(a))}`, ok: Math.abs(a) > a, fact: Math.abs(a) > a ? `${nf(Math.abs(a))} > ${nf(a)}` : `${nf(Math.abs(a))} = ${nf(a)}` }),
    quick: [[-4], [0], [9]],
    fix: [
      { t: 'Sayı negatifse', ok: true },
      { t: 'Sayı tekse', ok: false, q: '|5| ile 5’i karşılaştır.' },
      { t: 'Sayı 0’dan farklıysa', ok: false, q: '|3| kaç?' },
    ],
    hint: 'Pozitif bir sayı ya da 0 dene.',
    note: 'Mutlak değer, sayının sıfıra uzaklığıdır. Pozitif sayılar ve 0 için mutlak değer sayının kendisine eşittir.',
  },
  {
    id: 'neg-carp', g: [7], text: 'İki negatif sayının çarpımı negatiftir.', truth: 'never',
    vars: [v('a', 'a', -12, -1, -3), v('b', 'b', -12, -1, -4)],
    run: ([a, b]) => ({ text: `${par(a)} × ${par(b)} = ${nf(a * b)}`, ok: a * b < 0, fact: `${nf(a * b)} pozitif.` }),
    quick: [[-1, -1], [-12, -5]],
    reasons: [
      { t: 'Negatif bir sayıyla çarpmak yönü tersine çevirir; iki kez tersine çevirince pozitif olur.', ok: true },
      { t: '(−3) × 4 = −12 ise (−3) × (−4), −12’nin tersi olan 12 olmalıdır.', ok: true },
      EX,
      { t: 'İki eksi daha çok eksi yapar.', ok: false, q: '(−2) × (−3) kaç? Örneğine bak.', mis: 'Negatiflerin çarpımında işaret kuralını yanlış uyguladı' },
    ],
    hint: 'Farklı negatif sayı çiftleri dene.',
    note: '(−a) × (−b) = a × b > 0. İşaretler “ters × ters = düz” gibi davranır.',
  },
  {
    id: 'iki-x-bir', g: [7, 8], text: 'x bir tam sayı ise 2x + 1 tek sayıdır.', truth: 'always',
    vars: [v('x', 'x', -20, 20, 3)],
    run: ([x]) => ({ text: `2 × ${par(x)} + 1 = ${nf(2 * x + 1)}`, ok: Math.abs(2 * x + 1) % 2 === 1, fact: `${nf(2 * x + 1)} tek.` }),
    quick: [[0], [-1], [-20]],
    reasons: [
      { t: '2x her zaman çifttir; çift bir sayıya 1 eklemek tek sayı verir.', ok: true },
      EX,
      { t: 'Çünkü x tek sayıdır.', ok: false, q: 'x = 4 olsun: 2x + 1 kaç?' },
    ],
    hint: 'Negatif sayıları ve 0’ı da dene.',
    note: '2x, iki eş gruptur: çifttir. Çift + 1 = tek.',
  },
  {
    id: 'x-arti-5', g: [7], text: 'x + 5 > 5’tir.', truth: 'sometimes',
    vars: [v('x', 'x', -10, 10, 2)],
    run: ([x]) => ({ text: `${nf(x)} + 5 = ${nf(x + 5)}`, ok: x + 5 > 5, fact: x + 5 > 5 ? `${nf(x + 5)} > 5` : `${nf(x + 5)} > 5 değil.` }),
    quick: [[0], [-3], [8]],
    fix: [
      { t: 'x pozitifse', ok: true },
      { t: 'x bir tam sayıysa', ok: false, q: 'x = −2 bir tam sayı. Ne oluyor?' },
      { t: 'x tek sayıysa', ok: false, q: 'x = −1’i dene.' },
    ],
    hint: 'x için 0 ya da negatif bir değer dene.',
    note: 'Bir sayıya ekleme her zaman büyütmez: negatif sayı eklemek küçültür, 0 eklemek değiştirmez.',
    mis: 'Toplamanın her zaman büyüttüğünü düşündü',
  },
  {
    id: 'ardisik-uc', g: [7, 8], text: 'Ardışık üç tam sayının toplamı 3’ün katıdır.', truth: 'always',
    vars: [v('n', 'En küçük sayı', -20, 30, 4)],
    run: ([n]) => ({ text: `${nf(n)} + ${par(n + 1)} + ${par(n + 2)} = ${nf(3 * n + 3)}`, ok: (3 * n + 3) % 3 === 0, fact: `${nf(3 * n + 3)} = 3 × ${par(n + 1)}` }),
    quick: [[-1], [-20], [0]],
    reasons: [
      { t: 'n + (n + 1) + (n + 2) = 3n + 3 = 3 × (n + 1)', ok: true },
      { t: 'En büyükten 1 alıp en küçüğe verince üç eş sayı kalır: ortanca × 3.', ok: true },
      EX,
      { t: 'Çünkü içlerinden biri her zaman 3’tür.', ok: false, q: '10, 11, 12’de 3 var mı?' },
    ],
    hint: 'Negatif sayılarla başlayan üçlüleri de dene.',
    note: 'Ardışık üç sayının toplamı, ortancanın 3 katıdır: 4 + 5 + 6 = 3 × 5.',
  },
  {
    id: 'yarim-kucuk', g: [7], text: 'Bir sayıyı [[1/2]] ile çarparsan sonuç küçülür.', truth: 'sometimes',
    vars: [v('a', 'Sayı', -10, 10, 6, 0.5)],
    run: ([a]) => ({ text: `${par(a)} × [[1/2]] = ${nf(a / 2)}`, ok: a / 2 < a, fact: a / 2 < a ? `${nf(a / 2)} < ${nf(a)}` : a === 0 ? '0 değişmedi.' : `${nf(a / 2)} > ${nf(a)}` }),
    quick: [[-8], [0], [0.5]],
    fix: [
      { t: 'Sayı pozitifse', ok: true },
      { t: 'Sayı tam sayıysa', ok: false, q: '−8’i dene.' },
      { t: 'Sayı çiftse', ok: false, q: '−4’ü dene.' },
    ],
    hint: 'Negatif bir sayının yarısını al.',
    note: '−8’in yarısı −4’tür ve −4 > −8. Negatif sayılarda yarıya inmek sıfıra yaklaştırır, yani büyütür.',
    mis: 'Negatif sayılarda büyüklük ilişkisini ters yorumladı',
  },

  // ───────── 8. sınıf ─────────
  {
    id: 'kare-buyuk', g: [8], text: 'Bir sayının karesi kendisinden büyüktür.', truth: 'sometimes',
    vars: [v('a', 'Sayı', -5, 5, 3, 0.1)],
    run: ([a]) => ({ text: `${par(a)}^{2} = ${nf(a * a)}`, ok: a * a > a, fact: a * a > a ? `${nf(a * a)} > ${nf(a)}` : a * a === a ? `${nf(a * a)} = ${nf(a)}` : `${nf(a * a)} < ${nf(a)}` }),
    quick: [[0.5], [1], [0], [-2]],
    fix: [
      { t: 'Sayı 1’den büyük ya da negatifse', ok: true },
      { t: 'Sayı pozitifse', ok: false, q: '0,5’in karesini hesapla.' },
      { t: 'Sayı tam sayıysa', ok: false, q: '1 ve 0 da tam sayı.' },
    ],
    hint: '0 ile 1 arasında bir sayı dene.',
    note: '0 ile 1 arasındaki sayıların karesi küçülür: 0,5^{2} = 0,25. 0 ve 1’in karesi kendisine eşittir.',
    mis: 'Kare almanın her zaman büyüttüğünü düşündü',
  },
  {
    id: 'kok-toplam', g: [8], text: '√{a} + √{b} = √{a + b}', truth: 'sometimes',
    vars: [v('a', 'a', 0, 100, 9), v('b', 'b', 0, 100, 16)],
    run: ([a, b]) => {
      const l = Math.sqrt(a) + Math.sqrt(b), r = Math.sqrt(a + b)
      const eq = Math.abs(l - r) < 1e-9
      const f = (x: number) => (Number.isInteger(x) ? nf(x) : `≈ ${nf(Math.round(x * 100) / 100)}`)
      return { text: `√{${a}} + √{${b}} = ${f(l)} · √{${a + b}} = ${f(r)}`, ok: eq, fact: eq ? 'İki taraf eşit.' : `${f(l)} ≠ ${f(r)}` }
    },
    quick: [[9, 16], [0, 25], [36, 64]],
    fix: [
      { t: 'a ya da b sıfırsa', ok: true },
      { t: 'a ve b tam kareyse', ok: false, q: '9 ve 16 tam kare: 3 + 4 ile √{25} aynı mı?' },
      { t: 'a = b ise', ok: false, q: 'a = b = 4: 2 + 2 ile √{8}?' },
    ],
    hint: 'Sayılardan birini 0 yap.',
    note: 'Karekök toplamaya dağılmaz: √{9} + √{16} = 7 ama √{25} = 5. Çarpmaya dağılır: √{a × b} = √{a} × √{b}.',
    mis: 'Karekökü toplamaya dağıttı',
  },
  {
    id: 'iki-us', g: [8], text: 'n bir doğal sayı ise 2^{n} çift sayıdır.', truth: 'sometimes',
    vars: [v('n', 'n', 0, 10, 3)],
    run: ([n]) => ({ text: `2^{${n}} = ${2 ** n}`, ok: (2 ** n) % 2 === 0, fact: `${2 ** n} ${parity(2 ** n)}.` }),
    quick: [[0], [1], [10]],
    fix: [
      { t: 'n ≥ 1 ise', ok: true },
      { t: 'n çiftse', ok: false, q: 'n = 0 da çift. 2^{0} kaç?' },
      { t: 'n tekse', ok: false, q: 'n = 2: 4 çift. Tek olması şart mı?' },
    ],
    hint: 'n = 0’ı denedin mi?',
    note: '2^{0} = 1 tektir. n ≥ 1 olduğunda 2^{n} en az bir tane 2 çarpanı içerir, bu yüzden çifttir.',
    mis: 'Sıfırıncı kuvveti 0 ya da taban sandı',
  },
  {
    id: 'kup-negatif', g: [8], text: 'Negatif bir sayının küpü negatiftir.', truth: 'always',
    vars: [v('a', 'Negatif sayı', -10, -0.5, -2, 0.5)],
    run: ([a]) => ({ text: `${par(a)}^{3} = ${nf(a ** 3)}`, ok: a ** 3 < 0, fact: `${nf(a ** 3)} negatif.` }),
    quick: [[-1], [-0.5], [-10]],
    reasons: [
      { t: 'Üç negatif çarpan: ilk ikisinin çarpımı pozitif, üçüncüsü yeniden negatif yapar.', ok: true },
      { t: 'Tek sayıda negatif çarpanın çarpımı negatiftir.', ok: true },
      EX,
      { t: 'Üs pozitif olduğu için sonuç pozitif olur.', ok: false, q: '(−2)^{3} = (−2) × (−2) × (−2). Hesapla.' },
    ],
    hint: '−1 ile 0 arasındaki sayıları da dene.',
    note: '(−a)^{3} = (−a)(−a)(−a) = −a^{3}: tek kuvvet işareti korur.',
  },
  {
    id: 'negatif-us', g: [8], text: 'Negatif üslü bir ifade (a^{−n}) negatiftir.', truth: 'sometimes',
    vars: [v('a', 'Taban a', -5, 5, 2), v('n', 'n (pozitif)', 1, 4, 1)],
    run: ([a, n]) => {
      if (a === 0) return { text: `0^{−${n}}`, ok: null, fact: '0’ın negatif kuvveti tanımsız; 0’dan farklı bir taban seç.' }
      const p = a ** n
      const val = 1 / p
      return { text: `${par(a)}^{−${n}} = [[1/${par(p)}]] = ${nf(val)}`, ok: val < 0, fact: val < 0 ? `${nf(val)} negatif.` : `${nf(val)} pozitif.` }
    },
    quick: [[-2, 1], [-2, 2], [3, 2]],
    fix: [
      { t: 'Taban negatif ve n tek ise', ok: true },
      { t: 'Taban negatifse', ok: false, q: '(−2)^{−2}’yi hesapla.' },
      { t: 'n tekse', ok: false, q: '2^{−1}’i hesapla.' },
    ],
    hint: 'Pozitif bir taban dene: 2^{−1} kaç?',
    note: 'Negatif üs “ters çevir” demektir, işaret değil: 2^{−3} = [[1/8]] > 0. İfade yalnızca taban negatif ve üs tekken negatiftir.',
    mis: 'Negatif üssü negatif sayı sandı',
  },
  {
    id: 'irrasyonel-carpim', g: [8], text: 'İki irrasyonel sayının çarpımı irrasyoneldir.', truth: 'sometimes',
    vars: [v('a', '√a için a', 2, 20, 2), v('b', '√b için b', 2, 20, 3)],
    run: ([a, b]) => {
      if (isSq(a) || isSq(b)) return { text: `√{${a}} × √{${b}}`, ok: null, fact: `√{${isSq(a) ? a : b}} = ${Math.sqrt(isSq(a) ? a : b)} rasyonel; tam kare olmayan sayılar seç.` }
      const r = isSq(a * b)
      return { text: `√{${a}} × √{${b}} = √{${a * b}}${r ? ` = ${Math.sqrt(a * b)}` : ''}`, ok: !r, fact: r ? `${Math.sqrt(a * b)} rasyonel!` : `√{${a * b}} irrasyonel.` }
    },
    quick: [[2, 8], [3, 12], [5, 7]],
    fix: [
      { t: 'a × b tam kare değilse', ok: true },
      { t: 'a ile b farklıysa', ok: false, q: '√{2} × √{8}’i dene.' },
      { t: 'a ve b asalsa', ok: false, q: 'a = b = 2 de asal: √{2} × √{2}?' },
    ],
    hint: '√{2} × √{8} gibi çiftler dene.',
    note: '√{2} × √{8} = √{16} = 4: iki irrasyonelin çarpımı rasyonel olabilir.',
    mis: 'İrrasyonel sayılarla işlemin sonucunu her zaman irrasyonel sandı',
  },
  {
    id: 'ucgen-kenar', g: [8], text: 'Herhangi üç uzunlukla bir üçgen çizilebilir.', truth: 'sometimes', viz: 'tri',
    vars: [v('a', 'a', 1, 12, 4), v('b', 'b', 1, 12, 5), v('c', 'c', 1, 12, 7)],
    run: ([a, b, c]) => {
      const [x, y, z] = [a, b, c].sort((p, q) => p - q)
      const ok = x + y > z
      return { text: `${a} cm, ${b} cm, ${c} cm`, ok, fact: ok ? `${x} + ${y} = ${x + y} > ${z}: üçgen olur.` : `${x} + ${y} = ${x + y}, ${z} cm’den uzun değil: kenarlar birleşmiyor.` }
    },
    quick: [[2, 3, 8], [3, 4, 7], [6, 6, 6]],
    fix: [
      { t: 'En uzun kenar, öbür ikisinin toplamından kısaysa', ok: true },
      { t: 'Kenarlar birbirinden farklıysa', ok: false, q: '1, 2, 10’u dene.' },
      { t: 'Kenarlar 10 cm’den kısaysa', ok: false, q: '2, 3, 8’i dene.' },
    ],
    hint: 'Bir kenarı çok uzun yap.',
    note: 'Üçgen eşitsizliği: herhangi iki kenarın toplamı üçüncüden uzun olmalıdır; yoksa kenarlar birleşemez.',
    mis: 'Her üç uzunlukla üçgen çizilebileceğini sandı',
  },
  {
    id: 'hipotenus', g: [8], text: 'Bir dik üçgende hipotenüs en uzun kenardır.', truth: 'always', viz: 'tri',
    vars: [v('a', 'Dik kenar a', 1, 12, 3), v('b', 'Dik kenar b', 1, 12, 4)],
    run: ([a, b]) => {
      const c = Math.sqrt(a * a + b * b)
      const cs = Number.isInteger(c) ? nf(c) : `√{${a * a + b * b}} ≈ ${nf(Math.round(c * 100) / 100)}`
      return { text: `c = √{${a}^{2} + ${b}^{2}} = ${cs}`, ok: c > a && c > b, fact: 'Hipotenüs, iki dik kenardan da uzun.' }
    },
    quick: [[1, 12], [5, 5]],
    reasons: [
      { t: 'c^{2} = a^{2} + b^{2} olduğu için c^{2}, hem a^{2}’den hem b^{2}’den büyüktür.', ok: true },
      { t: 'Hipotenüs en büyük açının (90°) karşısındadır; en büyük açının karşısında en uzun kenar bulunur.', ok: true },
      EX,
      { t: 'Çünkü c = a + b’dir.', ok: false, q: '3 ve 4 için c = 7 mi, 5 mi?', mis: 'Hipotenüsü dik kenarların toplamı sandı' },
    ],
    hint: 'Bir dik kenarı çok kısa, öbürünü çok uzun yap.',
    note: 'c^{2} = a^{2} + b^{2} > a^{2} olduğundan c > a; aynı biçimde c > b.',
  },
]

export function claimsFor(grade: Grade): Claim[] {
  return CLAIMS.filter((c) => c.g.includes(grade))
}
