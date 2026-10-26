import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'islem-dogru-mu',
  no: 33,
  name: 'İşlem Doğru mu?',
  description: 'İşlem yapmadan, ilişkilerle eşitliklerin doğruluğunu değerlendir.',
  emoji: '✅',
  color: '#2563eb',
  category: 'sayilar',
  grades: [3, 4, 5, 6, 7, 8],
  ready: true,
  launch: 'Ece tahtaya “37 + 48 = 38 + 47” yazdı ve “Hiç toplama yapmadan bunun doğru olduğunu söyleyebilirim!” dedi. Nasıl yapmış olabilir? Bugün terazinin örtüsünü açmadan, yalnızca sayılar arasındaki ilişkilere bakarak karar vereceğiz.',
  reflect: 'Hesaplamadan karar verirken hangi ilişkiye baktın? Toplamada işe yarayan “birinden al, öbürüne ver” fikri çıkarmada da işe yarar mı? Bir örnekle açıkla.',
  bigIdea: 'Eşittir işareti ilişkiseldir: “iki taraf aynı değerdedir” demektir, “sonucu yaz” demek değildir. Eşitlikler hesaplamadan, ilişkilerle değerlendirilebilir: toplamada telafi (+1/−1), çıkarmada aynı kaydırma, çarpmada iki katı–yarısı, kesirde pay ve paydayı aynı sayıyla çarpma değeri korur; pay ve paydaya aynı sayıyı eklemek, üsleri çarpmak gibi yanılgılar korumaz.',
  skills: {
    3: 'Toplama ve çıkarmada telafi; çarpmada iki katı–yarısı',
    4: 'Büyük sayılarda telafi; bölmede bölünen ve böleni birlikte değiştirme',
    5: 'Denk kesirler (çarpımsal mı, toplamsal mı?); işlem özellikleri',
    6: 'Ondalık sayılarla ilişkiler; kesir toplamada yanılgılar',
    7: 'Tam sayılarla çıkarma = ters işaretlisini toplama; işaret kuralları',
    8: 'Üslü ve kareköklü ifadelerde eşitlik ilişkileri',
  },
  outcomes: ['MAT.3.2.8', 'MAT.3.2.1', 'MAT.4.2.9', 'MAT.4.2.4', 'MAT.4.1.7', 'MAT.5.2.1', 'MAT.5.1.4', 'MAT.6.1.7', 'MAT.7.1.1', 'MAT.7.2.3', 'MAT.8.1.1', 'MAT.8.1.2'],
}
