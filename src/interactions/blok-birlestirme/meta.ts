import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'blok-birlestirme',
  no: 92,
  name: 'Bloklarla Üç Basamaklı Toplama',
  description: 'Yüzlük, onluk ve birlik bloklarını serbest bir tuvale sürükle: 10 birlik yan yana gelince birleşip onluğa, 10 onluk yan yana gelince yüzlüğe dönüşür. Sayıları kur, birleştir ve eldeli toplamanın nereden geldiğini gör.',
  emoji: '🧱',
  color: '#2563eb',
  category: 'sayilar',
  grades: [3],
  ready: true,
  launch: 'Ali, 158 + 267 işleminin sonucunu 3115 buldu. “Her basamağı ayrı ayrı topladım” diyor. Bu sonuç sana mantıklı geliyor mu? Önce blokların sırrını keşfedelim: 10 birlik küp yan yana gelince ne olur?',
  reflect: 'Toplarken kâğıda yazdığımız küçük “elde 1” aslında nedir? Bloklarla bir arkadaşına göster: 10 birlik nereye gitti, neden onlar basamağına yazıldı?',
  bigIdea: 'Onluk taban sisteminde 10 birlik 1 onluk, 10 onluk 1 yüzlük eder; gruplama ve bozma sayının değerini değiştirmez, yalnızca gösterimini değiştirir. Toplama, iki sayının aynı tür birimlerini bir araya getirmektir. Bir türde 10 ya da daha fazla birim birikince 10 tanesi bir üst birime dönüştürülür: yazılı işlemdeki “elde 1” bu yeni onluk ya da yüzlüktür. Serbest tuvalde bu dönüşümü çocuk kendi eliyle yapar, kâğıttaki işlem her adımda bloklarla birlikte dolar. Sonucu önce tahmin etmek (158 + 267 ≈ 400) basamak hatalarını yakalamanın en hızlı yoludur.',
  skills: {
    3: 'Üç basamaklı sayıları taban bloklarıyla kurma ve çözümleme; eldesiz ve eldeli toplamayı bloklarla modelleme; elde 1’in basamak değerini açıklama; tahminle sonucu kontrol etme',
  },
  outcomes: ['MAT.3.1.2', 'MAT.3.2.2', 'MAT.3.2.1'],
}
