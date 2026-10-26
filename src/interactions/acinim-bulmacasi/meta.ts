import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'acinim-bulmacasi',
  no: 55,
  name: 'Cisim Açınımı Bulmacası',
  description: 'İki boyutlu açınımları katlayarak üç boyutlu cisimlere dönüştür.',
  emoji: '🧊',
  color: '#db2777',
  category: 'geometri',
  grades: [4, 5, 6, 7, 8],
  ready: true,
  launch: 'Bir küp şeklindeki kutuyu makasla kenarlarından kesip düz bir kâğıt gibi açtın. Elinde 6 kareden oluşan bir şekil var. Peki 6 kareyi istediğin gibi yan yana dizersen, her şekil yeniden küp olur mu?',
  reflect: 'İki açınımdan biri küp oluyor, diğeri olmuyor. Katlamadan bunu nasıl anlayabilirsin? Bir arkadaşına “karşılıklı yüzler” fikriyle açıkla.',
  bigIdea: 'Açınım, bir cismin yüzeyinin kenarlarından kesilip düzleme serilmiş hâlidir: yüzlerin sayısı, şekli ve büyüklüğü korunur. Aynı cismin birçok farklı açınımı olabilir (küpün 11), ama 6 karelik her şekil küp açınımı değildir. Açınımı zihinde katlamak uzamsal düşünmeyi geliştirir; yüzey alanı da açınımdaki şekillerin alanları toplamıdır.',
  skills: {
    4: 'Küp ve kutu açınımlarını tahmin edip katlayarak sınama, karşılıklı yüzleri bulma, kendi küp açınımını tasarlama',
    5: 'Küp açınımlarını ayırt etme, karşılıklı yüzler ve zar açınımı (toplam 7), farklı açınımlar tasarlama',
    6: 'Küp ve dikdörtgenler prizması açınımlarını değerlendirme, zar açınımında iki farklı yerleşim, birden çok açınım bulma',
    7: 'Küpün 11 açınımını arama (açık uçlu), dikdörtgenler prizmasının açınımından yüzey alanı',
    8: 'Prizma, piramit, silindir ve koni açınımlarını çözümleme; silindir yan yüzünün uzunluğu = taban çevresi; silindirin yüzey alanı',
  },
  outcomes: ['MAT.4.3.1', 'MAT.7.4.2', 'MAT.7.4.6', 'MAT.8.4.1', 'MAT.8.4.2'],
}
