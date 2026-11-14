import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'butunu-onda-birlere-kir',
  no: 99,
  name: 'Bütünü Onda Birlere Kır',
  description: 'Bir bütün çikolatayı 10 eşit parçaya böl ve say: 1 bütün = 10 onda bir! Adım adım mini dersi izle, çikolataları bölüp parçaları say, bütünler yetmeyince bölerek paylaştır ve teraziyle çikolatanın azalmadığını gör.',
  emoji: '🔨',
  color: '#0d9488',
  category: 'kesirler',
  grades: [6],
  ready: true,
  launch: '2 çikolatayı 5 arkadaş eşit paylaşacak. Kimseye bütün bir çikolata düşmüyor. Ne yapabiliriz? Çikolatayı parçalara bölersek çikolata azalır mı?',
  reflect: 'Bir bütün çikolatayı neden tam 10 parçaya böldük? 2 çikolata 5 kişiye paylaştırılırken bölmek neden işe yaradı? “Bölünce çikolata azalır” diyen bir arkadaşına teraziyle ne gösterirsin?',
  bigIdea: 'Ondalık gösterim de onluk taban sistemidir: 1 bütün = 10 onda bir = 100 yüzde bir, tıpkı 1 onluk = 10 birlik olması gibi. Bölme işleminde bütünler herkese yetmediğinde kalan bütünler 10 eş parçaya (onda birlere) bozulur; parça sayısı 10 katına çıkar, toplam miktar değişmez. Bu “bozma” doğal sayılarda onluk bozmanın ondalık basamaklara uzanmış hâlidir ve a ÷ b bölmesinin a/b kesrine eşit bir ondalık gösterim vermesini sağlar (2 ÷ 5 = 20 onda bir ÷ 5 = 4 onda bir = 0,4). Öğrencilerin sık yanılgıları: bir bütünün kaç parçaya bölündüğünü önemsememek (“yarıya böldüm, 0,5 değil 0,2 oldu”), bozunca miktarın azaldığını düşünmek ve onda bir ile yüzde biri karıştırmaktır. Kırıcı, onluk bloklar ve terazi bu ilişkiyi elle tutulur hâle getirir.',
  skills: { 6: 'Bir bütünü 10 onda bire bozma ve sayma; bozmanın miktarı değiştirmediğini gerekçelendirme; bütünler yetmeyince bozarak paylaştırma ve sonucu ondalık gösterimle yazma' },
  outcomes: ['MAT.6.1.6', 'MAT.6.1.5'],
  showUnder: ['MAT.6.1.6'],
}
