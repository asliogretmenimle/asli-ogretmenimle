import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'hacim-insaati',
  no: 56,
  name: 'Hacim İnşaatı',
  description: 'Birim küplerle yapılar kur, hacimlerini karşılaştır.',
  emoji: '🏗️',
  color: '#db2777',
  category: 'geometri',
  grades: [5, 6, 7, 8],
  ready: true,
  launch: 'Bir oyuncak firması 12 küp şekeri tek bir kutuya koymak istiyor. Kaç farklı kutu tasarlanabilir? Hepsine aynı miktar şeker sığarken, hangisi en az karton ister?',
  reflect: 'Bir arkadaşın “Resimde gördüğüm küpleri saydım, 10 küp var.” diyor. Bu yöntem her zaman doğru sonuç verir mi? Katları düşünerek ona nasıl açıklarsın?',
  bigIdea: 'Hacim, bir cismin kaç birim küple doldurulduğudur. Küpleri kat kat düzenlemek (taban × kat sayısı) sayma işini çarpmaya dönüştürür; böylece V = a · b · c ve “taban alanı × yükseklik” kuralları ezberlenmeden ortaya çıkar. Hacimleri aynı olan cisimlerin biçimleri ve yüzey alanları çok farklı olabilir.',
  skills: {
    5: 'Birim küplerle yapı kurma, saklı küpleri de sayarak yapıları karşılaştırma, tabanı sıra sıra doldurup kat kat sayma',
    6: 'Aynı sayıda küple farklı kutular kurma, katları tekrarlı toplama ve çarpmayla sayma, kat sayısını bulma',
    7: 'Katlardan V = a · b · c bağıntısını çıkarma, görünümlerden yapı kurma, aynı hacimde farklı yüzey alanı, eksik boyutu bulma',
    8: 'Taban alanı × yükseklik (dikdörtgen olmayan taban, silindir benzetmesi), en az yüzey alanı, boyutlar 2 katına çıkınca hacim',
  },
  outcomes: ['MAT.5.4.2', 'MAT.7.4.1', 'MAT.7.4.2', 'MAT.7.4.3', 'MAT.7.4.4', 'MAT.7.4.6', 'MAT.8.4.3'],
}
