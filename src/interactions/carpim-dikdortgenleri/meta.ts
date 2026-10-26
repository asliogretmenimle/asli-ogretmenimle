import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'carpim-dikdortgenleri',
  no: 32,
  name: 'Çarpım Dikdörtgenleri',
  description: 'Çarpma işlemlerini satır-sütun dizilimleriyle temsil et.',
  emoji: '▦',
  color: '#2563eb',
  category: 'sayilar',
  grades: [2, 3, 4, 5],
  ready: true,
  launch: 'Pastaneci 24 kurabiyeyi tepsiye sıra sıra, her sırada eşit sayıda dizmek istiyor. Kaç farklı biçimde dizebilir? Bir de büyük bir tepsiyi ikiye bölersek kurabiyeleri saymak kolaylaşır mı?',
  reflect: '7 × 8’i bilmiyorsan dikdörtgeni bölerek nasıl bulursun? Hangi bölme en kolayıydı, neden?',
  bigIdea: 'Çarpma, satır ve sütunlardan oluşan bir dikdörtgenin alanıdır. Dikdörtgeni döndürmek sonucu değiştirmez (değişme özelliği); dikdörtgeni parçalara bölmek dağılma özelliğidir (7 × 8 = 5 × 8 + 2 × 8) ve alan modelindeki kısmi çarpımlar çok basamaklı çarpmanın temelidir. Bölme ise alanı ve bir kenarı bilinen dikdörtgenin eksik kenarını bulmaktır.',
  skills: {
    2: 'Eşit sıralar: tekrarlı toplamadan çarpmaya; döndürünce aynı sayı',
    3: 'Bir sayının tüm dikdörtgenleri; bilinen çarpımlara bölme (dağılma)',
    4: 'Alan modeliyle iki basamaklı × bir basamaklı çarpma; eksik kenar = bölme',
    5: 'İki basamaklı × iki basamaklı çarpmada dört kısmi çarpım',
  },
  outcomes: ['MAT.2.2.4', 'MAT.2.2.5', 'MAT.3.2.3', 'MAT.3.2.4', 'MAT.4.2.4', 'MAT.4.2.5', 'MAT.5.2.1', 'MAT.5.2.4', 'MAT.5.4.2'],
}
