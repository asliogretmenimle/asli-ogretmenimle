import type { Grade } from '../../../data/types'
import type { Kind, TypeId, V2 } from './lattice'

/** Mozaik Ustası görevleri — sınıfa göre yapı, temsil ve düşünme düzeyi değişir */

export interface Choice {
  label: string
  icon?: TypeId
}
export interface Follow {
  q: string
  choices: Choice[]
  answer: number
  /** Her yanlış seçenek için yanılgıyı düşündüren soru */
  wrong: (string | null)[]
  misconception?: (string | null)[]
}

export type Tally = 'none' | 'units' | 'hexfrac' | 'trapunit' | 'squares'

interface Base {
  title: string
  prompt: string
  hints: string[]
  picker?: string[]
}

export interface Given {
  type: TypeId
  turns: number
  anchor: V2
}

export type MMission =
  | (Base & { kind: 'fill'; lattice: Kind; frame: V2[]; tray: TypeId[]; goal: number; tally: Tally; estimate?: { q: string; choices: string[]; answer: number }; follow?: Follow })
  | (Base & { kind: 'mirror'; lattice: 'sq'; frame: V2[]; axis: { dir: 'v' | 'h'; at: number }; given: Given[]; tray: TypeId[] })
  | (Base & { kind: 'vertex'; lattice: 'tri'; tray: TypeId[]; goal: number; degrees: boolean })
  | (Base & { kind: 'lab'; mode: 'single' | 'mix'; polys: number[]; goal: number; follow?: Follow })
  | (Base & { kind: 'free'; lattice: Kind; tray: TypeId[]; minPieces: number; minLines: number })

const HEX: V2[] = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]
const RHOMBUS: V2[] = [[0, 0], [1, 0], [1, 1], [0, 1]]
const TRAP: V2[] = [[0, 0], [2, 0], [1, 1], [0, 1]]
const BIGTRI: V2[] = [[0, 0], [3, 0], [0, 3]]
const BOAT: V2[] = [[0, 0], [4, 0], [2, 2], [0, 2]]
const BLOCKS: TypeId[] = ['hex', 'trap', 'rhom', 'tri']

/** Dikey eksenli simetri deseni (sol yarı verilir) */
const MIRROR_V: Given[] = [
  { type: 'sq', turns: 0, anchor: [0, 0] },
  { type: 'rect', turns: 0, anchor: [1, 0] },
  { type: 'rt', turns: 0, anchor: [0, 1] },
  { type: 'rt', turns: 2, anchor: [1, 2] },
  { type: 'sq', turns: 0, anchor: [1, 1] },
  { type: 'rt', turns: 0, anchor: [2, 1] },
  { type: 'rt', turns: 2, anchor: [3, 2] },
  { type: 'rect', turns: 1, anchor: [1, 2] },
  { type: 'sq', turns: 0, anchor: [1, 2] },
  { type: 'rt', turns: 1, anchor: [3, 2] },
  { type: 'rt', turns: 3, anchor: [2, 3] },
  { type: 'sq', turns: 0, anchor: [1, 3] },
  { type: 'sq', turns: 0, anchor: [2, 3] },
]

/** Yatay eksenli simetri deseni (üst yarı verilir) */
const MIRROR_H: Given[] = [
  { type: 'rect', turns: 0, anchor: [0, 5] },
  { type: 'rt', turns: 0, anchor: [2, 5] },
  { type: 'rt', turns: 2, anchor: [3, 6] },
  { type: 'sq', turns: 0, anchor: [3, 5] },
  { type: 'sq', turns: 0, anchor: [0, 4] },
  { type: 'rt', turns: 1, anchor: [2, 4] },
  { type: 'rt', turns: 3, anchor: [1, 5] },
  { type: 'sq', turns: 0, anchor: [2, 4] },
  { type: 'rect', turns: 1, anchor: [4, 3] },
  { type: 'rt', turns: 0, anchor: [0, 3] },
  { type: 'rt', turns: 2, anchor: [1, 4] },
  { type: 'rect', turns: 0, anchor: [1, 3] },
]

