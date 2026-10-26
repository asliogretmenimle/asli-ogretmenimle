import type { Grade, ShapeName, Visual } from '../../data/types'

/**
 * Hangisi Farklı? 2.0 — dörtlü kart grupları.
 * Her grupta her kartı “tek başına” ayıran en az bir özellik vardır (olumlu ya da olumsuz biçimde).
 * Özellik: `has` = bu özelliğin DOĞRU olduğu kartlar.
 *  - has tek kart → “Yalnızca X: <pos>” geçerli gerekçe
 *  - has üç kart → “Yalnızca X: <neg>” (dışarıda kalan kart için) geçerli gerekçe
 *  - has iki kart → çeldirici (ortak özellik, kimseyi ayırmaz)
 *  - has dört kart → benzerlik (hepsinde var)
 */

export type PicShape = 'circle' | 'triangle' | 'square' | 'star'
export interface Pic { s: PicShape; c: string; hollow?: boolean; small?: boolean }

export type Show =
  | { t: 'text'; s: string; sub?: string }
  | { t: 'vis'; v: Visual; cap?: string }
  | { t: 'pics'; items: Pic[] }
  | { t: 'frac'; shape: 'rect' | 'circle'; parts: number; filled: number; unequal?: boolean }
  | { t: 'svg'; svg: string; cap?: string }
  | { t: 'table'; head: [string, string]; rows: [string, string][] }

export interface Prop { pos: string; neg: string; has: number[] }
export interface HSet { id: string; g: Grade[]; title: string; cards: [Show, Show, Show, Show]; props: Prop[] }

const L = 'ABCD'
/** p('tek sayı', 'A') → yalnız A’da var. neg verilmezse “… değil”. */
const p = (pos: string, has: string, neg?: string): Prop => ({ pos, neg: neg ?? `${pos} değil`, has: has.split('').map((c) => L.indexOf(c)) })

const C = { red: '#ef4444', blue: '#3b82f6', yellow: '#eab308', green: '#22c55e', orange: '#f97316', purple: '#a855f7' }
const pics = (n: number, s: PicShape, c: string, o: { hollow?: boolean; small?: boolean } = {}): Show => ({ t: 'pics', items: Array.from({ length: n }, () => ({ s, c, ...o })) })
const tx = (s: string, sub?: string): Show => ({ t: 'text', s, sub })
const vis = (v: Visual, cap?: string): Show => ({ t: 'vis', v, cap })
const shape = (s: ShapeName, color?: string): Show => vis({ kind: 'shape', shape: s, color })

