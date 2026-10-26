import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'katla-ac',
  no: 54,
  name: 'Katla ve Aç',
  description: 'Sanal kâğıt katlayarak simetri, kesir ve geometrik ilişkileri keşfet.',
  emoji: '📄',
  color: '#db2777',
  category: 'geometri',
  grades: [2, 3, 4, 5, 6, 7, 8],
  ready: true,
  launch: 'Bir kâğıdı ikiye katlayıp kenarından küçük bir parça kestin. Kâğıdı açmadan önce düşün: kaç delik olacak, nerede olacaklar? Peki iki kez katlasaydın?',
  reflect: 'Kâğıdı katlayıp kestiğinde açınca oluşan desen neden hep kat izine göre “ayna görüntüsü” gibi oluyor? Bir arkadaşına katlayarak göster.',
  bigIdea: 'Katlamak bir yansımadır: kat çizgisi iki yarıyı tam üst üste getiriyorsa bir simetri doğrusudur ve eş parçalar oluşturur. Her katlama kat sayısını (ve kesik sayısını) iki katına çıkarır; bu yolla yarım–çeyrek–sekizde bir ve denk kesirler doğar. İleri düzeyde kat izi, nokta ile görüntüsünü birleştiren doğru parçasının orta dikmesi, iki kolu çakıştırınca da açıortaydır.',
  skills: {
    2: 'Katlayarak iki ve dört eş parça (yarım, çeyrek), simetrik şekli katlayarak tanıma, kesiğin açılınca nasıl görüneceğini tahmin etme',
    3: 'Katlayarak [[1/2]] ve [[1/4]], birden çok simetri doğrusu bulma, iki katlamadan sonra kesik desenini tahmin etme',
    4: 'Farklı yollarla dörde katlama, [[1/2]] = [[2/4]] = [[4/8]] denkliğini katlayarak görme, simetri doğruları ve kesik desenleri',
    5: '[[3/4]] = [[6/8]] gibi denk kesirleri katlamayla açıklama, sekiz eş parçaya katlamanın farklı yolları, düzgün çokgenlerde simetri',
    6: 'Üç katlamayla sekizde birler, eşkenar dörtgen ve paralelkenarda köşegen–simetri ilişkisi, çapraz katlamalı kesik desenleri',
    7: 'Eğik doğruya göre yansıma, katlayarak orta dikme ve açıortay inşası, üzerindeki noktaların eşit uzaklık özelliği',
    8: 'Yansımanın özellikleri (dik ve ortalayan bağlantılar), orta dikme ve açıortay, çok katlı kesiklerle yansıma bileşimi',
  },
  outcomes: ['MAT.2.3.7', 'MAT.3.1.9', 'MAT.3.1.10', 'MAT.3.3.6', 'MAT.3.3.7', 'MAT.4.1.7', 'MAT.4.3.8', 'MAT.4.3.9', 'MAT.5.1.3', 'MAT.6.3.3', 'MAT.7.3.1', 'MAT.7.3.2', 'MAT.8.5.2'],
}
