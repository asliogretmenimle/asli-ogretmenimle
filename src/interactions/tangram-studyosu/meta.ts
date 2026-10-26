import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'tangram-studyosu',
  no: 47,
  name: 'Tangram Stüdyosu',
  description: 'Parçaları döndürüp birleştirerek şekiller ve desenler üret.',
  emoji: '🔺',
  color: '#db2777',
  category: 'geometri',
  grades: [1, 2, 3, 4, 5, 6],
  ready: true,
  launch: 'Bir kedi, bir kayık ve bir kare… Üçü de aynı yedi tangram parçasından yapılıyor. Peki hangisi daha çok yer kaplar? Bugün gölgeleri parçalarla dolduracak, parçalar arasındaki gizli ilişkileri bulacak ve sonunda kendi tasarımını galeriye ekleyeceksin.',
  reflect: 'Yedi parçayla yaptığın kedi ile kare aynı alanda mı? Bunu, hiç ölçmeden bir arkadaşına nasıl kanıtlarsın?',
  bigIdea: 'Bir şekil parçalanıp yeniden düzenlendiğinde biçimi değişir, alanı değişmez (alanın korunumu). Küçük üçgen gibi bir parça alan birimi olarak kullanılabilir: kare, orta üçgen ve paralelkenar 2, büyük üçgen 4 küçük üçgendir. Ortak birimle ölçmek, eş olmayan parçaları sayarak kesir yazma yanılgısını (7 parça → [[1/7]]) ortadan kaldırır; birim büyüyünce ölçü küçülür.',
  skills: {
    1: 'İki küçük üçgenle kare, üçgen ve paralelkenar yapma; biçim değişir, kapladığı yer değişmez',
    2: 'Parçaları döndürüp birleştirerek siluetleri doldurma, aynı parçalarla farklı şekiller; serbest tasarım',
    3: 'Kare ve orta üçgen = 2 küçük üçgen; büyük üçgeni farklı parçalarla kaplama; tasarımın alanını sayma',
    4: 'Büyük üçgeni 3 farklı yolla kaplama, bütün kare = 16 küçük üçgen, farklı biçim aynı alan',
    5: 'Parçaların alanını küçük üçgenle ölçme, orta üçgen = bütünün [[1/8]]’i, tasarımın alanını hesaplama',
    6: 'Parçaların bütüne oranı ([[1/2]], [[1/4]]), birim değişince ölçünün değişmesi (16 küçük üçgen = 8 kare parça)',
  },
  outcomes: ['MAT.1.3.2', 'MAT.2.3.3', 'MAT.2.3.4', 'MAT.3.1.10', 'MAT.4.3.4', 'MAT.5.4.2', 'MAT.6.4.1'],
}
