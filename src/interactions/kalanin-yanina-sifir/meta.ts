import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'kalanin-yanina-sifir',
  no: 100,
  name: 'Kalanın Yanına Neden Sıfır?',
  description: 'Yazılı bölmede kalanın yanına yazılan sıfırın sırrını çöz: 0 kartını kalanın yanına koyduğun anda masadaki çikolatalar 10’ar parçaya bölünür. Adım adım mini dersi izle, sıfırı kendin ekle ve defterlerdeki hataları yakala.',
  emoji: '0️⃣',
  color: '#0d9488',
  category: 'kesirler',
  grades: [6],
  ready: true,
  launch: '6 ÷ 4 işleminde 4 kişiye 1’er çikolata verince 2 çikolata kalıyor. Öğretmen “2’nin yanına 0 yaz” diyor. 2 çikolata birden 20 çikolata mı oluyor? Bu sıfır nereden geliyor?',
  reflect: 'Kalanın yanına 0 yazınca çikolata çoğaldı mı? “2 bütün = 20 parça” cümlesini kendi sözlerinle açıkla. 3 ÷ 2 için 15 yazan bir arkadaşına çikolatalarla ne gösterirsin?',
  bigIdea: 'Yazılı bölmede kalanın yanına sıfır yazmak sayıyı büyütmek değil, birimi değiştirmektir: 3 bütün = 30 onda bir, 2 onda bir = 20 yüzde bir. Sıfır, kalan parçaların 10 kat küçük parçalara bozulduğunu, yani bir sonraki basamağa geçildiğini kaydeder; bu yüzden ilk sıfırla birlikte bölüme virgül konur. Bozulan parçalar hâlâ bölene yetmiyorsa (10 onda bir ÷ 20) o basamakta kimseye parça düşmez ve bölüme 0 yazılır (21 ÷ 20 = 1,05). Öğrencilerin sık yaptığı hatalar: sıfırı ezber bir kural olarak görüp virgülü unutmak (3 ÷ 4 = 75), kalanın yanına yazılan sıfırı bölüme de yazmak, bölüme yazılması gereken ara sıfırı atlamak (1,05 yerine 1,5). Yazılı bölmeyi her adımda paylaştırma modeliyle eşleştirmek bu hataları anlam düzeyinde düzeltir.',
  skills: { 6: 'Yazılı bölmede kalanın yanına eklenen sıfırı “bütünü 10 onda bire bozmak” olarak açıklama; virgülü ve birler basamağındaki 0’ı unutma gibi bölme hatalarını paylaştırma modeliyle bulma' },
  outcomes: ['MAT.6.1.6', 'MAT.6.1.5'],
  showUnder: ['MAT.6.1.6'],
}
