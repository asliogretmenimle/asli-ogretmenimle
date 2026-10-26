import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'tarif-olcekleyici',
  no: 43,
  name: 'Tarif Ölçekleyici',
  description: 'Bir tarifin miktarlarını kişi sayısına göre yeniden düzenle.',
  emoji: '🧁',
  color: '#0d9488',
  category: 'kesirler',
  grades: [5, 6, 7],
  ready: true,
  launch: '4 kişilik kurabiye tarifinde 2 su bardağı un var. Sınıfça 6 kişi kurabiye yapacaksınız. Una 2 bardak mı eklemeli, yoksa başka bir şey mi yapmalı?',
  reflect: 'Aynı cevaba iki farklı yoldan ulaştın (ör. önce 1 kişiyi bulmak ya da yarım tarifi eklemek). Hangi yol sana daha kolay geldi? Bir arkadaşına neden işe yaradığını anlat.',
  bigIdea: 'Bir tarifi ölçeklemek, tüm malzemeleri aynı çarpanla büyütüp küçültmektir (oran korunur). Oran tablosunda sütunları çarpmak, bölmek ve toplamak; çift sayı doğrusunda paketleri tekrarlamak ya da birim orana (1 kişi) inmek eşdeğer yollardır. Her malzemeye aynı sayıyı eklemek oranı bozar.',
  skills: {
    5: 'Tarifi iki katına çıkarma ve yarıya indirme, yarım tarifi ekleyerek büyütme, yarım ve çeyrek bardaklarla ölçme',
    6: 'Oran tablosu ve çift sayı doğrusuyla ölçekleme, 1½ gibi kesirli miktarları çarpma, toplamsal yanılgıyı fark etme',
    7: 'Kesirli birim oranla (1 kişi = 2/3 bardak) doğru orantı problemleri, farklı çözüm yollarını karşılaştırma',
  },
  outcomes: ['MAT.5.1.3', 'MAT.6.1.7', 'MAT.7.1.6', 'MAT.7.1.7'],
}
