import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'mozaik-ustasi',
  name: 'Mozaik Ustası',
  description: 'Şekilleri döndür, birleştir; yüzeyi boşluksuz kapla, kendi desenini tasarla.',
  emoji: '🧩',
  color: '#db2777',
  grades: [2, 3, 4, 5, 6],
  nextGen: true,
  skills: {
    2: 'Şekilleri birleştirip ayırma: iki üçgen bir eşkenar dörtgen, üç üçgen bir yamuk',
    3: 'Simetriyi tamamlama, alanı birim parçalarla sayma, bir noktanın çevresini kaplama',
    4: 'Doğruya göre simetri, alan tahmini ve karşılaştırma, köşede buluşan açılar',
    5: 'Alan ilişkileri ve kesirler (yamuk = [[1/2]] altıgen), köşede 360°, hangi çokgenler kaplar?',
    6: 'Bütün değişince kesir değişir, açı toplamı 360°, farklı çokgen karışımlarıyla kaplama',
  },
  howTo: [
    'Tepsideki parçayı tahtaya sürükle ya da dokun.',
    'Döndürmek için parçayı iki parmakla çevir ya da seçip ⟳ düğmesine dokun.',
    'Çerçeveyi boşluksuz ve taşırmadan doldur; parça kafese kendiliğinden oturur.',
    'Aynı çerçeveyi farklı parçalarla doldurmayı dene! Tahta iki parmakla yakınlaşır.',
  ],
  launch: 'Bir mozaik ustası, duvarı hiç boşluk bırakmadan ve hiçbir karoyu üst üste koymadan nasıl kaplar? Bazı karolar yan yana kusursuz oturur, bazıları asla… Neden?',
  reflect: 'Altıgeni farklı parçalarla doldurduğunda neden hep aynı büyüklükte yer kapladın? Bir köşede buluşan parçaların açıları hakkında ne fark ettin?',
  bigIdea: 'Şekiller daha küçük şekillere ayrılabilir ve birleştirilebilir; alan, parçalar yeniden düzenlense de korunur. Bir köşenin çevresi tam bir dönüştür (360°): açıları bu toplamı tam veren çokgenler boşluksuz kaplar.',
  strategies: ['Büyük parçalarla başlama', 'Küçük parçalara ayırma', 'Eş parçalarla çevreleme', 'Farklı açıları birleştirme', 'Simetri doğrusuna göre yansıtma', 'Dönme simetrisi kullanma', 'Farklı çokgenleri karıştırma'],
  outcomes: ['MAT.2.3.3', 'MAT.2.3.4', 'MAT.2.3.7', 'MAT.3.3.6', 'MAT.3.3.7', 'MAT.4.3.4', 'MAT.4.3.5', 'MAT.4.3.8', 'MAT.4.3.9', 'MAT.5.1.3', 'MAT.5.3.6', 'MAT.6.3.4', 'MAT.6.4.3'],
}
