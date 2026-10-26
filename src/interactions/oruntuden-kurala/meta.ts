import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'oruntuden-kurala',
  no: 58,
  name: 'Örüntüden Kurala',
  description: 'Büyüyen şekil örüntülerinin sayısal kurallarını bul.',
  emoji: '🧮',
  color: '#7c3aed',
  category: 'cebir-veri',
  grades: [4, 5, 6, 7, 8],
  ready: true,
  launch: 'Kibrit çöpleriyle yan yana kareler diziyorsun: 1 kare için 4 çöp, 2 kare için 7 çöp, 3 kare için 10 çöp. 100 kare için kaç çöp gerekir? Hepsini dizmeden bulmanın bir yolu var mı? Arkadaşın şekli senden farklı görürse kuralı da farklı mı olur?',
  reflect: 'Kibrit kareleri için bir arkadaşın 1 + 3n, başka biri 4 + 3(n − 1) yazdı. İkisi de doğru olabilir mi? Şekil üzerinde göstererek açıkla.',
  bigIdea: 'Büyüyen bir örüntü, şekil numarası ile parça sayısı arasındaki bir ilişkidir. Her adımda eklenen miktar (yinelemeli bakış) ile şekil numarasından doğrudan hesaplama (açık kural) aynı yapıyı iki farklı yoldan anlatır. Aynı şekli farklı gruplamak farklı ama denk ifadeler verir; doğrusal örüntülerde artış miktarı eğimi, şekil 0’daki değer sabit terimi gösterir.',
  skills: {
    4: 'Şekil örüntüsünün sonraki adımını kurma, her adımdaki değişimi görme, uzak adımı tablo ve kural makinesiyle bulma',
    5: 'Kibrit ve nokta örüntülerinin kuralını □ ile yazma; aynı şekli farklı gruplayarak farklı kurallar bulma',
    6: 'Örüntü kuralını n ile cebirsel ifade olarak yazma, denk ifadeler, “kaçıncı şekil?” sorusu',
    7: 'Farklı görme biçimlerinden gelen ifadeleri sadeleştirip denkliklerini gösterme; kuraldan denklem kurma ve çözme',
    8: 'Doğrusal örüntüyü tablo, grafik ve y = mx + n denklemiyle temsil etme; eğim = artış, kesim = şekil 0',
  },
  outcomes: ['MAT.4.1.5', 'MAT.5.2.3', 'MAT.6.2.2', 'MAT.6.2.3', 'MAT.6.2.1', 'MAT.7.2.1', 'MAT.7.2.2', 'MAT.8.2.2'],
}
