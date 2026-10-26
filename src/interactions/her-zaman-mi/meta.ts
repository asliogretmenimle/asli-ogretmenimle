import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'her-zaman-mi',
  no: 69,
  name: 'Her Zaman mı, Bazen mi?',
  description: 'Matematiksel iddiaları örnek ve karşı örneklerle incele.',
  emoji: '🔀',
  color: '#ea580c',
  category: 'muhakeme',
  grades: [3, 4, 5, 6, 7, 8],
  ready: true,
  launch: 'Can, “Çarpınca sayılar hep büyür!” dedi. Elif hemen bir örnek buldu: “5 × 1 = 5, büyümedi!” Kim haklı? Bir iddianın her zaman mı, bazen mi, yoksa hiç mi doğru olmadığını örnekler deneyerek araştıracaksın.',
  reflect: 'Bir iddianın “her zaman doğru” olduğunu göstermek mi daha zor, “her zaman doğru değil” olduğunu göstermek mi? Neden? Bulduğun en şaşırtıcı karşı örneği anlat.',
  bigIdea: 'Bir genellemeyi örnekler destekler ama kanıtlamaz; tek bir karşı örnek ise onu çürütür. “Bazen doğru” olan bir iddia, doğru olduğu koşul eklenerek düzeltilebilir. Karşı örnekler çoğu zaman özel sayılarda (0, 1, 2, kesirler, negatifler) saklanır.',
  skills: {
    3: 'Tek-çift sayıların toplamı, birim kesirler ve dikdörtgen-kare ilişkisi üzerine iddiaları sınama',
    4: 'Çarpmanın sonucu, bölünebilme, alan-çevre ilişkisi, açılar ve kesirler üzerine genellemeler',
    5: 'Denk kesir, alan-çevre, işlem önceliği ve örüntü kuralı iddialarında karşı örnek bulma',
    6: 'Ondalıklarla çarpma-bölme, asal sayılar, bölen sayısı, bölünebilme ve yüzde değişimi iddiaları',
    7: 'Tam sayılarla işlemler, mutlak değer, −a ve cebirsel ifadelerle (2x + 1, 3n + 3) gerekçelendirme',
    8: 'Kareler, karekökler, üslü ifadeler, irrasyonel sayılar ve üçgen eşitsizliği iddialarını sınama',
  },
  outcomes: ['MAT.3.1.5', 'MAT.3.1.6', 'MAT.3.1.10', 'MAT.4.1.9', 'MAT.4.2.5', 'MAT.4.3.7', 'MAT.5.1.4', 'MAT.5.2.2', 'MAT.5.2.3', 'MAT.5.4.3', 'MAT.6.1.1', 'MAT.6.1.2', 'MAT.6.1.3', 'MAT.6.1.7', 'MAT.7.1.4', 'MAT.7.2.1', 'MAT.7.2.3', 'MAT.8.1.1', 'MAT.8.1.2', 'MAT.8.1.3', 'MAT.8.3.2'],
}
