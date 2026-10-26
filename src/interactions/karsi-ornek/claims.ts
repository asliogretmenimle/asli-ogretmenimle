import type { Grade } from '../../data/types'
import { fmtQ, q, qAdd, qDiv, qMul, qNum, qSub, type Q } from '../islem-zinciri/kit'
import type { Persona } from '../tahmin-test-acikla/ortak'

/**
 * Karşı Örnek Avcısı — iddia bankası.
 * Her iddia bir deney tezgâhında (box) test edilir; ev(args) canlı sonucu ve iddianın tutup tutmadığını verir.
 */

export interface Val {
  l: string
  q: Q
  /** irrasyonel: rasyonel kısım + katsayı × √k */
  r?: [number, number, number]
}
export type Box =
  | { k: 'num'; rows: { name: string; vals: Val[] }[] }
  | { k: 'int'; min: number; max: number; start: number; step?: number; vis?: 'arrays' | 'groups' }
  | { k: 'rect2' }
  | { k: 'tri' }
  | { k: 'frac2' }

export interface Ev {
  /** Canlı ifade (MathText) */
  expr: string
  /** İddianın sınandığı soru (MathText) */
  test: string
  holds: boolean
  /** Sayı doğrusunda gösterilecek noktalar */
  pts?: { l: string; v: number; c?: string }[]
  /** Karşı örnek türü (farklı türleri toplamak için) */
  kind?: string
  /** Örnek iddianın koşuluna uymuyor (sınanmaz) */
  na?: boolean
}
export interface Choice {
  t: string
  ok: boolean
  nudge?: string
  misc?: string
}
export interface Claim {
  who: Persona
  text: string
  truth: boolean
  box: Box
  start: number[]
  ev: (a: number[]) => Ev
  /** Neden işe yaradı / neden hep doğru? */
  why: Choice[]
  /** Yanlış iddiayı düzelt (yalnız yanlış iddialarda) */
  fix?: Choice[]
  /** “Her zaman doğru” denince (iddia yanlışsa) düşündüren soru */
  miss?: string
  hints: string[]
  insight: string
}

export const P = {
  ece: { name: 'Ece', emoji: '👧', color: '#db2777' },
  mert: { name: 'Mert', emoji: '👦', color: '#2563eb' },
  defne: { name: 'Defne', emoji: '👩', color: '#7c3aed' },
  kaan: { name: 'Kaan', emoji: '🧑', color: '#0d9488' },
  arda: { name: 'Arda', emoji: '🧒', color: '#ea580c' },
} satisfies Record<string, Persona>

const V = (n: number, d = 1): Val => ({ l: fmtQ(q(n, d), 'dec'), q: q(n, d) })
const F = (n: number, d: number): Val => ({ l: fmtQ(q(n, d), 'frac'), q: q(n, d) })
const D = (n: number, d: number): Val => ({ l: fmtQ(q(n, d), 'dec'), q: q(n, d) })
const ints = (a: number[]) => a.map((n) => V(n))
const s = (x: Q) => fmtQ(x, x.d === 1 ? 'dec' : 'frac')
const sp = (x: Q) => (x.n < 0 ? `(${s(x)})` : s(x))
const num = (x: Q) => qNum(x)

/** Genel “tek örnek yeter mi?” yanılgısı seçeneği */
const ONE: Choice = {
  t: 'tek bir örnek bir iddiayı çürütmeye yetmez',
  ok: false,
  nudge: 'İddia “her zaman” diyor. Tutmadığı tek bir durum bile “her zaman”ı bozmaz mı?',
  misc: 'Tek bir karşı örneğin genellemeyi çürütmeye yetmediğini düşündü',
}
const FEW: Choice = {
  t: 'denediğim birkaç örnekte de tuttu',
  ok: false,
  nudge: 'Örnekler güven verir ama bütün sayıları tek tek deneyemeyiz. İddia NEDEN her sayı için doğru?',
  misc: 'Birkaç destekleyen örneği kanıt saydı',
}

const divisors = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0)
const isPrime = (n: number) => n > 1 && divisors(n).length === 2

// ───────────────────────── İddialar ─────────────────────────

function mulGrows(g: Grade): Claim {
  const a = ints(g <= 5 ? [2, 3, 5, 8] : [2, 4, 6, 10])
  const b = g <= 5 ? ints([0, 1, 2, 3, 5, 10]) : [V(0), F(1, 4), F(1, 2), D(3, 4), V(1), D(3, 2), V(2), V(3), ...(g >= 7 ? [V(-1), V(-2)] : [])]
  return {
    who: P.ece,
    text: 'Bir sayıyı çarparsak sonuç her zaman o sayıdan **büyük** olur.',
    truth: false,
    box: { k: 'num', rows: [{ name: 'Sayı', vals: a }, { name: 'Çarpan', vals: b }] },
    start: [1, 3],
    ev: ([i, j]) => {
      const x = a[i].q, y = b[j].q, r = qMul(x, y)
      const kind = y.n === 0 ? '0 ile çarpma' : y.n === y.d ? '1 ile çarpma' : num(y) < 0 ? 'negatif çarpan' : num(y) < 1 ? '0 ile 1 arası çarpan' : undefined
      return { expr: `${s(x)} × ${sp(y)} = ${s(r)}`, test: `${s(r)} > ${s(x)} ?`, holds: num(r) > num(x), pts: [{ l: 'sayı', v: num(x), c: '#3b82f6' }, { l: 'sonuç', v: num(r), c: '#d6457a' }], kind }
    },
    why: [
      { t: g <= 5 ? '0 ya da 1 ile çarpınca sayı büyümez' : '1’den küçük (ya da 1) bir sayıyla çarpınca sonuç büyümez', ok: true },
      ONE,
      { t: 'büyük sayılarla çarpma her zaman büyütür', ok: false, nudge: 'Bu bir neden mi, yoksa iddiayı tekrar mı ediyor? Senin örneğinde çarpan neydi?' },
    ],
    fix: [
      { t: '1’den büyük bir sayıyla çarparsak sonuç büyür (sayı pozitifse).', ok: true },
      { t: '0 dışındaki her sayıyla çarparsak sonuç büyür.', ok: false, nudge: '1 ile çarpmayı dene: 5 × 1 sonucu 5’ten büyük mü?' },
      { t: 'Çarpma bazen büyütür, bazen büyütmez; çarpana bağlıdır.', ok: true },
    ],
    miss: 'Çarpan olarak 0’ı, 1’i ya da 1’den küçük bir sayıyı denedin mi?',
    hints: ['Çarpan sırasındaki küçük sayıları dene.', g <= 5 ? '5 × 1 kaç eder? 5 × 0?' : '6’nın yarısını almak, 6’yı [[1/2]] ile çarpmak demektir. Sonuç büyür mü?'],
    insight: '“Çarpma büyütür” yalnız 1’den büyük çarpanlar için doğrudur: 0, 1 ya da 1’den küçük bir sayıyla çarpınca sonuç büyümez.',
  }
}

