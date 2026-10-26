import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'veri-toplama',
  no: 63,
  name: 'Veri Toplama Stüdyosu',
  description: 'Soru sor, sınıftan veri topla, düzenle, uygun grafikle göster ve veriye dayalı sonuç çıkar.',
  emoji: '🗳️',
  color: '#7c3aed',
  category: 'cebir-veri',
  grades: [1, 2, 3, 4, 5, 6, 7, 8],
  ready: true,
  launch: 'Sınıf başkanı yıl sonu gezisi için bir karar vermek istiyor ama herkesin ne düşündüğünü bilmiyor. Tahmin mi edelim, yoksa soralım mı? Bugün gerçek bir araştırmacı gibi soru soracak, veri toplayacak ve veriyle karar vereceğiz.',
  reflect: 'Araştırmanda hangi soruyu sordun ve neden iyi bir soruydu? Vardığın sonuç kimler için geçerli, kimler için geçerli olmayabilir? Bir arkadaşına anlat.',
  bigIdea: 'İstatistik bir araştırma döngüsüdür: soru sor → veri topla → düzenle ve göster → yorumla. İyi bir istatistiksel soru farklı cevaplar (değişkenlik) bekler ve veriyle cevaplanabilir. Verinin türü gösterimi belirler: kategorik veri için nesne, resim ve sütun grafikleri; sayısal veri için nokta grafiği; sürekli veri için eşit aralıklı histogram. Sonuçlar yalnızca örneklemin temsil ettiği gruba genellenebilir.',
  skills: {
    1: 'Soru sorup sınıftan kategorik veri toplama, nesnelerle kaydetme ve sayma, nesne grafiği, en çok/en az',
    2: 'İyi soru seçme, çeteleyle veri toplama, sıklık tablosu ve resim grafiği (1 simge = 1), karşılaştırma',
    3: 'Yönlendirici soruyu fark etme, çetele ve sıklık tablosu, anahtarlı resim grafiği (1 simge = 2) ya da sütun grafiği',
    4: 'Veri toplama ve sıklık tablosu, 2’şer ölçekli sütun grafiği, veriye dayalı karar verme',
    5: 'Araştırma sorusu tasarlama, kategorik veriyle sütun grafiği, başkalarının yorumlarını tartışma (aşırı genelleme)',
    6: 'Sayılarak elde edilen nicel veri, nokta grafiği; tepe değer, ortanca, ortalama, açıklık',
    7: 'Temsilî örneklem, sürekli veriyi eşit aralıklarla gruplama (farklı geçerli genişlikler), histogram',
    8: 'Okulu temsil eden örneklem seçimi, sürekli veriyle histogram, veriye dayalı ve dayanmayan sonuçları ayırt etme',
  },
  outcomes: ['MAT.1.4.1', 'MAT.2.4.1', 'MAT.3.4.1', 'MAT.4.4.2', 'MAT.5.5.1', 'MAT.5.5.2', 'MAT.6.5.1', 'MAT.7.6.1', 'MAT.8.6.1'],
}
