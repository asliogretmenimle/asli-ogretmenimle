import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'kargo-rotasi',
  name: 'Kargo Rotası',
  description: 'Kargo aracının uğrayacağı adresler için rotaları karşılaştır, en uygununu gerekçelendir.',
  emoji: '🚚',
  color: '#ca8a04',
  grades: [3, 4, 5, 6],
  nextGen: true,
  ready: true,
  skills: { 3: 'Uzunlukları toplama ve olası rotaları karşılaştırma', 4: 'Uzunluk ölçüleri, birim dönüşümü ve toplam mesafe', 5: 'Ondalık ölçülerle rota uzunluğu hesaplama', 6: 'Kısıtlı yol ağında en uygun rotayı gerekçelendirme' },
  howTo: ['Haritadaki mevcut konumundan komşu bir yere dokun.', 'Sokak uzunluklarını toplayarak hedefe ulaş.', 'Rotanı en kısa yol ile karşılaştır ve başka güzergâh düşün.'],
  launch: 'Kasabada teslimat bekleyen adresler var. Yol uzunluklarını toplayıp kargon için uygun rotayı seç.',
  reflect: 'En kısa yol her zaman en iyi yol mudur? Bir rotayı seçerken hangi bilgileri karşılaştırdın?',
  bigIdea: 'Bir rotanın toplam uzunluğu, ardışık yol parçalarının toplamıdır; farklı yolları ölçüp karşılaştırabiliriz.',
  strategies: ['Parça uzunluklarını topladım', 'Rotaları karşılaştırdım', 'Önce en kısa yolu düşündüm'],
}
