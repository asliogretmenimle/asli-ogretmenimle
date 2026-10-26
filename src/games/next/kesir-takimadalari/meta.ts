import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'kesir-takimadalari',
  name: 'Kesir Takımadaları',
  description: 'Kesir adaları arasında köprü aç; aynı noktaya varan denk kesirleri keşfet.',
  emoji: '⛵',
  color: '#0d9488',
  grades: [4, 5, 6],
  nextGen: true,
  skills: {
    4: 'Birim kesirler, paydaları eşit kesirleri karşılaştırma, modelle denk kesirler, bir çokluğun kesri; 0 – ½ – 1 referansları',
    5: 'Farklı paydalı kesirleri referans noktası ve eksik parçayla karşılaştırma; 1’den büyük bileşik ve tam sayılı kesirler; denklik',
    6: 'Kesir ve ondalıklar aynı sayı doğrusunda (0,25 = ¼), karışık sıralama, iki sayı arasında sayı bulma (yoğunluk)',
  },
  howTo: [
    'Tekneyi kesrin bulunduğunu düşündüğün yere sürükle ve çapa atarak tahminini işaretle.',
    'Rotayı eş parçalara böl; iki parmakla yakınlaştırınca parçalar yeniden bölünür.',
    'Tekneyi tam limana götür, adaları sırala ya da köprüyü daha uzaktaki adaya kur.',
    'Aynı limana farklı adlarla var: her yeni kesir adı bir keşif!',
  ],
  launch: 'Fenerden yola çıkan bir tekne, kesirlerle işaretlenmiş adalara gidiyor. Ama haritada yalnızca 0 ve 1 yazıyor! [[3/4]] yol uzaktaki adayı nasıl bulursun? Peki [[2/4]] ile [[1/2]] aynı limana çıkar mı?',
  reflect: 'Farklı kesirler nasıl olur da sayı doğrusunda aynı noktaya düşer? Bir arkadaşına şerit ya da rota çizerek açıkla.',
  bigIdea: 'Kesir bir sayıdır ve sayı doğrusunda tek bir noktası vardır. Bütünü daha küçük eş parçalara bölmek noktayı değiştirmez, yalnızca adını değiştirir (denklik). Kesirler, parça büyüklüğü ve 0 – ½ – 1 gibi referans noktalarıyla karşılaştırılır; iki kesir arasında her zaman başka bir kesir vardır.',
  strategies: [
    'Referans noktasıyla tahmin',
    'Paydaya göre bölme',
    'Denk kesirle yerleştirme',
    'Yakınlaştırarak parçaları bölme',
    'Denk kesirleri modelle bulma',
    'Yarımla karşılaştırdım',
    '1’e kalan parçaya baktım',
    'Kesri ondalığa çevirdim',
    'Gruplara ayırma',
  ],
  outcomes: ['MAT.4.1.6', 'MAT.4.1.7', 'MAT.4.1.8', 'MAT.4.1.9', 'MAT.4.1.10', 'MAT.5.1.3', 'MAT.5.1.4', 'MAT.6.1.5', 'MAT.6.1.7'],
}
