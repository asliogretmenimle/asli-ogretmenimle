import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'indirim-arastirmacisi',
  no: 44,
  name: 'İndirim Araştırmacısı',
  description: 'Fiyat ve indirim senaryolarını karşılaştır.',
  emoji: '🏷️',
  color: '#0d9488',
  category: 'kesirler',
  grades: [6, 7, 8],
  ready: true,
  launch: 'Üç tişört alacaksın, tanesi 400 TL. Bir mağaza “%30 indirim”, biri “3 al 2 öde”, biri de “Her 500 TL’ye 100 TL indirim” diyor. Hangisi gerçekten en ucuz? Hesaplamadan önce bir tahmin yap!',
  reflect: 'Ece “Önce %20, sonra %10 indirim aldım; toplam %30 indirim!” diyor. Ece’ye bant modeli ya da 100’lük ızgarayla neden yanıldığını nasıl gösterirsin?',
  bigIdea: 'Yüzde her zaman bir bütüne göredir. Bant (şerit) modelinde fiyatı eş parçalara bölmek indirimi ve ödenen kısmı görünür kılar. Art arda gelen yüzdelerde ikinci yüzde yeni bütünden alınır; bu yüzden %20 + %10 ≠ %30 ve %20 zam + %20 indirim eski fiyatı vermez. Farklı teklifler aynı sepet üzerinden ödenecek tutara çevrilerek karşılaştırılır.',
  skills: {
    6: 'Bant modeliyle yüzde indirim, ödenecek tutar, art arda indirim yanılgısı ve teklif karşılaştırma',
    7: 'İndirimli fiyattan etiket fiyatını bulma (ters yüzde), art arda indirim, teklifleri gerekçeyle seçme',
    8: 'Zam ve indirimin bileşkesi, art arda yüzdeler, farklı kampanyaları aynı sepette karşılaştırıp karar verme',
  },
  outcomes: ['MAT.6.1.7', 'MAT.7.1.4', 'MAT.7.1.7'],
}
