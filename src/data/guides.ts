import type { Grade, ManipulativeTool } from './types'
import type { GameId } from '../games/meta'

/**
 * Konu rehberleri (/rehber/:slug): Google'da soru olarak aranan konuların kısa, örnekli anlatımı.
 * Her rehber ilgili etkinliklere (outcomes), araçlara, oyunlara ve keşiflere bağlanır; böylece okuyan
 * öğrenci cevabı öğrendikten sonra konuyu sitede uygulayarak sürdürür.
 * Metinler düz yazıdır (MathText gösterimi yok); üs ve kökler için ², ³, √ karakterleri kullanılır.
 */
export interface GuideSection {
  h: string
  p: string[]
  list?: string[]
}

export interface Guide {
  slug: string
  /** H1: arandığı biçimde, çoğunlukla soru */
  title: string
  /** <title> (marka eklenmeden, ~55 karakter) */
  seoTitle: string
  description: string
  grades: Grade[]
  /** Bağlı öğrenme çıktıları: bu çıktıların etkinlikleri rehberde, rehber de o etkinliklerde listelenir */
  outcomes: string[]
  /** Kısa cevap: sayfanın ilk paragrafı */
  intro: string
  sections: GuideSection[]
  faq: { q: string; a: string }[]
  tools?: ManipulativeTool[]
  games?: GameId[]
  interactions?: string[]
}

