import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'birden-fazla-cozum',
  no: 70,
  name: 'Birden Fazla Çözüm',
  description: 'Aynı problemin farklı çözüm stratejilerini üret.',
  emoji: '🛤️',
  color: '#ea580c',
  category: 'muhakeme',
  grades: [2, 3, 4, 5, 6, 7, 8],
  ready: true,
  skills: { 2: 'Toplam ve farkı modelleme; geriye doğru düşünme', 3: 'Tahmin, tablo ve işlem ilişkileri', 4: 'Çarpımsal ilişkiler ve bilinmeyen nicelik', 5: 'Çok adımlı problem çözme ve denklem', 6: 'Ondalık niceliklerle denklem ve strateji karşılaştırma', 7: 'Çok adımlı cebirsel akıl yürütme', 8: 'Farklı çözüm yollarını gerekçelendirme' },
  launch: 'Aynı problemi çözmek için tek bir yol yok. Bir durumu modelleyip, tabloyla deneyip ya da denklem kurarak çöz; yolların neden aynı sonuca ulaştığını karşılaştır.',
  reflect: 'Hangi yöntem sana en anlaşılır geldi? Başka bir yöntemin doğru olduğunu nasıl denetledin?',
  bigIdea: 'Problem çözmede strateji seçimi ve sonuç denetimi önemlidir; farklı temsiller aynı matematiksel ilişkiyi gösterebilir.',
}
