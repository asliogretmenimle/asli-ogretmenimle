import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'ekok-tiyatrosu',
  no: 81,
  name: 'EKOK Tiyatrosu',
  description: 'Sahnede iki sayı katlarıyla dans ediyor! Perde perde izle, seyirci sorularını yanıtla ve EKOK’un kurallarını kural defterine kendin yaz.',
  emoji: '🎭',
  color: '#2563eb',
  category: 'sayilar',
  grades: [8],
  ready: true,
  launch: 'Bu akşamki oyunda 4 ile 6 sahnede adım atıyor: 4 dörder, 6 altışar ilerliyor. İkisi ilk kez hangi sayıda aynı basamağa basacak? Perde açılmadan tahmin et!',
  reflect: 'EBOB × EKOK = iki sayının çarpımı kuralını tiyatrodaki sayıları kullanarak bir arkadaşına nasıl açıklarsın?',
  bigIdea: 'EKOK, iki sayının ortak katlarının en küçüğüdür; bütün ortak katlar EKOK’un katlarıdır. Bir sayı diğerinin katıysa EKOK büyük sayıdır, aralarında asal sayıların EKOK’u çarpımlarıdır ve EKOK hiçbir zaman büyük sayıdan küçük olamaz. İki sayı için EBOB × EKOK = sayıların çarpımıdır.',
  skills: { 8: 'EKOK’un anlamı ve kuralları: ortak katlar, kat ilişkisi, aralarında asal sayılar, EKOK ≥ büyük sayı, EBOB × EKOK = a × b, asal çarpanlarla EKOK' },
  outcomes: [],
}
