import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'tahmin-test-acikla',
  no: 73,
  name: 'Tahmin Et, Test Et, Açıkla',
  description: 'Önce tahmin et, sonra modelle dene, sonucunu açıkla.',
  emoji: '🧪',
  color: '#ea580c',
  category: 'muhakeme',
  grades: [1, 2, 3, 4, 5, 6, 7, 8],
  ready: true,
  launch: 'Bilim insanları önce bir tahminde bulunur, sonra deneyle test eder. Tahmin tutmazsa? İşte o zaman en ilginç soru başlar: “Neden?” Bugün sen de bir matematik bilim insanısın.',
  reflect: 'Hangi deneyin sonucu seni en çok şaşırttı? Tahmininle sonuç arasındaki farkın nedenini bir arkadaşına nasıl açıklarsın?',
  bigIdea: 'Tahmin et – test et – açıkla döngüsü öğrencinin sezgisini görünür kılar. Tahminin tutmaması bir hata değil, öğrenme fırsatıdır: öğrenci sonucu modelle gözler, sonra nedenini matematiksel bir cümleyle açıklar. Değerlendirilen, tahminin doğruluğu değil açıklamanın niteliğidir.',
  skills: {
    1: 'Fasulye sayısını tahmin edip 10’luk çerçeveyle sayma; ataşla ölçme; birim büyüyünce sayı ne olur?',
    2: '50’ye kadar tahmin, onluk gruplama, referans kavanoz; uzun birim–kısa birim ilişkisi; eşit paylaşma',
    3: 'Referansla 100’e kadar tahmin; tek ve çift sayıların toplamları üzerine tümevarımsal akıl yürütme',
    4: 'Kenarlar 2 katına çıkınca alan ve çevre; hangi çark daha olası; kibrit örüntüsünde kural',
    5: 'Bir kenar / iki kenar 2 katı olunca alan; çevre–alan farkı; örüntünün 10. adımı; az ya da çok olası',
    6: 'Deneysel olasılık (40 çevirmede kaç kırmızı?); uç değer ve ortalama; çevre ÷ çap = π; ölçek 3 → alan 9',
    7: 'Ayrıt 2 katı → hacim 8 katı; ortalama ve ortanca; eş olasılık; 5n + 1 örüntüsü',
    8: 'İki zarın toplamı (deneysel ve teorik); silindirde yarıçap ve hacim; doğrusal örüntü ve grafiği; k³ kuralı',
  },
  outcomes: ['MAT.1.1.7', 'MAT.1.1.8', 'MAT.2.1.6', 'MAT.2.1.10', 'MAT.3.1.6', 'MAT.3.1.8', 'MAT.4.3.4', 'MAT.4.4.1', 'MAT.4.1.5', 'MAT.5.4.3', 'MAT.5.2.3', 'MAT.5.6.2', 'MAT.6.6.1', 'MAT.6.5.1', 'MAT.6.4.4', 'MAT.6.2.2', 'MAT.7.4.4', 'MAT.7.6.1', 'MAT.7.7.2', 'MAT.7.2.1', 'MAT.8.7.1', 'MAT.8.4.3', 'MAT.8.2.2', 'MAT.8.6.1'],
}
