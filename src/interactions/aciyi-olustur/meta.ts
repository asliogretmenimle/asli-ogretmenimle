import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'aciyi-olustur',
  no: 51,
  name: 'Açıyı Oluştur',
  description: 'Hareketli iki ışını döndürerek hedef açıları oluştur.',
  emoji: '📐',
  color: '#db2777',
  category: 'geometri',
  grades: [4, 5, 6, 7],
  ready: true,
  launch: 'Bir robot çeyrek tur sola dönüyor; bir kapı yarım tur açılıyor; makasın ağzı biraz açılıp kapanıyor. Hepsinde bir açı var! Bugün ışınları döndürerek açılar kuracak, önce gözünle tahmin edip sonra ölçeceksin.',
  reflect: 'Bir açıyı ölçmeden önce nasıl tahmin ettin? Hangi referans açı (dik açı, doğru açı…) sana en çok yardım etti?',
  bigIdea: 'Açı, bir ışının başlangıç noktası etrafında ne kadar döndüğünün ölçüsüdür; kolların uzunluğuna bağlı değildir. Dik açı (çeyrek tur) ve doğru açı (yarım tur) güçlü referanslardır: tahmin, ölçme hatalarını (ör. açıölçerin yanlış ölçeğini okumak) yakalamayı sağlar. Kesişen doğrularda ve paralel doğrularla kesende açılar arasındaki ilişkiler, doğrular döndükçe korunur.',
  skills: {
    4: 'Açıyı dönme olarak yorumlama (çeyrek/yarım tur), dik açıya göre dar ve geniş açılar, dilimlerle ölçüp standart birimin gerekliliği',
    5: 'Referans açılarla tahmin edip açıölçerle ölçme, tümler açılar, kesişen doğrularda ters ve komşu açılar',
    6: 'Tahmin ve ölçme, bütünler açılar, ters açılar, paralel iki doğru ve bir kesenle oluşan açılar',
    7: 'Tahmin ve ölçme, açıortayı yansıma ile kurma, tümler/bütünler açılar, paralel doğrular ve kesen',
  },
  outcomes: ['MAT.4.3.5', 'MAT.4.3.6', 'MAT.4.3.7', 'MAT.5.3.3', 'MAT.5.3.4', 'MAT.6.3.1', 'MAT.7.3.2'],
}
