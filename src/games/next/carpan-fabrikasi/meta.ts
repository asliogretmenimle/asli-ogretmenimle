import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'carpan-fabrikasi',
  name: 'Çarpan Fabrikası',
  description: 'Sayıları üretim hattında çarpanlarına ayır, ortak çarpanlarla makineleri çalıştır.',
  emoji: '🏭',
  color: '#b45309',
  grades: [5, 6],
  nextGen: true,
  ready: true,
  skills: { 5: 'Çarpan çiftleri, çarpma dizilimleri ve alan modeli', 6: 'İki basamaklı sayıların çarpanları ve dikdörtgen dizilimler' },
  howTo: ['Hedefteki parça sayısını oku.', 'Satır ve sütun sayılarını değiştirerek dikdörtgen kur.', 'Dizilimi dene; eş çarpımları ve farklı çarpan çiftlerini karşılaştır.'],
  launch: 'Üretim bandında hedef sayıda parça var. Parçaları eş sıralara dizerek kaç farklı makine kurulabileceğini keşfet.',
  reflect: 'Satır ve sütun sayılarını değiştirdiğinde toplam neden değişmedi?',
  bigIdea: 'Çarpma, eş grupların ve dikdörtgen dizilimlerin toplamını ifade eder; çarpanların yeri değişse de çarpım aynı kalır.',
  strategies: ['Dikdörtgen dizdim', 'Eş gruplar kurdum', 'Çarpan çiftlerini karşılaştırdım'],
}
