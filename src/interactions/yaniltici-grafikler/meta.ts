import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'yaniltici-grafikler',
  no: 64,
  name: 'Yanıltıcı Grafikler',
  description: 'Aynı veriyle farklı hikâyeler anlat: önce grafiği yanıltıcı yap, sonra düzelt ve gerekçelendir.',
  emoji: '🎭',
  color: '#7c3aed',
  category: 'cebir-veri',
  grades: [5, 6, 7, 8],
  ready: true,
  launch: 'İki aday 52 ve 48 oy aldı. Bir afişte Ece’nin sütunu Mert’inkinin üç katı görünüyor! Afişteki sayılar doğru; peki grafik doğruyu mu söylüyor? Bugün önce reklamcı, sonra editör olacaksın.',
  reflect: 'Bir arkadaşın “Sayılar doğruysa grafik de doğrudur” diyor. Katılıyor musun? Bugün yaptığın bir hileyle örnek vererek açıkla.',
  bigIdea: 'Grafikler veriyi orantılı göstermelidir: sütun boyu, simge alanı, dilim büyüklüğü ve çizginin eğimi değerle orantılı algılanır. Kırpılmış eksen, eşit olmayan aralıklar, büyütülmüş simgeler, seçilmiş zaman aralığı, en-boy oranı ve 3B görünüm sayıları değiştirmeden okuru yanıltabilir. Eleştirel okur önce ekseni, ölçeği ve gösterilen veri aralığını kontrol eder.',
  skills: {
    5: 'Sütun grafiğinde eksen başlangıcının etkisi, büyütülmüş simgeler, eşit olmayan aralıkları fark etme ve düzeltme',
    6: 'Simge büyütmede alan etkisi (3 kat → 9 kat), seçilmiş zaman aralığıyla yanıltma, birden çok hileyi düzeltme',
    7: 'Yalan katsayısı, çizgi grafiğinde en-boy oranı, 3B daire grafiğinde görünen pay, başkalarının yorumlarını tartışma',
    8: 'Aynı veriden zıt manşetler üretip eleştirme; grafik seçimlerinin sonuca etkisini gerekçelendirme',
  },
  outcomes: ['MAT.5.5.1', 'MAT.5.5.2', 'MAT.6.5.2', 'MAT.7.6.2', 'MAT.8.6.2'],
}
