import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'eksik-bilgi',
  no: 71,
  name: 'Eksik Bilgiyi Bul',
  description: 'Bir problemi çözmek için hangi bilgilerin gerekli olduğunu belirle.',
  emoji: '❓',
  color: '#ea580c',
  category: 'muhakeme',
  grades: [3, 4, 5, 6, 7, 8],
  ready: true,
  launch: 'Bir problemde verilen her sayıyı kullanmak zorunda mısın? Bazen problemde gereksiz bilgiler olur, bazen de çözmek için gereken bir bilgi hiç yoktur. Bir dedektif gibi bilgileri ayıklayalım!',
  reflect: 'Bir bilginin gerekli olup olmadığına nasıl karar verdin? Eksik bilgiye verdiğin değeri neden makul buldun?',
  bigIdea: 'Problem çözmenin ilk adımı problemi anlamaktır: “Ne soruluyor?” sorusu, hangi bilgilerin gerekli, hangilerinin gereksiz olduğunu belirler. “Bu bilgi değişseydi cevap değişir miydi?” testi gereksiz sayıları eler; eksik bir bilgi fark edilince gerçek hayata uygun bir değer seçmek, cevabın o değere bağlı olduğunu (değişken fikrini) görünür kılar.',
  skills: {
    3: 'Toplama, çıkarma ve çarpma problemlerinde gerekli, gereksiz ve eksik bilgiyi ayırt etme (para, nesneler)',
    4: 'Çok adımlı dört işlem problemlerinde (uzunluk, süre, para) bilgiyi ayıklama ve eksik veriyi tamamlama',
    5: 'Bir çokluğun kesri, dikdörtgenin alanı ve çevresi, büyük sayılar içeren problemlerde gerekli bilgiyi seçme',
    6: 'Ondalık gösterim, yüzde, oran ve aritmetik ortalama problemlerinde eksik bilgiyi bulma ve makul değer verme',
    7: 'Tam sayı, rasyonel sayı, orantı ve denklem problemlerinde bilgiyi modele dönüştürme',
    8: 'Üslü ifade, Pisagor bağıntısı ve doğrusal ilişki problemlerinde gerekli nicelikleri belirleme',
  },
  outcomes: ['MAT.3.2.6', 'MAT.3.2.7', 'MAT.4.2.7', 'MAT.4.2.8', 'MAT.5.1.2', 'MAT.5.4.4', 'MAT.6.1.7', 'MAT.6.2.1', 'MAT.6.5.1', 'MAT.7.1.4', 'MAT.7.1.7', 'MAT.7.2.2', 'MAT.8.1.1', 'MAT.8.2.2', 'MAT.8.3.6'],
}