const hexPicker = ['Büyük parçalarla başladım', 'Küçük parçalara ayırdım', 'Bir parçayı ikiye bölerek değiştirdim']

function g2(): MMission[] {
  return [
    {
      kind: 'fill', title: 'İki üçgen', lattice: 'tri', frame: RHOMBUS, tray: ['tri'], goal: 1, tally: 'none',
      prompt: 'Çerçeveyi yeşil üçgenlerle boşluk kalmadan doldur. Üçgeni sürükle; döndürmek için iki parmak kullan ya da seçip ⟳ düğmesine dokun.',
      hints: ['Üçgenin bir köşesi çerçevenin sivri köşesine uyuyor mu?', 'İkinci üçgeni ters çevirmen gerekebilir: ⟳ düğmesine dokun.'],
      follow: { q: 'İki üçgen birleşince hangi parçanın aynısı oldu?', choices: [{ label: 'Mavi parça', icon: 'rhom' }, { label: 'Kırmızı parça', icon: 'trap' }, { label: 'Sarı parça', icon: 'hex' }], answer: 0, wrong: [null, 'Kırmızı parçayı kaç üçgen yapar? Çerçevendeki üçgenleri say.', 'Sarı parça çok daha büyük. Çerçevenin biçimine bak: dört kenarı var mı?'] },
    },
    {
      kind: 'fill', title: 'Kırmızı yamuk', lattice: 'tri', frame: TRAP, tray: ['rhom', 'tri'], goal: 2, tally: 'none',
      prompt: 'Bu kırmızı yamuk biçimli çerçeveyi mavi ve yeşil parçalarla doldur. İki farklı yol bul!',
      hints: ['Kaç tane üçgen sığar? Say ve dene.', 'Bir mavi parça iki üçgen kadardır. Mavi parçayla kaç üçgenlik yer kalır?'],
      picker: ['Önce üçgenlerle doldurdum', 'Mavi parçayla başladım', 'Deneyerek buldum'],
    },
    {
      kind: 'fill', title: 'Altıgen bahçe', lattice: 'tri', frame: HEX, tray: ['trap', 'rhom', 'tri'], goal: 3, tally: 'none',
      prompt: 'Sarı altıgeni farklı parçalarla doldur. Üç farklı yol bulabilir misin?',
      hints: ['İki kırmızı parça altıgeni doldurur mu?', 'Mavi parçaları ortadaki noktanın çevresine diz.', 'Karışık da olabilir: bir kırmızı, bir mavi, bir yeşil…'],
      picker: hexPicker,
    },
    {
      kind: 'fill', title: 'Kare karolar', lattice: 'sq', frame: [[0, 0], [3, 0], [3, 2], [0, 2]], tray: ['sq', 'rt'], goal: 2, tally: 'none',
      prompt: 'Banyo duvarını karolarla kapla! Turuncu kareleri ve mavi üçgenleri kullan. İki farklı yol bul.',
      hints: ['Kaç kare sığar? Önce kareleri diz.', 'İki mavi üçgen birleşince ne olur?'],
      picker: ['Önce kareleri dizdim', 'Üçgenleri ikişer birleştirdim', 'Deneyerek buldum'],
    },
    {
      kind: 'free', title: 'Kendi desenin', lattice: 'tri', tray: BLOCKS, minPieces: 5, minLines: 1,
      prompt: 'Şimdi sanatçı sensin! En az 5 parçayla simetrik bir desen yap. Simetri doğruları kendiliğinden belirecek.',
      hints: ['Ortaya bir sarı altıgen koy, çevresine aynı parçalardan diz.', 'Bir parçanın tam karşısına aynısını koy.'],
    },
  ]
}

