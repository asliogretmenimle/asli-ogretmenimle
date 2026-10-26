import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'kurabiye-fabrikasi',
  name: 'Kurabiye Fabrikası',
  description: 'Kurabiyeleri tabaklara, kutulara ve tepsilere eşit diz; 3 × 4 ile 4 × 3’ü, 2 × 6 ile 6 × 2’yi keşfet.',
  emoji: '🍪',
  color: '#d97706',
  grades: [1, 2, 3],
  nextGen: true,
  skills: {
    1: 'Eşit gruplar, tekrarlı toplama (4 + 4 + 4), 2’şer-5’er-10’ar ritmik sayma, ikizler',
    2: 'Dizilimle çarpma (×), değişme özelliği, gruplama olarak bölme',
    3: '10 × 10’a kadar dizilimler, dağılma özelliği (6 × 7 = 5 × 7 + 1 × 7), eksik çarpan olarak bölme',
  },
  howTo: [
    'Şefin siparişini oku: kaç kurabiye isteniyor?',
    'Kurabiyeleri tabaklara sürükle, kutuları kamyona yükle ya da tepsinin turuncu köşesini sürükleyerek tepsiyi büyüt.',
    'Her sırada ya da tabakta aynı sayıda kurabiye olunca “Gönder”e bas; altta işlem cümlen belirir.',
    'Aynı kurabiyeleri başka bir düzenle de diz: her farklı düzen yeni bir sipariş!',
  ],
  launch: 'Fabrikamıza 12 kurabiyelik bir sipariş geldi. Tepsiye 3 sıra 4’er mi koymalıyız, 2 sıra 6’şar mı? Yoksa başka bir yol var mı?',
  reflect: '3 sıra 4’er kurabiyelik tepsi ile 4 sıra 3’er kurabiyelik tepsi aynı sayıda kurabiye tutar mı? Bir arkadaşına çizerek anlat.',
  bigIdea: 'Çarpma eşit grupların tekrarlı toplamıdır; dizilim modeli bu grupları sıra ve sütun olarak görünür kılar. Dizilimi döndürmek sayıyı değiştirmez (değişme özelliği), kesmek ise zor bir çarpımı kolay parçalara ayırır (dağılma özelliği). Bölme, eşit paylaştırma ya da “kaç tane var?” sorusudur ve eksik çarpanı bulmaktır.',
  strategies: [
    'Birer birer dağıtma (paylaştırma)',
    'Eşit gruplar oluşturma',
    'Ritmik sayma (2’şer, 5’er, 10’ar)',
    'Önce 10’lar, sonra kalan',
    'Tepsiyi döndürme (değişme özelliği)',
    'Yarılama ve ikiye katlama',
    '5’lere ayırma',
    'Bilinen bir çarpıma ayırma',
  ],
  outcomes: ['MAT.1.1.2', 'MAT.1.1.5', 'MAT.1.2.1', 'MAT.2.1.4', 'MAT.2.2.4', 'MAT.2.2.5', 'MAT.3.1.4', 'MAT.3.2.3', 'MAT.3.2.4'],
}
