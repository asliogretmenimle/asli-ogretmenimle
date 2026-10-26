import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'grafik-ciz-anlat',
  no: 62,
  name: 'Grafik Çiz ve Anlat',
  description: 'Verilen bir durumu grafikle modelle ve yorumla.',
  emoji: '✍️',
  color: '#7c3aed',
  category: 'cebir-veri',
  grades: [5, 6, 7, 8],
  ready: true,
  launch: 'Boş bir havuza hortumla su doluyor; bir ara hortum kapatılıyor, sonra iki hortumla doldurmaya devam ediliyor. Havuzdaki suyun zamanla değişimini hiç sayı kullanmadan bir çizgiyle anlatabilir misin? Arkadaşın senin çizgine bakınca hikâyeyi anlayabilir mi?',
  reflect: 'Arkadaşının çizdiği grafik seninkinden farklıydı ama ikisi de hikâyeye uyuyordu. Bu nasıl olabilir? Bir grafiğin hikâyeye uyup uymadığına karar verirken nelere bakıyorsun?',
  bigIdea: 'Bir durumu grafikle modellemek, değişimi düşünmektir: nereden başlıyor, artıyor mu, sabit mi kalıyor, azalıyor mu ve ne kadar hızlı? Dik parça hızlı, yatık parça yavaş, düz parça değişmeyen bir durumu gösterir; zaman geriye gitmediği için dikey çizgi olmaz. Sabit hızla değişen durumlar doğrusal, hızı değişen durumlar (soğuyan çay) eğri grafikler verir. Aynı hikâyeye uyan birden çok grafik olabilir.',
  skills: {
    5: 'Havuz, bisiklet turu, küvet ve çay gibi durumların nitel grafiğini çizme; artma–sabit kalma–azalma; arkadaş çizimlerini değerlendirme',
    6: 'Nitel grafiklerde diklik ve hız, düz parçaların anlamı, aynı başlangıç ve bitişe giden farklı grafikler',
    7: 'Sayısal verilerle grafik çizme, grafikten birim zamandaki değişimi (dakikada kaç litre) hesaplama, doğrusal ve eğri değişim',
    8: 'Durumları doğrusal fonksiyonla ilişkilendirme (y = 20x), eğim ve başlangıç değeri, doğrusal olmayan değişimi ayırt etme',
  },
  outcomes: ['MAT.5.5.1', 'MAT.5.5.2', 'MAT.6.5.1', 'MAT.6.5.2', 'MAT.7.1.6', 'MAT.7.6.1', 'MAT.8.2.1', 'MAT.8.2.2', 'MAT.8.2.4'],
}
