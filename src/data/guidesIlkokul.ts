import type { Guide } from './guides'

/**
 * İlkokul (1–4. sınıf) konu rehberleri. Biçim ve kurallar için src/data/guides.ts başındaki açıklamaya bakın.
 */
export const guidesIlkokul: Guide[] = [
  {
    slug: 'carpim-tablosu',
    title: 'Çarpım Tablosu Nasıl Ezberlenir? Kolay Ezberleme Yolları',
    // "çarpım tablosu" aramasının hedefi /carpim-tablosu (tablo + alıştırma); bu rehber "nasıl ezberlenir" niyetini karşılar
    seoTitle: 'Çarpım Tablosu Nasıl Ezberlenir? Kolay Ezberleme Yolları',
    description: 'Çarpım tablosu nasıl kolay ezberlenir? 1–10 çarpım tablosu, ikiye katlama, 5’ler ve 9’ların parmak yöntemi, değişme özelliği. 2–3. sınıf için etkinlikler.',
    grades: [2, 3],
    outcomes: ['MAT.2.2.4', 'MAT.2.2.5', 'MAT.3.2.3', 'MAT.3.2.4'],
    intro: 'Çarpım tablosu ezberlenecek 100 ayrı bilgi değil, birbirine bağlı birkaç stratejidir. Önce 1’ler, 2’ler, 5’ler ve 10’lar öğrenilir; sonra ikiye katlama, değişme özelliği ve bilinen bir çarpımdan yola çıkma ile kalan çarpımlar kolayca bulunur.',
    sections: [
      {
        h: 'Çarpma ne demek? Tekrarlı toplama',
        p: [
          'Çarpma, eşit grupları hızlıca saymanın yoludur. 4 tabakta 3’er kurabiye varsa toplam 3 + 3 + 3 + 3 = 12 kurabiye vardır; bunu kısaca 4 × 3 = 12 diye yazarız. “4 tane 3” diye okumak, işlemin anlamını unutturmaz.',
          'Çarpım tablosuna geçmeden önce çocuğun eşit grupları ve dizileri (satır-sütun hâlinde dizilmiş nesneler) görmesi önemlidir. 3 satır 5 sütunluk bir dizide 3 × 5 = 15 nesne vardır; diziyi çevirince 5 × 3 olur ve sonuç değişmez.',
        ],
      },
      {
        h: '1–10 çarpım tablosu',
        p: ['Aşağıdaki satırlar en çok sorulan çarpımları içerir. Tablonun tamamını tek seferde değil, aşağıdaki sırayla parça parça öğrenmek çok daha kolaydır.'],
        list: [
          '2’ler: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20',
          '3’ler: 3, 6, 9, 12, 15, 18, 21, 24, 27, 30',
          '4’ler: 4, 8, 12, 16, 20, 24, 28, 32, 36, 40',
          '5’ler: 5, 10, 15, 20, 25, 30, 35, 40, 45, 50',
          '6’lar: 6, 12, 18, 24, 30, 36, 42, 48, 54, 60',
          '7’ler: 7, 14, 21, 28, 35, 42, 49, 56, 63, 70',
          '8’ler: 8, 16, 24, 32, 40, 48, 56, 64, 72, 80',
          '9’lar: 9, 18, 27, 36, 45, 54, 63, 72, 81, 90',
        ],
      },
      {
        h: 'Çarpım tablosu kolay ezberleme yolları',
        p: [
          'Değişme özelliği işi yarıya indirir: 3 × 8 ile 8 × 3 aynıdır. 1’den 10’a kadar olan 100 çarpımın yalnızca 55’i birbirinden farklıdır. Bir çarpımı öğrenen çocuk, ters çevrilmişini de öğrenmiş olur.',
          'İkiye katlama: 2’ler bir sayının iki katıdır (2 × 7 = 7 + 7 = 14). 4’ler 2’lerin iki katı (4 × 7 = 14 + 14 = 28), 8’ler de 4’lerin iki katıdır (8 × 7 = 28 + 28 = 56).',
          'Bilinen çarpımdan yola çıkma: 6 × 7’yi bilmiyorsan 5 × 7 = 35’e bir 7 daha ekle: 35 + 7 = 42. 9 × 6 için 10 × 6 = 60’tan bir 6 çıkar: 60 − 6 = 54.',
        ],
        list: [
          '1’ler: sayı kendisi kalır (1 × 8 = 8)',
          '10’lar: sayının sonuna 0 eklenir (10 × 6 = 60)',
          '5’ler: 10’ların yarısıdır, sonuç hep 0 ya da 5 ile biter (5 × 8 = 40)',
          '9’lar: sonucun rakamları toplamı 9’dur (9 × 7 = 63 → 6 + 3 = 9)',
        ],
      },
      {
        h: '9’ların parmak yöntemi',
        p: [
          'İki elini açıp masaya koy ve parmaklarını soldan sağa 1’den 10’a kadar numarala. 9 × 4 için 4. parmağını kapat. Kapalı parmağın solunda kalan 3 parmak onlukları, sağında kalan 6 parmak birlikleri gösterir: 9 × 4 = 36.',
          'Yöntemin nedeni 9 × 4 = 10 × 4 − 4 olmasıdır. Parmak yöntemi eğlencelidir ama asıl amaç, bu ilişkiyi fark edip parmaksız da kullanabilmektir.',
        ],
      },
      {
        h: 'Çarpım tablosu evde nasıl çalışılır?',
        p: [
          'Her gün 5–10 dakikalık kısa çalışmalar, tek seferlik uzun ezber saatlerinden çok daha etkilidir. Önce bir “aile” seçin (ör. 4’ler), çocuk onu ikiye katlamayla bulsun, sonra kartlarla ve oyunlarla tekrar edin.',
          'Yanlış cevapta doğruyu hemen söylemek yerine “Bunu bildiğin bir çarpımdan bulabilir misin?” diye sorun. Hız, anlam oturduktan sonra kendiliğinden gelir; süre baskısı kaygıyı artırabilir.',
        ],
        list: ['Dizilim tahtasında 6 × 4’ü kur, sonra çevirip 4 × 6’ya bak', 'Yürürken ritmik sayma: 3, 6, 9, 12…', 'Market fişindeki aynı ürünleri çarpma ile hesaplama', 'Bilinmeyen çarpımları bir listeye yazıp her gün yalnızca 3 tanesine çalışma'],
      },
    ],
    faq: [
      { q: 'Çarpım tablosu kaçıncı sınıfta öğrenilir?', a: 'Çarpmanın anlamı ve eşit gruplar 2. sınıfta başlar; çarpım tablosunun tamamı çoğunlukla 3. sınıfta zihinden çarpma ve bölme ile birlikte pekiştirilir.' },
      { q: 'Çarpım tablosu en hızlı nasıl ezberlenir?', a: '1’ler, 2’ler, 5’ler ve 10’larla başlayın; değişme özelliği ile tersini, ikiye katlama ile 4’leri ve 8’leri, bilinen bir çarpımdan ekleyerek ya da çıkararak 6’ları, 7’leri ve 9’ları bulun. Her gün birkaç dakikalık tekrar yeterlidir.' },
      { q: 'Çarpım tablosunda en zor çarpımlar hangileri?', a: 'Çoğu öğrenci için 6 × 7, 6 × 8, 7 × 8 ve 7 × 7 en zor olanlardır. 7 × 8 için 7 × 4 = 28’in iki katını almak (56) ya da 5 × 8 + 2 × 8 = 40 + 16 = 56 diye düşünmek işe yarar.' },
      { q: 'Çarpım tablosunu bilmeyen çocuk bölme yapabilir mi?', a: 'Bölme, çarpmanın tersidir: 24 ÷ 6 sorusu “6 kere kaç 24 eder?” demektir. Bu yüzden çarpım tablosu ile bölme birlikte çalışılınca ikisi de kolaylaşır.' },
      { q: 'Parmakla çarpım tablosu doğru mu?', a: '9’ların parmak yöntemi doğru sonuç verir, ancak bir ara basamaktır. Asıl hedef 9 × n = 10 × n − n ilişkisini anlayıp parmaksız kullanmaktır.' },
    ],
    tools: ['dizilim', 'yuzluk'],
    games: ['kurabiye-fabrikasi', 'lunapark'],
    cta: { to: '/carpim-tablosu', label: 'Çarpım tablosu ve alıştırma', desc: '1–10 çarpım tablosunun tamamı, istediğin sayının çarpımları ve cevaplı çarpım tablosu alıştırması' },
    interactions: ['parcala-birlestir-dizisi', 'carpmaya-giris', 'carpma-dikdortgeni', 'carpim-dikdortgenleri', 'sepetlere-grupla'],
  },
  {
    slug: 'ritmik-sayma',
    title: 'Ritmik Sayma Nedir? 2’şer, 3’er, 5’er ve 10’ar Sayma',
    seoTitle: 'Ritmik Sayma Nedir? 2’şer, 5’er, 10’ar İleri ve Geri Sayma',
    description: 'Ritmik sayma nedir? 2’şer, 3’er, 5’er, 10’ar ileri ve geri sayma örnekleri, yüzlük tablo ve sayı doğrusuyla anlatım. 1–4. sınıf ritmik sayma etkinlikleri.',
    grades: [1, 2, 3, 4],
    outcomes: ['MAT.1.1.5', 'MAT.2.1.4', 'MAT.3.1.4', 'MAT.4.1.4'],
    intro: 'Ritmik sayma, sayıları birer birer değil eşit adımlarla saymaktır: 2’şer sayarken 2, 4, 6, 8; 5’er sayarken 5, 10, 15, 20 deriz. İleri ritmik saymada sayılar düzenli artar, geri ritmik saymada düzenli azalır. Ritmik sayma çarpım tablosunun ve örüntülerin temelidir.',
    sections: [
      {
        h: 'Ritmik sayma örnekleri',
        p: ['Her ritmik saymada iki sayı arasındaki fark hep aynıdır; bu farka “sayma adımı” diyebiliriz.'],
        list: [
          '2’şer ileri: 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20',
          '3’er ileri: 3, 6, 9, 12, 15, 18, 21, 24, 27, 30',
          '5’er ileri: 5, 10, 15, 20, 25, 30, 35, 40, 45, 50',
          '10’ar ileri: 10, 20, 30, 40, 50, 60, 70, 80, 90, 100',
          '10’ar ileri (farklı başlangıç): 7, 17, 27, 37, 47, 57',
          '100’er ileri: 100, 200, 300, 400, 500',
        ],
      },
      {
        h: 'Geri ritmik sayma nasıl yapılır?',
        p: [
          'Geri saymada her adımda aynı sayı çıkarılır. 20’den geriye 2’şer: 20, 18, 16, 14, 12. 50’den geriye 5’er: 50, 45, 40, 35, 30. 95’ten geriye 10’ar: 95, 85, 75, 65, 55.',
          'Geri sayma ileri saymadan daha zordur; çünkü çocuk ezberlediği sırayı tersten kurmak zorundadır. Sayı doğrusunda geriye zıplamak ya da yüzlük tabloda yukarı çıkmak bu zorluğu azaltır.',
        ],
      },
      {
        h: 'Sınıflara göre ritmik sayma',
        p: ['Ritmik saymanın adımları ve sayı aralığı sınıf ilerledikçe büyür. Aşağıdaki liste genel bir sıralamadır; okulda işlenen sıra küçük farklar gösterebilir.'],
        list: [
          '1. sınıf: 20’ye kadar 2’şer, 5’er ve 10’ar ileri sayma',
          '2. sınıf: 100’e kadar 2’şer, 3’er, 4’er, 5’er ve 10’ar ileri-geri sayma',
          '3. sınıf: 1000’e kadar 3’er, 4’er, 5’er, 10’ar ve 100’er ritmik sayma',
          '4. sınıf: daha büyük sayılarla 25’er, 50’şer, 100’er ve 1000’er sayma',
        ],
      },
      {
        h: 'Yüzlük tabloda ritmik sayma',
        p: [
          'Yüzlük tabloda 10’ar saymak bir sütunda aşağı inmek demektir: 4, 14, 24, 34… Birler basamağı hiç değişmez, yalnızca onlar basamağı 1 artar.',
          '5’er sayılan sayıları boyayınca iki düz sütun (5 ve 0 ile bitenler), 2’şer sayılanları boyayınca beş düz sütun çıkar. 3’er sayılanlar ise çapraz çizgiler oluşturur. Çocuğun bu desenleri kendisinin fark etmesi, ezberden çok daha kalıcıdır.',
        ],
      },
      {
        h: 'Ritmik sayma evde nasıl çalışılır?',
        p: ['Ritmik sayma ritimle sevilir: merdiven çıkarken, ip atlarken ya da alkışla sayın. Çorapları çift çift (2’şer), parmakları el el (5’er), madeni paraları onar onar (10’ar) saymak günlük hayattan doğal fırsatlardır.'],
        list: ['Sayı doğrusunda kurbağa zıplatarak 3’er ilerleme', 'Geri sayım: 30’dan 0’a 3’er', 'Eksik sayıyı bul: 15, 20, __, 30', 'Farklı başlangıçla sayma: 4, 14, 24, __'],
      },
    ],
    faq: [
      { q: 'Ritmik sayma ne demek?', a: 'Bir sayıdan başlayıp her seferinde aynı sayıyı ekleyerek (ileri) ya da çıkararak (geri) saymaktır. 5, 10, 15, 20 dizisi 5’er ileri ritmik saymadır.' },
      { q: 'Ritmik sayma neden önemli?', a: 'Ritmik sayma çarpım tablosunun temelidir: 4’er saymak 4’ler çarpım tablosunu verir. Ayrıca örüntü kuralı bulmayı ve zihinden toplama-çıkarmayı kolaylaştırır.' },
      { q: '2’şer ritmik sayma çift sayıları mı verir?', a: '0’dan ya da bir çift sayıdan başlarsan evet: 0, 2, 4, 6… 1’den başlarsan 1, 3, 5, 7 diye tek sayıları sayarsın; adım yine 2’dir.' },
      { q: 'Ritmik sayma ile örüntü aynı şey mi?', a: 'Ritmik sayma, artan veya azalan bir sayı örüntüsüdür. Örüntü ise daha geniş bir kavramdır; şekil örüntüleri ve kuralı her adımda değişen örüntüler de vardır.' },
    ],
    tools: ['yuzluk', 'numberline', 'rekenrek'],
    games: ['kurbaga', 'sayi-treni', 'matematik-bahcem'],
    interactions: ['yuzluk-gizem', 'oruntu-tasarimcisi'],
  },
  {
    slug: 'basamak-degeri',
    title: 'Basamak Değeri ve Sayı Değeri Nedir? Birlik, Onluk, Yüzlük',
    seoTitle: 'Basamak Değeri ve Sayı Değeri Nedir? Örneklerle',
    description: 'Basamak değeri ve sayı değeri arasındaki fark nedir? Birlik, onluk, yüzlük, sayıların çözümlenmesi ve onluk taban bloklarıyla örnekler. 2–3. sınıf.',
    grades: [2, 3],
    outcomes: ['MAT.2.1.1', 'MAT.2.1.2', 'MAT.3.1.1', 'MAT.3.1.2'],
    intro: 'Bir rakamın sayı değeri rakamın kendisidir; basamak değeri ise rakamın bulunduğu yere göre gösterdiği miktardır. 352 sayısında 5’in sayı değeri 5, basamak değeri 50’dir, çünkü 5 onlar basamağındadır ve 5 onluk gösterir.',
    sections: [
      {
        h: 'Basamak nedir? Birler, onlar ve yüzler basamağı',
        p: [
          'Sayıyı oluşturan her rakamın bir yeri vardır. Sağdan sola doğru ilk yer birler basamağı, ikincisi onlar basamağı, üçüncüsü yüzler basamağıdır. 10 birlik 1 onluk, 10 onluk 1 yüzlük eder; sistemimiz bu yüzden “onluk sistem” adını alır.',
        ],
        list: ['486: 4 yüzler, 8 onlar, 6 birler basamağında', '70: 7 onlar, 0 birler basamağında', '905: 9 yüzler, 0 onlar, 5 birler basamağında'],
      },
      {
        h: 'Basamak değeri ile sayı değeri farkı',
        p: [
          'Sayı değeri yer değiştirince değişmez; 3 her yerde 3’tür. Basamak değeri ise yere bağlıdır: 3 birler basamağında 3, onlar basamağında 30, yüzler basamağında 300 değerindedir.',
          'Bir rakamın basamak değerini bulmak için rakamı bulunduğu basamağın değeriyle çarparız: 726’da 7 yüzler basamağında olduğundan 7 × 100 = 700’dür. 0 rakamının basamak değeri her yerde 0’dır.',
        ],
        list: ['638 → 6’nın basamak değeri 600, sayı değeri 6', '638 → 3’ün basamak değeri 30, sayı değeri 3', '638 → 8’in basamak değeri 8, sayı değeri 8'],
      },
      {
        h: 'Sayıların çözümlenmesi',
        p: [
          'Bir sayıyı basamak değerlerinin toplamı olarak yazmaya çözümleme denir: 547 = 500 + 40 + 7 ya da 547 = 5 yüzlük + 4 onluk + 7 birlik.',
          'Aynı sayı farklı biçimlerde de çözümlenebilir: 547 = 54 onluk + 7 birlik = 4 yüzlük + 14 onluk + 7 birlik. Bu esnek düşünme, çıkarmada onluk bozmanın ve toplamada eldenin temelidir.',
        ],
      },
      {
        h: 'Onluk taban bloklarıyla basamak değeri',
        p: [
          'Birlik küp, onluk çubuk ve yüzlük levha, basamak değerini gözle görülür kılar. 234’ü kurmak için 2 levha, 3 çubuk ve 4 küp gerekir. Bir çubuğu 10 küpe çevirmek sayının değerini değiştirmez; yalnızca gösterimini değiştirir.',
          'Sayılardaki “0”ın neden önemli olduğu da bloklarla anlaşılır: 307’de hiç çubuk yoktur. 0 yazılmazsa sayı 37’ye dönüşür.',
        ],
      },
      {
        h: 'Basamak değeri derste ve evde nasıl çalışılır?',
        p: ['Önce somut modelle (bloklar, onarlı demetlenmiş çubuklar, paralar), sonra resimle, en son yalnızca sayılarla çalışın. 10’luk ve 1’lik paralarla 47 lirayı göstermek, basamak değerinin günlük hayattaki karşılığıdır.'],
        list: ['Rakam kartlarıyla en büyük ve en küçük sayıyı oluşturma', '“Ben 3 yüzlük, 12 onluk ve 5 birliğim, hangi sayıyım?” (425)', 'Yüzlük tabloda bir sayının 10 fazlasını ve 10 eksiğini bulma'],
      },
    ],
    faq: [
      { q: 'Basamak değeri nasıl bulunur?', a: 'Rakam, bulunduğu basamağın değeriyle çarpılır. Birler basamağındaki rakam kendisine, onlar basamağındaki rakam 10 katına, yüzler basamağındaki rakam 100 katına eşittir.' },
      { q: 'Sayı değeri nedir?', a: 'Rakamın bulunduğu yerden bağımsız olarak kendi değeridir. 952’de 9’un sayı değeri 9, basamak değeri 900’dür.' },
      { q: '0’ın basamak değeri nedir?', a: '0 hangi basamakta olursa olsun basamak değeri 0’dır. Ancak 0, boş basamağı gösterdiği için sayının doğru okunmasında çok önemlidir.' },
      { q: 'Üç basamaklı en büyük ve en küçük sayı kaçtır?', a: 'Üç basamaklı en büyük sayı 999, en küçük sayı 100’dür. Rakamları farklı olanlarda en büyük 987, en küçük 102’dir.' },
    ],
    tools: ['base10', 'sayikartlari', 'yuzluk'],
    games: ['sayi-adalari', 'gizli-sayi'],
    interactions: ['basamak-laboratuvari', 'sayilari-karsilastir', 'farkli-cozumleme', 'blok-birlestirme'],
  },
  {
    slug: 'tek-ve-cift-sayilar',
    title: 'Tek ve Çift Sayılar Nedir? 0 Çift mi? Toplam Kuralları',
    seoTitle: 'Tek ve Çift Sayılar Nedir? 0 Çift Sayı mı?',
    description: 'Tek ve çift sayılar nedir, nasıl anlaşılır? 0 çift sayı mı? Tek ve çift sayıların toplamı kuralları ve nokta modeliyle açıklama. 3. sınıf etkinlikleri.',
    grades: [3],
    outcomes: ['MAT.3.1.5', 'MAT.3.1.6'],
    intro: '2’ye kalansız bölünebilen sayılar çift, bölünemeyen sayılar tek sayıdır. Bir sayının tek mi çift mi olduğunu birler basamağı söyler: 0, 2, 4, 6 ya da 8 ile biten sayılar çift; 1, 3, 5, 7 ya da 9 ile biten sayılar tektir. 0 da bir çift sayıdır.',
    sections: [
      {
        h: 'Çift sayı nasıl anlaşılır? İkişerli eşleme',
        p: [
          'Nesneleri ikişer ikişer eşleştir. Hiçbiri açıkta kalmıyorsa sayı çifttir; bir tanesi eşsiz kalıyorsa tektir. 8 kurabiye 4 çift olur, açıkta kalan yoktur → 8 çifttir. 7 kurabiyede 3 çift oluşur, 1 kurabiye eşsiz kalır → 7 tektir.',
          'Aynı fikir “iki kişiye eşit paylaştırma” ile de anlatılabilir: Çift sayıdaki nesneler iki kişiye artmadan bölünür, tek sayıdakilerde bir tane artar.',
        ],
      },
      {
        h: 'Tek ve çift sayılar listesi',
        list: ['Çift sayılar: 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20…', 'Tek sayılar: 1, 3, 5, 7, 9, 11, 13, 15, 17, 19…', '348 çifttir (8 ile biter)', '527 tektir (7 ile biter)', '1000 çifttir (0 ile biter)'],
        p: ['Sayı ne kadar büyük olursa olsun yalnızca birler basamağına bakmak yeter, çünkü onluklar, yüzlükler ve binlikler her zaman ikişerli eşlenebilir.'],
      },
      {
        h: '0 çift sayı mı?',
        p: [
          'Evet, 0 bir çift sayıdır. 0 ÷ 2 = 0 olur ve kalan yoktur. Ayrıca sayı dizisinde tek ve çift sayılar sırayla gelir: …, 1 tek, 2 çift, 3 tek… 1’den hemen önce gelen 0’ın çift olması bu sıraya da uyar.',
        ],
      },
      {
        h: 'Tek ve çift sayıların toplamı',
        p: ['Toplamın tek mi çift mi olacağını işlemi yapmadan söyleyebiliriz. Nokta modeliyle düşün: iki çift sayının eşsiz noktası yoktur; iki tek sayının eşsiz kalan birer noktası birbirleriyle eşleşir.'],
        list: ['Çift + çift = çift (6 + 8 = 14)', 'Tek + tek = çift (5 + 7 = 12)', 'Tek + çift = tek (3 + 4 = 7)', 'Üç tek sayının toplamı tektir (1 + 3 + 5 = 9)'],
      },
      {
        h: 'Tek ve çift sayılar derste ve evde nasıl çalışılır?',
        p: ['Çorapları, ayakkabıları, sıradaki öğrencileri ikişer eşleyerek başlayın. Kural ezberletmeden önce çocuğa “Neden 0, 2, 4, 6, 8 ile bitenler çift?” sorusunu sorun ve nokta modeliyle açıklamasını isteyin.'],
        list: ['Yüzlük tabloda çift sayıları boyayıp sütun desenini fark etme', 'Ev numaralarında sokağın bir yanının tek, diğer yanının çift olduğunu gözlemleme', '“İki tek sayının toplamı tek olabilir mi?” sorusunu örneklerle sınama'],
      },
    ],
    faq: [
      { q: 'Çift sayı nedir?', a: '2’ye kalansız bölünebilen sayıdır. Birler basamağı 0, 2, 4, 6 veya 8 olan sayılar çifttir.' },
      { q: 'Tek sayı nedir?', a: '2’ye bölündüğünde 1 kalanı veren sayıdır. Birler basamağı 1, 3, 5, 7 veya 9 olan sayılar tektir.' },
      { q: '0 tek mi çift mi?', a: '0 çift sayıdır; 2’ye bölündüğünde kalan 0’dır.' },
      { q: 'İki tek sayının toplamı neden çifttir?', a: 'Her tek sayıda eşsiz kalan bir nokta vardır. İki tek sayı toplanınca bu iki eşsiz nokta birbiriyle eşleşir, açıkta nokta kalmaz; bu yüzden toplam çifttir.' },
      { q: 'En küçük tek sayı kaçtır?', a: 'Doğal sayılarda en küçük tek sayı 1, en küçük çift sayı 0’dır.' },
    ],
    tools: ['yuzluk', 'tenframe'],
    games: ['balon', 'gizli-sayi'],
    interactions: ['yuzluk-gizem', 'sayiyi-parcala'],
  },
  {
    slug: 'saat-okuma',
    title: 'Saat Nasıl Okunur? Tam, Yarım ve Çeyrek Saat',
    seoTitle: 'Saat Nasıl Okunur? Tam, Yarım ve Çeyrek Saat',
    description: 'Saat nasıl okunur? Akrep ve yelkovan, tam, yarım ve çeyrek saat, dakika okuma, saat-dakika-gün dönüşümleri ve süre hesaplama. 2–3. sınıf saat etkinlikleri.',
    grades: [2, 3],
    outcomes: ['MAT.2.1.9', 'MAT.3.1.12', 'MAT.3.1.13', 'MAT.3.1.14'],
    intro: 'Analog saatte kısa ibre (akrep) saati, uzun ibre (yelkovan) dakikayı gösterir. Yelkovan 12’deyse saat tamdır, 6’daysa buçuktur; 3’teyse çeyrek geçiyordur, 9’daysa bir sonraki saate çeyrek vardır. Yelkovan bir rakamdan diğerine geçince 5 dakika geçer.',
    sections: [
      {
        h: 'Akrep ve yelkovan ne gösterir?',
        p: [
          'Akrep 12 saatte saat kadranında bir tur atar; yelkovan ise her saat bir tur atar. Bu yüzden önce akrebe bakıp saati, sonra yelkovana bakıp dakikayı okuruz.',
          'Akrep çoğu zaman tam bir rakamın üstünde durmaz. Saat 4’ü 20 geçerken akrep 4 ile 5’in arasındadır; henüz 5’e gelmediği için saat “4” diye okunur.',
        ],
      },
      {
        h: 'Tam, yarım ve çeyrek saat',
        list: [
          'Tam saat: yelkovan 12’de → 3.00 “saat üç”',
          'Yarım saat: yelkovan 6’da → 3.30 “üç buçuk”',
          'Çeyrek geçe: yelkovan 3’te → 3.15 “üçü çeyrek geçiyor”',
          'Çeyrek kala: yelkovan 9’da → 3.45 “dörde çeyrek var”',
        ],
        p: ['Bir saat 60 dakikadır. Yarım saat 30 dakika, çeyrek saat bunun yarısı, yani 15 dakikadır.'],
      },
      {
        h: 'Dakikalar nasıl okunur?',
        p: [
          'Kadrandaki her rakam arası 5 dakikadır. Yelkovan 1’de 5, 2’de 10, 4’te 20, 8’de 40 dakikayı gösterir; burada 5’er ritmik sayma işe yarar.',
          'Yelkovan 6’yı geçtikten sonra iki okuma da doğrudur: 7.40 için “yediyi kırk geçiyor” ya da “sekize yirmi var” denebilir, çünkü 60 − 40 = 20’dir.',
        ],
        list: ['7.05 → yediyi beş geçiyor', '7.20 → yediyi yirmi geçiyor', '7.50 → sekize on var', '7.55 → sekize beş var'],
      },
      {
        h: 'Zaman ölçü birimleri: saat, dakika, gün',
        list: ['1 dakika = 60 saniye', '1 saat = 60 dakika', '1 gün = 24 saat', '1 hafta = 7 gün', '1 yıl = 12 ay = 365 gün (artık yıllarda 366 gün)'],
        p: ['Dönüşüm örnekleri: 2 saat = 120 dakika, 90 dakika = 1 saat 30 dakika, 3 gün = 72 saat. Dijital saatlerde ve tarifelerde günün 24 saati kullanılır: 15.00 öğleden sonra saat 3, 21.30 akşam dokuz buçuktur.'],
      },
      {
        h: 'Süre hesaplama örnekleri',
        p: [
          'Süreyi hesaplarken önce tam saate ya da buçuğa kadar say, sonra kalanı ekle. Ders 9.40’ta başlayıp 35 dakika sürerse: 9.40’tan 10.00’a 20 dakika, kalan 15 dakika → ders 10.15’te biter.',
          'Film 14.20’de başlayıp 16.05’te bittiyse: 14.20 → 16.20 iki saat olurdu; film 15 dakika erken bittiği için süre 1 saat 45 dakikadır.',
        ],
      },
      {
        h: 'Saat okuma evde nasıl öğretilir?',
        p: ['Önce yalnızca akrebi olan bir saatle “saat 3 civarı, 3 ile 4 arası” gibi yaklaşık okumalar yapın; sonra yelkovanı ekleyin. Günlük rutinleri (kahvaltı, okul servisi, yatma saati) saatle eşleştirmek, kavramı anlamlı kılar.'],
        list: ['Analog ve dijital saati yan yana gösterme', '“Yarım saat sonra saat kaç olacak?” soruları', 'Bir ödevin ne kadar sürdüğünü tahmin edip sonra ölçme'],
      },
    ],
    faq: [
      { q: 'Akrep mi saati gösterir, yelkovan mı?', a: 'Kısa ibre olan akrep saati, uzun ibre olan yelkovan dakikayı gösterir.' },
      { q: 'Çeyrek saat kaç dakikadır?', a: 'Çeyrek saat 15 dakikadır; bir saatin dörtte biridir. Yarım saat ise 30 dakikadır.' },
      { q: '“Dörde çeyrek var” saat kaç demek?', a: 'Saat 3.45 demektir. Saat 4 olmasına 15 dakika kalmıştır.' },
      { q: '1 günde kaç dakika vardır?', a: '1 gün 24 saat, 1 saat 60 dakika olduğundan 24 × 60 = 1 440 dakika vardır.' },
      { q: 'Saat okuma kaçıncı sınıfta öğretilir?', a: 'Tam, yarım ve çeyrek saat 2. sınıfta; dakikaları okuma, zaman ölçü birimleri arasındaki dönüşümler ve süre hesaplama 3. sınıfta işlenir.' },
    ],
    tools: ['clock', 'numberline'],
  },
  {
    slug: 'geometrik-cisimler-ve-sekiller',
    title: 'Geometrik Cisimler ve Şekiller Nelerdir? Küp, Prizma, Silindir, Koni, Küre',
    seoTitle: 'Geometrik Cisimler ve Şekiller: Küp, Silindir, Koni, Küre',
    description: 'Geometrik cisimler ve şekiller nelerdir? Küp, prizma, silindir, koni, küre; kare, dikdörtgen, üçgen, daire. Yüz, kenar ve köşe sayıları. 1–3. sınıf.',
    grades: [1, 2, 3],
    outcomes: ['MAT.1.3.3', 'MAT.1.3.4', 'MAT.1.3.5', 'MAT.2.3.1', 'MAT.2.3.3', 'MAT.3.3.1'],
    intro: 'Geometrik cisimler üç boyutludur, yer kaplar ve elimize alabiliriz: küp, dikdörtgenler prizması, üçgen prizma, silindir, koni ve küre. Geometrik şekiller ise düzdür, iki boyutludur: kare, dikdörtgen, üçgen ve daire. Bir cismin yüzeyini kâğıda çizince geometrik şekiller ortaya çıkar.',
    sections: [
      {
        h: 'Geometrik cisimler ve günlük hayattan örnekler',
        list: [
          'Küp: zar, şeker küpü → 6 eş kare yüz',
          'Dikdörtgenler prizması: kibrit kutusu, tuğla, dolap → 6 dikdörtgen yüz',
          'Kare prizma: bazı süt kutuları → 2 kare, 4 dikdörtgen yüz',
          'Üçgen prizma: kamp çadırı → 2 üçgen, 3 dikdörtgen yüz',
          'Silindir: konserve kutusu, bardak → 2 daire yüz ve bir eğri yüzey',
          'Koni: dondurma külahı, trafik konisi → 1 daire yüz, bir eğri yüzey ve bir tepe noktası',
          'Küre: top, portakal → yalnızca eğri yüzey',
        ],
        p: ['Cisimleri tanırken renk ve büyüklük değil, biçimin özellikleri önemlidir: kocaman bir koli de küçük bir kibrit kutusu da dikdörtgenler prizmasıdır.'],
      },
      {
        h: 'Yüz, kenar ve köşe sayıları',
        p: ['Cismin düz yüzeylerine yüz, iki yüzün birleştiği çizgiye kenar (ayrıt), kenarların buluştuğu noktaya köşe denir. Sayarken cismi elde çevirip saydığın yerleri işaretlemek, aynı yüzü iki kez saymayı önler.'],
        list: ['Küp: 6 yüz, 12 kenar, 8 köşe', 'Dikdörtgenler prizması: 6 yüz, 12 kenar, 8 köşe', 'Üçgen prizma: 5 yüz, 9 kenar, 6 köşe', 'Kare piramit: 5 yüz, 8 kenar, 5 köşe', 'Silindir, koni ve kürenin köşesi yoktur (koninin bir tepe noktası vardır)'],
      },
      {
        h: 'Hangi cisim yuvarlanır, hangisi kayar?',
        p: [
          'Eğri yüzeyi olan cisimler yuvarlanır: küre her yöne, silindir düz bir çizgide, koni ise kendi etrafında daire çizerek yuvarlanır. Düz yüzleri olan cisimler kayar ve üst üste konup yapı kurmaya elverişlidir.',
          'Silindir hem kayar hem yuvarlanır: daire yüzü üstünde kayar, yan yatınca yuvarlanır. Bu tür sınıflandırmalar 1. ve 2. sınıfta cisimlerin biçimsel özelliklerini fark etmenin en eğlenceli yoludur.',
        ],
      },
      {
        h: 'Geometrik şekiller: kare, dikdörtgen, üçgen, daire',
        list: ['Kare: 4 eş kenar, 4 köşe (hepsi dik)', 'Dikdörtgen: karşılıklı kenarları eş, 4 köşe (hepsi dik)', 'Üçgen: 3 kenar, 3 köşe', 'Daire: kenarı ve köşesi yok, sınırı eğri bir çizgi'],
        p: [
          'Şeklin döndürülmesi adını değiştirmez: ucu aşağı bakan üçgen de üçgendir. Çocuklara yalnızca “düz duran” örnekler göstermek, şekli konumuyla karıştırmalarına yol açar; farklı boyut ve konumlarda örnekler gösterin.',
        ],
      },
      {
        h: 'Cisimlerden şekillere: iz çıkarma ve modeller',
        p: ['Bir küpü boyaya batırıp kâğıda bastırınca kare, silindirin tabanından daire, üçgen prizmanın ucundan üçgen elde edilir. 2. sınıfta geometrik şekillerle (örüntü blokları, tangram, geometri tahtası) modeller oluşturmak, şekillerin birleşince yeni şekiller oluşturduğunu gösterir: iki eş üçgen birleşip bir kare oluşturabilir.'],
      },
      {
        h: 'Geometrik cisimler evde ve derste nasıl çalışılır?',
        p: ['Evdeki kutuları, toplar ve bardakları toplayıp “yuvarlananlar–kayanlar” ya da “köşesi olanlar–olmayanlar” diye gruplayın. Ardından her gruptan bir cismin kâğıda izini çıkarın.'],
        list: ['Gizli torbadan dokunarak cismi tahmin etme', 'Küp ve prizmaların yüz, kenar, köşe sayılarını tabloya yazma', 'Geometri tahtasında farklı büyüklükte kareler ve üçgenler oluşturma'],
      },
    ],
    faq: [
      { q: 'Geometrik cisim ile geometrik şekil arasındaki fark nedir?', a: 'Cisimler üç boyutludur ve yer kaplar (küp, küre gibi); şekiller düzdür ve iki boyutludur (kare, daire gibi). Cisimlerin yüzeylerinde şekiller bulunur.' },
      { q: 'Küpün kaç yüzü, kenarı ve köşesi vardır?', a: 'Küpün 6 yüzü, 12 kenarı (ayrıtı) ve 8 köşesi vardır. Yüzlerinin hepsi eş karelerdir.' },
      { q: 'Kare bir dikdörtgen midir?', a: 'Evet. Dikdörtgenin karşılıklı kenarları eş ve bütün köşeleri diktir; karenin de öyledir. Kare, bütün kenarları eşit olan özel bir dikdörtgendir.' },
      { q: 'Silindirin köşesi var mıdır?', a: 'Hayır. Silindirin 2 daire biçiminde düz yüzü ve bir eğri yüzeyi vardır, köşesi yoktur.' },
      { q: 'Daire ile çember aynı mı?', a: 'Çember, dairenin sınırını oluşturan eğri çizgidir; daire ise bu çizgi ve içindeki bölgedir. İlkokulda genellikle “daire” adı kullanılır.' },
    ],
    tools: ['geoboard', 'nets', 'oruntubloklari', 'tangram'],
    games: ['mozaik-ustasi', 'balon'],
    interactions: ['sekil-insa-et', 'tangram-studyosu', 'katla-ac'],
  },
  {
    slug: 'oruntu-nedir',
    title: 'Örüntü Nedir? Sayı ve Şekil Örüntüleri, Örüntü Kuralı',
    seoTitle: 'Örüntü Nedir? Sayı ve Şekil Örüntüleri, Örüntü Kuralı',
    description: 'Örüntü nedir, kuralı nasıl bulunur? Artan ve azalan sayı örüntüleri, şekil örüntüleri, tekrar eden kısım ve eksik terim bulma örnekleri. 1–4. sınıf.',
    grades: [1, 2, 3, 4],
    outcomes: ['MAT.1.1.6', 'MAT.2.1.5', 'MAT.3.1.7', 'MAT.4.1.5'],
    intro: 'Örüntü, belli bir kurala göre devam eden sayı, şekil ya da nesne dizisidir. 3, 6, 9, 12 örüntüsünün kuralı “3 ekle”dir; ■ ● ● ■ ● ● örüntüsünde ise “kare, daire, daire” kısmı tekrar eder. Kuralı bulan, örüntüyü istediği kadar devam ettirebilir.',
    sections: [
      {
        h: 'Şekil örüntüleri ve tekrar eden kısım',
        p: [
          'Tekrarlı örüntülerde bir grup şekil sürekli yinelenir. Bu gruba örüntünün tekrar eden kısmı (örüntü birimi) denir. Örüntüyü sürdürmek için önce bu kısmı bul ve işaretle.',
        ],
        list: ['▲ ● ▲ ● ▲ ● → tekrar eden kısım: ▲ ●', 'kırmızı, mavi, mavi, kırmızı, mavi, mavi → tekrar eden kısım: kırmızı, mavi, mavi', 'alkış, alkış, zıpla, alkış, alkış, zıpla → hareket örüntüsü'],
      },
      {
        h: 'Artan ve azalan sayı örüntüleri',
        p: ['Artan örüntülerde terimler her adımda büyür, azalan örüntülerde küçülür. Kuralı bulmak için ardışık iki terim arasındaki farka bak; fark hep aynıysa kural “… ekle” ya da “… çıkar” biçimindedir.'],
        list: ['2, 5, 8, 11, 14 → kural: 3 ekle (artan)', '50, 45, 40, 35 → kural: 5 çıkar (azalan)', '100, 90, 80, 70 → kural: 10 çıkar', '1, 2, 4, 8, 16 → kural: 2 ile çarp (her adımda iki katı)'],
      },
      {
        h: 'Örüntüde eksik terim nasıl bulunur?',
        p: [
          'Önce bilinen ardışık terimlerden kuralı bul, sonra boşluğa uygula. 4, 8, __, 16, 20 örüntüsünde fark 4’tür; 8 + 4 = 12. Kontrol: 12 + 4 = 16 ✓.',
          'Boşluk başta ise kuralı tersine uygula: __, 15, 20, 25 örüntüsünde kural 5 eklemek olduğundan ilk terim 15 − 5 = 10’dur.',
        ],
      },
      {
        h: '4. sınıf örüntü kuralı: adım sayısıyla düşünme',
        p: [
          '4. sınıfta örüntünün kuralı yalnızca bir terimden diğerine geçişle değil, adım sayısıyla da ifade edilir. 4, 8, 12, 16 örüntüsünde her terim adım sayısının 4 katıdır; bu yüzden 10. terim 4 × 10 = 40’tır.',
          '3, 5, 7, 9 örüntüsünde terimler 2’şer artar ve her terim “adım sayısının 2 katının 1 fazlası”dır: 10. terim 2 × 10 + 1 = 21. Bu düşünme biçimi, ortaokulda cebirsel ifadelere geçişin temelidir.',
        ],
      },
      {
        h: 'Örüntüler derste ve evde nasıl çalışılır?',
        p: ['Boncuk dizme, kaldırım taşları, kumaş desenleri ve şarkı ritimleri örüntü görmek için harika fırsatlardır. Çocuğa yalnızca örüntüyü sürdürmesini değil, kendi örüntüsünü kurup kuralını söylemesini de isteyin.'],
        list: ['Örüntü bloklarıyla tekrarlı desen kurma', 'Yüzlük tabloda 4’er saymanın oluşturduğu deseni bulma', '“Kuralım ne?” oyunu: biri örüntü kurar, diğeri kuralı tahmin eder'],
      },
    ],
    faq: [
      { q: 'Örüntü kuralı nasıl bulunur?', a: 'Ardışık terimler arasındaki fark ya da ilişki incelenir. Fark hep aynıysa kural “ekle” veya “çıkar”dır; her terim bir öncekinin katıysa “ile çarp”tır. Bulunan kural bütün terimlerde denenerek kontrol edilir.' },
      { q: 'Örüntü nedir, örnek verir misiniz?', a: 'Belli bir kurala göre devam eden dizidir. 5, 10, 15, 20 (5 ekle) bir sayı örüntüsü, ■ ▲ ■ ▲ bir şekil örüntüsüdür.' },
      { q: 'Artan ve azalan örüntü ne demek?', a: 'Artan örüntüde terimler her adımda büyür (2, 4, 6, 8); azalan örüntüde küçülür (20, 17, 14, 11).' },
      { q: 'Örüntünün tekrar eden kısmı nedir?', a: 'Tekrarlı örüntülerde sürekli yinelenen en küçük gruptur. A B B A B B örüntüsünde tekrar eden kısım A B B’dir.' },
    ],
    tools: ['oruntubloklari', 'yuzluk', 'numberline'],
    games: ['matematik-bahcem', 'balon', 'makine'],
    interactions: ['oruntu-tasarimcisi', 'oruntuden-kurala', 'yuzluk-gizem'],
  },
  {
    slug: 'bolme-islemi',
    title: 'Bölme İşlemi Nasıl Yapılır? Bölünen, Bölen, Bölüm ve Kalan',
    seoTitle: 'Bölme İşlemi Nasıl Yapılır? Bölünen, Bölen, Bölüm, Kalan',
    description: 'Bölme işlemi nasıl yapılır? Bölünen, bölen, bölüm ve kalan nedir, bölme nasıl kontrol edilir? Eşit paylaştırma ve kalanlı bölme örnekleri. 2–4. sınıf.',
    grades: [2, 3, 4],
    outcomes: ['MAT.2.2.4', 'MAT.3.2.4', 'MAT.4.2.4', 'MAT.4.2.5'],
    intro: 'Bölme, bir çokluğu eşit gruplara ayırma işlemidir. 17 ÷ 5 işleminde 17 bölünen, 5 bölen, 3 bölüm ve 2 kalandır; çünkü 5 × 3 = 15 ve 17 − 15 = 2’dir. Bölmenin doğru olup olmadığı “bölen × bölüm + kalan = bölünen” ile kontrol edilir.',
    sections: [
      {
        h: 'Bölmenin iki anlamı: paylaştırma ve gruplama',
        p: [
          'Eşit paylaştırma: 12 elma 3 çocuğa eşit paylaştırılırsa her çocuk kaç elma alır? Elmalar tek tek dağıtılır; her çocuk 4 elma alır: 12 ÷ 3 = 4.',
          'Gruplama (ölçme): 12 elma 3’erli tabaklara konursa kaç tabak gerekir? 3’er 3’er ayrılır; 4 tabak dolar: 12 ÷ 3 = 4. İşlem aynıdır ama soru farklıdır. İki anlamı da tanıyan çocuk problemlerde hangi işlemi yapacağını daha kolay seçer.',
        ],
      },
      {
        h: 'Bölünen, bölen, bölüm ve kalan nedir?',
        list: ['Bölünen: bölünecek sayı (17 ÷ 5’te 17)', 'Bölen: kaça bölündüğü (5)', 'Bölüm: işlemin sonucu (3)', 'Kalan: eşit gruplardan artan miktar (2)'],
        p: ['Kalan her zaman bölenden küçük olmalıdır. 17 ÷ 5 işleminde kalanı 7 bulduysan bir grup daha oluşturabilirsin demektir; bölüm küçük bulunmuştur.'],
      },
      {
        h: 'Bölme işlemi nasıl kontrol edilir?',
        p: ['Bölme, çarpmanın tersidir. Kontrol için bölen ile bölümü çarp, kalanı ekle; sonuç bölüneni vermelidir.'],
        list: ['17 ÷ 5 = 3, kalan 2 → 5 × 3 + 2 = 17 ✓', '84 ÷ 4 = 21 → 4 × 21 = 84 ✓', '156 ÷ 6 = 26 → 6 × 26 = 156 ✓', '50 ÷ 7 = 7, kalan 1 → 7 × 7 + 1 = 50 ✓'],
      },
      {
        h: 'Uzun bölme adım adım (4. sınıf)',
        p: [
          '96 ÷ 4 işleminde soldan başlarız: 9 onlukta kaç tane 4 var? 2 (8 onluk), 1 onluk artar. Artan 1 onluk 10 birliktir; 6 birlikle birlikte 16 birlik eder. 16’da 4 tane 4 vardır. Bölüm 24, kalan 0’dır.',
          'Her adımda “böl, çarp, çıkar, sonraki basamağı indir” sırası izlenir. Basamak değerini düşünmek, bölümün ortasına gelmesi gereken 0’ları unutmamayı sağlar: 816 ÷ 8 = 102.',
        ],
      },
      {
        h: 'Kısa yoldan bölme ve kalanı yorumlama',
        p: [
          'Sonu sıfırla biten bir sayıyı 10, 100 ya da 1000’e bölerken sondan bölen kadar sıfır silinir: 4 500 ÷ 100 = 45, 7 000 ÷ 10 = 700.',
          'Problemlerde kalan duruma göre yorumlanır. 26 öğrenci 4 kişilik araçlara binecekse 26 ÷ 4 = 6, kalan 2’dir; artan 2 öğrenci için bir araç daha gerekir, cevap 7 araçtır. 26 lira ile 4 liralık kalemden ise 6 tane alınabilir.',
        ],
      },
      {
        h: 'Bölme evde nasıl öğretilir?',
        p: ['Sofrada meyveleri, oyunda kartları eşit paylaştırmak bölmenin doğal başlangıcıdır. Çarpım tablosunu bölmeyle birlikte çalışın: “6 × 4 = 24 ise 24 ÷ 6 kaçtır?”'],
        list: ['Fasulyeleri tabaklara eşit dağıtıp artanı “kalan” olarak adlandırma', 'Aynı sayıyla hem paylaştırma hem gruplama problemi kurma', 'Bölmenin sonucunu çarpmayla kontrol etmeyi alışkanlık hâline getirme'],
      },
    ],
    faq: [
      { q: 'Bölmede kalan bölenden büyük olabilir mi?', a: 'Hayır. Kalan bölenden büyük ya da bölene eşitse bir grup daha oluşturulabilir; bu durumda bölüm 1 artırılmalıdır.' },
      { q: 'Bölme işlemi nasıl sağlanır?', a: 'Bölen ile bölüm çarpılıp kalan eklenir. Sonuç bölünene eşitse işlem doğrudur: bölen × bölüm + kalan = bölünen.' },
      { q: 'Bir sayı 0’a bölünebilir mi?', a: 'Hayır, 0’a bölme tanımsızdır. Ama 0’ın herhangi bir sayıya bölümü 0’dır: 0 ÷ 5 = 0.' },
      { q: 'Bölme ile çarpma arasındaki ilişki nedir?', a: 'Bölme çarpmanın tersidir. 3 × 8 = 24 biliniyorsa 24 ÷ 3 = 8 ve 24 ÷ 8 = 3 de bilinir.' },
      { q: 'Kalanlı bölme kaçıncı sınıfta öğretilir?', a: 'Bölmenin anlamı 2. sınıfta, çarpım tablosuyla ilişkili bölme 3. sınıfta, kalanlı ve çok basamaklı bölme ile kalanı yorumlama 3–4. sınıfta işlenir.' },
    ],
    tools: ['dizilim', 'base10'],
    games: ['lunapark', 'kurabiye-fabrikasi'],
    interactions: ['bolmeye-giris', 'kalani-yorumla', 'pasta-paylasimi', 'sepetlere-grupla'],
  },
  {
    slug: 'zihinden-toplama-cikarma',
    title: 'Zihinden Toplama ve Çıkarma Nasıl Yapılır? 5 Strateji',
    seoTitle: 'Zihinden Toplama ve Çıkarma Stratejileri: Örneklerle',
    description: 'Zihinden toplama ve çıkarma nasıl yapılır? Onluğa tamamlama, ikiye katlama, ayırarak toplama, dengeleme ve sayı doğrusunda zıplama. 1–2. sınıf etkinlikleri.',
    grades: [1, 2],
    outcomes: ['MAT.1.2.2', 'MAT.2.2.2', 'MAT.1.2.4', 'MAT.2.2.3'],
    intro: 'Zihinden toplama ve çıkarmada sayılar kolay hesaplanan parçalara ayrılır. En çok kullanılan stratejiler onluğa tamamlama (8 + 5 = 8 + 2 + 3), ikiye katlama (6 + 7 = 6 + 6 + 1), basamaklara ayırma (34 + 25 = 50 + 9), dengeleme (29 + 16 = 30 + 15) ve sayı doğrusunda zıplamadır.',
    sections: [
      {
        h: '1. Onluğa tamamlama',
        p: ['Toplananlardan birini 10’a ya da bir sonraki onluğa tamamla, kalanını ekle. 10’la toplamak çok kolay olduğu için bu strateji 1. sınıfın temel taşıdır.'],
        list: ['8 + 5 = 8 + 2 + 3 = 10 + 3 = 13', '9 + 7 = 9 + 1 + 6 = 16', '38 + 7 = 38 + 2 + 5 = 45', '13 − 5 = 13 − 3 − 2 = 10 − 2 = 8'],
      },
      {
        h: '2. İkiye katlama ve “bir fazlası”',
        p: ['Aynı sayıların toplamı (5 + 5, 7 + 7) çoğu çocuğun erken öğrendiği bilgilerdir. Yakın sayıları bunlardan türet.'],
        list: ['6 + 7 = 6 + 6 + 1 = 13', '8 + 9 = 8 + 8 + 1 = 17', '15 + 16 = 15 + 15 + 1 = 31'],
      },
      {
        h: '3. Onluk ve birliklere ayırarak toplama',
        p: ['İki basamaklı sayıları onluk ve birliklerine ayır; önce onlukları, sonra birlikleri topla. Sayı doğrusunda ise ikinci sayıyı parça parça ekleyerek zıpla.'],
        list: ['34 + 25 = (30 + 20) + (4 + 5) = 50 + 9 = 59', '46 + 28 = 46 + 20 + 8 = 66 + 8 = 74', '75 − 32 = 75 − 30 − 2 = 43'],
      },
      {
        h: '4. Dengeleme (yuvarlayıp düzeltme)',
        p: [
          'Bir sayıyı en yakın onluğa yuvarla, sonra farkı düzelt. Toplamada birinden alıp diğerine vermek sonucu değiştirmez: 29 + 16 = 30 + 15 = 45.',
          'Çıkarmada 9’la biten sayılar için çok kullanışlıdır: 52 − 19 = 52 − 20 + 1 = 33. Fazladan 1 çıkardığımız için 1’i geri ekleriz.',
        ],
      },
      {
        h: '5. Çıkarmayı toplama olarak düşünme (fark bulma)',
        p: ['Sayılar birbirine yakınsa küçük sayıdan büyüğe doğru ileri say. 63 − 58: 58’den 60’a 2, 60’tan 63’e 3; toplam 5. Böylece toplama ile çıkarma arasındaki ilişki de pekişir: 58 + 5 = 63 ise 63 − 58 = 5.'],
      },
      {
        h: 'Zihinden işlem evde nasıl çalışılır?',
        p: [
          'Çocuğa yalnızca sonucu değil “Nasıl düşündün?” sorusunu sorun. Aynı işlemi iki farklı stratejiyle çözmek, ezberden çok daha değerlidir. Market alışverişinde, otobüs durak sayılarında, oyun puanlarında doğal zihinden işlem fırsatları vardır.',
        ],
        list: ['Onluk çerçevede 8 + 5’i gösterip 10’u tamamlama', '“Hangi işlem daha kolay: 29 + 16 mı, 30 + 15 mi? Neden sonuç aynı?”', 'Her gün 3 işlem: biri onluğa tamamlama, biri ikiye katlama, biri dengeleme'],
      },
    ],
    faq: [
      { q: 'Zihinden toplama nasıl öğretilir?', a: 'Önce 10’a tamamlama ve ikiye katlama gibi temel bilgiler onluk çerçeve ve sayı doğrusuyla somutlaştırılır; ardından iki basamaklı sayılarda onluk-birlik ayırma ve dengeleme stratejilerine geçilir.' },
      { q: '1. sınıfta zihinden toplama kaça kadardır?', a: '1. sınıfta 20’ye kadar sayılarla, 2. sınıfta 100’e kadar sayılarla zihinden toplama ve çıkarma çalışılır.' },
      { q: 'Onluğa tamamlama stratejisi nedir?', a: 'Toplananlardan birini 10’a tamamlamak için diğerinden parça almaktır: 8 + 5’te 5’ten 2 alınıp 8 10’a tamamlanır, kalan 3 eklenir: 13.' },
      { q: 'Zihinden çıkarma için en kolay yol hangisi?', a: 'Sayılar birbirine yakınsa küçükten büyüğe ileri saymak; çıkan sayı 9 ya da 8 ile bitiyorsa en yakın onluğu çıkarıp farkı geri eklemek (52 − 19 = 52 − 20 + 1) genellikle en kolay yoldur.' },
    ],
    tools: ['tenframe', 'numberline', 'rekenrek'],
    games: ['sayi-konusmalari', 'sayi-adalari', 'kurbaga'],
    interactions: ['zihinden-toplama-cikarma', 'islem-ailesi', 'sayiyi-parcala', 'toplama-cikarma-hikayeleri'],
  },
  {
    slug: 'paralarimiz',
    title: 'Paralarımız: Lira ve Kuruş, Para Hesaplama ve Para Üstü',
    seoTitle: 'Paralarımız: Lira ve Kuruş, Para Üstü Hesaplama',
    description: 'Paralarımız konusu: madeni ve kâğıt paralar, 1 lira kaç kuruş, lira-kuruş dönüşümleri, alışverişte para hesaplama ve para üstü örnekleri. 1–3. sınıf.',
    grades: [1, 2, 3],
    outcomes: ['MAT.1.1.9', 'MAT.2.1.8', 'MAT.3.1.16'],
    intro: 'Türkiye’nin para birimi Türk lirasıdır (₺) ve 1 lira 100 kuruştur. Madeni paralar kuruşları ve 1 lirayı, kâğıt paralar 5, 10, 20, 50, 100, 200 lira gibi daha büyük değerleri gösterir. Para hesaplarken liraları ve kuruşları ayrı ayrı toplar, 100 kuruşu 1 liraya çeviririz.',
    sections: [
      {
        h: 'Madeni paralar ve kâğıt paralar',
        p: [
          '1. sınıfta paraları tanımak, değerlerini karşılaştırmak ve küçük alışverişlerde kullanmak hedeflenir. Paranın büyüklüğü ya da sayısı değerini göstermez: tek bir 10 liralık, beş tane 1 liradan daha değerlidir.',
          '2. sınıfta aynı miktarın farklı paralarla gösterilebileceği fark edilir: 10 lira = 5 lira + 5 lira = 5 lira + 1 + 1 + 1 + 1 + 1 lira.',
        ],
      },
      {
        h: '1 lira kaç kuruş? Lira-kuruş dönüşümleri',
        list: ['1 lira = 100 kuruş', '50 kuruş = yarım lira', '25 kuruş = çeyrek lira', '2 lira 50 kuruş = 250 kuruş', '375 kuruş = 3 lira 75 kuruş', '4 lira = 400 kuruş'],
        p: ['Fiyat etiketlerinde 13,75 ₺ biçiminde yazılan fiyat “13 lira 75 kuruş” diye okunur. Virgülün solu lirayı, sağı kuruşu gösterir.'],
      },
      {
        h: 'Para hesaplama örnekleri',
        p: [
          'Toplarken liraları liralarla, kuruşları kuruşlarla topla. Kuruşlar 100’ü geçerse 100 kuruşu 1 liraya çevir: 3 lira 60 kuruş + 2 lira 75 kuruş = 5 lira 135 kuruş = 6 lira 35 kuruş.',
          'Kumbaradaki paraları sayarken büyükten küçüğe sıralayıp ritmik saymak işi kolaylaştırır: 20, 30, 35, 36, 37 lira.',
        ],
      },
      {
        h: 'Para üstü nasıl hesaplanır?',
        p: [
          'Para üstü, verilen paradan alışveriş tutarı çıkarılarak bulunur. Zihinden hesaplamanın kolay yolu, tutardan verilen paraya kadar “üstüne sayma”dır: Kasiyerler de çoğu zaman böyle yapar.',
          '13 lira 75 kuruşluk alışveriş için 20 lira verilirse: 13,75 → 14 lira (25 kuruş), 14 → 20 lira (6 lira). Para üstü 6 lira 25 kuruştur.',
        ],
        list: ['10 lira veriliyor, tutar 7 lira → para üstü 3 lira', '50 lira veriliyor, tutar 32 lira → para üstü 18 lira', '5 lira veriliyor, tutar 3 lira 50 kuruş → para üstü 1 lira 50 kuruş'],
      },
      {
        h: 'Paralarımız evde nasıl çalışılır?',
        p: ['Gerçek ya da oyun paralarıyla evde küçük bir “bakkal” kurun; ürünlere fiyat etiketi yapıştırıp çocuğun hem ödeme yapmasını hem de para üstü vermesini sağlayın. Gerçek markette fişteki toplamı tahmin etmek de iyi bir alıştırmadır.'],
        list: ['Aynı tutarı en az paralarla ödeme', 'Kumbaradaki paraları sayıp lira-kuruş olarak yazma', '“Bu iki ürünü alırsam 20 liram yeter mi?” tahmin soruları'],
      },
    ],
    faq: [
      { q: '1 lira kaç kuruştur?', a: '1 Türk lirası 100 kuruştur. Bu yüzden 50 kuruş yarım lira, 25 kuruş çeyrek liradır.' },
      { q: 'Paralarımız konusu kaçıncı sınıfta işlenir?', a: 'Paraları tanıma 1. sınıfta, farklı paralarla aynı tutarı gösterme 2. sınıfta, lira-kuruş dönüşümleri ve para problemleri 3. sınıfta işlenir.' },
      { q: 'Para üstü en kolay nasıl hesaplanır?', a: 'Alışveriş tutarından başlayıp verilen paraya kadar ileri sayılır: 7,50 liralık alışverişte 10 lira verilirse 7,50 → 8 (50 kuruş) → 10 (2 lira); para üstü 2 lira 50 kuruştur.' },
      { q: '350 kuruş kaç liradır?', a: '350 kuruş = 300 kuruş + 50 kuruş = 3 lira 50 kuruştur.' },
    ],
    tools: ['money'],
    games: ['kasa'],
    interactions: ['hangisi-mantikli'],
  },
]