function g3(): MMission[] {
  return [
    {
      kind: 'fill', title: 'Altıgeni doldur', lattice: 'tri', frame: HEX, tray: ['trap', 'rhom', 'tri'], goal: 3, tally: 'units',
      prompt: 'Altıgeni üç farklı yolla doldur. Her seferinde kaç üçgenlik yer kapladığına bak!',
      hints: ['Kırmızı parça kaç üçgen eder? Üçgenleri üstüne koyarak dene.', 'İki kırmızı parça, üç mavi parça ya da karışık…'],
      picker: hexPicker,
    },
    {
      kind: 'mirror', title: 'Ayna mozaik', lattice: 'sq', frame: [[0, 0], [6, 0], [6, 4], [0, 4]], axis: { dir: 'v', at: 3 }, given: MIRROR_V, tray: ['sq', 'rt', 'rect'],
      prompt: 'Mozaiğin sol yarısı hazır. Kesikli çizgi bir ayna! Sağ yarıyı, sol yarının aynadaki görüntüsü olacak biçimde doldur.',
      hints: ['Çizgiye en yakın parçadan başla: aynadaki eşi de çizgiye aynı uzaklıkta olmalı.', 'Mavi üçgenlerin yönüne dikkat: aynada yatık kenar ters yöne bakar.'],
      picker: ['Çizgiye yakın olandan başladım', 'Satır satır yansıttım', 'Kareleri sayarak yerleştirdim'],
    },
    {
      kind: 'fill', title: 'Kayık ne kadar büyük?', lattice: 'tri', frame: BOAT, tray: ['hex', 'trap', 'rhom', 'tri'], goal: 2, tally: 'units',
      estimate: { q: 'Önce tahmin et: bu kayığın içine kaç yeşil üçgen sığar?', choices: ['8', '10', '12', '14'], answer: 2 },
      prompt: 'Kayık biçimli çerçeveyi istediğin parçalarla doldur. Tahminin doğru muydu? Sonra başka parçalarla bir kez daha doldur.',
      hints: ['Her parça kaç üçgen eder? Sarı 6, kırmızı 3, mavi 2.', 'Büyük parçalarla başlamak işini kolaylaştırabilir.'],
      picker: ['Büyük parçalarla başladım', 'Üçgen sayısını hesapladım', 'Deneyerek doldurdum'],
    },
    {
      kind: 'vertex', title: 'Köşe buluşması', lattice: 'tri', tray: BLOCKS, goal: 2, degrees: false,
      prompt: 'Ortadaki çivinin çevresini boşluk kalmadan kapla: parçaların köşeleri çivide buluşsun. İki farklı yol bul!',
      hints: ['Bir yeşil üçgenin köşesi çivinin çevresinin ne kadarını kaplıyor?', 'Altı üçgen köşesi çiviyi tam sarar. Daha geniş köşeli parçalar kaç üçgen köşesi eder?'],
      picker: ['Aynı parçaları çevreye dizdim', 'Geniş ve dar köşeleri birleştirdim', 'Deneyerek buldum'],
    },
    {
      kind: 'free', title: 'Kendi desenin', lattice: 'tri', tray: BLOCKS, minPieces: 6, minLines: 1,
      prompt: 'En az 6 parçayla kendi mozaiğini tasarla. Simetri doğrularını bul: desenin kaç simetri doğrusu var?',
      hints: ['Bir parçanın tam karşısına aynısını koy.', 'Ortaya altıgen koyup çevresini aynı parçalarla sarmayı dene.'],
    },
  ]
}

