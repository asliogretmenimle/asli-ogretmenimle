import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'bolen-merdiveni',
  name: 'Asal Bölen Merdiveni',
  description: 'Sayıyı asal bölenlere bölerek merdivenden 1’e in; her basamak puan, en küçük asal bölenle inmek bonus kazandırır.',
  emoji: '🪜',
  color: '#0ea5e9',
  grades: [8],
  nextGen: true,
  ready: true,
  skills: { 8: 'Asal bölen algoritmasıyla (bölme merdiveni) asal çarpanlara ayırma; iki sayıyı aynı merdivende bölerek EBOB ve EKOK’a köprü kurma' },
  howTo: [
    'Merdivenin tepesindeki sayıyı bölen bir asal sayı seç: sayı bölünür, bölüm bir alt basamağa iner.',
    'Bölmeyen bir asal seçersen bölünebilme kuralını hatırlatan bir soru gelir; can yok.',
    '1’e inince asal çarpanları üslü biçimde yaz.',
    'Son merdivenlerde iki sayıyı birlikte böl: ikisini de bölen basamakları işaretle.',
  ],
  launch: 'Bir madenci 1’e kadar inen bir merdivenin tepesinde duruyor; her basamağın anahtarı bir asal sayı. 120’nin merdiveninden en az hamleyle nasıl inersin?',
  reflect: 'Asal bölenlerle bölmeye hangi sırayla başladığın sonucu değiştirdi mi? Merdivenin sağ sütunundaki sayıların çarpımı neden hep en baştaki sayıya eşit?',
  bigIdea: 'Asal bölen algoritması sayıyı her adımda bir asal sayıya bölerek 1’e indirir; sağ sütundaki bölenlerin çarpımı sayının asal çarpanlarına ayrılmış hâlidir. İki sayı aynı tabloda bölündüğünde ikisini birden bölen asalların çarpımı EBOB’u, bütün bölenlerin çarpımı EKOK’u verir.',
  strategies: ['En küçük asal bölenden başladım', 'Bölünebilme kurallarını kullandım', 'Önce büyük bir asal denedim', 'Ortak bölenleri işaretledim'],
  outcomes: [],
}
