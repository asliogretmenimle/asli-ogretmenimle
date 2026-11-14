import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'kalanin-yanina-sifir',
  no: 100,
  name: 'Kalanın Yanına Neden Sıfır?',
  description: 'Yazılı bölmede kalanın yanına yazılan sıfırın sırrını çöz: sıfır kartını kalanın yanına koyduğun anda masadaki çikolatalar 10 eş parçaya kırılır! Mini dersi izle, sıfırı kendin ekle, bölüme ne zaman 0 yazıldığını 20 kişilik sınıfla keşfet ve defterlerdeki hataları yakala.',
  emoji: '0️⃣',
  color: '#0d9488',
  category: 'kesirler',
  grades: [6],
  ready: true,
  launch: '3 ÷ 4 işleminde öğretmen “3’ün içinde 4 yok, bölüme 0 yaz, virgül koy, 3’ün yanına 0 ekle” diyor. Peki 3’ün yanına 0 eklersek 3 çikolata birden 30 çikolata mı oluyor? Bu sıfır nereden geliyor?',
  reflect: 'Kalanın yanına sıfır yazınca sayı gerçekten 10 kat büyüdü mü? 2 bütün ile 20 onda bir arasındaki ilişkiyi kendi cümlelerinle anlat. 21 ÷ 20 işleminde bölümün neden 1,5 değil 1,05 olduğunu bir arkadaşına nasıl açıklarsın?',
  bigIdea: 'Yazılı bölmede kalanın yanına sıfır yazmak sayıyı büyütmek değil, birimi değiştirmektir: 3 bütün = 30 onda bir, 2 onda bir = 20 yüzde bir. Sıfır, kalan parçaların 10 kat küçük parçalara bozulduğunu, yani bir sonraki basamağa geçildiğini kaydeder; bu yüzden ilk sıfırla birlikte bölüme virgül konur. Bozulan parçalar hâlâ bölene yetmiyorsa (10 onda bir ÷ 20) o basamakta kimseye parça düşmez ve bölüme 0 yazılır (21 ÷ 20 = 1,05). Öğrencilerin sık yaptığı hatalar: sıfırı ezber bir kural olarak görüp virgülü unutmak (3 ÷ 4 = 75), kalanın yanına yazılan sıfırı bölüme de yazmak, bölüme yazılması gereken ara sıfırı atlamak (1,05 yerine 1,5). Yazılı bölmeyi her adımda paylaştırma modeliyle eşleştirmek bu hataları anlam düzeyinde düzeltir.',
  skills: { 6: 'Yazılı bölmede kalanın yanına eklenen sıfırı birim değişimi (bütün → onda bir → yüzde bir) olarak açıklama; bölüme ara sıfır yazılması gereken durumları belirleme; bölme hatalarını paylaştırma modeliyle bulma' },
  outcomes: ['MAT.6.1.6', 'MAT.6.1.5'],
  showUnder: ['MAT.6.1.6'],
}