function g4(): MMission[] {
  return [
    {
      kind: 'fill', title: 'Dev üçgen', lattice: 'tri', frame: BIGTRI, tray: ['hex', 'trap', 'rhom', 'tri'], goal: 2, tally: 'units',
      prompt: 'Dev üçgeni iki farklı yolla doldur. Panelde her parçanın kaç üçgen ettiğini izle.',
      hints: ['Sarı altıgen dev üçgenin ortasına sığar mı?', 'Köşelere hangi parça sığar?'],
      follow: { q: 'Bu dev üçgeni yalnızca mavi parçalarla doldurabilir miydin?', choices: [{ label: 'Evet, dokuz mavi parçayla' }, { label: 'Hayır, çünkü 9 üçgenlik yer var; mavi parça 2 üçgen eder ve 9 ikiye tam bölünmez' }, { label: 'Evet, çünkü mavi parça her yere sığar' }], answer: 1, wrong: ['Bir mavi parça kaç üçgen eder? Dokuz mavi parça kaç üçgen eder?', null, 'Mavi parça 2 üçgen kadar. 9 üçgeni ikişer ikişer ayırabilir misin?'] },
      picker: ['Büyük parçalarla başladım', 'Üçgen sayısını hesapladım', 'Deneyerek doldurdum'],
    },
    {
      kind: 'mirror', title: 'Göl yansıması', lattice: 'sq', frame: [[0, 0], [4, 0], [4, 6], [0, 6]], axis: { dir: 'h', at: -3 }, given: MIRROR_H, tray: ['sq', 'rt', 'rect'],
      prompt: 'Göl yüzeyi bir ayna! Üst yarıdaki mozaiğin suya düşen yansımasını alt yarıya yap.',
      hints: ['Çizgiye en yakın sıradan başla.', 'Yansımada üstteki sıra en alta gelir.', 'Üçgenlerin yatık kenarı aynada ters yöne döner.'],
      picker: ['Çizgiye yakın olandan başladım', 'Satır satır yansıttım', 'Kareleri sayarak yerleştirdim'],
    },
    {
      kind: 'vertex', title: 'Köşe buluşması', lattice: 'tri', tray: BLOCKS, goal: 3, degrees: false,
      prompt: 'Çivinin çevresini boşluksuz kapla. Üç farklı yol bul! Bir tam dönüş kaç üçgen köşesi eder?',
      hints: ['Altı üçgen köşesi çiviyi tam sarar.', 'Sarı altıgenin köşesi kaç üçgen köşesine eşit?'],
      picker: ['Aynı parçaları çevreye dizdim', 'Geniş ve dar köşeleri birleştirdim', 'Deneyerek buldum'],
    },
    {
      kind: 'fill', title: 'Karo ustası', lattice: 'sq', frame: [[0, 0], [4, 0], [4, 3], [0, 3]], tray: ['sq', 'rt', 'rect'], goal: 2, tally: 'squares',
      prompt: 'Duvarı karolarla kapla; iki farklı yol bul. Panelde alanı kare cinsinden izle.',
      hints: ['Bir dikdörtgen kaç kare eder?', 'İki mavi üçgen bir kare eder.'],
      follow: { q: 'Bu duvarın alanı kaç kare?', choices: [{ label: '7 kare' }, { label: '12 kare' }, { label: '14 kare' }, { label: '24 kare' }], answer: 1, wrong: ['7, kenarların toplamı (4 + 3). Alan içindeki kare sayısıdır.', null, '14, duvarın çevresi. Alan içindeki kare sayısıdır.', '24 küçük üçgen olabilir mi? İki üçgen bir kare eder.'], misconception: ['Alan ile kenar uzunluklarını karıştırıyor', null, 'Alan ile çevreyi karıştırıyor', null] },
    },
    {
      kind: 'free', title: 'Kendi desenin', lattice: 'tri', tray: BLOCKS, minPieces: 6, minLines: 1,
      prompt: 'En az 6 parçayla simetrik bir desen tasarla. İki ya da daha fazla simetri doğrusu olan bir desen yapabilir misin?',
      hints: ['Ortaya altıgen koyup çevresini aynı parçalarla sar.', 'Her parçanın karşısına aynısını koy.'],
    },
  ]
}

