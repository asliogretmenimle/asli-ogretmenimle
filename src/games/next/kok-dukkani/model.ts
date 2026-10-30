/**
 * Kök Dükkanı — para modeli ve seviyeler.
 * Para: c√r (c katsayı, r kök içi). r = 1 ise düz lira. Kasa yalnızca sade paraları (kök içinde 1’den büyük tam kare çarpan yok) kabul eder;
 * sade olmayan para Bozdurma Bürosu’nda √(a · b) ayrıştırmasıyla sadeleştirilir.
 * Fiyat: kök cinsi (sade r) → katsayı. { 2: 3, 3: 2 } = 3√2 + 2√3
 */

export type Coin = { id: string; c: number; r: number }
export type Price = Record<number, number>

/** c√r → en sade biçim */
export function simplify(c: number, r: number) {
  let k = 1
  let rr = r
  for (let d = 2; d * d <= rr; d++) {
    while (rr % (d * d) === 0) {
      rr /= d * d
      k *= d
    }
  }
  return { c: c * k, r: rr }
}
export const isSade = (r: number) => simplify(1, r).r === r
export const isSq = (n: number) => Number.isInteger(Math.sqrt(n))

/** MathText biçimi: 3√{2}, √{18}, 6 */
export const rad = (c: number, r: number) => (r === 1 ? `${c}` : `${c === 1 ? '' : c}√{${r}}`)
export const priceText = (p: Price) =>
  Object.entries(p)
    .map(([r, c]) => [Number(r), c] as const)
    .sort((a, b) => a[0] - b[0])
    .map(([r, c]) => rad(c, r))
    .join(' + ')
/** Ekran okuyucu için: 3√{2} → 3 kök 2 */
export const speak = (t: string) => t.replace(/√\{([^}]*)\}/g, ' kök $1').replace(/\s+/g, ' ').trim()
export const approx = (v: number) => v.toLocaleString('tr-TR', { maximumFractionDigits: 2 })

/** Bozdurma bürosu seçenekleri: a · b = r, a ≥ b */
export function pairs(r: number) {
  const out: [number, number][] = []
  for (let b = 1; b * b <= r; b++) if (r % b === 0) out.push([r / b, b])
  return out
}

/** √(a · b) ayrıştırmasının sonucu: dışarı çıkan tam sayı ve kök içinde kalan */
export function exchange(coin: Coin, [a, b]: [number, number]) {
  const sa = a > 1 && isSq(a), sb = b > 1 && isSq(b)
  if (!sa && !sb) return null
  const out = (sa ? Math.sqrt(a) : 1) * (sb ? Math.sqrt(b) : 1)
  const rest = (sa ? 1 : a) * (sb ? 1 : b)
  return { c: coin.c * out, r: rest }
}

export type Option = { label: string; ok: boolean; nudge?: string; mis?: string }
export type Product = { name: string; emoji: string; c: number; r: number }

export type Step =
  | { kind: 'pay'; prompt: string; items: { name: string; emoji: string; price: Price }[]; wallet: [number, number][]; ways?: number }
  | { kind: 'choice'; prompt: string; emoji: string; options: Option[]; explain: string }
  | { kind: 'compare'; prompt: string; products: Product[] }

export interface Level {
  title: string
  emoji: string
  steps: Step[]
  insight: string
}

