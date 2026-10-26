import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'ondalik-yakinlastirici',
  no: 40,
  name: 'Ondalık Yakınlaştırıcı',
  description: 'Birim kareyi onda birlik ve yüzde birlik bölgelere ayır.',
  emoji: '🔎',
  color: '#0d9488',
  category: 'kesirler',
  grades: [4, 5, 6],
  ready: true,
  launch: 'Elinde sihirli bir mercek var. Bir kareyi büyüttükçe her parçası 10 küçük parçaya ayrılıyor! 3 kalın şerit mi daha çok yer kaplar, 25 minik kare mi? Merceğinle yakından bakıp kendin karar ver.',
  reflect: 'Bir onda bir ile 10 tane yüzde bir neden aynı miktardır? Bir arkadaşına merceği ve birim kareyi kullanarak açıkla. Basamağı (ya da payı) daha çok olan sayı her zaman daha mı büyüktür?',
  bigIdea: 'Ondalık gösterim, onluk taban sisteminin 1’in sağına doğru devamıdır: her basamak bir öncekinin onda biridir. Bir onda bir 10 yüzde bire, bir yüzde bir 10 binde bire ayrılır; bu yüzden 0,3 = 0,30 = [[3/10]] = [[30/100]]. Ondalıklar basamak sayısına göre değil, aynı birimle (ör. yüzde birlerle) ya da önce en büyük basamakla karşılaştırılır. İki ondalık arasında her zaman başka bir ondalık vardır.',
  skills: {
    4: 'Onda birler ve yüzde birler ondalık kesir olarak ([[3/10]], [[25/100]]); [[3/10]] = [[30/100]] denkliği; [[3/10]] ile [[25/100]] karşılaştırma; sayı doğrusunda yer',
    5: 'Onda birlik ve yüzde birlik ondalıkları modelle gösterme, kesir ve yüzdeyle ilişkilendirme; 0,3 ile 0,25 gibi ondalıkları karşılaştırma',
    6: 'Binde birlere kadar ondalıklar: basamak değerini kesirle yorumlama, 0,125 ile 0,13 karşılaştırma, sayı doğrusunda yer ve iki ondalık arasında sayı bulma',
  },
  outcomes: ['MAT.4.1.6', 'MAT.4.1.7', 'MAT.5.1.3', 'MAT.5.1.4', 'MAT.6.1.5', 'MAT.6.1.7'],
}
