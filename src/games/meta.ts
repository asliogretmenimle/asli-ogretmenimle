import type { Grade } from '../data/types'
import { nextGenMeta } from './metaNext'

export type GameId =
  | 'balon' | 'kurbaga' | 'gizli-sayi' | 'bir-islem' | 'pizza' | 'kasa'
  | 'robot' | 'tahmin' | 'makine' | 'labirent' | 'gemiler' | 'aci' | 'at-yarisi'
  | 'sayi-adalari'
  | 'kurabiye-fabrikasi'
  | 'denge-kulesi'
  | 'matematik-sehri'
  | 'mozaik-ustasi'
  | 'kesir-takimadalari'
  | 'denklem-kapilari'
  | 'veri-dedektifleri'
  | 'sayi-konusmalari'
  | 'hata-avcisi'
  | 'sayi-treni'
  | 'matematik-bahcem'
  | 'su-muhendisi'
  | 'lunapark'
  | 'kargo-rotasi'
  | 'uzay-kolonisi'
  | 'carpan-fabrikasi'
  | 'iklim-istasyonu'
  | 'kopru-muhendisi'
  | 'lazer-lab'
  | 'trafik-simulatoru'
  | 'kristal-magarasi'

export interface GameMeta {
  id: GameId
  name: string
  /** Kartta görünen tek cümlelik tanıtım */
  description: string
  emoji: string
  color: string
  /** Oyunun uygun olduğu sınıflar */
  grades: Grade[]
  /** Her sınıfta neyin çalışıldığı (başlangıç ekranında gösterilir) */
  skills: Partial<Record<Grade, string>>
  /** Nasıl oynanır: kısa adımlar */
  howTo: string[]
  /** Yeni nesil (keşif/inşa odaklı) oyun */
  nextGen?: boolean
  /** false ise listede gösterilmez (yapım aşamasında) */
  ready?: boolean
  /** Başlarken: oyunu açan kısa hikâye/problem */
  launch?: string
  /** Oyun sonunda Düşün ve Paylaş sorusu */
  reflect?: string
  /** Öğretmen için büyük fikir */
  bigIdea?: string
  /** Oyunun yakalayabildiği stratejiler (öğretmen raporu için) */
  strategies?: string[]
  /** Hangi öğrenme çıktılarına hizmet ettiği (ör. "MAT.1.1.2") */
  outcomes?: string[]
}