function g56(g: 5 | 6): MMission[] {
  const six = g === 6
  return [
    six
      ? {
          kind: 'fill', title: 'İki altıgenlik kayık', lattice: 'tri', frame: BOAT, tray: ['hex', 'trap', 'rhom', 'tri'], goal: 2, tally: 'hexfrac',
          prompt: 'Sarı altıgen 1 bütün olsun. Kayığı iki farklı yolla doldur; panelde her parçanın kesir değerini topla.',
          hints: ['Kırmızı yamuk altıgenin yarısı.', 'Mavi parça altıgenin kaçta kaçı? Kaç tanesi altıgeni doldurur?'],
          follow: { q: 'Kayığın alanı kaç altıgen?', choices: [{ label: '[[1 1/2]] altıgen' }, { label: '2 altıgen' }, { label: '[[2 1/2]] altıgen' }, { label: '12 altıgen' }], answer: 1, wrong: ['Panelde topladığın kesirlere bak: [[1/2]]’ler ve [[1/3]]’ler kaç bütün ediyor?', null, 'Yamukları ikişer ikişer eşleştir: kaç altıgen eder?', '12, kayığın kaç üçgen ettiği. Altıgen cinsinden kaç?'] },
          picker: ['Kesirleri topladım', 'Parçaları altıgene tamamladım', 'Üçgenleri sayıp 6’ya böldüm'],
        }
      : {
          kind: 'fill', title: 'Altıgenin kesirleri', lattice: 'tri', frame: HEX, tray: ['trap', 'rhom', 'tri'], goal: 3, tally: 'hexfrac',
          prompt: 'Altıgen 1 bütün. Onu üç farklı yolla doldur; her yolda parçaların kesirlerinin toplamı neden 1 ediyor?',
          hints: ['Kaç kırmızı yamuk altıgeni doldurur? O hâlde bir yamuk altıgenin kaçta kaçı?', 'Mavi parça altıgenin [[1/3]]’ü, yeşil üçgen [[1/6]]’sı.'],
          picker: ['Eş parçalarla doldurdum', 'Farklı kesirleri karıştırdım', 'Kesirleri toplayarak kontrol ettim'],
        },
    six
      ? {
          kind: 'fill', title: 'Birim değişirse', lattice: 'tri', frame: HEX, tray: ['trap', 'rhom', 'tri'], goal: 1, tally: 'trapunit',
          prompt: 'Bu kez kırmızı yamuk 1 birim! Altıgeni istediğin parçalarla doldur ve panelde değerleri izle.',
          hints: ['Altıgeni kaç yamuk doldurur?', 'Üç üçgen bir yamuk eder.'],
          follow: { q: 'Yamuk 1 birimse yeşil üçgen kaç birimdir?', choices: [{ label: '[[1/3]]' }, { label: '3' }, { label: '[[1/2]]' }, { label: '[[1/6]]' }], answer: 0, wrong: [null, 'Üç üçgen bir yamuğu doldurur. Üçgen yamuktan büyük mü küçük mü?', '[[1/2]] yamuk kaç üçgen eder? Üçgenle karşılaştır.', '[[1/6]], altıgen 1 bütün olduğunda doğruydu. Şimdi bütün yamuk!'], misconception: [null, 'Birim kesri ters çeviriyor', null, 'Bütünü değiştiğinde kesrin değiştiğini fark etmiyor'] },
        }
      : {
          kind: 'fill', title: 'Kayık kaç altıgen?', lattice: 'tri', frame: BOAT, tray: ['hex', 'trap', 'rhom', 'tri'], goal: 1, tally: 'hexfrac',
          prompt: 'Altıgen 1 bütün. Kayığı doldur ve alanını altıgen cinsinden bul.',
          hints: ['Panelde kesirleri topla.', 'İki yamuk bir altıgen eder.'],
          follow: { q: 'Kayığın alanı kaç altıgen?', choices: [{ label: '[[1 1/2]] altıgen' }, { label: '2 altıgen' }, { label: '[[2 1/2]] altıgen' }, { label: '12 altıgen' }], answer: 1, wrong: ['Panelde topladığın kesirlere bak: kaç bütün ediyor?', null, 'Yamukları ikişer ikişer eşleştir: kaç altıgen eder?', '12, kayığın kaç üçgen ettiği. Altıgen cinsinden kaç?'] },
          picker: ['Kesirleri topladım', 'Parçaları altıgene tamamladım', 'Üçgenleri sayıp 6’ya böldüm'],
        },
    {
      kind: 'vertex', title: 'Köşede 360°', lattice: 'tri', tray: BLOCKS, goal: 3, degrees: true,
      prompt: 'Çivinin çevresini boşluksuz kapla. Köşedeki açılar panelde toplanıyor. Üç farklı açı karışımı bul!',
      hints: ['Üçgenin her açısı 60°. Altıgenin bir açısı kaç derece?', 'Toplam 360° olmalı: bir tam dönüş.'],
      picker: ['Açıları toplayarak seçtim', 'Eş açıları çevreye dizdim', 'Deneyerek buldum'],
    },
    six
      ? {
          kind: 'lab', title: 'Karışık köşeler', mode: 'mix', polys: [3, 4, 6, 8, 12], goal: 3,
          prompt: 'Farklı düzgün çokgenleri bir köşede buluştur. Açıları toplamı tam 360° olan üç farklı karışım bul!',
          hints: ['Sekizgenin bir açısı 135°. İki sekizgen kaç derece eder; kalan boşluğa hangisi sığar?', 'İki altıgen 240° eder. Kalan 120°’yi nasıl doldurursun?'],
          picker: ['Kalan açıyı hesapladım', 'Deneyerek ekledim', 'Bildiğim açılardan başladım'],
        }
      : {
          kind: 'lab', title: 'Hangisi kaplar?', mode: 'single', polys: [3, 4, 5, 6, 8], goal: 5,
          prompt: 'Her düzgün çokgeni tek başına dene: bir köşenin çevresine kopyalarını ekle. Hangileri boşluksuz kaplıyor?',
          hints: ['Beşgenin açısı 108°. Üç beşgen kaç derece eder?', 'Boşluk kalmaması için açılar tam 360° etmeli.'],
          follow: { q: 'Hangi düzgün çokgenler zemini tek başına kaplar? Neden?', choices: [{ label: 'Bir iç açısı 360°’nin tam böleni olanlar' }, { label: 'Kenar sayısı çift olanlar' }, { label: 'Köşe sayısı az olanlar' }], answer: 0, wrong: [null, 'Sekizgenin de kenar sayısı çift. Sekizgenler bir köşede boşluksuz buluşabildi mi?', 'Beşgenin köşesi altıgenden az. Beşgen kapladı mı?'], misconception: [null, 'Kenar sayısı çift olan çokgenlerin kaplayacağını düşünüyor', null] },
          picker: ['Açıları toplayarak denedim', '360’ı açıya böldüm', 'Deneyerek gördüm'],
        },
    {
      kind: 'free', title: 'Desen tasarımcısı', lattice: 'tri', tray: BLOCKS, minPieces: 8, minLines: 2,
      prompt: 'En az 8 parçayla en az iki simetri doğrusu olan bir desen tasarla. Dönme simetrisi de var mı?',
      hints: ['Altıgenin her kenarına aynı parçayı ekle.', 'Desenini çivinin çevresinde 60° döndürünce aynı görünüyor mu?'],
    },
  ]
}

