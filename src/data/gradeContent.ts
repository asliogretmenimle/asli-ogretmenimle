import type { Grade } from './types'

/**
 * Sınıf sayfalarının (/sinif/:g) özgün metni: "6. sınıf matematik", "6. sınıf matematik konuları" gibi
 * yüksek hacimli aramaların hedef sayfası. Konu listesi ve "konular nelerdir?" cevabı veriden üretilir
 * (scripts/prerender.ts); burada sınıfa özgü anlatım ve sık sorulan sorular durur.
 */
export interface GradeContent {
  /** Sayfanın giriş paragrafları: bu sınıfta matematik neye odaklanır */
  intro: string[]
  /** Evde/derste nasıl çalışılır */
  tips: string[]
  /** Sınıfa özgü sorular (konu listesi sorusu otomatik eklenir) */
  faq: { q: string; a: string }[]
}

export const gradeContent: Record<Grade, GradeContent> = {
  1: {
    intro: [
      '1. sınıf matematikte çocuk sayıları ezberlemekten çok sayının ne anlama geldiğini keşfeder: 20’ye kadar nesneleri sayar, bir sayıyı parçalarına ayırır (7 = 5 + 2), çok-az-eşit karşılaştırması yapar ve ritmik sayar. Toplama ve çıkarma, “birleştirme” ve “ayırma” hikâyeleriyle somut nesneler üzerinden başlar.',
      'Geometride yön ve konum (sağ, sol, önünde, arkasında), eş nesneler ve temel geometrik şekiller; ölçmede uzunluk ve kütleyi standart olmayan birimlerle karşılaştırma; veri konusunda ise basit tablo oluşturma çalışılır. Paralarımız konusu da günlük hayatla ilk bağlantıyı kurar.',
    ],
    tips: [
      'Onluk çerçeve ve sayı boncuğu (rekenrek) gibi materyaller, 5 ve 10 etrafında düşünmeyi kolaylaştırır; parmakla tek tek saymaktan kurtulmanın en hızlı yoludur.',
      'Günde 10 dakikalık kısa oyunlar, uzun ödevlerden daha etkilidir. Market alışverişi, sofrayı kurarken tabak sayma ve merdiven basamaklarını ritmik sayma iyi fırsatlardır.',
    ],
    faq: [
      { q: '1. sınıf öğrencisi kaça kadar saymalı?', a: '1. sınıf matematik programında sayılar 20’ye kadar ele alınır: nesne sayma, sayıları okuma-yazma, parçalama ve karşılaştırma bu aralıkta yapılır. Ritmik sayma çalışmalarıyla 100’e kadar sesli sayma da desteklenir.' },
      { q: '1. sınıfta toplama ve çıkarma nasıl öğretilir?', a: 'Önce somut nesnelerle “birleştirme” ve “ayırma” hikâyeleri canlandırılır, sonra onluk çerçeve gibi modellerle 10’a tamamlama ve sayıyı parçalama stratejileri kullanılır. Sembolik işlem en son aşamadır; amaç ezber değil, işlemin anlamını kavramaktır.' },
      { q: '1. sınıf matematik etkinlikleri ücretsiz mi?', a: 'Evet. Aslı Öğretmenimle’deki bütün 1. sınıf matematik etkinlikleri, oyunları ve sanal manipülatifleri ücretsizdir; üyelik gerektirmez, telefon, tablet ve akıllı tahtada çalışır.' },
    ],
  },
  2: {
    intro: [
      '2. sınıf matematikte sayı aralığı 100’e çıkar ve onluk-birlik kavramı merkeze yerleşir: 47 sayısının 4 onluk ve 7 birlikten oluştuğunu görmek, eldeli toplama ve onluk bozarak çıkarmanın temelidir. Ritmik sayma 2’şer, 5’er ve 10’ar ilerler; sayı ve şekil örüntüleri genişler.',
      'Bu sınıfta çarpma ve bölmeye giriş yapılır: çarpma tekrarlı toplama ve eşit gruplar, bölme ise eşit paylaştırma olarak modellenir. Bütün-yarım-çeyrek ile kesirlere ilk adım atılır; paralarımız, saat okuma, metre ve kilogram gibi ölçme konuları günlük hayatla birlikte işlenir. Geometride cisimler, şekiller, simetri ve yön bulma; veri konusunda tablo ve grafik yer alır.',
    ],
    tips: [
      'Onluk taban blokları ve yüzlük tablo, iki basamaklı sayıları “görmeyi” sağlar. Toplama-çıkarma problemlerinde önce tahmin, sonra işlem alışkanlığı kazandırın.',
      'Çarpım tablosunu ezberlemeden önce eşit grupları ve dizileri (sıra-sütun düzenleri) modellemek, çarpmanın anlamını kalıcı kılar.',
    ],
    faq: [
      { q: '2. sınıfta çarpım tablosu var mı?', a: '2. sınıfta çarpma ve bölmeye giriş yapılır; çarpma eşit gruplar ve tekrarlı toplama, bölme eşit paylaştırma olarak öğretilir. Çarpım tablosunun tamamı 3. sınıfta pekiştirilir, ancak 2’ler, 5’ler ve 10’lar gibi ritmik sayma ile bağlantılı çarpımlar 2. sınıfta çalışılır.' },
      { q: '2. sınıf matematikte en çok zorlanılan konu hangisi?', a: 'Onluk bozarak çıkarma ve eldeli toplama en sık zorlanılan konulardır. Taban blokları ya da sayı doğrusu ile modelleme, işlemin nedenini göstererek bu zorluğu büyük ölçüde azaltır.' },
      { q: '2. sınıf matematik etkinlikleri akıllı tahtada kullanılabilir mi?', a: 'Evet. Etkinlikler ve sanal manipülatifler dokunmatik ekranlara göre tasarlandı; akıllı tahtada sınıfça, evde tablette tek başına kullanılabilir.' },
    ],
  },
  3: {
    intro: [
      '3. sınıf matematikte sayılar 1000’e kadar genişler; basamak değeri, sayıları sıralama, tek ve çift sayılar çalışılır. Dört işlemin hepsi bu sınıfta bir araya gelir: zihinden toplama-çıkarma stratejileri, çarpım tablosu, çarpma ve bölme işlemleri ile birden fazla adımlı problemler ve problem kurma.',
      'Kesirlerde yarım, çeyrek ve birim kesirlerle pay-payda kavramı başlar. Saat okuma, zaman ölçü birimleri, uzunluk, kütle, sıvı ölçme ve lira-kuruş konuları ölçme alanını oluşturur. Geometride cisimlerin özellikleri, şekillerin kenar sayısı, çevre uzunluğu ve simetri; veri konusunda çetele tablosu ve grafik işlenir.',
    ],
    tips: [
      'Çarpım tablosunu ezberden önce “stratejiyle” öğretin: 4’ler 2’lerin iki katıdır, 9’lar 10’lardan bir grup eksiktir. Değişme özelliği sayesinde öğrenilecek çarpım sayısı yarıya iner.',
      'Kesirlerde her zaman “bütün neydi?” sorusunu sorun; aynı 1/2 farklı bütünlerde farklı büyüklüktedir.',
    ],
    faq: [
      { q: '3. sınıfta hangi çarpım tabloları öğrenilir?', a: '3. sınıfta 1’den 10’a kadar çarpım tablosu tamamlanır ve zihinden çarpma-bölme stratejileriyle pekiştirilir. Sitedeki çarpma oyunları ve etkinlikleri ezber yerine eşit gruplar, diziler ve ikiye katlama gibi stratejilerle çalışır.' },
      { q: '3. sınıf kesirler konusu neleri kapsar?', a: 'Bütün, yarım ve çeyrek; birim kesirler (1/2, 1/3, 1/4 …) ve pay-payda kavramı. Kesir şeritleri ve kesir daireleriyle bir bütünün eş parçalara ayrılması modellenir.' },
      { q: '3. sınıf matematik oyunları hangi konulara uygun?', a: 'Sitedeki oyunlar 3. sınıf için çarpma, bölme, toplama-çıkarma, basamak değeri, kesirler, para hesabı, alan-çevre ve simetri konularında seviye seçilerek oynanabilir.' },
    ],
  },
  4: {
    intro: [
      '4. sınıf matematikte altı basamaklı sayılar, basamak ve bölük kavramları, sayıları sıralama ve örüntü kuralı bulma çalışılır. Dört işlemde çarpma ve bölmede tahmin, kısa yoldan çarpma-bölme (10, 100, 1000 ile), işlem yönergeleri ve çok adımlı problemler öne çıkar.',
      'Kesirler bu sınıfta derinleşir: basit, bileşik ve tam sayılı kesirler, denk kesirler, birim kesirleri karşılaştırma, bir çokluğun kesri ve paydaları eşit kesirlerle toplama-çıkarma. Geometride cisimlerin açınımları, çevre ve alan tahmini, açı ölçme ve dar-dik-geniş açı, doğruya göre simetri; veri ve olasılıkta ise imkânsız-olası-kesin kavramları yer alır.',
    ],
    tips: [
      'Kesirleri karşılaştırırken sayı doğrusu ve kesir şeritleri kullanın; “payda büyüdükçe parça küçülür” fikri modelle kalıcı olur.',
      'Alan ve çevreyi birim karelerle sayarak başlatın; formül 5. sınıfta, anlam oturduktan sonra gelir.',
    ],
    faq: [
      { q: '4. sınıf matematikte kesirler zor mu?', a: 'Kesirler 4. sınıfın en kapsamlı konusudur; denk kesirler ve bileşik kesirler sık zorlanılan yerlerdir. Kesir şeritleri, kesir daireleri ve sayı doğrusu gibi modellerle çalışmak, kuralları ezberlemeden anlamayı sağlar.' },
      { q: '4. sınıfta açılar konusu neleri içerir?', a: 'Açının dönme miktarı olarak anlamı, açıyı standart birim (derece) ve iletkiyle ölçme, dar, dik ve geniş açıları tanıma. Sitedeki online açı ölçer ile açı oluşturup ölçebilirsiniz.' },
      { q: '4. sınıf matematik etkinlikleri hangi müfredata göre hazırlandı?', a: 'Etkinlikler Türkiye Yüzyılı Maarif Modeli matematik öğretim programının öğrenme çıktılarıyla eşleştirildi ve somuttan soyuta (keşfet, modelle, sembolle çöz, problem) sıralandı.' },
    ],
  },
  5: {
    intro: [
      '5. sınıf matematik, ortaokulun ilk yılı olarak ilkokulda öğrenilenleri genişletir ve daha soyut düşünmeye köprü kurar. Geometride nokta, doğru, ışın ve doğru parçası, paralel ve dik doğrular, açı ölçme, komşu ve ters açılar, çokgenler ve çember işlenir. Sayılarda büyük sayıların okunuşu-yazılışı ve doğal sayı problemleri çalışılır.',
      'Alan ve çevre konusunda dikdörtgenin alanı ve çevresi ile ikisi arasındaki ilişki; kesirlerde farklı gösterimler ve kesirleri karşılaştırma; cebirsel düşünmede eşitlik, işlem özellikleri, işlem önceliği, örüntü kuralı ve algoritma/akış şeması yer alır. Veri ve grafikler ile olasılık çizelgesi (daha olası, daha az olası) yılı tamamlar.',
    ],
    tips: [
      'İşlem önceliğinde kuralı ezberletmek yerine “neden önce çarpma?” sorusunu modellerle tartışın; parantezin rolü böylece kalıcı olur.',
      'Alan-çevre karışıklığı için aynı çevreye sahip farklı dikdörtgenler çizdirin: çevre aynı kalırken alanın değiştiğini görmek kavramı netleştirir.',
    ],
    faq: [
      { q: '5. sınıf matematikte en önemli konular hangileri?', a: 'Kesirleri karşılaştırma, işlem önceliği, alan ve çevre ilişkisi ile açılar 5. sınıfın temel taşlarıdır; 6. ve 7. sınıftaki ondalık gösterim, cebirsel ifadeler ve alan hesapları bu konuların üzerine kurulur.' },
      { q: '5. sınıf matematik ders kitabı cevapları burada var mı?', a: 'Sitede ders kitabı cevap anahtarı yoktur. Bunun yerine her 5. sınıf konusu için konu anlatımı, çözümlü örnekler ve anında geri bildirim veren interaktif etkinlikler bulunur; öğrenci cevabı ezberlemek yerine nasıl bulunduğunu görür.' },
      { q: '5. sınıf matematik etkinlikleri üyelik istiyor mu?', a: 'Hayır. Bütün etkinlikler, oyunlar ve sanal manipülatifler ücretsizdir ve üyelik gerektirmez.' },
    ],
  },
  6: {
    intro: [
      '6. sınıf matematik sayılar teorisiyle açılır: çarpanlar ve katlar, bölünebilme kuralları, asal sayılar ve asal çarpanlara ayırma, EBOB ve EKOK. Ardından ondalık gösterim, kesir-bölme ilişkisi, kesir-ondalık-yüzde dönüşümleri ve uzunluk ölçü birimleri gelir.',
      'Cebirde bilinmeyeni bulma, örüntüden cebirsel ifadeye geçiş ve cebirsel ifadeler; geometride paralel doğrularda açılar, yamuk ve paralelkenar, dörtgenlerde köşegen ve iç açılar; ölçmede alan ölçü birimleri, paralelkenar ve üçgenin alanı, pi sayısı, çemberin çevresi ile merkez açı ve yay çalışılır. Veri analizinde aritmetik ortalama, olasılıkta ise deneysel olasılık yer alır.',
    ],
    tips: [
      'EBOB ve EKOK’u formülden önce gerçek durumlarla (fayans döşeme, otobüs kalkış saatleri) modelleyin; hangi problemin EBOB, hangisinin EKOK olduğunu ayırt etmek asıl zorluktur.',
      'Pi sayısını bir ölçme deneyiyle keşfettirin: farklı dairesel nesnelerin çevresini çapına bölünce hep 3’ten biraz fazla bulunur.',
    ],
    faq: [
      { q: '6. sınıf matematikte EBOB ve EKOK nasıl çalışılmalı?', a: 'Önce çarpan ve kat kavramları, sonra asal çarpanlara ayırma sağlamlaştırılmalı. EBOB “en büyük ortak parça”, EKOK “ilk ortak buluşma” problemlerinde kullanılır. Sitedeki EBOB-EKOK simülasyonları ve tiyatro etkinlikleri bu ayrımı görsel olarak gösterir.' },
      { q: '6. sınıfta cebirsel ifadeler konusu neleri kapsar?', a: 'Değişken, terim ve katsayı kavramları, sözel durumları cebirsel ifadeyle yazma, örüntünün kuralını cebirsel ifadeyle gösterme ve bir ifadenin değerini hesaplama.' },
      { q: '6. sınıf matematik oyunları hangi konularda?', a: 'Çarpanlar ve katlar, asal sayılar, kesirler, ondalık gösterim, alan, açılar, cebirsel ifadeler ve veri analizi için 6. sınıf seviyesinde oynanabilen ücretsiz oyunlar vardır.' },
    ],
  },
  7: {
    intro: [
      '7. sınıf matematikte sayı kümesi negatif sayılar ve kesirlerle genişler: tam sayılar, rasyonel sayılar ve ondalık gösterimleri, rasyonel sayıları sıralama ve rasyonel sayılarla dört işlem. Oran, orantı ve doğru orantı ile gündelik problemler (tarif ölçekleme, indirim, hız) matematikleşir.',
      'Cebirde cebirsel ifadelerle işlemler, denklem ve eşitsizlik, sayılarla ispat ve algoritma çalışılır. Geometride prizmaların görünümleri, yüzey alanı ve hacmi; dairenin, daire diliminin, eşkenar dörtgenin ve yamuğun alanı; yansıma dönüşümü, orta dikme, açıortay, kenarortay ve yükseklik yer alır. Veri analizinde ortalama, ortanca ve tepe değer; olasılıkta olay, tümleyen olay ve ayrık olaylar işlenir.',
    ],
    tips: [
      'Tam sayılarla işlemlerde işaret kurallarını sayı doğrusu ve sayma pullarıyla (sıfır çiftleri) modelleyin; “eksi ile eksi artı yapar” cümlesi ancak bu modellerle anlam kazanır.',
      'Denklem çözmeyi terazi modeliyle başlatın: iki tarafa aynı işlemi yapmak eşitliği korur. Bu fikir 8. sınıftaki doğrusal denklemlerin temelidir.',
    ],
    faq: [
      { q: '7. sınıf matematikte en zor konu hangisi?', a: 'Öğrencilerin en çok zorlandığı konular genellikle rasyonel sayılarla işlemler, denklem kurma ve prizmaların hacmi-yüzey alanıdır. Model ve görselle çalışmak, kuralları anlamlı hâle getirir.' },
      { q: '7. sınıf oran orantı konusu neyi kapsar?', a: 'İki çokluğun oranı, orantı kurma, doğru orantılı çokluklar ve birim oran. Tarif ölçekleme, harita ölçeği ve fiyat karşılaştırma gibi gerçek hayat problemleriyle çalışılır.' },
      { q: '7. sınıf matematik etkinlikleri LGS’ye hazırlar mı?', a: 'LGS 8. sınıf konularını kapsar, ancak 7. sınıftaki rasyonel sayılar, cebirsel ifadeler, denklemler ve oran-orantı 8. sınıf konularının doğrudan temelidir. Bu konulardaki eksikleri 7. sınıfta kapatmak LGS hazırlığını kolaylaştırır.' },
    ],
  },
  8: {
    intro: [
      '8. sınıf matematik LGS yılıdır ve konular birbirinin üzerine kurulur: çarpanlar ve katlar, üslü ifadeler, kareköklü ifadeler ve gerçek sayılar; cebirsel ifadeler ve özdeşlikler; doğrusal denklemler, eğim ve eşitsizlikler. Geometride üçgenler (açı-kenar ilişkisi, üçgen eşitsizliği, Pisagor bağıntısı), eşlik ve benzerlik, dönüşüm geometrisi ve geometrik cisimler (prizma, piramit, silindir, koni) işlenir.',
      'Veri analizi ve basit olayların olma olasılığı da yılın konuları arasındadır. LGS matematik soruları çoğunlukla bir gerçek hayat durumunu yorumlamayı, birden fazla konuyu birleştirmeyi ve muhakeme etmeyi ister; bu yüzden işlem hızının yanında kavramsal anlama da önemlidir.',
    ],
    tips: [
      'LGS’de yeni nesil sorular uzun metinli ve görsellidir. Her konuyu önce bir model veya grafik üzerinde anlamak, sonra çözümlü örneklerle pekiştirmek soru tiplerine hazırlar.',
      'Üslü ve kareköklü ifadelerde kural listesi ezberlemek yerine örüntü tablolarıyla (2³, 2², 2¹, 2⁰, 2⁻¹ …) kuralın nereden geldiğini görmek hata oranını düşürür.',
    ],
    faq: [
      { q: 'LGS matematik konuları nelerdir?', a: 'LGS matematik soruları 8. sınıf öğretim programından gelir: çarpanlar ve katlar, üslü ifadeler, kareköklü ifadeler, veri analizi, basit olayların olasılığı, cebirsel ifadeler ve özdeşlikler, doğrusal denklemler, eşitsizlikler, üçgenler, eşlik ve benzerlik, dönüşüm geometrisi ve geometrik cisimler. Sınava girilecek yılın kapsamı MEB tarafından ayrıca duyurulur.' },
      { q: '8. sınıf üslü ifadeler nasıl çalışılır?', a: 'Önce bir sayının kuvvetlerinden örüntü tablosu oluşturup sıfırıncı ve negatif kuvvetin anlamını görmek, sonra üslü ifadelerle çarpma-bölme ve bilimsel gösterime geçmek en etkili yoldur. Sitedeki üslü ifadeler konu anlatımında çözümlü örnekler vardır.' },
      { q: '8. sınıf matematik oyunları LGS’ye yardımcı olur mu?', a: 'Oyunlar ve keşif etkinlikleri kavramsal anlamayı güçlendirir: çarpan ağaçları, karekök tahmini, eğim parkuru ve özdeşlik bulmacası gibi oyunlar LGS konularını farklı bir yoldan pekiştirir. Konu anlatımları ve çözümlü örneklerle birlikte kullanılması önerilir.' },
    ],
  },
}
