import type { Guide } from './guides'

/**
 * Ek konu rehberleri (4–7. sınıf ağırlıklı): ondalık gösterim, yüzde, ortalama, cebirsel ifadeler,
 * çember ve pi, alan, ölçü birimleri, kesirlerle işlemler, grafikler ve dörtgenler.
 * Üslup ve kurallar için src/data/guides.ts başındaki açıklamaya bakın.
 */
export const guidesOrtaokul1: Guide[] = [
  {
    slug: 'ondalik-gosterim',
    title: 'Ondalık Gösterim Nedir? Kesirleri Ondalığa Çevirme',
    seoTitle: 'Ondalık Gösterim Nedir? 6. Sınıf Konu Anlatımı',
    description: 'Ondalık gösterim nedir, nasıl okunur? Kesri ondalık gösterime çevirme, onda bir ve yüzde bir basamakları, sonlu ve devirli ondalıklar; 6. sınıf örnek sorular.',
    grades: [6],
    outcomes: ['MAT.6.1.5', 'MAT.6.1.6'],
    intro: 'Ondalık gösterim, paydası 10, 100, 1000 gibi olan kesirlerin virgül kullanılarak yazılmasıdır: 3/10 = 0,3 ve 25/100 = 0,25. Virgülün solunda tam kısım, sağında ondalık kısım bulunur.',
    sections: [
      {
        h: 'Ondalık gösterimde basamaklar',
        p: [
          'Virgülün solundaki basamaklar birler, onlar, yüzler diye büyür; sağındaki basamaklar ise her adımda 10 kat küçülür: onda birler, yüzde birler, binde birler. 4,365 sayısında 4 birler, 3 onda birler, 6 yüzde birler, 5 binde birler basamağındadır.',
          'Yani 4,365 = 4 + 3/10 + 6/100 + 5/1000 olarak çözümlenebilir. Her ondalık basamak, solundakinin onda biridir; tıpkı onlukların birliklerin 10 katı olması gibi.',
        ],
      },
      {
        h: 'Ondalık gösterimler nasıl okunur?',
        p: ['Önce tam kısım okunur, “tam” denir; sonra ondalık kısım, son basamağın adıyla birlikte okunur.'],
        list: [
          '0,7 → sıfır tam onda yedi',
          '2,45 → iki tam yüzde kırk beş',
          '3,07 → üç tam yüzde yedi',
          '12,345 → on iki tam binde üç yüz kırk beş',
        ],
      },
      {
        h: 'Kesir ondalık gösterime nasıl çevrilir?',
        p: [
          'Birinci yol: Kesri, paydası 10, 100 ya da 1000 olacak biçimde genişletmek. 3/5 = 6/10 = 0,6; 7/20 = 35/100 = 0,35; 3/8 = 375/1000 = 0,375.',
          'İkinci yol: Kesrin bir bölme olduğunu hatırlamak. Kesir çizgisi “bölü” anlamına gelir; 3/8 = 3 ÷ 8 = 0,375. Bu kesir ve bölme ilişkisi, paydası 10’un kuvvetine genişletilemeyen kesirlerde de işe yarar.',
        ],
      },
      {
        h: 'Sonlu ve devirli ondalık gösterim',
        p: [
          'Bazı bölmeler biter: 1/4 = 0,25. Bazıları ise aynı rakam ya da rakam grubu tekrar ederek sonsuza kadar sürer: 1/3 = 0,333…, 5/11 = 0,4545… Tekrar eden kısma devir denir ve üzerine çizgi çekilerek gösterilir.',
          'Kesir en sade hâlindeyken paydanın asal çarpanlarında yalnızca 2 ve 5 varsa ondalık gösterim sonludur (1/8, 7/20, 3/25). Paydada 3, 7, 11 gibi başka bir asal çarpan varsa gösterim devirlidir (1/6 = 0,1666…, 2/7 = 0,285714285714…).',
        ],
      },
      {
        h: 'Ondalık gösterimleri karşılaştırma',
        p: [
          'Önce tam kısımlara, eşitse onda birler basamağına, o da eşitse yüzde birler basamağına bakılır. Basamak sayısını eşitlemek için sağa sıfır eklemek değeri değiştirmez: 0,5 = 0,50.',
          'Sık yapılan hata “daha çok basamaklı olan daha büyüktür” sanmaktır. 0,5 ile 0,45 karşılaştırılırken 0,50 > 0,45 olduğu görülür; 0,5 daha büyüktür.',
        ],
      },
      {
        h: '6. sınıf ondalık gösterim örnek sorular',
        p: ['Aşağıdaki soruları önce kendin çöz, sonra cevaplarla karşılaştır.'],
        list: [
          '9/25 sayısını ondalık gösterimle yaz. → 9/25 = 36/100 = 0,36',
          '0,125 hangi kesre eşittir? → 125/1000 = 1/8',
          '2/3 sonlu mu, devirli mi? → Payda 3 olduğu için devirli: 0,666…',
          '0,6; 0,06 ve 0,66 sayılarını küçükten büyüğe sırala. → 0,06 < 0,6 < 0,66',
          '4 ÷ 5 bölmesinin sonucunu kesir ve ondalık gösterimle yaz. → 4/5 = 0,8',
        ],
      },
    ],
    faq: [
      { q: 'Ondalık gösterim nedir?', a: 'Paydası 10, 100, 1000 gibi olan kesirlerin virgül kullanılarak yazılmasıdır. 7/10 = 0,7 ve 23/100 = 0,23 birer ondalık gösterimdir.' },
      { q: '0,5 mi büyük, 0,45 mi?', a: '0,5 daha büyüktür. 0,5 = 0,50 yazılırsa 50 yüzde birin 45 yüzde birden büyük olduğu açıkça görülür.' },
      { q: '1/3 ondalık gösterimle nasıl yazılır?', a: '1 ÷ 3 = 0,333… olur. 3 sonsuza kadar tekrar ettiği için bu bir devirli ondalık gösterimdir ve 3’ün üzerine çizgi çekilerek yazılır.' },
      { q: 'Bir kesrin ondalık gösteriminin sonlu olduğu nasıl anlaşılır?', a: 'Kesir sadeleştirildikten sonra paydasının asal çarpanları yalnızca 2 ve 5 ise ondalık gösterim sonludur. 3/40 sonlu (40 = 2³ × 5), 1/12 devirlidir (12’de 3 çarpanı var).' },
      { q: 'Ondalık sayının sonuna sıfır eklemek değerini değiştirir mi?', a: 'Hayır. 0,4 = 0,40 = 0,400’dür. Ama tam kısmın sonuna sıfır eklemek değeri değiştirir: 4 ile 40 farklı sayılardır.' },
    ],
    tools: ['yuzdeizgarasi', 'kesirdogrusu', 'numberline'],
    games: ['kesir-takimadalari', 'tahmin', 'gizli-sayi'],
    interactions: ['ondalik-yakinlastirici', 'kesir-tahmincisi', 'kesir-yanilgilari'],
  },
  {
    slug: 'yuzde-hesaplama',
    title: 'Yüzde Nasıl Hesaplanır? Bir Sayının Yüzdesi ve İndirim',
    seoTitle: 'Yüzde Nasıl Hesaplanır? Örneklerle Yüzde Hesabı',
    description: 'Yüzde nedir, nasıl hesaplanır? Bir sayının yüzdesini bulma, kesir-ondalık-yüzde dönüşümü, indirim ve zam hesabı; 6. sınıf yüzde örnek soruları, etkinlikler.',
    grades: [6],
    outcomes: ['MAT.6.1.7'],
    intro: 'Yüzde, paydası 100 olan bir kesirdir: %25 = 25/100 = 0,25. Bir sayının yüzdesi, sayı yüzde değeriyle çarpılıp 100’e bölünerek bulunur; 240’ın %15’i 240 × 15 ÷ 100 = 36’dır.',
    sections: [
      {
        h: 'Yüzde nedir?',
        p: [
          'Yüzde “100 eş parçadan kaç tanesi” demektir ve % sembolüyle gösterilir. 100 karelik bir ızgarada 35 kare boyanmışsa ızgaranın %35’i boyanmıştır.',
          'Yüzdeyi bir bütünün parçası olarak düşünmek önemlidir: Bir sınıftaki öğrencilerin %50’si ile bir okuldaki öğrencilerin %50’si aynı sayıda öğrenci değildir, çünkü bütünler farklıdır.',
        ],
      },
      {
        h: 'Kesir, ondalık gösterim ve yüzde arasındaki dönüşüm',
        p: ['Aynı miktar üç farklı biçimde yazılabilir. Kesri paydası 100 olacak biçimde genişletmek ya da ondalık gösterimi 100 ile çarpmak yüzdeyi verir.'],
        list: [
          '1/2 = 50/100 = 0,5 = %50',
          '1/4 = 25/100 = 0,25 = %25',
          '3/5 = 60/100 = 0,6 = %60',
          '7/20 = 35/100 = 0,35 = %35',
          '1/8 = 0,125 = %12,5',
        ],
      },
      {
        h: 'Bir sayının yüzdesi nasıl hesaplanır?',
        p: [
          'Sayıyı yüzde değeriyle çarpıp 100’e böleriz: 80’in %35’i = 80 × 35 ÷ 100 = 28. Aynı işlem ondalık gösterimle de yapılabilir: 80 × 0,35 = 28.',
          'Zihinden hesap için %10 ve %1 iyi bir başlangıçtır. 240’ın %10’u 24, %5’i bunun yarısı 12’dir; öyleyse %15’i 24 + 12 = 36 olur. %50 yarısı, %25 çeyreği, %20 beşte biri demektir.',
        ],
      },
      {
        h: 'Bir sayı diğerinin yüzde kaçıdır?',
        p: [
          'Parçayı bütüne oranlayıp kesri yüzdeye çeviririz. 60 soruluk sınavda 18 soru boş bırakıldıysa 18/60 = 3/10 = 30/100, yani soruların %30’u boştur.',
        ],
      },
      {
        h: 'İndirim ve zam hesaplama',
        p: [
          '400 TL’lik bir ayakkabıda %20 indirim varsa indirim tutarı 400 × 20 ÷ 100 = 80 TL, yeni fiyat 400 − 80 = 320 TL’dir. Kısa yol: %20 indirimde fiyatın %80’i ödenir, 400 × 0,80 = 320.',
          '250 TL’lik bir ürüne %12 zam gelirse zam tutarı 30 TL, yeni fiyat 280 TL olur. Dikkat: Önce %20 indirim sonra %20 zam yapılan 100 TL’lik ürün 100’e değil, 80 → 96 TL’ye döner; çünkü ikinci yüzde farklı bir bütün üzerinden hesaplanır.',
        ],
      },
      {
        h: 'Yüzde örnek sorular (6. sınıf)',
        p: ['Çözümleri kontrol etmeden önce cevabı tahmin et: Sonuç bütünün yarısından az mı, çok mu olmalı?'],
        list: [
          '150’nin %40’ı kaçtır? → 150 × 40 ÷ 100 = 60',
          '%75’i 45 olan sayı kaçtır? → %25’i 15 olur, tamamı 15 × 4 = 60',
          '25 öğrencilik sınıfta 9 öğrenci gözlüklü. Gözlüklülerin oranı yüzde kaçtır? → 9/25 = 36/100 = %36',
          '120 TL’lik kitaba %15 indirim yapıldı. Kaç TL ödenir? → İndirim 18 TL, ödenen 102 TL',
        ],
      },
    ],
    faq: [
      { q: 'Yüzde nasıl hesaplanır?', a: 'Bir sayının yüzdesini bulmak için sayı yüzde değeriyle çarpılır ve 100’e bölünür. 300’ün %12’si = 300 × 12 ÷ 100 = 36.' },
      { q: 'Yüzde 25 kaçta kaçtır?', a: '%25 = 25/100 = 1/4’tür. Yani bir şeyin %25’i onun dörtte biridir; 80’in %25’i 20’dir.' },
      { q: 'İndirimli fiyat nasıl bulunur?', a: 'Fiyattan indirim tutarı çıkarılır ya da fiyat kalan yüzdeyle çarpılır. 500 TL’ye %30 indirimde 500 × 0,70 = 350 TL ödenir.' },
      { q: 'Kesir yüzdeye nasıl çevrilir?', a: 'Kesir paydası 100 olacak biçimde genişletilir ya da pay paydaya bölünüp sonuç 100 ile çarpılır. 3/4 = 75/100 = %75.' },
      { q: '%100’den büyük yüzde olur mu?', a: 'Olur. Bir miktar ikiye katlanırsa eski değerin %200’üne ulaşır. Ama bir bütünün parçası en fazla %100 olabilir.' },
    ],
    tools: ['yuzdeizgarasi', 'ciftdogru'],
    games: ['kesir-takimadalari', 'uzay-kolonisi'],
    interactions: ['yuzde-boyama', 'indirim-arastirmacisi', 'butunu-degistir'],
  },
  {
    slug: 'aritmetik-ortalama',
    title: 'Aritmetik Ortalama Nasıl Bulunur? Ortanca ve Tepe Değer',
    seoTitle: 'Aritmetik Ortalama Nasıl Bulunur? Ortanca, Tepe Değer',
    description: 'Aritmetik ortalama nasıl hesaplanır? Ortanca ve tepe değer nedir, hangisi ne zaman kullanılır? Açıklık, eksik değer soruları ve 6–7. sınıf örnek soruları.',
    grades: [6, 7],
    outcomes: ['MAT.6.5.1', 'MAT.7.6.1'],
    intro: 'Aritmetik ortalama, verilerin toplamının veri sayısına bölünmesiyle bulunur. 7, 9, 6, 10 ve 8 puanlarının ortalaması (7 + 9 + 6 + 10 + 8) ÷ 5 = 40 ÷ 5 = 8’dir.',
    sections: [
      {
        h: 'Aritmetik ortalama nasıl hesaplanır?',
        p: [
          'Bütün veriler toplanır ve toplam veri sayısına bölünür. Bir haftada 12, 15, 9, 14 ve 10 kitap okunduysa günlük ortalama (12 + 15 + 9 + 14 + 10) ÷ 5 = 60 ÷ 5 = 12 kitaptır.',
          'Ortalamayı “eşit paylaştırma” olarak düşünmek konuyu anlamayı kolaylaştırır: Bütün kitaplar beş güne eşit dağıtılsaydı her güne 12 kitap düşerdi. Sitedeki etkinliklerde sütunları dengeleyerek bu fikri görebilirsin.',
        ],
      },
      {
        h: 'Ortanca (medyan) nedir?',
        p: [
          'Ortanca, veriler küçükten büyüğe sıralandığında tam ortada kalan değerdir. 3, 8, 5, 10, 6 verileri sıralanınca 3, 5, 6, 8, 10 olur; ortanca 6’dır.',
          'Veri sayısı çiftse ortada iki değer kalır ve ortanca bu ikisinin aritmetik ortalamasıdır: 3, 5, 8, 10 için ortanca (5 + 8) ÷ 2 = 6,5’tir. Sıralamayı unutmak en sık yapılan hatadır.',
        ],
      },
      {
        h: 'Tepe değer (mod) nedir?',
        p: [
          'Tepe değer, veri grubunda en çok tekrar eden değerdir. 2, 3, 3, 5, 7, 3, 5 verilerinde 3 üç kez geçtiği için tepe değer 3’tür.',
          'Bir veri grubunun birden fazla tepe değeri olabilir ya da hiç olmayabilir. Tepe değer sayısal olmayan veriler için de kullanılır: Sınıfta en çok sevilen renk “mavi” ise tepe değer mavidir.',
        ],
      },
      {
        h: 'Hangisi ne zaman kullanılır? Uç değerin etkisi',
        p: [
          'Beş arkadaşın haftalık harçlığı 20, 25, 25, 30 ve 200 TL olsun. Ortalama 300 ÷ 5 = 60 TL’dir ama beş kişiden dördü 30 TL ya da daha az alır. Ortanca ise 25 TL’dir ve grubu daha iyi anlatır.',
          'Diğerlerinden çok farklı bir değer (uç değer) varsa ortanca daha güvenilirdir. En çok tercih edilen ayakkabı numarası gibi sorularda tepe değer, toplam miktarın eşit paylaşıldığı durumlarda aritmetik ortalama kullanılır. Verilerin ne kadar yayıldığını görmek için açıklığa (en büyük değer − en küçük değer) bakılır.',
        ],
      },
      {
        h: 'Eksik değeri bulma',
        p: [
          'Ortalama ve veri sayısı biliniyorsa toplam bulunabilir: toplam = ortalama × veri sayısı. Dört sınavın ortalaması 75 ise toplam puan 300’dür. Beşinci sınavdan sonra ortalamanın 78 olması için toplam 5 × 78 = 390 olmalı; beşinci sınavdan 390 − 300 = 90 alınmalıdır.',
        ],
      },
      {
        h: 'Aritmetik ortalama örnek sorular',
        p: ['Her soruda önce sonucun hangi aralıkta olması gerektiğini tahmin et: Ortalama, en küçük ve en büyük veri arasında olmalıdır.'],
        list: [
          '14, 18, 11, 17 sayılarının ortalaması? → 60 ÷ 4 = 15',
          '9, 4, 7, 4, 12, 6 verilerinin ortancası? → Sıralı: 4, 4, 6, 7, 9, 12; ortanca (6 + 7) ÷ 2 = 6,5',
          'Aynı verilerin tepe değeri ve açıklığı? → Tepe değer 4, açıklık 12 − 4 = 8',
          '6 öğrencinin boy ortalaması 140 cm. Aralarına 154 cm’lik bir öğrenci katılırsa yeni ortalama? → (840 + 154) ÷ 7 = 142 cm',
        ],
      },
    ],
    faq: [
      { q: 'Aritmetik ortalama nasıl bulunur?', a: 'Verilerin hepsi toplanır ve veri sayısına bölünür. 4, 6 ve 11’in ortalaması (4 + 6 + 11) ÷ 3 = 7’dir.' },
      { q: 'Ortanca ile ortalama arasındaki fark nedir?', a: 'Ortalama bütün verilerin toplamına bağlıdır, ortanca ise sıralanmış verilerin ortasındaki değerdir. Çok büyük ya da çok küçük bir değer ortalamayı çok değiştirir, ortancayı ise az etkiler.' },
      { q: 'Veri sayısı çift ise ortanca nasıl bulunur?', a: 'Veriler sıralanır ve ortadaki iki değerin aritmetik ortalaması alınır. 2, 4, 9, 11 için ortanca (4 + 9) ÷ 2 = 6,5’tir.' },
      { q: 'Tepe değer olmayabilir mi?', a: 'Evet. Bütün değerler eşit sayıda tekrar ediyorsa (ör. 3, 5, 8, 9) belirgin bir tepe değer yoktur. İki değer en çok ve eşit sayıda tekrar ediyorsa iki tepe değer vardır.' },
      { q: 'Ortalama veri gruplarından biri olmak zorunda mı?', a: 'Hayır. 1, 2 ve 4’ün ortalaması 7 ÷ 3 = 2,333…’tür ve verilerden hiçbiri değildir. Ortalama küsuratlı da çıkabilir.' },
    ],
    tools: ['bargraph', 'grafiklab'],
    games: ['veri-dedektifleri', 'iklim-istasyonu'],
    interactions: ['veri-toplama', 'grafik-ciz-anlat', 'eksik-bilgi'],
  },
  {
    slug: 'cebirsel-ifadeler',
    title: 'Cebirsel İfade Nedir? Terim, Katsayı ve Değişken',
    seoTitle: 'Cebirsel İfade Nedir? Terim, Katsayı, Sabit Terim',
    description: 'Cebirsel ifade nedir? Değişken, terim, katsayı, sabit terim; sözel ifadeyi cebirsel yazma, örüntü kuralı, benzer terimlerle toplama. 6–7. sınıf örnekler.',
    grades: [6, 7],
    outcomes: ['MAT.6.2.2', 'MAT.6.2.3', 'MAT.7.2.1'],
    intro: 'Cebirsel ifade, içinde en az bir bilinmeyen (değişken) ve işlem bulunan ifadedir: 3x + 5 gibi. Bu ifadede x değişken, 3 katsayı, 5 sabit terim; 3x ve 5 ise ifadenin terimleridir.',
    sections: [
      {
        h: 'Değişken, terim, katsayı ve sabit terim',
        p: [
          'Değeri değişebilen ve bir harfle gösterilen niceliğe değişken denir. Toplama ya da çıkarma işaretleriyle ayrılan parçaların her biri bir terimdir. Değişkenin önündeki sayı katsayı, değişken içermeyen terim sabit terimdir.',
        ],
        list: [
          '4a − 7 → değişken a, terimler 4a ve −7, katsayı 4, sabit terim −7',
          'x + 9 → x’in katsayısı 1’dir (1x yazılmaz)',
          '5m + 2n − 1 → iki değişken (m, n), üç terim',
        ],
      },
      {
        h: 'Sözel ifadeyi cebirsel ifadeye çevirme',
        p: ['Bilinmeyen sayı için bir harf seçilir ve cümle işlem diline çevrilir. “Fazlası” toplama, “eksiği” çıkarma, “katı” çarpma, “yarısı” 2’ye bölme anlamına gelir.'],
        list: [
          'Bir sayının 3 fazlası → n + 3',
          'Bir sayının 2 katının 4 eksiği → 2n − 4',
          'Bir sayının yarısının 5 fazlası → n ÷ 2 + 5',
          'Tanesi x TL olan 6 defterin fiyatı → 6x',
        ],
      },
      {
        h: 'Örüntüden cebirsel ifadeye',
        p: [
          'Kibrit çöpleriyle yan yana kareler dizildiğinde 1 kare için 4, 2 kare için 7, 3 kare için 10 çöp gerekir. Her adımda 3 çöp eklendiği için kural 3n + 1’dir: n. adımda 3n + 1 çöp vardır. Kontrol: n = 1 için 3 × 1 + 1 = 4.',
          'Kural bulunduktan sonra uzak adımlar kolayca hesaplanır: 20. adımda 3 × 20 + 1 = 61 çöp gerekir. Kuralı tablodaki artış miktarından (katsayı) ve ilk terime göre düzeltmeden (sabit terim) bulmak iyi bir stratejidir.',
        ],
      },
      {
        h: 'Cebirsel ifadenin değerini hesaplama',
        p: [
          'Değişkenin yerine verilen sayı yazılır ve işlem önceliğine göre hesaplanır. 2x − 3 ifadesinin x = 5 için değeri 2 × 5 − 3 = 7’dir. 4a + b ifadesinin a = 2, b = 6 için değeri 8 + 6 = 14’tür.',
        ],
      },
      {
        h: 'Benzer terimler ve cebirsel ifadelerle işlemler',
        p: [
          'Değişkenleri ve üsleri aynı olan terimlere benzer terim denir. Yalnızca benzer terimler toplanıp çıkarılabilir; katsayılar toplanır, değişken aynen yazılır: 3x + 2 + 5x − 7 = 8x − 5.',
          '7. sınıfta parantezli ifadeler de sadeleştirilir. Bir sayıyla çarpılan parantezde her terim çarpılır: 3(x + 4) = 3x + 12 ve −2(x − 5) = −2x + 10. Önünde eksi olan parantez açılırken içerideki işaretler değişir: (4a − 3) − (a − 5) = 4a − 3 − a + 5 = 3a + 2.',
        ],
      },
      {
        h: 'Sık yapılan hatalar',
        p: [
          '3x + 2 ifadesi 5x’e eşit değildir; 3x ile 2 benzer terim olmadığı için birleştirilemez. Ayrıca 2x (x’in 2 katı) ile x² (x × x) farklıdır: x = 5 için 2x = 10, x² = 25’tir. Cebir karoları bu farkı gözle görmeyi sağlar.',
        ],
      },
    ],
    faq: [
      { q: 'Cebirsel ifade nedir?', a: 'İçinde en az bir değişken ve işlem bulunan matematiksel ifadedir. 2a + 7, x − 4 ve 5n birer cebirsel ifadedir.' },
      { q: 'Katsayı nedir?', a: 'Bir terimde değişkenin önündeki sayıdır. 7y teriminin katsayısı 7, −x teriminin katsayısı −1’dir.' },
      { q: 'Sabit terim nedir?', a: 'Değişken içermeyen terimdir. 5x − 9 ifadesinde sabit terim −9’dur.' },
      { q: 'Benzer terimler nasıl toplanır?', a: 'Katsayılar toplanır, değişken kısmı aynen yazılır: 4m + 6m = 10m. 4m + 6n gibi benzer olmayan terimler toplanamaz.' },
      { q: 'Cebirsel ifade ile denklem arasındaki fark nedir?', a: 'Cebirsel ifadede eşittir işareti yoktur (2x + 1). Denklemde iki ifade birbirine eşitlenir (2x + 1 = 9) ve bilinmeyenin değeri bulunur.' },
    ],
    tools: ['algebra', 'balance'],
    games: ['makine', 'denklem-kapilari'],
    interactions: ['cebir-karolari', 'oruntuden-kurala', 'oruntu-tasarimcisi'],
  },
  {
    slug: 'cemberin-cevresi-ve-pi',
    title: 'Pi Sayısı Nedir? Çemberin Çevresi Nasıl Hesaplanır?',
    seoTitle: 'Çemberin Çevresi Nasıl Hesaplanır? Pi Sayısı',
    description: 'Pi sayısı nedir, nereden gelir? Çemberin çevresi formülü 2πr, çap ve yarıçap, merkez açı ve yay uzunluğu; 6. sınıf çember örnek soruları ve çözümleri.',
    grades: [6],
    outcomes: ['MAT.6.4.4', 'MAT.6.4.5', 'MAT.6.4.6'],
    intro: 'Her çemberde çevrenin çapa oranı aynıdır ve bu sabit sayıya pi (π) denir; π ≈ 3,14’tür. Bu yüzden çemberin çevresi Ç = 2 × π × r (ya da π × çap) formülüyle hesaplanır.',
    sections: [
      {
        h: 'Pi sayısı nereden gelir?',
        p: [
          'Farklı büyüklükte çemberlerin (bardak ağzı, tabak, bisiklet tekerleği) çevresini iple, çapını cetvelle ölçüp çevreyi çapa böldüğünde her seferinde 3’ten biraz büyük bir sayı bulursun. Bu oran çemberin büyüklüğüne bağlı değildir; işte π budur.',
          'π = 3,14159265… diye tekrar etmeden sonsuza kadar devam eden bir sayıdır. Hesaplamalarda soruda istenen yaklaşık değer kullanılır: 3, 3,14 ya da 22/7. Bunlar π’ye yakın değerlerdir, π’nin kendisi değildir.',
        ],
      },
      {
        h: 'Çember, daire, çap ve yarıçap',
        p: [
          'Çember, bir merkeze eşit uzaklıktaki noktaların oluşturduğu kapalı çizgidir; daire ise çember ile iç bölgesinin birleşimidir. Merkezi çember üzerindeki bir noktaya birleştiren doğru parçası yarıçap (r), merkezden geçerek çemberin iki noktasını birleştiren doğru parçası çaptır. Çap, yarıçapın 2 katıdır.',
        ],
      },
      {
        h: 'Çemberin çevresi nasıl hesaplanır?',
        p: [
          'Çevre = 2 × π × r. Yarıçapı 5 cm olan çemberin çevresi π = 3 alınırsa 2 × 3 × 5 = 30 cm, π = 3,14 alınırsa 2 × 3,14 × 5 = 31,4 cm’dir.',
          'Çevre biliniyorsa çap ve yarıçap geriye doğru bulunur: Çevresi 43,96 cm olan çemberde (π = 3,14) çap 43,96 ÷ 3,14 = 14 cm, yarıçap 7 cm’dir.',
        ],
      },
      {
        h: 'Tekerlek problemleri',
        p: [
          'Bir tekerlek bir tam tur döndüğünde çevresi kadar yol alır. Çapı 60 cm olan tekerlek (π = 3) bir turda 3 × 60 = 180 cm, 100 turda 18 000 cm = 180 m yol gider.',
          'Ters soru da sık çıkar: Yarıçapı 35 cm olan tekerlek (π = 22/7) 1100 m yol almak için kaç tur atar? Çevre 2 × 22/7 × 35 = 220 cm; 1100 m = 110 000 cm; 110 000 ÷ 220 = 500 tur.',
        ],
      },
      {
        h: 'Merkez açı ve yay uzunluğu',
        p: [
          'Köşesi çemberin merkezinde olan açıya merkez açı denir. Merkez açının ölçüsü, gördüğü yayın ölçüsüne eşittir. Tam çember 360° olduğu için yay uzunluğu, çevrenin “merkez açı ÷ 360” kadarıdır.',
          'Yarıçapı 6 cm olan çemberde (π = 3) çevre 36 cm’dir. 90°’lik merkez açının gördüğü yay çevrenin dörtte biri, yani 9 cm; 120°’lik merkez açının gördüğü yay 36 × 120 ÷ 360 = 12 cm’dir.',
        ],
      },
      {
        h: 'Çember örnek sorular (6. sınıf)',
        p: ['π için soruda verilen değeri kullan; verilmemişse 3,14 al.'],
        list: [
          'Çapı 10 cm olan çemberin çevresi (π = 3,14)? → 3,14 × 10 = 31,4 cm',
          'Çevresi 54 cm olan çemberin yarıçapı (π = 3)? → 54 ÷ 6 = 9 cm',
          'Yarıçapı 4 cm olan çemberde 45°’lik merkez açının gördüğü yay (π = 3)? → Çevre 24 cm, yay 24 ÷ 8 = 3 cm',
          'Bir çemberin yarıçapı 2 katına çıkarsa çevresi ne olur? → Çevre de 2 katına çıkar',
        ],
      },
    ],
    faq: [
      { q: 'Pi sayısı kaçtır?', a: 'π = 3,14159265… şeklinde sonsuza kadar devam eden bir sayıdır. Okulda genellikle 3, 3,14 ya da 22/7 yaklaşık değerleri kullanılır.' },
      { q: 'Çemberin çevresi formülü nedir?', a: 'Ç = 2πr ya da Ç = π × d’dir. Burada r yarıçapı, d çapı gösterir.' },
      { q: 'Çember ile daire arasındaki fark nedir?', a: 'Çember yalnızca kapalı eğri çizgidir; daire bu çizgi ile içindeki bölgenin tamamıdır. Çemberin çevresi, dairenin ise alanı hesaplanır.' },
      { q: 'Yay uzunluğu nasıl bulunur?', a: 'Çemberin çevresi bulunur ve merkez açı ÷ 360 ile çarpılır. Çevresi 30 cm olan çemberde 60°’lik merkez açının gördüğü yay 30 × 60 ÷ 360 = 5 cm’dir.' },
      { q: 'Pi neden 22/7 değildir?', a: '22/7 = 3,142857… olur ve π = 3,141592…’den biraz büyüktür. π hiçbir kesre tam olarak eşit olmayan irrasyonel bir sayıdır; 22/7 yalnızca kullanışlı bir yaklaşımdır.' },
    ],
    tools: ['angle', 'numberline'],
    games: ['aci'],
    interactions: ['tahmin-test-acikla'],
  },
  {
    slug: 'ucgenin-alani',
    title: 'Üçgenin ve Paralelkenarın Alanı Nasıl Bulunur?',
    seoTitle: 'Üçgenin ve Paralelkenarın Alanı Nasıl Bulunur?',
    description: 'Paralelkenarın alanı taban × yükseklik, üçgenin alanı taban × yükseklik ÷ 2 neden? Alan ölçü birimleri (m², cm², dekar) dönüşümü ve 6. sınıf alan problemleri.',
    grades: [6],
    outcomes: ['MAT.6.4.1', 'MAT.6.4.2', 'MAT.6.4.3'],
    intro: 'Paralelkenarın alanı taban uzunluğu ile o tabana ait yüksekliğin çarpımıdır. Üçgenin alanı bunun yarısıdır: Alan = taban × yükseklik ÷ 2. Tabanı 10 cm, yüksekliği 6 cm olan üçgenin alanı 30 cm²’dir.',
    sections: [
      {
        h: 'Alan ölçü birimleri ve dönüşümleri',
        p: [
          'Alan, kenarı 1 birim olan karelerle ölçülür: 1 cm², kenarı 1 cm olan karenin alanıdır. 1 m = 100 cm olduğu için 1 m² = 100 cm × 100 cm = 10 000 cm²’dir. Alan birimleri arasında her adımda 100 kat fark vardır.',
          'Tarla ve arsa ölçmede ar, dekar ve hektar kullanılır: 1 ar = 100 m², 1 dekar = 1000 m², 1 hektar = 10 000 m².',
        ],
        list: [
          '1 km² = 1 000 000 m²',
          '1 m² = 100 dm² = 10 000 cm²',
          '1 cm² = 100 mm²',
          '3,5 m² = 35 000 cm² · 2400 cm² = 0,24 m²',
        ],
      },
      {
        h: 'Paralelkenarın alanı neden taban × yükseklik?',
        p: [
          'Paralelkenarın bir yanından yükseklik boyunca bir dik üçgen kesip öbür yanına taşırsan, tabanı ve yüksekliği aynı olan bir dikdörtgen elde edersin. Parça atılmadığı için alan değişmez: Alan = taban × yükseklik.',
          'Tabanı 8 cm, yüksekliği 5 cm olan paralelkenarın alanı 40 cm²’dir. Yükseklik tabana dik olan uzaklıktır; eğik yan kenar ile çarpmak en sık yapılan hatadır.',
        ],
      },
      {
        h: 'Üçgenin alanı nasıl hesaplanır?',
        p: [
          'Eş iki üçgen yan yana getirildiğinde bir paralelkenar oluşur. Bu yüzden üçgenin alanı, aynı taban ve yüksekliğe sahip paralelkenarın yarısıdır: Alan = taban × yükseklik ÷ 2.',
          'Dik üçgende dik kenarlardan biri taban, diğeri yükseklik olur: Dik kenarları 6 cm ve 8 cm olan dik üçgenin alanı 6 × 8 ÷ 2 = 24 cm²’dir. Geniş açılı üçgende yükseklik üçgenin dışına düşebilir; yine tabana dik uzaklık ölçülür.',
        ],
      },
      {
        h: 'Tabanları ve yükseklikleri eşit üçgenler',
        p: [
          'Tabanı aynı doğru parçası olan ve tepe noktaları tabana paralel bir doğru üzerinde gezen üçgenlerin şekilleri çok farklı görünse de alanları eşittir; çünkü taban da yükseklik de değişmez. Geometri tahtasında köşeyi kaydırarak bunu deneyebilirsin.',
        ],
      },
      {
        h: '6. sınıf alan problemleri',
        p: ['Karmaşık şekillerde alanı bildiğin parçalara ayır ya da büyük şekilden boş kalan parçayı çıkar.'],
        list: [
          '20 m × 15 m’lik bahçenin içinde tabanı 6 m, yüksekliği 4 m olan üçgen bir havuz var. Çim ekilecek alan? → 300 − 12 = 288 m²',
          'Alanı 48 cm² ve tabanı 12 cm olan paralelkenarın yüksekliği? → 48 ÷ 12 = 4 cm',
          'Alanı 30 cm² olan üçgenin yüksekliği 5 cm ise tabanı? → 30 × 2 ÷ 5 = 12 cm',
          '2,5 dekarlık tarla kaç m²’dir? → 2,5 × 1000 = 2500 m²',
        ],
      },
    ],
    faq: [
      { q: 'Üçgenin alanı formülü nedir?', a: 'Alan = taban × yükseklik ÷ 2. Yükseklik, tabanın karşısındaki köşeden tabana (ya da uzantısına) çizilen dik uzunluktur.' },
      { q: 'Paralelkenarın alanı nasıl bulunur?', a: 'Taban uzunluğu o tabana ait yükseklikle çarpılır. Tabanı 9 cm, yüksekliği 4 cm olan paralelkenarın alanı 36 cm²’dir.' },
      { q: '1 m² kaç cm²’dir?', a: '1 m² = 10 000 cm²’dir. Çünkü 1 m = 100 cm ve kenarı 1 m olan karenin alanı 100 × 100 = 10 000 cm² eder.' },
      { q: '1 dekar kaç metrekaredir?', a: '1 dekar = 1000 m²’dir. 1 hektar 10 dekar, yani 10 000 m²’dir.' },
      { q: 'Üçgenin alanında neden 2’ye bölünür?', a: 'Çünkü eş iki üçgen birleşince aynı taban ve yükseklikte bir paralelkenar oluşur. Üçgen bu paralelkenarın tam yarısıdır.' },
    ],
    tools: ['geoboard', 'alancevre'],
    games: ['mozaik-ustasi'],
    interactions: ['alani-kesfet', 'tangram-studyosu', 'cevre-tuzagi'],
  },
  {
    slug: 'uzunluk-olcu-birimleri',
    title: 'Uzunluk Ölçü Birimleri: km, m, cm, mm Dönüşümleri',
    seoTitle: 'Uzunluk Ölçü Birimleri ve Dönüşümleri (km, m, cm)',
    description: 'Uzunluk ölçü birimleri nelerdir? km, m, dm, cm, mm dönüşümü nasıl yapılır? Kütle birimleri (ton, kg, g), 10, 100, 1000 ile çarpma ve 3–6. sınıf örnek sorular.',
    grades: [3, 4, 6],
    outcomes: ['MAT.3.1.15', 'MAT.4.1.13', 'MAT.6.1.8'],
    intro: 'Uzunluk ölçü birimleri büyükten küçüğe kilometre (km), metre (m), desimetre (dm), santimetre (cm) ve milimetredir (mm). 1 km = 1000 m, 1 m = 100 cm, 1 cm = 10 mm’dir; büyük birimden küçüğe geçerken çarpılır, küçükten büyüğe geçerken bölünür.',
    sections: [
      {
        h: 'Uzunluk ölçü birimleri tablosu',
        p: ['Metre uzunluğun temel birimidir. Diğer birimler metrenin katları ya da askatlarıdır; ardışık birimler arasında 10 kat fark vardır.'],
        list: [
          '1 km = 1000 m',
          '1 m = 10 dm = 100 cm = 1000 mm',
          '1 dm = 10 cm',
          '1 cm = 10 mm',
        ],
      },
      {
        h: 'Uzunluk ölçü birimleri dönüşümü nasıl yapılır?',
        p: [
          'Büyük birimden küçük birime geçerken sayı büyür, çünkü aynı uzunluğu daha küçük parçalarla ölçeriz: 3,4 km = 3,4 × 1000 = 3400 m. Küçük birimden büyüğe geçerken bölünür: 250 cm = 250 ÷ 100 = 2,5 m; 45 mm = 4,5 cm.',
          'Bir sayıyı 10, 100, 1000 ile çarpmak virgülü sırasıyla 1, 2, 3 basamak sağa kaydırmak demektir: 2,375 × 1000 = 2375. Bölerken virgül sola kayar: 86 ÷ 100 = 0,86.',
        ],
      },
      {
        h: 'Hangi uzunluk için hangi birim?',
        p: [
          'İki şehir arası km, sınıfın boyu m, kalemin boyu cm, karıncanın boyu ya da kâğıdın kalınlığı mm ile ölçülür. Doğru birimi seçmek tahmin yaparken de yardımcı olur: Bir kapının yüksekliği yaklaşık 2 m’dir, 2 cm ya da 2 km olamaz.',
        ],
      },
      {
        h: 'Kütle ölçü birimleri: ton, kg, g',
        p: [
          'Kütlede de aynı mantık geçerlidir ama ardışık birimler arasında 1000 kat fark vardır: 1 ton = 1000 kg, 1 kg = 1000 g, 1 g = 1000 mg.',
          '2,5 kg = 2500 g; 750 g = 0,75 kg; 3200 kg = 3,2 ton. Pazarda “yarım kilo” 500 g, “çeyrek kilo” 250 g demektir.',
        ],
      },
      {
        h: 'Ölçü birimleri örnek sorular',
        p: ['Önce birimleri eşitle, sonra işlemi yap.'],
        list: [
          '1,2 km’lik pistte 3 tur koşup 450 m daha yürüyen Elif toplam kaç m yol aldı? → 3600 + 450 = 4050 m = 4,05 km',
          '4 m’lik kumaştan 75 cm’lik kaç parça kesilir, kaç cm artar? → 400 ÷ 75 = 5 parça, 25 cm artar',
          '1 m 35 cm kaç cm’dir? → 135 cm',
          '6 paket 250 g’lık çay kaç kg eder? → 1500 g = 1,5 kg',
          '0,8 cm kaç mm’dir? → 8 mm',
        ],
      },
      {
        h: 'Sık yapılan hatalar',
        p: [
          '“1 m = 10 cm” sanmak, dönüşümde çarpma ile bölmeyi karıştırmak ve farklı birimdeki ölçüleri doğrudan toplamak (3 m + 40 cm = 43) en yaygın hatalardır. Sonucun mantıklı olup olmadığını sor: Küçük birime geçtiysen sayı büyümeli.',
        ],
      },
    ],
    faq: [
      { q: '1 metre kaç santimetredir?', a: '1 m = 100 cm’dir. 1 m aynı zamanda 10 dm ve 1000 mm’dir.' },
      { q: '1 kilometre kaç metredir?', a: '1 km = 1000 m’dir. Örneğin 2,5 km = 2500 m’dir.' },
      { q: 'Santimetre metreye nasıl çevrilir?', a: 'Santimetre 100’e bölünür: 340 cm = 3,4 m; 75 cm = 0,75 m.' },
      { q: '1 kg kaç gramdır?', a: '1 kg = 1000 g’dır. Yarım kilo 500 g, çeyrek kilo 250 g’dır.' },
      { q: 'Desimetre nedir?', a: 'Metrenin onda biridir: 1 dm = 10 cm. Günlük hayatta az kullanılsa da birimler arasındaki 10’ar katlık düzeni görmeyi sağlar.' },
    ],
    tools: ['numberline'],
    games: ['su-muhendisi', 'kargo-rotasi'],
    interactions: ['hangisi-mantikli'],
  },
  {
    slug: 'kesirlerle-toplama-cikarma',
    title: 'Kesirlerle Toplama ve Çıkarma Nasıl Yapılır?',
    seoTitle: 'Kesirlerle Toplama ve Çıkarma Nasıl Yapılır?',
    description: 'Kesirlerle toplama ve çıkarma: paydaları eşit ve farklı kesirler, tam sayılı kesirler, bir çokluğun kesri ve kesir problemleri. 4–5. sınıf çözümlü sorular.',
    grades: [4, 5],
    outcomes: ['MAT.4.1.10', 'MAT.4.1.11', 'MAT.4.1.12'],
    intro: 'Paydaları eşit kesirlerle toplama ve çıkarmada paylar toplanır ya da çıkarılır, payda aynen yazılır: 2/7 + 3/7 = 5/7. Paydalar farklıysa önce kesirler genişletilerek paydalar eşitlenir.',
    sections: [
      {
        h: 'Paydaları eşit kesirlerle toplama ve çıkarma',
        p: [
          'Payda, bütünün kaç eş parçaya bölündüğünü; pay, kaç parça alındığını gösterir. 2/7 ile 3/7’yi toplamak “2 yedide bir ile 3 yedide biri bir araya getirmek” demektir; sonuç 5 yedide bir, yani 5/7 olur. Parçaların büyüklüğü değişmediği için payda değişmez.',
          'Çıkarma da aynıdır: 7/9 − 4/9 = 3/9. En sık yapılan hata paydaları da toplamaktır (2/7 + 3/7 = 5/14). Kesir şeridinde gösterirsen 5/14’ün 2/7’den bile küçük olduğunu görürsün.',
        ],
      },
      {
        h: 'Paydaları farklı kesirlerle toplama ve çıkarma',
        p: [
          'Paydalardan biri diğerinin katıysa küçük paydalı kesir genişletilir: 1/2 + 1/4 = 2/4 + 1/4 = 3/4. Paydalar böyle değilse ikisinin ortak katı olan bir payda seçilir (üst sınıflarda): 2/3 + 1/4 = 8/12 + 3/12 = 11/12; 5/6 − 1/4 = 10/12 − 3/12 = 7/12.',
        ],
      },
      {
        h: 'Tam sayılı kesirlerle işlemler',
        p: [
          'Tam kısımlar ve kesir kısımlar ayrı ayrı toplanabilir: 1 2/5 + 2/5 = 1 4/5. Bir bütünden çıkarma yaparken bütün, paydası aynı olan bir kesir olarak yazılır: 1 − 3/8 = 8/8 − 3/8 = 5/8.',
          'Sonuçtaki bileşik kesir tam sayılı kesre çevrilebilir: 3/5 + 4/5 = 7/5 = 1 2/5.',
        ],
      },
      {
        h: 'Bir çokluğun kesri nasıl bulunur?',
        p: [
          '24 cevizin 3/4’ünü bulmak için önce bütün paydaya bölünür, bir parça bulunur: 24 ÷ 4 = 6. Sonra pay kadar parça alınır: 6 × 3 = 18. Yani 24’ün 3/4’ü 18’dir.',
          'Tersi de sorulabilir: Bir sayının 2/5’i 12 ise 1/5’i 12 ÷ 2 = 6, sayının tamamı 6 × 5 = 30’dur. Şerit modeli çizmek bu tür soruları kolaylaştırır.',
        ],
      },
      {
        h: 'Kesir problemleri ve çözümleri',
        p: ['Her problemde bütünün ne olduğunu belirle ve bir model (şerit, daire) çiz.'],
        list: [
          'Ali pizzanın 3/8’ini, kardeşi 2/8’ini yedi. Geriye ne kadar kaldı? → 8/8 − 5/8 = 3/8',
          '36 sayfalık kitabın 2/9’u okundu. Kaç sayfa kaldı? → 36 ÷ 9 × 2 = 8 sayfa okundu, 28 sayfa kaldı',
          'Bir şişe suyun 1/4’ü sabah, 2/4’ü öğlen içildi. Toplam ne kadarı içildi? → 3/4',
          'Sınıftaki 28 öğrencinin 4/7’si kız. Kaç erkek öğrenci var? → Kız 16, erkek 12',
        ],
      },
    ],
    faq: [
      { q: 'Kesirlerde toplama nasıl yapılır?', a: 'Paydalar eşitse paylar toplanır, payda aynen yazılır: 3/10 + 4/10 = 7/10. Paydalar farklıysa önce genişletmeyle paydalar eşitlenir.' },
      { q: 'Kesirlerde paydalar neden toplanmaz?', a: 'Payda parçanın büyüklüğünü gösterir. Aynı büyüklükteki parçaları bir araya getirdiğimizde parçaların büyüklüğü değişmez, yalnızca sayısı artar.' },
      { q: 'Bir bütünden kesir nasıl çıkarılır?', a: 'Bütün, çıkarılacak kesirle aynı paydalı bir kesir olarak yazılır: 1 − 2/5 = 5/5 − 2/5 = 3/5.' },
      { q: '24’ün 3/4’ü nasıl bulunur?', a: '24 paydaya, yani 4’e bölünür (6), sonuç payla, yani 3’le çarpılır (18). 24’ün 3/4’ü 18’dir.' },
    ],
    tools: ['fractions', 'kesirdaireleri', 'kesirdogrusu'],
    games: ['pizza', 'kesir-takimadalari'],
    interactions: ['kesir-duvari', 'butunu-degistir', 'kesir-yanilgilari'],
  },
  {
    slug: 'sutun-grafigi',
    title: 'Sütun Grafiği Nasıl Çizilir ve Yorumlanır?',
    seoTitle: 'Sütun Grafiği Nasıl Çizilir? Çetele ve Sıklık Tablosu',
    description: 'Çetele tablosu, sıklık tablosu ve sütun grafiği nedir, nasıl çizilir ve yorumlanır? Ölçek seçimi, yanıltıcı grafikler ve 2–6. sınıf veri soruları örneklerle.',
    grades: [2, 3, 4, 5, 6],
    outcomes: ['MAT.2.4.1', 'MAT.3.4.1', 'MAT.4.4.2', 'MAT.5.5.1', 'MAT.5.5.2', 'MAT.6.5.2'],
    intro: 'Sütun grafiği, verileri yüksekliği değerle orantılı sütunlarla gösteren grafiktir. Önce veriler çetele ya da sıklık tablosunda sayılır, sonra her kategori için uygun ölçekte bir sütun çizilir.',
    sections: [
      {
        h: 'Çetele tablosu nedir?',
        p: [
          'Çetele, verileri toplarken her biri için bir çizgi çektiğimiz sayma yöntemidir. Saymayı kolaylaştırmak için dört dik çizgiden sonra beşinci çizgi çapraz çekilir; böylece çizgiler 5’li gruplar hâlinde sayılır.',
          'Örneğin sınıfta en sevilen meyve sorulduğunda her cevap için ilgili satıra bir çizgi eklenir. Veri toplama bitince çizgiler sayılır ve sıklık tablosuna yazılır.',
        ],
      },
      {
        h: 'Sıklık tablosu',
        p: ['Sıklık tablosu, her kategoride kaç veri olduğunu sayıyla gösterir. Aşağıdaki tablo bir sınıfın en sevdiği meyveleri gösteriyor:'],
        list: ['Elma: 8 öğrenci', 'Muz: 5 öğrenci', 'Çilek: 10 öğrenci', 'Portakal: 3 öğrenci', 'Toplam: 26 öğrenci'],
      },
      {
        h: 'Sütun grafiği nasıl çizilir?',
        p: ['Aşağıdaki adımları sırayla uygula:'],
        list: [
          'Grafiğe ne gösterdiğini anlatan bir başlık yaz.',
          'Yatay eksene kategorileri (meyveler), dikey eksene sayıları (öğrenci sayısı) yerleştir.',
          'Dikey eksen 0’dan başlasın ve eşit aralıklarla ilerlesin (ölçek). En büyük veri 10 ise 0, 2, 4, 6, 8, 10 uygun bir ölçektir.',
          'Her kategori için aynı genişlikte, aralarında eşit boşluk olan sütunlar çiz.',
          'Sütunların yüksekliği tablodaki değere eşit olsun.',
        ],
      },
      {
        h: 'Sütun grafiği nasıl yorumlanır?',
        p: [
          'En uzun sütun en çok, en kısa sütun en az tercih edileni gösterir. Sütunların farkı karşılaştırma sorularını cevaplar: Çileği seven 10, portakalı seven 3 öğrenci var; çilek 7 öğrenci daha fazla tercih edilmiş.',
          'Toplam, kategorilerin toplamıdır (26). Üst sınıflarda grafikten oran ve ortalama da çıkarılır: Öğrencilerin 10/26’sı çileği seçmiş, bu yarıdan azdır. Alt sınıflarda aynı veriler nesne ve şekil grafikleriyle de gösterilir.',
        ],
      },
      {
        h: 'Yanıltıcı grafikler',
        p: [
          'Dikey eksen 0’dan başlamazsa küçük farklar çok büyük görünür. 48 ve 52 oy alan iki aday için eksen 46’dan başlatılırsa ikinci sütun birincinin üç katı gibi görünür, oysa fark yalnızca 4 oydur.',
          'Eşit olmayan ölçek aralıkları, eksik başlık ya da farklı genişlikte sütunlar da okuyucuyu yanıltır. Bir grafiği yorumlamadan önce başlığa, eksen adlarına ve ölçeğe bakmayı alışkanlık hâline getir.',
        ],
      },
      {
        h: 'Grafik soruları ve çözümleri',
        p: ['Yukarıdaki meyve verilerine göre cevapla.'],
        list: [
          'Elma ve muzu sevenler toplam kaç kişi? → 8 + 5 = 13',
          'En çok ve en az sevilen meyve arasındaki fark? → 10 − 3 = 7',
          'Her kare 2 öğrenciyi gösteriyorsa elma sütunu kaç kare olur? → 8 ÷ 2 = 4 kare',
          'Öğrencilerin yarısından fazlası tek bir meyveyi mi seçmiş? → Hayır; en çok seçilen çilek 10 kişi, 26’nın yarısı 13',
        ],
      },
    ],
    faq: [
      { q: 'Çetele tablosu nasıl yapılır?', a: 'Her veri için ilgili satıra bir çizgi çekilir; dört dik çizgiden sonra beşinci çizgi diğerlerinin üzerine çapraz çekilir. Böylece çizgiler 5’li gruplarla hızlıca sayılır.' },
      { q: 'Sütun grafiği ile çizgi grafiği arasındaki fark nedir?', a: 'Sütun grafiği farklı kategorileri (meyveler, renkler) karşılaştırmak için, çizgi grafiği ise bir niceliğin zamanla değişimini (günlük sıcaklık) göstermek için kullanılır.' },
      { q: 'Sütun grafiğinde ölçek nasıl seçilir?', a: 'En büyük veriyi kapsayacak, eşit aralıklı ve 0’dan başlayan bir ölçek seçilir. Veriler büyükse her kare 2, 5 ya da 10 birimi gösterebilir.' },
      { q: 'Grafik neden yanıltıcı olabilir?', a: 'Dikey eksenin 0’dan başlamaması, eşit olmayan aralıklar ya da farklı sütun genişlikleri farkları olduğundan büyük veya küçük gösterir.' },
    ],
    tools: ['bargraph', 'grafiklab'],
    games: ['veri-dedektifleri', 'lunapark'],
    interactions: ['veri-toplama', 'grafik-hikayeleri', 'yaniltici-grafikler'],
  },
  {
    slug: 'dortgenler',
    title: 'Dörtgen Çeşitleri: Yamuk, Paralelkenar, Eşkenar Dörtgen',
    seoTitle: 'Dörtgen Çeşitleri ve Özellikleri: Yamuk, Paralelkenar',
    description: 'Yamuk, paralelkenar, eşkenar dörtgen, dikdörtgen ve kare özellikleri; köşegenler, iç açılar toplamı ve paralel doğrularda açılar. 6. sınıf örnek sorular.',
    grades: [6],
    outcomes: ['MAT.6.3.1', 'MAT.6.3.2', 'MAT.6.3.3', 'MAT.6.3.4'],
    intro: 'Dörtgenler kenarlarının paralelliğine ve uzunluğuna göre sınıflandırılır: Yamukta en az bir çift, paralelkenarda iki çift karşılıklı kenar paraleldir. Her dörtgenin iç açıları toplamı 360°’dir.',
    sections: [
      {
        h: 'Paralel doğrularda açılar',
        p: [
          'İki paralel doğruyu üçüncü bir doğru kestiğinde sekiz açı oluşur. Yöndeş açılar (aynı konumdaki açılar), iç ters açılar ve dış ters açılar birbirine eşittir. Aynı taraftaki iç açıların (karşı durumlu açıların) toplamı 180°’dir.',
          'Bu yüzden açılardan biri bilinirse hepsi bulunur: Bir açı 65° ise ona yöndeş ve ters olan açılar 65°, onlara komşu olan açılar 180° − 65° = 115°’dir.',
        ],
      },
      {
        h: 'Yamuk ve paralelkenar',
        p: [
          'Karşılıklı kenarlarından en az bir çifti paralel olan dörtgen yamuktur. Paralel kenarlara taban denir. Paralel olmayan kenarları eşit olan yamuğa ikizkenar yamuk denir; ikizkenar yamukta aynı tabandaki açılar eşittir.',
          'Karşılıklı kenarlarının ikisi de paralel olan dörtgen paralelkenardır. Paralelkenarda karşılıklı kenarlar eşit uzunlukta, karşılıklı açılar eşit ölçüdedir ve komşu iki açının toplamı 180°’dir. Bir açısı 70° olan paralelkenarın açıları 70°, 110°, 70°, 110°’dir.',
        ],
      },
      {
        h: 'Eşkenar dörtgen, dikdörtgen ve kare',
        p: ['Bu üç dörtgen paralelkenarın özel hâlleridir; paralelkenarın bütün özelliklerini taşır, üstüne kendi özelliklerini ekler.'],
        list: [
          'Eşkenar dörtgen: dört kenarı eşit; köşegenleri birbirini dik keser.',
          'Dikdörtgen: dört açısı 90°; köşegenleri eşit uzunlukta.',
          'Kare: hem dikdörtgen hem eşkenar dörtgendir; dört kenarı eşit, dört açısı 90°, köşegenleri eşit ve dik.',
          'Her kare bir dikdörtgendir ama her dikdörtgen kare değildir.',
        ],
      },
      {
        h: 'Dörtgenlerde köşegen',
        p: [
          'Köşegen, komşu olmayan iki köşeyi birleştiren doğru parçasıdır; her dörtgenin 2 köşegeni vardır. Paralelkenarda köşegenler birbirini ortalar, yani kesişme noktası iki köşegeni de iki eş parçaya ayırır.',
          'Köşegenlerin özellikleri dörtgeni tanımayı sağlar: Köşegenleri eşit ve birbirini ortalayan dörtgen dikdörtgendir; köşegenleri birbirini dik ortalayan dörtgen eşkenar dörtgendir.',
        ],
      },
      {
        h: 'Üçgen ve dörtgende iç açılar',
        p: [
          'Üçgenin iç açıları toplamı 180°’dir. Bir köşegen dörtgeni iki üçgene ayırdığı için dörtgenin iç açıları toplamı 2 × 180° = 360°’dir.',
          'Üç açısı 85°, 95° ve 110° olan dörtgenin dördüncü açısı 360° − 290° = 70°’dir. İki açısı 50° ve 60° olan üçgenin üçüncü açısı 70°’dir.',
        ],
      },
      {
        h: 'Dörtgen örnek sorular (6. sınıf)',
        p: ['Önce dörtgenin türünü belirle, sonra o türün özelliklerini kullan.'],
        list: [
          'Paralelkenarın bir açısı 125° ise diğer açıları? → 55°, 125°, 55°',
          'İkizkenar yamuğun alt taban açıları 65° ise üst taban açıları? → 180° − 65° = 115°',
          'Bir dörtgenin açıları x, 2x, 3x ve 4x ise x? → 10x = 360°, x = 36°',
          'Köşegenleri dik kesişen her dörtgen eşkenar dörtgen midir? → Hayır; köşegenlerin birbirini ortalaması da gerekir (uçurtma şekli karşı örnektir)',
        ],
      },
    ],
    faq: [
      { q: 'Yamuk nedir?', a: 'Karşılıklı kenarlarından en az bir çifti paralel olan dörtgendir. Paralel kenarlarına taban denir. Bazı kaynaklar yamuğu yalnızca bir çift paralel kenarı olan dörtgen olarak tanımlar.' },
      { q: 'Kare bir dikdörtgen midir?', a: 'Evet. Kare dört açısı 90° olduğu için dikdörtgen, dört kenarı eşit olduğu için eşkenar dörtgendir. Kare bu iki dörtgenin ortak özel hâlidir.' },
      { q: 'Dörtgenin iç açıları toplamı kaç derecedir?', a: '360°’dir. Bir köşegen dörtgeni iki üçgene ayırır ve her üçgenin iç açıları toplamı 180°’dir.' },
      { q: 'Paralelkenarın özellikleri nelerdir?', a: 'Karşılıklı kenarları paralel ve eşit, karşılıklı açıları eşittir; komşu açıların toplamı 180°’dir ve köşegenleri birbirini ortalar.' },
      { q: 'Yöndeş açılar eşit midir?', a: 'İki paralel doğru bir kesenle kesildiğinde yöndeş açılar eşittir. Doğrular paralel değilse bu eşitlik geçerli olmaz.' },
    ],
    tools: ['geoboard', 'angle', 'dinamikucgen'],
    games: ['aci', 'lazer-lab'],
    interactions: ['aciyi-olustur', 'katla-ac', 'ucgen-olusturucu'],
  },
]
