import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'toplama-cikarma-hikayeleri',
  no: 88,
  name: 'Pullarla Problem Çözme',
  description: 'Kısa, resimli toplama ve çıkarma hikâyelerini iki onluk çerçeve ve iki renkli sayma pullarıyla çöz: gelenleri ekle, gidenleri çıkar, iki sırayı eşleyip farkı bul. Her hareketin çözüm adımları şeridine yazılır ve adımlarını yeniden izleyebilirsin.',
  emoji: '🔴',
  color: '#2563eb',
  category: 'sayilar',
  grades: [1, 2],
  ready: true,
  launch: 'Dalda 8 kuş var. 5 kuş daha geliyor. Kaç kuş olur? Önce tahmin edin. Sonra kırmızı pullarla dalda olanları, sarı pullarla gelenleri onluk çerçeveye koyalım. Çerçeve dolunca ne olur?',
  reflect: '8 + 5’i çözerken önce 2 sarı pulla çerçeveyi doldurmak neden işe yaradı? “Ali’nin 9, Ece’nin 6 bilyesi var” problemini toplama ile mi, çıkarma ile mi çözdün? Pullarla nasıl gösterirsin?',
  bigIdea: 'Toplama ve çıkarma problemleri farklı yapılardadır: birleştirme (gelenler), ayırma (gidenler) ve karşılaştırma (kaç fazla, kaç eksik). Her yapıda bilinmeyen sonuç, değişim ya da başlangıç olabilir; değişim ve başlangıç bilinmeyen problemler çocuklar için daha zordur. Onluk çerçeve 10’un yapısını görünür kılar: 8 + 5’te önce çerçeveyi 2 pulla tamamlamak (8 + 2 + 3 = 10 + 3) zihinden toplamanın temelidir. Karşılaştırmada iki sırayı bire bir eşlemek, farkın eşi olmayan pullar olduğunu gösterir. Çözüm adımları şeridi, çocuğun somut hareketlerini işlem cümlelerine bağlar ve çözümün nasıl yapıldığını konuşmayı kolaylaştırır.',
  skills: {
    1: '20’ye kadar sonucu bilinmeyen birleştirme ve ayırma problemlerini onluk çerçeve ve pullarla modelleme; onluğu tamamlama ve 10’a inme; iki sırayı eşleyerek kaç fazla olduğunu bulma',
    2: 'Değişimi ya da başlangıcı bilinmeyen birleştirme ve ayırma problemleri; karşılaştırmada kaç fazla, kaç eksik ve büyük miktarı bulma; problem yapısına göre işlem seçme ve çözüm adımlarını işlem cümlesine dönüştürme',
  },
  outcomes: ['MAT.1.1.1', 'MAT.1.2.1', 'MAT.1.2.2', 'MAT.1.2.3', 'MAT.1.2.4', 'MAT.2.2.1', 'MAT.2.2.3'],
}
