import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'kesir-yanilgilari',
  no: 45,
  name: 'Kesir Yanılgıları',
  description: 'Yanlış kesir karşılaştırmalarını görsel kanıtlarla düzelt.',
  emoji: '🚩',
  color: '#0d9488',
  category: 'kesirler',
  grades: [4, 5, 6, 7],
  ready: true,
  launch: 'Can “[[1/8]], [[1/4]]’ten büyüktür çünkü 8, 4’ten büyük!” diyor. Sınıfta herkes ikiye bölündü. Kim haklı? Bugün tartışmayı kanıtla bitireceğiz: şerit, sayı doğrusu ya da ızgarayla.',
  reflect: 'Bugün incelediğin iddialardan biri için bir arkadaşına iki farklı modelle (ör. şerit ve sayı doğrusu) kanıt göster. Hangi model daha ikna ediciydi, neden?',
  bigIdea: 'Kesir bir bütüne göre bir miktardır: payda büyüdükçe parçalar küçülür, farklı bütünlerin aynı kesri farklı miktardır. Kesirler sayı gibi davranır; paylar ve paydalar ayrı ayrı toplanmaz, denk kesir için çarpılır. Bir iddiayı model kurarak sınarız ve sonucun yanında gerekçeyi de değerlendiririz.',
  skills: {
    4: 'Birim kesirleri karşılaştırma, farklı bütünler, paydaları eşit kesirlerle toplama, 1’den büyük kesirler',
    5: 'Bütüne kalan parça ve yarım referansıyla karşılaştırma, denk kesirler, kesir toplama yanılgısı',
    6: 'Paydaları farklı kesirlerde toplama yanılgısı, ondalık karşılaştırma, kesir–ondalık denkliği, gerekçeyi sınama',
    7: 'Negatif kesirleri sayı doğrusunda karşılaştırma, toplama ve denklik yanılgıları, sonuç ile gerekçeyi ayırt etme',
  },
  outcomes: ['MAT.4.1.6', 'MAT.4.1.7', 'MAT.4.1.8', 'MAT.4.1.11', 'MAT.5.1.4', 'MAT.6.1.5', 'MAT.6.1.7', 'MAT.7.1.3'],
}