// ── küçük SVG çizimleri (alan, simetri) ──
const INK = '#1f2340'
const lbl = (x: number, y: number, s: string, anchor = 'middle') => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="13" font-weight="800" fill="${INK}">${s}</text>`
const poly = (pts: string, fill: string) => `<polygon points="${pts}" fill="${fill}" fill-opacity="0.8" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
const dash = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="2" stroke-dasharray="5 4"/>`
const svgWrap = (body: string, w = 160, h = 120) => `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`
/** taban 6, yükseklik h (birim 16 px) */
const paraSvg = svgWrap(poly('40,96 136,96 116,32 20,32', C.orange) + dash(40, 32, 40, 96) + lbl(88, 114, '6 br') + lbl(46, 70, '4 br', 'start'), 160, 120)
const triTallSvg = svgWrap(poly('32,112 128,112 96,8', C.blue) + dash(96, 8, 96, 112) + lbl(80, 126, '6 br') + lbl(100, 66, '8 br', 'start'), 160, 130)
const rectSvg = svgWrap(poly('32,40 128,40 128,104 32,104', C.green) + lbl(80, 120, '6 br') + lbl(134, 76, '4 br', 'start'), 170, 124)
const triShortSvg = svgWrap(poly('32,104 128,104 60,40', C.purple) + dash(60, 40, 60, 104) + lbl(80, 120, '6 br') + lbl(64, 78, '4 br', 'start'), 160, 124)
const isoSvg = svgWrap(poly('80,10 128,110 32,110', C.orange), 160, 120)

export const SETS: HSet[] = [
  // ───────── 1. sınıf ─────────
  {
    id: 'g1-pics', g: [1], title: 'Şekil grupları',
    cards: [pics(3, 'triangle', C.red), pics(3, 'circle', C.blue), pics(4, 'circle', C.red), pics(3, 'circle', C.red, { hollow: true })],
    props: [p('üçgen', 'A'), p('mavi', 'B'), p('4 tane', 'C'), p('içi boş', 'D', 'içi dolu'), p('yuvarlak', 'BCD'), p('kırmızı', 'ACD'), p('kırmızı ve yuvarlak', 'CD')],
  },
  {
    id: 'g1-frames', g: [1], title: 'Onluk çerçeveler',
    cards: [vis({ kind: 'tenframe', filled: 7, size: 10 }), vis({ kind: 'tenframe', filled: 10, size: 10 }), vis({ kind: 'tenframe', filled: 5, size: 10 }), vis({ kind: 'dots', count: 5, arrangement: 'dice' })],
    props: [p('çerçevenin hepsi dolu', 'B', 'çerçevenin hepsi dolu değil'), p('zar gibi dizilmiş', 'D'), p('yalnız üst sıra dolu', 'C'), p('10’a tamamlamak için 3 gerek', 'A'), p('5 tane', 'CD'), p('5’ten çok', 'AB'), p('onluk çerçevede', 'ABC')],
  },
  {
    id: 'g1-nums', g: [1], title: 'Sayılar',
    cards: [tx('12'), tx('15'), tx('20'), tx('9')],
    props: [p('10’dan küçük', 'D'), p('10 ve 2’den oluşur', 'A'), p('10 ve 5’ten oluşur', 'B'), p('iki tane 10’dan oluşur', 'C'), p('10’dan büyük', 'ABC'), p('5’er 5’er sayarken söylenir', 'BC'), p('8 ile 13 arasında', 'AD')],
  },
  {
    id: 'g1-ops', g: [1, 2], title: 'İşlemler',
    cards: [tx('3 + 4'), tx('5 + 5'), tx('9 − 2'), tx('4 + 3')],
    props: [p('çıkarma işlemi', 'C'), p('sonucu 10', 'B'), p('iki sayı aynı (ikizler)', 'B'), p('3 ile başlıyor', 'A'), p('4 ile başlıyor', 'D'), p('sonucu 7', 'ACD'), p('içinde hem 3 hem 4 var', 'AD')],
  },
  {
    id: 'g1-shapes', g: [1, 2], title: 'Düzlem şekiller',
    cards: [shape('triangle', C.orange), shape('square', C.blue), shape('circle', C.orange), shape('rectangle', C.orange)],
    props: [p('köşesi yok', 'C', 'köşesi var'), p('3 köşeli', 'A'), p('mavi', 'B'), p('uzun ve kısa kenarları var', 'D'), p('4 köşeli', 'BD'), p('kenarları düz', 'ABD'), p('turuncu', 'ACD')],
  },
  {
    id: 'g1-dots', g: [1], title: 'Nokta kartları',
    cards: [vis({ kind: 'dots', count: 6, arrangement: 'dice' }), vis({ kind: 'dots', count: 6, arrangement: 'line' }), vis({ kind: 'dots', count: 4, arrangement: 'dice' }), vis({ kind: 'dots', count: 6, arrangement: 'five' })],
    props: [p('4 tane', 'C'), p('tek bir sırada', 'B'), p('5 ve 1 diye görülüyor', 'D'), p('3 ve 3 diye iki sütun', 'A'), p('zar düzeninde', 'AC'), p('6 tane', 'ABD')],
  },

  // ───────── 2. sınıf ─────────
  {
    id: 'g2-nums', g: [2], title: 'İki basamaklı sayılar',
    cards: [tx('35'), tx('53'), tx('50'), tx('38')],
    props: [p('50’den büyük', 'B'), p('birler basamağı 0', 'C'), p('birler basamağı 5', 'A'), p('birler basamağı 8', 'D'), p('onlar basamağı 3', 'AD'), p('onlar basamağı 5', 'BC'), p('40’tan küçük', 'AD')],
  },
  {
    id: 'g2-arrays', g: [2, 3], title: 'Diziler',
    cards: [vis({ kind: 'array', rows: 3, cols: 4 }), vis({ kind: 'array', rows: 2, cols: 6 }), vis({ kind: 'array', rows: 3, cols: 3 }), vis({ kind: 'array', rows: 2, cols: 5 })],
    props: [p('kare biçiminde', 'C'), p('10 nokta', 'D'), p('her sırada 4 nokta', 'A'), p('her sırada 6 nokta', 'B'), p('12 nokta', 'AB'), p('3 sıra', 'AC'), p('5’er 5’er sayılır', 'D')],
  },
  {
    id: 'g2-fracs', g: [2, 3], title: 'Bütün, yarım, çeyrek',
    cards: [{ t: 'frac', shape: 'circle', parts: 4, filled: 1 }, { t: 'frac', shape: 'rect', parts: 2, filled: 1 }, { t: 'frac', shape: 'rect', parts: 4, filled: 2 }, { t: 'frac', shape: 'rect', parts: 4, filled: 1, unequal: true }],
    props: [p('daire', 'A'), p('çeyreği boyalı', 'A'), p('2 parçaya bölünmüş', 'B'), p('2 parçası boyalı', 'C'), p('parçaları eş değil', 'D', 'parçaları eş'), p('yarısı boyalı', 'BC'), p('4 parçaya bölünmüş', 'ACD')],
  },
  {
    id: 'g2-solids', g: [2, 3], title: 'Geometrik cisimler',
    cards: [shape('cube', C.blue), shape('sphere', C.orange), shape('cylinder', C.green), shape('cone', C.purple)],
    props: [p('düz yüzeyi yok', 'B', 'düz yüzeyi var'), p('tepe noktası var', 'D'), p('bütün yüzleri kare', 'A'), p('iki daire yüzü var', 'C'), p('yuvarlanabilir', 'BCD'), p('üst üste rahatça konabilir', 'AC')],
  },
  {
    id: 'g2-ops', g: [2], title: 'Sonucu 15 mi?',
    cards: [tx('8 + 7'), tx('15 − 7'), tx('7 + 7 + 1'), tx('10 + 5')],
    props: [p('çıkarma var', 'B'), p('üç sayı toplanıyor', 'C'), p('onluk ile birlik toplanıyor', 'D'), p('iki tek basamaklı sayının toplamı', 'A'), p('sonucu 15', 'ACD'), p('son sayı 7', 'AB'), p('ikizler kullanılıyor', 'C')],
  },
  {
    id: 'g2-clocks', g: [2, 3], title: 'Saatler',
    cards: [vis({ kind: 'clock', h: 3, m: 0 }), vis({ kind: 'clock', h: 12, m: 0 }), vis({ kind: 'clock', h: 6, m: 30 }), vis({ kind: 'clock', h: 9, m: 0 })],
    props: [p('yarım saat', 'C', 'yarım saat değil'), p('akrep ile yelkovan üst üste', 'B'), p('akrep 3’ü gösteriyor', 'A'), p('akrep 9’u gösteriyor', 'D'), p('tam saat', 'ABD'), p('akrep ile yelkovan “L” gibi köşe yapıyor', 'AD')],
  },

  // ───────── 3. sınıf ─────────
  {
    id: 'g3-nums', g: [3], title: 'Üç basamaklı sayılar',
    cards: [tx('105'), tx('250'), tx('510'), tx('154')],
    props: [p('tek sayı', 'A'), p('500’den büyük', 'C'), p('1000’in çeyreği', 'B'), p('5’in katı', 'ABC'), p('rakamlarının toplamı 6', 'AC'), p('yüzler basamağı 1', 'AD'), p('içinde 0 rakamı var', 'ABC')],
  },
  {
    id: 'g3-polys', g: [3, 4], title: 'Kenarlar',
    cards: [shape('triangle', C.orange), shape('square', C.blue), shape('pentagon', C.green), shape('rectangle', C.purple)],
    props: [p('3 kenarlı', 'A'), p('5 kenarlı', 'C'), p('4 eşit kenarlı', 'B'), p('uzun ve kısa kenarları var', 'D'), p('bütün kenarları eşit', 'ABC'), p('4 kenarlı', 'BD'), p('dik köşeleri var', 'BD')],
  },
  {
    id: 'g3-unit', g: [3], title: 'Birim kesirler',
    cards: [vis({ kind: 'fraction', num: 1, den: 2, shape: 'circle' }), tx('[[1/3]]'), tx('[[1/4]]'), tx('[[2/4]]')],
    props: [p('modelle gösterilmiş', 'A', 'sembolle yazılmış'), p('paydası 3', 'B'), p('en küçük kesir', 'C'), p('payı 2', 'D'), p('birim kesir', 'ABC'), p('yarıma eşit', 'AD'), p('paydası 4', 'CD')],
  },
  {
    id: 'g3-mult', g: [3], title: 'Çarpma ve bölme',
    cards: [tx('4 × 6'), tx('3 × 8'), tx('48 ÷ 2'), tx('5 × 5')],
    props: [p('bölme işlemi', 'C'), p('iki sayı aynı', 'D'), p('iki çift sayının çarpımı', 'A'), p('bir tek, bir çift sayının çarpımı', 'B'), p('sonucu 24', 'ABC'), p('içinde tek sayı var', 'BD')],
  },
  {
    id: 'g3-parity', g: [3, 4], title: 'Tek mi, çift mi?',
    cards: [tx('7 + 5'), tx('8 + 6'), tx('9 + 4'), tx('3 + 3 + 3')],
    props: [p('iki tek sayının toplamı', 'A'), p('iki çift sayının toplamı', 'B'), p('bir tek, bir çift sayının toplamı', 'C'), p('üç sayının toplamı', 'D'), p('sonucu çift', 'AB'), p('sonucu tek', 'CD'), p('3 × 3 olarak da yazılabilir', 'D')],
  },

  // ───────── 4. sınıf ─────────
  {
    id: 'g4-fracs', g: [4], title: 'Kesirler',
    cards: [vis({ kind: 'fraction', num: 3, den: 4, shape: 'bar' }), tx('[[6/8]]'), tx('[[2/3]]'), tx('[[5/4]]')],
    props: [p('1’den büyük', 'D'), p('paydası 3', 'C'), p('sadeleşebilir', 'B'), p('modelle gösterilmiş', 'A', 'sembolle yazılmış'), p('[[3/4]]’e denk', 'AB'), p('1’den küçük', 'ABC'), p('payı paydasından 1 eksik', 'AC')],
  },
  {
    id: 'g4-angles', g: [4, 5], title: 'Açılar',
    cards: [vis({ kind: 'angle', degrees: 90, showMeasure: true }), vis({ kind: 'angle', degrees: 45, showMeasure: true }), vis({ kind: 'angle', degrees: 120, showMeasure: true }), vis({ kind: 'angle', degrees: 30, showMeasure: true })],
    props: [p('dik açı', 'A'), p('geniş açı', 'C'), p('dik açının yarısı', 'B'), p('en küçük açı', 'D'), p('dar açı', 'BD'), p('90°’den küçük', 'BD'), p('30°’den büyük', 'ABC')],
  },
  {
    id: 'g4-rects', g: [4], title: 'Dikdörtgenler',
    cards: [vis({ kind: 'area', w: 4, h: 3, labels: true }), vis({ kind: 'area', w: 6, h: 2, labels: true }), vis({ kind: 'area', w: 3, h: 3, labels: true }), vis({ kind: 'area', w: 7, h: 1, labels: true })],
    props: [p('kare', 'C'), p('kenarları ardışık sayılar', 'A'), p('uzun kenarı kısa kenarının 3 katı', 'B'), p('tek sıra kareden oluşuyor', 'D'), p('alanı 12 birim kare', 'AB'), p('çevresi 16 birim', 'BD'), p('alanı tek sayı', 'CD')],
  },
  {
    id: 'g4-big', g: [4], title: 'Büyük sayılar',
    cards: [tx('50 000'), tx('4 530'), tx('405 300'), tx('45 003')],
    props: [p('dört basamaklı', 'B'), p('altı basamaklı', 'C'), p('sıfırdan farklı tek bir rakamı var', 'A'), p('binler bölüğü 45', 'D'), p('10’un katı', 'ABC'), p('beş basamaklı', 'AD'), p('4 ve 5 rakamlarını içerir', 'BCD')],
  },
  {
    id: 'g4-sym', g: [4, 5], title: 'Simetri',
    cards: [shape('square', C.blue), shape('rectangle', C.green), { t: 'svg', svg: isoSvg }, shape('parallelogram', C.purple)],
    props: [p('4 simetri doğrusu var', 'A'), p('2 simetri doğrusu var', 'B'), p('tek simetri doğrusu var', 'C'), p('simetri doğrusu yok', 'D', 'simetri doğrusu var'), p('dörtgen', 'ABD'), p('dik açıları var', 'AB')],
  },
  {
    id: 'g4-ops', g: [4], title: 'Sonuç 100 mü?',
    cards: [tx('25 × 4'), tx('1000 ÷ 10'), tx('99 + 1'), tx('50 + 50 + 5')],
    props: [p('çarpma işlemi', 'A'), p('bölme işlemi', 'B'), p('iki sayının toplamı', 'C'), p('üç sayının toplamı', 'D'), p('sonucu 100', 'ABC'), p('toplama işlemi', 'CD'), p('içinde 0 rakamı var', 'BD')],
  },
  {
    id: 'g4-chance', g: [4], title: 'Olasılık',
    cards: [tx('Zarda 7 gelmesi', '🎲'), tx('Zarda 6 gelmesi', '🎲'), tx('Madeni parada yazı gelmesi', '🪙'), tx('Zarda 7’den küçük bir sayı gelmesi', '🎲')],
    props: [p('imkânsız', 'A'), p('kesin', 'D'), p('madeni parayla ilgili', 'C'), p('6 eşit şanslı sonuçtan yalnızca biri', 'B'), p('olabilir ama kesin değil', 'BC'), p('zarla ilgili', 'ABD')],
  },

  // ───────── 5. sınıf ─────────
  {
    id: 'g5-half', g: [5], title: '[[1/2]] ile karşılaştır',
    cards: [tx('[[3/8]]'), tx('[[5/8]]'), tx('[[4/8]]'), tx('[[5/6]]')],
    props: [p('[[1/2]]’den küçük', 'A'), p('[[1/2]]’ye eşit', 'C'), p('[[1/8]] eklenince [[3/4]] olur', 'B'), p('1’e tamamlamak için [[1/6]] gerekir', 'D'), p('[[1/2]]’den büyük', 'BD'), p('paydası 8', 'ABC'), p('payı tek', 'ABD')],
  },
  {
    id: 'g5-polys', g: [5, 6], title: 'Çokgenler',
    cards: [shape('hexagon', C.green), shape('rhombus', C.blue), shape('rectangle', C.orange), shape('trapezoid', C.purple)],
    props: [p('6 kenarlı', 'A'), p('4 eş kenarlı dörtgen', 'B'), p('dik açıları var', 'C'), p('yalnızca bir çift paralel kenarı var', 'D'), p('dörtgen', 'BCD'), p('bütün kenarları eşit', 'AB'), p('karşılıklı kenarları paralel', 'ABC')],
  },
  {
    id: 'g5-area', g: [5], title: 'Alan ve çevre',
    cards: [vis({ kind: 'area', w: 8, h: 3, labels: true }), vis({ kind: 'area', w: 6, h: 4, labels: true }), vis({ kind: 'area', w: 5, h: 5, labels: true }), vis({ kind: 'area', w: 10, h: 2, labels: true })],
    props: [p('kare', 'C'), p('alanı çevresinden küçük', 'D'), p('çevresi 22 birim', 'A'), p('kenarları arasındaki fark 2', 'B'), p('alanı 24 birim kare', 'AB'), p('çevresi 20 birim', 'BC'), p('alanı 25 birim kare', 'C')],
  },
  {
    id: 'g5-seq', g: [5, 6], title: 'Örüntüler',
    cards: [tx('3, 6, 9, 12, …'), tx('2, 4, 8, 16, …'), tx('1, 4, 9, 16, …'), tx('5, 8, 11, 14, …')],
    props: [p('her adımda 2 katına çıkıyor', 'B'), p('kare sayılardan oluşuyor', 'C'), p('3’ün katlarından oluşuyor', 'A'), p('ilk terimi 5', 'D'), p('her adımda 3 artıyor', 'AD'), p('artış miktarı değişiyor', 'BC'), p('terimlerinin hepsi çift', 'B')],
  },
  {
    id: 'g5-chance', g: [5], title: 'Olasılık',
    cards: [tx('Zarda 7 gelmesi', '🎲'), tx('Zarda 6’dan küçük gelmesi', '🎲'), tx('Madeni parada yazı gelmesi', '🪙'), tx('Zarda 1 ile 6 arasında (ikisi dâhil) gelmesi', '🎲')],
    props: [p('imkânsız (olasılığı 0)', 'A'), p('kesin (olasılığı 1)', 'D'), p('olasılığı [[1/2]]', 'C'), p('olasılığı [[1/2]]’den büyük ama 1 değil', 'B'), p('zarla ilgili', 'ABD'), p('olabilir ama kesin değil', 'BC')],
  },
  {
    id: 'g5-order', g: [5], title: 'İşlem önceliği',
    cards: [tx('3 + 4 × 2'), tx('(3 + 4) × 2'), tx('3 × 4 + 2'), tx('3 × (4 + 2)')],
    props: [p('sonucu 11', 'A'), p('sonucu 18', 'D'), p('parantez en başta', 'B'), p('önce yazılan işlem sonra yapılıyor', 'AD'), p('parantez yok ve sonucu 14', 'C'), p('sonucu 14', 'BC'), p('parantez var', 'BD')],
  },

  // ───────── 6. sınıf ─────────
  {
    id: 'g6-nums', g: [6], title: 'Çarpanlar',
    cards: [tx('12'), tx('17'), tx('21'), tx('36')],
    props: [p('asal sayı', 'B'), p('tam kare', 'D'), p('tek ama asal değil', 'C'), p('tam 6 tane böleni var', 'A'), p('3’ün katı', 'ACD'), p('çift sayı', 'AD'), p('20’den büyük', 'CD')],
  },
  {
    id: 'g6-half', g: [6], title: 'Gösterimler',
    cards: [tx('0,5'), tx('[[1/2]]'), tx('%50'), tx('0,05')],
    props: [p('yüzde ile yazılmış', 'C'), p('kesir ile yazılmış', 'B'), p('virgülden sonra tek basamak var', 'A'), p('[[1/20]]’ye eşit', 'D'), p('yarıma eşit', 'ABC'), p('ondalık gösterim', 'AD')],
  },
  {
    id: 'g6-expr', g: [6, 7], title: 'Cebirsel ifadeler',
    cards: [tx('2n + 4'), tx('2(n + 2)'), tx('n + n + 4'), tx('4n')],
    props: [p('parantez içeriyor', 'B'), p('n iki kez yazılmış', 'C'), p('sabit terimi yok', 'D', 'sabit terimi var'), p('“katsayı × n + sayı” biçiminde', 'A'), p('n = 1 iken değeri 6', 'ABC'), p('n = 2 iken değeri 8', 'ABCD'), p('içinde 4 sayısı var', 'ACD', 'içinde 4 sayısı yok')],
  },
  {
    id: 'g6-area', g: [6, 7], title: 'Alanlar',
    cards: [{ t: 'svg', svg: paraSvg }, { t: 'svg', svg: triTallSvg }, { t: 'svg', svg: rectSvg }, { t: 'svg', svg: triShortSvg }],
    props: [p('paralelkenar', 'A'), p('yüksekliği 8 br', 'B'), p('dik açıları var', 'C'), p('alanı 12 br²', 'D'), p('alanı 24 br²', 'ABC'), p('üçgen', 'BD'), p('tabanı 6 br', 'ABCD')],
  },
  {
    id: 'g6-div', g: [6], title: 'Bölünebilme',
    cards: [tx('145'), tx('240'), tx('225'), tx('128')],
    props: [p('10’a bölünür', 'B'), p('9’a bölünür', 'C'), p('2’nin kuvveti', 'D'), p('5’e bölünür ama 3’e bölünmez', 'A'), p('5’e bölünür', 'ABC'), p('çift sayı', 'BD'), p('3’e bölünür', 'BC')],
  },
  {
    id: 'g6-data', g: [6], title: 'Veri grupları',
    cards: [tx('4, 6, 8'), tx('2, 6, 10'), tx('6, 6, 6'), tx('5, 6, 8')],
    props: [p('bütün değerler eşit', 'C'), p('açıklığı 8', 'B'), p('açıklığı 4', 'A'), p('ortalaması 6’dan büyük', 'D'), p('ortalaması 6', 'ABC'), p('6 değerini içeriyor', 'ABCD'), p('değerlerin hepsi çift', 'ABC')],
  },

  // ───────── 7. sınıf ─────────
  {
    id: 'g7-int', g: [7], title: 'Tam sayılar',
    cards: [tx('−8'), tx('5'), tx('−3'), tx('0')],
    props: [p('pozitif', 'B'), p('ne pozitif ne negatif', 'D'), p('mutlak değeri en büyük', 'A'), p('−5 ile 0 arasında', 'C'), p('negatif', 'AC'), p('tek sayı', 'BC'), p('0’dan küçük ya da 0’a eşit', 'ACD')],
  },
  {
    id: 'g7-rat', g: [7], title: 'Rasyonel sayılar',
    cards: [tx('[[3/4]]'), tx('0,75'), tx('[[6/8]]'), tx('0,7')],
    props: [p('en sade kesir', 'A'), p('virgülden sonra iki basamak var', 'B'), p('sadeleşebilir', 'C'), p('[[7/10]]’a eşit', 'D'), p('[[3/4]]’e eşit', 'ABC'), p('ondalık gösterim', 'BD')],
  },
  {
    id: 'g7-tables', g: [7, 8], title: 'Tablolar',
    cards: [
      { t: 'table', head: ['x', 'y'], rows: [['1', '3'], ['2', '6'], ['4', '12']] },
      { t: 'table', head: ['x', 'y'], rows: [['1', '4'], ['2', '8'], ['3', '12']] },
      { t: 'table', head: ['x', 'y'], rows: [['2', '6'], ['3', '9'], ['5', '16']] },
      { t: 'table', head: ['x', 'y'], rows: [['1', '12'], ['2', '6'], ['3', '4']] },
    ],
    props: [p('ters orantılı', 'D'), p('orantılı değil', 'C', 'orantılı'), p('y = 3x', 'A'), p('y, x’in 4 katı', 'B'), p('doğru orantılı', 'AB'), p('x artınca y artıyor', 'ABC'), p('y değerlerinden biri 12', 'ABD', 'y değerlerinde 12 yok')],
  },
  {
    id: 'g7-eq', g: [7, 8], title: 'Denklemler',
    cards: [tx('x + 5 = 12'), tx('2x = 14'), tx('3x − 1 = 20'), tx('x − 7 = 0')],
    props: [p('iki adımda çözülür', 'C'), p('tek adımda bölerek çözülür', 'B'), p('sağ tarafı 0', 'D'), p('x’e bir sayı eklenmiş', 'A'), p('çözümü 7', 'ABCD'), p('x’in katsayısı 1', 'AD')],
  },
  {
    id: 'g7-cubes', g: [7], title: 'Prizmalar',
    cards: [vis({ kind: 'cubes', heights: [[2, 2], [2, 2]] }), vis({ kind: 'cubes', heights: [[4, 4]] }), vis({ kind: 'cubes', heights: [[3, 3], [3, 3]] }), vis({ kind: 'cubes', heights: [[1, 1, 1, 1, 1, 1, 1, 1]] })],
    props: [p('küp', 'A'), p('yüzey alanı 28 br²', 'B'), p('hacmi 12 birim küp', 'C'), p('tek sıra küpten oluşuyor', 'D'), p('hacmi 8 birim küp', 'ABD'), p('en az bir boyutu 1 birim', 'BD'), p('yüksekliği 2 birimden fazla', 'BC')],
  },
  {
    id: 'g7-bags', g: [7], title: 'Torbalar',
    cards: [
      { t: 'pics', items: [...Array(3).fill({ s: 'circle', c: C.red }), { s: 'circle', c: C.blue }] },
      { t: 'pics', items: [...Array(2).fill({ s: 'circle', c: C.red }), ...Array(2).fill({ s: 'circle', c: C.blue })] },
      { t: 'pics', items: [...Array(6).fill({ s: 'circle', c: C.red }), ...Array(2).fill({ s: 'circle', c: C.blue })] },
      { t: 'pics', items: [{ s: 'circle', c: C.red }, ...Array(3).fill({ s: 'circle', c: C.blue })] },
    ],
    props: [p('kırmızı ve mavi eş olasılıklı', 'B'), p('mavi çekme olasılığı daha büyük', 'D'), p('8 bilye var', 'C'), p('tam 3 kırmızı bilye var', 'A'), p('kırmızı çekme olasılığı [[3/4]]', 'AC'), p('4 bilye var', 'ABD')],
  },

  // ───────── 8. sınıf ─────────
  {
    id: 'g8-real', g: [8], title: 'Gerçek sayılar',
    cards: [tx('√{16}'), tx('√{20}'), tx('2^{3}'), tx('0,333…')],
    props: [p('irrasyonel', 'B', 'rasyonel'), p('devirli ondalık gösterim', 'D'), p('üslü ifade', 'C'), p('kareköklü ama tam sayıya eşit', 'A'), p('rasyonel', 'ACD'), p('tam sayı', 'AC'), p('4 ile 5 arasında', 'B')],
  },
  {
    id: 'g8-lines', g: [8], title: 'Doğrular',
    cards: [
      vis({ kind: 'coords', range: 5, lines: [{ m: 2, b: 1, color: '#f97316' }] }, 'y = 2x + 1'),
      vis({ kind: 'coords', range: 5, lines: [{ m: 2, b: -3, color: '#3b82f6' }] }, 'y = 2x − 3'),
      vis({ kind: 'coords', range: 5, lines: [{ m: -1, b: 1, color: '#22c55e' }] }, 'y = −x + 1'),
      vis({ kind: 'coords', range: 5, lines: [{ m: 0, b: 3, color: '#a855f7' }] }, 'y = 3'),
    ],
    props: [p('azalan', 'C'), p('yatay (eğimi 0)', 'D'), p('y eksenini negatif bir noktada keser', 'B'), p('(−1, −1) noktasından geçer', 'A'), p('eğimi 2', 'AB'), p('y eksenini 1’de keser', 'AC'), p('(1, 3) noktasından geçer', 'AD')],
  },
  {
    id: 'g8-pow', g: [8], title: 'Üslü ifadeler',
    cards: [tx('2^{−3}'), tx('(−2)^{3}'), tx('−2^{3}'), tx('2^{3}')],
    props: [p('üssü negatif', 'A'), p('değeri 8', 'D'), p('taban parantez içinde negatif', 'B'), p('eksi işareti üsse dâhil değil', 'C'), p('tam sayı', 'BCD'), p('değeri −8', 'BC'), p('pozitif', 'AD')],
  },
  {
    id: 'g8-tri', g: [8], title: 'Üç kenar',
    cards: [tx('3, 4, 5', 'cm'), tx('5, 12, 13', 'cm'), tx('2, 3, 6', 'cm'), tx('4, 4, 4', 'cm')],
    props: [p('üçgen oluşturmaz', 'C', 'üçgen oluşturur'), p('eşkenar üçgen', 'D'), p('kenarları ardışık sayılar', 'A'), p('çevresi 30 cm', 'B'), p('dik üçgen', 'AB'), p('çevresi 12 cm', 'AD')],
  },
  {
    id: 'g8-trans', g: [8], title: 'Dönüşümler',
    cards: [tx('(2, 3) → (2, −3)'), tx('(2, 3) → (−2, 3)'), tx('(2, 3) → (5, 3)'), tx('(2, 3) → (2, 1)')],
    props: [p('x eksenine göre yansıma', 'A'), p('y eksenine göre yansıma', 'B'), p('sağa öteleme', 'C'), p('aşağı öteleme', 'D'), p('yansıma', 'AB'), p('öteleme', 'CD'), p('apsis değişmedi', 'AD'), p('ordinat değişmedi', 'BC')],
  },
  {
    id: 'g8-roots', g: [8], title: 'Karekökler',
    cards: [tx('√{49}'), tx('√{50}'), tx('√{[[1/4]]}'), tx('√{0,09}')],
    props: [p('irrasyonel', 'B', 'rasyonel'), p('tam sayıya eşit', 'A'), p('[[1/2]]’ye eşit', 'C'), p('0,3’e eşit', 'D'), p('1’den küçük', 'CD'), p('7’den büyük', 'B')],
  },
]

/** Bir kartı tek başına ayıran özellik + yön (olumlu/olumsuz) */
export interface Reason { prop: number; neg: boolean }

/** Kartlardan hangileri için bu ifade doğru? */
export function holdsFor(pr: Prop, neg: boolean): number[] {
  return [0, 1, 2, 3].filter((i) => (neg ? !pr.has.includes(i) : pr.has.includes(i)))
}

/** Her kart için tüm geçerli gerekçeler */
export function reasonsFor(set: HSet): Reason[][] {
  const out: Reason[][] = [[], [], [], []]
  set.props.forEach((pr, i) => {
    for (const neg of [false, true]) {
      const h = holdsFor(pr, neg)
      if (h.length === 1) out[h[0]].push({ prop: i, neg })
    }
  })
  return out
}

export function setsFor(grade: Grade): HSet[] {
  return SETS.filter((s) => s.g.includes(grade))
}
