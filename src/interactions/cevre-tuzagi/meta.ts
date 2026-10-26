import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'cevre-tuzagi',
  no: 50,
  name: 'Çevre Tuzağı',
  description: 'Aynı çevre uzunluğuna sahip şekillerin alanlarını karşılaştır.',
  emoji: '🪤',
  color: '#db2777',
  category: 'geometri',
  grades: [3, 4, 5, 6],
  ready: true,
  launch: 'Ece ile Can’ın bahçelerinin çitleri aynı uzunlukta. Can “O zaman bahçelerimiz de aynı büyüklükte!” diyor. Gerçekten öyle mi? Bugün çitleri sayacak, çim ekecek ve bir ipi gerip bahçeyi değiştirerek bu tuzağı kendin test edeceksin.',
  reflect: 'Çevresi aynı olan iki bahçenin alanı neden farklı olabilir? Can’a bunu bir çizimle nasıl anlatırsın?',
  bigIdea: 'Çevre (sınırın uzunluğu) ve alan (kapladığı yüzey) farklı ölçülerdir ve birbirinden bağımsız değişebilir. Çevre sabitken dikdörtgen kareye yaklaştıkça alan büyür; alan sabitken şekil uzayıp dağıldıkça çevre uzar. Köşeden kare çıkarmak alanı azaltır ama çevreyi değiştirmez; bu yüzden “alan büyürse çevre de büyür” genellemesi her zaman doğru değildir.',
  skills: {
    3: 'Çiti birim kenarlarla sayma, aynı alanlı bahçelerin farklı çevreleri, aynı çevreli bahçelerin farklı alanları',
    4: 'Aynı alan–farklı çevre, aynı çevre–farklı alan; 12 birimlik iple bütün dikdörtgenler',
    5: 'Sabit çevrede en büyük alanlı dikdörtgen (kare), 12 kareyle en uzun ve en kısa çevre, köşeden kare çıkarma',
    6: 'Çevre–alan ilişkisini grafikle inceleme, sabit alanda en kısa/en uzun çevre, alan azalırken çevrenin artabilmesi',
  },
  outcomes: ['MAT.3.3.4', 'MAT.4.3.3', 'MAT.4.3.4', 'MAT.5.4.1', 'MAT.5.4.3', 'MAT.5.4.4', 'MAT.6.4.3'],
}
