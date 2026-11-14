import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'butunu-onda-birlere-kir',
  no: 99,
  name: 'Bütünü Onda Birlere Kır',
  description: 'Kırıcıya attığın bir bütün çikolata 10 onda birliğe, bir onda birlik 10 yüzde birliğe dönüşsün! Mini dersi izle, kırıcı laboratuvarında 1 bütün = 10 onda bir olduğunu kendin bul, bütünler yetmeyince kırarak paylaştır ve teraziyle miktarın değişmediğini kanıtla.',
  emoji: '🔨',
  color: '#0d9488',
  category: 'kesirler',
  grades: [6],
  ready: true,
  launch: '2 çikolatayı 5 arkadaş eşit paylaşacak. Kimseye bütün bir çikolata düşmüyor. Çikolataları kırmadan adil paylaştırmanın bir yolu var mı? Peki kırarsak çikolata azalır mı?',
  reflect: 'Bir bütünü kırınca neden tam 10 parça elde ettik, 4 ya da 5 parça değil? 2 bütün 5 kişiye paylaştırılırken kırma neden işe yaradı? “Kırınca çikolata azalır” diyen bir arkadaşına teraziyle ne gösterirsin?',
  bigIdea: 'Ondalık gösterim de onluk taban sistemidir: 1 bütün = 10 onda bir = 100 yüzde bir, tıpkı 1 onluk = 10 birlik olması gibi. Bölme işleminde bütünler herkese yetmediğinde kalan bütünler 10 eş parçaya (onda birlere) bozulur; parça sayısı 10 katına çıkar, toplam miktar değişmez. Bu “bozma” doğal sayılarda onluk bozmanın ondalık basamaklara uzanmış hâlidir ve a ÷ b bölmesinin a/b kesrine eşit bir ondalık gösterim vermesini sağlar (2 ÷ 5 = 20 onda bir ÷ 5 = 4 onda bir = 0,4). Öğrencilerin sık yanılgıları: bir bütünün kaç parçaya bölündüğünü önemsememek (“yarıya böldüm, 0,5 değil 0,2 oldu”), bozunca miktarın azaldığını düşünmek ve onda bir ile yüzde biri karıştırmaktır. Kırıcı, onluk bloklar ve terazi bu ilişkiyi elle tutulur hâle getirir.',
  skills: { 6: 'Bir bütünü 10 onda bire, bir onda biri 10 yüzde bire bozma; bozmanın miktarı değiştirmediğini gerekçelendirme; bütünler yetmeyince bozarak paylaştırma ve sonucu ondalık gösterimle yazma' },
  outcomes: ['MAT.6.1.6', 'MAT.6.1.5'],
  showUnder: ['MAT.6.1.6'],
}
