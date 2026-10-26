import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'sayi-adalari',
  name: 'Sayı Adaları',
  description: 'Adalar arasına köprü kur: hedef sayıyı farklı parçalardan oluştur (10 + 4, 7 + 7, 8 + 6…).',
  emoji: '🏝️',
  color: '#0ea5e9',
  grades: [1, 2],
  nextGen: true,
  skills: {
    1: '20’ye kadar sayıları parçalara ayırma: 5 ve 10 çapaları, ikizler, 10’a tamamlama, eşitliğin anlamı',
    2: '100’e kadar sayıları onluk ve birliklerle esnek ayırma (47 = 40 + 7 = 30 + 17), eksik parça, eşitlik',
  },
  howTo: [
    'Adanın tabelasındaki sayıya bak: köprü o sayıya ulaşmalı.',
    'Küpleri, onlukları ya da sayı tahtalarını sürükle (ya da dokun) ve iki parçadan bir köprü tahtası kur.',
    '“Köprüye ekle”ye bas. Her farklı yol köprüye yeni bir tahta ekler.',
    'Köprü tamamlanınca kaşif yeni adaya geçer. Son adada kaç farklı yol bulabileceğini dene!',
  ],
  launch: 'Kaşif Deniz, adalar arasında yolculuğa çıkıyor ama köprüler yıkılmış! Her köprü, adanın sayısını oluşturan tahtalardan yapılır. 14’ü hem 10 + 4 hem 7 + 7 diye kurabilir misin? Kaç farklı yolu var?',
  reflect: 'Aynı sayıyı oluşturan iki farklı köprü tahtası seç. Neden ikisi de aynı adaya ulaşıyor? Bir arkadaşına anlat.',
  bigIdea: 'Bir sayı pek çok farklı biçimde parçalara ayrılabilir (parça-parça-bütün). 5 ve 10 çapaları, ikizler ve “bir parça artınca öteki azalır” ilişkisi zihinden işlemin temelidir. Eşittir işareti iki tarafın aynı değerde olduğunu gösterir.',
  strategies: ['10’a tamamlama', '10 ve birlikler', 'Onluk ve birliklere ayırma', 'Esnek basamak değeri', 'İkizler', 'İkizlere yakın', '5 çapası', 'Bir artır, bir azalt (telafi)', 'Değişme özelliği', 'Toplamayı düşünerek çıkarma', 'Yuvarlak sayıya tamamlama', 'Üç parçaya ayırma'],
  outcomes: ['MAT.1.1.2', 'MAT.1.2.2', 'MAT.1.2.3', 'MAT.1.2.4', 'MAT.2.1.2', 'MAT.2.2.2', 'MAT.2.2.3', 'MAT.2.2.6'],
}
