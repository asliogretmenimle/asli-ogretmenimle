import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'adil-mi',
  no: 66,
  name: 'Rastgele mi, Adil mi?',
  description: 'Oyun kurallarının adil olup olmadığını tahmin et, deneyle sına, sonuçları listeleyerek kanıtla ve oyunu adil yap.',
  emoji: '🤝',
  color: '#7c3aed',
  category: 'cebir-veri',
  grades: [5, 6, 7, 8],
  ready: true,
  launch: 'Ayşe ile Can iki zar atıyor. Toplam 2–6 ise Ayşe, 7–12 ise Can bir puan alıyor. İkisinin de altışar sayısı var. Sence bu oyun adil mi? Nasıl emin olabiliriz?',
  reflect: 'Bir oyunun adil olup olmadığına yalnızca 20 tur oynayarak karar verebilir misin? Deney ile sonuç listesi (tablo) sana farklı neler söyler?',
  bigIdea: 'Bir oyun, her oyuncunun kazanma olasılığı eşitse adildir. Bunu anlamak için sonuçları değil, eş olasılıklı sonuçları sayarız: iki zarın 11 toplamı değil, 36 sıralı çifti eş olasılıklıdır. Deney güçlü bir ipucudur ama kesin kanıt, tüm sonuçların listesi ya da tablosudur. Haksız bir oyun, sonuçlar yeniden dağıtılarak ya da puanlar dengelenerek birçok farklı biçimde adil yapılabilir.',
  skills: {
    5: 'Çarklarda ve zarda olayların daha olası/daha az olası olduğunu karşılaştırma, dilim büyüklüğüne göre adillik, oyunu adil yapma',
    6: 'Deneyle (gözlemle) kazanma olasılığını kestirme, sonuçları listeleme, adil kurallar tasarlama',
    7: 'Eş olasılıklı sonuçları belirleme (iki para, 6×6 zar tablosu), toplamların eş olasılıklı olmadığını fark etme',
    8: 'Deneysel ve kuramsal olasılığı karşılaştırarak karar verme; sonuçları ya da puanları dengeleyerek oyunu adil yapma',
  },
  outcomes: ['MAT.5.6.1', 'MAT.5.6.2', 'MAT.6.6.1', 'MAT.7.7.2', 'MAT.7.7.1', 'MAT.8.7.1'],
}
