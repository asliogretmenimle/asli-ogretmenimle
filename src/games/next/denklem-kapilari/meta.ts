import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'denklem-kapilari',
  name: 'Denklem Kapıları',
  description: 'Labirentteki kapıları, denklemin iki yanına aynı işlemi uygulayarak aç.',
  emoji: '🚪',
  color: '#4f46e5',
  grades: [6, 7, 8],
  nextGen: true,
  skills: {
    6: 'Bilinmeyen nicelikler: terazi ve cebir karolarıyla tek adımlı denklemler, yerine koyarak deneme, örüntüden cebirsel ifade (kural yazma)',
    7: 'Tam sayı ve rasyonel katsayılı iki adımlı denklemler, iki tarafta bilinmeyen, birden çok çözüm yolu, eşitsizliğin çözüm aralığı',
    8: 'Doğrusal bağlamdan (y = mx + b) denklem kurma, çözümü yerine koyarak kontrol, iki ifadenin ne zaman eşit olduğunu bulma, aralıklar',
  },
  howTo: [
    'Kapının üstündeki denklemi ve önündeki teraziyi incele.',
    'Bir işlem kartını kapıya sürükle (ya da karta, sonra “İki tarafa”ya dokun): işlem iki kefeye de uygulanır.',
    'Kartı tek bir kefeye bırakırsan terazi bozulur; dengeyi yeniden kurmanın yolunu bul.',
    'x yalnız kalınca kapı açılır. Kapıyı kapatıp başka bir yolla açmayı dene!',
  ],
  launch: 'Eski bir tapınağın labirentindesin. Her kapının kilidinde bir terazi var ve kapı yalnızca terazi dengedeyken açılıyor. Terazinin bir kefesinden 6 altın alırsan ne olur? Dengeyi bozmadan bilinmeyen keseyi nasıl yalnız bırakırsın?',
  reflect: '2x + 6 = 14 kapısını bir arkadaşın önce 2’ye bölerek, sen önce 6 çıkararak açtınız. İkiniz de neden aynı sonuca ulaştınız? Terazi üzerinden açıkla.',
  bigIdea: 'Eşittir işareti bir denge ilişkisidir. İki tarafa aynı işlem uygulandığında denge (eşitlik) korunur; bu yüzden bir denklem farklı geçerli adım sıralarıyla çözülebilir. Çözüm, yerine koyarak doğrulanır; eşitsizliğin çözümü tek bir sayı değil bir aralıktır.',
  strategies: [
    'Önce sabit terimi yok etme',
    'Önce bölerek sadeleştirme',
    'Önce kesirlerden kurtulma',
    'Bilinmeyenleri bir tarafta toplama',
    'Yerine koyarak deneme',
    'Terazinin eğiminden yön bulma',
    'Bağlamdaki değeri yerine koyma',
    'Örüntüyü genelleme',
    'Örüntüyü farklı görme',
  ],
  outcomes: ['MAT.6.2.1', 'MAT.6.2.2', 'MAT.6.2.3', 'MAT.7.2.1', 'MAT.7.2.2', 'MAT.8.1.4', 'MAT.8.2.2', 'MAT.8.2.4'],
}
