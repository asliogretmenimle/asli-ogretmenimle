import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'carpma-dikdortgeni',
  no: 93,
  name: 'Çarpma Dikdörtgeni',
  description: 'Kaydırıcılarla ya da köşe tutamacıyla birim karelerden bir dikdörtgen kur: uzunluk 10’u geçince dikdörtgen 10’luk parça ve kalan parça diye iki renge bölünür, 14 × 5 = 50 + 20 gibi çarpımları parçalarla hesapla.',
  emoji: '📐',
  color: '#2563eb',
  category: 'sayilar',
  grades: [3, 4],
  ready: true,
  launch: 'Can 14 × 5’i “10 × 5 + 4 = 54” diye hesapladı, Ece ise 13 × 6’ya 618 dedi. 14 × 5 kare bir dikdörtgen olsaydı kaç kare olurdu? Dikdörtgeni kurup parçalara bölelim.',
  reflect: '14 × 5’i 10 + 4 diye mi, 7 + 7 diye mi bölmek daha kolay? Neden? Can’a “+ 4” yazınca hangi karelerin sayılmadığını dikdörtgenle nasıl gösterirsin?',
  bigIdea: 'Çarpma, satır ve sütunlardan oluşan bir dikdörtgenin kare sayısıdır. İki basamaklı bir çarpanı onluk ve birliklerine ayırıp dikdörtgeni o yerden bölmek dağılma özelliğidir: 14 × 5 = (10 × 5) + (4 × 5) = 50 + 20 = 70. 10’la çarpmak zihinden kolay olduğu için 10’luk bölme en verimli bölmedir; ama hangi yerden bölünürse bölünsün toplam aynıdır. Alan modeli, kısmi çarpımları görünür kılarak iki yaygın hatayı yakalatır: kalan parçayı çarpmadan eklemek (10 × 5 + 4) ve onlar rakamını birlik gibi çarpıp sonuçları yan yana yazmak (13 × 6 = 618). Bu model ilerideki yazılı çarpma algoritmasının ve iki basamaklı × iki basamaklı çarpmanın temelidir.',
  skills: {
    3: 'İki basamaklı × bir basamaklı çarpmayı alan modeliyle 10’luk parça ve kalan parça diye bölerek hesaplama; parçaların değerini yazma; eksik parçayı bulma',
    4: '20’yi aşan çarpanlarda 10 + 10 + kalan bölmesi; bölme yerini kolaylığa göre seçme; kısmi çarpım hatalarını alan modeliyle açıklama',
  },
  outcomes: ['MAT.3.2.3', 'MAT.3.2.4', 'MAT.4.2.4', 'MAT.4.2.5'],
}
