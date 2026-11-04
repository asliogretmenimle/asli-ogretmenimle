import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'farkli-cozumleme',
  no: 87,
  name: 'Bir Sayı, Birçok Çözümleme',
  description: 'Onluk taban bloklarını bozup birleştirerek 254’ü farklı biçimlerde çözümle: 2 yüzlük + 5 onluk + 4 birlik de, 25 onluk + 4 birlik de, 2 yüzlük + 54 birlik de 254 eder.',
  emoji: '🧩',
  color: '#2563eb',
  category: 'sayilar',
  grades: [4, 5],
  ready: true,
  launch: '254 = 2 yüzlük + 5 onluk + 4 birlik. Peki başka nasıl olabilir? Bir arkadaşın “254’te yalnızca 5 onluk var, çünkü onlar basamağında 5 yazıyor” diyor. Blokları bozup birleştirerek araştıralım.',
  reflect: '254’te kaç onluk var? “5” diyen bir arkadaşına, bloklarla 25 onluk olduğunu nasıl gösterirsin? Bu fikir 4.508.120’de kaç bin olduğunu bulmana nasıl yardım eder?',
  bigIdea: 'Bir sayının tek bir çözümlemesi yoktur. 1 yüzlük 10 onluğa, 1 onluk 10 birliğe bozulabilir; 10 birlik de 1 onluğa birleşebilir. Bozma ve birleştirme sayının değerini değiştirmez, yalnızca gösterimini değiştirir: 254 = 2 yüzlük + 5 onluk + 4 birlik = 25 onluk + 4 birlik = 2 yüzlük + 54 birlik = 24 onluk + 14 birlik. Bu esneklik, “onlar basamağındaki rakam” ile “sayıdaki onluk sayısı” arasındaki farkı görmeyi, bozarak çıkarmayı ve büyük sayıları bölüklerle okumayı (4.508.120 = 4.508 bin + 120) mümkün kılar.',
  skills: {
    4: 'Üç basamaklı sayıları yüzlük, onluk ve birliklerle farklı biçimlerde çözümleme; eksik parçayı bulma',
    5: 'Farklı çözümlemeleri bloklarla gerekçelendirme; basamaktaki rakam ile sayıdaki birim sayısını ayırt edip büyük sayılara genelleme',
  },
  outcomes: ['MAT.4.1.2', 'MAT.5.1.1'],
}
