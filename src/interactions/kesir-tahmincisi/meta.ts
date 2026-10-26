import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'kesir-tahmincisi',
  no: 38,
  name: 'Kesir Tahmincisi',
  description: 'Kesirlerin sayı doğrusundaki yaklaşık yerlerini tahmin et.',
  emoji: '🎯',
  color: '#0d9488',
  category: 'kesirler',
  grades: [3, 4, 5, 6],
  ready: true,
  launch: 'Bir dart tahtası düşün; ama tahta bir sayı doğrusu ve üzerinde yalnızca 0 ile 1 yazıyor. [[3/4]] nereye düşer? Hesaplamadan, gözünle tahmin edip dartını atabilir misin? Sonra doğruyu eş parçalara bölerek ne kadar yaklaştığını göreceğiz.',
  reflect: 'Tahmin ederken [[1/2]] ya da 1 gibi bir noktayı nasıl kullandın? Bir kesrin [[1/2]]’den büyük olduğunu, doğruyu bölmeden nasıl anlarsın?',
  bigIdea: 'Kesir bir sayıdır ve sayı doğrusunda tek bir noktası vardır. 0, [[1/2]] ve 1 gibi referans noktaları hesaplamadan tahmin yapmayı sağlar; bütünü paydanın söylediği sayıda eş parçaya bölmek tahmini kesinleştirir. Aynı noktanın birçok adı olabilir ([[1/2]] = [[2/4]] = 0,5), ve iki sayı arasında her zaman başka sayılar vardır.',
  skills: {
    3: 'Yarım, çeyrek ve birim kesirleri 0–1 doğrusunda tahmin etme; bütünü eş parçalara bölme',
    4: '0–2 doğrusunda basit, bileşik ve tam sayılı kesirler; 1’i geçen kesirler',
    5: '[[1/2]] ve 1 referanslarıyla tahmin; farklı paydalı kesirler ve 0,7 – 0,25 gibi ondalıklar',
    6: 'Kesir, ondalık ve tam sayılı kesirleri 0–3 doğrusunda yerleştirme; yakınlaştırarak yüzde birler ve binde birler',
  },
  outcomes: ['MAT.3.1.9', 'MAT.3.1.10', 'MAT.3.1.11', 'MAT.4.1.6', 'MAT.4.1.8', 'MAT.5.1.3', 'MAT.5.1.4', 'MAT.6.1.5', 'MAT.6.1.7'],
}
