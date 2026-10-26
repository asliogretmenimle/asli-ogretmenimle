import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'sekil-insa-et',
  no: 46,
  name: 'Şekil İnşa Et',
  description: 'Verilen özelliklere uygun geometrik şekiller oluştur.',
  emoji: '🛠️',
  color: '#db2777',
  category: 'geometri',
  grades: [1, 2, 3, 4, 5],
  ready: true,
  launch: 'Bir mimar “4 kenarlı, yalnızca 2 kenarı paralel bir pencere istiyorum” dedi. Kaç farklı pencere çizilebilir? Bugün özellik kartlarını okuyup çivili tahtada şekiller inşa edeceksin; her karta uyan birden çok şekil bulmaya çalış!',
  reflect: 'Aynı karta uyan iki şeklin birbirinden farkı neydi? Hangi özellik ikisinde de aynı kaldı? Bir arkadaşına göster.',
  bigIdea: 'Şekilleri görünüşleri değil özellikleri (kenar sayısı, açı türü, paralel ve eşit kenarlar) belirler. Bir özellik listesine uyan birçok farklı şekil olabilir; şekil döndürülünce ya da büyütülünce özellikleri değişmez. Özellikler arasındaki ilişkiler (“dik açılı üçgende ikinci dik açı olamaz”) van Hiele’nin çözümleme düzeyinden ilişki düzeyine geçişi destekler.',
  skills: {
    1: 'Üçgen, kare ve dikdörtgeni köşe ve kenar sayarak inşa etme; kare olmayan dörtgenler',
    2: 'Kenar sayısına göre şekil kurma; eğik duran kare (duruş değişince şekil değişmez)',
    3: 'Dik açılı ve dik açısız üçgenler, tam 2 dik açılı dörtgen, iç bükey altıgen',
    4: 'Dik, dar ve geniş açılı üçgenler; eşkenar dörtgen; “her zaman / bazen / asla” ve yapılamayan şekil',
    5: 'Yamuk ve paralelkenarı paralel kenarlarla inşa etme, iç bükey çokgenler, özellikler arası ilişkiler',
  },
  outcomes: ['MAT.1.3.5', 'MAT.2.3.3', 'MAT.2.3.4', 'MAT.3.3.2', 'MAT.3.3.3', 'MAT.4.3.2', 'MAT.4.3.7', 'MAT.5.3.5', 'MAT.5.3.6'],
}
