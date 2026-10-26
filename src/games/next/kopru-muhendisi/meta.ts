import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'kopru-muhendisi',
  name: 'Köprü Mühendisi',
  description: 'Belirli ölçülerde köprü tasarla; uzunluk, açı ve oran seçimleri modeli değiştirir.',
  emoji: '🌉',
  color: '#475569',
  grades: [5, 6, 7, 8],
  nextGen: true,
  ready: true,
  skills: { 5: 'Uzunluk ölçme, dik üçgende kenarlar arasındaki ilişki', 6: 'Kare ve karekökü uzunluk modelleriyle yorumlama', 7: 'Pisagor bağıntısı ve gerçek yaşam problemleri', 8: 'Pisagor bağıntısı ile bilinmeyen kenar bulma' },
  howTo: ['Açıklık ve kule ölçülerini incele.', 'Sürgüleri kullanarak köprünün iki dik kenarını kur.', 'Çapraz kirişin uzunluğunu tahmin et ve ölçüleri denetle.'],
  launch: 'İki kıyı arasında köprü kurarken yatay açıklık ve kule yüksekliği değişiyor. Hangi çapraz kiriş güvenli olur?',
  reflect: 'Yatay ve düşey ölçüler değişince çapraz kiriş nasıl değişti?',
  bigIdea: 'Dik üçgende iki dik kenarın kareleri toplamı hipotenüsün karesine eşittir.',
  strategies: ['Kareleri karşılaştırdım', 'Üçgen kenarlarını ölçtüm', 'Pisagor bağıntısını kullandım'],
}
