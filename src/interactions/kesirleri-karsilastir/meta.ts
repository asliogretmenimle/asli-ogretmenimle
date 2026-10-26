import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'kesirleri-karsilastir',
  no: 39,
  name: 'Kesirleri Karşılaştır',
  description: 'Ortak payda bulmadan önce görsel modellerle büyüklük karşılaştır.',
  emoji: '⚖️',
  color: '#0d9488',
  category: 'kesirler',
  grades: [3, 4, 5, 6],
  ready: true,
  launch: 'Can “[[1/8]] daha büyük, çünkü 8 sayısı 4’ten büyük!” diyor. Ece ise “[[1/4]] daha büyük!” diyor. Kim haklı? Bugün önce tahmin edeceksin, sonra gerekçeni seçip iki kesri aynı bütün üzerinde kurarak kanıtlayacaksın.',
  reflect: 'Ortak payda bulmadan iki kesri karşılaştırmanın hangi yollarını kullandın? En sevdiğin yolu bir arkadaşına bir örnekle anlat.',
  bigIdea: 'Kesirleri karşılaştırmak için çoğu zaman ortak paydaya gerek yoktur. Paydalar aynıysa parça sayısına, paylar aynıysa parça büyüklüğüne bakılır; [[1/2]] ve 1 gibi referans noktaları ya da 1’e kalan parçanın büyüklüğü karar vermeye yeter. Karşılaştırma ancak bütünler aynıysa anlamlıdır; model bunu görünür kılar.',
  skills: {
    3: 'Birim kesirleri ve paydaları aynı kesirleri (yarım, çeyrek, üçte bir, altıda bir, sekizde bir) şeritte kurarak karşılaştırma',
    4: 'Birim kesirler, paydaları eşit kesirler, paylar aynı kesirler ve modelle denk kesirler; bileşik kesir',
    5: 'Farklı paydalı kesirleri [[1/2]] referansı, 1’e kalan parça ve aynı pay stratejileriyle karşılaştırma; denk kesirler',
    6: 'Kesir, ondalık ve tam sayılı kesirleri referans noktaları, kalan parça ve tam kısımla karşılaştırma',
  },
  outcomes: ['MAT.3.1.10', 'MAT.3.1.11', 'MAT.4.1.7', 'MAT.4.1.8', 'MAT.4.1.9', 'MAT.5.1.3', 'MAT.5.1.4', 'MAT.6.1.5', 'MAT.6.1.7'],
}
