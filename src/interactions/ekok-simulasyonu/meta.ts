import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'ekok-simulasyonu',
  no: 83,
  name: 'EKOK Problem Simülasyonu',
  description: 'Otobüsler ne zaman yine birlikte kalkar, dişliler ne zaman başa döner, fayanslardan en küçük kare nasıl olur? Tahmin et, simülasyonu çalıştır, EKOK’u keşfet.',
  emoji: '🚌',
  color: '#2563eb',
  category: 'sayilar',
  grades: [8],
  ready: true,
  launch: 'Bir duraktan A otobüsü 12 dakikada bir, B otobüsü 18 dakikada bir kalkıyor. İkisi saat 08.00’de birlikte kalktı. Bir sonraki birlikte kalkış saat kaçta? Önce tahmin et, sonra saati çalıştır.',
  reflect: 'Hangi problemlerde EKOK aradığını nasıl anladın? “İlk kez yeniden”, “en az”, “birlikte” gibi ipuçlarının simülasyondaki karşılığı neydi?',
  bigIdea: 'Tekrar eden olayların ilk kez yeniden birlikte gerçekleştiği an, sürelerin ortak katlarının en küçüğüdür (EKOK). Küçük parçalarla en küçük bütünü (kare, ortak uzunluk) oluşturma problemleri de EKOK problemleridir; bütün ortak katlar EKOK’un katlarıdır.',
  skills: { 8: 'EKOK gerektiren gerçek yaşam problemleri: birlikte kalkış, dişliler, fayanslarla en küçük kare, kalanlı gruplama' },
  outcomes: [],
}
