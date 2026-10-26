import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'ucgen-olusturucu',
  no: 53,
  name: 'Üçgen Oluşturucu',
  description: 'Kenar ve açı koşullarını değiştirerek üçgenleri araştır.',
  emoji: '△',
  color: '#db2777',
  category: 'geometri',
  grades: [5, 6, 7, 8],
  ready: true,
  launch: 'Elinde 3 cm, 4 cm ve 8 cm’lik üç çubuk var. Uçlarından birleştirip bir üçgen yapabilir misin? Peki hangi üç çubukla her zaman üçgen kurulur, hangileriyle asla kurulamaz?',
  reflect: 'Bir arkadaşın “Herhangi üç çubukla bir üçgen yapılabilir” diyor. Ona hangi örneği gösterirdin? Bir üçgenin kenarları ile açıları arasında başka hangi ilişkiyi keşfettin?',
  bigIdea: 'Üçgen kenarları ve açıları birbirine bağlı bir yapıdır: iki kısa kenarın toplamı en uzun kenardan büyük olmalıdır, iç açılar toplamı her zaman 180°’dir ve en uzun kenarın karşısında en büyük açı bulunur. Bazı bilgiler (KKK, KAK, AKA) bir üçgeni tek türlü belirler; açıların eşit olması ise yalnızca benzerlik sağlar.',
  skills: {
    5: 'Çubuk deneyiyle üçgen oluşturma koşulu, pergelle (çember kesişimiyle) eşkenar ve ikizkenar üçgen',
    6: 'Açıları koparıp birleştirerek iç açılar toplamı (180°), eksik açı ve ikizkenar üçgen problemleri',
    7: 'İç açılar toplamı, yükseklik–kenarortay–açıortayı özelliklerinden tanıma ve ikizkenar üçgende çakışmaları',
    8: 'Üçgen eşitsizliği, açı–kenar ilişkisi, eşlik için yeterli bilgi (KKK, KAK, AKA) ve benzerlik oranı',
  },
  outcomes: ['MAT.5.3.7', 'MAT.6.3.4', 'MAT.7.5.1', 'MAT.8.3.1', 'MAT.8.3.2', 'MAT.8.3.3', 'MAT.8.3.4', 'MAT.8.3.6'],
}
