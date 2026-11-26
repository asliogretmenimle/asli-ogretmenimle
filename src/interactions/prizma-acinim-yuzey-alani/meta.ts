import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'prizma-acinim-yuzey-alani',
  no: 102,
  name: 'Prizmanın Açınımı ve Yüzey Alanı (3B)',
  description: 'Dikdörtgenler prizmasını gerçek 3B sahnede kaydırıcıyla aç ve katla. Aynı kutunun farklı açınımlarını dene, bir açınımın kutu olup olmayacağını tahmin edip katlayarak gör. Açınımdaki dikdörtgenlerin alanlarından yüzey alanını hesapla; hediye kutusu, üstü açık akvaryum ve zar problemlerini çöz, aynı hacimdeki kutulardan en az kartonla yapılanı bul.',
  emoji: '📦',
  color: '#db2777',
  category: 'geometri',
  grades: [7],
  ready: true,
  launch: 'Bir hediye kutusunu dikkatlice açıp masaya seriyorsun. Masada kaç dikdörtgen var? Kutuyu kaplamak için ne kadar kâğıt gerektiğini bu açınıma bakarak bulabilir misin? Aynı kutu başka biçimde de açılabilir mi?',
  reflect: 'Bir arkadaşın “İki kutunun hacmi aynıysa onları yapmak için aynı miktarda karton gerekir.” diyor. 3B sahnede denediğin kutuları kullanarak ona nasıl cevap verirsin?',
  bigIdea: 'Dikdörtgenler prizmasının yüzey açınımı 6 dikdörtgenden oluşur; karşılıklı yüzler eş olduğundan 3 çift eş dikdörtgen vardır. Bir prizmanın birçok farklı açınımı vardır, ama hepsi katlanınca aynı kutuyu oluşturur ve alanları eşittir: yüzey alanı açınımın alanıdır. Bu yüzden Yüzey alanı = 2 × (a·b + a·c + b·c) bağıntısı ezberlenmeden, açınımdaki dikdörtgenlerin alanlarından ortaya çıkar. Altı dikdörtgeni olan her şekil açınım değildir: katlanınca yüzler üst üste biniyorsa ya da boş yer kalıyorsa kutu kapanmaz. Öğrencilerin sık yaptığı hatalar: yüzey alanını hacimle (a·b·c) karıştırmak, karşılıklı yüzleri bir kez sayıp sonucu 2 ile çarpmayı unutmak, kapaksız kutuda 6 yüzü de saymak ve hacmi eşit prizmaların yüzey alanlarının da eşit olduğunu sanmak.',
  skills: { 7: 'Dikdörtgenler prizmasının farklı yüzey açınımlarını 3B modelde katlayarak inceleme; açınım ile yüzey alanı arasındaki ilişkiyi ifade etme; açınımdan yararlanarak yüzey alanını hesaplama ve günlük hayat problemlerinde kullanma' },
  outcomes: ['MAT.7.4.2', 'MAT.7.4.6'],
  cardLabel: '3B simülasyon · sürükle ve incele',
  showUnder: ['MAT.7.4.2'],
}
