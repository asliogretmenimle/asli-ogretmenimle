import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'donusum-studyosu',
  no: 52,
  name: 'Geometrik Dönüşüm Stüdyosu',
  description: 'Şekilleri öteleyip yansıtarak dönüşümleri gözlemle.',
  emoji: '🔁',
  color: '#db2777',
  category: 'geometri',
  grades: [5, 6, 7, 8],
  ready: true,
  launch: 'Bir oyun tasarımcısı, karakterini ekranda kaydırıyor ve bir göl kıyısında suya yansıtıyor. Karakterin yeni yerini çizmeden önce tahmin edebilir misin? Peki aynı yere bambaşka bir hareketle de ulaşılabilir mi?',
  reflect: 'Bir şekil ile görüntüsüne bakarak öteleme mi, yansıma mı yapıldığını nasıl anlarsın? Aynı görüntüye iki farklı dönüşümle ulaşılabilmesi için şeklin nasıl olması gerekir?',
  bigIdea: 'Öteleme ve yansıma şeklin boyunu, açılarını ve alanını korur; yalnızca konumunu (yansımada yönünü de) değiştirir. Ötelemede her nokta aynı yöne, aynı miktarda kayar; yansımada nokta ile görüntüsünü birleştiren doğru parçası aynaya diktir ve ayna onu ortadan böler. Koordinat düzleminde bu hareketler (x, y) → (x + a, y + b), (x, −y), (−x, y) gibi kurallarla anlatılır.',
  skills: {
    5: 'Kareli kâğıtta öteleme ve dikey/yatay aynaya göre yansımayı önce tahmin etme; bir şekli hedefe taşıyan hareketin kodunu bulma',
    6: 'Yön ve uzaklık koruyarak öteleme, yarım birimlik aynalarla yansıma; yönü değişen şekli tanıyıp doğru dönüşümü seçme',
    7: 'Çapraz aynalar dahil yansıma; görüntüden aynayı bulma ve aynanın nokta–görüntü doğru parçasının orta dikmesi olduğunu keşfetme',
    8: 'Koordinat düzleminde öteleme ve eksenlere göre yansıma kurallarını örneklerden keşfetme, kuralı yeni noktalara uygulama; döndürme meydan okuması',
  },
  outcomes: ['MAT.4.3.9', 'MAT.7.3.1', 'MAT.7.3.2', 'MAT.8.5.1', 'MAT.8.5.2', 'MAT.8.5.3'],
}
