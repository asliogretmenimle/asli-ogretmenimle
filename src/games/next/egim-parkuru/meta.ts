import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'egim-parkuru',
  name: 'Eğim Parkuru',
  description: 'Rampanın dikliğini ayarla, kaykaycıyı hedef yıldıza ulaştır; eğim katsayısının doğrunun grafiğini nasıl değiştirdiğini sezerek keşfet.',
  emoji: '🛹',
  color: '#0891b2',
  grades: [8],
  nextGen: true,
  ready: true,
  skills: { 8: 'Eğimi dikey değişim ÷ yatay değişim olarak yorumlama; pozitif, negatif, kesirli ve sıfır eğim; y = mx ve y = mx + n doğrularının grafiği; paralel doğrular' },
  howTo: [
    'Hedef yıldızın koordinatlarını oku.',
    'Rampanın ucunu sürükle ya da “yukarı” ve “ileri” adımlarını ayarla: eğim ve denklem canlı yazılır.',
    'Kaykaycıyı gönder: rampa hedeften geçiyorsa yıldızı toplarsın.',
    'Iskalarsan kaykaycının nereden geçtiğine bak ve eğimi düzelt; can yok.',
  ],
  launch: 'Kaykay parkında rampayı sen kuruyorsun. Yıldız (4, 6) noktasında. Rampa her 1 adım ileri gidince kaç adım yükselmeli ki kaykaycı yıldızı yakalasın?',
  reflect: 'Eğim büyüdükçe rampanın grafiği nasıl değişti? Eğimi negatif olan bir rampayı bir arkadaşına günlük hayattan bir örnekle anlat.',
  bigIdea: 'Eğim, yatayda bir birim ilerlerken dikeydeki değişimdir: m = dikey değişim ÷ yatay değişim. Eğim büyüdükçe doğru dikleşir, negatif eğimde doğru aşağı iner, eğim 0 ise doğru yataydır. y = mx + n doğrusunda m dikliği, n doğrunun y eksenini kestiği yüksekliği belirler; eğimleri eşit doğrular paraleldir.',
  strategies: ['Hedefin koordinatlarını böldüm (y ÷ x)', 'Eğim üçgenini kullandım', 'Deneyip düzelttim', 'Başlangıç yüksekliğini çıkardım'],
  outcomes: ['MAT.8.2.1', 'MAT.8.2.2', 'MAT.8.2.3'],
}
