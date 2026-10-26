import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'sayi-treni',
  name: 'Sayı Treni',
  description: 'Rakamları, nokta desenlerini, onluk çerçeveleri ve blokları aynı trene bağla; vagonları sırala, eksik vagonları keşfet.',
  emoji: '🚂',
  color: '#f97316',
  grades: [1, 2],
  nextGen: true,
  ready: true,
  skills: {
    1: '20’ye kadar sayıların farklı temsilleri (onluk çerçeve, 5’li noktalar, çetele, sözcük), 5 ve 10 çapaları, bir fazlası / geri sayım, büyük-küçük, sıra sayıları',
    2: '100’e kadar onluk-birlik ile esnek ayrıştırma (40 + 7 = 30 + 17), onar ve beşer ritmik sayma, ±1 ve ±10 komşular, basamak değeriyle karşılaştırma ve sıralama',
  },
  howTo: [
    'Lokomotifin plakasına ve istasyon tabelasına bak: bu tren neyi taşıyor?',
    'Depodaki vagonu trene sürükle ya da dokun. Trendeki vagona dokunursan depoya geri döner.',
    '“Düdüğü çal!” ile treni kontrol et. Soru işaretli vagon varsa sorulan soruyu düşün.',
    'Aynı sayının farklı vagonlarını bul: her yeni görünüş yeni bir yol! Tren dolunca tünele girer.',
  ],
  launch: 'İstasyona bir tren geldi; lokomotifinde 8 yazıyor. Sadece 8 taşıyan vagonlar bağlanabilir. Ama vagonlarda rakam yok: kiminde noktalar, kiminde onluk çerçeve, kiminde çetele var! Hangi vagonlar bu trene ait?',
  reflect: 'Onluk çerçevede 8 ile nokta kartında 8 aynı mı? Saymadan nasıl anladın? Bir arkadaşına anlat.',
  bigIdea: 'Bir sayı pek çok biçimde gösterilebilir: rakam, sözcük, nokta deseni, onluk çerçeve, onluk-birlik blokları ve açılım (47 = 40 + 7 = 30 + 17). Temsiller arasında geçiş yapabilmek sayı duyusunun temelidir. 5 ve 10 çapaları sayıyı saymadan görmeyi sağlar; sayıların sırası “bir fazlası / bir eksiği” ve “10 fazlası / 10 eksiği” ilişkileriyle kurulur; iki basamaklı sayılar önce onluklarına göre karşılaştırılır.',
  strategies: [
    'Şipşak görme (saymadan)',
    '5 ve 10 çapası',
    'Bir fazlası / bir eksiği',
    'Geriye ritmik sayma',
    'Onar ritmik sayma',
    '5’er ritmik sayma',
    '2’şer ritmik sayma',
    'Onluk ve birliklere ayırma',
    'Esnek basamak değeri (onluğu bozma)',
    'Basamak değerine göre karşılaştırma',
    'Sayı doğrusunu düşünme',
  ],
  outcomes: ['MAT.1.1.1', 'MAT.1.1.2', 'MAT.1.1.3', 'MAT.1.1.4', 'MAT.1.1.5', 'MAT.2.1.1', 'MAT.2.1.2', 'MAT.2.1.3', 'MAT.2.1.4'],
}
