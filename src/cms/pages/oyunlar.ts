import { definePage } from './types'

/** /oyunlar: oyun listesi */
export const gamesPage = definePage({
  id: 'oyunlar',
  label: 'Oyunlar',
  path: '/oyunlar',
  desc: 'Oyunlar sayfasının başlığı, tanıtım metni ve süzgeç metinleri',
  emoji: '🎮',
  defaults: {
    title: 'Matematik Oyunları',
    desc: '{n} oyun. Her oyun seçilen sınıfa göre zorlaşır; derste tahtada ya da öğrencinin kendi cihazında oynanır.',
    searchPlaceholder: 'Oyun ara: kesir, çarpma, açı…',
    allLabel: 'Tüm oyunlar',
    kindLabels: ['Keşfet ve inşa et', 'Strateji oyunları'],
    countLabel: '{n} oyun',
    emptyText: 'Bu süzgeçlere uyan bir şey bulamadık.',
    emptyClear: 'Süzgeçleri temizle',
  },
  groups: [
    {
      title: 'Başlık ve giriş',
      fields: [
        { key: 'title', label: 'Sayfa başlığı (H1)', type: 'text', max: 60 },
        { key: 'desc', label: 'Tanıtım metni', type: 'textarea', max: 200, help: '{n} yerine sitedeki oyun sayısı yazılır.' },
      ],
    },
    {
      title: 'Süzgeç ve liste',
      fields: [
        { key: 'searchPlaceholder', label: 'Arama kutusu ipucu', type: 'text' },
        { key: 'allLabel', label: '“Tümü” düğmesi', type: 'text' },
        { key: 'kindLabels', label: 'Oyun türü düğmeleri', type: 'list', help: 'Sırasıyla: 1) yeni nesil (keşfet ve inşa et) oyunlar, 2) klasik strateji oyunları.' },
        { key: 'countLabel', label: 'Sonuç sayısı', type: 'text', help: '{n} yerine listelenen oyun sayısı yazılır.' },
        { key: 'emptyText', label: 'Sonuç yoksa gösterilen metin', type: 'text' },
        { key: 'emptyClear', label: 'Süzgeçleri temizle düğmesi', type: 'text' },
      ],
    },
  ],
})