export const levels: Level[] = [
  {
    title: 'Tam kare paralar',
    emoji: '🪙',
    steps: [
      {
        kind: 'pay',
        prompt: 'Bir kutu boya 9 lira. Cüzdanındaki paraların hepsi kök içinde. Kasa yalnızca sade parayı kabul ediyor: bir paraya dokun, Bozdurma Bürosu’nda bozdur, sonra tam 9 lira öde.',
        items: [{ name: 'Boya kutusu', emoji: '🎨', price: { 1: 9 } }],
        wallet: [[1, 16], [1, 25], [1, 4], [1, 49], [1, 36], [1, 9]],
      },
    ],
    insight: 'Tam kare bir sayının karekökü bir tam sayıdır: √16 = 4, √49 = 7. Kök içindeki sayı tam kare olunca kök tamamen “açılır”.',
  },
  {
    title: 'Aynı cins paralar',
    emoji: '💰',
    steps: [
      {
        kind: 'pay',
        prompt: 'Defter 5√2 lira. Cüzdanında √2 ve √3 cinsinden paralar var. Tam tutarı öde; sonra aynı tutarı başka paralarla da öde.',
        items: [{ name: 'Defter', emoji: '📒', price: { 2: 5 } }],
        wallet: [[1, 2], [2, 2], [3, 2], [4, 2], [1, 3], [2, 3]],
        ways: 2,
      },
    ],
    insight: 'Kök içleri aynı olan ifadeler aynı cins paralar gibidir: katsayılar toplanır, kök aynen kalır. 3√2 + 2√2 = 5√2.',
  },
  {
    title: 'Bozdurma Bürosu',
    emoji: '🏦',
    steps: [
      {
        kind: 'pay',
        prompt: 'Sırt çantası 7√2 lira. Paraların hiçbiri sade değil! Bürodaki ayrıştırmalardan uygun olanı seçerek paraları √2 cinsine çevir ve tam tutarı öde.',
        items: [{ name: 'Sırt çantası', emoji: '🎒', price: { 2: 7 } }],
        wallet: [[1, 8], [1, 18], [1, 50], [1, 32], [1, 12]],
      },
    ],
    insight: 'Kök içindeki tam kare çarpan dışarı tam sayı olarak çıkar: √18 = √(9 · 2) = √9 · √2 = 3√2. Böylece görünüşte farklı kökler aynı cinse dönüşür ve toplanabilir.',
  },
  {
    title: 'Karışık sepet',
    emoji: '🧺',
    steps: [
      {
        kind: 'choice',
        emoji: '🧾',
        prompt: 'Sepette 3√2 liralık bir kalem ve 2√3 liralık bir silgi var. Fişte toplam nasıl yazılmalı?',
        options: [
          { label: '3√{2} + 2√{3}', ok: true },
          { label: '5√{5}', ok: false, nudge: 'Kasada √2 paralarıyla √3 paralarını aynı kutuya koyabilir misin? √2 ≈ 1,41 ve √3 ≈ 1,73; 5√5 ≈ 11,18 ama 3√2 + 2√3 ≈ 7,7. Hangisi doğru olabilir?', mis: 'Farklı kök cinslerini topladı: 3√2 + 2√3 = 5√5 sandı' },
          { label: '5√{6}', ok: false, nudge: 'Kök içlerini çarpmak toplamayı değiştirir mi? 5√6 ≈ 12,2; oysa kalem yaklaşık 4,2 ve silgi yaklaşık 3,5 lira.', mis: 'Toplamada kök içlerini çarptı' },
          { label: '√{5}', ok: false, nudge: '√2 + √3 = √5 olsaydı 1,41 + 1,73 ≈ 3,14 sayısı √5 ≈ 2,24’e eşit olurdu. Öyle mi?', mis: '√2 + √3 = √5 sandı' },
        ],
        explain: '√2 ve √3 farklı cins paralardır; toplam ancak 3√2 + 2√3 diye yazılabilir.',
      },
      {
        kind: 'pay',
        prompt: 'Şimdi sepeti öde: √2 cinsinden 3√2, √3 cinsinden 2√3 gerekiyor. Gerekirse önce bozdur.',
        items: [
          { name: 'Kalem', emoji: '🖊️', price: { 2: 3 } },
          { name: 'Silgi', emoji: '🧽', price: { 3: 2 } },
        ],
        wallet: [[1, 18], [1, 2], [1, 8], [1, 12], [1, 3], [1, 27]],
      },
    ],
    insight: 'Farklı kök içli ifadeler birleştirilemez: √2 + √3 ≠ √5. Toplama ve çıkarma her kök cinsinde ayrı yapılır.',
  },
  {
    title: 'Hangisi daha ucuz?',
    emoji: '🏷️',
    steps: [
      {
        kind: 'compare',
        prompt: 'Üç ürünün fiyat etiketlerini karşılaştır. Katsayıyı kök içine alırsan karşılaştırmak kolaylaşır. En ucuz ürünü al.',
        products: [
          { name: 'Kulaklık', emoji: '🎧', c: 3, r: 5 },
          { name: 'Hoparlör', emoji: '🔊', c: 5, r: 3 },
          { name: 'Saat', emoji: '⌚', c: 2, r: 11 },
        ],
      },
      {
        kind: 'compare',
        prompt: 'Bu ikisi çok yakın! Hangisi daha ucuz?',
        products: [
          { name: 'Top', emoji: '⚽', c: 2, r: 7 },
          { name: 'Kitap', emoji: '📗', c: 3, r: 3 },
        ],
      },
    ],
    insight: 'Katsayı kök içine karesiyle girer: 3√5 = √(9 · 5) = √45. Kök içleri karşılaştırılınca büyük olan daha büyüktür: √44 < √45 < √75.',
  },
  {
    title: 'Kilo ve alan',
    emoji: '⚖️',
    steps: [
      {
        kind: 'choice',
        emoji: '🍬',
        prompt: 'Lokumun kilosu √3 lira. √12 kilogram aldın. Kaç lira ödersin?',
        options: [
          { label: '6', ok: true },
          { label: '√{15}', ok: false, nudge: 'Tutar = fiyat × miktar. Kökleri çarparken kök içleri toplanır mı, çarpılır mı? √3 · √12 = √(3 · 12)', mis: 'Kareköklü ifadeleri çarparken kök içlerini topladı' },
          { label: '2√{3}', ok: false, nudge: '2√3, aldığın lokumun miktarı (√12 kg). Ödenecek tutar için miktarı fiyatla çarpman gerekmez mi?' },
          { label: '36', ok: false, nudge: '√3 · √12 = √36. √36 kaç eder?', mis: 'Kök içindeki çarpımın karekökünü almadı' },
        ],
        explain: '√3 · √12 = √36 = 6 lira.',
      },
      {
        kind: 'pay',
        prompt: 'Lokumcuya 6 lira öde.',
        items: [{ name: 'Lokum', emoji: '🍬', price: { 1: 6 } }],
        wallet: [[1, 16], [1, 49], [1, 4], [1, 25], [1, 9]],
      },
      {
        kind: 'choice',
        emoji: '🏷️',
        prompt: 'Lokum kutusuna kenarları √8 cm ve √2 cm olan dikdörtgen bir etiket yapıştırılacak. Etiketin alanı kaç cm²?',
        options: [
          { label: '4', ok: true },
          { label: '√{10}', ok: false, nudge: 'Dikdörtgenin alanı kenarların çarpımıdır. √8 · √2 = √(8 · 2) kaç eder?', mis: 'Kareköklü ifadeleri çarparken kök içlerini topladı' },
          { label: '2√{2}', ok: false, nudge: '√8 = 2√2; bu bir kenar. Alan için iki kenarı çarptın mı?' },
          { label: '16', ok: false, nudge: '√8 · √2 = √16. √16 kaç eder?', mis: 'Kök içindeki çarpımın karekökünü almadı' },
        ],
        explain: '√8 · √2 = √16 = 4 cm².',
      },
    ],
    insight: 'Kareköklü ifadeler çarpılırken kök içleri çarpılır: √a · √b = √(a · b). Çarpım tam kare olunca sonuç bir tam sayıdır: √3 · √12 = √36 = 6.',
  },
  {
    title: 'Kasa sende',
    emoji: '🧑‍💼',
    steps: [
      {
        kind: 'choice',
        emoji: '💵',
        prompt: 'Artık kasiyer sensin! Müşteri 4√2 liralık ürün için √72 lira verdi. Para üstü ne kadar? (Doğru olan her yazımı kabul ederiz.)',
        options: [
          { label: '2√{2}', ok: true },
          { label: '√{68}', ok: false, nudge: 'Kök içlerinden çıkarma yapılabilir mi? Önce √72’yi √2 cinsine bozdur: √72 = √(36 · 2) = ?', mis: 'Kareköklü ifadelerde çıkarmayı kök içlerinden yaptı' },
          { label: '√{8}', ok: true },
          { label: '2', ok: false, nudge: '6√2 − 4√2 sonucunda √2 nereye gitti? 6 elma − 4 elma = 2 elma.', mis: 'Çıkarmada kök cinsini düşürdü' },
        ],
        explain: '√72 = 6√2; 6√2 − 4√2 = 2√2 = √8.',
      },
      {
        kind: 'choice',
        emoji: '🧮',
        prompt: 'Bir müşteri √50 liralık bir para uzatıyor. Hesap makinesi yok! Bu para yaklaşık kaç lira eder?',
        options: [
          { label: '7,07', ok: true },
          { label: '25', ok: false, nudge: '25 · 25 = 625 olur. Hangi sayının karesi 50’ye yakın? 7² = 49.', mis: 'Karekökü ikiye bölme sandı' },
          { label: '5', ok: false, nudge: '5² = 25. √50 için karesi 50’ye yakın bir sayı ara: 7² = 49, 8² = 64.' },
          { label: '7,5', ok: false, nudge: '7,5² = 56,25; 50’den büyük. √50, √49 = 7’ye mi daha yakın, √64 = 8’e mi?' },
        ],
        explain: '√50 = 5√2 ≈ 5 · 1,414 ≈ 7,07; 49’a çok yakın olduğu için 7’den biraz büyük.',
      },
    ],
    insight: 'Çıkarma da yalnızca aynı kök cinsinde yapılır: √72 − 4√2 = 6√2 − 4√2 = 2√2. Aynı tutar farklı yazılabilir: 2√2 = √8. Tahmin için en yakın tam karelere bakılır.',
  },
]

/** Kök cinsine göre jeton rengi */
export function coinColor(r: number) {
  const fam = simplify(1, r).r
  if (!isSade(r)) return { bg: 'linear-gradient(145deg,#64748b,#334155)', ring: '#94a3b8', ink: '#f8fafc' }
  const map: Record<number, [string, string, string]> = {
    1: ['#fb923c', '#c2410c', '#fff7ed'],
    2: ['#facc15', '#a16207', '#422006'],
    3: ['#38bdf8', '#0369a1', '#082f49'],
    5: ['#a78bfa', '#6d28d9', '#f5f3ff'],
    7: ['#fb7185', '#be123c', '#fff1f2'],
    11: ['#34d399', '#047857', '#022c22'],
  }
  const [a, b, ink] = map[fam] ?? ['#cbd5e1', '#475569', '#0f172a']
  return { bg: `linear-gradient(145deg,${a},${b})`, ring: a, ink }
}
