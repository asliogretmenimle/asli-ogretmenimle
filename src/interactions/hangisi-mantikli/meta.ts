import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'hangisi-mantikli',
  no: 27,
  name: 'Hangisi Daha Mantıklı?',
  description: 'Farklı tahminleri karşılaştır, makul sonucu seç ve açıkla.',
  emoji: '🤔',
  color: '#2563eb',
  category: 'sayilar',
  grades: [2, 3, 4, 5, 6, 7, 8],
  ready: true,
  launch: 'Dört arkadaş aynı işlemi yaptı ama dört farklı sonuç buldu. Hesap yapmadan, yalnızca kolay sayılarla düşünerek hangisinin mantıklı olduğunu anlayabilir misin?',
  reflect: 'Bir sonucun mantıksız olduğunu hesap yapmadan nasıl anladın? Hangi kolay sayı (referans) sana yardım etti?',
  bigIdea: 'Tahmin, hesaplamanın bekçisidir: kolay sayılarla (onluklar, yüzlükler, 0–½–1, bilinen kareler) yapılan tahmin, basamak, işlem, virgül ve işaret hatalarını sonuç hesaplanmadan yakalar.',
  skills: {
    2: 'İki basamaklı toplama-çıkarmada onluğa yuvarlayarak tahmin; uzunluk tahmini',
    3: 'Üç basamaklı toplama-çıkarma, iki basamaklı × bir basamaklı çarpmada tahmin',
    4: 'Dört basamaklı işlemler, çarpma ve bölme sonucunu tahmin etme',
    5: 'Büyük sayılarla çarpma-bölme tahmini, kesirleri 0, ½ ve 1 ile karşılaştırma',
    6: 'Ondalık gösterimle çarpma-bölme ve yüzde sonuçlarını tahmin etme',
    7: 'Rasyonel sayılarla işlemlerde işaret ve büyüklük tahmini, oran',
    8: 'Karekök ve üslü ifadelerin değerini tahmin etme',
  },
  outcomes: ['MAT.2.2.2', 'MAT.3.2.1', 'MAT.3.2.3', 'MAT.4.2.3', 'MAT.5.1.2', 'MAT.5.1.4', 'MAT.6.1.7', 'MAT.7.1.3', 'MAT.7.1.4', 'MAT.8.1.1', 'MAT.8.1.2'],
}
