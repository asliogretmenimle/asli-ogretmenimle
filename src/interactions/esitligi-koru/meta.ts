import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'esitligi-koru',
  no: 59,
  name: 'Eşitliği Koru',
  description: 'Terazinin iki tarafında eşit işlemler yaparak eşitliği koru.',
  emoji: '⚖️',
  color: '#7c3aed',
  category: 'cebir-veri',
  grades: [4, 5, 6, 7, 8],
  ready: true,
  launch: 'Bir terazi dengede duruyor. Sol kefeden 3 ağırlık alırsan ne olur? Peki terazinin yeniden dengeye gelmesi için sağ kefeye ne yapmalısın? Gizemli kutuların ağırlığını bu fikirle bulacağız.',
  reflect: 'Bir arkadaşın kutuyu önce bölerek, sen önce ağırlık çıkararak yalnız bıraktınız. İkiniz de neden aynı sonuca ulaştınız? Teraziyi kullanarak açıkla.',
  bigIdea: 'Eşittir işareti bir sonucu değil, iki tarafın aynı değerde olduğunu (denge ilişkisini) gösterir. İki tarafa aynı işlem uygulandığında denge korunur; bu yüzden bilinmeyen farklı adım sıralarıyla yalnız bırakılabilir ve bulunan değer yerine konunca denge yine sağlanır. Eşitsizlikte iki tarafa aynı sayı eklenip çıkarıldığında ağır basan taraf değişmez.',
  skills: {
    4: 'Eşitliğin anlamı: hesaplamadan karşılaştırma, 8 + 5 = □ + 6 gibi eşitliklerde eksik değer, bozulan dengeyi geri kurma',
    5: 'Eşitliğin korunumu: iki tarafa aynı işlemi (toplama, çıkarma, çarpma, bölme) uygulama; gizemli kutuyu yalnız bırakma',
    6: 'Bilinmeyen nicelikler: terazide x kutularını adım adım yalnız bırakma ve yerine koyarak kontrol',
    7: 'Birinci dereceden denklemler ve eşitsizlik: iki tarafta bilinmeyen, negatif terimler (balonlar), farklı çözüm sıraları',
    8: 'Bağlamdan denklem kurup çözme, çözümü yerine koyarak doğrulama, eşitsizliğin çözüm kümesi',
  },
  outcomes: ['MAT.4.2.9', 'MAT.5.2.1', 'MAT.6.2.1', 'MAT.7.2.2'],
}
