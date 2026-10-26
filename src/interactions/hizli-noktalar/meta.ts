import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'hizli-noktalar',
  no: 22,
  name: 'Hızlı Noktalar',
  description: 'Kısa süre gösterilen nokta gruplarının sayısını tek tek saymadan bul.',
  emoji: '👀',
  color: '#2563eb',
  category: 'sayilar',
  grades: [1, 2],
  ready: true,
  launch: 'Bir zarı attığında noktaları tek tek saymadan kaç olduğunu hemen söyleyebilirsin. Bakalım başka nokta düzenlerini de bir bakışta görebilecek misin? Noktalar yalnızca birkaç saniye görünecek!',
  reflect: 'Bir görüntüyü saymadan nasıl gördün? Bir arkadaşına “ben 5 ve 2 gördüm” gibi gördüğün parçaları anlat. Arkadaşın aynı noktaları başka nasıl görmüş olabilir?',
  bigIdea: 'Sayılar parçalardan oluşur. Çocuk 5 ve 10 çapalarını, ikizleri ve tanıdık şekilleri kullanarak bir çokluğu saymadan (şipşak) tanır; “7 = 5 + 2” gibi parça-parça-bütün ilişkileri toplama ve çıkarma stratejilerinin temelidir.',
  skills: {
    1: 'Zar, onluk çerçeve ve iki renkli düzenleri saymadan tanıma; 5 ve 10 çapaları, ikizler, 10 ve fazlası',
    2: 'Yirmilik çerçevede 10’a tamamlama, onar ve beşer görme, 20’ye tamamlayan parçayı bulma',
  },
  outcomes: ['MAT.1.1.2', 'MAT.1.1.7', 'MAT.1.2.2', 'MAT.2.1.6', 'MAT.2.2.2'],
}