export const guides: Guide[] = [
  {
    slug: 'rasyonel-sayilar',
    title: 'Rasyonel Sayı Nedir? −2, 0, √2 ve π Rasyonel mi?',
    seoTitle: 'Rasyonel Sayı Nedir? −2, 0, √2 ve π Rasyonel mi?',
    description: 'Rasyonel sayı nedir, nasıl anlaşılır? −1, −2, −3, 0, 0,333…, √2 ve π rasyonel mi? Örneklerle açıklama ve interaktif 7–8. sınıf etkinlikleri.',
    grades: [7, 8],
    outcomes: ['MAT.7.1.1', 'MAT.7.1.2', 'MAT.8.1.3', 'MAT.8.1.4'],
    intro: 'a ve b tam sayı, b ≠ 0 olmak üzere a/b biçiminde yazılabilen her sayı rasyonel sayıdır. Bu yüzden −2, −3, 0, 5, 3/4 ve 0,333… rasyoneldir; √2 ve π ise kesir olarak yazılamadığı için irrasyoneldir.',
    sections: [
      {
        h: 'Bir sayının rasyonel olup olmadığı nasıl anlaşılır?',
        p: [
          'Kendine şu soruyu sor: “Bu sayıyı payı ve paydası tam sayı olan bir kesir olarak yazabilir miyim?” Cevap evetse sayı rasyoneldir. Payda hiçbir zaman 0 olamaz.',
          'Ondalık gösterime bakmak da işe yarar: Ondalık kısmı biten (0,25 gibi) ya da belli bir düzenle sonsuza kadar tekrar eden (0,333… veya 0,1818… gibi) sayılar rasyoneldir. Ondalık kısmı hiç tekrar etmeden sonsuza kadar devam eden sayılar irrasyoneldir.',
        ],
      },
      {
        h: '−1, −2 ve −3 rasyonel mi?',
        p: [
          'Evet. Her tam sayı paydası 1 olan bir kesir olarak yazılabilir: −1 = −1/1, −2 = −2/1, −3 = −3/1. Aynı sayıyı −4/2 ya da −6/3 diye de yazabiliriz. Negatif olmak rasyonelliği değiştirmez; bütün negatif tam sayılar rasyoneldir.',
        ],
        list: ['−2 = −2/1 = −4/2 → rasyonel', '−3 = −3/1 = −9/3 → rasyonel', '−1,5 = −3/2 → rasyonel'],
      },
      {
        h: 'Sıfır (0) rasyonel sayı mı?',
        p: [
          'Evet. 0 = 0/1 = 0/5 olarak yazılabilir; pay 0 olabilir, sorun paydanın 0 olmasıdır. Yani 0 bir rasyonel sayıdır, ama 5/0 gibi paydası 0 olan bir ifade tanımsızdır.',
        ],
      },
      {
        h: '√2, √3 ve π neden irrasyonel?',
        p: [
          '√2 = 1,41421356… biçiminde hiç tekrar etmeden devam eder ve hiçbir kesre eşit değildir. Tam kare olmayan doğal sayıların karekökleri (√2, √3, √5, √8…) irrasyoneldir. Buna karşılık √4 = 2, √9 = 3 ve √(1/4) = 1/2 rasyoneldir.',
          'π = 3,14159265… da irrasyoneldir. Okulda kullandığımız 3,14 ya da 22/7 yalnızca π’ye yakın değerlerdir; π’nin kendisi değildir.',
        ],
        list: ['√16 = 4 → rasyonel', '√12 = 2√3 → irrasyonel', '0,121212… = 12/99 → rasyonel', '0,1010010001… → irrasyonel'],
      },
      {
        h: 'Sayı kümeleri arasındaki ilişki',
        p: [
          'Doğal sayılar (0, 1, 2, …) tam sayıların; tam sayılar (…, −2, −1, 0, 1, 2, …) rasyonel sayıların içindedir. Rasyonel ve irrasyonel sayılar birlikte gerçek sayıları oluşturur. Bir sayı aynı anda hem rasyonel hem irrasyonel olamaz.',
        ],
      },
    ],
    faq: [
      { q: '−2 rasyonel sayı mıdır?', a: 'Evet. −2 = −2/1 biçiminde, payı ve paydası tam sayı olan bir kesir olarak yazılabildiği için rasyoneldir.' },
      { q: 'Sıfır rasyonel sayı mıdır?', a: 'Evet. 0 = 0/1 olarak yazılabilir. Paydası 0 olan ifadeler tanımsızdır ama payın 0 olması sorun değildir.' },
      { q: 'Kök 2 rasyonel mi, irrasyonel mi?', a: '√2 irrasyoneldir. Ondalık açılımı 1,41421… diye tekrar etmeden sürer ve hiçbir kesre eşit değildir.' },
      { q: 'Pi sayısı rasyonel mi?', a: 'Hayır, π irrasyoneldir. 22/7 ve 3,14, π’ye yaklaşık değerlerdir.' },
      { q: 'Devirli ondalık sayılar rasyonel mi?', a: 'Evet. 0,333… = 1/3 ve 0,1818… = 2/11 gibi devirli ondalık sayıların hepsi bir kesre eşittir, bu yüzden rasyoneldir.' },
    ],
    tools: ['numberline', 'kesirdogrusu'],
    games: ['kok-dukkani', 'tahmin'],
    interactions: ['her-zaman-mi', 'karsi-ornek'],
  },
  {
    slug: 'kesir-nedir',
    title: 'Kesir Nedir? Pay, Payda ve Kesir Çeşitleri',
    seoTitle: 'Kesir Nedir? Pay, Payda ve Kesir Çeşitleri',
    description: 'Kesir nedir, pay ve payda ne anlatır? Birim kesir, basit, bileşik ve tam sayılı kesir örneklerle. 3–5. sınıf için interaktif kesir etkinlikleri ve oyunları.',
    grades: [3, 4, 5],
    outcomes: ['MAT.2.1.7', 'MAT.3.1.9', 'MAT.3.1.10', 'MAT.3.1.11', 'MAT.4.1.6', 'MAT.5.1.3'],
    intro: 'Kesir, bir bütünün eş parçalarından kaç tanesinin alındığını gösteren sayıdır. 3/4 kesrinde payda (4) bütünün kaç eş parçaya bölündüğünü, pay (3) bu parçalardan kaç tanesinin alındığını söyler.',
    sections: [
      {
        h: 'Pay ve payda',
        p: [
          'Kesir çizgisinin altındaki sayı paydadır ve parçaların büyüklüğünü belirler: payda büyüdükçe her parça küçülür. Üstteki sayı paydır ve kaç parça aldığımızı sayar.',
          'Parçaların eş olması çok önemlidir. Bir pizzayı biri büyük, biri küçük iki parçaya bölersek her parça “yarım” olmaz.',
        ],
      },
      {
        h: 'Birim kesir',
        p: ['Payı 1 olan kesirlere birim kesir denir: 1/2, 1/3, 1/4, 1/10… Birim kesirlerde payda büyüdükçe kesir küçülür; bu yüzden 1/8, 1/4’ten küçüktür. Bu, çocukların en sık yanıldığı noktadır.'],
      },
      {
        h: 'Basit, bileşik ve tam sayılı kesir',
        p: ['Kesirleri payın paydaya göre durumuna göre üç gruba ayırırız:'],
        list: [
          'Basit kesir: pay paydadan küçüktür, değeri 1’den küçüktür (2/5, 3/4).',
          'Bileşik kesir: pay paydaya eşit ya da büyüktür, değeri 1 ya da 1’den büyüktür (5/5, 7/4).',
          'Tam sayılı kesir: bir tam sayı ve bir basit kesirden oluşur (1 3/4). 7/4 = 1 3/4 çünkü 4/4 bir bütün eder, geriye 3/4 kalır.',
        ],
      },
      {
        h: 'Kesirleri modellemenin üç yolu',
        p: ['Kesirleri anlamak için aynı kesri farklı modellerle görmek gerekir: alan modeli (pizza, dikdörtgen), uzunluk modeli (kesir şeritleri, sayı doğrusu) ve küme modeli (12 bilyenin 1/3’ü). Sitedeki kesir şeritleri ve kesir daireleriyle bu modelleri sürükleyerek deneyebilirsin.'],
      },
    ],
    faq: [
      { q: 'Pay ve payda nedir?', a: 'Payda bütünün kaç eş parçaya bölündüğünü, pay bu parçalardan kaç tanesinin alındığını gösterir. 3/4’te pay 3, payda 4’tür.' },
      { q: 'Birim kesir nedir?', a: 'Payı 1 olan kesirdir: 1/2, 1/3, 1/5 gibi. Paydası büyük olan birim kesir daha küçüktür.' },
      { q: 'Bileşik kesir tam sayılı kesre nasıl çevrilir?', a: 'Pay paydaya bölünür. Bölüm tam kısmı, kalan yeni payı verir; payda aynı kalır. 11/4 → 11 ÷ 4 = 2 kalan 3 → 2 3/4.' },
    ],
    tools: ['fractions', 'kesirdaireleri', 'kesirdogrusu'],
    games: ['pizza', 'kesir-takimadalari'],
    interactions: ['kesir-duvari', 'butunu-degistir', 'kesir-tahmincisi'],
  },
  {
    slug: 'denk-kesirler',
    title: 'Denk Kesir Nedir, Nasıl Bulunur?',
    seoTitle: 'Denk Kesir Nedir, Nasıl Bulunur? Örneklerle',
    description: 'Denk kesir nedir ve nasıl bulunur? Genişletme ve sadeleştirme, iki kesrin denk olup olmadığını anlama. Kesir duvarıyla interaktif denk kesirler etkinlikleri.',
    grades: [4, 5, 6],
    outcomes: ['MAT.4.1.7', 'MAT.5.1.3'],
    intro: 'Aynı miktarı gösteren kesirlere denk kesir denir. 1/2, 2/4, 3/6 ve 4/8 aynı uzunluktaki parçayı gösterir. Bir kesrin payını ve paydasını 0 olmayan aynı sayıyla çarparak ya da bölerek ona denk kesirler elde edilir.',
    sections: [
      {
        h: 'Genişletme: pay ve paydayı aynı sayıyla çarpmak',
        p: ['2/3 kesrinin payını ve paydasını 2 ile çarparsak 4/6, 3 ile çarparsak 6/9 elde ederiz. Model üzerinde her parçayı ikiye ya da üçe böldüğümüzü düşün: parçalar küçülür ama sayıları artar, toplam miktar değişmez.'],
        list: ['2/3 = 4/6 = 6/9 = 8/12', '3/5 = 6/10 = 9/15'],
      },
      {
        h: 'Sadeleştirme: pay ve paydayı aynı sayıya bölmek',
        p: ['12/18 kesrinde pay ve payda 6’ya bölünür: 12/18 = 2/3. Pay ve paydanın ortak böleni kalmayana kadar sadeleştirilen kesre en sade kesir denir.'],
      },
      {
        h: 'İki kesir denk mi? Nasıl kontrol edilir?',
        p: [
          'Birinci yol: ikisini de en sade hâline getir ve karşılaştır. İkinci yol: çapraz çarp. a/b ile c/d denk ise a × d = b × c olur. 3/4 ile 9/12 için 3 × 12 = 36 ve 4 × 9 = 36, yani denktir.',
          'Sık yapılan hata, paya ve paydaya aynı sayıyı EKLEMEKTİR. 1/2’nin pay ve paydasına 1 eklersek 2/3 olur; ama 2/3, 1/2’ye denk değildir.',
        ],
      },
    ],
    faq: [
      { q: '1/2’ye denk kesirler hangileridir?', a: '2/4, 3/6, 4/8, 5/10, 50/100… Payı paydasının yarısı olan bütün kesirler 1/2’ye denktir.' },
      { q: 'Denk kesir bulmak için toplama yapılır mı?', a: 'Hayır. Pay ve payda aynı sayıyla çarpılır ya da bölünür. Aynı sayıyı eklemek kesrin değerini değiştirir.' },
    ],
    tools: ['fractions', 'kesirdaireleri'],
    games: ['kesir-takimadalari', 'pizza'],
    interactions: ['kesir-duvari', 'kesir-yanilgilari'],
  },
  {
    slug: 'kesirleri-karsilastirma',
    title: 'Kesirler Nasıl Karşılaştırılır? 5 Kolay Strateji',
    seoTitle: 'Kesirler Nasıl Karşılaştırılır? 5 Kolay Strateji',
    description: 'Kesirleri karşılaştırma yolları: paydaları eşit, payları eşit, yarıma ve bire göre karşılaştırma, ortak payda. 4–5. sınıf örnekleri ve interaktif etkinlikler.',
    grades: [4, 5, 6],
    outcomes: ['MAT.4.1.8', 'MAT.4.1.9', 'MAT.5.1.4'],
    intro: 'Kesirleri karşılaştırmak için çoğu zaman ortak payda bulmak gerekmez. Paydalar eşitse payı büyük olan, paylar eşitse paydası küçük olan kesir daha büyüktür. Yarıma ya da bire uzaklık da hızlı bir karşılaştırma yoludur.',
    sections: [
      {
        h: '1. Paydaları eşit kesirler',
        p: ['Parçalar aynı büyüklükte olduğu için çok parça alan kazanır: 5/8 > 3/8.'],
      },
      {
        h: '2. Payları eşit kesirler',
        p: ['Aynı sayıda parça alındığında parçası büyük olan, yani paydası KÜÇÜK olan kesir büyüktür: 3/4 > 3/7. “8, 4’ten büyük; o hâlde 1/8 > 1/4” düşüncesi yaygın bir yanılgıdır.'],
      },
      {
        h: '3. Yarıma göre karşılaştırma',
        p: ['3/7 yarımdan biraz küçüktür (3,5/7 yarım olurdu), 5/9 ise yarımdan biraz büyüktür. O hâlde 5/9 > 3/7.'],
      },
      {
        h: '4. Bire uzaklık',
        p: ['7/8’in 1’e eksiği 1/8, 5/6’nın eksiği 1/6’dır. 1/8 daha küçük bir eksik olduğu için 7/8 bire daha yakındır, yani 7/8 > 5/6.'],
      },
      {
        h: '5. Ortak payda (ya da çapraz çarpım)',
        p: ['Diğer yollar işe yaramazsa kesirleri genişleterek paydaları eşitle: 2/3 = 8/12 ve 3/4 = 9/12, o hâlde 3/4 > 2/3. Kısaca çapraz çarpım: 2 × 4 = 8 < 3 × 3 = 9.'],
      },
    ],
    faq: [
      { q: '1/4 mü büyük, 1/8 mi?', a: '1/4 daha büyüktür. Bütünü 8 parçaya bölünce her parça, 4 parçaya bölmeye göre daha küçük olur.' },
      { q: 'Kesirleri karşılaştırmak için her zaman ortak payda gerekir mi?', a: 'Hayır. Paylar ya da paydalar eşitse, ya da kesirler yarıma veya bire göre kıyaslanabiliyorsa ortak payda gerekmez.' },
    ],
    tools: ['fractions', 'kesirdogrusu', 'kesirdaireleri'],
    games: ['pizza', 'tahmin'],
    interactions: ['kesirleri-karsilastir', 'kesir-tahmincisi', 'kesir-yanilgilari'],
  },
  {
    slug: 'buyuk-sayilarin-okunusu',
    title: 'Büyük Sayılar Nasıl Okunur ve Yazılır? Basamak ve Bölükler',
    seoTitle: 'Büyük Sayıların Okunuşu ve Yazılışı: Bölükler',
    description: '4. ve 5. sınıf büyük sayıların okunuşu ve yazılışı: basamak, basamak değeri ve bölükler (birler, binler, milyonlar, milyarlar). Örnekler ve interaktif etkinlikler.',
    grades: [4, 5],
    outcomes: ['MAT.4.1.1', 'MAT.4.1.2', 'MAT.5.1.1'],
    intro: 'Büyük sayılar sağdan sola üçerli gruplara, yani bölüklere ayrılarak okunur: birler, binler, milyonlar, milyarlar. Her bölük kendi içinde “yüzler-onlar-birler” gibi okunur ve sonuna bölüğün adı eklenir: 45 307 210 → kırk beş milyon üç yüz yedi bin iki yüz on.',
    sections: [
      {
        h: 'Basamak ve bölük',
        p: ['Bir sayıdaki her rakamın bulunduğu yere basamak denir: birler, onlar, yüzler, binler, on binler, yüz binler, milyonlar… Üç basamak bir bölük oluşturur.'],
        list: ['Birler bölüğü: birler, onlar, yüzler basamağı', 'Binler bölüğü: binler, on binler, yüz binler', 'Milyonlar bölüğü: milyonlar, on milyonlar, yüz milyonlar', 'Milyarlar bölüğü: milyarlar, on milyarlar, yüz milyarlar'],
      },
      {
        h: 'Adım adım okuma',
        p: [
          '1) Sayıyı sağdan başlayarak üçerli ayır: 2 040 500 600. 2) Soldaki bölükten başla: “iki milyar”, “kırk milyon”, “beş yüz bin”, “altı yüz”. 3) Hepsi sıfır olan bölüğün adı okunmaz.',
          'Sayıyı yazarken de tersini yaparız: okunuşu bölük bölük dinler, boş kalan basamaklara 0 yazarız. “Üç milyon yedi bin beş” → 3 007 005.',
        ],
      },
      {
        h: 'Basamak değeri ve sayı değeri',
        p: ['Bir rakamın sayı değeri rakamın kendisidir; basamak değeri ise bulunduğu basamağa göre aldığı değerdir. 4 582 sayısında 5’in sayı değeri 5, basamak değeri 500’dür. Sıfırın basamak değeri her zaman 0’dır.'],
      },
      {
        h: 'Sık yapılan hatalar',
        p: ['Ortadaki sıfırları unutmak (“iki milyon beş yüz” → 2 000 500 olmalıyken 2 500 yazmak) ve bölükleri soldan ayırmak en yaygın hatalardır. Bölükleri her zaman sağdan ayır.'],
      },
    ],
    faq: [
      { q: 'Bölük nedir?', a: 'Sağdan sola üçerli gruplanan basamaklardır. Birler, binler, milyonlar ve milyarlar bölüğü vardır; her bölükte üç basamak bulunur.' },
      { q: '1 000 000 nasıl okunur?', a: '“Bir milyon” diye okunur. Milyonlar bölüğünde 1, binler ve birler bölüklerinde 0 vardır.' },
      { q: '7 basamaklı en küçük sayı kaçtır?', a: '1 000 000 (bir milyon). 7 basamaklı en büyük sayı ise 9 999 999’dur.' },
    ],
    tools: ['sayikartlari', 'base10'],
    games: ['gizli-sayi', 'tahmin'],
    interactions: ['basamak-laboratuvari'],
  },
  {
    slug: 'asal-sayilar',
    title: 'Asal Sayı Nedir? 1 Asal mı, 2 Asal mı?',
    seoTitle: 'Asal Sayı Nedir? 1 Asal mı? 1–100 Asal Sayılar',
    description: 'Asal sayı nedir, nasıl bulunur? 1 neden asal değil, 2 neden tek çift asal sayı? 1–100 arası asal sayılar, asal çarpanlara ayırma ve Eratosthenes kalburu.',
    grades: [6, 8],
    outcomes: ['MAT.6.1.1', 'MAT.6.1.3'],
    intro: 'Asal sayı, 1’den büyük olan ve yalnızca 1’e ve kendisine bölünebilen doğal sayıdır. 2, 3, 5, 7, 11 ve 13 asal sayılardır. 1 asal değildir, çünkü yalnızca bir böleni vardır.',
    sections: [
      {
        h: '1 neden asal sayı değil?',
        p: ['Asal sayıların tam olarak iki farklı böleni vardır: 1 ve kendisi. 1’in tek böleni yine 1’dir. Ayrıca 1’i asal saysaydık her sayının asal çarpanlarına ayrılışı tek türlü olmazdı (6 = 2 × 3 = 1 × 2 × 3 = 1 × 1 × 2 × 3…). Bu yüzden 1 ne asal ne de bileşik sayıdır.'],
      },
      {
        h: '2 tek çift asal sayıdır',
        p: ['2’nin bölenleri 1 ve 2’dir; bu yüzden asaldır. 2’den büyük bütün çift sayılar 2’ye de bölündüğü için asal olamaz. 2 en küçük asal sayıdır.'],
      },
      {
        h: '1–100 arasındaki asal sayılar',
        p: ['1 ile 100 arasında 25 asal sayı vardır:'],
        list: ['2, 3, 5, 7, 11, 13, 17, 19, 23, 29', '31, 37, 41, 43, 47, 53, 59, 61, 67, 71', '73, 79, 83, 89, 97'],
      },
      {
        h: 'Bir sayının asal olup olmadığı nasıl anlaşılır?',
        p: ['Sayıyı, karekökünü geçmeyen asal sayılara bölmeyi dene. 91 için √91 ≈ 9,5; 2, 3, 5 ve 7’yi denemek yeter. 91 = 7 × 13 olduğu için 91 asal değildir. 97 için 2, 3, 5 ve 7’nin hiçbiri bölmez, o hâlde 97 asaldır. Eratosthenes kalburu bu fikri bütün sayılara aynı anda uygular.'],
      },
      {
        h: 'Asal çarpanlara ayırma',
        p: ['1’den büyük her bileşik sayı asal sayıların çarpımı olarak tek bir şekilde yazılabilir: 60 = 2 × 2 × 3 × 5 = 2² × 3 × 5. Çarpan ağacında hangi dallardan başlarsan başla, yapraklarda hep aynı asallara ulaşırsın.'],
      },
    ],
    faq: [
      { q: '1 asal sayı mıdır?', a: 'Hayır. Asal sayıların iki farklı böleni olmalıdır; 1’in yalnızca bir böleni vardır.' },
      { q: 'En küçük asal sayı kaçtır?', a: '2. Aynı zamanda tek çift asal sayıdır.' },
      { q: '0 asal sayı mı?', a: 'Hayır. 0 her sayma sayısına bölünür; asal sayılar 1’den büyük olmalıdır.' },
      { q: 'Aralarında asal ne demek?', a: '1’den başka ortak böleni olmayan sayılara aralarında asal denir. 8 ve 15 asal değildir ama aralarında asaldır.' },
    ],
    tools: ['kalbur', 'carpanagaci', 'dizilim'],
    games: ['asal-agaci', 'bolen-merdiveni', 'asal-bekci', 'carpan-fabrikasi'],
    interactions: ['carpan-kutulari', 'dikdortgen-alanlari'],
  },
  {
    slug: 'ebob-ekok',
    title: 'EBOB ve EKOK Nasıl Bulunur? Örnek Problemlerle',
    seoTitle: 'EBOB ve EKOK Nasıl Bulunur? Örnek Problemler',
    description: 'EBOB (en büyük ortak bölen) ve EKOK (en küçük ortak kat) nedir, nasıl bulunur? Bölen listesi, asal çarpanlar, bölme yöntemi ve hangi problemde hangisinin kullanılacağı.',
    grades: [6, 8],
    outcomes: ['MAT.6.1.4'],
    intro: 'EBOB, iki ya da daha fazla sayıyı aynı anda tam bölen en büyük sayıdır; EKOK ise bu sayıların hepsinin katı olan en küçük sayıdır. 12 ve 18 için EBOB 6, EKOK 36’dır.',
    sections: [
      {
        h: 'Liste yöntemi',
        p: ['12’nin bölenleri: 1, 2, 3, 4, 6, 12. 18’in bölenleri: 1, 2, 3, 6, 9, 18. Ortak olanların en büyüğü 6 → EBOB(12, 18) = 6.', '12’nin katları: 12, 24, 36, 48… 18’in katları: 18, 36, 54… Ortak olanların en küçüğü 36 → EKOK(12, 18) = 36.'],
      },
      {
        h: 'Asal çarpan yöntemi',
        p: ['12 = 2² × 3 ve 18 = 2 × 3². EBOB için ortak asalların küçük üslüleri alınır: 2 × 3 = 6. EKOK için bütün asalların büyük üslüleri alınır: 2² × 3² = 36.'],
      },
      {
        h: 'Hangi problemde EBOB, hangisinde EKOK?',
        p: ['Bir şeyi artık kalmadan EN BÜYÜK eş parçalara bölüyorsak (kurdele kesmek, tarlayı eş karelere ayırmak, meyveleri eş paketlere koymak) EBOB kullanırız. Olayların yeniden BİRLİKTE gerçekleşeceği ilk anı ya da en küçük ortak ölçüyü arıyorsak (otobüslerin birlikte kalkması, fayanslardan kare oluşturmak) EKOK kullanırız.'],
      },
      {
        h: 'Kullanışlı bir ilişki',
        p: ['İki sayı için EBOB × EKOK = sayıların çarpımı. 6 × 36 = 216 = 12 × 18. Aralarında asal iki sayının EBOB’u 1, EKOK’u çarpımlarıdır.'],
      },
    ],
    faq: [
      { q: 'EBOB ne demek?', a: 'En Büyük Ortak Bölen. Verilen sayıların hepsini kalansız bölen en büyük sayıdır.' },
      { q: 'EKOK ne demek?', a: 'En Küçük Ortak Kat. Verilen sayıların hepsinin katı olan en küçük pozitif sayıdır.' },
      { q: '8 ve 12’nin EBOB ve EKOK’u kaçtır?', a: 'EBOB(8, 12) = 4, EKOK(8, 12) = 24. Kontrol: 4 × 24 = 96 = 8 × 12.' },
    ],
    tools: ['carpanagaci', 'kalbur'],
    games: ['carpan-fabrikasi', 'asal-agaci', 'bolen-merdiveni'],
    interactions: ['ebob-tiyatrosu', 'ekok-tiyatrosu', 'ebob-simulasyonu', 'ekok-simulasyonu'],
  },
  {
    slug: 'bolunebilme-kurallari',
    title: 'Bölünebilme Kuralları: 2, 3, 4, 5, 6, 9 ve 10',
    seoTitle: 'Bölünebilme Kuralları (2, 3, 4, 5, 6, 9, 10)',
    description: '2, 3, 4, 5, 6, 9 ve 10 ile bölünebilme kuralları örneklerle. Rakamlar toplamı neden işe yarar? 5. ve 6. sınıf için interaktif bölünebilme etkinlikleri ve oyunları.',
    grades: [5, 6],
    outcomes: ['MAT.6.1.2'],
    intro: 'Bölünebilme kuralları bir sayının bölme işlemi yapmadan başka bir sayıya kalansız bölünüp bölünmediğini anlamamızı sağlar. Örneğin rakamları toplamı 3’ün katı olan sayılar 3’e, son rakamı 0 ya da 5 olan sayılar 5’e tam bölünür.',
    sections: [
      {
        h: 'Kurallar',
        p: ['Aşağıdaki kurallar en sık kullanılanlardır:'],
        list: [
          '2 ile: son rakam çift (0, 2, 4, 6, 8) → 3 568',
          '3 ile: rakamlar toplamı 3’ün katı → 4 512 (4 + 5 + 1 + 2 = 12)',
          '4 ile: son iki basamak 4’ün katı ya da 00 → 7 316 (16)',
          '5 ile: son rakam 0 ya da 5 → 2 735',
          '6 ile: hem 2’ye hem 3’e bölünür → 1 254',
          '9 ile: rakamlar toplamı 9’un katı → 6 273 (6 + 2 + 7 + 3 = 18)',
          '10 ile: son rakam 0 → 4 380',
        ],
      },
      {
        h: 'Rakamlar toplamı neden işe yarar?',
        p: ['10, 100, 1000 gibi sayılar 9’un katından 1 fazladır (10 = 9 + 1, 100 = 99 + 1). Bu yüzden 6 273 = 6 × 999 + 2 × 99 + 7 × 9 + (6 + 2 + 7 + 3) diye yazılabilir. İlk üç terim 9’a bölündüğü için sayının 9’a bölünmesi yalnızca rakamlar toplamına bağlıdır. Aynı fikir 3 için de geçerlidir.'],
      },
      {
        h: 'Kalanı bulmak',
        p: ['Kurallar kalanı da verir: 3 ve 9 için rakamlar toplamının kalanı, 5 ve 10 için son rakamın kalanı sayının kalanına eşittir. 517’nin rakamları toplamı 13’tür; 13’ün 9 ile bölümünden kalan 4 olduğu için 517’nin 9 ile bölümünden kalan da 4’tür.'],
      },
    ],
    faq: [
      { q: '9’a bölünen sayı 3’e bölünür mü?', a: 'Evet, her zaman. 9 = 3 × 3 olduğu için 9’un her katı 3’ün de katıdır. Tersi her zaman doğru değildir: 12, 3’e bölünür ama 9’a bölünmez.' },
      { q: '6 ile bölünebilme kuralı nedir?', a: 'Sayı hem 2’ye hem de 3’e bölünüyorsa 6’ya bölünür: son rakam çift ve rakamlar toplamı 3’ün katı olmalıdır.' },
    ],
    tools: ['yuzluk', 'kalbur'],
    games: ['balon', 'labirent', 'gizli-sayi'],
    interactions: ['her-zaman-mi', 'karsi-ornek'],
  },
  {
    slug: 'alan-ve-cevre',
    title: 'Alan ve Çevre Arasındaki Fark Nedir? Dikdörtgen ve Kare',
    seoTitle: 'Alan ve Çevre Farkı Nedir? Dikdörtgenin Alanı',
    description: 'Alan ile çevre arasındaki fark, dikdörtgen ve karenin alanı ve çevresi nasıl hesaplanır? Aynı alanlı farklı çevreli şekiller. 3–6. sınıf interaktif alan-çevre etkinlikleri.',
    grades: [3, 4, 5, 6],
    outcomes: ['MAT.3.3.4', 'MAT.4.3.3', 'MAT.4.3.4', 'MAT.5.4.1', 'MAT.5.4.2', 'MAT.5.4.3', 'MAT.5.4.4'],
    intro: 'Çevre, bir şeklin etrafının uzunluğudur ve cm, m gibi uzunluk birimleriyle ölçülür. Alan ise şeklin kapladığı yüzeyin büyüklüğüdür ve cm², m² gibi kare birimlerle ölçülür. 6 cm × 4 cm’lik dikdörtgenin çevresi 20 cm, alanı 24 cm²’dir.',
    sections: [
      {
        h: 'Dikdörtgen ve karede formüller',
        p: ['Formülleri ezberlemek yerine nereden geldiğini görmek önemlidir: çevre dört kenarın toplamı, alan ise içine sığan birim karelerin sayısıdır.'],
        list: ['Dikdörtgenin çevresi = 2 × (uzun kenar + kısa kenar)', 'Dikdörtgenin alanı = uzun kenar × kısa kenar', 'Karenin çevresi = 4 × kenar', 'Karenin alanı = kenar × kenar'],
      },
      {
        h: 'Alan aynıyken çevre değişebilir',
        p: ['24 birim kareyi farklı dikdörtgenler hâlinde dizelim. Hepsinin alanı 24’tür ama çevreleri çok farklıdır:'],
        list: ['1 × 24 → çevre 50', '2 × 12 → çevre 28', '3 × 8 → çevre 22', '4 × 6 → çevre 20'],
      },
      {
        h: 'Çevre aynıyken alan değişebilir',
        p: ['Çevresi 20 cm olan dikdörtgenler: 9 × 1 (alan 9), 7 × 3 (alan 21), 5 × 5 (alan 25). Kenarlar birbirine yaklaştıkça alan büyür; aynı çevreyle en büyük alanı kare verir.'],
      },
      {
        h: 'Sık yapılan hatalar',
        p: ['Alanı cm ile, çevreyi cm² ile yazmak; çevre bulurken yalnızca iki kenarı toplamak; “alanı büyük olanın çevresi de büyüktür” diye düşünmek en yaygın yanılgılardır.'],
      },
    ],
    faq: [
      { q: 'Alan ile çevre arasındaki fark nedir?', a: 'Çevre şeklin sınırının uzunluğudur (cm). Alan şeklin kapladığı yüzeydir (cm²).' },
      { q: 'Alanı 36 cm² olan karenin çevresi kaçtır?', a: 'Kenarı 6 cm’dir (6 × 6 = 36), çevresi 4 × 6 = 24 cm’dir.' },
    ],
    tools: ['alancevre', 'geoboard'],
    games: ['matematik-sehri', 'mozaik-ustasi'],
    interactions: ['alani-kesfet', 'cevre-tuzagi'],
  },
  {
    slug: 'aci-cesitleri',
    title: 'Açı Çeşitleri: Dar, Dik, Geniş ve Doğru Açı Kaç Derece?',
    seoTitle: 'Açı Çeşitleri: Dar, Dik, Geniş Açı Kaç Derece?',
    description: 'Dar açı, dik açı, geniş açı ve doğru açı kaç derece? İletkiyle açı ölçme, komşu ve ters açılar. 4. ve 5. sınıf için online açı ölçer ve açı oyunları.',
    grades: [4, 5, 6],
    outcomes: ['MAT.4.3.5', 'MAT.4.3.6', 'MAT.4.3.7', 'MAT.5.3.3', 'MAT.5.3.4'],
    intro: 'Açılar ölçülerine göre adlandırılır: 0° ile 90° arası dar açı, tam 90° dik açı, 90° ile 180° arası geniş açı, 180° doğru açı ve 360° tam açıdır.',
    sections: [
      {
        h: 'Açı çeşitleri tablosu',
        p: ['Bir açıyı adlandırmak için onu dik açıyla (kâğıdın köşesi) karşılaştırmak en hızlı yoldur.'],
        list: ['Dar açı: 0° < ölçü < 90° (ör. 35°)', 'Dik açı: tam 90°', 'Geniş açı: 90° < ölçü < 180° (ör. 120°)', 'Doğru açı: 180°', 'Tam açı: 360°'],
      },
      {
        h: 'İletkiyle açı nasıl ölçülür?',
        p: ['1) İletkinin merkezini açının köşesine koy. 2) İletkinin 0 çizgisini açının bir kolu ile çakıştır. 3) Diğer kolun kestiği sayıyı, 0’dan başladığın taraftaki ölçekten oku. İç ve dış ölçeği karıştırmamak için önce açının dar mı geniş mi olduğunu tahmin et.'],
      },
      {
        h: 'Komşu, tümler, bütünler ve ters açılar',
        p: ['Köşeleri ve bir kolları ortak olan açılara komşu açı denir. Ölçüleri toplamı 90° olan açılar tümler, 180° olan açılar bütünlerdir. Kesişen iki doğrunun oluşturduğu karşılıklı açılar ters açılardır ve ölçüleri eşittir.'],
      },
      {
        h: 'Açının ölçüsü kolların uzunluğuna bağlı mı?',
        p: ['Hayır. Açı, iki kolun arasındaki dönüklüğün ölçüsüdür. Kolları uzatmak ya da kısaltmak açıyı değiştirmez; çocukların sık düştüğü bir yanılgıdır.'],
      },
    ],
    faq: [
      { q: 'Geniş açı kaç derecedir?', a: '90°’den büyük, 180°’den küçük açılardır; örneğin 100°, 135° ve 170°.' },
      { q: 'Dik açı kaç derecedir?', a: 'Tam 90°’dir.' },
      { q: 'Ters açıların ölçüleri eşit midir?', a: 'Evet. Kesişen iki doğrunun oluşturduğu ters açıların ölçüleri her zaman eşittir.' },
    ],
    tools: ['angle', 'dinamikucgen'],
    games: ['aci', 'lazer-lab'],
    interactions: ['aciyi-olustur'],
  },
  {
    slug: 'cokgenler',
    title: 'Çokgen Nedir? Hangi Şekiller Çokgendir?',
    seoTitle: 'Çokgen Nedir? Çokgen mi, Değil mi? Örneklerle',
    description: 'Çokgen nedir, bir şeklin çokgen olup olmadığı nasıl anlaşılır? Daire çokgen mi? Kenar, köşe, iç açı ve düzgün çokgenler. 5. sınıf çokgenler interaktif etkinlikleri.',
    grades: [5, 6],
    outcomes: ['MAT.5.3.5', 'MAT.5.3.6', 'MAT.3.3.2'],
    intro: 'Çokgen, en az üç doğru parçasının uç uca birleşmesiyle oluşan, kendini kesmeyen kapalı düzlemsel şekildir. Üçgen, kare, beşgen ve altıgen çokgendir; daire ve açık şekiller çokgen değildir.',
    sections: [
      {
        h: 'Bir şekil çokgen mi? Üç soru',
        p: ['Şekle bakarken şu üç soruyu sor; üçünün cevabı da “evet” olmalıdır:'],
        list: ['Yalnızca doğru parçalarından mı oluşuyor? (Eğri çizgi varsa çokgen değildir.)', 'Kapalı mı? (Başladığın yere dönüyor musun?)', 'Kenarlar birbirini kesmiyor mu? (Sekiz gibi kendini kesen şekiller çokgen sayılmaz.)'],
      },
      {
        h: 'Daire çokgen mi?',
        p: ['Hayır. Daire ve çember eğri bir çizgiden oluşur, doğru parçası yoktur. Yarım daire de bir eğri kenarı olduğu için çokgen değildir.'],
      },
      {
        h: 'Çokgenin elemanları',
        p: ['Çokgeni oluşturan doğru parçalarına kenar, kenarların birleştiği noktalara köşe, iki kenar arasında içte kalan açılara iç açı denir. Bir çokgende kenar, köşe ve iç açı sayıları birbirine eşittir. Komşu olmayan iki köşeyi birleştiren doğru parçasına köşegen denir.'],
      },
      {
        h: 'Kenar sayısına göre adlar ve düzgün çokgen',
        p: ['3 kenar: üçgen, 4: dörtgen, 5: beşgen, 6: altıgen, 8: sekizgen. Bütün kenarları ve bütün iç açıları eşit olan çokgenlere düzgün çokgen denir: eşkenar üçgen ve kare gibi. Eşkenar dörtgenin kenarları eşittir ama açıları eşit olmayabilir; bu yüzden her eşkenar dörtgen düzgün çokgen değildir.'],
      },
    ],
    faq: [
      { q: 'Daire bir çokgen midir?', a: 'Hayır. Çokgenler yalnızca doğru parçalarından oluşur; dairenin sınırı eğridir.' },
      { q: 'En az kaç kenarlı çokgen vardır?', a: 'En az 3 kenar gerekir; en az kenarlı çokgen üçgendir.' },
      { q: 'Düzgün çokgen nedir?', a: 'Bütün kenar uzunlukları ve bütün iç açı ölçüleri eşit olan çokgendir; kare ve eşkenar üçgen gibi.' },
    ],
    tools: ['geoboard', 'oruntubloklari', 'tangram'],
    games: ['mozaik-ustasi', 'balon'],
    interactions: ['sekil-insa-et', 'hangisi-farkli-2'],
  },
  {
    slug: 'olasilik',
    title: 'Olasılık Nasıl Hesaplanır? Örnek Uzay, Olay ve Adil Oyun',
    seoTitle: 'Olasılık Nasıl Hesaplanır? Örnek Uzay ve Olay',
    description: 'Olasılık nedir, nasıl hesaplanır? Örnek uzay, olay, tümleyen, eş olasılık, deneysel ve teorik olasılık, adil oyun. Zar ve çarkla interaktif olasılık deneyleri.',
    grades: [4, 5, 6, 7, 8],
    outcomes: ['MAT.4.4.1', 'MAT.5.6.1', 'MAT.5.6.2', 'MAT.6.6.1', 'MAT.7.7.1', 'MAT.7.7.2', 'MAT.7.7.3', 'MAT.8.7.1'],
    intro: 'Bütün çıktıların eşit şansa sahip olduğu bir deneyde bir olayın olasılığı = istenen çıktı sayısı ÷ tüm çıktı sayısıdır. Bir zarda çift sayı gelme olasılığı 3/6 = 1/2’dir. Olasılık 0 (imkânsız) ile 1 (kesin) arasında bir sayıdır.',
    sections: [
      {
        h: 'Temel kavramlar',
        p: ['Olasılık sorularında önce şu üç şeyi belirle:'],
        list: ['Deney: zar atmak, torbadan top çekmek', 'Örnek uzay: olabilecek bütün çıktılar → zar için {1, 2, 3, 4, 5, 6}', 'Olay: örnek uzayın istediğimiz kısmı → “3’ten büyük gelmesi” = {4, 5, 6}'],
      },
      {
        h: 'İmkânsız, olası ve kesin',
        p: ['Bir zarda 7 gelmesi imkânsızdır (olasılık 0). 6’dan küçük ya da 6’ya eşit gelmesi kesindir (olasılık 1). 4 gelmesi olasıdır (1/6). Olasılıkları bir 0–1 doğrusuna yerleştirmek “daha olası” ve “daha az olası” karşılaştırmalarını kolaylaştırır.'],
      },
      {
        h: 'Tümleyen olay',
        p: ['Bir olayın gerçekleşmemesine tümleyen olay denir. Olasılıkları toplamı 1’dir: 6 gelme olasılığı 1/6 ise 6 gelmeme olasılığı 5/6’dır.'],
      },
      {
        h: 'Deneysel ve teorik olasılık',
        p: ['Teorik olasılık hesapla bulunur; deneysel olasılık ise denemelerin sonucudur. Bir parayı 10 kez atınca 7 tura gelebilir (deneysel 7/10), ama atış sayısı yüzlere, binlere çıktıkça sonuç teorik değere (1/2) yaklaşır.'],
      },
      {
        h: 'İki zar ve adil oyun',
        p: ['İki zar atılınca 36 eş olası çıktı vardır. Toplamın 7 olduğu 6 çıktı (1+6, 2+5, 3+4, 4+3, 5+2, 6+1) varken 2 için yalnızca 1 çıktı (1+1) vardır. Bu yüzden 7 gelme olasılığı 6/36 = 1/6, 2 gelme olasılığı 1/36’dır. Her oyuncunun kazanma olasılığı eşit olan oyunlara adil oyun denir.'],
      },
    ],
    faq: [
      { q: 'Olasılık nasıl hesaplanır?', a: 'Çıktılar eş olasıysa istenen çıktı sayısı tüm çıktı sayısına bölünür. Torbada 3 kırmızı, 5 mavi top varsa kırmızı çekme olasılığı 3/8’dir.' },
      { q: 'Örnek uzay nedir?', a: 'Bir deneyde olabilecek bütün çıktıların kümesidir. Yazı-tura için {Y, T}, zar için {1, 2, 3, 4, 5, 6}.' },
      { q: 'Adil oyun nedir?', a: 'Her oyuncunun kazanma olasılığının eşit olduğu oyundur.' },
      { q: 'Olasılık 1’den büyük olabilir mi?', a: 'Hayır. Olasılık her zaman 0 ile 1 arasındadır (0 ve 1 dâhil).' },
    ],
    tools: ['probability', 'rastgeledeney'],
    games: ['at-yarisi'],
    interactions: ['olasilik-simulatoru', 'adil-mi', 'tahmin-test-acikla'],
  },
  {
    slug: 'tahmin-stratejileri',
    title: 'Tahmin Etme Stratejileri: Yuvarlama, Uyumlu Sayılar ve Referans Noktası',
    seoTitle: 'Tahmin Etme Stratejileri: İşlem Sonucunu Tahmin',
    description: 'Tahmin etme stratejileri nelerdir? Yuvarlama, uyumlu sayılar, en büyük basamağa göre tahmin ve referans noktası. 3–5. sınıf örnekleri ve interaktif tahmin etkinlikleri.',
    grades: [1, 2, 3, 4, 5],
    outcomes: ['MAT.1.1.7', 'MAT.2.1.6', 'MAT.3.1.8', 'MAT.3.2.1', 'MAT.4.2.1', 'MAT.4.2.3', 'MAT.5.1.2'],
    intro: 'Tahmin, işlemi tam yapmadan sonucun yaklaşık ne olacağını kestirmektir. En sık kullanılan stratejiler yuvarlama, uyumlu sayılar, en büyük basamağa göre tahmin ve bilinen bir referans miktarla karşılaştırmadır. İyi bir tahmin hem işlemi kontrol etmeye hem de günlük hayatta hızlı karar vermeye yarar.',
    sections: [
      {
        h: '1. Yuvarlama',
        p: ['Sayıları en yakın onluğa, yüzlüğe ya da binliğe yuvarla, sonra işlemi yap: 498 + 307 ≈ 500 + 300 = 800. Gerçek sonuç 805’tir; tahmin oldukça yakındır.'],
      },
      {
        h: '2. Uyumlu sayılar',
        p: ['Zihinden kolayca işlem yapılabilen sayılar seç: 247 ÷ 6 işleminde 247’yi 240’a yaklaştırırsak 240 ÷ 6 = 40 olur. 26 × 4 için 25 × 4 = 100 diye düşünebiliriz.'],
      },
      {
        h: '3. En büyük basamağa göre tahmin',
        p: ['Yalnızca en soldaki basamaklara bak: 6 382 + 2 914 ≈ 6 000 + 2 000 = 8 000. Ardından kalan kısımlara bakarak tahmini düzelt: 382 + 914 yaklaşık 1 300 → yaklaşık 9 300.'],
      },
      {
        h: '4. Referans noktası (nesne sayısını tahmin)',
        p: ['Kavanozdaki bilyeleri tahmin ederken önce 10’luk bir grubu say, sonra kavanozun kaç tane böyle grup aldığını düşün. Bilinen bir miktar (10 bilye, 1 metre, yarım litre) referans noktasıdır.'],
      },
      {
        h: 'Tahmin mantıklı mı?',
        p: ['Her tahminden sonra “Bu sonuç makul mü?” diye sor. 48 × 52 işleminin sonucu 25 000 olamaz, çünkü 50 × 50 = 2 500’dür. Bu soru, hesap makinesindeki ya da kâğıttaki hatayı yakalamanın en hızlı yoludur.'],
      },
    ],
    faq: [
      { q: 'Tahmin ile yuvarlama aynı şey mi?', a: 'Hayır. Yuvarlama tahmin yapmanın stratejilerinden yalnızca biridir; uyumlu sayılar ve referans noktası da tahmin stratejileridir.' },
      { q: 'Tahmin neden önemli?', a: 'Sonucun makul olup olmadığını kontrol etmeyi, zihinden hızlı karar vermeyi ve sayı duyusunu geliştirir.' },
    ],
    tools: ['numberline', 'noktakartlari'],
    games: ['tahmin', 'kasa', 'sayi-konusmalari'],
    interactions: ['hangisi-mantikli', 'hizli-noktalar'],
  },
  {
    slug: 'denklem-cozme',
    title: 'Denklem Nasıl Çözülür? Terazi Yöntemiyle Adım Adım',
    seoTitle: 'Denklem Nasıl Çözülür? Terazi Yöntemi ve Örnekler',
    description: 'Birinci dereceden bir bilinmeyenli denklemler nasıl çözülür? Eşitliğin korunumu, terazi modeli, adım adım örnekler ve kontrol. 6–8. sınıf interaktif denklem etkinlikleri.',
    grades: [6, 7, 8],
    outcomes: ['MAT.6.2.1', 'MAT.7.2.1', 'MAT.7.2.2'],
    intro: 'Bir denklemi çözmek, eşitliği doğru yapan bilinmeyen değeri bulmaktır. Denklemi dengedeki bir terazi gibi düşün: iki tarafa da aynı işlemi yaparsan denge bozulmaz. 3x + 5 = 20 için önce iki taraftan 5 çıkar (3x = 15), sonra iki tarafı 3’e böl (x = 5).',
    sections: [
      {
        h: 'Eşitliğin korunumu',
        p: ['Eşitliğin iki tarafına aynı sayıyı eklemek, çıkarmak ya da iki tarafı 0 olmayan aynı sayıyla çarpmak veya bölmek eşitliği bozmaz. Denklem çözmenin bütün kuralı budur; “karşıya atınca işaret değişir” kuralı bu fikrin kısaltmasıdır.'],
      },
      {
        h: 'Adım adım örnek',
        p: ['2(x − 3) + 4 = 12 denklemini çözelim:'],
        list: ['Parantezi aç: 2x − 6 + 4 = 12 → 2x − 2 = 12', 'İki tarafa 2 ekle: 2x = 14', 'İki tarafı 2’ye böl: x = 7', 'Kontrol et: 2(7 − 3) + 4 = 2 × 4 + 4 = 12 ✓'],
      },
      {
        h: 'Bilinmeyen iki tarafta da varsa',
        p: ['5x + 2 = 3x + 10 → iki taraftan 3x çıkar: 2x + 2 = 10 → iki taraftan 2 çıkar: 2x = 8 → x = 4. Terazide iki kefeden de aynı sayıda x kutusu almak gibidir.'],
      },
      {
        h: 'Denklem kurma',
        p: ['Problemi denkleme çevirirken bilinmeyeni tanımla: “Ayşe’nin parası x olsun.” Sonra metindeki ilişkiyi eşitlik olarak yaz. “Bir sayının 3 katının 4 fazlası 25’tir” → 3x + 4 = 25 → x = 7.'],
      },
    ],
    faq: [
      { q: 'Denklem ile eşitsizlik arasındaki fark nedir?', a: 'Denklemde iki taraf eşittir (=) ve genelde tek çözüm vardır. Eşitsizlikte <, >, ≤ veya ≥ kullanılır ve çözüm bir sayı aralığıdır.' },
      { q: 'Denklemin cevabı nasıl kontrol edilir?', a: 'Bulunan değeri denklemde bilinmeyenin yerine yaz; iki taraf eşit çıkıyorsa çözüm doğrudur.' },
    ],
    tools: ['balance', 'algebra'],
    games: ['denklem-kapilari', 'denge-kulesi', 'makine'],
    interactions: ['esitligi-koru', 'cebir-karolari'],
  },
  {
    slug: 'egim',
    title: 'Eğim Nedir, Nasıl Hesaplanır? Doğrunun Eğimi',
    seoTitle: 'Eğim Nedir, Nasıl Hesaplanır? 8. Sınıf Doğrunun Eğimi',
    description: 'Eğim nedir, nasıl hesaplanır? Dikey uzunluk / yatay uzunluk, iki noktadan eğim, y = mx + n’de eğim, pozitif, negatif ve sıfır eğim. 8. sınıf LGS interaktif eğim aracı.',
    grades: [8],
    outcomes: ['MAT.8.2.2', 'MAT.8.2.3', 'MAT.8.2.4'],
    intro: 'Eğim, bir doğrunun ne kadar dik olduğunu gösteren sayıdır ve dikey uzunluğun yatay uzunluğa oranıyla bulunur. (x₁, y₁) ve (x₂, y₂) noktalarından geçen doğrunun eğimi m = (y₂ − y₁) / (x₂ − x₁)’dir. y = 2x + 1 doğrusunun eğimi 2’dir.',
    sections: [
      {
        h: 'Dikey / yatay oranı',
        p: ['Bir rampada 4 metre ilerleyip 1 metre yükseliyorsak eğim 1/4’tür. Aynı yatay mesafede daha çok yükselirsek eğim büyür, rampa dikleşir.'],
      },
      {
        h: 'İki noktadan eğim hesaplama',
        p: ['A(1, 2) ve B(4, 8) noktalarından geçen doğru için: m = (8 − 2) / (4 − 1) = 6 / 3 = 2. Noktaların sırasını değiştirmek sonucu değiştirmez: (2 − 8) / (1 − 4) = −6 / −3 = 2.'],
      },
      {
        h: 'Denklemden eğim',
        p: ['y = mx + n biçimindeki doğrusal denklemde x’in katsayısı m eğimdir, n ise doğrunun y eksenini kestiği noktadır. y = −3x + 5 doğrusunun eğimi −3, y eksenini kestiği nokta (0, 5)’tir.'],
      },
      {
        h: 'Eğimin işareti',
        list: ['Pozitif eğim: doğru soldan sağa yükselir.', 'Negatif eğim: doğru soldan sağa alçalır.', 'Sıfır eğim: x eksenine paralel (yatay) doğru, ör. y = 3.', 'x eksenine dik (düşey) doğruların eğimi tanımsızdır, ör. x = 2.'],
        p: ['Eğimin işaretine grafiğe bakarak karar vermek, işlem hatalarını yakalamayı kolaylaştırır.'],
      },
    ],
    faq: [
      { q: 'Eğim formülü nedir?', a: 'm = (y₂ − y₁) / (x₂ − x₁), yani dikey değişim bölü yatay değişimdir.' },
      { q: 'Yatay doğrunun eğimi kaçtır?', a: 'Sıfırdır, çünkü dikey değişim 0’dır.' },
      { q: 'Paralel doğruların eğimleri nasıldır?', a: 'Paralel doğruların eğimleri eşittir.' },
    ],
    tools: ['egim', 'coordinate'],
    games: ['egim-parkuru', 'trafik-simulatoru'],
    interactions: ['dogrusal-iliski', 'grafik-hikayeleri'],
  },
  {
    slug: 'karekok',
    title: 'Karekök Nedir? Tam Kare Sayılar ve Karekök Tahmini',
    seoTitle: 'Karekök Nedir? Tam Kareler ve Karekök Tahmini',
    description: 'Karekök nedir, nasıl bulunur? 1–20 tam kare sayılar, tam kare olmayan sayıların karekökünü tahmin etme, a√b biçimi ve kareköklü ifadelerle işlemler. 8. sınıf LGS.',
    grades: [8],
    outcomes: ['MAT.8.1.2', 'MAT.8.1.3'],
    intro: 'Bir sayının karekökü, kendisiyle çarpıldığında o sayıyı veren negatif olmayan sayıdır. 7 × 7 = 49 olduğu için √49 = 7’dir. Karekökü tam sayı olan sayılara tam kare sayılar denir: 1, 4, 9, 16, 25, 36…',
    sections: [
      {
        h: 'Tam kare sayılar',
        p: ['Kenar uzunluğu tam sayı olan karelerin alanları tam karedir. Bu sayıları bilmek karekök tahminini çok hızlandırır:'],
        list: ['1, 4, 9, 16, 25, 36, 49, 64, 81, 100', '121, 144, 169, 196, 225, 256, 289, 324, 361, 400'],
      },
      {
        h: 'Tam kare olmayan sayının karekökünü tahmin',
        p: ['√50 hangi iki tam sayı arasındadır? 49 < 50 < 64 olduğundan 7 < √50 < 8. 50, 49’a çok yakın olduğu için √50 ≈ 7,07’dir. √40 ise 36 ile 49 arasında, 6’ya biraz daha yakındır: √40 ≈ 6,3.'],
      },
      {
        h: 'a√b biçiminde yazma',
        p: ['Kök içindeki sayıyı, biri tam kare olan iki çarpana ayır: √72 = √(36 × 2) = 6√2. √a × √b = √(a × b) kuralı bu dönüşümü sağlar. Ters yönde 3√5 = √(9 × 5) = √45’tir.'],
      },
      {
        h: 'Kareköklü ifadelerle toplama',
        p: ['Yalnızca kök içleri aynı olan ifadeler toplanır: 2√3 + 5√3 = 7√3. √2 + √3, √5’e EŞİT DEĞİLDİR; sık yapılan bir hatadır (√2 + √3 ≈ 3,15, √5 ≈ 2,24).'],
      },
    ],
    faq: [
      { q: '√2 kaçtır?', a: '√2 ≈ 1,414’tür. Ondalık açılımı tekrar etmeden sürdüğü için √2 irrasyonel bir sayıdır.' },
      { q: 'Negatif sayının karekökü var mıdır?', a: 'Ortaokulda kullanılan gerçek sayılarda negatif bir sayının karekökü tanımlı değildir, çünkü kendisiyle çarpılınca negatif sonuç veren bir gerçek sayı yoktur.' },
      { q: '√16 kaçtır, ±4 mü?', a: '√16 = 4’tür. Karekök sembolü negatif olmayan kökü gösterir; x² = 16 denkleminin çözümleri ise 4 ve −4’tür.' },
    ],
    tools: ['geoboard', 'numberline'],
    games: ['kok-dukkani', 'tahmin'],
    interactions: ['hangisi-mantikli', 'her-zaman-mi'],
  },
  {
    slug: 'uslu-ifadeler',
    title: 'Üslü İfadeler: Sıfırıncı ve Negatif Kuvvet Neden Böyle?',
    seoTitle: 'Üslü İfadeler: Sıfırıncı ve Negatif Kuvvet Kuralları',
    description: 'Üslü ifadeler nedir? Bir sayının sıfırıncı kuvveti neden 1, negatif kuvvet ne demek? Üslü ifadelerle çarpma, bölme ve bilimsel gösterim. 8. sınıf LGS örnekleri.',
    grades: [8],
    outcomes: ['MAT.8.1.1'],
    intro: 'Üslü ifade, aynı sayının tekrarlı çarpımının kısa yazılışıdır: 2⁴ = 2 × 2 × 2 × 2 = 16. Sıfırdan farklı her sayının sıfırıncı kuvveti 1’dir (5⁰ = 1) ve negatif kuvvet çarpmaya göre tersi gösterir: 2⁻³ = 1/2³ = 1/8.',
    sections: [
      {
        h: 'Sıfırıncı kuvvet neden 1?',
        p: ['Kuvvetler tablosunda yukarıdan aşağı inelim: 2³ = 8, 2² = 4, 2¹ = 2. Her adımda 2’ye bölüyoruz. Bir adım daha inersek 2⁰ = 2 ÷ 2 = 1 olur. Bu örüntü 0 dışındaki her taban için aynıdır. 0⁰ ise ortaokulda tanımsız kabul edilir.'],
      },
      {
        h: 'Negatif kuvvet',
        p: ['Aynı tabloda inmeye devam edersek 2⁻¹ = 1/2, 2⁻² = 1/4, 2⁻³ = 1/8 olur. Negatif kuvvet sayıyı negatif yapmaz; tabanın çarpmaya göre tersini alır: 10⁻² = 1/100 = 0,01.'],
      },
      {
        h: 'İşlem kuralları',
        list: ['Tabanları aynı ifadeler çarpılırken üsler toplanır: 3² × 3⁴ = 3⁶', 'Tabanları aynı ifadeler bölünürken üsler çıkarılır: 5⁷ ÷ 5³ = 5⁴', 'Üssün üssü alınırken üsler çarpılır: (2³)² = 2⁶', 'Negatif sayının çift kuvveti pozitif, tek kuvveti negatiftir: (−2)⁴ = 16, (−2)³ = −8'],
        p: ['Dikkat: −2⁴ ile (−2)⁴ farklıdır. −2⁴ = −(2⁴) = −16, (−2)⁴ = 16.'],
      },
      {
        h: 'Bilimsel gösterim',
        p: ['Çok büyük ya da çok küçük sayılar a × 10ⁿ biçiminde yazılır; burada 1 ≤ a < 10 olmalıdır. Işık hızı ≈ 300 000 000 m/s = 3 × 10⁸ m/s; 0,00045 = 4,5 × 10⁻⁴.'],
      },
    ],
    faq: [
      { q: 'Bir sayının sıfırıncı kuvveti kaçtır?', a: 'Sıfırdan farklı her sayının sıfırıncı kuvveti 1’dir: 7⁰ = 1, (−3)⁰ = 1.' },
      { q: '2 üssü eksi 3 kaçtır?', a: '2⁻³ = 1/2³ = 1/8 = 0,125.' },
      { q: 'Bilimsel gösterimde a hangi aralıkta olmalı?', a: '1 ≤ a < 10 olmalıdır. 45 × 10³ bilimsel gösterim değildir; doğrusu 4,5 × 10⁴’tür.' },
    ],
    tools: ['carpanagaci'],
    games: ['kristal-magarasi', 'bir-islem'],
    interactions: ['us-oruntu-tablosu', 'oruntu-tasarimcisi', 'islem-dogru-mu'],
  },
  {
    slug: 'pisagor-bagintisi',
    title: 'Pisagor Bağıntısı Nedir? Dik Üçgende Kenar Bulma',
    seoTitle: 'Pisagor Bağıntısı Nedir? Örneklerle Dik Üçgen',
    description: 'Pisagor bağıntısı (teoremi) nedir, nasıl kullanılır? a² + b² = c², hipotenüs bulma, 3-4-5 ve 5-12-13 üçgenleri. 8. sınıf LGS örnekleri ve interaktif Pisagor keşfi.',
    grades: [8],
    outcomes: ['MAT.8.3.5', 'MAT.8.3.6'],
    intro: 'Pisagor bağıntısına göre bir dik üçgende dik kenarların karelerinin toplamı hipotenüsün karesine eşittir: a² + b² = c². Dik kenarları 3 cm ve 4 cm olan üçgenin hipotenüsü 5 cm’dir, çünkü 9 + 16 = 25.',
    sections: [
      {
        h: 'Hipotenüs hangisi?',
        p: ['Hipotenüs dik açının karşısındaki kenardır ve dik üçgenin en uzun kenarıdır. Pisagor bağıntısı yalnızca dik üçgenlerde geçerlidir.'],
      },
      {
        h: 'Alanlarla görmek',
        p: ['Her kenarın üzerine bir kare çizersek, iki dik kenardaki karelerin alanları toplamı hipotenüsteki karenin alanına eşit olur. 3-4-5 üçgeninde 9 + 16 = 25 birim kare. Sitedeki Pisagor Keşif Alanı’nda köşeleri sürükleyerek bunu her dik üçgen için deneyebilirsin.'],
      },
      {
        h: 'Eksik kenarı bulma',
        list: ['Hipotenüs: dik kenarlar 6 ve 8 → c² = 36 + 64 = 100 → c = 10', 'Dik kenar: hipotenüs 13, bir dik kenar 5 → b² = 169 − 25 = 144 → b = 12', 'Sonuç tam sayı değilse kareköklü bırakılır: dik kenarlar 1 ve 1 → c = √2'],
        p: ['Dik kenar ararken çıkarma, hipotenüs ararken toplama yapılır.'],
      },
      {
        h: 'Pisagor üçlüleri ve günlük hayat',
        p: ['3-4-5, 5-12-13, 8-15-17 ve bunların katları (6-8-10, 9-12-15) tam sayılı dik üçgenlerdir. Ustalar bir köşenin tam dik olup olmadığını 3-4-5 kuralıyla kontrol eder; ekranların boyutu da köşegen uzunluğuyla, yani Pisagor’la hesaplanır.'],
      },
    ],
    faq: [
      { q: 'Pisagor teoremi her üçgende geçerli mi?', a: 'Hayır, yalnızca dik üçgenlerde geçerlidir.' },
      { q: 'Dik kenarları 5 ve 12 olan üçgenin hipotenüsü kaçtır?', a: '25 + 144 = 169, √169 = 13.' },
    ],
    tools: ['dinamikucgen', 'geoboard'],
    games: ['kopru-muhendisi', 'hata-avcisi'],
    interactions: ['pisagor-kesif', 'ucgen-olusturucu'],
  },
  {
    slug: 'islem-onceligi',
    title: 'İşlem Önceliği Nedir? Sıra Kuralı ve Örnekler',
    seoTitle: 'İşlem Önceliği Nedir? Parantez, Çarpma, Toplama',
    description: 'İşlem önceliği kuralı: önce parantez, sonra üs, sonra çarpma-bölme, en son toplama-çıkarma. Soldan sağa kuralı ve sık yapılan hatalar. 5. sınıf örnekleri ve etkinlikler.',
    grades: [5, 6, 7],
    outcomes: ['MAT.5.2.1', 'MAT.5.2.2'],
    intro: 'Birden çok işlem içeren bir ifadede işlemler şu sırayla yapılır: önce parantez içi, sonra üslü ifadeler, sonra çarpma ve bölme (soldan sağa), en son toplama ve çıkarma (soldan sağa). Bu yüzden 8 + 4 × 3 = 8 + 12 = 20’dir, 36 değil.',
    sections: [
      {
        h: 'Neden bir sıra kuralı var?',
        p: ['Aynı ifadeyi herkesin aynı şekilde hesaplaması için. Kural olmasaydı 8 + 4 × 3 kimine göre 36, kimine göre 20 olurdu. Çarpma, tekrarlı toplamanın kısaltması olduğundan önce yapılır: 4 × 3 aslında tek bir “paket”tir.'],
      },
      {
        h: 'Soldan sağa kuralı',
        p: ['Çarpma ile bölme aynı önceliktedir; hangisi soldaysa önce o yapılır: 24 ÷ 4 × 2 = 6 × 2 = 12 (3 değil). Toplama ile çıkarma için de aynısı geçerlidir: 10 − 3 + 2 = 9 (5 değil).'],
      },
      {
        h: 'Örnekler',
        list: ['(5 + 3) × 2 = 8 × 2 = 16', '5 + 3 × 2 = 5 + 6 = 11', '18 − 12 ÷ 3 + 1 = 18 − 4 + 1 = 15', '2 × (10 − 4) ÷ 3 = 2 × 6 ÷ 3 = 4'],
        p: ['Parantez, istediğimiz işlemi öne almanın yoludur. Bir problemi tek ifadeyle yazarken parantez kullanmayı unutmak en sık yapılan hatadır.'],
      },
    ],
    faq: [
      { q: 'Önce çarpma mı yapılır, bölme mi?', a: 'Çarpma ve bölme aynı önceliktedir; ifadede soldan sağa hangisi önce geliyorsa o yapılır.' },
      { q: '6 + 6 ÷ 2 kaçtır?', a: 'Önce bölme yapılır: 6 ÷ 2 = 3, sonra 6 + 3 = 9.' },
    ],
    tools: ['balance'],
    games: ['bir-islem', 'sayi-konusmalari', 'hata-avcisi'],
    interactions: ['islem-zinciri', 'islem-dogru-mu', 'sonsuz-cozum'],
  },
  {
    slug: 'simetri',
    title: 'Simetri Nedir? Simetri Doğrusu Nasıl Bulunur?',
    seoTitle: 'Simetri Nedir? Simetri Doğrusu ve Örnekler',
    description: 'Simetri ve simetri doğrusu nedir? Karenin, dikdörtgenin, eşkenar üçgenin kaç simetri doğrusu var? Simetrik şekli tamamlama. 2–4. sınıf interaktif simetri etkinlikleri.',
    grades: [2, 3, 4, 7],
    outcomes: ['MAT.2.3.7', 'MAT.3.3.6', 'MAT.3.3.7', 'MAT.4.3.8', 'MAT.4.3.9', 'MAT.7.3.1'],
    intro: 'Bir şekli bir doğru boyunca katladığımızda iki yarısı tam olarak üst üste geliyorsa şekil simetriktir ve bu doğruya simetri doğrusu denir. Kelebek, kalp ve kare simetrik şekillerdir.',
    sections: [
      {
        h: 'Simetri doğrusu nasıl bulunur?',
        p: ['Şekli kâğıda çiz ve katla: iki yarı çakışıyorsa kat yeri simetri doğrusudur. Kâğıt yoksa her noktanın doğrunun öbür tarafında aynı uzaklıkta bir eşi olup olmadığına bak. Ayna da işe yarar: aynayı doğrunun üzerine koyduğunda şeklin tamamını görüyorsan doğru bir simetri doğrusudur.'],
      },
      {
        h: 'Şekillerin simetri doğrusu sayısı',
        list: ['Kare: 4', 'Dikdörtgen (kare olmayan): 2', 'Eşkenar üçgen: 3', 'İkizkenar üçgen: 1', 'Çeşitkenar üçgen: 0', 'Daire: sonsuz', 'Düzgün altıgen: 6'],
        p: ['Dikdörtgenin köşegenleri simetri doğrusu DEĞİLDİR; köşegen boyunca katlayınca yarılar çakışmaz. Bu çok yaygın bir yanılgıdır.'],
      },
      {
        h: 'Simetrik şekli tamamlama',
        p: ['Kareli kâğıtta her köşenin simetri doğrusuna kaç kare uzak olduğunu say ve öbür tarafta aynı uzaklığa işaretle. Sonra noktaları birleştir. Simetri doğrusuna değen noktalar yerinde kalır.'],
      },
    ],
    faq: [
      { q: 'Karenin kaç simetri doğrusu vardır?', a: '4: iki köşegen ile karşılıklı kenarların orta noktalarını birleştiren iki doğru.' },
      { q: 'Dikdörtgenin köşegeni simetri doğrusu mudur?', a: 'Hayır (kare değilse). Dikdörtgenin yalnızca 2 simetri doğrusu vardır.' },
    ],
    tools: ['symmetry', 'donusum'],
    games: ['mozaik-ustasi', 'lazer-lab'],
    interactions: ['aynadaki-sekil', 'katla-ac', 'donusum-studyosu'],
  },
]

/** Rehber metinlerinin son gözden geçirilme tarihi (yapılandırılmış veride dateModified) */
export const guidesUpdated = '2026-11-04'

export const guideBySlug = Object.fromEntries(guides.map((g) => [g.slug, g])) as Record<string, Guide>

/** Bir öğrenme çıktısına bağlı rehberler */
export const guidesForOutcome = (code: string) => guides.filter((g) => g.outcomes.includes(code))
