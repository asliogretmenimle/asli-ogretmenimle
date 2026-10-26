import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'su-muhendisi',
  name: 'Su Mühendisi',
  description: 'Farklı büyüklükteki depolar arasında su aktararak hedef miktara ulaş.',
  emoji: '💧',
  color: '#0284c7',
  grades: [3, 4, 5, 6],
  nextGen: true,
  ready: true,
  skills: {
    3: 'Litreyi karşılaştırma, kapları sıralama ve eş ölçü birimleri',
    4: 'Kesirli miktarları karşılaştırma ve ölçü kabıyla hedef miktar oluşturma',
    5: 'Denk kesir, doluluk oranı ve kapasite ilişkisi',
    6: 'Ondalık litre, yüzde, kesir ve aktarma planlarını karşılaştırma',
  },
  howTo: ['Görevi oku; hedef miktarı tahmin et.', 'Kapları doldur, boşalt ya da birbirine aktar; sürükle veya düğmelere dokun.', 'Ölçüleri karşılaştır, farklı yolları dene ve stratejini açıkla.'],
  launch: 'Depodaki suyu doğru miktarda taşıyıp farklı kapları karşılaştır. Çizgiler görünmeden hedefe ulaşabilir misin?',
  reflect: 'Bir kabın daha dolu görünmesi her zaman daha çok su olduğu anlamına gelir mi? Hangi ölçü sana yardımcı oldu?',
  bigIdea: 'Ölçme, birimi ve bütünü dikkate alır: aynı miktar farklı kaplarda farklı kesirlerle gösterilebilir; doluluk oranı ile gerçek miktar aynı değildir.',
  strategies: ['Önce tahmin ettim', 'Kap çizgilerini kullandım', 'Aynı birime çevirdim', 'Farklı aktarma yolu buldum'],
}