function divShrinks(g: Grade): Claim {
  const a = ints([12, 24, 36])
  const b = g <= 5 ? ints([1, 2, 3, 4, 6]) : [V(1), V(2), V(3), F(1, 2), F(1, 4), V(6)]
  return {
    who: P.mert,
    text: 'Bir sayıyı bölersek sonuç her zaman o sayıdan **küçük** olur.',
    truth: false,
    box: { k: 'num', rows: [{ name: 'Bölünen', vals: a }, { name: 'Bölen', vals: b }] },
    start: [1, 1],
    ev: ([i, j]) => {
      const x = a[i].q, y = b[j].q, r = qDiv(x, y)
      return { expr: `${s(x)} ÷ ${s(y)} = ${s(r)}`, test: `${s(r)} < ${s(x)} ?`, holds: num(r) < num(x), pts: [{ l: 'sayı', v: num(x), c: '#3b82f6' }, { l: 'sonuç', v: num(r), c: '#d6457a' }], kind: y.n === y.d ? '1’e bölme' : num(y) < 1 ? '1’den küçük sayıya bölme' : undefined }
    },
    why: [
      { t: g <= 5 ? '1’e bölmek sayıyı tek gruba koymaktır, sayı değişmez' : '1’e ya da 1’den küçük bir sayıya bölünce sonuç küçülmez', ok: true },
      ONE,
      { t: 'bölme çarpmanın tersidir, o yüzden hep küçültür', ok: false, nudge: 'Çarpma hep büyütmüyorsa, tersi hep küçültür mü? Örneğinde ne oldu?' },
    ],
    fix: [
      { t: '1’den büyük bir sayıya bölersek sonuç küçülür (sayı pozitifse).', ok: true },
      { t: 'Her doğal sayıya bölünce sonuç küçülür.', ok: false, nudge: '1 de bir doğal sayı. 12 ÷ 1 kaç?' },
      { t: 'Bölme bazen küçültür, bazen küçültmez; bölene bağlıdır.', ok: true },
    ],
    miss: 'Bölen olarak 1’i' + (g >= 6 ? ' ya da 1’den küçük bir sayıyı' : '') + ' denedin mi?',
    hints: ['Bölen sırasındaki en küçük sayıları dene.', g >= 6 ? '12’nin içinde kaç tane [[1/2]] var?' : '12 şekeri 1 kişiye paylaştırırsan kişi başı kaç şeker düşer?'],
    insight: g >= 6 ? 'Bölme her zaman küçültmez: 1’e bölmek sayıyı değiştirmez, 1’den küçük bir sayıya bölmek büyütür (12 ÷ [[1/2]] = 24).' : 'Bölme her zaman küçültmez: bir sayıyı 1’e bölünce sayı değişmez.',
  }
}

function perArea(): Claim {
  return {
    who: P.kaan,
    text: 'Çevresi daha **büyük** olan dikdörtgenin alanı da daha büyüktür.',
    truth: false,
    box: { k: 'rect2' },
    start: [4, 3, 6, 1],
    ev: ([w1, h1, w2, h2]) => {
      const pA = 2 * (w1 + h1), pB = 2 * (w2 + h2), aA = w1 * h1, aB = w2 * h2
      if (pA === pB) return { expr: `Çevreler eşit: ${pA} ve ${pB}`, test: 'Çevreleri farklı iki dikdörtgen kur', holds: true, na: true }
      const big = pA > pB ? 'A' : 'B'
      const bigArea = pA > pB ? aA : aB
      const smallArea = pA > pB ? aB : aA
      return { expr: `Çevre A = ${pA}, B = ${pB} · Alan A = ${aA}, B = ${aB}`, test: `Çevresi büyük olan ${big}. Alanı da büyük mü? ${bigArea} > ${smallArea} ?`, holds: bigArea > smallArea, kind: bigArea === smallArea ? 'alanlar eşit' : 'alanı küçük' }
    },
    why: [
      { t: 'uzun ve ince bir dikdörtgenin çevresi büyük, alanı küçük olabilir', ok: true },
      ONE,
      { t: 'çevre ile alan aynı şeyi ölçer', ok: false, nudge: 'Çevre şeklin etrafındaki uzunluk, alan içindeki birimkare sayısı. Aynı şeyi mi ölçüyorlar?', misc: 'Çevre ile alanı karıştırdı' },
    ],
    fix: [
      { t: 'Çevresi büyük olan dikdörtgenin alanı bazen büyük, bazen küçük olabilir.', ok: true },
      { t: 'Çevresi büyük olanın alanı her zaman küçüktür.', ok: false, nudge: '10 × 10 kare ile 2 × 3 dikdörtgeni karşılaştır. Çevresi büyük olanın alanı küçük mü?' },
      { t: 'Kenarları ayrı ayrı daha uzun olan dikdörtgenin hem çevresi hem alanı daha büyüktür.', ok: true },
    ],
    miss: 'Uzun ve ince bir dikdörtgen (ör. 7 × 1) ile kareye yakın bir dikdörtgeni (ör. 3 × 3) karşılaştırdın mı?',
    hints: ['A’yı kareye yakın, B’yi çok uzun ve ince yap.', '7 × 1 ile 3 × 3’ü karşılaştır: hangisinin çevresi, hangisinin alanı büyük?'],
    insight: 'Çevre ve alan farklı ölçülerdir: uzun-ince bir dikdörtgenin çevresi büyük, alanı küçük olabilir.',
  }
}

function areaPer(): Claim {
  return {
    who: P.defne,
    text: 'Alanları **eşit** olan iki dikdörtgenin çevreleri de eşittir.',
    truth: false,
    box: { k: 'rect2' },
    start: [3, 4, 4, 3],
    ev: ([w1, h1, w2, h2]) => {
      const aA = w1 * h1, aB = w2 * h2, pA = 2 * (w1 + h1), pB = 2 * (w2 + h2)
      if (aA !== aB) return { expr: `Alan A = ${aA}, B = ${aB}`, test: 'Önce alanları eşit yap', holds: true, na: true }
      return { expr: `Alanlar eşit: ${aA} · Çevre A = ${pA}, B = ${pB}`, test: `Çevreler eşit mi? ${pA} = ${pB} ?`, holds: pA === pB, kind: `alan ${aA}` }
    },
    why: [
      { t: 'aynı sayıda birimkare farklı biçimlerde dizilince çevre değişebilir', ok: true },
      ONE,
      { t: 'iki dikdörtgenin şekli farklı olduğu için alanları da farklıdır', ok: false, nudge: 'Senin örneğinde alanlar eşitti. Değişen ne oldu?' },
    ],
    fix: [
      { t: 'Alanları eşit olan dikdörtgenlerin çevreleri farklı olabilir.', ok: true },
      { t: 'Alanları eşit olan dikdörtgenlerin çevreleri hiçbir zaman eşit olmaz.', ok: false, nudge: '3 × 4 ile 4 × 3’ü düşün. Alanları ve çevreleri ne?' },
      { t: 'Alanları eşit iki dikdörtgenden kareye daha yakın olanın çevresi daha küçüktür.', ok: true },
    ],
    miss: '12 birimkareyi 3 × 4 ve 6 × 2 biçiminde dizip çevrelerini karşılaştırdın mı?',
    hints: ['Önce iki dikdörtgenin alanını eşit yap (ör. 12).', 'Aynı alanı farklı biçimde kur: 6 × 2 ile 3 × 4.'],
    insight: 'Aynı alan farklı çevrelerle elde edilebilir: 12 birimkare 3 × 4 (çevre 14) ya da 12 × 1 (çevre 26) olabilir.',
  }
}

