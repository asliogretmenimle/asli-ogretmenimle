import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'pasta-paylasimi',
  no: 95,
  name: '12 Dilim Pasta, 5 Kişi',
  description: '12 dilimlik pastayı 5 arkadaşın tabağına sürükleyerek dağıt: farklı dağıtımları deftere yaz, eşit paylaş, artan dilimleri 5 eşit parçaya kes ve düzenli sayarak kaç farklı yol olduğunu bul.',
  emoji: '🎂',
  color: '#db2777',
  category: 'sayilar',
  grades: [3, 4],
  ready: true,
  launch: 'Doğum günü pastası 12 dilime kesildi, masada 5 arkadaş var. Bu pastayı 5 kişi kaç farklı şekilde yiyebilir? Biri hiç yemeyebilir mi? Ali 3, Ece 2 dilim yerse ile Ali 2, Ece 3 dilim yerse aynı şey mi? Dilimleri tabaklara dağıtarak araştıralım.',
  reflect: '“12 dilim pastayı 5 kişi kaç farklı şekilde yiyebilir?” sorusuna tek bir cevap var mı? Cevap vermeden önce neye karar vermemiz gerekiyor? Çok fazla yol olduğunda hiçbirini kaçırmadan nasıl sayarız?',
  bigIdea: 'Kullanıcının açık uçlu sorusu (“12 dilim pastayı 5 kişi kaç farklı şekilde yiyebilir?”) önce bir karar ister: kimin aldığı önemli mi? Önemliyse (biri hiç almayabilir) 1.820, herkes en az 1 alırsa 330 dağıtım vardır; yalnızca dilim sayılarına bakarsak 47 (bu sayılar etkinlikte kodla hesaplanır). Bu kadar çok yol, çocuğa tek tek denemek yerine düzenli saymanın gerektiğini gösterir; bu yüzden etkinlik küçük bir durumla (5 dilim, 2 kişi: 6 yol) başlayıp n dilim, 2 kişi → n + 1 yol örüntüsüne ve sınırlı, tamamen listelenebilir bir probleme (herkes 1 ile 4 dilim arası: 6 dağıtım) geçer. Aynı bağlam eşit paylaştırmayı da taşır: 12 = 5 × 2 + 2; 3’er olmaz çünkü 5 × 3 = 15. Artan 2 dilim 5 eşit parçaya kesilince birim kesir doğar (beşte bir); 4. sınıfta her kişinin payı 2 tam 2/5 dilim olarak adlandırılır.',
  skills: {
    3: 'Eşit paylaştırmayı modelleme ve kalanı yorumlama (12 = 5 × 2 + 2); bir bütünü 5 eşit parçaya bölüp beşte bir birim kesrini adlandırma; küçük durumlarda düzenli sayma',
    4: 'Kalanlı bölmeyi bağlamda yorumlama (12 ÷ 5 = 2, kalan 2); kalanı kesirle paylaştırıp 2 tam 2/5 olarak ifade etme; sıralı ve sırasız sayımı ayırt edip n + 1 örüntüsünü genelleme',
  },
  outcomes: ['MAT.3.2.4', 'MAT.3.2.6', 'MAT.3.1.10', 'MAT.4.2.5', 'MAT.4.2.7'],
}
