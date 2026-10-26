import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'oran-karistirici',
  no: 42,
  name: 'Oran Karıştırıcısı',
  description: 'Farklı karışımlardaki bileşen oranlarını karşılaştır.',
  emoji: '🧃',
  color: '#0d9488',
  category: 'kesirler',
  grades: [6, 7],
  ready: true,
  launch: 'Ali 2 bardak portakal şurubunu 3 bardak suyla, Elif 4 bardak şurubu 5 bardak suyla karıştırdı. İkisinde de su, şuruptan 1 bardak fazla. Sence iki içeceğin tadı aynı mı?',
  reflect: 'Bir arkadaşın “2 : 3 karışımını büyütmek için ikisine de 4 eklerim: 6 : 7” diyor. Ona sürahi ve bardak paketleriyle neden aynı tadı vermeyeceğini nasıl anlatırsın?',
  bigIdea: 'Oran, iki niceliğin çarpımsal karşılaştırmasıdır. Aynı tadı korumak için iki miktar da aynı sayıyla çarpılır (bileşik birim, “paket”); farkı korumak (toplamsal düşünme) oranı değiştirir. Karışımlar parça/bütün kesriyle ya da birim oranla karşılaştırılır.',
  skills: {
    6: 'Karışımları karşılaştırma, eşdeğer karışımlar kurma, toplamsal ve çarpımsal düşünmeyi ayırt etme',
    7: 'Oranları kesir ve birim oranla karşılaştırma, yarım bardaklı eşdeğer oranlar, eksik miktarı orantıyla bulma',
  },
  outcomes: ['MAT.6.1.7', 'MAT.7.1.5', 'MAT.7.1.6', 'MAT.7.1.7'],
}
