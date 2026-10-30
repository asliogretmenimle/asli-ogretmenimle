import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'ebob-tiyatrosu',
  no: 80,
  name: 'EBOB Tiyatrosu',
  description: 'Sahnede sayılar oynuyor! Perde perde izle, seyirci olarak sorulara katıl ve EBOB’un kurallarını oyunun içinden keşfedip kural defterine yaz.',
  emoji: '🎭',
  color: '#2563eb',
  category: 'sayilar',
  grades: [8],
  ready: true,
  launch: 'Bu akşam sahnede “Ortak Bölenler” oyunu var. 12 ile 18 ortak bir hediye arıyor: ikisini de bölen en büyük sayı. Perde açılmadan tahmin et: hediye hangi sayı olabilir?',
  reflect: 'Kural defterine yazdığın EBOB kurallarından birini seç ve tiyatrodaki sahneyi kullanarak bir arkadaşına neden doğru olduğunu anlat.',
  bigIdea: 'EBOB, iki sayının ortak bölenlerinin en büyüğüdür; bütün ortak bölenler EBOB’un bölenleridir. Sayılardan biri diğerini bölüyorsa EBOB küçük sayıdır, aralarında asal sayıların EBOB’u 1’dir ve EBOB hiçbir zaman küçük sayıdan büyük olamaz. Asal çarpanlardan EBOB, ortak asal çarpanların en küçük üslüleriyle bulunur.',
  skills: { 8: 'EBOB’un anlamı ve kuralları: ortak bölenler, bölen ilişkisi, aralarında asal sayılar, EBOB ≤ küçük sayı, asal çarpanlarla EBOB' },
  outcomes: [],
}
