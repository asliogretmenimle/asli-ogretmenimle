import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'islem-zinciri',
  no: 30,
  name: 'İşlem Zinciri Tasarla',
  description: 'Hedef sonuca ulaşan işlem zincirleri oluştur.',
  emoji: '⛓️',
  color: '#2563eb',
  category: 'sayilar',
  grades: [3, 4, 5, 6, 7, 8],
  ready: true,
  launch: 'Bir sayı, işlem bloklarından oluşan bir zincire giriyor ve her halkada değişiyor. 20’den başlayıp 50’ye ulaşan kaç farklı zincir kurabilirsin? Peki zincirden çıkan sayıyı biliyorsan, giren sayıyı nasıl bulursun?',
  reflect: 'Bir zinciri geriye doğru çözerken neden en son yapılan işlemden başlamalısın? Bir arkadaşına örnekle anlat.',
  bigIdea: 'İşlemler birbirini izleyen “makineler” gibi düşünülebilir: aynı hedefe birçok zincirle ulaşılır, ardışık işlemler tek bir işlemde birleşebilir (+10 −1 = +9; ×4 ÷2 = ×2), işlemlerin sırası sonucu değiştirebilir (işlem önceliği) ve ters işlemler ters sırayla uygulanarak zincir geri çözülür.',
  skills: {
    3: 'Toplama, çıkarma ve küçük çarpmalarla zincir kurma; ters işlemle geri çözme',
    4: 'Dört işlemle zincir kurma; ardışık çarpmaları birleştirme (×5 ×2 = ×10)',
    5: 'Zinciri parantezli ifade olarak yazma; işlem önceliği',
    6: 'Ondalık sayılarla zincirler; ×10 ÷100 = ÷10',
    7: 'Tam sayılarla zincirler; iki eksi çarpanın birleşimi',
    8: 'Üslü ve kareköklü zincirler; kuvvetin kuvveti',
  },
  outcomes: ['MAT.3.2.5', 'MAT.3.2.8', 'MAT.4.2.6', 'MAT.4.2.4', 'MAT.5.2.2', 'MAT.5.2.4', 'MAT.6.1.7', 'MAT.6.2.3', 'MAT.7.1.4', 'MAT.7.2.4', 'MAT.8.1.1', 'MAT.8.1.2'],
}
