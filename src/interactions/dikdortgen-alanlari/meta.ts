import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'dikdortgen-alanlari',
  no: 79,
  name: 'Aynı Alan, Farklı Dikdörtgen',
  description: 'Alanı verilen birim karelerle kenar uzunlukları farklı bütün dikdörtgenleri kur; her dikdörtgenin kenarları sayının bir çarpan çiftini gösterir.',
  emoji: '🟫',
  color: '#2563eb',
  category: 'sayilar',
  grades: [8],
  ready: true,
  launch: '24 tane kare fayansla dikdörtgen biçiminde bir zemin döşeyeceksin; fayans kesmek yok. Kaç farklı dikdörtgen kurabilirsin? Peki 17 fayansla?',
  reflect: 'Kurduğun dikdörtgenlerin kenar uzunlukları sayının çarpanlarıyla nasıl ilişkili? Bütün dikdörtgenleri bulduğundan nasıl emin oldun?',
  bigIdea: 'Alanı n birim kare olan, kenarları tam sayı bir dikdörtgenin kenar uzunlukları n’nin bir çarpan çiftidir. Bütün dikdörtgenler bütün çarpan çiftlerini verir; asal sayılar yalnızca 1 × n şeridiyle, tam kareler ayrıca bir kareyle kurulabilir.',
  skills: { 8: 'Pozitif tam sayının çarpanlarını alan modeliyle bulma; çarpan çiftleri, asal ve tam kare sayılar; en kısa çevreli dikdörtgen' },
  outcomes: [],
}
