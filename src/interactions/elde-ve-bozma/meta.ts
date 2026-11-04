import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'elde-ve-bozma',
  no: 86,
  name: 'Elde ve Bozma Atölyesi',
  description: 'Taban bloklarıyla yüzlük, onluk ve birlik sütunlarında topla ve çıkar: kalabalıklaşan 10 birliği onluğa bağla, yetmeyen birlik için bir onluğu boz; blokları kâğıttaki işlemle eşleştir.',
  emoji: '🧱',
  color: '#2563eb',
  category: 'sayilar',
  grades: [3, 4, 5],
  ready: true,
  launch: 'Elif 137 + 145 işleminin sonucunu 2712 buldu, Can ise 252 − 138 işleminin sonucunu 126 buldu. İkisi de “Her basamağı ayrı ayrı hesapladım” diyor. Taban bloklarıyla tuvalde deneyip kimin nerede yanıldığını bulalım.',
  reflect: 'Toplamada “elde var 1” derken aslında neyi taşıyoruz? Çıkarmada “komşudan 1 aldım” derken komşu sütunda ne oluyor? Bloklarla bir arkadaşına açıkla.',
  bigIdea: 'Bir basamakta en fazla 9 tane bulunabilir; 10 birlik tam 1 onluk, 10 onluk tam 1 yüzlük eder. Toplamada sütun 9’u geçince 10 tanesi bir üst birime bağlanıp komşu sütuna taşınır (elde). Çıkarmada bir sütunda yeterli blok yoksa komşu sütundaki bir blok 10 küçük birime bozulur. Gruplama ve bozma sayının değerini değiştirmez, yalnızca gösterimini değiştirir; bu yüzden işlem sağdan sola, birliklerden başlanarak yapılır.',
  skills: {
    3: 'Üç basamaklı sayılarda eldeli toplama ve onluk bozarak çıkarmayı bloklarla modelleme',
    4: 'Eldeli toplama ve bozarak çıkarmada her adımı bloklar ve yazılı işlemle eşleştirme; ortada sıfır olan sayılarda bozma',
    5: 'Elde ve bozmanın nedenini basamak değeriyle açıklama; işlem hatalarını bloklarla bulup gerekçelendirme',
  },
  outcomes: ['MAT.3.2.2', 'MAT.5.1.2'],
}