function evenSum(): Claim {
  const e = ints([2, 4, 6, 8, 10, 12, 14, 16, 18, 20])
  return {
    who: P.arda,
    text: 'İki **çift** sayının toplamı her zaman çifttir.',
    truth: true,
    box: { k: 'num', rows: [{ name: 'Çift sayı', vals: e }, { name: 'Çift sayı', vals: e }] },
    start: [1, 2],
    ev: ([i, j]) => {
      const x = num(e[i].q), y = num(e[j].q)
      return { expr: `${x} + ${y} = ${x + y}`, test: `${x + y} çift mi?`, holds: (x + y) % 2 === 0 }
    },
    why: [
      { t: 'çift sayılar ikişerli gruplardır; ikişerli gruplar birleşince artan kalmaz', ok: true },
      FEW,
      { t: 'çift sayılar büyük sayılardır', ok: false, nudge: '2 de çift sayı. Büyüklük mü önemli, ikişerli gruplanabilmek mi?' },
    ],
    hints: ['Her çift sayıyı ikişerli noktalar olarak düşün.', 'İki ikişerli grup birleşince eşsiz kalan nokta olur mu?'],
    insight: 'İki çift sayının toplamı her zaman çifttir: ikişerli gruplar birleşince yine ikişerli gruplar olur. Örnekler güven verir; açıklama kanıtlar.',
  }
}

