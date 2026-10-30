/**
 * Eğim Parkuru — seviyeler.
 * Rampa (0, n) noktasından başlar; ucu (run, n + rise) noktasındadır. Eğim m = rise ÷ run, doğru y = mx + n.
 * Kaykaycı bu doğru boyunca ilerler; yıldız doğru üzerindeyse toplanır (rise · x + n · run = y · run, tam sayılarla kesin denetim).
 */

export type Opt = { label: string; ok: boolean; nudge?: string }

export interface Level {
  title: string
  emoji: string
  prompt: string
  stars: [number, number][]
  /** Başlangıç yüksekliği */
  n: number
  /** Öğrenci başlangıç yüksekliğini de ayarlar */
  nFree?: boolean
  init: { rise: number; run: number }
  /** Önce eğim tahmini (cevap: answer) */
  guess?: { options: string[]; answer: string }
  /** Karşılaştırma için hazır rampa: y = (rise/run)x + n */
  ghost?: { rise: number; run: number; n: number }
  /** Başarıdan sonra tartışma sorusu */
  after?: { q: string; options: Opt[] }
  /** Farklı rampa sayısı (çoklu çözüm) */
  solutions?: number
  insight: string
}

export const levels: Level[] = [
  {
    title: 'İlk rampa',
    emoji: '🛹',
    prompt: 'Yıldız (3, 6) noktasında. Rampa yerden (0, 0) başlıyor. Rampa her 1 adım ileri gidince kaç adım yükselmeli?',
    stars: [[3, 6]],
    n: 0,
    init: { rise: 1, run: 1 },
    guess: { options: ['2', '[[1/2]]', '6', '3'], answer: '2' },
    insight: '3 birim ilerlerken 6 birim yükselmek, her 1 birimde 2 birim yükselmek demektir. Eğim = dikey değişim ÷ yatay değişim = 6 ÷ 3 = 2; doğrunun denklemi y = 2x.',
  },
  {
    title: 'Kesirli eğim',
    emoji: '📐',
    prompt: 'Yıldız (6, 4) noktasında. Bu sefer rampa ilerledikçe daha yavaş yükselmeli. Eğim bir tam sayı olmak zorunda mı?',
    stars: [[6, 4]],
    n: 0,
    init: { rise: 1, run: 1 },
    guess: { options: ['[[2/3]]', '[[3/2]]', '2', '4'], answer: '[[2/3]]' },
    insight: 'Eğim kesir olabilir: 3 ileri giderken 2 yükselen rampanın eğimi [[2/3]] tür. 6 ileri gidince 4 yükselir; [[4/6]] ile [[2/3]] aynı eğimdir.',
  },
  {
    title: 'İniş rampası',
    emoji: '⛷️',
    prompt: 'Rampa 8 yüksekliğindeki tepeden başlıyor, yıldız yerde (4, 0) noktasında. Kaykaycı inerken eğim nasıl bir sayı olur?',
    stars: [[4, 0]],
    n: 8,
    init: { rise: 1, run: 1 },
    guess: { options: ['−2', '2', '−[[1/2]]', '−8'], answer: '−2' },
    insight: 'İlerledikçe alçalan doğrunun eğimi negatiftir: 4 ileri giderken 8 alçalmak, eğimin −8 ÷ 4 = −2 olması demektir. Doğru y = −2x + 8.',
  },
  {
    title: 'Düz yol',
    emoji: '🛣️',
    prompt: 'Rampa 5 yüksekliğinde başlıyor, yıldız (7, 5) noktasında. Hiç yükselmeyen bir yolun eğimi nedir?',
    stars: [[7, 5]],
    n: 5,
    init: { rise: 1, run: 1 },
    guess: { options: ['0', '1', '5', 'tanımsız'], answer: '0' },
    after: {
      q: 'Peki rampa dimdik, duvar gibi olsaydı (yatay değişim 0)? Dikey bir rampanın eğimi nedir?',
      options: [
        { label: 'Tanımsız: 0’a bölme yapılamaz', ok: true },
        { label: '0', ok: false, nudge: 'Eğimi 0 olan doğru yataydı. Dikey rampada dikey değişim var ama yatay değişim 0: eğim = dikey ÷ 0. Bu bölme yapılabilir mi?' },
        { label: 'Çok büyük bir sayı', ok: false, nudge: 'Rampa dikleştikçe eğim büyür, doğru. Ama tam dikey olunca yatay değişim 0 olur: 5 ÷ 0 gibi bir bölmenin sonucu var mı?' },
      ],
    },
    insight: 'Yatay doğrunun eğimi 0’dır (y = 5): x değişse de y değişmez. Dikey doğrunun eğimi ise tanımsızdır, çünkü yatay değişim 0 olur ve 0’a bölme yapılamaz.',
  },
  {
    title: 'Yüksekten başla',
    emoji: '🏗️',
    prompt: 'Rampa 2 yüksekliğindeki platformdan başlıyor, yıldız (4, 8) noktasında. Rampanın eğimi ne olmalı?',
    stars: [[4, 8]],
    n: 2,
    init: { rise: 1, run: 1 },
    guess: { options: ['[[3/2]]', '2', '[[2/3]]', '6'], answer: '[[3/2]]' },
    insight: 'Başlangıç yüksekliği n = 2 olduğundan rampa yıldıza kadar 8 − 2 = 6 birim yükselir: eğim [[6/4]] = [[3/2]]. Doğrunun denklemi y = [[3/2]]x + 2; n doğrunun y eksenini kestiği yerdir.',
  },
  {
    title: 'İki yıldız',
    emoji: '✨',
    prompt: 'İki yıldızı da tek rampayla topla: (2, 3) ve (6, 5). Bu sefer başlangıç yüksekliğini de sen ayarla.',
    stars: [[2, 3], [6, 5]],
    n: 0,
    nFree: true,
    init: { rise: 1, run: 1 },
    guess: { options: ['[[1/2]]', '2', '1', '[[5/6]]'], answer: '[[1/2]]' },
    insight: 'İki yıldız arasında 4 ileri giderken 2 yükseliyoruz: eğim [[2/4]] = [[1/2]]. (2, 3) noktasından 2 geri gidince 1 alçalırız, bu yüzden n = 2. İki nokta tek bir doğruyu belirler: y = [[1/2]]x + 2.',
  },
  {
    title: 'Paralel rampalar',
    emoji: '🛤️',
    prompt: 'Mavi rampa y = [[2/3]]x + 1 doğrusu üzerinde. Kırmızı rampan 4 yüksekliğinden başlıyor ve yıldız (3, 6) noktasında. Kırmızı rampanın eğimi ne olmalı?',
    stars: [[3, 6]],
    n: 4,
    ghost: { rise: 2, run: 3, n: 1 },
    init: { rise: 1, run: 1 },
    guess: { options: ['[[2/3]]', '[[3/2]]', '2', '[[5/3]]'], answer: '[[2/3]]' },
    after: {
      q: 'Mavi ve kırmızı rampalar sonsuza kadar uzatılsa kesişirler mi?',
      options: [
        { label: 'Hayır: eğimleri eşit, paraleller', ok: true },
        { label: 'Evet, sağda bir yerde', ok: false, nudge: 'İki doğru da her 3 adımda 2 yükseliyor. Aralarındaki dikey uzaklık (4 − 1 = 3) hiç değişir mi?' },
        { label: 'Evet, x = 0’da', ok: false, nudge: 'x = 0 olduğunda mavi doğru 1, kırmızı doğru 4 yüksekliğinde. Aynı noktadalar mı?' },
      ],
    },
    insight: 'Eğimleri eşit, başlangıç yükseklikleri farklı doğrular paraleldir: y = [[2/3]]x + 1 ile y = [[2/3]]x + 4 arasındaki dikey uzaklık hep 3 birimdir, hiç kesişmezler.',
  },
  {
    title: 'Serbest parkur',
    emoji: '🏆',
    prompt: 'Yıldız (6, 6) noktasında. Başlangıç yüksekliğini ve eğimi değiştirerek yıldıza giden 3 farklı rampa kur!',
    stars: [[6, 6]],
    n: 0,
    nFree: true,
    init: { rise: 1, run: 1 },
    solutions: 3,
    insight: 'Bir noktadan sonsuz sayıda doğru geçer. Başlangıç yüksekliği arttıkça yıldıza ulaşmak için gereken eğim azalır: y = x, y = [[1/2]]x + 3, y = 6 … hepsi (6, 6) noktasından geçer.',
  },
]