/** Klasik oyunlar (bileşenleri yüklemeden listelemek için) */
const classicMeta: GameMeta[] = [
  {
    id: 'balon',
    name: 'Balon Sınıflandırıcı',
    description: 'Süzülen balonları kurala göre sepetlere ayır, gizli kuralı örnek ve karşı örneklerle bul, aynı grubu anlatan farklı kurallar keşfet.',
    emoji: '🎈',
    color: '#ef4444',
    grades: [1, 2, 3, 4, 5, 6],
    skills: {
      1: '10’luk çerçeveyle 5’ten çok mu? 10’dan büyük mü? Toplamı 10 olan çiftler',
      2: 'Tek-çift (ikişerli eşleme), onlar basamağı, 5’er ve 10’ar sayma; gizli kural',
      3: 'Katlar ve çarpma dizilimleri; 50’ye göre toplama-çıkarma tahmini',
      4: 'İki kurallı sınıflama (çift / 3’ün katı), katlar, yüzlüğe yuvarlama, 500’e göre tahmin',
      5: '3, 5, 9, 10 ile bölünebilme; işlem önceliğiyle 100’e göre tahmin',
      6: 'Asal ve bileşik sayılar, bölünebilme kuralları; 1.000’e göre çarpım tahmini',
    },
    howTo: [
      'Görevi oku: kural verilmiş olabilir, gizli olabilir ya da kuralı sen bulacaksın.',
      'Bir balona, sonra doğru sepete dokun. Fikrini değiştirirsen sepetteki balona dokun.',
      'Kontrol et: parlayan balon varsa sorulan soruyu düşün ve düzelt.',
      'Gizli kuralı ya da aynı grubu anlatan farklı kuralları kural kartlarından seç.',
    ],
    launch: 'Lunaparkta balonlar karışmış! Balon ustası her sepete bir kurala uyan balonları koymak istiyor ama bazı kuralları söylemiyor. Balonlara bakarak gizli kuralları çözebilir misin?',
    reflect: 'Bir kuralın doğru olduğundan nasıl emin oldun? Kuralı çürüten bir karşı örnek buldun mu? Aynı grubu anlatan iki farklı kural neden aynı balonları seçiyor?',
    bigIdea: 'Sınıflamak, bir özelliği her örnekte sınamaktır. Bir kuralı tek bir karşı örnek çürütür; aynı küme farklı ama eşdeğer kurallarla anlatılabilir (6’nın katı = hem 2’nin hem 3’ün katı). Tahminde yuvarlama ve işlem önceliği, hesaplamadan önce sonucun yönünü gösterir.',
    strategies: ['Örneklere baktım', 'Karşı örnek aradım', 'Ortak özellik buldum', 'Tahmin edip sınadım', 'Grubun ortak özelliğine baktım', 'Diğerlerinde olmayanı aradım', 'Bir kuralı deneyip sınadım', 'Yuvarladım', 'Bileşenleri karşılaştırdım', 'Tam hesapladım'],
    outcomes: ['MAT.1.1.4', 'MAT.1.2.2', 'MAT.2.1.2', 'MAT.2.1.4', 'MAT.3.1.5', 'MAT.3.2.1', 'MAT.3.2.3', 'MAT.4.2.1', 'MAT.4.2.3', 'MAT.5.2.2', 'MAT.5.2.3', 'MAT.6.1.1', 'MAT.6.1.2', 'MAT.6.1.3'],
  },
  {
    id: 'kurbaga',
    name: 'Kurbağa Zıplatma',
    description: 'Açık sayı doğrusunda kurbağayı yaprağa zıplat: aynı yere farklı yollardan git, farkı ileri sayarak bul.',
    emoji: '🐸',
    color: '#16a34a',
    grades: [1, 2, 3, 4],
    skills: {
      1: '20’ye kadar: 10’a tamamlayarak ileri-geri sayma, iki sayı arası',
      2: '100’e kadar: onluklarla zıplama, telafi (+30 − 1), farkı ileri sayarak bulma',
      3: '1000’e kadar: yüzlüklere tamamlama, geri zıplayarak çıkarma, eksik zıplama',
      4: '10.000’e kadar: binlik ve yüzlüklere tamamlama, telafi ile zihinden işlem',
    },
    howTo: [
      'Kurbağa mavi sayıda, yaprak pembe sayıda. Sayı doğrusunu iki parmakla yakınlaştırabilirsin.',
      'Zıplama kartlarına dokun; aynı karta tekrar dokununca zıplama büyür. İşlem kendiliğinden yazılır.',
      'Yaprağa ulaşınca “Başka yol dene” ile farklı bir yol bul.',
      'Takılırsan “İpucu”na dokun; sana bir soru sorar.',
    ],
    launch: 'Kurbağa 38’deki yapraktan 65’teki yaprağa gitmek istiyor. Önce 40’a mı zıplasın, yoksa 30 ileri zıplayıp biraz geri mi dönsün? Sence kaç farklı yol vardır?',
    reflect: 'Aynı yaprağa giden iki yolunu karşılaştır. Hangisi daha kolaydı? Bir arkadaşına neden kolay olduğunu anlat.',
    bigIdea: 'Sayı doğrusunda toplama ve çıkarma, “zıplamalara ayırma”dır. 10’a ya da yuvarlak sayılara tamamlamak, fazla zıplayıp geri dönmek (telafi) ve basamak değeriyle zıplamak aynı sonuca götürür. İki sayı arasındaki fark, küçükten büyüğe zıplamaların toplamıdır.',
    strategies: ['10’a tamamlama', 'Yuvarlak sayıya tamamlama', 'Telafi (fazla zıpla, geri dön)', 'Basamak değeriyle zıplama', '1’er sayma', 'Tek büyük zıplama', 'Parçalara ayırarak zıplama', 'İleri sayarak çıkarma', 'Eksik parçayı akıl yürüterek bulma'],
    outcomes: ['MAT.1.1.5', 'MAT.1.2.2', 'MAT.1.2.4', 'MAT.2.1.4', 'MAT.2.2.2', 'MAT.2.2.3', 'MAT.3.1.4', 'MAT.3.2.1', 'MAT.4.1.4', 'MAT.4.2.1'],
  },
  {
    id: 'gizli-sayi',
    name: 'Gizli Sayı Dedektifi',
    description: 'Gizli sayının özelliklerini sor, olamayacak sayıları kendin ele; adayları yarıya bölen akıllı soruları keşfet.',
    emoji: '🕵️',
    color: '#7c3aed',
    grades: [1, 2, 3, 4, 6, 7],
    skills: {
      1: '20’ye kadar sayılar: büyük-küçük, çift, 5’er sayma',
      2: 'Yüzlük tablo: tek-çift, onlar ve birler basamağı',
      3: '1000’e kadar sayılar: yüzler-onlar basamağı, katlar, sıralama',
      4: '10.000’e kadar sayılar: basamak değeri ve sıralama',
      6: 'Ondalık gösterimler: tam kısım, onda birler, yuvarlama',
      7: 'Tam sayılar: işaret, sıfıra uzaklık, sıralama',
    },
    howTo: [
      'Soru bankasından bir soru seç (ör. “Çift mi?”, “50’den büyük mü?”) ve dedektife sor.',
      'Cevaba göre artık gizli sayı olamayacak sayılara dokunup çarpı koy, sonra “Eledim”e bas.',
      'Sorunun kaç aday elediğine bak: hangi soru, cevap ne olursa olsun yarısını eler?',
      'Bir sayıdan eminsen ona dokunup tahmin et. Tahmin de bir sorudur!',
    ],
    launch: 'Dedektif bir sayı tuttu ve sana yalnızca “evet” ya da “hayır” diyecek. Tek tek tahmin etmek çok uzun sürer. Hangi soruyu sorarsan en çok sayıyı bir seferde elersin?',
    reflect: 'Hangi sorun en çok işe yaradı? “Gizli sayı 7 mi?” sorusu neden çoğu zaman kötü bir ilk sorudur? Bir arkadaşına açıkla.',
    bigIdea: 'Sayıların özellikleri (çiftlik, katlar, basamak değeri, büyüklük, işaret) bir sayıyı tanımlamanın yollarıdır. Cevabı ne olursa olsun adayların yarısını eleyen soru en verimli sorudur. Yarıya bölme, düzenli düşünmenin ve muhakemenin temelidir.',
    strategies: ['Yarıya bölme', 'Basamak değerine göre sorma', 'Özelliklere göre sorma', 'Tek tek tahmin'],
    outcomes: ['MAT.1.1.1', 'MAT.1.1.5', 'MAT.2.1.2', 'MAT.2.1.3', 'MAT.3.1.2', 'MAT.3.1.3', 'MAT.4.1.2', 'MAT.4.1.3', 'MAT.6.1.5', 'MAT.7.1.3'],
  },
  {
    id: 'bir-islem',
    name: 'Bir İşlem: Çözüm Atölyesi',
    description: 'Sayı kartlarını işlemlerle birleştir, hedefe giden farklı yolları topla ve her yolu işlem ağacında gör.',
    emoji: '🎯',
    color: '#f59e0b',
    grades: [3, 4, 5, 6, 7, 8],
    skills: {
      3: 'Toplama-çıkarma ile aynı hedefe farklı yollar; onlukları kullanma',
      4: 'Dört işlemle hedefe ulaşma (24 oyunu), hedefe yaklaşma tahmini',
      5: 'İşlem önceliği: işlem ağacını parantezle tek satırda yazma',
      6: 'Çarpanlar ve katlar: hedefin çarpan çiftleriyle farklı yollar',
      7: 'Tam sayılarla dört işlem, negatif hedefler',
      8: 'Kare ve kareköklü ifadelerle hedefe ulaşma',
    },
    howTo: [
      'Bir kart, bir işlem, sonra ikinci kartı seç: iki kart birleşip yeni kart olur.',
      'Hedefe ulaşınca yolun işlem ağacıyla kaydedilir ve kartlar başa döner.',
      'Başka bir yol bul! Farklı kartlar ya da farklı işlemler dene.',
      'Takılırsan İpucu’na bas ya da Geri al ile bir adımı değiştir; süre yok.',
    ],
    launch: 'Bir sayıya giden tek bir yol yoktur: 24’e 4 × 6 ile de, 30 − 6 ile de ulaşabilirsin. Bugün aynı hedefe kaç farklı yoldan gidebileceğini keşfedeceğiz.',
    reflect: 'Bulduğun iki yolu karşılaştır: hangisi daha kolaydı, neden? Bir arkadaşına işlem ağacını kullanarak anlat.',
    bigIdea: 'Bir sayı birçok farklı biçimde oluşturulabilir; işlemlerin özellikleri (değişme, birleşme, dağılma) ve işlem önceliği bu yolları birbirine bağlar. İşlem ağacı, tek satırdaki parantezlerin hangi işlemi önce yaptırdığını gösterir.',
    strategies: ['Yaklaş ve ayarla', 'Çarpanlarla düşünme', 'Onlukları önce toplama', 'Kare/karekök kullanma', 'Geriye doğru çalışma (hedeften başlama)', 'Deneme-yanılma'],
    outcomes: ['MAT.3.2.1', 'MAT.3.2.2', 'MAT.3.2.8', 'MAT.4.2.1', 'MAT.4.2.4', 'MAT.4.2.9', 'MAT.5.2.1', 'MAT.5.2.2', 'MAT.6.1.1', 'MAT.7.1.4', 'MAT.8.1.1', 'MAT.8.1.2'],
  },
  {
    id: 'pizza',
    name: 'Kesir Pizzacısı',
    description: 'Pizzaları adil paylaştır, eş parçalara kes ve iki siparişin aynı miktar olup olmadığını dilimleri bölerek kanıtla.',
    emoji: '🍕',
    color: '#ea580c',
    grades: [2, 3, 4, 5],
    skills: {
      2: 'Bütün, yarım, çeyrek; adil paylaşım; iki çeyrek = bir yarım',
      3: 'Eş parçalar, birim kesirler, pay ve paydanın anlamı',
      4: 'Denk kesirleri dilimleri bölerek kanıtlama, 3 pizzayı 4 kişiye paylaştırma',
      5: 'Bileşik ve tam sayılı kesirler: aynı miktarı farklı gösterimlerle oluşturma ve karşılaştırma',
    },
    howTo: [
      'Siparişi ya da paylaşım problemini oku.',
      'Bıçakla pizzaları eş parçalara kes; dilimlere dokunarak malzeme koy ya da tabak seçip dağıt.',
      '“Aynı mı?” siparişlerinde önce tahmin et, sonra dilimleri bölerek kanıtla.',
      'Bulduğun yol çalıştıysa başka bir kesimle yeni bir yol dene!',
    ],
    launch: 'Pizzacıya 4 arkadaş geldi ama fırında yalnızca 3 pizza var. Herkes eşit pay almalı. Pizzaları nasıl kesersin? Her biri ne kadar pizza yer?',
    reflect: '[[2/3]] ile [[4/6]] aynı miktar mı? Bir arkadaşına pizzayı keserek nasıl kanıtlarsın?',
    bigIdea: 'Kesir, bir bütünün EŞ parçalarıyla ilgilidir. Aynı miktar farklı kesirlerle gösterilebilir: her dilimi aynı sayıda parçaya bölmek pizzayı değiştirmez, yalnızca pay ve paydayı aynı sayıyla çarpar. Adil paylaşım bölme ile kesir arasındaki köprüdür.',
    strategies: ['Her pizzayı kişi sayısı kadar böldüm', 'Önce bütün pizzaları dağıttım, sonra kalanı böldüm', 'Önce yarımları dağıttım, sonra kalanı böldüm', 'Daha küçük eş dilimlerle paylaştırdım', 'Deneyerek eşitledim', 'Dilimleri ikiye bölerek kanıtladım', 'Ortak parça büyüklüğü buldum', 'Üst üste koyup karşılaştırdım', 'Yarımla karşılaştırdım', 'Her dilimi ikiye böldüm, dilim sayısını ikiye katladım', 'Pay ve paydayı aynı sayıyla çarptım', 'Bütünü ve kalan parçayı ayrı düşündüm', 'Parçaların büyüklüğüne baktım', 'Eş parçaları hayal edip karşılaştırdım'],
    outcomes: ['MAT.2.1.7', 'MAT.3.1.9', 'MAT.3.1.10', 'MAT.3.1.11', 'MAT.4.1.6', 'MAT.4.1.7', 'MAT.4.1.8', 'MAT.5.1.3', 'MAT.5.1.4'],
  },
  {
    id: 'kasa',
    name: 'Bakkal Kasası',
    description: 'Önce fişin toplamını tahmin et, sonra para üstünü sayı doğrusunda ileri sayarak farklı yollarla hazırla.',
    emoji: '🛒',
    color: '#0891b2',
    grades: [1, 2, 3, 4],
    skills: {
      1: 'Tutarı farklı paralarla oluşturma, 10 ile karşılaştırarak tahmin',
      2: 'Toplamı onluğa yuvarlayarak tahmin, 100 TL’ye kadar ileri sayarak para üstü',
      3: 'Lira ve kuruşla tahmin, tam liraya tamamlayarak para üstü',
      4: 'Çok ürünlü toplamı ve para üstünü tahmin etme, büyük tutarlarla ileri sayma',
    },
    howTo: [
      'Fişe bak; toplamı hesaplamadan tahmin et.',
      'Kasadaki paralara dokun: her para sayı doğrusunda bir zıplama olur.',
      'Tam hedefe varınca “Ver”e bas; sonra aynı tutarı başka paralarla da dene.',
      'Bir müşteri en az parayla ister: büyük paraları akıllıca kullan!',
    ],
    launch: 'Bakkalda kasiyer sensin! Müşteri 37 TL’lik alışverişe 50 TL verdi. Çıkarma yapmadan, 37’den 50’ye ileri sayarak para üstünü nasıl bulursun?',
    reflect: 'Aynı para üstünü iki farklı şekilde verdin. Hangisi daha az para kullandı? Fişten ileri saymak neden çıkarma yapmak gibi?',
    bigIdea: 'Para üstü, ödenen para ile tutar arasındaki farktır; bu fark, tutardan ödenen paraya doğru ileri sayarak (önce yuvarlak sayıya tamamlayıp sonra büyük adımlarla) bulunabilir. Aynı tutar birçok farklı para birleşimiyle oluşturulur; önce tahmin etmek sonucun mantıklılığını denetler.',
    strategies: ['İleri sayma (tamamlama)', 'Büyük paralarla başlama', 'Paraları deneyerek ekleme', 'En az parayla verme', 'Onluğa yuvarladım', 'Önce büyük fiyatları topladım', 'Tam liraya yuvarladım', 'Fişten ileri saydım', 'Çıkarma yaptım', 'Önce yuvarlak sayıya tamamladım'],
    outcomes: ['MAT.1.1.9', 'MAT.1.2.2', 'MAT.2.1.8', 'MAT.2.2.1', 'MAT.2.2.2', 'MAT.3.1.16', 'MAT.3.2.1', 'MAT.3.2.6', 'MAT.4.2.1', 'MAT.4.2.7'],
  },
  {
    id: 'robot',
    name: 'Robot Kodlama',
    description: 'Robotun nereye gideceğini tahmin et, yıldıza farklı yollar bul, hatalı programları ayıkla.',
    emoji: '🤖',
    color: '#2563eb',
    grades: [1, 2, 3, 4],
    skills: {
      1: 'Yön ve konum: yukarı, aşağı, sağa, sola; adım sayma',
      2: 'Farklı yollar bulma, yol uzunluğunu karşılaştırma',
      3: 'Robotun kendi sağı-solu, çeyrek dönüşler, hata ayıklama',
      4: 'Tekrarla blokları, dönüşü derece olarak ölçme (90°, 180°, 360°)',
    },
    howTo: [
      'Görevi oku: tahmin et, yol bul ya da hatalı programı düzelt.',
      'Komut düğmeleriyle programı yaz; “Adım” ile komutları tek tek de çalıştırabilirsin.',
      'Robot yoldan çıkarsa izine bak: hangi komutta ayrıldı? Düzelt ve yeniden dene.',
      'Yıldıza başka bir yoldan da gidebilir misin? Yolların uzunluğunu karşılaştır.',
    ],
    launch: 'Robot yalnızca senin söylediğini yapar; ne eksik ne fazla. Ona yolu nasıl tarif edersin? Bir komut yanlış olursa nereye gider?',
    reflect: 'Robotun hatalı programını nasıl buldun? Bir arkadaşına “robotun sağı” ile “senin sağın” arasındaki farkı nasıl anlatırsın?',
    bigIdea: 'Yön ve konum bir başlangıç noktasına ve bakış yönüne göre tarif edilir. Bir yolun uzunluğu yürünen birimlerin sayısıdır, dönüş ise çeyrek dönüşlerle (90°) ölçülür. Aynı hedefe birden çok yol gider; programı adım adım izleyip hatayı bulmak problem çözmenin bir parçasıdır.',
    strategies: ['Önce yolu parmağımla çizdim', 'Kareleri saydım', 'Deneyip düzelttim', 'Robotun yerine kendimi koydum', 'Adım adım izledim', 'Robotun durduğu yere baktım', 'Komutları parmağımla takip ettim', 'Kafamda yürüttüm', 'Adımları ve dönüşleri saydım', 'Engelin öbür yanından dolaştım', 'Önce diğer yöne gittim', 'Kareleri sayıp karşılaştırdım', 'Adım adım çalıştırma', 'Tekrarla bloğu ile örüntü'],
    outcomes: ['MAT.1.3.1', 'MAT.2.3.6', 'MAT.3.3.8', 'MAT.4.3.5', 'MAT.4.3.10'],
  },
  {
    id: 'tahmin',
    name: 'Sayı Doğrusu Tahmini',
    description: 'Önce göz kararı tahmin et, sonra yarım ve çeyrek gibi referans noktalarıyla düzelt; yakınlaştırınca ince çentikler belirir.',
    emoji: '📍',
    color: '#0d9488',
    grades: [1, 2, 3, 4, 5, 6, 7, 8],
    skills: {
      1: '0–20 arası sayılar; 10 ve 5’ler referans',
      2: '0–100 arası sayılar; 50 ve onluklar referans',
      3: '0–1000 arası sayılar; 500 ve yüzlükler referans',
      4: '0 ile 1 arasındaki kesirler; yarımla karşılaştırma',
      5: '0 ile 2 arasındaki kesirler; 1 bütünle karşılaştırma',
      6: 'Ondalık gösterimler ve yüzdeler; %50 ve %25 referans',
      7: 'Negatif ve rasyonel sayılar; 0 referans',
      8: 'Kareköklü sayılar; en yakın tam kareler',
    },
    howTo: ['Sayıyı oku ve boş sayı doğrusunda yerini göz kararı işaretle.', 'Doğruyu eş parçalara böl ya da iki parmakla yakınlaştır; iğneni düzelt.', 'Gerçek yeri, ilk tahminin ve düzeltmen yan yana görünür.', 'Hangi referans noktasının işine yaradığını söyle.'],
    launch: 'Bir sokakta evler 0’dan 100’e kadar numaralı ama yalnızca baştaki ve sondaki evin numarası yazıyor. 37 numaralı evi hiç saymadan nasıl bulursun?',
    reflect: 'Tahmin ederken hangi referans noktası (ortası, çeyrekler, 0 ya da 1) en çok işine yaradı? Bir arkadaşına bir sayının yerini nasıl bulduğunu anlat.',
    bigIdea: 'Sayılar sayı doğrusunda bir uzunluk/konum olarak temsil edilir; yarım, çeyrek ve tam sayılar gibi referans noktaları büyüklüğü tahmin etmenin ve karşılaştırmanın temelidir.',
    strategies: ['Ortayı / yarımı referans aldı', 'Çeyrekleri kullandı', 'Uç noktaya yakınlık', 'Eş parçalara böldü', 'Yakınlaştırarak inceledi', 'En yakın tam kareleri kullandı'],
    outcomes: ['MAT.1.1.1', 'MAT.2.1.1', 'MAT.3.1.1', 'MAT.4.1.6', 'MAT.4.1.8', 'MAT.5.1.4', 'MAT.6.1.5', 'MAT.7.1.3', 'MAT.8.1.2', 'MAT.8.1.4'],
  },
  {
    id: 'makine',
    name: 'Sihirli Makine',
    description: 'Örüntüden kurala: kendi seçtiğin sayıları makineye at, tabloyu incele, kuralı kendin yaz; aynı kuralı farklı biçimlerde de yaz.',
    emoji: '🎰',
    color: '#db2777',
    grades: [3, 4, 5, 6, 7, 8],
    skills: {
      3: 'Toplama-çıkarma kuralları; adım adım yazma',
      4: 'Çarpma ve bölme kuralları; denk adımlar (× 4 = × 2 × 2)',
      5: 'İki adımlı kurallar; (□ + 1) × 2 ile □ × 2 + 2',
      6: 'Kuralı cebirsel ifadeyle yazma; denk ifadeler',
      7: 'Negatif katsayılı kurallar; denk ifadeler',
      8: 'Doğrusal fonksiyonlar: y = ax + b',
    },
    howTo: ['Makineye bilgi verecek sayıları sen seç (0, 1, ardışık sayılar…).', 'Tabloda olmayan uzak bir sayı için çıkanı tahmin et.', 'Kuralı adımlarla ya da harfli ifadeyle yaz; makine tablodaki her satırla test eder.', 'Aynı kuralı başka bir biçimde yazmayı dene!'],
    launch: 'Sihirli bir makine her sayıya hep aynı şeyi yapıyor. Hangi sayıları atarsan sırrını en hızlı ele verir?',
    reflect: '2(n + 1) ile 2n + 2 aynı makineyi mi anlatır? Bunu bir arkadaşına tablo kullanarak nasıl gösterirsin?',
    bigIdea: 'Bir fonksiyon kuralı, girdi ile çıktı arasındaki ilişkinin genellemesidir; aynı ilişki birbirine denk farklı ifadelerle yazılabilir.',
    strategies: ['0’ı atıp başlangıca baktı', 'Ardışık sayılarla değişime baktı', 'Giren–çıkan farkına baktı', 'Çıkan girenin kaç katı diye baktı', 'Tahmin edip test etti'],
    outcomes: ['MAT.3.1.7', 'MAT.4.1.5', 'MAT.5.2.3', 'MAT.6.2.2', 'MAT.6.2.3', 'MAT.7.2.1', 'MAT.8.2.2'],
  },
  {
    id: 'labirent',
    name: 'Sayı Labirenti',
    description: 'Kurala uyan sayılardan geçen farklı yollar bul, yolunu gerekçelendir; son labirentte gizli kuralı örneklerden keşfet.',
    emoji: '🧩',
    color: '#9333ea',
    grades: [2, 3, 4, 5, 6, 7, 8],
    skills: {
      2: 'Tek ve çift sayılar; 5’in katları',
      3: 'Katlar ve ritmik sayma',
      4: 'Yarımdan büyük/küçük ve yarıma denk kesirler',
      5: '3’e, 9’a ve 4’e bölünebilme',
      6: 'Asal ve bileşik sayılar; 6’ya bölünebilme',
      7: 'Tam sayılarla işlem sonucunun işareti',
      8: 'Tam kare, rasyonel sayılar ve karekök aralıkları',
    },
    howTo: ['🚩’ten 🏁’e kurala uyan kutulardan geçen bir yol çiz (dokun ya da parmağını sürükle).', 'Kurala uymayan kutuya basarsan sana bir soru sorulur; acele yok, can yok.', 'Çıkışa varınca yolundaki bir sayının kurala neden uyduğunu seç.', 'Başka yollar da bul; son labirentte gizli kuralı örneklerden keşfet.'],
    launch: 'Bir hazine haritasında yalnızca belli bir özelliği olan taşlara basılabiliyor. Çıkışa giden tek bir yol mu var, yoksa birden fazla mı?',
    reflect: 'Bir sayının kurala uyup uymadığına hesap yapmadan nasıl karar verdin? Kullandığın kısa yolun neden işe yaradığını açıkla.',
    bigIdea: 'Sayıların özellikleri (teklik-çiftlik, katlar, bölünebilme, asallık, işaret) bir sayıyı sınıflandırmanın yollarıdır; bir özelliği gerekçesiyle açıklayabilmek, kuralı ezberlemekten daha güçlüdür.',
    strategies: ['Her sayıyı tek tek kontrol etti', 'Kısa yol (kural) kullandı', 'İleriye bakıp çıkmazlardan kaçındı', 'Deneme-yanılma'],
    outcomes: ['MAT.2.1.4', 'MAT.3.1.4', 'MAT.3.1.5', 'MAT.4.1.7', 'MAT.6.1.2', 'MAT.6.1.3', 'MAT.7.1.1', 'MAT.8.1.2', 'MAT.8.1.3'],
  },
  {
    id: 'gemiler',
    name: 'Koordinat Amirali',
    description: 'Yakınlaştırılabilir koordinat düzleminde gizli filoyu akıl yürüterek bul: uzaklık, bölge, öteleme ve yansıma ipuçlarını hesapla.',
    emoji: '⚓',
    color: '#1d4ed8',
    grades: [5, 6, 7, 8],
    skills: {
      5: 'Birinci bölgede koordinatlar; uzaklık ve öteleme ipuçları',
      6: 'Dört bölge ve negatif koordinatlar; uzaklık ipuçları',
      7: 'Dört bölgede öteleme ile koordinat hesaplama',
      8: 'Öteleme ve eksenlere göre yansıma',
    },
    howTo: ['Düzlemde bir noktaya dokun ya da x ve y’yi seç, sonra ateş et.', 'Iskada bir ipucu gelir: uzaklık, bölge, öteleme ya da yansıma.', 'İpucundaki noktanın koordinatlarını hesaplayıp oraya nişan al.', 'Süre ve atış sınırı yok: amaç az atışla, akıllı bir stratejiyle bulmak.'],
    launch: 'Sisli bir denizde gemiler saklanıyor. Telsizden “Son atışından 3 birim sola, 2 birim yukarı!” sesi geliyor. Nereye ateş edersin?',
    reflect: 'Gemileri ararken hangi strateji atış sayını azalttı? (4, −2) noktasını 3 birim sola ötelediğinde hangi bölgeye geçer, neden?',
    bigIdea: 'Koordinat çifti bir noktanın yerini iki yönde (önce x, sonra y) belirtir; öteleme yalnızca ilgili koordinatı değiştirir, eksene göre yansıma bir koordinatın işaretini değiştirir.',
    strategies: ['Vuruştan sonra komşu noktaları denedi', 'Dama deseniyle taradı', 'Bölge bölge taradı', 'İpucundan koordinat hesapladı', 'Rastgele denedi'],
    outcomes: ['MAT.7.1.1', 'MAT.8.2.1', 'MAT.8.5.1', 'MAT.8.5.2'],
  },
  {
    id: 'aci',
    name: 'Açı Topçusu',
    description: 'Önce açıyı 90°, 45° ve 180° ile karşılaştırarak tahmin et; sonra sürüklenebilir iletkiyle ölç ve balonu vur.',
    emoji: '🎯',
    color: '#b45309',
    grades: [4, 5, 6, 7, 8],
    skills: {
      4: 'Dik açıya göre dar/geniş; açı tahmini ve iletkiyle ölçme',
      5: 'Açıyı tahmin etme ve iletkiyle ölçme',
      6: 'Açı tahmini ve 1°’lik ölçme',
      7: 'Açı tahmini ve hassas ölçme',
      8: 'Açı tahmini ve hassas ölçme',
    },
    howTo: ['Kırmızı çizginin yerle yaptığı açıyı ölçmeden tahmin et (istersen 45°, 90°, 135° çizgilerini aç).', 'İletkiyi sürükle, iki parmakla döndür: merkezini topun dibine, düz kenarını yere hizala.', 'Ölçtüğün açıyı seç ve ateş et; ıskalarsan ipucu seni düşündürür, can yok.', 'Tahminini ve ölçümünü karşılaştır.'],
    launch: 'Bir topçu balonu vurmak istiyor ama elinde yalnızca bir iletki var. Ölçmeden önce “Bu açı dik açıdan büyük mü, küçük mü?” diye düşünmek neden işe yarar?',
    reflect: 'İletkinin iki sıra sayısından hangisini okuyacağına nasıl karar verdin? Tahmin ederken hangi açıyı referans aldın?',
    bigIdea: 'Açı bir dönme miktarıdır; 90°, 45° ve 180° gibi referans açılarla tahmin yapmak ölçümü anlamlı kılar, iletki ise birim açıları (1°) yineleyerek ölçer.',
    strategies: ['90° (dik açı) ile karşılaştırdı', '45° ile karşılaştırdı', '180° (doğru açı) ile karşılaştırdı', 'Referans açıları (45°, 90°, 135°) kullandı', 'Göz kararı'],
    outcomes: ['MAT.4.3.5', 'MAT.4.3.6', 'MAT.4.3.7', 'MAT.5.3.3'],
  },
  {
    id: 'at-yarisi',
    name: 'Zar Yarışı',
    description: 'Bir olasılık araştırması: hangi atın kazanacağını tahmin et, yüzlerce yarışı simüle et, 6 × 6 tabloyla nedenini açıkla ve yarışı adil hâle getir.',
    emoji: '🏇',
    color: '#be123c',
    grades: [4, 5, 6, 7, 8],
    skills: {
      4: 'İmkânsız, olabilir, kesin',
      5: 'Daha olası, daha az olası; eşit olası',
      6: 'Deneysel olasılık',
      7: 'Eş olası olaylar, olasılık hesaplama',
      8: 'Deneysel ve teorik olasılık karşılaştırması',
    },
    howTo: ['Hangi atın kazanacağını tahmin et ve nedenini seç.', 'Bir yarış koştur, sonra bilgisayarla onlarca/yüzlerce yarış yap ve grafiğe bak.', '6 × 6 zar tablosunda 7 eden bütün ikilileri bul: 7 neden bu kadar sık geliyor?', 'Sonuçları açıkla ve yarışı adil yapmanın yollarını bul.'],
    launch: 'Lunaparkta bir at yarışı var: iki zar atılıyor, toplam hangi atınsa o bir adım ilerliyor. 2’den 12’ye 11 at var. Hepsinin şansı eşit mi?',
    reflect: 'Tek bir yarışın sonucu ile yüz yarışın sonucu arasında ne fark var? Yarışı adil yapmak için önerdiğin fikri bir arkadaşına nasıl savunursun?',
    bigIdea: 'Olasılık, bir olayın gerçekleşme yollarının tüm eş olası sonuçlar içindeki payıdır; deneme sayısı arttıkça deneysel sonuçlar bu teorik paya yaklaşır.',
    strategies: ['Şanslı sayım o', 'Ortadaki toplamlar daha sık gelir', 'Hepsinin şansı eşit', 'Büyük sayı daha güçlü'],
    outcomes: ['MAT.4.4.1', 'MAT.5.6.1', 'MAT.5.6.2', 'MAT.6.6.1', 'MAT.7.7.2', 'MAT.8.7.1'],
  },
]

/** Önce yeni nesil oyunlar, sonra klasikler */
export const gameMeta: GameMeta[] = [...nextGenMeta, ...classicMeta].filter((m) => m.ready !== false)

export const gameMetaById = Object.fromEntries(gameMeta.map((g) => [g.id, g])) as Record<GameId, GameMeta>

export const gamesForGrade = (g: Grade) => gameMeta.filter((m) => m.grades.includes(g))
