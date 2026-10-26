import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'grafik-hikayeleri',
  no: 61,
  name: 'Grafik Hikâyeleri',
  description: 'Gerçek yaşam senaryolarıyla grafikler arasında ilişki kur.',
  emoji: '📖',
  color: '#7c3aed',
  category: 'cebir-veri',
  grades: [5, 6, 7, 8],
  ready: true,
  launch: 'Ece bisikletle bir tepeye çıktı, sonra öbür yamaçtan inip yoluna devam etti. Biri “Evden uzaklık grafiği de bir tepe gibi olur!” diyor. Sence haklı mı? Bir grafik, bir yolun resmi midir, yoksa bir şeyin zamanla nasıl değiştiğinin hikâyesi mi?',
  reflect: 'Aynı grafik hem Ali’nin yürüyüşünü hem de küvetteki suyu anlatabildi. Bu nasıl mümkün? Grafikteki bir parçanın dik olması her iki hikâyede de ne anlatıyor?',
  bigIdea: 'Bir zaman grafiği, bir niceliğin zamanla nasıl değiştiğini anlatır: yükselen parça artışı, düz parça değişmeyen durumu, inen parça azalmayı gösterir; çizgi ne kadar dikse değişim o kadar hızlıdır. Grafik bir resim değildir; anlamı eksenlerden gelir. Aynı biçim farklı bağlamlarda farklı hikâyeler anlatabilir. Sabit hızla değişen durumlar doğrusal grafik verir; eğim birim zamandaki değişimdir.',
  skills: {
    5: 'Uzaklık–zaman ve su yüksekliği grafiklerini hikâyelerle eşleştirme; artma, sabit kalma, azalma; grafiği hikâyeye uydurma',
    6: 'Çeldiricili eşleştirme (grafiği resim gibi okuma), dikliği hızla ilişkilendirme, aynı grafiğe farklı bağlamlarda hikâye yazma',
    7: 'Sayılı zaman grafikleri: değer okuma, birim zamandaki değişim (dakikada kaç metre), hikâyeden sayısal grafik oluşturma',
    8: 'Doğrusal ilişkiler: y = 50x gibi kuralları grafik ve hikâyeyle eşleştirme, eğim ve başlangıç değeri, parçalı grafikler',
  },
  outcomes: ['MAT.5.5.1', 'MAT.5.5.2', 'MAT.6.5.2', 'MAT.7.1.6', 'MAT.7.6.2', 'MAT.8.2.1', 'MAT.8.2.2', 'MAT.8.2.4'],
}