export function missionsFor(g: Grade): MMission[] {
  return g <= 2 ? g2() : g === 3 ? g3() : g === 4 ? g4() : g56(g >= 6 ? 6 : 5)
}

export const insightFor = (g: Grade) =>
  g <= 2
    ? 'Küçük şekiller birleşerek büyük şekilleri oluşturur: iki üçgen bir eşkenar dörtgen, üç üçgen bir yamuk eder.'
    : g <= 4
      ? 'Bir yüzeyin büyüklüğünü birim parçalarla sayabiliriz; parçalar değişse de alan değişmez. Bir noktanın çevresi tam bir dönüştür ve parçaların köşeleri onu boşluksuz doldurmalıdır.'
      : g === 5
        ? 'Altıgen 1 bütünse yamuk [[1/2]], eşkenar dörtgen [[1/3]], üçgen [[1/6]]’dır. Bir köşedeki açılar toplamı 360° olunca çokgenler boşluksuz kaplar; bu yüzden yalnız üçgen, kare ve altıgen tek başına kaplar.'
        : 'Kesrin değeri bütüne bağlıdır: yamuk 1 birimse üçgen [[1/3]] olur. Farklı düzgün çokgenlerin açıları toplamı 360° olduğunda bir köşede boşluksuz buluşurlar.'
