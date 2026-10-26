import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'karsi-ornek',
  no: 74,
  name: 'Karşı Örnek Avcısı',
  description: 'Yanlış genellemeleri çürüten örnekler oluştur.',
  emoji: '🎯',
  color: '#ea580c',
  category: 'muhakeme',
  grades: [5, 6, 7, 8],
  ready: true,
  launch: 'Ece “Çarpma her zaman sonucu büyütür!” diyor. Mert ise “Ben on örnek denedim, hep büyüttü” diye ekliyor. Peki on örnek yeter mi? Tek bir örnek bu iddiayı yıkabilir mi?',
  reflect: 'Bir iddiayı çürütmek için neden tek bir karşı örnek yeter de, doğru olduğunu göstermek için örnekler yetmez? Kendi bulduğun bir karşı örnekle açıkla.',
  bigIdea: 'Genellemeler “her zaman” der; tek bir karşı örnek onu çürütür. Ama bir genellemenin doğru olduğunu göstermek için örnek biriktirmek yetmez, yapıya dayalı bir gerekçe gerekir. Karşı örnekler ayrıca iddianın hangi koşullarda doğru olduğunu gösterir (0, 1, 0 ile 1 arası sayılar, negatifler, 2 …) ve iddiayı düzeltmeye yol açar.',
  skills: {
    5: 'Çarpma büyütür mü, bölme küçültür mü? Çevre büyükse alan da büyük mü? Payı büyük kesir büyük mü? Tek–çift genellemeleri',
    6: 'Asal sayılar tek mi? Bölünebilme iddiaları; kesir ve ondalıkla çarpma–bölme; 0’ın yarısı',
    7: 'Tam sayılarla çıkarma ve toplama; −a her zaman negatif mi? a × a > a mı? Oranın terimlerine ekleme',
    8: 'a² > a, √a < a, üs büyüdükçe değer büyür mü? Üçgen eşitsizliği; irrasyonel sayıların toplamı; (a + b)²',
  },
  outcomes: ['MAT.5.2.1', 'MAT.5.4.3', 'MAT.5.1.4', 'MAT.6.1.2', 'MAT.6.1.3', 'MAT.6.1.7', 'MAT.7.1.1', 'MAT.7.1.4', 'MAT.7.1.5', 'MAT.7.2.3', 'MAT.8.1.1', 'MAT.8.1.2', 'MAT.8.1.3', 'MAT.8.3.1', 'MAT.8.3.2'],
}
