import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'trafik-simulatoru',
  name: 'Trafik Simülatörü',
  description: 'Araçların hareketini grafiklerle incele, sabit hızlı senaryoları modelle.',
  emoji: '🚦',
  color: '#059669',
  grades: [7, 8],
  nextGen: true,
  ready: true,
  skills: { 7: 'Sabit hızlı hareket, yol-zaman grafiği ve eğim', 8: 'Doğrusal ilişki: yol = hız × zaman; grafik yorumu' },
  howTo: ['Hedef yol uzunluğunu oku.', 'Hızı ve süreyi değiştir; grafikteki noktayı izle.', 'Yol = hız × zaman modelini denetle ve farklı seferleri karşılaştır.'],
  launch: 'Trafik merkezinde farklı araçların aynı hedefe varışını modelle. Hız değişince yol-zaman grafiğinin eğimi nasıl değişiyor?',
  reflect: 'Aynı mesafeye farklı hız ve süre çiftleriyle ulaşabilir misin? Grafiğin eğimi neyi anlatıyor?',
  bigIdea: 'Sabit hızlı harekette yol, hız ile zamanın çarpımıdır; yol-zaman grafiğinin eğimi hıza karşılık gelir.',
  strategies: ['Hızla zamanı çarptım', 'Tablodan yararlandım', 'Grafiğin eğimini yorumladım'],
}
