import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'basamak-laboratuvari',
  no: 31,
  name: 'Basamak Laboratuvarı',
  description: 'Rakamların yerini değiştir, sayının değerindeki değişimi gözle.',
  emoji: '🔬',
  color: '#2563eb',
  category: 'sayilar',
  grades: [1, 2, 3, 4, 5],
  ready: true,
  launch: 'Elinde yalnızca iki kart var: 3 ve 7. Bu iki kartla 37 de yazabilirsin, 73 de. Kartlar aynı, peki sayılar neden bu kadar farklı? Laboratuvarda kartların yerini değiştirip neler olduğunu gözlemleyelim.',
  reflect: 'Bir rakamın yeri değişince değeri neden değişir? 9’un katı olan farkları bir arkadaşına bloklarla ya da örneklerle açıkla.',
  bigIdea: 'Bir rakamın değeri bulunduğu basamağa bağlıdır; her basamak sağındakinin 10 katıdır (sağdakinin değeri 10’da 1’i). Bu yüzden rakamlar yer değiştirince değer çarpıcı biçimde değişir ve iki rakam yer değişince fark hep 9’un katıdır: onlardan birlere geçen her birim 10 yerine 1 sayılır.',
  skills: {
    1: 'Onluk ve birlikleri kartlarla göstermek; 0’ın yerini keşfetmek',
    2: 'İki basamaklı sayılarda rakamların yeri ve basamak değeri',
    3: 'Üç basamaklı sayılar; sola geçen rakam 10 katı olur; farklarda 9 örüntüsü',
    4: 'Altı basamağa kadar sayılar; basamaklar arası 10 kat ilişkisi; farkı tahmin etme',
    5: 'Ondalık basamaklar: sağa geçen rakam 10’da 1’i olur; örüntünün nedeni',
  },
  outcomes: ['MAT.1.1.1', 'MAT.1.1.2', 'MAT.2.1.2', 'MAT.2.1.3', 'MAT.3.1.2', 'MAT.3.1.3', 'MAT.4.1.2', 'MAT.4.1.3', 'MAT.5.1.1', 'MAT.5.1.3', 'MAT.5.2.3'],
}
