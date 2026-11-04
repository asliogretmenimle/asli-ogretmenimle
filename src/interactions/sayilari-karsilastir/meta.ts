import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'sayilari-karsilastir',
  no: 85,
  name: 'Büyüteçle Sayı Karşılaştır',
  description: 'Blokları, rakam kartlarını ve büyüteci sürükleyerek 4 ve 5 basamaklı sayıların büyüklük farkını gör; soldan sağa ilerleyip ilk farklı basamağın neden karar verdiğini keşfet.',
  emoji: '🔍',
  color: '#2563eb',
  category: 'sayilar',
  grades: [4, 5],
  ready: true,
  launch: 'Bir arkadaşın “8.754 daha büyük, çünkü rakamları 12.006’nın rakamlarından büyük” diyor. Haklı mı? Bloklarla, on binlik kulelerle ve bir büyüteçle araştıralım.',
  reflect: 'Bir arkadaşın 72.384 ile 72.391’i karşılaştırırken “4 > 1, o hâlde 72.384 büyük” diyor. Ona büyüteç yöntemini ve sağdaki basamaklara neden bakmamız gerekmediğini nasıl anlatırsın?',
  bigIdea: 'Her basamak sağındakinin 10 katıdır. Bu yüzden basamak sayısı fazla olan doğal sayı daha büyüktür: en büyük 4 basamaklı sayı 9.999 bile 10.000’e 1 birlik uzaktadır. Basamak sayıları eşitse soldan başlanır ve ilk farklı rakam karar verir; çünkü o basamaktaki 1 birimlik fark, sağdaki bütün basamakların alabileceği en büyük değerden (99, 999…) bile büyüktür.',
  skills: {
    4: 'Basamak sayısı farklı ve aynı olan sayıları basamak değeriyle karşılaştırma; soldan ilk farklı basamağı bulma',
    5: 'Karşılaştırma kuralını bloklar ve sayı doğrusuyla gerekçelendirme; bilinmeyen rakamı muhakemeyle bulma',
  },
  outcomes: ['MAT.4.1.3', 'MAT.5.1.1'],
}
