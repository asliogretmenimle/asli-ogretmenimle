import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'matematik-sehri',
  name: 'Matematik Şehri',
  description: 'Kendi şehrini kur: yol uzunluğu, park çevresi, bina alanı ve bütçe.',
  emoji: '🏙️',
  color: '#2563eb',
  grades: [3, 4, 5],
  nextGen: true,
  skills: {
    3: 'Yol uzunluğunu birim karelerle ölçme, çitle çevre bulma, basit maliyet hesabı',
    4: 'Alanı tahmin edip sayma, aynı alan–farklı çevre, dört işlemle bütçe problemleri',
    5: 'Sıra × sütun ile alan, çevreden kenar bulma, sabit çevrede en büyük alan, çok adımlı bütçe',
  },
  howTo: [
    'Haritada yol çiz, parkı köşelerinden çekerek büyüt ya da küçült; iki parmakla da boyutlandırabilirsin.',
    'Panelde kenarları, çevreyi, alanı ve bütçeyi canlı izle.',
    'Hazır olunca “Kur”a bas. Aynı görevi farklı tasarımlarla çözmeyi dene!',
    'Takılırsan “İpucu”na dokun; harita iki parmakla yakınlaşır.',
  ],
  launch: 'Belediye başkanı sensin! Mahalleye okul yolu, parklar ve bir kütüphane yapılacak. Ama çit, çim ve yol para ister… Aynı büyüklükte iki park, aynı miktarda çit ister mi?',
  reflect: 'Alanları aynı iki park neden farklı uzunlukta çit isteyebilir? Bir arkadaşına çizerek anlat.',
  bigIdea: 'Çevre kenar boyunca birim uzunlukların, alan ise içini kaplayan birim karelerin sayısıdır. Biri sabitken öteki değişebilir; dikdörtgenin alanı sıra × sütun yapısından doğar.',
  strategies: ['Tek dönüşlü (L biçimli) yol', 'Basamaklı (zikzak) yol', 'Tek tek sayma', 'Sıra sıra sayma', 'Kareye yaklaştırma', 'Önce kaç metre çit alabileceğimi buldum', 'Deneyerek büyüttüm, küçülttüm'],
  outcomes: ['MAT.3.3.4', 'MAT.3.2.6', 'MAT.4.3.3', 'MAT.4.3.4', 'MAT.4.2.7', 'MAT.5.4.1', 'MAT.5.4.2', 'MAT.5.4.3', 'MAT.5.4.4'],
}
