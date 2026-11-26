import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'kup-yapi-gorunumleri',
  no: 101,
  name: 'Küp Yapılar ve Görünümler (3B)',
  description: 'Eş küplerle kurulmuş yapıları gerçek 3B sahnede parmağınla döndür; önden, sağdan ve üstten düz bakışa geç. Görünümleri kareli kâğıda çiz, görünümleri verilen yapıyı küpleri sürükleyerek kur, tek bir küpün hangi görünümü değiştirdiğini keşfet ve aynı görünümlere sahip yapıların en az ve en çok küp sayısını bul.',
  emoji: '🧊',
  color: '#db2777',
  category: 'geometri',
  grades: [7],
  ready: true,
  launch: 'Masanın üstünde eş küplerle kurulmuş bir yapı var. Ali önünde oturuyor, Ece sağında, Can ise yukarıdan bakıyor. Üçü de gördüklerini kareli kâğıda çiziyor. Üç resim aynı mı olur? Resimlere bakarak yapıyı yeniden kurabilir misin?',
  reflect: 'Bir arkadaşın “Önden, sağdan ve üstten görünümlerini bildiğim her yapının kaç küp olduğunu kesin söylerim.” diyor. 3B sahnede bulduğun gizli küpü kullanarak ona nasıl cevap verirsin?',
  bigIdea: 'Bir görünüm, yapıya tek bir yönden dik bakınca görülen karelerin resmidir (dik izdüşüm). Önden görünümde her sütun o sütundaki en yüksek kule kadar, sağdan görünümde her sıra o sıradaki en yüksek kule kadar yüksektir; üstten görünüm yapının yerdeki izidir. Arkada ya da içeride kalan küpler hiçbir görünüme yansımayabilir; bu yüzden üç görünüm bir yapıyı her zaman tek türlü belirlemez ve görünümleri verilen bir yapının en az ve en çok küp sayısı bulunabilir. Öğrencilerin sık yaptığı hatalar: görünümdeki kare sayısını küp sayısı sanmak, önden görünümde arkadaki kuleleri ayrı sütun olarak çizmek, sağdan görünümde ön ile arkayı ters çizmek ve izometrik çizimdeki görünmeyen küpleri yok saymak. Gerçek 3B modelde döndürme, düz bakışa geçme ve görünen yüzleri boyama bu hataları somut olarak düzeltir.',
  skills: { 7: 'Eş küplerle kurulan yapıların önden, sağdan ve üstten görünümlerini 3B modelde inceleyip çizme; görünümleri verilen yapıyı kurma; görünümlerle küp sayısı arasındaki ilişkiyi (gizli küp, en az–en çok) belirleme' },
  outcomes: ['MAT.7.4.1'],
  cardLabel: '3B simülasyon · sürükle ve incele',
  showUnder: ['MAT.7.4.1'],
}
