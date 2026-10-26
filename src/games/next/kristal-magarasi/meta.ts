import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'kristal-magarasi',
  name: 'Kristal Mağarası',
  description: 'Geometrik cisimlerden oluşan kristallerin kesit, yüzey ve hacimlerini keşfet.',
  emoji: '💎',
  color: '#7e22ce',
  grades: [7, 8],
  nextGen: true,
  ready: true,
  skills: {
    7: 'Üslü ifadeleri tekrarlı çarpma ve eşdeğer gösterimlerle modelleme',
    8: 'Üs kuralları, sıfır ve negatif üsler, karekök ve irrasyonel uzunluklar',
  },
  howTo: ['Mağara odasındaki problemi incele ve önce tahmin et.', 'Kristalleri birleştir, ayır ya da dönüştürerek modeli kur.', 'Sembolün modelden nasıl çıktığını açıkla; farklı geçerli yolları keşfet.'],
  launch: 'Kristallerin üzerindeki kuvvetler büyüme ve bölünme kurallarını saklıyor. Her odada modeli hareket ettirerek kuralı keşfet.',
  reflect: 'Kristalleri farklı biçimde gruplayınca neden aynı değeri elde ettin? Hangi model üs kuralını görünür kıldı?',
  bigIdea: 'Üslü ifadeler tekrarlı çarpmanın kısa gösterimidir; üs kuralları çarpanları gruplayıp saymaktan doğar. Karekökler uzunlukları temsil edebilir ve her zaman rasyonel sayı değildir.',
  strategies: ['Tekrarlı çarpanları saydım', 'Üsleri gruplayıp karşılaştırdım', 'Önce tahmin ettim', 'Kristal modelini kurdum'],
}
