import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'zihinden-toplama-cikarma',
  no: 89,
  name: 'Zihinden Toplama ve Çıkarma Stratejileri',
  description: 'Taban blokları, yüzlük tablo ve boş sayı doğrusunda zıplayarak parçalama, onluğa yuvarlama ve tamamlama stratejilerini keşfet. Her hareketin işlem cümlesine dönüşür: 46 + 20 = 66, 66 + 7 = 73.',
  emoji: '🧠',
  color: '#2563eb',
  category: 'sayilar',
  grades: [2, 3],
  ready: true,
  launch: '46 + 27’yi kâğıt kalem kullanmadan nasıl hesaplarsınız? Birkaç farklı yol söyleyin. Bir arkadaşınız “Önce 46’ya 20 eklerim” diyor, bir başkası “27 neredeyse 30” diyor. Bu yolları bloklarla, yüzlük tabloda ve sayı doğrusunda deneyelim.',
  reflect: '25 + 39’u neden 25 + 40 − 1 diye hesaplamak kolay? 72 − 48’i geri sayarak mı, 48’den ileri sayarak mı yapmak daha kolay? Bir işleme bakınca hangi yolu seçeceğine nasıl karar veriyorsun?',
  bigIdea: 'Zihinden toplama ve çıkarmada tek bir doğru yol yoktur; sayılara bakıp esnek bir strateji seçilir. Parçalamada ikinci sayı onluk ve birliklerine ayrılıp sırayla eklenir (46 + 27 = 46 + 20 + 7). Onluğa yuvarlamada 9 ya da 8 ile biten sayı en yakın onluğa yuvarlanır, fazlası geri alınır (25 + 39 = 25 + 40 − 1). Tamamlamada çıkarma bir fark olarak düşünülür ve küçük sayıdan büyüğe ileri sayılır (72 − 48: 48 → 50 → 70 → 72, fark 24). Taban blokları, yüzlük tablo ve boş sayı doğrusu aynı stratejinin farklı resimleridir; her hareketin işlem cümlesine yazılması modelden zihinsel işleme geçişi sağlar. Boş sayı doğrusu, stratejiyi kâğıtta kaydetmek için de güçlü bir araçtır.',
  skills: {
    2: '100’e kadar sayılarla toplama ve çıkarmayı bloklar, yüzlük tablo ve boş sayı doğrusuyla modelleme; parçalama, onluğa yuvarlama ve tamamlama stratejilerini deneyip işlem cümlesiyle yazma',
    3: 'Zihinden toplama ve çıkarmada sayılara uygun stratejiyi seçme ve gerekçelendirme; onluğa ve yüzlüğe yuvarlama ile telafi, yakın sayılarda ileri sayarak fark bulma (üç basamaklı sayılarda da)',
  },
  outcomes: ['MAT.2.1.2', 'MAT.2.2.1', 'MAT.2.2.2', 'MAT.2.2.3', 'MAT.3.1.2', 'MAT.3.2.1', 'MAT.3.2.2'],
}
