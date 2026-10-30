import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'gokkusagi-carpanlar',
  name: 'Gökkuşağı Çarpanları',
  description: 'Bir sayının çarpan çiftlerini dıştan içe gökkuşağı yaylarıyla bağla; yaylar ortada buluşunca bütün çarpanları bulmuş olursun.',
  emoji: '🌈',
  color: '#8b5cf6',
  grades: [8],
  nextGen: true,
  ready: true,
  skills: { 8: 'Pozitif tam sayı çarpanlarını gökkuşağı yöntemiyle çiftler hâlinde bulma; nerede durulacağını (√n) ve tam karelerin tek sayıda çarpanı olduğunu keşfetme' },
  howTo: [
    'Sayı şeridinin iki ucunda 1 ve sayının kendisi var: ilk yay hazır.',
    'Sıradaki çarpan adayına dokun; sayıyı bölüyorsa eşi karşı uçta belirir ve yeni bir yay çizilir.',
    'Bölmeyen bir aday seçersen sana neden bölmediğini düşündüren bir soru gelir; can yok.',
    'Yaylar ortada buluşunca “Bitti!” de: daha fazla çarpan olmadığını gerekçelendir, puanını topla.',
  ],
  launch: '36’nın bütün çarpanlarını kaçırmadan nasıl bulursun? 1 ile 36’yı bir yayla bağlayalım, sonra 2 ile 18’i… Yaylar içe doğru küçülürken bir yerde buluşacaklar. Nerede ve neden?',
  reflect: 'Çarpanları ararken neden yalnızca sayının kareköküne kadar denemek yeterli? 36’nın ortasında tek başına kalan çarpan neden var da 48’de yok?',
  bigIdea: 'Çarpanlar çiftler hâlinde gelir: d bir çarpansa n ÷ d de çarpandır. Çiftlerden biri hep √n’den küçük ya da eşit olduğundan √n’ye kadar denemek bütün çarpanları bulur. Tam karelerde √n kendisiyle eşleşir; bu yüzden tam karelerin çarpan sayısı tektir.',
  strategies: ['Çiftlerle düşündüm (d ve n ÷ d)', 'Bölünebilme kurallarını kullandım', 'Karekökte durdum', 'Sırayla tek tek denedim'],
  outcomes: [],
}
