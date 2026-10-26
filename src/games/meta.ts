import type { Grade } from '../data/types'

export type GameId =
  | 'balon' | 'kurbaga' | 'gizli-sayi' | 'bir-islem' | 'pizza' | 'kasa'
  | 'robot' | 'tahmin' | 'makine' | 'labirent' | 'gemiler' | 'aci' | 'at-yarisi'

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
}

/** Oyunların hafif tanımları (bileşenleri yüklemeden listelemek için) */
export const gameMeta: GameMeta[] = [
  {
    id: 'balon',
    name: 'Balon Patlat',
    description: 'Yükselen balonlardan yalnızca kurala uyanları patlat, kaçırma!',
    emoji: '🎈',
    color: '#ef4444',
    grades: [1, 2, 3, 4, 5, 6],
    skills: {
      1: '10’u tamamlama, büyük-küçük',
      2: 'Tek-çift, onluklar, ikişer sayma',
      3: 'Katlar, çarpım tablosu',
      4: 'Çarpma-bölme, 1000’e yuvarlama',
      5: 'Bölünebilme, işlem sonucu',
      6: 'Asal sayılar, bölünebilme kuralları',
    },
    howTo: ['Üstteki kuralı oku.', 'Kurala uyan balonlara dokun.', 'Yanlış balon bir can götürür; süre bitene kadar dayan!'],
  },
  {
    id: 'kurbaga',
    name: 'Kurbağa Zıplatma',
    description: 'Zıplama kartlarını seç, kurbağayı tam nilüfer yaprağına kondur.',
    emoji: '🐸',
    color: '#16a34a',
    grades: [1, 2, 3, 4],
    skills: {
      1: '1’er, 2’şer, 5’er ileri-geri sayma',
      2: '10’ar ve 5’er sayma, 100’e kadar',
      3: '100’er ve 10’ar sayma, 1000’e kadar',
      4: 'Büyük sayılarla ritmik sayma',
    },
    howTo: ['Kurbağa ve hedef yaprak sayı doğrusunda.', 'Zıplama kartlarına dokun: her kart kurbağayı o kadar ileri ya da geri götürür.', 'En az zıplamayla hedefe ulaşmaya çalış!'],
  },
  {
    id: 'gizli-sayi',
    name: 'Gizli Sayı Dedektifi',
    description: 'Gizlenen sayıyı “daha büyük / daha küçük” ipuçlarıyla en az tahminle bul.',
    emoji: '🕵️',
    color: '#7c3aed',
    grades: [1, 2, 3, 4, 6, 7],
    skills: {
      1: '20’ye kadar sayılarda sıralama',
      2: '100’e kadar sayılarda sıralama',
      3: '1000’e kadar sayılarda sıralama',
      4: 'Büyük sayılarda sıralama',
      6: 'Ondalık gösterimleri sıralama',
      7: 'Tam sayıları sıralama',
    },
    howTo: ['Bir sayı seç ve “Tahmin et”e bas.', 'Dedektif sana gizli sayının daha büyük mü daha küçük mü olduğunu söyler.', 'Aralık daralır; az tahminle bulursan çok yıldız kazanırsın!'],
  },
  {
    id: 'bir-islem',
    name: 'Bir İşlem',
    description: 'Elindeki sayı kartlarını işlemlerle birleştir, hedef sayıya ulaş.',
    emoji: '🎯',
    color: '#f59e0b',
    grades: [3, 4, 5, 6, 7, 8],
    skills: {
      3: 'Toplama ve çıkarma',
      4: 'Dört işlem',
      5: 'Dört işlem, işlem önceliği',
      6: 'Dört işlem, çarpanlar',
      7: 'Tam sayılarla işlem',
      8: 'Kare ve üslü sayılarla işlem',
    },
    howTo: ['Bir sayı kartı, bir işlem, sonra başka bir sayı kartı seç.', 'İki kart birleşip yeni bir kart olur.', 'Hedef sayıya tam ulaşırsan en yüksek puan senin! Geri al düğmesi her zaman yanında.'],
  },
  {
    id: 'pizza',
    name: 'Kesir Pizzacısı',
    description: 'Müşterinin siparişine göre pizzayı dilimle, doğru dilimlere malzeme koy.',
    emoji: '🍕',
    color: '#ea580c',
    grades: [2, 3, 4, 5],
    skills: {
      2: 'Bütün, yarım, çeyrek',
      3: 'Birim kesirler, pay ve payda',
      4: 'Denk kesirler',
      5: 'Kesirleri farklı gösterme',
    },
    howTo: ['Siparişi oku.', 'Bıçakla pizzayı eş dilimlere ayır.', 'Doğru sayıda dilime malzeme koy ve servis et. Müşteriyi bekletme!'],
  },
  {
    id: 'kasa',
    name: 'Bakkal Kasası',
    description: 'Kasiyer sensin! Müşterilere doğru tutarı ve para üstünü ver.',
    emoji: '🛒',
    color: '#0891b2',
    grades: [1, 2, 3, 4],
    skills: {
      1: 'Paralarla tutar oluşturma',
      2: '100 TL’ye kadar para üstü',
      3: 'Lira ve kuruşla para üstü',
      4: 'Büyük tutarlarla para üstü',
    },
    howTo: ['Müşterinin aldıklarına ve verdiği paraya bak.', 'Kasadaki paralara dokunarak para üstünü hazırla.', 'Hazır olunca “Ver”e bas. Hızlı ve doğru kasiyer olmaya çalış!'],
  },
  {
    id: 'robot',
    name: 'Robot Kodlama',
    description: 'Yön komutlarını sırala, robotu engellere çarpmadan yıldıza ulaştır.',
    emoji: '🤖',
    color: '#2563eb',
    grades: [1, 2, 3, 4],
    skills: {
      1: 'Yön ve konum: ileri, geri, sağ, sol',
      2: 'Yol bulma, adım sayma',
      3: 'Kodlama ile yol bulma',
      4: 'Tekrar eden komutlarla kodlama',
    },
    howTo: ['Ok düğmeleriyle robotun komut listesini yaz.', '“Çalıştır”a bas ve robotu izle.', 'Engellere çarparsa programını düzelt. Yolda elmasları toplamayı unutma!'],
  },
  {
    id: 'tahmin',
    name: 'Sayı Doğrusu Tahmini',
    description: 'Sayının yerini işaretsiz sayı doğrusunda tahmin et; ne kadar yakın, o kadar puan!',
    emoji: '📍',
    color: '#0d9488',
    grades: [1, 2, 3, 4, 5, 6, 7, 8],
    skills: {
      1: '0–20 arası sayılar',
      2: '0–100 arası sayılar',
      3: '0–1000 arası sayılar',
      4: '0 ile 1 arasındaki kesirler',
      5: '0 ile 2 arasındaki kesirler',
      6: 'Ondalık gösterimler ve yüzdeler',
      7: 'Negatif sayılar ve rasyonel sayılar',
      8: 'Kareköklü sayılar',
    },
    howTo: ['Yukarıdaki sayıyı oku.', 'Sayı doğrusunda o sayının yerine dokun.', 'Gerçek yeri gösterilir; ne kadar yakınsan o kadar çok puan alırsın.'],
  },
  {
    id: 'makine',
    name: 'Sihirli Makine',
    description: 'Makineye sayı at, çıkanı izle; gizli kuralı çöz!',
    emoji: '🎰',
    color: '#db2777',
    grades: [3, 4, 5, 6, 7, 8],
    skills: {
      3: 'Toplama-çıkarma kuralları',
      4: 'Çarpma ve bölme kuralları',
      5: 'İki adımlı örüntü kuralları',
      6: 'Cebirsel ifade ile kural yazma',
      7: 'Negatif katsayılı kurallar',
      8: 'Doğrusal fonksiyonlar',
    },
    howTo: ['Makineye istediğin sayıyı at ve çıkan sayıya bak.', 'Kuralı bulduğunu düşününce tahmin sorularını cevapla.', 'Üç tahmini doğru yaparsan makinenin kuralını seç!'],
  },
  {
    id: 'labirent',
    name: 'Sayı Labirenti',
    description: 'Yalnızca kurala uyan sayılara basarak labirentten çık.',
    emoji: '🧩',
    color: '#9333ea',
    grades: [2, 3, 4, 5, 6, 7, 8],
    skills: {
      2: 'Tek ve çift sayılar',
      3: 'Katlar ve ritmik sayma',
      4: 'Kesirler: yarımdan büyük mü?',
      5: 'Bölünebilme',
      6: 'Asal sayılar',
      7: 'Tam sayılarla işlem sonucu',
      8: 'Tam kare ve rasyonel sayılar',
    },
    howTo: ['Sol üstteki başlangıçtan sağ alttaki çıkışa ulaş.', 'Yalnızca yanındaki (sağ, sol, üst, alt) ve kurala uyan kutulara basabilirsin.', 'Yanlış kutu bir can götürür!'],
  },
  {
    id: 'gemiler',
    name: 'Koordinat Amirali',
    description: 'Gizli gemileri koordinat söyleyerek bul; az atışla filoyu batır!',
    emoji: '⚓',
    color: '#1d4ed8',
    grades: [5, 6, 7, 8],
    skills: {
      5: 'Birinci bölgede koordinat okuma',
      6: 'Birinci bölgede koordinat okuma',
      7: 'Dört bölgede koordinatlar',
      8: 'Dört bölgede koordinatlar',
    },
    howTo: ['x ve y değerlerini seç, “Ateş!”e bas.', 'Vurduysan 💥, ıskaladıysan 💧 görürsün.', 'Tüm gemileri en az atışla batır!'],
  },
  {
    id: 'aci',
    name: 'Açı Topçusu',
    description: 'Topun açısını tahmin et, balonu tek atışta vur!',
    emoji: '🎯',
    color: '#b45309',
    grades: [4, 5, 6, 7, 8],
    skills: {
      4: 'Dar, dik, geniş açılar; açı tahmini',
      5: 'Açıyı derece olarak tahmin etme',
      6: 'Açı tahmini ve ölçme',
      7: 'Açı tahmini ve ölçme',
      8: 'Açı tahmini ve ölçme',
    },
    howTo: ['Hedef balonun hangi açıda olduğunu tahmin et.', 'Açıyı seç ve “Ateş!”e bas.', 'Atıştan sonra iletkiyle gerçek açıyı gör. Ne kadar yakın, o kadar puan!'],
  },
  {
    id: 'at-yarisi',
    name: 'Zar Yarışı',
    description: 'İki zar atılır, toplamı hangi atınsa o koşar. Hangi at daha şanslı?',
    emoji: '🏇',
    color: '#be123c',
    grades: [4, 5, 6, 7, 8],
    skills: {
      4: 'İmkânsız, olabilir, kesin',
      5: 'Daha olası, daha az olası',
      6: 'Deneysel olasılık',
      7: 'Eş olası olaylar, olasılık hesaplama',
      8: 'Deneysel ve teorik olasılık',
    },
    howTo: ['Kazanacağını düşündüğün atı seç.', 'Zarları at; iki zarın toplamı hangi atınsa o bir adım ilerler.', 'Birkaç yarıştan sonra sonuçları incele: neden bazı atlar daha sık kazanıyor?'],
  },
]

export const gameMetaById = Object.fromEntries(gameMeta.map((g) => [g.id, g])) as Record<GameId, GameMeta>

export const gamesForGrade = (g: Grade) => gameMeta.filter((m) => m.grades.includes(g))
