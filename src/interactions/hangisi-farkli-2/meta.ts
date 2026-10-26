import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'hangisi-farkli-2',
  no: 68,
  name: 'Hangisi Farklı? 2.0',
  description: 'Dört gösterimden her birinin neden farklı olabileceğini gerekçelendir.',
  emoji: '🧠',
  color: '#ea580c',
  category: 'muhakeme',
  grades: [1, 2, 3, 4, 5, 6, 7, 8],
  ready: true,
  launch: 'Öğretmen tahtaya dört kart astı ve “Hangisi farklı?” diye sordu. Elif A dedi, Can C dedi, Zeynep D dedi… ve hepsi haklıydı! Nasıl olabilir? Bu kez her kart için bir gerekçe bulmaya çalışacaksın.',
  reflect: 'Bir kartı farklı yapan özellik ile dört kartta ortak olan bir özellik arasındaki fark nedir? Bulduğun en şaşırtıcı gerekçeyi bir arkadaşına anlat.',
  bigIdea: 'Sınıflandırma, hangi özelliğe bakıldığına bağlıdır: aynı nesne bir özelliğe göre “farklı”, başka bir özelliğe göre “benzer” olabilir. Ayırt edici bir gerekçe yalnızca bir nesne için doğru olmalıdır; bunu göstermek matematiksel gerekçelendirmenin ilk adımıdır.',
  skills: {
    1: 'Şekilleri renk, biçim, sayı ve dizilişe göre karşılaştırma; 20’ye kadar sayıları parçalarıyla düşünme',
    2: 'Basamak değeri, diziler, bütün-yarım-çeyrek, geometrik cisimler ve saatlerde ayırt edici özellik bulma',
    3: 'Tek-çift, birim kesirler, kenar sayısı, çarpma ve bölmede özelliklere göre gerekçelendirme',
    4: 'Denk kesirler, açılar, alan-çevre, simetri doğruları ve büyük sayılarda gerekçeli sınıflama',
    5: 'Kesirleri [[1/2]] ile karşılaştırma, çokgen özellikleri, örüntü kuralları, işlem önceliği, olasılık',
    6: 'Çarpan-kat, asal ve tam kare sayılar, kesir-ondalık-yüzde, cebirsel ifadelerin denkliği, alan bağıntıları',
    7: 'Tam ve rasyonel sayılar, orantı tabloları, denklemlerin yapısı, prizmalar ve olasılık',
    8: 'Rasyonel-irrasyonel sayılar, üslü ifadelerde işaret, doğruların eğimi, üçgen eşitsizliği, dönüşümler',
  },
  outcomes: ['MAT.1.3.5', 'MAT.1.1.2', 'MAT.2.1.2', 'MAT.2.1.7', 'MAT.2.3.1', 'MAT.3.1.5', 'MAT.3.1.10', 'MAT.3.3.2', 'MAT.4.1.7', 'MAT.4.3.7', 'MAT.4.3.8', 'MAT.5.1.4', 'MAT.5.3.6', 'MAT.5.2.3', 'MAT.6.1.1', 'MAT.6.1.3', 'MAT.6.2.3', 'MAT.7.1.3', 'MAT.7.1.6', 'MAT.7.2.2', 'MAT.8.1.3', 'MAT.8.2.3', 'MAT.8.3.2'],
}
