import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'kesir-duvari',
  no: 36,
  name: 'Kesir Duvarı',
  description: 'Kesir bloklarını üst üste koyarak denk kesirleri keşfet.',
  emoji: '🧱',
  color: '#0d9488',
  category: 'kesirler',
  grades: [3, 4, 5, 6],
  ready: true,
  launch: 'Usta bir duvar örüyor ama elinde farklı boylarda tuğlalar var: yarımlar, çeyrekler, sekizde birler… Duvarın bir sırası tam [[1/2]] uzunluğunda olmalı. Hangi tuğlalarla, kaç farklı yolla örebilirsin?',
  reflect: '[[1/2]] ile [[3/6]] aynı uzunlukta. Bir arkadaşına duvardaki sıraları göstererek bunun nedenini açıkla. Daha küçük tuğlalar kullanınca tuğla sayısı neden artıyor?',
  bigIdea: 'Bir kesir, bir uzunluğun bütüne göre ölçüsüdür; aynı uzunluğun birçok adı olabilir (denk kesirler). Parçalar küçüldükçe (payda büyüdükçe) aynı uzunluğu örtmek için daha çok parça gerekir. Farklı büyüklükteki birim kesirler de birlikte aynı uzunluğu oluşturabilir: [[5/6]] = [[1/2]] + [[1/3]].',
  skills: {
    3: 'Bütünü, yarımı ve çeyreği eş parçalarla örtme; birim kesirleri büyüklüğüne göre sıralama',
    4: 'Kesir duvarında denk kesirleri modelle bulma ([[1/2]] = [[2/4]] = [[3/6]]); birim kesirleri karşılaştırma',
    5: 'Aynı uzunluğu farklı ve karışık parçalarla örtme; denklik ve referans noktalarıyla sıralama',
    6: 'Birim kesir toplamları (Mısır kesirleri), en az parçayla örtme; [[2/5]] = [[4/10]] = 0,4 gibi kesir-ondalık bağı',
  },
  outcomes: ['MAT.3.1.9', 'MAT.3.1.10', 'MAT.3.1.11', 'MAT.4.1.7', 'MAT.4.1.8', 'MAT.5.1.3', 'MAT.5.1.4', 'MAT.6.1.5'],
}
