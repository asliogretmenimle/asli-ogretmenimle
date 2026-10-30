import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'ozdeslik-bulmacasi',
  name: 'Özdeşlik Bulmacası',
  description: 'Cebir karolarını sürükleyip çerçeveye yerleştir, kare ve dikdörtgen bulmacalarını tamamla; (a + b)², (a − b)² ve iki kare farkı özdeşliklerini geometriyle keşfet.',
  emoji: '🧩',
  color: '#7c3aed',
  grades: [8],
  nextGen: true,
  ready: true,
  skills: { 8: 'Cebir karolarıyla (x + a)², (x + a)(x + b) ve iki kare farkını alan modeliyle somutlaştırma; özdeşlikleri parçaları yeniden düzenleyerek kanıtlama ve çarpanlara ayırma' },
  howTo: [
    'Çerçevenin kenar uzunluklarını oku: (x + 2) gibi.',
    'x², x ve 1 karolarını sürükleyip çerçeveyi boşluksuz ve taşmadan doldur (dokun-dokun da olur).',
    'Çerçeve dolunca karolar sayılır ve özdeşlik kendiliğinden yazılır.',
    'Kesip taşıma bulmacalarında parçayı sürükle ve döndür: alan değişmeden şekil değişir.',
  ],
  launch: 'Bir kenarı (x + 2) olan kare bir bahçeyi x², x ve 1 karolarıyla döşeyeceksin. Bir arkadaşın “x² + 4 karo yeter” diyor. Haklı mı? Karoları dizerek kontrol et.',
  reflect: '(x + 3)² ifadesinin x² + 9 olmadığını karolarla bir arkadaşına nasıl gösterirsin? Aradaki 6x nereden geliyor?',
  bigIdea: 'Bir dikdörtgenin alanı kenar uzunluklarının çarpımıdır; kenarlar cebirsel ifadeyse alan da karoların toplamı olarak yazılır. (a + b)² = a² + 2ab + b² özdeşliğindeki 2ab, karenin içindeki iki eş dikdörtgendir. Parçaları kesip yeniden düzenlemek alanı değiştirmez; a² − b² = (a − b)(a + b) özdeşliği bu yüzden geçerlidir.',
  strategies: ['Önce büyük karoyu yerleştirdim', 'Kenarlara bakarak karoları seçtim', 'Karoları sayıp ifadeyi yazdım', 'Parçayı kesip taşıdım'],
  outcomes: [],
}
