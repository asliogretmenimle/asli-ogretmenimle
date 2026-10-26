import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'butunu-degistir',
  no: 37,
  name: 'Bütünü Değiştir',
  description: 'Aynı kesrin farklı bütünlerde farklı miktar gösterdiğini gör.',
  emoji: '🔄',
  color: '#0d9488',
  category: 'kesirler',
  grades: [3, 4, 5, 6],
  ready: true,
  launch: 'Ali ve Ayşe pizzalarının [[1/2]]’sini yedi. Ayşe “Ben daha çok yedim!” diyor, Ali “Olamaz, ikimiz de yarım yedik!” diyor. İkisi de haklı olabilir mi?',
  reflect: 'Bir arkadaşın “[[1/2]] her zaman [[1/4]]’ten büyüktür” diyor. Ona hangi örneği gösterirsin? Bütün neden önemli?',
  bigIdea: 'Kesir, bir parçanın bütüne göre büyüklüğünü anlatır; tek başına bir miktar değildir. Aynı kesir farklı bütünlerde farklı miktardır ve iki kesri ancak bütünleri aynıyken doğrudan karşılaştırabiliriz. Parçası bilinen bir bütünü bulmak için önce birim kesir bulunur, sonra yinelenir.',
  skills: {
    3: 'Pizza ve çikolatalarda yarım ve çeyrek; aynı kesrin farklı bütünlerde farklı olduğunu paylaştırarak görme',
    4: 'Bir çokluğun kesri kadarını ve kesri verilen çokluğun tamamını eş gruplarla bulma',
    5: 'Uzunluk modelinde parçadan bütüne; büyük kesrin küçük bütünde daha az olabileceğini keşfetme',
    6: 'Kesir, ondalık ve yüzdeyle farklı bütünleri karşılaştırma; ⅓’ü ½’sine eşit iplerde kural bulma',
  },
  outcomes: ['MAT.3.1.9', 'MAT.3.1.10', 'MAT.3.1.11', 'MAT.4.1.6', 'MAT.4.1.10', 'MAT.5.1.3', 'MAT.5.1.4', 'MAT.6.1.5', 'MAT.6.1.7'],
}
