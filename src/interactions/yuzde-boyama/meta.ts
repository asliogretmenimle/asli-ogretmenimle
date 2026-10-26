import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'yuzde-boyama',
  no: 41,
  name: 'Yüzde Boyama',
  description: '100 karelik tabloda yüzdeleri görselleştir.',
  emoji: '🖌️',
  color: '#0d9488',
  category: 'kesirler',
  grades: [5, 6, 7],
  ready: true,
  launch: 'Bir duvarı 100 eş kareye böldük. Duvarın %30’unu boyamak için kaç kare boyarsın? Peki duvarın tamamı 300 TL’lik bir boya işiyse, bu %30 kaç TL eder?',
  reflect: '“%40, %30’dan her zaman daha çoktur.” Bu cümle her zaman doğru mu? Izgaralarla bir örnek ve bir karşı örnek göster.',
  bigIdea: 'Yüzde, bir bütünün 100 eş parçasından kaçı olduğunu anlatan bir orandır (per-hundred). Aynı miktarın kesir, ondalık ve yüzde adları vardır; yüzde her zaman bir bütüne göredir, bütün değişince aynı yüzde farklı miktar olur.',
  skills: {
    5: '100’lük ızgarada yüzde, kesir ve ondalığı aynı boyalı alanla ilişkilendirme; alan tahmini',
    6: 'Kesir–ondalık–yüzde dönüşümü, bir bütünün yüzdesini bulma, farklı bütünlerin yüzdelerini karşılaştırma',
    7: '1/3, 1/8 gibi kesirlerin yüzdesi, referans yüzdelerle tahmin, farklı bütünlerde yüzde ve miktar',
  },
  outcomes: ['MAT.5.1.3', 'MAT.5.1.4', 'MAT.6.1.5', 'MAT.6.1.7', 'MAT.7.1.2', 'MAT.7.1.4'],
}