function consecSum(): Claim {
  const a = ints([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  return {
    who: P.mert,
    text: 'Ardışık iki doğal sayının toplamı her zaman **tektir**.',
    truth: true,
    box: { k: 'num', rows: [{ name: 'Sayı (n)', vals: a }] },
    start: [3],
    ev: ([i]) => {
      const x = num(a[i].q)
      return { expr: `${x} + ${x + 1} = ${2 * x + 1}`, test: `${2 * x + 1} tek mi?`, holds: (2 * x + 1) % 2 === 1 }
    },
    why: [
      { t: 'ardışık iki sayıdan biri tek, biri çifttir; tek + çift her zaman tektir', ok: true },
      { t: 'n + (n + 1) = 2 × n + 1, yani bir çift sayının 1 fazlasıdır', ok: true },
      FEW,
    ],
    hints: ['n ile n + 1’in toplamını iki tane n ve bir tane 1 olarak düşün.'],
    insight: 'n + (n + 1) = 2n + 1: bir çift sayının 1 fazlası her zaman tektir.',
  }
}

function fracNum(): Claim {
  return {
    who: P.ece,
    text: 'Payı **büyük** olan kesir daha büyüktür.',
    truth: false,
    box: { k: 'frac2' },
    start: [3, 4, 2, 4],
    ev: ([a, b, c, d]) => {
      const x = a / b, y = c / d
      if (a === c) return { expr: `[[${a}/${b}]] ve [[${c}/${d}]]`, test: 'Payları farklı iki kesir seç', holds: true, na: true }
      const big = a > c ? `[[${a}/${b}]]` : `[[${c}/${d}]]`
      const ok = a > c ? x > y : y > x
      return { expr: `[[${a}/${b}]] ≈ ${(x).toFixed(2).replace('.', ',')} · [[${c}/${d}]] ≈ ${y.toFixed(2).replace('.', ',')}`, test: `Payı büyük olan ${big}. Daha büyük mü?`, holds: ok, pts: [{ l: `${a}/${b}`, v: x, c: '#3b82f6' }, { l: `${c}/${d}`, v: y, c: '#d6457a' }], kind: Math.abs(x - y) < 1e-9 ? 'eşit kesirler' : 'küçük çıktı' }
    },
    why: [
      { t: 'kesrin büyüklüğü payla birlikte paydaya da bağlıdır; payda büyüdükçe parçalar küçülür', ok: true },
      ONE,
      { t: 'pay ile payda aynı şeyi gösterir', ok: false, nudge: 'Payda bütünün kaç eş parçaya bölündüğünü, pay kaç parça alındığını gösterir. Aynı şey mi?' },
    ],
    fix: [
      { t: 'Paydaları eşit olan kesirlerden payı büyük olan daha büyüktür.', ok: true },
      { t: 'Paydası büyük olan kesir daha büyüktür.', ok: false, nudge: '[[1/2]] ile [[1/8]]’i karşılaştır. Paydası büyük olan daha mı büyük?', misc: 'Paydası büyük olan kesrin büyük olduğunu düşündü' },
      { t: 'Kesirleri karşılaştırırken hem paya hem paydaya bakmalıyız.', ok: true },
    ],
    miss: 'Payı büyük ama paydası çok daha büyük bir kesir dene: [[3/10]] ile [[2/3]] gibi.',
    hints: ['Bir kesrin paydasını çok büyük yap.', '[[3/8]] mi [[2/3]] mü büyük? Şeritlere bak.'],
    insight: 'Kesrin büyüklüğü pay ile paydanın ilişkisine bağlıdır: [[3/10]] payı büyük olsa da [[2/3]]’ten küçüktür.',
  }
}

function primesOdd(): Claim {
  return {
    who: P.kaan,
    text: 'Asal sayıların **hepsi tektir**.',
    truth: false,
    box: { k: 'int', min: 1, max: 50, start: 7 },
    start: [7],
    ev: ([n]) => {
      const p = isPrime(n)
      if (!p) return { expr: `${n}: bölenleri ${divisors(n).join(', ')}`, test: `${n} asal değil; iddia asal sayılar için`, holds: true, na: true }
      return { expr: `${n}: bölenleri ${divisors(n).join(', ')} → asal`, test: `${n} tek mi?`, holds: n % 2 === 1, kind: 'çift asal' }
    },
    why: [
      { t: '2’nin yalnız iki böleni var (1 ve 2), yani asal; ama 2 çift', ok: true },
      ONE,
      { t: '2 çok küçük olduğu için sayılmaz', ok: false, nudge: 'Asal sayının tanımı: tam olarak iki böleni olan sayı. 2’nin kaç böleni var?' },
    ],
    fix: [
      { t: '2 dışındaki asal sayıların hepsi tektir.', ok: true },
      { t: 'Asal sayıların hiçbiri çift değildir.', ok: false, nudge: 'Bu, ilk iddiayla aynı şey değil mi? 2 ne olacak?' },
      { t: 'Tek çift asal sayı 2’dir.', ok: true },
    ],
    miss: 'En küçük asal sayıyı denedin mi?',
    hints: ['En küçük sayılardan başla.', '2’nin bölenleri neler?'],
    insight: '2 hem asal hem çifttir; tek bir karşı örnek “hepsi tek” iddiasını çürütür. Doğru iddia: 2 dışındaki asallar tektir.',
  }
}

function oddsPrime(): Claim {
  return {
    who: P.arda,
    text: 'Tek sayıların **hepsi asaldır**.',
    truth: false,
    box: { k: 'int', min: 1, max: 50, start: 7 },
    start: [7],
    ev: ([n]) => {
      if (n % 2 === 0) return { expr: `${n} çift`, test: 'İddia tek sayılar için: bir tek sayı seç', holds: true, na: true }
      return { expr: `${n}: bölenleri ${divisors(n).join(', ')}`, test: `${n} asal mı?`, holds: isPrime(n), kind: n === 1 ? '1 (asal değil)' : 'bileşik tek sayı' }
    },
    why: [
      { t: 'bu tek sayının 1 ve kendisinden başka bir böleni var (ya da yalnız bir böleni var)', ok: true },
      ONE,
      { t: 'büyük tek sayılar asal olmaz', ok: false, nudge: '47 büyük bir tek sayı ve asal. Asal olmayı belirleyen büyüklük mü, bölenler mi?' },
    ],
    fix: [
      { t: 'Bazı tek sayılar asaldır, bazıları değildir.', ok: true },
      { t: '2 dışındaki asal sayılar tektir (ama her tek sayı asal değildir).', ok: true },
      { t: 'Tek sayıların hiçbiri asal değildir.', ok: false, nudge: '3, 5, 7 asal mı?' },
    ],
    miss: '9’u, 15’i ya da 21’i denedin mi? Bölenlerine bak.',
    hints: ['3’ün katı olan tek sayıları dene.', '9’u eşit sıralara dizebilir misin?'],
    insight: 'Her tek sayı asal değildir: 9 = 3 × 3, 15 = 3 × 5. Bir iddianın tersi her zaman doğru olmayabilir.',
  }
}

function div4div8(): Claim {
  return {
    who: P.defne,
    text: '4’e bölünebilen her sayı **8’e de** bölünebilir.',
    truth: false,
    box: { k: 'int', min: 4, max: 96, start: 16, step: 4, vis: 'groups' },
    start: [16],
    ev: ([n]) => ({ expr: `${n} ÷ 4 = ${n / 4}${n % 8 === 0 ? ` · ${n} ÷ 8 = ${n / 8}` : ` · ${n} ÷ 8 = ${Math.floor(n / 8)} kalan ${n % 8}`}`, test: `${n}, 8’e bölünür mü?`, holds: n % 8 === 0, kind: 'tek katlı 4' }),
    why: [
      { t: '4’ün tek katları (4 × 1, 4 × 3 …) 8’in katı değildir', ok: true },
      ONE,
      { t: '8, 4’ten büyük olduğu için hiçbir sayı ikisine birden bölünmez', ok: false, nudge: '16’yı dene: hem 4’e hem 8’e bölünüyor mu?' },
    ],
    fix: [
      { t: '8’e bölünebilen her sayı 4’e de bölünebilir.', ok: true },
      { t: '4’e bölünebilen bazı sayılar 8’e de bölünebilir.', ok: true },
      { t: '4’e bölünebilen hiçbir sayı 8’e bölünemez.', ok: false, nudge: '16, 24, 32 ne olacak?' },
    ],
    miss: '12’yi ya da 20’yi denedin mi?',
    hints: ['4’ün katlarını sırayla dene: 4, 8, 12 …', '12 ÷ 8 tam bölünür mü?'],
    insight: '4’ün katlarının yalnız yarısı 8’in katıdır: 12, 20, 28 … 4’e bölünür ama 8’e bölünmez.',
  }
}

function div8div4(): Claim {
  return {
    who: P.mert,
    text: '8’e bölünebilen her sayı **4’e de** bölünebilir.',
    truth: true,
    box: { k: 'int', min: 8, max: 96, start: 24, step: 8, vis: 'groups' },
    start: [24],
    ev: ([n]) => ({ expr: `${n} = 8 × ${n / 8} = 4 × ${n / 4}`, test: `${n}, 4’e bölünür mü?`, holds: n % 4 === 0 }),
    why: [
      { t: '8 = 4 × 2 olduğu için 8’in her katı 4’ün de katıdır', ok: true },
      FEW,
      { t: '8 çift bir sayıdır', ok: false, nudge: '6 da çift ama 6’nın katları 4’e bölünür mü? Asıl neden 8 ile 4 arasındaki ilişki olabilir mi?' },
    ],
    hints: ['8’i 4 cinsinden yaz.', '8 × 5 = 4 × ? '],
    insight: '8 = 4 × 2 olduğu için 8 × k = 4 × (2k): 8’in her katı 4’ün de katıdır. Örnekler değil, bu yapı kanıtlar.',
  }
}

function primeSum(): Claim {
  const pr = ints([2, 3, 5, 7, 11, 13, 17, 19])
  return {
    who: P.ece,
    text: 'İki asal sayının toplamı her zaman **çifttir**.',
    truth: false,
    box: { k: 'num', rows: [{ name: 'Asal', vals: pr }, { name: 'Asal', vals: pr }] },
    start: [1, 2],
    ev: ([i, j]) => {
      const x = num(pr[i].q), y = num(pr[j].q)
      return { expr: `${x} + ${y} = ${x + y}`, test: `${x + y} çift mi?`, holds: (x + y) % 2 === 0, kind: '2 ile bir tek asal' }
    },
    why: [
      { t: '2 çift asaldır; 2 ile bir tek asal toplanınca sonuç tek olur', ok: true },
      ONE,
      { t: 'asal sayılar toplanınca asal sayı çıkar', ok: false, nudge: '3 + 5 = 8 asal mı? Sorumuz toplamın tek mi çift mi olduğu.' },
    ],
    fix: [
      { t: 'İki tek asal sayının toplamı çifttir.', ok: true },
      { t: '2 dışındaki iki asal sayının toplamı çifttir.', ok: true },
      { t: 'İki asal sayının toplamı her zaman tektir.', ok: false, nudge: '3 + 5 kaç?' },
    ],
    miss: 'Asallardan biri 2 olursa ne olur?',
    hints: ['Asal sayıların hepsi tek mi?', '2 + 3 kaç eder?'],
    insight: 'Tek + tek = çift olduğu için çoğu asal çiftinin toplamı çifttir; ama 2 çift asal olduğundan 2 + 3 = 5 karşı örnektir.',
  }
}

function halfLess(): Claim {
  const a = [V(0), V(1), V(4), V(10), F(1, 2), D(5, 2)]
  return {
    who: P.kaan,
    text: 'Bir sayının yarısı her zaman o sayıdan **küçüktür**.',
    truth: false,
    box: { k: 'num', rows: [{ name: 'Sayı', vals: a }] },
    start: [2],
    ev: ([i]) => {
      const x = a[i].q, r = qMul(x, q(1, 2))
      return { expr: `${s(x)} sayısının yarısı ${s(r)}`, test: `${s(r)} < ${s(x)} ?`, holds: num(r) < num(x), pts: [{ l: 'sayı', v: num(x), c: '#3b82f6' }, { l: 'yarısı', v: num(r), c: '#d6457a' }], kind: '0' }
    },
    why: [
      { t: '0’ın yarısı yine 0’dır; 0, 0’dan küçük değildir', ok: true },
      ONE,
      { t: '0 bir sayı değildir', ok: false, nudge: '0 sayı doğrusunda bir yer kaplar mı? 0 bir sayıdır.', misc: '0’ı sayı olarak görmedi' },
    ],
    fix: [
      { t: 'Pozitif bir sayının yarısı o sayıdan küçüktür.', ok: true },
      { t: '0 dışındaki doğal sayıların yarısı o sayıdan küçüktür.', ok: true },
      { t: 'Bir sayının yarısı hiçbir zaman ondan küçük değildir.', ok: false, nudge: '10’un yarısı 5. 5 < 10 değil mi?' },
    ],
    miss: 'En küçük doğal sayıyı denedin mi?',
    hints: ['Listede çok özel bir sayı var.', '0’ın yarısı kaç?'],
    insight: '0 özel bir sayıdır: 0’ın yarısı yine 0. Bu yüzden “yarısı her zaman küçüktür” iddiası yalnız pozitif sayılar için doğrudur.',
  }
}

function subShrinks(): Claim {
  const a = ints([5, 3, -2])
  const b = ints([-4, -1, 0, 2, 3])
  return {
    who: P.arda,
    text: 'Bir sayıdan başka bir sayı çıkarırsak sonuç her zaman **küçülür**.',
    truth: false,
    box: { k: 'num', rows: [{ name: 'Sayı', vals: a }, { name: 'Çıkarılan', vals: b }] },
    start: [0, 3],
    ev: ([i, j]) => {
      const x = a[i].q, y = b[j].q, r = qSub(x, y)
      return { expr: `${s(x)} − ${sp(y)} = ${s(r)}`, test: `${s(r)} < ${s(x)} ?`, holds: num(r) < num(x), pts: [{ l: 'sayı', v: num(x), c: '#3b82f6' }, { l: 'sonuç', v: num(r), c: '#d6457a' }], kind: y.n === 0 ? '0 çıkarma' : 'negatif sayı çıkarma' }
    },
    why: [
      { t: 'negatif bir sayıyı çıkarmak, onun tersini eklemektir; sonuç büyür', ok: true },
      ONE,
      { t: 'negatif sayılar sayı sayılmaz', ok: false, nudge: '−4 sayı doğrusunda bir nokta değil mi?', misc: 'Negatif sayıları geçerli örnek olarak görmedi' },
    ],
    fix: [
      { t: 'Pozitif bir sayı çıkarırsak sonuç küçülür.', ok: true },
      { t: 'Negatif bir sayı çıkarırsak sonuç büyür.', ok: true },
      { t: 'Çıkarma her zaman büyütür.', ok: false, nudge: '5 − 2 kaç?' },
    ],
    miss: 'Çıkarılan olarak 0’ı ya da negatif bir sayıyı denedin mi?',
    hints: ['Çıkarılan sırasındaki negatif sayıları dene.', '5 − (−4) = 5 + 4 değil mi?'],
    insight: 'Çıkarma her zaman küçültmez: 0 çıkarmak sayıyı değiştirmez, negatif bir sayıyı çıkarmak büyütür: 5 − (−4) = 9.',
  }
}

function negIsNeg(): Claim {
  const a = ints([-5, -3, -1, 0, 1, 3, 5])
  return {
    who: P.defne,
    text: 'Bir sayının önüne eksi koyarsak (−a) sonuç her zaman **negatiftir**.',
    truth: false,
    box: { k: 'num', rows: [{ name: 'a', vals: a }] },
    start: [5],
    ev: ([i]) => {
      const x = a[i].q, r = q(-x.n, x.d)
      return { expr: `a = ${s(x)} → −a = ${x.n < 0 ? `−(${s(x)})` : `−${s(x)}`} = ${s(r)}`, test: `${s(r)} < 0 ?`, holds: num(r) < 0, pts: [{ l: 'a', v: num(x), c: '#3b82f6' }, { l: '−a', v: num(r), c: '#d6457a' }], kind: x.n === 0 ? 'a = 0' : 'a negatif' }
    },
    why: [
      { t: '−a, a’nın sayı doğrusunda 0’a göre tersidir; a negatifse −a pozitiftir', ok: true },
      ONE,
      { t: 'eksi işareti her zaman negatif demektir', ok: false, nudge: '−(−3) kaç eder? Eksi işareti burada ne anlama geliyor?', misc: '−a ifadesinin her zaman negatif olduğunu düşündü' },
    ],
    fix: [
      { t: 'a pozitifse −a negatiftir.', ok: true },
      { t: '−a, a’nın ters işaretlisidir; a negatifse −a pozitiftir.', ok: true },
      { t: '−a hiçbir zaman negatif değildir.', ok: false, nudge: 'a = 3 için −a kaç?' },
    ],
    miss: 'a yerine negatif bir sayı ya da 0 koydun mu?',
    hints: ['a = −3 seç.', '−(−3) sayı doğrusunda nerede?'],
    insight: '−a “a’nın tersi” demektir, negatif demek değildir: a = −3 ise −a = 3.',
  }
}

function squareBig(g: Grade): Claim {
  const a = [V(-2), V(-1), V(0), F(1, 2), D(1, 10), V(1), V(2), V(3), V(10)]
  const sq = g >= 8
  return {
    who: P.kaan,
    text: sq ? 'Bir sayının karesi her zaman o sayıdan **büyüktür**: a^{2} > a.' : 'Bir sayıyı kendisiyle çarparsak sonuç her zaman o sayıdan **büyük** olur: a × a > a.',
    truth: false,
    box: { k: 'num', rows: [{ name: 'a', vals: a }] },
    start: [7],
    ev: ([i]) => {
      const x = a[i].q, r = qMul(x, x)
      const kind = x.n === 0 ? 'a = 0' : x.n === x.d ? 'a = 1' : num(x) > 0 && num(x) < 1 ? '0 < a < 1' : undefined
      return { expr: sq ? `${sp(x)}^{2} = ${s(r)}` : `${sp(x)} × ${sp(x)} = ${s(r)}`, test: `${s(r)} > ${s(x)} ?`, holds: num(r) > num(x), pts: [{ l: 'a', v: num(x), c: '#3b82f6' }, { l: sq ? 'a²' : 'a·a', v: num(r), c: '#d6457a' }], kind }
    },
    why: [
      { t: '0 ile 1 arasındaki bir sayının karesi, o sayının bir parçasıdır; küçülür (0 ve 1’de ise eşit kalır)', ok: true },
      ONE,
      { t: 'negatif sayıların karesi negatif olur', ok: false, nudge: '(−2) × (−2) kaç eder? İşaret ne olur?', misc: 'Negatif sayının karesinin negatif olduğunu düşündü' },
    ],
    fix: [
      { t: '1’den büyük sayılar için a^{2} > a’dır.', ok: true },
      { t: 'a negatif ya da 1’den büyükse a^{2} > a’dır; 0 ≤ a ≤ 1 iken değildir.', ok: true },
      { t: 'Pozitif her sayı için a^{2} > a’dır.', ok: false, nudge: '[[1/2]] pozitif. ([[1/2]])^{2} kaç?' },
    ],
    miss: '0’ı, 1’i ya da 0 ile 1 arasında bir sayıyı denedin mi?',
    hints: ['Listede 0 ile 1 arasında sayılar var.', '[[1/2]] × [[1/2]] = ? Bu, [[1/2]]’nin yarısı demek.'],
    insight: 'a^{2} > a yalnız a > 1 ya da a < 0 için doğrudur: 0, 1 ve 0 ile 1 arasındaki sayılar karşı örnektir ([[1/2]] → [[1/4]]).',
  }
}

function negSumNeg(): Claim {
  const n = ints([-9, -7, -5, -4, -3, -2, -1])
  return {
    who: P.ece,
    text: 'İki negatif tam sayının toplamı her zaman **negatiftir**.',
    truth: true,
    box: { k: 'num', rows: [{ name: 'Negatif', vals: n }, { name: 'Negatif', vals: n }] },
    start: [2, 5],
    ev: ([i, j]) => {
      const x = n[i].q, y = n[j].q, r = qAdd(x, y)
      return { expr: `${s(x)} + ${sp(y)} = ${s(r)}`, test: `${s(r)} < 0 ?`, holds: num(r) < 0, pts: [{ l: 'a', v: num(x), c: '#3b82f6' }, { l: 'a + b', v: num(r), c: '#d6457a' }] }
    },
    why: [
      { t: 'sayı doğrusunda 0’ın solundan yine sola doğru gidilir; 0’ın sağına geçilemez', ok: true },
      FEW,
      { t: 'iki eksi bir artı yapar', ok: false, nudge: 'Bu kural çarpma için. Toplamada (−3) + (−2) kaç?', misc: 'Çarpmadaki işaret kuralını toplamaya uyguladı' },
    ],
    hints: ['Sayı doğrusunda −3’ten 2 birim daha sola git.'],
    insight: 'İki negatif sayının toplamı her zaman negatiftir: sayı doğrusunda 0’ın solundan yine sola gideriz. “İki eksi artı yapar” çarpmaya aittir.',
  }
}

function ratioAdd(): Claim {
  const k = ints([1, 2, 3, 4, 10])
  return {
    who: P.mert,
    text: 'Bir oranın iki terimine **aynı sayıyı eklersek** oran değişmez: 2 : 3 = (2 + k) : (3 + k).',
    truth: false,
    box: { k: 'num', rows: [{ name: 'k', vals: k }] },
    start: [0],
    ev: ([i]) => {
      const x = num(k[i].q)
      const r = q(2 + x, 3 + x)
      return { expr: `(2 + ${x}) : (3 + ${x}) = ${2 + x} : ${3 + x} → [[${2 + x}/${3 + x}]]`, test: `[[${2 + x}/${3 + x}]] = [[2/3]] ?`, holds: r.n === 2 && r.d === 3, pts: [{ l: '2/3', v: 2 / 3, c: '#3b82f6' }, { l: 'yeni', v: (2 + x) / (3 + x), c: '#d6457a' }], kind: `k = ${x}` }
    },
    why: [
      { t: 'oran çarpımsal bir ilişkidir; terimlere aynı sayıyı eklemek bu ilişkiyi bozar', ok: true },
      ONE,
      { t: 'iki terimin farkı aynı kaldığı için oran da aynıdır', ok: false, nudge: 'Fark aynı kalır (1), ama oran farkla mı, bölümle mi ilgili? [[2/3]] ile [[3/4]] eşit mi?', misc: 'Oranı toplamsal (fark) ilişki olarak düşündü' },
    ],
    fix: [
      { t: 'Bir oranın iki terimini aynı sayıyla çarparsak oran değişmez.', ok: true },
      { t: 'Terimlere aynı sayıyı eklersek fark değişmez ama oran değişir.', ok: true },
      { t: 'Terimlerden aynı sayıyı çıkarırsak oran değişmez.', ok: false, nudge: '(4 − 1) : (6 − 1) = 3 : 5. Bu, 4 : 6 ile aynı mı?' },
    ],
    miss: 'k = 1 için 3 : 4 oranı 2 : 3’e eşit mi? Kesir olarak karşılaştır.',
    hints: ['k = 1 seç. [[3/4]] ile [[2/3]]’ü karşılaştır.', 'Sayı doğrusunda iki nokta çakışıyor mu?'],
    insight: 'Oranlar çarpımsaldır: terimleri aynı sayıyla çarpmak oranı korur (2 : 3 = 4 : 6), aynı sayıyı eklemek korumaz (3 : 4 ≠ 2 : 3).',
  }
}

function ratioMul(): Claim {
  const k = ints([2, 3, 4, 5, 10])
  return {
    who: P.defne,
    text: 'Bir oranın iki terimini **aynı sayıyla çarparsak** oran değişmez: 2 : 3 = (2·k) : (3·k).',
    truth: true,
    box: { k: 'num', rows: [{ name: 'k', vals: k }] },
    start: [0],
    ev: ([i]) => {
      const x = num(k[i].q)
      return { expr: `${2 * x} : ${3 * x} → [[${2 * x}/${3 * x}]] = [[2/3]]`, test: `[[${2 * x}/${3 * x}]] = [[2/3]] ?`, holds: true, pts: [{ l: '2/3', v: 2 / 3, c: '#3b82f6' }, { l: 'yeni', v: 2 / 3, c: '#d6457a' }] }
    },
    why: [
      { t: '[[2k/3k]] kesrinde pay ve payda aynı sayıyla çarpılmıştır; denk kesirdir', ok: true },
      FEW,
      { t: 'terimler büyüdükçe oran da büyür', ok: false, nudge: '4 : 6 ile 2 : 3’ü kesir olarak yaz. Biri diğerinden büyük mü?' },
    ],
    hints: ['Oranı kesir olarak yaz ve sadeleştir.'],
    insight: 'Terimleri aynı sayıyla çarpmak denk kesir oluşturur: oran değişmez. Bu, orantının temelidir.',
  }
}

function cubeBig(): Claim {
  const a = [V(-2), V(-1), V(0), F(1, 2), V(1), V(2), V(3)]
  return {
    who: P.arda,
    text: 'Üs büyüdükçe değer büyür: a^{3} > a^{2}.',
    truth: false,
    box: { k: 'num', rows: [{ name: 'a', vals: a }] },
    start: [5],
    ev: ([i]) => {
      const x = a[i].q, s2 = qMul(x, x), s3 = qMul(s2, x)
      return { expr: `${sp(x)}^{2} = ${s(s2)} · ${sp(x)}^{3} = ${s(s3)}`, test: `${s(s3)} > ${s(s2)} ?`, holds: num(s3) > num(s2), pts: [{ l: 'a²', v: num(s2), c: '#3b82f6' }, { l: 'a³', v: num(s3), c: '#d6457a' }], kind: num(x) < 0 ? 'negatif taban' : num(x) === 0 ? 'a = 0' : num(x) === 1 ? 'a = 1' : num(x) < 1 ? '0 < a < 1' : undefined }
    },
    why: [
      { t: 'taban 1’den küçük ya da negatifse, onunla bir kez daha çarpmak değeri büyütmez', ok: true },
      ONE,
      { t: 'üs bir sayının kaç basamaklı olduğunu gösterir', ok: false, nudge: 'a^{3} = a × a × a. Üs, tabanın kaç kez çarpıldığını gösterir.' },
    ],
    fix: [
      { t: 'Taban 1’den büyükse üs büyüdükçe değer büyür.', ok: true },
      { t: 'Üs büyüdükçe değer her zaman küçülür.', ok: false, nudge: '2^{2} = 4, 2^{3} = 8. Küçüldü mü?' },
      { t: 'Üssün etkisi tabana bağlıdır: 0 < a < 1 için değer küçülür, negatif tabanda işaret değişir.', ok: true },
    ],
    miss: 'Tabanı [[1/2]] ya da negatif yapmayı denedin mi?',
    hints: ['a = [[1/2]] seç.', '(−2)^{3} negatif mi pozitif mi?'],
    insight: 'Üs büyüdükçe değerin büyümesi tabana bağlıdır: ([[1/2]])^{3} < ([[1/2]])^{2}, (−2)^{3} < (−2)^{2}.',
  }
}

function sqrtLess(): Claim {
  const a = [F(1, 4), F(1, 9), V(1), V(4), V(9), V(16), V(25)]
  const root = (x: Q) => q(Math.round(Math.sqrt(x.n)), Math.round(Math.sqrt(x.d)))
  return {
    who: P.mert,
    text: 'Bir sayının karekökü her zaman o sayıdan **küçüktür**: √{a} < a.',
    truth: false,
    box: { k: 'num', rows: [{ name: 'a', vals: a }] },
    start: [4],
    ev: ([i]) => {
      const x = a[i].q, r = root(x)
      return { expr: `√{${s(x)}} = ${s(r)}`, test: `${s(r)} < ${s(x)} ?`, holds: num(r) < num(x), pts: [{ l: 'a', v: num(x), c: '#3b82f6' }, { l: '√a', v: num(r), c: '#d6457a' }], kind: num(x) === 1 ? 'a = 1' : '0 < a < 1' }
    },
    why: [
      { t: '0 ile 1 arasındaki bir sayının karekökü o sayıdan büyüktür, çünkü ([[1/2]])^{2} = [[1/4]]', ok: true },
      ONE,
      { t: 'karekök almak her zaman ikiye bölmektir', ok: false, nudge: '√{16} = 4, 16 ÷ 2 = 8. Aynı mı?', misc: 'Karekökü ikiye bölmekle karıştırdı' },
    ],
    fix: [
      { t: '1’den büyük sayılar için √{a} < a’dır.', ok: true },
      { t: 'Her sayı için √{a} > a’dır.', ok: false, nudge: '√{25} = 5. 5 > 25 mi?' },
      { t: '0 < a < 1 için √{a} > a, a = 1 için eşit, a > 1 için küçüktür.', ok: true },
    ],
    miss: '[[1/4]]’ü ya da 1’i denedin mi?',
    hints: ['Listede kesirler var.', '√{[[1/4]]} kaç? Hangi sayının karesi [[1/4]]?'],
    insight: '√{a} < a yalnız a > 1 için doğrudur: √{[[1/4]]} = [[1/2]] > [[1/4]] ve √{1} = 1.',
  }
}

function anyTriangle(): Claim {
  return {
    who: P.kaan,
    text: 'Herhangi üç uzunlukla her zaman bir **üçgen** oluşturabiliriz.',
    truth: false,
    box: { k: 'tri' },
    start: [5, 6, 7],
    ev: ([a, b, c]) => {
      const [x, y, z] = [a, b, c].sort((m, n) => m - n)
      const ok = x + y > z
      return { expr: `${x} + ${y} = ${x + y} ${ok ? '>' : x + y === z ? '=' : '<'} ${z}`, test: 'Üçgen oluştu mu?', holds: ok, kind: x + y === z ? 'toplam eşit' : 'toplam küçük' }
    },
    why: [
      { t: 'kısa iki kenarın toplamı en uzun kenardan büyük değilse uçlar buluşamaz', ok: true },
      ONE,
      { t: 'kenarlar eşit olmadığı için üçgen olmaz', ok: false, nudge: '5, 6, 7 kenarları eşit değil ama üçgen oluşturuyor mu?' },
    ],
    fix: [
      { t: 'Kısa iki kenarın toplamı en uzun kenardan büyükse üçgen oluşur.', ok: true },
      { t: 'Kenarlar birbirine eşitse üçgen oluşur, değilse oluşmaz.', ok: false, nudge: '3, 4, 5 eşit değil. Üçgen oluşturur mu?' },
      { t: 'Her kenar diğer ikisinin toplamından küçükse üçgen oluşur.', ok: true },
    ],
    miss: 'Bir kenarı çok uzun yap: 2, 3, 8 gibi.',
    hints: ['Bir kenarı diğer ikisinin toplamından uzun yap.', '2 + 3 = 5. Üçüncü kenar 8 olursa uçlar buluşur mu?'],
    insight: 'Üçgen eşitsizliği: kısa iki kenarın toplamı en uzun kenardan büyük olmalıdır; 2, 3, 8 üçgen oluşturmaz.',
  }
}

function bigSideBigAngle(): Claim {
  return {
    who: P.defne,
    text: 'Bir üçgende **en uzun kenarın** karşısındaki açı en büyük açıdır.',
    truth: true,
    box: { k: 'tri' },
    start: [5, 6, 8],
    ev: ([a, b, c]) => {
      const [x, y, z] = [a, b, c].sort((m, n) => m - n)
      if (x + y <= z) return { expr: `${x} + ${y} ≤ ${z}`, test: 'Önce bir üçgen oluştur', holds: true, na: true }
      const ang = (o: number, p: number, r: number) => (Math.acos((p * p + r * r - o * o) / (2 * p * r)) * 180) / Math.PI
      const C = ang(z, x, y)
      const others = Math.max(ang(x, y, z), ang(y, x, z))
      return { expr: `En uzun kenar ${z} → karşısındaki açı ≈ ${Math.round(C)}°`, test: `En büyük açı bu mu? (diğerleri ≤ ${Math.round(others)}°)`, holds: C >= others - 1e-9 }
    },
    why: [
      { t: 'kenarı uzatmak için karşısındaki açının iki kolunu daha çok açmak gerekir', ok: true },
      FEW,
      { t: 'üçgenin açıları hep eşittir', ok: false, nudge: 'Tezgâhtaki açılar eşit mi? Yalnız eşkenar üçgende eşittir.' },
    ],
    hints: ['Bir kenarı uzat ve karşısındaki açıyı izle.'],
    insight: 'Üçgende kenar büyüdükçe karşısındaki açı da büyür; en uzun kenarın karşısında en büyük açı vardır.',
  }
}

function irrSum(): Claim {
  const r: Val[] = [
    { l: '√{2}', q: q(0), r: [0, 1, 2] },
    { l: '−√{2}', q: q(0), r: [0, -1, 2] },
    { l: '√{3}', q: q(0), r: [0, 1, 3] },
    { l: '2√{2}', q: q(0), r: [0, 2, 2] },
    { l: '1 + √{2}', q: q(0), r: [1, 1, 2] },
    { l: '1 − √{2}', q: q(0), r: [1, -1, 2] },
  ]
  return {
    who: P.ece,
    text: 'İki **irrasyonel** sayının toplamı her zaman irrasyoneldir.',
    truth: false,
    box: { k: 'num', rows: [{ name: 'İrrasyonel', vals: r }, { name: 'İrrasyonel', vals: r }] },
    start: [0, 2],
    ev: ([i, j]) => {
      const [a1, c1, k1] = r[i].r!, [a2, c2, k2] = r[j].r!
      const rat = a1 + a2
      let txt: string
      let irr: boolean
      if (k1 === k2) {
        const c = c1 + c2
        irr = c !== 0
        txt = c === 0 ? `${rat}` : `${rat ? rat + ' ' : ''}${c < 0 ? '− ' : rat ? '+ ' : ''}${Math.abs(c) === 1 ? '' : Math.abs(c)}√{${k1}}`
      } else {
        irr = true
        txt = `${r[i].l} + ${r[j].l}`
      }
      return { expr: `${r[i].l} + (${r[j].l}) = ${txt}`, test: 'Toplam irrasyonel mi?', holds: irr, kind: 'kökler birbirini götürür' }
    },
    why: [
      { t: 'irrasyonel kısımlar birbirini götürürse geriye rasyonel bir sayı kalır', ok: true },
      ONE,
      { t: 'irrasyonel sayılar toplanamaz', ok: false, nudge: '√{2} + √{2} = 2√{2}. Toplanabiliyor, değil mi?' },
    ],
    fix: [
      { t: 'İki irrasyonel sayının toplamı rasyonel de olabilir, irrasyonel de.', ok: true },
      { t: 'Rasyonel bir sayı ile irrasyonel bir sayının toplamı irrasyoneldir.', ok: true },
      { t: 'İki irrasyonel sayının toplamı her zaman rasyoneldir.', ok: false, nudge: '√{2} + √{3} rasyonel mi?' },
    ],
    miss: 'Bir sayıyı ve onun “tersini” (ör. √{2} ile −√{2}) toplamayı denedin mi?',
    hints: ['√{2} ile −√{2}’yi topla.', '(1 + √{2}) + (1 − √{2}) kaç eder?'],
    insight: '√{2} + (−√{2}) = 0 ve (1 + √{2}) + (1 − √{2}) = 2: iki irrasyonelin toplamı rasyonel olabilir.',
  }
}

function sqSum(): Claim {
  const v = ints([0, 1, 2, 3, 4, 5])
  return {
    who: P.arda,
    text: '(a + b)^{2} = a^{2} + b^{2} her zaman doğrudur.',
    truth: false,
    box: { k: 'num', rows: [{ name: 'a', vals: v }, { name: 'b', vals: v }] },
    start: [0, 3],
    ev: ([i, j]) => {
      const a = num(v[i].q), b = num(v[j].q)
      return { expr: `(${a} + ${b})^{2} = ${(a + b) ** 2} · ${a}^{2} + ${b}^{2} = ${a * a + b * b}`, test: `${(a + b) ** 2} = ${a * a + b * b} ?`, holds: (a + b) ** 2 === a * a + b * b, kind: 'a, b ≠ 0' }
    },
    why: [
      { t: '(a + b)^{2} = a^{2} + 2ab + b^{2}; 2ab sıfır değilse eşitlik bozulur', ok: true },
      ONE,
      { t: 'üs her terime ayrı ayrı dağıtılır', ok: false, nudge: '(1 + 2)^{2} = 9 ama 1^{2} + 2^{2} = 5. Üs toplama dağılıyor mu?', misc: 'Üssü toplama üzerine dağıttı' },
    ],
    fix: [
      { t: '(a + b)^{2} = a^{2} + 2ab + b^{2} her zaman doğrudur.', ok: true },
      { t: '(a + b)^{2} = a^{2} + b^{2} yalnız a ya da b sıfırsa doğrudur.', ok: true },
      { t: '(a + b)^{2} = 2a + 2b her zaman doğrudur.', ok: false, nudge: 'a = 1, b = 2 için dene: 9 = 6 mı?' },
    ],
    miss: 'a ve b’nin ikisini de sıfırdan farklı seçtin mi?',
    hints: ['a = 1, b = 2 dene.', 'Kenarı a + b olan bir kare çiz: içinde a^{2} ve b^{2} dışında ne var?'],
    insight: '(a + b)^{2} = a^{2} + 2ab + b^{2}: kenarı a + b olan karede a^{2} ve b^{2}’nin yanında iki tane ab dikdörtgeni vardır.',
  }
}

function sumBiggerA(): Claim {
  const a = ints([4, -3, 2])
  const b = ints([-5, -1, 0, 1, 3])
  return {
    who: P.kaan,
    text: 'Bir sayıya başka bir sayı eklersek sonuç her zaman **büyür**: a + b > a.',
    truth: false,
    box: { k: 'num', rows: [{ name: 'a', vals: a }, { name: 'b', vals: b }] },
    start: [0, 4],
    ev: ([i, j]) => {
      const x = a[i].q, y = b[j].q, r = qAdd(x, y)
      return { expr: `${s(x)} + ${sp(y)} = ${s(r)}`, test: `${s(r)} > ${s(x)} ?`, holds: num(r) > num(x), pts: [{ l: 'a', v: num(x), c: '#3b82f6' }, { l: 'a + b', v: num(r), c: '#d6457a' }], kind: y.n === 0 ? 'b = 0' : 'b negatif' }
    },
    why: [
      { t: 'negatif bir sayı eklemek sayı doğrusunda sola gitmektir', ok: true },
      ONE,
      { t: 'toplama hep büyütür, bu yüzden örnek yanlıştır', ok: false, nudge: 'Tezgâh 4 + (−5) = −1 buldu. −1, 4’ten büyük mü?' },
    ],
    fix: [
      { t: 'Pozitif bir sayı eklersek sonuç büyür.', ok: true },
      { t: 'b > 0 ise a + b > a’dır.', ok: true },
      { t: 'Toplama her zaman küçültür.', ok: false, nudge: '4 + 3 kaç?' },
    ],
    miss: 'b yerine 0 ya da negatif bir sayı koydun mu?',
    hints: ['b sırasındaki negatif sayıları dene.'],
    insight: 'a + b > a yalnız b pozitifse doğrudur: 0 eklemek değiştirmez, negatif sayı eklemek küçültür.',
  }
}

export function makeClaims(g: Grade): Claim[] {
  const pick = <T,>(arr: T[], n: number) => arr.slice().sort(() => Math.random() - 0.5).slice(0, n)
  let falseC: Claim[]
  let trueC: Claim[]
  if (g === 5) {
    falseC = [mulGrows(5), perArea(), ...pick([divShrinks(5), areaPer(), fracNum()], 2)]
    trueC = pick([evenSum(), consecSum()], 1)
  } else if (g === 6) {
    falseC = [primesOdd(), mulGrows(6), ...pick([oddsPrime(), div4div8(), primeSum(), halfLess(), divShrinks(6)], 2)]
    trueC = [div8div4()]
  } else if (g === 7) {
    falseC = [subShrinks(), squareBig(7), ...pick([negIsNeg(), ratioAdd(), sumBiggerA(), mulGrows(7)], 2)]
    trueC = pick([negSumNeg(), ratioMul()], 1)
  } else {
    falseC = [squareBig(8), anyTriangle(), ...pick([irrSum(), sqSum(), cubeBig(), sqrtLess()], 2)]
    trueC = [bigSideBigAngle()]
  }
  // Doğru iddia ortalarda bir yere girsin (ilk görev her zaman yanlış iddia)
  const out = falseC.slice()
  out.splice(2 + Math.floor(Math.random() * 2), 0, ...trueC)
  return out
}
