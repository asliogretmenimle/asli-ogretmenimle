import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'sonsuz-cozum',
  no: 35,
  name: 'Sonsuz Çözüm Atölyesi',
  description: 'Tek bir hedefe ulaşmak için olabildiğince farklı yöntem üret.',
  emoji: '♾️',
  color: '#2563eb',
  category: 'sayilar',
  grades: [3, 4, 5, 6, 7, 8],
  ready: true,
  launch: 'Öğretmen tahtaya yalnızca bir sayı yazdı: 24. “Bu sayıya kaç farklı yoldan ulaşabilirsiniz?” diye sordu. Biri 20 + 4 dedi, biri 4 sıra 6 kare çizdi, biri sayı doğrusunda 3’er 3’er zıpladı. Sen kaç yol bulabilirsin?',
  reflect: 'Bulduğun yollardan hangi ikisi aslında aynı fikri farklı biçimde gösteriyor? Örneğin bir dizilim ile bir çarpma işlemi nasıl ilişkili?',
  bigIdea: 'Bir sayı, birçok ilişkinin buluşma noktasıdır. Aynı niceliği işlemlerle (toplama, çarpma, karma), modellerle (dizilim, onluk bloklar, kesir şeridi, pullar, kare–küp) ve sayı doğrusunda sıçramalarla temsil etmek, temsiller arası geçişi ve esnek sayı duyusunu güçlendirir.',
  skills: {
    3: '24 ve 50’ye toplama, çıkarma, çarpma, dizilim ve onluk bloklarla ulaşma',
    4: '48 ve 100’e dört işlem, dizilim ve bloklarla; karma işlemler',
    5: '[[3/4]] ve 1’i kesir şeridi, yüzlük kare, ondalık yazım ve sıçramalarla gösterme',
    6: '0,75 ve 2,4’ü kesir, ondalık ve işlemlerle farklı biçimlerde yazma',
    7: '−6 ve 0’a tam sayı işlemleri, sayma pulları ve geri sıçramalarla ulaşma',
    8: '64 ve 100’ü üslü, kareköklü ifadeler, kare ve küp modelleriyle yazma',
  },
  outcomes: ['MAT.3.2.1', 'MAT.3.2.8', 'MAT.4.2.6', 'MAT.4.2.9', 'MAT.5.1.3', 'MAT.5.2.2', 'MAT.6.1.5', 'MAT.6.1.7', 'MAT.7.1.1', 'MAT.7.1.4', 'MAT.8.1.1', 'MAT.8.1.2'],
}
