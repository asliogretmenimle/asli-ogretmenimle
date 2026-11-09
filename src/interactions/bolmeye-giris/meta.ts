import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'bolmeye-giris',
  no: 91,
  name: 'Bölmeye Giriş: Paylaştır ve Grupla',
  description: 'Kurabiyeleri tabaklara eşit paylaştır, aynı kurabiyeleri 4’erli poşetlere grupla; hikâyede bir paydaki miktarı mı, grup sayısını mı bulduğunu ayırt et ve gerçek hayat hikâyelerini modelle çöz.',
  emoji: '🍪',
  color: '#2563eb',
  category: 'sayilar',
  grades: [2, 3],
  ready: true,
  launch: 'Annen 12 kurabiye pişirdi. 3 kardeşe eşit paylaştıracak. Bir de aynı 12 kurabiyeyi komşulara 4’erli poşetlerle göndermek istiyor. Bu iki işte aynı soruyu mu soruyoruz?',
  reflect: '“12 kurabiye 3 tabağa” ile “12 kurabiye, her poşete 4” hikâyelerinde neyi biliyorduk, neyi bulduk? Ali 5, Ece 3 top alırsa neden adil olmaz? Paylaştırdığın kurabiyeleri çarpmayla nasıl kontrol edersin?',
  bigIdea: 'Bölmenin iki farklı anlamı vardır ve çocuklar ikisini de gerçek hayattan tanır. Eşit paylaştırmada grup sayısı bellidir (12 kurabiye 3 tabağa), her gruba düşen miktar aranır; çocuklar bunu çoğunlukla birer birer dağıtarak çözer. Gruplamada (ölçme anlamı) bir gruptaki miktar bellidir (her poşete 4), kaç grup olacağı aranır; bu, tekrarlı çıkarmaya (12 → 8 → 4 → 0) dayanır. Adil paylaştırma “hepsini dağıtmak” değil, “herkese aynı sayıda vermek”tir. Bu etkinlikte bölme işareti hiç kullanılmaz: önce anlam kurulur ve “3 tabak, her birinde 4 = 12” cümlesiyle çarpmaya bağlanır. Van de Walle’ın önerdiği gibi, iki anlamı ayırt edebilen ve her hikâyeyi uygun modelle çözebilen çocuk, ileride bölme işaretini ve çarpma-bölme ilişkisini anlamlı biçimde öğrenir.',
  skills: {
    2: 'Gerçek hayat hikâyelerinde eşit paylaştırma ve gruplama yapma; adil olmayan paylaştırmayı fark edip düzeltme; sonucu “… grup, her birinde …” cümlesi ve çarpmayla kontrol etme',
    3: 'Paylaştırma ve gruplama hikâyelerini ayırt edip uygun modelle çözme; gruplamayı tekrarlı çıkarmayla ilişkilendirme; iki anlamı aynı çarpma cümlesine bağlama',
  },
  outcomes: ['MAT.2.2.4', 'MAT.2.2.5', 'MAT.3.2.3', 'MAT.3.2.4', 'MAT.3.2.6'],
}
