import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'carpan-kutulari',
  no: 78,
  name: 'Çarpan Kutuları',
  description: 'Her sayının çarpanları için ayrılmış kare kutuları doldur; kutuların çiftler hâlinde dizilişinden çarpanlarla ilgili gizli kuralları keşfet.',
  emoji: '🔲',
  color: '#2563eb',
  category: 'sayilar',
  grades: [8],
  ready: true,
  launch: '36’nın çarpanları için tam 9 kutu ayrılmış, 48’inki için 10 kutu. Kutular ikişer ikişer eşleşiyor ama 36’da bir kutu ortada tek başına kalıyor. Neden olabilir?',
  reflect: 'Hangi sayıların çarpan kutularından biri ortada yalnız kalır? Asal sayıların neden yalnızca iki kutusu var? Kendi örneğinle açıkla.',
  bigIdea: 'Bir sayının çarpanları çarpımı o sayıyı veren çiftler hâlinde bulunur; tam karelerde ortadaki çarpan kendisiyle eşleştiği için çarpan sayısı tektir. Asal sayıların yalnızca iki çarpanı (1 ve kendisi) vardır. Asal çarpanların üslerinden çarpan sayısı da tahmin edilebilir.',
  skills: { 8: 'Pozitif tam sayı çarpanlarını çiftler hâlinde bulma; tam kare ve asal sayıların çarpan sayısı; çarpan sayısını tahmin etme' },
  outcomes: [],
}
