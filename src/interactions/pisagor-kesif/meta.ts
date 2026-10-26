import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'pisagor-kesif',
  no: 57,
  name: 'Pisagor Keşif Alanı',
  description: 'Dik üçgenin kenarlarındaki karelerin alanlarını dinamik olarak karşılaştır.',
  emoji: '📏',
  color: '#db2777',
  category: 'geometri',
  grades: [8],
  ready: true,
  launch: 'Bir dik üçgenin her kenarına kâğıttan bir kare yapıştırdık. En büyük kareyi kesip parçalarsan, iki küçük karenin üstünü tam olarak kaplayabilir misin? Yoksa artar mı, yetmez mi?',
  reflect: 'Bir arkadaşın “Hipotenüs, iki dik kenarın toplamıdır.” diyor. Ona keşfettiğin karelerle ya da bir örnekle nasıl itiraz edersin?',
  bigIdea: 'Pisagor bağıntısı uzunluklar değil alanlar arasındaki bir ilişkidir: dik kenarlar üzerindeki karelerin alanları toplamı hipotenüs üzerindeki karenin alanına eşittir. Yeniden düzenleme kanıtı bunun her dik üçgen için neden doğru olduğunu gösterir. Bağıntının tersi de doğrudur ve açının türünü kenarlardan belirler; koordinat düzleminde iki nokta arasındaki uzaklık da bir dik üçgenin hipotenüsüdür.',
  skills: {
    8: 'Kenarlara kurulan karelerle a² + b² = c² bağıntısını keşfetme, yeniden düzenleme kanıtı, dar/dik/geniş açılı üçgeni kenarlardan tanıma, Pisagor üçlüleri, karekök tahmini ve koordinat düzleminde uzaklık',
  },
  outcomes: ['MAT.8.3.5', 'MAT.8.3.6', 'MAT.8.1.2', 'MAT.8.2.1'],
}
