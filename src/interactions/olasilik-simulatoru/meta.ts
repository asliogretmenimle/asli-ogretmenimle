import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'olasilik-simulatoru',
  no: 65,
  name: 'Olasılık Simülatörü',
  description: 'Önce tahmin et, sonra binlerce deneme yap: deney kurama yaklaşıyor mu?',
  emoji: '🎲',
  color: '#7c3aed',
  category: 'cebir-veri',
  grades: [5, 6, 7, 8],
  ready: true,
  launch: 'Bir parayı 10 kez attın ve 8 kez yazı geldi. Para hileli mi? Peki 1000 kez atsan ne olurdu? Bugün tahmin edeceğiz, sonra binlerce deneme yaparak tahminimizi sınayacağız.',
  reflect: 'Arkadaşın “10 atışta 7 yazı geldi, demek ki yazı gelme olasılığı [[7/10]]” diyor. Ona ne söylersin? Deneme sayısının neden önemli olduğunu bir örnekle açıkla.',
  bigIdea: 'Olasılık 0 (imkânsız) ile 1 (kesin) arasında bir süreklilikte yer alır. Deneysel olasılık bir kestirimdir: az denemede çok değişir, deneme sayısı arttıkça kuramsal olasılığın çevresinde toplanır (büyük sayılar yasası). Kuram yoksa (raptiye) olasılığı ancak deneyle; tekrarlanamayan olaylarda öznel yargıyla kestiririz.',
  skills: {
    5: 'Olayları imkânsız–kesin doğrusuna yerleştirme, az/çok olası olayları ayırt etme, deneyle sınama, koşula uyan torba tasarlama',
    6: 'Gözleme dayalı (deneysel) olasılık: göreli sıklık, gizli torbayı deneyle kestirme, örneklem büyüklüğü',
    7: 'Olay ve tümleyeni, eş olasılıklı sonuçlar, deney ile kuramın karşılaştırılması',
    8: 'Öznel, deneysel ve kuramsal olasılık yaklaşımlarından uygun olanı seçme; büyük örneklemin önemi',
  },
  outcomes: ['MAT.5.6.1', 'MAT.5.6.2', 'MAT.6.6.1', 'MAT.7.7.1', 'MAT.7.7.2', 'MAT.8.7.1'],
}
