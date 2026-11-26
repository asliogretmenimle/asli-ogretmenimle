import type { Guide } from './guides'

/**
 * 7. ve 8. sınıf (ve 6–8 ortak) konu rehberleri. guides.ts içindeki `guides` dizisine eklenir.
 * Metinler düz yazıdır (MathText yok); hesaplamalarda π aksi söylenmedikçe 3 alınmıştır.
 */
export const guidesOrtaokul2: Guide[] = [
  {
    slug: 'tam-sayilarla-islemler',
    title: 'Tam Sayılarla İşlemler Nasıl Yapılır? İşaret Kuralları',
    seoTitle: 'Tam Sayılarla İşlemler: Toplama, Çıkarma, Çarpma',
    description: 'Tam sayılarla toplama, çıkarma, çarpma ve bölme nasıl yapılır? Negatif sayılar, sayı doğrusu, mutlak değer ve işaret kuralları. 7. sınıf çözümlü örnekler.',
    grades: [7],
    outcomes: ['MAT.7.1.1', 'MAT.7.1.3', 'MAT.7.1.4'],
    intro: 'Aynı işaretli tam sayılar toplanırken mutlak değerler toplanır ve ortak işaret yazılır; farklı işaretlilerde büyük mutlak değerden küçük olan çıkarılır ve büyüğün işareti yazılır. Çarpma ve bölmede aynı işaretler sonucu pozitif (+), farklı işaretler negatif (−) yapar: (−3) × (−4) = 12, (−24) ÷ 6 = −4.',
    sections: [
      {
        h: 'Tam sayılar ve sayı doğrusu',
        p: [
          'Tam sayılar; negatif tam sayılar (…, −3, −2, −1), sıfır ve pozitif tam sayılardan (1, 2, 3, …) oluşur. Sıfır ne pozitif ne negatiftir. Sayı doğrusunda sağa gittikçe sayılar büyür, sola gittikçe küçülür.',
          'Bu yüzden −8 < −3 < 0 < 2’dir. Negatif sayılarda “rakamı büyük olan büyüktür” düşüncesi yanıltır: −8, −3’ten daha soldadır, yani daha küçüktür. Sıcaklıkta −8 °C, −3 °C’den daha soğuktur.',
        ],
      },
      {
        h: 'Mutlak değer nedir?',
        p: [
          'Bir sayının mutlak değeri, sayı doğrusunda o sayının 0’a olan uzaklığıdır ve |a| ile gösterilir. Uzaklık negatif olamayacağı için mutlak değer hiçbir zaman negatif değildir: |−7| = 7, |7| = 7, |0| = 0.',
          'Mutlak değeri 5 olan iki tam sayı vardır: 5 ve −5. Bir sayı ile ters işaretlisi (5 ile −5 gibi) 0’a eşit uzaklıktadır ve toplamları 0’dır.',
        ],
      },
      {
        h: 'Tam sayılarla toplama',
        p: [
          'Sayı doğrusunda pozitif sayı eklemek sağa, negatif sayı eklemek sola gitmek demektir. Sayma pullarıyla düşünmek de işe yarar: bir pozitif ile bir negatif pul birbirini götürür (sıfır çifti).',
        ],
        list: [
          '(−5) + (−3) = −8 → aynı işaret: 5 + 3 = 8, işaret −',
          '(−7) + 4 = −3 → farklı işaret: 7 − 4 = 3, büyüğün işareti −',
          '9 + (−2) = 7 → farklı işaret: 9 − 2 = 7, büyüğün işareti +',
          '(−6) + 6 = 0 → bir sayı ile ters işaretlisinin toplamı 0',
        ],
      },
      {
        h: 'Tam sayılarla çıkarma: çıkarmayı toplamaya çevir',
        p: [
          'Bir tam sayıyı çıkarmak, onun ters işaretlisini eklemekle aynıdır: a − b = a + (−b). Böylece her çıkarma işlemi toplama kurallarıyla yapılır.',
        ],
        list: [
          '6 − (−2) = 6 + 2 = 8',
          '(−4) − 5 = (−4) + (−5) = −9',
          '(−3) − (−10) = (−3) + 10 = 7',
          '2 − 9 = 2 + (−9) = −7',
        ],
      },
      {
        h: 'Çarpma ve bölmede işaret kuralı',
        p: [
          'Çarpma ve bölmede önce sayıların mutlak değerleriyle işlem yapılır, sonra işaret belirlenir. Aynı işaretli iki sayının çarpımı ya da bölümü pozitif, farklı işaretli iki sayınınki negatiftir.',
          'Birden çok çarpanda negatif çarpanları sayın: negatif çarpan sayısı çiftse sonuç pozitif, tekse negatiftir. (−1) × (−2) × (−3) = −6, çünkü üç negatif çarpan vardır. Aynı nedenle (−2)³ = −8, (−2)⁴ = 16’dır.',
        ],
        list: ['(+) × (+) = (+)', '(−) × (−) = (+)', '(+) × (−) = (−)', '(−) × (+) = (−)', '(−24) ÷ 6 = −4, (−24) ÷ (−6) = 4'],
      },
      {
        h: '7. sınıf tam sayı problemleri (çözümlü)',
        list: [
          'Sabah sıcaklık −4 °C’dir, öğlene kadar 9 °C artıyor: −4 + 9 = 5 °C.',
          'Deniz seviyesinin 120 m altındaki bir denizaltı 45 m yükseliyor: −120 + 45 = −75, yani deniz seviyesinin 75 m altında.',
          'Bir şehirde gece −6 °C, gündüz 11 °C ölçülüyor. Sıcaklık farkı: 11 − (−6) = 17 °C.',
          'Bir yarışmada doğru cevap +5, yanlış cevap −2 puan. 7 doğru, 4 yanlış yapan öğrenci: 7 × 5 + 4 × (−2) = 35 − 8 = 27 puan.',
        ],
        p: ['Problemi önce sayı doğrusunda çiz, sonra işlemi yaz; sonucun işaretini durumla karşılaştır (deniz seviyesinin altı negatif olmalı).'],
      },
    ],
    faq: [
      { q: 'Eksi ile eksinin çarpımı neden artıdır?', a: 'Örüntüyle görülebilir: (−3) × 2 = −6, (−3) × 1 = −3, (−3) × 0 = 0. Çarpan her adımda 1 azalınca sonuç 3 artıyor; bir adım daha gidersek (−3) × (−1) = 3 olur. Bu yüzden iki negatifin çarpımı pozitiftir.' },
      { q: 'Eksi ile eksinin toplamı artı mı olur?', a: 'Hayır. İşaret kuralı yalnızca çarpma ve bölmede geçerlidir. (−5) + (−3) = −8’dir; iki borç toplanınca borç büyür.' },
      { q: '−8 mi büyük, −3 mü?', a: '−3 daha büyüktür. Sayı doğrusunda −3, −8’in sağındadır. Negatif sayılarda mutlak değeri küçük olan daha büyüktür.' },
      { q: 'Mutlak değer negatif olabilir mi?', a: 'Hayır. Mutlak değer 0’a olan uzaklıktır; |−9| = 9, |0| = 0. Ancak −|9| = −9 gibi ifadelerde eksi işareti mutlak değerin dışındadır.' },
      { q: '6 − (−2) kaçtır?', a: 'Çıkarmayı toplamaya çeviririz: 6 − (−2) = 6 + 2 = 8.' },
    ],
    tools: ['numberline'],
    games: ['tahmin', 'bir-islem', 'hata-avcisi'],
    interactions: ['islem-dogru-mu', 'hangisi-mantikli', 'her-zaman-mi'],
  },
  {
    slug: 'oran-oranti',
    title: 'Oran ve Orantı Nedir? Doğru Orantı Nasıl Kurulur?',
    seoTitle: 'Oran ve Orantı Nedir? 7. Sınıf Doğru Orantı',
    description: 'Oran ve orantı nedir, farkı ne? İçler dışlar çarpımı, doğru orantı, birim oran ve orantı sabiti. 7. sınıf oran orantı problemleri çözümlü örneklerle.',
    grades: [7],
    outcomes: ['MAT.7.1.5', 'MAT.7.1.6', 'MAT.7.1.7'],
    intro: 'Oran, iki çokluğun bölme yoluyla karşılaştırılmasıdır: 12 kıza 18 erkek varsa kızların erkeklere oranı 12/18 = 2/3’tür. Orantı ise iki oranın eşitliğidir: 3/4 = 15/20; orantıda içler çarpımı dışlar çarpımına eşittir (4 × 15 = 3 × 20).',
    sections: [
      {
        h: 'Oran nedir? a/b ve a : b gösterimi',
        p: [
          'a ve b iki çokluk ve b ≠ 0 olmak üzere a’nın b’ye oranı a/b ya da a : b biçiminde yazılır ve “a’nın b’ye oranı” diye okunur. Oran, kesir gibi sadeleştirilebilir: 12 : 18 = 2 : 3.',
          'Aynı birimdeki çokluklar karşılaştırılırsa oran birimsizdir (12 cm : 18 cm = 2/3). Farklı birimlerdeki çokluklarda oranın birimi vardır: 240 km yolu 3 saatte almak 80 km/saat demektir.',
        ],
        list: ['Kızların erkeklere oranı: 12/18 = 2/3', 'Kızların tüm sınıfa oranı: 12/30 = 2/5', 'Erkeklerin kızlara oranı: 18/12 = 3/2'],
      },
      {
        h: 'Birim oran: hangisi daha ucuz?',
        p: [
          'Birim oran, paydası 1 olan orandır: 1 kg’ın fiyatı, 1 saatte gidilen yol gibi. Farklı paketleri karşılaştırırken birim orana çevirmek en güvenli yoldur.',
          '500 g’lık paket 40 TL, 750 g’lık paket 57 TL olsun. 1 kg’a göre: 40 × 2 = 80 TL ve 57 ÷ 0,75 = 76 TL. Büyük paket kilogram başına daha ucuzdur.',
        ],
      },
      {
        h: 'Orantı ve içler dışlar çarpımı',
        p: [
          'İki oranın eşitliğine orantı denir: a/b = c/d. Burada a ile d’ye dışlar, b ile c’ye içler denir ve a × d = b × c’dir. Bilinmeyen bir terimi bulmak için bu eşitlik kullanılır.',
        ],
        list: ['3/4 = x/20 → 4 × x = 3 × 20 → x = 15', '5/x = 15/24 → 15 × x = 5 × 24 → x = 8', '2,5/10 = 4/x → 2,5 × x = 40 → x = 16'],
      },
      {
        h: 'Doğru orantı ve orantı sabiti',
        p: [
          'Bir çokluk kaç katına çıkarken diğeri de aynı kat artıyorsa bu iki çokluk doğru orantılıdır. Bu durumda y/x oranı hep aynıdır; bu sabit sayıya orantı sabiti (k) denir ve y = k × x yazılır.',
          'Doğru orantılı iki çokluğun grafiği başlangıç noktasından (0, 0) geçen bir doğrudur. Bir çokluk artarken diğeri azalıyorsa (işçi sayısı arttıkça işin bitme süresinin azalması gibi) bu ilişki doğru orantı değildir.',
        ],
        list: ['Kalem sayısı: 1, 2, 3, 4 → fiyat: 15, 30, 45, 60 TL → k = 15 (doğru orantılı)', 'Yaş: 1, 2, 3 → boy: 75, 87, 96 cm → oran sabit değil (doğru orantılı değil)'],
      },
      {
        h: '7. sınıf oran orantı problemleri (çözümlü)',
        list: [
          '3 kg elma 75 TL ise 7 kg elma kaç TL? Birim oran 75 ÷ 3 = 25 TL → 7 × 25 = 175 TL.',
          'Bir kek tarifinde 2 yumurtaya 3 su bardağı un gidiyor. 8 yumurta kullanılırsa: 2/3 = 8/x → 2x = 24 → x = 12 su bardağı un.',
          'Ölçeği 1 : 50 000 olan haritada 4 cm’lik yol gerçekte 4 × 50 000 = 200 000 cm = 2 km’dir.',
          'Bir sınıfta kızların erkeklere oranı 3/5, sınıf mevcudu 32. Toplam 3 + 5 = 8 parça → 1 parça 4 kişi → 12 kız, 20 erkek.',
        ],
        p: ['Problemi çözmeden önce “biri artınca öbürü de aynı kat artıyor mu?” diye sor. Cevap evetse orantı kurabilirsin. Oran tablosu çizmek, hangi çokluğun hangisiyle eşleştiğini karıştırmamanı sağlar.'],
      },
    ],
    faq: [
      { q: 'Oran ile kesir arasındaki fark nedir?', a: 'Kesir bir bütünün parçasını gösterir. Oran ise iki çokluğu karşılaştırır; karşılaştırılan çokluklar farklı birimlerde bile olabilir (80 km/saat gibi). Her oran kesir biçiminde yazılabilir ama her oran bir parça-bütün ilişkisi değildir.' },
      { q: 'İçler dışlar çarpımı nedir?', a: 'a/b = c/d orantısında a ve d dışlar, b ve c içlerdir. Orantı doğruysa a × d = b × c olur. Bilinmeyen terim bu eşitlikten bulunur.' },
      { q: 'Doğru orantının grafiği nasıldır?', a: 'Başlangıç noktasından (0, 0) geçen bir doğrudur. Doğrunun dikliği orantı sabitine bağlıdır.' },
      { q: 'Orantı sabiti nasıl bulunur?', a: 'Doğru orantılı iki çokluktan birini diğerine bölerek: y/x = k. 4 kalem 60 TL ise k = 60 ÷ 4 = 15 TL/kalem.' },
    ],
    tools: ['orantablosu', 'ciftdogru'],
    games: ['uzay-kolonisi', 'kopru-muhendisi'],
    interactions: ['oran-karistirici', 'tarif-olcekleyici', 'indirim-arastirmacisi'],
  },
  {
    slug: 'prizmanin-hacmi',
    title: 'Prizmanın Hacmi ve Yüzey Alanı Nasıl Hesaplanır?',
    seoTitle: 'Prizmanın Hacmi ve Yüzey Alanı Nasıl Bulunur?',
    description: 'Dikdörtgenler prizması ve küpün hacmi, yüzey alanı formülü, birim küplerle hacim, cm³, dm³ ve litre dönüşümü. 7. sınıf prizma problemleri çözümlü.',
    grades: [7],
    outcomes: ['MAT.7.4.1', 'MAT.7.4.2', 'MAT.7.4.3', 'MAT.7.4.4', 'MAT.7.4.5', 'MAT.7.4.6'],
    intro: 'Bir prizmanın hacmi taban alanı ile yüksekliğin çarpımıdır; dikdörtgenler prizmasında V = a × b × c olur: 5 cm × 3 cm × 4 cm’lik kutunun hacmi 60 cm³’tür. Yüzey alanı ise tüm yüzlerin alanları toplamıdır: aynı kutu için 2 × (15 + 20 + 12) = 94 cm².',
    sections: [
      {
        h: 'Hacim nedir? Birim küplerle hacim',
        p: [
          'Hacim, bir cismin uzayda kapladığı yerin ölçüsüdür. Kenarı 1 cm olan küpün hacmi 1 cm³’tür (1 santimetreküp). Bir prizmanın içine kaç birim küp sığdığını saymak hacmini verir.',
          '5 × 3’lük bir tabana 15 birim küp sığar; bu katmandan 4 tane üst üste konursa 15 × 4 = 60 birim küp olur. Formül de buradan gelir: hacim = taban alanı × yükseklik.',
        ],
      },
      {
        h: 'Prizmanın hacmi formülü',
        list: [
          'Dikdörtgenler prizması: V = a × b × c → 5 × 3 × 4 = 60 cm³',
          'Küp: V = a³ → kenarı 4 cm olan küp: 4 × 4 × 4 = 64 cm³',
          'Kare prizma: V = a² × h → tabanı 3 cm’lik kare, yüksekliği 10 cm: 9 × 10 = 90 cm³',
          'Üçgen prizma: V = taban alanı × h → taban alanı 6 cm², yükseklik 10 cm: 60 cm³',
        ],
        p: ['Hangi prizma olursa olsun önce tabanın alanını bul, sonra yükseklikle çarp.'],
      },
      {
        h: 'Prizmanın yüzey alanı',
        p: [
          'Yüzey alanı, prizmanın açınımındaki bütün yüzlerin alanları toplamıdır. Dikdörtgenler prizmasında karşılıklı yüzler eştir; bu yüzden üç farklı yüzün alanını bulup 2 ile çarpmak yeterlidir: A = 2 × (ab + ac + bc).',
          'Kutuyu kâğıtla kaplamak yüzey alanı, içine kum doldurmak hacim sorusudur. Birim farklıdır: yüzey alanı cm², hacim cm³ ile ölçülür.',
        ],
        list: ['5 × 3 × 4 prizma: 2 × (15 + 20 + 12) = 2 × 47 = 94 cm²', 'Kenarı 4 cm olan küp: 6 × 16 = 96 cm²'],
      },
      {
        h: 'Hacim ölçü birimleri: cm³, dm³, m³ ve litre',
        p: ['Hacim birimleri 1000’er 1000’er büyür, çünkü her kenar 10 kat büyüyünce hacim 10 × 10 × 10 = 1000 kat büyür. Sıvı ölçüsüyle bağlantı şöyledir:'],
        list: ['1 dm³ = 1000 cm³ = 1 L', '1 cm³ = 1 mL', '1 m³ = 1000 dm³ = 1000 L', '2,5 L = 2500 cm³'],
      },
      {
        h: 'Cisimlerin farklı yönlerden görünümleri',
        p: [
          'Birim küplerle yapılan bir yapı önden, üstten ve yandan (sağdan ya da soldan) bakılarak çizilebilir. Her görünüm, o yönden görülen karelerin düzenidir. Üstten görünümdeki karelere yapıdaki kule yüksekliklerini yazmak, yapıyı tek çizimle anlatmanın kolay yoludur.',
        ],
      },
      {
        h: '7. sınıf prizma problemleri (çözümlü)',
        p: ['Prizma problemlerinde önce sorunun hacim mi (içine ne sığar) yoksa yüzey alanı mı (dışını ne kaplar) istediğine karar ver, sonra birimleri eşitle.'],
        list: [
          'İç ölçüleri 50 cm × 30 cm × 40 cm olan akvaryum: 50 × 30 × 40 = 60 000 cm³ = 60 dm³ = 60 L su alır.',
          'Ölçüleri 6 cm × 4 cm × 4 cm olan kutuya kenarı 2 cm olan kaç küp sığar? Her yönde 3, 2 ve 2 küp → 3 × 2 × 2 = 12 küp (96 cm³ ÷ 8 cm³ = 12).',
          'Hacmi 120 cm³, taban ölçüleri 6 cm ve 5 cm olan prizmanın yüksekliği: 120 ÷ 30 = 4 cm.',
          'Kenarı 2 katına çıkan küpün hacmi 2³ = 8 katına, yüzey alanı 2² = 4 katına çıkar.',
        ],
      },
    ],
    faq: [
      { q: 'Dikdörtgenler prizmasının hacmi nasıl bulunur?', a: 'En, boy ve yükseklik çarpılır: V = a × b × c. 8 cm × 5 cm × 3 cm’lik kutunun hacmi 120 cm³’tür.' },
      { q: '1 litre kaç cm³’tür?', a: '1 L = 1 dm³ = 1000 cm³’tür. Yani 1 cm³ = 1 mL.' },
      { q: 'Hacim ile yüzey alanı arasındaki fark nedir?', a: 'Hacim cismin içine ne kadar şey sığdığını (cm³), yüzey alanı ise dışını kaplamak için ne kadar malzeme gerektiğini (cm²) gösterir.' },
      { q: 'Küpün yüzey alanı formülü nedir?', a: 'Küpün 6 eş kare yüzü vardır: A = 6 × a². Kenarı 5 cm olan küp için 6 × 25 = 150 cm².' },
    ],
    tools: ['nets', 'izometrik'],
    games: ['kristal-magarasi'],
    interactions: ['kup-yapi-gorunumleri', 'prizma-acinim-yuzey-alani', 'hacim-insaati', 'acinim-bulmacasi'],
  },
  {
    slug: 'dairenin-alani',
    title: 'Dairenin Alanı Nasıl Hesaplanır? Formül ve Örnekler',
    seoTitle: 'Dairenin Alanı Formülü: πr² ve Daire Dilimi',
    description: 'Dairenin alanı formülü πr² nereden gelir? Daire diliminin alanı, eşkenar dörtgen ve yamuğun alanı. 7. sınıf alan problemleri çözümlü örneklerle.',
    grades: [7],
    outcomes: ['MAT.7.4.7', 'MAT.7.4.8', 'MAT.7.4.9', 'MAT.7.4.10'],
    intro: 'Dairenin alanı, π ile yarıçapın karesinin çarpımıdır: A = π × r². Yarıçapı 5 cm olan dairenin alanı π = 3 alınırsa 3 × 25 = 75 cm², π = 3,14 alınırsa 78,5 cm²’dir.',
    sections: [
      {
        h: 'Daire ile çember arasındaki fark',
        p: [
          'Çember, merkeze eşit uzaklıktaki noktaların oluşturduğu kapalı eğridir; yalnızca “sınır çizgisi”dir. Daire ise çember ile içindeki bölgenin tamamıdır. Bu yüzden çemberin uzunluğu (çevresi), dairenin alanı hesaplanır.',
        ],
      },
      {
        h: 'Dairenin alanı formülü nereden gelir?',
        p: [
          'Daireyi pasta gibi çok sayıda eş dilime ayırıp dilimleri sırayla bir yukarı bir aşağı dizelim. Ortaya paralelkenara benzeyen bir şekil çıkar. Bu şeklin tabanı çemberin yarısı (π × r), yüksekliği yarıçaptır (r).',
          'Paralelkenarın alanı taban × yükseklik olduğundan dairenin alanı π × r × r = π × r² olur. Dilim sayısı arttıkça şekil gerçek bir paralelkenara daha çok benzer.',
        ],
      },
      {
        h: 'Dairenin alanı örnekleri',
        list: [
          'r = 4 cm, π = 3 → A = 3 × 16 = 48 cm²',
          'Çap 10 cm → r = 5 cm → A = 3 × 25 = 75 cm²',
          'r = 7 cm, π = 22/7 → A = 22/7 × 49 = 154 cm²',
          'Yarım daire, r = 4 cm, π = 3 → 48 ÷ 2 = 24 cm²',
        ],
        p: ['En sık hata çapı yarıçap yerine kullanmaktır. Çap 10 iken π × 10² = 300 yazmak, doğru alanın (75) 4 katını verir.'],
      },
      {
        h: 'Daire diliminin alanı',
        p: [
          'Daire dilimi, iki yarıçap ve aralarındaki yaydan oluşan parçadır. Merkez açısı α ise dilim dairenin α/360’ı kadardır: A = π × r² × α/360.',
        ],
        list: ['r = 6 cm, α = 60°, π = 3 → 108 × 60/360 = 18 cm²', 'r = 4 cm, α = 90° (çeyrek daire), π = 3 → 48 ÷ 4 = 12 cm²', 'r = 10 cm, α = 144°, π = 3 → 300 × 144/360 = 120 cm²'],
      },
      {
        h: 'Eşkenar dörtgen ve yamuğun alanı',
        p: [
          'Eşkenar dörtgenin köşegenleri birbirini dik keser. Alanı köşegen uzunluklarının çarpımının yarısıdır: A = (e × f) / 2. Eşkenar dörtgen bir paralelkenar olduğu için taban × yükseklik ile de bulunabilir.',
          'Yamuğun alanı, paralel kenarların toplamı ile yüksekliğin çarpımının yarısıdır: A = (a + c) × h / 2. İki eş yamuk ters çevrilip yan yana konursa tabanı a + c olan bir paralelkenar oluşur; formül buradan gelir.',
        ],
        list: ['Eşkenar dörtgen, köşegenler 8 cm ve 6 cm → 48 ÷ 2 = 24 cm²', 'Yamuk, tabanlar 10 cm ve 6 cm, yükseklik 4 cm → 16 × 4 ÷ 2 = 32 cm²'],
      },
      {
        h: '7. sınıf alan problemleri (çözümlü, π = 3)',
        p: ['Birleşik şekillerde alanı parçalara ayır: büyük şeklin alanından çıkarılan parçayı ya da yan yana eklenen parçaları ayrı ayrı hesapla.'],
        list: [
          '10 m × 10 m’lik kare bahçenin ortasına yarıçapı 5 m olan daire şeklinde çim ekiliyor. Çimsiz alan: 100 − 3 × 25 = 25 m².',
          'Dış yarıçapı 5 cm, iç yarıçapı 3 cm olan halkanın alanı: 3 × 25 − 3 × 9 = 75 − 27 = 48 cm².',
          'Yarıçap 2 katına çıkarsa alan 2² = 4 katına çıkar: r = 3 iken 27 cm², r = 6 iken 108 cm².',
          'Alanı 48 cm² olan dairenin yarıçapı: 3 × r² = 48 → r² = 16 → r = 4 cm.',
        ],
      },
    ],
    faq: [
      { q: 'Dairenin alanı formülü nedir?', a: 'A = π × r². r yarıçaptır; çap verilmişse önce 2’ye bölünür.' },
      { q: 'Daire diliminin alanı nasıl bulunur?', a: 'Dairenin alanı merkez açının 360°’ye oranıyla çarpılır: A = π × r² × α/360.' },
      { q: 'Yamuğun alanı nasıl hesaplanır?', a: 'Paralel iki kenar toplanır, yükseklikle çarpılır ve 2’ye bölünür: A = (a + c) × h / 2.' },
      { q: 'Eşkenar dörtgenin alanı köşegenlerle nasıl bulunur?', a: 'Köşegen uzunlukları çarpılıp 2’ye bölünür: A = (e × f) / 2.' },
      { q: 'Yarıçap iki katına çıkarsa dairenin alanı ne olur?', a: 'Alan r²’ye bağlı olduğu için 4 katına çıkar.' },
    ],
    tools: ['alancevre'],
    games: ['hata-avcisi'],
    interactions: ['tahmin-test-acikla', 'eksik-bilgi'],
  },
  {
    slug: 'ucgen-esitsizligi',
    title: 'Üçgen Eşitsizliği Nedir? Üçüncü Kenar Nasıl Bulunur?',
    seoTitle: 'Üçgen Eşitsizliği ve Açı-Kenar İlişkisi (8. Sınıf)',
    description: 'Üçgen eşitsizliği nedir, üçüncü kenar hangi aralıkta olur? Üçgende büyük açının karşısındaki kenar. 8. sınıf LGS soruları çözümlü, interaktif etkinlik.',
    grades: [8],
    outcomes: ['MAT.8.3.1', 'MAT.8.3.2'],
    intro: 'Bir üçgende herhangi bir kenarın uzunluğu, diğer iki kenarın farkından büyük, toplamından küçüktür: |a − b| < c < a + b. Kenarları 5 cm ve 8 cm olan bir üçgenin üçüncü kenarı 3 cm’den uzun, 13 cm’den kısadır.',
    sections: [
      {
        h: 'Üçgen eşitsizliği neden var?',
        p: [
          'İki çubuğun uçlarını üçüncü bir çubuğun uçlarına birleştirmeye çalıştığını düşün. 3 cm ve 4 cm’lik çubuklar, 8 cm’lik çubuğun iki ucuna yetişemez; çünkü uç uca dizildiklerinde bile 7 cm ederler. Bu yüzden iki kenarın toplamı her zaman üçüncü kenardan büyük olmalıdır.',
          'Toplam üçüncü kenara tam eşitse (4 cm, 5 cm ve 9 cm gibi) çubuklar düz bir çizgi üzerine yatar ve üçgen oluşmaz.',
        ],
      },
      {
        h: 'Üç uzunluk üçgen oluşturur mu?',
        p: ['Kısa yol: En uzun kenarın diğer iki kenarın toplamından küçük olup olmadığına bak. Bu sağlanıyorsa diğer eşitsizlikler de kendiliğinden sağlanır.'],
        list: ['3, 4, 5 → 5 < 3 + 4 = 7 → üçgen olur', '3, 4, 8 → 8 > 7 → üçgen olmaz', '4, 5, 9 → 9 = 9 → üçgen olmaz', '6, 6, 11 → 11 < 12 → üçgen olur'],
      },
      {
        h: 'Üçüncü kenarın alabileceği değerler',
        p: ['İki kenarı bilinen üçgende üçüncü kenar, farkla toplam arasında kalır. Tam sayı değerlerini sayarken uç değerler dahil edilmez.'],
        list: [
          'Kenarlar 5 ve 8 → 3 < c < 13 → tam sayı değerleri 4, 5, …, 12 → 9 farklı değer',
          'Kenarlar 7 ve 7 → 0 < c < 14 → 1’den 13’e kadar 13 değer',
          'Kenarlar 2 ve 10 → 8 < c < 12 → 9, 10, 11',
        ],
      },
      {
        h: 'Üçgende açı-kenar ilişkisi',
        p: [
          'Bir üçgende büyük açının karşısında büyük kenar, küçük açının karşısında küçük kenar bulunur. Tersi de doğrudur: en uzun kenarın karşısındaki açı en büyük açıdır.',
          'Örneğin ABC üçgeninde m(A) = 70°, m(B) = 50° ise m(C) = 180° − 120° = 60°’dir. Açılar 70° > 60° > 50° olduğundan karşı kenarlar da a > c > b sırasındadır (a, A açısının karşısındaki kenardır). Eşkenar üçgende tüm açılar 60°, ikizkenar üçgende eş kenarların karşısındaki açılar eşittir.',
        ],
      },
      {
        h: '8. sınıf üçgen eşitsizliği LGS soruları (çözümlü)',
        list: [
          'Kenarları 6 cm ve 10 cm olan üçgenin üçüncü kenarı tam sayıdır. Çevresi en çok kaç cm? 4 < c < 16 → c en çok 15 → çevre 6 + 10 + 15 = 31 cm. En az: c = 5 → 21 cm.',
          'ABC üçgeninde AB = 7 cm, BC = 9 cm ve en büyük açı B’dir. AC’nin tam sayı değerleri: AC en uzun kenar olmalı → 9 < AC < 16 → 10, 11, 12, 13, 14, 15 → 6 değer.',
          'İkizkenar üçgenin iki kenarı 4 cm ve 9 cm. Üçüncü kenar 4 olamaz (4 + 4 < 9), o hâlde 9 cm’dir ve çevre 4 + 9 + 9 = 22 cm’dir.',
        ],
        p: ['Çubukların uzunluklarını değiştirip üçgenin ne zaman “kapandığını” görmek için sitedeki Üçgen Oluşturucu’yu kullanabilirsin.'],
      },
    ],
    faq: [
      { q: 'Üçgen eşitsizliği kuralı nedir?', a: 'Bir üçgende her kenar, diğer iki kenarın farkının mutlak değerinden büyük, toplamından küçüktür: |a − b| < c < a + b.' },
      { q: '3, 4 ve 7 cm ile üçgen çizilebilir mi?', a: 'Hayır. 3 + 4 = 7, en uzun kenara eşittir; kenarlar düz bir çizgi oluşturur, üçgen kapanmaz.' },
      { q: 'Üçgende en büyük açının karşısında hangi kenar vardır?', a: 'En uzun kenar. Açılar büyüdükçe karşılarındaki kenarlar da uzar.' },
      { q: 'Kenarları 5 ve 8 olan üçgenin üçüncü kenarı kaç farklı tam sayı olabilir?', a: '3 < c < 13 olduğundan 4’ten 12’ye kadar 9 farklı tam sayı değeri alabilir.' },
    ],
    tools: ['dinamikucgen'],
    games: ['kopru-muhendisi', 'hata-avcisi'],
    interactions: ['ucgen-olusturucu', 'karsi-ornek'],
  },
  {
    slug: 'es-ve-benzer-ucgenler',
    title: 'Eş ve Benzer Üçgenler Nedir? Benzerlik Oranı Nasıl Bulunur?',
    seoTitle: 'Eş ve Benzer Üçgenler: Benzerlik Oranı (8. Sınıf)',
    description: 'Eş üçgen ile benzer üçgen arasındaki fark nedir? Benzerlik oranı, eksik kenar bulma, çevre ve alan oranı, gölge problemleri. 8. sınıf LGS soruları çözümlü.',
    grades: [8],
    outcomes: ['MAT.8.3.3', 'MAT.8.3.4'],
    intro: 'Karşılıklı bütün kenarları ve açıları eşit olan üçgenler eştir (≅). Karşılıklı açıları eşit, karşılıklı kenarları orantılı olan üçgenler ise benzerdir (∼); kenarların oranına benzerlik oranı denir. Eş üçgenler, benzerlik oranı 1 olan benzer üçgenlerdir.',
    sections: [
      {
        h: 'Eş üçgenler',
        p: [
          'İki üçgenden biri döndürülerek, kaydırılarak ya da ters çevrilerek diğerinin üzerine tam olarak oturtulabiliyorsa bu üçgenler eştir. Eş üçgenlerde karşılıklı kenarlar ve karşılıklı açılar eşittir. ABC ≅ DEF yazıldığında harflerin sırası eşleşmeyi gösterir: A ↔ D, B ↔ E, C ↔ F.',
          'Eşliği göstermek için altı ölçünün hepsine bakmak gerekmez. Üç kenarı karşılıklı eşit olan (KKK), iki kenarı ve aralarındaki açısı eşit olan (KAK) ya da bir kenarı ve bu kenara komşu iki açısı eşit olan (AKA) üçgenler eştir.',
        ],
      },
      {
        h: 'Benzer üçgenler',
        p: [
          'Benzer üçgenler aynı biçimde ama farklı büyüklükte olabilir; biri diğerinin büyütülmüş ya da küçültülmüş hâlidir. Karşılıklı açılar eşit, karşılıklı kenarların oranı sabittir.',
          'Üçgenin iç açıları toplamı 180° olduğu için iki açısı karşılıklı eşit olan üçgenlerin üçüncü açıları da eşittir; bu yüzden iki açının eşit olması benzerlik için yeterlidir.',
        ],
        list: ['Bütün eşkenar üçgenler birbirine benzerdir.', 'Bütün kareler benzerdir; ama bütün dikdörtgenler benzer değildir (2 × 4 ile 2 × 3 gibi).', 'Açıları 30°, 60°, 90° olan bütün üçgenler benzerdir.'],
      },
      {
        h: 'Benzerlik oranı ile eksik kenarı bulma',
        p: ['ABC ∼ DEF ve AB = 4 cm, BC = 6 cm, AC = 5 cm, DE = 8 cm olsun. Benzerlik oranı DE/AB = 8/4 = 2’dir. Öyleyse EF = 6 × 2 = 12 cm ve DF = 5 × 2 = 10 cm’dir.'],
        list: ['Kenar oranı: k', 'Çevre oranı: k (15 cm’lik çevre 30 cm olur)', 'Alan oranı: k² (kenarlar 2 katına çıkınca alan 4 katına çıkar)', 'Açılar değişmez'],
      },
      {
        h: 'Gölge ve yükseklik problemleri',
        p: [
          'Aynı anda güneş ışınları yere aynı açıyla düştüğü için bir cisim ile gölgesinin oluşturduğu dik üçgenler benzerdir. Boyu 1,5 m olan bir çocuğun gölgesi 2 m iken bir ağacın gölgesi 12 m ise ağacın boyu h için h/12 = 1,5/2 → h = 9 m olur.',
        ],
      },
      {
        h: '8. sınıf eşlik ve benzerlik LGS soruları (çözümlü)',
        list: [
          'Kenarları 3, 4, 5 cm olan üçgene benzer bir üçgenin en uzun kenarı 15 cm. Benzerlik oranı 15/5 = 3 → kenarlar 9, 12, 15 cm, çevre 36 cm.',
          'Benzerlik oranı 3 olan iki üçgenden küçüğünün alanı 10 cm² ise büyüğünün alanı 10 × 3² = 90 cm²’dir.',
          'Bir fotoğraf 10 cm × 15 cm’dir. Kısa kenarı 30 cm olacak şekilde benzer olarak büyütülürse uzun kenarı 15 × 3 = 45 cm olur.',
        ],
        p: ['Benzerlik sorularında önce eşleşen köşeleri aynı sırayla yaz; kenarları yanlış eşleştirmek en sık yapılan hatadır.'],
      },
    ],
    faq: [
      { q: 'Eş üçgen ile benzer üçgen arasındaki fark nedir?', a: 'Eş üçgenlerin hem açıları hem kenarları karşılıklı eşittir. Benzer üçgenlerin açıları eşit, kenarları ise orantılıdır; büyüklükleri farklı olabilir.' },
      { q: 'Benzerlik oranı nasıl bulunur?', a: 'Karşılıklı iki kenarın uzunluğu birbirine bölünür. Eşleşen bütün kenar çiftleri aynı oranı vermelidir.' },
      { q: 'Benzer üçgenlerin alanları oranı nedir?', a: 'Benzerlik oranının karesidir. Kenarlar 3 katına çıkarsa alan 9 katına çıkar.' },
      { q: 'Bütün ikizkenar üçgenler benzer midir?', a: 'Hayır. Tepe açısı 40° olan ikizkenar üçgen ile tepe açısı 100° olan ikizkenar üçgenin açıları farklıdır, bu yüzden benzer değildir.' },
    ],
    tools: ['dinamikucgen'],
    games: ['kopru-muhendisi'],
    interactions: ['ucgen-olusturucu', 'karsi-ornek'],
  },
  {
    slug: 'silindir',
    title: 'Silindirin Yüzey Alanı ve Hacmi Nasıl Hesaplanır?',
    seoTitle: 'Silindirin Hacmi ve Yüzey Alanı Formülü (8. Sınıf)',
    description: 'Silindirin açınımı, yüzey alanı (2πr² + 2πrh) ve hacmi (πr²h) nasıl bulunur? Prizma, piramit ve koni açınımları. 8. sınıf LGS silindir soruları çözümlü.',
    grades: [8],
    outcomes: ['MAT.8.4.1', 'MAT.8.4.2', 'MAT.8.4.3'],
    intro: 'Silindirin hacmi taban alanı ile yüksekliğin çarpımıdır: V = π × r² × h. Yüzey alanı iki taban dairesi ile yanal yüzün toplamıdır: A = 2πr² + 2πrh. Yarıçapı 3 cm, yüksekliği 10 cm olan silindirin hacmi π = 3 için 270 cm³, yüzey alanı 234 cm²’dir.',
    sections: [
      {
        h: 'Silindirin açınımı',
        p: [
          'Bir konserve kutusunun etiketini dikey kesip açarsak bir dikdörtgen elde ederiz. Silindirin açınımı iki eş daire (alt ve üst taban) ile bir dikdörtgenden (yanal yüz) oluşur.',
          'Dikdörtgenin bir kenarı silindirin yüksekliği h’dir, diğer kenarı ise taban çemberinin çevresi 2πr’dir; çünkü etiket kutunun etrafını tam bir kez dolanır.',
        ],
      },
      {
        h: 'Silindirin yüzey alanı formülü',
        list: ['Bir taban alanı: π × r²', 'Yanal alan: 2πr × h', 'Yüzey alanı: 2πr² + 2πrh'],
        p: [
          'Örnek: r = 3 cm, h = 10 cm, π = 3 → iki taban 2 × 3 × 9 = 54 cm², yanal alan 2 × 3 × 3 × 10 = 180 cm², toplam 234 cm².',
          'Kapaksız bir bardak için yalnızca bir taban alınır: π × r² + 2πrh.',
        ],
      },
      {
        h: 'Silindirin hacmi formülü',
        p: [
          'Silindir, tabanı daire olan bir prizma gibi düşünülebilir: taban alanı yükseklik boyunca üst üste dizilir. Bu yüzden V = π × r² × h’dir.',
        ],
        list: ['r = 3 cm, h = 10 cm, π = 3 → 3 × 9 × 10 = 270 cm³', 'r = 10 cm, h = 30 cm, π = 3 → 9000 cm³ = 9 L', 'Yarıçap 2 katına çıkarsa hacim 4 katına; yükseklik 2 katına çıkarsa hacim 2 katına çıkar.'],
      },
      {
        h: 'Prizma, piramit ve koni açınımları',
        list: [
          'Dikdörtgenler prizması: 6 dikdörtgen yüz (karşılıklı yüzler eş)',
          'Üçgen prizma: 2 üçgen taban + 3 dikdörtgen yanal yüz',
          'Kare piramit: 1 kare taban + 4 üçgen yanal yüz',
          'Koni: 1 daire taban + 1 daire dilimi (yanal yüz)',
          'Silindir: 2 daire taban + 1 dikdörtgen yanal yüz',
        ],
        p: ['Prizmalarda iki taban vardır ve yanal yüzler dikdörtgendir; piramitlerde tek taban vardır ve yanal yüzler üçgendir. Koni, piramidin tabanı daire olan hâli gibi düşünülebilir.'],
      },
      {
        h: '8. sınıf silindir LGS soruları (çözümlü, π = 3)',
        p: ['Silindir sorularında önce açınımı düşün: hangi uzunluk yükseklik, hangisi taban çevresi? Sonra soru hacim mi, yüzey alanı mı, yoksa yalnızca yanal alan mı, ona karar ver.'],
        list: [
          'A silindirinde r = 2 cm, h = 9 cm; B silindirinde r = 3 cm, h = 4 cm. Hacimler: A = 3 × 4 × 9 = 108 cm³, B = 3 × 9 × 4 = 108 cm³ → hacimler eşit. Yanal alanlar: A = 2 × 3 × 2 × 9 = 108 cm², B = 2 × 3 × 3 × 4 = 72 cm² → farklı.',
          'Yarıçapı 4 cm, yüksekliği 12 cm olan kutunun etiketinin alanı (yanal alan): 2 × 3 × 4 × 12 = 288 cm².',
          'Hacmi 375 cm³, yarıçapı 5 cm olan silindirin yüksekliği: 3 × 25 × h = 375 → h = 5 cm.',
          'Yanal yüzü 30 cm × 12 cm olan dikdörtgenden yapılan silindirde taban çevresi 30 cm ise 2 × 3 × r = 30 → r = 5 cm, h = 12 cm.',
        ],
      },
    ],
    faq: [
      { q: 'Silindirin hacmi formülü nedir?', a: 'V = π × r² × h. Önce taban dairesinin alanı bulunur, sonra yükseklikle çarpılır.' },
      { q: 'Silindirin yüzey alanı nasıl hesaplanır?', a: 'İki taban alanı ile yanal alan toplanır: 2πr² + 2πrh.' },
      { q: 'Silindirin açınımında dikdörtgenin kenarları neyi gösterir?', a: 'Bir kenar silindirin yüksekliği, diğer kenar taban çemberinin çevresidir (2πr).' },
      { q: 'Koninin açınımı hangi şekillerden oluşur?', a: 'Bir daire (taban) ve bir daire diliminden (yanal yüz) oluşur.' },
    ],
    tools: ['nets'],
    games: ['kristal-magarasi'],
    interactions: ['acinim-bulmacasi', 'hacim-insaati'],
  },
  {
    slug: 'donusum-geometrisi',
    title: 'Öteleme ve Yansıma Nedir? Koordinat Düzleminde Dönüşümler',
    seoTitle: 'Öteleme ve Yansıma: Dönüşüm Geometrisi (7–8. Sınıf)',
    description: 'Öteleme ve yansıma nedir, koordinat düzleminde nasıl yapılır? x ve y eksenine göre yansıma, ardışık dönüşümler. 7–8. sınıf dönüşüm geometrisi LGS soruları.',
    grades: [7, 8],
    outcomes: ['MAT.7.3.1', 'MAT.8.5.1', 'MAT.8.5.2', 'MAT.8.5.3'],
    intro: 'Öteleme, bir şekli döndürmeden belirli bir yönde ve uzaklıkta kaydırmaktır; yansıma ise şeklin bir doğruya göre ayna görüntüsünü almaktır. Koordinat düzleminde x eksenine göre yansımada (x, y) noktası (x, −y), y eksenine göre yansımada (−x, y) olur.',
    sections: [
      {
        h: 'Dönüşüm nedir? Şekil neden değişmez?',
        p: [
          'Öteleme ve yansıma, şeklin yerini değiştiren ama büyüklüğünü ve biçimini değiştirmeyen dönüşümlerdir. Görüntü ile ilk şekil eştir: kenar uzunlukları ve açı ölçüleri aynı kalır.',
          'Fark yöndedir: ötelemede şeklin yönü korunur, yansımada ise sağ ile sol yer değiştirir. Aynadaki sağ elin sol el gibi görünmesi bu yüzdendir.',
        ],
      },
      {
        h: 'Yansıma ve simetri doğrusu (7. sınıf)',
        p: [
          'Bir noktanın bir doğruya göre yansıması, doğrunun öbür tarafında ve doğruya aynı uzaklıktadır. Nokta ile görüntüsünü birleştiren doğru parçası yansıma doğrusuna diktir ve bu doğru tarafından ortalanır.',
          'Bir şeklin yansımasını çizmek için köşelerin her birini tek tek yansıtıp görüntü noktalarını aynı sırayla birleştirmek yeterlidir. Kareli kâğıtta kareleri saymak işi kolaylaştırır.',
        ],
      },
      {
        h: 'Koordinat düzleminde öteleme',
        p: ['Sağa öteleme x’e ekler, sola öteleme x’ten çıkarır; yukarı öteleme y’ye ekler, aşağı öteleme y’den çıkarır.'],
        list: ['A(2, 3) → 4 birim sağa, 2 birim aşağı → A′(6, 1)', 'B(−1, 5) → 3 birim sola → B′(−4, 5)', 'C(0, −2) → 6 birim yukarı → C′(0, 4)'],
      },
      {
        h: 'x ve y eksenine göre yansıma',
        list: [
          'x eksenine göre: (x, y) → (x, −y) → A(3, 2) → A′(3, −2)',
          'y eksenine göre: (x, y) → (−x, y) → A(3, 2) → A′(−3, 2)',
          'Eksen üzerindeki nokta kendi kendinin görüntüsüdür: (4, 0)’ın x eksenine göre yansıması yine (4, 0)’dır.',
        ],
        p: ['Hangi eksene göre yansıtıyorsan o eksenin koordinatı aynı kalır, diğerinin işareti değişir.'],
      },
      {
        h: 'Ardışık dönüşümler: sıra önemli mi?',
        p: [
          'Bir şekle art arda birden çok dönüşüm uygulanabilir. A(1, 4) noktası önce x eksenine göre yansıtılıp (1, −4), sonra 3 birim sola ötelenirse (−2, −4) olur.',
          'Sıra bazen sonucu değiştirir. A(1, 4)’ü önce 2 birim yukarı öteleyip (1, 6) sonra x eksenine göre yansıtırsak (1, −6); önce yansıtıp (1, −4) sonra 2 birim yukarı ötelersek (1, −2) buluruz. Bu yüzden sorulardaki sıraya dikkat et.',
        ],
      },
      {
        h: '8. sınıf dönüşüm geometrisi LGS soruları (çözümlü)',
        p: ['Her adımda yalnızca bir koordinatı değiştir ve ara sonucu yaz; ardışık dönüşümlerde hata çoğunlukla adımları birleştirirken yapılır.'],
        list: [
          'K(−2, 3) noktası y eksenine göre yansıtılıp 5 birim aşağı ötelenirse: (2, 3) → (2, −2).',
          'Bir üçgenin köşeleri A(1, 1), B(4, 1), C(1, 3). x eksenine göre yansıması: A′(1, −1), B′(4, −1), C′(1, −3). Kenar uzunlukları değişmez; AB = A′B′ = 3 birim.',
          'P(5, −2) noktası hangi ötelemeyle P′(1, 4)’e gider? x: 5 → 1 (4 birim sola), y: −2 → 4 (6 birim yukarı).',
        ],
      },
    ],
    faq: [
      { q: 'Öteleme ile yansıma arasındaki fark nedir?', a: 'İkisi de şeklin boyutunu ve biçimini korur. Ötelemede şeklin yönü aynı kalır; yansımada şekil ayna görüntüsüne döner, sağ ile sol yer değiştirir.' },
      { q: 'x eksenine göre yansımada hangi koordinat değişir?', a: 'y koordinatının işareti değişir, x aynı kalır: (x, y) → (x, −y).' },
      { q: 'y eksenine göre yansıma nasıl yapılır?', a: 'x koordinatının işareti değiştirilir: (x, y) → (−x, y). (−5, 2)’nin görüntüsü (5, 2)’dir.' },
      { q: 'Ardışık dönüşümlerde sıra önemli midir?', a: 'Bazen önemlidir. Örneğin x eksenine göre yansıma ile yukarı-aşağı ötelemenin sırası değişirse farklı noktalar elde edilir; bu yüzden işlemler sorudaki sırayla yapılmalıdır.' },
    ],
    tools: ['donusum', 'coordinate'],
    games: ['lazer-lab', 'gemiler'],
    interactions: ['donusum-studyosu', 'aynadaki-sekil', 'katla-ac'],
  },
  {
    slug: 'carpanlar-ve-katlar',
    title: 'Çarpanlar ve Katlar Nedir? Bir Sayının Çarpanları Nasıl Bulunur?',
    seoTitle: 'Çarpanlar ve Katlar: Çarpan Ağacı ve Örnekler',
    description: 'Bir sayının çarpanları ve katları nasıl bulunur? Çarpan ağacı, bölen merdiveni, asal çarpanlara ayırma ve bölen sayısı. 6. ve 8. sınıf LGS soruları çözümlü.',
    grades: [6, 8],
    outcomes: ['MAT.6.1.1', 'MAT.6.1.3'],
    intro: 'Bir sayıyı kalansız bölen doğal sayılar o sayının çarpanlarıdır; bir sayının doğal sayılarla çarpımları ise o sayının katlarıdır. 36’nın çarpanları 1, 2, 3, 4, 6, 9, 12, 18, 36’dır; 6’nın katları 6, 12, 18, 24, … diye sonsuza kadar sürer.',
    sections: [
      {
        h: 'Çarpan ile kat arasındaki fark',
        p: [
          '6 × 4 = 24 eşitliğinde 6 ve 4, 24’ün çarpanlarıdır; 24 ise hem 6’nın hem 4’ün katıdır. Bir sayının çarpanları sınırlıdır ve sayıdan büyük olamaz; katları ise sonsuzdur ve sayının kendisinden başlar.',
          '1 her sayının çarpanıdır, her sayı kendi kendinin hem çarpanı hem katıdır. 0 da her doğal sayının katıdır (6 × 0 = 0), ama sorularda genellikle pozitif katlar istenir.',
        ],
      },
      {
        h: 'Bir sayının çarpanları nasıl bulunur?',
        p: [
          'Çarpanları çiftler hâlinde aramak hiçbirini kaçırmamanın en kolay yoludur: 1’den başlayıp sayıyı bölen her sayıyı ve bölümünü yaz. Çiftler birbirine yaklaşıp kesişince dur.',
          'Bu yöntem, alanı o sayı olan bütün dikdörtgenleri bulmakla aynıdır: 36 birim karelik dikdörtgenler 1 × 36, 2 × 18, 3 × 12, 4 × 9 ve 6 × 6’dır.',
        ],
        list: ['36 → 1 × 36, 2 × 18, 3 × 12, 4 × 9, 6 × 6 → 9 çarpan', '48 → 1 × 48, 2 × 24, 3 × 16, 4 × 12, 6 × 8 → 10 çarpan', '17 → 1 × 17 → 2 çarpan (asal sayı)'],
      },
      {
        h: 'Asal çarpanlara ayırma: çarpan ağacı ve bölen merdiveni',
        p: [
          'Her doğal sayı (1’den büyük) asal sayıların çarpımı olarak tek bir biçimde yazılabilir. Çarpan ağacında sayı iki çarpana ayrılır, asal olmayan dallar asal sayılara ulaşana kadar ayrılmaya devam eder: 60 → 6 × 10 → 2 × 3 × 2 × 5 = 2² × 3 × 5.',
          'Bölen merdiveninde sayı en küçük asal sayıdan başlayarak sırayla bölünür: 60 ÷ 2 = 30, 30 ÷ 2 = 15, 15 ÷ 3 = 5, 5 ÷ 5 = 1. Soldaki bölenler asal çarpanlardır. Hangi yoldan gidilirse gidilsin sonuç aynıdır. Asal sayıların ayrıntısı için Asal Sayı rehberine, ortak bölen ve katlar için EBOB-EKOK rehberine bakabilirsin.',
        ],
        list: ['72 = 2³ × 3²', '90 = 2 × 3² × 5', '100 = 2² × 5²'],
      },
      {
        h: 'Bölen (çarpan) sayısını hızlı bulma',
        p: [
          'Asal çarpanlara ayrılmış bir sayıda her üssü 1 artırıp çarpmak, pozitif bölen sayısını verir. 60 = 2² × 3¹ × 5¹ için (2 + 1) × (1 + 1) × (1 + 1) = 12 bölen vardır: 1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60.',
          'Bir sayının bölen sayısı tekse sayı tam karedir; çünkü yalnızca tam karelerde bir çift kendisiyle eşleşir (36’da 6 × 6 gibi).',
        ],
      },
      {
        h: 'Çarpanlar ve katlar LGS soruları (çözümlü)',
        p: ['LGS’de çarpanlar ve katlar genellikle alan, paketleme ve sıralama problemleri içinde sorulur; sayıyı önce asal çarpanlarına ayırmak çoğu soruyu kısaltır.'],
        list: [
          'Alanı 48 cm² olan ve kenarları tam sayı olan kaç farklı dikdörtgen çizilebilir? 1 × 48, 2 × 24, 3 × 16, 4 × 12, 6 × 8 → 5 dikdörtgen. Çevresi en küçük olan 6 × 8: 28 cm.',
          'Asal çarpanları 2, 3 ve 5 olan en küçük iki basamaklı sayı: 2 × 3 × 5 = 30.',
          '1’den 50’ye kadar 7’nin kaç katı vardır? 50 ÷ 7 = 7 kalan 1 → 7, 14, …, 49 → 7 tane.',
          'Bir sayının asal çarpanları 2 ve 7’dir ve sayı 30 ile 60 arasındadır. 2 × 7 = 14, 2² × 7 = 28, 2 × 7² = 98, 2³ × 7 = 56 → sayı 56’dır.',
        ],
      },
    ],
    faq: [
      { q: 'Bir sayının çarpanları ve katları arasındaki fark nedir?', a: 'Çarpanlar sayıyı kalansız bölen sayılardır ve sınırlıdır; katlar sayının 1, 2, 3, … ile çarpımlarıdır ve sonsuzdur.' },
      { q: '24’ün çarpanları nelerdir?', a: '1, 2, 3, 4, 6, 8, 12 ve 24. Çiftler hâlinde: 1 × 24, 2 × 12, 3 × 8, 4 × 6.' },
      { q: 'Çarpan ağacı nasıl yapılır?', a: 'Sayı iki çarpana ayrılır; asal olmayan çarpanlar da yeniden ikiye ayrılır. Bütün dallar asal sayıyla bitince bu asal sayılar çarpılarak yazılır.' },
      { q: '1 asal çarpan mıdır?', a: 'Hayır. 1 asal sayı değildir, bu yüzden asal çarpanlara ayırmada yazılmaz.' },
      { q: 'Bölen sayısı nasıl bulunur?', a: 'Sayı asal çarpanlarına ayrılır, her üsse 1 eklenip sonuçlar çarpılır. 72 = 2³ × 3² için (3 + 1) × (2 + 1) = 12 bölen vardır.' },
    ],
    tools: ['carpanagaci', 'kalbur'],
    games: ['gokkusagi-carpanlar', 'asal-agaci', 'bolen-merdiveni', 'carpan-fabrikasi'],
    interactions: ['carpan-kutulari', 'dikdortgen-alanlari'],
  },
  {
    slug: 'koordinat-sistemi',
    title: 'Koordinat Sistemi Nedir? Nokta Nasıl Gösterilir?',
    seoTitle: 'Koordinat Sistemi: Eksenler, Sıralı İkili, Bölgeler',
    description: 'Koordinat sistemi nedir? x ve y ekseni, orijin, sıralı ikili, bölgeler ve doğrusal ilişkilerin tablo ile grafiği. 8. sınıf LGS soruları çözümlü.',
    grades: [8],
    outcomes: ['MAT.8.2.1', 'MAT.8.2.2'],
    intro: 'Koordinat sistemi, birbirini 0 noktasında dik kesen iki sayı doğrusundan oluşur: yatay olan x ekseni, dikey olan y eksenidir. Düzlemdeki her nokta (x, y) sıralı ikilisiyle gösterilir; A(3, −2) noktası orijinden 3 birim sağda ve 2 birim aşağıdadır.',
    sections: [
      {
        h: 'Eksenler, orijin ve sıralı ikili',
        p: [
          'Yatay eksene x ekseni (apsis ekseni), dikey eksene y ekseni (ordinat ekseni) denir. Eksenlerin kesiştiği nokta orijindir ve koordinatları (0, 0)’dır.',
          'Sıralı ikilide sıra önemlidir: önce x (sağa-sola), sonra y (yukarı-aşağı) yazılır. Bu yüzden (3, −2) ile (−2, 3) farklı noktalardır. “Önce koridorda yürü, sonra merdivenden çık” diye hatırlayabilirsin.',
        ],
      },
      {
        h: 'Koordinat düzleminde bölgeler',
        p: ['Eksenler düzlemi dört bölgeye ayırır. Bölgeler sağ üstten başlayarak saat yönünün tersine numaralanır:'],
        list: [
          'I. bölge: (+, +) → (2, 5)',
          'II. bölge: (−, +) → (−3, 2)',
          'III. bölge: (−, −) → (−1, −4)',
          'IV. bölge: (+, −) → (3, −2)',
          'Eksenler üzerindeki noktalar hiçbir bölgeye ait değildir: (0, 5) y ekseninde, (−4, 0) x ekseninde.',
        ],
      },
      {
        h: 'Koordinatlarla uzunluk ve alan',
        p: [
          'Aynı yatay doğrudaki iki noktanın arası x’lerin farkı, aynı dikey doğrudakilerinki y’lerin farkıdır. A(1, 1), B(5, 1), C(5, 4), D(1, 4) dikdörtgeninde AB = 5 − 1 = 4 birim, BC = 4 − 1 = 3 birim, alan 4 × 3 = 12 birim karedir.',
        ],
      },
      {
        h: 'Doğrusal ilişki: tablodan grafiğe',
        p: [
          'İki değişken arasındaki ilişki y = 2x + 1 gibi bir kuralla verilirse, x’e değerler verilip bir tablo yapılır; tablodaki her satır koordinat düzleminde bir nokta olur. Noktalar aynı doğru üzerinde sıralanıyorsa ilişki doğrusaldır.',
          'Tablodan anlamanın yolu: x eşit adımlarla artarken y de hep aynı miktarda artıyor ya da azalıyorsa ilişki doğrusaldır. Bu sabit artış doğrunun eğimidir (ayrıntısı Eğim rehberinde).',
        ],
        list: ['y = 2x + 1 → (0, 1), (1, 3), (2, 5), (3, 7): y her adımda 2 artıyor → doğrusal', 'x: 1, 2, 3, 4 → y: 1, 4, 9, 16: artışlar 3, 5, 7 → doğrusal değil'],
      },
      {
        h: '8. sınıf koordinat sistemi LGS soruları (çözümlü)',
        p: ['Noktayı yerleştirirken önce x’e göre sağa-sola, sonra y’ye göre yukarı-aşağı git; doğrusal ilişki sorularında başlangıç değerini (x = 0) ve sabit artışı ayrı ayrı belirle.'],
        list: [
          'A(−3, 2) noktası hangi bölgededir? x negatif, y pozitif → II. bölge.',
          'x ekseninin 4 birim altında, y ekseninin 2 birim solunda olan nokta: (−2, −4).',
          'Bir taksi açılışta 20 TL, her kilometre için 15 TL alıyor: y = 15x + 20. 8 km için y = 15 × 8 + 20 = 140 TL. Grafik (0, 20) noktasından başlar.',
          'Bir mum her saatte 2 cm kısalıyor ve boyu 18 cm: y = 18 − 2x. Mum 9 saatte biter (y = 0 → x = 9).',
        ],
      },
    ],
    faq: [
      { q: 'Koordinat sisteminde önce hangi sayı yazılır?', a: 'Önce x (yatay), sonra y (dikey) koordinatı yazılır: (x, y).' },
      { q: 'Orijin nedir?', a: 'x ve y eksenlerinin kesiştiği (0, 0) noktasıdır.' },
      { q: 'Eksen üzerindeki nokta hangi bölgededir?', a: 'Hiçbir bölgede değildir. Bölgeler eksenlerin arasında kalan alanlardır; (0, 3) y ekseni, (5, 0) x ekseni üzerindedir.' },
      { q: 'Doğrusal ilişki tablodan nasıl anlaşılır?', a: 'x düzenli arttıkça y’deki artış (ya da azalış) hep aynıysa ilişki doğrusaldır ve grafiği bir doğrudur.' },
    ],
    tools: ['coordinate', 'grafiklab'],
    games: ['gemiler', 'trafik-simulatoru', 'makine'],
    interactions: ['dogrusal-iliski'],
  },
  {
    slug: 'veri-analizi-ve-grafikler',
    title: 'Hangi Veri İçin Hangi Grafik? Daire, Sütun ve Çizgi Grafiği',
    seoTitle: 'Veri Analizi: Daire, Sütun ve Çizgi Grafiği (8. Sınıf)',
    description: 'Daire grafiği, sütun ve çizgi grafiği ne zaman kullanılır? Daire grafiğinde merkez açı hesaplama, grafikler arası dönüşüm. 7–8. sınıf LGS soruları.',
    grades: [7, 8],
    outcomes: ['MAT.7.6.2', 'MAT.8.6.1', 'MAT.8.6.2'],
    intro: 'Kategorileri karşılaştırmak için sütun grafiği, zaman içindeki değişimi göstermek için çizgi grafiği, bir bütünün parçalarını göstermek için daire grafiği kullanılır. Daire grafiğinde her dilimin merkez açısı (değer ÷ toplam) × 360° ile bulunur.',
    sections: [
      {
        h: 'Veri analizi süreci',
        p: [
          'Bir istatistiksel araştırma soru sormakla başlar, veri toplamayla sürer, verinin uygun bir tablo ya da grafikle gösterilmesi ve yorumlanmasıyla biter. Doğru grafiği seçmek, verinin anlattığı hikâyeyi görünür kılar.',
        ],
      },
      {
        h: 'Hangi grafik ne zaman kullanılır?',
        list: [
          'Sütun grafiği: kategorileri karşılaştırmak için (sınıftaki öğrencilerin en sevdiği meyveler).',
          'İkili sütun grafiği: iki grubu aynı kategorilerde karşılaştırmak için (kızlar ve erkeklerin spor tercihleri).',
          'Çizgi grafiği: zaman içindeki değişimi göstermek için (bir haftalık sıcaklık).',
          'Daire grafiği: bir bütünün parçalara nasıl dağıldığını göstermek için (aile bütçesinin harcama kalemleri).',
        ],
        p: ['Çizgi grafiğinde noktalar arasındaki çizgi “ara değerler” olduğunu anlatır; bu yüzden kategoriler arasında (elma ile armut arasında) çizgi grafiği kullanılmaz.'],
      },
      {
        h: 'Daire grafiği nasıl çizilir? Merkez açı hesaplama',
        p: [
          'Dairenin tamamı 360°’dir ve verinin toplamını gösterir. Her kategorinin dilimi, toplam içindeki payı kadar açıyla çizilir: merkez açı = (kategori ÷ toplam) × 360°.',
          '40 öğrencinin en sevdiği spor: futbol 15, basketbol 10, voleybol 9, yüzme 6. Açılar: 15/40 × 360 = 135°, 10/40 × 360 = 90°, 9/40 × 360 = 81°, 6/40 × 360 = 54°. Kontrol: 135 + 90 + 81 + 54 = 360°.',
        ],
      },
      {
        h: 'Grafikler arası dönüşüm',
        p: [
          'Daire grafiğinden sütun grafiğine geçmek için toplam bilinmelidir. Toplam 120 kişi ve bir dilim 90° ise bu dilim bütünün 90/360 = 1/4’üdür, yani 30 kişidir.',
          'Sütun grafiğinden daire grafiğine geçerken önce sütunlar toplanır, sonra her sütun için merkez açı hesaplanır. Yüzde ile çalışmak da mümkündür: %25’lik dilim 90°, %10’luk dilim 36°’dir.',
        ],
      },
      {
        h: 'Grafik yorumlama ve yanıltıcı grafikler',
        p: [
          'Bir grafiği yorumlamadan önce başlığa, eksenlere ve ölçeğe bak. Dikey eksen 0’dan değil de 90’dan başlıyorsa 95 ile 100 arasındaki küçük bir fark çok büyük görünür. Aynı veriyle farklı izlenim yaratan bu tür grafikler yanıltıcıdır.',
          'Çizgi grafiğinde çizginin dikliği değişimin hızını gösterir: en dik bölüm en hızlı artış ya da azalışın olduğu aralıktır.',
        ],
      },
      {
        h: '8. sınıf veri analizi LGS soruları (çözümlü)',
        p: ['Daire grafiği sorularında açı, yüzde ve kişi sayısı arasında geçiş yaparken 360° = %100 = toplam eşitliğini kullan.'],
        list: [
          'Daire grafiğinde 72°’lik dilim 18 kişiyi gösteriyor. Toplam: 18 × 360 ÷ 72 = 90 kişi.',
          'Bir okulun 600 öğrencisinin %35’i servisle geliyor. Daire grafiğinde bu dilimin açısı: 0,35 × 360 = 126°; öğrenci sayısı 600 × 0,35 = 210.',
          'Bir mağazanın satışları ocakta 120, şubatta 150, martta 210 adet. En büyük artış şubattan marta olmuştur (60 adet); çizgi grafiğinde en dik bölüm burasıdır.',
        ],
      },
    ],
    faq: [
      { q: 'Daire grafiğinde merkez açı nasıl hesaplanır?', a: 'Kategori değeri toplama bölünür ve 360° ile çarpılır. 40 kişiden 10’u için açı 10/40 × 360 = 90°’dir.' },
      { q: 'Çizgi grafiği ne zaman kullanılır?', a: 'Bir niceliğin zaman içinde nasıl değiştiğini göstermek için: sıcaklık, boy, satış miktarı gibi.' },
      { q: 'Sütun grafiği ile daire grafiği arasındaki fark nedir?', a: 'Sütun grafiği kategorilerin miktarlarını yan yana karşılaştırır; daire grafiği her kategorinin bütün içindeki payını gösterir.' },
      { q: 'Yanıltıcı grafik nasıl anlaşılır?', a: 'Eksenin 0’dan başlayıp başlamadığına, ölçek aralıklarının eşit olup olmadığına ve şekillerin boyutlarının veriyle orantılı olup olmadığına bakılır.' },
    ],
    tools: ['bargraph', 'grafiklab'],
    games: ['veri-dedektifleri', 'iklim-istasyonu'],
    interactions: ['grafik-hikayeleri', 'grafik-ciz-anlat', 'yaniltici-grafikler', 'veri-toplama'],
  },
]
