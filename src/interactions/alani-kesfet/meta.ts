import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'alani-kesfet',
  no: 49,
  name: 'Alanı Keşfet',
  description: 'Kareleri birleştirerek aynı alanlı farklı şekiller yap.',
  emoji: '🟦',
  color: '#db2777',
  category: 'geometri',
  grades: [3, 4, 5, 6],
  ready: true,
  launch: 'Elinde 12 kare kâğıt var. Onları yan yana dizerek bir yılan, bir merdiven ya da bir kutu yapabilirsin. Hangisi masada daha çok yer kaplar? Bugün aynı sayıda kareyle farklı şekiller yapacak, kareleri yeniden dizecek ve alanın ne zaman değişip ne zaman değişmediğini keşfedeceksin.',
  reflect: 'Kareleri yeniden dizdiğinde ya da bir parçayı kesip başka yere taşıdığında alan neden değişmedi? Bir arkadaşına bir örnekle anlat.',
  bigIdea: 'Alan, bir yüzeyi boşluksuz ve üst üste binmeden kaplayan birim karelerin sayısıdır. Parçalar yeniden düzenlendiğinde biçim değişir ama alan korunur. Bu korunum, dikdörtgenin alanından (sıra × sütun) paralelkenarın (kes-taşı: taban × yükseklik) ve üçgenin (eşiyle paralelkenar: yarısı) alanına giden yolu açar.',
  skills: {
    3: 'Aynı sayıda birim kareyle farklı şekiller yapma, iki bahçeyi kaplayarak karşılaştırma, kareleri yeniden dizme',
    4: 'Alanı tahmin edip birim karelerle kaplama, aynı alanlı farklı şekiller, 12 birim kareyle bütün dikdörtgenler',
    5: 'Dikdörtgenin alanı sıra × sütun (24 ile dikdörtgenler), yarım karelerle alan, kaplayarak karşılaştırma',
    6: 'Yarım karelerle alan, paralelkenarı kesip taşıyarak dikdörtgene çevirme, aynı taban–yükseklik aynı alan, üçgen = paralelkenarın yarısı',
  },
  outcomes: ['MAT.4.3.4', 'MAT.5.4.2', 'MAT.6.4.1', 'MAT.6.4.2', 'MAT.6.4.3'],
}
