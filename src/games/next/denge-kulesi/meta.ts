import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'denge-kulesi',
  name: 'Denge Kulesi',
  description: 'Hareketli terazide blok ekle, çıkar, yer değiştir; dengeyi kur ve eşitliğin canlı yazıldığını gör.',
  emoji: '⚖️',
  color: '#7c3aed',
  grades: [1, 2, 3, 4],
  nextGen: true,
  skills: {
    1: 'Eşittir işareti denge demek: küplerle ve sayı bloklarıyla 5 + 3 = ? + 2, doğru/yanlış eşitlikler',
    2: 'Onluk-birlik bloklarıyla eksik toplanan, iki tarafa aynı sayıyı ekleme, telafi (47 + 26 = 50 + ?)',
    3: 'Çarpma çuvallarıyla eşitlik: 4 × 6 = 3 × ?, 3 × 8 = 3 × 5 + 3 × ?, yarılama-ikiye katlama',
    4: 'Gizemli kutular: iki kefeden aynı miktarı çıkararak bilinmeyeni bulma (3 × □ + 2 = 14)',
  },
  howTo: [
    'Hangi kefenin ağır bastığına bak: terazi gerçek bir terazi gibi eğilir.',
    'Blok kutusundan kefeye blok sürükle (ya da bloğu seçip kefeye dokun). Kefedeki bloğa dokunursan çıkar, sürüklersen öbür kefeye geçer.',
    'Altta eşitlik canlı yazılır: dengede olunca “=” yeşil yanar. “Dengeyi kaydet”e bas.',
    'Aynı teraziyi başka bir yolla da dengele: eklemek yerine çıkarmayı, iki kefeyi birden değiştirmeyi dene!',
  ],
  launch: 'Kulenin tepesindeki terazi eğilmiş! Bir kefede 5 ve 3, öbüründe 2 var. Teraziyi dengelemek için ne koymalıyız? Peki, blok eklemeden de dengeleyebilir miyiz?',
  reflect: '“8 + 4 = ? + 5” sorusuna bir arkadaşın 12 yazdı. Terazi ona ne söylerdi? Eşittir işaretinin ne anlama geldiğini arkadaşına nasıl anlatırsın?',
  bigIdea: 'Eşittir işareti “cevabı yaz” değil, “iki taraf aynı miktar” demektir (ilişkisel eşitlik). Bir eşitliğin iki yanına aynı işlem uygulanınca eşitlik korunur; bu fikir 4. sınıfta bilinmeyeni bulmanın (cebirsel düşünmenin) temelidir. Bir terazi farklı yollarla dengelenebilir: hafif tarafa eklemek, ağır taraftan çıkarmak ya da iki tarafı birlikte değiştirmek.',
  strategies: [
    'Hafif tarafa ekleme',
    'Ağır taraftan çıkarma',
    'İki kefeye aynı miktar ekleme',
    'İki kefeden aynı miktar çıkarma',
    'İki kefeye ekleme (farkı koruma)',
    'Blokları kefeler arasında taşıma',
    'Telafi (bir sayıyı büyütüp öbürünü küçültme)',
    'Yarılama ve ikiye katlama',
    'İki kefeye aynı işlemi uygulama (eşitliği koruma)',
  ],
  outcomes: ['MAT.1.2.3', 'MAT.1.2.4', 'MAT.2.2.3', 'MAT.2.2.6', 'MAT.3.2.4', 'MAT.3.2.8', 'MAT.4.2.6', 'MAT.4.2.9'],
}
