import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'us-oruntu-tablosu',
  no: 84,
  name: 'Üslü Sayılar Tablosu',
  description: 'Bazı kareleri boş bırakılmış kuvvetler tablosunu örüntüyü izleyerek doldur; sıfırıncı kuvveti, negatif üsleri ve üslü ifadelerin kurallarını tablodan keşfet.',
  emoji: '🔢',
  color: '#2563eb',
  category: 'sayilar',
  grades: [8],
  ready: true,
  launch: 'Tabloda 2¹ = 2, 2² = 4, 2³ = 8 yazıyor; sağa gittikçe sayılar 2 ile çarpılıyor. Sola doğru gidersek 2⁰ ve 2⁻¹ kutularına ne yazmalıyız? Örüntü ne diyor?',
  reflect: 'Bir arkadaşın “2⁰ sıfırdır” diyor. Tablodaki örüntüyü kullanarak onu nasıl ikna edersin?',
  bigIdea: 'Üslü ifade tekrarlı çarpmadır; tabloda sağa gidince tabanla çarpılır, sola gidince tabana bölünür. Bu örüntü korunursa a⁰ = 1 ve a⁻ⁿ = 1 ÷ aⁿ olmak zorundadır. Negatif tabanın çift kuvvetleri pozitif, tek kuvvetleri negatiftir; aynı tabanlı kuvvetler çarpılınca üsler toplanır.',
  skills: { 8: 'Kuvvetler tablosunda örüntüyle sıfırıncı ve negatif kuvvetleri, negatif tabanda işareti, 10’un kuvvetlerini ve aᵐ · aⁿ = aᵐ⁺ⁿ kuralını keşfetme' },
  outcomes: ['MAT.8.1.1'],
}
