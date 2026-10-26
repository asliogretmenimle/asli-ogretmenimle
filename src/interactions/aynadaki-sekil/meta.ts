import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'aynadaki-sekil',
  no: 48,
  name: 'Aynadaki Şekil',
  description: 'Şekilleri yansıtarak simetri ilişkilerini keşfet.',
  emoji: '🪞',
  color: '#db2777',
  category: 'geometri',
  grades: [2, 3, 4, 5, 6, 7],
  ready: true,
  launch: 'Sağ elini aynaya tuttuğunda aynadaki çocuk hangi elini kaldırır? Göl kenarındaki bir ağacın sudaki görüntüsü neden baş aşağıdır? Bugün önce aynadaki görüntüyü tahmin edecek, sonra aynayı açıp tahminini test edeceksin.',
  reflect: 'Bir noktanın aynadaki görüntüsünü bulmak için hangi iki şeye dikkat ettin? Bunu aynayı hiç görmemiş bir arkadaşına nasıl anlatırsın?',
  bigIdea: 'Yansımada her nokta ayna doğrusuna dik bir yol üzerinde, aynanın öbür yanına aynı uzaklığa gider; şeklin biçimi ve büyüklüğü korunur ama yönü ters döner. Simetrik bir şekil, simetri doğrusuna göre kendi görüntüsüdür; bir şeklin hiç, bir ya da birden çok simetri doğrusu olabilir. Nokta ile görüntüsünü birleştiren doğru parçasının orta dikmesi ayna doğrusudur.',
  skills: {
    2: 'Yarısı verilen deseni dikey aynaya göre tamamlama, harf ve logolarda simetri doğrusu bulma',
    3: 'Dikey ve yatay aynaya göre tamamlama, birden fazla simetri doğrusu olan şekiller',
    4: 'Aynaya değmeyen desenler, çokgenlerin dikey/yatay aynaya göre görüntüsünü tahmin edip test etme',
    5: 'Görüntünün köşelerini uzaklıkla bulma, şekil ve görüntüsünden ayna doğrusunu bulma',
    6: 'Çapraz aynalarda yansıma, ayna doğrusunu bulma, nokta–görüntü doğru parçasının özellikleri',
    7: 'Çapraz ve şeklin üstünden geçen aynalar; ayna doğrusu = orta dikme',
  },
  outcomes: ['MAT.2.3.7', 'MAT.3.3.6', 'MAT.3.3.7', 'MAT.4.3.8', 'MAT.4.3.9', 'MAT.7.3.1', 'MAT.7.3.2'],
}
